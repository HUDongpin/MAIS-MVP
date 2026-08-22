import assert from "node:assert/strict";
import { createHash, pbkdf2Sync, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createSessionToken, verifySessionToken } from "@/lib/session";
import {
  type AuthDemoAccountSeed,
  type AuthLoginResult,
  createAuthSessionPersistenceStore,
  type AuthSession,
  type AuthSessionPersistenceDatabase
} from "@/lib/server/userStore/authSessionPersistence";

const generatedAt = new Date("2026-06-20T10:00:00.000Z");

type AuthHotTableHelperModule = {
  authCurriculumProfileFromRecord?: (record?: {
    curriculum_track?: unknown;
    curriculum_region?: unknown;
    textbook_publisher?: unknown;
  } | null) => AuthSession["user"]["curriculumProfile"];
  authStudentProfileFor?: <TProfile extends { user_id: string }>(
    database: { student_profiles?: TProfile[] },
    userId: string
  ) => TProfile | undefined;
  authCurriculumProfileForUser?: (
    database: {
      student_profiles?: Array<{
        user_id: string;
        curriculum_track?: unknown;
        curriculum_region?: unknown;
        textbook_publisher?: unknown;
      }>;
    },
    userId?: string | null
  ) => AuthSession["user"]["curriculumProfile"];
  authCurriculumProfileForClass?: (
    database: {
      student_profiles?: Array<{
        user_id: string;
        curriculum_track?: unknown;
        curriculum_region?: unknown;
        textbook_publisher?: unknown;
      }>;
    },
    teacherClass: { teacher_id?: string | null }
  ) => AuthSession["user"]["curriculumProfile"];
  authenticatedUserForAuthHotRows?: (input: {
    hotRows: {
      users: AuthSessionPersistenceDatabase["users"];
      studentProfiles: AuthSessionPersistenceDatabase["student_profiles"];
      userSettings: AuthSessionPersistenceDatabase["user_settings"];
    };
    username: string;
    password: string;
    now?: Date;
  }) => AuthLoginResult;
  overlayAuthSessionDatabaseWithHotAuthRows?: (
    database: Partial<AuthSessionPersistenceDatabase>,
    hotRows: {
      users: AuthSessionPersistenceDatabase["users"];
      studentProfiles: AuthSessionPersistenceDatabase["student_profiles"];
      userSettings: AuthSessionPersistenceDatabase["user_settings"];
      passwordResetTokens?: NonNullable<AuthSessionPersistenceDatabase["password_reset_tokens"]>;
    }
  ) => Partial<AuthSessionPersistenceDatabase>;
  createAuthSessionHotTableTestHooks?: (options?: {
    mediaObjectUrlForKey?: (objectKey: string) => string | null | undefined;
    now?: Date;
    passwordMatches?: (
      password: string,
      user: AuthSessionPersistenceDatabase["users"][number]
    ) => boolean;
  }) => {
    authenticatedUserForHotAuthRows: (
      hotRows: {
        users: AuthSessionPersistenceDatabase["users"];
        studentProfiles: AuthSessionPersistenceDatabase["student_profiles"];
        userSettings: AuthSessionPersistenceDatabase["user_settings"];
      },
      username: string,
      password: string
    ) => AuthLoginResult;
    overlayDatabaseWithHotAuthRows: (
      database: Partial<AuthSessionPersistenceDatabase>,
      hotRows: {
        users: AuthSessionPersistenceDatabase["users"];
        studentProfiles: AuthSessionPersistenceDatabase["student_profiles"];
        userSettings: AuthSessionPersistenceDatabase["user_settings"];
        passwordResetTokens?: NonNullable<AuthSessionPersistenceDatabase["password_reset_tokens"]>;
      }
    ) => Partial<AuthSessionPersistenceDatabase>;
  };
};

type AuthFixedExampleScope = {
  grade: AuthSession["settings"]["selectedGrade"];
  curriculumProfile: AuthSession["user"]["curriculumProfile"];
  language?: AuthSession["settings"]["language"];
};

type AuthDemoSeedBoundaryModule = {
  authSelectedGradeForSettingsUpdate?: (input: {
    currentSelectedGrade: AuthSession["settings"]["selectedGrade"];
    fixedExampleGrade?: AuthSession["settings"]["selectedGrade"] | null;
    profileGrade: AuthSession["user"]["grade"];
    requestedGrade?: AuthSession["settings"]["selectedGrade"];
    requestedGradeAllowed: boolean;
    studentSelectedGradePolicy?: (input: {
      userId: string;
      grade: AuthSession["settings"]["selectedGrade"];
      curriculumProfile: AuthSession["user"]["curriculumProfile"];
    }) => boolean;
    user: Pick<AuthSession["user"], "id" | "role" | "curriculumProfile">;
  }) => AuthSession["settings"]["selectedGrade"];
  authDemoSeedMatchesIdentifier?: (seed: AuthDemoAccountSeed, username: string) => boolean;
  authStorageSeedExampleAccountSeeds?: (input: {
    demoAccountSeeds: readonly AuthDemoAccountSeed[];
    internalExampleAccountSeeds: readonly AuthDemoAccountSeed[];
    shouldSeedDemoUser: boolean;
  }) => readonly AuthDemoAccountSeed[];
  authInternalExampleAccountSeedForUserId?: (
    internalExampleAccountSeeds: readonly AuthDemoAccountSeed[],
    userId: string
  ) => AuthDemoAccountSeed | null | undefined;
  authFixedExampleAccountScopeForUserId?: (
    fixedExampleAccountScopes: Record<string, AuthFixedExampleScope>,
    userId: string
  ) => AuthFixedExampleScope | undefined;
  authDemoAccountSeedProfile?: (
    seed: AuthDemoAccountSeed,
    fixedExampleScopeForUserId?: (userId: string) => AuthFixedExampleScope | null | undefined
  ) => AuthSession["user"]["curriculumProfile"];
  authDemoAccountSeedLanguage?: (
    seed: AuthDemoAccountSeed,
    fixedExampleScopeForUserId?: (userId: string) => AuthFixedExampleScope | null | undefined
  ) => AuthSession["settings"]["language"];
  authFixedExampleAccountLocksSelectedGrade?: (
    userId: string,
    internalExampleAccountSeedForUserId?: (userId: string) => AuthDemoAccountSeed | null | undefined
  ) => boolean;
  chooseAuthFixedExampleSeed?: (
    candidateSeeds: readonly AuthDemoAccountSeed[],
    requestedProfile?: AuthSession["user"]["curriculumProfile"],
    fixedExampleScopeForUserId?: (userId: string) => AuthFixedExampleScope | null | undefined
  ) => AuthDemoAccountSeed | null;
  authDemoRecordsNeedSync?: (
    database: Partial<AuthSessionPersistenceDatabase>,
    options: {
      demoAccountSeeds: readonly AuthDemoAccountSeed[];
      demoPassword: string;
      fixedExampleScopeForUserId?: (userId: string) => AuthFixedExampleScope | null | undefined;
      internalExampleAccountSeedForUserId?: (userId: string) => AuthDemoAccountSeed | null | undefined;
    }
  ) => boolean;
  syncAuthDemoAccounts?: (
    users: AuthSessionPersistenceDatabase["users"],
    studentProfiles: AuthSessionPersistenceDatabase["student_profiles"],
    userSettings: AuthSessionPersistenceDatabase["user_settings"],
    now: string,
    options: {
      demoAccountSeeds: readonly AuthDemoAccountSeed[];
      demoPassword: string;
      fixedExampleScopeForUserId?: (userId: string) => AuthFixedExampleScope | null | undefined;
      internalExampleAccountSeedForUserId?: (userId: string) => AuthDemoAccountSeed | null | undefined;
      hashPassword?: (password: string) => { hash: string; salt: string };
      passwordMatches?: (password: string, user: { password_hash?: string; password_salt?: string }) => boolean;
    }
  ) => void;
  authBootstrapAdminInput?: (environment: Record<string, string | undefined>) => {
    username: string;
    email: string;
    name: string;
    password: string;
  } | null;
  authBootstrapAdminNeedsSync?: (
    database: Partial<AuthSessionPersistenceDatabase>,
    input: {
      username: string;
      email: string;
      name: string;
      password: string;
    } | null
  ) => boolean;
  syncAuthBootstrapAdmin?: (
    users: AuthSessionPersistenceDatabase["users"],
    studentProfiles: AuthSessionPersistenceDatabase["student_profiles"],
    userSettings: AuthSessionPersistenceDatabase["user_settings"],
    now: string,
    input: {
      username: string;
      email: string;
      name: string;
      password: string;
    } | null,
    options?: {
      defaultCurriculumTrack?: AuthSession["user"]["curriculumTrack"];
      hashPassword?: (password: string) => { hash: string; salt: string };
    }
  ) => void;
  authFixedExampleAccountNeedsSync?: (
    database: AuthSessionPersistenceDatabase,
    userId: string,
    options: {
      fixedExampleScopeForUserId: (userId: string) => AuthFixedExampleScope | null | undefined;
      internalExampleAccountSeedForUserId?: (userId: string) => AuthDemoAccountSeed | null | undefined;
    }
  ) => boolean;
  applyAuthFixedExampleAccountScope?: (
    database: AuthSessionPersistenceDatabase,
    userId: string,
    options: {
      fixedExampleScopeForUserId: (userId: string) => AuthFixedExampleScope | null | undefined;
      internalExampleAccountSeedForUserId?: (userId: string) => AuthDemoAccountSeed | null | undefined;
      now?: string;
    }
  ) => AuthSessionPersistenceDatabase["users"][number] | null;
  authStorageFreeExampleAccountRecords?: (
    userId: string,
    options: {
      exampleAccountSeeds: readonly AuthDemoAccountSeed[];
      fixedExampleScopeForUserId?: (userId: string) => AuthFixedExampleScope | null | undefined;
      now?: string;
    }
  ) => {
    user: AuthSessionPersistenceDatabase["users"][number];
    profile: AuthSessionPersistenceDatabase["student_profiles"][number];
    settings: AuthSessionPersistenceDatabase["user_settings"][number];
  } | null;
  authStorageFreeExampleDatabase?: <TDatabase extends Pick<AuthSessionPersistenceDatabase, "student_profiles" | "user_settings" | "users">>(
    database: TDatabase,
    userId: string,
    options: {
      exampleAccountSeeds: readonly AuthDemoAccountSeed[];
      fixedExampleScopeForUserId?: (userId: string) => AuthFixedExampleScope | null | undefined;
      now?: string;
    }
  ) => TDatabase | null;
  authStorageFreeExampleAuthenticatedUser?: (
    userId: string,
    options: {
      exampleAccountSeeds: readonly AuthDemoAccountSeed[];
      fixedExampleScopeForUserId?: (userId: string) => AuthFixedExampleScope | null | undefined;
      mediaObjectUrlForKey: (objectKey: string) => string | null | undefined;
      now?: string;
    }
  ) => AuthSession | null;
};

function hashPassword(password: string, salt = "test-salt") {
  return pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

function authTestUser({
  email,
  id,
  password,
  username
}: {
  email?: string;
  id: string;
  password: string;
  username: string;
}) {
  const salt = `salt-${id}`;
  return {
    id,
    username,
    normalized_username: username.trim().toLowerCase(),
    email,
    normalized_email: email?.trim().toLowerCase(),
    role: "student" as const,
    password_hash: hashPassword(password, salt),
    password_salt: salt,
    password_must_change: false
  };
}

function createDatabase(): AuthSessionPersistenceDatabase {
  return {
    users: [
      {
        id: "student-1",
        username: "student-one",
        normalized_username: "student-one",
        email: "student@example.com",
        normalized_email: "student@example.com",
        role: "student",
        password_hash: "hash",
        password_salt: "salt",
        password_must_change: true
      },
      {
        id: "teacher-1",
        username: "teacher-one",
        normalized_username: "teacher-one",
        role: "teacher",
        password_hash: "hash",
        password_salt: "salt"
      },
      {
        id: "profileless",
        username: "profileless",
        normalized_username: "profileless",
        role: "student",
        password_hash: "hash",
        password_salt: "salt"
      },
      {
        id: "student-setup",
        username: "student-setup",
        normalized_username: "student-setup",
        email: "setup@example.com",
        normalized_email: "setup@example.com",
        role: "student",
        password_hash: "hash",
        password_salt: "salt"
      }
    ],
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada Student",
        grade: "S3",
        curriculum_track: "HK",
        avatar_id: "not-valid",
        avatar_media_object_key: "avatars/student-1.webp"
      },
      {
        user_id: "student-setup",
        name: "Setup Student",
        grade: "S2",
        avatar_id: "delta"
      },
      {
        user_id: "teacher-1",
        name: "Teacher One",
        grade: "S3",
        curriculum_region: "MAINLAND",
        textbook_publisher: "MAINLAND_PEP"
      }
    ],
    user_settings: [
      {
        user_id: "teacher-1",
        language: "zh",
        theme: "light",
        selected_grade: "S2",
        updated_at: "2026-06-19T00:00:00.000Z"
      }
    ],
    password_reset_tokens: [
      {
        id: "expired-token",
        user_id: "student-1",
        token_hash: "hashed:expired",
        expires_at: "2026-06-20T09:00:00.000Z",
        used_at: null,
        created_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "used-token",
        user_id: "student-1",
        token_hash: "hashed:used",
        expires_at: "2026-06-20T11:00:00.000Z",
        used_at: "2026-06-20T09:30:00.000Z",
        created_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "active-token",
        user_id: "student-1",
        token_hash: "hashed:active",
        expires_at: "2026-06-20T11:00:00.000Z",
        used_at: null,
        created_at: "2026-06-20T08:00:00.000Z"
      }
    ]
  };
}

function createTestStore(
  database: AuthSessionPersistenceDatabase,
  options: Partial<Parameters<typeof createAuthSessionPersistenceStore>[0]> = {}
) {
  return createAuthSessionPersistenceStore({
    now: () => generatedAt,
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    mediaObjectUrlForKey: (objectKey) => `/media/${objectKey}`,
    createId: () => "generated-id",
    createParentInviteCode: () => "MAIS-INVITE-CODE",
    createResetToken: () => "plain-reset-token",
    hashPasswordResetToken: (token) => `hashed:${token}`,
    hashPassword: (password) => ({ hash: `hash:${password}`, salt: `salt:${password}` }),
    passwordMatches: (password, user) => password === "current-password" && (user.id === "student-1" || user.id === "student-setup"),
    passwordResetTokenMaxAgeMs: 30 * 60 * 1000,
    ...options
  });
}

function passwordResetTokens(database: AuthSessionPersistenceDatabase) {
  assert.ok(database.password_reset_tokens);
  return database.password_reset_tokens;
}

function createDatabaseWithLessonProgress() {
  return {
    ...createDatabase(),
    lesson_progress: [] as Array<{
      user_id: string;
      topic_id: string;
      lesson_slug?: string;
      status: "not-started" | "in-progress" | "completed";
      mastery: number;
      started_at?: string | null;
      completed_at: string | null;
      duration_seconds?: number | null;
      checklist_state?: Record<string, boolean>;
      updated_at: string;
    }>
  };
}

test("auth session persistence resolves authenticated users without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const session = await createTestStore(createDatabase()).getAuthenticatedUserById("student-1");

  assert.equal(session?.user.id, "student-1");
  assert.equal(session?.user.name, "Ada Student");
  assert.equal(session?.user.passwordMustChange, true);
  assert.equal(session?.user.avatarId, "delta");
  assert.equal(session?.user.avatarImageObjectKey, "avatars/student-1.webp");
  assert.equal(session?.user.avatarImageUrl, "/media/avatars/student-1.webp");
  assert.equal(session?.user.avatarImageDataUrl, "/media/avatars/student-1.webp");
  assert.deepEqual(session?.settings, {
    language: "en",
    theme: "dark",
    selectedGrade: "S3"
  });
});

