import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsAssessmentPersistenceStore,
  teacherOpsAssessmentAnalysisItems,
  teacherOpsAssessmentGradeComparisonCohorts,
  teacherOpsAssessmentReviewLessonAnalytics,
  teacherOpsReviewLessonPracticeBank,
  teacherOpsReviewLessonRecordFor,
  teacherOpsAssessmentPaperItemsForRecord,
  teacherOpsAssessmentPaperSectionsForRecord,
  toTeacherOpsAssessment,
  teacherOpsReviewLessonSnapshotIsStale,
  teacherOpsReviewLessonToRecord,
  teacherOpsAssessmentSubmittedCount,
  teacherOpsSeedAssessmentRecords,
  toTeacherOpsReviewLesson,
  toTeacherOpsAssessmentSubmission,
  type TeacherOpsAssessmentPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsAssessmentPersistence";
import type {
  AssessmentSubmission,
  TeacherAssessmentQuestionAnalytics,
  TeacherReviewLessonPlan
} from "@/types";

const now = new Date("2026-06-20T12:00:00.000Z");

type TeacherOpsAssessmentSeedBoundaryModule = {
  normalizeTeacherOpsAssessmentCollections?: (
    collections: {
      assessments?: Array<Record<string, unknown> & {
        id: string;
        class_id: string;
        title_en: string;
        title_zh: string;
        type: "quiz" | "test" | "exam" | "worksheet";
        status: "draft" | "scheduled" | "open" | "closed";
        opens_at: string | null;
        closes_at: string | null;
        time_limit_minutes: number | null;
        created_by: string;
        created_at: string;
      }>;
      assessment_submissions?: Array<Record<string, unknown> & {
        id: string;
        assessment_id: string;
        student_id: string;
      }>;
    },
    now: string,
    options: {
      demoTeacherId: string;
      demoUserId: string;
      questionExists: (questionId: string) => boolean;
      shouldSeedDemoUser: () => boolean;
    }
  ) => {
    assessments: Array<Record<string, unknown>>;
    assessment_submissions: Array<Record<string, unknown>>;
  };
  teacherOpsSeedAssessmentRecords?: (
    now: string,
    options: {
      demoTeacherId: string;
      questionExists: (questionId: string) => boolean;
    }
  ) => TeacherOpsAssessmentPersistenceDatabase["assessments"];
  teacherOpsSeedAssessmentSubmissionRecords?: (
    now: string,
    options: {
      demoUserId: string;
      shouldSeedDemoUser: () => boolean;
    }
  ) => TeacherOpsAssessmentPersistenceDatabase["assessment_submissions"];
};

type TeacherOpsAssessmentTestDatabase = TeacherOpsAssessmentPersistenceDatabase & {
  class_enrollments: Array<{
    class_id: string;
    student_id: string;
  }>;
  mistakes: Array<{
    user_id: string;
    question_id: string;
    mastered: boolean;
  }>;
  teacher_review_lessons: Array<{
    id: string;
    teacher_id: string;
    class_id: string;
    assessment_id: string;
    title_en: string;
    title_zh: string;
    language: "en" | "zh" | "zh-Hans";
    duration_minutes: number;
    status: "draft" | "generated" | "reviewed";
    source: "assessment" | "frequent-mistakes";
    source_snapshot: TeacherReviewLessonPlan["sourceSnapshot"];
    objectives: TeacherReviewLessonPlan["objectives"];
    timeline: TeacherReviewLessonPlan["timeline"];
    items: TeacherReviewLessonPlan["items"];
    slides: TeacherReviewLessonPlan["slides"];
    board_columns: TeacherReviewLessonPlan["boardColumns"];
    variation_questions: TeacherReviewLessonPlan["variationQuestions"];
    remediation_questions: TeacherReviewLessonPlan["remediationQuestions"];
    individual_groups: TeacherReviewLessonPlan["individualGroups"];
    generation_notes_en: string;
    generation_notes_zh: string;
    created_at: string;
    updated_at: string;
    generated_at: string;
    reviewed_at: string | null;
    remediation_assessment_id?: string;
  }>;
  teacher_notices: Array<{
    id: string;
    teacher_id: string;
    class_id: string;
    audience: "parents" | "students" | "both";
    channel_id: string;
    channel_name: string;
    subject_en: string;
    subject_zh: string;
    body_en: string;
    body_zh: string;
    status: "draft" | "queued" | "sent" | "failed";
    source_kind?: "manual" | "teacher-review-lesson" | "assignment-reminder" | "system";
    source_id?: string;
    due_at: string | null;
    created_at: string;
    updated_at: string;
    sent_at: string | null;
  }>;
  teacher_notice_recipients: Array<{
    id: string;
    notice_id: string;
    student_id: string;
    guardian_id?: string;
    status: "pending" | "acknowledged";
    acknowledged_by?: string;
    acknowledged_at: string | null;
    created_at: string;
  }>;
};

function createDatabase(): TeacherOpsAssessmentTestDatabase {
  return {
    assessment_submissions: [
      {
        id: "submission-owned",
        assessment_id: "assessment-owned",
        student_id: "student-a",
        status: "submitted",
        attempt_number: 0,
        score: 6,
        max_score: 10,
        submitted_at: null,
        graded_at: null,
        answers: [
          {
            questionId: "paper-item-1",
            answer: "x=2",
            isCorrect: false,
            pointsEarned: 2,
            maxPoints: 10
          }
        ],
        updated_at: "2026-06-19T11:00:00.000Z"
      },
      { assessment_id: "assessment-shared", status: "submitted", score: 8, max_score: 10 },
      { assessment_id: "assessment-shared", status: "in-progress", score: null, max_score: 10 },
      { assessment_id: "assessment-other", status: "graded", score: 10, max_score: 10 }
    ],
    assignments: [
      {
        id: "assignment-assessment-owned",
        class_id: "class-owned",
        content_type: "assessment",
        target_id: "assessment-owned",
        status: "active"
      },
      {
        id: "assignment-assessment-other-target",
        class_id: "class-owned",
        content_type: "assessment",
        target_id: "missing-assessment",
        status: "active"
      }
    ],
    submissions: [
      {
        id: "assignment-submission-assessment-owned",
        assignment_id: "assignment-assessment-owned",
        student_id: "student-a",
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        feedback_en: "",
        feedback_zh: "",
        updated_at: "2026-06-18T00:00:00.000Z"
      },
      {
        id: "assignment-submission-assessment-owned-other-student",
        assignment_id: "assignment-assessment-owned",
        student_id: "student-b",
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        feedback_en: "",
        feedback_zh: "",
        updated_at: "2026-06-18T00:00:00.000Z"
      }
    ],
    assessments: [
      {
        id: "assessment-owned",
        class_id: "class-owned",
        title_en: "Owned quiz",
        title_zh: "Owned quiz",
        status: "open",
        opens_at: "2026-06-19T08:00:00.000Z",
        closes_at: "2026-06-30T08:00:00.000Z",
        analysis_settings: {
          passThreshold: 60,
          excellentThreshold: 85,
          lowScoreThreshold: 40,
          borderlineRange: 5,
          scoreBands: []
        },
        exam_group_id: "old-group",
        exam_group_name_en: "Old group",
        exam_group_name_zh: "舊分組",
        created_by: "teacher-1",
        created_at: "2026-06-18T00:00:00.000Z",
        updated_at: "2026-06-19T10:00:00.000Z",
        paper_sections: [
          {
            id: "section-1",
            title: { en: "Core", zh: "Core" },
            order: 0,
            items: [
              { id: "paper-item-1", source: "question-bank", questionId: "q-s2", points: 10, order: 0 }
            ]
          }
        ]
      },
      {
        id: "assessment-shared",
        class_id: "class-shared",
        title_en: "Shared quiz",
        title_zh: "Shared quiz",
        status: "scheduled",
        analysis_settings: {
          passThreshold: 60,
          excellentThreshold: 85,
          lowScoreThreshold: 40,
          borderlineRange: 5,
          scoreBands: []
        },
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "assessment-other",
        class_id: "class-other",
        title_en: "Other quiz",
        title_zh: "Other quiz",
        status: "closed",
        analysis_settings: {
          passThreshold: 60,
          excellentThreshold: 85,
          lowScoreThreshold: 40,
          borderlineRange: 5,
          scoreBands: []
        },
        updated_at: "2026-06-21T10:00:00.000Z"
      }
    ],
    questions: [
      {
        id: "q-s2",
        grade: "S2",
        topic_id: "topic-s2",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "S2 prompt",
        prompt_zh: "S2 prompt",
        curriculum_track: "MAINLAND_PEP_HIGH",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_HJB"
      },
      {
        id: "q-s2-high",
        grade: "S2",
        topic_id: "topic-s2",
        difficulty: "High",
        type: "short-answer",
        prompt_en: "S2 extension prompt",
        prompt_zh: "S2 extension prompt",
        curriculum_track: "MAINLAND_PEP_HIGH",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_HJB"
      },
      {
        id: "q-s3",
        grade: "S3",
        topic_id: "topic-s3",
        difficulty: "High",
        type: "short-answer",
        prompt_en: "S3 prompt",
        prompt_zh: "S3 prompt",
        curriculum_track: "MAINLAND_PEP_HIGH",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_HJB"
      },
      {
        id: "q-s4",
        grade: "S4",
        topic_id: "topic-s4",
        difficulty: "Low",
        type: "fill-in",
        prompt_en: "S4 prompt",
        prompt_zh: "S4 prompt",
        curriculum_track: "MAINLAND_PEP_HIGH",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_HJB"
      },
      {
        id: "q-hidden",
        grade: "S2",
        topic_id: "topic-hidden",
        difficulty: "Low",
        type: "fill-in",
        prompt_en: "Hidden prompt",
        prompt_zh: "Hidden prompt",
        curriculum_track: "US_CA_MATH",
        curriculum_region: "US",
        textbook_publisher: "US_CA_MATH"
      }
    ],
    class_enrollments: [
      { class_id: "class-owned", student_id: "student-a" },
      { class_id: "class-owned", student_id: "student-b" },
      { class_id: "class-shared", student_id: "student-c" }
    ],
    mistakes: [
      { user_id: "student-a", question_id: "q-s2", mastered: false },
      { user_id: "student-b", question_id: "q-s2", mastered: false },
      { user_id: "student-a", question_id: "q-s2-high", mastered: false },
      { user_id: "student-c", question_id: "q-s3", mastered: false },
      { user_id: "student-b", question_id: "q-hidden", mastered: false },
      { user_id: "student-a", question_id: "q-s4", mastered: true }
    ],
    teacher_review_lessons: [
      {
        id: "review-owned",
        teacher_id: "teacher-1",
        class_id: "class-owned",
        assessment_id: "assessment-owned",
        title_en: "Owned Review",
        title_zh: "Owned Review",
        language: "zh-Hans",
        duration_minutes: 45,
        status: "reviewed",
        source: "assessment",
        source_snapshot: {
          assessmentId: "assessment-owned",
          assessmentTitle: { en: "Owned quiz", zh: "Owned quiz" },
          assessmentUpdatedAt: "2026-06-19T10:00:00.000Z",
          classId: "class-owned",
          className: "Owned S2",
          submittedCount: 1,
          totalStudents: 2,
          questionCount: 1,
          generatedAt: "2026-06-19T12:00:00.000Z"
        },
        objectives: [],
        timeline: [],
        items: [],
        slides: [],
        board_columns: [],
        variation_questions: [],
        remediation_questions: [
          {
            id: "remediation-q1",
            source: "manual",
            prompt: { en: "Solve x + 1 = 3", zh: "Solve x + 1 = 3" },
            answer: "x=2",
            explanation: { en: "Subtract 1 from both sides.", zh: "Subtract 1 from both sides." },
            topicId: "topic-s2",
            difficulty: "Medium",
            relatedItemId: "paper-item-1",
            validationStatus: "validated"
          },
          {
            id: "remediation-q2",
            source: "manual",
            prompt: { en: "Needs review", zh: "Needs review" },
            answer: "pending",
            explanation: { en: "pending", zh: "pending" },
            topicId: "topic-s2",
            difficulty: "Low",
            validationStatus: "needs-teacher-review"
          }
        ],
        individual_groups: [],
        generation_notes_en: "Ready",
        generation_notes_zh: "Ready",
        created_at: "2026-06-19T12:00:00.000Z",
        updated_at: "2026-06-19T13:00:00.000Z",
        generated_at: "2026-06-19T12:00:00.000Z",
        reviewed_at: "2026-06-19T13:00:00.000Z"
      },
      {
        id: "review-needs-review",
        teacher_id: "teacher-1",
        class_id: "class-owned",
        assessment_id: "assessment-owned",
        title_en: "Needs Review",
        title_zh: "Needs Review",
        language: "zh-Hans",
        duration_minutes: 45,
        status: "generated",
        source: "assessment",
        source_snapshot: {
          assessmentId: "assessment-owned",
          assessmentTitle: { en: "Owned quiz", zh: "Owned quiz" },
          assessmentUpdatedAt: "2026-06-19T10:00:00.000Z",
          classId: "class-owned",
          className: "Owned S2",
          submittedCount: 1,
          totalStudents: 2,
          questionCount: 1,
          generatedAt: "2026-06-19T12:00:00.000Z"
        },
        objectives: [],
        timeline: [],
        items: [],
        slides: [],
        board_columns: [],
        variation_questions: [],
        remediation_questions: [
          {
            id: "remediation-unreviewed",
            source: "manual",
            prompt: { en: "Needs review", zh: "Needs review" },
            answer: "pending",
            validationStatus: "needs-teacher-review"
          }
        ],
        individual_groups: [],
        generation_notes_en: "Needs review",
        generation_notes_zh: "Needs review",
        created_at: "2026-06-19T12:00:00.000Z",
        updated_at: "2026-06-19T13:00:00.000Z",
        generated_at: "2026-06-19T12:00:00.000Z",
        reviewed_at: null
      }
    ],
    teacher_notices: [
      {
        id: "notice-review-owned",
        teacher_id: "teacher-1",
        class_id: "class-owned",
        audience: "parents",
        channel_id: "wecom-parent",
        channel_name: "WeCom parent channel",
        subject_en: "Parent-safe review",
        subject_zh: "家長版講評",
        body_en: "Summary without student names.",
        body_zh: "不含學生姓名的摘要。",
        status: "sent",
        source_kind: "teacher-review-lesson",
        source_id: "review-owned",
        due_at: null,
        created_at: "2026-06-20T10:00:00.000Z",
        updated_at: "2026-06-20T11:00:00.000Z",
        sent_at: "2026-06-20T11:00:00.000Z"
      }
    ],
    teacher_notice_recipients: [
      {
        id: "notice-recipient-acknowledged",
        notice_id: "notice-review-owned",
        student_id: "student-a",
        status: "acknowledged",
        acknowledged_by: "parent-a",
        acknowledged_at: "2026-06-20T11:30:00.000Z",
        created_at: "2026-06-20T11:00:00.000Z"
      },
      {
        id: "notice-recipient-pending",
        notice_id: "notice-review-owned",
        student_id: "student-b",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-06-20T11:01:00.000Z"
      }
    ],
    school_memberships: [
      { user_id: "teacher-1", role: "teacher", class_id: "class-shared" }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        class_code: "S2-OWNED",
        name: "Owned S2",
        grade: "S2",
        academic_year: "2025-2026",
        description_en: "Owned S2 class",
        description_zh: "Owned S2 class",
        invite_code: "CLASS-OWNED",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z"
      },
      {
        id: "class-shared",
        teacher_id: "teacher-2",
        class_code: "S3-SHARED",
        name: "Shared S3",
        grade: "S3",
        academic_year: "2025-2026",
        description_en: "Shared S3 class",
        description_zh: "Shared S3 class",
        invite_code: "CLASS-SHARED",
        created_at: "2026-06-03T00:00:00.000Z",
        updated_at: "2026-06-04T00:00:00.000Z"
      },
      {
        id: "class-other",
        teacher_id: "teacher-2",
        class_code: "S4-OTHER",
        name: "Other S4",
        grade: "S4",
        academic_year: "2025-2026",
        description_en: "Other S4 class",
        description_zh: "Other S4 class",
        invite_code: "CLASS-OTHER",
        created_at: "2026-06-05T00:00:00.000Z",
        updated_at: "2026-06-06T00:00:00.000Z"
      }
    ],
    teaching_resources: [
      {
        id: "resource-owned",
        title_en: "Owned PDF",
        title_zh: "Owned PDF",
        type: "worksheet",
        file_name: "owned.pdf",
        file_type: "PDF",
        mime_type: "application/pdf",
        file_size_bytes: 120,
        grade: "S2",
        topic_id: "topic-s2",
        uploaded_by: "teacher-1",
        created_at: "2026-06-20T09:00:00.000Z"
      },
      {
        id: "resource-other",
        title_en: "Other PDF",
        title_zh: "Other PDF",
        type: "worksheet",
        file_name: "other.pdf",
        file_type: "PDF",
        mime_type: "application/pdf",
        file_size_bytes: 220,
        grade: "S4",
        uploaded_by: "teacher-2",
        created_at: "2026-06-20T10:00:00.000Z"
      }
    ],
    topics: [
      {
        id: "topic-s3",
        grade: "S3",
        sort_order: 2,
        title_en: "S3 topic",
        title_zh: "S3 topic",
        curriculum_track: "MAINLAND_PEP_HIGH",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_HJB"
      },
      {
        id: "topic-s2",
        grade: "S2",
        sort_order: 1,
        title_en: "S2 topic",
        title_zh: "S2 topic",
        curriculum_track: "MAINLAND_PEP_HIGH",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_HJB"
      },
      {
        id: "topic-hidden",
        grade: "S2",
        sort_order: 3,
        title_en: "Hidden",
        title_zh: "Hidden",
        curriculum_track: "US_CA_MATH",
        curriculum_region: "US",
        textbook_publisher: "US_CA_MATH"
      }
    ],
    student_profiles: [
      {
        user_id: "student-a",
        name: "student-a",
        grade: "S2"
      },
      {
        user_id: "student-b",
        name: "student-b",
        grade: "S2"
      },
      {
        user_id: "student-c",
        name: "student-c",
        grade: "S3"
      },
      {
        user_id: "teacher-1",
        curriculum_track: "MAINLAND_PEP_HIGH",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_HJB"
      },
      {
        user_id: "teacher-2",
        curriculum_track: "HK",
        curriculum_region: "HK",
        textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" }
    ]
  };
}

