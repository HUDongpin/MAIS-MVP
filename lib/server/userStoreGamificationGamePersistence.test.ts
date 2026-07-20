import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  adventureIslandSourceKey,
  createGamificationGamePersistenceStore,
  verifiedTopicAdventureIslandQuestionCount,
  type GamificationGamePersistenceDatabase
} from "@/lib/server/userStore/gamificationGamePersistence";

function eligibilityFixture(source: string) {
  return {
    eligible: true,
    reason: "ready" as const,
    dayKey: "2026-06-20",
    topicId: source,
    topicTitle: {
      en: source,
      zh: source
    },
    roundKey: "round-1",
    roundQuestionCount: 5,
    requiredQuestionCount: 5,
    attemptCount: 5,
    correctCount: 4,
    accuracyPercent: 80,
    alreadyCompleted: false,
    completedAt: null,
    postAdventurePracticeEligible: false,
    rewardPreview: {
      xp: 35,
      rewardPoints: 35
    }
  };
}

function completionFixture(source: string) {
  return {
    status: "awarded" as const,
    eligibility: eligibilityFixture(source),
    reward: {
      xp: 35,
      rewardPoints: 35,
      label: {
        en: source,
        zh: source
      }
    },
    gamification: null
  };
}

function fishingCompletionFixture(source: string) {
  return {
    status: "awarded" as const,
    reward: {
      xp: 0,
      rewardPoints: 3,
      label: {
        en: source,
        zh: source
      }
    },
    coins: 1,
    topicId: source,
    gamification: null
  };
}

function createDatabase(): GamificationGamePersistenceDatabase {
  return {
    attempts: [],
    gamification_events: [],
    questions: [],
    reward_point_ledger: [],
    topics: [],
    users: [
      {
        id: "student-1",
        role: "student"
      },
      {
        id: "teacher-1",
        role: "teacher"
      }
    ]
  };
}

function createAdventureIslandReadyDatabase(): GamificationGamePersistenceDatabase {
  const database = createDatabase();
  database.topics = [
    {
      id: "topic-1",
      title_en: "Linear equations",
      title_zh: "一次方程"
    }
  ];
  database.questions = Array.from({ length: 5 }, (_, index) => ({
    id: `q${index + 1}`,
    topic_id: "topic-1"
  }));
  database.attempts = database.questions.map((question, index) => ({
    id: `attempt-${question.id}`,
    user_id: "student-1",
    question_id: question.id,
    is_correct: index < 4,
    created_at: `2026-06-20T10:0${index}:00.000Z`
  }));
  return database;
}

function fishingSourceKey(studentId: string, topicId: string, roundKey: string) {
  return `fishing-game-complete:${studentId}:${topicId}:${createHash("sha256").update(roundKey).digest("hex").slice(0, 16)}`;
}

function createFishingGameReadyDatabase(): GamificationGamePersistenceDatabase {
  const database = createDatabase();
  database.topics = [
    {
      id: "topic-1",
      title_en: "Linear equations",
      title_zh: "一次方程"
    }
  ];
  database.questions = Array.from({ length: 5 }, (_, index) => ({
    id: `q${index + 1}`,
    topic_id: "topic-1"
  }));
  database.gamification_events = [
    {
      id: "adventure-event-1",
      student_id: "student-1",
      xp: 35,
      reward_points: 35,
      source: "adventure-island-complete",
      source_key: adventureIslandSourceKey("student-1", "topic-1", "round-1"),
      label_en: "Adventure Island: Linear equations",
      label_zh: "探险岛：一次方程",
      status: "awarded",
      anti_abuse_flags: [],
      economy_version: "gamification-core-v1",
      created_at: "2026-06-20T10:10:00.000Z"
    }
  ];
  database.attempts = database.questions.map((question, index) => ({
    id: `post-adventure-attempt-${question.id}`,
    user_id: "student-1",
    question_id: question.id,
    is_correct: index < 4,
    created_at: `2026-06-20T10:1${index + 1}:00.000Z`
  }));
  return database;
}

