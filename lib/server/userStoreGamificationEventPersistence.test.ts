import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  recordGamificationEventOnce,
  type GamificationEventPersistenceDatabase
} from "@/lib/server/userStore/gamificationEventPersistence";

function createDatabase(): GamificationEventPersistenceDatabase {
  return {
    gamification_events: []
  };
}

test("gamification event persistence records awarded events once with normalized source keys", () => {
  const database = createDatabase();
  let nextId = 0;
  const decision = recordGamificationEventOnce(database, () => `id-${++nextId}`, {
    studentId: "student-1",
    source: "teacher-award",
    sourceKey: "teacher award source",
    label: {
      en: "Teacher bonus",
      zh: "教師獎勵"
    },
    rewardPoints: 25,
    campaignId: "campaign-1",
    createdAt: "2026-06-20T10:00:00.000Z"
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.appliedXp, 50);
  assert.equal(decision.appliedRewardPoints, 25);
  assert.deepEqual(database.gamification_events, [
    {
      id: "gamification-event-id-1",
      student_id: "student-1",
      xp: 50,
      reward_points: 25,
      source: "teacher-award",
      source_key: "teacher-award-source",
      label_en: "Teacher bonus",
      label_zh: "教師獎勵",
      status: "awarded",
      anti_abuse_flags: [],
      economy_version: "gamification-core-v1",
      campaign_id: "campaign-1",
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ]);

  const duplicateDecision = recordGamificationEventOnce(database, () => `id-${++nextId}`, {
    studentId: "student-1",
    source: "teacher-award",
    sourceKey: "teacher award source",
    label: {
      en: "Teacher bonus",
      zh: "教師獎勵"
    },
    rewardPoints: 25,
    createdAt: "2026-06-20T10:01:00.000Z"
  });

  assert.equal(duplicateDecision.allowed, false);
  assert.equal(duplicateDecision.status, "duplicate");
  assert.equal(database.gamification_events.length, 1);
});

test("gamification event persistence records capped non-duplicate decisions for audits", () => {
  const database = createDatabase();
  database.gamification_events?.push({
    id: "existing-teacher-award",
    student_id: "student-1",
    xp: 240,
    reward_points: 120,
    source: "teacher-award",
    source_key: "teacher-award:existing",
    label_en: "Existing teacher award",
    label_zh: "既有教師獎勵",
    status: "awarded",
    anti_abuse_flags: [],
    economy_version: "gamification-core-v1",
    created_at: "2026-06-20T09:00:00.000Z"
  });
  let nextId = 0;

  const decision = recordGamificationEventOnce(database, () => `id-${++nextId}`, {
    studentId: "student-1",
    source: "teacher-award",
    sourceKey: "teacher-award:capped",
    label: {
      en: "Teacher bonus",
      zh: "教師獎勵"
    },
    rewardPoints: 1,
    createdAt: "2026-06-20T10:00:00.000Z"
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.status, "capped");
  assert.deepEqual(database.gamification_events?.[0], {
    id: "gamification-event-id-1",
    student_id: "student-1",
    xp: 0,
    reward_points: 0,
    source: "teacher-award",
    source_key: "teacher-award:capped",
    label_en: "Teacher bonus",
    label_zh: "教師獎勵",
    status: "capped",
    anti_abuse_flags: ["teacher-daily-cap"],
    economy_version: "gamification-core-v1",
    created_at: "2026-06-20T10:00:00.000Z"
  });
});

test("legacy gamification modules share the event writer instead of redefining it", async () => {
  const files = [
    "lib/server/userStore.ts",
    "lib/server/userStore/gamificationGamePersistence.ts",
    "lib/server/userStore/gamificationRewardRedemptionPersistence.ts"
  ];

  for (const file of files) {
    const source = await readFile(path.join(process.cwd(), file), "utf8");
    assert.doesNotMatch(source, /function recordGamificationEventOnce/);
  }
});
