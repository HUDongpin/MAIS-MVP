import { randomUUID } from "node:crypto";
import { creatureRarities, fishingSpeciesTotal } from "@/lib/practiceGameJuice";

export type FishingDexPersistenceRecord = {
  id?: string;
  student_id: string;
  species: string;
  first_caught_at: string;
  catch_count: number;
  updated_at: string;
};

export type AdventureRelicPersistenceRecord = {
  id?: string;
  student_id: string;
  topic_id: string;
  first_cleared_at: string;
  clear_count: number;
  best_stars: number;
  updated_at: string;
};

export type GameCollectionsPersistenceDatabase = {
  users: Array<{ id: string; role: string }>;
  fishing_dex?: FishingDexPersistenceRecord[];
  adventure_relics?: AdventureRelicPersistenceRecord[];
};

export type StudentFishingDexEntry = {
  species: string;
  firstCaughtAt: string;
  catchCount: number;
};

export type StudentAdventureRelicEntry = {
  topicId: string;
  firstClearedAt: string;
  clearCount: number;
  bestStars: number;
};

export type StudentGameCollections = {
  fishDex: StudentFishingDexEntry[];
  relics: StudentAdventureRelicEntry[];
  totalSpecies: number;
};

const knownSpecies = new Set(Object.keys(creatureRarities));

function clampCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function clampStars(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(3, Math.max(0, Math.floor(value)));
}

export function normalizeFishingDexRecords(
  records: FishingDexPersistenceRecord[] | undefined,
  now: string
): FishingDexPersistenceRecord[] {
  const byStudentSpecies = new Map<string, FishingDexPersistenceRecord>();

  for (const record of records ?? []) {
    if (typeof record?.student_id !== "string" || !record.student_id) continue;
    if (!knownSpecies.has(record.species)) continue;
    const catchCount = clampCount(record.catch_count);
    if (catchCount < 1) continue;

    const key = `${record.student_id}:${record.species}`;
    const existing = byStudentSpecies.get(key);
    if (existing) {
      existing.catch_count = Math.max(existing.catch_count, catchCount);
      if (record.first_caught_at < existing.first_caught_at) existing.first_caught_at = record.first_caught_at;
      continue;
    }
    byStudentSpecies.set(key, {
      ...record,
      catch_count: catchCount,
      first_caught_at: typeof record.first_caught_at === "string" && record.first_caught_at ? record.first_caught_at : now,
      updated_at: typeof record.updated_at === "string" && record.updated_at ? record.updated_at : now
    });
  }

  return [...byStudentSpecies.values()];
}

export function normalizeAdventureRelicRecords(
  records: AdventureRelicPersistenceRecord[] | undefined,
  now: string
): AdventureRelicPersistenceRecord[] {
  const byStudentTopic = new Map<string, AdventureRelicPersistenceRecord>();

  for (const record of records ?? []) {
    if (typeof record?.student_id !== "string" || !record.student_id) continue;
    if (typeof record?.topic_id !== "string" || !record.topic_id) continue;
    const clearCount = clampCount(record.clear_count);
    if (clearCount < 1) continue;

    const key = `${record.student_id}:${record.topic_id}`;
    const existing = byStudentTopic.get(key);
    if (existing) {
      existing.clear_count = Math.max(existing.clear_count, clearCount);
      existing.best_stars = Math.max(existing.best_stars, clampStars(record.best_stars));
      if (record.first_cleared_at < existing.first_cleared_at) existing.first_cleared_at = record.first_cleared_at;
      continue;
    }
    byStudentTopic.set(key, {
      ...record,
      clear_count: clearCount,
      best_stars: clampStars(record.best_stars),
      first_cleared_at: typeof record.first_cleared_at === "string" && record.first_cleared_at ? record.first_cleared_at : now,
      updated_at: typeof record.updated_at === "string" && record.updated_at ? record.updated_at : now
    });
  }

  return [...byStudentTopic.values()];
}

export function recordFishingDexCatchesInPersistence(
  database: GameCollectionsPersistenceDatabase,
  { studentId, species }: { studentId: string; species: string[] },
  { createId = randomUUID, now = new Date().toISOString() }: { createId?: () => string; now?: string } = {}
): { newSpecies: string[]; caughtCount: number } {
  database.fishing_dex ??= [];
  const newSpecies: string[] = [];

  for (const candidate of new Set(species)) {
    if (!knownSpecies.has(candidate)) continue;
    const existing = database.fishing_dex.find(
      (row) => row.student_id === studentId && row.species === candidate
    );
    if (existing) {
      existing.catch_count += 1;
      existing.updated_at = now;
      continue;
    }
    newSpecies.push(candidate);
    database.fishing_dex.push({
      id: `fishing-dex-${createId()}`,
      student_id: studentId,
      species: candidate,
      first_caught_at: now,
      catch_count: 1,
      updated_at: now
    });
  }

  const caughtCount = database.fishing_dex.filter((row) => row.student_id === studentId).length;
  return { newSpecies, caughtCount };
}

export function recordAdventureRelicInPersistence(
  database: GameCollectionsPersistenceDatabase,
  { studentId, topicId, stars }: { studentId: string; topicId: string; stars: number },
  { createId = randomUUID, now = new Date().toISOString() }: { createId?: () => string; now?: string } = {}
): { isNew: boolean; clearCount: number; bestStars: number } {
  database.adventure_relics ??= [];
  const cleanStars = clampStars(stars);
  const existing = database.adventure_relics.find(
    (row) => row.student_id === studentId && row.topic_id === topicId
  );

  if (existing) {
    existing.clear_count += 1;
    existing.best_stars = Math.max(existing.best_stars, cleanStars);
    existing.updated_at = now;
    return { isNew: false, clearCount: existing.clear_count, bestStars: existing.best_stars };
  }

  database.adventure_relics.push({
    id: `adventure-relic-${createId()}`,
    student_id: studentId,
    topic_id: topicId,
    first_cleared_at: now,
    clear_count: 1,
    best_stars: cleanStars,
    updated_at: now
  });
  return { isNew: true, clearCount: 1, bestStars: cleanStars };
}

export function gameCollectionsForStudent(
  database: GameCollectionsPersistenceDatabase,
  studentId: string
): StudentGameCollections {
  const fishDex = (database.fishing_dex ?? [])
    .filter((row) => row.student_id === studentId && knownSpecies.has(row.species))
    .map((row) => ({
      species: row.species,
      firstCaughtAt: row.first_caught_at,
      catchCount: clampCount(row.catch_count)
    }))
    .sort((a, b) => a.firstCaughtAt.localeCompare(b.firstCaughtAt));

  const relics = (database.adventure_relics ?? [])
    .filter((row) => row.student_id === studentId)
    .map((row) => ({
      topicId: row.topic_id,
      firstClearedAt: row.first_cleared_at,
      clearCount: clampCount(row.clear_count),
      bestStars: clampStars(row.best_stars)
    }))
    .sort((a, b) => a.firstClearedAt.localeCompare(b.firstClearedAt));

  return { fishDex, relics, totalSpecies: fishingSpeciesTotal };
}

export type GameCollectionsPersistenceStoreDependencies = {
  readDatabase: () => Promise<GameCollectionsPersistenceDatabase>;
};

export function createGamificationCollectionsPersistenceStore({
  readDatabase
}: GameCollectionsPersistenceStoreDependencies) {
  return {
    async getGameCollections(studentId: string): Promise<StudentGameCollections | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
      if (!user) return null;

      return gameCollectionsForStudent(database, studentId);
    }
  };
}
