import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsClassPersistenceStore,
  teacherOpsClassRiskTagsForStudent,
  teacherOpsClassStudentSummary,
  teacherOpsClassTopicIdsForClass,
  teacherOpsTeacherStudentIdsForClass,
  teacherOpsStudentMatchesClassCurriculum,
  type TeacherOpsClassPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsClassPersistence";
import type { Assignment, ClassEnrollment, GradeId, TeacherClass } from "@/types";

type TeacherOpsClassSeedBoundaryModule = {
  normalizeTeacherOpsClassRecord?: (
    record: {
      id: string;
      grade: GradeId;
      school_id?: unknown;
      class_code?: string | null;
      invite_code?: string | null;
    },
    normalizeClassCode: (classCode: string) => string
  ) => Record<string, unknown>;
  teacherOpsSeedTeacherClassRecords?: (
    now: string,
    options: {
      demoTeacherId: string;
      mainlandDemoTeacherId: string;
      internalCaliforniaSuperTeacherId: string;
      unitedStatesDemoTeacherId: string;
      gradeIds: readonly GradeId[];
    }
  ) => Array<{
    id: string;
    teacher_id: string;
    name: string;
    grade: GradeId;
    academic_year: string;
    description_en: string;
    description_zh: string;
    invite_code: string;
    created_at: string;
      updated_at: string;
    }>;
  teacherOpsUsGradeLabel?: (grade: GradeId) => string;
  teacherOpsSeedClassEnrollmentRecords?: (
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
      demoUserId: string;
      mainlandDemoUserId: string;
      unitedStatesDemoUserId: string;
    }
  ) => Array<{
    id: string;
    class_id: string;
    student_id: string;
      joined_at: string;
  }>;
  normalizeTeacherOpsClassCollections?: (
    collections: {
      teacher_classes?: Array<{
        id: string;
        teacher_id: string;
        school_id?: unknown;
        class_code?: string | null;
        name: string;
        grade: GradeId;
        academic_year: string;
        description_en: string;
        description_zh: string;
        invite_code?: string | null;
        created_at: string;
        updated_at: string;
      }>;
      class_enrollments?: Array<{
        id: string;
        class_id: string;
        student_id: string;
        joined_at: string;
      }>;
    },
    now: string,
    options: {
      demoTeacherId: string;
      demoUserId: string;
      gradeIds: readonly GradeId[];
      internalCaliforniaSuperTeacherId: string;
      mainlandDemoTeacherId: string;
      mainlandDemoUserId: string;
      normalizeClassCode: (classCode: string) => string;
      shouldSeedDemoUser: () => boolean;
      unitedStatesDemoTeacherId: string;
      unitedStatesDemoUserId: string;
    }
  ) => {
    teacher_classes: Array<Record<string, unknown>>;
    class_enrollments: Array<Record<string, unknown>>;
  };
};

function createDatabase(): TeacherOpsClassPersistenceDatabase {
  return {
    ai_tutor_messages: [],
    assessment_submissions: [],
    assessments: [],
    assignments: [],
    attempts: [],
    class_enrollments: [
      {
        id: "enrollment-owned",
        class_id: "class-owned",
        student_id: "student-1",
        joined_at: "2026-06-18T00:00:00.000Z"
      },
      {
        id: "enrollment-shared",
        class_id: "class-shared",
        student_id: "student-2",
        joined_at: "2026-06-19T00:00:00.000Z"
      },
      {
        id: "enrollment-other",
        class_id: "class-other",
        student_id: "student-3",
        joined_at: "2026-06-20T00:00:00.000Z"
      }
    ],
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
        name: "Owned",
        grade: "S2",
        academic_year: "2026-2027",
        description_en: "Owned class",
        description_zh: "Owned class",
        invite_code: "S2-OWNED",
        created_at: "2026-06-17T00:00:00.000Z",
        updated_at: "2026-06-17T00:00:00.000Z"
      },
      {
        id: "class-shared",
        teacher_id: "teacher-2",
        name: "Shared",
        grade: "S1",
        academic_year: "2026-2027",
        description_en: "Shared class",
        description_zh: "Shared class",
        invite_code: "S1-SHARED",
        created_at: "2026-06-17T00:00:00.000Z",
        updated_at: "2026-06-17T00:00:00.000Z"
      },
      {
        id: "class-other",
        teacher_id: "teacher-2",
        name: "Other",
        grade: "S4",
        academic_year: "2026-2027",
        description_en: "Other class",
        description_zh: "Other class",
        invite_code: "S4-OTHER",
        created_at: "2026-06-17T00:00:00.000Z",
        updated_at: "2026-06-17T00:00:00.000Z"
      }
    ],
    learning_events: [],
    lesson_progress: [],
    mistakes: [],
    submissions: [],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student", username: "ada", normalized_username: "ada", normalized_email: "ada@example.test" },
      { id: "student-2", role: "student", username: "ben", normalized_username: "ben", normalized_email: "ben@example.test" },
      { id: "student-3", role: "student", username: "cat", normalized_username: "cat", normalized_email: "cat@example.test" }
    ],
    visualization_sessions: []
  };
}

