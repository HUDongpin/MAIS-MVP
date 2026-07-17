import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsLessonKitPersistenceStore,
  type TeacherOpsLessonKitPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsLessonKitPersistence";
import type {
  TeacherClass,
  TeacherLessonKit,
  TeacherLessonKitSection,
  TeacherTopicOption
} from "@/types";

type TeacherOpsLessonKitTestDatabase = TeacherOpsLessonKitPersistenceDatabase & {
  class_enrollments: Array<{
    class_id: string;
    student_id: string;
  }>;
  school_memberships: Array<{
    user_id: string;
    role: "student" | "teacher" | "parent" | "admin";
    class_id?: string;
  }>;
  teacher_classes: Array<{
    id: string;
    teacher_id: string;
    name: string;
    grade: "S2" | "S3" | "S4";
  }>;
  teacher_lesson_kits: Array<{
    id: string;
    class_id: string;
    status: "draft" | "generated" | "reviewed" | "published";
    review_status: "needs-review" | "approved" | "rejected";
    sections?: TeacherLessonKitSection[];
    source?: "deterministic" | "ai" | "manual";
    generation_notes_en?: string;
    generation_notes_zh?: string;
    published_resource_ids?: string[];
    assignment_id?: string;
    assessment_id?: string;
    live_session_id?: string;
    lesson_period?: number;
    lesson_type?: "new-lesson" | "review" | "practice" | "exam-prep";
    duration_minutes?: number;
    generated_at?: string | null;
    reviewed_at?: string | null;
    published_at?: string | null;
    updated_at: string;
    teacher_id?: string;
    topic_id?: string;
    topic_title_en?: string;
    topic_title_zh?: string;
    lesson_slug?: string;
    lesson_title_en?: string;
    lesson_title_zh?: string;
    chapter_title_en?: string;
    chapter_title_zh?: string;
  }>;
  assignments: Array<Record<string, unknown>>;
  submissions: Array<Record<string, unknown>>;
  assessments: Array<Record<string, unknown>>;
  assessment_submissions: Array<Record<string, unknown>>;
  teacher_live_sessions: Array<Record<string, unknown>>;
  teacher_live_prompts: Array<Record<string, unknown>>;
  teaching_resources: Array<Record<string, unknown>>;
  users: Array<{
    id: string;
    role: "student" | "teacher" | "parent" | "admin";
  }>;
};

const generatedAt = new Date("2026-06-21T08:30:00.000Z");

