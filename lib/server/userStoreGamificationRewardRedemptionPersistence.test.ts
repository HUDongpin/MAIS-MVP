import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createGamificationRewardRedemptionPersistenceStore,
  rewardSummaryForStudent,
  teacherRewardDashboardSummary,
  type GamificationRewardRedemptionPersistenceDatabase
} from "@/lib/server/userStore/gamificationRewardRedemptionPersistence";

const generatedAt = "2026-06-20T12:00:00.000Z";

function createDatabase(): GamificationRewardRedemptionPersistenceDatabase {
  return {
    reward_catalog: [
      {
        id: "calm-card",
        name_en: "Calm card",
        name_zh: "靜心卡",
        description_en: "A small reflection card.",
        description_zh: "小小反思卡。",
        category: "learning-tool",
        points_cost: 30,
        available: true,
        accent: "from-violet-300 via-fuchsia-300 to-rose-300",
        thumbnail_label: "C",
        sort_order: 0
      },
      {
        id: "pencil-pack",
        name_en: "Pencil pack",
        name_zh: "鉛筆套裝",
        description_en: "A study stationery pack.",
        description_zh: "學習文具套裝。",
        category: "stationery",
        points_cost: 70,
        available: true,
        accent: "from-sky-300 via-cyan-300 to-emerald-300",
        thumbnail_label: "✎",
        sort_order: 1
      },
      {
        id: "retired-toy",
        name_en: "Retired toy",
        name_zh: "已下架玩具",
        description_en: "No longer available.",
        description_zh: "已不再供應。",
        category: "toy",
        points_cost: 20,
        available: false,
        accent: "from-slate-300 via-slate-400 to-slate-500",
        thumbnail_label: "?",
        sort_order: 2
      }
    ],
    reward_point_ledger: [
      {
        id: "ledger-teacher",
        student_id: "student-1",
        amount: 15,
        reason: "teacher-award",
        label_en: "Teacher award",
        label_zh: "教師獎勵",
        note: "Great explanation",
        awarded_by: "teacher-1",
        redemption_id: "redemption-pending",
        source_key: "award-1",
        created_at: "2026-06-19T15:00:00.000Z"
      },
      {
        id: "ledger-earned",
        student_id: "student-1",
        amount: 120,
        reason: "lesson-complete",
        label_en: "Lesson complete",
        label_zh: "完成課節",
        created_at: "2026-06-19T12:00:00.000Z"
      },
      {
        id: "ledger-spent",
        student_id: "student-1",
        amount: -10,
        reason: "redemption-spent",
        label_en: "Spent",
        label_zh: "已使用",
        created_at: "2026-06-19T13:00:00.000Z"
      },
      {
        id: "ledger-other",
        student_id: "student-2",
        amount: 60,
        reason: "lesson-complete",
        label_en: "Other",
        label_zh: "其他",
        created_at: "2026-06-19T12:00:00.000Z"
      }
    ],
    reward_redemptions: [
      {
        id: "redemption-pending",
        student_id: "student-1",
        item_id: "retired-toy",
        points_cost: 25,
        status: "pending",
        requested_at: "2026-06-19T14:00:00.000Z",
        decided_at: null,
        fulfilled_at: null
      },
      {
        id: "redemption-missing-catalog",
        student_id: "student-1",
        item_id: "missing-prize",
        points_cost: 5,
        status: "fulfilled",
        requested_at: "2026-06-18T14:00:00.000Z",
        decided_at: "2026-06-18T15:00:00.000Z",
        fulfilled_at: "2026-06-18T16:00:00.000Z",
        decided_by: "teacher-1",
        teacher_note: "Handled manually"
      }
    ],
    gamification_events: [],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-a",
        student_id: "student-1",
        joined_at: "2026-06-01T00:00:00.000Z"
      },
      {
        id: "enrollment-2",
        class_id: "class-a",
        student_id: "student-2",
        joined_at: "2026-06-01T00:00:00.000Z"
      },
      {
        id: "enrollment-3",
        class_id: "class-b",
        student_id: "student-3",
        joined_at: "2026-06-01T00:00:00.000Z"
      }
    ],
    school_memberships: [
      {
        id: "membership-teacher-1",
        school_id: "school-1",
        user_id: "teacher-1",
        role: "teacher",
        class_id: "class-a",
        created_at: "2026-06-01T00:00:00.000Z"
      }
    ],
    teacher_classes: [
      {
        id: "class-a",
        teacher_id: "teacher-1",
        school_id: "school-1",
        class_code: "S3A",
        name: "S3 Algebra",
        grade: "S3",
        academic_year: "2026",
        description_en: "Algebra class",
        description_zh: "代數班",
        invite_code: "S3A-2026",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z"
      },
      {
        id: "class-b",
        teacher_id: "teacher-2",
        school_id: "school-1",
        class_code: "S3B",
        name: "S3 Geometry",
        grade: "S3",
        academic_year: "2026",
        description_en: "Geometry class",
        description_zh: "幾何班",
        invite_code: "S3B-2026",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z"
      }
    ],
    users: [
      { id: "student-1", username: "student-one", role: "student" },
      { id: "student-2", username: "student-two", role: "student" },
      { id: "student-3", username: "student-three", role: "student" },
      { id: "teacher-1", username: "teacher-one", role: "teacher" },
      { id: "teacher-2", username: "teacher-two", role: "teacher" },
      { id: "admin-1", username: "admin-one", role: "admin" }
    ],
    student_profiles: [
      { user_id: "student-1", name: "Ada Student" },
      { user_id: "student-2", name: "Ben Student" },
      { user_id: "student-3", name: "Cara Student" },
      { user_id: "teacher-1", name: "Teacher One" },
      { user_id: "teacher-2", name: "Teacher Two" },
      { user_id: "admin-1", name: "Admin One" }
    ]
  };
}

