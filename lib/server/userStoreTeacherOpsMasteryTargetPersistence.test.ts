import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import * as teacherOpsMasteryTargetPersistence from "@/lib/server/userStore/teacherOpsMasteryTargetPersistence";
import {
  createTeacherOpsMasteryTargetPersistenceStore,
  toTeacherOpsStudentMasteryTarget,
  type TeacherOpsMasteryTargetPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsMasteryTargetPersistence";

function createDatabase(): TeacherOpsMasteryTargetPersistenceDatabase {
  return {
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-owned",
        student_id: "student-1",
        joined_at: "2026-06-18T00:00:00.000Z"
      }
    ],
    school_memberships: [
      {
        user_id: "teacher-member",
        class_id: "class-owned",
        role: "teacher"
      }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        name: "3A",
        grade: "S3"
      },
      {
        id: "class-other",
        teacher_id: "teacher-other",
        name: "4A",
        grade: "S4"
      }
    ],
    teacher_mastery_targets: [
      {
        id: "target-existing",
        teacher_id: "teacher-1",
        student_id: "student-1",
        topic_id: "topic-1",
        mastery: 60,
        note: "Existing",
        updated_at: "2026-06-20T00:00:00.000Z"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher", username: "Tess" },
      { id: "teacher-member", role: "teacher", username: "Mo" },
      { id: "teacher-other", role: "teacher", username: "Other" },
      { id: "admin-1", role: "admin", username: "Admin" },
      { id: "student-1", role: "student", username: "Ada" },
      { id: "student-2", role: "student", username: "Ben" }
    ]
  };
}

function createTestStore(database: TeacherOpsMasteryTargetPersistenceDatabase) {
  return createTeacherOpsMasteryTargetPersistenceStore({
    createId: () => "target-new",
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    teacherDisplayName: (_database, teacherId) => `Teacher ${teacherId}`,
    topicIdsForClass: (_database, teacherClass) => teacherClass.id === "class-owned" ? ["topic-1", "topic-2"] : []
  });
}

test("teacher ops mastery target persistence owns durable record normalization", async () => {
  const module = teacherOpsMasteryTargetPersistence as Record<string, unknown>;
  assert.equal(typeof module.normalizeTeacherMasteryTargetRecords, "function");

  const normalizeTeacherMasteryTargetRecords =
    module.normalizeTeacherMasteryTargetRecords as (
      records: Array<Record<string, unknown>> | undefined,
      now: string,
      createId: () => string
    ) => Array<Record<string, unknown>>;

  assert.deepEqual(
    normalizeTeacherMasteryTargetRecords([
      {
        id: "",
        teacher_id: "teacher-1",
        student_id: "student-1",
        topic_id: "topic-1",
        mastery: 102.4,
        note: "x".repeat(320),
        updated_at: 123
      },
      {
        id: "target-kept",
        teacher_id: "teacher-1",
        student_id: "student-1",
        topic_id: "topic-2",
        mastery: -1.4,
        note: 123,
        updated_at: "2026-06-20T09:00:00.000Z"
      },
      {
        teacher_id: "teacher-1",
        student_id: "student-1",
        mastery: 70
      }
    ], "2026-06-21T08:00:00.000Z", () => "deterministic"),
    [
      {
        id: "mastery-target-deterministic",
        teacher_id: "teacher-1",
        student_id: "student-1",
        topic_id: "topic-1",
        mastery: 100,
        note: "x".repeat(280),
        updated_at: "2026-06-21T08:00:00.000Z"
      },
      {
        id: "target-kept",
        teacher_id: "teacher-1",
        student_id: "student-1",
        topic_id: "topic-2",
        mastery: 0,
        note: "",
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ]
  );

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /function normalizeTeacherMasteryTargetRecords\b/);
  assert.doesNotMatch(rootSource, /function boundedMasteryPercent\b/);
});

test("teacher ops mastery target persistence saves bounded targets without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsMasteryTargetPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const longNote = `  ${"x".repeat(320)}  `;
  const result = await createTestStore(database).setTeacherStudentMasteryTarget({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentId: "student-1",
    topicId: "topic-2",
    mastery: 101.6,
    note: longNote
  });

  assert.equal(result.status, "saved");
  assert.deepEqual(result.target, {
    topicId: "topic-2",
    mastery: 100,
    note: "x".repeat(280),
    updatedAt: "2026-06-21T08:00:00.000Z",
    teacherName: "Teacher teacher-1"
  });
  assert.deepEqual(database.teacher_mastery_targets.at(-1), {
    id: "mastery-target-target-new",
    teacher_id: "teacher-1",
    student_id: "student-1",
    topic_id: "topic-2",
    mastery: 100,
    note: "x".repeat(280),
    updated_at: "2026-06-21T08:00:00.000Z"
  });
});