function createDatabase(): TeacherOpsLessonKitTestDatabase {
  return {
    class_enrollments: [
      { class_id: "class-owned", student_id: "student-a" },
      { class_id: "class-owned", student_id: "student-b" },
      { class_id: "class-shared", student_id: "student-shared" }
    ],
    school_memberships: [
      { user_id: "teacher-1", role: "teacher", class_id: "class-shared" }
    ],
    teacher_classes: [
      { id: "class-owned", teacher_id: "teacher-1", name: "Owned S2", grade: "S2" },
      { id: "class-shared", teacher_id: "teacher-2", name: "Shared S3", grade: "S3" },
      { id: "class-other", teacher_id: "teacher-2", name: "Other S4", grade: "S4" }
    ],
    teacher_lesson_kits: [
      {
        id: "kit-old",
        teacher_id: "teacher-1",
        class_id: "class-owned",
        grade: "S2",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_PEP",
        status: "draft",
        source: "deterministic",
        review_status: "needs-review",
        generation_notes_en: "Manual kit, awaiting teacher review.",
        generation_notes_zh: "手动备课包，待教师审核。",
        published_resource_ids: [],
        lesson_period: 1,
        lesson_type: "new-lesson",
        duration_minutes: 50,
        topic_id: "topic-kit-old",
        topic_title_en: "Linear equations",
        topic_title_zh: "一次方程",
        lesson_slug: "linear-equations-1",
        lesson_title_en: "Linear equations",
        lesson_title_zh: "一次方程",
        chapter_title_en: "Equations",
        chapter_title_zh: "方程",
        created_at: "2026-06-20T08:00:00.000Z",
        updated_at: "2026-06-20T09:00:00.000Z",
        generated_at: null,
        reviewed_at: null,
        published_at: null
      },
      {
        id: "kit-shared",
        teacher_id: "teacher-1",
        class_id: "class-shared",
        grade: "S3",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_PEP",
        status: "published",
        source: "deterministic",
        review_status: "approved",
        generation_notes_en: "Approved.",
        generation_notes_zh: "已批准。",
        published_resource_ids: ["resource-existing"],
        assignment_id: "assignment-existing",
        assessment_id: "assessment-existing",
        live_session_id: "live-existing",
        lesson_period: 1,
        lesson_type: "new-lesson",
        duration_minutes: 45,
        topic_id: "topic-kit-shared",
        topic_title_en: "Quadratics",
        topic_title_zh: "二次方程",
        lesson_title_en: "Quadratics",
        lesson_title_zh: "二次方程",
        chapter_title_en: "Functions",
        chapter_title_zh: "函数",
        created_at: "2026-06-20T11:00:00.000Z",
        updated_at: "2026-06-20T12:00:00.000Z",
        generated_at: "2026-06-20T11:30:00.000Z",
        reviewed_at: "2026-06-20T11:40:00.000Z",
        published_at: "2026-06-20T12:00:00.000Z"
      },
      {
        id: "kit-other",
        teacher_id: "teacher-2",
        class_id: "class-other",
        grade: "S4",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_PEP",
        status: "published",
        source: "deterministic",
        review_status: "approved",
        generation_notes_en: "Approved.",
        generation_notes_zh: "已批准。",
        published_resource_ids: [],
        lesson_period: 1,
        lesson_type: "new-lesson",
        duration_minutes: 45,
        topic_id: "topic-kit-other",
        topic_title_en: "Other",
        topic_title_zh: "其他",
        lesson_title_en: "Other",
        lesson_title_zh: "其他",
        chapter_title_en: "Other",
        chapter_title_zh: "其他",
        created_at: "2026-06-21T11:00:00.000Z",
        updated_at: "2026-06-21T12:00:00.000Z",
        generated_at: "2026-06-21T11:30:00.000Z",
        reviewed_at: "2026-06-21T11:40:00.000Z",
        published_at: "2026-06-21T12:00:00.000Z"
      }
    ],
    assignments: [],
    submissions: [],
    assessments: [],
    assessment_submissions: [],
    teacher_live_sessions: [
      {
        id: "live-existing-active",
        class_id: "class-owned",
        teacher_id: "teacher-1",
        status: "active",
        ended_at: null,
        updated_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    teacher_live_prompts: [],
    teaching_resources: [],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" }
    ]
  };
}

function classProjection(teacherClass: { id: string; teacher_id: string; name: string; grade: TeacherClass["grade"] }): TeacherClass {
  return {
    id: teacherClass.id,
    teacherId: teacherClass.teacher_id,
    name: teacherClass.name,
    grade: teacherClass.grade,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
    academicYear: "2026-2027",
    description: { en: teacherClass.name, zh: teacherClass.name },
    studentCount: 0,
    inviteCode: `${teacherClass.id}-invite`,
    createdAt: "2026-06-19T00:00:00.000Z",
    updatedAt: "2026-06-19T00:00:00.000Z"
  };
}

function createGeneratedSection(id = "section-ai"): TeacherLessonKitSection {
  return {
    id,
    kind: "lesson-plan",
    title: { en: "AI plan", zh: "AI 教案" },
    content: { en: "Generated by AI", zh: "AI 已生成" },
    items: [],
    order: 0
  };
}

function createPracticeSection(id = "section-practice"): TeacherLessonKitSection {
  return {
    id,
    kind: "class-practice",
    title: { en: "Practice", zh: "练习" },
    content: { en: "Practice problems", zh: "练习题" },
    items: [],
    questions: [
      {
        questionId: "question-1",
        prompt: { en: "Solve x+1=3", zh: "解 x+1=3" },
        answer: "2",
        difficulty: "Low",
        source: "question-bank",
        validationStatus: "validated"
      },
      {
        prompt: { en: "Explain your method", zh: "说明你的方法" },
        answer: "Subtract 1 from both sides.",
        explanation: { en: "Use inverse operations.", zh: "使用逆运算。" },
        difficulty: "Low",
        source: "manual",
        validationStatus: "needs-review"
      }
    ],
    order: 1
  };
}

function createTestStore(
  database: TeacherOpsLessonKitPersistenceDatabase,
  overrides: Partial<Parameters<typeof createTeacherOpsLessonKitPersistenceStore>[0]> = {}
) {
  return createTeacherOpsLessonKitPersistenceStore({
    createId: () => "generated-id",
    createResourceId: (suffix) => `resource-${suffix}`,
    mutateDatabase: async (mutator) => mutator(database),
    now: () => generatedAt,
    readDatabase: async () => database,
    resourceUploadDirectory: path.join(tmpdir(), "mais-lesson-kit-persistence-test"),
    buildInitialSections: (_database, kit) => [
      {
        id: "section-generated",
        kind: "lesson-plan",
        title: { en: kit.lesson_title_en ?? "Lesson plan", zh: kit.lesson_title_zh ?? "教案" },
        content: { en: "Generated plan", zh: "已生成教案" },
        items: [],
        order: 0
      }
    ],
    buildGenerationContext: (_database, kit) => ({ kitId: kit.id }),
    generateSectionsWithAi: async () => ({
      status: "generated",
      sections: [createGeneratedSection()],
      notesEn: "AI generated with test provider; review required.",
      notesZh: "测试 provider 已生成；需教师审核。"
    }),
    createLiveJoinCode: () => "JOIN01",
    livePromptOptionsFor: () => [
      { id: "option-1", label: { en: "Need one example", zh: "还要一个例子" } }
    ],
    normalizeSections: (sections) => sections
      .filter((section) => section.content.en.trim() || section.content.zh.trim())
      .map((section, index) => ({
        ...section,
        content: {
          en: section.content.en.trim(),
          zh: section.content.zh.trim(),
          zhHans: section.content.zhHans?.trim()
        },
        order: index
      })),
    resolveLessonKitTopic: (_database, teacherClass, topicId, publisher) => (
      topicId === `topic-${teacherClass.id}` && publisher === "MAINLAND_PEP"
        ? {
            id: topicId,
            title: { en: `Topic ${teacherClass.id}`, zh: `课题 ${teacherClass.id}` },
            lesson: {
              slug: `lesson-${teacherClass.id}`,
              title: { en: `Lesson ${teacherClass.id}`, zh: `课时 ${teacherClass.id}` }
            }
          }
        : null
    ),
    toTeacherClass: (_database, teacherClass) => classProjection(teacherClass),
    topicOptionsForClasses: (_database, classRecords): TeacherTopicOption[] => classRecords.map((teacherClass) => ({
      id: `topic-${teacherClass.id}`,
      grade: teacherClass.grade,
      title: { en: teacherClass.name, zh: teacherClass.name },
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      publisher: "MAINLAND_PEP"
    })),
    ...overrides
  });
}

test("teacher ops lesson-kit persistence owns status and source normalization helpers instead of root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLessonKitPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLessonKitPersistence.ts"), "utf8");

  const isValidTeacherLessonKitStatus = helpers.isValidTeacherLessonKitStatus;
  const normalizeTeacherLessonKitStatus = helpers.normalizeTeacherLessonKitStatus;
  const normalizeTeacherLessonKitSource = helpers.normalizeTeacherLessonKitSource;
  const normalizeTeacherLessonKitReviewStatus = helpers.normalizeTeacherLessonKitReviewStatus;
  const normalizeTeacherLessonKitLessonType = helpers.normalizeTeacherLessonKitLessonType;

  for (const [name, helper] of Object.entries({
    isValidTeacherLessonKitStatus,
    normalizeTeacherLessonKitStatus,
    normalizeTeacherLessonKitSource,
    normalizeTeacherLessonKitReviewStatus,
    normalizeTeacherLessonKitLessonType
  })) {
    assert.equal(typeof helper, "function", `${name} should be exported by teacherOpsLessonKitPersistence`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
  }

  assert.match(rootSource, /isValidTeacherLessonKitStatus as isValidTeacherLessonKitStatusFromTeacherOpsLessonKit/);
  assert.doesNotMatch(rootSource, /normalizeTeacherLessonKitStatus as normalizeTeacherLessonKitStatusFromTeacherOpsLessonKit/);
  assert.doesNotMatch(rootSource, /normalizeTeacherLessonKitSource as normalizeTeacherLessonKitSourceFromTeacherOpsLessonKit/);
  assert.doesNotMatch(rootSource, /normalizeTeacherLessonKitReviewStatus as normalizeTeacherLessonKitReviewStatusFromTeacherOpsLessonKit/);
  assert.doesNotMatch(rootSource, /normalizeTeacherLessonKitLessonType as normalizeTeacherLessonKitLessonTypeFromTeacherOpsLessonKit/);

  assert.doesNotMatch(rootSource, /const validTeacherLessonKitStatuses\b/);
  assert.doesNotMatch(rootSource, /const validTeacherLessonKitSources\b/);
  assert.doesNotMatch(rootSource, /const validTeacherLessonKitReviewStatuses\b/);
  assert.doesNotMatch(rootSource, /const validTeacherLessonKitLessonTypes\b/);
  assert.equal((isValidTeacherLessonKitStatus as (status: unknown) => boolean)("published"), true);
  assert.equal((isValidTeacherLessonKitStatus as (status: unknown) => boolean)("archived"), false);
  assert.equal((normalizeTeacherLessonKitStatus as (status: unknown) => string)("generated"), "generated");
  assert.equal((normalizeTeacherLessonKitStatus as (status: unknown) => string)("archived"), "draft");
  assert.equal((normalizeTeacherLessonKitSource as (source: unknown) => string)("ai"), "ai");
  assert.equal((normalizeTeacherLessonKitSource as (source: unknown) => string)("imported"), "manual");
  assert.equal((normalizeTeacherLessonKitReviewStatus as (status: unknown) => string)("approved"), "approved");
  assert.equal((normalizeTeacherLessonKitReviewStatus as (status: unknown) => string)("stale"), "needs-review");
  assert.equal((normalizeTeacherLessonKitLessonType as (lessonType: unknown) => string)("exam-prep"), "exam-prep");
  assert.equal((normalizeTeacherLessonKitLessonType as (lessonType: unknown) => string)("lab"), "new-lesson");
});

