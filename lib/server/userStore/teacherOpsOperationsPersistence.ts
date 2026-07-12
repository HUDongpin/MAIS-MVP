import {
  dayKey,
  startOfUtcDay
} from "@/lib/server/userStore/studentActivityPersistence";
import type {
  ClassRosterProfile,
  GradeId,
  LocalizedText,
  PrepTeam,
  SchoolMembershipRole,
  StudentSession,
  TeacherActionQueueItem,
  TeacherAnalyticsData,
  TeacherAnalyticsFrequentMistake,
  TeacherAnalyticsInterventionGroup,
  TeacherAnalyticsStudentRisk,
  TeacherAnalyticsTopicCell,
  TeacherClass,
  TeacherClassDashboardSummary,
  TeacherClassCollaborator,
  TeacherDashboardData,
  TeacherMissingWorkItem,
  TeacherInterventionAction,
  TeacherMasteryHeatmapCell,
  TeacherNotice,
  TeacherNoticeStatus,
  TeacherOperationsData,
  TeacherReminderPolicy,
  TeacherReminderRun,
  TeacherReminderThreshold,
  TeacherNoticeDeliveryStatus,
  TeacherStudentRiskTag,
  TermArchive,
  WeComChannelSummary
} from "@/types";

type TeacherOpsOperationsUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsOperationsUserRecord = {
  id: string;
  role: TeacherOpsOperationsUserRole;
};

type TeacherOpsOperationsClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade: GradeId;
  updated_at: string;
};

type TeacherOpsOperationsSchoolMembershipRecord = {
  user_id: string;
  role: SchoolMembershipRole;
  class_id?: string;
};

type TeacherOpsOperationsClassCollaboratorRecord = {
  id: string;
  class_id: string;
  teacher_id: string;
  role: TeacherClassCollaborator["role"];
  status: "active" | "revoked" | "invited" | "inactive";
};

type TeacherOpsOperationsNoticeRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  status: TeacherNoticeStatus;
  updated_at: string;
};

type TeacherOpsOperationsReminderRunRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  assignment_id: string;
  student_id: string;
  notice_id?: string;
  threshold: TeacherReminderThreshold;
  status: TeacherNoticeDeliveryStatus | "skipped";
  reason: string;
  created_at: string;
};

type TeacherOpsOperationsPrepTeamRecord = {
  id: string;
  teacher_ids: string[];
  updated_at: string;
};

type TeacherOpsOperationsTermArchiveRecord = {
  id: string;
  class_id: string;
  created_at: string;
};

type TeacherOpsActivityTrendAttemptRecord = {
  user_id: string;
  created_at: string;
  is_correct: boolean;
  duration_seconds?: number | null;
};

type TeacherOpsActivityTrendLearningEventRecord = {
  user_id: string;
  created_at: string;
  type: string;
  duration_seconds?: number | null;
};

type TeacherOpsActivityTrendTutorMessageRecord = {
  user_id: string;
  created_at: string;
};

type TeacherOpsActivityTrendSubmissionRecord = {
  student_id: string;
  updated_at: string;
};

type TeacherOpsAnalyticsAttemptRecord = {
  user_id: string;
  question_id: string;
};

type TeacherOpsAnalyticsLearningEventRecord = {
  user_id: string;
  type: string;
  topic_id?: string | null;
  created_at: string;
};

type TeacherOpsAnalyticsTutorMessageRecord = {
  user_id: string;
  created_at: string;
};

type TeacherOpsFrequentMistakeRecord = {
  user_id: string;
  question_id: string;
  wrong_attempts: number;
  last_attempt_at: string;
};

type TeacherOpsFrequentMistakeClassRecord = {
  id: string;
  name: string;
};

type TeacherOpsFrequentMistakeQuestionRecord = {
  id: string;
  topic_id: string;
  prompt_en: string;
  prompt_zh: string;
};

type TeacherOpsTopicMasteryAttemptRecord = TeacherOpsAnalyticsAttemptRecord & {
  duration_seconds?: number | null;
};

