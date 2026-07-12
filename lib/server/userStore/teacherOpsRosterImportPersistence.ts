import { validGradeSet } from "@/data/grades";
import type {
  ClassRosterProfile,
  CurriculumTrack,
  GradeId,
  Language,
  ProvisioningCredential,
  SchoolMembershipRole,
  TeacherRosterImportRow,
  TeacherRosterImportValidation,
  ThemeMode
} from "@/types";

type TeacherOpsRosterImportUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsRosterImportUserRecord = {
  id: string;
  username: string;
  normalized_username: string;
  email?: string;
  normalized_email?: string;
  password_hash?: string;
  password_salt?: string;
  school_id?: string;
  password_must_change?: boolean;
  role: TeacherOpsRosterImportUserRole;
  created_at?: string;
};

type TeacherOpsRosterImportStudentProfileRecord = {
  user_id: string;
  name: string;
  grade: GradeId;
  curriculum_track?: CurriculumTrack;
  parent_invite_code?: string;
};

type TeacherOpsRosterImportUserSettingsRecord = {
  user_id: string;
  language: Language;
  theme: ThemeMode;
  selected_grade: GradeId;
  updated_at: string;
};

type TeacherOpsRosterImportClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade: GradeId;
  school_id?: string;
  class_code?: string;
};

type TeacherOpsRosterImportEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

type TeacherOpsRosterImportRosterProfileRecord = {
  enrollment_id: string;
  student_no?: string;
  seat_label?: string;
  seat_row?: number | null;
  seat_column?: number | null;
  display_order: number;
  updated_at: string;
};

type TeacherOpsRosterImportGuardianLinkRecord = {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  status: "active" | "revoked";
  invite_code?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

type TeacherOpsRosterImportSchoolMembershipRecord = {
  id: string;
  school_id: string;
  user_id: string;
  role: SchoolMembershipRole;
  class_id?: string;
  created_at: string;
};

type TeacherOpsRosterImportCollaboratorRecord = {
  id?: string;
  class_id: string;
  teacher_id: string;
  role: "co-teacher" | "viewer";
  status: "active" | "revoked" | "invited" | "inactive";
};

type TeacherOpsRosterImportSchoolRecord = {
  id: string;
  code: string;
};

type TeacherOpsRosterImportAssignmentRecord = {
  id: string;
  class_id: string;
};

type TeacherOpsRosterImportSubmissionRecord = {
  id?: string;
  assignment_id: string;
  student_id: string;
};

type TeacherOpsRosterImportAssessmentRecord = {
  id: string;
  class_id: string;
};

type TeacherOpsRosterImportAssessmentSubmissionRecord = {
  id?: string;
  assessment_id: string;
  student_id: string;
};

export type TeacherOpsRosterImportPersistenceDatabase = {
  assessment_submissions: TeacherOpsRosterImportAssessmentSubmissionRecord[];
  assessments: TeacherOpsRosterImportAssessmentRecord[];
  assignments: TeacherOpsRosterImportAssignmentRecord[];
  class_enrollments: TeacherOpsRosterImportEnrollmentRecord[];
  class_roster_profiles: TeacherOpsRosterImportRosterProfileRecord[];
  guardian_links: TeacherOpsRosterImportGuardianLinkRecord[];
  school_memberships: TeacherOpsRosterImportSchoolMembershipRecord[];
  schools: TeacherOpsRosterImportSchoolRecord[];
  student_profiles: TeacherOpsRosterImportStudentProfileRecord[];
  submissions: TeacherOpsRosterImportSubmissionRecord[];
  teacher_class_collaborators: TeacherOpsRosterImportCollaboratorRecord[];
  teacher_classes: TeacherOpsRosterImportClassRecord[];
  user_settings: TeacherOpsRosterImportUserSettingsRecord[];
  users: TeacherOpsRosterImportUserRecord[];
};

export type TeacherOpsRosterImportPersistenceStoreDependencies = {
  addSchoolMembership: (
    database: TeacherOpsRosterImportPersistenceDatabase,
    membership: Omit<TeacherOpsRosterImportSchoolMembershipRecord, "id">
  ) => void;
  classCurriculumTrack: (
    database: TeacherOpsRosterImportPersistenceDatabase,
    teacherClass: TeacherOpsRosterImportClassRecord
  ) => CurriculumTrack | undefined;
  createId: (prefix: string) => string;
  createParentInviteCode: (database: TeacherOpsRosterImportPersistenceDatabase) => string;
  createTemporaryPassword: () => string;
  defaultSettings: (userId: string, grade: GradeId) => TeacherOpsRosterImportUserSettingsRecord;
  ensureClassStudentWorkRecords: (
    database: TeacherOpsRosterImportPersistenceDatabase,
    classId: string,
    studentId: string,
    now: string
  ) => void;
  hashPassword: (password: string) => {
    hash: string;
    salt: string;
  };
  mutateDatabase: <T>(mutator: (database: TeacherOpsRosterImportPersistenceDatabase) => T | Promise<T>) => Promise<T>;
  now: () => Date;
  readDatabase: () => Promise<TeacherOpsRosterImportPersistenceDatabase>;
  rosterProfilesForClass: (
    database: TeacherOpsRosterImportPersistenceDatabase,
    classId: string
  ) => ClassRosterProfile[];
};

export type TeacherOpsRosterImportPersistenceStore = ReturnType<typeof createTeacherOpsRosterImportPersistenceStore>;

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function cleanStudentProfileName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function csvCellsFromText(text?: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (const character of text ?? "") {
    if (character === "\"") {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n" && !quoted) {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }

  row.push(cell.trim());
  rows.push(row);
  return rows.filter((candidate) => candidate.some((value) => value.trim()));
}

function csvRecordsFromText(text?: string) {
  if (!text?.trim()) return [] as Record<string, string>[];
  const [headers, ...rows] = csvCellsFromText(text);
  if (!headers?.length) return [];

  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase().replace(/[\s_-]+/g, ""));
  return rows.map((row) => {
    const record: Record<string, string> = {};
    normalizedHeaders.forEach((header, index) => {
      record[header] = row[index]?.trim() ?? "";
    });
    return record;
  });
}

function pickCsvField(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, "");
    if (row[normalizedKey]) return row[normalizedKey];
  }
  return "";
}

