import {
  dayKey,
  durationFallbackSeconds,
  hasRecordedDuration,
  isDurationlessStudyEvent,
  secondsToDisplayMinutes,
  startOfUtcDay
} from "@/lib/server/userStore/studentActivityPersistence";
import type {
  GuardianLink,
  GuardianLinkStatus,
  ParentChildSummary,
  ParentFoundationData,
  StudentAssignmentItem,
  StudentSession,
  SubmissionStatus,
  TeacherReportType
} from "@/types";

type ParentFoundationUserRole = "student" | "teacher" | "parent" | "admin";

export type ParentFoundationUserRecord = {
  id: string;
  role: ParentFoundationUserRole;
};

export type ParentFoundationGuardianLinkRecord = {
  id?: string;
  parent_id: string;
  student_id: string;
  status: GuardianLinkStatus | string;
  created_at?: string;
  updated_at?: string;
};

type ParentFoundationTeacherReportRecord = {
  type: TeacherReportType;
  student_id?: string | null;
};

type ParentFoundationTeacherMessageRecord = {
  guardian_id?: string;
  student_id: string;
  status: string;
};

type ParentFoundationAttemptRecord = {
  user_id: string;
  duration_seconds?: number | null;
  created_at: string;
};

type ParentFoundationLessonProgressRecord = {
  user_id: string;
  duration_seconds?: number | null;
  updated_at: string;
};

type ParentFoundationLearningEventRecord = Parameters<typeof isDurationlessStudyEvent>[0];

type ParentFoundationAssignmentRecord = {
  id: string;
  class_id: string;
};

type ParentFoundationSubmissionRecord = {
  assignment_id: string;
  student_id: string;
  updated_at: string;
};

type ParentFoundationTeacherClassRecord = {
  id: string;
  name: string;
  grade: StudentAssignmentItem["classGrade"];
};

type ParentFoundationClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type ParentFoundationStudentProfileRecord = {
  user_id: string;
  grade?: StudentAssignmentItem["classGrade"];
};

type ParentFoundationTopicRecord = {
  id: string;
  grade: StudentAssignmentItem["classGrade"];
  sort_order: number;
};

type ParentChildSummaryMistakeRecord = {
  user_id: string;
  question_id: string;
  mastered?: boolean | null;
};

type ParentChildSummaryQuestionRecord = {
  topic_id?: string | null;
};

export type ParentAssignmentItemsDatabase = {
  assignments: ParentFoundationAssignmentRecord[];
  submissions: ParentFoundationSubmissionRecord[];
  teacher_classes: ParentFoundationTeacherClassRecord[];
};

export type ParentClassTopicCandidateDatabase = {
  class_enrollments: ParentFoundationClassEnrollmentRecord[];
  student_profiles: ParentFoundationStudentProfileRecord[];
  teacher_classes: ParentFoundationTeacherClassRecord[];
  topics: ParentFoundationTopicRecord[];
};

export type ParentChildSummaryDatabase = ParentAssignmentItemsDatabase &
  ParentClassTopicCandidateDatabase &
  ParentFoundationPersistenceDatabase & {
    mistakes: ParentChildSummaryMistakeRecord[];
  };

export type ParentChildSummaryBuilderDependencies<Database extends ParentChildSummaryDatabase> = {
  latestStudentActivityAt: (database: Database, studentId: string) => string | null;
  motivationSummaryForStudent: (
    database: Database,
    studentId: string,
    now: Date
  ) => ParentChildSummary["motivationSummary"];
  now?: Date;
  parentReportsForStudent: (
    database: Database,
    studentId: string
  ) => Array<NonNullable<ParentChildSummary["latestParentReport"]>>;
  questionForId: (
    database: Database,
    questionId: string
  ) => ParentChildSummaryQuestionRecord | null | undefined;
  rewardSummaryForStudent: (database: Database, studentId: string) => ParentChildSummary["rewardSummary"];
  studentAverageMastery: (database: Database, studentId: string, topicIds: string[]) => number;
  toAssignment: (
    database: Database,
    assignment: Database["assignments"][number]
  ) => StudentAssignmentItem["assignment"];
  toStudentSession: (
    database: Database,
    user: Database["users"][number]
  ) => { user: ParentChildSummary["student"] } | null;
  toSubmission: (
    database: Database,
    submission: Database["submissions"][number]
  ) => StudentAssignmentItem["submission"];
  toTeacherClass: (
    database: Database,
    teacherClass: Database["teacher_classes"][number]
  ) => ParentChildSummary["classes"][number];
  topicRecordForId: (
    database: Database,
    topicId: string
  ) => Database["topics"][number] | null | undefined;
  toTopicWithProgress: (
    database: Database,
    studentId: string,
    topic: Database["topics"][number]
  ) => ParentChildSummary["strengths"][number];
  weeklyActivityForStudent: (
    database: Database,
    studentId: string,
    days: number,
    now: Date
  ) => ParentChildSummary["weeklyActivity"];
};

