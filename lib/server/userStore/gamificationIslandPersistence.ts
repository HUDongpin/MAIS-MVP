import { randomUUID } from "node:crypto";
import {
  practiceIslandMaxStarsPerRegion,
  practiceIslandRegions,
  type PracticeIslandRegionId
} from "@/data/practiceIslandRegions";
import type { AntiAbuseDecision } from "@/types";
import {
  recordGamificationEventOnce,
  type GamificationEventPersistenceDatabase
} from "./gamificationEventPersistence";

export type PracticeIslandStarPersistenceRecord = {
  id?: string;
  student_id: string;
  region_id: string;
  stars: number;
  updated_at: string;
};

export type PracticeIslandPersistenceDatabase = GamificationEventPersistenceDatabase & {
  users: Array<{ id: string; role: string }>;
  practice_island_stars?: PracticeIslandStarPersistenceRecord[];
};

export type PracticeIslandStarAwardInput = {
  studentId: string;
  regionId: string;
  stars: number;
};

export type PracticeIslandStarAwardResult = {
  status: "awarded" | "unchanged" | "invalid-region" | "invalid-stars";
  regionId: string;
  stars: number;
  decisions: AntiAbuseDecision[];
};

const practiceIslandRegionById = new Map(practiceIslandRegions.map((region) => [region.id as string, region]));

function clampStars(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(practiceIslandMaxStarsPerRegion, Math.max(0, Math.floor(value)));
}

export function normalizePracticeIslandStarRecords(
  records: PracticeIslandStarPersistenceRecord[] | undefined,
  now: string
): PracticeIslandStarPersistenceRecord[] {
  const byStudentRegion = new Map<string, PracticeIslandStarPersistenceRecord>();

  for (const record of records ?? []) {
    if (typeof record?.student_id !== "string" || !record.student_id) continue;
    if (!practiceIslandRegionById.has(record.region_id)) continue;
    const stars = clampStars(record.stars);
    if (stars < 1) continue;

    const key = `${record.student_id}:${record.region_id}`;
    const existing = byStudentRegion.get(key);
    if (existing && existing.stars >= stars) continue;
    byStudentRegion.set(key, {
      ...record,
      stars,
      updated_at: typeof record.updated_at === "string" && record.updated_at ? record.updated_at : now
    });
  }

  return [...byStudentRegion.values()];
}

export function practiceIslandStarRecordForStudent(
  database: PracticeIslandPersistenceDatabase,
  studentId: string
): Partial<Record<PracticeIslandRegionId, number>> {
  const record: Partial<Record<PracticeIslandRegionId, number>> = {};

  for (const row of database.practice_island_stars ?? []) {
    if (row.student_id !== studentId || !practiceIslandRegionById.has(row.region_id)) continue;
    const stars = clampStars(row.stars);
    if (stars > 0) record[row.region_id as PracticeIslandRegionId] = stars;
  }

  return record;
}

export function awardPracticeIslandStarsInPersistence(
  database: PracticeIslandPersistenceDatabase,
  input: PracticeIslandStarAwardInput,
  { createId = randomUUID, now = new Date().toISOString() }: { createId?: () => string; now?: string } = {}
): PracticeIslandStarAwardResult {
  const region = practiceIslandRegionById.get(input.regionId);
  if (!region) return { status: "invalid-region", regionId: input.regionId, stars: 0, decisions: [] };

  const requestedStars = clampStars(input.stars);
  if (requestedStars < 1) return { status: "invalid-stars", regionId: region.id, stars: 0, decisions: [] };

  database.practice_island_stars ??= [];
  const existingRow = database.practice_island_stars.find(
    (row) => row.student_id === input.studentId && row.region_id === region.id
  );
  const existingStars = clampStars(existingRow?.stars);

  if (requestedStars <= existingStars) {
    return { status: "unchanged", regionId: region.id, stars: existingStars, decisions: [] };
  }

  if (existingRow) {
    existingRow.stars = requestedStars;
    existingRow.updated_at = now;
  } else {
    database.practice_island_stars.push({
      id: `practice-island-star-${createId()}`,
      student_id: input.studentId,
      region_id: region.id,
      stars: requestedStars,
      updated_at: now
    });
  }

  const decisions: AntiAbuseDecision[] = [];
  for (let starLevel = existingStars + 1; starLevel <= requestedStars; starLevel += 1) {
    decisions.push(
      recordGamificationEventOnce(database, createId, {
        studentId: input.studentId,
        source: "island-star",
        sourceKey: `island-star:${input.studentId}:${region.id}:${starLevel}`,
        label: {
          en: `Practice Island star ${starLevel}: ${region.label.en}`,
          zh: `練習島第 ${starLevel} 顆星：${region.label.zh}`
        },
        createdAt: now
      })
    );
  }

  return { status: "awarded", regionId: region.id, stars: requestedStars, decisions };
}

export type PracticeIslandPersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<PracticeIslandPersistenceDatabase>;
  mutateDatabase: <T>(
    mutator: (database: PracticeIslandPersistenceDatabase) => T | Promise<T>,
    options?: { shouldPersist?: (result: T) => boolean }
  ) => Promise<T>;
};

export function createGamificationIslandPersistenceStore({
  createId = randomUUID,
  now = () => new Date(),
  readDatabase,
  mutateDatabase
}: PracticeIslandPersistenceStoreDependencies) {
  return {
    async getPracticeIslandStars(studentId: string) {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
      if (!user) return null;

      return practiceIslandStarRecordForStudent(database, studentId);
    },

    async awardPracticeIslandStars(input: PracticeIslandStarAwardInput): Promise<PracticeIslandStarAwardResult | null> {
      return mutateDatabase(
        (database) => {
          const user = database.users.find((candidate) => candidate.id === input.studentId && candidate.role === "student");
          if (!user) return null;

          return awardPracticeIslandStarsInPersistence(database, input, { createId, now: now().toISOString() });
        },
        // The Practice Arena re-posts the island award after every answered
        // question, and almost all of those land on "unchanged" (the student
        // already holds that many stars). Only an actual award changed rows, so
        // everything else must not rewrite the snapshot.
        { shouldPersist: (result) => result?.status === "awarded" }
      );
    }
  };
}
