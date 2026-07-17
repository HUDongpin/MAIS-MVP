import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  type AITutorDataScope,
  createAiGovernancePersistenceStore,
  type AiGovernancePersistenceDatabase
} from "@/lib/server/userStore/aiGovernancePersistence";
import type {
  AdaptiveLearningDecision,
  AdaptiveLLMRecommendation,
  AdaptiveSkillState,
  AdaptiveSkillSummary,
  ParentSafeTeacherDraft,
  PilotPlatformEvent,
  PilotPlatformGuard,
  PilotPlatformLoopData,
  PilotPlatformRole,
  PilotTeacherReviewQueueItem,
  TeacherNotice,
  Topic
} from "@/types";

type AiTutorContextHelperModule = {
  addAiTutorContextScope?: (scopes: AITutorDataScope[], scope: AITutorDataScope) => void;
  addDeniedAiTutorContextScope?: (scopes: AITutorDataScope[], scope: AITutorDataScope) => void;
  mergeAiTutorScopeContextResult?: (
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
  ) => void;
  aiTutorDatabaseContextResult?: (input: {
    deniedScopes?: AITutorDataScope[];
    fallbackLines?: string[];
    includedScopes?: AITutorDataScope[];
    lines: string[];
    subjectUserId: string;
  }) => {
    deniedScopes: AITutorDataScope[];
    deterministicSummary: string | null;
    includedScopes: AITutorDataScope[];
    subjectUserId: string;
    text: string;
  };
  aiTutorDatabaseContextSubject?: (input: {
    authenticated?: {
      settings?: { selectedGrade?: "S3" | "S4" };
      user?: {
        curriculumTrack?: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
        grade?: "S3" | "S4";
        name?: string;
      };
    } | null;
    context?: { grade?: "S3" | "S4"; targetStudentId?: string | null };
    defaultCurriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
    resolveTeacherStudentProfile?: (
      teacherId: string,
      studentId: string
    ) => Promise<{
      student: {
        curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
        grade: "S3" | "S4";
        id: string;
        name: string;
      };
    } | null>;
    user?: { id: string; role: "student" | "teacher" | "parent" | "admin" } | null;
    userId: string;
  }) => Promise<{
    subjectCurriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
    subjectGrade: "S3" | "S4";
    subjectName: string;
    subjectUserId: string;
    targetStudentId: string | undefined;
    verifiedTargetProfile: {
      student: {
        curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
        grade: "S3" | "S4";
        id: string;
        name: string;
      };
    } | null;
  }>;
  aiTutorContextScopeAccess?: (input: {
    targetStudentId?: string;
    user?: { role: "student" | "teacher" | "parent" | "admin" } | null;
    userId: string;
    verifiedTargetProfile?: unknown | null;
  }) => {
    canReadAdaptiveEngine: boolean;
    canReadStudentDashboard: boolean;
    canReadTeacherDashboard: boolean;
    canReadTeacherStudentProfile: boolean;
  };
  aiTutorRequestedScopeSet?: (scopes?: AITutorDataScope[] | null) => Set<AITutorDataScope>;
  aiTutorRequestedDatabaseRecords?: <
    DatabaseRecord,
    TopicRecord,
    QuestionRecord
  >(input: {
    context?: { questionId?: string; topicId?: string };
    database: DatabaseRecord;
    questionForId: (database: DatabaseRecord, questionId: string) => QuestionRecord | null | undefined;
    topicRecordForId: (database: DatabaseRecord, topicId: string) => TopicRecord | null | undefined;
  }) => {
    requestedQuestion: QuestionRecord | null;
    requestedTopic: TopicRecord | null;
  };
  aiTutorRequestedCurriculumContext?: <
    TopicRecord extends { id: string },
    QuestionRecord
  >(input: {
    isCurriculumQuestion: (question: QuestionRecord, curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH") => boolean;
    isCurriculumTopic: (topic: TopicRecord, curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH") => boolean;
    requestedQuestion: QuestionRecord | null | undefined;
    requestedTopic: TopicRecord | null | undefined;
    subjectCurriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
  }) => {
    question: QuestionRecord | null;
    topicId: string | undefined;
  };
  aiTutorAdaptiveSummaryLines?: (input: {
    decision: ReturnType<typeof adaptiveDecisionFixture>;
    language: "en" | "zh" | "zh-Hans";
    learnerName: string;
  }) => string[];
  aiTutorDashboardSummaryLines?: (input: {
    dashboard: Record<string, unknown>;
    grade: "S3";
    language: "en" | "zh" | "zh-Hans";
    learnerName: string;
  }) => string[];
  aiTutorStudentDashboardScopeContext?: (input: {
    canReadStudentDashboard: boolean;
    getDashboardData: () => Promise<Record<string, unknown>> | Record<string, unknown>;
    grade: "S3";
    language: "en" | "zh" | "zh-Hans";
    learnerName: string;
    scopeSet: Set<AITutorDataScope>;
  }) => Promise<{
    deniedScopes: AITutorDataScope[];
    fallbackLines: string[];
    includedScopes: AITutorDataScope[];
    lines: string[];
  }>;
  aiTutorStudentProfileSummaryLines?: (profile: Record<string, unknown>, language: "en" | "zh" | "zh-Hans") => string[];
  aiTutorTeacherDashboardSummaryLines?: (dashboard: Record<string, unknown>, language: "en" | "zh" | "zh-Hans") => string[];
  aiTutorTeacherDashboardScopeContext?: (input: {
    canReadTeacherDashboard: boolean;
    getTeacherDashboardData: () => Promise<Record<string, unknown> | null> | Record<string, unknown> | null;
    language: "en" | "zh" | "zh-Hans";
    scopeSet: Set<AITutorDataScope>;
  }) => Promise<{
    deniedScopes: AITutorDataScope[];
    fallbackLines: string[];
    includedScopes: AITutorDataScope[];
    lines: string[];
  }>;
  aiTutorTeacherStudentProfileScopeContext?: (input: {
    canReadTeacherStudentProfile: boolean;
    language: "en" | "zh" | "zh-Hans";
    profile: Record<string, unknown> | null;
    scopeSet: Set<AITutorDataScope>;
  }) => {
    deniedScopes: AITutorDataScope[];
    fallbackLines: string[];
    includedScopes: AITutorDataScope[];
    lines: string[];
  };
  aiTutorAdaptiveEngineScopeContext?: (input: {
    canReadAdaptiveEngine: boolean;
    curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
    getAdaptiveLearningDecision: (input: {
      curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
      grade: "S3";
      topicId?: string;
      userId: string;
    }) => Promise<AdaptiveLearningDecision | null> | AdaptiveLearningDecision | null;
    grade: "S3";
    language: "en" | "zh" | "zh-Hans";
    learnerName: string;
    scopeSet: Set<AITutorDataScope>;
    topicId?: string;
    userId: string;
  }) => Promise<{
    deniedScopes: AITutorDataScope[];
    fallbackLines: string[];
    includedScopes: AITutorDataScope[];
    lines: string[];
  }>;
  aiTutorContextText?: (value: { en: string; zh: string }, language: "en" | "zh" | "zh-Hans") => string;
  aiTutorContextTopicList?: (topics: Topic[], language: "en" | "zh" | "zh-Hans", limit?: number) => string;
  aiTutorContextSkillList?: (summaries: AdaptiveSkillSummary[], language: "en" | "zh" | "zh-Hans", limit?: number) => string;
  aiTutorCurriculumPolicyLines?: (curriculumTrack: string) => string[];
  aiTutorCurrentQuestionContextLines?: (input: {
    allowAnswerReference?: boolean;
    answer?: string;
    explanation?: string;
    prompt: string;
    topicLabel: string;
  }) => string[];
  aiTutorLessonProgressContextLines?: (input: {
    mastery?: number | null;
    status?: string | null;
    title: string;
  }) => string[];
  aiTutorLessonContextInput?: <
    LessonRecord extends { slug: string; title_en: string; topic_id: string },
    TopicRecord,
    ProgressRecord extends { mastery?: number | null; status?: string | null }
  >(
    database: { lessons: LessonRecord[] },
    input: {
      isCurriculumTopic: (topic: TopicRecord, curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH") => boolean;
      lessonForTopic: (topicId: string) => LessonRecord | null | undefined;
      lessonProgressFor: (lesson: LessonRecord) => ProgressRecord | null | undefined;
      lessonSlug?: string;
      subjectCurriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
      topicForLesson: (lesson: LessonRecord) => TopicRecord | null | undefined;
      topicId?: string;
    }
  ) => {
    mastery?: number | null;
    status?: string | null;
    title: string;
  } | null;
  aiTutorRecentAttemptContextLines?: (attempts: Array<{
    durationSeconds?: number | null;
    isCorrect: boolean;
    selectedAnswer: string;
    topicLabel: string;
  }>) => string[];
  aiTutorRecentAttemptContextInputs?: <QuestionRecord extends { topic_id?: string | null }>(
    database: {
      attempts: Array<{
        created_at: string;
        duration_seconds?: number | null;
        is_correct: boolean;
        question_id: string;
        selected_answer: string;
        user_id: string;
      }>;
    },
    input: {
      isCurriculumQuestion: (question: QuestionRecord, curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH") => boolean;
      questionForId: (questionId: string) => QuestionRecord | null | undefined;
      subjectCurriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
      topicId?: string;
      topicLabelForQuestion: (question: QuestionRecord) => string;
      userId: string;
    }
  ) => Array<{
    durationSeconds?: number | null;
    isCorrect: boolean;
    selectedAnswer: string;
    topicLabel: string;
  }>;
  aiTutorRecentMistakeContextLines?: (mistakes: Array<{
    lastSelectedAnswer: string;
    prompt: string;
    wrongAttempts: number;
  }>) => string[];
  aiTutorRecentMistakeContextInputs?: <QuestionRecord extends { prompt_en?: string; topic_id?: string | null }>(
    database: {
      mistakes: Array<{
        last_attempt_at: string;
        last_selected_answer: string;
        mastered: boolean;
        question_id: string;
        user_id: string;
        wrong_attempts: number;
      }>;
    },
    input: {
      isCurriculumQuestion: (question: QuestionRecord, curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH") => boolean;
      questionForId: (questionId: string) => QuestionRecord | null | undefined;
      subjectCurriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
      topicId?: string;
      userId: string;
    }
  ) => Array<{
    lastSelectedAnswer: string;
    prompt: string;
    wrongAttempts: number;
  }>;
  aiTutorRecentTutorMessageContextLines?: (messages: Array<{
    content: string;
    role: "student" | "tutor";
  }>) => string[];
  aiTutorRecentMessageContextInputs?: (
    database: Pick<AiGovernancePersistenceDatabase, "ai_tutor_messages">,
    userId: string
  ) => Array<{
    content: string;
    role: "student" | "tutor";
  }>;
  aiGovernancePilotGuard?: (
    allowed: boolean,
    visibility: PilotPlatformGuard["visibility"],
    reason: PilotPlatformGuard["reason"]
  ) => PilotPlatformGuard;
  aiGovernancePilotRoleFor?: (user: { role: "student" | "teacher" | "parent" | "admin" }) => PilotPlatformRole;
  aiGovernanceLatestAdaptiveTransitionAt?: (states: AdaptiveSkillState[]) => string | null;
  aiGovernanceNextAdaptiveReviewAt?: (states: AdaptiveSkillState[]) => string | null;
  aiGovernancePilotLearnerEvents?: (input: {
    user: { id: string; role: "student" | "teacher" | "parent" | "admin" };
    decision: AdaptiveLearningDecision | null;
    lastTransitionAt: string | null;
    now?: string;
  }) => PilotPlatformEvent[];
  aiGovernancePilotEventsForTeacherQueue?: (
    user: { id: string; role: "student" | "teacher" | "parent" | "admin" },
    queue: PilotTeacherReviewQueueItem[]
  ) => PilotPlatformEvent[];
  aiGovernancePilotEventsForParentDrafts?: (
    user: { id: string; role: "student" | "teacher" | "parent" | "admin" },
    drafts: ParentSafeTeacherDraft[],
    now?: string
  ) => PilotPlatformEvent[];
  aiGovernanceTeacherReviewQueueForPilot?: (
    records: Array<{
      id: string;
      assessment_id: string;
      class_id: string;
      source_snapshot: { className: string };
      title_en: string;
      title_zh: string;
      status: "draft" | "generated" | "reviewed";
      generated_at: string;
      reviewed_at: string | null;
      updated_at: string;
    }>,
    helpers: {
      canAccessClass: (classId: string) => boolean;
      parentSafeDraftForReviewLesson: (reviewLessonId: string) => ParentSafeTeacherDraft | null;
    }
  ) => PilotTeacherReviewQueueItem[];
  aiGovernanceParentSafeDraftsForPilot?: (
    database: {
      teacher_notices: Array<{
        id: string;
        status: string;
        source_kind?: string | null;
        source_id?: string | null;
        updated_at: string;
      }>;
      teacher_notice_recipients: Array<{
        notice_id: string;
        student_id: string;
        guardian_id?: string | null;
        status: string;
      }>;
    },
    user: { id: string; role: "student" | "teacher" | "parent" | "admin" },
    helpers: {
      allowedStudentIdsForParent: (
        database: {
          teacher_notices: Array<{
            id: string;
            status: string;
            source_kind?: string | null;
            source_id?: string | null;
            updated_at: string;
          }>;
          teacher_notice_recipients: Array<{
            notice_id: string;
            student_id: string;
            guardian_id?: string | null;
            status: string;
          }>;
        },
        user: { id: string; role: "student" | "teacher" | "parent" | "admin" }
      ) => Iterable<string>;
      parentSafeTeacherDraftFromNotice: (
        database: {
          teacher_notices: Array<{
            id: string;
            status: string;
            source_kind?: string | null;
            source_id?: string | null;
            updated_at: string;
          }>;
          teacher_notice_recipients: Array<{
            notice_id: string;
            student_id: string;
            guardian_id?: string | null;
            status: string;
          }>;
        },
        record: {
          id: string;
          status: string;
          source_kind?: string | null;
          source_id?: string | null;
          updated_at: string;
        },
        noticeOverride: TeacherNotice
      ) => ParentSafeTeacherDraft | null;
      toTeacherNotice: (
        database: {
          teacher_notices: Array<{
            id: string;
            status: string;
            source_kind?: string | null;
            source_id?: string | null;
            updated_at: string;
          }>;
          teacher_notice_recipients: Array<{
            notice_id: string;
            student_id: string;
            guardian_id?: string | null;
            status: string;
          }>;
        },
        record: {
          id: string;
          status: string;
          source_kind?: string | null;
          source_id?: string | null;
          updated_at: string;
        }
      ) => TeacherNotice;
    }
  ) => ParentSafeTeacherDraft[];
  normalizeAiGovernanceAdaptiveLLMStatus?: (status: unknown) => string;
  normalizeAiGovernanceAdaptiveEngineErrorKind?: (errorKind: unknown) => string | null;
  normalizeAiGovernanceCachedLLMRecommendation?: (value: unknown) => AdaptiveLLMRecommendation | null;
  normalizeAiGovernanceAdaptiveRecommendationCacheRecords?: (
    records: Array<Record<string, unknown>> | undefined,
    now: string
  ) => Array<Record<string, unknown>>;
};

function createTestStore(
  database: AiGovernancePersistenceDatabase,
  options: Partial<Parameters<typeof createAiGovernancePersistenceStore>[0]> = {}
) {
  const ids = ["message-1", "usage-1", "event-1", "event-2", "event-3"];

  return createAiGovernancePersistenceStore({
    createId: () => ids.shift() ?? "fallback-id",
    now: () => new Date("2026-06-20T10:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    ...options
  });
}

function pilotLoopFixture(source: string): PilotPlatformLoopData {
  return {
    mode: "p1-platform-loop",
    generatedAt: "2026-06-20T10:00:00.000Z",
    role: "student",
    actorId: source,
    guard: {
      allowed: true,
      visibility: "student-owned",
      reason: {
        en: source,
        zh: source
      }
    },
    learnerState: null,
    teacherReviewQueue: [],
    parentSafeDrafts: [],
    events: []
  };
}

function aiTutorContextFixture(source: string) {
  return {
    text: `context:${source}`,
    deterministicSummary: `summary:${source}`,
    includedScopes: ["student-dashboard" as const],
    deniedScopes: [],
    subjectUserId: source
  };
}

function adaptiveDecisionFixture(source: string): AdaptiveLearningDecision {
  return {
    action: "practice",
    confidence: "strong",
    deterministic: true,
    evidenceCount: 0,
    guardFlags: [],
    nextReviewAt: null,
    generatedAt: "2026-06-20T10:00:00.000Z",
    topic: {
      id: source,
      curriculumTrack: "HK",
      title: {
        en: source,
        zh: source
      },
      description: {
        en: source,
        zh: source
      },
      grade: "S3",
      status: "not-started",
      difficulty: "Medium",
      minutes: 20,
      mastery: 0
    },
    skill: {
      id: `${source}:skill`,
      topicId: source,
      grade: "S3",
      title: {
        en: source,
        zh: source
      },
      description: {
        en: source,
        zh: source
      },
      prerequisites: [],
      difficulty: "Medium",
      misconceptionTags: [],
      questionIds: []
    },
    lesson: null,
    questions: [],
    evidence: [],
    dueReviews: [],
    skillMap: [],
    explanation: {
      en: source,
      zh: source
    },
    engine: {
      version: "hybrid-v3",
      mode: "deterministic",
      llmStatus: "disabled",
      selectedCandidateId: `${source}:candidate`,
      deterministicCandidateId: `${source}:candidate`,
      candidateSignature: source
    }
  };
}

test("AI governance persistence store records tutor messages and token usage without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database: AiGovernancePersistenceDatabase = {
    ai_governance_events: [],
    ai_tutor_messages: [],
    ai_tutor_usage: [],
    users: []
  };
  const store = createTestStore(database);
  const context = { nested: { value: "kept" } };

  await store.recordAITutorMessage({
    userId: "student-1",
    role: "student",
    content: "How do I factor this?",
    context
  });
  context.nested.value = "mutated";
  await store.recordAITutorUsage({
    userId: "student-1",
    model: "unit-model",
    promptTokens: 7,
    completionTokens: 11
  });
  await store.recordAITutorUsage({
    userId: "student-1",
    model: "unit-model",
    totalTokens: 100,
    error: "provider-timeout"
  });

  assert.deepEqual(database.ai_tutor_messages[0], {
    id: "message-1",
    user_id: "student-1",
    role: "student",
    content: "How do I factor this?",
    context_json: { nested: { value: "kept" } },
    created_at: "2026-06-20T10:00:00.000Z"
  });
  assert.equal(await store.getAITutorTokenUsageSince("student-1", "2026-06-20T09:00:00.000Z"), 118);
});

test("AI governance persistence owns durable event normalization for legacy database load", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/aiGovernancePersistence") as Record<string, unknown>;
  const normalizeEvent = helpers.normalizeAiGovernanceEventRecord;

  assert.equal(typeof normalizeEvent, "function");
  assert.match(persistenceSource, /export function normalizeAiGovernanceEventRecord\b/);
  assert.doesNotMatch(compatibilitySource, /function normalizeAiGovernanceEventRecord\b/);
  assert.doesNotMatch(compatibilitySource, /normalizeAiGovernanceEventRecordFromPersistence/);

  const metadata = { nested: { value: "kept" } };
  const normalized = (normalizeEvent as (
    value: unknown,
    now: string,
    createId: () => string
  ) => {
    id: string;
    user_id: string;
    capability: string;
    action: string;
    reason: string;
    metadata_json: Record<string, unknown> | null;
    created_at: string;
  } | null)({
    user_id: "  student-1  ",
    capability: "ai-tutor-chat",
    action: "unknown-action",
    reason: "  ok ".repeat(80),
    metadata_json: metadata
  }, "2026-06-20T10:00:00.000Z", () => "event-1");
  metadata.nested.value = "mutated";

  assert.equal(normalized?.id, "ai-governance-event-1");
  assert.equal(normalized?.user_id, "student-1");
  assert.equal(normalized?.action, "request-admitted");
  assert.equal(normalized?.reason.length, 160);
  assert.deepEqual(normalized?.metadata_json, { nested: { value: "kept" } });
  assert.equal(normalized?.created_at, "2026-06-20T10:00:00.000Z");

  assert.equal((normalizeEvent as (value: unknown) => unknown)({
    user_id: "",
    capability: "ai-tutor-chat",
    action: "request-admitted",
    reason: "ok"
  }), null);
  assert.equal((normalizeEvent as (value: unknown) => unknown)({
    user_id: "student-1",
    capability: "unknown-capability",
    action: "request-admitted",
    reason: "ok"
  }), null);
});

test("AI governance persistence owns durable event collection normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/aiGovernancePersistence") as Record<string, unknown>;
  const normalizeEvents = helpers.normalizeAiGovernanceEventRecords;

  assert.equal(typeof normalizeEvents, "function");
  assert.match(persistenceSource, /export function normalizeAiGovernanceEventRecords\b/);
  assert.match(compatibilitySource, /normalizeAiGovernanceEventRecords as normalizeAiGovernanceEventRecordsFromPersistence/);
  assert.doesNotMatch(compatibilitySource, /ai_governance_events: \(database\.ai_governance_events \?\? \[\]\)/);

  const records = Array.from({ length: 5002 }, (_, index) => ({
    id: `event-${index}`,
    user_id: ` student-${index} `,
    capability: "ai-tutor-chat",
    action: index === 5001 ? "unknown-action" : "rate-limit-blocked",
    reason: "  ok  ",
    metadata_json: { index },
    created_at: `2026-06-20T10:${String(index % 60).padStart(2, "0")}:00.000Z`
  }));

  const normalized = (normalizeEvents as (
    records: unknown[] | undefined,
    now: string,
    createId: () => string
  ) => Array<{
    id: string;
    user_id: string;
    action: string;
    reason: string;
    metadata_json: Record<string, unknown> | null;
  }>)([
    { user_id: "", capability: "ai-tutor-chat" },
    ...records
  ], "2026-06-20T10:00:00.000Z", () => "generated-event");

  assert.equal(normalized.length, 5000);
  assert.equal(normalized[0]?.id, "event-2");
  assert.equal(normalized[0]?.user_id, "student-2");
  assert.equal(normalized[4999]?.id, "event-5001");
  assert.equal(normalized[4999]?.action, "request-admitted");
  assert.equal(normalized[4999]?.reason, "ok");
  assert.deepEqual(normalized[4999]?.metadata_json, { index: 5001 });
  assert.deepEqual((normalizeEvents as (
    records: unknown[] | undefined,
    now: string,
    createId: () => string
  ) => unknown[])(undefined, "2026-06-20T10:00:00.000Z", () => "generated-event"), []);
});

test("AI governance persistence owns tutor message and usage record defaults for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/aiGovernancePersistence") as Record<string, unknown>;
  const normalizeTutorMessageRecords = helpers.normalizeAiGovernanceTutorMessageRecords as ((
    records?: AiGovernancePersistenceDatabase["ai_tutor_messages"]
  ) => AiGovernancePersistenceDatabase["ai_tutor_messages"]) | undefined;
  const normalizeTutorUsageRecords = helpers.normalizeAiGovernanceTutorUsageRecords as ((
    records?: AiGovernancePersistenceDatabase["ai_tutor_usage"]
  ) => AiGovernancePersistenceDatabase["ai_tutor_usage"]) | undefined;
  const messageRecords: AiGovernancePersistenceDatabase["ai_tutor_messages"] = [
    {
      id: "message-1",
      user_id: "student-1",
      role: "tutor",
      content: "Try factoring first.",
      context_json: null,
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ];
  const usageRecords: AiGovernancePersistenceDatabase["ai_tutor_usage"] = [
    {
      id: "usage-1",
      user_id: "student-1",
      model: "unit-model",
      prompt_tokens: 12,
      completion_tokens: 6,
      total_tokens: 18,
      error: null,
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ];

  assert.equal(typeof normalizeTutorMessageRecords, "function");
  assert.equal(typeof normalizeTutorUsageRecords, "function");
  assert.match(persistenceSource, /export function normalizeAiGovernanceTutorMessageRecords\b/);
  assert.match(persistenceSource, /export function normalizeAiGovernanceTutorUsageRecords\b/);
  assert.match(rootSource, /normalizeAiGovernanceTutorMessageRecords as normalizeTutorMessageRecordsFromAiGovernancePersistence/);
  assert.match(rootSource, /normalizeAiGovernanceTutorUsageRecords as normalizeTutorUsageRecordsFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /ai_tutor_messages: database\.ai_tutor_messages \?\? \[\]/);
  assert.doesNotMatch(rootSource, /ai_tutor_usage: database\.ai_tutor_usage \?\? \[\]/);
  assert.deepEqual(normalizeTutorMessageRecords?.(undefined), []);
  assert.deepEqual(normalizeTutorUsageRecords?.(undefined), []);
  assert.equal(normalizeTutorMessageRecords?.(messageRecords), messageRecords);
  assert.equal(normalizeTutorUsageRecords?.(usageRecords), usageRecords);
});

test("AI governance persistence owns adaptive LLM cache status normalization helpers", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.normalizeAiGovernanceAdaptiveLLMStatus, "function");
  assert.equal(typeof module.normalizeAiGovernanceAdaptiveEngineErrorKind, "function");
  assert.match(persistenceSource, /export function normalizeAiGovernanceAdaptiveLLMStatus\b/);
  assert.match(persistenceSource, /export function normalizeAiGovernanceAdaptiveEngineErrorKind\b/);
  assert.doesNotMatch(rootSource, /const validAdaptiveLLMStatuses\b/);
  assert.doesNotMatch(rootSource, /const validAdaptiveEngineErrorKinds\b/);
  assert.doesNotMatch(rootSource, /function isAdaptiveEngineErrorKind\b/);

  assert.equal(module.normalizeAiGovernanceAdaptiveLLMStatus?.("ready"), "ready");
  assert.equal(module.normalizeAiGovernanceAdaptiveLLMStatus?.("timed-out"), "failed");
  assert.equal(module.normalizeAiGovernanceAdaptiveEngineErrorKind?.("provider"), "provider");
  assert.equal(module.normalizeAiGovernanceAdaptiveEngineErrorKind?.("timeout"), null);
});