export type ParentFoundationPersistenceDatabase = {
  attempts?: ParentFoundationAttemptRecord[];
  guardian_links: ParentFoundationGuardianLinkRecord[];
  learning_events?: ParentFoundationLearningEventRecord[];
  lesson_progress?: ParentFoundationLessonProgressRecord[];
  teacher_messages: ParentFoundationTeacherMessageRecord[];
  teacher_reports: ParentFoundationTeacherReportRecord[];
  users: ParentFoundationUserRecord[];
};

export type ParentFoundationPersistenceStoreDependencies = {
  buildParentChildSummary: (
    database: ParentFoundationPersistenceDatabase,
    studentId: string
  ) => ParentChildSummary | null;
  readDatabase: () => Promise<ParentFoundationPersistenceDatabase>;
  toGuardianLink: (
    database: ParentFoundationPersistenceDatabase,
    link: ParentFoundationGuardianLinkRecord
  ) => GuardianLink;
  toParentSession: (
    database: ParentFoundationPersistenceDatabase,
    user: ParentFoundationUserRecord
  ) => StudentSession | null;
};

export type ParentFoundationPersistenceStore = ReturnType<typeof createParentFoundationPersistenceStore>;

function canUseParentArea(user?: ParentFoundationUserRecord | null): user is ParentFoundationUserRecord {
  return user?.role === "parent";
}

export function parentGuardianLinkRecordsFor(
  database: ParentFoundationPersistenceDatabase,
  user: ParentFoundationUserRecord
) {
  if (!canUseParentArea(user)) return [];
  return database.guardian_links
    .filter((link) => link.status === "active" && link.parent_id === user.id)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
}

function parentCanAccessStudentInDatabase(
  database: ParentFoundationPersistenceDatabase,
  parentId: string,
  studentId: string
) {
  const parent = database.users.find((candidate) => candidate.id === parentId);
  if (!canUseParentArea(parent)) return false;
  return database.guardian_links.some((link) => (
    link.parent_id === parentId &&
    link.student_id === studentId &&
    link.status === "active"
  ));
}

export function parentChildSummariesFor(
  database: ParentFoundationPersistenceDatabase,
  user: ParentFoundationUserRecord,
  buildParentChildSummary: ParentFoundationPersistenceStoreDependencies["buildParentChildSummary"]
) {
  return parentGuardianLinkRecordsFor(database, user)
    .map((link) => buildParentChildSummary(database, link.student_id))
    .filter((summary): summary is ParentChildSummary => Boolean(summary));
}

export function teacherClassesForStudent<Database extends ParentClassTopicCandidateDatabase>(
  database: Database,
  studentId: string
) {
  const classesById = new Map(database.teacher_classes.map((teacherClass) => [teacherClass.id, teacherClass]));
  return database.class_enrollments
    .filter((enrollment) => enrollment.student_id === studentId)
    .map((enrollment) => classesById.get(enrollment.class_id))
    .filter((teacherClass): teacherClass is Database["teacher_classes"][number] => Boolean(teacherClass));
}

export function parentTopicIdsForStudent<Database extends ParentClassTopicCandidateDatabase>(
  database: Database,
  studentId: string,
  classes: Array<{ grade: StudentAssignmentItem["classGrade"] }>
) {
  const profile = database.student_profiles.find((candidate) => candidate.user_id === studentId);
  const grades = new Set<StudentAssignmentItem["classGrade"]>(classes.map((teacherClass) => teacherClass.grade));
  if (profile?.grade) grades.add(profile.grade);
  return database.topics
    .filter((topic) => grades.has(topic.grade))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((topic) => topic.id);
}

export function selectedParentChild(children: ParentChildSummary[], selectedStudentId?: string | null) {
  if (selectedStudentId === undefined || selectedStudentId === null) return children[0] ?? null;
  return children.find((child) => child.student.id === selectedStudentId) ?? null;
}

const parentPendingSubmissionStatuses = new Set<SubmissionStatus>([
  "not-started",
  "in-progress",
  "late",
  "correction-required"
]);

export function parentSubmissionNeedsAttention(status: SubmissionStatus) {
  return parentPendingSubmissionStatuses.has(status);
}

