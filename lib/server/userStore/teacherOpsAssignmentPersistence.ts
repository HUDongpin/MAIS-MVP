import { randomUUID } from "crypto";
import { toPrcSimplifiedText } from "@/lib/i18n";
import { isSafeMediaObjectKey, mediaObjectAccessUrl } from "@/lib/server/mediaObjectStore";
import type {
  Assignment,
  AssignmentContentType,
  AssignmentGradingRun,
  AssignmentGradingRunStatus,
  AssignmentOcrProvider,
  AssignmentStatus,
  AssignmentSubmissionAttempt,
  AssignmentSubmissionAttemptKind,
  AssignmentSubmissionInputType,
  AssignmentSubmissionOcrResult,
  AssignmentTeacherReview,
  AssignmentTeacherReviewAction,
  GradeId,
  Language,
  LocalizedText,
  Submission,
  SubmissionStatus,
  TeacherAssignmentDetailData,
  TeacherClass
} from "@/types";

type TeacherOpsAssignmentUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsAssignmentUserRecord = {
  id: string;
  role: TeacherOpsAssignmentUserRole;
  username?: string;
};

type TeacherOpsAssignmentClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsAssignmentClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type TeacherOpsAssignmentSchoolMembershipRecord = {
  user_id: string;
  role: "student" | "teacher" | "parent" | "admin";
  class_id?: string;
};

type TeacherOpsAssignmentStudentProfileRecord = {
  user_id: string;
  name: string;
};

type TeacherOpsAssignmentRecord = {
  id: string;
  class_id: string;
  title_en?: string;
  title_zh?: string;
  title_zh_hans?: string;
  description_en?: string;
  description_zh?: string;
  description_zh_hans?: string;
  content_type?: AssignmentContentType;
  target_id?: string;
  status?: AssignmentStatus;
  due_at?: string | null;
  allow_retake?: boolean;
  show_answers?: boolean;
  count_towards_grade?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at: string;
};

export type TeacherOpsSeedAssignmentRecord = {
  id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  content_type: AssignmentContentType;
  target_id: string;
  status: AssignmentStatus;
  due_at: string;
  allow_retake: boolean;
  show_answers: boolean;
  count_towards_grade: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TeacherOpsSeedSubmissionRecord = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: SubmissionStatus;
  score: number | null;
  submitted_at: string | null;
  graded_at: string | null;
  feedback_en: string;
  feedback_zh: string;
  updated_at: string;
};

export type TeacherOpsAssignmentCollectionRecord = Omit<
  TeacherOpsSeedAssignmentRecord,
  "due_at" | "target_id" | "count_towards_grade"
> & {
  count_towards_grade?: boolean;
  description_zh_hans?: string;
  due_at: string | null;
  target_id?: string;
  title_zh_hans?: string;
};

export type TeacherOpsSubmissionCollectionRecord = TeacherOpsAssignmentSubmissionRecord;

export type TeacherOpsAssignmentCollectionRecords = {
  assignments?: TeacherOpsAssignmentCollectionRecord[];
  submissions?: TeacherOpsSubmissionCollectionRecord[];
};

export type TeacherOpsAssignmentCollectionNormalizationOptions = {
  deletedAssignmentIds: ReadonlySet<string>;
  demoTeacherId: string;
  demoUserId: string;
  shouldSeedDemoUser: () => boolean;
};

type TeacherOpsAssignmentProjectionRecord = {
  id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  title_zh_hans?: string;
  description_en: string;
  description_zh: string;
  description_zh_hans?: string;
  content_type: AssignmentContentType;
  target_id?: string;
  status: AssignmentStatus;
  due_at: string | null;
  allow_retake: boolean;
  show_answers: boolean;
  count_towards_grade: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type TeacherOpsAssignmentSubmissionRecord = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: SubmissionStatus;
  score: number | null;
  submitted_at: string | null;
  graded_at: string | null;
  feedback_en?: string;
  feedback_zh?: string;
  updated_at: string;
};

type TeacherOpsAssignmentSubmissionAttemptRecord = {
  id: string;
  submission_id: string;
  student_id?: string;
  attempt_number?: unknown;
  kind?: unknown;
  input_type?: unknown;
  answer_text?: unknown;
  image_data_url?: string;
  image_object_key?: unknown;
  image_file_name?: string;
  ocr_result?: unknown;
  submitted_at?: string | null;
};

