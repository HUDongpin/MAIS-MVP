import { randomUUID } from "crypto";
import {
  contentMatchesCurriculumProfile,
  curriculumTrackForProfile,
  defaultCurriculumProfile,
  normalizeStoredCurriculumProfile
} from "@/lib/curriculumProfile";
import { textForLanguage } from "@/lib/i18n";
import type {
  CurriculumProfile,
  CurriculumRegion,
  GradeId,
  LocalizedText,
  TeacherClass,
  TeacherReport,
  TeacherReportLanguage,
  TeacherReportPreview,
  TeacherReportsData,
  TeacherReportTarget,
  TeacherReportType,
  TextbookPublisher,
  CurriculumTrack
} from "@/types";

type TeacherOpsUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsReportUserRecord = {
  id: string;
  role: TeacherOpsUserRole;
  username?: string;
};

type TeacherOpsReportClassRecord = {
  id: string;
  teacher_id?: string;
  name: string;
  grade?: GradeId;
  school_id?: string;
  class_code?: string;
  academic_year?: string;
  description_en?: string;
  description_zh?: string;
  invite_code?: string;
  created_at?: string;
  updated_at?: string;
};

type TeacherOpsReportStudentProfileRecord = {
  user_id: string;
  name: string;
  grade?: GradeId;
  curriculum_track?: CurriculumTrack | null;
  curriculum_region?: CurriculumRegion | null;
  textbook_publisher?: TextbookPublisher | null;
};

type TeacherOpsReportSchoolMembershipRecord = {
  user_id: string;
  role: TeacherOpsUserRole;
  class_id?: string;
};

type TeacherOpsReportRecord = {
  id: string;
  type: TeacherReportType;
  title_en: string;
  title_zh: string;
  class_id?: string;
  student_id?: string;
  generated_by: string;
  generated_at: string;
  summary_en: string;
  summary_zh: string;
  preview_json?: string;
};

type TeacherOpsSeedTeacherReportRecordsOptions = {
  demoTeacherId: string;
  demoUserId: string;
  shouldSeedDemoUser: () => boolean;
};

export function teacherOpsSeedTeacherReportRecords(
  now: string,
  options: TeacherOpsSeedTeacherReportRecordsOptions
): TeacherOpsReportRecord[] {
  const reports: TeacherOpsReportRecord[] = [
    {
      id: "report-s3a-weekly-snapshot",
      type: "class",
      title_en: "S3A weekly learning snapshot",
      title_zh: "中三A每週學習概覽",
      class_id: "class-s3a-2026",
      generated_by: options.demoTeacherId,
      generated_at: now,
      summary_en: "Foundation report seed for future class analytics and parent communication.",
      summary_zh: "教師報告基礎資料，供日後班級分析及家長溝通使用。"
    }
  ];

  if (options.shouldSeedDemoUser()) {
    const preview: TeacherReportPreview = {
      id: "preview-parent-student-peter",
      type: "parent-summary",
      language: "zh",
      title: "家長溝通摘要",
      subtitle: "HK Student Peter · S3A Mathematics",
      generatedAt: now,
      subjectName: "HK Student Peter",
      className: "S3A Mathematics",
      metrics: {
        learningMinutes: 95,
        masteryChange: 8,
        averageMastery: 68,
        accuracy: 74,
        completionRate: 80
      },
      strengths: ["二次函數圖像判讀有穩定進步", "能持續完成課後練習"],
      weaknesses: ["展開與因式分解轉換仍需練習", "答題步驟需要更清楚"],
      mistakeTypes: ["代數運算：3 次錯誤"],
      suggestedPractice: ["每週兩次重做錯題簿", "完成二次函數基礎題組"],
      teacherRemarks: "建議家長每週查看錯題簿，鼓勵 Peter 說出每題的第一步。"
    };

    reports.push({
      id: "report-parent-summary-peter",
      type: "parent-summary",
      title_en: "Parent communication summary",
      title_zh: "家長溝通摘要",
      class_id: "class-s3a-2026",
      student_id: options.demoUserId,
      generated_by: options.demoTeacherId,
      generated_at: now,
      summary_en: "HK Student Peter is building steadier quadratic function habits. Home support should focus on short mistake-review routines.",
      summary_zh: "HK Student Peter 的二次函數學習習慣更穩定，家庭支援可集中在短時間錯題重溫。",
      preview_json: JSON.stringify(preview)
    });
  }

  return reports;
}

