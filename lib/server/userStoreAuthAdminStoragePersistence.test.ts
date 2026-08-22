import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createAuthAdminStoragePersistenceStore,
  type AuthAdminStoragePersistenceDatabase
} from "@/lib/server/userStore/authAdminStoragePersistence";

const fixedNow = "2026-06-21T13:00:00.000Z";

function createDatabase(): AuthAdminStoragePersistenceDatabase {
  return {
    guardian_links: [
      {
        id: "guardian-1",
        parent_id: "parent-1",
        student_id: "student-1",
        relationship: "Parent",
        status: "active",
        invite_code: "INVITE-SECRET",
        created_at: "2026-06-12T00:04:00.000Z",
        updated_at: "2026-06-12T00:04:00.000Z"
      }
    ],
    password_reset_tokens: [
      {
        id: "reset-1",
        user_id: "admin-temp",
        token_hash: "reset-token-secret",
        expires_at: "2026-06-22T00:00:00.000Z",
        used_at: null,
        created_at: "2026-06-21T00:00:00.000Z"
      }
    ],
    provisioning_batches: [
      {
        id: "batch-1",
        school_id: "school-a",
        status: "created",
        requested_by: "admin-1",
        totals: {
          schools: 1,
          classes: 1,
          teachers: 1,
          students: 2,
          errors: 0
        },
        row_result_ids: ["row-1"],
        created_at: "2026-06-12T00:00:00.000Z",
        updated_at: "2026-06-12T00:00:00.000Z"
      }
    ],
    school_memberships: [
      {
        id: "membership-1",
        school_id: "school-a",
        user_id: "student-1",
        role: "student",
        class_id: "class-a",
        created_at: "2026-06-12T00:00:00.000Z"
      },
      {
        id: "membership-temp",
        school_id: "school-a",
        user_id: "admin-temp",
        role: "admin",
        created_at: "2026-06-21T00:00:00.000Z"
      }
    ],
    schools: [
      {
        id: "school-a",
        code: "ALPHA",
        normalized_code: "ALPHA",
        name: "Alpha School",
        academic_year: "2026-2027",
        contact_name: "Private Contact",
        contact_email: "contact@alpha.example",
        created_by: "admin-1",
        created_at: "2026-06-12T00:00:00.000Z",
        updated_at: "2026-06-12T00:00:00.000Z"
      }
    ],
    student_profiles: [
      {
        user_id: "student-1",
        name: "Sensitive Student",
        grade: "S3",
        parent_invite_code: "INVITE-SECRET",
        avatar_image_data_url: "data:image/png;base64,SECRETIMAGE"
      },
      {
        user_id: "admin-temp",
        name: "Temporary Admin",
        grade: "S3"
      }
    ],
    teacher_classes: [
      {
        id: "class-a",
        teacher_id: "admin-1",
        school_id: "school-a",
        class_code: "S3A",
        name: "S3A Mathematics",
        grade: "S3",
        academic_year: "2026-2027",
        invite_code: "CLASS-INVITE-SECRET",
        created_at: "2026-06-12T00:00:00.000Z",
        updated_at: "2026-06-12T00:00:00.000Z"
      }
    ],
    user_settings: [
      {
        user_id: "student-1",
        language: "en",
        theme: "dark",
        selected_grade: "S3",
        updated_at: "2026-06-12T00:03:00.000Z"
      },
      {
        user_id: "admin-temp",
        language: "en",
        theme: "dark",
        selected_grade: "S3",
        updated_at: "2026-06-21T00:00:00.000Z"
      }
    ],
    users: [
      {
        id: "admin-1",
        username: "Primary Admin",
        normalized_username: "primary admin",
        email: "admin@example.test",
        normalized_email: "admin@example.test",
        password_hash: "hash-secret-admin",
        password_salt: "salt-secret-admin",
        school_id: "school-a",
        password_must_change: false,
        role: "admin",
        created_at: "2026-06-01T00:00:00.000Z"
      },
      {
        id: "student-1",
        username: "Sensitive Student",
        normalized_username: "sensitive student",
        email: "student@example.test",
        normalized_email: "student@example.test",
        password_hash: "hash-secret-student",
        password_salt: "salt-secret-student",
        school_id: "school-a",
        password_must_change: true,
        role: "student",
        created_at: "2026-06-12T00:01:00.000Z"
      },
      {
        id: "parent-1",
        username: "Sensitive Parent",
        normalized_username: "sensitive parent",
        password_hash: "hash-secret-parent",
        password_salt: "salt-secret-parent",
        role: "parent",
        created_at: "2026-06-12T00:02:00.000Z"
      },
      {
        id: "admin-temp",
        username: "Temporary Admin",
        normalized_username: "temporary admin",
        password_hash: "hash-secret-temp",
        password_salt: "salt-secret-temp",
        role: "admin",
        created_at: "2026-06-21T00:00:00.000Z"
      }
    ]
  };
}

