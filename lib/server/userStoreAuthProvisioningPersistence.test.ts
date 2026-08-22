import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createAuthProvisioningPersistenceStore,
  type AuthProvisioningPersistenceDatabase
} from "@/lib/server/userStore/authProvisioningPersistence";
import type { GradeId, ProvisioningRequest } from "@/types";

const fixedNow = "2026-06-21T12:00:00.000Z";

function createDatabase(): AuthProvisioningPersistenceDatabase {
  return {
    class_enrollments: [],
    lesson_progress: [],
    provisioning_batches: [],
    provisioning_row_results: [],
    school_memberships: [],
    schools: [],
    student_profiles: [],
    teacher_classes: [],
    user_settings: [],
    users: [
      {
        id: "admin-1",
        username: "admin",
        normalized_username: "admin",
        role: "admin"
      },
      {
        id: "teacher-plain",
        username: "teacher",
        normalized_username: "teacher",
        role: "teacher"
      }
    ]
  };
}

function validProvisioningRequest(): ProvisioningRequest {
  return {
    school: {
      name: "North Point Future School",
      code: "npfs",
      academicYear: "2026-2027",
      contactName: "Ops Lead",
      contactEmail: "ops@example.test"
    },
    classes: [
      {
        classCode: "S3A",
        name: "S3A Mathematics",
        grade: "S3",
        academicYear: "2026-2027",
        teacherUsername: "lead@example.test"
      }
    ],
    teachers: [
      {
        name: "Lead Teacher",
        email: "lead@example.test",
        classCodes: ["S3A"]
      }
    ],
    students: [
      {
        name: "Ada Wong",
        grade: "S3",
        classCode: "S3A",
        studentNo: "001",
        email: "ada@example.test"
      },
      {
        name: "Ben Chan",
        grade: "S3",
        classCode: "S3A",
        studentNo: "002"
      }
    ]
  };
}

function createTestStore(database: AuthProvisioningPersistenceDatabase) {
  let idCounter = 0;
  let passwordCounter = 0;
  const seededWork: Array<{ classId: string; studentId: string; now: string }> = [];

  const store = createAuthProvisioningPersistenceStore({
    createId: (prefix) => `${prefix}-${++idCounter}`,
    createTemporaryPassword: () => `Temp-${++passwordCounter}`,
    ensureClassStudentWorkRecords: (_database, classId, studentId, now) => {
      seededWork.push({ classId, studentId, now });
    },
    hashPassword: (password) => ({
      hash: `hash:${password}`,
      salt: `salt:${password}`
    }),
    initialStudentLessonProgressRecords: (userId, now) => [
      {
        user_id: userId,
        topic_id: `topic-${userId}`,
        status: "not-started",
        mastery: 0,
        completed_at: null,
        updated_at: now
      }
    ],
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date(fixedNow),
    readDatabase: async () => database
  });

  return { seededWork, store };
}

test("auth provisioning persistence validates school provisioning without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/authProvisioningPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const { store } = createTestStore(createDatabase());
  const validation = await store.validateSchoolProvisioning(validProvisioningRequest());

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.totals, {
    schools: 1,
    classes: 1,
    teachers: 1,
    students: 2,
    errors: 0
  });
  assert.deepEqual(validation.school, {
    id: "",
    code: "NPFS",
    name: "North Point Future School",
    academicYear: "2026-2027",
    contactName: "Ops Lead",
    contactEmail: "ops@example.test",
    createdBy: "",
    createdAt: "",
    updatedAt: ""
  });
  assert.equal(validation.rows.find((row) => row.type === "teacher")?.username, "lead@example.test");
  assert.deepEqual(validation.errors, []);
});

