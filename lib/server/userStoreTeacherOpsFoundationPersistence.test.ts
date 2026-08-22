import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsFoundationPersistenceStore,
  teacherOpsCanUseTeacherArea,
  teacherCanAccessStudentByOwnerHash,
  teacherOpsTeacherDisplayName,
  type TeacherOpsFoundationPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsFoundationPersistence";
import type {
  Assessment,
  Assignment,
  StudentSession,
  TeacherClass,
  TeacherFoundationData,
  TeacherMessage,
  TeachingResource
} from "@/types";

type TeacherOpsFoundationTestDatabase = TeacherOpsFoundationPersistenceDatabase & {
  assignments: Array<{
    id: string;
    class_id: string;
    status: "draft" | "scheduled" | "active" | "closed";
    updated_at: string;
  }>;
  assessments: Array<{
    id: string;
    class_id: string;
    created_at: string;
  }>;
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
  teacher_messages: Array<{
    id: string;
    teacher_id: string;
    class_id?: string;
    status: "unread" | "open" | "resolved";
    last_message_at: string;
  }>;
  teaching_resources: Array<{
    id: string;
    uploaded_by: string;
    created_at: string;
  }>;
  users: Array<{
    id: string;
    role: "student" | "teacher" | "parent" | "admin";
    username?: string;
  }>;
};

function createDatabase(): TeacherOpsFoundationTestDatabase {
  return {
    assignments: [
      { id: "assignment-owned-new", class_id: "class-owned", status: "active", updated_at: "2026-06-20T11:00:00.000Z" },
      { id: "assignment-shared", class_id: "class-shared", status: "closed", updated_at: "2026-06-20T10:00:00.000Z" },
      { id: "assignment-owned-old", class_id: "class-owned", status: "draft", updated_at: "2026-06-19T10:00:00.000Z" },
      { id: "assignment-other", class_id: "class-other", status: "active", updated_at: "2026-06-21T10:00:00.000Z" }
    ],
    assessments: [
      { id: "assessment-owned-new", class_id: "class-owned", created_at: "2026-06-20T10:00:00.000Z" },
      { id: "assessment-shared", class_id: "class-shared", created_at: "2026-06-20T09:00:00.000Z" },
      { id: "assessment-other", class_id: "class-other", created_at: "2026-06-21T10:00:00.000Z" }
    ],
    class_enrollments: [
      { class_id: "class-owned", student_id: "student-a" },
      { class_id: "class-owned", student_id: "student-b" },
      { class_id: "class-shared", student_id: "student-b" },
      { class_id: "class-shared", student_id: "student-c" },
      { class_id: "class-other", student_id: "student-z" }
    ],
    school_memberships: [
      { user_id: "teacher-1", role: "teacher", class_id: "class-shared" }
    ],
    teacher_classes: [
      { id: "class-owned", teacher_id: "teacher-1", name: "Owned S2", grade: "S2" },
      { id: "class-shared", teacher_id: "teacher-2", name: "Shared S3", grade: "S3" },
      { id: "class-other", teacher_id: "teacher-2", name: "Other S4", grade: "S4" }
    ],
    teacher_messages: [
      { id: "message-owned", teacher_id: "teacher-1", class_id: "class-owned", status: "unread", last_message_at: "2026-06-20T12:00:00.000Z" },
      { id: "message-shared", teacher_id: "teacher-2", class_id: "class-shared", status: "open", last_message_at: "2026-06-20T11:00:00.000Z" },
      { id: "message-other", teacher_id: "teacher-2", class_id: "class-other", status: "unread", last_message_at: "2026-06-21T12:00:00.000Z" }
    ],
    teaching_resources: [
      { id: "resource-owned-new", uploaded_by: "teacher-1", created_at: "2026-06-20T09:00:00.000Z" },
      { id: "resource-owned-old", uploaded_by: "teacher-1", created_at: "2026-06-19T09:00:00.000Z" },
      { id: "resource-other", uploaded_by: "teacher-2", created_at: "2026-06-21T09:00:00.000Z" }
    ],
    users: [
      { id: "teacher-1", role: "teacher", username: "Teacher One" },
      { id: "teacher-2", role: "teacher", username: "Teacher Two" },
      { id: "admin-1", role: "admin", username: "Admin One" },
      { id: "student-1", role: "student", username: "Student One" }
    ]
  };
}