test("gamification game persistence resolves Adventure Island eligibility through extracted boundary", async () => {
  const database = createDatabase();
  const calls: string[] = [];
  const store = createGamificationGamePersistenceStore({
    adventureIslandEligibilityFromDatabase: (candidateDatabase, input) => {
      const source = candidateDatabase === database ? "snapshot" : "unknown";
      calls.push(`${source}:${input.studentId}:${input.topicId ?? "default"}:${input.roundKey ?? "default"}`);
      return eligibilityFixture(source);
    },
    readDatabase: async () => database
  });

  assert.deepEqual(
    await store.getAdventureIslandEligibility("student-1", {
      topicId: "topic-1",
      roundKey: "round-1",
      roundQuestionIds: ["q1"],
      correctRoundQuestionIds: ["q1"]
    }),
    eligibilityFixture("snapshot")
  );
  assert.deepEqual(calls, ["snapshot:student-1:topic-1:round-1"]);
});

test("gamification game persistence calculates Adventure Island eligibility without legacy helper injection", async () => {
  const database = createAdventureIslandReadyDatabase();
  const store = createGamificationGamePersistenceStore({
    now: () => new Date("2026-06-20T10:00:00.000Z"),
    readDatabase: async () => database
  });

  assert.deepEqual(
    await store.getAdventureIslandEligibility("student-1", {
      topicId: "topic-1",
      roundKey: "round-1",
      roundQuestionIds: ["q1", "q2", "q3", "q4", "q5"],
      correctRoundQuestionIds: ["q1", "q2", "q3", "q4"]
    }),
    {
      eligible: true,
      reason: "ready",
      dayKey: "2026-06-20",
      topicId: "topic-1",
      topicTitle: {
        en: "Linear equations",
        zh: "一次方程"
      },
      roundKey: "round-1",
      roundQuestionCount: 5,
      requiredQuestionCount: 5,
      attemptCount: 5,
      correctCount: 4,
      accuracyPercent: 80,
      alreadyCompleted: false,
      completedAt: null,
      postAdventurePracticeEligible: false,
      rewardPreview: {
        xp: 35,
        rewardPoints: 35
      }
    }
  );
});

test("gamification game persistence builds stable Adventure Island source keys", () => {
  assert.equal(
    adventureIslandSourceKey("student-1", "topic-1", "round-1"),
    "adventure-island-complete:student-1:topic-1:dcc2a68711ebefcb"
  );
});

test("gamification game persistence counts verified topic Adventure Island answers", () => {
  const database = createAdventureIslandReadyDatabase();
  database.questions?.push({ id: "other-topic-question", topic_id: "topic-2" });
  database.attempts?.push({
    id: "attempt-other-topic",
    user_id: "student-1",
    question_id: "other-topic-question",
    is_correct: true,
    created_at: "2026-06-20T10:10:00.000Z"
  });

  assert.equal(
    verifiedTopicAdventureIslandQuestionCount(
      database,
      "student-1",
      ["q1", "q2", "q3", "q4", "q1", "other-topic-question", "missing"],
      "topic-1"
    ),
    4
  );
});

test("gamification game persistence rejects non-students before game projection", async () => {
  const database = createDatabase();
  const calls: string[] = [];
  const store = createGamificationGamePersistenceStore({
    adventureIslandEligibilityFromDatabase: (_candidateDatabase, input) => {
      calls.push(input.studentId);
      return eligibilityFixture("unexpected");
    },
    readDatabase: async () => database
  });

  assert.equal(await store.getAdventureIslandEligibility("teacher-1"), null);
  assert.equal(await store.getAdventureIslandEligibility("missing-student"), null);
  assert.deepEqual(calls, []);
});

test("gamification game persistence completes Fishing Game through extracted mutation boundary", async () => {
  const database = createDatabase();
  const calls: string[] = [];
  const store = createGamificationGamePersistenceStore({
    completeFishingGameInDatabase: (candidateDatabase, input) => {
      const source = candidateDatabase === database ? "snapshot" : "unknown";
      calls.push(`${source}:${input.studentId}:${input.topicId}:${input.coins}`);
      return fishingCompletionFixture(source);
    },
    mutateDatabase: async (mutator) => mutator(database),
    readDatabase: async () => database
  });

  assert.deepEqual(
    await store.completeFishingGame({
      studentId: "student-1",
      topicId: "topic-1",
      roundQuestionIds: ["q1"],
      correctRoundQuestionIds: ["q1"],
      caughtQuestionIds: ["q1"],
      correctCaughtQuestionIds: ["q1"],
      coins: 1,
      netsUsed: 1,
      durationSeconds: 60,
      roundKey: "round-1"
    }),
    fishingCompletionFixture("snapshot")
  );
  assert.deepEqual(calls, ["snapshot:student-1:topic-1:1"]);
});

