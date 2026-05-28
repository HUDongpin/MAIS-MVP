import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "os";
import path from "path";
import postgres from "postgres";
import { dailyQuestDefinitions, gamificationEconomyVersion } from "@/data/gamification";
import { validGradeSet } from "@/data/grades";
import { translateHjbHighDisplayTextEn } from "@/data/mainlandHjbHighTopics";
import { productionLessonByTopicId, type ProductionLessonSeed } from "@/data/lessons";
import { questions as seedQuestions } from "@/data/questions";
import { topics as seedTopics } from "@/data/topics";
import { formatGradeLabel, textForLanguage } from "@/lib/i18n";
import { lessonHrefForSlug } from "@/lib/lessonLinks";
import { buildHongKongMathEvidencePack } from "@/lib/rag/hongKongMath";
import { buildMainlandHjbHighEvidencePack } from "@/lib/rag/mainlandHjbHigh";
import {
  buildMainlandHjbJuniorEvidencePack,
  isMainlandHjbHighGrade,
  isMainlandHjbJuniorGrade
} from "@/lib/rag/mainlandHjbJunior";
import { getMainlandPepEvidencePack } from "@/lib/rag/mainlandPep";
import { buildUnitedStatesMathEvidencePack } from "@/lib/rag/usMath";
import {
  awardedSourceKeys,
  buildQuestProgress,
  calculateHongKongStreak,
  economySummary,
  evaluateAntiAbuseEvent,
  gamificationRewardForSource,
  hongKongDayKey,
  levelForXp,
  rankLeaderboard,
  resolveStudentBadges,
  totalAwardedXp
} from "@/lib/gamification";
import { analyticsWindowDays, exportLearningAnalyticsSummary, summarizeLearningAnalytics } from "@/lib/learningAnalytics";
import {
  contentMatchesCurriculumProfile,
  curriculumProfilesEqual,
  curriculumProfileForTrack,
  curriculumTrackForProfile,
  defaultCurriculumProfile,
  normalizeStoredCurriculumProfile
} from "@/lib/curriculumProfile";
import {
  buildKnowledgeComponents,
  classifyAdaptiveLLMError,
  composeAdaptiveDecisionFromCandidate,
  createInitialAdaptiveSkillState,
  generateAdaptiveCandidates,
  selectNextAdaptiveAction,
  updateAdaptiveState,
  validateLLMAdaptiveRecommendation
} from "@/lib/adaptiveLearning";
import {
  boundedLLMNumber,
  buildLLMProviderRequestBody,
  extractLLMProviderFinishReason,
  extractLLMProviderReply,
  extractLLMProviderUsage,
  readLLMProviderConfig,
  type LLMProviderMessage
} from "@/lib/server/llmProvider";
import { normalizeAnswer, questionAnswerMatches } from "@/lib/server/answerGrading";
import type {
  AdaptiveLearningCandidate,
  AdaptiveLearningDecision,
  AdaptiveEngineErrorKind,
  AdaptiveLLMRecommendation,
  AdaptiveLLMStatus,
  AdaptiveSkillSummary,
  AdaptiveSkillState,
  AttemptFeedback,
  Assignment,
  AssignmentContentType,
  AssignmentStatus,
  Assessment,
  AssessmentManualQuestion,
  AssessmentSourceType,
  AssessmentStatus,
  AssessmentSubmission,
  AssessmentSubmissionAnswer,
  AssessmentSubmissionStatus,
  AssessmentType,
  ClassroomLiveSession,
  ClassEnrollment,
  CurriculumProfile,
  CurriculumRegion,
  CurriculumTrack,
  DashboardData,
  Difficulty,
  GamificationEvent,
  GamificationEventSource,
  GamificationEventStatus,
  GamificationSummary,
  GradeId,
  Language,
  LearningAnalyticsEvent,
  LearningAnalyticsExportSummary,
  LearningAnalyticsSummary,
  LessonBlock,
  LessonBlockType,
  LessonDetail,
  LessonEntryTarget,
  LessonSummary,
  LocalizedText,
  MistakeBookItem,
  GuardianLink,
  GuardianLinkStatus,
  GuardianRelationship,
  ParentChildSummary,
  ParentFoundationData,
  ParentMessageCategory,
  ParentMessagesData,
  ParentMessageThread,
  ParentReportData,
  ProgressData,
  ProvisioningBatch,
  ProvisioningCredential,
  ProvisioningImportClass,
  ProvisioningImportSchool,
  ProvisioningImportStudent,
  ProvisioningImportTeacher,
  ProvisioningRequest,
  ProvisioningRowAction,
  ProvisioningRowResult,
  ProvisioningRowStatus,
  ProvisioningRowType,
  ProvisioningTotals,
  ProvisioningValidationResult,
  PublicQuestion,
  QuestionDiagram,
  QuestionType,
  RecentActivityItem,
  RewardCatalogCategory,
  RewardCatalogItem,
  RewardCampaign,
  RewardCampaignStatus,
  RewardEarnRule,
  RewardPointLedgerEntry,
  RewardPointReason,
  RewardPointSummary,
  RewardRedemptionRequest,
  RewardRedemptionStatus,
  RoadmapData,
  School,
  SchoolMembership,
  SchoolMembershipRole,
  WeeklyActivity,
  StudentSession,
  StudentRewardsData,
  StudentAssessmentDetailData,
  StudentAssessmentQuestion,
  Submission,
  SubmissionStatus,
  StudentMessagesData,
  StudentMessageThread,
  StudentResourceDetailData,
  TeacherActionQueueItem,
  TeacherAnalyticsData,
  TeacherAnalyticsFrequentMistake,
  TeacherAnalyticsInterventionGroup,
  TeacherAnalyticsStudentRisk,
  TeacherAnalyticsTopicCell,
  TeacherAnalyticsTrendPoint,
  TeacherClassDashboardSummary,
  TeacherClass,
  TeacherClassDetailData,
  TeacherClassStudentSummary,
  TeacherDashboardData,
  TeacherFoundationData,
  TeacherGamificationData,
  TeacherInboxData,
  TeacherInboxThread,
  TeacherInterventionAction,
  TeacherLiveData,
  TeacherLivePrompt,
  TeacherLivePromptOption,
  TeacherLivePromptType,
  TeacherLiveSession,
  TeacherLiveResponseSummary,
  TeacherLiveSessionStatus,
  TeacherMessageAttachment,
  TeacherMessageEntry,
  TeacherMasteryHeatmapCell,
  TeacherMessage,
  TeacherMessagePriority,
  TeacherMessageSenderRole,
  TeacherMessageStatus,
  TeacherRewardsData,
  TeacherReport,
  TeacherReportLanguage,
  TeacherReportPreview,
  TeacherReportsData,
  TeacherReportTarget,
  TeacherReportType,
  TeacherAssignmentDetailData,
  TeacherAssessmentCreateData,
  TeacherAssessmentDetailData,
  TeacherAssessmentListData,
  TeacherAssessmentQuestionAnalytics,
  TeacherAssessmentScoreBucket,
  TeacherStudentProfileData,
  TeacherStudentRiskTag,
  TeacherResourceLibraryData,
  TeachingResource,
  TeachingResourceType,
  TextbookPublisher,
  StudentAssignmentItem,
  StudentAvatarId,
  ThemeMode,
  KnowledgeComponent,
  Topic,
  TopicStatus
} from "@/types";

export type UserRole = "student" | "teacher" | "parent" | "admin";

export type UserRecord = {
  id: string;
  username: string;
  normalized_username: string;
  email?: string;
  normalized_email?: string;
  password_hash: string;
  password_salt: string;
  school_id?: string;
  password_must_change?: boolean;
  role: UserRole;
  created_at: string;
};

export type StudentProfileRecord = {
  user_id: string;
  name: string;
  grade: GradeId;
  curriculum_track?: CurriculumTrack;
  curriculum_region?: CurriculumRegion;
  textbook_publisher?: TextbookPublisher;
  avatar_id?: StudentAvatarId;
  avatar_image_data_url?: string;
};

export type UserSettingsRecord = {
  user_id: string;
  language: Language;
  theme: ThemeMode;
  selected_grade: GradeId;
  updated_at: string;
};

export type GuardianLinkRecord = {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: GuardianRelationship;
  status: GuardianLinkStatus;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PasswordResetTokenRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type QuestionRecord = {
  id: string;
  curriculum_track: CurriculumTrack;
  curriculum_region?: CurriculumRegion;
  textbook_publisher?: TextbookPublisher;
  canonical_topic_id?: string;
  grade: GradeId;
  topic_id: string;
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
};

export type TopicRecord = {
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

export type LessonRecord = {
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

export type LessonBlockRecord = {
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

export type AttemptRecord = {
  id: string;
  user_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  duration_seconds: number | null;
  created_at: string;
};

export type MistakeRecordRow = {
  user_id: string;
  question_id: string;
  last_selected_answer: string;
  correct_answer: string;
  wrong_attempts: number;
  first_wrong_at: string;
  last_attempt_at: string;
  mastered: boolean;
};

export type LessonProgressRecord = {
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

export type AdaptiveSkillStateRecord = {
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

export type AdaptiveRecommendationCacheRecord = {
  id: string;
  user_id: string;
  grade: GradeId;
  topic_id: string | null;
  candidate_signature: string;
  status: AdaptiveLLMStatus;
  selected_candidate_id: string | null;
  question_ids: string[];
  recommendation_json: AdaptiveLLMRecommendation | null;
  provider: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  error: string | null;
  error_kind: AdaptiveEngineErrorKind | null;
  finish_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type VisualizationEventRecord = {
  id: string;
  user_id: string;
  topic_id: string;
  source: string;
  created_at: string;
};

export type LearningEventRecord = {
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

export type LearningEventClearRecord = {
  user_id: string;
  cleared_at: string;
};

export type VisualizationSessionRecord = {
  user_id: string;
  module_id: string;
  topic_id: string;
  source: LearningAnalyticsEvent["source"];
  explored: boolean;
  completed_at: string | null;
  updated_at: string;
};

export type AITutorMessageRecord = {
  id: string;
  user_id: string;
  role: "student" | "tutor";
  content: string;
  context_json: Record<string, unknown> | null;
  created_at: string;
};

export type AITutorUsageRecord = {
  id: string;
  user_id: string;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  error: string | null;
  created_at: string;
};

export type TeacherClassRecord = {
  id: string;
  teacher_id: string;
  school_id?: string;
  class_code?: string;
  name: string;
  grade: GradeId;
  academic_year: string;
  description_en: string;
  description_zh: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

export type ClassEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

export type SchoolRecord = {
  id: string;
  code: string;
  normalized_code: string;
  name: string;
  academic_year: string;
  contact_name?: string;
  contact_email?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SchoolMembershipRecord = {
  id: string;
  school_id: string;
  user_id: string;
  role: SchoolMembershipRole;
  class_id?: string;
  created_at: string;
};

export type ProvisioningBatchRecord = {
  id: string;
  school_id: string;
  status: "created" | "failed";
  requested_by: string;
  totals: ProvisioningTotals;
  row_result_ids: string[];
  created_at: string;
  updated_at: string;
};

export type ProvisioningRowResultRecord = {
  id: string;
  batch_id?: string;
  type: ProvisioningRowType;
  row_index: number;
  status: ProvisioningRowStatus;
  action: ProvisioningRowAction;
  errors: string[];
  warnings: string[];
  school_id?: string;
  class_id?: string;
  user_id?: string;
  class_code?: string;
  username?: string;
  name?: string;
  role?: SchoolMembershipRole;
  temporary_password?: string;
};

export type AssignmentRecord = {
  id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
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

export type SubmissionRecord = {
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

export type TeacherMessageRecord = {
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

export type TeacherMessageEntryRecord = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: TeacherMessageSenderRole;
  recipient_id: string;
  body: string;
  attachments: TeacherMessageAttachment[];
  created_at: string;
};

export type TeachingResourceRecord = {
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

export type AssessmentRecord = {
  id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  type: AssessmentType;
  status: AssessmentStatus;
  source_type: AssessmentSourceType;
  source_resource_id?: string;
  question_ids: string[];
  manual_questions: AssessmentManualQuestion[];
  opens_at: string | null;
  closes_at: string | null;
  time_limit_minutes: number | null;
  max_attempts: number;
  randomize_question_order: boolean;
  show_answers_immediately: boolean;
  grade_weight: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AssessmentSubmissionRecord = {
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

export type TeacherReportRecord = {
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

export type TeacherLiveSessionRecord = {
  id: string;
  class_id: string;
  teacher_id: string;
  status: TeacherLiveSessionStatus;
  title_en: string;
  title_zh: string;
  lesson_slug?: string;
  lesson_title_en: string;
  lesson_title_zh: string;
  topic_id?: string;
  topic_title_en?: string;
  topic_title_zh?: string;
  visualization_title_en: string;
  visualization_title_zh: string;
  join_code: string;
  current_prompt_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TeacherLivePromptRecord = {
  id: string;
  session_id: string;
  type: TeacherLivePromptType;
  question_en: string;
  question_zh: string;
  options: TeacherLivePromptOption[];
  correct_option_id?: string;
  created_at: string;
};

export type TeacherLiveResponseRecord = {
  id: string;
  session_id: string;
  prompt_id: string;
  student_id: string;
  answer: string;
  is_correct: boolean | null;
  submitted_at: string;
};

export type RewardCatalogRecord = {
  id: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  category: RewardCatalogCategory;
  points_cost: number;
  available: boolean;
  accent: string;
  thumbnail_label: string;
  sort_order: number;
};

export type RewardPointLedgerRecord = {
  id: string;
  student_id: string;
  amount: number;
  reason: RewardPointReason;
  label_en: string;
  label_zh: string;
  note?: string;
  awarded_by?: string;
  redemption_id?: string;
  source_key?: string;
  created_at: string;
};

export type RewardRedemptionRecord = {
  id: string;
  student_id: string;
  item_id: string;
  points_cost: number;
  status: RewardRedemptionStatus;
  requested_at: string;
  decided_at: string | null;
  fulfilled_at: string | null;
  decided_by?: string;
  teacher_note?: string;
};

export type GamificationEventRecord = {
  id: string;
  student_id: string;
  xp: number;
  reward_points: number;
  source: GamificationEventSource;
  source_key: string;
  label_en: string;
  label_zh: string;
  status: GamificationEventStatus;
  anti_abuse_flags: string[];
  economy_version: string;
  campaign_id?: string;
  created_at: string;
};

export type RewardCampaignRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  status: RewardCampaignStatus;
  budget_points: number;
  awarded_points: number;
  quest_ids: string[];
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

type Database = {
  users: UserRecord[];
  student_profiles: StudentProfileRecord[];
  user_settings: UserSettingsRecord[];
  schools: SchoolRecord[];
  school_memberships: SchoolMembershipRecord[];
  provisioning_batches: ProvisioningBatchRecord[];
  provisioning_row_results: ProvisioningRowResultRecord[];
  guardian_links: GuardianLinkRecord[];
  password_reset_tokens: PasswordResetTokenRecord[];
  topics: TopicRecord[];
  lessons: LessonRecord[];
  lesson_blocks: LessonBlockRecord[];
  questions: QuestionRecord[];
  attempts: AttemptRecord[];
  mistakes: MistakeRecordRow[];
  lesson_progress: LessonProgressRecord[];
  adaptive_skill_state: AdaptiveSkillStateRecord[];
  adaptive_recommendation_cache: AdaptiveRecommendationCacheRecord[];
  visualization_events: VisualizationEventRecord[];
  learning_events: LearningEventRecord[];
  learning_event_clears: LearningEventClearRecord[];
  visualization_sessions: VisualizationSessionRecord[];
  ai_tutor_messages: AITutorMessageRecord[];
  ai_tutor_usage: AITutorUsageRecord[];
  teacher_classes: TeacherClassRecord[];
  class_enrollments: ClassEnrollmentRecord[];
  assignments: AssignmentRecord[];
  submissions: SubmissionRecord[];
  teacher_messages: TeacherMessageRecord[];
  teacher_message_entries: TeacherMessageEntryRecord[];
  teaching_resources: TeachingResourceRecord[];
  assessments: AssessmentRecord[];
  assessment_submissions: AssessmentSubmissionRecord[];
  teacher_reports: TeacherReportRecord[];
  teacher_live_sessions: TeacherLiveSessionRecord[];
  teacher_live_prompts: TeacherLivePromptRecord[];
  teacher_live_responses: TeacherLiveResponseRecord[];
  reward_catalog: RewardCatalogRecord[];
  reward_point_ledger: RewardPointLedgerRecord[];
  reward_redemptions: RewardRedemptionRecord[];
  gamification_events: GamificationEventRecord[];
  reward_campaigns: RewardCampaignRecord[];
};

type DatabaseIndexes = {
  topicById: Map<string, TopicRecord>;
  questionById: Map<string, QuestionRecord>;
  lessonBySlug: Map<string, LessonRecord>;
  lessonByTopicId: Map<string, LessonRecord>;
  lessonsByCanonicalTopicId: Map<string, LessonRecord[]>;
  lessonBlocksBySlug: Map<string, LessonBlockRecord[]>;
  lessonProgressByUserTopicId: Map<string, LessonProgressRecord>;
  lessonProgressByUserSlug: Map<string, LessonProgressRecord>;
};

export type UserSettings = {
  language: Language;
  theme: ThemeMode;
  selectedGrade: GradeId;
};

export type AuthenticatedUser = {
  user: StudentSession;
  settings: UserSettings;
};

function defaultDbDirectory() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return path.join(tmpdir(), "hk-math-lab");
  }

  return path.join(process.cwd(), ".local");
}

const configuredDbPath = process.env.HK_MATH_DB_PATH ? path.resolve(process.env.HK_MATH_DB_PATH) : null;
const configuredStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER?.trim().toLowerCase();
const storageProvider = configuredStorageProvider === "postgres" ? "postgres" : "sqlite";
const postgresUrl = process.env.POSTGRES_URL?.trim() || null;
const dbDirectory = configuredDbPath
  ? path.dirname(configuredDbPath)
  : path.resolve(process.env.HK_MATH_DB_DIR ?? defaultDbDirectory());
const dbPath = configuredDbPath ?? path.join(dbDirectory, "hk-math-db.sqlite");
const legacyJsonDbPath = path.join(dbDirectory, "hk-math-db.json");
const stateRecordId = "primary";
const schemaVersion = 1;
const demoUserId = "student-peter";
const mainlandDemoUserId = "student-li-mainland";
const unitedStatesDemoUserId = "student-shirleen-us";
const demoTeacherId = "teacher-ms-chan";
const mainlandDemoTeacherId = "teacher-mainland-phoebe";
const unitedStatesDemoTeacherId = "teacher-scott-us";
const demoParentId = "parent-peter-family";
const displayedDemoPassword = "12345";

type DemoAccountSeed = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  grade: GradeId;
  curriculumTrack: CurriculumTrack;
  avatarId: StudentAvatarId;
};

const demoAccountSeeds: DemoAccountSeed[] = [
  {
    id: demoUserId,
    username: "HK Student Peter",
    email: "student.peter@example.edu.hk",
    role: "student",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "delta"
  },
  {
    id: mainlandDemoUserId,
    username: "Mainland Student Ludwig",
    email: "student.ludwig@example.edu.cn",
    role: "student",
    grade: "S4",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    avatarId: "delta"
  },
  {
    id: unitedStatesDemoUserId,
    username: "Student Shirleen",
    email: "student.shirleen@example.edu",
    role: "student",
    grade: "S3",
    curriculumTrack: "US_CA_MATH",
    avatarId: "pi"
  },
  {
    id: demoTeacherId,
    username: "HK Teacher Chan",
    email: "teacher.chan@example.edu.hk",
    role: "teacher",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "sigma"
  },
  {
    id: mainlandDemoTeacherId,
    username: "Mainland Teacher Phoebe",
    email: "teacher.phoebe@example.edu.cn",
    role: "teacher",
    grade: "S4",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    avatarId: "sigma"
  },
  {
    id: unitedStatesDemoTeacherId,
    username: "Teacher Scott",
    email: "teacher.scott@example.edu",
    role: "teacher",
    grade: "S3",
    curriculumTrack: "US_CA_MATH",
    avatarId: "sigma"
  },
  {
    id: demoParentId,
    username: "Peter's Parent",
    email: "parent.peter@example.edu.hk",
    role: "parent",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "theta"
  }
];

type BootstrapAdminInput = {
  username: string;
  email: string;
  name: string;
  password: string;
};

const validGrades = validGradeSet;
const validLanguages = new Set<Language>(["en", "zh", "zh-Hans"]);
const validThemes = new Set<ThemeMode>(["dark", "light"]);
const validDifficulties = new Set<Difficulty>(["Foundation", "Core", "Challenge", "Exam"]);
const validCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH"]);
const defaultCurriculumTrack: CurriculumTrack = "HK";
type CurriculumScope = CurriculumTrack | CurriculumProfile | undefined | null;
const defaultStudentAvatarId: StudentAvatarId = "delta";
const validStudentAvatarIds = new Set<StudentAvatarId>(["delta", "pi", "sigma", "theta", "function", "radical"]);
const maxStudentAvatarImageDataUrlLength = 900_000;
const studentAvatarImageDataUrlPattern = /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const validRewardCatalogCategories = new Set<RewardCatalogCategory>(["toy", "stationery", "learning-tool"]);

function isValidCurriculumTrack(value: unknown): value is CurriculumTrack {
  return validCurriculumTracks.has(value as CurriculumTrack);
}

function normalizeCurriculumTrack(value: unknown) {
  return isValidCurriculumTrack(value) ? value : undefined;
}

function curriculumProfileForScope(scope?: CurriculumScope): CurriculumProfile {
  if (typeof scope === "string") return curriculumProfileForTrack(scope);
  if (scope) return scope;
  return defaultCurriculumProfile;
}

function curriculumTrackForScope(scope?: CurriculumScope): CurriculumTrack {
  return curriculumTrackForProfile(curriculumProfileForScope(scope));
}

function isMainlandPepContentEnabled() {
  const configured = process.env.MAINLAND_PEP_CONTENT_ENABLED?.trim().toLowerCase();
  if (configured === "true" || configured === "1" || configured === "yes" || configured === "on") return true;
  if (configured === "false" || configured === "0" || configured === "no" || configured === "off") return false;
  return true;
}

function isMainlandPepProfile(profile: CurriculumProfile) {
  return profile.region === "MAINLAND" && profile.publisher === "MAINLAND_PEP";
}

function curriculumContentEnabledFor(profile: CurriculumProfile) {
  return !isMainlandPepProfile(profile) || isMainlandPepContentEnabled();
}

function profileForRecord(record: {
  curriculum_track?: CurriculumTrack | null;
  curriculum_region?: CurriculumRegion | null;
  textbook_publisher?: TextbookPublisher | null;
}) {
  return normalizeStoredCurriculumProfile({
    curriculumTrack: normalizeCurriculumTrack(record.curriculum_track),
    region: record.curriculum_region,
    publisher: record.textbook_publisher
  });
}

function curriculumProfileForUser(database: Database, userId?: string | null): CurriculumProfile {
  const profile = userId ? database.student_profiles.find((candidate) => candidate.user_id === userId) : null;
  return normalizeStoredCurriculumProfile({
    curriculumTrack: normalizeCurriculumTrack(profile?.curriculum_track),
    region: profile?.curriculum_region,
    publisher: profile?.textbook_publisher
  });
}

function curriculumProfileForClass(database: Database, teacherClass: TeacherClassRecord): CurriculumProfile {
  return curriculumProfileForUser(database, teacherClass.teacher_id);
}

function curriculumProfileForThread(database: Database, thread: TeacherMessageRecord): CurriculumProfile {
  const teacherClass = thread.class_id ? database.teacher_classes.find((candidate) => candidate.id === thread.class_id) : null;
  return teacherClass ? curriculumProfileForClass(database, teacherClass) : curriculumProfileForUser(database, thread.student_id);
}

function contentUnavailableFor(scope: CurriculumScope, grade?: GradeId): LocalizedText | null {
  const profile = curriculumProfileForScope(scope);
  if (profile.publisher === "MAINLAND_BNU") {
    return null;
  }

  if (isMainlandPepProfile(profile) && !isMainlandPepContentEnabled()) {
    return {
      en: "Mainland PEP mathematics content is not enabled for this deployment yet.",
      zh: "內地人教版數學內容尚未在此部署開放。",
      zhHans: "内地人教版数学内容尚未在此部署开放。"
    };
  }

  if (profile.region !== "MAINLAND") return null;
  return null;
}
const validRewardPointReasons = new Set<RewardPointReason>([
  "lesson-complete",
  "practice-accuracy",
  "streak",
  "visualization-complete",
  "mistake-review",
  "teacher-award",
  "redemption-spent",
  "adventure-island-complete",
  "fishing-game-complete"
]);
const validRewardRedemptionStatuses = new Set<RewardRedemptionStatus>(["pending", "approved", "rejected", "fulfilled"]);
const validGamificationEventSources = new Set<GamificationEventSource>([
  "lesson-complete",
  "practice-accuracy",
  "streak",
  "visualization-complete",
  "mistake-review",
  "teacher-award",
  "quest-complete",
  "campaign-bonus",
  "badge-earned",
  "adventure-island-complete",
  "fishing-game-complete"
]);
const validGamificationEventStatuses = new Set<GamificationEventStatus>(["awarded", "duplicate", "capped", "flagged"]);

function normalizeAdventureIslandSourceKey(sourceKey: unknown) {
  const cleanSourceKey = typeof sourceKey === "string" ? sourceKey.trim() : "";
  if (!cleanSourceKey) return cleanSourceKey;

  return cleanSourceKey
    .replace(/^bonus-game-complete:/, "adventure-island-complete:")
    .replace(/:quadratic:/, ":adventure-island:")
    .slice(0, 240);
}

function normalizeRewardPointReason(reason: unknown): RewardPointReason {
  if (reason === "bonus-game-complete") return "adventure-island-complete";
  return typeof reason === "string" && validRewardPointReasons.has(reason as RewardPointReason)
    ? reason as RewardPointReason
    : "teacher-award";
}

function normalizeGamificationEventSource(source: unknown): GamificationEventSource {
  if (source === "bonus-game-complete") return "adventure-island-complete";
  return typeof source === "string" && validGamificationEventSources.has(source as GamificationEventSource)
    ? source as GamificationEventSource
    : "teacher-award";
}

function adventureIslandLedgerLabel(reason: RewardPointReason, fallbackEn: string, fallbackZh: string) {
  if (reason !== "adventure-island-complete") return { en: fallbackEn, zh: fallbackZh || fallbackEn };
  return {
    en: "Cleared the grade-level Adventure Island",
    zh: "完成年级探险岛"
  };
}

const validRewardCampaignStatuses = new Set<RewardCampaignStatus>(["draft", "active", "paused", "ended"]);
const validGuardianRelationships = new Set<GuardianRelationship>(["mother", "father", "guardian", "other"]);
const validGuardianLinkStatuses = new Set<GuardianLinkStatus>(["pending", "active", "revoked"]);
const validParentMessageCategories = new Set<ParentMessageCategory>(["learning-support", "homework", "wellbeing", "report-question", "logistics"]);
const validAdaptiveLLMStatuses = new Set<AdaptiveLLMStatus>(["disabled", "pending", "ready", "failed", "rejected"]);
const validAdaptiveEngineErrorKinds = new Set<AdaptiveEngineErrorKind>(["configuration", "format", "guardrail", "provider", "rate-limit"]);
const validTeachingResourceTypes = new Set<TeachingResourceType>([
  "slides",
  "practice",
  "quiz",
  "worksheet",
  "exam-paper",
  "marking-scheme",
  "image",
  "document",
  "other"
]);
const validAssessmentTypes = new Set<AssessmentType>(["quiz", "test", "mock-exam", "exam"]);
const validAssessmentSourceTypes = new Set<AssessmentSourceType>(["question-bank", "manual", "resource", "mistake-generated"]);
const acceptedTeacherResourceExtensions = new Set(["pptx", "docx", "pdf", "png", "jpg", "jpeg", "webp"]);
const teacherResourceUploadDirectory = path.join(dbDirectory, "teacher-resources");
const dayMs = 24 * 60 * 60 * 1000;
const passwordResetTokenMaxAgeMs = 1000 * 60 * 30;

const math = (expression: string) => `\\(${expression}\\)`;

function isAdaptiveEngineErrorKind(value: unknown): value is AdaptiveEngineErrorKind {
  return typeof value === "string" && validAdaptiveEngineErrorKinds.has(value as AdaptiveEngineErrorKind);
}

function answerLooksLikeMathExpression(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^[IVX]+$/i.test(trimmed)) return false;
  if (/^(mean|at the mean|known facts and target|shared quantities)$/i.test(trimmed)) return false;
  return (
    /[=^/()+\-,:°]|\\/.test(trimmed) ||
    /\d/.test(trimmed) ||
    /\b(?:sin|cos|tan|log|ln|sqrt|frac|theta|pi|P)\b/i.test(trimmed) ||
    /[θπ]/.test(trimmed)
  );
}

function formatWorkedExampleAnswer(answer: string) {
  return answerLooksLikeMathExpression(answer) ? math(answer) : answer;
}

function shouldSeedDemoUser() {
  return process.env.NODE_ENV !== "production" || process.env.HK_MATH_ENABLE_DEMO_USER === "true";
}

function getDemoPassword() {
  return displayedDemoPassword;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeSchoolCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeClassCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

function guardianInviteCodeForStudent(studentId: string) {
  const digest = createHash("sha1").update(`parent-link:${studentId}`).digest("hex").slice(0, 6).toUpperCase();
  return `MAIS-${digest}`;
}

function isValidStudentAvatarId(value: unknown): value is StudentAvatarId {
  return validStudentAvatarIds.has(value as StudentAvatarId);
}

function isValidStudentAvatarImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxStudentAvatarImageDataUrlLength &&
    studentAvatarImageDataUrlPattern.test(value)
  );
}

function normalizeStudentAvatarImageDataUrl(value: unknown) {
  return isValidStudentAvatarImageDataUrl(value) ? value : undefined;
}

function cleanStudentProfileName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function bootstrapAdminInput(): BootstrapAdminInput | null {
  const email = process.env.MAIS_BOOTSTRAP_ADMIN_EMAIL?.trim() ?? "";
  const password = process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD ?? "";
  if (!email || !password || !isLikelyEmail(email) || password.length < 5) return null;

  const username = process.env.MAIS_BOOTSTRAP_ADMIN_USERNAME?.trim() || email;
  const name = process.env.MAIS_BOOTSTRAP_ADMIN_NAME?.trim() || "MAIS Admin";
  if (!username) return null;

  return { username, email, name, password };
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return {
    hash: pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex"),
    salt
  };
}

function passwordMatches(password: string, user: UserRecord) {
  if (typeof user.password_hash !== "string" || typeof user.password_salt !== "string") return false;
  const candidate = Buffer.from(hashPassword(password, user.password_salt).hash, "hex");
  const stored = Buffer.from(user.password_hash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function demoRecordsNeedSync(database: Partial<Database>) {
  if (!shouldSeedDemoUser()) return false;

  const demoPassword = getDemoPassword();
  return demoAccountSeeds.some((seed) => {
    const user = database.users?.find((candidate) => candidate.id === seed.id);
    const profile = database.student_profiles?.find((candidate) => candidate.user_id === seed.id);
    const settings = database.user_settings?.find((candidate) => candidate.user_id === seed.id);

    const seedProfile = curriculumProfileForTrack(seed.curriculumTrack);
    const existingProfile = profile
      ? normalizeStoredCurriculumProfile({
          curriculumTrack: normalizeCurriculumTrack(profile.curriculum_track),
          region: profile.curriculum_region,
          publisher: profile.textbook_publisher
        })
      : null;

    return (
      !user ||
      user.username !== seed.username ||
      user.normalized_username !== normalizeUsername(seed.username) ||
      user.email !== seed.email ||
      user.normalized_email !== normalizeEmail(seed.email) ||
      user.role !== seed.role ||
      !passwordMatches(demoPassword, user) ||
      !profile ||
      profile.name !== seed.username ||
      profile.grade !== seed.grade ||
      existingProfile?.region !== seedProfile.region ||
      profile.avatar_id !== seed.avatarId ||
      !settings
    );
  });
}

function syncDemoAccounts(users: UserRecord[], studentProfiles: StudentProfileRecord[], userSettings: UserSettingsRecord[], now: string) {
  if (!shouldSeedDemoUser()) return;

  const demoPassword = getDemoPassword();
  let replacementPassword: ReturnType<typeof hashPassword> | null = null;
  const passwordFor = (existingUser?: UserRecord) => {
    if (existingUser && passwordMatches(demoPassword, existingUser)) {
      return {
        hash: existingUser.password_hash,
        salt: existingUser.password_salt
      };
    }

    replacementPassword ??= hashPassword(demoPassword);
    return replacementPassword;
  };

  demoAccountSeeds.forEach((seed) => {
    const existingUser = users.find((candidate) => candidate.id === seed.id);
    const password = passwordFor(existingUser);

    if (existingUser) {
      Object.assign(existingUser, {
        username: seed.username,
        normalized_username: normalizeUsername(seed.username),
        email: seed.email,
        normalized_email: normalizeEmail(seed.email),
        password_hash: password.hash,
        password_salt: password.salt,
        password_must_change: false,
        role: seed.role
      });
    } else {
      users.push({
        id: seed.id,
        username: seed.username,
        normalized_username: normalizeUsername(seed.username),
        email: seed.email,
        normalized_email: normalizeEmail(seed.email),
        password_hash: password.hash,
        password_salt: password.salt,
        password_must_change: false,
        role: seed.role,
        created_at: now
      });
    }

    const existingProfile = studentProfiles.find((profile) => profile.user_id === seed.id);
    const seedProfile = curriculumProfileForTrack(seed.curriculumTrack);
    if (existingProfile) {
      const existingCurriculumProfile = normalizeStoredCurriculumProfile({
        curriculumTrack: normalizeCurriculumTrack(existingProfile.curriculum_track),
        region: existingProfile.curriculum_region,
        publisher: existingProfile.textbook_publisher
      });
      const nextCurriculumProfile =
        existingCurriculumProfile.region === seedProfile.region ? existingCurriculumProfile : seedProfile;

      existingProfile.name = seed.username;
      existingProfile.grade = seed.grade;
      existingProfile.curriculum_track = curriculumTrackForProfile(nextCurriculumProfile);
      existingProfile.curriculum_region = nextCurriculumProfile.region;
      existingProfile.textbook_publisher = nextCurriculumProfile.publisher;
      existingProfile.avatar_id = seed.avatarId;
    } else {
      studentProfiles.push({
        user_id: seed.id,
        name: seed.username,
        grade: seed.grade,
        curriculum_track: seed.curriculumTrack,
        curriculum_region: seedProfile.region,
        textbook_publisher: seedProfile.publisher,
        avatar_id: seed.avatarId
      });
    }

    if (!userSettings.some((settings) => settings.user_id === seed.id)) {
      userSettings.push({
        user_id: seed.id,
        language: seed.curriculumTrack === "MAINLAND_PEP_HIGH" ? "zh-Hans" : "en",
        theme: "dark",
        selected_grade: seed.grade,
        updated_at: now
      });
    }
  });
}

function bootstrapAdminNeedsSync(database: Partial<Database>) {
  const input = bootstrapAdminInput();
  if (!input) return false;

  const normalizedUsername = normalizeUsername(input.username);
  const normalizedEmail = normalizeEmail(input.email);
  return !(database.users ?? []).some(
    (user) =>
      user.normalized_username === normalizedUsername ||
      user.normalized_email === normalizedEmail ||
      normalizeUsername(user.username ?? "") === normalizedUsername ||
      (user.email ? normalizeEmail(user.email) === normalizedEmail : false)
  );
}

function syncBootstrapAdmin(users: UserRecord[], studentProfiles: StudentProfileRecord[], userSettings: UserSettingsRecord[], now: string) {
  const input = bootstrapAdminInput();
  if (!input) return;

  const normalizedUsername = normalizeUsername(input.username);
  const normalizedEmail = normalizeEmail(input.email);
  const existing = users.find(
    (user) =>
      user.normalized_username === normalizedUsername ||
      user.normalized_email === normalizedEmail
  );
  if (existing) return;

  const password = hashPassword(input.password);
  const userId = `admin-${createHash("sha1").update(normalizedEmail).digest("hex").slice(0, 16)}`;
  const curriculumProfile = curriculumProfileForTrack(defaultCurriculumTrack);
  users.push({
    id: userId,
    username: input.username,
    normalized_username: normalizedUsername,
    email: input.email,
    normalized_email: normalizedEmail,
    password_hash: password.hash,
    password_salt: password.salt,
    password_must_change: false,
    role: "admin",
    created_at: now
  });
  studentProfiles.push({
    user_id: userId,
    name: input.name,
    grade: "S3",
    curriculum_track: defaultCurriculumTrack,
    curriculum_region: curriculumProfile.region,
    textbook_publisher: curriculumProfile.publisher,
    avatar_id: "theta"
  });
  userSettings.push({
    user_id: userId,
    language: "en",
    theme: "dark",
    selected_grade: "S3",
    updated_at: now
  });
}

function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function emptyLessonProgressRecords(userId: string, now: string): LessonProgressRecord[] {
  return seedTopics.map((topic) => ({
    user_id: userId,
    topic_id: topic.id,
    lesson_slug: lessonSlugForTopic(topic.id),
    status: "not-started",
    mastery: 0,
    started_at: null,
    completed_at: null,
    duration_seconds: null,
    checklist_state: {},
    updated_at: now
  }));
}

function seedQuestionRecords(): QuestionRecord[] {
  return seedQuestions.map((question) => {
    const profile = normalizeStoredCurriculumProfile({
      curriculumTrack: question.curriculumTrack ?? defaultCurriculumTrack,
      region: question.region ?? question.curriculumProfile?.region,
      publisher: question.publisher ?? question.curriculumProfile?.publisher
    });

    return {
      id: question.id,
      curriculum_track: question.curriculumTrack ?? curriculumTrackForProfile(profile),
      curriculum_region: profile.region,
      textbook_publisher: question.publisher
        ?? question.curriculumProfile?.publisher
        ?? (question.curriculumTrack === "MAINLAND_PEP_HIGH" ? profile.publisher : undefined),
      canonical_topic_id: question.canonicalTopicId ?? question.topicId,
      grade: question.grade,
      topic_id: question.topicId,
      difficulty: question.difficulty,
      type: question.type,
      prompt_en: question.prompt.en,
      prompt_zh: question.prompt.zh,
      options: question.options ?? null,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      explanation_en: question.explanation.en,
      explanation_zh: question.explanation.zh,
      diagram: question.diagram ?? null
    };
  });
}

function isGeneratedCoverageQuestionRecord(question: QuestionRecord) {
  return (
    question.id.startsWith("coverage-") ||
    question.id.startsWith("pep-junior-candidate-") ||
    question.id.startsWith("pep-junior-v2-")
  );
}

function lessonSlugForTopic(topicId: string) {
  return topicId === "quadratic-patterns" ? "quadratic-functions" : topicId;
}

function curriculumProfileForSeedTopic(topic: Topic) {
  return normalizeStoredCurriculumProfile({
    curriculumTrack: topic.curriculumTrack ?? defaultCurriculumTrack,
    region: topic.region ?? topic.curriculumProfile?.region,
    publisher: topic.publisher ?? topic.curriculumProfile?.publisher
  });
}

function publisherForSeedTopic(topic: Topic): TextbookPublisher | undefined {
  return topic.publisher
    ?? topic.curriculumProfile?.publisher
    ?? (topic.curriculumTrack === "MAINLAND_PEP_HIGH" ? curriculumProfileForSeedTopic(topic).publisher : undefined);
}

function seedTopicRecords(): TopicRecord[] {
  return seedTopics.map((topic, index) => {
    const profile = curriculumProfileForSeedTopic(topic);
    return {
      id: topic.id,
      curriculum_track: topic.curriculumTrack ?? curriculumTrackForProfile(profile),
      curriculum_region: profile.region,
      textbook_publisher: publisherForSeedTopic(topic),
      canonical_topic_id: topic.canonicalTopicId ?? topic.id,
      grade: topic.grade,
      title_en: topic.title.en,
      title_zh: topic.title.zh,
      description_en: topic.description.en,
      description_zh: topic.description.zh,
      difficulty: topic.difficulty,
      minutes: topic.minutes,
      sort_order: index
    };
  });
}

function seedLessonRecords(): LessonRecord[] {
  return seedTopics.map((topic) => {
    const isQuadratic = topic.id === "quadratic-patterns";
    const productionLesson = productionLessonByTopicId.get(topic.id);
    const profile = curriculumProfileForSeedTopic(topic);
    return {
      slug: lessonSlugForTopic(topic.id),
      topic_id: topic.id,
      canonical_topic_id: topic.canonicalTopicId ?? topic.id,
      curriculum_region: profile.region,
      textbook_publisher: publisherForSeedTopic(topic),
      grade: topic.grade,
      title_en: productionLesson?.title.en ?? (isQuadratic
        ? "Quadratic Functions: Shape, Vertex, and Intercepts"
        : `${topic.title.en}: Concept, Model, and Practice`),
      title_zh: productionLesson?.title.zh ?? (isQuadratic
        ? "二次函數：形狀、頂點與截距"
        : `${topic.title.zh}：概念、模型與練習`),
      description_en: productionLesson?.description.en ?? (isQuadratic
        ? "Connect tables, graphs, vertex form, symmetry, and intercepts using a live function explorer."
        : `Build ${topic.title.en.toLowerCase()} through concept explanation, a visual model, worked examples, and practice feedback.`),
      description_zh: productionLesson?.description.zh ?? (isQuadratic
        ? "透過即時函數圖像工具，連繫數表、圖像、頂點式、對稱和截距。"
        : `透過概念講解、視覺模型、例題和練習回饋建立${topic.title.zh}能力。`),
      difficulty: topic.difficulty,
      estimated_minutes: productionLesson?.estimatedMinutes ?? topic.minutes
    };
  });
}

function seedProductionLessonBlockRecords(
  topic: Topic,
  lessonSeed: ProductionLessonSeed,
  topicQuestions: string[]
): LessonBlockRecord[] {
  const slug = lessonSlugForTopic(topic.id);
  const practiceQuestionIds = lessonSeed.practiceQuestionIds ?? topicQuestions;
  const records: Omit<LessonBlockRecord, "sort_order">[] = [];
  let practiceAdded = false;

  function addPracticeBlock() {
    if (practiceAdded) return;
    records.push({
      id: `${slug}-practice`,
      lesson_slug: slug,
      type: "practice",
      title_en: "Practice checkpoint",
      title_zh: "練習檢查點",
      practice_question_ids: practiceQuestionIds
    });
    practiceAdded = true;
  }

  lessonSeed.blocks.forEach((block) => {
    if (block.type === "extension") addPracticeBlock();
    records.push({
      id: `${slug}-${block.idSuffix}`,
      lesson_slug: slug,
      type: block.type,
      title_en: block.title.en,
      title_zh: block.title.zh,
      content_en: block.content?.en,
      content_zh: block.content?.zh,
      items: block.items,
      visualization_config: block.visualizationConfig
    });
  });

  addPracticeBlock();

  return records.map((record, sortOrder) => ({
    ...record,
    sort_order: sortOrder
  }));
}

function seedLessonBlockRecords(): LessonBlockRecord[] {
  return seedTopics.flatMap((topic, topicIndex) => {
    const slug = lessonSlugForTopic(topic.id);
	    const topicQuestions = seedQuestions
	      .filter((question) => question.topicId === topic.id)
	      .map((question) => question.id);
	    const anchorQuestion = seedQuestions.find((question) => question.topicId === topic.id);
	    const workedExampleAnswer = anchorQuestion ? formatWorkedExampleAnswer(anchorQuestion.answer) : "";
	    const workedExampleEn = anchorQuestion
	      ? `${anchorQuestion.prompt.en} Answer: ${workedExampleAnswer}. ${anchorQuestion.explanation.en}`
	      : `Use a focused ${topic.title.en.toLowerCase()} example. Identify what is given, choose the relevant rule, substitute carefully, and check whether the answer matches the context.`;
	    const workedExampleZh = anchorQuestion
	      ? `${anchorQuestion.prompt.zh} 答案：${workedExampleAnswer}。${anchorQuestion.explanation.zh}`
	      : `使用一個聚焦的${topic.title.zh}例子：辨認已知資料、選擇相關規則、小心代入，並檢查答案是否符合情境。`;

    const productionLesson = productionLessonByTopicId.get(topic.id);
    if (productionLesson) {
      return seedProductionLessonBlockRecords(topic, productionLesson, topicQuestions);
    }

    if (topic.id === "quadratic-patterns") {
      return [
        {
          id: `${slug}-concept`,
          lesson_slug: slug,
          type: "concept",
          title_en: "Concept explanation",
          title_zh: "概念講解",
          content_en:
            `A quadratic function can be written as ${math("y = ax^2 + bx + c")}. The sign of ${math("a")} controls whether the parabola opens upward or downward, while the vertex marks the turning point. The axis of symmetry is ${math(String.raw`x = -\frac{b}{2a}`)}, and the ${math("x")}-intercepts are the roots of ${math("ax^2 + bx + c = 0")}.`,
          content_zh:
            `二次函數可寫成 ${math("y = ax^2 + bx + c")}。${math("a")} 的正負決定拋物線向上或向下開口，頂點是轉折點。對稱軸是 ${math(String.raw`x = -\frac{b}{2a}`)}，${math("x")} 截距則是 ${math("ax^2 + bx + c = 0")} 的根。`,
          sort_order: 0
        },
        {
          id: `${slug}-worked-example`,
          lesson_slug: slug,
          type: "worked-example",
          title_en: "Worked example",
          title_zh: "例題",
          content_en:
            `For ${math("y = x^2 - 4x + 3")}, the axis of symmetry is ${math(String.raw`x = -\frac{-4}{2\cdot1} = 2`)}. Substitute ${math("x = 2")} into the function: ${math("y = 4 - 8 + 3 = -1")}. So the vertex is ${math("(2, -1)")}. The roots are ${math("x = 1")} and ${math("x = 3")}, which are symmetric around ${math("x = 2")}.`,
          content_zh:
            `對於 ${math("y = x^2 - 4x + 3")}，對稱軸是 ${math(String.raw`x = -\frac{-4}{2\cdot1} = 2`)}。代入 ${math("x = 2")} 得 ${math("y = 4 - 8 + 3 = -1")}，所以頂點是 ${math("(2, -1)")}。根為 ${math("x = 1")} 和 ${math("x = 3")}，並以 ${math("x = 2")} 對稱。`,
          sort_order: 1
        },
        {
          id: `${slug}-checklist`,
          lesson_slug: slug,
          type: "checklist",
          title_en: "Lesson checklist",
          title_zh: "課節清單",
          items: [
	            { en: "Identify a, b, and c", zh: "辨認三個係數" },
            { en: "Predict graph opening direction", zh: "預測圖像開口方向" },
            { en: "Find vertex and symmetry axis", zh: "找出頂點和對稱軸" },
            { en: "Interpret intercepts visually", zh: "用圖像解讀截距" }
          ],
          sort_order: 2
        },
        {
          id: `${slug}-visualization`,
          lesson_slug: slug,
          type: "visualization",
          title_en: "Change the parameters and explain the motion",
          title_zh: "調整參數並解釋圖像變化",
          content_en:
            "Use the graph explorer to adjust a, b, and c. Describe how the vertex, axis of symmetry, and intercepts respond.",
          content_zh:
	            "使用圖像工具調整三個係數，描述頂點、對稱軸和截距如何改變。",
          visualization_config: {
            moduleId: "function-graph-explorer",
            source: "function-graph",
            topicId: topic.id
          },
          sort_order: 3
        },
        {
          id: `${slug}-practice`,
          lesson_slug: slug,
          type: "practice",
          title_en: "Practice checkpoint",
          title_zh: "練習檢查點",
          practice_question_ids: topicQuestions,
          sort_order: 4
        },
        {
          id: `${slug}-extension`,
          lesson_slug: slug,
          type: "extension",
          title_en: "Extension ideas",
          title_zh: "延伸方向",
          items: [
            { en: "Compare table patterns with graph features.", zh: "比較數表規律和圖像特徵。" },
            { en: "Use the same model for S4 functions and S5 advanced functions.", zh: "把同一模型延伸到中四函數和中五進階函數。" },
            { en: "Review mistakes before unlocking the next challenge topic.", zh: "解鎖下一個挑戰課題前先重溫錯題。" }
          ],
          sort_order: 5
        }
      ];
    }

    return [
	      {
	        id: `${slug}-concept`,
	        lesson_slug: slug,
	        type: "concept",
	        title_en: "Concept explanation",
	        title_zh: "概念講解",
	        content_en: `${topic.title.en} in ${topic.grade} focuses on this goal: ${topic.description.en} Start by naming the quantities, the representation, and the rule that links them. Then check the answer against the original context.`,
		        content_zh: `${formatGradeLabel(topic.grade, "zh")}的${topic.title.zh}重點是：${topic.description.zh} 先說出涉及的數量、表示方式，以及連繫它們的規則，再把答案放回原題情境檢查。`,
	        sort_order: 0
	      },
      {
        id: `${slug}-worked-example`,
        lesson_slug: slug,
	        type: "worked-example",
	        title_en: "Worked example",
	        title_zh: "例題",
	        content_en: workedExampleEn,
	        content_zh: workedExampleZh,
        sort_order: 1
      },
      {
        id: `${slug}-checklist`,
        lesson_slug: slug,
        type: "checklist",
        title_en: "Lesson checklist",
        title_zh: "課節清單",
        items: [
          { en: "State the key vocabulary", zh: "說出關鍵詞彙" },
          { en: "Connect the visual and algebraic forms", zh: "連繫圖像和代數表示" },
          { en: "Solve one guided example", zh: "完成一道引導例題" },
          { en: "Explain one common mistake", zh: "解釋一個常見錯誤" }
        ],
        sort_order: 2
      },
      {
        id: `${slug}-practice`,
        lesson_slug: slug,
        type: "practice",
        title_en: "Practice checkpoint",
        title_zh: "練習檢查點",
        practice_question_ids: topicQuestions,
        sort_order: 3
      }
    ];
  });
}

function seedLessonProgressRecords(userId: string, now: string): LessonProgressRecord[] {
  return seedTopics.map((topic) => ({
    user_id: userId,
    topic_id: topic.id,
    lesson_slug: lessonSlugForTopic(topic.id),
    status: topic.status,
    mastery: topic.mastery,
    started_at: topic.status === "not-started" ? null : now,
    completed_at: topic.status === "completed" ? now : null,
    duration_seconds: null,
    checklist_state: {},
    updated_at: now
  }));
}

function baselineLessonProgressRecord(userId: string, topic: Topic, now: string, useSeedProgress: boolean): LessonProgressRecord {
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

function normalizeLessonProgressRecords(
  existingRecords: LessonProgressRecord[] | undefined,
  profiles: StudentProfileRecord[],
  now: string
) {
  const records: LessonProgressRecord[] = (existingRecords ?? []).map((progress) => ({
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
      records.push(baselineLessonProgressRecord(profile.user_id, topic, now, profile.user_id === demoUserId));
      recordKeys.add(key);
    });
  });

  return records;
}

function normalizeAdaptiveSkillStateRecords(
  existingRecords: AdaptiveSkillStateRecord[] | undefined,
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

function isLocalizedRecord(value: unknown): value is LocalizedText {
  const text = value as Partial<LocalizedText> | null;
  return typeof text?.en === "string" && text.en.trim().length > 0 && typeof text.zh === "string" && text.zh.trim().length > 0;
}

function normalizeCachedLLMRecommendation(value: unknown): AdaptiveLLMRecommendation | null {
  const recommendation = value as Partial<AdaptiveLLMRecommendation> | null;
  if (
    typeof recommendation?.selectedCandidateId !== "string" ||
    !isLocalizedRecord(recommendation.learnerReason) ||
    !isLocalizedRecord(recommendation.teacherAuditNote) ||
    !isLocalizedRecord(recommendation.confidenceExplanation) ||
    !Array.isArray(recommendation.signalsUsed)
  ) {
    return null;
  }

  return {
    selectedCandidateId: recommendation.selectedCandidateId,
    questionIds: Array.isArray(recommendation.questionIds)
      ? recommendation.questionIds.filter((questionId): questionId is string => typeof questionId === "string")
      : undefined,
    learnerReason: recommendation.learnerReason,
    teacherAuditNote: recommendation.teacherAuditNote,
    signalsUsed: recommendation.signalsUsed.filter((signal): signal is string => typeof signal === "string").slice(0, 8),
    confidenceExplanation: recommendation.confidenceExplanation
  };
}

function normalizeAdaptiveRecommendationCacheRecords(
  existingRecords: AdaptiveRecommendationCacheRecord[] | undefined,
  now: string
) {
  return (existingRecords ?? [])
    .filter((record) =>
      typeof record.id === "string" &&
      typeof record.user_id === "string" &&
      validGrades.has(record.grade) &&
      typeof record.candidate_signature === "string"
    )
    .map((record): AdaptiveRecommendationCacheRecord => {
      const status = validAdaptiveLLMStatuses.has(record.status) ? record.status : "failed";
      return {
        id: record.id,
        user_id: record.user_id,
        grade: record.grade,
        topic_id: typeof record.topic_id === "string" && record.topic_id ? record.topic_id : null,
        candidate_signature: record.candidate_signature,
        status,
        selected_candidate_id: typeof record.selected_candidate_id === "string" ? record.selected_candidate_id : null,
        question_ids: Array.isArray(record.question_ids) ? record.question_ids.filter((questionId): questionId is string => typeof questionId === "string") : [],
        recommendation_json: normalizeCachedLLMRecommendation(record.recommendation_json),
        provider: typeof record.provider === "string" ? record.provider : null,
        model: typeof record.model === "string" ? record.model : null,
        prompt_tokens: typeof record.prompt_tokens === "number" && Number.isFinite(record.prompt_tokens) ? Math.max(0, Math.round(record.prompt_tokens)) : null,
        completion_tokens: typeof record.completion_tokens === "number" && Number.isFinite(record.completion_tokens) ? Math.max(0, Math.round(record.completion_tokens)) : null,
        total_tokens: typeof record.total_tokens === "number" && Number.isFinite(record.total_tokens) ? Math.max(0, Math.round(record.total_tokens)) : null,
        error: typeof record.error === "string" ? record.error : null,
        error_kind: isAdaptiveEngineErrorKind(record.error_kind) ? record.error_kind : null,
        finish_reason: typeof record.finish_reason === "string" ? record.finish_reason : null,
        created_at: typeof record.created_at === "string" ? record.created_at : now,
        updated_at: typeof record.updated_at === "string" ? record.updated_at : now
      };
    });
}

function seedTeacherClasses(now: string): TeacherClassRecord[] {
  return [
    {
      id: "class-s3a-2026",
      teacher_id: demoTeacherId,
      name: "S3A Mathematics",
      grade: "S3",
      academic_year: "2025-2026",
      description_en: "Core S3 class for algebra, geometry, and data handling follow-up.",
      description_zh: "中三核心班，跟進代數、幾何及數據處理。",
      invite_code: "S3A-MAIS",
      created_at: now,
      updated_at: now
    },
    {
      id: "class-s1-foundation-2026",
      teacher_id: demoTeacherId,
      name: "S1 Foundation Group",
      grade: "S1",
      academic_year: "2025-2026",
      description_en: "Small-group support for number sense and early algebra routines.",
      description_zh: "小組支援數感及初階代數基礎。",
      invite_code: "S1-FOUND",
      created_at: now,
      updated_at: now
    },
    {
      id: "class-mainland-s4-2026",
      teacher_id: mainlandDemoTeacherId,
      name: "Mainland S4 Mathematics",
      grade: "S4",
      academic_year: "2025-2026",
      description_en: "Demo class for Mainland senior high mathematics content.",
      description_zh: "內地高中數學內容示範班。",
      invite_code: "ML-S4-MAIS",
      created_at: now,
      updated_at: now
    }
  ];
}

function seedClassEnrollments(now: string): ClassEnrollmentRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "enrollment-s3a-student-peter",
          class_id: "class-s3a-2026",
          student_id: demoUserId,
          joined_at: now
        },
        {
          id: "enrollment-mainland-s4-student-ludwig",
          class_id: "class-mainland-s4-2026",
          student_id: mainlandDemoUserId,
          joined_at: now
        }
      ]
    : [];
}

function seedAssignments(now: string): AssignmentRecord[] {
  const tomorrow = new Date(Date.parse(now) + 24 * 60 * 60 * 1000).toISOString();

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

function seedSubmissions(now: string): SubmissionRecord[] {
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

function seedTeacherMessages(now: string): TeacherMessageRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "message-thread-quadratic-help",
          class_id: "class-s3a-2026",
          student_id: demoUserId,
          teacher_id: demoTeacherId,
          assignment_id: "assignment-quadratics-checkpoint",
          topic_id: "quadratic-functions",
          subject_en: "Need help with vertex form",
          subject_zh: "想請教頂點式",
          latest_message: "I can expand the brackets, but I am not sure how to read the vertex from the graph.",
          status: "unread",
          priority: "normal",
          starred: false,
          last_message_at: now,
          created_at: now
        }
      ]
    : [];
}

function seedTeacherMessageEntries(now: string): TeacherMessageEntryRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "message-entry-quadratic-help-student",
          thread_id: "message-thread-quadratic-help",
          sender_id: demoUserId,
          sender_role: "student",
          recipient_id: demoTeacherId,
          body: "I can expand the brackets, but I am not sure how to read the vertex from the graph.",
          attachments: [],
          created_at: now
        }
      ]
    : [];
}

function seedTeachingResources(now: string): TeachingResourceRecord[] {
  return [
    {
      id: "resource-s3-quadratics-slides",
      title_en: "S3 Quadratics lesson slides",
      title_zh: "中三二次函數課件",
      type: "slides",
      file_name: "s3-quadratics-intro.pptx",
      file_type: "PPTX",
      mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      file_size_bytes: 2480000,
      storage_path: "seed://s3-quadratics-intro.pptx",
      grade: "S3",
      topic_id: "quadratic-functions",
      difficulty: "Core",
      uploaded_by: demoTeacherId,
      created_at: now
    }
  ];
}

function seedAssessments(now: string): AssessmentRecord[] {
  const nextWeek = new Date(Date.parse(now) + 7 * 24 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: "assessment-s3-algebra-quiz",
      class_id: "class-s3a-2026",
      title_en: "S3 algebra readiness quiz",
      title_zh: "中三代數預備測驗",
      type: "quiz",
      status: "draft",
      source_type: "question-bank",
      source_resource_id: undefined,
      question_ids: ["q5", "q6"].filter((questionId) =>
        seedQuestions.some((question) => question.id === questionId)
      ),
      manual_questions: [],
      opens_at: null,
      closes_at: nextWeek,
      time_limit_minutes: 25,
      max_attempts: 1,
      randomize_question_order: true,
      show_answers_immediately: false,
      grade_weight: 10,
      created_by: demoTeacherId,
      created_at: now,
      updated_at: now
    }
  ];
}

function seedAssessmentSubmissions(now: string): AssessmentSubmissionRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "assessment-submission-s3-algebra-peter",
          assessment_id: "assessment-s3-algebra-quiz",
          student_id: demoUserId,
          status: "graded",
          attempt_number: 1,
          score: 72,
          max_score: 100,
          submitted_at: now,
          graded_at: now,
          answers: [
            {
              questionId: "q5",
              answer: "x = 2",
              isCorrect: true,
              pointsEarned: 50,
              maxPoints: 50
            },
            {
              questionId: "q6",
              answer: "x = -2",
              isCorrect: false,
              pointsEarned: 22,
              maxPoints: 50
            }
          ],
          updated_at: now
        }
      ]
    : [];
}

function seedTeacherReports(now: string): TeacherReportRecord[] {
  const reports: TeacherReportRecord[] = [
    {
      id: "report-s3a-weekly-snapshot",
      type: "class",
      title_en: "S3A weekly learning snapshot",
      title_zh: "中三A每週學習概覽",
      class_id: "class-s3a-2026",
      generated_by: demoTeacherId,
      generated_at: now,
      summary_en: "Foundation report seed for future class analytics and parent communication.",
      summary_zh: "教師報告基礎資料，供日後班級分析及家長溝通使用。"
    }
  ];

  if (shouldSeedDemoUser()) {
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
      student_id: demoUserId,
      generated_by: demoTeacherId,
      generated_at: now,
      summary_en: "HK Student Peter is building steadier quadratic function habits. Home support should focus on short mistake-review routines.",
      summary_zh: "HK Student Peter 的二次函數學習習慣更穩定，家庭支援可集中在短時間錯題重溫。",
      preview_json: JSON.stringify(preview)
    });
  }

  return reports;
}

function seedGuardianLinks(now: string): GuardianLinkRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "guardian-link-peter-family",
          parent_id: demoParentId,
          student_id: demoUserId,
          relationship: "guardian",
          status: "active",
          invite_code: guardianInviteCodeForStudent(demoUserId),
          created_by: demoTeacherId,
          created_at: now,
          updated_at: now
        }
      ]
    : [];
}

function seedTeacherLiveSessions(now: string): TeacherLiveSessionRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "live-s3a-quadratic-check",
          class_id: "class-s3a-2026",
          teacher_id: demoTeacherId,
          status: "active",
          title_en: "S3A quadratic checkpoint",
          title_zh: "中三A二次函數即時檢查",
          lesson_slug: "quadratic-functions",
          lesson_title_en: "Quadratic Functions: Shape, Vertex, and Intercepts",
          lesson_title_zh: "二次函數：形狀、頂點與截距",
          topic_id: "quadratic-patterns",
          topic_title_en: "Quadratic Patterns",
          topic_title_zh: "二次規律",
          visualization_title_en: "Function Graph Explorer",
          visualization_title_zh: "函數圖像探索器",
          join_code: "S3A82",
          current_prompt_id: "live-prompt-s3a-axis",
          started_at: now,
          ended_at: null,
          created_at: now,
          updated_at: now
        }
      ]
    : [];
}

function seedTeacherLivePrompts(now: string): TeacherLivePromptRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "live-prompt-s3a-axis",
          session_id: "live-s3a-quadratic-check",
          type: "poll",
          question_en: "For \\(y = x^2 - 4x + 3\\), what is the axis of symmetry?",
          question_zh: "對於 \\(y = x^2 - 4x + 3\\)，對稱軸是甚麼？",
          options: [
            { id: "a", label: { en: "\\(x = -2\\)", zh: "\\(x = -2\\)" } },
            { id: "b", label: { en: "\\(x = 2\\)", zh: "\\(x = 2\\)" } },
            { id: "c", label: { en: "\\(y = 2\\)", zh: "\\(y = 2\\)" } }
          ],
          correct_option_id: "b",
          created_at: now
        }
      ]
    : [];
}

function seedTeacherLiveResponses(now: string): TeacherLiveResponseRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "live-response-s3a-peter",
          session_id: "live-s3a-quadratic-check",
          prompt_id: "live-prompt-s3a-axis",
          student_id: demoUserId,
          answer: "b",
          is_correct: true,
          submitted_at: now
        }
      ]
    : [];
}

const canonicalRewardCatalogPointCosts = {
  "reward-plush-toy": 1200,
  "reward-pencil-set": 120,
  "reward-ball-pen": 350,
  "reward-eraser": 150,
  "reward-learning-kit": 900
} as const;

function canonicalRewardCatalogPointCostFor(itemId: string) {
  return canonicalRewardCatalogPointCosts[itemId as keyof typeof canonicalRewardCatalogPointCosts] ?? null;
}

function rewardCatalogPointCostsNeedSync(records: unknown) {
  if (!Array.isArray(records)) return false;

  return records.some((record) => {
    const item = record as Partial<RewardCatalogRecord>;
    const pointCost = typeof item.id === "string" ? canonicalRewardCatalogPointCostFor(item.id) : null;

    return pointCost !== null && item.points_cost !== pointCost;
  });
}

function seedRewardCatalogRecords(): RewardCatalogRecord[] {
  return [
    {
      id: "reward-plush-toy",
      name_en: "Math plush toy",
      name_zh: "數學毛公仔",
      description_en: "A small classroom plush for steady learning effort.",
      description_zh: "獎勵穩定學習投入的小型課室毛公仔。",
      category: "toy",
      points_cost: canonicalRewardCatalogPointCosts["reward-plush-toy"],
      available: true,
      accent: "from-pink-300 via-rose-400 to-orange-300",
      thumbnail_label: "Toy",
      sort_order: 10
    },
    {
      id: "reward-pencil-set",
      name_en: "Pencil set",
      name_zh: "鉛筆套裝",
      description_en: "Two pencils for showing working clearly.",
      description_zh: "兩支鉛筆，鼓勵清楚寫出演算步驟。",
      category: "stationery",
      points_cost: canonicalRewardCatalogPointCosts["reward-pencil-set"],
      available: true,
      accent: "from-amber-200 via-yellow-400 to-orange-400",
      thumbnail_label: "2B",
      sort_order: 20
    },
    {
      id: "reward-ball-pen",
      name_en: "Ball pen",
      name_zh: "原子筆",
      description_en: "A smooth pen for corrections and lesson notes.",
      description_zh: "順滑原子筆，用於改正和課堂筆記。",
      category: "stationery",
      points_cost: canonicalRewardCatalogPointCosts["reward-ball-pen"],
      available: true,
      accent: "from-sky-300 via-cyan-400 to-teal-300",
      thumbnail_label: "Pen",
      sort_order: 30
    },
    {
      id: "reward-eraser",
      name_en: "Eraser",
      name_zh: "橡皮擦",
      description_en: "A reminder that revising mistakes is part of mastery.",
      description_zh: "提醒學生改正錯題也是掌握的一部分。",
      category: "stationery",
      points_cost: canonicalRewardCatalogPointCosts["reward-eraser"],
      available: true,
      accent: "from-slate-200 via-white to-cyan-200",
      thumbnail_label: "Erase",
      sort_order: 40
    },
    {
      id: "reward-learning-kit",
      name_en: "Learning stationery kit",
      name_zh: "學習文具套裝",
      description_en: "Notebook, ruler, and sticky notes for revision planning.",
      description_zh: "筆記簿、間尺和便條紙，支援溫習規劃。",
      category: "learning-tool",
      points_cost: canonicalRewardCatalogPointCosts["reward-learning-kit"],
      available: true,
      accent: "from-emerald-300 via-cyan-400 to-blue-400",
      thumbnail_label: "Kit",
      sort_order: 50
    }
  ];
}

function seedRewardPointLedgerRecords(now: string): RewardPointLedgerRecord[] {
  if (!shouldSeedDemoUser()) return [];
  const nowMs = Date.parse(now);

  return [
    {
      id: "reward-ledger-peter-lesson-complete",
      student_id: demoUserId,
      amount: 40,
      reason: "lesson-complete",
      label_en: "Completed quadratic functions lesson",
      label_zh: "完成二次函數課節",
      source_key: `lesson-complete:${demoUserId}:quadratic-functions`,
      created_at: new Date(nowMs - 6 * dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-practice-accuracy",
      student_id: demoUserId,
      amount: 30,
      reason: "practice-accuracy",
      label_en: "Strong Practice Arena accuracy",
      label_zh: "練習場準確率表現良好",
      source_key: `practice-accuracy:${demoUserId}:quadratic-patterns:seed`,
      created_at: new Date(nowMs - 5 * dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-streak",
      student_id: demoUserId,
      amount: 25,
      reason: "streak",
      label_en: "Three-day learning streak",
      label_zh: "連續三日學習",
      source_key: `streak:${demoUserId}:3-day`,
      created_at: new Date(nowMs - 4 * dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-visualization",
      student_id: demoUserId,
      amount: 20,
      reason: "visualization-complete",
      label_en: "Explored the function graph visualization",
      label_zh: "完成函數圖像視覺化探索",
      source_key: `visualization-complete:${demoUserId}:function-graph`,
      created_at: new Date(nowMs - 3 * dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-mistake-review",
      student_id: demoUserId,
      amount: 15,
      reason: "mistake-review",
      label_en: "Reviewed mistake-book items",
      label_zh: "重溫錯題簿項目",
      source_key: `mistake-review:${demoUserId}:seed`,
      created_at: new Date(nowMs - 2 * dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-teacher-effort",
      student_id: demoUserId,
      amount: 50,
      reason: "teacher-award",
      label_en: "Teacher bonus: Great effort",
      label_zh: "教師獎勵：努力學習",
      note: "Kept improving the explanation after feedback.",
      awarded_by: demoTeacherId,
      created_at: new Date(nowMs - dayMs).toISOString()
    },
    {
      id: "reward-ledger-peter-fulfilled-ball-pen",
      student_id: demoUserId,
      amount: -35,
      reason: "redemption-spent",
      label_en: "Redeemed ball pen",
      label_zh: "兌換原子筆",
      redemption_id: "reward-redemption-peter-ball-pen",
      created_at: new Date(nowMs - 12 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function seedRewardRedemptionRecords(now: string): RewardRedemptionRecord[] {
  if (!shouldSeedDemoUser()) return [];
  const nowMs = Date.parse(now);

  return [
    {
      id: "reward-redemption-peter-ball-pen",
      student_id: demoUserId,
      item_id: "reward-ball-pen",
      points_cost: 35,
      status: "fulfilled",
      requested_at: new Date(nowMs - 2 * dayMs).toISOString(),
      decided_at: new Date(nowMs - dayMs).toISOString(),
      fulfilled_at: new Date(nowMs - 12 * 60 * 60 * 1000).toISOString(),
      decided_by: demoTeacherId,
      teacher_note: "Handed to HK Student Peter after class."
    },
    {
      id: "reward-redemption-peter-eraser",
      student_id: demoUserId,
      item_id: "reward-eraser",
      points_cost: 15,
      status: "pending",
      requested_at: new Date(nowMs - 4 * 60 * 60 * 1000).toISOString(),
      decided_at: null,
      fulfilled_at: null
    }
  ];
}

function gamificationSourceForRewardReason(reason: RewardPointReason): GamificationEventSource | null {
  if (reason === "redemption-spent") return null;
  return reason;
}

function gamificationEventRecordFromRewardLedger(entry: RewardPointLedgerRecord): GamificationEventRecord | null {
  const source = gamificationSourceForRewardReason(entry.reason);
  if (!source || entry.amount <= 0) return null;
  const reward = gamificationRewardForSource(source, entry.amount);

  return {
    id: `gamification-event-${entry.id.replace(/^reward-ledger-/, "")}`,
    student_id: entry.student_id,
    xp: reward.xp,
    reward_points: Math.max(0, entry.amount),
    source,
    source_key: entry.source_key ?? inferredRewardSourceKey(entry),
    label_en: entry.label_en,
    label_zh: entry.label_zh,
    status: "awarded",
    anti_abuse_flags: [],
    economy_version: gamificationEconomyVersion,
    created_at: entry.created_at
  };
}

function gamificationEventsFromRewardLedger(records: RewardPointLedgerRecord[]) {
  return records
    .map(gamificationEventRecordFromRewardLedger)
    .filter((entry): entry is GamificationEventRecord => Boolean(entry));
}

function seedGamificationEventRecords(now: string): GamificationEventRecord[] {
  return gamificationEventsFromRewardLedger(seedRewardPointLedgerRecords(now));
}

function seedRewardCampaignRecords(now: string): RewardCampaignRecord[] {
  if (!shouldSeedDemoUser()) return [];
  const nowMs = Date.parse(now);

  return [
    {
      id: "campaign-s3a-steady-week",
      teacher_id: demoTeacherId,
      class_id: "class-s3a-2026",
      title_en: "Steady Week Challenge",
      title_zh: "穩定學習週挑戰",
      description_en: "Reward students for careful practice, mistake repair, and lesson completion across the week.",
      description_zh: "獎勵學生一週內保持細心練習、修正錯題和完成課節。",
      status: "active",
      budget_points: 900,
      awarded_points: 130,
      quest_ids: ["daily-correct-answers", "daily-lesson-step", "daily-repair"],
      starts_at: new Date(nowMs - 2 * dayMs).toISOString(),
      ends_at: new Date(nowMs + 5 * dayMs).toISOString(),
      created_at: new Date(nowMs - 2 * dayMs).toISOString(),
      updated_at: now
    }
  ];
}

function inferredRewardSourceKey(entry: RewardPointLedgerRecord) {
  const existingSourceKey = typeof entry.source_key === "string" ? entry.source_key.trim() : "";
  if (existingSourceKey) return normalizeAdventureIslandSourceKey(existingSourceKey);

  const demoSourceKeys: Record<string, string> = {
    "reward-ledger-peter-lesson-complete": `lesson-complete:${demoUserId}:quadratic-functions`,
    "reward-ledger-peter-practice-accuracy": `practice-accuracy:${demoUserId}:quadratic-patterns:seed`,
    "reward-ledger-peter-streak": `streak:${demoUserId}:3-day`,
    "reward-ledger-peter-visualization": `visualization-complete:${demoUserId}:function-graph`,
    "reward-ledger-peter-mistake-review": `mistake-review:${demoUserId}:seed`
  };

  return normalizeAdventureIslandSourceKey(demoSourceKeys[entry.id]);
}

function createInitialDatabase(): Database {
  const now = new Date().toISOString();
  const demoPassword = getDemoPassword();
  const password = hashPassword(demoPassword);
  const demoUser = shouldSeedDemoUser()
    ? demoAccountSeeds.map((seed): UserRecord => ({
        id: seed.id,
        username: seed.username,
        normalized_username: normalizeUsername(seed.username),
        email: seed.email,
        normalized_email: normalizeEmail(seed.email),
        password_hash: password.hash,
        password_salt: password.salt,
        password_must_change: false,
        role: seed.role,
        created_at: now
      }))
    : [];
	  const demoProfile = shouldSeedDemoUser()
	    ? demoAccountSeeds.map((seed): StudentProfileRecord => ({
	        user_id: seed.id,
	        name: seed.username,
	        grade: seed.grade,
	        curriculum_track: seed.curriculumTrack,
	        curriculum_region: curriculumProfileForTrack(seed.curriculumTrack).region,
	        textbook_publisher: curriculumProfileForTrack(seed.curriculumTrack).publisher,
	        avatar_id: seed.avatarId
	      }))
    : [];
  const demoSettings = shouldSeedDemoUser()
    ? demoAccountSeeds.map((seed): UserSettingsRecord => ({
        user_id: seed.id,
        language: seed.curriculumTrack === "MAINLAND_PEP_HIGH" ? "zh-Hans" : "en",
        theme: "dark",
        selected_grade: seed.grade,
        updated_at: now
      }))
    : [];
  syncBootstrapAdmin(demoUser, demoProfile, demoSettings, now);

  return {
    users: demoUser,
    student_profiles: demoProfile,
    user_settings: demoSettings,
    schools: [],
    school_memberships: [],
    provisioning_batches: [],
    provisioning_row_results: [],
    guardian_links: seedGuardianLinks(now),
    password_reset_tokens: [],
    topics: seedTopicRecords(),
    lessons: seedLessonRecords(),
    lesson_blocks: seedLessonBlockRecords(),
    questions: seedQuestionRecords(),
    attempts: [],
    mistakes: [],
    lesson_progress: seedLessonProgressRecords(demoUserId, now),
    adaptive_skill_state: [],
    adaptive_recommendation_cache: [],
    visualization_events: [],
    learning_events: [],
    learning_event_clears: [],
    visualization_sessions: [],
    ai_tutor_messages: [],
    ai_tutor_usage: [],
    teacher_classes: seedTeacherClasses(now),
    class_enrollments: seedClassEnrollments(now),
    assignments: seedAssignments(now),
    submissions: seedSubmissions(now),
    teacher_messages: seedTeacherMessages(now),
    teacher_message_entries: seedTeacherMessageEntries(now),
    teaching_resources: seedTeachingResources(now),
    assessments: seedAssessments(now),
    assessment_submissions: seedAssessmentSubmissions(now),
    teacher_reports: seedTeacherReports(now),
    teacher_live_sessions: seedTeacherLiveSessions(now),
    teacher_live_prompts: seedTeacherLivePrompts(now),
    teacher_live_responses: seedTeacherLiveResponses(now),
    reward_catalog: seedRewardCatalogRecords(),
    reward_point_ledger: seedRewardPointLedgerRecords(now),
    reward_redemptions: seedRewardRedemptionRecords(now),
    gamification_events: seedGamificationEventRecords(now),
    reward_campaigns: seedRewardCampaignRecords(now)
  };
}

function hasCoreTables(value: unknown): value is Partial<Database> {
  const database = value as Partial<Database> | null;
  return (
    Array.isArray(database?.users) &&
    Array.isArray(database?.student_profiles) &&
    Array.isArray(database?.user_settings)
  );
}

type StateRow = {
  payload: unknown;
};

type PostgresExecutor = postgres.Sql | postgres.TransactionSql;

let sqlite: DatabaseSync | null = null;
let postgresClient: postgres.Sql | null = null;
let postgresReady: Promise<void> | null = null;
let sqliteReadCache: Database | null = null;
let sqliteReadPromise: Promise<Database> | null = null;
const databaseIndexCache = new WeakMap<Database, DatabaseIndexes>();

function lessonPerfDebugEnabled() {
  const configured = process.env.LESSON_PERF_DEBUG?.trim().toLowerCase();
  return configured === "true" || configured === "1" || configured === "yes" || configured === "on";
}

function logLessonPerf(label: string, startedAt: number) {
  if (!lessonPerfDebugEnabled()) return;
  console.info(`[lesson-perf] ${label}: ${Date.now() - startedAt}ms`);
}

function readCachedSqliteDatabase() {
  return sqliteReadCache;
}

function cacheSqliteDatabase(database: Database) {
  sqliteReadCache = database;
}

function clearSqliteReadCache() {
  sqliteReadCache = null;
  sqliteReadPromise = null;
}

function userTopicProgressKey(userId: string, topicId: string) {
  return `${userId}\u0000${topicId}`;
}

function userSlugProgressKey(userId: string, slug: string) {
  return `${userId}\u0000${slug}`;
}

function indexesForDatabase(database: Database) {
  const cached = databaseIndexCache.get(database);
  if (cached) return cached;

  const topicById = new Map(database.topics.map((topic) => [topic.id, topic]));
  const questionById = new Map(database.questions.map((question) => [question.id, question]));
  const lessonBySlug = new Map(database.lessons.map((lesson) => [lesson.slug, lesson]));
  const lessonByTopicId = new Map<string, LessonRecord>();
  const lessonsByCanonicalTopicId = new Map<string, LessonRecord[]>();
  const lessonBlocksBySlug = new Map<string, LessonBlockRecord[]>();
  const lessonProgressByUserTopicId = new Map<string, LessonProgressRecord>();
  const lessonProgressByUserSlug = new Map<string, LessonProgressRecord>();

  database.lessons.forEach((lesson) => {
    if (!lessonByTopicId.has(lesson.topic_id)) lessonByTopicId.set(lesson.topic_id, lesson);
    const topic = topicById.get(lesson.topic_id);
    const canonicalTopicId = lesson.canonical_topic_id ?? topic?.canonical_topic_id ?? lesson.topic_id;
    const canonicalLessons = lessonsByCanonicalTopicId.get(canonicalTopicId) ?? [];
    canonicalLessons.push(lesson);
    lessonsByCanonicalTopicId.set(canonicalTopicId, canonicalLessons);
  });

  database.lesson_blocks.forEach((block) => {
    const blocks = lessonBlocksBySlug.get(block.lesson_slug) ?? [];
    blocks.push(block);
    lessonBlocksBySlug.set(block.lesson_slug, blocks);
  });
  lessonBlocksBySlug.forEach((blocks) => blocks.sort((a, b) => a.sort_order - b.sort_order));

  database.lesson_progress.forEach((progress) => {
    lessonProgressByUserTopicId.set(userTopicProgressKey(progress.user_id, progress.topic_id), progress);
    if (progress.lesson_slug) {
      lessonProgressByUserSlug.set(userSlugProgressKey(progress.user_id, progress.lesson_slug), progress);
    }
  });

  const indexes = {
    topicById,
    questionById,
    lessonBySlug,
    lessonByTopicId,
    lessonsByCanonicalTopicId,
    lessonBlocksBySlug,
    lessonProgressByUserTopicId,
    lessonProgressByUserSlug
  };
  databaseIndexCache.set(database, indexes);
  return indexes;
}

function getSqliteDatabase() {
  if (sqlite) return sqlite;

  sqlite = new DatabaseSync(dbPath);
  sqlite.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS app_state_updated_at_idx
      ON app_state(updated_at);
  `);

  const migration = sqlite.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(schemaVersion);
  if (!migration) {
    sqlite
      .prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
      .run(schemaVersion, new Date().toISOString());
  }

  return sqlite;
}

function getPostgresClient() {
  if (postgresClient) return postgresClient;
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL is required when HK_MATH_STORAGE_PROVIDER=postgres.");
  }

  postgresClient = postgres(postgresUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });
  return postgresClient;
}

async function ensurePostgresStateTable() {
  if (!postgresReady) {
    const sql = getPostgresClient();
    postgresReady = sql`
      CREATE TABLE IF NOT EXISTS app_state (
        id TEXT PRIMARY KEY,
        schema_version INTEGER NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `.then(async () => {
      await sql`
        CREATE INDEX IF NOT EXISTS app_state_updated_at_idx
          ON app_state(updated_at)
      `;
    });
  }

  return postgresReady;
}

function parseStoredStatePayload(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }

  return value;
}

function mergeSeedRecords<T>(existingRecords: T[] | undefined, seedRecords: T[], keyFor: (record: T) => string) {
  const seedKeys = new Set(seedRecords.map(keyFor));
  const extraRecords = (existingRecords ?? []).filter((record) => !seedKeys.has(keyFor(record)));
  return [...seedRecords, ...extraRecords];
}

function mergeSeedRecordsPreservingExisting<T>(
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

function normalizeProvisioningTotals(value: unknown): ProvisioningTotals {
  const totals = value as Partial<ProvisioningTotals> | null;
  return {
    schools: Math.max(0, Math.round(Number(totals?.schools) || 0)),
    classes: Math.max(0, Math.round(Number(totals?.classes) || 0)),
    teachers: Math.max(0, Math.round(Number(totals?.teachers) || 0)),
    students: Math.max(0, Math.round(Number(totals?.students) || 0)),
    errors: Math.max(0, Math.round(Number(totals?.errors) || 0))
  };
}

function normalizeProvisioningRowStatus(value: unknown): ProvisioningRowStatus {
  return value === "created" || value === "failed" || value === "skipped" || value === "valid" ? value : "failed";
}

function normalizeProvisioningRowAction(value: unknown): ProvisioningRowAction {
  return value === "create" || value === "reuse" || value === "link" || value === "none" ? value : "none";
}

function normalizeDatabase(database: Partial<Database>) {
  const now = new Date().toISOString();
  const canonicalTopics = seedTopicRecords();
  const canonicalLessons = seedLessonRecords();
  const canonicalLessonBlocks = seedLessonBlockRecords();
  const users: UserRecord[] = (database.users ?? []).map((user) => {
    const username = typeof user.username === "string" ? user.username.trim() : "";
    const email = typeof user.email === "string" && isLikelyEmail(user.email)
      ? user.email.trim()
      : isLikelyEmail(username)
        ? username
        : undefined;
    return {
      ...user,
      username,
      normalized_username: normalizeUsername(username),
      email,
      normalized_email: email ? normalizeEmail(email) : undefined,
      school_id: typeof user.school_id === "string" && user.school_id.trim() ? user.school_id : undefined,
      password_must_change: user.password_must_change ?? false
    };
  });
  const studentProfiles = (database.student_profiles ?? []).map((profile): StudentProfileRecord => {
    const avatarImageDataUrl = normalizeStudentAvatarImageDataUrl(profile.avatar_image_data_url);
    const curriculumProfile = normalizeStoredCurriculumProfile({
      curriculumTrack: normalizeCurriculumTrack(profile.curriculum_track),
      region: profile.curriculum_region,
      publisher: profile.textbook_publisher
    });
    return {
      ...profile,
      avatar_id: isValidStudentAvatarId(profile.avatar_id) ? profile.avatar_id : defaultStudentAvatarId,
      curriculum_track: curriculumTrackForProfile(curriculumProfile),
      curriculum_region: curriculumProfile.region,
      textbook_publisher: curriculumProfile.publisher,
      ...(avatarImageDataUrl ? { avatar_image_data_url: avatarImageDataUrl } : {})
    };
  });
  const userSettings = database.user_settings ?? [];

  syncDemoAccounts(users, studentProfiles, userSettings, now);
  syncBootstrapAdmin(users, studentProfiles, userSettings, now);

  const topics = mergeSeedRecordsPreservingExisting(database.topics, canonicalTopics, (topic) => topic.id)
    .map((topic, index) => ({
      ...topic,
      curriculum_track: validCurriculumTracks.has(topic.curriculum_track) ? topic.curriculum_track : defaultCurriculumTrack,
      curriculum_region: profileForRecord(topic).region,
      textbook_publisher: topic.curriculum_track === "MAINLAND_PEP_HIGH"
        ? profileForRecord(topic).publisher
        : topic.textbook_publisher,
      canonical_topic_id: topic.canonical_topic_id ?? topic.id,
      sort_order: typeof topic.sort_order === "number" ? topic.sort_order : index
    }));

  return {
    users,
    student_profiles: studentProfiles,
    user_settings: userSettings,
    schools: (database.schools ?? []).map((school): SchoolRecord => ({
      ...school,
      code: normalizeSchoolCode(school.code || school.name || school.id),
      normalized_code: normalizeSchoolCode(school.normalized_code || school.code || school.name || school.id),
      name: school.name?.trim() || school.code || "School",
      academic_year: school.academic_year?.trim() || "2025-2026",
      contact_name: school.contact_name?.trim() || undefined,
      contact_email: school.contact_email && isLikelyEmail(school.contact_email) ? school.contact_email.trim() : undefined,
      created_by: school.created_by || "system",
      created_at: school.created_at ?? now,
      updated_at: school.updated_at ?? school.created_at ?? now
    })),
    school_memberships: (database.school_memberships ?? []).map((membership): SchoolMembershipRecord => ({
      ...membership,
      role: ["student", "teacher", "parent", "admin"].includes(membership.role) ? membership.role : "student",
      class_id: typeof membership.class_id === "string" && membership.class_id.trim() ? membership.class_id : undefined,
      created_at: membership.created_at ?? now
    })),
    provisioning_batches: (database.provisioning_batches ?? []).map((batch): ProvisioningBatchRecord => ({
      ...batch,
      status: batch.status === "failed" ? "failed" : "created",
      totals: normalizeProvisioningTotals(batch.totals),
      row_result_ids: Array.isArray(batch.row_result_ids)
        ? batch.row_result_ids.filter((id): id is string => typeof id === "string")
        : [],
      created_at: batch.created_at ?? now,
      updated_at: batch.updated_at ?? batch.created_at ?? now
    })),
    provisioning_row_results: (database.provisioning_row_results ?? []).map((row): ProvisioningRowResultRecord => ({
      ...row,
      row_index: Number.isFinite(row.row_index) ? Math.max(0, Math.round(row.row_index)) : 0,
      status: normalizeProvisioningRowStatus(row.status),
      action: normalizeProvisioningRowAction(row.action),
      errors: Array.isArray(row.errors) ? row.errors.filter((error): error is string => typeof error === "string") : [],
      warnings: Array.isArray(row.warnings) ? row.warnings.filter((warning): warning is string => typeof warning === "string") : [],
      class_code: row.class_code ? normalizeClassCode(row.class_code) : undefined,
      role: row.role && ["student", "teacher", "parent", "admin"].includes(row.role) ? row.role : undefined
    })),
    guardian_links: mergeSeedRecordsPreservingExisting(database.guardian_links, seedGuardianLinks(now), (link) => link.id)
      .map((link) => ({
        ...link,
        relationship: validGuardianRelationships.has(link.relationship) ? link.relationship : "guardian",
        status: validGuardianLinkStatuses.has(link.status) ? link.status : "pending",
        invite_code: normalizeInviteCode(link.invite_code || guardianInviteCodeForStudent(link.student_id)),
        updated_at: link.updated_at ?? link.created_at ?? now,
        created_at: link.created_at ?? now
      })),
    password_reset_tokens: database.password_reset_tokens ?? [],
    topics,
    lessons: mergeSeedRecords(database.lessons, canonicalLessons, (lesson) => lesson.slug).map((lesson) => {
      const topic = topics.find((candidate) => candidate.id === lesson.topic_id);
      return {
        ...lesson,
        canonical_topic_id: lesson.canonical_topic_id ?? topic?.canonical_topic_id ?? lesson.topic_id,
        curriculum_region: lesson.curriculum_region ?? topic?.curriculum_region ?? profileForRecord(topic ?? { curriculum_track: defaultCurriculumTrack }).region,
        textbook_publisher: lesson.textbook_publisher ?? topic?.textbook_publisher
      };
    }),
    lesson_blocks: mergeSeedRecords(database.lesson_blocks, canonicalLessonBlocks, (block) => block.id),
    questions: mergeSeedRecords(
      (database.questions ?? []).filter((question) => !isGeneratedCoverageQuestionRecord(question)),
      seedQuestionRecords(),
      (question) => question.id
    ).map((question) => ({
      ...question,
      curriculum_track: validCurriculumTracks.has(question.curriculum_track) ? question.curriculum_track : defaultCurriculumTrack,
      curriculum_region: profileForRecord(question).region,
      textbook_publisher: question.curriculum_track === "MAINLAND_PEP_HIGH"
        ? profileForRecord(question).publisher
        : question.textbook_publisher,
      canonical_topic_id: question.canonical_topic_id ?? question.topic_id
    })),
    attempts: database.attempts ?? [],
    mistakes: database.mistakes ?? [],
    lesson_progress: normalizeLessonProgressRecords(
      database.lesson_progress?.length
        ? database.lesson_progress
        : shouldSeedDemoUser()
          ? seedLessonProgressRecords(demoUserId, now)
          : [],
      studentProfiles,
      now
    ),
    adaptive_skill_state: normalizeAdaptiveSkillStateRecords(database.adaptive_skill_state ?? [], now),
    adaptive_recommendation_cache: normalizeAdaptiveRecommendationCacheRecords(database.adaptive_recommendation_cache ?? [], now),
    visualization_events: database.visualization_events ?? [],
    learning_events: database.learning_events ?? [],
    learning_event_clears: database.learning_event_clears ?? [],
    visualization_sessions: database.visualization_sessions ?? [],
    ai_tutor_messages: database.ai_tutor_messages ?? [],
    ai_tutor_usage: database.ai_tutor_usage ?? [],
    teacher_classes: mergeSeedRecordsPreservingExisting(database.teacher_classes, seedTeacherClasses(now), (teacherClass) => teacherClass.id)
      .map((teacherClass) => ({
        ...teacherClass,
        school_id: typeof teacherClass.school_id === "string" && teacherClass.school_id.trim() ? teacherClass.school_id : undefined,
        class_code: teacherClass.class_code ? normalizeClassCode(teacherClass.class_code) : undefined,
        invite_code: teacherClass.invite_code ?? `${teacherClass.grade}-${teacherClass.id.slice(-4).toUpperCase()}`
      })),
    class_enrollments: mergeSeedRecordsPreservingExisting(database.class_enrollments, seedClassEnrollments(now), (enrollment) => enrollment.id),
    assignments: mergeSeedRecordsPreservingExisting(database.assignments, seedAssignments(now), (assignment) => assignment.id)
      .map((assignment) => ({
        ...assignment,
        count_towards_grade: assignment.count_towards_grade ?? true
      })),
    submissions: mergeSeedRecordsPreservingExisting(database.submissions, seedSubmissions(now), (submission) => submission.id),
    teacher_messages: mergeSeedRecordsPreservingExisting(database.teacher_messages, seedTeacherMessages(now), (message) => message.id)
      .map((message) => ({
        ...message,
        starred: message.starred ?? false,
        parent_category: message.parent_category && validParentMessageCategories.has(message.parent_category) ? message.parent_category : undefined
      })),
    teacher_message_entries: mergeSeedRecordsPreservingExisting(database.teacher_message_entries, seedTeacherMessageEntries(now), (entry) => entry.id),
    teaching_resources: mergeSeedRecordsPreservingExisting(database.teaching_resources, seedTeachingResources(now), (resource) => resource.id)
      .map((resource) => ({
        ...resource,
        mime_type: resource.mime_type ?? "",
        file_size_bytes: resource.file_size_bytes ?? 0,
        storage_path: resource.storage_path ?? undefined
      })),
    assessments: mergeSeedRecordsPreservingExisting(database.assessments, seedAssessments(now), (assessment) => assessment.id)
      .map((assessment) => ({
        ...assessment,
        source_type: assessment.source_type ?? "question-bank",
        source_resource_id: assessment.source_resource_id ?? undefined,
        question_ids: assessment.question_ids ?? [],
        manual_questions: assessment.manual_questions ?? [],
        max_attempts: assessment.max_attempts ?? 1,
        randomize_question_order: assessment.randomize_question_order ?? false,
        show_answers_immediately: assessment.show_answers_immediately ?? false,
        grade_weight: assessment.grade_weight ?? 10,
        updated_at: assessment.updated_at ?? assessment.created_at
      })),
    assessment_submissions: mergeSeedRecordsPreservingExisting(database.assessment_submissions, seedAssessmentSubmissions(now), (submission) => submission.id)
      .map((submission) => ({
        ...submission,
        status: submission.status ?? "not-started",
        attempt_number: submission.attempt_number ?? 1,
        score: submission.score ?? null,
        max_score: submission.max_score ?? 100,
        submitted_at: submission.submitted_at ?? null,
        graded_at: submission.graded_at ?? null,
        answers: submission.answers ?? [],
        updated_at: submission.updated_at ?? submission.submitted_at ?? now
      })),
    teacher_reports: mergeSeedRecordsPreservingExisting(database.teacher_reports, seedTeacherReports(now), (report) => report.id),
    teacher_live_sessions: mergeSeedRecordsPreservingExisting(database.teacher_live_sessions, seedTeacherLiveSessions(now), (session) => session.id),
    teacher_live_prompts: mergeSeedRecordsPreservingExisting(database.teacher_live_prompts, seedTeacherLivePrompts(now), (prompt) => prompt.id),
    teacher_live_responses: mergeSeedRecordsPreservingExisting(database.teacher_live_responses, seedTeacherLiveResponses(now), (response) => response.id),
    reward_catalog: mergeSeedRecordsPreservingExisting(database.reward_catalog, seedRewardCatalogRecords(), (item) => item.id)
      .map((item, index) => ({
        ...item,
        category: validRewardCatalogCategories.has(item.category) ? item.category : "stationery",
        points_cost: canonicalRewardCatalogPointCostFor(item.id) ?? Math.max(1, Math.round(Number(item.points_cost) || 1)),
        available: item.available ?? true,
        accent: item.accent || "from-cyan-300 via-blue-400 to-violet-400",
        thumbnail_label: item.thumbnail_label || item.name_en.slice(0, 3),
        sort_order: typeof item.sort_order === "number" ? item.sort_order : index
      })),
    reward_point_ledger: mergeSeedRecordsPreservingExisting(database.reward_point_ledger, seedRewardPointLedgerRecords(now), (entry) => entry.id)
      .map((entry) => {
        const reason = normalizeRewardPointReason(entry.reason);
        const label = adventureIslandLedgerLabel(reason, entry.label_en, entry.label_zh);
        return {
          ...entry,
          amount: Math.round(Number(entry.amount) || 0),
          reason,
          label_en: label.en,
          label_zh: label.zh,
          source_key: inferredRewardSourceKey(entry),
          created_at: entry.created_at ?? now
        };
      }),
    reward_redemptions: mergeSeedRecordsPreservingExisting(database.reward_redemptions, seedRewardRedemptionRecords(now), (redemption) => redemption.id)
      .map((redemption) => ({
        ...redemption,
        points_cost: Math.max(1, Math.round(Number(redemption.points_cost) || 1)),
        status: validRewardRedemptionStatuses.has(redemption.status) ? redemption.status : "pending",
        requested_at: redemption.requested_at ?? now,
        decided_at: redemption.decided_at ?? null,
        fulfilled_at: redemption.fulfilled_at ?? null
      })),
    gamification_events: mergeSeedRecordsPreservingExisting(
      database.gamification_events?.length
        ? database.gamification_events
        : gamificationEventsFromRewardLedger(database.reward_point_ledger ?? []),
      seedGamificationEventRecords(now),
      (event) => event.id
    )
      .map((event) => {
        const source = normalizeGamificationEventSource(event.source);
        const label = adventureIslandLedgerLabel(source === "adventure-island-complete" ? "adventure-island-complete" : "teacher-award", event.label_en, event.label_zh);
        return {
          ...event,
          xp: Math.max(0, Math.round(Number(event.xp) || 0)),
          reward_points: Math.round(Number(event.reward_points) || 0),
          source,
          source_key: typeof event.source_key === "string" && event.source_key.trim() ? normalizeAdventureIslandSourceKey(event.source_key) : event.id,
          label_en: label.en,
          label_zh: label.zh,
          status: validGamificationEventStatuses.has(event.status) ? event.status : "awarded",
          anti_abuse_flags: Array.isArray(event.anti_abuse_flags)
            ? event.anti_abuse_flags.filter((flag): flag is string => typeof flag === "string").slice(0, 8)
            : [],
          economy_version: event.economy_version || gamificationEconomyVersion,
          created_at: event.created_at ?? now
        };
      }),
    reward_campaigns: mergeSeedRecordsPreservingExisting(database.reward_campaigns, seedRewardCampaignRecords(now), (campaign) => campaign.id)
      .map((campaign) => ({
        ...campaign,
        status: validRewardCampaignStatuses.has(campaign.status) ? campaign.status : "draft",
        budget_points: Math.max(0, Math.round(Number(campaign.budget_points) || 0)),
        awarded_points: Math.max(0, Math.round(Number(campaign.awarded_points) || 0)),
        quest_ids: Array.isArray(campaign.quest_ids)
          ? campaign.quest_ids.filter((questId): questId is string => dailyQuestDefinitions.some((quest) => quest.id === questId))
          : [],
        starts_at: campaign.starts_at ?? now,
        ends_at: campaign.ends_at ?? now,
        created_at: campaign.created_at ?? now,
        updated_at: campaign.updated_at ?? campaign.created_at ?? now
      }))
  } satisfies Database;
}

async function readLegacyDatabase() {
  try {
    const raw = await readFile(legacyJsonDbPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return hasCoreTables(parsed) ? normalizeDatabase(parsed) : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Could not read legacy JSON database.", error);
    }
    return null;
  }
}

function databaseNeedsPersistenceSync(parsed: Partial<Database>, database: Database) {
  return (
    !Array.isArray(parsed.questions) ||
    !Array.isArray(parsed.schools) ||
    !Array.isArray(parsed.school_memberships) ||
    !Array.isArray(parsed.provisioning_batches) ||
    !Array.isArray(parsed.provisioning_row_results) ||
    !Array.isArray(parsed.guardian_links) ||
    !Array.isArray(parsed.password_reset_tokens) ||
    !Array.isArray(parsed.topics) ||
    !Array.isArray(parsed.lessons) ||
    !Array.isArray(parsed.lesson_blocks) ||
    !Array.isArray(parsed.attempts) ||
    !Array.isArray(parsed.mistakes) ||
    !Array.isArray(parsed.lesson_progress) ||
    !Array.isArray(parsed.adaptive_skill_state) ||
    !Array.isArray(parsed.adaptive_recommendation_cache) ||
    !Array.isArray(parsed.visualization_events) ||
    !Array.isArray(parsed.learning_events) ||
    !Array.isArray(parsed.learning_event_clears) ||
    !Array.isArray(parsed.visualization_sessions) ||
    !Array.isArray(parsed.ai_tutor_messages) ||
    !Array.isArray(parsed.ai_tutor_usage) ||
    !Array.isArray(parsed.teacher_classes) ||
    !Array.isArray(parsed.class_enrollments) ||
    !Array.isArray(parsed.assignments) ||
    !Array.isArray(parsed.submissions) ||
    !Array.isArray(parsed.teacher_messages) ||
    !Array.isArray(parsed.teacher_message_entries) ||
    !Array.isArray(parsed.teaching_resources) ||
    !Array.isArray(parsed.assessments) ||
    !Array.isArray(parsed.assessment_submissions) ||
    !Array.isArray(parsed.teacher_reports) ||
    !Array.isArray(parsed.teacher_live_sessions) ||
    !Array.isArray(parsed.teacher_live_prompts) ||
    !Array.isArray(parsed.teacher_live_responses) ||
    !Array.isArray(parsed.reward_catalog) ||
    !Array.isArray(parsed.reward_point_ledger) ||
    !Array.isArray(parsed.reward_redemptions) ||
    !Array.isArray(parsed.gamification_events) ||
    !Array.isArray(parsed.reward_campaigns) ||
    database.users.some((user) => user.email && !user.normalized_email) ||
    database.users.some((user) => typeof user.password_must_change !== "boolean") ||
    database.student_profiles.some((profile) => !isValidStudentAvatarId(profile.avatar_id)) ||
    database.teacher_classes.some((teacherClass) => !teacherClass.invite_code) ||
    database.assignments.some((assignment) => typeof assignment.count_towards_grade !== "boolean") ||
    database.teacher_messages.some((message) => typeof message.starred !== "boolean") ||
    database.guardian_links.some((link) => !validGuardianLinkStatuses.has(link.status) || !link.invite_code) ||
    database.teaching_resources.some((resource) => typeof resource.file_size_bytes !== "number") ||
    database.assessments.some((assessment) => !assessment.source_type || !Array.isArray(assessment.question_ids)) ||
    database.reward_catalog.some((item) => !validRewardCatalogCategories.has(item.category) || typeof item.available !== "boolean") ||
    rewardCatalogPointCostsNeedSync(parsed.reward_catalog) ||
    database.reward_point_ledger.some((entry) => !validRewardPointReasons.has(entry.reason) || typeof entry.amount !== "number") ||
    database.reward_redemptions.some((redemption) => !validRewardRedemptionStatuses.has(redemption.status)) ||
    database.gamification_events.some((event) => !validGamificationEventSources.has(event.source) || !validGamificationEventStatuses.has(event.status)) ||
    database.reward_campaigns.some((campaign) => !validRewardCampaignStatuses.has(campaign.status)) ||
    demoRecordsNeedSync(parsed) ||
    bootstrapAdminNeedsSync(parsed)
  );
}

async function loadSqliteDatabase() {
  const startedAt = Date.now();
  await mkdir(dbDirectory, { recursive: true });
  const storage = getSqliteDatabase();

  try {
    const row = storage
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get(stateRecordId) as StateRow | undefined;
    const parsed = row ? parseStoredStatePayload(row.payload) : null;
    if (hasCoreTables(parsed)) {
      const database = normalizeDatabase(parsed);
      if (databaseNeedsPersistenceSync(parsed, database)) {
        await writeSqliteDatabase(database, { invalidateReadCache: false });
      }
      cacheSqliteDatabase(database);
      logLessonPerf("readDatabase(sqlite)", startedAt);
      return database;
    }
  } catch (error) {
    console.warn("Could not read SQLite application state. Recreating it.", error);
  }

  const database = await readLegacyDatabase() ?? createInitialDatabase();
  await writeSqliteDatabase(database, { invalidateReadCache: false });
  cacheSqliteDatabase(database);
  logLessonPerf("readDatabase(sqlite:init)", startedAt);
  return database;
}

async function readSqliteDatabase() {
  const cached = readCachedSqliteDatabase();
  if (cached) return cached;
  if (sqliteReadPromise) return sqliteReadPromise;

  const readPromise = loadSqliteDatabase().finally(() => {
    if (sqliteReadPromise === readPromise) {
      sqliteReadPromise = null;
    }
  });
  sqliteReadPromise = readPromise;
  return readPromise;
}

async function ensureInitialPostgresState(sql: PostgresExecutor) {
  const database = createInitialDatabase();
  await sql`
    INSERT INTO app_state (id, schema_version, payload, updated_at)
    VALUES (${stateRecordId}, ${schemaVersion}, ${JSON.stringify(database)}::jsonb, ${new Date().toISOString()})
    ON CONFLICT (id) DO NOTHING
  `;
}

async function selectPostgresStateRows(sql: PostgresExecutor, lockForUpdate = false) {
  if (lockForUpdate) {
    return sql<StateRow[]>`
      SELECT payload
      FROM app_state
      WHERE id = ${stateRecordId}
      FOR UPDATE
    `;
  }

  return sql<StateRow[]>`
    SELECT payload
    FROM app_state
    WHERE id = ${stateRecordId}
  `;
}

async function normalizeLockedPostgresState(sql: PostgresExecutor) {
  await ensureInitialPostgresState(sql);
  const rows = await selectPostgresStateRows(sql, true);
  const parsed = rows[0] ? parseStoredStatePayload(rows[0].payload) : null;
  if (hasCoreTables(parsed)) {
    const database = normalizeDatabase(parsed);
    if (databaseNeedsPersistenceSync(parsed, database)) {
      await writePostgresDatabaseWith(sql, database, true);
    }
    return database;
  }

  const database = createInitialDatabase();
  await writePostgresDatabaseWith(sql, database, true);
  return database;
}

async function synchronizePostgresStateForRead() {
  await ensurePostgresStateTable();
  // Read-triggered normalization writes a full JSONB snapshot, so lock the row first
  // to avoid overwriting a newer registration, attempt, or reward mutation.
  return getPostgresClient().begin(async (sql) => normalizeLockedPostgresState(sql));
}

async function readPostgresDatabaseFrom(sql: PostgresExecutor, lockForUpdate = false, tableReady = false) {
  if (!tableReady) await ensurePostgresStateTable();
  if (lockForUpdate) return normalizeLockedPostgresState(sql);

  const rows = await selectPostgresStateRows(sql);
  const parsed = rows[0] ? parseStoredStatePayload(rows[0].payload) : null;
  if (hasCoreTables(parsed)) {
    const database = normalizeDatabase(parsed);
    if (databaseNeedsPersistenceSync(parsed, database)) {
      return synchronizePostgresStateForRead();
    }
    return database;
  }

  return synchronizePostgresStateForRead();
}

async function readPostgresDatabase() {
  return readPostgresDatabaseFrom(getPostgresClient());
}

async function writePostgresDatabaseWith(sql: PostgresExecutor, database: Database, tableReady = false) {
  if (!tableReady) await ensurePostgresStateTable();
  databaseIndexCache.delete(database);
  await sql`
    INSERT INTO app_state (id, schema_version, payload, updated_at)
    VALUES (${stateRecordId}, ${schemaVersion}, ${JSON.stringify(database)}::jsonb, ${new Date().toISOString()})
    ON CONFLICT (id) DO UPDATE SET
      schema_version = excluded.schema_version,
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `;
}

async function writePostgresDatabase(database: Database) {
  await writePostgresDatabaseWith(getPostgresClient(), database);
}

async function readDatabase() {
  return storageProvider === "postgres" ? readPostgresDatabase() : readSqliteDatabase();
}

async function writeSqliteDatabase(database: Database, options: { invalidateReadCache?: boolean } = {}) {
  await mkdir(dbDirectory, { recursive: true });
  const now = new Date().toISOString();
  databaseIndexCache.delete(database);
  getSqliteDatabase()
    .prepare(`
      INSERT INTO app_state (id, schema_version, payload, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        schema_version = excluded.schema_version,
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `)
    .run(stateRecordId, schemaVersion, JSON.stringify(database), now);
  if (options.invalidateReadCache ?? true) {
    clearSqliteReadCache();
  }
}

async function writeDatabase(database: Database) {
  if (storageProvider === "postgres") {
    await writePostgresDatabase(database);
    return;
  }

  await writeSqliteDatabase(database);
}

let mutationQueue: Promise<void> = Promise.resolve();

async function mutateDatabase<T>(mutator: (database: Database) => T | Promise<T>) {
  if (storageProvider === "postgres") {
    await ensurePostgresStateTable();
    return getPostgresClient().begin(async (sql) => {
      const database = await readPostgresDatabaseFrom(sql, true, true);
      const result = await mutator(database);
      databaseIndexCache.delete(database);
      await writePostgresDatabaseWith(sql, database, true);
      return result;
    });
  }

  const run = mutationQueue.then(async () => {
    clearSqliteReadCache();
    const database = await readDatabase();
    const result = await mutator(database);
    databaseIndexCache.delete(database);
    await writeSqliteDatabase(database, { invalidateReadCache: false });
    cacheSqliteDatabase(database);
    return result;
  });

  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );

  return run;
}

function defaultSettings(userId: string, grade: GradeId): UserSettingsRecord {
  return {
    user_id: userId,
    language: "en",
    theme: "dark",
    selected_grade: grade,
    updated_at: new Date().toISOString()
  };
}

const seedTopicById = new Map(seedTopics.map((topic) => [topic.id, topic]));

function topicRecordForId(database: Database, topicId: string) {
  return indexesForDatabase(database).topicById.get(topicId);
}

function hasCjkText(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
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

function isCurriculumTopic(topic: TopicRecord, scope: CurriculumScope) {
  const profile = curriculumProfileForScope(scope);
  return curriculumContentEnabledFor(profile) && contentMatchesCurriculumProfile(
    {
      curriculumTrack: topic.curriculum_track,
      region: topic.curriculum_region,
      publisher: topic.textbook_publisher
    },
    profile
  );
}

function isDefaultCurriculumTopic(topic: TopicRecord) {
  return isCurriculumTopic(topic, defaultCurriculumTrack);
}

function isCurriculumQuestion(question: QuestionRecord, scope: CurriculumScope) {
  const profile = curriculumProfileForScope(scope);
  return curriculumContentEnabledFor(profile) && contentMatchesCurriculumProfile(
    {
      curriculumTrack: question.curriculum_track,
      region: question.curriculum_region,
      publisher: question.textbook_publisher
    },
    profile
  );
}

function isDefaultCurriculumQuestion(question: QuestionRecord) {
  return isCurriculumQuestion(question, defaultCurriculumTrack);
}

function topicLabelFor(database: Database, question: QuestionRecord): LocalizedText {
  const topic = topicRecordForId(database, question.topic_id);
  const seedTopic = seedTopicById.get(question.topic_id);
  return topic
    ? localizedTopicTitleForRecord(topic)
    : seedTopic?.title ?? { en: question.topic_id, zh: question.topic_id };
}

function toPublicQuestion(database: Database, question: QuestionRecord): PublicQuestion {
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
    difficulty: question.difficulty,
    type: question.type,
    prompt: {
      en: question.prompt_en,
      zh: question.prompt_zh
    },
    options: question.options ?? undefined,
    diagram: question.diagram ?? undefined
  };
}

function knowledgeComponentTopics(database: Database, grade?: GradeId, curriculumTrack: CurriculumScope = defaultCurriculumProfile): Topic[] {
  return database.topics
    .filter((topic) => isCurriculumTopic(topic, curriculumTrack) && (!grade || topic.grade === grade))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((topic) => toTopicWithProgress(database, null, topic));
}

function knowledgeComponentQuestions(database: Database, grade?: GradeId, curriculumTrack: CurriculumScope = defaultCurriculumProfile): PublicQuestion[] {
  return database.questions
    .filter((question) => isCurriculumQuestion(question, curriculumTrack) && (!grade || question.grade === grade))
    .map((question) => toPublicQuestion(database, question));
}

function knowledgeComponentsForDatabase(database: Database, grade?: GradeId, curriculumTrack: CurriculumScope = defaultCurriculumProfile): KnowledgeComponent[] {
  return buildKnowledgeComponents({
    topics: knowledgeComponentTopics(database, grade, curriculumTrack),
    questions: knowledgeComponentQuestions(database, grade, curriculumTrack)
  });
}

function adaptiveSkillStateFromRecord(record: AdaptiveSkillStateRecord): AdaptiveSkillState {
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

function adaptiveSkillStateToRecord(userId: string, state: AdaptiveSkillState): AdaptiveSkillStateRecord {
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

function adaptiveStatesForUser(database: Database, userId: string) {
  return database.adaptive_skill_state
    .filter((record) => record.user_id === userId)
    .map(adaptiveSkillStateFromRecord);
}

function upsertAdaptiveSkillState(database: Database, userId: string, state: AdaptiveSkillState) {
  const record = adaptiveSkillStateToRecord(userId, state);
  const index = database.adaptive_skill_state.findIndex(
    (candidate) => candidate.user_id === userId && candidate.skill_id === state.skillId
  );

  if (index >= 0) {
    database.adaptive_skill_state[index] = record;
  } else {
    database.adaptive_skill_state.push(record);
  }
}

function adaptiveSkillForQuestion(database: Database, question: QuestionRecord) {
  const components = knowledgeComponentsForDatabase(database, question.grade, question.curriculum_track).filter((skill) => skill.topicId === question.topic_id);
  const stage = question.difficulty === "Foundation" ? "foundation" : question.difficulty === "Core" ? "fluency" : "transfer";
  return components.find((skill) => skill.id === `${question.topic_id}:${stage}`) ?? components[0] ?? null;
}

function adaptiveSkillForStage(skills: KnowledgeComponent[], stage: "foundation" | "fluency" | "transfer") {
  return skills.find((skill) => skill.id.endsWith(`:${stage}`)) ?? null;
}

function applyAdaptiveEvidence({
  database,
  userId,
  skill,
  correct,
  now
}: {
  database: Database;
  userId: string;
  skill: KnowledgeComponent;
  correct: boolean;
  now: string;
}) {
  const existing = database.adaptive_skill_state.find(
    (record) => record.user_id === userId && record.skill_id === skill.id
  );
  const currentState = existing
    ? adaptiveSkillStateFromRecord(existing)
    : createInitialAdaptiveSkillState(skill.id, now);
  const nextState = updateAdaptiveState({
    state: currentState,
    correct,
    now,
    misconceptionTags: skill.misconceptionTags
  });

  upsertAdaptiveSkillState(database, userId, nextState);
}

function updateLessonProgressFromAdaptiveState(database: Database, userId: string, topicId: string, now: string) {
  const topic = topicRecordForId(database, topicId);
  if (!topic) return;

  const topicSkillIds = new Set(knowledgeComponentsForDatabase(database, topic.grade, topic.curriculum_track)
    .filter((skill) => skill.topicId === topicId)
    .map((skill) => skill.id));
  const states = database.adaptive_skill_state
    .filter((record) => record.user_id === userId && topicSkillIds.has(record.skill_id));
  if (!states.length) return;

  const mastery = Math.round((states.reduce((sum, state) => sum + state.p_mastery, 0) / states.length) * 100);
  const status: TopicStatus = mastery >= 85 ? "completed" : "in-progress";
  const existing = database.lesson_progress.find(
    (progress) => progress.user_id === userId && progress.topic_id === topicId
  );

  if (existing) {
    existing.lesson_slug = existing.lesson_slug ?? lessonSlugForTopic(topicId);
    existing.mastery = mastery;
    existing.status = status;
    existing.started_at = existing.started_at ?? now;
    existing.completed_at = status === "completed" ? existing.completed_at ?? now : null;
    existing.duration_seconds = existing.duration_seconds ?? null;
    existing.checklist_state = existing.checklist_state ?? {};
    existing.updated_at = now;
    return;
  }

  database.lesson_progress.push({
    user_id: userId,
    topic_id: topicId,
    lesson_slug: lessonSlugForTopic(topicId),
    status,
    mastery,
    started_at: now,
    completed_at: status === "completed" ? now : null,
    duration_seconds: null,
    checklist_state: {},
    updated_at: now
  });
}

function adaptiveCacheTopicId(topicId?: string | null) {
  return topicId?.trim() || null;
}

function invalidateAdaptiveRecommendationCache(
  database: Database,
  userId: string,
  grade: GradeId,
  topicId?: string | null
) {
  const normalizedTopicId = adaptiveCacheTopicId(topicId);
  database.adaptive_recommendation_cache = database.adaptive_recommendation_cache.filter((record) => {
    if (record.user_id !== userId || record.grade !== grade) return true;
    if (!normalizedTopicId) return false;
    return record.topic_id !== null && record.topic_id !== normalizedTopicId;
  });
}

function updateAdaptiveStateFromAttempt(database: Database, userId: string, question: QuestionRecord, correct: boolean, now: string) {
  const skill = adaptiveSkillForQuestion(database, question);
  if (!skill) {
    updateLessonProgressFromAttempts(database, userId, question, now);
    invalidateAdaptiveRecommendationCache(database, userId, question.grade, question.topic_id);
    return;
  }

  applyAdaptiveEvidence({ database, userId, skill, correct, now });
  updateLessonProgressFromAdaptiveState(database, userId, question.topic_id, now);
  invalidateAdaptiveRecommendationCache(database, userId, question.grade, question.topic_id);
}

function clampUnit(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function lessonPracticeQuestionIds(database: Database, lesson: LessonRecord) {
  return new Set(
    database.lesson_blocks
      .filter((block) => block.lesson_slug === lesson.slug)
      .flatMap((block) => block.practice_question_ids ?? [])
  );
}

function lessonOutcomeMetrics(
  database: Database,
  userId: string,
  lesson: LessonRecord,
  progress: LessonProgressRecord
) {
  const practiceQuestionIds = lessonPracticeQuestionIds(database, lesson);
  const attempts = database.attempts.filter((attempt) => {
    if (attempt.user_id !== userId) return false;
    if (practiceQuestionIds.size) return practiceQuestionIds.has(attempt.question_id);
    return questionForId(database, attempt.question_id)?.topic_id === lesson.topic_id;
  });
  const attemptedQuestionIds = new Set(attempts.map((attempt) => attempt.question_id));
  const checklistValues = Object.values(progress.checklist_state ?? {});
  const checklistRatio = checklistValues.length
    ? checklistValues.filter(Boolean).length / checklistValues.length
    : progress.status === "completed"
      ? 1
      : 0;
  const questionCoverage = practiceQuestionIds.size
    ? attemptedQuestionIds.size / practiceQuestionIds.size
    : attempts.length
      ? 1
      : 0;
  const accuracy = attempts.length
    ? attempts.filter((attempt) => attempt.is_correct).length / attempts.length
    : null;
  const estimatedSeconds = Math.max(lesson.estimated_minutes * 60, 60);
  const attemptDurationSeconds = attempts.reduce((sum, attempt) => sum + (attempt.duration_seconds ?? 0), 0);
  const duration = progress.duration_seconds ?? (attemptDurationSeconds > 0 ? attemptDurationSeconds : null);
  const timeSignal =
    typeof duration === "number" && Number.isFinite(duration) && duration > 0
      ? duration < estimatedSeconds * 0.2
        ? 0.45
        : duration <= estimatedSeconds * 2
          ? 1
          : 0.8
      : 0.75;
  const accuracySignal = accuracy ?? (progress.status === "completed" ? 0.7 : 0.35);
  const score =
    clampUnit(checklistRatio) * 0.35 +
    clampUnit(accuracySignal) * 0.35 +
    clampUnit(questionCoverage) * 0.2 +
    clampUnit(timeSignal) * 0.1;

  return {
    score: clampUnit(score),
    accuracy,
    questionCoverage: clampUnit(questionCoverage),
    attemptCount: attempts.length
  };
}

function applyRepeatedAdaptiveEvidence({
  database,
  userId,
  skill,
  correct,
  now,
  count
}: {
  database: Database;
  userId: string;
  skill: KnowledgeComponent | null;
  correct: boolean;
  now: string;
  count: number;
}) {
  if (!skill) return;
  for (let index = 0; index < count; index += 1) {
    applyAdaptiveEvidence({ database, userId, skill, correct, now });
  }
}

function updateAdaptiveStateFromLessonOutcome(
  database: Database,
  userId: string,
  lesson: LessonRecord,
  progress: LessonProgressRecord,
  now: string
) {
  if (progress.status !== "completed") return;

  const lessonTopic = topicRecordForId(database, lesson.topic_id);
  const topicSkills = knowledgeComponentsForDatabase(database, lesson.grade, lessonTopic?.curriculum_track ?? defaultCurriculumTrack).filter((skill) => skill.topicId === lesson.topic_id);
  if (!topicSkills.length) return;

  const metrics = lessonOutcomeMetrics(database, userId, lesson, progress);
  const foundation = adaptiveSkillForStage(topicSkills, "foundation");
  const fluency = adaptiveSkillForStage(topicSkills, "fluency");
  const transfer = adaptiveSkillForStage(topicSkills, "transfer");

  if (metrics.score >= 0.75) {
    applyRepeatedAdaptiveEvidence({ database, userId, skill: foundation, correct: true, now, count: 2 });
  } else if (metrics.score >= 0.55) {
    applyRepeatedAdaptiveEvidence({ database, userId, skill: foundation, correct: true, now, count: 1 });
  } else if (metrics.attemptCount > 0 && metrics.accuracy !== null && metrics.accuracy < 0.5) {
    applyRepeatedAdaptiveEvidence({ database, userId, skill: foundation, correct: false, now, count: 1 });
  }

  if (metrics.attemptCount >= 2 && metrics.accuracy !== null && metrics.accuracy >= 0.75 && metrics.questionCoverage >= 0.25) {
    applyRepeatedAdaptiveEvidence({ database, userId, skill: fluency, correct: true, now, count: 1 });
  } else if (metrics.attemptCount >= 2 && metrics.accuracy !== null && metrics.accuracy < 0.5) {
    applyRepeatedAdaptiveEvidence({ database, userId, skill: fluency, correct: false, now, count: 1 });
  }

  if (metrics.attemptCount >= 3 && metrics.accuracy !== null && metrics.accuracy >= 0.9 && metrics.score >= 0.85) {
    applyRepeatedAdaptiveEvidence({ database, userId, skill: transfer, correct: true, now, count: 1 });
  }
}

function toTopicRecordTopic(topic: TopicRecord, progress?: LessonProgressRecord | null): Topic {
  const curriculumProfile = profileForRecord(topic);
  return {
    id: topic.id,
    curriculumTrack: topic.curriculum_track,
    curriculumProfile,
    region: topic.curriculum_region ?? curriculumProfile.region,
    publisher: topic.textbook_publisher,
    canonicalTopicId: topic.canonical_topic_id ?? topic.id,
    grade: topic.grade,
    title: localizedTopicTitleForRecord(topic),
    description: { en: topic.description_en, zh: topic.description_zh },
    status: progress?.status ?? "not-started",
    difficulty: topic.difficulty,
    minutes: topic.minutes,
    mastery: progress?.mastery ?? 0
  };
}

function toTopicWithProgress(database: Database, userId: string | null, topic: TopicRecord): Topic {
  const progress = userId
    ? indexesForDatabase(database).lessonProgressByUserTopicId.get(userTopicProgressKey(userId, topic.id))
    : null;
  const seedTopic = seedTopicById.get(topic.id);

  if (!progress && !userId && seedTopic) return seedTopic;
  return toTopicRecordTopic(topic, progress);
}

function lessonProgressFor(database: Database, userId: string, lesson: LessonRecord) {
  const indexes = indexesForDatabase(database);
  return indexes.lessonProgressByUserSlug.get(userSlugProgressKey(userId, lesson.slug))
    ?? indexes.lessonProgressByUserTopicId.get(userTopicProgressKey(userId, lesson.topic_id));
}

function questionForId(database: Database, questionId: string) {
  return indexesForDatabase(database).questionById.get(questionId);
}

function toMistakeBookItem(database: Database, mistake: MistakeRecordRow): MistakeBookItem | null {
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

function upsertMistake(database: Database, userId: string, question: QuestionRecord, selectedAnswer: string, now: string) {
  const existing = database.mistakes.find(
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

  database.mistakes.unshift({
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

function markExistingMistakeMastered(database: Database, userId: string, questionId: string, now: string) {
  const existing = database.mistakes.find(
    (mistake) => mistake.user_id === userId && mistake.question_id === questionId
  );

  if (existing) {
    existing.last_attempt_at = now;
    existing.mastered = true;
  }
}

function updateLessonProgressFromAttempts(database: Database, userId: string, question: QuestionRecord, now: string) {
  const topicAttempts = database.attempts.filter((attempt) => {
    const attemptedQuestion = questionForId(database, attempt.question_id);
    return attempt.user_id === userId && attemptedQuestion?.topic_id === question.topic_id;
  });
  if (!topicAttempts.length) return;

  const correctAttempts = topicAttempts.filter((attempt) => attempt.is_correct).length;
  const accuracy = correctAttempts / topicAttempts.length;
  const mastery = Math.min(100, Math.round(accuracy * 85 + Math.min(15, topicAttempts.length * 3)));
  const status: TopicStatus = mastery >= 75 ? "completed" : "in-progress";
  const existing = database.lesson_progress.find(
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

  database.lesson_progress.push({
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

function studentClassIds(database: Database, userId: string) {
  return new Set(
    database.class_enrollments
      .filter((enrollment) => enrollment.student_id === userId)
      .map((enrollment) => enrollment.class_id)
  );
}

function completeAssignmentSubmission({
  database,
  userId,
  assignment,
  now,
  score,
  graded,
  feedbackEn,
  feedbackZh
}: {
  database: Database;
  userId: string;
  assignment: AssignmentRecord;
  now: string;
  score?: number | null;
  graded?: boolean;
  feedbackEn: string;
  feedbackZh: string;
}) {
  const submission = database.submissions.find(
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

function completeMatchingAssignments({
  database,
  userId,
  contentType,
  targetIds,
  now,
  score,
  graded,
  feedbackEn,
  feedbackZh
}: {
  database: Database;
  userId: string;
  contentType: AssignmentContentType;
  targetIds: string[];
  now: string;
  score?: number | null;
  graded?: boolean;
  feedbackEn: string;
  feedbackZh: string;
}) {
  const classIds = studentClassIds(database, userId);
  if (!classIds.size) return;
  const targetSet = new Set(targetIds.filter(Boolean));

  database.assignments
    .filter((assignment) => {
      if (!classIds.has(assignment.class_id) || assignment.content_type !== contentType || assignment.status !== "active") {
        return false;
      }
      return !assignment.target_id || targetSet.has(assignment.target_id);
    })
    .forEach((assignment) => {
      completeAssignmentSubmission({
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

function updatePracticeAssignmentSubmissionsFromAttempt(
  database: Database,
  userId: string,
  question: QuestionRecord,
  correct: boolean,
  now: string
) {
  completeMatchingAssignments({
    database,
    userId,
    contentType: "practice",
    targetIds: [question.id, question.topic_id],
    now,
    score: correct ? 100 : 0,
    graded: true,
    feedbackEn: correct ? "Auto-graded from the linked practice attempt." : "Auto-graded. Review the explanation and try again if retakes are allowed.",
    feedbackZh: correct ? "已按連結練習自動批改。" : "已自動批改。如允許重做，請重溫解釋後再試。"
  });
}

function toAuthenticatedUser(database: Database, user: UserRecord): AuthenticatedUser | null {
  const profile = database.student_profiles.find((candidate) => candidate.user_id === user.id);
  if (!profile) return null;
  const curriculumProfile = normalizeStoredCurriculumProfile({
    curriculumTrack: normalizeCurriculumTrack(profile.curriculum_track),
    region: profile.curriculum_region,
    publisher: profile.textbook_publisher
  });
  const curriculumTrack = curriculumTrackForProfile(curriculumProfile) ?? (user.role === "student" ? undefined : defaultCurriculumTrack);
  if (!curriculumTrack) return null;

  const settings =
    database.user_settings.find((candidate) => candidate.user_id === user.id) ??
    defaultSettings(user.id, profile.grade);

  return {
    user: {
      id: user.id,
      name: profile.name,
      username: user.username,
      email: user.email,
      schoolId: user.school_id,
      passwordMustChange: user.password_must_change ?? false,
      avatarId: isValidStudentAvatarId(profile.avatar_id) ? profile.avatar_id : defaultStudentAvatarId,
      avatarImageDataUrl: normalizeStudentAvatarImageDataUrl(profile.avatar_image_data_url),
      grade: profile.grade,
      curriculumTrack,
      curriculumProfile,
      role: user.role
    },
    settings: {
      language: settings.language,
      theme: settings.theme,
      selectedGrade: settings.selected_grade
    }
  };
}

function canUseTeacherArea(user?: UserRecord | null): user is UserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function canUseParentArea(user?: UserRecord | null): user is UserRecord {
  return user?.role === "parent" || user?.role === "admin";
}

function studentProfileFor(database: Database, userId: string) {
  return database.student_profiles.find((profile) => profile.user_id === userId);
}

function toGuardianLink(database: Database, record: GuardianLinkRecord): GuardianLink {
  const parentProfile = studentProfileFor(database, record.parent_id);
  const parentUser = database.users.find((candidate) => candidate.id === record.parent_id);
  const studentProfile = studentProfileFor(database, record.student_id);
  const studentUser = database.users.find((candidate) => candidate.id === record.student_id);

  return {
    id: record.id,
    parentId: record.parent_id,
    parentName: parentProfile?.name ?? parentUser?.username ?? "Parent",
    studentId: record.student_id,
    studentName: studentProfile?.name ?? studentUser?.username ?? "Student",
    studentGrade: studentProfile?.grade ?? "S3",
    relationship: record.relationship,
    status: record.status,
    inviteCode: record.invite_code,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function parentCanAccessStudentInDatabase(database: Database, parentId: string, studentId: string) {
  const parent = database.users.find((candidate) => candidate.id === parentId);
  if (parent?.role === "admin") return database.users.some((candidate) => candidate.id === studentId && candidate.role === "student");
  return database.guardian_links.some(
    (link) => link.parent_id === parentId && link.student_id === studentId && link.status === "active"
  );
}

function teacherClassRecordsFor(database: Database, user: UserRecord) {
  const membershipClassIds = new Set(
    database.school_memberships
      .filter((membership) => membership.user_id === user.id && membership.class_id && (membership.role === "teacher" || membership.role === "admin"))
      .map((membership) => membership.class_id as string)
  );

  return database.teacher_classes
    .filter((teacherClass) => user.role === "admin" || teacherClass.teacher_id === user.id || membershipClassIds.has(teacherClass.id))
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));
}

function toTeacherClass(database: Database, record: TeacherClassRecord): TeacherClass {
  const studentCount = database.class_enrollments.filter((enrollment) => enrollment.class_id === record.id).length;
  const curriculumProfile = curriculumProfileForClass(database, record);

  return {
    id: record.id,
    teacherId: record.teacher_id,
    schoolId: record.school_id,
    classCode: record.class_code,
    name: record.name,
    grade: record.grade,
    curriculumTrack: curriculumTrackForProfile(curriculumProfile),
    curriculumProfile,
    academicYear: record.academic_year,
    description: {
      en: record.description_en,
      zh: record.description_zh
    },
    studentCount,
    inviteCode: record.invite_code,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function toClassEnrollment(database: Database, record: ClassEnrollmentRecord): ClassEnrollment {
  const profile = studentProfileFor(database, record.student_id);
  const user = database.users.find((candidate) => candidate.id === record.student_id);

  return {
    id: record.id,
    classId: record.class_id,
    studentId: record.student_id,
    studentName: profile?.name ?? user?.username ?? "Unknown student",
    studentGrade: profile?.grade ?? "S3",
    joinedAt: record.joined_at
  };
}

function assignmentSubmissionCounts(database: Database, assignmentId: string) {
  const submissions = database.submissions.filter((submission) => submission.assignment_id === assignmentId);
  const completed = submissions.filter((submission) =>
    submission.status === "submitted" || submission.status === "graded" || submission.status === "late"
  );

  return {
    submissionCount: submissions.length,
    completedCount: completed.length
  };
}

function toAssignment(database: Database, record: AssignmentRecord): Assignment {
  const counts = assignmentSubmissionCounts(database, record.id);

  return {
    id: record.id,
    classId: record.class_id,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    description: {
      en: record.description_en,
      zh: record.description_zh
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

function toSubmission(database: Database, record: SubmissionRecord): Submission {
  const profile = studentProfileFor(database, record.student_id);

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
    updatedAt: record.updated_at
  };
}

function toTeacherMessage(database: Database, record: TeacherMessageRecord): TeacherMessage {
  const profile = studentProfileFor(database, record.student_id);
  const guardianProfile = record.guardian_id ? studentProfileFor(database, record.guardian_id) : null;
  const guardianUser = record.guardian_id ? database.users.find((candidate) => candidate.id === record.guardian_id) : null;

  return {
    id: record.id,
    classId: record.class_id,
    studentId: record.student_id,
    studentName: profile?.name ?? "Unknown student",
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

const rewardEarnRules: RewardEarnRule[] = [
  {
    id: "lesson-complete",
    label: { en: "Complete a lesson", zh: "完成課節" },
    detail: { en: "Finish a lesson checklist and mark the lesson complete.", zh: "完成課節清單並標記課節完成。" },
    points: 40
  },
  {
    id: "practice-accuracy",
    label: { en: "Show strong practice accuracy", zh: "練習準確率良好" },
    detail: { en: "Answer practice questions carefully and improve accuracy.", zh: "細心完成練習題並提升準確率。" },
    points: 30
  },
  {
    id: "streak",
    label: { en: "Keep a learning streak", zh: "保持連續學習" },
    detail: { en: "Return regularly and keep a positive study rhythm.", zh: "定期回來學習，保持良好節奏。" },
    points: 25
  },
  {
    id: "visualization-complete",
    label: { en: "Explore a visualization", zh: "完成視覺化探索" },
    detail: { en: "Use interactive math models to explain what changed.", zh: "使用互動數學模型並解釋變化。" },
    points: 20
  },
  {
    id: "mistake-review",
    label: { en: "Review mistakes", zh: "重溫錯題" },
    detail: { en: "Use the mistake book to correct misunderstandings.", zh: "使用錯題簿修正誤解。" },
    points: 15
  },
  {
    id: "adventure-island-complete",
    label: { en: "Clear an Adventure Island math game", zh: "完成探险岛数学游戏" },
    detail: { en: "Unlock Adventure Island from Practice Arena and clear it with checked quadratic answers.", zh: "由练习场解锁探险岛，并用已批改的二次函数答案通关。" },
    points: 35
  },
  {
    id: "fishing-game-complete",
    label: { en: "Clear a Fishing math game", zh: "完成捕魚數學遊戲" },
    detail: { en: "Earn up to 30 points from a Practice Arena free-selection Fishing Game.", zh: "由練習場自由選題捕魚遊戲最多取得 30 分。" },
    points: 30
  }
];

const teacherRewardReasonPresets: RewardEarnRule[] = [
  {
    id: "great-effort",
    label: { en: "Great effort", zh: "努力學習" },
    detail: { en: "For persistence, careful working, or improved study habits.", zh: "獎勵堅持、細心演算或學習習慣進步。" },
    points: 20
  },
  {
    id: "helping-classmates",
    label: { en: "Helping classmates", zh: "幫助同學" },
    detail: { en: "For explaining ideas clearly or supporting peers.", zh: "獎勵清楚解釋想法或支援同學。" },
    points: 15
  },
  {
    id: "improved-accuracy",
    label: { en: "Improved accuracy", zh: "準確率進步" },
    detail: { en: "For reducing repeated mistakes and checking answers.", zh: "獎勵減少重複錯誤及檢查答案。" },
    points: 25
  },
  {
    id: "completed-challenge",
    label: { en: "Completed challenge", zh: "完成挑戰" },
    detail: { en: "For completing a challenge or extension task.", zh: "獎勵完成挑戰題或延伸任務。" },
    points: 30
  }
];

function studentNameFor(database: Database, studentId: string) {
  const profile = studentProfileFor(database, studentId);
  const user = database.users.find((candidate) => candidate.id === studentId);
  return profile?.name ?? user?.username ?? "Unknown student";
}

function teacherNameFor(database: Database, teacherId?: string) {
  if (!teacherId) return undefined;
  const profile = studentProfileFor(database, teacherId);
  const user = database.users.find((candidate) => candidate.id === teacherId);
  return profile?.name ?? user?.username;
}

function toRewardCatalogItem(record: RewardCatalogRecord): RewardCatalogItem {
  return {
    id: record.id,
    name: {
      en: record.name_en,
      zh: record.name_zh
    },
    description: {
      en: record.description_en,
      zh: record.description_zh
    },
    category: record.category,
    pointsCost: record.points_cost,
    available: record.available,
    accent: record.accent,
    thumbnailLabel: record.thumbnail_label
  };
}

function rewardCatalogFor(database: Database) {
  return database.reward_catalog
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.name_en.localeCompare(b.name_en));
}

function rewardCatalogItemFor(database: Database, itemId: string) {
  return rewardCatalogFor(database).find((item) => item.id === itemId) ?? null;
}

function toRewardPointLedgerEntry(database: Database, record: RewardPointLedgerRecord): RewardPointLedgerEntry {
  return {
    id: record.id,
    studentId: record.student_id,
    studentName: studentNameFor(database, record.student_id),
    amount: record.amount,
    reason: record.reason,
    label: {
      en: record.label_en,
      zh: record.label_zh
    },
    note: record.note,
    awardedBy: record.awarded_by,
    awardedByName: teacherNameFor(database, record.awarded_by),
    redemptionId: record.redemption_id,
    sourceKey: record.source_key,
    createdAt: record.created_at
  };
}

function fallbackRewardCatalogRecord(itemId: string): RewardCatalogRecord {
  return {
    id: itemId,
    name_en: "Unknown reward",
    name_zh: "未知獎品",
    description_en: "This reward item is no longer in the catalog.",
    description_zh: "此獎品已不在兌換目錄內。",
    category: "stationery",
    points_cost: 1,
    available: false,
    accent: "from-slate-300 via-slate-400 to-slate-500",
    thumbnail_label: "?",
    sort_order: 999
  };
}

function toRewardRedemptionRequest(database: Database, record: RewardRedemptionRecord): RewardRedemptionRequest {
  const itemRecord = rewardCatalogItemFor(database, record.item_id) ?? fallbackRewardCatalogRecord(record.item_id);
  const item = toRewardCatalogItem(itemRecord);

  return {
    id: record.id,
    studentId: record.student_id,
    studentName: studentNameFor(database, record.student_id),
    item,
    pointsCost: record.points_cost,
    status: record.status,
    requestedAt: record.requested_at,
    decidedAt: record.decided_at,
    fulfilledAt: record.fulfilled_at,
    decidedBy: record.decided_by,
    decidedByName: teacherNameFor(database, record.decided_by),
    teacherNote: record.teacher_note
  };
}

function rewardReservedPointsForStudent(database: Database, studentId: string) {
  return database.reward_redemptions
    .filter((redemption) => redemption.student_id === studentId && (redemption.status === "pending" || redemption.status === "approved"))
    .reduce((sum, redemption) => sum + redemption.points_cost, 0);
}

function rewardSummaryForStudent(database: Database, studentId: string): RewardPointSummary {
  const ledger = database.reward_point_ledger.filter((entry) => entry.student_id === studentId);
  const balance = ledger.reduce((sum, entry) => sum + entry.amount, 0);
  const lifetimeEarned = ledger.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
  const spent = Math.abs(ledger.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0));
  const reserved = rewardReservedPointsForStudent(database, studentId);
  const studentRedemptions = database.reward_redemptions.filter((redemption) => redemption.student_id === studentId);

  return {
    balance,
    available: Math.max(0, balance - reserved),
    reserved,
    lifetimeEarned,
    spent,
    pendingRequests: studentRedemptions.filter((redemption) => redemption.status === "pending").length,
    approvedRequests: studentRedemptions.filter((redemption) => redemption.status === "approved").length
  };
}

function teacherRewardStudentIds(database: Database, user: UserRecord) {
  const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
  return Array.from(
    new Set(
      database.class_enrollments
        .filter((enrollment) => classIds.has(enrollment.class_id))
        .map((enrollment) => enrollment.student_id)
    )
  );
}

function teacherCanAccessRewardStudent(database: Database, user: UserRecord, studentId: string) {
  return user.role === "admin" || Boolean(teacherClassForStudent(database, user, studentId));
}

type AutomaticRewardReason = Exclude<RewardPointReason, "teacher-award" | "redemption-spent">;

function rewardEarnRuleFor(reason: AutomaticRewardReason) {
  return rewardEarnRules.find((rule) => rule.id === reason) ?? null;
}

function awardAutomaticRewardOnce(
  database: Database,
  {
    studentId,
    reason,
    sourceKey,
    label,
    note,
    createdAt = new Date().toISOString()
  }: {
    studentId: string;
    reason: AutomaticRewardReason;
    sourceKey: string;
    label: LocalizedText;
    note?: string;
    createdAt?: string;
  }
) {
  const student = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
  const rule = rewardEarnRuleFor(reason);
  const cleanSourceKey = sourceKey.trim().replace(/\s+/g, "-").slice(0, 240);
  if (!student || !rule || !cleanSourceKey) return false;
  if (database.reward_point_ledger.some((entry) => entry.source_key === cleanSourceKey)) return false;
  const decision = recordGamificationEventOnce(database, {
    studentId,
    source: reason,
    sourceKey: cleanSourceKey,
    label,
    rewardPoints: rule.points,
    createdAt
  });
  if (!decision.allowed || decision.appliedRewardPoints <= 0) return false;

  database.reward_point_ledger.unshift({
    id: `reward-ledger-${randomUUID()}`,
    student_id: studentId,
    amount: decision.appliedRewardPoints,
    reason,
    label_en: label.en,
    label_zh: label.zh,
    note: note?.trim().replace(/\s+/g, " ").slice(0, 180) || undefined,
    source_key: cleanSourceKey,
    created_at: createdAt
  });
  return true;
}

function maybeAwardPracticeAccuracyReward(database: Database, userId: string, question: QuestionRecord, now: string) {
  const dayStart = startOfUtcDay(new Date(now));
  const nextDayStart = new Date(dayStart.getTime() + dayMs);
  const topicAttempts = database.attempts.filter((attempt) => {
    if (attempt.user_id !== userId) return false;
    const attemptedQuestion = questionForId(database, attempt.question_id);
    if (attemptedQuestion?.topic_id !== question.topic_id) return false;
    const attemptMs = Date.parse(attempt.created_at);
    return attemptMs >= dayStart.getTime() && attemptMs < nextDayStart.getTime();
  });
  const correctAttempts = topicAttempts.filter((attempt) => attempt.is_correct).length;
  if (topicAttempts.length < 5 || correctAttempts / topicAttempts.length < 0.8) return false;

  const topic = topicRecordForId(database, question.topic_id);
  const title = topic ? localizedTopic(topic) : { en: question.topic_id, zh: question.topic_id };
  return awardAutomaticRewardOnce(database, {
    studentId: userId,
    reason: "practice-accuracy",
    sourceKey: `practice-accuracy:${userId}:${question.topic_id}:${dayStart.toISOString().slice(0, 10)}`,
    label: {
      en: `Strong ${title.en} practice accuracy`,
      zh: `${title.zh}練習準確率表現良好`
    },
    createdAt: now
  });
}

function learningStreakDays(database: Database, userId: string, asOf: Date) {
  const activeDates = new Set(
    database.learning_events
      .filter((event) => event.user_id === userId)
      .map((event) => startOfUtcDay(new Date(event.created_at)).toISOString().slice(0, 10))
  );
  let cursor = startOfUtcDay(asOf);
  let count = 0;

  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    count += 1;
    cursor = new Date(cursor.getTime() - dayMs);
  }

  return count;
}

function maybeAwardLearningStreakReward(database: Database, userId: string, asOf: Date) {
  const streakDays = learningStreakDays(database, userId, asOf);
  if (streakDays < 3) return false;

  return awardAutomaticRewardOnce(database, {
    studentId: userId,
    reason: "streak",
    sourceKey: `streak:${userId}:3-day`,
    label: {
      en: "Kept a three-day learning streak",
      zh: "保持三日連續學習"
    },
    createdAt: asOf.toISOString()
  });
}

function classNamesForStudent(database: Database, user: UserRecord, studentId: string) {
  const classRecords = teacherClassRecordsFor(database, user);
  return classRecords
    .filter((teacherClass) =>
      database.class_enrollments.some((enrollment) => enrollment.class_id === teacherClass.id && enrollment.student_id === studentId)
    )
    .map((teacherClass) => teacherClass.name);
}

function teacherRewardDashboardSummary(database: Database, user: UserRecord, nowMs: number) {
  const studentIds = teacherRewardStudentIds(database, user);
  const studentSummaries = studentIds
    .map((studentId) => ({
      studentId,
      studentName: studentNameFor(database, studentId),
      summary: rewardSummaryForStudent(database, studentId)
    }))
    .sort((a, b) => b.summary.available - a.summary.available || a.studentName.localeCompare(b.studentName));
  const studentIdSet = new Set(studentIds);
  const recentCutoff = nowMs - 7 * dayMs;

  return {
    pendingRedemptions: database.reward_redemptions.filter((redemption) => studentIdSet.has(redemption.student_id) && redemption.status === "pending").length,
    approvedRedemptions: database.reward_redemptions.filter((redemption) => studentIdSet.has(redemption.student_id) && redemption.status === "approved").length,
    pointsAwardedThisWeek: database.reward_point_ledger
      .filter((entry) => {
        const createdAt = timestampOf(entry.created_at);
        return studentIdSet.has(entry.student_id) && entry.amount > 0 && createdAt !== null && createdAt >= recentCutoff && createdAt <= nowMs;
      })
      .reduce((sum, entry) => sum + entry.amount, 0),
    topStudentName: studentSummaries[0]?.studentName ?? null,
    topStudentAvailablePoints: studentSummaries[0]?.summary.available ?? 0
  };
}

function toGamificationEvent(record: GamificationEventRecord): GamificationEvent {
  return {
    id: record.id,
    studentId: record.student_id,
    xp: record.xp,
    rewardPoints: record.reward_points,
    source: record.source,
    sourceKey: record.source_key,
    label: {
      en: record.label_en,
      zh: record.label_zh
    },
    status: record.status,
    antiAbuseFlags: record.anti_abuse_flags,
    economyVersion: record.economy_version,
    campaignId: record.campaign_id,
    createdAt: record.created_at
  };
}

function toRewardCampaign(record: RewardCampaignRecord): RewardCampaign {
  return {
    id: record.id,
    teacherId: record.teacher_id,
    classId: record.class_id,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    description: {
      en: record.description_en,
      zh: record.description_zh
    },
    status: record.status,
    budgetPoints: record.budget_points,
    awardedPoints: record.awarded_points,
    questIds: record.quest_ids,
    startsAt: record.starts_at,
    endsAt: record.ends_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function gamificationEventsForStudent(database: Database, studentId: string) {
  return database.gamification_events
    .filter((event) => event.student_id === studentId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toGamificationEvent);
}

function allClassNamesForStudent(database: Database, studentId: string) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.student_id === studentId)
    .map((enrollment) => database.teacher_classes.find((teacherClass) => teacherClass.id === enrollment.class_id)?.name)
    .filter((className): className is string => Boolean(className));
}

function activityTimestampsForStudent(database: Database, studentId: string) {
  return [
    ...database.attempts.filter((attempt) => attempt.user_id === studentId).map((attempt) => attempt.created_at),
    ...database.learning_events.filter((event) => event.user_id === studentId).map((event) => event.created_at),
    ...database.lesson_progress
      .filter((progress) => progress.user_id === studentId && progress.completed_at)
      .map((progress) => progress.completed_at)
      .filter((value): value is string => Boolean(value)),
    ...database.visualization_sessions
      .filter((session) => session.user_id === studentId && session.completed_at)
      .map((session) => session.completed_at)
      .filter((value): value is string => Boolean(value)),
    ...database.gamification_events.filter((event) => event.student_id === studentId).map((event) => event.created_at)
  ];
}

function questEvidenceForStudent(database: Database, studentId: string, dayKey: string) {
  const onDay = (value: string | null | undefined) => Boolean(value && hongKongDayKey(value) === dayKey);
  const events = database.gamification_events.filter((event) => event.student_id === studentId && onDay(event.created_at));

  return {
    "answer-correct": database.attempts.filter((attempt) => attempt.user_id === studentId && attempt.is_correct && onDay(attempt.created_at)).length,
    "lesson-complete": database.lesson_progress.filter((progress) => progress.user_id === studentId && progress.status === "completed" && onDay(progress.completed_at)).length,
    "visualization-complete": Math.max(
      events.filter((event) => event.source === "visualization-complete").length,
      database.visualization_sessions.filter((session) => session.user_id === studentId && Boolean(session.completed_at) && onDay(session.completed_at)).length
    ),
    "mistake-review": Math.max(
      events.filter((event) => event.source === "mistake-review").length,
      database.learning_events.filter((event) => event.user_id === studentId && event.type === "mistake-review" && onDay(event.created_at)).length
    )
  };
}

function classStudentIdsForLeaderboard(database: Database, studentId: string) {
  const classId = database.class_enrollments.find((enrollment) => enrollment.student_id === studentId)?.class_id;
  if (!classId) return [studentId];
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

function leaderboardForStudents(database: Database, studentIds: string[], currentStudentId?: string) {
  const nowMs = Date.now();
  const weekStartMs = nowMs - 7 * dayMs;

  return rankLeaderboard(studentIds.map((studentId) => {
    const events = gamificationEventsForStudent(database, studentId);
    const weeklyEvents = events.filter((event) => {
      const createdAt = Date.parse(event.createdAt);
      return event.status === "awarded" && Number.isFinite(createdAt) && createdAt >= weekStartMs && createdAt <= nowMs;
    });
    const xp = totalAwardedXp(events);
    const level = levelForXp(xp).current.level;
    const streakDays = calculateHongKongStreak(activityTimestampsForStudent(database, studentId));
    const badgeCount = resolveStudentBadges({ events, streakDays, level }).filter((badge) => badge.earned).length;
    const profile = studentProfileFor(database, studentId);

    return {
      studentId,
      studentName: studentNameFor(database, studentId),
      grade: profile?.grade ?? "S3",
      classNames: allClassNamesForStudent(database, studentId),
      weeklyXp: weeklyEvents.reduce((sum, event) => sum + Math.max(0, event.xp), 0),
      weeklyRewardPoints: weeklyEvents.reduce((sum, event) => sum + Math.max(0, event.rewardPoints), 0),
      level,
      badgeCount,
      streakDays,
      isCurrentStudent: studentId === currentStudentId
    };
  }));
}

function buildGamificationSummaryForDatabase(database: Database, studentId: string): GamificationSummary | null {
  const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
  if (!user) return null;

  const events = gamificationEventsForStudent(database, studentId);
  const xp = totalAwardedXp(events);
  const level = levelForXp(xp);
  const streakDays = calculateHongKongStreak(activityTimestampsForStudent(database, studentId));
  const badges = resolveStudentBadges({ events, streakDays, level: level.current.level });
  const todayKey = hongKongDayKey(new Date());
  const quests = buildQuestProgress(questEvidenceForStudent(database, studentId, todayKey), awardedSourceKeys(events), todayKey);
  const earnedBadges = badges.filter((badge) => badge.earned);
  const leaderboard = leaderboardForStudents(database, classStudentIdsForLeaderboard(database, studentId), studentId).slice(0, 6);
  const nextQuest = quests.find((quest) => !quest.completed);

  return {
    generatedAt: new Date().toISOString(),
    studentId,
    xp,
    level,
    streakDays,
    badges,
    earnedBadges,
    quests,
    leaderboard,
    recentEvents: events.slice(0, 8),
    rewardSummary: rewardSummaryForStudent(database, studentId),
    economy: economySummary(),
    motivation: {
      celebrate: [
        earnedBadges[0]
          ? { en: `${earnedBadges[0].name.en} badge is unlocked.`, zh: `已解鎖「${earnedBadges[0].name.zh}」徽章。` }
          : { en: `Level ${level.current.level} growth is building.`, zh: `第 ${level.current.level} 級成長正在累積。` },
        streakDays > 0
          ? { en: `${streakDays}-day learning rhythm is active.`, zh: `已保持 ${streakDays} 日學習節奏。` }
          : { en: "A short first session today can start the streak.", zh: "今天完成一次短學習即可開始連續紀錄。" }
      ],
      support: [
        nextQuest
          ? { en: `Next small step: ${nextQuest.quest.title.en}.`, zh: `下一個小目標：${nextQuest.quest.title.zh}。` }
          : { en: "All daily quests are complete.", zh: "今天的每日任務已完成。" },
        { en: "XP builds levels and is never spent when gifts are redeemed.", zh: "XP 用於成長等級，兌換獎品時不會扣減。" }
      ]
    }
  };
}

function recordGamificationEventOnce(
  database: Database,
  {
    studentId,
    source,
    sourceKey,
    label,
    rewardPoints,
    campaignId,
    createdAt = new Date().toISOString()
  }: {
    studentId: string;
    source: GamificationEventSource;
    sourceKey: string;
    label: LocalizedText;
    rewardPoints?: number;
    campaignId?: string;
    createdAt?: string;
  }
) {
  const reward = gamificationRewardForSource(source, rewardPoints);
  const existingEvents = gamificationEventsForStudent(database, studentId);
  const decision = evaluateAntiAbuseEvent({
    source,
    sourceKey,
    requestedXp: reward.xp,
    requestedRewardPoints: reward.rewardPoints,
    existingEvents,
    now: createdAt
  });

  if (!decision.allowed) {
    if (decision.status !== "duplicate") {
      database.gamification_events.unshift({
        id: `gamification-event-${randomUUID()}`,
        student_id: studentId,
        xp: 0,
        reward_points: 0,
        source,
        source_key: sourceKey,
        label_en: label.en,
        label_zh: label.zh,
        status: decision.status,
        anti_abuse_flags: decision.flags,
        economy_version: gamificationEconomyVersion,
        campaign_id: campaignId,
        created_at: createdAt
      });
    }
    return decision;
  }

  database.gamification_events.unshift({
    id: `gamification-event-${randomUUID()}`,
    student_id: studentId,
    xp: decision.appliedXp,
    reward_points: decision.appliedRewardPoints,
    source,
    source_key: sourceKey.trim().replace(/\s+/g, "-").slice(0, 240),
    label_en: label.en,
    label_zh: label.zh,
    status: decision.status,
    anti_abuse_flags: decision.flags,
    economy_version: gamificationEconomyVersion,
    campaign_id: campaignId,
    created_at: createdAt
  });

  return decision;
}

const practiceGameRequiredRoundQuestions = 5;
const practiceGameAccuracyPercent = 80;
const practiceGameMinCorrectQuestions = Math.ceil((practiceGameRequiredRoundQuestions * practiceGameAccuracyPercent) / 100);
const fishingGameRequiredRoundQuestions = practiceGameRequiredRoundQuestions;
const fishingGameAccuracyPercent = practiceGameAccuracyPercent;
const fishingGameMaxNets = 10;
const fishingGameMaxDurationSeconds = 120;
const fishingGameRewardPerCoin = 3;

export type FishingGameCompletionResult = {
  status: "awarded" | "duplicate" | "capped" | "not-eligible" | "invalid-run";
  reward: {
    xp: number;
    rewardPoints: number;
    label: LocalizedText;
  };
  coins: number;
  topicId: string;
  gamification: GamificationSummary | null;
};

function cleanUniqueIds(questionIds: string[]) {
  return Array.from(new Set(questionIds.map((questionId) => questionId.trim()).filter(Boolean)));
}

function cleanGameRoundKey(roundKey: string) {
  return roundKey.trim().replace(/\s+/g, "-").slice(0, 180);
}

function gameRoundFingerprint(roundKey: string) {
  return createHash("sha256").update(roundKey).digest("hex").slice(0, 16);
}

function topicTitleForId(database: Database, topicId: string): LocalizedText {
  const topic = topicRecordForId(database, topicId);
  return topic ? localizedTopicTitleForRecord(topic) : { en: topicId, zh: topicId };
}

function verifiedAttemptIds(database: Database, studentId: string, questionIds: string[], afterCreatedAt?: string | null) {
  const allowedIds = new Set(questionIds);
  return new Set(
    database.attempts
      .filter((attempt) =>
        attempt.user_id === studentId &&
        allowedIds.has(attempt.question_id) &&
        (!afterCreatedAt || attempt.created_at > afterCreatedAt)
      )
      .map((attempt) => attempt.question_id)
  );
}

function verifiedCorrectAttemptIds(database: Database, studentId: string, questionIds: string[], afterCreatedAt?: string | null) {
  const allowedIds = new Set(questionIds);
  return new Set(
    database.attempts
      .filter((attempt) =>
        attempt.user_id === studentId &&
        attempt.is_correct &&
        allowedIds.has(attempt.question_id) &&
        (!afterCreatedAt || attempt.created_at > afterCreatedAt)
      )
      .map((attempt) => attempt.question_id)
  );
}

type PracticeGameRoundValidationReason =
  | "ready"
  | "need-round-context"
  | "need-attempts"
  | "need-accuracy"
  | "mixed-topic"
  | "invalid-round";

type PracticeGameRoundValidation = {
  reason: PracticeGameRoundValidationReason;
  topicId: string | null;
  topicTitle: LocalizedText | null;
  roundKey: string;
  roundQuestionIds: string[];
  correctRoundQuestionIds: string[];
  attemptedCount: number;
  correctCount: number;
  accuracyPercent: number;
};

function validatePracticeGameRound(
  database: Database,
  studentId: string,
  {
    topicId,
    roundKey,
    roundQuestionIds,
    correctRoundQuestionIds,
    afterCreatedAt
  }: {
    topicId: string;
    roundKey: string;
    roundQuestionIds: string[];
    correctRoundQuestionIds: string[];
    afterCreatedAt?: string | null;
  }
): PracticeGameRoundValidation {
  const cleanTopicId = topicId.trim();
  const cleanRoundKey = cleanGameRoundKey(roundKey);
  const cleanRoundIds = cleanUniqueIds(roundQuestionIds);
  const cleanCorrectRoundIds = cleanUniqueIds(correctRoundQuestionIds);
  const fallback = (
    reason: PracticeGameRoundValidationReason,
    extras: Partial<PracticeGameRoundValidation> = {}
  ): PracticeGameRoundValidation => ({
    reason,
    topicId: cleanTopicId || extras.topicId || null,
    topicTitle: cleanTopicId ? topicTitleForId(database, cleanTopicId) : null,
    roundKey: cleanRoundKey,
    roundQuestionIds: cleanRoundIds,
    correctRoundQuestionIds: cleanCorrectRoundIds,
    attemptedCount: 0,
    correctCount: 0,
    accuracyPercent: 0,
    ...extras
  });

  if (!cleanTopicId || !cleanRoundKey || !cleanRoundIds.length) return fallback("need-round-context");
  if (cleanRoundIds.length !== practiceGameRequiredRoundQuestions) return fallback("need-attempts");

  const roundQuestions = cleanRoundIds.map((questionId) => questionForId(database, questionId));
  if (roundQuestions.some((question) => !question)) return fallback("invalid-round");

  const roundTopicIds = new Set((roundQuestions as QuestionRecord[]).map((question) => question.topic_id));
  if (roundTopicIds.size !== 1 || !roundTopicIds.has(cleanTopicId)) {
    return fallback("mixed-topic", {
      topicId: roundTopicIds.size === 1 ? Array.from(roundTopicIds)[0] ?? cleanTopicId : cleanTopicId
    });
  }

  const roundIdSet = new Set(cleanRoundIds);
  if (cleanCorrectRoundIds.some((questionId) => !roundIdSet.has(questionId))) return fallback("invalid-round");

  const attemptedIds = verifiedAttemptIds(database, studentId, cleanRoundIds, afterCreatedAt);
  const attemptedCount = cleanRoundIds.filter((questionId) => attemptedIds.has(questionId)).length;
  if (attemptedCount < practiceGameRequiredRoundQuestions) {
    return fallback("need-attempts", {
      attemptedCount,
      topicTitle: topicTitleForId(database, cleanTopicId)
    });
  }

  const verifiedCorrectIds = verifiedCorrectAttemptIds(database, studentId, cleanRoundIds, afterCreatedAt);
  if (cleanCorrectRoundIds.some((questionId) => !verifiedCorrectIds.has(questionId))) {
    return fallback("invalid-round", {
      attemptedCount,
      topicTitle: topicTitleForId(database, cleanTopicId)
    });
  }

  const correctCount = cleanCorrectRoundIds.length;
  const accuracyPercent = Math.round((correctCount / practiceGameRequiredRoundQuestions) * 100);
  const base = {
    topicId: cleanTopicId,
    topicTitle: topicTitleForId(database, cleanTopicId),
    attemptedCount,
    correctCount,
    accuracyPercent
  };

  if (correctCount < practiceGameMinCorrectQuestions || accuracyPercent < practiceGameAccuracyPercent) {
    return fallback("need-accuracy", base);
  }

  return fallback("ready", base);
}

export async function completeFishingGame({
  studentId,
  topicId,
  roundQuestionIds,
  correctRoundQuestionIds,
  caughtQuestionIds,
  correctCaughtQuestionIds,
  coins,
  netsUsed,
  durationSeconds,
  roundKey
}: {
  studentId: string;
  topicId: string;
  roundQuestionIds: string[];
  correctRoundQuestionIds: string[];
  caughtQuestionIds: string[];
  correctCaughtQuestionIds: string[];
  coins: number;
  netsUsed: number;
  durationSeconds: number;
  roundKey: string;
}): Promise<FishingGameCompletionResult | null> {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
    if (!user) return null;

    const cleanTopicId = topicId.trim();
    const cleanRoundKey = cleanGameRoundKey(roundKey);
    const cleanCaughtIds = cleanUniqueIds(caughtQuestionIds);
    const cleanCorrectCaughtIds = cleanUniqueIds(correctCaughtQuestionIds);
    const label = {
      en: "Cleared Fishing Master",
      zh: "完成捕魚達人"
    };
    const emptyReward = { xp: 0, rewardPoints: 0, label };
    const summary = () => buildGamificationSummaryForDatabase(database, studentId);
    const invalid = (topicForResponse = cleanTopicId) => ({
      status: "invalid-run" as const,
      reward: emptyReward,
      coins: 0,
      topicId: topicForResponse,
      gamification: summary()
    });

    if (
      !cleanTopicId ||
      !cleanRoundKey ||
      !Number.isFinite(coins) ||
      !Number.isFinite(netsUsed) ||
      !Number.isFinite(durationSeconds) ||
      coins < 0 ||
      coins > fishingGameMaxNets ||
      netsUsed < 0 ||
      netsUsed > fishingGameMaxNets ||
      durationSeconds < 0 ||
      durationSeconds > fishingGameMaxDurationSeconds
    ) {
      return invalid();
    }

    const adventureCompletion = adventureIslandTopicCompletionFor(database, studentId, cleanTopicId);
    if (!adventureCompletion) {
      return {
        status: "not-eligible" as const,
        reward: emptyReward,
        coins: 0,
        topicId: cleanTopicId,
        gamification: summary()
      };
    }

    const roundValidation = validatePracticeGameRound(database, studentId, {
      topicId: cleanTopicId,
      roundKey: cleanRoundKey,
      roundQuestionIds,
      correctRoundQuestionIds,
      afterCreatedAt: adventureCompletion.created_at
    });
    if (roundValidation.reason === "invalid-round") return invalid(roundValidation.topicId ?? cleanTopicId);
    if (roundValidation.reason !== "ready" || !roundValidation.topicId) {
      return {
        status: "not-eligible" as const,
        reward: emptyReward,
        coins: 0,
        topicId: roundValidation.topicId ?? cleanTopicId,
        gamification: summary()
      };
    }

    const resolvedTopicId = roundValidation.topicId;
    const caughtQuestions = cleanCaughtIds.map((questionId) => questionForId(database, questionId));
    const correctCaughtQuestions = cleanCorrectCaughtIds.map((questionId) => questionForId(database, questionId));
    if (
      caughtQuestions.some((question) => !question || question.topic_id !== resolvedTopicId) ||
      correctCaughtQuestions.some((question) => !question || question.topic_id !== resolvedTopicId)
    ) {
      return invalid(resolvedTopicId);
    }

    const caughtIdSet = new Set(cleanCaughtIds);
    if (cleanCorrectCaughtIds.some((questionId) => !caughtIdSet.has(questionId))) return invalid(resolvedTopicId);
    if (cleanCaughtIds.length > netsUsed || cleanCorrectCaughtIds.length > cleanCaughtIds.length) return invalid(resolvedTopicId);

    const verifiedCaughtCorrect = verifiedCorrectAttemptIds(database, studentId, cleanCorrectCaughtIds);
    if (cleanCorrectCaughtIds.some((questionId) => !verifiedCaughtCorrect.has(questionId))) return invalid(resolvedTopicId);
    if (coins !== cleanCorrectCaughtIds.length) return invalid(resolvedTopicId);

    const topic = topicRecordForId(database, resolvedTopicId);
    const topicTitle = topic ? localizedTopicTitleForRecord(topic) : { en: resolvedTopicId, zh: resolvedTopicId };
    const rewardPoints = coins * fishingGameRewardPerCoin;
    if (rewardPoints <= 0) {
      return {
        status: "awarded" as const,
        reward: emptyReward,
        coins,
        topicId: resolvedTopicId,
        gamification: summary()
      };
    }

    const now = new Date().toISOString();
    const sourceKey = `fishing-game-complete:${studentId}:${resolvedTopicId}:${gameRoundFingerprint(cleanRoundKey)}`;
    const decision = recordGamificationEventOnce(database, {
      studentId,
      source: "fishing-game-complete",
      sourceKey,
      label: {
        en: `Fishing Master: ${topicTitle.en}`,
        zh: `捕魚達人：${topicTitle.zh}`
      },
      rewardPoints,
      createdAt: now
    });

    if (!decision.allowed) {
      return {
        status: decision.status === "duplicate" ? "duplicate" as const : "capped" as const,
        reward: emptyReward,
        coins,
        topicId: resolvedTopicId,
        gamification: summary()
      };
    }

    if (decision.appliedRewardPoints > 0) {
      database.reward_point_ledger.unshift({
        id: `reward-ledger-${randomUUID()}`,
        student_id: studentId,
        amount: decision.appliedRewardPoints,
        reason: "fishing-game-complete",
        label_en: `Fishing Master: ${topicTitle.en}`,
        label_zh: `捕魚達人：${topicTitle.zh}`,
        note: `Converted ${coins} fishing coin(s) at ${fishingGameRewardPerCoin} points each.`,
        source_key: sourceKey,
        created_at: now
      });
    }

    return {
      status: decision.status === "capped" ? "capped" as const : "awarded" as const,
      reward: {
        xp: decision.appliedXp,
        rewardPoints: decision.appliedRewardPoints,
        label
      },
      coins,
      topicId: resolvedTopicId,
      gamification: summary()
    };
  });
}

const adventureIslandGameKey = "adventure-island";
const adventureIslandMinCorrectQuestions = 3;
const adventureIslandMinDurationSeconds = 30;
const adventureIslandMaxDurationSeconds = 20 * 60;

export type AdventureIslandEligibility = {
  eligible: boolean;
  reason: "ready" | "need-round-context" | "need-attempts" | "need-accuracy" | "mixed-topic" | "already-completed" | "invalid-round";
  dayKey: string;
  topicId: string | null;
  topicTitle: LocalizedText | null;
  roundKey: string;
  roundQuestionCount: number;
  requiredQuestionCount: number;
  attemptCount: number;
  correctCount: number;
  accuracyPercent: number;
  alreadyCompleted: boolean;
  completedAt: string | null;
  postAdventurePracticeEligible: boolean;
  rewardPreview: {
    xp: number;
    rewardPoints: number;
  };
};

export type AdventureIslandCompletionResult = {
  status: "awarded" | "duplicate" | "capped" | "not-eligible" | "invalid-run";
  eligibility: AdventureIslandEligibility;
  reward: {
    xp: number;
    rewardPoints: number;
    label: LocalizedText;
  };
  gamification: GamificationSummary | null;
};

function adventureIslandSourceKey(studentId: string, topicId: string, roundKey: string) {
  return `adventure-island-complete:${studentId}:${topicId}:${gameRoundFingerprint(roundKey)}`;
}

function adventureIslandTopicCompletionFor(database: Database, studentId: string, topicId: string) {
  const sourceKeyPrefix = `adventure-island-complete:${studentId}:${topicId}:`;
  return database.gamification_events
    .filter((event) =>
      event.student_id === studentId &&
      event.source === "adventure-island-complete" &&
      event.source_key.startsWith(sourceKeyPrefix) &&
      (event.status === "awarded" || event.status === "capped")
    )
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0] ?? null;
}

function buildAdventureIslandEligibility(
  database: Database,
  studentId: string,
  {
    topicId = "",
    roundKey = "",
    roundQuestionIds = [],
    correctRoundQuestionIds = []
  }: {
    topicId?: string;
    roundKey?: string;
    roundQuestionIds?: string[];
    correctRoundQuestionIds?: string[];
  } = {},
  now = new Date()
): AdventureIslandEligibility {
  const dayKey = hongKongDayKey(now);
  const roundValidation = validatePracticeGameRound(database, studentId, {
    topicId,
    roundKey,
    roundQuestionIds,
    correctRoundQuestionIds
  });
  const completed = roundValidation.topicId
    ? adventureIslandTopicCompletionFor(database, studentId, roundValidation.topicId)
    : null;
  const postAdventureRoundValidation = completed
    ? validatePracticeGameRound(database, studentId, {
        topicId,
        roundKey,
        roundQuestionIds,
        correctRoundQuestionIds,
        afterCreatedAt: completed.created_at
      })
    : null;
  const alreadyCompleted = Boolean(completed);
  const reward = gamificationRewardForSource("adventure-island-complete");
  const base = {
    dayKey,
    topicId: roundValidation.topicId,
    topicTitle: roundValidation.topicTitle,
    roundKey: roundValidation.roundKey,
    roundQuestionCount: roundValidation.roundQuestionIds.length,
    requiredQuestionCount: practiceGameRequiredRoundQuestions,
    attemptCount: roundValidation.attemptedCount,
    correctCount: roundValidation.correctCount,
    accuracyPercent: roundValidation.accuracyPercent,
    alreadyCompleted,
    completedAt: completed?.created_at ?? null,
    postAdventurePracticeEligible: postAdventureRoundValidation?.reason === "ready",
    rewardPreview: reward
  };

  if (alreadyCompleted) return { ...base, eligible: false, reason: "already-completed" };
  if (roundValidation.reason === "ready") return { ...base, eligible: true, reason: "ready" };
  return { ...base, eligible: false, reason: roundValidation.reason };
}

export async function getAdventureIslandEligibility(
  studentId: string,
  input?: {
    topicId?: string;
    roundKey?: string;
    roundQuestionIds?: string[];
    correctRoundQuestionIds?: string[];
  }
): Promise<AdventureIslandEligibility | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
  if (!user) return null;

  return buildAdventureIslandEligibility(database, studentId, input);
}

function verifiedTopicAdventureIslandQuestionCount(database: Database, studentId: string, questionIds: string[], topicId: string) {
  const requestedIds = new Set(questionIds.map((questionId) => questionId.trim()).filter(Boolean));
  const correctQuestionIds = new Set(
    database.attempts
      .filter((attempt) => {
        const question = questionForId(database, attempt.question_id);
        return (
          attempt.user_id === studentId &&
          attempt.is_correct &&
          question?.topic_id === topicId
        );
      })
      .map((attempt) => attempt.question_id)
  );

  return Array.from(requestedIds).filter((questionId) => correctQuestionIds.has(questionId)).length;
}

export async function completeAdventureIsland({
  studentId,
  topicId,
  roundKey,
  roundQuestionIds,
  correctRoundQuestionIds,
  correctQuestionIds,
  durationSeconds,
  defeatedEnemies = 0
}: {
  studentId: string;
  topicId: string;
  roundKey: string;
  roundQuestionIds: string[];
  correctRoundQuestionIds: string[];
  correctQuestionIds: string[];
  durationSeconds: number;
  defeatedEnemies?: number;
}): Promise<AdventureIslandCompletionResult | null> {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
    if (!user) return null;

    const eligibility = buildAdventureIslandEligibility(database, studentId, {
      topicId,
      roundKey,
      roundQuestionIds,
      correctRoundQuestionIds
    });
    const topicTitle = eligibility.topicId ? topicTitleForId(database, eligibility.topicId) : { en: "Adventure Island", zh: "探险岛" };
    const label = {
      en: `Adventure Island: ${topicTitle.en}`,
      zh: `探险岛：${topicTitle.zh}`
    };
    const emptyReward = { xp: 0, rewardPoints: 0, label };
    const summary = () => buildGamificationSummaryForDatabase(database, studentId);

    if (eligibility.reason === "already-completed") {
      return { status: "duplicate" as const, eligibility, reward: emptyReward, gamification: summary() };
    }
    if (!eligibility.eligible) {
      return { status: "not-eligible" as const, eligibility, reward: emptyReward, gamification: summary() };
    }
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds < adventureIslandMinDurationSeconds ||
      durationSeconds > adventureIslandMaxDurationSeconds ||
      !eligibility.topicId ||
      defeatedEnemies < adventureIslandMinCorrectQuestions ||
      verifiedTopicAdventureIslandQuestionCount(database, studentId, correctQuestionIds, eligibility.topicId) < adventureIslandMinCorrectQuestions
    ) {
      return { status: "invalid-run" as const, eligibility, reward: emptyReward, gamification: summary() };
    }

    const now = new Date().toISOString();
    const sourceKey = adventureIslandSourceKey(studentId, eligibility.topicId, eligibility.roundKey);
    const decision = recordGamificationEventOnce(database, {
      studentId,
      source: "adventure-island-complete",
      sourceKey,
      label,
      createdAt: now
    });

    if (!decision.allowed) {
      return {
        status: decision.status === "duplicate" ? "duplicate" as const : "capped" as const,
        eligibility: buildAdventureIslandEligibility(database, studentId, {
          topicId,
          roundKey,
          roundQuestionIds,
          correctRoundQuestionIds
        }),
        reward: emptyReward,
        gamification: summary()
      };
    }

    if (decision.appliedRewardPoints > 0) {
      database.reward_point_ledger.unshift({
        id: `reward-ledger-${randomUUID()}`,
        student_id: studentId,
        amount: decision.appliedRewardPoints,
        reason: "adventure-island-complete",
        label_en: label.en,
        label_zh: label.zh,
        note: `Verified ${adventureIslandMinCorrectQuestions} Adventure Island answers for topic ${eligibility.topicId}.`,
        source_key: sourceKey,
        created_at: now
      });
    }

    return {
      status: decision.status === "capped" ? "capped" as const : "awarded" as const,
      eligibility: buildAdventureIslandEligibility(database, studentId, {
        topicId,
        roundKey,
        roundQuestionIds,
        correctRoundQuestionIds
      }),
      reward: {
        xp: decision.appliedXp,
        rewardPoints: decision.appliedRewardPoints,
        label
      },
      gamification: summary()
    };
  });
}

function teachingResourceReferenceCounts(database: Database, resourceId: string) {
  return {
    assignments: database.assignments.filter((assignment) => assignment.content_type === "resource" && assignment.target_id === resourceId).length,
    assessments: database.assessments.filter((assessment) => assessment.source_resource_id === resourceId).length,
    classroom: 0
  };
}

function toTeachingResource(database: Database, record: TeachingResourceRecord): TeachingResource {
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
    referenceCounts: teachingResourceReferenceCounts(database, record.id)
  };
}

function assessmentSubmittedCount(database: Database, assessmentId: string) {
  return database.assessment_submissions.filter(
    (submission) =>
      submission.assessment_id === assessmentId &&
      (submission.status === "submitted" || submission.status === "graded" || submission.status === "late")
  ).length;
}

function toAssessment(database: Database, record: AssessmentRecord): Assessment {
  return {
    id: record.id,
    classId: record.class_id,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    type: record.type,
    status: record.status,
    sourceType: record.source_type,
    sourceResourceId: record.source_resource_id,
    questionIds: record.question_ids,
    manualQuestions: record.manual_questions,
    opensAt: record.opens_at,
    closesAt: record.closes_at,
    timeLimitMinutes: record.time_limit_minutes,
    maxAttempts: record.max_attempts,
    randomizeQuestionOrder: record.randomize_question_order,
    showAnswersImmediately: record.show_answers_immediately,
    gradeWeight: record.grade_weight,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    submissionCount: database.assessment_submissions.filter((submission) => submission.assessment_id === record.id).length,
    submittedCount: assessmentSubmittedCount(database, record.id)
  };
}

function toAssessmentSubmission(database: Database, record: AssessmentSubmissionRecord): AssessmentSubmission {
  const profile = studentProfileFor(database, record.student_id);

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
    answers: record.answers,
    updatedAt: record.updated_at
  };
}

function toTeacherReport(record: TeacherReportRecord): TeacherReport {
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
    preview: readTeacherReportPreview(record.preview_json)
  };
}

function readTeacherReportPreview(value?: string): TeacherReportPreview | undefined {
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

function authenticatedUserForCredentials(database: Database, username: string, password: string) {
  const normalizedIdentifier = normalizeUsername(username);
  const user = database.users.find(
    (candidate) =>
      candidate.normalized_username === normalizedIdentifier ||
      candidate.normalized_email === normalizedIdentifier
  );
  if (!user || !passwordMatches(password, user)) return null;
  return user;
}

export async function authenticateUser(username: string, password: string) {
  const database = await readDatabase();
  const user = authenticatedUserForCredentials(database, username, password);
  if (!user) return null;

  return toAuthenticatedUser(database, user);
}

export async function authenticateUserForLogin(username: string, password: string) {
  const database = await readDatabase();
  const user = authenticatedUserForCredentials(database, username, password);
  if (!user) return { status: "invalid" as const };

  const profile = database.student_profiles.find((candidate) => candidate.user_id === user.id);
  if (!profile) return { status: "invalid" as const };

  if (user.role === "student" && !normalizeCurriculumTrack(profile.curriculum_track)) {
    return {
      status: "requires-curriculum-track" as const,
      role: user.role,
      user: {
        id: user.id,
        name: profile.name,
        username: user.username,
        grade: profile.grade
      }
    };
  }

  const session = toAuthenticatedUser(database, user);
  return session ? { status: "authenticated" as const, session } : { status: "invalid" as const };
}

export async function createStudentUser({
  name,
  username,
  email,
  password,
  grade,
  curriculumTrack,
  curriculumProfile,
  language,
  theme
}: {
  name: string;
  username: string;
  email?: string;
  password: string;
  grade: GradeId;
  curriculumTrack?: CurriculumTrack;
  curriculumProfile?: CurriculumProfile;
  language?: Language;
  theme?: ThemeMode;
}) {
  const trimmedName = name.trim();
  const trimmedUsername = username.trim();
  const normalizedUsername = normalizeUsername(trimmedUsername);
  const trimmedEmail = email?.trim() || (isLikelyEmail(trimmedUsername) ? trimmedUsername : "");
  const normalizedEmail = trimmedEmail ? normalizeEmail(trimmedEmail) : "";
  const effectiveCurriculumProfile = curriculumProfile
    ? normalizeStoredCurriculumProfile({ region: curriculumProfile.region, publisher: curriculumProfile.publisher })
    : curriculumTrack
      ? curriculumProfileForTrack(curriculumTrack)
      : null;
  const effectiveCurriculumTrack = effectiveCurriculumProfile ? curriculumTrackForProfile(effectiveCurriculumProfile) : undefined;

  if (
    !trimmedName ||
    !trimmedUsername ||
    (trimmedEmail && !isLikelyEmail(trimmedEmail)) ||
    password.length < 5 ||
    !validGrades.has(grade) ||
    !effectiveCurriculumProfile ||
    !effectiveCurriculumTrack
  ) {
    return { status: "invalid" as const };
  }

  return mutateDatabase((database) => {
    if (database.users.some((candidate) =>
      candidate.normalized_username === normalizedUsername ||
      (normalizedEmail && candidate.normalized_email === normalizedEmail)
    )) {
      return { status: "duplicate" as const };
    }

    const now = new Date().toISOString();
    const userId = `student-${randomUUID()}`;
    const hashedPassword = hashPassword(password);
    const user: UserRecord = {
      id: userId,
      username: trimmedUsername,
      normalized_username: normalizedUsername,
      email: trimmedEmail || undefined,
      normalized_email: normalizedEmail || undefined,
      password_hash: hashedPassword.hash,
      password_salt: hashedPassword.salt,
      role: "student",
      created_at: now
    };

    database.users.push(user);
	    database.student_profiles.push({
	      user_id: userId,
	      name: trimmedName,
	      grade,
	      curriculum_track: effectiveCurriculumTrack,
	      curriculum_region: effectiveCurriculumProfile.region,
	      textbook_publisher: effectiveCurriculumProfile.publisher,
	      avatar_id: defaultStudentAvatarId
	    });
    database.user_settings.push({
      user_id: userId,
	      language: language && validLanguages.has(language) ? language : effectiveCurriculumProfile.region === "MAINLAND" ? "zh-Hans" : "en",
      theme: theme && validThemes.has(theme) ? theme : "dark",
      selected_grade: grade,
      updated_at: now
    });
    database.lesson_progress.push(...emptyLessonProgressRecords(userId, now));

    const session = toAuthenticatedUser(database, user);
    return session ? { status: "created" as const, session } : { status: "invalid" as const };
  });
}

export async function createParentUser({
  name,
  username,
  email,
  password,
  language,
  theme
}: {
  name: string;
  username?: string;
  email?: string;
  password: string;
  language?: Language;
  theme?: ThemeMode;
}) {
  const trimmedName = cleanStudentProfileName(name);
  const trimmedEmail = email?.trim() ?? "";
  const trimmedUsername = username?.trim() || trimmedEmail;
  const normalizedUsername = normalizeUsername(trimmedUsername);
  const normalizedEmail = trimmedEmail ? normalizeEmail(trimmedEmail) : "";

  if (
    !trimmedName ||
    !trimmedUsername ||
    !trimmedEmail ||
    !isLikelyEmail(trimmedEmail) ||
    password.length < 5
  ) {
    return { status: "invalid" as const };
  }

  return mutateDatabase((database) => {
    if (database.users.some((candidate) =>
      candidate.normalized_username === normalizedUsername ||
      candidate.normalized_email === normalizedEmail
    )) {
      return { status: "duplicate" as const };
    }

    const now = new Date().toISOString();
    const userId = `parent-${randomUUID()}`;
    const hashedPassword = hashPassword(password);
    const curriculumProfile = curriculumProfileForTrack(defaultCurriculumTrack);
    const user: UserRecord = {
      id: userId,
      username: trimmedUsername,
      normalized_username: normalizedUsername,
      email: trimmedEmail,
      normalized_email: normalizedEmail,
      password_hash: hashedPassword.hash,
      password_salt: hashedPassword.salt,
      password_must_change: false,
      role: "parent",
      created_at: now
    };

    database.users.push(user);
    database.student_profiles.push({
      user_id: userId,
      name: trimmedName,
      grade: "S3",
      curriculum_track: defaultCurriculumTrack,
      curriculum_region: curriculumProfile.region,
      textbook_publisher: curriculumProfile.publisher,
      avatar_id: "theta"
    });
    database.user_settings.push({
      user_id: userId,
      language: language && validLanguages.has(language) ? language : "en",
      theme: theme && validThemes.has(theme) ? theme : "dark",
      selected_grade: "S3",
      updated_at: now
    });

    const session = toAuthenticatedUser(database, user);
    return session ? { status: "created" as const, session } : { status: "invalid" as const };
  });
}

export async function completeStudentCurriculumTrackSelection({
  username,
  password,
  curriculumTrack,
  curriculumProfile,
  selectedGrade,
  language,
  theme
}: {
  username: string;
  password: string;
  curriculumTrack?: CurriculumTrack;
  curriculumProfile?: CurriculumProfile;
  selectedGrade?: GradeId;
  language?: Language;
  theme?: ThemeMode;
}) {
  const effectiveCurriculumProfile = curriculumProfile
    ? normalizeStoredCurriculumProfile({ region: curriculumProfile.region, publisher: curriculumProfile.publisher })
    : curriculumTrack
      ? curriculumProfileForTrack(curriculumTrack)
      : null;
  const effectiveCurriculumTrack = effectiveCurriculumProfile ? curriculumTrackForProfile(effectiveCurriculumProfile) : undefined;
  if (!effectiveCurriculumProfile || !effectiveCurriculumTrack) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const user = authenticatedUserForCredentials(database, username, password);
    if (!user) return { status: "invalid" as const };
    if (user.role !== "student") {
      const session = toAuthenticatedUser(database, user);
      return session ? { status: "authenticated" as const, session } : { status: "invalid" as const };
    }

    const profile = database.student_profiles.find((candidate) => candidate.user_id === user.id);
    if (!profile) return { status: "invalid" as const };

    const existingTrack = normalizeCurriculumTrack(profile.curriculum_track);
    const existingProfile = normalizeStoredCurriculumProfile({
      curriculumTrack: existingTrack,
      region: profile.curriculum_region,
      publisher: profile.textbook_publisher
    });
    const hasRegisteredCurriculum = Boolean(profile.textbook_publisher);
    const canSetProfileCurriculum = !hasRegisteredCurriculum;
    if (canSetProfileCurriculum) {
      if (existingTrack && existingTrack !== effectiveCurriculumTrack) return { status: "invalid" as const };
      profile.curriculum_track = effectiveCurriculumTrack;
      profile.curriculum_region = effectiveCurriculumProfile.region;
      profile.textbook_publisher = effectiveCurriculumProfile.publisher;
    } else {
      profile.curriculum_track = curriculumTrackForProfile(existingProfile);
      profile.curriculum_region = existingProfile.region;
      profile.textbook_publisher = existingProfile.publisher;
    }

    const settingsIndex = database.user_settings.findIndex((candidate) => candidate.user_id === user.id);
    const currentSettings =
      settingsIndex >= 0 ? database.user_settings[settingsIndex] : defaultSettings(user.id, profile.grade);
    const canSetProfileGrade = !existingTrack && !hasRegisteredCurriculum;
    const nextGrade = canSetProfileGrade && selectedGrade && validGrades.has(selectedGrade)
      ? selectedGrade
      : profile.grade;
    const nextSettings: UserSettingsRecord = {
      ...currentSettings,
      language: language && validLanguages.has(language) ? language : currentSettings.language,
      theme: theme && validThemes.has(theme) ? theme : currentSettings.theme,
      selected_grade: nextGrade,
      updated_at: new Date().toISOString()
    };

    if (settingsIndex >= 0) {
      database.user_settings[settingsIndex] = nextSettings;
    } else {
      database.user_settings.push(nextSettings);
    }
    if (canSetProfileGrade) {
      profile.grade = nextGrade;
    }

    const session = toAuthenticatedUser(database, user);
    return session ? { status: "authenticated" as const, session } : { status: "invalid" as const };
  });
}

type ProvisioningTeacherPlan = {
  rowIndex: number;
  name: string;
  username: string;
  email?: string;
  classCodes: string[];
};

type ProvisioningClassPlan = {
  rowIndex: number;
  classCode: string;
  name: string;
  grade: GradeId;
  academicYear: string;
  teacherUsernames: string[];
};

type ProvisioningStudentPlan = {
  rowIndex: number;
  name: string;
  grade: GradeId;
  classCode: string;
  studentNo: string;
  username: string;
  email?: string;
};

type ProvisioningPlan = {
  schoolInput: ProvisioningImportSchool & { code: string; normalizedCode: string };
  existingSchool: SchoolRecord | null;
  teachers: ProvisioningTeacherPlan[];
  classes: ProvisioningClassPlan[];
  students: ProvisioningStudentPlan[];
  validation: ProvisioningValidationResult;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function splitCodeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeClassCode(String(item))).filter(Boolean);
  }

  return asTrimmedString(value)
    .split(/[;,|]/)
    .map((item) => normalizeClassCode(item))
    .filter(Boolean);
}

function csvCellsFromText(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (quoted) {
      if (character === "\"" && nextCharacter === "\"") {
        cell += "\"";
        index += 1;
      } else if (character === "\"") {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === "\"") {
      quoted = true;
    } else if (character === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }

  row.push(cell.trim());
  rows.push(row);
  return rows.filter((candidate) => candidate.some((value) => value.trim()));
}

function csvRecordsFromText(text?: string) {
  if (!text?.trim()) return [] as Record<string, string>[];
  const [headers, ...rows] = csvCellsFromText(text);
  if (!headers?.length) return [];

  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase().replace(/[\s_-]+/g, ""));
  return rows.map((row) => {
    const record: Record<string, string> = {};
    normalizedHeaders.forEach((header, index) => {
      record[header] = row[index]?.trim() ?? "";
    });
    return record;
  });
}

function pickCsvField(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, "");
    if (row[normalizedKey]) return row[normalizedKey];
  }
  return "";
}

function classImportsFromRequest(input: ProvisioningRequest) {
  const structured = Array.isArray(input.classes) ? input.classes : [];
  const csv = csvRecordsFromText(input.classesCsv).map((row): ProvisioningImportClass => ({
    classCode: pickCsvField(row, ["classCode", "class", "class_code"]),
    name: pickCsvField(row, ["name", "className", "class_name"]) || undefined,
    grade: pickCsvField(row, ["grade"]) as GradeId,
    academicYear: pickCsvField(row, ["academicYear", "academic_year", "year"]) || undefined,
    teacherUsername: pickCsvField(row, ["teacherUsername", "teacher", "teacherEmail", "teacher_email"]) || undefined
  }));
  return [...structured, ...csv];
}

function teacherImportsFromRequest(input: ProvisioningRequest) {
  const structured = Array.isArray(input.teachers) ? input.teachers : [];
  const csv = csvRecordsFromText(input.teachersCsv).map((row): ProvisioningImportTeacher => ({
    name: pickCsvField(row, ["name", "teacherName", "teacher_name"]),
    email: pickCsvField(row, ["email", "teacherEmail", "teacher_email"]) || undefined,
    username: pickCsvField(row, ["username", "userName", "user_name"]) || undefined,
    classCodes: splitCodeList(pickCsvField(row, ["classCodes", "classes", "class_codes"]))
  }));
  return [...structured, ...csv];
}

function studentImportsFromRequest(input: ProvisioningRequest) {
  const structured = Array.isArray(input.students) ? input.students : [];
  const csv = csvRecordsFromText(input.studentsCsv).map((row): ProvisioningImportStudent => ({
    name: pickCsvField(row, ["name", "studentName", "student_name"]),
    grade: pickCsvField(row, ["grade"]) as GradeId,
    classCode: pickCsvField(row, ["classCode", "class", "class_code"]),
    studentNo: pickCsvField(row, ["studentNo", "studentNumber", "student_no", "number"]),
    email: pickCsvField(row, ["email", "studentEmail", "student_email"]) || undefined
  }));
  return [...structured, ...csv];
}

function provisioningRow({
  type,
  rowIndex,
  action,
  errors = [],
  warnings = [],
  status,
  ...rest
}: {
  type: ProvisioningRowType;
  rowIndex: number;
  action: ProvisioningRowAction;
  errors?: string[];
  warnings?: string[];
  status?: ProvisioningRowStatus;
} & Partial<Omit<ProvisioningRowResult, "id" | "type" | "rowIndex" | "action" | "errors" | "warnings" | "status">>): ProvisioningRowResult {
  return {
    id: `validation-${type}-${rowIndex}`,
    type,
    rowIndex,
    status: status ?? (errors.length ? "failed" : "valid"),
    action,
    errors,
    warnings,
    ...rest
  };
}

function provisioningTotals(rows: ProvisioningRowResult[]): ProvisioningTotals {
  return {
    schools: rows.filter((row) => row.type === "school" && !row.errors.length).length,
    classes: rows.filter((row) => row.type === "class" && !row.errors.length).length,
    teachers: rows.filter((row) => row.type === "teacher" && !row.errors.length).length,
    students: rows.filter((row) => row.type === "student" && !row.errors.length).length,
    errors: rows.filter((row) => row.errors.length).length
  };
}

function toSchool(record: SchoolRecord): School {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    academicYear: record.academic_year,
    contactName: record.contact_name,
    contactEmail: record.contact_email,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function teacherImportUsername(schoolCode: string, teacher: ProvisioningImportTeacher, index: number) {
  const explicitUsername = asTrimmedString(teacher.username);
  if (explicitUsername) return explicitUsername;

  const email = asTrimmedString(teacher.email);
  if (email && isLikelyEmail(email)) return email;

  return `${schoolCode}-teacher-${String(index).padStart(3, "0")}`;
}

function buildProvisioningPlan(database: Database, input: ProvisioningRequest): ProvisioningPlan {
  const rows: ProvisioningRowResult[] = [];
  const schoolRecord: Record<string, unknown> = isPlainRecord(input.school) ? input.school : {};
  const schoolName = asTrimmedString(schoolRecord.name);
  const schoolCode = normalizeSchoolCode(asTrimmedString(schoolRecord.code));
  const academicYear = asTrimmedString(schoolRecord.academicYear);
  const contactName = asTrimmedString(schoolRecord.contactName);
  const contactEmail = asTrimmedString(schoolRecord.contactEmail);
  const schoolErrors: string[] = [];
  const schoolWarnings: string[] = [];

  if (!schoolName) schoolErrors.push("School name is required.");
  if (!schoolCode) schoolErrors.push("School code is required.");
  if (!academicYear) schoolErrors.push("Academic year is required.");
  if (contactEmail && !isLikelyEmail(contactEmail)) schoolErrors.push("School contact email is invalid.");

  const existingSchool = schoolCode
    ? database.schools.find((school) => school.normalized_code === schoolCode) ?? null
    : null;
  if (existingSchool && existingSchool.name !== schoolName) {
    schoolWarnings.push(`School code ${schoolCode} already exists; the existing school record will be reused.`);
  }

  rows.push(provisioningRow({
    type: "school",
    rowIndex: 1,
    action: existingSchool ? "reuse" : "create",
    errors: schoolErrors,
    warnings: schoolWarnings,
    schoolId: existingSchool?.id,
    name: schoolName,
    classCode: schoolCode
  }));

  const rawClasses = classImportsFromRequest(input);
  const rawTeachers = teacherImportsFromRequest(input);
  const rawStudents = studentImportsFromRequest(input);
  const explicitClassInputs = rawClasses.length > 0;
  const inferredClasses = new Map<string, ProvisioningImportClass>();

  if (!explicitClassInputs) {
    rawStudents.forEach((student) => {
      const classCode = normalizeClassCode(asTrimmedString(student.classCode));
      const grade = student.grade;
      if (classCode && validGrades.has(grade)) {
        inferredClasses.set(classCode, {
          classCode,
          name: `${classCode} Mathematics`,
          grade,
          academicYear
        });
      }
    });
  }

  const classInputs = explicitClassInputs ? rawClasses : Array.from(inferredClasses.values());
  const classPlans: ProvisioningClassPlan[] = [];
  const classCodes = new Set<string>();
  const classRowsByCode = new Map<string, ProvisioningRowResult>();
  const classTeacherUsernames = new Map<string, Set<string>>();

  const teacherPlans = rawTeachers.map((teacher, index): ProvisioningTeacherPlan => ({
    rowIndex: index + 2,
    name: cleanStudentProfileName(asTrimmedString(teacher.name)),
    username: teacherImportUsername(schoolCode || "MAIS", teacher, index + 1),
    email: asTrimmedString(teacher.email) || undefined,
    classCodes: splitCodeList(teacher.classCodes)
  }));

  teacherPlans.forEach((teacher) => {
    teacher.classCodes.forEach((classCode) => {
      if (!classTeacherUsernames.has(classCode)) classTeacherUsernames.set(classCode, new Set());
      classTeacherUsernames.get(classCode)?.add(normalizeUsername(teacher.username));
    });
  });

  classInputs.forEach((classInput, index) => {
    const rowIndex = index + 2;
    const classCode = normalizeClassCode(asTrimmedString(classInput.classCode));
    const className = asTrimmedString(classInput.name) || `${classCode} Mathematics`;
    const grade = classInput.grade;
    const classAcademicYear = asTrimmedString(classInput.academicYear) || academicYear;
    const teacherUsername = normalizeUsername(asTrimmedString(classInput.teacherUsername));
    const errors: string[] = [];

    if (!classCode) errors.push("Class code is required.");
    if (!className) errors.push("Class name is required.");
    if (!validGrades.has(grade)) errors.push("Class grade is invalid.");
    if (!classAcademicYear) errors.push("Class academic year is required.");
    if (classCode && classCodes.has(classCode)) errors.push(`Class code ${classCode} is duplicated in this import.`);
    if (classCode && existingSchool && database.teacher_classes.some((teacherClass) => teacherClass.school_id === existingSchool.id && teacherClass.class_code === classCode)) {
      errors.push(`Class code ${classCode} already exists for this school.`);
    }

    if (classCode) classCodes.add(classCode);
    if (teacherUsername) {
      if (!classTeacherUsernames.has(classCode)) classTeacherUsernames.set(classCode, new Set());
      classTeacherUsernames.get(classCode)?.add(teacherUsername);
    }

    const teacherUsernames = Array.from(classTeacherUsernames.get(classCode) ?? []);
    const row = provisioningRow({
      type: "class",
      rowIndex,
      action: "create",
      errors,
      name: className,
      classCode,
      role: "teacher"
    });
    rows.push(row);
    if (classCode) classRowsByCode.set(classCode, row);
    if (!errors.length) {
      classPlans.push({
        rowIndex,
        classCode,
        name: className,
        grade,
        academicYear: classAcademicYear,
        teacherUsernames
      });
    }
  });

  const teacherUsernames = new Set<string>();
  teacherPlans.forEach((teacher) => {
    const normalizedUsername = normalizeUsername(teacher.username);
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!teacher.name) errors.push("Teacher name is required.");
    if (!teacher.username.trim()) errors.push("Teacher username or email is required.");
    if (teacher.email && !isLikelyEmail(teacher.email)) errors.push("Teacher email is invalid.");
    if (!teacher.classCodes.length) errors.push("Teacher must be assigned to at least one class.");
    if (teacherUsernames.has(normalizedUsername)) errors.push(`Teacher username ${teacher.username} is duplicated in this import.`);
    if (
      database.users.some((user) =>
        user.normalized_username === normalizedUsername ||
        (teacher.email && user.normalized_email === normalizeEmail(teacher.email))
      )
    ) {
      errors.push(`Teacher username or email ${teacher.username} already exists.`);
    }
    teacher.classCodes.forEach((classCode) => {
      if (!classRowsByCode.has(classCode)) errors.push(`Teacher is assigned to unknown class ${classCode}.`);
    });
    if (teacher.email && teacher.username !== teacher.email && !isLikelyEmail(teacher.username)) {
      warnings.push("Generated teacher username is not an email address; confirm this is intentional before sharing credentials.");
    }
    teacherUsernames.add(normalizedUsername);

    rows.push(provisioningRow({
      type: "teacher",
      rowIndex: teacher.rowIndex,
      action: "create",
      errors,
      warnings,
      username: teacher.username,
      name: teacher.name,
      role: "teacher"
    }));
  });

  classPlans.forEach((classPlan) => {
    const classRow = classRowsByCode.get(classPlan.classCode);
    const teacherErrors = classPlan.teacherUsernames.length
      ? classPlan.teacherUsernames
          .filter((username) => !teacherPlans.some((teacher) => normalizeUsername(teacher.username) === username))
          .map((username) => `Class teacher ${username} is not present in the teacher import.`)
      : ["Class must have at least one teacher assigned."];
    if (teacherErrors.length && classRow) {
      classRow.errors.push(...teacherErrors);
      classRow.status = "failed";
    }
  });

  const studentPlans: ProvisioningStudentPlan[] = [];
  const studentUsernames = new Set<string>();
  const studentNumbersByClass = new Map<string, Set<string>>();
  rawStudents.forEach((student, index) => {
    const rowIndex = index + 2;
    const name = cleanStudentProfileName(asTrimmedString(student.name));
    const classCode = normalizeClassCode(asTrimmedString(student.classCode));
    const studentNo = normalizeClassCode(asTrimmedString(student.studentNo));
    const grade = student.grade;
    const email = asTrimmedString(student.email);
    const username = `${schoolCode || "MAIS"}-${classCode || "CLASS"}-${studentNo || String(index + 1).padStart(3, "0")}`;
    const normalizedUsername = normalizeUsername(username);
    const errors: string[] = [];

    if (!name) errors.push("Student name is required.");
    if (!validGrades.has(grade)) errors.push("Student grade is invalid.");
    if (!classCode) errors.push("Student class code is required.");
    if (!studentNo) errors.push("Student number is required.");
    if (email && !isLikelyEmail(email)) errors.push("Student email is invalid.");
    const classPlan = classPlans.find((candidate) => candidate.classCode === classCode);
    if (!classRowsByCode.has(classCode)) {
      errors.push(`Student is assigned to unknown class ${classCode}.`);
    } else if (classPlan && classPlan.grade !== grade) {
      errors.push(`Student grade ${grade} does not match class ${classCode} grade ${classPlan.grade}.`);
    }
    if (!studentNumbersByClass.has(classCode)) studentNumbersByClass.set(classCode, new Set());
    const classStudentNumbers = studentNumbersByClass.get(classCode);
    if (classStudentNumbers?.has(studentNo)) errors.push(`Student number ${studentNo} is duplicated in class ${classCode}.`);
    classStudentNumbers?.add(studentNo);
    if (studentUsernames.has(normalizedUsername)) errors.push(`Generated student username ${username} is duplicated in this import.`);
    if (
      database.users.some((user) =>
        user.normalized_username === normalizedUsername ||
        (email && user.normalized_email === normalizeEmail(email))
      )
    ) {
      errors.push(`Generated student username or email ${username} already exists.`);
    }
    studentUsernames.add(normalizedUsername);

    rows.push(provisioningRow({
      type: "student",
      rowIndex,
      action: "create",
      errors,
      username,
      name,
      classCode,
      role: "student"
    }));

    if (!errors.length) {
      studentPlans.push({
        rowIndex,
        name,
        grade,
        classCode,
        studentNo,
        username,
        email: email || undefined
      });
    }
  });

  if (!teacherPlans.length) {
    rows.push(provisioningRow({
      type: "teacher",
      rowIndex: 0,
      action: "none",
      errors: ["At least one teacher is required."]
    }));
  }
  if (!studentPlans.length) {
    rows.push(provisioningRow({
      type: "student",
      rowIndex: 0,
      action: "none",
      errors: ["At least one valid student is required."]
    }));
  }

  const totals = provisioningTotals(rows);
  const validation: ProvisioningValidationResult = {
    valid: totals.errors === 0,
    school: existingSchool
      ? toSchool(existingSchool)
      : schoolCode && schoolName && academicYear
        ? {
            id: "",
            code: schoolCode,
            name: schoolName,
            academicYear,
            contactName: contactName || undefined,
            contactEmail: contactEmail || undefined,
            createdBy: "",
            createdAt: "",
            updatedAt: ""
          }
        : undefined,
    rows,
    totals,
    errors: rows.flatMap((row) => row.errors),
    warnings: rows.flatMap((row) => row.warnings)
  };

  return {
    schoolInput: {
      name: schoolName,
      code: schoolCode,
      normalizedCode: schoolCode,
      academicYear,
      contactName: contactName || undefined,
      contactEmail: contactEmail || undefined
    },
    existingSchool,
    teachers: teacherPlans,
    classes: classPlans.filter((classPlan) => !classRowsByCode.get(classPlan.classCode)?.errors.length),
    students: studentPlans,
    validation
  };
}

function generateTemporaryPassword() {
  return `Mais-${randomBytes(9).toString("base64url")}`;
}

function addSchoolMembership(database: Database, membership: Omit<SchoolMembershipRecord, "id">) {
  if (
    database.school_memberships.some((candidate) =>
      candidate.school_id === membership.school_id &&
      candidate.user_id === membership.user_id &&
      candidate.class_id === membership.class_id &&
      candidate.role === membership.role
    )
  ) {
    return;
  }

  database.school_memberships.push({
    id: `school-membership-${randomUUID()}`,
    ...membership
  });
}

function toProvisioningRowResult(record: ProvisioningRowResultRecord): ProvisioningRowResult {
  return {
    id: record.id,
    batchId: record.batch_id,
    type: record.type,
    rowIndex: record.row_index,
    status: record.status,
    action: record.action,
    errors: record.errors,
    warnings: record.warnings,
    schoolId: record.school_id,
    classId: record.class_id,
    userId: record.user_id,
    classCode: record.class_code,
    username: record.username,
    name: record.name,
    role: record.role,
    temporaryPassword: record.temporary_password
  };
}

function credentialsFromRows(rows: ProvisioningRowResult[], schoolCode: string): ProvisioningBatch["credentials"] {
  const teachers: ProvisioningCredential[] = [];
  const studentsByClass: Record<string, ProvisioningCredential[]> = {};

  rows.forEach((row) => {
    if ((row.role !== "teacher" && row.role !== "student") || !row.username || !row.name || !row.temporaryPassword) return;

    const credential: ProvisioningCredential = {
      role: row.role,
      name: row.name,
      username: row.username,
      temporaryPassword: row.temporaryPassword,
      schoolCode,
      classCode: row.classCode,
      passwordChangeRequired: true
    };

    if (row.role === "teacher") {
      teachers.push(credential);
      return;
    }

    const classCode = row.classCode ?? "UNASSIGNED";
    studentsByClass[classCode] = [...(studentsByClass[classCode] ?? []), credential];
  });

  return { teachers, studentsByClass };
}

function toProvisioningBatch(database: Database, batch: ProvisioningBatchRecord): ProvisioningBatch | null {
  const school = database.schools.find((candidate) => candidate.id === batch.school_id);
  if (!school) return null;

  const rowIdSet = new Set(batch.row_result_ids);
  const rows = database.provisioning_row_results
    .filter((row) => rowIdSet.has(row.id))
    .sort((a, b) => a.row_index - b.row_index || a.type.localeCompare(b.type))
    .map(toProvisioningRowResult);

  return {
    id: batch.id,
    school: toSchool(school),
    status: batch.status,
    requestedBy: batch.requested_by,
    createdAt: batch.created_at,
    updatedAt: batch.updated_at,
    totals: batch.totals,
    rows,
    credentials: credentialsFromRows(rows, school.code)
  };
}

function rowRecordFromResult(row: ProvisioningRowResult, batchId: string): ProvisioningRowResultRecord {
  return {
    id: `provisioning-row-${randomUUID()}`,
    batch_id: batchId,
    type: row.type,
    row_index: row.rowIndex,
    status: row.status,
    action: row.action,
    errors: row.errors,
    warnings: row.warnings,
    school_id: row.schoolId,
    class_id: row.classId,
    user_id: row.userId,
    class_code: row.classCode,
    username: row.username,
    name: row.name,
    role: row.role,
    temporary_password: row.temporaryPassword
  };
}

export async function validateSchoolProvisioning(input: ProvisioningRequest) {
  const database = await readDatabase();
  return buildProvisioningPlan(database, input).validation;
}

export async function createSchoolProvisioningBatch(adminId: string, input: ProvisioningRequest) {
  return mutateDatabase((database) => {
    const admin = database.users.find((candidate) => candidate.id === adminId);
    if (admin?.role !== "admin") return { status: "forbidden" as const };

    const plan = buildProvisioningPlan(database, input);
    if (!plan.validation.valid) return { status: "invalid" as const, validation: plan.validation };

    const now = new Date().toISOString();
    const batchId = `provisioning-batch-${randomUUID()}`;
    const schoolId = plan.existingSchool?.id ?? `school-${randomUUID()}`;
    const schoolRecord = plan.existingSchool ?? {
      id: schoolId,
      code: plan.schoolInput.code,
      normalized_code: plan.schoolInput.normalizedCode,
      name: plan.schoolInput.name,
      academic_year: plan.schoolInput.academicYear,
      contact_name: plan.schoolInput.contactName,
      contact_email: plan.schoolInput.contactEmail,
      created_by: admin.id,
      created_at: now,
      updated_at: now
    };

    if (!plan.existingSchool) {
      database.schools.push(schoolRecord);
    } else {
      schoolRecord.updated_at = now;
    }

    const teacherIdByUsername = new Map<string, string>();
    const classIdByCode = new Map<string, string>();
    const createdRows: ProvisioningRowResult[] = [];
    const schoolRow = plan.validation.rows.find((row) => row.type === "school");
    if (schoolRow) {
      createdRows.push({
        ...schoolRow,
        id: `batch-school-${batchId}`,
        batchId,
        status: "created",
        schoolId,
        action: plan.existingSchool ? "reuse" : "create"
      });
    }

    plan.teachers.forEach((teacher) => {
      const password = generateTemporaryPassword();
      const hashed = hashPassword(password);
      const userId = `teacher-${randomUUID()}`;
      const firstClass = plan.classes.find((classPlan) => teacher.classCodes.includes(classPlan.classCode));
      database.users.push({
        id: userId,
        username: teacher.username,
        normalized_username: normalizeUsername(teacher.username),
        email: teacher.email,
        normalized_email: teacher.email ? normalizeEmail(teacher.email) : undefined,
        password_hash: hashed.hash,
        password_salt: hashed.salt,
        school_id: schoolId,
        password_must_change: true,
        role: "teacher",
        created_at: now
      });
      database.student_profiles.push({
        user_id: userId,
        name: teacher.name,
        grade: firstClass?.grade ?? "S3",
        curriculum_track: defaultCurriculumTrack,
        avatar_id: "sigma"
      });
      database.user_settings.push({
        user_id: userId,
        language: "en",
        theme: "dark",
        selected_grade: firstClass?.grade ?? "S3",
        updated_at: now
      });
      teacherIdByUsername.set(normalizeUsername(teacher.username), userId);

      createdRows.push({
        id: `batch-teacher-${userId}`,
        batchId,
        type: "teacher",
        rowIndex: teacher.rowIndex,
        status: "created",
        action: "create",
        errors: [],
        warnings: [],
        schoolId,
        userId,
        username: teacher.username,
        name: teacher.name,
        role: "teacher",
        temporaryPassword: password
      });
    });

    plan.classes.forEach((classPlan) => {
      const teacherIds = classPlan.teacherUsernames
        .map((username) => teacherIdByUsername.get(username))
        .filter((teacherId): teacherId is string => Boolean(teacherId));
      const ownerTeacherId = teacherIds[0] ?? admin.id;
      const classId = `class-${randomUUID()}`;
      database.teacher_classes.push({
        id: classId,
        teacher_id: ownerTeacherId,
        school_id: schoolId,
        class_code: classPlan.classCode,
        name: classPlan.name,
        grade: classPlan.grade,
        academic_year: classPlan.academicYear,
        description_en: `${classPlan.name} imported through MAIS school provisioning.`,
        description_zh: `${classPlan.name} 已由 MAIS 學校批量開戶匯入。`,
        invite_code: `${classPlan.classCode}-${randomUUID().slice(0, 6)}`.toUpperCase(),
        created_at: now,
        updated_at: now
      });
      classIdByCode.set(classPlan.classCode, classId);
      teacherIds.forEach((teacherId) => {
        addSchoolMembership(database, {
          school_id: schoolId,
          user_id: teacherId,
          role: "teacher",
          class_id: classId,
          created_at: now
        });
      });

      createdRows.push({
        id: `batch-class-${classId}`,
        batchId,
        type: "class",
        rowIndex: classPlan.rowIndex,
        status: "created",
        action: "create",
        errors: [],
        warnings: [],
        schoolId,
        classId,
        classCode: classPlan.classCode,
        name: classPlan.name,
        role: "teacher"
      });
    });

    plan.students.forEach((student) => {
      const password = generateTemporaryPassword();
      const hashed = hashPassword(password);
      const userId = `student-${randomUUID()}`;
      const classId = classIdByCode.get(student.classCode);
      database.users.push({
        id: userId,
        username: student.username,
        normalized_username: normalizeUsername(student.username),
        email: student.email,
        normalized_email: student.email ? normalizeEmail(student.email) : undefined,
        password_hash: hashed.hash,
        password_salt: hashed.salt,
        school_id: schoolId,
        password_must_change: true,
        role: "student",
        created_at: now
      });
      database.student_profiles.push({
        user_id: userId,
        name: student.name,
        grade: student.grade,
        curriculum_track: defaultCurriculumTrack,
        avatar_id: defaultStudentAvatarId
      });
      database.user_settings.push({
        user_id: userId,
        language: "en",
        theme: "dark",
        selected_grade: student.grade,
        updated_at: now
      });
      database.lesson_progress.push(...emptyLessonProgressRecords(userId, now));
      addSchoolMembership(database, {
        school_id: schoolId,
        user_id: userId,
        role: "student",
        class_id: classId,
        created_at: now
      });
      if (classId) {
        database.class_enrollments.push({
          id: `enrollment-${randomUUID()}`,
          class_id: classId,
          student_id: userId,
          joined_at: now
        });
        ensureClassStudentWorkRecords(database, classId, userId, now);
      }

      createdRows.push({
        id: `batch-student-${userId}`,
        batchId,
        type: "student",
        rowIndex: student.rowIndex,
        status: "created",
        action: "create",
        errors: [],
        warnings: [],
        schoolId,
        classId,
        userId,
        classCode: student.classCode,
        username: student.username,
        name: student.name,
        role: "student",
        temporaryPassword: password
      });
    });

    const rowRecords = createdRows.map((row) => rowRecordFromResult(row, batchId));
    database.provisioning_row_results.push(...rowRecords);
    const batchRecord: ProvisioningBatchRecord = {
      id: batchId,
      school_id: schoolId,
      status: "created",
      requested_by: admin.id,
      totals: provisioningTotals(createdRows),
      row_result_ids: rowRecords.map((row) => row.id),
      created_at: now,
      updated_at: now
    };
    database.provisioning_batches.push(batchRecord);

    const batch = toProvisioningBatch(database, batchRecord);
    return batch ? { status: "created" as const, batch } : { status: "invalid" as const, validation: plan.validation };
  });
}

export async function getProvisioningBatchForAdmin(adminId: string, batchId: string) {
  const database = await readDatabase();
  const admin = database.users.find((candidate) => candidate.id === adminId);
  if (admin?.role !== "admin") return null;

  const batch = database.provisioning_batches.find((candidate) => candidate.id === batchId);
  return batch ? toProvisioningBatch(database, batch) : null;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

export async function getProvisioningBatchCredentialCsvForAdmin(adminId: string, batchId: string) {
  const batch = await getProvisioningBatchForAdmin(adminId, batchId);
  if (!batch) return null;

  const lines = [
    ["audience", "schoolCode", "classCode", "role", "name", "username", "temporaryPassword", "passwordChangeRequired"]
      .map(csvEscape)
      .join(",")
  ];

  batch.credentials.teachers.forEach((credential) => {
    lines.push([
      "school-contact",
      credential.schoolCode,
      credential.classCode ?? "",
      credential.role,
      credential.name,
      credential.username,
      credential.temporaryPassword,
      "yes"
    ].map(csvEscape).join(","));
  });

  Object.entries(batch.credentials.studentsByClass)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([classCode, credentials]) => {
      credentials.forEach((credential) => {
        lines.push([
          `class-${classCode}`,
          credential.schoolCode,
          classCode,
          credential.role,
          credential.name,
          credential.username,
          credential.temporaryPassword,
          "yes"
        ].map(csvEscape).join(","));
      });
    });

  return {
    filename: `mais-provisioning-${batch.school.code}-${batch.createdAt.slice(0, 10)}.csv`,
    csv: `${lines.join("\n")}\n`
  };
}

export async function changeAuthenticatedUserPassword({
  userId,
  currentPassword,
  password
}: {
  userId: string;
  currentPassword: string;
  password: string;
}) {
  if (!currentPassword || password.length < 5) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!user || !passwordMatches(currentPassword, user)) return { status: "invalid" as const };

    const hashedPassword = hashPassword(password);
    user.password_hash = hashedPassword.hash;
    user.password_salt = hashedPassword.salt;
    user.password_must_change = false;

    const session = toAuthenticatedUser(database, user);
    return session ? { status: "updated" as const, session } : { status: "invalid" as const };
  });
}

export async function createPasswordResetRequest(identifier: string) {
  const normalizedIdentifier = normalizeUsername(identifier);
  if (!normalizedIdentifier) return null;

  return mutateDatabase((database) => {
    const nowMs = Date.now();
    database.password_reset_tokens = database.password_reset_tokens.filter(
      (token) => !token.used_at && Date.parse(token.expires_at) > nowMs
    );

    const user = database.users.find(
      (candidate) =>
        candidate.normalized_username === normalizedIdentifier ||
        candidate.normalized_email === normalizedIdentifier
    );
    if (!user) return null;

    const resetToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(nowMs + passwordResetTokenMaxAgeMs).toISOString();
    database.password_reset_tokens.push({
      id: randomUUID(),
      user_id: user.id,
      token_hash: hashPasswordResetToken(resetToken),
      expires_at: expiresAt,
      used_at: null,
      created_at: new Date(nowMs).toISOString()
    });

    return { token: resetToken, expiresAt, email: user.email, username: user.username };
  });
}

export async function resetUserPassword(token: string, password: string) {
  const trimmedToken = token.trim();
  if (!trimmedToken || password.length < 5) {
    return { status: "invalid" as const };
  }

  const tokenHash = hashPasswordResetToken(trimmedToken);
  return mutateDatabase((database) => {
    const nowMs = Date.now();
    const resetToken = database.password_reset_tokens.find((candidate) => candidate.token_hash === tokenHash);
    if (!resetToken || resetToken.used_at || Date.parse(resetToken.expires_at) <= nowMs) {
      return { status: "invalid" as const };
    }

    const user = database.users.find((candidate) => candidate.id === resetToken.user_id);
    if (!user) return { status: "invalid" as const };

    const hashedPassword = hashPassword(password);
    user.password_hash = hashedPassword.hash;
    user.password_salt = hashedPassword.salt;
    user.password_must_change = false;
    resetToken.used_at = new Date(nowMs).toISOString();

    const session = toAuthenticatedUser(database, user);
    return session ? { status: "reset" as const, session } : { status: "invalid" as const };
  });
}

export async function getAuthenticatedUserById(userId: string) {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  return user ? toAuthenticatedUser(database, user) : null;
}

export async function parentCanAccessStudent(parentId: string, studentId: string) {
  const database = await readDatabase();
  return parentCanAccessStudentInDatabase(database, parentId, studentId);
}

export async function getTeacherFoundationData(userId: string): Promise<TeacherFoundationData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const teacher = toAuthenticatedUser(database, user);
  if (!teacher) return null;

  const classRecords = teacherClassRecordsFor(database, user);
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  const classes = classRecords.map((teacherClass) => toTeacherClass(database, teacherClass));
  const assignments = database.assignments
    .filter((assignment) => classIds.has(assignment.class_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const messages = database.teacher_messages
    .filter((message) => user.role === "admin" || message.teacher_id === user.id || (message.class_id && classIds.has(message.class_id)))
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
  const resources = database.teaching_resources
    .filter((resource) => user.role === "admin" || resource.uploaded_by === user.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((resource) => toTeachingResource(database, resource));
  const assessments = database.assessments
    .filter((assessment) => classIds.has(assessment.class_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((assessment) => toAssessment(database, assessment));
  const studentIds = new Set(
    database.class_enrollments
      .filter((enrollment) => classIds.has(enrollment.class_id))
      .map((enrollment) => enrollment.student_id)
  );

  return {
    teacher: teacher.user,
    classes,
    totals: {
      classes: classes.length,
      students: studentIds.size,
      activeAssignments: assignments.filter((assignment) => assignment.status === "active").length,
      unreadMessages: messages.filter((message) => message.status === "unread").length,
      resources: resources.length,
      assessments: assessments.length
    },
    recentAssignments: assignments.slice(0, 5).map((assignment) => toAssignment(database, assignment)),
    inboxPreview: messages.slice(0, 5).map((message) => toTeacherMessage(database, message)),
    resources: resources.slice(0, 5),
    assessments: assessments.slice(0, 5)
  };
}

function isSubmissionComplete(submission: SubmissionRecord) {
  return submission.status === "submitted" || submission.status === "graded" || submission.status === "late";
}

function needsTeacherGrading(submission: SubmissionRecord) {
  return (
    (submission.status === "submitted" || submission.status === "late") &&
    submission.graded_at === null &&
    submission.score === null
  );
}

function teacherMessagesFor(database: Database, user: UserRecord, classIds: Set<string>) {
  return database.teacher_messages
    .filter((message) => user.role === "admin" || message.teacher_id === user.id || (message.class_id && classIds.has(message.class_id)))
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function timestampOf(value?: string | null) {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

function isWithinDays(value: string | null | undefined, nowMs: number, days: number) {
  const time = timestampOf(value);
  return time !== null && time >= nowMs - days * dayMs && time <= nowMs + days * dayMs;
}

function latestStudentActivityAt(database: Database, studentId: string) {
  const timestamps = [
    ...database.attempts.filter((attempt) => attempt.user_id === studentId).map((attempt) => attempt.created_at),
    ...database.learning_events.filter((event) => event.user_id === studentId).map((event) => event.created_at),
    ...database.visualization_sessions.filter((session) => session.user_id === studentId).map((session) => session.updated_at),
    ...database.ai_tutor_messages.filter((message) => message.user_id === studentId).map((message) => message.created_at),
    ...database.submissions.filter((submission) => submission.student_id === studentId).map((submission) => submission.updated_at)
  ]
    .map(timestampOf)
    .filter((time): time is number => time !== null);

  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}

function studentAverageMastery(database: Database, studentId: string, topicIds: string[]) {
  if (!topicIds.length) return 0;

  const masteryValues = topicIds.map((topicId) => {
    return database.lesson_progress.find((progress) => progress.user_id === studentId && progress.topic_id === topicId)?.mastery ?? 0;
  });

  return Math.round(masteryValues.reduce((sum, mastery) => sum + mastery, 0) / masteryValues.length);
}

function aiTutorMessageCountInWindow(database: Database, studentId: string, nowMs: number, days: number) {
  const earliest = nowMs - days * dayMs;
  return database.ai_tutor_messages.filter((message) => {
    const createdAt = timestampOf(message.created_at);
    return message.user_id === studentId && createdAt !== null && createdAt >= earliest && createdAt <= nowMs;
  }).length;
}

function teacherStudentIdsForClass(database: Database, classId: string) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

function actionPriorityRank(priority: TeacherActionQueueItem["priority"]) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

export async function getTeacherDashboardData(userId: string): Promise<TeacherDashboardData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const teacher = toAuthenticatedUser(database, user);
  if (!teacher) return null;

  const now = new Date();
  const nowMs = now.getTime();
  const generatedAt = now.toISOString();
  const classRecords = teacherClassRecordsFor(database, user);
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  const classes = classRecords.map((teacherClass) => toTeacherClass(database, teacherClass));
  const classNameById = new Map(classes.map((teacherClass) => [teacherClass.id, teacherClass.name]));
  const teacherAssignments = database.assignments
    .filter((assignment) => classIds.has(assignment.class_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const assignmentIds = new Set(teacherAssignments.map((assignment) => assignment.id));
  const assignmentById = new Map(teacherAssignments.map((assignment) => [assignment.id, assignment]));
  const submissions = database.submissions.filter((submission) => assignmentIds.has(submission.assignment_id));
  const messages = teacherMessagesFor(database, user, classIds);
  const enrolledStudentIds = Array.from(
    new Set(
      database.class_enrollments
        .filter((enrollment) => classIds.has(enrollment.class_id))
        .map((enrollment) => enrollment.student_id)
    )
  );
  const studentNameById = new Map(
    enrolledStudentIds.map((studentId) => [studentId, studentProfileFor(database, studentId)?.name ?? "Unknown student"])
  );
  const weeklyAssignments = teacherAssignments.filter((assignment) =>
    isWithinDays(assignment.updated_at, nowMs, 7) ||
    isWithinDays(assignment.created_at, nowMs, 7) ||
    isWithinDays(assignment.due_at, nowMs, 7)
  );
  const weeklyAssignmentIds = new Set((weeklyAssignments.length ? weeklyAssignments : teacherAssignments).map((assignment) => assignment.id));
  const weeklySubmissions = submissions.filter((submission) => weeklyAssignmentIds.has(submission.assignment_id));
  const unrepliedMessages = messages.filter((message) => message.status !== "resolved").length;
  const pendingGrading = submissions.filter(needsTeacherGrading).length;

  const masteryHeatmap: TeacherMasteryHeatmapCell[] = classRecords.flatMap((teacherClass) => {
    const studentIds = teacherStudentIdsForClass(database, teacherClass.id);
    if (studentIds.length === 0) return [];

    return database.topics
      .filter((topic) => isCurriculumTopic(topic, curriculumProfileForClass(database, teacherClass)) && topic.grade === teacherClass.grade)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((topic) => {
        const masteryValues = studentIds.map((studentId) => {
          return database.lesson_progress.find((progress) => progress.user_id === studentId && progress.topic_id === topic.id)?.mastery ?? 0;
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
          topicTitle: localizedTopicTitleForRecord(topic),
          averageMastery,
          studentCount: studentIds.length,
          weakStudentCount,
          href: `/teacher/classes?class=${encodeURIComponent(teacherClass.id)}&topic=${encodeURIComponent(topic.id)}`
        };
      });
  });

  const classSummaries: TeacherClassDashboardSummary[] = classRecords.map((teacherClass) => {
    const studentIds = teacherStudentIdsForClass(database, teacherClass.id);
    const topicIds = topicIdsForClass(database, teacherClass);
    const classAssignments = teacherAssignments.filter((assignment) => assignment.class_id === teacherClass.id);
    const classAssignmentIds = new Set(classAssignments.map((assignment) => assignment.id));
    const classSubmissions = submissions.filter((submission) => classAssignmentIds.has(submission.assignment_id));
    const masteryValues = studentIds.map((studentId) => studentAverageMastery(database, studentId, topicIds));
    const averageMastery = masteryValues.length
      ? Math.round(masteryValues.reduce((sum, mastery) => sum + mastery, 0) / masteryValues.length)
      : 0;
    const atRiskStudents = studentIds.filter((studentId) => {
      const activeMistakes = database.mistakes.filter(
        (mistake) => mistake.user_id === studentId && !mistake.mastered && mistake.wrong_attempts >= 3
      ).length;
      const latestActivity = latestStudentActivityAt(database, studentId);
      const inactive = latestActivity ? nowMs - Date.parse(latestActivity) > 7 * dayMs : true;
      return studentAverageMastery(database, studentId, topicIds) < 55 || activeMistakes > 0 || inactive || aiTutorMessageCountInWindow(database, studentId, nowMs, 7) >= 5;
    }).length;

    return {
      classId: teacherClass.id,
      className: teacherClass.name,
      grade: teacherClass.grade,
      studentCount: studentIds.length,
      averageMastery,
      assignmentCompletionRate: percent(classSubmissions.filter(isSubmissionComplete).length, classSubmissions.length),
      activeAssignments: classAssignments.filter((assignment) => assignment.status === "active").length,
      atRiskStudents,
      href: `/teacher/classes?class=${encodeURIComponent(teacherClass.id)}`
    };
  });

  const atRiskStudentIds = new Set<string>();
  classRecords.forEach((teacherClass) => {
    const topicIds = topicIdsForClass(database, teacherClass);
    teacherStudentIdsForClass(database, teacherClass.id).forEach((studentId) => {
      const activeMistakes = database.mistakes.filter(
        (mistake) => mistake.user_id === studentId && !mistake.mastered && mistake.wrong_attempts >= 3
      ).length;
      const latestActivity = latestStudentActivityAt(database, studentId);
      const inactive = latestActivity ? nowMs - Date.parse(latestActivity) > 7 * dayMs : true;
      if (studentAverageMastery(database, studentId, topicIds) < 55 || activeMistakes > 0 || inactive || aiTutorMessageCountInWindow(database, studentId, nowMs, 7) >= 5) {
        atRiskStudentIds.add(studentId);
      }
    });
  });

  const actionQueue: TeacherActionQueueItem[] = [];

  teacherAssignments.forEach((assignment) => {
    const dueAtMs = timestampOf(assignment.due_at);
    if (dueAtMs === null || dueAtMs >= nowMs) return;

    const assignmentSubmissions = submissions.filter((submission) => submission.assignment_id === assignment.id);
    const incompleteCount = assignmentSubmissions.filter((submission) => !isSubmissionComplete(submission)).length;
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
      href: `/teacher/assignments?assignment=${encodeURIComponent(assignment.id)}`,
      className: classNameById.get(assignment.class_id),
      dueAt: assignment.due_at,
      createdAt: assignment.due_at ?? assignment.updated_at
    });
  });

  submissions.filter(needsTeacherGrading).forEach((submission) => {
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
      href: `/teacher/assignments?assignment=${encodeURIComponent(assignment.id)}&submission=${encodeURIComponent(submission.id)}`,
      className: classNameById.get(assignment.class_id),
      studentName,
      createdAt: submission.submitted_at ?? submission.updated_at
    });
  });

  messages
    .filter((message) => message.status !== "resolved")
    .forEach((message) => {
      const studentName = studentNameById.get(message.student_id) ?? studentProfileFor(database, message.student_id)?.name ?? "Unknown student";
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
        href: `/teacher/inbox?thread=${encodeURIComponent(message.id)}`,
        className: message.class_id ? classNameById.get(message.class_id) : undefined,
        studentName,
        createdAt: message.last_message_at
      });
    });

  enrolledStudentIds.forEach((studentId) => {
    const studentName = studentNameById.get(studentId) ?? "Unknown student";
    const classId = database.class_enrollments.find((enrollment) => enrollment.student_id === studentId && classIds.has(enrollment.class_id))?.class_id;
    const activeMistakes = database.mistakes
      .filter((mistake) => mistake.user_id === studentId && !mistake.mastered && mistake.wrong_attempts >= 3)
      .sort((a, b) => b.wrong_attempts - a.wrong_attempts || b.last_attempt_at.localeCompare(a.last_attempt_at));
    const latestActivity = latestStudentActivityAt(database, studentId);
    const aiTutorCount = aiTutorMessageCountInWindow(database, studentId, nowMs, 7);

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
        href: `/teacher/classes?student=${encodeURIComponent(studentId)}&focus=mistakes`,
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
        href: `/teacher/classes?student=${encodeURIComponent(studentId)}&focus=activity`,
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
        href: `/teacher/classes?student=${encodeURIComponent(studentId)}&focus=ai-tutor`,
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
    teacher: teacher.user,
    kpis: {
      pendingGrading,
      unrepliedMessages,
      weeklyAssignmentCompletionRate: percent(weeklySubmissions.filter(isSubmissionComplete).length, weeklySubmissions.length),
      atRiskStudents: atRiskStudentIds.size
    },
    rewardSummary: teacherRewardDashboardSummary(database, user, nowMs),
    classSummaries,
    masteryHeatmap,
    actionQueue: actionQueue.slice(0, 12)
  };
}

function average(values: number[]) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  return finiteValues.length ? Math.round(finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length) : null;
}

function localizedTopic(topic: TopicRecord): LocalizedText {
  return localizedTopicTitleForRecord(topic);
}

function topicIdsForClass(database: Database, teacherClass: TeacherClassRecord) {
  const curriculumProfile = curriculumProfileForClass(database, teacherClass);
  return database.topics
    .filter((topic) => isCurriculumTopic(topic, curriculumProfile) && topic.grade === teacherClass.grade)
    .map((topic) => topic.id);
}

function teacherClassStudentPairs(database: Database, classRecords: TeacherClassRecord[]) {
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  return database.class_enrollments
    .filter((enrollment) => classIds.has(enrollment.class_id))
    .map((enrollment) => ({
      classId: enrollment.class_id,
      studentId: enrollment.student_id
    }));
}

function studentAnswerAttemptsForTopic(database: Database, studentIds: Set<string>, topicId?: string) {
  return database.attempts.filter((attempt) => {
    if (!studentIds.has(attempt.user_id)) return false;
    if (!topicId) return true;
    return questionForId(database, attempt.question_id)?.topic_id === topicId;
  });
}

function hintRequestsFor(database: Database, studentIds: Set<string>, nowMs: number, days: number, topicId?: string) {
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

function aiTutorMessagesFor(database: Database, studentIds: Set<string>, nowMs: number, days: number) {
  const earliest = nowMs - days * dayMs;
  return database.ai_tutor_messages.filter((message) => {
    const messageMs = timestampOf(message.created_at);
    return studentIds.has(message.user_id) && messageMs !== null && messageMs >= earliest && messageMs <= nowMs;
  }).length;
}

function studentLearningMinutes(database: Database, studentIds: Set<string>, nowMs: number, days: number) {
  const earliest = nowMs - days * dayMs;
  const attemptSeconds = database.attempts
    .filter((attempt) => {
      const attemptMs = timestampOf(attempt.created_at);
      return studentIds.has(attempt.user_id) && attemptMs !== null && attemptMs >= earliest && attemptMs <= nowMs;
    })
    .reduce((sum, attempt) => sum + (attempt.duration_seconds ?? 0), 0);
  const eventSeconds = database.learning_events
    .filter((event) => {
      const eventMs = timestampOf(event.created_at);
      return studentIds.has(event.user_id) && eventMs !== null && eventMs >= earliest && eventMs <= nowMs;
    })
    .reduce((sum, event) => sum + (event.duration_seconds ?? 0), 0);

  return secondsToDisplayMinutes(attemptSeconds + eventSeconds);
}

function buildTeacherActivityTrend(
  database: Database,
  studentIds: Set<string>,
  windowDays: number,
  now = new Date()
): TeacherAnalyticsTrendPoint[] {
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

function interventionRecommendation(action: TeacherInterventionAction): LocalizedText {
  const labels: Record<TeacherInterventionAction, LocalizedText> = {
    "rebuild-foundation": { en: "Rebuild foundations before moving on.", zh: "先補基礎，再進入新內容。" },
    "redo-mistakes": { en: "Assign mistake review and a short retry set.", zh: "安排錯題重做和短練習。" },
    "challenge-extension": { en: "Offer extension questions to keep momentum.", zh: "可安排進階題保持挑戰。" },
    "teacher-message": { en: "Send a private follow-up message.", zh: "建議教師私信跟進。" }
  };
  return labels[action];
}

function recommendedActionForStudent({
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

function buildFrequentMistakes(
  database: Database,
  classRecords: TeacherClassRecord[],
  studentIds: Set<string>
): TeacherAnalyticsFrequentMistake[] {
  const classByStudentId = new Map<string, TeacherClassRecord>();
  classRecords.forEach((teacherClass) => {
    teacherStudentIdsForClass(database, teacherClass.id).forEach((studentId) => classByStudentId.set(studentId, teacherClass));
  });
  const mistakeMap = new Map<string, {
    question: QuestionRecord;
    classRecord: TeacherClassRecord;
    wrongAttempts: number;
    studentIds: Set<string>;
    lastAttemptAt: string;
  }>();

  database.mistakes
    .filter((mistake) => studentIds.has(mistake.user_id))
    .forEach((mistake) => {
      const question = questionForId(database, mistake.question_id);
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
      topicTitle: topicLabelFor(database, item.question),
      prompt: { en: item.question.prompt_en, zh: item.question.prompt_zh },
      wrongAttempts: item.wrongAttempts,
      studentCount: item.studentIds.size,
      lastAttemptAt: item.lastAttemptAt
    }))
    .sort((a, b) => b.wrongAttempts - a.wrongAttempts || b.lastAttemptAt.localeCompare(a.lastAttemptAt))
    .slice(0, 8);
}

function buildInterventionGroups(
  database: Database,
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

export async function getTeacherAnalyticsData(
  userId: string,
  selectedClassId?: string | null
): Promise<TeacherAnalyticsData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const now = new Date();
  const nowMs = now.getTime();
  const allClassRecords = teacherClassRecordsFor(database, user);
  const selectedClassRecords = selectedClassId && selectedClassId !== "all"
    ? allClassRecords.filter((teacherClass) => teacherClass.id === selectedClassId)
    : allClassRecords;
  if (selectedClassId && selectedClassId !== "all" && selectedClassRecords.length === 0) return null;

  const classes = allClassRecords.map((teacherClass) => toTeacherClass(database, teacherClass));
  const studentPairs = teacherClassStudentPairs(database, selectedClassRecords);
  const studentIds = new Set(studentPairs.map((pair) => pair.studentId));
  const topicMastery: TeacherAnalyticsTopicCell[] = selectedClassRecords.flatMap((teacherClass) => {
    const classStudentIds = new Set(teacherStudentIdsForClass(database, teacherClass.id));
    if (classStudentIds.size === 0) return [];
    const curriculumProfile = curriculumProfileForClass(database, teacherClass);
    return database.topics
      .filter((topic) => isCurriculumTopic(topic, curriculumProfile) && topic.grade === teacherClass.grade)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((topic) => {
        const masteryValues = Array.from(classStudentIds).map((studentId) => {
          return database.lesson_progress.find((progress) => progress.user_id === studentId && progress.topic_id === topic.id)?.mastery ?? 0;
        });
        const topicAttempts = studentAnswerAttemptsForTopic(database, classStudentIds, topic.id);
        const answerDurations = topicAttempts
          .map((attempt) => attempt.duration_seconds)
          .filter((duration): duration is number => typeof duration === "number");
        const wrongAttempts = database.mistakes
          .filter((mistake) => classStudentIds.has(mistake.user_id) && questionForId(database, mistake.question_id)?.topic_id === topic.id)
          .reduce((sum, mistake) => sum + mistake.wrong_attempts, 0);
        const averageMastery = average(masteryValues) ?? 0;
        const weakStudentCount = masteryValues.filter((mastery) => mastery < 60).length;
        const hintRequests = hintRequestsFor(database, classStudentIds, nowMs, 30, topic.id);

        return {
          id: `${teacherClass.id}-${topic.id}`,
          classId: teacherClass.id,
          className: teacherClass.name,
          grade: teacherClass.grade,
          topicId: topic.id,
          topicTitle: localizedTopic(topic),
          averageMastery,
          studentCount: classStudentIds.size,
          weakStudentCount,
          averageAnswerSeconds: average(answerDurations),
          hintRequests,
          aiTutorMessages: aiTutorMessagesFor(database, classStudentIds, nowMs, 30),
          wrongAttempts,
          reteachRecommended: averageMastery < 58 || weakStudentCount >= Math.ceil(Math.max(1, classStudentIds.size) / 2) || wrongAttempts >= 6,
          href: `/teacher/classes/${encodeURIComponent(teacherClass.id)}?topic=${encodeURIComponent(topic.id)}`
        };
      });
  });

  const studentRisks: TeacherAnalyticsStudentRisk[] = studentPairs.map((pair) => {
    const classRecord = selectedClassRecords.find((teacherClass) => teacherClass.id === pair.classId) ?? selectedClassRecords[0];
    const topicIds = classRecord ? topicIdsForClass(database, classRecord) : [];
    const summary = classRecord
      ? classStudentSummary(database, classRecord, pair.studentId, nowMs)
      : null;
    const classStudentIds = new Set([pair.studentId]);
    const attempts = studentAnswerAttemptsForTopic(database, classStudentIds);
    const activeMistakes = database.mistakes.filter((mistake) => mistake.user_id === pair.studentId && !mistake.mastered).length;
    const latestActivityAt = latestStudentActivityAt(database, pair.studentId);
    const inactive = latestActivityAt ? nowMs - Date.parse(latestActivityAt) > 7 * dayMs : true;
    const hintRequests7d = hintRequestsFor(database, classStudentIds, nowMs, 7);
    const aiTutorMessages7d = aiTutorMessagesFor(database, classStudentIds, nowMs, 7);
    const averageMastery = summary?.averageMastery ?? studentAverageMastery(database, pair.studentId, topicIds);
    const recommendedAction = recommendedActionForStudent({ averageMastery, activeMistakes, inactive, aiTutorMessages7d });
    const tags = summary?.riskTags ?? riskTagsForStudent(database, pair.studentId, topicIds, nowMs);
    const profile = studentProfileFor(database, pair.studentId);
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
      recommendation: interventionRecommendation(recommendedAction),
      href: `/teacher/students/${encodeURIComponent(pair.studentId)}`
    };
  }).sort((a, b) => b.riskScore - a.riskScore || a.studentName.localeCompare(b.studentName));

  const averageMastery = topicMastery.length
    ? Math.round(topicMastery.reduce((sum, cell) => sum + cell.averageMastery, 0) / topicMastery.length)
    : 0;
  const allAttempts = studentAnswerAttemptsForTopic(database, studentIds);
  const allAnswerDurations = allAttempts
    .map((attempt) => attempt.duration_seconds)
    .filter((duration): duration is number => typeof duration === "number");
  const activeStudents7d = new Set(
    Array.from(studentIds).filter((studentId) => {
      const activityAt = latestStudentActivityAt(database, studentId);
      return activityAt ? nowMs - Date.parse(activityAt) <= 7 * dayMs : false;
    })
  ).size;
  const activeStudents30d = new Set(
    Array.from(studentIds).filter((studentId) => {
      const activityAt = latestStudentActivityAt(database, studentId);
      return activityAt ? nowMs - Date.parse(activityAt) <= 30 * dayMs : false;
    })
  ).size;

  return {
    generatedAt: now.toISOString(),
    selectedClassId: selectedClassId && selectedClassId !== "all" ? selectedClassId : "all",
    classes,
    summary: {
      averageMastery,
      atRiskStudents: studentRisks.filter((risk) => risk.riskScore >= 45 || risk.tags.length > 0).length,
      averageAnswerSeconds: average(allAnswerDurations),
      hintRequests7d: hintRequestsFor(database, studentIds, nowMs, 7),
      aiTutorMessages7d: aiTutorMessagesFor(database, studentIds, nowMs, 7),
      activeStudents7d,
      activeStudents30d
    },
    topicMastery,
    studentRisks: studentRisks.filter((risk) => risk.riskScore >= 30 || risk.recommendedAction === "challenge-extension").slice(0, 24),
    frequentMistakes: buildFrequentMistakes(database, selectedClassRecords, studentIds),
    activityTrend7d: buildTeacherActivityTrend(database, studentIds, 7, now),
    activityTrend30d: buildTeacherActivityTrend(database, studentIds, 30, now),
    interventionGroups: buildInterventionGroups(database, topicMastery, studentRisks)
  };
}

export async function createTeacherAnalyticsFollowUpAssignment({
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
  const dueAt = new Date(Date.now() + 7 * dayMs).toISOString();
  return createTeacherAssignment({
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
}

export async function getTeacherClasses(userId: string): Promise<TeacherClass[] | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  return teacherClassRecordsFor(database, user).map((teacherClass) => toTeacherClass(database, teacherClass));
}

export async function getTeacherClassEnrollments(userId: string, classId: string): Promise<ClassEnrollment[] | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass || (user.role !== "admin" && teacherClass.teacher_id !== user.id)) return null;

  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => toClassEnrollment(database, enrollment));
}

export async function getTeacherAssignmentSubmissions(
  userId: string,
  assignmentId: string
): Promise<Submission[] | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const assignment = database.assignments.find((candidate) => candidate.id === assignmentId);
  const teacherClass = assignment
    ? database.teacher_classes.find((candidate) => candidate.id === assignment.class_id)
    : null;
  if (!assignment || !teacherClass || (user.role !== "admin" && teacherClass.teacher_id !== user.id)) return null;

  return database.submissions
    .filter((submission) => submission.assignment_id === assignmentId)
    .map((submission) => toSubmission(database, submission));
}

export async function getTeacherReports(userId: string): Promise<TeacherReport[] | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
  return database.teacher_reports
    .filter((report) => user.role === "admin" || !report.class_id || classIds.has(report.class_id))
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
    .map(toTeacherReport);
}

function localized(value: LocalizedText, language: TeacherReportLanguage) {
  return textForLanguage(value, language);
}

function isChineseReportLanguage(language: TeacherReportLanguage) {
  return language === "zh" || language === "zh-Hans";
}

function studentTargetsForTeacher(database: Database, classRecords: TeacherClassRecord[]): TeacherReportTarget[] {
  const classById = new Map(classRecords.map((teacherClass) => [teacherClass.id, teacherClass]));
  const targets: TeacherReportTarget[] = [];

  teacherClassStudentPairs(database, classRecords).forEach((pair) => {
    const profile = studentProfileFor(database, pair.studentId);
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

function classTargetsForTeacher(classRecords: TeacherClassRecord[]): TeacherReportTarget[] {
  return classRecords.map((teacherClass) => ({
    id: teacherClass.id,
    label: { en: teacherClass.name, zh: teacherClass.name },
    type: "class" as const,
    classId: teacherClass.id
  }));
}

function assignmentTargetsForTeacher(database: Database, classRecords: TeacherClassRecord[]): TeacherReportTarget[] {
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  return database.assignments
    .filter((assignment) => classIds.has(assignment.class_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((assignment) => ({
      id: assignment.id,
      label: { en: assignment.title_en, zh: assignment.title_zh },
      type: "assignment" as const,
      classId: assignment.class_id,
      assignmentId: assignment.id
    }));
}

function assessmentTargetsForTeacher(database: Database, classRecords: TeacherClassRecord[]): TeacherReportTarget[] {
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  return database.assessments
    .filter((assessment) => classIds.has(assessment.class_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((assessment) => ({
      id: assessment.id,
      label: { en: assessment.title_en, zh: assessment.title_zh },
      type: "assessment" as const,
      classId: assessment.class_id,
      assessmentId: assessment.id
    }));
}

function topicMasteryRows(database: Database, studentIds: string[], topicIds: string[]) {
  return topicIds
    .map((topicId) => {
      const topic = topicRecordForId(database, topicId);
      if (!topic) return null;
      const masteryValues = studentIds.map((studentId) => {
        return database.lesson_progress.find((progress) => progress.user_id === studentId && progress.topic_id === topicId)?.mastery ?? 0;
      });
      return {
        topic,
        mastery: average(masteryValues) ?? 0
      };
    })
    .filter((row): row is { topic: TopicRecord; mastery: number } => Boolean(row));
}

function answerAccuracyForStudents(database: Database, studentIds: Set<string>, nowMs: number, days: number) {
  const earliest = nowMs - days * dayMs;
  const attempts = database.attempts.filter((attempt) => {
    const attemptMs = timestampOf(attempt.created_at);
    return studentIds.has(attempt.user_id) && attemptMs !== null && attemptMs >= earliest && attemptMs <= nowMs;
  });
  if (!attempts.length) return null;
  return Math.round((attempts.filter((attempt) => attempt.is_correct).length / attempts.length) * 100);
}

function masteryChangeSignal(database: Database, studentIds: Set<string>, nowMs: number) {
  const recentAccuracy = answerAccuracyForStudents(database, studentIds, nowMs, 30);
  const previousEarliest = nowMs - 60 * dayMs;
  const previousLatest = nowMs - 30 * dayMs;
  const previousAttempts = database.attempts.filter((attempt) => {
    const attemptMs = timestampOf(attempt.created_at);
    return studentIds.has(attempt.user_id) && attemptMs !== null && attemptMs >= previousEarliest && attemptMs < previousLatest;
  });
  if (recentAccuracy === null || !previousAttempts.length) return 0;
  const previousAccuracy = Math.round((previousAttempts.filter((attempt) => attempt.is_correct).length / previousAttempts.length) * 100);
  return Math.max(-30, Math.min(30, recentAccuracy - previousAccuracy));
}

function reportMistakeTypes(database: Database, studentIds: Set<string>, language: TeacherReportLanguage) {
  const counts = new Map<string, number>();
  database.mistakes
    .filter((mistake) => studentIds.has(mistake.user_id))
    .forEach((mistake) => {
      const question = questionForId(database, mistake.question_id);
      if (!question) return;
      const topic = localized(topicLabelFor(database, question), language);
      counts.set(topic, (counts.get(topic) ?? 0) + mistake.wrong_attempts);
    });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => isChineseReportLanguage(language) ? `${topic}：${count} ${localized({ en: "wrong attempts", zh: "次錯誤" }, language)}` : `${topic}: ${count} wrong attempts`)
    .slice(0, 5);
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
  database: Database;
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
    ? weaknesses.map((weakness) => isChineseReportLanguage(language) ? `${localized({ en: "Redo", zh: "重做" }, language)} ${weakness}` : `Redo ${weakness}`)
    : rows.slice(0, 2).map((row) => isChineseReportLanguage(language) ? `${localized({ en: "Challenge", zh: "挑戰" }, language)} ${localized(localizedTopic(row.topic), language)} ${localized({ en: "extension questions", zh: "進階題" }, language)}` : `Try extension questions for ${localized(localizedTopic(row.topic), language)}`);

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

export async function getTeacherReportPreview({
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
  const generatedAt = new Date().toISOString();
  const firstClass = classRecords.find((teacherClass) => teacherStudentIdsForClass(database, teacherClass.id).length > 0) ?? classRecords[0];
  if (!firstClass) return null;

  if (type === "assignment") {
    const assignment = (assignmentId ? database.assignments.find((candidate) => candidate.id === assignmentId) : null) ??
      database.assignments.find((candidate) => candidate.class_id === (classId ?? firstClass.id));
    const teacherClass = assignment ? teacherCanAccessClass(database, user, assignment.class_id) : null;
    if (!assignment || !teacherClass) return null;
    const submissions = database.submissions.filter((submission) => submission.assignment_id === assignment.id);
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
    const assessment = (assessmentId ? database.assessments.find((candidate) => candidate.id === assessmentId) : null) ??
      database.assessments.find((candidate) => candidate.class_id === (classId ?? firstClass.id));
    const teacherClass = assessment ? teacherCanAccessClass(database, user, assessment.class_id) : null;
    if (!assessment || !teacherClass) return null;
    const submissions = database.assessment_submissions.filter((submission) => submission.assessment_id === assessment.id);
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
      completionRate: percent(submissions.filter((submission) => submission.status === "submitted" || submission.status === "graded").length, studentIds.length),
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
  const profile = studentIds.length === 1 ? studentProfileFor(database, studentIds[0]) : null;
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

export async function getTeacherReportsData(userId: string): Promise<TeacherReportsData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const classRecords = teacherClassRecordsFor(database, user);
  const history = await getTeacherReports(userId);
  const defaultClass = classRecords.find((teacherClass) => teacherStudentIdsForClass(database, teacherClass.id).length > 0) ?? classRecords[0];
  const defaultPreview = await getTeacherReportPreview({
    teacherId: userId,
    type: "class",
    language: "zh",
    classId: defaultClass?.id
  });

  return {
    generatedAt: new Date().toISOString(),
    classes: classRecords.map((teacherClass) => toTeacherClass(database, teacherClass)),
    students: studentTargetsForTeacher(database, classRecords),
    assignments: assignmentTargetsForTeacher(database, classRecords),
    assessments: assessmentTargetsForTeacher(database, classRecords),
    reportHistory: history ?? [],
    defaultPreview
  };
}

export function teacherReportPreviewToCsv(preview: TeacherReportPreview) {
  const rows = [
    ["Field", "Value"],
    ["Title", preview.title],
    ["Subtitle", preview.subtitle],
    ["Generated at", preview.generatedAt],
    ["Subject", preview.subjectName],
    ["Class", preview.className ?? ""],
    ["Learning minutes", String(preview.metrics.learningMinutes)],
    ["Mastery change", String(preview.metrics.masteryChange)],
    ["Average mastery", String(preview.metrics.averageMastery)],
    ["Accuracy", preview.metrics.accuracy === null ? "" : String(preview.metrics.accuracy)],
    ["Completion rate", preview.metrics.completionRate === null ? "" : String(preview.metrics.completionRate)],
    ["Strengths", preview.strengths.join("; ")],
    ["Weaknesses", preview.weaknesses.join("; ")],
    ["Mistake types", preview.mistakeTypes.join("; ")],
    ["Suggested practice", preview.suggestedPractice.join("; ")],
    ["Teacher remarks", preview.teacherRemarks]
  ];

  return rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export async function saveTeacherReportPreview(teacherId: string, preview: TeacherReportPreview) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const report: TeacherReportRecord = {
      id: `report-${randomUUID()}`,
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
    return { status: "saved" as const, report: toTeacherReport(report) };
  });
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?");
}

export function teacherReportPreviewToPdf(preview: TeacherReportPreview) {
  const lines = [
    preview.title,
    preview.subtitle,
    `Subject: ${preview.subjectName}`,
    preview.className ? `Class: ${preview.className}` : "",
    `Generated: ${new Date(preview.generatedAt).toLocaleString("en-HK")}`,
    `Learning minutes: ${preview.metrics.learningMinutes}`,
    `Average mastery: ${preview.metrics.averageMastery}%`,
    `Accuracy: ${preview.metrics.accuracy ?? "-"}%`,
    `Completion: ${preview.metrics.completionRate ?? "-"}%`,
    "",
    "Strengths:",
    ...preview.strengths.map((item) => `- ${item}`),
    "",
    "Weaknesses:",
    ...preview.weaknesses.map((item) => `- ${item}`),
    "",
    "Suggested practice:",
    ...preview.suggestedPractice.map((item) => `- ${item}`),
    preview.teacherRemarks ? "" : "",
    preview.teacherRemarks ? "Teacher remarks:" : "",
    preview.teacherRemarks
  ].filter((line) => line !== undefined).slice(0, 42);

  const content = [
    "BT",
    "/F1 18 Tf",
    "50 780 Td",
    `(${escapePdfText(lines[0] ?? "Learning report")}) Tj`,
    "/F1 10 Tf",
    ...lines.slice(1).flatMap((line) => ["0 -18 Td", `(${escapePdfText(line)}) Tj`]),
    "ET"
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body, "utf8");
}

function teacherCanAccessClass(database: Database, user: UserRecord, classId: string) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (
    user.role !== "admin" &&
    teacherClass.teacher_id !== user.id &&
    !database.school_memberships.some(
      (membership) =>
        membership.user_id === user.id &&
        membership.class_id === classId &&
        (membership.role === "teacher" || membership.role === "admin")
    )
  ) {
    return null;
  }
  return teacherClass;
}

function studentMatchesClassCurriculum(database: Database, studentId: string, teacherClass: TeacherClassRecord) {
  return curriculumProfilesEqual(
    curriculumProfileForUser(database, studentId),
    curriculumProfileForClass(database, teacherClass)
  );
}

function teacherClassForStudent(database: Database, user: UserRecord, studentId: string) {
  const classRecords = teacherClassRecordsFor(database, user);
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  const enrollment = database.class_enrollments.find(
    (candidate) => candidate.student_id === studentId && classIds.has(candidate.class_id)
  );
  return enrollment ? classRecords.find((teacherClass) => teacherClass.id === enrollment.class_id) ?? null : null;
}

function riskTagsForStudent(database: Database, studentId: string, topicIds: string[], nowMs: number): TeacherStudentRiskTag[] {
  const tags: TeacherStudentRiskTag[] = [];
  const activeMistakes = database.mistakes.filter((mistake) => mistake.user_id === studentId && !mistake.mastered);
  const latestActivity = latestStudentActivityAt(database, studentId);
  const lateWork = database.submissions.some((submission) => submission.student_id === studentId && submission.status === "late");

  if (studentAverageMastery(database, studentId, topicIds) < 55) tags.push("low-mastery");
  if (activeMistakes.some((mistake) => mistake.wrong_attempts >= 3)) tags.push("repeated-mistakes");
  if (!latestActivity || nowMs - Date.parse(latestActivity) > 7 * dayMs) tags.push("inactive");
  if (aiTutorMessageCountInWindow(database, studentId, nowMs, 7) >= 5) tags.push("high-ai-tutor");
  if (lateWork) tags.push("late-work");

  return tags;
}

function classStudentSummary(database: Database, teacherClass: TeacherClassRecord, studentId: string, nowMs: number): TeacherClassStudentSummary {
  const profile = studentProfileFor(database, studentId);
  const topicIds = topicIdsForClass(database, teacherClass);
  const classAssignments = database.assignments.filter((assignment) => assignment.class_id === teacherClass.id);
  const assignmentIds = new Set(classAssignments.map((assignment) => assignment.id));
  const submissions = database.submissions.filter((submission) => submission.student_id === studentId && assignmentIds.has(submission.assignment_id));

  return {
    studentId,
    studentName: profile?.name ?? "Unknown student",
    grade: profile?.grade ?? teacherClass.grade,
    recentActivityAt: latestStudentActivityAt(database, studentId),
    averageMastery: studentAverageMastery(database, studentId, topicIds),
    assignmentCompletionRate: percent(submissions.filter(isSubmissionComplete).length, submissions.length),
    riskTags: riskTagsForStudent(database, studentId, topicIds, nowMs),
    href: `/teacher/students/${encodeURIComponent(studentId)}`
  };
}

export async function createTeacherClass({
  teacherId,
  name,
  grade,
  academicYear,
  description
}: {
  teacherId: string;
  name: string;
  grade: GradeId;
  academicYear: string;
  description: string;
}) {
  const trimmedName = name.trim();
  const trimmedYear = academicYear.trim();
  const trimmedDescription = description.trim();
  if (!trimmedName || !validGrades.has(grade) || !trimmedYear) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const now = new Date().toISOString();
    const classId = `class-${randomUUID()}`;
    const inviteCode = `${grade}-${randomUUID().slice(0, 6)}`.toUpperCase();
    database.teacher_classes.unshift({
      id: classId,
      teacher_id: user.id,
      school_id: user.school_id,
      class_code: undefined,
      name: trimmedName,
      grade,
      academic_year: trimmedYear,
      description_en: trimmedDescription || `${trimmedName} teaching group.`,
      description_zh: trimmedDescription || `${trimmedName} 教學班級。`,
      invite_code: inviteCode,
      created_at: now,
      updated_at: now
    });

    return { status: "created" as const, class: toTeacherClass(database, database.teacher_classes[0]) };
  });
}

function ensureClassStudentWorkRecords(database: Database, classId: string, studentId: string, now: string) {
  database.assignments
    .filter((assignment) => assignment.class_id === classId)
    .forEach((assignment) => {
      if (database.submissions.some((submission) => submission.assignment_id === assignment.id && submission.student_id === studentId)) return;
      database.submissions.push({
        id: `submission-${randomUUID()}`,
        assignment_id: assignment.id,
        student_id: studentId,
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        feedback_en: "",
        feedback_zh: "",
        updated_at: now
      });
    });

  database.assessments
    .filter((assessment) => assessment.class_id === classId)
    .forEach((assessment) => {
      if (database.assessment_submissions.some((submission) => submission.assessment_id === assessment.id && submission.student_id === studentId)) return;
      database.assessment_submissions.push({
        id: `assessment-submission-${randomUUID()}`,
        assessment_id: assessment.id,
        student_id: studentId,
        status: "not-started",
        attempt_number: 0,
        score: null,
        max_score: 100,
        submitted_at: null,
        graded_at: null,
        answers: [],
        updated_at: now
      });
    });
}

export async function addStudentToTeacherClass({
  teacherId,
  classId,
  username
}: {
  teacherId: string;
  classId: string;
  username: string;
}) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const teacherClass = teacherCanAccessClass(database, user, classId);
    if (!teacherClass) return { status: "not-found" as const };

    const student = database.users.find(
      (candidate) =>
        candidate.normalized_username === normalizedUsername ||
        candidate.normalized_email === normalizedUsername
    );
    if (!student || student.role !== "student") return { status: "student-not-found" as const };
    if (!studentMatchesClassCurriculum(database, student.id, teacherClass)) return { status: "curriculum-mismatch" as const };

    if (database.class_enrollments.some((enrollment) => enrollment.class_id === classId && enrollment.student_id === student.id)) {
      return { status: "duplicate" as const };
    }

    const now = new Date().toISOString();
    database.class_enrollments.push({
      id: `enrollment-${randomUUID()}`,
      class_id: classId,
      student_id: student.id,
      joined_at: now
    });
    ensureClassStudentWorkRecords(database, classId, student.id, now);

    return { status: "added" as const };
  });
}

export async function joinClassByInviteCode({
  studentId,
  inviteCode
}: {
  studentId: string;
  inviteCode: string;
}) {
  const normalizedInviteCode = inviteCode.trim().toUpperCase();
  if (!normalizedInviteCode) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const student = database.users.find((candidate) => candidate.id === studentId);
    if (!student || student.role !== "student") return { status: "forbidden" as const };

    const teacherClass = database.teacher_classes.find((candidate) => candidate.invite_code.toUpperCase() === normalizedInviteCode);
    if (!teacherClass) return { status: "not-found" as const };
    if (!studentMatchesClassCurriculum(database, studentId, teacherClass)) return { status: "curriculum-mismatch" as const };

    if (database.class_enrollments.some((enrollment) => enrollment.class_id === teacherClass.id && enrollment.student_id === studentId)) {
      return { status: "duplicate" as const, class: toTeacherClass(database, teacherClass) };
    }

    const now = new Date().toISOString();
    database.class_enrollments.push({
      id: `enrollment-${randomUUID()}`,
      class_id: teacherClass.id,
      student_id: studentId,
      joined_at: now
    });
    ensureClassStudentWorkRecords(database, teacherClass.id, studentId, now);

    return { status: "joined" as const, class: toTeacherClass(database, teacherClass) };
  });
}

export async function getTeacherClassDetailData(userId: string, classId: string): Promise<TeacherClassDetailData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const teacherClass = teacherCanAccessClass(database, user, classId);
  if (!teacherClass) return null;

  const nowMs = Date.now();
  const students = teacherStudentIdsForClass(database, classId)
    .map((studentId) => classStudentSummary(database, teacherClass, studentId, nowMs))
    .sort((a, b) => b.riskTags.length - a.riskTags.length || a.studentName.localeCompare(b.studentName));
  const assignments = database.assignments
    .filter((assignment) => assignment.class_id === classId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((assignment) => toAssignment(database, assignment));

  return {
    class: toTeacherClass(database, teacherClass),
    students,
    assignments
  };
}

export async function getTeacherStudentProfileData(userId: string, studentId: string): Promise<TeacherStudentProfileData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const teacherClass = teacherClassForStudent(database, user, studentId);
  if (!teacherClass) return null;

  const studentUser = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
  if (!studentUser) return null;

  const student = toAuthenticatedUser(database, studentUser);
  if (!student) return null;

  const classRecords = teacherClassRecordsFor(database, user).filter((candidate) =>
    database.class_enrollments.some((enrollment) => enrollment.class_id === candidate.id && enrollment.student_id === studentId)
  );
  const topicIds = new Set(classRecords.flatMap((candidate) => topicIdsForClass(database, candidate)));
  const assignments = database.assignments
    .filter((assignment) => classRecords.some((candidate) => candidate.id === assignment.class_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((assignment) => ({
      assignment: toAssignment(database, assignment),
      submission: database.submissions
        .filter((submission) => submission.assignment_id === assignment.id && submission.student_id === studentId)
        .map((submission) => toSubmission(database, submission))[0] ?? null
    }));
  const messages = database.teacher_messages
    .filter((message) => message.student_id === studentId && (user.role === "admin" || message.teacher_id === user.id))
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
    .map((message) => toTeacherMessage(database, message));
  const recentTutorMessages = database.ai_tutor_messages
    .filter((message) => message.user_id === studentId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);
  const topicProgress = database.topics
    .filter((topic) => topicIds.has(topic.id))
    .map((topic) => {
      const progress = database.lesson_progress.find((candidate) => candidate.user_id === studentId && candidate.topic_id === topic.id);
      return {
        topicId: topic.id,
        title: localizedTopicTitleForRecord(topic),
        grade: topic.grade,
        mastery: progress?.mastery ?? 0,
        status: progress?.status ?? "not-started",
        updatedAt: progress?.updated_at ?? null
      };
    })
    .sort((a, b) => a.mastery - b.mastery);
  const recentAttempts = database.attempts
    .filter((attempt) => attempt.user_id === studentId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)
    .map((attempt) => {
      const question = questionForId(database, attempt.question_id);
      return {
        id: attempt.id,
        questionId: attempt.question_id,
        topic: question ? topicLabelFor(database, question) : { en: "Unknown topic", zh: "未知課題" },
        selectedAnswer: attempt.selected_answer,
        isCorrect: attempt.is_correct,
        durationSeconds: attempt.duration_seconds,
        createdAt: attempt.created_at
      };
    });

  return {
    student: student.user,
    classes: classRecords.map((record) => toTeacherClass(database, record)),
    parentInviteCode: guardianInviteCodeForStudent(studentId),
    guardianLinks: database.guardian_links
      .filter((link) => link.student_id === studentId && link.status === "active")
      .map((link) => toGuardianLink(database, link)),
    averageMastery: studentAverageMastery(database, studentId, Array.from(topicIds)),
    recentActivityAt: latestStudentActivityAt(database, studentId),
    progress: topicProgress,
    mistakes: database.mistakes
      .filter((mistake) => mistake.user_id === studentId)
      .sort((a, b) => Number(a.mastered) - Number(b.mastered) || b.last_attempt_at.localeCompare(a.last_attempt_at))
      .map((mistake) => toMistakeBookItem(database, mistake))
      .filter((mistake): mistake is MistakeBookItem => Boolean(mistake)),
    recentAttempts,
    assignments,
    messages,
    aiTutor: {
      messageCount7d: aiTutorMessageCountInWindow(database, studentId, Date.now(), 7),
      lastMessageAt: recentTutorMessages[0]?.created_at ?? null,
      recentMessages: recentTutorMessages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at
      }))
    }
  };
}

function buildStudentRewardsData(database: Database, studentId: string): StudentRewardsData {
  return {
    summary: rewardSummaryForStudent(database, studentId),
    earnRules: rewardEarnRules,
    catalog: rewardCatalogFor(database).map(toRewardCatalogItem),
    ledger: database.reward_point_ledger
      .filter((entry) => entry.student_id === studentId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((entry) => toRewardPointLedgerEntry(database, entry)),
    redemptions: database.reward_redemptions
      .filter((redemption) => redemption.student_id === studentId)
      .sort((a, b) => b.requested_at.localeCompare(a.requested_at))
      .map((redemption) => toRewardRedemptionRequest(database, redemption))
  };
}

export async function getStudentRewardsData(studentId: string): Promise<StudentRewardsData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
  if (!user) return null;

  return buildStudentRewardsData(database, studentId);
}

export async function getStudentGamificationSummary(studentId: string): Promise<GamificationSummary | null> {
  const database = await readDatabase();
  return buildGamificationSummaryForDatabase(database, studentId);
}

function parentGuardianLinkRecordsFor(database: Database, user: UserRecord) {
  return database.guardian_links
    .filter((link) => link.status === "active" && (user.role === "admin" || link.parent_id === user.id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function teacherClassesForStudent(database: Database, studentId: string) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.student_id === studentId)
    .map((enrollment) => database.teacher_classes.find((teacherClass) => teacherClass.id === enrollment.class_id))
    .filter((teacherClass): teacherClass is TeacherClassRecord => Boolean(teacherClass));
}

function parentTopicIdsForStudent(database: Database, studentId: string, classes: TeacherClassRecord[]) {
  const profile = studentProfileFor(database, studentId);
  const grades = new Set<GradeId>(classes.map((teacherClass) => teacherClass.grade));
  if (profile?.grade) grades.add(profile.grade);
  return database.topics
    .filter((topic) => grades.has(topic.grade))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((topic) => topic.id);
}

function parentReportsForStudent(database: Database, studentId: string) {
  return database.teacher_reports
    .filter((report) => report.type === "parent-summary" && report.student_id === studentId)
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
    .map((report) => toTeacherReport(report));
}

function parentAssignmentItemsForStudent(database: Database, studentId: string) {
  return database.submissions
    .filter((submission) => submission.student_id === studentId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((submission) => {
      const assignment = database.assignments.find((candidate) => candidate.id === submission.assignment_id);
      const teacherClass = assignment ? database.teacher_classes.find((candidate) => candidate.id === assignment.class_id) : null;
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

function buildParentWeeklyActivity(database: Database, studentId: string, days = 7): WeeklyActivity[] {
  const now = new Date();
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

  database.attempts
    .filter((attempt) => attempt.user_id === studentId && Date.parse(attempt.created_at) >= earliest && Date.parse(attempt.created_at) <= nowTime)
    .forEach((attempt) => {
      const bucket = bucketMap.get(dayKey(attempt.created_at));
      if (!bucket) return;
      if (hasRecordedDuration(attempt.duration_seconds)) bucket.seconds += attempt.duration_seconds;
      else bucket.hasDurationlessStudyActivity = true;
    });

  database.lesson_progress
    .filter((progress) => progress.user_id === studentId && Date.parse(progress.updated_at) >= earliest && Date.parse(progress.updated_at) <= nowTime)
    .forEach((progress) => {
      const bucket = bucketMap.get(dayKey(progress.updated_at));
      if (!bucket) return;
      if (hasRecordedDuration(progress.duration_seconds)) bucket.seconds += progress.duration_seconds;
      else bucket.hasDurationlessStudyActivity = true;
    });

  database.learning_events
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

function buildParentChildSummary(database: Database, studentId: string): ParentChildSummary | null {
  const studentUser = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
  if (!studentUser) return null;

  const student = toAuthenticatedUser(database, studentUser);
  if (!student) return null;

  const now = new Date();
  const classes = teacherClassesForStudent(database, studentId);
  const topicIds = parentTopicIdsForStudent(database, studentId, classes);
  const topicRows = topicIds
    .map((topicId) => {
      const topic = topicRecordForId(database, topicId);
      return topic ? toTopicWithProgress(database, studentId, topic) : null;
    })
    .filter((topic): topic is Topic => Boolean(topic));
  const activeMistakeTopicIds = new Set(
    database.mistakes
      .filter((mistake) => mistake.user_id === studentId && !mistake.mastered)
      .map((mistake) => questionForId(database, mistake.question_id)?.topic_id)
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
  const assignments = parentAssignmentItemsForStudent(database, studentId).slice(0, 6);
  const pendingAssignments = assignments.filter((item) => item.submission.status !== "submitted" && item.submission.status !== "graded").length;
  const rewardSummary = rewardSummaryForStudent(database, studentId);
  const motivationSummary = buildGamificationSummaryForDatabase(database, studentId);
  const latestParentReport = parentReportsForStudent(database, studentId)[0] ?? null;
  const weeklyActivity = buildParentWeeklyActivity(database, studentId, 7);
  const learningMinutes7d = weeklyActivity.reduce((sum, day) => sum + day.minutes, 0);
  const averageMastery = studentAverageMastery(database, studentId, topicIds);
  const latestActivityAt = latestStudentActivityAt(database, studentId);
  const celebrate: LocalizedText[] = [
    strengths[0]
      ? { en: `${strengths[0].title.en} is currently a strength.`, zh: `${strengths[0].title.zh} 目前是強項。` }
      : { en: "Learning signals are starting to build.", zh: "學習訊號正在累積。" },
    rewardSummary.available > 0
      ? { en: `${rewardSummary.available} reward points are ready for teacher-approved gifts.`, zh: `已有 ${rewardSummary.available} 可用積分，可申請教師批核獎品。` }
      : { en: "Small routines this week can unlock more reward points.", zh: "本週保持小習慣可賺取更多積分。" }
  ];
  const support: LocalizedText[] = [
    supportTopics[0]
      ? { en: `Review ${supportTopics[0].title.en} together for 10 minutes.`, zh: `可一起用 10 分鐘重溫 ${supportTopics[0].title.zh}。` }
      : { en: "Ask your child to explain one solved question aloud.", zh: "可請孩子口頭講解一題已完成題目。" },
    pendingAssignments > 0
      ? { en: `${pendingAssignments} recent assignment item needs attention.`, zh: `有 ${pendingAssignments} 項近期作業需要留意。` }
      : { en: "No urgent assignment follow-up in the latest list.", zh: "最近作業列表暫無緊急跟進。" }
  ];

  return {
    student: student.user,
    classes: classes.map((teacherClass) => toTeacherClass(database, teacherClass)),
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

function parentChildSummariesFor(database: Database, user: UserRecord) {
  return parentGuardianLinkRecordsFor(database, user)
    .map((link) => buildParentChildSummary(database, link.student_id))
    .filter((summary): summary is ParentChildSummary => Boolean(summary));
}

function selectedParentChild(database: Database, user: UserRecord, selectedStudentId?: string | null) {
  const children = parentChildSummariesFor(database, user);
  const selectedChild = selectedStudentId
    ? children.find((child) => child.student.id === selectedStudentId) ?? null
    : children[0] ?? null;
  return { children, selectedChild };
}

export async function getParentFoundationData(parentId: string, selectedStudentId?: string | null): Promise<ParentFoundationData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === parentId);
  if (!canUseParentArea(user)) return null;
  const parent = toAuthenticatedUser(database, user);
  if (!parent) return null;

  const links = parentGuardianLinkRecordsFor(database, user).map((link) => toGuardianLink(database, link));
  const { children, selectedChild } = selectedParentChild(database, user, selectedStudentId);
  const linkedStudentIds = new Set(children.map((child) => child.student.id));

  return {
    parent: parent.user,
    children,
    selectedChild,
    links,
    totals: {
      children: children.length,
      activeReports: database.teacher_reports.filter((report) => report.type === "parent-summary" && report.student_id && linkedStudentIds.has(report.student_id)).length,
      openMessages: database.teacher_messages.filter((message) => message.guardian_id === user.id && linkedStudentIds.has(message.student_id) && message.status !== "resolved").length,
      pendingAssignments: children.reduce((sum, child) => {
        return sum + child.assignments.filter((item) => item.submission.status !== "submitted" && item.submission.status !== "graded").length;
      }, 0)
    }
  };
}

export async function getParentChildSummary(parentId: string, studentId: string): Promise<ParentChildSummary | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === parentId);
  if (!canUseParentArea(user) || !parentCanAccessStudentInDatabase(database, parentId, studentId)) return null;
  return buildParentChildSummary(database, studentId);
}

export async function getParentReportData(parentId: string, selectedStudentId?: string | null): Promise<ParentReportData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === parentId);
  if (!canUseParentArea(user)) return null;
  const { children, selectedChild } = selectedParentChild(database, user, selectedStudentId);
  const allowedStudentIds = new Set(children.map((child) => child.student.id));
  const selectedStudentIds = selectedChild ? new Set([selectedChild.student.id]) : allowedStudentIds;

  return {
    generatedAt: new Date().toISOString(),
    children,
    selectedChild,
    reports: database.teacher_reports
      .filter((report) => report.type === "parent-summary" && report.student_id && allowedStudentIds.has(report.student_id) && selectedStudentIds.has(report.student_id))
      .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
      .map((report) => toTeacherReport(report))
  };
}

const parentMessageCategories: ParentMessagesData["categories"] = [
  { id: "learning-support", label: { en: "Learning support", zh: "學習支援" } },
  { id: "homework", label: { en: "Homework", zh: "家課 / 作業" } },
  { id: "wellbeing", label: { en: "Wellbeing", zh: "身心狀態" } },
  { id: "report-question", label: { en: "Report question", zh: "報告查詢" } },
  { id: "logistics", label: { en: "Logistics", zh: "行政安排" } }
];

function parentMessageCategory(value: unknown): ParentMessageCategory {
  return validParentMessageCategories.has(value as ParentMessageCategory) ? (value as ParentMessageCategory) : "learning-support";
}

function buildParentMessageThread(database: Database, thread: TeacherMessageRecord): ParentMessageThread {
  const teacher = database.users.find((candidate) => candidate.id === thread.teacher_id);
  const teacherProfile = studentProfileFor(database, thread.teacher_id);
  const classRecord = thread.class_id ? database.teacher_classes.find((candidate) => candidate.id === thread.class_id) : null;
  return {
    ...toTeacherMessage(database, thread),
    className: classRecord?.name,
    teacherName: teacherProfile?.name ?? teacher?.username ?? "Teacher",
    messages: database.teacher_message_entries
      .filter((entry) => entry.thread_id === thread.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((entry) => toTeacherMessageEntry(database, entry))
  };
}

export async function getParentMessagesData(
  parentId: string,
  selectedStudentId?: string | null,
  selectedThreadId?: string | null
): Promise<ParentMessagesData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === parentId);
  if (!canUseParentArea(user)) return null;
  const { children, selectedChild } = selectedParentChild(database, user, selectedStudentId);
  const selectedStudent = selectedChild?.student.id;
  const allowedStudentIds = new Set(children.map((child) => child.student.id));
  const visibleStudentIds = selectedStudent ? new Set([selectedStudent]) : allowedStudentIds;
  const threads = database.teacher_messages
    .filter((thread) => thread.guardian_id === parentId && allowedStudentIds.has(thread.student_id) && visibleStudentIds.has(thread.student_id))
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
    .map((thread) => buildParentMessageThread(database, thread));
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    children,
    selectedChild,
    threads,
    selectedThread,
    categories: parentMessageCategories,
    reports: selectedStudent ? parentReportsForStudent(database, selectedStudent) : []
  };
}

function firstTeacherClassForParentMessage(database: Database, studentId: string) {
  return teacherClassesForStudent(database, studentId)[0] ?? null;
}

export async function createParentMessageThread({
  parentId,
  studentId,
  category,
  subject,
  body,
  reportId
}: {
  parentId: string;
  studentId: string;
  category?: ParentMessageCategory;
  subject: string;
  body: string;
  reportId?: string | null;
}) {
  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject || !trimmedBody) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const parent = database.users.find((candidate) => candidate.id === parentId);
    if (!canUseParentArea(parent) || !parentCanAccessStudentInDatabase(database, parentId, studentId)) return { status: "forbidden" as const };
    const teacherClass = firstTeacherClassForParentMessage(database, studentId);
    if (!teacherClass) return { status: "not-found" as const };
    const report = reportId
      ? database.teacher_reports.find((candidate) => candidate.id === reportId && candidate.type === "parent-summary" && candidate.student_id === studentId)
      : null;
    const now = new Date().toISOString();
    const thread: TeacherMessageRecord = {
      id: `message-thread-${randomUUID()}`,
      class_id: teacherClass.id,
      student_id: studentId,
      teacher_id: teacherClass.teacher_id,
      guardian_id: parent.id,
      report_id: report?.id,
      parent_category: parentMessageCategory(category),
      subject_en: trimmedSubject,
      subject_zh: trimmedSubject,
      latest_message: trimmedBody,
      status: "unread",
      priority: "normal",
      starred: false,
      last_message_at: now,
      created_at: now
    };
    database.teacher_messages.unshift(thread);
    database.teacher_message_entries.push({
      id: `message-entry-${randomUUID()}`,
      thread_id: thread.id,
      sender_id: parent.id,
      sender_role: "parent",
      recipient_id: teacherClass.teacher_id,
      body: trimmedBody,
      attachments: [],
      created_at: now
    });
    return { status: "created" as const, thread: buildParentMessageThread(database, thread) };
  });
}

export async function replyToParentMessageThread({
  parentId,
  threadId,
  body
}: {
  parentId: string;
  threadId: string;
  body: string;
}) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const parent = database.users.find((candidate) => candidate.id === parentId);
    if (!canUseParentArea(parent)) return { status: "forbidden" as const };
    const thread = database.teacher_messages.find((candidate) => candidate.id === threadId && candidate.guardian_id === parentId);
    if (!thread || !parentCanAccessStudentInDatabase(database, parentId, thread.student_id)) return { status: "not-found" as const };

    const now = new Date().toISOString();
    database.teacher_message_entries.push({
      id: `message-entry-${randomUUID()}`,
      thread_id: thread.id,
      sender_id: parent.id,
      sender_role: "parent",
      recipient_id: thread.teacher_id,
      body: trimmedBody,
      attachments: [],
      created_at: now
    });
    thread.latest_message = trimmedBody;
    thread.status = "unread";
    thread.last_message_at = now;
    return { status: "sent" as const, thread: buildParentMessageThread(database, thread) };
  });
}

export async function linkParentToStudentByInviteCode({
  parentId,
  inviteCode,
  relationship = "guardian"
}: {
  parentId: string;
  inviteCode: string;
  relationship?: GuardianRelationship;
}) {
  const normalizedCode = normalizeInviteCode(inviteCode);
  if (!normalizedCode) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const parent = database.users.find((candidate) => candidate.id === parentId);
    if (!canUseParentArea(parent)) return { status: "forbidden" as const };
    const relationshipValue = validGuardianRelationships.has(relationship) ? relationship : "guardian";
    const existingCodeLink = database.guardian_links.find((link) => normalizeInviteCode(link.invite_code) === normalizedCode);
    const studentId = existingCodeLink?.student_id ??
      database.users.find((candidate) => candidate.role === "student" && guardianInviteCodeForStudent(candidate.id) === normalizedCode)?.id;
    if (!studentId) return { status: "not-found" as const };
    const existingParentLink = database.guardian_links.find((link) => link.parent_id === parent.id && link.student_id === studentId);
    const now = new Date().toISOString();

    if (existingParentLink) {
      existingParentLink.status = "active";
      existingParentLink.relationship = relationshipValue;
      existingParentLink.invite_code = normalizedCode;
      existingParentLink.updated_at = now;
      return { status: "linked" as const, link: toGuardianLink(database, existingParentLink) };
    }

    const link: GuardianLinkRecord = {
      id: `guardian-link-${randomUUID()}`,
      parent_id: parent.id,
      student_id: studentId,
      relationship: relationshipValue,
      status: "active",
      invite_code: normalizedCode,
      created_by: parent.id,
      created_at: now,
      updated_at: now
    };
    database.guardian_links.push(link);
    return { status: "linked" as const, link: toGuardianLink(database, link) };
  });
}

export async function requestRewardRedemption({
  studentId,
  itemId
}: {
  studentId: string;
  itemId: string;
}) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
    if (!user) return { status: "student-not-found" as const };

    const item = rewardCatalogItemFor(database, itemId);
    if (!item || !item.available) return { status: "item-unavailable" as const };

    const summary = rewardSummaryForStudent(database, studentId);
    if (summary.available < item.points_cost) return { status: "insufficient-points" as const, rewards: buildStudentRewardsData(database, studentId) };

    database.reward_redemptions.unshift({
      id: `reward-redemption-${randomUUID()}`,
      student_id: studentId,
      item_id: item.id,
      points_cost: item.points_cost,
      status: "pending",
      requested_at: new Date().toISOString(),
      decided_at: null,
      fulfilled_at: null
    });

    return { status: "created" as const, rewards: buildStudentRewardsData(database, studentId) };
  });
}

export async function getTeacherRewardsData(teacherId: string): Promise<TeacherRewardsData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === teacherId);
  if (!canUseTeacherArea(user)) return null;

  const studentIds = teacherRewardStudentIds(database, user);
  const studentIdSet = new Set(studentIds);
  const nowMs = Date.now();
  const dashboardSummary = teacherRewardDashboardSummary(database, user, nowMs);
  const students = studentIds
    .map((studentId): TeacherRewardsData["students"][number] => {
      const profile = studentProfileFor(database, studentId);
      return {
        studentId,
        studentName: studentNameFor(database, studentId),
        grade: profile?.grade ?? "S3",
        classNames: classNamesForStudent(database, user, studentId),
        summary: rewardSummaryForStudent(database, studentId)
      };
    })
    .sort((a, b) => b.summary.available - a.summary.available || a.studentName.localeCompare(b.studentName));

  return {
    generatedAt: new Date(nowMs).toISOString(),
    totals: {
      students: students.length,
      availablePoints: students.reduce((sum, student) => sum + student.summary.available, 0),
      pendingRedemptions: dashboardSummary.pendingRedemptions,
      approvedRedemptions: dashboardSummary.approvedRedemptions,
      fulfilledRedemptions: database.reward_redemptions.filter((redemption) => studentIdSet.has(redemption.student_id) && redemption.status === "fulfilled").length,
      pointsAwardedThisWeek: dashboardSummary.pointsAwardedThisWeek
    },
    reasonPresets: teacherRewardReasonPresets,
    students,
    catalog: rewardCatalogFor(database).map(toRewardCatalogItem),
    redemptions: database.reward_redemptions
      .filter((redemption) => studentIdSet.has(redemption.student_id))
      .sort((a, b) => {
        const statusRank = { pending: 0, approved: 1, fulfilled: 2, rejected: 3 } satisfies Record<RewardRedemptionStatus, number>;
        return statusRank[a.status] - statusRank[b.status] || b.requested_at.localeCompare(a.requested_at);
      })
      .map((redemption) => toRewardRedemptionRequest(database, redemption)),
    recentLedger: database.reward_point_ledger
      .filter((entry) => studentIdSet.has(entry.student_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 12)
      .map((entry) => toRewardPointLedgerEntry(database, entry))
  };
}

function getTeacherGamificationDataFromDatabase(database: Database, user: UserRecord, classId?: string | null): TeacherGamificationData {
  const classRecords = teacherClassRecordsFor(database, user);
  const classes = classRecords.map((teacherClass) => toTeacherClass(database, teacherClass));
  const selectedClassId = classId && classRecords.some((teacherClass) => teacherClass.id === classId)
    ? classId
    : classRecords[0]?.id ?? null;
  const studentIds = selectedClassId
    ? database.class_enrollments
        .filter((enrollment) => enrollment.class_id === selectedClassId)
        .map((enrollment) => enrollment.student_id)
    : teacherRewardStudentIds(database, user);
  const studentIdSet = new Set(studentIds);
  const leaderboard = leaderboardForStudents(database, studentIds);
  const nowMs = Date.now();
  const weekStartMs = nowMs - 7 * dayMs;
  const recentEvents = database.gamification_events.filter((event) => {
    const createdAt = Date.parse(event.created_at);
    return studentIdSet.has(event.student_id) && Number.isFinite(createdAt) && createdAt >= weekStartMs && createdAt <= nowMs;
  });
  const classIdSet = new Set(classRecords.map((teacherClass) => teacherClass.id));
  const campaigns = database.reward_campaigns
    .filter((campaign) => classIdSet.has(campaign.class_id) && (!selectedClassId || campaign.class_id === selectedClassId))
    .sort((a, b) => {
      const statusRank = { active: 0, draft: 1, paused: 2, ended: 3 } satisfies Record<RewardCampaignStatus, number>;
      return statusRank[a.status] - statusRank[b.status] || b.updated_at.localeCompare(a.updated_at);
    })
    .map(toRewardCampaign);
  const flaggedEvents = recentEvents.filter((event) => event.status === "capped" || event.status === "flagged");

  return {
    generatedAt: new Date(nowMs).toISOString(),
    classes,
    selectedClassId,
    leaderboard,
    campaigns,
    economy: economySummary(),
    antiAbuseAlerts: flaggedEvents.slice(0, 4).map((event) => ({
      en: `${studentNameFor(database, event.student_id)} hit ${event.anti_abuse_flags.join(", ") || "a reward limit"}.`,
      zh: `${studentNameFor(database, event.student_id)} 觸發${event.anti_abuse_flags.join("、") || "獎勵上限"}。`
    })),
    totals: {
      activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
      weeklyXp: recentEvents.reduce((sum, event) => sum + Math.max(0, event.xp), 0),
      weeklyRewardPoints: recentEvents.reduce((sum, event) => sum + Math.max(0, event.reward_points), 0),
      flaggedEvents: flaggedEvents.length
    }
  };
}

export async function getTeacherGamificationData(teacherId: string, classId?: string | null): Promise<TeacherGamificationData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === teacherId);
  if (!canUseTeacherArea(user)) return null;

  return getTeacherGamificationDataFromDatabase(database, user, classId);
}

function cleanLocalizedInput(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ").slice(0, 120) : fallback;
}

export async function createRewardCampaign({
  teacherId,
  classId,
  titleEn,
  titleZh,
  descriptionEn,
  descriptionZh,
  budgetPoints,
  questIds,
  startsAt,
  endsAt
}: {
  teacherId: string;
  classId: string;
  titleEn?: string;
  titleZh?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  budgetPoints: number;
  questIds: string[];
  startsAt?: string;
  endsAt?: string;
}) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
    const classRecord = teacherClassRecordsFor(database, user).find((candidate) => candidate.id === classId);
    if (!classRecord) return { status: "class-not-found" as const };

    const cleanBudget = Math.max(0, Math.round(Number(budgetPoints) || 0));
    if (cleanBudget < 100 || cleanBudget > 20000) return { status: "invalid" as const };
    const validQuestIds = questIds.filter((questId) => dailyQuestDefinitions.some((quest) => quest.id === questId));
    const now = new Date().toISOString();
    const start = startsAt && !Number.isNaN(Date.parse(startsAt)) ? new Date(startsAt).toISOString() : now;
    const end = endsAt && !Number.isNaN(Date.parse(endsAt)) ? new Date(endsAt).toISOString() : new Date(Date.parse(start) + 7 * dayMs).toISOString();
    if (Date.parse(end) <= Date.parse(start)) return { status: "invalid" as const };

    database.reward_campaigns.unshift({
      id: `campaign-${randomUUID()}`,
      teacher_id: teacherId,
      class_id: classRecord.id,
      title_en: cleanLocalizedInput(titleEn, "Class motivation campaign"),
      title_zh: cleanLocalizedInput(titleZh, "班級激勵活動"),
      description_en: cleanLocalizedInput(descriptionEn, "Reward steady learning routines across the class."),
      description_zh: cleanLocalizedInput(descriptionZh, "獎勵全班穩定學習習慣。"),
      status: "active",
      budget_points: cleanBudget,
      awarded_points: 0,
      quest_ids: validQuestIds.length ? validQuestIds : dailyQuestDefinitions.map((quest) => quest.id),
      starts_at: start,
      ends_at: end,
      created_at: now,
      updated_at: now
    });

    return { status: "created" as const, gamification: getTeacherGamificationDataFromDatabase(database, user, classRecord.id) };
  });
}

export async function updateRewardCampaign({
  teacherId,
  campaignId,
  status,
  budgetPoints
}: {
  teacherId: string;
  campaignId: string;
  status?: RewardCampaignStatus;
  budgetPoints?: number;
}) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
    const campaign = database.reward_campaigns.find((candidate) => candidate.id === campaignId);
    const classRecord = campaign ? teacherClassRecordsFor(database, user).find((candidate) => candidate.id === campaign.class_id) : null;
    if (!campaign || !classRecord) return { status: "not-found" as const };
    if (status && !validRewardCampaignStatuses.has(status)) return { status: "invalid" as const };

    if (typeof budgetPoints === "number") {
      const cleanBudget = Math.max(0, Math.round(Number(budgetPoints) || 0));
      if (cleanBudget < campaign.awarded_points || cleanBudget > 20000) return { status: "invalid" as const };
      campaign.budget_points = cleanBudget;
    }
    if (status) campaign.status = status;
    campaign.updated_at = new Date().toISOString();

    return { status: "updated" as const, gamification: getTeacherGamificationDataFromDatabase(database, user, classRecord.id) };
  });
}

export async function awardTeacherRewardPoints({
  teacherId,
  studentId,
  amount,
  reasonPresetId,
  note
}: {
  teacherId: string;
  studentId: string;
  amount: number;
  reasonPresetId: string;
  note?: string;
}) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
    if (!teacherCanAccessRewardStudent(database, user, studentId)) return { status: "student-not-found" as const };

    const cleanAmount = Math.round(Number(amount));
    if (!Number.isFinite(cleanAmount) || cleanAmount < 1 || cleanAmount > 500) return { status: "invalid" as const };

    const preset = teacherRewardReasonPresets.find((candidate) => candidate.id === reasonPresetId) ?? teacherRewardReasonPresets[0];
    const cleanNote = note?.trim().replace(/\s+/g, " ").slice(0, 180);
    const now = new Date().toISOString();
    const sourceKey = `teacher-award:${teacherId}:${studentId}:${now}:${randomUUID()}`;
    const label = {
      en: `Teacher bonus: ${preset.label.en}`,
      zh: `教師獎勵：${preset.label.zh}`
    };
    const decision = recordGamificationEventOnce(database, {
      studentId,
      source: "teacher-award",
      sourceKey,
      label,
      rewardPoints: cleanAmount,
      createdAt: now
    });
    if (!decision.allowed || decision.appliedRewardPoints < cleanAmount) {
      return { status: "capped" as const, rewards: getTeacherRewardsDataFromDatabase(database, user) };
    }

    database.reward_point_ledger.unshift({
      id: `reward-ledger-${randomUUID()}`,
      student_id: studentId,
      amount: cleanAmount,
      reason: "teacher-award",
      label_en: label.en,
      label_zh: label.zh,
      note: cleanNote || undefined,
      awarded_by: teacherId,
      source_key: sourceKey,
      created_at: now
    });

    return { status: "awarded" as const, rewards: getTeacherRewardsDataFromDatabase(database, user) };
  });
}

function getTeacherRewardsDataFromDatabase(database: Database, user: UserRecord): TeacherRewardsData {
  const studentIds = teacherRewardStudentIds(database, user);
  const studentIdSet = new Set(studentIds);
  const nowMs = Date.now();
  const dashboardSummary = teacherRewardDashboardSummary(database, user, nowMs);
  const students = studentIds
    .map((studentId): TeacherRewardsData["students"][number] => {
      const profile = studentProfileFor(database, studentId);
      return {
        studentId,
        studentName: studentNameFor(database, studentId),
        grade: profile?.grade ?? "S3",
        classNames: classNamesForStudent(database, user, studentId),
        summary: rewardSummaryForStudent(database, studentId)
      };
    })
    .sort((a, b) => b.summary.available - a.summary.available || a.studentName.localeCompare(b.studentName));

  return {
    generatedAt: new Date(nowMs).toISOString(),
    totals: {
      students: students.length,
      availablePoints: students.reduce((sum, student) => sum + student.summary.available, 0),
      pendingRedemptions: dashboardSummary.pendingRedemptions,
      approvedRedemptions: dashboardSummary.approvedRedemptions,
      fulfilledRedemptions: database.reward_redemptions.filter((redemption) => studentIdSet.has(redemption.student_id) && redemption.status === "fulfilled").length,
      pointsAwardedThisWeek: dashboardSummary.pointsAwardedThisWeek
    },
    reasonPresets: teacherRewardReasonPresets,
    students,
    catalog: rewardCatalogFor(database).map(toRewardCatalogItem),
    redemptions: database.reward_redemptions
      .filter((redemption) => studentIdSet.has(redemption.student_id))
      .sort((a, b) => {
        const statusRank = { pending: 0, approved: 1, fulfilled: 2, rejected: 3 } satisfies Record<RewardRedemptionStatus, number>;
        return statusRank[a.status] - statusRank[b.status] || b.requested_at.localeCompare(a.requested_at);
      })
      .map((redemption) => toRewardRedemptionRequest(database, redemption)),
    recentLedger: database.reward_point_ledger
      .filter((entry) => studentIdSet.has(entry.student_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 12)
      .map((entry) => toRewardPointLedgerEntry(database, entry))
  };
}

export async function updateTeacherRewardRedemption({
  teacherId,
  requestId,
  status,
  teacherNote
}: {
  teacherId: string;
  requestId: string;
  status: RewardRedemptionStatus;
  teacherNote?: string;
}) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const redemption = database.reward_redemptions.find((candidate) => candidate.id === requestId);
    if (!redemption || !teacherCanAccessRewardStudent(database, user, redemption.student_id)) return { status: "not-found" as const };
    if (status === "pending" || !validRewardRedemptionStatuses.has(status)) return { status: "invalid" as const };

    const now = new Date().toISOString();
    const cleanNote = teacherNote?.trim().replace(/\s+/g, " ").slice(0, 180);

    if (status === "approved") {
      if (redemption.status !== "pending") return { status: "invalid-transition" as const };
      redemption.status = "approved";
      redemption.decided_at = now;
      redemption.decided_by = teacherId;
      redemption.teacher_note = cleanNote || redemption.teacher_note;
      return { status: "updated" as const, rewards: getTeacherRewardsDataFromDatabase(database, user) };
    }

    if (status === "rejected") {
      if (redemption.status !== "pending" && redemption.status !== "approved") return { status: "invalid-transition" as const };
      redemption.status = "rejected";
      redemption.decided_at = now;
      redemption.fulfilled_at = null;
      redemption.decided_by = teacherId;
      redemption.teacher_note = cleanNote || redemption.teacher_note;
      return { status: "updated" as const, rewards: getTeacherRewardsDataFromDatabase(database, user) };
    }

    if (redemption.status !== "approved") return { status: "invalid-transition" as const };

    const summary = rewardSummaryForStudent(database, redemption.student_id);
    if (summary.balance < redemption.points_cost) return { status: "insufficient-points" as const };

    redemption.status = "fulfilled";
    redemption.decided_at = redemption.decided_at ?? now;
    redemption.fulfilled_at = now;
    redemption.decided_by = teacherId;
    redemption.teacher_note = cleanNote || redemption.teacher_note;

    if (!database.reward_point_ledger.some((entry) => entry.redemption_id === redemption.id && entry.reason === "redemption-spent")) {
      const item = rewardCatalogItemFor(database, redemption.item_id);
      database.reward_point_ledger.unshift({
        id: `reward-ledger-${randomUUID()}`,
        student_id: redemption.student_id,
        amount: -redemption.points_cost,
        reason: "redemption-spent",
        label_en: `Redeemed ${item?.name_en ?? "reward"}`,
        label_zh: `兌換${item?.name_zh ?? "獎品"}`,
        redemption_id: redemption.id,
        awarded_by: teacherId,
        created_at: now
      });
    }

    return { status: "updated" as const, rewards: getTeacherRewardsDataFromDatabase(database, user) };
  });
}

export async function getTeacherAssignments(userId: string): Promise<Assignment[] | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
  return database.assignments
    .filter((assignment) => classIds.has(assignment.class_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((assignment) => toAssignment(database, assignment));
}

function teacherResourceRecordsFor(database: Database, user: UserRecord) {
  return database.teaching_resources.filter((resource) => user.role === "admin" || resource.uploaded_by === user.id);
}

function teacherAssessmentRecordsFor(database: Database, user: UserRecord) {
  const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
  return database.assessments.filter((assessment) => classIds.has(assessment.class_id));
}

function fileExtensionFor(fileName: string) {
  const extension = path.extname(fileName).replace(".", "").toLowerCase();
  return extension === "jpeg" ? "jpg" : extension;
}

function inferResourceTypeFromFile(fileName: string): TeachingResourceType {
  const extension = fileExtensionFor(fileName);
  if (extension === "pptx") return "slides";
  if (extension === "pdf") return "exam-paper";
  if (extension === "docx") return "worksheet";
  if (["png", "jpg", "webp"].includes(extension)) return "image";
  return "document";
}

function safeUploadFileName(fileName: string) {
  const baseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  return baseName || "resource-upload";
}

function topicOptionFor(record: TopicRecord) {
  return {
    id: record.id,
    grade: record.grade,
    title: {
      en: record.title_en,
      zh: record.title_zh
    }
  };
}

function teacherQuestionOption(database: Database, question: QuestionRecord) {
  return {
    id: question.id,
    grade: question.grade,
    topicId: question.topic_id,
    topicTitle: topicLabelFor(database, question),
    difficulty: question.difficulty,
    prompt: {
      en: question.prompt_en,
      zh: question.prompt_zh
    }
  };
}

export async function getTeacherResourceLibraryData(userId: string): Promise<TeacherResourceLibraryData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const nowMs = Date.now();
  const resources = teacherResourceRecordsFor(database, user)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((resource) => toTeachingResource(database, resource));
  const curriculumProfile = curriculumProfileForUser(database, user.id);
  const topicOptions = database.topics
    .filter((topic) => isCurriculumTopic(topic, curriculumProfile))
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.sort_order - b.sort_order)
    .map(topicOptionFor);

  return {
    generatedAt: new Date(nowMs).toISOString(),
    resources,
    topicOptions,
    totals: {
      resources: resources.length,
      uploadedThisWeek: resources.filter((resource) => isWithinDays(resource.createdAt, nowMs, 7)).length,
      assignmentReferences: resources.reduce((sum, resource) => sum + resource.referenceCounts.assignments, 0),
      assessmentReferences: resources.reduce((sum, resource) => sum + resource.referenceCounts.assessments, 0)
    }
  };
}

export async function createTeacherResource({
  teacherId,
  title,
  grade,
  topicId,
  difficulty,
  type,
  file
}: {
  teacherId: string;
  title: string;
  grade: GradeId;
  topicId?: string | null;
  difficulty?: Difficulty | null;
  type?: TeachingResourceType | null;
  file: {
    name: string;
    type: string;
    size: number;
    bytes: Uint8Array;
  };
}) {
  const trimmedTitle = title.trim();
  const extension = fileExtensionFor(file.name);
  if (!trimmedTitle || !validGrades.has(grade) || !acceptedTeacherResourceExtensions.has(extension) || file.size <= 0) {
    return { status: "invalid" as const };
  }
  const resourceType = type && validTeachingResourceTypes.has(type) ? type : inferResourceTypeFromFile(file.name);

  return mutateDatabase(async (database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const curriculumProfile = curriculumProfileForUser(database, user.id);
    const cleanTopicId =
      topicId && database.topics.some((topic) => isCurriculumTopic(topic, curriculumProfile) && topic.id === topicId && topic.grade === grade)
        ? topicId
        : undefined;
    const cleanDifficulty = difficulty && validDifficulties.has(difficulty) ? difficulty : undefined;
    const now = new Date().toISOString();
    const resourceId = `resource-${randomUUID()}`;
    const storedFileName = `${resourceId}-${safeUploadFileName(file.name)}`;
    const storagePath = path.join(teacherResourceUploadDirectory, storedFileName);

    await mkdir(teacherResourceUploadDirectory, { recursive: true });
    await writeFile(storagePath, Buffer.from(file.bytes));

    const record: TeachingResourceRecord = {
      id: resourceId,
      title_en: trimmedTitle,
      title_zh: trimmedTitle,
      type: resourceType,
      file_name: safeUploadFileName(file.name),
      file_type: extension.toUpperCase(),
      mime_type: file.type,
      file_size_bytes: file.size,
      storage_path: storagePath,
      grade,
      topic_id: cleanTopicId,
      difficulty: cleanDifficulty,
      uploaded_by: user.id,
      created_at: now
    };
    database.teaching_resources.unshift(record);

    return { status: "created" as const, resource: toTeachingResource(database, record) };
  });
}

async function resourceDownloadPayload(database: Database, record: TeachingResourceRecord) {
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
      resource: toTeachingResource(database, record),
      bytes: Buffer.from(body, "utf8"),
      mimeType: "text/plain; charset=utf-8",
      fileName: record.file_name.replace(/\.[^.]+$/, ".txt")
    };
  }

  if (!record.storage_path) return null;

  try {
    return {
      resource: toTeachingResource(database, record),
      bytes: await readFile(record.storage_path),
      mimeType: record.mime_type || "application/octet-stream",
      fileName: record.file_name
    };
  } catch {
    return null;
  }
}

export async function getTeacherResourceDownloadData(userId: string, resourceId: string) {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const record = teacherResourceRecordsFor(database, user).find((resource) => resource.id === resourceId);
  return record ? resourceDownloadPayload(database, record) : null;
}

function studentResourceAssignmentItem(database: Database, userId: string, resourceId: string) {
  const submission = database.submissions.find((candidate) => {
    if (candidate.student_id !== userId) return false;
    const assignment = database.assignments.find((item) => item.id === candidate.assignment_id);
    return assignment?.content_type === "resource" && assignment.target_id === resourceId;
  });
  if (!submission) return null;
  const assignment = database.assignments.find((candidate) => candidate.id === submission.assignment_id);
  const teacherClass = assignment ? database.teacher_classes.find((candidate) => candidate.id === assignment.class_id) : null;
  if (!assignment || !teacherClass) return null;

  return {
    assignment: toAssignment(database, assignment),
    submission: toSubmission(database, submission),
    className: teacherClass.name,
    classGrade: teacherClass.grade
  };
}

function studentCanAccessResource(database: Database, userId: string, resourceId: string) {
  if (studentResourceAssignmentItem(database, userId, resourceId)) return true;
  const classIds = studentClassIds(database, userId);
  return database.assessments.some(
    (assessment) => classIds.has(assessment.class_id) && assessment.source_resource_id === resourceId
  );
}

export async function getStudentResourceDetailData(userId: string, resourceId: string): Promise<StudentResourceDetailData | null> {
  const database = await readDatabase();
  const record = database.teaching_resources.find((resource) => resource.id === resourceId);
  if (!record || !studentCanAccessResource(database, userId, resourceId)) return null;

  return {
    resource: toTeachingResource(database, record),
    assignment: studentResourceAssignmentItem(database, userId, resourceId),
    downloadUrl: `/api/resources/${encodeURIComponent(resourceId)}/download`,
    canMarkComplete: Boolean(studentResourceAssignmentItem(database, userId, resourceId))
  };
}

export async function getStudentResourceDownloadData(userId: string, resourceId: string) {
  const database = await readDatabase();
  const record = database.teaching_resources.find((resource) => resource.id === resourceId);
  if (!record || !studentCanAccessResource(database, userId, resourceId)) return null;
  return resourceDownloadPayload(database, record);
}

export async function markStudentResourceViewed(userId: string, resourceId: string) {
  return mutateDatabase((database) => {
    const record = database.teaching_resources.find((resource) => resource.id === resourceId);
    if (!record || !studentCanAccessResource(database, userId, resourceId)) return { status: "not-found" as const };

    const now = new Date().toISOString();
    completeMatchingAssignments({
      database,
      userId,
      contentType: "resource",
      targetIds: [resourceId],
      now,
      score: 100,
      graded: true,
      feedbackEn: "Resource opened by the student.",
      feedbackZh: "學生已開啟指定資源。"
    });

    return { status: "viewed" as const, resource: toTeachingResource(database, record) };
  });
}

export async function getTeacherAssessmentCreateData(userId: string): Promise<TeacherAssessmentCreateData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const classGrades = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.grade));
  const curriculumProfile = curriculumProfileForUser(database, user.id);
  return {
    classes: teacherClassRecordsFor(database, user).map((teacherClass) => toTeacherClass(database, teacherClass)),
    resources: teacherResourceRecordsFor(database, user)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((resource) => toTeachingResource(database, resource)),
    questionBank: database.questions
      .filter((question) => isCurriculumQuestion(question, curriculumProfile) && classGrades.has(question.grade))
      .slice(0, 80)
      .map((question) => teacherQuestionOption(database, question))
  };
}

export async function getTeacherAssessmentListData(userId: string): Promise<TeacherAssessmentListData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const assessmentRecords = teacherAssessmentRecordsFor(database, user).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const assessments = assessmentRecords.map((assessment) => toAssessment(database, assessment));
  const scoredSubmissions = database.assessment_submissions.filter((submission) => {
    return assessmentRecords.some((assessment) => assessment.id === submission.assessment_id) && submission.score !== null && submission.max_score > 0;
  });
  const averageScore = scoredSubmissions.length
    ? Math.round(
        scoredSubmissions.reduce((sum, submission) => sum + ((submission.score ?? 0) / submission.max_score) * 100, 0) /
          scoredSubmissions.length
      )
    : null;

  return {
    generatedAt: new Date().toISOString(),
    classes: teacherClassRecordsFor(database, user).map((teacherClass) => toTeacherClass(database, teacherClass)),
    assessments,
    totals: {
      assessments: assessments.length,
      openAssessments: assessments.filter((assessment) => assessment.status === "open" || assessment.status === "scheduled").length,
      submittedCount: assessments.reduce((sum, assessment) => sum + assessment.submittedCount, 0),
      averageScore
    }
  };
}

function assessmentQuestionIdsForSource(
  database: Database,
  assessmentClass: TeacherClassRecord,
  sourceType: AssessmentSourceType,
  questionIds: string[],
  sourceResource?: TeachingResourceRecord | null
) {
  const curriculumProfile = curriculumProfileForClass(database, assessmentClass);
  if (sourceType === "question-bank") {
    const selectedIds = questionIds.filter((questionId) => {
      const question = questionForId(database, questionId);
      return Boolean(question && question.grade === assessmentClass.grade && isCurriculumQuestion(question, curriculumProfile));
    });
    if (selectedIds.length) return selectedIds;
  }

  if (sourceType === "mistake-generated") {
    const studentIds = new Set(teacherStudentIdsForClass(database, assessmentClass.id));
    const mistakeQuestionIds = database.mistakes
      .filter((mistake) => studentIds.has(mistake.user_id) && !mistake.mastered)
      .map((mistake) => mistake.question_id)
      .filter((questionId) => {
        const question = questionForId(database, questionId);
        return Boolean(question && isCurriculumQuestion(question, curriculumProfile));
      })
      .filter((questionId, index, all) => all.indexOf(questionId) === index);
    if (mistakeQuestionIds.length) return mistakeQuestionIds.slice(0, 8);
  }

  if (sourceType === "resource" && sourceResource?.topic_id) {
    const resourceTopicQuestions = database.questions
      .filter((question) => isCurriculumQuestion(question, curriculumProfile) && question.grade === assessmentClass.grade && question.topic_id === sourceResource.topic_id)
      .map((question) => question.id);
    if (resourceTopicQuestions.length) return resourceTopicQuestions.slice(0, 8);
  }

  return database.questions
    .filter((question) => isCurriculumQuestion(question, curriculumProfile) && question.grade === assessmentClass.grade)
    .slice(0, 5)
    .map((question) => question.id);
}

function normalizeManualQuestions(value: AssessmentManualQuestion[] | undefined): AssessmentManualQuestion[] {
  return (value ?? [])
    .map((question, index) => {
      const promptEn = question.prompt?.en?.trim() ?? "";
      const promptZh = question.prompt?.zh?.trim() || promptEn;
      const answer = question.answer?.trim() ?? "";
      const points = Number.isFinite(question.points) && question.points > 0 ? Math.round(question.points) : 10;
      if (!promptEn || !answer) return null;
      return {
        id: question.id || `manual-${index + 1}`,
        prompt: { en: promptEn, zh: promptZh },
        answer,
        points
      };
    })
    .filter((question): question is AssessmentManualQuestion => Boolean(question));
}

export async function createTeacherAssessment({
  teacherId,
  classId,
  title,
  type,
  sourceType,
  sourceResourceId,
  questionIds,
  manualQuestions,
  opensAt,
  closesAt,
  timeLimitMinutes,
  maxAttempts,
  randomizeQuestionOrder,
  showAnswersImmediately,
  gradeWeight
}: {
  teacherId: string;
  classId: string;
  title: string;
  type: AssessmentType;
  sourceType: AssessmentSourceType;
  sourceResourceId?: string | null;
  questionIds?: string[];
  manualQuestions?: AssessmentManualQuestion[];
  opensAt?: string | null;
  closesAt?: string | null;
  timeLimitMinutes?: number | null;
  maxAttempts?: number | null;
  randomizeQuestionOrder: boolean;
  showAnswersImmediately: boolean;
  gradeWeight?: number | null;
}) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || !validAssessmentTypes.has(type) || !validAssessmentSourceTypes.has(sourceType)) {
    return { status: "invalid" as const };
  }

  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const teacherClass = teacherCanAccessClass(database, user, classId);
    if (!teacherClass) return { status: "not-found" as const };

    const resource =
      sourceResourceId && sourceType === "resource"
        ? teacherResourceRecordsFor(database, user).find((candidate) => candidate.id === sourceResourceId)
        : null;
    if (sourceType === "resource" && !resource) return { status: "resource-not-found" as const };

    const normalizedManualQuestions = normalizeManualQuestions(manualQuestions);
    const normalizedQuestionIds =
      sourceType === "manual"
        ? []
        : assessmentQuestionIdsForSource(database, teacherClass, sourceType, questionIds ?? [], resource);
    if (sourceType === "manual" && !normalizedManualQuestions.length) return { status: "invalid" as const };

    const now = new Date().toISOString();
    const assessmentId = `assessment-${randomUUID()}`;
    const record: AssessmentRecord = {
      id: assessmentId,
      class_id: classId,
      title_en: trimmedTitle,
      title_zh: trimmedTitle,
      type,
      status: opensAt ? "scheduled" : "open",
      source_type: sourceType,
      source_resource_id: sourceType === "resource" ? resource?.id : undefined,
      question_ids: normalizedQuestionIds,
      manual_questions: normalizedManualQuestions,
      opens_at: opensAt ? new Date(opensAt).toISOString() : null,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      time_limit_minutes:
        typeof timeLimitMinutes === "number" && Number.isFinite(timeLimitMinutes) && timeLimitMinutes > 0
          ? Math.round(timeLimitMinutes)
          : null,
      max_attempts: typeof maxAttempts === "number" && Number.isFinite(maxAttempts) && maxAttempts > 0 ? Math.round(maxAttempts) : 1,
      randomize_question_order: randomizeQuestionOrder,
      show_answers_immediately: showAnswersImmediately,
      grade_weight:
        typeof gradeWeight === "number" && Number.isFinite(gradeWeight) && gradeWeight >= 0
          ? Math.round(gradeWeight)
          : 10,
      created_by: user.id,
      created_at: now,
      updated_at: now
    };

    database.assessments.unshift(record);
    teacherStudentIdsForClass(database, classId).forEach((studentId) => {
      database.assessment_submissions.push({
        id: `assessment-submission-${randomUUID()}`,
        assessment_id: assessmentId,
        student_id: studentId,
        status: "not-started",
        attempt_number: 0,
        score: null,
        max_score: 100,
        submitted_at: null,
        graded_at: null,
        answers: [],
        updated_at: now
      });
    });

    return { status: "created" as const, assessment: toAssessment(database, record) };
  });
}

function assessmentQuestionPrompt(database: Database, assessment: AssessmentRecord, questionId: string): LocalizedText {
  const manualQuestion = assessment.manual_questions.find((question) => question.id === questionId);
  if (manualQuestion) return manualQuestion.prompt;

  const question = questionForId(database, questionId);
  return question
    ? { en: question.prompt_en, zh: question.prompt_zh }
    : { en: questionId, zh: questionId };
}

function assessmentQuestionIds(assessment: AssessmentRecord) {
  return [
    ...assessment.question_ids,
    ...assessment.manual_questions.map((question) => question.id)
  ];
}

function buildAssessmentScoreDistribution(submissions: AssessmentSubmission[]): TeacherAssessmentScoreBucket[] {
  const buckets: TeacherAssessmentScoreBucket[] = [
    { label: "0-49", min: 0, max: 49, count: 0 },
    { label: "50-59", min: 50, max: 59, count: 0 },
    { label: "60-69", min: 60, max: 69, count: 0 },
    { label: "70-79", min: 70, max: 79, count: 0 },
    { label: "80-100", min: 80, max: 100, count: 0 }
  ];

  submissions.forEach((submission) => {
    if (submission.score === null || submission.maxScore <= 0) return;
    const percentage = Math.round((submission.score / submission.maxScore) * 100);
    const bucket = buckets.find((candidate) => percentage >= candidate.min && percentage <= candidate.max);
    if (bucket) bucket.count += 1;
  });

  return buckets;
}

function buildAssessmentQuestionAnalytics(
  database: Database,
  assessment: AssessmentRecord,
  submissions: AssessmentSubmission[]
): TeacherAssessmentQuestionAnalytics[] {
  return assessmentQuestionIds(assessment).map((questionId) => {
    const answers = submissions
      .flatMap((submission) => submission.answers)
      .filter((answer) => answer.questionId === questionId && answer.isCorrect !== null);
    const correctCount = answers.filter((answer) => answer.isCorrect).length;
    const wrongAnswers = answers.filter((answer) => answer.isCorrect === false);
    const wrongCounts = new Map<string, number>();
    wrongAnswers.forEach((answer) => {
      wrongCounts.set(answer.answer, (wrongCounts.get(answer.answer) ?? 0) + 1);
    });
    const commonWrongAnswer = Array.from(wrongCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      questionId,
      prompt: assessmentQuestionPrompt(database, assessment, questionId),
      correctRate: answers.length ? percent(correctCount, answers.length) : null,
      correctCount,
      totalResponses: answers.length,
      commonWrongAnswer
    };
  });
}

export async function getTeacherAssessmentDetailData(userId: string, assessmentId: string): Promise<TeacherAssessmentDetailData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const assessment = database.assessments.find((candidate) => candidate.id === assessmentId);
  const teacherClass = assessment ? teacherCanAccessClass(database, user, assessment.class_id) : null;
  if (!assessment || !teacherClass) return null;

  const submissions = database.assessment_submissions
    .filter((submission) => submission.assessment_id === assessmentId)
    .sort((a, b) => {
      const aName = studentProfileFor(database, a.student_id)?.name ?? "";
      const bName = studentProfileFor(database, b.student_id)?.name ?? "";
      return aName.localeCompare(bName);
    })
    .map((submission) => toAssessmentSubmission(database, submission));
  const scoredSubmissions = submissions.filter((submission) => submission.score !== null && submission.maxScore > 0);
  const averageScore = scoredSubmissions.length
    ? Math.round(scoredSubmissions.reduce((sum, submission) => sum + ((submission.score ?? 0) / submission.maxScore) * 100, 0) / scoredSubmissions.length)
    : null;
  const questionAnalytics = buildAssessmentQuestionAnalytics(database, assessment, submissions);

  return {
    assessment: toAssessment(database, assessment),
    class: toTeacherClass(database, teacherClass),
    sourceResource: assessment.source_resource_id
      ? database.teaching_resources
          .filter((resource) => resource.id === assessment.source_resource_id)
          .map((resource) => toTeachingResource(database, resource))[0] ?? null
      : null,
    submissions,
    averageScore,
    submittedCount: submissions.filter((submission) => submission.status === "submitted" || submission.status === "graded" || submission.status === "late").length,
    scoreDistribution: buildAssessmentScoreDistribution(submissions),
    questionAnalytics,
    commonWrongQuestions: questionAnalytics
      .filter((question) => question.totalResponses > 0 && question.correctRate !== null)
      .sort((a, b) => (a.correctRate ?? 100) - (b.correctRate ?? 100))
      .slice(0, 5)
  };
}

function csvCell(value: string | number | null | undefined) {
  const text = value === null || typeof value === "undefined" ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export async function getTeacherAssessmentCsv(userId: string, assessmentId: string) {
  const detail = await getTeacherAssessmentDetailData(userId, assessmentId);
  if (!detail) return null;

  const rows = [
    ["Student", "Status", "Attempt", "Score", "Max score", "Percentage", "Submitted at", "Graded at"],
    ...detail.submissions.map((submission) => [
      submission.studentName,
      submission.status,
      submission.attemptNumber,
      submission.score ?? "",
      submission.maxScore,
      submission.score === null || submission.maxScore <= 0 ? "" : Math.round((submission.score / submission.maxScore) * 100),
      submission.submittedAt ?? "",
      submission.gradedAt ?? ""
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function assessmentQuestionMaxPoints(assessment: AssessmentRecord, questionId: string, totalQuestionCount: number) {
  const manualQuestion = assessment.manual_questions.find((question) => question.id === questionId);
  if (manualQuestion) return manualQuestion.points;
  return Math.max(1, Math.round(100 / Math.max(1, totalQuestionCount)));
}

function assessmentQuestionForStudent(database: Database, assessment: AssessmentRecord, questionId: string): StudentAssessmentQuestion | null {
  const manualQuestion = assessment.manual_questions.find((question) => question.id === questionId);
  const questionIds = assessmentQuestionIds(assessment);
  const maxPoints = assessmentQuestionMaxPoints(assessment, questionId, questionIds.length);
  if (manualQuestion) {
    return {
      id: manualQuestion.id,
      prompt: manualQuestion.prompt,
      type: "manual",
      maxPoints
    };
  }

  const question = questionForId(database, questionId);
  if (!question) return null;

  return {
    id: question.id,
    prompt: { en: question.prompt_en, zh: question.prompt_zh },
    type: question.type,
    options: question.options ?? undefined,
    maxPoints,
    topicId: question.topic_id,
    difficulty: question.difficulty
  };
}

function assessmentAvailability(assessment: AssessmentRecord, nowMs = Date.now()) {
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

function studentAssessmentAssignmentItem(database: Database, userId: string, assessmentId: string) {
  const submission = database.submissions.find((candidate) => {
    if (candidate.student_id !== userId) return false;
    const assignment = database.assignments.find((item) => item.id === candidate.assignment_id);
    return assignment?.content_type === "assessment" && assignment.target_id === assessmentId;
  });
  if (!submission) return null;
  const assignment = database.assignments.find((candidate) => candidate.id === submission.assignment_id);
  const teacherClass = assignment ? database.teacher_classes.find((candidate) => candidate.id === assignment.class_id) : null;
  if (!assignment || !teacherClass) return null;
  return {
    assignment: toAssignment(database, assignment),
    submission: toSubmission(database, submission),
    className: teacherClass.name,
    classGrade: teacherClass.grade
  };
}

export async function getStudentAssessmentDetailData(userId: string, assessmentId: string): Promise<StudentAssessmentDetailData | null> {
  const database = await readDatabase();
  const assessment = database.assessments.find((candidate) => candidate.id === assessmentId);
  if (!assessment) return null;

  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === assessment.class_id);
  const enrolled = database.class_enrollments.some((enrollment) => enrollment.class_id === assessment.class_id && enrollment.student_id === userId);
  if (!teacherClass || !enrolled) return null;

  let submission = database.assessment_submissions.find(
    (candidate) => candidate.assessment_id === assessmentId && candidate.student_id === userId
  );
  if (!submission) {
    const now = new Date().toISOString();
    submission = {
      id: `assessment-submission-${randomUUID()}`,
      assessment_id: assessment.id,
      student_id: userId,
      status: "not-started",
      attempt_number: 0,
      score: null,
      max_score: 100,
      submitted_at: null,
      graded_at: null,
      answers: [],
      updated_at: now
    };
    await mutateDatabase((mutable) => {
      if (!mutable.assessment_submissions.some((candidate) => candidate.id === submission?.id)) {
        mutable.assessment_submissions.push(submission as AssessmentSubmissionRecord);
      }
    });
  }

  const availability = assessmentAvailability(assessment);
  const maxAttemptsReached = submission.attempt_number >= assessment.max_attempts && isAssessmentSubmissionComplete(submission);
  const questions = assessmentQuestionIds(assessment)
    .map((questionId) => assessmentQuestionForStudent(database, assessment, questionId))
    .filter((question): question is StudentAssessmentQuestion => Boolean(question));

  return {
    assessment: toAssessment(database, assessment),
    className: teacherClass.name,
    questions,
    submission: toAssessmentSubmission(database, submission),
    assignment: studentAssessmentAssignmentItem(database, userId, assessmentId),
    canSubmit: availability.canSubmit && !maxAttemptsReached,
    unavailableReason: maxAttemptsReached
      ? { en: "Maximum attempts reached.", zh: "已達可嘗試次數上限。" }
      : availability.unavailableReason
  };
}

function isAssessmentSubmissionComplete(submission: AssessmentSubmissionRecord) {
  return submission.status === "submitted" || submission.status === "graded" || submission.status === "late";
}

export async function submitStudentAssessment({
  userId,
  assessmentId,
  answers
}: {
  userId: string;
  assessmentId: string;
  answers: Array<{ questionId: string; answer: string }>;
}) {
  return mutateDatabase((database) => {
    const assessment = database.assessments.find((candidate) => candidate.id === assessmentId);
    if (!assessment) return { status: "not-found" as const };
    const enrolled = database.class_enrollments.some((enrollment) => enrollment.class_id === assessment.class_id && enrollment.student_id === userId);
    if (!enrolled) return { status: "forbidden" as const };

    const availability = assessmentAvailability(assessment);
    if (!availability.canSubmit) return { status: "closed" as const };

    const now = new Date().toISOString();
    let submission = database.assessment_submissions.find(
      (candidate) => candidate.assessment_id === assessmentId && candidate.student_id === userId
    );
    if (!submission) {
      submission = {
        id: `assessment-submission-${randomUUID()}`,
        assessment_id: assessmentId,
        student_id: userId,
        status: "not-started",
        attempt_number: 0,
        score: null,
        max_score: 100,
        submitted_at: null,
        graded_at: null,
        answers: [],
        updated_at: now
      };
      database.assessment_submissions.push(submission);
    }

    if (submission.attempt_number >= assessment.max_attempts && isAssessmentSubmissionComplete(submission)) {
      return { status: "max-attempts" as const };
    }

    const answerByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.answer.trim()]));
    const questionIds = assessmentQuestionIds(assessment);
    const scoredAnswers: AssessmentSubmissionAnswer[] = questionIds.map((questionId) => {
      const selectedAnswer = answerByQuestionId.get(questionId) ?? "";
      const manualQuestion = assessment.manual_questions.find((question) => question.id === questionId);
      const question = questionForId(database, questionId);
      const maxPoints = assessmentQuestionMaxPoints(assessment, questionId, questionIds.length);
      const isCorrect = manualQuestion
        ? normalizeAnswer(selectedAnswer) === normalizeAnswer(manualQuestion.answer)
        : question
          ? questionAnswerMatches(question, selectedAnswer)
          : null;
      return {
        questionId,
        answer: selectedAnswer,
        isCorrect,
        pointsEarned: isCorrect === null ? null : isCorrect ? maxPoints : 0,
        maxPoints
      };
    });
    const maxScore = scoredAnswers.reduce((sum, answer) => sum + answer.maxPoints, 0);
    const earned = scoredAnswers.reduce((sum, answer) => sum + (answer.pointsEarned ?? 0), 0);
    const percentage = maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0;

    submission.status = "graded";
    submission.attempt_number += 1;
    submission.score = earned;
    submission.max_score = maxScore;
    submission.submitted_at = now;
    submission.graded_at = now;
    submission.answers = scoredAnswers;
    submission.updated_at = now;

    completeMatchingAssignments({
      database,
      userId,
      contentType: "assessment",
      targetIds: [assessmentId],
      now,
      score: percentage,
      graded: true,
      feedbackEn: "Auto-graded from the linked assessment submission.",
      feedbackZh: "已按連結測驗提交自動批改。"
    });

    return {
      status: "submitted" as const,
      submission: toAssessmentSubmission(database, submission),
      assessment: toAssessment(database, assessment)
    };
  });
}

export async function createTeacherAssignment({
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
  countTowardsGrade
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
}) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const teacherClass = teacherCanAccessClass(database, user, classId);
    if (!teacherClass) return { status: "not-found" as const };

    const enrolledStudentIds = teacherStudentIdsForClass(database, classId);
    const selectedStudentIds = studentIds?.length
      ? studentIds.filter((studentId) => enrolledStudentIds.includes(studentId))
      : enrolledStudentIds;
    if (!selectedStudentIds.length) return { status: "no-students" as const };

    const now = new Date().toISOString();
    const assignmentId = `assignment-${randomUUID()}`;
    const assignment: AssignmentRecord = {
      id: assignmentId,
      class_id: classId,
      title_en: trimmedTitle,
      title_zh: trimmedTitle,
      description_en: description.trim(),
      description_zh: description.trim(),
      content_type: contentType,
      target_id: targetId?.trim() || undefined,
      status: "active",
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      allow_retake: allowRetake,
      show_answers: showAnswers,
      count_towards_grade: countTowardsGrade,
      created_by: user.id,
      created_at: now,
      updated_at: now
    };

    database.assignments.unshift(assignment);
    selectedStudentIds.forEach((studentId) => {
      database.submissions.push({
        id: `submission-${randomUUID()}`,
        assignment_id: assignmentId,
        student_id: studentId,
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        feedback_en: "",
        feedback_zh: "",
        updated_at: now
      });
    });

    return { status: "created" as const, assignment: toAssignment(database, assignment) };
  });
}

export async function getTeacherAssignmentDetailData(userId: string, assignmentId: string): Promise<TeacherAssignmentDetailData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const assignment = database.assignments.find((candidate) => candidate.id === assignmentId);
  const teacherClass = assignment ? teacherCanAccessClass(database, user, assignment.class_id) : null;
  if (!assignment || !teacherClass) return null;

  const submissions = database.submissions
    .filter((submission) => submission.assignment_id === assignmentId)
    .sort((a, b) => {
      const aName = studentProfileFor(database, a.student_id)?.name ?? "";
      const bName = studentProfileFor(database, b.student_id)?.name ?? "";
      return aName.localeCompare(bName);
    })
    .map((submission) => toSubmission(database, submission));

  return {
    assignment: toAssignment(database, assignment),
    class: toTeacherClass(database, teacherClass),
    submissions,
    completionRate: percent(submissions.filter((submission) => submission.status === "submitted" || submission.status === "graded" || submission.status === "late").length, submissions.length)
  };
}

export async function updateTeacherSubmissionGrade({
  teacherId,
  submissionId,
  score,
  feedback
}: {
  teacherId: string;
  submissionId: string;
  score: number;
  feedback?: string;
}) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const submission = database.submissions.find((candidate) => candidate.id === submissionId);
    const assignment = submission ? database.assignments.find((candidate) => candidate.id === submission.assignment_id) : null;
    if (!submission || !assignment || !teacherCanAccessClass(database, user, assignment.class_id)) {
      return { status: "not-found" as const };
    }

    const now = new Date().toISOString();
    submission.score = Math.max(0, Math.min(100, Math.round(score)));
    submission.status = "graded";
    submission.graded_at = now;
    submission.submitted_at = submission.submitted_at ?? now;
    submission.feedback_en = feedback?.trim() ?? submission.feedback_en ?? "";
    submission.feedback_zh = feedback?.trim() ?? submission.feedback_zh ?? submission.feedback_en ?? "";
    submission.updated_at = now;
    return { status: "graded" as const, submission: toSubmission(database, submission) };
  });
}

export async function getStudentAssignments(userId: string): Promise<StudentAssignmentItem[]> {
  const database = await readDatabase();
  return database.submissions
    .filter((submission) => submission.student_id === userId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((submission) => {
      const assignment = database.assignments.find((candidate) => candidate.id === submission.assignment_id);
      const teacherClass = assignment ? database.teacher_classes.find((candidate) => candidate.id === assignment.class_id) : null;
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

function toTeacherMessageEntry(database: Database, record: TeacherMessageEntryRecord): TeacherMessageEntry {
  const senderProfile = studentProfileFor(database, record.sender_id);
  const senderUser = database.users.find((candidate) => candidate.id === record.sender_id);
  return {
    id: record.id,
    threadId: record.thread_id,
    senderId: record.sender_id,
    senderRole: record.sender_role,
    senderName: senderProfile?.name ?? senderUser?.username ?? (record.sender_role === "teacher" ? "Teacher" : "Student"),
    recipientId: record.recipient_id,
    body: record.body,
    attachments: record.attachments ?? [],
    createdAt: record.created_at
  };
}

function buildInboxThread(database: Database, thread: TeacherMessageRecord): TeacherInboxThread {
  const profile = studentProfileFor(database, thread.student_id);
  const classRecord = thread.class_id ? database.teacher_classes.find((candidate) => candidate.id === thread.class_id) : null;
  const grade = profile?.grade ?? classRecord?.grade ?? "S3";
  const curriculumProfile = curriculumProfileForThread(database, thread);
  const topicIds = database.topics
    .filter((topic) => isCurriculumTopic(topic, curriculumProfile) && topic.grade === grade)
    .map((topic) => topic.id);
  const activeMistakes = database.mistakes
    .filter((mistake) => mistake.user_id === thread.student_id && !mistake.mastered)
    .sort((a, b) => b.last_attempt_at.localeCompare(a.last_attempt_at))
    .slice(0, 3)
    .map((mistake) => toMistakeBookItem(database, mistake))
    .filter((mistake): mistake is MistakeBookItem => Boolean(mistake));
  const currentAssignments = database.submissions
    .filter((submission) => submission.student_id === thread.student_id && submission.status !== "graded")
    .slice(0, 3)
    .map((submission) => {
      const assignment = database.assignments.find((candidate) => candidate.id === submission.assignment_id);
      const teacherClass = assignment ? database.teacher_classes.find((candidate) => candidate.id === assignment.class_id) : null;
      if (!assignment || !teacherClass) return null;
      return {
        assignment: toAssignment(database, assignment),
        submission: toSubmission(database, submission),
        className: teacherClass.name,
        classGrade: teacherClass.grade
      };
    })
    .filter((item): item is StudentAssignmentItem => Boolean(item));

  return {
    ...toTeacherMessage(database, thread),
    className: classRecord?.name,
    studentGrade: grade,
    messages: database.teacher_message_entries
      .filter((entry) => entry.thread_id === thread.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((entry) => toTeacherMessageEntry(database, entry)),
    parentContext: thread.guardian_id
      ? {
          guardianId: thread.guardian_id,
          guardianName: studentProfileFor(database, thread.guardian_id)?.name ?? "Parent",
          category: parentMessageCategory(thread.parent_category),
          reportId: thread.report_id
        }
      : undefined,
    studentContext: {
      averageMastery: studentAverageMastery(database, thread.student_id, topicIds),
      activeMistakes,
      currentAssignments
    }
  };
}

export async function getTeacherInboxData(userId: string, selectedThreadId?: string | null): Promise<TeacherInboxData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
  const threads = teacherMessagesFor(database, user, classIds).map((thread) => buildInboxThread(database, thread));
  const selectedThread =
    threads.find((thread) => thread.id === selectedThreadId) ??
    threads.find((thread) => thread.status !== "resolved") ??
    threads[0] ??
    null;

  return { threads, selectedThread };
}

export async function replyToTeacherMessageThread({
  teacherId,
  threadId,
  body
}: {
  teacherId: string;
  threadId: string;
  body: string;
}) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
    const thread = teacherMessagesFor(database, user, classIds).find((candidate) => candidate.id === threadId);
    if (!thread) return { status: "not-found" as const };

    const now = new Date().toISOString();
    database.teacher_message_entries.push({
      id: `message-entry-${randomUUID()}`,
      thread_id: thread.id,
      sender_id: user.id,
      sender_role: "teacher",
      recipient_id: thread.guardian_id ?? thread.student_id,
      body: trimmedBody,
      attachments: [],
      created_at: now
    });
    thread.latest_message = trimmedBody;
    thread.status = "open";
    thread.last_message_at = now;

    return { status: "sent" as const, thread: buildInboxThread(database, thread) };
  });
}

export async function updateTeacherMessageThread({
  teacherId,
  threadId,
  status,
  starred
}: {
  teacherId: string;
  threadId: string;
  status?: TeacherMessageStatus;
  starred?: boolean;
}) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
    const thread = teacherMessagesFor(database, user, classIds).find((candidate) => candidate.id === threadId);
    if (!thread) return { status: "not-found" as const };

    if (status) thread.status = status;
    if (typeof starred === "boolean") thread.starred = starred;
    return { status: "updated" as const, thread: buildInboxThread(database, thread) };
  });
}

function buildStudentMessageThread(database: Database, thread: TeacherMessageRecord): StudentMessageThread {
  const teacher = database.users.find((candidate) => candidate.id === thread.teacher_id);
  const teacherProfile = studentProfileFor(database, thread.teacher_id);
  const classRecord = thread.class_id ? database.teacher_classes.find((candidate) => candidate.id === thread.class_id) : null;
  return {
    ...toTeacherMessage(database, thread),
    className: classRecord?.name,
    teacherName: teacherProfile?.name ?? teacher?.username ?? "Teacher",
    messages: database.teacher_message_entries
      .filter((entry) => entry.thread_id === thread.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((entry) => toTeacherMessageEntry(database, entry))
  };
}

export async function getStudentMessagesData(userId: string, selectedThreadId?: string | null): Promise<StudentMessagesData> {
  const database = await readDatabase();
  const classRecords = database.class_enrollments
    .filter((enrollment) => enrollment.student_id === userId)
    .map((enrollment) => database.teacher_classes.find((teacherClass) => teacherClass.id === enrollment.class_id))
    .filter((teacherClass): teacherClass is TeacherClassRecord => Boolean(teacherClass));
  const threads = database.teacher_messages
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
    classes: classRecords.map((teacherClass) => toTeacherClass(database, teacherClass)),
    assignments: await getStudentAssignments(userId)
  };
}

export async function createStudentMessageThread({
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
}) {
  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject || !trimmedBody) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const enrolledClassIds = studentClassIds(database, studentId);
    const teacherClass = classId && enrolledClassIds.has(classId)
      ? database.teacher_classes.find((candidate) => candidate.id === classId)
      : database.teacher_classes.find((candidate) => enrolledClassIds.has(candidate.id));
    if (!teacherClass) return { status: "not-found" as const };

    const assignment = assignmentId
      ? database.assignments.find((candidate) => candidate.id === assignmentId && candidate.class_id === teacherClass.id)
      : null;
    const curriculumProfile = curriculumProfileForClass(database, teacherClass);
    const cleanTopicId = topicId && database.topics.some((topic) => isCurriculumTopic(topic, curriculumProfile) && topic.id === topicId) ? topicId : undefined;
    const now = new Date().toISOString();
    const thread: TeacherMessageRecord = {
      id: `message-thread-${randomUUID()}`,
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
      last_message_at: now,
      created_at: now
    };
    database.teacher_messages.unshift(thread);
    database.teacher_message_entries.push({
      id: `message-entry-${randomUUID()}`,
      thread_id: thread.id,
      sender_id: studentId,
      sender_role: "student",
      recipient_id: teacherClass.teacher_id,
      body: trimmedBody,
      attachments: [],
      created_at: now
    });

    return { status: "created" as const, thread: buildStudentMessageThread(database, thread) };
  });
}

export async function replyToStudentMessageThread({
  studentId,
  threadId,
  body
}: {
  studentId: string;
  threadId: string;
  body: string;
}) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const thread = database.teacher_messages.find((candidate) => candidate.id === threadId && candidate.student_id === studentId && !candidate.guardian_id);
    if (!thread) return { status: "not-found" as const };

    const now = new Date().toISOString();
    database.teacher_message_entries.push({
      id: `message-entry-${randomUUID()}`,
      thread_id: thread.id,
      sender_id: studentId,
      sender_role: "student",
      recipient_id: thread.teacher_id,
      body: trimmedBody,
      attachments: [],
      created_at: now
    });
    thread.latest_message = trimmedBody;
    thread.status = "unread";
    thread.last_message_at = now;
    return { status: "sent" as const, thread: buildStudentMessageThread(database, thread) };
  });
}

function livePromptFromRecord(record: TeacherLivePromptRecord): TeacherLivePrompt {
  return {
    id: record.id,
    type: record.type,
    question: { en: record.question_en, zh: record.question_zh },
    options: record.options,
    correctOptionId: record.correct_option_id
  };
}

function liveResponseSummary(database: Database, prompt: TeacherLivePromptRecord): TeacherLiveResponseSummary {
  const responses = database.teacher_live_responses.filter((response) => response.prompt_id === prompt.id);
  const answerCounts = new Map<string, { count: number; isCorrect: boolean | null }>();
  responses.forEach((response) => {
    const current = answerCounts.get(response.answer) ?? { count: 0, isCorrect: response.is_correct };
    current.count += 1;
    current.isCorrect = response.is_correct;
    answerCounts.set(response.answer, current);
  });
  const correctCount = responses.filter((response) => response.is_correct === true).length;
  const accuracy = responses.length && prompt.correct_option_id ? Math.round((correctCount / responses.length) * 100) : null;

  return {
    promptId: prompt.id,
    totalSubmissions: responses.length,
    correctCount,
    accuracy,
    submittedStudentIds: responses.map((response) => response.student_id),
    commonAnswers: Array.from(answerCounts.entries())
      .map(([answer, value]) => ({
        answer,
        count: value.count,
        isCorrect: value.isCorrect
      }))
      .sort((a, b) => b.count - a.count || a.answer.localeCompare(b.answer))
      .slice(0, 4),
    needsReteach: Boolean(responses.length >= 3 && accuracy !== null && accuracy < 65)
  };
}

function toTeacherLiveSession(database: Database, record: TeacherLiveSessionRecord): TeacherLiveSession | null {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === record.class_id);
  const prompt = database.teacher_live_prompts.find((candidate) => candidate.id === record.current_prompt_id);
  if (!teacherClass || !prompt) return null;

  return {
    id: record.id,
    classId: record.class_id,
    className: teacherClass.name,
    grade: teacherClass.grade,
    status: record.status,
    title: { en: record.title_en, zh: record.title_zh },
    lessonTitle: { en: record.lesson_title_en, zh: record.lesson_title_zh },
    lessonSlug: record.lesson_slug,
    topicId: record.topic_id,
    topicTitle: record.topic_title_en || record.topic_title_zh
      ? { en: record.topic_title_en ?? record.topic_id ?? "", zh: record.topic_title_zh ?? record.topic_title_en ?? record.topic_id ?? "" }
      : undefined,
    visualizationTitle: { en: record.visualization_title_en, zh: record.visualization_title_zh },
    joinCode: record.join_code,
    startedAt: record.started_at,
    endedAt: record.ended_at,
    currentPrompt: livePromptFromRecord(prompt),
    studentCount: teacherStudentIdsForClass(database, record.class_id).length,
    responseSummary: liveResponseSummary(database, prompt)
  };
}

function toClassroomLiveSession({
  teacherSession,
  viewerMode,
  response
}: {
  teacherSession: TeacherLiveSession;
  viewerMode: ClassroomLiveSession["viewerMode"];
  response?: TeacherLiveResponseRecord | null;
}): ClassroomLiveSession {
  return {
    id: teacherSession.id,
    className: teacherSession.className,
    status: teacherSession.status,
    title: teacherSession.title,
    lessonTitle: teacherSession.lessonTitle,
    joinCode: teacherSession.joinCode,
    currentPrompt: teacherSession.currentPrompt,
    viewerMode,
    canSubmit: viewerMode === "student" && !response,
    submitted: Boolean(response),
    submittedAnswer: response?.answer ?? null
  };
}

function defaultLivePromptOptions(type: TeacherLivePromptType): TeacherLivePromptOption[] {
  if (type === "exit-ticket") {
    return [
      { id: "green", label: { en: "Ready to continue", zh: "可以繼續" } },
      { id: "yellow", label: { en: "Need one more example", zh: "需要多一個例子" } },
      { id: "red", label: { en: "Please reteach", zh: "需要重講" } }
    ];
  }

  return [
    { id: "a", label: { en: "A", zh: "A" } },
    { id: "b", label: { en: "B", zh: "B" } },
    { id: "c", label: { en: "C", zh: "C" } },
    { id: "d", label: { en: "D", zh: "D" } }
  ];
}

function generateJoinCode(database: Database, teacherClass: TeacherClassRecord) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${teacherClass.grade}${randomUUID().slice(0, 3)}`.replace(/-/g, "").toUpperCase();
    if (!database.teacher_live_sessions.some((session) => session.join_code === code)) return code;
  }
  return `${teacherClass.grade}${Date.now().toString(36).slice(-3)}`.toUpperCase();
}

export async function getTeacherLiveData(userId: string): Promise<TeacherLiveData | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!canUseTeacherArea(user)) return null;

  const classRecords = teacherClassRecordsFor(database, user);
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  const sessions = database.teacher_live_sessions
    .filter((session) => classIds.has(session.class_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((session) => toTeacherLiveSession(database, session))
    .filter((session): session is TeacherLiveSession => Boolean(session));

  return {
    generatedAt: new Date().toISOString(),
    classes: classRecords.map((teacherClass) => toTeacherClass(database, teacherClass)),
    activeSession: sessions.find((session) => session.status === "active") ?? sessions[0] ?? null,
    recentSessions: sessions.slice(0, 6)
  };
}

export async function startTeacherLiveSession({
  teacherId,
  classId,
  promptType,
  question,
  correctOptionId,
  topicId
}: {
  teacherId: string;
  classId: string;
  promptType: TeacherLivePromptType;
  question: string;
  correctOptionId?: string;
  topicId?: string;
}) {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const teacherClass = teacherCanAccessClass(database, user, classId);
    if (!teacherClass) return { status: "not-found" as const };

    const now = new Date().toISOString();
    const curriculumProfile = curriculumProfileForClass(database, teacherClass);
    const topic = (topicId ? database.topics.find((candidate) => isCurriculumTopic(candidate, curriculumProfile) && candidate.id === topicId && candidate.grade === teacherClass.grade) : null) ??
      database.topics.find((candidate) => isCurriculumTopic(candidate, curriculumProfile) && candidate.grade === teacherClass.grade);
    const lesson = topic ? lessonForTopic(database, topic.id) : null;
    const topicTitle = topic ? localizedTopicTitleForRecord(topic) : null;
    const sessionId = `live-${randomUUID()}`;
    const promptId = `live-prompt-${randomUUID()}`;
    const options = defaultLivePromptOptions(promptType);
    const correct = promptType === "poll" && correctOptionId && options.some((option) => option.id === correctOptionId)
      ? correctOptionId
      : promptType === "poll"
        ? options[0]?.id
        : undefined;

    database.teacher_live_sessions
      .filter((session) => session.class_id === classId && session.status === "active")
      .forEach((session) => {
        session.status = "ended";
        session.ended_at = now;
        session.updated_at = now;
      });

    database.teacher_live_sessions.unshift({
      id: sessionId,
      class_id: classId,
      teacher_id: user.id,
      status: "active",
      title_en: `${teacherClass.name} live check`,
      title_zh: `${teacherClass.name} 即時課堂檢查`,
      lesson_slug: lesson?.slug,
      lesson_title_en: lesson?.title_en ?? `${teacherClass.grade} lesson`,
      lesson_title_zh: lesson?.title_zh ?? `${teacherClass.grade} 課節`,
      topic_id: topic?.id,
      topic_title_en: topicTitle?.en,
      topic_title_zh: topicTitle?.zh,
      visualization_title_en: topicTitle ? `${topicTitle.en} visualization` : "Current visualization",
      visualization_title_zh: topicTitle ? `${topicTitle.zh} 視覺化` : "目前視覺化",
      join_code: generateJoinCode(database, teacherClass),
      current_prompt_id: promptId,
      started_at: now,
      ended_at: null,
      created_at: now,
      updated_at: now
    });

    database.teacher_live_prompts.push({
      id: promptId,
      session_id: sessionId,
      type: promptType,
      question_en: trimmedQuestion,
      question_zh: trimmedQuestion,
      options,
      correct_option_id: correct,
      created_at: now
    });

    const session = toTeacherLiveSession(database, database.teacher_live_sessions[0]);
    return session ? { status: "started" as const, session } : { status: "invalid" as const };
  });
}

export async function endTeacherLiveSession({
  teacherId,
  sessionId
}: {
  teacherId: string;
  sessionId: string;
}) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

    const session = database.teacher_live_sessions.find((candidate) => candidate.id === sessionId);
    if (!session || !teacherCanAccessClass(database, user, session.class_id)) return { status: "not-found" as const };

    const now = new Date().toISOString();
    session.status = "ended";
    session.ended_at = now;
    session.updated_at = now;
    return { status: "ended" as const, session: toTeacherLiveSession(database, session) };
  });
}

export async function getClassroomLiveSessionForStudent(userId: string, joinCode: string): Promise<ClassroomLiveSession | null> {
  const database = await readDatabase();
  const normalizedCode = joinCode.trim().toUpperCase();
  const session = database.teacher_live_sessions.find((candidate) => candidate.join_code.toUpperCase() === normalizedCode);
  if (!session) return null;
  const enrolled = database.class_enrollments.some((enrollment) => enrollment.class_id === session.class_id && enrollment.student_id === userId);
  if (!enrolled) return null;

  const teacherSession = toTeacherLiveSession(database, session);
  if (!teacherSession) return null;
  const response = database.teacher_live_responses.find(
    (candidate) => candidate.student_id === userId && candidate.session_id === session.id && candidate.prompt_id === session.current_prompt_id
  );

  return toClassroomLiveSession({ teacherSession, viewerMode: "student", response });
}

export async function getClassroomLiveSessionForTeacherPreview(userId: string, joinCode: string): Promise<ClassroomLiveSession | null> {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (!user || !canUseTeacherArea(user)) return null;

  const normalizedCode = joinCode.trim().toUpperCase();
  const session = database.teacher_live_sessions.find((candidate) => candidate.join_code.toUpperCase() === normalizedCode);
  if (!session || !teacherCanAccessClass(database, user, session.class_id)) return null;

  const teacherSession = toTeacherLiveSession(database, session);
  if (!teacherSession) return null;

  return toClassroomLiveSession({ teacherSession, viewerMode: "teacher-preview" });
}

export async function submitClassroomLiveResponse({
  userId,
  sessionId,
  promptId,
  answer
}: {
  userId: string;
  sessionId: string;
  promptId: string;
  answer: string;
}) {
  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) return { status: "invalid" as const };

  return mutateDatabase((database) => {
    const session = database.teacher_live_sessions.find((candidate) => candidate.id === sessionId);
    const prompt = database.teacher_live_prompts.find((candidate) => candidate.id === promptId && candidate.session_id === sessionId);
    if (!session || !prompt || session.status !== "active") return { status: "not-found" as const };

    const enrolled = database.class_enrollments.some((enrollment) => enrollment.class_id === session.class_id && enrollment.student_id === userId);
    if (!enrolled) return { status: "forbidden" as const };

    const option = prompt.options.find((candidate) => candidate.id === trimmedAnswer);
    const storedAnswer = option?.id ?? trimmedAnswer;
    const isCorrect = prompt.correct_option_id ? storedAnswer === prompt.correct_option_id : null;
    const now = new Date().toISOString();
    const existing = database.teacher_live_responses.find(
      (candidate) => candidate.session_id === sessionId && candidate.prompt_id === promptId && candidate.student_id === userId
    );

    if (existing) {
      existing.answer = storedAnswer;
      existing.is_correct = isCorrect;
      existing.submitted_at = now;
    } else {
      database.teacher_live_responses.push({
        id: `live-response-${randomUUID()}`,
        session_id: sessionId,
        prompt_id: promptId,
        student_id: userId,
        answer: storedAnswer,
        is_correct: isCorrect,
        submitted_at: now
      });
    }

    session.updated_at = now;
    return { status: "submitted" as const, session: toTeacherLiveSession(database, session) };
  });
}

export async function exportDatabaseSnapshotForAdmin(userId: string) {
  const database = await readDatabase();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (user?.role !== "admin") return null;

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion,
    storage: storageProvider === "postgres"
      ? {
          provider: "postgres",
          target: "POSTGRES_URL",
          path: "postgres://[redacted]"
        }
      : {
          provider: "sqlite",
          path: dbPath
        },
    database
  };
}

export async function getStorageReadinessSnapshot() {
  const isVercelRuntime = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (storageProvider === "postgres") {
    if (!postgresUrl) {
      return {
        generatedAt: new Date().toISOString(),
        provider: "postgres" as const,
        status: "missing-postgres-url",
        durableReady: false,
        configuredPath: false,
        configuredUrl: false,
        runtime: isVercelRuntime ? "vercel" : "local",
        databasePath: "postgres://[redacted]",
        databaseDirectory: "postgres://[redacted]",
        usingTmpFallback: false,
        message: "HK_MATH_STORAGE_PROVIDER=postgres requires POSTGRES_URL before storage can be durable-ready."
      };
    }

    try {
      await ensurePostgresStateTable();
      await readPostgresDatabase();
    } catch {
      return {
        generatedAt: new Date().toISOString(),
        provider: "postgres" as const,
        status: "postgres-unavailable",
        durableReady: false,
        configuredPath: true,
        configuredUrl: true,
        runtime: isVercelRuntime ? "vercel" : "local",
        databasePath: "postgres://[redacted]",
        databaseDirectory: "postgres://[redacted]",
        usingTmpFallback: false,
        message: "POSTGRES_URL is configured, but the app could not verify the Postgres app_state table."
      };
    }

    return {
      generatedAt: new Date().toISOString(),
      provider: "postgres" as const,
      status: "durable-ready",
      durableReady: true,
      configuredPath: true,
      configuredUrl: true,
      runtime: isVercelRuntime ? "vercel" : "local",
      databasePath: "postgres://[redacted]",
      databaseDirectory: "postgres://[redacted]",
      usingTmpFallback: false,
      message: "HK_MATH_STORAGE_PROVIDER=postgres and POSTGRES_URL are configured for durable shared production state."
    };
  }

  const status = configuredDbPath ? "durable-ready" : "demo-only";
  return {
    generatedAt: new Date().toISOString(),
    provider: "sqlite" as const,
    status,
    durableReady: status === "durable-ready",
    configuredPath: Boolean(configuredDbPath),
    runtime: isVercelRuntime ? "vercel" : "local",
    databasePath: dbPath,
    databaseDirectory: dbDirectory,
    usingTmpFallback: !configuredDbPath && isVercelRuntime,
    message:
      status === "durable-ready"
        ? "HK_MATH_DB_PATH is configured; verify the mounted path is durable before real class use."
        : "No HK_MATH_DB_PATH is configured. Treat this environment as demo-only for student/class records."
  };
}

export async function updateUserSettings(
  userId: string,
  patch: Partial<{ language: Language; theme: ThemeMode; selectedGrade: GradeId }>
) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!user) return null;

    const profile = database.student_profiles.find((candidate) => candidate.user_id === userId);
    if (!profile) return null;

    const settingsIndex = database.user_settings.findIndex((candidate) => candidate.user_id === userId);
    const currentSettings =
      settingsIndex >= 0 ? database.user_settings[settingsIndex] : defaultSettings(userId, profile.grade);

    const nextSettings: UserSettingsRecord = {
      ...currentSettings,
      language: patch.language && validLanguages.has(patch.language) ? patch.language : currentSettings.language,
      theme: patch.theme && validThemes.has(patch.theme) ? patch.theme : currentSettings.theme,
      selected_grade:
        patch.selectedGrade && validGrades.has(patch.selectedGrade)
          ? patch.selectedGrade
          : currentSettings.selected_grade,
      updated_at: new Date().toISOString()
    };

    if (settingsIndex >= 0) {
      database.user_settings[settingsIndex] = nextSettings;
    } else {
      database.user_settings.push(nextSettings);
    }

    return toAuthenticatedUser(database, user);
  });
}

export async function updateUserProfile(
  userId: string,
  patch: Partial<{ name: string; avatarId: StudentAvatarId; avatarImageDataUrl: string | null }>
) {
  return mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!user) return null;

    const profile = database.student_profiles.find((candidate) => candidate.user_id === userId);
    if (!profile) return null;

    if (typeof patch.name === "string") {
      const nextName = cleanStudentProfileName(patch.name);
      if (nextName.length < 2 || nextName.length > 48) return null;
      profile.name = nextName;
    }

    if (patch.avatarId) {
      if (!isValidStudentAvatarId(patch.avatarId)) return null;
      profile.avatar_id = patch.avatarId;
    } else if (!isValidStudentAvatarId(profile.avatar_id)) {
      profile.avatar_id = defaultStudentAvatarId;
    }

    if ("avatarImageDataUrl" in patch) {
      if (patch.avatarImageDataUrl === null || patch.avatarImageDataUrl === "") {
        delete profile.avatar_image_data_url;
      } else if (isValidStudentAvatarImageDataUrl(patch.avatarImageDataUrl)) {
        profile.avatar_image_data_url = patch.avatarImageDataUrl;
      } else {
        return null;
      }
    } else {
      profile.avatar_image_data_url = normalizeStudentAvatarImageDataUrl(profile.avatar_image_data_url);
    }

    return toAuthenticatedUser(database, user);
  });
}

export async function getPublicQuestions(filters: Partial<{ grade: GradeId; topicId: string; difficulty: Difficulty; curriculumTrack: CurriculumTrack; curriculumProfile: CurriculumProfile }>) {
  const database = await readDatabase();
  const curriculumProfile = filters.curriculumProfile ?? curriculumProfileForTrack(filters.curriculumTrack ?? defaultCurriculumTrack);
  if (filters.grade && contentUnavailableFor(curriculumProfile, filters.grade)) return [];

  return database.questions
    .filter((question) => {
      const curriculumTrackMatches = isCurriculumQuestion(question, curriculumProfile);
      const gradeMatches = !filters.grade || question.grade === filters.grade;
      const topicMatches = !filters.topicId || question.topic_id === filters.topicId;
      const difficultyMatches = !filters.difficulty || question.difficulty === filters.difficulty;
      return curriculumTrackMatches && gradeMatches && topicMatches && difficultyMatches;
    })
    .map((question) => toPublicQuestion(database, question));
}

function buildAdaptiveGenerationContext(
  database: Database,
  userId: string,
  grade: GradeId,
  topicId?: string | null,
  curriculumTrack: CurriculumScope = defaultCurriculumProfile
) {
  const topicRecords = database.topics
    .filter((topic) => isCurriculumTopic(topic, curriculumTrack) && topic.grade === grade)
    .sort((a, b) => a.sort_order - b.sort_order);
  const topics = topicRecords.map((topic) => toTopicWithProgress(database, userId, topic));
  const questions = database.questions
    .filter((question) => isCurriculumQuestion(question, curriculumTrack) && question.grade === grade)
    .map((question) => toPublicQuestion(database, question));
  const lessons = topicRecords
    .map((topic) => lessonForTopic(database, topic.id))
    .filter((lesson): lesson is LessonRecord => Boolean(lesson))
    .map((lesson) => lessonSummaryFor(database, userId, lesson));
  const components = buildKnowledgeComponents({ topics, questions });
  const generated = generateAdaptiveCandidates({
    components,
    states: adaptiveStatesForUser(database, userId),
    topics,
    lessons,
    questions,
    grade,
    topicId
  });

  return {
    generated,
    topics,
    questions,
    lessons,
    components
  };
}

function findAdaptiveCacheRecord(
  database: Database,
  {
    userId,
    grade,
    topicId,
    candidateSignature
  }: {
    userId: string;
    grade: GradeId;
    topicId?: string | null;
    candidateSignature: string;
  }
) {
  const normalizedTopicId = adaptiveCacheTopicId(topicId);
  return database.adaptive_recommendation_cache.find((record) =>
    record.user_id === userId &&
    record.grade === grade &&
    record.topic_id === normalizedTopicId &&
    record.candidate_signature === candidateSignature
  ) ?? null;
}

function composeDecisionWithCache({
  generated,
  cacheRecord,
  providerFallback
}: {
  generated: ReturnType<typeof generateAdaptiveCandidates>;
  cacheRecord?: AdaptiveRecommendationCacheRecord | null;
  providerFallback: { status: AdaptiveLLMStatus; provider?: string; model?: string };
}) {
  const deterministicCandidate = generated.candidates.find((candidate) => candidate.candidateId === generated.deterministicCandidateId) ?? generated.candidates[0] ?? null;
  if (!deterministicCandidate) return null;

  if (cacheRecord?.status === "ready" && cacheRecord.recommendation_json) {
    const validated = validateLLMAdaptiveRecommendation({
      recommendation: cacheRecord.recommendation_json,
      candidates: generated.candidates
    });
    if (validated.valid && validated.candidate && validated.recommendation) {
      return composeAdaptiveDecisionFromCandidate({
        candidate: validated.candidate,
        deterministicCandidateId: generated.deterministicCandidateId,
        skillMap: generated.skillMap,
        dueReviews: generated.dueReviews,
        candidateSignature: generated.candidateSignature,
        llmStatus: "ready",
        llmRecommendation: validated.recommendation,
        provider: cacheRecord.provider ?? providerFallback.provider,
        model: cacheRecord.model ?? providerFallback.model,
        finishReason: cacheRecord.finish_reason
      });
    }

      return composeAdaptiveDecisionFromCandidate({
        candidate: deterministicCandidate,
      deterministicCandidateId: generated.deterministicCandidateId,
      skillMap: generated.skillMap,
      dueReviews: generated.dueReviews,
      candidateSignature: generated.candidateSignature,
        llmStatus: "rejected",
        provider: cacheRecord.provider ?? providerFallback.provider,
        model: cacheRecord.model ?? providerFallback.model,
        error: validated.reason ?? "cached-recommendation-invalid",
        errorKind: classifyAdaptiveLLMError("rejected", validated.reason),
        finishReason: cacheRecord.finish_reason
      });
    }

  const status = cacheRecord?.status ?? providerFallback.status;
  return composeAdaptiveDecisionFromCandidate({
    candidate: deterministicCandidate,
    deterministicCandidateId: generated.deterministicCandidateId,
    skillMap: generated.skillMap,
    dueReviews: generated.dueReviews,
    candidateSignature: generated.candidateSignature,
    llmStatus: status,
    provider: cacheRecord?.provider ?? providerFallback.provider,
    model: cacheRecord?.model ?? providerFallback.model,
    error: cacheRecord?.error ?? undefined,
    errorKind: cacheRecord?.error_kind ?? classifyAdaptiveLLMError(status, cacheRecord?.error),
    finishReason: cacheRecord?.finish_reason
  });
}

type AdaptiveRefreshRateLimitState = {
  timestamps: number[];
};

const adaptiveRefreshRateLimits = new Map<string, AdaptiveRefreshRateLimitState>();
const defaultAdaptiveMaxRequestsPerMinute = 3;
const defaultAdaptiveMaxRequestsPerHour = 20;
const defaultAdaptiveMaxCompletionTokens = 1200;
const defaultAdaptiveProviderTimeoutMs = 30000;
const adaptiveRagPromptVersion = "adaptive-rag-v1";
const adaptiveRagMaxTopicPacks = 4;
const adaptiveRagMaxEvidenceTextLength = 8000;
const adaptiveRagMaxEvidenceTextPerTopic = 2400;

function checkAdaptiveRefreshRateLimit(userId: string, now = Date.now()) {
  const maxPerMinute = boundedLLMNumber(process.env.ADAPTIVE_LLM_MAX_REQUESTS_PER_MINUTE, defaultAdaptiveMaxRequestsPerMinute, 1, 30);
  const maxPerHour = boundedLLMNumber(process.env.ADAPTIVE_LLM_MAX_REQUESTS_PER_HOUR, defaultAdaptiveMaxRequestsPerHour, 1, 120);
  const state = adaptiveRefreshRateLimits.get(userId) ?? { timestamps: [] };
  const recent = state.timestamps.filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  const recentMinute = recent.filter((timestamp) => now - timestamp < 60 * 1000);

  if (recentMinute.length >= maxPerMinute || recent.length >= maxPerHour) return false;

  recent.push(now);
  adaptiveRefreshRateLimits.set(userId, { timestamps: recent });
  return true;
}

function localizedFromRecord(value: unknown, fallback: LocalizedText): LocalizedText {
  return isLocalizedRecord(value) ? value : fallback;
}

function extractJsonObjectText(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

function parseAdaptiveLLMRecommendation(reply: string): { recommendation: AdaptiveLLMRecommendation | null; error?: string } {
  if (!reply.trim()) return { recommendation: null, error: "empty-reply" };

  try {
    const parsed = JSON.parse(extractJsonObjectText(reply)) as Record<string, unknown>;
    return {
      recommendation: {
        selectedCandidateId: typeof parsed.selectedCandidateId === "string" ? parsed.selectedCandidateId : "",
        questionIds: Array.isArray(parsed.questionIds) ? parsed.questionIds.filter((questionId): questionId is string => typeof questionId === "string") : undefined,
        learnerReason: localizedFromRecord(parsed.learnerReason, { en: "", zh: "" }),
        teacherAuditNote: localizedFromRecord(parsed.teacherAuditNote, { en: "", zh: "" }),
        signalsUsed: Array.isArray(parsed.signalsUsed) ? parsed.signalsUsed.filter((signal): signal is string => typeof signal === "string") : [],
        confidenceExplanation: localizedFromRecord(parsed.confidenceExplanation, { en: "", zh: "" })
      }
    };
  } catch {
    return { recommendation: null, error: "invalid-json" };
  }
}

function adaptiveCandidateFeature(candidate: AdaptiveLearningCandidate) {
  return {
    candidateId: candidate.candidateId,
    action: candidate.action,
    baseScore: candidate.baseScore,
    hardGuardFlags: candidate.hardGuardFlags,
    topicId: candidate.topic.id,
    ragEvidenceTopicId: candidate.topic.id,
    topicTitle: candidate.topic.title,
    skillId: candidate.skill.id,
    skillTitle: candidate.skill.title,
    difficulty: candidate.skill.difficulty,
    masteryProbability: candidate.summary.state.pMastery,
    attemptCount: candidate.summary.state.attemptCount,
    correctStreak: candidate.summary.state.correctStreak,
    wrongStreak: candidate.summary.state.wrongStreak,
    nextReviewAt: candidate.summary.state.nextReviewAt,
    misconceptionTags: candidate.summary.state.misconceptionTags,
    questionIds: candidate.questionIds,
    questionMix: candidate.questions.map((question) => ({
      id: question.id,
      difficulty: question.difficulty,
      type: question.type,
      topicId: question.topicId
    }))
  };
}

type AdaptiveRagStatus = "ready" | "unavailable" | "unsupported";
type AdaptiveRagDifficultyBand = "foundation" | "core" | "challenge" | "exam";
type AdaptiveRagIntent = "tutor-explain" | "generate-question" | "generate-lesson" | "exam-practice" | "diagnose-mistake";
type AdaptiveUnitedStatesRagIntent = "tutor-explain" | "generate-question" | "generate-lesson" | "diagnose-mistake" | "assessment-design";
type AdaptiveRagLayer = {
  label: string;
  cardIds: string[];
  cardCount: number;
};
type AdaptiveRagTopicEvidence = {
  topicId: string;
  topicTitle: LocalizedText;
  candidateIds: string[];
  status: Exclude<AdaptiveRagStatus, "unsupported">;
  layers: AdaptiveRagLayer[];
  safeUse: string[];
  evidenceText: string;
};
type AdaptiveRagEvidence = {
  status: AdaptiveRagStatus;
  signature: string;
  policy: {
    safeCardsOnly: true;
    rawSourceTextAllowed: false;
    sourceLocatorsAllowed: false;
    embeddingPayloadAllowed: false;
    answerOrSolutionAccessAllowed: false;
    questionGenerationAllowed: false;
    maxTopicPacks: number;
    maxEvidenceTextCharacters: number;
  };
  byTopic: AdaptiveRagTopicEvidence[];
};

function uniqueNonEmpty(values: Array<string | undefined | null>, limit = 10) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).slice(0, limit);
}

function adaptiveRagDifficultyBand(difficulty: Difficulty): AdaptiveRagDifficultyBand {
  if (difficulty === "Foundation") return "foundation";
  if (difficulty === "Challenge") return "challenge";
  if (difficulty === "Exam") return "exam";
  return "core";
}

function adaptiveRagIntent(candidate: AdaptiveLearningCandidate): AdaptiveRagIntent {
  if (candidate.action === "lesson") return "generate-lesson";
  if (candidate.action === "repair") return "diagnose-mistake";
  if (candidate.skill.difficulty === "Exam" || candidate.action === "challenge" || candidate.action === "review") return "exam-practice";
  return "tutor-explain";
}

function adaptiveUnitedStatesRagIntent(candidate: AdaptiveLearningCandidate): AdaptiveUnitedStatesRagIntent {
  const intent = adaptiveRagIntent(candidate);
  if (intent === "exam-practice") return "assessment-design";
  return intent;
}

function adaptiveRagConceptIds(candidate: AdaptiveLearningCandidate) {
  const skillTopicId = candidate.skill.topicId;
  const skillRoot = candidate.skill.id.split(":")[0] ?? skillTopicId;
  return uniqueNonEmpty([
    candidate.topic.canonicalTopicId,
    candidate.topic.id,
    skillTopicId,
    skillRoot,
    candidate.topic.title.en,
    candidate.topic.title.zh,
    ...candidate.skill.misconceptionTags,
    ...candidate.summary.state.misconceptionTags
  ], 8);
}

function adaptiveRagUnitTitle(candidate: AdaptiveLearningCandidate) {
  return candidate.topic.title.zh || candidate.topic.title.en || candidate.topic.id;
}

function adaptiveRagLayer(label: string, cards: Array<{ id: string }>): AdaptiveRagLayer {
  const cardIds = uniqueNonEmpty(cards.map((card) => card.id), 12);
  return {
    label,
    cardIds,
    cardCount: cards.length
  };
}

function adaptiveRagLayersForUnitedStates(cards: Array<{ id: string; cardKind?: string }>) {
  const grouped = new Map<string, Array<{ id: string }>>();
  for (const card of cards) {
    const label = card.cardKind ? `us-${card.cardKind}` : "us-safe-card";
    grouped.set(label, [...(grouped.get(label) ?? []), card]);
  }
  return Array.from(grouped.entries()).map(([label, layerCards]) => adaptiveRagLayer(label, layerCards));
}

function sanitizeAdaptiveEvidenceText(text: string) {
  const blockedLinePatterns = [
    /\bOCR\b/i,
    /source locators?/i,
    /embeddings?/i,
    /source-document excerpts?/i,
    /machine-extracted/i,
    /extracted source text/i,
    /source archives?/i,
    /page screenshots?/i,
    /screenshots?/i,
    /\bpage\s+\d+\b/i,
    /\bp\.\s*\d+/i,
    /answer key/i,
    /official solution/i,
    /\banswers?\b/i,
    /\bsolutions?\b/i,
    /答案/,
    /解析/
  ];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !blockedLinePatterns.some((pattern) => pattern.test(line)));

  return lines.join("\n").trim();
}

function truncateAdaptiveEvidenceText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  const suffix = "\n[truncated to adaptive RAG budget]";
  return `${text.slice(0, Math.max(0, maxLength - suffix.length)).trim()}${suffix}`;
}

function adaptiveRagSignature(input: unknown) {
  return createHash("sha1").update(JSON.stringify(input)).digest("hex");
}

function buildAdaptiveRagTopicEvidence({
  candidates,
  curriculumTrack,
  curriculumProfile,
  remainingEvidenceBudget
}: {
  candidates: AdaptiveLearningCandidate[];
  curriculumTrack: CurriculumTrack;
  curriculumProfile: CurriculumProfile;
  remainingEvidenceBudget: number;
}): AdaptiveRagTopicEvidence | null {
  const candidate = candidates[0];
  if (!candidate || remainingEvidenceBudget <= 0) return null;

  const conceptIds = adaptiveRagConceptIds(candidate);
  const limit = 3;
  const maxEvidenceText = Math.min(adaptiveRagMaxEvidenceTextPerTopic, remainingEvidenceBudget);
  const difficultyBand = adaptiveRagDifficultyBand(candidate.skill.difficulty);
  const topicTitle = candidate.topic.title;
  const candidateIds = candidates.map((item) => item.candidateId);
  let layers: AdaptiveRagLayer[] = [];
  let evidenceText = "";

  if (curriculumTrack === "MAINLAND_PEP_HIGH") {
    if (curriculumProfile.publisher === "MAINLAND_HJB") {
      if (isMainlandHjbJuniorGrade(candidate.topic.grade)) {
        const pack = buildMainlandHjbJuniorEvidencePack({
          grade: candidate.topic.grade,
          unitTitle: adaptiveRagUnitTitle(candidate),
          conceptIds,
          intent: adaptiveRagIntent(candidate),
          difficultyBand,
          limit
        });
        layers = [
          adaptiveRagLayer("mainland-hjb-junior-textbook", pack.cards)
        ].filter((layer) => layer.cardCount > 0);
        evidenceText = pack.evidenceText;
      } else if (isMainlandHjbHighGrade(candidate.topic.grade)) {
        const pack = buildMainlandHjbHighEvidencePack({
          grade: candidate.topic.grade,
          chapter: adaptiveRagUnitTitle(candidate),
          conceptIds,
          intent: adaptiveRagIntent(candidate),
          difficultyBand,
          limit
        });
        layers = [
          adaptiveRagLayer("mainland-hjb-textbook", pack.textbookCards),
          adaptiveRagLayer("mainland-shared-secondary-exam-pattern", pack.examPatternCards)
        ].filter((layer) => layer.cardCount > 0);
        evidenceText = pack.evidenceText;
      }
    } else {
      const pack = getMainlandPepEvidencePack({
        grade: candidate.topic.grade,
        unitTitle: adaptiveRagUnitTitle(candidate),
        conceptIds,
        intent: adaptiveRagIntent(candidate),
        difficultyBand,
        limit
      });
      layers = [
        adaptiveRagLayer("mainland-curriculum", pack.cards),
        adaptiveRagLayer("mainland-primary-paper-pattern", pack.primaryExamPatternCards),
        adaptiveRagLayer("mainland-junior-paper-pattern", pack.juniorPaperPatternCards),
        adaptiveRagLayer("mainland-junior-exam-pattern", pack.juniorExamPatternCards),
        adaptiveRagLayer("mainland-secondary-exam-pattern", pack.secondaryExamPatternCards)
      ].filter((layer) => layer.cardCount > 0);
      evidenceText = pack.evidenceText;
    }
  } else if (curriculumTrack === "HK") {
    const pack = buildHongKongMathEvidencePack({
      grade: candidate.topic.grade,
      topicId: candidate.topic.canonicalTopicId ?? candidate.topic.id,
      conceptIds,
      intent: adaptiveRagIntent(candidate),
      difficultyBand,
      curriculumProfile,
      limit
    });
    layers = [
      adaptiveRagLayer("hk-curriculum", pack.curriculumCards),
      adaptiveRagLayer("hk-textbook", pack.textbookCards),
      adaptiveRagLayer("hk-exam-pattern", pack.examPatternCards)
    ].filter((layer) => layer.cardCount > 0);
    evidenceText = pack.evidenceText;
  } else if (curriculumTrack === "US_CA_MATH" || curriculumTrack === "US_NC_MATH") {
    const usDifficultyBand = difficultyBand === "exam" ? "assessment" : difficultyBand;
    const pack = buildUnitedStatesMathEvidencePack({
      curriculumTrack,
      grade: candidate.topic.grade,
      topicId: candidate.topic.canonicalTopicId ?? candidate.topic.id,
      conceptIds,
      intent: adaptiveUnitedStatesRagIntent(candidate),
      difficultyBand: usDifficultyBand,
      limit
    });
    layers = adaptiveRagLayersForUnitedStates(pack.cards);
    evidenceText = pack.evidenceText;
  }

  const sanitizedEvidence = truncateAdaptiveEvidenceText(sanitizeAdaptiveEvidenceText(evidenceText), maxEvidenceText);

  return {
    topicId: candidate.topic.id,
    topicTitle,
    candidateIds,
    status: layers.length ? "ready" : "unavailable",
    layers,
    safeUse: ["safe-card-only", "original-MAIS-output-only", "no-source-reconstruction", "guarded-rerank-only"],
    evidenceText: sanitizedEvidence || "Safe card layer metadata is available; protected source artifacts are not included."
  };
}

function buildAdaptiveRagEvidence({
  generated,
  grade,
  curriculumTrack
}: {
  generated: ReturnType<typeof generateAdaptiveCandidates>;
  grade: GradeId;
  curriculumTrack: CurriculumScope;
}): AdaptiveRagEvidence {
  const resolvedTrack = curriculumTrackForScope(curriculumTrack);
  const curriculumProfile = curriculumProfileForScope(curriculumTrack);
  const policy: AdaptiveRagEvidence["policy"] = {
    safeCardsOnly: true,
    rawSourceTextAllowed: false,
    sourceLocatorsAllowed: false,
    embeddingPayloadAllowed: false,
    answerOrSolutionAccessAllowed: false,
    questionGenerationAllowed: false,
    maxTopicPacks: adaptiveRagMaxTopicPacks,
    maxEvidenceTextCharacters: adaptiveRagMaxEvidenceTextLength
  };

  if (!["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH"].includes(resolvedTrack)) {
    const signature = adaptiveRagSignature({ version: adaptiveRagPromptVersion, grade, resolvedTrack, status: "unsupported" });
    return { status: "unsupported", signature, policy, byTopic: [] };
  }

  const candidatesByTopic = new Map<string, AdaptiveLearningCandidate[]>();
  for (const candidate of generated.candidates) {
    const existing = candidatesByTopic.get(candidate.topic.id);
    if (existing) {
      existing.push(candidate);
    } else if (candidatesByTopic.size < adaptiveRagMaxTopicPacks) {
      candidatesByTopic.set(candidate.topic.id, [candidate]);
    }
  }

  let remainingEvidenceBudget = adaptiveRagMaxEvidenceTextLength;
  const byTopic: AdaptiveRagTopicEvidence[] = [];
  for (const candidates of candidatesByTopic.values()) {
    const topicEvidence = buildAdaptiveRagTopicEvidence({
      candidates,
      curriculumTrack: resolvedTrack,
      curriculumProfile,
      remainingEvidenceBudget
    });
    if (!topicEvidence) continue;
    remainingEvidenceBudget -= topicEvidence.evidenceText.length;
    byTopic.push(topicEvidence);
    if (remainingEvidenceBudget <= 0) break;
  }

  const status: AdaptiveRagStatus = byTopic.some((topic) => topic.status === "ready")
    ? "ready"
    : byTopic.length
      ? "unavailable"
      : "unavailable";
  const signature = adaptiveRagSignature({
    version: adaptiveRagPromptVersion,
    grade,
    resolvedTrack,
    status,
    byTopic: byTopic.map((topic) => ({
      topicId: topic.topicId,
      layers: topic.layers.map((layer) => [layer.label, layer.cardIds]),
      evidenceText: topic.evidenceText
    }))
  });

  return {
    status,
    signature,
    policy,
    byTopic
  };
}

function adaptiveLLMCacheSignature(candidateSignature: string, ragEvidence: AdaptiveRagEvidence) {
  const hash = createHash("sha1")
    .update(`${adaptiveRagPromptVersion}:${candidateSignature}:${ragEvidence.signature}`)
    .digest("hex");
  return `${adaptiveRagPromptVersion}:${hash}`;
}

function adaptiveLLMFeaturePack({
  database,
  userId,
  grade,
  topicId,
  curriculumTrack,
  generated,
  ragEvidence,
  cacheSignature
}: {
  database: Database;
  userId: string;
	  grade: GradeId;
	  topicId?: string | null;
	  curriculumTrack: CurriculumScope;
	  generated: ReturnType<typeof generateAdaptiveCandidates>;
  ragEvidence: AdaptiveRagEvidence;
  cacheSignature: string;
	}) {
  const gradeTopicIds = new Set(database.topics.filter((topic) => isCurriculumTopic(topic, curriculumTrack) && topic.grade === grade).map((topic) => topic.id));
  const attempts = database.attempts.filter((attempt) => {
    const question = questionForId(database, attempt.question_id);
    return attempt.user_id === userId && Boolean(question && gradeTopicIds.has(question.topic_id));
  });
  const correctAttempts = attempts.filter((attempt) => attempt.is_correct).length;
  const activeMistakes = database.mistakes.filter((mistake) => {
    const question = questionForId(database, mistake.question_id);
    return mistake.user_id === userId && !mistake.mastered && Boolean(question && gradeTopicIds.has(question.topic_id));
  });
  const events = database.learning_events
    .filter((event) => event.user_id === userId && event.grade === grade)
    .map(eventRecordToAnalyticsEvent);

	  return {
    policy: {
      authority: "guarded-rerank-only",
      canSelectOnlyGeneratedCandidateIds: true,
      canOnlyReorderExistingQuestionIds: true,
      noQuestionGeneration: true,
      noAnswerOrSolutionAccess: true
    },
	    curriculumTrack: curriculumTrackForScope(curriculumTrack),
	    curriculumProfile: curriculumProfileForScope(curriculumTrack),
    grade,
    topicId: adaptiveCacheTopicId(topicId),
    candidateSignature: generated.candidateSignature,
    promptVersion: adaptiveRagPromptVersion,
    cacheSignature,
    deterministicCandidateId: generated.deterministicCandidateId,
    candidates: generated.candidates.map(adaptiveCandidateFeature),
    ragEvidence,
    dueReviewCount: generated.dueReviews.length,
    recentPerformance: {
      totalAttempts: attempts.length,
      accuracy: attempts.length ? Math.round((correctAttempts / attempts.length) * 100) : null,
      activeMistakeCount: activeMistakes.length,
      activeMistakeTopicIds: Array.from(new Set(activeMistakes
        .map((mistake) => questionForId(database, mistake.question_id)?.topic_id)
        .filter((id): id is string => Boolean(id))))
        .slice(0, 8)
    },
    analyticsSummary: summarizeLearningAnalytics(events, { windowDays: analyticsWindowDays })
  };
}

function buildAdaptiveLLMMessages(featurePack: ReturnType<typeof adaptiveLLMFeaturePack>): LLMProviderMessage[] {
  const example = JSON.stringify({
    selectedCandidateId: featurePack.deterministicCandidateId,
    questionIds: [],
    learnerReason: { en: "The deterministic candidate remains the safest next step.", zh: "確定性候選仍是最安全的下一步。" },
    teacherAuditNote: { en: "Selected from the provided candidates only.", zh: "只從已提供的候選方案中選取。" },
    signalsUsed: ["deterministicCandidateId", "masteryProbability"],
    confidenceExplanation: { en: "The recommendation preserves the BKT guardrails.", zh: "此建議保留 BKT 防護規則。" }
  });

  return [
    {
      role: "system",
      content: [
        "You are the MAIS Hybrid Adaptive Engine V3 reranker.",
        "You must preserve the deterministic BKT guardrails.",
        "Return only one minified JSON object. Do not wrap it in Markdown fences.",
        "You may select only one candidateId from the provided candidates.",
        "selectedCandidateId must exactly match one provided candidates[].candidateId string.",
        "If the deterministic recommendation is still best, return deterministicCandidateId as selectedCandidateId.",
        "You may reorder or subset only existing questionIds from the selected candidate.",
        "Do not invent topics, skills, questions, answers, or hidden solution content.",
        "ragEvidence is MAIS-safe curriculum, textbook, and exam-pattern context for judging the next learning action only.",
        "Do not quote, reconstruct, paraphrase, or use ragEvidence to create new questions, answers, solutions, source examples, source layouts, or hidden source content.",
        "When ragEvidence.status is ready, signalsUsed must include at least one evidence signal such as ragEvidence, curriculumEvidence, textbookEvidence, or examPatternEvidence.",
        "Return only strict JSON with keys: selectedCandidateId, questionIds, learnerReason, teacherAuditNote, signalsUsed, confidenceExplanation.",
        "learnerReason, teacherAuditNote, and confidenceExplanation must each be objects with en and zh strings.",
        `Example JSON shape: ${example}`
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify(featurePack)
    }
  ];
}

function upsertAdaptiveRecommendationCache(
  database: Database,
  input: {
    userId: string;
    grade: GradeId;
    topicId?: string | null;
    candidateSignature: string;
    status: AdaptiveLLMStatus;
    recommendation?: AdaptiveLLMRecommendation | null;
    selectedCandidateId?: string | null;
    questionIds?: string[];
    provider?: string | null;
    model?: string | null;
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
    error?: string | null;
    errorKind?: AdaptiveEngineErrorKind | null;
    finishReason?: string | null;
    now?: string;
  }
) {
  const now = input.now ?? new Date().toISOString();
  const topicId = adaptiveCacheTopicId(input.topicId);
  const id = createHash("sha1")
    .update(`${input.userId}:${input.grade}:${topicId ?? "all"}:${input.candidateSignature}`)
    .digest("hex");
  const record: AdaptiveRecommendationCacheRecord = {
    id: `adaptive-${id}`,
    user_id: input.userId,
    grade: input.grade,
    topic_id: topicId,
    candidate_signature: input.candidateSignature,
    status: input.status,
    selected_candidate_id: input.selectedCandidateId ?? input.recommendation?.selectedCandidateId ?? null,
    question_ids: input.questionIds ?? input.recommendation?.questionIds ?? [],
    recommendation_json: input.recommendation ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    prompt_tokens: input.promptTokens ?? null,
    completion_tokens: input.completionTokens ?? null,
    total_tokens: input.totalTokens ?? null,
    error: input.error ?? null,
    error_kind: input.errorKind ?? null,
    finish_reason: input.finishReason ?? null,
    created_at: now,
    updated_at: now
  };
  const index = database.adaptive_recommendation_cache.findIndex((candidate) => candidate.id === record.id);
  if (index >= 0) {
    record.created_at = database.adaptive_recommendation_cache[index].created_at;
    database.adaptive_recommendation_cache[index] = record;
  } else {
    database.adaptive_recommendation_cache.push(record);
  }
}

export async function getAdaptiveLearningDecision({
  userId,
  grade,
  topicId,
	  curriculumTrack = defaultCurriculumTrack
	}: {
	  userId: string;
	  grade: GradeId;
	  topicId?: string | null;
	  curriculumTrack?: CurriculumScope;
}): Promise<AdaptiveLearningDecision | null> {
  const database = await readDatabase();
  const { generated } = buildAdaptiveGenerationContext(database, userId, grade, topicId, curriculumTrack);
  const providerConfig = readLLMProviderConfig();
  const ragEvidence = buildAdaptiveRagEvidence({ generated, grade, curriculumTrack });
  const cacheSignature = adaptiveLLMCacheSignature(generated.candidateSignature, ragEvidence);
  const cacheRecord = findAdaptiveCacheRecord(database, {
    userId,
    grade,
    topicId,
    candidateSignature: cacheSignature
  });
  return composeDecisionWithCache({
    generated,
    cacheRecord,
    providerFallback: {
      status: providerConfig.apiKey ? "pending" : "disabled",
      provider: providerConfig.provider,
      model: providerConfig.model
    }
  });
}

export async function refreshAdaptiveLearningRecommendation({
  userId,
  grade,
  topicId,
	  curriculumTrack = defaultCurriculumTrack
	}: {
	  userId: string;
	  grade: GradeId;
	  topicId?: string | null;
	  curriculumTrack?: CurriculumScope;
}): Promise<{ status: AdaptiveLLMStatus; decision: AdaptiveLearningDecision | null; error?: string }> {
  const providerConfig = readLLMProviderConfig();
  const database = await readDatabase();
  const { generated } = buildAdaptiveGenerationContext(database, userId, grade, topicId, curriculumTrack);
  const ragEvidence = buildAdaptiveRagEvidence({ generated, grade, curriculumTrack });
  const cacheSignature = adaptiveLLMCacheSignature(generated.candidateSignature, ragEvidence);
  const deterministicDecision = composeDecisionWithCache({
    generated,
    cacheRecord: null,
    providerFallback: {
      status: providerConfig.apiKey ? "pending" : "disabled",
      provider: providerConfig.provider,
      model: providerConfig.model
    }
  });
  if (!deterministicDecision) return { status: "failed", decision: null, error: "No adaptive candidates available." };

  const existing = findAdaptiveCacheRecord(database, {
    userId,
    grade,
    topicId,
    candidateSignature: cacheSignature
  });
  if (existing?.status === "ready") {
    return {
      status: "ready",
      decision: await getAdaptiveLearningDecision({ userId, grade, topicId, curriculumTrack })
    };
  }

  if (!providerConfig.apiKey) {
    await mutateDatabase((mutable) => {
      upsertAdaptiveRecommendationCache(mutable, {
        userId,
        grade,
        topicId,
        candidateSignature: cacheSignature,
        status: "disabled",
        provider: providerConfig.provider,
        model: providerConfig.model,
        error: "Missing LLM_API_KEY or OPENAI_API_KEY.",
        errorKind: "configuration"
      });
    });
    return {
      status: "disabled",
      decision: await getAdaptiveLearningDecision({ userId, grade, topicId, curriculumTrack }),
      error: "Missing LLM_API_KEY or OPENAI_API_KEY."
    };
  }

  if (!checkAdaptiveRefreshRateLimit(userId)) {
    await mutateDatabase((mutable) => {
      upsertAdaptiveRecommendationCache(mutable, {
        userId,
        grade,
        topicId,
        candidateSignature: cacheSignature,
        status: "failed",
        provider: providerConfig.provider,
        model: providerConfig.model,
        error: "Adaptive LLM refresh rate limit exceeded.",
        errorKind: "rate-limit"
      });
    });
    return {
      status: "failed",
      decision: await getAdaptiveLearningDecision({ userId, grade, topicId, curriculumTrack }),
      error: "Adaptive LLM refresh rate limit exceeded."
    };
  }

  const featurePack = adaptiveLLMFeaturePack({ database, userId, grade, topicId, curriculumTrack, generated, ragEvidence, cacheSignature });
  const messages = buildAdaptiveLLMMessages(featurePack);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    boundedLLMNumber(process.env.ADAPTIVE_LLM_PROVIDER_TIMEOUT_MS, defaultAdaptiveProviderTimeoutMs, 250, 60000)
  );

  try {
    const providerResponse = await fetch(providerConfig.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${providerConfig.apiKey}`
      },
      body: JSON.stringify(buildLLMProviderRequestBody({
        model: providerConfig.model,
        provider: providerConfig.provider,
        messages,
        responseFormat: "json_object",
        deepSeekThinking: "disabled",
        maxTokens: boundedLLMNumber(
          process.env.ADAPTIVE_LLM_MAX_COMPLETION_TOKENS,
          defaultAdaptiveMaxCompletionTokens,
          160,
          1400
        )
      })),
      signal: controller.signal
    });

    if (!providerResponse.ok) {
      const error = `LLM provider returned HTTP ${providerResponse.status}.`;
      await mutateDatabase((mutable) => {
        upsertAdaptiveRecommendationCache(mutable, {
          userId,
          grade,
          topicId,
          candidateSignature: cacheSignature,
          status: "failed",
          provider: providerConfig.provider,
          model: providerConfig.model,
          error,
          errorKind: "provider"
        });
      });
      return {
        status: "failed",
        decision: await getAdaptiveLearningDecision({ userId, grade, topicId, curriculumTrack }),
        error
      };
    }

    const data: unknown = await providerResponse.json();
    const reply = extractLLMProviderReply(data);
    const usage = extractLLMProviderUsage(data);
    const finishReason = extractLLMProviderFinishReason(data);
    const parsedRecommendation = parseAdaptiveLLMRecommendation(reply);
    const validated = validateLLMAdaptiveRecommendation({
      recommendation: parsedRecommendation.recommendation,
      candidates: generated.candidates
    });

    if (!validated.valid || !validated.recommendation) {
      const error = parsedRecommendation.error ?? validated.reason ?? "Invalid LLM recommendation.";
      await mutateDatabase((mutable) => {
        upsertAdaptiveRecommendationCache(mutable, {
          userId,
          grade,
          topicId,
          candidateSignature: cacheSignature,
          status: "rejected",
          provider: providerConfig.provider,
          model: providerConfig.model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          error,
          errorKind: classifyAdaptiveLLMError("rejected", error) ?? "format",
          finishReason
        });
      });
      return {
        status: "rejected",
        decision: await getAdaptiveLearningDecision({ userId, grade, topicId, curriculumTrack }),
        error
      };
    }

    const recommendation = validated.recommendation;
    await mutateDatabase((mutable) => {
      upsertAdaptiveRecommendationCache(mutable, {
        userId,
        grade,
        topicId,
        candidateSignature: cacheSignature,
        status: "ready",
        recommendation,
        selectedCandidateId: recommendation.selectedCandidateId,
        questionIds: recommendation.questionIds,
        provider: providerConfig.provider,
        model: providerConfig.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        finishReason
      });
    });

    return {
      status: "ready",
      decision: await getAdaptiveLearningDecision({ userId, grade, topicId, curriculumTrack })
    };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "LLM provider request timed out."
      : "LLM provider request failed.";
    await mutateDatabase((mutable) => {
      upsertAdaptiveRecommendationCache(mutable, {
        userId,
        grade,
        topicId,
        candidateSignature: cacheSignature,
        status: "failed",
        provider: providerConfig.provider,
        model: providerConfig.model,
        error: message,
        errorKind: "provider"
      });
    });
    return {
      status: "failed",
      decision: await getAdaptiveLearningDecision({ userId, grade, topicId, curriculumTrack }),
      error: message
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function submitQuestionAttempt({
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
	  curriculumTrack?: CurriculumScope;
	}): Promise<AttemptFeedback | null> {
  return mutateDatabase((database) => {
    const question = database.questions.find((candidate) => candidate.id === questionId);
    if (!question) return null;
    if (!isCurriculumQuestion(question, curriculumTrack)) return null;

    const now = new Date().toISOString();
    const correct = questionAnswerMatches(question, selectedAnswer);
    const attempt: AttemptRecord = {
      id: randomUUID(),
      user_id: userId,
      question_id: question.id,
      selected_answer: selectedAnswer,
      is_correct: correct,
      duration_seconds:
        typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0
          ? Math.round(durationSeconds)
          : null,
      created_at: now
    };

    database.attempts.push(attempt);
    if (correct) {
      markExistingMistakeMastered(database, userId, question.id, now);
    } else {
      upsertMistake(database, userId, question, selectedAnswer, now);
    }
    updateAdaptiveStateFromAttempt(database, userId, question, correct, now);
    updatePracticeAssignmentSubmissionsFromAttempt(database, userId, question, correct, now);
    if (correct) maybeAwardPracticeAccuracyReward(database, userId, question, now);

    return {
      correct,
      explanation: {
        en: question.explanation_en,
        zh: question.explanation_zh
      },
      correctAnswer: correct ? undefined : question.answer
    };
  });
}

export async function getMistakes(userId: string, status?: "active" | "mastered") {
  const database = await readDatabase();

  return database.mistakes
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
}

export async function markMistakeMastered(userId: string, questionId: string) {
  return mutateDatabase((database) => {
    const existing = database.mistakes.find(
      (mistake) => mistake.user_id === userId && mistake.question_id === questionId
    );
    if (!existing) return null;

    const wasMastered = existing.mastered;
    existing.mastered = true;
    const now = new Date().toISOString();
    existing.last_attempt_at = now;

    if (!wasMastered) {
      const question = questionForId(database, questionId);
      const topic = question ? topicRecordForId(database, question.topic_id) : null;
      const title = topic ? localizedTopic(topic) : { en: "math", zh: "數學" };
      awardAutomaticRewardOnce(database, {
        studentId: userId,
        reason: "mistake-review",
        sourceKey: `mistake-review:${userId}:${questionId}`,
        label: {
          en: `Reviewed a ${title.en} mistake`,
          zh: `重溫${title.zh}錯題`
        },
        createdAt: now
      });
    }

    return toMistakeBookItem(database, existing);
  });
}

export async function deleteMistake(userId: string, questionId: string) {
  return mutateDatabase((database) => {
    const previousLength = database.mistakes.length;
    database.mistakes = database.mistakes.filter(
      (mistake) => !(mistake.user_id === userId && mistake.question_id === questionId)
    );

    return database.mistakes.length !== previousLength;
  });
}

export async function clearMistakesForUser(userId: string) {
  await mutateDatabase((database) => {
    database.mistakes = database.mistakes.filter((mistake) => mistake.user_id !== userId);
  });
}

function windowDaysFrom(value?: string | null) {
  if (!value) return analyticsWindowDays;
  const match = /^(\d+)d$/.exec(value.trim());
  if (!match) return analyticsWindowDays;
  return Math.min(90, Math.max(1, Number(match[1])));
}

function startOfUtcDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function eventRecordToAnalyticsEvent(event: LearningEventRecord): LearningAnalyticsEvent {
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

function analyticsEventToRecord(userId: string, event: LearningAnalyticsEvent): LearningEventRecord {
  return {
    id: event.id || randomUUID(),
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
const durationFallbackSeconds = 60;

function hasRecordedDuration(durationSeconds: number | null | undefined): durationSeconds is number {
  return typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0;
}

function isDurationlessStudyEvent(event: LearningEventRecord) {
  if (event.type === "answer-correct" || event.type === "answer-wrong") return false;
  if (event.type === "page-view") return durationFallbackStudySources.has(event.source);
  return durationFallbackStudySources.has(event.source) || event.type === "mistake-review" || event.type === "hint-request" || isVisualizationEvent(event.type);
}

export async function appendLearningEvents(userId: string, events: LearningAnalyticsEvent[]) {
  return mutateDatabase((database) => {
    const existingIds = new Set(database.learning_events.map((event) => event.id));
    const clearedAt = database.learning_event_clears.find((clear) => clear.user_id === userId)?.cleared_at;
    const clearedAtMs = clearedAt ? new Date(clearedAt).getTime() : null;
    const records = events
      .filter((event) => {
        if (existingIds.has(event.id)) return false;
        if (clearedAtMs === null) return true;
        return new Date(event.timestamp).getTime() > clearedAtMs;
      })
      .map((event) => analyticsEventToRecord(userId, event));

    records.forEach((record) => {
      database.learning_events.push(record);
      if (isVisualizationEvent(record.type)) {
        database.visualization_events.push({
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
      maybeAwardLearningStreakReward(database, userId, new Date(latestRecord.created_at));
    }

    return records.length;
  });
}

export async function clearLearningEventsForUser(userId: string, clearedAt = new Date().toISOString()) {
  await mutateDatabase((database) => {
    database.learning_events = database.learning_events.filter((event) => event.user_id !== userId);
    database.visualization_events = database.visualization_events.filter((event) => event.user_id !== userId);
    database.learning_event_clears = [
      ...database.learning_event_clears.filter((clear) => clear.user_id !== userId),
      { user_id: userId, cleared_at: clearedAt }
    ];
  });
}

export async function getAnalyticsSummary(
  userId: string,
  window?: string | null,
  grade?: GradeId
): Promise<LearningAnalyticsSummary> {
  const database = await readDatabase();
  const windowDays = windowDaysFrom(window);
  const events = database.learning_events
    .filter((event) => event.user_id === userId && (!grade || event.grade === grade))
    .map(eventRecordToAnalyticsEvent);

  return summarizeLearningAnalytics(events, { windowDays });
}

export async function getAnalyticsExport(
  userId: string,
  grade: GradeId,
  window?: string | null
): Promise<LearningAnalyticsExportSummary> {
  const database = await readDatabase();
  const windowDays = windowDaysFrom(window);
  const events = database.learning_events
    .filter((event) => event.user_id === userId && event.grade === grade)
    .map(eventRecordToAnalyticsEvent);

  return exportLearningAnalyticsSummary({ events, studentId: userId, grade, windowDays });
}

function dayKey(value: string) {
  return value.slice(0, 10);
}

function calculateStreak(attempts: AttemptRecord[], now = new Date()) {
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

function topicAttemptStats(database: Database, userId: string) {
  const stats = new Map<string, { attempts: AttemptRecord[]; correct: number; wrong: number; lastAttemptAt: string }>();

  database.attempts
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

export async function getDashboardData(userId: string, grade: GradeId, curriculumTrack: CurriculumScope = defaultCurriculumProfile): Promise<DashboardData> {
  const database = await readDatabase();
  const gradeTopics = database.topics
    .filter((topic) => isCurriculumTopic(topic, curriculumTrack) && topic.grade === grade)
    .map((topic) => toTopicWithProgress(database, userId, topic));
  const contentUnavailable = contentUnavailableFor(curriculumTrack, grade);
  const gradeTopicIds = new Set(gradeTopics.map((topic) => topic.id));
  const userAttempts = database.attempts.filter((attempt) => {
    const question = questionForId(database, attempt.question_id);
    return attempt.user_id === userId && Boolean(question && gradeTopicIds.has(question.topic_id));
  });
  const correctAttempts = userAttempts.filter((attempt) => attempt.is_correct).length;
  const accuracy = userAttempts.length ? Math.round((correctAttempts / userAttempts.length) * 100) : 0;
  const topicStats = topicAttemptStats(database, userId);
  const activeMistakes = database.mistakes.filter((mistake) => {
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
  const completedLessons = database.lesson_progress.filter((progress) => {
    return progress.user_id === userId && progress.status === "completed" && gradeTopicIds.has(progress.topic_id);
  }).length;
  const masteredTopics = gradeTopics.filter((topic) => topic.mastery >= 75).length;
  const visualizationSessions = Math.max(
    database.visualization_events.filter((event) => event.user_id === userId && gradeTopicIds.has(event.topic_id)).length,
    database.visualization_sessions.filter((session) => session.user_id === userId && gradeTopicIds.has(session.topic_id)).length
  );
  const averageMastery = gradeTopics.length
    ? Math.round(gradeTopics.reduce((sum, topic) => sum + topic.mastery, 0) / gradeTopics.length)
    : 0;

	  return {
	    curriculumTrack: curriculumTrackForScope(curriculumTrack),
    streakDays: calculateStreak(userAttempts),
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
    contentUnavailable
  };
}

function secondsToDisplayMinutes(seconds: number) {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}

function buildRecentActivityItems({
  database,
  userId,
  grade,
  gradeTopicIds
}: {
  database: Database;
  userId: string;
  grade: GradeId;
  gradeTopicIds: Set<string>;
}): RecentActivityItem[] {
  const items: RecentActivityItem[] = [];

  database.attempts
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

  database.lesson_progress
    .filter((progress) => progress.user_id === userId && gradeTopicIds.has(progress.topic_id) && progress.status !== "not-started")
    .forEach((progress) => {
      const topic = topicRecordForId(database, progress.topic_id);
      items.push({
        id: `lesson-${progress.topic_id}-${progress.updated_at}`,
        title: topic ? localizedTopicTitleForRecord(topic) : { en: progress.topic_id, zh: progress.topic_id },
        detail: progress.status === "completed"
          ? { en: `Lesson completed · mastery ${progress.mastery}%`, zh: `課節已完成 · 掌握度 ${progress.mastery}%` }
          : { en: `Lesson in progress · mastery ${progress.mastery}%`, zh: `課節進行中 · 掌握度 ${progress.mastery}%` },
        timestamp: progress.updated_at
      });
    });

  database.learning_events
    .filter((event) => event.user_id === userId && event.grade === grade)
    .forEach((event) => {
      const topic = topicRecordForId(database, event.topic_id);
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

export async function getProgressData(userId: string, grade: GradeId, window?: string | null, curriculumTrack: CurriculumScope = defaultCurriculumProfile): Promise<ProgressData> {
  const database = await readDatabase();
  const windowDays = windowDaysFrom(window);
  const now = new Date();
  const buckets = Array.from({ length: windowDays }, (_, index) => {
    const date = startOfUtcDay(now);
    date.setUTCDate(date.getUTCDate() - (windowDays - 1 - index));
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
  const gradeTopics = database.topics
    .filter((topic) => isCurriculumTopic(topic, curriculumTrack) && topic.grade === grade)
    .map((topic) => toTopicWithProgress(database, userId, topic));
  const contentUnavailable = contentUnavailableFor(curriculumTrack, grade);
  const gradeTopicIds = new Set(gradeTopics.map((topic) => topic.id));
  const attempts = database.attempts.filter((attempt) => {
    const question = questionForId(database, attempt.question_id);
    const attemptTime = new Date(attempt.created_at).getTime();
    return (
      attempt.user_id === userId &&
      attemptTime >= earliest &&
      attemptTime <= nowTime &&
      Boolean(question && gradeTopicIds.has(question.topic_id))
    );
  });
  const learningEvents = database.learning_events.filter((event) => {
    const eventTime = new Date(event.created_at).getTime();
    return event.user_id === userId && event.grade === grade && eventTime >= earliest && eventTime <= nowTime;
  });
  const lessonProgressRecords = database.lesson_progress.filter((progress) => {
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
  const completedLessons = database.lesson_progress.filter((progress) => {
    return progress.user_id === userId && progress.status === "completed" && gradeTopicIds.has(progress.topic_id);
  }).length;
  const masteredTopics = gradeTopics.filter((topic) => topic.mastery >= 75).length;
  const visualizationSessions = Math.max(
    learningEvents.filter((event) => isVisualizationEvent(event.type)).length,
    database.visualization_sessions.filter((session) => {
      const updatedTime = new Date(session.updated_at).getTime();
      return session.user_id === userId && gradeTopicIds.has(session.topic_id) && updatedTime >= earliest && updatedTime <= nowTime;
    }).length
  );
  const activeMistakes = database.mistakes.filter((mistake) => {
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
	    curriculumTrack: curriculumTrackForScope(curriculumTrack),
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
    contentUnavailable
  };
}

function lessonSummaryFor(database: Database, userId: string | null, lesson: LessonRecord): LessonSummary {
  const progress = userId ? lessonProgressFor(database, userId, lesson) : null;
  const seedTopic = seedTopicById.get(lesson.topic_id);
  const lessonTopic = topicRecordForId(database, lesson.topic_id);
  const curriculumProfile = normalizeStoredCurriculumProfile({
    curriculumTrack: lessonTopic?.curriculum_track ?? seedTopic?.curriculumTrack ?? defaultCurriculumTrack,
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
    title: { en: translateHjbHighDisplayTextEn(lesson.title_en), zh: lesson.title_zh },
    description: { en: translateHjbHighDisplayTextEn(lesson.description_en), zh: lesson.description_zh },
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimated_minutes,
    status: progress?.status ?? (!userId ? seedTopic?.status ?? "not-started" : "not-started"),
    mastery: progress?.mastery ?? (!userId ? seedTopic?.mastery ?? 0 : 0)
  };
}

function lessonForTopic(database: Database, topicId: string) {
  return indexesForDatabase(database).lessonByTopicId.get(topicId);
}

function roadmapSignals(database: Database, userId: string | null, gradeTopics: Topic[]) {
  const gradeTopicIds = new Set(gradeTopics.map((topic) => topic.id));

  if (!userId) {
    return {
      recommendedTopic: gradeTopics.find((topic) => topic.status === "in-progress") ?? gradeTopics[0] ?? null,
      recentTopics: gradeTopics.filter((topic) => topic.status !== "not-started").slice(0, 3),
      weakTopics: gradeTopics.filter((topic) => topic.mastery > 0 && topic.mastery < 65).slice(0, 4)
    };
  }

  const topicStats = topicAttemptStats(database, userId);
  const activeMistakes = database.mistakes.filter((mistake) => {
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

export async function getRoadmapData(userId: string | null, grade?: GradeId, curriculumTrack: CurriculumScope = defaultCurriculumProfile): Promise<RoadmapData> {
  const database = await readDatabase();
  const indexes = indexesForDatabase(database);
  const curriculumProfile = curriculumProfileForScope(curriculumTrack);
  const topicRecords = database.topics
    .filter((topic) => isCurriculumTopic(topic, curriculumTrack) && (!grade || topic.grade === grade))
    .sort((a, b) => a.sort_order - b.sort_order);
  const roadmapTopics = topicRecords.map((topic) => toTopicWithProgress(database, userId, topic));
  const lessons = roadmapTopics
    .map((topic) => indexes.lessonByTopicId.get(topic.id))
    .filter((lesson): lesson is LessonRecord => Boolean(lesson))
    .map((lesson) => lessonSummaryFor(database, userId, lesson));
  const signals = roadmapSignals(database, userId, roadmapTopics);
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
    contentUnavailable: contentUnavailableFor(curriculumTrack, grade)
  };
}

export async function getLessonEntryTarget(
  userId: string,
  grade: GradeId,
  curriculumTrack: CurriculumScope = defaultCurriculumProfile
): Promise<LessonEntryTarget | null> {
  const startedAt = Date.now();
  const database = await readDatabase();
  const topicRecords = database.topics
    .filter((topic) => isCurriculumTopic(topic, curriculumTrack) && topic.grade === grade)
    .sort((a, b) => a.sort_order - b.sort_order);
  const roadmapTopics = topicRecords.map((topic) => toTopicWithProgress(database, userId, topic));
  const signals = roadmapSignals(database, userId, roadmapTopics);
  const targetTopic = signals.recommendedTopic ?? roadmapTopics.find((topic) => Boolean(lessonForTopic(database, topic.id))) ?? null;
  const targetLesson = (targetTopic ? lessonForTopic(database, targetTopic.id) : null)
    ?? roadmapTopics.map((topic) => lessonForTopic(database, topic.id)).find((lesson): lesson is LessonRecord => Boolean(lesson))
    ?? null;

  if (!targetLesson) {
    logLessonPerf("getLessonEntryTarget", startedAt);
    return null;
  }

  const target = {
    href: lessonHrefForSlug(targetLesson.slug),
    slug: targetLesson.slug,
    grade: targetLesson.grade,
    topicId: targetLesson.topic_id
  };
  logLessonPerf("getLessonEntryTarget", startedAt);
  return target;
}

function blockToLessonBlock(block: LessonBlockRecord): LessonBlock {
  return {
    id: block.id,
    type: block.type,
    title: { en: translateHjbHighDisplayTextEn(block.title_en), zh: block.title_zh },
    content: block.content_en || block.content_zh
      ? { en: translateHjbHighDisplayTextEn(block.content_en ?? ""), zh: block.content_zh ?? block.content_en ?? "" }
      : undefined,
    items: block.items?.map((item) => ({ ...item, en: translateHjbHighDisplayTextEn(item.en) })),
    visualizationConfig: block.visualization_config,
    practiceQuestionIds: block.practice_question_ids
  };
}

export async function getLessonBySlug(userId: string | null, slug: string, curriculumTrack: CurriculumScope = defaultCurriculumProfile): Promise<LessonDetail | null> {
  const startedAt = Date.now();
  const database = await readDatabase();
  const indexes = indexesForDatabase(database);
  let lesson = indexes.lessonBySlug.get(slug);
  if (!lesson) {
    logLessonPerf("getLessonBySlug", startedAt);
    return null;
  }

  let topicRecord = topicRecordForId(database, lesson.topic_id);
  if (!topicRecord) {
    logLessonPerf("getLessonBySlug", startedAt);
    return null;
  }
  let lessonScope = curriculumTrack;
  if (!isCurriculumTopic(topicRecord, curriculumTrack)) {
    const exactLessonProfile = normalizeStoredCurriculumProfile({
      curriculumTrack: topicRecord.curriculum_track,
      region: lesson.curriculum_region ?? topicRecord.curriculum_region,
      publisher: lesson.textbook_publisher ?? topicRecord.textbook_publisher
    });
    if (userId === null && curriculumContentEnabledFor(exactLessonProfile)) {
      lessonScope = exactLessonProfile;
    } else {
      const requestedCanonicalTopicId = lesson.canonical_topic_id ?? topicRecord.canonical_topic_id ?? lesson.topic_id;
      const profileLesson = (indexes.lessonsByCanonicalTopicId.get(requestedCanonicalTopicId) ?? []).find((candidate) => {
        const candidateTopic = topicRecordForId(database, candidate.topic_id);
        if (!candidateTopic || !isCurriculumTopic(candidateTopic, curriculumTrack)) return false;
        const candidateCanonicalTopicId = candidate.canonical_topic_id ?? candidateTopic.canonical_topic_id ?? candidate.topic_id;
        return candidateCanonicalTopicId === requestedCanonicalTopicId;
      });
      if (!profileLesson) {
        logLessonPerf("getLessonBySlug", startedAt);
        return null;
      }
      lesson = profileLesson;
      topicRecord = topicRecordForId(database, lesson.topic_id);
      if (!topicRecord) {
        logLessonPerf("getLessonBySlug", startedAt);
        return null;
      }
    }
  }

  const summary = lessonSummaryFor(database, userId, lesson);
  const blocks = (indexes.lessonBlocksBySlug.get(lesson.slug) ?? [])
    .map(blockToLessonBlock);
  const practiceIds = new Set(blocks.flatMap((block) => block.practiceQuestionIds ?? []));
  const practiceQuestions = Array.from(practiceIds)
    .map((questionId) => indexes.questionById.get(questionId))
    .filter((question): question is QuestionRecord => question ? isCurriculumQuestion(question, lessonScope) : false)
    .map((question) => toPublicQuestion(database, question));
  const progress = userId ? lessonProgressFor(database, userId, lesson) : null;

  const detail = {
    ...summary,
    blocks,
    practiceQuestions,
    topic: toTopicWithProgress(database, userId, topicRecord),
    checklistState: progress?.checklist_state ?? {}
  };
  logLessonPerf("getLessonBySlug", startedAt);
  return detail;
}

export async function updateLessonProgress({
  userId,
  slug,
  action,
  durationSeconds,
  checklistState,
	  curriculumTrack = defaultCurriculumTrack
	}: {
	  userId: string;
	  slug: string;
	  action: "start" | "update" | "complete";
	  durationSeconds?: number;
	  checklistState?: Record<string, boolean>;
	  curriculumTrack?: CurriculumScope;
}) {
  return mutateDatabase((database) => {
    const lesson = database.lessons.find((candidate) => candidate.slug === slug);
    if (!lesson) return null;
    const topic = topicRecordForId(database, lesson.topic_id);
    if (!topic || !isCurriculumTopic(topic, curriculumTrack)) return null;

    const now = new Date().toISOString();
    const existing = lessonProgressFor(database, userId, lesson);
    const nextChecklist = {
      ...(existing?.checklist_state ?? {}),
      ...(checklistState ?? {})
    };
    const nextDuration =
      typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0
        ? Math.round(durationSeconds)
        : existing?.duration_seconds ?? null;
    const status: TopicStatus =
      action === "complete" ? "completed" : existing?.status === "completed" ? "completed" : "in-progress";
    const mastery =
      status === "completed"
        ? Math.max(existing?.mastery ?? 0, 85)
        : Math.max(existing?.mastery ?? 0, Object.values(nextChecklist).filter(Boolean).length * 15, 25);

    const nextProgress: LessonProgressRecord = {
      user_id: userId,
      topic_id: lesson.topic_id,
      lesson_slug: lesson.slug,
      status,
      mastery: Math.min(100, mastery),
      started_at: existing?.started_at ?? now,
      completed_at: status === "completed" ? existing?.completed_at ?? now : null,
      duration_seconds: nextDuration,
      checklist_state: nextChecklist,
      updated_at: now
    };

    const index = database.lesson_progress.findIndex(
      (progress) =>
        progress.user_id === userId &&
        (progress.lesson_slug === lesson.slug || progress.topic_id === lesson.topic_id)
    );

    if (index >= 0) {
      database.lesson_progress[index] = nextProgress;
    } else {
      database.lesson_progress.push(nextProgress);
    }

    if (status === "completed") {
      const firstCompletion = existing?.status !== "completed";
      if (firstCompletion) {
        updateAdaptiveStateFromLessonOutcome(database, userId, lesson, nextProgress, now);
        invalidateAdaptiveRecommendationCache(database, userId, lesson.grade, lesson.topic_id);
      }

      completeMatchingAssignments({
        database,
        userId,
        contentType: "lesson",
        targetIds: [lesson.slug, lesson.topic_id],
        now,
        score: 100,
        graded: true,
        feedbackEn: "Marked complete from the linked lesson.",
        feedbackZh: "已按連結課節完成狀態記錄。"
      });

      if (firstCompletion) {
        awardAutomaticRewardOnce(database, {
          studentId: userId,
          reason: "lesson-complete",
          sourceKey: `lesson-complete:${userId}:${lesson.slug}`,
          label: {
            en: `Completed ${lesson.title_en}`,
            zh: `完成${lesson.title_zh}`
          },
          createdAt: now
        });
      }
    }

    return lessonSummaryFor(database, userId, lesson);
  });
}

export async function markVisualizationSession({
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
  return mutateDatabase((database) => {
    const now = new Date().toISOString();
    const existing = database.visualization_sessions.find(
      (session) => session.user_id === userId && session.module_id === moduleId
    );
    const wasCompleted = Boolean(existing?.completed_at);

    if (existing) {
      existing.topic_id = topicId;
      existing.source = source;
      existing.explored = true;
      existing.completed_at = existing.completed_at ?? now;
      existing.updated_at = now;
    } else {
      database.visualization_sessions.push({
        user_id: userId,
        module_id: moduleId,
        topic_id: topicId,
        source,
        explored: true,
        completed_at: now,
        updated_at: now
      });
    }

    completeMatchingAssignments({
      database,
      userId,
      contentType: "visualization",
      targetIds: [moduleId, topicId],
      now,
      score: 100,
      graded: true,
      feedbackEn: "Marked complete from the linked visualization session.",
      feedbackZh: "已按連結視覺化探索記錄完成。"
    });

    if (!wasCompleted) {
      const topic = topicRecordForId(database, topicId);
      const title = topic ? localizedTopic(topic) : { en: topicId, zh: topicId };
      awardAutomaticRewardOnce(database, {
        studentId: userId,
        reason: "visualization-complete",
        sourceKey: `visualization-complete:${userId}:${moduleId}`,
        label: {
          en: `Explored the ${title.en} visualization`,
          zh: `完成${title.zh}視覺化探索`
        },
        createdAt: now
      });
    }

    return database.visualization_sessions.find(
      (session) => session.user_id === userId && session.module_id === moduleId
    ) ?? null;
  });
}

function cleanTutorContextValue(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export async function recordAITutorMessage({
  userId,
  role,
  content,
  context
}: {
  userId: string;
  role: "student" | "tutor";
  content: string;
  context?: Record<string, unknown> | null;
}) {
  await mutateDatabase((database) => {
    database.ai_tutor_messages.push({
      id: randomUUID(),
      user_id: userId,
      role,
      content,
      context_json: cleanTutorContextValue(context),
      created_at: new Date().toISOString()
    });
  });
}

export async function recordAITutorUsage({
  userId,
  model,
  promptTokens,
  completionTokens,
  totalTokens,
  error
}: {
  userId: string;
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  error?: string | null;
}) {
  await mutateDatabase((database) => {
    database.ai_tutor_usage.push({
      id: randomUUID(),
      user_id: userId,
      model,
      prompt_tokens: promptTokens ?? null,
      completion_tokens: completionTokens ?? null,
      total_tokens: totalTokens ?? null,
      error: error ?? null,
      created_at: new Date().toISOString()
    });
  });
}

export async function getAITutorTokenUsageSince(userId: string, sinceIso: string) {
  const database = await readDatabase();
  return database.ai_tutor_usage
    .filter((usage) => usage.user_id === userId && usage.created_at >= sinceIso)
    .reduce((total, usage) => {
      if (typeof usage.total_tokens === "number") return total + usage.total_tokens;
      return total + (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);
    }, 0);
}

export type AITutorDataScope = "student-dashboard" | "teacher-dashboard" | "teacher-student-profile" | "adaptive-engine";

export type AITutorDatabaseContextOptions = {
  topicId?: string;
  questionId?: string;
  lessonSlug?: string;
  allowAnswerReference?: boolean;
  grade?: GradeId;
  language?: Language;
  page?: string;
  dataScopes?: AITutorDataScope[];
  targetStudentId?: string;
};

export type AITutorDatabaseContextResult = {
  text: string;
  deterministicSummary: string | null;
  includedScopes: AITutorDataScope[];
  deniedScopes: AITutorDataScope[];
  subjectUserId: string;
};

function addTutorScope(includedScopes: AITutorDataScope[], scope: AITutorDataScope) {
  if (!includedScopes.includes(scope)) includedScopes.push(scope);
}

function addDeniedTutorScope(deniedScopes: AITutorDataScope[], scope: AITutorDataScope) {
  if (!deniedScopes.includes(scope)) deniedScopes.push(scope);
}

function tutorText(value: LocalizedText, language: Language) {
  return textForLanguage(value, language);
}

function tutorTopicList(topics: Topic[], language: Language, limit = 4) {
  return topics
    .slice(0, limit)
    .map((topic) => `${tutorText(topic.title, language)} (${topic.mastery}%, ${topic.status})`)
    .join("; ");
}

function tutorSkillList(summaries: AdaptiveSkillSummary[], language: Language, limit = 3) {
  return summaries
    .slice(0, limit)
    .map((summary) => `${tutorText(summary.skill.title, language)} (${Math.round(summary.state.pMastery * 100)}%)`)
    .join("; ");
}

function tutorDashboardSummaryLines({
  dashboard,
  grade,
  language,
  learnerName
}: {
  dashboard: DashboardData;
  grade: GradeId;
  language: Language;
  learnerName: string;
}) {
  const lines = [
    `Student dashboard snapshot for ${learnerName}: ${formatGradeLabel(grade, language, true)}, streak ${dashboard.streakDays} days, overall mastery ${dashboard.overallMastery}%.`
  ];

  if (dashboard.progressMetrics.length) {
    lines.push(
      `Progress metrics: ${dashboard.progressMetrics.slice(0, 4).map((metric) => `${tutorText(metric.label, language)} ${metric.value} (${tutorText(metric.detail, language)})`).join("; ")}.`
    );
  }
  if (dashboard.recommendedLesson) {
    lines.push(`Recommended lesson: ${tutorText(dashboard.recommendedLesson.title, language)} (${dashboard.recommendedLesson.mastery}%, ${dashboard.recommendedLesson.status}).`);
  }
  if (dashboard.weakTopics.length) {
    lines.push(`Weak topics: ${tutorTopicList(dashboard.weakTopics, language)}.`);
  }
  if (dashboard.recentTopics.length) {
    lines.push(`Recent topics: ${tutorTopicList(dashboard.recentTopics, language, 3)}.`);
  }

  return lines;
}

function tutorTeacherDashboardSummaryLines(dashboard: TeacherDashboardData, language: Language) {
  const lines = [
    `Teacher dashboard snapshot for ${dashboard.teacher.name}: pending grading ${dashboard.kpis.pendingGrading}, unreplied messages ${dashboard.kpis.unrepliedMessages}, weekly completion ${dashboard.kpis.weeklyAssignmentCompletionRate}%, students needing attention ${dashboard.kpis.atRiskStudents}.`,
    `Reward queue: pending approvals ${dashboard.rewardSummary.pendingRedemptions}, approved gifts ${dashboard.rewardSummary.approvedRedemptions}, points awarded this week ${dashboard.rewardSummary.pointsAwardedThisWeek}.`
  ];

  if (dashboard.classSummaries.length) {
    lines.push(
      `Class focus: ${dashboard.classSummaries.slice(0, 4).map((item) => `${item.className} (${formatGradeLabel(item.grade, language, true)}): ${item.averageMastery}% mastery, ${item.atRiskStudents} attention`).join("; ")}.`
    );
  }

  const heatmapGaps = dashboard.masteryHeatmap
    .filter((cell) => cell.weakStudentCount > 0 || cell.averageMastery < 65)
    .sort((a, b) => a.averageMastery - b.averageMastery || b.weakStudentCount - a.weakStudentCount)
    .slice(0, 4);
  if (heatmapGaps.length) {
    lines.push(
      `Mastery gaps: ${heatmapGaps.map((cell) => `${cell.className} ${tutorText(cell.topicTitle, language)} ${cell.averageMastery}% avg, ${cell.weakStudentCount}/${cell.studentCount} below 60%`).join("; ")}.`
    );
  }

  if (dashboard.actionQueue.length) {
    lines.push(
      `Top action queue: ${dashboard.actionQueue.slice(0, 5).map((item) => `${item.priority} ${item.type}: ${tutorText(item.title, language)} - ${tutorText(item.description, language)}`).join("; ")}.`
    );
  }

  return lines;
}

function tutorStudentProfileSummaryLines(profile: TeacherStudentProfileData, language: Language) {
  const activeMistakes = profile.mistakes.filter((item) => !item.mastered);
  const openAssignments = profile.assignments.filter(({ submission }) => submission?.status !== "submitted" && submission?.status !== "graded");
  const lines = [
    `Teacher-visible student profile: ${profile.student.name}, ${formatGradeLabel(profile.student.grade, language, true)}, average mastery ${profile.averageMastery}%, active mistakes ${activeMistakes.length}, recent activity ${profile.recentActivityAt ?? "none saved"}.`,
    `AI Tutor use: ${profile.aiTutor.messageCount7d} messages in 7 days, last message ${profile.aiTutor.lastMessageAt ?? "none"}.`
  ];

  if (profile.progress.length) {
    lines.push(
      `Lowest progress areas: ${profile.progress.slice(0, 5).map((item) => `${tutorText(item.title, language)} ${item.mastery}% (${item.status})`).join("; ")}.`
    );
  }
  if (activeMistakes.length) {
    lines.push(
      `Active mistakes: ${activeMistakes.slice(0, 4).map((item) => `${tutorText(item.question.topic, language)} (${item.wrongAttempts} wrong attempts)`).join("; ")}.`
    );
  }
  if (profile.recentAttempts.length) {
    lines.push(
      `Recent attempts: ${profile.recentAttempts.slice(0, 5).map((attempt) => `${tutorText(attempt.topic, language)} ${attempt.isCorrect ? "correct" : "wrong"}`).join("; ")}.`
    );
  }
  if (openAssignments.length) {
    lines.push(
      `Open assignments: ${openAssignments.slice(0, 4).map(({ assignment, submission }) => `${tutorText(assignment.title, language)} (${submission?.status ?? "not-started"})`).join("; ")}.`
    );
  }

  return lines;
}

function tutorAdaptiveSummaryLines({
  decision,
  language,
  learnerName
}: {
  decision: AdaptiveLearningDecision;
  language: Language;
  learnerName: string;
}) {
  const lines = [
    `Adaptive engine snapshot for ${learnerName}: action ${decision.action}, confidence ${decision.confidence}, focus skill ${tutorText(decision.skill.title, language)}, topic ${tutorText(decision.topic.title, language)}.`,
    `Engine status: ${decision.engine.mode}, LLM status ${decision.engine.llmStatus}.`
  ];

  if (decision.lesson) {
    lines.push(`Linked lesson: ${tutorText(decision.lesson.title, language)} (${decision.lesson.status}, mastery ${decision.lesson.mastery}%).`);
  }
  if (decision.explanation) {
    lines.push(`Learner-facing reason: ${tutorText(decision.explanation, language)}.`);
  }
  if (decision.evidence.length) {
    lines.push(
      `Evidence: ${decision.evidence.slice(0, 4).map((item) => `${tutorText(item.label, language)} ${item.value} - ${tutorText(item.detail, language)}`).join("; ")}.`
    );
  }
  if (decision.dueReviews.length) {
    lines.push(`Due reviews: ${tutorSkillList(decision.dueReviews, language)}.`);
  }
  if (decision.engine.teacherAuditNote) {
    lines.push(`Teacher audit note: ${tutorText(decision.engine.teacherAuditNote, language)}.`);
  }
  if (decision.engine.aiConfidence) {
    lines.push(`AI confidence: ${Math.round(decision.engine.aiConfidence.score * 100)}% - ${tutorText(decision.engine.aiConfidence.label, language)}; ${tutorText(decision.engine.aiConfidence.criteria, language)}.`);
  }
  if (decision.engine.signalsUsed?.length) {
    lines.push(`Signals used: ${decision.engine.signalsUsed.slice(0, 6).join(", ")}.`);
  }
  if (decision.skillMap.length) {
    lines.push(`Skill mastery map: ${tutorSkillList(decision.skillMap, language, 5)}.`);
  }

  return lines;
}

export async function buildAITutorDatabaseContext(
  userId: string,
  context?: AITutorDatabaseContextOptions
): Promise<AITutorDatabaseContextResult> {
  const database = await readDatabase();
  const lines: string[] = ["Database-backed personalization:"];
  const fallbackLines: string[] = [];
  const includedScopes: AITutorDataScope[] = [];
  const deniedScopes: AITutorDataScope[] = [];
  const requestedTopicId = context?.topicId;
  const requestedQuestion = context?.questionId ? questionForId(database, context.questionId) : null;
  const language = context?.language ?? "en";
  const user = database.users.find((candidate) => candidate.id === userId) ?? null;
  const authenticated = user ? toAuthenticatedUser(database, user) : null;
  const scopeSet = new Set(context?.dataScopes ?? []);
  const targetStudentId = context?.targetStudentId?.trim();
  let verifiedTargetProfile: TeacherStudentProfileData | null = null;
  let subjectUserId = userId;
  let subjectName = authenticated?.user.name ?? userId;
  let subjectGrade = context?.grade ?? authenticated?.settings.selectedGrade ?? authenticated?.user.grade ?? "S3";
  let subjectCurriculumTrack = authenticated?.user.curriculumTrack ?? defaultCurriculumTrack;

  if (targetStudentId) {
    if (user?.role === "student" && targetStudentId === userId) {
      subjectUserId = userId;
    } else if (user && canUseTeacherArea(user)) {
      verifiedTargetProfile = await getTeacherStudentProfileData(userId, targetStudentId);
      if (verifiedTargetProfile) {
        subjectUserId = verifiedTargetProfile.student.id;
        subjectName = verifiedTargetProfile.student.name;
        subjectGrade = context?.grade ?? verifiedTargetProfile.student.grade;
        subjectCurriculumTrack = verifiedTargetProfile.student.curriculumTrack;
      }
    }
  }

  lines.push(
    `Curriculum track: ${subjectCurriculumTrack}`,
    subjectCurriculumTrack === "MAINLAND_PEP_HIGH"
      ? "Curriculum language policy: use Mainland mathematics terminology and Simplified Chinese when Chinese wording is helpful."
      : "Curriculum language policy: use Hong Kong mathematics terminology where helpful."
  );

  const requestedTopic = requestedTopicId ? topicRecordForId(database, requestedTopicId) : null;
  const topicId = requestedTopic && isCurriculumTopic(requestedTopic, subjectCurriculumTrack) ? requestedTopic.id : undefined;
  const question = requestedQuestion && isCurriculumQuestion(requestedQuestion, subjectCurriculumTrack) ? requestedQuestion : null;

  if (question) {
    lines.push(
      `Current question: ${question.prompt_en}`,
      `Question topic: ${topicLabelFor(database, question).en}`
    );

    if (context?.allowAnswerReference) {
      lines.push(
        `Correct answer for tutor reference: ${question.answer}`,
        `Explanation: ${question.explanation_en}`
      );
    } else {
      lines.push("Do not reveal the final answer immediately. Guide with hints, checks, and a similar example first.");
    }
  }

  const relevantLesson = context?.lessonSlug
    ? database.lessons.find((lesson) => {
        if (lesson.slug !== context.lessonSlug) return false;
        const lessonTopic = topicRecordForId(database, lesson.topic_id);
        return Boolean(lessonTopic && isCurriculumTopic(lessonTopic, subjectCurriculumTrack));
      })
    : topicId
      ? lessonForTopic(database, topicId)
      : null;
  if (relevantLesson) {
    const progress = lessonProgressFor(database, userId, relevantLesson);
    lines.push(
      `Current lesson: ${relevantLesson.title_en}`,
      `Lesson progress: ${progress?.status ?? "not-started"}, mastery ${progress?.mastery ?? 0}%`
    );
  }

  const recentAttempts = database.attempts
    .filter((attempt) => {
      const attemptedQuestion = questionForId(database, attempt.question_id);
      return (
        attempt.user_id === userId &&
        Boolean(attemptedQuestion && isCurriculumQuestion(attemptedQuestion, subjectCurriculumTrack)) &&
        (!topicId || attemptedQuestion?.topic_id === topicId)
      );
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);
  if (recentAttempts.length) {
    lines.push("Recent attempts:");
    recentAttempts.forEach((attempt) => {
      const attemptedQuestion = questionForId(database, attempt.question_id);
      lines.push(
        `- ${attemptedQuestion ? topicLabelFor(database, attemptedQuestion).en : attempt.question_id}: ${attempt.is_correct ? "correct" : "wrong"}; selected "${attempt.selected_answer}"; ${attempt.duration_seconds ?? "unknown"}s`
      );
    });
  }

  const recentMistakes = database.mistakes
    .filter((mistake) => {
      const mistakenQuestion = questionForId(database, mistake.question_id);
      return (
        mistake.user_id === userId &&
        !mistake.mastered &&
        Boolean(mistakenQuestion && isCurriculumQuestion(mistakenQuestion, subjectCurriculumTrack)) &&
        (!topicId || mistakenQuestion?.topic_id === topicId)
      );
    })
    .sort((a, b) => b.last_attempt_at.localeCompare(a.last_attempt_at))
    .slice(0, 3);
  if (recentMistakes.length) {
    lines.push("Active mistake book items:");
    recentMistakes.forEach((mistake) => {
      const mistakenQuestion = questionForId(database, mistake.question_id);
      lines.push(
        `- ${mistakenQuestion?.prompt_en ?? mistake.question_id}; last selected "${mistake.last_selected_answer}"; wrong attempts ${mistake.wrong_attempts}`
      );
    });
  }

  const recentTutorMessages = database.ai_tutor_messages
    .filter((message) => message.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6)
    .reverse();
  if (recentTutorMessages.length) {
    lines.push("Recent tutor conversation stored on server:");
    recentTutorMessages.forEach((message) => {
      lines.push(`- ${message.role}: ${message.content.slice(0, 220)}`);
    });
  }

  if (scopeSet.has("student-dashboard")) {
    const canReadOwnDashboard = user?.role === "student" && (!targetStudentId || targetStudentId === userId);
    const canReadTargetDashboard = Boolean(verifiedTargetProfile);
    if (canReadOwnDashboard || canReadTargetDashboard) {
      const dashboard = await getDashboardData(subjectUserId, subjectGrade, subjectCurriculumTrack);
      const dashboardLines = tutorDashboardSummaryLines({
        dashboard,
        grade: subjectGrade,
        language,
        learnerName: subjectName
      });
      lines.push("Authorized student dashboard context:", ...dashboardLines);
      fallbackLines.push(...dashboardLines);
      addTutorScope(includedScopes, "student-dashboard");
    } else {
      lines.push("Denied context scope: student-dashboard. The signed-in user is not authorized to read that student dashboard.");
      fallbackLines.push("Student dashboard: access was not authorized for the requested student.");
      addDeniedTutorScope(deniedScopes, "student-dashboard");
    }
  }

  if (scopeSet.has("teacher-dashboard")) {
    if (user && canUseTeacherArea(user)) {
      const dashboard = await getTeacherDashboardData(userId);
      if (dashboard) {
        const dashboardLines = tutorTeacherDashboardSummaryLines(dashboard, language);
        lines.push("Authorized teacher dashboard context:", ...dashboardLines);
        fallbackLines.push(...dashboardLines);
        addTutorScope(includedScopes, "teacher-dashboard");
      }
    } else {
      lines.push("Denied context scope: teacher-dashboard. Teacher or admin access is required.");
      fallbackLines.push("Teacher dashboard: teacher or admin access is required.");
      addDeniedTutorScope(deniedScopes, "teacher-dashboard");
    }
  }

  if (scopeSet.has("teacher-student-profile")) {
    if (verifiedTargetProfile) {
      const profileLines = tutorStudentProfileSummaryLines(verifiedTargetProfile, language);
      lines.push("Authorized teacher-visible student profile context:", ...profileLines);
      fallbackLines.push(...profileLines);
      addTutorScope(includedScopes, "teacher-student-profile");
    } else {
      lines.push("Denied context scope: teacher-student-profile. Teacher/admin access to the requested student was not verified.");
      fallbackLines.push("Teacher-visible student profile: access was not authorized for the requested student.");
      addDeniedTutorScope(deniedScopes, "teacher-student-profile");
    }
  }

  if (scopeSet.has("adaptive-engine")) {
    const canReadOwnAdaptive = user?.role === "student" && (!targetStudentId || targetStudentId === userId);
    const canReadTargetAdaptive = Boolean(verifiedTargetProfile);
    if (canReadOwnAdaptive || canReadTargetAdaptive) {
      const decision = await getAdaptiveLearningDecision({
        userId: subjectUserId,
        grade: subjectGrade,
        topicId,
        curriculumTrack: subjectCurriculumTrack
      });
      if (decision) {
        const adaptiveLines = tutorAdaptiveSummaryLines({ decision, language, learnerName: subjectName });
        lines.push("Authorized adaptive engine context:", ...adaptiveLines);
        fallbackLines.push(...adaptiveLines);
        addTutorScope(includedScopes, "adaptive-engine");
      } else {
        lines.push("Adaptive engine context: no adaptive decision is currently available for the authorized student and grade.");
        fallbackLines.push("Adaptive engine: no current adaptive decision is available for the authorized student and grade.");
        addTutorScope(includedScopes, "adaptive-engine");
      }
    } else {
      lines.push("Denied context scope: adaptive-engine. A student learner or verified teacher-visible student target is required.");
      fallbackLines.push("Adaptive engine: access requires the learner's own session or a verified teacher-visible student target.");
      addDeniedTutorScope(deniedScopes, "adaptive-engine");
    }
  }

  return {
    text: lines.join("\n"),
    deterministicSummary: fallbackLines.length ? fallbackLines.join("\n") : null,
    includedScopes,
    deniedScopes,
    subjectUserId
  };
}

export function isValidQuestionFilter(value: unknown): value is {
  grade?: GradeId;
  difficulty?: Difficulty;
  topicId?: string;
  curriculumTrack?: CurriculumTrack;
} {
  const filter = value as { grade?: unknown; difficulty?: unknown; topicId?: unknown; curriculumTrack?: unknown } | null;
  return (
    (!filter?.grade || validGrades.has(filter.grade as GradeId)) &&
    (!filter?.difficulty || validDifficulties.has(filter.difficulty as Difficulty)) &&
    (!filter?.topicId || typeof filter.topicId === "string") &&
    (!filter?.curriculumTrack || validCurriculumTracks.has(filter.curriculumTrack as CurriculumTrack))
  );
}
