import {
  adaptiveMasteryPrior,
  adaptiveMasteryThreshold,
  adaptivePrerequisiteThreshold,
  createInitialAdaptiveSkillState,
  updateAdaptiveState
} from "./adaptiveLearning";
import { ccssClusterIdForTopic } from "../data/ccssStandards";
import type { AdaptiveSkillState, Difficulty, GradeId, KnowledgeComponent, LocalizedText } from "@/types";

/**
 * Diagnostic placement that seeds Bayesian-knowledge-tracing priors so a learner's map is
 * accurate on day one instead of "everything undiscovered/unstable" from a flat 0.35 prior.
 *
 * Two layers, both pure and side-effect free:
 *   1. Grade-level priors — an informed starting prior per skill from where the skill's
 *      grade sits relative to the learner's grade (below grade ⇒ likely known; above grade
 *      ⇒ likely not yet). These carry no attempt evidence, so stars still read
 *      "undiscovered" until real practice, but routing/repair see an accurate prior.
 *   2. Adaptive probe seeding — a short blueprint of discriminating probes; the responses
 *      become real BKT evidence and then *propagate one hop across the prerequisite DAG*:
 *      a correct probe lifts its prerequisites' priors (they are implied), a wrong probe
 *      lowers its dependents' priors (they are unreachable). This is the diagnostic part —
 *      a Grade 4 miss quietly tells the map the Grade 3 prerequisite is the place to start.
 */

const placementGradeOrder: GradeId[] = ["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"];

const difficultyRank: Record<Difficulty, number> = { Low: 0, Medium: 1, High: 2 };

export type PlacementStage = "foundation" | "fluency" | "transfer";

export type PlacementProbe = {
  skillId: string;
  topicId: string;
  grade: GradeId;
  stage: PlacementStage;
  title: LocalizedText;
  ccssClusterId: string | null;
  difficulty: Difficulty;
  questionIds: string[];
};

export type PlacementResponse = {
  skillId: string;
  correct: boolean;
};

export type PlacementSeedResult = {
  states: AdaptiveSkillState[];
  recommendedStartSkillId: string | null;
};

function gradeRankFor(grade: GradeId) {
  const index = placementGradeOrder.indexOf(grade);
  return index < 0 ? placementGradeOrder.length : index;
}

function stageForSkillId(skillId: string): PlacementStage {
  if (skillId.endsWith(":fluency")) return "fluency";
  if (skillId.endsWith(":transfer")) return "transfer";
  return "foundation";
}

function round3(value: number) {
  return Number(Math.max(0.08, Math.min(0.6, value)).toFixed(3));
}

const stagePriorPenalty: Record<PlacementStage, number> = {
  foundation: 0,
  fluency: 0.06,
  transfer: 0.12
};

/**
 * Informed starting prior for a skill given how far its grade sits from the learner's.
 * At-grade foundation returns the global {@link adaptiveMasteryPrior} so nothing regresses;
 * lower grades trend higher (likely mastered), higher grades trend lower.
 */
export function gradeLevelMasteryPrior({
  skillGrade,
  learnerGrade,
  stage
}: {
  skillGrade: GradeId;
  learnerGrade: GradeId;
  stage: PlacementStage;
}): number {
  const delta = gradeRankFor(learnerGrade) - gradeRankFor(skillGrade);
  const base =
    delta >= 2
      ? 0.55
      : delta === 1
        ? 0.5
        : delta === 0
          ? adaptiveMasteryPrior
          : delta === -1
            ? 0.2
            : 0.12;
  return round3(base - stagePriorPenalty[stage]);
}

/** Per-skill grade-level prior states for every component (no attempt evidence). */
export function buildGradePlacementStates({
  components,
  learnerGrade,
  now = new Date()
}: {
  components: KnowledgeComponent[];
  learnerGrade: GradeId;
  now?: Date | string;
}): AdaptiveSkillState[] {
  return components.map((component) => ({
    ...createInitialAdaptiveSkillState(component.id, now),
    pMastery: gradeLevelMasteryPrior({
      skillGrade: component.grade,
      learnerGrade,
      stage: stageForSkillId(component.id)
    })
  }));
}

/**
 * A compact, discriminating placement blueprint: the fluency-stage skill of each topic at
 * the learner's grade and one grade below, easiest first. The at-grade probes reveal
 * grade-level readiness; the one-below probes reveal whether prerequisites are in place.
 */