function createTestStore(database: TeacherOpsClassPersistenceDatabase) {
  const idsByKind = {
    assessmentSubmission: ["assessment-submission-new"],
    class: ["class-new"],
    enrollment: ["enrollment-new"],
    invite: ["invite1"],
    submission: ["submission-new"]
  };

  return createTeacherOpsClassPersistenceStore({
    createId: (kind) => (kind ? idsByKind[kind].shift() : undefined) ?? "fallback-id",
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    gradeIsValid: (grade) => grade === "S1" || grade === "S2" || grade === "S3" || grade === "S4",
    normalizeUsername: (username) => username.trim().toLowerCase(),
    topicIdsForClass: () => ["topic-1"],
    toClassEnrollment: (_database, enrollment) => ({
      id: enrollment.id,
      classId: enrollment.class_id,
      studentId: enrollment.student_id,
      studentName: enrollment.student_id,
      studentGrade: "S3",
      joinedAt: enrollment.joined_at
    }) satisfies ClassEnrollment,
    toTeacherClass: (sourceDatabase, teacherClass) => ({
      id: teacherClass.id,
      teacherId: teacherClass.teacher_id,
      schoolId: undefined,
      classCode: undefined,
      name: teacherClass.name,
      grade: teacherClass.grade,
      curriculumTrack: undefined,
      curriculumProfile: undefined,
      academicYear: teacherClass.academic_year,
      description: { en: teacherClass.description_en, zh: teacherClass.description_zh },
      studentCount: sourceDatabase.class_enrollments.filter((enrollment) => enrollment.class_id === teacherClass.id).length,
      inviteCode: teacherClass.invite_code,
      createdAt: teacherClass.created_at,
      updatedAt: teacherClass.updated_at
    }) satisfies TeacherClass,
    toAssignment: (_database, assignment) => ({
      id: assignment.id,
      classId: assignment.class_id,
      title: { en: assignment.title_en ?? assignment.id, zh: assignment.title_zh ?? assignment.id },
      description: { en: assignment.description_en ?? "", zh: assignment.description_zh ?? "" },
      contentType: (assignment.content_type ?? "practice") as Assignment["contentType"],
      targetId: assignment.target_id,
      status: (assignment.status ?? "published") as Assignment["status"],
      dueAt: assignment.due_at ?? null,
      allowRetake: assignment.allow_retake ?? false,
      showAnswers: assignment.show_answers ?? true,
      countTowardsGrade: assignment.count_towards_grade ?? true,
      createdBy: assignment.created_by ?? "teacher-1",
      createdAt: assignment.created_at ?? "2026-06-17T00:00:00.000Z",
      updatedAt: assignment.updated_at ?? "2026-06-17T00:00:00.000Z",
      submissionCount: database.submissions.filter((submission) => submission.assignment_id === assignment.id).length,
      completedCount: database.submissions.filter((submission) => submission.assignment_id === assignment.id && submission.status !== "not-started").length
    }) satisfies Assignment
  });
}

test("teacher ops class persistence owns teacher class record normalization for legacy userStore", async () => {
  const module = await import("@/lib/server/userStore/teacherOpsClassPersistence") as unknown as TeacherOpsClassSeedBoundaryModule;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof module.normalizeTeacherOpsClassRecord, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsClassRecord\b/);
  assert.doesNotMatch(persistenceSource, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(persistenceSource, /from ["']@\/lib\/server\/userStore["']/);
  assert.doesNotMatch(rootSource, /normalizeTeacherOpsClassRecord as normalizeTeacherClassRecordFromTeacherOpsClass/);
  assert.doesNotMatch(rootSource, /school_id: typeof teacherClass\.school_id === "string" && teacherClass\.school_id\.trim\(\) \? teacherClass\.school_id : undefined/);
  assert.doesNotMatch(rootSource, /class_code: teacherClass\.class_code \? normalizeClassCodeFromAuthProvisioning\(teacherClass\.class_code\) : undefined/);

  const normalizeClassCode = (classCode: string) => `norm:${classCode.trim().toUpperCase()}`;
  assert.deepEqual(module.normalizeTeacherOpsClassRecord?.({
    id: "class-s2-alpha",
    grade: "S2",
    school_id: " school-1 ",
    class_code: " s2-a ",
    invite_code: null
  }, normalizeClassCode), {
    id: "class-s2-alpha",
    grade: "S2",
    school_id: " school-1 ",
    class_code: "norm:S2-A",
    invite_code: "S2-LPHA"
  });

  assert.deepEqual(module.normalizeTeacherOpsClassRecord?.({
    id: "class-s3-empty",
    grade: "S3",
    school_id: "   ",
    class_code: "",
    invite_code: ""
  }, normalizeClassCode), {
    id: "class-s3-empty",
    grade: "S3",
    school_id: undefined,
    class_code: undefined,
    invite_code: ""
  });
});

test("teacher ops class persistence lists owned and membership classes without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const classes = await createTestStore(createDatabase()).getTeacherClasses("teacher-1");

  assert.deepEqual(classes?.map((teacherClass) => teacherClass.id), ["class-shared", "class-owned"]);
  assert.deepEqual(classes?.map((teacherClass) => teacherClass.studentCount), [1, 1]);
});

test("teacher ops class persistence keeps legacy enrollment access scoped to admins and class owners", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual((await store.getTeacherClassEnrollments("teacher-1", "class-owned"))?.map((enrollment) => enrollment.id), [
    "enrollment-owned"
  ]);
  assert.equal(await store.getTeacherClassEnrollments("teacher-1", "class-shared"), null);
  assert.deepEqual((await store.getTeacherClassEnrollments("admin-1", "class-shared"))?.map((enrollment) => enrollment.id), [
    "enrollment-shared"
  ]);
  assert.equal(await store.getTeacherClassEnrollments("student-1", "class-owned"), null);
  assert.equal(await store.getTeacherClassEnrollments("teacher-1", "missing-class"), null);
});

test("teacher ops class persistence creates classes without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const result = await createTestStore(database).createTeacherClass({
    teacherId: "teacher-1",
    name: "  New S2 Group  ",
    grade: "S2",
    academicYear: " 2026-2027 ",
    description: "  "
  });

  assert.equal(result.status, "created");
  assert.equal(result.class.id, "class-class-new");
  assert.equal(result.class.inviteCode, "S2-INVITE");
  assert.deepEqual(database.teacher_classes[0], {
    id: "class-class-new",
    teacher_id: "teacher-1",
    school_id: undefined,
    class_code: undefined,
    name: "New S2 Group",
    grade: "S2",
    academic_year: "2026-2027",
    description_en: "New S2 Group teaching group.",
    description_zh: "New S2 Group 教學班級。",
    invite_code: "S2-INVITE",
    created_at: "2026-06-21T08:00:00.000Z",
    updated_at: "2026-06-21T08:00:00.000Z"
  });

  assert.deepEqual(
    await createTestStore(createDatabase()).createTeacherClass({
      teacherId: "student-1",
      name: "Nope",
      grade: "S2",
      academicYear: "2026-2027",
      description: ""
    }),
    { status: "forbidden" }
  );
  assert.deepEqual(
    await createTestStore(createDatabase()).createTeacherClass({
      teacherId: "teacher-1",
      name: "",
      grade: "S2",
      academicYear: "2026-2027",
      description: ""
    }),
    { status: "invalid" }
  );
});

