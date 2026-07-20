import {
  ccssClusterIdForTopic,
  ccssClusters,
  ccssGradeBandForGradeId,
  ccssProgressionRoads,
  ccssStandardsByClusterId
} from "@/data/ccssStandards";
import type { CcssArmId, CcssCluster, CcssGradeBand, CcssRoad } from "@/data/ccssStandards";
import type { GradeId } from "@/types";

/**
 * Pure builder for the Math Universe map: the complete CCSS sky as a spiral galaxy.
 * Domains are arms, grade bands are rings around the Kindergarten core, and runtime
 * skill states paint each domain-grade cluster's stars. Layout is deterministic so the
 * same inputs always render the same sky.
 */

export type UniverseStarStatus = "lit" | "fading" | "unstable" | "current" | "igniting" | "charted" | "sealed";

export type UniverseSkillStateInput = {
  skillId: string;
  pMastery: number;
  attemptCount: number;
  nextReviewAt: string | null;
};

export type UniverseTopicInput = {
  id: string;
  grade: GradeId;
};

export type UniverseClusterProgress = {
  skillTotal: number;
  skillLit: number;
  skillIgniting: number;
  skillFading: number;
  skillUnstable: number;
  hasCurrent: boolean;
};

export type UniverseStar = {
  id: string;
  clusterId: string;
  arm: CcssArmId;
  code: string;
  title: string | null;
  status: UniverseStarStatus;
  x: number;
  y: number;
};

export type UniverseCluster = {
  id: string;
  arm: CcssArmId;
  gradeBand: CcssGradeBand;
  standardCount: number;
  litCount: number;
  complete: boolean;
  fog: boolean;
  sealed: boolean;
  hasCurrent: boolean;
  progress: UniverseClusterProgress | null;
  x: number;
  y: number;
};

export type UniverseRoad = {
  id: CcssRoad["id"];
  arm: CcssArmId;
  name: CcssRoad["name"];
  clusterIds: string[];
  points: Array<{ x: number; y: number }>;
};

export type MathUniverseMap = {
  width: number;
  height: number;
  center: { x: number; y: number };
  clusters: UniverseCluster[];
  stars: UniverseStar[];
  roads: UniverseRoad[];
  illumination: { litCount: number; totalCount: number; percent: number };
  frontierGradeBand: CcssGradeBand;
  currentClusterId: string | null;
};

export const universeWidth = 1520;
export const universeHeight = 1180;
const centerX = 760;
const centerY = 600;
const ringBase = 118;
const ringStep = 84;
const armTwist = 0.24;
const ySquash = 0.94;
const goldenAngle = 2.39996;

export const universeMasteryLitThreshold = 0.85;
export const universeMasteryUnstableThreshold = 0.55;

const armBaseAngles: Record<CcssArmId, number> = {
  number: -2.55,
  ratio: -1.55,
  algebra: -0.55,
  geometry: 0.55,
  data: 1.6
};

const gradeBandOrder: CcssGradeBand[] = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "HS"];

function gradeBandIndex(gradeBand: CcssGradeBand) {
  return gradeBandOrder.indexOf(gradeBand);
}

export function universeClusterPosition(cluster: CcssCluster): { x: number; y: number } {
  const bandIndex = gradeBandIndex(cluster.gradeBand);
  const radius = ringBase + bandIndex * ringStep;
  const siblings = ccssClusters.filter(
    (candidate) => candidate.arm === cluster.arm && candidate.gradeBand === cluster.gradeBand
  );
  let offset = 0;
  if (siblings.length > 1) {
    const position = siblings.findIndex((candidate) => candidate.id === cluster.id);
    offset = (position - (siblings.length - 1) / 2) * 0.3 * (1 - bandIndex * 0.045);
  }
  const angle = armBaseAngles[cluster.arm] + bandIndex * armTwist + offset;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle) * ySquash
  };
}