function createTestStore(database = createDatabase()) {
  return createGamificationRewardRedemptionPersistenceStore({
    createId: () => "reward-redemption-created",
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date(generatedAt),
    readDatabase: async () => database
  });
}

test("gamification rewards data builds student read model without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationRewardRedemptionPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const data = await createTestStore().getStudentRewardsData("student-1");

  assert.equal(data?.summary.balance, 125);
  assert.equal(data?.summary.reserved, 25);
  assert.equal(data?.summary.available, 100);
  assert.equal(data?.summary.lifetimeEarned, 135);
  assert.equal(data?.summary.spent, 10);
  assert.deepEqual(data?.catalog.map((item) => item.id), ["calm-card", "pencil-pack", "retired-toy"]);
  assert.deepEqual(data?.ledger.map((entry) => entry.id), ["ledger-teacher", "ledger-spent", "ledger-earned"]);
  assert.equal(data?.ledger[0].studentName, "Ada Student");
  assert.equal(data?.ledger[0].awardedByName, "Teacher One");
  assert.deepEqual(data?.redemptions.map((redemption) => redemption.id), [
    "redemption-pending",
    "redemption-missing-catalog"
  ]);
  assert.equal(data?.redemptions[1].item.name.en, "Unknown reward");
  assert.equal(data?.redemptions[1].decidedByName, "Teacher One");
});

test("gamification rewards data returns null for non-students", async () => {
  const store = createTestStore();

  assert.equal(await store.getStudentRewardsData("teacher-1"), null);
  assert.equal(await store.getStudentRewardsData("missing-student"), null);
});

test("gamification teacher rewards data builds class-scoped read model", async () => {
  const data = await createTestStore().getTeacherRewardsData("teacher-1");

  assert.equal(data?.generatedAt, generatedAt);
  assert.equal(data?.totals.students, 2);
  assert.equal(data?.totals.availablePoints, 160);
  assert.equal(data?.totals.pendingRedemptions, 1);
  assert.equal(data?.totals.approvedRedemptions, 0);
  assert.equal(data?.totals.fulfilledRedemptions, 1);
  assert.equal(data?.totals.pointsAwardedThisWeek, 195);
  assert.deepEqual(data?.reasonPresets.map((preset) => preset.id), [
    "great-effort",
    "helping-classmates",
    "improved-accuracy",
    "completed-challenge"
  ]);
  assert.deepEqual(data?.students.map((student) => student.studentId), ["student-1", "student-2"]);
  assert.deepEqual(data?.students[0].classNames, ["S3 Algebra"]);
  assert.deepEqual(data?.catalog.map((item) => item.id), ["calm-card", "pencil-pack", "retired-toy"]);
  assert.deepEqual(data?.redemptions.map((redemption) => redemption.id), [
    "redemption-pending",
    "redemption-missing-catalog"
  ]);
  assert.deepEqual(data?.recentLedger.map((entry) => entry.id), [
    "ledger-teacher",
    "ledger-spent",
    "ledger-earned",
    "ledger-other"
  ]);
});

test("gamification teacher rewards data rejects non-teacher areas", async () => {
  const store = createTestStore();

  assert.equal(await store.getTeacherRewardsData("student-1"), null);
  assert.equal(await store.getTeacherRewardsData("missing-teacher"), null);
});