test("teacher ops class persistence owns seed teacher class records for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsClassPersistence") as TeacherOpsClassSeedBoundaryModule;

  assert.equal(typeof module.teacherOpsUsGradeLabel, "function");
  assert.equal(typeof module.teacherOpsSeedTeacherClassRecords, "function");
  assert.match(persistenceSource, /export function teacherOpsUsGradeLabel\b/);
  assert.match(persistenceSource, /export function teacherOpsSeedTeacherClassRecords\b/);
  assert.match(rootSource, /teacherOpsSeedTeacherClassRecords as seedTeacherClassesFromTeacherOpsClass/);
  assert.doesNotMatch(rootSource, /function seedTeacherClasses\b/);
  assert.equal(module.teacherOpsUsGradeLabel?.("K"), "Kindergarten");
  assert.equal(module.teacherOpsUsGradeLabel?.("P1"), "Grade 1");
  assert.equal(module.teacherOpsUsGradeLabel?.("S1"), "Grade 7");
  assert.equal(module.teacherOpsUsGradeLabel?.("S6"), "Grade 12");

  const classes = module.teacherOpsSeedTeacherClassRecords?.("2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk",
    mainlandDemoTeacherId: "teacher-mainland",
    internalCaliforniaSuperTeacherId: "teacher-us",
    unitedStatesDemoTeacherId: "teacher-us-public",
    gradeIds: ["S1", "S3"]
  });

  assert.deepEqual(classes?.map((teacherClass) => teacherClass.id), [
    "class-s3a-2026",
    "class-s1-foundation-2026",
    "class-mainland-s4-2026",
    "class-us-ca-p1-2026",
    "class-us-ca-super-s1-2026",
    "class-us-ca-super-s3-2026"
  ]);
  assert.deepEqual(classes?.[0], {
    id: "class-s3a-2026",
    teacher_id: "teacher-hk",
    name: "S3A Mathematics",
    grade: "S3",
    academic_year: "2025-2026",
    description_en: "Core S3 class for algebra, geometry, and data handling follow-up.",
    description_zh: "中三核心班，跟進代數、幾何及數據處理。",
    invite_code: "S3A-MAIS",
    created_at: "2026-06-20T10:00:00.000Z",
    updated_at: "2026-06-20T10:00:00.000Z"
  });
  assert.deepEqual(classes?.[3], {
    id: "class-us-ca-p1-2026",
    teacher_id: "teacher-us-public",
    name: "California Grade 1 Mathematics",
    grade: "P1",
    academic_year: "2025-2026",
    description_en: "Demo class for California Grade 1 mathematics support.",
    description_zh: "Demo class for California Grade 1 mathematics support.",
    invite_code: "CA-P1-SCOTT",
    created_at: "2026-06-20T10:00:00.000Z",
    updated_at: "2026-06-20T10:00:00.000Z"
  });
  assert.deepEqual(classes?.[4], {
    id: "class-us-ca-super-s1-2026",
    teacher_id: "teacher-us",
    name: "California Grade 7 Mathematics",
    grade: "S1",
    academic_year: "2025-2026",
    description_en: "Internal California Grade 7 mathematics access class.",
    description_zh: "Internal California Grade 7 mathematics access class.",
    invite_code: "CA-S1-RHI",
    created_at: "2026-06-20T10:00:00.000Z",
    updated_at: "2026-06-20T10:00:00.000Z"
  });
});

test("teacher ops class persistence owns seed class enrollment records for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsClassPersistence") as TeacherOpsClassSeedBoundaryModule;

  assert.equal(typeof module.teacherOpsSeedClassEnrollmentRecords, "function");
  assert.match(persistenceSource, /export function teacherOpsSeedClassEnrollmentRecords\b/);
  assert.match(rootSource, /teacherOpsSeedClassEnrollmentRecords as seedClassEnrollmentsFromTeacherOpsClass/);
  assert.doesNotMatch(rootSource, /function seedClassEnrollments\b/);

  assert.deepEqual(module.teacherOpsSeedClassEnrollmentRecords?.("2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => false,
    demoUserId: "student-hk",
    mainlandDemoUserId: "student-mainland",
    unitedStatesDemoUserId: "student-us"
  }), [
    {
      id: "enrollment-us-ca-p1-student-shirleen",
      class_id: "class-us-ca-p1-2026",
      student_id: "student-us",
      joined_at: "2026-06-20T10:00:00.000Z"
    }
  ]);

  assert.deepEqual(module.teacherOpsSeedClassEnrollmentRecords?.("2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => true,
    demoUserId: "student-hk",
    mainlandDemoUserId: "student-mainland",
    unitedStatesDemoUserId: "student-us"
  }), [
    {
      id: "enrollment-s3a-student-peter",
      class_id: "class-s3a-2026",
      student_id: "student-hk",
      joined_at: "2026-06-20T10:00:00.000Z"
    },
    {
      id: "enrollment-mainland-s4-student-ludwig",
      class_id: "class-mainland-s4-2026",
      student_id: "student-mainland",
      joined_at: "2026-06-20T10:00:00.000Z"
    },
    {
      id: "enrollment-us-ca-p1-student-shirleen",
      class_id: "class-us-ca-p1-2026",
      student_id: "student-us",
      joined_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
});