function createTestStore(
  database: TeacherOpsFoundationPersistenceDatabase,
  shellFallback: Pick<TeacherFoundationData, "teacher" | "classes"> | null = null
) {
  return createTeacherOpsFoundationPersistenceStore({
    readDatabase: async () => database,
    getStorageFreeTeacherShellData: (userId) => userId === "storage-free-teacher" ? shellFallback : null,
    getTeacherShellDataFromPostgresProjection: async (userId) => userId === "postgres-teacher"
      ? { teacher: sessionFor("postgres-teacher"), classes: [classProjection({ id: "postgres-class", teacher_id: "postgres-teacher", name: "Postgres", grade: "S2" })] }
      : undefined,
    teacherSessionProjection: (_database, user): StudentSession | null => {
      if (user.role !== "teacher" && user.role !== "admin") return null;
      return sessionFor(user.id, user.username ?? user.id);
    },
    classProjection: (_database, teacherClass) => classProjection(teacherClass),
    assignmentProjection: (_database, assignment): Assignment => ({
      id: assignment.id,
      classId: assignment.class_id,
      title: { en: assignment.id, zh: assignment.id },
      description: { en: "", zh: "" },
      contentType: "lesson",
      status: assignment.status,
      dueAt: null,
      allowRetake: false,
      showAnswers: false,
      countTowardsGrade: false,
      createdBy: "teacher-1",
      createdAt: assignment.updated_at,
      updatedAt: assignment.updated_at,
      submissionCount: 0,
      completedCount: 0
    }),
    messageProjection: (_database, message): TeacherMessage => ({
      id: message.id,
      classId: message.class_id,
      studentId: "student-preview",
      studentName: "Student Preview",
      teacherId: message.teacher_id,
      subject: { en: message.id, zh: message.id },
      latestMessage: message.id,
      status: message.status,
      priority: "normal",
      starred: false,
      lastMessageAt: message.last_message_at,
      createdAt: message.last_message_at
    }),
    resourceProjection: (_database, resource): TeachingResource => ({
      id: resource.id,
      title: { en: resource.id, zh: resource.id },
      type: "worksheet",
      fileName: `${resource.id}.pdf`,
      fileType: "PDF",
      mimeType: "application/pdf",
      fileSizeBytes: 1,
      grade: "S2",
      uploadedBy: resource.uploaded_by,
      createdAt: resource.created_at,
      referenceCounts: { assignments: 0, assessments: 0, classroom: 0 }
    }),
    assessmentProjection: (_database, assessment): Assessment => ({
      id: assessment.id,
      classId: assessment.class_id,
      title: { en: assessment.id, zh: assessment.id },
      type: "quiz",
      status: "open",
      sourceType: "question-bank",
      analysisSettings: {
        passThreshold: 60,
        excellentThreshold: 85,
        lowScoreThreshold: 40,
        borderlineRange: 5,
        scoreBands: []
      },
      examGroupId: assessment.id,
      examGroupName: { en: assessment.id, zh: assessment.id },
      questionIds: [],
      manualQuestions: [],
      paperSections: [],
      opensAt: null,
      closesAt: null,
      timeLimitMinutes: null,
      maxAttempts: 1,
      randomizeQuestionOrder: false,
      showAnswersImmediately: true,
      gradeWeight: 1,
      createdBy: "teacher-1",
      createdAt: assessment.created_at,
      updatedAt: assessment.created_at,
      submissionCount: 0,
      submittedCount: 0
    })
  });
}

function sessionFor(id: string, name = id): StudentSession {
  return {
    id,
    name,
    username: name,
    role: id.startsWith("admin") ? "admin" : "teacher",
    grade: "S2",
    curriculumTrack: "HK",
    curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
    avatarId: "sigma"
  };
}

function classProjection(teacherClass: { id: string; teacher_id: string; name: string; grade: TeacherClass["grade"] }): TeacherClass {
  return {
    id: teacherClass.id,
    teacherId: teacherClass.teacher_id,
    name: teacherClass.name,
    grade: teacherClass.grade,
    academicYear: "2025-2026",
    description: { en: "", zh: "" },
    studentCount: 0,
    inviteCode: teacherClass.id.toUpperCase(),
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  };
}

