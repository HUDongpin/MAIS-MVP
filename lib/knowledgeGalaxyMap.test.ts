import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  buildKnowledgeGalaxyMap,
  galaxyConstellationNames,
  galaxyStageForSkillId,
  galaxyStarStatusFor,
  galaxyStarStatusLabels
} from "./knowledgeGalaxyMap";
import type {
  AdaptiveLearningDecision,
  AdaptiveSkillState,
  AdaptiveSkillSummary,
  GradeId,
  KnowledgeComponent,
  Topic
} from "@/types";

function makeTopic(id: string, titleEn: string, grade: GradeId = "P4"): Topic {
  return {
    id,
    curriculumTrack: "US_CA_MATH",
    grade,
    title: { en: titleEn, zh: titleEn },
    description: { en: "", zh: "" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 20,
    mastery: 0
  } as Topic;
}

function makeSkill(topicId: string, stage: "foundation" | "fluency" | "transfer", grade: GradeId = "P4"): KnowledgeComponent {
  const stageOrder = ["foundation", "fluency", "transfer"] as const;
  const index = stageOrder.indexOf(stage);
  return {
    id: `${topicId}:${stage}`,
    topicId,
    grade,
    title: { en: `${topicId} ${stage}`, zh: `${topicId} ${stage}` },
    description: { en: "", zh: "" },
    prerequisites: index === 0 ? [] : [`${topicId}:${stageOrder[index - 1]}`],
    difficulty: "Medium",
    misconceptionTags: [],
    questionIds: []
  };
}

function makeState(skillId: string, overrides: Partial<AdaptiveSkillState> = {}): AdaptiveSkillState {
  return {
    skillId,
    pMastery: 0.25,
    attemptCount: 0,
    correctStreak: 0,
    wrongStreak: 0,
    lastPracticedAt: null,
    nextReviewAt: null,
    hintCount: 0,
    misconceptionTags: [],
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

function makeSummary(topic: Topic, stage: "foundation" | "fluency" | "transfer", state: Partial<AdaptiveSkillState> = {}): AdaptiveSkillSummary {
  const skill = makeSkill(topic.id, stage, topic.grade);
  return { skill, state: makeState(skill.id, state), topic };
}

const numberTopic = makeTopic("us-ca-math-p4-p4-nbt-place-value", "Place value to one million");
const algebraTopic = makeTopic("us-ca-math-p4-p4-oa-factors", "Factors and multiples");
const geometryTopic = makeTopic("us-ca-math-p4-p4-g-symmetry", "Lines of symmetry");

function makeDecision(): AdaptiveLearningDecision {
  const skillMap: AdaptiveSkillSummary[] = [
    makeSummary(numberTopic, "foundation", { pMastery: 0.93, attemptCount: 9, correctStreak: 3 }),
    makeSummary(numberTopic, "fluency", { pMastery: 0.9, attemptCount: 8, correctStreak: 3, nextReviewAt: "2026-07-10T00:00:00.000Z" }),
    makeSummary(numberTopic, "transfer", { pMastery: 0.62, attemptCount: 4 }),
    makeSummary(algebraTopic, "foundation", { pMastery: 0.4, attemptCount: 5, wrongStreak: 2 }),
    makeSummary(algebraTopic, "fluency", { pMastery: 0.58, attemptCount: 3 }),
    makeSummary(algebraTopic, "transfer"),
    makeSummary(geometryTopic, "foundation"),
    makeSummary(geometryTopic, "fluency"),
    makeSummary(geometryTopic, "transfer")
  ];
  const current = skillMap[4];
  const dueReview = skillMap[1];

  return {
    action: "practice",
    confidence: "developing",
    deterministic: true,
    evidenceCount: 5,
    guardFlags: [],
    nextReviewAt: null,
    generatedAt: "2026-07-18T00:00:00.000Z",
    engine: {
      version: "hybrid-v3",
      mode: "deterministic",
      llmStatus: "ready",
      selectedCandidateId: "candidate-1",
      deterministicCandidateId: "candidate-1",
      candidateSignature: "signature"
    },
    skill: current.skill,
    topic: current.topic,
    lesson: null,
    questions: [],
    skillMap,
    dueReviews: [dueReview],
    explanation: { en: "", zh: "" },
    evidence: []
  } as AdaptiveLearningDecision;
}

test("derives stage from skill id suffix", () => {
  equal(galaxyStageForSkillId("topic-a:foundation"), "foundation");
  equal(galaxyStageForSkillId("topic-a:fluency"), "fluency");
  equal(galaxyStageForSkillId("topic-a:transfer"), "transfer");
});

test("status precedence: current > fading > undiscovered > lit > confirming > unstable > igniting", () => {
  const topic = makeTopic("us-ca-math-p4-p4-nbt-x", "Sample");
  const dueReviews = new Set<string>();

  equal(galaxyStarStatusFor(makeSummary(topic, "foundation", { pMastery: 0.9, attemptCount: 4 }), `${topic.id}:foundation`, dueReviews), "current");
  equal(
    galaxyStarStatusFor(makeSummary(topic, "foundation", { pMastery: 0.9, attemptCount: 4 }), null, new Set([`${topic.id}:foundation`])),
    "fading"
  );
  equal(galaxyStarStatusFor(makeSummary(topic, "foundation"), null, dueReviews), "undiscovered");
  // Over the probability bar AND a confirming streak -> lit (counted as mastered).
  equal(galaxyStarStatusFor(makeSummary(topic, "foundation", { pMastery: 0.9, attemptCount: 5, correctStreak: 3 }), null, dueReviews), "lit");
  // Over the bar but streak not yet confirmed -> confirming (bright, but not counted).
  equal(galaxyStarStatusFor(makeSummary(topic, "foundation", { pMastery: 0.9, attemptCount: 5, correctStreak: 2 }), null, dueReviews), "confirming");
  equal(galaxyStarStatusFor(makeSummary(topic, "foundation", { pMastery: 0.4, attemptCount: 5 }), null, dueReviews), "unstable");
  equal(galaxyStarStatusFor(makeSummary(topic, "foundation", { pMastery: 0.7, attemptCount: 5, wrongStreak: 2 }), null, dueReviews), "unstable");
  equal(galaxyStarStatusFor(makeSummary(topic, "foundation", { pMastery: 0.7, attemptCount: 5 }), null, dueReviews), "igniting");
});

test("untouched skills read undiscovered even though the mastery prior is low", () => {
  const topic = makeTopic("us-ca-math-p4-p4-oa-y", "Sample");
  equal(galaxyStarStatusFor(makeSummary(topic, "transfer", { pMastery: 0.25, attemptCount: 0 }), null, new Set()), "undiscovered");
});

test("builds one star per unique skill with bounded deterministic positions", () => {
  const decision = makeDecision();
  const first = buildKnowledgeGalaxyMap(decision);
  const second = buildKnowledgeGalaxyMap(decision);

  equal(first.stars.length, 9);
  equal(new Set(first.stars.map((star) => star.id)).size, 9);
  for (const star of first.stars) {
    ok(star.x >= 4 && star.x <= 96, `${star.id} x in range`);
    ok(star.y >= 6 && star.y <= 94, `${star.id} y in range`);
  }
  deepEqual(
    first.stars.map((star) => [star.id, star.x, star.y]),
    second.stars.map((star) => [star.id, star.x, star.y])
  );
});

test("assigns constellations from the practice island domain classifier", () => {
  const map = buildKnowledgeGalaxyMap(makeDecision());
  const byTopic = new Map(map.stars.map((star) => [star.topicId, star.constellation]));

  equal(byTopic.get(numberTopic.id), "number-forest");
  equal(byTopic.get(algebraTopic.id), "algebra-peaks");
  equal(byTopic.get(geometryTopic.id), "geometry-garden");
  equal(map.constellations.length, 3);
  for (const constellation of map.constellations) {
    ok(galaxyConstellationNames[constellation.id].en.length > 0);
    ok((galaxyConstellationNames[constellation.id].zhHans ?? "").length > 0);
  }
});

test("marks the decision skill as the current star and charts the route ahead", () => {
  const decision = makeDecision();
  const map = buildKnowledgeGalaxyMap(decision);

  equal(map.currentStarId, decision.skill.id);
  const routeEdges = map.edges.filter((edge) => edge.kind === "route");
  ok(routeEdges.length >= 1, "route has at least one hop");
  equal(routeEdges[0].from, decision.skill.id);

  const reviewEdges = map.edges.filter((edge) => edge.kind === "review");
  equal(reviewEdges.length, 1);
  equal(reviewEdges[0].to, decision.dueReviews[0].skill.id);
});

test("includes stage prerequisite edges for focus mode", () => {
  const map = buildKnowledgeGalaxyMap(makeDecision());
  const prerequisiteEdges = map.edges.filter((edge) => edge.kind === "prerequisite");
  ok(prerequisiteEdges.some((edge) => edge.from === `${numberTopic.id}:foundation` && edge.to === `${numberTopic.id}:fluency`));
  ok(prerequisiteEdges.some((edge) => edge.from === `${algebraTopic.id}:fluency` && edge.to === `${algebraTopic.id}:transfer`));
});

test("counts lit and fading stars for illumination and constellation completion", () => {
  const map = buildKnowledgeGalaxyMap(makeDecision());

  equal(map.illumination.totalCount, 9);
  equal(map.illumination.litCount, 2);
  equal(map.illumination.percent, 22);
  deepEqual(map.litStarIds, [`${numberTopic.id}:fluency`, `${numberTopic.id}:foundation`].sort());

  const numberConstellation = map.constellations.find((constellation) => constellation.id === "number-forest");
  equal(numberConstellation?.litCount, 2);
  equal(numberConstellation?.totalCount, 3);
  equal(numberConstellation?.complete, false);
  const geometryConstellation = map.constellations.find((constellation) => constellation.id === "geometry-garden");
  equal(geometryConstellation?.litCount, 0);
});

test("focus layout keeps only the requested constellation and widens spacing", () => {
  const decision = makeDecision();
  const galaxyView = buildKnowledgeGalaxyMap(decision);
  const focusView = buildKnowledgeGalaxyMap(decision, { focusConstellation: "number-forest" });

  equal(focusView.stars.length, 3);
  ok(focusView.stars.every((star) => star.constellation === "number-forest"));

  const spread = (stars: typeof focusView.stars) => {
    const xs = stars.map((star) => star.x);
    const ys = stars.map((star) => star.y);
    return Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys));
  };
  const galaxyNumberStars = galaxyView.stars.filter((star) => star.constellation === "number-forest");
  ok(spread(focusView.stars) > spread(galaxyNumberStars), "focus layout spreads stars wider");

  equal(focusView.illumination.totalCount, 9, "illumination still counts the whole galaxy");
  const focusSummary = focusView.constellations.find((constellation) => constellation.id === "number-forest");
  equal(focusSummary?.totalCount, 3);
});

test("resolves CCSS codes for California topics only", () => {
  const decision = makeDecision();
  const hkTopic = makeTopic("hk-ease-p4-fractions", "Fractions");
  hkTopic.curriculumTrack = "HK_EASE" as Topic["curriculumTrack"];
  decision.skillMap.push(makeSummary(hkTopic, "foundation"));

  const map = buildKnowledgeGalaxyMap(decision);
  const californiaStar = map.stars.find((star) => star.topicId === numberTopic.id);
  const hkStar = map.stars.find((star) => star.topicId === hkTopic.id);

  ok(californiaStar?.ccssCode, "California topics carry a CCSS code");
  equal(hkStar?.ccssCode, null);
});

test("localizes every star status label", () => {
  for (const label of Object.values(galaxyStarStatusLabels)) {
    ok(label.en.length > 0);
    ok((label.zh ?? "").length > 0);
    ok((label.zhHans ?? "").length > 0);
  }
});

function makeCrossPrerequisiteDecision(): AdaptiveLearningDecision {
  const numberTopicA = makeTopic("us-ca-math-p4-p4-nbt-a", "Base ten A");
  const algebraTopicC = makeTopic("us-ca-math-p4-p4-oa-c", "Operations C");
  const geometryTopicB = makeTopic("us-ca-math-p4-p4-g-b", "Geometry B");

  const aFoundation = makeSummary(numberTopicA, "foundation", { pMastery: 0.4, attemptCount: 3 });
  const aFluency = makeSummary(numberTopicA, "fluency", { pMastery: 0.3, attemptCount: 2 });
  const cFoundation = makeSummary(algebraTopicC, "foundation", { pMastery: 0.9, attemptCount: 6 });
  const cFluency = makeSummary(algebraTopicC, "fluency", { pMastery: 0.3, attemptCount: 2 });
  const bFoundation = makeSummary(geometryTopicB, "foundation", { pMastery: 0.35, attemptCount: 1 });
  // Cross-topic prerequisite: B's foundation depends on C's (weak) fluency skill.
  bFoundation.skill.prerequisites = [`${algebraTopicC.id}:fluency`];

  const skillMap: AdaptiveSkillSummary[] = [aFoundation, aFluency, cFoundation, cFluency, bFoundation];

  return {
    action: "practice",
    confidence: "developing",
    deterministic: true,
    evidenceCount: 5,
    guardFlags: [],
    nextReviewAt: null,
    generatedAt: "2026-07-18T00:00:00.000Z",
    engine: {
      version: "hybrid-v3",
      mode: "deterministic",
      llmStatus: "ready",
      selectedCandidateId: "candidate-1",
      deterministicCandidateId: "candidate-1",
      candidateSignature: "signature"
    },
    skill: aFoundation.skill,
    topic: aFoundation.topic,
    lesson: null,
    questions: [],
    skillMap,
    dueReviews: [],
    explanation: { en: "", zh: "" },
    evidence: []
  } as AdaptiveLearningDecision;
}

test("locks stars whose visible prerequisite is not yet at prerequisite mastery", () => {
  const map = buildKnowledgeGalaxyMap(makeCrossPrerequisiteDecision());
  const bFoundation = map.stars.find((star) => star.id === "us-ca-math-p4-p4-g-b:foundation");
  const cFoundation = map.stars.find((star) => star.id === "us-ca-math-p4-p4-oa-c:foundation");

  ok(bFoundation?.locked, "B foundation is locked by an unmet cross-topic prerequisite");
  ok(bFoundation?.lockedReason && bFoundation.lockedReason.en.length > 0, "locked stars carry a master-prerequisite-first reason");
  equal(cFoundation?.locked, false, "entry-point stars are not locked");
  equal(cFoundation?.lockedReason, null, "unlocked stars carry no locked reason");
});

test("the charted route never steps into a locked star and explains why", () => {
  const map = buildKnowledgeGalaxyMap(makeCrossPrerequisiteDecision());

  ok(map.routeSkillIds.length >= 1);
  equal(map.routeSkillIds[0], "us-ca-math-p4-p4-nbt-a:foundation");
  ok(!map.routeSkillIds.includes("us-ca-math-p4-p4-g-b:foundation"), "route avoids the locked star");
  ok(map.routeSkillIds.includes("us-ca-math-p4-p4-nbt-a:fluency"), "route advances the current topic");
  ok(map.routeRationale && map.routeRationale.en.length > 0);
});

test("a confirming skill (over the bar, streak not yet confirmed) stays on the route", () => {
  const topic = makeTopic("us-ca-math-p4-p4-nbt-confirm", "Confirming topic");
  // foundation is the current mission; fluency is over the probability bar but not yet
  // streak-confirmed, so the engine still counts it as unmastered and the route must keep it.
  const foundation = makeSummary(topic, "foundation", { pMastery: 0.5, attemptCount: 3 });
  const fluency = makeSummary(topic, "fluency", { pMastery: 0.9, attemptCount: 5, correctStreak: 2 });
  const decision = { ...makeDecision(), skill: foundation.skill, topic: foundation.topic, skillMap: [foundation, fluency], dueReviews: [] } as AdaptiveLearningDecision;

  const map = buildKnowledgeGalaxyMap(decision);
  const fluencyStar = map.stars.find((star) => star.id === `${topic.id}:fluency`);

  equal(fluencyStar?.status, "confirming");
  ok(map.routeSkillIds.includes(`${topic.id}:fluency`), "confirming skills remain routable until the streak confirms mastery");
});