export function teacherOpsRosterRowNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function canUseTeacherArea(user?: TeacherOpsRosterImportUserRecord | null): user is TeacherOpsRosterImportUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherCanAccessClass(
  database: TeacherOpsRosterImportPersistenceDatabase,
  user: TeacherOpsRosterImportUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (
    user.role !== "admin" &&
    teacherClass.teacher_id !== user.id &&
    !database.school_memberships.some(
      (membership) =>
        membership.user_id === user.id &&
        membership.class_id === classId &&
        (membership.role === "teacher" || membership.role === "admin")
    )
  ) {
    return null;
  }
  return teacherClass;
}

function teacherCanMutateOperationsClass(
  database: TeacherOpsRosterImportPersistenceDatabase,
  user: TeacherOpsRosterImportUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (teacherCanAccessClass(database, user, classId)) return teacherClass;
  const collaborator = database.teacher_class_collaborators.find(
    (candidate) =>
      candidate.class_id === classId &&
      candidate.teacher_id === user.id &&
      candidate.status === "active" &&
      candidate.role === "co-teacher"
  );
  return collaborator ? teacherClass : null;
}

function studentProfileFor(database: TeacherOpsRosterImportPersistenceDatabase, userId: string) {
  return database.student_profiles.find((profile) => profile.user_id === userId);
}