test("auth provisioning persistence creates batches, reads admin batches, and exports credentials", async () => {
  const database = createDatabase();
  const { seededWork, store } = createTestStore(database);

  const result = await store.createSchoolProvisioningBatch("admin-1", validProvisioningRequest());

  assert.equal(result.status, "created");
  assert.equal(result.status === "created" ? result.batch.school.code : null, "NPFS");
  assert.deepEqual(result.status === "created" ? result.batch.totals : null, {
    schools: 1,
    classes: 1,
    teachers: 1,
    students: 2,
    errors: 0
  });
  assert.equal(database.schools.length, 1);
  assert.equal(database.teacher_classes.length, 1);
  assert.equal(database.users.filter((user) => user.role === "teacher").length, 2);
  assert.equal(database.users.filter((user) => user.role === "student").length, 2);
  assert.equal(database.users.find((user) => user.username === "lead@example.test")?.password_hash, "hash:Temp-1");
  assert.equal(database.student_profiles.find((profile) => profile.name === "Ada Wong")?.parent_invite_code ?? "", "");
  assert.doesNotMatch(JSON.stringify(database), /MAIS-[A-F0-9]{24}/i);
  assert.equal(database.lesson_progress.length, 2);
  assert.equal(seededWork.length, 2);

  const batchId = result.status === "created" ? result.batch.id : "";
  const adminBatch = await store.getProvisioningBatchForAdmin("admin-1", batchId);
  assert.equal(adminBatch?.id, batchId);
  assert.equal(await store.getProvisioningBatchForAdmin("teacher-plain", batchId), null);

  const exportFile = await store.getProvisioningBatchCredentialCsvForAdmin("admin-1", batchId);
  assert.equal(exportFile?.filename, "mais-provisioning-NPFS-2026-06-21.csv");
  assert.match(exportFile?.csv ?? "", /^audience,schoolCode,classCode,role,name,username,temporaryPassword,passwordChangeRequired\n/);
  assert.match(exportFile?.csv ?? "", /school-contact,NPFS,,teacher,Lead Teacher,lead@example\.test,Temp-1,yes/);
  assert.match(exportFile?.csv ?? "", /class-S3A,NPFS,S3A,student,Ada Wong,NPFS-S3A-001,Temp-2,yes/);
  assert.match(exportFile?.csv ?? "", /class-S3A,NPFS,S3A,student,Ben Chan,NPFS-S3A-002,Temp-3,yes/);
});

test("auth provisioning persistence rejects non-admin and invalid batches without mutation", async () => {
  const database = createDatabase();
  const { store } = createTestStore(database);

  assert.deepEqual(await store.createSchoolProvisioningBatch("teacher-plain", validProvisioningRequest()), {
    status: "forbidden"
  });
  assert.equal(database.provisioning_batches.length, 0);

  const invalid = await store.createSchoolProvisioningBatch("admin-1", {
    ...validProvisioningRequest(),
    school: {
      name: "",
      code: "",
      academicYear: ""
    },
    students: [
      {
        name: "",
        grade: "S3" as GradeId,
        classCode: "",
        studentNo: ""
      }
    ]
  });

  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.status === "invalid" ? invalid.validation.valid : true, false);
  assert.equal(database.provisioning_batches.length, 0);
});

test("auth provisioning persistence owns school and class code normalization helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authProvisioningPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authProvisioningPersistence") as Record<string, unknown>;

  const normalizeSchoolCode = helpers.normalizeAuthProvisioningSchoolCode as ((value: string) => string) | undefined;
  const normalizeClassCode = helpers.normalizeAuthProvisioningClassCode as ((value: string) => string) | undefined;

  assert.equal(typeof normalizeSchoolCode, "function");
  assert.equal(typeof normalizeClassCode, "function");
  assert.match(persistenceSource, /export function normalizeAuthProvisioningSchoolCode\b/);
  assert.match(persistenceSource, /export function normalizeAuthProvisioningClassCode\b/);
  assert.doesNotMatch(rootSource, /function normalizeSchoolCode\(/);
  assert.doesNotMatch(rootSource, /function normalizeClassCode\(/);
  assert.match(rootSource, /normalizeAuthProvisioningSchoolCode as normalizeSchoolCodeFromAuthProvisioning/);
  assert.match(rootSource, /normalizeAuthProvisioningClassCode as normalizeClassCodeFromAuthProvisioning/);

  assert.equal(normalizeSchoolCode?.(" np future @ school "), "NP-FUTURE-SCHOOL");
  assert.equal(normalizeClassCode?.(" s3 a 01 "), "S3-A-01");
});