test("teacher ops lesson-kit persistence owns section kind validation helpers instead of root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLessonKitPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLessonKitPersistence.ts"), "utf8");

  const isValidTeacherLessonKitSectionKind = helpers.isValidTeacherLessonKitSectionKind;
  const normalizeTeacherLessonKitSectionKind = helpers.normalizeTeacherLessonKitSectionKind;

  assert.equal(typeof isValidTeacherLessonKitSectionKind, "function");
  assert.equal(typeof normalizeTeacherLessonKitSectionKind, "function");
  assert.match(helperSource, /export function isValidTeacherLessonKitSectionKind\(/);
  assert.match(helperSource, /export function normalizeTeacherLessonKitSectionKind\(/);
  assert.doesNotMatch(rootSource, /const validTeacherLessonKitSectionKinds\b/);
  assert.doesNotMatch(rootSource, /normalizeTeacherLessonKitSectionKind as normalizeTeacherLessonKitSectionKindFromTeacherOpsLessonKit/);

  assert.equal((isValidTeacherLessonKitSectionKind as (kind: unknown) => boolean)("lesson-plan"), true);
  assert.equal((isValidTeacherLessonKitSectionKind as (kind: unknown) => boolean)("poll"), false);
  assert.equal((normalizeTeacherLessonKitSectionKind as (kind: unknown) => string | null)("homework"), "homework");
  assert.equal((normalizeTeacherLessonKitSectionKind as (kind: unknown) => string | null)("poll"), null);
});

test("teacher ops lesson-kit persistence owns lesson-kit student-id resolution helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLessonKitPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLessonKitPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsLessonKitStudentIdsForClass,
    "function",
    "teacherOpsLessonKitStudentIdsForClass should be exported by teacherOpsLessonKitPersistence"
  );
  assert.match(helperSource, /export function teacherOpsLessonKitStudentIdsForClass\b/);

  const teacherOpsLessonKitStudentIdsForClass = helpers.teacherOpsLessonKitStudentIdsForClass as (
    database: TeacherOpsLessonKitPersistenceDatabase,
    classId: string
  ) => string[];

  const database = createDatabase();
  assert.deepEqual(teacherOpsLessonKitStudentIdsForClass(database, "class-owned"), ["student-a", "student-b"]);
  assert.deepEqual(teacherOpsLessonKitStudentIdsForClass(database, "class-shared"), ["student-shared"]);
  assert.deepEqual(teacherOpsLessonKitStudentIdsForClass(database, "missing-class"), []);

  assert.doesNotMatch(rootSource, /lessonKitStudentIdsForClassFromTeacherOpsLessonKit/);
  assert.doesNotMatch(rootSource, /studentIdsForClass: \(database, classId\) => teacherStudentIdsForClass\(database as Database, classId\)/);
});

test("teacher ops lesson-kit persistence owns lesson-kit assessment section builder", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLessonKitPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLessonKitPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsLessonKitAssessmentSections,
    "function",
    "teacherOpsLessonKitAssessmentSections should be exported by teacherOpsLessonKitPersistence"
  );
  assert.match(helperSource, /export function teacherOpsLessonKitAssessmentSections\b/);

  const teacherOpsLessonKitAssessmentSections = helpers.teacherOpsLessonKitAssessmentSections as (
    lessonKit: { topic_id: string; sections: TeacherLessonKitSection[] }
  ) => Array<{ id: string; title: { en: string; zh: string }; items: Array<Record<string, unknown>> }>;

  const sections = teacherOpsLessonKitAssessmentSections({
    topic_id: "topic-kit-old",
    sections: [
      createGeneratedSection("section-ignored"),
      {
        id: "section-practice",
        kind: "class-practice",
        title: { en: "Practice", zh: "练习" },
        content: { en: "Practice problems", zh: "练习题" },
        items: [],
        questions: [
          {
            questionId: "question-1",
            prompt: { en: "Solve x+1=3", zh: "解 x+1=3" },
            answer: "2",
            difficulty: "Low",
            source: "question-bank",
            validationStatus: "validated"
          },
          {
            prompt: { en: "Explain your method", zh: "说明你的方法" },
            answer: "Subtract 1 from both sides.",
            explanation: { en: "Use inverse operations.", zh: "使用逆运算。" },
            difficulty: "Low",
            source: "manual",
            validationStatus: "needs-review"
          },
          {
            prompt: { en: "", zh: "" },
            answer: "",
            difficulty: "Low",
            source: "manual",
            validationStatus: "needs-review"
          }
        ],
        order: 1
      },
      {
        id: "section-homework",
        kind: "homework",
        title: { en: "Homework", zh: "作业" },
        content: { en: "Homework problems", zh: "作业题" },
        items: [],
        questions: [
          {
            prompt: { en: "Create a similar equation.", zh: "编一道类似方程。" },
            answer: "x+2=5",
            difficulty: "Medium",
            source: "ai-generated",
            validationStatus: "needs-review"
          }
        ],
        order: 2
      }
    ]
  });

  assert.deepEqual(sections.map((section) => section.id), ["lesson-kit-class-practice", "lesson-kit-homework"]);
  assert.deepEqual(sections.map((section) => section.title.en), ["Practice", "Homework"]);
  assert.deepEqual(sections[0]?.items.map((item) => item.id), ["question-1", "kit-item-1-2"]);
  assert.deepEqual(sections[0]?.items.map((item) => item.source), ["question-bank", "manual"]);
  assert.deepEqual((sections[0]?.items[1]?.embeddedQuestion as Record<string, unknown> | undefined)?.topicId, "topic-kit-old");
  assert.deepEqual((sections[1]?.items[0]?.embeddedQuestion as Record<string, unknown> | undefined)?.source, undefined);
  assert.deepEqual((sections[1]?.items[0]?.embeddedQuestion as Record<string, unknown> | undefined)?.topicId, "topic-kit-old");

  assert.doesNotMatch(rootSource, /function lessonKitAssessmentSections\b/);
  assert.doesNotMatch(rootSource, /buildAssessmentSections: \(lessonKit\) => lessonKitAssessmentSections/);
});

test("teacher ops lesson-kit persistence owns lesson-kit projection", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLessonKitPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLessonKitPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsLessonKitProjection,
    "function",
    "teacherOpsLessonKitProjection should be exported by teacherOpsLessonKitPersistence"
  );
  assert.match(helperSource, /export function teacherOpsLessonKitProjection\b/);

  const teacherOpsLessonKitProjection = helpers.teacherOpsLessonKitProjection as (
    database: TeacherOpsLessonKitPersistenceDatabase,
    lessonKit: TeacherOpsLessonKitTestDatabase["teacher_lesson_kits"][number]
  ) => TeacherLessonKit | null;

  const database = createDatabase();
  const projected = teacherOpsLessonKitProjection(database, database.teacher_lesson_kits[0]);
  assert.equal(projected?.id, "kit-old");
  assert.equal(projected?.teacherId, "teacher-1");
  assert.equal(projected?.className, "Owned S2");
  assert.equal(projected?.grade, "S2");
  assert.deepEqual(projected?.curriculumProfile, { region: "MAINLAND", publisher: "MAINLAND_PEP" });
  assert.equal(projected?.topicId, "topic-kit-old");
  assert.deepEqual(projected?.topicTitle, {
    en: "Linear equations",
    zh: "一次方程",
    zhHans: "一次方程"
  });
  assert.equal(projected?.lessonSlug, "linear-equations-1");
  assert.deepEqual(projected?.lessonTitle, {
    en: "Linear equations",
    zh: "一次方程",
    zhHans: "一次方程"
  });
  assert.deepEqual(projected?.chapterTitle, {
    en: "Equations",
    zh: "方程",
    zhHans: "方程"
  });
  assert.equal(projected?.lessonPeriod, 1);
  assert.equal(projected?.lessonType, "new-lesson");
  assert.equal(projected?.durationMinutes, 50);
  assert.equal(projected?.status, "draft");
  assert.equal(projected?.source, "deterministic");
  assert.equal(projected?.reviewStatus, "needs-review");
  assert.deepEqual(projected?.publishedResourceIds, []);
  assert.equal(projected?.updatedAt, "2026-06-20T09:00:00.000Z");

  assert.equal(
    teacherOpsLessonKitProjection(database, { ...database.teacher_lesson_kits[0], id: "missing-class-kit", class_id: "missing-class" }),
    null
  );

  assert.doesNotMatch(rootSource, /function toTeacherLessonKit\b/);
  assert.doesNotMatch(rootSource, /toTeacherLessonKit: \(database, lessonKit\) => toTeacherLessonKit/);
});

