import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsReminderPersistenceStore,
  selectTeacherOpsReminderBatch,
  teacherOpsMissingWorkItemsForClasses,
  type TeacherOpsReminderPersistenceStoreDependencies,
  type TeacherOpsReminderPersistenceDatabase,
  type TeacherOpsReminderRunRecord
} from "@/lib/server/userStore/teacherOpsReminderPersistence";

test("reminder cursor uses one code-unit ordering for mixed-case and punctuation IDs", () => {
  const prefixes = ["A", "a", "Z", "z", "_", "-", "0", "~"];
  const items = Array.from({ length: 213 }, (_, index) => ({
    assignmentId: `assignment-${prefixes[index % prefixes.length]}-${String(index).padStart(3, "0")}`,
    studentId: `student-${prefixes[(index * 3) % prefixes.length]}-${String(212 - index).padStart(3, "0")}`
  }));
  const cursorFor = (item: { assignmentId: string; studentId: string }) =>
    `${item.assignmentId}\u0000${item.studentId}`;
  const expected = [...items]
    .sort((left, right) => cursorFor(left) < cursorFor(right) ? -1 : cursorFor(left) > cursorFor(right) ? 1 : 0)
    .map(cursorFor);
  const actual: string[] = [];
  let cursor: string | null = null;

  do {
    const page: {
      items: Array<{ assignmentId: string; studentId: string }>;
      nextCursor: string | null;
    } = selectTeacherOpsReminderBatch({
      items,
      cursor,
      limit: 37,
      isEligible: () => true
    });
    actual.push(...page.items.map(cursorFor));
    cursor = page.nextCursor;
  } while (cursor);

  assert.equal(actual.length, 213);
  assert.equal(new Set(actual).size, 213);
  assert.deepEqual(actual, expected);
});

function createDatabase(): TeacherOpsReminderPersistenceDatabase {
  return {
    assignments: [
      {
        id: "assignment-1",
        class_id: "class-owned",
        title_en: "Assignment 1",
        title_zh: "Assignment 1",
        due_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "assignment-2",
        class_id: "class-owned",
        title_en: "Assignment 2",
        title_zh: "Assignment 2",
        due_at: "2026-06-22T08:00:00.000Z"
      }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        name: "S3A"
      },
      {
        id: "class-other",
        teacher_id: "teacher-other",
        name: "S3B"
      }
    ],
    teacher_reminder_runs: [],
    users: [
      { id: "teacher-1", role: "teacher", username: "Tess" },
      { id: "teacher-other", role: "teacher", username: "Other" },
      { id: "student-1", role: "student", username: "Ada" }
    ]
  };
}

function toRun(record: TeacherOpsReminderRunRecord) {
  return {
    id: record.id,
    teacherId: record.teacher_id,
    classId: record.class_id,
    assignmentId: record.assignment_id,
    studentId: record.student_id,
    noticeId: record.notice_id,
    threshold: record.threshold,
    status: record.status,
    reason: record.reason,
    createdAt: record.created_at
  };
}