function createTestStore(database: TeacherOpsAssessmentPersistenceDatabase, createIds = ["clone"]) {
  const ids = [...createIds];

  return createTeacherOpsAssessmentPersistenceStore({
    createId: () => ids.shift() ?? "fallback-id",
    now: () => now,
    safeExportFileName: (fileName) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "resource-upload",
    buildReviewLessonDraft: (input): TeacherReviewLessonPlan => ({
      id: input.id,
      teacherId: input.teacherId,
      classId: input.classId,
      className: input.className,
      assessmentId: input.assessmentId,
      title: { en: `Draft ${input.assessmentTitle.en}`, zh: `Draft ${input.assessmentTitle.en}` },
      language: input.language,
      durationMinutes: input.durationMinutes,
      status: "generated",
      source: "assessment",
      sourceSnapshot: {
        assessmentId: input.assessmentId,
        assessmentTitle: input.assessmentTitle,
        assessmentUpdatedAt: input.assessmentUpdatedAt,
        classId: input.classId,
        className: input.className,
        submittedCount: input.submittedCount,
        totalStudents: input.totalStudents,
        questionCount: input.analytics.length,
        generatedAt: input.now
      },
      sourceSnapshotStale: false,
      objectives: [{ en: "Review blockers", zh: "Review blockers" }],
      timeline: [{ id: "review", label: { en: "Review", zh: "Review" }, minutes: input.durationMinutes }],
      items: [],
      slides: [],
      boardColumns: [],
      variationQuestions: [],
      remediationQuestions: [],
      individualGroups: [],
      generationNotes: {
        en: `analytics:${input.analytics[0]?.wrongStudentNames.join(",") ?? ""}|practice:${input.practiceBank.map((question) => question.questionId).join(",")}`,
        zh: "Generated"
      },
      createdAt: input.now,
      updatedAt: input.now,
      generatedAt: input.now,
      reviewedAt: null
    }),
    enrichReviewLessonPlan: async (plan): Promise<TeacherReviewLessonPlan> => ({
      ...plan,
      title: { en: `Enriched ${plan.title.en}`, zh: `Enriched ${plan.title.en}` }
    }),
    renderReviewLessonMarkdown: (plan, language) => `# ${plan.title.en}\n${language}`,
    renderReviewLessonPptx: async (plan) => Buffer.from(`pptx:${plan.id}`),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
  });
}

test("teacher ops assessment persistence builds create data without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const data = await createTestStore(createDatabase()).getTeacherAssessmentCreateData("teacher-1");

  assert.deepEqual(data?.classes.map((teacherClass) => teacherClass.id), ["class-owned", "class-shared"]);
  assert.deepEqual(data?.resources.map((resource) => resource.id), ["resource-owned"]);
  assert.deepEqual(data?.topicOptions.map((topic) => topic.id), ["topic-s2", "topic-s3"]);
  assert.deepEqual(data?.topicOptions[0], {
    id: "topic-s2",
    grade: "S2",
    title: { en: "S2 topic", zh: "S2 topic" },
    curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_HJB" },
    publisher: "MAINLAND_HJB"
  });
  assert.deepEqual(data?.questionBank.map((question) => question.id), ["q-s2", "q-s2-high", "q-s3"]);
  assert.deepEqual(data?.questionBank[0]?.topicTitle, { en: "S2 topic", zh: "S2 topic" });
});

test("teacher ops assessment persistence builds scoped assessment list data", async () => {
  const store = createTestStore(createDatabase());

  const data = await store.getTeacherAssessmentListData("teacher-1");

  assert.equal(data?.generatedAt, "2026-06-20T12:00:00.000Z");
  assert.deepEqual(data?.classes.map((teacherClass) => teacherClass.id), ["class-owned", "class-shared"]);
  assert.deepEqual(data?.assessments.map((assessment) => assessment.id), ["assessment-shared", "assessment-owned"]);
  assert.deepEqual(data?.totals, {
    assessments: 2,
    openAssessments: 2,
    submittedCount: 2,
    averageScore: 70
  });

  const adminData = await store.getTeacherAssessmentListData("admin-1");
  assert.deepEqual(adminData?.assessments.map((assessment) => assessment.id), [
    "assessment-other",
    "assessment-shared",
    "assessment-owned"
  ]);
  assert.equal(adminData?.totals.averageScore, 80);
  assert.equal(await store.getTeacherAssessmentListData("student-1"), null);
});

test("teacher assessment record helper lives in assessment persistence, not root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as Record<string, unknown>;

  assert.equal(typeof helpers.teacherAssessmentRecordsFor, "function");

  const teacherAssessmentRecordsFor = helpers.teacherAssessmentRecordsFor as (
    database: TeacherOpsAssessmentPersistenceDatabase,
    user: { id: string; role: "teacher" | "admin" | "student" }
  ) => TeacherOpsAssessmentPersistenceDatabase["assessments"];
  const database = createDatabase();

  assert.deepEqual(
    teacherAssessmentRecordsFor(database, { id: "teacher-1", role: "teacher" }).map((assessment) => assessment.id),
    ["assessment-owned", "assessment-shared"]
  );
  assert.deepEqual(
    teacherAssessmentRecordsFor(database, { id: "admin-1", role: "admin" }).map((assessment) => assessment.id),
    ["assessment-owned", "assessment-shared", "assessment-other"]
  );
  assert.deepEqual(
    teacherAssessmentRecordsFor(database, { id: "student-1", role: "student" }).map((assessment) => assessment.id),
    []
  );

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /function teacherAssessmentRecordsFor\(/);
});

