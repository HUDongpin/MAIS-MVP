import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsAssignmentPersistenceStore,
  type TeacherOpsAssignmentPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsAssignmentPersistence";
import type { Assignment, Submission, TeacherClass } from "@/types";

const now = new Date("2026-06-21T08:00:00.000Z");

type TeacherOpsAssignmentSeedBoundaryModule = {
  normalizeTeacherOpsAssignmentRecord?: <Record extends { count_towards_grade?: boolean }>(
    assignment: Record
  ) => Record & { count_towards_grade: boolean };
  teacherOpsSeedAssignmentRecords?: (
    now: string,
    options: {
      demoTeacherId: string;
    }
  ) => TeacherOpsAssignmentPersistenceDatabase["assignments"];
  teacherOpsSeedSubmissionRecords?: (
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
      demoUserId: string;
    }
  ) => TeacherOpsAssignmentPersistenceDatabase["submissions"];
  teacherOpsDeletedAssignmentIdSet?: (deletedAssignmentIds?: unknown[]) => Set<string>;
  teacherOpsDeletedAssignmentSubmissionIdSet?: (
    submissions: Array<{ id: string; assignment_id: string }>,
    deletedAssignmentIds: ReadonlySet<string>
  ) => Set<string>;
  normalizeTeacherOpsAssignmentCollections?: (
    collections: {
      assignments?: Array<{
        id: string;
        class_id: string;
        title_en: string;
        title_zh: string;
        title_zh_hans?: string;
        description_en: string;
        description_zh: string;
        description_zh_hans?: string;
        content_type: "lesson" | "practice" | "assessment";
        target_id?: string;
        status: "draft" | "active" | "closed";
        due_at: string | null;
        allow_retake: boolean;
        show_answers: boolean;
        count_towards_grade?: boolean;
        created_by: string;
        created_at: string;
        updated_at: string;
      }>;
      submissions?: Array<{
        id: string;
        assignment_id: string;
        student_id: string;
        status: "not-started" | "in-progress" | "submitted" | "graded" | "returned-for-correction" | "resubmitted";
        score: number | null;
        submitted_at: string | null;
        graded_at: string | null;
        feedback_en?: string;
        feedback_zh?: string;
        updated_at: string;
      }>;
    },
    now: string,
    options: {
      deletedAssignmentIds: ReadonlySet<string>;
      demoTeacherId: string;
      demoUserId: string;
      shouldSeedDemoUser: () => boolean;
    }
  ) => {
    assignments: Array<Record<string, unknown>>;
    submissions: Array<Record<string, unknown>>;
  };
};

function createDatabase(): TeacherOpsAssignmentPersistenceDatabase {
  return {
    assignments: [
      {
        id: "assignment-old",
        class_id: "class-owned",
        title_en: "Older",
        updated_at: "2026-06-18T00:00:00.000Z"
      },
      {
        id: "assignment-shared",
        class_id: "class-shared",
        title_en: "Shared",
        updated_at: "2026-06-20T00:00:00.000Z"
      },
      {
        id: "assignment-other",
        class_id: "class-other",
        title_en: "Other",
        updated_at: "2026-06-21T00:00:00.000Z"
      }
    ],
    school_memberships: [
      {
        user_id: "teacher-1",
        class_id: "class-shared",
        role: "teacher"
      }
    ],
    class_enrollments: [
      {
        class_id: "class-owned",
        student_id: "student-1"
      },
      {
        class_id: "class-owned",
        student_id: "student-2"
      },
      {
        class_id: "class-shared",
        student_id: "student-3"
      }
    ],
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada"
      },
      {
        user_id: "student-2",
        name: "Bea"
      },
      {
        user_id: "student-3",
        name: "Cal"
      }
    ],
    submissions: [],
    assignment_submission_attempts: [],
    assignment_grading_runs: [],
    assignment_teacher_reviews: [],
    teacher_reminder_runs: [],
    teacher_messages: [],
    teacher_notices: [],
    teacher_lesson_kits: [],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        name: "Owned",
        grade: "S2"
      },
      {
        id: "class-shared",
        teacher_id: "teacher-2",
        name: "Shared",
        grade: "S3"
      },
      {
        id: "class-other",
        teacher_id: "teacher-2",
        name: "Other",
        grade: "S4"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" }
    ]
  };
}

function createTestStore(
  database: TeacherOpsAssignmentPersistenceDatabase,
  options: Partial<Parameters<typeof createTeacherOpsAssignmentPersistenceStore>[0]> = {}
) {
  return createTeacherOpsAssignmentPersistenceStore({
    createId: (() => {
      let nextId = 0;
      return () => `generated-${++nextId}`;
    })(),
    now: () => now,
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    toAssignment: (_database, assignment) => ({
      id: assignment.id,
      classId: assignment.class_id,
      title: { en: assignment.title_en ?? assignment.id, zh: assignment.title_en ?? assignment.id },
      description: { en: "", zh: "" },
      contentType: "practice",
      targetId: undefined,
      status: "active",
      dueAt: null,
      allowRetake: true,
      showAnswers: true,
      countTowardsGrade: false,
      createdBy: "teacher-1",
      createdAt: "2026-06-17T00:00:00.000Z",
      updatedAt: assignment.updated_at,
      submissionCount: 0,
      completedCount: 0
    }) satisfies Assignment,
    toTeacherClass: (_database, teacherClass) => ({
      id: teacherClass.id,
      teacherId: teacherClass.teacher_id,
      name: teacherClass.name,
      grade: teacherClass.grade,
      academicYear: "2025-2026",
      description: { en: "", zh: "" },
      studentCount: 0,
      inviteCode: "INVITE",
      createdAt: "2026-06-17T00:00:00.000Z",
      updatedAt: "2026-06-17T00:00:00.000Z"
    }) satisfies TeacherClass,
    toSubmission: (_database, submission) => ({
      id: submission.id,
      assignmentId: submission.assignment_id,
      studentId: submission.student_id,
      studentName: submission.student_id,
      status: submission.status,
      score: submission.score,
      submittedAt: submission.submitted_at,
      gradedAt: submission.graded_at,
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
    }) satisfies Submission,
    ...options
  });
}

test("teacher ops assignment persistence lists scoped assignments without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const assignments = await createTestStore(createDatabase()).getTeacherAssignments("teacher-1");

  assert.deepEqual(assignments?.map((assignment) => assignment.id), ["assignment-shared", "assignment-old"]);
  assert.deepEqual(assignments?.map((assignment) => assignment.classId), ["class-shared", "class-owned"]);
});

test("teacher ops assignment persistence supports admins and rejects non-teachers", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual((await store.getTeacherAssignments("admin-1"))?.map((assignment) => assignment.id), [
    "assignment-other",
    "assignment-shared",
    "assignment-old"
  ]);
  assert.equal(await store.getTeacherAssignments("student-1"), null);
  assert.equal(await store.getTeacherAssignments("missing-user"), null);
});

