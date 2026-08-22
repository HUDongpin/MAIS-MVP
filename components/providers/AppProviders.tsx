"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isValidGradeId } from "@/data/grades";
import { isImmersiveStudentPracticeGamePath } from "@/lib/gameBasedLearning";
import { dictionary, isValidLanguage, localeForLanguage, textForLanguage } from "@/lib/i18n";
import { curriculumProfileForTrack, curriculumTrackForProfile, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import { isStudentLessonPath, studentLessonsPath } from "@/lib/lessonLinks";
import { isLegacyRoadmapPath, isStudentRoadmapPath } from "@/lib/roadmapRoutes";
import {
  acknowledgeLearningAnalyticsOutbox,
  beginLearningAnalyticsClearFence,
  beginLearningAnalyticsGenerationHandshake,
  clearLearningAnalyticsOutbox,
  clearLearningAnalyticsDurabilityFallbackBeforeBoundary,
  coalesceLearningAnalyticsEvents,
  confirmLearningAnalyticsGenerationHandshake,
  createLearningAnalyticsEvent,
  finishLearningAnalyticsLowerGenerationRecovery,
  isDurableLearningAnalyticsDeliveryResponse,
  isHighFrequencyLearningAnalyticsEvent,
  isLearningAnalyticsClearAcknowledgement,
  learningAnalyticsClearFenceStorageKey,
  learningAnalyticsClientProtocolStatus,
  learningAnalyticsDurabilityLineageIsRecoverable,
  learningAnalyticsDeliveryPauseTransition,
  learningAnalyticsDeliveryGeneration,
  learningAnalyticsEventForDelivery,
  learningAnalyticsFlushRequestedEventName,
  learningAnalyticsGenerationHandshakeStorageKey,
  learningAnalyticsGenerationTransitionStorageKey,
  learningAnalyticsGenerationStorageKey,
  learningAnalyticsUpdatedEventName,
  learningAnalyticsWriterGateToken,
  markLearningAnalyticsClearDeleteAttempted,
  maxStoredLearningAnalyticsEvents,
  mergeDurableLearningAnalyticsEvents,
  mergeOrderedLearningAnalyticsEvents,
  mergeUnconfirmedLearningAnalyticsOutbox,
  persistLearningAnalyticsEventsForCurrentProtocol,
  persistLearningAnalyticsEventsWithDurabilityFallback,
  persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback,
  prepareLearningAnalyticsClearDeleteAfterMismatch,
  prepareLearningAnalyticsForwardGenerationTransition,
  readLearningAnalyticsClearFence,
  readLearningAnalyticsGeneration,
  readLearningAnalyticsGenerationMismatchReceipt,
  readLearningAnalyticsOutbox,
  readUnconfirmedLearningAnalyticsOutbox,
  recoverLearningAnalyticsDurabilityFallback,
  recoverLearningAnalyticsVolatileEvent,
  replaceLearningAnalyticsGeneration,
  resolveLearningAnalyticsClearHandshake,
  resumeLearningAnalyticsGenerationTransition,
  throttledLearningAnalyticsFlushMs,
  visualizationSessionOutboxRetryDelayMs,
  withRequiredLearningAnalyticsClearLock,
  withLearningAnalyticsDeliveryGeneration
} from "@/lib/learningAnalytics";
import { isVisualizationLabPath } from "@/lib/visualizationRoutes";
import {
  acknowledgeVisualizationSessionOutbox,
  isVisualizationSessionOutboxAcknowledgement,
  quarantineVisualizationSessionOutboxRecord,
  readVisualizationSessionOutbox,
  visualizationSessionOutboxDeliveryDisposition,
  visualizationSessionOutboxAcknowledgedEventName,
  visualizationSessionOutboxFailedEventName,
  visualizationSessionOutboxUpdatedEventName,
  type VisualizationSessionOutboxRecord
} from "@/lib/visualizationSessionOutbox";
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
  currentUser: StudentSession | null;
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
  recordLearningEvent: (
    event: LearningAnalyticsInput,
    options?: LearningAnalyticsRecordOptions
  ) => LearningAnalyticsRecordResult;
  clearLearningAnalytics: () => void;
  markMistakeMastered: (questionId: string) => void;
  removeMistake: (questionId: string) => void;
  clearMistakes: () => void;
  text: (value: LocalizedText) => string;
  t: (value: LocalizedText) => string;
};

export type LearningAnalyticsRecordOptions = {
  eventId?: string;
  eventTimestamp?: string;
};

export type LearningAnalyticsRecordResult =
  | "ignored"
  | "confirmed"
  | "unconfirmed"
  | "fallback"
  | "volatile";

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
  reason?: "duplicate" | "invalid" | "setup" | "error" | "requires-curriculum-track";
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

const sessionSyncStorageKey = "hk-math-session-sync";

type LearningAnalyticsIdentity = {
  userId: string | null;
  clientEpoch: number;
};

type LearningAnalyticsDeliveryFlight = LearningAnalyticsIdentity & {
  generation: number;
  token: number;
};

type LearningAnalyticsImmediateDrain = LearningAnalyticsIdentity & {
  eventIds: Set<string>;
};

function isCurrentLearningAnalyticsIdentity(
  current: LearningAnalyticsIdentity,
  expected: LearningAnalyticsIdentity
) {
  return current.userId === expected.userId && current.clientEpoch === expected.clientEpoch;
}

function isCanonicalLearningAnalyticsRecordOption(
  value: unknown,
  kind: "eventId" | "eventTimestamp"
) {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    return false;
  }
  if (kind === "eventId") return value.length <= 240;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

async function withLearningAnalyticsClearLock<T>(
  userId: string,
  task: () => Promise<T>
): Promise<T> {
  return withRequiredLearningAnalyticsClearLock(
    navigator.locks,
    userId,
    task
  );
}

function broadcastSessionChange(userId: string | null) {
  try {
    window.localStorage.setItem(sessionSyncStorageKey, JSON.stringify({ userId, at: Date.now() }));
  } catch {
    // Cross-tab session sync is best-effort only.
  }
}

const roleProtectedPathPrefixes = ["/teacher", "/parent", "/dashboard", "/progress", "/mistake-book", "/messages", "/assessment", "/resource"];