test("gamification game persistence rejects non-students before Fishing Game completion", async () => {
  const database = createDatabase();
  const calls: string[] = [];
  const store = createGamificationGamePersistenceStore({
    completeFishingGameInDatabase: (_candidateDatabase, input) => {
      calls.push(input.studentId);
      return fishingCompletionFixture("unexpected");
    },
    mutateDatabase: async (mutator) => mutator(database),
    readDatabase: async () => database
  });

  assert.equal(
    await store.completeFishingGame({
      studentId: "teacher-1",
      topicId: "topic-1",
      roundQuestionIds: ["q1"],
      correctRoundQuestionIds: ["q1"],
      caughtQuestionIds: ["q1"],
      correctCaughtQuestionIds: ["q1"],
      coins: 1,
      netsUsed: 1,
      durationSeconds: 60,
      roundKey: "round-1"
    }),
    null
  );
  assert.deepEqual(calls, []);
});

test("gamification game persistence completes Fishing Game without legacy mutation injection", async () => {
  const database = createFishingGameReadyDatabase();
  const sourceKey = fishingSourceKey("student-1", "topic-1", "round-2");
  let nextId = 0;
  const store = createGamificationGamePersistenceStore({
    createId: () => `id-${++nextId}`,
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date("2026-06-20T10:30:00.000Z"),
    readDatabase: async () => database
  });

  const result = await store.completeFishingGame({
    studentId: "student-1",
    topicId: "topic-1",
    roundQuestionIds: ["q1", "q2", "q3", "q4", "q5"],
    correctRoundQuestionIds: ["q1", "q2", "q3", "q4"],
    caughtQuestionIds: ["q1", "q2", "q3"],
    correctCaughtQuestionIds: ["q1", "q2"],
    coins: 2,
    netsUsed: 3,
    durationSeconds: 60,
    roundKey: "round-2"
  });

  assert.equal(result?.status, "awarded");
  assert.deepEqual(result?.reward, {
    xp: 6,
    rewardPoints: 6,
    label: {
      en: "Cleared Fishing Master",
      zh: "完成捕魚達人"
    }
  });
  assert.equal(result?.coins, 2);
  assert.equal(result?.topicId, "topic-1");
  assert.equal(result?.gamification, null);
  assert.deepEqual(database.gamification_events?.[0], {
    id: "gamification-event-id-1",
    student_id: "student-1",
    xp: 6,
    reward_points: 6,
    source: "fishing-game-complete",
    source_key: sourceKey,
    label_en: "Fishing Master: Linear equations",
    label_zh: "捕魚達人：一次方程",
    status: "awarded",
    anti_abuse_flags: [],
    economy_version: "gamification-core-v1",
    created_at: "2026-06-20T10:30:00.000Z"
  });
  assert.deepEqual(database.reward_point_ledger?.[0], {
    id: "reward-ledger-id-2",
    student_id: "student-1",
    amount: 6,
    reason: "fishing-game-complete",
    label_en: "Fishing Master: Linear equations",
    label_zh: "捕魚達人：一次方程",
    note: "Converted 2 fishing coin(s) at 3 points each.",
    source_key: sourceKey,
    created_at: "2026-06-20T10:30:00.000Z"
  });
});

test("gamification game persistence completes Adventure Island through extracted mutation boundary", async () => {
  const database = createDatabase();
  const calls: string[] = [];
  const store = createGamificationGamePersistenceStore({
    completeAdventureIslandInDatabase: (candidateDatabase, input) => {
      const source = candidateDatabase === database ? "snapshot" : "unknown";
      calls.push(`${source}:${input.studentId}:${input.topicId}:${input.durationSeconds}`);
      return completionFixture(source);
    },
    mutateDatabase: async (mutator) => mutator(database),
    readDatabase: async () => database
  });

  assert.deepEqual(
    await store.completeAdventureIsland({
      studentId: "student-1",
      topicId: "topic-1",
      roundKey: "round-1",
      roundQuestionIds: ["q1"],
      correctRoundQuestionIds: ["q1"],
      correctQuestionIds: ["q1"],
      durationSeconds: 60,
      defeatedEnemies: 3
    }),
    completionFixture("snapshot")
  );
  assert.deepEqual(calls, ["snapshot:student-1:topic-1:60"]);
});