test("teacher ops assignment persistence creates assignments and seeded submissions", async () => {
  const database = createDatabase();
  const store = createTestStore(database, {
    createId: (() => {
      const ids = ["assignment-id", "submission-a", "submission-b"];
      return () => ids.shift() ?? "extra";
    })()
  });

  const result = await store.createTeacherAssignment({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentIds: ["student-2", "student-outside", "student-1"],
    title: "  Algebra practice  ",
    description: "",
    contentType: "practice",
    targetId: "  topic-1  ",
    dueAt: "2026-07-01",
    allowRetake: false,
    showAnswers: false,
    countTowardsGrade: true,
    language: "en"
  });

  assert.equal(result.status, "created");
  assert.equal(result.status === "created" ? result.assignment.id : null, "assignment-assignment-id");
  assert.equal(database.assignments[0]?.id, "assignment-assignment-id");
  assert.equal(database.assignments[0]?.title_en, "Algebra practice");
  assert.equal(database.assignments[0]?.description_en, "Complete the assigned practice.");
  assert.equal(database.assignments[0]?.target_id, "topic-1");
  assert.equal(database.assignments[0]?.due_at, "2026-07-01T00:00:00.000Z");
  assert.equal(database.assignments[0]?.allow_retake, false);
  assert.equal(database.assignments[0]?.show_answers, false);
  assert.equal(database.assignments[0]?.count_towards_grade, true);
  assert.deepEqual(
    database.submissions.map((submission) => [submission.id, submission.assignment_id, submission.student_id, submission.status]),
    [
      ["submission-submission-a", "assignment-assignment-id", "student-2", "not-started"],
      ["submission-submission-b", "assignment-assignment-id", "student-1", "not-started"]
    ]
  );
});

test("teacher ops assignment persistence creates analytics follow-up practice assignments", async () => {
  const database = createDatabase();
  const store = createTestStore(database, {
    createId: (() => {
      const ids = ["follow-up", "submission-a"];
      return () => ids.shift() ?? "extra";
    })()
  });

  const result = await store.createTeacherAnalyticsFollowUpAssignment({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentIds: ["student-1", "student-outside"],
    title: "  Follow-up practice  ",
    description: "  Target weak skills  ",
    targetId: "topic-weak"
  });

  assert.equal(result.status, "created");
  assert.equal(result.status === "created" ? result.assignment.id : null, "assignment-follow-up");
  assert.equal(database.assignments[0]?.content_type, "practice");
  assert.equal(database.assignments[0]?.target_id, "topic-weak");
  assert.equal(database.assignments[0]?.due_at, "2026-06-28T08:00:00.000Z");
  assert.equal(database.assignments[0]?.allow_retake, true);
  assert.equal(database.assignments[0]?.show_answers, false);
  assert.equal(database.assignments[0]?.count_towards_grade, false);
  assert.deepEqual(
    database.submissions.map((submission) => [submission.id, submission.assignment_id, submission.student_id]),
    [["submission-submission-a", "assignment-follow-up", "student-1"]]
  );
});

test("teacher ops assignment persistence owns assignment record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as TeacherOpsAssignmentSeedBoundaryModule;

  assert.equal(typeof module.normalizeTeacherOpsAssignmentRecord, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsAssignmentRecord\b/);
  assert.doesNotMatch(persistenceSource, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(persistenceSource, /from ["']@\/lib\/server\/userStore["']/);
  assert.doesNotMatch(rootSource, /normalizeTeacherOpsAssignmentRecord as normalizeAssignmentRecordFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /count_towards_grade: assignment\.count_towards_grade \?\? true/);

  assert.deepEqual(module.normalizeTeacherOpsAssignmentRecord?.({
    id: "assignment-missing",
    count_towards_grade: undefined
  }), {
    id: "assignment-missing",
    count_towards_grade: true
  });
  assert.deepEqual(module.normalizeTeacherOpsAssignmentRecord?.({
    id: "assignment-excluded",
    count_towards_grade: false
  }), {
    id: "assignment-excluded",
    count_towards_grade: false
  });
});

test("teacher ops assignment persistence owns seed assignment records for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as TeacherOpsAssignmentSeedBoundaryModule;

  assert.equal(typeof module.teacherOpsSeedAssignmentRecords, "function");
  assert.match(persistenceSource, /export function teacherOpsSeedAssignmentRecords\b/);
  assert.match(rootSource, /teacherOpsSeedAssignmentRecords as seedAssignmentsFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function seedAssignments\b/);

  assert.deepEqual(module.teacherOpsSeedAssignmentRecords?.("2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk"
  }), [
    {
      id: "assignment-quadratics-checkpoint",
      class_id: "class-s3a-2026",
      title_en: "Quadratic functions checkpoint",
      title_zh: "二次函數檢查點",
      description_en: "Complete the linked lesson practice and review the active mistake book items.",
      description_zh: "完成指定課節練習，並重溫目前錯題簿項目。",
      content_type: "lesson",
      target_id: "quadratic-functions",
      status: "active",
      due_at: "2026-06-21T10:00:00.000Z",
      allow_retake: true,
      show_answers: false,
      count_towards_grade: true,
      created_by: "teacher-hk",
      created_at: "2026-06-20T10:00:00.000Z",
      updated_at: "2026-06-20T10:00:00.000Z"
    },
    {
      id: "assignment-us-ca-p1-add-subtract-check",
      class_id: "class-us-ca-p1-2026",
      title_en: "Add and subtract check",
      title_zh: "加減法檢測",
      description_en: "Four questions on adding and taking away. You can try it more than once.",
      description_zh: "四題加法和減法練習，可以做多過一次。",
      content_type: "assessment",
      target_id: "assessment-us-ca-p1-add-subtract-check",
      status: "active",
      due_at: "2026-06-27T10:00:00.000Z",
      allow_retake: true,
      show_answers: true,
      count_towards_grade: false,
      created_by: "teacher-scott-us",
      created_at: "2026-06-20T10:00:00.000Z",
      updated_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
});

test("the demo classroom's assessment is reachable from the student's task list", async () => {
  // A student's assignment list is built from submission rows, and an assessment is
  // only linked through an assignment that targets it. Both must be seeded or the
  // assessment exists but no learner can find it.
  const module = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as TeacherOpsAssignmentSeedBoundaryModule;

  const assignment = module.teacherOpsSeedAssignmentRecords?.("2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk"
  })?.find((candidate) => candidate.content_type === "assessment");
  assert.ok(assignment, "one seeded assignment must target an assessment");
  assert.equal(assignment?.target_id, "assessment-us-ca-p1-add-subtract-check");
  assert.equal(assignment?.status, "active");

  const assessmentAssignmentId = assignment?.id;
  for (const shouldSeedDemoUser of [() => true, () => false]) {
    const submissions = module.teacherOpsSeedSubmissionRecords?.("2026-06-20T10:00:00.000Z", {
      shouldSeedDemoUser,
      demoUserId: "student-peter"
    }) ?? [];
    const linked = submissions.find((candidate) => candidate.assignment_id === assessmentAssignmentId);
    assert.ok(linked, "the enrolled demo learner needs a submission row for it to appear in her list");
    assert.equal(linked?.student_id, "student-shirleen-us");
    assert.equal(linked?.status, "not-started");
  }
});

test("teacher ops assignment persistence owns seed submission records for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as TeacherOpsAssignmentSeedBoundaryModule;

  assert.equal(typeof module.teacherOpsSeedSubmissionRecords, "function");
  assert.match(persistenceSource, /export function teacherOpsSeedSubmissionRecords\b/);
  assert.match(rootSource, /teacherOpsSeedSubmissionRecords as seedSubmissionsFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function seedSubmissions\b/);

  // The California Grade 1 row is seeded either way: that learner is a separate
  // seeded account from the demo user this flag gates.
  const californiaGradeOneSubmission = {
    id: "submission-us-ca-p1-add-subtract-check-shirleen",
    assignment_id: "assignment-us-ca-p1-add-subtract-check",
    student_id: "student-shirleen-us",
    status: "not-started",
    score: null,
    submitted_at: null,
    graded_at: null,
    feedback_en: "",
    feedback_zh: "",
    updated_at: "2026-06-20T10:00:00.000Z"
  };

  assert.deepEqual(module.teacherOpsSeedSubmissionRecords?.("2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => false,
    demoUserId: "student-peter"
  }), [californiaGradeOneSubmission]);

  assert.deepEqual(module.teacherOpsSeedSubmissionRecords?.("2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => true,
    demoUserId: "student-peter"
  }), [
    {
      id: "submission-quadratics-student-peter",
      assignment_id: "assignment-quadratics-checkpoint",
      student_id: "student-peter",
      status: "in-progress",
      score: null,
      submitted_at: null,
      graded_at: null,
      feedback_en: "",
      feedback_zh: "",
      updated_at: "2026-06-20T10:00:00.000Z"
    },
    californiaGradeOneSubmission
  ]);
});

