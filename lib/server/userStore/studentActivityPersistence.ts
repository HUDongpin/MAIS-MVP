import { createHash, randomUUID } from "crypto";
import { readFile } from "node:fs/promises";
import { topics as seedTopics } from "@/data/topics";
import {
  contentMatchesCurriculumProfile,
  curriculumTrackForProfile,
  curriculumProfileForTrack,
  normalizeStoredCurriculumProfile
} from "@/lib/curriculumProfile";
import { difficultyMatchesActiveFilter, mapDifficultyToActive } from "@/lib/difficulty";
import { lessonHrefForSlug } from "@/lib/lessonLinks";
import { analyticsWindowDays, exportLearningAnalyticsSummary, summarizeLearningAnalytics } from "@/lib/learningAnalytics";
import { isSafeMediaObjectKey, mediaObjectAccessUrl } from "@/lib/server/mediaObjectStore";
import { normalizeAssessmentAnalysisSettings } from "@/lib/teacherAssessmentAnalysis";
import type {
  Assessment,
  AssessmentAnalysisSettings,
  Assignment,
  AssignmentGradingRun,
  AssignmentGradingRunStatus,
  AssignmentOcrAlternative,
  AssignmentOcrProvider,
  AssessmentPaperItem,
  AttemptFeedback,
  AssignmentStatus,
  AssignmentSubmissionAttempt,
  AssignmentSubmissionAttemptKind,
  AssignmentSubmissionInputType,
  AssignmentSubmissionOcrResult,
  AssignmentTeacherReview,
  AssignmentTeacherReviewAction,
  AssessmentSubmission,
  AssessmentSubmissionAnswer,
  AssessmentSubmissionStatus,
  AssessmentPaperItemSource,
  AssessmentPaperSection,
  AdaptiveLearningDecision,
  AdaptiveSkillState,
  AdaptiveLLMStatus,
  CurriculumProfile,
  CurriculumRegion,
  CurriculumTrack,
  DashboardData,
  Difficulty,
  GradeId,
  AssignmentContentType,
  LessonBlock,
  LessonBlockType,
  LessonEntryTarget,
  LessonDetail,
  LessonSummary,
  LearningAnalyticsEvent,
  LearningAnalyticsExportSummary,
  LearningAnalyticsSummary,
  LocalizedText,
  MistakeBookItem,
  ParentMessageCategory,
  ProgressData,
  PublicQuestion,
  QuestionAsset,
  QuestionDiagram,
  QuestionType,
  RecentActivityItem,
  RoadmapData,
  StudentAssessmentDetailData,
  StudentAssessmentQuestion,
  StudentAssessmentQuestionSection,
  StudentAssignmentItem,
  StudentMessagesData,
  StudentMessageThread,
  StudentResourceDetailData,
  Submission,
  SubmissionStatus,
  TeacherClass,
  TeacherMessage,
  TeacherMessageAttachment,
  TeacherMessageEntry,
  TeacherMessagePriority,
  TeacherMessageSenderRole,
  TeacherMessageStatus,
  TeachingResource,
  TeachingResourceType,
  TextbookPublisher,
  Topic,
  TopicStatus
} from "@/types";

type StudentActivityCurriculumScope = CurriculumTrack | CurriculumProfile | null | undefined;

type StudentActivityUpdateLessonProgressInput = {
  userId: string;
  slug: string;
  action: "start" | "update" | "complete";
  durationSeconds?: number;
  checklistState?: Record<string, boolean>;
  curriculumTrack?: StudentActivityCurriculumScope;
};

export type StudentActivityAdaptiveLearningInput = {
  userId: string;
  grade: GradeId;
  topicId?: string | null;
  curriculumTrack?: StudentActivityCurriculumScope;
};

export type StudentActivityAdaptiveRefreshResult = {
  status: AdaptiveLLMStatus;
  decision: AdaptiveLearningDecision | null;
  error?: string;
  reason?: "content-unavailable";
  contentUnavailable?: LocalizedText;
};

type LearningEventRecord = {
  id: string;
  user_id: string;
  type: LearningAnalyticsEvent["type"];
  source: LearningAnalyticsEvent["source"];
  grade: GradeId;
  topic_id: string;
  question_id?: string;
  duration_seconds?: number;
  created_at: string;
};

type LearningEventClearRecord = {
  user_id: string;
  cleared_at: string;
};

type VisualizationEventRecord = {
  id: string;
  user_id: string;
  topic_id: string;
  source: string;
  created_at: string;
};

type VisualizationSessionRecord = {
  user_id: string;
  module_id: string;
  topic_id: string;
  source: LearningAnalyticsEvent["source"];
  explored: boolean;
  completed_at: string | null;
  updated_at: string;
};

type MistakeRecordRow = {
  user_id: string;
  question_id: string;
  last_selected_answer: string;
  correct_answer: string;
  wrong_attempts: number;
  first_wrong_at: string;
  last_attempt_at: string;
  mastered: boolean;
};

type StudentActivityAttemptRecord = {
  id: string;
  user_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  duration_seconds: number | null;
  created_at: string;
};

type QuestionRecord = {
  id: string;
  curriculum_track: CurriculumTrack;
  curriculum_region?: CurriculumRegion;
  textbook_publisher?: TextbookPublisher;
  canonical_topic_id?: string;
  grade: GradeId;
  topic_id: string;
  topic_title_en?: string;
  topic_title_zh?: string;
  difficulty: Difficulty;
  type: QuestionType;
  prompt_en: string;
  prompt_zh: string;
  options: LocalizedText[] | null;
  answer: string;
  accepted_answers?: string[] | null;
  explanation_en: string;
  explanation_zh: string;
  diagram?: QuestionDiagram | null;
  question_assets?: QuestionAsset[] | null;
};

type TopicRecord = {
  id: string;
  curriculum_track: CurriculumTrack;
  curriculum_region?: CurriculumRegion;
  textbook_publisher?: TextbookPublisher;
  canonical_topic_id?: string;
  grade: GradeId;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  difficulty: Difficulty;
  minutes: number;
  sort_order: number;
};

export type StudentActivityLessonRecord = {
  slug: string;
  topic_id: string;
  canonical_topic_id?: string;
  curriculum_region?: CurriculumRegion;
  textbook_publisher?: TextbookPublisher;
  grade: GradeId;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  difficulty: Difficulty;
  estimated_minutes: number;
};

type StudentActivityLessonBlockRecord = {
  id: string;
  lesson_slug: string;
  type: LessonBlockType;
  title_en: string;
  title_zh: string;
  content_en?: string;
  content_zh?: string;
  items?: LocalizedText[];
  visualization_config?: LessonBlock["visualizationConfig"];
  practice_question_ids?: string[];
  sort_order: number;
};

export type StudentActivityLessonProgressRecord = {
  user_id: string;
  topic_id: string;
  lesson_slug?: string;
  status: TopicStatus;
  mastery: number;
  started_at?: string | null;
  completed_at: string | null;
  duration_seconds?: number | null;
  checklist_state?: Record<string, boolean>;
  updated_at: string;
};

type StudentActivityLessonProgressSeedTopic = {
  id: string;
  status: TopicStatus;
  mastery: number;
};

export type StudentActivityLessonProgressNormalizationOptions = {
  demoUserId: string;
  lessonSlugForTopic: (topicId: string) => string;
  seedTopics: StudentActivityLessonProgressSeedTopic[];
};

export type StudentActivityAdaptiveSkillStateRecord = {
  user_id: string;
  skill_id: string;
  p_mastery: number;
  attempt_count: number;
  correct_streak: number;
  wrong_streak: number;
  last_practiced_at: string | null;
  next_review_at: string | null;
  hint_count: number;
  misconception_tags: string[];
  updated_at: string;
};

export function studentActivityAdaptiveSkillStateFromRecord(
  record: StudentActivityAdaptiveSkillStateRecord
): AdaptiveSkillState {
  return {
    skillId: record.skill_id,
    pMastery: record.p_mastery,
    attemptCount: record.attempt_count,
    correctStreak: record.correct_streak,
    wrongStreak: record.wrong_streak,
    lastPracticedAt: record.last_practiced_at,
    nextReviewAt: record.next_review_at,
    hintCount: record.hint_count,
    misconceptionTags: record.misconception_tags,
    updatedAt: record.updated_at
  };
}

export function studentActivityAdaptiveSkillStateToRecord(
  userId: string,
  state: AdaptiveSkillState
): StudentActivityAdaptiveSkillStateRecord {
  return {
    user_id: userId,
    skill_id: state.skillId,
    p_mastery: state.pMastery,
    attempt_count: state.attemptCount,
    correct_streak: state.correctStreak,
    wrong_streak: state.wrongStreak,
    last_practiced_at: state.lastPracticedAt,
    next_review_at: state.nextReviewAt,
    hint_count: state.hintCount,
    misconception_tags: state.misconceptionTags,
    updated_at: state.updatedAt
  };
}

