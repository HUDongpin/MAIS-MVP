import { classifyPracticeIslandTopic, practiceIslandRegions } from "@/data/practiceIslandRegions";
import type { PracticeIslandDomainRegionId } from "@/data/practiceIslandRegions";
import { californiaKnowledgePointForTopic } from "@/data/usCaliforniaKnowledgePoints";
import { adaptiveMasteryThreshold, isMasteryConfirmed } from "./adaptiveLearning";
import type {
  AdaptiveLearningDecision,
  AdaptiveSkillSummary,
  LocalizedText
} from "@/types";

export type GalaxyStarStatus = "current" | "fading" | "unstable" | "lit" | "confirming" | "igniting" | "undiscovered";

export type GalaxyStarStage = "foundation" | "fluency" | "transfer";

export type GalaxyStar = {
  id: string;
  topicId: string;
  constellation: PracticeIslandDomainRegionId;
  stage: GalaxyStarStage;
  status: GalaxyStarStatus;
  masteryPercent: number;
  ccssCode: string | null;
  summary: AdaptiveSkillSummary;
  x: number;
  y: number;
};

export type GalaxyMapEdgeKind = "route" | "review" | "prerequisite";

export type GalaxyMapEdge = {
  id: string;
  from: string;
  to: string;
  kind: GalaxyMapEdgeKind;
};

export type GalaxyConstellationSummary = {
  id: PracticeIslandDomainRegionId;
  name: LocalizedText;
  subtitle: LocalizedText;
  litCount: number;
  totalCount: number;
  complete: boolean;
  labelX: number;
  labelY: number;
  completionPath: Array<{ x: number; y: number }>;
};

export type KnowledgeGalaxyMap = {
  stars: GalaxyStar[];
  edges: GalaxyMapEdge[];
  constellations: GalaxyConstellationSummary[];
  illumination: { litCount: number; totalCount: number; percent: number };
  litStarIds: string[];
  currentStarId: string | null;
};

export type GalaxyMapOptions = {
  focusConstellation?: PracticeIslandDomainRegionId | null;
};

export const galaxyConstellationNames: Record<PracticeIslandDomainRegionId, LocalizedText> = {
  "number-forest": { en: "The Number Nebula", zh: "數字星雲", zhHans: "数字星云" },
  "algebra-peaks": { en: "The Algebra Cluster", zh: "代數星團", zhHans: "代数星团" },
  "geometry-garden": { en: "The Geometry Belt", zh: "幾何星帶", zhHans: "几何星带" }
};

export const galaxyStarStatusLabels: Record<GalaxyStarStatus, LocalizedText> = {
  current: { en: "Current mission", zh: "當前任務", zhHans: "当前任务" },
  fading: { en: "Fading · review due", zh: "轉暗 · 待複習", zhHans: "转暗 · 待复习" },
  unstable: { en: "Unstable · repair", zh: "不穩定 · 待修補", zhHans: "不稳定 · 待修补" },
  lit: { en: "Lit · mastered", zh: "點亮 · 已掌握", zhHans: "点亮 · 已掌握" },
  confirming: { en: "Confirming · almost mastered", zh: "鞏固中 · 即將掌握", zhHans: "巩固中 · 即将掌握" },
  igniting: { en: "Igniting · in progress", zh: "點燃中 · 進行中", zhHans: "点燃中 · 进行中" },
  undiscovered: { en: "Undiscovered", zh: "未探索", zhHans: "未探索" }
};

export const galaxyStageLabels: Record<GalaxyStarStage, LocalizedText> = {
  foundation: { en: "Foundation", zh: "基礎", zhHans: "基础" },
  fluency: { en: "Fluency", zh: "熟練", zhHans: "熟练" },
  transfer: { en: "Transfer", zh: "遷移", zhHans: "迁移" }
};

const GOLDEN_ANGLE = 2.399963229728653;

type SectorLayout = {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
};

const galaxySectors: Record<PracticeIslandDomainRegionId, SectorLayout> = {
  "number-forest": { centerX: 27, centerY: 36, radiusX: 19, radiusY: 24, rotation: 0.6 },
  "algebra-peaks": { centerX: 71, centerY: 32, radiusX: 19, radiusY: 22, rotation: 2.3 },
  "geometry-garden": { centerX: 50, centerY: 74, radiusX: 26, radiusY: 17, rotation: 4.4 }
};