function starOffset(index: number, total: number): { dx: number; dy: number } {
  const spread = 10 + Math.sqrt(total) * 7;
  const radius = spread * Math.sqrt((index + 0.6) / total);
  const angle = index * goldenAngle;
  return { dx: radius * Math.cos(angle), dy: radius * Math.sin(angle) };
}

function skillTopicId(skillId: string) {
  const separator = skillId.lastIndexOf(":");
  return separator === -1 ? skillId : skillId.slice(0, separator);
}

function isDue(nextReviewAt: string | null, now: Date) {
  if (!nextReviewAt) return false;
  const due = new Date(nextReviewAt);
  return Number.isFinite(due.getTime()) && due.getTime() <= now.getTime();
}

export function buildClusterProgress({
  topics,
  states,
  currentSkillId = null,
  now = new Date()
}: {
  topics: UniverseTopicInput[];
  states: UniverseSkillStateInput[];
  currentSkillId?: string | null;
  now?: Date | string;
}): Map<string, UniverseClusterProgress> {
  const nowDate = new Date(now);
  const clusterIdByTopicId = new Map<string, string>();
  for (const topic of topics) {
    const clusterId = ccssClusterIdForTopic(topic.id, topic.grade);
    if (clusterId) clusterIdByTopicId.set(topic.id, clusterId);
  }

  const progressByClusterId = new Map<string, UniverseClusterProgress>();
  const ensure = (clusterId: string) => {
    let progress = progressByClusterId.get(clusterId);
    if (!progress) {
      progress = { skillTotal: 0, skillLit: 0, skillIgniting: 0, skillFading: 0, skillUnstable: 0, hasCurrent: false };
      progressByClusterId.set(clusterId, progress);
    }
    return progress;
  };

  // Every mapped topic contributes its three skill stages to the cluster inventory.
  for (const clusterId of clusterIdByTopicId.values()) {
    ensure(clusterId).skillTotal += 3;
  }

  for (const state of states) {
    const clusterId = clusterIdByTopicId.get(skillTopicId(state.skillId));
    if (!clusterId) continue;
    const progress = ensure(clusterId);
    const lit = state.pMastery >= universeMasteryLitThreshold;
    if (lit) {
      progress.skillLit += 1;
      if (isDue(state.nextReviewAt, nowDate)) progress.skillFading += 1;
    } else if (state.attemptCount > 0 && state.pMastery < universeMasteryUnstableThreshold) {
      progress.skillUnstable += 1;
    } else if (state.attemptCount > 0) {
      progress.skillIgniting += 1;
    }
  }

  if (currentSkillId) {
    const clusterId = clusterIdByTopicId.get(skillTopicId(currentSkillId));
    if (clusterId) ensure(clusterId).hasCurrent = true;
  }

  return progressByClusterId;
}

function clusterLitStarCount(cluster: CcssCluster, progress: UniverseClusterProgress | null) {
  if (!progress || !progress.skillTotal || !progress.skillLit) return 0;
  if (progress.skillLit >= progress.skillTotal) return cluster.standardCount;
  return Math.max(1, Math.floor((progress.skillLit / progress.skillTotal) * cluster.standardCount));
}

function starStatusesForCluster(
  cluster: CcssCluster,
  progress: UniverseClusterProgress | null,
  fog: boolean
): UniverseStarStatus[] {
  if (cluster.sealed || fog) {
    return Array.from({ length: cluster.standardCount }, () => "sealed" as const);
  }

  const litCount = clusterLitStarCount(cluster, progress);
  const statuses: UniverseStarStatus[] = Array.from({ length: cluster.standardCount }, (_, index) =>
    index < litCount ? "lit" : "charted"
  );

  if (progress) {
    let cursor = litCount;
    if (progress.hasCurrent) {
      if (cursor < statuses.length) {
        statuses[cursor] = "current";
        cursor += 1;
      } else {
        statuses[statuses.length - 1] = "current";
      }
    }
    const ignitingCount = progress.skillTotal
      ? Math.min(
          Math.max(0, statuses.length - cursor),
          Math.ceil((progress.skillIgniting / progress.skillTotal) * cluster.standardCount)
        )
      : 0;
    for (let i = 0; i < ignitingCount && cursor < statuses.length; i += 1, cursor += 1) {
      statuses[cursor] = "igniting";
    }
    if (progress.skillUnstable > 0 && cursor < statuses.length) {
      statuses[cursor] = "unstable";
      cursor += 1;
    }
    if (progress.skillFading > 0 && litCount > 0 && statuses[litCount - 1] === "lit") {
      statuses[litCount - 1] = "fading";
    }
  }

  return statuses;
}