type StudentActivityAssignmentRecord = {
  id: string;
  class_id: string;
  title_en?: string;
  title_zh?: string;
  title_zh_hans?: string;
  description_en?: string;
  description_zh?: string;
  description_zh_hans?: string;
  content_type: AssignmentContentType;
  target_id?: string;
  status?: AssignmentStatus;
  due_at?: string | null;
  allow_retake?: boolean;
  show_answers?: boolean;
  count_towards_grade?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

type StudentActivitySubmissionRecord = {
  id?: string;
  assignment_id: string;
  student_id: string;
  status?: SubmissionStatus;
  score?: number | null;
  submitted_at?: string | null;
  graded_at?: string | null;
  feedback_en?: string;
  feedback_zh?: string;
  updated_at?: string;
};

type StudentActivityAssignmentSubmissionAttemptRecord = {
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

type StudentActivityAssignmentGradingRunRecord = {
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

type StudentActivityAssignmentTeacherReviewRecord = {
  id: string;
  submission_id: string;
  action: AssignmentTeacherReviewAction;
  final_score: number | null;
  feedback_en?: string;
  feedback_zh?: string;
  correction_request_en?: string;
  correction_request_zh?: string;
  correction_due_at: string | null;
  reviewed_by: string;
  created_at: string;
};

type StudentActivityClassEnrollmentRecord = {
  id?: string;
  class_id: string;
  student_id: string;
  joined_at?: string;
};

type StudentActivityUserRecord = {
  id: string;
  username?: string;
};

type StudentActivityStudentProfileRecord = {
  user_id: string;
  name?: string;
  grade?: GradeId;
};

type StudentActivityAssessmentRecord = {
  id?: string;
  class_id: string;
  title_en?: string;
  title_zh?: string;
  type?: Assessment["type"];
  status?: Assessment["status"];
  source_type?: Assessment["sourceType"];
  max_attempts?: number;
  show_answers_immediately?: boolean;
  source_resource_id?: string;
  analysis_settings?: Partial<AssessmentAnalysisSettings> | null;
  exam_group_id?: string;
  exam_group_name_en?: string;
  exam_group_name_zh?: string;
  question_ids?: string[];
  manual_questions?: Assessment["manualQuestions"];
  paper_sections?: AssessmentPaperSection[];
  opens_at?: string | null;
  closes_at?: string | null;
  time_limit_minutes?: number | null;
  randomize_question_order?: boolean;
  grade_weight?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

type StudentActivityAssessmentSubmissionRecord = {
  id: string;
  assessment_id: string;
  student_id: string;
  status: AssessmentSubmissionStatus;
  attempt_number: number;
  score: number | null;
  max_score: number;
  submitted_at: string | null;
  graded_at: string | null;
  answers: AssessmentSubmissionAnswer[];
  updated_at: string;
};

type StudentActivityTeachingResourceRecord = {
  id: string;
  title_en: string;
  title_zh: string;
  type: TeachingResourceType;
  file_name: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path?: string;
  grade: GradeId;
  topic_id?: string;
  difficulty?: Difficulty;
  uploaded_by: string;
  created_at: string;
};

type StudentActivityTeacherClassRecord = {
  id: string;
  teacher_id?: string;
  school_id?: string;
  class_code?: string;
  name: string;
  grade: GradeId;
  curriculum_track?: CurriculumTrack | null;
  curriculum_region?: CurriculumRegion | null;
  textbook_publisher?: TextbookPublisher | null;
  academic_year?: string;
  description_en?: string;
  description_zh?: string;
  invite_code?: string;
  created_at?: string;
  updated_at?: string;
};

type StudentActivityTeacherMessageRecord = {
  id: string;
  class_id?: string;
  student_id: string;
  teacher_id: string;
  guardian_id?: string;
  assignment_id?: string;
  topic_id?: string;
  report_id?: string;
  parent_category?: ParentMessageCategory;
  subject_en: string;
  subject_zh: string;
  latest_message: string;
  status: TeacherMessageStatus;
  priority: TeacherMessagePriority;
  starred: boolean;
  last_message_at: string;
  created_at: string;
};

type StudentActivityTeacherMessageEntryRecord = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: TeacherMessageSenderRole;
  recipient_id: string;
  body: string;
  attachments: TeacherMessageAttachment[];
  created_at: string;
};

type StudentActivityAiTutorMessageRecord = {
  user_id: string;
  created_at: string;
};

export type StudentActivityResourceDownloadData = {
  resource: TeachingResource;
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

export type StudentAssessmentSubmitResult =
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "closed" }
  | { status: "max-attempts" }
  | { status: "submitted"; submission: AssessmentSubmission; assessment: Assessment };

export type StudentAssignmentWorkSubmitResult =
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "closed" }
  | { status: "invalid-state" }
  | { status: "max-corrections" }
  | { status: "submitted"; submission: Submission };

export type StudentActivityPersistenceDatabase = {
  adaptive_skill_state?: StudentActivityAdaptiveSkillStateRecord[];
  assessments?: StudentActivityAssessmentRecord[];
  assessment_submissions?: StudentActivityAssessmentSubmissionRecord[];
  assignment_grading_runs?: StudentActivityAssignmentGradingRunRecord[];
  assignment_submission_attempts?: StudentActivityAssignmentSubmissionAttemptRecord[];
  assignment_teacher_reviews?: StudentActivityAssignmentTeacherReviewRecord[];
  assignments?: StudentActivityAssignmentRecord[];
  attempts?: StudentActivityAttemptRecord[];
  class_enrollments?: StudentActivityClassEnrollmentRecord[];
  learning_events?: LearningEventRecord[];
  learning_event_clears?: LearningEventClearRecord[];
  lesson_blocks?: StudentActivityLessonBlockRecord[];
  lesson_progress?: StudentActivityLessonProgressRecord[];
  lessons?: StudentActivityLessonRecord[];
  mistakes?: MistakeRecordRow[];
  questions?: QuestionRecord[];
  student_profiles?: StudentActivityStudentProfileRecord[];
  ai_tutor_messages?: StudentActivityAiTutorMessageRecord[];
  submissions?: StudentActivitySubmissionRecord[];
  teacher_classes?: StudentActivityTeacherClassRecord[];
  teacher_message_entries?: StudentActivityTeacherMessageEntryRecord[];
  teacher_messages?: StudentActivityTeacherMessageRecord[];
  teaching_resources?: StudentActivityTeachingResourceRecord[];
  topics?: TopicRecord[];
  users?: StudentActivityUserRecord[];
  visualization_events?: VisualizationEventRecord[];
  visualization_sessions: VisualizationSessionRecord[];
};

export type StudentActivityMatchingAssignmentCompletionInput = {
  database: StudentActivityPersistenceDatabase;
  userId: string;
  contentType: AssignmentContentType;
  targetIds: string[];
  now: string;
  score?: number | null;
  graded?: boolean;
  feedbackEn: string;
  feedbackZh: string;
};

type StudentActivityUpdateProgressFromAttemptsQuestion = {
  topic_id: string;
};

export type StudentActivityUpdateLessonProgressFromAttemptsInput = {
  database: StudentActivityPersistenceDatabase;
  userId: string;
  question: StudentActivityUpdateProgressFromAttemptsQuestion;
  now: string;
  lessonSlugForTopic: (topicId: string) => string;
  questionForId: (questionId: string) => StudentActivityUpdateProgressFromAttemptsQuestion | null | undefined;
};

function studentActivityClassIds(database: StudentActivityPersistenceDatabase, userId: string) {
  return new Set(
    (database.class_enrollments ?? [])
      .filter((enrollment) => enrollment.student_id === userId)
      .map((enrollment) => enrollment.class_id)
  );
}

function completeStudentActivityAssignmentSubmission({
  database,
  userId,
  assignment,
  now,
  score,
  graded,
  feedbackEn,
  feedbackZh
}: {
  database: StudentActivityPersistenceDatabase;
  userId: string;
  assignment: StudentActivityAssignmentRecord;
  now: string;
  score?: number | null;
  graded?: boolean;
  feedbackEn: string;
  feedbackZh: string;
}) {
  const submission = (database.submissions ?? []).find(
    (candidate) => candidate.assignment_id === assignment.id && candidate.student_id === userId
  );
  if (!submission) return;

  const nextScore = typeof score === "number" ? Math.max(0, Math.min(100, Math.round(score))) : score;
  submission.status = graded ? "graded" : "submitted";
  submission.score = typeof nextScore === "number" || nextScore === null ? nextScore : submission.score;
  submission.submitted_at = submission.submitted_at ?? now;
  submission.graded_at = graded ? now : submission.graded_at;
  submission.feedback_en = feedbackEn;
  submission.feedback_zh = feedbackZh;
  submission.updated_at = now;
}

export function completeStudentActivityMatchingAssignments({
  database,
  userId,
  contentType,
  targetIds,
  now,
  score,
  graded,
  feedbackEn,
  feedbackZh
}: StudentActivityMatchingAssignmentCompletionInput) {
  const classIds = studentActivityClassIds(database, userId);
  if (!classIds.size) return;
  const targetSet = new Set(targetIds.filter(Boolean));

  (database.assignments ?? [])
    .filter((assignment) => {
      if (!classIds.has(assignment.class_id) || assignment.content_type !== contentType || assignment.status !== "active") {
        return false;
      }
      return !assignment.target_id || targetSet.has(assignment.target_id);
    })
    .forEach((assignment) => {
      completeStudentActivityAssignmentSubmission({
        database,
        userId,
        assignment,
        now,
        score,
        graded,
        feedbackEn,
        feedbackZh
      });
    });
}

export function studentActivityUpdateLessonProgressFromAttempts({
  database,
  userId,
  question,
  now,
  lessonSlugForTopic,
  questionForId
}: StudentActivityUpdateLessonProgressFromAttemptsInput) {
  const topicAttempts = (database.attempts ?? []).filter((attempt) => {
    const attemptedQuestion = questionForId(attempt.question_id);
    return attempt.user_id === userId && attemptedQuestion?.topic_id === question.topic_id;
  });
  if (!topicAttempts.length) return;

  const correctAttempts = topicAttempts.filter((attempt) => attempt.is_correct).length;
  const accuracy = correctAttempts / topicAttempts.length;
  const mastery = Math.min(100, Math.round(accuracy * 85 + Math.min(15, topicAttempts.length * 3)));
  const status: TopicStatus = mastery >= 75 ? "completed" : "in-progress";
  const progressRecords = database.lesson_progress ??= [];
  const existing = progressRecords.find(
    (progress) => progress.user_id === userId && progress.topic_id === question.topic_id
  );

  if (existing) {
    existing.lesson_slug = existing.lesson_slug ?? lessonSlugForTopic(question.topic_id);
    existing.mastery = mastery;
    existing.status = status;
    existing.started_at = existing.started_at ?? now;
    existing.completed_at = status === "completed" ? existing.completed_at ?? now : null;
    existing.duration_seconds = existing.duration_seconds ?? null;
    existing.checklist_state = existing.checklist_state ?? {};
    existing.updated_at = now;
    return;
  }

  progressRecords.push({
    user_id: userId,
    topic_id: question.topic_id,
    lesson_slug: lessonSlugForTopic(question.topic_id),
    status,
    mastery,
    started_at: now,
    completed_at: status === "completed" ? now : null,
    duration_seconds: null,
    checklist_state: {},
    updated_at: now
  });
}

export type StudentActivityPersistenceStoreDependencies = {
  createId?: () => string;
  contentUnavailableForProfile?: (profile: CurriculumProfile, grade?: GradeId) => LocalizedText | null;
  dashboardContentUnavailableForProfile?: (profile: CurriculumProfile, grade?: GradeId) => LocalizedText | null;
  defaultCurriculumTrack?: CurriculumTrack;
  now?: () => Date;
  translateLessonTextEn?: (value: string) => string;
  readDatabase: () => Promise<StudentActivityPersistenceDatabase>;
  readPublicDatabase?: () => StudentActivityPersistenceDatabase | Promise<StudentActivityPersistenceDatabase>;
  getFastDashboardData?: (
    userId: string,
    grade: GradeId,
    curriculumTrack?: StudentActivityCurriculumScope
  ) => Promise<DashboardData | null | undefined>;
  getFastLessonEntryTarget?: (
    userId: string,
    grade: GradeId,
    curriculumTrack?: StudentActivityCurriculumScope
  ) => Promise<LessonEntryTarget | null | undefined>;
  logLessonEntryTargetPerf?: (label: string, startedAt: number) => void;
  nowMs?: () => number;
  mutateDatabase?: <T>(
    mutator: (database: StudentActivityPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  afterAppend?: (
    database: StudentActivityPersistenceDatabase,
    context: {
      userId: string;
      records: LearningEventRecord[];
      latestRecord: LearningEventRecord;
    }
  ) => void | Promise<void>;
  afterMarkMistakeMastered?: (
    database: StudentActivityPersistenceDatabase,
    context: {
      userId: string;
      questionId: string;
      question: QuestionRecord | null;
      topic: TopicRecord | null;
      masteredAt: string;
    }
  ) => void | Promise<void>;
  afterMarkVisualizationSession?: (
    database: StudentActivityPersistenceDatabase,
    context: {
      userId: string;
      moduleId: string;
      topicId: string;
      source: LearningAnalyticsEvent["source"];
      wasCompleted: boolean;
      completedAt: string;
      updatedAt: string;
      session: VisualizationSessionRecord;
    }
  ) => void | Promise<void>;
  afterMarkResourceViewed?: (
    database: StudentActivityPersistenceDatabase,
    context: {
      userId: string;
      resourceId: string;
      viewedAt: string;
      resource: StudentActivityTeachingResourceRecord;
    }
  ) => void | Promise<void>;
  afterSubmitAssessment?: (
    database: StudentActivityPersistenceDatabase,
    context: {
      userId: string;
      assessmentId: string;
      submittedAt: string;
      score: number;
      graded: true;
    }
  ) => void | Promise<void>;
  topicMatchesCurriculum?: (
    topic: TopicRecord,
    curriculumTrack: StudentActivityCurriculumScope
  ) => boolean;
  clearDatabaseCache?: (database: StudentActivityPersistenceDatabase) => void;
  afterUpdateLessonProgress?: (
    database: StudentActivityPersistenceDatabase,
    context: {
      userId: string;
      lesson: StudentActivityLessonRecord;
      progress: StudentActivityLessonProgressRecord;
      existingProgress: StudentActivityLessonProgressRecord | null;
      firstCompletion: boolean;
      updatedAt: string;
    }
  ) => void | Promise<void>;
  adaptiveLearningDecision?: (
    input: StudentActivityAdaptiveLearningInput
  ) => AdaptiveLearningDecision | null | Promise<AdaptiveLearningDecision | null>;
  refreshAdaptiveLearningRecommendation?: (
    input: StudentActivityAdaptiveLearningInput
  ) => StudentActivityAdaptiveRefreshResult | Promise<StudentActivityAdaptiveRefreshResult>;
  questionAnswerMatches?: (
    question: QuestionRecord,
    selectedAnswer: string
  ) => boolean;
  questionMatchesCurriculum?: (
    question: QuestionRecord,
    curriculumScope: StudentActivityCurriculumScope
  ) => boolean;
  afterSubmitQuestionAttempt?: (
    database: StudentActivityPersistenceDatabase,
    context: {
      userId: string;
      question: QuestionRecord;
      attempt: StudentActivityAttemptRecord;
      selectedAnswer: string;
      correct: boolean;
      now: string;
    }
  ) => void | Promise<void>;
};

export type StudentActivityPersistenceStore = ReturnType<typeof createStudentActivityPersistenceStore>;

type PublicQuestionFilters = Partial<{
  grade: GradeId;
  topicId: string;
  difficulty: Difficulty;
  curriculumTrack: CurriculumTrack;
  curriculumProfile: CurriculumProfile;
}>;

function windowDaysFrom(value?: string | null) {
  if (!value) return analyticsWindowDays;
  const match = /^(\d+)d$/.exec(value.trim());
  if (!match) return analyticsWindowDays;
  return Math.min(90, Math.max(1, Number(match[1])));
}

export function eventRecordToAnalyticsEvent(event: LearningEventRecord): LearningAnalyticsEvent {
  return {
    id: event.id,
    type: event.type,
    source: event.source,
    timestamp: event.created_at,
    grade: event.grade,
    topicId: event.topic_id,
    questionId: event.question_id,
    durationSeconds: event.duration_seconds
  };
}

function analyticsEventToRecord(
  userId: string,
  event: LearningAnalyticsEvent,
  createId: () => string
): LearningEventRecord {
  return {
    id: event.id || createId(),
    user_id: userId,
    type: event.type,
    source: event.source,
    grade: event.grade,
    topic_id: event.topicId,
    question_id: event.questionId,
    duration_seconds: event.durationSeconds,
    created_at: event.timestamp
  };
}

function isVisualizationEvent(type: string) {
  return type.startsWith("visualization-");
}

function learningEventsFor(database: StudentActivityPersistenceDatabase) {
  database.learning_events ??= [];
  return database.learning_events;
}

function learningEventClearsFor(database: StudentActivityPersistenceDatabase) {
  database.learning_event_clears ??= [];
  return database.learning_event_clears;
}

function visualizationEventsFor(database: StudentActivityPersistenceDatabase) {
  database.visualization_events ??= [];
  return database.visualization_events;
}

function visualizationSessionsFor(database: StudentActivityPersistenceDatabase) {
  database.visualization_sessions ??= [];
  return database.visualization_sessions;
}

function studentActivityTimestampOf(value?: string | null) {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

export function latestStudentActivityAt(database: StudentActivityPersistenceDatabase, studentId: string) {
  const timestamps = [
    ...(database.attempts ?? []).filter((attempt) => attempt.user_id === studentId).map((attempt) => attempt.created_at),
    ...(database.learning_events ?? []).filter((event) => event.user_id === studentId).map((event) => event.created_at),
    ...(database.visualization_sessions ?? []).filter((session) => session.user_id === studentId).map((session) => session.updated_at),
    ...(database.ai_tutor_messages ?? []).filter((message) => message.user_id === studentId).map((message) => message.created_at),
    ...(database.submissions ?? []).filter((submission) => submission.student_id === studentId).map((submission) => submission.updated_at)
  ]
    .map(studentActivityTimestampOf)
    .filter((time): time is number => time !== null);

  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}

export function studentAverageMastery(
  database: Pick<StudentActivityPersistenceDatabase, "lesson_progress">,
  studentId: string,
  topicIds: string[]
) {
  if (!topicIds.length) return 0;

  const masteryValues = topicIds.map((topicId) => {
    return (database.lesson_progress ?? []).find((progress) =>
      progress.user_id === studentId && progress.topic_id === topicId
    )?.mastery ?? 0;
  });

  return Math.round(masteryValues.reduce((sum, mastery) => sum + mastery, 0) / masteryValues.length);
}

function baselineStudentActivityLessonProgressRecord(
  userId: string,
  topic: StudentActivityLessonProgressSeedTopic,
  now: string,
  useSeedProgress: boolean,
  lessonSlugForTopic: StudentActivityLessonProgressNormalizationOptions["lessonSlugForTopic"]
): StudentActivityLessonProgressRecord {
  const status = useSeedProgress ? topic.status : "not-started";
  return {
    user_id: userId,
    topic_id: topic.id,
    lesson_slug: lessonSlugForTopic(topic.id),
    status,
    mastery: useSeedProgress ? topic.mastery : 0,
    started_at: status === "not-started" ? null : now,
    completed_at: status === "completed" ? now : null,
    duration_seconds: null,
    checklist_state: {},
    updated_at: now
  };
}

type StudentActivityLessonProgressSeedBuilderInput = {
  userId: string;
  now: string;
  lessonSlugForTopic: StudentActivityLessonProgressNormalizationOptions["lessonSlugForTopic"];
  seedTopics: StudentActivityLessonProgressSeedTopic[];
};

export function studentActivityEmptyLessonProgressRecords({
  userId,
  now,
  lessonSlugForTopic,
  seedTopics
}: StudentActivityLessonProgressSeedBuilderInput) {
  return seedTopics.map((topic) =>
    baselineStudentActivityLessonProgressRecord(userId, topic, now, false, lessonSlugForTopic)
  );
}

export function studentActivitySeedLessonProgressRecords({
  userId,
  now,
  lessonSlugForTopic,
  seedTopics
}: StudentActivityLessonProgressSeedBuilderInput) {
  return seedTopics.map((topic) =>
    baselineStudentActivityLessonProgressRecord(userId, topic, now, true, lessonSlugForTopic)
  );
}

export function normalizeStudentActivityAttemptRecords<Record extends StudentActivityAttemptRecord>(
  records?: Record[]
): Record[] {
  return records ?? [];
}

export function normalizeStudentActivityMistakeRecords<Record extends MistakeRecordRow>(
  records?: Record[]
): Record[] {
  return records ?? [];
}

export function normalizeStudentActivityLessonProgressRecords(
  existingRecords: StudentActivityLessonProgressRecord[] | undefined,
  profiles: Array<Pick<StudentActivityStudentProfileRecord, "user_id">>,
  now: string,
  { demoUserId, lessonSlugForTopic, seedTopics }: StudentActivityLessonProgressNormalizationOptions
) {
  const records: StudentActivityLessonProgressRecord[] = (existingRecords ?? []).map((progress) => ({
    ...progress,
    lesson_slug: progress.lesson_slug ?? lessonSlugForTopic(progress.topic_id),
    started_at: progress.started_at ?? (progress.status === "not-started" ? null : progress.updated_at),
    duration_seconds: progress.duration_seconds ?? null,
    checklist_state: progress.checklist_state ?? {}
  }));
  const recordKeys = new Set(records.map((progress) => `${progress.user_id}:${progress.topic_id}`));

  profiles.forEach((profile) => {
    seedTopics.forEach((topic) => {
      const key = `${profile.user_id}:${topic.id}`;
      if (recordKeys.has(key)) return;
      records.push(
        baselineStudentActivityLessonProgressRecord(
          profile.user_id,
          topic,
          now,
          profile.user_id === demoUserId,
          lessonSlugForTopic
        )
      );
      recordKeys.add(key);
    });
  });

  return records;
}

export function normalizeAdaptiveSkillStateRecords(
  existingRecords: StudentActivityAdaptiveSkillStateRecord[] | undefined,
  now: string
) {
  return (existingRecords ?? [])
    .filter((record) => typeof record.user_id === "string" && typeof record.skill_id === "string")
    .map((record) => ({
      user_id: record.user_id,
      skill_id: record.skill_id,
      p_mastery: typeof record.p_mastery === "number" && Number.isFinite(record.p_mastery) ? record.p_mastery : 0.35,
      attempt_count: typeof record.attempt_count === "number" && Number.isFinite(record.attempt_count) ? Math.max(0, Math.round(record.attempt_count)) : 0,
      correct_streak: typeof record.correct_streak === "number" && Number.isFinite(record.correct_streak) ? Math.max(0, Math.round(record.correct_streak)) : 0,
      wrong_streak: typeof record.wrong_streak === "number" && Number.isFinite(record.wrong_streak) ? Math.max(0, Math.round(record.wrong_streak)) : 0,
      last_practiced_at: typeof record.last_practiced_at === "string" ? record.last_practiced_at : null,
      next_review_at: typeof record.next_review_at === "string" ? record.next_review_at : null,
      hint_count: typeof record.hint_count === "number" && Number.isFinite(record.hint_count) ? Math.max(0, Math.round(record.hint_count)) : 0,
      misconception_tags: Array.isArray(record.misconception_tags) ? record.misconception_tags.filter((tag) => typeof tag === "string").slice(0, 8) : [],
      updated_at: typeof record.updated_at === "string" ? record.updated_at : now
    }));
}

function attemptRowsFor(database: StudentActivityPersistenceDatabase) {
  database.attempts ??= [];
  return database.attempts;
}

function assessmentSubmissionsFor(database: StudentActivityPersistenceDatabase) {
  database.assessment_submissions ??= [];
  return database.assessment_submissions;
}

function assignmentSubmissionAttemptsFor(database: StudentActivityPersistenceDatabase) {
  database.assignment_submission_attempts ??= [];
  return database.assignment_submission_attempts;
}

function mistakeRowsFor(database: StudentActivityPersistenceDatabase) {
  database.mistakes ??= [];
  return database.mistakes;
}

function questionForId(database: StudentActivityPersistenceDatabase, questionId: string) {
  return (database.questions ?? []).find((question) => question.id === questionId) ?? null;
}

function topicForId(database: StudentActivityPersistenceDatabase, topicId: string) {
  return (database.topics ?? []).find((topic) => topic.id === topicId) ?? null;
}

export function studentActivityQuestionRecordForId<TQuestion extends { id: string }>(
  database: { questions?: TQuestion[] },
  questionId: string
) {
  return new Map((database.questions ?? []).map((question) => [question.id, question])).get(questionId);
}

export function studentActivityTopicRecordForId<TTopic extends { id: string }>(
  database: { topics?: TTopic[] },
  topicId: string
) {
  return new Map((database.topics ?? []).map((topic) => [topic.id, topic])).get(topicId);
}

const seedTopicById = new Map(seedTopics.map((topic) => [topic.id, topic]));

function hasCjkText(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

function studentClassIds(database: StudentActivityPersistenceDatabase, userId: string) {
  return new Set(
    (database.class_enrollments ?? [])
      .filter((enrollment) => enrollment.student_id === userId)
      .map((enrollment) => enrollment.class_id)
  );
}

function studentActivityProfileFor(database: StudentActivityPersistenceDatabase, userId: string) {
  return (database.student_profiles ?? []).find((profile) => profile.user_id === userId) ?? null;
}

function studentHasResourceAssignment(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  resourceId: string
) {
  return (database.submissions ?? []).some((submission) => {
    if (submission.student_id !== userId) return false;
    const assignment = (database.assignments ?? []).find((candidate) => candidate.id === submission.assignment_id);
    return assignment?.content_type === "resource" && assignment.target_id === resourceId;
  });
}

function studentCanAccessResource(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  resourceId: string
) {
  if (studentHasResourceAssignment(database, userId, resourceId)) return true;
  const classIds = studentClassIds(database, userId);
  return (database.assessments ?? []).some(
    (assessment) => classIds.has(assessment.class_id) && assessment.source_resource_id === resourceId
  );
}

function isAssessmentSubmissionComplete(submission: StudentActivityAssessmentSubmissionRecord) {
  return submission.status === "submitted" || submission.status === "graded" || submission.status === "late";
}

const assignmentMaxAnswerTextLength = 12000;
const assignmentMaxImageDataUrlLength = 1_500_000;
const assignmentCorrectionMaxRounds = 2;

function cleanAssignmentText(value: string | undefined | null, maxLength = assignmentMaxAnswerTextLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanAssignmentImageDataUrl(value: string | undefined | null) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed.startsWith("data:image/")) return undefined;
  return trimmed.length <= assignmentMaxImageDataUrlLength ? trimmed : undefined;
}

function inferAssignmentInputType(
  answerText: string,
  imageDataUrl: string | undefined,
  requested?: AssignmentSubmissionInputType
) {
  if (requested && ["text", "image", "handwriting", "mixed"].includes(requested)) return requested;
  if (answerText && imageDataUrl) return "mixed";
  if (imageDataUrl) return "image";
  return "text";
}

function normalizeStoredMediaObjectKey(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed && isSafeMediaObjectKey(trimmed) ? trimmed : undefined;
}

function mediaObjectUrlFromKey(value: unknown) {
  const key = normalizeStoredMediaObjectKey(value);
  return key ? mediaObjectAccessUrl(key) || undefined : undefined;
}

export const studentActivityNormalizeStoredMediaObjectKey = normalizeStoredMediaObjectKey;
export const studentActivityMediaObjectUrlFromKey = mediaObjectUrlFromKey;

function normalizeAssignmentOcrProvider(value: unknown): AssignmentOcrProvider {
  return value === "simpletex" || value === "mathpix" || value === "llm-vision" || value === "local" || value === "none"
    ? value
    : "none";
}

function optionalLocalizedText(en?: string, zh?: string): LocalizedText | null {
  if (!en && !zh) return null;
  return {
    en: en ?? "",
    zh: zh ?? en ?? ""
  };
}

function isStudentActivitySubmissionComplete(submission: StudentActivitySubmissionRecord) {
  return (
    submission.status === "submitted" ||
    submission.status === "graded" ||
    submission.status === "late" ||
    submission.status === "correction-required" ||
    submission.status === "correction-submitted" ||
    submission.status === "resolved"
  );
}

function assignmentSubmissionCounts(database: StudentActivityPersistenceDatabase, assignmentId: string) {
  const submissions = (database.submissions ?? []).filter((submission) => submission.assignment_id === assignmentId);
  const completed = submissions.filter(isStudentActivitySubmissionComplete);

  return {
    submissionCount: submissions.length,
    completedCount: completed.length
  };
}

function teacherClassForDatabase(
  database: StudentActivityPersistenceDatabase,
  record: StudentActivityTeacherClassRecord
): TeacherClass {
  const studentCount = (database.class_enrollments ?? [])
    .filter((enrollment) => enrollment.class_id === record.id).length;
  const curriculumProfile = profileForRecord(record);
  const descriptionEn = record.description_en ?? record.name;
  const descriptionZh = record.description_zh ?? descriptionEn;

  return {
    id: record.id,
    teacherId: record.teacher_id ?? "",
    schoolId: record.school_id,
    classCode: record.class_code,
    name: record.name,
    grade: record.grade,
    curriculumTrack: curriculumTrackForProfile(curriculumProfile),
    curriculumProfile,
    academicYear: record.academic_year ?? "",
    description: {
      en: descriptionEn,
      zh: descriptionZh
    },
    studentCount,
    inviteCode: record.invite_code ?? "",
    createdAt: record.created_at ?? "",
    updatedAt: record.updated_at ?? ""
  };
}

function userDisplayNameFor(
  database: StudentActivityPersistenceDatabase,
  userId: string | undefined,
  fallback: string
) {
  if (!userId) return fallback;
  const profile = studentActivityProfileFor(database, userId);
  const user = (database.users ?? []).find((candidate) => candidate.id === userId);
  return profile?.name ?? user?.username ?? fallback;
}

function teacherMessageForDatabase(
  database: StudentActivityPersistenceDatabase,
  record: StudentActivityTeacherMessageRecord
): TeacherMessage {
  const guardianProfile = record.guardian_id ? studentActivityProfileFor(database, record.guardian_id) : null;
  const guardianUser = record.guardian_id
    ? (database.users ?? []).find((candidate) => candidate.id === record.guardian_id)
    : null;

  return {
    id: record.id,
    classId: record.class_id,
    studentId: record.student_id,
    studentName: userDisplayNameFor(database, record.student_id, "Unknown student"),
    teacherId: record.teacher_id,
    guardianId: record.guardian_id,
    guardianName: guardianProfile?.name ?? guardianUser?.username,
    assignmentId: record.assignment_id,
    topicId: record.topic_id,
    reportId: record.report_id,
    parentCategory: record.parent_category,
    subject: {
      en: record.subject_en,
      zh: record.subject_zh
    },
    latestMessage: record.latest_message,
    status: record.status,
    priority: record.priority,
    starred: record.starred,
    lastMessageAt: record.last_message_at,
    createdAt: record.created_at
  };
}

function teacherMessageEntryForDatabase(
  database: StudentActivityPersistenceDatabase,
  record: StudentActivityTeacherMessageEntryRecord
): TeacherMessageEntry {
  return {
    id: record.id,
    threadId: record.thread_id,
    senderId: record.sender_id,
    senderRole: record.sender_role,
    senderName: userDisplayNameFor(
      database,
      record.sender_id,
      record.sender_role === "teacher" ? "Teacher" : "Student"
    ),
    recipientId: record.recipient_id,
    body: record.body,
    attachments: record.attachments ?? [],
    createdAt: record.created_at
  };
}

function assignmentForDatabase(
  database: StudentActivityPersistenceDatabase,
  record: StudentActivityAssignmentRecord
): Assignment {
  const counts = assignmentSubmissionCounts(database, record.id);
  const titleEn = record.title_en ?? record.id;
  const titleZh = record.title_zh ?? titleEn;
  const descriptionEn = record.description_en ?? "";
  const descriptionZh = record.description_zh ?? descriptionEn;

  return {
    id: record.id,
    classId: record.class_id,
    title: {
      en: titleEn,
      zh: titleZh,
      zhHans: record.title_zh_hans ?? titleZh
    },
    description: {
      en: descriptionEn,
      zh: descriptionZh,
      zhHans: record.description_zh_hans ?? descriptionZh
    },
    contentType: record.content_type,
    targetId: record.target_id,
    status: record.status ?? "active",
    dueAt: record.due_at ?? null,
    allowRetake: record.allow_retake ?? false,
    showAnswers: record.show_answers ?? false,
    countTowardsGrade: record.count_towards_grade ?? false,
    createdBy: record.created_by ?? "",
    createdAt: record.created_at ?? "",
    updatedAt: record.updated_at ?? "",
    submissionCount: counts.submissionCount,
    completedCount: counts.completedCount
  };
}

function assignmentSubmissionAttemptForDatabase(
  record: StudentActivityAssignmentSubmissionAttemptRecord
): AssignmentSubmissionAttempt {
  const imageUrl = mediaObjectUrlFromKey(record.image_object_key);
  return {
    id: record.id,
    submissionId: record.submission_id,
    studentId: record.student_id,
    attemptNumber: record.attempt_number,
    kind: record.kind,
    inputType: record.input_type,
    answerText: record.answer_text,
    imageDataUrl: imageUrl ?? record.image_data_url,
    imageObjectKey: normalizeStoredMediaObjectKey(record.image_object_key),
    imageUrl,
    imageFileName: record.image_file_name,
    ocrResult: record.ocr_result,
    submittedAt: record.submitted_at
  };
}

function assignmentGradingRunForDatabase(record: StudentActivityAssignmentGradingRunRecord): AssignmentGradingRun {
  return {
    id: record.id,
    submissionId: record.submission_id,
    attemptId: record.attempt_id,
    status: record.status,
    provider: record.provider,
    model: record.model,
    suggestedScore: record.suggested_score,
    confidence: record.confidence,
    feedback: optionalLocalizedText(record.feedback_en, record.feedback_zh),
    correctionRequest: optionalLocalizedText(record.correction_request_en, record.correction_request_zh),
    errorCode: record.error_code,
    usage: record.usage,
    createdAt: record.created_at
  };
}

function assignmentTeacherReviewForDatabase(
  database: StudentActivityPersistenceDatabase,
  record: StudentActivityAssignmentTeacherReviewRecord
): AssignmentTeacherReview {
  const reviewer = (database.users ?? []).find((user) => user.id === record.reviewed_by);
  return {
    id: record.id,
    submissionId: record.submission_id,
    action: record.action,
    finalScore: record.final_score,
    feedback: optionalLocalizedText(record.feedback_en, record.feedback_zh),
    correctionRequest: optionalLocalizedText(record.correction_request_en, record.correction_request_zh),
    correctionDueAt: record.correction_due_at,
    reviewedBy: record.reviewed_by,
    reviewerName: reviewer?.username ?? "Teacher",
    createdAt: record.created_at
  };
}

function submissionForDatabase(
  database: StudentActivityPersistenceDatabase,
  record: StudentActivitySubmissionRecord
): Submission {
  const submissionId = record.id ?? `${record.assignment_id}:${record.student_id}`;
  const profile = studentActivityProfileFor(database, record.student_id);
  const attempts = (database.assignment_submission_attempts ?? [])
    .filter((attempt) => attempt.submission_id === submissionId)
    .sort((a, b) => a.attempt_number - b.attempt_number)
    .map(assignmentSubmissionAttemptForDatabase);
  const gradingRuns = (database.assignment_grading_runs ?? [])
    .filter((run) => run.submission_id === submissionId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(assignmentGradingRunForDatabase);
  const teacherReviews = (database.assignment_teacher_reviews ?? [])
    .filter((review) => review.submission_id === submissionId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((review) => assignmentTeacherReviewForDatabase(database, review));
  const latestGradingRun = gradingRuns[0] ?? null;
  const latestTeacherReview = teacherReviews[0] ?? null;

  return {
    id: submissionId,
    assignmentId: record.assignment_id,
    studentId: record.student_id,
    studentName: profile?.name ?? "Unknown student",
    status: record.status ?? "not-started",
    score: record.score ?? null,
    submittedAt: record.submitted_at ?? null,
    gradedAt: record.graded_at ?? null,
    feedback: optionalLocalizedText(record.feedback_en, record.feedback_zh),
    correctionRequest: latestTeacherReview?.correctionRequest ?? latestGradingRun?.correctionRequest ?? null,
    correctionDueAt: latestTeacherReview?.correctionDueAt ?? null,
    correctionRound: attempts.filter((attempt) => attempt.kind === "correction").length,
    maxCorrectionRounds: 2,
    resolvedAt: record.status === "resolved" ? record.graded_at ?? record.submitted_at ?? record.updated_at ?? null : null,
    attempts,
    latestAttempt: attempts.length ? attempts[attempts.length - 1] : null,
    latestGradingRun,
    latestTeacherReview,
    updatedAt: record.updated_at ?? ""
  };
}

function normalizeAssignmentOcrResult(value: unknown): AssignmentSubmissionOcrResult | null {
  const result = value as Partial<AssignmentSubmissionOcrResult> | null;
  if (!result || typeof result !== "object") return null;
  const alternatives: AssignmentOcrAlternative[] = Array.isArray(result.alternatives)
    ? result.alternatives
        .map((alternative): AssignmentOcrAlternative | null => {
          const item = alternative as Partial<AssignmentSubmissionOcrResult["alternatives"][number]> | null;
          if (!item || typeof item.text !== "string") return null;
          return {
            text: item.text.slice(0, 4000),
            ...(typeof item.latex === "string" ? { latex: item.latex.slice(0, 4000) } : {}),
            confidence: typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : null,
            provider: normalizeAssignmentOcrProvider(item.provider)
          };
        })
        .filter((alternative): alternative is AssignmentOcrAlternative => alternative !== null)
    : [];

  return {
    text: typeof result.text === "string" ? result.text.slice(0, assignmentMaxAnswerTextLength) : "",
    ...(typeof result.latex === "string" ? { latex: result.latex.slice(0, assignmentMaxAnswerTextLength) } : {}),
    confidence: typeof result.confidence === "number" ? Math.max(0, Math.min(1, result.confidence)) : null,
    provider: normalizeAssignmentOcrProvider(result.provider),
    accepted: result.accepted === true,
    alternatives: alternatives.slice(0, 6),
    ...(typeof result.reason === "string" ? { reason: result.reason.slice(0, 500) } : {})
  };
}

function topicLabelFor(database: StudentActivityPersistenceDatabase, question: QuestionRecord): LocalizedText {
  const topic = topicForId(database, question.topic_id);
  const seedTopic = seedTopicById.get(question.topic_id);
  return topic
    ? localizedTopicTitleForRecord(topic)
    : seedTopic?.title ?? {
      en: question.topic_title_en ?? question.topic_id,
      zh: question.topic_title_zh ?? question.topic_title_en ?? question.topic_id
    };
}

export const studentActivityTopicLabelForQuestion = topicLabelFor;

function profileForRecord(record: {
  curriculum_track?: CurriculumTrack | null;
  curriculum_region?: CurriculumRegion | null;
  textbook_publisher?: TextbookPublisher | null;
}) {
  return normalizeStoredCurriculumProfile({
    curriculumTrack: record.curriculum_track,
    region: record.curriculum_region,
    publisher: record.textbook_publisher
  });
}

function toPublicQuestion(database: StudentActivityPersistenceDatabase, question: QuestionRecord): PublicQuestion {
  const curriculumProfile = profileForRecord(question);
  return {
    id: question.id,
    curriculumTrack: question.curriculum_track,
    curriculumProfile,
    region: question.curriculum_region ?? curriculumProfile.region,
    publisher: question.textbook_publisher,
    canonicalTopicId: question.canonical_topic_id ?? question.topic_id,
    grade: question.grade,
    topicId: question.topic_id,
    topic: topicLabelFor(database, question),
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: {
      en: question.prompt_en,
      zh: question.prompt_zh
    },
    options: question.options ?? undefined,
    diagram: question.diagram ?? undefined,
    questionAssets: question.question_assets ?? undefined
  };
}

export const studentActivityToPublicQuestion = toPublicQuestion;

function questionMatchesCurriculumProfile(question: QuestionRecord, curriculumProfile: CurriculumProfile) {
  return contentMatchesCurriculumProfile({
    curriculumTrack: question.curriculum_track,
    region: question.curriculum_region,
    publisher: question.textbook_publisher
  }, curriculumProfile);
}

function questionMatchesCurriculumScope(question: QuestionRecord, curriculumScope: StudentActivityCurriculumScope) {
  const curriculumProfile =
    typeof curriculumScope === "string"
      ? curriculumProfileForTrack(curriculumScope)
      : curriculumScope ?? curriculumProfileForTrack("HK");
  return questionMatchesCurriculumProfile(question, curriculumProfile);
}

function topicMatchesCurriculumScope(topic: TopicRecord, curriculumScope: StudentActivityCurriculumScope) {
  const curriculumProfile =
    typeof curriculumScope === "string"
      ? curriculumProfileForTrack(curriculumScope)
      : curriculumScope ?? curriculumProfileForTrack("HK");
  return contentMatchesCurriculumProfile({
    curriculumTrack: topic.curriculum_track,
    region: topic.curriculum_region,
    publisher: topic.textbook_publisher
  }, curriculumProfile);
}

function topicMatchesTeacherClass(
  database: StudentActivityPersistenceDatabase,
  topicId: string,
  teacherClass: StudentActivityTeacherClassRecord
) {
  const curriculumProfile = profileForRecord(teacherClass);
  return (database.topics ?? []).some((topic) =>
    topic.id === topicId && topicMatchesCurriculumScope(topic, curriculumProfile)
  );
}

function assessmentAvailability(assessment: StudentActivityAssessmentRecord, nowMs = Date.now()) {
  if (assessment.opens_at && Date.parse(assessment.opens_at) > nowMs) {
    return {
      canSubmit: false,
      unavailableReason: {
        en: "This assessment is not open yet.",
        zh: "此測驗尚未開放。"
      }
    };
  }
  if (assessment.closes_at && Date.parse(assessment.closes_at) < nowMs) {
    return {
      canSubmit: false,
      unavailableReason: {
        en: "This assessment is closed.",
        zh: "此測驗已截止。"
      }
    };
  }
  if (assessment.status === "closed" || assessment.status === "draft") {
    return {
      canSubmit: false,
      unavailableReason: {
        en: "This assessment is not accepting submissions.",
        zh: "此測驗目前不接受提交。"
      }
    };
  }
  return { canSubmit: true, unavailableReason: undefined };
}

const validAssessmentPaperItemSources = new Set<AssessmentPaperItemSource>([
  "question-bank",
  "manual",
  "ai-generated",
  "mistake"
]);

function localizedTextRecord(value: unknown): value is LocalizedText {
  const record = value as Partial<LocalizedText> | null;
  return (
    Boolean(record) &&
    typeof record?.en === "string" &&
    record.en.trim().length > 0 &&
    typeof record.zh === "string" &&
    record.zh.trim().length > 0
  );
}

function cleanAssessmentText(value: unknown, fallback: string): LocalizedText {
  if (typeof value === "string" && value.trim()) {
    const text = value.trim().slice(0, 6000);
    return { en: text, zh: text };
  }
  if (localizedTextRecord(value)) {
    return {
      en: value.en.trim().slice(0, 6000),
      zh: value.zh.trim().slice(0, 6000),
      zhHans: typeof value.zhHans === "string" && value.zhHans.trim()
        ? value.zhHans.trim().slice(0, 6000)
        : undefined
    };
  }
  return { en: fallback, zh: fallback };
}

function assessmentPaperSectionsForRecord(
  record: Pick<StudentActivityAssessmentRecord, "question_ids" | "manual_questions" | "paper_sections">
): AssessmentPaperSection[] {
  const storedSections = (record.paper_sections ?? [])
    .map((section, sectionIndex) => {
      const title = cleanAssessmentText(section.title, sectionIndex === 0 ? "Questions" : `Section ${sectionIndex + 1}`);
      const instructions = section.instructions
        ? cleanAssessmentText(section.instructions, "")
        : undefined;
      const items = (section.items ?? [])
        .map((item, itemIndex) => {
          const source = validAssessmentPaperItemSources.has(item.source) ? item.source : "question-bank";
          const points = typeof item.points === "number" && Number.isFinite(item.points) && item.points > 0
            ? Math.round(item.points)
            : 10;
          return {
            ...item,
            id: item.id || `paper-item-${sectionIndex + 1}-${itemIndex + 1}`,
            source,
            points,
            order: typeof item.order === "number" && Number.isFinite(item.order) ? item.order : itemIndex
          };
        })
        .filter((item) => Boolean(item.questionId || item.embeddedQuestion));
      return {
        id: section.id || `section-${sectionIndex + 1}`,
        title,
        instructions,
        order: typeof section.order === "number" && Number.isFinite(section.order) ? section.order : sectionIndex,
        items
      };
    })
    .filter((section) => section.items.length)
    .sort((a, b) => a.order - b.order);
  if (storedSections.length) return storedSections;

  const legacyQuestionIds = record.question_ids ?? [];
  const legacyManualQuestions = record.manual_questions ?? [];
  const total = legacyQuestionIds.length + legacyManualQuestions.length;
  if (!total) return [];
  const defaultQuestionPoints = Math.max(1, Math.round(100 / Math.max(1, total)));
  return [
    {
      id: "section-1",
      title: { en: "Questions", zh: "題目" },
      order: 0,
      items: [
        ...legacyQuestionIds.map((questionId, index) => ({
          id: questionId,
          source: "question-bank" as const,
          questionId,
          points: defaultQuestionPoints,
          order: index
        })),
        ...legacyManualQuestions.map((question, index) => ({
          id: question.id,
          source: "manual" as const,
          embeddedQuestion: {
            type: "manual" as const,
            prompt: question.prompt,
            answer: question.answer,
            explanation: { en: question.answer, zh: question.answer }
          },
          points: question.points,
          order: legacyQuestionIds.length + index
        }))
      ]
    }
  ];
}

function assessmentSubmittedCount(database: StudentActivityPersistenceDatabase, assessmentId: string) {
  return (database.assessment_submissions ?? []).filter(
    (submission) =>
      submission.assessment_id === assessmentId &&
      (submission.status === "submitted" || submission.status === "graded" || submission.status === "late")
  ).length;
}

function assessmentForDatabase(
  database: StudentActivityPersistenceDatabase,
  record: StudentActivityAssessmentRecord
): Assessment {
  const id = record.id ?? "assessment";
  const titleEn = record.title_en ?? id;
  const titleZh = record.title_zh ?? titleEn;
  return {
    id,
    classId: record.class_id,
    title: {
      en: titleEn,
      zh: titleZh
    },
    type: record.type ?? "quiz",
    status: record.status ?? "open",
    sourceType: record.source_type ?? "manual",
    sourceResourceId: record.source_resource_id,
    analysisSettings: normalizeAssessmentAnalysisSettings(record.analysis_settings),
    examGroupId: record.exam_group_id ?? id,
    examGroupName: {
      en: record.exam_group_name_en ?? titleEn,
      zh: record.exam_group_name_zh ?? titleZh
    },
    questionIds: record.question_ids ?? [],
    manualQuestions: record.manual_questions ?? [],
    paperSections: assessmentPaperSectionsForRecord(record),
    opensAt: record.opens_at ?? null,
    closesAt: record.closes_at ?? null,
    timeLimitMinutes: record.time_limit_minutes ?? null,
    maxAttempts: record.max_attempts ?? 1,
    randomizeQuestionOrder: record.randomize_question_order ?? false,
    showAnswersImmediately: record.show_answers_immediately ?? false,
    gradeWeight: record.grade_weight ?? 0,
    createdBy: record.created_by ?? "",
    createdAt: record.created_at ?? "",
    updatedAt: record.updated_at ?? "",
    submissionCount: (database.assessment_submissions ?? []).filter((submission) => submission.assessment_id === id).length,
    submittedCount: assessmentSubmittedCount(database, id)
  };
}

function assessmentSubmissionForDatabase(
  database: StudentActivityPersistenceDatabase,
  record: StudentActivityAssessmentSubmissionRecord
): AssessmentSubmission {
  const profile = studentActivityProfileFor(database, record.student_id);
  return {
    id: record.id,
    assessmentId: record.assessment_id,
    studentId: record.student_id,
    studentName: profile?.name ?? "Unknown student",
    status: record.status,
    attemptNumber: record.attempt_number,
    score: record.score,
    maxScore: record.max_score,
    submittedAt: record.submitted_at,
    gradedAt: record.graded_at,
    answers: record.answers.map((answer) => ({
      ...answer,
      teacherFeedback: answer.teacherFeedback ?? null
    })),
    updatedAt: record.updated_at
  };
}

function assessmentPaperItemsForRecord(assessment: StudentActivityAssessmentRecord) {
  return assessmentPaperSectionsForRecord(assessment)
    .flatMap((section) => section.items.map((item) => ({ section, item })))
    .sort((a, b) => a.section.order - b.section.order || a.item.order - b.item.order);
}

function assessmentPaperItemQuestion(
  database: StudentActivityPersistenceDatabase,
  item: AssessmentPaperItem
) {
  return item.questionId ? questionForId(database, item.questionId) : null;
}

function assessmentPaperItemPrompt(
  database: StudentActivityPersistenceDatabase,
  item: AssessmentPaperItem
): LocalizedText {
  if (item.embeddedQuestion) return item.embeddedQuestion.prompt;
  const question = assessmentPaperItemQuestion(database, item);
  return question ? { en: question.prompt_en, zh: question.prompt_zh } : { en: item.id, zh: item.id };
}

function assessmentPaperItemCorrectAnswer(
  database: StudentActivityPersistenceDatabase,
  item: AssessmentPaperItem
) {
  if (item.embeddedQuestion) return item.embeddedQuestion.answer;
  return assessmentPaperItemQuestion(database, item)?.answer ?? "";
}

function assessmentPaperItemExplanation(
  database: StudentActivityPersistenceDatabase,
  item: AssessmentPaperItem
): LocalizedText | undefined {
  if (item.embeddedQuestion?.explanation) return item.embeddedQuestion.explanation;
  const question = assessmentPaperItemQuestion(database, item);
  return question ? { en: question.explanation_en, zh: question.explanation_zh } : undefined;
}

function assessmentPaperItemForStudent(
  database: StudentActivityPersistenceDatabase,
  sectionId: string,
  item: AssessmentPaperItem,
  showAnswers: boolean
): StudentAssessmentQuestion | null {
  const question = assessmentPaperItemQuestion(database, item);
  if (!item.embeddedQuestion && !question) return null;
  const type = item.embeddedQuestion?.type ?? question?.type ?? "manual";
  const explanation = assessmentPaperItemExplanation(database, item);
  return {
    id: item.id,
    prompt: assessmentPaperItemPrompt(database, item),
    type,
    options: item.embeddedQuestion?.options ?? question?.options ?? undefined,
    maxPoints: item.points,
    source: item.source,
    sectionId,
    topicId: item.embeddedQuestion?.topicId ?? question?.topic_id,
    difficulty: item.embeddedQuestion?.difficulty ?? question?.difficulty,
    correctAnswer: showAnswers ? assessmentPaperItemCorrectAnswer(database, item) : undefined,
    explanation: showAnswers ? explanation : undefined,
    isAnswerVisible: showAnswers
  };
}

function deterministicItemOrderValue(seed: string, item: AssessmentPaperItem) {
  return createHash("sha256").update(`${seed}:${item.id}:${item.order}`).digest("hex");
}

function orderAssessmentSectionItems(
  items: AssessmentPaperItem[],
  assessment: StudentActivityAssessmentRecord,
  studentId?: string
) {
  const ordered = [...items].sort((a, b) => a.order - b.order);
  if (!assessment.randomize_question_order || !studentId) return ordered;
  const seed = `${assessment.id ?? "assessment"}:${studentId}`;
  return [...ordered].sort((a, b) => deterministicItemOrderValue(seed, a).localeCompare(deterministicItemOrderValue(seed, b)));
}

function studentAssessmentQuestionSectionsForDatabase(
  database: StudentActivityPersistenceDatabase,
  assessment: StudentActivityAssessmentRecord,
  studentId: string,
  showAnswers: boolean
): StudentAssessmentQuestionSection[] {
  return assessmentPaperSectionsForRecord(assessment)
    .map((section) => {
      const questions = orderAssessmentSectionItems(section.items, assessment, studentId)
        .map((item) => assessmentPaperItemForStudent(database, section.id, item, showAnswers))
        .filter((question): question is StudentAssessmentQuestion => Boolean(question));
      return {
        id: section.id,
        title: section.title,
        instructions: section.instructions,
        questions
      };
    })
    .filter((section) => section.questions.length);
}

function assessmentPaperItemMatchesAnswerForDatabase(
  database: StudentActivityPersistenceDatabase,
  item: AssessmentPaperItem,
  selectedAnswer: string,
  questionAnswerMatches: NonNullable<StudentActivityPersistenceStoreDependencies["questionAnswerMatches"]>
) {
  if (item.embeddedQuestion) {
    const acceptedAnswers = [item.embeddedQuestion.answer, ...(item.embeddedQuestion.acceptedAnswers ?? [])];
    return acceptedAnswers.some((answer) => normalizeAssessmentAnswer(selectedAnswer) === normalizeAssessmentAnswer(answer));
  }
  const question = assessmentPaperItemQuestion(database, item);
  return question ? questionAnswerMatches(question, selectedAnswer) : null;
}

function normalizeAssessmentAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/\\[()]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([=,+\-*/:^()])\s*/g, "$1")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*°\s*/g, "°")
    .replace(/\bhk\s*\$\s*/g, "hk$")
    .replace(/\$\s*/g, "$")
    .trim();
}

function defaultQuestionAnswerMatches(question: QuestionRecord, selectedAnswer: string) {
  return selectedAnswer.trim() === question.answer;
}

function lessonProgressRowsFor(database: StudentActivityPersistenceDatabase) {
  database.lesson_progress ??= [];
  return database.lesson_progress;
}

function lessonProgressFor(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  lesson: StudentActivityLessonRecord
) {
  const progressRows = (database.lesson_progress ?? []).filter((progress) => progress.user_id === userId);
  return progressRows.find((progress) => progress.lesson_slug === lesson.slug)
    ?? progressRows.find((progress) => progress.topic_id === lesson.topic_id)
    ?? null;
}

export const studentActivityLessonProgressFor = lessonProgressFor;

function lessonSummaryForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string | null,
  lesson: StudentActivityLessonRecord,
  translateLessonTextEn: (value: string) => string,
  seedTopic?: Pick<Topic, "status" | "mastery"> | null
): LessonSummary {
  const progress = userId ? lessonProgressFor(database, userId, lesson) : null;
  const lessonTopic = topicForId(database, lesson.topic_id);
  const curriculumProfile = normalizeStoredCurriculumProfile({
    curriculumTrack: lessonTopic?.curriculum_track ?? "HK",
    region: lesson.curriculum_region ?? lessonTopic?.curriculum_region,
    publisher: lesson.textbook_publisher ?? lessonTopic?.textbook_publisher
  });

  return {
    slug: lesson.slug,
    topicId: lesson.topic_id,
    canonicalTopicId: lesson.canonical_topic_id ?? lessonTopic?.canonical_topic_id ?? lesson.topic_id,
    curriculumProfile,
    region: lesson.curriculum_region ?? lessonTopic?.curriculum_region ?? curriculumProfile.region,
    publisher: lesson.textbook_publisher ?? lessonTopic?.textbook_publisher,
    grade: lesson.grade,
    title: { en: translateLessonTextEn(lesson.title_en), zh: lesson.title_zh },
    description: { en: translateLessonTextEn(lesson.description_en), zh: lesson.description_zh },
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimated_minutes,
    status: progress?.status ?? (!userId ? seedTopic?.status ?? "not-started" : "not-started"),
    mastery: progress?.mastery ?? (!userId ? seedTopic?.mastery ?? 0 : 0)
  };
}

export function studentActivityLessonSummaryForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string | null,
  lesson: StudentActivityLessonRecord,
  translateLessonTextEn: (value: string) => string,
  seedTopic?: Pick<Topic, "status" | "mastery"> | null
) {
  return lessonSummaryForDatabase(database, userId, lesson, translateLessonTextEn, seedTopic);
}

function topicWithProgressForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string | null,
  topic: TopicRecord
): Topic {
  const curriculumProfile = profileForRecord(topic);
  const progress = userId
    ? (database.lesson_progress ?? []).find((candidate) => candidate.user_id === userId && candidate.topic_id === topic.id)
    : null;

  return {
    id: topic.id,
    curriculumTrack: topic.curriculum_track,
    curriculumProfile,
    region: topic.curriculum_region ?? curriculumProfile.region,
    publisher: topic.textbook_publisher,
    canonicalTopicId: topic.canonical_topic_id ?? topic.id,
    grade: topic.grade,
    title: { en: topic.title_en, zh: topic.title_zh },
    description: { en: topic.description_en, zh: topic.description_zh },
    status: progress?.status ?? "not-started",
    difficulty: topic.difficulty,
    minutes: topic.minutes,
    mastery: progress?.mastery ?? 0
  };
}

function lessonBlockForRecord(
  block: StudentActivityLessonBlockRecord,
  translateLessonTextEn: (value: string) => string
): LessonBlock {
  return {
    id: block.id,
    type: block.type,
    title: { en: translateLessonTextEn(block.title_en), zh: block.title_zh },
    content: block.content_en || block.content_zh
      ? { en: translateLessonTextEn(block.content_en ?? ""), zh: block.content_zh ?? block.content_en ?? "" }
      : undefined,
    items: block.items?.map((item) => ({ ...item, en: translateLessonTextEn(item.en) })),
    visualizationConfig: block.visualization_config,
    practiceQuestionIds: block.practice_question_ids
  };
}

function canonicalTopicIdForLesson(
  database: StudentActivityPersistenceDatabase,
  lesson: StudentActivityLessonRecord
) {
  const topic = topicForId(database, lesson.topic_id);
  return lesson.canonical_topic_id ?? topic?.canonical_topic_id ?? lesson.topic_id;
}

function findLessonByCanonicalTopicId(
  database: StudentActivityPersistenceDatabase,
  canonicalTopicId: string,
  curriculumTrack: StudentActivityCurriculumScope,
  topicMatchesCurriculum: (topic: TopicRecord, curriculumTrack: StudentActivityCurriculumScope) => boolean
) {
  return (database.lessons ?? [])
    .filter((candidate) => canonicalTopicIdForLesson(database, candidate) === canonicalTopicId)
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .find((candidate) => {
      const candidateTopic = topicForId(database, candidate.topic_id);
      return Boolean(candidateTopic && topicMatchesCurriculum(candidateTopic, curriculumTrack));
    }) ?? null;
}

function lessonDetailForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string | null,
  slug: string,
  curriculumTrack: StudentActivityCurriculumScope,
  {
    contentUnavailableForProfile,
    questionMatchesCurriculum,
    topicMatchesCurriculum,
    translateLessonTextEn
  }: {
    contentUnavailableForProfile: (profile: CurriculumProfile, grade?: GradeId) => LocalizedText | null;
    questionMatchesCurriculum: (
      question: QuestionRecord,
      curriculumScope: StudentActivityCurriculumScope
    ) => boolean;
    topicMatchesCurriculum: (
      topic: TopicRecord,
      curriculumScope: StudentActivityCurriculumScope
    ) => boolean;
    translateLessonTextEn: (value: string) => string;
  }
): LessonDetail | null {
  let lesson = (database.lessons ?? []).find((candidate) => candidate.slug === slug);
  if (!lesson) return null;

  let topic = topicForId(database, lesson.topic_id);
  if (!topic) return null;

  let lessonScope = curriculumTrack;
  if (!topicMatchesCurriculum(topic, curriculumTrack)) {
    const exactLessonProfile = normalizeStoredCurriculumProfile({
      curriculumTrack: topic.curriculum_track,
      region: lesson.curriculum_region ?? topic.curriculum_region,
      publisher: lesson.textbook_publisher ?? topic.textbook_publisher
    });

    if (userId === null && contentUnavailableForProfile(exactLessonProfile, lesson.grade) === null) {
      lessonScope = exactLessonProfile;
    } else {
      const profileLesson = findLessonByCanonicalTopicId(
        database,
        canonicalTopicIdForLesson(database, lesson),
        curriculumTrack,
        topicMatchesCurriculum
      );
      if (!profileLesson) return null;
      lesson = profileLesson;
      topic = topicForId(database, lesson.topic_id);
      if (!topic) return null;
    }
  }

  const summary = lessonSummaryForDatabase(database, userId, lesson, translateLessonTextEn);
  const blocks = (database.lesson_blocks ?? [])
    .filter((block) => block.lesson_slug === lesson.slug)
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
    .map((block) => lessonBlockForRecord(block, translateLessonTextEn));
  const practiceIds = new Set(blocks.flatMap((block) => block.practiceQuestionIds ?? []));
  const practiceQuestions = Array.from(practiceIds)
    .map((questionId) => (database.questions ?? []).find((question) => question.id === questionId))
    .filter((question): question is QuestionRecord => Boolean(question && questionMatchesCurriculum(question, lessonScope)))
    .map((question) => toPublicQuestion(database, question));
  const progress = userId ? lessonProgressFor(database, userId, lesson) : null;

  return {
    ...summary,
    blocks,
    practiceQuestions,
    topic: topicWithProgressForDatabase(database, userId, topic),
    checklistState: progress?.checklist_state ?? {}
  };
}