const focusSector: SectorLayout = { centerX: 50, centerY: 50, radiusX: 40, radiusY: 36, rotation: 0.9 };

const stageOffsets: Record<GalaxyStarStage, { x: number; y: number }> = {
  foundation: { x: -2.6, y: 1.7 },
  fluency: { x: 0, y: -2.9 },
  transfer: { x: 2.7, y: 1.9 }
};

const constellationLabelAnchors: Record<PracticeIslandDomainRegionId, { x: number; y: number }> = {
  "number-forest": { x: 27, y: 8 },
  "algebra-peaks": { x: 71, y: 6 },
  "geometry-garden": { x: 12, y: 78 }
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function galaxyStageForSkillId(skillId: string): GalaxyStarStage {
  if (skillId.endsWith(":fluency")) return "fluency";
  if (skillId.endsWith(":transfer")) return "transfer";
  return "foundation";
}

export function galaxyStarStatusFor(
  summary: AdaptiveSkillSummary,
  currentSkillId: string | null,
  dueReviewIds: ReadonlySet<string>
): GalaxyStarStatus {
  if (currentSkillId && summary.skill.id === currentSkillId) return "current";
  if (dueReviewIds.has(summary.skill.id)) return "fading";
  if (summary.state.attemptCount === 0) return "undiscovered";
  // "Mastered" (lit, and counted toward illumination) matches the engine's mastery
  // gate: pMastery over threshold AND a confirming correct streak. A skill that has
  // crossed the probability bar but not yet confirmed is "confirming" — bright and
  // almost there, but not counted as mastered, so the illumination total never claims
  // mastery the practice loop is still working on. See isMasteryConfirmed.
  if (isMasteryConfirmed(summary.state)) return "lit";
  if (summary.state.pMastery >= adaptiveMasteryThreshold) return "confirming";
  if (summary.state.pMastery < 0.55 || summary.state.wrongStreak >= 2) return "unstable";
  return "igniting";
}

function ccssCodeForTopic(summary: AdaptiveSkillSummary): string | null {
  if (!summary.topic.id.startsWith("us-ca-math")) return null;
  return californiaKnowledgePointForTopic(summary.topic.id, summary.topic.grade, summary.topic.title.en).code;
}

function isCounted(status: GalaxyStarStatus) {
  return status === "lit" || status === "fading";
}

function constellationSubtitle(id: PracticeIslandDomainRegionId): LocalizedText {
  const region = practiceIslandRegions.find((candidate) => candidate.id === id);
  return region?.subtitle ?? { en: "", zh: "" };
}

export function buildKnowledgeGalaxyMap(
  decision: AdaptiveLearningDecision,
  options: GalaxyMapOptions = {}
): KnowledgeGalaxyMap {
  const focusConstellation = options.focusConstellation ?? null;
  const dueReviewIds = new Set(decision.dueReviews.map((summary) => summary.skill.id));

  const seenSkillIds = new Set<string>();
  const summaries = decision.skillMap.filter((summary) => {
    if (seenSkillIds.has(summary.skill.id)) return false;
    seenSkillIds.add(summary.skill.id);
    return true;
  });

  const constellationByTopicId = new Map<string, PracticeIslandDomainRegionId>();
  for (const summary of summaries) {
    if (!constellationByTopicId.has(summary.topic.id)) {
      constellationByTopicId.set(
        summary.topic.id,
        classifyPracticeIslandTopic({ topicId: summary.topic.id, topic: summary.topic.title })
      );
    }
  }

  const topicOrder: string[] = [];
  for (const summary of summaries) {
    if (!topicOrder.includes(summary.topic.id)) topicOrder.push(summary.topic.id);
  }

  const topicsByConstellation = new Map<PracticeIslandDomainRegionId, string[]>();
  for (const topicId of topicOrder) {
    const constellation = constellationByTopicId.get(topicId) as PracticeIslandDomainRegionId;
    const bucket = topicsByConstellation.get(constellation) ?? [];
    bucket.push(topicId);
    topicsByConstellation.set(constellation, bucket);
  }

  const topicAnchors = new Map<string, { x: number; y: number }>();
  for (const [constellation, topicIds] of topicsByConstellation) {
    const sector = focusConstellation === constellation ? focusSector : galaxySectors[constellation];
    topicIds.forEach((topicId, index) => {
      const ratio = Math.sqrt((index + 0.5) / Math.max(1, topicIds.length));
      const angle = sector.rotation + index * GOLDEN_ANGLE;
      topicAnchors.set(topicId, {
        x: clamp(sector.centerX + ratio * sector.radiusX * Math.cos(angle), 6, 94),
        y: clamp(sector.centerY + ratio * sector.radiusY * Math.sin(angle), 9, 91)
      });
    });
  }

  const stageScale = focusConstellation ? 1.9 : 1;
  const visibleSummaries = focusConstellation
    ? summaries.filter((summary) => constellationByTopicId.get(summary.topic.id) === focusConstellation)
    : summaries;

  const stars: GalaxyStar[] = visibleSummaries.map((summary) => {
    const stage = galaxyStageForSkillId(summary.skill.id);
    const anchor = topicAnchors.get(summary.topic.id) ?? { x: 50, y: 50 };
    const offset = stageOffsets[stage];
    return {
      id: summary.skill.id,
      topicId: summary.topic.id,
      constellation: constellationByTopicId.get(summary.topic.id) as PracticeIslandDomainRegionId,
      stage,
      status: galaxyStarStatusFor(summary, decision.skill.id, dueReviewIds),
      masteryPercent: Math.round(summary.state.pMastery * 100),
      ccssCode: ccssCodeForTopic(summary),
      summary,
      x: clamp(anchor.x + offset.x * stageScale, 4, 96),
      y: clamp(anchor.y + offset.y * stageScale, 6, 94)
    };
  });

  const starIds = new Set(stars.map((star) => star.id));
  const edges: GalaxyMapEdge[] = [];
  const addEdge = (from: string, to: string, kind: GalaxyMapEdgeKind) => {
    if (from === to || !starIds.has(from) || !starIds.has(to)) return;
    const id = `${kind}-${from}-${to}`;
    if (!edges.some((edge) => edge.id === id)) edges.push({ id, from, to, kind });
  };

  const routeIndex = summaries.findIndex((summary) => summary.skill.id === decision.skill.id);
  if (routeIndex >= 0) {
    let previousId = decision.skill.id;
    for (const summary of summaries.slice(routeIndex + 1, routeIndex + 5)) {
      addEdge(previousId, summary.skill.id, "route");
      previousId = summary.skill.id;
    }
  }

  decision.dueReviews.slice(0, 3).forEach((summary) => addEdge(decision.skill.id, summary.skill.id, "review"));

  for (const summary of visibleSummaries) {
    for (const prerequisiteId of summary.skill.prerequisites) {
      addEdge(prerequisiteId, summary.skill.id, "prerequisite");
    }
  }

  const allStatusBySkillId = new Map(
    summaries.map((summary) => [summary.skill.id, galaxyStarStatusFor(summary, decision.skill.id, dueReviewIds)])
  );

  const constellations: GalaxyConstellationSummary[] = (Object.keys(galaxySectors) as PracticeIslandDomainRegionId[])
    .filter((constellation) => (topicsByConstellation.get(constellation) ?? []).length > 0)
    .map((constellation) => {
      const topicIds = topicsByConstellation.get(constellation) ?? [];
      const memberSummaries = summaries.filter((summary) => constellationByTopicId.get(summary.topic.id) === constellation);
      const litCount = memberSummaries.filter((summary) => isCounted(allStatusBySkillId.get(summary.skill.id) as GalaxyStarStatus)).length;
      const totalCount = memberSummaries.length;
      const anchor = constellationLabelAnchors[constellation];
      return {
        id: constellation,
        name: galaxyConstellationNames[constellation],
        subtitle: constellationSubtitle(constellation),
        litCount,
        totalCount,
        complete: totalCount > 1 && litCount === totalCount,
        labelX: focusConstellation === constellation ? 50 : anchor.x,
        labelY: focusConstellation === constellation ? 7 : anchor.y,
        completionPath: topicIds
          .map((topicId) => topicAnchors.get(topicId))
          .filter((point): point is { x: number; y: number } => Boolean(point))
      };
    });

  const litStarIds = [...allStatusBySkillId.entries()]
    .filter(([, status]) => isCounted(status))
    .map(([skillId]) => skillId)
    .sort();
  const litCount = litStarIds.length;
  const totalCount = summaries.length;

  return {
    stars,
    edges,
    constellations,
    illumination: {
      litCount,
      totalCount,
      percent: totalCount ? Math.round((litCount / totalCount) * 100) : 0
    },
    litStarIds,
    currentStarId: starIds.has(decision.skill.id) ? decision.skill.id : null
  };
}
