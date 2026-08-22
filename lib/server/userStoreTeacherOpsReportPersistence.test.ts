import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsReportPersistenceStore,
  teacherOpsReportAverage,
  teacherOpsReportClassStudentPairs,
  teacherOpsReportPercent,
  type TeacherOpsReportPersistenceDatabase,
  type TeacherOpsReportPersistenceStoreDependencies
} from "@/lib/server/userStore/teacherOpsReportPersistence";
import type { GradeId, TeacherClass, TeacherReport, TeacherReportPreview, TeacherReportsData } from "@/types";

type TeacherOpsReportSeedBoundaryModule = {
  normalizeTeacherOpsReportCollections?: (
    collections: {
      teacher_reports?: TeacherOpsReportPersistenceDatabase["teacher_reports"];
    },
    now: string,
    options: {
      demoTeacherId: string;
      demoUserId: string;
      shouldSeedDemoUser: () => boolean;
    }
  ) => {
    teacher_reports: TeacherOpsReportPersistenceDatabase["teacher_reports"];
  };
  teacherOpsSeedTeacherReportRecords?: (
    now: string,
    options: {
      demoTeacherId: string;
      demoUserId: string;
      shouldSeedDemoUser: () => boolean;
    }
  ) => TeacherOpsReportPersistenceDatabase["teacher_reports"];
};

function previewFixture(patch: Partial<TeacherReportPreview> = {}): TeacherReportPreview {
  return {
    id: "preview-1",
    type: "class",
    language: "en",
    title: "Weekly Growth Report",
    subtitle: "S3 Algebra",
    generatedAt: "2026-06-20T10:00:00.000Z",
    subjectName: "Class 3A",
    classId: "class-1",
    className: "3A",
    metrics: {
      learningMinutes: 120,
      masteryChange: 8,
      averageMastery: 76,
      accuracy: 82,
      completionRate: null
    },
    strengths: ["Linear equations"],
    weaknesses: ["Factorisation"],
    mistakeTypes: ["Sign errors"],
    suggestedPractice: ["Complete 5 targeted items"],
    teacherRemarks: "Use think-aloud prompts.",
    ...patch
  };
}

function createDatabase(): TeacherOpsReportPersistenceDatabase {
  return {
    class_enrollments: [
      { class_id: "class-1", student_id: "student-1" }
    ],
    student_profiles: [
      {
        user_id: "teacher-1",
        name: "Tess Teacher",
        grade: "S3"
      },
      {
        user_id: "student-1",
        name: "Ada Student",
        grade: "S3"
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        teacher_id: "teacher-1",
        name: "3A"
      }
    ],
    teacher_reports: [
      {
        id: "report-existing",
        type: "class",
        title_en: "Existing",
        title_zh: "Existing",
        class_id: "class-1",
        generated_by: "teacher-1",
        generated_at: "2026-06-19T00:00:00.000Z",
        summary_en: "Existing summary",
        summary_zh: "Existing summary"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "student-1", role: "student" }
    ]
  };
}