test("gamification game persistence completes Adventure Island without legacy mutation injection", async () => {
  const database = createAdventureIslandReadyDatabase();
  const sourceKey = adventureIslandSourceKey("student-1", "topic-1", "round-1");
  let nextId = 0;
  const store = createGamificationGamePersistenceStore({
    createId: () => `id-${++nextId}`,
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date("2026-06-20T10:30:00.000Z"),
    readDatabase: async () => database
  });

  const result = await store.completeAdventureIsland({
    studentId: "student-1",
    topicId: "topic-1",
    roundKey: "round-1",
    roundQuestionIds: ["q1", "q2", "q3", "q4", "q5"],
    correctRoundQuestionIds: ["q1", "q2", "q3", "q4"],
    correctQuestionIds: ["q1", "q2", "q3", "q4"],
    durationSeconds: 60,
    defeatedEnemies: 3
  });

  assert.equal(result?.status, "awarded");
  assert.deepEqual(result?.reward, {
    xp: 35,
    rewardPoints: 35,
    label: {
      en: "Adventure Island: Linear equations",
      zh: "探险岛：一次方程"
    }
  });
  assert.equal(result?.eligibility.reason, "already-completed");
  assert.equal(result?.eligibility.completedAt, "2026-06-20T10:30:00.000Z");
  assert.equal(result?.gamification, null);
  assert.deepEqual(database.gamification_events?.[0], {
    id: "gamification-event-id-1",
    student_id: "student-1",
    xp: 35,
    reward_points: 35,
    source: "adventure-island-complete",
    source_key: sourceKey,
    label_en: "Adventure Island: Linear equations",
    label_zh: "探险岛：一次方程",
    status: "awarded",
    anti_abuse_flags: [],
    economy_version: "gamification-core-v1",
    created_at: "2026-06-20T10:30:00.000Z"
  });
  assert.deepEqual(database.reward_point_ledger?.[0], {
    id: "reward-ledger-id-2",
    student_id: "student-1",
    amount: 35,
    reason: "adventure-island-complete",
    label_en: "Adventure Island: Linear equations",
    label_zh: "探险岛：一次方程",
    note: "Verified 3 Adventure Island answers for topic topic-1.",
    source_key: sourceKey,
    created_at: "2026-06-20T10:30:00.000Z"
  });
});

test("gamification game persistence rejects non-students before Adventure Island completion", async () => {
  const database = createDatabase();
  const calls: string[] = [];
  const store = createGamificationGamePersistenceStore({
    completeAdventureIslandInDatabase: (_candidateDatabase, input) => {
      calls.push(input.studentId);
      return completionFixture("unexpected");
    },
    mutateDatabase: async (mutator) => mutator(database),
    readDatabase: async () => database
  });

  assert.equal(
    await store.completeAdventureIsland({
      studentId: "teacher-1",
      topicId: "topic-1",
      roundKey: "round-1",
      roundQuestionIds: ["q1"],
      correctRoundQuestionIds: ["q1"],
      correctQuestionIds: ["q1"],
      durationSeconds: 60
    }),
    null
  );
  assert.deepEqual(calls, []);
});