test("auth session persistence owns hot auth row helpers", async () => {
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthHotTableHelperModule;
  const authenticateHotRows = module.authenticatedUserForAuthHotRows;
  const overlayHotRows = module.overlayAuthSessionDatabaseWithHotAuthRows;

  assert.equal(typeof authenticateHotRows, "function");
  assert.equal(typeof overlayHotRows, "function");

  const staleUser = authTestUser({
    id: "student-1",
    username: "Student One",
    email: "student-old@example.test",
    password: "old-password"
  });
  const freshUser = authTestUser({
    id: "student-1",
    username: "Student One",
    email: "student-new@example.test",
    password: "new-password"
  });
  const legacyDuplicate = authTestUser({
    id: "legacy-shirleen",
    username: "Student Shirleen",
    password: "legacy-password"
  });
  const seededDuplicate = authTestUser({
    id: "student-shirleen-us",
    username: "Student Shirleen",
    email: "student.shirleen@example.edu",
    password: "12345"
  });

  const overlaid = overlayHotRows!(
    {
      users: [staleUser],
      student_profiles: [
        {
          user_id: "student-1",
          name: "Old Name",
          grade: "S3",
          curriculum_track: "HK"
        }
      ],
      user_settings: [
        {
          user_id: "student-1",
          language: "en",
          theme: "dark",
          selected_grade: "S3",
          updated_at: "2026-06-13T00:00:00.000Z"
        }
      ],
      password_reset_tokens: [
        {
          id: "old-token",
          user_id: "student-1",
          token_hash: "old-hash",
          expires_at: "2026-06-15T00:00:00.000Z",
          used_at: null,
          created_at: "2026-06-13T00:00:00.000Z"
        }
      ]
    },
    {
      users: [freshUser],
      studentProfiles: [
        {
          user_id: "student-1",
          name: "Fresh Name",
          grade: "P1",
          curriculum_track: "US_CA_MATH",
          curriculum_region: "US",
          textbook_publisher: "US_CA_MATH"
        }
      ],
      userSettings: [
        {
          user_id: "student-1",
          language: "zh-Hans",
          theme: "light",
          selected_grade: "P1",
          updated_at: "2026-06-14T00:00:00.000Z"
        }
      ],
      passwordResetTokens: [
        {
          id: "new-token",
          user_id: "student-1",
          token_hash: "new-hash",
          expires_at: "2026-06-16T00:00:00.000Z",
          used_at: null,
          created_at: "2026-06-14T00:00:00.000Z"
        }
      ]
    }
  );

  assert.equal(overlaid.users?.[0].email, "student-new@example.test");
  assert.equal(overlaid.student_profiles?.[0].name, "Fresh Name");
  assert.equal(overlaid.user_settings?.[0].selected_grade, "P1");
  assert.deepEqual(overlaid.password_reset_tokens?.map((token) => token.id).sort(), ["new-token", "old-token"]);

  const result = authenticateHotRows!({
    hotRows: {
      users: [legacyDuplicate, seededDuplicate],
      studentProfiles: [
        {
          user_id: "legacy-shirleen",
          name: "Legacy Student Shirleen",
          grade: "S4",
          curriculum_track: "HK",
          curriculum_region: "HK",
          textbook_publisher: "HK_UNITED_PRIME_MIA"
        },
        {
          user_id: "student-shirleen-us",
          name: "Student Shirleen",
          grade: "P1",
          curriculum_track: "US_CA_MATH",
          curriculum_region: "US",
          textbook_publisher: "US_CA_MATH"
        }
      ],
      userSettings: [
        {
          user_id: "legacy-shirleen",
          language: "en",
          theme: "dark",
          selected_grade: "S4",
          updated_at: "2026-06-14T00:00:00.000Z"
        },
        {
          user_id: "student-shirleen-us",
          language: "en",
          theme: "light",
          selected_grade: "P1",
          updated_at: "2026-06-14T00:00:00.000Z"
        }
      ]
    },
    username: "Student Shirleen",
    password: "12345",
    now: generatedAt
  });

  assert.equal(result.status, "authenticated");
  assert.equal(result.status === "authenticated" ? result.session.user.id : null, "student-shirleen-us");
  assert.equal(result.status === "authenticated" ? result.session.user.curriculumProfile.publisher : null, "US_CA_MATH");
});

