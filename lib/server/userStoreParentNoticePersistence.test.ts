import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { defaultCurriculumProfile } from "@/lib/curriculumProfile";
import {
  createParentNoticePersistenceStore,
  type ParentNoticePersistenceDatabase
} from "@/lib/server/userStore/parentNoticePersistence";
import type { ParentChildSummary } from "@/types";

const generatedAt = "2026-06-20T11:00:00.000Z";

function childSummary(studentId: string, name: string): ParentChildSummary {
  return {
    student: {
      id: studentId,
      name,
      username: `${studentId}@example.test`,
      avatarId: "delta",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: defaultCurriculumProfile,
      role: "student"
    },
    classes: [],
    generatedAt,
    averageMastery: 72,
    learningMinutes7d: 45,
    latestActivityAt: null,
    weeklyActivity: [],
    strengths: [],
    supportTopics: [],
    assignments: [],
    pendingAssignmentCount: 0,
    rewardSummary: {
      balance: 0,
      available: 0,
      reserved: 0,
      lifetimeEarned: 0,
      spent: 0,
      pendingRequests: 0,
      approvedRequests: 0
    },
    motivationSummary: null,
    latestParentReport: null,
    celebrate: [],
    support: []
  };
}

function createDatabase(): ParentNoticePersistenceDatabase {
  return {
    guardian_links: [
      {
        parent_id: "parent-1",
        student_id: "student-1",
        status: "active"
      },
      {
        parent_id: "parent-1",
        student_id: "student-2",
        status: "active"
      },
      {
        parent_id: "parent-2",
        student_id: "student-1",
        status: "active"
      },
      {
        parent_id: "parent-revoked",
        student_id: "student-3",
        status: "revoked"
      }
    ],
    student_profiles: [
      { user_id: "student-1", name: "Ada Student" },
      { user_id: "student-2", name: "Ben Student" },
      { user_id: "teacher-1", name: "Teacher Chan" }
    ],
    teacher_classes: [
      {
        id: "class-1",
        name: "S3 Algebra"
      }
    ],
    teacher_notice_delivery_attempts: [
      {
        id: "delivery-1",
        notice_id: "notice-1",
        channel_id: "wecom-1",
        channel_name: "WeCom S3",
        status: "sent",
        provider_message_id: "provider-1",
        attempted_at: "2026-06-19T10:05:00.000Z"
      }
    ],
    teacher_notice_recipients: [
      {
        id: "recipient-1",
        notice_id: "notice-1",
        student_id: "student-1",
        guardian_id: "parent-1",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-06-19T10:00:00.000Z"
      },
      {
        id: "recipient-other-parent",
        notice_id: "notice-1",
        student_id: "student-1",
        guardian_id: "parent-2",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-06-19T10:00:00.000Z"
      },
      {
        id: "recipient-2",
        notice_id: "notice-2",
        student_id: "student-2",
        guardian_id: "parent-1",
        status: "acknowledged",
        acknowledged_by: "parent-1",
        acknowledged_at: "2026-06-19T11:00:00.000Z",
        created_at: "2026-06-19T10:10:00.000Z"
      },
      {
        id: "recipient-draft",
        notice_id: "notice-draft",
        student_id: "student-1",
        guardian_id: "parent-1",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-06-19T09:00:00.000Z"
      },
      {
        id: "recipient-revoked",
        notice_id: "notice-1",
        student_id: "student-3",
        guardian_id: "parent-revoked",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-06-19T10:00:00.000Z"
      }
    ],
    teacher_notices: [
      {
        id: "notice-1",
        teacher_id: "teacher-1",
        class_id: "class-1",
        audience: "parents",
        channel_id: "wecom-1",
        channel_name: "WeCom S3",
        subject_en: "Review lesson ready",
        subject_zh: "重溫課已準備",
        body_en: "Please review the algebra summary.",
        body_zh: "請查看代數重溫摘要。",
        status: "sent",
        source_kind: "teacher-review-lesson",
        source_id: "review-1",
        due_at: "2026-06-25T00:00:00.000Z",
        created_at: "2026-06-19T10:00:00.000Z",
        updated_at: "2026-06-19T10:10:00.000Z",
        sent_at: "2026-06-19T10:05:00.000Z"
      },
      {
        id: "notice-2",
        teacher_id: "teacher-1",
        class_id: "class-1",
        audience: "parents",
        channel_id: "wecom-1",
        channel_name: "WeCom S3",
        subject_en: "Practice reminder",
        subject_zh: "練習提醒",
        body_en: "Please finish the graphing practice.",
        body_zh: "請完成圖像練習。",
        status: "queued",
        due_at: null,
        created_at: "2026-06-19T10:10:00.000Z",
        updated_at: "2026-06-19T10:20:00.000Z",
        sent_at: null
      },
      {
        id: "notice-draft",
        teacher_id: "teacher-1",
        class_id: "class-1",
        audience: "parents",
        channel_id: "wecom-1",
        channel_name: "WeCom S3",
        subject_en: "Draft",
        subject_zh: "草稿",
        body_en: "Draft body",
        body_zh: "草稿內容",
        status: "draft",
        due_at: null,
        created_at: "2026-06-19T09:00:00.000Z",
        updated_at: "2026-06-19T09:00:00.000Z",
        sent_at: null
      }
    ],
    teacher_review_lessons: [
      { id: "review-1" }
    ],
    users: [
      { id: "parent-1", username: "Pat Parent", role: "parent" },
      { id: "parent-2", username: "Other Parent", role: "parent" },
      { id: "parent-revoked", username: "Revoked Parent", role: "parent" },
      { id: "admin-1", username: "Support Admin", role: "admin" },
      { id: "teacher-1", username: "Teacher Chan", role: "teacher" },
      { id: "student-1", username: "Ada", role: "student" },
      { id: "student-2", username: "Ben", role: "student" }
    ]
  };
}

