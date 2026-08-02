import assert from "node:assert/strict";
import test from "node:test";
import {
  awardPracticeIslandStarsInPersistence,
  createGamificationIslandPersistenceStore,
  normalizePracticeIslandStarRecords,
  practiceIslandStarRecordForStudent,
  type PracticeIslandPersistenceDatabase
} from "./userStore/gamificationIslandPersistence";

function createDatabase(): PracticeIslandPersistenceDatabase {
  return {
    users: [
      { id: "student-1", role: "student" },
      { id: "teacher-1", role: "teacher" }
    ],
    gamification_events: []
  };
}

let idCounter = 0;
const createId = () => `test-id-${idCounter += 1}`;
const now = "2026-07-19T10:00:00.000Z";

test("awards one island-star event per new star level with economy rewards", () => {
  const database = createDatabase();
  const result = awardPracticeIslandStarsInPersistence(
    database,
    { studentId: "student-1", regionId: "number-forest", stars: 2 },
    { createId, now }
  );

  assert.equal(result.status, "awarded");
  assert.equal(result.stars, 2);
  assert.equal(result.decisions.length, 2, "levels 1 and 2 each earn an event");
  assert.equal(database.gamification_events?.length, 2);
  for (const event of database.gamification_events ?? []) {
    assert.equal(event.source, "island-star");
    assert.equal(event.status, "awarded");
    assert.equal(event.xp, 25);
    assert.equal(event.reward_points, 10);
  }
  assert.deepEqual(
    (database.gamification_events ?? []).map((event) => event.source_key).sort(),
    ["island-star:student-1:number-forest:1", "island-star:student-1:number-forest:2"]
  );
  assert.deepEqual(practiceIslandStarRecordForStudent(database, "student-1"), { "number-forest": 2 });
});

test("re-awarding the same or fewer stars changes nothing", () => {
  const database = createDatabase();
  awardPracticeIslandStarsInPersistence(database, { studentId: "student-1", regionId: "number-forest", stars: 2 }, { createId, now });

  const repeat = awardPracticeIslandStarsInPersistence(
    database,
    { studentId: "student-1", regionId: "number-forest", stars: 2 },
    { createId, now }
  );
  const downgrade = awardPracticeIslandStarsInPersistence(
    database,
    { studentId: "student-1", regionId: "number-forest", stars: 1 },
    { createId, now }
  );

  assert.equal(repeat.status, "unchanged");
  assert.equal(downgrade.status, "unchanged");
  assert.equal(repeat.stars, 2, "unchanged result reports the stored stars");
  assert.equal(database.gamification_events?.length, 2, "no extra XP events");
});

test("upgrading stars only pays the newly earned levels", () => {
  const database = createDatabase();
  awardPracticeIslandStarsInPersistence(database, { studentId: "student-1", regionId: "question-cavern", stars: 1 }, { createId, now });
  const upgrade = awardPracticeIslandStarsInPersistence(
    database,
    { studentId: "student-1", regionId: "question-cavern", stars: 3 },
    { createId, now }
  );

  assert.equal(upgrade.status, "awarded");
  assert.equal(upgrade.decisions.length, 2, "levels 2 and 3 only");
  assert.equal(database.gamification_events?.length, 3);
  assert.equal(database.practice_island_stars?.length, 1, "one row per student-region");
  assert.equal(database.practice_island_stars?.[0]?.stars, 3);
});

test("rejects unknown regions and non-positive stars", () => {
  const database = createDatabase();
  assert.equal(
    awardPracticeIslandStarsInPersistence(database, { studentId: "student-1", regionId: "atlantis", stars: 2 }, { createId, now }).status,
    "invalid-region"
  );
  assert.equal(
    awardPracticeIslandStarsInPersistence(database, { studentId: "student-1", regionId: "number-forest", stars: 0 }, { createId, now }).status,
    "invalid-stars"
  );
  assert.equal(database.gamification_events?.length, 0);
});