test("teacher ops foundation persistence builds shell data without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsFoundationPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const fallback = {
    teacher: sessionFor("storage-free-teacher", "Storage Free"),
    classes: [classProjection({ id: "storage-class", teacher_id: "storage-free-teacher", name: "Storage", grade: "S2" })]
  };
  const store = createTestStore(createDatabase(), fallback);

  assert.deepEqual((await store.getTeacherShellData("teacher-1"))?.classes.map((teacherClass) => teacherClass.id), [
    "class-owned",
    "class-shared"
  ]);
  assert.deepEqual(await store.getTeacherShellData("storage-free-teacher"), {
    teacher: fallback.teacher,
    classes: fallback.classes
  });
  assert.deepEqual((await store.getTeacherShellData("postgres-teacher"))?.classes.map((teacherClass) => teacherClass.id), ["postgres-class"]);
  assert.equal(await store.getTeacherShellData("student-1"), null);
});

test("teacher ops foundation persistence builds foundation data", async () => {
  const store = createTestStore(createDatabase());

  const data = await store.getTeacherFoundationData("teacher-1");

  assert.equal(data?.teacher.id, "teacher-1");
  assert.deepEqual(data?.classes.map((teacherClass) => teacherClass.id), ["class-owned", "class-shared"]);
  assert.deepEqual(data?.totals, {
    classes: 2,
    students: 3,
    activeAssignments: 1,
    unreadMessages: 1,
    resources: 2,
    assessments: 2
  });
  assert.deepEqual(data?.recentAssignments.map((assignment) => assignment.id), [
    "assignment-owned-new",
    "assignment-shared",
    "assignment-owned-old"
  ]);
  assert.deepEqual(data?.inboxPreview.map((message) => message.id), ["message-owned", "message-shared"]);
  assert.deepEqual(data?.resources.map((resource) => resource.id), ["resource-owned-new", "resource-owned-old"]);
  assert.deepEqual(data?.assessments.map((assessment) => assessment.id), ["assessment-owned-new", "assessment-shared"]);

  const adminData = await store.getTeacherFoundationData("admin-1");
  assert.equal(adminData?.totals.classes, 3);
  assert.deepEqual(adminData?.resources.map((resource) => resource.id), ["resource-other", "resource-owned-new", "resource-owned-old"]);
  assert.equal(await store.getTeacherFoundationData("student-1"), null);
});

test("teacher class scoping helper lives in teacher foundation persistence, not root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsFoundationPersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof helpers.teacherClassRecordsFor, "function");
  assert.match(persistenceSource, /export function teacherClassRecordsFor\b/);
  assert.doesNotMatch(rootSource, /function teacherClassRecordsFor\(/);
  assert.match(rootSource, /teacherClassRecordsFor as teacherClassRecordsForFromTeacherOpsFoundation/);
  assert.match(rootSource, /teacherClassRecordsForFromTeacherOpsFoundation\(database, user\)/);

  const teacherClassRecordsFor = helpers.teacherClassRecordsFor as (
    database: TeacherOpsFoundationPersistenceDatabase,
    user: { id: string; role: "teacher" | "admin" | "student" }
  ) => TeacherOpsFoundationPersistenceDatabase["teacher_classes"];
  const database = createDatabase();

  assert.deepEqual(
    teacherClassRecordsFor(database, { id: "teacher-1", role: "teacher" }).map((teacherClass) => teacherClass.id),
    ["class-owned", "class-shared"]
  );
  assert.deepEqual(
    teacherClassRecordsFor(database, { id: "admin-1", role: "admin" }).map((teacherClass) => teacherClass.id),
    ["class-owned", "class-shared", "class-other"]
  );
  assert.deepEqual(
    teacherClassRecordsFor(database, { id: "student-1", role: "student" }).map((teacherClass) => teacherClass.id),
    []
  );
});

test("teacher class access helper lives in teacher foundation persistence, not root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsFoundationPersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof helpers.teacherCanAccessClass, "function");
  assert.match(persistenceSource, /export function teacherCanAccessClass\b/);
  assert.doesNotMatch(rootSource, /function teacherCanAccessClass\(/);
  assert.match(rootSource, /teacherCanAccessClass as teacherCanAccessClassFromTeacherOpsFoundation/);
  assert.match(rootSource, /teacherCanAccessClassFromTeacherOpsFoundation\(database, user, classId\)/);

  const teacherCanAccessClass = helpers.teacherCanAccessClass as (
    database: TeacherOpsFoundationPersistenceDatabase,
    user: { id: string; role: "teacher" | "admin" | "student" },
    classId: string
  ) => TeacherOpsFoundationPersistenceDatabase["teacher_classes"][number] | null;
  const database = createDatabase();

  assert.equal(teacherCanAccessClass(database, { id: "teacher-1", role: "teacher" }, "class-owned")?.id, "class-owned");
  assert.equal(teacherCanAccessClass(database, { id: "teacher-1", role: "teacher" }, "class-shared")?.id, "class-shared");
  assert.equal(teacherCanAccessClass(database, { id: "teacher-1", role: "teacher" }, "class-other"), null);
  assert.equal(teacherCanAccessClass(database, { id: "admin-1", role: "admin" }, "class-other")?.id, "class-other");
  assert.equal(teacherCanAccessClass(database, { id: "student-1", role: "student" }, "class-owned"), null);
  assert.equal(teacherCanAccessClass(database, { id: "teacher-1", role: "teacher" }, "missing-class"), null);
});

