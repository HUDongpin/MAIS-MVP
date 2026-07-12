import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsOperationsPersistenceStore,
  teacherOpsOperationsTimestampOf,
  type TeacherOpsOperationsPersistenceDatabase,
  type TeacherOpsOperationsPersistenceStoreDependencies
} from "@/lib/server/userStore/teacherOpsOperationsPersistence";
import type {
  ClassRosterProfile,
  PrepTeam,
  StudentSession,
  TeacherClass,
  TeacherClassCollaborator,
  TeacherAnalyticsData,
  TeacherDashboardData,
  TeacherMissingWorkItem,
  TeacherNotice,
  TeacherOperationsData,
  TeacherReminderRun,
  TermArchive
} from "@/types";

const fixedNow = "2026-06-21T10:00:00.000Z";

function teacherSession(): StudentSession {
  return {
    id: "teacher-1",
    name: "Tess Teacher",
    username: "tess",
    avatarId: "delta",
    grade: "S3",
    curriculumTrack: "HK",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
    },
    role: "teacher"
  };
}

function dashboardData(id: string): TeacherDashboardData {
  return {
    generatedAt: fixedNow,
    teacher: teacherSession(),
    kpis: {
      pendingGrading: 0,
      pendingCorrectionReview: 0,
      correctionsRequired: 0,
      unrepliedMessages: 0,
      weeklyAssignmentCompletionRate: 100,
      atRiskStudents: 0
    },
    rewardSummary: {
      pendingRedemptions: 0,
      approvedRedemptions: 0,
      pointsAwardedThisWeek: 0,
      topStudentName: null,
      topStudentAvailablePoints: 0
    },
    classSummaries: [{
      classId: id,
      className: id,
      grade: "S3",
      studentCount: 1,
      averageMastery: 80,
      assignmentCompletionRate: 100,
      activeAssignments: 0,
      atRiskStudents: 0,
      href: `/teacher/classes/${id}`
    }],
    masteryHeatmap: [],
    actionQueue: []
  };
}

function analyticsData(selectedClassId: string | null | undefined): TeacherAnalyticsData {
  return {
    generatedAt: fixedNow,
    selectedClassId: selectedClassId && selectedClassId !== "all" ? selectedClassId : "all",
    classes: [classProjection(createDatabase(), createDatabase().teacher_classes[0])],
    summary: {
      averageMastery: 75,
      atRiskStudents: 1,
      averageAnswerSeconds: 42,
      hintRequests7d: 2,
      aiTutorMessages7d: 3,
      activeStudents7d: 1,
      activeStudents30d: 1
    },
    topicMastery: [],
    studentRisks: [],
    frequentMistakes: [],
    activityTrend7d: [],
    activityTrend30d: [],
    interventionGroups: []
  };
}

function classProjection(
  _database: TeacherOpsOperationsPersistenceDatabase,
  record: TeacherOpsOperationsPersistenceDatabase["teacher_classes"][number]
): TeacherClass {
  return {
    id: record.id,
    teacherId: record.teacher_id,
    name: record.name,
    grade: record.grade,
    curriculumTrack: "HK",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
    },
    academicYear: "2026",
    description: { en: record.name, zh: record.name },
    studentCount: record.id === "class-owned" ? 2 : 1,
    inviteCode: record.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: record.updated_at
  };
}

function noticeProjection(
  _database: TeacherOpsOperationsPersistenceDatabase,
  notice: TeacherOpsOperationsPersistenceDatabase["teacher_notices"][number]
): TeacherNotice {
  const pending = notice.id === "notice-owned-new" ? 2 : 0;
  return {
    id: notice.id,
    teacherId: notice.teacher_id,
    classId: notice.class_id,
    className: notice.class_id,
    audience: "parents",
    channelId: "manual",
    channelName: "Manual",
    subject: { en: notice.id, zh: notice.id },
    body: { en: notice.id, zh: notice.id },
    status: notice.status,
    dueAt: null,
    createdAt: notice.updated_at,
    updatedAt: notice.updated_at,
    sentAt: null,
    recipients: [],
    deliveryAttempts: [],
    acknowledgement: {
      total: pending,
      acknowledged: 0,
      pending
    }
  };
}

function reminderProjection(
  _database: TeacherOpsOperationsPersistenceDatabase,
  run: TeacherOpsOperationsPersistenceDatabase["teacher_reminder_runs"][number]
): TeacherReminderRun {
  return {
    id: run.id,
    teacherId: run.teacher_id,
    classId: run.class_id,
    assignmentId: run.assignment_id,
    studentId: run.student_id,
    noticeId: run.notice_id,
    threshold: run.threshold,
    status: run.status,
    reason: run.reason,
    createdAt: run.created_at
  };
}