test("star record reads are scoped to the student and known regions", () => {
  const database = createDatabase();
  database.practice_island_stars = [
    { student_id: "student-1", region_id: "number-forest", stars: 2, updated_at: now },
    { student_id: "student-2", region_id: "number-forest", stars: 3, updated_at: now },
    { student_id: "student-1", region_id: "not-a-region", stars: 3, updated_at: now },
    { student_id: "student-1", region_id: "algebra-peaks", stars: 99, updated_at: now }
  ];

  assert.deepEqual(practiceIslandStarRecordForStudent(database, "student-1"), {
    "number-forest": 2,
    "algebra-peaks": 3
  });
});

test("database normalization keeps island star rows across save/load cycles", () => {
  const normalized = normalizePracticeIslandStarRecords(
    [
      { student_id: "student-1", region_id: "number-forest", stars: 2, updated_at: now },
      { student_id: "student-1", region_id: "number-forest", stars: 3, updated_at: now },
      { student_id: "student-1", region_id: "not-a-region", stars: 2, updated_at: now },
      { student_id: "", region_id: "algebra-peaks", stars: 2, updated_at: now },
      { student_id: "student-2", region_id: "algebra-peaks", stars: 99, updated_at: "" }
    ],
    now
  );

  assert.deepEqual(
    normalized.map((record) => [record.student_id, record.region_id, record.stars, record.updated_at]),
    [
      ["student-1", "number-forest", 3, now],
      ["student-2", "algebra-peaks", 3, now]
    ],
    "normalization must dedupe per student-region, clamp stars, drop invalid rows, and never drop valid ones"
  );
  assert.deepEqual(normalizePracticeIslandStarRecords(undefined, now), []);
});

test("the store only serves student accounts", async () => {
  const database = createDatabase();
  const store = createGamificationIslandPersistenceStore({
    createId,
    now: () => new Date(now),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });

  assert.deepEqual(await store.getPracticeIslandStars("student-1"), {});
  assert.equal(await store.getPracticeIslandStars("teacher-1"), null);
  assert.equal(await store.getPracticeIslandStars("nobody"), null);

  const awarded = await store.awardPracticeIslandStars({ studentId: "student-1", regionId: "challenge-shore", stars: 1 });
  assert.equal(awarded?.status, "awarded");
  assert.equal(await store.awardPracticeIslandStars({ studentId: "teacher-1", regionId: "challenge-shore", stars: 1 }), null);
});

test("only a real award asks the store to persist the snapshot", async () => {
  const database = createDatabase();
  const persisted: Array<string | null> = [];
  const store = createGamificationIslandPersistenceStore({
    createId,
    now: () => new Date(now),
    readDatabase: async () => database,
    mutateDatabase: async (mutator, options) => {
      const result = await mutator(database);
      const shouldPersist = options?.shouldPersist ? options.shouldPersist(result) : true;
      if (shouldPersist) persisted.push((result as { status?: string } | null)?.status ?? null);
      return result;
    }
  });

  // The Practice Arena re-posts the same award after every answered question.
  await store.awardPracticeIslandStars({ studentId: "student-1", regionId: "number-forest", stars: 2 });
  await store.awardPracticeIslandStars({ studentId: "student-1", regionId: "number-forest", stars: 2 });
  await store.awardPracticeIslandStars({ studentId: "student-1", regionId: "number-forest", stars: 1 });
  await store.awardPracticeIslandStars({ studentId: "student-1", regionId: "not-a-region", stars: 3 });
  await store.awardPracticeIslandStars({ studentId: "student-1", regionId: "number-forest", stars: 0 });
  await store.awardPracticeIslandStars({ studentId: "teacher-1", regionId: "number-forest", stars: 3 });

  assert.deepEqual(persisted, ["awarded"], "only the first, genuinely new award may rewrite the snapshot");
  assert.deepEqual(practiceIslandStarRecordForStudent(database, "student-1"), { "number-forest": 2 });
});
