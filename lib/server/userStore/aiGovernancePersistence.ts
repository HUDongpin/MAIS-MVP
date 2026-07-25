import { validGradeSet } from "@/data/grades";
import {
  defaultClassAiTutorPerStudentHourLimit,
  defaultClassAiTutorPerStudentMinuteLimit,
  evaluateAiCapabilityRateLimit,
  mergeClassAiTutorPoliciesByStrictest,
  normalizeClassAiTutorHourLimit,
  normalizeClassAiTutorLiveMode,
  normalizeClassAiTutorMinuteLimit,
  normalizeClassAiTutorMode,
  summarizeAiGovernanceEvents,
  type AiCapability,
  type AiCapabilityRateLimitDecision,
  type AiCapabilityRateLimitRule,
  type AiGovernanceAuditAction
} from "@/lib/server/aiGovernance";
import { formatGradeLabel, textForLanguage } from "@/lib/i18n";
import type {
  AdaptiveEngineErrorKind,
  AdaptiveLearningDecision,
  AdaptiveLLMRecommendation,
  AdaptiveLLMStatus,
  AdaptiveSkillState,
  AdaptiveSkillSummary,
  ClassAiTutorMode,
  ClassAiTutorPolicy,
  CurriculumProfile,
  CurriculumTrack,
  DashboardData,
  GradeId,
  Language,
  LocalizedText,
  ParentSafeTeacherDraft,
  PilotPlatformEvent,
  PilotPlatformGuard,
  PilotPlatformLoopData,
  PilotPlatformRole,
  PilotTeacherReviewQueueItem,
  TeacherNotice,
  TeacherDashboardData,
  TeacherReviewLessonStatus,
  TeacherStudentProfileData,
  Topic
} from "@/types";

type UserRole = "student" | "teacher" | "parent" | "admin";

type AITutorMessageRecord = {
  id: string;
  user_id: string;
  role: "student" | "tutor";
  content: string;
  context_json: Record<string, unknown> | null;
  created_at: string;
};

type AITutorUsageRecord = {
  id: string;
  user_id: string;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  error: string | null;
  created_at: string;
};

export function normalizeAiGovernanceTutorMessageRecords<Record extends AITutorMessageRecord>(
  records?: Record[]
): Record[] {
  return records ?? [];
}

export function normalizeAiGovernanceTutorUsageRecords<Record extends AITutorUsageRecord>(
  records?: Record[]
): Record[] {
  return records ?? [];
}

type AiTutorRecentAttemptRecord = {
  created_at: string;
  duration_seconds?: number | null;
  is_correct: boolean;
  question_id: string;
  selected_answer: string;
  user_id: string;
};

type AiTutorRecentMistakeRecord = {
  last_attempt_at: string;
  last_selected_answer: string;
  mastered: boolean;
  question_id: string;
  user_id: string;
  wrong_attempts: number;
};