test("teacher ops class persistence owns teacher class collection normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsClassPersistence") as TeacherOpsClassSeedBoundaryModule;

  assert.equal(typeof module.normalizeTeacherOpsClassCollections, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsClassCollections\b/);
  assert.match(rootSource, /normalizeTeacherOpsClassCollections as normalizeTeacherClassCollectionsFromTeacherOpsClass/);
  assert.doesNotMatch(rootSource, /teacher_classes: mergeSeedRecordsPreservingExisting\(/);
  assert.doesNotMatch(rootSource, /class_enrollments: mergeSeedRecordsPreservingExisting\(/);

  const normalized = module.normalizeTeacherOpsClassCollections?.({
    teacher_classes: [
      {
        id: "class-s3a-2026",
        teacher_id: "teacher-custom",
        school_id: "   ",
        class_code: " s3 legacy ",
        name: "Legacy S3A",
        grade: "S3",
        academic_year: "2026-2027",
        description_en: "Legacy class",
        description_zh: "Legacy class",
        invite_code: null,
        created_at: "2026-06-18T08:00:00.000Z",
        updated_at: "2026-06-18T08:00:00.000Z"
      },
      {
        id: "class-custom-2026",
        teacher_id: "teacher-custom",
        school_id: "school-1",
        class_code: "",
        name: "Custom group",
        grade: "S2",
        academic_year: "2026-2027",
        description_en: "Custom group",
        description_zh: "Custom group",
        invite_code: "CUSTOM",
        created_at: "2026-06-18T08:00:00.000Z",
        updated_at: "2026-06-18T08:00:00.000Z"
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-s3a-student-peter",
        class_id: "class-s3a-2026",
        student_id: "student-custom",
        joined_at: "2026-06-18T08:00:00.000Z"
      },
      {
        id: "enrollment-custom",
        class_id: "class-custom-2026",
        student_id: "student-custom",
        joined_at: "2026-06-19T08:00:00.000Z"
      }
    ]
  }, "2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    gradeIds: ["S1"],
    internalCaliforniaSuperTeacherId: "teacher-us",
    mainlandDemoTeacherId: "teacher-mainland",
    mainlandDemoUserId: "student-mainland",
    normalizeClassCode: (classCode) => `norm:${classCode.trim().toUpperCase()}`,
    shouldSeedDemoUser: () => true,
    unitedStatesDemoTeacherId: "teacher-us-public",
    unitedStatesDemoUserId: "student-us"
  });

  assert.deepEqual(normalized?.teacher_classes.map((teacherClass) => teacherClass.id), [
    "class-s3a-2026",
    "class-s1-foundation-2026",
    "class-mainland-s4-2026",
    "class-us-ca-p1-2026",
    "class-us-ca-super-s1-2026",
    "class-custom-2026"
  ]);
  assert.deepEqual(normalized?.teacher_classes[0], {
    id: "class-s3a-2026",
    teacher_id: "teacher-custom",
    school_id: undefined,
    class_code: "norm:S3 LEGACY",
    name: "Legacy S3A",
    grade: "S3",
    academic_year: "2026-2027",
    description_en: "Legacy class",
    description_zh: "Legacy class",
    invite_code: "S3-2026",
    created_at: "2026-06-18T08:00:00.000Z",
    updated_at: "2026-06-18T08:00:00.000Z"
  });
  assert.deepEqual(normalized?.teacher_classes[5], {
    id: "class-custom-2026",
    teacher_id: "teacher-custom",
    school_id: "school-1",
    class_code: undefined,
    name: "Custom group",
    grade: "S2",
    academic_year: "2026-2027",
    description_en: "Custom group",
    description_zh: "Custom group",
    invite_code: "CUSTOM",
    created_at: "2026-06-18T08:00:00.000Z",
    updated_at: "2026-06-18T08:00:00.000Z"
  });
  assert.deepEqual(normalized?.class_enrollments.map((enrollment) => enrollment.id), [
    "enrollment-s3a-student-peter",
    "enrollment-mainland-s4-student-ludwig",
    "enrollment-us-ca-p1-student-shirleen",
    "enrollment-custom"
  ]);
  assert.equal(normalized?.class_enrollments[0]?.student_id, "student-custom");

  assert.deepEqual(module.normalizeTeacherOpsClassCollections?.({
    teacher_classes: [],
    class_enrollments: []
  }, "2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    gradeIds: [],
    internalCaliforniaSuperTeacherId: "teacher-us",
    mainlandDemoTeacherId: "teacher-mainland",
    mainlandDemoUserId: "student-mainland",
    normalizeClassCode: (classCode) => classCode,
    shouldSeedDemoUser: () => false,
    unitedStatesDemoTeacherId: "teacher-us-public",
    unitedStatesDemoUserId: "student-us"
  }), {
    teacher_classes: [
      {
        id: "class-s3a-2026",
        teacher_id: "teacher-hk",
        school_id: undefined,
        class_code: undefined,
        name: "S3A Mathematics",
        grade: "S3",
        academic_year: "2025-2026",
        description_en: "Core S3 class for algebra, geometry, and data handling follow-up.",
        description_zh: "中三核心班，跟進代數、幾何及數據處理。",
        invite_code: "S3A-MAIS",
        created_at: "2026-06-20T10:00:00.000Z",
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "class-s1-foundation-2026",
        teacher_id: "teacher-hk",
        school_id: undefined,
        class_code: undefined,
        name: "S1 Foundation Group",
        grade: "S1",
        academic_year: "2025-2026",
        description_en: "Small-group support for number sense and early algebra routines.",
        description_zh: "小組支援數感及初階代數基礎。",
        invite_code: "S1-FOUND",
        created_at: "2026-06-20T10:00:00.000Z",
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "class-mainland-s4-2026",
        teacher_id: "teacher-mainland",
        school_id: undefined,
        class_code: undefined,
        name: "Mainland S4 Mathematics",
        grade: "S4",
        academic_year: "2025-2026",
        description_en: "Demo class for Mainland senior high mathematics content.",
        description_zh: "內地高中數學內容示範班。",
        invite_code: "ML-S4-MAIS",
        created_at: "2026-06-20T10:00:00.000Z",
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "class-us-ca-p1-2026",
        teacher_id: "teacher-us-public",
        school_id: undefined,
        class_code: undefined,
        name: "California Grade 1 Mathematics",
        grade: "P1",
        academic_year: "2025-2026",
        description_en: "Demo class for California Grade 1 mathematics support.",
        description_zh: "Demo class for California Grade 1 mathematics support.",
        invite_code: "CA-P1-SCOTT",
        created_at: "2026-06-20T10:00:00.000Z",
        updated_at: "2026-06-20T10:00:00.000Z"
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-us-ca-p1-student-shirleen",
        class_id: "class-us-ca-p1-2026",
        student_id: "student-us",
        joined_at: "2026-06-20T10:00:00.000Z"
      }
    ]
  });
});