test("AI governance persistence owns cached LLM recommendation normalization", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.normalizeAiGovernanceCachedLLMRecommendation, "function");
  assert.deepEqual(module.normalizeAiGovernanceCachedLLMRecommendation?.({
    selectedCandidateId: "candidate-1",
    questionIds: ["q1", 42, "q2"],
    learnerReason: { en: "Practice slope.", zh: "練習斜率。" },
    teacherAuditNote: { en: "Uses recent attempts.", zh: "使用近期作答。" },
    signalsUsed: ["mistake", 17, "mastery", "pace", "review", "difficulty", "topic", "streak", "extra"],
    confidenceExplanation: { en: "Strong signal set.", zh: "訊號充分。" }
  }), {
    selectedCandidateId: "candidate-1",
    questionIds: ["q1", "q2"],
    learnerReason: { en: "Practice slope.", zh: "練習斜率。" },
    teacherAuditNote: { en: "Uses recent attempts.", zh: "使用近期作答。" },
    signalsUsed: ["mistake", "mastery", "pace", "review", "difficulty", "topic", "streak", "extra"],
    confidenceExplanation: { en: "Strong signal set.", zh: "訊號充分。" }
  });
  assert.equal(module.normalizeAiGovernanceCachedLLMRecommendation?.({
    selectedCandidateId: "candidate-1",
    learnerReason: { en: "Practice slope.", zh: "練習斜率。" },
    teacherAuditNote: { en: "Uses recent attempts.", zh: "使用近期作答。" },
    signalsUsed: ["mistake"]
  }), null);
  assert.doesNotMatch(rootSource, /function normalizeCachedLLMRecommendation\b/);
});

