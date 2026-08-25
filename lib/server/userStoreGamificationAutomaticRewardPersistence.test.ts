import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  awardLessonCompletionReward,
  awardMistakeReviewReward,
  awardAutomaticRewardOnce,
  awardVisualizationCompletionReward,
  maybeAwardLearningStreakReward,
  maybeAwardPracticeAccuracyReward,
  visualizationCompletionRewardSourceKey,
  type GamificationRewardRedemptionPersistenceDatabase
} from "@/lib/server/userStore/gamificationRewardRedemptionPersistence";

const awardedAt = "2026-06-20T12:00:00.000Z";

function createDatabase(): GamificationRewardRedemptionPersistenceDatabase {
  return {
    reward_catalog: [],
    reward_point_ledger: [],
    reward_redemptions: [],
    gamification_events: [],
    learning_events: [],
    attempts: [],
    questions: [],
    topics: [],
    users: [
      { id: "student-1", username: "student-one", role: "student" },
      { id: "teacher-1", username: "teacher-one", role: "teacher" }
    ]
  };
}

test("automatic reward helper records governed events and ledger rows once", () => {
  const database = createDatabase();

  assert.equal(awardAutomaticRewardOnce(database, {
    studentId: "student-1",
    reason: "lesson-complete",
    sourceKey: " lesson   complete ",
    label: {
      en: "Completed a lesson",
      zh: "Completed a lesson"
    },
    note: "  Careful   checklist  ",
    createdAt: awardedAt
  }, () => "automatic-reward-id"), true);

  assert.equal(awardAutomaticRewardOnce(database, {
    studentId: "student-1",
    reason: "lesson-complete",
    sourceKey: " lesson   complete ",
    label: {
      en: "Completed the same lesson again",
      zh: "Completed the same lesson again"
    },
    createdAt: awardedAt
  }, () => "duplicate-reward-id"), false);

  assert.equal(database.gamification_events?.length, 1);
  assert.equal(database.gamification_events?.[0]?.id, "gamification-event-automatic-reward-id");
  assert.equal(database.gamification_events?.[0]?.student_id, "student-1");
  assert.equal(database.gamification_events?.[0]?.source, "lesson-complete");
  assert.equal(database.gamification_events?.[0]?.source_key, "lesson-complete");
  assert.equal(database.gamification_events?.[0]?.reward_points, 40);
  assert.equal(database.gamification_events?.[0]?.status, "awarded");
  assert.equal(database.reward_point_ledger.length, 1);
  assert.equal(database.reward_point_ledger[0].id, "reward-ledger-automatic-reward-id");
  assert.equal(database.reward_point_ledger[0].student_id, "student-1");
  assert.equal(database.reward_point_ledger[0].amount, 40);
  assert.equal(database.reward_point_ledger[0].reason, "lesson-complete");
  assert.equal(database.reward_point_ledger[0].source_key, "lesson-complete");
  assert.equal(database.reward_point_ledger[0].note, "Careful checklist");
});

test("learning streak reward helper awards the first three-day streak once", () => {
  const database = createDatabase();
  database.learning_events = [
    { id: "event-1", user_id: "student-1", type: "practice", created_at: "2026-06-18T10:00:00.000Z" },
    { id: "event-2", user_id: "student-1", type: "practice", created_at: "2026-06-19T10:00:00.000Z" },
    { id: "event-3", user_id: "student-1", type: "practice", created_at: "2026-06-20T10:00:00.000Z" },
    { id: "event-other", user_id: "teacher-1", type: "practice", created_at: "2026-06-20T10:00:00.000Z" }
  ];

  assert.equal(
    maybeAwardLearningStreakReward(database, "student-1", new Date("2026-06-20T12:00:00.000Z"), () => "streak-id"),
    true
  );
  assert.equal(
    maybeAwardLearningStreakReward(database, "student-1", new Date("2026-06-20T12:00:00.000Z"), () => "duplicate-streak-id"),
    false
  );
  assert.equal(database.reward_point_ledger.length, 1);
  assert.equal(database.reward_point_ledger[0].id, "reward-ledger-streak-id");
  assert.equal(database.reward_point_ledger[0].amount, 25);
  assert.equal(database.reward_point_ledger[0].reason, "streak");
  assert.equal(database.reward_point_ledger[0].source_key, "streak:student-1:3-day");
  assert.equal(database.gamification_events?.length, 1);
  assert.equal(database.gamification_events?.[0]?.source, "streak");
});