export type TeacherOpsReportCollectionRecords = {
  teacher_reports?: TeacherOpsReportRecord[];
};

export type TeacherOpsReportCollectionNormalizationOptions = TeacherOpsSeedTeacherReportRecordsOptions;

function mergeTeacherOpsReportSeedRecordsPreservingExisting<T>(
  existingRecords: T[] | undefined,
  seedRecords: T[],
  keyFor: (record: T) => string
) {
  const existingByKey = new Map((existingRecords ?? []).map((record) => [keyFor(record), record]));
  const seedKeys = new Set(seedRecords.map(keyFor));
  const seedOrExistingRecords = seedRecords.map((record) => existingByKey.get(keyFor(record)) ?? record);
  const extraRecords = (existingRecords ?? []).filter((record) => !seedKeys.has(keyFor(record)));
  return [...seedOrExistingRecords, ...extraRecords];
}

export function normalizeTeacherOpsReportCollections(
  collections: TeacherOpsReportCollectionRecords,
  now: string,
  options: TeacherOpsReportCollectionNormalizationOptions
): {
  teacher_reports: TeacherOpsReportRecord[];
} {
  return {
    teacher_reports: mergeTeacherOpsReportSeedRecordsPreservingExisting(
      collections.teacher_reports,
      teacherOpsSeedTeacherReportRecords(now, options),
      (report) => report.id
    )
  };
}

type TeacherOpsReportAssignmentRecord = {
  id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  updated_at?: string;
};

type TeacherOpsReportSubmissionRecord = {
  id?: string;
  assignment_id: string;
  student_id: string;
  status: string;
};

type TeacherOpsReportAssessmentRecord = {
  id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  updated_at?: string;
};

type TeacherOpsReportAssessmentSubmissionRecord = {
  id?: string;
  assessment_id: string;
  student_id: string;
  status: string;
};

type TeacherOpsReportClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type TeacherOpsReportTopicRecord = {
  id: string;
  grade: GradeId;
  title_en: string;
  title_zh: string;
  title_zh_hans?: string;
  sort_order?: number;
  curriculum_track?: CurriculumTrack | null;
  curriculum_region?: CurriculumRegion | null;
  textbook_publisher?: TextbookPublisher | null;
};

type TeacherOpsReportLessonProgressRecord = {
  user_id: string;
  topic_id: string;
  mastery: number;
};

type TeacherOpsReportAttemptRecord = {
  id?: string;
  user_id: string;
  question_id: string;
  is_correct: boolean;
  duration_seconds?: number | null;
  created_at: string;
};

type TeacherOpsReportLearningEventRecord = {
  id?: string;
  user_id: string;
  type?: string;
  topic_id?: string;
  duration_seconds?: number | null;
  created_at: string;
};

type TeacherOpsReportQuestionRecord = {
  id: string;
  topic_id: string;
  topic_title_en?: string;
  topic_title_zh?: string;
};

type TeacherOpsReportMistakeRecord = {
  user_id: string;
  question_id: string;
  wrong_attempts: number;
};

type TeacherOpsReportAiTutorMessageRecord = {
  user_id: string;
  created_at: string;
};

export type TeacherOpsReportPersistenceDatabase = {
  ai_tutor_messages?: TeacherOpsReportAiTutorMessageRecord[];
  assessment_submissions?: TeacherOpsReportAssessmentSubmissionRecord[];
  assessments?: TeacherOpsReportAssessmentRecord[];
  assignments?: TeacherOpsReportAssignmentRecord[];
  attempts?: TeacherOpsReportAttemptRecord[];
  class_enrollments?: TeacherOpsReportClassEnrollmentRecord[];
  learning_events?: TeacherOpsReportLearningEventRecord[];
  lesson_progress?: TeacherOpsReportLessonProgressRecord[];
  mistakes?: TeacherOpsReportMistakeRecord[];
  questions?: TeacherOpsReportQuestionRecord[];
  school_memberships?: TeacherOpsReportSchoolMembershipRecord[];
  student_profiles: TeacherOpsReportStudentProfileRecord[];
  submissions?: TeacherOpsReportSubmissionRecord[];
  teacher_classes: TeacherOpsReportClassRecord[];
  teacher_reports: TeacherOpsReportRecord[];
  topics?: TeacherOpsReportTopicRecord[];
  users: TeacherOpsReportUserRecord[];
};