function createTestStore(database: AuthAdminStoragePersistenceDatabase, options: Partial<Parameters<typeof createAuthAdminStoragePersistenceStore>[0]> = {}) {
  return createAuthAdminStoragePersistenceStore({
    configuredDbPath: "/var/mais/hk-math-db.sqlite",
    databaseDirectory: "/var/mais",
    databasePath: "/var/mais/hk-math-db.sqlite",
    getHotAuthReadinessSnapshot: async () => ({
      mode: "postgres-row-hot-path",
      readFlagEnv: "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
      readEnabled: false,
      shadowSyncOnPostgres: true,
      tables: [
        "auth_users",
        "auth_student_profiles",
        "auth_user_settings",
        "auth_password_reset_tokens"
      ],
      tablesReady: false,
      counts: null
    }),
    hotAuthDataLayerSummary: () => ({
      mode: "postgres-row-hot-path",
      readFlagEnv: "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
      readEnabled: false,
      shadowSyncOnPostgres: true,
      tables: [
        "auth_users",
        "auth_student_profiles",
        "auth_user_settings",
        "auth_password_reset_tokens"
      ]
    }),
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date(fixedNow),
    postgresUrlConfigured: false,
    readDatabase: async () => database,
    runPostgresHotAuthBackfill: async () => {
      throw new Error("backfill should not run without postgres readiness");
    },
    schemaVersion: 1,
    stateKind: "app-snapshot",
    stateRecordId: "primary",
    stateTenantId: "platform",
    storageProvider: "sqlite",
    verifyPostgresDatabase: async () => undefined,
    ...options
  });
}

test("auth admin storage persistence builds redacted tenant summaries without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/authAdminStoragePersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const snapshot = createTestStore(createDatabase()).buildRedactedAdminStorageSnapshot(createDatabase());

  assert.equal(snapshot.kind, "redacted-admin-storage-summary");
  assert.equal(snapshot.minimumPrivilege, true);
  assert.equal(snapshot.tableCounts.users, 4);
  assert.equal(snapshot.tableCounts.password_reset_tokens, 1);
  assert.deepEqual(snapshot.tenants.map((tenant) => tenant.tenantId), [
    "platform",
    "school:school-a"
  ]);
  assert.deepEqual(snapshot.database.users.find((user) => user.id === "student-1"), {
    id: "student-1",
    role: "student",
    tenantId: "school:school-a",
    schoolId: "school-a",
    createdAt: "2026-06-12T00:01:00.000Z",
    hasEmail: true,
    hasPasswordCredential: true,
    passwordMustChange: true,
    hasProfile: true,
    hasSettings: true
  });

  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes("password_hash"), false);
  assert.equal(serialized.includes("hash-secret"), false);
  assert.equal(serialized.includes("password_salt"), false);
  assert.equal(serialized.includes("salt-secret"), false);
  assert.equal(serialized.includes("token_hash"), false);
  assert.equal(serialized.includes("reset-token-secret"), false);
  assert.equal(serialized.includes("temporary_password"), false);
  assert.equal(serialized.includes("data:image"), false);
  assert.equal(serialized.includes("student@example.test"), false);
  assert.equal(serialized.includes("INVITE-SECRET"), false);
});