test("teacher ops assignment persistence owns deleted assignment cleanup sets for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as TeacherOpsAssignmentSeedBoundaryModule;

  assert.equal(typeof module.teacherOpsDeletedAssignmentIdSet, "function");
  assert.equal(typeof module.teacherOpsDeletedAssignmentSubmissionIdSet, "function");
  assert.match(persistenceSource, /export function teacherOpsDeletedAssignmentIdSet\b/);
  assert.match(persistenceSource, /export function teacherOpsDeletedAssignmentSubmissionIdSet\b/);
  assert.match(rootSource, /teacherOpsDeletedAssignmentIdSet as deletedAssignmentIdSetFromTeacherOpsAssignment/);
  assert.match(rootSource, /teacherOpsDeletedAssignmentSubmissionIdSet as deletedAssignmentSubmissionIdSetFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /const deletedAssignmentIds = new Set\(/);
  assert.doesNotMatch(rootSource, /const deletedAssignmentSubmissionIds = new Set\(/);

  const deletedAssignmentIds = module.teacherOpsDeletedAssignmentIdSet?.([
    "assignment-delete",
    "",
    "   ",
    42,
    "assignment-keep",
    "assignment-delete"
  ]);

  assert.deepEqual(Array.from(deletedAssignmentIds ?? []), ["assignment-delete", "assignment-keep"]);
  assert.deepEqual(Array.from(module.teacherOpsDeletedAssignmentSubmissionIdSet?.([
    { id: "submission-delete-1", assignment_id: "assignment-delete" },
    { id: "submission-keep", assignment_id: "assignment-live" },
    { id: "submission-delete-2", assignment_id: "assignment-keep" }
  ], deletedAssignmentIds ?? new Set()) ?? []), [
    "submission-delete-1",
    "submission-delete-2"
  ]);
});

test("teacher ops assignment persistence owns assignment collection normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as TeacherOpsAssignmentSeedBoundaryModule;

  assert.equal(typeof module.normalizeTeacherOpsAssignmentCollections, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsAssignmentCollections\b/);
  assert.match(rootSource, /normalizeTeacherOpsAssignmentCollections as normalizeAssignmentCollectionsFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /\n    assignments: mergeSeedRecordsPreservingExisting\(/);
  assert.doesNotMatch(rootSource, /\n    submissions: mergeSeedRecordsPreservingExisting\(/);

  const normalized = module.normalizeTeacherOpsAssignmentCollections?.({
    assignments: [
      {
        id: "assignment-quadratics-checkpoint",
        class_id: "class-s3a-2026",
        title_en: "Legacy checkpoint",
        title_zh: "Legacy checkpoint",
        description_en: "Legacy description",
        description_zh: "Legacy description",
        content_type: "lesson",
        target_id: "legacy-topic",
        status: "active",
        due_at: "2026-06-22T10:00:00.000Z",
        allow_retake: false,
        show_answers: true,
        count_towards_grade: undefined,
        created_by: "teacher-custom",
        created_at: "2026-06-18T10:00:00.000Z",
        updated_at: "2026-06-18T10:00:00.000Z"
      },
      {
        id: "assignment-deleted",
        class_id: "class-s3a-2026",
        title_en: "Deleted",
        title_zh: "Deleted",
        description_en: "Deleted",
        description_zh: "Deleted",
        content_type: "practice",
        status: "active",
        due_at: null,
        allow_retake: true,
        show_answers: true,
        count_towards_grade: false,
        created_by: "teacher-custom",
        created_at: "2026-06-18T10:00:00.000Z",
        updated_at: "2026-06-18T10:00:00.000Z"
      },
      {
        id: "assignment-custom",
        class_id: "class-s3a-2026",
        title_en: "Custom",
        title_zh: "Custom",
        description_en: "Custom",
        description_zh: "Custom",
        content_type: "practice",
        status: "active",
        due_at: null,
        allow_retake: true,
        show_answers: true,
        count_towards_grade: false,
        created_by: "teacher-custom",
        created_at: "2026-06-19T10:00:00.000Z",
        updated_at: "2026-06-19T10:00:00.000Z"
      }
    ],
    submissions: [
      {
        id: "submission-quadratics-student-peter",
        assignment_id: "assignment-quadratics-checkpoint",
        student_id: "student-custom",
        status: "submitted",
        score: 88,
        submitted_at: "2026-06-18T12:00:00.000Z",
        graded_at: null,
        feedback_en: "Legacy feedback",
        feedback_zh: "Legacy feedback",
        updated_at: "2026-06-18T12:00:00.000Z"
      },
      {
        id: "submission-deleted",
        assignment_id: "assignment-deleted",
        student_id: "student-custom",
        status: "submitted",
        score: null,
        submitted_at: "2026-06-18T12:00:00.000Z",
        graded_at: null,
        updated_at: "2026-06-18T12:00:00.000Z"
      },
      {
        id: "submission-custom",
        assignment_id: "assignment-custom",
        student_id: "student-custom",
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        updated_at: "2026-06-19T12:00:00.000Z"
      }
    ]
  }, "2026-06-20T10:00:00.000Z", {
    deletedAssignmentIds: new Set(["assignment-deleted"]),
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    shouldSeedDemoUser: () => true
  });

  assert.deepEqual(normalized?.assignments.map((assignment) => assignment.id), [
    "assignment-quadratics-checkpoint",
    "assignment-us-ca-p1-add-subtract-check",
    "assignment-custom"
  ]);
  assert.equal(normalized?.assignments[0]?.title_en, "Legacy checkpoint");
  assert.equal(normalized?.assignments[0]?.count_towards_grade, true);
  assert.equal(normalized?.assignments[2]?.count_towards_grade, false);
  assert.deepEqual(normalized?.submissions.map((submission) => submission.id), [
    "submission-quadratics-student-peter",
    "submission-us-ca-p1-add-subtract-check-shirleen",
    "submission-custom"
  ]);
  assert.equal(normalized?.submissions[0]?.student_id, "student-custom");

  assert.deepEqual(module.normalizeTeacherOpsAssignmentCollections?.({
    assignments: [],
    submissions: []
  }, "2026-06-20T10:00:00.000Z", {
    deletedAssignmentIds: new Set(),
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    shouldSeedDemoUser: () => false
  }), {
    assignments: [
      {
        id: "assignment-quadratics-checkpoint",
        class_id: "class-s3a-2026",
        title_en: "Quadratic functions checkpoint",
        title_zh: "二次函數檢查點",
        description_en: "Complete the linked lesson practice and review the active mistake book items.",
        description_zh: "完成指定課節練習，並重溫目前錯題簿項目。",
        content_type: "lesson",
        target_id: "quadratic-functions",
        status: "active",
        due_at: "2026-06-21T10:00:00.000Z",
        allow_retake: true,
        show_answers: false,
        count_towards_grade: true,
        created_by: "teacher-hk",
        created_at: "2026-06-20T10:00:00.000Z",
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "assignment-us-ca-p1-add-subtract-check",
        class_id: "class-us-ca-p1-2026",
        title_en: "Add and subtract check",
        title_zh: "加減法檢測",
        description_en: "Four questions on adding and taking away. You can try it more than once.",
        description_zh: "四題加法和減法練習，可以做多過一次。",
        content_type: "assessment",
        target_id: "assessment-us-ca-p1-add-subtract-check",
        status: "active",
        due_at: "2026-06-27T10:00:00.000Z",
        allow_retake: true,
        show_answers: true,
        count_towards_grade: false,
        created_by: "teacher-scott-us",
        created_at: "2026-06-20T10:00:00.000Z",
        updated_at: "2026-06-20T10:00:00.000Z"
      }
    ],
    submissions: [
      {
        id: "submission-us-ca-p1-add-subtract-check-shirleen",
        assignment_id: "assignment-us-ca-p1-add-subtract-check",
        student_id: "student-shirleen-us",
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        feedback_en: "",
        feedback_zh: "",
        updated_at: "2026-06-20T10:00:00.000Z"
      }
    ]
  });
});

test("teacher ops assignment persistence rejects unavailable assignment creation", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.createTeacherAssignment({
    teacherId: "teacher-1",
    classId: "class-owned",
    title: " ",
    description: "",
    contentType: "practice",
    allowRetake: true,
    showAnswers: true,
    countTowardsGrade: false
  }), { status: "invalid" });
  assert.deepEqual(await store.createTeacherAssignment({
    teacherId: "student-1",
    classId: "class-owned",
    title: "Practice",
    description: "",
    contentType: "practice",
    allowRetake: true,
    showAnswers: true,
    countTowardsGrade: false
  }), { status: "forbidden" });
  assert.deepEqual(await store.createTeacherAssignment({
    teacherId: "teacher-1",
    classId: "class-other",
    title: "Practice",
    description: "",
    contentType: "practice",
    allowRetake: true,
    showAnswers: true,
    countTowardsGrade: false
  }), { status: "not-found" });
  assert.deepEqual(await store.createTeacherAssignment({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentIds: ["student-outside"],
    title: "Practice",
    description: "",
    contentType: "practice",
    allowRetake: true,
    showAnswers: true,
    countTowardsGrade: false
  }), { status: "no-students" });
});