export type TeacherOpsReportPersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsReportPersistenceDatabase>;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsReportPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
};

export type TeacherOpsReportPersistenceStore = ReturnType<typeof createTeacherOpsReportPersistenceStore>;

function canUseTeacherArea(user?: TeacherOpsReportUserRecord | null): user is TeacherOpsReportUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherClassRecordsFor(database: TeacherOpsReportPersistenceDatabase, user: TeacherOpsReportUserRecord) {
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
    .sort((a, b) => (a.grade ?? "S3").localeCompare(b.grade ?? "S3") || a.name.localeCompare(b.name));
}

function teacherCanAccessClass(
  database: TeacherOpsReportPersistenceDatabase,
  user: TeacherOpsReportUserRecord,
  classId: string
) {
  return teacherClassRecordsFor(database, user).find((teacherClass) => teacherClass.id === classId) ?? null;
}

function curriculumProfileForUser(
  database: TeacherOpsReportPersistenceDatabase,
  userId?: string | null
): CurriculumProfile {
  const profile = userId ? database.student_profiles.find((candidate) => candidate.user_id === userId) : null;
  return normalizeStoredCurriculumProfile({
    curriculumTrack: profile?.curriculum_track,
    region: profile?.curriculum_region,
    publisher: profile?.textbook_publisher
  });
}

function curriculumProfileForClass(
  database: TeacherOpsReportPersistenceDatabase,
  teacherClass: TeacherOpsReportClassRecord
): CurriculumProfile {
  return curriculumProfileForUser(database, teacherClass.teacher_id);
}

function toTeacherClass(
  database: TeacherOpsReportPersistenceDatabase,
  record: TeacherOpsReportClassRecord
): TeacherClass {
  const curriculumProfile = curriculumProfileForClass(database, record);
  const studentCount = (database.class_enrollments ?? []).filter((enrollment) => enrollment.class_id === record.id).length;

  return {
    id: record.id,
    teacherId: record.teacher_id ?? "",
    schoolId: record.school_id,
    classCode: record.class_code,
    name: record.name,
    grade: record.grade ?? "S3",
    curriculumTrack: curriculumTrackForProfile(curriculumProfile),
    curriculumProfile,
    academicYear: record.academic_year ?? "",
    description: {
      en: record.description_en ?? "",
      zh: record.description_zh ?? ""
    },
    studentCount,
    inviteCode: record.invite_code ?? "",
    createdAt: record.created_at ?? "",
    updatedAt: record.updated_at ?? record.created_at ?? ""
  };
}