function teacherRosterRowsFromCsv(
  database: TeacherOpsRosterImportPersistenceDatabase,
  teacherClass: TeacherOpsRosterImportClassRecord,
  csvText: string
): TeacherRosterImportValidation {
  const csvRows = csvRecordsFromText(csvText);
  const rows: TeacherRosterImportRow[] = csvRows.map((row, index) => {
    const studentNo = pickCsvField(row, ["studentNo", "student_no", "student number"]);
    const name = cleanStudentProfileName(pickCsvField(row, ["name", "studentName", "student_name"]));
    const gradeValue = (pickCsvField(row, ["grade"]) || teacherClass.grade) as GradeId | "";
    const email = pickCsvField(row, ["email", "studentEmail", "student_email"]);
    const username = pickCsvField(row, ["username", "studentUsername", "student_username"]);
    const seatLabel = pickCsvField(row, ["seatLabel", "seat_label", "seat"]);
    const seatRow = teacherOpsRosterRowNumber(pickCsvField(row, ["seatRow", "seat_row", "row"]));
    const seatColumn = teacherOpsRosterRowNumber(pickCsvField(row, ["seatColumn", "seat_column", "column", "col"]));
    const parentName = cleanStudentProfileName(pickCsvField(row, ["parentName", "parent_name", "guardianName", "guardian_name"]));
    const parentEmail = pickCsvField(row, ["parentEmail", "parent_email", "guardianEmail", "guardian_email"]);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!studentNo) warnings.push("Missing studentNo; display order will still be imported.");
    if (!name) errors.push("Missing student name.");
    if (!gradeValue || !validGradeSet.has(gradeValue as GradeId)) errors.push("Invalid grade.");
    if (email && !isLikelyEmail(email)) errors.push("Invalid student email.");
    if (parentEmail && !isLikelyEmail(parentEmail)) errors.push("Invalid parent email.");
    if (Number.isNaN(seatRow)) errors.push("seatRow must be a positive integer.");
    if (Number.isNaN(seatColumn)) errors.push("seatColumn must be a positive integer.");

    const normalizedEmail = email ? normalizeEmail(email) : "";
    const normalizedUsername = username ? normalizeUsername(username) : "";
    const existingStudent = database.users.find(
      (candidate) =>
        candidate.role === "student" &&
        ((normalizedEmail && candidate.normalized_email === normalizedEmail) ||
          (normalizedUsername && candidate.normalized_username === normalizedUsername))
    );
    if (existingStudent && teacherClass.school_id && existingStudent.school_id && existingStudent.school_id !== teacherClass.school_id) {
      errors.push("Existing student belongs to another school.");
    }

    return {
      rowIndex: index + 2,
      studentNo,
      name,
      grade: validGradeSet.has(gradeValue as GradeId) ? (gradeValue as GradeId) : "",
      email: email || undefined,
      username: username || undefined,
      seatLabel: seatLabel || undefined,
      seatRow: Number.isNaN(seatRow) ? null : seatRow,
      seatColumn: Number.isNaN(seatColumn) ? null : seatColumn,
      parentName: parentName || undefined,
      parentEmail: parentEmail || undefined,
      errors,
      warnings
    };
  });

  const validRows = rows.filter((row) => !row.errors.length);
  const creates = validRows.filter((row) => {
    const normalizedEmail = row.email ? normalizeEmail(row.email) : "";
    const normalizedUsername = row.username ? normalizeUsername(row.username) : "";
    return !database.users.some(
      (candidate) =>
        candidate.role === "student" &&
        ((normalizedEmail && candidate.normalized_email === normalizedEmail) ||
          (normalizedUsername && candidate.normalized_username === normalizedUsername))
    );
  }).length;

  return {
    valid: rows.length > 0 && rows.every((row) => row.errors.length === 0),
    rows,
    totals: {
      rows: rows.length,
      valid: validRows.length,
      errors: rows.reduce((sum, row) => sum + row.errors.length, 0),
      creates,
      updates: Math.max(0, validRows.length - creates)
    }
  };
}