test("teacher ops assignment persistence deletes assignments and linked records", async () => {
  const database = createDatabase();
  database.assignments.unshift({
    id: "assignment-delete",
    class_id: "class-owned",
    title_en: "Delete me",
    updated_at: "2026-06-20T00:00:00.000Z"
  });
  database.submissions.push(
    {
      id: "submission-delete-1",
      assignment_id: "assignment-delete",
      student_id: "student-1",
      status: "submitted",
      score: null,
      submitted_at: now.toISOString(),
      graded_at: null,
      feedback_en: "",
      feedback_zh: "",
      updated_at: now.toISOString()
    },
    {
      id: "submission-delete-2",
      assignment_id: "assignment-delete",
      student_id: "student-2",
      status: "not-started",
      score: null,
      submitted_at: null,
      graded_at: null,
      feedback_en: "",
      feedback_zh: "",
      updated_at: now.toISOString()
    },
    {
      id: "submission-keep",
      assignment_id: "assignment-old",
      student_id: "student-1",
      status: "not-started",
      score: null,
      submitted_at: null,
      graded_at: null,
      feedback_en: "",
      feedback_zh: "",
      updated_at: now.toISOString()
    }
  );
  database.assignment_submission_attempts.push(
    { id: "attempt-delete", submission_id: "submission-delete-1" },
    { id: "attempt-keep", submission_id: "submission-keep" }
  );
  database.assignment_grading_runs.push(
    { id: "run-delete-submission", submission_id: "submission-delete-2", attempt_id: null },
    { id: "run-delete-attempt", submission_id: "submission-other", attempt_id: "attempt-delete" },
    { id: "run-keep", submission_id: "submission-keep", attempt_id: "attempt-keep" }
  );
  database.assignment_teacher_reviews.push(
    { id: "review-delete", submission_id: "submission-delete-1" },
    { id: "review-keep", submission_id: "submission-keep" }
  );
  database.teacher_reminder_runs.push(
    { id: "reminder-delete", assignment_id: "assignment-delete" },
    { id: "reminder-keep", assignment_id: "assignment-old" }
  );
  database.teacher_messages.push({ id: "message-delete", assignment_id: "assignment-delete" });
  database.teacher_notices.push({ id: "notice-delete", assignment_id: "assignment-delete" });
  database.teacher_lesson_kits.push({ id: "kit-delete", assignment_id: "assignment-delete", updated_at: "2026-06-19T00:00:00.000Z" });

  const result = await createTestStore(database).deleteTeacherAssignment({
    teacherId: "teacher-1",
    assignmentId: " assignment-delete "
  });

  assert.deepEqual(result, {
    status: "deleted",
    assignmentId: "assignment-delete",
    deletedSubmissionCount: 2
  });
  assert.equal(database.assignments.some((assignment) => assignment.id === "assignment-delete"), false);
  assert.deepEqual(database.submissions.map((submission) => submission.id), ["submission-keep"]);
  assert.deepEqual(database.assignment_submission_attempts.map((attempt) => attempt.id), ["attempt-keep"]);
  assert.deepEqual(database.assignment_grading_runs.map((run) => run.id), ["run-keep"]);
  assert.deepEqual(database.assignment_teacher_reviews.map((review) => review.id), ["review-keep"]);
  assert.deepEqual(database.teacher_reminder_runs.map((run) => run.id), ["reminder-keep"]);
  assert.deepEqual(database.deleted_assignment_ids, ["assignment-delete"]);
  assert.equal(database.teacher_messages[0]?.assignment_id, undefined);
  assert.equal(database.teacher_notices[0]?.assignment_id, undefined);
  assert.equal(database.teacher_lesson_kits[0]?.assignment_id, undefined);
  assert.equal(database.teacher_lesson_kits[0]?.updated_at, now.toISOString());
});

test("teacher ops assignment persistence rejects unavailable assignment deletion", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.deleteTeacherAssignment({ teacherId: "teacher-1", assignmentId: " " }), { status: "invalid" });
  assert.deepEqual(await store.deleteTeacherAssignment({ teacherId: "student-1", assignmentId: "assignment-old" }), { status: "forbidden" });
  assert.deepEqual(await store.deleteTeacherAssignment({ teacherId: "teacher-1", assignmentId: "assignment-other" }), { status: "not-found" });
});