function createTestStore(
  database: TeacherOpsReminderPersistenceDatabase,
  {
    simulateNoEligible = false,
    deliverWeCom = false
  }: { simulateNoEligible?: boolean; deliverWeCom?: boolean } = {}
) {
  const noticeCalls: Array<{ assignmentId: string; now: string; studentIds: string[] }> = [];
  const outboxPublications: string[][] = [];
  const wecomRequestKeys: string[] = [];
  const contactedKeys = new Set<string>();
  let wecomProviderCalls = 0;

  const dependencies: TeacherOpsReminderPersistenceStoreDependencies = {
    createId: () => "run-new",
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    mutateDatabaseWithNoticeOutbox: async (_teacherId, mutator) => {
      const mutationDatabase = simulateNoEligible ? structuredClone(database) : database;
      const mutation = await mutator(mutationDatabase);
      outboxPublications.push(mutation.noticeIds);
      if (simulateNoEligible && mutation.noticeIds.length > 0) {
        assert.ok(mutation.noEligibleResult, "reminder mutation must define a no-eligible rollback result");
        return {
          result: mutation.noEligibleResult,
          outbox: { queued: 0, reused: 0, recovered: 0, skipped: mutation.noticeIds.length }
        };
      }
      return {
        result: mutation.result,
        outbox: { queued: mutation.noticeIds.length, reused: 0, recovered: 0, skipped: 0 }
      };
    },
    teacherOperationClassRecordsFor: (db, user) => user.id === "teacher-1" ? db.teacher_classes : [],
    teacherCanMutateOperationsClass: (db, user, classId) =>
      user.id === "teacher-1" && classId === "class-owned"
        ? db.teacher_classes.find((teacherClass) => teacherClass.id === classId) ?? null
        : null,
    missingWorkItemsForClasses: (_db, classes) => classes.some((teacherClass) => teacherClass.id === "class-owned")
      ? [
          {
            assignmentId: "assignment-1",
            assignmentTitle: { en: "Assignment 1", zh: "Assignment 1" },
            classId: "class-owned",
            className: "S3A",
            studentId: "student-1",
            studentName: "Ada",
            submissionId: "missing-assignment-1-student-1",
            submissionStatus: "not-started",
            dueAt: "2026-06-20T08:00:00.000Z",
            nextThreshold: "overdue-24h",
            lastReminderAt: null
          },
          {
            assignmentId: "assignment-2",
            assignmentTitle: { en: "Assignment 2", zh: "Assignment 2" },
            classId: "class-owned",
            className: "S3A",
            studentId: "student-1",
            studentName: "Ada",
            submissionId: "missing-assignment-2-student-1",
            submissionStatus: "not-started",
            dueAt: "2026-06-22T08:00:00.000Z",
            nextThreshold: null,
            lastReminderAt: null
          }
        ]
      : [],
    createNoticeRecord: ({ assignmentId, now, studentIds }) => {
      const notice = { id: `notice-${noticeCalls.length + 1}` };
      noticeCalls.push({ assignmentId, now, studentIds });
      return notice;
    },
    sendNotice: async (input: { teacherId: string; noticeId: string; idempotencyKey: string }) => {
      wecomRequestKeys.push(input.idempotencyKey);
      if (!contactedKeys.has(input.idempotencyKey)) {
        contactedKeys.add(input.idempotencyKey);
        wecomProviderCalls += 1;
      }
      return {
        status: "sent" as const,
        attempt: { status: "sent" as const, attemptedAt: "2026-06-21T08:00:01.000Z" }
      };
    },
    recordDeliveryResult: async ({ runId, status }: { runId: string; status: "queued" | "sent" | "failed" | "disabled" }) => {
      const run = database.teacher_reminder_runs.find((candidate) => candidate.id === runId);
      if (run) run.status = status;
    },
    toTeacherReminderRun: (_db, record) => toRun(record)
  };
  if (!deliverWeCom) {
    delete dependencies.sendNotice;
    delete dependencies.recordDeliveryResult;
  }
  const store = createTeacherOpsReminderPersistenceStore(dependencies);

  return {
    store,
    noticeCalls,
    outboxPublications,
    wecomRequestKeys,
    wecomProviderCalls: () => wecomProviderCalls
  };
}

test("teacher ops reminder persistence runs automatic reminders without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsReminderPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const { store, noticeCalls, outboxPublications } = createTestStore(database);
  const result = await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1"
  });

  assert.equal(result.status, "ran");
  assert.deepEqual(result.runs.map((run) => run.id), ["teacher-reminder-run-run-new"]);
  assert.deepEqual(result.runs[0], {
    id: "teacher-reminder-run-run-new",
    teacherId: "teacher-1",
    classId: "class-owned",
    assignmentId: "assignment-1",
    studentId: "student-1",
    noticeId: "notice-1",
    threshold: "overdue-24h",
    status: "queued",
    reason: "Automatic missing-work threshold overdue-24h queued.",
    createdAt: "2026-06-21T08:00:00.000Z"
  });
  assert.deepEqual(noticeCalls, [{
    assignmentId: "assignment-1",
    now: "2026-06-21T08:00:00.000Z",
    studentIds: ["student-1"]
  }]);
  assert.deepEqual(outboxPublications, [["notice-1"]]);
  assert.equal(database.teacher_reminder_runs[0]?.threshold, "overdue-24h");
});

test("teacher ops reminder persistence skips duplicate automatic runs and supports manual runs", async () => {
  const database = createDatabase();
  database.teacher_reminder_runs.push({
    id: "run-existing",
    teacher_id: "teacher-1",
    class_id: "class-owned",
    assignment_id: "assignment-1",
    student_id: "student-1",
    notice_id: "notice-existing",
    threshold: "overdue-24h",
    status: "sent",
    reason: "Existing",
    created_at: "2026-06-21T07:00:00.000Z"
  });
  const { store, outboxPublications } = createTestStore(database);

  assert.deepEqual(await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1"
  }), { status: "ran", runs: [], nextCursor: null });
  assert.deepEqual(outboxPublications, [[]]);

  const manual = await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1",
    classId: "class-owned",
    assignmentId: "assignment-2",
    manual: true
  });
  assert.equal(manual.status, "ran");
  assert.equal(manual.runs[0]?.threshold, "manual");
  assert.equal(manual.runs[0]?.assignmentId, "assignment-2");
  assert.equal(manual.runs[0]?.reason, "Manual reminder queued by teacher.");
  assert.deepEqual(outboxPublications, [[], ["notice-1"]]);
});

