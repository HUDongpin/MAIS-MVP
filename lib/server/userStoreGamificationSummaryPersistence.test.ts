import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildGamificationSummaryForDatabase,
  createGamificationSummaryPersistenceStore,
  type GamificationSummaryPersistenceDatabase
} from "@/lib/server/userStore/gamificationSummaryPersistence";

const now = new Date("2026-06-20T10:00:00.000Z");

function createTestStore(database: GamificationSummaryPersistenceDatabase) {
  return createGamificationSummaryPersistenceStore({
    now: () => now,
    readDatabase: async () => database
  });
}

function createGamificationDatabase(): GamificationSummaryPersistenceDatabase {
  return {
    users: [
      { id: "student-1", username: "ada", role: "student" },
      { id: "student-2", username: "ben", role: "student" },
      { id: "teacher-1", username: "teacher", role: "teacher" },
      { id: "teacher-2", username: "teacher-two", role: "teacher" },
      { id: "admin-1", username: "admin", role: "admin" }
    ],
    student_profiles: [
      { user_id: "student-1", name: "Ada Chan", grade: "S3" },
      { user_id: "student-2", name: "Ben Lee", grade: "S3" },
      { user_id: "teacher-1", name: "Teacher One", grade: "S3" },
      { user_id: "teacher-2", name: "Teacher Two", grade: "S4" },
      { user_id: "admin-1", name: "Admin One", grade: "S3" }
    ],
    attempts: [
      {
        id: "attempt-today",
        user_id: "student-1",
        question_id: "question-1",
        selected_answer: "A",
        is_correct: true,
        duration_seconds: 30,
        created_at: "2026-06-20T09:00:00.000Z"
      },
      {
        id: "attempt-yesterday",
        user_id: "student-1",
        question_id: "question-2",
        selected_answer: "B",
        is_correct: false,
        duration_seconds: 45,
        created_at: "2026-06-19T09:00:00.000Z"
      }
    ],
    learning_events: [
      {
        id: "learning-1",
        user_id: "student-1",
        type: "mistake-review",
        source: "mistake-book",
        grade: "S3",
        topic_id: "topic-1",
        created_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-1",
        status: "completed",
        mastery: 100,
        completed_at: "2026-06-20T07:00:00.000Z",
        updated_at: "2026-06-20T07:01:00.000Z"
      }
    ],
    visualization_sessions: [
      {
        user_id: "student-1",
        module_id: "coordinate-plane",
        topic_id: "topic-1",
        source: "visualization-lab",
        explored: true,
        completed_at: "2026-06-20T06:00:00.000Z",
        updated_at: "2026-06-20T06:05:00.000Z"
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-1",
        student_id: "student-1",
        joined_at: "2026-06-01T00:00:00.000Z"
      },
      {
        id: "enrollment-2",
        class_id: "class-1",
        student_id: "student-2",
        joined_at: "2026-06-01T00:00:00.000Z"
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        teacher_id: "teacher-1",
        name: "S3 Alpha",
        grade: "S3",
        academic_year: "2025-2026",
        description_en: "",
        description_zh: "",
        invite_code: "S3ALPHA",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z"
      },
      {
        id: "class-2",
        teacher_id: "teacher-2",
        name: "S4 Beta",
        grade: "S4",
        academic_year: "2025-2026",
        description_en: "",
        description_zh: "",
        invite_code: "S4BETA",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-18T00:00:00.000Z"
      }
    ],
    reward_point_ledger: [
      {
        id: "ledger-earned-1",
        student_id: "student-1",
        amount: 30,
        reason: "lesson-complete",
        label_en: "Lesson complete",
        label_zh: "完成課堂",
        created_at: "2026-06-20T09:30:00.000Z"
      },
      {
        id: "ledger-earned-2",
        student_id: "student-1",
        amount: 20,
        reason: "teacher-award",
        label_en: "Teacher award",
        label_zh: "教師獎勵",
        awarded_by: "teacher-1",
        created_at: "2026-06-19T09:30:00.000Z"
      },
      {
        id: "ledger-spent",
        student_id: "student-1",
        amount: -10,
        reason: "redemption-spent",
        label_en: "Redeemed reward",
        label_zh: "兌換獎品",
        redemption_id: "redemption-fulfilled",
        created_at: "2026-06-18T09:30:00.000Z"
      }
    ],
    reward_redemptions: [
      {
        id: "redemption-pending",
        student_id: "student-1",
        item_id: "reward-1",
        points_cost: 15,
        status: "pending",
        requested_at: "2026-06-20T09:35:00.000Z",
        decided_at: null,
        fulfilled_at: null
      },
      {
        id: "redemption-approved",
        student_id: "student-1",
        item_id: "reward-2",
        points_cost: 5,
        status: "approved",
        requested_at: "2026-06-19T09:35:00.000Z",
        decided_at: "2026-06-19T10:00:00.000Z",
        fulfilled_at: null
      },
      {
        id: "redemption-rejected",
        student_id: "student-1",
        item_id: "reward-3",
        points_cost: 99,
        status: "rejected",
        requested_at: "2026-06-18T09:35:00.000Z",
        decided_at: "2026-06-18T10:00:00.000Z",
        fulfilled_at: null
      }
    ],
    gamification_events: [
      {
        id: "event-duplicate",
        student_id: "student-1",
        xp: 999,
        reward_points: 99,
        source: "lesson-complete",
        source_key: "lesson:duplicate",
        label_en: "Duplicate ignored",
        label_zh: "重複訊號",
        status: "duplicate",
        anti_abuse_flags: ["duplicate-source-key"],
        economy_version: "unit",
        created_at: "2026-06-20T09:50:00.000Z"
      },
      {
        id: "event-awarded",
        student_id: "student-1",
        xp: 80,
        reward_points: 10,
        source: "lesson-complete",
        source_key: "lesson:topic-1",
        label_en: "Finished factoring",
        label_zh: "完成因式分解",
        status: "awarded",
        anti_abuse_flags: [],
        economy_version: "unit",
        created_at: "2026-06-20T09:30:00.000Z"
      },
      {
        id: "event-capped",
        student_id: "student-1",
        xp: 20,
        reward_points: 5,
        source: "practice-accuracy",
        source_key: "practice:topic-1",
        label_en: "Strong practice",
        label_zh: "練習良好",
        status: "capped",
        anti_abuse_flags: ["daily-cap-partial"],
        economy_version: "unit",
        created_at: "2026-06-19T09:30:00.000Z"
      },
      {
        id: "event-classmate",
        student_id: "student-2",
        xp: 200,
        reward_points: 25,
        source: "teacher-award",
        source_key: "teacher-award:student-2",
        label_en: "Excellent explanation",
        label_zh: "解釋清晰",
        status: "awarded",
        anti_abuse_flags: [],
        economy_version: "unit",
        created_at: "2026-06-20T09:40:00.000Z"
      }
    ],
    reward_campaigns: [
      {
        id: "campaign-active",
        teacher_id: "teacher-1",
        class_id: "class-1",
        title_en: "Weekly accuracy sprint",
        title_zh: "每週準確率衝刺",
        description_en: "Reward careful practice.",
        description_zh: "獎勵細心練習。",
        status: "active",
        budget_points: 500,
        awarded_points: 120,
        quest_ids: ["answer-correct"],
        starts_at: "2026-06-17T00:00:00.000Z",
        ends_at: "2026-06-24T00:00:00.000Z",
        created_at: "2026-06-17T00:00:00.000Z",
        updated_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "campaign-draft",
        teacher_id: "teacher-1",
        class_id: "class-1",
        title_en: "Draft quest",
        title_zh: "草稿任務",
        description_en: "Upcoming campaign.",
        description_zh: "即將推出。",
        status: "draft",
        budget_points: 300,
        awarded_points: 0,
        quest_ids: ["lesson-complete"],
        starts_at: "2026-06-21T00:00:00.000Z",
        ends_at: "2026-06-28T00:00:00.000Z",
        created_at: "2026-06-18T00:00:00.000Z",
        updated_at: "2026-06-19T08:00:00.000Z"
      },
      {
        id: "campaign-other-class",
        teacher_id: "teacher-2",
        class_id: "class-2",
        title_en: "Other class",
        title_zh: "其他班級",
        description_en: "Hidden from teacher one.",
        description_zh: "不屬於第一位老師。",
        status: "active",
        budget_points: 250,
        awarded_points: 20,
        quest_ids: ["mistake-review"],
        starts_at: "2026-06-17T00:00:00.000Z",
        ends_at: "2026-06-24T00:00:00.000Z",
        created_at: "2026-06-17T00:00:00.000Z",
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ]
  };
}

test("gamification summary persistence builds student summary without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationSummaryPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const store = createTestStore(createGamificationDatabase());
  const summary = await store.getStudentGamificationSummary("student-1");

  assert.ok(summary);
  assert.equal(summary.generatedAt, "2026-06-20T10:00:00.000Z");
  assert.equal(summary.studentId, "student-1");
  assert.equal(summary.xp, 100);
  assert.equal(summary.streakDays, 2);
  assert.equal(summary.recentEvents[0].id, "event-duplicate");
  assert.deepEqual(summary.recentEvents[1].label, {
    en: "Finished factoring",
    zh: "完成因式分解"
  });
  assert.deepEqual(summary.rewardSummary, {
    balance: 40,
    available: 20,
    reserved: 20,
    lifetimeEarned: 50,
    spent: 10,
    pendingRequests: 1,
    approvedRequests: 1
  });
  assert.equal(summary.leaderboard.length, 2);
  assert.equal(summary.leaderboard[0].studentId, "student-2");
  const currentStudent = summary.leaderboard.find((entry) => entry.studentId === "student-1");
  assert.equal(currentStudent?.studentName, "Ada Chan");
  assert.deepEqual(currentStudent?.classNames, ["S3 Alpha"]);
  assert.equal(currentStudent?.isCurrentStudent, true);
  assert.equal(summary.quests.some((quest) => quest.progress > 0), true);
  assert.equal(summary.economy.version.length > 0, true);
});

