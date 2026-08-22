import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsRosterImportPersistenceStore,
  type TeacherOpsRosterImportPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsRosterImportPersistence";
import type { ClassRosterProfile, GradeId } from "@/types";

const fixedNow = "2026-06-21T11:00:00.000Z";

function createDatabase(): TeacherOpsRosterImportPersistenceDatabase {
  return {
    assessment_submissions: [],
    assessments: [
      { id: "assessment-1", class_id: "class-owned" }
    ],
    assignments: [
      { id: "assignment-1", class_id: "class-owned" }
    ],
    class_enrollments: [
      {
        id: "enrollment-existing",
        class_id: "class-owned",
        student_id: "student-existing",
        joined_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    class_roster_profiles: [],
    guardian_links: [
      {
        id: "guardian-link-revoked-history",
        parent_id: "parent-existing",
        student_id: "student-existing",
        relationship: "guardian",
        status: "revoked",
        invite_code: "LEGACY-ROSTER-PLAINTEXT",
        created_by: "teacher-1",
        created_at: "2026-06-19T00:00:00.000Z",
        updated_at: "2026-06-20T00:00:00.000Z"
      }
    ],
    school_memberships: [],
    schools: [
      { id: "school-1", code: "SCH1" }
    ],
    student_profiles: [
      {
        user_id: "teacher-1",
        name: "Tess Teacher",
        grade: "S3"
      },
      {
        user_id: "student-existing",
        name: "Old Name",
        grade: "S2",
        parent_invite_code: "MAIS-EXISTING"
      }
    ],
    submissions: [],
    teacher_class_collaborators: [
      {
        id: "collab-viewer",
        class_id: "class-owned",
        teacher_id: "teacher-viewer",
        role: "viewer",
        status: "active"
      },
      {
        id: "collab-co",
        class_id: "class-owned",
        teacher_id: "teacher-co",
        role: "co-teacher",
        status: "active"
      }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        name: "S3A",
        grade: "S3",
        school_id: "school-1",
        class_code: "S3A"
      },
      {
        id: "class-other",
        teacher_id: "teacher-other",
        name: "S4B",
        grade: "S4"
      }
    ],
    user_settings: [],
    users: [
      {
        id: "teacher-1",
        username: "tess",
        normalized_username: "tess",
        role: "teacher",
        school_id: "school-1"
      },
      {
        id: "teacher-co",
        username: "cole",
        normalized_username: "cole",
        role: "teacher",
        school_id: "school-1"
      },
      {
        id: "teacher-viewer",
        username: "vera",
        normalized_username: "vera",
        role: "teacher",
        school_id: "school-1"
      },
      {
        id: "student-existing",
        username: "ada",
        normalized_username: "ada",
        email: "ada@example.com",
        normalized_email: "ada@example.com",
        role: "student",
        school_id: "school-1"
      },
      {
        id: "student-other-school",
        username: "other",
        normalized_username: "other",
        email: "other@example.com",
        normalized_email: "other@example.com",
        role: "student",
        school_id: "school-2"
      },
      {
        id: "parent-existing",
        username: "existing-parent",
        normalized_username: "existing-parent",
        email: "parent-existing@example.com",
        normalized_email: "parent-existing@example.com",
        role: "parent",
        school_id: "school-1"
      },
      {
        id: "admin-1",
        username: "admin",
        normalized_username: "admin",
        role: "admin"
      },
      {
        id: "student-user",
        username: "student",
        normalized_username: "student",
        role: "student"
      }
    ]
  };
}

function rosterProfilesForClass(database: TeacherOpsRosterImportPersistenceDatabase, classId: string): ClassRosterProfile[] {
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment, index) => {
      const profile = database.student_profiles.find((candidate) => candidate.user_id === enrollment.student_id);
      const roster = database.class_roster_profiles.find((candidate) => candidate.enrollment_id === enrollment.id);
      const guardianStatus: ClassRosterProfile["guardianStatus"] = database.guardian_links.some((link) => link.student_id === enrollment.student_id && link.status === "active") ? "linked" : "unlinked";
      return {
        enrollmentId: enrollment.id,
        classId,
        studentId: enrollment.student_id,
        studentName: profile?.name ?? enrollment.student_id,
        grade: profile?.grade ?? "S3",
        studentNo: roster?.student_no,
        seatLabel: roster?.seat_label,
        seatRow: roster?.seat_row ?? null,
        seatColumn: roster?.seat_column ?? null,
        displayOrder: roster?.display_order ?? index + 1,
        guardianCount: database.guardian_links.filter((link) => link.student_id === enrollment.student_id && link.status === "active").length,
        guardianStatus,
        updatedAt: roster?.updated_at ?? enrollment.joined_at
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder || a.studentName.localeCompare(b.studentName));
}

function createTestStore(database: TeacherOpsRosterImportPersistenceDatabase) {
  let idCounter = 0;
  let passwordCounter = 0;
  const seededWork: Array<{ classId: string; studentId: string }> = [];

  const store = createTeacherOpsRosterImportPersistenceStore({
    addSchoolMembership: (sourceDatabase, membership) => {
      if (sourceDatabase.school_memberships.some((candidate) =>
        candidate.school_id === membership.school_id &&
        candidate.user_id === membership.user_id &&
        candidate.class_id === membership.class_id &&
        candidate.role === membership.role
      )) {
        return;
      }
      sourceDatabase.school_memberships.push({
        id: `school-membership-${++idCounter}`,
        ...membership
      });
    },
    classCurriculumTrack: () => "HK",
    createId: (prefix) => `${prefix}-${++idCounter}`,
    createTemporaryPassword: () => `Temp-${++passwordCounter}`,
    defaultSettings: (userId, grade) => ({
      user_id: userId,
      language: "en",
      theme: "dark",
      selected_grade: grade,
      updated_at: fixedNow
    }),
    ensureClassStudentWorkRecords: (_database, classId, studentId) => {
      seededWork.push({ classId, studentId });
    },
    hashPassword: (password) => ({
      hash: `hash-${password}`,
      salt: `salt-${password}`
    }),
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date(fixedNow),
    readDatabase: async () => database,
    rosterProfilesForClass
  });

  return { seededWork, store };
}

const validCsv = [
  "studentNo,name,grade,email,username,seatRow,seatColumn,parentName,parentEmail",
  "001,Ada Wong,S3,ada@example.com,ada,1,2,Ada Parent,parent-existing@example.com",
  "002,Ben Chan,S3,ben@example.com,ben,2,3,Ben Parent,ben-parent@example.com"
].join("\n");

test("teacher ops roster import persistence validates CSV without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsRosterImportPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const { store } = createTestStore(createDatabase());
  const result = await store.validateTeacherRosterImport({
    teacherId: "teacher-1",
    classId: "class-owned",
    csvText: validCsv
  });

  assert.equal(result.status, "validated");
  assert.equal(result.status === "validated" ? result.validation.valid : false, true);
  assert.deepEqual(result.status === "validated" ? result.validation.totals : null, {
    rows: 2,
    valid: 2,
    errors: 0,
    creates: 1,
    updates: 1
  });
  assert.deepEqual(result.status === "validated" ? result.validation.rows.map((row) => ({
    rowIndex: row.rowIndex,
    studentNo: row.studentNo,
    name: row.name,
    seatRow: row.seatRow,
    seatColumn: row.seatColumn
  })) : null, [
    { rowIndex: 2, studentNo: "001", name: "Ada Wong", seatRow: 1, seatColumn: 2 },
    { rowIndex: 3, studentNo: "002", name: "Ben Chan", seatRow: 2, seatColumn: 3 }
  ]);
});