test("auth session persistence owns password crypto helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;

  const hashAuthPassword = helpers.hashAuthPassword as ((password: string, salt?: string) => { hash: string; salt: string }) | undefined;
  const authPasswordMatches = helpers.authPasswordMatches as ((password: string, user: { password_hash?: string; password_salt?: string }) => boolean) | undefined;
  const hashAuthPasswordResetToken = helpers.hashAuthPasswordResetToken as ((token: string) => string) | undefined;

  assert.equal(typeof hashAuthPassword, "function");
  assert.equal(typeof authPasswordMatches, "function");
  assert.equal(typeof hashAuthPasswordResetToken, "function");
  assert.match(persistenceSource, /export function hashAuthPassword\b/);
  assert.match(persistenceSource, /export function authPasswordMatches\b/);
  assert.match(persistenceSource, /export function hashAuthPasswordResetToken\b/);
  assert.doesNotMatch(rootSource, /function hashPassword\(/);
  assert.doesNotMatch(rootSource, /function passwordMatches\(/);
  assert.doesNotMatch(rootSource, /function hashPasswordResetToken\(/);
  assert.match(rootSource, /hashAuthPassword as hashPasswordFromAuthSessionPersistence/);
  assert.match(rootSource, /authPasswordMatches as passwordMatchesFromAuthSessionPersistence/);
  assert.match(rootSource, /hashAuthPasswordResetToken as hashPasswordResetTokenFromAuthSessionPersistence/);

  const hashed = hashAuthPassword?.("safest-password", "auth-boundary-salt");
  assert.deepEqual(hashed, {
    hash: pbkdf2Sync("safest-password", "auth-boundary-salt", 120000, 64, "sha512").toString("hex"),
    salt: "auth-boundary-salt"
  });
  assert.equal(authPasswordMatches?.("safest-password", {
    password_hash: hashed?.hash,
    password_salt: hashed?.salt
  }), true);
  assert.equal(authPasswordMatches?.("wrong-password", {
    password_hash: hashed?.hash,
    password_salt: hashed?.salt
  }), false);
  assert.equal(
    hashAuthPasswordResetToken?.("plain-reset-token"),
    createHash("sha256").update("plain-reset-token").digest("hex")
  );
});

test("auth session persistence owns identity normalization helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;

  const normalizeAuthUsername = helpers.normalizeAuthUsername as ((username: string) => string) | undefined;
  const normalizeAuthEmail = helpers.normalizeAuthEmail as ((email: string) => string) | undefined;
  const isLikelyAuthEmail = helpers.isLikelyAuthEmail as ((value: string) => boolean) | undefined;

  assert.equal(typeof normalizeAuthUsername, "function");
  assert.equal(typeof normalizeAuthEmail, "function");
  assert.equal(typeof isLikelyAuthEmail, "function");
  assert.match(persistenceSource, /export function normalizeAuthUsername\b/);
  assert.match(persistenceSource, /export function normalizeAuthEmail\b/);
  assert.match(persistenceSource, /export function isLikelyAuthEmail\b/);
  assert.doesNotMatch(rootSource, /function normalizeUsername\(/);
  assert.doesNotMatch(rootSource, /function normalizeEmail\(/);
  assert.doesNotMatch(rootSource, /function isLikelyEmail\(/);
  assert.match(rootSource, /normalizeAuthUsername as normalizeUsernameFromAuthSessionPersistence/);
  assert.match(rootSource, /normalizeAuthEmail as normalizeEmailFromAuthSessionPersistence/);
  assert.match(rootSource, /isLikelyAuthEmail as isLikelyEmailFromAuthSessionPersistence/);

  assert.equal(normalizeAuthUsername?.(" Student.One "), "student.one");
  assert.equal(normalizeAuthEmail?.(" Ada@Example.COM "), "ada@example.com");
  assert.equal(isLikelyAuthEmail?.("ada@example.com"), true);
  assert.equal(isLikelyAuthEmail?.("ada.example.com"), false);
  assert.equal(isLikelyAuthEmail?.("ada@example"), false);
});

test("auth session persistence owns auth user record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;
  const normalizeUser = helpers.normalizeAuthUserRecord as ((
    user: {
      id: string;
      username?: unknown;
      email?: unknown;
      school_id?: unknown;
      password_must_change?: boolean | null;
      role: "student" | "teacher" | "parent" | "admin";
    }
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeUser, "function");
  assert.match(persistenceSource, /export function normalizeAuthUserRecord\b/);
  assert.match(rootSource, /normalizeAuthUserRecord as normalizeUserRecordFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /const users: UserRecord\[\] = \(database\.users \?\? \[\]\)\.map\(\(user\) => \{/);
  assert.doesNotMatch(rootSource, /const username = typeof user\.username === "string" \? user\.username\.trim\(\) : ""/);
  assert.doesNotMatch(rootSource, /normalized_username: normalizeUsernameFromAuthSessionPersistence\(username\)/);
  assert.doesNotMatch(rootSource, /password_must_change: user\.password_must_change \?\? false/);

  assert.deepEqual(normalizeUser?.({
    id: "student-email-username",
    username: " Ada@Example.COM ",
    email: undefined,
    school_id: " school-1 ",
    password_must_change: null,
    role: "student"
  }), {
    id: "student-email-username",
    username: "Ada@Example.COM",
    normalized_username: "ada@example.com",
    email: "Ada@Example.COM",
    normalized_email: "ada@example.com",
    school_id: " school-1 ",
    password_must_change: false,
    session_revision: 1,
    disabled_at: null,
    role: "student"
  });

  assert.deepEqual(normalizeUser?.({
    id: "teacher-explicit-email",
    username: " Teacher.One ",
    email: " Teacher.One@Example.COM ",
    school_id: "   ",
    password_must_change: true,
    role: "teacher"
  }), {
    id: "teacher-explicit-email",
    username: "Teacher.One",
    normalized_username: "teacher.one",
    email: "Teacher.One@Example.COM",
    normalized_email: "teacher.one@example.com",
    school_id: undefined,
    password_must_change: true,
    session_revision: 1,
    disabled_at: null,
    role: "teacher"
  });

  assert.deepEqual(normalizeUser?.({
    id: "parent-invalid-email",
    username: " Parent User ",
    email: "not-email",
    school_id: undefined,
    password_must_change: undefined,
    role: "parent"
  }), {
    id: "parent-invalid-email",
    username: "Parent User",
    normalized_username: "parent user",
    email: undefined,
    normalized_email: undefined,
    school_id: undefined,
    password_must_change: false,
    session_revision: 1,
    disabled_at: null,
    role: "parent"
  });
});

test("auth session persistence owns user settings record normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const normalizeUserSettingsRecords = helpers.normalizeAuthUserSettingsRecords as ((
    records?: AuthSessionPersistenceDatabase["user_settings"]
  ) => AuthSessionPersistenceDatabase["user_settings"]) | undefined;
  const sourceRecords: AuthSessionPersistenceDatabase["user_settings"] = [
    {
      user_id: "student-1",
      language: "zh",
      theme: "light",
      selected_grade: "P4",
      updated_at: "2026-06-20T10:00:00.000Z"
    }
  ];

  assert.equal(typeof normalizeUserSettingsRecords, "function");
  assert.match(persistenceSource, /export function normalizeAuthUserSettingsRecords\b/);
  assert.match(rootSource, /normalizeAuthUserSettingsRecords as normalizeUserSettingsRecordsFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /const userSettings = database\.user_settings \?\? \[\];/);
  assert.deepEqual(normalizeUserSettingsRecords?.(undefined), []);
  assert.equal(normalizeUserSettingsRecords?.(sourceRecords), sourceRecords);
});

test("auth session persistence owns password reset token record normalization for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const normalizePasswordResetTokenRecords = helpers.normalizeAuthPasswordResetTokenRecords as ((
    records?: NonNullable<AuthSessionPersistenceDatabase["password_reset_tokens"]>
  ) => NonNullable<AuthSessionPersistenceDatabase["password_reset_tokens"]>) | undefined;
  const sourceRecords: NonNullable<AuthSessionPersistenceDatabase["password_reset_tokens"]> = [
    {
      id: "token-1",
      user_id: "student-1",
      token_hash: "hash",
      expires_at: "2026-06-20T11:00:00.000Z",
      used_at: null,
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ];

  assert.equal(typeof normalizePasswordResetTokenRecords, "function");
  assert.match(persistenceSource, /export function normalizeAuthPasswordResetTokenRecords\b/);
  assert.match(rootSource, /normalizeAuthPasswordResetTokenRecords as normalizePasswordResetTokenRecordsFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /password_reset_tokens: database\.password_reset_tokens \?\? \[\]/);
  assert.deepEqual(normalizePasswordResetTokenRecords?.(undefined), []);
  assert.equal(normalizePasswordResetTokenRecords?.(sourceRecords), sourceRecords);
});

test("auth session persistence owns avatar and profile sanitizers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;

  const isValidAvatarId = helpers.isValidAuthStudentAvatarId as ((value: unknown) => boolean) | undefined;
  const normalizeAvatarImageDataUrl = helpers.normalizeAuthStudentAvatarImageDataUrl as ((value: unknown) => string | undefined) | undefined;
  const cleanProfileName = helpers.cleanAuthStudentProfileName as ((value: string) => string) | undefined;

  assert.equal(helpers.defaultAuthStudentAvatarId, "delta");
  assert.equal(typeof isValidAvatarId, "function");
  assert.equal(typeof normalizeAvatarImageDataUrl, "function");
  assert.equal(typeof cleanProfileName, "function");
  assert.match(persistenceSource, /export const defaultAuthStudentAvatarId\b/);
  assert.match(persistenceSource, /export function isValidAuthStudentAvatarId\b/);
  assert.match(persistenceSource, /export function normalizeAuthStudentAvatarImageDataUrl\b/);
  assert.match(persistenceSource, /export function cleanAuthStudentProfileName\b/);
  assert.doesNotMatch(rootSource, /const defaultStudentAvatarId\b/);
  assert.doesNotMatch(rootSource, /function isValidStudentAvatarId\(/);
  assert.doesNotMatch(rootSource, /function isValidStudentAvatarImageDataUrl\(/);
  assert.doesNotMatch(rootSource, /function normalizeStudentAvatarImageDataUrl\(/);
  assert.doesNotMatch(rootSource, /function cleanStudentProfileName\(/);
  assert.match(rootSource, /defaultAuthStudentAvatarId as defaultStudentAvatarIdFromAuthSessionPersistence/);
  assert.match(rootSource, /isValidAuthStudentAvatarId as isValidStudentAvatarIdFromAuthSessionPersistence/);
  assert.match(rootSource, /normalizeAuthStudentAvatarImageDataUrl as normalizeStudentAvatarImageDataUrlFromAuthSessionPersistence/);

  assert.equal(isValidAvatarId?.("theta"), true);
  assert.equal(isValidAvatarId?.("bad-avatar"), false);
  assert.equal(normalizeAvatarImageDataUrl?.("data:image/png;base64,QUJD"), "data:image/png;base64,QUJD");
  assert.equal(normalizeAvatarImageDataUrl?.("https://example.test/avatar.png"), undefined);
  assert.equal(cleanProfileName?.(" Ada   Student "), "Ada Student");
});

test("auth session persistence owns student profile record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;
  const normalizeProfile = helpers.normalizeAuthStudentProfileRecord as ((
    profile: {
      user_id: string;
      name: string;
      grade: string;
      curriculum_track?: unknown;
      curriculum_region?: unknown;
      textbook_publisher?: unknown;
      parent_invite_code?: string;
      avatar_id?: unknown;
      avatar_image_data_url?: unknown;
      avatar_media_object_key?: unknown;
    },
    dependencies: {
      normalizeParentInviteCode: (value: string) => string;
    }
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeProfile, "function");
  assert.match(persistenceSource, /export function normalizeAuthStudentProfileRecord\b/);
  assert.match(rootSource, /normalizeAuthStudentProfileRecord as normalizeStudentProfileRecordFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /const studentProfiles = \(database\.student_profiles \?\? \[\]\)\.map\(\(profile\): StudentProfileRecord => \{/);
  assert.doesNotMatch(rootSource, /avatarMediaObjectKey = normalizeStoredMediaObjectKey\(profile\.avatar_media_object_key\)/);
  assert.doesNotMatch(rootSource, /parentInviteCode = normalizeParentInviteCodeFromParentAccess/);

  const dependencies = {
    normalizeParentInviteCode: (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "")
  };

  const normalizedInvalid = normalizeProfile?.({
    user_id: "student-1",
    name: "Ada",
    grade: "S3",
    curriculum_track: "BAD_TRACK",
    curriculum_region: "MAINLAND",
    textbook_publisher: "MAINLAND_PEP",
    parent_invite_code: " mais-123 ",
    avatar_id: "bad-avatar",
    avatar_image_data_url: "https://example.test/avatar.png",
    avatar_media_object_key: " ../unsafe.png "
  }, dependencies);

  assert.equal(normalizedInvalid?.avatar_id, "delta");
  assert.equal(normalizedInvalid?.curriculum_track, "MAINLAND_PEP_HIGH");
  assert.equal(normalizedInvalid?.curriculum_region, "MAINLAND");
  assert.equal(normalizedInvalid?.textbook_publisher, "MAINLAND_PEP");
  assert.equal(normalizedInvalid?.parent_invite_code, "MAIS-123");
  assert.equal(normalizedInvalid?.avatar_media_object_key, undefined);
  assert.equal(normalizedInvalid?.avatar_image_data_url, "https://example.test/avatar.png");

  const normalizedValid = normalizeProfile?.({
    user_id: "student-2",
    name: "Bea",
    grade: "S4",
    curriculum_track: "US_CA_MATH",
    curriculum_region: "HK",
    textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
    parent_invite_code: "   ",
    avatar_id: "theta",
    avatar_image_data_url: "data:image/png;base64,QUJD",
    avatar_media_object_key: "avatars/student-2.webp"
  }, dependencies);

  assert.equal(normalizedValid?.avatar_id, "theta");
  assert.equal(normalizedValid?.curriculum_track, "HK");
  assert.equal(normalizedValid?.curriculum_region, "HK");
  assert.equal(normalizedValid?.textbook_publisher, "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY");
  assert.equal(normalizedValid?.parent_invite_code, "   ");
  assert.equal(normalizedValid?.avatar_media_object_key, "avatars/student-2.webp");
  assert.equal(normalizedValid?.avatar_image_data_url, "data:image/png;base64,QUJD");
});

test("auth session persistence owns student profile lookup helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthHotTableHelperModule;
  const profiles = [
    {
      user_id: "student-1",
      name: "Ada Student",
      grade: "S3" as const,
      curriculum_track: "HK" as const,
      curriculum_region: "HK" as const,
      textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" as const
    }
  ];

  assert.equal(typeof module.authStudentProfileFor, "function");
  assert.match(persistenceSource, /export function authStudentProfileFor\b/);
  assert.match(rootSource, /authStudentProfileFor as studentProfileForFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /function studentProfileFor\(/);
  assert.equal(module.authStudentProfileFor?.({ student_profiles: profiles }, "student-1")?.name, "Ada Student");
  assert.equal(module.authStudentProfileFor?.({ student_profiles: profiles }, "missing-student"), undefined);
  assert.equal(module.authStudentProfileFor?.({}, "student-1"), undefined);
});

test("auth session persistence owns curriculum profile lookup helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthHotTableHelperModule;
  const database = {
    student_profiles: [
      {
        user_id: "teacher-1",
        curriculum_track: "MAINLAND_PEP_HIGH",
        curriculum_region: "CN",
        textbook_publisher: "MAINLAND_HJB"
      },
      {
        user_id: "student-invalid",
        curriculum_track: "NOT_A_TRACK",
        curriculum_region: "US",
        textbook_publisher: "US_CA_MATH"
      }
    ]
  };

  assert.equal(typeof module.authCurriculumProfileForUser, "function");
  assert.equal(typeof module.authCurriculumProfileForClass, "function");
  assert.match(persistenceSource, /export function authCurriculumProfileForUser\b/);
  assert.match(persistenceSource, /export function authCurriculumProfileForClass\b/);
  assert.match(rootSource, /authCurriculumProfileForUser as curriculumProfileForUserFromAuthSessionPersistence/);
  assert.match(rootSource, /authCurriculumProfileForClass as curriculumProfileForClassFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /function curriculumProfileForUser\(/);
  assert.doesNotMatch(rootSource, /function curriculumProfileForClass\(/);

  assert.deepEqual(module.authCurriculumProfileForUser?.(database, "teacher-1"), {
    region: "MAINLAND",
    publisher: "MAINLAND_HJB"
  });
  assert.deepEqual(module.authCurriculumProfileForClass?.(database, { teacher_id: "teacher-1" }), {
    region: "MAINLAND",
    publisher: "MAINLAND_HJB"
  });
  assert.deepEqual(module.authCurriculumProfileForUser?.(database, "student-invalid"), {
    region: "US",
    publisher: "US_CA_MATH"
  });
  assert.deepEqual(module.authCurriculumProfileForUser?.(database, "missing-user"), {
    region: "HK",
    publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
  });
});

test("auth session persistence owns record curriculum profile helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthHotTableHelperModule;

  assert.equal(typeof module.authCurriculumProfileFromRecord, "function");
  assert.match(persistenceSource, /export function authCurriculumProfileFromRecord\b/);
  assert.match(rootSource, /authCurriculumProfileFromRecord as profileForRecordFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /function profileForRecord\(/);
  assert.deepEqual(module.authCurriculumProfileFromRecord?.({
    curriculum_track: "NOT_A_TRACK",
    curriculum_region: "US",
    textbook_publisher: "US_CA_MATH"
  }), {
    region: "US",
    publisher: "US_CA_MATH"
  });
  assert.deepEqual(module.authCurriculumProfileFromRecord?.({
    curriculum_track: "MAINLAND_PEP_HIGH",
    curriculum_region: null,
    textbook_publisher: null
  }), {
    region: "MAINLAND",
    publisher: "MAINLAND_PEP"
  });
});

test("legacy userStore consumes auth hot row helpers from auth session persistence", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(persistenceSource, /export function authenticatedUserForAuthHotRows/);
  assert.match(persistenceSource, /export function overlayAuthSessionDatabaseWithHotAuthRows/);
  assert.doesNotMatch(rootSource, /function authenticatedUserForHotAuthRows/);
  assert.doesNotMatch(rootSource, /function overlayDatabaseWithHotAuthRows/);
  assert.match(rootSource, /authenticatedUserForAuthHotRows/);
  assert.match(rootSource, /overlayAuthSessionDatabaseWithHotAuthRows/);
});

test("auth session persistence owns hot-table test hook factory for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthHotTableHelperModule;

  assert.equal(typeof module.createAuthSessionHotTableTestHooks, "function");
  assert.match(persistenceSource, /export function createAuthSessionHotTableTestHooks/);
  assert.match(rootSource, /createAuthSessionHotTableTestHooks as createAuthHotTableTestHooksFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /authenticatedUserForHotAuthRows:\s*\(/);
  assert.doesNotMatch(rootSource, /overlayDatabaseWithHotAuthRows:\s*overlayAuthSessionDatabaseWithHotAuthRows/);

  const hooks = module.createAuthSessionHotTableTestHooks?.({
    mediaObjectUrlForKey: (objectKey) => `/media/${objectKey}`,
    now: generatedAt,
    passwordMatches: (password, user) => password === user.password_hash
  });
  assert.equal(typeof hooks?.authenticatedUserForHotAuthRows, "function");
  assert.equal(typeof hooks?.overlayDatabaseWithHotAuthRows, "function");

  const authenticated = hooks?.authenticatedUserForHotAuthRows(
    {
      users: [{
        id: "student-1",
        username: "student.one",
        normalized_username: "student.one",
        email: "student.one@example.test",
        normalized_email: "student.one@example.test",
        password_hash: "secret",
        password_salt: "test-salt",
        role: "student",
        created_at: generatedAt.toISOString()
      }],
      studentProfiles: [{
        user_id: "student-1",
        name: "Student One",
        grade: "S3",
        curriculum_track: "HK",
        curriculum_region: "HK",
        textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
      }],
      userSettings: [{
        user_id: "student-1",
        language: "en",
        theme: "light",
        selected_grade: "S3",
        updated_at: generatedAt.toISOString()
      }]
    },
    "student.one",
    "secret"
  );

  assert.equal(authenticated?.status, "authenticated");
  assert.equal(authenticated?.session.user.id, "student-1");
  assert.deepEqual(hooks?.overlayDatabaseWithHotAuthRows(
    { users: [] },
    {
      users: authenticated?.status === "authenticated" ? [{
        id: authenticated.session.user.id,
        username: "student.one",
        normalized_username: "student.one",
        password_hash: "secret",
        password_salt: "test-salt",
        role: "student",
        created_at: generatedAt.toISOString()
      }] : [],
      studentProfiles: [],
      userSettings: [],
      passwordResetTokens: []
    }
  ).users?.map((user) => user.id), ["student-1"]);
});

test("auth session persistence owns hot-table projection helpers for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperNames = [
    "projectedUserRecord",
    "projectedStudentProfileRecord",
    "projectedUserSettingsRecord",
    "projectedPasswordResetTokenRecord"
  ];

  for (const helperName of helperNames) {
    assert.equal(typeof helpers[helperName], "function", `${helperName} should be exported by authSessionPersistence`);
    assert.match(persistenceSource, new RegExp(`export function ${helperName}\\b`));
    assert.match(rootSource, new RegExp(`${helperName} as ${helperName}FromAuthSessionPersistence`));
    assert.doesNotMatch(rootSource, new RegExp(`function ${helperName}\\(`));
  }
  assert.doesNotMatch(rootSource, /function stringRecordField\(/);
  assert.doesNotMatch(rootSource, /function optionalStringRecordField\(/);
  assert.doesNotMatch(rootSource, /function isUserRole\(/);

  const projectedUserRecord = helpers.projectedUserRecord as (value: unknown) => Record<string, unknown> | null;
  const projectedStudentProfileRecord = helpers.projectedStudentProfileRecord as (value: unknown) => Record<string, unknown> | null;
  const projectedUserSettingsRecord = helpers.projectedUserSettingsRecord as (value: unknown) => Record<string, unknown> | null;
  const projectedPasswordResetTokenRecord = helpers.projectedPasswordResetTokenRecord as (value: unknown) => Record<string, unknown> | null;

  assert.deepEqual(projectedUserRecord({
    id: "student-1",
    username: "Student One",
    normalized_username: "student one",
    email: "student@example.test",
    normalized_email: "student@example.test",
    password_hash: "hash",
    password_salt: "salt",
    school_id: "school-1",
    password_must_change: true,
    session_revision: 1,
    disabled_at: null,
    role: "student",
    created_at: "2026-06-20T10:00:00.000Z"
  }), {
    id: "student-1",
    username: "Student One",
    normalized_username: "student one",
    email: "student@example.test",
    normalized_email: "student@example.test",
    password_hash: "hash",
    password_salt: "salt",
    school_id: "school-1",
    password_must_change: true,
    session_revision: 1,
    disabled_at: null,
    role: "student",
    created_at: "2026-06-20T10:00:00.000Z"
  });
  assert.equal(projectedUserRecord({ id: "student-1", role: "student" }), null);
  assert.equal(projectedUserRecord({ id: "bad-role", role: "owner" }), null);

  assert.deepEqual(projectedStudentProfileRecord({
    user_id: "student-1",
    name: "Ada Student",
    grade: "S3",
    curriculum_track: "US_CA_MATH",
    curriculum_region: "US",
    textbook_publisher: "US_CA_MATH",
    parent_invite_code: "INVITE",
    avatar_id: "delta",
    avatar_image_data_url: "data:image/png;base64,AAAA",
    avatar_media_object_key: "avatars/student-1.webp"
  }), {
    user_id: "student-1",
    name: "Ada Student",
    grade: "S3",
    curriculum_track: "US_CA_MATH",
    curriculum_region: "US",
    textbook_publisher: "US_CA_MATH",
    parent_invite_code: "INVITE",
    avatar_id: "delta",
    avatar_image_data_url: "data:image/png;base64,AAAA",
    avatar_media_object_key: "avatars/student-1.webp"
  });
  assert.equal(projectedStudentProfileRecord({ user_id: "student-1", name: "Ada", grade: "G9" }), null);

  assert.deepEqual(projectedUserSettingsRecord({
    user_id: "student-1",
    language: "zh-Hans",
    theme: "light",
    selected_grade: "P4",
    updated_at: "2026-06-20T10:00:00.000Z"
  }), {
    user_id: "student-1",
    language: "zh-Hans",
    theme: "light",
    selected_grade: "P4",
    updated_at: "2026-06-20T10:00:00.000Z"
  });
  assert.equal(projectedUserSettingsRecord({ user_id: "student-1", language: "fr", theme: "light", selected_grade: "P4" }), null);

  assert.deepEqual(projectedPasswordResetTokenRecord({
    id: "token-1",
    user_id: "student-1",
    token_hash: "hash",
    expires_at: "2026-06-20T11:00:00.000Z",
    used_at: "",
    created_at: "2026-06-20T10:00:00.000Z"
  }), {
    id: "token-1",
    user_id: "student-1",
    token_hash: "hash",
    expires_at: "2026-06-20T11:00:00.000Z",
    used_at: null,
    created_at: "2026-06-20T10:00:00.000Z"
  });
  assert.equal(projectedPasswordResetTokenRecord({ id: "token-1", user_id: "student-1" }), null);
  assert.equal(projectedPasswordResetTokenRecord({
    id: "token-1",
    user_id: "student-1",
    token_hash: "hash",
    expires_at: "not-a-timestamp",
    used_at: null,
    created_at: "2026-06-20T10:00:00.000Z"
  }), null);
  assert.equal(projectedPasswordResetTokenRecord({
    id: "token-1",
    user_id: "student-1",
    token_hash: "hash",
    expires_at: "2026-06-20T11:00:00.000Z",
    used_at: null,
    created_at: "not-a-timestamp"
  }), null);
});

test("auth session persistence owns default user settings records for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const defaultSettings = helpers.defaultAuthUserSettingsRecord as (
    userId: string,
    grade: string,
    now?: Date
  ) => Record<string, unknown>;

  assert.equal(typeof defaultSettings, "function");
  assert.match(persistenceSource, /export function defaultAuthUserSettingsRecord\b/);
  assert.match(rootSource, /defaultAuthUserSettingsRecord as defaultSettingsFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /function defaultSettings\(/);
  assert.deepEqual(defaultSettings("student-1", "S3", new Date("2026-06-20T10:00:00.000Z")), {
    user_id: "student-1",
    language: "en",
    theme: "dark",
    selected_grade: "S3",
    updated_at: "2026-06-20T10:00:00.000Z"
  });
});

test("auth session persistence owns authenticated session projection for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof helpers.authenticatedUserFromAuthRecords, "function");
  assert.match(persistenceSource, /export function authenticatedUserFromAuthRecords\b/);
  assert.match(rootSource, /authenticatedUserFromAuthRecords as authenticatedUserFromAuthRecordsFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /function toAuthenticatedUserFromRecords\(/);

  const authenticatedUserFromAuthRecords = helpers.authenticatedUserFromAuthRecords as (input: {
    mediaObjectUrlForKey: (objectKey: string) => string | null | undefined;
    now?: Date;
    profile: AuthSessionPersistenceDatabase["student_profiles"][number];
    settingsRecord?: AuthSessionPersistenceDatabase["user_settings"][number] | null;
    user: AuthSessionPersistenceDatabase["users"][number];
  }) => AuthSession | null;

  const session = authenticatedUserFromAuthRecords({
    mediaObjectUrlForKey: (objectKey) => `/media/${objectKey}`,
    now: generatedAt,
    profile: {
      user_id: "student-1",
      name: "Ada Student",
      grade: "S3",
      curriculum_track: "HK",
      avatar_id: "not-valid",
      avatar_media_object_key: "avatars/student-1.webp"
    },
    user: {
      id: "student-1",
      username: "student-one",
      email: "student@example.com",
      role: "student",
      school_id: "school-1",
      password_must_change: true
    }
  });

  assert.deepEqual(session, {
    user: {
      id: "student-1",
      name: "Ada Student",
      username: "student-one",
      email: "student@example.com",
      schoolId: "school-1",
      passwordMustChange: true,
      avatarId: "delta",
      avatarImageDataUrl: "/media/avatars/student-1.webp",
      avatarImageObjectKey: "avatars/student-1.webp",
      avatarImageUrl: "/media/avatars/student-1.webp",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" },
      role: "student"
    },
    settings: {
      language: "en",
      theme: "dark",
      selectedGrade: "S3"
    }
  });

  assert.equal(authenticatedUserFromAuthRecords({
    mediaObjectUrlForKey: () => null,
    profile: {
      user_id: "student-2",
      name: "Setup Student",
      grade: "S2"
    },
    user: {
      id: "student-2",
      username: "setup",
      role: "student"
    }
  })?.user.curriculumTrack, "HK");

  assert.equal(authenticatedUserFromAuthRecords({
    mediaObjectUrlForKey: () => null,
    profile: {
      user_id: "student-3",
      name: "Unknown Track Student",
      grade: "S3",
      curriculum_track: undefined
    },
    user: {
      id: "student-3",
      username: "unknown-track",
      role: "student"
    }
  })?.settings.selectedGrade, "S3");
});

test("auth session persistence owns database-backed authenticated user projection for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof helpers.authenticatedUserFromAuthDatabase, "function");
  assert.match(persistenceSource, /export function authenticatedUserFromAuthDatabase\b/);
  assert.match(rootSource, /authenticatedUserFromAuthDatabase as authenticatedUserFromAuthDatabaseFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /function toAuthenticatedUser\(database: Database, user: UserRecord\)/);
  assert.doesNotMatch(rootSource, /database\.student_profiles\.find\(\(candidate\) => candidate\.user_id === user\.id\)/);

  const authenticatedUserFromAuthDatabase = helpers.authenticatedUserFromAuthDatabase as (input: {
    database: AuthSessionPersistenceDatabase;
    mediaObjectUrlForKey: (objectKey: string) => string | null | undefined;
    now?: Date;
    user: AuthSessionPersistenceDatabase["users"][number];
  }) => AuthSession | null;
  const database: AuthSessionPersistenceDatabase = {
    users: [{
      id: "student-1",
      username: "student-one",
      email: "student@example.com",
      role: "student",
      password_must_change: true
    }],
    student_profiles: [{
      user_id: "student-1",
      name: "Ada Student",
      grade: "S2",
      curriculum_track: "HK",
      avatar_id: "spark"
    }],
    user_settings: []
  };

  const session = authenticatedUserFromAuthDatabase({
    database,
    mediaObjectUrlForKey: () => null,
    now: generatedAt,
    user: database.users[0]
  });

  assert.equal(session?.user.id, "student-1");
  assert.equal(session?.user.name, "Ada Student");
  assert.equal(session?.settings.language, "en");
  assert.equal(session?.settings.theme, "dark");
  assert.equal(session?.settings.selectedGrade, "S2");

  assert.equal(authenticatedUserFromAuthDatabase({
    database: { ...database, student_profiles: [] },
    mediaObjectUrlForKey: () => null,
    now: generatedAt,
    user: database.users[0]
  }), null);
});

test("auth session persistence owns database-backed login result projection for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/authSessionPersistence") as Record<string, unknown>;
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.equal(typeof helpers.authenticatedLoginResultFromAuthDatabase, "function");
  assert.match(persistenceSource, /export function authenticatedLoginResultFromAuthDatabase\b/);
  assert.match(rootSource, /authenticatedLoginResultFromAuthDatabase as authenticatedLoginResultFromAuthDatabaseFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /function toAuthenticatedLoginResult\(database: Database, user: UserRecord\)/);

  const authenticatedLoginResultFromAuthDatabase = helpers.authenticatedLoginResultFromAuthDatabase as (input: {
    database: AuthSessionPersistenceDatabase;
    mediaObjectUrlForKey: (objectKey: string) => string | null | undefined;
    now?: Date;
    user: AuthSessionPersistenceDatabase["users"][number];
  }) => AuthLoginResult<AuthSessionPersistenceDatabase>;
  const database: AuthSessionPersistenceDatabase = {
    users: [{
      id: "student-1",
      username: "student-one",
      email: "student@example.com",
      role: "student"
    }],
    student_profiles: [{
      user_id: "student-1",
      name: "Ada Student",
      grade: "S2",
      curriculum_track: "HK"
    }],
    user_settings: []
  };

  const result = authenticatedLoginResultFromAuthDatabase({
    database,
    mediaObjectUrlForKey: () => null,
    now: generatedAt,
    user: database.users[0]
  });

  assert.equal(result.status, "authenticated");
  assert.equal(result.status === "authenticated" ? result.session.user.id : "", "student-1");
  assert.equal(result.status === "authenticated" ? result.database : null, database);
  assert.deepEqual(authenticatedLoginResultFromAuthDatabase({
    database: { ...database, student_profiles: [] },
    mediaObjectUrlForKey: () => null,
    now: generatedAt,
    user: database.users[0]
  }), { status: "invalid" });
});

test("auth session persistence matches credential users without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const store = createTestStore(createDatabase());

  assert.equal(store.authenticatedUserForCredentials(createDatabase(), " student-one ", "current-password")?.id, "student-1");
  assert.equal(store.authenticatedUserForCredentials(createDatabase(), " Student@Example.com ", "current-password")?.id, "student-1");
  assert.equal(store.authenticatedUserForCredentials(createDatabase(), "student-one", "wrong-password"), null);
  assert.equal(store.authenticatedUserForCredentials(createDatabase(), "missing-user", "current-password"), null);
});

test("auth session persistence authenticates snapshot users without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const store = createTestStore(createDatabase());

  const session = await store.authenticateUser(" Student@Example.com ", "current-password");

  assert.equal(session?.user.id, "student-1");
  assert.equal(session?.user.name, "Ada Student");
  assert.equal(session?.user.passwordMustChange, true);
  assert.deepEqual(session?.settings, {
    language: "en",
    theme: "dark",
    selectedGrade: "S3"
  });
  assert.equal(await store.authenticateUser("student-one", "wrong-password"), null);
  assert.equal(await store.authenticateUser("missing-user", "current-password"), null);
});

test("auth session persistence authenticates login users and preserves snapshot database handoff", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const authenticated = await store.authenticateUserForLogin(" Student@Example.com ", "current-password");

  assert.equal(authenticated.status, "authenticated");
  assert.equal(authenticated.status === "authenticated" ? authenticated.session.user.id : null, "student-1");
  assert.equal(authenticated.status === "authenticated" ? authenticated.sessionRevision : null, 1);
  assert.equal(authenticated.status === "authenticated" ? authenticated.database : null, database);

  const requiresCurriculum = await store.authenticateUserForLogin("setup@example.com", "current-password");

  assert.deepEqual(requiresCurriculum, {
    status: "requires-curriculum-track",
    role: "student",
    user: {
      id: "student-setup",
      name: "Setup Student",
      username: "student-setup",
      grade: "S2"
    }
  });

  assert.deepEqual(await store.authenticateUserForLogin("student-one", "wrong-password"), { status: "invalid" });
  assert.deepEqual(await store.authenticateUserForLogin("missing-user", "current-password"), { status: "invalid" });
});

