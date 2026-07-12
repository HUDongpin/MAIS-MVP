import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsTermArchivePersistenceStore,
  type TeacherOpsTermArchivePersistenceDatabase
} from "@/lib/server/userStore/teacherOpsTermArchivePersistence";
import type { Assignment, ClassRosterProfile, Submission } from "@/types";

function createDatabase(): TeacherOpsTermArchivePersistenceDatabase {
  return {
    assignments: [
      {
        id: "assignment-1",
        class_id: "class-owned",
        title_en: "Algebra practice",
        title_zh: "Algebra practice",
        updated_at: "2026-06-19T00:00:00.000Z"
      },
      {
        id: "assignment-2",
        class_id: "class-owned",
        title_en: "Geometry practice",
        title_zh: "Geometry practice",
        updated_at: "2026-06-20T00:00:00.000Z"
      },
      {
        id: "assignment-other",
        class_id: "class-other",
        title_en: "Other",
        title_zh: "Other",
        updated_at: "2026-06-20T00:00:00.000Z"
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-owned",
        student_id: "student-1",
        joined_at: "2026-06-18T00:00:00.000Z"
      },
      {
        id: "enrollment-2",
        class_id: "class-owned",
        student_id: "student-2",
        joined_at: "2026-06-19T00:00:00.000Z"
      }
    ],
    school_memberships: [
      {
        user_id: "teacher-membership",
        class_id: "class-owned",
        role: "teacher"
      },
      {
        user_id: "teacher-admin-member",
        class_id: "class-owned",
        role: "admin"
      }
    ],
    submissions: [
      {
        id: "submission-1",
        assignment_id: "assignment-1",
        student_id: "student-1",
        status: "graded",
        updated_at: "2026-06-20T00:00:00.000Z"
      },
      {
        id: "submission-2",
        assignment_id: "assignment-2",
        student_id: "student-2",
        status: "not-started",
        updated_at: "2026-06-20T00:00:00.000Z"
      },
      {
        id: "submission-other",
        assignment_id: "assignment-other",
        student_id: "student-3",
        status: "graded",
        updated_at: "2026-06-20T00:00:00.000Z"
      }
    ],
    teacher_class_collaborators: [
      {
        class_id: "class-owned",
        teacher_id: "teacher-viewer",
        role: "viewer",
        status: "active"
      },
      {
        class_id: "class-owned",
        teacher_id: "teacher-co",
        role: "co-teacher",
        status: "active"
      }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        name: "3A",
        grade: "S3"
      },
      {
        id: "class-other",
        teacher_id: "teacher-other",
        name: "4A",
        grade: "S4"
      }
    ],
    teacher_reports: [
      {
        id: "report-1",
        class_id: "class-owned",
        generated_at: "2026-06-20T00:00:00.000Z"
      }
    ],
    term_archives: [
      {
        id: "archive-existing",
        class_id: "class-owned",
        class_name: "3A",
        term_label: "Spring Term!",
        created_by: "teacher-1",
        created_at: "2026-06-20T00:00:00.000Z",
        snapshot_json: JSON.stringify({
          studentCount: 2,
          assignmentCount: 2,
          submissionCount: 2,
          reportCount: 1,
          averageCompletionRate: 50
        })
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-other", role: "teacher" },
      { id: "teacher-membership", role: "teacher" },
      { id: "teacher-admin-member", role: "teacher" },
      { id: "teacher-viewer", role: "teacher" },
      { id: "teacher-co", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" }
    ]
  };
}

function createTestStore(database: TeacherOpsTermArchivePersistenceDatabase) {
  return createTeacherOpsTermArchivePersistenceStore({
    createId: () => "archive-new",
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    isSubmissionComplete: (submission) => submission.status !== "not-started",
    rosterProfilesForClass: (_database, classId) => [
      {
        enrollmentId: "enrollment-1",
        classId,
        studentId: "student-1",
        studentName: "Ada",
        grade: "S3",
        seatRow: null,
        seatColumn: null,
        displayOrder: 1,
        guardianCount: 1,
        guardianStatus: "linked",
        updatedAt: "2026-06-18T00:00:00.000Z"
      }
    ] satisfies ClassRosterProfile[],
    toAssignment: (_database, assignment) => ({
      id: assignment.id,
      classId: assignment.class_id,
      title: { en: assignment.title_en ?? assignment.id, zh: assignment.title_zh ?? assignment.id },
      description: { en: "", zh: "" },
      contentType: "practice",
      status: "active",
      dueAt: null,
      allowRetake: false,
      showAnswers: true,
      countTowardsGrade: true,
      createdBy: "teacher-1",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: assignment.updated_at,
      submissionCount: database.submissions.filter((submission) => submission.assignment_id === assignment.id).length,
      completedCount: database.submissions.filter((submission) => submission.assignment_id === assignment.id && submission.status !== "not-started").length
    }) satisfies Assignment,
    toSubmission: (_database, submission) => ({
      id: submission.id,
      assignmentId: submission.assignment_id,
      studentId: submission.student_id,
      studentName: submission.student_id,
      status: submission.status as Submission["status"],
      score: null,
      submittedAt: null,
      gradedAt: null,
      feedback: null,
      correctionRequest: null,
      correctionDueAt: null,
      correctionRound: 0,
      maxCorrectionRounds: 2,
      resolvedAt: null,
      attempts: [],
      latestAttempt: null,
      latestGradingRun: null,
      latestTeacherReview: null,
      updatedAt: submission.updated_at
    }) satisfies Submission
  });
}

test("teacher ops term archive persistence owns archive snapshot projection helpers", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsTermArchivePersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsTermArchivePersistence.ts"), "utf8");

  const teacherOpsTermArchiveSnapshot = helpers.teacherOpsTermArchiveSnapshot;
  const toTeacherOpsTermArchive = helpers.toTeacherOpsTermArchive;

  for (const [name, helper] of Object.entries({
    teacherOpsTermArchiveSnapshot,
    toTeacherOpsTermArchive
  })) {
    assert.equal(typeof helper, "function", `${name} should be exported by teacherOpsTermArchivePersistence`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
  }

  assert.match(rootSource, /toTeacherOpsTermArchive as toTermArchiveFromTeacherOpsTermArchive/);
  assert.doesNotMatch(rootSource, /function termArchiveSnapshot\b/);
  assert.doesNotMatch(rootSource, /function toTermArchive\b/);

  const archive = createDatabase().term_archives[0];
  assert.deepEqual((teacherOpsTermArchiveSnapshot as (record: typeof archive) => unknown)(archive), {
    studentCount: 2,
    assignmentCount: 2,
    submissionCount: 2,
    reportCount: 1,
    averageCompletionRate: 50
  });
  assert.deepEqual((toTeacherOpsTermArchive as (record: typeof archive) => unknown)(archive), {
    id: "archive-existing",
    classId: "class-owned",
    className: "3A",
    termLabel: "Spring Term!",
    createdBy: "teacher-1",
    createdAt: "2026-06-20T00:00:00.000Z",
    snapshot: {
      studentCount: 2,
      assignmentCount: 2,
      submissionCount: 2,
      reportCount: 1,
      averageCompletionRate: 50
    },
    exportUrl: "/api/teacher/term-archives/archive-existing/export"
  });
});

test("teacher ops term archive persistence creates class snapshots without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsTermArchivePersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const result = await createTestStore(database).createTermArchive({
    teacherId: "teacher-1",
    classId: "class-owned",
    termLabel: "  Term 1  "
  });

  assert.equal(result.status, "created");
  assert.deepEqual(result.archive, {
    id: "term-archive-archive-new",
    classId: "class-owned",
    className: "3A",
    termLabel: "Term 1",
    createdBy: "teacher-1",
    createdAt: "2026-06-21T08:00:00.000Z",
    snapshot: {
      studentCount: 2,
      assignmentCount: 2,
      submissionCount: 2,
      reportCount: 1,
      averageCompletionRate: 50
    },
    exportUrl: "/api/teacher/term-archives/term-archive-archive-new/export"
  });
  assert.deepEqual(database.term_archives[0], {
    id: "term-archive-archive-new",
    class_id: "class-owned",
    class_name: "3A",
    term_label: "Term 1",
    created_by: "teacher-1",
    created_at: "2026-06-21T08:00:00.000Z",
    snapshot_json: JSON.stringify({
      studentCount: 2,
      assignmentCount: 2,
      submissionCount: 2,
      reportCount: 1,
      averageCompletionRate: 50
    })
  });
});