test("teacher ops lesson-kit persistence owns lesson-kit HTML rendering", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLessonKitPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLessonKitPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsLessonKitHtml,
    "function",
    "teacherOpsLessonKitHtml should be exported by teacherOpsLessonKitPersistence"
  );
  assert.match(helperSource, /export function teacherOpsLessonKitHtml\b/);

  const teacherOpsLessonKitHtml = helpers.teacherOpsLessonKitHtml as (
    lessonKit: TeacherOpsLessonKitTestDatabase["teacher_lesson_kits"][number],
    kind: "slides" | "learning-guide" | "homework"
  ) => string;

  const database = createDatabase();
  const kit = {
    ...database.teacher_lesson_kits[0],
    lesson_title_zh: "一次方程 <导入>",
    chapter_title_zh: "方程 & 函数",
    lesson_period: 2,
    sections: [
      {
        id: "section-slides",
        kind: "slides",
        title: { en: "Slides", zh: "课件 <一>" },
        content: { en: "Explain", zh: "讲解 & 例题" },
        items: [{ en: "Observe equality", zh: "观察 \"等式\"" }],
        questions: [
          {
            prompt: { en: "Compare x < 3", zh: "比较 x < 3" },
            answer: "x < 3",
            explanation: { en: "Compare both sides", zh: "两边 & 同比" },
            source: "manual",
            validationStatus: "needs-review"
          }
        ],
        order: 0
      },
      {
        id: "section-guide",
        kind: "learning-guide",
        title: { en: "Guide", zh: "导学案" },
        content: { en: "Guide content", zh: "导学内容" },
        items: [],
        order: 1
      },
      {
        id: "section-practice",
        kind: "class-practice",
        title: { en: "Practice", zh: "练习题" },
        content: { en: "Practice content", zh: "练习内容" },
        items: [],
        order: 2
      }
    ] satisfies TeacherLessonKitSection[]
  };

  const slidesHtml = teacherOpsLessonKitHtml(kit, "slides");
  assert.equal(slidesHtml.startsWith("<!doctype html>"), true);
  assert.equal(slidesHtml.includes("<title>一次方程 &lt;导入&gt;</title>"), true);
  assert.equal(slidesHtml.includes("人教版数学 · 方程 &amp; 函数 · 第 2 课时"), true);
  assert.equal(slidesHtml.includes("<h2>课件 &lt;一&gt;</h2>"), true);
  assert.equal(slidesHtml.includes("<p>讲解 &amp; 例题</p>"), true);
  assert.equal(slidesHtml.includes("<li>观察 &quot;等式&quot;</li>"), true);
  assert.equal(slidesHtml.includes("<strong>比较 x &lt; 3</strong>"), true);
  assert.equal(slidesHtml.includes("答案：x &lt; 3"), true);
  assert.equal(slidesHtml.includes("解析：两边 &amp; 同比"), true);
  assert.equal(slidesHtml.includes("导学案"), false);
  assert.equal(slidesHtml.includes("练习题"), false);

  const guideHtml = teacherOpsLessonKitHtml(kit, "learning-guide");
  assert.equal(guideHtml.includes("导学案"), true);
  assert.equal(guideHtml.includes("课件 &lt;一&gt;"), false);
  assert.equal(guideHtml.includes("练习题"), false);

  const homeworkHtml = teacherOpsLessonKitHtml(kit, "homework");
  assert.equal(homeworkHtml.includes("练习题"), true);
  assert.equal(homeworkHtml.includes("课件 &lt;一&gt;"), false);
  assert.equal(homeworkHtml.includes("导学案"), false);

  assert.doesNotMatch(rootSource, /function lessonKitHtml\b/);
  assert.doesNotMatch(rootSource, /buildLessonKitHtml: \(lessonKit, kind\) => lessonKitHtml/);
});

test("teacher ops lesson-kit persistence owns lesson-kit resource writing", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLessonKitPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLessonKitPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.writeTeacherOpsLessonKitResource,
    "function",
    "writeTeacherOpsLessonKitResource should be exported by teacherOpsLessonKitPersistence"
  );
  assert.match(helperSource, /export async function writeTeacherOpsLessonKitResource\b/);

  const writeTeacherOpsLessonKitResource = helpers.writeTeacherOpsLessonKitResource as (input: {
    createResourceId: (suffix: string) => string;
    database: TeacherOpsLessonKitPersistenceDatabase;
    html: string;
    lessonKit: TeacherOpsLessonKitTestDatabase["teacher_lesson_kits"][number];
    now: string;
    suffix: string;
    type: "slides" | "worksheet" | "practice";
    uploadDirectory: string;
  }) => Promise<Record<string, unknown>>;

  const database = createDatabase();
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), "mais-lesson-kit-resource-"));
  const resource = await writeTeacherOpsLessonKitResource({
    createResourceId: (suffix) => `resource-${suffix}-test`,
    database,
    html: "<!doctype html><p>导学案</p>",
    lessonKit: database.teacher_lesson_kits[0],
    now: generatedAt.toISOString(),
    suffix: "guide",
    type: "worksheet",
    uploadDirectory
  });

  assert.equal(resource.id, "resource-guide-test");
  assert.equal(resource.title_en, "Linear equations guide");
  assert.equal(resource.title_zh, "一次方程导学案");
  assert.equal(resource.type, "worksheet");
  assert.equal(resource.file_name, "resource-guide-test-guide.html");
  assert.equal(resource.file_type, "HTML");
  assert.equal(resource.mime_type, "text/html; charset=utf-8");
  assert.equal(resource.file_size_bytes, Buffer.byteLength("<!doctype html><p>导学案</p>", "utf8"));
  assert.equal(resource.grade, "S2");
  assert.equal(resource.topic_id, "topic-kit-old");
  assert.equal(resource.uploaded_by, "teacher-1");
  assert.equal(resource.created_at, generatedAt.toISOString());
  assert.equal(await readFile(resource.storage_path as string, "utf8"), "<!doctype html><p>导学案</p>");
  assert.deepEqual(database.teaching_resources[0], resource);

  assert.doesNotMatch(rootSource, /async function addLessonKitResource\b/);
  assert.doesNotMatch(rootSource, /addLessonKitResource: \(database, lessonKit, type, suffix, html, now\) => addLessonKitResource/);
});

