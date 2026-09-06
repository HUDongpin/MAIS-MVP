import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import * as studentActivityPersistence from "@/lib/server/userStore/studentActivityPersistence";
import {
  createStudentActivityPersistenceStore,
  type StudentActivityLessonRecord,
  type StudentActivityPersistenceDatabase
} from "@/lib/server/userStore/studentActivityPersistence";
import type {
  AdaptiveLearningDecision,
  AdaptiveLLMStatus,
  LessonEntryTarget,
  LessonDetail,
  LessonSummary,
  LearningAnalyticsEvent,
  MistakeBookItem,
  DashboardData,
  StudentMessageThread,
  StudentResourceDetailData,
  TeachingResource,
  Topic
} from "@/types";

const now = new Date("2026-06-20T10:00:00.000Z");

function createTestStore(
  database: StudentActivityPersistenceDatabase,
  options: Partial<Parameters<typeof createStudentActivityPersistenceStore>[0]> = {}
) {
  return createStudentActivityPersistenceStore({
    now: () => now,
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    ...options
  });
}

test("student dashboard fast path bypasses full database reads when it has data", async () => {
  const fastDashboard: DashboardData = {
    curriculumTrack: "US_CA_MATH",
    streakDays: 0,
    overallMastery: 3,
    progressMetrics: [],
    recommendedLesson: null,
    recentTopics: [],
    weakTopics: [],
    gradeTopics: [],
    contentUnavailable: null
  };
  const store = createStudentActivityPersistenceStore({
    now: () => now,
    readDatabase: async () => {
      throw new Error("dashboard fast path should avoid full readDatabase()");
    },
    getFastDashboardData: async (userId: string, grade: string) => {
      assert.equal(userId, "student-shirleen-us");
      assert.equal(grade, "P1");
      return fastDashboard;
    }
  } as unknown as Parameters<typeof createStudentActivityPersistenceStore>[0]);

  assert.equal(await store.getDashboardData("student-shirleen-us", "P1", "US_CA_MATH"), fastDashboard);
});

test("legacy userStore wires student dashboard Neon projection before full snapshot fallback", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const storeConfigStart = source.indexOf("const studentActivityPersistenceStore = createStudentActivityPersistenceStore({");
  const storeConfigEnd = source.indexOf("const authSessionPersistenceStore = createAuthSessionPersistenceStore({", storeConfigStart);
  const storeConfigSource = source.slice(storeConfigStart, storeConfigEnd);
  const projectionStart = source.indexOf("async function getStudentDashboardDataFromPostgresProjection");
  const projectionEnd = source.indexOf("const studentActivityPersistenceStore = createStudentActivityPersistenceStore({", projectionStart);
  const projectionSource = source.slice(projectionStart, projectionEnd);

  assert.notEqual(storeConfigStart, -1, "Student activity store config should exist.");
  assert.notEqual(storeConfigEnd, -1, "Student activity store config should be bounded.");
  assert.notEqual(projectionStart, -1, "Student dashboard Neon projection should exist.");
  assert.notEqual(projectionEnd, -1, "Student dashboard Neon projection should appear before store wiring.");
  assert.match(storeConfigSource, /getFastDashboardData:\s*getCachedStudentDashboardData/);
  assert.match(source, /studentDashboardCacheKey/);
  assert.equal(
    projectionSource.includes("readDatabase()"),
    false,
    "The projected student dashboard path should not load the full application state."
  );
  assert.ok(
    projectionSource.includes("practice_attempts") &&
      projectionSource.includes("mistake_book_items") &&
      projectionSource.includes("learning_events") &&
      projectionSource.includes("projection_topics") &&
      projectionSource.includes("projection_questions") &&
      projectionSource.includes("projection_lesson_progress"),
    "Projection should combine Neon hot activity tables with indexed dashboard projection tables."
  );
  assert.equal(
    projectionSource.includes("jsonb_array_elements"),
    false,
    "Student dashboard projection should not lateral-scan the large snapshot JSONB payload."
  );
  assert.match(source, /syncPostgresProjectionTablesWith\(sql, database\)/);
});

test("legacy userStore batches Postgres projection bulk inserts below the driver parameter limit", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const projectionSyncStart = source.indexOf("async function syncPostgresProjectionTablesWith");
  const projectionSyncEnd = source.indexOf("async function readPostgresHotAuthRows", projectionSyncStart);
  const projectionSyncSource = source.slice(projectionSyncStart, projectionSyncEnd);

  assert.notEqual(projectionSyncStart, -1, "Postgres projection sync should exist.");
  assert.notEqual(projectionSyncEnd, -1, "Postgres projection sync boundary should exist.");
  assert.match(source, /const maxPostgresParametersPerStatement = 65000/);
  assert.match(source, /function postgresBulkInsertBatchSize\(/);
  assert.match(source, /async function upsertPostgresProjectionRows(?:<[^>]+>)?\(/);
  assert.match(projectionSyncSource, /await upsertPostgresProjectionRows\(\s*sql,\s*"projection_questions"/);
  assert.doesNotMatch(
    projectionSyncSource,
    /INSERT INTO projection_questions\s+\$\{sql\(questions,/,
    "projection_questions must not be inserted as one full-table statement; the current question bank exceeds Postgres' parameter limit."
  );
});

test("legacy userStore clears student dashboard cache after dashboard-affecting mutations", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const storeConfigStart = source.indexOf("const studentActivityPersistenceStore = createStudentActivityPersistenceStore({");
  const storeConfigEnd = source.indexOf("const authSessionPersistenceStore = createAuthSessionPersistenceStore({", storeConfigStart);
  const storeConfigSource = source.slice(storeConfigStart, storeConfigEnd);
  const hooks = [
    "afterAppend",
    "afterMarkMistakeMastered",
    "afterMarkVisualizationSession",
    "afterUpdateLessonProgress",
    "afterSubmitQuestionAttempt"
  ];

  assert.notEqual(storeConfigStart, -1, "Student activity store config should exist.");
  assert.notEqual(storeConfigEnd, -1, "Student activity store config should be bounded.");
  assert.match(source, /function clearStudentDashboardCacheForUser\(userId: string\)/);
  for (const hook of hooks) {
    const hookStart = storeConfigSource.indexOf(`${hook}:`);
    const nextHookStart = hooks
      .map((candidate) => storeConfigSource.indexOf(`${candidate}:`, hookStart + hook.length))
      .filter((index) => index !== -1)
      .sort((a, b) => a - b)[0] ?? storeConfigSource.length;
    const hookSource = storeConfigSource.slice(hookStart, nextHookStart);
    assert.notEqual(hookStart, -1, `${hook} should be wired in the student activity store.`);
    assert.match(hookSource, /clearStudentDashboardCacheForUser\(userId\)/, `${hook} should invalidate student dashboard cache.`);
  }
});

test("legacy userStore scopes and de-duplicates student dashboard cache safely", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const keyStart = source.indexOf("function studentDashboardCacheKey(");
  const keyEnd = source.indexOf("function clearStudentDashboardCacheForUser", keyStart);
  const keySource = source.slice(keyStart, keyEnd);
  const cachedStart = source.indexOf("async function getCachedStudentDashboardData");
  const cachedEnd = source.indexOf("const studentActivityPersistenceStore = createStudentActivityPersistenceStore({", cachedStart);
  const cachedSource = source.slice(cachedStart, cachedEnd);
  const invalidationStart = source.indexOf("function clearStudentDashboardCacheForUser");
  const invalidationEnd = source.indexOf("function mergeStudentDashboardRecordsBy", invalidationStart);
  const invalidationSource = source.slice(invalidationStart, invalidationEnd);

  assert.notEqual(keyStart, -1, "Student dashboard cache key helper should exist.");
  assert.notEqual(keyEnd, -1, "Student dashboard cache key helper should be bounded.");
  assert.notEqual(invalidationStart, -1, "Student dashboard cache invalidation helper should exist.");
  assert.notEqual(invalidationEnd, -1, "Student dashboard cache invalidation helper should be bounded.");
  assert.match(keySource, /userId/);
  assert.match(keySource, /grade/);
  assert.match(keySource, /studentDashboardCurriculumCacheKey\(curriculumTrack\)/);
  assert.match(invalidationSource, /studentDashboardCacheVersions\.set/);
  assert.match(invalidationSource, /studentDashboardInflight\.delete\(key\)/);
  assert.match(cachedSource, /studentDashboardInflight\.get\(key\)/);
  assert.match(cachedSource, /studentDashboardInflight\.set\(key, request\)/);
  assert.match(cachedSource, /studentDashboardInflight\.delete\(key\)/);
  assert.match(cachedSource, /const startedVersion = studentDashboardCacheVersions\.get\(key\) \?\? 0/);
  assert.match(cachedSource, /\(studentDashboardCacheVersions\.get\(key\) \?\? 0\) === startedVersion/);
  assert.match(cachedSource, /if \(value && ttlMs > 0 &&/, "Only real dashboard payloads should be cached; misses must fall back to readDatabase().");
});

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

test("student activity persistence owns linked assignment completion helpers for legacy userStore", async () => {
  const persistenceExports = studentActivityPersistence as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof persistenceExports.completeStudentActivityMatchingAssignments, "function");
  assert.match(persistenceSource, /export function completeStudentActivityMatchingAssignments\b/);
  assert.match(rootSource, /completeStudentActivityMatchingAssignments as completeMatchingAssignmentsFromStudentActivityPersistence/);
  assert.doesNotMatch(rootSource, /function studentClassIds\b/);
  assert.doesNotMatch(rootSource, /function completeAssignmentSubmission\b/);
  assert.doesNotMatch(rootSource, /function completeMatchingAssignments\b/);

  const completeStudentActivityMatchingAssignments =
    persistenceExports.completeStudentActivityMatchingAssignments as (input: {
      database: StudentActivityPersistenceDatabase;
      userId: string;
      contentType: "lesson";
      targetIds: string[];
      now: string;
      score?: number | null;
      graded?: boolean;
      feedbackEn: string;
      feedbackZh: string;
    }) => void;
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    class_enrollments: [
      { class_id: "class-1", student_id: "student-1" },
      { class_id: "class-2", student_id: "other-student" }
    ],
    assignments: [
      {
        id: "assignment-target",
        class_id: "class-1",
        content_type: "lesson",
        target_id: "lesson-1",
        status: "active"
      },
      {
        id: "assignment-any-lesson",
        class_id: "class-1",
        content_type: "lesson",
        status: "active"
      },
      {
        id: "assignment-inactive",
        class_id: "class-1",
        content_type: "lesson",
        target_id: "lesson-1",
        status: "draft"
      },
      {
        id: "assignment-other-class",
        class_id: "class-2",
        content_type: "lesson",
        target_id: "lesson-1",
        status: "active"
      }
    ],
    submissions: [
      { assignment_id: "assignment-target", student_id: "student-1", status: "not-started", score: null, submitted_at: null, graded_at: null, updated_at: "old" },
      { assignment_id: "assignment-any-lesson", student_id: "student-1", status: "not-started", score: 20, submitted_at: null, graded_at: null, updated_at: "old" },
      { assignment_id: "assignment-inactive", student_id: "student-1", status: "not-started", score: null, submitted_at: null, graded_at: null, updated_at: "old" },
      { assignment_id: "assignment-other-class", student_id: "student-1", status: "not-started", score: null, submitted_at: null, graded_at: null, updated_at: "old" }
    ]
  };

  completeStudentActivityMatchingAssignments({
    database,
    userId: "student-1",
    contentType: "lesson",
    targetIds: ["lesson-1"],
    now: "2026-06-20T10:00:00.000Z",
    score: 101.4,
    graded: true,
    feedbackEn: "Completed from linked lesson.",
    feedbackZh: "已按連結課節完成。"
  });

  assert.deepEqual(database.submissions?.find((submission) => submission.assignment_id === "assignment-target"), {
    assignment_id: "assignment-target",
    student_id: "student-1",
    status: "graded",
    score: 100,
    submitted_at: "2026-06-20T10:00:00.000Z",
    graded_at: "2026-06-20T10:00:00.000Z",
    feedback_en: "Completed from linked lesson.",
    feedback_zh: "已按連結課節完成。",
    updated_at: "2026-06-20T10:00:00.000Z"
  });
  assert.equal(database.submissions?.find((submission) => submission.assignment_id === "assignment-any-lesson")?.status, "graded");
  assert.equal(database.submissions?.find((submission) => submission.assignment_id === "assignment-any-lesson")?.score, 100);
  assert.equal(database.submissions?.find((submission) => submission.assignment_id === "assignment-inactive")?.status, "not-started");
  assert.equal(database.submissions?.find((submission) => submission.assignment_id === "assignment-other-class")?.status, "not-started");
});

test("student activity persistence owns attempt and mistake record defaults for legacy userStore", async () => {
  const persistenceExports = studentActivityPersistence as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const normalizeAttemptRecords = persistenceExports.normalizeStudentActivityAttemptRecords as ((
    records?: NonNullable<StudentActivityPersistenceDatabase["attempts"]>
  ) => NonNullable<StudentActivityPersistenceDatabase["attempts"]>) | undefined;
  const normalizeMistakeRecords = persistenceExports.normalizeStudentActivityMistakeRecords as ((
    records?: NonNullable<StudentActivityPersistenceDatabase["mistakes"]>
  ) => NonNullable<StudentActivityPersistenceDatabase["mistakes"]>) | undefined;
  const attempts: NonNullable<StudentActivityPersistenceDatabase["attempts"]> = [
    {
      id: "attempt-1",
      user_id: "student-1",
      question_id: "question-1",
      selected_answer: "A",
      is_correct: false,
      duration_seconds: null,
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ];
  const mistakes: NonNullable<StudentActivityPersistenceDatabase["mistakes"]> = [
    {
      user_id: "student-1",
      question_id: "question-1",
      last_selected_answer: "A",
      correct_answer: "B",
      wrong_attempts: 1,
      first_wrong_at: "2026-06-20T10:00:00.000Z",
      last_attempt_at: "2026-06-20T10:00:00.000Z",
      mastered: false
    }
  ];

  assert.equal(typeof normalizeAttemptRecords, "function");
  assert.equal(typeof normalizeMistakeRecords, "function");
  assert.match(persistenceSource, /export function normalizeStudentActivityAttemptRecords\b/);
  assert.match(persistenceSource, /export function normalizeStudentActivityMistakeRecords\b/);
  assert.match(rootSource, /normalizeStudentActivityAttemptRecords as normalizeAttemptRecordsFromStudentActivityPersistence/);
  assert.match(rootSource, /normalizeStudentActivityMistakeRecords as normalizeMistakeRecordsFromStudentActivityPersistence/);
  assert.doesNotMatch(rootSource, /attempts: database\.attempts \?\? \[\]/);
  assert.doesNotMatch(rootSource, /mistakes: database\.mistakes \?\? \[\]/);
  assert.deepEqual(normalizeAttemptRecords?.(undefined), []);
  assert.deepEqual(normalizeMistakeRecords?.(undefined), []);
  assert.equal(normalizeAttemptRecords?.(attempts), attempts);
  assert.equal(normalizeMistakeRecords?.(mistakes), mistakes);
});

test("student activity persistence owns adaptive skill state normalization", async () => {
  const persistenceExports = studentActivityPersistence as Record<string, unknown>;
  assert.equal(typeof persistenceExports.normalizeAdaptiveSkillStateRecords, "function");

  const normalizeAdaptiveSkillStateRecords =
    persistenceExports.normalizeAdaptiveSkillStateRecords as (
      records: Array<Record<string, unknown>> | undefined,
      now: string
    ) => Array<Record<string, unknown>>;

  assert.deepEqual(
    normalizeAdaptiveSkillStateRecords([
      {
        user_id: "student-1",
        skill_id: "linear-equations",
        p_mastery: Number.NaN,
        attempt_count: 2.6,
        correct_streak: -2,
        wrong_streak: 1.4,
        last_practiced_at: 123,
        next_review_at: "2026-06-22T12:00:00.000Z",
        hint_count: 3.5,
        misconception_tags: ["slope", 42, "intercept", "extra-1", "extra-2", "extra-3", "extra-4", "extra-5", "extra-6"],
        updated_at: 123
      },
      {
        user_id: "student-2"
      }
    ], now.toISOString()),
    [
      {
        user_id: "student-1",
        skill_id: "linear-equations",
        p_mastery: 0.35,
        attempt_count: 3,
        correct_streak: 0,
        wrong_streak: 1,
        last_practiced_at: null,
        next_review_at: "2026-06-22T12:00:00.000Z",
        hint_count: 4,
        misconception_tags: ["slope", "intercept", "extra-1", "extra-2", "extra-3", "extra-4", "extra-5", "extra-6"],
        updated_at: now.toISOString()
      }
    ]
  );

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /function normalizeAdaptiveSkillStateRecords\b/);
});

test("student activity persistence owns adaptive skill state record conversion", async () => {
  const persistenceExports = studentActivityPersistence as Record<string, unknown>;
  assert.equal(typeof persistenceExports.studentActivityAdaptiveSkillStateFromRecord, "function");
  assert.equal(typeof persistenceExports.studentActivityAdaptiveSkillStateToRecord, "function");

  const fromRecord = persistenceExports.studentActivityAdaptiveSkillStateFromRecord as (record: Record<string, unknown>) => unknown;
  const toRecord = persistenceExports.studentActivityAdaptiveSkillStateToRecord as (
    userId: string,
    state: Record<string, unknown>
  ) => unknown;

  const state = fromRecord({
    user_id: "student-1",
    skill_id: "linear-equations",
    p_mastery: 0.72,
    attempt_count: 5,
    correct_streak: 2,
    wrong_streak: 1,
    last_practiced_at: "2026-06-20T09:00:00.000Z",
    next_review_at: null,
    hint_count: 1,
    misconception_tags: ["sign-error"],
    updated_at: "2026-06-20T10:00:00.000Z"
  });

  assert.deepEqual(state, {
    skillId: "linear-equations",
    pMastery: 0.72,
    attemptCount: 5,
    correctStreak: 2,
    wrongStreak: 1,
    lastPracticedAt: "2026-06-20T09:00:00.000Z",
    nextReviewAt: null,
    hintCount: 1,
    misconceptionTags: ["sign-error"],
    updatedAt: "2026-06-20T10:00:00.000Z"
  });
  assert.deepEqual(toRecord("student-2", state as Record<string, unknown>), {
    user_id: "student-2",
    skill_id: "linear-equations",
    p_mastery: 0.72,
    attempt_count: 5,
    correct_streak: 2,
    wrong_streak: 1,
    last_practiced_at: "2026-06-20T09:00:00.000Z",
    next_review_at: null,
    hint_count: 1,
    misconception_tags: ["sign-error"],
    updated_at: "2026-06-20T10:00:00.000Z"
  });

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.match(rootSource, /studentActivityAdaptiveSkillStateFromRecord as adaptiveSkillStateFromRecordFromStudentActivityPersistence/);
  assert.match(rootSource, /studentActivityAdaptiveSkillStateToRecord as adaptiveSkillStateToRecordFromStudentActivityPersistence/);
  assert.doesNotMatch(rootSource, /function adaptiveSkillStateFromRecord\b/);
  assert.doesNotMatch(rootSource, /function adaptiveSkillStateToRecord\b/);
});

test("student activity persistence owns lesson progress normalization", async () => {
  const persistenceExports = studentActivityPersistence as Record<string, unknown>;
  assert.equal(typeof persistenceExports.normalizeStudentActivityLessonProgressRecords, "function");

  const normalizeStudentActivityLessonProgressRecords =
    persistenceExports.normalizeStudentActivityLessonProgressRecords as (
      records: Array<Record<string, unknown>> | undefined,
      profiles: Array<{ user_id: string }>,
      now: string,
      options: {
        demoUserId: string;
        lessonSlugForTopic: (topicId: string) => string;
        seedTopics: Array<{ id: string; status: "not-started" | "in-progress" | "completed"; mastery: number }>;
      }
    ) => Array<Record<string, unknown>>;

  assert.deepEqual(normalizeStudentActivityLessonProgressRecords([
    {
      user_id: "demo-user",
      topic_id: "topic-1",
      status: "completed",
      mastery: 90,
      completed_at: "2026-06-20T08:00:00.000Z",
      updated_at: "2026-06-20T07:00:00.000Z"
    }
  ], [
    { user_id: "demo-user" },
    { user_id: "student-2" }
  ], "2026-06-21T08:00:00.000Z", {
    demoUserId: "demo-user",
    lessonSlugForTopic: (topicId) => `lesson-${topicId}`,
    seedTopics: [
      { id: "topic-1", status: "completed", mastery: 90 },
      { id: "topic-2", status: "in-progress", mastery: 35 }
    ]
  }), [
    {
      user_id: "demo-user",
      topic_id: "topic-1",
      lesson_slug: "lesson-topic-1",
      status: "completed",
      mastery: 90,
      started_at: "2026-06-20T07:00:00.000Z",
      completed_at: "2026-06-20T08:00:00.000Z",
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-20T07:00:00.000Z"
    },
    {
      user_id: "demo-user",
      topic_id: "topic-2",
      lesson_slug: "lesson-topic-2",
      status: "in-progress",
      mastery: 35,
      started_at: "2026-06-21T08:00:00.000Z",
      completed_at: null,
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-21T08:00:00.000Z"
    },
    {
      user_id: "student-2",
      topic_id: "topic-1",
      lesson_slug: "lesson-topic-1",
      status: "not-started",
      mastery: 0,
      started_at: null,
      completed_at: null,
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-21T08:00:00.000Z"
    },
    {
      user_id: "student-2",
      topic_id: "topic-2",
      lesson_slug: "lesson-topic-2",
      status: "not-started",
      mastery: 0,
      started_at: null,
      completed_at: null,
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-21T08:00:00.000Z"
    }
  ]);

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /function normalizeLessonProgressRecords\b/);
});

