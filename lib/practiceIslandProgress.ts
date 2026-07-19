import {
  practiceIslandMaxStarsPerRegion,
  practiceIslandRegions,
  type PracticeIslandRegionId
} from "../data/practiceIslandRegions";

export type PracticeIslandStarRecord = Partial<Record<PracticeIslandRegionId, number>>;

export const practiceIslandStarStoragePrefix = "hk-math-practice-island-stars";

export function practiceIslandStarStorageKey(userId: string | null | undefined) {
  return `${practiceIslandStarStoragePrefix}:${userId ?? "guest"}`;
}

const practiceIslandRegionIdSet = new Set<string>(practiceIslandRegions.map((region) => region.id));

function clampStars(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(practiceIslandMaxStarsPerRegion, Math.max(0, Math.floor(value)));
}

export function practiceIslandStarsForAccuracy(accuracyPercent: number) {
  if (accuracyPercent >= 100) return 3;
  if (accuracyPercent >= 80) return 2;
  return 1;
}

export function readPracticeIslandStarRecord(value: string | null): PracticeIslandStarRecord {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const record: PracticeIslandStarRecord = {};
    for (const [key, raw] of Object.entries(parsed)) {
      if (!practiceIslandRegionIdSet.has(key)) continue;
      const stars = clampStars(raw);
      if (stars > 0) record[key as PracticeIslandRegionId] = stars;
    }
    return record;
  } catch {
    return {};
  }
}

export function awardPracticeIslandStars(
  record: PracticeIslandStarRecord,
  regionId: PracticeIslandRegionId,
  stars: number
): PracticeIslandStarRecord {
  const nextStars = clampStars(stars);
  if (nextStars <= (record[regionId] ?? 0)) return record;
  return { ...record, [regionId]: nextStars };
}

export function mergePracticeIslandStarRecords(
  base: PracticeIslandStarRecord,
  incoming: PracticeIslandStarRecord
): PracticeIslandStarRecord {
  let merged = base;
  for (const region of practiceIslandRegions) {
    const stars = incoming[region.id];
    if (typeof stars === "number") merged = awardPracticeIslandStars(merged, region.id, stars);
  }
  return merged;
}

export function practiceIslandStarTotal(record: PracticeIslandStarRecord) {
  return practiceIslandRegions.reduce((sum, region) => sum + clampStars(record[region.id]), 0);
}
