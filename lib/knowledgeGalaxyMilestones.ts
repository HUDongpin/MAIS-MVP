import type { PracticeIslandDomainRegionId } from "@/data/practiceIslandRegions";
import type { KnowledgeGalaxyMap } from "./knowledgeGalaxyMap";

export type GalaxyMilestoneSnapshot = {
  litStarIds: string[];
  completedConstellations: PracticeIslandDomainRegionId[];
};

export type GalaxyMilestoneDiff = {
  newlyLitStarIds: string[];
  newlyCompletedConstellations: PracticeIslandDomainRegionId[];
};

export const galaxyMilestoneStoragePrefix = "hk-math-knowledge-galaxy-milestones";

const domainRegionIds = new Set<string>(["number-forest", "algebra-peaks", "geometry-garden"]);

export function galaxyMilestoneStorageKey(userId: string | null | undefined) {
  return `${galaxyMilestoneStoragePrefix}:${userId ?? "guest"}`;
}

export function galaxyMilestoneSnapshotForMap(map: KnowledgeGalaxyMap): GalaxyMilestoneSnapshot {
  return {
    litStarIds: [...map.litStarIds].sort(),
    completedConstellations: map.constellations
      .filter((constellation) => constellation.complete)
      .map((constellation) => constellation.id)
      .sort()
  };
}

export function serializeGalaxyMilestoneSnapshot(snapshot: GalaxyMilestoneSnapshot) {
  return JSON.stringify({
    litStarIds: [...snapshot.litStarIds].sort(),
    completedConstellations: [...snapshot.completedConstellations].sort()
  });
}

export function readGalaxyMilestoneSnapshot(value: string | null): GalaxyMilestoneSnapshot | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const litStarIds = Array.isArray(parsed.litStarIds)
      ? parsed.litStarIds.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      : [];
    const completedConstellations = Array.isArray(parsed.completedConstellations)
      ? parsed.completedConstellations.filter(
          (entry): entry is PracticeIslandDomainRegionId => typeof entry === "string" && domainRegionIds.has(entry)
        )
      : [];

    return {
      litStarIds: [...new Set(litStarIds)].sort(),
      completedConstellations: [...new Set(completedConstellations)].sort()
    };
  } catch {
    return null;
  }
}

export function diffGalaxyMilestones(
  previous: GalaxyMilestoneSnapshot | null,
  current: GalaxyMilestoneSnapshot
): GalaxyMilestoneDiff {
  if (!previous) {
    return { newlyLitStarIds: [], newlyCompletedConstellations: [] };
  }

  const previousLit = new Set(previous.litStarIds);
  const previousComplete = new Set(previous.completedConstellations);

  return {
    newlyLitStarIds: current.litStarIds.filter((skillId) => !previousLit.has(skillId)),
    newlyCompletedConstellations: current.completedConstellations.filter(
      (constellation) => !previousComplete.has(constellation)
    )
  };
}