test("auth session persistence lets login fast hooks short-circuit or fall back by retry policy", async () => {
  const hotSession: AuthSession = {
    user: {
      id: "hot-user",
      name: "Hot User",
      username: "hot",
      avatarId: "delta",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" },
      role: "student"
    },
    settings: {
      language: "en",
      theme: "dark",
      selectedGrade: "S3"
    }
  };
  const hotStore = createAuthSessionPersistenceStore({
    readDatabase: async () => {
      throw new Error("snapshot should not be read after hot login hit");
    },
    authenticateUserForLoginBeforeSnapshot: async () => ({ status: "authenticated", session: hotSession, sessionRevision: 5 })
  });

  assert.deepEqual(await hotStore.authenticateUserForLogin("hot@example.com", "current-password"), {
    status: "authenticated",
    session: hotSession,
    sessionRevision: 5
  });

  const noRetryStore = createAuthSessionPersistenceStore({
    readDatabase: async () => {
      throw new Error("snapshot should not be read when invalid fast result is accepted");
    },
    authenticateUserForLoginBeforeSnapshot: async () => ({ status: "invalid" }),
    shouldRetryLoginAfterFastInvalid: () => false
  });
  assert.deepEqual(await noRetryStore.authenticateUserForLogin("student-one", "current-password"), { status: "invalid" });

  const retryDatabase = createDatabase();
  const retryStore = createTestStore(retryDatabase, {
    authenticateUserForLoginBeforeSnapshot: async () => ({ status: "invalid" }),
    shouldRetryLoginAfterFastInvalid: () => true
  });
  const retryResult = await retryStore.authenticateUserForLogin("student-one", "current-password");
  assert.equal(retryResult.status, "authenticated");
  assert.equal(retryResult.status === "authenticated" ? retryResult.database : null, retryDatabase);
});

test("auth session persistence identifies demo login retry candidates", () => {
  const store = createTestStore(createDatabase(), {
    demoAccountSeeds: [
      {
        id: "public-demo",
        username: "Public Demo",
        email: "public.demo@example.test",
        role: "student",
        grade: "S3",
        curriculumTrack: "HK",
        avatarId: "delta"
      },
      {
        id: "internal-demo",
        username: "Internal Demo",
        email: "internal.demo@example.test",
        role: "teacher",
        grade: "P1",
        curriculumTrack: "US_CA_MATH",
        avatarId: "sigma"
      }
    ],
    demoPassword: "demo-pass"
  });

  assert.equal(store.shouldRetryDemoLoginAfterFastInvalid(" public.demo@example.test ", "demo-pass"), true);
  assert.equal(store.shouldRetryDemoLoginAfterFastInvalid("PUBLIC DEMO", "demo-pass"), true);
  assert.equal(store.shouldRetryDemoLoginAfterFastInvalid("internal.demo@example.test", "demo-pass"), true);
  assert.equal(store.shouldRetryDemoLoginAfterFastInvalid("public.demo@example.test", "wrong-pass"), false);
  assert.equal(store.shouldRetryDemoLoginAfterFastInvalid("missing@example.test", "demo-pass"), false);
});

test("auth session persistence owns demo seed boundary helpers for legacy userStore", async () => {
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthDemoSeedBoundaryModule;

  assert.equal(typeof module.authDemoSeedMatchesIdentifier, "function");
  assert.equal(typeof module.authDemoAccountSeedProfile, "function");
  assert.equal(typeof module.authDemoAccountSeedLanguage, "function");
  assert.equal(typeof module.authFixedExampleAccountLocksSelectedGrade, "function");
  assert.equal(typeof module.chooseAuthFixedExampleSeed, "function");

  const hongKongSeed: AuthDemoAccountSeed = {
    id: "fixed-demo-student",
    username: "Demo Student",
    email: "demo.student@example.test",
    role: "student",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "delta"
  };
  const mainlandSeed: AuthDemoAccountSeed = {
    id: "mainland-demo-student",
    username: "Mainland Student",
    email: "mainland.student@example.test",
    role: "student",
    grade: "S4",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    avatarId: "pi"
  };
  const unitedStatesSeed: AuthDemoAccountSeed = {
    id: "us-demo-student",
    username: "US Student",
    email: "us.student@example.test",
    role: "student",
    grade: "P1",
    curriculumTrack: "US_CA_MATH",
    avatarId: "sigma"
  };
  const fixedScope: AuthFixedExampleScope = {
    grade: "S4",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_UNITED_PRIME_MIA"
    },
    language: "zh"
  };
  const fixedScopeForUserId = (userId: string) => userId === hongKongSeed.id ? fixedScope : null;
  const internalSeedForUserId = (userId: string) => userId === unitedStatesSeed.id ? unitedStatesSeed : null;

  assert.equal(module.authDemoSeedMatchesIdentifier?.(hongKongSeed, " demo.student@example.test "), true);
  assert.equal(module.authDemoSeedMatchesIdentifier?.(hongKongSeed, "DEMO STUDENT"), true);
  assert.equal(module.authDemoSeedMatchesIdentifier?.(hongKongSeed, "missing@example.test"), false);
  assert.deepEqual(module.authDemoAccountSeedProfile?.(hongKongSeed, fixedScopeForUserId), {
    region: "HK",
    publisher: "HK_UNITED_PRIME_MIA"
  });
  assert.deepEqual(module.authDemoAccountSeedProfile?.(unitedStatesSeed, fixedScopeForUserId), {
    region: "US",
    publisher: "US_CA_MATH"
  });
  assert.equal(module.authDemoAccountSeedLanguage?.(hongKongSeed, fixedScopeForUserId), "zh");
  assert.equal(module.authDemoAccountSeedLanguage?.(mainlandSeed, fixedScopeForUserId), "zh-Hans");
  assert.equal(module.authDemoAccountSeedLanguage?.(unitedStatesSeed, fixedScopeForUserId), "en");
  assert.equal(module.authFixedExampleAccountLocksSelectedGrade?.(hongKongSeed.id, internalSeedForUserId), true);
  assert.equal(module.authFixedExampleAccountLocksSelectedGrade?.(unitedStatesSeed.id, internalSeedForUserId), false);
  assert.equal(module.chooseAuthFixedExampleSeed?.(
    [mainlandSeed, unitedStatesSeed],
    { region: "US", publisher: "US_CA_MATH" },
    fixedScopeForUserId
  )?.id, unitedStatesSeed.id);
});

test("auth settings grade selection lets Student Jon use California Kindergarten through Grade 12", async () => {
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthDemoSeedBoundaryModule;
  assert.equal(typeof module.authSelectedGradeForSettingsUpdate, "function");

  const californiaProfile = { region: "US", publisher: "US_CA_MATH" } as const;
  const jon = {
    id: "student-jon-us-ca-super",
    role: "student" as const,
    curriculumProfile: californiaProfile
  };
  const standardStudent = {
    id: "student-shirleen-us",
    role: "student" as const,
    curriculumProfile: californiaProfile
  };
  const californiaK12Grades: AuthSession["settings"]["selectedGrade"][] = [
    "K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"
  ];
  const studentSelectedGradePolicy = ({ userId, grade }: { userId: string; grade: AuthSession["settings"]["selectedGrade"] }) =>
    userId === jon.id && californiaK12Grades.includes(grade);

  assert.equal(module.authSelectedGradeForSettingsUpdate?.({
    currentSelectedGrade: "P1",
    profileGrade: "P1",
    requestedGrade: "K",
    requestedGradeAllowed: true,
    studentSelectedGradePolicy,
    user: jon
  }), "K");
  assert.equal(module.authSelectedGradeForSettingsUpdate?.({
    currentSelectedGrade: "P5",
    profileGrade: "P1",
    requestedGradeAllowed: true,
    studentSelectedGradePolicy,
    user: jon
  }), "P5");
  assert.equal(module.authSelectedGradeForSettingsUpdate?.({
    currentSelectedGrade: "P5",
    profileGrade: "P1",
    requestedGrade: "S6",
    requestedGradeAllowed: true,
    studentSelectedGradePolicy,
    user: jon
  }), "S6");
  assert.equal(module.authSelectedGradeForSettingsUpdate?.({
    currentSelectedGrade: "P1",
    profileGrade: "P1",
    requestedGrade: "P5",
    requestedGradeAllowed: true,
    studentSelectedGradePolicy,
    user: standardStudent
  }), "P1");
  assert.equal(module.authSelectedGradeForSettingsUpdate?.({
    currentSelectedGrade: "S4",
    fixedExampleGrade: "S4",
    profileGrade: "S4",
    requestedGrade: "S6",
    requestedGradeAllowed: true,
    studentSelectedGradePolicy,
    user: standardStudent
  }), "S4");
});

