import assert from "node:assert/strict";
import test from "node:test";
import { mediaObjectOwnerHash } from "./mediaObjectStore";
import { canTeacherReadMediaObject } from "./teacherMediaAccess";

function fixture() {
  return {
    users: ["owner", "co", "outside", "foreign-uploader"].map((id) => ({ id, role: "teacher" })).concat([{ id: "a", role: "student" }, { id: "b", role: "student" }]),
    teacher_classes: [{ id: "class-a", teacher_id: "owner" }, { id: "class-b", teacher_id: "foreign-uploader" }],
    school_memberships: [{ user_id: "co", class_id: "class-a", role: "teacher" }],
    teacher_class_collaborators: [{ teacher_id: "co", class_id: "class-a", role: "viewer", status: "active" }],
    class_enrollments: [{ class_id: "class-a", student_id: "a" }, { class_id: "class-b", student_id: "b" }],
    teacher_live_sessions: [{ id: "session-a", class_id: "class-a" }],
    classroom_work_samples: [{ image_object_key: "classroom-work-sample/synthetic/key", session_id: "session-a", student_id: "a" }]
  };
}

test("work-photo authorization uses current student roster authority, including revoked collaboration", () => {
  const db = fixture();
  const media = { ownerHash: mediaObjectOwnerHash("a"), objectKey: "synthetic/student/photo", capability: "practice-work-photo" as const };
  for (const id of ["owner", "co"]) assert.equal(canTeacherReadMediaObject(db, id, media), true);
  for (const id of ["outside", "foreign-uploader", "a"]) assert.equal(canTeacherReadMediaObject(db, id, media), false);
  db.teacher_class_collaborators[0].status = "revoked";
  assert.equal(canTeacherReadMediaObject(db, "co", media), false);
  assert.equal(canTeacherReadMediaObject(db, "owner", { ...media, ownerHash: mediaObjectOwnerHash("b") }), false);
});

test("teacher-uploaded samples need exact classroom context and class-authorized uploader", () => {
  const db = fixture();
  const media = { ownerHash: mediaObjectOwnerHash("owner"), objectKey: "classroom-work-sample/synthetic/key", capability: "classroom-work-sample" as const };
  assert.equal(canTeacherReadMediaObject(db, "co", media), true);
  assert.equal(canTeacherReadMediaObject(db, "outside", media), false);
  assert.equal(canTeacherReadMediaObject(db, "co", { ...media, objectKey: "synthetic/unknown" }), false);
  assert.equal(canTeacherReadMediaObject(db, "co", { ...media, ownerHash: mediaObjectOwnerHash("foreign-uploader") }), false, "a forged persisted reference must not launder a foreign owner's key");
});

test("teacher roster authorization never grants profile-avatar or orphaned-owner reads", () => {
  const db = fixture();
  assert.equal(canTeacherReadMediaObject(db, "owner", { ownerHash: mediaObjectOwnerHash("a"), objectKey: "synthetic/avatar", capability: "profile-avatar" }), false);
  assert.equal(canTeacherReadMediaObject(db, "owner", { ownerHash: mediaObjectOwnerHash("deleted-user"), objectKey: "synthetic/work", capability: "assignment-image" }), false);
});