test("gamification reward summary helpers are reusable by compatibility callers", async () => {
  const database = createDatabase();
  const teacher = database.users.find((user) => user.id === "teacher-1");

  assert.ok(teacher);
  assert.deepEqual(rewardSummaryForStudent(database, "student-1"), {
    balance: 125,
    available: 100,
    reserved: 25,
    lifetimeEarned: 135,
    spent: 10,
    pendingRequests: 1,
    approvedRequests: 0
  });
  assert.deepEqual(teacherRewardDashboardSummary(database, teacher, new Date(generatedAt).getTime()), {
    pendingRedemptions: 1,
    approvedRedemptions: 0,
    pointsAwardedThisWeek: 195,
    topStudentName: "Ada Student",
    topStudentAvailablePoints: 100
  });
});

test("gamification reward redemption creates pending requests without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationRewardRedemptionPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const result = await createTestStore(database).requestRewardRedemption({
    studentId: "student-1",
    itemId: "pencil-pack"
  });

  assert.equal(result.status, "created");
  assert.equal(database.reward_redemptions[0].id, "reward-redemption-created");
  assert.equal(database.reward_redemptions[0].student_id, "student-1");
  assert.equal(database.reward_redemptions[0].item_id, "pencil-pack");
  assert.equal(database.reward_redemptions[0].points_cost, 70);
  assert.equal(database.reward_redemptions[0].status, "pending");
  assert.equal(database.reward_redemptions[0].requested_at, generatedAt);
  assert.equal(database.reward_redemptions[0].decided_at, null);
  assert.equal(database.reward_redemptions[0].fulfilled_at, null);
  assert.equal(result.rewards.summary.pendingRequests, 2);
  assert.equal(result.rewards.summary.available, 30);
});

test("gamification reward redemption rejects unavailable requests without mutating", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  assert.equal((await store.requestRewardRedemption({
    studentId: "missing-student",
    itemId: "pencil-pack"
  })).status, "student-not-found");
  assert.equal((await store.requestRewardRedemption({
    studentId: "teacher-1",
    itemId: "pencil-pack"
  })).status, "student-not-found");
  assert.equal((await store.requestRewardRedemption({
    studentId: "student-1",
    itemId: "missing-item"
  })).status, "item-unavailable");
  assert.equal((await store.requestRewardRedemption({
    studentId: "student-1",
    itemId: "retired-toy"
  })).status, "item-unavailable");
  assert.equal(database.reward_redemptions.length, 2);
});

test("gamification reward redemption returns rewards when points are insufficient", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).requestRewardRedemption({
    studentId: "student-2",
    itemId: "pencil-pack"
  });

  assert.equal(result.status, "insufficient-points");
  assert.equal(database.reward_redemptions.length, 2);
  assert.equal(result.rewards.summary.available, 60);
});

test("gamification teacher reward awards create governed event and ledger rows", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).awardTeacherRewardPoints({
    teacherId: "teacher-1",
    studentId: "student-2",
    amount: 25.4,
    reasonPresetId: "great-effort",
    note: "  Strong   peer explanation  "
  });

  assert.equal(result.status, "awarded");
  const [event] = database.gamification_events ?? [];
  assert.ok(event);
  assert.equal(event.student_id, "student-2");
  assert.equal(event.source, "teacher-award");
  assert.equal(event.reward_points, 25);
  assert.equal(event.status, "awarded");
  assert.deepEqual(event.anti_abuse_flags, []);
  assert.equal(database.reward_point_ledger[0].student_id, "student-2");
  assert.equal(database.reward_point_ledger[0].amount, 25);
  assert.equal(database.reward_point_ledger[0].reason, "teacher-award");
  assert.equal(database.reward_point_ledger[0].label_en, "Teacher bonus: Great effort");
  assert.equal(database.reward_point_ledger[0].label_zh, "教師獎勵：努力學習");
  assert.equal(database.reward_point_ledger[0].note, "Strong peer explanation");
  assert.equal(database.reward_point_ledger[0].awarded_by, "teacher-1");
  assert.equal(database.reward_point_ledger[0].source_key, event.source_key);
  assert.equal(result.rewards.totals.availablePoints, 185);
});

test("gamification teacher reward awards reject invalid or out-of-class requests", async () => {
  const store = createTestStore();

  assert.equal((await store.awardTeacherRewardPoints({
    teacherId: "student-1",
    studentId: "student-2",
    amount: 25,
    reasonPresetId: "great-effort"
  })).status, "forbidden");
  assert.equal((await store.awardTeacherRewardPoints({
    teacherId: "teacher-1",
    studentId: "student-3",
    amount: 25,
    reasonPresetId: "great-effort"
  })).status, "student-not-found");
  assert.equal((await store.awardTeacherRewardPoints({
    teacherId: "teacher-1",
    studentId: "student-2",
    amount: 0,
    reasonPresetId: "great-effort"
  })).status, "invalid");
});