test("teacher media-owner access is limited to students enrolled in classes the teacher can access", () => {
  const database = createDatabase();
  const hashUserId = (userId: string) => `owner-hash:${userId}`;

  assert.equal(teacherCanAccessStudentByOwnerHash(
    database,
    { id: "teacher-1", role: "teacher" },
    hashUserId("student-a"),
    hashUserId
  ), true);
  assert.equal(teacherCanAccessStudentByOwnerHash(
    database,
    { id: "teacher-1", role: "teacher" },
    hashUserId("student-c"),
    hashUserId
  ), true, "explicit class membership grants the same scoped relationship as class ownership");
  assert.equal(teacherCanAccessStudentByOwnerHash(
    database,
    { id: "teacher-1", role: "teacher" },
    hashUserId("student-z"),
    hashUserId
  ), false);
  assert.equal(teacherCanAccessStudentByOwnerHash(
    database,
    { id: "student-1", role: "student" },
    hashUserId("student-a"),
    hashUserId
  ), false);
});

test("root userStore exposes the authoritative teacher-to-media-owner relationship check", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(
    rootSource,
    /teacherCanAccessStudentByOwnerHash as teacherCanAccessStudentByOwnerHashFromTeacherOpsFoundation/
  );
  assert.match(rootSource, /export async function teacherCanAccessStudentMediaOwner\b/);
  assert.match(rootSource, /mediaObjectOwnerHash/);
});

test("teacher display name helper lives in teacher foundation persistence, not root userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(persistenceSource, /export function teacherOpsTeacherDisplayName\b/);
  assert.equal(
    teacherOpsTeacherDisplayName(
      {
        student_profiles: [{ user_id: "teacher-1", name: "Dr Ada" }],
        users: [{ id: "teacher-1", username: "Teacher One" }]
      },
      "teacher-1"
    ),
    "Dr Ada"
  );
  assert.equal(
    teacherOpsTeacherDisplayName(
      {
        student_profiles: [],
        users: [{ id: "teacher-2", username: "Teacher Two" }]
      },
      "teacher-2"
    ),
    "Teacher Two"
  );
  assert.equal(
    teacherOpsTeacherDisplayName(
      {
        student_profiles: [],
        users: []
      },
      "missing-teacher"
    ),
    "Teacher"
  );
  assert.doesNotMatch(rootSource, /function teacherDisplayName\(/);
  assert.match(rootSource, /teacherOpsTeacherDisplayName as teacherDisplayNameFromTeacherOpsFoundation/);
});

test("teacher area role guard lives in teacher foundation persistence, not root userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(persistenceSource, /function canUseTeacherArea\(/);
  assert.match(persistenceSource, /export const teacherOpsCanUseTeacherArea = canUseTeacherArea;/);
  assert.doesNotMatch(rootSource, /function canUseTeacherArea\(/);
  assert.match(rootSource, /teacherOpsCanUseTeacherArea as canUseTeacherAreaFromTeacherOpsFoundation/);

  assert.equal(teacherOpsCanUseTeacherArea({ id: "teacher-1", role: "teacher" }), true);
  assert.equal(teacherOpsCanUseTeacherArea({ id: "admin-1", role: "admin" }), true);
  assert.equal(teacherOpsCanUseTeacherArea({ id: "student-1", role: "student" }), false);
  assert.equal(teacherOpsCanUseTeacherArea(null), false);
});