test("gamification summary persistence uses fast student summary before full database fallback", async () => {
  const database = createGamificationDatabase();
  let fullReadCount = 0;
  const store = createGamificationSummaryPersistenceStore({
    now: () => now,
    getFastStudentGamificationSummary: async (studentId) =>
      buildGamificationSummaryForDatabase(database, studentId, now),
    readDatabase: async () => {
      fullReadCount += 1;
      throw new Error("full database read should not run when fast summary is available");
    }
  });

  const summary = await store.getStudentGamificationSummary("student-1");

  assert.equal(summary?.studentId, "student-1");
  assert.equal(fullReadCount, 0);
});

test("gamification summary persistence falls back when fast student summary is unavailable", async () => {
  const database = createGamificationDatabase();
  let fullReadCount = 0;
  const store = createGamificationSummaryPersistenceStore({
    now: () => now,
    getFastStudentGamificationSummary: async () => undefined,
    readDatabase: async () => {
      fullReadCount += 1;
      return database;
    }
  });

  const summary = await store.getStudentGamificationSummary("student-1");

  assert.equal(summary?.studentId, "student-1");
  assert.equal(fullReadCount, 1);
});

test("gamification summary builder is reusable by compatibility callers", async () => {
  const database = createGamificationDatabase();
  const summary = buildGamificationSummaryForDatabase(database, "student-1", now);

  assert.ok(summary);
  assert.equal(summary.generatedAt, "2026-06-20T10:00:00.000Z");
  assert.equal(summary.studentId, "student-1");
  assert.equal(summary.leaderboard[0]?.studentId, "student-2");

  const userStoreSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.match(userStoreSource, /buildGamificationSummaryForDatabaseFromPersistence/);
  assert.match(userStoreSource, /getStudentGamificationSummaryFromPostgresProjection/);
  assert.match(userStoreSource, /getFastStudentGamificationSummary: getStudentGamificationSummaryFromPostgresProjection/);
  assert.doesNotMatch(userStoreSource, /function buildGamificationSummaryForDatabase/);
  assert.doesNotMatch(userStoreSource, /function gamificationEventsForStudent/);
});