test("AI governance persistence owns adaptive recommendation cache record normalization", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.normalizeAiGovernanceAdaptiveRecommendationCacheRecords, "function");
  assert.deepEqual(module.normalizeAiGovernanceAdaptiveRecommendationCacheRecords?.([
    {
      id: "cache-1",
      user_id: "student-1",
      grade: "S3",
      topic_id: "",
      candidate_signature: "signature-1",
      status: "timed-out",
      selected_candidate_id: 42,
      question_ids: ["q1", 42, "q2"],
      recommendation_json: {
        selectedCandidateId: "candidate-1",
        questionIds: ["q1", false, "q2"],
        learnerReason: { en: "Practice slope.", zh: "練習斜率。" },
        teacherAuditNote: { en: "Uses recent attempts.", zh: "使用近期作答。" },
        signalsUsed: ["mistake", 17, "mastery"],
        confidenceExplanation: { en: "Strong signal set.", zh: "訊號充分。" }
      },
      provider: 123,
      model: "deepseek",
      prompt_tokens: -3.4,
      completion_tokens: 2.6,
      total_tokens: Number.NaN,
      error: 404,
      error_kind: "timeout",
      finish_reason: "stop",
      created_at: 123,
      updated_at: "2026-06-20T09:00:00.000Z"
    },
    {
      id: "cache-invalid-grade",
      user_id: "student-1",
      grade: "S99",
      candidate_signature: "signature-2"
    },
    {
      id: "cache-missing-signature",
      user_id: "student-1",
      grade: "S3"
    }
  ], "2026-06-21T08:00:00.000Z"), [
    {
      id: "cache-1",
      user_id: "student-1",
      grade: "S3",
      topic_id: null,
      candidate_signature: "signature-1",
      status: "failed",
      selected_candidate_id: null,
      question_ids: ["q1", "q2"],
      recommendation_json: {
        selectedCandidateId: "candidate-1",
        questionIds: ["q1", "q2"],
        learnerReason: { en: "Practice slope.", zh: "練習斜率。" },
        teacherAuditNote: { en: "Uses recent attempts.", zh: "使用近期作答。" },
        signalsUsed: ["mistake", "mastery"],
        confidenceExplanation: { en: "Strong signal set.", zh: "訊號充分。" }
      },
      provider: null,
      model: "deepseek",
      prompt_tokens: 0,
      completion_tokens: 3,
      total_tokens: null,
      error: null,
      error_kind: null,
      finish_reason: "stop",
      created_at: "2026-06-21T08:00:00.000Z",
      updated_at: "2026-06-20T09:00:00.000Z"
    }
  ]);
  assert.doesNotMatch(rootSource, /normalizeAiGovernanceAdaptiveLLMStatus as normalizeAdaptiveLLMStatusFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /normalizeAiGovernanceAdaptiveEngineErrorKind as normalizeAdaptiveEngineErrorKindFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /normalizeAiGovernanceCachedLLMRecommendation as normalizeCachedLLMRecommendationFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /function normalizeAdaptiveRecommendationCacheRecords\b/);
});

test("AI governance persistence store evaluates durable rate limits and admin summaries", async () => {
  const database: AiGovernancePersistenceDatabase = {
    ai_governance_events: [
      {
        id: "old-event",
        user_id: "student-1",
        capability: "ai-tutor-chat",
        action: "request-admitted",
        reason: "ok",
        metadata_json: null,
        created_at: "2026-06-18T09:59:59.000Z"
      },
      {
        id: "recent-event",
        user_id: "student-1",
        capability: "ai-tutor-chat",
        action: "request-admitted",
        reason: "ok",
        metadata_json: null,
        created_at: "2026-06-20T09:59:50.000Z"
      }
    ],
    ai_tutor_messages: [],
    ai_tutor_usage: [
      {
        id: "usage-window",
        user_id: "student-1",
        model: "unit-model",
        prompt_tokens: 3,
        completion_tokens: 4,
        total_tokens: null,
        error: null,
        created_at: "2026-06-20T09:59:00.000Z"
      }
    ],
    users: [
      {
        id: "admin-1",
        role: "admin"
      }
    ]
  };
  const store = createTestStore(database);

  const decision = await store.consumeAiCapabilityRateLimit({
    capability: "ai-tutor-chat",
    rules: [{ name: "minute", max: 1, windowMs: 60_000 }],
    userId: "student-1",
    now: new Date("2026-06-20T10:00:00.000Z")
  });
  await store.recordAiGovernanceEvent({
    action: "media-policy-blocked",
    capability: "profile-avatar",
    metadata: { objectKey: "hidden" },
    reason: "media policy rejected the object reference",
    userId: "student-2",
    now: new Date("2026-06-20T09:58:00.000Z")
  });

  assert.equal(decision.allowed, false);
  assert.equal(database.ai_governance_events.some((event) => event.id === "old-event"), false);
  assert.equal(database.ai_governance_events.at(-2)?.action, "rate-limit-blocked");
  assert.equal(database.ai_governance_events.at(-1)?.action, "media-policy-blocked");

  const summary = await store.getAiGovernanceSummaryForAdmin({
    adminId: "admin-1",
    now: new Date("2026-06-20T10:00:00.000Z"),
    windowMs: 5 * 60_000
  });

  assert.equal(summary?.aiTutorUsage.totalTokens, 7);
  assert.equal(summary?.governance.byCapability["ai-tutor-chat"]?.blocked, 1);
  assert.equal(summary?.recentBlockedEvents.some((event) => event.action === "rate-limit-blocked"), true);
});

test("AI governance persistence resolves pilot platform loop data through extracted boundary", async () => {
  const database: AiGovernancePersistenceDatabase = {
    ai_governance_events: [],
    ai_tutor_messages: [],
    ai_tutor_usage: [],
    users: []
  };
  const calls: string[] = [];
  const store = createTestStore(database, {
    pilotPlatformLoopDataFromDatabase: (candidateDatabase, input) => {
      const source = candidateDatabase === database ? "snapshot" : "unknown";
      calls.push(`${source}:${input.userId}:${input.grade ?? "default"}`);
      return pilotLoopFixture(source);
    }
  });

  assert.deepEqual(await store.getPilotPlatformLoopData({ userId: "student-1", grade: "S3" }), pilotLoopFixture("snapshot"));
  assert.deepEqual(calls, [
    "snapshot:student-1:S3"
  ]);
});

test("AI governance persistence builds AI Tutor database context through extracted boundary", async () => {
  const database: AiGovernancePersistenceDatabase = {
    ai_governance_events: [],
    ai_tutor_messages: [],
    ai_tutor_usage: [],
    users: []
  };
  const calls: string[] = [];
  const store = createTestStore(database, {
    aiTutorDatabaseContextFromDatabase: (candidateDatabase, userId, context) => {
      const source = candidateDatabase === database ? "snapshot" : "unknown";
      calls.push(`${source}:${userId}:${context?.page ?? "none"}:${context?.dataScopes?.join(",") ?? "none"}`);
      return aiTutorContextFixture(source);
    }
  });

  assert.deepEqual(
    await store.buildAITutorDatabaseContext("student-1", {
      page: "dashboard",
      dataScopes: ["student-dashboard"]
    }),
    aiTutorContextFixture("snapshot")
  );
  assert.deepEqual(calls, [
    "snapshot:student-1:dashboard:student-dashboard"
  ]);
});