test("gamification teacher reward redemptions approve and fulfill requests", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const approval = await store.updateTeacherRewardRedemption({
    teacherId: "teacher-1",
    requestId: "redemption-pending",
    status: "approved",
    teacherNote: "  Approved   after class  "
  });

  assert.equal(approval.status, "updated");
  assert.equal(database.reward_redemptions[0].status, "approved");
  assert.equal(database.reward_redemptions[0].decided_at, generatedAt);
  assert.equal(database.reward_redemptions[0].decided_by, "teacher-1");
  assert.equal(database.reward_redemptions[0].teacher_note, "Approved after class");
  assert.equal(
    database.reward_point_ledger.some((entry) => entry.redemption_id === "redemption-pending" && entry.reason === "redemption-spent"),
    false
  );

  const fulfillment = await store.updateTeacherRewardRedemption({
    teacherId: "teacher-1",
    requestId: "redemption-pending",
    status: "fulfilled",
    teacherNote: "Collected"
  });

  assert.equal(fulfillment.status, "updated");
  assert.equal(database.reward_redemptions[0].status, "fulfilled");
  assert.equal(database.reward_redemptions[0].fulfilled_at, generatedAt);
  assert.equal(database.reward_redemptions[0].teacher_note, "Collected");
  assert.equal(database.reward_point_ledger[0].student_id, "student-1");
  assert.equal(database.reward_point_ledger[0].amount, -25);
  assert.equal(database.reward_point_ledger[0].reason, "redemption-spent");
  assert.equal(database.reward_point_ledger[0].label_en, "Redeemed Retired toy");
  assert.equal(database.reward_point_ledger[0].label_zh, "兌換已下架玩具");
  assert.equal(database.reward_point_ledger[0].redemption_id, "redemption-pending");
  assert.equal(database.reward_point_ledger[0].awarded_by, "teacher-1");
  assert.equal(fulfillment.rewards.totals.fulfilledRedemptions, 2);
});

test("gamification teacher reward redemptions reject invalid transitions", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  assert.equal((await store.updateTeacherRewardRedemption({
    teacherId: "teacher-1",
    requestId: "redemption-pending",
    status: "fulfilled"
  })).status, "invalid-transition");
  assert.equal((await store.updateTeacherRewardRedemption({
    teacherId: "teacher-1",
    requestId: "redemption-pending",
    status: "pending"
  })).status, "invalid");
  assert.equal((await store.updateTeacherRewardRedemption({
    teacherId: "teacher-2",
    requestId: "redemption-pending",
    status: "approved"
  })).status, "not-found");
  assert.equal(database.reward_redemptions[0].status, "pending");
});

test("legacy userStore delegates reward redemption through gamification domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const requestRewardRedemption = gamificationUserStore\.requestRewardRedemption/);
  assert.match(source, /export const getStudentRewardsData = gamificationUserStore\.getStudentRewardsData/);
  assert.match(source, /export const getTeacherRewardsData = gamificationUserStore\.getTeacherRewardsData/);
  assert.match(source, /export const awardTeacherRewardPoints = gamificationUserStore\.awardTeacherRewardPoints/);
  assert.match(source, /export const updateTeacherRewardRedemption = gamificationUserStore\.updateTeacherRewardRedemption/);
  assert.doesNotMatch(source, /function buildStudentRewardsData/);
  assert.doesNotMatch(source, /function getTeacherRewardsDataFromDatabase/);
  assert.doesNotMatch(source, /function rewardSummaryForStudent/);
  assert.doesNotMatch(source, /function teacherRewardDashboardSummary/);
  assert.doesNotMatch(source, /function teacherRewardStudentIds/);
  assert.doesNotMatch(source, /function teacherCanAccessRewardStudent/);
  assert.doesNotMatch(source, /export async function requestRewardRedemption/);
  assert.doesNotMatch(source, /export async function getStudentRewardsData/);
  assert.doesNotMatch(source, /export async function getTeacherRewardsData/);
  assert.doesNotMatch(source, /export async function awardTeacherRewardPoints/);
  assert.doesNotMatch(source, /export async function updateTeacherRewardRedemption/);
});

test("gamification reward redemption persistence owns display name helpers", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/gamificationRewardRedemptionPersistence.ts"),
    "utf8"
  );

  assert.match(persistenceSource, /function studentNameFor\(/);
  assert.match(persistenceSource, /function teacherNameFor\(/);
  assert.equal(rootSource.includes("function studentNameFor("), false);
  assert.equal(rootSource.includes("function teacherNameFor("), false);
});
