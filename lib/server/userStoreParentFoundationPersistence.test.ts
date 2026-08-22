import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createParentFoundationPersistenceStore,
  type ParentFoundationPersistenceDatabase
} from "@/lib/server/userStore/parentFoundationPersistence";
import type {
  Assignment,
  GuardianLink,
  ParentChildSummary,
  StudentAssignmentItem,
  Submission,
  SubmissionStatus,
  StudentSession
} from "@/types";

function parentSession(id: string): StudentSession {
  return {
    id,
    name: id === "admin-1" ? "Admin One" : "Pat Parent",
    username: id,
    avatarId: "delta",
    grade: "S3",
    curriculumTrack: "HK",
    curriculumProfile: { region: "HK", publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" },
    role: id === "admin-1" ? "admin" : "parent"
  };
}

function childSummary(studentId: string, pendingAssignments = 0): ParentChildSummary {
  return {
    student: {
      id: studentId,
      name: studentId === "student-1" ? "Ada Student" : "Ben Student",
      username: studentId,
      avatarId: "delta",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" },
      role: "student"
    },
    classes: [],
    generatedAt: "2026-06-20T10:00:00.000Z",
    averageMastery: 70,
    learningMinutes7d: 30,
    latestActivityAt: null,
    weeklyActivity: [],
    strengths: [],
    supportTopics: [],
    assignments: Array.from({ length: pendingAssignments }, (_, index) => ({
      assignment: {
        id: `assignment-${studentId}-${index}`,
        classId: "class-1",
        title: { en: "Practice", zh: "Practice" },
        description: { en: "", zh: "" },
        contentType: "practice",
        status: "active",
        dueAt: null,
        allowRetake: true,
        showAnswers: true,
        countTowardsGrade: false,
        createdBy: "teacher-1",
        createdAt: "2026-06-19T00:00:00.000Z",
        updatedAt: "2026-06-19T00:00:00.000Z",
        submissionCount: 1,
        completedCount: 0
      },
      submission: {
        id: `submission-${studentId}-${index}`,
        assignmentId: `assignment-${studentId}-${index}`,
        studentId,
        studentName: studentId === "student-1" ? "Ada Student" : "Ben Student",
        status: "in-progress",
        score: null,
        feedback: null,
        submittedAt: null,
        gradedAt: null,
        correctionRequest: null,
        correctionDueAt: null,
        correctionRound: 0,
        maxCorrectionRounds: 2,
        resolvedAt: null,
        attempts: [],
        latestAttempt: null,
        latestGradingRun: null,
        latestTeacherReview: null,
        updatedAt: "2026-06-19T00:00:00.000Z"
      },
      className: "3A",
      classGrade: "S3"
    })),
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

function createDatabase(): ParentFoundationPersistenceDatabase {
  return {
    guardian_links: [
      {
        id: "link-2",
        parent_id: "parent-1",
        student_id: "student-2",
        status: "active",
        created_at: "2026-06-02T00:00:00.000Z"
      },
      {
        id: "link-1",
        parent_id: "parent-1",
        student_id: "student-1",
        status: "active",
        created_at: "2026-06-01T00:00:00.000Z"
      },
      {
        id: "link-revoked",
        parent_id: "parent-1",
        student_id: "student-3",
        status: "revoked",
        created_at: "2026-06-03T00:00:00.000Z"
      }
    ],
    teacher_messages: [
      {
        guardian_id: "parent-1",
        student_id: "student-1",
        status: "open"
      },
      {
        guardian_id: "parent-1",
        student_id: "student-2",
        status: "resolved"
      }
    ],
    teacher_reports: [
      {
        type: "parent-summary",
        student_id: "student-1"
      },
      {
        type: "class",
        student_id: "student-1"
      },
      {
        type: "parent-summary",
        student_id: "student-3"
      }
    ],
    users: [
      { id: "parent-1", role: "parent" },
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" },
      { id: "student-3", role: "student" },
      { id: "teacher-1", role: "teacher" },
      { id: "admin-1", role: "admin" }
    ]
  };
}

function createTestStore(database: ParentFoundationPersistenceDatabase) {
  return createParentFoundationPersistenceStore({
    readDatabase: async () => database,
    buildParentChildSummary: (_database, studentId) => studentId === "student-1"
      ? childSummary(studentId, 2)
      : childSummary(studentId, 0),
    toGuardianLink: (_database, link) => ({
      id: link.id ?? "",
      parentId: link.parent_id,
      parentName: "Pat Parent",
      studentId: link.student_id,
      studentName: link.student_id,
      studentGrade: "S3",
      relationship: "guardian",
      status: link.status === "active" ? "active" : "revoked",
      inviteCode: "",
      createdBy: link.parent_id,
      createdAt: link.created_at ?? "",
      updatedAt: link.updated_at ?? link.created_at ?? ""
    }) satisfies GuardianLink,
    toParentSession: (_database, user) => parentSession(user.id)
  });
}

test("parent foundation persistence builds foundation data without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/parentFoundationPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const foundation = await createTestStore(createDatabase()).getParentFoundationData("parent-1", "student-2");

  assert.equal(foundation?.parent.id, "parent-1");
  assert.deepEqual(foundation?.links.map((link) => link.id), ["link-1", "link-2"]);
  assert.deepEqual(foundation?.children.map((child) => child.student.id), ["student-1", "student-2"]);
  assert.equal(foundation?.selectedChild?.student.id, "student-2");
  assert.deepEqual(foundation?.totals, {
    children: 2,
    activeReports: 1,
    openMessages: 1,
    pendingAssignments: 2
  });
});

test("parent pending assignment semantics use the exact attention allowlist", async () => {
  const { parentSubmissionNeedsAttention } = await import("@/lib/server/userStore/parentFoundationPersistence");
  const expectations: Record<SubmissionStatus, boolean> = {
    "not-started": true,
    "in-progress": true,
    late: true,
    "correction-required": true,
    submitted: false,
    graded: false,
    "correction-submitted": false,
    resolved: false
  };

  for (const [status, expected] of Object.entries(expectations) as Array<[SubmissionStatus, boolean]>) {
    assert.equal(parentSubmissionNeedsAttention(status), expected, status);
  }
});

test("parent foundation persistence rejects admin reads", async () => {
  const foundation = await createTestStore(createDatabase()).getParentFoundationData("admin-1");

  assert.equal(foundation, null);
});

test("parent foundation persistence fails closed for every explicitly invalid student filter", async () => {
  const store = createTestStore(createDatabase());

  for (const studentId of ["", "student-does-not-exist", "student-3"]) {
    assert.equal(
      await store.getParentFoundationData("parent-1", studentId),
      null,
      `explicit filter ${JSON.stringify(studentId)} must not expand to a linked child`
    );
  }
  assert.equal((await store.getParentFoundationData("parent-1"))?.selectedChild?.student.id, "student-1");
});

test("parent foundation persistence checks child summary access", async () => {
  const store = createTestStore(createDatabase());

  assert.equal((await store.getParentChildSummary("parent-1", "student-1"))?.student.id, "student-1");
  assert.equal(await store.getParentChildSummary("parent-1", "student-3"), null);
  assert.equal(await store.getParentChildSummary("teacher-1", "student-1"), null);
  assert.equal(await store.getParentChildSummary("admin-1", "student-2"), null);
});

test("parent foundation persistence owns parent weekly activity helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentFoundationPersistence");

  assert.equal(typeof helpers.buildParentWeeklyActivity, "function");
  assert.match(persistenceSource, /export function buildParentWeeklyActivity\b/);
  assert.doesNotMatch(rootSource, /function buildParentWeeklyActivity\b/);
  assert.match(rootSource, /buildParentWeeklyActivityFromParentFoundation/);

  assert.deepEqual(
    helpers.buildParentWeeklyActivity({
      guardian_links: [],
      teacher_messages: [],
      teacher_reports: [],
      users: [],
      attempts: [
        {
          user_id: "student-1",
          created_at: "2026-06-20T09:00:00.000Z",
          duration_seconds: 90
        },
        {
          user_id: "student-2",
          created_at: "2026-06-20T09:00:00.000Z",
          duration_seconds: 999
        }
      ],
      lesson_progress: [
        {
          user_id: "student-1",
          updated_at: "2026-06-19T10:00:00.000Z",
          duration_seconds: 120
        }
      ],
      learning_events: [
        {
          id: "event-1",
          user_id: "student-1",
          type: "page-view",
          source: "lesson",
          grade: "S3",
          topic_id: "topic-1",
          created_at: "2026-06-18T11:00:00.000Z"
        },
        {
          id: "event-2",
          user_id: "student-1",
          type: "answer-correct",
          source: "practice",
          grade: "S3",
          topic_id: "topic-1",
          created_at: "2026-06-19T11:00:00.000Z"
        }
      ]
    }, "student-1", 3, new Date("2026-06-20T12:00:00.000Z")),
    [
      { day: "Thu", minutes: 1 },
      { day: "Fri", minutes: 2 },
      { day: "Sat", minutes: 2 }
    ]
  );
});

