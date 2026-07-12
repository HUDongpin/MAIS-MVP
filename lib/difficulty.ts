import type { Difficulty, DifficultyRecord, LegacyDifficulty } from "@/types";

export const activeDifficulties = ["Low", "Medium", "High"] as const satisfies readonly Difficulty[];
export type ActiveDifficulty = (typeof activeDifficulties)[number];

export const historicalDifficultyRecords = ["Foundation", "Core", "Challenge", "Exam"] as const satisfies readonly LegacyDifficulty[];
export type HistoricalDifficultyRecord = (typeof historicalDifficultyRecords)[number];

export const visibleDifficultiesForSelection = activeDifficulties;

const activeDifficultyValues = new Set<Difficulty>(activeDifficulties);
const supportedDifficultyValues = new Set<DifficultyRecord>([
  ...activeDifficulties,
  ...historicalDifficultyRecords
]);

const historicalDifficultyToActive: Record<HistoricalDifficultyRecord, ActiveDifficulty> = {
  Foundation: "Low",
  Core: "Medium",
  Challenge: "High",
  Exam: "High"
};

export function isActiveDifficulty(value: unknown): value is ActiveDifficulty {
  return typeof value === "string" && activeDifficultyValues.has(value as Difficulty);
}

export function isSupportedDifficultyRecord(value: unknown): value is DifficultyRecord {
  return typeof value === "string" && supportedDifficultyValues.has(value as DifficultyRecord);
}

export function mapDifficultyToActive(difficulty: DifficultyRecord): ActiveDifficulty {
  return activeDifficultyValues.has(difficulty as Difficulty)
    ? (difficulty as ActiveDifficulty)
    : historicalDifficultyToActive[difficulty as HistoricalDifficultyRecord];
}

export function difficultyMatchesActiveFilter(difficulty: DifficultyRecord, filter?: DifficultyRecord) {
  return !filter || mapDifficultyToActive(difficulty) === mapDifficultyToActive(filter);
}

export function difficultyMatchesAnyActiveFilter(difficulty: DifficultyRecord, filters: ReadonlySet<DifficultyRecord>) {
  return !filters.size || Array.from(filters).some((filter) => difficultyMatchesActiveFilter(difficulty, filter));
}