test("teacher ops assessment persistence owns assessment record normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"), "utf8");
  const normalizeAssessment = helpers.normalizeTeacherOpsAssessmentRecord as ((
    assessment: {
      id: string;
      class_id: string;
      title_en: string;
      status: string;
      source_type?: string | null;
      source_resource_id?: string | null;
      analysis_settings?: Record<string, unknown> | null;
      exam_group_id?: string;
      exam_group_name_en?: string;
      exam_group_name_zh?: string;
      question_ids?: string[];
      manual_questions?: unknown[];
      paper_sections?: unknown;
      max_attempts?: number;
      randomize_question_order?: boolean;
      show_answers_immediately?: boolean;
      grade_weight?: number;
      created_at?: string;
      updated_at?: string | null;
    }
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeAssessment, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsAssessmentRecord\b/);
  assert.doesNotMatch(rootSource, /normalizeTeacherOpsAssessmentRecord as normalizeAssessmentRecordFromTeacherOpsAssessment/);
  assert.doesNotMatch(rootSource, /from "@\/lib\/teacherAssessmentAnalysis"/);
  assert.doesNotMatch(rootSource, /assessments: mergeSeedRecordsPreservingExisting\([\s\S]*?\.map\(\(assessment\) => \(\{/);
  assert.doesNotMatch(rootSource, /analysis_settings: normalizeAssessmentAnalysisSettings\(assessment\.analysis_settings\)/);

  const normalizedMissing = normalizeAssessment?.({
    id: "assessment-defaults",
    class_id: "class-1",
    title_en: "Defaults",
    status: "draft",
    source_type: null,
    source_resource_id: null,
    analysis_settings: {
      passThreshold: 150,
      scoreBands: [{ label: "Wide", min: -5, max: 120 }]
    },
    exam_group_id: "   ",
    exam_group_name_en: "",
    exam_group_name_zh: "  ",
    paper_sections: "not-sections",
    created_at: "2026-06-19T10:00:00.000Z",
    updated_at: null
  }) as Record<string, unknown> | undefined;

  assert.equal(normalizedMissing?.source_type, "question-bank");
  assert.equal(normalizedMissing?.source_resource_id, undefined);
  assert.equal((normalizedMissing?.analysis_settings as { passThreshold: number }).passThreshold, 100);
  assert.equal(normalizedMissing?.exam_group_id, undefined);
  assert.equal(normalizedMissing?.exam_group_name_en, undefined);
  assert.equal(normalizedMissing?.exam_group_name_zh, undefined);
  assert.deepEqual(normalizedMissing?.question_ids, []);
  assert.deepEqual(normalizedMissing?.manual_questions, []);
  assert.deepEqual(normalizedMissing?.paper_sections, []);
  assert.equal(normalizedMissing?.max_attempts, 1);
  assert.equal(normalizedMissing?.randomize_question_order, false);
  assert.equal(normalizedMissing?.show_answers_immediately, false);
  assert.equal(normalizedMissing?.grade_weight, 10);
  assert.equal(normalizedMissing?.updated_at, "2026-06-19T10:00:00.000Z");

  assert.deepEqual(normalizeAssessment?.({
    id: "assessment-valid",
    class_id: "class-1",
    title_en: "Valid",
    status: "open",
    source_type: "mixed",
    source_resource_id: "resource-1",
    analysis_settings: null,
    exam_group_id: " group-1 ",
    exam_group_name_en: " Midterm ",
    exam_group_name_zh: " 期中 ",
    question_ids: ["q-1"],
    manual_questions: [{ id: "manual-1" }],
    paper_sections: [{ id: "section-1", title: { en: "A", zh: "A" }, items: [] }],
    max_attempts: 3,
    randomize_question_order: true,
    show_answers_immediately: true,
    grade_weight: 25,
    created_at: "2026-06-19T10:00:00.000Z",
    updated_at: "2026-06-20T10:00:00.000Z"
  }), {
    id: "assessment-valid",
    class_id: "class-1",
    title_en: "Valid",
    status: "open",
    source_type: "mixed",
    source_resource_id: "resource-1",
    analysis_settings: {
      passThreshold: 60,
      excellentThreshold: 85,
      lowScoreThreshold: 40,
      borderlineRange: 5,
      scoreBands: [
        { label: "0-39", min: 0, max: 39 },
        { label: "40-59", min: 40, max: 59 },
        { label: "60-69", min: 60, max: 69 },
        { label: "70-84", min: 70, max: 84 },
        { label: "85-100", min: 85, max: 100 }
      ],
      updatedAt: undefined
    },
    exam_group_id: "group-1",
    exam_group_name_en: "Midterm",
    exam_group_name_zh: "期中",
    question_ids: ["q-1"],
    manual_questions: [{ id: "manual-1" }],
    paper_sections: [{ id: "section-1", title: { en: "A", zh: "A" }, items: [] }],
    max_attempts: 3,
    randomize_question_order: true,
    show_answers_immediately: true,
    grade_weight: 25,
    created_at: "2026-06-19T10:00:00.000Z",
    updated_at: "2026-06-20T10:00:00.000Z"
  });
});

test("teacher ops assessment persistence owns assessment submission record normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"), "utf8");
  const normalizeSubmission = helpers.normalizeTeacherOpsAssessmentSubmissionRecord as ((
    submission: {
      id: string;
      assessment_id: string;
      student_id: string;
      status?: "not-started" | "in-progress" | "submitted" | "graded" | null;
      attempt_number?: number | null;
      score?: number | null;
      max_score?: number | null;
      submitted_at?: string | null;
      graded_at?: string | null;
      answers?: Array<Record<string, unknown>>;
      updated_at?: string | null;
    },
    now: string
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeSubmission, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsAssessmentSubmissionRecord\b/);
  assert.doesNotMatch(rootSource, /normalizeTeacherOpsAssessmentSubmissionRecord as normalizeAssessmentSubmissionRecordFromTeacherOpsAssessment/);
  assert.doesNotMatch(rootSource, /assessment_submissions: mergeSeedRecordsPreservingExisting\([\s\S]*?\.map\(\(submission\) => \(\{/);
  assert.doesNotMatch(rootSource, /teacherFeedback: answer\.teacherFeedback \?\? null/);

  assert.deepEqual(normalizeSubmission?.({
    id: "submission-defaults",
    assessment_id: "assessment-1",
    student_id: "student-1",
    status: null,
    attempt_number: null,
    score: undefined,
    max_score: null,
    submitted_at: null,
    graded_at: undefined,
    answers: [{ questionId: "q-1", answer: "x=2" }],
    updated_at: null
  }, now.toISOString()), {
    id: "submission-defaults",
    assessment_id: "assessment-1",
    student_id: "student-1",
    status: "not-started",
    attempt_number: 1,
    score: null,
    max_score: 100,
    submitted_at: null,
    graded_at: null,
    answers: [{ questionId: "q-1", answer: "x=2", teacherFeedback: null }],
    updated_at: now.toISOString()
  });

  assert.deepEqual(normalizeSubmission?.({
    id: "submission-valid",
    assessment_id: "assessment-1",
    student_id: "student-1",
    status: "submitted",
    attempt_number: 0,
    score: 8,
    max_score: 10,
    submitted_at: "2026-06-19T10:00:00.000Z",
    graded_at: "2026-06-20T10:00:00.000Z",
    answers: [{ questionId: "q-1", answer: "x=2", teacherFeedback: "Good" }],
    updated_at: undefined
  }, now.toISOString()), {
    id: "submission-valid",
    assessment_id: "assessment-1",
    student_id: "student-1",
    status: "submitted",
    attempt_number: 0,
    score: 8,
    max_score: 10,
    submitted_at: "2026-06-19T10:00:00.000Z",
    graded_at: "2026-06-20T10:00:00.000Z",
    answers: [{ questionId: "q-1", answer: "x=2", teacherFeedback: "Good" }],
    updated_at: "2026-06-19T10:00:00.000Z"
  });
});

test("teacher ops assessment persistence owns assessment collection normalization for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );
  const storeModule = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as TeacherOpsAssessmentSeedBoundaryModule;

  assert.equal(typeof storeModule.normalizeTeacherOpsAssessmentCollections, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsAssessmentCollections\b/);
  assert.match(rootSource, /normalizeTeacherOpsAssessmentCollections as normalizeAssessmentCollectionsFromTeacherOpsAssessment/);
  assert.doesNotMatch(rootSource, /\n    assessments: mergeSeedRecordsPreservingExisting\(/);
  assert.doesNotMatch(rootSource, /\n    assessment_submissions: mergeSeedRecordsPreservingExisting\(/);

  const normalized = storeModule.normalizeTeacherOpsAssessmentCollections?.({
    assessments: [
      {
        id: "assessment-s3-algebra-quiz",
        class_id: "class-s3a-2026",
        title_en: "Legacy quiz",
        title_zh: "Legacy quiz",
        type: "quiz",
        status: "open",
        source_type: null,
        source_resource_id: null,
        analysis_settings: {
          passThreshold: 150
        },
        exam_group_id: "  ",
        question_ids: ["legacy-question"],
        manual_questions: [],
        paper_sections: "not-sections",
        opens_at: null,
        closes_at: "2026-06-30T10:00:00.000Z",
        time_limit_minutes: 20,
        created_by: "teacher-custom",
        created_at: "2026-06-19T10:00:00.000Z",
        updated_at: null
      },
      {
        id: "assessment-custom",
        class_id: "class-s3a-2026",
        title_en: "Custom quiz",
        title_zh: "Custom quiz",
        type: "test",
        status: "draft",
        source_type: "manual",
        opens_at: null,
        closes_at: null,
        time_limit_minutes: null,
        created_by: "teacher-custom",
        created_at: "2026-06-19T11:00:00.000Z"
      }
    ],
    assessment_submissions: [
      {
        id: "assessment-submission-s3-algebra-peter",
        assessment_id: "assessment-s3-algebra-quiz",
        student_id: "student-custom",
        status: null,
        attempt_number: null,
        score: undefined,
        max_score: null,
        submitted_at: "2026-06-19T12:00:00.000Z",
        graded_at: null,
        answers: [{ questionId: "legacy-question", answer: "x=2" }],
        updated_at: null
      },
      {
        id: "assessment-submission-custom",
        assessment_id: "assessment-custom",
        student_id: "student-custom",
        status: "submitted",
        attempt_number: 2,
        score: 80,
        max_score: 100,
        submitted_at: "2026-06-19T13:00:00.000Z",
        graded_at: null,
        answers: [],
        updated_at: "2026-06-19T13:30:00.000Z"
      }
    ]
  }, "2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    questionExists: (questionId) => questionId === "q5",
    shouldSeedDemoUser: () => true
  });

  assert.deepEqual(normalized?.assessments.map((assessment) => assessment.id), [
    "assessment-s3-algebra-quiz",
    "assessment-us-ca-p1-add-subtract-check",
    "assessment-custom"
  ]);
  assert.equal(normalized?.assessments[0]?.title_en, "Legacy quiz");
  assert.equal(normalized?.assessments[0]?.source_type, "question-bank");
  assert.deepEqual(normalized?.assessments[0]?.paper_sections, []);
  assert.equal(normalized?.assessments[0]?.updated_at, "2026-06-19T10:00:00.000Z");
  assert.equal((normalized?.assessments[0]?.analysis_settings as { passThreshold: number } | undefined)?.passThreshold, 100);
  assert.deepEqual(normalized?.assessment_submissions.map((submission) => submission.id), [
    "assessment-submission-s3-algebra-peter",
    "assessment-submission-custom"
  ]);
  assert.equal(normalized?.assessment_submissions[0]?.status, "not-started");
  assert.equal(normalized?.assessment_submissions[0]?.attempt_number, 1);
  assert.equal(normalized?.assessment_submissions[0]?.max_score, 100);
  assert.deepEqual(normalized?.assessment_submissions[0]?.answers, [
    { questionId: "legacy-question", answer: "x=2", teacherFeedback: null }
  ]);
  assert.equal(normalized?.assessment_submissions[0]?.updated_at, "2026-06-19T12:00:00.000Z");

  assert.deepEqual(storeModule.normalizeTeacherOpsAssessmentCollections?.({
    assessments: [],
    assessment_submissions: []
  }, "2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    questionExists: (questionId) => questionId === "q5",
    shouldSeedDemoUser: () => false
  })?.assessments.map((assessment) => ({
    id: assessment.id,
    question_ids: assessment.question_ids
  })), [
    {
      id: "assessment-s3-algebra-quiz",
      question_ids: ["q5"]
    },
    {
      // The demo classroom's open assessment, with its own questions filtered out
      // by this caller's questionExists stub.
      id: "assessment-us-ca-p1-add-subtract-check",
      question_ids: []
    }
  ]);
});

test("teacher ops assessment persistence filters builder question-bank results", async () => {
  const store = createTestStore(createDatabase());

  const data = await store.getTeacherAssessmentBuilderQuestions({
    teacherId: "teacher-1",
    classId: "class-owned",
    topicIds: ["topic-s2"],
    difficulties: ["Medium"],
    questionTypes: ["multiple-choice"],
    keyword: "S2 topic",
    source: "question-bank",
    page: 1,
    pageSize: 5
  });

  assert.deepEqual(data?.questions.map((question) => question.id), ["q-s2"]);
  assert.deepEqual(data?.questions.map((question) => question.source), ["question-bank"]);
  assert.equal(data?.total, 1);
  assert.equal(data?.page, 1);
  assert.equal(data?.pageSize, 5);

  assert.equal(await store.getTeacherAssessmentBuilderQuestions({
    teacherId: "teacher-1",
    classId: "class-other",
    source: "question-bank",
    page: 1,
    pageSize: 5
  }), null);
});

test("teacher ops assessment persistence ranks mistake-source builder questions by active class mistakes", async () => {
  const store = createTestStore(createDatabase());

  const data = await store.getTeacherAssessmentBuilderQuestions({
    teacherId: "teacher-1",
    classId: "class-owned",
    source: "mistakes",
    page: 1,
    pageSize: 10
  });

  assert.deepEqual(data?.questions.map((question) => [question.id, question.source, question.usageCount]), [
    ["q-s2", "mistake", 2],
    ["q-s2-high", "mistake", 1]
  ]);
  assert.equal(data?.total, 2);
});

test("teacher ops assessment persistence clones assessments as teacher drafts", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.cloneTeacherAssessment("teacher-1", "assessment-owned");

  assert.equal(result.status, "created");
  if (result.status !== "created") assert.fail("expected clone to be created");
  assert.equal(database.assessments[0].id, "assessment-clone");
  assert.equal(database.assessments[0].title_en, "Copy of Owned quiz");
  assert.equal(database.assessments[0].title_zh, "Copy of Owned quiz");
  assert.equal(database.assessments[0].status, "draft");
  assert.equal(database.assessments[0].opens_at, null);
  assert.equal(database.assessments[0].closes_at, "2026-06-30T08:00:00.000Z");
  assert.equal(database.assessments[0].created_by, "teacher-1");
  assert.equal(database.assessments[0].created_at, "2026-06-20T12:00:00.000Z");
  assert.equal(database.assessments[0].updated_at, "2026-06-20T12:00:00.000Z");
  assert.deepEqual(database.assessments[0].paper_sections, [
    {
      id: "section-1",
      title: { en: "Core", zh: "Core" },
      instructions: undefined,
      order: 0,
      items: [
        { id: "paper-item-1", source: "question-bank", questionId: "q-s2", points: 10, order: 0 }
      ]
    }
  ]);
  assert.equal(result.assessment.id, "assessment-clone");
  assert.deepEqual(await store.cloneTeacherAssessment("teacher-1", "assessment-other"), { status: "not-found" });
  assert.deepEqual(await store.cloneTeacherAssessment("student-1", "assessment-owned"), { status: "forbidden" });
});

test("teacher ops assessment persistence updates analysis settings and exam group metadata", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.updateTeacherAssessmentAnalysisSettings({
    teacherId: "teacher-1",
    assessmentId: "assessment-owned",
    analysisSettings: {
      passThreshold: 65,
      excellentThreshold: 92,
      lowScoreThreshold: 35,
      borderlineRange: 7,
      scoreBands: [
        { label: "A", min: 90, max: 100 },
        { label: "B", min: 80, max: 89 }
      ]
    },
    examGroupId: "  group-s2-midterm  ",
    examGroupName: "  S2 Midterm  "
  });

  assert.equal(result.status, "updated");
  if (result.status !== "updated") assert.fail("expected analysis settings update");
  assert.deepEqual(database.assessments[0].analysis_settings, {
    passThreshold: 65,
    excellentThreshold: 92,
    lowScoreThreshold: 35,
    borderlineRange: 7,
    scoreBands: [
      { label: "A", min: 90, max: 100 },
      { label: "B", min: 80, max: 89 }
    ],
    updatedAt: "2026-06-20T12:00:00.000Z"
  });
  assert.equal(database.assessments[0].exam_group_id, "group-s2-midterm");
  assert.equal(database.assessments[0].exam_group_name_en, "S2 Midterm");
  assert.equal(database.assessments[0].exam_group_name_zh, "S2 Midterm");
  assert.equal(database.assessments[0].updated_at, "2026-06-20T12:00:00.000Z");
  assert.equal(result.assessment.id, "assessment-owned");

  assert.deepEqual(await store.updateTeacherAssessmentAnalysisSettings({
    teacherId: "teacher-1",
    assessmentId: "assessment-other",
    analysisSettings: {},
    examGroupId: null,
    examGroupName: null
  }), { status: "not-found" });
  assert.deepEqual(await store.updateTeacherAssessmentAnalysisSettings({
    teacherId: "student-1",
    assessmentId: "assessment-owned",
    analysisSettings: {},
    examGroupId: null,
    examGroupName: null
  }), { status: "forbidden" });
});

test("teacher ops assessment persistence updates assessment submission marking", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.updateTeacherAssessmentSubmissionMarking({
    teacherId: "teacher-1",
    assessmentId: "assessment-owned",
    submissionId: "submission-owned",
    answers: [
      {
        questionId: "paper-item-1",
        pointsEarned: 7.26,
        isCorrect: true,
        teacherFeedback: "  Strong method; revise notation.  "
      }
    ]
  });

  assert.equal(result.status, "updated");
  if (result.status !== "updated") assert.fail("expected marking update");
  assert.equal(database.assessment_submissions[0].status, "graded");
  assert.equal(database.assessment_submissions[0].attempt_number, 1);
  assert.equal(database.assessment_submissions[0].score, 7.3);
  assert.equal(database.assessment_submissions[0].max_score, 10);
  assert.equal(database.assessment_submissions[0].submitted_at, "2026-06-20T12:00:00.000Z");
  assert.equal(database.assessment_submissions[0].graded_at, "2026-06-20T12:00:00.000Z");
  assert.equal(database.assessment_submissions[0].updated_at, "2026-06-20T12:00:00.000Z");
  assert.deepEqual(database.assessment_submissions[0].answers, [
    {
      questionId: "paper-item-1",
      answer: "x=2",
      isCorrect: true,
      pointsEarned: 7.3,
      maxPoints: 10,
      teacherFeedback: {
        en: "Strong method; revise notation.",
        zh: "Strong method; revise notation."
      }
    }
  ]);
  const assignmentSubmission = database.submissions?.find((submission) => submission.id === "assignment-submission-assessment-owned");
  assert.deepEqual(assignmentSubmission && {
    status: assignmentSubmission.status,
    score: assignmentSubmission.score,
    submittedAt: assignmentSubmission.submitted_at,
    gradedAt: assignmentSubmission.graded_at,
    feedbackEn: assignmentSubmission.feedback_en,
    feedbackZh: assignmentSubmission.feedback_zh,
    updatedAt: assignmentSubmission.updated_at
  }, {
    status: "graded",
    score: 73,
    submittedAt: "2026-06-20T12:00:00.000Z",
    gradedAt: "2026-06-20T12:00:00.000Z",
    feedbackEn: "Updated by teacher marking.",
    feedbackZh: "已由教師閱卷更新。",
    updatedAt: "2026-06-20T12:00:00.000Z"
  });
  assert.equal(result.submission.score, 7.3);
  assert.equal(result.assessment.id, "assessment-owned");

  assert.deepEqual(await store.updateTeacherAssessmentSubmissionMarking({
    teacherId: "teacher-1",
    assessmentId: "assessment-owned",
    submissionId: "missing-submission",
    answers: []
  }), { status: "not-found" });
  assert.deepEqual(await store.updateTeacherAssessmentSubmissionMarking({
    teacherId: "student-1",
    assessmentId: "assessment-owned",
    submissionId: "submission-owned",
    answers: []
  }), { status: "forbidden" });
});

test("teacher ops assessment persistence exports assessment detail CSV", async () => {
  const store = createTestStore(createDatabase());

  assert.equal(await store.getTeacherAssessmentCsv("teacher-1", "assessment-owned"), [
    "\"Rank\",\"Student\",\"Status\",\"Attempt\",\"Score\",\"Max score\",\"Percentage\",\"Borderline tags\",\"Submitted at\",\"Graded at\",\"Q1 score (10)\"",
    "\"1\",\"student-a\",\"submitted\",\"0\",\"6\",\"10\",\"60\",\"pass-borderline\",\"\",\"\",\"2/10\""
  ].join("\n"));
  assert.equal(await createTestStore(createDatabase()).getTeacherAssessmentCsv("teacher-1", "missing-assessment"), null);
});

test("teacher ops assessment persistence builds assessment detail data", async () => {
  const store = createTestStore(createDatabase());

  const detail = await store.getTeacherAssessmentDetailData("teacher-1", "assessment-owned");

  assert.equal(detail?.assessment.id, "assessment-owned");
  assert.equal(detail?.class.id, "class-owned");
  assert.equal(detail?.sourceResource, null);
  assert.deepEqual(detail?.submissions.map((submission) => [
    submission.studentId,
    submission.studentName,
    submission.status,
    submission.score,
    submission.maxScore
  ]), [
    ["student-a", "student-a", "submitted", 6, 10]
  ]);
  assert.equal(detail?.averageScore, 60);
  assert.equal(detail?.submittedCount, 1);
  assert.deepEqual(detail?.questionAnalytics.map((question) => ({
    questionId: question.questionId,
    prompt: question.prompt,
    maxPoints: question.maxPoints,
    averagePoints: question.averagePoints,
    scoreRate: question.scoreRate,
    correctRate: question.correctRate,
    commonWrongAnswer: question.commonWrongAnswer
  })), [
    {
      questionId: "paper-item-1",
      prompt: { en: "S2 prompt", zh: "S2 prompt" },
      maxPoints: 10,
      averagePoints: 2,
      scoreRate: 20,
      correctRate: 0,
      commonWrongAnswer: "x=2"
    }
  ]);
  assert.deepEqual(detail?.analysis.rankings.map((ranking) => ({
    rank: ranking.rank,
    studentName: ranking.studentName,
    percentage: ranking.percentage,
    borderlineTypes: ranking.borderlineTypes
  })), [
    {
      rank: 1,
      studentName: "student-a",
      percentage: 60,
      borderlineTypes: ["pass-borderline"]
    }
  ]);
  assert.equal(await store.getTeacherAssessmentDetailData("student-1", "assessment-owned"), null);
  assert.equal(await store.getTeacherAssessmentDetailData("teacher-1", "missing-assessment"), null);
});

test("teacher ops assessment persistence creates resource-backed published assessments", async () => {
  const database = createDatabase();
  const store = createTestStore(database, ["created", "submission-a", "submission-b"]);

  const result = await store.createTeacherAssessment({
    teacherId: "teacher-1",
    classId: "class-owned",
    title: "  Resource Quiz  ",
    type: "quiz",
    sourceType: "resource",
    sourceResourceId: "resource-owned",
    questionIds: [],
    randomizeQuestionOrder: true,
    showAnswersImmediately: false,
    statusIntent: "publish",
    opensAt: "2026-07-01T08:00:00+08:00",
    closesAt: "2026-07-02T08:00:00+08:00",
    timeLimitMinutes: 44.7,
    maxAttempts: 2.2,
    gradeWeight: 12.2
  });

  assert.equal(result.status, "created");
  if (result.status !== "created") assert.fail("expected assessment creation");
  assert.equal(database.assessments[0].id, "assessment-created");
  assert.equal(database.assessments[0].class_id, "class-owned");
  assert.equal(database.assessments[0].title_en, "Resource Quiz");
  assert.equal(database.assessments[0].title_zh, "Resource Quiz");
  assert.equal(database.assessments[0].type, "quiz");
  assert.equal(database.assessments[0].status, "scheduled");
  assert.equal(database.assessments[0].source_type, "resource");
  assert.equal(database.assessments[0].source_resource_id, "resource-owned");
  assert.deepEqual(database.assessments[0].question_ids, ["q-s2", "q-s2-high"]);
  assert.deepEqual(database.assessments[0].manual_questions, []);
  assert.deepEqual(database.assessments[0].paper_sections, []);
  assert.equal(database.assessments[0].opens_at, "2026-07-01T00:00:00.000Z");
  assert.equal(database.assessments[0].closes_at, "2026-07-02T00:00:00.000Z");
  assert.equal(database.assessments[0].time_limit_minutes, 45);
  assert.equal(database.assessments[0].max_attempts, 2);
  assert.equal(database.assessments[0].randomize_question_order, true);
  assert.equal(database.assessments[0].show_answers_immediately, false);
  assert.equal(database.assessments[0].grade_weight, 12);
  assert.equal(database.assessments[0].created_by, "teacher-1");
  assert.equal(database.assessments[0].created_at, "2026-06-20T12:00:00.000Z");
  assert.equal(database.assessments[0].updated_at, "2026-06-20T12:00:00.000Z");
  assert.equal(result.assessment.id, "assessment-created");
  assert.deepEqual(database.assessment_submissions.slice(-2).map((submission) => ({
    id: submission.id,
    assessment_id: submission.assessment_id,
    student_id: submission.student_id,
    status: submission.status,
    updated_at: submission.updated_at
  })), [
    {
      id: "assessment-submission-submission-a",
      assessment_id: "assessment-created",
      student_id: "student-a",
      status: "not-started",
      updated_at: "2026-06-20T12:00:00.000Z"
    },
    {
      id: "assessment-submission-submission-b",
      assessment_id: "assessment-created",
      student_id: "student-b",
      status: "not-started",
      updated_at: "2026-06-20T12:00:00.000Z"
    }
  ]);
});

test("teacher ops assessment persistence validates manual assessment creation", async () => {
  const database = createDatabase();
  const store = createTestStore(database, ["manual-created"]);

  assert.deepEqual(await store.createTeacherAssessment({
    teacherId: "teacher-1",
    classId: "class-owned",
    title: "   ",
    type: "quiz",
    sourceType: "manual",
    randomizeQuestionOrder: false,
    showAnswersImmediately: true
  }), { status: "invalid" });
  assert.deepEqual(await store.createTeacherAssessment({
    teacherId: "student-1",
    classId: "class-owned",
    title: "Manual quiz",
    type: "quiz",
    sourceType: "manual",
    randomizeQuestionOrder: false,
    showAnswersImmediately: true,
    manualQuestions: [{ id: "m1", prompt: { en: " 2 + 2 ", zh: "" }, answer: " 4 ", points: 4.6 }]
  }), { status: "forbidden" });

  const result = await store.createTeacherAssessment({
    teacherId: "teacher-1",
    classId: "class-owned",
    title: "Manual quiz",
    type: "quiz",
    sourceType: "manual",
    randomizeQuestionOrder: false,
    showAnswersImmediately: true,
    statusIntent: "draft",
    manualQuestions: [
      { id: "m1", prompt: { en: " 2 + 2 ", zh: "" }, answer: " 4 ", points: 4.6 },
      { id: "bad", prompt: { en: "", zh: "" }, answer: "", points: 10 }
    ]
  });

  assert.equal(result.status, "created");
  if (result.status !== "created") assert.fail("expected manual assessment creation");
  assert.equal(database.assessments[0].id, "assessment-manual-created");
  assert.equal(database.assessments[0].status, "draft");
  assert.deepEqual(database.assessments[0].question_ids, []);
  assert.deepEqual(database.assessments[0].manual_questions, [
    {
      id: "m1",
      prompt: { en: "2 + 2", zh: "2 + 2" },
      answer: "4",
      points: 5
    }
  ]);
  assert.equal(database.assessment_submissions.some((submission) => submission.assessment_id === "assessment-manual-created"), false);
});

test("teacher ops assessment persistence updates draft assessments and publishes submissions", async () => {
  const database = createDatabase();
  database.assessments.unshift({
    id: "assessment-draft",
    class_id: "class-owned",
    title_en: "Draft quiz",
    title_zh: "Draft quiz",
    type: "quiz",
    status: "draft",
    source_type: "question-bank",
    question_ids: ["q-s2"],
    manual_questions: [],
    paper_sections: [],
    max_attempts: 1,
    randomize_question_order: false,
    show_answers_immediately: true,
    grade_weight: 10,
    created_by: "teacher-1",
    created_at: "2026-06-19T00:00:00.000Z",
    updated_at: "2026-06-19T00:00:00.000Z"
  });
  const store = createTestStore(database, ["paper-item-a", "submission-a", "submission-b"]);

  const result = await store.updateTeacherAssessment({
    teacherId: "teacher-1",
    assessmentId: "assessment-draft",
    title: "  Mixed Revision  ",
    type: "test",
    sourceType: "mixed",
    statusIntent: "publish",
    opensAt: "2026-07-03T08:00:00+08:00",
    closesAt: "2026-07-04T08:00:00+08:00",
    timeLimitMinutes: 29.5,
    maxAttempts: 2.2,
    randomizeQuestionOrder: true,
    showAnswersImmediately: false,
    gradeWeight: 8.4,
    paperSections: [
      {
        id: "section-a",
        title: { en: "  Revision  ", zh: "" },
        order: 1,
        items: [
          { id: "", source: "question-bank", questionId: "q-s2", points: 6.4, order: 1 },
          { id: "hidden", source: "question-bank", questionId: "q-hidden", points: 4, order: 2 }
        ]
      }
    ]
  });

  assert.equal(result.status, "updated");
  if (result.status !== "updated") assert.fail("expected assessment update");
  assert.equal(database.assessments[0].title_en, "Mixed Revision");
  assert.equal(database.assessments[0].title_zh, "Mixed Revision");
  assert.equal(database.assessments[0].type, "test");
  assert.equal(database.assessments[0].status, "scheduled");
  assert.equal(database.assessments[0].source_type, "mixed");
  assert.equal(database.assessments[0].source_resource_id, undefined);
  assert.deepEqual(database.assessments[0].question_ids, ["q-s2"]);
  assert.deepEqual(database.assessments[0].manual_questions, []);
  assert.deepEqual(database.assessments[0].paper_sections, [
    {
      id: "section-a",
      title: { en: "Revision", zh: "Revision" },
      instructions: undefined,
      order: 1,
      items: [
        { id: "paper-item-paper-item-a", source: "question-bank", questionId: "q-s2", points: 6, order: 1 }
      ]
    }
  ]);
  assert.equal(database.assessments[0].opens_at, "2026-07-03T00:00:00.000Z");
  assert.equal(database.assessments[0].closes_at, "2026-07-04T00:00:00.000Z");
  assert.equal(database.assessments[0].time_limit_minutes, 30);
  assert.equal(database.assessments[0].max_attempts, 2);
  assert.equal(database.assessments[0].randomize_question_order, true);
  assert.equal(database.assessments[0].show_answers_immediately, false);
  assert.equal(database.assessments[0].grade_weight, 8);
  assert.equal(database.assessments[0].updated_at, "2026-06-20T12:00:00.000Z");
  assert.deepEqual(database.assessment_submissions.slice(-2).map((submission) => ({
    id: submission.id,
    assessment_id: submission.assessment_id,
    student_id: submission.student_id,
    status: submission.status,
    updated_at: submission.updated_at
  })), [
    {
      id: "assessment-submission-submission-a",
      assessment_id: "assessment-draft",
      student_id: "student-a",
      status: "not-started",
      updated_at: "2026-06-20T12:00:00.000Z"
    },
    {
      id: "assessment-submission-submission-b",
      assessment_id: "assessment-draft",
      student_id: "student-b",
      status: "not-started",
      updated_at: "2026-06-20T12:00:00.000Z"
    }
  ]);
  assert.equal(result.assessment.id, "assessment-draft");
});

test("teacher ops assessment persistence rejects unavailable assessment updates", async () => {
  const database = createDatabase();
  database.assessments.unshift({
    id: "assessment-manual-existing",
    class_id: "class-owned",
    title_en: "Manual existing",
    title_zh: "Manual existing",
    type: "quiz",
    status: "draft",
    source_type: "manual",
    question_ids: [],
    manual_questions: [
      { id: "manual-1", prompt: { en: "1 + 1", zh: "1 + 1" }, answer: "2", points: 3 }
    ],
    paper_sections: [],
    max_attempts: 1,
    randomize_question_order: false,
    show_answers_immediately: true,
    grade_weight: 10,
    created_by: "teacher-1",
    created_at: "2026-06-19T00:00:00.000Z",
    updated_at: "2026-06-19T00:00:00.000Z"
  });
  database.assessments.unshift({
    id: "assessment-question-bank-draft",
    class_id: "class-owned",
    title_en: "Question bank draft",
    title_zh: "Question bank draft",
    type: "quiz",
    status: "draft",
    source_type: "question-bank",
    question_ids: ["q-s2"],
    manual_questions: [],
    paper_sections: [],
    max_attempts: 1,
    randomize_question_order: false,
    show_answers_immediately: true,
    grade_weight: 10,
    created_by: "teacher-1",
    created_at: "2026-06-19T00:00:00.000Z",
    updated_at: "2026-06-19T00:00:00.000Z"
  });
  const store = createTestStore(database);

  assert.deepEqual(await store.updateTeacherAssessment({
    teacherId: "student-1",
    assessmentId: "assessment-manual-existing",
    sourceType: "manual"
  }), { status: "forbidden" });
  assert.deepEqual(await store.updateTeacherAssessment({
    teacherId: "teacher-1",
    assessmentId: "missing-assessment",
    sourceType: "manual"
  }), { status: "not-found" });
  assert.deepEqual(await store.updateTeacherAssessment({
    teacherId: "teacher-1",
    assessmentId: "assessment-owned",
    title: "Locked"
  }), { status: "locked" });
  assert.deepEqual(await store.updateTeacherAssessment({
    teacherId: "teacher-1",
    assessmentId: "assessment-manual-existing",
    sourceType: "resource",
    sourceResourceId: "resource-other"
  }), { status: "resource-not-found" });
  assert.deepEqual(await store.updateTeacherAssessment({
    teacherId: "teacher-1",
    assessmentId: "assessment-question-bank-draft",
    sourceType: "manual",
    manualQuestions: []
  }), { status: "invalid" });
});

test("teacher ops assessment persistence creates review-lesson remediation assessments", async () => {
  const database = createDatabase();
  const store = createTestStore(database, ["remediate"]);

  const result = await store.createReviewLessonRemediationAssessment("teacher-1", "review-owned");

  assert.equal(result.status, "created");
  if (result.status !== "created") assert.fail("expected remediation assessment creation");
  assert.equal(database.assessments[0].id, "assessment-remediate");
  assert.equal(database.assessments[0].class_id, "class-owned");
  assert.equal(database.assessments[0].title_en, "Remediation: Owned Review");
  assert.equal(database.assessments[0].title_zh, "补救练习：Owned Review");
  assert.equal(database.assessments[0].type, "quiz");
  assert.equal(database.assessments[0].status, "draft");
  assert.equal(database.assessments[0].source_type, "mixed");
  assert.equal(database.assessments[0].time_limit_minutes, 20);
  assert.equal(database.assessments[0].show_answers_immediately, false);
  assert.equal(database.assessments[0].grade_weight, 0);
  assert.deepEqual(database.assessments[0].paper_sections, [
    {
      id: "section-remediation-assessment-remediate",
      title: { en: "Remediation practice", zh: "课后补救练习", zhHans: "课后补救练习" },
      instructions: {
        en: "Draft assessment generated from reviewed remediation questions.",
        zh: "根据已审核补救题生成的测验草稿。",
        zhHans: "根据已审核补救题生成的测验草稿。"
      },
      order: 0,
      items: [
        {
          id: "remediation-1",
          source: "manual",
          embeddedQuestion: {
            type: "short-answer",
            prompt: { en: "Solve x + 1 = 3", zh: "Solve x + 1 = 3" },
            answer: "x=2",
            explanation: { en: "Subtract 1 from both sides.", zh: "Subtract 1 from both sides." },
            topicId: "topic-s2",
            difficulty: "Medium"
          },
          points: 10,
          order: 0
        }
      ]
    }
  ]);
  assert.equal(database.teacher_review_lessons[0].remediation_assessment_id, "assessment-remediate");
  assert.equal(database.teacher_review_lessons[0].updated_at, "2026-06-20T12:00:00.000Z");
  assert.equal(result.assessment.id, "assessment-remediate");
  assert.equal(result.reviewLesson.remediationAssessmentId, "assessment-remediate");

  const reused = await store.createReviewLessonRemediationAssessment("teacher-1", "review-owned");
  assert.equal(reused.status, "created");
  if (reused.status !== "created") assert.fail("expected remediation assessment reuse");
  assert.equal(reused.assessment.id, "assessment-remediate");
  assert.equal(database.assessments.filter((assessment) => assessment.id === "assessment-remediate").length, 1);
});

test("teacher ops assessment persistence rejects unavailable review-lesson remediation assessment creation", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.createReviewLessonRemediationAssessment("student-1", "review-owned"), { status: "forbidden" });
  assert.deepEqual(await store.createReviewLessonRemediationAssessment("teacher-1", "missing-review"), { status: "not-found" });
  assert.deepEqual(await store.createReviewLessonRemediationAssessment("teacher-1", "review-needs-review"), { status: "needs-review" });
});