type TeacherOpsAssignmentSubmissionAttemptProjectionRecord = {
  id: string;
  submission_id: string;
  student_id: string;
  attempt_number: number;
  kind: AssignmentSubmissionAttemptKind;
  input_type: AssignmentSubmissionInputType;
  answer_text: string;
  image_data_url?: string;
  image_object_key?: string;
  image_file_name?: string;
  ocr_result: AssignmentSubmissionOcrResult | null;
  submitted_at: string;
};

type TeacherOpsAssignmentGradingRunRecord = {
  id: string;
  submission_id: string;
  attempt_id?: string | null;
  status?: unknown;
  provider?: AssignmentOcrProvider | "llm" | "manual" | null;
  model?: string | null;
  suggested_score?: unknown;
  confidence?: unknown;
  created_at?: string | null;
};

type TeacherOpsAssignmentGradingRunProjectionRecord = {
  id: string;
  submission_id: string;
  attempt_id: string | null;
  status: AssignmentGradingRunStatus;
  provider: AssignmentOcrProvider | "llm" | "manual";
  model: string;
  suggested_score: number | null;
  confidence: number | null;
  feedback_en?: string;
  feedback_zh?: string;
  correction_request_en?: string;
  correction_request_zh?: string;
  error_code?: string;
  usage?: AssignmentGradingRun["usage"];
  created_at: string;
};

type TeacherOpsAssignmentTeacherReviewRecord = {
  id: string;
  submission_id: string;
  action?: unknown;
  final_score?: unknown;
  correction_due_at?: string | null;
  created_at?: string | null;
};

type TeacherOpsAssignmentTeacherReviewProjectionRecord = {
  id: string;
  submission_id: string;
  action: AssignmentTeacherReviewAction;
  final_score: number | null;
  feedback_en?: string;
  feedback_zh?: string;
  correction_request_en?: string;
  correction_request_zh?: string;
  correction_due_at?: string | null;
  reviewed_by: string;
  created_at: string;
};

type TeacherOpsAssignmentReminderRunRecord = {
  id?: string;
  assignment_id: string;
};

type TeacherOpsAssignmentLinkedRecord = {
  id?: string;
  assignment_id?: string;
};

type TeacherOpsAssignmentLessonKitRecord = {
  id?: string;
  assignment_id?: string;
  updated_at: string;
};

export function normalizeTeacherOpsAssignmentRecord<Record extends { count_towards_grade?: boolean }>(
  assignment: Record
): Record & { count_towards_grade: boolean } {
  return {
    ...assignment,
    count_towards_grade: assignment.count_towards_grade ?? true
  };
}

