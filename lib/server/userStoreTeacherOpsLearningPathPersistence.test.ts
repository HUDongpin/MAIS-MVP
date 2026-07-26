import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsLearningPathPersistenceStore,
  normalizeTeacherLearningPathRecords,
  type TeacherOpsLearningPathPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsLearningPathPersistence";

function createDatabase(): TeacherOpsLearningPathPersistenceDatabase {
  return {
    class_enrollments: [
      { id: "enrollment-1", class_id: "class-owned", student_id: "student-1", joined_at: "2026-06-18T00:00:00.000Z" },
      { id: "enrollment-2", class_id: "class-owned", student_id: "student-2", joined_at: "2026-06-18T00:00:00.000Z" }
    ],
    school_memberships: [],
    teacher_classes: [
      { id: "class-owned", teacher_id: "teacher-1", name: "3A", grade: "S3" },
      { id: "class-other", teacher_id: "teacher-other", name: "4A", grade: "S4" }
    ],
    teacher_student_groups: [
      { id: "group-1", class_id: "class-owned", name: "Support", member_student_ids: ["student-1"] }
    ],
    teacher_learning_paths: [],
    learning_path_step_progress: [],
    users: [
      { id: "teacher-1", role: "teacher", username: "Tess" },
      { id: "teacher-other", role: "teacher", username: "Other" },
      { id: "student-1", role: "student", username: "Ada" },
      { id: "student-2", role: "student", username: "Ben" }
    ]
  };
}

function createTestStore(database: TeacherOpsLearningPathPersistenceDatabase) {
  let counter = 0;
  return createTeacherOpsLearningPathPersistenceStore({
    createId: () => `id-${++counter}`,
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

function expectStatus<R extends { status: string }, S extends R["status"]>(
  result: R,
  status: S
): asserts result is Extract<R, { status: S }> {
  assert.equal(result.status, status);
}

const twoSteps = [
  { kind: "lesson", targetId: "frac-basics", title: "Learn fractions" },
  { kind: "practice", targetId: "frac-topic", title: "Practice fractions" }
];

test("learning path persistence has no legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLearningPathPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);
});

test("createTeacherLearningPath assigns the whole class and orders steps", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).createTeacherLearningPath({
    teacherId: "teacher-1",
    classId: "class-owned",
    title: "Fractions track",
    steps: twoSteps
  });

  expectStatus(result, "created");
  assert.deepEqual(result.path.assignedStudentIds.sort(), ["student-1", "student-2"]);
  assert.equal(result.path.steps.length, 2);
  assert.deepEqual(result.path.steps.map((step) => step.order), [0, 1]);
  assert.equal(result.path.steps[0]?.kind, "lesson");
  assert.equal(database.teacher_learning_paths.length, 1);
});

test("createTeacherLearningPath with a group assigns only group members", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).createTeacherLearningPath({
    teacherId: "teacher-1",
    classId: "class-owned",
    title: "Support track",
    groupId: "group-1",
    steps: twoSteps
  });
  expectStatus(result, "created");
  assert.deepEqual(result.path.assignedStudentIds, ["student-1"]);
  assert.equal(result.path.groupId, "group-1");
  assert.equal(result.path.groupName, "Support");
});

test("createTeacherLearningPath rejects empty steps and unauthorized callers", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  assert.equal((await store.createTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", title: "X", steps: [] })).status, "no-steps");
  assert.equal((await store.createTeacherLearningPath({ teacherId: "student-1", classId: "class-owned", title: "X", steps: twoSteps })).status, "forbidden");
  assert.equal((await store.createTeacherLearningPath({ teacherId: "teacher-other", classId: "class-owned", title: "X", steps: twoSteps })).status, "not-found");
  assert.equal((await store.createTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", title: "X", groupId: "nope", steps: twoSteps })).status, "group-not-found");
});

test("student sees sequential unlock and completes steps in order", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const created = await store.createTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", title: "Track", steps: twoSteps });
  expectStatus(created, "created");
  const [step0, step1] = created.path.steps;
  assert.ok(step0 && step1);

  const initial = await store.getStudentLearningPaths("student-1");
  assert.ok(initial);
  assert.equal(initial?.length, 1);
  assert.equal(initial?.[0]?.steps[0]?.status, "available");
  assert.equal(initial?.[0]?.steps[1]?.status, "locked");
  assert.equal(initial?.[0]?.currentStepId, step0.id);
  assert.equal(initial?.[0]?.steps[0]?.href, "/student/lessons/frac-basics");

  // Cannot skip ahead
  const skip = await store.markStudentLearningPathStepComplete({ studentId: "student-1", pathId: created.path.id, stepId: step1.id });
  assert.equal(skip.status, "locked");

  const first = await store.markStudentLearningPathStepComplete({ studentId: "student-1", pathId: created.path.id, stepId: step0.id });
  expectStatus(first, "completed");
  assert.equal(first.path.steps[0]?.status, "completed");
  assert.equal(first.path.steps[1]?.status, "available");
  assert.equal(first.path.completed, false);

  const second = await store.markStudentLearningPathStepComplete({ studentId: "student-1", pathId: created.path.id, stepId: step1.id });
  expectStatus(second, "completed");
  assert.equal(second.path.completed, true);
  assert.equal(second.path.completedStepCount, 2);
});

test("teacher projection reflects per-student completion", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const created = await store.createTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", title: "Track", steps: twoSteps });
  expectStatus(created, "created");
  const [step0, step1] = created.path.steps;
  await store.markStudentLearningPathStepComplete({ studentId: "student-1", pathId: created.path.id, stepId: step0!.id });
  await store.markStudentLearningPathStepComplete({ studentId: "student-1", pathId: created.path.id, stepId: step1!.id });

  const refreshed = await store.updateTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", pathId: created.path.id, title: "Track v2" });
  expectStatus(refreshed, "saved");
  assert.equal(refreshed.path.title, "Track v2");
  assert.equal(refreshed.path.completedCount, 1); // student-1 finished all steps, student-2 none
  assert.equal(refreshed.path.averageStepsCompleted, 1); // (2 + 0) / 2
});

test("deleteTeacherLearningPath removes the path and its progress", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const created = await store.createTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", title: "Track", steps: twoSteps });
  expectStatus(created, "created");
  await store.markStudentLearningPathStepComplete({ studentId: "student-1", pathId: created.path.id, stepId: created.path.steps[0]!.id });

  const deleted = await store.deleteTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", pathId: created.path.id });
  assert.equal(deleted.status, "deleted");
  assert.equal(database.teacher_learning_paths.length, 0);
  assert.equal(database.learning_path_step_progress.length, 0);
});