test("AI governance persistence owns AI Tutor context list and scope helpers", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.addAiTutorContextScope, "function");
  assert.equal(typeof module.addDeniedAiTutorContextScope, "function");
  assert.equal(typeof module.mergeAiTutorScopeContextResult, "function");
  assert.equal(typeof module.aiTutorContextText, "function");
  assert.equal(typeof module.aiTutorContextTopicList, "function");
  assert.equal(typeof module.aiTutorContextSkillList, "function");
  assert.match(persistenceSource, /export function mergeAiTutorScopeContextResult\b/);
  assert.match(rootSource, /mergeAiTutorScopeContextResult as mergeAiTutorScopeContextResultFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /\.includedScopes\.forEach\(\(scope\) => addTutorScopeFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /\.deniedScopes\.forEach\(\(scope\) => addDeniedTutorScopeFromAiGovernancePersistence/);

  const includedScopes: AITutorDataScope[] = ["student-dashboard"];
  module.addAiTutorContextScope?.(includedScopes, "student-dashboard");
  module.addAiTutorContextScope?.(includedScopes, "adaptive-engine");
  assert.deepEqual(includedScopes, ["student-dashboard", "adaptive-engine"]);

  const deniedScopes: AITutorDataScope[] = ["teacher-dashboard"];
  module.addDeniedAiTutorContextScope?.(deniedScopes, "teacher-dashboard");
  module.addDeniedAiTutorContextScope?.(deniedScopes, "teacher-student-profile");
  assert.deepEqual(deniedScopes, ["teacher-dashboard", "teacher-student-profile"]);

  const target = {
    lines: ["base"],
    fallbackLines: ["fallback"],
    includedScopes: ["student-dashboard" as AITutorDataScope],
    deniedScopes: ["teacher-dashboard" as AITutorDataScope]
  };
  module.mergeAiTutorScopeContextResult?.(target, {
    lines: ["child"],
    fallbackLines: ["child fallback"],
    includedScopes: ["student-dashboard", "adaptive-engine"],
    deniedScopes: ["teacher-dashboard", "teacher-student-profile"]
  });
  assert.deepEqual(target, {
    lines: ["base", "child"],
    fallbackLines: ["fallback", "child fallback"],
    includedScopes: ["student-dashboard", "adaptive-engine"],
    deniedScopes: ["teacher-dashboard", "teacher-student-profile"]
  });

  assert.equal(module.aiTutorContextText?.({ en: "Fractions", zh: "分數" }, "zh"), "分數");

  const topics: Topic[] = [
    {
      id: "fractions",
      curriculumTrack: "HK",
      grade: "S3",
      title: { en: "Fractions", zh: "分數" },
      description: { en: "Fractions", zh: "分數" },
      status: "in-progress",
      difficulty: "Medium",
      minutes: 20,
      mastery: 42
    },
    {
      id: "linear",
      curriculumTrack: "HK",
      grade: "S3",
      title: { en: "Linear equations", zh: "一次方程" },
      description: { en: "Linear equations", zh: "一次方程" },
      status: "completed",
      difficulty: "Low",
      minutes: 15,
      mastery: 88
    }
  ];
  const skillSummaries: AdaptiveSkillSummary[] = [
    {
      skill: {
        id: "fractions:compare",
        topicId: "fractions",
        grade: "S3",
        title: { en: "Compare fractions", zh: "比較分數" },
        description: { en: "Compare fractions", zh: "比較分數" },
        prerequisites: [],
        difficulty: "Medium",
        misconceptionTags: [],
        questionIds: []
      },
      state: {
        skillId: "fractions:compare",
        pMastery: 0.623,
        attemptCount: 3,
        correctStreak: 1,
        wrongStreak: 0,
        lastPracticedAt: null,
        nextReviewAt: null,
        hintCount: 0,
        misconceptionTags: [],
        updatedAt: "2026-06-20T10:00:00.000Z"
      },
      topic: topics[0]
    }
  ];

  assert.equal(
    module.aiTutorContextTopicList?.(topics, "en", 1),
    "Fractions (42%, in-progress)"
  );
  assert.equal(
    module.aiTutorContextSkillList?.(skillSummaries, "zh", 3),
    "比較分數 (62%)"
  );
});

test("AI governance persistence owns AI Tutor database context result assembly", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiTutorDatabaseContextResult, "function");
  assert.match(persistenceSource, /export function aiTutorDatabaseContextResult\b/);
  assert.match(rootSource, /aiTutorDatabaseContextResult as aiTutorDatabaseContextResultFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /deterministicSummary: fallbackLines\.length/);

  assert.deepEqual(module.aiTutorDatabaseContextResult?.({
    deniedScopes: ["teacher-dashboard"],
    fallbackLines: ["Dashboard snapshot", "Adaptive snapshot"],
    includedScopes: ["student-dashboard"],
    lines: ["Database-backed personalization:", "Current question: Fractions"],
    subjectUserId: "student-1"
  }), {
    text: "Database-backed personalization:\nCurrent question: Fractions",
    deterministicSummary: "Dashboard snapshot\nAdaptive snapshot",
    includedScopes: ["student-dashboard"],
    deniedScopes: ["teacher-dashboard"],
    subjectUserId: "student-1"
  });

  assert.equal(module.aiTutorDatabaseContextResult?.({
    lines: ["Database-backed personalization:"],
    subjectUserId: "student-2"
  }).deterministicSummary, null);
});

test("AI governance persistence owns AI Tutor context subject resolution", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiTutorDatabaseContextSubject, "function");
  assert.match(persistenceSource, /export async function aiTutorDatabaseContextSubject\b/);
  assert.match(rootSource, /aiTutorDatabaseContextSubject as aiTutorDatabaseContextSubjectFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /const targetStudentId = context\?\.targetStudentId\?\.trim\(\)/);

  let teacherProfileCalls = 0;
  const ownStudent = await module.aiTutorDatabaseContextSubject?.({
    authenticated: {
      settings: { selectedGrade: "S3" },
      user: { curriculumTrack: "HK", grade: "S3", name: "Ada" }
    },
    context: { targetStudentId: "student-1" },
    defaultCurriculumTrack: "US_CA_MATH",
    resolveTeacherStudentProfile: async () => {
      teacherProfileCalls += 1;
      return null;
    },
    user: { id: "student-1", role: "student" },
    userId: "student-1"
  });
  assert.deepEqual(ownStudent, {
    subjectCurriculumTrack: "HK",
    subjectGrade: "S3",
    subjectName: "Ada",
    subjectUserId: "student-1",
    targetStudentId: "student-1",
    verifiedTargetProfile: null
  });
  assert.equal(teacherProfileCalls, 0);

  const teacherTarget = await module.aiTutorDatabaseContextSubject?.({
    authenticated: {
      settings: { selectedGrade: "S4" },
      user: { curriculumTrack: "HK", grade: "S4", name: "Ms Chan" }
    },
    context: { targetStudentId: " student-2 " },
    defaultCurriculumTrack: "HK",
    resolveTeacherStudentProfile: async (teacherId, studentId) => {
      teacherProfileCalls += 1;
      assert.equal(teacherId, "teacher-1");
      assert.equal(studentId, "student-2");
      return {
        student: {
          curriculumTrack: "MAINLAND_PEP_HIGH",
          grade: "S3",
          id: "student-2",
          name: "Ben"
        }
      };
    },
    user: { id: "teacher-1", role: "teacher" },
    userId: "teacher-1"
  });
  assert.deepEqual(teacherTarget, {
    subjectCurriculumTrack: "MAINLAND_PEP_HIGH",
    subjectGrade: "S3",
    subjectName: "Ben",
    subjectUserId: "student-2",
    targetStudentId: "student-2",
    verifiedTargetProfile: {
      student: {
        curriculumTrack: "MAINLAND_PEP_HIGH",
        grade: "S3",
        id: "student-2",
        name: "Ben"
      }
    }
  });
  assert.equal(teacherProfileCalls, 1);

  const deniedParentTarget = await module.aiTutorDatabaseContextSubject?.({
    authenticated: null,
    context: { grade: "S4", targetStudentId: "student-3" },
    defaultCurriculumTrack: "US_CA_MATH",
    resolveTeacherStudentProfile: async () => {
      throw new Error("parent target should not resolve through teacher profile");
    },
    user: { id: "parent-1", role: "parent" },
    userId: "parent-1"
  });
  assert.deepEqual(deniedParentTarget, {
    subjectCurriculumTrack: "US_CA_MATH",
    subjectGrade: "S4",
    subjectName: "parent-1",
    subjectUserId: "parent-1",
    targetStudentId: "student-3",
    verifiedTargetProfile: null
  });
});

test("AI governance persistence owns AI Tutor context scope access decisions", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiTutorContextScopeAccess, "function");
  assert.match(persistenceSource, /export function aiTutorContextScopeAccess\b/);
  assert.match(rootSource, /aiTutorContextScopeAccess as aiTutorContextScopeAccessFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /const canReadOwnDashboard\b/);
  assert.doesNotMatch(rootSource, /const canReadOwnAdaptive\b/);

  assert.deepEqual(module.aiTutorContextScopeAccess?.({
    targetStudentId: "student-1",
    user: { role: "student" },
    userId: "student-1"
  }), {
    canReadAdaptiveEngine: true,
    canReadStudentDashboard: true,
    canReadTeacherDashboard: false,
    canReadTeacherStudentProfile: false
  });

  assert.deepEqual(module.aiTutorContextScopeAccess?.({
    targetStudentId: "student-2",
    user: { role: "student" },
    userId: "student-1"
  }), {
    canReadAdaptiveEngine: false,
    canReadStudentDashboard: false,
    canReadTeacherDashboard: false,
    canReadTeacherStudentProfile: false
  });

  assert.deepEqual(module.aiTutorContextScopeAccess?.({
    targetStudentId: "student-2",
    user: { role: "teacher" },
    userId: "teacher-1",
    verifiedTargetProfile: { student: { id: "student-2" } }
  }), {
    canReadAdaptiveEngine: true,
    canReadStudentDashboard: true,
    canReadTeacherDashboard: true,
    canReadTeacherStudentProfile: true
  });

  assert.deepEqual(module.aiTutorContextScopeAccess?.({
    targetStudentId: "student-3",
    user: { role: "admin" },
    userId: "admin-1"
  }), {
    canReadAdaptiveEngine: false,
    canReadStudentDashboard: false,
    canReadTeacherDashboard: true,
    canReadTeacherStudentProfile: false
  });
});

test("AI governance persistence owns AI Tutor requested scope set", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiTutorRequestedScopeSet, "function");
  assert.match(persistenceSource, /export function aiTutorRequestedScopeSet\b/);
  assert.match(rootSource, /aiTutorRequestedScopeSet as aiTutorRequestedScopeSetFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /new Set\(context\?\.dataScopes \?\? \[\]\)/);

  assert.deepEqual(Array.from(module.aiTutorRequestedScopeSet?.([
    "student-dashboard",
    "teacher-dashboard",
    "student-dashboard",
    "adaptive-engine"
  ]) ?? []), [
    "student-dashboard",
    "teacher-dashboard",
    "adaptive-engine"
  ]);
  assert.deepEqual(Array.from(module.aiTutorRequestedScopeSet?.(null) ?? []), []);
  assert.equal(module.aiTutorRequestedScopeSet?.(["adaptive-engine"]).has("adaptive-engine"), true);
});

test("AI governance persistence owns student dashboard scope context", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;
  const dashboard = {
    streakDays: 3,
    overallMastery: 72,
    progressMetrics: [],
    recommendedLesson: null,
    weakTopics: [],
    recentTopics: []
  };

  assert.equal(typeof module.aiTutorStudentDashboardScopeContext, "function");
  assert.match(persistenceSource, /export async function aiTutorStudentDashboardScopeContext\b/);
  assert.match(rootSource, /aiTutorStudentDashboardScopeContext as aiTutorStudentDashboardScopeContextFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /Authorized student dashboard context:/);
  assert.doesNotMatch(rootSource, /Denied context scope: student-dashboard/);

  let dashboardReads = 0;
  assert.deepEqual(await module.aiTutorStudentDashboardScopeContext?.({
    canReadStudentDashboard: true,
    getDashboardData: async () => {
      dashboardReads += 1;
      return dashboard;
    },
    grade: "S3",
    language: "en",
    learnerName: "Ada",
    scopeSet: new Set(["student-dashboard"])
  }), {
    lines: [
      "Authorized student dashboard context:",
      "Student dashboard snapshot for Ada: S3, streak 3 days, overall mastery 72%."
    ],
    fallbackLines: [
      "Student dashboard snapshot for Ada: S3, streak 3 days, overall mastery 72%."
    ],
    includedScopes: ["student-dashboard"],
    deniedScopes: []
  });
  assert.equal(dashboardReads, 1);

  assert.deepEqual(await module.aiTutorStudentDashboardScopeContext?.({
    canReadStudentDashboard: false,
    getDashboardData: async () => {
      throw new Error("denied student dashboard scope should not read dashboard data");
    },
    grade: "S3",
    language: "en",
    learnerName: "Ada",
    scopeSet: new Set(["student-dashboard"])
  }), {
    lines: [
      "Denied context scope: student-dashboard. The signed-in user is not authorized to read that student dashboard."
    ],
    fallbackLines: [
      "Student dashboard: access was not authorized for the requested student."
    ],
    includedScopes: [],
    deniedScopes: ["student-dashboard"]
  });

  assert.deepEqual(await module.aiTutorStudentDashboardScopeContext?.({
    canReadStudentDashboard: true,
    getDashboardData: async () => {
      throw new Error("unrequested student dashboard scope should not read dashboard data");
    },
    grade: "S3",
    language: "en",
    learnerName: "Ada",
    scopeSet: new Set()
  }), {
    lines: [],
    fallbackLines: [],
    includedScopes: [],
    deniedScopes: []
  });
});