function mergeTeacherOpsAssignmentSeedRecordsPreservingExisting<T>(
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

type TeacherOpsAssignmentSubmissionAttemptNormalizationDependencies = {
  now: string;
  normalizeStoredMediaObjectKey: (value: unknown) => string | undefined;
  normalizeAssignmentOcrResult: (value: unknown) => AssignmentSubmissionOcrResult | null;
};

function normalizeTeacherOpsAssignmentSubmissionAttemptKind(value: unknown): AssignmentSubmissionAttemptKind {
  return value === "correction" ? "correction" : "initial";
}

function normalizeTeacherOpsAssignmentSubmissionInputType(value: unknown): AssignmentSubmissionInputType {
  return value === "image" || value === "handwriting" || value === "mixed" ? value : "text";
}

export function normalizeTeacherOpsAssignmentSubmissionAttemptRecord<
  Record extends {
    attempt_number?: unknown;
    kind?: unknown;
    input_type?: unknown;
    answer_text?: unknown;
    image_object_key?: unknown;
    ocr_result?: unknown;
    submitted_at?: string | null;
  }
>(
  attempt: Record,
  dependencies: TeacherOpsAssignmentSubmissionAttemptNormalizationDependencies
): Record & {
  attempt_number: number;
  kind: AssignmentSubmissionAttemptKind;
  input_type: AssignmentSubmissionInputType;
  answer_text: string;
  image_object_key: string | undefined;
  ocr_result: AssignmentSubmissionOcrResult | null;
  submitted_at: string;
} {
  return {
    ...attempt,
    attempt_number: Math.max(1, Math.round(Number(attempt.attempt_number) || 1)),
    kind: normalizeTeacherOpsAssignmentSubmissionAttemptKind(attempt.kind),
    input_type: normalizeTeacherOpsAssignmentSubmissionInputType(attempt.input_type),
    answer_text: typeof attempt.answer_text === "string" ? attempt.answer_text : "",
    image_object_key: dependencies.normalizeStoredMediaObjectKey(attempt.image_object_key),
    ocr_result: dependencies.normalizeAssignmentOcrResult(attempt.ocr_result),
    submitted_at: attempt.submitted_at ?? dependencies.now
  };
}

function normalizeTeacherOpsAssignmentGradingRunStatus(value: unknown): AssignmentGradingRunStatus {
  return value === "suggested" || value === "failed" ? value : "needs-review";
}

export function normalizeTeacherOpsAssignmentGradingRunRecord<
  Record extends {
    status?: unknown;
    provider?: AssignmentOcrProvider | "llm" | "manual" | null;
    model?: string | null;
    suggested_score?: unknown;
    confidence?: unknown;
    created_at?: string | null;
  }
>(
  run: Record,
  now: string
): Record & {
  status: AssignmentGradingRunStatus;
  provider: AssignmentOcrProvider | "llm" | "manual";
  model: string;
  suggested_score: number | null;
  confidence: number | null;
  created_at: string;
} {
  return {
    ...run,
    status: normalizeTeacherOpsAssignmentGradingRunStatus(run.status),
    provider: run.provider ?? "manual",
    model: run.model || "manual",
    suggested_score: typeof run.suggested_score === "number" ? Math.max(0, Math.min(100, Math.round(run.suggested_score))) : null,
    confidence: typeof run.confidence === "number" ? Math.max(0, Math.min(1, run.confidence)) : null,
    created_at: run.created_at ?? now
  };
}

function normalizeTeacherOpsAssignmentTeacherReviewAction(value: unknown): AssignmentTeacherReviewAction {
  return value === "accept" || value === "request-correction" || value === "resolve" ? value : "score-only";
}

export function normalizeTeacherOpsAssignmentTeacherReviewRecord<
  Record extends {
    action?: unknown;
    final_score?: unknown;
    correction_due_at?: string | null;
    created_at?: string | null;
  }
>(
  review: Record,
  now: string
): Record & {
  action: AssignmentTeacherReviewAction;
  final_score: number | null;
  correction_due_at: string | null;
  created_at: string;
} {
  return {
    ...review,
    action: normalizeTeacherOpsAssignmentTeacherReviewAction(review.action),
    final_score: typeof review.final_score === "number" ? Math.max(0, Math.min(100, Math.round(review.final_score))) : null,
    correction_due_at: review.correction_due_at ?? null,
    created_at: review.created_at ?? now
  };
}

export type TeacherOpsAssignmentPersistenceDatabase = {
  assignments: TeacherOpsAssignmentRecord[];
  assignment_grading_runs: TeacherOpsAssignmentGradingRunRecord[];
  assignment_submission_attempts: TeacherOpsAssignmentSubmissionAttemptRecord[];
  assignment_teacher_reviews: TeacherOpsAssignmentTeacherReviewRecord[];
  class_enrollments: TeacherOpsAssignmentClassEnrollmentRecord[];
  deleted_assignment_ids?: string[];
  school_memberships?: TeacherOpsAssignmentSchoolMembershipRecord[];
  student_profiles: TeacherOpsAssignmentStudentProfileRecord[];
  submissions: TeacherOpsAssignmentSubmissionRecord[];
  teacher_classes: TeacherOpsAssignmentClassRecord[];
  teacher_lesson_kits: TeacherOpsAssignmentLessonKitRecord[];
  teacher_messages: TeacherOpsAssignmentLinkedRecord[];
  teacher_notices: TeacherOpsAssignmentLinkedRecord[];
  teacher_reminder_runs: TeacherOpsAssignmentReminderRunRecord[];
  users: TeacherOpsAssignmentUserRecord[];
};

export type TeacherOpsAssignmentPersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsAssignmentPersistenceDatabase>;
  mutateDatabase?: <T>(
    mutator: (database: TeacherOpsAssignmentPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  toAssignment: (
    database: TeacherOpsAssignmentPersistenceDatabase,
    assignment: TeacherOpsAssignmentRecord
  ) => Assignment;
  toTeacherClass: (
    database: TeacherOpsAssignmentPersistenceDatabase,
    teacherClass: TeacherOpsAssignmentClassRecord
  ) => TeacherClass;
  toSubmission: (
    database: TeacherOpsAssignmentPersistenceDatabase,
    submission: TeacherOpsAssignmentSubmissionRecord
  ) => Submission;
};

export type TeacherOpsAssignmentPersistenceStore = ReturnType<typeof createTeacherOpsAssignmentPersistenceStore>;

function canUseTeacherArea(user?: TeacherOpsAssignmentUserRecord | null): user is TeacherOpsAssignmentUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

const assignmentFallbackCopy: Record<AssignmentContentType, { title: LocalizedText; description: LocalizedText }> = {
  lesson: {
    title: { en: "Lesson assignment", zh: "課節作業", zhHans: "课节作业" },
    description: { en: "Open the assigned lesson content.", zh: "開啟指定課節內容。", zhHans: "打开指定课节内容。" }
  },
  practice: {
    title: { en: "Practice assignment", zh: "練習作業", zhHans: "练习作业" },
    description: { en: "Complete the assigned practice.", zh: "完成指定練習。", zhHans: "完成指定练习。" }
  },
  visualization: {
    title: { en: "Visualization assignment", zh: "互動圖像作業", zhHans: "互动图象作业" },
    description: { en: "Open the assigned visualization.", zh: "開啟指定互動圖像。", zhHans: "打开指定互动图象。" }
  },
  resource: {
    title: { en: "Resource assignment", zh: "資源作業", zhHans: "资源作业" },
    description: { en: "Review the assigned resource.", zh: "查看指定資源。", zhHans: "查看指定资源。" }
  },
  assessment: {
    title: { en: "Assessment assignment", zh: "測驗作業", zhHans: "测验作业" },
    description: { en: "Complete the assigned assessment.", zh: "完成指定測驗。", zhHans: "完成指定测验。" }
  }
};

function hasHanText(value: string) {
  return /\p{Script=Han}/u.test(value);
}

function assignmentInputLanguage(title: string, description: string, language?: Language): Language {
  if (language === "en" || language === "zh" || language === "zh-Hans") return language;
  return hasHanText(`${title} ${description}`) ? "zh-Hans" : "en";
}

function localizedAssignmentField(value: string, language: Language, fallback: LocalizedText): Required<LocalizedText> {
  const trimmed = value.trim();
  const zhHansFallback = fallback.zhHans ?? toPrcSimplifiedText(fallback.zh);
  const localized: Required<LocalizedText> = {
    en: fallback.en,
    zh: fallback.zh,
    zhHans: zhHansFallback
  };

  if (!trimmed) return localized;
  if (language === "en") return { ...localized, en: trimmed };
  if (language === "zh-Hans") return { ...localized, zhHans: trimmed };
  return { ...localized, zh: trimmed, zhHans: toPrcSimplifiedText(trimmed) };
}

function teacherClassRecordsFor(
  database: TeacherOpsAssignmentPersistenceDatabase,
  user: TeacherOpsAssignmentUserRecord
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

const dayMs = 24 * 60 * 60 * 1000;

export function teacherOpsSeedAssignmentRecords(
  now: string,
  {
    demoTeacherId
  }: {
    demoTeacherId: string;
  }
): TeacherOpsSeedAssignmentRecord[] {
  const tomorrow = new Date(Date.parse(now) + dayMs).toISOString();

  return [
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
      due_at: tomorrow,
      allow_retake: true,
      show_answers: false,
      count_towards_grade: true,
      created_by: demoTeacherId,
      created_at: now,
      updated_at: now
    }
  ];
}

export function teacherOpsSeedSubmissionRecords(
  now: string,
  {
    demoUserId,
    shouldSeedDemoUser
  }: {
    demoUserId: string;
    shouldSeedDemoUser: () => boolean;
  }
): TeacherOpsSeedSubmissionRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "submission-quadratics-student-peter",
          assignment_id: "assignment-quadratics-checkpoint",
          student_id: demoUserId,
          status: "in-progress",
          score: null,
          submitted_at: null,
          graded_at: null,
          feedback_en: "",
          feedback_zh: "",
          updated_at: now
        }
      ]
    : [];
}