test("teacher ops assignment persistence builds assignment detail data", async () => {
  const database = createDatabase();
  database.assignments.unshift({
    id: "assignment-detail",
    class_id: "class-owned",
    title_en: "Detail",
    updated_at: "2026-06-20T00:00:00.000Z"
  });
  database.submissions.push(
    {
      id: "submission-bea",
      assignment_id: "assignment-detail",
      student_id: "student-2",
      status: "submitted",
      score: null,
      submitted_at: now.toISOString(),
      graded_at: null,
      feedback_en: "",
      feedback_zh: "",
      updated_at: now.toISOString()
    },
    {
      id: "submission-ada",
      assignment_id: "assignment-detail",
      student_id: "student-1",
      status: "resolved",
      score: 90,
      submitted_at: now.toISOString(),
      graded_at: now.toISOString(),
      feedback_en: "",
      feedback_zh: "",
      updated_at: now.toISOString()
    },
    {
      id: "submission-cal",
      assignment_id: "assignment-detail",
      student_id: "student-3",
      status: "correction-submitted",
      score: null,
      submitted_at: now.toISOString(),
      graded_at: null,
      feedback_en: "",
      feedback_zh: "",
      updated_at: now.toISOString()
    }
  );
  const projectionCalls: string[] = [];
  const store = createTestStore(database, {
    toAssignment: (_database, assignment) => {
      projectionCalls.push(`assignment:${assignment.id}`);
      return { id: assignment.id } as Assignment;
    },
    toTeacherClass: (_database, teacherClass) => {
      projectionCalls.push(`class:${teacherClass.id}`);
      return { id: teacherClass.id } as TeacherClass;
    },
    toSubmission: (_database, submission) => {
      projectionCalls.push(`submission:${submission.id}`);
      return { id: submission.id, status: submission.status } as Submission;
    }
  });

  const detail = await store.getTeacherAssignmentDetailData("teacher-1", "assignment-detail");

  assert.equal(detail?.assignment.id, "assignment-detail");
  assert.equal(detail?.class.id, "class-owned");
  assert.deepEqual(detail?.submissions.map((submission) => submission.id), [
    "submission-ada",
    "submission-bea",
    "submission-cal"
  ]);
  assert.equal(detail?.completionRate, 100);
  assert.deepEqual(detail?.gradingSummary, {
    pendingGrading: 1,
    correctionRequired: 0,
    correctionSubmitted: 1,
    resolved: 1
  });
  assert.deepEqual(projectionCalls, [
    "submission:submission-ada",
    "submission:submission-bea",
    "submission:submission-cal",
    "assignment:assignment-detail",
    "class:class-owned"
  ]);
  assert.equal(await store.getTeacherAssignmentDetailData("student-1", "assignment-detail"), null);
  assert.equal(await store.getTeacherAssignmentDetailData("teacher-1", "assignment-other"), null);
});

test("legacy userStore delegates teacher assignment lifecycle to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getTeacherAssignments = teacherOpsUserStore\.getTeacherAssignments/);
  assert.match(source, /export const createTeacherAnalyticsFollowUpAssignment = teacherOpsUserStore\.createTeacherAnalyticsFollowUpAssignment/);
  assert.match(source, /export const createTeacherAssignment = teacherOpsUserStore\.createTeacherAssignment/);
  assert.match(source, /export const deleteTeacherAssignment = teacherOpsUserStore\.deleteTeacherAssignment/);
  assert.match(source, /export const getTeacherAssignmentDetailData = teacherOpsUserStore\.getTeacherAssignmentDetailData/);
  assert.doesNotMatch(source, /export async function getTeacherAssignments/);
  assert.doesNotMatch(source, /export async function createTeacherAnalyticsFollowUpAssignment/);
  assert.doesNotMatch(source, /export async function createTeacherAssignment/);
  assert.doesNotMatch(source, /export async function deleteTeacherAssignment/);
  assert.doesNotMatch(source, /export async function getTeacherAssignmentDetailData/);
});

test("teacher ops assignment persistence owns submission completion helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const isSubmissionComplete = helpers.isTeacherOpsSubmissionComplete as ((submission: { status: string }) => boolean) | undefined;

  assert.equal(typeof isSubmissionComplete, "function");
  assert.match(persistenceSource, /export function isTeacherOpsSubmissionComplete\b/);
  assert.match(rootSource, /isTeacherOpsSubmissionComplete as isSubmissionCompleteFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function isSubmissionComplete\(/);

  assert.deepEqual(
    [
      "not-started",
      "submitted",
      "graded",
      "late",
      "correction-required",
      "correction-submitted",
      "resolved",
      "draft"
    ].map((status) => [status, isSubmissionComplete?.({ status })]),
    [
      ["not-started", false],
      ["submitted", true],
      ["graded", true],
      ["late", true],
      ["correction-required", true],
      ["correction-submitted", true],
      ["resolved", true],
      ["draft", false]
    ]
  );
});

test("teacher ops assignment persistence owns assignment submission count helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const submissionCounts = helpers.teacherOpsAssignmentSubmissionCounts as ((
    database: {
      submissions: Array<{
        assignment_id: string;
        status: string;
      }>;
    },
    assignmentId: string
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof submissionCounts, "function");
  assert.match(persistenceSource, /export function teacherOpsAssignmentSubmissionCounts\b/);
  assert.match(rootSource, /teacherOpsAssignmentSubmissionCounts as assignmentSubmissionCountsFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function assignmentSubmissionCounts\(/);

  assert.deepEqual(submissionCounts?.({
    submissions: [
      { assignment_id: "assignment-1", status: "not-started" },
      { assignment_id: "assignment-1", status: "submitted" },
      { assignment_id: "assignment-1", status: "correction-submitted" },
      { assignment_id: "assignment-2", status: "resolved" }
    ]
  }, "assignment-1"), {
    submissionCount: 3,
    completedCount: 2
  });
});

test("teacher ops assignment persistence owns assignment projection helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const toAssignment = helpers.toTeacherOpsAssignment as ((
    database: {
      submissions: Array<{
        assignment_id: string;
        status: string;
      }>;
    },
    record: {
      id: string;
      class_id: string;
      title_en: string;
      title_zh: string;
      title_zh_hans: string;
      description_en: string;
      description_zh: string;
      description_zh_hans: string;
      content_type: "practice";
      target_id?: string;
      status: "active";
      due_at: string | null;
      allow_retake: boolean;
      show_answers: boolean;
      count_towards_grade: boolean;
      created_by: string;
      created_at: string;
      updated_at: string;
    }
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof toAssignment, "function");
  assert.match(persistenceSource, /export function toTeacherOpsAssignment\b/);
  assert.match(rootSource, /toTeacherOpsAssignment as toAssignmentFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function toAssignment\(/);

  assert.deepEqual(toAssignment?.({
    submissions: [
      { assignment_id: "assignment-1", status: "not-started" },
      { assignment_id: "assignment-1", status: "submitted" },
      { assignment_id: "assignment-2", status: "resolved" }
    ]
  }, {
    id: "assignment-1",
    class_id: "class-1",
    title_en: "Linear equations",
    title_zh: "一次方程",
    title_zh_hans: "一次方程",
    description_en: "Solve the practice set.",
    description_zh: "完成練習。",
    description_zh_hans: "完成练习。",
    content_type: "practice",
    target_id: "practice-1",
    status: "active",
    due_at: "2026-06-25T08:00:00.000Z",
    allow_retake: true,
    show_answers: false,
    count_towards_grade: true,
    created_by: "teacher-1",
    created_at: "2026-06-21T08:00:00.000Z",
    updated_at: "2026-06-22T08:00:00.000Z"
  }), {
    id: "assignment-1",
    classId: "class-1",
    title: {
      en: "Linear equations",
      zh: "一次方程",
      zhHans: "一次方程"
    },
    description: {
      en: "Solve the practice set.",
      zh: "完成練習。",
      zhHans: "完成练习。"
    },
    contentType: "practice",
    targetId: "practice-1",
    status: "active",
    dueAt: "2026-06-25T08:00:00.000Z",
    allowRetake: true,
    showAnswers: false,
    countTowardsGrade: true,
    createdBy: "teacher-1",
    createdAt: "2026-06-21T08:00:00.000Z",
    updatedAt: "2026-06-22T08:00:00.000Z",
    submissionCount: 2,
    completedCount: 1
  });
});