test("AI governance persistence owns teacher dashboard scope context", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;
  const dashboard = {
    teacher: { name: "Ms Chan" },
    kpis: {
      pendingGrading: 2,
      unrepliedMessages: 1,
      weeklyAssignmentCompletionRate: 67,
      atRiskStudents: 3
    },
    rewardSummary: {
      pendingRedemptions: 1,
      approvedRedemptions: 2,
      pointsAwardedThisWeek: 120
    },
    classSummaries: [],
    masteryHeatmap: [],
    actionQueue: []
  };

  assert.equal(typeof module.aiTutorTeacherDashboardScopeContext, "function");
  assert.match(persistenceSource, /export async function aiTutorTeacherDashboardScopeContext\b/);
  assert.match(rootSource, /aiTutorTeacherDashboardScopeContext as aiTutorTeacherDashboardScopeContextFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /Authorized teacher dashboard context:/);
  assert.doesNotMatch(rootSource, /Denied context scope: teacher-dashboard/);

  let dashboardReads = 0;
  assert.deepEqual(await module.aiTutorTeacherDashboardScopeContext?.({
    canReadTeacherDashboard: true,
    getTeacherDashboardData: async () => {
      dashboardReads += 1;
      return dashboard;
    },
    language: "en",
    scopeSet: new Set(["teacher-dashboard"])
  }), {
    lines: [
      "Authorized teacher dashboard context:",
      "Teacher dashboard snapshot for Ms Chan: pending grading 2, unreplied messages 1, weekly completion 67%, students needing attention 3.",
      "Reward queue: pending approvals 1, approved gifts 2, points awarded this week 120."
    ],
    fallbackLines: [
      "Teacher dashboard snapshot for Ms Chan: pending grading 2, unreplied messages 1, weekly completion 67%, students needing attention 3.",
      "Reward queue: pending approvals 1, approved gifts 2, points awarded this week 120."
    ],
    includedScopes: ["teacher-dashboard"],
    deniedScopes: []
  });
  assert.equal(dashboardReads, 1);

  assert.deepEqual(await module.aiTutorTeacherDashboardScopeContext?.({
    canReadTeacherDashboard: false,
    getTeacherDashboardData: async () => {
      throw new Error("denied teacher dashboard scope should not read dashboard data");
    },
    language: "en",
    scopeSet: new Set(["teacher-dashboard"])
  }), {
    lines: [
      "Denied context scope: teacher-dashboard. Teacher or admin access is required."
    ],
    fallbackLines: [
      "Teacher dashboard: teacher or admin access is required."
    ],
    includedScopes: [],
    deniedScopes: ["teacher-dashboard"]
  });

  assert.deepEqual(await module.aiTutorTeacherDashboardScopeContext?.({
    canReadTeacherDashboard: true,
    getTeacherDashboardData: async () => {
      throw new Error("unrequested teacher dashboard scope should not read dashboard data");
    },
    language: "en",
    scopeSet: new Set()
  }), {
    lines: [],
    fallbackLines: [],
    includedScopes: [],
    deniedScopes: []
  });

  assert.deepEqual(await module.aiTutorTeacherDashboardScopeContext?.({
    canReadTeacherDashboard: true,
    getTeacherDashboardData: async () => null,
    language: "en",
    scopeSet: new Set(["teacher-dashboard"])
  }), {
    lines: [],
    fallbackLines: [],
    includedScopes: [],
    deniedScopes: []
  });
});

test("AI governance persistence owns teacher-student profile scope context", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;
  const profile = {
    student: { name: "Ada", grade: "S3" },
    averageMastery: 63,
    recentActivityAt: null,
    aiTutor: {
      messageCount7d: 5,
      lastMessageAt: "2026-06-20T09:00:00.000Z"
    },
    progress: [],
    mistakes: [],
    recentAttempts: [],
    assignments: []
  };

  assert.equal(typeof module.aiTutorTeacherStudentProfileScopeContext, "function");
  assert.match(persistenceSource, /export function aiTutorTeacherStudentProfileScopeContext\b/);
  assert.match(rootSource, /aiTutorTeacherStudentProfileScopeContext as aiTutorTeacherStudentProfileScopeContextFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /Authorized teacher-visible student profile context:/);
  assert.doesNotMatch(rootSource, /Denied context scope: teacher-student-profile/);

  assert.deepEqual(module.aiTutorTeacherStudentProfileScopeContext?.({
    canReadTeacherStudentProfile: true,
    language: "en",
    profile,
    scopeSet: new Set(["teacher-student-profile"])
  }), {
    lines: [
      "Authorized teacher-visible student profile context:",
      "Teacher-visible student profile: Ada, S3, average mastery 63%, active mistakes 0, recent activity none saved.",
      "AI Tutor use: 5 messages in 7 days, last message 2026-06-20T09:00:00.000Z."
    ],
    fallbackLines: [
      "Teacher-visible student profile: Ada, S3, average mastery 63%, active mistakes 0, recent activity none saved.",
      "AI Tutor use: 5 messages in 7 days, last message 2026-06-20T09:00:00.000Z."
    ],
    includedScopes: ["teacher-student-profile"],
    deniedScopes: []
  });

  assert.deepEqual(module.aiTutorTeacherStudentProfileScopeContext?.({
    canReadTeacherStudentProfile: false,
    language: "en",
    profile: null,
    scopeSet: new Set(["teacher-student-profile"])
  }), {
    lines: [
      "Denied context scope: teacher-student-profile. Teacher/admin access to the requested student was not verified."
    ],
    fallbackLines: [
      "Teacher-visible student profile: access was not authorized for the requested student."
    ],
    includedScopes: [],
    deniedScopes: ["teacher-student-profile"]
  });

  assert.deepEqual(module.aiTutorTeacherStudentProfileScopeContext?.({
    canReadTeacherStudentProfile: true,
    language: "en",
    profile,
    scopeSet: new Set()
  }), {
    lines: [],
    fallbackLines: [],
    includedScopes: [],
    deniedScopes: []
  });
});

test("AI governance persistence owns adaptive engine scope context", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;
  const decision = adaptiveDecisionFixture("fractions");
  const decisionReads: Array<{
    curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH";
    grade: "S3";
    topicId?: string;
    userId: string;
  }> = [];

  assert.equal(typeof module.aiTutorAdaptiveEngineScopeContext, "function");
  assert.match(persistenceSource, /export async function aiTutorAdaptiveEngineScopeContext\b/);
  assert.match(rootSource, /aiTutorAdaptiveEngineScopeContext as aiTutorAdaptiveEngineScopeContextFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /Authorized adaptive engine context:/);
  assert.doesNotMatch(rootSource, /Adaptive engine context: no adaptive decision is currently available/);
  assert.doesNotMatch(rootSource, /Denied context scope: adaptive-engine/);

  assert.deepEqual(await module.aiTutorAdaptiveEngineScopeContext?.({
    canReadAdaptiveEngine: true,
    curriculumTrack: "HK",
    getAdaptiveLearningDecision: async (input) => {
      decisionReads.push(input);
      return decision;
    },
    grade: "S3",
    language: "en",
    learnerName: "Ada",
    scopeSet: new Set(["adaptive-engine"]),
    topicId: "topic-a",
    userId: "student-1"
  }), {
    lines: [
      "Authorized adaptive engine context:",
      "Adaptive engine snapshot for Ada: action practice, confidence strong, focus skill fractions, topic fractions.",
      "Engine status: deterministic, LLM status disabled.",
      "Learner-facing reason: fractions."
    ],
    fallbackLines: [
      "Adaptive engine snapshot for Ada: action practice, confidence strong, focus skill fractions, topic fractions.",
      "Engine status: deterministic, LLM status disabled.",
      "Learner-facing reason: fractions."
    ],
    includedScopes: ["adaptive-engine"],
    deniedScopes: []
  });
  assert.deepEqual(decisionReads, [
    {
      userId: "student-1",
      grade: "S3",
      topicId: "topic-a",
      curriculumTrack: "HK"
    }
  ]);

  assert.deepEqual(await module.aiTutorAdaptiveEngineScopeContext?.({
    canReadAdaptiveEngine: true,
    curriculumTrack: "HK",
    getAdaptiveLearningDecision: async () => null,
    grade: "S3",
    language: "en",
    learnerName: "Ada",
    scopeSet: new Set(["adaptive-engine"]),
    userId: "student-1"
  }), {
    lines: [
      "Adaptive engine context: no adaptive decision is currently available for the authorized student and grade."
    ],
    fallbackLines: [
      "Adaptive engine: no current adaptive decision is available for the authorized student and grade."
    ],
    includedScopes: ["adaptive-engine"],
    deniedScopes: []
  });

  let deniedReadCount = 0;
  assert.deepEqual(await module.aiTutorAdaptiveEngineScopeContext?.({
    canReadAdaptiveEngine: false,
    curriculumTrack: "HK",
    getAdaptiveLearningDecision: () => {
      deniedReadCount += 1;
      return decision;
    },
    grade: "S3",
    language: "en",
    learnerName: "Ada",
    scopeSet: new Set(["adaptive-engine"]),
    userId: "student-1"
  }), {
    lines: [
      "Denied context scope: adaptive-engine. A student learner or verified teacher-visible student target is required."
    ],
    fallbackLines: [
      "Adaptive engine: access requires the learner's own session or a verified teacher-visible student target."
    ],
    includedScopes: [],
    deniedScopes: ["adaptive-engine"]
  });
  assert.equal(deniedReadCount, 0);

  let unrequestedReadCount = 0;
  assert.deepEqual(await module.aiTutorAdaptiveEngineScopeContext?.({
    canReadAdaptiveEngine: true,
    curriculumTrack: "HK",
    getAdaptiveLearningDecision: () => {
      unrequestedReadCount += 1;
      return decision;
    },
    grade: "S3",
    language: "en",
    learnerName: "Ada",
    scopeSet: new Set(),
    userId: "student-1"
  }), {
    lines: [],
    fallbackLines: [],
    includedScopes: [],
    deniedScopes: []
  });
  assert.equal(unrequestedReadCount, 0);
});

test("AI governance persistence owns recent tutor message context inputs", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiTutorRecentMessageContextInputs, "function");
  assert.match(persistenceSource, /export function aiTutorRecentMessageContextInputs\b/);
  assert.match(rootSource, /aiTutorRecentMessageContextInputs as aiTutorRecentMessageContextInputsFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /const recentTutorMessages\b/);

  assert.deepEqual(module.aiTutorRecentMessageContextInputs?.({
    ai_tutor_messages: [
      {
        id: "student-oldest",
        user_id: "student-1",
        role: "student",
        content: "oldest should be dropped",
        context_json: null,
        created_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "student-2",
        user_id: "student-1",
        role: "tutor",
        content: "message 2",
        context_json: null,
        created_at: "2026-06-20T10:01:00.000Z"
      },
      {
        id: "other-user",
        user_id: "student-2",
        role: "student",
        content: "other user",
        context_json: null,
        created_at: "2026-06-20T10:07:00.000Z"
      },
      {
        id: "student-7",
        user_id: "student-1",
        role: "student",
        content: "message 7",
        context_json: { ignored: true },
        created_at: "2026-06-20T10:06:00.000Z"
      },
      {
        id: "student-5",
        user_id: "student-1",
        role: "student",
        content: "message 5",
        context_json: null,
        created_at: "2026-06-20T10:04:00.000Z"
      },
      {
        id: "student-4",
        user_id: "student-1",
        role: "tutor",
        content: "message 4",
        context_json: null,
        created_at: "2026-06-20T10:03:00.000Z"
      },
      {
        id: "student-6",
        user_id: "student-1",
        role: "tutor",
        content: "message 6",
        context_json: null,
        created_at: "2026-06-20T10:05:00.000Z"
      },
      {
        id: "student-3",
        user_id: "student-1",
        role: "student",
        content: "message 3",
        context_json: null,
        created_at: "2026-06-20T10:02:00.000Z"
      }
    ]
  }, "student-1"), [
    { role: "tutor", content: "message 2" },
    { role: "student", content: "message 3" },
    { role: "tutor", content: "message 4" },
    { role: "student", content: "message 5" },
    { role: "tutor", content: "message 6" },
    { role: "student", content: "message 7" }
  ]);
});