export function buildParentWeeklyActivity(
  database: ParentFoundationPersistenceDatabase,
  studentId: string,
  days = 7,
  now = new Date()
) {
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = startOfUtcDay(now);
    date.setUTCDate(date.getUTCDate() - (days - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      day: new Intl.DateTimeFormat("en-HK", { weekday: "short", timeZone: "UTC" }).format(date),
      seconds: 0,
      hasDurationlessStudyActivity: false
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.date, bucket]));
  const earliest = startOfUtcDay(new Date(`${buckets[0]?.date ?? now.toISOString().slice(0, 10)}T00:00:00.000Z`)).getTime();
  const nowTime = now.getTime();

  (database.attempts ?? [])
    .filter((attempt) => attempt.user_id === studentId && Date.parse(attempt.created_at) >= earliest && Date.parse(attempt.created_at) <= nowTime)
    .forEach((attempt) => {
      const bucket = bucketMap.get(dayKey(attempt.created_at));
      if (!bucket) return;
      if (hasRecordedDuration(attempt.duration_seconds)) bucket.seconds += attempt.duration_seconds;
      else bucket.hasDurationlessStudyActivity = true;
    });

  (database.lesson_progress ?? [])
    .filter((progress) => progress.user_id === studentId && Date.parse(progress.updated_at) >= earliest && Date.parse(progress.updated_at) <= nowTime)
    .forEach((progress) => {
      const bucket = bucketMap.get(dayKey(progress.updated_at));
      if (!bucket) return;
      if (hasRecordedDuration(progress.duration_seconds)) bucket.seconds += progress.duration_seconds;
      else bucket.hasDurationlessStudyActivity = true;
    });

  (database.learning_events ?? [])
    .filter((event) => event.user_id === studentId && Date.parse(event.created_at) >= earliest && Date.parse(event.created_at) <= nowTime)
    .forEach((event) => {
      const bucket = bucketMap.get(dayKey(event.created_at));
      if (!bucket) return;
      if (hasRecordedDuration(event.duration_seconds)) bucket.seconds += event.duration_seconds;
      else if (isDurationlessStudyEvent(event)) bucket.hasDurationlessStudyActivity = true;
    });

  return buckets.map((bucket) => ({
    day: bucket.day,
    minutes: secondsToDisplayMinutes(bucket.seconds || (bucket.hasDurationlessStudyActivity ? durationFallbackSeconds : 0))
  }));
}

export function parentAssignmentItemsForStudent<Database extends ParentAssignmentItemsDatabase>(
  database: Database,
  studentId: string,
  toAssignment: (
    database: Database,
    assignment: Database["assignments"][number]
  ) => StudentAssignmentItem["assignment"],
  toSubmission: (
    database: Database,
    submission: Database["submissions"][number]
  ) => StudentAssignmentItem["submission"]
) {
  return database.submissions
    .filter((submission) => submission.student_id === studentId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((submission) => {
      const assignment = database.assignments.find((candidate) => candidate.id === submission.assignment_id);
      const teacherClass = assignment
        ? database.teacher_classes.find((candidate) => candidate.id === assignment.class_id)
        : null;
      if (!assignment || !teacherClass) return null;
      return {
        assignment: toAssignment(database, assignment),
        submission: toSubmission(database, submission),
        className: teacherClass.name,
        classGrade: teacherClass.grade
      };
    })
    .filter((item): item is StudentAssignmentItem => Boolean(item));
}

export function buildParentChildSummary<Database extends ParentChildSummaryDatabase>(
  database: Database,
  studentId: string,
  dependencies: ParentChildSummaryBuilderDependencies<Database>
): ParentChildSummary | null {
  const studentUser = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
  if (!studentUser) return null;

  const student = dependencies.toStudentSession(database, studentUser);
  if (!student) return null;

  const now = dependencies.now ?? new Date();
  const classes = teacherClassesForStudent(database, studentId);
  const topicIds = parentTopicIdsForStudent(database, studentId, classes);
  const topicRows = topicIds
    .map((topicId) => {
      const topic = dependencies.topicRecordForId(database, topicId);
      return topic ? dependencies.toTopicWithProgress(database, studentId, topic) : null;
    })
    .filter((topic): topic is ParentChildSummary["strengths"][number] => Boolean(topic));
  const activeMistakeTopicIds = new Set(
    database.mistakes
      .filter((mistake) => mistake.user_id === studentId && !mistake.mastered)
      .map((mistake) => dependencies.questionForId(database, mistake.question_id)?.topic_id)
      .filter((topicId): topicId is string => Boolean(topicId))
  );
  const supportTopics = topicRows
    .filter((topic) => activeMistakeTopicIds.has(topic.id) || (topic.mastery > 0 && topic.mastery < 65))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4);
  const strengths = topicRows
    .filter((topic) => topic.mastery >= 70)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 3);
  const assignments = parentAssignmentItemsForStudent(
    database,
    studentId,
    dependencies.toAssignment,
    dependencies.toSubmission
  ).slice(0, 6);
  const pendingAssignments = assignments.filter((item) => parentSubmissionNeedsAttention(item.submission.status)).length;
  const rewardSummary = dependencies.rewardSummaryForStudent(database, studentId);
  const motivationSummary = dependencies.motivationSummaryForStudent(database, studentId, now);
  const latestParentReport = dependencies.parentReportsForStudent(database, studentId)[0] ?? null;
  const weeklyActivity = dependencies.weeklyActivityForStudent(database, studentId, 7, now);
  const learningMinutes7d = weeklyActivity.reduce((sum, day) => sum + day.minutes, 0);
  const averageMastery = dependencies.studentAverageMastery(database, studentId, topicIds);
  const latestActivityAt = dependencies.latestStudentActivityAt(database, studentId);
  const celebrate = [
    strengths[0]
      ? { en: `${strengths[0].title.en} is currently a strength.`, zh: `${strengths[0].title.zh} 目前是強項。` }
      : { en: "Learning signals are starting to build.", zh: "學習訊號正在累積。" },
    rewardSummary.available > 0
      ? { en: `${rewardSummary.available} reward points are ready for teacher-approved gifts.`, zh: `已有 ${rewardSummary.available} 可用積分，可申請教師批核獎品。` }
      : { en: "Small routines this week can unlock more reward points.", zh: "本週保持小習慣可賺取更多積分。" }
  ];
  const support = [
    supportTopics[0]
      ? { en: `Review ${supportTopics[0].title.en} together for 10 minutes.`, zh: `可一起用 10 分鐘重溫 ${supportTopics[0].title.zh}。` }
      : { en: "Ask your child to explain one solved question aloud.", zh: "可請孩子口頭講解一題已完成題目。" },
    pendingAssignments > 0
      ? { en: `${pendingAssignments} recent assignment item needs attention.`, zh: `有 ${pendingAssignments} 項近期作業需要留意。` }
      : { en: "No urgent assignment follow-up in the latest list.", zh: "最近作業列表暫無緊急跟進。" }
  ];

  return {
    student: student.user,
    classes: classes.map((teacherClass) => dependencies.toTeacherClass(database, teacherClass)),
    generatedAt: now.toISOString(),
    averageMastery,
    learningMinutes7d,
    latestActivityAt,
    weeklyActivity,
    strengths,
    supportTopics,
    assignments,
    rewardSummary,
    motivationSummary,
    latestParentReport,
    celebrate,
    support
  };
}