test("auth session persistence owns example account seed selectors for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthDemoSeedBoundaryModule;
  const demoSeed: AuthDemoAccountSeed = {
    id: "fixed-demo-student",
    username: "Demo Student",
    email: "demo.student@example.test",
    role: "student",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "delta"
  };
  const internalSeed: AuthDemoAccountSeed = {
    id: "internal-demo-student",
    username: "Internal Student",
    email: "internal.student@example.test",
    role: "student",
    grade: "P1",
    curriculumTrack: "US_CA_MATH",
    avatarId: "pi"
  };
  const fixedScope: AuthFixedExampleScope = {
    grade: "S4",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_UNITED_PRIME_MIA"
    },
    language: "zh"
  };
  const selectorInput = {
    demoAccountSeeds: [demoSeed],
    internalExampleAccountSeeds: [internalSeed],
    shouldSeedDemoUser: true
  };

  assert.equal(typeof module.authStorageSeedExampleAccountSeeds, "function");
  assert.equal(typeof module.authInternalExampleAccountSeedForUserId, "function");
  assert.equal(typeof module.authFixedExampleAccountScopeForUserId, "function");
  assert.match(persistenceSource, /export function authStorageSeedExampleAccountSeeds\b/);
  assert.match(persistenceSource, /export function authInternalExampleAccountSeedForUserId\b/);
  assert.match(persistenceSource, /export function authFixedExampleAccountScopeForUserId\b/);
  assert.match(rootSource, /authStorageSeedExampleAccountSeeds as storageSeedExampleAccountSeedsFromAuthSessionPersistence/);
  assert.match(rootSource, /authInternalExampleAccountSeedForUserId as internalExampleAccountSeedForUserIdFromAuthSessionPersistence/);
  assert.match(rootSource, /authFixedExampleAccountScopeForUserId as fixedExampleAccountScopeForUserIdFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /function storageSeedExampleAccountSeeds\b/);
  assert.doesNotMatch(rootSource, /function internalExampleAccountSeedForUserId\b/);
  assert.doesNotMatch(rootSource, /function fixedExampleAccountScopeForUserId\b/);

  assert.deepEqual(module.authStorageSeedExampleAccountSeeds?.(selectorInput).map((seed) => seed.id), [
    demoSeed.id,
    internalSeed.id
  ]);
  assert.deepEqual(module.authStorageSeedExampleAccountSeeds?.({
    ...selectorInput,
    shouldSeedDemoUser: false
  }).map((seed) => seed.id), [internalSeed.id]);
  assert.equal(module.authInternalExampleAccountSeedForUserId?.([internalSeed], internalSeed.id)?.id, internalSeed.id);
  assert.equal(module.authInternalExampleAccountSeedForUserId?.([internalSeed], demoSeed.id), undefined);
  assert.deepEqual(module.authFixedExampleAccountScopeForUserId?.({
    [demoSeed.id]: fixedScope
  }, demoSeed.id), fixedScope);
  assert.equal(module.authFixedExampleAccountScopeForUserId?.({
    [demoSeed.id]: fixedScope
  }, internalSeed.id), undefined);
});

test("auth session persistence owns demo account sync helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthDemoSeedBoundaryModule;
  const demoSeed: AuthDemoAccountSeed = {
    id: "fixed-demo-student",
    username: "Demo Student",
    email: "demo.student@example.test",
    role: "student",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "delta"
  };
  const internalSeed: AuthDemoAccountSeed = {
    id: "internal-demo-student",
    username: "Internal Student",
    email: "internal.student@example.test",
    role: "student",
    grade: "P1",
    curriculumTrack: "US_CA_MATH",
    avatarId: "pi"
  };
  const fixedScope: AuthFixedExampleScope = {
    grade: "S4",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_UNITED_PRIME_MIA"
    },
    language: "zh"
  };
  const fixedExampleScopeForUserId = (userId: string) => userId === demoSeed.id ? fixedScope : null;
  const internalExampleAccountSeedForUserId = (userId: string) => userId === internalSeed.id ? internalSeed : null;
  const syncOptions = {
    demoAccountSeeds: [demoSeed, internalSeed],
    demoPassword: "demo-pass",
    fixedExampleScopeForUserId,
    internalExampleAccountSeedForUserId,
    hashPassword: (password: string) => ({ hash: `hash:${password}`, salt: "sync-salt" })
  };

  assert.equal(typeof module.authDemoRecordsNeedSync, "function");
  assert.equal(typeof module.syncAuthDemoAccounts, "function");
  assert.match(persistenceSource, /export function authDemoRecordsNeedSync\b/);
  assert.match(persistenceSource, /export function syncAuthDemoAccounts\b/);
  assert.doesNotMatch(rootSource, /function demoRecordsNeedSync\b/);
  assert.doesNotMatch(rootSource, /function syncDemoAccounts\b/);
  assert.match(rootSource, /authDemoRecordsNeedSync as demoRecordsNeedSyncFromAuthSessionPersistence/);
  assert.match(rootSource, /syncAuthDemoAccounts as syncDemoAccountsFromAuthSessionPersistence/);

  const users: AuthSessionPersistenceDatabase["users"] = [];
  const studentProfiles: AuthSessionPersistenceDatabase["student_profiles"] = [];
  const userSettings: AuthSessionPersistenceDatabase["user_settings"] = [
    {
      user_id: internalSeed.id,
      language: "en",
      theme: "light",
      selected_grade: "S6",
      updated_at: "2026-06-19T00:00:00.000Z"
    }
  ];

  assert.equal(module.authDemoRecordsNeedSync?.({ users, student_profiles: studentProfiles, user_settings: userSettings }, syncOptions), true);
  module.syncAuthDemoAccounts?.(users, studentProfiles, userSettings, "2026-06-20T10:00:00.000Z", syncOptions);
  assert.equal(module.authDemoRecordsNeedSync?.({ users, student_profiles: studentProfiles, user_settings: userSettings }, syncOptions), false);

  assert.deepEqual(users.map((user) => ({
    id: user.id,
    normalizedUsername: user.normalized_username,
    normalizedEmail: user.normalized_email,
    passwordHash: user.password_hash,
    passwordSalt: user.password_salt,
    mustChange: user.password_must_change
  })), [
    {
      id: demoSeed.id,
      normalizedUsername: "demo student",
      normalizedEmail: "demo.student@example.test",
      passwordHash: "hash:demo-pass",
      passwordSalt: "sync-salt",
      mustChange: false
    },
    {
      id: internalSeed.id,
      normalizedUsername: "internal student",
      normalizedEmail: "internal.student@example.test",
      passwordHash: "hash:demo-pass",
      passwordSalt: "sync-salt",
      mustChange: false
    }
  ]);
  assert.deepEqual(studentProfiles.map((profile) => ({
    userId: profile.user_id,
    grade: profile.grade,
    curriculumTrack: profile.curriculum_track,
    region: profile.curriculum_region,
    publisher: profile.textbook_publisher,
    avatarId: profile.avatar_id
  })), [
    {
      userId: demoSeed.id,
      grade: "S3",
      curriculumTrack: "HK",
      region: "HK",
      publisher: "HK_UNITED_PRIME_MIA",
      avatarId: "delta"
    },
    {
      userId: internalSeed.id,
      grade: "P1",
      curriculumTrack: "US_CA_MATH",
      region: "US",
      publisher: "US_CA_MATH",
      avatarId: "pi"
    }
  ]);
  assert.deepEqual(userSettings.map((settings) => ({
    userId: settings.user_id,
    language: settings.language,
    theme: settings.theme,
    selectedGrade: settings.selected_grade,
    updatedAt: settings.updated_at
  })), [
    {
      userId: internalSeed.id,
      language: "en",
      theme: "light",
      selectedGrade: "S6",
      updatedAt: "2026-06-19T00:00:00.000Z"
    },
    {
      userId: demoSeed.id,
      language: "zh",
      theme: "dark",
      selectedGrade: "S3",
      updatedAt: "2026-06-20T10:00:00.000Z"
    }
  ]);

  users[0].password_hash = "hash:changed-pass";
  users[0].password_salt = "changed-salt";
  assert.equal(module.authDemoRecordsNeedSync?.({ users, student_profiles: studentProfiles, user_settings: userSettings }, syncOptions), false);
  module.syncAuthDemoAccounts?.(users, studentProfiles, userSettings, "2026-06-20T11:00:00.000Z", syncOptions);
  assert.equal(users[0].password_hash, "hash:changed-pass");
  assert.equal(users[0].password_salt, "changed-salt");
  assert.equal(users[0].session_revision, 1);

  users[0].password_hash = "";
  assert.equal(module.authDemoRecordsNeedSync?.({ users, student_profiles: studentProfiles, user_settings: userSettings }, syncOptions), true);
  module.syncAuthDemoAccounts?.(users, studentProfiles, userSettings, "2026-06-20T12:00:00.000Z", syncOptions);
  assert.equal(users[0].password_hash, "hash:demo-pass");
  assert.equal(users[0].password_salt, "sync-salt");
  assert.equal(users[0].session_revision, 2);
});

test("auth session persistence owns bootstrap admin helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthDemoSeedBoundaryModule;

  assert.equal(typeof module.authBootstrapAdminInput, "function");
  assert.equal(typeof module.authBootstrapAdminNeedsSync, "function");
  assert.equal(typeof module.syncAuthBootstrapAdmin, "function");
  assert.match(persistenceSource, /export function authBootstrapAdminInput\b/);
  assert.match(persistenceSource, /export function authBootstrapAdminNeedsSync\b/);
  assert.match(persistenceSource, /export function syncAuthBootstrapAdmin\b/);
  assert.doesNotMatch(rootSource, /function bootstrapAdminInput\b/);
  assert.doesNotMatch(rootSource, /function bootstrapAdminNeedsSync\b/);
  assert.doesNotMatch(rootSource, /function syncBootstrapAdmin\b/);
  assert.match(rootSource, /authBootstrapAdminInput as bootstrapAdminInputFromAuthSessionPersistence/);
  assert.match(rootSource, /authBootstrapAdminNeedsSync as bootstrapAdminNeedsSyncFromAuthSessionPersistence/);
  assert.match(rootSource, /syncAuthBootstrapAdmin as syncBootstrapAdminFromAuthSessionPersistence/);

  const input = module.authBootstrapAdminInput?.({
    MAIS_BOOTSTRAP_ADMIN_EMAIL: " admin@example.test ",
    MAIS_BOOTSTRAP_ADMIN_PASSWORD: "admin-pass",
    MAIS_BOOTSTRAP_ADMIN_USERNAME: " Root Admin ",
    MAIS_BOOTSTRAP_ADMIN_NAME: " Dr. Admin "
  });
  assert.deepEqual(input, {
    username: "Root Admin",
    email: "admin@example.test",
    name: "Dr. Admin",
    password: "admin-pass"
  });
  assert.equal(module.authBootstrapAdminInput?.({
    MAIS_BOOTSTRAP_ADMIN_EMAIL: "not-an-email",
    MAIS_BOOTSTRAP_ADMIN_PASSWORD: "admin-pass"
  }), null);
  assert.equal(module.authBootstrapAdminInput?.({
    MAIS_BOOTSTRAP_ADMIN_EMAIL: "admin@example.test",
    MAIS_BOOTSTRAP_ADMIN_PASSWORD: "1234"
  }), null);

  const database: AuthSessionPersistenceDatabase = {
    users: [],
    student_profiles: [],
    user_settings: [],
    lesson_progress: []
  };
  assert.equal(module.authBootstrapAdminNeedsSync?.(database, input ?? null), true);
  module.syncAuthBootstrapAdmin?.(
    database.users,
    database.student_profiles,
    database.user_settings,
    "2026-06-20T10:00:00.000Z",
    input ?? null,
    {
      hashPassword: (password) => ({ hash: `hash:${password}`, salt: "admin-salt" })
    }
  );
  assert.equal(module.authBootstrapAdminNeedsSync?.(database, input ?? null), false);
  assert.deepEqual(database.users, [
    {
      id: "admin-f5f529fdda4b9140",
      username: "Root Admin",
      normalized_username: "root admin",
      email: "admin@example.test",
      normalized_email: "admin@example.test",
      password_hash: "hash:admin-pass",
      password_salt: "admin-salt",
      password_must_change: false,
      session_revision: 1,
      disabled_at: null,
      role: "admin",
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
  assert.deepEqual(database.student_profiles, [
    {
      user_id: "admin-f5f529fdda4b9140",
      name: "Dr. Admin",
      grade: "S3",
      curriculum_track: "HK",
      curriculum_region: "HK",
      textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
      avatar_id: "theta"
    }
  ]);
  assert.deepEqual(database.user_settings, [
    {
      user_id: "admin-f5f529fdda4b9140",
      language: "en",
      theme: "dark",
      selected_grade: "S3",
      updated_at: "2026-06-20T10:00:00.000Z"
    }
  ]);

  module.syncAuthBootstrapAdmin?.(
    database.users,
    database.student_profiles,
    database.user_settings,
    "2026-06-21T10:00:00.000Z",
    input ?? null,
    {
      hashPassword: (password) => ({ hash: `changed:${password}`, salt: "changed-salt" })
    }
  );
  assert.equal(database.users.length, 1);
  assert.equal(database.users[0]?.password_hash, "hash:admin-pass");
});

test("auth session persistence owns fixed example account scope helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthDemoSeedBoundaryModule;
  const fixedSeed: AuthDemoAccountSeed = {
    id: "fixed-demo-student",
    username: "Fixed Student",
    email: "fixed.student@example.test",
    role: "student",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "delta"
  };
  const internalSeed: AuthDemoAccountSeed = {
    id: "internal-demo-student",
    username: "Internal Student",
    email: "internal.student@example.test",
    role: "student",
    grade: "P1",
    curriculumTrack: "US_CA_MATH",
    avatarId: "pi"
  };
  const fixedScope: AuthFixedExampleScope = {
    grade: "S4",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_UNITED_PRIME_MIA"
    },
    language: "zh"
  };
  const internalScope: AuthFixedExampleScope = {
    grade: "P1",
    curriculumProfile: {
      region: "US",
      publisher: "US_CA_MATH"
    },
    language: "en"
  };
  const fixedExampleScopeForUserId = (userId: string) => {
    if (userId === fixedSeed.id) return fixedScope;
    if (userId === internalSeed.id) return internalScope;
    return null;
  };
  const internalExampleAccountSeedForUserId = (userId: string) => userId === internalSeed.id ? internalSeed : null;
  const database: AuthSessionPersistenceDatabase = {
    users: [
      {
        id: fixedSeed.id,
        username: "Fixed Student",
        normalized_username: "fixed student",
        role: "student",
        password_hash: "hash",
        password_salt: "salt"
      },
      {
        id: internalSeed.id,
        username: "Internal Student",
        normalized_username: "internal student",
        role: "student",
        password_hash: "hash",
        password_salt: "salt"
      }
    ],
    student_profiles: [
      {
        user_id: fixedSeed.id,
        name: "Old Fixed",
        grade: "S3",
        curriculum_track: "HK",
        curriculum_region: "HK",
        avatar_id: "invalid-avatar"
      },
      {
        user_id: internalSeed.id,
        name: "Internal Student",
        grade: "P1",
        curriculum_track: "US_CA_MATH",
        curriculum_region: "US",
        textbook_publisher: "US_CA_MATH",
        avatar_id: "pi"
      }
    ],
    user_settings: [
      {
        user_id: internalSeed.id,
        language: "en",
        theme: "light",
        selected_grade: "S6",
        updated_at: "2026-06-19T00:00:00.000Z"
      }
    ],
    lesson_progress: []
  };
  const options = { fixedExampleScopeForUserId, internalExampleAccountSeedForUserId };

  assert.equal(typeof module.authFixedExampleAccountNeedsSync, "function");
  assert.equal(typeof module.applyAuthFixedExampleAccountScope, "function");
  assert.match(persistenceSource, /export function authFixedExampleAccountNeedsSync\b/);
  assert.match(persistenceSource, /export function applyAuthFixedExampleAccountScope\b/);
  assert.doesNotMatch(rootSource, /function fixedExampleAccountNeedsSync\b/);
  assert.doesNotMatch(rootSource, /function applyFixedExampleAccountScope\b/);
  assert.doesNotMatch(rootSource, /authFixedExampleAccountNeedsSync as fixedExampleAccountNeedsSyncFromAuthSessionPersistence/);
  assert.match(rootSource, /applyAuthFixedExampleAccountScope as applyFixedExampleAccountScopeFromAuthSessionPersistence/);

  assert.equal(module.authFixedExampleAccountNeedsSync?.(database, fixedSeed.id, options), true);
  assert.equal(module.applyAuthFixedExampleAccountScope?.(database, "missing-user", options), null);
  assert.equal(module.authFixedExampleAccountNeedsSync?.(database, "missing-user", options), false);

  const fixedUser = module.applyAuthFixedExampleAccountScope?.(database, fixedSeed.id, {
    ...options,
    now: "2026-06-20T10:00:00.000Z"
  });
  assert.equal(fixedUser?.id, fixedSeed.id);
  assert.deepEqual(database.student_profiles.find((profile) => profile.user_id === fixedSeed.id), {
    user_id: fixedSeed.id,
    name: "Fixed Student",
    grade: "S4",
    curriculum_track: "HK",
    curriculum_region: "HK",
    textbook_publisher: "HK_UNITED_PRIME_MIA",
    avatar_id: "delta"
  });
  assert.deepEqual(database.user_settings.find((settings) => settings.user_id === fixedSeed.id), {
    user_id: fixedSeed.id,
    language: "zh",
    theme: "dark",
    selected_grade: "S4",
    updated_at: "2026-06-20T10:00:00.000Z"
  });
  assert.equal(module.authFixedExampleAccountNeedsSync?.(database, fixedSeed.id, options), false);

  const internalUser = module.applyAuthFixedExampleAccountScope?.(database, internalSeed.id, {
    ...options,
    now: "2026-06-21T10:00:00.000Z"
  });
  assert.equal(internalUser?.id, internalSeed.id);
  assert.deepEqual(database.user_settings.find((settings) => settings.user_id === internalSeed.id), {
    user_id: internalSeed.id,
    language: "en",
    theme: "light",
    selected_grade: "S6",
    updated_at: "2026-06-21T10:00:00.000Z"
  });
});