test("AI governance persistence owns requested database record lookup for AI Tutor context", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiTutorRequestedDatabaseRecords, "function");
  assert.match(persistenceSource, /export function aiTutorRequestedDatabaseRecords\b/);
  assert.match(rootSource, /aiTutorRequestedDatabaseRecords as aiTutorRequestedDatabaseRecordsFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /const requestedTopicId = context\?\.topicId/);
  assert.doesNotMatch(rootSource, /const requestedQuestion = context\?\.questionId \? questionForId/);

  const database = {
    questions: new Map([
      ["question-1", { id: "question-1", topicId: "topic-1" }]
    ]),
    topics: new Map([
      ["topic-1", { id: "topic-1", title: "Fractions" }]
    ])
  };
  const calls: string[] = [];
  const questionForId = (candidateDatabase: typeof database, questionId: string) => {
    calls.push(`question:${questionId}`);
    return candidateDatabase.questions.get(questionId) ?? null;
  };
  const topicRecordForId = (candidateDatabase: typeof database, topicId: string) => {
    calls.push(`topic:${topicId}`);
    return candidateDatabase.topics.get(topicId) ?? null;
  };

  assert.deepEqual(module.aiTutorRequestedDatabaseRecords?.({
    context: { questionId: "question-1", topicId: "topic-1" },
    database,
    questionForId,
    topicRecordForId
  }), {
    requestedQuestion: { id: "question-1", topicId: "topic-1" },
    requestedTopic: { id: "topic-1", title: "Fractions" }
  });
  assert.deepEqual(calls, ["question:question-1", "topic:topic-1"]);

  assert.deepEqual(module.aiTutorRequestedDatabaseRecords?.({
    context: { questionId: "missing-question", topicId: "missing-topic" },
    database,
    questionForId,
    topicRecordForId
  }), {
    requestedQuestion: null,
    requestedTopic: null
  });

  calls.length = 0;
  assert.deepEqual(module.aiTutorRequestedDatabaseRecords?.({
    database,
    questionForId,
    topicRecordForId
  }), {
    requestedQuestion: null,
    requestedTopic: null
  });
  assert.deepEqual(calls, []);
});

test("AI governance persistence owns requested curriculum context filtering", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiTutorRequestedCurriculumContext, "function");
  assert.match(persistenceSource, /export function aiTutorRequestedCurriculumContext\b/);
  assert.match(rootSource, /aiTutorRequestedCurriculumContext as aiTutorRequestedCurriculumContextFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /const topicId = requestedTopic && isCurriculumTopic/);
  assert.doesNotMatch(rootSource, /const question = requestedQuestion && isCurriculumQuestion/);

  const hkTopic = { id: "hk-topic", track: "HK" };
  const usTopic = { id: "us-topic", track: "US_CA_MATH" };
  const hkQuestion = { id: "hk-question", track: "HK" };
  const usQuestion = { id: "us-question", track: "US_CA_MATH" };

  assert.deepEqual(module.aiTutorRequestedCurriculumContext?.({
    requestedQuestion: hkQuestion,
    requestedTopic: hkTopic,
    subjectCurriculumTrack: "HK",
    isCurriculumQuestion: (question, track) => question.track === track,
    isCurriculumTopic: (topic, track) => topic.track === track
  }), {
    question: hkQuestion,
    topicId: "hk-topic"
  });

  assert.deepEqual(module.aiTutorRequestedCurriculumContext?.({
    requestedQuestion: usQuestion,
    requestedTopic: usTopic,
    subjectCurriculumTrack: "HK",
    isCurriculumQuestion: (question, track) => question.track === track,
    isCurriculumTopic: (topic, track) => topic.track === track
  }), {
    question: null,
    topicId: undefined
  });
});

test("AI governance persistence owns AI Tutor lesson context input", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;
  const lessons = [
    { slug: "hk-algebra", topic_id: "topic-a", title_en: "HK algebra" },
    { slug: "us-algebra", topic_id: "topic-us", title_en: "US algebra" }
  ];
  const topics = new Map([
    ["topic-a", { id: "topic-a", track: "HK" }],
    ["topic-us", { id: "topic-us", track: "US_CA_MATH" }]
  ]);
  const lessonForTopic = (topicId: string) => lessons.find((lesson) => lesson.topic_id === topicId) ?? null;
  const topicForLesson = (lesson: typeof lessons[number]) => topics.get(lesson.topic_id) ?? null;
  const lessonProgressFor = (lesson: typeof lessons[number]) => lesson.slug === "hk-algebra"
    ? { mastery: 64, status: "in-progress" }
    : null;

  assert.equal(typeof module.aiTutorLessonContextInput, "function");
  assert.match(persistenceSource, /export function aiTutorLessonContextInput\b/);
  assert.match(rootSource, /aiTutorLessonContextInput as aiTutorLessonContextInputFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /const relevantLesson = context\?\.lessonSlug/);

  assert.deepEqual(module.aiTutorLessonContextInput?.({ lessons }, {
    isCurriculumTopic: (topic, track) => topic.track === track,
    lessonForTopic,
    lessonProgressFor,
    lessonSlug: "hk-algebra",
    subjectCurriculumTrack: "HK",
    topicForLesson,
    topicId: "topic-us"
  }), {
    mastery: 64,
    status: "in-progress",
    title: "HK algebra"
  });

  assert.deepEqual(module.aiTutorLessonContextInput?.({ lessons }, {
    isCurriculumTopic: (topic, track) => topic.track === track,
    lessonForTopic,
    lessonProgressFor,
    subjectCurriculumTrack: "HK",
    topicForLesson,
    topicId: "topic-a"
  }), {
    mastery: 64,
    status: "in-progress",
    title: "HK algebra"
  });

  assert.equal(module.aiTutorLessonContextInput?.({ lessons }, {
    isCurriculumTopic: (topic, track) => topic.track === track,
    lessonForTopic,
    lessonProgressFor,
    lessonSlug: "us-algebra",
    subjectCurriculumTrack: "HK",
    topicForLesson,
    topicId: "topic-a"
  }), null);
});

test("AI governance persistence owns recent practice context inputs", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;
  const questions = new Map([
    ["q-old", { id: "q-old", topic_id: "topic-a", prompt_en: "old", track: "HK", topicLabel: "Topic A" }],
    ["q-2", { id: "q-2", topic_id: "topic-a", prompt_en: "prompt 2", track: "HK", topicLabel: "Topic A" }],
    ["q-3", { id: "q-3", topic_id: "topic-a", prompt_en: "prompt 3", track: "HK", topicLabel: "Topic A" }],
    ["q-4", { id: "q-4", topic_id: "topic-a", prompt_en: "prompt 4", track: "HK", topicLabel: "Topic A" }],
    ["q-5", { id: "q-5", topic_id: "topic-a", prompt_en: "prompt 5", track: "HK", topicLabel: "Topic A" }],
    ["q-6", { id: "q-6", topic_id: "topic-a", prompt_en: "prompt 6", track: "HK", topicLabel: "Topic A" }],
    ["q-other-topic", { id: "q-other-topic", topic_id: "topic-b", prompt_en: "other topic", track: "HK", topicLabel: "Topic B" }],
    ["q-other-track", { id: "q-other-track", topic_id: "topic-a", prompt_en: "other track", track: "US_CA_MATH", topicLabel: "Topic A" }]
  ]);
  const questionForId = (questionId: string) => questions.get(questionId) ?? null;
  const isCurriculumQuestion = (
    question: NonNullable<ReturnType<typeof questionForId>>,
    curriculumTrack: "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH"
  ) => question.track === curriculumTrack;

  assert.equal(typeof module.aiTutorRecentAttemptContextInputs, "function");
  assert.equal(typeof module.aiTutorRecentMistakeContextInputs, "function");
  assert.match(persistenceSource, /export function aiTutorRecentAttemptContextInputs\b/);
  assert.match(persistenceSource, /export function aiTutorRecentMistakeContextInputs\b/);
  assert.match(rootSource, /aiTutorRecentAttemptContextInputs as aiTutorRecentAttemptContextInputsFromAiGovernancePersistence/);
  assert.match(rootSource, /aiTutorRecentMistakeContextInputs as aiTutorRecentMistakeContextInputsFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /const recentAttempts = database\.attempts/);
  assert.doesNotMatch(rootSource, /const recentMistakes = database\.mistakes/);

  assert.deepEqual(module.aiTutorRecentAttemptContextInputs?.({
    attempts: [
      { user_id: "student-1", question_id: "q-old", is_correct: false, selected_answer: "A", duration_seconds: 31, created_at: "2026-06-20T10:00:00.000Z" },
      { user_id: "student-1", question_id: "q-2", is_correct: true, selected_answer: "B", duration_seconds: 32, created_at: "2026-06-20T10:01:00.000Z" },
      { user_id: "student-1", question_id: "q-3", is_correct: false, selected_answer: "C", duration_seconds: 33, created_at: "2026-06-20T10:02:00.000Z" },
      { user_id: "student-1", question_id: "q-4", is_correct: true, selected_answer: "D", duration_seconds: 34, created_at: "2026-06-20T10:03:00.000Z" },
      { user_id: "student-1", question_id: "q-5", is_correct: false, selected_answer: "E", duration_seconds: 35, created_at: "2026-06-20T10:04:00.000Z" },
      { user_id: "student-1", question_id: "q-6", is_correct: true, selected_answer: "F", duration_seconds: 36, created_at: "2026-06-20T10:05:00.000Z" },
      { user_id: "student-1", question_id: "q-other-topic", is_correct: true, selected_answer: "G", duration_seconds: 37, created_at: "2026-06-20T10:06:00.000Z" },
      { user_id: "student-1", question_id: "q-other-track", is_correct: true, selected_answer: "H", duration_seconds: 38, created_at: "2026-06-20T10:07:00.000Z" },
      { user_id: "student-2", question_id: "q-6", is_correct: false, selected_answer: "I", duration_seconds: 39, created_at: "2026-06-20T10:08:00.000Z" }
    ]
  }, {
    isCurriculumQuestion,
    questionForId,
    subjectCurriculumTrack: "HK",
    topicId: "topic-a",
    topicLabelForQuestion: (question) => question.topicLabel,
    userId: "student-1"
  }), [
    { durationSeconds: 36, isCorrect: true, selectedAnswer: "F", topicLabel: "Topic A" },
    { durationSeconds: 35, isCorrect: false, selectedAnswer: "E", topicLabel: "Topic A" },
    { durationSeconds: 34, isCorrect: true, selectedAnswer: "D", topicLabel: "Topic A" },
    { durationSeconds: 33, isCorrect: false, selectedAnswer: "C", topicLabel: "Topic A" },
    { durationSeconds: 32, isCorrect: true, selectedAnswer: "B", topicLabel: "Topic A" }
  ]);

  assert.deepEqual(module.aiTutorRecentMistakeContextInputs?.({
    mistakes: [
      { user_id: "student-1", question_id: "q-old", mastered: false, last_selected_answer: "A", wrong_attempts: 1, last_attempt_at: "2026-06-20T10:00:00.000Z" },
      { user_id: "student-1", question_id: "q-2", mastered: false, last_selected_answer: "B", wrong_attempts: 2, last_attempt_at: "2026-06-20T10:01:00.000Z" },
      { user_id: "student-1", question_id: "q-3", mastered: false, last_selected_answer: "C", wrong_attempts: 3, last_attempt_at: "2026-06-20T10:02:00.000Z" },
      { user_id: "student-1", question_id: "q-4", mastered: false, last_selected_answer: "D", wrong_attempts: 4, last_attempt_at: "2026-06-20T10:03:00.000Z" },
      { user_id: "student-1", question_id: "q-5", mastered: true, last_selected_answer: "E", wrong_attempts: 5, last_attempt_at: "2026-06-20T10:04:00.000Z" },
      { user_id: "student-1", question_id: "q-other-track", mastered: false, last_selected_answer: "F", wrong_attempts: 6, last_attempt_at: "2026-06-20T10:05:00.000Z" },
      { user_id: "student-2", question_id: "q-6", mastered: false, last_selected_answer: "G", wrong_attempts: 7, last_attempt_at: "2026-06-20T10:06:00.000Z" }
    ]
  }, {
    isCurriculumQuestion,
    questionForId,
    subjectCurriculumTrack: "HK",
    topicId: "topic-a",
    userId: "student-1"
  }), [
    { lastSelectedAnswer: "D", prompt: "prompt 4", wrongAttempts: 4 },
    { lastSelectedAnswer: "C", prompt: "prompt 3", wrongAttempts: 3 },
    { lastSelectedAnswer: "B", prompt: "prompt 2", wrongAttempts: 2 }
  ]);
});

