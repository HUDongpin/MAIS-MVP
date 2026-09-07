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
  type GamificationRewardRedemptionPersistenceDatabase
} from "@/lib/server/userStore/gamificationRewardRedemptionPersistence";
import { __userStoreLessonCompletionRewardTestHooks } from "@/lib/server/userStore";

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

test("visualization completion reward helper awards one module completion reward", () => {
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
  assert.equal(database.reward_point_ledger[0].source_key, "visualization-complete:student-1:function-graph");
  assert.equal(database.gamification_events?.[0]?.source, "visualization-complete");
  assert.equal(database.gamification_events?.[0]?.label_en, "Explored the Function graphs visualization");
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

type AdaptiveLessonDatabase = Parameters<
  typeof __userStoreLessonCompletionRewardTestHooks.updateLessonProgressFromAdaptiveState
>[0];

function createPracticeCompletionDatabase({
  withLessonRecord = true,
  questions = [] as { id: string; topic_id: string }[],
  attempts = [] as { id: string; user_id: string; question_id: string; is_correct: boolean; created_at: string }[]
} = {}): AdaptiveLessonDatabase {
  const database = {
    ...createDatabase(),
    topics: [
      {
        id: "topic-linear",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Linear equations",
        title_zh: "一次方程",
        description_en: "Linear equations topic",
        description_zh: "一次方程主題",
        difficulty: "Medium",
        minutes: 30,
        sort_order: 1
      }
    ],
    lessons: withLessonRecord
      ? [
          {
            slug: "topic-linear",
            topic_id: "topic-linear",
            grade: "S3",
            title_en: "Linear equations lesson",
            title_zh: "一次方程課節",
            description_en: "",
            description_zh: "",
            difficulty: "Medium",
            estimated_minutes: 30
          }
        ]
      : [],
    lesson_progress: [],
    adaptive_skill_state: [],
    questions,
    attempts
  };
  return database as unknown as AdaptiveLessonDatabase;
}

function setAdaptiveMastery(database: AdaptiveLessonDatabase, pMastery: number) {
  database.adaptive_skill_state = ["foundation", "fluency", "transfer"].map((stage) => ({
    user_id: "student-1",
    skill_id: `topic-linear:${stage}`,
    p_mastery: pMastery,
    attempt_count: 6,
    correct_streak: 3,
    wrong_streak: 0,
    last_practiced_at: awardedAt,
    next_review_at: null,
    hint_count: 0,
    misconception_tags: [],
    updated_at: awardedAt
  })) as AdaptiveLessonDatabase["adaptive_skill_state"];
}

test("adaptive mastery completion awards the lesson completion reward once", () => {
  const { updateLessonProgressFromAdaptiveState } = __userStoreLessonCompletionRewardTestHooks;
  const database = createPracticeCompletionDatabase();

  setAdaptiveMastery(database, 0.7);
  updateLessonProgressFromAdaptiveState(database, "student-1", "topic-linear", awardedAt);
  assert.equal(database.lesson_progress[0]?.status, "in-progress");
  assert.equal(database.reward_point_ledger.length, 0);

  setAdaptiveMastery(database, 0.9);
  updateLessonProgressFromAdaptiveState(database, "student-1", "topic-linear", awardedAt);
  assert.equal(database.lesson_progress[0]?.status, "completed");
  assert.equal(database.reward_point_ledger.length, 1);
  assert.equal(database.reward_point_ledger[0].amount, 40);
  assert.equal(database.reward_point_ledger[0].reason, "lesson-complete");
  assert.equal(database.reward_point_ledger[0].source_key, "lesson-complete:student-1:topic-linear");
  assert.equal(database.gamification_events?.length, 1);
  assert.equal(database.gamification_events?.[0]?.source, "lesson-complete");
  assert.equal(database.gamification_events?.[0]?.label_en, "Completed Linear equations lesson");

  updateLessonProgressFromAdaptiveState(database, "student-1", "topic-linear", awardedAt);
  assert.equal(database.reward_point_ledger.length, 1);

  setAdaptiveMastery(database, 0.5);
  updateLessonProgressFromAdaptiveState(database, "student-1", "topic-linear", awardedAt);
  assert.equal(database.lesson_progress[0]?.status, "in-progress");
  setAdaptiveMastery(database, 0.95);
  updateLessonProgressFromAdaptiveState(database, "student-1", "topic-linear", awardedAt);
  assert.equal(database.lesson_progress[0]?.status, "completed");
  assert.equal(database.reward_point_ledger.length, 1);
});

test("attempt-accuracy completion awards the reward with topic-title fallback", () => {
  const { updateLessonProgressFromAttempts } = __userStoreLessonCompletionRewardTestHooks;
  const database = createPracticeCompletionDatabase({
    withLessonRecord: false,
    questions: [{ id: "question-1", topic_id: "topic-linear" }],
    attempts: Array.from({ length: 5 }, (_, index) => ({
      id: `attempt-${index}`,
      user_id: "student-1",
      question_id: "question-1",
      is_correct: true,
      created_at: awardedAt
    }))
  });

  updateLessonProgressFromAttempts(
    database,
    "student-1",
    { id: "question-1", topic_id: "topic-linear" } as Parameters<
      typeof __userStoreLessonCompletionRewardTestHooks.updateLessonProgressFromAttempts
    >[2],
    awardedAt
  );

  assert.equal(database.lesson_progress[0]?.status, "completed");
  assert.equal(database.reward_point_ledger.length, 1);
  assert.equal(database.reward_point_ledger[0].reason, "lesson-complete");
  assert.equal(database.reward_point_ledger[0].source_key, "lesson-complete:student-1:topic-linear");
  assert.equal(database.gamification_events?.[0]?.label_en, "Completed Linear equations");

  updateLessonProgressFromAttempts(
    database,
    "student-1",
    { id: "question-1", topic_id: "topic-linear" } as Parameters<
      typeof __userStoreLessonCompletionRewardTestHooks.updateLessonProgressFromAttempts
    >[2],
    awardedAt
  );
  assert.equal(database.reward_point_ledger.length, 1);
});

test("legacy and practice completion share one ledger identity in either order", () => {
  for (const legacyFirst of [true, false]) {
    const database = createPracticeCompletionDatabase();
    const legacyCompletion = () => awardLessonCompletionReward(database, {
      userId: "student-1", lesson: database.lessons[0], completedAt: awardedAt
    });
    if (legacyFirst) legacyCompletion();
    setAdaptiveMastery(database, 0.9);
    __userStoreLessonCompletionRewardTestHooks.updateLessonProgressFromAdaptiveState(
      database, "student-1", "topic-linear", awardedAt
    );
    if (!legacyFirst) legacyCompletion();
    assert.equal(database.reward_point_ledger.length, 1);
    assert.equal(database.reward_point_ledger[0].amount, 40);
    assert.equal(database.reward_point_ledger[0].source_key, "lesson-complete:student-1:topic-linear");
    assert.equal(database.gamification_events?.length, 1);
  }
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