test("teacher ops mastery target persistence owns student mastery target projection", async () => {
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsMasteryTargetPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const database = createDatabase();
  const record = database.teacher_mastery_targets[0];

  assert.ok(record);
  assert.match(helperSource, /export function toTeacherOpsStudentMasteryTarget\b/);
  assert.deepEqual(toTeacherOpsStudentMasteryTarget({
    database,
    record,
    teacherDisplayName: (_database, teacherId) => `Teacher ${teacherId}`
  }), {
    topicId: "topic-1",
    mastery: 60,
    note: "Existing",
    updatedAt: "2026-06-20T00:00:00.000Z",
    teacherName: "Teacher teacher-1"
  });
  assert.match(rootSource, /toTeacherOpsStudentMasteryTarget as toTeacherStudentMasteryTargetFromTeacherOpsMasteryTarget/);
  assert.doesNotMatch(rootSource, /function toTeacherStudentMasteryTarget\b/);
});

test("teacher ops mastery target persistence owns mastery permission helper boundary", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.doesNotMatch(rootSource, /function teacherCanSetMasteryTargetForTopic\b/);
});

test("teacher ops mastery target persistence updates existing targets and clears by teacher", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const update = await store.setTeacherStudentMasteryTarget({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentId: "student-1",
    topicId: "topic-1",
    mastery: 74.4,
    note: "  Updated note  "
  });

  assert.equal(update.status, "saved");
  assert.equal(update.target.mastery, 74);
  assert.equal(update.target.note, "Updated note");
  assert.equal(database.teacher_mastery_targets.length, 1);
  assert.equal(database.teacher_mastery_targets[0]?.id, "target-existing");

  assert.deepEqual(await store.clearTeacherStudentMasteryTarget({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentId: "student-1",
    topicId: "topic-1"
  }), { status: "cleared" });
  assert.deepEqual(database.teacher_mastery_targets, []);
});

test("teacher ops mastery target persistence rejects unavailable save and clear requests", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.setTeacherStudentMasteryTarget({
    teacherId: "student-1",
    classId: "class-owned",
    studentId: "student-1",
    topicId: "topic-1",
    mastery: 50
  }), { status: "forbidden" });
  assert.deepEqual(await store.setTeacherStudentMasteryTarget({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentId: "missing-student",
    topicId: "topic-1",
    mastery: 50
  }), { status: "student-not-found" });
  assert.deepEqual(await store.setTeacherStudentMasteryTarget({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentId: "student-1",
    topicId: "missing-topic",
    mastery: 50
  }), { status: "topic-not-found" });
  assert.deepEqual(await store.setTeacherStudentMasteryTarget({
    teacherId: "teacher-other",
    classId: "class-owned",
    studentId: "student-1",
    topicId: "topic-1",
    mastery: 50
  }), { status: "topic-not-found" });
  assert.deepEqual(await store.setTeacherStudentMasteryTarget({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentId: "student-1",
    topicId: "",
    mastery: 50
  }), { status: "invalid" });
  assert.deepEqual(await store.setTeacherStudentMasteryTarget({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentId: "student-1",
    topicId: "topic-1",
    mastery: Number.NaN
  }), { status: "invalid" });
  assert.deepEqual(await store.clearTeacherStudentMasteryTarget({
    teacherId: "teacher-1",
    classId: "class-owned",
    studentId: "student-2",
    topicId: "topic-1"
  }), { status: "topic-not-found" });
});

test("legacy userStore delegates mastery target operations to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const setTeacherStudentMasteryTarget = teacherOpsUserStore\.setTeacherStudentMasteryTarget/);
  assert.match(source, /export const clearTeacherStudentMasteryTarget = teacherOpsUserStore\.clearTeacherStudentMasteryTarget/);
  assert.doesNotMatch(source, /export async function setTeacherStudentMasteryTarget/);
  assert.doesNotMatch(source, /export async function clearTeacherStudentMasteryTarget/);
});