function lessonForTopic(database: StudentActivityPersistenceDatabase, topicId: string) {
  return (database.lessons ?? []).find((lesson) => lesson.topic_id === topicId) ?? null;
}

type LessonEntryCandidate = {
  index: number;
  lesson: StudentActivityLessonRecord;
  progress: StudentActivityLessonProgressRecord | null;
};

function lessonEntryProgressForCandidate(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  lesson: StudentActivityLessonRecord
) {
  return (database.lesson_progress ?? []).find((progress) =>
    progress.user_id === userId &&
    (progress.lesson_slug === lesson.slug || progress.topic_id === lesson.topic_id)
  ) ?? null;
}

function hasLessonEntryProgressEvidence(progress: StudentActivityLessonProgressRecord | null) {
  if (!progress) return false;
  if (progress.status !== "not-started") return true;
  if (progress.mastery > 0) return true;
  if ((progress.duration_seconds ?? 0) > 0) return true;
  if (progress.started_at) return true;
  return Object.values(progress.checklist_state ?? {}).some(Boolean);
}

function lessonEntryProgressTimestamp(progress: StudentActivityLessonProgressRecord | null) {
  if (!progress) return -1;
  return studentActivityTimestampOf(progress.updated_at)
    ?? studentActivityTimestampOf(progress.started_at)
    ?? studentActivityTimestampOf(progress.completed_at)
    ?? -1;
}