test("teacher ops assignment persistence owns grading and correction review predicates for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const needsTeacherGrading = helpers.teacherOpsSubmissionNeedsTeacherGrading as ((submission: {
    status: string;
    graded_at?: string | null;
    score?: number | null;
  }) => boolean) | undefined;
  const needsCorrectionReview = helpers.teacherOpsSubmissionNeedsCorrectionReview as ((submission: {
    status: string;
  }) => boolean) | undefined;

  assert.equal(typeof needsTeacherGrading, "function");
  assert.equal(typeof needsCorrectionReview, "function");
  assert.match(persistenceSource, /export function teacherOpsSubmissionNeedsTeacherGrading\b/);
  assert.match(persistenceSource, /export function teacherOpsSubmissionNeedsCorrectionReview\b/);
  assert.match(rootSource, /teacherOpsSubmissionNeedsTeacherGrading as needsTeacherGradingFromTeacherOpsAssignment/);
  assert.match(rootSource, /teacherOpsSubmissionNeedsCorrectionReview as needsCorrectionReviewFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function needsTeacherGrading\(/);
  assert.doesNotMatch(rootSource, /function needsCorrectionReview\(/);

  assert.equal(needsTeacherGrading?.({ status: "submitted", graded_at: null, score: null }), true);
  assert.equal(needsTeacherGrading?.({ status: "late", graded_at: null, score: null }), true);
  assert.equal(needsTeacherGrading?.({ status: "submitted", graded_at: "2026-06-21T08:00:00.000Z", score: null }), false);
  assert.equal(needsTeacherGrading?.({ status: "submitted", graded_at: null, score: 75 }), false);
  assert.equal(needsTeacherGrading?.({ status: "correction-submitted", graded_at: null, score: null }), false);
  assert.equal(needsCorrectionReview?.({ status: "correction-submitted" }), true);
  assert.equal(needsCorrectionReview?.({ status: "correction-required" }), false);
});

test("teacher ops assignment persistence owns latest teacher review selector for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const latestTeacherReviewRecord = helpers.latestTeacherOpsAssignmentReviewRecord as ((
    database: {
      assignment_teacher_reviews: Array<{
        id: string;
        submission_id: string;
        created_at: string;
      }>;
    },
    submissionId: string
  ) => { id: string } | null) | undefined;

  assert.equal(typeof latestTeacherReviewRecord, "function");
  assert.match(persistenceSource, /export function latestTeacherOpsAssignmentReviewRecord\b/);
  assert.match(rootSource, /latestTeacherOpsAssignmentReviewRecord as latestTeacherReviewRecordFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function latestTeacherReviewRecord\(/);

  assert.deepEqual(
    latestTeacherReviewRecord?.({
      assignment_teacher_reviews: [
        {
          id: "review-old",
          submission_id: "submission-1",
          created_at: "2026-06-20T08:00:00.000Z"
        },
        {
          id: "review-other",
          submission_id: "submission-2",
          created_at: "2026-06-22T08:00:00.000Z"
        },
        {
          id: "review-new",
          submission_id: "submission-1",
          created_at: "2026-06-21T08:00:00.000Z"
        }
      ]
    }, "submission-1"),
    {
      id: "review-new",
      submission_id: "submission-1",
      created_at: "2026-06-21T08:00:00.000Z"
    }
  );
  assert.equal(latestTeacherReviewRecord?.({ assignment_teacher_reviews: [] }, "missing"), null);
});

test("teacher ops assignment persistence owns grading run projection helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const toGradingRun = helpers.toTeacherOpsAssignmentGradingRun as ((record: {
    id: string;
    submission_id: string;
    attempt_id: string | null;
    status: "suggested";
    provider: "llm";
    model: string;
    suggested_score: number | null;
    confidence: number | null;
    feedback_en?: string;
    feedback_zh?: string;
    correction_request_en?: string;
    correction_request_zh?: string;
    error_code?: string;
    usage?: { totalTokens?: number | null };
    created_at: string;
  }) => Record<string, unknown>) | undefined;

  assert.equal(typeof toGradingRun, "function");
  assert.match(persistenceSource, /export function toTeacherOpsAssignmentGradingRun\b/);
  assert.match(rootSource, /toTeacherOpsAssignmentGradingRun as toAssignmentGradingRunFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function toAssignmentGradingRun\(/);

  assert.deepEqual(toGradingRun?.({
    id: "grading-run-1",
    submission_id: "submission-1",
    attempt_id: "attempt-1",
    status: "suggested",
    provider: "llm",
    model: "deepseek-test",
    suggested_score: 88,
    confidence: 0.82,
    feedback_en: "Good reasoning.",
    feedback_zh: "推理良好。",
    correction_request_en: "Show one more step.",
    correction_request_zh: "",
    error_code: "low-confidence",
    usage: { totalTokens: 120 },
    created_at: "2026-06-21T08:00:00.000Z"
  }), {
    id: "grading-run-1",
    submissionId: "submission-1",
    attemptId: "attempt-1",
    status: "suggested",
    provider: "llm",
    model: "deepseek-test",
    suggestedScore: 88,
    confidence: 0.82,
    feedback: {
      en: "Good reasoning.",
      zh: "推理良好。"
    },
    correctionRequest: {
      en: "Show one more step.",
      zh: ""
    },
    errorCode: "low-confidence",
    usage: { totalTokens: 120 },
    createdAt: "2026-06-21T08:00:00.000Z"
  });

  assert.equal(toGradingRun?.({
    id: "grading-run-empty",
    submission_id: "submission-1",
    attempt_id: null,
    status: "suggested",
    provider: "llm",
    model: "deepseek-test",
    suggested_score: null,
    confidence: null,
    feedback_en: "",
    feedback_zh: "",
    correction_request_en: "",
    correction_request_zh: "",
    created_at: "2026-06-21T08:00:00.000Z"
  }).feedback, null);
});

test("teacher ops assignment persistence owns grading run record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const normalizeRun = helpers.normalizeTeacherOpsAssignmentGradingRunRecord as ((
    run: {
      id: string;
      submission_id: string;
      attempt_id?: string | null;
      status?: unknown;
      provider?: "deepseek" | "simpletex" | "none" | "llm" | "manual" | null;
      model?: string | null;
      suggested_score?: unknown;
      confidence?: unknown;
      created_at?: string | null;
    },
    now: string
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeRun, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsAssignmentGradingRunRecord\b/);
  assert.match(rootSource, /normalizeTeacherOpsAssignmentGradingRunRecord as normalizeAssignmentGradingRunRecordFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /status: \["suggested", "needs-review", "failed"\]\.includes\(run\.status\)/);
  assert.doesNotMatch(rootSource, /suggested_score: typeof run\.suggested_score === "number"/);
  assert.doesNotMatch(rootSource, /confidence: typeof run\.confidence === "number"/);

  assert.deepEqual(normalizeRun?.({
    id: "run-invalid",
    submission_id: "submission-1",
    attempt_id: null,
    status: "queued",
    provider: null,
    model: "",
    suggested_score: 111.6,
    confidence: 1.7,
    created_at: null
  }, now.toISOString()), {
    id: "run-invalid",
    submission_id: "submission-1",
    attempt_id: null,
    status: "needs-review",
    provider: "manual",
    model: "manual",
    suggested_score: 100,
    confidence: 1,
    created_at: now.toISOString()
  });

  assert.deepEqual(normalizeRun?.({
    id: "run-valid",
    submission_id: "submission-1",
    attempt_id: "attempt-1",
    status: "failed",
    provider: "llm",
    model: "deepseek-v4",
    suggested_score: -3.2,
    confidence: -0.2,
    created_at: "2026-06-22T08:00:00.000Z"
  }, now.toISOString()), {
    id: "run-valid",
    submission_id: "submission-1",
    attempt_id: "attempt-1",
    status: "failed",
    provider: "llm",
    model: "deepseek-v4",
    suggested_score: 0,
    confidence: 0,
    created_at: "2026-06-22T08:00:00.000Z"
  });
});