function teacherStudentIdsForClass(database: TeacherOpsReportPersistenceDatabase, classId: string) {
  return (database.class_enrollments ?? [])
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

function teacherClassForStudent(
  database: TeacherOpsReportPersistenceDatabase,
  user: TeacherOpsReportUserRecord,
  studentId: string
) {
  const accessibleClassIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
  const enrollment = (database.class_enrollments ?? []).find((candidate) => (
    candidate.student_id === studentId && accessibleClassIds.has(candidate.class_id)
  ));
  return enrollment ? teacherCanAccessClass(database, user, enrollment.class_id) : null;
}

function teacherClassStudentPairs(
  database: TeacherOpsReportPersistenceDatabase,
  classRecords: TeacherOpsReportClassRecord[]
) {
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  return (database.class_enrollments ?? [])
    .filter((enrollment) => classIds.has(enrollment.class_id))
    .map((enrollment) => ({
      classId: enrollment.class_id,
      studentId: enrollment.student_id
    }));
}

export const teacherOpsReportClassStudentPairs = teacherClassStudentPairs;

function localized(value: LocalizedText, language: TeacherReportLanguage) {
  return textForLanguage(value, language);
}

function isChineseReportLanguage(language: TeacherReportLanguage) {
  return language === "zh" || language === "zh-Hans";
}

function isCurriculumTopic(topic: TeacherOpsReportTopicRecord, profile: CurriculumProfile) {
  if (!topic.curriculum_track && !topic.curriculum_region && !topic.textbook_publisher) {
    return profile.region === defaultCurriculumProfile.region && profile.publisher === defaultCurriculumProfile.publisher;
  }
  return contentMatchesCurriculumProfile(
    {
      curriculumTrack: topic.curriculum_track,
      region: topic.curriculum_region,
      publisher: topic.textbook_publisher
    },
    profile
  );
}

function localizedTopic(topic: TeacherOpsReportTopicRecord): LocalizedText {
  return {
    en: topic.title_en,
    zh: topic.title_zh,
    zhHans: topic.title_zh_hans
  };
}

function topicRecordForId(database: TeacherOpsReportPersistenceDatabase, topicId: string) {
  return (database.topics ?? []).find((topic) => topic.id === topicId);
}

function topicLabelFor(
  database: TeacherOpsReportPersistenceDatabase,
  question: TeacherOpsReportQuestionRecord
): LocalizedText {
  const topic = topicRecordForId(database, question.topic_id);
  return topic
    ? localizedTopic(topic)
    : {
      en: question.topic_title_en ?? question.topic_id,
      zh: question.topic_title_zh ?? question.topic_title_en ?? question.topic_id
    };
}

function questionForId(database: TeacherOpsReportPersistenceDatabase, questionId: string) {
  return (database.questions ?? []).find((question) => question.id === questionId);
}

function topicIdsForClass(
  database: TeacherOpsReportPersistenceDatabase,
  teacherClass: TeacherOpsReportClassRecord
) {
  const curriculumProfile = curriculumProfileForClass(database, teacherClass);
  return (database.topics ?? [])
    .filter((topic) => isCurriculumTopic(topic, curriculumProfile) && topic.grade === (teacherClass.grade ?? "S3"))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id))
    .map((topic) => topic.id);
}

function studentTargetsForTeacher(
  database: TeacherOpsReportPersistenceDatabase,
  classRecords: TeacherOpsReportClassRecord[]
): TeacherReportTarget[] {
  const classById = new Map(classRecords.map((teacherClass) => [teacherClass.id, teacherClass]));
  const targets: TeacherReportTarget[] = [];

  teacherClassStudentPairs(database, classRecords).forEach((pair) => {
    const profile = database.student_profiles.find((candidate) => candidate.user_id === pair.studentId);
    const teacherClass = classById.get(pair.classId);
    if (!profile || !teacherClass) return;

    targets.push({
      id: `${pair.classId}-${pair.studentId}`,
      label: { en: `${profile.name} · ${teacherClass.name}`, zh: `${profile.name} · ${teacherClass.name}` },
      type: "student",
      classId: pair.classId,
      studentId: pair.studentId
    });
  });

  return targets.sort((a, b) => localized(a.label, "en").localeCompare(localized(b.label, "en")));
}

function assignmentTargetsForTeacher(
  database: TeacherOpsReportPersistenceDatabase,
  classRecords: TeacherOpsReportClassRecord[]
): TeacherReportTarget[] {
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  return (database.assignments ?? [])
    .filter((assignment) => classIds.has(assignment.class_id))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .map((assignment) => ({
      id: assignment.id,
      label: { en: assignment.title_en, zh: assignment.title_zh },
      type: "assignment" as const,
      classId: assignment.class_id,
      assignmentId: assignment.id
    }));
}

function assessmentTargetsForTeacher(
  database: TeacherOpsReportPersistenceDatabase,
  classRecords: TeacherOpsReportClassRecord[]
): TeacherReportTarget[] {
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  return (database.assessments ?? [])
    .filter((assessment) => classIds.has(assessment.class_id))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .map((assessment) => ({
      id: assessment.id,
      label: { en: assessment.title_en, zh: assessment.title_zh },
      type: "assessment" as const,
      classId: assessment.class_id,
      assessmentId: assessment.id
    }));
}