test("teacher ops lesson-kit persistence owns section normalization", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLessonKitPersistence") as Record<string, unknown>;
  assert.equal(typeof helpers.normalizeTeacherOpsLessonKitSections, "function");

  const normalizeTeacherOpsLessonKitSections =
    helpers.normalizeTeacherOpsLessonKitSections as (sections: unknown) => TeacherLessonKitSection[];

  assert.deepEqual(normalizeTeacherOpsLessonKitSections([
    {
      id: "  section-late  ",
      kind: "homework",
      title: { en: "  Homework  ", zh: "" },
      content: "  Complete the exit task  ",
      items: ["  First item  ", { en: "  Second item  ", zh: "  第二项  " }, { en: "", zh: "" }],
      questions: [
        {
          questionId: "  q-bank-1  ",
          prompt: { en: "  What is 2+3?  ", zh: "  2+3 是多少？  " },
          answer: "  5  ",
          explanation: "  Add the two numbers.  ",
          difficulty: "Foundation",
          source: "question-bank",
          validationStatus: "validated"
        },
        {
          prompt: "",
          answer: ""
        }
      ],
      estimatedMinutes: 120,
      teacherNotes: "  Differentiate for fast finishers.  ",
      order: 9
    },
    {
      id: "section-first",
      kind: "lesson-plan",
      title: "  Warm up  ",
      content: { en: "  Begin with prior knowledge.  ", zhHans: "  先回顾旧知。  " },
      estimatedMinutes: 0,
      order: 1
    },
    {
      id: "bad-section",
      kind: "poll",
      content: "ignore"
    }
  ]), [
    {
      id: "section-first",
      kind: "lesson-plan",
      title: { en: "Warm up", zh: "Warm up", zhHans: "Warm up" },
      content: { en: "Begin with prior knowledge.", zh: "先回顾旧知。", zhHans: "先回顾旧知。" },
      items: [],
      questions: [],
      estimatedMinutes: 1,
      teacherNotes: undefined,
      order: 0
    },
    {
      id: "section-late",
      kind: "homework",
      title: { en: "Homework", zh: "homework", zhHans: "homework" },
      content: { en: "Complete the exit task", zh: "Complete the exit task", zhHans: "Complete the exit task" },
      items: [
        { en: "First item", zh: "First item", zhHans: "First item" },
        { en: "Second item", zh: "第二项", zhHans: "第二项" }
      ],
      questions: [
        {
          questionId: "q-bank-1",
          prompt: { en: "What is 2+3?", zh: "2+3 是多少？", zhHans: "2+3 是多少？" },
          answer: "5",
          explanation: { en: "Add the two numbers.", zh: "Add the two numbers.", zhHans: "Add the two numbers." },
          difficulty: "Low",
          source: "question-bank",
          validationStatus: "validated"
        }
      ],
      estimatedMinutes: 90,
      teacherNotes: {
        en: "Differentiate for fast finishers.",
        zh: "Differentiate for fast finishers.",
        zhHans: "Differentiate for fast finishers."
      },
      order: 1
    }
  ]);

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.match(rootSource, /normalizeTeacherOpsLessonKitSections as normalizeLessonKitSectionsFromTeacherOpsLessonKit/);
  assert.doesNotMatch(rootSource, /function normalizeLessonKitSections\b/);
  assert.doesNotMatch(rootSource, /function normalizeTeacherLessonKitSectionQuestion\b/);
});

test("teacher ops lesson-kit persistence owns durable lesson kit record normalization", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLessonKitPersistence") as Record<string, unknown>;
  assert.equal(typeof helpers.normalizeTeacherOpsLessonKitRecord, "function");

  const normalizeTeacherOpsLessonKitRecord =
    helpers.normalizeTeacherOpsLessonKitRecord as (kit: Record<string, unknown>, now: string) => Record<string, unknown>;
  const now = "2026-06-22T01:23:45.000Z";

  assert.deepEqual(normalizeTeacherOpsLessonKitRecord({
    id: "kit-durable",
    teacher_id: "  teacher-1  ",
    class_id: "  class-1  ",
    grade: "BAD",
    textbook_publisher: "UNKNOWN",
    topic_id: "  topic-1  ",
    topic_title_en: "",
    topic_title_zh: "",
    lesson_slug: "  algebra-intro  ",
    lesson_title_en: "",
    lesson_title_zh: "",
    chapter_title_en: "",
    chapter_title_zh: "",
    lesson_period: 22,
    lesson_type: "unsupported",
    duration_minutes: 12,
    status: "archived",
    source: "spreadsheet",
    review_status: "waiting",
    generation_notes_en: "",
    generation_notes_zh: "",
    sections: [
      {
        id: "  section-1  ",
        kind: "homework",
        content: "  Practice problems  ",
        order: 5
      },
      {
        kind: "bad-kind",
        content: "ignore"
      }
    ],
    published_resource_ids: [" resource-1 ", "", "resource-2"],
    assignment_id: "",
    assessment_id: "  assessment-1  ",
    live_session_id: "  live-1  ",
    created_at: undefined,
    updated_at: undefined,
    generated_at: undefined,
    reviewed_at: undefined,
    published_at: undefined
  }, now), {
    id: "kit-durable",
    teacher_id: "teacher-1",
    class_id: "class-1",
    grade: "S1",
    curriculum_region: "MAINLAND",
    textbook_publisher: "MAINLAND_PEP",
    topic_id: "topic-1",
    topic_title_en: "  topic-1  ",
    topic_title_zh: "  topic-1  ",
    lesson_slug: "algebra-intro",
    lesson_title_en: "  topic-1  ",
    lesson_title_zh: "  topic-1  ",
    chapter_title_en: "  topic-1  ",
    chapter_title_zh: "  topic-1  ",
    lesson_period: 12,
    lesson_type: "new-lesson",
    duration_minutes: 20,
    status: "draft",
    source: "manual",
    review_status: "needs-review",
    generation_notes_en: "Manual kit, awaiting teacher review.",
    generation_notes_zh: "手动备课包，待教师审核。",
    sections: [
      {
        id: "section-1",
        kind: "homework",
        title: { en: "homework", zh: "homework", zhHans: "homework" },
        content: { en: "Practice problems", zh: "Practice problems", zhHans: "Practice problems" },
        items: [],
        questions: [],
        estimatedMinutes: undefined,
        teacherNotes: undefined,
        order: 0
      }
    ],
    published_resource_ids: [" resource-1 ", "resource-2"],
    assignment_id: undefined,
    assessment_id: "assessment-1",
    live_session_id: "live-1",
    created_at: now,
    updated_at: now,
    generated_at: null,
    reviewed_at: null,
    published_at: null
  });

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.match(rootSource, /normalizeTeacherOpsLessonKitRecord as normalizeTeacherLessonKitRecordFromTeacherOpsLessonKit/);
  assert.doesNotMatch(rootSource, /function normalizeTeacherLessonKitRecord\b/);
});

test("teacher ops lesson-kit persistence builds list data without legacy userStore imports", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const data = await store.getTeacherLessonKitListData("teacher-1");

  assert.equal(data?.generatedAt, generatedAt.toISOString());
  assert.deepEqual(data?.classes.map((teacherClass) => teacherClass.id), ["class-owned", "class-shared"]);
  assert.deepEqual(data?.topicOptions.map((topic) => topic.id), ["topic-class-owned", "topic-class-shared"]);
  assert.deepEqual(data?.kits.map((kit) => kit.id), ["kit-shared", "kit-old"]);
  assert.deepEqual(data?.totals, {
    kits: 2,
    needsReview: 1,
    published: 1,
    mainlandTopics: 2
  });

  assert.equal(await store.getTeacherLessonKitListData("student-1"), null);
});

