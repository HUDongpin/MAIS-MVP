import type {
  CurriculumRegion,
  CurriculumTrack,
  GradeId,
  GuardianLinkStatus,
  Language,
  ProvisioningBatchStatus,
  ProvisioningRowAction,
  ProvisioningRowStatus,
  ProvisioningRowType,
  ProvisioningTotals,
  SchoolMembershipRole,
  StudentAvatarId,
  TextbookPublisher,
  ThemeMode
} from "@/types";
import { authDisabledAt, authSessionRevision } from "./authSessionPersistence";

type AuthAdminStorageUserRole = "student" | "teacher" | "parent" | "admin";
type AuthAdminStorageProvider = "sqlite" | "postgres";

type AuthAdminStorageUserRecord = {
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
  role: AuthAdminStorageUserRole;
  created_at: string;
};

type AuthAdminStorageStudentProfileRecord = {
  user_id: string;
  name: string;
  grade: GradeId;
  curriculum_track?: CurriculumTrack | null;
  curriculum_region?: CurriculumRegion | null;
  textbook_publisher?: TextbookPublisher | null;
  parent_invite_code?: string;
  avatar_id?: StudentAvatarId | string;
  avatar_image_data_url?: string;
  avatar_media_object_key?: string;
};

type AuthAdminStorageUserSettingsRecord = {
  user_id: string;
  language: Language;
  theme: ThemeMode;
  selected_grade: GradeId;
  updated_at: string;
};

