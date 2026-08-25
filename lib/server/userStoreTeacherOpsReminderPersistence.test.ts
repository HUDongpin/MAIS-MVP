import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsReminderPersistenceStore,
  teacherOpsMissingWorkItemsForClasses,
  type TeacherOpsReminderPersistenceDatabase,
  type TeacherOpsReminderRunRecord
} from "@/lib/server/userStore/teacherOpsReminderPersistence";

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

function createTestStore(database: TeacherOpsReminderPersistenceDatabase) {
  const noticeCalls: Array<{ assignmentId: string; now: string; studentIds: string[] }> = [];
  const sendCalls: Array<{ noticeId: string; origin?: string }> = [];

  const store = createTeacherOpsReminderPersistenceStore({
    createId: () => "run-new",
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    mutateDatabase: async (mutator) => mutator(database),
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
    sendNoticeRecord: async ({ noticeId, origin }) => {
      sendCalls.push({ noticeId, origin });
      return {
        status: "sent",
        attempted_at: "2026-06-21T08:01:00.000Z"
      };
    },
    toTeacherReminderRun: (_db, record) => toRun(record)
  });

  return { store, noticeCalls, sendCalls };
}

test("teacher ops reminder persistence runs automatic reminders without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsReminderPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const { store, noticeCalls, sendCalls } = createTestStore(database);
  const result = await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1",
    origin: "teacher-console"
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
    status: "sent",
    reason: "Automatic missing-work threshold overdue-24h.",
    createdAt: "2026-06-21T08:01:00.000Z"
  });
  assert.deepEqual(noticeCalls, [{
    assignmentId: "assignment-1",
    now: "2026-06-21T08:00:00.000Z",
    studentIds: ["student-1"]
  }]);
  assert.deepEqual(sendCalls, [{ noticeId: "notice-1", origin: "teacher-console" }]);
  assert.equal(database.teacher_reminder_runs[0]?.threshold, "overdue-24h");
});

test("reminder delivery runs after a durable queued reservation and outside the database mutation", async () => {
  const database = createDatabase();
  let insideMutation = false;
  let mutationCount = 0;
  const store = createTeacherOpsReminderPersistenceStore({
    createId: () => "outside-lock",
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    mutateDatabase: async (mutator) => {
      insideMutation = true;
      mutationCount += 1;
      try {
        const result = mutator(database);
        assert.equal(result instanceof Promise, false, "reminder database mutators must be synchronous");
        return result;
      } finally {
        insideMutation = false;
      }
    },
    teacherOperationClassRecordsFor: (db, user) => user.id === "teacher-1" ? db.teacher_classes : [],
    teacherCanMutateOperationsClass: (db, user, classId) =>
      user.id === "teacher-1" && classId === "class-owned"
        ? db.teacher_classes.find((teacherClass) => teacherClass.id === classId) ?? null
        : null,
    missingWorkItemsForClasses: () => [{
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
    }],
    createNoticeRecord: ({ database: source }) => {
      const notice = { id: "notice-outside-lock" };
      (source as TeacherOpsReminderPersistenceDatabase & { notices?: Array<{ id: string }> }).notices ??= [];
      (source as TeacherOpsReminderPersistenceDatabase & { notices: Array<{ id: string }> }).notices.push(notice);
      return notice;
    },
    sendNoticeRecord: async ({ teacherId, noticeId }) => {
      assert.equal(insideMutation, false, "notification I/O must not hold the database writer lock");
      assert.equal(teacherId, "teacher-1");
      assert.equal(noticeId, "notice-outside-lock");
      assert.equal(database.teacher_reminder_runs[0]?.status, "queued");
      return { status: "sent", attempted_at: "2026-06-21T08:01:00.000Z" };
    },
    toTeacherReminderRun: (_db, record) => toRun(record)
  });

  const result = await store.runTeacherMissingWorkReminders({ teacherId: "teacher-1" });
  assert.equal(result.status, "ran");
  assert.equal(mutationCount, 2);
  assert.equal(database.teacher_reminder_runs[0]?.status, "sent");
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
  const { store, sendCalls } = createTestStore(database);

  assert.deepEqual(await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1"
  }), { status: "ran", runs: [] });
  assert.equal(sendCalls.length, 0);

  const manual = await store.runTeacherMissingWorkReminders({
    teacherId: "teacher-1",
    classId: "class-owned",
    assignmentId: "assignment-2",
    manual: true
  });
  assert.equal(manual.status, "ran");
  assert.equal(manual.runs[0]?.threshold, "manual");
  assert.equal(manual.runs[0]?.assignmentId, "assignment-2");
  assert.equal(manual.runs[0]?.reason, "Manual reminder sent by teacher.");
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
