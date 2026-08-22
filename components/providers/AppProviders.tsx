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
  currentUser: StudentSession | null;
  studentLessonHref: string | null;
  refreshLessonEntryTarget: (grade?: GradeId) => Promise<void>;
  login: (identifier: string, password: string, grade?: GradeId, curriculumProfile?: CurriculumProfile, googleLinkIntent?: boolean) => Promise<AuthActionResult>;
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
  const [settingsReady, setSettingsReady] = useState(false);
  const analyticsFlushGenerationRef = useRef(0);
  const pendingLearningEventsRef = useRef<LearningAnalyticsEvent[]>([]);
  const highFrequencyLearningEventsRef = useRef<LearningAnalyticsEvent[]>([]);
  const highFrequencyFlushHandleRef = useRef<number | null>(null);
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
    if (!settingsReady || !currentUser || currentUser.role !== "student") return;

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
            setCurrentUser(session.user);
            setLessonEntryTarget(sessionLessonEntryTarget);
            setLanguage(session.settings.language);
            setTheme(session.settings.theme);
            setSelectedGradeState(sessionSelectedGrade);
            if (session.lessonEntryTarget) {
              storeLessonEntryTarget(session.user.id, session.lessonEntryTarget);
            }
            if (sessionLessonEntryTarget?.href) {
              router.prefetch(sessionLessonEntryTarget.href);
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
  }, [router]);

  useEffect(() => {
    if (!settingsReady) return;

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = localeForLanguage(language);
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

  }, [pathname, theme, language, selectedGrade, currentUser?.id, settingsReady]);

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
    analyticsFlushGenerationRef.current += 1;
    pendingLearningEventsRef.current = [];
    highFrequencyLearningEventsRef.current = [];
    clearHighFrequencyFlushHandle();
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
  }, [clearHighFrequencyFlushHandle, currentUser?.id]);

  useEffect(() => {
    pendingLearningEventsRef.current = pendingLearningEvents;
  }, [pendingLearningEvents]);

  const sendLearningEventsDuringPageExit = useCallback((events: LearningAnalyticsEvent[]) => {
    if (events.length === 0) return;

    for (let index = 0; index < events.length; index += 100) {
      const payload = JSON.stringify({ events: events.slice(index, index + 100) });
      if (typeof navigator.sendBeacon === "function") {
        const queued = navigator.sendBeacon("/api/learning-events", new Blob([payload], { type: "application/json" }));
        if (queued) continue;
      }

      void fetch("/api/learning-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
    if (!settingsReady || !currentUser || currentUser.role !== "student") return;

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
    sendLearningEventsDuringPageExit(events);
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
    if (!settingsReady || !currentUser || pendingLearningEvents.length === 0) return;

    const handle = window.setTimeout(() => {
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ events })
      })
        .then((response) => {
          if (response.status === 401 || response.status === 403) {
            if (analyticsFlushGenerationRef.current === flushGeneration) {
              analyticsFlushGenerationRef.current += 1;
              setCurrentUser(null);
              setLessonEntryTarget(null);
              pendingLearningEventsRef.current = [];
              highFrequencyLearningEventsRef.current = [];
              clearHighFrequencyFlushHandle();
              setLearningAnalyticsEvents([]);
              setPendingLearningEvents([]);
            }
            return;
          }
          if (response.status === 400) return;
          if (!response.ok) throw new Error("Could not flush learning events.");
          if (analyticsFlushGenerationRef.current === flushGeneration) {
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
  }, [clearHighFrequencyFlushHandle, currentUser?.id, pendingLearningEvents, settingsReady]);

  const setSelectedGrade = useCallback((grade: GradeId) => {
    setSelectedGradeState(grade);
  }, []);

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

  const applyAuthSession = useCallback((session: AuthSessionResponse) => {
    const sessionSelectedGrade = session.settings.selectedGrade;
    const storedLessonEntryTarget = session.user.role === "student"
      ? readStoredLessonEntryTarget(session.user.id, sessionSelectedGrade)
      : null;
    const sessionLessonEntryTarget = session.user.role === "student"
      ? lessonEntryTargetForGrade(session.lessonEntryTarget, sessionSelectedGrade) ?? storedLessonEntryTarget
      : null;
    analyticsFlushGenerationRef.current += 1;
    lessonEntryRequestKeyRef.current = null;
    persistedSettingsKeyRef.current = session.settingsPersisted === false
      ? null
      : persistedSettingsKey(
          session.user.id,
          session.settings.language,
          session.settings.theme,
          session.settings.selectedGrade
        );
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
    setCurrentUser(session.user);
    setLessonEntryTarget(sessionLessonEntryTarget);
    setLanguage(session.settings.language);
    setTheme(session.settings.theme);
    setSelectedGradeState(sessionSelectedGrade);
    if (session.lessonEntryTarget) {
      storeLessonEntryTarget(session.user.id, session.lessonEntryTarget);
    }
    if (sessionLessonEntryTarget?.href) {
      router.prefetch(sessionLessonEntryTarget.href);
    }
    broadcastSessionChange(session.user.id);
  }, [router]);

  const login = useCallback(async (
    identifier: string,
    password: string,
    grade?: GradeId,
    curriculumProfile?: CurriculumProfile,
    googleLinkIntent = false
  ): Promise<AuthActionResult> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: identifier,
        password,
        grade,
        curriculumProfile,
        curriculumTrack: curriculumProfile ? curriculumTrackForProfile(curriculumProfile) : undefined,
        language,
        theme,
        googleLinkIntent
      })
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
    return { ok: true, role: session.user.role, passwordMustChange: Boolean(session.user.passwordMustChange) };
  }, [applyAuthSession, language, theme]);

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

    applyAuthSession(session);
    return { ok: true, role: session.user.role, passwordMustChange: Boolean(session.user.passwordMustChange) };
  }, [applyAuthSession, language, theme]);

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
    analyticsFlushGenerationRef.current += 1;
    lessonEntryRequestKeyRef.current = null;
    persistedSettingsKeyRef.current = null;
    setCurrentUser(null);
    setLessonEntryTarget(null);
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The browser state should still clear if the network request fails.
    }
    clearLocalSession();
    broadcastSessionChange(null);
  }, [clearLocalSession]);

  const currentUserRef = useRef<StudentSession | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const sessionRevalidationInFlightRef = useRef(false);

  // Reconciles the in-memory session with the server cookie. Without this, a tab
  // keeps rendering a stale identity after the session cookie is replaced in
  // another tab (or dropped), and every protected API call fails with 401/403.
  const revalidateSession = useCallback(async () => {
    if (sessionRevalidationInFlightRef.current) return;
    sessionRevalidationInFlightRef.current = true;
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

      if (session.user.id !== previousUser?.id) {
        applyAuthSession(session);
      }

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
    }
  }, [applyAuthSession, clearLocalSession, router]);

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
    const clearGeneration = analyticsFlushGenerationRef.current + 1;
    analyticsFlushGenerationRef.current = clearGeneration;
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
    if (currentUser) {
      void fetch("/api/learning-events", { method: "DELETE" })
        .finally(() => {
          if (analyticsFlushGenerationRef.current === clearGeneration) {
            window.dispatchEvent(new Event(learningAnalyticsUpdatedEventName));
          }
        });
    } else {
      window.dispatchEvent(new Event(learningAnalyticsUpdatedEventName));
    }
  }, [currentUser?.id]);

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