test("teacher ops assignment persistence owns submission attempt projection helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const toAttempt = helpers.toTeacherOpsAssignmentSubmissionAttempt as ((record: {
    id: string;
    submission_id: string;
    student_id: string;
    attempt_number: number;
    kind: "correction";
    input_type: "handwriting";
    answer_text: string;
    image_data_url?: string;
    image_object_key?: string;
    image_file_name?: string;
    ocr_result: null;
    submitted_at: string;
  }) => Record<string, unknown>) | undefined;

  assert.equal(typeof toAttempt, "function");
  assert.match(persistenceSource, /export function toTeacherOpsAssignmentSubmissionAttempt\b/);
  assert.match(rootSource, /toTeacherOpsAssignmentSubmissionAttempt as toAssignmentSubmissionAttemptFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function toAssignmentSubmissionAttempt\(/);

  assert.deepEqual(toAttempt?.({
    id: "attempt-1",
    submission_id: "submission-1",
    student_id: "student-1",
    attempt_number: 2,
    kind: "correction",
    input_type: "handwriting",
    answer_text: "x = 4",
    image_data_url: "data:image/png;base64,fallback",
    image_object_key: " assignment/attempt.png ",
    image_file_name: "work.png",
    ocr_result: null,
    submitted_at: "2026-06-21T08:00:00.000Z"
  }), {
    id: "attempt-1",
    submissionId: "submission-1",
    studentId: "student-1",
    attemptNumber: 2,
    kind: "correction",
    inputType: "handwriting",
    answerText: "x = 4",
    imageDataUrl: "/api/media-objects/assignment/attempt.png",
    imageObjectKey: "assignment/attempt.png",
    imageUrl: "/api/media-objects/assignment/attempt.png",
    imageFileName: "work.png",
    ocrResult: null,
    submittedAt: "2026-06-21T08:00:00.000Z"
  });

  assert.deepEqual(toAttempt?.({
    id: "attempt-invalid-key",
    submission_id: "submission-1",
    student_id: "student-1",
    attempt_number: 1,
    kind: "correction",
    input_type: "handwriting",
    answer_text: "x = 3",
    image_data_url: "data:image/png;base64,kept",
    image_object_key: "../unsafe.png",
    ocr_result: null,
    submitted_at: "2026-06-21T08:00:00.000Z"
  }).imageDataUrl, "data:image/png;base64,kept");
});

test("teacher ops assignment persistence owns submission attempt record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const normalizeAttempt = helpers.normalizeTeacherOpsAssignmentSubmissionAttemptRecord as ((
    attempt: {
      id: string;
      submission_id: string;
      student_id: string;
      attempt_number?: unknown;
      kind?: unknown;
      input_type?: unknown;
      answer_text?: unknown;
      image_object_key?: unknown;
      ocr_result?: unknown;
      submitted_at?: string | null;
    },
    dependencies: {
      now: string;
      normalizeStoredMediaObjectKey: (value: unknown) => string | undefined;
      normalizeAssignmentOcrResult: (value: unknown) => Record<string, unknown> | null;
    }
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeAttempt, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsAssignmentSubmissionAttemptRecord\b/);
  assert.match(rootSource, /normalizeTeacherOpsAssignmentSubmissionAttemptRecord as normalizeAssignmentSubmissionAttemptRecordFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /attempt_number: Math\.max\(1, Math\.round\(Number\(attempt\.attempt_number\) \|\| 1\)\)/);
  assert.doesNotMatch(rootSource, /input_type: \["text", "image", "handwriting", "mixed"\]\.includes\(attempt\.input_type\)/);
  assert.doesNotMatch(rootSource, /image_object_key: normalizeStoredMediaObjectKey\(attempt\.image_object_key\)/);
  assert.doesNotMatch(rootSource, /ocr_result: normalizeAssignmentOcrResultFromTeacherOpsSubmission\(attempt\.ocr_result\)/);

  const dependencies = {
    now: now.toISOString(),
    normalizeStoredMediaObjectKey: (value: unknown) => typeof value === "string" ? `key:${value.trim()}` : undefined,
    normalizeAssignmentOcrResult: (value: unknown) => value ? { normalized: true, source: value } : null
  };

  assert.deepEqual(normalizeAttempt?.({
    id: "attempt-invalid",
    submission_id: "submission-1",
    student_id: "student-1",
    attempt_number: "0.2",
    kind: "retry",
    input_type: "camera",
    answer_text: 42,
    image_object_key: " work/attempt.png ",
    ocr_result: { text: "raw" },
    submitted_at: null
  }, dependencies), {
    id: "attempt-invalid",
    submission_id: "submission-1",
    student_id: "student-1",
    attempt_number: 1,
    kind: "initial",
    input_type: "text",
    answer_text: "",
    image_object_key: "key:work/attempt.png",
    ocr_result: { normalized: true, source: { text: "raw" } },
    submitted_at: now.toISOString()
  });

  assert.deepEqual(normalizeAttempt?.({
    id: "attempt-valid",
    submission_id: "submission-1",
    student_id: "student-1",
    attempt_number: 2.6,
    kind: "correction",
    input_type: "mixed",
    answer_text: "x = 4",
    image_object_key: null,
    ocr_result: null,
    submitted_at: "2026-06-22T08:00:00.000Z"
  }, dependencies), {
    id: "attempt-valid",
    submission_id: "submission-1",
    student_id: "student-1",
    attempt_number: 3,
    kind: "correction",
    input_type: "mixed",
    answer_text: "x = 4",
    image_object_key: undefined,
    ocr_result: null,
    submitted_at: "2026-06-22T08:00:00.000Z"
  });
});

test("teacher ops assignment persistence owns teacher review projection helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const toTeacherReview = helpers.toTeacherOpsAssignmentTeacherReview as ((
    database: {
      users: Array<{
        id: string;
        username?: string;
      }>;
    },
    record: {
      id: string;
      submission_id: string;
      action: "request-correction";
      final_score: number | null;
      feedback_en?: string;
      feedback_zh?: string;
      correction_request_en?: string;
      correction_request_zh?: string;
      correction_due_at?: string | null;
      reviewed_by: string;
      created_at: string;
    }
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof toTeacherReview, "function");
  assert.match(persistenceSource, /export function toTeacherOpsAssignmentTeacherReview\b/);
  assert.match(rootSource, /toTeacherOpsAssignmentTeacherReview as toAssignmentTeacherReviewFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function toAssignmentTeacherReview\(/);

  assert.deepEqual(toTeacherReview?.({
    users: [
      {
        id: "teacher-1",
        username: "Ms Chan"
      }
    ]
  }, {
    id: "review-1",
    submission_id: "submission-1",
    action: "request-correction",
    final_score: 72,
    feedback_en: "Good start.",
    feedback_zh: "",
    correction_request_en: "Explain the final step.",
    correction_request_zh: "請解釋最後一步。",
    correction_due_at: "2026-06-25T08:00:00.000Z",
    reviewed_by: "teacher-1",
    created_at: "2026-06-21T08:00:00.000Z"
  }), {
    id: "review-1",
    submissionId: "submission-1",
    action: "request-correction",
    finalScore: 72,
    feedback: {
      en: "Good start.",
      zh: ""
    },
    correctionRequest: {
      en: "Explain the final step.",
      zh: "請解釋最後一步。"
    },
    correctionDueAt: "2026-06-25T08:00:00.000Z",
    reviewedBy: "teacher-1",
    reviewerName: "Ms Chan",
    createdAt: "2026-06-21T08:00:00.000Z"
  });

  assert.equal(toTeacherReview?.({
    users: []
  }, {
    id: "review-unknown",
    submission_id: "submission-1",
    action: "request-correction",
    final_score: null,
    feedback_en: "",
    feedback_zh: "",
    correction_request_en: "",
    correction_request_zh: "",
    reviewed_by: "missing-teacher",
    created_at: "2026-06-21T08:00:00.000Z"
  }).reviewerName, "Teacher");
});