type TeacherOpsTopicMasteryClassRecord = {
  id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsTopicMasteryLessonProgressRecord = {
  user_id: string;
  topic_id: string;
  mastery: number;
};

type TeacherOpsTopicMasteryMistakeRecord = {
  user_id: string;
  question_id: string;
  wrong_attempts: number;
};

type TeacherOpsTopicMasteryTopicRecord = {
  id: string;
  grade: GradeId;
  sort_order: number;
};

type TeacherOpsTopicMasteryDatabase<TopicRecord extends TeacherOpsTopicMasteryTopicRecord> = {
  ai_tutor_messages: TeacherOpsAnalyticsTutorMessageRecord[];
  attempts: TeacherOpsTopicMasteryAttemptRecord[];
  learning_events: TeacherOpsAnalyticsLearningEventRecord[];
  lesson_progress: TeacherOpsTopicMasteryLessonProgressRecord[];
  mistakes: TeacherOpsTopicMasteryMistakeRecord[];
  topics: TopicRecord[];
};

type TeacherOpsStudentRiskAttemptRecord = {
  user_id: string;
  duration_seconds?: number | null;
};

type TeacherOpsStudentRiskClassRecord = {
  id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsStudentRiskMistakeRecord = {
  user_id: string;
  mastered?: boolean | null;
};

type TeacherOpsStudentRiskPair = {
  classId: string;
  studentId: string;
};

type TeacherOpsStudentRiskProfile = {
  name?: string | null;
  grade?: GradeId | null;
};

type TeacherOpsStudentRiskSummary = {
  averageMastery: number;
  assignmentCompletionRate: number;
  grade: GradeId;
  riskTags: TeacherStudentRiskTag[];
  studentName: string;
};

type TeacherOpsStudentRiskDatabase = {
  ai_tutor_messages: TeacherOpsAnalyticsTutorMessageRecord[];
  attempts: TeacherOpsStudentRiskAttemptRecord[];
  learning_events: TeacherOpsAnalyticsLearningEventRecord[];
  mistakes: TeacherOpsStudentRiskMistakeRecord[];
};

type TeacherOpsAnalyticsDataBuilderAttemptRecord = {
  user_id: string;
  question_id: string;
  created_at: string;
  is_correct: boolean;
  duration_seconds?: number | null;
};

type TeacherOpsAnalyticsDataBuilderLearningEventRecord = TeacherOpsAnalyticsLearningEventRecord & {
  duration_seconds?: number | null;
};

type TeacherOpsAnalyticsDataBuilderMistakeRecord =
  TeacherOpsFrequentMistakeRecord &
  TeacherOpsStudentRiskMistakeRecord &
  TeacherOpsTopicMasteryMistakeRecord;

type TeacherOpsAnalyticsDataBuilderUserRecord = {
  id: string;
  role: TeacherOpsOperationsUserRole;
};

type TeacherOpsAnalyticsDataBuilderDatabase<TopicRecord extends TeacherOpsTopicMasteryTopicRecord> = {
  ai_tutor_messages: TeacherOpsAnalyticsTutorMessageRecord[];
  attempts: TeacherOpsAnalyticsDataBuilderAttemptRecord[];
  learning_events: TeacherOpsAnalyticsDataBuilderLearningEventRecord[];
  lesson_progress: TeacherOpsTopicMasteryLessonProgressRecord[];
  mistakes: TeacherOpsAnalyticsDataBuilderMistakeRecord[];
  submissions: TeacherOpsActivityTrendSubmissionRecord[];
  topics: TopicRecord[];
  users: TeacherOpsAnalyticsDataBuilderUserRecord[];
};

type TeacherOpsAnalyticsLessonProgressAttemptRecord = {
  user_id: string;
  question_id: string;
  created_at: string;
  is_correct: boolean;
};

type TeacherOpsAnalyticsLessonProgressRecord = {
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
};

type TeacherOpsAnalyticsLessonProgressDatabase = {
  attempts: TeacherOpsAnalyticsLessonProgressAttemptRecord[];
  lesson_progress: TeacherOpsAnalyticsLessonProgressRecord[];
};

type TeacherOpsAnalyticsHotActivityAttemptRecord = TeacherOpsAnalyticsLessonProgressAttemptRecord & {
  id?: string;
};

type TeacherOpsAnalyticsHotActivityMistakeRecord = {
  user_id: string;
  question_id: string;
};

type TeacherOpsAnalyticsHotActivityLearningEventRecord = {
  id?: string;
  user_id: string;
  type: string;
  topic_id?: string | null;
  created_at: string;
};

type TeacherOpsAnalyticsHotActivityDatabase = TeacherOpsAnalyticsLessonProgressDatabase & {
  attempts: TeacherOpsAnalyticsHotActivityAttemptRecord[];
  mistakes: TeacherOpsAnalyticsHotActivityMistakeRecord[];
  learning_events: TeacherOpsAnalyticsHotActivityLearningEventRecord[];
};

type TeacherOpsDashboardUserRecord = {
  id: string;
  role: TeacherOpsOperationsUserRole;
};

type TeacherOpsDashboardClassRecord = {
  id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsDashboardClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type TeacherOpsDashboardStudentProfileRecord = {
  user_id: string;
  name?: string | null;
};

type TeacherOpsDashboardAssignmentRecord = {
  id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  status: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

type TeacherOpsDashboardSubmissionRecord = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
};

type TeacherOpsDashboardTeacherReviewRecord = {
  submission_id: string;
  correction_due_at: string | null;
  created_at: string;
};

type TeacherOpsDashboardMistakeRecord = {
  user_id: string;
  wrong_attempts: number;
  mastered?: boolean | null;
  last_attempt_at: string;
};

type TeacherOpsDashboardActivityRecord = {
  user_id: string;
  created_at: string;
};

type TeacherOpsDashboardVisualizationSessionRecord = {
  user_id: string;
  updated_at: string;
};

type TeacherOpsDashboardTutorMessageRecord = {
  user_id: string;
  created_at: string;
};

type TeacherOpsDashboardLessonProgressRecord = {
  user_id: string;
  topic_id: string;
  mastery: number;
};

type TeacherOpsDashboardTopicRecord = {
  id: string;
  grade: GradeId;
  sort_order: number;
};

type TeacherOpsDashboardMessageRecord = {
  id: string;
  class_id?: string;
  student_id: string;
  status: string;
  priority: string;
  subject_en: string;
  subject_zh: string;
  last_message_at: string;
};

type TeacherOpsDashboardDataBuilderDatabase<TopicRecord extends TeacherOpsDashboardTopicRecord> = {
  ai_tutor_messages: TeacherOpsDashboardTutorMessageRecord[];
  assignment_teacher_reviews: TeacherOpsDashboardTeacherReviewRecord[];
  assignments: TeacherOpsDashboardAssignmentRecord[];
  attempts: TeacherOpsDashboardActivityRecord[];
  class_enrollments: TeacherOpsDashboardClassEnrollmentRecord[];
  learning_events: TeacherOpsDashboardActivityRecord[];
  lesson_progress: TeacherOpsDashboardLessonProgressRecord[];
  mistakes: TeacherOpsDashboardMistakeRecord[];
  student_profiles: TeacherOpsDashboardStudentProfileRecord[];
  submissions: TeacherOpsDashboardSubmissionRecord[];
  topics: TopicRecord[];
  users: TeacherOpsDashboardUserRecord[];
  visualization_sessions: TeacherOpsDashboardVisualizationSessionRecord[];
};

export type TeacherOpsActivityTrendDatabase = {
  ai_tutor_messages: TeacherOpsActivityTrendTutorMessageRecord[];
  attempts: TeacherOpsActivityTrendAttemptRecord[];
  learning_events: TeacherOpsActivityTrendLearningEventRecord[];
  submissions: TeacherOpsActivityTrendSubmissionRecord[];
};

export type TeacherOpsOperationsPersistenceDatabase = {
  prep_teams: TeacherOpsOperationsPrepTeamRecord[];
  school_memberships?: TeacherOpsOperationsSchoolMembershipRecord[];
  teacher_class_collaborators: TeacherOpsOperationsClassCollaboratorRecord[];
  teacher_classes: TeacherOpsOperationsClassRecord[];
  teacher_notices: TeacherOpsOperationsNoticeRecord[];
  teacher_reminder_runs: TeacherOpsOperationsReminderRunRecord[];
  term_archives: TeacherOpsOperationsTermArchiveRecord[];
  users: TeacherOpsOperationsUserRecord[];
};

export type TeacherOpsOperationsPersistenceStoreDependencies = {
  analyticsDataFromPostgresProjection: (
    userId: string,
    selectedClassId?: string | null
  ) => Promise<TeacherAnalyticsData | null | undefined>;
  buildAnalyticsData: (
    database: TeacherOpsOperationsPersistenceDatabase,
    userId: string,
    selectedClassId?: string | null
  ) => TeacherAnalyticsData | null;
  buildDashboardData: (
    database: TeacherOpsOperationsPersistenceDatabase,
    userId: string
  ) => TeacherDashboardData | null;
  classProjection: (
    database: TeacherOpsOperationsPersistenceDatabase,
    teacherClass: TeacherOpsOperationsClassRecord
  ) => TeacherClass;
  collaboratorsForClass: (
    database: TeacherOpsOperationsPersistenceDatabase,
    teacherClass: TeacherOpsOperationsClassRecord
  ) => TeacherClassCollaborator[];
  dashboardDataFromPostgresProjection: (userId: string) => Promise<TeacherDashboardData | null | undefined>;
  getNotificationSummary: (classId?: string) => {
    enabled: boolean;
    channels: WeComChannelSummary[];
  };
  isStorageFreeExampleTeacher: (userId: string) => boolean;
  missingWorkForClasses: (
    database: TeacherOpsOperationsPersistenceDatabase,
    classes: TeacherOpsOperationsClassRecord[]
  ) => TeacherMissingWorkItem[];
  noticeProjection: (
    database: TeacherOpsOperationsPersistenceDatabase,
    notice: TeacherOpsOperationsNoticeRecord
  ) => TeacherNotice;
  now: () => Date;
  prepTeamProjection: (
    database: TeacherOpsOperationsPersistenceDatabase,
    team: TeacherOpsOperationsPrepTeamRecord
  ) => PrepTeam;
  readDatabase: () => Promise<TeacherOpsOperationsPersistenceDatabase>;
  reminderPolicy: TeacherReminderPolicy;
  reminderRunProjection: (
    database: TeacherOpsOperationsPersistenceDatabase,
    run: TeacherOpsOperationsReminderRunRecord
  ) => TeacherReminderRun;
  rosterProfilesForClass: (
    database: TeacherOpsOperationsPersistenceDatabase,
    classId: string
  ) => ClassRosterProfile[];
  storageFreeExampleDatabase: (userId: string) => TeacherOpsOperationsPersistenceDatabase | null;
  teacherSessionProjection: (
    database: TeacherOpsOperationsPersistenceDatabase,
    user: TeacherOpsOperationsUserRecord
  ) => StudentSession | null;
  termArchiveProjection: (
    archive: TeacherOpsOperationsTermArchiveRecord
  ) => TermArchive;
};

export type TeacherOpsOperationsPersistenceStore = ReturnType<typeof createTeacherOpsOperationsPersistenceStore>;

function canUseTeacherArea(user?: TeacherOpsOperationsUserRecord | null): user is TeacherOpsOperationsUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function timestampOf(value?: string | null) {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

export const teacherOpsOperationsTimestampOf = timestampOf;

export function teacherOpsMergeAnalyticsRecordsBy<T>(
  records: T[],
  overlay: T[],
  keyFor: (record: T) => string | null
) {
  const merged = new Map<string, T>();
  records.forEach((record) => {
    const key = keyFor(record);
    if (key) merged.set(key, record);
  });
  overlay.forEach((record) => {
    const key = keyFor(record);
    if (key) merged.set(key, record);
  });
  return Array.from(merged.values());
}

export function teacherOpsUpsertAnalyticsLessonProgressFromAttempts({
  database,
  lessonSlugForTopic,
  topicIdForQuestionId
}: {
  database: TeacherOpsAnalyticsLessonProgressDatabase;
  lessonSlugForTopic: (topicId: string) => string;
  topicIdForQuestionId: (questionId: string) => string | null;
}) {
  const attemptsByStudentTopic = new Map<string, {
    attempts: TeacherOpsAnalyticsLessonProgressAttemptRecord[];
    topicId: string;
    userId: string;
  }>();

  database.attempts.forEach((attempt) => {
    const topicId = topicIdForQuestionId(attempt.question_id);
    if (!topicId) return;
    const key = `${attempt.user_id}\u0000${topicId}`;
    const current = attemptsByStudentTopic.get(key) ?? {
      attempts: [],
      topicId,
      userId: attempt.user_id
    };
    current.attempts.push(attempt);
    attemptsByStudentTopic.set(key, current);
  });

  attemptsByStudentTopic.forEach(({ attempts, topicId, userId }) => {
    if (!attempts.length) return;
    const latestAttemptAt = attempts
      .map((attempt) => timestampOf(attempt.created_at))
      .filter((time): time is number => time !== null)
      .sort((a, b) => b - a)[0] ?? Date.now();
    const latestAttemptIso = new Date(latestAttemptAt).toISOString();
    const correctAttempts = attempts.filter((attempt) => attempt.is_correct).length;
    const accuracy = correctAttempts / attempts.length;
    const mastery = Math.min(100, Math.round(accuracy * 85 + Math.min(15, attempts.length * 3)));
    const status: TeacherOpsAnalyticsLessonProgressRecord["status"] = mastery >= 75 ? "completed" : "in-progress";
    const existing = database.lesson_progress.find(
      (progress) => progress.user_id === userId && progress.topic_id === topicId
    );

    if (existing) {
      const existingUpdatedAt = timestampOf(existing.updated_at);
      if (existingUpdatedAt !== null && existingUpdatedAt > latestAttemptAt) return;
      existing.lesson_slug = existing.lesson_slug ?? lessonSlugForTopic(topicId);
      existing.mastery = mastery;
      existing.status = status;
      existing.started_at = existing.started_at ?? latestAttemptIso;
      existing.completed_at = status === "completed" ? existing.completed_at ?? latestAttemptIso : null;
      existing.duration_seconds = existing.duration_seconds ?? null;
      existing.checklist_state = existing.checklist_state ?? {};
      existing.updated_at = latestAttemptIso;
      return;
    }

    database.lesson_progress.push({
      user_id: userId,
      topic_id: topicId,
      lesson_slug: lessonSlugForTopic(topicId),
      status,
      mastery,
      started_at: latestAttemptIso,
      completed_at: status === "completed" ? latestAttemptIso : null,
      duration_seconds: null,
      checklist_state: {},
      updated_at: latestAttemptIso
    });
  });
}

export function teacherOpsOverlayAnalyticsHotActivityRows({
  database,
  hotAttempts,
  hotLearningEvents,
  hotMistakes,
  lessonSlugForTopic,
  topicIdForQuestionId
}: {
  database: TeacherOpsAnalyticsHotActivityDatabase;
  hotAttempts: TeacherOpsAnalyticsHotActivityAttemptRecord[];
  hotLearningEvents: TeacherOpsAnalyticsHotActivityLearningEventRecord[];
  hotMistakes: TeacherOpsAnalyticsHotActivityMistakeRecord[];
  lessonSlugForTopic: (topicId: string) => string;
  topicIdForQuestionId: (questionId: string) => string | null;
}) {
  if (!hotAttempts.length && !hotMistakes.length && !hotLearningEvents.length) return;

  database.attempts = teacherOpsMergeAnalyticsRecordsBy(
    database.attempts,
    hotAttempts,
    (attempt) => attempt.id || `${attempt.user_id}:${attempt.question_id}:${attempt.created_at}`
  );
  database.mistakes = teacherOpsMergeAnalyticsRecordsBy(
    database.mistakes,
    hotMistakes,
    (mistake) => `${mistake.user_id}:${mistake.question_id}`
  );
  database.learning_events = teacherOpsMergeAnalyticsRecordsBy(
    database.learning_events,
    hotLearningEvents,
    (event) => event.id || `${event.user_id}:${event.type}:${event.topic_id}:${event.created_at}`
  );
  teacherOpsUpsertAnalyticsLessonProgressFromAttempts({
    database,
    lessonSlugForTopic,
    topicIdForQuestionId
  });
}

const dayMs = 24 * 60 * 60 * 1000;

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function isWithinDays(value: string | null | undefined, nowMs: number, days: number) {
  const time = timestampOf(value);
  return time !== null && time >= nowMs - days * dayMs && time <= nowMs + days * dayMs;
}

function average(values: number[]) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  return finiteValues.length ? Math.round(finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length) : null;
}

function userTopicProgressKey(userId: string, topicId: string) {
  return `${userId}\u0000${topicId}`;
}

function actionPriorityRank(priority: TeacherActionQueueItem["priority"]) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

export function teacherOpsStudentAnswerAttemptsForTopic<AttemptRecord extends TeacherOpsAnalyticsAttemptRecord, Database>(
  database: Database & { attempts: AttemptRecord[] },
  studentIds: Set<string>,
  questionTopicIdForId: (database: Database, questionId: string) => string | null | undefined,
  topicId?: string
) {
  return database.attempts.filter((attempt) => {
    if (!studentIds.has(attempt.user_id)) return false;
    if (!topicId) return true;
    return questionTopicIdForId(database, attempt.question_id) === topicId;
  });
}

export function teacherOpsHintRequestsFor(
  database: { learning_events: TeacherOpsAnalyticsLearningEventRecord[] },
  studentIds: Set<string>,
  nowMs: number,
  days: number,
  topicId?: string
) {
  const earliest = nowMs - days * dayMs;
  return database.learning_events.filter((event) => {
    const eventMs = timestampOf(event.created_at);
    return (
      event.type === "hint-request" &&
      studentIds.has(event.user_id) &&
      eventMs !== null &&
      eventMs >= earliest &&
      eventMs <= nowMs &&
      (!topicId || event.topic_id === topicId)
    );
  }).length;
}

export function teacherOpsAiTutorMessagesFor(
  database: { ai_tutor_messages: TeacherOpsAnalyticsTutorMessageRecord[] },
  studentIds: Set<string>,
  nowMs: number,
  days: number
) {
  const earliest = nowMs - days * dayMs;
  return database.ai_tutor_messages.filter((message) => {
    const messageMs = timestampOf(message.created_at);
    return studentIds.has(message.user_id) && messageMs !== null && messageMs >= earliest && messageMs <= nowMs;
  }).length;
}

export function teacherOpsBuildTopicMastery<
  CurriculumProfile,
  TopicRecord extends TeacherOpsTopicMasteryTopicRecord,
  ClassRecord extends TeacherOpsTopicMasteryClassRecord,
  Database extends TeacherOpsTopicMasteryDatabase<TopicRecord>
>(
  database: Database,
  classRecords: ClassRecord[],
  nowMs: number,
  dependencies: {
    teacherStudentIdsForClass: (database: Database, classId: string) => string[];
    curriculumProfileForClass: (database: Database, teacherClass: ClassRecord) => CurriculumProfile;
    isCurriculumTopic: (topic: TopicRecord, curriculumProfile: CurriculumProfile) => boolean;
    localizedTopic: (topic: TopicRecord) => LocalizedText;
    questionTopicIdForId: (database: Database, questionId: string) => string | null | undefined;
  }
): TeacherAnalyticsTopicCell[] {
  return classRecords.flatMap((teacherClass) => {
    const classStudentIds = new Set(dependencies.teacherStudentIdsForClass(database, teacherClass.id));
    if (classStudentIds.size === 0) return [];
    const curriculumProfile = dependencies.curriculumProfileForClass(database, teacherClass);
    return database.topics
      .filter((topic) => dependencies.isCurriculumTopic(topic, curriculumProfile) && topic.grade === teacherClass.grade)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((topic) => {
        const masteryValues = Array.from(classStudentIds).map((studentId) => {
          return database.lesson_progress.find((progress) => progress.user_id === studentId && progress.topic_id === topic.id)?.mastery ?? 0;
        });
        const topicAttempts = teacherOpsStudentAnswerAttemptsForTopic(
          database,
          classStudentIds,
          dependencies.questionTopicIdForId,
          topic.id
        );
        const answerDurations = topicAttempts
          .map((attempt) => attempt.duration_seconds)
          .filter((duration): duration is number => typeof duration === "number");
        const wrongAttempts = database.mistakes
          .filter((mistake) => classStudentIds.has(mistake.user_id) && dependencies.questionTopicIdForId(database, mistake.question_id) === topic.id)
          .reduce((sum, mistake) => sum + mistake.wrong_attempts, 0);
        const averageMastery = average(masteryValues) ?? 0;
        const weakStudentCount = masteryValues.filter((mastery) => mastery < 60).length;
        const hintRequests = teacherOpsHintRequestsFor(database, classStudentIds, nowMs, 30, topic.id);

        return {
          id: `${teacherClass.id}-${topic.id}`,
          classId: teacherClass.id,
          className: teacherClass.name,
          grade: teacherClass.grade,
          topicId: topic.id,
          topicTitle: dependencies.localizedTopic(topic),
          averageMastery,
          studentCount: classStudentIds.size,
          weakStudentCount,
          averageAnswerSeconds: average(answerDurations),
          hintRequests,
          aiTutorMessages: teacherOpsAiTutorMessagesFor(database, classStudentIds, nowMs, 30),
          wrongAttempts,
          reteachRecommended: averageMastery < 58 || weakStudentCount >= Math.ceil(Math.max(1, classStudentIds.size) / 2) || wrongAttempts >= 6,
          href: `/teacher/classes/${encodeURIComponent(teacherClass.id)}?topic=${encodeURIComponent(topic.id)}`
        };
      });
  });
}

export function teacherOpsBuildStudentRisks<
  Database extends TeacherOpsStudentRiskDatabase,
  ClassRecord extends TeacherOpsStudentRiskClassRecord
>(
  database: Database,
  studentPairs: TeacherOpsStudentRiskPair[],
  classRecords: ClassRecord[],
  nowMs: number,
  dependencies: {
    topicIdsForClass: (database: Database, classRecord: ClassRecord) => string[];
    classStudentSummary: (
      database: Database,
      classRecord: ClassRecord,
      studentId: string,
      nowMs: number
    ) => TeacherOpsStudentRiskSummary | null | undefined;
    latestStudentActivityAt: (database: Database, studentId: string) => string | null | undefined;
    studentAverageMastery: (database: Database, studentId: string, topicIds: string[]) => number;
    riskTagsForStudent: (
      database: Database,
      studentId: string,
      topicIds: string[],
      nowMs: number
    ) => TeacherStudentRiskTag[];
    studentProfileFor: (database: Database, studentId: string) => TeacherOpsStudentRiskProfile | null | undefined;
  }
): TeacherAnalyticsStudentRisk[] {
  return studentPairs.map((pair) => {
    const classRecord = classRecords.find((teacherClass) => teacherClass.id === pair.classId) ?? classRecords[0];
    const topicIds = classRecord ? dependencies.topicIdsForClass(database, classRecord) : [];
    const summary = classRecord
      ? dependencies.classStudentSummary(database, classRecord, pair.studentId, nowMs)
      : null;
    const attempts = database.attempts.filter((attempt) => attempt.user_id === pair.studentId);
    const activeMistakes = database.mistakes.filter((mistake) => mistake.user_id === pair.studentId && !mistake.mastered).length;
    const latestActivityAt = dependencies.latestStudentActivityAt(database, pair.studentId) ?? null;
    const inactive = latestActivityAt ? nowMs - Date.parse(latestActivityAt) > 7 * dayMs : true;
    const studentIds = new Set([pair.studentId]);
    const hintRequests7d = teacherOpsHintRequestsFor(database, studentIds, nowMs, 7);
    const aiTutorMessages7d = teacherOpsAiTutorMessagesFor(database, studentIds, nowMs, 7);
    const averageMastery = summary?.averageMastery ?? dependencies.studentAverageMastery(database, pair.studentId, topicIds);
    const recommendedAction = teacherOpsRecommendedActionForStudent({ averageMastery, activeMistakes, inactive, aiTutorMessages7d });
    const tags = summary?.riskTags ?? dependencies.riskTagsForStudent(database, pair.studentId, topicIds, nowMs);
    const profile = dependencies.studentProfileFor(database, pair.studentId);
    const riskScore = Math.min(
      99,
      Math.max(0, 100 - averageMastery) +
        tags.length * 12 +
        Math.min(18, activeMistakes * 4) +
        Math.min(12, hintRequests7d * 2) +
        Math.min(12, aiTutorMessages7d)
    );

    return {
      studentId: pair.studentId,
      studentName: summary?.studentName ?? profile?.name ?? "Unknown student",
      classId: pair.classId,
      className: classRecord?.name ?? "",
      grade: summary?.grade ?? profile?.grade ?? classRecord?.grade ?? "S3",
      riskScore,
      averageMastery,
      assignmentCompletionRate: summary?.assignmentCompletionRate ?? 0,
      averageAnswerSeconds: average(attempts.map((attempt) => attempt.duration_seconds).filter((duration): duration is number => typeof duration === "number")),
      latestActivityAt,
      hintRequests7d,
      aiTutorMessages7d,
      activeMistakes,
      tags,
      recommendedAction,
      recommendation: teacherOpsInterventionRecommendation(recommendedAction),
      href: `/teacher/classes/${encodeURIComponent(pair.classId)}/students/${encodeURIComponent(pair.studentId)}`
    };
  }).sort((a, b) => b.riskScore - a.riskScore || a.studentName.localeCompare(b.studentName));
}

export function teacherOpsBuildAnalyticsSummary<Database extends Pick<
  TeacherOpsStudentRiskDatabase,
  "ai_tutor_messages" | "attempts" | "learning_events"
>>(
  database: Database,
  studentIds: Set<string>,
  topicMastery: Array<Pick<TeacherAnalyticsTopicCell, "averageMastery">>,
  studentRisks: Array<Pick<TeacherAnalyticsStudentRisk, "riskScore" | "tags">>,
  nowMs: number,
  dependencies: {
    latestStudentActivityAt: (database: Database, studentId: string) => string | null | undefined;
  }
): TeacherAnalyticsData["summary"] {
  const averageMastery = topicMastery.length
    ? Math.round(topicMastery.reduce((sum, cell) => sum + cell.averageMastery, 0) / topicMastery.length)
    : 0;
  const allAttempts = database.attempts.filter((attempt) => studentIds.has(attempt.user_id));
  const allAnswerDurations = allAttempts
    .map((attempt) => attempt.duration_seconds)
    .filter((duration): duration is number => typeof duration === "number");
  const activeStudents7d = new Set(
    Array.from(studentIds).filter((studentId) => {
      const activityAt = dependencies.latestStudentActivityAt(database, studentId);
      return activityAt ? nowMs - Date.parse(activityAt) <= 7 * dayMs : false;
    })
  ).size;
  const activeStudents30d = new Set(
    Array.from(studentIds).filter((studentId) => {
      const activityAt = dependencies.latestStudentActivityAt(database, studentId);
      return activityAt ? nowMs - Date.parse(activityAt) <= 30 * dayMs : false;
    })
  ).size;

  return {
    averageMastery,
    atRiskStudents: studentRisks.filter((risk) => risk.riskScore >= 45 || risk.tags.length > 0).length,
    averageAnswerSeconds: average(allAnswerDurations),
    hintRequests7d: teacherOpsHintRequestsFor(database, studentIds, nowMs, 7),
    aiTutorMessages7d: teacherOpsAiTutorMessagesFor(database, studentIds, nowMs, 7),
    activeStudents7d,
    activeStudents30d
  };
}

export function createTeacherOpsAnalyticsDataBuilder<
  CurriculumProfile,
  TopicRecord extends TeacherOpsTopicMasteryTopicRecord,
  ClassRecord extends TeacherOpsTopicMasteryClassRecord & TeacherOpsFrequentMistakeClassRecord,
  QuestionRecord extends TeacherOpsFrequentMistakeQuestionRecord,
  Database extends TeacherOpsAnalyticsDataBuilderDatabase<TopicRecord>
>(dependencies: {
  now: () => Date;
  classRecordsForUser: (database: Database, user: Database["users"][number]) => ClassRecord[];
  classProjection: (database: Database, teacherClass: ClassRecord) => TeacherClass;
  teacherClassStudentPairs: (database: Database, classRecords: ClassRecord[]) => TeacherOpsStudentRiskPair[];
  topicMastery: {
    teacherStudentIdsForClass: (database: Database, classId: string) => string[];
    curriculumProfileForClass: (database: Database, teacherClass: ClassRecord) => CurriculumProfile;
    isCurriculumTopic: (topic: TopicRecord, curriculumProfile: CurriculumProfile) => boolean;
    localizedTopic: (topic: TopicRecord) => LocalizedText;
    questionTopicIdForId: (database: Database, questionId: string) => string | null | undefined;
  };
  studentRisks: {
    topicIdsForClass: (database: Database, classRecord: ClassRecord) => string[];
    classStudentSummary: (
      database: Database,
      classRecord: ClassRecord,
      studentId: string,
      nowMs: number
    ) => TeacherOpsStudentRiskSummary | null | undefined;
    latestStudentActivityAt: (database: Database, studentId: string) => string | null | undefined;
    studentAverageMastery: (database: Database, studentId: string, topicIds: string[]) => number;
    riskTagsForStudent: (
      database: Database,
      studentId: string,
      topicIds: string[],
      nowMs: number
    ) => TeacherStudentRiskTag[];
    studentProfileFor: (database: Database, studentId: string) => TeacherOpsStudentRiskProfile | null | undefined;
  };
  latestStudentActivityAt: (database: Database, studentId: string) => string | null | undefined;
  frequentMistakes: {
    teacherStudentIdsForClass: (database: Database, classId: string) => string[];
    questionForId: (database: Database, questionId: string) => QuestionRecord | null | undefined;
    topicLabelForQuestion: (database: Database, question: QuestionRecord) => LocalizedText;
  };
}) {
  return function buildTeacherOpsAnalyticsData(
    database: Database,
    userId: string,
    selectedClassId?: string | null
  ): TeacherAnalyticsData | null {
    const user = database.users.find((candidate) => candidate.id === userId);
    if (user?.role !== "teacher" && user?.role !== "admin") return null;

    const now = dependencies.now();
    const nowMs = now.getTime();
    const allClassRecords = dependencies.classRecordsForUser(database, user);
    const selectedClassRecords = selectedClassId && selectedClassId !== "all"
      ? allClassRecords.filter((teacherClass) => teacherClass.id === selectedClassId)
      : allClassRecords;
    if (selectedClassId && selectedClassId !== "all" && selectedClassRecords.length === 0) return null;

    const classes = allClassRecords.map((teacherClass) => dependencies.classProjection(database, teacherClass));
    const studentPairs = dependencies.teacherClassStudentPairs(database, selectedClassRecords);
    const studentIds = new Set(studentPairs.map((pair) => pair.studentId));
    const topicMastery = teacherOpsBuildTopicMastery(database, selectedClassRecords, nowMs, dependencies.topicMastery);
    const studentRisks = teacherOpsBuildStudentRisks(
      database,
      studentPairs,
      selectedClassRecords,
      nowMs,
      dependencies.studentRisks
    );
    const summary = teacherOpsBuildAnalyticsSummary(
      database,
      studentIds,
      topicMastery,
      studentRisks,
      nowMs,
      { latestStudentActivityAt: dependencies.latestStudentActivityAt }
    );

    return {
      generatedAt: now.toISOString(),
      selectedClassId: selectedClassId && selectedClassId !== "all" ? selectedClassId : "all",
      classes,
      summary,
      topicMastery,
      studentRisks: studentRisks
        .filter((risk) => risk.riskScore >= 30 || risk.recommendedAction === "challenge-extension")
        .slice(0, 24),
      frequentMistakes: teacherOpsBuildFrequentMistakes(
        database,
        selectedClassRecords,
        studentIds,
        dependencies.frequentMistakes
      ),
      activityTrend7d: teacherOpsBuildActivityTrend(database, studentIds, 7, now),
      activityTrend30d: teacherOpsBuildActivityTrend(database, studentIds, 30, now),
      interventionGroups: teacherOpsBuildInterventionGroups(database, topicMastery, studentRisks)
    };
  };
}

export function createTeacherOpsDashboardDataBuilder<
  CurriculumProfile,
  TopicRecord extends TeacherOpsDashboardTopicRecord,
  ClassRecord extends TeacherOpsDashboardClassRecord,
  UserRecord extends TeacherOpsDashboardUserRecord,
  MessageRecord extends TeacherOpsDashboardMessageRecord,
  Database extends TeacherOpsDashboardDataBuilderDatabase<TopicRecord>
>(dependencies: {
  now: () => Date;
  canUseTeacherArea: (user?: UserRecord | null) => user is UserRecord;
  teacherSessionProjection: (database: Database, user: UserRecord) => StudentSession | null;
  classRecordsForUser: (database: Database, user: UserRecord) => ClassRecord[];
  curriculumProfileForClass: (database: Database, teacherClass: ClassRecord) => CurriculumProfile;
  isCurriculumTopic: (topic: TopicRecord, curriculumProfile: CurriculumProfile) => boolean;
  localizedTopic: (topic: TopicRecord) => LocalizedText;
  teacherMessagesFor: (database: Database, user: UserRecord, classIds: Set<string>) => MessageRecord[];
  isSubmissionComplete: (submission: Database["submissions"][number]) => boolean;
  needsTeacherGrading: (submission: Database["submissions"][number]) => boolean;
  needsCorrectionReview: (submission: Database["submissions"][number]) => boolean;
  rewardSummary: (
    database: Database,
    user: UserRecord,
    nowMs: number
  ) => TeacherDashboardData["rewardSummary"];
}) {
  return function buildTeacherOpsDashboardData(database: Database, userId: string): TeacherDashboardData | null {
    const user = database.users.find((candidate) => candidate.id === userId) as UserRecord | undefined;
    if (!dependencies.canUseTeacherArea(user)) return null;

    const teacher = dependencies.teacherSessionProjection(database, user);
    if (!teacher) return null;

    const now = dependencies.now();
    const nowMs = now.getTime();
    const generatedAt = now.toISOString();
    const classRecords = dependencies.classRecordsForUser(database, user);
    const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
    const appendByKey = <T>(map: Map<string, T[]>, key: string, value: T) => {
      const values = map.get(key);
      if (values) values.push(value);
      else map.set(key, [value]);
    };
    const classEnrollments = database.class_enrollments.filter((enrollment) => classIds.has(enrollment.class_id));
    const studentIdsByClassId = new Map<string, string[]>();
    const primaryClassIdByStudentId = new Map<string, string>();
    classEnrollments.forEach((enrollment) => {
      appendByKey(studentIdsByClassId, enrollment.class_id, enrollment.student_id);
      if (!primaryClassIdByStudentId.has(enrollment.student_id)) {
        primaryClassIdByStudentId.set(enrollment.student_id, enrollment.class_id);
      }
    });
    const enrolledStudentIds = Array.from(new Set(classEnrollments.map((enrollment) => enrollment.student_id)));
    const enrolledStudentIdSet = new Set(enrolledStudentIds);
    const studentProfileById = new Map(database.student_profiles.map((profile) => [profile.user_id, profile]));
    const classNameById = new Map(classRecords.map((teacherClass) => [teacherClass.id, teacherClass.name]));
    const teacherAssignments = database.assignments
      .filter((assignment) => classIds.has(assignment.class_id))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const assignmentIds = new Set(teacherAssignments.map((assignment) => assignment.id));
    const assignmentById = new Map(teacherAssignments.map((assignment) => [assignment.id, assignment]));
    const submissions = database.submissions.filter((submission) => assignmentIds.has(submission.assignment_id));
    const submissionsByAssignmentId = new Map<string, Database["submissions"][number][]>();
    submissions.forEach((submission) => appendByKey(submissionsByAssignmentId, submission.assignment_id, submission));
    const activeMistakesByStudentId = new Map<string, Database["mistakes"][number][]>();
    database.mistakes.forEach((mistake) => {
      if (enrolledStudentIdSet.has(mistake.user_id) && !mistake.mastered && mistake.wrong_attempts >= 3) {
        appendByKey(activeMistakesByStudentId, mistake.user_id, mistake);
      }
    });
    const latestReviewBySubmissionId = new Map<string, Database["assignment_teacher_reviews"][number]>();
    database.assignment_teacher_reviews.forEach((review) => {
      const current = latestReviewBySubmissionId.get(review.submission_id);
      if (!current || review.created_at.localeCompare(current.created_at) > 0) {
        latestReviewBySubmissionId.set(review.submission_id, review);
      }
    });
    const latestActivityMsByStudentId = new Map<string, number>();
    const recordLatestActivity = (studentId: string, value?: string | null) => {
      if (!enrolledStudentIdSet.has(studentId)) return;
      const time = timestampOf(value);
      if (time === null) return;
      const current = latestActivityMsByStudentId.get(studentId);
      if (current === undefined || time > current) latestActivityMsByStudentId.set(studentId, time);
    };
    database.attempts.forEach((attempt) => recordLatestActivity(attempt.user_id, attempt.created_at));
    database.learning_events.forEach((event) => recordLatestActivity(event.user_id, event.created_at));
    database.visualization_sessions.forEach((session) => recordLatestActivity(session.user_id, session.updated_at));
    database.ai_tutor_messages.forEach((message) => recordLatestActivity(message.user_id, message.created_at));
    database.submissions.forEach((submission) => recordLatestActivity(submission.student_id, submission.updated_at));
    const aiTutorMessages7dByStudentId = new Map<string, number>();
    const sevenDaysAgoMs = nowMs - 7 * dayMs;
    database.ai_tutor_messages.forEach((message) => {
      if (!enrolledStudentIdSet.has(message.user_id)) return;
      const createdAt = timestampOf(message.created_at);
      if (createdAt !== null && createdAt >= sevenDaysAgoMs && createdAt <= nowMs) {
        aiTutorMessages7dByStudentId.set(message.user_id, (aiTutorMessages7dByStudentId.get(message.user_id) ?? 0) + 1);
      }
    });
    const lessonProgressByUserTopicId = new Map(
      database.lesson_progress.map((progress) => [userTopicProgressKey(progress.user_id, progress.topic_id), progress])
    );
    const topicsByClassId = new Map<string, TopicRecord[]>();
    const topicIdsByClassId = new Map<string, string[]>();
    const topicsForClassRecord = (teacherClass: ClassRecord) => {
      const cached = topicsByClassId.get(teacherClass.id);
      if (cached) return cached;
      const curriculumProfile = dependencies.curriculumProfileForClass(database, teacherClass);
      const topics = database.topics
        .filter((topic) => dependencies.isCurriculumTopic(topic, curriculumProfile) && topic.grade === teacherClass.grade)
        .sort((a, b) => a.sort_order - b.sort_order);
      topicsByClassId.set(teacherClass.id, topics);
      topicIdsByClassId.set(teacherClass.id, topics.map((topic) => topic.id));
      return topics;
    };
    const topicIdsForClassRecord = (teacherClass: ClassRecord) => {
      topicsForClassRecord(teacherClass);
      return topicIdsByClassId.get(teacherClass.id) ?? [];
    };
    const averageMasteryCache = new Map<string, number>();
    const studentAverageMasteryFromIndex = (studentId: string, topicIds: string[]) => {
      if (!topicIds.length) return 0;
      const cacheKey = `${studentId}\u0000${topicIds.join("\u0000")}`;
      const cached = averageMasteryCache.get(cacheKey);
      if (cached !== undefined) return cached;
      let total = 0;
      topicIds.forEach((topicId) => {
        total += lessonProgressByUserTopicId.get(userTopicProgressKey(studentId, topicId))?.mastery ?? 0;
      });
      const next = Math.round(total / topicIds.length);
      averageMasteryCache.set(cacheKey, next);
      return next;
    };
    const latestStudentActivityAtFromIndex = (studentId: string) => {
      const time = latestActivityMsByStudentId.get(studentId);
      return time === undefined ? null : new Date(time).toISOString();
    };
    const studentNeedsAttention = (studentId: string, topicIds: string[]) => {
      const latestActivity = latestStudentActivityAtFromIndex(studentId);
      const inactive = latestActivity ? nowMs - Date.parse(latestActivity) > 7 * dayMs : true;
      return (
        studentAverageMasteryFromIndex(studentId, topicIds) < 55 ||
        (activeMistakesByStudentId.get(studentId)?.length ?? 0) > 0 ||
        inactive ||
        (aiTutorMessages7dByStudentId.get(studentId) ?? 0) >= 5
      );
    };
    const messages = dependencies.teacherMessagesFor(database, user, classIds);
    const studentNameById = new Map(
      enrolledStudentIds.map((studentId) => [studentId, studentProfileById.get(studentId)?.name ?? "Unknown student"])
    );
    const weeklyAssignments = teacherAssignments.filter((assignment) =>
      isWithinDays(assignment.updated_at, nowMs, 7) ||
      isWithinDays(assignment.created_at, nowMs, 7) ||
      isWithinDays(assignment.due_at, nowMs, 7)
    );
    const weeklyAssignmentIds = new Set((weeklyAssignments.length ? weeklyAssignments : teacherAssignments).map((assignment) => assignment.id));
    const weeklySubmissions = submissions.filter((submission) => weeklyAssignmentIds.has(submission.assignment_id));
    const unrepliedMessages = messages.filter((message) => message.status !== "resolved").length;
    const pendingGrading = submissions.filter(dependencies.needsTeacherGrading).length;
    const pendingCorrectionReview = submissions.filter(dependencies.needsCorrectionReview).length;
    const correctionsRequired = submissions.filter((submission) => submission.status === "correction-required").length;

    const masteryHeatmap: TeacherMasteryHeatmapCell[] = classRecords.flatMap((teacherClass) => {
      const studentIds = studentIdsByClassId.get(teacherClass.id) ?? [];
      if (studentIds.length === 0) return [];

      return topicsForClassRecord(teacherClass)
        .map((topic) => {
          const masteryValues = studentIds.map((studentId) => {
            return lessonProgressByUserTopicId.get(userTopicProgressKey(studentId, topic.id))?.mastery ?? 0;
          });
          const averageMastery = masteryValues.length
            ? Math.round(masteryValues.reduce((sum, mastery) => sum + mastery, 0) / masteryValues.length)
            : 0;
          const weakStudentCount = masteryValues.filter((mastery) => mastery < 60).length;

          return {
            id: `${teacherClass.id}-${topic.id}`,
            classId: teacherClass.id,
            className: teacherClass.name,
            grade: teacherClass.grade,
            topicId: topic.id,
            topicTitle: dependencies.localizedTopic(topic),
            averageMastery,
            studentCount: studentIds.length,
            weakStudentCount,
            href: `/teacher/classes/${encodeURIComponent(teacherClass.id)}?topic=${encodeURIComponent(topic.id)}`
          };
        });
    });

    const classSummaries: TeacherClassDashboardSummary[] = classRecords.map((teacherClass) => {
      const studentIds = studentIdsByClassId.get(teacherClass.id) ?? [];
      const topicIds = topicIdsForClassRecord(teacherClass);
      const classAssignments = teacherAssignments.filter((assignment) => assignment.class_id === teacherClass.id);
      const classAssignmentIds = new Set(classAssignments.map((assignment) => assignment.id));
      const classSubmissions = submissions.filter((submission) => classAssignmentIds.has(submission.assignment_id));
      const masteryValues = studentIds.map((studentId) => studentAverageMasteryFromIndex(studentId, topicIds));
      const averageMastery = masteryValues.length
        ? Math.round(masteryValues.reduce((sum, mastery) => sum + mastery, 0) / masteryValues.length)
        : 0;
      const atRiskStudents = studentIds.filter((studentId) => studentNeedsAttention(studentId, topicIds)).length;

      return {
        classId: teacherClass.id,
        className: teacherClass.name,
        grade: teacherClass.grade,
        studentCount: studentIds.length,
        averageMastery,
        assignmentCompletionRate: percent(classSubmissions.filter(dependencies.isSubmissionComplete).length, classSubmissions.length),
        activeAssignments: classAssignments.filter((assignment) => assignment.status === "active").length,
        atRiskStudents,
        href: `/teacher/classes/${encodeURIComponent(teacherClass.id)}`
      };
    });

    const atRiskStudentIds = new Set<string>();
    classRecords.forEach((teacherClass) => {
      const topicIds = topicIdsForClassRecord(teacherClass);
      (studentIdsByClassId.get(teacherClass.id) ?? []).forEach((studentId) => {
        if (studentNeedsAttention(studentId, topicIds)) {
          atRiskStudentIds.add(studentId);
        }
      });
    });

    const actionQueue: TeacherActionQueueItem[] = [];

    teacherAssignments.forEach((assignment) => {
      const dueAtMs = timestampOf(assignment.due_at);
      if (dueAtMs === null || dueAtMs >= nowMs) return;

      const assignmentSubmissions = submissionsByAssignmentId.get(assignment.id) ?? [];
      const incompleteCount = assignmentSubmissions.filter((submission) => !dependencies.isSubmissionComplete(submission)).length;
      if (incompleteCount === 0) return;

      actionQueue.push({
        id: `overdue-${assignment.id}`,
        type: "overdue-assignment",
        priority: "high",
        title: {
          en: `${assignment.title_en} is overdue`,
          zh: `${assignment.title_zh} 已逾期`
        },
        description: {
          en: `${incompleteCount} submission${incompleteCount === 1 ? "" : "s"} still need follow-up.`,
          zh: `仍有 ${incompleteCount} 份提交需要跟進。`
        },
        href: `/teacher/assignments/${encodeURIComponent(assignment.id)}`,
        className: classNameById.get(assignment.class_id),
        dueAt: assignment.due_at,
        createdAt: assignment.due_at ?? assignment.updated_at
      });
    });

    submissions.filter(dependencies.needsTeacherGrading).forEach((submission) => {
      const assignment = assignmentById.get(submission.assignment_id);
      if (!assignment) return;
      const studentName = studentNameById.get(submission.student_id) ?? "Unknown student";

      actionQueue.push({
        id: `grading-${submission.id}`,
        type: "pending-grading",
        priority: "high",
        title: {
          en: `Grade ${studentName}'s submission`,
          zh: `批改 ${studentName} 的提交`
        },
        description: {
          en: assignment.title_en,
          zh: assignment.title_zh
        },
        href: `/teacher/assignments/${encodeURIComponent(assignment.id)}/submissions/${encodeURIComponent(submission.id)}`,
        className: classNameById.get(assignment.class_id),
        studentName,
        createdAt: submission.submitted_at ?? submission.updated_at
      });
    });

    submissions.filter(dependencies.needsCorrectionReview).forEach((submission) => {
      const assignment = assignmentById.get(submission.assignment_id);
      if (!assignment) return;
      const studentName = studentNameById.get(submission.student_id) ?? "Unknown student";

      actionQueue.push({
        id: `correction-review-${submission.id}`,
        type: "pending-correction-review",
        priority: "high",
        title: {
          en: `Review ${studentName}'s correction`,
          zh: `覆核 ${studentName} 的訂正`
        },
        description: {
          en: assignment.title_en,
          zh: assignment.title_zh
        },
        href: `/teacher/assignments/${encodeURIComponent(assignment.id)}/submissions/${encodeURIComponent(submission.id)}`,
        className: classNameById.get(assignment.class_id),
        studentName,
        createdAt: submission.submitted_at ?? submission.updated_at
      });
    });

    submissions.filter((submission) => submission.status === "correction-required").forEach((submission) => {
      const latestReview = latestReviewBySubmissionId.get(submission.id) ?? null;
      const dueAtMs = timestampOf(latestReview?.correction_due_at);
      if (dueAtMs === null || dueAtMs >= nowMs) return;
      const assignment = assignmentById.get(submission.assignment_id);
      if (!assignment) return;
      const studentName = studentNameById.get(submission.student_id) ?? "Unknown student";

      actionQueue.push({
        id: `overdue-correction-${submission.id}`,
        type: "overdue-correction",
        priority: "medium",
        title: {
          en: `${studentName}'s correction is overdue`,
          zh: `${studentName} 的訂正已逾期`
        },
        description: {
          en: assignment.title_en,
          zh: assignment.title_zh
        },
        href: `/teacher/assignments/${encodeURIComponent(assignment.id)}/submissions/${encodeURIComponent(submission.id)}`,
        className: classNameById.get(assignment.class_id),
        studentName,
        dueAt: latestReview?.correction_due_at,
        createdAt: latestReview?.correction_due_at ?? submission.updated_at
      });
    });

    messages
      .filter((message) => message.status !== "resolved")
      .forEach((message) => {
        const studentName = studentNameById.get(message.student_id) ?? studentProfileById.get(message.student_id)?.name ?? "Unknown student";
        actionQueue.push({
          id: `message-${message.id}`,
          type: "unreplied-message",
          priority: message.priority === "urgent" ? "high" : "medium",
          title: {
            en: `Reply to ${studentName}`,
            zh: `回覆 ${studentName}`
          },
          description: {
            en: message.subject_en,
            zh: message.subject_zh
          },
          href: `/teacher/communications/inbox?thread=${encodeURIComponent(message.id)}`,
          className: message.class_id ? classNameById.get(message.class_id) : undefined,
          studentName,
          createdAt: message.last_message_at
        });
      });

    enrolledStudentIds.forEach((studentId) => {
      const studentName = studentNameById.get(studentId) ?? "Unknown student";
      const classId = primaryClassIdByStudentId.get(studentId);
      const activeMistakes = [...(activeMistakesByStudentId.get(studentId) ?? [])]
        .sort((a, b) => b.wrong_attempts - a.wrong_attempts || b.last_attempt_at.localeCompare(a.last_attempt_at));
      const latestActivity = latestStudentActivityAtFromIndex(studentId);
      const aiTutorCount = aiTutorMessages7dByStudentId.get(studentId) ?? 0;

      if (activeMistakes[0]) {
        actionQueue.push({
          id: `mistakes-${studentId}`,
          type: "consecutive-mistakes",
          priority: "high",
          title: {
            en: `${studentName} has repeated mistakes`,
            zh: `${studentName} 有連續錯題`
          },
          description: {
            en: `${activeMistakes[0].wrong_attempts} wrong attempts on one active mistake-book item.`,
            zh: `同一錯題已有 ${activeMistakes[0].wrong_attempts} 次錯誤嘗試。`
          },
          href: classId
            ? `/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}?focus=mistakes`
            : `/teacher/students/${encodeURIComponent(studentId)}?focus=mistakes`,
          className: classId ? classNameById.get(classId) : undefined,
          studentName,
          createdAt: activeMistakes[0].last_attempt_at
        });
      }

      if (!latestActivity || nowMs - Date.parse(latestActivity) > 7 * dayMs) {
        actionQueue.push({
          id: `inactive-${studentId}`,
          type: "inactive-student",
          priority: "medium",
          title: {
            en: `${studentName} has low recent activity`,
            zh: `${studentName} 最近活躍度偏低`
          },
          description: {
            en: latestActivity ? "No saved learning activity in the last 7 days." : "No saved learning activity yet.",
            zh: latestActivity ? "過去 7 天沒有已儲存學習活動。" : "尚未有已儲存學習活動。"
          },
          href: classId
            ? `/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}?focus=activity`
            : `/teacher/students/${encodeURIComponent(studentId)}?focus=activity`,
          className: classId ? classNameById.get(classId) : undefined,
          studentName,
          createdAt: latestActivity ?? generatedAt
        });
      }

      if (aiTutorCount >= 5) {
        actionQueue.push({
          id: `ai-tutor-${studentId}`,
          type: "high-ai-tutor",
          priority: "medium",
          title: {
            en: `${studentName} is using AI Tutor heavily`,
            zh: `${studentName} 頻繁使用 AI Tutor`
          },
          description: {
            en: `${aiTutorCount} tutor messages in the last 7 days.`,
            zh: `過去 7 天有 ${aiTutorCount} 則 AI Tutor 訊息。`
          },
          href: classId
            ? `/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}?focus=ai-tutor`
            : `/teacher/students/${encodeURIComponent(studentId)}?focus=ai-tutor`,
          className: classId ? classNameById.get(classId) : undefined,
          studentName,
          createdAt: generatedAt
        });
      }
    });

    actionQueue.sort((a, b) => {
      const priorityDelta = actionPriorityRank(a.priority) - actionPriorityRank(b.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return b.createdAt.localeCompare(a.createdAt);
    });

    return {
      generatedAt,
      teacher,
      kpis: {
        pendingGrading,
        pendingCorrectionReview,
        correctionsRequired,
        unrepliedMessages,
        weeklyAssignmentCompletionRate: percent(weeklySubmissions.filter(dependencies.isSubmissionComplete).length, weeklySubmissions.length),
        atRiskStudents: atRiskStudentIds.size
      },
      rewardSummary: dependencies.rewardSummary(database, user, nowMs),
      classSummaries,
      masteryHeatmap,
      actionQueue: actionQueue.slice(0, 12)
    };
  };
}

export function teacherOpsBuildFrequentMistakes<
  Database extends { mistakes: TeacherOpsFrequentMistakeRecord[] },
  ClassRecord extends TeacherOpsFrequentMistakeClassRecord,
  QuestionRecord extends TeacherOpsFrequentMistakeQuestionRecord
>(
  database: Database,
  classRecords: ClassRecord[],
  studentIds: Set<string>,
  dependencies: {
    teacherStudentIdsForClass: (database: Database, classId: string) => string[];
    questionForId: (database: Database, questionId: string) => QuestionRecord | null | undefined;
    topicLabelForQuestion: (database: Database, question: QuestionRecord) => LocalizedText;
  }
): TeacherAnalyticsFrequentMistake[] {
  const classByStudentId = new Map<string, ClassRecord>();
  classRecords.forEach((teacherClass) => {
    dependencies
      .teacherStudentIdsForClass(database, teacherClass.id)
      .forEach((studentId) => classByStudentId.set(studentId, teacherClass));
  });
  const mistakeMap = new Map<string, {
    question: QuestionRecord;
    classRecord: ClassRecord;
    wrongAttempts: number;
    studentIds: Set<string>;
    lastAttemptAt: string;
  }>();

  database.mistakes
    .filter((mistake) => studentIds.has(mistake.user_id))
    .forEach((mistake) => {
      const question = dependencies.questionForId(database, mistake.question_id);
      const classRecord = classByStudentId.get(mistake.user_id);
      if (!question || !classRecord) return;
      const key = `${classRecord.id}-${question.id}`;
      const current = mistakeMap.get(key) ?? {
        question,
        classRecord,
        wrongAttempts: 0,
        studentIds: new Set<string>(),
        lastAttemptAt: mistake.last_attempt_at
      };
      current.wrongAttempts += mistake.wrong_attempts;
      current.studentIds.add(mistake.user_id);
      current.lastAttemptAt = current.lastAttemptAt.localeCompare(mistake.last_attempt_at) > 0
        ? current.lastAttemptAt
        : mistake.last_attempt_at;
      mistakeMap.set(key, current);
    });

  return Array.from(mistakeMap.entries())
    .map(([id, item]) => ({
      id,
      questionId: item.question.id,
      classId: item.classRecord.id,
      className: item.classRecord.name,
      topicId: item.question.topic_id,
      topicTitle: dependencies.topicLabelForQuestion(database, item.question),
      prompt: { en: item.question.prompt_en, zh: item.question.prompt_zh },
      wrongAttempts: item.wrongAttempts,
      studentCount: item.studentIds.size,
      lastAttemptAt: item.lastAttemptAt
    }))
    .sort((a, b) => b.wrongAttempts - a.wrongAttempts || b.lastAttemptAt.localeCompare(a.lastAttemptAt))
    .slice(0, 8);
}

export function teacherOpsBuildActivityTrend(
  database: TeacherOpsActivityTrendDatabase,
  studentIds: Set<string>,
  windowDays: number,
  now = new Date()
): TeacherAnalyticsData["activityTrend7d"] {
  const buckets = Array.from({ length: windowDays }, (_, index) => {
    const date = startOfUtcDay(now);
    date.setUTCDate(date.getUTCDate() - (windowDays - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      activeStudentIds: new Set<string>(),
      answers: 0,
      correctAnswers: 0,
      hintRequests: 0,
      aiTutorMessages: 0,
      answerDurations: [] as number[]
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.date, bucket]));
  const earliest = Date.parse(`${buckets[0]?.date ?? now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const nowMs = now.getTime();

  database.attempts.forEach((attempt) => {
    const attemptMs = timestampOf(attempt.created_at);
    if (!studentIds.has(attempt.user_id) || attemptMs === null || attemptMs < earliest || attemptMs > nowMs) return;
    const bucket = bucketMap.get(dayKey(attempt.created_at));
    if (!bucket) return;
    bucket.activeStudentIds.add(attempt.user_id);
    bucket.answers += 1;
    if (attempt.is_correct) bucket.correctAnswers += 1;
    if (typeof attempt.duration_seconds === "number") bucket.answerDurations.push(attempt.duration_seconds);
  });

  database.learning_events.forEach((event) => {
    const eventMs = timestampOf(event.created_at);
    if (!studentIds.has(event.user_id) || eventMs === null || eventMs < earliest || eventMs > nowMs) return;
    const bucket = bucketMap.get(dayKey(event.created_at));
    if (!bucket) return;
    bucket.activeStudentIds.add(event.user_id);
    if (event.type === "hint-request") bucket.hintRequests += 1;
    if ((event.type === "answer-correct" || event.type === "answer-wrong") && bucket.answers === 0) {
      bucket.answers += 1;
      if (event.type === "answer-correct") bucket.correctAnswers += 1;
      if (typeof event.duration_seconds === "number") bucket.answerDurations.push(event.duration_seconds);
    }
  });

  database.ai_tutor_messages.forEach((message) => {
    const messageMs = timestampOf(message.created_at);
    if (!studentIds.has(message.user_id) || messageMs === null || messageMs < earliest || messageMs > nowMs) return;
    const bucket = bucketMap.get(dayKey(message.created_at));
    if (!bucket) return;
    bucket.activeStudentIds.add(message.user_id);
    bucket.aiTutorMessages += 1;
  });

  database.submissions.forEach((submission) => {
    const updatedMs = timestampOf(submission.updated_at);
    if (!studentIds.has(submission.student_id) || updatedMs === null || updatedMs < earliest || updatedMs > nowMs) return;
    bucketMap.get(dayKey(submission.updated_at))?.activeStudentIds.add(submission.student_id);
  });

  return buckets.map((bucket) => ({
    date: bucket.date,
    activeStudents: bucket.activeStudentIds.size,
    answers: bucket.answers,
    accuracy: bucket.answers ? Math.round((bucket.correctAnswers / bucket.answers) * 100) : null,
    hintRequests: bucket.hintRequests,
    aiTutorMessages: bucket.aiTutorMessages,
    averageAnswerSeconds: average(bucket.answerDurations)
  }));
}

export function teacherOpsInterventionRecommendation(action: TeacherInterventionAction): LocalizedText {
  const labels: Record<TeacherInterventionAction, LocalizedText> = {
    "rebuild-foundation": { en: "Rebuild foundations before moving on.", zh: "先補基礎，再進入新內容。" },
    "redo-mistakes": { en: "Assign mistake review and a short retry set.", zh: "安排錯題重做和短練習。" },
    "challenge-extension": { en: "Offer extension questions to keep momentum.", zh: "可安排進階題保持挑戰。" },
    "teacher-message": { en: "Send a private follow-up message.", zh: "建議教師私信跟進。" }
  };
  return labels[action];
}

export function teacherOpsRecommendedActionForStudent({
  averageMastery,
  activeMistakes,
  inactive,
  aiTutorMessages7d
}: {
  averageMastery: number;
  activeMistakes: number;
  inactive: boolean;
  aiTutorMessages7d: number;
}): TeacherInterventionAction {
  if (averageMastery >= 82 && activeMistakes === 0 && !inactive) return "challenge-extension";
  if (averageMastery < 55) return "rebuild-foundation";
  if (activeMistakes > 0) return "redo-mistakes";
  if (inactive || aiTutorMessages7d >= 5) return "teacher-message";
  return "redo-mistakes";
}

export function teacherOpsBuildInterventionGroups(
  _database: unknown,
  topicCells: TeacherAnalyticsTopicCell[],
  studentRisks: TeacherAnalyticsStudentRisk[]
): TeacherAnalyticsInterventionGroup[] {
  const groups: TeacherAnalyticsInterventionGroup[] = [];
  const risksByClassId = new Map<string, TeacherAnalyticsStudentRisk[]>();
  studentRisks.forEach((risk) => {
    risksByClassId.set(risk.classId, [...(risksByClassId.get(risk.classId) ?? []), risk]);
  });

  risksByClassId.forEach((risks, classId) => {
    const className = risks[0]?.className ?? "";
    const weakestTopic = topicCells
      .filter((cell) => cell.classId === classId)
      .sort((a, b) => a.averageMastery - b.averageMastery)[0];
    const foundationStudents = risks.filter((risk) => risk.recommendedAction === "rebuild-foundation").slice(0, 8);
    const mistakeStudents = risks.filter((risk) => risk.recommendedAction === "redo-mistakes").slice(0, 8);
    const messageStudents = risks.filter((risk) => risk.recommendedAction === "teacher-message").slice(0, 8);

    if (foundationStudents.length && weakestTopic) {
      groups.push({
        id: `${classId}-foundation-${weakestTopic.topicId}`,
        classId,
        className,
        topicId: weakestTopic.topicId,
        title: { en: "Foundation repair group", zh: "基礎補底小組" },
        description: {
          en: `${foundationStudents.length} students need a guided rebuild on ${weakestTopic.topicTitle.en}.`,
          zh: `${foundationStudents.length} 位學生需要重建「${weakestTopic.topicTitle.zh}」基礎。`
        },
        action: "rebuild-foundation",
        studentIds: foundationStudents.map((risk) => risk.studentId),
        studentNames: foundationStudents.map((risk) => risk.studentName),
        assignmentTitle: { en: `${weakestTopic.topicTitle.en} foundation follow-up`, zh: `${weakestTopic.topicTitle.zh} 基礎跟進` },
        assignmentDescription: {
          en: "Short foundation repair set generated from class analytics.",
          zh: "按班級分析建立的短補底練習。"
        },
        targetId: weakestTopic.topicId
      });
    }

    if (mistakeStudents.length && weakestTopic) {
      groups.push({
        id: `${classId}-mistakes-${weakestTopic.topicId}`,
        classId,
        className,
        topicId: weakestTopic.topicId,
        title: { en: "Mistake retry group", zh: "錯題重做小組" },
        description: {
          en: `${mistakeStudents.length} students have repeated wrong attempts or active mistake-book items.`,
          zh: `${mistakeStudents.length} 位學生有重複錯誤或未掌握錯題。`
        },
        action: "redo-mistakes",
        studentIds: mistakeStudents.map((risk) => risk.studentId),
        studentNames: mistakeStudents.map((risk) => risk.studentName),
        assignmentTitle: { en: "Mistake retry follow-up", zh: "錯題重做跟進" },
        assignmentDescription: {
          en: "Review active mistake-book items, then complete a targeted retry.",
          zh: "先重溫錯題簿，再完成針對性重做。"
        },
        targetId: weakestTopic.topicId
      });
    }

    if (messageStudents.length) {
      groups.push({
        id: `${classId}-message-follow-up`,
        classId,
        className,
        title: { en: "Private check-in group", zh: "私信跟進小組" },
        description: {
          en: `${messageStudents.length} students show inactivity or unusually high help-seeking.`,
          zh: `${messageStudents.length} 位學生出現低活躍或求助偏高。`
        },
        action: "teacher-message",
        studentIds: messageStudents.map((risk) => risk.studentId),
        studentNames: messageStudents.map((risk) => risk.studentName),
        assignmentTitle: { en: "Teacher check-in follow-up", zh: "教師私信跟進" },
        assignmentDescription: {
          en: "A light reflection task for students needing teacher contact.",
          zh: "給需要教師聯絡學生的輕量反思任務。"
        }
      });
    }

    const challengeStudents = risks
      .filter((risk) => risk.recommendedAction === "challenge-extension")
      .slice(0, 8);
    const challengeTopic = topicCells
      .filter((cell) => cell.classId === classId)
      .sort((a, b) => b.averageMastery - a.averageMastery)[0];
    if (challengeStudents.length && challengeTopic) {
      groups.push({
        id: `${classId}-challenge-${challengeTopic.topicId}`,
        classId,
        className,
        topicId: challengeTopic.topicId,
        title: { en: "Extension challenge group", zh: "進階挑戰小組" },
        description: {
          en: `${challengeStudents.length} students are ready for harder questions on ${challengeTopic.topicTitle.en}.`,
          zh: `${challengeStudents.length} 位學生可挑戰「${challengeTopic.topicTitle.zh}」進階題。`
        },
        action: "challenge-extension",
        studentIds: challengeStudents.map((risk) => risk.studentId),
        studentNames: challengeStudents.map((risk) => risk.studentName),
        assignmentTitle: { en: `${challengeTopic.topicTitle.en} extension challenge`, zh: `${challengeTopic.topicTitle.zh} 進階挑戰` },
        assignmentDescription: {
          en: "Challenge set for students showing strong mastery.",
          zh: "為掌握度較高學生安排的進階挑戰。"
        },
        targetId: challengeTopic.topicId
      });
    }
  });

  return groups.slice(0, 8);
}

function teacherClassRecordsFor<ClassRecord extends TeacherOpsOperationsClassRecord>(
  database: {
    school_memberships?: TeacherOpsOperationsSchoolMembershipRecord[];
    teacher_classes: ClassRecord[];
  },
  user: TeacherOpsOperationsUserRecord
) {
  const membershipClassIds = new Set(
    (database.school_memberships ?? [])
      .filter((membership) => (
        membership.user_id === user.id &&
        membership.class_id &&
        (membership.role === "teacher" || membership.role === "admin")
      ))
      .map((membership) => membership.class_id as string)
  );

  return database.teacher_classes
    .filter((teacherClass) => user.role === "admin" || teacherClass.teacher_id === user.id || membershipClassIds.has(teacherClass.id))
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));
}

export function teacherOperationClassRecordsFor<ClassRecord extends TeacherOpsOperationsClassRecord>(
  database: {
    school_memberships?: TeacherOpsOperationsSchoolMembershipRecord[];
    teacher_class_collaborators: TeacherOpsOperationsClassCollaboratorRecord[];
    teacher_classes: ClassRecord[];
  },
  user: TeacherOpsOperationsUserRecord
) {
  const records = new Map(teacherClassRecordsFor(database, user).map((teacherClass) => [teacherClass.id, teacherClass]));
  database.teacher_class_collaborators
    .filter((collaborator) => collaborator.teacher_id === user.id && collaborator.status === "active")
    .forEach((collaborator) => {
      const teacherClass = database.teacher_classes.find((candidate) => candidate.id === collaborator.class_id);
      if (teacherClass) records.set(teacherClass.id, teacherClass);
    });

  return Array.from(records.values()).sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));
}

export function teacherCanReadOperationsClass<ClassRecord extends TeacherOpsOperationsClassRecord>(
  database: {
    school_memberships?: TeacherOpsOperationsSchoolMembershipRecord[];
    teacher_class_collaborators: TeacherOpsOperationsClassCollaboratorRecord[];
    teacher_classes: ClassRecord[];
  },
  user: TeacherOpsOperationsUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (teacherClassRecordsFor(database, user).some((candidate) => candidate.id === classId)) return teacherClass;
  const collaborator = database.teacher_class_collaborators.find(
    (candidate) => candidate.class_id === classId && candidate.teacher_id === user.id && candidate.status === "active"
  );
  return collaborator ? teacherClass : null;
}

export function teacherCanMutateOperationsClass<ClassRecord extends TeacherOpsOperationsClassRecord>(
  database: {
    school_memberships?: TeacherOpsOperationsSchoolMembershipRecord[];
    teacher_class_collaborators: TeacherOpsOperationsClassCollaboratorRecord[];
    teacher_classes: ClassRecord[];
  },
  user: TeacherOpsOperationsUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (teacherClassRecordsFor(database, user).some((candidate) => candidate.id === classId)) return teacherClass;
  const collaborator = database.teacher_class_collaborators.find(
    (candidate) =>
      candidate.class_id === classId &&
      candidate.teacher_id === user.id &&
      candidate.status === "active" &&
      candidate.role === "co-teacher"
  );
  return collaborator ? teacherClass : null;
}

export function teacherCanManageOperationsClass<ClassRecord extends TeacherOpsOperationsClassRecord>(
  database: {
    school_memberships?: TeacherOpsOperationsSchoolMembershipRecord[];
    teacher_classes: ClassRecord[];
  },
  user: TeacherOpsOperationsUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (user.role === "admin" || teacherClass.teacher_id === user.id) return teacherClass;
  const hasAdminMembership = (database.school_memberships ?? []).some(
    (membership) => membership.user_id === user.id && membership.class_id === classId && membership.role === "admin"
  );
  return hasAdminMembership ? teacherClass : null;
}

export function createTeacherOpsOperationsPersistenceStore({
  analyticsDataFromPostgresProjection,
  buildAnalyticsData,
  buildDashboardData,
  classProjection,
  collaboratorsForClass,
  dashboardDataFromPostgresProjection,
  getNotificationSummary,
  isStorageFreeExampleTeacher,
  missingWorkForClasses,
  noticeProjection,
  now,
  prepTeamProjection,
  readDatabase,
  reminderPolicy,
  reminderRunProjection,
  rosterProfilesForClass,
  storageFreeExampleDatabase,
  teacherSessionProjection,
  termArchiveProjection
}: TeacherOpsOperationsPersistenceStoreDependencies) {
  async function getTeacherDashboardData(userId: string): Promise<TeacherDashboardData | null> {
    // Live data must win so classes and activity the example teacher creates show
    // up on the dashboard; the storage-free demo payload is only a fallback for
    // accounts whose rows are genuinely absent from storage.
    const storageFreeDashboardFallback = () => {
      if (!isStorageFreeExampleTeacher(userId)) return null;
      const storageFreeDatabase = storageFreeExampleDatabase(userId);
      return storageFreeDatabase ? buildDashboardData(storageFreeDatabase, userId) : null;
    };

    const projected = await dashboardDataFromPostgresProjection(userId);
    if (projected !== undefined) {
      return projected ?? storageFreeDashboardFallback();
    }

    return buildDashboardData(await readDatabase(), userId) ?? storageFreeDashboardFallback();
  }

  async function getTeacherAnalyticsData(
    userId: string,
    selectedClassId?: string | null
  ): Promise<TeacherAnalyticsData | null> {
    const projected = await analyticsDataFromPostgresProjection(userId, selectedClassId);
    if (projected !== undefined) {
      return projected ?? null;
    }

    return buildAnalyticsData(await readDatabase(), userId, selectedClassId);
  }

  async function getTeacherOperationsData(
    userId: string,
    selectedClassId?: string | null
  ): Promise<TeacherOperationsData | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!canUseTeacherArea(user)) return null;
    const teacher = teacherSessionProjection(database, user);
    if (!teacher) return null;

    const classRecords = teacherOperationClassRecordsFor(database, user);
    const selectedClass =
      (selectedClassId ? classRecords.find((teacherClass) => teacherClass.id === selectedClassId) : null) ??
      classRecords[0] ??
      null;
    const selectedClassRecords = selectedClass ? [selectedClass] : [];
    const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
    const notices = database.teacher_notices
      .filter((notice) => classIds.has(notice.class_id))
      .filter((notice) => !selectedClass || notice.class_id === selectedClass.id)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((notice) => noticeProjection(database, notice));
    const missingWork = missingWorkForClasses(database, selectedClassRecords);
    const roster = selectedClass ? rosterProfilesForClass(database, selectedClass.id) : [];
    const collaborators = selectedClass ? collaboratorsForClass(database, selectedClass) : [];
    const prepTeams = database.prep_teams
      .filter((team) => team.teacher_ids.includes(user.id) || user.role === "admin")
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((team) => prepTeamProjection(database, team));
    const termArchives = selectedClass
      ? database.term_archives
          .filter((archive) => archive.class_id === selectedClass.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(termArchiveProjection)
      : [];
    const pendingAcknowledgements = notices.reduce((sum, notice) => sum + notice.acknowledgement.pending, 0);

    return {
      generatedAt: now().toISOString(),
      teacher,
      classes: classRecords.map((teacherClass) => classProjection(database, teacherClass)),
      selectedClassId: selectedClass?.id ?? null,
      wecom: getNotificationSummary(selectedClass?.id),
      notices,
      reminderPolicy,
      reminderRuns: database.teacher_reminder_runs
        .filter((run) => classIds.has(run.class_id))
        .filter((run) => !selectedClass || run.class_id === selectedClass.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 50)
        .map((run) => reminderRunProjection(database, run)),
      missingWork,
      roster,
      collaborators,
      prepTeams,
      termArchives,
      totals: {
        notices: notices.length,
        pendingAcknowledgements,
        missingWork: missingWork.length,
        collaborators: collaborators.filter((collaborator) => collaborator.status === "active").length,
        archives: termArchives.length
      }
    };
  }

  return {
    getTeacherAnalyticsData,
    getTeacherDashboardData,
    getTeacherOperationsData
  };
}