test("reminder request replay returns the original runs and a conflicting payload fails closed", async () => {
  const database = createDatabase();
  const { store, noticeCalls } = createTestStore(database);
  const first = await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1",
    classId: "class-owned",
    idempotencyKey: "teacher-reminder-request-0001"
  });
  const replay = await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1",
    classId: "class-owned",
    idempotencyKey: "teacher-reminder-request-0001"
  });
  const conflict = await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1",
    classId: "class-owned",
    assignmentId: "assignment-2",
    manual: true,
    idempotencyKey: "teacher-reminder-request-0001"
  });

  assert.equal(first.status, "ran");
  assert.deepEqual(replay, first);
  assert.deepEqual(conflict, { status: "conflict" });
  assert.equal(noticeCalls.length, 1);
  assert.match(database.teacher_reminder_runs[0]?.request_idempotency_key_hash ?? "", /^[a-f0-9]{64}$/u);
  assert.match(database.teacher_reminder_runs[0]?.request_idempotency_request_hash ?? "", /^[a-f0-9]{64}$/u);
});

test("automatic and manual reminder retries reuse one derived WeCom attempt per durable run", async () => {
  const database = createDatabase();
  const { store, wecomProviderCalls, wecomRequestKeys } = createTestStore(database, { deliverWeCom: true });
  const automaticRequest = {
    teacherId: "teacher-1",
    idempotencyKey: "automatic-reminder-request-0001"
  };
  const automatic = await store.runTeacherMissingWorkReminders(automaticRequest);
  const automaticReplay = await store.runTeacherMissingWorkReminders(automaticRequest);
  assert.equal(automatic.status, "ran");
  assert.equal(automatic.runs[0]?.status, "sent");
  assert.deepEqual(automaticReplay, automatic);
  assert.equal(wecomProviderCalls(), 1);

  const manualRequest = {
    teacherId: "teacher-1",
    classId: "class-owned",
    assignmentId: "assignment-2",
    manual: true,
    idempotencyKey: "manual-reminder-request-0001"
  };
  const manual = await store.runTeacherMissingWorkReminders(manualRequest);
  const manualReplay = await store.runTeacherMissingWorkReminders(manualRequest);
  assert.equal(manual.status, "ran");
  assert.equal(manual.runs[0]?.status, "sent");
  assert.deepEqual(manualReplay, manual);
  assert.equal(wecomProviderCalls(), 2);
  assert.equal(new Set(wecomRequestKeys).size, 2);
  assert.ok(wecomRequestKeys.every((key) => /^teacher-reminder-wecom\//u.test(key)));
});

test("reminder execution pages past 100 already-processed candidates without starvation", async () => {
  const database = createDatabase();
  database.assignments = Array.from({ length: 205 }, (_, index) => ({
    id: `assignment-${String(index).padStart(3, "0")}`,
    class_id: "class-owned",
    title_en: `Assignment ${index}`,
    title_zh: `Assignment ${index}`,
    due_at: "2026-06-20T08:00:00.000Z"
  }));
  const items = database.assignments.map((assignment) => ({
    assignmentId: assignment.id,
    assignmentTitle: { en: assignment.title_en, zh: assignment.title_zh },
    classId: "class-owned",
    className: "S3A",
    studentId: "student-1",
    studentName: "Ada",
    submissionId: `missing-${assignment.id}`,
    submissionStatus: "not-started" as const,
    dueAt: assignment.due_at,
    nextThreshold: "overdue-24h" as const,
    lastReminderAt: null
  }));
  let id = 0;
  const store = createTeacherOpsReminderPersistenceStore({
    createId: () => `page-${++id}`,
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    mutateDatabaseWithNoticeOutbox: async (_teacherId, mutator) => {
      const mutation = await mutator(database);
      return {
        result: mutation.result,
        outbox: { queued: mutation.noticeIds.length, reused: 0, recovered: 0, skipped: 0 }
      };
    },
    teacherOperationClassRecordsFor: (db) => db.teacher_classes.filter((entry) => entry.id === "class-owned"),
    teacherCanMutateOperationsClass: (db, _user, classId) =>
      db.teacher_classes.find((entry) => entry.id === classId) ?? null,
    missingWorkItemsForClasses: () => items,
    createNoticeRecord: ({ assignmentId }) => ({ id: `notice-${assignmentId}` }),
    toTeacherReminderRun: (_db, record) => toRun(record)
  });

  const first = await store.runTeacherMissingWorkReminders({ teacherId: "teacher-1" });
  assert.equal(first.status, "ran");
  assert.equal(first.runs.length, 100);
  assert.ok(first.nextCursor);
  const second = await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1",
    cursor: first.nextCursor
  });
  assert.equal(second.status, "ran");
  assert.equal(second.runs.length, 100);
  assert.ok(second.nextCursor);
  const third = await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1",
    cursor: second.nextCursor
  });
  assert.equal(third.status, "ran");
  assert.equal(third.runs.length, 5);
  assert.equal(third.nextCursor, null);
  assert.equal(new Set(database.teacher_reminder_runs.map((run) => run.assignment_id)).size, 205);
});