test("student activity persistence owns lesson progress seed builders for legacy userStore", async () => {
  const persistenceExports = studentActivityPersistence as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const emptyLessonProgressRecords =
    persistenceExports.studentActivityEmptyLessonProgressRecords as (input: {
      userId: string;
      now: string;
      lessonSlugForTopic: (topicId: string) => string;
      seedTopics: Array<{ id: string; status: "not-started" | "in-progress" | "completed"; mastery: number }>;
    }) => Array<Record<string, unknown>>;
  const seedLessonProgressRecords =
    persistenceExports.studentActivitySeedLessonProgressRecords as (input: {
      userId: string;
      now: string;
      lessonSlugForTopic: (topicId: string) => string;
      seedTopics: Array<{ id: string; status: "not-started" | "in-progress" | "completed"; mastery: number }>;
    }) => Array<Record<string, unknown>>;
  const seedTopics = [
    { id: "topic-1", status: "completed" as const, mastery: 92 },
    { id: "topic-2", status: "in-progress" as const, mastery: 35 },
    { id: "topic-3", status: "not-started" as const, mastery: 0 }
  ];
  const seedInput = {
    userId: "student-1",
    now: "2026-06-21T08:00:00.000Z",
    lessonSlugForTopic: (topicId: string) => `lesson-${topicId}`,
    seedTopics
  };

  assert.equal(typeof emptyLessonProgressRecords, "function");
  assert.equal(typeof seedLessonProgressRecords, "function");
  assert.match(persistenceSource, /export function studentActivityEmptyLessonProgressRecords\b/);
  assert.match(persistenceSource, /export function studentActivitySeedLessonProgressRecords\b/);
  assert.match(rootSource, /studentActivityEmptyLessonProgressRecords as emptyLessonProgressRecordsFromStudentActivityPersistence/);
  assert.match(rootSource, /studentActivitySeedLessonProgressRecords as seedLessonProgressRecordsFromStudentActivityPersistence/);
  assert.doesNotMatch(rootSource, /function emptyLessonProgressRecords\b/);
  assert.doesNotMatch(rootSource, /function seedLessonProgressRecords\b/);

  assert.deepEqual(emptyLessonProgressRecords(seedInput), [
    {
      user_id: "student-1",
      topic_id: "topic-1",
      lesson_slug: "lesson-topic-1",
      status: "not-started",
      mastery: 0,
      started_at: null,
      completed_at: null,
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-21T08:00:00.000Z"
    },
    {
      user_id: "student-1",
      topic_id: "topic-2",
      lesson_slug: "lesson-topic-2",
      status: "not-started",
      mastery: 0,
      started_at: null,
      completed_at: null,
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-21T08:00:00.000Z"
    },
    {
      user_id: "student-1",
      topic_id: "topic-3",
      lesson_slug: "lesson-topic-3",
      status: "not-started",
      mastery: 0,
      started_at: null,
      completed_at: null,
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-21T08:00:00.000Z"
    }
  ]);

  assert.deepEqual(seedLessonProgressRecords(seedInput).map((record) => ({
    topic_id: record.topic_id,
    lesson_slug: record.lesson_slug,
    status: record.status,
    mastery: record.mastery,
    started_at: record.started_at,
    completed_at: record.completed_at
  })), [
    {
      topic_id: "topic-1",
      lesson_slug: "lesson-topic-1",
      status: "completed",
      mastery: 92,
      started_at: "2026-06-21T08:00:00.000Z",
      completed_at: "2026-06-21T08:00:00.000Z"
    },
    {
      topic_id: "topic-2",
      lesson_slug: "lesson-topic-2",
      status: "in-progress",
      mastery: 35,
      started_at: "2026-06-21T08:00:00.000Z",
      completed_at: null
    },
    {
      topic_id: "topic-3",
      lesson_slug: "lesson-topic-3",
      status: "not-started",
      mastery: 0,
      started_at: null,
      completed_at: null
    }
  ]);
});

function resourceFixture(resource: {
  id: string;
  title_en: string;
  title_zh: string;
  type: TeachingResource["type"];
  file_name: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path?: string;
  grade: TeachingResource["grade"];
  topic_id?: string;
  difficulty?: TeachingResource["difficulty"];
  uploaded_by: string;
  created_at: string;
}): TeachingResource {
  return {
    id: resource.id,
    title: { en: resource.title_en, zh: resource.title_zh },
    type: resource.type,
    fileName: resource.file_name,
    fileType: resource.file_type,
    mimeType: resource.mime_type,
    fileSizeBytes: resource.file_size_bytes,
    storagePath: resource.storage_path,
    grade: resource.grade,
    topicId: resource.topic_id,
    difficulty: resource.difficulty,
    uploadedBy: resource.uploaded_by,
    createdAt: resource.created_at,
    referenceCounts: {
      assignments: 0,
      assessments: 0,
      classroom: 0
    }
  };
}

test("student activity persistence lists visualization sessions without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const store = createTestStore({
    visualization_sessions: [
      {
        user_id: "student-1",
        module_id: "coordinate-plane",
        topic_id: "topic-1",
        source: "visualization-lab",
        explored: true,
        completed_at: "2026-06-20T09:00:00.000Z",
        updated_at: "2026-06-20T09:05:00.000Z"
      },
      {
        user_id: "student-2",
        module_id: "probability",
        topic_id: "topic-2",
        source: "lesson",
        explored: false,
        completed_at: null,
        updated_at: "2026-06-20T09:10:00.000Z"
      }
    ]
  });

  assert.deepEqual(await store.listVisualizationSessionsForUser("student-1"), [
    {
      moduleId: "coordinate-plane",
      topicId: "topic-1",
      source: "visualization-lab",
      explored: true,
      completedAt: "2026-06-20T09:00:00.000Z",
      updatedAt: "2026-06-20T09:05:00.000Z"
    }
  ]);
});

test("student activity persistence lists public questions from public content storage", async () => {
  const unavailableProfiles: string[] = [];
  const store = createTestStore({
    visualization_sessions: [],
    questions: [
      {
        id: "hk-easy",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-hk",
        difficulty: "Low",
        type: "multiple-choice",
        prompt_en: "2 + 2?",
        prompt_zh: "2 + 2？",
        options: null,
        answer: "4",
        explanation_en: "Add.",
        explanation_zh: "相加。"
      },
      {
        id: "hk-hard",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-hk",
        difficulty: "High",
        type: "short-answer",
        prompt_en: "x^2 = 9",
        prompt_zh: "x^2 = 9",
        options: null,
        answer: "3",
        explanation_en: "Square root.",
        explanation_zh: "開方。"
      },
      {
        id: "us-ca",
        curriculum_track: "US_CA_MATH",
        curriculum_region: "US",
        textbook_publisher: "US_CA_MATH",
        grade: "S3",
        topic_id: "topic-us",
        difficulty: "Low",
        type: "multiple-choice",
        prompt_en: "Find the slope.",
        prompt_zh: "找斜率。",
        options: null,
        answer: "2",
        explanation_en: "Rise over run.",
        explanation_zh: "升除以行。"
      }
    ],
    topics: [
      {
        id: "topic-hk",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Number",
        title_zh: "數",
        description_en: "",
        description_zh: "",
        difficulty: "Low",
        minutes: 10,
        sort_order: 1
      },
      {
        id: "topic-us",
        curriculum_track: "US_CA_MATH",
        curriculum_region: "US",
        textbook_publisher: "US_CA_MATH",
        grade: "S3",
        title_en: "Linear functions",
        title_zh: "線性函數",
        description_en: "",
        description_zh: "",
        difficulty: "Low",
        minutes: 12,
        sort_order: 2
      }
    ]
  }, {
    readPublicDatabase: () => ({
      visualization_sessions: [],
      questions: [
        {
          id: "public-hk",
          curriculum_track: "HK",
          grade: "S3",
          topic_id: "topic-hk",
          difficulty: "Low",
          type: "multiple-choice",
          prompt_en: "Public 2 + 2?",
          prompt_zh: "公開 2 + 2？",
          options: null,
          answer: "4",
          explanation_en: "Add.",
          explanation_zh: "相加。"
        }
      ],
      topics: [
        {
          id: "topic-hk",
          curriculum_track: "HK",
          grade: "S3",
          title_en: "Public Number",
          title_zh: "公開數",
          description_en: "",
          description_zh: "",
          difficulty: "Low",
          minutes: 10,
          sort_order: 1
        }
      ]
    }),
    contentUnavailableForProfile: (profile, grade) => {
      unavailableProfiles.push(`${profile.region}:${profile.publisher}:${grade ?? ""}`);
      return profile.region === "US" ? { en: "Unavailable", zh: "Unavailable" } : null;
    }
  });

  const hkQuestions = await store.getPublicQuestions({
    grade: "S3",
    topicId: "topic-hk",
    difficulty: "Low",
    curriculumTrack: "HK"
  });

  assert.deepEqual(hkQuestions.map((question) => question.id), ["public-hk"]);
  assert.equal(hkQuestions[0]?.topic.en, "Public Number");
  assert.equal("answer" in (hkQuestions[0] ?? {}), false);
  assert.equal(hkQuestions[0]?.difficulty, "Low");

  const unavailable = await store.getPublicQuestions({
    grade: "S3",
    curriculumTrack: "US_CA_MATH"
  });

  assert.deepEqual(unavailable, []);
  assert.deepEqual(unavailableProfiles, [
    "HK:HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY:S3",
    "US:US_CA_MATH:S3"
  ]);
});

test("student activity persistence marks visualization sessions through fake storage", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: []
  };
  const sideEffects: unknown[] = [];
  const store = createTestStore(database, {
    afterMarkVisualizationSession: async (_database, context) => {
      sideEffects.push(JSON.parse(JSON.stringify(context)));
    }
  });

  const firstSession = await store.markVisualizationSession({
    userId: "student-1",
    moduleId: "coordinate-plane",
    topicId: "topic-1",
    source: "visualization-lab"
  });

  assert.deepEqual(firstSession, {
    user_id: "student-1",
    module_id: "coordinate-plane",
    topic_id: "topic-1",
    source: "visualization-lab",
    explored: true,
    completed_at: now.toISOString(),
    updated_at: now.toISOString()
  });
  assert.deepEqual(database.visualization_sessions, [firstSession]);
  assert.deepEqual(sideEffects, [
    {
      userId: "student-1",
      moduleId: "coordinate-plane",
      topicId: "topic-1",
      source: "visualization-lab",
      wasCompleted: false,
      completedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      session: firstSession
    }
  ]);

  const repeatSession = await store.markVisualizationSession({
    userId: "student-1",
    moduleId: "coordinate-plane",
    topicId: "topic-2",
    source: "lesson"
  });

  assert.deepEqual(repeatSession, {
    user_id: "student-1",
    module_id: "coordinate-plane",
    topic_id: "topic-2",
    source: "lesson",
    explored: true,
    completed_at: now.toISOString(),
    updated_at: now.toISOString()
  });
  assert.deepEqual(sideEffects.at(-1), {
    userId: "student-1",
    moduleId: "coordinate-plane",
    topicId: "topic-2",
    source: "lesson",
    wasCompleted: true,
    completedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    session: repeatSession
  });
  assert.equal(sideEffects.length, 2);
});

test("student activity persistence returns visualization session before slow side effects settle", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: []
  };
  let releaseSideEffect!: () => void;
  const sideEffectSettled = new Promise<void>((resolve) => {
    releaseSideEffect = resolve;
  });
  const store = createTestStore(database, {
    afterMarkVisualizationSession: () => sideEffectSettled
  });

  const result = await Promise.race([
    store.markVisualizationSession({
      userId: "student-1",
      moduleId: "coordinate-plane",
      topicId: "topic-1",
      source: "visualization-lab"
    }).then((session) => ({ status: "resolved" as const, session })),
    new Promise<{ status: "pending" }>((resolve) => setTimeout(() => resolve({ status: "pending" }), 20))
  ]);

  releaseSideEffect();

  assert.equal(result.status, "resolved");
  if (result.status === "resolved") {
    assert.equal(result.session.module_id, "coordinate-plane");
    assert.equal(database.visualization_sessions?.length, 1);
  }
});

test("student activity persistence appends analytics events without legacy userStore imports", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    learning_events: [
      {
        id: "existing-event",
        user_id: "student-1",
        type: "answer-correct",
        source: "practice",
        grade: "S3",
        topic_id: "topic-1",
        duration_seconds: 45,
        created_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    learning_event_clears: [
      {
        user_id: "student-1",
        cleared_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    visualization_events: []
  };
  const afterAppendCalls: string[] = [];
  const store = createTestStore(database, {
    afterAppend: async (_database, { latestRecord }) => {
      afterAppendCalls.push(latestRecord.id);
    }
  });
  const events: LearningAnalyticsEvent[] = [
    {
      id: "existing-event",
      type: "answer-correct",
      source: "practice",
      timestamp: "2026-06-20T09:20:00.000Z",
      grade: "S3",
      topicId: "topic-1",
      durationSeconds: 30
    },
    {
      id: "before-clear",
      type: "page-view",
      source: "lesson",
      timestamp: "2026-06-20T08:59:00.000Z",
      grade: "S3",
      topicId: "topic-1"
    },
    {
      id: "visualization-1",
      type: "visualization-complete",
      source: "visualization-lab",
      timestamp: "2026-06-20T09:10:00.000Z",
      grade: "S3",
      topicId: "topic-1"
    },
    {
      id: "answer-1",
      type: "answer-wrong",
      source: "practice",
      timestamp: "2026-06-20T09:30:00.000Z",
      grade: "S3",
      topicId: "topic-1",
      questionId: "question-1",
      durationSeconds: 75
    }
  ];

  assert.equal(await store.appendLearningEvents("student-1", events), 2);
  assert.deepEqual(database.learning_events?.map((event) => event.id), [
    "existing-event",
    "visualization-1",
    "answer-1"
  ]);
  assert.deepEqual(database.visualization_events, [
    {
      id: "visualization-1",
      user_id: "student-1",
      topic_id: "topic-1",
      source: "visualization-lab",
      created_at: "2026-06-20T09:10:00.000Z"
    }
  ]);
  assert.deepEqual(afterAppendCalls, ["answer-1"]);
});

test("student activity persistence summarizes, exports, and clears analytics events", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    learning_events: [
      {
        id: "correct-1",
        user_id: "student-1",
        type: "answer-correct",
        source: "practice",
        grade: "S3",
        topic_id: "topic-1",
        duration_seconds: 45,
        created_at: "2026-06-20T09:00:00.000Z"
      },
      {
        id: "visualization-1",
        user_id: "student-1",
        type: "visualization-complete",
        source: "visualization-lab",
        grade: "S3",
        topic_id: "topic-1",
        created_at: "2026-06-20T09:05:00.000Z"
      },
      {
        id: "wrong-grade",
        user_id: "student-1",
        type: "answer-wrong",
        source: "practice",
        grade: "P6",
        topic_id: "topic-2",
        duration_seconds: 80,
        created_at: "2026-06-20T09:10:00.000Z"
      },
      {
        id: "other-student",
        user_id: "student-2",
        type: "answer-wrong",
        source: "practice",
        grade: "S3",
        topic_id: "topic-1",
        duration_seconds: 120,
        created_at: "2026-06-20T09:15:00.000Z"
      }
    ],
    learning_event_clears: [
      {
        user_id: "student-1",
        cleared_at: "2026-06-19T00:00:00.000Z"
      }
    ],
    visualization_events: [
      {
        id: "visualization-1",
        user_id: "student-1",
        topic_id: "topic-1",
        source: "visualization-lab",
        created_at: "2026-06-20T09:05:00.000Z"
      },
      {
        id: "visualization-2",
        user_id: "student-2",
        topic_id: "topic-1",
        source: "visualization-lab",
        created_at: "2026-06-20T09:05:00.000Z"
      }
    ]
  };
  const store = createTestStore(database);

  const summary = await store.getAnalyticsSummary("student-1", "3d", "S3");
  assert.equal(summary.windowDays, 3);
  assert.equal(summary.eventCount, 2);
  assert.equal(summary.counts.correctAnswers, 1);
  assert.equal(summary.counts.visualizationEvents, 1);

  const exported = await store.getAnalyticsExport("student-1", "S3", "3d");
  assert.equal(exported.generatedAt, "2026-06-20T10:00:00.000Z");
  assert.equal(exported.studentId, "student-1");
  assert.equal(exported.summary.eventCount, 2);

  await store.clearLearningEventsForUser("student-1", "2026-06-20T11:00:00.000Z");
  assert.deepEqual(database.learning_events?.map((event) => event.id), ["other-student"]);
  assert.deepEqual(database.visualization_events?.map((event) => event.id), ["visualization-2"]);
  assert.deepEqual(database.learning_event_clears, [
    {
      user_id: "student-1",
      cleared_at: "2026-06-20T11:00:00.000Z"
    }
  ]);
});

function createMistakeDatabase(): StudentActivityPersistenceDatabase {
  return {
    visualization_sessions: [],
    mistakes: [
      {
        user_id: "student-1",
        question_id: "question-2",
        last_selected_answer: "B",
        correct_answer: "C",
        wrong_attempts: 1,
        first_wrong_at: "2026-06-20T08:00:00.000Z",
        last_attempt_at: "2026-06-20T09:00:00.000Z",
        mastered: true
      },
      {
        user_id: "student-1",
        question_id: "question-1",
        last_selected_answer: "A",
        correct_answer: "B",
        wrong_attempts: 2,
        first_wrong_at: "2026-06-20T07:00:00.000Z",
        last_attempt_at: "2026-06-20T10:00:00.000Z",
        mastered: false
      },
      {
        user_id: "student-1",
        question_id: "missing-question",
        last_selected_answer: "x",
        correct_answer: "y",
        wrong_attempts: 1,
        first_wrong_at: "2026-06-20T06:00:00.000Z",
        last_attempt_at: "2026-06-20T11:00:00.000Z",
        mastered: false
      },
      {
        user_id: "student-2",
        question_id: "question-1",
        last_selected_answer: "A",
        correct_answer: "B",
        wrong_attempts: 1,
        first_wrong_at: "2026-06-20T06:30:00.000Z",
        last_attempt_at: "2026-06-20T08:30:00.000Z",
        mastered: false
      }
    ],
    questions: [
      {
        id: "question-1",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-1",
        difficulty: "Low",
        type: "multiple-choice",
        prompt_en: "Solve x + 1 = 3.",
        prompt_zh: "解 x + 1 = 3。",
        options: [
          { en: "1", zh: "1" },
          { en: "2", zh: "2" },
          { en: "3", zh: "3" }
        ],
        answer: "B",
        explanation_en: "Subtract 1 from both sides.",
        explanation_zh: "兩邊同減 1。"
      },
      {
        id: "question-2",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-2",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "Factor x^2 - 1.",
        prompt_zh: "分解 x^2 - 1。",
        options: null,
        answer: "C",
        explanation_en: "Use difference of squares.",
        explanation_zh: "使用平方差公式。"
      }
    ],
    topics: [
      {
        id: "topic-1",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Linear equations",
        title_zh: "一次方程",
        description_en: "Solve simple equations.",
        description_zh: "解簡單方程。",
        difficulty: "Low",
        minutes: 20,
        sort_order: 1
      },
      {
        id: "topic-2",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Factorization",
        title_zh: "因式分解",
        description_en: "Use identities.",
        description_zh: "使用恆等式。",
        difficulty: "Medium",
        minutes: 25,
        sort_order: 2
      }
    ]
  };
}

test("student activity persistence reads mistake book items without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const store = createTestStore(createMistakeDatabase());

  const active = await store.getMistakes("student-1", "active");
  assert.deepEqual(active.map((mistake) => mistake.questionId), ["question-1"]);
  assert.equal(active[0].question.topic.en, "Linear equations");
  assert.equal(active[0].question.prompt.en, "Solve x + 1 = 3.");
  assert.equal(active[0].explanation.zh, "兩邊同減 1。");

  const mastered = await store.getMistakes("student-1", "mastered");
  assert.deepEqual(mastered.map((mistake) => mistake.questionId), ["question-2"]);

  const all = await store.getMistakes("student-1");
  assert.deepEqual(all.map((mistake) => mistake.questionId), ["question-1", "question-2"]);
});