function createDatabase(): TeacherOpsOperationsPersistenceDatabase {
  return {
    prep_teams: [
      {
        id: "prep-owned",
        teacher_ids: ["teacher-1"],
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "prep-other",
        teacher_ids: ["teacher-2"],
        updated_at: "2026-06-21T10:00:00.000Z"
      }
    ],
    school_memberships: [],
    teacher_class_collaborators: [
      {
        id: "collab-owned",
        class_id: "class-owned",
        teacher_id: "teacher-2",
        role: "co-teacher",
        status: "active"
      },
      {
        id: "collab-shared",
        class_id: "class-shared",
        teacher_id: "teacher-1",
        role: "viewer",
        status: "active"
      }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        name: "S3A",
        grade: "S3",
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "class-shared",
        teacher_id: "teacher-2",
        name: "S4B",
        grade: "S4",
        updated_at: "2026-06-19T10:00:00.000Z"
      },
      {
        id: "class-other",
        teacher_id: "teacher-2",
        name: "S5C",
        grade: "S5",
        updated_at: "2026-06-18T10:00:00.000Z"
      }
    ],
    teacher_notices: [
      {
        id: "notice-owned-new",
        teacher_id: "teacher-1",
        class_id: "class-owned",
        status: "queued",
        updated_at: "2026-06-21T08:00:00.000Z"
      },
      {
        id: "notice-owned-old",
        teacher_id: "teacher-1",
        class_id: "class-owned",
        status: "sent",
        updated_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "notice-shared",
        teacher_id: "teacher-2",
        class_id: "class-shared",
        status: "sent",
        updated_at: "2026-06-21T09:00:00.000Z"
      },
      {
        id: "notice-other",
        teacher_id: "teacher-2",
        class_id: "class-other",
        status: "sent",
        updated_at: "2026-06-21T07:00:00.000Z"
      }
    ],
    teacher_reminder_runs: [
      {
        id: "run-owned-new",
        teacher_id: "teacher-1",
        class_id: "class-owned",
        assignment_id: "assignment-1",
        student_id: "student-1",
        threshold: "overdue-24h",
        status: "sent",
        reason: "overdue",
        created_at: "2026-06-21T08:30:00.000Z"
      },
      {
        id: "run-shared",
        teacher_id: "teacher-2",
        class_id: "class-shared",
        assignment_id: "assignment-2",
        student_id: "student-3",
        threshold: "due-24h",
        status: "skipped",
        reason: "quiet",
        created_at: "2026-06-21T09:30:00.000Z"
      }
    ],
    term_archives: [
      {
        id: "archive-owned",
        class_id: "class-owned",
        created_at: "2026-06-19T10:00:00.000Z"
      },
      {
        id: "archive-shared",
        class_id: "class-shared",
        created_at: "2026-06-18T10:00:00.000Z"
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
  database: TeacherOpsOperationsPersistenceDatabase,
  overrides: Partial<TeacherOpsOperationsPersistenceStoreDependencies> = {}
) {
  const dependencies: TeacherOpsOperationsPersistenceStoreDependencies = {
    analyticsDataFromPostgresProjection: async () => undefined,
    buildAnalyticsData: (_source, _userId, selectedClassId) => analyticsData(selectedClassId),
    buildDashboardData: (_source, userId) => dashboardData(`fallback-${userId}`),
    dashboardDataFromPostgresProjection: async () => undefined,
    classProjection,
    collaboratorsForClass: (_source, teacherClass) => teacherClass.id === "class-owned"
      ? [{
        id: "collab-owned",
        classId: "class-owned",
        teacherId: "teacher-2",
        teacherName: "Shared Teacher",
        teacherUsername: "shared",
        role: "co-teacher",
        status: "active",
        invitedBy: "teacher-1",
        createdAt: fixedNow,
        updatedAt: fixedNow
      } satisfies TeacherClassCollaborator]
      : [],
    getNotificationSummary: (classId) => ({
      enabled: true,
      channels: [{
        id: `channel-${classId ?? "all"}`,
        name: `Channel ${classId ?? "all"}`,
        envKey: "WECOM_WEBHOOK_URL",
        configured: true
      }]
    }),
    isStorageFreeExampleTeacher: (userId) => userId === "storage-free-teacher",
    missingWorkForClasses: (_source, classes) => classes.map((teacherClass, index) => ({
      assignmentId: `assignment-${teacherClass.id}`,
      assignmentTitle: { en: "Homework", zh: "Homework" },
      classId: teacherClass.id,
      className: teacherClass.name,
      studentId: `student-${index + 1}`,
      studentName: `Student ${index + 1}`,
      submissionId: `missing-${index + 1}`,
      submissionStatus: "not-started",
      dueAt: "2026-06-20T10:00:00.000Z",
      nextThreshold: "overdue-24h",
      lastReminderAt: null
    } satisfies TeacherMissingWorkItem)),
    noticeProjection,
    now: () => new Date(fixedNow),
    prepTeamProjection: (_source, team) => ({
      id: team.id,
      name: { en: team.id, zh: team.id },
      description: { en: team.id, zh: team.id },
      teacherIds: team.teacher_ids,
      members: [],
      shares: [],
      createdBy: "teacher-1",
      createdAt: team.updated_at,
      updatedAt: team.updated_at
    } satisfies PrepTeam),
    readDatabase: async () => database,
    reminderPolicy: {
      enabled: true,
      thresholds: ["due-24h", "overdue-24h"],
      quietHours: {
        start: "21:00",
        end: "07:00"
      }
    },
    reminderRunProjection: reminderProjection,
    rosterProfilesForClass: (_source, classId) => classId === "class-owned"
      ? [{
        enrollmentId: "enrollment-1",
        classId,
        studentId: "student-1",
        studentName: "Ada Student",
        grade: "S3",
        seatRow: null,
        seatColumn: null,
        displayOrder: 1,
        guardianCount: 1,
        guardianStatus: "linked",
        updatedAt: fixedNow
      } satisfies ClassRosterProfile]
      : [],
    storageFreeExampleDatabase: (userId) => userId === "storage-free-teacher" ? database : null,
    teacherSessionProjection: () => teacherSession(),
    termArchiveProjection: (archive) => ({
      id: archive.id,
      classId: archive.class_id,
      className: archive.class_id,
      termLabel: "Term 1",
      createdBy: "teacher-1",
      createdAt: archive.created_at,
      snapshot: {
        studentCount: 2,
        assignmentCount: 1,
        submissionCount: 1,
        reportCount: 0,
        averageCompletionRate: 50
      },
      exportUrl: `/api/teacher/term-archives/${archive.id}/export`
    } satisfies TermArchive),
    ...overrides
  };
  return createTeacherOpsOperationsPersistenceStore(dependencies);
}

test("teacher ops operations persistence builds selected-class dashboard data without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const data = await createTestStore(createDatabase()).getTeacherOperationsData("teacher-1", "class-owned");

  assert.equal(data?.generatedAt, fixedNow);
  assert.equal(data?.teacher.id, "teacher-1");
  assert.deepEqual(data?.classes.map((teacherClass) => teacherClass.id), ["class-owned", "class-shared"]);
  assert.equal(data?.selectedClassId, "class-owned");
  assert.deepEqual(data?.notices.map((notice) => notice.id), ["notice-owned-new", "notice-owned-old"]);
  assert.deepEqual(data?.reminderRuns.map((run) => run.id), ["run-owned-new"]);
  assert.deepEqual(data?.missingWork.map((item) => item.classId), ["class-owned"]);
  assert.deepEqual(data?.roster.map((profile) => profile.studentName), ["Ada Student"]);
  assert.deepEqual(data?.collaborators.map((collaborator) => collaborator.id), ["collab-owned"]);
  assert.deepEqual(data?.prepTeams.map((team) => team.id), ["prep-owned"]);
  assert.deepEqual(data?.termArchives.map((archive) => archive.id), ["archive-owned"]);
  assert.deepEqual(data?.totals, {
    notices: 2,
    pendingAcknowledgements: 2,
    missingWork: 1,
    collaborators: 1,
    archives: 1
  });
});

test("teacher ops operations persistence falls back to first class and rejects non-teachers", async () => {
  const store = createTestStore(createDatabase());
  const data = await store.getTeacherOperationsData("teacher-1", "missing-class");

  assert.equal(data?.selectedClassId, "class-owned");
  assert.deepEqual(data?.notices.map((notice) => notice.id), ["notice-owned-new", "notice-owned-old"]);
  assert.equal(await store.getTeacherOperationsData("student-1"), null);
  assert.equal(await store.getTeacherOperationsData("missing-user"), null);
});

test("teacher ops operations persistence builds teacher dashboard data through extracted storage selection", async () => {
  const database = createDatabase();
  let snapshotReads = 0;
  const store = createTestStore(database, {
    buildDashboardData: (_source, userId) => dashboardData(`fallback-${userId}`),
    dashboardDataFromPostgresProjection: async (userId) => userId === "projected-teacher"
      ? dashboardData("projected")
      : userId === "missing-projected-teacher"
        ? null
        : undefined,
    isStorageFreeExampleTeacher: (userId) => userId === "storage-free-teacher",
    readDatabase: async () => {
      snapshotReads += 1;
      return database;
    },
    storageFreeExampleDatabase: (userId) => userId === "storage-free-teacher" ? database : null
  });

  assert.equal((await store.getTeacherDashboardData("storage-free-teacher"))?.classSummaries[0]?.classId, "fallback-storage-free-teacher");
  assert.equal((await store.getTeacherDashboardData("projected-teacher"))?.classSummaries[0]?.classId, "projected");
  assert.equal(await store.getTeacherDashboardData("missing-projected-teacher"), null);
  assert.equal((await store.getTeacherDashboardData("fallback-teacher"))?.classSummaries[0]?.classId, "fallback-fallback-teacher");
  assert.equal(snapshotReads, 1);
});

test("teacher operations persistence owns dashboard data builder factory for legacy dashboard", async () => {
  type DashboardClass = {
    id: string;
    teacher_id: string;
    name: string;
    grade: "S3";
  };
  type DashboardTopic = {
    id: string;
    grade: "S3";
    sort_order: number;
    title_en: string;
    title_zh: string;
    curriculum: "in-scope" | "out-of-scope";
  };
  type DashboardSubmission = {
    id: string;
    assignment_id: string;
    student_id: string;
    status: "not-started" | "submitted" | "graded" | "correction-required" | "corrected";
    submitted_at: string | null;
    updated_at: string;
  };
  type DashboardDatabase = {
    users: Array<{ id: string; role: "teacher" | "admin" | "student" }>;
    teacher_classes: DashboardClass[];
    class_enrollments: Array<{ class_id: string; student_id: string }>;
    student_profiles: Array<{ user_id: string; name: string }>;
    assignments: Array<{
      id: string;
      class_id: string;
      title_en: string;
      title_zh: string;
      status: "active" | "draft" | "closed";
      due_at: string | null;
      created_at: string;
      updated_at: string;
    }>;
    submissions: DashboardSubmission[];
    assignment_teacher_reviews: Array<{
      submission_id: string;
      correction_due_at: string | null;
      created_at: string;
    }>;
    mistakes: Array<{
      user_id: string;
      wrong_attempts: number;
      mastered: boolean;
      last_attempt_at: string;
    }>;
    attempts: Array<{ user_id: string; created_at: string }>;
    learning_events: Array<{ user_id: string; created_at: string }>;
    visualization_sessions: Array<{ user_id: string; updated_at: string }>;
    ai_tutor_messages: Array<{ user_id: string; created_at: string }>;
    lesson_progress: Array<{ user_id: string; topic_id: string; mastery: number }>;
    topics: DashboardTopic[];
  };

  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const createDashboardDataBuilder = helpers.createTeacherOpsDashboardDataBuilder as (dependencies: {
    now: () => Date;
    canUseTeacherArea: (user?: { id: string; role: string } | null) => user is { id: string; role: "teacher" | "admin" };
    teacherSessionProjection: (database: DashboardDatabase, user: { id: string; role: "teacher" | "admin" }) => StudentSession | null;
    classRecordsForUser: (database: DashboardDatabase, user: { id: string }) => DashboardClass[];
    curriculumProfileForClass: (database: DashboardDatabase, teacherClass: DashboardClass) => "in-scope";
    isCurriculumTopic: (topic: DashboardTopic, profile: "in-scope") => boolean;
    localizedTopic: (topic: DashboardTopic) => { en: string; zh: string };
    teacherMessagesFor: (
      database: DashboardDatabase,
      user: { id: string },
      classIds: Set<string>
    ) => Array<{
      id: string;
      class_id?: string;
      student_id: string;
      status: "open" | "resolved";
      priority: "normal" | "urgent";
      subject_en: string;
      subject_zh: string;
      last_message_at: string;
    }>;
    isSubmissionComplete: (submission: DashboardSubmission) => boolean;
    needsTeacherGrading: (submission: DashboardSubmission) => boolean;
    needsCorrectionReview: (submission: DashboardSubmission) => boolean;
    rewardSummary: (
      database: DashboardDatabase,
      user: { id: string },
      nowMs: number
    ) => TeacherDashboardData["rewardSummary"];
  }) => (database: DashboardDatabase, userId: string) => TeacherDashboardData | null;
  const database: DashboardDatabase = {
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "student-1", role: "student" }
    ],
    teacher_classes: [
      { id: "class-a", teacher_id: "teacher-1", name: "S3A", grade: "S3" }
    ],
    class_enrollments: [{ class_id: "class-a", student_id: "student-1" }],
    student_profiles: [{ user_id: "student-1", name: "Ada" }],
    assignments: [{
      id: "assignment-1",
      class_id: "class-a",
      title_en: "Weekly algebra",
      title_zh: "每週代數",
      status: "active",
      due_at: "2026-06-20T10:00:00.000Z",
      created_at: "2026-06-19T10:00:00.000Z",
      updated_at: "2026-06-20T08:00:00.000Z"
    }],
    submissions: [{
      id: "submission-1",
      assignment_id: "assignment-1",
      student_id: "student-1",
      status: "submitted",
      submitted_at: "2026-06-20T09:00:00.000Z",
      updated_at: "2026-06-20T09:00:00.000Z"
    }],
    assignment_teacher_reviews: [],
    mistakes: [{
      user_id: "student-1",
      wrong_attempts: 3,
      mastered: false,
      last_attempt_at: "2026-06-20T07:00:00.000Z"
    }],
    attempts: [{ user_id: "student-1", created_at: "2026-06-20T08:00:00.000Z" }],
    learning_events: [],
    visualization_sessions: [],
    ai_tutor_messages: Array.from({ length: 5 }, (_, index) => ({
      user_id: "student-1",
      created_at: `2026-06-20T08:0${index}:00.000Z`
    })),
    lesson_progress: [{ user_id: "student-1", topic_id: "topic-1", mastery: 50 }],
    topics: [{
      id: "topic-1",
      grade: "S3",
      sort_order: 1,
      title_en: "Linear equations",
      title_zh: "一次方程",
      curriculum: "in-scope"
    }]
  };
  const buildDashboardData = createDashboardDataBuilder({
    now: () => new Date(fixedNow),
    canUseTeacherArea: (user): user is { id: string; role: "teacher" | "admin" } =>
      user?.role === "teacher" || user?.role === "admin",
    teacherSessionProjection: () => teacherSession(),
    classRecordsForUser: (sourceDatabase, user) =>
      sourceDatabase.teacher_classes.filter((teacherClass) => teacherClass.teacher_id === user.id),
    curriculumProfileForClass: () => "in-scope",
    isCurriculumTopic: (topic, profile) => topic.curriculum === profile,
    localizedTopic: (topic) => ({ en: topic.title_en, zh: topic.title_zh }),
    teacherMessagesFor: () => [{
      id: "thread-1",
      class_id: "class-a",
      student_id: "student-1",
      status: "open",
      priority: "urgent",
      subject_en: "Parent question",
      subject_zh: "家長問題",
      last_message_at: "2026-06-21T08:00:00.000Z"
    }],
    isSubmissionComplete: (submission) => submission.status === "submitted" || submission.status === "graded",
    needsTeacherGrading: (submission) => submission.status === "submitted",
    needsCorrectionReview: (submission) => submission.status === "corrected",
    rewardSummary: () => ({
      pendingRedemptions: 1,
      approvedRedemptions: 2,
      pointsAwardedThisWeek: 30,
      topStudentName: "Ada",
      topStudentAvailablePoints: 120
    })
  });

  assert.equal(typeof createDashboardDataBuilder, "function");
  assert.match(persistenceSource, /export function createTeacherOpsDashboardDataBuilder\b/);
  assert.match(rootSource, /createTeacherOpsDashboardDataBuilder/);
  assert.doesNotMatch(rootSource, /function buildTeacherDashboardDataFromDatabase\b/);

  const result = buildDashboardData(database, "teacher-1");
  assert.ok(result);
  assert.equal(result.generatedAt, fixedNow);
  assert.equal(result.teacher.id, "teacher-1");
  assert.deepEqual(result.kpis, {
    pendingGrading: 1,
    pendingCorrectionReview: 0,
    correctionsRequired: 0,
    unrepliedMessages: 1,
    weeklyAssignmentCompletionRate: 100,
    atRiskStudents: 1
  });
  assert.deepEqual(result.rewardSummary, {
    pendingRedemptions: 1,
    approvedRedemptions: 2,
    pointsAwardedThisWeek: 30,
    topStudentName: "Ada",
    topStudentAvailablePoints: 120
  });
  assert.deepEqual(result.classSummaries.map((summary) => ({
    classId: summary.classId,
    averageMastery: summary.averageMastery,
    assignmentCompletionRate: summary.assignmentCompletionRate,
    activeAssignments: summary.activeAssignments,
    atRiskStudents: summary.atRiskStudents
  })), [{
    classId: "class-a",
    averageMastery: 50,
    assignmentCompletionRate: 100,
    activeAssignments: 1,
    atRiskStudents: 1
  }]);
  assert.deepEqual(result.masteryHeatmap.map((cell) => ({
    id: cell.id,
    topicTitle: cell.topicTitle,
    averageMastery: cell.averageMastery,
    weakStudentCount: cell.weakStudentCount
  })), [{
    id: "class-a-topic-1",
    topicTitle: { en: "Linear equations", zh: "一次方程" },
    averageMastery: 50,
    weakStudentCount: 1
  }]);
  assert.deepEqual(result.actionQueue.map((item) => item.id).sort(), [
    "ai-tutor-student-1",
    "grading-submission-1",
    "message-thread-1",
    "mistakes-student-1"
  ]);
  assert.equal(buildDashboardData(database, "student-1"), null);
});