test("teacher ops term archive persistence keeps create access scoped to owners admins and admin memberships", async () => {
  const store = createTestStore(createDatabase());

  assert.equal((await store.createTermArchive({ teacherId: "admin-1", classId: "class-owned", termLabel: "Admin" })).status, "created");
  assert.equal((await store.createTermArchive({ teacherId: "teacher-admin-member", classId: "class-owned", termLabel: "Member" })).status, "created");
  assert.deepEqual(await store.createTermArchive({ teacherId: "teacher-co", classId: "class-owned", termLabel: "Co" }), { status: "forbidden" });
  assert.deepEqual(await store.createTermArchive({ teacherId: "teacher-viewer", classId: "class-owned", termLabel: "View" }), { status: "forbidden" });
  assert.deepEqual(await store.createTermArchive({ teacherId: "student-1", classId: "class-owned", termLabel: "No" }), { status: "forbidden" });
  assert.deepEqual(await store.createTermArchive({ teacherId: "teacher-1", classId: "class-owned", termLabel: " " }), { status: "invalid" });
});

test("teacher ops term archive persistence exports archived data for readers", async () => {
  const store = createTestStore(createDatabase());

  const exported = await store.getTermArchiveExport("teacher-viewer", "archive-existing");

  assert.equal(exported?.fileName, "Spring-Term-.json");
  assert.equal(exported?.payload.archive.id, "archive-existing");
  assert.deepEqual(exported?.payload.roster.map((student) => student.studentId), ["student-1"]);
  assert.deepEqual(exported?.payload.assignments.map((assignment) => assignment.id), ["assignment-1", "assignment-2"]);
  assert.deepEqual(exported?.payload.submissions.map((submission) => submission.id), ["submission-1", "submission-2"]);
  assert.equal(await store.getTermArchiveExport("teacher-other", "archive-existing"), null);
  assert.equal(await store.getTermArchiveExport("student-1", "archive-existing"), null);
  assert.equal(await store.getTermArchiveExport("teacher-1", "missing"), null);
});

test("legacy userStore delegates term archive operations to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const createTermArchive = teacherOpsUserStore\.createTermArchive/);
  assert.match(source, /export const getTermArchiveExport = teacherOpsUserStore\.getTermArchiveExport/);
  assert.doesNotMatch(source, /export async function createTermArchive/);
  assert.doesNotMatch(source, /export async function getTermArchiveExport/);
});