test("student activity persistence owns mistake book item projection for legacy userStore", async () => {
  const helpers = studentActivityPersistence as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = createMistakeDatabase();

  assert.equal(typeof helpers.studentActivityToMistakeBookItem, "function");
  assert.match(persistenceSource, /export const studentActivityToMistakeBookItem = toMistakeBookItem;/);
  assert.match(rootSource, /studentActivityToMistakeBookItem as toMistakeBookItemFromStudentActivity/);
  assert.doesNotMatch(rootSource, /function toMistakeBookItem\(/);

  const toMistakeBookItem = helpers.studentActivityToMistakeBookItem as (
    database: StudentActivityPersistenceDatabase,
    mistake: NonNullable<StudentActivityPersistenceDatabase["mistakes"]>[number]
  ) => MistakeBookItem | null;

  assert.equal(toMistakeBookItem(database, database.mistakes![2]), null);
  const item = toMistakeBookItem(database, database.mistakes![1]);
  assert.equal(item?.questionId, "question-1");
  assert.equal(item?.lastSelectedAnswer, "A");
  assert.equal(item?.correctAnswer, "B");
  assert.equal(item?.wrongAttempts, 2);
  assert.equal(item?.firstWrongAt, "2026-06-20T07:00:00.000Z");
  assert.equal(item?.lastAttemptAt, "2026-06-20T10:00:00.000Z");
  assert.equal(item?.mastered, false);
  assert.equal(item?.question.topic.en, "Linear equations");
  assert.equal(item?.question.prompt.en, "Solve x + 1 = 3.");
  assert.equal(item?.question.difficulty, "Low");
  assert.equal(item?.question.curriculumProfile?.publisher, "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY");
  assert.deepEqual(item?.explanation, {
    en: "Subtract 1 from both sides.",
    zh: "兩邊同減 1。"
  });
});

test("student activity persistence marks mistakes mastered once and calls reward hook", async () => {
  const database = createMistakeDatabase();
  const rewardCalls: string[] = [];
  const store = createTestStore(database, {
    afterMarkMistakeMastered: (_database, { userId, questionId, topic, masteredAt }) => {
      rewardCalls.push(`${userId}:${questionId}:${topic?.id}:${masteredAt}`);
    }
  });

  const result = await store.markMistakeMastered("student-1", "question-1");

  assert.equal(result?.questionId, "question-1");
  assert.equal(result?.mastered, true);
  assert.equal(result?.lastAttemptAt, "2026-06-20T10:00:00.000Z");
  assert.deepEqual(rewardCalls, ["student-1:question-1:topic-1:2026-06-20T10:00:00.000Z"]);

  const alreadyMastered = await store.markMistakeMastered("student-1", "question-1");
  assert.equal(alreadyMastered?.mastered, true);
  assert.deepEqual(rewardCalls, ["student-1:question-1:topic-1:2026-06-20T10:00:00.000Z"]);
  assert.equal(await store.markMistakeMastered("student-1", "missing-question"), null);
});

test("student activity persistence deletes and clears mistake records", async () => {
  const database = createMistakeDatabase();
  const store = createTestStore(database);

  assert.equal(await store.deleteMistake("student-1", "question-1"), true);
  assert.equal(await store.deleteMistake("student-1", "question-1"), false);
  assert.deepEqual(database.mistakes?.filter((mistake) => mistake.user_id === "student-1").map((mistake) => mistake.question_id), [
    "question-2",
    "missing-question"
  ]);

  await store.clearMistakesForUser("student-1");
  assert.deepEqual(database.mistakes?.map((mistake) => mistake.user_id), ["student-2"]);
});

test("student activity persistence records question attempts and updates mistake rows through fake storage", async () => {
  const database = createMistakeDatabase();
  database.attempts = [];
  database.mistakes = [];
  let id = 0;
  const sideEffects: string[] = [];
  const store = createTestStore(database, {
    createId: () => `attempt-${++id}`,
    afterSubmitQuestionAttempt: (_database, { userId, question, correct, selectedAnswer, now: submittedAt }) => {
      sideEffects.push(`${userId}:${question.id}:${correct}:${selectedAnswer}:${submittedAt}`);
    }
  });

  const wrong = await store.submitQuestionAttempt({
    userId: "student-1",
    questionId: "question-1",
    selectedAnswer: "A",
    durationSeconds: 12.6,
    curriculumTrack: "HK"
  });

  assert.deepEqual(wrong, {
    correct: false,
    explanation: {
      en: "Subtract 1 from both sides.",
      zh: "兩邊同減 1。"
    },
    correctAnswer: "B"
  });
  assert.deepEqual(database.attempts?.[0], {
    id: "attempt-1",
    user_id: "student-1",
    question_id: "question-1",
    selected_answer: "A",
    is_correct: false,
    duration_seconds: 13,
    created_at: "2026-06-20T10:00:00.000Z",
    answer_work_photos: null
  });
  assert.deepEqual(database.mistakes?.[0], {
    user_id: "student-1",
    question_id: "question-1",
    last_selected_answer: "A",
    correct_answer: "B",
    wrong_attempts: 1,
    first_wrong_at: "2026-06-20T10:00:00.000Z",
    last_attempt_at: "2026-06-20T10:00:00.000Z",
    mastered: false
  });

  const correct = await store.submitQuestionAttempt({
    userId: "student-1",
    questionId: "question-1",
    selectedAnswer: "B",
    durationSeconds: -5,
    curriculumTrack: "HK"
  });

  assert.equal(correct?.correct, true);
  assert.equal(correct?.correctAnswer, undefined);
  assert.equal(database.attempts?.[1]?.id, "attempt-2");
  assert.equal(database.attempts?.[1]?.duration_seconds, null);
  assert.equal(database.mistakes?.[0]?.mastered, true);
  assert.equal(database.mistakes?.[0]?.last_attempt_at, "2026-06-20T10:00:00.000Z");
  assert.deepEqual(sideEffects, [
    "student-1:question-1:false:A:2026-06-20T10:00:00.000Z",
    "student-1:question-1:true:B:2026-06-20T10:00:00.000Z"
  ]);
});

test("student activity persistence rejects unavailable question attempts before mutation hooks", async () => {
  const database = createMistakeDatabase();
  database.attempts = [];
  const sideEffects: string[] = [];
  const store = createTestStore(database, {
    afterSubmitQuestionAttempt: () => {
      sideEffects.push("called");
    },
    questionMatchesCurriculum: () => false
  });

  assert.equal(await store.submitQuestionAttempt({
    userId: "student-1",
    questionId: "question-1",
    selectedAnswer: "B",
    curriculumTrack: "HK"
  }), null);
  assert.equal(await store.submitQuestionAttempt({
    userId: "student-1",
    questionId: "missing-question",
    selectedAnswer: "B",
    curriculumTrack: "HK"
  }), null);
  assert.deepEqual(database.attempts, []);
  assert.deepEqual(sideEffects, []);
});

test("student activity persistence authorizes resource downloads from assignments and assessments", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    teaching_resources: [
      {
        id: "resource-assignment",
        title_en: "Assignment pack",
        title_zh: "課業資源",
        type: "worksheet",
        file_name: "assignment-pack.pdf",
        file_type: "pdf",
        mime_type: "application/pdf",
        file_size_bytes: 128,
        storage_path: "seed://assignment-pack",
        grade: "S3",
        uploaded_by: "teacher-1",
        created_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "resource-assessment",
        title_en: "Assessment pack",
        title_zh: "測驗資源",
        type: "quiz",
        file_name: "assessment-pack.pdf",
        file_type: "pdf",
        mime_type: "application/pdf",
        file_size_bytes: 256,
        storage_path: "seed://assessment-pack",
        grade: "S3",
        uploaded_by: "teacher-1",
        created_at: "2026-06-20T08:05:00.000Z"
      },
      {
        id: "resource-other",
        title_en: "Other pack",
        title_zh: "其他資源",
        type: "document",
        file_name: "other.pdf",
        file_type: "pdf",
        mime_type: "application/pdf",
        file_size_bytes: 512,
        storage_path: "seed://other",
        grade: "S3",
        uploaded_by: "teacher-1",
        created_at: "2026-06-20T08:10:00.000Z"
      }
    ],
    assignments: [
      {
        id: "assignment-1",
        class_id: "class-1",
        content_type: "resource",
        target_id: "resource-assignment"
      }
    ],
    submissions: [
      {
        id: "submission-1",
        assignment_id: "assignment-1",
        student_id: "student-1"
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-2",
        student_id: "student-1",
        joined_at: "2026-06-20T07:00:00.000Z"
      }
    ],
    assessments: [
      {
        id: "assessment-1",
        class_id: "class-2",
        source_resource_id: "resource-assessment"
      }
    ]
  };
  const store = createTestStore(database);

  const assignmentDownload = await store.getStudentResourceDownloadData("student-1", "resource-assignment");
  assert.equal(assignmentDownload?.resource.id, "resource-assignment");
  assert.deepEqual(assignmentDownload?.resource.referenceCounts, {
    assignments: 1,
    assessments: 0,
    classroom: 0
  });
  assert.equal(assignmentDownload?.mimeType, "text/plain; charset=utf-8");
  assert.equal(assignmentDownload?.fileName, "assignment-pack.txt");
  assert.match(Buffer.from(assignmentDownload?.bytes ?? []).toString("utf8"), /Assignment pack/);
  assert.match(Buffer.from(assignmentDownload?.bytes ?? []).toString("utf8"), /Seed resource placeholder/);

  const assessmentDownload = await store.getStudentResourceDownloadData("student-1", "resource-assessment");
  assert.equal(assessmentDownload?.resource.id, "resource-assessment");
  assert.deepEqual(assessmentDownload?.resource.referenceCounts, {
    assignments: 0,
    assessments: 1,
    classroom: 0
  });
  assert.equal(assessmentDownload?.mimeType, "text/plain; charset=utf-8");
  assert.equal(assessmentDownload?.fileName, "assessment-pack.txt");
  assert.match(Buffer.from(assessmentDownload?.bytes ?? []).toString("utf8"), /Assessment pack/);
  assert.match(Buffer.from(assessmentDownload?.bytes ?? []).toString("utf8"), /Seed resource placeholder/);

  assert.equal(await store.getStudentResourceDownloadData("student-1", "resource-other"), null);
  assert.equal(await store.getStudentResourceDownloadData("student-1", "missing-resource"), null);
  assert.equal(await store.getStudentResourceDownloadData("student-2", "resource-assignment"), null);
});

test("student activity persistence marks authorized resource views through fake storage", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    teaching_resources: [
      {
        id: "resource-assignment",
        title_en: "Assignment pack",
        title_zh: "課業資源",
        type: "worksheet",
        file_name: "assignment-pack.pdf",
        file_type: "pdf",
        mime_type: "application/pdf",
        file_size_bytes: 128,
        storage_path: "seed://assignment-pack",
        grade: "S3",
        uploaded_by: "teacher-1",
        created_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    assignments: [
      {
        id: "assignment-1",
        class_id: "class-1",
        content_type: "resource",
        target_id: "resource-assignment"
      }
    ],
    submissions: [
      {
        id: "submission-1",
        assignment_id: "assignment-1",
        student_id: "student-1"
      }
    ]
  };
  const viewed: string[] = [];
  const store = createTestStore(database, {
    afterMarkResourceViewed: (_database, { userId, resourceId, viewedAt }) => {
      viewed.push(`${userId}:${resourceId}:${viewedAt}`);
    }
  });

  const result = await store.markStudentResourceViewed("student-1", "resource-assignment");
  assert.equal(result.status, "viewed");
  assert.equal(result.resource.id, "resource-assignment");
  assert.deepEqual(viewed, ["student-1:resource-assignment:2026-06-20T10:00:00.000Z"]);

  assert.deepEqual(await store.markStudentResourceViewed("student-2", "resource-assignment"), {
    status: "not-found"
  });
  assert.deepEqual(await store.markStudentResourceViewed("student-1", "missing-resource"), {
    status: "not-found"
  });
  assert.deepEqual(viewed, ["student-1:resource-assignment:2026-06-20T10:00:00.000Z"]);
});

test("student activity persistence returns resource detail data through fake storage", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    teaching_resources: [
      {
        id: "resource-assignment",
        title_en: "Assignment pack",
        title_zh: "課業資源",
        type: "worksheet",
        file_name: "assignment-pack.pdf",
        file_type: "pdf",
        mime_type: "application/pdf",
        file_size_bytes: 128,
        storage_path: "seed://assignment-pack",
        grade: "S3",
        uploaded_by: "teacher-1",
        created_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "resource assessment",
        title_en: "Assessment pack",
        title_zh: "測驗資源",
        type: "quiz",
        file_name: "assessment-pack.pdf",
        file_type: "pdf",
        mime_type: "application/pdf",
        file_size_bytes: 256,
        storage_path: "seed://assessment-pack",
        grade: "S3",
        uploaded_by: "teacher-1",
        created_at: "2026-06-20T08:05:00.000Z"
      }
    ],
    assignments: [
      {
        id: "assignment-1",
        class_id: "class-1",
        content_type: "resource",
        target_id: "resource-assignment"
      }
    ],
    submissions: [
      {
        id: "submission-1",
        assignment_id: "assignment-1",
        student_id: "student-1"
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        teacher_id: "teacher-1",
        name: "S3A",
        grade: "S3"
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-2",
        student_id: "student-1"
      }
    ],
    assessments: [
      {
        id: "assessment-1",
        class_id: "class-2",
        source_resource_id: "resource assessment"
      }
    ]
  };
  const store = createTestStore(database);

  const assignmentDetail = await store.getStudentResourceDetailData("student-1", "resource-assignment");
  assert.equal(assignmentDetail?.resource.id, "resource-assignment");
  assert.deepEqual(assignmentDetail?.resource.referenceCounts, {
    assignments: 1,
    assessments: 0,
    classroom: 0
  });
  assert.equal(assignmentDetail?.assignment?.assignment.id, "assignment-1");
  assert.equal(assignmentDetail?.assignment?.submission.id, "submission-1");
  assert.equal(assignmentDetail?.assignment?.className, "S3A");
  assert.equal(assignmentDetail?.assignment?.classGrade, "S3");
  assert.equal(assignmentDetail?.downloadUrl, "/api/resources/resource-assignment/download");
  assert.equal(assignmentDetail?.canMarkComplete, true);

  const assessmentDetail = await store.getStudentResourceDetailData("student-1", "resource assessment");
  assert.equal(assessmentDetail?.resource.id, "resource assessment");
  assert.deepEqual(assessmentDetail?.resource.referenceCounts, {
    assignments: 0,
    assessments: 1,
    classroom: 0
  });
  assert.equal(assessmentDetail?.assignment, null);
  assert.equal(assessmentDetail?.downloadUrl, "/api/resources/resource%20assessment/download");
  assert.equal(assessmentDetail?.canMarkComplete, false);

  assert.equal(await store.getStudentResourceDetailData("student-2", "resource-assignment"), null);
  assert.equal(await store.getStudentResourceDetailData("student-1", "missing-resource"), null);
});

test("student activity persistence lists student assignments through fake storage", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    users: [
      {
        id: "teacher-1",
        username: "Ms Wong"
      }
    ],
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada Student",
        grade: "S3"
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        name: "S3A",
        grade: "S3"
      },
      {
        id: "class-2",
        name: "S2B",
        grade: "S2"
      }
    ],
    assignments: [
      {
        id: "assignment-older",
        class_id: "class-2",
        title_en: "Lesson reflection",
        title_zh: "課堂反思",
        description_en: "Review the earlier topic.",
        description_zh: "重溫較早的主題。",
        content_type: "lesson",
        target_id: "topic-2",
        status: "active",
        due_at: "2026-06-22T09:00:00.000Z",
        allow_retake: false,
        show_answers: true,
        count_towards_grade: false,
        created_by: "teacher-1",
        created_at: "2026-06-19T08:00:00.000Z",
        updated_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "assignment-newer",
        class_id: "class-1",
        title_en: "Practice follow-up",
        title_zh: "練習跟進",
        description_en: "Show your correction steps.",
        description_zh: "展示改正步驟。",
        content_type: "practice",
        target_id: "topic-1",
        status: "active",
        due_at: "2026-06-23T09:00:00.000Z",
        allow_retake: true,
        show_answers: false,
        count_towards_grade: true,
        created_by: "teacher-1",
        created_at: "2026-06-19T09:00:00.000Z",
        updated_at: "2026-06-20T09:00:00.000Z"
      },
      {
        id: "assignment-missing-class",
        class_id: "missing-class",
        content_type: "resource",
        target_id: "resource-1"
      }
    ],
    submissions: [
      {
        id: "submission-older",
        assignment_id: "assignment-older",
        student_id: "student-1",
        status: "submitted",
        score: 88,
        submitted_at: "2026-06-20T07:55:00.000Z",
        graded_at: "2026-06-20T08:10:00.000Z",
        feedback_en: "Clear work.",
        feedback_zh: "清楚。",
        updated_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "submission-other-student",
        assignment_id: "assignment-newer",
        student_id: "student-2",
        status: "submitted",
        score: 70,
        submitted_at: "2026-06-20T12:00:00.000Z",
        graded_at: null,
        updated_at: "2026-06-20T12:00:00.000Z"
      },
      {
        id: "submission-missing-assignment",
        assignment_id: "missing-assignment",
        student_id: "student-1",
        status: "submitted",
        score: null,
        submitted_at: "2026-06-20T11:00:00.000Z",
        graded_at: null,
        updated_at: "2026-06-20T11:00:00.000Z"
      },
      {
        id: "submission-missing-class",
        assignment_id: "assignment-missing-class",
        student_id: "student-1",
        status: "submitted",
        score: null,
        submitted_at: "2026-06-20T10:00:00.000Z",
        graded_at: null,
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "submission-newer",
        assignment_id: "assignment-newer",
        student_id: "student-1",
        status: "correction-required",
        score: 64,
        submitted_at: "2026-06-20T08:50:00.000Z",
        graded_at: "2026-06-20T09:10:00.000Z",
        feedback_en: "Review your final line.",
        feedback_zh: "檢查最後一步。",
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    assignment_submission_attempts: [
      {
        id: "attempt-initial",
        submission_id: "submission-newer",
        student_id: "student-1",
        attempt_number: 1,
        kind: "initial",
        input_type: "text",
        answer_text: "Initial answer",
        ocr_result: null,
        submitted_at: "2026-06-20T08:50:00.000Z"
      },
      {
        id: "attempt-correction",
        submission_id: "submission-newer",
        student_id: "student-1",
        attempt_number: 2,
        kind: "correction",
        input_type: "text",
        answer_text: "Corrected answer",
        ocr_result: null,
        submitted_at: "2026-06-20T09:05:00.000Z"
      }
    ],
    assignment_grading_runs: [
      {
        id: "grading-old",
        submission_id: "submission-newer",
        attempt_id: "attempt-initial",
        status: "suggested",
        provider: "llm",
        model: "deterministic",
        suggested_score: 58,
        confidence: 0.8,
        feedback_en: "Needs more detail.",
        correction_request_en: "Try another step.",
        created_at: "2026-06-20T08:55:00.000Z"
      },
      {
        id: "grading-new",
        submission_id: "submission-newer",
        attempt_id: "attempt-correction",
        status: "needs-review",
        provider: "llm",
        model: "deterministic",
        suggested_score: 64,
        confidence: 0.86,
        feedback_en: "Closer.",
        correction_request_en: "Explain the denominator.",
        created_at: "2026-06-20T09:08:00.000Z"
      }
    ],
    assignment_teacher_reviews: [
      {
        id: "review-new",
        submission_id: "submission-newer",
        action: "request-correction",
        final_score: 64,
        feedback_en: "Good correction, but one step is missing.",
        correction_request_en: "Show the missing step.",
        correction_due_at: "2026-06-24T09:00:00.000Z",
        reviewed_by: "teacher-1",
        created_at: "2026-06-20T09:15:00.000Z"
      }
    ]
  };
  const store = createTestStore(database);

  const assignments = await store.getStudentAssignments("student-1");

  assert.deepEqual(assignments.map((item) => item.assignment.id), ["assignment-newer", "assignment-older"]);
  assert.deepEqual(assignments.map((item) => item.submission.id), ["submission-newer", "submission-older"]);
  assert.deepEqual(assignments.map((item) => item.className), ["S3A", "S2B"]);
  assert.deepEqual(assignments.map((item) => item.classGrade), ["S3", "S2"]);
  assert.equal(assignments[0]?.assignment.title.en, "Practice follow-up");
  assert.equal(assignments[0]?.assignment.submissionCount, 2);
  assert.equal(assignments[0]?.assignment.completedCount, 2);
  assert.equal(assignments[0]?.assignment.allowRetake, true);
  assert.equal(assignments[0]?.submission.studentName, "Ada Student");
  assert.equal(assignments[0]?.submission.feedback?.en, "Review your final line.");
  assert.equal(assignments[0]?.submission.correctionRequest?.en, "Show the missing step.");
  assert.equal(assignments[0]?.submission.correctionDueAt, "2026-06-24T09:00:00.000Z");
  assert.equal(assignments[0]?.submission.correctionRound, 1);
  assert.deepEqual(assignments[0]?.submission.attempts.map((attempt) => attempt.id), [
    "attempt-initial",
    "attempt-correction"
  ]);
  assert.equal(assignments[0]?.submission.latestAttempt?.id, "attempt-correction");
  assert.equal(assignments[0]?.submission.latestGradingRun?.id, "grading-new");
  assert.equal(assignments[0]?.submission.latestTeacherReview?.id, "review-new");
  assert.equal(assignments[0]?.submission.latestTeacherReview?.reviewerName, "Ms Wong");
  assert.equal(assignments[1]?.assignment.completedCount, 1);
});