test("a three-star Adventure Island run earns the star bonus and a relic", async () => {
  const database = createAdventureIslandReadyDatabase();
  let nextId = 0;
  const store = createGamificationGamePersistenceStore({
    createId: () => `id-${++nextId}`,
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date("2026-06-20T10:30:00.000Z"),
    readDatabase: async () => database
  });

  const result = await store.completeAdventureIsland({
    studentId: "student-1",
    topicId: "topic-1",
    roundKey: "round-1",
    roundQuestionIds: ["q1", "q2", "q3", "q4", "q5"],
    correctRoundQuestionIds: ["q1", "q2", "q3", "q4"],
    correctQuestionIds: ["q1", "q2", "q3", "q4"],
    durationSeconds: 90,
    defeatedEnemies: 3,
    livesRemaining: 2
  });

  assert.equal(result?.status, "awarded");
  assert.deepEqual(result?.reward, {
    xp: 50,
    rewardPoints: 50,
    label: {
      en: "Adventure Island: Linear equations",
      zh: "探险岛：一次方程"
    }
  });
  assert.deepEqual(result?.starBonus, { applied: true, rewardPoints: 15 });
  assert.deepEqual(result?.relic, { topicId: "topic-1", isNew: true, clearCount: 1, bestStars: 3 });
  assert.equal(database.gamification_events?.[0]?.xp, 50);
  assert.equal(database.gamification_events?.[0]?.reward_points, 50);
  assert.match(database.reward_point_ledger?.[0]?.note ?? "", /three-star clear bonus \(\+15\)/);
  assert.deepEqual(database.adventure_relics?.[0], {
    id: "adventure-relic-id-3",
    student_id: "student-1",
    topic_id: "topic-1",
    first_cleared_at: "2026-06-20T10:30:00.000Z",
    clear_count: 1,
    best_stars: 3,
    updated_at: "2026-06-20T10:30:00.000Z"
  });
});

test("a bruised or slow Adventure Island run stays at the base reward", async () => {
  const database = createAdventureIslandReadyDatabase();
  const store = createGamificationGamePersistenceStore({
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date("2026-06-20T10:30:00.000Z"),
    readDatabase: async () => database
  });

  const result = await store.completeAdventureIsland({
    studentId: "student-1",
    topicId: "topic-1",
    roundKey: "round-1",
    roundQuestionIds: ["q1", "q2", "q3", "q4", "q5"],
    correctRoundQuestionIds: ["q1", "q2", "q3", "q4"],
    correctQuestionIds: ["q1", "q2", "q3", "q4"],
    durationSeconds: 90,
    defeatedEnemies: 3,
    livesRemaining: 1
  });

  assert.equal(result?.status, "awarded");
  assert.equal(result?.reward.xp, 35);
  assert.equal(result?.reward.rewardPoints, 35);
  assert.deepEqual(result?.starBonus, { applied: false, rewardPoints: 0 });
  assert.deepEqual(result?.relic, { topicId: "topic-1", isNew: true, clearCount: 1, bestStars: 2 });
});

test("an impossible livesRemaining claim voids the Adventure Island run", async () => {
  const database = createAdventureIslandReadyDatabase();
  const store = createGamificationGamePersistenceStore({
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date("2026-06-20T10:30:00.000Z"),
    readDatabase: async () => database
  });

  const result = await store.completeAdventureIsland({
    studentId: "student-1",
    topicId: "topic-1",
    roundKey: "round-1",
    roundQuestionIds: ["q1", "q2", "q3", "q4", "q5"],
    correctRoundQuestionIds: ["q1", "q2", "q3", "q4"],
    correctQuestionIds: ["q1", "q2", "q3", "q4"],
    durationSeconds: 90,
    defeatedEnemies: 3,
    livesRemaining: 5
  });

  assert.equal(result?.status, "invalid-run");
  assert.equal(database.adventure_relics?.length ?? 0, 0);
});

test("a validated duplicate Adventure Island replay upgrades the topic relic without repeating the reward", async () => {
  const database = createAdventureIslandReadyDatabase();
  let nextId = 0;
  const store = createGamificationGamePersistenceStore({
    createId: () => `id-${++nextId}`,
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date("2026-06-20T10:30:00.000Z"),
    readDatabase: async () => database
  });
  const input = {
    studentId: "student-1",
    topicId: "topic-1",
    roundKey: "round-1",
    roundQuestionIds: ["q1", "q2", "q3", "q4", "q5"],
    correctRoundQuestionIds: ["q1", "q2", "q3", "q4"],
    correctQuestionIds: ["q1", "q2", "q3", "q4"],
    durationSeconds: 200,
    defeatedEnemies: 3,
    livesRemaining: 1
  };

  const first = await store.completeAdventureIsland(input);
  assert.equal(first?.status, "awarded");
  assert.equal(first?.relic?.bestStars, 1, "slow bruised run starts at one star");

  const replay = await store.completeAdventureIsland({ ...input, durationSeconds: 80, livesRemaining: 2 });
  assert.equal(replay?.status, "duplicate");
  assert.equal(replay?.reward.xp, 0, "a duplicate never pays again");
  assert.deepEqual(replay?.relic, { topicId: "topic-1", isNew: false, clearCount: 2, bestStars: 3 });
});