test("teacher ops class persistence owns student curriculum match helper", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = createDatabase();
  database.users.push({
    id: "student-us",
    role: "student",
    username: "us",
    normalized_username: "us",
    normalized_email: "us@example.test"
  });
  database.student_profiles?.push({
    user_id: "student-us",
    curriculum_region: "US",
    curriculum_track: "US_CA_MATH",
    textbook_publisher: "US_CA_MATH"
  });

  assert.match(persistenceSource, /export function teacherOpsStudentMatchesClassCurriculum\b/);
  assert.equal(teacherOpsStudentMatchesClassCurriculum(database, "student-1", database.teacher_classes[0]), true);
  assert.equal(teacherOpsStudentMatchesClassCurriculum(database, "student-us", database.teacher_classes[0]), false);
  assert.doesNotMatch(rootSource, /function studentMatchesClassCurriculum\b/);
  assert.doesNotMatch(rootSource, /studentMatchesClassCurriculum:/);
});

test("teacher ops class persistence owns class topic id helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = {
    topics: [
      {
        id: "topic-2",
        grade: "S2" as const,
        curriculum_track: "HK" as const
      },
      {
        id: "topic-us",
        grade: "S2" as const,
        curriculum_track: "US_CA_MATH" as const
      },
      {
        id: "topic-1",
        grade: "S2" as const,
        curriculum_track: "HK" as const
      },
      {
        id: "topic-s3",
        grade: "S3" as const,
        curriculum_track: "HK" as const
      }
    ]
  };

  assert.match(persistenceSource, /export function teacherOpsClassTopicIdsForClass\b/);
  assert.match(rootSource, /teacherOpsClassTopicIdsForClass as topicIdsForClassFromTeacherOpsClass/);
  assert.doesNotMatch(rootSource, /function topicIdsForClass\(/);
  assert.deepEqual(
    teacherOpsClassTopicIdsForClass({
      database,
      teacherClass: { grade: "S2" },
      curriculumProfileForClass: () => ({ region: "HK", publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" }),
      topicMatchesCurriculumProfile: (topic) => topic.curriculum_track === "HK"
    }),
    ["topic-2", "topic-1"]
  );
});

test("teacher ops class persistence adds students and seeds existing work records", async () => {
  const database = createDatabase();
  database.assignments.push({
    id: "assignment-1",
    class_id: "class-owned",
    title_en: "Practice",
    title_zh: "Practice",
    updated_at: "2026-06-19T00:00:00.000Z"
  });
  database.assessments.push({
    id: "assessment-1",
    class_id: "class-owned"
  });
  database.users.push(
    { id: "student-new", role: "student", username: "new", normalized_username: "new", normalized_email: "new@example.test" },
    { id: "student-mismatch", role: "student", username: "mismatch", normalized_username: "mismatch", normalized_email: "mismatch@example.test" }
  );
  database.student_profiles?.push({
    user_id: "student-mismatch",
    curriculum_region: "US",
    curriculum_track: "US_CA_MATH",
    textbook_publisher: "US_CA_MATH"
  });

  const store = createTestStore(database);
  assert.deepEqual(await store.addStudentToTeacherClass({ teacherId: "teacher-1", classId: "class-owned", username: " NEW " }), {
    status: "added"
  });
  assert.deepEqual(database.class_enrollments.at(-1), {
    id: "enrollment-enrollment-new",
    class_id: "class-owned",
    student_id: "student-new",
    joined_at: "2026-06-21T08:00:00.000Z"
  });
  assert.deepEqual(database.submissions.map((submission) => submission.id), ["submission-submission-new"]);
  assert.deepEqual(database.assessment_submissions.map((submission) => submission.id), [
    "assessment-submission-assessment-submission-new"
  ]);

  assert.deepEqual(await store.addStudentToTeacherClass({ teacherId: "teacher-1", classId: "class-owned", username: "new" }), {
    status: "duplicate"
  });
  assert.deepEqual(await store.addStudentToTeacherClass({ teacherId: "teacher-1", classId: "class-owned", username: "missing" }), {
    status: "student-not-found"
  });
  assert.deepEqual(await store.addStudentToTeacherClass({ teacherId: "teacher-1", classId: "class-owned", username: "mismatch" }), {
    status: "curriculum-mismatch"
  });
  assert.deepEqual(await store.addStudentToTeacherClass({ teacherId: "student-1", classId: "class-owned", username: "new" }), {
    status: "forbidden"
  });
});

test("teacher ops class persistence lets students join by invite code", async () => {
  const database = createDatabase();
  database.assignments.push({
    id: "assignment-1",
    class_id: "class-owned",
    title_en: "Practice",
    title_zh: "Practice",
    updated_at: "2026-06-19T00:00:00.000Z"
  });
  database.assessments.push({
    id: "assessment-1",
    class_id: "class-owned"
  });
  database.users.push(
    { id: "student-new", role: "student", username: "new", normalized_username: "new", normalized_email: "new@example.test" },
    { id: "student-mismatch", role: "student", username: "mismatch", normalized_username: "mismatch", normalized_email: "mismatch@example.test" }
  );
  database.student_profiles?.push({
    user_id: "student-mismatch",
    curriculum_region: "US",
    curriculum_track: "US_CA_MATH",
    textbook_publisher: "US_CA_MATH"
  });

  const store = createTestStore(database);
  const result = await store.joinClassByInviteCode({ studentId: "student-new", inviteCode: " s2-owned " });

  assert.equal(result.status, "joined");
  assert.equal(result.class.id, "class-owned");
  assert.deepEqual(database.class_enrollments.at(-1), {
    id: "enrollment-enrollment-new",
    class_id: "class-owned",
    student_id: "student-new",
    joined_at: "2026-06-21T08:00:00.000Z"
  });
  assert.deepEqual(database.submissions.map((submission) => submission.id), ["submission-submission-new"]);
  assert.deepEqual(database.assessment_submissions.map((submission) => submission.id), [
    "assessment-submission-assessment-submission-new"
  ]);

  const duplicate = await store.joinClassByInviteCode({ studentId: "student-new", inviteCode: "S2-OWNED" });
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.class.id, "class-owned");
  assert.deepEqual(await store.joinClassByInviteCode({ studentId: "student-new", inviteCode: "missing" }), { status: "not-found" });
  assert.deepEqual(await store.joinClassByInviteCode({ studentId: "student-mismatch", inviteCode: "S2-OWNED" }), {
    status: "curriculum-mismatch"
  });
  assert.deepEqual(await store.joinClassByInviteCode({ studentId: "teacher-1", inviteCode: "S2-OWNED" }), {
    status: "forbidden"
  });
});