test("practice accuracy reward helper awards one daily topic accuracy reward", () => {
  const database = createDatabase();
  database.topics = [
    {
      id: "topic-algebra",
      title_en: "Linear equations",
      title_zh: "一次方程"
    }
  ];
  database.questions = [
    { id: "question-1", topic_id: "topic-algebra" },
    { id: "question-other", topic_id: "topic-geometry" }
  ];
  database.attempts = [
    { id: "attempt-1", user_id: "student-1", question_id: "question-1", is_correct: true, created_at: "2026-06-20T08:00:00.000Z" },
    { id: "attempt-2", user_id: "student-1", question_id: "question-1", is_correct: true, created_at: "2026-06-20T09:00:00.000Z" },
    { id: "attempt-3", user_id: "student-1", question_id: "question-1", is_correct: true, created_at: "2026-06-20T10:00:00.000Z" },
    { id: "attempt-4", user_id: "student-1", question_id: "question-1", is_correct: true, created_at: "2026-06-20T11:00:00.000Z" },
    { id: "attempt-5", user_id: "student-1", question_id: "question-1", is_correct: false, created_at: "2026-06-20T11:30:00.000Z" },
    { id: "attempt-other-topic", user_id: "student-1", question_id: "question-other", is_correct: false, created_at: "2026-06-20T11:45:00.000Z" },
    { id: "attempt-other-day", user_id: "student-1", question_id: "question-1", is_correct: false, created_at: "2026-06-19T11:45:00.000Z" },
    { id: "attempt-other-user", user_id: "teacher-1", question_id: "question-1", is_correct: false, created_at: "2026-06-20T11:45:00.000Z" }
  ];

  assert.equal(
    maybeAwardPracticeAccuracyReward(
      database,
      "student-1",
      { id: "question-1", topic_id: "topic-algebra" },
      "2026-06-20T12:00:00.000Z",
      () => "accuracy-id"
    ),
    true
  );
  assert.equal(
    maybeAwardPracticeAccuracyReward(
      database,
      "student-1",
      { id: "question-1", topic_id: "topic-algebra" },
      "2026-06-20T12:05:00.000Z",
      () => "duplicate-accuracy-id"
    ),
    false
  );
  assert.equal(database.reward_point_ledger.length, 1);
  assert.equal(database.reward_point_ledger[0].id, "reward-ledger-accuracy-id");
  assert.equal(database.reward_point_ledger[0].amount, 30);
  assert.equal(database.reward_point_ledger[0].reason, "practice-accuracy");
  assert.equal(database.reward_point_ledger[0].source_key, "practice-accuracy:student-1:topic-algebra:2026-06-20");
  assert.equal(database.gamification_events?.[0]?.source, "practice-accuracy");
  assert.equal(database.gamification_events?.[0]?.label_en, "Strong Linear equations practice accuracy");
});