test("auth admin storage persistence exports snapshots for admins only", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const snapshot = await store.exportDatabaseSnapshotForAdmin("admin-1");

  assert.equal(snapshot?.generatedAt, fixedNow);
  assert.equal(snapshot?.schemaVersion, 1);
  assert.deepEqual(snapshot?.storage, {
    provider: "sqlite",
    path: "/var/mais/hk-math-db.sqlite"
  });
  assert.equal(await store.exportDatabaseSnapshotForAdmin("student-1"), null);
});

test("auth admin storage persistence reports readiness and hot-auth backfill gates", async () => {
  const database = createDatabase();
  const sqliteStore = createTestStore(database);

  assert.deepEqual(await sqliteStore.backfillPostgresHotAuthTablesForAdmin("admin-1"), {
    status: "not-postgres",
    provider: "sqlite"
  });
  assert.deepEqual(await sqliteStore.getStorageReadinessSnapshot(), {
    generatedAt: fixedNow,
    provider: "sqlite",
    status: "durable-ready",
    dataLayer: {
      mode: "tenant-tagged-json-snapshot",
      snapshotId: "primary",
      tenantId: "platform",
      stateKind: "app-snapshot",
      schemaVersion: 1,
      writeModel: "serialized-full-payload",
      revisioned: true,
      normalizedTenantTablesReady: false,
      hotAuthTables: {
        mode: "postgres-row-hot-path",
        readFlagEnv: "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
        readEnabled: false,
        shadowSyncOnPostgres: true,
        tables: [
          "auth_users",
          "auth_student_profiles",
          "auth_user_settings",
          "auth_password_reset_tokens"
        ]
      }
    },
    hotAuthTables: {
      mode: "postgres-row-hot-path",
      readFlagEnv: "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
      readEnabled: false,
      shadowSyncOnPostgres: true,
      tables: [
        "auth_users",
        "auth_student_profiles",
        "auth_user_settings",
        "auth_password_reset_tokens"
      ],
      tablesReady: false,
      counts: null
    },
    durableReady: true,
    configuredPath: true,
    runtime: "local",
    databasePath: "/var/mais/hk-math-db.sqlite",
    databaseDirectory: "/var/mais",
    usingTmpFallback: false,
    message: "HK_MATH_DB_PATH is configured; verify the mounted path is durable before real class use."
  });

  const missingUrlStore = createTestStore(database, {
    postgresUrlConfigured: false,
    storageProvider: "postgres"
  });
  assert.deepEqual(await missingUrlStore.backfillPostgresHotAuthTablesForAdmin("admin-1"), {
    status: "missing-postgres-url",
    provider: "postgres"
  });

  const postgresStore = createTestStore(database, {
    postgresUrlConfigured: true,
    runPostgresHotAuthBackfill: async (userId) => ({
      status: "backfilled",
      provider: "postgres",
      actorId: userId
    }),
    storageProvider: "postgres"
  });
  assert.deepEqual(await postgresStore.backfillPostgresHotAuthTablesForAdmin("admin-1"), {
    status: "backfilled",
    provider: "postgres",
    actorId: "admin-1"
  });
});