type AuthAdminStorageGuardianLinkRecord = {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  status: GuardianLinkStatus;
  invite_code?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

type AuthAdminStorageSchoolRecord = {
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

type AuthAdminStorageSchoolMembershipRecord = {
  id: string;
  school_id: string;
  user_id: string;
  role: SchoolMembershipRole;
  class_id?: string;
  created_at: string;
};

type AuthAdminStorageTeacherClassRecord = {
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

type AuthAdminStoragePasswordResetTokenRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type AuthAdminStorageProvisioningBatchRecord = {
  id: string;
  school_id: string;
  status: ProvisioningBatchStatus;
  requested_by: string;
  totals: ProvisioningTotals;
  row_result_ids: string[];
  created_at: string;
  updated_at: string;
};

type AuthAdminStorageProvisioningRowResultRecord = {
  id: string;
  batch_id?: string;
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

export type AuthAdminStoragePersistenceDatabase = {
  guardian_links: AuthAdminStorageGuardianLinkRecord[];
  password_reset_tokens: AuthAdminStoragePasswordResetTokenRecord[];
  provisioning_batches: AuthAdminStorageProvisioningBatchRecord[];
  provisioning_row_results?: AuthAdminStorageProvisioningRowResultRecord[];
  school_memberships: AuthAdminStorageSchoolMembershipRecord[];
  schools: AuthAdminStorageSchoolRecord[];
  student_profiles: AuthAdminStorageStudentProfileRecord[];
  teacher_classes: AuthAdminStorageTeacherClassRecord[];
  user_settings: AuthAdminStorageUserSettingsRecord[];
  users: AuthAdminStorageUserRecord[];
} & Record<string, unknown>;

export type AuthAdminStorageExportSource = Partial<AuthAdminStoragePersistenceDatabase>;

export type AuthAdminStorageExportUserSummary = {
  id: string;
  role: AuthAdminStorageUserRole;
  tenantId: string;
  schoolId?: string;
  createdAt: string;
  hasEmail: boolean;
  hasPasswordCredential: boolean;
  passwordMustChange: boolean;
  hasProfile: boolean;
  hasSettings: boolean;
};

export type AuthAdminStorageExportTenantSummary = {
  tenantId: string;
  tenantType: "platform" | "school";
  label: string;
  schoolId?: string;
  schoolCode?: string;
  schoolName?: string;
  academicYear?: string;
  userCounts: {
    total: number;
    students: number;
    teachers: number;
    parents: number;
    admins: number;
  };
  classCount: number;
  membershipCount: number;
  provisioningBatchCount: number;
};

export type AuthAdminStorageHotAuthCounts = {
  auth_users: number;
  auth_student_profiles: number;
  auth_user_settings: number;
  auth_password_reset_tokens: number;
};

export type AuthAdminStorageHotAuthSummary = {
  mode: "postgres-row-hot-path";
  readFlagEnv: "HK_MATH_POSTGRES_HOT_AUTH_TABLES";
  readEnabled: boolean;
  shadowSyncOnPostgres: boolean;
  tables: readonly string[];
};

export type AuthAdminStorageHotAuthReadinessSnapshot = AuthAdminStorageHotAuthSummary & {
  tablesReady: boolean;
  counts: AuthAdminStorageHotAuthCounts | null;
};

type AuthAdminStorageHotAuthBackfillResult =
  | { status: "not-postgres"; provider: "sqlite" }
  | { status: "missing-postgres-url"; provider: "postgres" }
  | { status: "postgres-unavailable"; provider: "postgres" }
  | { status: "forbidden"; provider: "postgres" }
  | ({ status: "backfilled"; provider: "postgres" } & Record<string, unknown>);

type AuthAdminStorageCleanupInput = {
  allowSelfRemoval?: boolean;
  confirm?: string;
  createdAfter?: string;
  dryRun?: boolean;
};

export type AuthAdminStoragePersistenceStoreDependencies = {
  configuredDbPath: string | null;
  databaseDirectory: string;
  databasePath: string;
  getHotAuthReadinessSnapshot: () => Promise<AuthAdminStorageHotAuthReadinessSnapshot>;
  hotAuthDataLayerSummary: () => AuthAdminStorageHotAuthSummary;
  isVercelRuntime?: () => boolean;
  mutateDatabase: <T>(
    mutator: (database: AuthAdminStoragePersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  now?: () => Date;
  postgresUrlConfigured: boolean;
  readDatabase: () => Promise<AuthAdminStoragePersistenceDatabase>;
  runPostgresHotAuthBackfill: (userId: string) => Promise<AuthAdminStorageHotAuthBackfillResult>;
  schemaVersion: number;
  stateKind: string;
  stateRecordId: string;
  stateTenantId: string;
  storageProvider: AuthAdminStorageProvider;
  verifyPostgresMetadataReadiness: () => Promise<void>;
};

export type AuthAdminStoragePersistenceStore = ReturnType<typeof createAuthAdminStoragePersistenceStore>;

export function buildAuthAdminStorageHotAuthDataLayerSummary({
  readEnabled,
  tables
}: {
  readEnabled: boolean;
  tables: readonly string[];
}): AuthAdminStorageHotAuthSummary {
  return {
    mode: "postgres-row-hot-path",
    readFlagEnv: "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
    readEnabled,
    shadowSyncOnPostgres: true,
    tables: [...tables]
  };
}

export function buildUnavailableAuthAdminStorageHotAuthReadinessSnapshot(
  summary: AuthAdminStorageHotAuthSummary
): AuthAdminStorageHotAuthReadinessSnapshot {
  return {
    ...summary,
    tablesReady: false,
    counts: null
  };
}

export function authAdminStorageHotAuthSourceCounts(database: Pick<
  AuthAdminStoragePersistenceDatabase,
  "users" | "student_profiles" | "user_settings" | "password_reset_tokens"
>): AuthAdminStorageHotAuthCounts {
  return {
    auth_users: database.users.length,
    auth_student_profiles: database.student_profiles.length,
    auth_user_settings: database.user_settings.length,
    auth_password_reset_tokens: database.password_reset_tokens.length
  };
}

export function authAdminStorageHotAuthUserRows(users: AuthAdminStorageUserRecord[]) {
  return users.map((user) => ({
    id: user.id,
    username: user.username,
    normalized_username: user.normalized_username,
    email: user.email ?? null,
    normalized_email: user.normalized_email ?? null,
    password_hash: user.password_hash,
    password_salt: user.password_salt,
    school_id: user.school_id ?? null,
    password_must_change: user.password_must_change ?? false,
    session_revision: authSessionRevision(user),
    disabled_at: authDisabledAt(user),
    role: user.role,
    created_at: user.created_at
  }));
}

export function authAdminStorageHotAuthStudentProfileRows(profiles: AuthAdminStorageStudentProfileRecord[]) {
  return profiles.map((profile) => ({
    user_id: profile.user_id,
    name: profile.name,
    grade: profile.grade,
    curriculum_track: profile.curriculum_track ?? null,
    curriculum_region: profile.curriculum_region ?? null,
    textbook_publisher: profile.textbook_publisher ?? null,
    parent_invite_code: "",
    avatar_id: profile.avatar_id ?? null,
    avatar_image_data_url: profile.avatar_image_data_url ?? null,
    avatar_media_object_key: profile.avatar_media_object_key ?? null
  }));
}

export function authAdminStorageHotAuthUserSettingRows(settings: AuthAdminStorageUserSettingsRecord[]) {
  return settings.map((setting) => ({
    user_id: setting.user_id,
    language: setting.language,
    theme: setting.theme,
    selected_grade: setting.selected_grade,
    updated_at: setting.updated_at
  }));
}

export function authAdminStorageHotAuthPasswordResetTokenRows(tokens: AuthAdminStoragePasswordResetTokenRecord[]) {
  return tokens.map((token) => ({
    id: token.id,
    user_id: token.user_id,
    token_hash: token.token_hash,
    expires_at: token.expires_at,
    used_at: token.used_at ?? null,
    created_at: token.created_at
  }));
}

export type AuthAdminStorageHotAuthRows<
  UserRecord,
  StudentProfileRecord,
  UserSettingsRecord,
  PasswordResetTokenRecord
> = {
  users: UserRecord[];
  studentProfiles: StudentProfileRecord[];
  userSettings: UserSettingsRecord[];
  passwordResetTokens: PasswordResetTokenRecord[];
};

export function authAdminStorageHotAuthRowsFromDatabase<
  UserRecord,
  StudentProfileRecord,
  UserSettingsRecord,
  PasswordResetTokenRecord
>(database: {
  users: UserRecord[];
  student_profiles: StudentProfileRecord[];
  user_settings: UserSettingsRecord[];
  password_reset_tokens: PasswordResetTokenRecord[];
}): AuthAdminStorageHotAuthRows<UserRecord, StudentProfileRecord, UserSettingsRecord, PasswordResetTokenRecord> {
  return {
    users: [...database.users],
    studentProfiles: [...database.student_profiles],
    userSettings: [...database.user_settings],
    passwordResetTokens: [...database.password_reset_tokens]
  };
}

const adminStorageExportOmittedTables = [
  "password_reset_tokens",
  "provisioning_row_results",
  "ai_tutor_messages",
  "nova_lens_runs",
  "classroom_work_samples",
  "questions",
  "lesson_blocks"
];

const temporaryBootstrapAdminCleanupConfirmation = "delete-temporary-bootstrap-admins";
const temporaryBootstrapAdminDefaultCreatedAfter = "2026-06-06T09:00:00.000Z";

function databaseArray<T>(database: AuthAdminStorageExportSource, key: string) {
  const value = database[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

function tableCountsForAdminExport(database: AuthAdminStorageExportSource) {
  return Object.fromEntries(
    Object.entries(database)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => [key, (value as unknown[]).length])
      .sort(([left], [right]) => String(left).localeCompare(String(right)))
  ) as Record<string, number>;
}

function emptyTenantUserCounts(): AuthAdminStorageExportTenantSummary["userCounts"] {
  return {
    total: 0,
    students: 0,
    teachers: 0,
    parents: 0,
    admins: 0
  };
}

function validCleanupCutoff(value?: string) {
  const requested = value?.trim() || temporaryBootstrapAdminDefaultCreatedAfter;
  const timestamp = Date.parse(requested);
  if (!Number.isFinite(timestamp)) return null;
  if (timestamp < Date.parse(temporaryBootstrapAdminDefaultCreatedAfter)) return null;
  return new Date(timestamp).toISOString();
}

function isTemporaryBootstrapAdminCandidate(user: AuthAdminStorageUserRecord, cutoffIso: string) {
  const createdAt = Date.parse(user.created_at);
  return (
    user.role === "admin" &&
    user.id.startsWith("admin-") &&
    Number.isFinite(createdAt) &&
    createdAt >= Date.parse(cutoffIso)
  );
}

export function createAuthAdminStoragePersistenceStore({
  configuredDbPath,
  databaseDirectory,
  databasePath,
  getHotAuthReadinessSnapshot,
  hotAuthDataLayerSummary,
  isVercelRuntime = () => Boolean(process.env.VERCEL || process.env.VERCEL_ENV),
  mutateDatabase,
  now = () => new Date(),
  postgresUrlConfigured,
  readDatabase,
  runPostgresHotAuthBackfill,
  schemaVersion,
  stateKind,
  stateRecordId,
  stateTenantId,
  storageProvider,
  verifyPostgresMetadataReadiness
}: AuthAdminStoragePersistenceStoreDependencies) {
  const tenantIdForSchool = (schoolId?: string | null) => schoolId ? `school:${schoolId}` : stateTenantId;

  const userTenantIdsForAdminExport = (database: AuthAdminStorageExportSource) => {
    const users = databaseArray<AuthAdminStorageUserRecord>(database, "users");
    const memberships = databaseArray<AuthAdminStorageSchoolMembershipRecord>(database, "school_memberships");
    const guardianLinks = databaseArray<AuthAdminStorageGuardianLinkRecord>(database, "guardian_links");
    const tenantByUserId = new Map<string, string>();

    users.forEach((user) => {
      const membership = memberships.find((candidate) => candidate.user_id === user.id && candidate.school_id);
      tenantByUserId.set(user.id, tenantIdForSchool(user.school_id ?? membership?.school_id));
    });

    guardianLinks.forEach((link) => {
      if (tenantByUserId.get(link.parent_id) !== stateTenantId) return;
      const studentTenantId = tenantByUserId.get(link.student_id);
      if (studentTenantId && studentTenantId !== stateTenantId) {
        tenantByUserId.set(link.parent_id, studentTenantId);
      }
    });

    return tenantByUserId;
  };

  const ensureTenantSummary = (
    summaries: Map<string, AuthAdminStorageExportTenantSummary>,
    tenantId: string,
    patch: Partial<AuthAdminStorageExportTenantSummary> = {}
  ) => {
    const existing = summaries.get(tenantId);
    if (existing) {
      Object.assign(existing, patch);
      return existing;
    }

    const summary: AuthAdminStorageExportTenantSummary = {
      tenantId,
      tenantType: tenantId === stateTenantId ? "platform" : "school",
      label: tenantId === stateTenantId ? "Platform / unassigned" : patch.label ?? tenantId,
      userCounts: emptyTenantUserCounts(),
      classCount: 0,
      membershipCount: 0,
      provisioningBatchCount: 0,
      ...patch
    };
    summaries.set(tenantId, summary);
    return summary;
  };

  const buildAdminTenantSummaries = (
    database: AuthAdminStorageExportSource,
    tenantByUserId: Map<string, string>
  ) => {
    const summaries = new Map<string, AuthAdminStorageExportTenantSummary>();
    ensureTenantSummary(summaries, stateTenantId);

    databaseArray<AuthAdminStorageSchoolRecord>(database, "schools").forEach((school) => {
      ensureTenantSummary(summaries, tenantIdForSchool(school.id), {
        tenantType: "school",
        label: school.code ? `${school.code} - ${school.name}` : school.name,
        schoolId: school.id,
        schoolCode: school.code,
        schoolName: school.name,
        academicYear: school.academic_year
      });
    });

    databaseArray<AuthAdminStorageUserRecord>(database, "users").forEach((user) => {
      const tenant = ensureTenantSummary(summaries, tenantByUserId.get(user.id) ?? stateTenantId, {
        ...(user.school_id ? { schoolId: user.school_id } : {})
      });
      tenant.userCounts.total += 1;
      if (user.role === "student") tenant.userCounts.students += 1;
      if (user.role === "teacher") tenant.userCounts.teachers += 1;
      if (user.role === "parent") tenant.userCounts.parents += 1;
      if (user.role === "admin") tenant.userCounts.admins += 1;
    });

    databaseArray<AuthAdminStorageTeacherClassRecord>(database, "teacher_classes").forEach((teacherClass) => {
      const tenant = ensureTenantSummary(
        summaries,
        teacherClass.school_id ? tenantIdForSchool(teacherClass.school_id) : tenantByUserId.get(teacherClass.teacher_id) ?? stateTenantId
      );
      tenant.classCount += 1;
    });

    databaseArray<AuthAdminStorageSchoolMembershipRecord>(database, "school_memberships").forEach((membership) => {
      const tenant = ensureTenantSummary(summaries, tenantIdForSchool(membership.school_id), {
        schoolId: membership.school_id
      });
      tenant.membershipCount += 1;
    });

    databaseArray<AuthAdminStorageProvisioningBatchRecord>(database, "provisioning_batches").forEach((batch) => {
      const tenant = ensureTenantSummary(summaries, tenantIdForSchool(batch.school_id), {
        schoolId: batch.school_id
      });
      tenant.provisioningBatchCount += 1;
    });

    return Array.from(summaries.values()).sort((left, right) => {
      if (left.tenantId === stateTenantId) return -1;
      if (right.tenantId === stateTenantId) return 1;
      return (left.schoolCode ?? left.tenantId).localeCompare(right.schoolCode ?? right.tenantId);
    });
  };

  const appStateDataLayerSummary = () => ({
    mode: "tenant-tagged-json-snapshot" as const,
    snapshotId: stateRecordId,
    tenantId: stateTenantId,
    stateKind,
    schemaVersion,
    writeModel: "serialized-full-payload" as const,
    revisioned: true,
    normalizedTenantTablesReady: false,
    hotAuthTables: hotAuthDataLayerSummary()
  });

  const unavailablePostgresHotAuthReadinessSnapshot = (): AuthAdminStorageHotAuthReadinessSnapshot => ({
    ...hotAuthDataLayerSummary(),
    tablesReady: false,
    counts: null
  });

  const buildRedactedAdminStorageSnapshot = (database: AuthAdminStorageExportSource) => {
    const tenantByUserId = userTenantIdsForAdminExport(database);
    const profileUserIds = new Set(
      databaseArray<AuthAdminStorageStudentProfileRecord>(database, "student_profiles").map((profile) => profile.user_id)
    );
    const settingsUserIds = new Set(
      databaseArray<AuthAdminStorageUserSettingsRecord>(database, "user_settings").map((settings) => settings.user_id)
    );
    const tableCounts = tableCountsForAdminExport(database);
    const tenants = buildAdminTenantSummaries(database, tenantByUserId);
    const users: AuthAdminStorageExportUserSummary[] = databaseArray<AuthAdminStorageUserRecord>(database, "users")
      .map((user) => ({
        id: user.id,
        role: user.role,
        tenantId: tenantByUserId.get(user.id) ?? stateTenantId,
        ...(user.school_id ? { schoolId: user.school_id } : {}),
        createdAt: user.created_at,
        hasEmail: Boolean(user.email || user.normalized_email),
        hasPasswordCredential: Boolean(user.password_hash && user.password_salt),
        passwordMustChange: user.password_must_change ?? false,
        hasProfile: profileUserIds.has(user.id),
        hasSettings: settingsUserIds.has(user.id)
      }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));

    return {
      kind: "redacted-admin-storage-summary" as const,
      minimumPrivilege: true,
      dataLayer: appStateDataLayerSummary(),
      tableCounts,
      tenants,
      database: {
        shape: "redacted-summary" as const,
        users,
        tenants,
        tableCounts,
        omittedTables: adminStorageExportOmittedTables
      },
      redaction: {
        credentials: "omitted" as const,
        resetTokens: "omitted" as const,
        oneTimeProvisioningSecrets: "omitted" as const,
        rawLearnerContent: "omitted" as const,
        mediaPayloads: "omitted" as const,
        questionAnswers: "omitted" as const
      }
    };
  };

  return {
    buildRedactedAdminStorageSnapshot,

    exportDatabaseSnapshotForAdmin: async (userId: string) => {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (user?.role !== "admin") return null;

      const redactedSnapshot = buildRedactedAdminStorageSnapshot(database);

      return {
        generatedAt: now().toISOString(),
        schemaVersion,
        ...redactedSnapshot,
        storage: storageProvider === "postgres"
          ? {
              provider: "postgres" as const,
              target: "POSTGRES_URL",
              path: "postgres://[redacted]"
            }
          : {
              provider: "sqlite" as const,
              path: databasePath
            }
      };
    },

    backfillPostgresHotAuthTablesForAdmin: async (userId: string): Promise<AuthAdminStorageHotAuthBackfillResult> => {
      if (storageProvider !== "postgres") {
        return {
          status: "not-postgres",
          provider: storageProvider
        };
      }

      if (!postgresUrlConfigured) {
        return {
          status: "missing-postgres-url",
          provider: "postgres"
        };
      }

      return runPostgresHotAuthBackfill(userId);
    },

    cleanupTemporaryBootstrapAdminsForAdmin: async (
      adminId: string,
      input: AuthAdminStorageCleanupInput = {}
    ) => {
      const cutoffIso = validCleanupCutoff(input.createdAfter);
      if (!cutoffIso) return { status: "invalid-cutoff" as const };

      const dryRun = input.dryRun !== false || input.confirm !== temporaryBootstrapAdminCleanupConfirmation;
      if (dryRun) {
        const database = await readDatabase();
        const actor = database.users.find((candidate) => candidate.id === adminId);
        if (actor?.role !== "admin") return { status: "forbidden" as const };

        const candidates = database.users.filter((user) => isTemporaryBootstrapAdminCandidate(user, cutoffIso));
        const candidateIds = new Set(candidates.map((user) => user.id));
        return {
          status: "dry-run" as const,
          cutoff: cutoffIso,
          matchedCount: candidates.length,
          selfMatched: candidateIds.has(adminId)
        };
      }

      return mutateDatabase((database) => {
        const actor = database.users.find((candidate) => candidate.id === adminId);
        if (actor?.role !== "admin") return { status: "forbidden" as const };

        const candidates = database.users.filter((user) => isTemporaryBootstrapAdminCandidate(user, cutoffIso));
        const candidateIds = new Set(candidates.map((user) => user.id));
        const selfMatched = candidateIds.has(adminId);

        if (selfMatched && !input.allowSelfRemoval) {
          return {
            status: "self-removal-requires-confirmation" as const,
            cutoff: cutoffIso,
            matchedCount: candidates.length,
            selfMatched
          };
        }

        const before = {
          users: database.users.length,
          studentProfiles: database.student_profiles.length,
          userSettings: database.user_settings.length,
          schoolMemberships: database.school_memberships.length,
          passwordResetTokens: database.password_reset_tokens.length
        };

        database.users = database.users.filter((user) => !candidateIds.has(user.id));
        database.student_profiles = database.student_profiles.filter((profile) => !candidateIds.has(profile.user_id));
        database.user_settings = database.user_settings.filter((settings) => !candidateIds.has(settings.user_id));
        database.school_memberships = database.school_memberships.filter((membership) => !candidateIds.has(membership.user_id));
        database.password_reset_tokens = database.password_reset_tokens.filter((token) => !candidateIds.has(token.user_id));

        return {
          status: "cleaned" as const,
          cutoff: cutoffIso,
          matchedCount: candidates.length,
          selfMatched,
          removed: {
            users: before.users - database.users.length,
            studentProfiles: before.studentProfiles - database.student_profiles.length,
            userSettings: before.userSettings - database.user_settings.length,
            schoolMemberships: before.schoolMemberships - database.school_memberships.length,
            passwordResetTokens: before.passwordResetTokens - database.password_reset_tokens.length
          }
        };
      });
    },

    getStorageReadinessSnapshot: async () => {
      const runtime = isVercelRuntime() ? "vercel" : "local";
      if (storageProvider === "postgres") {
        if (!postgresUrlConfigured) {
          const hotAuthTables = unavailablePostgresHotAuthReadinessSnapshot();
          return {
            generatedAt: now().toISOString(),
            provider: "postgres" as const,
            status: "missing-postgres-url",
            dataLayer: appStateDataLayerSummary(),
            hotAuthTables,
            durableReady: false,
            configuredPath: false,
            configuredUrl: false,
            runtime,
            databasePath: "postgres://[redacted]",
            databaseDirectory: "postgres://[redacted]",
            usingTmpFallback: false,
            message: "HK_MATH_STORAGE_PROVIDER=postgres requires POSTGRES_URL before storage can be durable-ready."
          };
        }

        try {
          await verifyPostgresMetadataReadiness();
        } catch {
          const hotAuthTables = unavailablePostgresHotAuthReadinessSnapshot();
          return {
            generatedAt: now().toISOString(),
            provider: "postgres" as const,
            status: "postgres-unavailable",
            dataLayer: appStateDataLayerSummary(),
            hotAuthTables,
            durableReady: false,
            configuredPath: true,
            configuredUrl: true,
            runtime,
            databasePath: "postgres://[redacted]",
            databaseDirectory: "postgres://[redacted]",
            usingTmpFallback: false,
            message: "POSTGRES_URL is configured, but the app could not verify the Postgres app_state table."
          };
        }

        const hotAuthTables = await getHotAuthReadinessSnapshot();
        return {
          generatedAt: now().toISOString(),
          provider: "postgres" as const,
          status: "durable-ready",
          dataLayer: appStateDataLayerSummary(),
          hotAuthTables,
          durableReady: true,
          configuredPath: true,
          configuredUrl: true,
          runtime,
          databasePath: "postgres://[redacted]",
          databaseDirectory: "postgres://[redacted]",
          usingTmpFallback: false,
          message: "HK_MATH_STORAGE_PROVIDER=postgres and POSTGRES_URL are configured for durable shared production state."
        };
      }

      const status = configuredDbPath ? "durable-ready" : "demo-only";
      const hotAuthTables = unavailablePostgresHotAuthReadinessSnapshot();
      return {
        generatedAt: now().toISOString(),
        provider: "sqlite" as const,
        status,
        dataLayer: appStateDataLayerSummary(),
        hotAuthTables,
        durableReady: status === "durable-ready",
        configuredPath: Boolean(configuredDbPath),
        runtime,
        databasePath,
        databaseDirectory,
        usingTmpFallback: !configuredDbPath && runtime === "vercel",
        message:
          status === "durable-ready"
            ? "HK_MATH_DB_PATH is configured; verify the mounted path is durable before real class use."
            : "No HK_MATH_DB_PATH is configured. Treat this environment as demo-only for student/class records."
      };
    }
  };
}