function createTestStore(database: TeacherOpsReportPersistenceDatabase) {
  const dependencies: TeacherOpsReportPersistenceStoreDependencies = {
    createId: () => "report-new",
    now: () => new Date("2026-06-21T10:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  };
  return createTeacherOpsReportPersistenceStore(dependencies);
}

function createReportPreviewDatabase(): TeacherOpsReportPersistenceDatabase {
  return {
    ai_tutor_messages: [],
    assessment_submissions: [
      {
        id: "assessment-submission-1",
        assessment_id: "assessment-1",
        student_id: "student-1",
        status: "submitted"
      }
    ],
    assessments: [
      {
        id: "assessment-1",
        class_id: "class-1",
        title_en: "Linear Quiz",
        title_zh: "一次方程小測",
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    assignments: [
      {
        id: "assignment-1",
        class_id: "class-1",
        title_en: "Linear Homework",
        title_zh: "一次方程作業",
        updated_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    attempts: [
      {
        id: "attempt-1",
        user_id: "student-1",
        question_id: "question-1",
        is_correct: true,
        duration_seconds: 120,
        created_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "attempt-2",
        user_id: "student-2",
        question_id: "question-2",
        is_correct: false,
        duration_seconds: 60,
        created_at: "2026-05-20T08:00:00.000Z"
      },
      {
        id: "attempt-3",
        user_id: "student-2",
        question_id: "question-1",
        is_correct: false,
        duration_seconds: 60,
        created_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    class_enrollments: [
      { class_id: "class-1", student_id: "student-1" },
      { class_id: "class-1", student_id: "student-2" }
    ],
    learning_events: [
      {
        id: "event-1",
        user_id: "student-1",
        type: "lesson-complete",
        topic_id: "topic-1",
        duration_seconds: 60,
        created_at: "2026-06-20T08:10:00.000Z"
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-1",
        mastery: 80
      },
      {
        user_id: "student-2",
        topic_id: "topic-1",
        mastery: 60
      },
      {
        user_id: "student-1",
        topic_id: "topic-2",
        mastery: 45
      },
      {
        user_id: "student-2",
        topic_id: "topic-2",
        mastery: 55
      }
    ],
    mistakes: [
      {
        user_id: "student-2",
        question_id: "question-2",
        wrong_attempts: 3
      }
    ],
    questions: [
      {
        id: "question-1",
        topic_id: "topic-1"
      },
      {
        id: "question-2",
        topic_id: "topic-2"
      }
    ],
    school_memberships: [],
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada Student",
        grade: "S3"
      },
      {
        user_id: "student-2",
        name: "Ben Student",
        grade: "S3"
      }
    ],
    submissions: [
      {
        id: "submission-1",
        assignment_id: "assignment-1",
        student_id: "student-1",
        status: "submitted"
      },
      {
        id: "submission-2",
        assignment_id: "assignment-1",
        student_id: "student-2",
        status: "pending"
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        teacher_id: "teacher-1",
        name: "3A",
        grade: "S3",
        class_code: "3A-2026",
        description_en: "Algebra class",
        description_zh: "代數班",
        invite_code: "JOIN3A",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-06-20T00:00:00.000Z"
      }
    ],
    teacher_reports: [
      {
        id: "report-existing",
        type: "class",
        title_en: "Existing",
        title_zh: "Existing",
        class_id: "class-1",
        generated_by: "teacher-1",
        generated_at: "2026-06-19T00:00:00.000Z",
        summary_en: "Existing summary",
        summary_zh: "Existing summary"
      }
    ],
    topics: [
      {
        id: "topic-1",
        grade: "S3",
        title_en: "Linear equations",
        title_zh: "一次方程",
        curriculum_track: "HK",
        curriculum_region: "HK",
        textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
        sort_order: 1
      },
      {
        id: "topic-2",
        grade: "S3",
        title_en: "Factorisation",
        title_zh: "因式分解",
        curriculum_track: "HK",
        curriculum_region: "HK",
        textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
        sort_order: 2
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" }
    ]
  } as TeacherOpsReportPersistenceDatabase;
}

function expectedTeacherClass(): TeacherClass {
  return {
    id: "class-1",
    teacherId: "teacher-1",
    schoolId: undefined,
    classCode: "3A-2026",
    name: "3A",
    grade: "S3" as GradeId,
    curriculumTrack: "HK",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
    },
    description: {
      en: "Algebra class",
      zh: "代數班"
    },
    studentCount: 2,
    inviteCode: "JOIN3A",
    academicYear: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z"
  };
}

function createReportListDatabase(): TeacherOpsReportPersistenceDatabase {
  return {
    student_profiles: [],
    school_memberships: [
      {
        user_id: "teacher-1",
        class_id: "class-shared",
        role: "teacher"
      }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        name: "Owned"
      },
      {
        id: "class-shared",
        teacher_id: "teacher-2",
        name: "Shared"
      },
      {
        id: "class-other",
        teacher_id: "teacher-2",
        name: "Other"
      }
    ],
    teacher_reports: [
      {
        id: "report-other-new",
        type: "class",
        title_en: "Other",
        title_zh: "Other",
        class_id: "class-other",
        generated_by: "teacher-2",
        generated_at: "2026-06-22T00:00:00.000Z",
        summary_en: "Other summary",
        summary_zh: "Other summary"
      },
      {
        id: "report-shared",
        type: "class",
        title_en: "Shared",
        title_zh: "Shared",
        class_id: "class-shared",
        generated_by: "teacher-2",
        generated_at: "2026-06-21T00:00:00.000Z",
        summary_en: "Shared summary",
        summary_zh: "Shared summary"
      },
      {
        id: "report-unscoped",
        type: "parent-summary",
        title_en: "Unscoped",
        title_zh: "Unscoped",
        generated_by: "teacher-1",
        generated_at: "2026-06-20T00:00:00.000Z",
        summary_en: "Unscoped summary",
        summary_zh: "Unscoped summary",
        preview_json: JSON.stringify(previewFixture({ type: "parent-summary", title: "Unscoped" }))
      },
      {
        id: "report-owned-old",
        type: "class",
        title_en: "Owned",
        title_zh: "Owned",
        class_id: "class-owned",
        generated_by: "teacher-1",
        generated_at: "2026-06-19T00:00:00.000Z",
        summary_en: "Owned summary",
        summary_zh: "Owned summary"
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

test("teacher ops report persistence saves previews without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsReportPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const result = await createTestStore(database).saveTeacherReportPreview("teacher-1", previewFixture());

  assert.equal(result.status, "saved");
  assert.deepEqual(result.report, {
    id: "report-new",
    type: "class",
    title: {
      en: "Weekly Growth Report",
      zh: "Weekly Growth Report"
    },
    classId: "class-1",
    studentId: undefined,
    generatedBy: "teacher-1",
    generatedAt: "2026-06-20T10:00:00.000Z",
    summary: {
      en: "S3 Algebra\nAverage mastery: 76%\nLearning minutes: 120\nSuggested practice: Complete 5 targeted items",
      zh: "S3 Algebra\n平均掌握：76%\n學習時長：120 分鐘\n建議練習：Complete 5 targeted items"
    },
    preview: undefined
  });
  assert.deepEqual(database.teacher_reports.map((report) => report.id), ["report-new", "report-existing"]);
});

test("teacher ops report persistence stores parent-summary preview JSON and rejects forbidden users", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const preview = previewFixture({
    type: "parent-summary",
    studentId: "student-1",
    subjectName: "Ada Student",
    className: "3A"
  });

  const result = await store.saveTeacherReportPreview("teacher-1", preview);

  assert.equal(result.status, "saved");
  assert.equal(result.report.studentId, "student-1");
  assert.deepEqual(result.report.preview, JSON.parse(JSON.stringify(preview)));
  assert.deepEqual(await store.saveTeacherReportPreview("student-1", preview), { status: "forbidden" });
});

test("parent-summary preview rejects a student outside the requested accessible class", async () => {
  const database = createReportPreviewDatabase();
  database.users.push({ id: "teacher-2", role: "teacher" }, { id: "student-3", role: "student" });
  database.student_profiles.push({ user_id: "student-3", name: "Outside Student", grade: "S3" });
  database.teacher_classes.push({ id: "class-2", teacher_id: "teacher-2", name: "Other Class", grade: "S3" });
  database.class_enrollments?.push({ class_id: "class-2", student_id: "student-3" });

  const preview = await createTestStore(database).getTeacherReportPreview({
    teacherId: "teacher-1",
    type: "parent-summary",
    language: "en",
    classId: "class-1",
    studentId: "student-3"
  });

  assert.equal(preview, null);
});

test("parent-summary preview carries the authorized stable class and student ids", async () => {
  const preview = await createTestStore(createReportPreviewDatabase()).getTeacherReportPreview({
    teacherId: "teacher-1",
    type: "parent-summary",
    language: "en",
    classId: "class-1",
    studentId: "student-1"
  });

  assert.equal(preview?.classId, "class-1");
  assert.equal(preview?.studentId, "student-1");
});

for (const type of ["student", "parent-summary"] as const) {
  test(`${type} preview requires explicit non-empty classId and studentId`, async () => {
    const store = createTestStore(createDatabase());

    const missingClassId = await store.getTeacherReportPreview({
      teacherId: "teacher-1",
      type,
      language: "en",
      studentId: "student-1"
    });
    const emptyClassId = await store.getTeacherReportPreview({
      teacherId: "teacher-1",
      type,
      language: "en",
      classId: "",
      studentId: "student-1"
    });
    const missingStudentId = await store.getTeacherReportPreview({
      teacherId: "teacher-1",
      type,
      language: "en",
      classId: "class-1"
    });
    const emptyStudentId = await store.getTeacherReportPreview({
      teacherId: "teacher-1",
      type,
      language: "en",
      classId: "class-1",
      studentId: ""
    });

    assert.deepEqual(
      { missingClassId, emptyClassId, missingStudentId, emptyStudentId },
      { missingClassId: null, emptyClassId: null, missingStudentId: null, emptyStudentId: null }
    );
  });

  test(`${type} save rejects missing or empty stable ids without inserting`, async () => {
    const database = createDatabase();
    const store = createTestStore(database);
    const originalReportIds = database.teacher_reports.map((report) => report.id);

    const results = await Promise.all([
      store.saveTeacherReportPreview("teacher-1", previewFixture({ type, classId: undefined, studentId: "student-1" })),
      store.saveTeacherReportPreview("teacher-1", previewFixture({ type, classId: "", studentId: "student-1" })),
      store.saveTeacherReportPreview("teacher-1", previewFixture({ type, classId: "class-1", studentId: undefined })),
      store.saveTeacherReportPreview("teacher-1", previewFixture({ type, classId: "class-1", studentId: "" }))
    ]);

    assert.deepEqual(results, Array.from({ length: 4 }, () => ({ status: "not-found" })));
    assert.deepEqual(database.teacher_reports.map((report) => report.id), originalReportIds);
  });
}

test("student-scoped report preview never derives a class from studentId", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsReportPersistence.ts"), "utf8");

  assert.doesNotMatch(source, /teacherClassForStudent/);
});

test("parent-summary save binds stable ids instead of duplicate display names", async () => {
  const database = createDatabase();
  database.users.push({ id: "teacher-2", role: "teacher" }, { id: "student-other", role: "student" });
  database.teacher_classes.unshift({ id: "class-other", teacher_id: "teacher-2", name: "3A" });
  database.student_profiles.unshift({ user_id: "student-other", name: "Ada Student", grade: "S3" });
  const store = createTestStore(database);

  const result = await store.saveTeacherReportPreview("teacher-1", previewFixture({
    type: "parent-summary",
    classId: "class-1",
    studentId: "student-1",
    subjectName: "Ada Student"
  }));

  assert.equal(result.status, "saved");
  assert.equal(result.report.classId, "class-1");
  assert.equal(result.report.studentId, "student-1");
});

test("parent-summary save rejects stable ids outside the teacher scope", async () => {
  const database = createDatabase();
  database.users.push({ id: "teacher-2", role: "teacher" }, { id: "student-other", role: "student" });
  database.teacher_classes.push({ id: "class-other", teacher_id: "teacher-2", name: "Other" });
  database.student_profiles.push({ user_id: "student-other", name: "Other Student", grade: "S3" });
  database.class_enrollments = [{ class_id: "class-other", student_id: "student-other" }];
  const store = createTestStore(database);

  const result = await store.saveTeacherReportPreview("teacher-1", previewFixture({
    type: "parent-summary",
    classId: "class-other",
    studentId: "student-other",
    subjectName: "Other Student",
    className: "Other"
  }));

  assert.deepEqual(result, { status: "not-found" });
  assert.equal(database.teacher_reports.some((report) => report.student_id === "student-other"), false);
});

test("teacher ops report persistence lists scoped reports without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsReportPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const reports = await createTestStore(createReportListDatabase()).getTeacherReports("teacher-1");

  assert.deepEqual(reports?.map((report: TeacherReport) => report.id), [
    "report-shared",
    "report-unscoped",
    "report-owned-old"
  ]);
  assert.equal(reports?.[1]?.preview?.title, "Unscoped");
});

test("teacher ops report persistence supports admins and rejects non-teachers", async () => {
  const store = createTestStore(createReportListDatabase());

  assert.deepEqual((await store.getTeacherReports("admin-1"))?.map((report: TeacherReport) => report.id), [
    "report-other-new",
    "report-shared",
    "report-unscoped",
    "report-owned-old"
  ]);
  assert.equal(await store.getTeacherReports("student-1"), null);
  assert.equal(await store.getTeacherReports("missing-user"), null);
});

test("teacher ops report persistence builds class report previews without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsReportPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const store = createTestStore(createReportPreviewDatabase());
  const preview = await (store as typeof store & {
    getTeacherReportPreview(input: {
      teacherId: string;
      type: "class";
      language: "en";
      classId: string;
      teacherRemarks: string;
    }): Promise<TeacherReportPreview | null>;
  }).getTeacherReportPreview({
    teacherId: "teacher-1",
    type: "class",
    language: "en",
    classId: "class-1",
    teacherRemarks: "Bring manipulatives."
  });

  assert.equal(preview?.id, "preview-class-student-1-student-2");
  assert.equal(preview?.title, "Class weekly report");
  assert.equal(preview?.subtitle, "3A");
  assert.equal(preview?.subjectName, "3A");
  assert.equal(preview?.metrics.averageMastery, 60);
  assert.equal(preview?.metrics.learningMinutes, 4);
  assert.equal(preview?.metrics.accuracy, 50);
  assert.equal(preview?.metrics.masteryChange, 30);
  assert.deepEqual(preview?.strengths, ["Linear equations (70%)"]);
  assert.deepEqual(preview?.weaknesses, ["Factorisation (50%)"]);
  assert.deepEqual(preview?.mistakeTypes, ["Factorisation: 3 wrong attempts"]);
  assert.deepEqual(preview?.suggestedPractice, ["Redo Factorisation (50%)"]);
  assert.equal(preview?.teacherRemarks, "Bring manipulatives.");
});

test("teacher ops report persistence builds report page data without eager preview generation", async () => {
  const store = createTestStore(createReportPreviewDatabase());
  const data = await (store as typeof store & {
    getTeacherReportsData(userId: string, options?: { includeDefaultPreview?: boolean }): Promise<TeacherReportsData | null>;
  }).getTeacherReportsData("teacher-1");

  assert.equal(data?.generatedAt, "2026-06-21T10:00:00.000Z");
  assert.deepEqual(data?.classes, [expectedTeacherClass()]);
  assert.deepEqual(data?.students.map((target) => target.label.en), ["Ada Student · 3A", "Ben Student · 3A"]);
  assert.deepEqual(data?.assignments.map((target) => target.label.en), ["Linear Homework"]);
  assert.deepEqual(data?.assessments.map((target) => target.label.en), ["Linear Quiz"]);
  assert.deepEqual(data?.reportHistory.map((report) => report.id), ["report-existing"]);
  assert.equal(data?.defaultPreview, null);
  assert.equal((await (store as typeof store & {
    getTeacherReportsData(userId: string, options?: { includeDefaultPreview?: boolean }): Promise<TeacherReportsData | null>;
  }).getTeacherReportsData("teacher-1", { includeDefaultPreview: true }))?.defaultPreview?.title, "班級周報");
  assert.equal(await (store as typeof store & {
    getTeacherReportsData(userId: string, options?: { includeDefaultPreview?: boolean }): Promise<TeacherReportsData | null>;
  }).getTeacherReportsData("student-1"), null);
});

test("teacher ops report persistence owns report projection helpers", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsReportPersistence") as Record<string, unknown>;
  const readTeacherOpsReportPreview = helpers.readTeacherOpsReportPreview as (
    value?: string
  ) => TeacherReportPreview | undefined;
  const toTeacherOpsReport = helpers.toTeacherOpsReport as (record: {
    id: string;
    type: TeacherReport["type"];
    title_en: string;
    title_zh: string;
    class_id?: string;
    student_id?: string;
    generated_by: string;
    generated_at: string;
    summary_en: string;
    summary_zh: string;
    preview_json?: string;
  }) => TeacherReport;
  const preview = previewFixture();

  assert.equal(typeof helpers.readTeacherOpsReportPreview, "function");
  assert.equal(typeof helpers.toTeacherOpsReport, "function");
  assert.deepEqual(readTeacherOpsReportPreview(JSON.stringify(preview)), preview);
  assert.throws(() => readTeacherOpsReportPreview("not-json"), /Invalid teacher report preview/);
  assert.throws(
    () => readTeacherOpsReportPreview(JSON.stringify({
      ...preview,
      strengths: [{ answerText: "raw minor answer", providerMessageId: "private-provider-id" }]
    })),
    /Invalid teacher report preview/
  );
  assert.deepEqual(toTeacherOpsReport({
    id: "report-1",
    type: "class",
    title_en: "Class report",
    title_zh: "Class report",
    class_id: "class-1",
    generated_by: "teacher-1",
    generated_at: "2026-06-21T10:00:00.000Z",
    summary_en: "Summary",
    summary_zh: "Summary",
    preview_json: JSON.stringify(preview)
  }), {
    id: "report-1",
    type: "class",
    title: {
      en: "Class report",
      zh: "Class report"
    },
    classId: "class-1",
    studentId: undefined,
    generatedBy: "teacher-1",
    generatedAt: "2026-06-21T10:00:00.000Z",
    summary: {
      en: "Summary",
      zh: "Summary"
    },
    preview
  });
  assert.doesNotMatch(rootSource, /function toTeacherReport\(/);
  assert.doesNotMatch(rootSource, /function readTeacherReportPreview\(/);
});

test("teacher ops report persistence owns learning-minute aggregation helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsReportPersistence.ts"),
    "utf8"
  );

  assert.match(persistenceSource, /function studentLearningMinutes\(/);
  assert.equal(rootSource.includes("function studentLearningMinutes("), false);
});

test("teacher ops report persistence owns class-student pair helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsReportPersistence.ts"),
    "utf8"
  );
  const database = createReportPreviewDatabase();

  assert.match(persistenceSource, /function teacherClassStudentPairs\(/);
  assert.match(persistenceSource, /export const teacherOpsReportClassStudentPairs = teacherClassStudentPairs;/);
  assert.match(rootSource, /teacherOpsReportClassStudentPairs as teacherClassStudentPairsFromTeacherOpsReport/);
  assert.doesNotMatch(rootSource, /function teacherClassStudentPairs\(/);
  assert.deepEqual(
    teacherOpsReportClassStudentPairs(database, [{ id: "class-1" } as TeacherOpsReportPersistenceDatabase["teacher_classes"][number]]),
    [
      { classId: "class-1", studentId: "student-1" },
      { classId: "class-1", studentId: "student-2" }
    ]
  );
  assert.deepEqual(teacherOpsReportClassStudentPairs(database, []), []);
});

test("teacher ops report persistence owns finite average helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsReportPersistence.ts"),
    "utf8"
  );

  assert.match(persistenceSource, /function average\(/);
  assert.match(persistenceSource, /export const teacherOpsReportAverage = average;/);
  assert.match(rootSource, /teacherOpsReportAverage as averageFromTeacherOpsReport/);
  assert.doesNotMatch(rootSource, /function average\(/);
  assert.equal(teacherOpsReportAverage([1, 2, 3, Number.NaN, Infinity]), 2);
  assert.equal(teacherOpsReportAverage([]), null);
  assert.equal(teacherOpsReportAverage([Number.NaN, Infinity]), null);
});

test("teacher ops report persistence owns percent helper", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsReportPersistence.ts"),
    "utf8"
  );

  assert.match(persistenceSource, /function percent\(/);
  assert.match(persistenceSource, /export const teacherOpsReportPercent = percent;/);
  assert.doesNotMatch(rootSource, /teacherOpsReportPercent as percentFromTeacherOpsReport/);
  assert.doesNotMatch(rootSource, /function percent\(/);
  assert.equal(teacherOpsReportPercent(2, 4), 50);
  assert.equal(teacherOpsReportPercent(1, 3), 33);
  assert.equal(teacherOpsReportPercent(1, 0), 0);
});

test("teacher ops report persistence owns seed teacher report records for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsReportPersistence.ts"),
    "utf8"
  );
  const reportModule = await import("@/lib/server/userStore/teacherOpsReportPersistence") as TeacherOpsReportSeedBoundaryModule;

  const seedTeacherReportRecords = reportModule.teacherOpsSeedTeacherReportRecords;
  if (typeof seedTeacherReportRecords !== "function") {
    assert.fail("Expected teacherOpsSeedTeacherReportRecords to be exported");
  }
  assert.match(persistenceSource, /export function teacherOpsSeedTeacherReportRecords\b/);
  assert.match(rootSource, /teacherOpsSeedTeacherReportRecords as seedTeacherReportsFromTeacherOpsReport/);
  assert.doesNotMatch(rootSource, /function seedTeacherReports\b/);

  assert.deepEqual(
    seedTeacherReportRecords("2026-06-20T10:00:00.000Z", {
      demoTeacherId: "teacher-ms-chan",
      demoUserId: "student-peter",
      shouldSeedDemoUser: () => false
    }),
    [
      {
        id: "report-s3a-weekly-snapshot",
        type: "class",
        title_en: "S3A weekly learning snapshot",
        title_zh: "中三A每週學習概覽",
        class_id: "class-s3a-2026",
        generated_by: "teacher-ms-chan",
        generated_at: "2026-06-20T10:00:00.000Z",
        summary_en: "Foundation report seed for future class analytics and parent communication.",
        summary_zh: "教師報告基礎資料，供日後班級分析及家長溝通使用。"
      }
    ]
  );

  const enabledSeedReports = seedTeacherReportRecords("2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-ms-chan",
    demoUserId: "student-peter",
    shouldSeedDemoUser: () => true
  });
  assert.equal(enabledSeedReports.length, 2);
  const parentSummary = enabledSeedReports.find((report) => report.id === "report-parent-summary-peter");
  assert.deepEqual(parentSummary && { ...parentSummary, preview_json: undefined }, {
    id: "report-parent-summary-peter",
    type: "parent-summary",
    title_en: "Parent communication summary",
    title_zh: "家長溝通摘要",
    class_id: "class-s3a-2026",
    student_id: "student-peter",
    generated_by: "teacher-ms-chan",
    generated_at: "2026-06-20T10:00:00.000Z",
    summary_en: "HK Student Peter is building steadier quadratic function habits. Home support should focus on short mistake-review routines.",
    summary_zh: "HK Student Peter 的二次函數學習習慣更穩定，家庭支援可集中在短時間錯題重溫。",
    preview_json: undefined
  });
  assert.deepEqual(JSON.parse(parentSummary?.preview_json ?? "{}") as TeacherReportPreview, {
    id: "preview-parent-student-peter",
    type: "parent-summary",
    language: "zh",
    title: "家長溝通摘要",
    subtitle: "HK Student Peter · S3A Mathematics",
    generatedAt: "2026-06-20T10:00:00.000Z",
    subjectName: "HK Student Peter",
    classId: "class-s3a-2026",
    className: "S3A Mathematics",
    studentId: "student-peter",
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
  });
});

