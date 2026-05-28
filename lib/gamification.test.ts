import assert from "node:assert/strict";
import test from "node:test";
import {
  awardedSourceKeys,
  buildQuestProgress,
  calculateHongKongStreak,
  evaluateAntiAbuseEvent,
  gamificationRewardForSource,
  levelForXp,
  rankLeaderboard,
  resolveStudentBadges,
  totalAwardedXp
} from "./gamification";
import type { GamificationEvent } from "@/types";

const now = "2026-05-15T10:00:00.000Z";

function event(overrides: Partial<GamificationEvent>): GamificationEvent {
  return {
    id: overrides.id ?? "event-1",
    studentId: overrides.studentId ?? "student-1",
    xp: overrides.xp ?? 90,
    rewardPoints: overrides.rewardPoints ?? 40,
    source: overrides.source ?? "lesson-complete",
    sourceKey: overrides.sourceKey ?? "lesson-complete:student-1:intro",
    label: overrides.label ?? { en: "Completed a lesson", zh: "完成課節" },
    status: overrides.status ?? "awarded",
    antiAbuseFlags: overrides.antiAbuseFlags ?? [],
    economyVersion: overrides.economyVersion ?? "gamification-core-v1",
    campaignId: overrides.campaignId,
    createdAt: overrides.createdAt ?? now
  };
}

test("levelForXp returns the current and next level progress", () => {
  const level = levelForXp(650);

  assert.equal(level.current.level, 3);
  assert.equal(level.next?.level, 4);
  assert.equal(level.progressPercent, 38);
});

test("calculateHongKongStreak uses Asia/Hong_Kong day boundaries", () => {
  const streak = calculateHongKongStreak([
    "2026-05-14T16:30:00.000Z",
    "2026-05-13T17:00:00.000Z",
    "2026-05-12T18:00:00.000Z"
  ], "2026-05-15T01:00:00.000Z");

  assert.equal(streak, 3);
});

test("resolveStudentBadges unlocks badges from awarded events and streaks", () => {
  const badges = resolveStudentBadges({
    events: [
      event({ id: "lesson", source: "lesson-complete", sourceKey: "lesson:1" }),
      event({ id: "practice-1", source: "practice-accuracy", sourceKey: "practice:1" }),
      event({ id: "practice-2", source: "practice-accuracy", sourceKey: "practice:2" }),
      event({ id: "practice-3", source: "practice-accuracy", sourceKey: "practice:3" })
    ],
    streakDays: 3,
    level: 2
  });

  assert.equal(badges.find((badge) => badge.id === "first-lesson")?.earned, true);
  assert.equal(badges.find((badge) => badge.id === "accuracy-builder")?.earned, true);
  assert.equal(badges.find((badge) => badge.id === "three-day-rhythm")?.earned, true);
  assert.equal(badges.find((badge) => badge.id === "level-three")?.earned, false);
});

test("buildQuestProgress tracks completion and claimed source keys", () => {
  const quests = buildQuestProgress(
    { "answer-correct": 3, "mistake-review": 0 },
    new Set(["quest-complete:daily-correct-answers:2026-05-15"]),
    "2026-05-15"
  );
  const carefulPractice = quests.find((quest) => quest.quest.id === "daily-correct-answers");

  assert.equal(carefulPractice?.completed, true);
  assert.equal(carefulPractice?.claimed, true);
});