test("teacher ops lesson-kit persistence builds create and detail data with scoped class access", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const createData = await store.getTeacherLessonKitCreateData("teacher-1");
  assert.deepEqual(createData?.classes.map((teacherClass) => teacherClass.id), ["class-owned", "class-shared"]);
  assert.deepEqual(createData?.topicOptions.map((topic) => topic.id), ["topic-class-owned", "topic-class-shared"]);
  assert.equal(await store.getTeacherLessonKitCreateData("student-1"), null);

  assert.equal((await store.getTeacherLessonKitDetailData("teacher-1", "kit-shared"))?.id, "kit-shared");
  assert.equal(await store.getTeacherLessonKitDetailData("teacher-1", "kit-other"), null);
  assert.equal((await store.getTeacherLessonKitDetailData("admin-1", "kit-other"))?.id, "kit-other");
  assert.equal(await store.getTeacherLessonKitDetailData("student-1", "kit-shared"), null);
});

test("teacher ops lesson-kit persistence creates deterministic draft kits", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.createTeacherLessonKit({
    teacherId: "teacher-1",
    classId: "class-shared",
    publisher: "MAINLAND_PEP",
    topicId: "topic-class-shared",
    lessonPeriod: 99,
    lessonType: "new-lesson",
    durationMinutes: 10
  });

  assert.equal(result.status, "created");
  assert.equal(result.status === "created" ? result.kit.id : null, "lesson-kit-generated-id");
  assert.deepEqual(database.teacher_lesson_kits[0], {
    id: "lesson-kit-generated-id",
    teacher_id: "teacher-1",
    class_id: "class-shared",
    grade: "S3",
    curriculum_region: "MAINLAND",
    textbook_publisher: "MAINLAND_PEP",
    topic_id: "topic-class-shared",
    topic_title_en: "Topic class-shared",
    topic_title_zh: "课题 class-shared",
    lesson_slug: "lesson-class-shared",
    lesson_title_en: "Lesson class-shared",
    lesson_title_zh: "课时 class-shared",
    chapter_title_en: "Topic class-shared",
    chapter_title_zh: "课题 class-shared",
    lesson_period: 12,
    lesson_type: "new-lesson",
    duration_minutes: 20,
    status: "draft",
    source: "deterministic",
    review_status: "needs-review",
    generation_notes_en: "Deterministic draft scaffold from verified lesson, topic, and question-bank data. Teacher review is required.",
    generation_notes_zh: "已基于课时、课题与已验证题库生成本地草稿骨架，需教师审核。",
    sections: [
      {
        id: "section-generated",
        kind: "lesson-plan",
        title: { en: "Lesson class-shared", zh: "课时 class-shared" },
        content: { en: "Generated plan", zh: "已生成教案" },
        items: [],
        order: 0
      }
    ],
    published_resource_ids: [],
    created_at: generatedAt.toISOString(),
    updated_at: generatedAt.toISOString(),
    generated_at: null,
    reviewed_at: null,
    published_at: null
  });
});

test("teacher ops lesson-kit persistence rejects unavailable kit creation", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  assert.deepEqual(await store.createTeacherLessonKit({
    teacherId: "student-1",
    classId: "class-owned",
    publisher: "MAINLAND_PEP",
    topicId: "topic-class-owned",
    lessonPeriod: 1,
    lessonType: "new-lesson",
    durationMinutes: 45
  }), { status: "forbidden" });
  assert.deepEqual(await store.createTeacherLessonKit({
    teacherId: "teacher-1",
    classId: "class-other",
    publisher: "MAINLAND_PEP",
    topicId: "topic-class-other",
    lessonPeriod: 1,
    lessonType: "new-lesson",
    durationMinutes: 45
  }), { status: "not-found" });
  assert.deepEqual(await store.createTeacherLessonKit({
    teacherId: "teacher-1",
    classId: "class-owned",
    publisher: "MAINLAND_PEP",
    topicId: "missing-topic",
    lessonPeriod: 1,
    lessonType: "new-lesson",
    durationMinutes: 45
  }), { status: "topic-not-found" });
  assert.deepEqual(await store.createTeacherLessonKit({
    teacherId: "teacher-1",
    classId: "class-owned",
    publisher: "HK_UNITED_PRIME_MIA",
    topicId: "topic-class-owned",
    lessonPeriod: 1,
    lessonType: "new-lesson",
    durationMinutes: 45
  }), { status: "invalid" });
  assert.deepEqual(await store.createTeacherLessonKit({
    teacherId: "teacher-1",
    classId: "class-owned",
    publisher: "MAINLAND_PEP",
    topicId: "topic-class-owned",
    lessonPeriod: 1,
    lessonType: "invalid-type" as never,
    durationMinutes: 45
  }), { status: "invalid" });
});

test("teacher ops lesson-kit persistence updates sections review status and kit status", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const sectionUpdate = await store.updateTeacherLessonKit({
    teacherId: "teacher-1",
    kitId: "kit-old",
    sections: [
      {
        id: "section-input",
        kind: "lesson-plan",
        title: { en: "Updated", zh: "已更新" },
        content: { en: "  Updated plan  ", zh: "  已更新教案  " },
        items: [],
        order: 9
      }
    ]
  });
  assert.equal(sectionUpdate.status, "updated");
  assert.deepEqual(database.teacher_lesson_kits.find((kit) => kit.id === "kit-old")?.sections, [
    {
      id: "section-input",
      kind: "lesson-plan",
      title: { en: "Updated", zh: "已更新" },
      content: { en: "Updated plan", zh: "已更新教案", zhHans: undefined },
      items: [],
      order: 0
    }
  ]);
  assert.equal(database.teacher_lesson_kits.find((kit) => kit.id === "kit-old")?.review_status, "needs-review");
  assert.equal(database.teacher_lesson_kits.find((kit) => kit.id === "kit-old")?.status, "draft");

  const approveResult = await store.updateTeacherLessonKit({
    teacherId: "teacher-1",
    kitId: "kit-old",
    reviewStatus: "approved"
  });
  assert.equal(approveResult.status, "updated");
  assert.equal(database.teacher_lesson_kits.find((kit) => kit.id === "kit-old")?.review_status, "approved");
  assert.equal(database.teacher_lesson_kits.find((kit) => kit.id === "kit-old")?.status, "reviewed");
  assert.equal(database.teacher_lesson_kits.find((kit) => kit.id === "kit-old")?.reviewed_at, generatedAt.toISOString());

  const publishedSectionResult = await store.updateTeacherLessonKit({
    teacherId: "teacher-1",
    kitId: "kit-shared",
    sections: [
      {
        id: "section-published",
        kind: "lesson-plan",
        title: { en: "Published", zh: "已发布" },
        content: { en: "Published update", zh: "已发布更新" },
        items: [],
        order: 0
      }
    ],
    status: "published"
  });
  assert.equal(publishedSectionResult.status, "updated");
  assert.equal(database.teacher_lesson_kits.find((kit) => kit.id === "kit-shared")?.status, "published");
  assert.equal(database.teacher_lesson_kits.find((kit) => kit.id === "kit-shared")?.review_status, "needs-review");
});