test("teacher ops class persistence owns student work record seeding helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsClassPersistence") as Record<string, unknown>;
  const ensureWorkRecords = helpers.ensureTeacherOpsClassStudentWorkRecords as ((input: {
    classId: string;
    createId: (kind?: "assessmentSubmission" | "class" | "enrollment" | "invite" | "submission") => string;
    database: TeacherOpsClassPersistenceDatabase;
    now: string;
    studentId: string;
  }) => void) | undefined;

  assert.equal(typeof ensureWorkRecords, "function");
  assert.match(persistenceSource, /export function ensureTeacherOpsClassStudentWorkRecords\b/);
  assert.match(rootSource, /ensureTeacherOpsClassStudentWorkRecords as ensureClassStudentWorkRecordsFromTeacherOpsClass/);
  assert.doesNotMatch(rootSource, /function ensureClassStudentWorkRecords\(/);

  const database = createDatabase();
  database.assignments.push(
    {
      id: "assignment-existing",
      class_id: "class-owned",
      title_en: "Existing",
      title_zh: "Existing",
      updated_at: "2026-06-19T00:00:00.000Z"
    },
    {
      id: "assignment-new",
      class_id: "class-owned",
      title_en: "New",
      title_zh: "New",
      updated_at: "2026-06-20T00:00:00.000Z"
    },
    {
      id: "assignment-other",
      class_id: "class-other",
      title_en: "Other",
      title_zh: "Other",
      updated_at: "2026-06-20T00:00:00.000Z"
    }
  );
  database.submissions.push({
    id: "submission-existing",
    assignment_id: "assignment-existing",
    student_id: "student-1",
    status: "submitted",
    updated_at: "2026-06-20T00:00:00.000Z"
  });
  database.assessments.push(
    { id: "assessment-existing", class_id: "class-owned" },
    { id: "assessment-new", class_id: "class-owned" },
    { id: "assessment-other", class_id: "class-other" }
  );
  database.assessment_submissions.push({
    id: "assessment-submission-existing",
    assessment_id: "assessment-existing",
    student_id: "student-1",
    status: "submitted",
    attempt_number: 1,
    score: 80,
    max_score: 100,
    submitted_at: "2026-06-20T00:00:00.000Z",
    graded_at: null,
    answers: [],
    updated_at: "2026-06-20T00:00:00.000Z"
  });

  ensureWorkRecords?.({
    classId: "class-owned",
    createId: (kind) => `${kind}-created`,
    database,
    now: "2026-06-21T08:00:00.000Z",
    studentId: "student-1"
  });

  assert.deepEqual(database.submissions.map((submission) => submission.id), [
    "submission-existing",
    "submission-submission-created"
  ]);
  assert.deepEqual(database.assessment_submissions.map((submission) => submission.id), [
    "assessment-submission-existing",
    "assessment-submission-assessmentSubmission-created"
  ]);
});

test("teacher ops class persistence owns class enrollment projection helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsClassPersistence") as Record<string, unknown>;
  const toClassEnrollment = helpers.toTeacherOpsClassEnrollment as ((
    database: {
      student_profiles?: Array<{
        user_id: string;
        name?: string;
        grade?: "S2";
      }>;
      users: Array<{
        id: string;
        username?: string;
      }>;
    },
    record: {
      id: string;
      class_id: string;
      student_id: string;
      joined_at: string;
    }
  ) => ClassEnrollment) | undefined;

  assert.equal(typeof toClassEnrollment, "function");
  assert.match(persistenceSource, /export function toTeacherOpsClassEnrollment\b/);
  assert.match(rootSource, /toTeacherOpsClassEnrollment as toClassEnrollmentFromTeacherOpsClass/);
  assert.doesNotMatch(rootSource, /function toClassEnrollment\(/);

  assert.deepEqual(toClassEnrollment?.({
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada Lovelace",
        grade: "S2"
      }
    ],
    users: [
      {
        id: "student-1",
        username: "ada"
      }
    ]
  }, {
    id: "enrollment-1",
    class_id: "class-1",
    student_id: "student-1",
    joined_at: "2026-06-21T08:00:00.000Z"
  }), {
    id: "enrollment-1",
    classId: "class-1",
    studentId: "student-1",
    studentName: "Ada Lovelace",
    studentGrade: "S2",
    joinedAt: "2026-06-21T08:00:00.000Z"
  });

  assert.deepEqual(toClassEnrollment?.({
    student_profiles: [],
    users: [
      {
        id: "student-2",
        username: "ben"
      }
    ]
  }, {
    id: "enrollment-2",
    class_id: "class-1",
    student_id: "student-2",
    joined_at: "2026-06-21T08:00:00.000Z"
  }), {
    id: "enrollment-2",
    classId: "class-1",
    studentId: "student-2",
    studentName: "ben",
    studentGrade: "S3",
    joinedAt: "2026-06-21T08:00:00.000Z"
  });
});