test("parent foundation persistence owns parent child-summary helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentFoundationPersistence");

  assert.equal(typeof helpers.parentGuardianLinkRecordsFor, "function");
  assert.equal(typeof helpers.parentChildSummariesFor, "function");
  assert.equal(typeof helpers.selectedParentChild, "function");
  assert.match(persistenceSource, /export function parentGuardianLinkRecordsFor\b/);
  assert.match(persistenceSource, /export function parentChildSummariesFor\b/);
  assert.match(persistenceSource, /export function selectedParentChild\b/);
  assert.doesNotMatch(rootSource, /function parentGuardianLinkRecordsFor\b/);
  assert.doesNotMatch(rootSource, /function parentChildSummariesFor\b/);
  assert.doesNotMatch(rootSource, /function selectedParentChild\b/);
  assert.match(rootSource, /parentChildSummariesForFromParentFoundation/);

  const database = createDatabase();
  const children = [childSummary("student-1", 1), childSummary("student-2", 0)];
  assert.deepEqual(
    helpers.parentGuardianLinkRecordsFor(database, { id: "parent-1", role: "parent" }).map((link) => link.id),
    ["link-1", "link-2"]
  );
  assert.deepEqual(
    helpers.parentChildSummariesFor(database, { id: "parent-1", role: "parent" }, (_database, studentId) =>
      studentId === "student-1" ? childSummary(studentId, 1) : childSummary(studentId, 0)
    ).map((summary) => [summary.student.id, summary.assignments.length]),
    [
      ["student-1", 1],
      ["student-2", 0]
    ]
  );
  assert.deepEqual(
    helpers.parentGuardianLinkRecordsFor(database, { id: "admin-1", role: "admin" }).map((link) => link.id),
    []
  );
  assert.equal(helpers.selectedParentChild(children, "student-2")?.student.id, "student-2");
  assert.equal(helpers.selectedParentChild(children, "missing-student"), null);
  assert.equal(helpers.selectedParentChild(children)?.student.id, "student-1");
  assert.equal(helpers.selectedParentChild([]), null);
});