test("teacher ops lesson-kit persistence rejects unavailable kit updates", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  assert.deepEqual(await store.updateTeacherLessonKit({
    teacherId: "student-1",
    kitId: "kit-old",
    reviewStatus: "approved"
  }), { status: "forbidden" });
  assert.deepEqual(await store.updateTeacherLessonKit({
    teacherId: "teacher-1",
    kitId: "kit-other",
    reviewStatus: "approved"
  }), { status: "not-found" });
  assert.deepEqual(await store.updateTeacherLessonKit({
    teacherId: "teacher-1",
    kitId: "kit-old",
    reviewStatus: "not-real" as never
  }), { status: "invalid" });
  assert.deepEqual(await store.updateTeacherLessonKit({
    teacherId: "teacher-1",
    kitId: "kit-old",
    status: "not-real" as never
  }), { status: "invalid" });
  assert.deepEqual(await store.updateTeacherLessonKit({
    teacherId: "teacher-1",
    kitId: "kit-old",
    sections: [
      {
        id: "empty-section",
        kind: "lesson-plan",
        title: { en: "", zh: "" },
        content: { en: "   ", zh: "   " },
        items: [],
        order: 0
      }
    ]
  }), { status: "invalid" });
});

test("teacher ops lesson-kit persistence generates AI lesson kits through injected provider behavior", async () => {
  const database = createDatabase();
  const generatedSections = [createGeneratedSection("section-ai-main")];
  let capturedContext: unknown = null;
  const store = createTestStore(database, {
    buildGenerationContext: (_database, kit) => ({
      kitId: kit.id,
      originalStatus: kit.status
    }),
    generateSectionsWithAi: async (context) => {
      capturedContext = context;
      return {
        status: "generated",
        sections: generatedSections,
        notesEn: "AI generated with mocked provider; review required.",
        notesZh: "模拟 provider 已生成；需教师审核。"
      };
    }
  });

  const result = await store.generateTeacherLessonKitWithAI({ teacherId: "teacher-1", kitId: "kit-old" });

  assert.equal(result.status, "generated");
  assert.deepEqual(capturedContext, {
    kitId: "kit-old",
    originalStatus: "draft"
  });
  const generatedKit = database.teacher_lesson_kits.find((kit) => kit.id === "kit-old");
  assert.deepEqual(generatedKit?.sections, generatedSections);
  assert.equal(generatedKit?.status, "generated");
  assert.equal(generatedKit?.source, "ai");
  assert.equal(generatedKit?.review_status, "needs-review");
  assert.equal(generatedKit?.generated_at, generatedAt.toISOString());
  assert.equal(generatedKit?.updated_at, generatedAt.toISOString());
  assert.equal(generatedKit?.generation_notes_en, "AI generated with mocked provider; review required.");
  assert.equal(generatedKit?.generation_notes_zh, "模拟 provider 已生成；需教师审核。");
  assert.equal(result.status === "generated" ? result.kit.source : null, "ai");
  assert.equal(result.status === "generated" ? result.kit.generatedAt : null, generatedAt.toISOString());
});

test("teacher ops lesson-kit persistence rejects unavailable and invalid AI generation before provider work", async () => {
  const database = createDatabase();
  let providerCalls = 0;
  const store = createTestStore(database, {
    buildGenerationContext: () => null,
    generateSectionsWithAi: async () => {
      providerCalls += 1;
      return {
        status: "generated",
        sections: [createGeneratedSection()],
        notesEn: "Should not be used",
        notesZh: "不应使用"
      };
    }
  });

  assert.deepEqual(await store.generateTeacherLessonKitWithAI({ teacherId: "student-1", kitId: "kit-old" }), { status: "forbidden" });
  assert.deepEqual(await store.generateTeacherLessonKitWithAI({ teacherId: "teacher-1", kitId: "kit-other" }), { status: "not-found" });
  assert.deepEqual(await store.generateTeacherLessonKitWithAI({ teacherId: "teacher-1", kitId: "kit-old" }), { status: "invalid" });
  assert.equal(providerCalls, 0);
  assert.equal(database.teacher_lesson_kits.find((kit) => kit.id === "kit-old")?.status, "draft");
});

test("teacher ops lesson-kit persistence passes provider failures through without mutating the kit", async () => {
  for (const status of ["missing-config", "provider-error", "invalid-output"] as const) {
    const database = createDatabase();
    const originalKit = { ...database.teacher_lesson_kits[0] };
    const store = createTestStore(database, {
      generateSectionsWithAi: async () => ({ status })
    });

    assert.deepEqual(await store.generateTeacherLessonKitWithAI({ teacherId: "teacher-1", kitId: "kit-old" }), { status });
    assert.deepEqual(database.teacher_lesson_kits[0], originalKit);
  }
});

test("teacher ops lesson-kit persistence publishes approved kits through injected side-effect boundaries", async () => {
  const database = createDatabase();
  const kit = database.teacher_lesson_kits.find((candidate) => candidate.id === "kit-old");
  if (!kit) throw new Error("missing kit fixture");
  kit.status = "reviewed";
  kit.review_status = "approved";
  kit.sections = [createGeneratedSection("section-to-publish"), createPracticeSection("section-practice-to-publish")];
  let nextId = 0;
  const store = createTestStore(database, {
    createId: () => `id-${++nextId}`
  });

  const result = await store.publishTeacherLessonKit({ teacherId: "teacher-1", kitId: "kit-old" });

  assert.equal(result.status, "published");
  assert.deepEqual(result.status === "published" ? result.result : null, {
    resourceIds: ["resource-slides", "resource-guide", "resource-practice"],
    assignmentId: "assignment-id-1",
    assessmentId: "assessment-id-4",
    liveSessionId: "live-id-7"
  });
  assert.equal(database.teaching_resources.length, 3);
  assert.deepEqual(database.teaching_resources.map((resource) => resource.id), ["resource-practice", "resource-guide", "resource-slides"]);
  const practiceHtml = await readFile(database.teaching_resources[0]?.storage_path as string, "utf8");
  const guideHtml = await readFile(database.teaching_resources[1]?.storage_path as string, "utf8");
  const slidesHtml = await readFile(database.teaching_resources[2]?.storage_path as string, "utf8");
  assert.equal(practiceHtml.includes("<!doctype html>"), true);
  assert.equal(practiceHtml.includes("练习"), true);
  assert.equal(guideHtml.includes("<!doctype html>"), true);
  assert.equal(slidesHtml.includes("<!doctype html>"), true);
  assert.equal(database.assignments[0]?.id, "assignment-id-1");
  assert.equal(database.assignments[0]?.target_id, "resource-guide");
  assert.equal(database.assignments[0]?.due_at, "2026-06-28T08:30:00.000Z");
  assert.deepEqual(database.submissions.map((submission) => submission.id), ["submission-id-2", "submission-id-3"]);
  assert.equal(database.assessments[0]?.id, "assessment-id-4");
  assert.equal(database.assessments[0]?.source_resource_id, "resource-practice");
  assert.deepEqual(database.assessments[0]?.question_ids, ["question-1"]);
  assert.deepEqual(database.assessment_submissions.map((submission) => submission.id), ["assessment-submission-id-5", "assessment-submission-id-6"]);
  assert.equal(database.teacher_live_sessions.find((session) => session.id === "live-existing-active")?.status, "ended");
  assert.equal(database.teacher_live_sessions[0]?.id, "live-id-7");
  assert.equal(database.teacher_live_sessions[0]?.join_code, "JOIN01");
  assert.equal(database.teacher_live_prompts[0]?.id, "live-prompt-id-8");
  assert.deepEqual(kit.published_resource_ids, ["resource-slides", "resource-guide", "resource-practice"]);
  assert.equal(kit.assignment_id, "assignment-id-1");
  assert.equal(kit.assessment_id, "assessment-id-4");
  assert.equal(kit.live_session_id, "live-id-7");
  assert.equal(kit.status, "published");
  assert.equal(kit.published_at, generatedAt.toISOString());
  assert.equal(kit.updated_at, generatedAt.toISOString());
});