test("teacher ops foundation persistence owns projection array guard", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsFoundationPersistence") as Record<string, unknown>;
  const projectionArray = helpers.teacherOpsProjectionArray as (<T>(value: unknown) => T[]) | undefined;
  const values = [{ id: "first" }, { id: "second" }];

  assert.equal(typeof projectionArray, "function");
  assert.match(persistenceSource, /export function teacherOpsProjectionArray\b/);
  assert.match(rootSource, /teacherOpsProjectionArray as projectionArrayFromTeacherOpsFoundation/);
  assert.doesNotMatch(rootSource, /function projectionArray\b/);
  assert.deepEqual(projectionArray?.<{ id: string }>(values), values);
  assert.deepEqual(projectionArray?.<{ id: string }>({ id: "not-an-array" }), []);
  assert.deepEqual(projectionArray?.<{ id: string }>(null), []);
});

test("teacher ops foundation persistence owns projected class records helper", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsFoundationPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsFoundationPersistence") as Record<string, unknown>;
  const projectedClassesFromRecords = helpers.teacherOpsProjectedClassesFromRecords as
    | ((input: {
        classRecords: Array<Record<string, unknown>>;
        enrollmentRecords: Array<{ class_id: string; student_id: string }>;
        teacher: StudentSession;
      }) => TeacherClass[])
    | undefined;

  assert.equal(typeof projectedClassesFromRecords, "function");
  assert.match(persistenceSource, /export function teacherOpsProjectedClassesFromRecords\b/);
  assert.match(rootSource, /teacherOpsProjectedClassesFromRecords as teacherClassesFromProjectedRecordsFromTeacherOpsFoundation/);
  assert.doesNotMatch(rootSource, /function teacherClassesFromProjectedRecords\b/);

  const teacher = sessionFor("teacher-1", "Teacher One");
  assert.deepEqual(
    projectedClassesFromRecords?.({
      classRecords: [
        {
          id: "class-s3",
          teacher_id: "teacher-1",
          school_id: "school-a",
          class_code: "S3A",
          name: "S3 Algebra",
          grade: "S3",
          academic_year: "2026-2027",
          description_en: "Algebra",
          description_zh: "代數",
          invite_code: "JOIN-S3",
          created_at: "2026-06-20T10:00:00.000Z",
          updated_at: "2026-06-20T11:00:00.000Z"
        },
        {
          id: "class-s2",
          teacher_id: "teacher-1",
          name: "S2 Geometry",
          grade: "S2",
          academic_year: "2026-2027",
          description_en: "Geometry",
          description_zh: "幾何",
          invite_code: "JOIN-S2",
          created_at: "2026-06-19T10:00:00.000Z",
          updated_at: "2026-06-19T11:00:00.000Z"
        }
      ],
      enrollmentRecords: [
        { class_id: "class-s3", student_id: "student-1" },
        { class_id: "class-s3", student_id: "student-2" },
        { class_id: "class-other", student_id: "student-z" }
      ],
      teacher
    }),
    [
      {
        id: "class-s2",
        teacherId: "teacher-1",
        schoolId: undefined,
        classCode: undefined,
        name: "S2 Geometry",
        grade: "S2",
        curriculumTrack: "HK",
        curriculumProfile: teacher.curriculumProfile,
        academicYear: "2026-2027",
        description: {
          en: "Geometry",
          zh: "幾何"
        },
        studentCount: 0,
        inviteCode: "JOIN-S2",
        createdAt: "2026-06-19T10:00:00.000Z",
        updatedAt: "2026-06-19T11:00:00.000Z"
      },
      {
        id: "class-s3",
        teacherId: "teacher-1",
        schoolId: "school-a",
        classCode: "S3A",
        name: "S3 Algebra",
        grade: "S3",
        curriculumTrack: "HK",
        curriculumProfile: teacher.curriculumProfile,
        academicYear: "2026-2027",
        description: {
          en: "Algebra",
          zh: "代數"
        },
        studentCount: 2,
        inviteCode: "JOIN-S3",
        createdAt: "2026-06-20T10:00:00.000Z",
        updatedAt: "2026-06-20T11:00:00.000Z"
      }
    ]
  );
});

test("legacy userStore delegates teacher shell and foundation data to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /teacherOpsFoundationPersistenceStore = createTeacherOpsFoundationPersistenceStore/);
  assert.match(source, /export const getTeacherShellData = teacherOpsUserStore\.getTeacherShellData/);
  assert.match(source, /export const getTeacherFoundationData = teacherOpsUserStore\.getTeacherFoundationData/);
  assert.equal(/export async function getTeacherShellData\(/.test(source), false);
  assert.equal(/export async function getTeacherFoundationData\(/.test(source), false);
});
