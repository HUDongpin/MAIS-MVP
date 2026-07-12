"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { TeacherEmptyWorkspace } from "@/components/teacher/TeacherEmptyWorkspace";
import { formatGradeLabel, formatLearnerName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { StudentSession, TeacherClass } from "@/types";

const teacherNavItems = [
  {
    href: "/teacher/dashboard",
    label: { en: "Overview", zh: "總覽" },
    activePaths: ["/teacher/dashboard"]
  },
  {
    href: "/teacher/classes",
    label: { en: "Classes", zh: "班級" },
    activePaths: ["/teacher/classes", "/teacher/students"]
  },
  {
    href: "/teacher/analytics",
    label: { en: "Analytics", zh: "學習分析" },
    activePaths: ["/teacher/analytics"]
  },
  {
    href: "/teacher/rewards",
    label: { en: "Rewards", zh: "積分獎勵" },
    activePaths: ["/teacher/rewards"]
  },
  {
    href: "/teacher/lesson-kits",
    label: { en: "Lesson kits", zh: "備課包" },
    activePaths: ["/teacher/lesson-kits"]
  },
  {
    href: "/teacher/classroom-sessions",
    label: { en: "Live", zh: "課堂模式" },
    activePaths: ["/teacher/classroom-sessions"]
  },
  {
    href: "/teacher/assignments",
    label: { en: "Assignments", zh: "作業" },
    activePaths: ["/teacher/assignments"]
  },
  {
    href: "/teacher/resources",
    label: { en: "Resources", zh: "資料庫" },
    activePaths: ["/teacher/resources"]
  },
  {
    href: "/teacher/assessments",
    label: { en: "Assessments", zh: "測驗" },
    activePaths: ["/teacher/assessments"]
  },
  {
    href: "/teacher/reports",
    label: { en: "Reports", zh: "報告" },
    activePaths: ["/teacher/reports"]
  },
  {
    href: "/teacher/communications/inbox",
    label: { en: "Inbox", zh: "收件匣" },
    activePaths: ["/teacher/communications"]
  },
  {
    href: "/teacher/operations/notices",
    label: { en: "Operations", zh: "校務落地" },
    activePaths: ["/teacher/operations"]
  }
];

function isActivePath(pathname: string, item: (typeof teacherNavItems)[number]) {
  if (item.href === "/teacher/dashboard") return pathname === "/teacher" || pathname === "/teacher/dashboard";
  return item.activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

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
  const isEmptyWorkspace = classes.length === 0;
  const effectivePathname = isEmptyWorkspace ? emptyWorkspacePath : pathname;
  const selectedClassId = searchParams.get("classId") ?? "all";
  const classFocusValue = classes.some((teacherClass) => teacherClass.id === selectedClassId) ? selectedClassId : "all";
  const searchQuery = searchParams.get("q") ?? "";
  const [workspaceQuery, setWorkspaceQuery] = useState(searchQuery);

  useEffect(() => {
    setPendingNavHref(null);
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

  function navigateWithParam(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  function warmTeacherRoute(href: string) {
    if (isEmptyWorkspace) return;
    router.prefetch(href);
  }

  function navigateEmptyWorkspace(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (classes.length !== 0) return false;
    event.preventDefault();
    setPendingNavHref(null);
    setEmptyWorkspacePath(href);
    window.history.pushState(null, "", href);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-panel min-w-0 h-fit p-3 lg:sticky lg:top-24">
          <Link href="/teacher/dashboard" prefetch={isEmptyWorkspace ? false : undefined} className="focus-ring block rounded-2xl px-3 py-3 transition hover:bg-slate-950/[0.04] dark:hover:bg-white/[0.06]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Teacher Console", zh: "教師工作台" })}
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              {formatLearnerName(user.name, language)}
            </h2>
          </Link>

          <nav className="mt-3 grid gap-1" aria-label={t({ en: "Teacher navigation", zh: "教師導覽" })}>
            {teacherNavItems.map((item) => {
              // The active highlight must follow the real pathname; a click that never
              // completes navigation should show a pending cue, not a moved highlight.
              const active = isActivePath(effectivePathname, item);
              const pending = !active && pendingNavHref ? isActivePath(pendingNavHref, item) : false;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={isEmptyWorkspace ? false : undefined}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => {
                    if (navigateEmptyWorkspace(event, item.href)) return;
                    if (!active) setPendingNavHref(item.href);
                  }}
                  onFocus={() => warmTeacherRoute(item.href)}
                  onMouseEnter={() => warmTeacherRoute(item.href)}
                  onTouchStart={() => warmTeacherRoute(item.href)}
                  className={cn(
                    "focus-ring rounded-2xl px-4 py-3 text-sm font-black transition active:scale-[0.99]",
                    active
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950"
                      : pending
                        ? "animate-pulse bg-slate-950/[0.06] text-slate-700 dark:bg-white/[0.1] dark:text-slate-200"
                        : "text-slate-600 hover:bg-slate-950/[0.04] hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
                  )}
                >
                  {text(item.label)}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="glass-panel min-w-0 p-4 sm:p-5">
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
                <Link
                  href="/teacher/analytics"
                  className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                >
                  {t(dictionary.nav.progress)}
                </Link>
              </div>
            </div>
          </header>

          <div className="mt-5 min-w-0">
            {classes.length === 0 ? <TeacherEmptyWorkspace path={emptyWorkspacePath} user={user} /> : children}
          </div>
        </div>
      </div>
    </div>
  );
}