function createTestStore(database = createDatabase()) {
  return createParentNoticePersistenceStore({
    now: () => new Date(generatedAt),
    getParentChildSummaries: (_database, user) => {
      if (user.role === "admin") return [childSummary("student-1", "Ada Student"), childSummary("student-2", "Ben Student")];
      return database.guardian_links
        .filter((link) => link.parent_id === user.id && link.status === "active")
        .map((link) => childSummary(link.student_id, link.student_id === "student-1" ? "Ada Student" : "Ben Student"));
    },
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

test("parent notice persistence filters visible notices without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/parentNoticePersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const store = createTestStore();
  const data = await store.getParentNoticeData("parent-1", { selectedStudentId: "student-1" });

  assert.equal(data?.generatedAt, generatedAt);
  assert.deepEqual(data?.children.map((child) => child.student.id), ["student-1", "student-2"]);
  assert.deepEqual(data?.notices.map((notice) => notice.id), ["notice-1"]);
  assert.deepEqual(data?.notices[0].recipients.map((recipient) => recipient.id), ["recipient-1"]);
  assert.deepEqual(data?.notices[0].acknowledgement, { total: 1, acknowledged: 0, pending: 1 });
  assert.equal(data?.notices[0].className, "S3 Algebra");
  assert.equal(data?.notices[0].deliveryAttempts[0].id, "delivery-1");
  assert.deepEqual(data?.parentSafeDrafts.map((draft) => ({
    id: draft.id,
    noticeId: draft.noticeId,
    teacherName: draft.teacherName,
    title: draft.title.en
  })), [{
    id: "parent-safe-draft-notice-1",
    noticeId: "notice-1",
    teacherName: "Teacher Chan",
    title: "Review lesson ready"
  }]);
});

test("parent notice persistence targets a recipient and acknowledges allowed notices", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const targeted = await store.getParentNoticeData("parent-1", { recipientId: "recipient-2" });
  assert.deepEqual(targeted?.notices.map((notice) => notice.id), ["notice-2"]);
  assert.deepEqual(targeted?.notices[0].recipients.map((recipient) => recipient.id), ["recipient-2"]);
  assert.deepEqual(targeted?.notices[0].acknowledgement, { total: 1, acknowledged: 1, pending: 0 });

  const result = await store.acknowledgeParentNotice({ parentId: "parent-1", recipientId: "recipient-1" });
  assert.equal(result.status, "acknowledged");
  assert.equal(database.teacher_notice_recipients[0].status, "acknowledged");
  assert.equal(database.teacher_notice_recipients[0].acknowledged_by, "parent-1");
  assert.equal(database.teacher_notice_recipients[0].acknowledged_at, generatedAt);
  assert.equal(database.teacher_notices[0].updated_at, generatedAt);
  assert.deepEqual(result, {
    status: "acknowledged",
    receipt: {
      recipientId: "recipient-1",
      status: "acknowledged",
      acknowledgedAt: generatedAt
    }
  });
});

test("every explicitly invalid or conflicting notice filter fails closed", async () => {
  const store = createTestStore();
  const invalidFilters = [
    { selectedStudentId: "" },
    { selectedStudentId: "student-does-not-exist" },
    { recipientId: "" },
    { recipientId: "recipient-does-not-exist" },
    { recipientId: "recipient-other-parent" },
    { selectedStudentId: "student-1", recipientId: "recipient-2" }
  ];

  for (const filters of invalidFilters) {
    assert.equal(
      await store.getParentNoticeData("parent-1", filters),
      null,
      `explicit filters ${JSON.stringify(filters)} must not expand to visible notices`
    );
  }

  assert.deepEqual(
    (await store.getParentNoticeData("parent-1"))?.notices.map((notice) => notice.id),
    ["notice-2", "notice-1"],
    "omitting every filter must preserve the all-linked-children view"
  );
});

test("parent notice acknowledgement returns only the current guardian receipt", async () => {
  const store = createTestStore();

  const result = await store.acknowledgeParentNotice({ parentId: "parent-1", recipientId: "recipient-1" });

  assert.deepEqual(result, {
    status: "acknowledged",
    receipt: {
      recipientId: "recipient-1",
      status: "acknowledged",
      acknowledgedAt: generatedAt
    }
  });
});

test("admin cannot write a guardian acknowledgement", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.acknowledgeParentNotice({ parentId: "admin-1", recipientId: "recipient-1" });

  assert.deepEqual(result, { status: "forbidden" });
  assert.equal(database.teacher_notice_recipients[0].status, "pending");
  assert.equal(database.teacher_notice_recipients[0].acknowledged_at, null);
});