export function teacherOpsDeletedAssignmentIdSet(deletedAssignmentIds?: unknown[]): Set<string> {
  return new Set(
    (deletedAssignmentIds ?? []).filter(
      (assignmentId): assignmentId is string => typeof assignmentId === "string" && assignmentId.trim().length > 0
    )
  );
}

export function teacherOpsDeletedAssignmentSubmissionIdSet(
  submissions: Array<{ id: string; assignment_id: string }>,
  deletedAssignmentIds: ReadonlySet<string>
): Set<string> {
  return new Set(
    submissions
      .filter((submission) => deletedAssignmentIds.has(submission.assignment_id))
      .map((submission) => submission.id)
  );
}

export function normalizeTeacherOpsAssignmentCollections(
  collections: TeacherOpsAssignmentCollectionRecords,
  now: string,
  options: TeacherOpsAssignmentCollectionNormalizationOptions
): {
  assignments: Array<TeacherOpsAssignmentCollectionRecord & { count_towards_grade: boolean }>;
  submissions: TeacherOpsSubmissionCollectionRecord[];
} {
  return {
    assignments: mergeTeacherOpsAssignmentSeedRecordsPreservingExisting<
      TeacherOpsAssignmentCollectionRecord | TeacherOpsSeedAssignmentRecord
    >(
      (collections.assignments ?? []).filter((assignment) => !options.deletedAssignmentIds.has(assignment.id)),
      teacherOpsSeedAssignmentRecords(now, { demoTeacherId: options.demoTeacherId })
        .filter((assignment) => !options.deletedAssignmentIds.has(assignment.id)),
      (assignment) => assignment.id
    ).map((assignment) => normalizeTeacherOpsAssignmentRecord(assignment)),
    submissions: mergeTeacherOpsAssignmentSeedRecordsPreservingExisting<
      TeacherOpsSubmissionCollectionRecord | TeacherOpsSeedSubmissionRecord
    >(
      (collections.submissions ?? []).filter((submission) => !options.deletedAssignmentIds.has(submission.assignment_id)),
      teacherOpsSeedSubmissionRecords(now, {
        demoUserId: options.demoUserId,
        shouldSeedDemoUser: options.shouldSeedDemoUser
      }).filter((submission) => !options.deletedAssignmentIds.has(submission.assignment_id)),
      (submission) => submission.id
    )
  };
}

