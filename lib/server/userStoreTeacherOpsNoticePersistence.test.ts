import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsNoticePersistenceStore,
  type TeacherOpsNoticePersistenceStoreDependencies,
  type TeacherOpsNoticePersistenceDatabase
} from "@/lib/server/userStore/teacherOpsNoticePersistence";
import type { TeacherNotice, TeacherNoticeDeliveryAttempt, TeacherNoticeRecipient } from "@/types";

const fixedNow = "2026-06-21T10:00:00.000Z";

function createDatabase(): TeacherOpsNoticePersistenceDatabase {
  return {
    assignments: [
      { id: "assignment-owned", class_id: "class-owned" },
      { id: "assignment-other", class_id: "class-other" }
    ],
    class_enrollments: [
      { id: "enrollment-1", class_id: "class-owned", student_id: "student-1", joined_at: fixedNow },
      { id: "enrollment-2", class_id: "class-owned", student_id: "student-2", joined_at: fixedNow }
    ],
    guardian_links: [
      { id: "guardian-link-1", parent_id: "parent-1", student_id: "student-1", status: "active" },
      { id: "guardian-link-2", parent_id: "parent-2", student_id: "student-2", status: "revoked" }
    ],
    school_memberships: [],
    teacher_class_collaborators: [
      { id: "collaborator-co", class_id: "class-owned", teacher_id: "teacher-2", role: "co-teacher", status: "active" },
      { id: "collaborator-viewer", class_id: "class-owned", teacher_id: "teacher-3", role: "viewer", status: "active" }
    ],
    teacher_classes: [
      { id: "class-owned", teacher_id: "teacher-1", name: "S3A" },
      { id: "class-other", teacher_id: "teacher-4", name: "S4B" }
    ],
    teacher_notice_delivery_attempts: [],
    teacher_notice_recipients: [],
    teacher_notices: [
      {
        id: "notice-existing",
        teacher_id: "teacher-1",
        class_id: "class-owned",
        audience: "students",
        channel_id: "channel-class",
        channel_name: "Class group",
        subject_en: "Existing",
        subject_zh: "Existing",
        body_en: "Existing body",
        body_zh: "Existing body",
        status: "draft",
        due_at: null,
        created_at: "2026-06-20T12:00:00.000Z",
        updated_at: "2026-06-20T12:00:00.000Z",
        sent_at: null
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "teacher-3", role: "teacher" },
      { id: "teacher-4", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" },
      { id: "parent-1", role: "parent" }
    ]
  };
}

function projectNotice(database: TeacherOpsNoticePersistenceDatabase, noticeId: string): TeacherNotice {
  const notice = database.teacher_notices.find((candidate) => candidate.id === noticeId);
  assert.ok(notice);
  const recipients = database.teacher_notice_recipients
    .filter((recipient) => recipient.notice_id === notice.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((recipient) => ({
      id: recipient.id,
      noticeId: recipient.notice_id,
      studentId: recipient.student_id,
      studentName: recipient.student_id,
      guardianId: recipient.guardian_id,
      guardianName: recipient.guardian_id,
      status: recipient.status,
      acknowledgedBy: recipient.acknowledged_by,
      acknowledgedAt: recipient.acknowledged_at,
      createdAt: recipient.created_at
    }));
  const deliveryAttempts = database.teacher_notice_delivery_attempts
    .filter((attempt) => attempt.notice_id === notice.id)
    .sort((a, b) => b.attempted_at.localeCompare(a.attempted_at))
    .map((attempt) => ({
      id: attempt.id,
      noticeId: attempt.notice_id,
      channelId: attempt.channel_id,
      channelName: attempt.channel_name,
      status: attempt.status,
      providerMessageId: attempt.provider_message_id,
      errorCode: attempt.error_code,
      errorMessage: attempt.error_message,
      attemptedAt: attempt.attempted_at
    }));
  const acknowledged = recipients.filter((recipient) => recipient.status === "acknowledged").length;

  return {
    id: notice.id,
    teacherId: notice.teacher_id,
    classId: notice.class_id,
    className: database.teacher_classes.find((teacherClass) => teacherClass.id === notice.class_id)?.name ?? notice.class_id,
    audience: notice.audience,
    channelId: notice.channel_id,
    channelName: notice.channel_name,
    subject: { en: notice.subject_en, zh: notice.subject_zh },
    body: { en: notice.body_en, zh: notice.body_zh },
    status: notice.status,
    assignmentId: notice.assignment_id,
    dueAt: notice.due_at,
    createdAt: notice.created_at,
    updatedAt: notice.updated_at,
    sentAt: notice.sent_at,
    recipients,
    deliveryAttempts,
    acknowledgement: {
      total: recipients.length,
      acknowledged,
      pending: recipients.length - acknowledged
    }
  };
}

function createTestStore(
  database: TeacherOpsNoticePersistenceDatabase,
  {
    queueResult = { status: "queued" as const, queued: 1, reused: 0, recovered: 0, skipped: 0 }
  }: {
    queueResult?:
      | { status: "queued"; queued: number; reused: number; recovered: number; skipped: number }
      | { status: "no-eligible"; skipped: number };
  } = {}
) {
  let idCounter = 0;
  const queued: Array<{ teacherId: string; noticeId: string; idempotencyKey: string }> = [];
  const notifications: Array<{ channelId: string; markdown: string }> = [];
  const dependencies: TeacherOpsNoticePersistenceStoreDependencies = {
    createId: () => `generated-${++idCounter}`,
    getNotificationSummary: () => ({
      channels: [
        { id: "channel-class", name: "Class group" },
        { id: "channel-backup", name: "Backup group" }
      ]
    }),
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date(fixedNow),
    readDatabase: async () => database,
    queueNoticeEmail: async (input) => {
      queued.push(input);
      return queueResult;
    },
    sendNotification: async (input: { channelId: string; markdown: string }) => {
      notifications.push(input);
      return { status: "sent" as const, providerMessageId: "wecom-provider-1" };
    },
    toNotice: (sourceDatabase, notice) => projectNotice(sourceDatabase, notice.id)
  };
  const store = createTeacherOpsNoticePersistenceStore(dependencies);
  return { notifications, queued, store };
}

test("teacher ops notice persistence owns source-kind validation helpers instead of root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsNoticePersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsNoticePersistence.ts"), "utf8");

  const isValidTeacherNoticeSourceKind = helpers.isValidTeacherNoticeSourceKind;
  const normalizeTeacherNoticeSourceKind = helpers.normalizeTeacherNoticeSourceKind;

  for (const [name, helper] of Object.entries({
    isValidTeacherNoticeSourceKind,
    normalizeTeacherNoticeSourceKind
  })) {
    assert.equal(typeof helper, "function", `${name} should be exported by teacherOpsNoticePersistence`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
    assert.match(rootSource, new RegExp(`${name} as ${name}FromTeacherOpsNotice`));
  }

  assert.doesNotMatch(rootSource, /const validTeacherNoticeSourceKinds\b/);
  assert.equal((isValidTeacherNoticeSourceKind as (sourceKind: unknown) => boolean)("teacher-review-lesson"), true);
  assert.equal((isValidTeacherNoticeSourceKind as (sourceKind: unknown) => boolean)("review-lesson"), false);
  assert.equal((normalizeTeacherNoticeSourceKind as (sourceKind: unknown) => string | undefined)("assignment-reminder"), "assignment-reminder");
  assert.equal((normalizeTeacherNoticeSourceKind as (sourceKind: unknown) => string | undefined)("review-lesson"), undefined);
});