function average(values: number[]) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  return finiteValues.length ? Math.round(finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length) : null;
}

export const teacherOpsReportAverage = average;

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export const teacherOpsReportPercent = percent;

function timestampOf(value?: string | null) {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

function secondsToDisplayMinutes(seconds: number) {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}

const dayMs = 24 * 60 * 60 * 1000;

function studentLearningMinutes(
  database: TeacherOpsReportPersistenceDatabase,
  studentIds: Set<string>,
  nowMs: number,
  days: number
) {
  const earliest = nowMs - days * dayMs;
  const attemptSeconds = (database.attempts ?? [])
    .filter((attempt) => {
      const attemptMs = timestampOf(attempt.created_at);
      return studentIds.has(attempt.user_id) && attemptMs !== null && attemptMs >= earliest && attemptMs <= nowMs;
    })
    .reduce((sum, attempt) => sum + (attempt.duration_seconds ?? 0), 0);
  const eventSeconds = (database.learning_events ?? [])
    .filter((event) => {
      const eventMs = timestampOf(event.created_at);
      return studentIds.has(event.user_id) && eventMs !== null && eventMs >= earliest && eventMs <= nowMs;
    })
    .reduce((sum, event) => sum + (event.duration_seconds ?? 0), 0);

  return secondsToDisplayMinutes(attemptSeconds + eventSeconds);
}

function topicMasteryRows(
  database: TeacherOpsReportPersistenceDatabase,
  studentIds: string[],
  topicIds: string[]
) {
  return topicIds
    .map((topicId) => {
      const topic = topicRecordForId(database, topicId);
      if (!topic) return null;
      const masteryValues = studentIds.map((studentId) => {
        return (database.lesson_progress ?? []).find((progress) => (
          progress.user_id === studentId && progress.topic_id === topicId
        ))?.mastery ?? 0;
      });
      return {
        topic,
        mastery: average(masteryValues) ?? 0
      };
    })
    .filter((row): row is { topic: TeacherOpsReportTopicRecord; mastery: number } => Boolean(row));
}

function answerAccuracyForStudents(
  database: TeacherOpsReportPersistenceDatabase,
  studentIds: Set<string>,
  nowMs: number,
  days: number
) {
  const earliest = nowMs - days * dayMs;
  const attempts = (database.attempts ?? []).filter((attempt) => {
    const attemptMs = timestampOf(attempt.created_at);
    return studentIds.has(attempt.user_id) && attemptMs !== null && attemptMs >= earliest && attemptMs <= nowMs;
  });
  if (!attempts.length) return null;
  return Math.round((attempts.filter((attempt) => attempt.is_correct).length / attempts.length) * 100);
}

function masteryChangeSignal(
  database: TeacherOpsReportPersistenceDatabase,
  studentIds: Set<string>,
  nowMs: number
) {
  const recentAccuracy = answerAccuracyForStudents(database, studentIds, nowMs, 30);
  const previousEarliest = nowMs - 60 * dayMs;
  const previousLatest = nowMs - 30 * dayMs;
  const previousAttempts = (database.attempts ?? []).filter((attempt) => {
    const attemptMs = timestampOf(attempt.created_at);
    return studentIds.has(attempt.user_id) && attemptMs !== null && attemptMs >= previousEarliest && attemptMs < previousLatest;
  });
  if (recentAccuracy === null || !previousAttempts.length) return 0;
  const previousAccuracy = Math.round((previousAttempts.filter((attempt) => attempt.is_correct).length / previousAttempts.length) * 100);
  return Math.max(-30, Math.min(30, recentAccuracy - previousAccuracy));
}

function reportMistakeTypes(
  database: TeacherOpsReportPersistenceDatabase,
  studentIds: Set<string>,
  language: TeacherReportLanguage
) {
  const counts = new Map<string, number>();
  (database.mistakes ?? [])
    .filter((mistake) => studentIds.has(mistake.user_id))
    .forEach((mistake) => {
      const question = questionForId(database, mistake.question_id);
      if (!question) return;
      const topic = localized(topicLabelFor(database, question), language);
      counts.set(topic, (counts.get(topic) ?? 0) + mistake.wrong_attempts);
    });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => isChineseReportLanguage(language)
      ? `${topic}：${count} ${localized({ en: "wrong attempts", zh: "次錯誤" }, language)}`
      : `${topic}: ${count} wrong attempts`)
    .slice(0, 5);
}