test("AI governance persistence owns AI Tutor context summary builders", async () => {
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiTutorDashboardSummaryLines, "function");
  assert.equal(typeof module.aiTutorTeacherDashboardSummaryLines, "function");
  assert.equal(typeof module.aiTutorStudentProfileSummaryLines, "function");
  assert.equal(typeof module.aiTutorAdaptiveSummaryLines, "function");

  const dashboardLines = module.aiTutorDashboardSummaryLines?.({
    dashboard: {
      streakDays: 4,
      overallMastery: 71,
      progressMetrics: [
        {
          label: { en: "Accuracy", zh: "準確率" },
          value: "82%",
          detail: { en: "last 7 days", zh: "最近 7 天" }
        }
      ],
      recommendedLesson: {
        title: { en: "Linear equations", zh: "一次方程" },
        mastery: 55,
        status: "in-progress"
      },
      weakTopics: [
        {
          id: "fractions",
          curriculumTrack: "HK",
          grade: "S3",
          title: { en: "Fractions", zh: "分數" },
          description: { en: "Fractions", zh: "分數" },
          status: "in-progress",
          difficulty: "Medium",
          minutes: 20,
          mastery: 42
        }
      ],
      recentTopics: []
    },
    grade: "S3",
    language: "en",
    learnerName: "Ada"
  }) ?? [];
  assert.match(dashboardLines.join("\n"), /Student dashboard snapshot for Ada/);
  assert.match(dashboardLines.join("\n"), /Progress metrics: Accuracy 82%/);

  const teacherLines = module.aiTutorTeacherDashboardSummaryLines?.({
    teacher: { name: "Ms Chan" },
    kpis: {
      pendingGrading: 2,
      unrepliedMessages: 1,
      weeklyAssignmentCompletionRate: 67,
      atRiskStudents: 3
    },
    rewardSummary: {
      pendingRedemptions: 1,
      approvedRedemptions: 2,
      pointsAwardedThisWeek: 120
    },
    classSummaries: [
      {
        className: "S3A",
        grade: "S3",
        averageMastery: 64,
        atRiskStudents: 3
      }
    ],
    masteryHeatmap: [
      {
        className: "S3A",
        topicTitle: { en: "Fractions", zh: "分數" },
        averageMastery: 58,
        weakStudentCount: 4,
        studentCount: 24
      }
    ],
    actionQueue: [
      {
        priority: "high",
        type: "grading",
        title: { en: "Mark quiz", zh: "批改小測" },
        description: { en: "Two submissions", zh: "兩份提交" }
      }
    ]
  }, "en") ?? [];
  assert.match(teacherLines.join("\n"), /Teacher dashboard snapshot for Ms Chan/);
  assert.match(teacherLines.join("\n"), /Mastery gaps: S3A Fractions 58% avg/);

  const profileLines = module.aiTutorStudentProfileSummaryLines?.({
    student: { name: "Ada", grade: "S3" },
    averageMastery: 63,
    recentActivityAt: null,
    aiTutor: {
      messageCount7d: 5,
      lastMessageAt: "2026-06-20T09:00:00.000Z"
    },
    progress: [
      {
        title: { en: "Fractions", zh: "分數" },
        mastery: 42,
        status: "in-progress"
      }
    ],
    mistakes: [
      {
        mastered: false,
        question: { topic: { en: "Fractions", zh: "分數" } },
        wrongAttempts: 2
      }
    ],
    recentAttempts: [
      {
        topic: { en: "Fractions", zh: "分數" },
        isCorrect: false
      }
    ],
    assignments: [
      {
        assignment: { title: { en: "Practice set", zh: "練習" } },
        submission: { status: "assigned" }
      }
    ]
  }, "en") ?? [];
  assert.match(profileLines.join("\n"), /Teacher-visible student profile: Ada/);
  assert.match(profileLines.join("\n"), /Active mistakes: Fractions \(2 wrong attempts\)/);

  const adaptiveLines = module.aiTutorAdaptiveSummaryLines?.({
    decision: adaptiveDecisionFixture("fractions"),
    language: "en",
    learnerName: "Ada"
  }) ?? [];
  assert.match(adaptiveLines.join("\n"), /Adaptive engine snapshot for Ada/);
  assert.match(adaptiveLines.join("\n"), /focus skill fractions/);
});

test("AI governance persistence owns AI Tutor inline context line builders", async () => {
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiTutorCurriculumPolicyLines, "function");
  assert.equal(typeof module.aiTutorCurrentQuestionContextLines, "function");
  assert.equal(typeof module.aiTutorLessonProgressContextLines, "function");
  assert.equal(typeof module.aiTutorRecentAttemptContextLines, "function");
  assert.equal(typeof module.aiTutorRecentMistakeContextLines, "function");
  assert.equal(typeof module.aiTutorRecentTutorMessageContextLines, "function");

  assert.deepEqual(module.aiTutorCurriculumPolicyLines?.("MAINLAND_PEP_HIGH"), [
    "Curriculum track: MAINLAND_PEP_HIGH",
    "Curriculum language policy: use Mainland mathematics terminology and Simplified Chinese when Chinese wording is helpful."
  ]);
  assert.deepEqual(module.aiTutorCurrentQuestionContextLines?.({
    allowAnswerReference: false,
    answer: "42",
    explanation: "Because.",
    prompt: "What is 6 x 7?",
    topicLabel: "Multiplication"
  }), [
    "Current question: What is 6 x 7?",
    "Question topic: Multiplication",
    "Do not reveal the final answer immediately. Guide with hints, checks, and a similar example first."
  ]);
  assert.deepEqual(module.aiTutorCurrentQuestionContextLines?.({
    allowAnswerReference: true,
    answer: "42",
    explanation: "Because.",
    prompt: "What is 6 x 7?",
    topicLabel: "Multiplication"
  }), [
    "Current question: What is 6 x 7?",
    "Question topic: Multiplication",
    "Correct answer for tutor reference: 42",
    "Explanation: Because."
  ]);
  assert.deepEqual(module.aiTutorLessonProgressContextLines?.({
    title: "Linear equations",
    status: null,
    mastery: null
  }), [
    "Current lesson: Linear equations",
    "Lesson progress: not-started, mastery 0%"
  ]);
  assert.deepEqual(module.aiTutorRecentAttemptContextLines?.([
    {
      durationSeconds: null,
      isCorrect: false,
      selectedAnswer: "B",
      topicLabel: "Fractions"
    }
  ]), [
    "Recent attempts:",
    "- Fractions: wrong; selected \"B\"; unknowns"
  ]);
  assert.deepEqual(module.aiTutorRecentMistakeContextLines?.([
    {
      lastSelectedAnswer: "1/3",
      prompt: "Compare 1/2 and 1/3",
      wrongAttempts: 2
    }
  ]), [
    "Active mistake book items:",
    "- Compare 1/2 and 1/3; last selected \"1/3\"; wrong attempts 2"
  ]);
  assert.deepEqual(module.aiTutorRecentTutorMessageContextLines?.([
    {
      role: "student",
      content: "x".repeat(230)
    }
  ]), [
    "Recent tutor conversation stored on server:",
    `- student: ${"x".repeat(220)}`
  ]);
});

test("AI governance persistence owns pilot platform helper builders for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;
  const reason = { en: "Allowed for owner.", zh: "只限本人。" };
  const skillStates = [
    {
      skillId: "skill-1",
      pMastery: 0.5,
      attemptCount: 2,
      correctStreak: 1,
      wrongStreak: 0,
      lastPracticedAt: "2026-06-20T09:00:00.000Z",
      hintCount: 0,
      misconceptionTags: [],
      updatedAt: "2026-06-20T09:00:00.000Z",
      nextReviewAt: "2026-06-22T09:00:00.000Z"
    },
    {
      skillId: "skill-2",
      pMastery: 0.8,
      attemptCount: 3,
      correctStreak: 2,
      wrongStreak: 0,
      lastPracticedAt: "2026-06-20T10:00:00.000Z",
      hintCount: 1,
      misconceptionTags: ["sign-error"],
      updatedAt: "2026-06-20T10:00:00.000Z",
      nextReviewAt: "2026-06-21T09:00:00.000Z"
    }
  ] satisfies AdaptiveSkillState[];
  const parentSafeDraft = {
    id: "draft-1",
    noticeId: "notice-1",
    sourceReviewLessonId: "review-1",
    classId: "class-1",
    className: "S3A",
    teacherId: "teacher-1",
    teacherName: "Teacher One",
    title: { en: "Review Fractions", zh: "分數重溫" },
    summary: { en: "Safe draft", zh: "安全版本" },
    status: "sent",
    publishedAt: null,
    acknowledgement: { total: 2, acknowledged: 1, pending: 1 }
  } as ParentSafeTeacherDraft;
  const teacherQueue = [{
    reviewLessonId: "review-1",
    assessmentId: "assessment-1",
    classId: "class-1",
    className: "S3A",
    title: { en: "Review Fractions", zh: "分數重溫" },
    status: "reviewed",
    generatedAt: "2026-06-20T08:00:00.000Z",
    reviewedAt: "2026-06-20T09:00:00.000Z",
    parentSafeDraft,
    guard: {
      allowed: true,
      visibility: "teacher-reviewed",
      reason
    }
  }] as PilotTeacherReviewQueueItem[];

  assert.equal(typeof module.aiGovernancePilotGuard, "function");
  assert.equal(typeof module.aiGovernancePilotRoleFor, "function");
  assert.equal(typeof module.aiGovernanceLatestAdaptiveTransitionAt, "function");
  assert.equal(typeof module.aiGovernanceNextAdaptiveReviewAt, "function");
  assert.equal(typeof module.aiGovernancePilotLearnerEvents, "function");
  assert.equal(typeof module.aiGovernancePilotEventsForTeacherQueue, "function");
  assert.equal(typeof module.aiGovernancePilotEventsForParentDrafts, "function");
  assert.match(persistenceSource, /export function aiGovernancePilotGuard\b/);
  assert.match(persistenceSource, /export function aiGovernancePilotRoleFor\b/);
  assert.match(persistenceSource, /export function aiGovernancePilotLearnerEvents\b/);
  assert.doesNotMatch(rootSource, /function pilotGuard\b/);
  assert.doesNotMatch(rootSource, /function pilotRoleFor\b/);
  assert.doesNotMatch(rootSource, /function pilotLearnerEvents\b/);
  assert.doesNotMatch(rootSource, /aiGovernancePilotGuard as pilotGuardFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /aiGovernancePilotLearnerEvents as pilotLearnerEventsFromAiGovernancePersistence/);
  assert.match(rootSource, /createAiGovernancePilotPlatformLoopDataBuilder as pilotPlatformLoopDataBuilderFromAiGovernancePersistence/);

  assert.deepEqual(module.aiGovernancePilotGuard?.(true, "student-owned", reason), {
    allowed: true,
    visibility: "student-owned",
    reason
  });
  assert.equal(module.aiGovernancePilotRoleFor?.({ role: "admin" }), "admin");
  assert.equal(module.aiGovernancePilotRoleFor?.({ role: "student" }), "student");
  assert.equal(module.aiGovernanceLatestAdaptiveTransitionAt?.(skillStates), "2026-06-20T10:00:00.000Z");
  assert.equal(module.aiGovernanceNextAdaptiveReviewAt?.(skillStates), "2026-06-21T09:00:00.000Z");

  assert.deepEqual(module.aiGovernancePilotLearnerEvents?.({
    user: { id: "student-1", role: "student" },
    decision: adaptiveDecisionFixture("Fractions"),
    lastTransitionAt: "2026-06-20T10:00:00.000Z"
  }).map((event) => ({ id: event.id, type: event.type, generatedAt: event.generatedAt })), [
    {
      id: "pilot-adaptive-decision-requested-student-1-2026-06-20T10:00:00.000Z",
      type: "adaptive-decision-requested",
      generatedAt: "2026-06-20T10:00:00.000Z"
    },
    {
      id: "pilot-adaptive-state-transitioned-student-1-2026-06-20T10:00:00.000Z",
      type: "adaptive-state-transitioned",
      generatedAt: "2026-06-20T10:00:00.000Z"
    }
  ]);
  assert.deepEqual(module.aiGovernancePilotLearnerEvents?.({
    user: { id: "student-2", role: "student" },
    decision: null,
    lastTransitionAt: null,
    now: "2026-06-20T11:00:00.000Z"
  }).map((event) => ({ id: event.id, type: event.type, generatedAt: event.generatedAt })), [
    {
      id: "pilot-adaptive-decision-requested-student-2-2026-06-20T11:00:00.000Z",
      type: "adaptive-decision-requested",
      generatedAt: "2026-06-20T11:00:00.000Z"
    }
  ]);
  assert.deepEqual(module.aiGovernancePilotEventsForTeacherQueue?.(
    { id: "teacher-1", role: "teacher" },
    teacherQueue
  ).map((event) => ({ type: event.type, actorRole: event.actorRole, generatedAt: event.generatedAt })), [
    { type: "teacher-review-generated", actorRole: "teacher", generatedAt: "2026-06-20T08:00:00.000Z" },
    { type: "teacher-review-approved", actorRole: "teacher", generatedAt: "2026-06-20T09:00:00.000Z" },
    { type: "parent-safe-draft-published", actorRole: "teacher", generatedAt: "2026-06-20T08:00:00.000Z" }
  ]);
  assert.deepEqual(module.aiGovernancePilotEventsForParentDrafts?.(
    { id: "parent-1", role: "parent" },
    [parentSafeDraft],
    "2026-06-20T12:00:00.000Z"
  ).map((event) => ({ id: event.id, actorRole: event.actorRole, generatedAt: event.generatedAt })), [
    {
      id: "pilot-parent-safe-draft-published-notice-1",
      actorRole: "parent",
      generatedAt: "2026-06-20T12:00:00.000Z"
    }
  ]);
});

