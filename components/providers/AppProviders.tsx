"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { isValidGradeId } from "@/data/grades";
import {
  appShellBootstrapIsAuthorized,
  appShellIdentityFromBootstrap,
  appShellSessionSyncStorageKey,
  sameAppShellIdentity,
  toAuthenticatedAppShellBootstrap,
  type AppShellBootstrap,
  type AppShellIdentity,
  type AppShellUserSafe
} from "@/lib/appShellBootstrap";
import { isImmersiveStudentPracticeGamePath } from "@/lib/gameBasedLearning";
import { dictionary, isValidLanguage, localeForLanguage, textForLanguage } from "@/lib/i18n";
import { curriculumProfileForTrack, curriculumTrackForProfile, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import { isStudentLessonPath, studentLessonsPath } from "@/lib/lessonLinks";
import { isLegacyRoadmapPath, isStudentRoadmapPath } from "@/lib/roadmapRoutes";
import {
  coalesceLearningAnalyticsEvents,
  createLearningAnalyticsEvent,
  isHighFrequencyLearningAnalyticsEvent,
  learningAnalyticsUpdatedEventName,
  maxStoredLearningAnalyticsEvents,
  throttledLearningAnalyticsFlushMs
} from "@/lib/learningAnalytics";
import { isVisualizationLabPath } from "@/lib/visualizationRoutes";
import type {
  CurriculumTrack,
  CurriculumProfile,
  GradeId,
  Language,
  LearningAnalyticsEvent,
  LearningAnalyticsEventSource,
  LearningAnalyticsInput,
  LessonEntryTarget,
  LocalizedText,
  MistakeBookItem,
  MistakeRecord,
  StudentAvatarId,
  StudentSession,
  ThemeMode
} from "@/types";

export const demoStudentAccount = {
  username: "HK Student Peter",
  password: "12345"
} as const;

export const demoMainlandStudentAccount = {
  username: "Student Peter",
  password: "12345"
} as const;

export const demoHongKongTeacherAccount = {
  username: "HK Teacher Chan",
  password: "12345"
} as const;

export const demoMainlandTeacherAccount = {
  username: "Teacher Phoebe",
  password: "12345"
} as const;

export const demoUnitedStatesStudentAccount = {
  username: "Student Shirleen",
  password: "12345"
} as const;

export const demoUnitedStatesTeacherAccount = {
  username: "Teacher Scott",
  password: "12345"
} as const;

export const demoParentAccount = {
  username: "Peter's Parent",
  password: "12345"
} as const;

type SettingsContextValue = {
  settingsReady: boolean;
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  selectedGrade: GradeId;
  setSelectedGrade: (grade: GradeId) => void;
  currentUser: AppShellUserSafe | null;
  studentLessonHref: string | null;
  refreshLessonEntryTarget: (grade?: GradeId) => Promise<void>;
  login: (identifier: string, password: string, grade?: GradeId, curriculumProfile?: CurriculumProfile) => Promise<AuthActionResult>;
  register: (input: RegisterInput) => Promise<AuthActionResult>;
  completePasswordReset: (token: string, password: string) => Promise<AuthActionResult>;
  changePassword: (currentPassword: string, password: string) => Promise<AuthActionResult>;
  updateProfile: (input: ProfileUpdateInput) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  revalidateSession: () => Promise<void>;
  mistakeRecords: MistakeRecord[];
  learningAnalyticsEvents: LearningAnalyticsEvent[];
  refreshMistakeRecordsAfterAttempt: () => void;
  recordLearningEvent: (event: LearningAnalyticsInput) => void;
  clearLearningAnalytics: () => void;
  markMistakeMastered: (questionId: string) => void;
  removeMistake: (questionId: string) => void;
  clearMistakes: () => void;
  text: (value: LocalizedText) => string;
  t: (value: LocalizedText) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function isFirstPaintSensitiveStudentPath(pathname: string) {
  return (
    pathname === "/personalized-learning" ||
    pathname === "/practice" ||
    pathname.startsWith("/practice/") ||
    pathname === "/student/assignments" ||
    pathname.startsWith("/student/assignments/")
  );
}

type AuthSessionResponse = {
  user: StudentSession;
  settings: {
    language: Language;
    theme: ThemeMode;
    selectedGrade: GradeId;
  };
  lessonEntryTarget?: LessonEntryTarget | null;
  settingsPersisted?: boolean;
};

type AppProviderCoreState = {
  language: Language;
  theme: ThemeMode;
  selectedGrade: GradeId;
  currentUser: AppShellUserSafe | null;
  lessonEntryTarget: LessonEntryTarget | null;
  settingsReady: boolean;
};

type AppProviderCoreAction =
  | { type: "replace"; state: AppProviderCoreState }
  | {
      type: "apply-session";
      user: AppShellUserSafe;
      settings: AuthSessionResponse["settings"];
      lessonEntryTarget: LessonEntryTarget | null;
      preserveSettings: boolean;
    }
  | { type: "clear-session" }
  | { type: "set-language"; language: Language }
  | { type: "set-theme"; theme: ThemeMode }
  | { type: "set-grade"; grade: GradeId }
  | { type: "set-lesson-entry"; lessonEntryTarget: LessonEntryTarget | null };

function coreStateFromBootstrap(bootstrap: AppShellBootstrap): AppProviderCoreState {
  if (bootstrap.kind === "authenticated") {
    return {
      language: bootstrap.settings.language,
      theme: bootstrap.settings.theme,
      selectedGrade: bootstrap.settings.selectedGrade,
      currentUser: bootstrap.user,
      lessonEntryTarget: null,
      settingsReady: true
    };
  }

  return {
    language: "en",
    theme: "light",
    selectedGrade: "S3",
    currentUser: null,
    lessonEntryTarget: null,
    settingsReady: false
  };
}

function appProviderCoreReducer(state: AppProviderCoreState, action: AppProviderCoreAction): AppProviderCoreState {
  switch (action.type) {
    case "replace":
      return action.state;
    case "apply-session":
      return {
        language: action.preserveSettings ? state.language : action.settings.language,
        theme: action.preserveSettings ? state.theme : action.settings.theme,
        selectedGrade: action.preserveSettings ? state.selectedGrade : action.settings.selectedGrade,
        currentUser: action.user,
        lessonEntryTarget: action.lessonEntryTarget,
        settingsReady: true
      };
    case "clear-session":
      return { ...state, currentUser: null, lessonEntryTarget: null, settingsReady: true };
    case "set-language":
      return { ...state, language: action.language };
    case "set-theme":
      return { ...state, theme: action.theme };
    case "set-grade":
      return { ...state, selectedGrade: action.grade };
    case "set-lesson-entry":
      return { ...state, lessonEntryTarget: action.lessonEntryTarget };
  }
}

function bootstrapFingerprint(bootstrap: AppShellBootstrap) {
  return JSON.stringify(bootstrap);
}

type RegisterInput = {
  role?: "student" | "teacher" | "parent";
  name: string;
  username?: string;
  email?: string;
  password: string;
  grade?: GradeId;
  curriculumProfile?: CurriculumProfile;
};

type ProfileUpdateInput = {
  name?: string;
  avatarId?: StudentAvatarId;
  avatarImageDataUrl?: string | null;
};

type ProfileAvatarImageObject = {
  kind: "object-reference";
  objectKey: string;
  mimeType: string;
  byteLength: number;
  encrypted: boolean;
  scanStatus: "pending" | "passed" | "failed";
  retentionExpiresAt: string;
};

type AuthActionResult = {
  ok: boolean;
  role?: StudentSession["role"];
  passwordMustChange?: boolean;
  requiresCurriculumTrack?: boolean;
  pendingUser?: {
    name: string;
    username: string;
    grade: GradeId;
  };
  reason?:
    | "duplicate"
    | "invalid"
    | "setup"
    | "error"
    | "requires-curriculum-track"
    | "password-updated-sign-in-required";
};

async function readAuthErrorCode(response: Response) {
  try {
    const body = await response.clone().json() as { code?: unknown } | null;
    return typeof body?.code === "string" ? body.code : "";
  } catch {
    return "";
  }
}

async function unavailableAuthReason(response: Response): Promise<AuthActionResult["reason"]> {
  return (await readAuthErrorCode(response)) === "session-secret-missing" ? "setup" : "error";
}

const isGrade = isValidGradeId;
const validAvatarIds = new Set<StudentAvatarId>(["delta", "pi", "sigma", "theta", "function", "radical"]);
const maxAvatarImageDataUrlLength = 900_000;
const avatarImageDataUrlPattern = /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const avatarMediaObjectUrlPattern = /^\/api\/media-objects\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/;

function readAvatarId(value: unknown): StudentAvatarId {
  return validAvatarIds.has(value as StudentAvatarId) ? (value as StudentAvatarId) : "delta";
}

function readAvatarImageDataUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  if (avatarMediaObjectUrlPattern.test(value)) return value;
  if (value.length > maxAvatarImageDataUrlLength) return undefined;
  return avatarImageDataUrlPattern.test(value) ? value : undefined;
}

function readAvatarImageObjectKey(value: unknown) {
  return typeof value === "string" && value.startsWith("profile-avatar/") ? value : undefined;
}

function readAvatarImageUrl(value: unknown) {
  return typeof value === "string" && avatarMediaObjectUrlPattern.test(value) ? value : undefined;
}

function readProfileAvatarImageObject(value: unknown): ProfileAvatarImageObject | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Partial<ProfileAvatarImageObject>;
  if (record.kind !== "object-reference") return null;
  if (typeof record.objectKey !== "string" || !record.objectKey.startsWith("profile-avatar/")) return null;
  if (typeof record.mimeType !== "string" || !/^image\/(?:jpeg|jpg|png|webp)$/.test(record.mimeType)) return null;
  if (typeof record.byteLength !== "number" || !Number.isFinite(record.byteLength) || record.byteLength <= 0) return null;
  if (record.encrypted !== true) return null;
  if (record.scanStatus !== "passed" && record.scanStatus !== "pending" && record.scanStatus !== "failed") return null;
  if (typeof record.retentionExpiresAt !== "string" || !Number.isFinite(Date.parse(record.retentionExpiresAt))) return null;

  return {
    kind: "object-reference",
    objectKey: record.objectKey,
    mimeType: record.mimeType,
    byteLength: record.byteLength,
    encrypted: true,
    scanStatus: record.scanStatus,
    retentionExpiresAt: record.retentionExpiresAt
  };
}

function readLessonEntryTarget(value: unknown): LessonEntryTarget | null {
  const target = value as Partial<LessonEntryTarget> | null;

  if (
    typeof target?.href !== "string" ||
    !target.href.startsWith(`${studentLessonsPath}/`) ||
    typeof target.slug !== "string" ||
    !target.slug ||
    !isGrade(target.grade) ||
    typeof target.topicId !== "string" ||
    !target.topicId
  ) {
    return null;
  }

  return {
    href: target.href,
    slug: target.slug,
    grade: target.grade,
    topicId: target.topicId
  };
}

function lessonEntryTargetStorageKey(userId: string, grade: GradeId) {
  return `mais-lesson-entry-target:${userId}:${grade}`;
}

function readStoredLessonEntryTarget(userId: string, grade: GradeId) {
  try {
    const raw = window.localStorage.getItem(lessonEntryTargetStorageKey(userId, grade));
    if (!raw) return null;
    return readLessonEntryTarget(JSON.parse(raw));
  } catch {
    return null;
  }
}