test("parent notice persistence hides foreign, revoked and absent recipients behind the same result", async () => {
  const store = createTestStore();

  assert.equal(await store.getParentNoticeData("teacher-1"), null);
  assert.deepEqual(await store.acknowledgeParentNotice({ parentId: "teacher-1", recipientId: "recipient-1" }), { status: "forbidden" });
  assert.deepEqual(await store.acknowledgeParentNotice({ parentId: "parent-1", recipientId: "missing" }), { status: "not-found" });
  assert.deepEqual(await store.acknowledgeParentNotice({ parentId: "parent-2", recipientId: "recipient-1" }), { status: "not-found" });
  assert.deepEqual(await store.acknowledgeParentNotice({ parentId: "parent-revoked", recipientId: "recipient-revoked" }), { status: "not-found" });
});

test("parent notice persistence rejects admin reads", async () => {
  assert.equal(await createTestStore().getParentNoticeData("admin-1"), null);
});

test("parent notice persistence owns parent-safe review lesson draft helpers for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/parentNoticePersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentNoticePersistence.ts"), "utf8");
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof helpers.parentSafeTeacherDraftFromNotice, "function");
  assert.equal(typeof helpers.parentSafeDraftForReviewLesson, "function");
  assert.match(persistenceSource, /export function parentSafeTeacherDraftFromNotice\b/);
  assert.match(persistenceSource, /export function parentSafeDraftForReviewLesson\b/);
  assert.doesNotMatch(compatibilitySource, /function parentSafeTeacherDraftFromNotice\(/);
  assert.doesNotMatch(compatibilitySource, /function parentSafeDraftForReviewLesson\(/);
  assert.match(compatibilitySource, /parentSafeTeacherDraftFromNotice as parentSafeTeacherDraftFromNoticeFromParentNotice/);
  assert.match(compatibilitySource, /parentSafeDraftForReviewLesson as parentSafeDraftForReviewLessonFromParentNotice/);

  const database = createDatabase();
  database.teacher_notices.push({
    id: "notice-review-newer",
    teacher_id: "teacher-1",
    class_id: "class-1",
    audience: "parents",
    channel_id: "wecom-1",
    channel_name: "WeCom S3",
    subject_en: "Updated review lesson",
    subject_zh: "更新重溫課",
    body_en: "Use the newer parent-safe draft.",
    body_zh: "使用較新的家長安全草稿。",
    status: "draft",
    source_kind: "teacher-review-lesson",
    source_id: "review-1",
    due_at: null,
    created_at: "2026-06-19T12:00:00.000Z",
    updated_at: "2026-06-19T12:10:00.000Z",
    sent_at: null
  });

  const parentSafeDraftForReviewLesson = helpers.parentSafeDraftForReviewLesson as (
    database: ParentNoticePersistenceDatabase,
    reviewLessonId: string
  ) => { noticeId: string; teacherName: string; title: { en: string }; publishedAt: string } | null;
  const parentSafeTeacherDraftFromNotice = helpers.parentSafeTeacherDraftFromNotice as (
    database: ParentNoticePersistenceDatabase,
    notice: ParentNoticePersistenceDatabase["teacher_notices"][number]
  ) => { noticeId: string; sourceReviewLessonId: string } | null;

  const latestDraft = parentSafeDraftForReviewLesson(database, "review-1");
  assert.equal(latestDraft?.noticeId, "notice-review-newer");
  assert.equal(latestDraft?.teacherName, "Teacher Chan");
  assert.equal(latestDraft?.title.en, "Updated review lesson");
  assert.equal(latestDraft?.publishedAt, "2026-06-19T12:10:00.000Z");

  assert.equal(parentSafeDraftForReviewLesson(database, "missing-review"), null);
  const directDraft = parentSafeTeacherDraftFromNotice(database, database.teacher_notices[0]);
  assert.equal(directDraft?.noticeId, "notice-1");
  assert.equal(directDraft?.sourceReviewLessonId, "review-1");
  assert.equal(parentSafeTeacherDraftFromNotice(database, database.teacher_notices[1]), null);
});