test("teacher ops notice persistence owns notice record normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsNoticePersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsNoticePersistence.ts"), "utf8");
  const normalizeNotice = helpers.normalizeTeacherOpsNoticeRecord as ((
    notice: {
      id: string;
      assignment_id?: string;
      source_kind?: unknown;
      source_id?: unknown;
    },
    dependencies: {
      deletedAssignmentIds: ReadonlySet<string>;
    }
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeNotice, "function");
  assert.match(helperSource, /export function normalizeTeacherOpsNoticeRecord\b/);
  assert.match(rootSource, /normalizeTeacherOpsNoticeRecord as normalizeTeacherNoticeRecordFromTeacherOpsNotice/);
  assert.doesNotMatch(rootSource, /teacher_notices: \(database\.teacher_notices \?\? \[\]\)\.map\(\(notice\): TeacherNoticeRecord => \(\{/);
  assert.doesNotMatch(rootSource, /source_id: typeof notice\.source_id === "string" && notice\.source_id\.trim\(\)/);

  const deletedAssignmentIds = new Set(["assignment-deleted"]);

  assert.deepEqual(normalizeNotice?.({
    id: "notice-invalid",
    assignment_id: "assignment-deleted",
    source_kind: "review-lesson",
    source_id: "   "
  }, { deletedAssignmentIds }), {
    id: "notice-invalid",
    assignment_id: undefined,
    source_kind: undefined,
    source_id: undefined
  });

  assert.deepEqual(normalizeNotice?.({
    id: "notice-valid",
    assignment_id: "assignment-keep",
    source_kind: "assignment-reminder",
    source_id: "  review-1  "
  }, { deletedAssignmentIds }), {
    id: "notice-valid",
    assignment_id: "assignment-keep",
    source_kind: "assignment-reminder",
    source_id: "review-1"
  });
});

test("teacher ops notice persistence owns notice composition helpers used by reminder integration", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsNoticePersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsNoticePersistence.ts"), "utf8");

  for (const name of [
    "teacherOpsNoticeRecipientRecordsForClass",
    "teacherOpsNoticeAckLink",
    "buildTeacherOpsNoticeMarkdown",
    "createTeacherOpsNoticeRecord",
    "sendTeacherOpsNoticeRecord"
  ]) {
    assert.equal(typeof helpers[name], "function", `${name} should be exported by teacherOpsNoticePersistence`);
    assert.match(helperSource, new RegExp(`export (async )?function ${name}\\b`));
  }

  assert.match(rootSource, /createTeacherOpsNoticeRecord as createNoticeRecordFromTeacherOpsNotice/);
  assert.doesNotMatch(rootSource, /sendTeacherOpsNoticeRecord as sendNoticeRecordFromTeacherOpsNotice/);
  assert.doesNotMatch(rootSource, /function noticeRecipientRecordsForClass\b/);
  assert.doesNotMatch(rootSource, /function noticeAckLink\b/);
  assert.doesNotMatch(rootSource, /function buildWeComNoticeMarkdown\b/);
  assert.doesNotMatch(rootSource, /function createNoticeRecord\b/);
  assert.doesNotMatch(rootSource, /async function sendNoticeRecord\b/);

  const ackLink = helpers.teacherOpsNoticeAckLink as (origin: string | undefined, recipientId: string) => string;
  assert.equal(
    ackLink("https://mais.example/", "recipient A&B"),
    "https://mais.example/parent/notices?recipientId=recipient%20A%26B"
  );

  const database = createDatabase();
  database.teacher_notice_recipients.push({
    id: "notice-recipient-ack",
    notice_id: "notice-existing",
    student_id: "student-1",
    guardian_id: "parent-1",
    status: "pending",
    acknowledged_at: null,
    created_at: fixedNow
  });
  const buildMarkdown = helpers.buildTeacherOpsNoticeMarkdown as (input: {
    database: TeacherOpsNoticePersistenceDatabase;
    notice: TeacherOpsNoticePersistenceDatabase["teacher_notices"][number];
    origin?: string;
  }) => string;
  const markdown = buildMarkdown({ database, notice: database.teacher_notices[0], origin: "https://mais.example/" });
  assert.match(markdown, /## Existing/);
  assert.match(markdown, /班級 \/ Class: S3A/);
  assert.match(markdown, /https:\/\/mais\.example\/parent\/notices\?recipientId=notice-recipient-ack/);
});

test("teacher ops notice persistence owns notice projection helpers for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsNoticePersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsNoticePersistence.ts"), "utf8");

  for (const name of [
    "toTeacherOpsNoticeRecipient",
    "toTeacherOpsNoticeDeliveryAttempt",
    "toTeacherOpsNotice"
  ]) {
    assert.equal(typeof helpers[name], "function", `${name} should be exported by teacherOpsNoticePersistence`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
  }

  const database = createDatabase();
  database.teacher_notice_recipients.push(
    {
      id: "recipient-student",
      notice_id: "notice-existing",
      student_id: "student-1",
      status: "acknowledged",
      acknowledged_by: "parent-1",
      acknowledged_at: "2026-06-21T11:00:00.000Z",
      created_at: "2026-06-21T10:30:00.000Z"
    },
    {
      id: "recipient-guardian",
      notice_id: "notice-existing",
      student_id: "student-2",
      guardian_id: "parent-1",
      status: "pending",
      acknowledged_at: null,
      created_at: "2026-06-21T10:31:00.000Z"
    }
  );
  database.teacher_notice_delivery_attempts.push({
    id: "attempt-1",
    notice_id: "notice-existing",
    channel_id: "channel-class",
    channel_name: "Class group",
    status: "failed",
    provider_message_id: "provider-1",
    error_code: "rate-limited",
    error_message: "Slow down",
    attempted_at: "2026-06-21T11:10:00.000Z"
  });
  const toTeacherOpsNoticeRecipient = helpers.toTeacherOpsNoticeRecipient as (
    database: TeacherOpsNoticePersistenceDatabase,
    record: TeacherOpsNoticePersistenceDatabase["teacher_notice_recipients"][number]
  ) => TeacherNoticeRecipient;
  const toTeacherOpsNoticeDeliveryAttempt = helpers.toTeacherOpsNoticeDeliveryAttempt as (
    record: TeacherOpsNoticePersistenceDatabase["teacher_notice_delivery_attempts"][number]
  ) => TeacherNoticeDeliveryAttempt;
  const toTeacherOpsNotice = helpers.toTeacherOpsNotice as (
    database: TeacherOpsNoticePersistenceDatabase,
    record: TeacherOpsNoticePersistenceDatabase["teacher_notices"][number]
  ) => TeacherNotice;

  assert.deepEqual(toTeacherOpsNoticeRecipient(database, database.teacher_notice_recipients[0]), {
    id: "recipient-student",
    noticeId: "notice-existing",
    studentId: "student-1",
    studentName: "Unknown student",
    guardianId: undefined,
    guardianName: undefined,
    status: "acknowledged",
    acknowledgedBy: "parent-1",
    acknowledgedAt: "2026-06-21T11:00:00.000Z",
    createdAt: "2026-06-21T10:30:00.000Z"
  });
  assert.deepEqual(toTeacherOpsNoticeDeliveryAttempt(database.teacher_notice_delivery_attempts[0]), {
    id: "attempt-1",
    noticeId: "notice-existing",
    channelId: "channel-class",
    channelName: "Class group",
    status: "failed",
    providerMessageId: "provider-1",
    errorCode: "rate-limited",
    errorMessage: "Slow down",
    attemptedAt: "2026-06-21T11:10:00.000Z"
  });
  assert.deepEqual(toTeacherOpsNotice(database, database.teacher_notices[0]), {
    id: "notice-existing",
    teacherId: "teacher-1",
    classId: "class-owned",
    className: "S3A",
    audience: "students",
    channelId: "channel-class",
    channelName: "Class group",
    subject: {
      en: "Existing",
      zh: "Existing"
    },
    body: {
      en: "Existing body",
      zh: "Existing body"
    },
    status: "draft",
    assignmentId: undefined,
    source: undefined,
    dueAt: null,
    createdAt: "2026-06-20T12:00:00.000Z",
    updatedAt: "2026-06-20T12:00:00.000Z",
    sentAt: null,
    recipients: [
      {
        id: "recipient-student",
        noticeId: "notice-existing",
        studentId: "student-1",
        studentName: "Unknown student",
        guardianId: undefined,
        guardianName: undefined,
        status: "acknowledged",
        acknowledgedBy: "parent-1",
        acknowledgedAt: "2026-06-21T11:00:00.000Z",
        createdAt: "2026-06-21T10:30:00.000Z"
      },
      {
        id: "recipient-guardian",
        noticeId: "notice-existing",
        studentId: "student-2",
        studentName: "Unknown student",
        guardianId: "parent-1",
        guardianName: undefined,
        status: "pending",
        acknowledgedBy: undefined,
        acknowledgedAt: null,
        createdAt: "2026-06-21T10:31:00.000Z"
      }
    ],
    deliveryAttempts: [
      {
        id: "attempt-1",
        noticeId: "notice-existing",
        channelId: "channel-class",
        channelName: "Class group",
        status: "failed",
        providerMessageId: "provider-1",
        errorCode: "rate-limited",
        errorMessage: "Slow down",
        attemptedAt: "2026-06-21T11:10:00.000Z"
      }
    ],
    acknowledgement: {
      total: 2,
      acknowledged: 1,
      pending: 1
    }
  });
  assert.doesNotMatch(rootSource, /function toTeacherNoticeRecipient\(/);
  assert.doesNotMatch(rootSource, /function toTeacherNoticeDeliveryAttempt\(/);
  assert.doesNotMatch(rootSource, /function toTeacherNotice\(/);
  assert.match(rootSource, /toTeacherOpsNotice as toTeacherNoticeFromTeacherOpsNotice/);
  assert.doesNotMatch(rootSource, /toTeacherOpsNoticeDeliveryAttempt as toTeacherNoticeDeliveryAttemptFromTeacherOpsNotice/);
});

test("teacher ops notice persistence creates notices and recipients without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsNoticePersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const { store } = createTestStore(database);
  const result = await store.createTeacherNotice({
    teacherId: "teacher-2",
    classId: "class-owned",
    channelId: "channel-class",
    audience: "parents",
    subject: "  Homework reminder  ",
    body: "  Please sign the worksheet.  ",
    assignmentId: "assignment-owned",
    dueAt: "2026-06-22T10:00:00.000Z"
  });

  assert.equal(result.status, "created");
  assert.equal(result.status === "created" ? result.notice.id : null, "notice-generated-1");
  assert.equal(database.teacher_notices[0].teacher_id, "teacher-2");
  assert.equal(database.teacher_notices[0].subject_en, "Homework reminder");
  assert.equal(database.teacher_notices[0].body_en, "Please sign the worksheet.");
  assert.equal(database.teacher_notices[0].assignment_id, "assignment-owned");
  assert.deepEqual(database.teacher_notice_recipients.map((recipient) => ({
    id: recipient.id,
    studentId: recipient.student_id,
    guardianId: recipient.guardian_id
  })), [
    { id: "notice-recipient-generated-2", studentId: "student-1", guardianId: "parent-1" },
    { id: "notice-recipient-generated-3", studentId: "student-2", guardianId: undefined }
  ]);
  assert.deepEqual(result.status === "created" ? result.notice.acknowledgement : null, {
    total: 2,
    acknowledged: 0,
    pending: 2
  });
});

test("teacher ops notice persistence rejects invalid or unavailable creation requests", async () => {
  const { store } = createTestStore(createDatabase());

  assert.deepEqual(await store.createTeacherNotice({ teacherId: "teacher-1", classId: "class-owned", audience: "parents", subject: "", body: "Body" }), { status: "invalid" });
  assert.deepEqual(await store.createTeacherNotice({ teacherId: "teacher-1", classId: "class-owned", audience: "families" as never, subject: "Subject", body: "Body" }), { status: "invalid" });
  assert.deepEqual(await store.createTeacherNotice({ teacherId: "student-1", classId: "class-owned", audience: "parents", subject: "Subject", body: "Body" }), { status: "forbidden" });
  assert.deepEqual(await store.createTeacherNotice({ teacherId: "teacher-3", classId: "class-owned", audience: "parents", subject: "Subject", body: "Body" }), { status: "not-found" });
  assert.deepEqual(await store.createTeacherNotice({ teacherId: "teacher-1", classId: "class-owned", audience: "parents", subject: "Subject", body: "Body", assignmentId: "assignment-other" }), { status: "assignment-not-found" });
});

test("teacher ops notice persistence preserves the WeCom read model and adds durable email status", async () => {
  const database = createDatabase();
  const { notifications, queued, store } = createTestStore(database);
  const result = await store.sendTeacherNotice({
    teacherId: "teacher-1",
    noticeId: "notice-existing",
    idempotencyKey: "teacher-send-request-0001"
  });

  assert.equal(result.status, "sent");
  assert.deepEqual(result.status === "sent" ? result.email : null, {
    status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0
  });
  assert.equal(result.status === "sent" ? result.notice.id : null, "notice-existing");
  assert.equal(result.status === "sent" ? result.attempt.status : null, "sent");
  assert.deepEqual(queued, [{
    teacherId: "teacher-1",
    noticeId: "notice-existing",
    idempotencyKey: "teacher-send-request-0001"
  }]);
  assert.equal(notifications.length, 1);
  assert.equal(database.teacher_notice_delivery_attempts.length, 1);
  assert.equal(database.teacher_notices[0].sent_at, fixedNow);
});

test("student notices preserve one idempotent WeCom attempt while email remains no-eligible", async () => {
  const database = createDatabase();
  const { notifications, queued, store } = createTestStore(database, {
    queueResult: { status: "no-eligible", skipped: 1 }
  });
  const request = {
    teacherId: "teacher-1",
    noticeId: "notice-existing",
    idempotencyKey: "teacher-send-student-0001"
  };

  const first = await store.sendTeacherNotice(request);
  const replay = await store.sendTeacherNotice(request);

  assert.equal(first.status, "sent");
  assert.deepEqual(replay, first, "a lost successful response must replay the same notice and attempt");
  assert.equal(notifications.length, 1, "request retry must never duplicate the WeCom provider side effect");
  assert.equal(database.teacher_notice_delivery_attempts.length, 1);
  assert.equal(database.teacher_notice_delivery_attempts[0]?.status, "sent");
  assert.match(database.teacher_notice_delivery_attempts[0]?.request_idempotency_key_hash ?? "", /^[a-f0-9]{64}$/u);
  assert.match(database.teacher_notice_delivery_attempts[0]?.request_idempotency_request_hash ?? "", /^[a-f0-9]{64}$/u);
  assert.equal(database.teacher_notice_delivery_attempts[0]?.queued_by_id, "teacher-1");
  assert.equal(database.teacher_notice_delivery_attempts[0]?.provider_contact_started_at, fixedNow);
  assert.deepEqual(first.status === "sent" ? first.email : null, { status: "no-eligible", skipped: 1 });
  assert.equal(queued.length, 2, "email replay may re-attest the same durable row without duplicate delivery");
});

test("one notice-send idempotency key cannot contact WeCom for a conflicting notice", async () => {
  const database = createDatabase();
  database.teacher_notices.push({
    ...database.teacher_notices[0]!,
    id: "notice-conflicting",
    subject_en: "Conflicting",
    subject_zh: "Conflicting"
  });
  const { notifications, store } = createTestStore(database);
  const idempotencyKey = "teacher-send-conflict-0001";

  assert.equal((await store.sendTeacherNotice({
    teacherId: "teacher-1",
    noticeId: "notice-existing",
    idempotencyKey
  })).status, "sent");
  assert.deepEqual(await store.sendTeacherNotice({
    teacherId: "teacher-1",
    noticeId: "notice-conflicting",
    idempotencyKey
  }), { status: "conflict" });
  assert.equal(notifications.length, 1);
});

test("teacher notice send fails before persistence when its idempotency key is invalid", async () => {
  const database = createDatabase();
  const { queued, store } = createTestStore(database);
  assert.deepEqual(await store.sendTeacherNotice({
    teacherId: "teacher-1",
    noticeId: "notice-existing",
    idempotencyKey: "short"
  }), { status: "invalid" });
  assert.deepEqual(queued, []);
});

test("legacy userStore delegates teacher notice operations to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const createTeacherNotice = teacherOpsUserStore\.createTeacherNotice/);
  assert.match(source, /export const sendTeacherNotice = teacherOpsUserStore\.sendTeacherNotice/);
  assert.doesNotMatch(source, /export async function createTeacherNotice/);
  assert.doesNotMatch(source, /export async function sendTeacherNotice/);
});