test("evaluateAntiAbuseEvent rejects duplicate source keys", () => {
  const decision = evaluateAntiAbuseEvent({
    source: "lesson-complete",
    sourceKey: "lesson-complete:student-1:intro",
    requestedXp: 90,
    requestedRewardPoints: 40,
    existingEvents: [event({ sourceKey: "lesson-complete:student-1:intro" })],
    now
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.status, "duplicate");
  assert.deepEqual(decision.flags, ["duplicate-source-key"]);
});

test("evaluateAntiAbuseEvent applies daily caps", () => {
  const decision = evaluateAntiAbuseEvent({
    source: "campaign-bonus",
    sourceKey: "campaign:extra",
    requestedXp: 100,
    requestedRewardPoints: 30,
    existingEvents: [
      event({ id: "cap-1", xp: 410, rewardPoints: 150, sourceKey: "cap:1" })
    ],
    now
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.status, "capped");
  assert.equal(decision.appliedXp, 10);
  assert.equal(decision.appliedRewardPoints, 10);
});

test("teacher manual awards respect the daily teacher cap", () => {
  const decision = evaluateAntiAbuseEvent({
    source: "teacher-award",
    sourceKey: "teacher-award:student-1:bonus",
    requestedXp: 80,
    requestedRewardPoints: 50,
    existingEvents: [
      event({ id: "teacher-1", source: "teacher-award", xp: 180, rewardPoints: 100, sourceKey: "teacher-award:student-1:earlier" })
    ],
    now
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.status, "capped");
  assert.deepEqual(decision.flags, ["teacher-daily-cap"]);
});

test("reward redemptions do not reduce growth XP", () => {
  const xp = totalAwardedXp([
    event({ id: "lesson", xp: 90, rewardPoints: 40 }),
    event({ id: "redeem", source: "teacher-award", xp: 0, rewardPoints: -40, status: "flagged", sourceKey: "redemption:ignored" })
  ]);

  assert.equal(xp, 90);
});

test("rankLeaderboard sorts by weekly XP, streak, badges, then name", () => {
  const ranked = rankLeaderboard([
    { studentId: "a", studentName: "Ada", grade: "S3", classNames: ["S3A"], weeklyXp: 100, weeklyRewardPoints: 40, level: 2, badgeCount: 1, streakDays: 1 },
    { studentId: "b", studentName: "Ben", grade: "S3", classNames: ["S3A"], weeklyXp: 100, weeklyRewardPoints: 40, level: 2, badgeCount: 2, streakDays: 1 },
    { studentId: "c", studentName: "Chloe", grade: "S3", classNames: ["S3A"], weeklyXp: 120, weeklyRewardPoints: 50, level: 2, badgeCount: 1, streakDays: 1 }
  ]);

  assert.deepEqual(ranked.map((entry) => `${entry.rank}:${entry.studentName}`), ["1:Chloe", "2:Ben", "3:Ada"]);
});

test("gamificationRewardForSource maps teacher points onto non-spendable XP", () => {
  const reward = gamificationRewardForSource("teacher-award", 33);

  assert.equal(reward.rewardPoints, 33);
  assert.equal(reward.xp, 66);
  assert.equal(awardedSourceKeys([event({ sourceKey: "x" })]).has("x"), true);
});

test("Adventure Island completion has a capped fixed reward and can unlock a badge", () => {
  const reward = gamificationRewardForSource("adventure-island-complete");
  const decision = evaluateAntiAbuseEvent({
    source: "adventure-island-complete",
    sourceKey: "adventure-island-complete:student-1:adventure-island:2026-05-15",
    requestedXp: reward.xp,
    requestedRewardPoints: reward.rewardPoints,
    existingEvents: [],
    now
  });
  const duplicate = evaluateAntiAbuseEvent({
    source: "adventure-island-complete",
    sourceKey: "adventure-island-complete:student-1:adventure-island:2026-05-15",
    requestedXp: reward.xp,
    requestedRewardPoints: reward.rewardPoints,
    existingEvents: [
      event({
        source: "adventure-island-complete",
        sourceKey: "adventure-island-complete:student-1:adventure-island:2026-05-15",
        xp: reward.xp,
        rewardPoints: reward.rewardPoints
      })
    ],
    now
  });
  const badges = resolveStudentBadges({
    events: [
      event({
        source: "adventure-island-complete",
        sourceKey: "adventure-island-complete:student-1:adventure-island:2026-05-15",
        xp: reward.xp,
        rewardPoints: reward.rewardPoints
      })
    ],
    streakDays: 0,
    level: 1
  });
  const leaderboard = rankLeaderboard([
    { studentId: "a", studentName: "Ada", grade: "S3", classNames: ["S3A"], weeklyXp: reward.xp, weeklyRewardPoints: 999, level: 1, badgeCount: 0, streakDays: 0 },
    { studentId: "b", studentName: "Ben", grade: "S3", classNames: ["S3A"], weeklyXp: reward.xp + 1, weeklyRewardPoints: 0, level: 1, badgeCount: 0, streakDays: 0 }
  ]);

  assert.equal(reward.xp, 35);
  assert.equal(reward.rewardPoints, 35);
  assert.equal(decision.allowed, true);
  assert.equal(decision.appliedXp, 35);
  assert.equal(decision.appliedRewardPoints, 35);
  assert.equal(duplicate.allowed, false);
  assert.equal(duplicate.status, "duplicate");
  assert.equal(badges.find((badge) => badge.id === "adventure-island-clear")?.earned, true);
  assert.equal(leaderboard[0]?.studentName, "Ben");
});
