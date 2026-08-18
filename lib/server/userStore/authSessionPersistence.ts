import { createHash, pbkdf2, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { gradeIds } from "@/data/grades";
import {
  curriculumProfileForTrack,
  curriculumProfilesEqual,
  curriculumTrackForProfile,
  normalizeStoredCurriculumProfile
} from "@/lib/curriculumProfile";
import { isSafeMediaObjectKey, mediaObjectAccessUrl } from "@/lib/server/mediaObjectStore";
import type {
  CurriculumProfile,
  CurriculumRegion,
  CurriculumTrack,
  GradeId,
  Language,
  ParentalConsentRecord,
  StudentAvatarId,
  StudentSession,
  TextbookPublisher,
  ThemeMode,
  TopicStatus
} from "@/types";

type UserRole = "student" | "teacher" | "parent" | "admin";

type AuthSessionUserRecord = {
  id: string;
  username: string;
  normalized_username?: string;
  email?: string;
  normalized_email?: string;
  school_id?: string;
  role: UserRole;
  created_at?: string;
  password_hash?: string;
  password_salt?: string;
  password_must_change?: boolean;
  parental_consent?: ParentalConsentRecord;
};

type AuthSessionStudentProfileRecord = {
  user_id: string;
  name: string;
  grade: GradeId;
  curriculum_track?: CurriculumTrack;
  curriculum_region?: CurriculumRegion;
  textbook_publisher?: TextbookPublisher;
  parent_invite_code?: string;
  avatar_id?: StudentAvatarId | string;
  avatar_image_data_url?: string;
  avatar_media_object_key?: string;
};

type AuthSessionUserSettingsRecord = {
  user_id: string;
  language: Language;
  theme: ThemeMode;
  selected_grade: GradeId;
  updated_at: string;
};

type AuthSessionPasswordResetTokenRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type AuthSessionProjectedUserRecord = AuthSessionUserRecord & {
  normalized_username: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
};

export type AuthSessionProjectedStudentProfileRecord = Omit<AuthSessionStudentProfileRecord, "avatar_id"> & {
  avatar_id?: StudentAvatarId;
};

type AuthSessionLessonProgressRecord = {
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

type AuthMediaObjectReference = {
  objectKey?: unknown;
};

export type AuthFixedExampleScope = {
  grade: GradeId;
  curriculumProfile: CurriculumProfile;
  language?: Language;
};

type AuthFixedExampleScopeResolver = (userId: string) => AuthFixedExampleScope | null | undefined;
type AuthInternalExampleSeedResolver = (userId: string) => AuthDemoAccountSeed | null | undefined;

export type AuthDemoAccountSeed = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  grade: GradeId;
  curriculumTrack: CurriculumTrack;
  avatarId: StudentAvatarId;
};

export type AuthSessionPersistenceDatabase = {
  lesson_progress?: AuthSessionLessonProgressRecord[];
  password_reset_tokens?: AuthSessionPasswordResetTokenRecord[];
  student_profiles: AuthSessionStudentProfileRecord[];
  user_settings: AuthSessionUserSettingsRecord[];
  users: AuthSessionUserRecord[];
};

export type AuthHotRows = {
  users: AuthSessionUserRecord[];
  studentProfiles: AuthSessionStudentProfileRecord[];
  userSettings: AuthSessionUserSettingsRecord[];
  passwordResetTokens?: AuthSessionPasswordResetTokenRecord[];
};

export function authStudentProfileFor<TProfile extends { user_id: string }>(
  database: { student_profiles?: TProfile[] },
  userId: string
) {
  return database.student_profiles?.find((profile) => profile.user_id === userId);
}

type AuthCurriculumProfileSource = {
  curriculum_track?: unknown;
  curriculum_region?: unknown;
  textbook_publisher?: unknown;
};

export function authCurriculumProfileFromRecord(record?: AuthCurriculumProfileSource | null) {
  return normalizeStoredCurriculumProfile({
    curriculumTrack: normalizeAuthCurriculumTrack(record?.curriculum_track),
    region: record?.curriculum_region as CurriculumRegion | null | undefined,
    publisher: record?.textbook_publisher as TextbookPublisher | null | undefined
  });
}

export function authCurriculumProfileForUser<TProfile extends AuthCurriculumProfileSource & { user_id: string }>(
  database: { student_profiles?: TProfile[] },
  userId?: string | null
) {
  const profile = userId ? authStudentProfileFor(database, userId) : null;
  return authCurriculumProfileFromRecord(profile);
}

export function authCurriculumProfileForClass<TProfile extends AuthCurriculumProfileSource & { user_id: string }>(
  database: { student_profiles?: TProfile[] },
  teacherClass: { teacher_id?: string | null }
) {
  return authCurriculumProfileForUser(database, teacherClass.teacher_id);
}

export type AuthSession = {
  user: StudentSession;
  settings: {
    language: Language;
    theme: ThemeMode;
    selectedGrade: GradeId;
  };
};

export type AuthPasswordResetRequestResult = {
  token: string;
  expiresAt: string;
  email?: string;
  username: string;
};

export type AuthPasswordResetResult =
  | { status: "invalid" }
  | { status: "reset"; session: AuthSession };

export type AuthPasswordChangeInput = {
  userId: string;
  currentPassword: string;
  password: string;
};

export type AuthPasswordChangeResult =
  | { status: "invalid" }
  | { status: "updated"; session: AuthSession };

export type AuthLoginAuthenticatedResult<TDatabase = AuthSessionPersistenceDatabase> = {
  status: "authenticated";
  session: AuthSession;
  database?: TDatabase;
};

export type AuthLoginResult<TDatabase = AuthSessionPersistenceDatabase> =
  | AuthLoginAuthenticatedResult<TDatabase>
  | { status: "invalid" }
  | {
      status: "requires-curriculum-track";
      role: UserRole;
      user: {
        id: string;
        name: string;
        username: string;
        grade: GradeId;
      };
    };

export type AuthFlexibleExampleLoginInput = {
  username: string;
  password: string;
  curriculumProfile?: CurriculumProfile;
  selectedGrade?: GradeId;
  language?: Language;
  theme?: ThemeMode;
};

export type AuthFlexibleExampleLoginResult<TDatabase = AuthSessionPersistenceDatabase> =
  | AuthLoginAuthenticatedResult<TDatabase>
  | { status: "invalid" }
  | { status: "not-example-account" };

export type AuthCurriculumTrackSelectionInput = {
  username: string;
  password: string;
  curriculumTrack?: CurriculumTrack;
  curriculumProfile?: CurriculumProfile;
  selectedGrade?: GradeId;
  language?: Language;
  theme?: ThemeMode;
};

export type AuthParentUserCreationInput = {
  name: string;
  username?: string;
  email?: string;
  password: string;
  language?: Language;
  theme?: ThemeMode;
};

export type AuthParentUserCreationResult =
  | { status: "created"; session: AuthSession }
  | { status: "duplicate" }
  | { status: "invalid" };

export type AuthCurriculumAccountCreationInput = {
  name: string;
  username: string;
  email?: string;
  password: string;
  grade: GradeId;
  curriculumTrack?: CurriculumTrack;
  curriculumProfile?: CurriculumProfile;
  language?: Language;
  theme?: ThemeMode;
  /** Required for student accounts; see app/api/auth/register/route.ts. */
  parentalConsent?: ParentalConsentRecord;
};

export type AuthCurriculumAccountCreationResult =
  | { status: "created"; session: AuthSession }
  | { status: "duplicate" }
  | { status: "invalid" };

export type AuthStudentSelectedGradePolicy = (input: {
  userId: string;
  grade: GradeId;
  curriculumProfile: CurriculumProfile;
}) => boolean;

export type AuthSessionPersistenceStoreDependencies = {
  authenticateUserForLoginBeforeSnapshot?: (
    username: string,
    password: string
  ) => Promise<AuthLoginResult | null | undefined> | AuthLoginResult | null | undefined;
  fallbackAuthenticatedUser?: (userId: string) => AuthSession | null;
  fixedExampleScopeForUserId?: (userId: string) => AuthFixedExampleScope | null | undefined;
  applyFixedExampleAccountScope?: (database: AuthSessionPersistenceDatabase, userId: string) => void | null | undefined;
  createId?: () => string;
  createParentInviteCode?: (database: AuthSessionPersistenceDatabase) => string;
  createPasswordResetRequestBeforeSnapshot?: (
    identifier: string
  ) => Promise<AuthPasswordResetRequestResult | null | undefined> | AuthPasswordResetRequestResult | null | undefined;
  createResetToken?: () => string;
  demoAccountSeeds?: readonly AuthDemoAccountSeed[];
  demoPassword?: string;
  hashPassword?: (password: string) => { hash: string; salt: string };
  hashPasswordResetToken?: (token: string) => string;
  initialStudentLessonProgressRecords?: (userId: string, nowIso: string) => AuthSessionLessonProgressRecord[];
  isGradeAllowedForCurriculumProfile?: (grade: GradeId, profile: CurriculumProfile) => boolean;
  lookupBeforeRead?: (userId: string) => Promise<AuthSession | null> | AuthSession | null;
  mediaObjectUrlForKey?: (objectKey: string) => string | null | undefined;
  mutateDatabase?: <T>(
    mutator: (database: AuthSessionPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  now?: () => Date;
  passwordMatches?: (password: string, user: AuthSessionUserRecord) => boolean;
  passwordResetTokenMaxAgeMs?: number;
  publicContentDatabaseForExampleLogin?: () => AuthSessionPersistenceDatabase;
  readDatabase: () => Promise<AuthSessionPersistenceDatabase>;
  resetUserPasswordBeforeSnapshot?: (
    token: string,
    password: string
  ) => Promise<AuthPasswordResetResult | undefined> | AuthPasswordResetResult | undefined;
  shouldRetryLoginAfterFastInvalid?: (username: string, password: string) => boolean;
  studentSelectedGradePolicy?: AuthStudentSelectedGradePolicy;
  updateSettingsBeforeSnapshot?: (
    userId: string,
    patch: Partial<{ language: Language; theme: ThemeMode; selectedGrade: GradeId }>
  ) => Promise<AuthSession | null> | AuthSession | null;
};

export type AuthSessionPersistenceStore = ReturnType<typeof createAuthSessionPersistenceStore>;

export const defaultAuthStudentAvatarId: StudentAvatarId = "delta";
const validAuthStudentAvatarIds = new Set<StudentAvatarId>(["delta", "pi", "sigma", "theta", "function", "radical"]);
const validGrades = new Set<GradeId>(gradeIds);
const validLanguages = new Set<Language>(["en", "zh", "zh-Hans"]);
const validThemes = new Set<ThemeMode>(["dark", "light"]);
const defaultAuthCurriculumTrack: CurriculumTrack = "HK";
const validAuthCurriculumTracks = new Set<CurriculumTrack>([
  "HK",
  "MAINLAND_PEP_HIGH",
  "US_CA_MATH",
  "US_NC_MATH",
  "US_AR_MATH",
  "US_FL_MATH"
]);
const maxStudentAvatarImageDataUrlLength = 900_000;
const studentAvatarImageDataUrlPattern = /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const defaultPasswordResetTokenMaxAgeMs = 1000 * 60 * 30;

export function isValidAuthStudentAvatarId(value: unknown): value is StudentAvatarId {
  return validAuthStudentAvatarIds.has(value as StudentAvatarId);
}

export function authSelectedGradeForSettingsUpdate({
  currentSelectedGrade,
  fixedExampleGrade,
  profileGrade,
  requestedGrade,
  requestedGradeAllowed,
  studentSelectedGradePolicy = () => false,
  user
}: {
  currentSelectedGrade: GradeId;
  fixedExampleGrade?: GradeId | null;
  profileGrade: GradeId;
  requestedGrade?: GradeId;
  requestedGradeAllowed: boolean;
  studentSelectedGradePolicy?: AuthStudentSelectedGradePolicy;
  user: Pick<AuthSession["user"], "id" | "role" | "curriculumProfile">;
}) {
  if (fixedExampleGrade) return fixedExampleGrade;
  if (user.role !== "student") {
    return requestedGrade && requestedGradeAllowed ? requestedGrade : currentSelectedGrade;
  }

  const studentCanPersistGrade = (grade: GradeId) => studentSelectedGradePolicy({
    userId: user.id,
    grade,
    curriculumProfile: user.curriculumProfile
  });
  if (requestedGrade && requestedGradeAllowed && studentCanPersistGrade(requestedGrade)) {
    return requestedGrade;
  }
  if (studentCanPersistGrade(currentSelectedGrade)) return currentSelectedGrade;
  return profileGrade;
}

function isValidAuthCurriculumTrack(value: unknown): value is CurriculumTrack {
  return validAuthCurriculumTracks.has(value as CurriculumTrack);
}

function normalizeAuthCurriculumTrack(value: unknown) {
  return isValidAuthCurriculumTrack(value) ? value : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringRecordField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function optionalStringRecordField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value ? value : undefined;
}

function isAuthUserRole(value: unknown): value is UserRole {
  return value === "student" || value === "teacher" || value === "parent" || value === "admin";
}

export function projectedUserRecord(value: unknown): AuthSessionProjectedUserRecord | null {
  if (!isPlainRecord(value) || !isAuthUserRole(value.role)) return null;
  const id = stringRecordField(value, "id");
  const username = stringRecordField(value, "username");
  const normalizedUsername = stringRecordField(value, "normalized_username");
  const passwordHash = stringRecordField(value, "password_hash");
  const passwordSalt = stringRecordField(value, "password_salt");
  const createdAt = stringRecordField(value, "created_at");
  if (!id || !username || !normalizedUsername || !passwordHash || !passwordSalt || !createdAt) return null;

  return {
    id,
    username,
    normalized_username: normalizedUsername,
    email: optionalStringRecordField(value, "email"),
    normalized_email: optionalStringRecordField(value, "normalized_email"),
    password_hash: passwordHash,
    password_salt: passwordSalt,
    school_id: optionalStringRecordField(value, "school_id"),
    password_must_change: typeof value.password_must_change === "boolean" ? value.password_must_change : undefined,
    role: value.role,
    created_at: createdAt
  };
}

export function projectedStudentProfileRecord(value: unknown): AuthSessionProjectedStudentProfileRecord | null {
  if (!isPlainRecord(value)) return null;
  const userId = stringRecordField(value, "user_id");
  const name = stringRecordField(value, "name");
  const grade = stringRecordField(value, "grade");
  if (!userId || !name || !validGrades.has(grade as GradeId)) return null;

  return {
    user_id: userId,
    name,
    grade: grade as GradeId,
    curriculum_track: normalizeAuthCurriculumTrack(value.curriculum_track),
    curriculum_region: value.curriculum_region as CurriculumRegion | undefined,
    textbook_publisher: value.textbook_publisher as TextbookPublisher | undefined,
    parent_invite_code: optionalStringRecordField(value, "parent_invite_code"),
    avatar_id: isValidAuthStudentAvatarId(value.avatar_id) ? value.avatar_id : undefined,
    avatar_image_data_url: optionalStringRecordField(value, "avatar_image_data_url"),
    avatar_media_object_key: optionalStringRecordField(value, "avatar_media_object_key")
  };
}

export function projectedUserSettingsRecord(value: unknown): AuthSessionUserSettingsRecord | null {
  if (!isPlainRecord(value)) return null;
  const userId = stringRecordField(value, "user_id");
  const language = stringRecordField(value, "language");
  const theme = stringRecordField(value, "theme");
  const selectedGrade = stringRecordField(value, "selected_grade");
  if (!userId || !validLanguages.has(language as Language) || !validThemes.has(theme as ThemeMode) || !validGrades.has(selectedGrade as GradeId)) {
    return null;
  }

  return {
    user_id: userId,
    language: language as Language,
    theme: theme as ThemeMode,
    selected_grade: selectedGrade as GradeId,
    updated_at: stringRecordField(value, "updated_at")
  };
}

export function projectedPasswordResetTokenRecord(value: unknown): AuthSessionPasswordResetTokenRecord | null {
  if (!isPlainRecord(value)) return null;
  const id = stringRecordField(value, "id");
  const userId = stringRecordField(value, "user_id");
  const tokenHash = stringRecordField(value, "token_hash");
  const expiresAt = stringRecordField(value, "expires_at");
  const createdAt = stringRecordField(value, "created_at");
  if (!id || !userId || !tokenHash || !expiresAt || !createdAt) return null;

  return {
    id,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    used_at: typeof value.used_at === "string" && value.used_at ? value.used_at : null,
    created_at: createdAt
  };
}

function isValidAuthStudentAvatarImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxStudentAvatarImageDataUrlLength &&
    studentAvatarImageDataUrlPattern.test(value)
  );
}

export function normalizeAuthStudentAvatarImageDataUrl(value: unknown) {
  return isValidAuthStudentAvatarImageDataUrl(value) ? value : undefined;
}

function normalizeStoredMediaObjectKey(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed && isSafeMediaObjectKey(trimmed) ? trimmed : undefined;
}

export function normalizeAuthStudentProfileRecord<
  Record extends AuthSessionStudentProfileRecord
>(
  profile: Record,
  dependencies: {
    normalizeParentInviteCode: (value: string) => string;
  }
): Record & {
  avatar_id: StudentAvatarId;
  curriculum_track: CurriculumTrack;
  curriculum_region: CurriculumRegion;
  textbook_publisher: TextbookPublisher;
  avatar_media_object_key: string | undefined;
} {
  const avatarImageDataUrl = normalizeAuthStudentAvatarImageDataUrl(profile.avatar_image_data_url);
  const avatarMediaObjectKey = normalizeStoredMediaObjectKey(profile.avatar_media_object_key);
  const parentInviteCode = dependencies.normalizeParentInviteCode(profile.parent_invite_code ?? "");
  const curriculumProfile = normalizeStoredCurriculumProfile({
    curriculumTrack: normalizeAuthCurriculumTrack(profile.curriculum_track),
    region: profile.curriculum_region,
    publisher: profile.textbook_publisher
  });

  return {
    ...profile,
    avatar_id: isValidAuthStudentAvatarId(profile.avatar_id) ? profile.avatar_id : defaultAuthStudentAvatarId,
    curriculum_track: curriculumTrackForProfile(curriculumProfile),
    curriculum_region: curriculumProfile.region,
    textbook_publisher: curriculumProfile.publisher,
    avatar_media_object_key: avatarMediaObjectKey,
    ...(parentInviteCode ? { parent_invite_code: parentInviteCode } : {}),
    ...(avatarImageDataUrl ? { avatar_image_data_url: avatarImageDataUrl } : {})
  };
}

export function cleanAuthStudentProfileName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeAuthIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function isLikelyEmailIdentifier(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeAuthUsername(username: string) {
  return normalizeAuthIdentifier(username);
}

export function normalizeAuthEmail(email: string) {
  return normalizeAuthIdentifier(email);
}

export function isLikelyAuthEmail(value: string) {
  return isLikelyEmailIdentifier(value);
}

export function normalizeAuthUserRecord<
  Record extends {
    username?: unknown;
    email?: unknown;
    school_id?: unknown;
    password_must_change?: boolean | null;
  }
>(
  user: Record
): Record & {
  username: string;
  normalized_username: string;
  email: string | undefined;
  normalized_email: string | undefined;
  school_id: string | undefined;
  password_must_change: boolean;
} {
  const username = typeof user.username === "string" ? user.username.trim() : "";
  const email = typeof user.email === "string" && isLikelyAuthEmail(user.email)
    ? user.email.trim()
    : isLikelyAuthEmail(username)
      ? username
      : undefined;

  return {
    ...user,
    username,
    normalized_username: normalizeAuthUsername(username),
    email,
    normalized_email: email ? normalizeAuthEmail(email) : undefined,
    school_id: typeof user.school_id === "string" && user.school_id.trim() ? user.school_id : undefined,
    password_must_change: user.password_must_change ?? false
  };
}

export function normalizeAuthUserSettingsRecords<Record extends AuthSessionUserSettingsRecord>(
  records?: Record[]
): Record[] {
  return records ?? [];
}

export function normalizeAuthPasswordResetTokenRecords<Record extends AuthSessionPasswordResetTokenRecord>(
  records?: Record[]
): Record[] {
  return records ?? [];
}

export function authDemoSeedMatchesIdentifier(seed: AuthDemoAccountSeed, username: string) {
  const normalizedIdentifier = normalizeAuthIdentifier(username);
  const normalizedEmailIdentifier = isLikelyEmailIdentifier(username) ? normalizeAuthIdentifier(username) : "";
  return (
    normalizeAuthIdentifier(seed.username) === normalizedIdentifier ||
    normalizeAuthIdentifier(seed.email) === normalizedIdentifier ||
    (normalizedEmailIdentifier && normalizeAuthIdentifier(seed.email) === normalizedEmailIdentifier)
  );
}

export function authStorageSeedExampleAccountSeeds({
  demoAccountSeeds,
  internalExampleAccountSeeds,
  shouldSeedDemoUser
}: {
  demoAccountSeeds: readonly AuthDemoAccountSeed[];
  internalExampleAccountSeeds: readonly AuthDemoAccountSeed[];
  shouldSeedDemoUser: boolean;
}) {
  return shouldSeedDemoUser ? [...demoAccountSeeds, ...internalExampleAccountSeeds] : internalExampleAccountSeeds;
}

export function authInternalExampleAccountSeedForUserId(
  internalExampleAccountSeeds: readonly AuthDemoAccountSeed[],
  userId: string
) {
  return internalExampleAccountSeeds.find((seed) => seed.id === userId);
}

export function authFixedExampleAccountScopeForUserId(
  fixedExampleAccountScopes: Record<string, AuthFixedExampleScope>,
  userId: string
) {
  return fixedExampleAccountScopes[userId];
}

export function authDemoAccountSeedProfile(
  seed: AuthDemoAccountSeed,
  fixedExampleScopeForUserId: AuthFixedExampleScopeResolver = () => null
) {
  return fixedExampleScopeForUserId(seed.id)?.curriculumProfile ?? curriculumProfileForTrack(seed.curriculumTrack);
}

export function authDemoAccountSeedLanguage(
  seed: AuthDemoAccountSeed,
  fixedExampleScopeForUserId: AuthFixedExampleScopeResolver = () => null
): Language {
  return fixedExampleScopeForUserId(seed.id)?.language ?? (seed.curriculumTrack === "MAINLAND_PEP_HIGH" ? "zh-Hans" : "en");
}

export function authFixedExampleAccountLocksSelectedGrade(
  userId: string,
  internalExampleAccountSeedForUserId: AuthInternalExampleSeedResolver = () => null
) {
  return !internalExampleAccountSeedForUserId(userId);
}

export function chooseAuthFixedExampleSeed(
  candidateSeeds: readonly AuthDemoAccountSeed[],
  requestedProfile?: CurriculumProfile,
  fixedExampleScopeForUserId: AuthFixedExampleScopeResolver = () => null
) {
  if (candidateSeeds.length <= 1 || !requestedProfile) return candidateSeeds[0] ?? null;

  return (
    candidateSeeds.find((seed) => {
      const profile = authDemoAccountSeedProfile(seed, fixedExampleScopeForUserId);
      return profile.region === requestedProfile.region && profile.publisher === requestedProfile.publisher;
    }) ??
    candidateSeeds.find((seed) => authDemoAccountSeedProfile(seed, fixedExampleScopeForUserId).region === requestedProfile.region) ??
    candidateSeeds[0] ??
    null
  );
}

export type AuthFixedExampleAccountScopeSyncOptions = {
  fixedExampleScopeForUserId: AuthFixedExampleScopeResolver;
  internalExampleAccountSeedForUserId?: AuthInternalExampleSeedResolver;
  now?: string;
};

export function authFixedExampleAccountNeedsSync(
  database: AuthSessionPersistenceDatabase,
  userId: string,
  {
    fixedExampleScopeForUserId,
    internalExampleAccountSeedForUserId = () => null
  }: AuthFixedExampleAccountScopeSyncOptions
) {
  const scope = fixedExampleScopeForUserId(userId);
  if (!scope) return false;

  const profile = database.student_profiles.find((candidate) => candidate.user_id === userId);
  const settings = database.user_settings.find((candidate) => candidate.user_id === userId);
  const storedProfile = profile
    ? normalizeStoredCurriculumProfile({
        curriculumTrack: profile.curriculum_track,
        region: profile.curriculum_region,
        publisher: profile.textbook_publisher
      })
    : null;

  return (
    !profile ||
    profile.grade !== scope.grade ||
    !storedProfile ||
    !curriculumProfilesEqual(storedProfile, scope.curriculumProfile) ||
    !settings ||
    (
      authFixedExampleAccountLocksSelectedGrade(userId, internalExampleAccountSeedForUserId) &&
      settings.selected_grade !== scope.grade
    )
  );
}

export function applyAuthFixedExampleAccountScope(
  database: AuthSessionPersistenceDatabase,
  userId: string,
  {
    fixedExampleScopeForUserId,
    internalExampleAccountSeedForUserId = () => null,
    now = new Date().toISOString()
  }: AuthFixedExampleAccountScopeSyncOptions
): AuthSessionPersistenceDatabase["users"][number] | null {
  const scope = fixedExampleScopeForUserId(userId);
  if (!scope) return null;

  const user = database.users.find((candidate) => candidate.id === userId);
  const profile = database.student_profiles.find((candidate) => candidate.user_id === userId);
  if (!user || !profile) return null;

  profile.name = user.username;
  profile.grade = scope.grade;
  profile.curriculum_track = curriculumTrackForProfile(scope.curriculumProfile);
  profile.curriculum_region = scope.curriculumProfile.region;
  profile.textbook_publisher = scope.curriculumProfile.publisher;
  profile.avatar_id = isValidAuthStudentAvatarId(profile.avatar_id) ? profile.avatar_id : defaultAuthStudentAvatarId;

  const settingsIndex = database.user_settings.findIndex((candidate) => candidate.user_id === userId);
  const currentSettings = settingsIndex >= 0 ? database.user_settings[settingsIndex] : null;
  const nextSettings: AuthSessionUserSettingsRecord = {
    ...(currentSettings ?? {
      user_id: userId,
      language: "en",
      theme: "dark",
      selected_grade: scope.grade,
      updated_at: now
    }),
    language: currentSettings?.language ?? scope.language ?? "en",
    selected_grade: authFixedExampleAccountLocksSelectedGrade(userId, internalExampleAccountSeedForUserId)
      ? scope.grade
      : currentSettings?.selected_grade ?? scope.grade,
    updated_at: now
  };

  if (settingsIndex >= 0) {
    database.user_settings[settingsIndex] = nextSettings;
  } else {
    database.user_settings.push(nextSettings);
  }

  return user;
}

export type AuthStorageFreeExampleAccountRecords = {
  profile: AuthSessionPersistenceDatabase["student_profiles"][number];
  settings: AuthSessionPersistenceDatabase["user_settings"][number];
  user: AuthSessionPersistenceDatabase["users"][number];
};

export type AuthStorageFreeExampleAccountRecordsOptions = {
  exampleAccountSeeds: readonly AuthDemoAccountSeed[];
  fixedExampleScopeForUserId?: AuthFixedExampleScopeResolver;
  now?: string;
};

export type AuthStorageFreeExampleAuthenticatedUserOptions = AuthStorageFreeExampleAccountRecordsOptions & {
  mediaObjectUrlForKey: (objectKey: string) => string | null | undefined;
};

type AuthStorageFreeExampleDatabase = Pick<AuthSessionPersistenceDatabase, "student_profiles" | "user_settings" | "users">;

export function authStorageFreeExampleAccountRecords(
  userId: string,
  {
    exampleAccountSeeds,
    fixedExampleScopeForUserId = () => null,
    now = new Date().toISOString()
  }: AuthStorageFreeExampleAccountRecordsOptions
): AuthStorageFreeExampleAccountRecords | null {
  const seed = exampleAccountSeeds.find((candidate) => candidate.id === userId);
  if (!seed) return null;

  const profile = authDemoAccountSeedProfile(seed, fixedExampleScopeForUserId);
  const grade = fixedExampleScopeForUserId(seed.id)?.grade ?? seed.grade;
  const user: AuthSessionPersistenceDatabase["users"][number] = {
    id: seed.id,
    username: seed.username,
    normalized_username: normalizeAuthUsername(seed.username),
    email: seed.email,
    normalized_email: normalizeAuthEmail(seed.email),
    password_hash: "",
    password_salt: "",
    password_must_change: false,
    role: seed.role,
    created_at: now
  };
  const profileRecord: AuthSessionPersistenceDatabase["student_profiles"][number] = {
    user_id: seed.id,
    name: seed.username,
    grade,
    curriculum_track: curriculumTrackForProfile(profile) ?? seed.curriculumTrack,
    curriculum_region: profile.region,
    textbook_publisher: profile.publisher,
    avatar_id: seed.avatarId
  };
  const settings: AuthSessionPersistenceDatabase["user_settings"][number] = {
    user_id: seed.id,
    language: authDemoAccountSeedLanguage(seed, fixedExampleScopeForUserId),
    theme: "dark",
    selected_grade: grade,
    updated_at: now
  };

  return { user, profile: profileRecord, settings };
}

export function authStorageFreeExampleDatabase<TDatabase extends AuthStorageFreeExampleDatabase>(
  database: TDatabase,
  userId: string,
  options: AuthStorageFreeExampleAccountRecordsOptions
): TDatabase | null {
  const records = authStorageFreeExampleAccountRecords(userId, options);
  if (!records) return null;

  const upsertByUserId = <T extends { user_id: string }>(recordsList: T[], record: T) => [
    record,
    ...recordsList.filter((candidate) => candidate.user_id !== record.user_id)
  ];

  return {
    ...database,
    users: [
      records.user,
      ...database.users.filter((candidate) => candidate.id !== records.user.id)
    ],
    student_profiles: upsertByUserId(database.student_profiles, records.profile),
    user_settings: upsertByUserId(database.user_settings, records.settings)
  };
}

export function authStorageFreeExampleAuthenticatedUser(
  userId: string,
  {
    mediaObjectUrlForKey,
    ...recordOptions
  }: AuthStorageFreeExampleAuthenticatedUserOptions
): AuthSession | null {
  const records = authStorageFreeExampleAccountRecords(userId, recordOptions);
  return records
    ? authenticatedUserFromAuthRecords({
        mediaObjectUrlForKey,
        profile: records.profile,
        settingsRecord: records.settings,
        user: records.user
      })
    : null;
}

export type AuthDemoAccountSyncOptions = {
  demoAccountSeeds: readonly AuthDemoAccountSeed[];
  demoPassword: string;
  fixedExampleScopeForUserId?: AuthFixedExampleScopeResolver;
  internalExampleAccountSeedForUserId?: AuthInternalExampleSeedResolver;
  hashPassword?: (password: string) => { hash: string; salt: string };
  passwordMatches?: (password: string, user: AuthSessionUserRecord) => boolean;
};

export function authDemoRecordsNeedSync(
  database: Partial<AuthSessionPersistenceDatabase>,
  {
    demoAccountSeeds,
    demoPassword,
    fixedExampleScopeForUserId = () => null,
    internalExampleAccountSeedForUserId = () => null,
    passwordMatches = authPasswordMatches
  }: AuthDemoAccountSyncOptions
) {
  return demoAccountSeeds.some((seed) => {
    const user = database.users?.find((candidate) => candidate.id === seed.id);
    const profile = database.student_profiles?.find((candidate) => candidate.user_id === seed.id);
    const settings = database.user_settings?.find((candidate) => candidate.user_id === seed.id);
    const seedProfile = authDemoAccountSeedProfile(seed, fixedExampleScopeForUserId);
    const existingProfile = profile
      ? normalizeStoredCurriculumProfile({
          curriculumTrack: profile.curriculum_track,
          region: profile.curriculum_region,
          publisher: profile.textbook_publisher
        })
      : null;

    return (
      !user ||
      user.username !== seed.username ||
      user.normalized_username !== normalizeAuthUsername(seed.username) ||
      user.email !== seed.email ||
      user.normalized_email !== normalizeAuthEmail(seed.email) ||
      user.role !== seed.role ||
      !passwordMatches(demoPassword, user) ||
      !profile ||
      profile.name !== seed.username ||
      profile.grade !== seed.grade ||
      !existingProfile ||
      !curriculumProfilesEqual(existingProfile, seedProfile) ||
      profile.avatar_id !== seed.avatarId ||
      !settings ||
      (
        authFixedExampleAccountLocksSelectedGrade(seed.id, internalExampleAccountSeedForUserId) &&
        settings.selected_grade !== seed.grade
      )
    );
  });
}

export function syncAuthDemoAccounts(
  users: AuthSessionPersistenceDatabase["users"],
  studentProfiles: AuthSessionPersistenceDatabase["student_profiles"],
  userSettings: AuthSessionPersistenceDatabase["user_settings"],
  now: string,
  {
    demoAccountSeeds,
    demoPassword,
    fixedExampleScopeForUserId = () => null,
    internalExampleAccountSeedForUserId = () => null,
    hashPassword = hashAuthPassword,
    passwordMatches = authPasswordMatches
  }: AuthDemoAccountSyncOptions
) {
  let replacementPassword: ReturnType<typeof hashAuthPassword> | null = null;
  const passwordFor = (existingUser?: AuthSessionUserRecord) => {
    if (existingUser && passwordMatches(demoPassword, existingUser)) {
      return {
        hash: existingUser.password_hash ?? "",
        salt: existingUser.password_salt ?? ""
      };
    }

    replacementPassword ??= hashPassword(demoPassword);
    return replacementPassword;
  };

  demoAccountSeeds.forEach((seed) => {
    const existingUser = users.find((candidate) => candidate.id === seed.id);
    const password = passwordFor(existingUser);

    if (existingUser) {
      Object.assign(existingUser, {
        username: seed.username,
        normalized_username: normalizeAuthUsername(seed.username),
        email: seed.email,
        normalized_email: normalizeAuthEmail(seed.email),
        password_hash: password.hash,
        password_salt: password.salt,
        password_must_change: false,
        role: seed.role
      });
    } else {
      users.push({
        id: seed.id,
        username: seed.username,
        normalized_username: normalizeAuthUsername(seed.username),
        email: seed.email,
        normalized_email: normalizeAuthEmail(seed.email),
        password_hash: password.hash,
        password_salt: password.salt,
        password_must_change: false,
        role: seed.role,
        created_at: now
      });
    }

    const existingProfile = studentProfiles.find((profile) => profile.user_id === seed.id);
    const seedProfile = authDemoAccountSeedProfile(seed, fixedExampleScopeForUserId);
    if (existingProfile) {
      existingProfile.name = seed.username;
      existingProfile.grade = seed.grade;
      existingProfile.curriculum_track = curriculumTrackForProfile(seedProfile);
      existingProfile.curriculum_region = seedProfile.region;
      existingProfile.textbook_publisher = seedProfile.publisher;
      existingProfile.avatar_id = seed.avatarId;
    } else {
      studentProfiles.push({
        user_id: seed.id,
        name: seed.username,
        grade: seed.grade,
        curriculum_track: seed.curriculumTrack,
        curriculum_region: seedProfile.region,
        textbook_publisher: seedProfile.publisher,
        avatar_id: seed.avatarId
      });
    }

    const settingsIndex = userSettings.findIndex((settings) => settings.user_id === seed.id);
    if (settingsIndex >= 0) {
      userSettings[settingsIndex] = {
        ...userSettings[settingsIndex],
        selected_grade: authFixedExampleAccountLocksSelectedGrade(seed.id, internalExampleAccountSeedForUserId)
          ? seed.grade
          : userSettings[settingsIndex].selected_grade,
        updated_at: userSettings[settingsIndex].updated_at || now
      };
    } else {
      userSettings.push({
        user_id: seed.id,
        language: authDemoAccountSeedLanguage(seed, fixedExampleScopeForUserId),
        theme: "dark",
        selected_grade: seed.grade,
        updated_at: now
      });
    }
  });
}

export type AuthBootstrapAdminInput = {
  username: string;
  email: string;
  name: string;
  password: string;
};

export function authBootstrapAdminInput(
  environment: Record<string, string | undefined> = process.env
): AuthBootstrapAdminInput | null {
  const email = environment.MAIS_BOOTSTRAP_ADMIN_EMAIL?.trim() ?? "";
  const password = environment.MAIS_BOOTSTRAP_ADMIN_PASSWORD ?? "";
  if (!email || !password || !isLikelyAuthEmail(email) || password.length < 5) return null;

  const username = environment.MAIS_BOOTSTRAP_ADMIN_USERNAME?.trim() || email;
  const name = environment.MAIS_BOOTSTRAP_ADMIN_NAME?.trim() || "MAIS Admin";
  if (!username) return null;

  return { username, email, name, password };
}

export function authBootstrapAdminNeedsSync(
  database: Partial<AuthSessionPersistenceDatabase>,
  input: AuthBootstrapAdminInput | null
) {
  if (!input) return false;

  const normalizedUsername = normalizeAuthUsername(input.username);
  const normalizedEmail = normalizeAuthEmail(input.email);
  return !(database.users ?? []).some(
    (user) =>
      user.normalized_username === normalizedUsername ||
      user.normalized_email === normalizedEmail ||
      normalizeAuthUsername(user.username ?? "") === normalizedUsername ||
      (user.email ? normalizeAuthEmail(user.email) === normalizedEmail : false)
  );
}

export function syncAuthBootstrapAdmin(
  users: AuthSessionPersistenceDatabase["users"],
  studentProfiles: AuthSessionPersistenceDatabase["student_profiles"],
  userSettings: AuthSessionPersistenceDatabase["user_settings"],
  now: string,
  input: AuthBootstrapAdminInput | null,
  {
    defaultCurriculumTrack = "HK",
    hashPassword = hashAuthPassword
  }: {
    defaultCurriculumTrack?: CurriculumTrack;
    hashPassword?: (password: string) => { hash: string; salt: string };
  } = {}
) {
  if (!input) return;

  const normalizedUsername = normalizeAuthUsername(input.username);
  const normalizedEmail = normalizeAuthEmail(input.email);
  const existing = users.find(
    (user) =>
      user.normalized_username === normalizedUsername ||
      user.normalized_email === normalizedEmail
  );
  if (existing) return;

  const password = hashPassword(input.password);
  const userId = `admin-${createHash("sha1").update(normalizedEmail).digest("hex").slice(0, 16)}`;
  const curriculumProfile = curriculumProfileForTrack(defaultCurriculumTrack);
  users.push({
    id: userId,
    username: input.username,
    normalized_username: normalizedUsername,
    email: input.email,
    normalized_email: normalizedEmail,
    password_hash: password.hash,
    password_salt: password.salt,
    password_must_change: false,
    role: "admin",
    created_at: now
  });
  studentProfiles.push({
    user_id: userId,
    name: input.name,
    grade: "S3",
    curriculum_track: defaultCurriculumTrack,
    curriculum_region: curriculumProfile.region,
    textbook_publisher: curriculumProfile.publisher,
    avatar_id: "theta"
  });
  userSettings.push({
    user_id: userId,
    language: "en",
    theme: "dark",
    selected_grade: "S3",
    updated_at: now
  });
}

export type AuthPasswordRecord = {
  password_hash?: string;
  password_salt?: string;
};

export function hashAuthPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return {
    hash: pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex"),
    salt
  };
}

/**
 * Non-blocking variant of {@link hashAuthPassword}. `pbkdf2Sync` (120k iterations) pins
 * the event loop for ~20-25ms per call (longer under cold-start CPU throttling); the async
 * variant runs the KDF on libuv's threadpool so the login request stops blocking the
 * event loop while it hashes. Used on the login verification hot path — the sync version
 * is retained for registration, password resets, demo seeding, and the sync public API.
 */
export function hashAuthPasswordAsync(
  password: string,
  salt = randomBytes(16).toString("hex")
): Promise<{ hash: string; salt: string }> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, 120000, 64, "sha512", (error, derivedKey) => {
      if (error) reject(error);
      else resolve({ hash: derivedKey.toString("hex"), salt });
    });
  });
}

