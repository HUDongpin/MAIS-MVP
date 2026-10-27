import assert from "node:assert/strict";
import test from "node:test";
import { canTeacherAccessClass } from "./teacherClassAccess";
import { teacherOperationClassRecordsFor } from "./userStore/teacherOpsOperationsPersistence";

test("explicit collaborator demotion and revocation override legacy teacher grants only in that class", () => {
  const database = {
    school_memberships: [{ user_id: "teacher", class_id: "a", role: "teacher" }, { user_id: "teacher", class_id: "b", role: "teacher" }],
    teacher_class_collaborators: [{ teacher_id: "teacher", class_id: "a", role: "co-teacher", status: "active" }]
  };
  const user = { id: "teacher", role: "teacher" };
  const a = { id: "a", teacher_id: "owner" };
  assert.equal(canTeacherAccessClass(database, user, a), true);
  database.teacher_class_collaborators[0].role = "viewer";
  assert.equal(canTeacherAccessClass(database, user, a), false);
  assert.equal(canTeacherAccessClass(database, user, a, "read"), true);
  assert.equal(canTeacherAccessClass(database, user, { id: "b", teacher_id: "other" }), true);
  database.teacher_class_collaborators[0].status = "revoked";
  assert.equal(canTeacherAccessClass(database, user, a, "read"), false);
  assert.equal(database.school_memberships.length, 2);
});

test("owner and class/system administrator retain authority; collaborators cannot manage grants", () => {
  const teacherClass = { id: "a", teacher_id: "owner" };
  const database = {
    school_memberships: [{ user_id: "class-admin", class_id: "a", role: "admin" }],
    teacher_class_collaborators: ["owner", "class-admin", "co"].map((teacher_id) => ({ teacher_id, class_id: "a", role: "co-teacher", status: "active" }))
  };
  for (const id of ["owner", "class-admin"]) assert.equal(canTeacherAccessClass(database, { id, role: "teacher" }, teacherClass, "manage"), true);
  assert.equal(canTeacherAccessClass(database, { id: "system-admin", role: "admin" }, teacherClass, "manage"), true);
  assert.equal(canTeacherAccessClass(database, { id: "co", role: "teacher" }, teacherClass, "manage"), false);
  assert.equal(canTeacherAccessClass(database, { id: "owner", role: "student" }, teacherClass), false);
});

test("ambiguous collaborator grants fail closed regardless of row order across operation lists", () => {
  const user = { id: "teacher", role: "teacher" as const };
  const teacherClass = { id: "a", teacher_id: "owner", name: "Class A", grade: "S3" as const, updated_at: "2026-10-01T10:00:00Z" };
  for (const rows of [
    [{ class_id: "a", teacher_id: "teacher", role: "co-teacher" as const, status: "active" as const }, { class_id: "a", teacher_id: "teacher", role: "viewer" as const, status: "revoked" as const }],
    [{ class_id: "a", teacher_id: "teacher", role: "viewer" as const, status: "revoked" as const }, { class_id: "a", teacher_id: "teacher", role: "co-teacher" as const, status: "active" as const }]
  ]) {
    const database = { teacher_classes: [teacherClass], school_memberships: [{ user_id: "teacher", class_id: "a", role: "teacher" as const }], teacher_class_collaborators: rows.map((row, i) => ({ ...row, id: String(i) })) };
    assert.equal(canTeacherAccessClass(database, user, teacherClass), false);
    assert.equal(canTeacherAccessClass(database, user, teacherClass, "read"), false);
    assert.deepEqual(teacherOperationClassRecordsFor(database, user), []);
    assert.equal(canTeacherAccessClass(database, { id: "owner", role: "teacher" }, teacherClass), true);
  }
});