test("auth session persistence owns storage-free example account records for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthDemoSeedBoundaryModule;
  const fixedSeed: AuthDemoAccountSeed = {
    id: "fixed-demo-student",
    username: "Fixed Student",
    email: "fixed.student@example.test",
    role: "student",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "delta"
  };
  const teacherSeed: AuthDemoAccountSeed = {
    id: "fixed-demo-teacher",
    username: "Fixed Teacher",
    email: "fixed.teacher@example.test",
    role: "teacher",
    grade: "S4",
    curriculumTrack: "HK",
    avatarId: "sigma"
  };
  const fixedScope: AuthFixedExampleScope = {
    grade: "S4",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_UNITED_PRIME_MIA"
    },
    language: "zh"
  };
  const fixedExampleScopeForUserId = (userId: string) => userId === fixedSeed.id ? fixedScope : null;

  assert.equal(typeof module.authStorageFreeExampleAccountRecords, "function");
  assert.match(persistenceSource, /export function authStorageFreeExampleAccountRecords\b/);
  assert.doesNotMatch(rootSource, /function storageFreeExampleAccountRecords\b/);
  assert.match(rootSource, /authStorageFreeExampleAccountRecords as storageFreeExampleAccountRecordsFromAuthSessionPersistence/);

  assert.equal(module.authStorageFreeExampleAccountRecords?.("missing", {
    exampleAccountSeeds: [fixedSeed, teacherSeed],
    fixedExampleScopeForUserId,
    now: "2026-06-20T10:00:00.000Z"
  }), null);

  assert.deepEqual(module.authStorageFreeExampleAccountRecords?.(fixedSeed.id, {
    exampleAccountSeeds: [fixedSeed, teacherSeed],
    fixedExampleScopeForUserId,
    now: "2026-06-20T10:00:00.000Z"
  }), {
    user: {
      id: fixedSeed.id,
      username: "Fixed Student",
      normalized_username: "fixed student",
      email: "fixed.student@example.test",
      normalized_email: "fixed.student@example.test",
      password_hash: "",
      password_salt: "",
      password_must_change: false,
      session_revision: 1,
      disabled_at: null,
      role: "student",
      created_at: "2026-06-20T10:00:00.000Z"
    },
    profile: {
      user_id: fixedSeed.id,
      name: "Fixed Student",
      grade: "S4",
      curriculum_track: "HK",
      curriculum_region: "HK",
      textbook_publisher: "HK_UNITED_PRIME_MIA",
      avatar_id: "delta"
    },
    settings: {
      user_id: fixedSeed.id,
      language: "zh",
      theme: "dark",
      selected_grade: "S4",
      updated_at: "2026-06-20T10:00:00.000Z"
    }
  });

  assert.deepEqual(module.authStorageFreeExampleAccountRecords?.(teacherSeed.id, {
    exampleAccountSeeds: [fixedSeed, teacherSeed],
    fixedExampleScopeForUserId,
    now: "2026-06-20T10:00:00.000Z"
  })?.profile, {
    user_id: teacherSeed.id,
    name: "Fixed Teacher",
    grade: "S4",
    curriculum_track: "HK",
    curriculum_region: "HK",
    textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
    avatar_id: "sigma"
  });
});

test("auth session persistence owns storage-free example database adapter for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthDemoSeedBoundaryModule;
  const fixedSeed: AuthDemoAccountSeed = {
    id: "fixed-demo-student",
    username: "Fixed Student",
    email: "fixed.student@example.test",
    role: "student",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "delta"
  };
  const fixedScope: AuthFixedExampleScope = {
    grade: "S4",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_UNITED_PRIME_MIA"
    },
    language: "zh"
  };
  const fixedExampleScopeForUserId = (userId: string) => userId === fixedSeed.id ? fixedScope : null;
  const database = {
    extra_table: [{ id: "preserved" }],
    users: [
      {
        id: fixedSeed.id,
        username: "Old Fixed",
        normalized_username: "old fixed",
        role: "student" as const
      },
      {
        id: "other-user",
        username: "Other",
        normalized_username: "other",
        role: "student" as const
      }
    ],
    student_profiles: [
      {
        user_id: fixedSeed.id,
        name: "Old Fixed",
        grade: "S3" as const
      },
      {
        user_id: "other-user",
        name: "Other",
        grade: "S3" as const
      }
    ],
    user_settings: [
      {
        user_id: fixedSeed.id,
        language: "en" as const,
        theme: "light" as const,
        selected_grade: "S3" as const,
        updated_at: "2026-06-01T00:00:00.000Z"
      },
      {
        user_id: "other-user",
        language: "en" as const,
        theme: "dark" as const,
        selected_grade: "S3" as const,
        updated_at: "2026-06-01T00:00:00.000Z"
      }
    ]
  };

  assert.equal(typeof module.authStorageFreeExampleDatabase, "function");
  assert.match(persistenceSource, /export function authStorageFreeExampleDatabase\b/);
  assert.match(rootSource, /authStorageFreeExampleDatabase as storageFreeExampleDatabaseFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /function databaseWithStorageFreeExampleAccount\b/);

  assert.equal(module.authStorageFreeExampleDatabase?.(database, "missing", {
    exampleAccountSeeds: [fixedSeed],
    fixedExampleScopeForUserId,
    now: "2026-06-20T10:00:00.000Z"
  }), null);

  const withExample = module.authStorageFreeExampleDatabase?.(database, fixedSeed.id, {
    exampleAccountSeeds: [fixedSeed],
    fixedExampleScopeForUserId,
    now: "2026-06-20T10:00:00.000Z"
  });

  assert.deepEqual(withExample?.extra_table, [{ id: "preserved" }]);
  assert.deepEqual(withExample?.users.map((user) => user.id), [fixedSeed.id, "other-user"]);
  assert.deepEqual(withExample?.student_profiles.map((profile) => profile.user_id), [fixedSeed.id, "other-user"]);
  assert.deepEqual(withExample?.user_settings.map((settings) => settings.user_id), [fixedSeed.id, "other-user"]);
  assert.deepEqual(withExample?.student_profiles[0], {
    user_id: fixedSeed.id,
    name: "Fixed Student",
    grade: "S4",
    curriculum_track: "HK",
    curriculum_region: "HK",
    textbook_publisher: "HK_UNITED_PRIME_MIA",
    avatar_id: "delta"
  });
  assert.deepEqual(withExample?.user_settings[0], {
    user_id: fixedSeed.id,
    language: "zh",
    theme: "dark",
    selected_grade: "S4",
    updated_at: "2026-06-20T10:00:00.000Z"
  });
  assert.equal(database.users[0]?.username, "Old Fixed");
});

test("auth session persistence owns storage-free example authenticated user for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/authSessionPersistence") as AuthDemoSeedBoundaryModule;
  const fixedSeed: AuthDemoAccountSeed = {
    id: "fixed-demo-student",
    username: "Fixed Student",
    email: "fixed.student@example.test",
    role: "student",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "delta"
  };
  const fixedScope: AuthFixedExampleScope = {
    grade: "S4",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_UNITED_PRIME_MIA"
    },
    language: "zh"
  };
  const fixedExampleScopeForUserId = (userId: string) => userId === fixedSeed.id ? fixedScope : null;

  assert.equal(typeof module.authStorageFreeExampleAuthenticatedUser, "function");
  assert.match(persistenceSource, /export function authStorageFreeExampleAuthenticatedUser\b/);
  assert.match(rootSource, /authStorageFreeExampleAuthenticatedUser as storageFreeExampleAuthenticatedUserFromAuthSessionPersistence/);
  assert.doesNotMatch(rootSource, /function storageFreeExampleAuthenticatedUser\(userId: string\)/);

  assert.equal(module.authStorageFreeExampleAuthenticatedUser?.("missing", {
    exampleAccountSeeds: [fixedSeed],
    fixedExampleScopeForUserId,
    mediaObjectUrlForKey: () => null,
    now: "2026-06-20T10:00:00.000Z"
  }), null);

  const session = module.authStorageFreeExampleAuthenticatedUser?.(fixedSeed.id, {
    exampleAccountSeeds: [fixedSeed],
    fixedExampleScopeForUserId,
    mediaObjectUrlForKey: (objectKey) => `/media/${objectKey}`,
    now: "2026-06-20T10:00:00.000Z"
  });

  assert.equal(session?.user.id, fixedSeed.id);
  assert.equal(session?.user.name, "Fixed Student");
  assert.equal(session?.user.curriculumTrack, "HK");
  assert.deepEqual(session?.user.curriculumProfile, fixedScope.curriculumProfile);
  assert.equal(session?.settings.language, "zh");
  assert.equal(session?.settings.selectedGrade, "S4");
});

test("auth session persistence authenticates flexible fixed example accounts", async () => {
  const publicDatabase = createDatabase();
  const store = createTestStore(publicDatabase, {
    demoAccountSeeds: [
      {
        id: "fixed-demo-student",
        username: "Demo Student",
        email: "demo.student@example.test",
        role: "student",
        grade: "S3",
        curriculumTrack: "HK",
        avatarId: "delta"
      },
      {
        id: "demo-parent",
        username: "Demo Parent",
        email: "demo.parent@example.test",
        role: "parent",
        grade: "S3",
        curriculumTrack: "HK",
        avatarId: "theta"
      }
    ],
    demoPassword: "demo-pass",
    fixedExampleScopeForUserId: (userId) => userId === "fixed-demo-student"
      ? {
        grade: "S4",
        curriculumProfile: {
          region: "HK",
          publisher: "HK_UNITED_PRIME_MIA"
        },
        language: "zh"
      }
      : null,
    publicContentDatabaseForExampleLogin: () => publicDatabase
  });

  const result = await store.authenticateFlexibleExampleAccountForLogin({
    username: " demo.student@example.test ",
    password: "demo-pass",
    curriculumProfile: {
      region: "HK",
      publisher: "HK_UNITED_PRIME_MIA"
    },
    selectedGrade: "S6",
    language: "zh-Hans",
    theme: "light"
  });

  assert.equal(result.status, "authenticated");
  assert.equal(result.status === "authenticated" ? result.session.user.id : null, "fixed-demo-student");
  assert.equal(result.status === "authenticated" ? result.session.user.grade : null, "S4");
  assert.deepEqual(result.status === "authenticated" ? result.session.user.curriculumProfile : null, {
    region: "HK",
    publisher: "HK_UNITED_PRIME_MIA"
  });
  assert.deepEqual(result.status === "authenticated" ? result.session.settings : null, {
    language: "zh-Hans",
    theme: "light",
    selectedGrade: "S4"
  });
  assert.equal(result.status === "authenticated" ? result.database : null, publicDatabase);

  assert.deepEqual(await store.authenticateFlexibleExampleAccountForLogin({
    username: "missing@example.test",
    password: "demo-pass"
  }), { status: "not-example-account" });
  assert.deepEqual(await store.authenticateFlexibleExampleAccountForLogin({
    username: "demo.student@example.test",
    password: "wrong-pass"
  }), { status: "invalid" });
  assert.deepEqual(await store.authenticateFlexibleExampleAccountForLogin({
    username: "demo.parent@example.test",
    password: "demo-pass"
  }), { status: "invalid" });
});

test("flexible fixed example login authenticates the persisted active user and never fabricates revision or password state", async () => {
  const fixedSeed: AuthDemoAccountSeed = {
    id: "fixed-demo-student",
    username: "Demo Student",
    email: "demo.student@example.test",
    role: "student",
    grade: "S3",
    curriculumTrack: "HK",
    avatarId: "delta"
  };
  const persistedDatabase = createDatabase();
  persistedDatabase.users.push({
    id: fixedSeed.id,
    username: fixedSeed.username,
    normalized_username: "demo student",
    email: fixedSeed.email,
    normalized_email: fixedSeed.email,
    password_hash: "hash:demo-pass",
    password_salt: "persisted-salt",
    password_must_change: false,
    session_revision: 7,
    disabled_at: null,
    role: "student",
    created_at: generatedAt.toISOString()
  });
  persistedDatabase.student_profiles.push({
    user_id: fixedSeed.id,
    name: fixedSeed.username,
    grade: "S3",
    curriculum_track: "HK",
    curriculum_region: "HK",
    textbook_publisher: "HK_UNITED_PRIME_MIA",
    avatar_id: "delta"
  });
  persistedDatabase.user_settings.push({
    user_id: fixedSeed.id,
    language: "en",
    theme: "dark",
    selected_grade: "S3",
    updated_at: generatedAt.toISOString()
  });
  const publicDatabase = createDatabase();
  const store = createTestStore(persistedDatabase, {
    demoAccountSeeds: [fixedSeed],
    demoPassword: "demo-pass",
    fixedExampleScopeForUserId: (userId) => userId === fixedSeed.id
      ? {
        grade: "S4",
        curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
        language: "en"
      }
      : null,
    passwordMatches: (password, user) => user.password_hash === `hash:${password}`,
    publicContentDatabaseForExampleLogin: () => publicDatabase
  });

  const current = await store.authenticateFlexibleExampleAccountForLogin({
    username: fixedSeed.email,
    password: "demo-pass",
    curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }
  });
  assert.equal(current.status, "authenticated");
  assert.equal(current.status === "authenticated" ? current.sessionRevision : null, 7);
  assert.equal(current.status === "authenticated" ? current.database : null, publicDatabase);

  const persistedUser = persistedDatabase.users.find((user) => user.id === fixedSeed.id);
  assert.ok(persistedUser);
  persistedUser.disabled_at = "2026-06-20T10:30:00.000Z";
  assert.deepEqual(await store.authenticateFlexibleExampleAccountForLogin({
    username: fixedSeed.email,
    password: "demo-pass",
    curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }
  }), { status: "invalid" });

  persistedUser.disabled_at = null;
  persistedUser.password_hash = "hash:changed-pass";
  const changed = await store.authenticateFlexibleExampleAccountForLogin({
    username: fixedSeed.email,
    password: "changed-pass",
    curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }
  });
  assert.equal(changed.status, "authenticated");
  assert.equal(changed.status === "authenticated" ? changed.sessionRevision : null, 7);
  assert.deepEqual(await store.authenticateFlexibleExampleAccountForLogin({
    username: fixedSeed.email,
    password: "demo-pass",
    curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }
  }), { status: "invalid" });
});