test("teacher ops assessment persistence generates review lesson plans", async () => {
  const database = createDatabase();
  const store = createTestStore(database, ["generated-review"]);

  const result = await store.generateTeacherReviewLessonPlan({
    teacherId: "teacher-1",
    assessmentId: "assessment-owned",
    language: "en",
    durationMinutes: 50
  });

  assert.equal(result.status, "generated");
  if (result.status !== "generated") assert.fail("expected review lesson generation");
  assert.equal(database.teacher_review_lessons[0].id, "review-lesson-generated-review");
  assert.equal(database.teacher_review_lessons[0].title_en, "Enriched Draft Owned quiz");
  assert.equal(database.teacher_review_lessons[0].status, "generated");
  assert.equal(database.teacher_review_lessons[0].source_snapshot.submittedCount, 1);
  assert.equal(database.teacher_review_lessons[0].source_snapshot.totalStudents, 2);
  assert.equal(database.teacher_review_lessons[0].source_snapshot.questionCount, 1);
  assert.equal(database.teacher_review_lessons[0].duration_minutes, 50);
  assert.equal(database.teacher_review_lessons[0].generation_notes_en, "analytics:student-a|practice:q-s2-high,q-s2");
  assert.equal(database.teacher_review_lessons[0].updated_at, "2026-06-20T12:00:00.000Z");
  assert.equal(result.reviewLesson.title.en, "Enriched Draft Owned quiz");
  assert.equal(result.reviewLesson.sourceSnapshotStale, false);
});