test("auth admin storage persistence owns hot-auth readiness summary helpers", async () => {
  const helpers = await import("@/lib/server/userStore/authAdminStoragePersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof helpers.buildAuthAdminStorageHotAuthDataLayerSummary, "function");
  assert.equal(typeof helpers.buildUnavailableAuthAdminStorageHotAuthReadinessSnapshot, "function");
  assert.equal(typeof helpers.authAdminStorageHotAuthSourceCounts, "function");

  const buildHotAuthSummary =
    helpers.buildAuthAdminStorageHotAuthDataLayerSummary as (input: { readEnabled: boolean; tables: readonly string[] }) => unknown;
  const unavailableSnapshot =
    helpers.buildUnavailableAuthAdminStorageHotAuthReadinessSnapshot as (summary: Record<string, unknown>) => unknown;
  const sourceCounts =
    helpers.authAdminStorageHotAuthSourceCounts as (database: {
      users: unknown[];
      student_profiles: unknown[];
      user_settings: unknown[];
      password_reset_tokens: unknown[];
    }) => unknown;

  const summary = buildHotAuthSummary({
    readEnabled: true,
    tables: [
      "auth_users",
      "auth_student_profiles"
    ]
  });

  assert.deepEqual(summary, {
    mode: "postgres-row-hot-path",
    readFlagEnv: "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
    readEnabled: true,
    shadowSyncOnPostgres: true,
    tables: [
      "auth_users",
      "auth_student_profiles"
    ]
  });
  assert.deepEqual(unavailableSnapshot(summary as Record<string, unknown>), {
    mode: "postgres-row-hot-path",
    readFlagEnv: "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
    readEnabled: true,
    shadowSyncOnPostgres: true,
    tables: [
      "auth_users",
      "auth_student_profiles"
    ],
    tablesReady: false,
    counts: null
  });
  assert.deepEqual(sourceCounts({
    users: [{ id: "user-1" }, { id: "user-2" }],
    student_profiles: [{ user_id: "user-1" }],
    user_settings: [],
    password_reset_tokens: [{ id: "reset-1" }, { id: "reset-2" }]
  }), {
    auth_users: 2,
    auth_student_profiles: 1,
    auth_user_settings: 0,
    auth_password_reset_tokens: 2
  });

  assert.match(rootSource, /buildAuthAdminStorageHotAuthDataLayerSummary as buildHotAuthDataLayerSummaryFromAuthAdminStoragePersistence/);
  assert.match(rootSource, /buildUnavailableAuthAdminStorageHotAuthReadinessSnapshot as unavailableHotAuthReadinessSnapshotFromAuthAdminStoragePersistence/);
  assert.match(rootSource, /authAdminStorageHotAuthSourceCounts as hotAuthSourceCountsFromAuthAdminStoragePersistence/);
  assert.doesNotMatch(rootSource, /function hotAuthDataLayerSummary\b/);
  assert.doesNotMatch(rootSource, /function unavailablePostgresHotAuthReadinessSnapshot\b/);
  assert.doesNotMatch(rootSource, /function hotAuthSourceCounts\b/);
  assert.doesNotMatch(rootSource, /const unavailablePostgresHotAuthReadinessSnapshot\b/);
  assert.doesNotMatch(rootSource, /const hotAuthSourceCounts\b/);
});

test("auth admin storage persistence owns hot-auth row grouping helper", async () => {
  const helpers = await import("@/lib/server/userStore/authAdminStoragePersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authAdminStoragePersistence.ts"), "utf8");

  const hotAuthRowsFromDatabase = helpers.authAdminStorageHotAuthRowsFromDatabase as
    | ((database: {
        users: unknown[];
        student_profiles: unknown[];
        user_settings: unknown[];
        password_reset_tokens: unknown[];
      }) => {
        users: unknown[];
        studentProfiles: unknown[];
        userSettings: unknown[];
        passwordResetTokens: unknown[];
      })
    | undefined;

  assert.equal(typeof hotAuthRowsFromDatabase, "function");
  assert.match(helperSource, /export function authAdminStorageHotAuthRowsFromDatabase\b/);
  assert.match(rootSource, /authAdminStorageHotAuthRowsFromDatabase as hotAuthRowsFromDatabaseFromAuthAdminStoragePersistence/);
  assert.doesNotMatch(rootSource, /function hotAuthRowsFromDatabase\b/);

  const database = {
    users: [{ id: "user-1" }],
    student_profiles: [{ user_id: "user-1" }],
    user_settings: [{ user_id: "user-1" }],
    password_reset_tokens: [{ id: "reset-1" }]
  };

  const rows = hotAuthRowsFromDatabase?.(database);
  assert.deepEqual(rows, {
    users: [{ id: "user-1" }],
    studentProfiles: [{ user_id: "user-1" }],
    userSettings: [{ user_id: "user-1" }],
    passwordResetTokens: [{ id: "reset-1" }]
  });
  assert.notEqual(rows?.users, database.users);
  assert.notEqual(rows?.studentProfiles, database.student_profiles);
  assert.notEqual(rows?.userSettings, database.user_settings);
  assert.notEqual(rows?.passwordResetTokens, database.password_reset_tokens);
  assert.equal(rows?.users[0], database.users[0]);
});