function lessonEntryTargetFromCandidate(candidate: LessonEntryCandidate): LessonEntryTarget {
  return {
    href: lessonHrefForSlug(candidate.lesson.slug),
    slug: candidate.lesson.slug,
    grade: candidate.lesson.grade,
    topicId: candidate.lesson.topic_id
  };
}

function selectContinueLessonEntryCandidate(candidates: LessonEntryCandidate[]) {
  const activeCandidates = candidates
    .filter((candidate) =>
      candidate.progress?.status !== "completed" &&
      hasLessonEntryProgressEvidence(candidate.progress)
    )
    .sort((a, b) =>
      lessonEntryProgressTimestamp(b.progress) - lessonEntryProgressTimestamp(a.progress) ||
      b.index - a.index
    );
  const activeCandidate = activeCandidates[0];
  if (activeCandidate) return activeCandidate;

  const completedCandidates = candidates.filter((candidate) => candidate.progress?.status === "completed");
  const furthestCompletedCandidate = completedCandidates
    .sort((a, b) => b.index - a.index)[0];
  if (furthestCompletedCandidate) {
    return candidates.find((candidate) => candidate.index > furthestCompletedCandidate.index)
      ?? furthestCompletedCandidate;
  }

  return candidates[0] ?? null;
}

function lessonEntryTargetExistsInDatabase(
  database: StudentActivityPersistenceDatabase,
  target: LessonEntryTarget,
  curriculumTrack: StudentActivityCurriculumScope,
  topicMatchesCurriculum: (topic: TopicRecord, curriculumScope: StudentActivityCurriculumScope) => boolean
) {
  const lesson = (database.lessons ?? []).find(
    (candidate) =>
      candidate.slug === target.slug &&
      candidate.topic_id === target.topicId &&
      candidate.grade === target.grade
  );
  if (!lesson) return false;

  const topic = topicForId(database, lesson.topic_id);
  return Boolean(topic && topic.grade === target.grade && topicMatchesCurriculum(topic, curriculumTrack));
}