export async function authPasswordMatchesAsync(password: string, user: AuthPasswordRecord) {
  if (typeof user.password_hash !== "string" || typeof user.password_salt !== "string") return false;
  const candidate = Buffer.from((await hashAuthPasswordAsync(password, user.password_salt)).hash, "hex");
  const stored = Buffer.from(user.password_hash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

export function hashAuthPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function authPasswordMatches(password: string, user: AuthPasswordRecord) {
  if (typeof user.password_hash !== "string" || typeof user.password_salt !== "string") return false;
  const candidate = Buffer.from(hashAuthPassword(password, user.password_salt).hash, "hex");
  const stored = Buffer.from(user.password_hash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

// Deduplicated candidate users for an identifier, ordered email-exact → username → email.
// Shared by the sync and async credential matchers so both walk candidates identically.
function orderedCandidateAuthUsers<TDatabase extends { users: AuthSessionUserRecord[] }>(
  database: TDatabase,
  username: string
): TDatabase["users"][number][] {
  const normalizedIdentifier = normalizeAuthIdentifier(username);
  const normalizedEmailIdentifier = isLikelyEmailIdentifier(username) ? normalizeAuthIdentifier(username) : "";
  const matchingUsers = database.users.filter(
    (candidate) =>
      candidate.normalized_username === normalizedIdentifier ||
      candidate.normalized_email === normalizedIdentifier ||
      (normalizedEmailIdentifier && candidate.normalized_email === normalizedEmailIdentifier)
  );
  const orderedUsers = [
    ...matchingUsers.filter((candidate) => normalizedEmailIdentifier && candidate.normalized_email === normalizedEmailIdentifier),
    ...matchingUsers.filter((candidate) => candidate.normalized_username === normalizedIdentifier),
    ...matchingUsers.filter((candidate) => candidate.normalized_email === normalizedIdentifier)
  ];
  const seen = new Set<string>();
  const deduped: TDatabase["users"][number][] = [];
  for (const user of orderedUsers) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    deduped.push(user);
  }
  return deduped;
}

function authenticatedAuthUserForCredentials<TDatabase extends { users: AuthSessionUserRecord[] }>({
  database,
  password,
  passwordMatches,
  username
}: {
  database: TDatabase;
  password: string;
  passwordMatches: (password: string, user: AuthSessionUserRecord) => boolean;
  username: string;
}): TDatabase["users"][number] | null {
  for (const user of orderedCandidateAuthUsers(database, username)) {
    if (passwordMatches(password, user)) return user;
  }
  return null;
}

// Async twin of {@link authenticatedAuthUserForCredentials} that awaits an async password
// matcher so the login hot path does not block the event loop during pbkdf2.
async function authenticateAuthUserForCredentialsAsync<TDatabase extends { users: AuthSessionUserRecord[] }>({
  database,
  password,
  passwordMatches,
  username
}: {
  database: TDatabase;
  password: string;
  passwordMatches: (password: string, user: AuthSessionUserRecord) => boolean | Promise<boolean>;
  username: string;
}): Promise<TDatabase["users"][number] | null> {
  for (const user of orderedCandidateAuthUsers(database, username)) {
    if (await passwordMatches(password, user)) return user;
  }
  return null;
}

function profileCurriculumProfile(profile: AuthSessionStudentProfileRecord) {
  return normalizeStoredCurriculumProfile({
    curriculumTrack: profile.curriculum_track,
    region: profile.curriculum_region,
    publisher: profile.textbook_publisher
  });
}

function fallbackGradeForCurriculumProfile({
  currentGrade,
  isGradeAllowedForCurriculumProfile,
  profile
}: {
  currentGrade: GradeId;
  isGradeAllowedForCurriculumProfile: (grade: GradeId, profile: CurriculumProfile) => boolean;
  profile: CurriculumProfile;
}) {
  if (isGradeAllowedForCurriculumProfile(currentGrade, profile)) return currentGrade;
  if (profile.publisher === "US_FL_MATH") return "P6";
  return currentGrade;
}

export function defaultAuthUserSettingsRecord(
  userId: string,
  grade: GradeId,
  now: Date = new Date()
): AuthSessionUserSettingsRecord {
  return {
    user_id: userId,
    language: "en",
    theme: "dark",
    selected_grade: grade,
    updated_at: now.toISOString()
  };
}

type AuthenticatedUserFromAuthRecordsInput = {
  mediaObjectUrlForKey: (objectKey: string) => string | null | undefined;
  now?: Date;
  profile: AuthSessionStudentProfileRecord;
  settingsRecord?: AuthSessionUserSettingsRecord | null;
  user: AuthSessionUserRecord;
};

type AuthenticatedUserFromAuthDatabaseInput<TDatabase extends Pick<AuthSessionPersistenceDatabase, "student_profiles" | "user_settings">> = {
  database: TDatabase;
  mediaObjectUrlForKey: (objectKey: string) => string | null | undefined;
  now?: Date;
  user: AuthSessionUserRecord;
};

function toAuthenticatedUserFromRecords({
  mediaObjectUrlForKey,
  now = new Date(),
  profile,
  settingsRecord,
  user
}: AuthenticatedUserFromAuthRecordsInput): AuthSession | null {
  const curriculumProfile = normalizeStoredCurriculumProfile({
    curriculumTrack: profile.curriculum_track,
    region: profile.curriculum_region,
    publisher: profile.textbook_publisher
  });
  const curriculumTrack = curriculumTrackForProfile(curriculumProfile) ?? (user.role === "student" ? undefined : "HK");
  if (!curriculumTrack) return null;

  const settings = settingsRecord ?? defaultAuthUserSettingsRecord(user.id, profile.grade, now);
  const avatarImageObjectKey = normalizeStoredMediaObjectKey(profile.avatar_media_object_key);
  const avatarImageUrl = avatarImageObjectKey ? mediaObjectUrlForKey(avatarImageObjectKey) || undefined : undefined;

  return {
    user: {
      id: user.id,
      name: profile.name,
      username: user.username,
      email: user.email,
      schoolId: user.school_id,
      passwordMustChange: user.password_must_change ?? false,
      avatarId: isValidAuthStudentAvatarId(profile.avatar_id) ? profile.avatar_id : defaultAuthStudentAvatarId,
      avatarImageDataUrl: avatarImageUrl ?? normalizeAuthStudentAvatarImageDataUrl(profile.avatar_image_data_url),
      avatarImageObjectKey,
      avatarImageUrl,
      grade: profile.grade,
      curriculumTrack,
      curriculumProfile,
      role: user.role
    },
    settings: {
      language: settings.language,
      theme: settings.theme,
      selectedGrade: settings.selected_grade
    }
  };
}

export function authenticatedUserFromAuthRecords(input: AuthenticatedUserFromAuthRecordsInput): AuthSession | null {
  return toAuthenticatedUserFromRecords(input);
}

export function authenticatedUserFromAuthDatabase<TDatabase extends Pick<AuthSessionPersistenceDatabase, "student_profiles" | "user_settings">>({
  database,
  mediaObjectUrlForKey,
  now,
  user
}: AuthenticatedUserFromAuthDatabaseInput<TDatabase>): AuthSession | null {
  const profile = database.student_profiles.find((candidate) => candidate.user_id === user.id);
  if (!profile) return null;
  const settingsRecord = database.user_settings.find((candidate) => candidate.user_id === user.id) ?? null;
  return authenticatedUserFromAuthRecords({
    mediaObjectUrlForKey,
    now,
    profile,
    settingsRecord,
    user
  });
}

export function authenticatedLoginResultFromAuthDatabase<TDatabase extends Pick<AuthSessionPersistenceDatabase, "student_profiles" | "user_settings">>({
  database,
  mediaObjectUrlForKey,
  now,
  user
}: AuthenticatedUserFromAuthDatabaseInput<TDatabase>): AuthLoginAuthenticatedResult<TDatabase> | { status: "invalid" } {
  const session = authenticatedUserFromAuthDatabase({
    database,
    mediaObjectUrlForKey,
    now,
    user
  });
  return session ? { status: "authenticated" as const, session, database } : { status: "invalid" as const };
}

function mergeAuthRecordsByKey<T>(snapshotRecords: T[] | undefined, hotRecords: T[] | undefined, keyFor: (record: T) => string) {
  const merged = new Map<string, T>();
  (snapshotRecords ?? []).forEach((record) => merged.set(keyFor(record), record));
  (hotRecords ?? []).forEach((record) => merged.set(keyFor(record), record));
  return Array.from(merged.values());
}

export function overlayAuthSessionDatabaseWithHotAuthRows<TDatabase extends Partial<AuthSessionPersistenceDatabase>>(
  database: TDatabase,
  hotRows: AuthHotRows
) {
  return {
    ...database,
    users: mergeAuthRecordsByKey(database.users, hotRows.users, (user) => user.id),
    student_profiles: mergeAuthRecordsByKey(database.student_profiles, hotRows.studentProfiles, (profile) => profile.user_id),
    user_settings: mergeAuthRecordsByKey(database.user_settings, hotRows.userSettings, (settings) => settings.user_id),
    password_reset_tokens: mergeAuthRecordsByKey(
      database.password_reset_tokens,
      hotRows.passwordResetTokens,
      (token) => token.id
    )
  };
}

// Builds the login result once a credential-matched user (or null) is known. Shared by the
// sync and async hot-rows entry points so both produce identical results.
function authHotRowsLoginResult({
  hotRows,
  mediaObjectUrlForKey,
  now,
  user
}: {
  hotRows: Pick<AuthHotRows, "users" | "studentProfiles" | "userSettings">;
  mediaObjectUrlForKey: (objectKey: string) => string | null | undefined;
  now: Date;
  user: AuthSessionUserRecord | null;
}): AuthLoginResult<never> {
  if (!user) return { status: "invalid" };

  const profile = hotRows.studentProfiles.find((candidate) => candidate.user_id === user.id);
  if (!profile) return { status: "invalid" };

  if (user.role === "student" && !isValidAuthCurriculumTrack(profile.curriculum_track)) {
    return {
      status: "requires-curriculum-track",
      role: user.role,
      user: {
        id: user.id,
        name: profile.name,
        username: user.username,
        grade: profile.grade
      }
    };
  }

  const session = toAuthenticatedUserFromRecords({
    mediaObjectUrlForKey,
    now,
    profile,
    settingsRecord: hotRows.userSettings.find((candidate) => candidate.user_id === user.id) ?? null,
    user
  });

  return session ? { status: "authenticated", session } : { status: "invalid" };
}

export function authenticatedUserForAuthHotRows({
  hotRows,
  mediaObjectUrlForKey = mediaObjectAccessUrl,
  now = new Date(),
  password,
  passwordMatches = authPasswordMatches,
  username
}: {
  hotRows: Pick<AuthHotRows, "users" | "studentProfiles" | "userSettings">;
  mediaObjectUrlForKey?: (objectKey: string) => string | null | undefined;
  now?: Date;
  password: string;
  passwordMatches?: (password: string, user: AuthSessionUserRecord) => boolean;
  username: string;
}): AuthLoginResult<never> {
  const user = authenticatedAuthUserForCredentials({
    database: { users: hotRows.users },
    password,
    passwordMatches,
    username
  });
  return authHotRowsLoginResult({ hotRows, mediaObjectUrlForKey, now, user });
}

// Async twin of {@link authenticatedUserForAuthHotRows}. Used by the production Postgres
// login hot path so the pbkdf2 verification runs off the event loop.
export async function authenticatedUserForAuthHotRowsAsync({
  hotRows,
  mediaObjectUrlForKey = mediaObjectAccessUrl,
  now = new Date(),
  password,
  passwordMatches = authPasswordMatchesAsync,
  username
}: {
  hotRows: Pick<AuthHotRows, "users" | "studentProfiles" | "userSettings">;
  mediaObjectUrlForKey?: (objectKey: string) => string | null | undefined;
  now?: Date;
  password: string;
  passwordMatches?: (password: string, user: AuthSessionUserRecord) => boolean | Promise<boolean>;
  username: string;
}): Promise<AuthLoginResult<never>> {
  const user = await authenticateAuthUserForCredentialsAsync({
    database: { users: hotRows.users },
    password,
    passwordMatches,
    username
  });
  return authHotRowsLoginResult({ hotRows, mediaObjectUrlForKey, now, user });
}

export function createAuthSessionHotTableTestHooks({
  mediaObjectUrlForKey = mediaObjectAccessUrl,
  now,
  passwordMatches = authPasswordMatches
}: {
  mediaObjectUrlForKey?: (objectKey: string) => string | null | undefined;
  now?: Date;
  passwordMatches?: (password: string, user: AuthSessionUserRecord) => boolean;
} = {}) {
  return {
    authenticatedUserForHotAuthRows: (
      hotRows: Pick<AuthHotRows, "users" | "studentProfiles" | "userSettings">,
      username: string,
      password: string
    ) =>
      authenticatedUserForAuthHotRows({
        hotRows,
        mediaObjectUrlForKey,
        now,
        password,
        passwordMatches,
        username
      }),
    overlayDatabaseWithHotAuthRows: overlayAuthSessionDatabaseWithHotAuthRows
  };
}

export function createAuthSessionPersistenceStore({
  applyFixedExampleAccountScope,
  authenticateUserForLoginBeforeSnapshot,
  createId = randomUUID,
  createParentInviteCode,
  createPasswordResetRequestBeforeSnapshot,
  createResetToken = () => randomBytes(32).toString("base64url"),
  demoAccountSeeds = [],
  demoPassword = "",
  fallbackAuthenticatedUser = () => null,
  fixedExampleScopeForUserId = () => null,
  hashPassword = hashAuthPassword,
  hashPasswordResetToken = hashAuthPasswordResetToken,
  initialStudentLessonProgressRecords = () => [],
  isGradeAllowedForCurriculumProfile = () => true,
  lookupBeforeRead,
  mediaObjectUrlForKey = mediaObjectAccessUrl,
  mutateDatabase,
  now = () => new Date(),
  passwordMatches = authPasswordMatches,
  passwordResetTokenMaxAgeMs = defaultPasswordResetTokenMaxAgeMs,
  publicContentDatabaseForExampleLogin,
  readDatabase,
  resetUserPasswordBeforeSnapshot,
  shouldRetryLoginAfterFastInvalid,
  studentSelectedGradePolicy,
  updateSettingsBeforeSnapshot
}: AuthSessionPersistenceStoreDependencies) {
  const runMutation = async <T>(mutator: (database: AuthSessionPersistenceDatabase) => T | Promise<T>) => {
    if (!mutateDatabase) {
      throw new Error("Auth session persistence mutation dependency is not configured.");
    }
    return mutateDatabase(mutator);
  };

  const authenticatedUserForCredentials = <TDatabase extends { users: AuthSessionUserRecord[] }>(
    database: TDatabase,
    username: string,
    password: string
  ): TDatabase["users"][number] | null =>
    authenticatedAuthUserForCredentials({
      database,
      password,
      passwordMatches,
      username
    });

  const loginResultForUser = <TDatabase extends AuthSessionPersistenceDatabase>(
    database: TDatabase,
    user: TDatabase["users"][number]
  ): AuthLoginResult<TDatabase> => {
    const profile = database.student_profiles.find((candidate) => candidate.user_id === user.id);
    if (!profile) return { status: "invalid" };

    if (user.role === "student" && !isValidAuthCurriculumTrack(profile.curriculum_track)) {
      return {
        status: "requires-curriculum-track",
        role: user.role,
        user: {
          id: user.id,
          name: profile.name,
          username: user.username,
          grade: profile.grade
        }
      };
    }

    const session = toAuthenticatedUserFromRecords({
      mediaObjectUrlForKey,
      now: now(),
      profile,
      settingsRecord: database.user_settings.find((candidate) => candidate.user_id === user.id) ?? null,
      user
    });

    return session ? { status: "authenticated", session, database } : { status: "invalid" };
  };

  const shouldRetryDemoLoginAfterFastInvalid = (username: string, password: string) => {
    if (password !== demoPassword) return false;
    return demoAccountSeeds.some((seed) => authDemoSeedMatchesIdentifier(seed, username));
  };

  const fixedExampleProfileForSeed = (seed: AuthDemoAccountSeed) =>
    authDemoAccountSeedProfile(seed, fixedExampleScopeForUserId);

  const fixedExampleLanguageForSeed = (seed: AuthDemoAccountSeed) =>
    authDemoAccountSeedLanguage(seed, fixedExampleScopeForUserId);

  const chooseFixedExampleSeed = (
    candidateSeeds: readonly AuthDemoAccountSeed[],
    requestedProfile?: CurriculumProfile
  ) => chooseAuthFixedExampleSeed(candidateSeeds, requestedProfile, fixedExampleScopeForUserId);

  const loginResultForFixedExampleSeed = <TDatabase extends AuthSessionPersistenceDatabase>(
    seed: AuthDemoAccountSeed,
    database: TDatabase,
    {
      language,
      theme
    }: {
      language?: Language;
      theme?: ThemeMode;
    } = {}
  ): AuthFlexibleExampleLoginResult<TDatabase> => {
    const scope = fixedExampleScopeForUserId(seed.id);
    if (!scope) return { status: "invalid" };

    const nowDate = now();
    const nowIso = nowDate.toISOString();
    const profile = fixedExampleProfileForSeed(seed);
    const user: AuthSessionUserRecord = {
      id: seed.id,
      username: seed.username,
      normalized_username: normalizeAuthIdentifier(seed.username),
      email: seed.email,
      normalized_email: normalizeAuthIdentifier(seed.email),
      password_hash: "",
      password_salt: "",
      password_must_change: false,
      role: seed.role,
      created_at: nowIso
    };
    const profileRecord: AuthSessionStudentProfileRecord = {
      user_id: seed.id,
      name: seed.username,
      grade: scope.grade,
      curriculum_track: curriculumTrackForProfile(profile) ?? seed.curriculumTrack,
      curriculum_region: profile.region,
      textbook_publisher: profile.publisher,
      avatar_id: seed.avatarId
    };
    const settingsRecord: AuthSessionUserSettingsRecord = {
      user_id: seed.id,
      language: language && validLanguages.has(language) ? language : fixedExampleLanguageForSeed(seed),
      theme: theme && validThemes.has(theme) ? theme : "dark",
      selected_grade: scope.grade,
      updated_at: nowIso
    };
    const session = toAuthenticatedUserFromRecords({
      mediaObjectUrlForKey,
      now: nowDate,
      profile: profileRecord,
      settingsRecord,
      user
    });

    return session ? { status: "authenticated", session, database } : { status: "invalid" };
  };

  const createCurriculumAccountUser = async ({
    role,
    name,
    username,
    email,
    password,
    grade,
    curriculumTrack,
    curriculumProfile,
    language,
    parentalConsent,
    theme
  }: AuthCurriculumAccountCreationInput & { role: "student" | "teacher" }): Promise<AuthCurriculumAccountCreationResult> => {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    const normalizedUsername = normalizeAuthIdentifier(trimmedUsername);
    const trimmedEmail = email?.trim() || (isLikelyEmailIdentifier(trimmedUsername) ? trimmedUsername : "");
    const normalizedEmail = trimmedEmail ? normalizeAuthIdentifier(trimmedEmail) : "";
    const effectiveCurriculumProfile = curriculumProfile
      ? normalizeStoredCurriculumProfile({ region: curriculumProfile.region, publisher: curriculumProfile.publisher })
      : curriculumTrack
        ? curriculumProfileForTrack(curriculumTrack)
        : null;
    const effectiveCurriculumTrack = effectiveCurriculumProfile
      ? curriculumTrackForProfile(effectiveCurriculumProfile)
      : undefined;

    if (
      !trimmedName ||
      !trimmedUsername ||
      (trimmedEmail && !isLikelyEmailIdentifier(trimmedEmail)) ||
      password.length < 5 ||
      !effectiveCurriculumProfile ||
      !effectiveCurriculumTrack ||
      !isGradeAllowedForCurriculumProfile(grade, effectiveCurriculumProfile)
    ) {
      return { status: "invalid" };
    }

    return runMutation((database) => {
      if (database.users.some((candidate) =>
        candidate.normalized_username === normalizedUsername ||
        (normalizedEmail && candidate.normalized_email === normalizedEmail)
      )) {
        return { status: "duplicate" };
      }

      const nowDate = now();
      const nowIso = nowDate.toISOString();
      const userId = `${role}-${createId()}`;
      const hashedPassword = hashPassword(password);
      const user: AuthSessionUserRecord = {
        id: userId,
        username: trimmedUsername,
        normalized_username: normalizedUsername,
        email: trimmedEmail || undefined,
        normalized_email: normalizedEmail || undefined,
        password_hash: hashedPassword.hash,
        password_salt: hashedPassword.salt,
        role,
        created_at: nowIso,
        ...(role === "student" && parentalConsent ? { parental_consent: parentalConsent } : {})
      };

      database.users.push(user);
      database.student_profiles.push({
        user_id: userId,
        name: trimmedName,
        grade,
        curriculum_track: effectiveCurriculumTrack,
        curriculum_region: effectiveCurriculumProfile.region,
        textbook_publisher: effectiveCurriculumProfile.publisher,
        ...(role === "student" && createParentInviteCode
          ? { parent_invite_code: createParentInviteCode(database) }
          : {}),
        avatar_id: role === "teacher" ? "sigma" : defaultAuthStudentAvatarId
      });
      database.user_settings.push({
        user_id: userId,
        language: language && validLanguages.has(language)
          ? language
          : effectiveCurriculumProfile.region === "MAINLAND"
            ? "zh-Hans"
            : "en",
        theme: theme && validThemes.has(theme) ? theme : "dark",
        selected_grade: grade,
        updated_at: nowIso
      });
      if (role === "student") {
        database.lesson_progress ??= [];
        database.lesson_progress.push(...initialStudentLessonProgressRecords(userId, nowIso));
      }

      const profile = database.student_profiles.find((candidate) => candidate.user_id === userId);
      const settings = database.user_settings.find((candidate) => candidate.user_id === userId) ?? null;
      if (!profile) return { status: "invalid" };

      const session = toAuthenticatedUserFromRecords({
        mediaObjectUrlForKey,
        now: nowDate,
        profile,
        settingsRecord: settings,
        user
      });
      return session ? { status: "created", session } : { status: "invalid" };
    });
  };

  return {
    authenticatedUserForCredentials,
    async authenticateUser(username: string, password: string) {
      const database = await readDatabase();
      const user = authenticatedUserForCredentials(database, username, password);
      if (!user) return null;

      const profile = database.student_profiles.find((candidate) => candidate.user_id === user.id);
      if (!profile) return null;

      return toAuthenticatedUserFromRecords({
        mediaObjectUrlForKey,
        now: now(),
        profile,
        settingsRecord: database.user_settings.find((candidate) => candidate.user_id === user.id) ?? null,
        user
      });
    },
    async authenticateUserForLogin(username: string, password: string): Promise<AuthLoginResult> {
      const fastResult = await authenticateUserForLoginBeforeSnapshot?.(username, password) ?? null;
      const shouldRetryFastInvalid =
        shouldRetryLoginAfterFastInvalid?.(username, password) ??
        shouldRetryDemoLoginAfterFastInvalid(username, password);
      if (fastResult && !(fastResult.status === "invalid" && shouldRetryFastInvalid)) {
        return fastResult;
      }

      const database = await readDatabase();
      const user = authenticatedUserForCredentials(database, username, password);
      return user ? loginResultForUser(database, user) : { status: "invalid" };
    },
    shouldRetryDemoLoginAfterFastInvalid,
    async authenticateFlexibleExampleAccountForLogin({
      username,
      password,
      curriculumProfile,
      selectedGrade,
      language,
      theme
    }: AuthFlexibleExampleLoginInput): Promise<AuthFlexibleExampleLoginResult> {
      void selectedGrade;
      const identifierMatchesDemo = demoAccountSeeds.some((seed) => authDemoSeedMatchesIdentifier(seed, username));
      if (!identifierMatchesDemo) return { status: "not-example-account" };
      if (password !== demoPassword) return { status: "invalid" };

      const requestedProfile = curriculumProfile
        ? normalizeStoredCurriculumProfile({
          region: curriculumProfile.region,
          publisher: curriculumProfile.publisher
        })
        : undefined;
      const candidateSeeds = demoAccountSeeds.filter((seed) =>
        Boolean(fixedExampleScopeForUserId(seed.id)) && authDemoSeedMatchesIdentifier(seed, username)
      );
      const selectedSeed = chooseFixedExampleSeed(candidateSeeds, requestedProfile);
      if (!selectedSeed) return { status: "invalid" };

      const database = publicContentDatabaseForExampleLogin?.() ?? await readDatabase();
      return loginResultForFixedExampleSeed(selectedSeed, database, { language, theme });
    },
    async completeStudentCurriculumTrackSelection({
      username,
      password,
      curriculumTrack,
      curriculumProfile,
      selectedGrade,
      language,
      theme
    }: AuthCurriculumTrackSelectionInput): Promise<AuthLoginResult> {
      const effectiveCurriculumProfile = curriculumProfile
        ? normalizeStoredCurriculumProfile({ region: curriculumProfile.region, publisher: curriculumProfile.publisher })
        : curriculumTrack
          ? curriculumProfileForTrack(curriculumTrack)
          : null;
      const effectiveCurriculumTrack = effectiveCurriculumProfile
        ? curriculumTrackForProfile(effectiveCurriculumProfile)
        : undefined;
      if (!effectiveCurriculumProfile || !effectiveCurriculumTrack) return { status: "invalid" };

      return runMutation((database) => {
        const user = authenticatedUserForCredentials(database, username, password);
        if (!user) return { status: "invalid" };
        if (user.role !== "student") return loginResultForUser(database, user);

        const profile = database.student_profiles.find((candidate) => candidate.user_id === user.id);
        if (!profile) return { status: "invalid" };

        const existingCurriculumTrack = isValidAuthCurriculumTrack(profile.curriculum_track)
          ? profile.curriculum_track
          : undefined;
        const storedCurriculumProfile = existingCurriculumTrack
          ? profileCurriculumProfile(profile)
          : effectiveCurriculumProfile;
        const storedCurriculumTrack = existingCurriculumTrack ?? effectiveCurriculumTrack;

        if (!existingCurriculumTrack) {
          profile.curriculum_track = storedCurriculumTrack;
          profile.curriculum_region = storedCurriculumProfile.region;
          profile.textbook_publisher = storedCurriculumProfile.publisher;
        }

        const nowDate = now();
        const settingsIndex = database.user_settings.findIndex((candidate) => candidate.user_id === user.id);
        const currentSettings =
          settingsIndex >= 0 ? database.user_settings[settingsIndex] : defaultAuthUserSettingsRecord(user.id, profile.grade, nowDate);
        const fallbackGrade = fallbackGradeForCurriculumProfile({
          currentGrade: currentSettings.selected_grade,
          isGradeAllowedForCurriculumProfile,
          profile: storedCurriculumProfile
        });
        const requestedGrade =
          selectedGrade && isGradeAllowedForCurriculumProfile(selectedGrade, storedCurriculumProfile)
            ? selectedGrade
            : fallbackGrade;
        const nextGrade = existingCurriculumTrack ? profile.grade : requestedGrade;
        const nextSelectedGrade = existingCurriculumTrack ? requestedGrade : nextGrade;
        if (!existingCurriculumTrack) profile.grade = nextGrade;

        const nextSettings: AuthSessionUserSettingsRecord = {
          ...currentSettings,
          language: language && validLanguages.has(language) ? language : currentSettings.language,
          theme: theme && validThemes.has(theme) ? theme : currentSettings.theme,
          selected_grade: nextSelectedGrade,
          updated_at: nowDate.toISOString()
        };

        if (settingsIndex >= 0) {
          database.user_settings[settingsIndex] = nextSettings;
        } else {
          database.user_settings.push(nextSettings);
        }

        return loginResultForUser(database, user);
      });
    },
    async createParentUser({
      name,
      username,
      email,
      password,
      language,
      theme
    }: AuthParentUserCreationInput): Promise<AuthParentUserCreationResult> {
      const trimmedName = cleanAuthStudentProfileName(name);
      const trimmedEmail = email?.trim() ?? "";
      const trimmedUsername = username?.trim() || trimmedEmail;
      const normalizedUsername = normalizeAuthIdentifier(trimmedUsername);
      const normalizedEmail = trimmedEmail ? normalizeAuthIdentifier(trimmedEmail) : "";

      if (
        !trimmedName ||
        !trimmedUsername ||
        !trimmedEmail ||
        !isLikelyEmailIdentifier(trimmedEmail) ||
        password.length < 5
      ) {
        return { status: "invalid" };
      }

      return runMutation((database) => {
        if (database.users.some((candidate) =>
          candidate.normalized_username === normalizedUsername ||
          candidate.normalized_email === normalizedEmail
        )) {
          return { status: "duplicate" };
        }

        const nowDate = now();
        const nowIso = nowDate.toISOString();
        const userId = `parent-${createId()}`;
        const hashedPassword = hashPassword(password);
        const curriculumProfile = curriculumProfileForTrack(defaultAuthCurriculumTrack);
        const user: AuthSessionUserRecord = {
          id: userId,
          username: trimmedUsername,
          normalized_username: normalizedUsername,
          email: trimmedEmail,
          normalized_email: normalizedEmail,
          password_hash: hashedPassword.hash,
          password_salt: hashedPassword.salt,
          password_must_change: false,
          role: "parent",
          created_at: nowIso
        };

        database.users.push(user);
        database.student_profiles.push({
          user_id: userId,
          name: trimmedName,
          grade: "S3",
          curriculum_track: defaultAuthCurriculumTrack,
          curriculum_region: curriculumProfile.region,
          textbook_publisher: curriculumProfile.publisher,
          avatar_id: "theta"
        });
        database.user_settings.push({
          user_id: userId,
          language: language && validLanguages.has(language) ? language : "en",
          theme: theme && validThemes.has(theme) ? theme : "dark",
          selected_grade: "S3",
          updated_at: nowIso
        });

        const profile = database.student_profiles.find((candidate) => candidate.user_id === userId);
        const settings = database.user_settings.find((candidate) => candidate.user_id === userId) ?? null;
        if (!profile) return { status: "invalid" };

        const session = toAuthenticatedUserFromRecords({
          mediaObjectUrlForKey,
          now: nowDate,
          profile,
          settingsRecord: settings,
          user
        });
        return session ? { status: "created", session } : { status: "invalid" };
      });
    },
    async createStudentUser(input: AuthCurriculumAccountCreationInput) {
      return createCurriculumAccountUser({ ...input, role: "student" });
    },
    async createTeacherUser(input: AuthCurriculumAccountCreationInput) {
      return createCurriculumAccountUser({ ...input, role: "teacher" });
    },
    async getAuthenticatedUserById(userId: string) {
      const hotUser = await lookupBeforeRead?.(userId);
      if (hotUser) return hotUser;

      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user) return fallbackAuthenticatedUser(userId);

      const profile = database.student_profiles.find((candidate) => candidate.user_id === userId);
      if (!profile) return null;

      return toAuthenticatedUserFromRecords({
        mediaObjectUrlForKey,
        now: now(),
        profile,
        settingsRecord: database.user_settings.find((candidate) => candidate.user_id === userId) ?? null,
        user
      });
    },
    async updateUserSettings(
      userId: string,
      patch: Partial<{ language: Language; theme: ThemeMode; selectedGrade: GradeId }>
    ) {
      const hotUpdate = await updateSettingsBeforeSnapshot?.(userId, patch);
      if (hotUpdate) return hotUpdate;

      return runMutation((database) => {
        const user = database.users.find((candidate) => candidate.id === userId);
        if (!user) return null;

        const profile = database.student_profiles.find((candidate) => candidate.user_id === userId);
        if (!profile) return null;

        const fixedExampleScope = fixedExampleScopeForUserId(userId);
        if (fixedExampleScope) {
          applyFixedExampleAccountScope?.(database, userId);
        }

        const settingsIndex = database.user_settings.findIndex((candidate) => candidate.user_id === userId);
        const currentSettings =
          settingsIndex >= 0 ? database.user_settings[settingsIndex] : defaultAuthUserSettingsRecord(userId, profile.grade, now());

        const curriculumProfile = fixedExampleScope?.curriculumProfile ?? profileCurriculumProfile(profile);
        const canUpdateSelectedGrade = Boolean(
          patch.selectedGrade && isGradeAllowedForCurriculumProfile(patch.selectedGrade, curriculumProfile)
        );
        const updatedAt = now().toISOString();
        const nextSettings: AuthSessionUserSettingsRecord = {
          ...currentSettings,
          language: patch.language && validLanguages.has(patch.language) ? patch.language : currentSettings.language,
          theme: patch.theme && validThemes.has(patch.theme) ? patch.theme : currentSettings.theme,
          selected_grade: authSelectedGradeForSettingsUpdate({
            currentSelectedGrade: currentSettings.selected_grade,
            fixedExampleGrade: fixedExampleScope?.grade,
            profileGrade: profile.grade,
            requestedGrade: patch.selectedGrade,
            requestedGradeAllowed: canUpdateSelectedGrade,
            studentSelectedGradePolicy,
            user: {
              id: user.id,
              role: user.role,
              curriculumProfile
            }
          }),
          updated_at: updatedAt
        };

        if (settingsIndex >= 0) {
          database.user_settings[settingsIndex] = nextSettings;
        } else {
          database.user_settings.push(nextSettings);
        }

        return toAuthenticatedUserFromRecords({
          mediaObjectUrlForKey,
          now: now(),
          profile,
          settingsRecord: nextSettings,
          user
        });
      });
    },
    async changeAuthenticatedUserPassword({
      userId,
      currentPassword,
      password
    }: AuthPasswordChangeInput): Promise<AuthPasswordChangeResult> {
      if (!currentPassword || password.length < 5) return { status: "invalid" };

      return runMutation((database) => {
        const user = database.users.find((candidate) => candidate.id === userId);
        if (!user || !passwordMatches(currentPassword, user)) return { status: "invalid" };

        const profile = database.student_profiles.find((candidate) => candidate.user_id === userId);
        if (!profile) return { status: "invalid" };

        const hashedPassword = hashPassword(password);
        user.password_hash = hashedPassword.hash;
        user.password_salt = hashedPassword.salt;
        user.password_must_change = false;

        const nowDate = now();
        const session = toAuthenticatedUserFromRecords({
          mediaObjectUrlForKey,
          now: nowDate,
          profile,
          settingsRecord: database.user_settings.find((candidate) => candidate.user_id === userId) ?? null,
          user
        });
        return session ? { status: "updated", session } : { status: "invalid" };
      });
    },
    async createPasswordResetRequest(identifier: string) {
      const normalizedIdentifier = normalizeAuthIdentifier(identifier);
      if (!normalizedIdentifier) return null;

      const hotRequest = await createPasswordResetRequestBeforeSnapshot?.(identifier);
      if (hotRequest !== undefined) return hotRequest;

      return runMutation((database) => {
        const nowDate = now();
        const nowMs = nowDate.getTime();
        database.password_reset_tokens = (database.password_reset_tokens ?? []).filter(
          (token) => !token.used_at && Date.parse(token.expires_at) > nowMs
        );

        const user = database.users.find(
          (candidate) =>
            candidate.normalized_username === normalizedIdentifier ||
            candidate.normalized_email === normalizedIdentifier
        );
        if (!user) return null;

        const resetToken = createResetToken();
        const expiresAt = new Date(nowMs + passwordResetTokenMaxAgeMs).toISOString();
        database.password_reset_tokens.push({
          id: createId(),
          user_id: user.id,
          token_hash: hashPasswordResetToken(resetToken),
          expires_at: expiresAt,
          used_at: null,
          created_at: nowDate.toISOString()
        });

        return { token: resetToken, expiresAt, email: user.email, username: user.username };
      });
    },
    async resetUserPassword(token: string, password: string): Promise<AuthPasswordResetResult> {
      const trimmedToken = token.trim();
      if (!trimmedToken || password.length < 5) {
        return { status: "invalid" };
      }

      const hotReset = await resetUserPasswordBeforeSnapshot?.(token, password);
      if (hotReset !== undefined) return hotReset;

      const tokenHash = hashPasswordResetToken(trimmedToken);
      return runMutation((database) => {
        const nowDate = now();
        const nowMs = nowDate.getTime();
        const resetToken = (database.password_reset_tokens ?? []).find(
          (candidate) => candidate.token_hash === tokenHash
        );
        if (!resetToken || resetToken.used_at || Date.parse(resetToken.expires_at) <= nowMs) {
          return { status: "invalid" };
        }

        const user = database.users.find((candidate) => candidate.id === resetToken.user_id);
        if (!user) return { status: "invalid" };

        const profile = database.student_profiles.find((candidate) => candidate.user_id === resetToken.user_id);
        if (!profile) return { status: "invalid" };

        const hashedPassword = hashPassword(password);
        user.password_hash = hashedPassword.hash;
        user.password_salt = hashedPassword.salt;
        user.password_must_change = false;
        resetToken.used_at = nowDate.toISOString();

        const session = toAuthenticatedUserFromRecords({
          mediaObjectUrlForKey,
          now: nowDate,
          profile,
          settingsRecord: database.user_settings.find((candidate) => candidate.user_id === resetToken.user_id) ?? null,
          user
        });
        return session ? { status: "reset", session } : { status: "invalid" };
      });
    },
    async updateUserProfile(
      userId: string,
      patch: Partial<{
        name: string;
        avatarId: StudentAvatarId;
        avatarImageDataUrl: string | null;
        avatarImageObject: AuthMediaObjectReference | null;
      }>
    ) {
      return runMutation((database) => {
        const user = database.users.find((candidate) => candidate.id === userId);
        if (!user) return null;

        const profile = database.student_profiles.find((candidate) => candidate.user_id === userId);
        if (!profile) return null;

        if (typeof patch.name === "string") {
          const nextName = cleanAuthStudentProfileName(patch.name);
          if (nextName.length < 2 || nextName.length > 48) return null;
          profile.name = nextName;
        }

        if (patch.avatarId) {
          if (!isValidAuthStudentAvatarId(patch.avatarId)) return null;
          profile.avatar_id = patch.avatarId;
        } else if (!isValidAuthStudentAvatarId(profile.avatar_id)) {
          profile.avatar_id = defaultAuthStudentAvatarId;
        }

        if ("avatarImageDataUrl" in patch) {
          if (patch.avatarImageDataUrl === null || patch.avatarImageDataUrl === "") {
            delete profile.avatar_image_data_url;
            delete profile.avatar_media_object_key;
          } else if (isValidAuthStudentAvatarImageDataUrl(patch.avatarImageDataUrl)) {
            profile.avatar_image_data_url = patch.avatarImageDataUrl;
            delete profile.avatar_media_object_key;
          } else {
            return null;
          }
        } else {
          profile.avatar_image_data_url = normalizeAuthStudentAvatarImageDataUrl(profile.avatar_image_data_url);
        }

        if ("avatarImageObject" in patch) {
          if (patch.avatarImageObject === null) {
            delete profile.avatar_media_object_key;
          } else {
            const objectKey = normalizeStoredMediaObjectKey(patch.avatarImageObject?.objectKey);
            if (!objectKey) return null;
            profile.avatar_media_object_key = objectKey;
            delete profile.avatar_image_data_url;
          }
        } else {
          profile.avatar_media_object_key = normalizeStoredMediaObjectKey(profile.avatar_media_object_key);
        }

        return toAuthenticatedUserFromRecords({
          mediaObjectUrlForKey,
          now: now(),
          profile,
          settingsRecord: database.user_settings.find((candidate) => candidate.user_id === userId) ?? null,
          user
        });
      });
    }
  };
}