test("parent foundation persistence owns parent assignment item lookup for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentFoundationPersistence");
  const assignmentTemplate = childSummary("student-1", 1).assignments[0].assignment;
  const submissionTemplate = childSummary("student-1", 1).assignments[0].submission;

  assert.equal(typeof helpers.parentAssignmentItemsForStudent, "function");
  assert.match(persistenceSource, /export function parentAssignmentItemsForStudent\b/);
  assert.doesNotMatch(rootSource, /function parentAssignmentItemsForStudent\b/);
  assert.match(rootSource, /parentAssignmentItemsForStudentFromParentFoundation/);

  const database = {
    ...createDatabase(),
    assignments: [
      { id: "assignment-old", class_id: "class-1", updated_at: "2026-06-18T00:00:00.000Z" },
      { id: "assignment-new", class_id: "class-2", updated_at: "2026-06-19T00:00:00.000Z" },
      { id: "assignment-no-class", class_id: "class-missing", updated_at: "2026-06-20T00:00:00.000Z" }
    ],
    submissions: [
      {
        id: "submission-old",
        assignment_id: "assignment-old",
        student_id: "student-1",
        status: "in-progress" as const,
        updated_at: "2026-06-19T09:00:00.000Z"
      },
      {
        id: "submission-new",
        assignment_id: "assignment-new",
        student_id: "student-1",
        status: "submitted" as const,
        updated_at: "2026-06-20T09:00:00.000Z"
      },
      {
        id: "submission-missing-assignment",
        assignment_id: "assignment-missing",
        student_id: "student-1",
        status: "not-started" as const,
        updated_at: "2026-06-21T09:00:00.000Z"
      },
      {
        id: "submission-missing-class",
        assignment_id: "assignment-no-class",
        student_id: "student-1",
        status: "not-started" as const,
        updated_at: "2026-06-22T09:00:00.000Z"
      },
      {
        id: "submission-other-student",
        assignment_id: "assignment-new",
        student_id: "student-2",
        status: "not-started" as const,
        updated_at: "2026-06-23T09:00:00.000Z"
      }
    ],
    teacher_classes: [
      { id: "class-1", name: "3A", grade: "S3" as const },
      { id: "class-2", name: "3B", grade: "S4" as const }
    ]
  };

  const items = helpers.parentAssignmentItemsForStudent(
    database,
    "student-1",
    (_database: typeof database, record: { id: string; class_id: string; updated_at?: string }): Assignment => ({
      ...assignmentTemplate,
      id: record.id,
      classId: record.class_id,
      updatedAt: record.updated_at ?? assignmentTemplate.updatedAt
    }),
    (_database: typeof database, record: { id: string; assignment_id: string; student_id: string; status: Submission["status"]; updated_at: string }): Submission => ({
      ...submissionTemplate,
      id: record.id,
      assignmentId: record.assignment_id,
      studentId: record.student_id,
      status: record.status,
      updatedAt: record.updated_at
    })
  ) as StudentAssignmentItem[];

  assert.deepEqual(
    items.map((item) => [item.assignment.id, item.submission.id, item.className, item.classGrade, item.submission.status]),
    [
      ["assignment-new", "submission-new", "3B", "S4", "submitted"],
      ["assignment-old", "submission-old", "3A", "S3", "in-progress"]
    ]
  );
});