test("parent notice persistence owns parent-safe review lesson notice copy helper", async () => {
  const helpers = await import("@/lib/server/userStore/parentNoticePersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentNoticePersistence.ts"), "utf8");
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof helpers.parentSafeReviewLessonNoticeCopy, "function");
  assert.match(persistenceSource, /export function parentSafeReviewLessonNoticeCopy\b/);
  assert.doesNotMatch(compatibilitySource, /function parentSafeReviewLessonNoticeCopy\b/);

  const parentSafeReviewLessonNoticeCopy = helpers.parentSafeReviewLessonNoticeCopy as (record: {
    title_en: string;
    title_zh: string;
    source_snapshot: {
      assessmentTitle: {
        en: string;
        zh: string;
        zhHans?: string;
      };
    };
    objectives: Array<{
      en: string;
      zh: string;
      zhHans?: string;
    }>;
    items: Array<{
      category: string;
    }>;
    remediation_questions: Array<{
      validationStatus?: string;
    }>;
  }) => { subject: string; body: string };

  const copy = parentSafeReviewLessonNoticeCopy({
    title_en: "Linear equations review",
    title_zh: "一次方程講評",
    source_snapshot: {
      assessmentTitle: {
        en: "Algebra Quiz 2",
        zh: "代數小測二",
        zhHans: "代数小测二"
      }
    },
    objectives: [
      { en: "Repair equation setup", zh: "修正列式", zhHans: "修正列式" },
      { en: "Check substitution", zh: "檢查代入", zhHans: "检查代入" },
      { en: "", zh: "", zhHans: "" }
    ],
    items: [
      { category: "must-teach" },
      { category: "extension" },
      { category: "must-teach" }
    ],
    remediation_questions: [
      { validationStatus: "validated" },
      { validationStatus: "draft" },
      { validationStatus: "validated" }
    ]
  });

  assert.equal(copy.subject, "Teacher-approved review: Linear equations review / 教師已審核講評：一次方程講評");
  assert.match(copy.body, /The teacher has approved a class-level review lesson for Algebra Quiz 2\./);
  assert.match(copy.body, /Focus: Repair equation setup; Check substitution\./);
  assert.match(copy.body, /2 class discussion focus item\(s\) and 2 reviewed follow-up practice task\(s\)/);
  assert.match(copy.body, /老師已審核 代数小测二 的班級講評方案。/);
  assert.match(copy.body, /重點：修正列式；检查代入。/);
  assert.match(copy.body, /不包含個別學生姓名、排名、錯答名單或教師私人備註/);
});