test("fishing rarity claims pay the bonus and fill the Fish-dex", async () => {
  const database = createFishingGameReadyDatabase();
  let nextId = 0;
  const store = createGamificationGamePersistenceStore({
    createId: () => `id-${++nextId}`,
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date("2026-06-20T10:30:00.000Z"),
    readDatabase: async () => database
  });

  const result = await store.completeFishingGame({
    studentId: "student-1",
    topicId: "topic-1",
    roundQuestionIds: ["q1", "q2", "q3", "q4", "q5"],
    correctRoundQuestionIds: ["q1", "q2", "q3", "q4"],
    caughtQuestionIds: ["q1", "q2", "q3"],
    correctCaughtQuestionIds: ["q1", "q2"],
    caughtSpecies: { q1: "shark", q2: "smallFish", q3: "stingray" },
    coins: 2,
    netsUsed: 3,
    durationSeconds: 60,
    roundKey: "round-2"
  });

  assert.equal(result?.status, "awarded");
  // Base 2 coins x 3 plus epic shark (+2); the stingray was caught but not
  // answered correctly, so it earns nothing and stays out of the dex.
  assert.equal(result?.reward.xp, 8);
  assert.equal(result?.reward.rewardPoints, 8);
  assert.equal(result?.rarityBonus, 2);
  assert.deepEqual(result?.dex, { newSpecies: ["shark", "smallFish"], caughtCount: 2, totalSpecies: 7 });
  assert.match(database.reward_point_ledger?.[0]?.note ?? "", /rarity bonus of 2/);
  assert.equal(database.fishing_dex?.length, 2);
  assert.deepEqual(database.fishing_dex?.map((row) => row.species).sort(), ["shark", "smallFish"].sort());
});

test("bogus fishing species claims void the run", async () => {
  const baseInput = {
    studentId: "student-1",
    topicId: "topic-1",
    roundQuestionIds: ["q1", "q2", "q3", "q4", "q5"],
    correctRoundQuestionIds: ["q1", "q2", "q3", "q4"],
    caughtQuestionIds: ["q1", "q2"],
    correctCaughtQuestionIds: ["q1", "q2"],
    coins: 2,
    netsUsed: 3,
    durationSeconds: 60,
    roundKey: "round-2"
  };

  const bogusClaims: Array<Record<string, string>> = [
    { q1: "shark", q2: "shark" },
    { q1: "kraken", q2: "smallFish" },
    { q9: "shark" }
  ];
  for (const caughtSpecies of bogusClaims) {
    const database = createFishingGameReadyDatabase();
    const store = createGamificationGamePersistenceStore({
      mutateDatabase: async (mutator) => mutator(database),
      now: () => new Date("2026-06-20T10:30:00.000Z"),
      readDatabase: async () => database
    });
    const result = await store.completeFishingGame({ ...baseInput, caughtSpecies });
    assert.equal(result?.status, "invalid-run", `expected ${JSON.stringify(caughtSpecies)} to void the run`);
    assert.equal(database.fishing_dex?.length ?? 0, 0);
  }
});

test("legacy userStore delegates Adventure Island eligibility through gamification domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getAdventureIslandEligibility = gamificationUserStore\.getAdventureIslandEligibility/);
  assert.doesNotMatch(source, /adventureIslandEligibilityFromDatabase/);
  assert.doesNotMatch(source, /function buildAdventureIslandEligibility/);
  assert.doesNotMatch(source, /function adventureIslandSourceKey/);
  assert.doesNotMatch(source, /function verifiedTopicAdventureIslandQuestionCount/);
  assert.doesNotMatch(source, /export async function getAdventureIslandEligibility/);
});

test("legacy userStore delegates Adventure Island completion through gamification domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const completeAdventureIsland = gamificationUserStore\.completeAdventureIsland/);
  assert.doesNotMatch(source, /function completeAdventureIslandInDatabase/);
  assert.doesNotMatch(source, /export async function completeAdventureIsland/);
});

test("legacy userStore delegates Fishing Game completion through gamification domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const completeFishingGame = gamificationUserStore\.completeFishingGame/);
  assert.doesNotMatch(source, /function completeFishingGameInDatabase/);
  assert.doesNotMatch(source, /export async function completeFishingGame/);
});