test("mistake review reward helper awards one mastered-question reward", () => {
  const database = createDatabase();

  assert.equal(
    awardMistakeReviewReward(database, {
      userId: "student-1",
      questionId: "question-1",
      topic: {
        id: "topic-fractions",
        title_en: "Fractions",
        title_zh: "分數"
      },
      masteredAt: "2026-06-20T12:00:00.000Z"
    }, () => "mistake-id"),
    true
  );
  assert.equal(
    awardMistakeReviewReward(database, {
      userId: "student-1",
      questionId: "question-1",
      topic: {
        id: "topic-fractions",
        title_en: "Fractions",
        title_zh: "分數"
      },
      masteredAt: "2026-06-20T12:05:00.000Z"
    }, () => "duplicate-mistake-id"),
    false
  );
  assert.equal(database.reward_point_ledger.length, 1);
  assert.equal(database.reward_point_ledger[0].id, "reward-ledger-mistake-id");
  assert.equal(database.reward_point_ledger[0].amount, 15);
  assert.equal(database.reward_point_ledger[0].reason, "mistake-review");
  assert.equal(database.reward_point_ledger[0].source_key, "mistake-review:student-1:question-1");
  assert.equal(database.gamification_events?.[0]?.source, "mistake-review");
  assert.equal(database.gamification_events?.[0]?.label_en, "Reviewed a Fractions mistake");
});

test("visualization completion reward helper awards each exact module/topic once", () => {
  const database = createDatabase();

  assert.equal(
    awardVisualizationCompletionReward(database, {
      userId: "student-1",
      moduleId: "function-graph",
      topicId: "topic-functions",
      topic: {
        id: "topic-functions",
        title_en: "Function graphs",
        title_zh: "函數圖像"
      },
      completedAt: "2026-06-20T12:00:00.000Z"
    }, () => "visualization-id"),
    true
  );
  assert.equal(
    awardVisualizationCompletionReward(database, {
      userId: "student-1",
      moduleId: "function-graph",
      topicId: "topic-functions",
      topic: {
        id: "topic-functions",
        title_en: "Function graphs",
        title_zh: "函數圖像"
      },
      completedAt: "2026-06-20T12:05:00.000Z"
    }, () => "duplicate-visualization-id"),
    false
  );
  assert.equal(database.reward_point_ledger.length, 1);
  assert.equal(database.reward_point_ledger[0].id, "reward-ledger-visualization-id");
  assert.equal(database.reward_point_ledger[0].amount, 20);
  assert.equal(database.reward_point_ledger[0].reason, "visualization-complete");
  assert.equal(
    database.reward_point_ledger[0].source_key,
    visualizationCompletionRewardSourceKey("student-1", "function-graph", "topic-functions")
  );
  assert.equal(database.gamification_events?.[0]?.source, "visualization-complete");

  assert.equal(
    awardVisualizationCompletionReward(database, {
      userId: "student-1",
      moduleId: "function-graph",
      topicId: "topic-linear-functions",
      topic: {
        id: "topic-linear-functions",
        title_en: "Linear functions",
        title_zh: "線性函數"
      },
      completedAt: "2026-06-20T12:10:00.000Z"
    }, () => "visualization-second-topic-id"),
    true,
    "the shared configured module must award each distinct topic exactly once"
  );
  assert.equal(database.reward_point_ledger.length, 2);
  assert.ok(
    database.reward_point_ledger.some(
      (entry) => entry.source_key === visualizationCompletionRewardSourceKey(
        "student-1",
        "function-graph",
        "topic-linear-functions"
      )
    )
  );
  assert.ok(
    database.gamification_events?.some(
      (entry) => entry.label_en === "Explored the Function graphs visualization"
    )
  );
});