test("gamification summary persistence returns null for non-students", async () => {
  const store = createTestStore(createGamificationDatabase());

  assert.equal(await store.getStudentGamificationSummary("teacher-1"), null);
  assert.equal(await store.getStudentGamificationSummary("missing-student"), null);
});

test("gamification summary persistence builds teacher gamification data without legacy userStore imports", async () => {
  const store = createTestStore(createGamificationDatabase());

  const teacherData = await store.getTeacherGamificationData("teacher-1", "missing-class");

  assert.ok(teacherData);
  assert.equal(teacherData.generatedAt, "2026-06-20T10:00:00.000Z");
  assert.equal(teacherData.selectedClassId, "class-1");
  assert.deepEqual(teacherData.classes.map((teacherClass) => teacherClass.id), ["class-1"]);
  assert.equal(teacherData.classes[0]?.studentCount, 2);
  assert.deepEqual(teacherData.campaigns.map((campaign) => campaign.id), ["campaign-active", "campaign-draft"]);
  assert.equal(teacherData.totals.activeCampaigns, 1);
  assert.equal(teacherData.totals.weeklyXp, 1299);
  assert.equal(teacherData.totals.weeklyRewardPoints, 139);
  assert.equal(teacherData.totals.flaggedEvents, 1);
  assert.equal(teacherData.antiAbuseAlerts[0]?.en, "Ada Chan hit daily-cap-partial.");
  assert.equal(teacherData.leaderboard[0]?.studentId, "student-2");

  const adminData = await store.getTeacherGamificationData("admin-1", "class-2");
  assert.equal(adminData?.selectedClassId, "class-2");
  assert.deepEqual(adminData?.classes.map((teacherClass) => teacherClass.id), ["class-1", "class-2"]);
  assert.deepEqual(adminData?.campaigns.map((campaign) => campaign.id), ["campaign-other-class"]);

  assert.equal(await store.getTeacherGamificationData("student-1"), null);
  assert.equal(await store.getTeacherGamificationData("missing-user"), null);
});

test("legacy userStore delegates gamification summaries through gamification domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /createGamificationSummaryPersistenceStore/);
  assert.match(source, /gamificationSummaryPersistenceStore = createGamificationSummaryPersistenceStore/);
  assert.match(source, /export const getStudentGamificationSummary = gamificationUserStore\.getStudentGamificationSummary/);
  assert.match(source, /export const getTeacherGamificationData = gamificationUserStore\.getTeacherGamificationData/);
  assert.doesNotMatch(source, /export async function getStudentGamificationSummary/);
  assert.doesNotMatch(source, /export async function getTeacherGamificationData/);
});