function teacherCanAccessClass(
  database: TeacherOpsAssignmentPersistenceDatabase,
  user: TeacherOpsAssignmentUserRecord,
  classId: string
) {
  return teacherClassRecordsFor(database, user).find((teacherClass) => teacherClass.id === classId) ?? null;
}

function teacherStudentIdsForClass(database: TeacherOpsAssignmentPersistenceDatabase, classId: string) {
  return (database.class_enrollments ?? [])
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

export function isTeacherOpsSubmissionComplete(submission: { status: string }) {
  return (
    submission.status === "submitted" ||
    submission.status === "graded" ||
    submission.status === "late" ||
    submission.status === "correction-required" ||
    submission.status === "correction-submitted" ||
    submission.status === "resolved"
  );
}

export function teacherOpsAssignmentSubmissionCounts(
  database: { submissions: Array<{ assignment_id: string; status: string }> },
  assignmentId: string
) {
  const submissions = database.submissions.filter((submission) => submission.assignment_id === assignmentId);
  const completed = submissions.filter(isTeacherOpsSubmissionComplete);

  return {
    submissionCount: submissions.length,
    completedCount: completed.length
  };
}

export function toTeacherOpsAssignment(
  database: { submissions: Array<{ assignment_id: string; status: string }> },
  record: TeacherOpsAssignmentProjectionRecord
): Assignment {
  const counts = teacherOpsAssignmentSubmissionCounts(database, record.id);

  return {
    id: record.id,
    classId: record.class_id,
    title: {
      en: record.title_en,
      zh: record.title_zh,
      zhHans: record.title_zh_hans
    },
    description: {
      en: record.description_en,
      zh: record.description_zh,
      zhHans: record.description_zh_hans
    },
    contentType: record.content_type,
    targetId: record.target_id,
    status: record.status,
    dueAt: record.due_at,
    allowRetake: record.allow_retake,
    showAnswers: record.show_answers,
    countTowardsGrade: record.count_towards_grade,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    submissionCount: counts.submissionCount,
    completedCount: counts.completedCount
  };
}

export function teacherOpsSubmissionNeedsTeacherGrading(submission: {
  status: string;
  graded_at?: string | null;
  score?: number | null;
}) {
  return (
    (submission.status === "submitted" || submission.status === "late") &&
    submission.graded_at === null &&
    submission.score === null
  );
}

export function teacherOpsSubmissionNeedsCorrectionReview(submission: { status: string }) {
  return submission.status === "correction-submitted";
}

export function latestTeacherOpsAssignmentReviewRecord<Review extends {
  submission_id: string;
  created_at: string;
}>(
  database: { assignment_teacher_reviews: Review[] },
  submissionId: string
) {
  return database.assignment_teacher_reviews
    .filter((review) => review.submission_id === submissionId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

function normalizeTeacherOpsAssignmentMediaObjectKey(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed && isSafeMediaObjectKey(trimmed) ? trimmed : undefined;
}

function teacherOpsAssignmentMediaObjectUrlFromKey(value: unknown) {
  const key = normalizeTeacherOpsAssignmentMediaObjectKey(value);
  return key ? mediaObjectAccessUrl(key) || undefined : undefined;
}

export function toTeacherOpsAssignmentSubmissionAttempt(
  record: TeacherOpsAssignmentSubmissionAttemptProjectionRecord
): AssignmentSubmissionAttempt {
  const imageUrl = teacherOpsAssignmentMediaObjectUrlFromKey(record.image_object_key);
  return {
    id: record.id,
    submissionId: record.submission_id,
    studentId: record.student_id,
    attemptNumber: record.attempt_number,
    kind: record.kind,
    inputType: record.input_type,
    answerText: record.answer_text,
    imageDataUrl: imageUrl ?? record.image_data_url,
    imageObjectKey: normalizeTeacherOpsAssignmentMediaObjectKey(record.image_object_key),
    imageUrl,
    imageFileName: record.image_file_name,
    ocrResult: record.ocr_result,
    submittedAt: record.submitted_at
  };
}

export function toTeacherOpsAssignmentGradingRun(record: TeacherOpsAssignmentGradingRunProjectionRecord): AssignmentGradingRun {
  const feedback = record.feedback_en || record.feedback_zh
    ? { en: record.feedback_en ?? "", zh: record.feedback_zh ?? record.feedback_en ?? "" }
    : null;
  const correctionRequest = record.correction_request_en || record.correction_request_zh
    ? { en: record.correction_request_en ?? "", zh: record.correction_request_zh ?? record.correction_request_en ?? "" }
    : null;
  return {
    id: record.id,
    submissionId: record.submission_id,
    attemptId: record.attempt_id,
    status: record.status,
    provider: record.provider,
    model: record.model,
    suggestedScore: record.suggested_score,
    confidence: record.confidence,
    feedback,
    correctionRequest,
    errorCode: record.error_code,
    usage: record.usage,
    createdAt: record.created_at
  };
}

export function toTeacherOpsAssignmentTeacherReview(
  database: { users: Array<{ id: string; username?: string }> },
  record: TeacherOpsAssignmentTeacherReviewProjectionRecord
): AssignmentTeacherReview {
  const reviewer = database.users.find((user) => user.id === record.reviewed_by);
  const feedback = record.feedback_en || record.feedback_zh
    ? { en: record.feedback_en ?? "", zh: record.feedback_zh ?? record.feedback_en ?? "" }
    : null;
  const correctionRequest = record.correction_request_en || record.correction_request_zh
    ? { en: record.correction_request_en ?? "", zh: record.correction_request_zh ?? record.correction_request_en ?? "" }
    : null;
  return {
    id: record.id,
    submissionId: record.submission_id,
    action: record.action,
    finalScore: record.final_score,
    feedback,
    correctionRequest,
    correctionDueAt: record.correction_due_at ?? null,
    reviewedBy: record.reviewed_by,
    reviewerName: reviewer?.username ?? "Teacher",
    createdAt: record.created_at
  };
}

export function toTeacherOpsAssignmentSubmission(
  database: {
    assignment_grading_runs: TeacherOpsAssignmentGradingRunProjectionRecord[];
    assignment_submission_attempts: TeacherOpsAssignmentSubmissionAttemptProjectionRecord[];
    assignment_teacher_reviews: TeacherOpsAssignmentTeacherReviewProjectionRecord[];
    student_profiles: TeacherOpsAssignmentStudentProfileRecord[];
    users: Array<{ id: string; username?: string }>;
  },
  record: TeacherOpsAssignmentSubmissionRecord
): Submission {
  const profile = database.student_profiles.find((candidate) => candidate.user_id === record.student_id);
  const attempts = database.assignment_submission_attempts
    .filter((attempt) => attempt.submission_id === record.id)
    .sort((a, b) => a.attempt_number - b.attempt_number)
    .map(toTeacherOpsAssignmentSubmissionAttempt);
  const gradingRuns = database.assignment_grading_runs
    .filter((run) => run.submission_id === record.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toTeacherOpsAssignmentGradingRun);
  const latestTeacherReviewRecord = latestTeacherOpsAssignmentReviewRecord(database, record.id);
  const latestGradingRun = gradingRuns[0] ?? null;
  const latestTeacherReview = latestTeacherReviewRecord
    ? toTeacherOpsAssignmentTeacherReview(database, latestTeacherReviewRecord)
    : null;
  const correctionRequest = latestTeacherReview?.correctionRequest ?? latestGradingRun?.correctionRequest ?? null;

  return {
    id: record.id,
    assignmentId: record.assignment_id,
    studentId: record.student_id,
    studentName: profile?.name ?? "Unknown student",
    status: record.status,
    score: record.score,
    submittedAt: record.submitted_at,
    gradedAt: record.graded_at,
    feedback:
      record.feedback_en || record.feedback_zh
        ? {
            en: record.feedback_en ?? "",
            zh: record.feedback_zh ?? record.feedback_en ?? ""
          }
        : null,
    correctionRequest,
    correctionDueAt: latestTeacherReview?.correctionDueAt ?? null,
    correctionRound: attempts.filter((attempt) => attempt.kind === "correction").length,
    maxCorrectionRounds: 2,
    resolvedAt: record.status === "resolved" ? record.graded_at ?? record.submitted_at ?? record.updated_at : null,
    attempts,
    latestAttempt: attempts.length ? attempts[attempts.length - 1] : null,
    latestGradingRun,
    latestTeacherReview,
    updatedAt: record.updated_at
  };
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function createTeacherOpsAssignmentPersistenceStore({
  createId = randomUUID,
  now = () => new Date(),
  readDatabase,
  mutateDatabase,
  toAssignment,
  toTeacherClass,
  toSubmission
}: TeacherOpsAssignmentPersistenceStoreDependencies) {
  const runMutation = async <T>(mutator: (database: TeacherOpsAssignmentPersistenceDatabase) => T | Promise<T>) => {
    if (!mutateDatabase) {
      throw new Error("Teacher assignment persistence mutation dependency is not configured.");
    }
    return mutateDatabase(mutator);
  };

  const store = {
    async getTeacherAssignments(userId: string): Promise<Assignment[] | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
      return database.assignments
        .filter((assignment) => classIds.has(assignment.class_id))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((assignment) => toAssignment(database, assignment));
    },
    async createTeacherAssignment({
      teacherId,
      classId,
      studentIds,
      title,
      description,
      contentType,
      targetId,
      dueAt,
      allowRetake,
      showAnswers,
      countTowardsGrade,
      language
    }: {
      teacherId: string;
      classId: string;
      studentIds?: string[];
      title: string;
      description: string;
      contentType: AssignmentContentType;
      targetId?: string;
      dueAt?: string | null;
      allowRetake: boolean;
      showAnswers: boolean;
      countTowardsGrade: boolean;
      language?: Language;
    }) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return { status: "invalid" as const };
      const trimmedDescription = description.trim();
      const inputLanguage = assignmentInputLanguage(trimmedTitle, trimmedDescription, language);
      const fallback = assignmentFallbackCopy[contentType];
      const localizedTitle = localizedAssignmentField(trimmedTitle, inputLanguage, fallback.title);
      const localizedDescription = localizedAssignmentField(trimmedDescription, inputLanguage, fallback.description);

      return runMutation((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const teacherClass = teacherCanAccessClass(database, user, classId);
        if (!teacherClass) return { status: "not-found" as const };

        const enrolledStudentIds = teacherStudentIdsForClass(database, classId);
        const selectedStudentIds = studentIds?.length
          ? studentIds.filter((studentId) => enrolledStudentIds.includes(studentId))
          : enrolledStudentIds;
        if (!selectedStudentIds.length) return { status: "no-students" as const };

        const createdAt = now().toISOString();
        const assignmentId = `assignment-${createId()}`;
        const assignment: TeacherOpsAssignmentRecord = {
          id: assignmentId,
          class_id: classId,
          title_en: localizedTitle.en,
          title_zh: localizedTitle.zh,
          title_zh_hans: localizedTitle.zhHans,
          description_en: localizedDescription.en,
          description_zh: localizedDescription.zh,
          description_zh_hans: localizedDescription.zhHans,
          content_type: contentType,
          target_id: targetId?.trim() || undefined,
          status: "active",
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          allow_retake: allowRetake,
          show_answers: showAnswers,
          count_towards_grade: countTowardsGrade,
          created_by: user.id,
          created_at: createdAt,
          updated_at: createdAt
        };

        database.assignments.unshift(assignment);
        database.submissions ??= [];
        selectedStudentIds.forEach((studentId) => {
          database.submissions?.push({
            id: `submission-${createId()}`,
            assignment_id: assignmentId,
            student_id: studentId,
            status: "not-started",
            score: null,
            submitted_at: null,
            graded_at: null,
            feedback_en: "",
            feedback_zh: "",
            updated_at: createdAt
          });
        });

        return { status: "created" as const, assignment: toAssignment(database, assignment) };
      });
    },
    async createTeacherAnalyticsFollowUpAssignment({
      teacherId,
      classId,
      studentIds,
      title,
      description,
      targetId
    }: {
      teacherId: string;
      classId: string;
      studentIds: string[];
      title: string;
      description: string;
      targetId?: string;
    }) {
      const dueAt = new Date(now().getTime() + 7 * dayMs).toISOString();
      return store.createTeacherAssignment({
        teacherId,
        classId,
        studentIds,
        title,
        description,
        contentType: "practice",
        targetId,
        dueAt,
        allowRetake: true,
        showAnswers: false,
        countTowardsGrade: false
      });
    },
    async deleteTeacherAssignment({
      teacherId,
      assignmentId
    }: {
      teacherId: string;
      assignmentId: string;
    }) {
      const cleanAssignmentId = assignmentId.trim();
      if (!cleanAssignmentId) return { status: "invalid" as const };

      return runMutation((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const assignment = database.assignments.find((candidate) => candidate.id === cleanAssignmentId);
        if (!assignment || !teacherCanAccessClass(database, user, assignment.class_id)) {
          return { status: "not-found" as const };
        }

        const submissionIds = new Set(
          (database.submissions ?? [])
            .filter((submission) => submission.assignment_id === cleanAssignmentId)
            .map((submission) => submission.id)
        );
        const attemptIds = new Set(
          (database.assignment_submission_attempts ?? [])
            .filter((attempt) => submissionIds.has(attempt.submission_id))
            .map((attempt) => attempt.id)
        );
        const deletedAssignmentIds = new Set(database.deleted_assignment_ids ?? []);
        deletedAssignmentIds.add(cleanAssignmentId);

        database.deleted_assignment_ids = Array.from(deletedAssignmentIds);
        database.assignments = database.assignments.filter((candidate) => candidate.id !== cleanAssignmentId);
        database.submissions = (database.submissions ?? []).filter((submission) => submission.assignment_id !== cleanAssignmentId);
        database.assignment_submission_attempts = (database.assignment_submission_attempts ?? []).filter(
          (attempt) => !submissionIds.has(attempt.submission_id)
        );
        database.assignment_grading_runs = (database.assignment_grading_runs ?? []).filter((run) =>
          !submissionIds.has(run.submission_id) && (!run.attempt_id || !attemptIds.has(run.attempt_id))
        );
        database.assignment_teacher_reviews = (database.assignment_teacher_reviews ?? []).filter(
          (review) => !submissionIds.has(review.submission_id)
        );
        database.teacher_reminder_runs = (database.teacher_reminder_runs ?? []).filter((run) => run.assignment_id !== cleanAssignmentId);
        database.teacher_messages = (database.teacher_messages ?? []).map((message) =>
          message.assignment_id === cleanAssignmentId ? { ...message, assignment_id: undefined } : message
        );
        database.teacher_notices = (database.teacher_notices ?? []).map((notice) =>
          notice.assignment_id === cleanAssignmentId ? { ...notice, assignment_id: undefined } : notice
        );
        const updatedAt = now().toISOString();
        database.teacher_lesson_kits = (database.teacher_lesson_kits ?? []).map((kit) =>
          kit.assignment_id === cleanAssignmentId ? { ...kit, assignment_id: undefined, updated_at: updatedAt } : kit
        );

        return {
          status: "deleted" as const,
          assignmentId: cleanAssignmentId,
          deletedSubmissionCount: submissionIds.size
        };
      });
    },
    async getTeacherAssignmentDetailData(
      userId: string,
      assignmentId: string
    ): Promise<TeacherAssignmentDetailData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const assignment = database.assignments.find((candidate) => candidate.id === assignmentId);
      const teacherClass = assignment ? teacherCanAccessClass(database, user, assignment.class_id) : null;
      if (!assignment || !teacherClass) return null;

      const submissionRecords = (database.submissions ?? [])
        .filter((submission) => submission.assignment_id === assignmentId)
        .sort((a, b) => {
          const aName = database.student_profiles?.find((profile) => profile.user_id === a.student_id)?.name ?? "";
          const bName = database.student_profiles?.find((profile) => profile.user_id === b.student_id)?.name ?? "";
          return aName.localeCompare(bName);
        });
      const submissions = submissionRecords.map((submission) => toSubmission(database, submission));

      return {
        assignment: toAssignment(database, assignment),
        class: toTeacherClass(database, teacherClass),
        submissions,
        completionRate: percent(submissionRecords.filter(isTeacherOpsSubmissionComplete).length, submissionRecords.length),
        gradingSummary: {
          pendingGrading: submissionRecords.filter(teacherOpsSubmissionNeedsTeacherGrading).length,
          correctionRequired: submissionRecords.filter((submission) => submission.status === "correction-required").length,
          correctionSubmitted: submissionRecords.filter((submission) => submission.status === "correction-submitted").length,
          resolved: submissionRecords.filter((submission) => submission.status === "resolved" || submission.status === "graded").length
        }
      };
    }
  };

  return store;
}