export function studentActivityLessonForTopic(
  database: StudentActivityPersistenceDatabase,
  topicId: string
) {
  return lessonForTopic(database, topicId);
}

function topicAttemptStatsForDatabase(database: StudentActivityPersistenceDatabase, userId: string) {
  const stats = new Map<string, { attempts: StudentActivityAttemptRecord[]; correct: number; wrong: number; lastAttemptAt: string }>();

  (database.attempts ?? [])
    .filter((attempt) => attempt.user_id === userId)
    .forEach((attempt) => {
      const question = questionForId(database, attempt.question_id);
      if (!question) return;

      const current = stats.get(question.topic_id) ?? {
        attempts: [],
        correct: 0,
        wrong: 0,
        lastAttemptAt: attempt.created_at
      };
      current.attempts.push(attempt);
      current.correct += attempt.is_correct ? 1 : 0;
      current.wrong += attempt.is_correct ? 0 : 1;
      current.lastAttemptAt = current.lastAttemptAt.localeCompare(attempt.created_at) > 0
        ? current.lastAttemptAt
        : attempt.created_at;
      stats.set(question.topic_id, current);
    });

  return stats;
}

export function studentActivityTopicAttemptStats(
  database: StudentActivityPersistenceDatabase,
  userId: string
) {
  return topicAttemptStatsForDatabase(database, userId);
}

function hasPersonalRoadmapEvidenceForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  gradeTopicIds: Set<string>
) {
  const hasTopicAttempt = (database.attempts ?? []).some((attempt) => {
    if (attempt.user_id !== userId) return false;
    const question = questionForId(database, attempt.question_id);
    return Boolean(question && gradeTopicIds.has(question.topic_id));
  });
  if (hasTopicAttempt) return true;

  const hasActiveMistake = (database.mistakes ?? []).some((mistake) => {
    if (mistake.user_id !== userId) return false;
    const question = questionForId(database, mistake.question_id);
    return Boolean(question && gradeTopicIds.has(question.topic_id));
  });
  if (hasActiveMistake) return true;

  const hasLessonProgress = (database.lesson_progress ?? []).some((progress) =>
    progress.user_id === userId &&
    gradeTopicIds.has(progress.topic_id) &&
    (progress.status !== "not-started" || progress.mastery > 0 || (progress.duration_seconds ?? 0) > 0)
  );
  if (hasLessonProgress) return true;

  const hasLearningEvent = (database.learning_events ?? []).some((event) =>
    event.user_id === userId && gradeTopicIds.has(event.topic_id)
  );
  if (hasLearningEvent) return true;

  const hasVisualizationEvent = (database.visualization_events ?? []).some((event) =>
    event.user_id === userId && gradeTopicIds.has(event.topic_id)
  );
  if (hasVisualizationEvent) return true;

  return (database.visualization_sessions ?? []).some((session) =>
    session.user_id === userId && gradeTopicIds.has(session.topic_id)
  );
}

export function studentActivityHasPersonalRoadmapEvidence(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  gradeTopicIds: Set<string>
) {
  return hasPersonalRoadmapEvidenceForDatabase(database, userId, gradeTopicIds);
}

function roadmapSignalsForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string | null,
  gradeTopics: Topic[]
) {
  const gradeTopicIds = new Set(gradeTopics.map((topic) => topic.id));

  if (!userId) {
    return {
      recommendedTopic: gradeTopics.find((topic) => topic.status === "in-progress") ?? gradeTopics[0] ?? null,
      recentTopics: gradeTopics.filter((topic) => topic.status !== "not-started").slice(0, 3),
      weakTopics: gradeTopics.filter((topic) => topic.mastery > 0 && topic.mastery < 65).slice(0, 4)
    };
  }

  if (!hasPersonalRoadmapEvidenceForDatabase(database, userId, gradeTopicIds)) {
    return {
      recommendedTopic: gradeTopics.find((topic) => topic.status === "in-progress") ?? gradeTopics[0] ?? null,
      recentTopics: [],
      weakTopics: []
    };
  }

  const topicStats = topicAttemptStatsForDatabase(database, userId);
  const activeMistakes = (database.mistakes ?? []).filter((mistake) => {
    const question = questionForId(database, mistake.question_id);
    return mistake.user_id === userId && !mistake.mastered && Boolean(question && gradeTopicIds.has(question.topic_id));
  });
  const activeMistakeTopicIds = new Set(
    activeMistakes
      .map((mistake) => questionForId(database, mistake.question_id)?.topic_id)
      .filter((topicId): topicId is string => Boolean(topicId))
  );
  const weakTopicMap = new Map<string, Topic>();

  gradeTopics
    .filter((topic) => activeMistakeTopicIds.has(topic.id))
    .sort((a, b) => a.mastery - b.mastery)
    .forEach((topic) => weakTopicMap.set(topic.id, topic));
  gradeTopics
    .filter((topic) => {
      const stats = topicStats.get(topic.id);
      const topicAccuracy = stats?.attempts.length ? Math.round((stats.correct / stats.attempts.length) * 100) : 100;
      return topic.mastery < 60 || topicAccuracy < 65;
    })
    .sort((a, b) => a.mastery - b.mastery)
    .forEach((topic) => weakTopicMap.set(topic.id, topic));

  const recentTopics = Array.from(topicStats.entries())
    .filter(([topicId]) => gradeTopicIds.has(topicId))
    .sort(([, a], [, b]) => b.lastAttemptAt.localeCompare(a.lastAttemptAt))
    .map(([topicId]) => gradeTopics.find((topic) => topic.id === topicId))
    .filter((topic): topic is Topic => Boolean(topic))
    .slice(0, 3);
  const weakTopics = Array.from(weakTopicMap.values()).slice(0, 4);
  const recommendedTopic =
    weakTopics[0] ??
    gradeTopics.find((topic) => topic.status === "in-progress") ??
    gradeTopics.find((topic) => topic.status === "not-started") ??
    gradeTopics[0] ??
    null;

  return {
    recommendedTopic,
    recentTopics: recentTopics.length ? recentTopics : gradeTopics.filter((topic) => topic.status !== "not-started").slice(0, 3),
    weakTopics
  };
}

export function studentActivityRoadmapSignals(
  database: StudentActivityPersistenceDatabase,
  userId: string | null,
  gradeTopics: Topic[]
) {
  return roadmapSignalsForDatabase(database, userId, gradeTopics);
}

function lessonEntryTargetForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  grade: GradeId,
  curriculumTrack: StudentActivityCurriculumScope,
  startedAt: number,
  {
    topicMatchesCurriculum,
    logLessonEntryTargetPerf
  }: {
    topicMatchesCurriculum: (
      topic: TopicRecord,
      curriculumScope: StudentActivityCurriculumScope
    ) => boolean;
    logLessonEntryTargetPerf: (label: string, startedAt: number) => void;
  }
): LessonEntryTarget | null {
  const topicRecords = (database.topics ?? [])
    .filter((topic) => topicMatchesCurriculum(topic, curriculumTrack) && topic.grade === grade)
    .sort((a, b) => a.sort_order - b.sort_order);
  const candidates = topicRecords
    .map((topic, index): LessonEntryCandidate | null => {
      const lesson = lessonForTopic(database, topic.id);
      if (!lesson) return null;
      return {
        index,
        lesson,
        progress: lessonEntryProgressForCandidate(database, userId, lesson)
      };
    })
    .filter((candidate): candidate is LessonEntryCandidate => Boolean(candidate));
  const targetCandidate = selectContinueLessonEntryCandidate(candidates);

  if (!targetCandidate) {
    logLessonEntryTargetPerf("getLessonEntryTarget", startedAt);
    return null;
  }

  const target = lessonEntryTargetFromCandidate(targetCandidate);
  logLessonEntryTargetPerf("getLessonEntryTarget", startedAt);
  return target;
}

function roadmapDataForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string | null,
  grade: GradeId | undefined,
  curriculumTrack: StudentActivityCurriculumScope,
  {
    contentUnavailableForProfile,
    topicMatchesCurriculum,
    translateLessonTextEn
  }: {
    contentUnavailableForProfile: (profile: CurriculumProfile, grade?: GradeId) => LocalizedText | null;
    topicMatchesCurriculum: (
      topic: TopicRecord,
      curriculumScope: StudentActivityCurriculumScope
    ) => boolean;
    translateLessonTextEn: (value: string) => string;
  }
): RoadmapData {
  const curriculumProfile =
    typeof curriculumTrack === "string"
      ? curriculumProfileForTrack(curriculumTrack)
      : curriculumTrack ?? curriculumProfileForTrack("HK");
  const topicRecords = (database.topics ?? [])
    .filter((topic) => topicMatchesCurriculum(topic, curriculumProfile) && (!grade || topic.grade === grade))
    .sort((a, b) => a.sort_order - b.sort_order);
  const roadmapTopics = topicRecords.map((topic) => topicWithProgressForDatabase(database, userId, topic));
  const lessons = roadmapTopics
    .map((topic) => lessonForTopic(database, topic.id))
    .filter((lesson): lesson is StudentActivityLessonRecord => Boolean(lesson))
    .map((lesson) => lessonSummaryForDatabase(database, userId, lesson, translateLessonTextEn));
  const signals = roadmapSignalsForDatabase(database, userId, roadmapTopics);
  const recommendedLesson = signals.recommendedTopic
    ? lessons.find((lesson) => lesson.topicId === signals.recommendedTopic?.id) ?? null
    : null;

  return {
    curriculumTrack: curriculumTrackForProfile(curriculumProfile),
    curriculumProfile,
    grade: grade ?? "all",
    topics: roadmapTopics,
    lessons,
    recommendedLesson,
    recentTopics: signals.recentTopics,
    weakTopics: signals.weakTopics,
    contentUnavailable: contentUnavailableForProfile(curriculumProfile, grade)
  };
}

export function dayKey(value: string) {
  return value.slice(0, 10);
}

export function startOfUtcDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function calculateStreak(attempts: StudentActivityAttemptRecord[], now = new Date()) {
  const activeDays = new Set(attempts.map((attempt) => dayKey(attempt.created_at)));
  let streak = 0;
  const cursor = new Date(now);
  cursor.setUTCHours(0, 0, 0, 0);

  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function buildProgressMetrics({
  completedLessons,
  totalAttempts,
  accuracy,
  masteredTopics,
  visualizationSessions,
  activeMistakes
}: {
  completedLessons: number;
  totalAttempts: number;
  accuracy: number;
  masteredTopics: number;
  visualizationSessions: number;
  activeMistakes: number;
}) {
  return [
    {
      label: { en: "Lessons completed", zh: "已完成課節" },
      value: String(completedLessons),
      detail: { en: "From lesson progress records", zh: "來自課節進度紀錄" },
      trend: `${totalAttempts} attempts`
    },
    {
      label: { en: "Accuracy rate", zh: "答題準確率" },
      value: `${accuracy}%`,
      detail: { en: "From saved answer attempts", zh: "來自已儲存作答紀錄" },
      trend: `${totalAttempts} total`
    },
    {
      label: { en: "Topics mastered", zh: "已掌握課題" },
      value: String(masteredTopics),
      detail: { en: "Mastery at or above 75%", zh: "掌握度達 75% 或以上" },
      trend: `${activeMistakes} active mistakes`
    },
    {
      label: { en: "Visualization sessions", zh: "視覺化使用次數" },
      value: String(visualizationSessions),
      detail: { en: "From visualization event records", zh: "來自視覺化事件紀錄" },
      trend: `${visualizationSessions} total`
    }
  ];
}

const durationFallbackStudySources = new Set<LearningAnalyticsEvent["source"]>([
  "lesson",
  "practice",
  "mistake-book",
  "visualization-lab",
  "function-graph",
  "function-model",
  "geometry",
  "probability",
  "coordinate-plane",
  "trig-wave",
  "calculus-stats",
  "learning-path",
  "ai-tutor"
]);
export const durationFallbackSeconds = 60;

export function hasRecordedDuration(durationSeconds: number | null | undefined): durationSeconds is number {
  return typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0;
}

export function isDurationlessStudyEvent(event: LearningEventRecord) {
  if (event.type === "answer-correct" || event.type === "answer-wrong") return false;
  if (event.type === "page-view") return durationFallbackStudySources.has(event.source);
  return durationFallbackStudySources.has(event.source) || event.type === "mistake-review" || event.type === "hint-request" || isVisualizationEvent(event.type);
}

export function secondsToDisplayMinutes(seconds: number) {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}

function localizedTopicTitleForRecord(topic: TopicRecord): LocalizedText {
  const seedTopic = seedTopicById.get(topic.id);
  const shouldUseSeedEnglish =
    topic.curriculum_track === "MAINLAND_PEP_HIGH" &&
    topic.textbook_publisher === "MAINLAND_HJB" &&
    hasCjkText(topic.title_en) &&
    seedTopic?.title.en;

  return {
    en: shouldUseSeedEnglish ? seedTopic.title.en : topic.title_en,
    zh: topic.title_zh
  };
}

export const studentActivityLocalizedTopicTitleForRecord = localizedTopicTitleForRecord;

function buildRecentActivityItems({
  database,
  userId,
  grade,
  gradeTopicIds
}: {
  database: StudentActivityPersistenceDatabase;
  userId: string;
  grade: GradeId;
  gradeTopicIds: Set<string>;
}): RecentActivityItem[] {
  const items: RecentActivityItem[] = [];

  (database.attempts ?? [])
    .filter((attempt) => {
      const question = questionForId(database, attempt.question_id);
      return attempt.user_id === userId && Boolean(question && gradeTopicIds.has(question.topic_id));
    })
    .forEach((attempt) => {
      const question = questionForId(database, attempt.question_id);
      if (!question) return;
      items.push({
        id: `attempt-${attempt.id}`,
        title: topicLabelFor(database, question),
        detail: attempt.is_correct
          ? { en: "Correct Practice Arena attempt", zh: "練習場答對紀錄" }
          : { en: "Practice Arena attempt to review", zh: "需要重溫的練習場作答" },
        timestamp: attempt.created_at
      });
    });

  (database.lesson_progress ?? [])
    .filter((progress) => progress.user_id === userId && gradeTopicIds.has(progress.topic_id) && progress.status !== "not-started")
    .forEach((progress) => {
      const topic = topicForId(database, progress.topic_id);
      items.push({
        id: `lesson-${progress.topic_id}-${progress.updated_at}`,
        title: topic ? localizedTopicTitleForRecord(topic) : { en: progress.topic_id, zh: progress.topic_id },
        detail: progress.status === "completed"
          ? { en: `Lesson completed · mastery ${progress.mastery}%`, zh: `課節已完成 · 掌握度 ${progress.mastery}%` }
          : { en: `Lesson in progress · mastery ${progress.mastery}%`, zh: `課節進行中 · 掌握度 ${progress.mastery}%` },
        timestamp: progress.updated_at
      });
    });

  (database.learning_events ?? [])
    .filter((event) => event.user_id === userId && event.grade === grade)
    .forEach((event) => {
      const topic = topicForId(database, event.topic_id);
      items.push({
        id: `event-${event.id}`,
        title: topic
          ? localizedTopicTitleForRecord(topic)
          : { en: `${event.source} activity`, zh: `${event.source} 學習活動` },
        detail: { en: `${event.type} from ${event.source}`, zh: `${event.source} 的 ${event.type} 紀錄` },
        timestamp: event.created_at
      });
    });

  return items
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6);
}

function dashboardDataForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  grade: GradeId,
  curriculumTrack: StudentActivityCurriculumScope,
  {
    contentUnavailableForProfile,
    now,
    topicMatchesCurriculum
  }: {
    contentUnavailableForProfile: (profile: CurriculumProfile, grade?: GradeId) => LocalizedText | null;
    now: () => Date;
    topicMatchesCurriculum: (
      topic: TopicRecord,
      curriculumScope: StudentActivityCurriculumScope
    ) => boolean;
  }
): DashboardData {
  const curriculumProfile =
    typeof curriculumTrack === "string"
      ? curriculumProfileForTrack(curriculumTrack)
      : curriculumTrack ?? curriculumProfileForTrack("HK");
  const gradeTopics = (database.topics ?? [])
    .filter((topic) => topicMatchesCurriculum(topic, curriculumProfile) && topic.grade === grade)
    .map((topic) => topicWithProgressForDatabase(database, userId, topic));
  const gradeTopicIds = new Set(gradeTopics.map((topic) => topic.id));
  const userAttempts = (database.attempts ?? []).filter((attempt) => {
    const question = questionForId(database, attempt.question_id);
    return attempt.user_id === userId && Boolean(question && gradeTopicIds.has(question.topic_id));
  });
  const correctAttempts = userAttempts.filter((attempt) => attempt.is_correct).length;
  const accuracy = userAttempts.length ? Math.round((correctAttempts / userAttempts.length) * 100) : 0;
  const topicStats = topicAttemptStatsForDatabase(database, userId);
  const activeMistakes = (database.mistakes ?? []).filter((mistake) => {
    const question = questionForId(database, mistake.question_id);
    return mistake.user_id === userId && !mistake.mastered && Boolean(question && gradeTopicIds.has(question.topic_id));
  });
  const activeMistakeTopicIds = new Set(
    activeMistakes
      .map((mistake) => questionForId(database, mistake.question_id)?.topic_id)
      .filter((topicId): topicId is string => Boolean(topicId))
  );
  const activeMistakeTopics = gradeTopics
    .filter((topic) => activeMistakeTopicIds.has(topic.id))
    .sort((a, b) => a.mastery - b.mastery);
  const weakTopicMap = new Map<string, Topic>();
  activeMistakeTopics.forEach((topic) => weakTopicMap.set(topic.id, topic));
  gradeTopics
    .filter((topic) => {
      const stats = topicStats.get(topic.id);
      const topicAccuracy = stats?.attempts.length ? Math.round((stats.correct / stats.attempts.length) * 100) : 100;
      return topic.mastery < 60 || topicAccuracy < 65;
    })
    .sort((a, b) => a.mastery - b.mastery)
    .forEach((topic) => weakTopicMap.set(topic.id, topic));
  const weakTopics = Array.from(weakTopicMap.values()).slice(0, 4);
  const recentTopics = Array.from(topicStats.entries())
    .filter(([topicId]) => gradeTopicIds.has(topicId))
    .sort(([, a], [, b]) => b.lastAttemptAt.localeCompare(a.lastAttemptAt))
    .map(([topicId]) => gradeTopics.find((topic) => topic.id === topicId))
    .filter((topic): topic is Topic => Boolean(topic))
    .slice(0, 3);
  const fallbackRecent = gradeTopics.filter((topic) => topic.status !== "not-started").slice(0, 3);
  const recommendedLesson =
    activeMistakeTopics[0] ??
    weakTopics[0] ??
    gradeTopics.find((topic) => topic.status === "in-progress") ??
    gradeTopics.find((topic) => topic.status === "not-started") ??
    gradeTopics[0] ??
    null;
  const completedLessons = (database.lesson_progress ?? []).filter((progress) => {
    return progress.user_id === userId && progress.status === "completed" && gradeTopicIds.has(progress.topic_id);
  }).length;
  const masteredTopics = gradeTopics.filter((topic) => topic.mastery >= 75).length;
  const visualizationSessions = Math.max(
    (database.visualization_events ?? []).filter((event) => event.user_id === userId && gradeTopicIds.has(event.topic_id)).length,
    (database.visualization_sessions ?? []).filter((session) => session.user_id === userId && gradeTopicIds.has(session.topic_id)).length
  );
  const averageMastery = gradeTopics.length
    ? Math.round(gradeTopics.reduce((sum, topic) => sum + topic.mastery, 0) / gradeTopics.length)
    : 0;

  return {
    curriculumTrack: curriculumTrackForProfile(curriculumProfile),
    streakDays: calculateStreak(userAttempts, now()),
    overallMastery: userAttempts.length ? accuracy : averageMastery,
    progressMetrics: buildProgressMetrics({
      completedLessons,
      totalAttempts: userAttempts.length,
      accuracy,
      masteredTopics,
      visualizationSessions,
      activeMistakes: activeMistakes.length
    }),
    recommendedLesson,
    recentTopics: recentTopics.length ? recentTopics : fallbackRecent,
    weakTopics,
    gradeTopics,
    contentUnavailable: contentUnavailableForProfile(curriculumProfile, grade)
  };
}

export function studentActivityDashboardDataForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  grade: GradeId,
  curriculumTrack: StudentActivityCurriculumScope,
  options: {
    contentUnavailableForProfile: (profile: CurriculumProfile, grade?: GradeId) => LocalizedText | null;
    now: () => Date;
    topicMatchesCurriculum?: (
      topic: TopicRecord,
      curriculumScope: StudentActivityCurriculumScope
    ) => boolean;
  }
): DashboardData {
  return dashboardDataForDatabase(database, userId, grade, curriculumTrack, {
    contentUnavailableForProfile: options.contentUnavailableForProfile,
    now: options.now,
    topicMatchesCurriculum: options.topicMatchesCurriculum ?? topicMatchesCurriculumScope
  });
}

function progressDataForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  grade: GradeId,
  window: string | null | undefined,
  curriculumTrack: StudentActivityCurriculumScope,
  {
    contentUnavailableForProfile,
    now,
    topicMatchesCurriculum
  }: {
    contentUnavailableForProfile: (profile: CurriculumProfile, grade?: GradeId) => LocalizedText | null;
    now: () => Date;
    topicMatchesCurriculum: (
      topic: TopicRecord,
      curriculumScope: StudentActivityCurriculumScope
    ) => boolean;
  }
): ProgressData {
  const curriculumProfile =
    typeof curriculumTrack === "string"
      ? curriculumProfileForTrack(curriculumTrack)
      : curriculumTrack ?? curriculumProfileForTrack("HK");
  const windowDays = windowDaysFrom(window);
  const currentTime = now();
  const buckets = Array.from({ length: windowDays }, (_, index) => {
    const date = startOfUtcDay(currentTime);
    date.setUTCDate(date.getUTCDate() - (windowDays - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      day: new Intl.DateTimeFormat("en-HK", { weekday: "short", timeZone: "UTC" }).format(date),
      seconds: 0,
      hasDurationlessStudyActivity: false
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.date, bucket]));
  const earliest = startOfUtcDay(new Date(`${buckets[0]?.date ?? currentTime.toISOString().slice(0, 10)}T00:00:00.000Z`)).getTime();
  const nowTime = currentTime.getTime();
  const gradeTopics = (database.topics ?? [])
    .filter((topic) => topicMatchesCurriculum(topic, curriculumProfile) && topic.grade === grade)
    .map((topic) => topicWithProgressForDatabase(database, userId, topic));
  const gradeTopicIds = new Set(gradeTopics.map((topic) => topic.id));
  const attempts = (database.attempts ?? []).filter((attempt) => {
    const question = questionForId(database, attempt.question_id);
    const attemptTime = new Date(attempt.created_at).getTime();
    return (
      attempt.user_id === userId &&
      attemptTime >= earliest &&
      attemptTime <= nowTime &&
      Boolean(question && gradeTopicIds.has(question.topic_id))
    );
  });
  const learningEvents = (database.learning_events ?? []).filter((event) => {
    const eventTime = new Date(event.created_at).getTime();
    return event.user_id === userId && event.grade === grade && eventTime >= earliest && eventTime <= nowTime;
  });
  const lessonProgressRecords = (database.lesson_progress ?? []).filter((progress) => {
    const updatedTime = new Date(progress.updated_at).getTime();
    return progress.user_id === userId && gradeTopicIds.has(progress.topic_id) && updatedTime >= earliest && updatedTime <= nowTime;
  });

  attempts.forEach((attempt) => {
    const bucket = bucketMap.get(dayKey(attempt.created_at));
    if (!bucket) return;
    if (hasRecordedDuration(attempt.duration_seconds)) {
      bucket.seconds += attempt.duration_seconds;
    } else {
      bucket.hasDurationlessStudyActivity = true;
    }
  });
  lessonProgressRecords.forEach((progress) => {
    const bucket = bucketMap.get(dayKey(progress.updated_at));
    if (!bucket) return;
    if (hasRecordedDuration(progress.duration_seconds)) {
      bucket.seconds += progress.duration_seconds;
    } else {
      bucket.hasDurationlessStudyActivity = true;
    }
  });
  learningEvents
    .filter((event) => event.type !== "answer-correct" && event.type !== "answer-wrong")
    .forEach((event) => {
      const bucket = bucketMap.get(dayKey(event.created_at));
      if (!bucket) return;
      if (hasRecordedDuration(event.duration_seconds)) {
        bucket.seconds += event.duration_seconds;
      } else if (isDurationlessStudyEvent(event)) {
        bucket.hasDurationlessStudyActivity = true;
      }
    });

  const weeklyActivity = buckets.map((bucket) => ({
    day: bucket.day,
    minutes: secondsToDisplayMinutes(bucket.seconds || (bucket.hasDurationlessStudyActivity ? durationFallbackSeconds : 0))
  }));
  const totalMinutes = weeklyActivity.reduce((sum, day) => sum + day.minutes, 0);
  const correctAttempts = attempts.filter((attempt) => attempt.is_correct).length;
  const accuracy = attempts.length ? Math.round((correctAttempts / attempts.length) * 100) : 0;
  const completedLessons = (database.lesson_progress ?? []).filter((progress) => {
    return progress.user_id === userId && progress.status === "completed" && gradeTopicIds.has(progress.topic_id);
  }).length;
  const masteredTopics = gradeTopics.filter((topic) => topic.mastery >= 75).length;
  const visualizationSessions = Math.max(
    learningEvents.filter((event) => isVisualizationEvent(event.type)).length,
    (database.visualization_sessions ?? []).filter((session) => {
      const updatedTime = new Date(session.updated_at).getTime();
      return session.user_id === userId && gradeTopicIds.has(session.topic_id) && updatedTime >= earliest && updatedTime <= nowTime;
    }).length
  );
  const activeMistakes = (database.mistakes ?? []).filter((mistake) => {
    const question = questionForId(database, mistake.question_id);
    return mistake.user_id === userId && !mistake.mastered && Boolean(question && gradeTopicIds.has(question.topic_id));
  });
  const activeMistakeTopicIds = new Set(
    activeMistakes
      .map((mistake) => questionForId(database, mistake.question_id)?.topic_id)
      .filter((topicId): topicId is string => Boolean(topicId))
  );
  const weakTopicMap = new Map<string, Topic>();
  gradeTopics
    .filter((topic) => activeMistakeTopicIds.has(topic.id) || (topic.mastery > 0 && topic.mastery < 65))
    .sort((a, b) => a.mastery - b.mastery)
    .forEach((topic) => weakTopicMap.set(topic.id, topic));
  const masteryAreas = gradeTopics
    .map((topic) => ({
      label: topic.title,
      value: topic.mastery
    }))
    .sort((a, b) => a.value - b.value);
  const weakTopics = Array.from(weakTopicMap.values()).slice(0, 4);
  const recentActivity = buildRecentActivityItems({ database, userId, grade, gradeTopicIds });

  return {
    curriculumTrack: curriculumTrackForProfile(curriculumProfile),
    progressMetrics: buildProgressMetrics({
      completedLessons,
      totalAttempts: attempts.length,
      accuracy,
      masteredTopics,
      visualizationSessions,
      activeMistakes: activeMistakes.length
    }),
    weeklyActivity,
    masteryAreas,
    weakTopics,
    recentActivity,
    totalMinutes,
    contentUnavailable: contentUnavailableForProfile(curriculumProfile, grade)
  };
}

function upsertMistakeFromAttempt(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  question: QuestionRecord,
  selectedAnswer: string,
  now: string
) {
  const existing = mistakeRowsFor(database).find(
    (mistake) => mistake.user_id === userId && mistake.question_id === question.id
  );

  if (existing) {
    existing.last_selected_answer = selectedAnswer;
    existing.correct_answer = question.answer;
    existing.wrong_attempts += 1;
    existing.last_attempt_at = now;
    existing.mastered = false;
    return;
  }

  mistakeRowsFor(database).unshift({
    user_id: userId,
    question_id: question.id,
    last_selected_answer: selectedAnswer,
    correct_answer: question.answer,
    wrong_attempts: 1,
    first_wrong_at: now,
    last_attempt_at: now,
    mastered: false
  });
}

function markExistingMistakeMasteredFromAttempt(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  questionId: string,
  now: string
) {
  const existing = mistakeRowsFor(database).find(
    (mistake) => mistake.user_id === userId && mistake.question_id === questionId
  );

  if (existing) {
    existing.last_attempt_at = now;
    existing.mastered = true;
  }
}

function toMistakeBookItem(
  database: StudentActivityPersistenceDatabase,
  mistake: MistakeRecordRow
): MistakeBookItem | null {
  const question = questionForId(database, mistake.question_id);
  if (!question) return null;

  return {
    questionId: mistake.question_id,
    lastSelectedAnswer: mistake.last_selected_answer,
    correctAnswer: mistake.correct_answer,
    wrongAttempts: mistake.wrong_attempts,
    firstWrongAt: mistake.first_wrong_at,
    lastAttemptAt: mistake.last_attempt_at,
    mastered: mistake.mastered,
    question: toPublicQuestion(database, question),
    explanation: {
      en: question.explanation_en,
      zh: question.explanation_zh
    }
  };
}

export const studentActivityToMistakeBookItem = toMistakeBookItem;

function teachingResourceReferenceCountsForDatabase(
  database: StudentActivityPersistenceDatabase,
  resourceId: string
) {
  return {
    assignments: (database.assignments ?? []).filter((assignment) =>
      assignment.content_type === "resource" && assignment.target_id === resourceId
    ).length,
    assessments: (database.assessments ?? []).filter((assessment) =>
      assessment.source_resource_id === resourceId
    ).length,
    classroom: 0
  };
}

function teachingResourceForDatabase(
  database: StudentActivityPersistenceDatabase,
  record: StudentActivityTeachingResourceRecord
): TeachingResource {
  return {
    id: record.id,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    type: record.type,
    fileName: record.file_name,
    fileType: record.file_type,
    mimeType: record.mime_type,
    fileSizeBytes: record.file_size_bytes,
    storagePath: record.storage_path,
    grade: record.grade,
    topicId: record.topic_id,
    difficulty: record.difficulty,
    uploadedBy: record.uploaded_by,
    createdAt: record.created_at,
    referenceCounts: teachingResourceReferenceCountsForDatabase(database, record.id)
  };
}

async function resourceDownloadPayloadForDatabase(
  database: StudentActivityPersistenceDatabase,
  record: StudentActivityTeachingResourceRecord
): Promise<StudentActivityResourceDownloadData | null> {
  if (record.storage_path?.startsWith("seed://")) {
    const body = [
      `${record.title_en}`,
      "",
      "Seed resource placeholder.",
      `File name: ${record.file_name}`,
      `Grade: ${record.grade}`,
      record.topic_id ? `Topic: ${record.topic_id}` : ""
    ].filter(Boolean).join("\n");
    return {
      resource: teachingResourceForDatabase(database, record),
      bytes: Buffer.from(body, "utf8"),
      mimeType: "text/plain; charset=utf-8",
      fileName: record.file_name.replace(/\.[^.]+$/, ".txt")
    };
  }

  if (!record.storage_path) return null;

  try {
    return {
      resource: teachingResourceForDatabase(database, record),
      bytes: await readFile(record.storage_path),
      mimeType: record.mime_type || "application/octet-stream",
      fileName: record.file_name
    };
  } catch {
    return null;
  }
}

function resourceAssignmentItemForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  resourceId: string
): StudentResourceDetailData["assignment"] {
  const submission = (database.submissions ?? []).find((candidate) => {
    if (candidate.student_id !== userId) return false;
    const assignment = (database.assignments ?? []).find((item) => item.id === candidate.assignment_id);
    return assignment?.content_type === "resource" && assignment.target_id === resourceId;
  });
  if (!submission) return null;

  const assignment = (database.assignments ?? []).find((candidate) => candidate.id === submission.assignment_id);
  const teacherClass = assignment
    ? (database.teacher_classes ?? []).find((candidate) => candidate.id === assignment.class_id)
    : null;
  if (!assignment || !teacherClass) return null;

  return {
    assignment: assignmentForDatabase(database, assignment),
    submission: submissionForDatabase(database, submission),
    className: teacherClass.name,
    classGrade: teacherClass.grade
  };
}

function studentAssessmentAssignmentItemForDatabase(
  database: StudentActivityPersistenceDatabase,
  userId: string,
  assessmentId: string
): StudentAssessmentDetailData["assignment"] {
  const submission = (database.submissions ?? []).find((candidate) => {
    if (candidate.student_id !== userId) return false;
    const assignment = (database.assignments ?? []).find((item) => item.id === candidate.assignment_id);
    return assignment?.content_type === "assessment" && assignment.target_id === assessmentId;
  });
  if (!submission) return null;

  const assignment = (database.assignments ?? []).find((candidate) => candidate.id === submission.assignment_id);
  const teacherClass = assignment
    ? (database.teacher_classes ?? []).find((candidate) => candidate.id === assignment.class_id)
    : null;
  if (!assignment || !teacherClass) return null;

  return {
    assignment: assignmentForDatabase(database, assignment),
    submission: submissionForDatabase(database, submission),
    className: teacherClass.name,
    classGrade: teacherClass.grade
  };
}