test("teacher ops report persistence owns teacher report collection normalization for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsReportPersistence.ts"),
    "utf8"
  );
  const reportModule = await import("@/lib/server/userStore/teacherOpsReportPersistence") as TeacherOpsReportSeedBoundaryModule;

  assert.equal(typeof reportModule.normalizeTeacherOpsReportCollections, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsReportCollections\b/);
  assert.match(rootSource, /normalizeTeacherOpsReportCollections as normalizeTeacherReportCollectionsFromTeacherOpsReport/);
  assert.doesNotMatch(rootSource, /\n    teacher_reports: mergeSeedRecordsPreservingExisting\(/);

  const normalized = reportModule.normalizeTeacherOpsReportCollections?.({
    teacher_reports: [
      {
        id: "report-s3a-weekly-snapshot",
        type: "class",
        title_en: "Legacy weekly snapshot",
        title_zh: "Legacy weekly snapshot",
        class_id: "class-custom",
        generated_by: "teacher-custom",
        generated_at: "2026-06-19T10:00:00.000Z",
        summary_en: "Legacy summary",
        summary_zh: "Legacy summary"
      },
      {
        id: "report-custom",
        type: "parent-summary",
        title_en: "Custom",
        title_zh: "Custom",
        student_id: "student-custom",
        generated_by: "teacher-custom",
        generated_at: "2026-06-19T11:00:00.000Z",
        summary_en: "Custom summary",
        summary_zh: "Custom summary"
      }
    ]
  }, "2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    shouldSeedDemoUser: () => true
  });

  assert.deepEqual(normalized?.teacher_reports.map((report) => report.id), [
    "report-s3a-weekly-snapshot",
    "report-parent-summary-peter",
    "report-custom"
  ]);
  assert.equal(normalized?.teacher_reports[0]?.title_en, "Legacy weekly snapshot");
  assert.equal(normalized?.teacher_reports[1]?.student_id, "student-hk");

  assert.deepEqual(reportModule.normalizeTeacherOpsReportCollections?.({
    teacher_reports: []
  }, "2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    shouldSeedDemoUser: () => false
  })?.teacher_reports.map((report) => report.id), ["report-s3a-weekly-snapshot"]);
});

test("legacy userStore delegates teacher report persistence operations to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const saveTeacherReportPreview = teacherOpsUserStore\.saveTeacherReportPreview/);
  assert.match(source, /export const getTeacherReports = teacherOpsUserStore\.getTeacherReports/);
  assert.match(source, /export const getTeacherReportPreview = teacherOpsUserStore\.getTeacherReportPreview/);
  assert.match(source, /export const getTeacherReportsData = teacherOpsUserStore\.getTeacherReportsData/);
  assert.doesNotMatch(source, /export async function saveTeacherReportPreview/);
  assert.doesNotMatch(source, /export async function getTeacherReports\(/);
  assert.doesNotMatch(source, /export async function getTeacherReportPreview/);
  assert.doesNotMatch(source, /export async function getTeacherReportsData/);
});