test("legacy userStore delegates parent notice operations through parent domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getParentNoticeData = parentUserStore\.getParentNoticeData/);
  assert.match(source, /export const acknowledgeParentNotice = parentUserStore\.acknowledgeParentNotice/);
  assert.doesNotMatch(source, /export async function getParentNoticeData/);
  assert.doesNotMatch(source, /export async function acknowledgeParentNotice/);
});

/**
 * `acknowledged_at` is the receipt of record — the evidence of WHEN a guardian confirmed a
 * school notice. Re-acknowledging used to re-stamp it, so a double click, a retry, a refresh
 * or a back-button re-submit silently moved the recorded confirmation time and the original
 * was unrecoverable. Observed live: 10:15:09.443Z -> 10:28:13.439Z on a second POST.
 *
 * These drive a clock that ADVANCES between the two calls, so a re-stamp cannot hide behind a
 * frozen `now()`. Asserting only that the second call returns "acknowledged" is exactly the
 * appearance-level check that let this through — the timestamp is the assertion that matters.
 */
function createClockedStore(database: ParentNoticePersistenceDatabase, clock: { value: string }) {
  return createParentNoticePersistenceStore({
    now: () => new Date(clock.value),
    getParentChildSummaries: (_database, user) => {
      if (user.role === "admin") return [childSummary("student-1", "Ada Student"), childSummary("student-2", "Ben Student")];
      return database.guardian_links
        .filter((link) => link.parent_id === user.id && link.status === "active")
        .map((link) => childSummary(link.student_id, link.student_id === "student-1" ? "Ada Student" : "Ben Student"));
    },
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

test("parent notice acknowledgement is idempotent and never re-stamps the receipt", async () => {
  const database = createDatabase();
  const clock = { value: "2026-06-20T11:00:00.000Z" };
  const store = createClockedStore(database, clock);

  const first = await store.acknowledgeParentNotice({ parentId: "parent-1", recipientId: "recipient-1" });
  assert.equal(first.status, "acknowledged");
  assert.equal(database.teacher_notice_recipients[0].acknowledged_at, "2026-06-20T11:00:00.000Z");
  assert.equal(database.teacher_notices[0].updated_at, "2026-06-20T11:00:00.000Z");

  clock.value = "2026-06-20T23:59:59.000Z";
  const second = await store.acknowledgeParentNotice({ parentId: "parent-1", recipientId: "recipient-1" });

  // Still succeeds, so callers and the UI are unaffected...
  assert.equal(second.status, "acknowledged");
  assert.deepEqual(second, {
    status: "acknowledged",
    receipt: {
      recipientId: "recipient-1",
      status: "acknowledged",
      acknowledgedAt: "2026-06-20T11:00:00.000Z"
    }
  });
  // ...but the receipt of record is untouched.
  assert.equal(
    database.teacher_notice_recipients[0].acknowledged_at,
    "2026-06-20T11:00:00.000Z",
    "a repeat acknowledgement must not move acknowledged_at"
  );
  assert.equal(
    database.teacher_notice_recipients[0].acknowledged_by,
    "parent-1",
    "a repeat acknowledgement must not rewrite who acknowledged"
  );
  assert.equal(
    database.teacher_notices[0].updated_at,
    "2026-06-20T11:00:00.000Z",
    "nothing changed, so the notice must not report a new updated_at"
  );
});

test("the idempotent acknowledgement path still enforces authorization", async () => {
  // Guards the ordering of the fix: the early return must sit AFTER the ownership checks, so a
  // guardian who does not own an already-acknowledged recipient is still refused rather than
  // waved through by the short-circuit.
  const database = createDatabase();
  const clock = { value: "2026-06-20T11:00:00.000Z" };
  const store = createClockedStore(database, clock);

  await store.acknowledgeParentNotice({ parentId: "parent-1", recipientId: "recipient-1" });
  assert.equal(database.teacher_notice_recipients[0].acknowledged_at, "2026-06-20T11:00:00.000Z");

  const stranger = await store.acknowledgeParentNotice({ parentId: "parent-2", recipientId: "recipient-1" });
  assert.equal(stranger.status, "not-found", "an unrelated guardian must not reach the idempotent path or learn that it exists");
  assert.equal(database.teacher_notice_recipients[0].acknowledged_by, "parent-1");
});