function isSubmissionComplete(submission: TeacherOpsReportSubmissionRecord) {
  return (
    submission.status === "submitted" ||
    submission.status === "graded" ||
    submission.status === "late" ||
    submission.status === "correction-required" ||
    submission.status === "correction-submitted" ||
    submission.status === "resolved"
  );
}

function buildReportPreviewFromScope({
  database,
  type,
  language,
  subjectName,
  className,
  studentIds,
  topicIds,
  generatedAt,
  title,
  subtitle,
  completionRate,
  teacherRemarks
}: {
  database: TeacherOpsReportPersistenceDatabase;
  type: TeacherReportType;
  language: TeacherReportLanguage;
  subjectName: string;
  className?: string;
  studentIds: string[];
  topicIds: string[];
  generatedAt: string;
  title: string;
  subtitle: string;
  completionRate: number | null;
  teacherRemarks: string;
}): TeacherReportPreview {
  const nowMs = Date.parse(generatedAt);
  const studentIdSet = new Set(studentIds);
  const rows = topicMasteryRows(database, studentIds, topicIds);
  const averageMastery = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.mastery, 0) / rows.length) : 0;
  const strengths = rows
    .filter((row) => row.mastery >= 70)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 3)
    .map((row) => `${localized(localizedTopic(row.topic), language)} (${row.mastery}%)`);
  const weaknesses = rows
    .filter((row) => row.mastery < 65)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4)
    .map((row) => `${localized(localizedTopic(row.topic), language)} (${row.mastery}%)`);
  const suggestedPractice = weaknesses.length
    ? weaknesses.map((weakness) => isChineseReportLanguage(language)
      ? `${localized({ en: "Redo", zh: "重做" }, language)} ${weakness}`
      : `Redo ${weakness}`)
    : rows.slice(0, 2).map((row) => isChineseReportLanguage(language)
      ? `${localized({ en: "Challenge", zh: "挑戰" }, language)} ${localized(localizedTopic(row.topic), language)} ${localized({ en: "extension questions", zh: "進階題" }, language)}`
      : `Try extension questions for ${localized(localizedTopic(row.topic), language)}`);

  return {
    id: `preview-${type}-${studentIds.join("-") || className || "scope"}`,
    type,
    language,
    title,
    subtitle,
    generatedAt,
    subjectName,
    className,
    metrics: {
      learningMinutes: studentLearningMinutes(database, studentIdSet, nowMs, 30),
      masteryChange: masteryChangeSignal(database, studentIdSet, nowMs),
      averageMastery,
      accuracy: answerAccuracyForStudents(database, studentIdSet, nowMs, 30),
      completionRate
    },
    strengths: strengths.length ? strengths : [localized({ en: "No clear strength signal yet", zh: "暫未有明顯強項訊號" }, language)],
    weaknesses: weaknesses.length ? weaknesses : [localized({ en: "No clear weakness signal yet", zh: "暫未有明顯弱項訊號" }, language)],
    mistakeTypes: reportMistakeTypes(database, studentIdSet, language),
    suggestedPractice,
    teacherRemarks
  };
}