test("AI governance persistence owns pilot teacher review queue builder for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiGovernanceTeacherReviewQueueForPilot, "function");
  assert.match(persistenceSource, /export function aiGovernanceTeacherReviewQueueForPilot\b/);
  assert.match(rootSource, /aiGovernanceTeacherReviewQueueForPilot as teacherReviewQueueForPilotFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /function teacherReviewQueueForPilot\b/);

  const parentSafeDraft = {
    id: "draft-1",
    noticeId: "notice-1",
    sourceReviewLessonId: "review-reviewed",
    classId: "class-a",
    className: "S3A",
    teacherId: "teacher-1",
    teacherName: "Teacher One",
    title: { en: "Reviewed lesson", zh: "已審核講評" },
    summary: { en: "Safe", zh: "安全" },
    status: "sent",
    publishedAt: "2026-06-20T10:00:00.000Z",
    acknowledgement: { total: 2, acknowledged: 1, pending: 1 }
  } as ParentSafeTeacherDraft;

  const queue = module.aiGovernanceTeacherReviewQueueForPilot?.([
    {
      id: "review-generated",
      assessment_id: "assessment-2",
      class_id: "class-a",
      source_snapshot: { className: "S3A" },
      title_en: "Generated lesson",
      title_zh: "已生成講評",
      status: "generated",
      generated_at: "2026-06-20T08:00:00.000Z",
      reviewed_at: null,
      updated_at: "2026-06-20T10:00:00.000Z"
    },
    {
      id: "review-reviewed",
      assessment_id: "assessment-1",
      class_id: "class-a",
      source_snapshot: { className: "S3A" },
      title_en: "Reviewed lesson",
      title_zh: "已審核講評",
      status: "reviewed",
      generated_at: "2026-06-20T07:00:00.000Z",
      reviewed_at: "2026-06-20T09:00:00.000Z",
      updated_at: "2026-06-20T09:30:00.000Z"
    },
    {
      id: "review-hidden",
      assessment_id: "assessment-hidden",
      class_id: "hidden-class",
      source_snapshot: { className: "Hidden" },
      title_en: "Hidden lesson",
      title_zh: "隱藏講評",
      status: "reviewed",
      generated_at: "2026-06-20T06:00:00.000Z",
      reviewed_at: "2026-06-20T07:00:00.000Z",
      updated_at: "2026-06-20T11:00:00.000Z"
    }
  ], {
    canAccessClass: (classId) => classId === "class-a",
    parentSafeDraftForReviewLesson: (reviewLessonId) => reviewLessonId === "review-reviewed" ? parentSafeDraft : null
  }) ?? [];

  assert.deepEqual(queue.map((item) => ({
    id: item.reviewLessonId,
    allowed: item.guard.allowed,
    visibility: item.guard.visibility,
    parentSafeDraftId: item.parentSafeDraft?.id ?? null
  })), [
    {
      id: "review-generated",
      allowed: false,
      visibility: "blocked",
      parentSafeDraftId: null
    },
    {
      id: "review-reviewed",
      allowed: true,
      visibility: "teacher-reviewed",
      parentSafeDraftId: "draft-1"
    }
  ]);
});

test("AI governance persistence owns parent-safe draft filtering for pilot parent view", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule;

  assert.equal(typeof module.aiGovernanceParentSafeDraftsForPilot, "function");
  assert.match(persistenceSource, /export function aiGovernanceParentSafeDraftsForPilot\b/);
  assert.match(rootSource, /aiGovernanceParentSafeDraftsForPilot as parentSafeDraftsForPilotFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /function filteredParentSafeDraftsForParent\b/);

  const database = {
    teacher_notices: [
      {
        id: "notice-new",
        status: "sent",
        source_kind: "teacher-review-lesson",
        source_id: "review-new",
        updated_at: "2026-06-20T12:00:00.000Z"
      },
      {
        id: "notice-old",
        status: "sent",
        source_kind: "teacher-review-lesson",
        source_id: "review-old",
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "notice-draft",
        status: "draft",
        source_kind: "teacher-review-lesson",
        source_id: "review-draft",
        updated_at: "2026-06-20T13:00:00.000Z"
      },
      {
        id: "notice-wrong-source",
        status: "sent",
        source_kind: "assignment",
        source_id: "assignment-1",
        updated_at: "2026-06-20T14:00:00.000Z"
      },
      {
        id: "notice-unlinked-student",
        status: "sent",
        source_kind: "teacher-review-lesson",
        source_id: "review-unlinked",
        updated_at: "2026-06-20T15:00:00.000Z"
      }
    ],
    teacher_notice_recipients: [
      { notice_id: "notice-new", student_id: "student-1", guardian_id: "parent-1", status: "acknowledged" },
      { notice_id: "notice-new", student_id: "student-1", guardian_id: "parent-2", status: "pending" },
      { notice_id: "notice-new", student_id: "student-2", guardian_id: "parent-1", status: "pending" },
      { notice_id: "notice-old", student_id: "student-1", guardian_id: "parent-1", status: "pending" },
      { notice_id: "notice-draft", student_id: "student-1", guardian_id: "parent-1", status: "pending" },
      { notice_id: "notice-wrong-source", student_id: "student-1", guardian_id: "parent-1", status: "pending" },
      { notice_id: "notice-unlinked-student", student_id: "student-2", guardian_id: "parent-1", status: "pending" }
    ]
  };

  const drafts = module.aiGovernanceParentSafeDraftsForPilot?.(database, { id: "parent-1", role: "parent" }, {
    allowedStudentIdsForParent: () => ["student-1"],
    parentSafeTeacherDraftFromNotice: (_database, record, noticeOverride) => ({
      id: `draft-${record.id}`,
      noticeId: record.id,
      sourceReviewLessonId: record.source_id ?? "",
      classId: noticeOverride.classId,
      className: noticeOverride.className,
      teacherId: noticeOverride.teacherId,
      teacherName: "Teacher One",
      title: noticeOverride.subject,
      summary: noticeOverride.body,
      status: noticeOverride.status,
      publishedAt: noticeOverride.sentAt ?? noticeOverride.updatedAt,
      acknowledgement: noticeOverride.acknowledgement
    }),
    toTeacherNotice: (_database, record) => {
      const recipients = database.teacher_notice_recipients
        .filter((recipient) => recipient.notice_id === record.id)
        .map((recipient, index) => ({
          id: `${record.id}-recipient-${index}`,
          noticeId: recipient.notice_id,
          studentId: recipient.student_id,
          studentName: recipient.student_id,
          guardianId: recipient.guardian_id ?? undefined,
          guardianName: recipient.guardian_id ?? undefined,
          status: recipient.status === "acknowledged" ? "acknowledged" as const : "pending" as const,
          acknowledgedBy: recipient.status === "acknowledged" ? recipient.guardian_id ?? undefined : undefined,
          acknowledgedAt: recipient.status === "acknowledged" ? "2026-06-20T12:30:00.000Z" : null,
          createdAt: record.updated_at
        }));

      return {
        id: record.id,
        teacherId: "teacher-1",
        classId: "class-1",
        className: "S3A",
        audience: "parents",
        channelId: "channel-1",
        channelName: "Parent channel",
        subject: { en: record.id, zh: record.id },
        body: { en: `Body ${record.id}`, zh: `內容 ${record.id}` },
        status: record.status as TeacherNotice["status"],
        source: { kind: "teacher-review-lesson", id: record.source_id ?? undefined },
        dueAt: null,
        createdAt: record.updated_at,
        updatedAt: record.updated_at,
        sentAt: record.updated_at,
        recipients,
        deliveryAttempts: [],
        acknowledgement: {
          total: 99,
          acknowledged: 99,
          pending: 0
        }
      };
    }
  }) ?? [];

  assert.deepEqual(drafts.map((draft) => ({
    id: draft.id,
    noticeId: draft.noticeId,
    acknowledgement: draft.acknowledgement
  })), [
    {
      id: "draft-notice-new",
      noticeId: "notice-new",
      acknowledgement: { total: 1, acknowledged: 1, pending: 0 }
    },
    {
      id: "draft-notice-old",
      noticeId: "notice-old",
      acknowledgement: { total: 1, acknowledged: 0, pending: 1 }
    }
  ]);
});

test("legacy userStore delegates pilot platform loop data through AI governance domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getPilotPlatformLoopData = aiGovernanceUserStore\.getPilotPlatformLoopData/);
  assert.doesNotMatch(source, /export async function getPilotPlatformLoopData/);
});

test("AI governance persistence owns pilot platform loop data builder for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/aiGovernancePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/aiGovernancePersistence") as unknown as AiTutorContextHelperModule & {
    createAiGovernancePilotPlatformLoopDataBuilder?: (
      dependencies: any
    ) => (database: { users: Array<{ id: string; role: "student" | "teacher" | "parent" | "admin" }> }, input: { userId: string; grade?: "S3" }) => Promise<PilotPlatformLoopData | null>;
  };
  const database = {
    users: [
      { id: "student-1", role: "student" as const }
    ]
  };

  assert.equal(typeof module.createAiGovernancePilotPlatformLoopDataBuilder, "function");
  assert.match(persistenceSource, /export function createAiGovernancePilotPlatformLoopDataBuilder\b/);
  assert.match(rootSource, /createAiGovernancePilotPlatformLoopDataBuilder as pilotPlatformLoopDataBuilderFromAiGovernancePersistence/);
  assert.doesNotMatch(rootSource, /async function pilotPlatformLoopDataFromDatabase\b/);

  const buildLoopData = module.createAiGovernancePilotPlatformLoopDataBuilder?.({
    adaptiveStatesForUser: () => [],
    canUseParentArea: () => false,
    canUseTeacherArea: () => false,
    getAdaptiveLearningDecision: () => adaptiveDecisionFixture("fractions"),
    knowledgeComponentsForDatabase: () => [],
    now: () => new Date("2026-06-21T00:00:00.000Z"),
    parentSafeDraftsForPilot: () => [],
    teacherReviewQueueForPilot: () => [],
    toAuthenticatedUser: () => ({
      user: {
        curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }
      },
      settings: {
        selectedGrade: "S3"
      }
    }),
    userForId: (sourceDatabase: typeof database, userId: string) =>
      sourceDatabase.users.find((candidate) => candidate.id === userId) ?? null
  });

  const data = await buildLoopData?.(database, { userId: "student-1", grade: "S3" });
  assert.equal(data?.role, "student");
  assert.equal(data?.actorId, "student-1");
  assert.equal(data?.generatedAt, "2026-06-21T00:00:00.000Z");
  assert.equal(data?.learnerState?.studentId, "student-1");
  assert.equal(data?.learnerState?.adaptiveDecision?.topic.id, "fractions");
  assert.deepEqual(data?.teacherReviewQueue, []);
  assert.deepEqual(data?.parentSafeDrafts, []);
});

test("legacy userStore delegates AI Tutor database context through AI governance domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const buildAITutorDatabaseContext = aiGovernanceUserStore\.buildAITutorDatabaseContext/);
  assert.doesNotMatch(source, /export async function buildAITutorDatabaseContext/);
});

test("legacy userStore re-exports AI Tutor context types from AI governance persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /type AITutorDataScope/);
  assert.match(source, /type AITutorDatabaseContextOptions/);
  assert.match(source, /type AITutorDatabaseContextResult/);
  assert.match(source, /export type \{[\s\S]*AITutorDataScope,[\s\S]*AITutorDatabaseContextOptions,[\s\S]*AITutorDatabaseContextResult[\s\S]*\}/);
  assert.doesNotMatch(source, /export type AITutorDataScope =/);
  assert.doesNotMatch(source, /export type AITutorDatabaseContextOptions =/);
  assert.doesNotMatch(source, /export type AITutorDatabaseContextResult =/);
});
