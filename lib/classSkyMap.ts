import { ccssClusters, ccssProgressionRoads } from "@/data/ccssStandards";
import type { CcssArmId, CcssGradeBand, CcssRoad } from "@/data/ccssStandards";
import { buildClusterProgress, universeClusterPosition } from "./mathUniverseMap";
import type { UniverseSkillStateInput, UniverseTopicInput } from "./mathUniverseMap";
import type { GradeId } from "@/types";

/**
 * Pure builder for the teacher Class Sky: the same CCSS spiral as the student universe,
 * but painted with class-level heat. Inputs are anonymous per-student state lists; the
 * output carries only aggregates, so per-student learner state never reaches the client.
 */

export type ClassSkyStudentInput = {
  grade: GradeId;
  states: UniverseSkillStateInput[];
};

export type ClassSkyCluster = {
  id: string;
  arm: CcssArmId;
  gradeBand: CcssGradeBand;
  standardCount: number;
  x: number;
  y: number;
  sealed: boolean;
  /** Class average lit fraction for this cluster, 0..1. */
  heat: number;
  attemptedCount: number;
  masteredCount: number;
  strugglingCount: number;
};

export type ClassSkyRoad = {
  id: CcssRoad["id"];
  arm: CcssArmId;
  name: CcssRoad["name"];
  points: Array<{ x: number; y: number }>;
};

export type ClassSkyMap = {
  clusters: ClassSkyCluster[];
  roads: ClassSkyRoad[];
  studentCount: number;
  /** Cluster ids with the most struggling students, strongest first. */
  hotspots: string[];
  illumination: { averagePercent: number };
};

export function buildClassSkyMap({
  topics,
  students,
  now = new Date()
}: {
  topics: UniverseTopicInput[];
  students: ClassSkyStudentInput[];
  now?: Date | string;
}): ClassSkyMap {
  const perStudentProgress = students.map((student) =>
    buildClusterProgress({ topics, states: student.states, now })
  );

  const clusters: ClassSkyCluster[] = ccssClusters.map((cluster) => {
    const position = universeClusterPosition(cluster);
    let fractionSum = 0;
    let attemptedCount = 0;
    let masteredCount = 0;
    let strugglingCount = 0;

    for (const progress of perStudentProgress) {
      const entry = progress.get(cluster.id);
      if (!entry || !entry.skillTotal) continue;
      const fraction = entry.skillLit / entry.skillTotal;
      fractionSum += fraction;
      if (entry.skillLit > 0 || entry.skillConfirming > 0 || entry.skillIgniting > 0 || entry.skillUnstable > 0) attemptedCount += 1;
      if (entry.skillLit >= entry.skillTotal) masteredCount += 1;
      if (entry.skillUnstable > 0) strugglingCount += 1;
    }

    return {
      id: cluster.id,
      arm: cluster.arm,
      gradeBand: cluster.gradeBand,
      standardCount: cluster.standardCount,
      x: position.x,
      y: position.y,
      sealed: cluster.sealed,
      heat: students.length ? fractionSum / students.length : 0,
      attemptedCount,
      masteredCount,
      strugglingCount
    };
  });

  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  const roads: ClassSkyRoad[] = ccssProgressionRoads.map((road) => ({
    id: road.id,
    arm: road.arm,
    name: road.name,
    points: road.clusterIds
      .map((clusterId) => clusterById.get(clusterId))
      .filter((cluster): cluster is ClassSkyCluster => Boolean(cluster))
      .map((cluster) => ({ x: cluster.x, y: cluster.y }))
  }));

  const hotspots = clusters
    .filter((cluster) => cluster.strugglingCount > 0)
    .sort((a, b) => b.strugglingCount - a.strugglingCount || b.attemptedCount - a.attemptedCount)
    .slice(0, 3)
    .map((cluster) => cluster.id);

  const chartedClusters = clusters.filter((cluster) => !cluster.sealed);
  const averagePercent = chartedClusters.length
    ? Math.round(
        (chartedClusters.reduce((sum, cluster) => sum + cluster.heat * cluster.standardCount, 0) /
          chartedClusters.reduce((sum, cluster) => sum + cluster.standardCount, 0)) * 100
      )
    : 0;

  return {
    clusters,
    roads,
    studentCount: students.length,
    hotspots,
    illumination: { averagePercent }
  };
}
