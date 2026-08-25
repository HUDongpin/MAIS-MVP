"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { TeacherEmptyWorkspace } from "@/components/teacher/TeacherEmptyWorkspace";
import { TeacherGuidedTour, readTeacherTourRecord, teacherTourStorageKey } from "@/components/teacher/TeacherGuidedTour";
import { TeacherNavIcon, type TeacherNavIconName } from "@/components/teacher/teacherNavIcons";
import {
  teacherZoneLabels,
  zoneBarClass,
  zoneEyebrowClass,
  zoneTopBorderClass,
  type TeacherZone
} from "@/components/teacher/teacherZones";
import { formatGradeLabel, formatLearnerName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { StudentSession, TeacherClass, TeacherNavSignals } from "@/types";

type TeacherNavItem = {
  href: string;
  label: { en: string; zh: string };
  activePaths: string[];
  icon: TeacherNavIconName;
  badge?: keyof TeacherNavSignals;
};

type TeacherNavGroup = {
  zone: TeacherZone;
  items: TeacherNavItem[];
};

// Ranked for US K-12 math teachers: daily work on top (triage, grading,
// messages, teaching), weekly planning next, then student data, then the
// term-level record keeping a teacher touches least often.
const teacherNavGroups: TeacherNavGroup[] = [
  {
    zone: "today",
    items: [
      {
        href: "/teacher/dashboard",
        label: { en: "Overview", zh: "總覽" },
        activePaths: ["/teacher/dashboard"],
        icon: "overview"
      },
      {
        href: "/teacher/assignments",
        label: { en: "Assignments", zh: "作業" },
        activePaths: ["/teacher/assignments"],
        icon: "assignments",
        badge: "pendingGrading"
      },
      {
        href: "/teacher/communications/inbox",
        label: { en: "Inbox", zh: "收件匣" },
        activePaths: ["/teacher/communications"],
        icon: "inbox",
        badge: "unrepliedMessages"
      },
      {
        href: "/teacher/classroom-sessions",
        label: { en: "Live", zh: "課堂模式" },
        activePaths: ["/teacher/classroom-sessions"],
        icon: "live"
      }
    ]
  },
  {
    zone: "plan",
    items: [
      {
        href: "/teacher/lesson-kits",
        label: { en: "Lesson kits", zh: "備課包" },
        activePaths: ["/teacher/lesson-kits"],
        icon: "lessonKits"
      },
      {
        href: "/teacher/assessments",
        label: { en: "Assessments", zh: "測驗" },
        activePaths: ["/teacher/assessments"],
        icon: "assessments"
      },
      {
        href: "/teacher/resources",
        label: { en: "Resources", zh: "資料庫" },
        activePaths: ["/teacher/resources"],
        icon: "resources"
      },
      {
        href: "/teacher/visualizations",
        label: { en: "Visualization studio", zh: "動畫創作室" },
        activePaths: ["/teacher/visualizations"],
        icon: "visualizations"
      }
    ]
  },
  {
    zone: "students",
    items: [
      {
        href: "/teacher/classes",
        label: { en: "Classes", zh: "班級" },
        activePaths: ["/teacher/classes", "/teacher/students"],
        icon: "classes"
      },
      {
        href: "/teacher/analytics",
        label: { en: "Analytics", zh: "學習分析" },
        activePaths: ["/teacher/analytics"],
        icon: "analytics"
      },
      {
        href: "/teacher/gradebook",
        label: { en: "Gradebook", zh: "成績冊" },
        activePaths: ["/teacher/gradebook"],
        icon: "gradebook"
      },
      {
        href: "/teacher/safety",
        label: { en: "Safety alerts", zh: "安全警示" },
        activePaths: ["/teacher/safety"],
        icon: "safety",
        badge: "openSafetyAlerts"
      },
      {
        href: "/teacher/rewards",
        label: { en: "Rewards", zh: "積分獎勵" },
        activePaths: ["/teacher/rewards"],
        icon: "rewards"
      }
    ]
  },
  {
    zone: "records",
    items: [
      {
        href: "/teacher/reports",
        label: { en: "Reports", zh: "報告" },
        activePaths: ["/teacher/reports"],
        icon: "reports"
      },
      {
        href: "/teacher/operations/notices",
        label: { en: "School admin", zh: "校務行政" },
        activePaths: ["/teacher/operations"],
        icon: "operations"
      }
    ]
  }
];

const teacherNavItems = teacherNavGroups.flatMap((group) => group.items);

export function isTeacherVisualizationAuthoringPath(pathname: string) {
  return pathname === "/teacher/visualizations" || pathname.startsWith("/teacher/visualizations/");
}

function isActivePath(pathname: string, item: TeacherNavItem) {
  if (item.href === "/teacher/dashboard") return pathname === "/teacher" || pathname === "/teacher/dashboard";
  return item.activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function activeZoneForPath(pathname: string): TeacherZone {
  for (const group of teacherNavGroups) {
    if (group.items.some((item) => isActivePath(pathname, item))) return group.zone;
  }
  return "today";
}

const navSignalsRefreshMs = 60_000;

export function TeacherShell({
  user,
  classes,
  children
}: {
  user: StudentSession;
  classes: TeacherClass[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t, text } = useSettings();
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);
  const [emptyWorkspacePath, setEmptyWorkspacePath] = useState(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navSignals, setNavSignals] = useState<TeacherNavSignals | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const navSignalsFetchedAtRef = useRef(0);
  const isEmptyWorkspace = classes.length === 0;
  const isVisualizationAuthoringPath = isTeacherVisualizationAuthoringPath(pathname);
  const shouldShowEmptyWorkspace = isEmptyWorkspace && !isVisualizationAuthoringPath;
  const effectivePathname = shouldShowEmptyWorkspace ? emptyWorkspacePath : pathname;
  const activeZone = activeZoneForPath(effectivePathname);
  const selectedClassId = searchParams.get("classId") ?? "all";
  const classFocusValue = classes.some((teacherClass) => teacherClass.id === selectedClassId) ? selectedClassId : "all";
  const searchQuery = searchParams.get("q") ?? "";
  const [workspaceQuery, setWorkspaceQuery] = useState(searchQuery);

  useEffect(() => {
    setPendingNavHref(null);
    setMobileNavOpen(false);
    if (classes.length === 0) setEmptyWorkspacePath(pathname);
  }, [classes.length, pathname]);

  useEffect(() => {
    if (classes.length !== 0) return;
    const syncEmptyWorkspacePath = () => setEmptyWorkspacePath(window.location.pathname);
    window.addEventListener("popstate", syncEmptyWorkspacePath);
    return () => window.removeEventListener("popstate", syncEmptyWorkspacePath);
  }, [classes.length]);

  useEffect(() => {
    if (!pendingNavHref) return;
    const timeout = window.setTimeout(() => setPendingNavHref(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [pendingNavHref]);

  useEffect(() => {
    setWorkspaceQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    // First-visit auto-launch: only on the dashboard with a real workspace, never
    // under test automation, and never once the teacher has completed/skipped it.
    if (isEmptyWorkspace || tourOpen) return;
    if (pathname !== "/teacher" && pathname !== "/teacher/dashboard") return;
    if (typeof navigator !== "undefined" && navigator.webdriver) return;
    try {
      if (readTeacherTourRecord(window.localStorage.getItem(teacherTourStorageKey(user.id)))) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setTourOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [isEmptyWorkspace, pathname, tourOpen, user.id]);

  useEffect(() => {
    // Badge counts are hints, not live counters: an empty workspace has nothing
    // to count, and repeat navigations within a minute reuse the last fetch.
    if (isEmptyWorkspace) return;
    if (Date.now() - navSignalsFetchedAtRef.current < navSignalsRefreshMs) return;
    const controller = new AbortController();
    fetch("/api/teacher/nav-signals", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { signals?: TeacherNavSignals } | null) => {
        if (!payload?.signals) return;
        navSignalsFetchedAtRef.current = Date.now();
        setNavSignals(payload.signals);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isEmptyWorkspace, pathname]);

  function navigateWithParam(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  function warmTeacherRoute(href: string) {
    if (isEmptyWorkspace && !isTeacherVisualizationAuthoringPath(href)) return;
    router.prefetch(href);
  }

  function navigateEmptyWorkspace(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (classes.length !== 0) return false;
    if (isTeacherVisualizationAuthoringPath(href)) return false;
    event.preventDefault();
    setPendingNavHref(null);
    setMobileNavOpen(false);
    setEmptyWorkspacePath(href);
    window.history.pushState(null, "", href);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  const activeNavItem = teacherNavItems.find((item) => isActivePath(effectivePathname, item));

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          aria-expanded={mobileNavOpen}
          aria-controls="teacher-navigation-panel"
          onClick={() => setMobileNavOpen((open) => !open)}
          className="focus-ring glass-panel flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", zoneBarClass[activeZone])} aria-hidden="true" />
            <span className="truncate text-sm font-black text-slate-950 dark:text-white">
              {activeNavItem ? text(activeNavItem.label) : t({ en: "Teacher Console", zh: "教師工作台" })}
            </span>
          </span>
          <span className="shrink-0 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {mobileNavOpen ? t({ en: "Close", zh: "收起" }) : t({ en: "Menu", zh: "選單" })}
          </span>
        </button>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside
          id="teacher-navigation-panel"
          data-tour="nav"
          className={cn("glass-panel min-w-0 h-fit p-3 lg:sticky lg:top-24 lg:block", mobileNavOpen ? "block" : "hidden")}
        >
          <Link href="/teacher/dashboard" prefetch={isEmptyWorkspace ? false : undefined} className="focus-ring block rounded-2xl px-3 py-3 transition hover:bg-slate-950/[0.04] dark:hover:bg-white/[0.06]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Teacher Console", zh: "教師工作台" })}
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              {formatLearnerName(user.name, language)}
            </h2>
          </Link>

          <nav className="mt-2 grid gap-1" aria-label={t({ en: "Teacher navigation", zh: "教師導覽" })}>
            {teacherNavGroups.map((group) => (
              <div key={group.zone} className="mt-2 first:mt-0">
                <p className={cn("flex items-center gap-2 px-4 pb-1.5 pt-2 text-[11px] font-black uppercase tracking-[0.18em]", zoneEyebrowClass[group.zone])}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", zoneBarClass[group.zone])} aria-hidden="true" />
                  {text(teacherZoneLabels[group.zone])}
                </p>
                <div className="grid gap-1">
                  {group.items.map((item) => {
                    // The active highlight must follow the real pathname; a click that never
                    // completes navigation should show a pending cue, not a moved highlight.
                    const active = isActivePath(effectivePathname, item);
                    const pending = !active && pendingNavHref ? isActivePath(pendingNavHref, item) : false;
                    const badgeCount = item.badge && navSignals ? navSignals[item.badge] : 0;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={isEmptyWorkspace && !isTeacherVisualizationAuthoringPath(item.href) ? false : undefined}
                        aria-current={active ? "page" : undefined}
                        onClick={(event) => {
                          if (navigateEmptyWorkspace(event, item.href)) return;
                          if (!active) setPendingNavHref(item.href);
                        }}
                        onFocus={() => warmTeacherRoute(item.href)}
                        onMouseEnter={() => warmTeacherRoute(item.href)}
                        onTouchStart={() => warmTeacherRoute(item.href)}
                        className={cn(
                          "focus-ring flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.99]",
                          active
                            ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950"
                            : pending
                              ? "animate-pulse bg-slate-950/[0.06] text-slate-700 dark:bg-white/[0.1] dark:text-slate-200"
                              : "text-slate-600 hover:bg-slate-950/[0.04] hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
                        )}
                      >
                        <TeacherNavIcon
                          name={item.icon}
                          className={cn("h-[18px] w-[18px] shrink-0", active ? "" : "opacity-70")}
                        />
                        <span className="min-w-0 flex-1 truncate">{text(item.label)}</span>
                        {badgeCount > 0 ? (
                          <span
                            aria-hidden="true"
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black leading-4",
                              active
                                ? "bg-white/20 text-white dark:bg-slate-950/15 dark:text-slate-950"
                                : "bg-amber-400/20 text-amber-800 dark:bg-amber-300/20 dark:text-amber-100"
                            )}
                          >
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header data-tour="workspace-header" className={cn("glass-panel min-w-0 p-4 sm:p-5", zoneTopBorderClass[activeZone])}>
            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(220px,300px)_minmax(0,1fr)_auto] xl:items-center">
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                  {t({ en: "Class focus", zh: "班級焦點" })}
                </span>
                <select
                  value={classFocusValue}
                  onChange={(event) => navigateWithParam("classId", event.target.value)}
                  className="focus-ring h-11 min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                >
                  <option value="all">{t({ en: "All classes", zh: "全部班級" })}</option>
                  {classes.length ? (
                    classes.map((teacherClass) => (
                      <option key={teacherClass.id} value={teacherClass.id}>
                        {teacherClass.name} · {formatGradeLabel(teacherClass.grade, language, true)}
                      </option>
                    ))
                  ) : (
                    <option value="all">{t({ en: "No classes yet", zh: "尚未建立班級" })}</option>
                  )}
                </select>
              </label>

              <form
                className="grid min-w-0 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  navigateWithParam("q", String(form.get("q") ?? ""));
                }}
              >
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {t({ en: "Search workspace", zh: "搜尋工作台" })}
                </span>
                <input
                  name="q"
                  type="search"
                  value={workspaceQuery}
                  onChange={(event) => setWorkspaceQuery(event.target.value)}
                  placeholder={t({ en: "Search students, assignments, resources", zh: "搜尋學生、作業、資源" })}
                  className="focus-ring h-11 min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                />
              </form>

              <div className="hidden items-center gap-2 sm:flex xl:justify-end">
                <button
                  type="button"
                  data-tour="tour-button"
                  onClick={() => setTourOpen(true)}
                  className="focus-ring flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-black text-cyan-700 dark:bg-cyan-300/15 dark:text-cyan-200"
                  >
                    ?
                  </span>
                  {t({ en: "Tour", zh: "導覽" })}
                </button>
                <Link
                  href="/teacher/analytics"
                  className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                >
                  {t(dictionary.nav.progress)}
                </Link>
              </div>
            </div>
          </header>

          <div className="mt-5 min-w-0">
            {shouldShowEmptyWorkspace ? <TeacherEmptyWorkspace path={emptyWorkspacePath} user={user} /> : children}
          </div>
        </div>
      </div>

      <TeacherGuidedTour userId={user.id} open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