test("teacher ops operations persistence prefers projected teacher analytics before full snapshot fallback", async () => {
  const database = createDatabase();
  let snapshotReads = 0;
  let fallbackBuilds = 0;
  const store = createTestStore(database, {
    analyticsDataFromPostgresProjection: async (_userId, selectedClassId) => selectedClassId === "class-owned"
      ? analyticsData("projected-class")
      : selectedClassId === "missing-class"
        ? null
        : undefined,
    buildAnalyticsData: (_source, _userId, selectedClassId) => {
      fallbackBuilds += 1;
      return analyticsData(`fallback-${selectedClassId ?? "all"}`);
    },
    readDatabase: async () => {
      snapshotReads += 1;
      return database;
    }
  });

  const projected = await store.getTeacherAnalyticsData("teacher-1", "class-owned");
  assert.equal(projected?.selectedClassId, "projected-class");
  assert.equal(snapshotReads, 0);
  assert.equal(fallbackBuilds, 0);

  const missing = await store.getTeacherAnalyticsData("teacher-1", "missing-class");
  assert.equal(missing, null);
  assert.equal(snapshotReads, 0);
  assert.equal(fallbackBuilds, 0);

  const fallback = await store.getTeacherAnalyticsData("teacher-1", "class-shared");
  assert.equal(fallback?.selectedClassId, "fallback-class-shared");
  assert.equal(snapshotReads, 1);
  assert.equal(fallbackBuilds, 1);
});

test("teacher ops operations persistence builds teacher analytics data through extracted entrypoint", async () => {
  const database = createDatabase();
  let capturedUserId: string | null = null;
  let capturedClassId: string | null | undefined = undefined;
  let snapshotReads = 0;
  const store = createTestStore(database, {
    buildAnalyticsData: (_source, userId, selectedClassId) => {
      capturedUserId = userId;
      capturedClassId = selectedClassId;
      return analyticsData(selectedClassId);
    },
    readDatabase: async () => {
      snapshotReads += 1;
      return database;
    }
  });

  const analytics = await store.getTeacherAnalyticsData("teacher-1", "class-owned");

  assert.equal(analytics?.selectedClassId, "class-owned");
  assert.equal(capturedUserId, "teacher-1");
  assert.equal(capturedClassId, "class-owned");
  assert.equal(snapshotReads, 1);
});

