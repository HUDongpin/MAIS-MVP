"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isValidGradeId } from "@/data/grades";
import { dictionary, isValidLanguage, localeForLanguage, textForLanguage } from "@/lib/i18n";
import { curriculumProfileForTrack, curriculumTrackForProfile, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import {
  createLearningAnalyticsEvent,
  learningAnalyticsUpdatedEventName,
  maxStoredLearningAnalyticsEvents
} from "@/lib/learningAnalytics";
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
  username: "Mainland Student Ludwig",
  password: "12345"
} as const;

export const demoHongKongTeacherAccount = {
  username: "HK Teacher Chan",
  password: "12345"
} as const;

export const demoMainlandTeacherAccount = {
  username: "Mainland Teacher Phoebe",
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
  login: (identifier: string, password: string, grade: GradeId, curriculumProfile?: CurriculumProfile) => Promise<AuthActionResult>;
  register: (input: RegisterInput) => Promise<AuthActionResult>;
  completePasswordReset: (token: string, password: string) => Promise<AuthActionResult>;
  changePassword: (currentPassword: string, password: string) => Promise<AuthActionResult>;
  updateProfile: (input: ProfileUpdateInput) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
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

type AuthSessionResponse = {
  user: StudentSession;
  settings: {
    language: Language;
    theme: ThemeMode;
    selectedGrade: GradeId;
  };
  lessonEntryTarget?: LessonEntryTarget | null;
};

type RegisterInput = {
  role?: "student" | "parent";
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

const isGrade = isValidGradeId;
const validAvatarIds = new Set<StudentAvatarId>(["delta", "pi", "sigma", "theta", "function", "radical"]);
const maxAvatarImageDataUrlLength = 900_000;
const avatarImageDataUrlPattern = /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

function readAvatarId(value: unknown): StudentAvatarId {
  return validAvatarIds.has(value as StudentAvatarId) ? (value as StudentAvatarId) : "delta";
}

function readAvatarImageDataUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  if (value.length > maxAvatarImageDataUrlLength) return undefined;
  return avatarImageDataUrlPattern.test(value) ? value : undefined;
}

function readLessonEntryTarget(value: unknown): LessonEntryTarget | null {
  const target = value as Partial<LessonEntryTarget> | null;

  if (
    typeof target?.href !== "string" ||
    !target.href.startsWith("/lesson/") ||
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
    (curriculumTrack !== "HK" && curriculumTrack !== "MAINLAND_PEP_HIGH" && curriculumTrack !== "US_CA_MATH" && curriculumTrack !== "US_NC_MATH") ||
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
      avatarImageDataUrl: readAvatarImageDataUrl(user.avatarImageDataUrl),
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
    lessonEntryTarget: readLessonEntryTarget(record?.lessonEntryTarget)
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
  if (pathname.startsWith("/adaptive-learning")) return "adaptive-learning";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/practice")) return "practice";
  if (pathname.startsWith("/progress")) return "progress";
  if (pathname.startsWith("/lesson")) return "lesson";
  if (pathname.startsWith("/mistake-book")) return "mistake-book";
  if (pathname.startsWith("/visualization-lab")) return "visualization-lab";
  if (pathname.startsWith("/learning-path") || pathname.startsWith("/primary-roadmap") || pathname.startsWith("/secondary-roadmap")) return "learning-path";
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
  const lessonEntryRequestKeyRef = useRef<string | null>(null);
  const persistedSettingsKeyRef = useRef<string | null>(null);
  const studentLessonHref = currentUser?.role === "student"
    ? lessonEntryTargetForGrade(lessonEntryTarget, currentUser.grade)?.href ?? null
    : null;
  const recordLearningEvent = useCallback((event: LearningAnalyticsInput) => {
    if (!settingsReady || !currentUser) return;

    const analyticsEvent = createLearningAnalyticsEvent(event, selectedGrade);
    setLearningAnalyticsEvents((events) => [...events, analyticsEvent].slice(-maxStoredLearningAnalyticsEvents));
    setPendingLearningEvents((events) => [...events, analyticsEvent].slice(-maxStoredLearningAnalyticsEvents));
  }, [currentUser?.id, selectedGrade, settingsReady]);
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

    const targetGrade = grade ?? currentUser.grade;
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
  }, [currentUser]);

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
        const response = await fetch("/api/me", { cache: "no-store" });
        if (response.ok) {
          const session = readAuthSession(await response.json());
          if (session && !cancelled) {
            const sessionSelectedGrade = session.user.role === "student" ? session.user.grade : session.settings.selectedGrade;
            const storedLessonEntryTarget = session.user.role === "student"
              ? readStoredLessonEntryTarget(session.user.id, session.user.grade)
              : null;
            const sessionLessonEntryTarget = session.user.role === "student"
              ? lessonEntryTargetForGrade(session.lessonEntryTarget, session.user.grade) ?? storedLessonEntryTarget
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
          en: "An adaptive interactive mathematics learning platform for Hong Kong P1-S6 students.",
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
    if (!settingsReady || currentUser?.role !== "student" || selectedGrade === currentUser.grade) return;
    setSelectedGradeState(currentUser.grade);
  }, [currentUser?.grade, currentUser?.role, selectedGrade, settingsReady]);

  useEffect(() => {
    if (!settingsReady) return;
    void refreshMistakeRecords();
  }, [refreshMistakeRecords, settingsReady]);

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
      lessonEntryTargetForGrade(lessonEntryTarget, currentUser.grade)
    ) return;
    const storedTarget = readStoredLessonEntryTarget(currentUser.id, currentUser.grade);
    if (storedTarget) setLessonEntryTarget(storedTarget);
  }, [currentUser?.grade, currentUser?.id, currentUser?.role, lessonEntryTarget, settingsReady]);

  useEffect(() => {
    if (
      !settingsReady ||
      currentUser?.role !== "student" ||
      lessonEntryTargetForGrade(lessonEntryTarget, currentUser.grade)
    ) return;
    void refreshLessonEntryTarget(currentUser.grade);
  }, [currentUser?.grade, currentUser?.role, lessonEntryTarget, refreshLessonEntryTarget, settingsReady]);

  useEffect(() => {
    analyticsFlushGenerationRef.current += 1;
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!settingsReady || !currentUser || pendingLearningEvents.length === 0) return;

    const handle = window.setTimeout(() => {
      const flushGeneration = analyticsFlushGenerationRef.current;
      const events = pendingLearningEvents.slice(0, 100);
      const eventIds = new Set(events.map((event) => event.id));
      setPendingLearningEvents((current) => current.filter((event) => !eventIds.has(event.id)));

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
            return [...missedEvents, ...current].slice(-maxStoredLearningAnalyticsEvents);
          });
        });
    }, 1000);

    return () => window.clearTimeout(handle);
  }, [currentUser?.id, pendingLearningEvents, settingsReady]);

  const setSelectedGrade = useCallback((grade: GradeId) => {
    setSelectedGradeState((currentGrade) => {
      if (currentUser?.role === "student") return currentUser.grade;
      return grade;
    });
  }, [currentUser?.grade, currentUser?.role]);

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
    const sessionSelectedGrade = session.user.role === "student" ? session.user.grade : session.settings.selectedGrade;
    const storedLessonEntryTarget = session.user.role === "student"
      ? readStoredLessonEntryTarget(session.user.id, session.user.grade)
      : null;
    const sessionLessonEntryTarget = session.user.role === "student"
      ? lessonEntryTargetForGrade(session.lessonEntryTarget, session.user.grade) ?? storedLessonEntryTarget
      : null;
    analyticsFlushGenerationRef.current += 1;
    lessonEntryRequestKeyRef.current = null;
    persistedSettingsKeyRef.current = persistedSettingsKey(
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
  }, [router]);

  const login = useCallback(async (identifier: string, password: string, grade: GradeId, curriculumProfile?: CurriculumProfile): Promise<AuthActionResult> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username: identifier, password, grade, curriculumProfile, curriculumTrack: curriculumProfile ? curriculumTrackForProfile(curriculumProfile) : undefined, language, theme })
    });

    if (!response.ok) {
      if (response.status === 503) return { ok: false, reason: "setup" };
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
      if (response.status === 503) return { ok: false, reason: "setup" };
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
      return { ok: false, reason: response.status === 400 ? "invalid" : response.status === 503 ? "setup" : "error" };
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
    const response = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, avatarId, avatarImageDataUrl })
    });

    if (!response.ok) {
      if (response.status === 400) return { ok: false, reason: "invalid" };
      return { ok: false, reason: "error" };
    }

    const session = readAuthSession(await response.json());
    if (!session) return { ok: false, reason: "error" };

    applyAuthSession(session);
    return { ok: true, role: session.user.role };
  }, [applyAuthSession]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The browser state should still clear if the network request fails.
    }
    analyticsFlushGenerationRef.current += 1;
    lessonEntryRequestKeyRef.current = null;
    persistedSettingsKeyRef.current = null;
    setCurrentUser(null);
    setLessonEntryTarget(null);
    setLearningAnalyticsEvents([]);
    setPendingLearningEvents([]);
  }, []);

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