test("teacher ops reminder no-eligible publication returns an explicit skip and leaves no queued run", async () => {
  const database = createDatabase();
  const { store, outboxPublications } = createTestStore(database, { simulateNoEligible: true });

  assert.deepEqual(await store.runTeacherMissingWorkReminders({ teacherId: "teacher-1" }), {
    status: "no-eligible"
  });
  assert.deepEqual(outboxPublications, [["notice-1"]]);
  assert.deepEqual(database.teacher_reminder_runs, [], "the transaction snapshot must not publish a queued run");
});

test("teacher ops reminder persistence rejects forbidden and missing class requests", async () => {
  const { store } = createTestStore(createDatabase());

  assert.deepEqual(await store.runTeacherMissingWorkReminders({
    teacherId: "student-1"
  }), { status: "forbidden" });
  assert.deepEqual(await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1",
    classId: "class-other"
  }), { status: "not-found" });
});

test("teacher ops reminder persistence owns missing-work threshold helper", async () => {
  const reminderExports = await import("@/lib/server/userStore/teacherOpsReminderPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof reminderExports.teacherOpsCurrentMissingWorkThreshold, "function");
  const currentMissingWorkThreshold = reminderExports.teacherOpsCurrentMissingWorkThreshold as (
    assignment: { due_at: string | null },
    nowMs: number
  ) => string | null;
  const nowMs = Date.parse("2026-06-21T08:00:00.000Z");

  assert.equal(currentMissingWorkThreshold({ due_at: null }, nowMs), null);
  assert.equal(currentMissingWorkThreshold({ due_at: "not-a-date" }, nowMs), null);
  assert.equal(currentMissingWorkThreshold({ due_at: "2026-06-22T09:00:00.000Z" }, nowMs), null);
  assert.equal(currentMissingWorkThreshold({ due_at: "2026-06-22T07:59:59.000Z" }, nowMs), "due-24h");
  assert.equal(currentMissingWorkThreshold({ due_at: "2026-06-21T08:00:00.000Z" }, nowMs), "overdue-0h");
  assert.equal(currentMissingWorkThreshold({ due_at: "2026-06-20T08:00:00.000Z" }, nowMs), "overdue-24h");
  assert.equal(currentMissingWorkThreshold({ due_at: "2026-06-18T08:00:00.000Z" }, nowMs), "overdue-72h");

  assert.doesNotMatch(rootSource, /teacherOpsCurrentMissingWorkThreshold as currentMissingWorkThresholdFromTeacherOpsReminder/);
  assert.doesNotMatch(rootSource, /function currentMissingWorkThreshold\b/);
});

test("teacher ops reminder persistence owns missing-work item helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = {
    ...createDatabase(),
    assignments: [
      {
        id: "assignment-complete",
        class_id: "class-owned",
        title_en: "Complete",
        title_zh: "已完成",
        due_at: "2026-06-20T08:00:00.000Z",
        status: "published"
      },
      {
        id: "assignment-sent",
        class_id: "class-owned",
        title_en: "Sent reminder",
        title_zh: "已提醒",
        due_at: "2026-06-20T08:00:00.000Z",
        status: "published"
      },
      {
        id: "assignment-upcoming",
        class_id: "class-owned",
        title_en: "Upcoming",
        title_zh: "即將到期",
        due_at: "2026-06-22T07:59:59.000Z",
        status: "published"
      },
      {
        id: "assignment-draft",
        class_id: "class-owned",
        title_en: "Draft",
        title_zh: "草稿",
        due_at: "2026-06-22T07:59:59.000Z",
        status: "draft"
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-owned",
        student_id: "student-1",
        joined_at: "2026-06-01T08:00:00.000Z"
      }
    ],
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada Profile"
      }
    ],
    submissions: [
      {
        id: "submission-complete",
        assignment_id: "assignment-complete",
        student_id: "student-1",
        status: "submitted",
        score: null,
        submitted_at: "2026-06-20T07:00:00.000Z",
        graded_at: null,
        updated_at: "2026-06-20T07:00:00.000Z"
      }
    ],
    teacher_reminder_runs: [
      {
        id: "run-existing",
        teacher_id: "teacher-1",
        class_id: "class-owned",
        assignment_id: "assignment-sent",
        student_id: "student-1",
        notice_id: "notice-existing",
        threshold: "overdue-24h",
        status: "sent",
        reason: "Existing",
        created_at: "2026-06-21T07:00:00.000Z"
      }
    ]
  } as TeacherOpsReminderPersistenceDatabase;

  const items = teacherOpsMissingWorkItemsForClasses({
    database,
    classes: database.teacher_classes.filter((teacherClass) => teacherClass.id === "class-owned"),
    nowMs: Date.parse("2026-06-21T08:00:00.000Z"),
    isSubmissionComplete: (submission) => submission.status === "submitted"
  });

  assert.deepEqual(items, [
    {
      assignmentId: "assignment-sent",
      assignmentTitle: { en: "Sent reminder", zh: "已提醒" },
      classId: "class-owned",
      className: "S3A",
      studentId: "student-1",
      studentName: "Ada Profile",
      submissionId: "missing-assignment-sent-student-1",
      submissionStatus: "not-started",
      dueAt: "2026-06-20T08:00:00.000Z",
      nextThreshold: null,
      lastReminderAt: "2026-06-21T07:00:00.000Z"
    },
    {
      assignmentId: "assignment-upcoming",
      assignmentTitle: { en: "Upcoming", zh: "即將到期" },
      classId: "class-owned",
      className: "S3A",
      studentId: "student-1",
      studentName: "Ada Profile",
      submissionId: "missing-assignment-upcoming-student-1",
      submissionStatus: "not-started",
      dueAt: "2026-06-22T07:59:59.000Z",
      nextThreshold: "due-24h",
      lastReminderAt: null
    }
  ]);
  assert.match(rootSource, /teacherOpsMissingWorkItemsForClasses as missingWorkItemsForClassesFromTeacherOpsReminder/);
  assert.doesNotMatch(rootSource, /function missingWorkItemsForClasses\b/);
});

