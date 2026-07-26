"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { motion } from "@/components/ui/Motion";
import { TopicCard } from "@/components/cards/TopicCard";
import { AdaptiveKnowledgeGalaxy } from "@/components/dashboard/AdaptiveKnowledgeGalaxy";
import { DashboardBackToTopButton } from "@/components/dashboard/DashboardBackToTopButton";
import { DashboardProgressDetails } from "@/components/dashboard/DashboardProgressDetails";
import { LearningAnalyticsReport } from "@/components/dashboard/LearningAnalyticsReport";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { formatDifficultyLabel, formatGradeLabel, localeForLanguage } from "@/lib/i18n";
import { lessonHrefForTopicId } from "@/lib/lessonLinks";
import { studentRoadmapPath } from "@/lib/roadmapRoutes";
import { studentAssignmentHref, studentAssignmentsPath } from "@/lib/studentAssignmentRoutes";
import { cn } from "@/lib/utils";
import type { AdaptiveLearningDecision, DashboardData, Language, LocalizedText, StudentAssignmentItem } from "@/types";

function readDashboard(value: unknown) {
  const response = value as { dashboard?: unknown } | null;
  return (response?.dashboard ?? null) as DashboardData | null;
}

function readAssignments(value: unknown) {
  const response = value as { assignments?: unknown } | null;
  return Array.isArray(response?.assignments) ? (response.assignments as StudentAssignmentItem[]) : [];
}

function readAdaptiveDecision(value: unknown) {
  const response = value as { decision?: unknown } | null;
  const decision = response?.decision as Partial<AdaptiveLearningDecision> | undefined;
  if (
    typeof decision?.action !== "string" ||
    typeof decision.skill?.id !== "string" ||
    typeof decision.topic?.id !== "string" ||
    typeof decision.engine?.llmStatus !== "string" ||
    !Array.isArray(decision.skillMap) ||
    !Array.isArray(decision.dueReviews)
  ) {
    return null;
  }

  return decision as AdaptiveLearningDecision;
}

function isLocalizedText(value: unknown): value is LocalizedText {
  const record = value as Partial<LocalizedText> | null;
  return typeof record?.en === "string" && typeof record.zh === "string";
}

function readAdaptiveContentUnavailable(value: unknown) {
  const response = value as { reason?: unknown; contentUnavailable?: unknown } | null;
  if (response?.reason !== "content-unavailable" || !isLocalizedText(response.contentUnavailable)) return null;
  return response.contentUnavailable;
}