test("auth admin storage persistence owns hot-auth table row serializers", async () => {
  const helpers = await import("@/lib/server/userStore/authAdminStoragePersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authAdminStoragePersistence.ts"), "utf8");

  const userRows = helpers.authAdminStorageHotAuthUserRows as
    | ((users: Array<Record<string, unknown>>) => Array<Record<string, unknown>>)
    | undefined;
  const profileRows = helpers.authAdminStorageHotAuthStudentProfileRows as
    | ((profiles: Array<Record<string, unknown>>) => Array<Record<string, unknown>>)
    | undefined;
  const settingRows = helpers.authAdminStorageHotAuthUserSettingRows as
    | ((settings: Array<Record<string, unknown>>) => Array<Record<string, unknown>>)
    | undefined;
  const resetTokenRows = helpers.authAdminStorageHotAuthPasswordResetTokenRows as
    | ((tokens: Array<Record<string, unknown>>) => Array<Record<string, unknown>>)
    | undefined;

  assert.equal(typeof userRows, "function");
  assert.equal(typeof profileRows, "function");
  assert.equal(typeof settingRows, "function");
  assert.equal(typeof resetTokenRows, "function");
  assert.match(helperSource, /export function authAdminStorageHotAuthUserRows\b/);
  assert.match(helperSource, /export function authAdminStorageHotAuthStudentProfileRows\b/);
  assert.match(helperSource, /export function authAdminStorageHotAuthUserSettingRows\b/);
  assert.match(helperSource, /export function authAdminStorageHotAuthPasswordResetTokenRows\b/);
  assert.match(rootSource, /authAdminStorageHotAuthUserRows as hotAuthUserRowsFromAuthAdminStoragePersistence/);
  assert.match(rootSource, /authAdminStorageHotAuthStudentProfileRows as hotAuthStudentProfileRowsFromAuthAdminStoragePersistence/);
  assert.match(rootSource, /authAdminStorageHotAuthUserSettingRows as hotAuthUserSettingRowsFromAuthAdminStoragePersistence/);
  assert.match(rootSource, /authAdminStorageHotAuthPasswordResetTokenRows as hotAuthPasswordResetTokenRowsFromAuthAdminStoragePersistence/);
  assert.doesNotMatch(rootSource, /function hotAuthUserRows\b/);
  assert.doesNotMatch(rootSource, /function hotAuthStudentProfileRows\b/);
  assert.doesNotMatch(rootSource, /function hotAuthUserSettingRows\b/);
  assert.doesNotMatch(rootSource, /function hotAuthPasswordResetTokenRows\b/);

  assert.deepEqual(userRows?.([
    {
      id: "student-1",
      username: "Ada",
      normalized_username: "ada",
      password_hash: "hash",
      password_salt: "salt",
      role: "student",
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ]), [
    {
      id: "student-1",
      username: "Ada",
      normalized_username: "ada",
      email: null,
      normalized_email: null,
      password_hash: "hash",
      password_salt: "salt",
      school_id: null,
      password_must_change: false,
      session_revision: 1,
      disabled_at: null,
      role: "student",
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
  assert.deepEqual(profileRows?.([
    {
      user_id: "student-1",
      name: "Ada",
      grade: "S3",
      curriculum_track: "HK",
      curriculum_region: "HK",
      textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
      parent_invite_code: `MAIS-${"A".repeat(24)}`
    }
  ]), [
    {
      user_id: "student-1",
      name: "Ada",
      grade: "S3",
      curriculum_track: "HK",
      curriculum_region: "HK",
      textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
      parent_invite_code: "",
      avatar_id: null,
      avatar_image_data_url: null,
      avatar_media_object_key: null
    }
  ]);
  assert.deepEqual(settingRows?.([
    {
      user_id: "student-1",
      language: "zh-Hans",
      theme: "light",
      selected_grade: "S3",
      updated_at: "2026-06-20T10:05:00.000Z"
    }
  ]), [
    {
      user_id: "student-1",
      language: "zh-Hans",
      theme: "light",
      selected_grade: "S3",
      updated_at: "2026-06-20T10:05:00.000Z"
    }
  ]);
  assert.deepEqual(resetTokenRows?.([
    {
      id: "reset-1",
      user_id: "student-1",
      token_hash: "hash",
      expires_at: "2026-06-20T10:30:00.000Z",
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ]), [
    {
      id: "reset-1",
      user_id: "student-1",
      token_hash: "hash",
      expires_at: "2026-06-20T10:30:00.000Z",
      used_at: null,
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
});

test("auth admin storage persistence cleans temporary bootstrap admins with confirmation gates", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  assert.deepEqual(await store.cleanupTemporaryBootstrapAdminsForAdmin("student-1"), {
    status: "forbidden"
  });
  assert.deepEqual(await store.cleanupTemporaryBootstrapAdminsForAdmin("admin-temp", {
    confirm: "delete-temporary-bootstrap-admins",
    dryRun: false
  }), {
    status: "self-removal-requires-confirmation",
    cutoff: "2026-06-06T09:00:00.000Z",
    matchedCount: 1,
    selfMatched: true
  });

  const dryRun = await store.cleanupTemporaryBootstrapAdminsForAdmin("admin-1");
  assert.deepEqual(dryRun, {
    status: "dry-run",
    cutoff: "2026-06-06T09:00:00.000Z",
    matchedCount: 1,
    selfMatched: false
  });

  const cleaned = await store.cleanupTemporaryBootstrapAdminsForAdmin("admin-1", {
    confirm: "delete-temporary-bootstrap-admins",
    dryRun: false
  });
  assert.deepEqual(cleaned, {
    status: "cleaned",
    cutoff: "2026-06-06T09:00:00.000Z",
    matchedCount: 1,
    selfMatched: false,
    removed: {
      users: 1,
      studentProfiles: 1,
      userSettings: 1,
      schoolMemberships: 1,
      passwordResetTokens: 1
    }
  });
  assert.equal(database.users.some((user) => user.id === "admin-temp"), false);
});

test("legacy userStore delegates admin storage operations to extracted auth admin storage persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /createAuthAdminStoragePersistenceStore\(/);
  assert.match(source, /export const buildRedactedAdminStorageSnapshot = authUserStore\.buildRedactedAdminStorageSnapshot;/);
  assert.match(source, /export const exportDatabaseSnapshotForAdmin = authUserStore\.exportDatabaseSnapshotForAdmin;/);
  assert.match(source, /export const backfillPostgresHotAuthTablesForAdmin = authUserStore\.backfillPostgresHotAuthTablesForAdmin;/);
  assert.match(source, /export const cleanupTemporaryBootstrapAdminsForAdmin = authUserStore\.cleanupTemporaryBootstrapAdminsForAdmin;/);
  assert.match(source, /export const getStorageReadinessSnapshot = authUserStore\.getStorageReadinessSnapshot;/);
});