export function createStudentActivityPersistenceStore({
  createId = randomUUID,
  contentUnavailableForProfile = () => null,
  dashboardContentUnavailableForProfile = contentUnavailableForProfile,
  defaultCurriculumTrack = "HK",
  translateLessonTextEn = (value) => value,
  getFastDashboardData = async () => undefined,
  getFastLessonEntryTarget = async () => undefined,
  logLessonEntryTargetPerf = () => undefined,
  now = () => new Date(),
  nowMs = () => Date.now(),
  topicMatchesCurriculum = topicMatchesCurriculumScope,
  clearDatabaseCache = () => undefined,
  afterUpdateLessonProgress,
  adaptiveLearningDecision = () => {
    throw new Error("Student activity adaptive decision dependency is not configured.");
  },
  refreshAdaptiveLearningRecommendation = () => {
    throw new Error("Student activity adaptive refresh dependency is not configured.");
  },
  readDatabase,
  readPublicDatabase = readDatabase,
  mutateDatabase,
  afterAppend,
  afterMarkMistakeMastered,
  afterMarkVisualizationSession,
  afterMarkResourceViewed,
  afterSubmitAssessment,
  questionAnswerMatches = defaultQuestionAnswerMatches,
  questionMatchesCurriculum = questionMatchesCurriculumScope,
  afterSubmitQuestionAttempt
}: StudentActivityPersistenceStoreDependencies) {
  const runMutation = async <T>(mutator: (database: StudentActivityPersistenceDatabase) => T | Promise<T>) => {
    if (!mutateDatabase) {
      throw new Error("Student activity persistence mutation dependency is not configured.");
    }
    return mutateDatabase(mutator);
  };

  const resolveLessonEntryTargetFromDatabase = (
    database: StudentActivityPersistenceDatabase,
    userId: string,
    grade: GradeId,
    curriculumTrack: StudentActivityCurriculumScope,
    startedAt: number
  ) => lessonEntryTargetForDatabase(database, userId, grade, curriculumTrack, startedAt, {
    topicMatchesCurriculum,
    logLessonEntryTargetPerf
  });

  const publicCatalogBackedLessonEntryTarget = async (
    target: LessonEntryTarget | null,
    userId: string,
    grade: GradeId,
    curriculumTrack: StudentActivityCurriculumScope,
    startedAt: number
  ) => {
    if (!target) return target;

    const publicDatabase = await readPublicDatabase();
    if (lessonEntryTargetExistsInDatabase(publicDatabase, target, curriculumTrack, topicMatchesCurriculum)) {
      return target;
    }

    return resolveLessonEntryTargetFromDatabase(publicDatabase, userId, grade, curriculumTrack, startedAt);
  };

  const buildStudentAssignments = (database: StudentActivityPersistenceDatabase, userId: string): StudentAssignmentItem[] => {
    return (database.submissions ?? [])
      .filter((submission) => submission.student_id === userId)
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      .map((submission) => {
        const assignment = (database.assignments ?? []).find((candidate) => candidate.id === submission.assignment_id);
        const teacherClass = assignment
          ? (database.teacher_classes ?? []).find((candidate) => candidate.id === assignment.class_id)
          : null;
        if (!assignment || !teacherClass) return null;
        return {
          assignment: assignmentForDatabase(database, assignment),
          submission: submissionForDatabase(database, submission),
          className: teacherClass.name,
          classGrade: teacherClass.grade
        };
      })
      .filter((item): item is StudentAssignmentItem => Boolean(item));
  };

  const buildStudentMessageThread = (
    database: StudentActivityPersistenceDatabase,
    thread: StudentActivityTeacherMessageRecord
  ): StudentMessageThread => {
    const classRecord = thread.class_id
      ? (database.teacher_classes ?? []).find((candidate) => candidate.id === thread.class_id)
      : null;
    return {
      ...teacherMessageForDatabase(database, thread),
      className: classRecord?.name,
      teacherName: userDisplayNameFor(database, thread.teacher_id, "Teacher"),
      messages: (database.teacher_message_entries ?? [])
        .filter((entry) => entry.thread_id === thread.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((entry) => teacherMessageEntryForDatabase(database, entry))
    };
  };

  return {
    async getDashboardData(
      userId: string,
      grade: GradeId,
      curriculumTrack: StudentActivityCurriculumScope = defaultCurriculumTrack
    ): Promise<DashboardData> {
      const fastDashboard = await getFastDashboardData(userId, grade, curriculumTrack);
      if (fastDashboard) return fastDashboard;

      const database = await readDatabase();
      return dashboardDataForDatabase(database, userId, grade, curriculumTrack, {
        contentUnavailableForProfile: dashboardContentUnavailableForProfile,
        now,
        topicMatchesCurriculum
      });
    },

    async getProgressData(
      userId: string,
      grade: GradeId,
      window?: string | null,
      curriculumTrack: StudentActivityCurriculumScope = defaultCurriculumTrack
    ): Promise<ProgressData> {
      const database = await readDatabase();
      return progressDataForDatabase(database, userId, grade, window, curriculumTrack, {
        contentUnavailableForProfile,
        now,
        topicMatchesCurriculum
      });
    },

    async getLessonBySlug(
      userId: string | null,
      slug: string,
      curriculumTrack: StudentActivityCurriculumScope = defaultCurriculumTrack
    ): Promise<LessonDetail | null> {
      const database = userId ? await readDatabase() : await readPublicDatabase();
      return lessonDetailForDatabase(database, userId, slug, curriculumTrack, {
        contentUnavailableForProfile,
        questionMatchesCurriculum,
        topicMatchesCurriculum,
        translateLessonTextEn
      });
    },

    async updateLessonProgress(input: StudentActivityUpdateLessonProgressInput): Promise<LessonSummary | null> {
      return runMutation(async (database) => {
        const curriculumTrack = input.curriculumTrack ?? defaultCurriculumTrack;
        const lesson = (database.lessons ?? []).find((candidate) => candidate.slug === input.slug);
        if (!lesson) return null;
        const topic = (database.topics ?? []).find((candidate) => candidate.id === lesson.topic_id);
        if (!topic || !topicMatchesCurriculum(topic, curriculumTrack)) return null;

        const updatedAt = now().toISOString();
        const existing = lessonProgressFor(database, input.userId, lesson);
        const nextChecklist = {
          ...(existing?.checklist_state ?? {}),
          ...(input.checklistState ?? {})
        };
        const nextDuration =
          typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds) && input.durationSeconds > 0
            ? Math.round(input.durationSeconds)
            : existing?.duration_seconds ?? null;
        const status: TopicStatus =
          input.action === "complete" ? "completed" : existing?.status === "completed" ? "completed" : "in-progress";
        const mastery =
          status === "completed"
            ? Math.max(existing?.mastery ?? 0, 100)
            : Math.max(existing?.mastery ?? 0, Object.values(nextChecklist).filter(Boolean).length * 15, 25);
        const progress: StudentActivityLessonProgressRecord = {
          user_id: input.userId,
          topic_id: lesson.topic_id,
          lesson_slug: lesson.slug,
          status,
          mastery: Math.min(100, mastery),
          started_at: existing?.started_at ?? updatedAt,
          completed_at: status === "completed" ? existing?.completed_at ?? updatedAt : null,
          duration_seconds: nextDuration,
          checklist_state: nextChecklist,
          updated_at: updatedAt
        };
        const progressRows = lessonProgressRowsFor(database);
        const progressIndex = progressRows.findIndex(
          (candidate) =>
            candidate.user_id === input.userId &&
            (candidate.lesson_slug === lesson.slug || candidate.topic_id === lesson.topic_id)
        );

        if (progressIndex >= 0) {
          progressRows[progressIndex] = progress;
        } else {
          progressRows.push(progress);
        }
        clearDatabaseCache(database);

        if (status === "completed") {
          await afterUpdateLessonProgress?.(database, {
            userId: input.userId,
            lesson,
            progress,
            existingProgress: existing,
            firstCompletion: existing?.status !== "completed",
            updatedAt
          });
        }

        return lessonSummaryForDatabase(database, input.userId, lesson, translateLessonTextEn);
      });
    },

    async getRoadmapData(
      userId: string | null,
      grade?: GradeId,
      curriculumTrack: StudentActivityCurriculumScope = defaultCurriculumTrack
    ): Promise<RoadmapData> {
      const database = userId ? await readDatabase() : await readPublicDatabase();
      return roadmapDataForDatabase(database, userId, grade, curriculumTrack, {
        contentUnavailableForProfile,
        topicMatchesCurriculum,
        translateLessonTextEn
      });
    },

    async getAdaptiveLearningDecision(
      input: StudentActivityAdaptiveLearningInput
    ): Promise<AdaptiveLearningDecision | null> {
      return adaptiveLearningDecision({
        ...input,
        curriculumTrack: input.curriculumTrack ?? defaultCurriculumTrack
      });
    },

    async refreshAdaptiveLearningRecommendation(
      input: StudentActivityAdaptiveLearningInput
    ): Promise<StudentActivityAdaptiveRefreshResult> {
      return refreshAdaptiveLearningRecommendation({
        ...input,
        curriculumTrack: input.curriculumTrack ?? defaultCurriculumTrack
      });
    },

    async getLessonEntryTarget(
      userId: string,
      grade: GradeId,
      curriculumTrack: StudentActivityCurriculumScope = defaultCurriculumTrack,
      databaseOverride?: StudentActivityPersistenceDatabase
    ): Promise<LessonEntryTarget | null> {
      const startedAt = nowMs();
      if (!databaseOverride) {
        const fastTarget = await getFastLessonEntryTarget(userId, grade, curriculumTrack);
        if (fastTarget !== undefined) {
          if (fastTarget === null) {
            const publicTarget = resolveLessonEntryTargetFromDatabase(
              await readPublicDatabase(),
              userId,
              grade,
              curriculumTrack,
              startedAt
            );
            if (publicTarget) return publicTarget;
          } else {
            const catalogBackedFastTarget = await publicCatalogBackedLessonEntryTarget(fastTarget, userId, grade, curriculumTrack, startedAt);
            if (catalogBackedFastTarget === fastTarget) {
              logLessonEntryTargetPerf("getLessonEntryTarget(fast)", startedAt);
            }
            return catalogBackedFastTarget;
          }
        }
      }

      const database = databaseOverride ?? await readDatabase();
      const databaseTarget = resolveLessonEntryTargetFromDatabase(database, userId, grade, curriculumTrack, startedAt);
      return databaseOverride
        ? databaseTarget
        : publicCatalogBackedLessonEntryTarget(databaseTarget, userId, grade, curriculumTrack, startedAt);
    },

    async getLessonEntryTargetForLogin(
      userId: string,
      grade: GradeId,
      curriculumTrack: StudentActivityCurriculumScope = defaultCurriculumTrack,
      databaseOverride?: StudentActivityPersistenceDatabase
    ): Promise<LessonEntryTarget | null> {
      const startedAt = nowMs();
      if (databaseOverride) {
        return resolveLessonEntryTargetFromDatabase(databaseOverride, userId, grade, curriculumTrack, startedAt);
      }

      const fastTarget = await getFastLessonEntryTarget(userId, grade, curriculumTrack);
      if (fastTarget !== undefined) {
        if (fastTarget === null) {
          const publicTarget = resolveLessonEntryTargetFromDatabase(
            await readPublicDatabase(),
            userId,
            grade,
            curriculumTrack,
            startedAt
          );
          if (publicTarget) return publicTarget;
        } else {
          const catalogBackedFastTarget = await publicCatalogBackedLessonEntryTarget(fastTarget, userId, grade, curriculumTrack, startedAt);
          if (catalogBackedFastTarget === fastTarget) {
            logLessonEntryTargetPerf("getLessonEntryTarget(login-fast)", startedAt);
          }
          return catalogBackedFastTarget;
        }
      }

      const database = await readDatabase();
      const databaseTarget = resolveLessonEntryTargetFromDatabase(database, userId, grade, curriculumTrack, startedAt);
      return publicCatalogBackedLessonEntryTarget(databaseTarget, userId, grade, curriculumTrack, startedAt);
    },

    async getPublicQuestions(filters: PublicQuestionFilters) {
      const database = await readPublicDatabase();
      const curriculumProfile =
        filters.curriculumProfile ?? curriculumProfileForTrack(filters.curriculumTrack ?? defaultCurriculumTrack);
      if (filters.grade && contentUnavailableForProfile(curriculumProfile, filters.grade)) return [];

      return (database.questions ?? [])
        .filter((question) => {
          const curriculumTrackMatches = questionMatchesCurriculumProfile(question, curriculumProfile);
          const gradeMatches = !filters.grade || question.grade === filters.grade;
          const topicMatches = !filters.topicId || question.topic_id === filters.topicId;
          const difficultyMatches = difficultyMatchesActiveFilter(question.difficulty, filters.difficulty);
          return curriculumTrackMatches && gradeMatches && topicMatches && difficultyMatches;
        })
        .map((question) => toPublicQuestion(database, question));
    },
    async submitQuestionAttempt({
      userId,
      questionId,
      selectedAnswer,
      durationSeconds,
      curriculumTrack = defaultCurriculumTrack
    }: {
      userId: string;
      questionId: string;
      selectedAnswer: string;
      durationSeconds?: number;
      curriculumTrack?: StudentActivityCurriculumScope;
    }): Promise<AttemptFeedback | null> {
      return runMutation(async (database) => {
        const question = questionForId(database, questionId);
        if (!question) return null;
        if (!questionMatchesCurriculum(question, curriculumTrack)) return null;

        const submittedAt = now().toISOString();
        const correct = questionAnswerMatches(question, selectedAnswer);
        const attempt: StudentActivityAttemptRecord = {
          id: createId(),
          user_id: userId,
          question_id: question.id,
          selected_answer: selectedAnswer,
          is_correct: correct,
          duration_seconds:
            typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0
              ? Math.round(durationSeconds)
              : null,
          created_at: submittedAt
        };

        attemptRowsFor(database).push(attempt);
        if (correct) {
          markExistingMistakeMasteredFromAttempt(database, userId, question.id, submittedAt);
        } else {
          upsertMistakeFromAttempt(database, userId, question, selectedAnswer, submittedAt);
        }
        await afterSubmitQuestionAttempt?.(database, {
          userId,
          question,
          attempt,
          selectedAnswer,
          correct,
          now: submittedAt
        });

        return {
          correct,
          explanation: {
            en: question.explanation_en,
            zh: question.explanation_zh
          },
          correctAnswer: correct ? undefined : question.answer
        };
      });
    },
    async getMistakes(userId: string, status?: "active" | "mastered") {
      const database = await readDatabase();

      return (database.mistakes ?? [])
        .filter((mistake) => {
          const userMatches = mistake.user_id === userId;
          const statusMatches =
            !status ||
            (status === "active" && !mistake.mastered) ||
            (status === "mastered" && mistake.mastered);
          return userMatches && statusMatches;
        })
        .sort((a, b) => Number(a.mastered) - Number(b.mastered) || b.last_attempt_at.localeCompare(a.last_attempt_at))
        .map((mistake) => toMistakeBookItem(database, mistake))
        .filter((mistake): mistake is MistakeBookItem => Boolean(mistake));
    },
    async markMistakeMastered(userId: string, questionId: string) {
      return runMutation(async (database) => {
        const existing = mistakeRowsFor(database).find(
          (mistake) => mistake.user_id === userId && mistake.question_id === questionId
        );
        if (!existing) return null;

        const wasMastered = existing.mastered;
        existing.mastered = true;
        const masteredAt = now().toISOString();
        existing.last_attempt_at = masteredAt;

        const question = questionForId(database, questionId);
        if (!wasMastered) {
          await afterMarkMistakeMastered?.(database, {
            userId,
            questionId,
            question,
            topic: question ? topicForId(database, question.topic_id) : null,
            masteredAt
          });
        }

        return toMistakeBookItem(database, existing);
      });
    },
    async deleteMistake(userId: string, questionId: string) {
      return runMutation((database) => {
        const previousLength = mistakeRowsFor(database).length;
        database.mistakes = mistakeRowsFor(database).filter(
          (mistake) => !(mistake.user_id === userId && mistake.question_id === questionId)
        );

        return database.mistakes.length !== previousLength;
      });
    },
    async clearMistakesForUser(userId: string) {
      await runMutation((database) => {
        database.mistakes = mistakeRowsFor(database).filter((mistake) => mistake.user_id !== userId);
      });
    },
    async appendLearningEvents(userId: string, events: LearningAnalyticsEvent[]) {
      return runMutation(async (database) => {
        const learningEvents = learningEventsFor(database);
        const visualizationEvents = visualizationEventsFor(database);
        const existingIds = new Set(learningEvents.map((event) => event.id));
        const clearedAt = learningEventClearsFor(database).find((clear) => clear.user_id === userId)?.cleared_at;
        const clearedAtMs = clearedAt ? new Date(clearedAt).getTime() : null;
        const records = events
          .filter((event) => {
            if (existingIds.has(event.id)) return false;
            if (clearedAtMs === null) return true;
            return new Date(event.timestamp).getTime() > clearedAtMs;
          })
          .map((event) => analyticsEventToRecord(userId, event, createId));

        records.forEach((record) => {
          learningEvents.push(record);
          if (isVisualizationEvent(record.type)) {
            visualizationEvents.push({
              id: record.id,
              user_id: userId,
              topic_id: record.topic_id,
              source: record.source,
              created_at: record.created_at
            });
          }
        });

        if (records.length) {
          const latestRecord = records.reduce((latest, record) =>
            Date.parse(record.created_at) > Date.parse(latest.created_at) ? record : latest
          );
          await afterAppend?.(database, { userId, records, latestRecord });
        }

        return records.length;
      });
    },
    async clearLearningEventsForUser(userId: string, clearedAt = now().toISOString()) {
      await runMutation((database) => {
        database.learning_events = learningEventsFor(database).filter((event) => event.user_id !== userId);
        database.visualization_events = visualizationEventsFor(database).filter((event) => event.user_id !== userId);
        database.learning_event_clears = [
          ...learningEventClearsFor(database).filter((clear) => clear.user_id !== userId),
          { user_id: userId, cleared_at: clearedAt }
        ];
      });
    },
    async getAnalyticsSummary(
      userId: string,
      window?: string | null,
      grade?: GradeId
    ): Promise<LearningAnalyticsSummary> {
      const database = await readDatabase();
      const windowDays = windowDaysFrom(window);
      const events = (database.learning_events ?? [])
        .filter((event) => event.user_id === userId && (!grade || event.grade === grade))
        .map(eventRecordToAnalyticsEvent);

      return summarizeLearningAnalytics(events, { now: now(), windowDays });
    },
    async getAnalyticsExport(
      userId: string,
      grade: GradeId,
      window?: string | null
    ): Promise<LearningAnalyticsExportSummary> {
      const database = await readDatabase();
      const windowDays = windowDaysFrom(window);
      const events = (database.learning_events ?? [])
        .filter((event) => event.user_id === userId && event.grade === grade)
        .map(eventRecordToAnalyticsEvent);

      return exportLearningAnalyticsSummary({ events, studentId: userId, grade, now: now(), windowDays });
    },
    async markVisualizationSession({
      userId,
      moduleId,
      topicId,
      source
    }: {
      userId: string;
      moduleId: string;
      topicId: string;
      source: LearningAnalyticsEvent["source"];
    }) {
      return runMutation(async (database) => {
        const updatedAt = now().toISOString();
        const sessions = visualizationSessionsFor(database);
        let session = sessions.find(
          (candidate) => candidate.user_id === userId && candidate.module_id === moduleId
        );
        const wasCompleted = Boolean(session?.completed_at);

        if (session) {
          session.topic_id = topicId;
          session.source = source;
          session.explored = true;
          session.completed_at = session.completed_at ?? updatedAt;
          session.updated_at = updatedAt;
        } else {
          session = {
            user_id: userId,
            module_id: moduleId,
            topic_id: topicId,
            source,
            explored: true,
            completed_at: updatedAt,
            updated_at: updatedAt
          };
          sessions.push(session);
        }

        const completedAt = session.completed_at ?? updatedAt;
        const afterMarkResult = afterMarkVisualizationSession?.(database, {
          userId,
          moduleId,
          topicId,
          source,
          wasCompleted,
          completedAt,
          updatedAt,
          session: { ...session }
        });
        if (afterMarkResult && typeof afterMarkResult.then === "function") {
          void afterMarkResult.catch((error) => {
            console.error("Visualization session side effect failed.", error);
          });
        }

        return session;
      });
    },
    async listVisualizationSessionsForUser(userId: string) {
      const database = await readDatabase();

      return visualizationSessionsFor(database)
        .filter((session) => session.user_id === userId)
        .map((session) => ({
          moduleId: session.module_id,
          topicId: session.topic_id,
          source: session.source,
          explored: session.explored,
          completedAt: session.completed_at,
          updatedAt: session.updated_at
        }));
    },
    async getStudentAssignments(userId: string): Promise<StudentAssignmentItem[]> {
      const database = await readDatabase();

      return buildStudentAssignments(database, userId);
    },
    async getStudentMessagesData(userId: string, selectedThreadId?: string | null): Promise<StudentMessagesData> {
      const database = await readDatabase();
      const classRecords = (database.class_enrollments ?? [])
        .filter((enrollment) => enrollment.student_id === userId)
        .map((enrollment) => (database.teacher_classes ?? []).find((teacherClass) => teacherClass.id === enrollment.class_id))
        .filter((teacherClass): teacherClass is StudentActivityTeacherClassRecord => Boolean(teacherClass));
      const threads = (database.teacher_messages ?? [])
        .filter((thread) => thread.student_id === userId && !thread.guardian_id)
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
        .map((thread) => buildStudentMessageThread(database, thread));
      const selectedThread =
        threads.find((thread) => thread.id === selectedThreadId) ??
        threads[0] ??
        null;

      return {
        threads,
        selectedThread,
        classes: classRecords.map((teacherClass) => teacherClassForDatabase(database, teacherClass)),
        assignments: buildStudentAssignments(database, userId)
      };
    },
    async createStudentMessageThread({
      studentId,
      classId,
      assignmentId,
      topicId,
      subject,
      body,
      priority = "normal"
    }: {
      studentId: string;
      classId?: string | null;
      assignmentId?: string | null;
      topicId?: string | null;
      subject: string;
      body: string;
      priority?: TeacherMessagePriority;
    }): Promise<
      | { status: "created"; thread: StudentMessageThread }
      | { status: "invalid" }
      | { status: "not-found" }
    > {
      const trimmedSubject = subject.trim();
      const trimmedBody = body.trim();
      if (!trimmedSubject || !trimmedBody) return { status: "invalid" };

      return runMutation((database) => {
        const enrolledClassIds = studentClassIds(database, studentId);
        const teacherClass = classId && enrolledClassIds.has(classId)
          ? (database.teacher_classes ?? []).find((candidate) => candidate.id === classId)
          : (database.teacher_classes ?? []).find((candidate) => enrolledClassIds.has(candidate.id));
        if (!teacherClass?.teacher_id) return { status: "not-found" };

        const assignment = assignmentId
          ? (database.assignments ?? []).find((candidate) =>
              candidate.id === assignmentId && candidate.class_id === teacherClass.id
            )
          : null;
        const cleanTopicId = topicId && topicMatchesTeacherClass(database, topicId, teacherClass)
          ? topicId
          : undefined;
        const timestamp = now().toISOString();
        const thread: StudentActivityTeacherMessageRecord = {
          id: `message-thread-${createId()}`,
          class_id: teacherClass.id,
          student_id: studentId,
          teacher_id: teacherClass.teacher_id,
          assignment_id: assignment?.id,
          topic_id: cleanTopicId,
          subject_en: trimmedSubject,
          subject_zh: trimmedSubject,
          latest_message: trimmedBody,
          status: "unread",
          priority,
          starred: false,
          last_message_at: timestamp,
          created_at: timestamp
        };
        database.teacher_messages ??= [];
        database.teacher_message_entries ??= [];
        database.teacher_messages.unshift(thread);
        database.teacher_message_entries.push({
          id: `message-entry-${createId()}`,
          thread_id: thread.id,
          sender_id: studentId,
          sender_role: "student",
          recipient_id: teacherClass.teacher_id,
          body: trimmedBody,
          attachments: [],
          created_at: timestamp
        });

        return { status: "created", thread: buildStudentMessageThread(database, thread) };
      });
    },
    async replyToStudentMessageThread({
      studentId,
      threadId,
      body
    }: {
      studentId: string;
      threadId: string;
      body: string;
    }): Promise<
      | { status: "sent"; thread: StudentMessageThread }
      | { status: "invalid" }
      | { status: "not-found" }
    > {
      const trimmedBody = body.trim();
      if (!trimmedBody) return { status: "invalid" };

      return runMutation((database) => {
        const thread = (database.teacher_messages ?? []).find(
          (candidate) => candidate.id === threadId && candidate.student_id === studentId && !candidate.guardian_id
        );
        if (!thread) return { status: "not-found" };

        const timestamp = now().toISOString();
        database.teacher_message_entries ??= [];
        database.teacher_message_entries.push({
          id: `message-entry-${createId()}`,
          thread_id: thread.id,
          sender_id: studentId,
          sender_role: "student",
          recipient_id: thread.teacher_id,
          body: trimmedBody,
          attachments: [],
          created_at: timestamp
        });
        thread.latest_message = trimmedBody;
        thread.status = "unread";
        thread.last_message_at = timestamp;
        return { status: "sent", thread: buildStudentMessageThread(database, thread) };
      });
    },
    async submitAssignmentWork({
      userId,
      assignmentId,
      answerText,
      imageDataUrl,
      imageObject,
      imageFileName,
      inputType,
      ocrResult,
      kind
    }: {
      userId: string;
      assignmentId: string;
      answerText?: string;
      imageDataUrl?: string;
      imageObject?: { objectKey?: string | null };
      imageFileName?: string;
      inputType?: AssignmentSubmissionInputType;
      ocrResult?: AssignmentSubmissionOcrResult | null;
      kind: AssignmentSubmissionAttemptKind;
    }): Promise<StudentAssignmentWorkSubmitResult> {
      const cleanAnswer = cleanAssignmentText(answerText);
      const cleanImage = cleanAssignmentImageDataUrl(imageDataUrl);
      const imageObjectKey = normalizeStoredMediaObjectKey(imageObject?.objectKey);
      const normalizedOcr = normalizeAssignmentOcrResult(ocrResult);
      if (!cleanAnswer && !cleanImage && !imageObjectKey && !normalizedOcr?.text) return { status: "invalid" };

      return runMutation((database) => {
        const assignment = (database.assignments ?? []).find((candidate) => candidate.id === assignmentId);
        const submission = (database.submissions ?? []).find(
          (candidate) => candidate.assignment_id === assignmentId && candidate.student_id === userId
        );
        const enrolled = assignment
          ? (database.class_enrollments ?? []).some(
              (enrollment) => enrollment.class_id === assignment.class_id && enrollment.student_id === userId
            )
          : false;
        if (!assignment || !submission?.id || !enrolled) return { status: "not-found" as const };
        if (assignment.status !== "active") return { status: "closed" as const };

        const attempts = assignmentSubmissionAttemptsFor(database);
        const correctionRound = attempts.filter((attempt) =>
          attempt.submission_id === submission.id && attempt.kind === "correction"
        ).length;
        if (kind === "correction") {
          if (submission.status !== "correction-required") return { status: "invalid-state" as const };
          if (correctionRound >= assignmentCorrectionMaxRounds) return { status: "max-corrections" as const };
        }

        const nowDate = now();
        const nowIso = nowDate.toISOString();
        const attemptNumber = attempts.filter((attempt) => attempt.submission_id === submission.id).length + 1;
        const attempt: StudentActivityAssignmentSubmissionAttemptRecord = {
          id: `assignment-attempt-${createId()}`,
          submission_id: submission.id,
          student_id: userId,
          attempt_number: attemptNumber,
          kind,
          input_type: inferAssignmentInputType(cleanAnswer, cleanImage ?? imageObjectKey, inputType),
          answer_text: cleanAnswer || normalizedOcr?.text || "",
          ...(cleanImage ? { image_data_url: cleanImage } : {}),
          ...(imageObjectKey ? { image_object_key: imageObjectKey } : {}),
          ...(imageFileName ? { image_file_name: imageFileName.slice(0, 180) } : {}),
          ocr_result: normalizedOcr ?? (cleanAnswer ? {
            text: cleanAnswer,
            confidence: null,
            provider: "none",
            accepted: true,
            alternatives: []
          } : null),
          submitted_at: nowIso
        };

        attempts.push(attempt);
        submission.status = kind === "correction"
          ? "correction-submitted"
          : assignment.due_at && Date.parse(assignment.due_at) < nowDate.getTime()
            ? "late"
            : "submitted";
        submission.score = kind === "correction" ? submission.score ?? null : null;
        submission.submitted_at = nowIso;
        submission.updated_at = nowIso;

        return { status: "submitted" as const, submission: submissionForDatabase(database, submission) };
      });
    },
    async getStudentResourceDetailData(userId: string, resourceId: string): Promise<StudentResourceDetailData | null> {
      const database = await readDatabase();
      const record = (database.teaching_resources ?? []).find((resource) => resource.id === resourceId);
      if (!record || !studentCanAccessResource(database, userId, resourceId)) return null;

      const assignment = resourceAssignmentItemForDatabase(database, userId, resourceId);
      return {
        resource: teachingResourceForDatabase(database, record),
        assignment,
        downloadUrl: `/api/resources/${encodeURIComponent(resourceId)}/download`,
        canMarkComplete: Boolean(assignment)
      };
    },
    async getStudentResourceDownloadData(userId: string, resourceId: string) {
      const database = await readDatabase();
      const record = (database.teaching_resources ?? []).find((resource) => resource.id === resourceId);
      if (!record || !studentCanAccessResource(database, userId, resourceId)) return null;

      return resourceDownloadPayloadForDatabase(database, record);
    },
    async markStudentResourceViewed(userId: string, resourceId: string) {
      return runMutation(async (database) => {
        const record = (database.teaching_resources ?? []).find((resource) => resource.id === resourceId);
        if (!record || !studentCanAccessResource(database, userId, resourceId)) return { status: "not-found" as const };

        const viewedAt = now().toISOString();
        await afterMarkResourceViewed?.(database, {
          userId,
          resourceId,
          viewedAt,
          resource: record
        });

        return {
          status: "viewed" as const,
          resource: teachingResourceForDatabase(database, record)
        };
      });
    },
    async getStudentAssessmentDetailData(
      userId: string,
      assessmentId: string
    ): Promise<StudentAssessmentDetailData | null> {
      const database = await readDatabase();
      const assessment = (database.assessments ?? []).find((candidate) => candidate.id === assessmentId);
      if (!assessment) return null;

      const teacherClass = (database.teacher_classes ?? []).find((candidate) => candidate.id === assessment.class_id);
      const enrolled = (database.class_enrollments ?? []).some(
        (enrollment) => enrollment.class_id === assessment.class_id && enrollment.student_id === userId
      );
      if (!teacherClass || !enrolled) return null;

      let submission = (database.assessment_submissions ?? []).find(
        (candidate) => candidate.assessment_id === assessmentId && candidate.student_id === userId
      );
      if (!submission && assessment.status === "draft") return null;
      if (!submission) {
        const createdAt = now().toISOString();
        const createdSubmission: StudentActivityAssessmentSubmissionRecord = {
          id: `assessment-submission-${createId()}`,
          assessment_id: assessment.id ?? assessmentId,
          student_id: userId,
          status: "not-started",
          attempt_number: 0,
          score: null,
          max_score: 100,
          submitted_at: null,
          graded_at: null,
          answers: [],
          updated_at: createdAt
        };
        await runMutation((mutable) => {
          const submissions = assessmentSubmissionsFor(mutable);
          if (!submissions.some((candidate) => candidate.id === createdSubmission.id)) {
            submissions.push(createdSubmission);
          }
        });
        submission = createdSubmission;
      }

      const availability = assessmentAvailability(assessment, now().getTime());
      const maxAttemptsReached = submission.attempt_number >= (assessment.max_attempts ?? 1) && isAssessmentSubmissionComplete(submission);
      const showAnswers = Boolean(assessment.show_answers_immediately) && isAssessmentSubmissionComplete(submission);
      const questionSections = studentAssessmentQuestionSectionsForDatabase(database, assessment, userId, showAnswers);
      const questions = questionSections.flatMap((section) => section.questions);

      return {
        assessment: assessmentForDatabase(database, assessment),
        className: teacherClass.name,
        questions,
        questionSections,
        submission: assessmentSubmissionForDatabase(database, submission),
        assignment: studentAssessmentAssignmentItemForDatabase(database, userId, assessmentId),
        canSubmit: availability.canSubmit && !maxAttemptsReached,
        unavailableReason: maxAttemptsReached
          ? { en: "Maximum attempts reached.", zh: "已達可嘗試次數上限。" }
          : availability.unavailableReason
      };
    },
    async submitStudentAssessment({
      userId,
      assessmentId,
      answers
    }: {
      userId: string;
      assessmentId: string;
      answers: Array<{ questionId: string; answer: string }>;
    }): Promise<StudentAssessmentSubmitResult> {
      return runMutation(async (database) => {
        const assessment = (database.assessments ?? []).find((candidate) => candidate.id === assessmentId);
        if (!assessment) return { status: "not-found" as const };
        const enrolled = (database.class_enrollments ?? []).some(
          (enrollment) => enrollment.class_id === assessment.class_id && enrollment.student_id === userId
        );
        if (!enrolled) return { status: "forbidden" as const };

        const availability = assessmentAvailability(assessment, now().getTime());
        if (!availability.canSubmit) return { status: "closed" as const };

        const submittedAt = now().toISOString();
        const submissions = assessmentSubmissionsFor(database);
        let submission = submissions.find(
          (candidate) => candidate.assessment_id === assessmentId && candidate.student_id === userId
        );
        if (!submission) {
          submission = {
            id: `assessment-submission-${createId()}`,
            assessment_id: assessmentId,
            student_id: userId,
            status: "not-started",
            attempt_number: 0,
            score: null,
            max_score: 100,
            submitted_at: null,
            graded_at: null,
            answers: [],
            updated_at: submittedAt
          };
          submissions.push(submission);
        }

        if (submission.attempt_number >= (assessment.max_attempts ?? 1) && isAssessmentSubmissionComplete(submission)) {
          return { status: "max-attempts" as const };
        }

        const answerByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.answer.trim()]));
        const scoredAnswers: AssessmentSubmissionAnswer[] = assessmentPaperItemsForRecord(assessment).map(({ item }) => {
          const selectedAnswer = answerByQuestionId.get(item.id) ?? "";
          const isCorrect = assessmentPaperItemMatchesAnswerForDatabase(
            database,
            item,
            selectedAnswer,
            questionAnswerMatches
          );
          return {
            questionId: item.id,
            answer: selectedAnswer,
            isCorrect,
            pointsEarned: isCorrect === null ? null : isCorrect ? item.points : 0,
            maxPoints: item.points
          };
        });
        const maxScore = scoredAnswers.reduce((sum, answer) => sum + answer.maxPoints, 0);
        const earned = scoredAnswers.reduce((sum, answer) => sum + (answer.pointsEarned ?? 0), 0);
        const percentage = maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0;

        submission.status = "graded";
        submission.attempt_number += 1;
        submission.score = earned;
        submission.max_score = maxScore;
        submission.submitted_at = submittedAt;
        submission.graded_at = submittedAt;
        submission.answers = scoredAnswers;
        submission.updated_at = submittedAt;

        await afterSubmitAssessment?.(database, {
          userId,
          assessmentId,
          submittedAt,
          score: percentage,
          graded: true
        });

        return {
          status: "submitted" as const,
          submission: assessmentSubmissionForDatabase(database, submission),
          assessment: assessmentForDatabase(database, assessment)
        };
      });
    }
  };
}