test("teacher ops assessment persistence rejects unavailable review lesson generation", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.generateTeacherReviewLessonPlan({
    teacherId: "student-1",
    assessmentId: "assessment-owned"
  }), { status: "forbidden" });
  assert.deepEqual(await store.generateTeacherReviewLessonPlan({
    teacherId: "teacher-1",
    assessmentId: "assessment-other"
  }), { status: "not-found" });
});

test("teacher ops assessment persistence builds review lesson detail data", async () => {
  const store = createTestStore(createDatabase());

  const data = await store.getTeacherReviewLessonDetailData("teacher-1", "review-owned");

  assert.equal(data?.reviewLesson.id, "review-owned");
  assert.equal(data?.reviewLesson.sourceSnapshotStale, false);
  assert.equal(data?.assessment.id, "assessment-owned");
  assert.equal(data?.class.id, "class-owned");
  assert.equal(data?.parentSafeDraft?.noticeId, "notice-review-owned");
  assert.equal(data?.parentSafeDraft?.sourceReviewLessonId, "review-owned");
  assert.equal(data?.parentSafeDraft?.className, "Owned S2");
  assert.equal(data?.parentSafeDraft?.teacherName, "Teacher");
  assert.equal(data?.parentSafeDraft?.title.en, "Parent-safe review");
  assert.equal(data?.parentSafeDraft?.summary.zh, "不含學生姓名的摘要。");
  assert.equal(data?.parentSafeDraft?.publishedAt, "2026-06-20T11:00:00.000Z");
  assert.deepEqual(data?.parentSafeDraft?.acknowledgement, {
    total: 2,
    acknowledged: 1,
    pending: 1
  });

  assert.equal(await store.getTeacherReviewLessonDetailData("student-1", "review-owned"), null);
  assert.equal(await store.getTeacherReviewLessonDetailData("teacher-1", "missing-review"), null);
});

test("teacher ops assessment persistence publishes parent-safe review lesson drafts", async () => {
  const existingDatabase = createDatabase();
  const existingStore = createTestStore(existingDatabase);

  const reused = await existingStore.publishTeacherReviewLessonParentDraft({
    teacherId: "teacher-1",
    reviewLessonId: "review-owned"
  });

  assert.equal(reused.status, "published");
  if (reused.status !== "published") assert.fail("expected existing parent draft reuse");
  assert.equal(reused.draft.noticeId, "notice-review-owned");
  assert.equal(existingDatabase.teacher_notices.length, 1);

  const database = createDatabase();
  database.teacher_notices = [];
  database.teacher_notice_recipients = [];
  const store = createTestStore(database, ["parent-draft", "recipient-a", "recipient-b"]);

  const result = await store.publishTeacherReviewLessonParentDraft({
    teacherId: "teacher-1",
    reviewLessonId: "review-owned"
  });

  assert.equal(result.status, "published");
  if (result.status !== "published") assert.fail("expected parent draft publication");
  assert.equal(database.teacher_notices.length, 1);
  assert.equal(database.teacher_notices[0].id, "notice-parent-draft");
  assert.equal(database.teacher_notices[0].status, "queued");
  assert.equal(database.teacher_notices[0].source_kind, "teacher-review-lesson");
  assert.equal(database.teacher_notices[0].source_id, "review-owned");
  assert.equal(database.teacher_notices[0].sent_at, "2026-06-20T12:00:00.000Z");
  assert.equal(database.teacher_notices[0].updated_at, "2026-06-20T12:00:00.000Z");
  assert.match(database.teacher_notices[0].subject_en, /Teacher-approved review/);
  assert.match(database.teacher_notices[0].body_en, /does not include individual student names/);
  assert.deepEqual(database.teacher_notice_recipients.map((recipient) => recipient.id), [
    "notice-recipient-recipient-a",
    "notice-recipient-recipient-b"
  ]);
  assert.deepEqual(database.teacher_notice_recipients.map((recipient) => recipient.student_id), ["student-a", "student-b"]);
  assert.equal(result.draft.noticeId, "notice-parent-draft");
  assert.equal(result.draft.status, "queued");
  assert.equal(result.draft.publishedAt, "2026-06-20T12:00:00.000Z");
  assert.deepEqual(result.draft.acknowledgement, {
    total: 2,
    acknowledged: 0,
    pending: 2
  });
});

test("teacher ops assessment persistence rejects unavailable parent-safe review lesson draft publication", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.publishTeacherReviewLessonParentDraft({
    teacherId: "student-1",
    reviewLessonId: "review-owned"
  }), { status: "forbidden" });
  assert.deepEqual(await store.publishTeacherReviewLessonParentDraft({
    teacherId: "teacher-1",
    reviewLessonId: "missing-review"
  }), { status: "not-found" });
  assert.deepEqual(await store.publishTeacherReviewLessonParentDraft({
    teacherId: "teacher-1",
    reviewLessonId: "review-needs-review"
  }), { status: "needs-review" });
});

test("teacher ops assessment persistence exports review lesson data", async () => {
  const store = createTestStore(createDatabase());

  const json = await store.getTeacherReviewLessonExportData("teacher-1", "review-owned", "json");
  assert.equal(json.status, "ready");
  if (json.status !== "ready") assert.fail("expected JSON export");
  assert.equal(json.mimeType, "application/json; charset=utf-8");
  assert.equal(json.fileName, "Owned_Review.json");
  assert.equal(JSON.parse(Buffer.from(json.bytes).toString("utf8")).id, "review-owned");

  const markdown = await store.getTeacherReviewLessonExportData("teacher-1", "review-owned", "markdown");
  assert.equal(markdown.status, "ready");
  if (markdown.status !== "ready") assert.fail("expected markdown export");
  assert.equal(markdown.mimeType, "text/markdown; charset=utf-8");
  assert.equal(markdown.fileName, "Owned_Review.md");
  assert.equal(Buffer.from(markdown.bytes).toString("utf8"), "# Owned Review\nzh-Hans");

  const pptx = await store.getTeacherReviewLessonExportData("teacher-1", "review-owned", "pptx");
  assert.equal(pptx.status, "ready");
  if (pptx.status !== "ready") assert.fail("expected PPTX export");
  assert.equal(pptx.mimeType, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  assert.equal(pptx.fileName, "Owned_Review.pptx");
  assert.equal(Buffer.from(pptx.bytes).toString("utf8"), "pptx:review-owned");
});

test("teacher ops assessment persistence rejects unavailable review lesson exports", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.getTeacherReviewLessonExportData("student-1", "review-owned", "json"), { status: "forbidden" });
  assert.deepEqual(await store.getTeacherReviewLessonExportData("teacher-1", "missing-review", "json"), { status: "not-found" });
});

test("teacher ops assessment persistence updates review lesson plans", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.updateTeacherReviewLessonPlan({
    teacherId: "teacher-1",
    reviewLessonId: "review-owned",
    title: "  Updated Review  ",
    status: "reviewed",
    objectives: [
      { en: "Focus on equations", zh: "Focus on equations" },
      { en: "Check substitutions", zh: "Check substitutions" }
    ],
    timeline: [
      { id: "warmup", label: { en: "Warm-up", zh: "Warm-up" }, minutes: 5 }
    ],
    items: [
      {
        id: "item-1",
        questionId: "paper-item-1",
        prompt: { en: "Solve", zh: "Solve" },
        maxPoints: 10,
        correctRate: 0,
        correctCount: 0,
        totalResponses: 1,
        wrongCount: 1,
        wrongStudentIds: ["student-a"],
        wrongStudentNames: ["student-a"],
        commonWrongAnswer: "x=2",
        commonWrongAnswerCount: 1,
        category: "must-teach",
        categoryReason: { en: "Low correct rate", zh: "Low correct rate" },
        misconceptionTags: ["solution-steps"],
        teachingScript: { en: "Review inverse operations.", zh: "Review inverse operations." },
        teacherNotes: { en: "Use board example.", zh: "Use board example." },
        order: 0
      }
    ],
    slides: [
      {
        id: "slide-1",
        title: { en: "Equation review", zh: "Equation review" },
        bullets: [{ en: "Subtract first", zh: "Subtract first" }],
        relatedItemIds: ["item-1"],
        speakerNotes: { en: "Ask students to explain.", zh: "Ask students to explain." },
        order: 0
      }
    ],
    boardColumns: [
      {
        id: "board-1",
        title: { en: "Do", zh: "Do" },
        blocks: [{ en: "Line up terms", zh: "Line up terms" }],
        order: 0
      }
    ],
    variationQuestions: [
      {
        id: "variation-1",
        source: "manual",
        prompt: { en: "x + 2 = 5", zh: "x + 2 = 5" },
        answer: "x=3",
        validationStatus: "validated"
      }
    ],
    remediationQuestions: [
      {
        id: "remediation-new",
        source: "manual",
        prompt: { en: "x + 3 = 6", zh: "x + 3 = 6" },
        answer: "x=3",
        validationStatus: "validated"
      }
    ],
    individualGroups: [
      {
        id: "group-a",
        label: { en: "Equation support", zh: "Equation support" },
        itemIds: ["item-1"],
        studentIds: ["student-a"],
        studentNames: ["student-a"],
        guidance: { en: "Small-group check.", zh: "Small-group check." }
      }
    ]
  });

  assert.equal(result.status, "updated");
  if (result.status !== "updated") assert.fail("expected review lesson update");
  assert.equal(database.teacher_review_lessons[0].title_en, "Updated Review");
  assert.equal(database.teacher_review_lessons[0].title_zh, "Updated Review");
  assert.equal(database.teacher_review_lessons[0].status, "reviewed");
  assert.equal(database.teacher_review_lessons[0].reviewed_at, "2026-06-20T12:00:00.000Z");
  assert.equal(database.teacher_review_lessons[0].updated_at, "2026-06-20T12:00:00.000Z");
  assert.deepEqual(database.teacher_review_lessons[0].objectives.map((objective) => objective.en), [
    "Focus on equations",
    "Check substitutions"
  ]);
  assert.deepEqual(database.teacher_review_lessons[0].timeline.map((entry) => entry.id), ["warmup"]);
  assert.deepEqual(database.teacher_review_lessons[0].items.map((item) => item.id), ["item-1"]);
  assert.deepEqual(database.teacher_review_lessons[0].slides.map((slide) => slide.id), ["slide-1"]);
  assert.deepEqual(database.teacher_review_lessons[0].board_columns.map((column) => column.id), ["board-1"]);
  assert.deepEqual(database.teacher_review_lessons[0].variation_questions.map((question) => question.id), ["variation-1"]);
  assert.deepEqual(database.teacher_review_lessons[0].remediation_questions.map((question) => question.id), ["remediation-new"]);
  assert.deepEqual(database.teacher_review_lessons[0].individual_groups.map((group) => group.id), ["group-a"]);
  assert.equal(result.reviewLesson.title.en, "Updated Review");
  assert.equal(result.reviewLesson.reviewedAt, "2026-06-20T12:00:00.000Z");
});