test("auth session persistence completes missing student curriculum setup", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.completeStudentCurriculumTrackSelection({
    username: "setup@example.com",
    password: "current-password",
    curriculumTrack: "HK",
    selectedGrade: "S4",
    language: "zh-Hans",
    theme: "light"
  });

  assert.equal(result.status, "authenticated");
  assert.equal(result.status === "authenticated" ? result.session.user.id : null, "student-setup");
  assert.equal(result.status === "authenticated" ? result.session.user.curriculumTrack : null, "HK");
  assert.equal(result.status === "authenticated" ? result.session.user.grade : null, "S4");
  assert.deepEqual(result.status === "authenticated" ? result.session.settings : null, {
    language: "zh-Hans",
    theme: "light",
    selectedGrade: "S4"
  });
  assert.deepEqual(database.student_profiles.find((profile) => profile.user_id === "student-setup"), {
    user_id: "student-setup",
    name: "Setup Student",
    grade: "S4",
    curriculum_track: "HK",
    curriculum_region: "HK",
    textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
    avatar_id: "delta"
  });
});

test("auth session persistence preserves existing student curriculum setup", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.completeStudentCurriculumTrackSelection({
    username: "student@example.com",
    password: "current-password",
    curriculumTrack: "US_CA_MATH",
    selectedGrade: "S5",
    language: "zh-Hans",
    theme: "light"
  });

  assert.equal(result.status, "authenticated");
  assert.equal(result.status === "authenticated" ? result.session.user.curriculumTrack : null, "HK");
  assert.equal(result.status === "authenticated" ? result.session.user.grade : null, "S3");
  assert.equal(result.status === "authenticated" ? result.session.settings.selectedGrade : null, "S5");
  assert.equal(database.student_profiles.find((profile) => profile.user_id === "student-1")?.curriculum_track, "HK");
  assert.equal(database.student_profiles.find((profile) => profile.user_id === "student-1")?.grade, "S3");

  assert.deepEqual(await store.completeStudentCurriculumTrackSelection({
    username: "student@example.com",
    password: "wrong-password",
    curriculumTrack: "HK"
  }), { status: "invalid" });
  assert.deepEqual(await store.completeStudentCurriculumTrackSelection({
    username: "setup@example.com",
    password: "current-password"
  }), { status: "invalid" });
});

test("auth session persistence creates parent users through snapshot storage", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.createParentUser({
    name: "  Parent   One  ",
    email: "Parent@Example.com",
    password: "parent-password",
    language: "zh",
    theme: "light"
  });

  assert.equal(result.status, "created");
  assert.equal(result.status === "created" ? result.session.user.id : null, "parent-generated-id");
  assert.equal(result.status === "created" ? result.session.user.name : null, "Parent One");
  assert.equal(result.status === "created" ? result.session.user.username : null, "Parent@Example.com");
  assert.equal(result.status === "created" ? result.session.user.email : null, "Parent@Example.com");
  assert.equal(result.status === "created" ? result.session.user.role : null, "parent");
  assert.equal(result.status === "created" ? result.session.user.avatarId : null, "theta");
  assert.deepEqual(result.status === "created" ? result.session.settings : null, {
    language: "zh",
    theme: "light",
    selectedGrade: "S3"
  });

  assert.deepEqual(database.users.find((user) => user.id === "parent-generated-id"), {
    id: "parent-generated-id",
    username: "Parent@Example.com",
    normalized_username: "parent@example.com",
    email: "Parent@Example.com",
    normalized_email: "parent@example.com",
    password_hash: "hash:parent-password",
    password_salt: "salt:parent-password",
    password_must_change: false,
    session_revision: 1,
    disabled_at: null,
    role: "parent",
    created_at: generatedAt.toISOString()
  });
  assert.deepEqual(database.student_profiles.find((profile) => profile.user_id === "parent-generated-id"), {
    user_id: "parent-generated-id",
    name: "Parent One",
    grade: "S3",
    curriculum_track: "HK",
    curriculum_region: "HK",
    textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
    avatar_id: "theta"
  });
  assert.deepEqual(database.user_settings.find((settings) => settings.user_id === "parent-generated-id"), {
    user_id: "parent-generated-id",
    language: "zh",
    theme: "light",
    selected_grade: "S3",
    updated_at: generatedAt.toISOString()
  });

  assert.deepEqual(await store.createParentUser({
    name: "Another Parent",
    email: "parent@example.com",
    password: "parent-password"
  }), { status: "duplicate" });
});

test("auth session persistence rejects invalid parent account creation", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.createParentUser({
    name: " ",
    email: "parent@example.com",
    password: "parent-password"
  }), { status: "invalid" });
  assert.deepEqual(await store.createParentUser({
    name: "Parent",
    email: "not-an-email",
    password: "parent-password"
  }), { status: "invalid" });
  assert.deepEqual(await store.createParentUser({
    name: "Parent",
    password: "parent-password"
  }), { status: "invalid" });
  assert.deepEqual(await store.createParentUser({
    name: "Parent",
    email: "parent@example.com",
    password: "1234"
  }), { status: "invalid" });
});

test("auth session persistence creates student users and seeds lesson progress", async () => {
  const database = createDatabaseWithLessonProgress();
  const store = createTestStore(database, {
    initialStudentLessonProgressRecords: (userId, nowIso) => [
      {
        user_id: userId,
        topic_id: "linear-functions",
        lesson_slug: "linear-functions",
        status: "not-started",
        mastery: 0,
        started_at: null,
        completed_at: null,
        duration_seconds: null,
        checklist_state: {},
        updated_at: nowIso
      }
    ]
  });

  const result = await store.createStudentUser({
    name: "  Student   Two ",
    username: " student-two ",
    email: "StudentTwo@Example.com",
    password: "student-password",
    grade: "S2",
    curriculumTrack: "HK",
    language: "zh-Hans",
    theme: "light"
  });

  assert.equal(result.status, "created");
  assert.equal(result.status === "created" ? result.session.user.id : null, "student-generated-id");
  assert.equal(result.status === "created" ? result.session.user.name : null, "Student   Two");
  assert.equal(result.status === "created" ? result.session.user.username : null, "student-two");
  assert.equal(result.status === "created" ? result.session.user.email : null, "StudentTwo@Example.com");
  assert.equal(result.status === "created" ? result.session.user.role : null, "student");
  assert.equal(result.status === "created" ? result.session.user.curriculumTrack : null, "HK");
  assert.deepEqual(result.status === "created" ? result.session.settings : null, {
    language: "zh-Hans",
    theme: "light",
    selectedGrade: "S2"
  });
  assert.deepEqual(database.users.find((user) => user.id === "student-generated-id"), {
    id: "student-generated-id",
    username: "student-two",
    normalized_username: "student-two",
    email: "StudentTwo@Example.com",
    normalized_email: "studenttwo@example.com",
    password_hash: "hash:student-password",
    password_salt: "salt:student-password",
    session_revision: 1,
    disabled_at: null,
    role: "student",
    created_at: generatedAt.toISOString()
  });
  assert.deepEqual(database.student_profiles.find((profile) => profile.user_id === "student-generated-id"), {
    user_id: "student-generated-id",
    name: "Student   Two",
    grade: "S2",
    curriculum_track: "HK",
    curriculum_region: "HK",
    textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
    parent_invite_code: "MAIS-INVITE-CODE",
    avatar_id: "delta"
  });
  assert.deepEqual(database.lesson_progress, [
    {
      user_id: "student-generated-id",
      topic_id: "linear-functions",
      lesson_slug: "linear-functions",
      status: "not-started",
      mastery: 0,
      started_at: null,
      completed_at: null,
      duration_seconds: null,
      checklist_state: {},
      updated_at: generatedAt.toISOString()
    }
  ]);

  assert.deepEqual(await store.createStudentUser({
    name: "Duplicate Student",
    username: "student-two",
    password: "student-password",
    grade: "S2",
    curriculumTrack: "HK"
  }), { status: "duplicate" });
});

test("auth session persistence creates teacher users without student progress rows", async () => {
  const database = createDatabaseWithLessonProgress();
  const store = createTestStore(database);

  const result = await store.createTeacherUser({
    name: "  Teacher   Two ",
    username: "TeacherTwo@Example.com",
    password: "teacher-password",
    grade: "S4",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    theme: "light"
  });

  assert.equal(result.status, "created");
  assert.equal(result.status === "created" ? result.session.user.id : null, "teacher-generated-id");
  assert.equal(result.status === "created" ? result.session.user.username : null, "TeacherTwo@Example.com");
  assert.equal(result.status === "created" ? result.session.user.email : null, "TeacherTwo@Example.com");
  assert.equal(result.status === "created" ? result.session.user.role : null, "teacher");
  assert.equal(result.status === "created" ? result.session.user.curriculumTrack : null, "MAINLAND_PEP_HIGH");
  assert.deepEqual(result.status === "created" ? result.session.settings : null, {
    language: "zh-Hans",
    theme: "light",
    selectedGrade: "S4"
  });
  assert.deepEqual(database.student_profiles.find((profile) => profile.user_id === "teacher-generated-id"), {
    user_id: "teacher-generated-id",
    name: "Teacher   Two",
    grade: "S4",
    curriculum_track: "MAINLAND_PEP_HIGH",
    curriculum_region: "MAINLAND",
    textbook_publisher: "MAINLAND_PEP",
    avatar_id: "sigma"
  });
  assert.deepEqual(database.lesson_progress, []);
});

test("auth session persistence rejects invalid student and teacher account creation", async () => {
  const store = createTestStore(createDatabaseWithLessonProgress(), {
    isGradeAllowedForCurriculumProfile: (grade) => grade !== "S6"
  });

  assert.deepEqual(await store.createStudentUser({
    name: " ",
    username: "student-three",
    password: "student-password",
    grade: "S2",
    curriculumTrack: "HK"
  }), { status: "invalid" });
  assert.deepEqual(await store.createStudentUser({
    name: "Student Three",
    username: "student-three",
    email: "not-an-email",
    password: "student-password",
    grade: "S2",
    curriculumTrack: "HK"
  }), { status: "invalid" });
  assert.deepEqual(await store.createStudentUser({
    name: "Student Three",
    username: "student-three",
    password: "1234",
    grade: "S2",
    curriculumTrack: "HK"
  }), { status: "invalid" });
  assert.deepEqual(await store.createTeacherUser({
    name: "Teacher Three",
    username: "teacher-three",
    password: "teacher-password",
    grade: "S6",
    curriculumTrack: "HK"
  }), { status: "invalid" });
  assert.deepEqual(await store.createTeacherUser({
    name: "Teacher Three",
    username: "teacher-three",
    password: "teacher-password",
    grade: "S2"
  }), { status: "invalid" });
});

test("auth session persistence uses hot lookup before snapshot reads", async () => {
  const hotSession: AuthSession = {
    user: {
      id: "student-hot",
      name: "Hot Student",
      username: "hot",
      avatarId: "delta",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" },
      role: "student"
    },
    settings: {
      language: "en",
      theme: "dark",
      selectedGrade: "S3"
    }
  };
  const store = createAuthSessionPersistenceStore({
    readDatabase: async () => {
      throw new Error("snapshot should not be read after hot lookup hit");
    },
    lookupBeforeRead: async (userId) => userId === "student-hot" ? hotSession : null
  });

  assert.equal(await store.getAuthenticatedUserById("student-hot"), hotSession);
});

test("auth session persistence falls back and rejects unavailable profiles", async () => {
  const fallbackSession = await createTestStore(createDatabase(), {
    fallbackAuthenticatedUser: (userId) => userId === "demo-student"
      ? {
          user: {
            id: "demo-student",
            name: "Demo Student",
            username: "demo",
            avatarId: "delta",
            grade: "S3",
            curriculumTrack: "HK",
            curriculumProfile: { region: "HK", publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" },
            role: "student"
          },
          settings: {
            language: "en",
            theme: "dark",
            selectedGrade: "S3"
          }
        }
      : null
  }).getAuthenticatedUserById("demo-student");

  assert.equal(fallbackSession?.user.id, "demo-student");
  assert.equal(await createTestStore(createDatabase()).getAuthenticatedUserById("profileless"), null);
  assert.equal(await createTestStore(createDatabase()).getAuthenticatedUserById("missing-user"), null);
});

test("auth session persistence updates settings through snapshot storage", async () => {
  const database = createDatabase();
  const jonId = "student-jon-us-ca-super";
  database.users.push({
    id: jonId,
    username: "Student Jon",
    normalized_username: "student jon",
    email: "student.jon.internal@example.edu",
    normalized_email: "student.jon.internal@example.edu",
    role: "student",
    password_hash: "hash",
    password_salt: "salt"
  });
  database.student_profiles.push({
    user_id: jonId,
    name: "Student Jon",
    grade: "P1",
    curriculum_track: "US_CA_MATH",
    curriculum_region: "US",
    textbook_publisher: "US_CA_MATH",
    avatar_id: "pi"
  });
  database.user_settings.push({
    user_id: jonId,
    language: "en",
    theme: "dark",
    selected_grade: "P1",
    updated_at: "2026-06-19T00:00:00.000Z"
  });
  const store = createTestStore(database, {
    isGradeAllowedForCurriculumProfile: (grade) => ["K", "P5", "S6"].includes(grade),
    studentSelectedGradePolicy: ({ curriculumProfile, grade, userId }) =>
      userId === jonId &&
      curriculumProfile.publisher === "US_CA_MATH" &&
      (["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"] as const).includes(grade)
  });

  const teacherSession = await store.updateUserSettings("teacher-1", {
    language: "en",
    theme: "dark",
    selectedGrade: "S6"
  });

  assert.equal(teacherSession?.settings.language, "en");
  assert.equal(teacherSession?.settings.theme, "dark");
  assert.equal(teacherSession?.settings.selectedGrade, "S6");
  assert.deepEqual(database.user_settings.find((settings) => settings.user_id === "teacher-1"), {
    user_id: "teacher-1",
    language: "en",
    theme: "dark",
    selected_grade: "S6",
    updated_at: generatedAt.toISOString()
  });

  const studentSession = await store.updateUserSettings("student-1", {
    language: "zh-Hans",
    theme: "light",
    selectedGrade: "S6"
  });

  assert.equal(studentSession?.settings.language, "zh-Hans");
  assert.equal(studentSession?.settings.theme, "light");
  assert.equal(studentSession?.settings.selectedGrade, "S3");
  assert.equal(database.user_settings.find((settings) => settings.user_id === "student-1")?.selected_grade, "S3");

  assert.equal((await store.updateUserSettings(jonId, { selectedGrade: "K" }))?.settings.selectedGrade, "K");
  assert.equal((await store.getAuthenticatedUserById(jonId))?.settings.selectedGrade, "K");
  assert.equal((await store.updateUserSettings(jonId, { selectedGrade: "P5" }))?.settings.selectedGrade, "P5");
  assert.equal((await store.getAuthenticatedUserById(jonId))?.settings.selectedGrade, "P5");
  assert.equal((await store.updateUserSettings(jonId, { selectedGrade: "S6" }))?.settings.selectedGrade, "S6");
  assert.equal((await store.getAuthenticatedUserById(jonId))?.settings.selectedGrade, "S6");
  assert.equal((await store.updateUserSettings(jonId, { selectedGrade: "P6" }))?.settings.selectedGrade, "S6");
  assert.equal((await store.updateUserSettings(jonId, { theme: "light" }))?.settings.selectedGrade, "S6");
  assert.equal(database.user_settings.find((settings) => settings.user_id === jonId)?.selected_grade, "S6");
  assert.equal(await store.updateUserSettings("missing-user", { language: "en" }), null);
});

test("auth session persistence lets hot settings update short-circuit snapshot storage", async () => {
  const hotSession: AuthSession = {
    user: {
      id: "student-hot",
      name: "Hot Student",
      username: "hot",
      avatarId: "delta",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" },
      role: "student"
    },
    settings: {
      language: "zh",
      theme: "light",
      selectedGrade: "S3"
    }
  };
  let mutated = false;
  const store = createAuthSessionPersistenceStore({
    now: () => generatedAt,
    readDatabase: async () => {
      throw new Error("snapshot should not be read after hot settings hit");
    },
    mutateDatabase: async (mutator) => {
      mutated = true;
      return mutator(createDatabase());
    },
    updateSettingsBeforeSnapshot: async (userId) => userId === "student-hot" ? hotSession : null
  });

  assert.equal(await store.updateUserSettings("student-hot", { theme: "light" }), hotSession);
  assert.equal(mutated, false);
});

test("auth session persistence updates profile names and avatar media safely", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const namedSession = await store.updateUserProfile("student-1", {
    name: "  Ada   Lovelace  ",
    avatarId: "sigma",
    avatarImageDataUrl: "data:image/png;base64,AAAA"
  });

  assert.equal(namedSession?.user.name, "Ada Lovelace");
  assert.equal(namedSession?.user.avatarId, "sigma");
  assert.equal(namedSession?.user.avatarImageDataUrl, "data:image/png;base64,AAAA");
  assert.equal(namedSession?.user.avatarImageObjectKey, undefined);

  const objectSession = await store.updateUserProfile("student-1", {
    avatarImageObject: { objectKey: "avatars/student-1-updated.webp" }
  });

  assert.equal(objectSession?.user.avatarImageObjectKey, "avatars/student-1-updated.webp");
  assert.equal(objectSession?.user.avatarImageUrl, "/media/avatars/student-1-updated.webp");
  assert.equal(objectSession?.user.avatarImageDataUrl, "/media/avatars/student-1-updated.webp");
  const profile = database.student_profiles.find((candidate) => candidate.user_id === "student-1");
  assert.equal(profile?.avatar_image_data_url, undefined);
  assert.equal(profile?.avatar_media_object_key, "avatars/student-1-updated.webp");

  assert.equal(await store.updateUserProfile("student-1", { name: "x" }), null);
  assert.equal(await store.updateUserProfile("missing-user", { name: "Ada" }), null);
});