export function buildMathUniverseMap({
  topics,
  states,
  studentGrade,
  currentSkillId = null,
  now = new Date()
}: {
  topics: UniverseTopicInput[];
  states: UniverseSkillStateInput[];
  studentGrade: GradeId;
  currentSkillId?: string | null;
  now?: Date | string;
}): MathUniverseMap {
  const progressByClusterId = buildClusterProgress({ topics, states, currentSkillId, now });
  const frontierGradeBand = ccssGradeBandForGradeId[studentGrade] ?? "HS";
  const frontierIndex = gradeBandIndex(frontierGradeBand);

  const clusters: UniverseCluster[] = [];
  const stars: UniverseStar[] = [];
  let currentClusterId: string | null = null;
  let litTotal = 0;
  let chartedTotal = 0;

  for (const cluster of ccssClusters) {
    const position = universeClusterPosition(cluster);
    const progress = progressByClusterId.get(cluster.id) ?? null;
    const fog = !cluster.sealed && gradeBandIndex(cluster.gradeBand) > frontierIndex + 1;
    const statuses = starStatusesForCluster(cluster, progress, fog);
    const litCount = statuses.filter((status) => status === "lit" || status === "fading").length;
    const complete = !cluster.sealed && litCount >= cluster.standardCount && cluster.standardCount > 0;
    if (progress?.hasCurrent) currentClusterId = cluster.id;
    if (!cluster.sealed) {
      litTotal += litCount;
      chartedTotal += cluster.standardCount;
    }

    clusters.push({
      id: cluster.id,
      arm: cluster.arm,
      gradeBand: cluster.gradeBand,
      standardCount: cluster.standardCount,
      litCount,
      complete,
      fog,
      sealed: cluster.sealed,
      hasCurrent: Boolean(progress?.hasCurrent),
      progress,
      x: position.x,
      y: position.y
    });

    const standards = ccssStandardsByClusterId.get(cluster.id) ?? [];
    statuses.forEach((status, index) => {
      const { dx, dy } = starOffset(index, cluster.standardCount);
      const standard = standards[index] ?? null;
      stars.push({
        id: standard ? standard.code : `${cluster.id}#${index + 1}`,
        clusterId: cluster.id,
        arm: cluster.arm,
        code: standard ? standard.code : `${cluster.id}·${index + 1}`,
        title: standard ? standard.title : null,
        status,
        x: position.x + dx,
        y: position.y + dy
      });
    });
  }

  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  const roads: UniverseRoad[] = ccssProgressionRoads.map((road) => ({
    id: road.id,
    arm: road.arm,
    name: road.name,
    clusterIds: road.clusterIds,
    points: road.clusterIds
      .map((clusterId) => clusterById.get(clusterId))
      .filter((cluster): cluster is UniverseCluster => Boolean(cluster))
      .map((cluster) => ({ x: cluster.x, y: cluster.y }))
  }));

  return {
    width: universeWidth,
    height: universeHeight,
    center: { x: centerX, y: centerY },
    clusters,
    stars,
    roads,
    illumination: {
      litCount: litTotal,
      totalCount: chartedTotal,
      percent: chartedTotal ? Math.round((litTotal / chartedTotal) * 100) : 0
    },
    frontierGradeBand,
    currentClusterId
  };
}

export function universeRoadForCluster(clusterId: string | null): UniverseRoad["id"] | null {
  if (!clusterId) return null;
  const road = ccssProgressionRoads.find((candidate) => candidate.clusterIds.includes(clusterId));
  return road?.id ?? null;
}
