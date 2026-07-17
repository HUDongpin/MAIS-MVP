import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsRosterProfilePersistenceStore,
  type TeacherOpsRosterProfilePersistenceDatabase
} from "@/lib/server/userStore/teacherOpsRosterProfilePersistence";

function createDatabase(): TeacherOpsRosterProfilePersistenceDatabase {
  return {
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-owned",
        student_id: "student-1",
        joined_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "enrollment-2",
        class_id: "class-owned",
        student_id: "student-2",
        joined_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    class_roster_profiles: [
      {
        enrollment_id: "enrollment-1",
        student_no: "001",
        seat_label: "A1",
        seat_row: 1,
        seat_column: 1,
        display_order: 1,
        updated_at: "2026-06-20T08:30:00.000Z"
      }
    ],
    guardian_links: [
      {
        id: "guardian-link-1",
        parent_id: "parent-1",
        student_id: "student-1",
        status: "active"
      },
      {
        id: "guardian-link-revoked",
        parent_id: "parent-2",
        student_id: "student-1",
        status: "revoked"
      }
    ],
    school_memberships: [
      {
        user_id: "teacher-member",
        class_id: "class-owned",
        role: "teacher"
      }
    ],
    student_profiles: [
      { user_id: "student-1", name: "Ada Wong", grade: "S3" },
      { user_id: "student-2", name: "Ben Chan", grade: "S4" }
    ],
    teacher_class_collaborators: [
      {
        class_id: "class-owned",
        teacher_id: "teacher-co",
        role: "co-teacher",
        status: "active"
      },
      {
        class_id: "class-owned",
        teacher_id: "teacher-viewer",
        role: "viewer",
        status: "active"
      }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        name: "S3A"
      },
      {
        id: "class-other",
        teacher_id: "teacher-other",
        name: "S3B"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher", username: "Tess" },
      { id: "teacher-member", role: "teacher", username: "Member" },
      { id: "teacher-co", role: "teacher", username: "Co" },
      { id: "teacher-viewer", role: "teacher", username: "Viewer" },
      { id: "teacher-other", role: "teacher", username: "Other" },
      { id: "admin-1", role: "admin", username: "Admin" },
      { id: "student-1", role: "student", username: "Ada" },
      { id: "student-2", role: "student", username: "Ben" },
      { id: "parent-1", role: "parent", username: "Parent One" },
      { id: "parent-2", role: "parent", username: "Parent Two" }
    ]
  };
}

function createTestStore(database: TeacherOpsRosterProfilePersistenceDatabase) {
  return createTeacherOpsRosterProfilePersistenceStore({
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    mutateDatabase: async (mutator) => mutator(database)
  });
}

test("teacher ops roster profile persistence updates existing profiles without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsRosterProfilePersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const result = await createTestStore(database).updateClassRosterProfile({
    teacherId: "teacher-1",
    classId: "class-owned",
    enrollmentId: "enrollment-1",
    studentNo: "  007  ",
    seatLabel: "  B2  ",
    seatRow: null,
    seatColumn: 3,
    displayOrder: 2.6
  });

  assert.equal(result.status, "updated");
  assert.deepEqual(result.roster, {
    enrollmentId: "enrollment-1",
    classId: "class-owned",
    studentId: "student-1",
    studentName: "Ada Wong",
    grade: "S3",
    studentNo: "007",
    seatLabel: "B2",
    seatRow: null,
    seatColumn: 3,
    displayOrder: 3,
    guardianCount: 1,
    guardianStatus: "linked",
    updatedAt: "2026-06-21T08:00:00.000Z"
  });
  assert.deepEqual(database.class_roster_profiles[0], {
    enrollment_id: "enrollment-1",
    student_no: "007",
    seat_label: "B2",
    seat_row: null,
    seat_column: 3,
    display_order: 3,
    updated_at: "2026-06-21T08:00:00.000Z"
  });
});

test("teacher ops roster profile persistence creates missing profiles with default ordering", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).updateClassRosterProfile({
    teacherId: "teacher-co",
    classId: "class-owned",
    enrollmentId: "enrollment-2",
    seatLabel: "  C4  "
  });

  assert.equal(result.status, "updated");
  assert.equal(result.roster.displayOrder, 3);
  assert.equal(result.roster.studentName, "Ben Chan");
  assert.equal(result.roster.guardianStatus, "unlinked");
  assert.deepEqual(database.class_roster_profiles.at(-1), {
    enrollment_id: "enrollment-2",
    display_order: 3,
    updated_at: "2026-06-21T08:00:00.000Z",
    seat_label: "C4"
  });
});

test("teacher ops roster profile persistence rejects forbidden and unavailable updates", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.updateClassRosterProfile({
    teacherId: "student-1",
    classId: "class-owned",
    enrollmentId: "enrollment-1"
  }), { status: "forbidden" });
  assert.deepEqual(await store.updateClassRosterProfile({
    teacherId: "teacher-viewer",
    classId: "class-owned",
    enrollmentId: "enrollment-1"
  }), { status: "not-found" });
  assert.deepEqual(await store.updateClassRosterProfile({
    teacherId: "teacher-1",
    classId: "class-other",
    enrollmentId: "enrollment-1"
  }), { status: "not-found" });
  assert.deepEqual(await store.updateClassRosterProfile({
    teacherId: "teacher-1",
    classId: "class-owned",
    enrollmentId: "missing-enrollment"
  }), { status: "not-found" });
});

test("teacher ops roster profile persistence owns class roster projection helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsRosterProfilePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsRosterProfilePersistence") as Record<string, unknown>;
  const rosterProfilesForClass = helpers.teacherOpsRosterProfilesForClass as ((
    database: TeacherOpsRosterProfilePersistenceDatabase,
    classId: string
  ) => Array<Record<string, unknown>>) | undefined;

  assert.equal(typeof rosterProfilesForClass, "function");
  assert.match(persistenceSource, /export function teacherOpsRosterProfilesForClass\b/);
  assert.match(rootSource, /teacherOpsRosterProfilesForClass as rosterProfilesForClassFromTeacherOpsRosterProfile/);
  assert.doesNotMatch(rootSource, /function rosterProfilesForClass\(/);

  assert.deepEqual(rosterProfilesForClass?.(createDatabase(), "class-owned"), [
    {
      enrollmentId: "enrollment-1",
      classId: "class-owned",
      studentId: "student-1",
      studentName: "Ada Wong",
      grade: "S3",
      studentNo: "001",
      seatLabel: "A1",
      seatRow: 1,
      seatColumn: 1,
      displayOrder: 1,
      guardianCount: 1,
      guardianStatus: "linked",
      updatedAt: "2026-06-20T08:30:00.000Z"
    },
    {
      enrollmentId: "enrollment-2",
      classId: "class-owned",
      studentId: "student-2",
      studentName: "Ben Chan",
      grade: "S4",
      studentNo: undefined,
      seatLabel: undefined,
      seatRow: null,
      seatColumn: null,
      displayOrder: 2,
      guardianCount: 0,
      guardianStatus: "unlinked",
      updatedAt: "2026-06-20T09:00:00.000Z"
    }
  ]);
});

test("legacy userStore delegates roster profile updates to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const updateClassRosterProfile = teacherOpsUserStore\.updateClassRosterProfile/);
  assert.doesNotMatch(source, /export async function updateClassRosterProfile/);
});