test("auth session persistence changes authenticated passwords through snapshot storage", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const replacementPassword = `test-${randomUUID()}`;

  const result = await store.changeAuthenticatedUserPassword({
    userId: "student-1",
    currentPassword: "current-password",
    password: replacementPassword
  });

  assert.equal(result.status, "updated");
  assert.equal(result.status === "updated" ? result.session.user.id : null, "student-1");
  const user = database.users.find((candidate) => candidate.id === "student-1");
  assert.equal(user?.password_hash, `hash:${replacementPassword}`);
  assert.equal(user?.password_salt, `salt:${replacementPassword}`);
  assert.equal(user?.password_must_change, false);

  assert.deepEqual(
    await store.changeAuthenticatedUserPassword({
      userId: "student-1",
      currentPassword: "wrong-password",
      password: "another-password"
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.changeAuthenticatedUserPassword({
      userId: "student-1",
      currentPassword: "current-password",
      password: "1234"
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.changeAuthenticatedUserPassword({
      userId: "missing-user",
      currentPassword: "current-password",
      password: "another-password"
    }),
    { status: "invalid" }
  );
});

test("session-aware authentication treats legacy users as revision one and fails closed", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  assert.equal((await store.getAuthenticatedUserForSession("student-1", 1))?.user.id, "student-1");
  assert.equal(await store.getAuthenticatedUserForSession("student-1", 2), null);
  assert.equal(await store.getAuthenticatedUserForSession("missing-user", 1), null);

  const user = database.users.find((candidate) => candidate.id === "student-1");
  assert.ok(user);
  user.disabled_at = generatedAt.toISOString();

  assert.equal(await store.getAuthenticatedUserForSession("student-1", 1), null);
  assert.equal(await store.getActiveUserSessionRevision("student-1"), null);
  assert.deepEqual(await store.authenticateUserForLogin("student-one", "current-password"), { status: "invalid" });
});

test("session admission and issuance fall back to revision-aware snapshot state when hot auth opts out", async () => {
  const database = createDatabase();
  const store = createTestStore(database, {
    lookupSessionBeforeRead: async () => undefined,
    lookupSessionRevisionBeforeRead: async () => undefined
  });

  assert.equal((await store.getAuthenticatedUserForSession("student-1", 1))?.user.id, "student-1");
  assert.equal(await store.getAuthenticatedUserForSession("student-1", 2), null);
  assert.equal(await store.getActiveUserSessionRevision("student-1"), 1);

  database.users.find((candidate) => candidate.id === "student-1")!.disabled_at = generatedAt.toISOString();
  assert.equal(await store.getAuthenticatedUserForSession("student-1", 1), null);
  assert.equal(await store.getActiveUserSessionRevision("student-1"), null);
});

test("password changes and resets atomically increment the stored session revision", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const changed = await store.changeAuthenticatedUserPassword({
    userId: "student-1",
    currentPassword: "current-password",
    password: "changed-password"
  });
  assert.equal(changed.status, "updated");
  assert.equal(changed.status === "updated" ? changed.sessionRevision : null, 2);
  assert.equal(database.users.find((candidate) => candidate.id === "student-1")?.session_revision, 2);
  assert.equal(await store.getAuthenticatedUserForSession("student-1", 1), null);
  assert.equal((await store.getAuthenticatedUserForSession("student-1", 2))?.user.id, "student-1");

  const resetDatabase = createDatabase();
  const resetStore = createTestStore(resetDatabase);
  const reset = await resetStore.resetUserPassword("active", "reset-password");
  assert.equal(reset.status, "reset");
  assert.equal(reset.status === "reset" ? reset.sessionRevision : null, 2);
  assert.equal(resetDatabase.users.find((candidate) => candidate.id === "student-1")?.session_revision, 2);
  assert.equal(await resetStore.getAuthenticatedUserForSession("student-1", 1), null);
  assert.equal((await resetStore.getAuthenticatedUserForSession("student-1", 2))?.user.id, "student-1");
});

test("logout-all and disable state transitions each revoke every previously minted session", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  assert.deepEqual(await store.revokeAllUserSessions("student-1"), {
    status: "revoked",
    sessionRevision: 2
  });
  assert.equal(await store.getAuthenticatedUserForSession("student-1", 1), null);

  assert.deepEqual(await store.setUserDisabledState("student-1", true), {
    status: "updated",
    disabledAt: generatedAt.toISOString(),
    sessionRevision: 3
  });
  assert.equal(await store.getAuthenticatedUserForSession("student-1", 2), null);
  assert.deepEqual(await store.authenticateUserForLogin("student-one", "current-password"), { status: "invalid" });

  assert.deepEqual(await store.setUserDisabledState("student-1", false), {
    status: "updated",
    disabledAt: null,
    sessionRevision: 4
  });
  assert.equal(await store.getAuthenticatedUserForSession("student-1", 3), null);
  assert.equal((await store.getAuthenticatedUserForSession("student-1", 4))?.user.id, "student-1");
});

test("password change, reset, and logout-all revoke two independently minted device tokens", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = "two-device-session-revision-test-secret";
  const database = createDatabase();
  const store = createTestStore(database);

  const authenticateToken = async (token: string) => {
    const payload = await verifySessionToken(token);
    return payload ? store.getAuthenticatedUserForSession(payload.sub, payload.sr) : null;
  };
  const mintPair = async (sessionRevision: number) => Promise.all([
    createSessionToken({ userId: "student-1", sessionRevision }),
    createSessionToken({ userId: "student-1", sessionRevision })
  ]);

  try {
    const passwordDevices = await mintPair(1);
    assert.ok(await authenticateToken(passwordDevices[0]));
    assert.ok(await authenticateToken(passwordDevices[1]));
    assert.equal((await store.changeAuthenticatedUserPassword({
      userId: "student-1",
      currentPassword: "current-password",
      password: "changed-password"
    })).status, "updated");
    assert.equal(await authenticateToken(passwordDevices[0]), null);
    assert.equal(await authenticateToken(passwordDevices[1]), null);

    const resetDevices = await mintPair(2);
    assert.equal((await store.resetUserPassword("active", "reset-password")).status, "reset");
    assert.equal(await authenticateToken(resetDevices[0]), null);
    assert.equal(await authenticateToken(resetDevices[1]), null);

    const logoutDevices = await mintPair(3);
    assert.equal((await store.revokeAllUserSessions("student-1")).status, "revoked");
    assert.equal(await authenticateToken(logoutDevices[0]), null);
    assert.equal(await authenticateToken(logoutDevices[1]), null);

    const current = await createSessionToken({ userId: "student-1", sessionRevision: 4 });
    assert.equal((await authenticateToken(current))?.user.id, "student-1");
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = previousSecret;
  }
});

test("auth session persistence creates password reset requests without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const result = await createTestStore(database).createPasswordResetRequest(" Student@Example.com ");

  assert.deepEqual(result, {
    token: "plain-reset-token",
    expiresAt: "2026-06-20T10:30:00.000Z",
    email: "student@example.com",
    username: "student-one"
  });
  assert.deepEqual(database.password_reset_tokens, [
    {
      id: "active-token",
      user_id: "student-1",
      token_hash: "hashed:active",
      expires_at: "2026-06-20T11:00:00.000Z",
      used_at: null,
      created_at: "2026-06-20T08:00:00.000Z"
    },
    {
      id: "generated-id",
      user_id: "student-1",
      token_hash: "hashed:plain-reset-token",
      expires_at: "2026-06-20T10:30:00.000Z",
      used_at: null,
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
  assert.equal(await createTestStore(createDatabase()).createPasswordResetRequest("missing@example.com"), null);
  assert.equal(await createTestStore(createDatabase()).createPasswordResetRequest("   "), null);
});

test("auth session persistence resets passwords and consumes valid reset tokens", async () => {
  const database = createDatabase();
  passwordResetTokens(database).push({
    id: "valid-token",
    user_id: "student-1",
    token_hash: "hashed:valid-token",
    expires_at: "2026-06-20T10:30:00.000Z",
    used_at: null,
    created_at: "2026-06-20T09:30:00.000Z"
  });
  const store = createTestStore(database);

  const result = await store.resetUserPassword(" valid-token ", "new-password");

  assert.equal(result.status, "reset");
  assert.equal(result.status === "reset" ? result.session.user.id : null, "student-1");
  const user = database.users.find((candidate) => candidate.id === "student-1");
  assert.equal(user?.password_hash, "hash:new-password");
  assert.equal(user?.password_salt, "salt:new-password");
  assert.equal(user?.password_must_change, false);
  assert.equal(passwordResetTokens(database).find((token) => token.id === "valid-token")?.used_at, "2026-06-20T10:00:00.000Z");

  assert.deepEqual(await store.resetUserPassword("valid-token", "another-password"), { status: "invalid" });
  assert.deepEqual(await store.resetUserPassword(" ", "new-password"), { status: "invalid" });
  assert.deepEqual(await store.resetUserPassword("missing-token", "new-password"), { status: "invalid" });
  assert.deepEqual(await store.resetUserPassword("expired", "1234"), { status: "invalid" });
});

test("auth session persistence rejects malformed reset expiry without mutating account state", async () => {
  const database = createDatabase();
  passwordResetTokens(database).push({
    id: "malformed-expiry-token",
    user_id: "student-1",
    token_hash: "hashed:malformed-expiry-token",
    expires_at: "not-a-timestamp",
    used_at: null,
    created_at: "2026-06-20T09:30:00.000Z"
  });
  const originalUser = structuredClone(database.users.find((candidate) => candidate.id === "student-1"));

  const result = await createTestStore(database).resetUserPassword(
    "malformed-expiry-token",
    "new-password"
  );

  assert.deepEqual(result, { status: "invalid" });
  assert.deepEqual(database.users.find((candidate) => candidate.id === "student-1"), originalUser);
  assert.equal(
    passwordResetTokens(database).find((token) => token.id === "malformed-expiry-token")?.used_at,
    null
  );
});

test("auth session persistence lets password reset hot hooks short-circuit snapshot storage", async () => {
  const requestResult = {
    token: "hot-token",
    expiresAt: "2026-06-20T10:30:00.000Z",
    email: "hot@example.com",
    username: "hot"
  };
  const resetSession: AuthSession = {
    user: {
      id: "hot-user",
      name: "Hot User",
      username: "hot",
      avatarId: "delta",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" },
      role: "student"
    },
    settings: {
      language: "en",
      theme: "dark",
      selectedGrade: "S3"
    }
  };
  const store = createAuthSessionPersistenceStore({
    readDatabase: async () => {
      throw new Error("snapshot should not be read after hot password reset hit");
    },
    mutateDatabase: async () => {
      throw new Error("snapshot should not be mutated after hot password reset hit");
    },
    createPasswordResetRequestBeforeSnapshot: async () => requestResult,
    resetUserPasswordBeforeSnapshot: async () => ({
      status: "reset",
      session: resetSession,
      sessionRevision: 9
    })
  });

  assert.equal(await store.createPasswordResetRequest("hot@example.com"), requestResult);
  assert.deepEqual(await store.resetUserPassword("hot-token", "new-password"), {
    status: "reset",
    session: resetSession,
    sessionRevision: 9
  });
});

test("legacy userStore delegates authenticated user lookup to extracted auth session persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const hotSettingsSource = source.slice(
    source.indexOf("async function updateUserSettingsInPostgresHotTables"),
    source.indexOf("export const updateUserSettings = authUserStore.updateUserSettings")
  );

  assert.match(hotSettingsSource, /selectedGradeForSettingsUpdateFromAuthSessionPersistence/);
  assert.match(hotSettingsSource, /studentSelectedGradePolicy: canPersistStudentSelectedGrade/);
  assert.match(source, /authGradeAllowedForCurriculumProfile\(grade, curriculumProfile\)/);
  assert.match(source, /export const shouldRetryDemoLoginAfterFastInvalid = authUserStore\.shouldRetryDemoLoginAfterFastInvalid/);
  assert.match(source, /export const authenticatedUserForCredentials = authUserStore\.authenticatedUserForCredentials/);
  assert.match(source, /export const authenticateUser = authUserStore\.authenticateUser/);
  assert.match(source, /export const authenticateUserForLogin:[^=]+ = authUserStore\.authenticateUserForLogin/);
  assert.match(source, /export const authenticateFlexibleExampleAccountForLogin:[^=]+ = authUserStore\.authenticateFlexibleExampleAccountForLogin/);
  assert.match(source, /export const completeStudentCurriculumTrackSelection:[^=]+ = authUserStore\.completeStudentCurriculumTrackSelection/);
  assert.match(source, /export const createStudentUser = authUserStore\.createStudentUser/);
  assert.match(source, /export const createTeacherUser = authUserStore\.createTeacherUser/);
  assert.match(source, /export const createParentUser = authUserStore\.createParentUser/);
  assert.match(source, /export const getAuthenticatedUserById = authUserStore\.getAuthenticatedUserById/);
  assert.match(source, /export const updateUserSettings = authUserStore\.updateUserSettings/);
  assert.match(source, /export const updateUserProfile = authUserStore\.updateUserProfile/);
  assert.match(source, /export const changeAuthenticatedUserPassword = authUserStore\.changeAuthenticatedUserPassword/);
  assert.match(source, /export const createPasswordResetRequest = authUserStore\.createPasswordResetRequest/);
  assert.match(source, /export const resetUserPassword = authUserStore\.resetUserPassword/);
  assert.doesNotMatch(source, /export function authenticatedUserForCredentials/);
  assert.doesNotMatch(source, /export function shouldRetryDemoLoginAfterFastInvalid/);
  assert.doesNotMatch(source, /export async function authenticateUser\(/);
  assert.doesNotMatch(source, /export async function authenticateUserForLogin/);
  assert.doesNotMatch(source, /export async function authenticateFlexibleExampleAccountForLogin/);
  assert.doesNotMatch(source, /export async function completeStudentCurriculumTrackSelection/);
  assert.doesNotMatch(source, /export async function createStudentUser/);
  assert.doesNotMatch(source, /export async function createTeacherUser/);
  assert.doesNotMatch(source, /export async function createParentUser/);
  assert.doesNotMatch(source, /export async function getAuthenticatedUserById/);
  assert.doesNotMatch(source, /export async function updateUserSettings/);
  assert.doesNotMatch(source, /export async function updateUserProfile/);
  assert.doesNotMatch(source, /export async function changeAuthenticatedUserPassword/);
  assert.doesNotMatch(source, /export async function createPasswordResetRequest/);
  assert.doesNotMatch(source, /export async function resetUserPassword/);
  assert.doesNotMatch(source, /function fixedExampleLoginResult\(/);
  assert.doesNotMatch(source, /function authenticateFixedExampleAccountForLoginFromHotTables\(/);
  assert.doesNotMatch(source, /function isPlainRecord\(/);
});
