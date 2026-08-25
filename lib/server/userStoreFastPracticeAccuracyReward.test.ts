import assert from "node:assert/strict";
import test from "node:test";

import {
  overlayHotPracticeAccuracyRewards,
  type PracticeAccuracyRewardOverlayDatabase
} from "@/lib/server/userStore/practiceAccuracyRewardOverlay";

test("hot Postgres practice accuracy rewards become one canonical ledger and gamification event", () => {
  const database = {
    reward_point_ledger: [],
    gamification_events: []
  } satisfies PracticeAccuracyRewardOverlayDatabase;
  const row = {
    id: "reward-ledger-hot-practice",
    student_id: "student-1",
    amount: 30,
    reason: "practice-accuracy" as const,
    label_en: "Strong Algebra practice accuracy",
    label_zh: "代數練習準確率表現良好",
    source_key: "practice-accuracy:student-1:algebra:2026-08-10",
    created_at: "2026-08-10T09:00:00.000Z"
  };

  assert.equal(overlayHotPracticeAccuracyRewards(database, [row]), 1);
  assert.deepEqual(database.reward_point_ledger, [row]);
  assert.deepEqual(database.gamification_events, [{
    id: "gamification-event-hot-reward-ledger-hot-practice",
    student_id: "student-1",
    xp: 70,
    reward_points: 30,
    source: "practice-accuracy",
    source_key: row.source_key,
    label_en: row.label_en,
    label_zh: row.label_zh,
    status: "awarded",
    anti_abuse_flags: [],
    economy_version: "gamification-core-v1",
    created_at: row.created_at
  }]);

  assert.equal(overlayHotPracticeAccuracyRewards(database, [row]), 0);
  assert.equal(database.reward_point_ledger.length, 1);
  assert.equal(database.gamification_events.length, 1);
});

test("a canonical snapshot reward wins over its matching hot outbox row", () => {
  const sourceKey = "practice-accuracy:student-1:geometry:2026-08-10";
  const canonical = {
    id: "canonical-ledger",
    student_id: "student-1",
    amount: 30,
    reason: "practice-accuracy" as const,
    label_en: "Canonical",
    label_zh: "正式記錄",
    source_key: sourceKey,
    created_at: "2026-08-10T08:00:00.000Z"
  };
  const database = {
    reward_point_ledger: [canonical],
    gamification_events: [{
      id: "canonical-event",
      student_id: "student-1",
      xp: 70,
      reward_points: 30,
      source: "practice-accuracy",
      source_key: sourceKey,
      label_en: "Canonical",
      label_zh: "正式記錄",
      status: "awarded",
      anti_abuse_flags: [],
      economy_version: "gamification-core-v1",
      created_at: canonical.created_at
    }]
  };

  assert.equal(overlayHotPracticeAccuracyRewards(database, [{
    ...canonical,
    id: "stale-hot-ledger",
    label_en: "Stale hot row"
  }]), 0);
  assert.equal(database.reward_point_ledger[0]?.id, "canonical-ledger");
  assert.equal(database.gamification_events[0]?.id, "canonical-event");
});