test("teacher ops lesson-kit persistence keeps already published kits idempotent and rejects unavailable publishes", async () => {
  const database = createDatabase();
  let resourceIdCalls = 0;
  const store = createTestStore(database, {
    createResourceId: () => {
      resourceIdCalls += 1;
      return "unexpected-resource";
    }
  });

  assert.deepEqual(await store.publishTeacherLessonKit({ teacherId: "student-1", kitId: "kit-shared" }), { status: "forbidden" });
  assert.deepEqual(await store.publishTeacherLessonKit({ teacherId: "teacher-1", kitId: "kit-other" }), { status: "not-found" });
  assert.deepEqual(await store.publishTeacherLessonKit({ teacherId: "teacher-1", kitId: "kit-old" }), { status: "needs-review" });

  const published = await store.publishTeacherLessonKit({ teacherId: "teacher-1", kitId: "kit-shared" });
  assert.equal(published.status, "published");
  assert.deepEqual(published.status === "published" ? published.result : null, {
    resourceIds: ["resource-existing"],
    assignmentId: "assignment-existing",
    assessmentId: "assessment-existing",
    liveSessionId: "live-existing"
  });
  assert.equal(resourceIdCalls, 0);
});

test("legacy userStore delegates teacher lesson-kit read models to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /createTeacherOpsLessonKitPersistenceStore/);
  assert.match(source, /export const getTeacherLessonKitListData = teacherOpsUserStore\.getTeacherLessonKitListData/);
  assert.match(source, /export const getTeacherLessonKitCreateData = teacherOpsUserStore\.getTeacherLessonKitCreateData/);
  assert.match(source, /export const getTeacherLessonKitDetailData = teacherOpsUserStore\.getTeacherLessonKitDetailData/);
  assert.match(source, /export const createTeacherLessonKit = teacherOpsUserStore\.createTeacherLessonKit/);
  assert.match(source, /export const updateTeacherLessonKit = teacherOpsUserStore\.updateTeacherLessonKit/);
  assert.match(source, /export const generateTeacherLessonKitWithAI = teacherOpsUserStore\.generateTeacherLessonKitWithAI/);
  assert.match(source, /export const publishTeacherLessonKit = teacherOpsUserStore\.publishTeacherLessonKit/);
  assert.doesNotMatch(source, /export async function getTeacherLessonKitListData/);
  assert.doesNotMatch(source, /export async function getTeacherLessonKitCreateData/);
  assert.doesNotMatch(source, /export async function getTeacherLessonKitDetailData/);
  assert.doesNotMatch(source, /export async function createTeacherLessonKit/);
  assert.doesNotMatch(source, /export async function updateTeacherLessonKit/);
  assert.doesNotMatch(source, /export async function generateTeacherLessonKitWithAI/);
  assert.doesNotMatch(source, /export async function publishTeacherLessonKit/);
});

test("teacher ops lesson-kit persistence owns mainland topic option helpers", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsLessonKitPersistence.ts"),
    "utf8"
  );
  const helpers = await import("@/lib/server/userStore/teacherOpsLessonKitPersistence") as Record<string, unknown>;
  const topicOptionFor = helpers.teacherOpsLessonKitTopicOptionFor as
    | ((topic: Record<string, unknown>) => TeacherTopicOption)
    | undefined;
  const isMainlandLessonKitTopic = helpers.teacherOpsIsMainlandLessonKitTopic as
    | ((topic: Record<string, unknown>, publisher?: string) => boolean)
    | undefined;
  const mainlandTopicOptions = helpers.teacherOpsMainlandLessonKitTopicOptions as
    | ((database: { topics: Array<Record<string, unknown>> }, classRecords: Array<{ grade: string }>) => TeacherTopicOption[])
    | undefined;
  const pepTopic = {
    id: "topic-pep-s3",
    grade: "S3",
    sort_order: 2,
    title_en: "PEP Functions",
    title_zh: "人教函数",
    curriculum_region: "MAINLAND",
    textbook_publisher: "MAINLAND_PEP"
  };
  const bnuTopic = {
    id: "topic-bnu-s2",
    grade: "S2",
    sort_order: 1,
    title_en: "BNU Equations",
    title_zh: "北师方程",
    curriculum_region: "MAINLAND",
    textbook_publisher: "MAINLAND_BNU"
  };
  const hjbTopic = {
    id: "topic-hjb-s3",
    grade: "S3",
    sort_order: 1,
    title_en: "HJB Geometry",
    title_zh: "沪教几何",
    curriculum_region: "MAINLAND",
    textbook_publisher: "MAINLAND_HJB"
  };
  const hkTopic = {
    id: "topic-hk-s3",
    grade: "S3",
    sort_order: 3,
    title_en: "HK Algebra",
    title_zh: "香港代数",
    curriculum_region: "HK",
    textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
  };

  assert.equal(typeof topicOptionFor, "function");
  assert.equal(typeof isMainlandLessonKitTopic, "function");
  assert.equal(typeof mainlandTopicOptions, "function");
  assert.match(persistenceSource, /export function teacherOpsLessonKitTopicOptionFor\b/);
  assert.match(persistenceSource, /export function teacherOpsIsMainlandLessonKitTopic\b/);
  assert.match(persistenceSource, /export function teacherOpsMainlandLessonKitTopicOptions\b/);
  assert.match(rootSource, /teacherOpsLessonKitTopicOptionFor as topicOptionForFromTeacherOpsLessonKit/);
  assert.match(rootSource, /teacherOpsIsMainlandLessonKitTopic as isMainlandLessonKitTopicFromTeacherOpsLessonKit/);
  assert.match(rootSource, /teacherOpsMainlandLessonKitTopicOptions as mainlandLessonKitTopicOptionsFromTeacherOpsLessonKit/);
  assert.doesNotMatch(rootSource, /function topicOptionFor\b/);
  assert.doesNotMatch(rootSource, /function isMainlandLessonKitTopic\b/);
  assert.doesNotMatch(rootSource, /function mainlandLessonKitTopicOptions\b/);

  assert.deepEqual(topicOptionFor?.(pepTopic), {
    id: "topic-pep-s3",
    grade: "S3",
    curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
    publisher: "MAINLAND_PEP",
    title: { en: "PEP Functions", zh: "人教函数" }
  });
  assert.equal(isMainlandLessonKitTopic?.(pepTopic), true);
  assert.equal(isMainlandLessonKitTopic?.(pepTopic, "MAINLAND_BNU"), false);
  assert.equal(isMainlandLessonKitTopic?.(hjbTopic), false);
  assert.equal(isMainlandLessonKitTopic?.(hkTopic), false);
  assert.deepEqual(
    mainlandTopicOptions?.(
      { topics: [pepTopic, hkTopic, hjbTopic, bnuTopic, { ...pepTopic, id: "topic-s4", grade: "S4", sort_order: 0 }] },
      [{ grade: "S3" }, { grade: "S2" }]
    ).map((topic) => topic.id),
    ["topic-bnu-s2", "topic-pep-s3"]
  );
});

test("teacher ops lesson-kit persistence owns lesson kit record scoping helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsLessonKitPersistence.ts"),
    "utf8"
  );

  assert.match(persistenceSource, /function lessonKitRecordsFor\(/);
  assert.equal(rootSource.includes("function lessonKitRecordsFor("), false);
});