test("student activity persistence submits assignment work through fake storage", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    assignment_submission_attempts: [
      {
        id: "attempt-correction-initial",
        submission_id: "submission-correction",
        student_id: "student-1",
        attempt_number: 1,
        kind: "initial",
        input_type: "text",
        answer_text: "first answer",
        ocr_result: null,
        submitted_at: "2026-06-19T10:00:00.000Z"
      }
    ],
    assignments: [
      {
        id: "assignment-active",
        class_id: "class-1",
        content_type: "practice",
        target_id: "question-1",
        status: "active",
        due_at: null
      },
      {
        id: "assignment-late",
        class_id: "class-1",
        content_type: "practice",
        target_id: "question-2",
        status: "active",
        due_at: "2026-06-19T08:00:00.000Z"
      },
      {
        id: "assignment-correction",
        class_id: "class-1",
        content_type: "practice",
        target_id: "question-3",
        status: "active",
        due_at: null
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-1",
        student_id: "student-1"
      }
    ],
    submissions: [
      {
        id: "submission-active",
        assignment_id: "assignment-active",
        student_id: "student-1",
        status: "not-started",
        score: 80,
        submitted_at: null,
        graded_at: null,
        updated_at: "2026-06-19T09:00:00.000Z"
      },
      {
        id: "submission-late",
        assignment_id: "assignment-late",
        student_id: "student-1",
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        updated_at: "2026-06-19T09:05:00.000Z"
      },
      {
        id: "submission-correction",
        assignment_id: "assignment-correction",
        student_id: "student-1",
        status: "correction-required",
        score: 60,
        submitted_at: "2026-06-19T10:00:00.000Z",
        graded_at: null,
        updated_at: "2026-06-19T11:00:00.000Z"
      }
    ]
  };
  const store = createTestStore(database, {
    createId: () => "generated-id"
  });

  const submitted = await store.submitAssignmentWork({
    userId: "student-1",
    assignmentId: "assignment-active",
    kind: "initial",
    answerText: "  42  ",
    imageObject: { objectKey: "assignment-image/student-1/work.png" },
    imageFileName: "student-work.png"
  });

  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.status === "submitted" ? submitted.submission.id : null, "submission-active");
  assert.equal(database.submissions?.[0]?.status, "submitted");
  assert.equal(database.submissions?.[0]?.score, null);
  assert.equal(database.submissions?.[0]?.submitted_at, now.toISOString());
  assert.deepEqual(database.assignment_submission_attempts?.at(-1), {
    id: "assignment-attempt-generated-id",
    submission_id: "submission-active",
    student_id: "student-1",
    attempt_number: 1,
    kind: "initial",
    input_type: "mixed",
    answer_text: "42",
    image_object_key: "assignment-image/student-1/work.png",
    image_file_name: "student-work.png",
    ocr_result: {
      text: "42",
      confidence: null,
      provider: "none",
      accepted: true,
      alternatives: []
    },
    submitted_at: now.toISOString()
  });

  const late = await store.submitAssignmentWork({
    userId: "student-1",
    assignmentId: "assignment-late",
    kind: "initial",
    answerText: "late answer"
  });
  assert.equal(late.status, "submitted");
  assert.equal(database.submissions?.[1]?.status, "late");

  const correction = await store.submitAssignmentWork({
    userId: "student-1",
    assignmentId: "assignment-correction",
    kind: "correction",
    answerText: "",
    ocrResult: {
      text: "corrected from OCR",
      confidence: 2,
      provider: "simpletex",
      accepted: true,
      alternatives: [{ text: "alternate", confidence: 0.8, provider: "simpletex" }]
    }
  });
  assert.equal(correction.status, "submitted");
  assert.equal(database.submissions?.[2]?.status, "correction-submitted");
  assert.equal(database.submissions?.[2]?.score, 60);
  assert.equal(database.assignment_submission_attempts?.at(-1)?.answer_text, "corrected from OCR");
  assert.equal(database.assignment_submission_attempts?.at(-1)?.attempt_number, 2);
  assert.equal(database.assignment_submission_attempts?.at(-1)?.ocr_result?.confidence, 1);
});

test("student activity persistence rejects unavailable assignment work submissions", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    assignment_submission_attempts: [
      {
        id: "attempt-correction-1",
        submission_id: "submission-max-corrections",
        student_id: "student-1",
        attempt_number: 1,
        kind: "correction",
        input_type: "text",
        answer_text: "try 1",
        ocr_result: null,
        submitted_at: "2026-06-18T10:00:00.000Z"
      },
      {
        id: "attempt-correction-2",
        submission_id: "submission-max-corrections",
        student_id: "student-1",
        attempt_number: 2,
        kind: "correction",
        input_type: "text",
        answer_text: "try 2",
        ocr_result: null,
        submitted_at: "2026-06-19T10:00:00.000Z"
      }
    ],
    assignments: [
      {
        id: "assignment-active",
        class_id: "class-1",
        content_type: "practice",
        status: "active",
        due_at: null
      },
      {
        id: "assignment-closed",
        class_id: "class-1",
        content_type: "practice",
        status: "closed",
        due_at: null
      },
      {
        id: "assignment-other-class",
        class_id: "class-2",
        content_type: "practice",
        status: "active",
        due_at: null
      },
      {
        id: "assignment-max-corrections",
        class_id: "class-1",
        content_type: "practice",
        status: "active",
        due_at: null
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-1",
        student_id: "student-1"
      }
    ],
    submissions: [
      {
        id: "submission-active",
        assignment_id: "assignment-active",
        student_id: "student-1",
        status: "submitted",
        score: null,
        submitted_at: now.toISOString(),
        graded_at: null,
        updated_at: now.toISOString()
      },
      {
        id: "submission-closed",
        assignment_id: "assignment-closed",
        student_id: "student-1",
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        updated_at: now.toISOString()
      },
      {
        id: "submission-other-class",
        assignment_id: "assignment-other-class",
        student_id: "student-1",
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        updated_at: now.toISOString()
      },
      {
        id: "submission-max-corrections",
        assignment_id: "assignment-max-corrections",
        student_id: "student-1",
        status: "correction-required",
        score: 40,
        submitted_at: now.toISOString(),
        graded_at: null,
        updated_at: now.toISOString()
      }
    ]
  };
  const store = createTestStore(database);

  assert.deepEqual(await store.submitAssignmentWork({
    userId: "student-1",
    assignmentId: "assignment-active",
    kind: "initial"
  }), { status: "invalid" });
  assert.deepEqual(await store.submitAssignmentWork({
    userId: "student-1",
    assignmentId: "missing-assignment",
    kind: "initial",
    answerText: "answer"
  }), { status: "not-found" });
  assert.deepEqual(await store.submitAssignmentWork({
    userId: "student-1",
    assignmentId: "assignment-other-class",
    kind: "initial",
    answerText: "answer"
  }), { status: "not-found" });
  assert.deepEqual(await store.submitAssignmentWork({
    userId: "student-1",
    assignmentId: "assignment-closed",
    kind: "initial",
    answerText: "answer"
  }), { status: "closed" });
  assert.deepEqual(await store.submitAssignmentWork({
    userId: "student-1",
    assignmentId: "assignment-active",
    kind: "correction",
    answerText: "correction"
  }), { status: "invalid-state" });
  assert.deepEqual(await store.submitAssignmentWork({
    userId: "student-1",
    assignmentId: "assignment-max-corrections",
    kind: "correction",
    answerText: "correction"
  }), { status: "max-corrections" });
  assert.equal(database.assignment_submission_attempts?.length, 2);
});

test("student activity persistence builds student message data through fake storage", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    users: [
      {
        id: "student-1",
        username: "student.username"
      },
      {
        id: "teacher-1",
        username: "Ms Wong"
      },
      {
        id: "parent-1",
        username: "Ada Parent"
      }
    ],
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada Student",
        grade: "S3"
      },
      {
        user_id: "teacher-1",
        name: "Teacher Profile",
        grade: "S3"
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        teacher_id: "teacher-1",
        school_id: "school-1",
        class_code: "S3A-2026",
        name: "S3A",
        grade: "S3",
        curriculum_track: "US_CA_MATH",
        curriculum_region: "US",
        textbook_publisher: "US_CA_MATH",
        academic_year: "2026-2027",
        description_en: "Algebra readiness",
        description_zh: "代數準備",
        invite_code: "INVITE-S3A",
        created_at: "2026-06-18T08:00:00.000Z",
        updated_at: "2026-06-19T08:00:00.000Z"
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-1",
        student_id: "student-1"
      }
    ],
    assignments: [
      {
        id: "assignment-1",
        class_id: "class-1",
        content_type: "practice",
        target_id: "topic-1"
      }
    ],
    submissions: [
      {
        id: "submission-1",
        assignment_id: "assignment-1",
        student_id: "student-1",
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    teacher_messages: [
      {
        id: "thread-newer",
        class_id: "class-1",
        student_id: "student-1",
        teacher_id: "teacher-1",
        assignment_id: "assignment-1",
        topic_id: "topic-1",
        report_id: "report-1",
        parent_category: "learning-support",
        subject_en: "Newer",
        subject_zh: "Newer",
        latest_message: "Latest",
        status: "unread",
        priority: "urgent",
        starred: false,
        last_message_at: "2026-06-20T12:00:00.000Z",
        created_at: "2026-06-20T11:00:00.000Z"
      },
      {
        id: "thread-older",
        class_id: "class-1",
        student_id: "student-1",
        teacher_id: "teacher-1",
        subject_en: "Older",
        subject_zh: "Older",
        latest_message: "Earlier",
        status: "open",
        priority: "normal",
        starred: true,
        last_message_at: "2026-06-19T12:00:00.000Z",
        created_at: "2026-06-19T11:00:00.000Z"
      },
      {
        id: "thread-parent",
        class_id: "class-1",
        student_id: "student-1",
        teacher_id: "teacher-1",
        guardian_id: "parent-1",
        subject_en: "Parent only",
        subject_zh: "Parent only",
        latest_message: "Hidden",
        status: "open",
        priority: "normal",
        starred: false,
        last_message_at: "2026-06-20T13:00:00.000Z",
        created_at: "2026-06-20T13:00:00.000Z"
      }
    ],
    teacher_message_entries: [
      {
        id: "entry-newer-2",
        thread_id: "thread-newer",
        sender_id: "teacher-1",
        sender_role: "teacher",
        recipient_id: "student-1",
        body: "Second",
        attachments: [],
        created_at: "2026-06-20T12:00:00.000Z"
      },
      {
        id: "entry-newer-1",
        thread_id: "thread-newer",
        sender_id: "student-1",
        sender_role: "student",
        recipient_id: "teacher-1",
        body: "First",
        attachments: [],
        created_at: "2026-06-20T11:30:00.000Z"
      },
      {
        id: "entry-older",
        thread_id: "thread-older",
        sender_id: "student-1",
        sender_role: "student",
        recipient_id: "teacher-1",
        body: "Earlier",
        attachments: [],
        created_at: "2026-06-19T12:00:00.000Z"
      }
    ]
  };

  const data = await createTestStore(database).getStudentMessagesData("student-1", "thread-older");

  assert.deepEqual(data.threads.map((thread) => thread.id), ["thread-newer", "thread-older"]);
  assert.equal(data.selectedThread?.id, "thread-older");
  assert.deepEqual(data.threads[0]?.messages.map((entry) => entry.id), ["entry-newer-1", "entry-newer-2"]);
  assert.equal(data.threads[0]?.studentName, "Ada Student");
  assert.equal(data.threads[0]?.assignmentId, "assignment-1");
  assert.equal(data.threads[0]?.topicId, "topic-1");
  assert.equal(data.threads[0]?.reportId, "report-1");
  assert.equal(data.threads[0]?.parentCategory, "learning-support");
  assert.deepEqual(data.threads[0]?.subject, { en: "Newer", zh: "Newer" });
  assert.equal(data.threads[0]?.messages[0]?.senderName, "Ada Student");
  assert.equal(data.threads[0]?.messages[1]?.senderName, "Teacher Profile");
  assert.deepEqual(data.classes.map((teacherClass) => teacherClass.id), ["class-1"]);
  assert.equal(data.classes[0]?.teacherId, "teacher-1");
  assert.equal(data.classes[0]?.schoolId, "school-1");
  assert.equal(data.classes[0]?.classCode, "S3A-2026");
  assert.equal(data.classes[0]?.curriculumTrack, "US_CA_MATH");
  assert.deepEqual(data.classes[0]?.curriculumProfile, {
    region: "US",
    publisher: "US_CA_MATH"
  });
  assert.equal(data.classes[0]?.academicYear, "2026-2027");
  assert.deepEqual(data.classes[0]?.description, {
    en: "Algebra readiness",
    zh: "代數準備"
  });
  assert.equal(data.classes[0]?.studentCount, 1);
  assert.equal(data.classes[0]?.inviteCode, "INVITE-S3A");
  assert.equal(data.classes[0]?.createdAt, "2026-06-18T08:00:00.000Z");
  assert.equal(data.classes[0]?.updatedAt, "2026-06-19T08:00:00.000Z");
  assert.deepEqual(data.assignments.map((item) => item.assignment.id), ["assignment-1"]);
});

test("student activity persistence creates and replies to student message threads", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    teacher_classes: [
      {
        id: "class-1",
        teacher_id: "teacher-1",
        name: "S3A",
        grade: "S3",
        curriculum_track: "US_CA_MATH",
        curriculum_region: "US",
        textbook_publisher: "US_CA_MATH"
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-1",
        student_id: "student-1"
      }
    ],
    assignments: [
      {
        id: "assignment-1",
        class_id: "class-1",
        content_type: "practice",
        target_id: "topic-1"
      }
    ],
    topics: [
      {
        id: "topic-allowed",
        curriculum_track: "US_CA_MATH",
        curriculum_region: "US",
        textbook_publisher: "US_CA_MATH",
        grade: "S3",
        title_en: "Allowed",
        title_zh: "Allowed",
        description_en: "",
        description_zh: "",
        difficulty: "Medium",
        minutes: 10,
        sort_order: 1
      },
      {
        id: "topic-blocked",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Blocked",
        title_zh: "Blocked",
        description_en: "",
        description_zh: "",
        difficulty: "Medium",
        minutes: 10,
        sort_order: 2
      }
    ],
    teacher_messages: [],
    teacher_message_entries: []
  };
  let idCounter = 0;
  const store = createTestStore(database, {
    createId: () => `generated-${++idCounter}`
  });

  const created = await store.createStudentMessageThread({
    studentId: "student-1",
    classId: "class-1",
    assignmentId: "assignment-1",
    topicId: "topic-allowed",
    subject: "  Need help  ",
    body: "  Can we review this?  ",
    priority: "urgent"
  });

  assert.equal(created.status, "created");
  assert.equal(created.status === "created" ? created.thread.id : null, "message-thread-generated-1");
  assert.equal(database.teacher_messages?.[0]?.assignment_id, "assignment-1");
  assert.equal(database.teacher_messages?.[0]?.topic_id, "topic-allowed");
  assert.equal(database.teacher_messages?.[0]?.latest_message, "Can we review this?");
  assert.equal(database.teacher_message_entries?.at(-1)?.id, "message-entry-generated-2");
  assert.equal(database.teacher_message_entries?.at(-1)?.recipient_id, "teacher-1");

  const reply = await store.replyToStudentMessageThread({
    studentId: "student-1",
    threadId: "message-thread-generated-1",
    body: "  Adding my working.  "
  });

  assert.equal(reply.status, "sent");
  assert.equal(database.teacher_messages?.[0]?.status, "unread");
  assert.equal(database.teacher_messages?.[0]?.latest_message, "Adding my working.");
  assert.equal(database.teacher_message_entries?.at(-1)?.id, "message-entry-generated-3");
  assert.equal(database.teacher_message_entries?.at(-1)?.sender_role, "student");

  const createdWithoutValidTopic = await store.createStudentMessageThread({
    studentId: "student-1",
    classId: "class-1",
    assignmentId: "missing-assignment",
    topicId: "topic-blocked",
    subject: "Another thread",
    body: "Body"
  });
  assert.equal(createdWithoutValidTopic.status, "created");
  assert.equal(database.teacher_messages?.[0]?.assignment_id, undefined);
  assert.equal(database.teacher_messages?.[0]?.topic_id, undefined);

  assert.deepEqual(await store.createStudentMessageThread({
    studentId: "student-1",
    subject: "",
    body: "Body"
  }), { status: "invalid" });
  assert.deepEqual(await store.createStudentMessageThread({
    studentId: "student-without-class",
    subject: "Subject",
    body: "Body"
  }), { status: "not-found" });
  assert.deepEqual(await store.replyToStudentMessageThread({
    studentId: "student-1",
    threadId: "message-thread-generated-1",
    body: ""
  }), { status: "invalid" });
  assert.deepEqual(await store.replyToStudentMessageThread({
    studentId: "student-2",
    threadId: "message-thread-generated-1",
    body: "Body"
  }), { status: "not-found" });
});

test("student activity persistence builds assessment detail data through projection boundary", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    assessments: [
      {
        id: "assessment-open",
        class_id: "class-1",
        title_en: "Algebra Check",
        title_zh: "代數小測",
        type: "test",
        status: "open",
        source_type: "mixed",
        source_resource_id: "resource-1",
        analysis_settings: {
          passThreshold: 65,
          excellentThreshold: 90,
          lowScoreThreshold: 35,
          borderlineRange: 4,
          scoreBands: [{ label: "Secure", min: 80, max: 100 }],
          updatedAt: "2026-06-19T12:00:00.000Z"
        },
        exam_group_id: "exam-group-1",
        exam_group_name_en: "Algebra Cycle",
        exam_group_name_zh: "代數循環",
        question_ids: ["question-1"],
        manual_questions: [
          {
            id: "manual-1",
            prompt: { en: "Explain the method", zh: "解釋方法" },
            answer: "Use inverse operations",
            points: 6
          }
        ],
        paper_sections: [
          {
            id: "section-custom",
            title: { en: " Main section ", zh: " 主要部分 ", zhHans: " 主要部分 " },
            instructions: { en: " Show working ", zh: " 寫出步驟 " },
            order: 2,
            items: [
              {
                id: "paper-item-1",
                source: "manual",
                embeddedQuestion: {
                  type: "short-answer",
                  prompt: { en: "Solve x + 2 = 5", zh: "解 x + 2 = 5" },
                  answer: "3",
                  acceptedAnswers: ["3"],
                  explanation: { en: "Subtract 2.", zh: "減 2。" },
                  topicId: "topic-1",
                  difficulty: "Medium"
                },
                points: 9.6,
                order: 3
              }
            ]
          }
        ],
        opens_at: "2026-06-19T10:00:00.000Z",
        closes_at: "2026-06-21T10:00:00.000Z",
        time_limit_minutes: 45,
        max_attempts: 2,
        randomize_question_order: true,
        show_answers_immediately: true,
        grade_weight: 20,
        created_by: "teacher-1",
        created_at: "2026-06-18T10:00:00.000Z",
        updated_at: "2026-06-19T10:00:00.000Z"
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        name: "S3A",
        grade: "S3"
      }
    ],
    class_enrollments: [
      {
        class_id: "class-1",
        student_id: "student-1"
      }
    ],
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada Student",
        grade: "S3"
      }
    ],
    assignments: [
      {
        id: "assignment-assessment-open",
        class_id: "class-1",
        title_en: "Unit Check",
        title_zh: "單元測驗",
        description_en: "Review assessment",
        description_zh: "重溫測驗",
        content_type: "assessment",
        target_id: "assessment-open",
        status: "active",
        due_at: "2026-06-22T10:00:00.000Z",
        allow_retake: true,
        show_answers: false,
        count_towards_grade: true,
        created_by: "teacher-1",
        created_at: "2026-06-18T10:00:00.000Z",
        updated_at: "2026-06-19T10:00:00.000Z"
      }
    ],
    submissions: [
      {
        id: "submission-student-1",
        assignment_id: "assignment-assessment-open",
        student_id: "student-1",
        status: "submitted",
        score: 88,
        submitted_at: "2026-06-20T09:00:00.000Z",
        graded_at: null,
        feedback_en: "Good reasoning",
        feedback_zh: "推理良好",
        updated_at: "2026-06-20T09:05:00.000Z"
      }
    ],
    assessment_submissions: []
  };
  const store = createTestStore(database, {
    createId: () => "generated-id"
  });

  const detail = await store.getStudentAssessmentDetailData("student-1", "assessment-open");

  assert.equal(detail?.assessment.id, "assessment-open");
  assert.deepEqual(detail?.assessment.title, { en: "Algebra Check", zh: "代數小測" });
  assert.equal(detail?.assessment.type, "test");
  assert.equal(detail?.assessment.sourceType, "mixed");
  assert.equal(detail?.assessment.sourceResourceId, "resource-1");
  assert.deepEqual(detail?.assessment.analysisSettings, {
    passThreshold: 65,
    excellentThreshold: 90,
    lowScoreThreshold: 35,
    borderlineRange: 4,
    scoreBands: [{ label: "Secure", min: 80, max: 100 }],
    updatedAt: "2026-06-19T12:00:00.000Z"
  });
  assert.equal(detail?.assessment.examGroupId, "exam-group-1");
  assert.deepEqual(detail?.assessment.examGroupName, {
    en: "Algebra Cycle",
    zh: "代數循環"
  });
  assert.deepEqual(detail?.assessment.questionIds, ["question-1"]);
  assert.equal(detail?.assessment.manualQuestions[0]?.id, "manual-1");
  assert.deepEqual(detail?.assessment.paperSections[0]?.title, {
    en: "Main section",
    zh: "主要部分",
    zhHans: "主要部分"
  });
  assert.equal(detail?.assessment.paperSections[0]?.items[0]?.points, 10);
  assert.equal(detail?.assessment.opensAt, "2026-06-19T10:00:00.000Z");
  assert.equal(detail?.assessment.closesAt, "2026-06-21T10:00:00.000Z");
  assert.equal(detail?.assessment.timeLimitMinutes, 45);
  assert.equal(detail?.assessment.randomizeQuestionOrder, true);
  assert.equal(detail?.assessment.gradeWeight, 20);
  assert.equal(detail?.assessment.createdBy, "teacher-1");
  assert.equal(detail?.assessment.submissionCount, 1);
  assert.equal(detail?.assessment.submittedCount, 0);
  assert.equal(detail?.className, "S3A");
  assert.equal(detail?.canSubmit, true);
  assert.equal(detail?.assignment?.assignment.id, "assignment-assessment-open");
  assert.deepEqual(detail?.assignment?.assignment.title, {
    en: "Unit Check",
    zh: "單元測驗",
    zhHans: "单元测验"
  });
  assert.equal(detail?.assignment?.assignment.submissionCount, 1);
  assert.equal(detail?.assignment?.assignment.completedCount, 1);
  assert.equal(detail?.assignment?.submission.id, "submission-student-1");
  assert.equal(detail?.assignment?.submission.studentName, "Ada Student");
  assert.equal(detail?.assignment?.className, "S3A");
  assert.equal(detail?.assignment?.classGrade, "S3");
  assert.equal(detail?.submission.id, "assessment-submission-generated-id");
  assert.equal(detail?.submission.status, "not-started");
  assert.equal(detail?.submission.studentName, "Ada Student");
  assert.equal(detail?.questionSections[0]?.id, "section-custom");
  assert.deepEqual(detail?.questionSections[0]?.title, {
    en: "Main section",
    zh: "主要部分",
    zhHans: "主要部分"
  });
  assert.deepEqual(detail?.questionSections[0]?.instructions, {
    en: "Show working",
    zh: "寫出步驟",
    zhHans: undefined
  });
  assert.equal(detail?.questionSections[0]?.questions[0]?.id, "paper-item-1");
  assert.deepEqual(detail?.questionSections[0]?.questions[0]?.prompt, {
    en: "Solve x + 2 = 5",
    zh: "解 x + 2 = 5"
  });
  assert.equal(detail?.questionSections[0]?.questions[0]?.type, "short-answer");
  assert.equal(detail?.questionSections[0]?.questions[0]?.maxPoints, 10);
  assert.equal(detail?.questionSections[0]?.questions[0]?.topicId, "topic-1");
  assert.equal(detail?.questionSections[0]?.questions[0]?.difficulty, "Medium");
  assert.equal(detail?.questionSections[0]?.questions[0]?.correctAnswer, undefined);
  assert.equal(detail?.questionSections[0]?.questions[0]?.explanation, undefined);
  assert.equal(detail?.questionSections[0]?.questions[0]?.isAnswerVisible, false);
  assert.deepEqual(database.assessment_submissions?.map((submission) => submission.id), [
    "assessment-submission-generated-id"
  ]);
});

