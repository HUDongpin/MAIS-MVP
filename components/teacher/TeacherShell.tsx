"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, formatLearnerName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { StudentSession, TeacherClass } from "@/types";

const teacherNavItems = [
  {
    href: "/teacher",
    label: { en: "Overview", zh: "總覽" },
    activePaths: ["/teacher"]
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
    href: "/teacher/live",
    label: { en: "Live", zh: "課堂模式" },
    activePaths: ["/teacher/live"]
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
    href: "/teacher/inbox",
    label: { en: "Inbox", zh: "收件匣" },
    activePaths: ["/teacher/inbox"]
  }
];

function isActivePath(pathname: string, item: (typeof teacherNavItems)[number]) {
  if (item.href === "/teacher") return pathname === "/teacher";
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
  const { language, t, text } = useSettings();
  const firstClass = classes[0];

  function navigateWithParam(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-panel h-fit p-3 lg:sticky lg:top-24">
          <Link href="/teacher" className="focus-ring block rounded-2xl px-3 py-3 transition hover:bg-slate-950/[0.04] dark:hover:bg-white/[0.06]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Teacher Console", zh: "教師工作台" })}
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              {formatLearnerName(user.name, language)}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {user.role === "admin" ? t({ en: "Admin access", zh: "管理員權限" }) : t({ en: "Teacher access", zh: "教師權限" })}
            </p>
          </Link>

          <nav className="mt-3 grid gap-1" aria-label={t({ en: "Teacher navigation", zh: "教師導覽" })}>
            {teacherNavItems.map((item) => {
              const active = isActivePath(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring rounded-2xl px-4 py-3 text-sm font-black transition",
                    active
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950"
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
          <header className="glass-panel p-4 sm:p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(220px,300px)_minmax(0,1fr)_auto] xl:items-center">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                  {t({ en: "Class focus", zh: "班級焦點" })}
                </span>
	                <select
	                  defaultValue="all"
	                  onChange={(event) => navigateWithParam("classId", event.target.value)}
	                  className="focus-ring h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
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
	                className="grid gap-2"
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
	                  placeholder={t({ en: "Search students, assignments, resources", zh: "搜尋學生、作業、資源" })}
	                  className="focus-ring h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
	                />
	              </form>

              <div className="hidden items-center gap-2 sm:flex xl:justify-end">
                <Link
                  href="/dashboard"
                  className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                >
                  {t(dictionary.nav.progress)}
                </Link>
              </div>
            </div>
          </header>

          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
