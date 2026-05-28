"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, formatLearnerName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ParentChildSummary, StudentSession } from "@/types";

const parentNavItems = [
  { href: "/parent", label: { en: "Overview", zh: "總覽" }, activePaths: ["/parent"] },
  { href: "/parent/reports", label: { en: "Reports", zh: "報告" }, activePaths: ["/parent/reports"] },
  { href: "/parent/messages", label: { en: "Messages", zh: "家校私信" }, activePaths: ["/parent/messages"] },
  { href: "/parent/connect", label: { en: "Connect child", zh: "綁定孩子" }, activePaths: ["/parent/connect"] }
];

function isActivePath(pathname: string, item: (typeof parentNavItems)[number]) {
  if (item.href === "/parent") return pathname === "/parent";
  return item.activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function childIdFromDetailPath(pathname: string) {
  const match = pathname.match(/^\/parent\/children\/([^/]+)$/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function ParentShell({
  parent,
  children: linkedChildren,
  childrenContent
}: {
  parent: StudentSession;
  children: ParentChildSummary[];
  childrenContent: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t } = useSettings();
  const detailStudentId = childIdFromDetailPath(pathname);
  const routeStudentId = detailStudentId && linkedChildren.some((child) => child.student.id === detailStudentId) ? detailStudentId : null;
  const selectedStudentId = routeStudentId ?? searchParams.get("studentId") ?? linkedChildren[0]?.student.id ?? "";

  const switchChild = (studentId: string) => {
    if (!studentId) return;
    if (pathname.startsWith("/parent/children/")) {
      router.push(`/parent/children/${encodeURIComponent(studentId)}`);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentId", studentId);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-panel h-fit p-3 lg:sticky lg:top-24">
          <Link href="/parent" className="focus-ring block rounded-2xl px-3 py-3 transition hover:bg-slate-950/[0.04] dark:hover:bg-white/[0.06]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Parent Console", zh: "家長工作台" })}
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{formatLearnerName(parent.name, language)}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t({ en: "Family-school partnership", zh: "家校合作" })}
            </p>
          </Link>

          <nav className="mt-3 grid gap-1" aria-label={t({ en: "Parent navigation", zh: "家長導覽" })}>
            {parentNavItems.map((item) => {
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
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="glass-panel p-4 sm:p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] xl:items-center">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                  {t({ en: "Child focus", zh: "孩子焦點" })}
                </span>
                <select
                  value={selectedStudentId}
                  onChange={(event) => switchChild(event.target.value)}
                  className="focus-ring h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                >
                  {linkedChildren.length ? (
                    linkedChildren.map((child) => (
                      <option key={child.student.id} value={child.student.id}>
                        {child.student.name} · {formatGradeLabel(child.student.grade, language, true)}
                      </option>
                    ))
                  ) : (
                    <option value="">{t({ en: "No linked child yet", zh: "尚未綁定孩子" })}</option>
                  )}
                </select>
              </label>

              <div className="min-w-0 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                {linkedChildren.length
                  ? t({ en: "Use the console to see learning signals, parent summaries, and teacher messages.", zh: "在此查看學習訊號、家長摘要和教師私信。" })
                  : t({ en: "Enter a parent invite code from the teacher to connect a child.", zh: "輸入教師提供的家長邀請碼即可綁定孩子。" })}
              </div>
            </div>
          </header>

          <div className="mt-5">{childrenContent}</div>
        </div>
      </div>
    </div>
  );
}