test("student activity persistence submits assessment answers and marks linked assignment", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    assessments: [
      {
        id: "assessment-open",
        class_id: "class-1",
        status: "open",
        max_attempts: 2,
        show_answers_immediately: true,
        paper_sections: [
          {
            id: "section-1",
            title: { en: "Section 1", zh: "第一部分" },
            order: 0,
            items: [
              {
                id: "item-1",
                source: "manual",
                points: 10,
                order: 0,
                embeddedQuestion: {
                  type: "manual",
                  prompt: { en: "2 + 2", zh: "2 + 2" },
                  answer: "4",
                  acceptedAnswers: ["four"],
                  explanation: { en: "Two pairs make four.", zh: "兩組二合共四。" }
                }
              }
            ]
          }
        ]
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        name: "S3A",
        grade: "S3"
      }
    ],
    class_enrollments: [
      {
        class_id: "class-1",
        student_id: "student-1"
      }
    ],
    assessment_submissions: []
  };
  const completedAssignments: unknown[] = [];
  const store = createTestStore(database, {
    createId: () => "generated-id",
    afterSubmitAssessment: (_database, context) => {
      completedAssignments.push(context);
    }
  });

  const result = await store.submitStudentAssessment({
    userId: "student-1",
    assessmentId: "assessment-open",
    answers: [{ questionId: "item-1", answer: " 4 " }]
  });

  assert.equal(result.status, "submitted");
  assert.equal(result.status === "submitted" ? result.submission.id : null, "assessment-submission-generated-id");
  assert.equal(result.status === "submitted" ? result.submission.score : null, 10);
  assert.equal(result.status === "submitted" ? result.submission.maxScore : null, 10);
  assert.equal(database.assessment_submissions?.[0]?.attempt_number, 1);
  assert.equal(database.assessment_submissions?.[0]?.score, 10);
  assert.deepEqual(database.assessment_submissions?.[0]?.answers, [
    {
      questionId: "item-1",
      answer: "4",
      isCorrect: true,
      pointsEarned: 10,
      maxPoints: 10
    }
  ]);
  assert.deepEqual(completedAssignments, [
    {
      userId: "student-1",
      assessmentId: "assessment-open",
      submittedAt: now.toISOString(),
      score: 100,
      graded: true
    }
  ]);
});

test("student activity persistence rejects unavailable assessment detail and submissions", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    assessments: [
      {
        id: "assessment-draft",
        class_id: "class-1",
        status: "draft",
        max_attempts: 2,
        show_answers_immediately: false
      },
      {
        id: "assessment-closed",
        class_id: "class-1",
        status: "closed",
        max_attempts: 2,
        show_answers_immediately: false
      },
      {
        id: "assessment-maxed",
        class_id: "class-1",
        status: "open",
        max_attempts: 1,
        show_answers_immediately: false
      },
      {
        id: "assessment-not-open-yet",
        class_id: "class-1",
        status: "open",
        opens_at: "2026-06-21T10:00:00.000Z",
        max_attempts: 2,
        show_answers_immediately: false
      },
      {
        id: "assessment-expired",
        class_id: "class-1",
        status: "open",
        closes_at: "2026-06-19T10:00:00.000Z",
        max_attempts: 2,
        show_answers_immediately: false
      },
      {
        id: "assessment-other-class",
        class_id: "class-2",
        status: "open",
        max_attempts: 2,
        show_answers_immediately: false
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        name: "S3A",
        grade: "S3"
      },
      {
        id: "class-2",
        name: "S4A",
        grade: "S4"
      }
    ],
    class_enrollments: [
      {
        class_id: "class-1",
        student_id: "student-1"
      }
    ],
    assessment_submissions: [
      {
        id: "submission-maxed",
        assessment_id: "assessment-maxed",
        student_id: "student-1",
        status: "graded",
        attempt_number: 1,
        score: 10,
        max_score: 10,
        submitted_at: now.toISOString(),
        graded_at: now.toISOString(),
        answers: [],
        updated_at: now.toISOString()
      }
    ]
  };
  const store = createTestStore(database);

  assert.equal(await store.getStudentAssessmentDetailData("student-1", "missing"), null);
  assert.equal(await store.getStudentAssessmentDetailData("student-1", "assessment-draft"), null);
  assert.equal(await store.getStudentAssessmentDetailData("student-1", "assessment-other-class"), null);
  const maxedDetail = await store.getStudentAssessmentDetailData("student-1", "assessment-maxed");
  assert.equal(maxedDetail?.canSubmit, false);
  assert.deepEqual(maxedDetail?.unavailableReason, {
    en: "Maximum attempts reached.",
    zh: "已達可嘗試次數上限。"
  });
  const notOpenDetail = await store.getStudentAssessmentDetailData("student-1", "assessment-not-open-yet");
  assert.equal(notOpenDetail?.canSubmit, false);
  assert.deepEqual(notOpenDetail?.unavailableReason, {
    en: "This assessment is not open yet.",
    zh: "此測驗尚未開放。"
  });
  const expiredDetail = await store.getStudentAssessmentDetailData("student-1", "assessment-expired");
  assert.equal(expiredDetail?.canSubmit, false);
  assert.deepEqual(expiredDetail?.unavailableReason, {
    en: "This assessment is closed.",
    zh: "此測驗已截止。"
  });

  assert.deepEqual(await store.submitStudentAssessment({
    userId: "student-1",
    assessmentId: "missing",
    answers: []
  }), { status: "not-found" });
  assert.deepEqual(await store.submitStudentAssessment({
    userId: "student-1",
    assessmentId: "assessment-other-class",
    answers: []
  }), { status: "forbidden" });
  assert.deepEqual(await store.submitStudentAssessment({
    userId: "student-1",
    assessmentId: "assessment-closed",
    answers: []
  }), { status: "closed" });
  assert.deepEqual(await store.submitStudentAssessment({
    userId: "student-1",
    assessmentId: "assessment-not-open-yet",
    answers: []
  }), { status: "closed" });
  assert.deepEqual(await store.submitStudentAssessment({
    userId: "student-1",
    assessmentId: "assessment-expired",
    answers: []
  }), { status: "closed" });
  assert.deepEqual(await store.submitStudentAssessment({
    userId: "student-1",
    assessmentId: "assessment-maxed",
    answers: []
  }), { status: "max-attempts" });
});