test("teacher operations class helpers live in operations persistence, not root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof helpers.teacherOperationClassRecordsFor, "function");
  assert.equal(typeof helpers.teacherCanReadOperationsClass, "function");
  assert.equal(typeof helpers.teacherCanMutateOperationsClass, "function");
  assert.equal(typeof helpers.teacherCanManageOperationsClass, "function");
  assert.match(persistenceSource, /export function teacherOperationClassRecordsFor\b/);
  assert.match(persistenceSource, /export function teacherCanReadOperationsClass\b/);
  assert.match(persistenceSource, /export function teacherCanMutateOperationsClass\b/);
  assert.match(persistenceSource, /export function teacherCanManageOperationsClass\b/);
  assert.doesNotMatch(rootSource, /function teacherOperationClassRecordsFor\(/);
  assert.doesNotMatch(rootSource, /function teacherCanReadOperationsClass\(/);
  assert.doesNotMatch(rootSource, /function teacherCanMutateOperationsClass\(/);
  assert.doesNotMatch(rootSource, /function teacherCanManageOperationsClass\(/);
  assert.match(rootSource, /teacherOperationClassRecordsFor as teacherOperationClassRecordsForFromTeacherOpsOperations/);
  assert.match(rootSource, /teacherCanMutateOperationsClass as teacherCanMutateOperationsClassFromTeacherOpsOperations/);

  const teacherOperationClassRecordsFor = helpers.teacherOperationClassRecordsFor as (
    database: TeacherOpsOperationsPersistenceDatabase,
    user: { id: string; role: "teacher" | "admin" | "student" }
  ) => TeacherOpsOperationsPersistenceDatabase["teacher_classes"];
  const teacherCanReadOperationsClass = helpers.teacherCanReadOperationsClass as (
    database: TeacherOpsOperationsPersistenceDatabase,
    user: { id: string; role: "teacher" | "admin" | "student" },
    classId: string
  ) => TeacherOpsOperationsPersistenceDatabase["teacher_classes"][number] | null;
  const teacherCanMutateOperationsClass = helpers.teacherCanMutateOperationsClass as typeof teacherCanReadOperationsClass;
  const teacherCanManageOperationsClass = helpers.teacherCanManageOperationsClass as typeof teacherCanReadOperationsClass;
  const database = createDatabase();

  assert.deepEqual(
    teacherOperationClassRecordsFor(database, { id: "teacher-1", role: "teacher" }).map((teacherClass) => teacherClass.id),
    ["class-owned", "class-shared"]
  );
  assert.deepEqual(
    teacherOperationClassRecordsFor(database, { id: "admin-1", role: "admin" }).map((teacherClass) => teacherClass.id),
    ["class-owned", "class-shared", "class-other"]
  );
  assert.deepEqual(
    teacherOperationClassRecordsFor(database, { id: "student-1", role: "student" }).map((teacherClass) => teacherClass.id),
    []
  );
  assert.equal(teacherCanReadOperationsClass(database, { id: "teacher-1", role: "teacher" }, "class-shared")?.id, "class-shared");
  assert.equal(teacherCanReadOperationsClass(database, { id: "teacher-1", role: "teacher" }, "class-other"), null);
  assert.equal(teacherCanMutateOperationsClass(database, { id: "teacher-1", role: "teacher" }, "class-shared"), null);
  assert.equal(teacherCanMutateOperationsClass(database, { id: "teacher-2", role: "teacher" }, "class-owned")?.id, "class-owned");
  assert.equal(teacherCanManageOperationsClass(database, { id: "teacher-1", role: "teacher" }, "class-owned")?.id, "class-owned");
  assert.equal(teacherCanManageOperationsClass(database, { id: "teacher-1", role: "teacher" }, "class-shared"), null);
  assert.equal(teacherCanManageOperationsClass(database, { id: "admin-1", role: "admin" }, "class-other")?.id, "class-other");
  assert.equal(teacherCanReadOperationsClass(database, { id: "teacher-1", role: "teacher" }, "missing-class"), null);
});

test("teacher operations persistence owns timestamp helper for legacy analytics projections", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(persistenceSource, /function timestampOf\(/);
  assert.match(persistenceSource, /export const teacherOpsOperationsTimestampOf = timestampOf;/);
  assert.match(rootSource, /teacherOpsOperationsTimestampOf as timestampOfFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /function timestampOf\(/);
  assert.equal(teacherOpsOperationsTimestampOf("2026-06-21T10:00:00.000Z"), Date.parse("2026-06-21T10:00:00.000Z"));
  assert.equal(teacherOpsOperationsTimestampOf(null), null);
  assert.equal(teacherOpsOperationsTimestampOf(undefined), null);
  assert.equal(teacherOpsOperationsTimestampOf("not-a-date"), null);
});

test("teacher operations persistence owns analytics record merge helper", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const mergeRecords = helpers.teacherOpsMergeAnalyticsRecordsBy as
    | (<T>(records: T[], overlay: T[], keyFor: (record: T) => string | null) => T[])
    | undefined;
  const baseline = [
    { id: "attempt-a", value: "baseline-a" },
    { id: "attempt-b", value: "baseline-b" },
    { id: "", value: "ignored-baseline" }
  ];
  const overlay = [
    { id: "attempt-b", value: "overlay-b" },
    { id: "attempt-c", value: "overlay-c" },
    { id: "", value: "ignored-overlay" }
  ];

  assert.equal(typeof mergeRecords, "function");
  assert.match(persistenceSource, /export function teacherOpsMergeAnalyticsRecordsBy\b/);
  assert.match(rootSource, /teacherOpsMergeAnalyticsRecordsBy as mergeTeacherAnalyticsRecordsByFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /function mergeTeacherAnalyticsRecordsBy\b/);
  assert.deepEqual(
    mergeRecords?.(baseline, overlay, (record) => record.id || null),
    [
      { id: "attempt-a", value: "baseline-a" },
      { id: "attempt-b", value: "overlay-b" },
      { id: "attempt-c", value: "overlay-c" }
    ]
  );
});

test("teacher operations persistence owns analytics lesson progress upsert helper", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const upsertProgress = helpers.teacherOpsUpsertAnalyticsLessonProgressFromAttempts as
    | ((input: {
        database: {
          attempts: Array<{ user_id: string; question_id: string; created_at: string; is_correct: boolean }>;
          lesson_progress: Array<{
            user_id: string;
            topic_id: string;
            lesson_slug?: string;
            status: "not-started" | "in-progress" | "completed";
            mastery: number;
            started_at?: string | null;
            completed_at: string | null;
            duration_seconds?: number | null;
            checklist_state?: Record<string, boolean>;
            updated_at: string;
          }>;
        };
        lessonSlugForTopic: (topicId: string) => string;
        topicIdForQuestionId: (questionId: string) => string | null;
      }) => void)
    | undefined;
  const database = {
    attempts: [
      { user_id: "student-a", question_id: "q-new-1", created_at: "2026-06-21T08:00:00.000Z", is_correct: true },
      { user_id: "student-a", question_id: "q-new-2", created_at: "2026-06-21T09:00:00.000Z", is_correct: false },
      { user_id: "student-b", question_id: "q-existing", created_at: "2026-06-21T11:00:00.000Z", is_correct: true },
      { user_id: "student-c", question_id: "q-stale", created_at: "2026-06-20T08:00:00.000Z", is_correct: false },
      { user_id: "student-d", question_id: "q-missing", created_at: "2026-06-21T12:00:00.000Z", is_correct: true }
    ],
    lesson_progress: [
      {
        user_id: "student-b",
        topic_id: "topic-existing",
        status: "not-started" as const,
        mastery: 10,
        started_at: null,
        completed_at: null,
        duration_seconds: 50,
        checklist_state: { warmup: true } as Record<string, boolean>,
        updated_at: "2026-06-20T00:00:00.000Z"
      },
      {
        user_id: "student-c",
        topic_id: "topic-stale",
        lesson_slug: "existing-stale",
        status: "completed" as const,
        mastery: 90,
        started_at: "2026-06-19T00:00:00.000Z",
        completed_at: "2026-06-19T01:00:00.000Z",
        duration_seconds: 30,
        checklist_state: { done: true } as Record<string, boolean>,
        updated_at: "2026-06-22T00:00:00.000Z"
      }
    ]
  };
  const topicByQuestionId = new Map([
    ["q-new-1", "topic-new"],
    ["q-new-2", "topic-new"],
    ["q-existing", "topic-existing"],
    ["q-stale", "topic-stale"]
  ]);

  assert.equal(typeof upsertProgress, "function");
  assert.match(persistenceSource, /export function teacherOpsUpsertAnalyticsLessonProgressFromAttempts\b/);
  assert.match(rootSource, /teacherOpsUpsertAnalyticsLessonProgressFromAttempts as upsertTeacherAnalyticsLessonProgressFromAttemptsFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /function upsertTeacherAnalyticsLessonProgressFromAttempts\b/);

  upsertProgress?.({
    database,
    lessonSlugForTopic: (topicId) => `lesson-${topicId}`,
    topicIdForQuestionId: (questionId) => topicByQuestionId.get(questionId) ?? null
  });

  assert.deepEqual(database.lesson_progress, [
    {
      user_id: "student-b",
      topic_id: "topic-existing",
      lesson_slug: "lesson-topic-existing",
      status: "completed",
      mastery: 88,
      started_at: "2026-06-21T11:00:00.000Z",
      completed_at: "2026-06-21T11:00:00.000Z",
      duration_seconds: 50,
      checklist_state: { warmup: true },
      updated_at: "2026-06-21T11:00:00.000Z"
    },
    {
      user_id: "student-c",
      topic_id: "topic-stale",
      lesson_slug: "existing-stale",
      status: "completed",
      mastery: 90,
      started_at: "2026-06-19T00:00:00.000Z",
      completed_at: "2026-06-19T01:00:00.000Z",
      duration_seconds: 30,
      checklist_state: { done: true },
      updated_at: "2026-06-22T00:00:00.000Z"
    },
    {
      user_id: "student-a",
      topic_id: "topic-new",
      lesson_slug: "lesson-topic-new",
      status: "in-progress",
      mastery: 49,
      started_at: "2026-06-21T09:00:00.000Z",
      completed_at: null,
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-21T09:00:00.000Z"
    }
  ]);
});

test("teacher operations persistence owns analytics hot activity overlay helper", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const overlayHotActivity = helpers.teacherOpsOverlayAnalyticsHotActivityRows as
    | ((input: {
        database: {
          attempts: Array<{
            id?: string;
            user_id: string;
            question_id: string;
            created_at: string;
            is_correct: boolean;
          }>;
          mistakes: Array<{ user_id: string; question_id: string; wrong_attempts: number }>;
          learning_events: Array<{
            id?: string;
            user_id: string;
            type: string;
            topic_id?: string | null;
            created_at: string;
          }>;
          lesson_progress: Array<{
            user_id: string;
            topic_id: string;
            lesson_slug?: string;
            status: "not-started" | "in-progress" | "completed";
            mastery: number;
            started_at?: string | null;
            completed_at: string | null;
            duration_seconds?: number | null;
            checklist_state?: Record<string, boolean>;
            updated_at: string;
          }>;
        };
        hotAttempts: Array<{
          id?: string;
          user_id: string;
          question_id: string;
          created_at: string;
          is_correct: boolean;
        }>;
        hotLearningEvents: Array<{
          id?: string;
          user_id: string;
          type: string;
          topic_id?: string | null;
          created_at: string;
        }>;
        hotMistakes: Array<{ user_id: string; question_id: string; wrong_attempts: number }>;
        lessonSlugForTopic: (topicId: string) => string;
        topicIdForQuestionId: (questionId: string) => string | null;
      }) => void)
    | undefined;
  const database = {
    attempts: [
      {
        id: "attempt-1",
        user_id: "student-a",
        question_id: "q-1",
        created_at: "2026-06-21T08:00:00.000Z",
        is_correct: false
      }
    ],
    mistakes: [
      { user_id: "student-a", question_id: "q-1", wrong_attempts: 1 }
    ],
    learning_events: [
      {
        id: "event-1",
        user_id: "student-a",
        type: "hint_requested",
        topic_id: "topic-1",
        created_at: "2026-06-21T08:00:00.000Z"
      }
    ],
    lesson_progress: [] as Array<{
      user_id: string;
      topic_id: string;
      lesson_slug?: string;
      status: "not-started" | "in-progress" | "completed";
      mastery: number;
      started_at?: string | null;
      completed_at: string | null;
      duration_seconds?: number | null;
      checklist_state?: Record<string, boolean>;
      updated_at: string;
    }>
  };

  assert.equal(typeof overlayHotActivity, "function");
  assert.match(persistenceSource, /export function teacherOpsOverlayAnalyticsHotActivityRows\b/);
  assert.match(rootSource, /teacherOpsOverlayAnalyticsHotActivityRows as overlayTeacherAnalyticsHotActivityRowsFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /function overlayTeacherAnalyticsHotActivityRows\b/);

  overlayHotActivity?.({
    database,
    hotAttempts: [
      {
        id: "attempt-1",
        user_id: "student-a",
        question_id: "q-1",
        created_at: "2026-06-21T08:00:00.000Z",
        is_correct: true
      },
      {
        user_id: "student-a",
        question_id: "q-2",
        created_at: "2026-06-21T09:00:00.000Z",
        is_correct: true
      }
    ],
    hotMistakes: [
      { user_id: "student-a", question_id: "q-1", wrong_attempts: 2 },
      { user_id: "student-a", question_id: "q-2", wrong_attempts: 1 }
    ],
    hotLearningEvents: [
      {
        id: "event-1",
        user_id: "student-a",
        type: "answer_submitted",
        topic_id: "topic-1",
        created_at: "2026-06-21T08:30:00.000Z"
      },
      {
        user_id: "student-a",
        type: "ai_tutor_message",
        topic_id: "topic-1",
        created_at: "2026-06-21T09:15:00.000Z"
      }
    ],
    lessonSlugForTopic: (topicId) => `lesson-${topicId}`,
    topicIdForQuestionId: (questionId) => questionId === "q-1" || questionId === "q-2" ? "topic-1" : null
  });

  assert.deepEqual(database.attempts, [
    {
      id: "attempt-1",
      user_id: "student-a",
      question_id: "q-1",
      created_at: "2026-06-21T08:00:00.000Z",
      is_correct: true
    },
    {
      user_id: "student-a",
      question_id: "q-2",
      created_at: "2026-06-21T09:00:00.000Z",
      is_correct: true
    }
  ]);
  assert.deepEqual(database.mistakes, [
    { user_id: "student-a", question_id: "q-1", wrong_attempts: 2 },
    { user_id: "student-a", question_id: "q-2", wrong_attempts: 1 }
  ]);
  assert.deepEqual(database.learning_events, [
    {
      id: "event-1",
      user_id: "student-a",
      type: "answer_submitted",
      topic_id: "topic-1",
      created_at: "2026-06-21T08:30:00.000Z"
    },
    {
      user_id: "student-a",
      type: "ai_tutor_message",
      topic_id: "topic-1",
      created_at: "2026-06-21T09:15:00.000Z"
    }
  ]);
  assert.deepEqual(database.lesson_progress, [
    {
      user_id: "student-a",
      topic_id: "topic-1",
      lesson_slug: "lesson-topic-1",
      status: "completed",
      mastery: 91,
      started_at: "2026-06-21T09:00:00.000Z",
      completed_at: "2026-06-21T09:00:00.000Z",
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-21T09:00:00.000Z"
    }
  ]);
});

test("teacher operations persistence owns activity trend helper for legacy analytics", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const buildTrend = helpers.teacherOpsBuildActivityTrend as (
    database: {
      ai_tutor_messages: Array<{ user_id: string; created_at: string }>;
      attempts: Array<{ user_id: string; created_at: string; is_correct: boolean; duration_seconds?: number | null }>;
      learning_events: Array<{
        user_id: string;
        created_at: string;
        type: string;
        duration_seconds?: number | null;
      }>;
      submissions: Array<{ student_id: string; updated_at: string }>;
    },
    studentIds: Set<string>,
    windowDays: number,
    now?: Date
  ) => Array<{
    date: string;
    activeStudents: number;
    answers: number;
    accuracy: number | null;
    hintRequests: number;
    aiTutorMessages: number;
    averageAnswerSeconds: number | null;
  }>;
  const database = {
    attempts: [
      { user_id: "student-1", question_id: "q-1", is_correct: true, duration_seconds: 20, created_at: "2026-06-19T08:00:00.000Z" },
      { user_id: "student-1", question_id: "q-2", is_correct: false, duration_seconds: 40, created_at: "2026-06-20T08:00:00.000Z" },
      { user_id: "student-2", question_id: "q-3", is_correct: true, duration_seconds: 10, created_at: "2026-06-20T08:00:00.000Z" },
      { user_id: "student-1", question_id: "q-old", is_correct: true, duration_seconds: 10, created_at: "2026-06-10T08:00:00.000Z" }
    ],
    learning_events: [
      { user_id: "student-1", type: "hint-request", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-1", type: "answer-correct", duration_seconds: 15, created_at: "2026-06-21T09:00:00.000Z" },
      { user_id: "student-2", type: "hint-request", created_at: "2026-06-21T09:00:00.000Z" }
    ],
    ai_tutor_messages: [
      { user_id: "student-1", created_at: "2026-06-20T09:10:00.000Z" },
      { user_id: "student-2", created_at: "2026-06-20T09:10:00.000Z" }
    ],
    submissions: [
      { student_id: "student-1", updated_at: "2026-06-21T09:30:00.000Z" }
    ]
  };

  assert.equal(typeof buildTrend, "function");
  assert.match(persistenceSource, /export function teacherOpsBuildActivityTrend\b/);
  assert.doesNotMatch(rootSource, /teacherOpsBuildActivityTrend as buildTeacherActivityTrendFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /function buildTeacherActivityTrend\b/);
  assert.deepEqual(
    buildTrend(database, new Set(["student-1"]), 3, new Date("2026-06-21T10:00:00.000Z")),
    [
      {
        date: "2026-06-19",
        activeStudents: 1,
        answers: 1,
        accuracy: 100,
        hintRequests: 0,
        aiTutorMessages: 0,
        averageAnswerSeconds: 20
      },
      {
        date: "2026-06-20",
        activeStudents: 1,
        answers: 1,
        accuracy: 0,
        hintRequests: 1,
        aiTutorMessages: 1,
        averageAnswerSeconds: 40
      },
      {
        date: "2026-06-21",
        activeStudents: 1,
        answers: 1,
        accuracy: 100,
        hintRequests: 0,
        aiTutorMessages: 0,
        averageAnswerSeconds: 15
      }
    ]
  );
});

test("teacher operations persistence owns analytics filter helpers for legacy analytics", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const studentAnswerAttemptsForTopic = helpers.teacherOpsStudentAnswerAttemptsForTopic as (
    database: {
      attempts: Array<{
        id: string;
        user_id: string;
        question_id: string;
        created_at: string;
      }>;
    },
    studentIds: Set<string>,
    questionTopicIdForId: (database: unknown, questionId: string) => string | null | undefined,
    topicId?: string
  ) => Array<{ id: string }>;
  const hintRequestsFor = helpers.teacherOpsHintRequestsFor as (
    database: {
      learning_events: Array<{
        user_id: string;
        type: string;
        topic_id?: string | null;
        created_at: string;
      }>;
    },
    studentIds: Set<string>,
    nowMs: number,
    days: number,
    topicId?: string
  ) => number;
  const aiTutorMessagesFor = helpers.teacherOpsAiTutorMessagesFor as (
    database: {
      ai_tutor_messages: Array<{
        user_id: string;
        created_at: string;
      }>;
    },
    studentIds: Set<string>,
    nowMs: number,
    days: number
  ) => number;
  const database = {
    attempts: [
      { id: "attempt-topic-a", user_id: "student-1", question_id: "question-a", created_at: "2026-06-20T09:00:00.000Z" },
      { id: "attempt-topic-b", user_id: "student-1", question_id: "question-b", created_at: "2026-06-20T09:00:00.000Z" },
      { id: "attempt-other-student", user_id: "student-2", question_id: "question-a", created_at: "2026-06-20T09:00:00.000Z" }
    ],
    learning_events: [
      { user_id: "student-1", type: "hint-request", topic_id: "topic-a", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-1", type: "hint-request", topic_id: "topic-b", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-1", type: "page-view", topic_id: "topic-a", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-1", type: "hint-request", topic_id: "topic-a", created_at: "2026-06-10T09:00:00.000Z" },
      { user_id: "student-2", type: "hint-request", topic_id: "topic-a", created_at: "2026-06-20T09:00:00.000Z" }
    ],
    ai_tutor_messages: [
      { user_id: "student-1", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-1", created_at: "2026-06-10T09:00:00.000Z" },
      { user_id: "student-2", created_at: "2026-06-20T09:00:00.000Z" }
    ]
  };
  const topicByQuestionId = new Map([
    ["question-a", "topic-a"],
    ["question-b", "topic-b"]
  ]);
  const nowMs = Date.parse("2026-06-21T10:00:00.000Z");

  assert.equal(typeof studentAnswerAttemptsForTopic, "function");
  assert.equal(typeof hintRequestsFor, "function");
  assert.equal(typeof aiTutorMessagesFor, "function");
  assert.match(persistenceSource, /export function teacherOpsStudentAnswerAttemptsForTopic\b/);
  assert.match(persistenceSource, /export function teacherOpsHintRequestsFor\b/);
  assert.match(persistenceSource, /export function teacherOpsAiTutorMessagesFor\b/);
  assert.doesNotMatch(rootSource, /teacherOpsStudentAnswerAttemptsForTopic as studentAnswerAttemptsForTopicFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /teacherOpsHintRequestsFor as hintRequestsForFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /teacherOpsAiTutorMessagesFor as aiTutorMessagesForFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /function studentAnswerAttemptsForTopic\b/);
  assert.doesNotMatch(rootSource, /function hintRequestsFor\b/);
  assert.doesNotMatch(rootSource, /function aiTutorMessagesFor\b/);

  assert.deepEqual(
    studentAnswerAttemptsForTopic(
      database,
      new Set(["student-1"]),
      (_database, questionId) => topicByQuestionId.get(questionId) ?? null,
      "topic-a"
    ).map((attempt) => attempt.id),
    ["attempt-topic-a"]
  );
  assert.deepEqual(
    studentAnswerAttemptsForTopic(
      database,
      new Set(["student-1"]),
      (_database, questionId) => topicByQuestionId.get(questionId) ?? null
    ).map((attempt) => attempt.id),
    ["attempt-topic-a", "attempt-topic-b"]
  );
  assert.equal(hintRequestsFor(database, new Set(["student-1"]), nowMs, 7, "topic-a"), 1);
  assert.equal(hintRequestsFor(database, new Set(["student-1"]), nowMs, 7), 2);
  assert.equal(aiTutorMessagesFor(database, new Set(["student-1"]), nowMs, 7), 1);
});

test("teacher operations persistence owns frequent mistake builder for legacy analytics", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const buildFrequentMistakes = helpers.teacherOpsBuildFrequentMistakes as (
    database: {
      mistakes: Array<{
        user_id: string;
        question_id: string;
        wrong_attempts: number;
        last_attempt_at: string;
      }>;
    },
    classRecords: Array<{ id: string; name: string }>,
    studentIds: Set<string>,
    dependencies: {
      teacherStudentIdsForClass: (database: unknown, classId: string) => string[];
      questionForId: (
        database: unknown,
        questionId: string
      ) => { id: string; topic_id: string; prompt_en: string; prompt_zh: string } | null;
      topicLabelForQuestion: (
        database: unknown,
        question: { id: string; topic_id: string; prompt_en: string; prompt_zh: string }
      ) => { en: string; zh: string };
    }
  ) => Array<{
    id: string;
    questionId: string;
    classId: string;
    className: string;
    topicId: string;
    topicTitle: { en: string; zh: string };
    prompt: { en: string; zh: string };
    wrongAttempts: number;
    studentCount: number;
    lastAttemptAt: string;
  }>;
  const database = {
    mistakes: [
      { user_id: "student-1", question_id: "question-a", wrong_attempts: 2, last_attempt_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-2", question_id: "question-a", wrong_attempts: 4, last_attempt_at: "2026-06-21T09:00:00.000Z" },
      { user_id: "student-3", question_id: "question-b", wrong_attempts: 3, last_attempt_at: "2026-06-21T08:00:00.000Z" },
      { user_id: "student-out", question_id: "question-a", wrong_attempts: 99, last_attempt_at: "2026-06-22T09:00:00.000Z" },
      { user_id: "student-1", question_id: "missing-question", wrong_attempts: 99, last_attempt_at: "2026-06-22T09:00:00.000Z" }
    ]
  };
  const classRecords = [
    { id: "class-a", name: "S3A" },
    { id: "class-b", name: "S3B" }
  ];
  const classStudentIds = new Map([
    ["class-a", ["student-1", "student-2"]],
    ["class-b", ["student-3"]]
  ]);
  const questions = new Map([
    ["question-a", { id: "question-a", topic_id: "topic-a", prompt_en: "Solve A", prompt_zh: "解 A" }],
    ["question-b", { id: "question-b", topic_id: "topic-b", prompt_en: "Solve B", prompt_zh: "解 B" }]
  ]);

  assert.equal(typeof buildFrequentMistakes, "function");
  assert.match(persistenceSource, /export function teacherOpsBuildFrequentMistakes\b/);
  assert.doesNotMatch(rootSource, /teacherOpsBuildFrequentMistakes as buildFrequentMistakesFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /function buildFrequentMistakes\b/);
  assert.deepEqual(
    buildFrequentMistakes(database, classRecords, new Set(["student-1", "student-2", "student-3"]), {
      teacherStudentIdsForClass: (_database, classId) => classStudentIds.get(classId) ?? [],
      questionForId: (_database, questionId) => questions.get(questionId) ?? null,
      topicLabelForQuestion: (_database, question) => ({
        en: `${question.topic_id} EN`,
        zh: `${question.topic_id} ZH`
      })
    }),
    [
      {
        id: "class-a-question-a",
        questionId: "question-a",
        classId: "class-a",
        className: "S3A",
        topicId: "topic-a",
        topicTitle: { en: "topic-a EN", zh: "topic-a ZH" },
        prompt: { en: "Solve A", zh: "解 A" },
        wrongAttempts: 6,
        studentCount: 2,
        lastAttemptAt: "2026-06-21T09:00:00.000Z"
      },
      {
        id: "class-b-question-b",
        questionId: "question-b",
        classId: "class-b",
        className: "S3B",
        topicId: "topic-b",
        topicTitle: { en: "topic-b EN", zh: "topic-b ZH" },
        prompt: { en: "Solve B", zh: "解 B" },
        wrongAttempts: 3,
        studentCount: 1,
        lastAttemptAt: "2026-06-21T08:00:00.000Z"
      }
    ]
  );
});

test("teacher operations persistence owns topic mastery builder for legacy analytics", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const buildTopicMastery = helpers.teacherOpsBuildTopicMastery as (
    database: {
      topics: Array<{
        id: string;
        grade: string;
        sort_order: number;
        title_en: string;
        title_zh: string;
        curriculum: "in-scope" | "out-of-scope";
      }>;
      lesson_progress: Array<{ user_id: string; topic_id: string; mastery: number }>;
      attempts: Array<{ user_id: string; question_id: string; duration_seconds?: number | null }>;
      mistakes: Array<{ user_id: string; question_id: string; wrong_attempts: number }>;
      learning_events: Array<{ user_id: string; type: string; topic_id?: string | null; created_at: string }>;
      ai_tutor_messages: Array<{ user_id: string; created_at: string }>;
    },
    classRecords: Array<{ id: string; name: string; grade: string }>,
    nowMs: number,
    dependencies: {
      teacherStudentIdsForClass: (database: unknown, classId: string) => string[];
      curriculumProfileForClass: (database: unknown, teacherClass: { id: string }) => "in-scope";
      isCurriculumTopic: (
        topic: { curriculum: "in-scope" | "out-of-scope" },
        curriculumProfile: "in-scope"
      ) => boolean;
      localizedTopic: (topic: { title_en: string; title_zh: string }) => { en: string; zh: string };
      questionTopicIdForId: (database: unknown, questionId: string) => string | null;
    }
  ) => Array<{
    id: string;
    classId: string;
    className: string;
    grade: string;
    topicId: string;
    topicTitle: { en: string; zh: string };
    averageMastery: number;
    studentCount: number;
    weakStudentCount: number;
    averageAnswerSeconds: number | null;
    hintRequests: number;
    aiTutorMessages: number;
    wrongAttempts: number;
    reteachRecommended: boolean;
    href: string;
  }>;
  const database = {
    topics: [
      { id: "topic-2", grade: "S3", sort_order: 2, title_en: "Topic 2", title_zh: "課題二", curriculum: "in-scope" as const },
      { id: "topic-1", grade: "S3", sort_order: 1, title_en: "Topic 1", title_zh: "課題一", curriculum: "in-scope" as const },
      { id: "topic-grade-out", grade: "S4", sort_order: 3, title_en: "Topic 3", title_zh: "課題三", curriculum: "in-scope" as const },
      { id: "topic-curriculum-out", grade: "S3", sort_order: 4, title_en: "Topic 4", title_zh: "課題四", curriculum: "out-of-scope" as const }
    ],
    lesson_progress: [
      { user_id: "student-1", topic_id: "topic-1", mastery: 50 },
      { user_id: "student-2", topic_id: "topic-1", mastery: 70 },
      { user_id: "student-1", topic_id: "topic-2", mastery: 88 },
      { user_id: "student-2", topic_id: "topic-2", mastery: 92 }
    ],
    attempts: [
      { user_id: "student-1", question_id: "question-topic-1-a", duration_seconds: 20 },
      { user_id: "student-2", question_id: "question-topic-1-b", duration_seconds: 40 },
      { user_id: "student-1", question_id: "question-topic-2", duration_seconds: 60 },
      { user_id: "student-out", question_id: "question-topic-1-a", duration_seconds: 100 }
    ],
    mistakes: [
      { user_id: "student-1", question_id: "question-topic-1-a", wrong_attempts: 2 },
      { user_id: "student-2", question_id: "question-topic-1-b", wrong_attempts: 4 },
      { user_id: "student-1", question_id: "question-topic-2", wrong_attempts: 1 }
    ],
    learning_events: [
      { user_id: "student-1", type: "hint-request", topic_id: "topic-1", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-2", type: "hint-request", topic_id: "topic-1", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-1", type: "hint-request", topic_id: "topic-2", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-1", type: "hint-request", topic_id: "topic-1", created_at: "2026-05-01T09:00:00.000Z" }
    ],
    ai_tutor_messages: [
      { user_id: "student-1", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-2", created_at: "2026-06-20T10:00:00.000Z" },
      { user_id: "student-out", created_at: "2026-06-20T10:00:00.000Z" }
    ]
  };
  const questionTopicId = new Map([
    ["question-topic-1-a", "topic-1"],
    ["question-topic-1-b", "topic-1"],
    ["question-topic-2", "topic-2"]
  ]);

  assert.equal(typeof buildTopicMastery, "function");
  assert.match(persistenceSource, /export function teacherOpsBuildTopicMastery\b/);
  assert.doesNotMatch(rootSource, /teacherOpsBuildTopicMastery as buildTopicMasteryFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /const topicMastery: TeacherAnalyticsTopicCell\[\] = selectedClassRecords\.flatMap/);
  assert.deepEqual(
    buildTopicMastery(database, [{ id: "class-a", name: "S3A", grade: "S3" }], Date.parse("2026-06-21T10:00:00.000Z"), {
      teacherStudentIdsForClass: (_database, classId) => classId === "class-a" ? ["student-1", "student-2"] : [],
      curriculumProfileForClass: () => "in-scope",
      isCurriculumTopic: (topic, curriculumProfile) => topic.curriculum === curriculumProfile,
      localizedTopic: (topic) => ({ en: topic.title_en, zh: topic.title_zh }),
      questionTopicIdForId: (_database, questionId) => questionTopicId.get(questionId) ?? null
    }),
    [
      {
        id: "class-a-topic-1",
        classId: "class-a",
        className: "S3A",
        grade: "S3",
        topicId: "topic-1",
        topicTitle: { en: "Topic 1", zh: "課題一" },
        averageMastery: 60,
        studentCount: 2,
        weakStudentCount: 1,
        averageAnswerSeconds: 30,
        hintRequests: 2,
        aiTutorMessages: 2,
        wrongAttempts: 6,
        reteachRecommended: true,
        href: "/teacher/classes/class-a?topic=topic-1"
      },
      {
        id: "class-a-topic-2",
        classId: "class-a",
        className: "S3A",
        grade: "S3",
        topicId: "topic-2",
        topicTitle: { en: "Topic 2", zh: "課題二" },
        averageMastery: 90,
        studentCount: 2,
        weakStudentCount: 0,
        averageAnswerSeconds: 60,
        hintRequests: 1,
        aiTutorMessages: 2,
        wrongAttempts: 1,
        reteachRecommended: false,
        href: "/teacher/classes/class-a?topic=topic-2"
      }
    ]
  );
});

test("teacher operations persistence owns student risk builder for legacy analytics", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const buildStudentRisks = helpers.teacherOpsBuildStudentRisks as (
    database: {
      attempts: Array<{ user_id: string; duration_seconds?: number | null }>;
      mistakes: Array<{ user_id: string; mastered?: boolean | null }>;
      learning_events: Array<{ user_id: string; type: string; topic_id?: string | null; created_at: string }>;
      ai_tutor_messages: Array<{ user_id: string; created_at: string }>;
    },
    studentPairs: Array<{ classId: string; studentId: string }>,
    classRecords: Array<{ id: string; name: string; grade: string }>,
    nowMs: number,
    dependencies: {
      topicIdsForClass: (database: unknown, classRecord: { id: string }) => string[];
      classStudentSummary: (
        database: unknown,
        classRecord: { id: string },
        studentId: string,
        nowMs: number
      ) => {
        averageMastery: number;
        assignmentCompletionRate: number;
        grade: string;
        riskTags: Array<"low-mastery" | "repeated-mistakes" | "inactive" | "high-ai-tutor" | "late-work">;
        studentName: string;
      } | null;
      latestStudentActivityAt: (database: unknown, studentId: string) => string | null;
      studentAverageMastery: (database: unknown, studentId: string, topicIds: string[]) => number;
      riskTagsForStudent: (
        database: unknown,
        studentId: string,
        topicIds: string[],
        nowMs: number
      ) => Array<"low-mastery" | "repeated-mistakes" | "inactive" | "high-ai-tutor" | "late-work">;
      studentProfileFor: (database: unknown, studentId: string) => { name?: string | null; grade?: string | null } | null;
    }
  ) => Array<{
    studentId: string;
    studentName: string;
    classId: string;
    className: string;
    grade: string;
    riskScore: number;
    averageMastery: number;
    assignmentCompletionRate: number;
    averageAnswerSeconds: number | null;
    latestActivityAt: string | null;
    hintRequests7d: number;
    aiTutorMessages7d: number;
    activeMistakes: number;
    tags: string[];
    recommendedAction: string;
    recommendation: { en: string; zh: string };
    href: string;
  }>;
  const database = {
    attempts: [
      { user_id: "student-1", duration_seconds: 20 },
      { user_id: "student-1", duration_seconds: 40 },
      { user_id: "student-2", duration_seconds: 60 },
      { user_id: "student-out", duration_seconds: 100 }
    ],
    mistakes: [
      { user_id: "student-1", mastered: false },
      { user_id: "student-1", mastered: true },
      { user_id: "student-2", mastered: false }
    ],
    learning_events: [
      { user_id: "student-1", type: "hint-request", topic_id: "topic-1", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-1", type: "page-view", topic_id: "topic-1", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-2", type: "hint-request", topic_id: "topic-1", created_at: "2026-05-01T09:00:00.000Z" }
    ],
    ai_tutor_messages: [
      { user_id: "student-1", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-1", created_at: "2026-06-20T10:00:00.000Z" },
      { user_id: "student-2", created_at: "2026-05-01T10:00:00.000Z" }
    ]
  };
  const nowMs = Date.parse("2026-06-21T10:00:00.000Z");

  assert.equal(typeof buildStudentRisks, "function");
  assert.match(persistenceSource, /export function teacherOpsBuildStudentRisks\b/);
  assert.doesNotMatch(rootSource, /teacherOpsBuildStudentRisks as buildStudentRisksFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /const studentRisks: TeacherAnalyticsStudentRisk\[\] = studentPairs\.map/);
  assert.deepEqual(
    buildStudentRisks(
      database,
      [
        { classId: "class-a", studentId: "student-1" },
        { classId: "class-a", studentId: "student-2" }
      ],
      [{ id: "class-a", name: "S3A", grade: "S3" }],
      nowMs,
      {
        topicIdsForClass: () => ["topic-1"],
        classStudentSummary: (_database, _classRecord, studentId) => studentId === "student-1"
          ? {
              averageMastery: 50,
              assignmentCompletionRate: 75,
              grade: "S3",
              riskTags: ["low-mastery"],
              studentName: "Ada"
            }
          : null,
        latestStudentActivityAt: (_database, studentId) => studentId === "student-1"
          ? "2026-06-20T09:00:00.000Z"
          : "2026-06-10T09:00:00.000Z",
        studentAverageMastery: (_database, studentId) => studentId === "student-2" ? 90 : 0,
        riskTagsForStudent: (_database, studentId) => studentId === "student-2" ? ["inactive"] : [],
        studentProfileFor: (_database, studentId) => studentId === "student-2"
          ? { name: "Ben", grade: "S3" }
          : null
      }
    ),
    [
      {
        studentId: "student-1",
        studentName: "Ada",
        classId: "class-a",
        className: "S3A",
        grade: "S3",
        riskScore: 70,
        averageMastery: 50,
        assignmentCompletionRate: 75,
        averageAnswerSeconds: 30,
        latestActivityAt: "2026-06-20T09:00:00.000Z",
        hintRequests7d: 1,
        aiTutorMessages7d: 2,
        activeMistakes: 1,
        tags: ["low-mastery"],
        recommendedAction: "rebuild-foundation",
        recommendation: { en: "Rebuild foundations before moving on.", zh: "先補基礎，再進入新內容。" },
        href: "/teacher/classes/class-a/students/student-1"
      },
      {
        studentId: "student-2",
        studentName: "Ben",
        classId: "class-a",
        className: "S3A",
        grade: "S3",
        riskScore: 26,
        averageMastery: 90,
        assignmentCompletionRate: 0,
        averageAnswerSeconds: 60,
        latestActivityAt: "2026-06-10T09:00:00.000Z",
        hintRequests7d: 0,
        aiTutorMessages7d: 0,
        activeMistakes: 1,
        tags: ["inactive"],
        recommendedAction: "redo-mistakes",
        recommendation: { en: "Assign mistake review and a short retry set.", zh: "安排錯題重做和短練習。" },
        href: "/teacher/classes/class-a/students/student-2"
      }
    ]
  );
});

test("teacher operations persistence owns analytics summary builder for legacy analytics", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const buildAnalyticsSummary = helpers.teacherOpsBuildAnalyticsSummary as (
    database: {
      attempts: Array<{ user_id: string; duration_seconds?: number | null }>;
      learning_events: Array<{ user_id: string; type: string; topic_id?: string | null; created_at: string }>;
      ai_tutor_messages: Array<{ user_id: string; created_at: string }>;
    },
    studentIds: Set<string>,
    topicMastery: Array<{ averageMastery: number }>,
    studentRisks: Array<{ riskScore: number; tags: string[] }>,
    nowMs: number,
    dependencies: {
      latestStudentActivityAt: (database: unknown, studentId: string) => string | null;
    }
  ) => {
    averageMastery: number;
    atRiskStudents: number;
    averageAnswerSeconds: number | null;
    hintRequests7d: number;
    aiTutorMessages7d: number;
    activeStudents7d: number;
    activeStudents30d: number;
  };
  const database = {
    attempts: [
      { user_id: "student-1", duration_seconds: 20 },
      { user_id: "student-2", duration_seconds: 40 },
      { user_id: "student-out", duration_seconds: 100 }
    ],
    learning_events: [
      { user_id: "student-1", type: "hint-request", topic_id: "topic-1", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-2", type: "hint-request", topic_id: "topic-1", created_at: "2026-05-01T09:00:00.000Z" },
      { user_id: "student-out", type: "hint-request", topic_id: "topic-1", created_at: "2026-06-20T09:00:00.000Z" }
    ],
    ai_tutor_messages: [
      { user_id: "student-1", created_at: "2026-06-20T09:00:00.000Z" },
      { user_id: "student-2", created_at: "2026-06-20T10:00:00.000Z" },
      { user_id: "student-out", created_at: "2026-06-20T10:00:00.000Z" }
    ]
  };
  const nowMs = Date.parse("2026-06-21T10:00:00.000Z");

  assert.equal(typeof buildAnalyticsSummary, "function");
  assert.match(persistenceSource, /export function teacherOpsBuildAnalyticsSummary\b/);
  assert.doesNotMatch(rootSource, /teacherOpsBuildAnalyticsSummary as buildAnalyticsSummaryFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /summary: \{\s*averageMastery,\s*atRiskStudents:/);
  assert.deepEqual(
    buildAnalyticsSummary(
      database,
      new Set(["student-1", "student-2"]),
      [{ averageMastery: 60 }, { averageMastery: 80 }],
      [
        { riskScore: 45, tags: [] },
        { riskScore: 20, tags: ["inactive"] }
      ],
      nowMs,
      {
        latestStudentActivityAt: (_database, studentId) => studentId === "student-1"
          ? "2026-06-20T09:00:00.000Z"
          : "2026-06-05T09:00:00.000Z"
      }
    ),
    {
      averageMastery: 70,
      atRiskStudents: 2,
      averageAnswerSeconds: 30,
      hintRequests7d: 1,
      aiTutorMessages7d: 2,
      activeStudents7d: 1,
      activeStudents30d: 2
    }
  );
});

test("teacher operations persistence owns analytics data builder factory for legacy analytics", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const createAnalyticsDataBuilder = helpers.createTeacherOpsAnalyticsDataBuilder as (dependencies: {
    now: () => Date;
    classRecordsForUser: (database: {
      teacher_classes: Array<{ id: string; teacher_id: string; name: string; grade: "S3"; updated_at: string }>;
    }, user: { id: string; role: string }) => Array<{ id: string; teacher_id: string; name: string; grade: "S3"; updated_at: string }>;
    classProjection: (
      database: unknown,
      teacherClass: { id: string; teacher_id: string; name: string; grade: "S3"; updated_at: string }
    ) => TeacherClass;
    teacherClassStudentPairs: (
      database: unknown,
      classRecords: Array<{ id: string }>
    ) => Array<{ classId: string; studentId: string }>;
    topicMastery: {
      teacherStudentIdsForClass: (database: unknown, classId: string) => string[];
      curriculumProfileForClass: (database: unknown, teacherClass: { id: string }) => "in-scope";
      isCurriculumTopic: (topic: { curriculum: "in-scope" | "out-of-scope" }, profile: "in-scope") => boolean;
      localizedTopic: (topic: { title_en: string; title_zh: string }) => { en: string; zh: string };
      questionTopicIdForId: (database: unknown, questionId: string) => string | null;
    };
    studentRisks: {
      topicIdsForClass: (database: unknown, classRecord: { id: string }) => string[];
      classStudentSummary: () => null;
      latestStudentActivityAt: (database: unknown, studentId: string) => string | null;
      studentAverageMastery: (database: unknown, studentId: string, topicIds: string[]) => number;
      riskTagsForStudent: () => [];
      studentProfileFor: (database: unknown, studentId: string) => { name: string; grade: "S3" };
    };
    latestStudentActivityAt: (database: unknown, studentId: string) => string | null;
    frequentMistakes: {
      teacherStudentIdsForClass: (database: unknown, classId: string) => string[];
      questionForId: (
        database: unknown,
        questionId: string
      ) => { id: string; topic_id: string; prompt_en: string; prompt_zh: string } | null;
      topicLabelForQuestion: (database: unknown, question: { topic_id: string }) => { en: string; zh: string };
    };
  }) => (database: {
    users: Array<{ id: string; role: "teacher" | "student" }>;
    teacher_classes: Array<{ id: string; teacher_id: string; name: string; grade: "S3"; updated_at: string }>;
    topics: Array<{ id: string; grade: "S3"; sort_order: number; title_en: string; title_zh: string; curriculum: "in-scope" }>;
    lesson_progress: Array<{ user_id: string; topic_id: string; mastery: number }>;
    attempts: Array<{ user_id: string; question_id: string; created_at: string; is_correct: boolean; duration_seconds?: number | null }>;
    mistakes: Array<{
      user_id: string;
      question_id: string;
      wrong_attempts: number;
      last_attempt_at: string;
      mastered?: boolean | null;
    }>;
    learning_events: Array<{ user_id: string; type: string; topic_id?: string | null; created_at: string }>;
    ai_tutor_messages: Array<{ user_id: string; created_at: string }>;
    submissions: Array<{ student_id: string; updated_at: string }>;
  }, userId: string, selectedClassId?: string | null) => TeacherAnalyticsData | null;
  const database = {
    users: [
      { id: "teacher-1", role: "teacher" as const },
      { id: "student-1", role: "student" as const }
    ],
    teacher_classes: [
      { id: "class-a", teacher_id: "teacher-1", name: "S3A", grade: "S3" as const, updated_at: "2026-06-21T09:00:00.000Z" },
      { id: "class-b", teacher_id: "teacher-1", name: "S3B", grade: "S3" as const, updated_at: "2026-06-21T09:00:00.000Z" }
    ],
    topics: [
      { id: "topic-1", grade: "S3" as const, sort_order: 1, title_en: "Topic 1", title_zh: "課題一", curriculum: "in-scope" as const }
    ],
    lesson_progress: [{ user_id: "student-1", topic_id: "topic-1", mastery: 72 }],
    attempts: [
      {
        user_id: "student-1",
        question_id: "question-1",
        created_at: "2026-06-20T09:00:00.000Z",
        is_correct: false,
        duration_seconds: 30
      }
    ],
    mistakes: [
      {
        user_id: "student-1",
        question_id: "question-1",
        wrong_attempts: 2,
        last_attempt_at: "2026-06-20T09:00:00.000Z",
        mastered: false
      }
    ],
    learning_events: [
      { user_id: "student-1", type: "hint-request", topic_id: "topic-1", created_at: "2026-06-20T09:00:00.000Z" }
    ],
    ai_tutor_messages: [
      { user_id: "student-1", created_at: "2026-06-20T09:10:00.000Z" }
    ],
    submissions: [
      { student_id: "student-1", updated_at: "2026-06-20T09:30:00.000Z" }
    ]
  };
  const question = { id: "question-1", topic_id: "topic-1", prompt_en: "Solve it", prompt_zh: "解題" };
  const buildAnalyticsData = createAnalyticsDataBuilder({
    now: () => new Date("2026-06-21T10:00:00.000Z"),
    classRecordsForUser: (sourceDatabase, user) =>
      sourceDatabase.teacher_classes.filter((teacherClass) => teacherClass.teacher_id === user.id),
    classProjection: (_sourceDatabase, teacherClass) => classProjection(createDatabase(), teacherClass),
    teacherClassStudentPairs: (_sourceDatabase, classRecords) =>
      classRecords.flatMap((teacherClass) => teacherClass.id === "class-a"
        ? [{ classId: teacherClass.id, studentId: "student-1" }]
        : []),
    topicMastery: {
      teacherStudentIdsForClass: (_sourceDatabase, classId) => classId === "class-a" ? ["student-1"] : [],
      curriculumProfileForClass: () => "in-scope",
      isCurriculumTopic: (topic, profile) => topic.curriculum === profile,
      localizedTopic: (topic) => ({ en: topic.title_en, zh: topic.title_zh }),
      questionTopicIdForId: (_sourceDatabase, questionId) => questionId === "question-1" ? "topic-1" : null
    },
    studentRisks: {
      topicIdsForClass: () => ["topic-1"],
      classStudentSummary: () => null,
      latestStudentActivityAt: () => "2026-06-20T09:30:00.000Z",
      studentAverageMastery: () => 72,
      riskTagsForStudent: () => [],
      studentProfileFor: () => ({ name: "Ada", grade: "S3" })
    },
    latestStudentActivityAt: () => "2026-06-20T09:30:00.000Z",
    frequentMistakes: {
      teacherStudentIdsForClass: (_sourceDatabase, classId) => classId === "class-a" ? ["student-1"] : [],
      questionForId: (_sourceDatabase, questionId) => questionId === "question-1" ? question : null,
      topicLabelForQuestion: (_sourceDatabase, currentQuestion) => ({
        en: `${currentQuestion.topic_id} EN`,
        zh: `${currentQuestion.topic_id} ZH`
      })
    }
  });

  assert.equal(typeof createAnalyticsDataBuilder, "function");
  assert.match(persistenceSource, /export function createTeacherOpsAnalyticsDataBuilder\b/);
  assert.match(rootSource, /createTeacherOpsAnalyticsDataBuilder/);
  assert.doesNotMatch(rootSource, /function buildTeacherAnalyticsDataFromDatabase\b/);

  const result = buildAnalyticsData(database, "teacher-1", "class-a");
  assert.ok(result);
  assert.equal(result.selectedClassId, "class-a");
  assert.deepEqual(result.classes.map((teacherClass) => teacherClass.id), ["class-a", "class-b"]);
  assert.deepEqual(result.summary, {
    averageMastery: 72,
    atRiskStudents: 0,
    averageAnswerSeconds: 30,
    hintRequests7d: 1,
    aiTutorMessages7d: 1,
    activeStudents7d: 1,
    activeStudents30d: 1
  });
  assert.deepEqual(result.topicMastery.map((cell) => cell.id), ["class-a-topic-1"]);
  assert.deepEqual(result.studentRisks.map((risk) => risk.studentId), ["student-1"]);
  assert.deepEqual(result.frequentMistakes.map((mistake) => mistake.id), ["class-a-question-1"]);
  assert.equal(result.activityTrend7d.length, 7);
  assert.equal(result.activityTrend30d.length, 30);
  assert.equal(result.interventionGroups.length, 1);
  assert.equal(buildAnalyticsData(database, "teacher-1", "missing-class"), null);
  assert.equal(buildAnalyticsData(database, "student-1"), null);
});

test("teacher operations persistence owns intervention recommendation helpers for legacy analytics", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const recommendedActionForStudent = helpers.teacherOpsRecommendedActionForStudent as (input: {
    averageMastery: number;
    activeMistakes: number;
    inactive: boolean;
    aiTutorMessages7d: number;
  }) => string;
  const interventionRecommendation = helpers.teacherOpsInterventionRecommendation as (action: string) => {
    en: string;
    zh: string;
  };

  assert.equal(typeof recommendedActionForStudent, "function");
  assert.equal(typeof interventionRecommendation, "function");
  assert.match(persistenceSource, /export function teacherOpsRecommendedActionForStudent\b/);
  assert.match(persistenceSource, /export function teacherOpsInterventionRecommendation\b/);
  assert.doesNotMatch(rootSource, /teacherOpsRecommendedActionForStudent as recommendedActionForStudentFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /teacherOpsInterventionRecommendation as interventionRecommendationFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /function recommendedActionForStudent\b/);
  assert.doesNotMatch(rootSource, /function interventionRecommendation\b/);

  assert.equal(recommendedActionForStudent({
    averageMastery: 88,
    activeMistakes: 0,
    inactive: false,
    aiTutorMessages7d: 0
  }), "challenge-extension");
  assert.equal(recommendedActionForStudent({
    averageMastery: 52,
    activeMistakes: 0,
    inactive: false,
    aiTutorMessages7d: 0
  }), "rebuild-foundation");
  assert.equal(recommendedActionForStudent({
    averageMastery: 72,
    activeMistakes: 2,
    inactive: false,
    aiTutorMessages7d: 0
  }), "redo-mistakes");
  assert.equal(recommendedActionForStudent({
    averageMastery: 72,
    activeMistakes: 0,
    inactive: true,
    aiTutorMessages7d: 0
  }), "teacher-message");
  assert.equal(recommendedActionForStudent({
    averageMastery: 72,
    activeMistakes: 0,
    inactive: false,
    aiTutorMessages7d: 5
  }), "teacher-message");
  assert.deepEqual(interventionRecommendation("redo-mistakes"), {
    en: "Assign mistake review and a short retry set.",
    zh: "安排錯題重做和短練習。"
  });
});

test("teacher operations persistence owns intervention group builder for legacy analytics", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsOperationsPersistence") as Record<string, unknown>;
  const buildGroups = helpers.teacherOpsBuildInterventionGroups as (
    _database: unknown,
    topicCells: Array<{
      classId: string;
      className: string;
      topicId: string;
      topicTitle: { en: string; zh: string };
      averageMastery: number;
    }>,
    studentRisks: Array<{
      classId: string;
      className: string;
      studentId: string;
      studentName: string;
      recommendedAction: "rebuild-foundation" | "redo-mistakes" | "teacher-message" | "challenge-extension";
    }>
  ) => Array<{
    id: string;
    action: string;
    topicId?: string;
    studentIds: string[];
    targetId?: string;
  }>;
  const topicCells = [
    {
      classId: "class-1",
      className: "3A",
      topicId: "topic-foundation",
      topicTitle: { en: "Fractions", zh: "分數" },
      averageMastery: 42
    },
    {
      classId: "class-1",
      className: "3A",
      topicId: "topic-challenge",
      topicTitle: { en: "Algebra", zh: "代數" },
      averageMastery: 90
    }
  ];
  const studentRisks = [
    { classId: "class-1", className: "3A", studentId: "student-a", studentName: "Ada", recommendedAction: "rebuild-foundation" as const },
    { classId: "class-1", className: "3A", studentId: "student-b", studentName: "Ben", recommendedAction: "redo-mistakes" as const },
    { classId: "class-1", className: "3A", studentId: "student-c", studentName: "Cat", recommendedAction: "teacher-message" as const },
    { classId: "class-1", className: "3A", studentId: "student-d", studentName: "Dan", recommendedAction: "challenge-extension" as const }
  ];

  assert.equal(typeof buildGroups, "function");
  assert.match(persistenceSource, /export function teacherOpsBuildInterventionGroups\b/);
  assert.doesNotMatch(rootSource, /teacherOpsBuildInterventionGroups as buildInterventionGroupsFromTeacherOpsOperations/);
  assert.doesNotMatch(rootSource, /function buildInterventionGroups\b/);
  assert.deepEqual(
    buildGroups({}, topicCells, studentRisks).map((group) => ({
      id: group.id,
      action: group.action,
      topicId: group.topicId,
      studentIds: group.studentIds,
      targetId: group.targetId
    })),
    [
      {
        id: "class-1-foundation-topic-foundation",
        action: "rebuild-foundation",
        topicId: "topic-foundation",
        studentIds: ["student-a"],
        targetId: "topic-foundation"
      },
      {
        id: "class-1-mistakes-topic-foundation",
        action: "redo-mistakes",
        topicId: "topic-foundation",
        studentIds: ["student-b"],
        targetId: "topic-foundation"
      },
      {
        id: "class-1-message-follow-up",
        action: "teacher-message",
        topicId: undefined,
        studentIds: ["student-c"],
        targetId: undefined
      },
      {
        id: "class-1-challenge-topic-challenge",
        action: "challenge-extension",
        topicId: "topic-challenge",
        studentIds: ["student-d"],
        targetId: "topic-challenge"
      }
    ]
  );
});

test("legacy userStore delegates teacher operations data to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const dashboardStart = source.indexOf("async function getTeacherDashboardDataFromPostgresProjection");
  const dashboardEnd = source.indexOf("async function getTeacherAnalyticsDataFromPostgresProjection", dashboardStart);
  const analyticsStart = dashboardEnd;
  const analyticsEnd = source.indexOf("const buildTeacherDashboardDataFromDatabase", analyticsStart);
  const dashboardProjectionSource = source.slice(dashboardStart, dashboardEnd);
  const analyticsProjectionSource = source.slice(analyticsStart, analyticsEnd);

  assert.match(source, /export const getTeacherAnalyticsData = teacherOpsUserStore\.getTeacherAnalyticsData/);
  assert.match(source, /export const getTeacherDashboardData = teacherOpsUserStore\.getTeacherDashboardData/);
  assert.match(source, /export const getTeacherOperationsData = teacherOpsUserStore\.getTeacherOperationsData/);
  assert.match(source, /analyticsDataFromPostgresProjection: getTeacherAnalyticsDataFromPostgresProjection/);
  assert.match(source, /teacherOpsOverlayAnalyticsHotActivityRows as overlayTeacherAnalyticsHotActivityRowsFromTeacherOpsOperations/);
  assert.doesNotMatch(source, /function overlayTeacherAnalyticsHotActivityRows\(/);
  assert.match(source, /FROM practice_attempts/);
  assert.match(source, /FROM mistake_book_items/);
  assert.match(source, /FROM learning_events/);
  assert.match(dashboardProjectionSource, /projection_teacher_classes/);
  assert.match(dashboardProjectionSource, /projection_class_enrollments/);
  assert.match(dashboardProjectionSource, /projection_lesson_progress/);
  assert.match(analyticsProjectionSource, /projection_teacher_classes/);
  assert.match(analyticsProjectionSource, /projection_class_enrollments/);
  assert.match(analyticsProjectionSource, /projection_questions/);
  assert.doesNotMatch(dashboardProjectionSource, /jsonb_array_elements|app_state/);
  assert.doesNotMatch(analyticsProjectionSource, /jsonb_array_elements|app_state/);
  assert.doesNotMatch(source, /export async function getTeacherAnalyticsData/);
  assert.doesNotMatch(source, /export async function getTeacherDashboardData/);
  assert.doesNotMatch(source, /export async function getTeacherOperationsData/);
});