test("auth provisioning persistence owns school record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authProvisioningPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authProvisioningPersistence") as Record<string, unknown>;
  const normalizeSchool = helpers.normalizeAuthProvisioningSchoolRecord as ((
    school: {
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
    },
    now: string
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeSchool, "function");
  assert.match(persistenceSource, /export function normalizeAuthProvisioningSchoolRecord\b/);
  assert.match(rootSource, /normalizeAuthProvisioningSchoolRecord as normalizeSchoolRecordFromAuthProvisioning/);
  assert.doesNotMatch(rootSource, /schools: \(database\.schools \?\? \[\]\)\.map\(\(school\): SchoolRecord => \(\{/);
  assert.doesNotMatch(rootSource, /contact_email: school\.contact_email && isLikelyEmailFromAuthSessionPersistence\(school\.contact_email\)/);

  assert.deepEqual(normalizeSchool?.({
    id: "school-1",
    code: " np future @ school ",
    normalized_code: "",
    name: "  ",
    academic_year: "",
    contact_name: " Ops Lead ",
    contact_email: "not-email",
    created_by: "",
    created_at: null,
    updated_at: null
  }, fixedNow), {
    id: "school-1",
    code: "NP-FUTURE-SCHOOL",
    normalized_code: "NP-FUTURE-SCHOOL",
    name: " np future @ school ",
    academic_year: "2025-2026",
    contact_name: "Ops Lead",
    contact_email: undefined,
    created_by: "system",
    created_at: fixedNow,
    updated_at: fixedNow
  });

  assert.deepEqual(normalizeSchool?.({
    id: "school-2",
    code: "",
    normalized_code: " existing-code ",
    name: " North Point ",
    academic_year: " 2026-2027 ",
    contact_name: " ",
    contact_email: " ops@example.test ",
    created_by: "admin-1",
    created_at: "2026-06-20T12:00:00.000Z",
    updated_at: undefined
  }, fixedNow), {
    id: "school-2",
    code: "NORTH-POINT",
    normalized_code: "EXISTING-CODE",
    name: "North Point",
    academic_year: "2026-2027",
    contact_name: undefined,
    contact_email: "ops@example.test",
    created_by: "admin-1",
    created_at: "2026-06-20T12:00:00.000Z",
    updated_at: "2026-06-20T12:00:00.000Z"
  });
});

test("auth provisioning persistence owns school membership record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authProvisioningPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authProvisioningPersistence") as Record<string, unknown>;
  const normalizeMembership = helpers.normalizeAuthProvisioningSchoolMembershipRecord as ((
    membership: {
      id: string;
      school_id: string;
      user_id: string;
      role?: unknown;
      class_id?: string | null;
      created_at?: string | null;
    },
    now: string
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeMembership, "function");
  assert.match(persistenceSource, /export function normalizeAuthProvisioningSchoolMembershipRecord\b/);
  assert.match(rootSource, /normalizeAuthProvisioningSchoolMembershipRecord as normalizeSchoolMembershipRecordFromAuthProvisioning/);
  assert.doesNotMatch(rootSource, /school_memberships: \(database\.school_memberships \?\? \[\]\)\.map\(\(membership\): SchoolMembershipRecord => \(\{/);
  assert.doesNotMatch(rootSource, /role: \["student", "teacher", "parent", "admin"\]\.includes\(membership\.role\)/);
  assert.doesNotMatch(rootSource, /class_id: typeof membership\.class_id === "string" && membership\.class_id\.trim\(\)/);

  assert.deepEqual(normalizeMembership?.({
    id: "membership-invalid",
    school_id: "school-1",
    user_id: "user-1",
    role: "owner",
    class_id: "   ",
    created_at: null
  }, fixedNow), {
    id: "membership-invalid",
    school_id: "school-1",
    user_id: "user-1",
    role: "student",
    class_id: undefined,
    created_at: fixedNow
  });

  assert.deepEqual(normalizeMembership?.({
    id: "membership-valid",
    school_id: "school-1",
    user_id: "user-2",
    role: "teacher",
    class_id: " class-1 ",
    created_at: "2026-06-20T12:00:00.000Z"
  }, fixedNow), {
    id: "membership-valid",
    school_id: "school-1",
    user_id: "user-2",
    role: "teacher",
    class_id: " class-1 ",
    created_at: "2026-06-20T12:00:00.000Z"
  });
});

test("auth provisioning persistence owns provisioning totals status and action normalization helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authProvisioningPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authProvisioningPersistence") as Record<string, unknown>;

  const normalizeTotals = helpers.normalizeAuthProvisioningTotals as ((value: unknown) => Record<string, number>) | undefined;
  const normalizeRowStatus = helpers.normalizeAuthProvisioningRowStatus as ((value: unknown) => string) | undefined;
  const normalizeRowAction = helpers.normalizeAuthProvisioningRowAction as ((value: unknown) => string) | undefined;

  assert.equal(typeof normalizeTotals, "function");
  assert.equal(typeof normalizeRowStatus, "function");
  assert.equal(typeof normalizeRowAction, "function");
  assert.match(persistenceSource, /export function normalizeAuthProvisioningTotals\b/);
  assert.match(persistenceSource, /export function normalizeAuthProvisioningRowStatus\b/);
  assert.match(persistenceSource, /export function normalizeAuthProvisioningRowAction\b/);
  assert.doesNotMatch(rootSource, /function normalizeProvisioningTotals\(/);
  assert.doesNotMatch(rootSource, /function normalizeProvisioningRowStatus\(/);
  assert.doesNotMatch(rootSource, /function normalizeProvisioningRowAction\(/);
  assert.match(rootSource, /normalizeAuthProvisioningTotals as normalizeProvisioningTotalsFromAuthProvisioning/);
  assert.match(rootSource, /normalizeAuthProvisioningRowStatus as normalizeProvisioningRowStatusFromAuthProvisioning/);
  assert.match(rootSource, /normalizeAuthProvisioningRowAction as normalizeProvisioningRowActionFromAuthProvisioning/);

  assert.deepEqual(normalizeTotals?.({
    schools: "2.4",
    classes: -3,
    teachers: 1.6,
    students: "bad",
    errors: 2.2
  }), {
    schools: 2,
    classes: 0,
    teachers: 2,
    students: 0,
    errors: 2
  });
  assert.equal(normalizeRowStatus?.("valid"), "valid");
  assert.equal(normalizeRowStatus?.("pending"), "failed");
  assert.equal(normalizeRowAction?.("reuse"), "reuse");
  assert.equal(normalizeRowAction?.("archive"), "none");
});

test("auth provisioning persistence owns provisioning batch record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authProvisioningPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authProvisioningPersistence") as Record<string, unknown>;
  const normalizeBatch = helpers.normalizeAuthProvisioningBatchRecord as ((
    batch: {
      id: string;
      school_id: string;
      status?: unknown;
      requested_by: string;
      totals?: unknown;
      row_result_ids?: unknown;
      created_at?: string | null;
      updated_at?: string | null;
    },
    now: string
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeBatch, "function");
  assert.match(persistenceSource, /export function normalizeAuthProvisioningBatchRecord\b/);
  assert.match(rootSource, /normalizeAuthProvisioningBatchRecord as normalizeProvisioningBatchRecordFromAuthProvisioning/);
  assert.doesNotMatch(rootSource, /provisioning_batches: \(database\.provisioning_batches \?\? \[\]\)\.map\(\(batch\): ProvisioningBatchRecord => \(\{/);
  assert.doesNotMatch(rootSource, /row_result_ids: Array\.isArray\(batch\.row_result_ids\)/);

  assert.deepEqual(normalizeBatch?.({
    id: "batch-invalid",
    school_id: "school-1",
    status: "queued",
    requested_by: "admin-1",
    totals: {
      schools: "1.8",
      classes: -3,
      teachers: 2.2,
      students: "bad",
      errors: 1.2
    },
    row_result_ids: ["row-1", 42, "row-2"],
    created_at: null,
    updated_at: null
  }, fixedNow), {
    id: "batch-invalid",
    school_id: "school-1",
    status: "created",
    requested_by: "admin-1",
    totals: {
      schools: 2,
      classes: 0,
      teachers: 2,
      students: 0,
      errors: 1
    },
    row_result_ids: ["row-1", "row-2"],
    created_at: fixedNow,
    updated_at: fixedNow
  });

  assert.deepEqual(normalizeBatch?.({
    id: "batch-valid",
    school_id: "school-1",
    status: "failed",
    requested_by: "admin-1",
    totals: {
      schools: 1,
      classes: 1,
      teachers: 1,
      students: 10,
      errors: 2
    },
    row_result_ids: "not-array",
    created_at: "2026-06-20T12:00:00.000Z",
    updated_at: undefined
  }, fixedNow), {
    id: "batch-valid",
    school_id: "school-1",
    status: "failed",
    requested_by: "admin-1",
    totals: {
      schools: 1,
      classes: 1,
      teachers: 1,
      students: 10,
      errors: 2
    },
    row_result_ids: [],
    created_at: "2026-06-20T12:00:00.000Z",
    updated_at: "2026-06-20T12:00:00.000Z"
  });
});

test("auth provisioning persistence owns provisioning row result record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authProvisioningPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authProvisioningPersistence") as Record<string, unknown>;
  const normalizeRow = helpers.normalizeAuthProvisioningRowResultRecord as ((
    row: {
      id: string;
      batch_id?: string;
      type: string;
      row_index?: unknown;
      status?: unknown;
      action?: unknown;
      errors?: unknown;
      warnings?: unknown;
      class_code?: string;
      role?: unknown;
    }
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeRow, "function");
  assert.match(persistenceSource, /export function normalizeAuthProvisioningRowResultRecord\b/);
  assert.match(rootSource, /normalizeAuthProvisioningRowResultRecord as normalizeProvisioningRowResultRecordFromAuthProvisioning/);
  assert.doesNotMatch(rootSource, /provisioning_row_results: \(database\.provisioning_row_results \?\? \[\]\)\.map\(\(row\): ProvisioningRowResultRecord => \(\{/);
  assert.doesNotMatch(rootSource, /row_index: Number\.isFinite\(row\.row_index\)/);
  assert.doesNotMatch(rootSource, /errors: Array\.isArray\(row\.errors\)/);
  assert.doesNotMatch(rootSource, /warnings: Array\.isArray\(row\.warnings\)/);

  assert.deepEqual(normalizeRow?.({
    id: "row-invalid",
    batch_id: "batch-1",
    type: "student",
    row_index: Number.NaN,
    status: "pending",
    action: "archive",
    errors: ["missing name", 42, "bad grade"],
    warnings: "not-array",
    class_code: " s3 a 01 ",
    role: "owner"
  }), {
    id: "row-invalid",
    batch_id: "batch-1",
    type: "student",
    row_index: 0,
    status: "failed",
    action: "none",
    errors: ["missing name", "bad grade"],
    warnings: [],
    class_code: "S3-A-01",
    role: undefined
  });

  assert.deepEqual(normalizeRow?.({
    id: "row-valid",
    batch_id: "batch-1",
    type: "teacher",
    row_index: 2.6,
    status: "valid",
    action: "reuse",
    errors: [],
    warnings: ["already exists"],
    class_code: undefined,
    role: "teacher"
  }), {
    id: "row-valid",
    batch_id: "batch-1",
    type: "teacher",
    row_index: 3,
    status: "valid",
    action: "reuse",
    errors: [],
    warnings: ["already exists"],
    class_code: undefined,
    role: "teacher"
  });
});

test("auth provisioning persistence owns temporary password generation for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authProvisioningPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authProvisioningPersistence") as Record<string, unknown>;
  const createTemporaryPassword = helpers.createAuthTemporaryPassword as (() => string) | undefined;

  assert.equal(typeof createTemporaryPassword, "function");
  assert.match(persistenceSource, /export function createAuthTemporaryPassword\b/);
  assert.match(rootSource, /createAuthTemporaryPassword as createTemporaryPasswordFromAuthProvisioning/);
  assert.doesNotMatch(rootSource, /function generateTemporaryPassword\(/);

  const password = createTemporaryPassword?.() ?? "";
  assert.match(password, /^Mais-[A-Za-z0-9_-]{12}$/);
});

test("auth provisioning persistence owns school membership insertion helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authProvisioningPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authProvisioningPersistence") as Record<string, unknown>;
  const addSchoolMembership = helpers.addAuthSchoolMembershipRecord as ((
    database: {
      school_memberships: Array<{
        id: string;
        school_id: string;
        user_id: string;
        role: string;
        class_id?: string;
        created_at: string;
      }>;
    },
    membership: {
      school_id: string;
      user_id: string;
      role: string;
      class_id?: string;
      created_at: string;
    },
    createId: (prefix: string) => string
  ) => void) | undefined;

  assert.equal(typeof addSchoolMembership, "function");
  assert.match(persistenceSource, /export function addAuthSchoolMembershipRecord\b/);
  assert.match(rootSource, /addAuthSchoolMembershipRecord as addSchoolMembershipFromAuthProvisioning/);
  assert.doesNotMatch(rootSource, /function addSchoolMembership\(/);

  const database = { school_memberships: [] };
  const membership = {
    school_id: "school-1",
    user_id: "student-1",
    role: "student",
    class_id: "class-1",
    created_at: fixedNow
  };

  addSchoolMembership?.(database, membership, (prefix) => `${prefix}-1`);
  addSchoolMembership?.(database, membership, (prefix) => `${prefix}-duplicate`);
  addSchoolMembership?.(database, { ...membership, role: "teacher" }, (prefix) => `${prefix}-2`);

  assert.deepEqual(database.school_memberships, [
    {
      id: "school-membership-1",
      ...membership
    },
    {
      id: "school-membership-2",
      ...membership,
      role: "teacher"
    }
  ]);
});

test("legacy userStore delegates school provisioning operations to extracted auth provisioning persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /createAuthProvisioningPersistenceStore\(/);
  assert.match(source, /export const validateSchoolProvisioning = authUserStore\.validateSchoolProvisioning;/);
  assert.match(source, /export const createSchoolProvisioningBatch = authUserStore\.createSchoolProvisioningBatch;/);
  assert.match(source, /export const getProvisioningBatchForAdmin = authUserStore\.getProvisioningBatchForAdmin;/);
  assert.match(source, /export const getProvisioningBatchCredentialCsvForAdmin = authUserStore\.getProvisioningBatchCredentialCsvForAdmin;/);
});