test("parent foundation persistence owns parent child-summary builder for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentFoundationPersistence");
  const assignmentTemplate = childSummary("student-1", 1).assignments[0].assignment;
  const submissionTemplate = childSummary("student-1", 1).assignments[0].submission;

  assert.equal(typeof helpers.buildParentChildSummary, "function");
  assert.match(persistenceSource, /export function buildParentChildSummary\b/);
  assert.doesNotMatch(rootSource, /function buildParentChildSummary\b/);
  assert.match(rootSource, /createParentChildSummaryBuilderFromParentFoundation/);

  const database = {
    ...createDatabase(),
    assignments: [
      { id: "assignment-1", class_id: "class-1", updated_at: "2026-06-20T00:00:00.000Z" }
    ],
    class_enrollments: [
      { class_id: "class-1", student_id: "student-1" }
    ],
    mistakes: [
      { user_id: "student-1", question_id: "question-support", mastered: false },
      { user_id: "student-1", question_id: "question-mastered", mastered: true }
    ],
    student_profiles: [
      { user_id: "student-1", grade: "S3" as const }
    ],
    submissions: [
      {
        id: "submission-1",
        assignment_id: "assignment-1",
        student_id: "student-1",
        status: "in-progress" as const,
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    teacher_classes: [
      { id: "class-1", name: "3A", grade: "S3" as const }
    ],
    topics: [
      { id: "topic-support", grade: "S3" as const, sort_order: 20 },
      { id: "topic-strength", grade: "S3" as const, sort_order: 10 }
    ]
  };

  const summary = helpers.buildParentChildSummary(database, "student-1", {
    latestStudentActivityAt: () => "2026-06-20T10:00:00.000Z",
    motivationSummaryForStudent: () => null,
    now: new Date("2026-06-20T12:00:00.000Z"),
    parentReportsForStudent: () => [{
      id: "report-1",
      type: "parent-summary",
      title: { en: "Weekly report", zh: "每週報告" },
      classId: "class-1",
      studentId: "student-1",
      generatedBy: "teacher-1",
      generatedAt: "2026-06-19T00:00:00.000Z",
      summary: { en: "Good progress", zh: "進展良好" }
    }],
    questionForId: (_database, questionId) => questionId === "question-support"
      ? { topic_id: "topic-support" }
      : { topic_id: "topic-strength" },
    rewardSummaryForStudent: () => ({
      balance: 10,
      available: 4,
      reserved: 1,
      lifetimeEarned: 12,
      spent: 2,
      pendingRequests: 1,
      approvedRequests: 0
    }),
    studentAverageMastery: () => 68,
    toAssignment: (_database, record) => ({
      ...assignmentTemplate,
      id: record.id,
      classId: record.class_id,
      updatedAt: record.updated_at ?? assignmentTemplate.updatedAt
    }),
    toStudentSession: (_database, user) => user.id === "student-1"
      ? { user: childSummary("student-1").student }
      : null,
    toSubmission: (_database, record) => ({
      ...submissionTemplate,
      id: record.id,
      assignmentId: record.assignment_id,
      studentId: record.student_id,
      status: record.status,
      updatedAt: record.updated_at
    }),
    toTeacherClass: (_database, record) => ({
      id: record.id,
      teacherId: "teacher-1",
      name: record.name,
      grade: record.grade,
      academicYear: "2026",
      description: { en: "", zh: "" },
      studentCount: 1,
      inviteCode: "CLASS-1",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z"
    }),
    topicRecordForId: (database, topicId) => database.topics.find((topic) => topic.id === topicId) ?? null,
    toTopicWithProgress: (_database, _studentId, topic) => ({
      id: topic.id,
      curriculumTrack: "HK",
      grade: topic.grade,
      title: { en: topic.id, zh: topic.id },
      description: { en: "", zh: "" },
      status: "in-progress",
      difficulty: "Medium",
      minutes: 10,
      mastery: topic.id === "topic-strength" ? 82 : 45
    }),
    weeklyActivityForStudent: () => [
      { day: "Thu", minutes: 3 },
      { day: "Fri", minutes: 4 }
    ]
  });

  assert.equal(summary?.student.id, "student-1");
  assert.equal(summary?.generatedAt, "2026-06-20T12:00:00.000Z");
  assert.deepEqual(summary?.classes.map((teacherClass) => teacherClass.id), ["class-1"]);
  assert.equal(summary?.averageMastery, 68);
  assert.equal(summary?.learningMinutes7d, 7);
  assert.equal(summary?.latestActivityAt, "2026-06-20T10:00:00.000Z");
  assert.deepEqual(summary?.strengths.map((topic) => topic.id), ["topic-strength"]);
  assert.deepEqual(summary?.supportTopics.map((topic) => topic.id), ["topic-support"]);
  assert.deepEqual(summary?.assignments.map((item) => item.assignment.id), ["assignment-1"]);
  assert.equal(summary?.rewardSummary.available, 4);
  assert.equal(summary?.latestParentReport?.id, "report-1");
  assert.match(summary?.celebrate[0]?.en ?? "", /topic-strength/);
  assert.match(summary?.support[0]?.en ?? "", /topic-support/);
  assert.match(summary?.support[1]?.en ?? "", /1 recent assignment item/);
  assert.equal(helpers.buildParentChildSummary(database, "missing-student", {
    latestStudentActivityAt: () => null,
    motivationSummaryForStudent: () => null,
    parentReportsForStudent: () => [],
    questionForId: () => null,
    rewardSummaryForStudent: () => childSummary("student-1").rewardSummary,
    studentAverageMastery: () => 0,
    toAssignment: (_database, record) => ({ ...assignmentTemplate, id: record.id, classId: record.class_id }),
    toStudentSession: () => null,
    toSubmission: (_database, record) => ({ ...submissionTemplate, id: record.id, assignmentId: record.assignment_id }),
    toTeacherClass: (_database, record) => ({
      id: record.id,
      teacherId: "teacher-1",
      name: record.name,
      grade: record.grade,
      academicYear: "2026",
      description: { en: "", zh: "" },
      studentCount: 1,
      inviteCode: "CLASS-1",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z"
    }),
    topicRecordForId: () => null,
    toTopicWithProgress: (_database, _studentId, topic) => ({
      id: topic.id,
      curriculumTrack: "HK",
      grade: topic.grade,
      title: { en: topic.id, zh: topic.id },
      description: { en: "", zh: "" },
      status: "in-progress",
      difficulty: "Medium",
      minutes: 10,
      mastery: 0
    }),
    weeklyActivityForStudent: () => []
  }), null);
});