test("teacher ops roster import persistence rejects invalid and unauthorized validation", async () => {
  const { store } = createTestStore(createDatabase());
  const invalid = [
    "studentNo,name,grade,email,seatRow,parentEmail",
    ",,BAD,not-email,0,parent"
  ].join("\n");

  assert.deepEqual(await store.validateTeacherRosterImport({
    teacherId: "student-user",
    classId: "class-owned",
    csvText: validCsv
  }), { status: "forbidden" });
  assert.deepEqual(await store.validateTeacherRosterImport({
    teacherId: "teacher-viewer",
    classId: "class-owned",
    csvText: validCsv
  }), { status: "not-found" });

  const result = await store.validateTeacherRosterImport({
    teacherId: "teacher-1",
    classId: "class-owned",
    csvText: invalid
  });
  assert.equal(result.status, "validated");
  assert.equal(result.status === "validated" ? result.validation.valid : true, false);
  assert.equal(result.status === "validated" ? result.validation.totals.errors : 0, 5);
  assert.deepEqual(result.status === "validated" ? result.validation.rows[0].warnings : [], [
    "Missing studentNo; display order will still be imported."
  ]);
});

test("teacher ops roster import persistence owns roster row number parsing helper", async () => {
  const persistenceExports = await import("@/lib/server/userStore/teacherOpsRosterImportPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof persistenceExports.teacherOpsRosterRowNumber, "function");
  const rosterRowNumber = persistenceExports.teacherOpsRosterRowNumber as (value: string) => number | null;

  assert.equal(rosterRowNumber(""), null);
  assert.equal(rosterRowNumber("   "), null);
  assert.equal(rosterRowNumber("7"), 7);
  assert.equal(rosterRowNumber("07"), 7);
  assert.equal(Number.isNaN(rosterRowNumber("0")), true);
  assert.equal(Number.isNaN(rosterRowNumber("-1")), true);
  assert.equal(Number.isNaN(rosterRowNumber("2.5")), true);
  assert.equal(Number.isNaN(rosterRowNumber("row-2")), true);
  assert.doesNotMatch(rootSource, /function rosterRowNumber\b/);
});

test("teacher ops roster import persistence commits students parents memberships and roster rows", async () => {
  const database = createDatabase();
  const { seededWork, store } = createTestStore(database);

  const result = await store.commitTeacherRosterImport({
    teacherId: "teacher-co",
    classId: "class-owned",
    csvText: validCsv
  });

  assert.equal(result.status, "committed");
  assert.equal(result.status === "committed" ? result.credentials.length : 0, 2);
  assert.deepEqual(result.status === "committed" ? result.credentials.map((credential) => ({
    role: credential.role,
    name: credential.name,
    username: credential.username,
    password: credential.temporaryPassword,
    schoolCode: credential.schoolCode,
    classCode: credential.classCode
  })) : [], [
    { role: "student", name: "Ben Chan", username: "ben", password: "Temp-1", schoolCode: "SCH1", classCode: "S3A" },
    { role: "parent", name: "Ben Parent", username: "ben-parent@example.com", password: "Temp-2", schoolCode: "SCH1", classCode: "S3A" }
  ]);

  const existingProfile = database.student_profiles.find((profile) => profile.user_id === "student-existing");
  assert.equal(existingProfile?.name, "Ada Wong");
  assert.equal(existingProfile?.grade, "S3");

  const newStudent = database.users.find((user) => user.normalized_email === "ben@example.com");
  assert.equal(newStudent?.role, "student");
  assert.equal(newStudent?.password_hash, "hash-Temp-1");
  assert.equal(newStudent?.password_must_change, true);
  assert.equal(newStudent?.session_revision, 1);
  assert.equal(newStudent?.disabled_at, null);
  assert.equal(database.student_profiles.find((profile) => profile.user_id === newStudent?.id)?.parent_invite_code ?? "", "");

  const newParent = database.users.find((user) => user.normalized_email === "ben-parent@example.com");
  assert.equal(newParent?.role, "parent");
  assert.equal(newParent?.session_revision, 1);
  assert.equal(newParent?.disabled_at, null);
  assert.equal(database.guardian_links.some((link) => link.parent_id === newParent?.id && link.student_id === newStudent?.id && link.status === "active"), true);
  assert.equal(database.guardian_links.find((link) => link.id === "guardian-link-revoked-history")?.status, "revoked");
  assert.equal(database.guardian_links.some((link) => (
    link.id !== "guardian-link-revoked-history" &&
    link.parent_id === "parent-existing" &&
    link.student_id === "student-existing" &&
    link.status === "active"
  )), true);
  assert.doesNotMatch(JSON.stringify(database), /LEGACY-ROSTER-PLAINTEXT|MAIS-EXISTING/);
  assert.doesNotMatch(JSON.stringify(database), /MAIS-[A-F0-9]{24}/i);

  assert.deepEqual(database.class_roster_profiles.map((profile) => ({
    studentNo: profile.student_no,
    seatRow: profile.seat_row,
    seatColumn: profile.seat_column,
    displayOrder: profile.display_order
  })), [
    { studentNo: "001", seatRow: 1, seatColumn: 2, displayOrder: 1 },
    { studentNo: "002", seatRow: 2, seatColumn: 3, displayOrder: 2 }
  ]);
  assert.deepEqual(seededWork, [
    { classId: "class-owned", studentId: "student-existing" },
    { classId: "class-owned", studentId: newStudent?.id }
  ]);
  assert.equal(result.status === "committed" ? result.validation.totals.updates : 0, 2);
  assert.equal(result.status === "committed" ? result.roster.length : 0, 2);
});

test("teacher ops roster import persistence rejects invalid commits without mutating", async () => {
  const database = createDatabase();
  const { store } = createTestStore(database);
  const beforeUserCount = database.users.length;

  const result = await store.commitTeacherRosterImport({
    teacherId: "teacher-1",
    classId: "class-owned",
    csvText: "name,email\nMissing Grade,other@example.com"
  });

  assert.equal(result.status, "invalid");
  assert.equal(database.users.length, beforeUserCount);
  assert.deepEqual(await store.commitTeacherRosterImport({
    teacherId: "student-user",
    classId: "class-owned",
    csvText: validCsv
  }), { status: "forbidden" });
});

test("legacy userStore delegates roster import to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const validateTeacherRosterImport = teacherOpsUserStore\.validateTeacherRosterImport/);
  assert.match(source, /export const commitTeacherRosterImport = teacherOpsUserStore\.commitTeacherRosterImport/);
  assert.doesNotMatch(source, /export async function validateTeacherRosterImport/);
  assert.doesNotMatch(source, /export async function commitTeacherRosterImport/);
});