function uniqueRosterUsername(database: TeacherOpsRosterImportPersistenceDatabase, preferred: string, fallbackName: string, rowIndex: number) {
  const base = normalizeUsername(preferred || fallbackName || `student-${rowIndex}`).replace(/\s+/g, "-");
  let candidate = base || `student-${rowIndex}`;
  let suffix = 2;
  while (database.users.some((user) => user.normalized_username === candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function findRosterStudent(database: TeacherOpsRosterImportPersistenceDatabase, row: TeacherRosterImportRow) {
  const normalizedEmail = row.email ? normalizeEmail(row.email) : "";
  const normalizedUsername = row.username ? normalizeUsername(row.username) : "";
  return database.users.find(
    (candidate) =>
      candidate.role === "student" &&
      ((normalizedEmail && candidate.normalized_email === normalizedEmail) ||
        (normalizedUsername && candidate.normalized_username === normalizedUsername))
  );
}

function ensureParentInviteCodeInDatabase(
  database: TeacherOpsRosterImportPersistenceDatabase,
  studentId: string,
  createParentInviteCode: (database: TeacherOpsRosterImportPersistenceDatabase) => string
) {
  const profile = database.student_profiles.find((candidate) => candidate.user_id === studentId);
  if (!profile) return null;
  const existingCode = profile.parent_invite_code?.trim().toUpperCase() ?? "";
  if (existingCode) {
    profile.parent_invite_code = existingCode;
    return existingCode;
  }

  const inviteCode = createParentInviteCode(database);
  profile.parent_invite_code = inviteCode;
  return inviteCode;
}

export function createTeacherOpsRosterImportPersistenceStore({
  addSchoolMembership,
  classCurriculumTrack,
  createId,
  createParentInviteCode,
  createTemporaryPassword,
  defaultSettings,
  ensureClassStudentWorkRecords,
  hashPassword,
  mutateDatabase,
  now,
  readDatabase,
  rosterProfilesForClass
}: TeacherOpsRosterImportPersistenceStoreDependencies) {
  async function validateTeacherRosterImport({
    teacherId,
    classId,
    csvText
  }: {
    teacherId: string;
    classId: string;
    csvText: string;
  }) {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
    const teacherClass = teacherCanMutateOperationsClass(database, user, classId);
    if (!teacherClass) return { status: "not-found" as const };
    return { status: "validated" as const, validation: teacherRosterRowsFromCsv(database, teacherClass, csvText) };
  }

  async function commitTeacherRosterImport({
    teacherId,
    classId,
    csvText
  }: {
    teacherId: string;
    classId: string;
    csvText: string;
  }) {
    return mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
      const teacherClass = teacherCanMutateOperationsClass(database, user, classId);
      if (!teacherClass) return { status: "not-found" as const };
      const validation = teacherRosterRowsFromCsv(database, teacherClass, csvText);
      if (!validation.valid) return { status: "invalid" as const, validation, credentials: [] as ProvisioningCredential[] };

      const timestamp = now().toISOString();
      const school = teacherClass.school_id ? database.schools.find((candidate) => candidate.id === teacherClass.school_id) : null;
      const credentials: ProvisioningCredential[] = [];

      validation.rows.forEach((row, index) => {
        let student = findRosterStudent(database, row);
        if (!student) {
          const username = uniqueRosterUsername(database, row.username ?? row.email ?? row.name, row.name, row.rowIndex);
          const password = createTemporaryPassword();
          const passwordHash = hashPassword(password);
          student = {
            id: createId("student"),
            username,
            normalized_username: normalizeUsername(username),
            email: row.email,
            normalized_email: row.email ? normalizeEmail(row.email) : undefined,
            password_hash: passwordHash.hash,
            password_salt: passwordHash.salt,
            school_id: teacherClass.school_id ?? user.school_id,
            password_must_change: true,
            role: "student",
            created_at: timestamp
          };
          database.users.push(student);
          database.student_profiles.push({
            user_id: student.id,
            name: row.name,
            grade: row.grade || teacherClass.grade,
            curriculum_track: classCurriculumTrack(database, teacherClass),
            parent_invite_code: createParentInviteCode(database)
          });
          database.user_settings.push(defaultSettings(student.id, row.grade || teacherClass.grade));
          credentials.push({
            role: "student",
            name: row.name,
            username,
            temporaryPassword: password,
            schoolCode: school?.code ?? "LOCAL",
            classCode: teacherClass.class_code,
            passwordChangeRequired: true
          });
        } else {
          student.school_id = student.school_id ?? teacherClass.school_id ?? user.school_id;
          const profile = studentProfileFor(database, student.id);
          if (profile) {
            profile.name = row.name;
            profile.grade = row.grade || teacherClass.grade;
          }
        }

        if (teacherClass.school_id) {
          addSchoolMembership(database, {
            school_id: teacherClass.school_id,
            user_id: student.id,
            role: "student",
            class_id: teacherClass.id,
            created_at: timestamp
          });
        }

        let enrollment = database.class_enrollments.find(
          (candidate) => candidate.class_id === teacherClass.id && candidate.student_id === student?.id
        );
        if (!enrollment) {
          enrollment = {
            id: createId("enrollment"),
            class_id: teacherClass.id,
            student_id: student.id,
            joined_at: timestamp
          };
          database.class_enrollments.push(enrollment);
        }
        ensureClassStudentWorkRecords(database, teacherClass.id, student.id, timestamp);

        const roster = database.class_roster_profiles.find((candidate) => candidate.enrollment_id === enrollment?.id);
        const rosterRecord: TeacherOpsRosterImportRosterProfileRecord = roster ?? {
          enrollment_id: enrollment.id,
          display_order: index + 1,
          updated_at: timestamp
        };
        rosterRecord.student_no = row.studentNo || rosterRecord.student_no;
        rosterRecord.seat_label = row.seatLabel || undefined;
        rosterRecord.seat_row = row.seatRow;
        rosterRecord.seat_column = row.seatColumn;
        rosterRecord.display_order = index + 1;
        rosterRecord.updated_at = timestamp;
        if (!roster) database.class_roster_profiles.push(rosterRecord);

        if (row.parentEmail) {
          const normalizedParentEmail = normalizeEmail(row.parentEmail);
          let parent = database.users.find((candidate) => candidate.role === "parent" && candidate.normalized_email === normalizedParentEmail);
          if (!parent) {
            const parentUsername = uniqueRosterUsername(database, row.parentEmail, row.parentName ?? `${row.name} parent`, row.rowIndex);
            const password = createTemporaryPassword();
            const passwordHash = hashPassword(password);
            parent = {
              id: createId("parent"),
              username: parentUsername,
              normalized_username: normalizeUsername(parentUsername),
              email: row.parentEmail,
              normalized_email: normalizedParentEmail,
              password_hash: passwordHash.hash,
              password_salt: passwordHash.salt,
              school_id: teacherClass.school_id ?? user.school_id,
              password_must_change: true,
              role: "parent",
              created_at: timestamp
            };
            database.users.push(parent);
            database.student_profiles.push({
              user_id: parent.id,
              name: row.parentName || `${row.name} parent`,
              grade: row.grade || teacherClass.grade
            });
            database.user_settings.push(defaultSettings(parent.id, row.grade || teacherClass.grade));
            credentials.push({
              role: "parent",
              name: row.parentName || `${row.name} parent`,
              username: parentUsername,
              temporaryPassword: password,
              schoolCode: school?.code ?? "LOCAL",
              classCode: teacherClass.class_code,
              passwordChangeRequired: true
            });
          }

          const existingLink = database.guardian_links.find((link) => link.parent_id === parent?.id && link.student_id === student?.id);
          if (parent && student && !existingLink) {
            database.guardian_links.push({
              id: createId("guardian-link"),
              parent_id: parent.id,
              student_id: student.id,
              relationship: "guardian",
              status: "active",
              invite_code: ensureParentInviteCodeInDatabase(database, student.id, createParentInviteCode) ?? createParentInviteCode(database),
              created_by: user.id,
              created_at: timestamp,
              updated_at: timestamp
            });
          } else if (existingLink) {
            existingLink.status = "active";
            existingLink.updated_at = timestamp;
          }
        }
      });

      return {
        status: "committed" as const,
        validation: teacherRosterRowsFromCsv(database, teacherClass, csvText),
        credentials,
        roster: rosterProfilesForClass(database, teacherClass.id)
      };
    });
  }

  return {
    commitTeacherRosterImport,
    validateTeacherRosterImport
  };
}