test("parent foundation persistence owns parent child-summary builder factory for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentFoundationPersistence");
  const assignmentTemplate = childSummary("student-1", 1).assignments[0].assignment;
  const submissionTemplate = childSummary("student-1", 1).assignments[0].submission;
  const database = {
    ...createDatabase(),
    assignments: [] as Array<{ id: string; class_id: string }>,
    class_enrollments: [] as Array<{ class_id: string; student_id: string }>,
    mistakes: [] as Array<{ user_id: string; question_id: string; mastered?: boolean | null }>,
    student_profiles: [] as Array<{ user_id: string; grade?: StudentAssignmentItem["classGrade"] }>,
    submissions: [] as Array<{
      id: string;
      assignment_id: string;
      student_id: string;
      status: Submission["status"];
      updated_at: string;
    }>,
    teacher_classes: [] as Array<{ id: string; name: string; grade: StudentAssignmentItem["classGrade"] }>,
    topics: [] as Array<{ id: string; grade: StudentAssignmentItem["classGrade"]; sort_order: number }>
  };

  assert.equal(typeof helpers.createParentChildSummaryBuilder, "function");
  assert.match(persistenceSource, /export function createParentChildSummaryBuilder\b/);
  assert.match(rootSource, /createParentChildSummaryBuilderFromParentFoundation/);
  assert.doesNotMatch(rootSource, /const buildParentChildSummaryForParentFoundation = \(\s*database:/);

  const buildSummary = helpers.createParentChildSummaryBuilder({
    latestStudentActivityAt: () => null,
    motivationSummaryForStudent: () => null,
    now: new Date("2026-06-21T00:00:00.000Z"),
    parentReportsForStudent: () => [],
    questionForId: () => null,
    rewardSummaryForStudent: () => childSummary("student-1").rewardSummary,
    studentAverageMastery: () => 0,
    toAssignment: (_database, record) => ({ ...assignmentTemplate, id: record.id, classId: record.class_id }),
    toStudentSession: (_database, user) => user.id === "student-1"
      ? { user: childSummary("student-1").student }
      : null,
    toSubmission: (_database, record) => ({ ...submissionTemplate, id: record.id, assignmentId: record.assignment_id }),
    toTeacherClass: (_database, record) => ({
      id: record.id,
      teacherId: "teacher-1",
      name: record.name,
      grade: record.grade,
      academicYear: "2026",
      description: { en: "", zh: "" },
      studentCount: 0,
      inviteCode: "CLASS-1",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z"
    }),
    topicRecordForId: () => null,
    toTopicWithProgress: (_database, _studentId, topic) => ({
      id: topic.id,
      curriculumTrack: "HK",
      grade: topic.grade,
      title: { en: topic.id, zh: topic.id },
      description: { en: "", zh: "" },
      status: "in-progress",
      difficulty: "Medium",
      minutes: 10,
      mastery: 0
    }),
    weeklyActivityForStudent: () => []
  }, (sourceDatabase: typeof database) => sourceDatabase);

  const summary = buildSummary(database, "student-1");
  assert.equal(summary?.student.id, "student-1");
  assert.equal(summary?.generatedAt, "2026-06-21T00:00:00.000Z");
});