export type AIGovernanceEventRecord = {
  id: string;
  user_id: string;
  capability: AiCapability;
  action: AiGovernanceAuditAction;
  reason: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

const aiCapabilitySet = new Set<AiCapability>([
  "ai-tutor-chat",
  "ai-tutor-ocr",
  "ai-tutor-speech",
  "ai-tutor-voice",
  "lesson-audio",
  "profile-avatar",
  "assignment-image",
  "classroom-work-sample"
]);
const aiGovernanceActionSet = new Set<AIGovernanceEventRecord["action"]>([
  "classroom-policy-blocked",
  "request-admitted",
  "rate-limit-blocked",
  "media-policy-blocked",
  "content-safety-flagged"
]);
const adaptiveLLMStatusSet = new Set<AdaptiveLLMStatus>(["disabled", "pending", "ready", "failed", "rejected"]);
const adaptiveEngineErrorKindSet = new Set<AdaptiveEngineErrorKind>(["configuration", "format", "guardrail", "provider", "rate-limit"]);

export function normalizeAiGovernanceAdaptiveLLMStatus(status: unknown): AdaptiveLLMStatus {
  return adaptiveLLMStatusSet.has(status as AdaptiveLLMStatus) ? status as AdaptiveLLMStatus : "failed";
}

export function normalizeAiGovernanceAdaptiveEngineErrorKind(errorKind: unknown): AdaptiveEngineErrorKind | null {
  return typeof errorKind === "string" && adaptiveEngineErrorKindSet.has(errorKind as AdaptiveEngineErrorKind)
    ? errorKind as AdaptiveEngineErrorKind
    : null;
}

function isAiGovernanceLocalizedRecord(value: unknown): value is LocalizedText {
  const text = value as Partial<LocalizedText> | null;
  return typeof text?.en === "string" && text.en.trim().length > 0 && typeof text.zh === "string" && text.zh.trim().length > 0;
}

export function normalizeAiGovernanceCachedLLMRecommendation(value: unknown): AdaptiveLLMRecommendation | null {
  const recommendation = value as Partial<AdaptiveLLMRecommendation> | null;
  if (
    typeof recommendation?.selectedCandidateId !== "string" ||
    !isAiGovernanceLocalizedRecord(recommendation.learnerReason) ||
    !isAiGovernanceLocalizedRecord(recommendation.teacherAuditNote) ||
    !isAiGovernanceLocalizedRecord(recommendation.confidenceExplanation) ||
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

export type AiGovernanceAdaptiveRecommendationCacheRecord = {
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

type AiGovernanceTeacherClassRecord = {
  id: string;
  teacher_id: string;
  updated_at?: string;
};

type AiGovernanceClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type AiGovernanceClassCollaboratorRecord = {
  class_id: string;
  teacher_id: string;
  role: "owner" | "co-teacher" | "viewer";
  status: "active" | "revoked";
};

export type ClassAiTutorPolicyRecord = {
  class_id: string;
  mode: ClassAiTutorMode;
  previous_live_mode: Exclude<ClassAiTutorMode, "fallback-only"> | null;
  per_student_minute_limit: number;
  per_student_hour_limit: number;
  fallback_on_failure: true;
  updated_by: string;
  updated_at: string;
};

export function defaultClassAiTutorPolicyRecord({
  classId,
  now,
  updatedBy
}: {
  classId: string;
  now: string;
  updatedBy: string;
}): ClassAiTutorPolicyRecord {
  return {
    class_id: classId,
    mode: "open",
    previous_live_mode: "open",
    per_student_minute_limit: defaultClassAiTutorPerStudentMinuteLimit,
    per_student_hour_limit: defaultClassAiTutorPerStudentHourLimit,
    fallback_on_failure: true,
    updated_by: updatedBy,
    updated_at: now
  };
}

export function normalizeClassAiTutorPolicyRecord(
  value: unknown,
  now = new Date().toISOString()
): ClassAiTutorPolicyRecord | null {
  const record = typeof value === "object" && value !== null ? value as Partial<ClassAiTutorPolicyRecord> : null;
  if (!record || typeof record.class_id !== "string" || !record.class_id.trim()) return null;
  const mode = normalizeClassAiTutorMode(record.mode);
  const previousLiveMode = normalizeClassAiTutorLiveMode(record.previous_live_mode)
    ?? (mode === "fallback-only" ? "open" : mode);

  return {
    class_id: record.class_id.trim(),
    mode,
    previous_live_mode: previousLiveMode,
    per_student_minute_limit: normalizeClassAiTutorMinuteLimit(record.per_student_minute_limit),
    per_student_hour_limit: normalizeClassAiTutorHourLimit(record.per_student_hour_limit),
    fallback_on_failure: true,
    updated_by: typeof record.updated_by === "string" && record.updated_by.trim() ? record.updated_by.trim() : "system",
    updated_at: typeof record.updated_at === "string" && record.updated_at.trim() ? record.updated_at : now
  };
}

export function normalizeClassAiTutorPolicyRecords(
  records: ClassAiTutorPolicyRecord[] | undefined,
  now = new Date().toISOString()
) {
  const byClass = new Map<string, ClassAiTutorPolicyRecord>();
  for (const record of records ?? []) {
    const normalized = normalizeClassAiTutorPolicyRecord(record, now);
    if (normalized) byClass.set(normalized.class_id, normalized);
  }
  return Array.from(byClass.values());
}

export function classAiTutorPolicyRecordToPublic(record: ClassAiTutorPolicyRecord): ClassAiTutorPolicy {
  return {
    classId: record.class_id,
    mode: record.mode,
    previousLiveMode: record.previous_live_mode,
    perStudentMinuteLimit: record.per_student_minute_limit,
    perStudentHourLimit: record.per_student_hour_limit,
    fallbackOnFailure: true,
    updatedBy: record.updated_by,
    updatedAt: record.updated_at
  };
}

export function normalizeAiGovernanceAdaptiveRecommendationCacheRecords(
  existingRecords: AiGovernanceAdaptiveRecommendationCacheRecord[] | undefined,
  now: string
) {
  return (existingRecords ?? [])
    .filter((record) =>
      typeof record.id === "string" &&
      typeof record.user_id === "string" &&
      validGradeSet.has(record.grade) &&
      typeof record.candidate_signature === "string"
    )
    .map((record): AiGovernanceAdaptiveRecommendationCacheRecord => {
      const status = normalizeAiGovernanceAdaptiveLLMStatus(record.status);
      return {
        id: record.id,
        user_id: record.user_id,
        grade: record.grade,
        topic_id: typeof record.topic_id === "string" && record.topic_id ? record.topic_id : null,
        candidate_signature: record.candidate_signature,
        status,
        selected_candidate_id: typeof record.selected_candidate_id === "string" ? record.selected_candidate_id : null,
        question_ids: Array.isArray(record.question_ids) ? record.question_ids.filter((questionId): questionId is string => typeof questionId === "string") : [],
        recommendation_json: normalizeAiGovernanceCachedLLMRecommendation(record.recommendation_json),
        provider: typeof record.provider === "string" ? record.provider : null,
        model: typeof record.model === "string" ? record.model : null,
        prompt_tokens: typeof record.prompt_tokens === "number" && Number.isFinite(record.prompt_tokens) ? Math.max(0, Math.round(record.prompt_tokens)) : null,
        completion_tokens: typeof record.completion_tokens === "number" && Number.isFinite(record.completion_tokens) ? Math.max(0, Math.round(record.completion_tokens)) : null,
        total_tokens: typeof record.total_tokens === "number" && Number.isFinite(record.total_tokens) ? Math.max(0, Math.round(record.total_tokens)) : null,
        error: typeof record.error === "string" ? record.error : null,
        error_kind: normalizeAiGovernanceAdaptiveEngineErrorKind(record.error_kind),
        finish_reason: typeof record.finish_reason === "string" ? record.finish_reason : null,
        created_at: typeof record.created_at === "string" ? record.created_at : now,
        updated_at: typeof record.updated_at === "string" ? record.updated_at : now
      };
    });
}

export type AiGovernancePersistenceDatabase = {
  ai_governance_events: AIGovernanceEventRecord[];
  ai_tutor_messages: AITutorMessageRecord[];
  ai_tutor_usage: AITutorUsageRecord[];
  class_ai_tutor_policies?: ClassAiTutorPolicyRecord[];
  class_enrollments?: AiGovernanceClassEnrollmentRecord[];
  teacher_class_collaborators?: AiGovernanceClassCollaboratorRecord[];
  teacher_classes?: AiGovernanceTeacherClassRecord[];
  users: Array<{ id: string; role: UserRole }>;
};

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

type AiTutorDatabaseContextAuthenticatedUser = {
  settings?: {
    selectedGrade?: GradeId;
  };
  user?: {
    curriculumTrack?: CurriculumTrack;
    grade?: GradeId;
    name?: string;
  };
};

type AiTutorDatabaseContextSubjectInput = {
  authenticated?: AiTutorDatabaseContextAuthenticatedUser | null;
  context?: Pick<AITutorDatabaseContextOptions, "grade" | "targetStudentId">;
  defaultCurriculumTrack: CurriculumTrack;
  resolveTeacherStudentProfile?: (
    teacherId: string,
    studentId: string
  ) => TeacherStudentProfileData | null | Promise<TeacherStudentProfileData | null>;
  user?: { role: UserRole } | null;
  userId: string;
};

type AiTutorDatabaseContextSubject = {
  subjectCurriculumTrack: CurriculumTrack;
  subjectGrade: GradeId;
  subjectName: string;
  subjectUserId: string;
  targetStudentId: string | undefined;
  verifiedTargetProfile: TeacherStudentProfileData | null;
};

type AiGovernancePilotActor = {
  id: string;
  role: UserRole;
};

type AiGovernancePilotAuthenticatedUser = {
  settings: {
    selectedGrade: GradeId;
  };
  user: {
    curriculumProfile: CurriculumProfile;
  };
};

export type AiGovernancePilotPlatformLoopBuilderDependencies<Database, User extends AiGovernancePilotActor> = {
  adaptiveStatesForUser: (database: Database, userId: string) => AdaptiveSkillState[];
  canUseParentArea: (user: User) => boolean;
  canUseTeacherArea: (user: User) => boolean;
  getAdaptiveLearningDecision: (input: {
    userId: string;
    grade: GradeId;
    curriculumTrack: CurriculumProfile;
  }) => AdaptiveLearningDecision | null | Promise<AdaptiveLearningDecision | null>;
  knowledgeComponentsForDatabase: (
    database: Database,
    grade: GradeId,
    curriculumProfile: CurriculumProfile
  ) => Array<{ id: string }>;
  now?: () => Date;
  parentSafeDraftsForPilot: (database: Database, user: User) => ParentSafeTeacherDraft[];
  teacherReviewQueueForPilot: (database: Database, user: User) => PilotTeacherReviewQueueItem[];
  toAuthenticatedUser: (database: Database, user: User) => AiGovernancePilotAuthenticatedUser | null;
  userForId: (database: Database, userId: string) => User | null | undefined;
};

type AiGovernanceParentSafeDraftNoticeRecord = {
  id: string;
  status: string;
  source_kind?: string | null;
  source_id?: string | null;
  updated_at: string;
};

type AiGovernanceParentSafeDraftRecipientRecord = {
  guardian_id?: string | null;
  notice_id: string;
  status: string;
  student_id: string;
};

type AiGovernanceParentSafeDraftDatabase = {
  teacher_notice_recipients: AiGovernanceParentSafeDraftRecipientRecord[];
  teacher_notices: AiGovernanceParentSafeDraftNoticeRecord[];
};

type AiGovernanceTeacherReviewQueueRecord = {
  id: string;
  assessment_id: string;
  class_id: string;
  source_snapshot: {
    className: string;
  };
  title_en: string;
  title_zh: string;
  status: TeacherReviewLessonStatus;
  generated_at: string;
  reviewed_at: string | null;
  updated_at: string;
};

export function aiGovernancePilotGuard(
  allowed: boolean,
  visibility: PilotPlatformGuard["visibility"],
  reason: LocalizedText
): PilotPlatformGuard {
  return { allowed, visibility, reason };
}

export function aiGovernancePilotRoleFor(user: Pick<AiGovernancePilotActor, "role">): PilotPlatformRole {
  if (user.role === "teacher" || user.role === "parent" || user.role === "admin") return user.role;
  return "student";
}

export function aiGovernanceLatestAdaptiveTransitionAt(states: AdaptiveSkillState[]) {
  return states
    .map((state) => state.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

export function aiGovernanceNextAdaptiveReviewAt(states: AdaptiveSkillState[]) {
  return states
    .map((state) => state.nextReviewAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
}

function aiGovernancePilotLearnerEventId(userId: string, type: PilotPlatformEvent["type"], timestamp: string | null) {
  return `pilot-${type}-${userId}-${timestamp ?? "pending"}`;
}

export function aiGovernancePilotLearnerEvents({
  user,
  decision,
  lastTransitionAt,
  now = new Date().toISOString()
}: {
  user: AiGovernancePilotActor;
  decision: AdaptiveLearningDecision | null;
  lastTransitionAt: string | null;
  now?: string;
}): PilotPlatformEvent[] {
  const events: PilotPlatformEvent[] = [];

  if (decision) {
    events.push({
      id: aiGovernancePilotLearnerEventId(user.id, "adaptive-decision-requested", decision.generatedAt),
      type: "adaptive-decision-requested",
      actorRole: "student",
      actorId: user.id,
      studentId: user.id,
      adaptiveAction: decision.action,
      generatedAt: decision.generatedAt,
      summary: {
        en: `Adaptive engine selected ${decision.action} for ${decision.topic.title.en}.`,
        zh: `適性引擎為${decision.topic.title.zh}選擇了 ${decision.action}。`
      }
    });
  }

  if (lastTransitionAt) {
    events.push({
      id: aiGovernancePilotLearnerEventId(user.id, "adaptive-state-transitioned", lastTransitionAt),
      type: "adaptive-state-transitioned",
      actorRole: "student",
      actorId: user.id,
      studentId: user.id,
      adaptiveAction: decision?.action,
      generatedAt: lastTransitionAt,
      summary: {
        en: "Learner state updated from a saved attempt or lesson completion.",
        zh: "學習者狀態已由已儲存作答或課節完成紀錄更新。"
      }
    });
  } else if (!decision) {
    events.push({
      id: aiGovernancePilotLearnerEventId(user.id, "adaptive-decision-requested", now),
      type: "adaptive-decision-requested",
      actorRole: "student",
      actorId: user.id,
      studentId: user.id,
      generatedAt: now,
      summary: {
        en: "No adaptive decision is available for this guarded pilot scope yet.",
        zh: "此受保護試點範圍暫未有適性決策。"
      }
    });
  }

  return events;
}

export function aiGovernancePilotEventsForTeacherQueue(
  user: AiGovernancePilotActor,
  queue: PilotTeacherReviewQueueItem[]
): PilotPlatformEvent[] {
  return queue.flatMap((item): PilotPlatformEvent[] => {
    const generated: PilotPlatformEvent = {
      id: `pilot-teacher-review-generated-${item.reviewLessonId}`,
      type: "teacher-review-generated",
      actorRole: aiGovernancePilotRoleFor(user),
      actorId: user.id,
      classId: item.classId,
      reviewLessonId: item.reviewLessonId,
      generatedAt: item.generatedAt,
      summary: {
        en: `Review lesson generated for ${item.className}.`,
        zh: `已為 ${item.className} 生成講評方案。`
      }
    };
    const reviewed = item.reviewedAt
      ? [{
          id: `pilot-teacher-review-approved-${item.reviewLessonId}`,
          type: "teacher-review-approved" as const,
          actorRole: aiGovernancePilotRoleFor(user),
          actorId: user.id,
          classId: item.classId,
          reviewLessonId: item.reviewLessonId,
          generatedAt: item.reviewedAt,
          summary: {
            en: `Teacher approved ${item.title.en}.`,
            zh: `教師已審核${item.title.zh}。`
          }
        }]
      : [];
    const published = item.parentSafeDraft
      ? [{
          id: `pilot-parent-safe-draft-published-${item.parentSafeDraft.noticeId}`,
          type: "parent-safe-draft-published" as const,
          actorRole: aiGovernancePilotRoleFor(user),
          actorId: user.id,
          classId: item.classId,
          reviewLessonId: item.reviewLessonId,
          noticeId: item.parentSafeDraft.noticeId,
          generatedAt: item.parentSafeDraft.publishedAt ?? item.generatedAt,
          summary: {
            en: "Parent-safe teacher-approved draft is visible to linked guardians.",
            zh: "家長安全版本已對已連結監護人可見。"
          }
        }]
      : [];

    return [generated, ...reviewed, ...published];
  });
}

export function aiGovernanceTeacherReviewQueueForPilot(
  records: AiGovernanceTeacherReviewQueueRecord[],
  helpers: {
    canAccessClass: (classId: string) => boolean;
    parentSafeDraftForReviewLesson: (reviewLessonId: string) => ParentSafeTeacherDraft | null;
  }
): PilotTeacherReviewQueueItem[] {
  return records
    .filter((record) => helpers.canAccessClass(record.class_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 20)
    .map((record) => ({
      reviewLessonId: record.id,
      assessmentId: record.assessment_id,
      classId: record.class_id,
      className: record.source_snapshot.className,
      title: { en: record.title_en, zh: record.title_zh, zhHans: record.title_zh },
      status: record.status,
      generatedAt: record.generated_at,
      reviewedAt: record.reviewed_at,
      parentSafeDraft: helpers.parentSafeDraftForReviewLesson(record.id),
      guard: aiGovernancePilotGuard(
        record.status === "reviewed",
        record.status === "reviewed" ? "teacher-reviewed" : "blocked",
        record.status === "reviewed"
          ? {
              en: "Teacher-reviewed and eligible for parent-safe publication.",
              zh: "已由教師審核，可發佈家長安全版本。"
            }
          : {
              en: "Teacher review must be completed before parents can see a safe draft.",
              zh: "必須完成教師審核後，家長才可看到安全版本。"
            }
      )
    }));
}

export function aiGovernancePilotEventsForParentDrafts(
  user: AiGovernancePilotActor,
  drafts: ParentSafeTeacherDraft[],
  now = new Date().toISOString()
): PilotPlatformEvent[] {
  return drafts.map((draft) => ({
    id: `pilot-parent-safe-draft-published-${draft.noticeId}`,
    type: "parent-safe-draft-published",
    actorRole: aiGovernancePilotRoleFor(user),
    actorId: user.id,
    classId: draft.classId,
    reviewLessonId: draft.sourceReviewLessonId,
    noticeId: draft.noticeId,
    generatedAt: draft.publishedAt ?? now,
    summary: {
      en: `Parent-safe review draft published for ${draft.className}.`,
      zh: `${draft.className} 的家長安全講評版本已發佈。`
    }
  }));
}

export function aiGovernanceParentSafeDraftsForPilot<Database extends AiGovernanceParentSafeDraftDatabase>(
  database: Database,
  user: AiGovernancePilotActor,
  helpers: {
    allowedStudentIdsForParent: (database: Database, user: AiGovernancePilotActor) => Iterable<string>;
    parentSafeTeacherDraftFromNotice: (
      database: Database,
      record: Database["teacher_notices"][number],
      noticeOverride: TeacherNotice
    ) => ParentSafeTeacherDraft | null;
    toTeacherNotice: (
      database: Database,
      record: Database["teacher_notices"][number]
    ) => TeacherNotice;
  }
): ParentSafeTeacherDraft[] {
  const allowedStudentIds = new Set(helpers.allowedStudentIdsForParent(database, user));

  return database.teacher_notices
    .filter((notice) => notice.status !== "draft" && notice.source_kind === "teacher-review-lesson" && notice.source_id)
    .filter((notice) =>
      database.teacher_notice_recipients.some(
        (recipient) =>
          recipient.notice_id === notice.id &&
          allowedStudentIds.has(recipient.student_id) &&
          (recipient.guardian_id === user.id || user.role === "admin")
      )
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((record) => {
      const notice = helpers.toTeacherNotice(database, record);
      const recipients = notice.recipients.filter(
        (recipient) =>
          allowedStudentIds.has(recipient.studentId) &&
          (recipient.guardianId === user.id || user.role === "admin")
      );
      const acknowledged = recipients.filter((recipient) => recipient.status === "acknowledged").length;
      return helpers.parentSafeTeacherDraftFromNotice(database, record, {
        ...notice,
        recipients,
        acknowledgement: {
          total: recipients.length,
          acknowledged,
          pending: Math.max(0, recipients.length - acknowledged)
        }
      });
    })
    .filter((draft): draft is ParentSafeTeacherDraft => Boolean(draft));
}

export function createAiGovernancePilotPlatformLoopDataBuilder<
  Database,
  User extends AiGovernancePilotActor
>({
  adaptiveStatesForUser,
  canUseParentArea,
  canUseTeacherArea,
  getAdaptiveLearningDecision,
  knowledgeComponentsForDatabase,
  now = () => new Date(),
  parentSafeDraftsForPilot,
  teacherReviewQueueForPilot,
  toAuthenticatedUser,
  userForId
}: AiGovernancePilotPlatformLoopBuilderDependencies<Database, User>) {
  return async (
    database: Database,
    {
      userId,
      grade
    }: {
      userId: string;
      grade?: GradeId;
    }
  ): Promise<PilotPlatformLoopData | null> => {
    const user = userForId(database, userId);
    if (!user) return null;
    const authenticated = toAuthenticatedUser(database, user);
    if (!authenticated) return null;
    const role = aiGovernancePilotRoleFor(user);
    const selectedGrade = grade ?? authenticated.settings.selectedGrade;
    const generatedAt = now().toISOString();
    const blockedGuard = aiGovernancePilotGuard(false, "blocked", {
      en: "The P1 loop is role-gated and does not expose real student data across roles.",
      zh: "P1 閉環已按角色設防，不跨角色開放真實學生資料。"
    });
    const base = {
      mode: "p1-platform-loop" as const,
      generatedAt,
      role,
      actorId: user.id
    };

    if (user.role === "student") {
      const decision = await getAdaptiveLearningDecision({
        userId: user.id,
        grade: selectedGrade,
        curriculumTrack: authenticated.user.curriculumProfile
      });
      const skillIdsForGrade = new Set(
        knowledgeComponentsForDatabase(database, selectedGrade, authenticated.user.curriculumProfile).map((skill) => skill.id)
      );
      const skillStates = adaptiveStatesForUser(database, user.id).filter((state) => skillIdsForGrade.has(state.skillId));
      const lastTransitionAt = aiGovernanceLatestAdaptiveTransitionAt(skillStates);
      const learnerGuard = aiGovernancePilotGuard(true, "student-owned", {
        en: "Only the signed-in student can see this adaptive state.",
        zh: "只有已登入學生本人可查看此適性狀態。"
      });

      return {
        ...base,
        guard: learnerGuard,
        learnerState: {
          studentId: user.id,
          grade: selectedGrade,
          curriculumProfile: authenticated.user.curriculumProfile,
          adaptiveDecision: decision,
          skillStates,
          lastTransitionAt,
          nextReviewAt: aiGovernanceNextAdaptiveReviewAt(skillStates),
          guard: learnerGuard
        },
        teacherReviewQueue: [],
        parentSafeDrafts: [],
        events: aiGovernancePilotLearnerEvents({ user, decision, lastTransitionAt })
      };
    }

    if (canUseTeacherArea(user)) {
      const teacherReviewQueue = teacherReviewQueueForPilot(database, user);
      return {
        ...base,
        guard: aiGovernancePilotGuard(true, "teacher-reviewed", {
          en: "Teacher view is limited to review lessons for classes this teacher can access.",
          zh: "教師視圖只限此教師可存取班級的講評方案。"
        }),
        learnerState: null,
        teacherReviewQueue,
        parentSafeDrafts: teacherReviewQueue
          .map((item) => item.parentSafeDraft)
          .filter((draft): draft is ParentSafeTeacherDraft => Boolean(draft)),
        events: aiGovernancePilotEventsForTeacherQueue(user, teacherReviewQueue)
      };
    }

    if (canUseParentArea(user)) {
      const parentSafeDrafts = parentSafeDraftsForPilot(database, user);
      return {
        ...base,
        guard: aiGovernancePilotGuard(true, "parent-safe", {
          en: "Parent view is limited to teacher-approved, parent-safe drafts for linked children.",
          zh: "家長視圖只限已連結子女的教師已審核安全版本。"
        }),
        learnerState: null,
        teacherReviewQueue: [],
        parentSafeDrafts,
        events: aiGovernancePilotEventsForParentDrafts(user, parentSafeDrafts)
      };
    }

    return {
      ...base,
      guard: blockedGuard,
      learnerState: null,
      teacherReviewQueue: [],
      parentSafeDrafts: [],
      events: []
    };
  };
}

export type AiGovernancePersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  aiTutorDatabaseContextFromDatabase?: (
    database: AiGovernancePersistenceDatabase,
    userId: string,
    context?: AITutorDatabaseContextOptions
  ) => AITutorDatabaseContextResult | Promise<AITutorDatabaseContextResult>;
  pilotPlatformLoopDataFromDatabase?: (
    database: AiGovernancePersistenceDatabase,
    input: { userId: string; grade?: GradeId }
  ) => PilotPlatformLoopData | null | Promise<PilotPlatformLoopData | null>;
  readDatabase: () => Promise<AiGovernancePersistenceDatabase>;
  mutateDatabase: <T>(mutator: (database: AiGovernancePersistenceDatabase) => T | Promise<T>) => Promise<T>;
};

export type AiGovernancePersistenceStore = ReturnType<typeof createAiGovernancePersistenceStore>;

function cleanTutorContextValue(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function fallbackClassAiTutorPolicy(
  classId = "default",
  updatedBy = "system",
  now = new Date().toISOString()
): ClassAiTutorPolicy {
  return classAiTutorPolicyRecordToPublic(defaultClassAiTutorPolicyRecord({ classId, now, updatedBy }));
}

function classAiTutorPolicyForRecord(
  database: AiGovernancePersistenceDatabase,
  teacherClass: AiGovernanceTeacherClassRecord,
  now: string
) {
  const existing = (database.class_ai_tutor_policies ?? [])
    .map((record) => normalizeClassAiTutorPolicyRecord(record, now))
    .find((record) => record?.class_id === teacherClass.id);
  return classAiTutorPolicyRecordToPublic(existing ?? defaultClassAiTutorPolicyRecord({
    classId: teacherClass.id,
    now: teacherClass.updated_at ?? now,
    updatedBy: teacherClass.teacher_id
  }));
}

function teacherClassForAiTutorPolicy(database: AiGovernancePersistenceDatabase, classId: string) {
  return (database.teacher_classes ?? []).find((candidate) => candidate.id === classId) ?? null;
}

function teacherCanReadClassAiTutorPolicy(
  database: AiGovernancePersistenceDatabase,
  user: { id: string; role: UserRole },
  classId: string
) {
  const teacherClass = teacherClassForAiTutorPolicy(database, classId);
  if (!teacherClass) return null;
  if (user.role === "admin" || teacherClass.teacher_id === user.id) return teacherClass;
  const collaborator = (database.teacher_class_collaborators ?? []).find((candidate) => (
    candidate.class_id === classId &&
    candidate.teacher_id === user.id &&
    candidate.status === "active"
  ));
  return collaborator ? teacherClass : null;
}

function teacherCanMutateClassAiTutorPolicy(
  database: AiGovernancePersistenceDatabase,
  user: { id: string; role: UserRole },
  classId: string
) {
  const teacherClass = teacherClassForAiTutorPolicy(database, classId);
  if (!teacherClass) return null;
  if (user.role === "admin" || teacherClass.teacher_id === user.id) return teacherClass;
  const collaborator = (database.teacher_class_collaborators ?? []).find((candidate) => (
    candidate.class_id === classId &&
    candidate.teacher_id === user.id &&
    candidate.status === "active" &&
    candidate.role === "co-teacher"
  ));
  return collaborator ? teacherClass : null;
}

export function normalizeAiGovernanceEventRecord(
  value: unknown,
  now = new Date().toISOString(),
  createId: () => string = crypto.randomUUID
): AIGovernanceEventRecord | null {
  const record = typeof value === "object" && value !== null ? value as Partial<AIGovernanceEventRecord> : null;
  if (!record || typeof record.user_id !== "string" || !record.user_id.trim()) return null;
  if (!aiCapabilitySet.has(record.capability as AiCapability)) return null;

  const metadata = typeof record.metadata_json === "object" && record.metadata_json !== null
    ? JSON.parse(JSON.stringify(record.metadata_json)) as Record<string, unknown>
    : null;

  return {
    id: typeof record.id === "string" && record.id ? record.id : `ai-governance-${createId()}`,
    user_id: record.user_id.trim(),
    capability: record.capability as AiCapability,
    action: aiGovernanceActionSet.has(record.action as AIGovernanceEventRecord["action"])
      ? record.action as AIGovernanceEventRecord["action"]
      : "request-admitted",
    reason: typeof record.reason === "string" && record.reason.trim() ? record.reason.trim().slice(0, 160) : "ok",
    metadata_json: metadata,
    created_at: typeof record.created_at === "string" && record.created_at ? record.created_at : now
  };
}

export function normalizeAiGovernanceEventRecords(
  records: unknown[] | undefined,
  now = new Date().toISOString(),
  createId: () => string = crypto.randomUUID
): AIGovernanceEventRecord[] {
  return (records ?? [])
    .map((record) => normalizeAiGovernanceEventRecord(record, now, createId))
    .filter((record): record is AIGovernanceEventRecord => Boolean(record))
    .slice(-5000);
}

function aiGovernanceEventTime(record: AIGovernanceEventRecord) {
  const timestamp = Date.parse(record.created_at);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function tutorUsageTotalTokens(usage: AITutorUsageRecord) {
  if (typeof usage.total_tokens === "number") return usage.total_tokens;
  return (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);
}

export function addAiTutorContextScope(includedScopes: AITutorDataScope[], scope: AITutorDataScope) {
  if (!includedScopes.includes(scope)) includedScopes.push(scope);
}

export function addDeniedAiTutorContextScope(deniedScopes: AITutorDataScope[], scope: AITutorDataScope) {
  if (!deniedScopes.includes(scope)) deniedScopes.push(scope);
}

export function mergeAiTutorScopeContextResult(
  target: {
    deniedScopes: AITutorDataScope[];
    fallbackLines: string[];
    includedScopes: AITutorDataScope[];
    lines: string[];
  },
  context: {
    deniedScopes: AITutorDataScope[];
    fallbackLines: string[];
    includedScopes: AITutorDataScope[];
    lines: string[];
  }
) {
  target.lines.push(...context.lines);
  target.fallbackLines.push(...context.fallbackLines);
  context.includedScopes.forEach((scope) => addAiTutorContextScope(target.includedScopes, scope));
  context.deniedScopes.forEach((scope) => addDeniedAiTutorContextScope(target.deniedScopes, scope));
}

function canResolveAiTutorTeacherTarget(user?: { role: UserRole } | null) {
  return user?.role === "teacher" || user?.role === "admin";
}

export async function aiTutorDatabaseContextSubject({
  authenticated,
  context,
  defaultCurriculumTrack,
  resolveTeacherStudentProfile,
  user,
  userId
}: AiTutorDatabaseContextSubjectInput): Promise<AiTutorDatabaseContextSubject> {
  const targetStudentId = context?.targetStudentId?.trim();
  let verifiedTargetProfile: TeacherStudentProfileData | null = null;
  let subjectUserId = userId;
  let subjectName = authenticated?.user?.name ?? userId;
  let subjectGrade = context?.grade ?? authenticated?.settings?.selectedGrade ?? authenticated?.user?.grade ?? "S3";
  let subjectCurriculumTrack = authenticated?.user?.curriculumTrack ?? defaultCurriculumTrack;

  if (targetStudentId) {
    if (user?.role === "student" && targetStudentId === userId) {
      subjectUserId = userId;
    } else if (canResolveAiTutorTeacherTarget(user) && resolveTeacherStudentProfile) {
      verifiedTargetProfile = await resolveTeacherStudentProfile(userId, targetStudentId);
      if (verifiedTargetProfile) {
        subjectUserId = verifiedTargetProfile.student.id;
        subjectName = verifiedTargetProfile.student.name;
        subjectGrade = context?.grade ?? verifiedTargetProfile.student.grade;
        subjectCurriculumTrack = verifiedTargetProfile.student.curriculumTrack;
      }
    }
  }

  return {
    subjectCurriculumTrack,
    subjectGrade,
    subjectName,
    subjectUserId,
    targetStudentId,
    verifiedTargetProfile
  };
}

export function aiTutorContextScopeAccess({
  targetStudentId,
  user,
  userId,
  verifiedTargetProfile
}: {
  targetStudentId?: string;
  user?: { role: UserRole } | null;
  userId: string;
  verifiedTargetProfile?: unknown | null;
}) {
  const canReadOwnLearnerContext = user?.role === "student" && (!targetStudentId || targetStudentId === userId);
  const canReadVerifiedTarget = Boolean(verifiedTargetProfile);

  return {
    canReadAdaptiveEngine: canReadOwnLearnerContext || canReadVerifiedTarget,
    canReadStudentDashboard: canReadOwnLearnerContext || canReadVerifiedTarget,
    canReadTeacherDashboard: canResolveAiTutorTeacherTarget(user),
    canReadTeacherStudentProfile: canReadVerifiedTarget
  };
}

export function aiTutorRequestedScopeSet(scopes?: AITutorDataScope[] | null) {
  return new Set(scopes ?? []);
}

export function aiTutorRequestedDatabaseRecords<DatabaseRecord, TopicRecord, QuestionRecord>({
  context,
  database,
  questionForId,
  topicRecordForId
}: {
  context?: Pick<AITutorDatabaseContextOptions, "questionId" | "topicId">;
  database: DatabaseRecord;
  questionForId: (database: DatabaseRecord, questionId: string) => QuestionRecord | null | undefined;
  topicRecordForId: (database: DatabaseRecord, topicId: string) => TopicRecord | null | undefined;
}) {
  return {
    requestedQuestion: context?.questionId ? questionForId(database, context.questionId) ?? null : null,
    requestedTopic: context?.topicId ? topicRecordForId(database, context.topicId) ?? null : null
  };
}

export async function aiTutorStudentDashboardScopeContext({
  canReadStudentDashboard,
  getDashboardData,
  grade,
  language,
  learnerName,
  scopeSet
}: {
  canReadStudentDashboard: boolean;
  getDashboardData: () => DashboardData | Promise<DashboardData>;
  grade: GradeId;
  language: Language;
  learnerName: string;
  scopeSet: Set<AITutorDataScope>;
}): Promise<{
  deniedScopes: AITutorDataScope[];
  fallbackLines: string[];
  includedScopes: AITutorDataScope[];
  lines: string[];
}> {
  if (!scopeSet.has("student-dashboard")) {
    return {
      deniedScopes: [],
      fallbackLines: [],
      includedScopes: [],
      lines: []
    };
  }

  if (!canReadStudentDashboard) {
    return {
      lines: ["Denied context scope: student-dashboard. The signed-in user is not authorized to read that student dashboard."],
      fallbackLines: ["Student dashboard: access was not authorized for the requested student."],
      includedScopes: [],
      deniedScopes: ["student-dashboard"]
    };
  }

  const dashboardLines = aiTutorDashboardSummaryLines({
    dashboard: await getDashboardData(),
    grade,
    language,
    learnerName
  });

  return {
    lines: ["Authorized student dashboard context:", ...dashboardLines],
    fallbackLines: dashboardLines,
    includedScopes: ["student-dashboard"],
    deniedScopes: []
  };
}

export async function aiTutorTeacherDashboardScopeContext({
  canReadTeacherDashboard,
  getTeacherDashboardData,
  language,
  scopeSet
}: {
  canReadTeacherDashboard: boolean;
  getTeacherDashboardData: () => TeacherDashboardData | null | Promise<TeacherDashboardData | null>;
  language: Language;
  scopeSet: Set<AITutorDataScope>;
}): Promise<{
  deniedScopes: AITutorDataScope[];
  fallbackLines: string[];
  includedScopes: AITutorDataScope[];
  lines: string[];
}> {
  if (!scopeSet.has("teacher-dashboard")) {
    return {
      deniedScopes: [],
      fallbackLines: [],
      includedScopes: [],
      lines: []
    };
  }

  if (!canReadTeacherDashboard) {
    return {
      lines: ["Denied context scope: teacher-dashboard. Teacher or admin access is required."],
      fallbackLines: ["Teacher dashboard: teacher or admin access is required."],
      includedScopes: [],
      deniedScopes: ["teacher-dashboard"]
    };
  }

  const dashboard = await getTeacherDashboardData();
  if (!dashboard) {
    return {
      deniedScopes: [],
      fallbackLines: [],
      includedScopes: [],
      lines: []
    };
  }

  const dashboardLines = aiTutorTeacherDashboardSummaryLines(dashboard, language);
  return {
    lines: ["Authorized teacher dashboard context:", ...dashboardLines],
    fallbackLines: dashboardLines,
    includedScopes: ["teacher-dashboard"],
    deniedScopes: []
  };
}

export function aiTutorTeacherStudentProfileScopeContext({
  canReadTeacherStudentProfile,
  language,
  profile,
  scopeSet
}: {
  canReadTeacherStudentProfile: boolean;
  language: Language;
  profile: TeacherStudentProfileData | null;
  scopeSet: Set<AITutorDataScope>;
}): {
  deniedScopes: AITutorDataScope[];
  fallbackLines: string[];
  includedScopes: AITutorDataScope[];
  lines: string[];
} {
  if (!scopeSet.has("teacher-student-profile")) {
    return {
      deniedScopes: [],
      fallbackLines: [],
      includedScopes: [],
      lines: []
    };
  }

  if (canReadTeacherStudentProfile && profile) {
    const profileLines = aiTutorStudentProfileSummaryLines(profile, language);
    return {
      lines: ["Authorized teacher-visible student profile context:", ...profileLines],
      fallbackLines: profileLines,
      includedScopes: ["teacher-student-profile"],
      deniedScopes: []
    };
  }

  return {
    lines: ["Denied context scope: teacher-student-profile. Teacher/admin access to the requested student was not verified."],
    fallbackLines: ["Teacher-visible student profile: access was not authorized for the requested student."],
    includedScopes: [],
    deniedScopes: ["teacher-student-profile"]
  };
}

export async function aiTutorAdaptiveEngineScopeContext({
  canReadAdaptiveEngine,
  curriculumTrack,
  getAdaptiveLearningDecision,
  grade,
  language,
  learnerName,
  scopeSet,
  topicId,
  userId
}: {
  canReadAdaptiveEngine: boolean;
  curriculumTrack: CurriculumTrack;
  getAdaptiveLearningDecision: (input: {
    curriculumTrack: CurriculumTrack;
    grade: GradeId;
    topicId?: string;
    userId: string;
  }) => Promise<AdaptiveLearningDecision | null> | AdaptiveLearningDecision | null;
  grade: GradeId;
  language: Language;
  learnerName: string;
  scopeSet: Set<AITutorDataScope>;
  topicId?: string;
  userId: string;
}): Promise<{
  deniedScopes: AITutorDataScope[];
  fallbackLines: string[];
  includedScopes: AITutorDataScope[];
  lines: string[];
}> {
  if (!scopeSet.has("adaptive-engine")) {
    return {
      deniedScopes: [],
      fallbackLines: [],
      includedScopes: [],
      lines: []
    };
  }

  if (!canReadAdaptiveEngine) {
    return {
      lines: ["Denied context scope: adaptive-engine. A student learner or verified teacher-visible student target is required."],
      fallbackLines: ["Adaptive engine: access requires the learner's own session or a verified teacher-visible student target."],
      includedScopes: [],
      deniedScopes: ["adaptive-engine"]
    };
  }

  const decision = await getAdaptiveLearningDecision({
    userId,
    grade,
    topicId,
    curriculumTrack
  });
  if (!decision) {
    return {
      lines: ["Adaptive engine context: no adaptive decision is currently available for the authorized student and grade."],
      fallbackLines: ["Adaptive engine: no current adaptive decision is available for the authorized student and grade."],
      includedScopes: ["adaptive-engine"],
      deniedScopes: []
    };
  }

  const adaptiveLines = aiTutorAdaptiveSummaryLines({ decision, language, learnerName });
  return {
    lines: ["Authorized adaptive engine context:", ...adaptiveLines],
    fallbackLines: adaptiveLines,
    includedScopes: ["adaptive-engine"],
    deniedScopes: []
  };
}

export function aiTutorRequestedCurriculumContext<TopicRecord extends { id: string }, QuestionRecord>({
  isCurriculumQuestion,
  isCurriculumTopic,
  requestedQuestion,
  requestedTopic,
  subjectCurriculumTrack
}: {
  isCurriculumQuestion: (question: QuestionRecord, curriculumTrack: CurriculumTrack) => boolean;
  isCurriculumTopic: (topic: TopicRecord, curriculumTrack: CurriculumTrack) => boolean;
  requestedQuestion: QuestionRecord | null | undefined;
  requestedTopic: TopicRecord | null | undefined;
  subjectCurriculumTrack: CurriculumTrack;
}): {
  question: QuestionRecord | null;
  topicId: string | undefined;
} {
  const topicId = requestedTopic != null && isCurriculumTopic(requestedTopic, subjectCurriculumTrack)
    ? requestedTopic.id
    : undefined;
  const question = requestedQuestion != null && isCurriculumQuestion(requestedQuestion, subjectCurriculumTrack)
    ? requestedQuestion
    : null;

  return {
    topicId,
    question
  };
}

export function aiTutorLessonContextInput<
  LessonRecord extends { slug: string; title_en: string; topic_id: string },
  TopicRecord,
  ProgressRecord extends { mastery?: number | null; status?: string | null }
>(
  database: { lessons: LessonRecord[] },
  {
    isCurriculumTopic,
    lessonForTopic,
    lessonProgressFor,
    lessonSlug,
    subjectCurriculumTrack,
    topicForLesson,
    topicId
  }: {
    isCurriculumTopic: (topic: TopicRecord, curriculumTrack: CurriculumTrack) => boolean;
    lessonForTopic: (topicId: string) => LessonRecord | null | undefined;
    lessonProgressFor: (lesson: LessonRecord) => ProgressRecord | null | undefined;
    lessonSlug?: string;
    subjectCurriculumTrack: CurriculumTrack;
    topicForLesson: (lesson: LessonRecord) => TopicRecord | null | undefined;
    topicId?: string;
  }
) {
  const lesson = lessonSlug
    ? database.lessons.find((candidate) => {
        if (candidate.slug !== lessonSlug) return false;
        const lessonTopic = topicForLesson(candidate);
        return Boolean(lessonTopic && isCurriculumTopic(lessonTopic, subjectCurriculumTrack));
      }) ?? null
    : topicId
      ? lessonForTopic(topicId) ?? null
      : null;

  if (!lesson) return null;

  const progress = lessonProgressFor(lesson);
  return {
    mastery: progress?.mastery,
    status: progress?.status,
    title: lesson.title_en
  };
}

export function aiTutorRecentAttemptContextInputs<QuestionRecord extends { topic_id?: string | null }>(
  database: { attempts: AiTutorRecentAttemptRecord[] },
  {
    isCurriculumQuestion,
    questionForId,
    subjectCurriculumTrack,
    topicId,
    topicLabelForQuestion,
    userId
  }: {
    isCurriculumQuestion: (question: QuestionRecord, curriculumTrack: CurriculumTrack) => boolean;
    questionForId: (questionId: string) => QuestionRecord | null | undefined;
    subjectCurriculumTrack: CurriculumTrack;
    topicId?: string;
    topicLabelForQuestion: (question: QuestionRecord) => string;
    userId: string;
  }
) {
  const candidates: Array<{ attempt: AiTutorRecentAttemptRecord; question: QuestionRecord }> = [];

  for (const attempt of database.attempts) {
    const question = questionForId(attempt.question_id);
    if (
      attempt.user_id === userId &&
      question &&
      isCurriculumQuestion(question, subjectCurriculumTrack) &&
      (!topicId || question.topic_id === topicId)
    ) {
      candidates.push({ attempt, question });
    }
  }

  return candidates
    .sort((a, b) => b.attempt.created_at.localeCompare(a.attempt.created_at))
    .slice(0, 5)
    .map(({ attempt, question }) => ({
      durationSeconds: attempt.duration_seconds,
      isCorrect: attempt.is_correct,
      selectedAnswer: attempt.selected_answer,
      topicLabel: topicLabelForQuestion(question)
    }));
}

export function aiTutorRecentMistakeContextInputs<QuestionRecord extends { prompt_en?: string; topic_id?: string | null }>(
  database: { mistakes: AiTutorRecentMistakeRecord[] },
  {
    isCurriculumQuestion,
    questionForId,
    subjectCurriculumTrack,
    topicId,
    userId
  }: {
    isCurriculumQuestion: (question: QuestionRecord, curriculumTrack: CurriculumTrack) => boolean;
    questionForId: (questionId: string) => QuestionRecord | null | undefined;
    subjectCurriculumTrack: CurriculumTrack;
    topicId?: string;
    userId: string;
  }
) {
  const candidates: Array<{ mistake: AiTutorRecentMistakeRecord; question: QuestionRecord }> = [];

  for (const mistake of database.mistakes) {
    const question = questionForId(mistake.question_id);
    if (
      mistake.user_id === userId &&
      !mistake.mastered &&
      question &&
      isCurriculumQuestion(question, subjectCurriculumTrack) &&
      (!topicId || question.topic_id === topicId)
    ) {
      candidates.push({ mistake, question });
    }
  }

  return candidates
    .sort((a, b) => b.mistake.last_attempt_at.localeCompare(a.mistake.last_attempt_at))
    .slice(0, 3)
    .map(({ mistake, question }) => ({
      lastSelectedAnswer: mistake.last_selected_answer,
      prompt: question.prompt_en ?? mistake.question_id,
      wrongAttempts: mistake.wrong_attempts
    }));
}

export function aiTutorRecentMessageContextInputs(
  database: Pick<AiGovernancePersistenceDatabase, "ai_tutor_messages">,
  userId: string
) {
  return database.ai_tutor_messages
    .filter((message) => message.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6)
    .reverse()
    .map((message) => ({
      content: message.content,
      role: message.role
    }));
}

export function aiTutorDatabaseContextResult({
  deniedScopes = [],
  fallbackLines = [],
  includedScopes = [],
  lines,
  subjectUserId
}: {
  deniedScopes?: AITutorDataScope[];
  fallbackLines?: string[];
  includedScopes?: AITutorDataScope[];
  lines: string[];
  subjectUserId: string;
}): AITutorDatabaseContextResult {
  return {
    text: lines.join("\n"),
    deterministicSummary: fallbackLines.length ? fallbackLines.join("\n") : null,
    includedScopes,
    deniedScopes,
    subjectUserId
  };
}

export function aiTutorContextText(value: LocalizedText, language: Language) {
  return textForLanguage(value, language);
}

export function aiTutorContextTopicList(topics: Topic[], language: Language, limit = 4) {
  return topics
    .slice(0, limit)
    .map((topic) => `${aiTutorContextText(topic.title, language)} (${topic.mastery}%, ${topic.status})`)
    .join("; ");
}

export function aiTutorContextSkillList(summaries: AdaptiveSkillSummary[], language: Language, limit = 3) {
  return summaries
    .slice(0, limit)
    .map((summary) => `${aiTutorContextText(summary.skill.title, language)} (${Math.round(summary.state.pMastery * 100)}%)`)
    .join("; ");
}

export function aiTutorDashboardSummaryLines({
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
      `Progress metrics: ${dashboard.progressMetrics.slice(0, 4).map((metric) => `${aiTutorContextText(metric.label, language)} ${metric.value} (${aiTutorContextText(metric.detail, language)})`).join("; ")}.`
    );
  }
  if (dashboard.recommendedLesson) {
    lines.push(`Recommended lesson: ${aiTutorContextText(dashboard.recommendedLesson.title, language)} (${dashboard.recommendedLesson.mastery}%, ${dashboard.recommendedLesson.status}).`);
  }
  if (dashboard.weakTopics.length) {
    lines.push(`Weak topics: ${aiTutorContextTopicList(dashboard.weakTopics, language)}.`);
  }
  if (dashboard.recentTopics.length) {
    lines.push(`Recent topics: ${aiTutorContextTopicList(dashboard.recentTopics, language, 3)}.`);
  }

  return lines;
}

export function aiTutorTeacherDashboardSummaryLines(dashboard: TeacherDashboardData, language: Language) {
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
      `Mastery gaps: ${heatmapGaps.map((cell) => `${cell.className} ${aiTutorContextText(cell.topicTitle, language)} ${cell.averageMastery}% avg, ${cell.weakStudentCount}/${cell.studentCount} below 60%`).join("; ")}.`
    );
  }

  if (dashboard.actionQueue.length) {
    lines.push(
      `Top action queue: ${dashboard.actionQueue.slice(0, 5).map((item) => `${item.priority} ${item.type}: ${aiTutorContextText(item.title, language)} - ${aiTutorContextText(item.description, language)}`).join("; ")}.`
    );
  }

  return lines;
}

export function aiTutorStudentProfileSummaryLines(profile: TeacherStudentProfileData, language: Language) {
  const activeMistakes = profile.mistakes.filter((item) => !item.mastered);
  const openAssignments = profile.assignments.filter(({ submission }) => submission?.status !== "submitted" && submission?.status !== "graded");
  const lines = [
    `Teacher-visible student profile: ${profile.student.name}, ${formatGradeLabel(profile.student.grade, language, true)}, average mastery ${profile.averageMastery}%, active mistakes ${activeMistakes.length}, recent activity ${profile.recentActivityAt ?? "none saved"}.`,
    `AI Tutor use: ${profile.aiTutor.messageCount7d} messages in 7 days, last message ${profile.aiTutor.lastMessageAt ?? "none"}.`
  ];

  if (profile.progress.length) {
    lines.push(
      `Lowest progress areas: ${profile.progress.slice(0, 5).map((item) => `${aiTutorContextText(item.title, language)} ${item.mastery}% (${item.status})`).join("; ")}.`
    );
  }
  if (activeMistakes.length) {
    lines.push(
      `Active mistakes: ${activeMistakes.slice(0, 4).map((item) => `${aiTutorContextText(item.question.topic, language)} (${item.wrongAttempts} wrong attempts)`).join("; ")}.`
    );
  }
  if (profile.recentAttempts.length) {
    lines.push(
      `Recent attempts: ${profile.recentAttempts.slice(0, 5).map((attempt) => `${aiTutorContextText(attempt.topic, language)} ${attempt.isCorrect ? "correct" : "wrong"}`).join("; ")}.`
    );
  }
  if (openAssignments.length) {
    lines.push(
      `Open assignments: ${openAssignments.slice(0, 4).map(({ assignment, submission }) => `${aiTutorContextText(assignment.title, language)} (${submission?.status ?? "not-started"})`).join("; ")}.`
    );
  }

  return lines;
}

export function aiTutorAdaptiveSummaryLines({
  decision,
  language,
  learnerName
}: {
  decision: AdaptiveLearningDecision;
  language: Language;
  learnerName: string;
}) {
  const lines = [
    `Adaptive engine snapshot for ${learnerName}: action ${decision.action}, confidence ${decision.confidence}, focus skill ${aiTutorContextText(decision.skill.title, language)}, topic ${aiTutorContextText(decision.topic.title, language)}.`,
    `Engine status: ${decision.engine.mode}, LLM status ${decision.engine.llmStatus}.`
  ];

  if (decision.lesson) {
    lines.push(`Linked lesson: ${aiTutorContextText(decision.lesson.title, language)} (${decision.lesson.status}, mastery ${decision.lesson.mastery}%).`);
  }
  if (decision.explanation) {
    lines.push(`Learner-facing reason: ${aiTutorContextText(decision.explanation, language)}.`);
  }
  if (decision.evidence.length) {
    lines.push(
      `Evidence: ${decision.evidence.slice(0, 4).map((item) => `${aiTutorContextText(item.label, language)} ${item.value} - ${aiTutorContextText(item.detail, language)}`).join("; ")}.`
    );
  }
  if (decision.dueReviews.length) {
    lines.push(`Due reviews: ${aiTutorContextSkillList(decision.dueReviews, language)}.`);
  }
  if (decision.engine.teacherAuditNote) {
    lines.push(`Teacher audit note: ${aiTutorContextText(decision.engine.teacherAuditNote, language)}.`);
  }
  if (decision.engine.aiConfidence) {
    lines.push(`AI confidence: ${Math.round(decision.engine.aiConfidence.score * 100)}% - ${aiTutorContextText(decision.engine.aiConfidence.label, language)}; ${aiTutorContextText(decision.engine.aiConfidence.criteria, language)}.`);
  }
  if (decision.engine.signalsUsed?.length) {
    lines.push(`Signals used: ${decision.engine.signalsUsed.slice(0, 6).join(", ")}.`);
  }
  if (decision.skillMap.length) {
    lines.push(`Skill mastery map: ${aiTutorContextSkillList(decision.skillMap, language, 5)}.`);
  }

  return lines;
}

export function aiTutorCurriculumPolicyLines(curriculumTrack: string) {
  return [
    `Curriculum track: ${curriculumTrack}`,
    curriculumTrack === "MAINLAND_PEP_HIGH"
      ? "Curriculum language policy: use Mainland mathematics terminology and Simplified Chinese when Chinese wording is helpful."
      : "Curriculum language policy: use Hong Kong mathematics terminology where helpful."
  ];
}

export function aiTutorCurrentQuestionContextLines({
  allowAnswerReference = false,
  answer,
  explanation,
  prompt,
  topicLabel
}: {
  allowAnswerReference?: boolean;
  answer?: string;
  explanation?: string;
  prompt: string;
  topicLabel: string;
}) {
  const lines = [
    `Current question: ${prompt}`,
    `Question topic: ${topicLabel}`
  ];

  if (allowAnswerReference) {
    lines.push(
      `Correct answer for tutor reference: ${answer ?? ""}`,
      `Explanation: ${explanation ?? ""}`
    );
  } else {
    lines.push("Do not reveal the final answer immediately. Guide with hints, checks, and a similar example first.");
  }

  return lines;
}

export function aiTutorLessonProgressContextLines({
  mastery,
  status,
  title
}: {
  mastery?: number | null;
  status?: string | null;
  title: string;
}) {
  return [
    `Current lesson: ${title}`,
    `Lesson progress: ${status ?? "not-started"}, mastery ${mastery ?? 0}%`
  ];
}

export function aiTutorRecentAttemptContextLines(attempts: Array<{
  durationSeconds?: number | null;
  isCorrect: boolean;
  selectedAnswer: string;
  topicLabel: string;
}>) {
  if (!attempts.length) return [];

  return [
    "Recent attempts:",
    ...attempts.map((attempt) =>
      `- ${attempt.topicLabel}: ${attempt.isCorrect ? "correct" : "wrong"}; selected "${attempt.selectedAnswer}"; ${attempt.durationSeconds ?? "unknown"}s`
    )
  ];
}

export function aiTutorRecentMistakeContextLines(mistakes: Array<{
  lastSelectedAnswer: string;
  prompt: string;
  wrongAttempts: number;
}>) {
  if (!mistakes.length) return [];

  return [
    "Active mistake book items:",
    ...mistakes.map((mistake) =>
      `- ${mistake.prompt}; last selected "${mistake.lastSelectedAnswer}"; wrong attempts ${mistake.wrongAttempts}`
    )
  ];
}

export function aiTutorRecentTutorMessageContextLines(messages: Array<{
  content: string;
  role: "student" | "tutor";
}>) {
  if (!messages.length) return [];

  return [
    "Recent tutor conversation stored on server:",
    ...messages.map((message) => `- ${message.role}: ${message.content.slice(0, 220)}`)
  ];
}

export function createAiGovernancePersistenceStore({
  aiTutorDatabaseContextFromDatabase = () => {
    throw new Error("AI governance AI Tutor database context dependency is not configured.");
  },
  createId = crypto.randomUUID,
  mutateDatabase,
  now: currentTime = () => new Date(),
  pilotPlatformLoopDataFromDatabase = () => {
    throw new Error("AI governance pilot platform loop dependency is not configured.");
  },
  readDatabase
}: AiGovernancePersistenceStoreDependencies) {
  return {
    async getPilotPlatformLoopData(input: { userId: string; grade?: GradeId }): Promise<PilotPlatformLoopData | null> {
      const database = await readDatabase();
      return pilotPlatformLoopDataFromDatabase(database, input);
    },

    async buildAITutorDatabaseContext(
      userId: string,
      context?: AITutorDatabaseContextOptions
    ): Promise<AITutorDatabaseContextResult> {
      const database = await readDatabase();
      return aiTutorDatabaseContextFromDatabase(database, userId, context);
    },

    async recordAITutorMessage({
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
          id: createId(),
          user_id: userId,
          role,
          content,
          context_json: cleanTutorContextValue(context),
          created_at: currentTime().toISOString()
        });
      });
    },

    async recordAITutorUsage({
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
          id: createId(),
          user_id: userId,
          model,
          prompt_tokens: promptTokens ?? null,
          completion_tokens: completionTokens ?? null,
          total_tokens: totalTokens ?? null,
          error: error ?? null,
          created_at: currentTime().toISOString()
        });
      });
    },

    async getAITutorTokenUsageSince(userId: string, sinceIso: string) {
      const database = await readDatabase();
      return database.ai_tutor_usage
        .filter((usage) => usage.user_id === userId && usage.created_at >= sinceIso)
        .reduce((total, usage) => total + tutorUsageTotalTokens(usage), 0);
    },

    async getClassAiTutorPolicyForTeacher(userId: string, classId: string) {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user || (user.role !== "teacher" && user.role !== "admin")) return null;
      const teacherClass = teacherCanReadClassAiTutorPolicy(database, user, classId);
      if (!teacherClass) return null;
      const canEdit = Boolean(teacherCanMutateClassAiTutorPolicy(database, user, classId));
      return {
        canEdit,
        policy: classAiTutorPolicyForRecord(database, teacherClass, currentTime().toISOString())
      };
    },

    async updateClassAiTutorPolicy({
      classId,
      mode,
      perStudentHourLimit,
      perStudentMinuteLimit,
      teacherId
    }: {
      classId: string;
      mode: ClassAiTutorMode;
      perStudentHourLimit?: number;
      perStudentMinuteLimit?: number;
      teacherId: string;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!user || (user.role !== "teacher" && user.role !== "admin")) return { status: "forbidden" as const };
        const teacherClass = teacherCanMutateClassAiTutorPolicy(database, user, classId);
        if (!teacherClass) {
          return teacherClassForAiTutorPolicy(database, classId)
            ? { status: "forbidden" as const }
            : { status: "not-found" as const };
        }

        const now = currentTime().toISOString();
        const normalizedMode = normalizeClassAiTutorMode(mode);
        const policies = database.class_ai_tutor_policies ??= [];
        const existingIndex = policies.findIndex((record) => record.class_id === classId);
        const existing = normalizeClassAiTutorPolicyRecord(
          existingIndex >= 0 ? policies[existingIndex] : undefined,
          now
        ) ?? defaultClassAiTutorPolicyRecord({
          classId,
          now: teacherClass.updated_at ?? now,
          updatedBy: teacherClass.teacher_id
        });
        const nextPreviousLiveMode = normalizedMode === "fallback-only"
          ? existing.mode === "fallback-only"
            ? existing.previous_live_mode ?? "open"
            : existing.mode
          : normalizedMode;
        const next: ClassAiTutorPolicyRecord = {
          class_id: classId,
          mode: normalizedMode,
          previous_live_mode: nextPreviousLiveMode,
          per_student_minute_limit: normalizeClassAiTutorMinuteLimit(perStudentMinuteLimit, existing.per_student_minute_limit),
          per_student_hour_limit: normalizeClassAiTutorHourLimit(perStudentHourLimit, existing.per_student_hour_limit),
          fallback_on_failure: true,
          updated_by: teacherId,
          updated_at: now
        };

        if (existingIndex >= 0) {
          policies[existingIndex] = next;
        } else {
          policies.push(next);
        }

        return {
          policy: classAiTutorPolicyRecordToPublic(next),
          status: "saved" as const
        };
      });
    },

    async resolveStudentAiTutorPolicy(userId: string) {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      const now = currentTime().toISOString();
      if (!user || user.role !== "student") return fallbackClassAiTutorPolicy("default", "system", now);
      const classIds = new Set(
        (database.class_enrollments ?? [])
          .filter((enrollment) => enrollment.student_id === userId)
          .map((enrollment) => enrollment.class_id)
      );
      if (!classIds.size) return fallbackClassAiTutorPolicy("default", "system", now);

      const policies = (database.teacher_classes ?? [])
        .filter((teacherClass) => classIds.has(teacherClass.id))
        .map((teacherClass) => classAiTutorPolicyForRecord(database, teacherClass, now));

      return mergeClassAiTutorPoliciesByStrictest(
        policies,
        fallbackClassAiTutorPolicy("default", "system", now)
      );
    },

    async consumeAiCapabilityRateLimit({
      capability,
      rules,
      userId,
      now = currentTime()
    }: {
      capability: AiCapability;
      rules: AiCapabilityRateLimitRule[];
      userId: string;
      now?: Date;
    }): Promise<AiCapabilityRateLimitDecision> {
      return mutateDatabase((database) => {
        const nowMs = now.getTime();
        const maxWindowMs = Math.max(...rules.map((rule) => rule.windowMs), 60 * 1000);
        const retentionCutoffMs = nowMs - Math.max(maxWindowMs, 24 * 60 * 60 * 1000);

        database.ai_governance_events = database.ai_governance_events.filter((record) =>
          aiGovernanceEventTime(record) >= retentionCutoffMs
        );

        const decision = evaluateAiCapabilityRateLimit({
          capability,
          events: database.ai_governance_events
            .filter((record) => record.action === "request-admitted")
            .map((record) => ({
              capability: record.capability,
              userId: record.user_id,
              createdAt: record.created_at
            })),
          now,
          rules,
          userId
        });

        database.ai_governance_events.push({
          id: `ai-governance-${createId()}`,
          user_id: userId,
          capability,
          action: decision.allowed ? "request-admitted" : "rate-limit-blocked",
          reason: decision.reason,
          metadata_json: {
            remaining: decision.remaining,
            resetAt: decision.resetAt.toISOString(),
            retryAfterSeconds: decision.retryAfterSeconds,
            ...(decision.rule ? { rule: decision.rule.name } : {})
          },
          created_at: now.toISOString()
        });

        return decision;
      });
    },

    async recordAiGovernanceEvent({
      action,
      capability,
      metadata,
      reason,
      userId,
      now = currentTime()
    }: {
      action: AiGovernanceAuditAction;
      capability: AiCapability;
      metadata?: Record<string, unknown> | null;
      reason: string;
      userId: string;
      now?: Date;
    }) {
      await mutateDatabase((database) => {
        database.ai_governance_events.push({
          id: `ai-governance-${createId()}`,
          user_id: userId,
          capability,
          action,
          reason: reason.slice(0, 160),
          metadata_json: metadata ? JSON.parse(JSON.stringify(metadata)) as Record<string, unknown> : null,
          created_at: now.toISOString()
        });
        database.ai_governance_events = database.ai_governance_events.slice(-5000);
      });
    },

    async getAiGovernanceSummaryForAdmin({
      adminId,
      now = currentTime(),
      windowMs = 60 * 60 * 1000
    }: {
      adminId: string;
      now?: Date;
      windowMs?: number;
    }) {
      const database = await readDatabase();
      const admin = database.users.find((candidate) => candidate.id === adminId);
      if (admin?.role !== "admin") return null;

      const cutoffMs = now.getTime() - windowMs;
      const usageRows = database.ai_tutor_usage.filter((usage) => {
        const createdAt = Date.parse(usage.created_at);
        return Number.isFinite(createdAt) && createdAt > cutoffMs && createdAt <= now.getTime();
      });
      const blockedEvents = database.ai_governance_events.filter((event) => {
        const createdAt = Date.parse(event.created_at);
        return Number.isFinite(createdAt) && createdAt > cutoffMs && createdAt <= now.getTime() && event.action !== "request-admitted";
      });

      return {
        generatedAt: now.toISOString(),
        windowMs,
        governance: summarizeAiGovernanceEvents({
          events: database.ai_governance_events.map((event) => ({
            action: event.action,
            capability: event.capability,
            createdAt: event.created_at,
            reason: event.reason,
            userId: event.user_id
          })),
          now,
          windowMs
        }),
        aiTutorUsage: {
          requestCount: usageRows.length,
          errorCount: usageRows.filter((usage) => usage.error).length,
          promptTokens: usageRows.reduce((total, usage) => total + (usage.prompt_tokens ?? 0), 0),
          completionTokens: usageRows.reduce((total, usage) => total + (usage.completion_tokens ?? 0), 0),
          totalTokens: usageRows.reduce((total, usage) => total + tutorUsageTotalTokens(usage), 0)
        },
        recentBlockedEvents: blockedEvents
          .slice(-20)
          .reverse()
          .map((event) => ({
            action: event.action,
            capability: event.capability,
            reason: event.reason,
            createdAt: event.created_at
          }))
      };
    }
  };
}