export function readTeacherOpsReportPreview(value?: string): TeacherReportPreview | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<TeacherReportPreview> | null;
    if (
      typeof parsed?.id === "string" &&
      typeof parsed.type === "string" &&
      typeof parsed.title === "string" &&
      typeof parsed.subtitle === "string" &&
      typeof parsed.generatedAt === "string" &&
      typeof parsed.subjectName === "string" &&
      parsed.metrics &&
      Array.isArray(parsed.strengths) &&
      Array.isArray(parsed.weaknesses) &&
      Array.isArray(parsed.mistakeTypes) &&
      Array.isArray(parsed.suggestedPractice)
    ) {
      return parsed as TeacherReportPreview;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function toTeacherOpsReport(record: TeacherOpsReportRecord): TeacherReport {
  return {
    id: record.id,
    type: record.type,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    classId: record.class_id,
    studentId: record.student_id,
    generatedBy: record.generated_by,
    generatedAt: record.generated_at,
    summary: {
      en: record.summary_en,
      zh: record.summary_zh
    },
    preview: readTeacherOpsReportPreview(record.preview_json)
  };
}

export function createTeacherOpsReportPersistenceStore({
  createId = () => `report-${randomUUID()}`,
  now = () => new Date(),
  readDatabase,
  mutateDatabase
}: TeacherOpsReportPersistenceStoreDependencies) {
  async function getTeacherReports(userId: string): Promise<TeacherReport[] | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!canUseTeacherArea(user)) return null;

    const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
    return database.teacher_reports
      .filter((report) => user.role === "admin" || !report.class_id || classIds.has(report.class_id))
      .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
      .map(toTeacherOpsReport);
  }

  async function getTeacherReportPreview({
    teacherId,
    type,
    language = "zh",
    classId,
    studentId,
    assignmentId,
    assessmentId,
    teacherRemarks = ""
  }: {
    teacherId: string;
    type: TeacherReportType;
    language?: TeacherReportLanguage;
    classId?: string | null;
    studentId?: string | null;
    assignmentId?: string | null;
    assessmentId?: string | null;
    teacherRemarks?: string;
  }): Promise<TeacherReportPreview | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return null;

    const classRecords = teacherClassRecordsFor(database, user);
    const generatedAt = now().toISOString();
    const firstClass = classRecords.find((teacherClass) => teacherStudentIdsForClass(database, teacherClass.id).length > 0) ?? classRecords[0];
    if (!firstClass) return null;

    if (type === "assignment") {
      const assignment = (assignmentId ? (database.assignments ?? []).find((candidate) => candidate.id === assignmentId) : null) ??
        (database.assignments ?? []).find((candidate) => candidate.class_id === (classId ?? firstClass.id));
      const teacherClass = assignment ? teacherCanAccessClass(database, user, assignment.class_id) : null;
      if (!assignment || !teacherClass) return null;
      const submissions = (database.submissions ?? []).filter((submission) => submission.assignment_id === assignment.id);
      const studentIds = submissions.map((submission) => submission.student_id);
      return buildReportPreviewFromScope({
        database,
        type,
        language,
        subjectName: localized({ en: assignment.title_en, zh: assignment.title_zh }, language),
        className: teacherClass.name,
        studentIds,
        topicIds: topicIdsForClass(database, teacherClass),
        generatedAt,
        title: localized({ en: "Assignment report", zh: "作業報告" }, language),
        subtitle: localized({ en: assignment.title_en, zh: assignment.title_zh }, language),
        completionRate: percent(submissions.filter(isSubmissionComplete).length, submissions.length),
        teacherRemarks
      });
    }

    if (type === "assessment") {
      const assessment = (assessmentId ? (database.assessments ?? []).find((candidate) => candidate.id === assessmentId) : null) ??
        (database.assessments ?? []).find((candidate) => candidate.class_id === (classId ?? firstClass.id));
      const teacherClass = assessment ? teacherCanAccessClass(database, user, assessment.class_id) : null;
      if (!assessment || !teacherClass) return null;
      const submissions = (database.assessment_submissions ?? []).filter((submission) => submission.assessment_id === assessment.id);
      const studentIds = submissions.length
        ? submissions.map((submission) => submission.student_id)
        : teacherStudentIdsForClass(database, teacherClass.id);
      return buildReportPreviewFromScope({
        database,
        type,
        language,
        subjectName: localized({ en: assessment.title_en, zh: assessment.title_zh }, language),
        className: teacherClass.name,
        studentIds,
        topicIds: topicIdsForClass(database, teacherClass),
        generatedAt,
        title: localized({ en: "Quiz report", zh: "測驗報告" }, language),
        subtitle: localized({ en: assessment.title_en, zh: assessment.title_zh }, language),
        completionRate: percent(
          submissions.filter((submission) => submission.status === "submitted" || submission.status === "graded").length,
          studentIds.length
        ),
        teacherRemarks
      });
    }

    const teacherClass = classId
      ? teacherCanAccessClass(database, user, classId)
      : studentId
        ? teacherClassForStudent(database, user, studentId) ?? firstClass
        : firstClass;
    if (!teacherClass) return null;
    const studentIds = type === "student" || type === "parent-summary"
      ? [studentId ?? teacherStudentIdsForClass(database, teacherClass.id)[0]].filter((value): value is string => Boolean(value))
      : teacherStudentIdsForClass(database, teacherClass.id);
    if (!studentIds.length) return null;
    const profile = studentIds.length === 1
      ? database.student_profiles.find((candidate) => candidate.user_id === studentIds[0])
      : null;
    const subjectName = profile?.name ?? teacherClass.name;
    const titleByType: Record<Exclude<TeacherReportType, "assignment" | "assessment">, string> = {
      student: localized({ en: "Student learning report", zh: "學生學習報告" }, language),
      class: localized({ en: "Class weekly report", zh: "班級周報" }, language),
      "parent-summary": localized({ en: "Parent communication summary", zh: "家長溝通摘要" }, language)
    };

    return buildReportPreviewFromScope({
      database,
      type,
      language,
      subjectName,
      className: teacherClass.name,
      studentIds,
      topicIds: topicIdsForClass(database, teacherClass),
      generatedAt,
      title: titleByType[type as Exclude<TeacherReportType, "assignment" | "assessment">],
      subtitle: type === "class" ? teacherClass.name : `${subjectName} · ${teacherClass.name}`,
      completionRate: null,
      teacherRemarks
    });
  }

  async function getTeacherReportsData(userId: string, options: { includeDefaultPreview?: boolean } = {}): Promise<TeacherReportsData | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!canUseTeacherArea(user)) return null;

    const classRecords = teacherClassRecordsFor(database, user);
    const history = await getTeacherReports(userId);
    let defaultPreview: TeacherReportPreview | null = null;
    if (options.includeDefaultPreview) {
      const defaultClass = classRecords.find((teacherClass) => teacherStudentIdsForClass(database, teacherClass.id).length > 0) ?? classRecords[0];
      defaultPreview = await getTeacherReportPreview({
        teacherId: userId,
        type: "class",
        language: "zh",
        classId: defaultClass?.id
      });
    }

    return {
      generatedAt: now().toISOString(),
      classes: classRecords.map((teacherClass) => toTeacherClass(database, teacherClass)),
      students: studentTargetsForTeacher(database, classRecords),
      assignments: assignmentTargetsForTeacher(database, classRecords),
      assessments: assessmentTargetsForTeacher(database, classRecords),
      reportHistory: history ?? [],
      defaultPreview
    };
  }

  async function saveTeacherReportPreview(teacherId: string, preview: TeacherReportPreview) {
    return mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

      const report: TeacherOpsReportRecord = {
        id: createId(),
        type: preview.type,
        title_en: preview.title,
        title_zh: preview.title,
        class_id: preview.className
          ? database.teacher_classes.find((teacherClass) => teacherClass.name === preview.className)?.id
          : undefined,
        student_id: preview.type === "student" || preview.type === "parent-summary"
          ? database.student_profiles.find((profile) => profile.name === preview.subjectName)?.user_id
          : undefined,
        generated_by: user.id,
        generated_at: preview.generatedAt,
        summary_en: [
          preview.subtitle,
          `Average mastery: ${preview.metrics.averageMastery}%`,
          `Learning minutes: ${preview.metrics.learningMinutes}`,
          `Suggested practice: ${preview.suggestedPractice.join("; ")}`
        ].join("\n"),
        summary_zh: [
          preview.subtitle,
          `平均掌握：${preview.metrics.averageMastery}%`,
          `學習時長：${preview.metrics.learningMinutes} 分鐘`,
          `建議練習：${preview.suggestedPractice.join("；")}`
        ].join("\n"),
        preview_json: preview.type === "parent-summary" ? JSON.stringify(preview) : undefined
      };
      database.teacher_reports.unshift(report);
      return { status: "saved" as const, report: toTeacherOpsReport(report) };
    });
  }

  return {
    getTeacherReportPreview,
    getTeacherReports,
    getTeacherReportsData,
    saveTeacherReportPreview
  };
}