function isRoleProtectedPath(pathname: string) {
  return roleProtectedPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [selectedGrade, setSelectedGradeState] = useState<GradeId>("S3");
  const [currentUser, setCurrentUser] = useState<StudentSession | null>(null);
  const [lessonEntryTarget, setLessonEntryTarget] = useState<LessonEntryTarget | null>(null);
  const [mistakeRecords, setMistakeRecords] = useState<MistakeRecord[]>([]);
  const [learningAnalyticsEvents, setLearningAnalyticsEvents] = useState<LearningAnalyticsEvent[]>([]);
  const [pendingLearningEvents, setPendingLearningEvents] = useState<LearningAnalyticsEvent[]>([]);
  const [analyticsDeliveryCycle, setAnalyticsDeliveryCycle] = useState(0);
  const [analyticsGenerationHandshakeCycle, setAnalyticsGenerationHandshakeCycle] = useState(0);
  const [settingsReady, setSettingsReady] = useState(false);
  const analyticsFlushGenerationRef = useRef(0);
  const analyticsIdentityRef = useRef<LearningAnalyticsIdentity>({
    userId: null,
    clientEpoch: 0
  });
  const analyticsGenerationReadyIdentityRef = useRef<LearningAnalyticsIdentity>({
    userId: null,
    clientEpoch: -1
  });
  const analyticsServerGenerationRef = useRef(0);
  const analyticsDeliveryHandleRef = useRef<number | null>(null);
  const analyticsImmediateDeliveryRequestedRef = useRef<LearningAnalyticsImmediateDrain | null>(null);
  const analyticsDeliveryInFlightRef = useRef<LearningAnalyticsDeliveryFlight | null>(null);
  const analyticsDeliveryFlightSequenceRef = useRef(0);
  const analyticsGenerationHandshakeSequenceRef = useRef(0);
  const analyticsClearRequestSequenceRef = useRef(0);
  const analyticsDirectClearInFlightRef = useRef<{
    userId: string;
    requestId: string;
  } | null>(null);
  const analyticsDeliveryPausedRef = useRef(false);
  const pendingLearningEventsRef = useRef<LearningAnalyticsEvent[]>([]);
  const highFrequencyLearningEventsRef = useRef<LearningAnalyticsEvent[]>([]);
  const analyticsAwaitingDurabilityRef = useRef<Array<{
    boundaryToken: string | null;
    event: LearningAnalyticsEvent;
    generation: number;
    userId: string;
  }>>([]);
  const highFrequencyFlushHandleRef = useRef<number | null>(null);
  const pageVisitScopeRef = useRef({ key: "", sequence: 0 });
  const recordedPageViewTokenRef = useRef<string | null>(null);
  const finalizeVisibleAnalyticsRef = useRef<(() => void) | null>(null);
  const resumeVisibleAnalyticsRef = useRef<(() => void) | null>(null);
  const currentUserRef = useRef<StudentSession | null>(null);
  const lessonEntryRequestKeyRef = useRef<string | null>(null);
  const persistedSettingsKeyRef = useRef<string | null>(null);
  const skipGlobalStudentWarmups = currentUser?.role === "student" && isFirstPaintSensitiveStudentPath(pathname);
  const studentLessonHref = currentUser?.role === "student"
    ? lessonEntryTargetForGrade(lessonEntryTarget, selectedGrade)?.href ?? null
    : null;
  const clearHighFrequencyFlushHandle = useCallback(() => {
    if (highFrequencyFlushHandleRef.current === null) return;
    window.clearTimeout(highFrequencyFlushHandleRef.current);
    highFrequencyFlushHandleRef.current = null;
  }, []);
  const clearAnalyticsDeliveryHandle = useCallback(() => {
    if (analyticsDeliveryHandleRef.current === null) return;
    window.clearTimeout(analyticsDeliveryHandleRef.current);
    analyticsDeliveryHandleRef.current = null;
  }, []);
  const setLearningAnalyticsDeliveryPaused = useCallback((nextPaused: boolean) => {
    const transition = learningAnalyticsDeliveryPauseTransition(
      analyticsDeliveryPausedRef.current,
      nextPaused
    );
    analyticsDeliveryPausedRef.current = transition.paused;
    if (transition.wakeVisualizationSessions) {
      window.dispatchEvent(new Event(visualizationSessionOutboxUpdatedEventName));
    }
  }, []);
  const invalidateLearningAnalyticsGenerationReadiness = useCallback(() => {
    analyticsGenerationReadyIdentityRef.current = {
      userId: null,
      clientEpoch: -1
    };
  }, []);
  const requestLearningAnalyticsGenerationHandshake = useCallback(() => {
    setAnalyticsGenerationHandshakeCycle((current) => current + 1);
  }, []);
  const analyticsOutboxUserId = currentUser?.role === "student" ? currentUser.id : null;
  const analyticsOwnerIdentity: LearningAnalyticsIdentity = {
    userId: analyticsOutboxUserId,
    clientEpoch: analyticsIdentityRef.current.clientEpoch
  };
  const analyticsOwnerServerGeneration = analyticsServerGenerationRef.current;
  const pageVisitKey = `${currentUser?.id ?? "guest"}\u001f${pathname}`;
  if (pageVisitScopeRef.current.key !== pageVisitKey) {
    pageVisitScopeRef.current = {
      key: pageVisitKey,
      sequence: pageVisitScopeRef.current.sequence + 1
    };
  }
  const pageVisitToken = `${pageVisitKey}\u001f${pageVisitScopeRef.current.sequence}`;
  const appendLearningEventsToQueues = useCallback((
    events: LearningAnalyticsEvent[],
    ownerIdentity: LearningAnalyticsIdentity = analyticsOwnerIdentity
  ): LearningAnalyticsRecordResult => {
    if (events.length === 0) return "ignored";
    const coalescedEvents = coalesceLearningAnalyticsEvents(events);
    let persistedAs: Exclude<LearningAnalyticsRecordResult, "ignored"> = "confirmed";

    if (ownerIdentity.userId) {
      const ownerGeneration = analyticsIdentityRef.current.userId === ownerIdentity.userId
        ? analyticsServerGenerationRef.current
        : learningAnalyticsDeliveryGeneration(coalescedEvents[0]);
      try {
        persistedAs = persistLearningAnalyticsEventsWithDurabilityFallback(
          window.localStorage,
          window.sessionStorage,
          ownerIdentity.userId,
          coalescedEvents,
          ownerGeneration
        );
      } catch {
        // Neither primary nor refresh-durable fallback storage accepted the
        // row. Retain an explicit in-memory retry, and never authorize network
        // delivery from this state.
        const otherUsers = analyticsAwaitingDurabilityRef.current.filter(
          ({ userId }) => userId !== ownerIdentity.userId
        );
        const thisUser = mergeDurableLearningAnalyticsEvents(
          analyticsAwaitingDurabilityRef.current
            .filter(({ userId }) => userId === ownerIdentity.userId)
            .map(({ event }) => event),
          coalescedEvents
        ).map((event) => ({
          boundaryToken: learningAnalyticsWriterGateToken(
            window.localStorage,
            ownerIdentity.userId!
          ),
          event,
          generation: ownerGeneration,
          userId: ownerIdentity.userId!
        }));
        analyticsAwaitingDurabilityRef.current = [...otherUsers, ...thisUser];
        persistedAs = "volatile";
      }
    }

    // A stale route or identity effect may finish after another user becomes
    // active. Its captured owner's durable outbox is still safe, but it must
    // never repopulate the new user's in-memory delivery queue.
    if (!isCurrentLearningAnalyticsIdentity(analyticsIdentityRef.current, ownerIdentity)) {
      return persistedAs;
    }

    setLearningAnalyticsEvents((current) => {
      if (!isCurrentLearningAnalyticsIdentity(analyticsIdentityRef.current, ownerIdentity)) return current;
      return mergeOrderedLearningAnalyticsEvents(current, coalescedEvents);
    });
    if (persistedAs !== "confirmed") return persistedAs;
    setPendingLearningEvents((current) => {
      if (!isCurrentLearningAnalyticsIdentity(analyticsIdentityRef.current, ownerIdentity)) return current;
      const nextEvents = mergeDurableLearningAnalyticsEvents(current, coalescedEvents);
      pendingLearningEventsRef.current = nextEvents;
      return nextEvents;
    });
    return persistedAs;
  }, [analyticsOutboxUserId, analyticsOwnerIdentity.clientEpoch]);
  const takeBufferedHighFrequencyLearningEvents = useCallback(() => {
    clearHighFrequencyFlushHandle();
    if (highFrequencyLearningEventsRef.current.length === 0) return [];

    const events = coalesceLearningAnalyticsEvents(highFrequencyLearningEventsRef.current).slice(-maxStoredLearningAnalyticsEvents);
    highFrequencyLearningEventsRef.current = [];
    return events;
  }, [clearHighFrequencyFlushHandle]);
  const flushBufferedHighFrequencyLearningEvents = useCallback(() => {
    const events = takeBufferedHighFrequencyLearningEvents();
    appendLearningEventsToQueues(events, analyticsIdentityRef.current);
    return events;
  }, [appendLearningEventsToQueues, takeBufferedHighFrequencyLearningEvents]);
  const scheduleHighFrequencyLearningEventFlush = useCallback(() => {
    if (highFrequencyFlushHandleRef.current !== null) return;

    highFrequencyFlushHandleRef.current = window.setTimeout(() => {
      highFrequencyFlushHandleRef.current = null;
      flushBufferedHighFrequencyLearningEvents();
    }, throttledLearningAnalyticsFlushMs);
  }, [flushBufferedHighFrequencyLearningEvents]);
  const recordLearningEvent = useCallback((
    event: LearningAnalyticsInput,
    options: LearningAnalyticsRecordOptions = {}
  ): LearningAnalyticsRecordResult => {
    if (
      !settingsReady ||
      !currentUser ||
      currentUser.role !== "student" ||
      !analyticsOwnerIdentity.userId
    ) return "ignored";

    const hasEventId = typeof options.eventId !== "undefined";
    const hasEventTimestamp = typeof options.eventTimestamp !== "undefined";
    if (
      hasEventId !== hasEventTimestamp ||
      (typeof options.eventId !== "undefined" &&
        !isCanonicalLearningAnalyticsRecordOption(options.eventId, "eventId")) ||
      (typeof options.eventTimestamp !== "undefined" &&
        !isCanonicalLearningAnalyticsRecordOption(
          options.eventTimestamp,
          "eventTimestamp"
        ))
    ) return "ignored";

    const currentIdentity = analyticsIdentityRef.current;
    const recordingIdentity = currentIdentity.userId === analyticsOwnerIdentity.userId
      ? currentIdentity
      : analyticsOwnerIdentity;
    const recordingUserId = recordingIdentity.userId;
    if (!recordingUserId) return "ignored";
    const recordingServerGeneration = currentIdentity.userId === analyticsOwnerIdentity.userId
      ? analyticsServerGenerationRef.current
      : analyticsOwnerServerGeneration;
    const generatedEvent = createLearningAnalyticsEvent(event, selectedGrade);
    const createdEvent: LearningAnalyticsEvent = {
      ...generatedEvent,
      ...(options.eventId ? { id: options.eventId } : {}),
      ...(options.eventTimestamp ? { timestamp: options.eventTimestamp } : {})
    };
    const protocolStatus = learningAnalyticsClientProtocolStatus(
      window.localStorage,
      recordingUserId
    );
    const generationIsConfirmed = isCurrentLearningAnalyticsIdentity(
      analyticsGenerationReadyIdentityRef.current,
      recordingIdentity
    ) && protocolStatus === "open";
    if (!generationIsConfirmed) {
      // A fresh or stale browser may not yet know that another device cleared
      // analytics and advanced the server generation. Keep events in a
      // separate exact-user durable area until an empty-batch handshake
      // confirms which generation owns them. They can then be rebased without
      // reviving any already-confirmed pre-clear rows.
      let persistedAs: "unconfirmed" | "fallback" | "volatile" = "fallback";
      try {
        persistedAs = persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback(
          window.localStorage,
          window.sessionStorage,
          recordingUserId,
          [createdEvent],
          recordingServerGeneration
        );
      } catch {
        analyticsAwaitingDurabilityRef.current.push({
          boundaryToken: learningAnalyticsWriterGateToken(
            window.localStorage,
            recordingUserId
          ),
          event: createdEvent,
          generation: recordingServerGeneration,
          userId: recordingUserId
        });
        persistedAs = "volatile";
      }
      if (isCurrentLearningAnalyticsIdentity(currentIdentity, recordingIdentity)) {
        setLearningAnalyticsEvents((current) =>
          mergeOrderedLearningAnalyticsEvents(current, [createdEvent])
        );
      }
      return persistedAs;
    }
    const analyticsEvent = withLearningAnalyticsDeliveryGeneration(
      createdEvent,
      recordingServerGeneration
    );
    if (!isCurrentLearningAnalyticsIdentity(currentIdentity, recordingIdentity)) {
      return appendLearningEventsToQueues([analyticsEvent], recordingIdentity);
    }
    if (isHighFrequencyLearningAnalyticsEvent(analyticsEvent)) {
      // Persist the sample synchronously before the one-second coalescing
      // window. A crash or immediate navigation may cancel the timer, but it
      // must not erase the newest student interaction. The later merge removes
      // the obsolete high-frequency key when a newer sample supersedes it.
      try {
        const persistedAs = persistLearningAnalyticsEventsWithDurabilityFallback(
          window.localStorage,
          window.sessionStorage,
          recordingUserId,
          [analyticsEvent],
          recordingServerGeneration
        );
        if (persistedAs !== "confirmed") {
          if (isCurrentLearningAnalyticsIdentity(currentIdentity, recordingIdentity)) {
            setLearningAnalyticsEvents((current) =>
              mergeOrderedLearningAnalyticsEvents(current, [createdEvent])
            );
          }
          return persistedAs;
        }
      } catch {
        analyticsAwaitingDurabilityRef.current.push({
          boundaryToken: learningAnalyticsWriterGateToken(
            window.localStorage,
            recordingUserId
          ),
          event: createdEvent,
          generation: recordingServerGeneration,
          userId: recordingUserId
        });
        return "volatile";
      }
      highFrequencyLearningEventsRef.current = coalesceLearningAnalyticsEvents([
        ...highFrequencyLearningEventsRef.current,
        analyticsEvent
      ]);
      scheduleHighFrequencyLearningEventFlush();
      return "confirmed";
    }

    return appendLearningEventsToQueues([analyticsEvent], recordingIdentity);
  }, [analyticsOwnerIdentity.clientEpoch, analyticsOwnerIdentity.userId, analyticsOwnerServerGeneration, appendLearningEventsToQueues, currentUser?.role, scheduleHighFrequencyLearningEventFlush, selectedGrade, settingsReady]);
  const refreshMistakeRecords = useCallback(async () => {
    if (!currentUser) {
      setMistakeRecords([]);
      return;
    }

    try {
      const response = await fetch("/api/mistakes", { cache: "no-store" });
      if (!response.ok) return;
      setMistakeRecords(readMistakeRecords(await response.json()));
    } catch {
      // Keep the last known mistake records if the request fails.
    }
  }, [currentUser?.id]);
  const refreshLessonEntryTarget = useCallback(async (grade?: GradeId) => {
    if (!currentUser || currentUser.role !== "student") {
      lessonEntryRequestKeyRef.current = null;
      setLessonEntryTarget(null);
      return;
    }

    const targetGrade = grade ?? selectedGrade;
    const requestKey = `${currentUser.id}:${targetGrade}`;
    if (lessonEntryRequestKeyRef.current === requestKey) return;
    lessonEntryRequestKeyRef.current = requestKey;

    try {
      const response = await fetch(`/api/lesson-entry?grade=${encodeURIComponent(targetGrade)}`, { cache: "no-store" });
      const body = (await response.json()) as { lessonEntryTarget?: unknown };
      const nextTarget = readLessonEntryTarget(body.lessonEntryTarget);
      if (!response.ok || !nextTarget) throw new Error("Lesson entry target unavailable.");
      storeLessonEntryTarget(currentUser.id, nextTarget);
      setLessonEntryTarget(nextTarget);
    } catch {
      setLessonEntryTarget(readStoredLessonEntryTarget(currentUser.id, targetGrade));
    } finally {
      if (lessonEntryRequestKeyRef.current === requestKey) {
        lessonEntryRequestKeyRef.current = null;
      }
    }
  }, [currentUser, selectedGrade]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      const savedLanguage = window.localStorage.getItem("hk-math-language") as Language | null;
      const savedTheme = window.localStorage.getItem("hk-math-theme") as ThemeMode | null;
      const savedGrade = window.localStorage.getItem("hk-math-grade") as GradeId | null;
      if (isValidLanguage(savedLanguage)) setLanguage(savedLanguage);
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      if (isGrade(savedGrade)) {
        setSelectedGradeState(savedGrade);
      }
      window.localStorage.removeItem("hk-math-user");
      window.localStorage.removeItem("hk-math-mistakes");

      try {
        const response = await fetch("/api/auth/session-state?includeLessonEntry=false", { cache: "no-store" });
        if (response.ok) {
          const session = readAuthSession(await response.json());
          if (session && !cancelled) {
            const sessionSelectedGrade = session.settings.selectedGrade;
            const storedLessonEntryTarget = session.user.role === "student"
              ? readStoredLessonEntryTarget(session.user.id, sessionSelectedGrade)
              : null;
            const sessionLessonEntryTarget = session.user.role === "student"
              ? lessonEntryTargetForGrade(session.lessonEntryTarget, sessionSelectedGrade) ?? storedLessonEntryTarget
              : null;
            analyticsServerGenerationRef.current = session.user.role === "student"
              ? readLearningAnalyticsGeneration(window.localStorage, session.user.id)
              : 0;
            analyticsFlushGenerationRef.current += 1;
            analyticsIdentityRef.current = {
              userId: session.user.role === "student" ? session.user.id : null,
              clientEpoch: analyticsFlushGenerationRef.current
            };
            currentUserRef.current = session.user;
            setCurrentUser(session.user);
            setLessonEntryTarget(sessionLessonEntryTarget);
            setLanguage(session.settings.language);
            setTheme(session.settings.theme);
            setSelectedGradeState(sessionSelectedGrade);
            if (session.lessonEntryTarget) {
              storeLessonEntryTarget(session.user.id, session.lessonEntryTarget);
            }
            persistedSettingsKeyRef.current = persistedSettingsKey(
              session.user.id,
              session.settings.language,
              session.settings.theme,
              session.settings.selectedGrade
            );
          }
        }
      } catch {
        // Guests keep using local settings if the session check is unavailable.
      }

      if (!cancelled) {
        setSettingsReady(true);
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

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
      window.localStorage.removeItem("hk-math-theme");
      window.localStorage.removeItem("hk-math-language");
      window.localStorage.removeItem("hk-math-grade");
      window.localStorage.removeItem("hk-math-user");
      const nextSettingsKey = persistedSettingsKey(currentUser.id, language, theme, selectedGrade);
      if (persistedSettingsKeyRef.current !== nextSettingsKey) {
        persistedSettingsKeyRef.current = nextSettingsKey;
        void fetch("/api/me/settings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ language, theme, selectedGrade })
        }).catch(() => {
          if (persistedSettingsKeyRef.current === nextSettingsKey) {
            persistedSettingsKeyRef.current = null;
          }
        });
      }
    } else {
      persistedSettingsKeyRef.current = null;
      window.localStorage.setItem("hk-math-theme", theme);
      window.localStorage.setItem("hk-math-language", language);
      window.localStorage.setItem("hk-math-grade", selectedGrade);
      window.localStorage.removeItem("hk-math-user");
    }

    return () => titleHandles.forEach((handle) => window.clearTimeout(handle));
  }, [pathname, theme, language, selectedGrade, currentUser?.id, settingsReady]);

  useEffect(() => {
    if (!settingsReady || skipGlobalStudentWarmups) return;
    void refreshMistakeRecords();
  }, [refreshMistakeRecords, settingsReady, skipGlobalStudentWarmups]);

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
    if (storedTarget) setLessonEntryTarget(storedTarget);
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
    pendingLearningEventsRef.current = pendingLearningEvents;
  }, [pendingLearningEvents]);

  const recoverLearningAnalyticsDurability = useCallback(() => {
    if (
      !settingsReady ||
      !analyticsOutboxUserId ||
      !isCurrentLearningAnalyticsIdentity(
        analyticsGenerationReadyIdentityRef.current,
        analyticsIdentityRef.current
      ) ||
      learningAnalyticsClientProtocolStatus(
        window.localStorage,
        analyticsOutboxUserId
      ) !== "open"
    ) return false;

    const retainedInMemory: typeof analyticsAwaitingDurabilityRef.current = [];
    let recoveredAny = false;
    for (const pending of analyticsAwaitingDurabilityRef.current) {
      if (pending.userId !== analyticsOutboxUserId) {
        retainedInMemory.push(pending);
        continue;
      }
      if (!learningAnalyticsDurabilityLineageIsRecoverable(
        window.localStorage,
        pending.userId,
        pending.generation,
        pending.boundaryToken,
        analyticsServerGenerationRef.current
      )) {
        // A peer tab advanced the shared generation. This private volatile row
        // predates that boundary and must not be rebased into the new history.
        continue;
      }
      const outcome = recoverLearningAnalyticsVolatileEvent(
        window.localStorage,
        pending.userId,
        pending.event,
        pending.generation,
        pending.boundaryToken,
        analyticsServerGenerationRef.current
      );
      if (outcome === "recovered") {
        recoveredAny = true;
      } else if (outcome === "deferred") {
        retainedInMemory.push(pending);
      }
    }
    analyticsAwaitingDurabilityRef.current = retainedInMemory;
    const fallbackRecovery = recoverLearningAnalyticsDurabilityFallback(
      window.localStorage,
      window.sessionStorage,
      analyticsOutboxUserId,
      analyticsServerGenerationRef.current
    );
    recoveredAny ||= fallbackRecovery.recovered.length > 0;
    if (recoveredAny) {
      setAnalyticsDeliveryCycle((current) => current + 1);
    }
    return recoveredAny;
  }, [analyticsOutboxUserId, settingsReady]);

  const reconcileLearningAnalyticsBoundaryDurability = useCallback((
    userId: string,
    allowedBoundaryTokens: readonly string[]
  ) => {
    const clearedFallback = clearLearningAnalyticsDurabilityFallbackBeforeBoundary(
      window.sessionStorage,
      userId,
      allowedBoundaryTokens
    );
    if (clearedFallback === "unavailable") return false;
    const recoveredFallback = recoverLearningAnalyticsDurabilityFallback(
      window.localStorage,
      window.sessionStorage,
      userId,
      analyticsServerGenerationRef.current
    );
    if (recoveredFallback.remaining.length > 0) return false;

    const allowed = new Set(allowedBoundaryTokens);
    const retained: typeof analyticsAwaitingDurabilityRef.current = [];
    let allPreservedRowsAreDurable = true;
    for (const pending of analyticsAwaitingDurabilityRef.current) {
      if (pending.userId !== userId) {
        retained.push(pending);
        continue;
      }
      if (!pending.boundaryToken || !allowed.has(pending.boundaryToken)) {
        // This exact-user row predates the clear boundary and is intentionally
        // discarded with the user's clear request.
        continue;
      }
      try {
        persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback(
          window.localStorage,
          window.sessionStorage,
          userId,
          [pending.event],
          pending.generation
        );
      } catch {
        retained.push(pending);
        allPreservedRowsAreDurable = false;
      }
    }
    analyticsAwaitingDurabilityRef.current = retained;
    return allPreservedRowsAreDurable;
  }, []);

  const restoreLearningAnalyticsOutbox = useCallback(() => {
    if (!settingsReady || !analyticsOutboxUserId) return;
    recoverLearningAnalyticsDurability();
    const durableEvents = readLearningAnalyticsOutbox(
      window.localStorage,
      analyticsOutboxUserId,
      analyticsServerGenerationRef.current
    );
    appendLearningEventsToQueues(durableEvents, {
      userId: analyticsOutboxUserId,
      clientEpoch: analyticsIdentityRef.current.clientEpoch
    });
  }, [analyticsOutboxUserId, appendLearningEventsToQueues, recoverLearningAnalyticsDurability, settingsReady]);

  useEffect(() => {
    const resumeIfProtocolOpen = () => {
      if (
        !analyticsOutboxUserId ||
        learningAnalyticsClientProtocolStatus(
          window.localStorage,
          analyticsOutboxUserId
        ) !== "open"
      ) {
        analyticsDeliveryPausedRef.current = true;
        invalidateLearningAnalyticsGenerationReadiness();
        requestLearningAnalyticsGenerationHandshake();
        return;
      }
      setLearningAnalyticsDeliveryPaused(false);
      restoreLearningAnalyticsOutbox();
    };
    resumeIfProtocolOpen();
    const handlePageShow = () => {
      resumeVisibleAnalyticsRef.current?.();
      resumeIfProtocolOpen();
    };
    const handleOnline = () => resumeIfProtocolOpen();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") resumeIfProtocolOpen();
    };
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [analyticsOutboxUserId, invalidateLearningAnalyticsGenerationReadiness, requestLearningAnalyticsGenerationHandshake, restoreLearningAnalyticsOutbox, setLearningAnalyticsDeliveryPaused]);

  const persistLearningAnalyticsOnPageExit = useCallback(() => {
    if (
      !settingsReady ||
      !analyticsOwnerIdentity.userId ||
      !isCurrentLearningAnalyticsIdentity(analyticsIdentityRef.current, analyticsOwnerIdentity)
    ) return;

    const bufferedEvents = takeBufferedHighFrequencyLearningEvents();
    const events = mergeDurableLearningAnalyticsEvents(
      [],
      [
        ...pendingLearningEventsRef.current,
        ...bufferedEvents
      ]
    );
    if (events.length === 0) return;

    try {
      if (isCurrentLearningAnalyticsIdentity(
        analyticsGenerationReadyIdentityRef.current,
        analyticsOwnerIdentity
      )) {
        persistLearningAnalyticsEventsWithDurabilityFallback(
          window.localStorage,
          window.sessionStorage,
          analyticsOwnerIdentity.userId,
          events,
          analyticsServerGenerationRef.current
        );
      } else {
        persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback(
          window.localStorage,
          window.sessionStorage,
          analyticsOwnerIdentity.userId,
          events.map(learningAnalyticsEventForDelivery),
          analyticsServerGenerationRef.current
        );
      }
    } catch {
      // Local storage is best-effort; the in-memory queue remains untouched.
    }
  }, [
    analyticsOwnerIdentity.clientEpoch,
    analyticsOwnerIdentity.userId,
    settingsReady,
    takeBufferedHighFrequencyLearningEvents
  ]);

  const pauseLearningAnalyticsDelivery = useCallback(() => {
    analyticsDeliveryPausedRef.current = true;
    analyticsImmediateDeliveryRequestedRef.current = null;
    clearAnalyticsDeliveryHandle();
    persistLearningAnalyticsOnPageExit();
  }, [clearAnalyticsDeliveryHandle, persistLearningAnalyticsOnPageExit]);

  const freezeLearningAnalyticsIdentity = useCallback(() => {
    finalizeVisibleAnalyticsRef.current?.();
    const frozenIdentity = analyticsIdentityRef.current;
    const generationWasReady = isCurrentLearningAnalyticsIdentity(
      analyticsGenerationReadyIdentityRef.current,
      frozenIdentity
    );
    analyticsFlushGenerationRef.current += 1;
    analyticsIdentityRef.current = {
      userId: frozenIdentity.userId,
      clientEpoch: analyticsFlushGenerationRef.current
    };
    invalidateLearningAnalyticsGenerationReadiness();
    analyticsDeliveryFlightSequenceRef.current += 1;
    analyticsDeliveryInFlightRef.current = null;
    analyticsGenerationHandshakeSequenceRef.current += 1;
    analyticsDeliveryPausedRef.current = true;
    analyticsImmediateDeliveryRequestedRef.current = null;
    clearAnalyticsDeliveryHandle();
    clearHighFrequencyFlushHandle();

    const bufferedEvents = takeBufferedHighFrequencyLearningEvents();
    if (frozenIdentity.userId) {
      const durableEvents = mergeDurableLearningAnalyticsEvents(
        pendingLearningEventsRef.current,
        bufferedEvents
      );
      try {
        if (generationWasReady) {
          persistLearningAnalyticsEventsWithDurabilityFallback(
            window.localStorage,
            window.sessionStorage,
            frozenIdentity.userId,
            durableEvents,
            analyticsServerGenerationRef.current
          );
        } else {
          persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback(
            window.localStorage,
            window.sessionStorage,
            frozenIdentity.userId,
            durableEvents.map(learningAnalyticsEventForDelivery),
            analyticsServerGenerationRef.current
          );
        }
      } catch {
        const token = learningAnalyticsWriterGateToken(
          window.localStorage,
          frozenIdentity.userId
        );
        analyticsAwaitingDurabilityRef.current.push(
          ...durableEvents.map((event) => ({
            boundaryToken: token,
            event,
            generation: analyticsServerGenerationRef.current,
            userId: frozenIdentity.userId!
          }))
        );
      }
    }

    pendingLearningEventsRef.current = [];
    highFrequencyLearningEventsRef.current = [];
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
  }, [
    clearAnalyticsDeliveryHandle,
    clearHighFrequencyFlushHandle,
    invalidateLearningAnalyticsGenerationReadiness,
    takeBufferedHighFrequencyLearningEvents
  ]);

  const resumeLearningAnalyticsDelivery = useCallback(() => {
    resumeVisibleAnalyticsRef.current?.();
    const resumeUser = currentUserRef.current;
    if (resumeUser?.role !== "student") {
      setLearningAnalyticsDeliveryPaused(false);
      return;
    }
    if (
      learningAnalyticsClientProtocolStatus(
        window.localStorage,
        resumeUser.id
      ) !== "open"
    ) {
      analyticsDeliveryPausedRef.current = true;
      invalidateLearningAnalyticsGenerationReadiness();
      requestLearningAnalyticsGenerationHandshake();
      return;
    }
    setLearningAnalyticsDeliveryPaused(false);
    restoreLearningAnalyticsOutbox();
    requestLearningAnalyticsGenerationHandshake();
  }, [invalidateLearningAnalyticsGenerationReadiness, requestLearningAnalyticsGenerationHandshake, restoreLearningAnalyticsOutbox, setLearningAnalyticsDeliveryPaused]);

  const activateLearningAnalyticsGeneration = useCallback((
    userId: string,
    generation: number
  ) => {
    if (
      analyticsIdentityRef.current.userId !== userId ||
      !Number.isSafeInteger(generation) ||
      generation < 0 ||
      learningAnalyticsClientProtocolStatus(window.localStorage, userId) !== "open"
    ) return false;
    const storedGeneration = replaceLearningAnalyticsGeneration(
      window.localStorage,
      userId,
      generation
    );
    analyticsServerGenerationRef.current = storedGeneration;
    const adoptedIdentity = analyticsIdentityRef.current;
    analyticsGenerationReadyIdentityRef.current = adoptedIdentity;
    setLearningAnalyticsDeliveryPaused(false);
    resumeVisibleAnalyticsRef.current?.();
    appendLearningEventsToQueues(
      readLearningAnalyticsOutbox(window.localStorage, userId, storedGeneration),
      adoptedIdentity
    );
    setAnalyticsDeliveryCycle((current) => current + 1);
    return true;
  }, [appendLearningEventsToQueues, setLearningAnalyticsDeliveryPaused]);

  const adoptLearningAnalyticsForwardGeneration = useCallback((
    userId: string,
    generation: number,
    clearedAt: string,
    transitionId: string
  ) => {
    const fromGeneration = analyticsServerGenerationRef.current;
    if (
      analyticsIdentityRef.current.userId !== userId ||
      !Number.isSafeInteger(generation) ||
      generation <= fromGeneration
    ) return false;
    try {
      const activeFence = readLearningAnalyticsClearFence(
        window.localStorage,
        userId
      );
      if (activeFence.status === "corrupt") return false;
      const preTransitionTokens = activeFence.status === "valid"
        ? [activeFence.value.requestId]
        : [];
      if (!reconcileLearningAnalyticsBoundaryDurability(
        userId,
        preTransitionTokens
      )) return false;
      // Install the exact-ID causal boundary before finalizing page duration
      // or draining memory. Those newly created IDs are then synchronously
      // diverted to the transition's unconfirmed, post-marker side.
      prepareLearningAnalyticsForwardGenerationTransition(
        window.localStorage,
        userId,
        fromGeneration,
        generation,
        clearedAt,
        transitionId
      );
      freezeLearningAnalyticsIdentity();
      const outcome = resumeLearningAnalyticsGenerationTransition(
        window.localStorage,
        userId
      );
      if (outcome !== "completed") return false;
      return activateLearningAnalyticsGeneration(userId, generation);
    } catch {
      return false;
    }
  }, [activateLearningAnalyticsGeneration, freezeLearningAnalyticsIdentity, reconcileLearningAnalyticsBoundaryDurability]);

  const adoptLearningAnalyticsLowerGeneration = useCallback((
    userId: string,
    generation: number,
    handshakeRequestId: string,
    transitionId: string
  ) => {
    const fromGeneration = analyticsServerGenerationRef.current;
    if (
      analyticsIdentityRef.current.userId !== userId ||
      !Number.isSafeInteger(generation) ||
      generation < 0 ||
      generation >= fromGeneration
    ) return false;
    // Finalize while the empty handshake still holds generation readiness.
    // The resulting event enters the unconfirmed area and is therefore one of
    // the only rows the lower-generation recovery is allowed to preserve.
    freezeLearningAnalyticsIdentity();
    try {
      if (!reconcileLearningAnalyticsBoundaryDurability(
        userId,
        [handshakeRequestId]
      )) return false;
      const outcome = finishLearningAnalyticsLowerGenerationRecovery(
        window.localStorage,
        userId,
        fromGeneration,
        generation,
        handshakeRequestId,
        new Date().toISOString(),
        transitionId
      );
      if (outcome !== "completed") return false;
      return activateLearningAnalyticsGeneration(userId, generation);
    } catch {
      return false;
    }
  }, [activateLearningAnalyticsGeneration, freezeLearningAnalyticsIdentity, reconcileLearningAnalyticsBoundaryDurability]);

  useEffect(() => {
    if (!settingsReady || currentUser?.role !== "student") return;
    const generationKey = learningAnalyticsGenerationStorageKey(currentUser.id);
    const clearFenceKey = learningAnalyticsClearFenceStorageKey(currentUser.id);
    const handshakeKey = learningAnalyticsGenerationHandshakeStorageKey(
      currentUser.id
    );
    const transitionKey = learningAnalyticsGenerationTransitionStorageKey(currentUser.id);
    const handleGenerationChange = (event: StorageEvent) => {
      if (
        event.key !== generationKey &&
        event.key !== clearFenceKey &&
        event.key !== handshakeKey &&
        event.key !== transitionKey
      ) return;
      if (
        event.newValue !== null &&
        (
          event.key === clearFenceKey ||
          event.key === handshakeKey ||
          event.key === transitionKey
        )
      ) {
        freezeLearningAnalyticsIdentity();
      } else {
        invalidateLearningAnalyticsGenerationReadiness();
        analyticsDeliveryPausedRef.current = true;
        clearAnalyticsDeliveryHandle();
        analyticsDeliveryFlightSequenceRef.current += 1;
        analyticsDeliveryInFlightRef.current = null;
        analyticsGenerationHandshakeSequenceRef.current += 1;
      }
      requestLearningAnalyticsGenerationHandshake();
    };
    window.addEventListener("storage", handleGenerationChange);
    return () => window.removeEventListener("storage", handleGenerationChange);
  }, [clearAnalyticsDeliveryHandle, currentUser?.id, currentUser?.role, freezeLearningAnalyticsIdentity, invalidateLearningAnalyticsGenerationReadiness, requestLearningAnalyticsGenerationHandshake, settingsReady]);

  useEffect(() => {
    if (!settingsReady || currentUser?.role !== "student") return;

    const handshakeUserId = currentUser.id;
    const handshakeIdentity = analyticsIdentityRef.current;
    if (
      handshakeIdentity.userId !== handshakeUserId ||
      (isCurrentLearningAnalyticsIdentity(
        analyticsGenerationReadyIdentityRef.current,
        handshakeIdentity
      ) && learningAnalyticsClientProtocolStatus(
        window.localStorage,
        handshakeUserId
      ) === "open")
    ) return;

    let cancelled = false;
    let inFlight = false;
    let retryAttempt = 0;
    let retryHandle: number | null = null;

    const clearRetryHandle = () => {
      if (retryHandle === null) return;
      window.clearTimeout(retryHandle);
      retryHandle = null;
    };
    const scheduleHandshake = (delayMs: number) => {
      if (cancelled || retryHandle !== null) return;
      retryHandle = window.setTimeout(() => {
        retryHandle = null;
        void runHandshake();
      }, delayMs);
    };
    const retryLater = () => {
      retryAttempt += 1;
      scheduleHandshake(Math.min(8_000, 1_000 * (2 ** Math.min(3, retryAttempt - 1))));
    };
    const runHandshake = async (clearLockHeld = false) => {
      if (
        cancelled ||
        inFlight ||
        !isCurrentLearningAnalyticsIdentity(analyticsIdentityRef.current, handshakeIdentity) ||
        document.visibilityState === "hidden" ||
        navigator.onLine === false
      ) return;

      const fenceBeforeLock = readLearningAnalyticsClearFence(
        window.localStorage,
        handshakeUserId
      );
      if (!clearLockHeld) {
        const directClear = analyticsDirectClearInFlightRef.current;
        if (
          fenceBeforeLock.status === "valid" &&
          directClear?.userId === handshakeUserId &&
          directClear.requestId === fenceBeforeLock.value.requestId
        ) return;
        inFlight = true;
        try {
          await withLearningAnalyticsClearLock(handshakeUserId, async () => {
            inFlight = false;
            await runHandshake(true);
          });
        } catch {
          if (!cancelled) retryLater();
        } finally {
          inFlight = false;
        }
        return;
      }

      const resumedTransition = resumeLearningAnalyticsGenerationTransition(
        window.localStorage,
        handshakeUserId
      );
      if (resumedTransition === "corrupt") return;
      if (resumedTransition === "unavailable") {
        retryLater();
        return;
      }
      if (resumedTransition === "completed") {
        analyticsServerGenerationRef.current = readLearningAnalyticsGeneration(
          window.localStorage,
          handshakeUserId
        );
      }

      const protocolStatus = learningAnalyticsClientProtocolStatus(
        window.localStorage,
        handshakeUserId
      );
      if (protocolStatus === "corrupt" || protocolStatus === "transitioning") return;
      const clearFenceState = readLearningAnalyticsClearFence(
        window.localStorage,
        handshakeUserId
      );
      if (clearFenceState.status === "corrupt") return;
      const clearFence = clearFenceState.status === "valid"
        ? clearFenceState.value
        : null;
      const tentativeGeneration = clearFence?.baseGeneration ?? analyticsServerGenerationRef.current;
      const handshakeSequence = analyticsGenerationHandshakeSequenceRef.current + 1;
      analyticsGenerationHandshakeSequenceRef.current = handshakeSequence;
      const handshakeRequestId = `handshake-${handshakeIdentity.clientEpoch}-${handshakeSequence}-${Date.now()}`;
      inFlight = true;
      try {
        const handshakeSnapshot = beginLearningAnalyticsGenerationHandshake(
          window.localStorage,
          handshakeUserId,
          tentativeGeneration,
          new Date().toISOString(),
          handshakeRequestId
        );
        const handshakeGeneration = handshakeSnapshot.generation;
        const response = await fetch("/api/learning-events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-MAIS-Analytics-User-Id": encodeURIComponent(handshakeUserId)
          },
          keepalive: true,
          body: JSON.stringify({ generation: handshakeGeneration, events: [] })
        });
        const delivery: unknown = await response.json().catch(() => null);
        if (
          cancelled ||
          analyticsGenerationHandshakeSequenceRef.current !== handshakeSequence ||
          !isCurrentLearningAnalyticsIdentity(analyticsIdentityRef.current, handshakeIdentity)
        ) return;

        if (
          isDurableLearningAnalyticsDeliveryResponse(
            response.status,
            delivery,
            handshakeUserId,
            handshakeGeneration,
            new Set<string>()
          )
        ) {
          if (clearFence) {
            if (
              resolveLearningAnalyticsClearHandshake(
                clearFence,
                handshakeGeneration,
                null
              ) !== "retry-delete"
            ) throw new Error("The clear fence cannot be retried from this handshake.");
            markLearningAnalyticsClearDeleteAttempted(
              window.localStorage,
              handshakeUserId,
              clearFence.requestId,
              new Date().toISOString()
            );
            const clearResponse = await fetch("/api/learning-events", {
              method: "DELETE",
              headers: {
                "X-MAIS-Analytics-User-Id": encodeURIComponent(handshakeUserId),
                "X-MAIS-Analytics-Generation": String(clearFence.baseGeneration),
                "X-MAIS-Analytics-Clear-Request-Id": clearFence.requestId
              },
              keepalive: true
            });
            const clearDelivery: unknown = await clearResponse.json().catch(() => null);
            if (
              cancelled ||
              analyticsGenerationHandshakeSequenceRef.current !== handshakeSequence ||
              !isCurrentLearningAnalyticsIdentity(analyticsIdentityRef.current, handshakeIdentity) ||
              !isLearningAnalyticsClearAcknowledgement(
                clearResponse.status,
                clearDelivery,
                handshakeUserId,
                clearFence.baseGeneration,
                clearFence.requestId
              )
            ) throw new Error("Could not confirm the retried durable learning-event clear.");
            const clearAcknowledgement = clearDelivery as {
              clearedAt: string;
              generation: number;
            };
            if (!adoptLearningAnalyticsForwardGeneration(
              handshakeUserId,
              clearAcknowledgement.generation,
              clearAcknowledgement.clearedAt,
              `clear-${clearFence.requestId}-${clearAcknowledgement.generation}`
            )) throw new Error("Could not complete the retried learning-event clear transition.");
            return;
          }
          if (confirmLearningAnalyticsGenerationHandshake(
            window.localStorage,
            handshakeSnapshot
          ) !== "confirmed") {
            throw new Error("The exact empty handshake was superseded before commit.");
          }
          if (!activateLearningAnalyticsGeneration(handshakeUserId, handshakeGeneration)) {
            throw new Error("Could not activate the confirmed learning-analytics generation.");
          }
          return;
        }

        const mismatch = readLearningAnalyticsGenerationMismatchReceipt(
          response.status,
          delivery,
          handshakeUserId,
          handshakeGeneration,
          new Set<string>()
        );
        if (mismatch) {
          if (clearFence) {
            if (mismatch.direction !== "forward") {
              throw new Error("The clear fence received an unsafe generation receipt.");
            }
            const retryFence = prepareLearningAnalyticsClearDeleteAfterMismatch(
              window.localStorage,
              clearFence,
              mismatch
            );
            if (!retryFence) {
              throw new Error("The clear fence received an ambiguous generation receipt.");
            }
            markLearningAnalyticsClearDeleteAttempted(
              window.localStorage,
              handshakeUserId,
              retryFence.requestId,
              new Date().toISOString()
            );
            const retryResponse = await fetch("/api/learning-events", {
              method: "DELETE",
              headers: {
                "X-MAIS-Analytics-User-Id": encodeURIComponent(handshakeUserId),
                "X-MAIS-Analytics-Generation": String(retryFence.baseGeneration),
                "X-MAIS-Analytics-Clear-Request-Id": retryFence.requestId
              },
              keepalive: true
            });
            const retryDelivery: unknown = await retryResponse.json().catch(() => null);
            if (!isLearningAnalyticsClearAcknowledgement(
              retryResponse.status,
              retryDelivery,
              handshakeUserId,
              retryFence.baseGeneration,
              retryFence.requestId
            )) throw new Error("Could not confirm the rebased durable learning-event clear.");
            const retryAcknowledgement = retryDelivery as {
              clearedAt: string;
              generation: number;
            };
            if (!adoptLearningAnalyticsForwardGeneration(
              handshakeUserId,
              retryAcknowledgement.generation,
              retryAcknowledgement.clearedAt,
              `clear-${retryFence.requestId}-${retryAcknowledgement.generation}`
            )) throw new Error("Could not complete the rebased learning-event clear transition.");
            return;
          }
          if (
            mismatch.direction === "forward" &&
            adoptLearningAnalyticsForwardGeneration(
              handshakeUserId,
              mismatch.currentGeneration,
              mismatch.clearedAt,
              `forward-${handshakeSnapshot.requestId}-${mismatch.currentGeneration}`
            )
          ) return;
          if (
            mismatch.direction === "authoritative-lower" &&
            adoptLearningAnalyticsLowerGeneration(
              handshakeUserId,
              mismatch.currentGeneration,
              handshakeSnapshot.requestId,
              `lower-${handshakeSnapshot.requestId}-${mismatch.currentGeneration}`
            )
          ) return;
        }

        throw new Error("Could not confirm the learning-analytics server generation.");
      } catch {
        if (!cancelled) retryLater();
      } finally {
        inFlight = false;
      }
    };
    const handleOnlineOrVisible = () => {
      if (document.visibilityState === "hidden" || navigator.onLine === false) return;
      retryAttempt = 0;
      clearRetryHandle();
      scheduleHandshake(0);
    };

    window.addEventListener("online", handleOnlineOrVisible);
    window.addEventListener("pageshow", handleOnlineOrVisible);
    document.addEventListener("visibilitychange", handleOnlineOrVisible);
    scheduleHandshake(0);

    return () => {
      cancelled = true;
      clearRetryHandle();
      window.removeEventListener("online", handleOnlineOrVisible);
      window.removeEventListener("pageshow", handleOnlineOrVisible);
      document.removeEventListener("visibilitychange", handleOnlineOrVisible);
    };
  }, [
    activateLearningAnalyticsGeneration,
    adoptLearningAnalyticsForwardGeneration,
    adoptLearningAnalyticsLowerGeneration,
    analyticsGenerationHandshakeCycle,
    currentUser?.id,
    currentUser?.role,
    settingsReady
  ]);

  const finalizeAndPauseLearningAnalytics = useCallback(() => {
    finalizeVisibleAnalyticsRef.current?.();
    pauseLearningAnalyticsDelivery();
  }, [pauseLearningAnalyticsDelivery]);

  useEffect(() => {
    if (!settingsReady || currentUser?.role !== "student") return;

    window.addEventListener("pagehide", finalizeAndPauseLearningAnalytics);
    window.addEventListener("beforeunload", finalizeAndPauseLearningAnalytics);

    return () => {
      persistLearningAnalyticsOnPageExit();
      clearAnalyticsDeliveryHandle();
      window.removeEventListener("pagehide", finalizeAndPauseLearningAnalytics);
      window.removeEventListener("beforeunload", finalizeAndPauseLearningAnalytics);
    };
  }, [
    clearAnalyticsDeliveryHandle,
    finalizeAndPauseLearningAnalytics,
    currentUser?.role,
    persistLearningAnalyticsOnPageExit,
    settingsReady
  ]);

  useEffect(() => {
    if (!settingsReady || currentUser?.role !== "student") return;

    const flushForAcceptance = () => {
      // This event is an explicit product-owned drain boundary for browser QA
      // and diagnostics. It performs the same local operations as a normal
      // timer tick, never a lifecycle-only network write.
      finalizeVisibleAnalyticsRef.current?.();
      flushBufferedHighFrequencyLearningEvents();
      restoreLearningAnalyticsOutbox();
      resumeVisibleAnalyticsRef.current?.();
      clearAnalyticsDeliveryHandle();
      const drainIdentity = analyticsIdentityRef.current;
      const drainEventIds = drainIdentity.userId
        ? new Set([
            ...readLearningAnalyticsOutbox(
              window.localStorage,
              drainIdentity.userId
            ),
            ...readUnconfirmedLearningAnalyticsOutbox(
              window.localStorage,
              drainIdentity.userId
            )
          ].map((event) => event.id))
        : new Set<string>();
      analyticsImmediateDeliveryRequestedRef.current =
        drainIdentity.userId && drainEventIds.size > 0
          ? { ...drainIdentity, eventIds: drainEventIds }
          : null;
      setAnalyticsDeliveryCycle((current) => current + 1);
    };

    window.addEventListener(
      learningAnalyticsFlushRequestedEventName,
      flushForAcceptance
    );
    return () => {
      window.removeEventListener(
        learningAnalyticsFlushRequestedEventName,
        flushForAcceptance
      );
    };
  }, [
    currentUser?.id,
    currentUser?.role,
    clearAnalyticsDeliveryHandle,
    flushBufferedHighFrequencyLearningEvents,
    restoreLearningAnalyticsOutbox,
    settingsReady
  ]);

  useEffect(() => {
    const deliveryIdentity = analyticsIdentityRef.current;
    const deliveryGeneration = analyticsServerGenerationRef.current;
    const deliveryProtocolBlocked = deliveryIdentity.userId === null ||
      learningAnalyticsClientProtocolStatus(window.localStorage, deliveryIdentity.userId) !== "open";
    const activeFlight = analyticsDeliveryInFlightRef.current;
    const matchingFlight = Boolean(
      activeFlight &&
      activeFlight.userId === deliveryIdentity.userId &&
      activeFlight.clientEpoch === deliveryIdentity.clientEpoch &&
      activeFlight.generation === deliveryGeneration
    );
    if (
      !settingsReady ||
      !currentUser ||
      deliveryProtocolBlocked ||
      analyticsDeliveryPausedRef.current ||
      matchingFlight ||
      !isCurrentLearningAnalyticsIdentity(
        analyticsGenerationReadyIdentityRef.current,
        analyticsIdentityRef.current
      ) ||
      pendingLearningEvents.length === 0
    ) return;

    const immediateDrain = analyticsImmediateDeliveryRequestedRef.current;
    const deliveryDelayMs = immediateDrain &&
      isCurrentLearningAnalyticsIdentity(deliveryIdentity, immediateDrain) &&
      pendingLearningEvents.some((event) => immediateDrain.eventIds.has(event.id))
      ? 0
      : 1_000;
    analyticsDeliveryHandleRef.current = window.setTimeout(() => {
      analyticsDeliveryHandleRef.current = null;
      const flushIdentity = analyticsIdentityRef.current;
      const flushGeneration = analyticsFlushGenerationRef.current;
      const flushUserId = currentUser.id;
      const flushServerGeneration = analyticsServerGenerationRef.current;
      const currentFlight = analyticsDeliveryInFlightRef.current;
      if (
        analyticsDeliveryPausedRef.current ||
        learningAnalyticsClientProtocolStatus(window.localStorage, flushUserId) !== "open" ||
        (currentFlight &&
          currentFlight.userId === flushUserId &&
          currentFlight.clientEpoch === flushIdentity.clientEpoch &&
          currentFlight.generation === flushServerGeneration)
      ) return;
      const events = pendingLearningEvents
        .filter((event) => learningAnalyticsDeliveryGeneration(event) === flushServerGeneration)
        .slice(0, 100);
      if (events.length === 0) return;
      const eventIds = new Set(events.map((event) => event.id));
      const invalidateAnalyticsSession = () => {
        if (analyticsFlushGenerationRef.current !== flushGeneration) return;
        const bufferedEvents = takeBufferedHighFrequencyLearningEvents();
        try {
          persistLearningAnalyticsEventsForCurrentProtocol(
            window.localStorage,
            flushUserId,
            bufferedEvents,
            flushServerGeneration
          );
        } catch {
          // Preserve the already-durable batch; storage policy may reject only
          // the newest high-frequency samples.
        }
        analyticsFlushGenerationRef.current += 1;
        analyticsIdentityRef.current = {
          userId: null,
          clientEpoch: analyticsFlushGenerationRef.current
        };
        analyticsServerGenerationRef.current = 0;
        currentUserRef.current = null;
        setCurrentUser(null);
        setLessonEntryTarget(null);
        pendingLearningEventsRef.current = [];
        highFrequencyLearningEventsRef.current = [];
        analyticsImmediateDeliveryRequestedRef.current = null;
        clearHighFrequencyFlushHandle();
        setLearningAnalyticsEvents([]);
        setPendingLearningEvents([]);
      };
      const flight: LearningAnalyticsDeliveryFlight = {
        userId: flushUserId,
        clientEpoch: flushIdentity.clientEpoch,
        generation: flushServerGeneration,
        token: analyticsDeliveryFlightSequenceRef.current + 1
      };
      analyticsDeliveryFlightSequenceRef.current = flight.token;
      analyticsDeliveryInFlightRef.current = flight;
      void fetch("/api/learning-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MAIS-Analytics-User-Id": encodeURIComponent(flushUserId)
        },
        keepalive: true,
        body: JSON.stringify({
          generation: flushServerGeneration,
          events: events.map(learningAnalyticsEventForDelivery)
        })
      })
        .then(async (response) => {
          const delivery = await response.json().catch(() => null) as {
            accepted?: unknown;
            acknowledgedEventIds?: unknown;
            acknowledgedUserId?: unknown;
            currentGeneration?: unknown;
            dispositions?: unknown;
            durablyPersisted?: unknown;
            generation?: unknown;
            ignored?: unknown;
            reason?: unknown;
          } | null;
          if (
            analyticsDeliveryInFlightRef.current?.token !== flight.token ||
            !isCurrentLearningAnalyticsIdentity(analyticsIdentityRef.current, flight) ||
            analyticsServerGenerationRef.current !== flight.generation ||
            learningAnalyticsClientProtocolStatus(window.localStorage, flushUserId) !== "open"
          ) return;
          if (
            response.status === 401 ||
            response.status === 403 ||
            delivery?.ignored === true
          ) {
            invalidateAnalyticsSession();
            return;
          }
          const mismatch = readLearningAnalyticsGenerationMismatchReceipt(
            response.status,
            delivery,
            flushUserId,
            flushServerGeneration,
            eventIds
          );
          if (mismatch) {
            if (mismatch.direction === "forward") {
              const adopted = await withLearningAnalyticsClearLock(
                flushUserId,
                async () => adoptLearningAnalyticsForwardGeneration(
                  flushUserId,
                  mismatch.currentGeneration,
                  mismatch.clearedAt,
                  `delivery-forward-${flight.token}-${mismatch.currentGeneration}`
                )
              );
              if (!adopted) {
                freezeLearningAnalyticsIdentity();
                requestLearningAnalyticsGenerationHandshake();
              }
            } else {
              // A lower generation is recoverable only from a fresh exact-user
              // empty handshake. Hold every row and start that protocol rather
              // than treating a data POST as an authority reset.
              freezeLearningAnalyticsIdentity();
              requestLearningAnalyticsGenerationHandshake();
            }
            return;
          }
          if (!isDurableLearningAnalyticsDeliveryResponse(
            response.status,
            delivery,
            flushUserId,
            flushServerGeneration,
            eventIds
          )) {
            throw new Error("Could not confirm durable learning-event delivery.");
          }
          const remainingAfterAcknowledgement = acknowledgeLearningAnalyticsOutbox(
            window.localStorage,
            flushUserId,
            eventIds,
            events
          ).filter(
            (event) => learningAnalyticsDeliveryGeneration(event) === flushServerGeneration
          );
          if (remainingAfterAcknowledgement.some((event) => eventIds.has(event.id))) {
            throw new Error("Could not remove every durably acknowledged learning-event key.");
          }
          if (remainingAfterAcknowledgement.length === 0) {
            analyticsImmediateDeliveryRequestedRef.current = null;
          } else {
            const activeDrain = analyticsImmediateDeliveryRequestedRef.current;
            if (activeDrain && isCurrentLearningAnalyticsIdentity(activeDrain, flight)) {
              eventIds.forEach((eventId) => activeDrain.eventIds.delete(eventId));
              if (activeDrain.eventIds.size === 0) {
                analyticsImmediateDeliveryRequestedRef.current = null;
              }
            }
          }
          if (analyticsFlushGenerationRef.current === flushGeneration) {
            setPendingLearningEvents((current) => {
              const nextEvents = current.filter((event) => !eventIds.has(event.id));
              pendingLearningEventsRef.current = nextEvents;
              return nextEvents;
            });
            window.dispatchEvent(new Event(learningAnalyticsUpdatedEventName));
          }
        })
        .catch(() => {
          analyticsImmediateDeliveryRequestedRef.current = null;
          // The in-memory and durable queues retain this exact batch until a
          // later response confirms every requested ID.
        })
        .finally(() => {
          if (analyticsDeliveryInFlightRef.current?.token === flight.token) {
            analyticsDeliveryInFlightRef.current = null;
          }
          if (
            isCurrentLearningAnalyticsIdentity(
              analyticsIdentityRef.current,
              flight
            ) &&
            analyticsServerGenerationRef.current === flight.generation &&
            !analyticsDeliveryPausedRef.current
          ) {
            setAnalyticsDeliveryCycle((current) => current + 1);
          }
        });
    }, deliveryDelayMs);

    return clearAnalyticsDeliveryHandle;
  }, [adoptLearningAnalyticsForwardGeneration, analyticsDeliveryCycle, clearAnalyticsDeliveryHandle, clearHighFrequencyFlushHandle, currentUser?.id, freezeLearningAnalyticsIdentity, pendingLearningEvents, requestLearningAnalyticsGenerationHandshake, settingsReady, takeBufferedHighFrequencyLearningEvents]);

  useEffect(() => {
    if (!settingsReady || currentUser?.role !== "student") return;

    const flushUserId = currentUser.id;
    const flushIdentity = analyticsIdentityRef.current;
    if (flushIdentity.userId !== flushUserId) return;
    let cancelled = false;
    let inFlight = false;
    let retryAttempt = 0;
    let retryHandle: number | null = null;

    const clearRetryHandle = () => {
      if (retryHandle === null) return;
      window.clearTimeout(retryHandle);
      retryHandle = null;
    };
    const dispatchSessionResult = (name: string, record: VisualizationSessionOutboxRecord) => {
      window.dispatchEvent(new CustomEvent(name, { detail: record }));
    };
    const sessionDeliveryIsCurrent = () =>
      !cancelled &&
      currentUserRef.current?.role === "student" &&
      currentUserRef.current.id === flushUserId &&
      isCurrentLearningAnalyticsIdentity(
        analyticsIdentityRef.current,
        flushIdentity
      );
    const scheduleFlush = (delayMs: number) => {
      if (cancelled || retryHandle !== null) return;
      retryHandle = window.setTimeout(() => {
        retryHandle = null;
        void flushOutbox();
      }, delayMs);
    };
    const flushOutbox = async () => {
      if (
        cancelled ||
        inFlight ||
        analyticsDeliveryPausedRef.current ||
        document.visibilityState === "hidden" ||
        navigator.onLine === false
      ) return;

      const records = readVisualizationSessionOutbox(window.localStorage, flushUserId);
      if (records.length === 0) return;
      inFlight = true;
      let failed = false;

      for (const record of records) {
        if (cancelled) break;
        try {
          const response = await fetch("/api/visualization-sessions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-MAIS-Visualization-User-Id": encodeURIComponent(record.userId)
            },
            keepalive: true,
            body: JSON.stringify({
              moduleId: record.moduleId,
              topicId: record.topicId,
              source: record.source
            })
          });
          const payload: unknown = await response.json().catch(() => null);
          if (!sessionDeliveryIsCurrent()) break;
          const disposition = visualizationSessionOutboxDeliveryDisposition(
            response.status,
            payload
          );
          if (disposition === "quarantine-and-continue") {
            if (!quarantineVisualizationSessionOutboxRecord(
              window.localStorage,
              record,
              response.status === 403
                ? "curriculum-scope-mismatch"
                : "server-rejected-400"
            )) {
              throw new Error("Could not durably quarantine a rejected visualization session.");
            }
            dispatchSessionResult(visualizationSessionOutboxFailedEventName, record);
            continue;
          }
          if (!isVisualizationSessionOutboxAcknowledgement(response.status, payload, record)) {
            throw new Error("Could not confirm durable visualization-session delivery.");
          }
          if (!sessionDeliveryIsCurrent()) break;
          if (!acknowledgeVisualizationSessionOutbox(window.localStorage, record)) {
            throw new Error("The visualization-session outbox record changed before acknowledgement.");
          }
          dispatchSessionResult(visualizationSessionOutboxAcknowledgedEventName, record);
        } catch {
          if (cancelled) break;
          failed = true;
          dispatchSessionResult(visualizationSessionOutboxFailedEventName, record);
          break;
        }
      }

      inFlight = false;
      if (cancelled) return;
      if (failed) {
        retryAttempt += 1;
        if (retryAttempt <= 5) {
          scheduleFlush(Math.min(8_000, 1_000 * (2 ** (retryAttempt - 1))));
        } else {
          scheduleFlush(visualizationSessionOutboxRetryDelayMs(retryAttempt));
        }
        return;
      }

      retryAttempt = 0;
      if (readVisualizationSessionOutbox(window.localStorage, flushUserId).length > 0) {
        scheduleFlush(0);
      }
    };
    const handleOutboxUpdate = () => {
      if (
        analyticsIdentityRef.current.userId !== flushUserId ||
        currentUserRef.current?.id !== flushUserId
      ) return;
      retryAttempt = 0;
      clearRetryHandle();
      scheduleFlush(0);
    };
    const handleOnlineOrVisible = () => {
      if (
        analyticsIdentityRef.current.userId !== flushUserId ||
        currentUserRef.current?.id !== flushUserId
      ) return;
      if (document.visibilityState === "hidden" || navigator.onLine === false) return;
      retryAttempt = 0;
      clearRetryHandle();
      scheduleFlush(0);
    };

    window.addEventListener(visualizationSessionOutboxUpdatedEventName, handleOutboxUpdate);
    window.addEventListener("online", handleOnlineOrVisible);
    window.addEventListener("pageshow", handleOnlineOrVisible);
    document.addEventListener("visibilitychange", handleOnlineOrVisible);
    scheduleFlush(1_000);

    return () => {
      cancelled = true;
      clearRetryHandle();
      window.removeEventListener(visualizationSessionOutboxUpdatedEventName, handleOutboxUpdate);
      window.removeEventListener("online", handleOnlineOrVisible);
      window.removeEventListener("pageshow", handleOnlineOrVisible);
      document.removeEventListener("visibilitychange", handleOnlineOrVisible);
    };
  }, [currentUser?.id, currentUser?.role, settingsReady]);

  const setSelectedGrade = useCallback((grade: GradeId) => {
    setSelectedGradeState(grade);
  }, []);

  useEffect(() => {
    const source = analyticsSourceForPath(pathname);
    const topicId = topicIdForPath(pathname);
    let accumulatedVisibleSeconds = 0;
    let visibleStartedAt = document.visibilityState === "visible" ? Date.now() : null;

    if (recordedPageViewTokenRef.current !== pageVisitToken) {
      recordedPageViewTokenRef.current = pageVisitToken;
      recordLearningEvent({ type: "page-view", source, topicId });
      if (source === "mistake-book") {
        recordLearningEvent({ type: "mistake-review", source, topicId });
      }
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

    const finalizeVisibleAnalytics = () => {
      recordVisibleDuration();
      visibleStartedAt = null;
    };
    const resumeVisibleAnalytics = () => {
      if (document.visibilityState === "visible" && visibleStartedAt === null) {
        visibleStartedAt = Date.now();
      }
    };
    finalizeVisibleAnalyticsRef.current = finalizeVisibleAnalytics;
    resumeVisibleAnalyticsRef.current = resumeVisibleAnalytics;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        finalizeVisibleAnalytics();
        pauseLearningAnalyticsDelivery();
      } else {
        resumeVisibleAnalytics();
        setLearningAnalyticsDeliveryPaused(false);
        restoreLearningAnalyticsOutbox();
      }
    }

    const durationHandle = window.setInterval(recordVisibleDuration, 60_000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(durationHandle);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      finalizeVisibleAnalytics();
      if (finalizeVisibleAnalyticsRef.current === finalizeVisibleAnalytics) {
        finalizeVisibleAnalyticsRef.current = null;
      }
      if (resumeVisibleAnalyticsRef.current === resumeVisibleAnalytics) {
        resumeVisibleAnalyticsRef.current = null;
      }
    };
  }, [pageVisitToken, pathname, pauseLearningAnalyticsDelivery, recordLearningEvent, restoreLearningAnalyticsOutbox, setLearningAnalyticsDeliveryPaused]);

  const applyAuthSession = useCallback((session: AuthSessionResponse) => {
    const sessionSelectedGrade = session.settings.selectedGrade;
    const storedLessonEntryTarget = session.user.role === "student"
      ? readStoredLessonEntryTarget(session.user.id, sessionSelectedGrade)
      : null;
    const sessionLessonEntryTarget = session.user.role === "student"
      ? lessonEntryTargetForGrade(session.lessonEntryTarget, sessionSelectedGrade) ?? storedLessonEntryTarget
      : null;
    const nextAnalyticsUserId = session.user.role === "student" ? session.user.id : null;
    if (analyticsIdentityRef.current.userId !== nextAnalyticsUserId) {
      freezeLearningAnalyticsIdentity();
      analyticsIdentityRef.current = {
        userId: nextAnalyticsUserId,
        clientEpoch: analyticsFlushGenerationRef.current
      };
    }
    analyticsServerGenerationRef.current = nextAnalyticsUserId
      ? readLearningAnalyticsGeneration(window.localStorage, nextAnalyticsUserId)
      : 0;
    setLearningAnalyticsDeliveryPaused(false);
    resumeVisibleAnalyticsRef.current?.();
    lessonEntryRequestKeyRef.current = null;
    persistedSettingsKeyRef.current = session.settingsPersisted === false
      ? null
      : persistedSettingsKey(
          session.user.id,
          session.settings.language,
          session.settings.theme,
          session.settings.selectedGrade
        );
    currentUserRef.current = session.user;
    setCurrentUser(session.user);
    setLessonEntryTarget(sessionLessonEntryTarget);
    setLanguage(session.settings.language);
    setTheme(session.settings.theme);
    setSelectedGradeState(sessionSelectedGrade);
    if (session.lessonEntryTarget) {
      storeLessonEntryTarget(session.user.id, session.lessonEntryTarget);
    }
    if (nextAnalyticsUserId) {
      const activeIdentity = analyticsIdentityRef.current;
      appendLearningEventsToQueues(
        readLearningAnalyticsOutbox(
          window.localStorage,
          nextAnalyticsUserId,
          analyticsServerGenerationRef.current
        ),
        activeIdentity
      );
      if (
        !isCurrentLearningAnalyticsIdentity(
          analyticsGenerationReadyIdentityRef.current,
          activeIdentity
        )
      ) {
        requestLearningAnalyticsGenerationHandshake();
      }
    }
    broadcastSessionChange(session.user.id);
  }, [appendLearningEventsToQueues, freezeLearningAnalyticsIdentity, requestLearningAnalyticsGenerationHandshake, setLearningAnalyticsDeliveryPaused]);

  const login = useCallback(async (identifier: string, password: string, grade?: GradeId, curriculumProfile?: CurriculumProfile): Promise<AuthActionResult> => {
    freezeLearningAnalyticsIdentity();
    let identityReplaced = false;
    try {
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

      applyAuthSession(session);
      identityReplaced = true;
      return { ok: true, role: session.user.role, passwordMustChange: Boolean(session.user.passwordMustChange) };
    } finally {
      if (!identityReplaced) resumeLearningAnalyticsDelivery();
    }
  }, [applyAuthSession, freezeLearningAnalyticsIdentity, language, resumeLearningAnalyticsDelivery, theme]);

  const register = useCallback(async ({ role = "student", name, username, email, password, grade, curriculumProfile }: RegisterInput): Promise<AuthActionResult> => {
    freezeLearningAnalyticsIdentity();
    let identityReplaced = false;
    try {
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

      applyAuthSession(session);
      identityReplaced = true;
      return { ok: true, role: session.user.role, passwordMustChange: Boolean(session.user.passwordMustChange) };
    } finally {
      if (!identityReplaced) resumeLearningAnalyticsDelivery();
    }
  }, [applyAuthSession, freezeLearningAnalyticsIdentity, language, resumeLearningAnalyticsDelivery, theme]);

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

    applyAuthSession(session);
    return { ok: true, role: session.user.role, passwordMustChange: Boolean(session.user.passwordMustChange) };
  }, [applyAuthSession]);

  const changePassword = useCallback(async (currentPassword: string, password: string): Promise<AuthActionResult> => {
    const response = await fetch("/api/auth/password-change", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ currentPassword, password })
    });

    if (!response.ok) {
      return { ok: false, reason: response.status === 400 ? "invalid" : response.status === 401 ? "invalid" : "error" };
    }

    const session = readAuthSession(await response.json());
    if (!session) return { ok: false, reason: "error" };

    applyAuthSession(session);
    return { ok: true, role: session.user.role, passwordMustChange: Boolean(session.user.passwordMustChange) };
  }, [applyAuthSession]);

  const updateProfile = useCallback(async ({ name, avatarId, avatarImageDataUrl }: ProfileUpdateInput): Promise<AuthActionResult> => {
    const patchProfile = async (body: {
      name?: string;
      avatarId?: StudentAvatarId;
      avatarImageDataUrl?: string | null;
      avatarImageObject?: ProfileAvatarImageObject | null;
    }) => {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        if (response.status === 400) return { ok: false, reason: "invalid" } satisfies AuthActionResult;
        return { ok: false, reason: "error" } satisfies AuthActionResult;
      }

      const session = readAuthSession(await response.json());
      if (!session) return { ok: false, reason: "error" } satisfies AuthActionResult;

      applyAuthSession(session);
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
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ capability: "profile-avatar", dataUrl: avatarImageDataUrl })
        });

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
  }, [applyAuthSession]);

  const clearLocalSession = useCallback(() => {
    freezeLearningAnalyticsIdentity();
    analyticsIdentityRef.current = {
      userId: null,
      clientEpoch: analyticsFlushGenerationRef.current
    };
    invalidateLearningAnalyticsGenerationReadiness();
    analyticsDeliveryFlightSequenceRef.current += 1;
    analyticsDeliveryInFlightRef.current = null;
    analyticsGenerationHandshakeSequenceRef.current += 1;
    analyticsServerGenerationRef.current = 0;
    currentUserRef.current = null;
    lessonEntryRequestKeyRef.current = null;
    persistedSettingsKeyRef.current = null;
    setCurrentUser(null);
    setLessonEntryTarget(null);
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
  }, [freezeLearningAnalyticsIdentity, invalidateLearningAnalyticsGenerationReadiness]);

  const logout = useCallback(async () => {
    freezeLearningAnalyticsIdentity();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The browser state should still clear if the network request fails.
    }
    clearLocalSession();
    broadcastSessionChange(null);
  }, [clearLocalSession, freezeLearningAnalyticsIdentity]);

  const sessionRevalidationInFlightRef = useRef(false);

  // Reconciles the in-memory session with the server cookie. Without this, a tab
  // keeps rendering a stale identity after the session cookie is replaced in
  // another tab (or dropped), and every protected API call fails with 401/403.
  const revalidateSession = useCallback(async () => {
    if (sessionRevalidationInFlightRef.current) return;
    sessionRevalidationInFlightRef.current = true;
    // Fence the captured browser identity before reading a cookie that another
    // tab may already have replaced. A rejected old-owner request remains in
    // that owner's exact durable outbox instead of being attributed to B.
    freezeLearningAnalyticsIdentity();
    try {
      const response = await fetch("/api/auth/session-state?includeLessonEntry=false", { cache: "no-store" });
      const previousUser = currentUserRef.current;

      if (!response.ok && response.status !== 401) return;
      const payload: unknown = response.status === 401 ? { user: null } : await response.json();

      // Signed out: the guest-tolerant endpoint answers 200 `{ user: null }`
      // (a 401 is kept equivalent in case an auth boundary intercepts first).
      if ((payload as { user?: unknown } | null)?.user === null) {
        if (previousUser) {
          clearLocalSession();
          const pathname = window.location.pathname;
          if (isRoleProtectedPath(pathname)) {
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          }
        }
        return;
      }

      const session = readAuthSession(payload);
      if (!session) return;

      applyAuthSession(session);

      const pathname = window.location.pathname;
      const canUseTeacherArea = session.user.role === "teacher" || session.user.role === "admin";
      const canUseParentArea = session.user.role === "parent" || session.user.role === "admin";
      if (pathname.startsWith("/teacher") && !canUseTeacherArea) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}&reason=teacher-account-required`);
      } else if (pathname.startsWith("/parent") && !canUseParentArea) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    } catch {
      // Keep the current state when the session check is unavailable.
    } finally {
      sessionRevalidationInFlightRef.current = false;
      const resumedUser = currentUserRef.current;
      if (analyticsDeliveryPausedRef.current && resumedUser?.role === "student") {
        setLearningAnalyticsDeliveryPaused(false);
        const activeIdentity = analyticsIdentityRef.current;
        appendLearningEventsToQueues(
          readLearningAnalyticsOutbox(
            window.localStorage,
            resumedUser.id,
            analyticsServerGenerationRef.current
          ),
          activeIdentity
        );
        requestLearningAnalyticsGenerationHandshake();
      }
    }
  }, [appendLearningEventsToQueues, applyAuthSession, clearLocalSession, freezeLearningAnalyticsIdentity, requestLearningAnalyticsGenerationHandshake, router, setLearningAnalyticsDeliveryPaused]);

  useEffect(() => {
    if (!settingsReady) return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== sessionSyncStorageKey || !event.newValue) return;
      void revalidateSession();
    };

    let lastCheckAt = Date.now();
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastCheckAt < 15_000) return;
      lastCheckAt = Date.now();
      void revalidateSession();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [revalidateSession, settingsReady]);

  const refreshMistakeRecordsAfterAttempt = useCallback(() => {
    void refreshMistakeRecords();
  }, [refreshMistakeRecords]);

  const markMistakeMastered = useCallback((questionId: string) => {
    void fetch(`/api/mistakes/${encodeURIComponent(questionId)}`, { method: "PATCH" })
      .then(() => refreshMistakeRecords());
  }, [refreshMistakeRecords]);

  const removeMistake = useCallback((questionId: string) => {
    void fetch(`/api/mistakes/${encodeURIComponent(questionId)}`, { method: "DELETE" })
      .then(() => refreshMistakeRecords());
  }, [refreshMistakeRecords]);

  const clearMistakes = useCallback(() => {
    void fetch("/api/mistakes", { method: "DELETE" })
      .then(() => refreshMistakeRecords());
  }, [refreshMistakeRecords]);

  const clearLearningAnalytics = useCallback(() => {
    finalizeVisibleAnalyticsRef.current?.();
    const clearUser = currentUserRef.current;
    const clearRequestSequence = analyticsClearRequestSequenceRef.current + 1;
    analyticsClearRequestSequenceRef.current = clearRequestSequence;
    const clearGeneration = analyticsFlushGenerationRef.current + 1;
    analyticsFlushGenerationRef.current = clearGeneration;
    analyticsIdentityRef.current = {
      userId: clearUser?.role === "student" ? clearUser.id : null,
      clientEpoch: clearGeneration
    };
    invalidateLearningAnalyticsGenerationReadiness();
    analyticsDeliveryFlightSequenceRef.current += 1;
    analyticsDeliveryInFlightRef.current = null;
    analyticsGenerationHandshakeSequenceRef.current += 1;
    analyticsDeliveryPausedRef.current = true;
    analyticsImmediateDeliveryRequestedRef.current = null;
    clearAnalyticsDeliveryHandle();
    clearHighFrequencyFlushHandle();
    pendingLearningEventsRef.current = [];
    highFrequencyLearningEventsRef.current = [];
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
    if (clearUser?.role === "student") {
      const clearUserId = clearUser.id;
      let activeClearFence: ReturnType<typeof beginLearningAnalyticsClearFence> | null = null;
      void withLearningAnalyticsClearLock(clearUserId, async () => {
        // Marker creation is inside the same exact-user lock as DELETE. Two
        // tabs can no longer both observe "absent" and overwrite one another's
        // writer-gate token.
        const existingFence = readLearningAnalyticsClearFence(
          window.localStorage,
          clearUserId
        );
        if (existingFence.status !== "absent") {
          throw new Error("An existing or corrupt clear fence requires handshake recovery.");
        }
        const clearFence = beginLearningAnalyticsClearFence(
          window.localStorage,
          clearUserId,
          analyticsServerGenerationRef.current,
          new Date().toISOString(),
          `clear-${clearUserId}-${clearRequestSequence}-${Date.now()}`
        );
        activeClearFence = clearFence;
        if (!reconcileLearningAnalyticsBoundaryDurability(
          clearUserId,
          [clearFence.requestId]
        )) {
          throw new Error("Could not reconcile the exact-user durability fallback.");
        }
        // The durable fence is written first. From this point every same-user
        // writer synchronously diverts new rows to the unconfirmed area.
        clearLearningAnalyticsOutbox(
          window.localStorage,
          clearUserId,
          clearFence.clearedStorageKeys
        );
        analyticsDirectClearInFlightRef.current = {
          userId: clearUserId,
          requestId: clearFence.requestId
        };
        const activeFence = readLearningAnalyticsClearFence(
          window.localStorage,
          clearUserId
        );
        if (
          activeFence.status !== "valid" ||
          activeFence.value.requestId !== clearFence.requestId
        ) throw new Error("The learning-event clear fence was superseded.");
        markLearningAnalyticsClearDeleteAttempted(
          window.localStorage,
          clearUserId,
          clearFence.requestId,
          new Date().toISOString()
        );
        const response = await fetch("/api/learning-events", {
          method: "DELETE",
          headers: {
            "X-MAIS-Analytics-User-Id": encodeURIComponent(clearUserId),
            "X-MAIS-Analytics-Generation": String(clearFence.baseGeneration),
            "X-MAIS-Analytics-Clear-Request-Id": clearFence.requestId
          }
        });
        const delivery: unknown = await response.json().catch(() => null);
        if (
          analyticsClearRequestSequenceRef.current !== clearRequestSequence ||
          analyticsIdentityRef.current.userId !== clearUserId ||
          !isLearningAnalyticsClearAcknowledgement(
            response.status,
            delivery,
            clearUserId,
            clearFence.baseGeneration,
            clearFence.requestId
          )
        ) throw new Error("Could not confirm durable learning-event clear.");
        const clearAcknowledgement = delivery as {
          clearedAt: string;
          generation: number;
        };
        if (!adoptLearningAnalyticsForwardGeneration(
          clearUserId,
          clearAcknowledgement.generation,
          clearAcknowledgement.clearedAt,
          `clear-${clearFence.requestId}-${clearAcknowledgement.generation}`
        )) throw new Error("Could not complete the learning-event clear transition.");
      })
        .catch(() => {
          // Keep the fence and every post-request event durable. The normal
          // visible handshake loop will determine whether the lost response
          // committed before it considers retrying DELETE.
          if (
            analyticsClearRequestSequenceRef.current === clearRequestSequence &&
            analyticsIdentityRef.current.userId === clearUserId
          ) {
            resumeVisibleAnalyticsRef.current?.();
            requestLearningAnalyticsGenerationHandshake();
          }
          window.dispatchEvent(new Event(learningAnalyticsUpdatedEventName));
        })
        .finally(() => {
          const clearFence = activeClearFence;
          const directClear = analyticsDirectClearInFlightRef.current;
          if (
            clearFence &&
            directClear?.userId === clearUserId &&
            directClear.requestId === clearFence.requestId
          ) analyticsDirectClearInFlightRef.current = null;
          if (
            analyticsIdentityRef.current.userId === clearUserId &&
            readLearningAnalyticsClearFence(window.localStorage, clearUserId).status === "valid"
          ) requestLearningAnalyticsGenerationHandshake();
        });
      window.dispatchEvent(new Event(learningAnalyticsUpdatedEventName));
    } else {
      setLearningAnalyticsDeliveryPaused(false);
      window.dispatchEvent(new Event(learningAnalyticsUpdatedEventName));
    }
  }, [adoptLearningAnalyticsForwardGeneration, clearAnalyticsDeliveryHandle, clearHighFrequencyFlushHandle, invalidateLearningAnalyticsGenerationReadiness, reconcileLearningAnalyticsBoundaryDurability, requestLearningAnalyticsGenerationHandshake, setLearningAnalyticsDeliveryPaused]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settingsReady,
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => current === "en" ? "zh" : current === "zh" ? "zh-Hans" : "en"),
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
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
      updateProfile
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within AppProviders");
  }
  return context;
}

export { dictionary };