function storeLessonEntryTarget(userId: string, target: LessonEntryTarget | null) {
  try {
    if (!target) return;
    window.localStorage.setItem(lessonEntryTargetStorageKey(userId, target.grade), JSON.stringify(target));
  } catch {
    // Local storage is a speed hint only; navigation still works without it.
  }
}

function lessonEntryTargetForGrade(target: LessonEntryTarget | null | undefined, grade: GradeId) {
  return target?.grade === grade ? target : null;
}

function readAuthSession(value: unknown): AuthSessionResponse | null {
  const record = value as Partial<AuthSessionResponse> | null;
  const user = record?.user as Partial<StudentSession> | undefined;
  const settings = record?.settings as Partial<AuthSessionResponse["settings"]> | undefined;
  const settingsLanguage = settings?.language;
  const curriculumTrack = user?.curriculumTrack;

  if (
    typeof user?.id !== "string" ||
    typeof user?.name !== "string" ||
    typeof user?.username !== "string" ||
    !isGrade(user?.grade) ||
    (curriculumTrack !== "HK" && curriculumTrack !== "MAINLAND_PEP_HIGH" && curriculumTrack !== "US_CA_MATH" && curriculumTrack !== "US_NC_MATH" && curriculumTrack !== "US_AR_MATH" && curriculumTrack !== "US_FL_MATH") ||
    !["student", "teacher", "parent", "admin"].includes(user?.role ?? "") ||
    !isValidLanguage(settingsLanguage) ||
    (settings?.theme !== "dark" && settings?.theme !== "light") ||
    !isGrade(settings?.selectedGrade)
  ) {
    return null;
  }

  const curriculumProfile = normalizeCurriculumProfile(user.curriculumProfile, curriculumProfileForTrack(curriculumTrack));

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: typeof user.email === "string" ? user.email : undefined,
      schoolId: typeof user.schoolId === "string" ? user.schoolId : undefined,
      passwordMustChange: typeof user.passwordMustChange === "boolean" ? user.passwordMustChange : undefined,
      avatarId: readAvatarId(user.avatarId),
      avatarImageDataUrl: readAvatarImageUrl(user.avatarImageUrl) ?? readAvatarImageDataUrl(user.avatarImageDataUrl),
      avatarImageObjectKey: readAvatarImageObjectKey(user.avatarImageObjectKey),
      avatarImageUrl: readAvatarImageUrl(user.avatarImageUrl),
      grade: user.grade,
      curriculumTrack,
      curriculumProfile,
      role: user.role as StudentSession["role"]
    },
    settings: {
      language: settingsLanguage,
      theme: settings.theme,
      selectedGrade: settings.selectedGrade
    },
    lessonEntryTarget: readLessonEntryTarget(record?.lessonEntryTarget),
    settingsPersisted: record?.settingsPersisted !== false
  };
}

function readMistakeRecords(value: unknown): MistakeRecord[] {
  const response = value as { mistakes?: unknown } | null;
  if (!Array.isArray(response?.mistakes)) return [];

  return response.mistakes
    .map((mistake): MistakeRecord | null => {
      const record = mistake as Partial<MistakeBookItem> | null;
      if (
        typeof record?.questionId !== "string" ||
        typeof record.lastSelectedAnswer !== "string" ||
        typeof record.correctAnswer !== "string" ||
        typeof record.wrongAttempts !== "number" ||
        typeof record.firstWrongAt !== "string" ||
        typeof record.lastAttemptAt !== "string" ||
        typeof record.mastered !== "boolean"
      ) {
        return null;
      }

      return {
        questionId: record.questionId,
        lastSelectedAnswer: record.lastSelectedAnswer,
        correctAnswer: record.correctAnswer,
        wrongAttempts: record.wrongAttempts,
        firstWrongAt: record.firstWrongAt,
        lastAttemptAt: record.lastAttemptAt,
        mastered: record.mastered
      };
    })
    .filter((mistake): mistake is MistakeRecord => Boolean(mistake));
}

function analyticsSourceForPath(pathname: string): LearningAnalyticsEventSource {
  if (pathname.startsWith("/personalized-learning")) return "adaptive-learning";
  if (pathname.startsWith("/adaptive-learning")) return "adaptive-learning";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/practice") || isImmersiveStudentPracticeGamePath(pathname)) return "practice";
  if (pathname.startsWith("/progress")) return "progress";
  if (isStudentLessonPath(pathname)) return "lesson";
  if (pathname.startsWith("/mistake-book")) return "mistake-book";
  if (isVisualizationLabPath(pathname)) return "visualization-lab";
  if (isStudentRoadmapPath(pathname) || isLegacyRoadmapPath(pathname)) return "learning-path";
  return "navigation";
}

function topicIdForPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length ? segments.join("-") : "home";
}

const minimumTrackedPageSeconds = 5;
const maximumTrackedPageSeconds = 15 * 60;

function persistedSettingsKey(userId: string, language: Language, theme: ThemeMode, selectedGrade: GradeId) {
  return `${userId}:${language}:${theme}:${selectedGrade}`;
}