export function buildPlacementBlueprint({
  components,
  learnerGrade,
  maxProbes = 8,
  questionsPerProbe = 2
}: {
  components: KnowledgeComponent[];
  learnerGrade: GradeId;
  maxProbes?: number;
  questionsPerProbe?: number;
}): PlacementProbe[] {
  const learnerRank = gradeRankFor(learnerGrade);
  const eligible = components.filter((component) => {
    const rank = gradeRankFor(component.grade);
    return (rank === learnerRank || rank === learnerRank - 1) && stageForSkillId(component.id) === "fluency";
  });

  const topicOrder = new Map(components.map((component, index) => [component.topicId, index]));

  return eligible
    .map((component): PlacementProbe => ({
      skillId: component.id,
      topicId: component.topicId,
      grade: component.grade,
      stage: stageForSkillId(component.id),
      title: component.title,
      ccssClusterId: ccssClusterIdForTopic(component.topicId, component.grade),
      difficulty: component.difficulty,
      questionIds: component.questionIds.slice(0, questionsPerProbe)
    }))
    .sort(
      (left, right) =>
        gradeRankFor(left.grade) - gradeRankFor(right.grade) ||
        difficultyRank[left.difficulty] - difficultyRank[right.difficulty] ||
        (topicOrder.get(left.topicId) ?? 999) - (topicOrder.get(right.topicId) ?? 999) ||
        left.skillId.localeCompare(right.skillId)
    )
    .slice(0, maxProbes);
}

function buildDependentsGraph(components: KnowledgeComponent[]) {
  const dependents = new Map<string, string[]>();
  for (const component of components) {
    for (const prerequisiteId of component.prerequisites) {
      const bucket = dependents.get(prerequisiteId) ?? [];
      bucket.push(component.id);
      dependents.set(prerequisiteId, bucket);
    }
  }
  return dependents;
}

/**
 * Seeds BKT states from placement responses. Answered probes become real evidence via
 * {@link updateAdaptiveState}; the outcome then propagates one hop across the prerequisite
 * DAG (raising prerequisites of a passed probe, lowering dependents of a failed probe) for
 * skills that still have no evidence of their own. Skills with no response keep their
 * grade-level prior. Also returns the recommended first skill: the earliest
 * prerequisite-satisfied, not-yet-mastered skill in grade→topic→stage order.
 */
export function seedStatesFromPlacement({
  components,
  responses,
  learnerGrade,
  now = new Date()
}: {
  components: KnowledgeComponent[];
  responses: PlacementResponse[];
  learnerGrade: GradeId;
  now?: Date | string;
}): PlacementSeedResult {
  const componentById = new Map(components.map((component) => [component.id, component]));
  const stateById = new Map(
    buildGradePlacementStates({ components, learnerGrade, now }).map((state) => [state.skillId, state])
  );
  const dependents = buildDependentsGraph(components);

  // 1. Direct evidence from each answered probe.
  for (const response of responses) {
    const state = stateById.get(response.skillId);
    const component = componentById.get(response.skillId);
    if (!state || !component) continue;
    stateById.set(
      response.skillId,
      updateAdaptiveState({
        state,
        correct: response.correct,
        now,
        misconceptionTags: response.correct ? [] : component.misconceptionTags
      })
    );
  }

  // 2. One-hop inference across the prerequisite DAG (only for skills without own evidence).
  const raisePrior = (skillId: string, floor: number) => {
    const state = stateById.get(skillId);
    if (!state || state.attemptCount > 0) return;
    if (state.pMastery >= floor) return;
    stateById.set(skillId, { ...state, pMastery: round3(floor) });
  };
  const lowerPrior = (skillId: string, ceiling: number) => {
    const state = stateById.get(skillId);
    if (!state || state.attemptCount > 0) return;
    if (state.pMastery <= ceiling) return;
    stateById.set(skillId, { ...state, pMastery: round3(ceiling) });
  };

  for (const response of responses) {
    const component = componentById.get(response.skillId);
    if (!component) continue;
    if (response.correct) {
      for (const prerequisiteId of component.prerequisites) raisePrior(prerequisiteId, 0.55);
    } else {
      for (const dependentId of dependents.get(component.id) ?? []) lowerPrior(dependentId, 0.2);
    }
  }

  const states = components.map(
    (component) => stateById.get(component.id) ?? createInitialAdaptiveSkillState(component.id, now)
  );

  return {
    states,
    recommendedStartSkillId: recommendPlacementStart(components, stateById)
  };
}

function recommendPlacementStart(
  components: KnowledgeComponent[],
  stateById: Map<string, AdaptiveSkillState>
): string | null {
  const topicOrder = new Map(components.map((component, index) => [component.topicId, index]));
  const prerequisiteSatisfied = (component: KnowledgeComponent) =>
    component.prerequisites.every((prerequisiteId) => {
      const prerequisiteState = stateById.get(prerequisiteId);
      if (!prerequisiteState) return true; // prerequisite outside the set
      return prerequisiteState.pMastery >= adaptivePrerequisiteThreshold;
    });

  return (
    components
      .filter((component) => (stateById.get(component.id)?.pMastery ?? 0) < adaptiveMasteryThreshold)
      .filter((component) => prerequisiteSatisfied(component))
      .sort(
        (left, right) =>
          gradeRankFor(left.grade) - gradeRankFor(right.grade) ||
          (topicOrder.get(left.topicId) ?? 999) - (topicOrder.get(right.topicId) ?? 999) ||
          left.id.localeCompare(right.id)
      )[0]?.id ?? null
  );
}