test("teacher ops assessment persistence rejects unavailable review lesson plan updates", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.updateTeacherReviewLessonPlan({
    teacherId: "student-1",
    reviewLessonId: "review-owned",
    status: "reviewed"
  }), { status: "forbidden" });
  assert.deepEqual(await store.updateTeacherReviewLessonPlan({
    teacherId: "teacher-1",
    reviewLessonId: "missing-review",
    status: "reviewed"
  }), { status: "not-found" });
});

test("teacher ops assessment persistence owns durable review lesson record normalization", async () => {
  const storeModule = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as Record<string, unknown>;
  assert.equal(typeof storeModule.normalizeTeacherOpsReviewLessonRecord, "function");

  const normalizeTeacherOpsReviewLessonRecord =
    storeModule.normalizeTeacherOpsReviewLessonRecord as (record: Record<string, unknown>, now: string) => Record<string, unknown>;
  const nowIso = "2026-06-22T02:03:04.000Z";

  assert.deepEqual(normalizeTeacherOpsReviewLessonRecord({
    id: "review-durable",
    teacher_id: "  teacher-1  ",
    class_id: "  class-1  ",
    assessment_id: "  assessment-1  ",
    title_en: "  Review   Linear  ",
    title_zh: "",
    language: "fr",
    duration_minutes: 5,
    status: "archived",
    source: "manual",
    source_snapshot: {
      assessmentId: " assessment-raw ",
      assessmentTitle: { en: "  Snapshot  ", zhHans: "  快照  " },
      classId: "class-source",
      className: "Class source",
      submittedCount: -3.2,
      totalStudents: "7.8",
      questionCount: "bad"
    },
    objectives: "bad",
    timeline: {},
    items: null,
    slides: "bad",
    board_columns: {},
    variation_questions: null,
    remediation_questions: "bad",
    individual_groups: {},
    generation_notes_en: "",
    generation_notes_zh: "",
    remediation_assessment_id: "  remediation-1  "
  }, nowIso), {
    id: "review-durable",
    teacher_id: "teacher-1",
    class_id: "class-1",
    assessment_id: "assessment-1",
    title_en: "Review Linear",
    title_zh: "讲评课",
    language: "zh-Hans",
    duration_minutes: 20,
    status: "draft",
    source: "assessment",
    source_snapshot: {
      assessmentId: " assessment-raw ",
      assessmentTitle: { en: "Snapshot", zh: "快照", zhHans: "快照" },
      classId: "class-source",
      className: "Class source",
      submittedCount: 0,
      totalStudents: 8,
      questionCount: 0,
      generatedAt: nowIso,
      assessmentUpdatedAt: nowIso
    },
    objectives: [],
    timeline: [],
    items: [],
    slides: [],
    board_columns: [],
    variation_questions: [],
    remediation_questions: [],
    individual_groups: [],
    generation_notes_en: "Deterministic review lesson draft.",
    generation_notes_zh: "确定性讲评课草稿。",
    remediation_assessment_id: "remediation-1",
    created_at: nowIso,
    updated_at: nowIso,
    generated_at: nowIso,
    reviewed_at: null
  });

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.match(rootSource, /normalizeTeacherOpsReviewLessonRecord as normalizeTeacherReviewLessonRecordFromTeacherOpsAssessment/);
  assert.doesNotMatch(rootSource, /function normalizeTeacherReviewLessonRecord\b/);
  assert.doesNotMatch(rootSource, /function cleanLessonKitString\b/);
  assert.doesNotMatch(rootSource, /function normalizeLessonKitLocalizedText\b/);
});