test("teacher ops class persistence owns teacher class projection helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsClassPersistence") as Record<string, unknown>;
  const toTeacherClass = helpers.toTeacherOpsClass as ((
    database: {
      class_enrollments: Array<{
        class_id: string;
      }>;
      student_profiles?: Array<{
        user_id: string;
        curriculum_track?: "US_CA_MATH";
        curriculum_region?: "US";
        textbook_publisher?: "US_CA_MATH";
      }>;
    },
    record: {
      id: string;
      teacher_id: string;
      school_id?: string;
      class_code?: string;
      name: string;
      grade: "S2";
      academic_year: string;
      description_en: string;
      description_zh: string;
      invite_code: string;
      created_at: string;
      updated_at: string;
    }
  ) => TeacherClass) | undefined;

  assert.equal(typeof toTeacherClass, "function");
  assert.match(persistenceSource, /export function toTeacherOpsClass\b/);
  assert.match(rootSource, /toTeacherOpsClass as toTeacherClassFromTeacherOpsClass/);
  assert.doesNotMatch(rootSource, /function toTeacherClass\(/);

  assert.deepEqual(toTeacherClass?.({
    class_enrollments: [
      { class_id: "class-1" },
      { class_id: "class-1" },
      { class_id: "class-other" }
    ],
    student_profiles: [
      {
        user_id: "teacher-1",
        curriculum_track: "US_CA_MATH",
        curriculum_region: "US",
        textbook_publisher: "US_CA_MATH"
      }
    ]
  }, {
    id: "class-1",
    teacher_id: "teacher-1",
    school_id: "school-1",
    class_code: "S2-A",
    name: "S2 Alpha",
    grade: "S2",
    academic_year: "2026-2027",
    description_en: "Alpha class",
    description_zh: "甲班",
    invite_code: "S2-ALPHA",
    created_at: "2026-06-21T08:00:00.000Z",
    updated_at: "2026-06-22T08:00:00.000Z"
  }), {
    id: "class-1",
    teacherId: "teacher-1",
    schoolId: "school-1",
    classCode: "S2-A",
    name: "S2 Alpha",
    grade: "S2",
    curriculumTrack: "US_CA_MATH",
    curriculumProfile: {
      region: "US",
      publisher: "US_CA_MATH"
    },
    academicYear: "2026-2027",
    description: {
      en: "Alpha class",
      zh: "甲班"
    },
    studentCount: 2,
    inviteCode: "S2-ALPHA",
    createdAt: "2026-06-21T08:00:00.000Z",
    updatedAt: "2026-06-22T08:00:00.000Z"
  });
});

test("teacher ops class persistence builds class detail data", async () => {
  const database = createDatabase();
  database.class_enrollments.push({
    id: "enrollment-late",
    class_id: "class-owned",
    student_id: "student-late",
    joined_at: "2026-06-20T00:00:00.000Z"
  });
  database.users.push({
    id: "student-late",
    role: "student",
    username: "late",
    normalized_username: "late",
    normalized_email: "late@example.test"
  });
  database.assignments.push(
    {
      id: "assignment-old",
      class_id: "class-owned",
      title_en: "Old",
      title_zh: "Old",
      updated_at: "2026-06-18T00:00:00.000Z"
    },
    {
      id: "assignment-new",
      class_id: "class-owned",
      title_en: "New",
      title_zh: "New",
      updated_at: "2026-06-20T00:00:00.000Z"
    }
  );
  database.lesson_progress.push({ user_id: "student-1", topic_id: "topic-1", mastery: 80 });
  database.mistakes.push({ user_id: "student-late", mastered: false, wrong_attempts: 3 });
  database.ai_tutor_messages.push(
    ...Array.from({ length: 5 }, (_, index) => ({
      user_id: "student-late",
      created_at: `2026-06-21T0${index}:00:00.000Z`
    }))
  );
  database.submissions.push({
    id: "late-submission",
    assignment_id: "assignment-new",
    student_id: "student-late",
    status: "late",
    updated_at: "2026-06-20T00:00:00.000Z"
  });

  const detail = await createTestStore(database).getTeacherClassDetailData("teacher-1", "class-owned");

  assert.equal(detail?.class.id, "class-owned");
  assert.deepEqual(detail?.assignments.map((assignment) => assignment.id), ["assignment-new", "assignment-old"]);
  assert.deepEqual(detail?.students.map((student) => student.studentId), ["student-late", "student-1"]);
  assert.deepEqual(detail?.students[0]?.riskTags, [
    "low-mastery",
    "repeated-mistakes",
    "high-ai-tutor",
    "late-work"
  ]);
  assert.equal(await createTestStore(database).getTeacherClassDetailData("student-1", "class-owned"), null);
  assert.equal(await createTestStore(database).getTeacherClassDetailData("teacher-1", "class-other"), null);
});