test("student activity persistence resolves lesson entry targets through extracted boundary", async () => {
  const snapshotDatabase: StudentActivityPersistenceDatabase = {
    topics: [
      {
        id: "topic-snapshot",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Snapshot topic",
        title_zh: "Snapshot topic",
        description_en: "Snapshot topic",
        description_zh: "Snapshot topic",
        difficulty: "Medium",
        minutes: 20,
        sort_order: 10
      }
    ],
    lessons: [
      {
        slug: "snapshot",
        topic_id: "topic-snapshot",
        grade: "S3",
        title_en: "Snapshot lesson",
        title_zh: "Snapshot lesson",
        description_en: "Snapshot lesson",
        description_zh: "Snapshot lesson",
        difficulty: "Medium",
        estimated_minutes: 20
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-snapshot",
        lesson_slug: "snapshot",
        status: "in-progress",
        mastery: 45,
        completed_at: null,
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    attempts: [],
    mistakes: [],
    questions: [],
    learning_events: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const fastPublicDatabase: StudentActivityPersistenceDatabase = {
    topics: [
      {
        id: "topic-fast",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Fast topic",
        title_zh: "Fast topic",
        description_en: "Fast topic",
        description_zh: "Fast topic",
        difficulty: "Medium",
        minutes: 20,
        sort_order: 10
      }
    ],
    lessons: [
      {
        slug: "fast",
        topic_id: "topic-fast",
        grade: "S3",
        title_en: "Fast lesson",
        title_zh: "Fast lesson",
        description_en: "Fast lesson",
        description_zh: "Fast lesson",
        difficulty: "Medium",
        estimated_minutes: 20
      }
    ],
    lesson_progress: [],
    attempts: [],
    mistakes: [],
    questions: [],
    learning_events: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const publicDatabase: StudentActivityPersistenceDatabase = {
    topics: [
      {
        id: "topic-public",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Public topic",
        title_zh: "Public topic",
        description_en: "Public topic",
        description_zh: "Public topic",
        difficulty: "Medium",
        minutes: 20,
        sort_order: 10
      }
    ],
    lessons: [
      {
        slug: "public",
        topic_id: "topic-public",
        grade: "S3",
        title_en: "Public lesson",
        title_zh: "Public lesson",
        description_en: "Public lesson",
        description_zh: "Public lesson",
        difficulty: "Medium",
        estimated_minutes: 20
      }
    ],
    lesson_progress: [],
    attempts: [],
    mistakes: [],
    questions: [],
    learning_events: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const overrideDatabase: StudentActivityPersistenceDatabase = {
    topics: [
      {
        id: "topic-override",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Override topic",
        title_zh: "Override topic",
        description_en: "Override topic",
        description_zh: "Override topic",
        difficulty: "Medium",
        minutes: 20,
        sort_order: 10
      }
    ],
    lessons: [
      {
        slug: "override",
        topic_id: "topic-override",
        grade: "S3",
        title_en: "Override lesson",
        title_zh: "Override lesson",
        description_en: "Override lesson",
        description_zh: "Override lesson",
        difficulty: "Medium",
        estimated_minutes: 20
      }
    ],
    lesson_progress: [],
    attempts: [],
    mistakes: [],
    questions: [],
    learning_events: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const fastTarget: LessonEntryTarget = {
    href: "/student/lessons/fast",
    slug: "fast",
    grade: "S3",
    topicId: "topic-fast"
  };
  const publicTarget: LessonEntryTarget = {
    href: "/student/lessons/public",
    slug: "public",
    grade: "S3",
    topicId: "topic-public"
  };
  const snapshotTarget: LessonEntryTarget = {
    href: "/student/lessons/snapshot",
    slug: "snapshot",
    grade: "S3",
    topicId: "topic-snapshot"
  };
  const overrideTarget: LessonEntryTarget = {
    href: "/student/lessons/override",
    slug: "override",
    grade: "S3",
    topicId: "topic-override"
  };
  const calls: string[] = [];

  const fastStore = createTestStore(snapshotDatabase, {
    getFastLessonEntryTarget: async (userId, grade, curriculumTrack) => {
      calls.push(`fast:${userId}:${grade}:${String(curriculumTrack)}`);
      return fastTarget;
    },
    readPublicDatabase: () => fastPublicDatabase,
    logLessonEntryTargetPerf: (label, startedAt) => {
      calls.push(`log:${label}:${startedAt}`);
    },
    nowMs: () => 1234
  });
  assert.deepEqual(await fastStore.getLessonEntryTarget("student-1", "S3", "HK"), fastTarget);
  assert.deepEqual(calls, [
    "fast:student-1:S3:HK",
    "log:getLessonEntryTarget(fast):1234"
  ]);

  calls.length = 0;
  const fallbackStore = createTestStore(snapshotDatabase, {
    getFastLessonEntryTarget: async () => null,
    readPublicDatabase: () => publicDatabase
  });
  assert.deepEqual(await fallbackStore.getLessonEntryTarget("student-1", "S3", "HK"), publicTarget);

  calls.length = 0;
  const snapshotStore = createTestStore(snapshotDatabase, {
    getFastLessonEntryTarget: async () => undefined,
    nowMs: () => 9012
  });
  assert.deepEqual(
    await snapshotStore.getLessonEntryTarget("student-1", "S3", "HK", overrideDatabase),
    overrideTarget
  );

  calls.length = 0;
  assert.deepEqual(await snapshotStore.getLessonEntryTargetForLogin("student-1", "S3", "HK"), snapshotTarget);
});

test("lesson entry targets use the student's current unit progress", async () => {
  function progressDatabase(): StudentActivityPersistenceDatabase {
    const unitNumbers = [1, 2, 3, 4, 5];

    return {
      topics: unitNumbers.map((unitNumber) => ({
        id: `unit-${unitNumber}`,
        curriculum_track: "HK",
        grade: "S3",
        title_en: `Unit ${unitNumber}`,
        title_zh: `Unit ${unitNumber}`,
        description_en: `Unit ${unitNumber}`,
        description_zh: `Unit ${unitNumber}`,
        difficulty: "Medium",
        minutes: 20,
        sort_order: unitNumber
      })),
      lessons: unitNumbers.map((unitNumber) => ({
        slug: `lesson-unit-${unitNumber}`,
        topic_id: `unit-${unitNumber}`,
        grade: "S3",
        title_en: `Lesson unit ${unitNumber}`,
        title_zh: `Lesson unit ${unitNumber}`,
        description_en: `Lesson unit ${unitNumber}`,
        description_zh: `Lesson unit ${unitNumber}`,
        difficulty: "Medium",
        estimated_minutes: 20
      })),
      lesson_progress: [],
      attempts: [],
      mistakes: [],
      questions: [],
      learning_events: [],
      visualization_events: [],
      visualization_sessions: []
    };
  }

  const inProgressDatabase = progressDatabase();
  inProgressDatabase.lesson_progress = [
    {
      user_id: "student-1",
      topic_id: "unit-5",
      lesson_slug: "lesson-unit-5",
      status: "in-progress",
      mastery: 35,
      started_at: "2026-06-20T09:00:00.000Z",
      completed_at: null,
      duration_seconds: 90,
      checklist_state: {},
      updated_at: "2026-06-20T09:10:00.000Z"
    }
  ];

  assert.deepEqual(
    await createTestStore(inProgressDatabase).getLessonEntryTarget("student-1", "S3", "HK", inProgressDatabase),
    {
      href: "/student/lessons/lesson-unit-5",
      slug: "lesson-unit-5",
      grade: "S3",
      topicId: "unit-5"
    }
  );

  const completedThroughUnit4Database = progressDatabase();
  completedThroughUnit4Database.lesson_progress = [1, 2, 3, 4].map((unitNumber) => ({
    user_id: "student-1",
    topic_id: `unit-${unitNumber}`,
    lesson_slug: `lesson-unit-${unitNumber}`,
    status: "completed",
    mastery: 90,
    started_at: `2026-06-2${unitNumber}T09:00:00.000Z`,
    completed_at: `2026-06-2${unitNumber}T09:30:00.000Z`,
    duration_seconds: 1800,
    checklist_state: { intro: true },
    updated_at: `2026-06-2${unitNumber}T09:30:00.000Z`
  }));

  assert.deepEqual(
    await createTestStore(completedThroughUnit4Database).getLessonEntryTarget("student-1", "S3", "HK", completedThroughUnit4Database),
    {
      href: "/student/lessons/lesson-unit-5",
      slug: "lesson-unit-5",
      grade: "S3",
      topicId: "unit-5"
    }
  );
});

test("lesson entry targets fall back to public catalog when authenticated targets are stale", async () => {
  const staleDatabase: StudentActivityPersistenceDatabase = {
    topics: [
      {
        id: "topic-stale",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Stale topic",
        title_zh: "Stale topic",
        description_en: "Stale topic",
        description_zh: "Stale topic",
        difficulty: "Medium",
        minutes: 20,
        sort_order: 1
      }
    ],
    lessons: [
      {
        slug: "legacy-stale-lesson",
        topic_id: "topic-stale",
        grade: "S3",
        title_en: "Legacy stale lesson",
        title_zh: "Legacy stale lesson",
        description_en: "Legacy stale lesson",
        description_zh: "Legacy stale lesson",
        difficulty: "Medium",
        estimated_minutes: 20
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-stale",
        lesson_slug: "legacy-stale-lesson",
        status: "in-progress",
        mastery: 25,
        completed_at: null,
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    attempts: [],
    mistakes: [],
    questions: [],
    learning_events: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const publicCatalogDatabase: StudentActivityPersistenceDatabase = {
    topics: [
      {
        id: "topic-public-valid",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Public valid topic",
        title_zh: "Public valid topic",
        description_en: "Public valid topic",
        description_zh: "Public valid topic",
        difficulty: "Medium",
        minutes: 20,
        sort_order: 1
      }
    ],
    lessons: [
      {
        slug: "public-valid-lesson",
        topic_id: "topic-public-valid",
        grade: "S3",
        title_en: "Public valid lesson",
        title_zh: "Public valid lesson",
        description_en: "Public valid lesson",
        description_zh: "Public valid lesson",
        difficulty: "Medium",
        estimated_minutes: 20
      }
    ],
    lesson_progress: [],
    attempts: [],
    mistakes: [],
    questions: [],
    learning_events: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const publicCatalogTarget: LessonEntryTarget = {
    href: "/student/lessons/public-valid-lesson",
    slug: "public-valid-lesson",
    grade: "S3",
    topicId: "topic-public-valid"
  };
  const staleFastTarget: LessonEntryTarget = {
    href: "/student/lessons/legacy-stale-lesson",
    slug: "legacy-stale-lesson",
    grade: "S3",
    topicId: "topic-stale"
  };

  const databaseFallbackStore = createTestStore(staleDatabase, {
    getFastLessonEntryTarget: async () => undefined,
    readPublicDatabase: async () => publicCatalogDatabase
  });
  assert.deepEqual(await databaseFallbackStore.getLessonEntryTarget("student-1", "S3", "HK"), publicCatalogTarget);
  assert.deepEqual(await databaseFallbackStore.getLessonEntryTargetForLogin("student-1", "S3", "HK"), publicCatalogTarget);

  const fastFallbackStore = createTestStore(staleDatabase, {
    getFastLessonEntryTarget: async () => staleFastTarget,
    readPublicDatabase: async () => publicCatalogDatabase
  });
  assert.deepEqual(await fastFallbackStore.getLessonEntryTarget("student-1", "S3", "HK"), publicCatalogTarget);
  assert.deepEqual(await fastFallbackStore.getLessonEntryTargetForLogin("student-1", "S3", "HK"), publicCatalogTarget);
});

test("student activity persistence owns lesson progress lookup with lesson slug priority", async () => {
  const helpers = studentActivityPersistence as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const lesson = {
    slug: "linear-lesson",
    topic_id: "topic-linear",
    grade: "S3",
    title_en: "Linear lesson",
    title_zh: "Linear lesson",
    description_en: "Linear lesson",
    description_zh: "Linear lesson",
    difficulty: "Medium",
    estimated_minutes: 20
  } satisfies StudentActivityLessonRecord;
  const database: StudentActivityPersistenceDatabase = {
    lessons: [lesson],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-linear",
        status: "not-started",
        mastery: 20,
        completed_at: null,
        updated_at: "2026-06-20T07:00:00.000Z"
      },
      {
        user_id: "student-1",
        topic_id: "topic-linear",
        lesson_slug: "linear-lesson",
        status: "in-progress",
        mastery: 80,
        completed_at: null,
        updated_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    visualization_sessions: []
  };

  assert.equal(typeof helpers.studentActivityLessonProgressFor, "function");
  assert.match(persistenceSource, /function lessonProgressFor\(/);
  assert.match(persistenceSource, /export const studentActivityLessonProgressFor = lessonProgressFor;/);
  assert.match(rootSource, /studentActivityLessonProgressFor as lessonProgressForFromStudentActivity/);
  assert.doesNotMatch(rootSource, /function lessonProgressFor\(/);

  const lessonProgressFor = helpers.studentActivityLessonProgressFor as (
    database: StudentActivityPersistenceDatabase,
    userId: string,
    lesson: StudentActivityLessonRecord
  ) => NonNullable<StudentActivityPersistenceDatabase["lesson_progress"]>[number] | null;

  assert.equal(lessonProgressFor(database, "student-1", lesson)?.mastery, 80);
  assert.equal(lessonProgressFor(database, "student-2", lesson), null);
});

test("student activity persistence owns attempt-derived lesson progress mutation", async () => {
  const helpers = studentActivityPersistence as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const updateLessonProgressFromAttempts = helpers.studentActivityUpdateLessonProgressFromAttempts as
    | ((input: {
        database: StudentActivityPersistenceDatabase;
        userId: string;
        question: { topic_id: string };
        now: string;
        lessonSlugForTopic: (topicId: string) => string;
        questionForId: (questionId: string) => { topic_id: string } | null;
      }) => void)
    | undefined;
  const database: StudentActivityPersistenceDatabase = {
    attempts: [
      {
        id: "attempt-topic-1",
        user_id: "student-1",
        question_id: "question-topic-1",
        selected_answer: "A",
        is_correct: true,
        duration_seconds: 12,
        created_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "attempt-topic-2",
        user_id: "student-1",
        question_id: "question-topic-2",
        selected_answer: "B",
        is_correct: false,
        duration_seconds: 20,
        created_at: "2026-06-20T08:05:00.000Z"
      },
      {
        id: "attempt-other-student",
        user_id: "student-2",
        question_id: "question-topic-1",
        selected_answer: "A",
        is_correct: false,
        duration_seconds: 15,
        created_at: "2026-06-20T08:10:00.000Z"
      },
      {
        id: "attempt-existing",
        user_id: "student-1",
        question_id: "question-existing",
        selected_answer: "C",
        is_correct: true,
        duration_seconds: 18,
        created_at: "2026-06-20T08:15:00.000Z"
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-existing",
        status: "not-started",
        mastery: 5,
        started_at: null,
        completed_at: null,
        duration_seconds: undefined,
        checklist_state: undefined,
        updated_at: "2026-06-19T08:00:00.000Z"
      }
    ],
    visualization_sessions: []
  };
  const questionTopicById = new Map([
    ["question-topic-1", "topic-new"],
    ["question-topic-2", "topic-new"],
    ["question-existing", "topic-existing"]
  ]);

  assert.equal(typeof updateLessonProgressFromAttempts, "function");
  assert.match(persistenceSource, /export function studentActivityUpdateLessonProgressFromAttempts\b/);
  assert.match(rootSource, /studentActivityUpdateLessonProgressFromAttempts as updateLessonProgressFromAttemptsFromStudentActivity/);
  assert.doesNotMatch(rootSource, /function updateLessonProgressFromAttempts\b/);

  updateLessonProgressFromAttempts?.({
    database,
    userId: "student-1",
    question: { topic_id: "topic-new" },
    now: "2026-06-20T10:00:00.000Z",
    lessonSlugForTopic: (topicId) => `lesson-${topicId}`,
    questionForId: (questionId) => {
      const topicId = questionTopicById.get(questionId);
      return topicId ? { topic_id: topicId } : null;
    }
  });
  updateLessonProgressFromAttempts?.({
    database,
    userId: "student-1",
    question: { topic_id: "topic-existing" },
    now: "2026-06-20T10:30:00.000Z",
    lessonSlugForTopic: (topicId) => `lesson-${topicId}`,
    questionForId: (questionId) => {
      const topicId = questionTopicById.get(questionId);
      return topicId ? { topic_id: topicId } : null;
    }
  });

  assert.deepEqual(database.lesson_progress, [
    {
      user_id: "student-1",
      topic_id: "topic-existing",
      lesson_slug: "lesson-topic-existing",
      status: "completed",
      mastery: 88,
      started_at: "2026-06-20T10:30:00.000Z",
      completed_at: "2026-06-20T10:30:00.000Z",
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-20T10:30:00.000Z"
    },
    {
      user_id: "student-1",
      topic_id: "topic-new",
      lesson_slug: "lesson-topic-new",
      status: "in-progress",
      mastery: 49,
      started_at: "2026-06-20T10:00:00.000Z",
      completed_at: null,
      duration_seconds: null,
      checklist_state: {},
      updated_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
});

test("student activity persistence owns public question projection with seed topic title repair", async () => {
  const helpers = studentActivityPersistence as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    topics: [
      {
        id: "pep-high-s4-sets-logic",
        curriculum_track: "MAINLAND_PEP_HIGH",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_HJB",
        grade: "S4",
        title_en: "集合与常用逻辑用语",
        title_zh: "集合与常用逻辑用语",
        description_en: "Sets",
        description_zh: "集合",
        difficulty: "Low",
        minutes: 42,
        sort_order: 1
      }
    ],
    questions: [
      {
        id: "q-mainland",
        curriculum_track: "MAINLAND_PEP_HIGH",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_HJB",
        grade: "S4",
        topic_id: "pep-high-s4-sets-logic",
        difficulty: "Low",
        type: "multiple-choice",
        prompt_en: "Which symbol means element of?",
        prompt_zh: "哪个符号表示属于？",
        options: [
          { en: "∈", zh: "∈" },
          { en: "⊂", zh: "⊂" }
        ],
        answer: "∈",
        explanation_en: "The symbol ∈ means element of.",
        explanation_zh: "符号 ∈ 表示属于。"
      }
    ]
  };

  assert.equal(typeof helpers.studentActivityToPublicQuestion, "function");
  assert.match(persistenceSource, /export const studentActivityToPublicQuestion = toPublicQuestion;/);
  assert.match(rootSource, /studentActivityToPublicQuestion as toPublicQuestionFromStudentActivity/);
  assert.doesNotMatch(rootSource, /function toPublicQuestion\(/);

  const toPublicQuestion = helpers.studentActivityToPublicQuestion as (
    database: StudentActivityPersistenceDatabase,
    question: NonNullable<StudentActivityPersistenceDatabase["questions"]>[number]
  ) => { topic: { en: string; zh: string } };

  assert.deepEqual(toPublicQuestion(database, database.questions![0]).topic, {
    en: "Sets and Logic",
    zh: "集合与常用逻辑用语"
  });
});

test("student activity persistence owns topic label projection for legacy userStore", async () => {
  const helpers = studentActivityPersistence as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    topics: [
      {
        id: "topic-linear",
        curriculum_track: "HK",
        curriculum_region: "HK",
        textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
        grade: "S3",
        title_en: "Linear equations",
        title_zh: "一次方程",
        description_en: "Solve simple equations.",
        description_zh: "解簡單方程。",
        difficulty: "Low",
        minutes: 20,
        sort_order: 1
      }
    ]
  };
  const questionForTopic = {
    topic_id: "topic-linear",
    topic_title_en: "Ignored English",
    topic_title_zh: "Ignored Chinese"
  };
  const questionForSeedTopic = {
    topic_id: "pep-high-s4-sets-logic",
    topic_title_en: "Ignored seed English",
    topic_title_zh: "Ignored seed Chinese"
  };
  const questionForFallback = {
    topic_id: "topic-from-question",
    topic_title_en: "Question topic English",
    topic_title_zh: "題目主題中文"
  };

  assert.equal(typeof helpers.studentActivityTopicLabelForQuestion, "function");
  assert.match(persistenceSource, /export const studentActivityTopicLabelForQuestion = topicLabelFor;/);
  assert.match(rootSource, /studentActivityTopicLabelForQuestion as topicLabelForFromStudentActivity/);
  assert.doesNotMatch(rootSource, /function topicLabelFor\(/);

  const topicLabelForQuestion = helpers.studentActivityTopicLabelForQuestion as (
    database: StudentActivityPersistenceDatabase,
    question: { topic_id: string; topic_title_en?: string | null; topic_title_zh?: string | null }
  ) => { en: string; zh: string };

  assert.deepEqual(topicLabelForQuestion(database, questionForTopic), {
    en: "Linear equations",
    zh: "一次方程"
  });
  assert.deepEqual(topicLabelForQuestion(database, questionForSeedTopic), {
    en: "Sets and Logic",
    zh: "集合与常用逻辑用语"
  });
  assert.deepEqual(topicLabelForQuestion(database, questionForFallback), {
    en: "Question topic English",
    zh: "題目主題中文"
  });
});

test("student activity persistence owns localized topic title helper with seed topic repair", async () => {
  const helpers = studentActivityPersistence as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const topic = {
    id: "pep-high-s4-sets-logic",
    curriculum_track: "MAINLAND_PEP_HIGH",
    curriculum_region: "MAINLAND",
    textbook_publisher: "MAINLAND_HJB",
    grade: "S4",
    title_en: "集合与常用逻辑用语",
    title_zh: "集合与常用逻辑用语",
    description_en: "Sets",
    description_zh: "集合",
    difficulty: "Low",
    minutes: 42,
    sort_order: 1
  } satisfies NonNullable<StudentActivityPersistenceDatabase["topics"]>[number];

  assert.equal(typeof helpers.studentActivityLocalizedTopicTitleForRecord, "function");
  assert.match(persistenceSource, /export const studentActivityLocalizedTopicTitleForRecord = localizedTopicTitleForRecord;/);
  assert.match(rootSource, /studentActivityLocalizedTopicTitleForRecord as localizedTopicTitleForRecordFromStudentActivity/);
  assert.doesNotMatch(rootSource, /function localizedTopicTitleForRecord\(/);
  assert.doesNotMatch(rootSource, /function localizedTopic\(/);
  assert.doesNotMatch(rootSource, /function hasCjkText\(/);

  const localizedTopicTitleForRecord = helpers.studentActivityLocalizedTopicTitleForRecord as (
    topic: NonNullable<StudentActivityPersistenceDatabase["topics"]>[number]
  ) => { en: string; zh: string };

  assert.deepEqual(localizedTopicTitleForRecord(topic), {
    en: "Sets and Logic",
    zh: "集合与常用逻辑用语"
  });
});

test("student activity persistence owns indexed question and topic lookup helpers for legacy userStore", async () => {
  const helpers = studentActivityPersistence as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = {
    questions: [
      { id: "question-1", prompt_en: "first question" },
      { id: "question-1", prompt_en: "replacement question" },
      { id: "question-2", prompt_en: "other question" }
    ],
    topics: [
      { id: "topic-1", title_en: "first topic" },
      { id: "topic-1", title_en: "replacement topic" },
      { id: "topic-2", title_en: "other topic" }
    ]
  };

  assert.equal(typeof helpers.studentActivityQuestionRecordForId, "function");
  assert.equal(typeof helpers.studentActivityTopicRecordForId, "function");
  assert.match(persistenceSource, /export function studentActivityQuestionRecordForId\b/);
  assert.match(persistenceSource, /export function studentActivityTopicRecordForId\b/);
  assert.match(rootSource, /studentActivityQuestionRecordForId as questionForIdFromStudentActivity/);
  assert.match(rootSource, /studentActivityTopicRecordForId as topicRecordForIdFromStudentActivity/);
  assert.doesNotMatch(rootSource, /function questionForId\(/);
  assert.doesNotMatch(rootSource, /function topicRecordForId\(/);

  const questionForId = helpers.studentActivityQuestionRecordForId as <TQuestion extends { id: string }>(
    database: { questions?: TQuestion[] },
    questionId: string
  ) => TQuestion | undefined;
  const topicRecordForId = helpers.studentActivityTopicRecordForId as <TTopic extends { id: string }>(
    database: { topics?: TTopic[] },
    topicId: string
  ) => TTopic | undefined;

  assert.equal(questionForId(database, "question-1")?.prompt_en, "replacement question");
  assert.equal(topicRecordForId(database, "topic-1")?.title_en, "replacement topic");
  assert.equal(questionForId(database, "missing-question"), undefined);
  assert.equal(topicRecordForId(database, "missing-topic"), undefined);
});

test("student activity persistence updates lesson progress through native mutation boundary", async () => {
  const snapshotDatabase = {
    visualization_sessions: [],
    topics: [
      {
        id: "topic-linear",
        curriculum_track: "HK",
        canonical_topic_id: "canonical-linear",
        curriculum_region: "HK",
        textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
        grade: "S3",
        title_en: "Linear equations",
        title_zh: "一次方程",
        description_en: "Linear equations",
        description_zh: "一次方程",
        difficulty: "Medium",
        minutes: 20,
        sort_order: 1
      }
    ],
    lessons: [
      {
        slug: "lesson-linear",
        topic_id: "topic-linear",
        canonical_topic_id: "lesson-canonical-linear",
        curriculum_region: "HK",
        textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
        grade: "S3",
        title_en: "Linear equations",
        title_zh: "一次方程",
        description_en: "Linear equations",
        description_zh: "一次方程",
        difficulty: "Medium",
        estimated_minutes: 18
      }
    ],
    lesson_progress: []
  } as StudentActivityPersistenceDatabase & {
    lessons: Array<{ slug: string; topic_id: string; grade: string; title_en: string; title_zh: string }>;
    lesson_progress: Array<{
      user_id: string;
      topic_id: string;
      lesson_slug?: string;
      status: string;
      mastery: number;
      started_at?: string | null;
      completed_at: string | null;
      duration_seconds?: number | null;
      checklist_state?: Record<string, boolean>;
      updated_at: string;
    }>;
  };
  const calls: string[] = [];
  const store = createTestStore(snapshotDatabase, {
    afterUpdateLessonProgress: (_database, context) => {
      calls.push(`after:${context.userId}:${context.lesson.slug}:${context.firstCompletion}:${context.progress.status}`);
    }
  });

  assert.deepEqual(
    await store.updateLessonProgress({
      userId: "student-1",
      slug: "lesson-linear",
      action: "complete",
      durationSeconds: 120,
      checklistState: { intro: true, practice: true },
      curriculumTrack: "HK"
    }),
    {
      slug: "lesson-linear",
      topicId: "topic-linear",
      canonicalTopicId: "lesson-canonical-linear",
      curriculumProfile: {
        region: "HK",
        publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
      },
      region: "HK",
      publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
      grade: "S3",
      title: { en: "Linear equations", zh: "一次方程" },
      description: { en: "Linear equations", zh: "一次方程" },
      difficulty: "Medium",
      estimatedMinutes: 18,
      status: "completed",
      mastery: 100
    }
  );
  assert.equal(snapshotDatabase.lesson_progress.length, 1);
  assert.deepEqual(snapshotDatabase.lesson_progress[0], {
    user_id: "student-1",
    topic_id: "topic-linear",
    lesson_slug: "lesson-linear",
    status: "completed",
    mastery: 100,
    started_at: "2026-06-20T10:00:00.000Z",
    completed_at: "2026-06-20T10:00:00.000Z",
    duration_seconds: 120,
    checklist_state: { intro: true, practice: true },
    updated_at: "2026-06-20T10:00:00.000Z"
  });
  assert.deepEqual(calls, [
    "after:student-1:lesson-linear:true:completed"
  ]);

  assert.equal(
    await store.updateLessonProgress({
      userId: "student-1",
      slug: "lesson-linear",
      action: "update",
      checklistState: { reflection: true },
      curriculumTrack: "HK"
    })?.then((summary) => summary?.slug),
    "lesson-linear"
  );
  assert.equal(snapshotDatabase.lesson_progress.length, 1);
  assert.equal(snapshotDatabase.lesson_progress[0].status, "completed");
  assert.equal(snapshotDatabase.lesson_progress[0].duration_seconds, 120);
  assert.deepEqual(snapshotDatabase.lesson_progress[0].checklist_state, { intro: true, practice: true, reflection: true });
  assert.deepEqual(calls.slice(1), [
    "after:student-1:lesson-linear:false:completed"
  ]);
});

test("student activity persistence resolves lesson details through native read model", async () => {
  const snapshotDatabase = {
    visualization_sessions: [],
    topics: [
      {
        id: "topic-functions",
        curriculum_track: "HK",
        curriculum_region: "HK",
        textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
        canonical_topic_id: "canonical-functions",
        grade: "S3",
        title_en: "Functions",
        title_zh: "函數",
        description_en: "Understand functions",
        description_zh: "理解函數",
        difficulty: "Medium",
        minutes: 24,
        sort_order: 2
      }
    ],
    lessons: [
      {
        slug: "lesson-functions",
        topic_id: "topic-functions",
        canonical_topic_id: "lesson-canonical-functions",
        curriculum_region: "HK",
        textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
        grade: "S3",
        title_en: "Function basics",
        title_zh: "函數基礎",
        description_en: "Read input output rules",
        description_zh: "閱讀輸入輸出規則",
        difficulty: "Medium",
        estimated_minutes: 18
      }
    ],
    lesson_blocks: [
      {
        id: "block-practice",
        lesson_slug: "lesson-functions",
        type: "practice",
        title_en: "Try it",
        title_zh: "試一試",
        content_en: "Answer a check",
        content_zh: "回答檢查題",
        items: [{ en: "Use a table", zh: "使用表格" }],
        practice_question_ids: ["question-functions"],
        sort_order: 2
      },
      {
        id: "block-concept",
        lesson_slug: "lesson-functions",
        type: "concept",
        title_en: "Concept",
        title_zh: "概念",
        content_en: "A function maps inputs",
        content_zh: "函數映射輸入",
        sort_order: 1
      }
    ],
    questions: [
      {
        id: "question-functions",
        curriculum_track: "HK",
        curriculum_region: "HK",
        textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
        canonical_topic_id: "canonical-functions",
        grade: "S3",
        topic_id: "topic-functions",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "Which relation is a function?",
        prompt_zh: "哪個關係是函數？",
        options: [
          { en: "One output per input", zh: "每個輸入有一個輸出" },
          { en: "Many outputs per input", zh: "每個輸入有多個輸出" }
        ],
        answer: "One output per input",
        explanation_en: "A function has one output for each input.",
        explanation_zh: "函數每個輸入只有一個輸出。"
      },
      {
        id: "question-other",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-functions",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "Unused",
        prompt_zh: "不用",
        options: null,
        answer: "Unused",
        explanation_en: "Unused",
        explanation_zh: "不用"
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-functions",
        lesson_slug: "lesson-functions",
        status: "in-progress",
        mastery: 45,
        started_at: "2026-06-20T09:00:00.000Z",
        completed_at: null,
        duration_seconds: 300,
        checklist_state: { concept: true },
        updated_at: "2026-06-20T09:30:00.000Z"
      }
    ]
  } as StudentActivityPersistenceDatabase;
  const store = createTestStore(snapshotDatabase, {
    translateLessonTextEn: (value) => `Translated ${value}`
  });

  const detail = await store.getLessonBySlug("student-1", "lesson-functions", "HK");
  assert.equal(detail?.slug, "lesson-functions");
  assert.equal(detail?.topicId, "topic-functions");
  assert.equal(detail?.canonicalTopicId, "lesson-canonical-functions");
  assert.deepEqual(detail?.title, { en: "Translated Function basics", zh: "函數基礎" });
  assert.deepEqual(detail?.description, { en: "Translated Read input output rules", zh: "閱讀輸入輸出規則" });
  assert.equal(detail?.status, "in-progress");
  assert.equal(detail?.mastery, 45);
  assert.deepEqual(detail?.checklistState, { concept: true });
  assert.deepEqual(detail?.blocks.map((block) => block.id), ["block-concept", "block-practice"]);
  assert.deepEqual(detail?.blocks[0].title, { en: "Translated Concept", zh: "概念" });
  assert.deepEqual(detail?.blocks[1].content, { en: "Translated Answer a check", zh: "回答檢查題" });
  assert.deepEqual(detail?.blocks[1].items, [{ en: "Translated Use a table", zh: "使用表格" }]);
  assert.deepEqual(detail?.blocks[1].practiceQuestionIds, ["question-functions"]);
  assert.deepEqual(detail?.practiceQuestions.map((question) => question.id), ["question-functions"]);
  assert.deepEqual(detail?.practiceQuestions[0].topic, { en: "Functions", zh: "函數" });
  assert.deepEqual(detail?.topic, {
    id: "topic-functions",
    curriculumTrack: "HK",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
    },
    region: "HK",
    publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
    canonicalTopicId: "canonical-functions",
    grade: "S3",
    title: { en: "Functions", zh: "函數" },
    description: { en: "Understand functions", zh: "理解函數" },
    status: "in-progress",
    difficulty: "Medium",
    minutes: 24,
    mastery: 45
  });
  assert.equal(await store.getLessonBySlug("student-1", "missing-lesson", "HK"), null);
});

test("student activity persistence builds dashboard data from native tables", async () => {
  const snapshotDatabase: StudentActivityPersistenceDatabase = {
    topics: [
      {
        id: "topic-functions",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Functions",
        title_zh: "函數",
        description_en: "Understand functions",
        description_zh: "理解函數",
        difficulty: "Medium",
        minutes: 24,
        sort_order: 10
      },
      {
        id: "topic-linear",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Linear equations",
        title_zh: "一次方程",
        description_en: "Solve linear equations",
        description_zh: "解一次方程",
        difficulty: "Medium",
        minutes: 22,
        sort_order: 20
      },
      {
        id: "topic-us",
        curriculum_track: "US_CA_MATH",
        grade: "S3",
        title_en: "California topic",
        title_zh: "加州課題",
        description_en: "US curriculum topic",
        description_zh: "美國課程課題",
        difficulty: "Medium",
        minutes: 18,
        sort_order: 5
      }
    ],
    lessons: [
      {
        slug: "functions",
        topic_id: "topic-functions",
        grade: "S3",
        title_en: "Functions lesson",
        title_zh: "函數課節",
        description_en: "Lesson on functions",
        description_zh: "函數課節",
        difficulty: "Medium",
        estimated_minutes: 30
      },
      {
        slug: "linear-equations",
        topic_id: "topic-linear",
        grade: "S3",
        title_en: "Linear equations lesson",
        title_zh: "一次方程課節",
        description_en: "Lesson on linear equations",
        description_zh: "一次方程課節",
        difficulty: "Medium",
        estimated_minutes: 28
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-functions",
        lesson_slug: "functions",
        status: "in-progress",
        mastery: 45,
        completed_at: null,
        duration_seconds: 600,
        updated_at: "2026-06-19T12:00:00.000Z"
      },
      {
        user_id: "student-1",
        topic_id: "topic-linear",
        lesson_slug: "linear-equations",
        status: "completed",
        mastery: 88,
        completed_at: "2026-06-18T12:00:00.000Z",
        duration_seconds: 900,
        updated_at: "2026-06-18T12:00:00.000Z"
      }
    ],
    questions: [
      {
        id: "question-functions",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-functions",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "What is f(1)?",
        prompt_zh: "f(1) 是多少？",
        options: null,
        answer: "1",
        explanation_en: "Evaluate the function.",
        explanation_zh: "代入函數。"
      },
      {
        id: "question-linear",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-linear",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "Solve x + 1 = 2.",
        prompt_zh: "解 x + 1 = 2。",
        options: null,
        answer: "1",
        explanation_en: "Subtract 1.",
        explanation_zh: "減 1。"
      }
    ],
    attempts: [
      {
        id: "attempt-linear",
        user_id: "student-1",
        question_id: "question-linear",
        selected_answer: "1",
        is_correct: true,
        duration_seconds: 30,
        created_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "attempt-functions",
        user_id: "student-1",
        question_id: "question-functions",
        selected_answer: "0",
        is_correct: false,
        duration_seconds: 40,
        created_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    mistakes: [
      {
        user_id: "student-1",
        question_id: "question-functions",
        last_selected_answer: "0",
        correct_answer: "1",
        wrong_attempts: 1,
        first_wrong_at: "2026-06-20T09:00:00.000Z",
        last_attempt_at: "2026-06-20T09:00:00.000Z",
        mastered: false
      }
    ],
    learning_events: [],
    visualization_events: [
      {
        id: "viz-event-1",
        user_id: "student-1",
        topic_id: "topic-functions",
        source: "visualization-lab",
        created_at: "2026-06-20T10:00:00.000Z"
      }
    ],
    visualization_sessions: []
  };
  const store = createTestStore(snapshotDatabase, {
    dashboardContentUnavailableForProfile: () => ({ en: "dashboard unavailable", zh: "dashboard unavailable" })
  });

  const dashboard = await store.getDashboardData("student-1", "S3", "HK");
  assert.equal(dashboard.curriculumTrack, "HK");
  assert.equal(dashboard.overallMastery, 50);
  assert.equal(dashboard.streakDays, 1);
  assert.equal(dashboard.recommendedLesson?.id, "topic-functions");
  assert.deepEqual(dashboard.recentTopics.map((topic) => topic.id), ["topic-functions", "topic-linear"]);
  assert.deepEqual(dashboard.weakTopics.map((topic) => topic.id), ["topic-functions"]);
  assert.deepEqual(dashboard.gradeTopics.map((topic) => `${topic.id}:${topic.mastery}`), [
    "topic-functions:45",
    "topic-linear:88"
  ]);
  assert.deepEqual(dashboard.progressMetrics.map((metric) => metric.value), ["1", "50%", "1", "1"]);
  assert.deepEqual(dashboard.contentUnavailable, {
    en: "dashboard unavailable",
    zh: "dashboard unavailable"
  });
});

function dashboardDataForEmptyGradeDatabase(): StudentActivityPersistenceDatabase {
  return {
    topics: [],
    lessons: [],
    lesson_progress: [],
    questions: [],
    attempts: [],
    mistakes: [],
    learning_events: [],
    visualization_events: [],
    visualization_sessions: []
  };
}

test("student activity persistence returns stable empty dashboard data", async () => {
  const store = createTestStore(dashboardDataForEmptyGradeDatabase());

  const dashboard = await store.getDashboardData("student-1", "S3", "HK");
  assert.equal(dashboard.curriculumTrack, "HK");
  assert.equal(dashboard.overallMastery, 0);
  assert.equal(dashboard.streakDays, 0);
  assert.equal(dashboard.recommendedLesson, null);
  assert.deepEqual(dashboard.gradeTopics, []);
  assert.deepEqual(dashboard.recentTopics, []);
  assert.deepEqual(dashboard.weakTopics, []);
  assert.deepEqual(dashboard.progressMetrics.map((metric) => metric.value), ["0", "0%", "0", "0"]);
});

test("student activity persistence builds progress data from native tables", async () => {
  const snapshotDatabase: StudentActivityPersistenceDatabase = {
    topics: [
      {
        id: "topic-functions",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Functions",
        title_zh: "函數",
        description_en: "Understand functions",
        description_zh: "理解函數",
        difficulty: "Medium",
        minutes: 24,
        sort_order: 10
      },
      {
        id: "topic-linear",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Linear equations",
        title_zh: "一次方程",
        description_en: "Solve linear equations",
        description_zh: "解一次方程",
        difficulty: "Medium",
        minutes: 22,
        sort_order: 20
      },
      {
        id: "topic-us",
        curriculum_track: "US_CA_MATH",
        grade: "S3",
        title_en: "California topic",
        title_zh: "加州課題",
        description_en: "US curriculum topic",
        description_zh: "美國課程課題",
        difficulty: "Medium",
        minutes: 18,
        sort_order: 5
      }
    ],
    lessons: [],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-linear",
        lesson_slug: "linear-equations",
        status: "completed",
        mastery: 88,
        completed_at: "2026-06-18T12:00:00.000Z",
        duration_seconds: 900,
        updated_at: "2026-06-18T12:00:00.000Z"
      },
      {
        user_id: "student-1",
        topic_id: "topic-functions",
        lesson_slug: "functions",
        status: "in-progress",
        mastery: 45,
        completed_at: null,
        duration_seconds: 600,
        updated_at: "2026-06-19T12:00:00.000Z"
      }
    ],
    questions: [
      {
        id: "question-functions",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-functions",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "What is f(1)?",
        prompt_zh: "f(1) 是多少？",
        options: null,
        answer: "1",
        explanation_en: "Evaluate the function.",
        explanation_zh: "代入函數。"
      },
      {
        id: "question-linear",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-linear",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "Solve x + 1 = 2.",
        prompt_zh: "解 x + 1 = 2。",
        options: null,
        answer: "1",
        explanation_en: "Subtract 1.",
        explanation_zh: "減 1。"
      }
    ],
    attempts: [
      {
        id: "attempt-linear",
        user_id: "student-1",
        question_id: "question-linear",
        selected_answer: "1",
        is_correct: true,
        duration_seconds: 30,
        created_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "attempt-functions",
        user_id: "student-1",
        question_id: "question-functions",
        selected_answer: "0",
        is_correct: false,
        duration_seconds: 40,
        created_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    mistakes: [
      {
        user_id: "student-1",
        question_id: "question-functions",
        last_selected_answer: "0",
        correct_answer: "1",
        wrong_attempts: 1,
        first_wrong_at: "2026-06-20T09:00:00.000Z",
        last_attempt_at: "2026-06-20T09:00:00.000Z",
        mastered: false
      }
    ],
    learning_events: [
      {
        id: "event-viz",
        user_id: "student-1",
        type: "visualization-complete",
        source: "visualization-lab",
        grade: "S3",
        topic_id: "topic-functions",
        created_at: "2026-06-19T13:00:00.000Z"
      },
      {
        id: "event-study",
        user_id: "student-1",
        type: "page-view",
        source: "lesson",
        grade: "S3",
        topic_id: "topic-functions",
        created_at: "2026-06-20T10:00:00.000Z"
      }
    ],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createTestStore(snapshotDatabase, {
    contentUnavailableForProfile: () => ({ en: "progress unavailable", zh: "progress unavailable" })
  });

  const progress = await store.getProgressData("student-1", "S3", "3d", "HK");
  assert.equal(progress.curriculumTrack, "HK");
  assert.deepEqual(progress.progressMetrics.map((metric) => metric.value), ["1", "50%", "1", "1"]);
  assert.deepEqual(progress.weeklyActivity.map((day) => day.minutes), [15, 10, 1]);
  assert.equal(progress.totalMinutes, 26);
  assert.deepEqual(progress.masteryAreas.map((area) => `${area.label.en}:${area.value}`), [
    "Functions:45",
    "Linear equations:88"
  ]);
  assert.deepEqual(progress.weakTopics.map((topic) => topic.id), ["topic-functions"]);
  assert.deepEqual(progress.recentActivity.map((item) => item.id).slice(0, 4), [
    "event-event-study",
    "attempt-attempt-functions",
    "attempt-attempt-linear",
    "event-event-viz"
  ]);
  assert.deepEqual(progress.contentUnavailable, {
    en: "progress unavailable",
    zh: "progress unavailable"
  });
});

test("student activity persistence builds roadmap data from native tables", async () => {
  const snapshotDatabase: StudentActivityPersistenceDatabase = {
    topics: [
      {
        id: "topic-linear",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Linear equations",
        title_zh: "一次方程",
        description_en: "Solve linear equations",
        description_zh: "解一次方程",
        difficulty: "Medium",
        minutes: 22,
        sort_order: 20
      },
      {
        id: "topic-functions",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Functions",
        title_zh: "函數",
        description_en: "Understand functions",
        description_zh: "理解函數",
        difficulty: "Medium",
        minutes: 24,
        sort_order: 10
      },
      {
        id: "topic-us",
        curriculum_track: "US_CA_MATH",
        grade: "S3",
        title_en: "California topic",
        title_zh: "加州課題",
        description_en: "US curriculum topic",
        description_zh: "美國課程課題",
        difficulty: "Medium",
        minutes: 18,
        sort_order: 5
      }
    ],
    lessons: [
      {
        slug: "linear-equations",
        topic_id: "topic-linear",
        grade: "S3",
        title_en: "Linear equations lesson",
        title_zh: "一次方程課節",
        description_en: "Lesson on linear equations",
        description_zh: "一次方程課節",
        difficulty: "Medium",
        estimated_minutes: 28
      },
      {
        slug: "functions",
        topic_id: "topic-functions",
        grade: "S3",
        title_en: "Functions lesson",
        title_zh: "函數課節",
        description_en: "Lesson on functions",
        description_zh: "函數課節",
        difficulty: "Medium",
        estimated_minutes: 30
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-functions",
        lesson_slug: "functions",
        status: "in-progress",
        mastery: 45,
        completed_at: null,
        duration_seconds: 600,
        updated_at: "2026-06-19T12:00:00.000Z"
      },
      {
        user_id: "student-1",
        topic_id: "topic-linear",
        lesson_slug: "linear-equations",
        status: "completed",
        mastery: 88,
        completed_at: "2026-06-18T12:00:00.000Z",
        duration_seconds: 900,
        updated_at: "2026-06-18T12:00:00.000Z"
      }
    ],
    questions: [
      {
        id: "question-functions",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-functions",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "What is f(1)?",
        prompt_zh: "f(1) 是多少？",
        options: null,
        answer: "1",
        explanation_en: "Evaluate the function.",
        explanation_zh: "代入函數。"
      }
    ],
    attempts: [
      {
        id: "attempt-1",
        user_id: "student-1",
        question_id: "question-functions",
        selected_answer: "0",
        is_correct: false,
        duration_seconds: 40,
        created_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    mistakes: [],
    learning_events: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const publicDatabase: StudentActivityPersistenceDatabase = {
    topics: [
      {
        id: "topic-public",
        curriculum_track: "HK",
        grade: "P1",
        title_en: "Public counting",
        title_zh: "公開數數",
        description_en: "Public topic",
        description_zh: "公開課題",
        difficulty: "Low",
        minutes: 12,
        sort_order: 1
      }
    ],
    lessons: [],
    lesson_progress: [],
    questions: [],
    attempts: [],
    mistakes: [],
    learning_events: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createTestStore(snapshotDatabase, {
    readPublicDatabase: () => publicDatabase,
    contentUnavailableForProfile: (_profile, grade) =>
      grade === "P1" ? { en: "P1 unavailable", zh: "P1 unavailable" } : null
  });

  const roadmap = await store.getRoadmapData("student-1", "S3", "HK");
  assert.equal(roadmap.curriculumTrack, "HK");
  assert.deepEqual(roadmap.curriculumProfile, {
    region: "HK",
    publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
  });
  assert.equal(roadmap.grade, "S3");
  assert.deepEqual(roadmap.topics.map((topic) => topic.id), ["topic-functions", "topic-linear"]);
  assert.equal(roadmap.topics[0]?.status, "in-progress");
  assert.equal(roadmap.topics[0]?.mastery, 45);
  assert.deepEqual(roadmap.lessons.map((lesson) => lesson.slug), ["functions", "linear-equations"]);
  assert.equal(roadmap.recommendedLesson?.slug, "functions");
  assert.deepEqual(roadmap.recentTopics.map((topic) => topic.id), ["topic-functions"]);
  assert.deepEqual(roadmap.weakTopics.map((topic) => topic.id), ["topic-functions"]);
  assert.equal(roadmap.contentUnavailable, null);

  const publicRoadmap = await store.getRoadmapData(null, "P1", "HK");
  assert.equal(publicRoadmap.grade, "P1");
  assert.deepEqual(publicRoadmap.topics.map((topic) => topic.id), ["topic-public"]);
  assert.deepEqual(publicRoadmap.contentUnavailable, { en: "P1 unavailable", zh: "P1 unavailable" });
});

test("student activity persistence resolves adaptive decisions through extracted boundary", async () => {
  const snapshotDatabase: StudentActivityPersistenceDatabase = { visualization_sessions: [] };
  const calls: string[] = [];
  const store = createTestStore(snapshotDatabase, {
    adaptiveLearningDecision: (input) => {
      calls.push(`${input.userId}:${input.grade}:${input.topicId ?? "all"}:${String(input.curriculumTrack)}`);
      return Promise.resolve(adaptiveDecisionFixture("adaptive-decision"));
    }
  });

  assert.deepEqual(
    await store.getAdaptiveLearningDecision({
      userId: "student-1",
      grade: "S3",
      topicId: "topic-1",
      curriculumTrack: "HK"
    }),
    adaptiveDecisionFixture("adaptive-decision")
  );
  assert.deepEqual(calls, [
    "student-1:S3:topic-1:HK"
  ]);
});

test("student activity persistence refreshes adaptive recommendations through extracted boundary", async () => {
  const snapshotDatabase: StudentActivityPersistenceDatabase = { visualization_sessions: [] };
  const calls: string[] = [];
  const store = createTestStore(snapshotDatabase, {
    refreshAdaptiveLearningRecommendation: (input) => {
      calls.push(`${input.userId}:${input.grade}:${input.topicId ?? "all"}:${String(input.curriculumTrack)}`);
      return Promise.resolve({
        status: "ready" as AdaptiveLLMStatus,
        decision: adaptiveDecisionFixture("adaptive-refresh")
      });
    }
  });

  assert.deepEqual(
    await store.refreshAdaptiveLearningRecommendation({
      userId: "student-1",
      grade: "S3",
      topicId: "topic-1",
      curriculumTrack: "HK"
    }),
    {
      status: "ready",
      decision: adaptiveDecisionFixture("adaptive-refresh")
    }
  );
  assert.deepEqual(calls, [
    "student-1:S3:topic-1:HK"
  ]);
});

test("student activity persistence owns analytics activity time helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const teacherOpsOperationsSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"),
    "utf8"
  );
  const helpers = await import("@/lib/server/userStore/studentActivityPersistence");

  assert.equal(typeof helpers.eventRecordToAnalyticsEvent, "function");
  assert.equal(typeof helpers.startOfUtcDay, "function");
  assert.equal(typeof helpers.dayKey, "function");
  assert.equal(typeof helpers.hasRecordedDuration, "function");
  assert.equal(typeof helpers.isDurationlessStudyEvent, "function");
  assert.equal(typeof helpers.secondsToDisplayMinutes, "function");
  assert.equal(helpers.durationFallbackSeconds, 60);

  assert.match(persistenceSource, /export function eventRecordToAnalyticsEvent\b/);
  assert.match(persistenceSource, /export function startOfUtcDay\b/);
  assert.match(persistenceSource, /export function dayKey\b/);
  assert.match(persistenceSource, /export function hasRecordedDuration\b/);
  assert.match(persistenceSource, /export function isDurationlessStudyEvent\b/);
  assert.match(persistenceSource, /export function secondsToDisplayMinutes\b/);
  assert.match(persistenceSource, /export const durationFallbackSeconds\b/);

  assert.doesNotMatch(rootSource, /function eventRecordToAnalyticsEvent\b/);
  assert.doesNotMatch(rootSource, /function startOfUtcDay\b/);
  assert.doesNotMatch(rootSource, /function dayKey\b/);
  assert.doesNotMatch(rootSource, /function hasRecordedDuration\b/);
  assert.doesNotMatch(rootSource, /function isDurationlessStudyEvent\b/);
  assert.doesNotMatch(rootSource, /function secondsToDisplayMinutes\b/);
  assert.doesNotMatch(rootSource, /const durationFallbackSeconds\b/);
  assert.match(rootSource, /eventRecordToAnalyticsEventFromStudentActivityPersistence/);
  assert.doesNotMatch(rootSource, /startOfUtcDayFromStudentActivityPersistence/);
  assert.doesNotMatch(rootSource, /dayKeyFromStudentActivityPersistence/);
  assert.match(teacherOpsOperationsSource, /startOfUtcDay/);
  assert.match(teacherOpsOperationsSource, /dayKey/);
  assert.match(rootSource, /hasRecordedDurationFromStudentActivityPersistence/);
  assert.match(rootSource, /isDurationlessStudyEventFromStudentActivityPersistence/);
  assert.match(rootSource, /secondsToDisplayMinutesFromStudentActivityPersistence/);
  assert.match(rootSource, /durationFallbackSecondsFromStudentActivityPersistence/);

  assert.deepEqual(
    helpers.eventRecordToAnalyticsEvent({
      id: "event-1",
      user_id: "student-1",
      type: "page-view",
      source: "lesson",
      grade: "S3",
      topic_id: "topic-1",
      question_id: "question-1",
      duration_seconds: 90,
      created_at: "2026-06-20T08:15:00.000Z"
    }),
    {
      id: "event-1",
      type: "page-view",
      source: "lesson",
      timestamp: "2026-06-20T08:15:00.000Z",
      grade: "S3",
      topicId: "topic-1",
      questionId: "question-1",
      durationSeconds: 90
    }
  );
  assert.equal(helpers.startOfUtcDay(new Date("2026-06-20T12:34:56.000Z")).toISOString(), "2026-06-20T00:00:00.000Z");
  assert.equal(helpers.dayKey("2026-06-20T12:34:56.000Z"), "2026-06-20");
  assert.equal(helpers.hasRecordedDuration(90), true);
  assert.equal(helpers.hasRecordedDuration(0), false);
  assert.equal(helpers.isDurationlessStudyEvent({
    id: "event-2",
    user_id: "student-1",
    type: "page-view",
    source: "lesson",
    grade: "S3",
    topic_id: "topic-1",
    created_at: "2026-06-20T08:15:00.000Z"
  }), true);
  assert.equal(helpers.isDurationlessStudyEvent({
    id: "event-3",
    user_id: "student-1",
    type: "answer-correct",
    source: "practice",
    grade: "S3",
    topic_id: "topic-1",
    created_at: "2026-06-20T08:15:00.000Z"
  }), false);
  assert.equal(helpers.secondsToDisplayMinutes(0), 0);
  assert.equal(helpers.secondsToDisplayMinutes(30), 1);
  assert.equal(helpers.secondsToDisplayMinutes(119), 2);
});

test("student activity persistence owns student activity summary helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/studentActivityPersistence");
  const database = {
    attempts: [
      {
        id: "attempt-1",
        user_id: "student-1",
        question_id: "question-1",
        selected_answer: "A",
        is_correct: true,
        duration_seconds: 30,
        created_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "attempt-other",
        user_id: "student-2",
        question_id: "question-1",
        selected_answer: "A",
        is_correct: true,
        duration_seconds: 30,
        created_at: "2026-06-23T08:00:00.000Z"
      }
    ],
    learning_events: [
      {
        id: "event-1",
        user_id: "student-1",
        type: "page-view" as const,
        source: "lesson" as const,
        grade: "S3" as const,
        topic_id: "topic-1",
        created_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    visualization_sessions: [
      {
        user_id: "student-1",
        module_id: "coordinate-plane",
        topic_id: "topic-1",
        source: "visualization-lab" as const,
        explored: true,
        completed_at: null,
        updated_at: "2026-06-20T10:00:00.000Z"
      }
    ],
    ai_tutor_messages: [
      {
        user_id: "student-1",
        created_at: "2026-06-20T11:00:00.000Z"
      }
    ],
    submissions: [
      {
        assignment_id: "assignment-1",
        student_id: "student-1",
        updated_at: "2026-06-20T12:00:00.000Z"
      },
      {
        assignment_id: "assignment-2",
        student_id: "student-2",
        updated_at: "2026-06-24T12:00:00.000Z"
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-1",
        status: "in-progress" as const,
        mastery: 90,
        completed_at: null,
        updated_at: "2026-06-20T12:00:00.000Z"
      },
      {
        user_id: "student-1",
        topic_id: "topic-2",
        status: "in-progress" as const,
        mastery: 60,
        completed_at: null,
        updated_at: "2026-06-20T12:00:00.000Z"
      },
      {
        user_id: "student-2",
        topic_id: "topic-1",
        status: "in-progress" as const,
        mastery: 10,
        completed_at: null,
        updated_at: "2026-06-20T12:00:00.000Z"
      }
    ]
  };

  assert.equal(typeof helpers.latestStudentActivityAt, "function");
  assert.equal(typeof helpers.studentAverageMastery, "function");
  assert.match(persistenceSource, /export function latestStudentActivityAt\b/);
  assert.match(persistenceSource, /export function studentAverageMastery\b/);
  assert.doesNotMatch(rootSource, /function latestStudentActivityAt\b/);
  assert.doesNotMatch(rootSource, /function studentAverageMastery\b/);
  assert.match(rootSource, /latestStudentActivityAtFromStudentActivity/);
  assert.match(rootSource, /studentAverageMasteryFromStudentActivity/);

  assert.equal(helpers.latestStudentActivityAt(database, "student-1"), "2026-06-20T12:00:00.000Z");
  assert.equal(helpers.latestStudentActivityAt(database, "student-3"), null);
  assert.equal(helpers.studentAverageMastery(database, "student-1", ["topic-1", "topic-2", "topic-missing"]), 50);
  assert.equal(helpers.studentAverageMastery(database, "student-1", []), 0);
});

test("student activity persistence owns roadmap helper boundary for legacy userStore", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/studentActivityPersistence") as unknown as {
    studentActivityTopicAttemptStats?: (
      database: StudentActivityPersistenceDatabase,
      userId: string
    ) => Map<string, { correct: number; wrong: number; lastAttemptAt: string }>;
    studentActivityHasPersonalRoadmapEvidence?: (
      database: StudentActivityPersistenceDatabase,
      userId: string,
      gradeTopicIds: Set<string>
    ) => boolean;
    studentActivityRoadmapSignals?: (
      database: StudentActivityPersistenceDatabase,
      userId: string | null,
      gradeTopics: Topic[]
    ) => {
      recommendedTopic: Topic | null;
      recentTopics: Topic[];
      weakTopics: Topic[];
    };
    studentActivityLessonForTopic?: (
      database: StudentActivityPersistenceDatabase,
      topicId: string
    ) => StudentActivityLessonRecord | null;
    studentActivityLessonSummaryForDatabase?: (
      database: StudentActivityPersistenceDatabase,
      userId: string | null,
      lesson: StudentActivityLessonRecord,
      translateLessonTextEn: (value: string) => string,
      seedTopic?: Pick<Topic, "status" | "mastery"> | null
    ) => LessonSummary;
  };
  const database: StudentActivityPersistenceDatabase = {
    attempts: [
      {
        id: "attempt-recent-correct",
        user_id: "student-1",
        question_id: "question-recent",
        selected_answer: "A",
        is_correct: true,
        duration_seconds: 30,
        created_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "attempt-weak-wrong",
        user_id: "student-1",
        question_id: "question-weak",
        selected_answer: "B",
        is_correct: false,
        duration_seconds: 45,
        created_at: "2026-06-20T09:00:00.000Z"
      },
      {
        id: "attempt-other-student",
        user_id: "student-2",
        question_id: "question-recent",
        selected_answer: "A",
        is_correct: true,
        duration_seconds: 30,
        created_at: "2026-06-21T09:00:00.000Z"
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-lesson",
        lesson_slug: "lesson-topic",
        status: "in-progress",
        mastery: 55,
        completed_at: null,
        duration_seconds: 120,
        updated_at: "2026-06-20T10:00:00.000Z"
      }
    ],
    lessons: [
      {
        slug: "lesson-topic",
        topic_id: "topic-lesson",
        grade: "S3",
        title_en: "Linear functions",
        title_zh: "一次函數",
        description_en: "Use slopes and intercepts.",
        description_zh: "使用斜率與截距。",
        difficulty: "Medium",
        estimated_minutes: 20
      }
    ],
    mistakes: [
      {
        user_id: "student-1",
        question_id: "question-weak",
        last_selected_answer: "B",
        correct_answer: "C",
        wrong_attempts: 2,
        first_wrong_at: "2026-06-20T08:30:00.000Z",
        last_attempt_at: "2026-06-20T09:00:00.000Z",
        mastered: false
      }
    ],
    questions: [
      {
        id: "question-recent",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-recent",
        difficulty: "Low",
        type: "multiple-choice",
        prompt_en: "Recent prompt",
        prompt_zh: "最近題目",
        options: [],
        answer: "A",
        explanation_en: "Recent explanation",
        explanation_zh: "最近解釋"
      },
      {
        id: "question-weak",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-weak",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "Weak prompt",
        prompt_zh: "薄弱題目",
        options: [],
        answer: "C",
        explanation_en: "Weak explanation",
        explanation_zh: "薄弱解釋"
      }
    ],
    topics: [
      {
        id: "topic-lesson",
        curriculum_track: "HK",
        grade: "S3",
        title_en: "Linear functions",
        title_zh: "一次函數",
        description_en: "Functions",
        description_zh: "函數",
        difficulty: "Medium",
        minutes: 20,
        sort_order: 1
      }
    ],
    visualization_sessions: []
  };
  const gradeTopics: Topic[] = [
    {
      id: "topic-weak",
      curriculumTrack: "HK",
      grade: "S3",
      title: { en: "Weak topic", zh: "薄弱課題" },
      description: { en: "Needs practice", zh: "需要練習" },
      status: "in-progress",
      difficulty: "Medium",
      minutes: 20,
      mastery: 45
    },
    {
      id: "topic-recent",
      curriculumTrack: "HK",
      grade: "S3",
      title: { en: "Recent topic", zh: "最近課題" },
      description: { en: "Recently attempted", zh: "最近作答" },
      status: "completed",
      difficulty: "Low",
      minutes: 15,
      mastery: 88
    },
    {
      id: "topic-next",
      curriculumTrack: "HK",
      grade: "S3",
      title: { en: "Next topic", zh: "下一課題" },
      description: { en: "Not started", zh: "未開始" },
      status: "not-started",
      difficulty: "Medium",
      minutes: 20,
      mastery: 0
    }
  ];

  assert.equal(typeof helpers.studentActivityTopicAttemptStats, "function");
  assert.equal(typeof helpers.studentActivityHasPersonalRoadmapEvidence, "function");
  assert.equal(typeof helpers.studentActivityRoadmapSignals, "function");
  assert.equal(typeof helpers.studentActivityLessonForTopic, "function");
  assert.equal(typeof helpers.studentActivityLessonSummaryForDatabase, "function");
  const studentActivityTopicAttemptStats = helpers.studentActivityTopicAttemptStats;
  const studentActivityHasPersonalRoadmapEvidence = helpers.studentActivityHasPersonalRoadmapEvidence;
  const studentActivityRoadmapSignals = helpers.studentActivityRoadmapSignals;
  const studentActivityLessonForTopic = helpers.studentActivityLessonForTopic;
  const studentActivityLessonSummaryForDatabase = helpers.studentActivityLessonSummaryForDatabase;
  assert.ok(studentActivityTopicAttemptStats);
  assert.ok(studentActivityHasPersonalRoadmapEvidence);
  assert.ok(studentActivityRoadmapSignals);
  assert.ok(studentActivityLessonForTopic);
  assert.ok(studentActivityLessonSummaryForDatabase);
  assert.match(persistenceSource, /export function studentActivityTopicAttemptStats\b/);
  assert.match(persistenceSource, /export function studentActivityHasPersonalRoadmapEvidence\b/);
  assert.match(persistenceSource, /export function studentActivityRoadmapSignals\b/);
  assert.match(persistenceSource, /export function studentActivityLessonForTopic\b/);
  assert.match(persistenceSource, /export function studentActivityLessonSummaryForDatabase\b/);
  assert.doesNotMatch(rootSource, /function topicAttemptStats\b/);
  assert.doesNotMatch(rootSource, /function hasPersonalRoadmapEvidence\b/);
  assert.doesNotMatch(rootSource, /function roadmapSignals\b/);
  assert.doesNotMatch(rootSource, /function lessonForTopic\b/);
  assert.doesNotMatch(rootSource, /function lessonSummaryFor\b/);
  assert.match(rootSource, /lessonForTopicFromStudentActivity/);
  assert.match(rootSource, /lessonSummaryForFromStudentActivity/);

  const stats = studentActivityTopicAttemptStats(database, "student-1");
  assert.equal(stats.get("topic-recent")?.correct, 1);
  assert.equal(stats.get("topic-weak")?.wrong, 1);
  assert.equal(stats.get("topic-weak")?.lastAttemptAt, "2026-06-20T09:00:00.000Z");
  assert.equal(studentActivityHasPersonalRoadmapEvidence(database, "student-1", new Set(["topic-weak", "topic-recent"])), true);
  assert.equal(studentActivityHasPersonalRoadmapEvidence(database, "student-3", new Set(["topic-weak", "topic-recent"])), false);

  const signals = studentActivityRoadmapSignals(database, "student-1", gradeTopics);
  assert.equal(signals.recommendedTopic?.id, "topic-weak");
  assert.deepEqual(signals.recentTopics.map((topic) => topic.id), ["topic-weak", "topic-recent"]);
  assert.deepEqual(signals.weakTopics.map((topic) => topic.id), ["topic-weak", "topic-next"]);

  const lesson = studentActivityLessonForTopic(database, "topic-lesson");
  assert.equal(lesson?.slug, "lesson-topic");
  assert.ok(lesson);
  const summary = studentActivityLessonSummaryForDatabase(
    database,
    null,
    lesson,
    (value) => `translated:${value}`,
    { status: "in-progress", mastery: 72 }
  );
  assert.equal(summary.title.en, "translated:Linear functions");
  assert.equal(summary.status, "in-progress");
  assert.equal(summary.mastery, 72);
});

test("legacy userStore delegates analytics activity operations to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getMistakes = studentActivityUserStore\.getMistakes/);
  assert.match(source, /export const markMistakeMastered = studentActivityUserStore\.markMistakeMastered/);
  assert.match(source, /export const deleteMistake = studentActivityUserStore\.deleteMistake/);
  assert.match(source, /export const clearMistakesForUser = studentActivityUserStore\.clearMistakesForUser/);
  assert.match(source, /export const appendLearningEvents = studentActivityUserStore\.appendLearningEvents/);
  assert.match(source, /export const clearLearningEventsForUser = studentActivityUserStore\.clearLearningEventsForUser/);
  assert.match(source, /export const getAnalyticsSummary = studentActivityUserStore\.getAnalyticsSummary/);
  assert.match(source, /export const getAnalyticsExport = studentActivityUserStore\.getAnalyticsExport/);
  assert.match(source, /export const markVisualizationSession = studentActivityUserStore\.markVisualizationSession/);
  assert.match(source, /export const listVisualizationSessionsForUser = studentActivityUserStore\.listVisualizationSessionsForUser/);
  assert.match(source, /export const getStudentAssignments = studentActivityUserStore\.getStudentAssignments/);
  assert.match(source, /export const getStudentResourceDetailData = studentActivityUserStore\.getStudentResourceDetailData/);
  assert.match(source, /export const getStudentResourceDownloadData = studentActivityUserStore\.getStudentResourceDownloadData/);
  assert.match(source, /export const markStudentResourceViewed = studentActivityUserStore\.markStudentResourceViewed/);
  assert.match(source, /export const getStudentAssessmentDetailData = studentActivityUserStore\.getStudentAssessmentDetailData/);
  assert.match(source, /export const submitStudentAssessment = studentActivityUserStore\.submitStudentAssessment/);
  assert.match(source, /export const submitAssignmentWork = studentActivityUserStore\.submitAssignmentWork/);
  assert.match(source, /export const getStudentMessagesData = studentActivityUserStore\.getStudentMessagesData/);
  assert.match(source, /export const createStudentMessageThread = studentActivityUserStore\.createStudentMessageThread/);
  assert.match(source, /export const replyToStudentMessageThread = studentActivityUserStore\.replyToStudentMessageThread/);
  assert.match(source, /export const getPublicQuestions = studentActivityUserStore\.getPublicQuestions/);
  assert.match(source, /export const submitQuestionAttempt = studentActivityUserStore\.submitQuestionAttempt/);
  assert.match(source, /export const updateLessonProgress = studentActivityUserStore\.updateLessonProgress/);
  assert.match(source, /export const getLessonBySlug = studentActivityUserStore\.getLessonBySlug/);
  assert.match(source, /export const getDashboardData = studentActivityUserStore\.getDashboardData/);
  assert.match(source, /export const getProgressData = studentActivityUserStore\.getProgressData/);
  assert.match(source, /export const getRoadmapData = studentActivityUserStore\.getRoadmapData/);
  assert.match(source, /export const getLessonEntryTarget = studentActivityUserStore\.getLessonEntryTarget/);
  assert.match(source, /export const getLessonEntryTargetForLogin = studentActivityUserStore\.getLessonEntryTargetForLogin/);
  assert.match(source, /export const getAdaptiveLearningDecision = studentActivityUserStore\.getAdaptiveLearningDecision/);
  assert.match(source, /export const refreshAdaptiveLearningRecommendation = studentActivityUserStore\.refreshAdaptiveLearningRecommendation/);
  assert.doesNotMatch(source, /export async function getMistakes/);
  assert.doesNotMatch(source, /export async function markMistakeMastered/);
  assert.doesNotMatch(source, /export async function deleteMistake/);
  assert.doesNotMatch(source, /export async function clearMistakesForUser/);
  assert.doesNotMatch(source, /export async function appendLearningEvents/);
  assert.doesNotMatch(source, /export async function clearLearningEventsForUser/);
  assert.doesNotMatch(source, /export async function getAnalyticsSummary/);
  assert.doesNotMatch(source, /export async function getAnalyticsExport/);
  assert.doesNotMatch(source, /export async function markVisualizationSession/);
  assert.doesNotMatch(source, /export async function getStudentAssignments/);
  assert.doesNotMatch(source, /export async function getStudentResourceDetailData/);
  assert.doesNotMatch(source, /export async function getStudentResourceDownloadData/);
  assert.doesNotMatch(source, /export async function markStudentResourceViewed/);
  assert.doesNotMatch(source, /export async function getStudentAssessmentDetailData/);
  assert.doesNotMatch(source, /export async function submitStudentAssessment/);
  assert.doesNotMatch(source, /export async function submitAssignmentWork/);
  assert.doesNotMatch(source, /export async function getStudentMessagesData/);
  assert.doesNotMatch(source, /export async function createStudentMessageThread/);
  assert.doesNotMatch(source, /export async function replyToStudentMessageThread/);
  assert.doesNotMatch(source, /export async function getPublicQuestions/);
  assert.doesNotMatch(source, /export async function submitQuestionAttempt/);
  assert.doesNotMatch(source, /export async function updateLessonProgress/);
  assert.doesNotMatch(source, /function updateLessonProgressInDatabase/);
  assert.doesNotMatch(source, /updateLessonProgressInDatabase: \(database, input\) =>/);
  assert.doesNotMatch(source, /dashboardDataFromDatabase:/);
  assert.doesNotMatch(source, /function dashboardDataFromDatabase/);
  assert.doesNotMatch(source, /progressDataFromDatabase:/);
  assert.doesNotMatch(source, /function progressDataFromDatabase/);
  assert.doesNotMatch(source, /lessonSummaryFromDatabase:/);
  assert.doesNotMatch(source, /lessonDetailFromDatabase:/);
  assert.doesNotMatch(source, /function lessonDetailFromDatabase/);
  assert.doesNotMatch(source, /lessonEntryTargetFromDatabase:/);
  assert.doesNotMatch(source, /function lessonEntryTargetFromDatabase/);
  assert.doesNotMatch(source, /roadmapDataFromDatabase:/);
  assert.doesNotMatch(source, /function roadmapDataFromDatabase/);
  const studentActivityStoreConfig = source.slice(
    source.indexOf("const studentActivityPersistenceStore = createStudentActivityPersistenceStore({"),
    source.indexOf("const authSessionPersistenceStore = createAuthSessionPersistenceStore({")
  );
  assert.doesNotMatch(studentActivityStoreConfig, /resourceDownloadPayload:/);
  assert.doesNotMatch(studentActivityStoreConfig, /resourceProjection:/);
  assert.doesNotMatch(studentActivityStoreConfig, /resourceAssignmentItem:/);
  assert.doesNotMatch(studentActivityStoreConfig, /assignmentProjection:/);
  assert.doesNotMatch(studentActivityStoreConfig, /submissionProjection:/);
  assert.doesNotMatch(studentActivityStoreConfig, /classProjection:/);
  assert.doesNotMatch(studentActivityStoreConfig, /messageProjection:/);
  assert.doesNotMatch(studentActivityStoreConfig, /messageEntryProjection:/);
  assert.doesNotMatch(studentActivityStoreConfig, /topicMatchesClass:/);
  assert.doesNotMatch(studentActivityStoreConfig, /assessmentAvailability:/);
  assert.doesNotMatch(studentActivityStoreConfig, /studentAssessmentAssignmentItem:/);
  assert.doesNotMatch(studentActivityStoreConfig, /assessmentProjection:/);
  assert.doesNotMatch(studentActivityStoreConfig, /assessmentSubmissionProjection:/);
  assert.doesNotMatch(studentActivityStoreConfig, /studentAssessmentQuestionSections:/);
  assert.doesNotMatch(studentActivityStoreConfig, /assessmentPaperItems:/);
  assert.doesNotMatch(studentActivityStoreConfig, /assessmentPaperItemMatchesAnswer:/);
  assert.doesNotMatch(source, /function studentResourceAssignmentItem/);
  assert.doesNotMatch(source, /function studentAssessmentAssignmentItem/);
  assert.doesNotMatch(source, /export async function getLessonBySlug/);
  assert.doesNotMatch(source, /export async function getDashboardData/);
  assert.doesNotMatch(source, /export async function getProgressData/);
  assert.doesNotMatch(source, /export async function getRoadmapData/);
  assert.doesNotMatch(source, /export async function getLessonEntryTarget/);
  assert.doesNotMatch(source, /export async function getLessonEntryTargetForLogin/);
  assert.doesNotMatch(source, /export async function getAdaptiveLearningDecision/);
  assert.doesNotMatch(source, /export async function refreshAdaptiveLearningRecommendation/);
});

test("student activity persistence owns student assessment paper item helpers for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"),
    "utf8"
  );

  assert.match(persistenceSource, /function assessmentPaperItemForStudent\(/);
  assert.match(persistenceSource, /function studentAssessmentQuestionSectionsForDatabase\(/);
  assert.match(persistenceSource, /function assessmentPaperItemMatchesAnswerForDatabase\(/);
  assert.match(persistenceSource, /function assessmentAvailability\(/);
  [
    "assessmentPaperItemQuestion",
    "assessmentPaperItemPrompt",
    "assessmentPaperItemCorrectAnswer",
    "assessmentPaperItemExplanation",
    "assessmentPaperItemMatchesAnswer",
    "deterministicItemOrderValue",
    "orderAssessmentSectionItems",
    "assessmentPaperItemForStudent",
    "studentAssessmentQuestionSections",
    "assessmentAvailability"
  ].forEach((helperName) => {
    assert.equal(rootSource.includes(`function ${helperName}(`), false);
  });
});

test("student activity persistence owns media object key helpers for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"),
    "utf8"
  );

  assert.match(persistenceSource, /function normalizeStoredMediaObjectKey\(/);
  assert.match(persistenceSource, /function mediaObjectUrlFromKey\(/);
  assert.match(persistenceSource, /export const studentActivityNormalizeStoredMediaObjectKey = normalizeStoredMediaObjectKey;/);
  assert.match(persistenceSource, /export const studentActivityMediaObjectUrlFromKey = mediaObjectUrlFromKey;/);
  assert.doesNotMatch(rootSource, /function normalizeStoredMediaObjectKey\(/);
  assert.doesNotMatch(rootSource, /function mediaObjectUrlFromKey\(/);
  assert.match(rootSource, /studentActivityNormalizeStoredMediaObjectKey as normalizeStoredMediaObjectKeyFromStudentActivityPersistence/);
  assert.match(rootSource, /studentActivityMediaObjectUrlFromKey as mediaObjectUrlFromKeyFromStudentActivityPersistence/);

  assert.equal(
    studentActivityPersistence.studentActivityNormalizeStoredMediaObjectKey?.("ai-tutor/student-1/image.png"),
    "ai-tutor/student-1/image.png"
  );
  assert.equal(studentActivityPersistence.studentActivityNormalizeStoredMediaObjectKey?.("../image.png"), undefined);
  assert.equal(
    studentActivityPersistence.studentActivityMediaObjectUrlFromKey?.("ai-tutor/student-1/image.png"),
    "/api/media-objects/ai-tutor/student-1/image.png"
  );
  assert.equal(studentActivityPersistence.studentActivityMediaObjectUrlFromKey?.("unsafe"), undefined);
});