test("teacher ops assessment persistence owns review lesson status and source normalization helpers", async () => {
  const storeModule = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );

  assert.equal(typeof storeModule.isValidTeacherReviewLessonStatus, "function");
  assert.equal(typeof storeModule.normalizeTeacherReviewLessonStatus, "function");
  assert.equal(typeof storeModule.normalizeTeacherReviewLessonSource, "function");
  assert.match(helperSource, /export function isValidTeacherReviewLessonStatus\(/);
  assert.match(helperSource, /export function normalizeTeacherReviewLessonStatus\(/);
  assert.match(helperSource, /export function normalizeTeacherReviewLessonSource\(/);
  assert.match(
    rootSource,
    /isValidTeacherReviewLessonStatus as isValidTeacherReviewLessonStatusFromTeacherOpsAssessment/
  );
  assert.doesNotMatch(
    rootSource,
    /normalizeTeacherReviewLessonStatus as normalizeTeacherReviewLessonStatusFromTeacherOpsAssessment/
  );
  assert.doesNotMatch(
    rootSource,
    /normalizeTeacherReviewLessonSource as normalizeTeacherReviewLessonSourceFromTeacherOpsAssessment/
  );
  assert.doesNotMatch(rootSource, /const validTeacherReviewLessonStatuses\b/);
  assert.doesNotMatch(rootSource, /const validTeacherReviewLessonSources\b/);

  const isValidTeacherReviewLessonStatus = storeModule.isValidTeacherReviewLessonStatus as (status: unknown) => boolean;
  const normalizeTeacherReviewLessonStatus = storeModule.normalizeTeacherReviewLessonStatus as (status: unknown) => string;
  const normalizeTeacherReviewLessonSource = storeModule.normalizeTeacherReviewLessonSource as (source: unknown) => string;

  assert.equal(isValidTeacherReviewLessonStatus("reviewed"), true);
  assert.equal(isValidTeacherReviewLessonStatus("archived"), false);
  assert.equal(normalizeTeacherReviewLessonStatus("generated"), "generated");
  assert.equal(normalizeTeacherReviewLessonStatus("archived"), "draft");
  assert.equal(normalizeTeacherReviewLessonSource("frequent-mistakes"), "frequent-mistakes");
  assert.equal(normalizeTeacherReviewLessonSource("manual"), "assessment");
});

test("teacher ops assessment persistence owns assessment paper item source normalization", async () => {
  const storeModule = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );

  assert.equal(typeof storeModule.normalizeAssessmentPaperItemSource, "function");
  assert.match(helperSource, /export function normalizeAssessmentPaperItemSource\(/);
  assert.doesNotMatch(
    rootSource,
    /normalizeAssessmentPaperItemSource as normalizeAssessmentPaperItemSourceFromTeacherOpsAssessment/
  );
  assert.doesNotMatch(rootSource, /const validAssessmentPaperItemSources\b/);

  const normalizeAssessmentPaperItemSource = storeModule.normalizeAssessmentPaperItemSource as (source: unknown) => string;

  assert.equal(normalizeAssessmentPaperItemSource("mistake"), "mistake");
  assert.equal(normalizeAssessmentPaperItemSource("ai-generated"), "ai-generated");
  assert.equal(normalizeAssessmentPaperItemSource("spreadsheet"), "question-bank");
});

test("teacher ops assessment persistence owns assessment type and source validation", async () => {
  const storeModule = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );

  assert.equal(typeof storeModule.isValidAssessmentType, "function");
  assert.equal(typeof storeModule.normalizeAssessmentType, "function");
  assert.equal(typeof storeModule.isValidAssessmentSourceType, "function");
  assert.equal(typeof storeModule.normalizeAssessmentSourceType, "function");
  assert.match(helperSource, /export function isValidAssessmentType\(/);
  assert.match(helperSource, /export function normalizeAssessmentType\(/);
  assert.match(helperSource, /export function isValidAssessmentSourceType\(/);
  assert.match(helperSource, /export function normalizeAssessmentSourceType\(/);
  assert.doesNotMatch(rootSource, /const validAssessmentTypes\b/);
  assert.doesNotMatch(rootSource, /const validAssessmentSourceTypes\b/);

  const isValidAssessmentType = storeModule.isValidAssessmentType as (type: unknown) => boolean;
  const normalizeAssessmentType = storeModule.normalizeAssessmentType as (type: unknown) => string;
  const isValidAssessmentSourceType = storeModule.isValidAssessmentSourceType as (sourceType: unknown) => boolean;
  const normalizeAssessmentSourceType = storeModule.normalizeAssessmentSourceType as (sourceType: unknown) => string;

  assert.equal(isValidAssessmentType("mock-exam"), true);
  assert.equal(isValidAssessmentType("worksheet"), false);
  assert.equal(normalizeAssessmentType("exam"), "exam");
  assert.equal(normalizeAssessmentType("worksheet"), "quiz");
  assert.equal(isValidAssessmentSourceType("mistake-generated"), true);
  assert.equal(isValidAssessmentSourceType("spreadsheet"), false);
  assert.equal(normalizeAssessmentSourceType("mixed"), "mixed");
  assert.equal(normalizeAssessmentSourceType("spreadsheet"), "question-bank");
});

test("teacher ops assessment persistence owns embedded assessment question type normalization", async () => {
  const storeModule = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );

  assert.equal(typeof storeModule.isValidAssessmentQuestionType, "function");
  assert.equal(typeof storeModule.normalizeAssessmentQuestionType, "function");
  assert.match(helperSource, /export function isValidAssessmentQuestionType\(/);
  assert.match(helperSource, /export function normalizeAssessmentQuestionType\(/);
  assert.doesNotMatch(
    rootSource,
    /normalizeAssessmentQuestionType as normalizeAssessmentQuestionTypeFromTeacherOpsAssessment/
  );
  assert.doesNotMatch(rootSource, /const validQuestionTypes\b/);

  const isValidAssessmentQuestionType = storeModule.isValidAssessmentQuestionType as (questionType: unknown) => boolean;
  const normalizeAssessmentQuestionType = storeModule.normalizeAssessmentQuestionType as (questionType: unknown) => string;

  assert.equal(isValidAssessmentQuestionType("graph"), true);
  assert.equal(isValidAssessmentQuestionType("manual"), false);
  assert.equal(isValidAssessmentQuestionType("essay"), false);
  assert.equal(normalizeAssessmentQuestionType("manual"), "manual");
  assert.equal(normalizeAssessmentQuestionType("multiple-choice"), "multiple-choice");
  assert.equal(normalizeAssessmentQuestionType("essay"), "short-answer");
});

test("teacher ops assessment persistence owns assessment status intent semantics instead of a root set", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );

  assert.match(helperSource, /statusIntent\?: "draft" \| "publish"/);
  assert.doesNotMatch(rootSource, /const validAssessmentStatusIntents\b/);
});

test("legacy userStore delegates teacher assessment read models to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(
    source.includes("export const getTeacherAssessmentCreateData = teacherOpsUserStore.getTeacherAssessmentCreateData"),
    true
  );
  assert.equal(
    source.includes("export const getTeacherAssessmentBuilderQuestions = teacherOpsUserStore.getTeacherAssessmentBuilderQuestions"),
    true
  );
  assert.equal(
    source.includes("export const getTeacherAssessmentListData = teacherOpsUserStore.getTeacherAssessmentListData"),
    true
  );
  assert.equal(
    source.includes("export const cloneTeacherAssessment = teacherOpsUserStore.cloneTeacherAssessment"),
    true
  );
  assert.equal(
    source.includes("export const updateTeacherAssessmentAnalysisSettings = teacherOpsUserStore.updateTeacherAssessmentAnalysisSettings"),
    true
  );
  assert.equal(
    source.includes("export const updateTeacherAssessmentSubmissionMarking = teacherOpsUserStore.updateTeacherAssessmentSubmissionMarking"),
    true
  );
  assert.equal(
    source.includes("export const getTeacherAssessmentCsv = teacherOpsUserStore.getTeacherAssessmentCsv"),
    true
  );
  assert.equal(
    source.includes("export const createTeacherAssessment = teacherOpsUserStore.createTeacherAssessment"),
    true
  );
  assert.equal(
    source.includes("export const updateTeacherAssessment = teacherOpsUserStore.updateTeacherAssessment"),
    true
  );
  assert.equal(
    source.includes("export const getTeacherAssessmentDetailData = teacherOpsUserStore.getTeacherAssessmentDetailData"),
    true
  );
  assert.equal(
    source.includes("export const createReviewLessonRemediationAssessment = teacherOpsUserStore.createReviewLessonRemediationAssessment"),
    true
  );
  assert.equal(
    source.includes("export const generateTeacherReviewLessonPlan = teacherOpsUserStore.generateTeacherReviewLessonPlan"),
    true
  );
  assert.equal(
    source.includes("export const getTeacherReviewLessonDetailData = teacherOpsUserStore.getTeacherReviewLessonDetailData"),
    true
  );
  assert.equal(
    source.includes("export const publishTeacherReviewLessonParentDraft = teacherOpsUserStore.publishTeacherReviewLessonParentDraft"),
    true
  );
  assert.equal(
    source.includes("export const getTeacherReviewLessonExportData = teacherOpsUserStore.getTeacherReviewLessonExportData"),
    true
  );
  assert.equal(
    source.includes("export const updateTeacherReviewLessonPlan = teacherOpsUserStore.updateTeacherReviewLessonPlan"),
    true
  );
  assert.equal(/export async function getTeacherAssessmentCreateData\(/.test(source), false);
  assert.equal(/export async function getTeacherAssessmentBuilderQuestions\(/.test(source), false);
  assert.equal(/export async function getTeacherAssessmentListData\(/.test(source), false);
  assert.equal(/export async function cloneTeacherAssessment\(/.test(source), false);
  assert.equal(/export async function updateTeacherAssessmentAnalysisSettings\(/.test(source), false);
  assert.equal(/export async function updateTeacherAssessmentSubmissionMarking\(/.test(source), false);
  assert.equal(/export async function getTeacherAssessmentCsv\(/.test(source), false);
  assert.equal(/export async function createTeacherAssessment\(/.test(source), false);
  assert.equal(/export async function updateTeacherAssessment\(/.test(source), false);
  assert.equal(/export async function getTeacherAssessmentDetailData\(/.test(source), false);
  assert.equal(/export async function createReviewLessonRemediationAssessment\(/.test(source), false);
  assert.equal(/export async function generateTeacherReviewLessonPlan\(/.test(source), false);
  assert.equal(/export async function getTeacherReviewLessonDetailData\(/.test(source), false);
  assert.equal(/export async function publishTeacherReviewLessonParentDraft\(/.test(source), false);
  assert.equal(/export async function getTeacherReviewLessonExportData\(/.test(source), false);
  assert.equal(/export async function updateTeacherReviewLessonPlan\(/.test(source), false);
});

test("teacher ops assessment persistence owns topic, question, paper, question-type, difficulty, localized-text, analysis-settings, curriculum, resource, class, assessment, submission projection, and marking side-effect helpers", async () => {
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const storeSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );
  const storeConfigStart = compatibilitySource.indexOf(
    "const teacherOpsAssessmentPersistenceStore = createTeacherOpsAssessmentPersistenceStore({"
  );
  const storeConfigEnd = compatibilitySource.indexOf(
    "const gamificationSummaryPersistenceStore = createGamificationSummaryPersistenceStore({",
    storeConfigStart
  );

  assert.notEqual(storeConfigStart, -1, "expected teacher ops assessment store config");
  assert.notEqual(storeConfigEnd, -1, "expected next store config boundary");

  const teacherOpsAssessmentConfig = compatibilitySource.slice(storeConfigStart, storeConfigEnd);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /topicOptionProjection:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /questionOptionProjection:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /questionSearchText:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /assessmentPaperSectionsForClone:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /assessmentPaperItemsForMarking:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /questionTypeIsValid:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /difficultyIsActive:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /difficultyMatchesFilter:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /cleanLocalizedAssessmentText/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /normalizeAssessmentAnalysisSettings/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /topicMatchesUserCurriculum:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /questionMatchesUserCurriculum:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /questionMatchesClassCurriculum:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /resourceProjection:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /classProjection:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /assessmentProjection:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /submissionProjection:/);
  assert.doesNotMatch(teacherOpsAssessmentConfig, /afterSubmissionMarked:/);
  assert.doesNotMatch(storeSource, /\btopicOptionProjection\b/);
  assert.doesNotMatch(storeSource, /\bquestionOptionProjection\b/);
  assert.doesNotMatch(storeSource, /\bquestionSearchText\b/);
  assert.doesNotMatch(storeSource, /\bassessmentPaperSectionsForClone\b/);
  assert.doesNotMatch(storeSource, /\bassessmentPaperItemsForMarking\b/);
  assert.doesNotMatch(storeSource, /\bquestionTypeIsValid\b/);
  assert.doesNotMatch(storeSource, /\bdifficultyIsActive\b/);
  assert.doesNotMatch(storeSource, /\bdifficultyMatchesFilter\b/);
  assert.doesNotMatch(storeSource, /\bcleanLocalizedAssessmentText\b/);
  assert.doesNotMatch(storeSource, /\bresourceProjection\b/);
  assert.doesNotMatch(storeSource, /\bclassProjection\b/);
  assert.doesNotMatch(storeSource, /\bassessmentProjection\b/);
  assert.doesNotMatch(storeSource, /\bsubmissionProjection\b/);
  assert.doesNotMatch(storeSource, /\bafterSubmissionMarked\b/);
});

test("teacher ops assessment persistence owns submitted-count helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = {
    assessment_submissions: [
      { assessment_id: "assessment-1", status: "submitted" },
      { assessment_id: "assessment-1", status: "graded" },
      { assessment_id: "assessment-1", status: "late" },
      { assessment_id: "assessment-1", status: "in-progress" },
      { assessment_id: "assessment-2", status: "submitted" }
    ]
  };

  assert.equal(teacherOpsAssessmentSubmittedCount(database, "assessment-1"), 3);
  assert.match(rootSource, /teacherOpsAssessmentSubmittedCount as assessmentSubmittedCountFromTeacherOpsAssessment/);
  assert.doesNotMatch(rootSource, /function assessmentSubmittedCount\b/);
});

test("teacher ops assessment persistence owns assessment projection helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database: TeacherOpsAssessmentPersistenceDatabase = {
    assessment_submissions: [
      { assessment_id: "assessment-1", status: "submitted", score: 7, max_score: 10 },
      { assessment_id: "assessment-1", status: "graded", score: 8, max_score: 10 },
      { assessment_id: "assessment-1", status: "in-progress", score: null, max_score: 10 },
      { assessment_id: "assessment-other", status: "submitted", score: 10, max_score: 10 }
    ],
    assessments: [],
    questions: [],
    teacher_classes: [],
    teaching_resources: [],
    topics: [],
    users: []
  };

  const assessment = toTeacherOpsAssessment(database, {
    id: "assessment-1",
    class_id: "class-1",
    title_en: "Algebra quiz",
    status: "open",
    updated_at: "2026-06-20T10:00:00.000Z",
    paper_sections: [
      {
        id: "section-a",
        title: { en: "Core", zh: "核心" },
        order: 0,
        items: [
          { id: "item-a", source: "question-bank", questionId: "q1", points: 12, order: 0 }
        ]
      }
    ]
  });

  assert.equal(assessment.id, "assessment-1");
  assert.deepEqual(assessment.title, { en: "Algebra quiz", zh: "Algebra quiz" });
  assert.equal(assessment.type, "quiz");
  assert.equal(assessment.sourceType, "question-bank");
  assert.equal(assessment.examGroupId, "assessment-1");
  assert.equal(assessment.submissionCount, 3);
  assert.equal(assessment.submittedCount, 2);
  assert.equal(assessment.paperSections[0]?.items[0]?.points, 12);
  assert.match(rootSource, /toTeacherOpsAssessment as toAssessmentFromTeacherOpsAssessment/);
  assert.doesNotMatch(rootSource, /function toAssessment\(/);
});

test("teacher ops assessment persistence owns assessment paper-section record projection helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const sections = teacherOpsAssessmentPaperSectionsForRecord({
    paper_sections: [
      {
        id: "section-a",
        title: { en: "Core", zh: "核心", zhHans: "核心-简体" },
        instructions: { en: "Show working", zh: "寫出演算", zhHans: "写出演算" },
        order: 0,
        items: [
          { id: "", source: "question-bank", questionId: "q1", points: 0, order: Number.NaN }
        ]
      }
    ]
  });

  assert.equal(sections[0]?.title.zhHans, "核心-简体");
  assert.equal(sections[0]?.instructions?.zhHans, "写出演算");
  assert.equal(sections[0]?.items[0]?.id, "paper-item-1-1");
  assert.equal(sections[0]?.items[0]?.points, 10);
  assert.equal(sections[0]?.items[0]?.order, 0);
  assert.match(rootSource, /teacherOpsAssessmentPaperSectionsForRecord as assessmentPaperSectionsFromTeacherOpsAssessment/);
  assert.doesNotMatch(rootSource, /function assessmentPaperSections\(/);
});

test("teacher ops assessment persistence owns assessment paper-items record helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );
  const items = teacherOpsAssessmentPaperItemsForRecord({
    paper_sections: [
      {
        id: "section-b",
        title: { en: "Later", zh: "Later" },
        order: 2,
        items: [
          { id: "item-b2", source: "question-bank", questionId: "q-b2", points: 1, order: 2 },
          { id: "item-b1", source: "question-bank", questionId: "q-b1", points: 1, order: 1 }
        ]
      },
      {
        id: "section-a",
        title: { en: "Earlier", zh: "Earlier" },
        order: 1,
        items: [
          { id: "item-a1", source: "question-bank", questionId: "q-a1", points: 1, order: 1 }
        ]
      }
    ]
  });

  assert.deepEqual(
    items.map(({ section, item }) => `${section.id}:${item.id}`),
    ["section-a:item-a1", "section-b:item-b1", "section-b:item-b2"]
  );
  assert.match(persistenceSource, /export function teacherOpsAssessmentPaperItemsForRecord\b/);
  assert.doesNotMatch(rootSource, /function assessmentPaperItems\(/);
});

test("teacher ops assessment persistence owns assessment analysis item projection helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database: TeacherOpsAssessmentPersistenceDatabase = {
    assessment_submissions: [],
    assessments: [],
    questions: [
      {
        id: "q-analysis",
        grade: "S2",
        topic_id: "topic-analysis",
        difficulty: "Medium",
        type: "short-answer",
        prompt_en: "Solve x + 1 = 3",
        prompt_zh: "解 x + 1 = 3",
        answer: "x=2",
        explanation_en: "Subtract 1.",
        explanation_zh: "兩邊減 1。"
      }
    ],
    teacher_classes: [],
    teaching_resources: [],
    topics: [
      {
        id: "topic-analysis",
        grade: "S2",
        sort_order: 1,
        title_en: "Linear equations",
        title_zh: "一次方程"
      }
    ],
    users: []
  };

  assert.deepEqual(
    teacherOpsAssessmentAnalysisItems(database, {
      paper_sections: [
        {
          id: "section-analysis",
          title: { en: "Core", zh: "核心" },
          order: 0,
          items: [
            { id: "item-analysis", source: "question-bank", questionId: "q-analysis", points: 6, order: 0 }
          ]
        }
      ]
    }),
    [
      {
        questionId: "item-analysis",
        prompt: { en: "Solve x + 1 = 3", zh: "解 x + 1 = 3" },
        correctAnswer: "x=2",
        explanation: { en: "Subtract 1.", zh: "兩邊減 1。" },
        sectionId: "section-analysis",
        sectionTitle: { en: "Core", zh: "核心" },
        topicId: "topic-analysis",
        topicTitle: { en: "Linear equations", zh: "一次方程" },
        questionType: "short-answer",
        maxPoints: 6
      }
    ]
  );
  assert.match(rootSource, /teacherOpsAssessmentAnalysisItems as assessmentAnalysisItemsFromTeacherOpsAssessment/);
  assert.doesNotMatch(rootSource, /function assessmentAnalysisItems\(/);
});

test("teacher ops assessment persistence owns assessment grade-comparison cohort helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );
  const database = createDatabase();
  const currentClass = database.teacher_classes.find((teacherClass) => teacherClass.id === "class-owned");
  const currentAssessment = database.assessments.find((assessment) => assessment.id === "assessment-owned");
  assert.ok(currentClass);
  assert.ok(currentAssessment);
  currentClass.school_id = "school-1";
  database.teacher_classes.push({
    id: "class-peer",
    teacher_id: "teacher-2",
    school_id: "school-1",
    class_code: "S2-PEER",
    name: "Peer S2",
    grade: "S2",
    academic_year: "2025-2026",
    description_en: "Peer S2 class",
    description_zh: "Peer S2 class",
    invite_code: "CLASS-PEER",
    created_at: "2026-06-07T00:00:00.000Z",
    updated_at: "2026-06-08T00:00:00.000Z"
  });
  database.class_enrollments.push(
    { class_id: "class-peer", student_id: "student-c" },
    { class_id: "class-peer", student_id: "student-d" }
  );
  database.assessments.push({
    id: "assessment-peer",
    class_id: "class-peer",
    title_en: "Peer quiz",
    title_zh: "Peer quiz",
    status: "closed",
    exam_group_id: "old-group",
    analysis_settings: null,
    updated_at: "2026-06-20T10:00:00.000Z"
  });
  database.assessment_submissions.push(
    { assessment_id: "assessment-peer", status: "graded", score: 9, max_score: 10 },
    { assessment_id: "assessment-peer", status: "graded", score: null, max_score: 10 }
  );

  assert.deepEqual(
    teacherOpsAssessmentGradeComparisonCohorts(database, currentAssessment, currentClass),
    [
      {
        classId: "class-owned",
        className: "Owned S2",
        assessmentId: "assessment-owned",
        studentCount: 2,
        scorePercentages: [60]
      },
      {
        classId: "class-peer",
        className: "Peer S2",
        assessmentId: "assessment-peer",
        studentCount: 2,
        scorePercentages: [90]
      }
    ]
  );
  assert.match(persistenceSource, /export function teacherOpsAssessmentGradeComparisonCohorts\b/);
  assert.doesNotMatch(rootSource, /function assessmentGradeComparisonCohorts\(/);
  assert.doesNotMatch(rootSource, /function assessmentSubmissionPercentages\(/);
  assert.doesNotMatch(rootSource, /function assessmentExamGroupId\(/);
});

test("teacher ops assessment persistence owns review lesson analytics helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );
  const submissions: AssessmentSubmission[] = [
    {
      id: "submission-a",
      assessmentId: "assessment-analytics",
      studentId: "student-a",
      studentName: "Ada",
      status: "submitted",
      attemptNumber: 1,
      score: 4,
      maxScore: 10,
      submittedAt: "2026-06-20T09:00:00.000Z",
      gradedAt: null,
      answers: [
        { questionId: "q-1", answer: "x=2", isCorrect: false, pointsEarned: 0, maxPoints: 4 },
        { questionId: "q-2", answer: "6", isCorrect: true, pointsEarned: 4, maxPoints: 4 }
      ],
      updatedAt: "2026-06-20T09:10:00.000Z"
    },
    {
      id: "submission-b",
      assessmentId: "assessment-analytics",
      studentId: "student-b",
      studentName: "Ben",
      status: "graded",
      attemptNumber: 1,
      score: 2,
      maxScore: 10,
      submittedAt: "2026-06-20T09:05:00.000Z",
      gradedAt: "2026-06-20T10:00:00.000Z",
      answers: [
        { questionId: "q-1", answer: "x=2", isCorrect: false, pointsEarned: 0, maxPoints: 4 },
        { questionId: "q-2", answer: "4", isCorrect: false, pointsEarned: 0, maxPoints: 4 }
      ],
      updatedAt: "2026-06-20T10:05:00.000Z"
    },
    {
      id: "submission-c",
      assessmentId: "assessment-analytics",
      studentId: "student-c",
      studentName: "Cy",
      status: "in-progress",
      attemptNumber: 1,
      score: null,
      maxScore: 10,
      submittedAt: null,
      gradedAt: null,
      answers: [
        { questionId: "q-1", answer: "x=3", isCorrect: false, pointsEarned: 0, maxPoints: 4 }
      ],
      updatedAt: "2026-06-20T09:15:00.000Z"
    },
    {
      id: "submission-d",
      assessmentId: "assessment-analytics",
      studentId: "student-d",
      studentName: "Dia",
      status: "late",
      attemptNumber: 1,
      score: 6,
      maxScore: 10,
      submittedAt: "2026-06-20T09:30:00.000Z",
      gradedAt: null,
      answers: [
        { questionId: "q-1", answer: "x=5", isCorrect: null, pointsEarned: 1, maxPoints: 4 }
      ],
      updatedAt: "2026-06-20T09:35:00.000Z"
    }
  ];
  const questionAnalytics: TeacherAssessmentQuestionAnalytics[] = [
    {
      questionId: "q-1",
      prompt: { en: "Solve x + 1 = 3", zh: "Solve x + 1 = 3" },
      maxPoints: 4,
      averagePoints: 1,
      scoreRate: 25,
      difficultyIndex: 25,
      discriminationIndex: null,
      correctRate: 25,
      correctCount: 1,
      totalResponses: 4,
      commonWrongAnswer: "x=2"
    },
    {
      questionId: "q-2",
      prompt: { en: "Evaluate 2 + 4", zh: "Evaluate 2 + 4" },
      maxPoints: 4,
      averagePoints: 2,
      scoreRate: 50,
      difficultyIndex: 50,
      discriminationIndex: null,
      correctRate: 50,
      correctCount: 1,
      totalResponses: 2,
      commonWrongAnswer: null
    }
  ];

  assert.deepEqual(
    teacherOpsAssessmentReviewLessonAnalytics(submissions, questionAnalytics),
    [
      {
        ...questionAnalytics[0],
        wrongStudentIds: ["student-a", "student-b", "student-d"],
        wrongStudentNames: ["Ada", "Ben", "Dia"],
        commonWrongAnswerCount: 2
      },
      {
        ...questionAnalytics[1],
        wrongStudentIds: ["student-b"],
        wrongStudentNames: ["Ben"],
        commonWrongAnswerCount: 1
      }
    ]
  );
  assert.match(persistenceSource, /export function teacherOpsAssessmentReviewLessonAnalytics\b/);
  assert.doesNotMatch(rootSource, /function assessmentReviewLessonAnalytics\(/);
  assert.doesNotMatch(rootSource, /function reviewLessonWrongStats\(/);
  assert.doesNotMatch(rootSource, /function assessmentAnswerIsWrong\(/);
  assert.doesNotMatch(rootSource, /function isCompletedAssessmentSubmission\(/);
});

test("teacher ops assessment persistence owns review lesson practice-bank helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );
  const database = createDatabase();
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === "class-owned");
  assert.ok(teacherClass);

  const practiceBank = teacherOpsReviewLessonPracticeBank(database, teacherClass, [
    {
      questionId: "q-analytics",
      prompt: { en: "Analyze S2 errors", zh: "Analyze S2 errors" },
      maxPoints: 4,
      averagePoints: 1,
      scoreRate: 25,
      difficultyIndex: 25,
      discriminationIndex: null,
      correctRate: 25,
      correctCount: 1,
      totalResponses: 4,
      commonWrongAnswer: null,
      topicId: "topic-s2",
      wrongStudentIds: ["student-a"],
      wrongStudentNames: ["Ada"],
      commonWrongAnswerCount: 1
    }
  ]);

  assert.deepEqual(practiceBank.map((question) => question.questionId), ["q-s2-high", "q-s2"]);
  assert.deepEqual(practiceBank.map((question) => question.topicId), ["topic-s2", "topic-s2"]);
  assert.equal(practiceBank[0]?.answer, "");
  assert.deepEqual(practiceBank[0]?.explanation, { en: "", zh: "", zhHans: "" });
  assert.match(persistenceSource, /export function teacherOpsReviewLessonPracticeBank\b/);
  assert.doesNotMatch(rootSource, /function reviewLessonPracticeBank\(/);
});

test("teacher ops assessment persistence owns review lesson access record helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );
  const database = createDatabase();

  assert.equal(
    teacherOpsReviewLessonRecordFor(database, { id: "teacher-1", role: "teacher" }, "review-owned")?.id,
    "review-owned"
  );
  assert.equal(
    teacherOpsReviewLessonRecordFor(database, { id: "teacher-2", role: "teacher" }, "review-owned"),
    null
  );
  assert.equal(
    teacherOpsReviewLessonRecordFor(database, { id: "admin-1", role: "admin" }, "review-owned")?.id,
    "review-owned"
  );
  assert.equal(
    teacherOpsReviewLessonRecordFor(database, { id: "teacher-1", role: "teacher" }, "missing-review"),
    null
  );
  assert.match(persistenceSource, /export function teacherOpsReviewLessonRecordFor\b/);
  assert.doesNotMatch(rootSource, /function teacherReviewLessonRecordFor\(/);
});

test("teacher ops assessment persistence leaves no legacy root assessment analysis helpers", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );

  assert.match(persistenceSource, /function ensureAssessmentSubmissions\(/);
  assert.match(persistenceSource, /buildTeacherAssessmentAnalysis\(/);
  assert.equal(rootSource.includes("function ensureAssessmentSubmissions("), false);
  assert.equal(rootSource.includes("function buildAssessmentScoreDistribution("), false);
  assert.equal(rootSource.includes("function buildAssessmentQuestionAnalytics("), false);
});

test("teacher ops assessment persistence owns create/update normalization helpers", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );

  [
    "normalizeAssessmentLocalizedText",
    "normalizeEmbeddedQuestion",
    "normalizePaperSectionsInput",
    "assessmentQuestionIdsForSource",
    "normalizeManualQuestions",
    "assessmentHasSubmittedSubmissions"
  ].forEach((helperName) => {
    assert.match(persistenceSource, new RegExp(`function ${helperName}\\(`));
  });
  [
    "cleanLocalizedAssessmentText",
    "isValidAssessmentQuestionForClass",
    "normalizeEmbeddedQuestion",
    "normalizePaperSectionsInput",
    "assessmentQuestionIdsForSource",
    "normalizeManualQuestions",
    "assessmentHasSubmittedSubmissions"
  ].forEach((helperName) => {
    assert.equal(rootSource.includes(`function ${helperName}(`), false);
  });
});

test("teacher ops assessment persistence owns teacher question option projection helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );

  assert.match(persistenceSource, /function questionOptionForRecord\(/);
  assert.equal(rootSource.includes("function teacherQuestionOption("), false);
});

test("teacher ops assessment persistence owns seed assessment records for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );
  const storeModule = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as TeacherOpsAssessmentSeedBoundaryModule;

  const seedAssessmentRecords = storeModule.teacherOpsSeedAssessmentRecords;
  if (typeof seedAssessmentRecords !== "function") {
    assert.fail("Expected teacherOpsSeedAssessmentRecords to be exported");
  }
  assert.match(persistenceSource, /export function teacherOpsSeedAssessmentRecords\b/);
  assert.match(rootSource, /teacherOpsSeedAssessmentRecords as seedAssessmentsFromTeacherOpsAssessment/);
  assert.doesNotMatch(rootSource, /function seedAssessments\b/);

  const allQuestionsAvailable = seedAssessmentRecords("2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-ms-chan",
    questionExists: () => true
  });
  assert.deepEqual(allQuestionsAvailable, [
    {
      id: "assessment-s3-algebra-quiz",
      class_id: "class-s3a-2026",
      title_en: "S3 algebra readiness quiz",
      title_zh: "中三代數預備測驗",
      type: "quiz",
      status: "draft",
      source_type: "question-bank",
      source_resource_id: undefined,
      question_ids: ["q5", "q6"],
      manual_questions: [],
      paper_sections: [],
      opens_at: null,
      closes_at: "2026-06-27T10:00:00.000Z",
      time_limit_minutes: 25,
      max_attempts: 1,
      randomize_question_order: true,
      show_answers_immediately: false,
      grade_weight: 10,
      created_by: "teacher-ms-chan",
      created_at: "2026-06-20T10:00:00.000Z",
      updated_at: "2026-06-20T10:00:00.000Z"
    },
    {
      id: "assessment-us-ca-p1-add-subtract-check",
      class_id: "class-us-ca-p1-2026",
      title_en: "Grade 1 add and subtract check",
      title_zh: "小一加減法檢測",
      type: "quiz",
      status: "open",
      source_type: "question-bank",
      source_resource_id: undefined,
      question_ids: [
        "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-oa-add-subtract-q01",
        "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-oa-add-subtract-q02",
        "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-oa-add-subtract-q03",
        "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-oa-add-subtract-q04"
      ],
      manual_questions: [],
      paper_sections: [],
      opens_at: null,
      closes_at: null,
      time_limit_minutes: null,
      max_attempts: 3,
      randomize_question_order: false,
      show_answers_immediately: true,
      grade_weight: 10,
      created_by: "teacher-scott-us",
      created_at: "2026-06-20T10:00:00.000Z",
      updated_at: "2026-06-20T10:00:00.000Z"
    }
  ]);

  const filteredQuestions = seedAssessmentRecords("2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-ms-chan",
    questionExists: (questionId) => questionId === "q5"
  });
  assert.deepEqual(filteredQuestions.map((assessment) => assessment.question_ids), [["q5"], []]);
});

test("the demo classroom seeds one assessment a student can actually open", () => {
  // A draft assessment renders "Assessment unavailable" for every student, so the
  // seed must also carry an open one on a class the demo student is enrolled in.
  const openable = teacherOpsSeedAssessmentRecords("2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-ms-chan",
    questionExists: () => true
  }).filter((assessment) => assessment.status === "open");

  assert.ok(openable.length >= 1, "at least one seeded assessment must be open to students");
  for (const assessment of openable) {
    assert.ok(assessment.question_ids.length > 0, `${assessment.id} must have questions`);
    assert.equal(assessment.opens_at, null, `${assessment.id} must not wait for a start date`);
    assert.equal(assessment.closes_at, null, `${assessment.id} must not go stale as the demo data ages`);
  }
});

test("teacher ops assessment persistence owns seed assessment submission records for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsAssessmentPersistence.ts"),
    "utf8"
  );
  const storeModule = await import("@/lib/server/userStore/teacherOpsAssessmentPersistence") as TeacherOpsAssessmentSeedBoundaryModule;

  const seedAssessmentSubmissionRecords = storeModule.teacherOpsSeedAssessmentSubmissionRecords;
  if (typeof seedAssessmentSubmissionRecords !== "function") {
    assert.fail("Expected teacherOpsSeedAssessmentSubmissionRecords to be exported");
  }
  assert.match(persistenceSource, /export function teacherOpsSeedAssessmentSubmissionRecords\b/);
  assert.match(rootSource, /teacherOpsSeedAssessmentSubmissionRecords as seedAssessmentSubmissionsFromTeacherOpsAssessment/);
  assert.doesNotMatch(rootSource, /function seedAssessmentSubmissions\b/);

  assert.deepEqual(
    seedAssessmentSubmissionRecords("2026-06-20T10:00:00.000Z", {
      demoUserId: "student-peter",
      shouldSeedDemoUser: () => false
    }),
    []
  );

  assert.deepEqual(
    seedAssessmentSubmissionRecords("2026-06-20T10:00:00.000Z", {
      demoUserId: "student-peter",
      shouldSeedDemoUser: () => true
    }),
    [
      {
        id: "assessment-submission-s3-algebra-peter",
        assessment_id: "assessment-s3-algebra-quiz",
        student_id: "student-peter",
        status: "graded",
        attempt_number: 1,
        score: 72,
        max_score: 100,
        submitted_at: "2026-06-20T10:00:00.000Z",
        graded_at: "2026-06-20T10:00:00.000Z",
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
        updated_at: "2026-06-20T10:00:00.000Z"
      }
    ]
  );
});

test("teacher ops assessment persistence owns assessment submission projection helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database: TeacherOpsAssessmentPersistenceDatabase = {
    assessment_submissions: [],
    assessments: [],
    questions: [],
    student_profiles: [{ user_id: "student-a", name: "Ada Student" }],
    teacher_classes: [],
    teaching_resources: [],
    topics: [],
    users: []
  };

  assert.deepEqual(
    toTeacherOpsAssessmentSubmission(database, {
      id: "submission-1",
      assessment_id: "assessment-1",
      student_id: "student-a",
      status: "submitted",
      attempt_number: 2,
      score: 7,
      max_score: 10,
      submitted_at: "2026-06-20T09:00:00.000Z",
      graded_at: null,
      answers: [
        {
          questionId: "q1",
          answer: "42",
          isCorrect: true,
          pointsEarned: 7,
          maxPoints: 10
        }
      ],
      updated_at: "2026-06-20T10:00:00.000Z"
    }),
    {
      id: "submission-1",
      assessmentId: "assessment-1",
      studentId: "student-a",
      studentName: "Ada Student",
      status: "submitted",
      attemptNumber: 2,
      score: 7,
      maxScore: 10,
      submittedAt: "2026-06-20T09:00:00.000Z",
      gradedAt: null,
      answers: [
        {
          questionId: "q1",
          answer: "42",
          isCorrect: true,
          pointsEarned: 7,
          maxPoints: 10,
          teacherFeedback: null
        }
      ],
      updatedAt: "2026-06-20T10:00:00.000Z"
    }
  );
  assert.doesNotMatch(rootSource, /function toAssessmentSubmission\b/);
});

test("teacher ops assessment persistence owns review lesson projection and record helpers", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = createDatabase();
  const record = database.teacher_review_lessons.find((candidate) => candidate.id === "review-owned");
  assert.ok(record);

  const plan = toTeacherOpsReviewLesson(database, record);
  assert.equal(plan.id, "review-owned");
  assert.equal(plan.className, "Owned S2");
  assert.equal(plan.sourceSnapshotStale, false);
  assert.equal(plan.title.zhHans, "Owned Review");
  assert.equal(
    teacherOpsReviewLessonSnapshotIsStale(database, {
      ...record,
      source_snapshot: {
        ...record.source_snapshot,
        submittedCount: 0
      }
    }),
    true
  );

  const stored = teacherOpsReviewLessonToRecord(plan);
  assert.equal(stored.id, "review-owned");
  assert.equal(stored.title_zh, "Owned Review");
  assert.equal(stored.board_columns, plan.boardColumns);
  assert.doesNotMatch(rootSource, /function reviewLessonSnapshotIsStale\(/);
  assert.doesNotMatch(rootSource, /function toTeacherReviewLesson\(/);
  assert.doesNotMatch(rootSource, /function teacherReviewLessonToRecord\(/);
});