test("teacher ops class persistence owns class student id scoping helper", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = createDatabase();

  assert.match(persistenceSource, /function teacherStudentIdsForClass\(/);
  assert.match(persistenceSource, /export const teacherOpsTeacherStudentIdsForClass = teacherStudentIdsForClass;/);
  assert.match(rootSource, /teacherOpsTeacherStudentIdsForClass as teacherStudentIdsForClassFromTeacherOpsClass/);
  assert.doesNotMatch(rootSource, /function teacherStudentIdsForClass\(/);
  assert.deepEqual(teacherOpsTeacherStudentIdsForClass(database, "class-owned"), ["student-1"]);
  assert.deepEqual(teacherOpsTeacherStudentIdsForClass(database, "class-shared"), ["student-2"]);
  assert.deepEqual(teacherOpsTeacherStudentIdsForClass(database, "missing-class"), []);
});

test("teacher ops class persistence owns student risk tags helper", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = createDatabase();
  const nowMs = Date.parse("2026-06-21T08:00:00.000Z");

  database.lesson_progress.push({ user_id: "student-late", topic_id: "topic-1", mastery: 40 });
  database.mistakes.push({ user_id: "student-late", mastered: false, wrong_attempts: 3 });
  database.ai_tutor_messages.push(
    ...Array.from({ length: 5 }, (_, index) => ({
      user_id: "student-late",
      created_at: `2026-06-21T0${index}:00:00.000Z`
    }))
  );
  database.submissions.push({
    id: "late-submission",
    assignment_id: "assignment-new",
    student_id: "student-late",
    status: "late",
    updated_at: "2026-06-10T00:00:00.000Z"
  });

  assert.match(persistenceSource, /function riskTagsForStudent\(/);
  assert.match(persistenceSource, /export const teacherOpsClassRiskTagsForStudent = riskTagsForStudent;/);
  assert.match(rootSource, /teacherOpsClassRiskTagsForStudent as riskTagsForStudentFromTeacherOpsClass/);
  assert.doesNotMatch(rootSource, /function riskTagsForStudent\(/);
  assert.doesNotMatch(rootSource, /function aiTutorMessageCountInWindow\(/);
  assert.deepEqual(
    teacherOpsClassRiskTagsForStudent(database, "student-late", ["topic-1"], nowMs),
    ["low-mastery", "repeated-mistakes", "high-ai-tutor", "late-work"]
  );
  assert.deepEqual(
    teacherOpsClassRiskTagsForStudent(database, "student-inactive", ["topic-1"], nowMs),
    ["low-mastery", "inactive"]
  );
});

test("teacher ops class persistence owns class student summary helper with root fallback preserved", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = createDatabase();
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === "class-owned");

  assert.ok(teacherClass);
  database.assignments.push({
    id: "assignment-new",
    class_id: "class-owned",
    title_en: "New",
    title_zh: "New",
    updated_at: "2026-06-20T00:00:00.000Z"
  });
  (database.student_profiles ??= []).push({
    user_id: "student-1",
    name: "Ada Profile",
    grade: "S2"
  });
  database.lesson_progress.push({ user_id: "student-1", topic_id: "topic-1", mastery: 80 });
  database.learning_events.push({ user_id: "student-1", created_at: "2026-06-21T07:00:00.000Z" });
  database.submissions.push({
    id: "submission-complete",
    assignment_id: "assignment-new",
    student_id: "student-1",
    status: "graded",
    updated_at: "2026-06-21T07:30:00.000Z"
  });

  assert.match(persistenceSource, /function classStudentSummary\(/);
  assert.match(persistenceSource, /export const teacherOpsClassStudentSummary = classStudentSummary;/);
  assert.match(rootSource, /teacherOpsClassStudentSummary as classStudentSummaryFromTeacherOpsClass/);
  assert.match(rootSource, /missingStudentName:\s*"Unknown student"/);
  assert.doesNotMatch(rootSource, /function classStudentSummary\(/);

  assert.deepEqual(
    teacherOpsClassStudentSummary({
      database,
      isSubmissionComplete: (submission) => submission.status === "graded",
      missingStudentName: "Unknown student",
      nowMs: Date.parse("2026-06-21T08:00:00.000Z"),
      studentProfileFor: (sourceDatabase, studentId) => sourceDatabase.student_profiles?.find((profile) => profile.user_id === studentId) ?? null,
      studentId: "student-1",
      teacherClass,
      topicIds: ["topic-1"]
    }),
    {
      studentId: "student-1",
      studentName: "Ada Profile",
      grade: "S2",
      recentActivityAt: "2026-06-21T07:30:00.000Z",
      averageMastery: 80,
      assignmentCompletionRate: 100,
      riskTags: [],
      href: "/teacher/classes/class-owned/students/student-1"
    }
  );

  assert.equal(
    teacherOpsClassStudentSummary({
      database,
      isSubmissionComplete: () => false,
      nowMs: Date.parse("2026-06-21T08:00:00.000Z"),
      studentProfileFor: () => null,
      studentId: "student-2",
      teacherClass,
      topicIds: []
    }).studentName,
    "ben"
  );
  assert.equal(
    teacherOpsClassStudentSummary({
      database,
      isSubmissionComplete: () => false,
      missingStudentName: "Unknown student",
      nowMs: Date.parse("2026-06-21T08:00:00.000Z"),
      studentProfileFor: () => null,
      studentId: "missing-student",
      teacherClass,
      topicIds: []
    }).studentName,
    "Unknown student"
  );
});

test("legacy userStore delegates teacher class lifecycle to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getTeacherClasses = teacherOpsUserStore\.getTeacherClasses/);
  assert.match(source, /export const getTeacherClassEnrollments = teacherOpsUserStore\.getTeacherClassEnrollments/);
  assert.match(source, /export const createTeacherClass = teacherOpsUserStore\.createTeacherClass/);
  assert.match(source, /export const addStudentToTeacherClass = teacherOpsUserStore\.addStudentToTeacherClass/);
  assert.match(source, /export const joinClassByInviteCode = teacherOpsUserStore\.joinClassByInviteCode/);
  assert.match(source, /export const getTeacherClassDetailData = teacherOpsUserStore\.getTeacherClassDetailData/);
  assert.doesNotMatch(source, /export async function getTeacherClasses/);
  assert.doesNotMatch(source, /export async function getTeacherClassEnrollments/);
  assert.doesNotMatch(source, /export async function createTeacherClass/);
  assert.doesNotMatch(source, /export async function addStudentToTeacherClass/);
  assert.doesNotMatch(source, /export async function joinClassByInviteCode/);
  assert.doesNotMatch(source, /export async function getTeacherClassDetailData/);
});