const sessionSyncStorageKey = appShellSessionSyncStorageKey;
const sessionSyncDocumentId = typeof globalThis.crypto?.randomUUID === "function"
  ? globalThis.crypto.randomUUID()
  : `mais-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function readLocalStorageItem(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorageItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences still work in memory when storage is unavailable.
  }
}

function removeLocalStorageItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Legacy storage cleanup is best-effort only.
  }
}

function broadcastSessionChange(user: Pick<AppShellUserSafe, "id" | "role"> | null) {
  const payload = {
    userId: user?.id ?? null,
    userRole: user?.role ?? null,
    sourceDocumentId: sessionSyncDocumentId,
    at: Date.now()
  };
  try {
    window.localStorage.setItem(sessionSyncStorageKey, JSON.stringify(payload));
  } catch {
    // Cross-tab session sync is best-effort only.
  }
  try {
    const channel = new BroadcastChannel(sessionSyncStorageKey);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // Foreground/pagehide quarantine remains the fail-closed fallback when
    // both browser messaging transports are unavailable.
  }
}

const roleProtectedPathPrefixes = ["/teacher", "/parent", "/dashboard", "/progress", "/mistake-book", "/messages", "/assessment", "/resource"];

function isRoleProtectedPath(pathname: string) {
  return roleProtectedPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function sameAccountBoundary(
  left: Pick<AppShellUserSafe, "id" | "role"> | null | undefined,
  right: Pick<AppShellUserSafe, "id" | "role"> | null | undefined
) {
  return Boolean(left && right && left.id === right.id && left.role === right.role);
}

type SessionSyncIdentity =
  | { valid: true; userId: null; userRole: null }
  | { valid: true; userId: string; userRole: AppShellUserSafe["role"] }
  | { valid: false; userId: null; userRole: null };

type SessionVerificationMode = "none" | "foreground" | "identity";
type SessionVerificationTarget = AppShellIdentity;

function readSessionSyncIdentity(value: string | null): SessionSyncIdentity {
  if (!value) return { valid: false, userId: null, userRole: null };
  try {
    const parsed = JSON.parse(value) as { userId?: unknown; userRole?: unknown } | null;
    if (parsed?.userId === null && parsed.userRole === null) {
      return { valid: true, userId: null, userRole: null };
    }
    if (
      typeof parsed?.userId === "string" &&
      (parsed.userRole === "student" ||
        parsed.userRole === "teacher" ||
        parsed.userRole === "parent" ||
        parsed.userRole === "admin")
    ) {
      return { valid: true, userId: parsed.userId, userRole: parsed.userRole };
    }
  } catch {
    // An unparseable identity signal must be treated as uncertain.
  }
  return { valid: false, userId: null, userRole: null };
}

export function AppProviders({
  children,
  initialBootstrap
}: {
  children: ReactNode;
  initialBootstrap: AppShellBootstrap;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [coreState, dispatchCore] = useReducer(appProviderCoreReducer, initialBootstrap, coreStateFromBootstrap);
  const { language, theme, selectedGrade, currentUser, lessonEntryTarget, settingsReady } = coreState;
  const coreStateRef = useRef(coreState);
  const currentUserRef = useRef<AppShellUserSafe | null>(currentUser);
  // Authenticated HTML and the first client render expose only the neutral
  // identity gate. The account tree mounts after the cookie is rechecked by
  // the authoritative session endpoint, so no script has to mutate <html> or
  // body children while React is still hydrating the document singleton.
  const initialSessionVerificationMode: SessionVerificationMode =
    initialBootstrap.kind === "authenticated" ? "identity" : "none";
  const initialSessionVerificationPending = initialSessionVerificationMode !== "none";
  const [sessionVerificationMode, setSessionVerificationMode] = useState<SessionVerificationMode>(
    initialSessionVerificationMode
  );
  const sessionVerificationPendingRef = useRef(initialSessionVerificationPending);
  const sessionVerificationModeRef = useRef<SessionVerificationMode>(initialSessionVerificationMode);
  const sessionVerificationTargetRef = useRef<SessionVerificationTarget | null>(null);
  const acceptedBootstrapIdentityRef = useRef<SessionVerificationTarget>(
    appShellIdentityFromBootstrap(initialBootstrap)
  );
  const bootstrapBoundaryMismatch = !appShellBootstrapIsAuthorized({
    acceptedIdentity: acceptedBootstrapIdentityRef.current,
    incomingBootstrap: initialBootstrap
  });
  const displayedSessionVerificationMode: SessionVerificationMode = bootstrapBoundaryMismatch
    ? "identity"
    : sessionVerificationMode;
  const displayedSessionVerificationPending = displayedSessionVerificationMode !== "none";
  const bootstrapMismatchReloadStartedRef = useRef(false);
  const accountWorkBlockedRef = useRef(initialSessionVerificationPending);
  const quarantinedUserRef = useRef<AppShellUserSafe | null>(currentUser);
  const initialSessionValidationStartedRef = useRef(false);
  const [reactGuardReady, setReactGuardReady] = useState(false);
  const sessionVerificationGateRef = useRef<HTMLElement | null>(null);
  const [mistakeRecords, setMistakeRecords] = useState<MistakeRecord[]>([]);
  const [learningAnalyticsEvents, setLearningAnalyticsEvents] = useState<LearningAnalyticsEvent[]>([]);
  const [pendingLearningEvents, setPendingLearningEvents] = useState<LearningAnalyticsEvent[]>([]);
  const analyticsFlushGenerationRef = useRef(0);
  const pendingLearningEventsRef = useRef<LearningAnalyticsEvent[]>([]);
  const highFrequencyLearningEventsRef = useRef<LearningAnalyticsEvent[]>([]);
  const highFrequencyFlushHandleRef = useRef<number | null>(null);
  const lessonEntryRequestKeyRef = useRef<string | null>(null);
  const lessonEntryReadGenerationRef = useRef(0);
  const lessonEntryReadAbortRef = useRef<AbortController | null>(null);
  const mistakeReadGenerationRef = useRef(0);
  const mistakeReadAbortRef = useRef<AbortController | null>(null);
  const authEpochRef = useRef(0);
  const settingsMutationEpochRef = useRef(0);
  const sessionRevalidationGenerationRef = useRef(0);
  const sessionRevalidationAbortRef = useRef<AbortController | null>(null);
  const settingsWriteGenerationRef = useRef(0);
  const settingsWriteChainRef = useRef<Promise<void>>(Promise.resolve());
  const settingsWriteAbortRef = useRef<AbortController | null>(null);
  const pendingSettingsKeyRef = useRef<string | null>(null);
  const settingsDirtyRef = useRef(false);
  const settingsRetryAttemptRef = useRef(0);
  const settingsRetryHandleRef = useRef<number | null>(null);
  const [settingsRetryNonce, setSettingsRetryNonce] = useState(0);
  const invalidCookieClearAttemptedRef = useRef<"idle" | "running" | "done">("idle");
  const lastBootstrapFingerprintRef = useRef(bootstrapFingerprint(initialBootstrap));
  const persistedSettingsKeyRef = useRef<string | null>(
    initialBootstrap.kind === "authenticated"
      ? persistedSettingsKey(
          initialBootstrap.user.id,
          initialBootstrap.settings.language,
          initialBootstrap.settings.theme,
          initialBootstrap.settings.selectedGrade
        )
      : null
  );
  const skipGlobalStudentWarmups = currentUser?.role === "student" && isFirstPaintSensitiveStudentPath(pathname);
  const studentLessonHref = currentUser?.role === "student"
    ? lessonEntryTargetForGrade(lessonEntryTarget, selectedGrade)?.href ?? null
    : null;
  useLayoutEffect(() => {
    coreStateRef.current = coreState;
    currentUserRef.current = currentUser;
  }, [coreState, currentUser]);
  const clearHighFrequencyFlushHandle = useCallback(() => {
    if (highFrequencyFlushHandleRef.current === null) return;
    window.clearTimeout(highFrequencyFlushHandleRef.current);
    highFrequencyFlushHandleRef.current = null;
  }, []);
  const setSessionVerificationState = useCallback((
    pending: boolean,
    mode: Exclude<SessionVerificationMode, "none"> = "identity"
  ) => {
    sessionVerificationPendingRef.current = pending;
    sessionVerificationModeRef.current = pending ? mode : "none";
    if (!pending) sessionVerificationTargetRef.current = null;
    accountWorkBlockedRef.current = pending;
    setSessionVerificationMode(pending ? mode : "none");
  }, []);
  const clearSettingsRetryHandle = useCallback(() => {
    if (settingsRetryHandleRef.current === null) return;
    window.clearTimeout(settingsRetryHandleRef.current);
    settingsRetryHandleRef.current = null;
  }, []);
  const abortPerUserReads = useCallback(() => {
    mistakeReadGenerationRef.current += 1;
    mistakeReadAbortRef.current?.abort();
    mistakeReadAbortRef.current = null;
    lessonEntryReadGenerationRef.current += 1;
    lessonEntryReadAbortRef.current?.abort();
    lessonEntryReadAbortRef.current = null;
    lessonEntryRequestKeyRef.current = null;
  }, []);
  const quarantineForSessionCheck = useCallback((
    requestedMode: Exclude<SessionVerificationMode, "none"> = "identity"
  ) => {
    const previousUser = currentUserRef.current ?? quarantinedUserRef.current;
    if (previousUser) quarantinedUserRef.current = previousUser;

    // Block synchronously before React can paint again. This closes the short
    // interval between a cross-tab cookie replacement and the session-state
    // response, when the old tab must not issue account-bound work or render
    // the previous account's server-provided children.
    accountWorkBlockedRef.current = true;
    sessionVerificationPendingRef.current = true;
    const previousMode = sessionVerificationModeRef.current;
    const mode = previousMode === "identity" ? "identity" : requestedMode;
    if (mode === "identity" && previousMode !== "identity") {
      sessionVerificationTargetRef.current = null;
    }
    sessionVerificationModeRef.current = mode;
    setSessionVerificationMode(mode);
    abortPerUserReads();
    if (mode === "identity") {
      setMistakeRecords([]);
      // Only an identity boundary invalidates an already-issued analytics
      // request. Foreground checks retain its generation so a network failure
      // can still restore the batch to the verified same user's queue.
      analyticsFlushGenerationRef.current += 1;
    }
    return previousUser;
  }, [abortPerUserReads]);
  const appendLearningEventsToQueues = useCallback((events: LearningAnalyticsEvent[]) => {
    if (events.length === 0) return;
    const coalescedEvents = coalesceLearningAnalyticsEvents(events);

    setLearningAnalyticsEvents((current) =>
      coalesceLearningAnalyticsEvents([...current, ...coalescedEvents]).slice(-maxStoredLearningAnalyticsEvents)
    );
    setPendingLearningEvents((current) => {
      const nextEvents = coalesceLearningAnalyticsEvents([...current, ...coalescedEvents]).slice(-maxStoredLearningAnalyticsEvents);
      pendingLearningEventsRef.current = nextEvents;
      return nextEvents;
    });
  }, []);
  const takeBufferedHighFrequencyLearningEvents = useCallback(() => {
    clearHighFrequencyFlushHandle();
    if (highFrequencyLearningEventsRef.current.length === 0) return [];

    const events = coalesceLearningAnalyticsEvents(highFrequencyLearningEventsRef.current).slice(-maxStoredLearningAnalyticsEvents);
    highFrequencyLearningEventsRef.current = [];
    return events;
  }, [clearHighFrequencyFlushHandle]);
  const flushBufferedHighFrequencyLearningEvents = useCallback(() => {
    const events = takeBufferedHighFrequencyLearningEvents();
    appendLearningEventsToQueues(events);
    return events;
  }, [appendLearningEventsToQueues, takeBufferedHighFrequencyLearningEvents]);
  const scheduleHighFrequencyLearningEventFlush = useCallback(() => {
    if (highFrequencyFlushHandleRef.current !== null) return;

    highFrequencyFlushHandleRef.current = window.setTimeout(() => {
      highFrequencyFlushHandleRef.current = null;
      flushBufferedHighFrequencyLearningEvents();
    }, throttledLearningAnalyticsFlushMs);
  }, [flushBufferedHighFrequencyLearningEvents]);
  const recordLearningEvent = useCallback((event: LearningAnalyticsInput) => {
    if (accountWorkBlockedRef.current || !settingsReady || !currentUser || currentUser.role !== "student") return;

    const analyticsEvent = createLearningAnalyticsEvent(event, selectedGrade);
    if (isHighFrequencyLearningAnalyticsEvent(analyticsEvent)) {
      highFrequencyLearningEventsRef.current = coalesceLearningAnalyticsEvents([
        ...highFrequencyLearningEventsRef.current,
        analyticsEvent
      ]);
      scheduleHighFrequencyLearningEventFlush();
      return;
    }

    appendLearningEventsToQueues([analyticsEvent]);
  }, [appendLearningEventsToQueues, currentUser?.id, currentUser?.role, scheduleHighFrequencyLearningEventFlush, selectedGrade, settingsReady]);
  const refreshMistakeRecords = useCallback(async () => {
    if (accountWorkBlockedRef.current || !currentUser) {
      mistakeReadGenerationRef.current += 1;
      mistakeReadAbortRef.current?.abort();
      setMistakeRecords([]);
      return;
    }

    const requestedUserId = currentUser.id;
    const requestedUserRole = currentUser.role;
    const requestAuthEpoch = authEpochRef.current;
    const requestGeneration = mistakeReadGenerationRef.current + 1;
    mistakeReadGenerationRef.current = requestGeneration;
    mistakeReadAbortRef.current?.abort();
    const controller = new AbortController();
    mistakeReadAbortRef.current = controller;
    try {
      const response = await fetch("/api/mistakes", {
        cache: "no-store",
        headers: { "X-MAIS-Expected-User-Id": requestedUserId },
        signal: controller.signal
      });
      if (response.status === 401 || response.status === 403 || response.status === 409) {
        quarantineForSessionCheck();
        router.refresh();
        return;
      }
      if (!response.ok) return;
      const records = readMistakeRecords(await response.json());
      if (
        accountWorkBlockedRef.current ||
        requestGeneration !== mistakeReadGenerationRef.current ||
        requestAuthEpoch !== authEpochRef.current ||
        !sameAccountBoundary(currentUserRef.current, { id: requestedUserId, role: requestedUserRole })
      ) return;
      setMistakeRecords(records);
    } catch {
      if (!sameAccountBoundary(currentUserRef.current, { id: requestedUserId, role: requestedUserRole })) {
        setMistakeRecords([]);
      }
      // For the same verified account, keep the last known records on failure.
    } finally {
      if (mistakeReadAbortRef.current === controller) mistakeReadAbortRef.current = null;
    }
  }, [currentUser?.id, currentUser?.role, quarantineForSessionCheck, router]);
  const refreshLessonEntryTarget = useCallback(async (grade?: GradeId) => {
    if (accountWorkBlockedRef.current || !currentUser || currentUser.role !== "student") {
      lessonEntryReadGenerationRef.current += 1;
      lessonEntryReadAbortRef.current?.abort();
      lessonEntryRequestKeyRef.current = null;
      dispatchCore({ type: "set-lesson-entry", lessonEntryTarget: null });
      return;
    }

    const targetGrade = grade ?? selectedGrade;
    const requestKey = `${currentUser.id}:${targetGrade}`;
    if (lessonEntryRequestKeyRef.current === requestKey) return;
    lessonEntryRequestKeyRef.current = requestKey;
    const requestedUserId = currentUser.id;
    const requestedUserRole = currentUser.role;
    const requestAuthEpoch = authEpochRef.current;
    const requestGeneration = lessonEntryReadGenerationRef.current + 1;
    lessonEntryReadGenerationRef.current = requestGeneration;
    lessonEntryReadAbortRef.current?.abort();
    const controller = new AbortController();
    lessonEntryReadAbortRef.current = controller;

    try {
      const response = await fetch(`/api/lesson-entry?grade=${encodeURIComponent(targetGrade)}`, {
        cache: "no-store",
        headers: { "X-MAIS-Expected-User-Id": requestedUserId },
        signal: controller.signal
      });
      if (response.status === 401 || response.status === 403 || response.status === 409) {
        quarantineForSessionCheck();
        router.refresh();
        return;
      }
      const body = (await response.json()) as { lessonEntryTarget?: unknown };
      const nextTarget = readLessonEntryTarget(body.lessonEntryTarget);
      if (!response.ok || !nextTarget) throw new Error("Lesson entry target unavailable.");
      if (
        accountWorkBlockedRef.current ||
        requestGeneration !== lessonEntryReadGenerationRef.current ||
        requestAuthEpoch !== authEpochRef.current ||
        !sameAccountBoundary(currentUserRef.current, { id: requestedUserId, role: requestedUserRole })
      ) return;
      storeLessonEntryTarget(requestedUserId, nextTarget);
      dispatchCore({ type: "set-lesson-entry", lessonEntryTarget: nextTarget });
    } catch {
      if (
        accountWorkBlockedRef.current ||
        requestGeneration !== lessonEntryReadGenerationRef.current ||
        requestAuthEpoch !== authEpochRef.current ||
        !sameAccountBoundary(currentUserRef.current, { id: requestedUserId, role: requestedUserRole })
      ) return;
      dispatchCore({
        type: "set-lesson-entry",
        lessonEntryTarget: readStoredLessonEntryTarget(requestedUserId, targetGrade)
      });
    } finally {
      if (lessonEntryReadAbortRef.current === controller) lessonEntryReadAbortRef.current = null;
      if (lessonEntryRequestKeyRef.current === requestKey) {
        lessonEntryRequestKeyRef.current = null;
      }
    }
  }, [currentUser, quarantineForSessionCheck, router, selectedGrade]);

  useLayoutEffect(() => {
    if (!bootstrapBoundaryMismatch || bootstrapMismatchReloadStartedRef.current) return;
    bootstrapMismatchReloadStartedRef.current = true;
    // A server payload whose identity differs from the last accepted document
    // is untrusted even when no storage/session gate happens to be active. Hide
    // it in this commit and replace the whole document before passive effects
    // can adopt it. This also neutralizes an A-scoped RSC response that arrives
    // after a completed A -> B account replacement.
    quarantineForSessionCheck("identity");
    window.location.reload();
  }, [bootstrapBoundaryMismatch, quarantineForSessionCheck]);

  useEffect(() => {
    const nextFingerprint = bootstrapFingerprint(initialBootstrap);
    const bootstrapChanged = lastBootstrapFingerprintRef.current !== nextFingerprint;
    const pendingVerificationMode = sessionVerificationModeRef.current;
    if (pendingVerificationMode !== "none") {
      // No RSC response may resolve a privacy gate. It can have started before
      // the cookie transition (including a target-looking B response in a fast
      // A -> B -> C sequence). Only the authoritative session-state response
      // may clear a same-boundary gate; a replacement boundary reloads the
      // document so old server children cannot commit afterward.
      return;
    }
    lastBootstrapFingerprintRef.current = nextFingerprint;
    acceptedBootstrapIdentityRef.current = appShellIdentityFromBootstrap(initialBootstrap);
    removeLocalStorageItem("hk-math-user");
    removeLocalStorageItem("hk-math-mistakes");

    if (initialBootstrap.kind === "authenticated") {
      invalidCookieClearAttemptedRef.current = "idle";
      removeLocalStorageItem("hk-math-theme");
      removeLocalStorageItem("hk-math-language");
      removeLocalStorageItem("hk-math-grade");
      const previousUser = coreStateRef.current.currentUser;
      const identityChanged = !sameAccountBoundary(previousUser, initialBootstrap.user);
      const preserveSettings = !identityChanged && (
        pendingSettingsKeyRef.current !== null ||
        settingsDirtyRef.current
      );
      const effectiveGrade = preserveSettings
        ? coreStateRef.current.selectedGrade
        : initialBootstrap.settings.selectedGrade;
      const storedTarget = initialBootstrap.user.role === "student"
        ? readStoredLessonEntryTarget(initialBootstrap.user.id, effectiveGrade)
        : null;

      if (bootstrapChanged || identityChanged) {
        sessionRevalidationGenerationRef.current += 1;
        sessionRevalidationAbortRef.current?.abort();
        if (identityChanged) {
          analyticsFlushGenerationRef.current += 1;
          authEpochRef.current += 1;
          settingsMutationEpochRef.current += 1;
          settingsWriteAbortRef.current?.abort();
          settingsWriteGenerationRef.current += 1;
          pendingSettingsKeyRef.current = null;
          settingsDirtyRef.current = false;
          settingsRetryAttemptRef.current = 0;
          clearSettingsRetryHandle();
          abortPerUserReads();
          setMistakeRecords([]);
          pendingLearningEventsRef.current = [];
          highFrequencyLearningEventsRef.current = [];
          clearHighFrequencyFlushHandle();
          setLearningAnalyticsEvents([]);
          setPendingLearningEvents([]);
        }
        if (!preserveSettings) {
          settingsDirtyRef.current = false;
          persistedSettingsKeyRef.current = persistedSettingsKey(
            initialBootstrap.user.id,
            initialBootstrap.settings.language,
            initialBootstrap.settings.theme,
            initialBootstrap.settings.selectedGrade
          );
        }
        dispatchCore({
          type: "apply-session",
          user: initialBootstrap.user,
          settings: initialBootstrap.settings,
          lessonEntryTarget: storedTarget,
          preserveSettings
        });
        currentUserRef.current = initialBootstrap.user;
      } else if (storedTarget) {
        dispatchCore({ type: "set-lesson-entry", lessonEntryTarget: storedTarget });
      }
      if (storedTarget?.href) router.prefetch(storedTarget.href);
      quarantinedUserRef.current = null;
      setSessionVerificationState(false);
      return;
    }

    const savedLanguage = readLocalStorageItem("hk-math-language") as Language | null;
    const savedTheme = readLocalStorageItem("hk-math-theme") as ThemeMode | null;
    const savedGrade = readLocalStorageItem("hk-math-grade") as GradeId | null;
    if (bootstrapChanged) {
      const hadAuthenticatedUser = coreStateRef.current.currentUser !== null;
      sessionRevalidationGenerationRef.current += 1;
      authEpochRef.current += 1;
      sessionRevalidationAbortRef.current?.abort();
      settingsWriteAbortRef.current?.abort();
      settingsWriteGenerationRef.current += 1;
      pendingSettingsKeyRef.current = null;
      settingsDirtyRef.current = false;
      settingsRetryAttemptRef.current = 0;
      clearSettingsRetryHandle();
      abortPerUserReads();
      persistedSettingsKeyRef.current = null;
      setMistakeRecords([]);
      if (hadAuthenticatedUser) {
        analyticsFlushGenerationRef.current += 1;
        pendingLearningEventsRef.current = [];
        highFrequencyLearningEventsRef.current = [];
        clearHighFrequencyFlushHandle();
        setLearningAnalyticsEvents([]);
        setPendingLearningEvents([]);
      }
    }
    dispatchCore({
      type: "replace",
      state: {
        language: isValidLanguage(savedLanguage) ? savedLanguage : "en",
        theme: savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light",
        selectedGrade: isGrade(savedGrade) ? savedGrade : "S3",
        currentUser: null,
        lessonEntryTarget: null,
        settingsReady: true
      }
    });
    currentUserRef.current = null;
    quarantinedUserRef.current = null;
    setSessionVerificationState(false);
  }, [
    abortPerUserReads,
    clearHighFrequencyFlushHandle,
    clearSettingsRetryHandle,
    initialBootstrap,
    quarantineForSessionCheck,
    router,
    setSessionVerificationState
  ]);

  useEffect(() => {
    if (initialBootstrap.kind !== "guest" || !initialBootstrap.hadSessionCookie) {
      invalidCookieClearAttemptedRef.current = "idle";
      return;
    }
    if (invalidCookieClearAttemptedRef.current !== "idle") return;

    invalidCookieClearAttemptedRef.current = "running";
    let cancelled = false;
    const attemptControllers = new Set<AbortController>();
    const retryDelays = [0, 1_000, 3_000] as const;

    void (async () => {
      for (const delay of retryDelays) {
        if (delay > 0) {
          await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
        }
        if (cancelled) return;
        const attemptController = new AbortController();
        attemptControllers.add(attemptController);
        const timeoutHandle = window.setTimeout(() => attemptController.abort(), 5_000);
        try {
          const response = await fetch("/api/auth/logout", {
            method: "POST",
            signal: attemptController.signal
          });
          if (response.ok) {
            invalidCookieClearAttemptedRef.current = "done";
            return;
          }
        } catch {
          if (cancelled) return;
        } finally {
          window.clearTimeout(timeoutHandle);
          attemptControllers.delete(attemptController);
        }
      }
      if (!cancelled) invalidCookieClearAttemptedRef.current = "idle";
    })();

    return () => {
      cancelled = true;
      attemptControllers.forEach((controller) => controller.abort());
      attemptControllers.clear();
      if (invalidCookieClearAttemptedRef.current === "running") {
        invalidCookieClearAttemptedRef.current = "idle";
      }
    };
  }, [initialBootstrap]);

  useEffect(() => {
    if (!settingsReady) return;

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = localeForLanguage(language);
    const localizedTitle = textForLanguage(dictionary.common.siteName, language);
    document.title = localizedTitle;
    const titleHandles = [0, 100, 500].map((delay) =>
      window.setTimeout(() => {
        document.title = localizedTitle;
      }, delay)
    );
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
      "content",
      textForLanguage(
        {
          en: "A personalized interactive mathematics learning platform for Hong Kong P1-S6 students.",
          zh: "為香港小一至中六學生而設的數學適性互動學習平台。"
        },
        language
      )
    );
    if (currentUser) {
      removeLocalStorageItem("hk-math-theme");
      removeLocalStorageItem("hk-math-language");
      removeLocalStorageItem("hk-math-grade");
      removeLocalStorageItem("hk-math-user");
      const nextSettingsKey = persistedSettingsKey(currentUser.id, language, theme, selectedGrade);
      if (
        !accountWorkBlockedRef.current &&
        (
          settingsDirtyRef.current ||
          persistedSettingsKeyRef.current !== nextSettingsKey ||
          (pendingSettingsKeyRef.current !== null && pendingSettingsKeyRef.current !== nextSettingsKey)
        ) &&
        pendingSettingsKeyRef.current !== nextSettingsKey
      ) {
        const writeGeneration = settingsWriteGenerationRef.current + 1;
        settingsWriteGenerationRef.current = writeGeneration;
        pendingSettingsKeyRef.current = nextSettingsKey;
        const writeAuthEpoch = authEpochRef.current;
        const requestedSettings = { language, theme, selectedGrade };
        settingsWriteChainRef.current = settingsWriteChainRef.current
          .catch(() => undefined)
          .then(async () => {
            if (
              accountWorkBlockedRef.current ||
              currentUserRef.current?.id !== currentUser.id ||
              writeGeneration !== settingsWriteGenerationRef.current ||
              writeAuthEpoch !== authEpochRef.current
            ) return;

            const controller = new AbortController();
            settingsWriteAbortRef.current = controller;
            let response: Response;
            try {
              response = await fetch("/api/me/settings", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "X-MAIS-Expected-User-Id": currentUser.id
                },
                body: JSON.stringify({ ...requestedSettings, expectedUserId: currentUser.id }),
                signal: controller.signal
              });
            } finally {
              if (settingsWriteAbortRef.current === controller) settingsWriteAbortRef.current = null;
            }
            if (writeAuthEpoch !== authEpochRef.current) return;
            if (response.status === 401 || response.status === 403 || response.status === 409) {
              settingsWriteGenerationRef.current += 1;
              pendingSettingsKeyRef.current = null;
              settingsDirtyRef.current = false;
              settingsRetryAttemptRef.current = 0;
              clearSettingsRetryHandle();
              persistedSettingsKeyRef.current = null;
              quarantineForSessionCheck();
              router.refresh();
              return;
            }
            if (!response.ok) throw new Error("Settings persistence failed.");

            const payload = await response.json().catch(() => null) as {
              settings?: Partial<AuthSessionResponse["settings"]>;
            } | null;
            if (
              payload?.settings?.language !== requestedSettings.language ||
              payload.settings.theme !== requestedSettings.theme ||
              payload.settings.selectedGrade !== requestedSettings.selectedGrade
            ) {
              throw new Error("Settings persistence returned a different snapshot.");
            }
            if (
              writeGeneration === settingsWriteGenerationRef.current &&
              writeAuthEpoch === authEpochRef.current
            ) {
              persistedSettingsKeyRef.current = nextSettingsKey;
              settingsDirtyRef.current = false;
              settingsRetryAttemptRef.current = 0;
              clearSettingsRetryHandle();
            }
          })
          .catch(() => {
            if (
              writeGeneration === settingsWriteGenerationRef.current &&
              writeAuthEpoch === authEpochRef.current
            ) {
              persistedSettingsKeyRef.current = null;
              settingsDirtyRef.current = true;
              if (settingsRetryHandleRef.current === null && settingsRetryAttemptRef.current < 3) {
                const retryAttempt = settingsRetryAttemptRef.current + 1;
                settingsRetryAttemptRef.current = retryAttempt;
                settingsRetryHandleRef.current = window.setTimeout(() => {
                  settingsRetryHandleRef.current = null;
                  setSettingsRetryNonce((current) => current + 1);
                }, 500 * (2 ** (retryAttempt - 1)));
              }
            }
          })
          .finally(() => {
            if (pendingSettingsKeyRef.current === nextSettingsKey) {
              pendingSettingsKeyRef.current = null;
            }
          });
      }
    } else {
      persistedSettingsKeyRef.current = null;
      writeLocalStorageItem("hk-math-theme", theme);
      writeLocalStorageItem("hk-math-language", language);
      writeLocalStorageItem("hk-math-grade", selectedGrade);
      removeLocalStorageItem("hk-math-user");
    }

    return () => titleHandles.forEach((handle) => window.clearTimeout(handle));
  }, [
    clearSettingsRetryHandle,
    pathname,
    theme,
    language,
    selectedGrade,
    currentUser?.id,
    quarantineForSessionCheck,
    router,
    settingsReady,
    settingsRetryNonce
  ]);

  useEffect(() => {
    const retryWhenOnline = () => {
      if (!settingsDirtyRef.current || accountWorkBlockedRef.current) return;
      settingsRetryAttemptRef.current = 0;
      clearSettingsRetryHandle();
      setSettingsRetryNonce((current) => current + 1);
    };
    window.addEventListener("online", retryWhenOnline);
    return () => window.removeEventListener("online", retryWhenOnline);
  }, [clearSettingsRetryHandle]);

  useEffect(() => {
    if (!settingsReady || skipGlobalStudentWarmups) return;
    void refreshMistakeRecords();
  }, [refreshMistakeRecords, settingsReady, skipGlobalStudentWarmups]);

  useEffect(() => {
    if (studentLessonHref) {
      router.prefetch(studentLessonHref);
    }
  }, [router, studentLessonHref]);

  useEffect(() => {
    if (!settingsReady || !currentUser?.passwordMustChange) return;
    if (pathname.startsWith("/change-password") || pathname.startsWith("/login") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")) return;

    router.replace(`/change-password?next=${encodeURIComponent(pathname)}`);
  }, [currentUser?.passwordMustChange, pathname, router, settingsReady]);

  useEffect(() => {
    if (
      !settingsReady ||
      currentUser?.role !== "student" ||
      lessonEntryTargetForGrade(lessonEntryTarget, selectedGrade)
    ) return;
    const storedTarget = readStoredLessonEntryTarget(currentUser.id, selectedGrade);
    if (storedTarget) dispatchCore({ type: "set-lesson-entry", lessonEntryTarget: storedTarget });
  }, [currentUser?.id, currentUser?.role, lessonEntryTarget, selectedGrade, settingsReady]);

  useEffect(() => {
    if (
      !settingsReady ||
      currentUser?.role !== "student" ||
      skipGlobalStudentWarmups ||
      lessonEntryTargetForGrade(lessonEntryTarget, selectedGrade)
    ) return;
    void refreshLessonEntryTarget(selectedGrade);
  }, [currentUser?.role, lessonEntryTarget, refreshLessonEntryTarget, selectedGrade, settingsReady, skipGlobalStudentWarmups]);

  useEffect(() => {
    analyticsFlushGenerationRef.current += 1;
    pendingLearningEventsRef.current = [];
    highFrequencyLearningEventsRef.current = [];
    clearHighFrequencyFlushHandle();
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
  }, [clearHighFrequencyFlushHandle, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    pendingLearningEventsRef.current = pendingLearningEvents;
  }, [pendingLearningEvents]);

  const sendLearningEventsDuringPageExit = useCallback((events: LearningAnalyticsEvent[], expectedUserId: string) => {
    if (accountWorkBlockedRef.current || events.length === 0) return;

    for (let index = 0; index < events.length; index += 100) {
      const payload = JSON.stringify({
        events: events.slice(index, index + 100),
        expectedUserId
      });
      if (typeof navigator.sendBeacon === "function") {
        const queued = navigator.sendBeacon("/api/learning-events", new Blob([payload], { type: "application/json" }));
        if (queued) continue;
      }

      void fetch("/api/learning-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MAIS-Expected-User-Id": expectedUserId
        },
        body: payload,
        keepalive: true
      }).catch(() => {
        // The page is leaving; the regular queue will retry only if the page stays alive.
      });
    }
  }, []);

  const flushLearningAnalyticsOnPageExit = useCallback((event?: Event) => {
    if (event?.type === "visibilitychange" && document.visibilityState !== "hidden") return;
    if (accountWorkBlockedRef.current || !settingsReady || !currentUser || currentUser.role !== "student") return;

    const bufferedEvents = takeBufferedHighFrequencyLearningEvents();
    const events = coalesceLearningAnalyticsEvents([
      ...pendingLearningEventsRef.current,
      ...bufferedEvents
    ]);
    if (events.length === 0) return;

    const eventIds = new Set(events.map((item) => item.id));
    setPendingLearningEvents((current) => {
      const nextEvents = current.filter((item) => !eventIds.has(item.id));
      pendingLearningEventsRef.current = nextEvents;
      return nextEvents;
    });
    sendLearningEventsDuringPageExit(events, currentUser.id);
  }, [
    currentUser?.id,
    currentUser?.role,
    sendLearningEventsDuringPageExit,
    settingsReady,
    takeBufferedHighFrequencyLearningEvents
  ]);

  useEffect(() => {
    if (!settingsReady || currentUser?.role !== "student") return;

    document.addEventListener("visibilitychange", flushLearningAnalyticsOnPageExit);
    window.addEventListener("pagehide", flushLearningAnalyticsOnPageExit);
    window.addEventListener("beforeunload", flushLearningAnalyticsOnPageExit);

    return () => {
      flushLearningAnalyticsOnPageExit();
      document.removeEventListener("visibilitychange", flushLearningAnalyticsOnPageExit);
      window.removeEventListener("pagehide", flushLearningAnalyticsOnPageExit);
      window.removeEventListener("beforeunload", flushLearningAnalyticsOnPageExit);
    };
  }, [currentUser?.role, flushLearningAnalyticsOnPageExit, settingsReady]);

  useEffect(() => {
    if (
      accountWorkBlockedRef.current ||
      !settingsReady ||
      !currentUser ||
      currentUser.role !== "student" ||
      pendingLearningEvents.length === 0
    ) return;

    const handle = window.setTimeout(() => {
      const expectedUserId = currentUser.id;
      const expectedUserRole = currentUser.role;
      if (
        accountWorkBlockedRef.current ||
        !sameAccountBoundary(currentUserRef.current, { id: expectedUserId, role: expectedUserRole })
      ) return;
      const flushGeneration = analyticsFlushGenerationRef.current;
      const events = pendingLearningEvents.slice(0, 100);
      const eventIds = new Set(events.map((event) => event.id));
      setPendingLearningEvents((current) => {
        const nextEvents = current.filter((event) => !eventIds.has(event.id));
        pendingLearningEventsRef.current = nextEvents;
        return nextEvents;
      });

      void fetch("/api/learning-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MAIS-Expected-User-Id": expectedUserId
        },
        body: JSON.stringify({ events, expectedUserId })
      })
        .then((response) => {
          if (response.status === 401 || response.status === 403 || response.status === 409) {
            if (analyticsFlushGenerationRef.current === flushGeneration) {
              quarantineForSessionCheck();
              router.refresh();
            }
            return;
          }
          if (response.status === 400) return;
          if (!response.ok) throw new Error("Could not flush learning events.");
          if (
            analyticsFlushGenerationRef.current === flushGeneration &&
            sameAccountBoundary(currentUserRef.current, { id: expectedUserId, role: expectedUserRole })
          ) {
            window.dispatchEvent(new Event(learningAnalyticsUpdatedEventName));
          }
        })
        .catch(() => {
          if (analyticsFlushGenerationRef.current !== flushGeneration) return;
          setPendingLearningEvents((current) => {
            const currentIds = new Set(current.map((event) => event.id));
            const missedEvents = events.filter((event) => !currentIds.has(event.id));
            const nextEvents = coalesceLearningAnalyticsEvents([...missedEvents, ...current]).slice(-maxStoredLearningAnalyticsEvents);
            pendingLearningEventsRef.current = nextEvents;
            return nextEvents;
          });
        });
    }, 1000);

    return () => window.clearTimeout(handle);
  }, [
    currentUser?.id,
    currentUser?.role,
    pendingLearningEvents,
    quarantineForSessionCheck,
    router,
    settingsReady
  ]);

  const setSelectedGrade = useCallback((grade: GradeId) => {
    if (accountWorkBlockedRef.current) return;
    settingsMutationEpochRef.current += 1;
    settingsDirtyRef.current = true;
    settingsRetryAttemptRef.current = 0;
    clearSettingsRetryHandle();
    dispatchCore({ type: "set-grade", grade });
  }, [clearSettingsRetryHandle]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    if (accountWorkBlockedRef.current) return;
    settingsMutationEpochRef.current += 1;
    settingsDirtyRef.current = true;
    settingsRetryAttemptRef.current = 0;
    clearSettingsRetryHandle();
    dispatchCore({ type: "set-language", language: nextLanguage });
  }, [clearSettingsRetryHandle]);

  const toggleLanguage = useCallback(() => {
    if (accountWorkBlockedRef.current) return;
    settingsMutationEpochRef.current += 1;
    settingsDirtyRef.current = true;
    settingsRetryAttemptRef.current = 0;
    clearSettingsRetryHandle();
    dispatchCore({
      type: "set-language",
      language: language === "en" ? "zh" : language === "zh" ? "zh-Hans" : "en"
    });
  }, [clearSettingsRetryHandle, language]);

  const toggleTheme = useCallback(() => {
    if (accountWorkBlockedRef.current) return;
    settingsMutationEpochRef.current += 1;
    settingsDirtyRef.current = true;
    settingsRetryAttemptRef.current = 0;
    clearSettingsRetryHandle();
    dispatchCore({ type: "set-theme", theme: theme === "dark" ? "light" : "dark" });
  }, [clearSettingsRetryHandle, theme]);

  useEffect(() => {
    const source = analyticsSourceForPath(pathname);
    const topicId = topicIdForPath(pathname);
    let accumulatedVisibleSeconds = 0;
    let visibleStartedAt = document.visibilityState === "visible" ? Date.now() : null;

    recordLearningEvent({ type: "page-view", source, topicId });
    if (source === "mistake-book") {
      recordLearningEvent({ type: "mistake-review", source, topicId });
    }

    function collectVisibleSeconds() {
      if (visibleStartedAt === null) return;
      const now = Date.now();
      accumulatedVisibleSeconds += Math.max(0, (now - visibleStartedAt) / 1000);
      visibleStartedAt = now;
    }

    function recordVisibleDuration() {
      collectVisibleSeconds();
      if (accumulatedVisibleSeconds < minimumTrackedPageSeconds) return;

      const durationSeconds = Math.min(maximumTrackedPageSeconds, Math.round(accumulatedVisibleSeconds));
      accumulatedVisibleSeconds = 0;
      recordLearningEvent({ type: "page-view", source, topicId, durationSeconds });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        recordVisibleDuration();
        visibleStartedAt = null;
      } else {
        visibleStartedAt = Date.now();
      }
    }

    const durationHandle = window.setInterval(recordVisibleDuration, 60_000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(durationHandle);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      recordVisibleDuration();
    };
  }, [pathname, recordLearningEvent]);

  const applyAuthSession = useCallback((
    session: AuthSessionResponse,
    options: {
      preserveSettings?: boolean;
      broadcast?: boolean;
      resetLearningState?: boolean;
      invalidateRevalidation?: boolean;
      keepVerificationGate?: boolean;
    } = {}
  ) => {
    const preserveSettings = options.preserveSettings === true;
    const shouldRetryDirtySettings = preserveSettings && settingsDirtyRef.current;
    const resetLearningState = options.resetLearningState !== false;
    const sessionSelectedGrade = preserveSettings
      ? coreStateRef.current.selectedGrade
      : session.settings.selectedGrade;
    const storedLessonEntryTarget = session.user.role === "student"
      ? readStoredLessonEntryTarget(session.user.id, sessionSelectedGrade)
      : null;
    const sessionLessonEntryTarget = session.user.role === "student"
      ? lessonEntryTargetForGrade(session.lessonEntryTarget, sessionSelectedGrade) ?? storedLessonEntryTarget
      : null;
    if (resetLearningState || options.invalidateRevalidation === true) {
      sessionRevalidationGenerationRef.current += 1;
      sessionRevalidationAbortRef.current?.abort();
    }
    if (resetLearningState) {
      analyticsFlushGenerationRef.current += 1;
      authEpochRef.current += 1;
      settingsMutationEpochRef.current += 1;
      settingsWriteAbortRef.current?.abort();
      settingsWriteGenerationRef.current += 1;
      pendingSettingsKeyRef.current = null;
      settingsDirtyRef.current = false;
      settingsRetryAttemptRef.current = 0;
      clearSettingsRetryHandle();
      abortPerUserReads();
      lessonEntryRequestKeyRef.current = null;
      persistedSettingsKeyRef.current = null;
      setMistakeRecords([]);
      pendingLearningEventsRef.current = [];
      highFrequencyLearningEventsRef.current = [];
      clearHighFrequencyFlushHandle();
      setLearningAnalyticsEvents([]);
      setPendingLearningEvents([]);
    }
    if (!preserveSettings) {
      settingsDirtyRef.current = false;
      persistedSettingsKeyRef.current = session.settingsPersisted === false
        ? null
        : persistedSettingsKey(
            session.user.id,
            session.settings.language,
            session.settings.theme,
            session.settings.selectedGrade
      );
    }
    const safeBootstrap = toAuthenticatedAppShellBootstrap(session);
    currentUserRef.current = safeBootstrap.user;
    dispatchCore({
      type: "apply-session",
      user: safeBootstrap.user,
      settings: session.settings,
      lessonEntryTarget: sessionLessonEntryTarget,
      preserveSettings
    });
    if (session.lessonEntryTarget) {
      storeLessonEntryTarget(session.user.id, session.lessonEntryTarget);
    }
    if (sessionLessonEntryTarget?.href) {
      router.prefetch(sessionLessonEntryTarget.href);
    }
    if (options.keepVerificationGate !== true) {
      quarantinedUserRef.current = null;
      setSessionVerificationState(false);
    }
    if (shouldRetryDirtySettings) {
      setSettingsRetryNonce((current) => current + 1);
    }
    if (options.broadcast !== false) broadcastSessionChange(safeBootstrap.user);
  }, [abortPerUserReads, clearHighFrequencyFlushHandle, clearSettingsRetryHandle, router, setSessionVerificationState]);

  const beginAuthenticatedDocumentTransition = useCallback((session: AuthSessionResponse) => {
    const safeBootstrap = toAuthenticatedAppShellBootstrap(session);

    // A login, registration or password-reset confirmation replaces the
    // browser cookie. Never adopt that identity inside the old React/RSC tree:
    // a late Flight response from the previous account could otherwise be
    // accepted before the destination document commits. Gate synchronously,
    // invalidate every captured account continuation, publish the new durable
    // identity, and let the calling page perform a full-document replacement.
    flushSync(() => quarantineForSessionCheck("identity"));
    authEpochRef.current += 1;
    settingsMutationEpochRef.current += 1;
    sessionRevalidationGenerationRef.current += 1;
    sessionRevalidationAbortRef.current?.abort();
    settingsWriteAbortRef.current?.abort();
    settingsWriteGenerationRef.current += 1;
    sessionVerificationTargetRef.current = appShellIdentityFromBootstrap(safeBootstrap);
    broadcastSessionChange(safeBootstrap.user);
  }, [quarantineForSessionCheck]);

  const login = useCallback(async (identifier: string, password: string, grade?: GradeId, curriculumProfile?: CurriculumProfile): Promise<AuthActionResult> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username: identifier, password, grade, curriculumProfile, curriculumTrack: curriculumProfile ? curriculumTrackForProfile(curriculumProfile) : undefined, language, theme })
    });

    if (!response.ok) {
      if (response.status === 503) return { ok: false, reason: await unavailableAuthReason(response) };
      if (response.status === 400 || response.status === 401) return { ok: false, reason: "invalid" };
      return { ok: false, reason: "error" };
    }

    const body = await response.json();
    const pending = body as { requiresCurriculumTrack?: unknown; user?: { name?: unknown; username?: unknown; grade?: unknown } } | null;
    if (
      pending?.requiresCurriculumTrack === true &&
      typeof pending.user?.name === "string" &&
      typeof pending.user.username === "string" &&
      isGrade(pending.user.grade)
    ) {
      return {
        ok: false,
        reason: "requires-curriculum-track",
        requiresCurriculumTrack: true,
        pendingUser: {
          name: pending.user.name,
          username: pending.user.username,
          grade: pending.user.grade
        }
      };
    }

    const session = readAuthSession(body);
    if (!session) return { ok: false, reason: "error" };

    beginAuthenticatedDocumentTransition(session);
    return { ok: true, role: session.user.role, passwordMustChange: Boolean(session.user.passwordMustChange) };
  }, [beginAuthenticatedDocumentTransition, language, theme]);

  const register = useCallback(async ({ role = "student", name, username, email, password, grade, curriculumProfile }: RegisterInput): Promise<AuthActionResult> => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role,
        name,
        username,
        email,
        password,
        grade,
        curriculumProfile,
        curriculumTrack: curriculumProfile ? curriculumTrackForProfile(curriculumProfile) : undefined,
        language,
        theme
      })
    });

    if (!response.ok) {
      if (response.status === 409) return { ok: false, reason: "duplicate" };
      if (response.status === 400) return { ok: false, reason: "invalid" };
      if (response.status === 503) return { ok: false, reason: await unavailableAuthReason(response) };
      return { ok: false, reason: "error" };
    }

    const session = readAuthSession(await response.json());
    if (!session) return { ok: false, reason: "error" };

    beginAuthenticatedDocumentTransition(session);
    return { ok: true, role: session.user.role, passwordMustChange: Boolean(session.user.passwordMustChange) };
  }, [beginAuthenticatedDocumentTransition, language, theme]);

  const completePasswordReset = useCallback(async (token: string, password: string): Promise<AuthActionResult> => {
    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token, password })
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: response.status === 400
          ? "invalid"
          : response.status === 503
            ? await unavailableAuthReason(response)
            : "error"
      };
    }

    const session = readAuthSession(await response.json());
    if (!session) return { ok: false, reason: "error" };

    beginAuthenticatedDocumentTransition(session);
    return { ok: true, role: session.user.role, passwordMustChange: Boolean(session.user.passwordMustChange) };
  }, [beginAuthenticatedDocumentTransition]);

  const changePassword = useCallback(async (currentPassword: string, password: string): Promise<AuthActionResult> => {
    const expectedUser = currentUserRef.current;
    if (!expectedUser || accountWorkBlockedRef.current) return { ok: false, reason: "error" };
    const expectedUserId = expectedUser.id;
    const expectedUserRole = expectedUser.role;
    const response = await fetch("/api/auth/password-change", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MAIS-Expected-User-Id": expectedUserId
      },
      body: JSON.stringify({ currentPassword, password, expectedUserId })
    });

    if (!response.ok) {
      const responseCode = await readAuthErrorCode(response);
      if (responseCode === "account-updated-session-refresh-required") {
        quarantineForSessionCheck();
        // The password mutation committed even though the new session could
        // not be issued. Tell every sibling tab to gate immediately instead
        // of leaving another copy of the old, now-revoked account visible.
        broadcastSessionChange(null);
        window.location.replace("/login?reason=password-updated-sign-in-required");
        return { ok: false, reason: "password-updated-sign-in-required" };
      }
      if (response.status === 401 || response.status === 403 || response.status === 409) {
        quarantineForSessionCheck();
        router.refresh();
      }
      return { ok: false, reason: response.status === 400 ? "invalid" : response.status === 401 ? "invalid" : "error" };
    }

    const session = readAuthSession(await response.json());
    if (!session) return { ok: false, reason: "error" };
    if (
      accountWorkBlockedRef.current ||
      !sameAccountBoundary(currentUserRef.current, { id: expectedUserId, role: expectedUserRole }) ||
      !sameAccountBoundary(expectedUser, session.user)
    ) {
      return { ok: false, reason: "error" };
    }

    applyAuthSession(session);
    return { ok: true, role: session.user.role, passwordMustChange: Boolean(session.user.passwordMustChange) };
  }, [applyAuthSession, quarantineForSessionCheck, router]);

  const updateProfile = useCallback(async ({ name, avatarId, avatarImageDataUrl }: ProfileUpdateInput): Promise<AuthActionResult> => {
    const expectedUser = currentUserRef.current;
    if (!expectedUser || accountWorkBlockedRef.current) return { ok: false, reason: "error" };
    const expectedUserId = expectedUser.id;
    const expectedUserRole = expectedUser.role;

    const patchProfile = async (body: {
      name?: string;
      avatarId?: StudentAvatarId;
      avatarImageDataUrl?: string | null;
      avatarImageObject?: ProfileAvatarImageObject | null;
    }) => {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-MAIS-Expected-User-Id": expectedUserId
        },
        body: JSON.stringify({ ...body, expectedUserId })
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 409) {
          quarantineForSessionCheck();
          router.refresh();
        }
        if (response.status === 400) return { ok: false, reason: "invalid" } satisfies AuthActionResult;
        return { ok: false, reason: "error" } satisfies AuthActionResult;
      }

      const session = readAuthSession(await response.json());
      if (!session) return { ok: false, reason: "error" } satisfies AuthActionResult;
      if (
        accountWorkBlockedRef.current ||
        !sameAccountBoundary(currentUserRef.current, { id: expectedUserId, role: expectedUserRole }) ||
        !sameAccountBoundary(expectedUser, session.user)
      ) {
        return { ok: false, reason: "error" } satisfies AuthActionResult;
      }

      applyAuthSession(session, {
        preserveSettings: true,
        resetLearningState: false,
        invalidateRevalidation: true
      });
      return { ok: true, role: session.user.role } satisfies AuthActionResult;
    };

    try {
      const isFreshAvatarDataUrl =
        typeof avatarImageDataUrl === "string" &&
        avatarImageDataUrlPattern.test(avatarImageDataUrl);
      if (isFreshAvatarDataUrl) {
        const uploadResponse = await fetch("/api/media-objects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-MAIS-Expected-User-Id": expectedUserId
          },
          body: JSON.stringify({
            capability: "profile-avatar",
            dataUrl: avatarImageDataUrl,
            expectedUserId
          })
        });

        if (uploadResponse.status === 401 || uploadResponse.status === 403 || uploadResponse.status === 409) {
          quarantineForSessionCheck();
          router.refresh();
          return { ok: false, reason: "error" };
        }
        if (
          accountWorkBlockedRef.current ||
          !sameAccountBoundary(currentUserRef.current, { id: expectedUserId, role: expectedUserRole })
        ) {
          return { ok: false, reason: "error" };
        }

        if (uploadResponse.status === 201) {
          const uploadPayload = await uploadResponse.json().catch(() => null) as { media?: unknown } | null;
          const avatarImageObject = readProfileAvatarImageObject(uploadPayload?.media);
          if (!avatarImageObject) return { ok: false, reason: "error" };
          return await patchProfile({ name, avatarId, avatarImageObject });
        }

        if ((await readAuthErrorCode(uploadResponse)) !== "media-encryption-key-missing") {
          return { ok: false, reason: "error" };
        }
      }

      const patchAvatarImageDataUrl = avatarImageDataUrl === null
        ? null
        : isFreshAvatarDataUrl
          ? avatarImageDataUrl
          : undefined;
      return await patchProfile({ name, avatarId, avatarImageDataUrl: patchAvatarImageDataUrl });
    } catch {
      return { ok: false, reason: "error" };
    }
  }, [applyAuthSession, quarantineForSessionCheck, router]);

  const clearLocalSession = useCallback(() => {
    analyticsFlushGenerationRef.current += 1;
    authEpochRef.current += 1;
    settingsMutationEpochRef.current += 1;
    sessionRevalidationGenerationRef.current += 1;
    sessionRevalidationAbortRef.current?.abort();
    settingsWriteAbortRef.current?.abort();
    settingsWriteGenerationRef.current += 1;
    settingsWriteChainRef.current = Promise.resolve();
    pendingSettingsKeyRef.current = null;
    settingsDirtyRef.current = false;
    settingsRetryAttemptRef.current = 0;
    clearSettingsRetryHandle();
    abortPerUserReads();
    lessonEntryRequestKeyRef.current = null;
    persistedSettingsKeyRef.current = null;
    pendingLearningEventsRef.current = [];
    highFrequencyLearningEventsRef.current = [];
    clearHighFrequencyFlushHandle();
    setMistakeRecords([]);
    currentUserRef.current = null;
    dispatchCore({ type: "clear-session" });
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
  }, [abortPerUserReads, clearHighFrequencyFlushHandle, clearSettingsRetryHandle]);

  const logout = useCallback(async () => {
    const expectedUserId = currentUserRef.current?.id ?? null;
    quarantineForSessionCheck();
    const controller = new AbortController();
    const timeoutHandle = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: expectedUserId ? { "X-MAIS-Expected-User-Id": expectedUserId } : undefined,
        signal: controller.signal
      });
      if (response.status === 409) {
        // The cookie now belongs to a different account. Preserve that session
        // and replace this stale document instead of signing the new user out.
        window.location.reload();
        return;
      }
    } catch {
      // The browser state should still clear if the network request fails.
    } finally {
      window.clearTimeout(timeoutHandle);
    }
    clearLocalSession();
    broadcastSessionChange(null);
    window.location.replace("/login");
  }, [clearLocalSession, quarantineForSessionCheck]);

  // Reconciles the in-memory session with the server cookie. Without this, a tab
  // keeps rendering a stale identity after the session cookie is replaced in
  // another tab (or dropped), and every protected API call fails with 401/403.
  const revalidateSession = useCallback(async (
    previousUserOverride?: AppShellUserSafe | null,
    verificationGateActive?: boolean
  ) => {
    const previousUser = previousUserOverride ?? currentUserRef.current ?? quarantinedUserRef.current;
    const shouldGateDuringCheck = verificationGateActive ?? Boolean(previousUser);
    if (shouldGateDuringCheck && !sessionVerificationPendingRef.current) {
      quarantineForSessionCheck();
    }

    const requestGeneration = sessionRevalidationGenerationRef.current + 1;
    sessionRevalidationGenerationRef.current = requestGeneration;
    sessionRevalidationAbortRef.current?.abort();
    const controller = new AbortController();
    sessionRevalidationAbortRef.current = controller;
    const requestAuthEpoch = authEpochRef.current;
    const requestSettingsEpoch = settingsMutationEpochRef.current;
    try {
      const response = await fetch("/api/auth/session-state?includeLessonEntry=false", {
        cache: "no-store",
        signal: controller.signal
      });
      if (
        requestGeneration !== sessionRevalidationGenerationRef.current ||
        requestAuthEpoch !== authEpochRef.current
      ) return;

      if (!response.ok && response.status !== 401) return;
      const payload: unknown = response.status === 401 ? { user: null } : await response.json();
      if (
        requestGeneration !== sessionRevalidationGenerationRef.current ||
        requestAuthEpoch !== authEpochRef.current
      ) return;

      // Signed out: the guest-tolerant endpoint answers 200 `{ user: null }`
      // (a 401 is kept equivalent in case an auth boundary intercepts first).
      if ((payload as { user?: unknown } | null)?.user === null) {
        // A foreground check keeps local drafts mounted only while the server
        // may still confirm the same identity. Once sign-out is authoritative,
        // hard-unmount the account tree before clearing or navigating.
        quarantineForSessionCheck("identity");
        sessionVerificationTargetRef.current = { userId: null, userRole: null };
        // Replace any stale durable cross-tab identity before a public-route
        // reload; otherwise the next guest document would read the same stale
        // signal on mount and re-enter the verification loop.
        broadcastSessionChange(null);
        clearLocalSession();
        const currentPathname = window.location.pathname;
        if (isRoleProtectedPath(currentPathname)) {
          window.location.replace(`/login?next=${encodeURIComponent(currentPathname)}`);
        } else {
          // A trusted guest document must replace the authenticated React tree
          // even on public routes. Do not clear the identity gate in the same
          // batch and let account-local component state survive into guest UI.
          window.location.reload();
        }
        return;
      }

      const session = readAuthSession(payload);
      if (!session) return;
      const durableIdentity = readSessionSyncIdentity(readLocalStorageItem(sessionSyncStorageKey));
      if (
        !durableIdentity.valid ||
        durableIdentity.userId !== session.user.id ||
        durableIdentity.userRole !== session.user.role
      ) {
        // Seed a missing/corrupt signal after an authoritative server check.
        // Use localStorage without a same-document BroadcastChannel echo; other
        // tabs receive one storage event, while this tab avoids a revalidation
        // loop and future full loads can pass the pre-hydration guard directly.
        writeLocalStorageItem(sessionSyncStorageKey, JSON.stringify({
          userId: session.user.id,
          userRole: session.user.role,
          at: Date.now()
        }));
      }
      const sameUser = sameAccountBoundary(previousUser, session.user);
      const acceptedBootstrapIdentity = acceptedBootstrapIdentityRef.current;
      const acceptedBootstrapMatchesSession =
        acceptedBootstrapIdentity.userId !== null &&
        sameAccountBoundary(session.user, {
          id: acceptedBootstrapIdentity.userId,
          role: acceptedBootstrapIdentity.userRole
        });
      if (!acceptedBootstrapMatchesSession) {
        // The in-memory identity may already have advanced after an earlier
        // session-state response while the accepted RSC tree still belongs to
        // the previous account. Keep the hard identity gate until a matching
        // server bootstrap commits; a second same-user validation must not
        // reopen stale server children.
        quarantineForSessionCheck("identity");
        sessionVerificationTargetRef.current = {
          userId: session.user.id,
          userRole: session.user.role
        };
      }
      const preserveSettings = sameUser && (
        requestSettingsEpoch !== settingsMutationEpochRef.current ||
        pendingSettingsKeyRef.current !== null ||
        settingsDirtyRef.current
      );
      applyAuthSession(session, {
        preserveSettings,
        broadcast: false,
        resetLearningState: !sameUser,
        keepVerificationGate: shouldGateDuringCheck && !acceptedBootstrapMatchesSession
      });
      if (sameUser) {
        // Foreground quarantine aborts account-bound reads before the cookie
        // is trusted. Resume those exact same-account jobs after verification
        // without resetting local UI or dropping queued learning events.
        if (!skipGlobalStudentWarmups) void refreshMistakeRecords();
        if (session.user.role === "student" && !skipGlobalStudentWarmups) {
          void refreshLessonEntryTarget(coreStateRef.current.selectedGrade);
        }
        if (pendingLearningEventsRef.current.length > 0) {
          setPendingLearningEvents((current) => current.length > 0 ? [...current] : current);
        }
      }

      const currentPathname = window.location.pathname;
      const canUseTeacherArea = session.user.role === "teacher" || session.user.role === "admin";
      const canUseParentArea = session.user.role === "parent";
      if (currentPathname.startsWith("/teacher") && !canUseTeacherArea) {
        window.location.replace(`/login?next=${encodeURIComponent(currentPathname)}&reason=teacher-account-required`);
      } else if (currentPathname.startsWith("/parent") && !canUseParentArea) {
        window.location.replace(`/login?next=${encodeURIComponent(currentPathname)}`);
      } else if (!acceptedBootstrapMatchesSession) {
        // Replace the complete document for a cross-account boundary. A client
        // RSC refresh can race an older navigation response and reintroduce the
        // previous account's children after the gate has cleared.
        window.location.reload();
      }
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      // Keep the current state when the session check is unavailable.
    } finally {
      if (sessionRevalidationAbortRef.current === controller) {
        sessionRevalidationAbortRef.current = null;
      }
    }
  }, [
    applyAuthSession,
    clearLocalSession,
    quarantineForSessionCheck,
    refreshLessonEntryTarget,
    refreshMistakeRecords,
    router,
    setSessionVerificationState,
    skipGlobalStudentWarmups
  ]);

  useLayoutEffect(() => {
    if (!settingsReady) return;

    const reconcileSignalledIdentity = (
      signalledIdentity: SessionSyncIdentity,
      revalidateMatchingIdentity: boolean
    ) => {
      const currentIdentity = currentUserRef.current ?? quarantinedUserRef.current;
      const identityIsUncertain =
        !signalledIdentity.valid ||
        (signalledIdentity.userId === null
          ? currentIdentity !== null
          : !sameAccountBoundary(currentIdentity, {
              id: signalledIdentity.userId,
              role: signalledIdentity.userRole
            }));
      if (!identityIsUncertain && !revalidateMatchingIdentity) return false;
      const previousUser = identityIsUncertain
        ? quarantineForSessionCheck()
        : currentIdentity;
      if (identityIsUncertain) {
        if (!signalledIdentity.valid) {
          sessionVerificationTargetRef.current = null;
        } else if (signalledIdentity.userId === null) {
          sessionVerificationTargetRef.current = { userId: null, userRole: null };
        } else {
          sessionVerificationTargetRef.current = {
            userId: signalledIdentity.userId,
            userRole: signalledIdentity.userRole
          };
        }
      }
      void revalidateSession(previousUser, identityIsUncertain || sessionVerificationPendingRef.current);
      return true;
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== sessionSyncStorageKey) return;
      reconcileSignalledIdentity(readSessionSyncIdentity(event.newValue), true);
    };
    const handleBroadcastMessage = (event: MessageEvent<unknown>) => {
      if (
        event.data &&
        typeof event.data === "object" &&
        "sourceDocumentId" in event.data &&
        event.data.sourceDocumentId === sessionSyncDocumentId
      ) return;
      let serialized: string;
      try {
        serialized = JSON.stringify(event.data);
      } catch {
        serialized = "";
      }
      reconcileSignalledIdentity(readSessionSyncIdentity(serialized), true);
    };
    let sessionBroadcastChannel: BroadcastChannel | null = null;
    try {
      sessionBroadcastChannel = new BroadcastChannel(sessionSyncStorageKey);
      sessionBroadcastChannel.addEventListener("message", handleBroadcastMessage);
    } catch {
      sessionBroadcastChannel = null;
    }

    // A document may hydrate while its tab is already backgrounded, in which
    // case it never observes the transition to `hidden`. Validate on the first
    // foreground event instead of trusting that unobserved interval.
    let needsForegroundValidation = document.visibilityState === "hidden";
    const handleBlur = () => {
      needsForegroundValidation = true;
      const previousUser = currentUserRef.current ?? quarantinedUserRef.current;
      if (previousUser) quarantineForSessionCheck("foreground");
    };
    const validateAfterForegroundReturn = () => {
      if (!needsForegroundValidation) return;
      needsForegroundValidation = false;
      const previousUser = currentUserRef.current ?? quarantinedUserRef.current;
      if (previousUser) quarantineForSessionCheck("foreground");
      void revalidateSession(previousUser, Boolean(previousUser));
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        needsForegroundValidation = true;
        const previousUser = currentUserRef.current ?? quarantinedUserRef.current;
        if (previousUser) quarantineForSessionCheck("foreground");
        return;
      }
      validateAfterForegroundReturn();
    };

    const handlePageHide = () => {
      needsForegroundValidation = true;
      const previousUser = currentUserRef.current ?? quarantinedUserRef.current;
      if (!previousUser) return;
      // Commit the privacy cover into a possible BFCache snapshot before the
      // browser freezes the document. A deferred state update can otherwise
      // let the old account flash before pageshow validation runs.
      flushSync(() => quarantineForSessionCheck("foreground"));
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      needsForegroundValidation = false;
      const previousUser = currentUserRef.current ?? quarantinedUserRef.current;
      if (previousUser) quarantineForSessionCheck("foreground");
      void revalidateSession(previousUser, Boolean(previousUser));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", validateAfterForegroundReturn);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibility);

    // Every authenticated document starts behind the React-owned identity
    // gate. Reconcile the durable signal for target selection, then require an
    // authoritative cookie check before mounting any account tree. This also
    // closes the response-to-hydration gap without a document-mutating inline
    // script or a race against React's <html>/<head> singleton hydration.
    const persistedSessionSignal = readLocalStorageItem(sessionSyncStorageKey);
    if (initialSessionVerificationPending && !initialSessionValidationStartedRef.current) {
      initialSessionValidationStartedRef.current = true;
      const mountedIdentity = currentUserRef.current ?? quarantinedUserRef.current;
      const validationStartedFromSignal = persistedSessionSignal !== null
        ? reconcileSignalledIdentity(readSessionSyncIdentity(persistedSessionSignal), true)
        : false;
      if (!validationStartedFromSignal) void revalidateSession(mountedIdentity, true);
    } else if (persistedSessionSignal !== null) {
      reconcileSignalledIdentity(readSessionSyncIdentity(persistedSessionSignal), false);
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", validateAfterForegroundReturn);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibility);
      sessionBroadcastChannel?.removeEventListener("message", handleBroadcastMessage);
      sessionBroadcastChannel?.close();
    };
  }, [initialSessionVerificationPending, quarantineForSessionCheck, revalidateSession, settingsReady]);

  useEffect(() => {
    setReactGuardReady(true);
  }, []);

  const refreshMistakeRecordsAfterAttempt = useCallback(() => {
    void refreshMistakeRecords();
  }, [refreshMistakeRecords]);

  const mutateMistakes = useCallback((path: string, method: "PATCH" | "DELETE") => {
    const expectedUser = currentUserRef.current;
    if (!expectedUser || accountWorkBlockedRef.current) return;
    const expectedUserId = expectedUser.id;
    const expectedUserRole = expectedUser.role;

    void fetch(path, {
      method,
      headers: { "X-MAIS-Expected-User-Id": expectedUserId }
    }).then((response) => {
      if (response.status === 401 || response.status === 403 || response.status === 409) {
        quarantineForSessionCheck();
        router.refresh();
        return;
      }
      if (
        response.ok &&
        sameAccountBoundary(currentUserRef.current, { id: expectedUserId, role: expectedUserRole })
      ) {
        void refreshMistakeRecords();
      }
    }).catch(() => {
      // The visible record stays unchanged when the mutation is unavailable.
    });
  }, [quarantineForSessionCheck, refreshMistakeRecords, router]);

  const markMistakeMastered = useCallback((questionId: string) => {
    mutateMistakes(`/api/mistakes/${encodeURIComponent(questionId)}`, "PATCH");
  }, [mutateMistakes]);

  const removeMistake = useCallback((questionId: string) => {
    mutateMistakes(`/api/mistakes/${encodeURIComponent(questionId)}`, "DELETE");
  }, [mutateMistakes]);

  const clearMistakes = useCallback(() => {
    mutateMistakes("/api/mistakes", "DELETE");
  }, [mutateMistakes]);

  const clearLearningAnalytics = useCallback(() => {
    const expectedUser = currentUserRef.current;
    if (accountWorkBlockedRef.current) return;
    const clearGeneration = analyticsFlushGenerationRef.current + 1;
    analyticsFlushGenerationRef.current = clearGeneration;
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
    if (expectedUser) {
      const expectedUserId = expectedUser.id;
      const expectedUserRole = expectedUser.role;
      void fetch("/api/learning-events", {
        method: "DELETE",
        headers: { "X-MAIS-Expected-User-Id": expectedUserId }
      }).then((response) => {
          if (response.status === 401 || response.status === 403 || response.status === 409) {
            quarantineForSessionCheck();
            router.refresh();
            return;
          }
          if (
            response.ok &&
            sameAccountBoundary(currentUserRef.current, { id: expectedUserId, role: expectedUserRole }) &&
            analyticsFlushGenerationRef.current === clearGeneration
          ) {
            window.dispatchEvent(new Event(learningAnalyticsUpdatedEventName));
          }
        }).catch(() => {
          // The local clear remains visible; a later refresh restores server truth.
        });
    } else {
      window.dispatchEvent(new Event(learningAnalyticsUpdatedEventName));
    }
  }, [quarantineForSessionCheck, router]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settingsReady,
      language,
      setLanguage,
      toggleLanguage,
      theme,
      toggleTheme,
      selectedGrade,
      setSelectedGrade,
      currentUser,
      studentLessonHref,
      refreshLessonEntryTarget,
      login,
      register,
      completePasswordReset,
      changePassword,
      updateProfile,
      logout,
      revalidateSession,
      mistakeRecords,
      learningAnalyticsEvents,
      refreshMistakeRecordsAfterAttempt,
      recordLearningEvent,
      clearLearningAnalytics,
      markMistakeMastered,
      removeMistake,
      clearMistakes,
      text: (localized) => textForLanguage(localized, language),
      t: (localized) => textForLanguage(localized, language)
    }),
    [
      clearLearningAnalytics,
      changePassword,
      completePasswordReset,
      clearMistakes,
      currentUser,
      language,
      learningAnalyticsEvents,
      login,
      logout,
      markMistakeMastered,
      mistakeRecords,
      recordLearningEvent,
      register,
      refreshLessonEntryTarget,
      refreshMistakeRecordsAfterAttempt,
      removeMistake,
      refreshMistakeRecords,
      revalidateSession,
      selectedGrade,
      setSelectedGrade,
      settingsReady,
      studentLessonHref,
      theme,
      toggleLanguage,
      toggleTheme,
      updateProfile
    ]
  );

  const sessionVerificationCopy = {
    title: textForLanguage({
      en: "Verifying your account",
      zh: "正在核實你的帳戶",
      zhHans: "正在核实你的账户"
    }, language),
    detail: textForLanguage({
      en: "For your privacy, account information is hidden until this browser tab confirms the active session.",
      zh: "為保障私隱，此瀏覽器分頁確認目前登入狀態前，帳戶資料將暫時隱藏。",
      zhHans: "为保护隐私，此浏览器标签页确认当前登录状态前，账户资料将暂时隐藏。"
    }, language),
    retry: textForLanguage({
      en: "Check again",
      zh: "重新核實",
      zhHans: "重新核实"
    }, language)
  };

  useLayoutEffect(() => {
    if (displayedSessionVerificationMode === "none") return;

    const isolatedBodyChildren = new Map<HTMLElement, {
      inert: boolean;
      ariaHidden: string | null;
      visibility: string;
      pointerEvents: string;
    }>();
    const isolateBodyChild = (element: Element) => {
      if (!(element instanceof HTMLElement)) return;
      if (
        element.matches('[data-session-verification-gate="true"]') ||
        element.querySelector('[data-session-verification-gate="true"]')
      ) return;
      if (!isolatedBodyChildren.has(element)) {
        isolatedBodyChildren.set(element, {
          inert: element.inert,
          ariaHidden: element.getAttribute("aria-hidden"),
          visibility: element.style.visibility,
          pointerEvents: element.style.pointerEvents
        });
      }
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
      element.style.visibility = "hidden";
      element.style.pointerEvents = "none";
    };

    let bodyObserver: MutationObserver | null = null;
    // Move focus out of foreground-preserved account content (or a body
    // portal) before applying aria-hidden, avoiding an inaccessible focused
    // descendant during the gated frame.
    sessionVerificationGateRef.current?.focus();
    if (displayedSessionVerificationMode === "foreground") {
      // The normal app nodes and React portals are direct body children. Keep
      // their React state mounted, but isolate each one (including nodes added
      // while validation is pending) so stale UI is not visible or focusable.
      Array.from(document.body.children).forEach(isolateBodyChild);
      bodyObserver = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of Array.from(record.addedNodes)) {
            if (node instanceof Element && node.parentElement === document.body) isolateBodyChild(node);
          }
        }
      });
      bodyObserver.observe(document.body, { childList: true });
    }

    return () => {
      bodyObserver?.disconnect();
      for (const [element, snapshot] of isolatedBodyChildren) {
        element.inert = snapshot.inert;
        if (snapshot.ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", snapshot.ariaHidden);
        element.style.visibility = snapshot.visibility;
        element.style.pointerEvents = snapshot.pointerEvents;
      }
    };
  }, [displayedSessionVerificationMode]);

  const sessionVerificationGate = displayedSessionVerificationPending ? (
    <main
      ref={sessionVerificationGateRef}
      tabIndex={-1}
      className="fixed inset-0 z-[9999] flex min-h-screen w-full items-center justify-center overflow-y-auto bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6"
      data-session-verification-gate="true"
      data-session-verification-mode={displayedSessionVerificationMode}
      role="status"
      aria-live="polite"
    >
      <section className="glass-panel w-full max-w-xl space-y-4 p-6 text-center sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {sessionVerificationCopy.title}
        </h1>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {sessionVerificationCopy.detail}
        </p>
        <button
          type="button"
          className="focus-ring rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          onClick={() => {
            void revalidateSession(quarantinedUserRef.current, true);
          }}
        >
          {sessionVerificationCopy.retry}
        </button>
      </section>
    </main>
  ) : null;
  const accountTreeKey = currentUser
    ? `${currentUser.id}:${currentUser.role}`
    : "guest";

  return (
    <SettingsContext.Provider value={value}>
      {reactGuardReady ? (
        <span hidden data-mais-session-react-guard-ready="true" />
      ) : null}
      {displayedSessionVerificationMode === "identity" ? sessionVerificationGate : (
        <>
          <Fragment key={accountTreeKey}>{children}</Fragment>
          {displayedSessionVerificationMode === "foreground" ? sessionVerificationGate : null}
        </>
      )}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within AppProviders");
  }
  return context;
}

export { dictionary };
