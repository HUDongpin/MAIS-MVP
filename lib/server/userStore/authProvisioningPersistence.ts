import { randomBytes, randomUUID } from "crypto";
import { validGradeSet } from "@/data/grades";
import type {
  CurriculumTrack,
  GradeId,
  Language,
  ProvisioningBatch,
  ProvisioningBatchStatus,
  ProvisioningCredential,
  ProvisioningImportClass,
  ProvisioningImportSchool,
  ProvisioningImportStudent,
  ProvisioningImportTeacher,
  ProvisioningRequest,
  ProvisioningRowAction,
  ProvisioningRowResult,
  ProvisioningRowStatus,
  ProvisioningRowType,
  ProvisioningTotals,
  ProvisioningValidationResult,
  School,
  SchoolMembershipRole,
  StudentAvatarId,
  ThemeMode,
  TopicStatus
} from "@/types";

type AuthProvisioningUserRole = "student" | "teacher" | "parent" | "admin";

type AuthProvisioningUserRecord = {
  id: string;
  username: string;
  normalized_username?: string;
  email?: string;
  normalized_email?: string;
  password_hash?: string;
  password_salt?: string;
  school_id?: string;
  password_must_change?: boolean;
  session_revision?: number;
  disabled_at?: string | null;
  role: AuthProvisioningUserRole;
  created_at?: string;
};

type AuthProvisioningStudentProfileRecord = {
  user_id: string;
  name: string;
  grade: GradeId;
  curriculum_track?: CurriculumTrack;
  parent_invite_code?: string;
  avatar_id?: StudentAvatarId | string;
};

type AuthProvisioningUserSettingsRecord = {
  user_id: string;
  language: Language;
  theme: ThemeMode;
  selected_grade: GradeId;
  updated_at: string;
};