test("visualization reward keys preserve tuple boundaries without truncation or whitespace collisions", () => {
  const longPrefix = "m".repeat(255);
  const firstModule = `${longPrefix}a`;
  const secondModule = `${longPrefix}b`;
  const firstKey = visualizationCompletionRewardSourceKey("student-1", firstModule, "topic");
  const secondKey = visualizationCompletionRewardSourceKey("student-1", secondModule, "topic");

  assert.match(firstKey, /^visualization-complete:v2:[a-f0-9]{64}$/);
  assert.match(secondKey, /^visualization-complete:v2:[a-f0-9]{64}$/);
  assert.notEqual(firstKey, secondKey);
  assert.notEqual(
    visualizationCompletionRewardSourceKey("student-1", "a:b", "c"),
    visualizationCompletionRewardSourceKey("student-1", "a", "b:c")
  );
  assert.notEqual(
    visualizationCompletionRewardSourceKey("student-1", "a b", "topic"),
    visualizationCompletionRewardSourceKey("student-1", "a-b", "topic")
  );

  const database = createDatabase();
  assert.equal(awardVisualizationCompletionReward(database, {
    userId: "student-1",
    moduleId: firstModule,
    topicId: "topic",
    completedAt: awardedAt
  }, () => "first-long-tuple"), true);
  assert.equal(awardVisualizationCompletionReward(database, {
    userId: "student-1",
    moduleId: secondModule,
    topicId: "topic",
    completedAt: awardedAt
  }, () => "second-long-tuple"), true);
  assert.deepEqual(
    new Set(database.reward_point_ledger.map((entry) => entry.source_key)),
    new Set([firstKey, secondKey])
  );
});

test("v2 visualization reward keys do not re-award an exact legacy tuple during migration", () => {
  const database = createDatabase();
  database.reward_point_ledger.push({
    id: "legacy-visualization-reward",
    student_id: "student-1",
    amount: 20,
    reason: "visualization-complete",
    label_en: "Legacy visualization reward",
    label_zh: "舊視覺化獎勵",
    source_key: "visualization-complete:student-1:function-graph",
    created_at: "2026-06-19T12:00:00.000Z"
  });

  assert.equal(awardVisualizationCompletionReward(database, {
    userId: "student-1",
    moduleId: "function-graph",
    topicId: "topic-functions",
    completedAt: awardedAt
  }, () => "must-not-reward-again"), false);
  assert.equal(database.reward_point_ledger.length, 1);
  assert.equal(database.gamification_events?.length, 0);
});

test("lesson completion reward helper awards one lesson completion reward", () => {
  const database = createDatabase();

  assert.equal(
    awardLessonCompletionReward(database, {
      userId: "student-1",
      lesson: {
        slug: "linear-equations",
        title_en: "Linear equations",
        title_zh: "一次方程"
      },
      completedAt: "2026-06-20T12:00:00.000Z"
    }, () => "lesson-id"),
    true
  );
  assert.equal(
    awardLessonCompletionReward(database, {
      userId: "student-1",
      lesson: {
        slug: "linear-equations",
        title_en: "Linear equations",
        title_zh: "一次方程"
      },
      completedAt: "2026-06-20T12:05:00.000Z"
    }, () => "duplicate-lesson-id"),
    false
  );
  assert.equal(database.reward_point_ledger.length, 1);
  assert.equal(database.reward_point_ledger[0].id, "reward-ledger-lesson-id");
  assert.equal(database.reward_point_ledger[0].amount, 40);
  assert.equal(database.reward_point_ledger[0].reason, "lesson-complete");
  assert.equal(database.reward_point_ledger[0].source_key, "lesson-complete:student-1:linear-equations");
  assert.equal(database.gamification_events?.[0]?.source, "lesson-complete");
  assert.equal(database.gamification_events?.[0]?.label_en, "Completed Linear equations");
});

test("legacy userStore consumes extracted automatic reward helper", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.doesNotMatch(source, /awardAutomaticRewardOnce/);
  assert.doesNotMatch(source, /function rewardEarnRuleFor/);
  assert.doesNotMatch(source, /function awardAutomaticRewardOnce/);
  assert.doesNotMatch(source, /function learningStreakDays/);
  assert.doesNotMatch(source, /function maybeAwardLearningStreakReward/);
  assert.doesNotMatch(source, /function maybeAwardPracticeAccuracyReward/);
  assert.doesNotMatch(source, /afterMarkMistakeMastered:[\s\S]*?reason: "mistake-review"/);
  assert.doesNotMatch(source, /afterMarkVisualizationSession:[\s\S]*?reason: "visualization-complete"/);
  assert.doesNotMatch(source, /function updateLessonProgressInDatabase[\s\S]*?reason: "lesson-complete"/);
});
