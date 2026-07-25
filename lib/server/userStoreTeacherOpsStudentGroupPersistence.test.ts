import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsStudentGroupPersistenceStore,
  listTeacherStudentGroupsForClass,
  normalizeTeacherStudentGroupRecords,
  toTeacherStudentGroup,
  type TeacherOpsStudentGroupPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsStudentGroupPersistence";

function createDatabase(): TeacherOpsStudentGroupPersistenceDatabase {
  return {
    class_enrollments: [
      { id: "enrollment-1", class_id: "class-owned", student_id: "student-1", joined_at: "2026-06-18T00:00:00.000Z" },
      { id: "enrollment-2", class_id: "class-owned", student_id: "student-2", joined_at: "2026-06-18T00:00:00.000Z" }
    ],
    school_memberships: [{ user_id: "teacher-member", class_id: "class-owned", role: "teacher" }],
    teacher_classes: [
      { id: "class-owned", teacher_id: "teacher-1", name: "3A", grade: "S3" },
      { id: "class-other", teacher_id: "teacher-other", name: "4A", grade: "S4" }
    ],
    teacher_student_groups: [],
    teacher_mastery_targets: [],
    users: [
      { id: "teacher-1", role: "teacher", username: "Tess" },
      { id: "teacher-member", role: "teacher", username: "Mo" },
      { id: "teacher-other", role: "teacher", username: "Other" },
      { id: "admin-1", role: "admin", username: "Admin" },
      { id: "student-1", role: "student", username: "Ada" },
      { id: "student-2", role: "student", username: "Ben" },
      { id: "student-3", role: "student", username: "Cal" }
    ]
  };
}

function createTestStore(database: TeacherOpsStudentGroupPersistenceDatabase) {
  let counter = 0;
  return createTeacherOpsStudentGroupPersistenceStore({
    createId: () => `id-${++counter}`,
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    studentDisplayName: (source, studentId) =>
      source.users.find((candidate) => candidate.id === studentId)?.username ?? studentId,
    topicIdsForClass: (_source, teacherClass) => (teacherClass.id === "class-owned" ? ["topic-1", "topic-2"] : [])
  });
}

test("student group persistence has no legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsStudentGroupPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);
});

test("createTeacherStudentGroup keeps only enrolled members and projects names", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).createTeacherStudentGroup({
    teacherId: "teacher-1",
    classId: "class-owned",
    name: "  Fractions support  ",
    tier: "support",
    memberStudentIds: ["student-1", "student-3", "student-1", "not-a-student"]
  });

  assert.equal(result.status, "created");
  assert.equal(result.group.name, "Fractions support");
  assert.equal(result.group.tier, "support");
  assert.equal(result.group.color, "amber");
  assert.deepEqual(result.group.memberStudentIds, ["student-1"]);
  assert.deepEqual(result.group.memberNames, ["Ada"]);
  assert.equal(result.group.studentCount, 1);
  assert.equal(database.teacher_student_groups.length, 1);
});

test("updateTeacherStudentGroup edits fields and members", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const created = await store.createTeacherStudentGroup({ teacherId: "teacher-1", classId: "class-owned", name: "Core", tier: "core" });
  assert.equal(created.status, "created");

  const updated = await store.updateTeacherStudentGroup({
    teacherId: "teacher-1",
    classId: "class-owned",
    groupId: created.group.id,
    name: "Core movers",
    tier: "stretch",
    memberStudentIds: ["student-1", "student-2"]
  });

  assert.equal(updated.status, "saved");
  assert.equal(updated.group.name, "Core movers");
  assert.equal(updated.group.tier, "stretch");
  assert.deepEqual(updated.group.memberStudentIds, ["student-1", "student-2"]);
});

test("group mastery target fans out to every member and can be cleared", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const created = await store.createTeacherStudentGroup({
    teacherId: "teacher-1",
    classId: "class-owned",
    name: "Support",
    tier: "support",
    memberStudentIds: ["student-1", "student-2"]
  });
  assert.equal(created.status, "created");

  const saved = await store.setTeacherStudentGroupMasteryTarget({
    teacherId: "teacher-1",
    classId: "class-owned",
    groupId: created.group.id,
    topicId: "topic-2",
    mastery: 101.5,
    note: "  push to fluency  "
  });

  assert.equal(saved.status, "saved");
  assert.equal(saved.appliedTo, 2);
  assert.deepEqual(saved.group.masteryTarget, {
    topicId: "topic-2",
    mastery: 100,
    note: "push to fluency",
    updatedAt: "2026-06-21T08:00:00.000Z"
  });
  assert.equal(database.teacher_mastery_targets.length, 2);
  assert.ok(database.teacher_mastery_targets.every((target) => target.topic_id === "topic-2" && target.mastery === 100));
  assert.deepEqual(
    database.teacher_mastery_targets.map((target) => target.student_id).sort(),
    ["student-1", "student-2"]
  );

  const cleared = await store.clearTeacherStudentGroupMasteryTarget({
    teacherId: "teacher-1",
    classId: "class-owned",
    groupId: created.group.id
  });
  assert.equal(cleared.status, "cleared");
  assert.equal(cleared.group.masteryTarget, null);
  assert.deepEqual(database.teacher_mastery_targets, []);
});