function assignmentHref(item: StudentAssignmentItem) {
  return studentAssignmentHref(item.assignment.id);
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

type GalaxyDockTone = "cyan" | "violet" | "emerald" | "solar";

type GalaxyDockIconKind = "assignment" | "analytics" | "archive" | "expand" | "route";

const galaxyDockToneClasses: Record<GalaxyDockTone, { chip: string; planet: string; pulse: string }> = {
  cyan: {
    chip: "border-cyan-200/80 bg-cyan-100/75 text-cyan-800 dark:border-cyan-200/30 dark:bg-cyan-300/[0.12] dark:text-cyan-100",
    planet: "from-cyan-200 via-sky-400 to-indigo-500 shadow-cyan-400/35",
    pulse: "bg-cyan-500 shadow-[0_0_18px_rgba(14,165,233,0.42)] dark:bg-cyan-300 dark:shadow-[0_0_24px_rgba(103,232,249,0.95)]"
  },
  violet: {
    chip: "border-violet-200/80 bg-violet-100/75 text-violet-800 dark:border-violet-200/30 dark:bg-violet-300/[0.12] dark:text-violet-100",
    planet: "from-fuchsia-200 via-violet-400 to-blue-500 shadow-violet-400/35",
    pulse: "bg-violet-500 shadow-[0_0_18px_rgba(139,92,246,0.38)] dark:bg-violet-300 dark:shadow-[0_0_24px_rgba(196,181,253,0.9)]"
  },
  emerald: {
    chip: "border-emerald-200/80 bg-emerald-100/75 text-emerald-800 dark:border-emerald-200/30 dark:bg-emerald-300/[0.12] dark:text-emerald-100",
    planet: "from-lime-200 via-emerald-400 to-teal-500 shadow-emerald-400/30",
    pulse: "bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.38)] dark:bg-emerald-300 dark:shadow-[0_0_24px_rgba(110,231,183,0.86)]"
  },
  solar: {
    chip: "border-amber-200/80 bg-amber-100/75 text-amber-800 dark:border-amber-200/30 dark:bg-amber-300/[0.12] dark:text-amber-100",
    planet: "from-amber-200 via-orange-300 to-rose-400 shadow-rose-400/30",
    pulse: "bg-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.38)] dark:bg-amber-200 dark:shadow-[0_0_24px_rgba(253,230,138,0.86)]"
  }
};

const galaxyDockBackdrops: Record<GalaxyDockTone, { light: string; dark: string }> = {
  cyan: {
    light: "radial-gradient(circle at 14% 16%, rgba(14,165,233,0.2), transparent 25%), radial-gradient(circle at 82% 20%, rgba(99,102,241,0.12), transparent 28%), radial-gradient(circle at 74% 78%, rgba(16,185,129,0.1), transparent 26%), linear-gradient(135deg, #eefaff 0%, #f8fbff 48%, #f4f0ff 100%)",
    dark: "radial-gradient(circle at 14% 16%, rgba(70,243,255,0.24), transparent 25%), radial-gradient(circle at 82% 20%, rgba(167,139,250,0.17), transparent 28%), radial-gradient(circle at 74% 78%, rgba(85,244,178,0.1), transparent 26%), linear-gradient(135deg, #071022 0%, #0c0b24 43%, #170b2f 76%, #050813 100%)"
  },
  violet: {
    light: "radial-gradient(circle at 16% 18%, rgba(139,92,246,0.18), transparent 26%), radial-gradient(circle at 76% 24%, rgba(236,72,153,0.1), transparent 30%), radial-gradient(circle at 72% 78%, rgba(14,165,233,0.1), transparent 24%), linear-gradient(135deg, #f5f3ff 0%, #f8fbff 48%, #eefaff 100%)",
    dark: "radial-gradient(circle at 16% 18%, rgba(167,139,250,0.26), transparent 26%), radial-gradient(circle at 76% 24%, rgba(244,114,182,0.18), transparent 30%), radial-gradient(circle at 72% 78%, rgba(103,232,249,0.1), transparent 24%), linear-gradient(135deg, #071022 0%, #0c0b24 43%, #170b2f 76%, #050813 100%)"
  },
  emerald: {
    light: "radial-gradient(circle at 15% 20%, rgba(16,185,129,0.16), transparent 26%), radial-gradient(circle at 78% 24%, rgba(14,165,233,0.12), transparent 28%), radial-gradient(circle at 70% 80%, rgba(245,158,11,0.1), transparent 24%), linear-gradient(135deg, #ecfdf5 0%, #f8fbff 48%, #eefaff 100%)",
    dark: "radial-gradient(circle at 15% 20%, rgba(85,244,178,0.2), transparent 26%), radial-gradient(circle at 78% 24%, rgba(70,243,255,0.16), transparent 28%), radial-gradient(circle at 70% 80%, rgba(250,204,21,0.1), transparent 24%), linear-gradient(135deg, #071022 0%, #0c0b24 43%, #170b2f 76%, #050813 100%)"
  },
  solar: {
    light: "radial-gradient(circle at 15% 18%, rgba(245,158,11,0.16), transparent 26%), radial-gradient(circle at 78% 20%, rgba(244,63,94,0.1), transparent 29%), radial-gradient(circle at 70% 78%, rgba(139,92,246,0.1), transparent 24%), linear-gradient(135deg, #fff7ed 0%, #f8fbff 48%, #f5f3ff 100%)",
    dark: "radial-gradient(circle at 15% 18%, rgba(250,204,21,0.18), transparent 26%), radial-gradient(circle at 78% 20%, rgba(251,113,133,0.18), transparent 29%), radial-gradient(circle at 70% 78%, rgba(167,139,250,0.12), transparent 24%), linear-gradient(135deg, #071022 0%, #0c0b24 43%, #170b2f 76%, #050813 100%)"
  }
};

const galaxyDockStars = {
  light: "radial-gradient(circle, rgba(14,165,233,0.32) 0 1px, transparent 1.4px), radial-gradient(circle, rgba(99,102,241,0.26) 0 1px, transparent 1.4px), radial-gradient(circle, rgba(245,158,11,0.28) 0 1px, transparent 1.5px)",
  dark: "radial-gradient(circle, rgba(255,255,255,0.86) 0 1px, transparent 1.4px), radial-gradient(circle, rgba(70,243,255,0.7) 0 1px, transparent 1.4px), radial-gradient(circle, rgba(255,209,102,0.68) 0 1px, transparent 1.5px)"
};

const galaxyDockActionButtonClass = "inline-flex h-20 w-full max-w-full items-center justify-between gap-4 rounded-[1.6rem] px-4 py-2 text-base font-black leading-tight shadow-[0_14px_30px_rgba(15,23,42,0.10)] backdrop-blur-md transition dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_14px_30px_rgba(15,23,42,0.24)] sm:w-80 sm:text-lg";
const galaxyDockActionTextClass = "min-w-0 flex-1 text-left leading-tight break-words";
const galaxyDockActionIconClass = "grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cyan-100/80 text-cyan-800 transition dark:bg-white/15 dark:text-white";

function GalaxyDockBackdrop({ tone }: { tone: GalaxyDockTone }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 dark:hidden"
        style={{
          background: galaxyDockBackdrops[tone].light
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden dark:block"
        style={{
          background: galaxyDockBackdrops[tone].dark
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-45 dark:hidden"
        style={{
          backgroundImage: galaxyDockStars.light,
          backgroundPosition: "0 0, 32px 28px, 74px 42px",
          backgroundSize: "92px 92px, 132px 132px, 172px 172px"
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden opacity-55 dark:block"
        style={{
          backgroundImage: galaxyDockStars.dark,
          backgroundPosition: "0 0, 32px 28px, 74px 42px",
          backgroundSize: "92px 92px, 132px 132px, 172px 172px"
        }}
      />
    </>
  );
}

function GalaxyDockIcon({ icon }: { icon: GalaxyDockIconKind }) {
  const commonProps = {
    "aria-hidden": true,
    className: "h-6 w-6 fill-none stroke-current stroke-[2.4]"
  };

  if (icon === "assignment") {
    return (
      <svg viewBox="0 0 32 32" {...commonProps}>
        <path d="M10 6h12" />
        <path d="M12 4h8l1.5 4h-11L12 4z" />
        <path d="M8 8h16v19H8z" />
        <path d="M12 15h8" />
        <path d="M12 20h5" />
      </svg>
    );
  }

  if (icon === "analytics") {
    return (
      <svg viewBox="0 0 32 32" {...commonProps}>
        <circle cx="16" cy="16" r="4" />
        <path d="M4 18c4-8 12-12 22-10" />
        <path d="M28 14c-4 8-12 12-22 10" />
        <path d="M10 24h12" />
      </svg>
    );
  }

  if (icon === "route") {
    return (
      <svg viewBox="0 0 32 32" {...commonProps}>
        <path d="M6 22c5-12 15 4 20-8" />
        <circle cx="7" cy="22" r="3" />
        <circle cx="26" cy="14" r="3" />
        <path d="M16 7l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" />
      </svg>
    );
  }

  if (icon === "archive") {
    return (
      <svg viewBox="0 0 32 32" {...commonProps}>
        <path d="M7 9h18v5H7z" />
        <path d="M9 14v12h14V14" />
        <path d="M13 19h6" />
        <path d="M22 5l2 4" />
        <path d="M10 5L8 9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" {...commonProps}>
      <path d="M16 7v18" />
      <path d="M7 16h18" />
    </svg>
  );
}

function GalaxyDockPlanet({ icon, tone }: { icon: GalaxyDockIconKind; tone: GalaxyDockTone }) {
  return (
    <span className={cn("relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br text-slate-950 shadow-2xl", galaxyDockToneClasses[tone].planet)}>
      <span aria-hidden="true" className="absolute -inset-[14%] rounded-full border border-white/60 opacity-70 dark:border-white/25" />
      <span aria-hidden="true" className="absolute -inset-[34%] rounded-full bg-cyan-100/30 blur-xl dark:bg-white/10" />
      <span className="relative z-10 drop-shadow-[0_2px_10px_rgba(255,255,255,0.28)]">
        <GalaxyDockIcon icon={icon} />
      </span>
    </span>
  );
}

function GalaxyDockHeader({
  action,
  detail,
  eyebrow,
  icon,
  title,
  tone
}: {
  action?: ReactNode;
  detail: string;
  eyebrow: string;
  icon: GalaxyDockIconKind;
  title: string;
  tone: GalaxyDockTone;
}) {
  return (
    <div className="relative z-10 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center lg:grid-cols-[auto_minmax(0,1fr)_auto]">
      <GalaxyDockPlanet icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="flex items-center gap-3 text-sm font-black uppercase text-cyan-700 dark:text-cyan-200 sm:text-base">
          <span className={cn("h-2.5 w-2.5 rounded-full", galaxyDockToneClasses[tone].pulse)} />
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-600 dark:text-slate-300 sm:text-base">{detail}</p>
      </div>
      {action ? <div className="sm:col-start-2 lg:col-start-auto">{action}</div> : null}
    </div>
  );
}

function GalaxyDockPanel({
  action,
  children,
  detail,
  eyebrow,
  icon,
  id,
  title,
  tone
}: {
  action?: ReactNode;
  children: ReactNode;
  detail: string;
  eyebrow: string;
  icon: GalaxyDockIconKind;
  id?: string;
  title: string;
  tone: GalaxyDockTone;
}) {
  return (
    <section id={id} className="relative mt-6 min-w-0 overflow-hidden rounded-[2rem] border border-cyan-100/80 bg-sky-50 text-slate-950 shadow-2xl shadow-cyan-900/10 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-cyan-950/25">
      <GalaxyDockBackdrop tone={tone} />
      <div className="relative z-10 p-5 sm:p-6">
        <GalaxyDockHeader action={action} detail={detail} eyebrow={eyebrow} icon={icon} title={title} tone={tone} />
        {children}
      </div>
    </section>
  );
}

function GalaxyDetailsPanel({
  children,
  detail,
  eyebrow,
  icon,
  openLabel,
  title,
  tone
}: {
  children: ReactNode;
  detail: string;
  eyebrow: string;
  icon: GalaxyDockIconKind;
  openLabel: string;
  title: string;
  tone: GalaxyDockTone;
}) {
  return (
    <details className="group mt-6">
      <summary className="focus-ring relative min-w-0 cursor-pointer list-none overflow-hidden rounded-[2rem] border border-cyan-100/80 bg-sky-50 text-slate-950 shadow-2xl shadow-cyan-900/10 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-cyan-950/20 [&::-webkit-details-marker]:hidden">
        <GalaxyDockBackdrop tone={tone} />
        <div className="relative z-10 grid gap-4 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6">
          <GalaxyDockPlanet icon={icon} tone={tone} />
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-sm font-black uppercase text-cyan-700 dark:text-cyan-200 sm:text-base">
              <span className={cn("h-2.5 w-2.5 rounded-full", galaxyDockToneClasses[tone].pulse)} />
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-600 dark:text-slate-300 sm:text-base">{detail}</p>
          </div>
          <span className={cn(galaxyDockActionButtonClass, "border", galaxyDockToneClasses[tone].chip)}>
            <span className={galaxyDockActionTextClass}>{openLabel}</span>
            <span className={cn(galaxyDockActionIconClass, "group-open:rotate-45")}>
              <GalaxyDockIcon icon="expand" />
            </span>
          </span>
        </div>
      </summary>
      <div className="mt-6">{children}</div>
    </details>
  );
}

export function AdaptiveLearningContent() {
  const { currentUser, language, selectedGrade, settingsReady, t, text } = useSettings();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [assignmentSavingId, setAssignmentSavingId] = useState("");
  const [adaptiveDecision, setAdaptiveDecision] = useState<AdaptiveLearningDecision | null>(null);
  const [adaptiveContentUnavailable, setAdaptiveContentUnavailable] = useState<LocalizedText | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadSecondaryPanels, setLoadSecondaryPanels] = useState(false);
  const currentUserRequestKey = currentUser
    ? `${currentUser.id}:${currentUser.role}:${currentUser.curriculumTrack}:${currentUser.curriculumProfile.region}:${currentUser.curriculumProfile.publisher ?? ""}`
    : "";
  const gradeTopics = dashboard?.gradeTopics ?? [];
  const recommended = dashboard?.recommendedLesson ?? null;
  const analyticsFocusTopic = dashboard?.weakTopics[0] ?? recommended ?? undefined;
  const recent = dashboard?.recentTopics ?? [];
  const visibleAssignments = assignments.filter((item) => item.classGrade === selectedGrade);
  const loadErrorCopy = t({ en: "Could not load dashboard data.", zh: "暫時無法載入學生儀表板資料。" });

  const openAssignmentsRoute = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.location.assign(studentAssignmentsPath);
  };

  const submitAssignmentDraft = async (item: StudentAssignmentItem) => {
    const answerText = assignmentDrafts[item.assignment.id]?.trim() ?? "";
    if (!answerText) return;
    setAssignmentSavingId(item.assignment.id);
    const endpoint = item.submission.status === "correction-required"
      ? `/api/assignments/${encodeURIComponent(item.assignment.id)}/corrections`
      : `/api/assignments/${encodeURIComponent(item.assignment.id)}/submissions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerText, inputType: "text" })
    });
    const payload = await response.json().catch(() => null) as { submission?: StudentAssignmentItem["submission"] } | null;
    setAssignmentSavingId("");
    if (!response.ok || !payload?.submission) return;
    const updatedSubmission = payload.submission;
    setAssignments((current) => current.map((candidate) =>
      candidate.assignment.id === item.assignment.id
        ? { ...candidate, submission: updatedSubmission }
        : candidate
    ));
    setAssignmentDrafts((current) => ({ ...current, [item.assignment.id]: "" }));
  };

  useEffect(() => {
    if (!settingsReady || !currentUser || currentUser.role !== "student") return;

    router.prefetch(studentAssignmentsPath);

    const controller = new AbortController();
    void fetch(studentAssignmentsPath, {
      method: "GET",
      cache: "force-cache",
      credentials: "same-origin",
      signal: controller.signal
    }).catch(() => undefined);

    return () => controller.abort();
  }, [currentUserRequestKey, router, settingsReady]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      if (!settingsReady) return;

      if (!currentUser || currentUser.role !== "student") {
        setDashboard(null);
        setIsLoading(false);
        setLoadError("");
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch(`/api/dashboard?grade=${selectedGrade}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const nextDashboard = readDashboard(await response.json());
        if (!response.ok || !nextDashboard) throw new Error(loadErrorCopy);
        setDashboard(nextDashboard);
      } catch (error) {
        if (!controller.signal.aborted) {
          setDashboard(null);
          setLoadError(error instanceof Error ? error.message : loadErrorCopy);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [currentUserRequestKey, loadErrorCopy, selectedGrade, settingsReady]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAssignments() {
      if (!settingsReady) return;

      if (!currentUser || currentUser.role !== "student") {
        setAssignments([]);
        return;
      }

      if (isLoading || loadError) return;

      try {
        const response = await fetch("/api/assignments", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Assignments unavailable");
        setAssignments(readAssignments(await response.json()));
      } catch {
        if (!controller.signal.aborted) setAssignments([]);
      }
    }

    loadAssignments();

    return () => controller.abort();
  }, [currentUserRequestKey, isLoading, loadError, settingsReady]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAdaptiveDecision() {
      if (!settingsReady) return;

      if (!currentUser || currentUser.role !== "student") {
        setAdaptiveDecision(null);
        setAdaptiveContentUnavailable(null);
        return;
      }

      if (isLoading || loadError) {
        setAdaptiveDecision(null);
        setAdaptiveContentUnavailable(null);
        return;
      }

      try {
        const response = await fetch(`/api/adaptive-learning/next?grade=${selectedGrade}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = await response.json().catch(() => null) as unknown;
        const unavailable = readAdaptiveContentUnavailable(payload);
        if (unavailable) {
          setAdaptiveDecision(null);
          setAdaptiveContentUnavailable(unavailable);
          return;
        }

        const decision = readAdaptiveDecision(payload);
        if (!response.ok || !decision) throw new Error("Adaptive decision unavailable.");
        setAdaptiveDecision(decision);
        setAdaptiveContentUnavailable(null);
        if (decision.engine.llmStatus === "pending") {
          void fetch("/api/adaptive-learning/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grade: selectedGrade })
          })
            .then(async (refreshResponse) => {
              const refreshPayload = await refreshResponse.json().catch(() => null) as unknown;
              const refreshUnavailable = readAdaptiveContentUnavailable(refreshPayload);
              if (refreshUnavailable && !controller.signal.aborted) {
                setAdaptiveDecision(null);
                setAdaptiveContentUnavailable(refreshUnavailable);
                return;
              }

              if (!refreshResponse.ok) return;
              const refreshed = readAdaptiveDecision(refreshPayload);
              if (refreshed && !controller.signal.aborted) setAdaptiveDecision(refreshed);
            })
            .catch(() => undefined);
        }
      } catch {
        if (!controller.signal.aborted) {
          setAdaptiveDecision(null);
          setAdaptiveContentUnavailable(null);
        }
      }
    }

    void loadAdaptiveDecision();

    return () => controller.abort();
  }, [currentUserRequestKey, isLoading, loadError, selectedGrade, settingsReady]);

  useEffect(() => {
    if (!settingsReady || !currentUser || currentUser.role !== "student" || isLoading || loadError) {
      setLoadSecondaryPanels(false);
      return;
    }

    setLoadSecondaryPanels(false);
    const timer = window.setTimeout(() => setLoadSecondaryPanels(true), 300);
    return () => window.clearTimeout(timer);
  }, [currentUserRequestKey, isLoading, loadError, selectedGrade, settingsReady]);

  if (!settingsReady) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t({ en: "Personalized learning", zh: "個人化學習", zhHans: "个性化学习" })}</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl md:text-5xl">
            {t({ en: "Checking your learning profile", zh: "正在檢查你的學習檔案" })}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            {t({ en: "Loading sign-in status before opening the personalized learning dashboard.", zh: "正在載入登入狀態，然後開啟個人化學習儀表板。", zhHans: "正在载入登录状态，然后开启个性化学习仪表板。" })}
          </p>
        </section>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel overflow-hidden p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t({ en: "Personalized learning", zh: "個人化學習", zhHans: "个性化学习" })}</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl md:text-5xl">
              {t({ en: "Log in to view personalized recommendations", zh: "登入以查看個人化學習建議", zhHans: "登录以查看个性化学习建议" })}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              {t({
                en: "MAIS builds your next lesson, review queue, and mastery map from saved attempts and lesson progress.",
                zh: "MAIS 會根據已儲存的作答與課節進度，建立下一課、複習清單和掌握度地圖。"
              })}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
                {t(dictionary.nav.login)}
              </Link>
              <Link href="/register" className="focus-ring rounded-full border border-cyan-300/45 bg-cyan-400/15 px-5 py-3 text-sm font-black text-cyan-700 transition hover:-translate-y-0.5 dark:text-cyan-100">
                {t({ en: "Register", zh: "註冊", zhHans: "注册" })}
              </Link>
            </div>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              { title: { en: "Skill mastery map", zh: "技能掌握地圖" }, detail: { en: "See which skills are secure, fragile, or ready for challenge.", zh: "查看哪些技能已穩固、仍薄弱或可進入挑戰。" } },
              { title: { en: "Spaced review", zh: "間隔複習" }, detail: { en: "Review work appears when the system predicts it will help most.", zh: "系統會在最有幫助的時間安排複習。" } },
              { title: { en: "Teacher assignments", zh: "老師分派內容" }, detail: { en: "Class work appears beside your personalized next step.", zh: "課堂作業會與你的個人化下一步並列顯示。", zhHans: "课堂作业会与你的个性化下一步并列显示。" } }
            ].map((item) => (
              <div key={text(item.title)} className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                <p className="text-sm font-black text-slate-950 dark:text-white">{text(item.title)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(item.detail)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (currentUser.role !== "student") {
    const consoleHref = currentUser.role === "parent" ? "/parent" : currentUser.role === "teacher" || currentUser.role === "admin" ? "/teacher" : "/";
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel overflow-hidden p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t({ en: "Guarded personalized surface", zh: "受保護個人化介面", zhHans: "受保护个性化界面" })}</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl md:text-5xl">
              {t({ en: "Student personalized learning state is not open for this role", zh: "此角色未開放學生個人化學習狀態", zhHans: "此角色未开放学生个性化学习状态" })}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              {t({
                en: "The P1 pilot loop keeps learner-state recommendations student-owned. Teacher review and parent-safe updates stay in their own consoles.",
                zh: "P1 試點閉環將學習者狀態建議保留給學生本人；教師審核與家長安全更新會留在各自控制台。"
              })}
            </p>
            <Link href={consoleHref} className="focus-ring mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
              {t({ en: "Open your console", zh: "開啟你的控制台" })}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container py-10 sm:py-12">
      <div data-tour="student-galaxy">
        <AdaptiveKnowledgeGalaxy
          contentUnavailable={adaptiveContentUnavailable ?? dashboard?.contentUnavailable ?? null}
          decision={adaptiveDecision}
          isLoading={isLoading}
          loadError={loadError}
          progressMetrics={dashboard?.progressMetrics ?? []}
        />
      </div>

      <GalaxyDockPanel
        id="my-assignments"
        action={(
          <Link href={studentAssignmentsPath} prefetch={true} onClick={openAssignmentsRoute} className={cn("focus-ring group border border-violet-200/80 bg-white/[0.72] text-slate-950 hover:-translate-y-0.5 hover:border-cyan-300/70 hover:bg-cyan-50 dark:border-violet-200/35 dark:bg-violet-950/25 dark:text-white dark:hover:border-cyan-200/45 dark:hover:bg-violet-900/35", galaxyDockActionButtonClass)}>
            <span className={galaxyDockActionTextClass}>{t({ en: "All assignments", zh: "全部作業", zhHans: "全部作业" })}</span>
            <span className={cn(galaxyDockActionIconClass, "group-hover:rotate-90 group-hover:bg-cyan-200/80 dark:group-hover:bg-white/20")}>
              <GalaxyDockIcon icon="expand" />
            </span>
          </Link>
        )}
        detail={t({
          en: "Class missions dock beside your personalized route with due dates, status, and the next place to enter.",
          zh: "課堂任務會與你的個人化航線並列，呈現截止日期、狀態與下一個入口。",
          zhHans: "课堂任务会与你的个性化航线并列，呈现截止日期、状态与下一个入口。"
        })}
        eyebrow={t({ en: "Task bay", zh: "任務艙", zhHans: "任务舱" })}
        icon="assignment"
        title={t({ en: "Teacher-assigned work", zh: "老師分派內容" })}
        tone="cyan"
      >
        {visibleAssignments.length ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visibleAssignments.slice(0, 4).map((item) => (
              <article key={item.assignment.id} className="group relative grid min-h-64 gap-4 overflow-hidden rounded-[1.25rem] border border-cyan-100/80 bg-white/[0.72] p-4 text-slate-950 shadow-lg shadow-cyan-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.075] dark:text-white dark:shadow-xl dark:shadow-black/20">
                <span aria-hidden="true" className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-200/35 blur-2xl transition group-hover:bg-violet-200/40 dark:bg-cyan-300/15 dark:group-hover:bg-violet-300/20" />
                <div className="relative z-10 grid gap-3">
                  <div>
                    <p className="text-xs font-black uppercase leading-5 text-cyan-700 dark:text-cyan-100">{item.className} · {item.assignment.contentType}</p>
                    <Link href={assignmentHref(item)} className="focus-ring mt-2 inline-flex text-base font-black leading-tight text-slate-950 underline-offset-4 hover:underline dark:text-white">{text(item.assignment.title)}</Link>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-600 dark:text-slate-200">
                    <span className="rounded-full border border-cyan-200/80 bg-cyan-100/75 px-3 py-1 text-cyan-800 dark:border-cyan-200/30 dark:bg-cyan-300/[0.12] dark:text-cyan-100">{item.submission.status}</span>
                    <span>{item.assignment.dueAt ? formatDate(item.assignment.dueAt, language) : t({ en: "No due date", zh: "無截止日期" })}</span>
                  </div>
                  {item.submission.feedback ? (
                    <p className="text-xs font-bold leading-5 text-slate-600 dark:text-slate-200">{text(item.submission.feedback)}</p>
                  ) : null}
                  {item.submission.correctionRequest ? (
                    <p className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs font-bold leading-5 text-amber-800 dark:border-amber-200/25 dark:bg-amber-300/[0.12] dark:text-amber-100">{text(item.submission.correctionRequest)}</p>
                  ) : null}
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                      {item.submission.status === "correction-required" ? t({ en: "Correction", zh: "訂正內容" }) : t({ en: "Submission", zh: "提交內容" })}
                    </span>
                    <textarea
                      rows={3}
                      value={assignmentDrafts[item.assignment.id] ?? ""}
                      onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [item.assignment.id]: event.target.value }))}
                      className="focus-ring rounded-2xl border border-cyan-100/80 bg-white/80 px-3 py-2 text-sm text-slate-950 dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
                    />
                  </label>
                  <button
                    disabled={assignmentSavingId === item.assignment.id || !(assignmentDrafts[item.assignment.id]?.trim())}
                    onClick={() => submitAssignmentDraft(item)}
                    type="button"
                    className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                  >
                    {assignmentSavingId === item.assignment.id
                      ? t({ en: "Submitting", zh: "提交中" })
                      : item.submission.status === "correction-required"
                        ? t({ en: "Submit correction", zh: "提交訂正" })
                        : t({ en: "Submit work", zh: "提交作業" })}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </GalaxyDockPanel>

      <GalaxyDetailsPanel
        detail={t({
          en: "Engagement, accuracy, pace, and review signals become a cockpit view for the next route decision.",
          zh: "參與度、答對率、節奏與重溫訊號會匯入下一步航線判讀。",
          zhHans: "参与度、答对率、节奏与重温信号会汇入下一步航线判读。"
        })}
        eyebrow={t({ en: "Signal bay", zh: "訊號艙", zhHans: "信号舱" })}
        icon="analytics"
        openLabel={t({ en: "Open bay", zh: "開啟艙門", zhHans: "开启舱门" })}
        title={t({ en: "Learning analytics", zh: "學習分析", zhHans: "学习分析" })}
        tone="violet"
      >
        {loadSecondaryPanels ? (
          <LearningAnalyticsReport focusTopic={analyticsFocusTopic} />
        ) : (
          <div className="mt-6 rounded-[1.25rem] border border-violet-200/70 bg-white/[0.72] p-5 text-sm font-bold text-slate-600 shadow-lg shadow-cyan-900/10 dark:border-white/10 dark:bg-white/[0.075] dark:text-slate-300">
            {t({ en: "Preparing learning analytics after your route opens.", zh: "正在開啟航線後準備學習分析。", zhHans: "正在开启航线后准备学习分析。" })}
          </div>
        )}
      </GalaxyDetailsPanel>

      <GalaxyDetailsPanel
        detail={t({
          en: "Grade topics, the recommended lesson, and recent learning stay connected to the active route.",
          zh: "年級課題、建議課節與最近學習會連接到當前航線。",
          zhHans: "年级课题、建议课时与最近学习会连接到当前航线。"
        })}
        eyebrow={t({ en: "Support bay", zh: "支援艙", zhHans: "支持舱" })}
        icon="route"
        openLabel={t({ en: "Topics and recent learning", zh: "課題與最近學習", zhHans: "课题与最近学习" })}
        title={t({ en: "Route support", zh: "航線支援", zhHans: "航线支持" })}
        tone="emerald"
      >
        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t(dictionary.dashboard.gradeTopics)}</h2>
            <Link href={studentRoadmapPath} className="text-sm font-bold text-cyan-600 hover:text-cyan-500 dark:text-cyan-300">{t(dictionary.common.viewRoadmap)} →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {gradeTopics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
          </div>
          </div>

          <div className="space-y-6">
          {recommended ? (
            <motion.section className="glass-panel p-5" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t(dictionary.dashboard.nextLesson)}</p>
              <h3 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{text(recommended.title)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(recommended.description)}</p>
              <Link href={lessonHrefForTopicId(recommended.id)} className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 font-bold text-white transition hover:-translate-y-1 dark:bg-white dark:text-slate-950">
                {t(dictionary.common.openLesson)}
              </Link>
            </motion.section>
          ) : null}

          <section className="glass-panel p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t(dictionary.dashboard.recent)}</h2>
            <div className="mt-4 space-y-3">
              {recent.map((topic) => (
                <Link key={topic.id} href={lessonHrefForTopicId(topic.id)} className="block rounded-2xl border border-slate-200/70 bg-white/60 p-4 transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.055]">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{formatGradeLabel(topic.grade, language, true)} · {text(topic.title)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{topic.minutes} {t(dictionary.common.minutes)} · {formatDifficultyLabel(topic.difficulty, language)}</p>
                </Link>
              ))}
              {recent.length === 0 ? (
                <p className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-400">
                  {t({ en: "Recent topics will appear after saved attempts.", zh: "儲存作答後會顯示最近瀏覽課題。" })}
                </p>
              ) : null}
            </div>
          </section>
          </div>
        </section>
      </GalaxyDetailsPanel>

      <GalaxyDetailsPanel
        detail={t({
          en: "Weekly activity, mastery areas, weak topics, and recent events are stored as the route archive.",
          zh: "每週活動、掌握區域、薄弱課題與最近事件會收進航線紀錄。",
          zhHans: "每周活动、掌握区域、薄弱课题与最近事件会收进航线记录。"
        })}
        eyebrow={t({ en: "Archive bay", zh: "紀錄艙", zhHans: "记录舱" })}
        icon="archive"
        openLabel={t({ en: "Weekly activity and mastery areas", zh: "每週活動與掌握區域", zhHans: "每周活动与掌握区域" })}
        title={t({ en: "Progress archive", zh: "進度紀錄", zhHans: "进度记录" })}
        tone="solar"
      >
        {loadSecondaryPanels ? (
          <DashboardProgressDetails />
        ) : (
          <div className="mt-6 rounded-[1.25rem] border border-amber-200/70 bg-white/[0.72] p-5 text-sm font-bold text-slate-600 shadow-lg shadow-cyan-900/10 dark:border-white/10 dark:bg-white/[0.075] dark:text-slate-300">
            {t({ en: "Preparing progress archive after your route opens.", zh: "正在開啟航線後準備進度紀錄。", zhHans: "正在开启航线后准备进度记录。" })}
          </div>
        )}
      </GalaxyDetailsPanel>
      <DashboardBackToTopButton />
    </div>
  );
}