export function createParentChildSummaryBuilder<SourceDatabase, Database extends ParentChildSummaryDatabase>(
  dependencies: ParentChildSummaryBuilderDependencies<Database>,
  toSummaryDatabase: (database: SourceDatabase) => Database
) {
  return (database: SourceDatabase, studentId: string) => buildParentChildSummary(
    toSummaryDatabase(database),
    studentId,
    dependencies
  );
}

export function createParentFoundationPersistenceStore({
  buildParentChildSummary,
  readDatabase,
  toGuardianLink,
  toParentSession
}: ParentFoundationPersistenceStoreDependencies) {
  return {
    async getParentFoundationData(
      parentId: string,
      selectedStudentId?: string | null
    ): Promise<ParentFoundationData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === parentId);
      if (user?.role !== "parent") return null;
      const parent = toParentSession(database, user);
      if (!parent) return null;

      const links = parentGuardianLinkRecordsFor(database, user).map((link) => toGuardianLink(database, link));
      const children = parentChildSummariesFor(database, user, buildParentChildSummary);
      const selectedChild = selectedParentChild(children, selectedStudentId);
      if (selectedStudentId !== undefined && selectedStudentId !== null && !selectedChild) return null;
      const linkedStudentIds = new Set(children.map((child) => child.student.id));

      return {
        parent,
        children,
        selectedChild,
        links,
        totals: {
          children: children.length,
          activeReports: database.teacher_reports.filter((report) =>
            report.type === "parent-summary" &&
            report.student_id &&
            linkedStudentIds.has(report.student_id)
          ).length,
          openMessages: database.teacher_messages.filter((message) =>
            message.guardian_id === user.id &&
            linkedStudentIds.has(message.student_id) &&
            message.status !== "resolved"
          ).length,
          pendingAssignments: children.reduce((sum, child) => {
            return sum + child.assignments.filter((item) => parentSubmissionNeedsAttention(item.submission.status)).length;
          }, 0)
        }
      };
    },
    async getParentChildSummary(parentId: string, studentId: string): Promise<ParentChildSummary | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === parentId);
      if (!canUseParentArea(user) || !parentCanAccessStudentInDatabase(database, parentId, studentId)) return null;
      return buildParentChildSummary(database, studentId);
    }
  };
}
