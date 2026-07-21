import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAccommodationsPersistenceStore,
  normalizeStudentAccommodationsRecords,
  type AccommodationsPersistenceDatabase
} from "@/lib/server/userStore/accommodationsPersistence";
import { defaultStudentAccommodations } from "@/lib/accommodations";

function buildDatabase(): AccommodationsPersistenceDatabase {
  return {
    student_accommodations: [],
    users: [
      { id: "teacher-a", username: "Ms. Owner", role: "teacher" },
      { id: "teacher-b", username: "Mr. Cohort", role: "teacher" },
      { id: "teacher-x", username: "Mr. Outsider", role: "teacher" },
      { id: "admin-1", username: "Principal", role: "admin" },
      { id: "student-1", username: "Sam", role: "student" },
      { id: "student-2", username: "Val", role: "student" },
      { id: "parent-1", username: "Guardian", role: "parent" }
    ],
    teacher_classes: [
      { id: "class-owned", teacher_id: "teacher-a" },
      { id: "class-cohort", teacher_id: "teacher-a" }
    ],
    class_enrollments: [
      { class_id: "class-owned", student_id: "student-1" },
      { class_id: "class-cohort", student_id: "student-2" }
    ],
    // teacher-b co-teaches class-cohort (student-2) via a school membership.
    school_memberships: [
      { user_id: "teacher-b", role: "teacher", class_id: "class-cohort" }
    ]
  };
}

function createStore(database: AccommodationsPersistenceDatabase, now = () => new Date("2026-07-22T10:00:00.000Z")) {
  return createAccommodationsPersistenceStore({
    now,
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

test("getStudentAccommodations returns defaults when no plan exists", async () => {
  const store = createStore(buildDatabase());
  assert.deepEqual(await store.getStudentAccommodations("student-1"), defaultStudentAccommodations);
});

test("an owning teacher can save and read a student's profile with attribution", async () => {
  const database = buildDatabase();
  const store = createStore(database);

  const saved = await store.setStudentAccommodationsForTeacher({
    teacherId: "teacher-a",
    studentId: "student-1",
    accommodations: {
      extendedTime: "double",
      readAloud: true,
      maxAnswerChoices: 3,
      calculatorPolicy: "allowed",
      notes: "IEP on file"
    }
  });

  assert.equal(saved.status, "ok");
  assert.equal(saved.status === "ok" && saved.profile.hasPlan, true);
  assert.equal(saved.status === "ok" && saved.profile.updatedBy, "teacher-a");
  assert.equal(saved.status === "ok" && saved.profile.updatedByName, "Ms. Owner");
  assert.equal(saved.status === "ok" && saved.profile.studentName, "Sam");

  const readBack = await store.getStudentAccommodationsProfileForTeacher("teacher-a", "student-1");
  assert.equal(readBack.status, "ok");
  assert.equal(readBack.status === "ok" && readBack.profile.extendedTime, "double");
  assert.equal(readBack.status === "ok" && readBack.profile.maxAnswerChoices, 3);

  // The student's own experience resolves the same effective accommodations.
  const effective = await store.getStudentAccommodations("student-1");
  assert.equal(effective.readAloud, true);
  assert.equal(effective.calculatorPolicy, "allowed");
});

test("a co-teacher (via school membership) can manage the profile; an outsider cannot", async () => {
  const database = buildDatabase();
  const store = createStore(database);

  const cohortSave = await store.setStudentAccommodationsForTeacher({
    teacherId: "teacher-b",
    studentId: "student-2",
    accommodations: { ...defaultStudentAccommodations, readAloud: true }
  });
  assert.equal(cohortSave.status, "ok");

  const outsiderView = await store.getStudentAccommodationsProfileForTeacher("teacher-x", "student-2");
  assert.equal(outsiderView.status, "forbidden");

  const outsiderSave = await store.setStudentAccommodationsForTeacher({
    teacherId: "teacher-x",
    studentId: "student-2",
    accommodations: { ...defaultStudentAccommodations, calculatorPolicy: "not-allowed" }
  });
  assert.equal(outsiderSave.status, "forbidden");
});

test("admins can see any student; non-educators are forbidden", async () => {
  const database = buildDatabase();
  const store = createStore(database);

  const adminView = await store.getStudentAccommodationsProfileForTeacher("admin-1", "student-1");
  assert.equal(adminView.status, "ok");

  const parentView = await store.getStudentAccommodationsProfileForTeacher("parent-1", "student-1");
  assert.equal(parentView.status, "forbidden");
});

test("unknown or non-student targets report student-not-found", async () => {
  const database = buildDatabase();
  const store = createStore(database);

  const missing = await store.getStudentAccommodationsProfileForTeacher("teacher-a", "nobody");
  assert.equal(missing.status, "student-not-found");

  const notAStudent = await store.setStudentAccommodationsForTeacher({
    teacherId: "admin-1",
    studentId: "teacher-b",
    accommodations: { ...defaultStudentAccommodations, readAloud: true }
  });
  assert.equal(notAStudent.status, "student-not-found");
});

test("clearing every accommodation removes the record so there is no plan on record", async () => {
  const database = buildDatabase();
  const store = createStore(database);

  await store.setStudentAccommodationsForTeacher({
    teacherId: "teacher-a",
    studentId: "student-1",
    accommodations: { ...defaultStudentAccommodations, extendedTime: "extra-half" }
  });
  assert.equal(database.student_accommodations.length, 1);

  const cleared = await store.setStudentAccommodationsForTeacher({
    teacherId: "teacher-a",
    studentId: "student-1",
    accommodations: { ...defaultStudentAccommodations }
  });
  assert.equal(cleared.status, "ok");
  assert.equal(cleared.status === "ok" && cleared.profile.hasPlan, false);
  assert.equal(database.student_accommodations.length, 0);
});

test("normalizeStudentAccommodationsRecords dedupes per student and drops malformed rows", () => {
  const records = normalizeStudentAccommodationsRecords([
    { student_id: "student-1", extended_time: "double", read_aloud: true, max_answer_choices: 3, calculator_policy: "allowed", notes: "" },
    { student_id: "student-1", extended_time: "none", read_aloud: false, max_answer_choices: 0, calculator_policy: "default", notes: "later wins" },
    { student_id: "", extended_time: "none" },
    null
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].notes, "later wins");
  assert.equal(records[0].extended_time, "none");
});