type AuthProvisioningSchoolRecord = {
  id: string;
  code: string;
  normalized_code?: string;
  name: string;
  academic_year: string;
  contact_name?: string;
  contact_email?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type AuthProvisioningSchoolMembershipRecord = {
  id: string;
  school_id: string;
  user_id: string;
  role: SchoolMembershipRole;
  class_id?: string;
  created_at: string;
};

type AuthProvisioningTeacherClassRecord = {
  id: string;
  teacher_id: string;
  school_id?: string;
  class_code?: string;
  name: string;
  grade: GradeId;
  academic_year?: string;
  description_en?: string;
  description_zh?: string;
  invite_code?: string;
  created_at?: string;
  updated_at?: string;
};

type AuthProvisioningClassEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

type AuthProvisioningLessonProgressRecord = {
  user_id: string;
  topic_id: string;
  lesson_slug?: string;
  status: TopicStatus;
  mastery: number;
  started_at?: string | null;
  completed_at: string | null;
  duration_seconds?: number | null;
  checklist_state?: Record<string, boolean>;
  updated_at: string;
};

type AuthProvisioningBatchRecord = {
  id: string;
  school_id: string;
  status: ProvisioningBatchStatus;
  requested_by: string;
  totals: ProvisioningTotals;
  row_result_ids: string[];
  created_at: string;
  updated_at: string;
};

type AuthProvisioningRowResultRecord = {
  id: string;
  batch_id: string;
  type: ProvisioningRowType;
  row_index: number;
  status: ProvisioningRowStatus;
  action: ProvisioningRowAction;
  errors: string[];
  warnings: string[];
  school_id?: string;
  class_id?: string;
  user_id?: string;
  class_code?: string;
  username?: string;
  name?: string;
  role?: SchoolMembershipRole;
  temporary_password?: string;
};

export type AuthProvisioningPersistenceDatabase = {
  class_enrollments: AuthProvisioningClassEnrollmentRecord[];
  lesson_progress: AuthProvisioningLessonProgressRecord[];
  provisioning_batches: AuthProvisioningBatchRecord[];
  provisioning_row_results: AuthProvisioningRowResultRecord[];
  school_memberships: AuthProvisioningSchoolMembershipRecord[];
  schools: AuthProvisioningSchoolRecord[];
  student_profiles: AuthProvisioningStudentProfileRecord[];
  teacher_classes: AuthProvisioningTeacherClassRecord[];
  user_settings: AuthProvisioningUserSettingsRecord[];
  users: AuthProvisioningUserRecord[];
};

type ProvisioningTeacherPlan = {
  rowIndex: number;
  name: string;
  username: string;
  email?: string;
  classCodes: string[];
};

type ProvisioningClassPlan = {
  rowIndex: number;
  classCode: string;
  name: string;
  grade: GradeId;
  academicYear: string;
  teacherUsernames: string[];
};

type ProvisioningStudentPlan = {
  rowIndex: number;
  name: string;
  grade: GradeId;
  classCode: string;
  studentNo: string;
  username: string;
  email?: string;
};

type ProvisioningPlan = {
  schoolInput: ProvisioningImportSchool & { code: string; normalizedCode: string };
  existingSchool: AuthProvisioningSchoolRecord | null;
  teachers: ProvisioningTeacherPlan[];
  classes: ProvisioningClassPlan[];
  students: ProvisioningStudentPlan[];
  validation: ProvisioningValidationResult;
};

export type AuthProvisioningPersistenceStoreDependencies = {
  createId?: (prefix: string) => string;
  createParentInviteCode: (database: AuthProvisioningPersistenceDatabase) => string;
  createTemporaryPassword?: () => string;
  ensureClassStudentWorkRecords: (
    database: AuthProvisioningPersistenceDatabase,
    classId: string,
    studentId: string,
    now: string
  ) => void;
  hashPassword: (password: string) => {
    hash: string;
    salt: string;
  };
  initialStudentLessonProgressRecords: (
    userId: string,
    now: string
  ) => AuthProvisioningLessonProgressRecord[];
  mutateDatabase: <T>(
    mutator: (database: AuthProvisioningPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  now?: () => Date;
  readDatabase: () => Promise<AuthProvisioningPersistenceDatabase>;
};

export type AuthProvisioningPersistenceStore = ReturnType<typeof createAuthProvisioningPersistenceStore>;

const validGrades = validGradeSet;
const defaultCurriculumTrack: CurriculumTrack = "HK";
const defaultStudentAvatarId: StudentAvatarId = "delta";

function defaultCreateId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function createAuthTemporaryPassword() {
  return `Mais-${randomBytes(9).toString("base64url")}`;
}

export function addAuthSchoolMembershipRecord<Membership extends AuthProvisioningSchoolMembershipRecord>(
  database: { school_memberships: Membership[] },
  membership: Omit<Membership, "id">,
  createId: (prefix: string) => string = defaultCreateId
) {
  if (
    database.school_memberships.some((candidate) =>
      candidate.school_id === membership.school_id &&
      candidate.user_id === membership.user_id &&
      candidate.class_id === membership.class_id &&
      candidate.role === membership.role
    )
  ) {
    return;
  }

  database.school_memberships.push({
    id: createId("school-membership"),
    ...membership
  } as Membership);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeAuthProvisioningSchoolCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function normalizeAuthProvisioningClassCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function normalizeAuthProvisioningSchoolRecord<
  Record extends {
    id: string;
    code?: string;
    normalized_code?: string;
    name?: string;
    academic_year?: string;
    contact_name?: string;
    contact_email?: string;
    created_by?: string;
    created_at?: string | null;
    updated_at?: string | null;
  }
>(
  school: Record,
  now: string
): Record & {
  code: string;
  normalized_code: string;
  name: string;
  academic_year: string;
  contact_name: string | undefined;
  contact_email: string | undefined;
  created_by: string;
  created_at: string;
  updated_at: string;
} {
  return {
    ...school,
    code: normalizeAuthProvisioningSchoolCode(school.code || school.name || school.id),
    normalized_code: normalizeAuthProvisioningSchoolCode(school.normalized_code || school.code || school.name || school.id),
    name: school.name?.trim() || school.code || "School",
    academic_year: school.academic_year?.trim() || "2025-2026",
    contact_name: school.contact_name?.trim() || undefined,
    contact_email: school.contact_email && isLikelyEmail(school.contact_email) ? school.contact_email.trim() : undefined,
    created_by: school.created_by || "system",
    created_at: school.created_at ?? now,
    updated_at: school.updated_at ?? school.created_at ?? now
  };
}

export function normalizeAuthProvisioningSchoolMembershipRecord<
  Record extends {
    role?: unknown;
    class_id?: string | null;
    created_at?: string | null;
  }
>(
  membership: Record,
  now: string
): Record & {
  role: SchoolMembershipRole;
  class_id: string | undefined;
  created_at: string;
} {
  return {
    ...membership,
    role: membership.role === "teacher" || membership.role === "parent" || membership.role === "admin" ? membership.role : "student",
    class_id: typeof membership.class_id === "string" && membership.class_id.trim() ? membership.class_id : undefined,
    created_at: membership.created_at ?? now
  };
}

export function normalizeAuthProvisioningBatchRecord<
  Record extends {
    status?: unknown;
    totals?: unknown;
    row_result_ids?: unknown;
    created_at?: string | null;
    updated_at?: string | null;
  }
>(
  batch: Record,
  now: string
): Record & {
  status: "created" | "failed";
  totals: ProvisioningTotals;
  row_result_ids: string[];
  created_at: string;
  updated_at: string;
} {
  return {
    ...batch,
    status: batch.status === "failed" ? "failed" : "created",
    totals: normalizeAuthProvisioningTotals(batch.totals),
    row_result_ids: Array.isArray(batch.row_result_ids)
      ? batch.row_result_ids.filter((id): id is string => typeof id === "string")
      : [],
    created_at: batch.created_at ?? now,
    updated_at: batch.updated_at ?? batch.created_at ?? now
  };
}

export function normalizeAuthProvisioningRowResultRecord<
  Record extends {
    row_index?: unknown;
    status?: unknown;
    action?: unknown;
    errors?: unknown;
    warnings?: unknown;
    class_code?: string;
    role?: unknown;
  }
>(
  row: Record
): Record & {
  row_index: number;
  status: ProvisioningRowStatus;
  action: ProvisioningRowAction;
  errors: string[];
  warnings: string[];
  class_code: string | undefined;
  role: SchoolMembershipRole | undefined;
} {
  return {
    ...row,
    row_index: Number.isFinite(row.row_index) ? Math.max(0, Math.round(Number(row.row_index))) : 0,
    status: normalizeAuthProvisioningRowStatus(row.status),
    action: normalizeAuthProvisioningRowAction(row.action),
    errors: Array.isArray(row.errors) ? row.errors.filter((error): error is string => typeof error === "string") : [],
    warnings: Array.isArray(row.warnings) ? row.warnings.filter((warning): warning is string => typeof warning === "string") : [],
    class_code: row.class_code ? normalizeAuthProvisioningClassCode(row.class_code) : undefined,
    role: row.role === "student" || row.role === "teacher" || row.role === "parent" || row.role === "admin" ? row.role : undefined
  };
}

export function normalizeAuthProvisioningTotals(value: unknown): ProvisioningTotals {
  const totals = value as Partial<ProvisioningTotals> | null;
  return {
    schools: Math.max(0, Math.round(Number(totals?.schools) || 0)),
    classes: Math.max(0, Math.round(Number(totals?.classes) || 0)),
    teachers: Math.max(0, Math.round(Number(totals?.teachers) || 0)),
    students: Math.max(0, Math.round(Number(totals?.students) || 0)),
    errors: Math.max(0, Math.round(Number(totals?.errors) || 0))
  };
}

export function normalizeAuthProvisioningRowStatus(value: unknown): ProvisioningRowStatus {
  return value === "created" || value === "failed" || value === "skipped" || value === "valid" ? value : "failed";
}

export function normalizeAuthProvisioningRowAction(value: unknown): ProvisioningRowAction {
  return value === "create" || value === "reuse" || value === "link" || value === "none" ? value : "none";
}

function cleanStudentProfileName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function splitCodeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeAuthProvisioningClassCode(String(item))).filter(Boolean);
  }

  return asTrimmedString(value)
    .split(/[;,|]/)
    .map((item) => normalizeAuthProvisioningClassCode(item))
    .filter(Boolean);
}

function csvCellsFromText(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (quoted) {
      if (character === "\"" && nextCharacter === "\"") {
        cell += "\"";
        index += 1;
      } else if (character === "\"") {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === "\"") {
      quoted = true;
    } else if (character === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n") {
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

function classImportsFromRequest(input: ProvisioningRequest) {
  const structured = Array.isArray(input.classes) ? input.classes : [];
  const csv = csvRecordsFromText(input.classesCsv).map((row): ProvisioningImportClass => ({
    classCode: pickCsvField(row, ["classCode", "class", "class_code"]),
    name: pickCsvField(row, ["name", "className", "class_name"]) || undefined,
    grade: pickCsvField(row, ["grade"]) as GradeId,
    academicYear: pickCsvField(row, ["academicYear", "academic_year", "year"]) || undefined,
    teacherUsername: pickCsvField(row, ["teacherUsername", "teacher", "teacherEmail", "teacher_email"]) || undefined
  }));
  return [...structured, ...csv];
}

function teacherImportsFromRequest(input: ProvisioningRequest) {
  const structured = Array.isArray(input.teachers) ? input.teachers : [];
  const csv = csvRecordsFromText(input.teachersCsv).map((row): ProvisioningImportTeacher => ({
    name: pickCsvField(row, ["name", "teacherName", "teacher_name"]),
    email: pickCsvField(row, ["email", "teacherEmail", "teacher_email"]) || undefined,
    username: pickCsvField(row, ["username", "userName", "user_name"]) || undefined,
    classCodes: splitCodeList(pickCsvField(row, ["classCodes", "classes", "class_codes"]))
  }));
  return [...structured, ...csv];
}

function studentImportsFromRequest(input: ProvisioningRequest) {
  const structured = Array.isArray(input.students) ? input.students : [];
  const csv = csvRecordsFromText(input.studentsCsv).map((row): ProvisioningImportStudent => ({
    name: pickCsvField(row, ["name", "studentName", "student_name"]),
    grade: pickCsvField(row, ["grade"]) as GradeId,
    classCode: pickCsvField(row, ["classCode", "class", "class_code"]),
    studentNo: pickCsvField(row, ["studentNo", "studentNumber", "student_no", "number"]),
    email: pickCsvField(row, ["email", "studentEmail", "student_email"]) || undefined
  }));
  return [...structured, ...csv];
}

function provisioningRow({
  type,
  rowIndex,
  action,
  errors = [],
  warnings = [],
  status,
  ...rest
}: {
  type: ProvisioningRowType;
  rowIndex: number;
  action: ProvisioningRowAction;
  errors?: string[];
  warnings?: string[];
  status?: ProvisioningRowStatus;
} & Partial<Omit<ProvisioningRowResult, "id" | "type" | "rowIndex" | "action" | "errors" | "warnings" | "status">>): ProvisioningRowResult {
  return {
    id: `validation-${type}-${rowIndex}`,
    type,
    rowIndex,
    status: status ?? (errors.length ? "failed" : "valid"),
    action,
    errors,
    warnings,
    ...rest
  };
}

function provisioningTotals(rows: ProvisioningRowResult[]): ProvisioningTotals {
  return {
    schools: rows.filter((row) => row.type === "school" && !row.errors.length).length,
    classes: rows.filter((row) => row.type === "class" && !row.errors.length).length,
    teachers: rows.filter((row) => row.type === "teacher" && !row.errors.length).length,
    students: rows.filter((row) => row.type === "student" && !row.errors.length).length,
    errors: rows.filter((row) => row.errors.length).length
  };
}

function toSchool(record: AuthProvisioningSchoolRecord): School {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    academicYear: record.academic_year,
    contactName: record.contact_name,
    contactEmail: record.contact_email,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function teacherImportUsername(schoolCode: string, teacher: ProvisioningImportTeacher, index: number) {
  const explicitUsername = asTrimmedString(teacher.username);
  if (explicitUsername) return explicitUsername;

  const email = asTrimmedString(teacher.email);
  if (email && isLikelyEmail(email)) return email;

  return `${schoolCode}-teacher-${String(index).padStart(3, "0")}`;
}

function buildProvisioningPlan(database: AuthProvisioningPersistenceDatabase, input: ProvisioningRequest): ProvisioningPlan {
  const rows: ProvisioningRowResult[] = [];
  const schoolRecord: Record<string, unknown> = isPlainRecord(input.school) ? input.school : {};
  const schoolName = asTrimmedString(schoolRecord.name);
  const schoolCode = normalizeAuthProvisioningSchoolCode(asTrimmedString(schoolRecord.code));
  const academicYear = asTrimmedString(schoolRecord.academicYear);
  const contactName = asTrimmedString(schoolRecord.contactName);
  const contactEmail = asTrimmedString(schoolRecord.contactEmail);
  const schoolErrors: string[] = [];
  const schoolWarnings: string[] = [];

  if (!schoolName) schoolErrors.push("School name is required.");
  if (!schoolCode) schoolErrors.push("School code is required.");
  if (!academicYear) schoolErrors.push("Academic year is required.");
  if (contactEmail && !isLikelyEmail(contactEmail)) schoolErrors.push("School contact email is invalid.");

  const existingSchool = schoolCode
    ? database.schools.find((school) => school.normalized_code === schoolCode) ?? null
    : null;
  if (existingSchool && existingSchool.name !== schoolName) {
    schoolWarnings.push(`School code ${schoolCode} already exists; the existing school record will be reused.`);
  }

  rows.push(provisioningRow({
    type: "school",
    rowIndex: 1,
    action: existingSchool ? "reuse" : "create",
    errors: schoolErrors,
    warnings: schoolWarnings,
    schoolId: existingSchool?.id,
    name: schoolName,
    classCode: schoolCode
  }));

  const rawClasses = classImportsFromRequest(input);
  const rawTeachers = teacherImportsFromRequest(input);
  const rawStudents = studentImportsFromRequest(input);
  const explicitClassInputs = rawClasses.length > 0;
  const inferredClasses = new Map<string, ProvisioningImportClass>();

  if (!explicitClassInputs) {
    rawStudents.forEach((student) => {
      const classCode = normalizeAuthProvisioningClassCode(asTrimmedString(student.classCode));
      const grade = student.grade;
      if (classCode && validGrades.has(grade)) {
        inferredClasses.set(classCode, {
          classCode,
          name: `${classCode} Mathematics`,
          grade,
          academicYear
        });
      }
    });
  }

  const classInputs = explicitClassInputs ? rawClasses : Array.from(inferredClasses.values());
  const classPlans: ProvisioningClassPlan[] = [];
  const classCodes = new Set<string>();
  const classRowsByCode = new Map<string, ProvisioningRowResult>();
  const classTeacherUsernames = new Map<string, Set<string>>();

  const teacherPlans = rawTeachers.map((teacher, index): ProvisioningTeacherPlan => ({
    rowIndex: index + 2,
    name: cleanStudentProfileName(asTrimmedString(teacher.name)),
    username: teacherImportUsername(schoolCode || "MAIS", teacher, index + 1),
    email: asTrimmedString(teacher.email) || undefined,
    classCodes: splitCodeList(teacher.classCodes)
  }));

  teacherPlans.forEach((teacher) => {
    teacher.classCodes.forEach((classCode) => {
      if (!classTeacherUsernames.has(classCode)) classTeacherUsernames.set(classCode, new Set());
      classTeacherUsernames.get(classCode)?.add(normalizeUsername(teacher.username));
    });
  });

  classInputs.forEach((classInput, index) => {
    const rowIndex = index + 2;
    const classCode = normalizeAuthProvisioningClassCode(asTrimmedString(classInput.classCode));
    const className = asTrimmedString(classInput.name) || `${classCode} Mathematics`;
    const grade = classInput.grade;
    const classAcademicYear = asTrimmedString(classInput.academicYear) || academicYear;
    const teacherUsername = normalizeUsername(asTrimmedString(classInput.teacherUsername));
    const errors: string[] = [];

    if (!classCode) errors.push("Class code is required.");
    if (!className) errors.push("Class name is required.");
    if (!validGrades.has(grade)) errors.push("Class grade is invalid.");
    if (!classAcademicYear) errors.push("Class academic year is required.");
    if (classCode && classCodes.has(classCode)) errors.push(`Class code ${classCode} is duplicated in this import.`);
    if (classCode && existingSchool && database.teacher_classes.some((teacherClass) => teacherClass.school_id === existingSchool.id && teacherClass.class_code === classCode)) {
      errors.push(`Class code ${classCode} already exists for this school.`);
    }

    if (classCode) classCodes.add(classCode);
    if (teacherUsername) {
      if (!classTeacherUsernames.has(classCode)) classTeacherUsernames.set(classCode, new Set());
      classTeacherUsernames.get(classCode)?.add(teacherUsername);
    }

    const teacherUsernames = Array.from(classTeacherUsernames.get(classCode) ?? []);
    const row = provisioningRow({
      type: "class",
      rowIndex,
      action: "create",
      errors,
      name: className,
      classCode,
      role: "teacher"
    });
    rows.push(row);
    if (classCode) classRowsByCode.set(classCode, row);
    if (!errors.length) {
      classPlans.push({
        rowIndex,
        classCode,
        name: className,
        grade,
        academicYear: classAcademicYear,
        teacherUsernames
      });
    }
  });

  const teacherUsernames = new Set<string>();
  teacherPlans.forEach((teacher) => {
    const normalizedUsername = normalizeUsername(teacher.username);
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!teacher.name) errors.push("Teacher name is required.");
    if (!teacher.username.trim()) errors.push("Teacher username or email is required.");
    if (teacher.email && !isLikelyEmail(teacher.email)) errors.push("Teacher email is invalid.");
    if (!teacher.classCodes.length) errors.push("Teacher must be assigned to at least one class.");
    if (teacherUsernames.has(normalizedUsername)) errors.push(`Teacher username ${teacher.username} is duplicated in this import.`);
    if (
      database.users.some((user) =>
        user.normalized_username === normalizedUsername ||
        (teacher.email && user.normalized_email === normalizeEmail(teacher.email))
      )
    ) {
      errors.push(`Teacher username or email ${teacher.username} already exists.`);
    }
    teacher.classCodes.forEach((classCode) => {
      if (!classRowsByCode.has(classCode)) errors.push(`Teacher is assigned to unknown class ${classCode}.`);
    });
    if (teacher.email && teacher.username !== teacher.email && !isLikelyEmail(teacher.username)) {
      warnings.push("Generated teacher username is not an email address; confirm this is intentional before sharing credentials.");
    }
    teacherUsernames.add(normalizedUsername);

    rows.push(provisioningRow({
      type: "teacher",
      rowIndex: teacher.rowIndex,
      action: "create",
      errors,
      warnings,
      username: teacher.username,
      name: teacher.name,
      role: "teacher"
    }));
  });

  classPlans.forEach((classPlan) => {
    const classRow = classRowsByCode.get(classPlan.classCode);
    const teacherErrors = classPlan.teacherUsernames.length
      ? classPlan.teacherUsernames
          .filter((username) => !teacherPlans.some((teacher) => normalizeUsername(teacher.username) === username))
          .map((username) => `Class teacher ${username} is not present in the teacher import.`)
      : ["Class must have at least one teacher assigned."];
    if (teacherErrors.length && classRow) {
      classRow.errors.push(...teacherErrors);
      classRow.status = "failed";
    }
  });

  const studentPlans: ProvisioningStudentPlan[] = [];
  const studentUsernames = new Set<string>();
  const studentNumbersByClass = new Map<string, Set<string>>();
  rawStudents.forEach((student, index) => {
    const rowIndex = index + 2;
    const name = cleanStudentProfileName(asTrimmedString(student.name));
    const classCode = normalizeAuthProvisioningClassCode(asTrimmedString(student.classCode));
    const studentNo = normalizeAuthProvisioningClassCode(asTrimmedString(student.studentNo));
    const grade = student.grade;
    const email = asTrimmedString(student.email);
    const username = `${schoolCode || "MAIS"}-${classCode || "CLASS"}-${studentNo || String(index + 1).padStart(3, "0")}`;
    const normalizedUsername = normalizeUsername(username);
    const errors: string[] = [];

    if (!name) errors.push("Student name is required.");
    if (!validGrades.has(grade)) errors.push("Student grade is invalid.");
    if (!classCode) errors.push("Student class code is required.");
    if (!studentNo) errors.push("Student number is required.");
    if (email && !isLikelyEmail(email)) errors.push("Student email is invalid.");
    const classPlan = classPlans.find((candidate) => candidate.classCode === classCode);
    if (!classRowsByCode.has(classCode)) {
      errors.push(`Student is assigned to unknown class ${classCode}.`);
    } else if (classPlan && classPlan.grade !== grade) {
      errors.push(`Student grade ${grade} does not match class ${classCode} grade ${classPlan.grade}.`);
    }
    if (!studentNumbersByClass.has(classCode)) studentNumbersByClass.set(classCode, new Set());
    const classStudentNumbers = studentNumbersByClass.get(classCode);
    if (classStudentNumbers?.has(studentNo)) errors.push(`Student number ${studentNo} is duplicated in class ${classCode}.`);
    classStudentNumbers?.add(studentNo);
    if (studentUsernames.has(normalizedUsername)) errors.push(`Generated student username ${username} is duplicated in this import.`);
    if (
      database.users.some((user) =>
        user.normalized_username === normalizedUsername ||
        (email && user.normalized_email === normalizeEmail(email))
      )
    ) {
      errors.push(`Generated student username or email ${username} already exists.`);
    }
    studentUsernames.add(normalizedUsername);

    rows.push(provisioningRow({
      type: "student",
      rowIndex,
      action: "create",
      errors,
      username,
      name,
      classCode,
      role: "student"
    }));

    if (!errors.length) {
      studentPlans.push({
        rowIndex,
        name,
        grade,
        classCode,
        studentNo,
        username,
        email: email || undefined
      });
    }
  });

  if (!teacherPlans.length) {
    rows.push(provisioningRow({
      type: "teacher",
      rowIndex: 0,
      action: "none",
      errors: ["At least one teacher is required."]
    }));
  }
  if (!studentPlans.length) {
    rows.push(provisioningRow({
      type: "student",
      rowIndex: 0,
      action: "none",
      errors: ["At least one valid student is required."]
    }));
  }

  const totals = provisioningTotals(rows);
  const validation: ProvisioningValidationResult = {
    valid: totals.errors === 0,
    school: existingSchool
      ? toSchool(existingSchool)
      : schoolCode && schoolName && academicYear
        ? {
            id: "",
            code: schoolCode,
            name: schoolName,
            academicYear,
            contactName: contactName || undefined,
            contactEmail: contactEmail || undefined,
            createdBy: "",
            createdAt: "",
            updatedAt: ""
          }
        : undefined,
    rows,
    totals,
    errors: rows.flatMap((row) => row.errors),
    warnings: rows.flatMap((row) => row.warnings)
  };

  return {
    schoolInput: {
      name: schoolName,
      code: schoolCode,
      normalizedCode: schoolCode,
      academicYear,
      contactName: contactName || undefined,
      contactEmail: contactEmail || undefined
    },
    existingSchool,
    teachers: teacherPlans,
    classes: classPlans.filter((classPlan) => !classRowsByCode.get(classPlan.classCode)?.errors.length),
    students: studentPlans,
    validation
  };
}

function toProvisioningRowResult(record: AuthProvisioningRowResultRecord): ProvisioningRowResult {
  return {
    id: record.id,
    batchId: record.batch_id,
    type: record.type,
    rowIndex: record.row_index,
    status: record.status,
    action: record.action,
    errors: record.errors,
    warnings: record.warnings,
    schoolId: record.school_id,
    classId: record.class_id,
    userId: record.user_id,
    classCode: record.class_code,
    username: record.username,
    name: record.name,
    role: record.role,
    temporaryPassword: record.temporary_password
  };
}

function credentialsFromRows(rows: ProvisioningRowResult[], schoolCode: string): ProvisioningBatch["credentials"] {
  const teachers: ProvisioningCredential[] = [];
  const studentsByClass: Record<string, ProvisioningCredential[]> = {};

  rows.forEach((row) => {
    if ((row.role !== "teacher" && row.role !== "student") || !row.username || !row.name || !row.temporaryPassword) return;

    const credential: ProvisioningCredential = {
      role: row.role,
      name: row.name,
      username: row.username,
      temporaryPassword: row.temporaryPassword,
      schoolCode,
      classCode: row.classCode,
      passwordChangeRequired: true
    };

    if (row.role === "teacher") {
      teachers.push(credential);
      return;
    }

    const classCode = row.classCode ?? "UNASSIGNED";
    studentsByClass[classCode] = [...(studentsByClass[classCode] ?? []), credential];
  });

  return { teachers, studentsByClass };
}

function toProvisioningBatch(
  database: AuthProvisioningPersistenceDatabase,
  batch: AuthProvisioningBatchRecord
): ProvisioningBatch | null {
  const school = database.schools.find((candidate) => candidate.id === batch.school_id);
  if (!school) return null;

  const rowIdSet = new Set(batch.row_result_ids);
  const rows = database.provisioning_row_results
    .filter((row) => rowIdSet.has(row.id))
    .sort((a, b) => a.row_index - b.row_index || a.type.localeCompare(b.type))
    .map(toProvisioningRowResult);

  return {
    id: batch.id,
    school: toSchool(school),
    status: batch.status,
    requestedBy: batch.requested_by,
    createdAt: batch.created_at,
    updatedAt: batch.updated_at,
    totals: batch.totals,
    rows,
    credentials: credentialsFromRows(rows, school.code)
  };
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

export function createAuthProvisioningPersistenceStore({
  createId = defaultCreateId,
  createParentInviteCode,
  createTemporaryPassword = createAuthTemporaryPassword,
  ensureClassStudentWorkRecords,
  hashPassword,
  initialStudentLessonProgressRecords,
  mutateDatabase,
  now = () => new Date(),
  readDatabase
}: AuthProvisioningPersistenceStoreDependencies) {
  const rowRecordFromResult = (row: ProvisioningRowResult, batchId: string): AuthProvisioningRowResultRecord => ({
    id: createId("provisioning-row"),
    batch_id: batchId,
    type: row.type,
    row_index: row.rowIndex,
    status: row.status,
    action: row.action,
    errors: row.errors,
    warnings: row.warnings,
    school_id: row.schoolId,
    class_id: row.classId,
    user_id: row.userId,
    class_code: row.classCode,
    username: row.username,
    name: row.name,
    role: row.role,
    temporary_password: row.temporaryPassword
  });

  const getProvisioningBatchForAdmin = async (adminId: string, batchId: string) => {
    const database = await readDatabase();
    const admin = database.users.find((candidate) => candidate.id === adminId);
    if (admin?.role !== "admin") return null;

    const batch = database.provisioning_batches.find((candidate) => candidate.id === batchId);
    return batch ? toProvisioningBatch(database, batch) : null;
  };

  return {
    validateSchoolProvisioning: async (input: ProvisioningRequest) => {
      const database = await readDatabase();
      return buildProvisioningPlan(database, input).validation;
    },

    createSchoolProvisioningBatch: async (adminId: string, input: ProvisioningRequest) =>
      mutateDatabase((database) => {
        const admin = database.users.find((candidate) => candidate.id === adminId);
        if (admin?.role !== "admin") return { status: "forbidden" as const };

        const plan = buildProvisioningPlan(database, input);
        if (!plan.validation.valid) return { status: "invalid" as const, validation: plan.validation };

        const timestamp = now().toISOString();
        const batchId = createId("provisioning-batch");
        const schoolId = plan.existingSchool?.id ?? createId("school");
        const schoolRecord = plan.existingSchool ?? {
          id: schoolId,
          code: plan.schoolInput.code,
          normalized_code: plan.schoolInput.normalizedCode,
          name: plan.schoolInput.name,
          academic_year: plan.schoolInput.academicYear,
          contact_name: plan.schoolInput.contactName,
          contact_email: plan.schoolInput.contactEmail,
          created_by: admin.id,
          created_at: timestamp,
          updated_at: timestamp
        };

        if (!plan.existingSchool) {
          database.schools.push(schoolRecord);
        } else {
          schoolRecord.updated_at = timestamp;
        }

        const teacherIdByUsername = new Map<string, string>();
        const classIdByCode = new Map<string, string>();
        const createdRows: ProvisioningRowResult[] = [];
        const schoolRow = plan.validation.rows.find((row) => row.type === "school");
        if (schoolRow) {
          createdRows.push({
            ...schoolRow,
            id: `batch-school-${batchId}`,
            batchId,
            status: "created",
            schoolId,
            action: plan.existingSchool ? "reuse" : "create"
          });
        }

        plan.teachers.forEach((teacher) => {
          const password = createTemporaryPassword();
          const hashed = hashPassword(password);
          const userId = createId("teacher");
          const firstClass = plan.classes.find((classPlan) => teacher.classCodes.includes(classPlan.classCode));
          database.users.push({
            id: userId,
            username: teacher.username,
            normalized_username: normalizeUsername(teacher.username),
            email: teacher.email,
            normalized_email: teacher.email ? normalizeEmail(teacher.email) : undefined,
            password_hash: hashed.hash,
            password_salt: hashed.salt,
            school_id: schoolId,
            password_must_change: true,
            session_revision: 1,
            disabled_at: null,
            role: "teacher",
            created_at: timestamp
          });
          database.student_profiles.push({
            user_id: userId,
            name: teacher.name,
            grade: firstClass?.grade ?? "S3",
            curriculum_track: defaultCurriculumTrack,
            avatar_id: "sigma"
          });
          database.user_settings.push({
            user_id: userId,
            language: "en",
            theme: "dark",
            selected_grade: firstClass?.grade ?? "S3",
            updated_at: timestamp
          });
          teacherIdByUsername.set(normalizeUsername(teacher.username), userId);

          createdRows.push({
            id: `batch-teacher-${userId}`,
            batchId,
            type: "teacher",
            rowIndex: teacher.rowIndex,
            status: "created",
            action: "create",
            errors: [],
            warnings: [],
            schoolId,
            userId,
            username: teacher.username,
            name: teacher.name,
            role: "teacher",
            temporaryPassword: password
          });
        });

        plan.classes.forEach((classPlan) => {
          const teacherIds = classPlan.teacherUsernames
            .map((username) => teacherIdByUsername.get(username))
            .filter((teacherId): teacherId is string => Boolean(teacherId));
          const ownerTeacherId = teacherIds[0] ?? admin.id;
          const classId = createId("class");
          database.teacher_classes.push({
            id: classId,
            teacher_id: ownerTeacherId,
            school_id: schoolId,
            class_code: classPlan.classCode,
            name: classPlan.name,
            grade: classPlan.grade,
            academic_year: classPlan.academicYear,
            description_en: `${classPlan.name} imported through MAIS school provisioning.`,
            description_zh: `${classPlan.name} 已由 MAIS 學校批量開戶匯入。`,
            invite_code: `${classPlan.classCode}-${createId("invite").slice(0, 6)}`.toUpperCase(),
            created_at: timestamp,
            updated_at: timestamp
          });
          classIdByCode.set(classPlan.classCode, classId);
          teacherIds.forEach((teacherId) => {
            addAuthSchoolMembershipRecord(database, {
              school_id: schoolId,
              user_id: teacherId,
              role: "teacher",
              class_id: classId,
              created_at: timestamp
            }, createId);
          });

          createdRows.push({
            id: `batch-class-${classId}`,
            batchId,
            type: "class",
            rowIndex: classPlan.rowIndex,
            status: "created",
            action: "create",
            errors: [],
            warnings: [],
            schoolId,
            classId,
            classCode: classPlan.classCode,
            name: classPlan.name,
            role: "teacher"
          });
        });

        plan.students.forEach((student) => {
          const password = createTemporaryPassword();
          const hashed = hashPassword(password);
          const userId = createId("student");
          const classId = classIdByCode.get(student.classCode);
          database.users.push({
            id: userId,
            username: student.username,
            normalized_username: normalizeUsername(student.username),
            email: student.email,
            normalized_email: student.email ? normalizeEmail(student.email) : undefined,
            password_hash: hashed.hash,
            password_salt: hashed.salt,
            school_id: schoolId,
            password_must_change: true,
            session_revision: 1,
            disabled_at: null,
            role: "student",
            created_at: timestamp
          });
          database.student_profiles.push({
            user_id: userId,
            name: student.name,
            grade: student.grade,
            curriculum_track: defaultCurriculumTrack,
            parent_invite_code: createParentInviteCode(database),
            avatar_id: defaultStudentAvatarId
          });
          database.user_settings.push({
            user_id: userId,
            language: "en",
            theme: "dark",
            selected_grade: student.grade,
            updated_at: timestamp
          });
          database.lesson_progress.push(...initialStudentLessonProgressRecords(userId, timestamp));
          addAuthSchoolMembershipRecord(database, {
            school_id: schoolId,
            user_id: userId,
            role: "student",
            class_id: classId,
            created_at: timestamp
          }, createId);
          if (classId) {
            database.class_enrollments.push({
              id: createId("enrollment"),
              class_id: classId,
              student_id: userId,
              joined_at: timestamp
            });
            ensureClassStudentWorkRecords(database, classId, userId, timestamp);
          }

          createdRows.push({
            id: `batch-student-${userId}`,
            batchId,
            type: "student",
            rowIndex: student.rowIndex,
            status: "created",
            action: "create",
            errors: [],
            warnings: [],
            schoolId,
            classId,
            userId,
            classCode: student.classCode,
            username: student.username,
            name: student.name,
            role: "student",
            temporaryPassword: password
          });
        });

        const rowRecords = createdRows.map((row) => rowRecordFromResult(row, batchId));
        database.provisioning_row_results.push(...rowRecords);
        const batchRecord: AuthProvisioningBatchRecord = {
          id: batchId,
          school_id: schoolId,
          status: "created",
          requested_by: admin.id,
          totals: provisioningTotals(createdRows),
          row_result_ids: rowRecords.map((row) => row.id),
          created_at: timestamp,
          updated_at: timestamp
        };
        database.provisioning_batches.push(batchRecord);

        const batch = toProvisioningBatch(database, batchRecord);
        return batch ? { status: "created" as const, batch } : { status: "invalid" as const, validation: plan.validation };
      }),

    getProvisioningBatchForAdmin,

    getProvisioningBatchCredentialCsvForAdmin: async (adminId: string, batchId: string) => {
      const batch = await getProvisioningBatchForAdmin(adminId, batchId);
      if (!batch) return null;

      const lines = [
        ["audience", "schoolCode", "classCode", "role", "name", "username", "temporaryPassword", "passwordChangeRequired"]
          .map(csvEscape)
          .join(",")
      ];

      batch.credentials.teachers.forEach((credential) => {
        lines.push([
          "school-contact",
          credential.schoolCode,
          credential.classCode ?? "",
          credential.role,
          credential.name,
          credential.username,
          credential.temporaryPassword,
          "yes"
        ].map(csvEscape).join(","));
      });

      Object.entries(batch.credentials.studentsByClass)
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([classCode, credentials]) => {
          credentials.forEach((credential) => {
            lines.push([
              `class-${classCode}`,
              credential.schoolCode,
              classCode,
              credential.role,
              credential.name,
              credential.username,
              credential.temporaryPassword,
              "yes"
            ].map(csvEscape).join(","));
          });
        });

      return {
        filename: `mais-provisioning-${batch.school.code}-${batch.createdAt.slice(0, 10)}.csv`,
        csv: `${lines.join("\n")}\n`
      };
    }
  };
}