test("parent foundation persistence owns parent class and topic candidate helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentFoundationPersistence");
  const database = {
    ...createDatabase(),
    class_enrollments: [
      { id: "enrollment-2", class_id: "class-2", student_id: "student-1" },
      { id: "enrollment-missing", class_id: "class-missing", student_id: "student-1" },
      { id: "enrollment-1", class_id: "class-1", student_id: "student-1" },
      { id: "enrollment-other", class_id: "class-3", student_id: "student-2" }
    ],
    teacher_classes: [
      { id: "class-1", name: "3A", grade: "S3" as const },
      { id: "class-2", name: "4A", grade: "S4" as const },
      { id: "class-3", name: "2A", grade: "S2" as const }
    ],
    student_profiles: [
      { user_id: "student-1", grade: "P6" as const },
      { user_id: "student-2", grade: "S2" as const }
    ],
    topics: [
      { id: "topic-s4", grade: "S4" as const, sort_order: 40 },
      { id: "topic-p6", grade: "P6" as const, sort_order: 10 },
      { id: "topic-s3", grade: "S3" as const, sort_order: 30 },
      { id: "topic-s2", grade: "S2" as const, sort_order: 20 }
    ]
  };

  assert.equal(typeof helpers.teacherClassesForStudent, "function");
  assert.equal(typeof helpers.parentTopicIdsForStudent, "function");
  assert.match(persistenceSource, /export function teacherClassesForStudent\b/);
  assert.match(persistenceSource, /export function parentTopicIdsForStudent\b/);
  assert.doesNotMatch(rootSource, /function teacherClassesForStudent\b/);
  assert.doesNotMatch(rootSource, /function parentTopicIdsForStudent\b/);
  assert.match(rootSource, /teacherClassesForStudentFromParentFoundation/);
  assert.match(rootSource, /parentTopicIdsForStudentFromParentFoundation/);

  const classes = helpers.teacherClassesForStudent(database, "student-1");
  assert.deepEqual(classes.map((teacherClass) => teacherClass.id), ["class-2", "class-1"]);
  assert.deepEqual(
    helpers.parentTopicIdsForStudent(database, "student-1", classes),
    ["topic-p6", "topic-s3", "topic-s4"]
  );
});

test("legacy userStore delegates parent foundation operations through parent domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getParentFoundationData = parentUserStore\.getParentFoundationData/);
  assert.match(source, /export const getParentChildSummary = parentUserStore\.getParentChildSummary/);
  assert.doesNotMatch(source, /export async function getParentFoundationData/);
  assert.doesNotMatch(source, /export async function getParentChildSummary/);
});