test("updateTeacherLearningPath can reassign to a group", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const created = await store.createTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", title: "Track", steps: twoSteps });
  expectStatus(created, "created");
  const updated = await store.updateTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", pathId: created.path.id, groupId: "group-1" });
  expectStatus(updated, "saved");
  assert.deepEqual(updated.path.assignedStudentIds, ["student-1"]);
});

test("updateTeacherLearningPath keeps progress for steps that keep their ids", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const created = await store.createTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", title: "Track", steps: twoSteps });
  expectStatus(created, "created");
  const [step0, step1] = created.path.steps;
  await store.markStudentLearningPathStepComplete({ studentId: "student-1", pathId: created.path.id, stepId: step0!.id });

  const updated = await store.updateTeacherLearningPath({
    teacherId: "teacher-1",
    classId: "class-owned",
    pathId: created.path.id,
    steps: [
      { id: step0!.id, kind: "lesson", targetId: "frac-basics", title: "Learn fractions v2" },
      { id: step1!.id, kind: "practice", targetId: "frac-topic", title: "Practice fractions" },
      { id: "path-step-forged", kind: "assessment", targetId: "frac-quiz", title: "Quiz" }
    ]
  });
  expectStatus(updated, "saved");
  assert.equal(updated.path.steps[0]?.id, step0!.id);
  assert.equal(updated.path.steps[1]?.id, step1!.id);
  assert.notEqual(updated.path.steps[2]?.id, "path-step-forged"); // unknown ids are never adopted

  const projected = await store.getStudentLearningPaths("student-1");
  assert.equal(projected?.[0]?.steps[0]?.status, "completed");
  assert.equal(projected?.[0]?.steps[1]?.status, "available");
  assert.equal(projected?.[0]?.completedStepCount, 1);
});

test("updateTeacherLearningPath prunes progress rows for removed steps", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const created = await store.createTeacherLearningPath({ teacherId: "teacher-1", classId: "class-owned", title: "Track", steps: twoSteps });
  expectStatus(created, "created");
  await store.markStudentLearningPathStepComplete({ studentId: "student-1", pathId: created.path.id, stepId: created.path.steps[0]!.id });
  assert.equal(database.learning_path_step_progress.length, 1);

  const replaced = await store.updateTeacherLearningPath({
    teacherId: "teacher-1",
    classId: "class-owned",
    pathId: created.path.id,
    steps: [{ kind: "lesson", targetId: "new-target", title: "Fresh start" }]
  });
  expectStatus(replaced, "saved");
  assert.equal(database.learning_path_step_progress.length, 0);

  const projected = await store.getStudentLearningPaths("student-1");
  assert.equal(projected?.[0]?.completedStepCount, 0);
  assert.equal(projected?.[0]?.steps[0]?.status, "available");
});

test("normalizeTeacherLearningPathRecords repairs durable records", () => {
  const normalized = normalizeTeacherLearningPathRecords(
    [
      {
        id: "",
        class_id: "class-owned",
        teacher_id: "teacher-1",
        title: "  Track  ",
        description: 5 as never,
        status: "weird" as never,
        steps: [{ kind: "bogus", target_id: "x", title: "S1" }] as never,
        assigned_student_ids: ["student-1", "student-1"],
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z"
      },
      { class_id: "class-owned", teacher_id: "teacher-1", title: "Bare" } as never
    ],
    "2026-06-21T08:00:00.000Z",
    () => "fixed"
  );
  assert.equal(normalized.length, 2);
  assert.equal(normalized[1]?.title, "Bare");
  assert.equal(normalized[0]?.id, "learning-path-fixed");
  assert.equal(normalized[0]?.title, "Track");
  assert.equal(normalized[0]?.status, "active");
  assert.equal(normalized[0]?.steps[0]?.kind, "lesson");
  assert.deepEqual(normalized[0]?.assigned_student_ids, ["student-1"]);
});