test("teacher ops assignment persistence owns teacher review record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const normalizeReview = helpers.normalizeTeacherOpsAssignmentTeacherReviewRecord as ((
    review: {
      id: string;
      submission_id: string;
      action?: unknown;
      final_score?: unknown;
      correction_due_at?: string | null;
      created_at?: string | null;
    },
    now: string
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeReview, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsAssignmentTeacherReviewRecord\b/);
  assert.match(rootSource, /normalizeTeacherOpsAssignmentTeacherReviewRecord as normalizeAssignmentTeacherReviewRecordFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /action: \["score-only", "accept", "request-correction", "resolve"\]\.includes\(review\.action\)/);
  assert.doesNotMatch(rootSource, /final_score: typeof review\.final_score === "number"/);
  assert.doesNotMatch(rootSource, /correction_due_at: review\.correction_due_at \?\? null/);

  assert.deepEqual(normalizeReview?.({
    id: "review-invalid",
    submission_id: "submission-1",
    action: "approve",
    final_score: 102.4,
    correction_due_at: undefined,
    created_at: null
  }, now.toISOString()), {
    id: "review-invalid",
    submission_id: "submission-1",
    action: "score-only",
    final_score: 100,
    correction_due_at: null,
    created_at: now.toISOString()
  });

  assert.deepEqual(normalizeReview?.({
    id: "review-valid",
    submission_id: "submission-1",
    action: "request-correction",
    final_score: -1.8,
    correction_due_at: "2026-06-24T08:00:00.000Z",
    created_at: "2026-06-22T08:00:00.000Z"
  }, now.toISOString()), {
    id: "review-valid",
    submission_id: "submission-1",
    action: "request-correction",
    final_score: 0,
    correction_due_at: "2026-06-24T08:00:00.000Z",
    created_at: "2026-06-22T08:00:00.000Z"
  });
});

test("teacher ops assignment persistence owns submission projection helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssignmentPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsAssignmentPersistence") as Record<string, unknown>;
  const toSubmission = helpers.toTeacherOpsAssignmentSubmission as ((
    database: {
      student_profiles: Array<{
        user_id: string;
        name: string;
      }>;
      assignment_submission_attempts: Array<{
        id: string;
        submission_id: string;
        student_id: string;
        attempt_number: number;
        kind: "initial" | "correction";
        input_type: "text";
        answer_text: string;
        ocr_result: null;
        submitted_at: string;
      }>;
      assignment_grading_runs: Array<{
        id: string;
        submission_id: string;
        attempt_id: string | null;
        status: "suggested";
        provider: "llm";
        model: string;
        suggested_score: number | null;
        confidence: number | null;
        correction_request_en?: string;
        created_at: string;
      }>;
      assignment_teacher_reviews: Array<{
        id: string;
        submission_id: string;
        action: "request-correction";
        final_score: number | null;
        correction_request_en?: string;
        correction_due_at?: string | null;
        reviewed_by: string;
        created_at: string;
      }>;
      users: Array<{
        id: string;
        username?: string;
      }>;
    },
    record: {
      id: string;
      assignment_id: string;
      student_id: string;
      status: "resolved";
      score: number | null;
      submitted_at: string | null;
      graded_at: string | null;
      feedback_en?: string;
      feedback_zh?: string;
      updated_at: string;
    }
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof toSubmission, "function");
  assert.match(persistenceSource, /export function toTeacherOpsAssignmentSubmission\b/);
  assert.match(rootSource, /toTeacherOpsAssignmentSubmission as toSubmissionFromTeacherOpsAssignment/);
  assert.doesNotMatch(rootSource, /function toSubmission\(/);

  const projected = toSubmission?.({
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada"
      }
    ],
    assignment_submission_attempts: [
      {
        id: "attempt-2",
        submission_id: "submission-1",
        student_id: "student-1",
        attempt_number: 2,
        kind: "correction",
        input_type: "text",
        answer_text: "x = 4",
        ocr_result: null,
        submitted_at: "2026-06-21T08:05:00.000Z"
      },
      {
        id: "attempt-1",
        submission_id: "submission-1",
        student_id: "student-1",
        attempt_number: 1,
        kind: "initial",
        input_type: "text",
        answer_text: "x = 3",
        ocr_result: null,
        submitted_at: "2026-06-21T08:00:00.000Z"
      },
      {
        id: "attempt-other",
        submission_id: "submission-other",
        student_id: "student-1",
        attempt_number: 1,
        kind: "initial",
        input_type: "text",
        answer_text: "not included",
        ocr_result: null,
        submitted_at: "2026-06-21T08:00:00.000Z"
      }
    ],
    assignment_grading_runs: [
      {
        id: "run-old",
        submission_id: "submission-1",
        attempt_id: "attempt-1",
        status: "suggested",
        provider: "llm",
        model: "deepseek-test",
        suggested_score: 70,
        confidence: 0.6,
        correction_request_en: "Older LLM request.",
        created_at: "2026-06-21T08:10:00.000Z"
      },
      {
        id: "run-new",
        submission_id: "submission-1",
        attempt_id: "attempt-2",
        status: "suggested",
        provider: "llm",
        model: "deepseek-test",
        suggested_score: 82,
        confidence: 0.9,
        correction_request_en: "Latest LLM request.",
        created_at: "2026-06-21T08:20:00.000Z"
      }
    ],
    assignment_teacher_reviews: [
      {
        id: "review-new",
        submission_id: "submission-1",
        action: "request-correction",
        final_score: 82,
        correction_request_en: "Teacher correction request.",
        correction_due_at: "2026-06-25T08:00:00.000Z",
        reviewed_by: "teacher-1",
        created_at: "2026-06-21T08:30:00.000Z"
      }
    ],
    users: [
      {
        id: "teacher-1",
        username: "Ms Chan"
      }
    ]
  }, {
    id: "submission-1",
    assignment_id: "assignment-1",
    student_id: "student-1",
    status: "resolved",
    score: 82,
    submitted_at: "2026-06-21T08:05:00.000Z",
    graded_at: null,
    feedback_en: "Well explained.",
    updated_at: "2026-06-21T08:40:00.000Z"
  });

  assert.equal(projected?.studentName, "Ada");
  assert.deepEqual(projected?.feedback, {
    en: "Well explained.",
    zh: "Well explained."
  });
  assert.deepEqual(projected?.correctionRequest, {
    en: "Teacher correction request.",
    zh: "Teacher correction request."
  });
  assert.equal(projected?.correctionDueAt, "2026-06-25T08:00:00.000Z");
  assert.equal(projected?.correctionRound, 1);
  assert.equal(projected?.resolvedAt, "2026-06-21T08:05:00.000Z");
  assert.deepEqual((projected?.attempts as Array<Record<string, unknown>>).map((attempt) => attempt.id), ["attempt-1", "attempt-2"]);
  assert.equal((projected?.latestAttempt as Record<string, unknown>)?.id, "attempt-2");
  assert.equal((projected?.latestGradingRun as Record<string, unknown>)?.id, "run-new");
  assert.equal((projected?.latestTeacherReview as Record<string, unknown>)?.reviewerName, "Ms Chan");
});