test("group mastery target rejects invalid topic and unauthorized callers", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const created = await store.createTeacherStudentGroup({
    teacherId: "teacher-1",
    classId: "class-owned",
    name: "Support",
    memberStudentIds: ["student-1"]
  });
  assert.equal(created.status, "created");

  assert.equal(
    (await store.setTeacherStudentGroupMasteryTarget({
      teacherId: "teacher-1",
      classId: "class-owned",
      groupId: created.group.id,
      topicId: "topic-missing",
      mastery: 50
    })).status,
    "topic-not-found"
  );
  assert.equal(
    (await store.setTeacherStudentGroupMasteryTarget({
      teacherId: "student-1",
      classId: "class-owned",
      groupId: created.group.id,
      topicId: "topic-1",
      mastery: 50
    })).status,
    "forbidden"
  );
  assert.equal(
    (await store.createTeacherStudentGroup({ teacherId: "teacher-other", classId: "class-owned", name: "Nope" })).status,
    "not-found"
  );
});

test("deleteTeacherStudentGroup removes only the target group", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const first = await store.createTeacherStudentGroup({ teacherId: "teacher-1", classId: "class-owned", name: "One" });
  const second = await store.createTeacherStudentGroup({ teacherId: "teacher-1", classId: "class-owned", name: "Two" });
  assert.equal(first.status, "created");
  assert.equal(second.status, "created");

  const deleted = await store.deleteTeacherStudentGroup({ teacherId: "teacher-1", classId: "class-owned", groupId: first.group.id });
  assert.equal(deleted.status, "deleted");
  assert.equal(database.teacher_student_groups.length, 1);
  assert.equal(database.teacher_student_groups[0]?.id, second.group.id);
});

test("normalizeTeacherStudentGroupRecords repairs durable records", () => {
  const normalized = normalizeTeacherStudentGroupRecords(
    [
      {
        id: "",
        class_id: "class-owned",
        teacher_id: "teacher-1",
        name: "  Renamed  ",
        tier: "bogus" as never,
        color: "not-a-color",
        note: 42 as never,
        member_student_ids: ["student-1", "student-1", 5 as never],
        mastery_target_topic_id: "topic-1",
        mastery_target_mastery: 140,
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z"
      },
      { class_id: "class-owned", teacher_id: "teacher-1", name: "Bare" } as never
    ],
    "2026-06-21T08:00:00.000Z",
    () => "fixed"
  );

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0]?.id, "student-group-fixed");
  assert.equal(normalized[0]?.name, "Renamed");
  assert.equal(normalized[0]?.tier, "custom");
  assert.equal(normalized[0]?.color, "violet");
  assert.equal(normalized[0]?.note, "");
  assert.deepEqual(normalized[0]?.member_student_ids, ["student-1"]);
  assert.equal(normalized[0]?.mastery_target_mastery, 100);
  assert.equal(normalized[1]?.name, "Bare");
  assert.equal(normalized[1]?.tier, "custom");
  assert.deepEqual(normalized[1]?.member_student_ids, []);
  assert.equal(normalized[1]?.mastery_target_topic_id, undefined);
  assert.equal(normalized[1]?.created_at, "2026-06-21T08:00:00.000Z");
});

test("listTeacherStudentGroupsForClass sorts by tier then name", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  await store.createTeacherStudentGroup({ teacherId: "teacher-1", classId: "class-owned", name: "Stretchers", tier: "stretch" });
  await store.createTeacherStudentGroup({ teacherId: "teacher-1", classId: "class-owned", name: "Boosters", tier: "support" });

  const groups = listTeacherStudentGroupsForClass({
    database,
    classId: "class-owned",
    studentDisplayName: (source, studentId) => source.users.find((candidate) => candidate.id === studentId)?.username ?? studentId
  });
  assert.deepEqual(groups.map((group) => group.tier), ["support", "stretch"]);
});

test("toTeacherStudentGroup surfaces goal summary from a record", () => {
  const database = createDatabase();
  const group = toTeacherStudentGroup({
    database,
    studentDisplayName: (source, studentId) => source.users.find((candidate) => candidate.id === studentId)?.username ?? studentId,
    record: {
      id: "student-group-x",
      class_id: "class-owned",
      teacher_id: "teacher-1",
      name: "Support",
      tier: "support",
      color: "amber",
      note: "",
      member_student_ids: ["student-1", "student-2"],
      mastery_target_topic_id: "topic-1",
      mastery_target_mastery: 70,
      mastery_target_note: "goal",
      mastery_target_updated_at: "2026-06-21T08:00:00.000Z",
      created_at: "2026-06-20T00:00:00.000Z",
      updated_at: "2026-06-21T08:00:00.000Z"
    }
  });

  assert.deepEqual(group.memberNames, ["Ada", "Ben"]);
  assert.deepEqual(group.masteryTarget, { topicId: "topic-1", mastery: 70, note: "goal", updatedAt: "2026-06-21T08:00:00.000Z" });
});