test("teacher ops reminder persistence owns reminder-run projection helper", async () => {
  const reminderExports = await import("@/lib/server/userStore/teacherOpsReminderPersistence") as Record<string, unknown>;
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsReminderPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const toTeacherOpsReminderRun = reminderExports.toTeacherOpsReminderRun as (
    database: TeacherOpsReminderPersistenceDatabase,
    record: TeacherOpsReminderRunRecord
  ) => ReturnType<typeof toRun>;
  const record: TeacherOpsReminderRunRecord = {
    id: "run-1",
    teacher_id: "teacher-1",
    class_id: "class-owned",
    assignment_id: "assignment-1",
    student_id: "student-1",
    notice_id: "notice-1",
    threshold: "overdue-24h",
    status: "sent",
    reason: "Automatic missing-work threshold overdue-24h.",
    created_at: "2026-06-21T08:01:00.000Z"
  };

  assert.equal(typeof reminderExports.toTeacherOpsReminderRun, "function");
  assert.match(helperSource, /export function toTeacherOpsReminderRun\b/);
  assert.deepEqual(toTeacherOpsReminderRun(createDatabase(), record), {
    id: "run-1",
    teacherId: "teacher-1",
    classId: "class-owned",
    assignmentId: "assignment-1",
    studentId: "student-1",
    noticeId: "notice-1",
    threshold: "overdue-24h",
    status: "sent",
    reason: "Automatic missing-work threshold overdue-24h.",
    createdAt: "2026-06-21T08:01:00.000Z"
  });
  assert.match(rootSource, /toTeacherOpsReminderRun as toTeacherReminderRunFromTeacherOpsReminder/);
  assert.doesNotMatch(rootSource, /function toTeacherReminderRun\(/);
});

test("legacy userStore delegates missing-work reminders to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const runTeacherMissingWorkReminders = teacherOpsUserStore\.runTeacherMissingWorkReminders/);
  assert.doesNotMatch(source, /export async function runTeacherMissingWorkReminders/);
});
