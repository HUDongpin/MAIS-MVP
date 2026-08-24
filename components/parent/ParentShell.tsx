"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { ParentNavIcon, type ParentNavIconName } from "@/components/parent/parentNavIcons";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, formatLearnerName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ParentChildSummarySafe, ParentIdentitySafe } from "@/types";

const parentNavItems: Array<{
  href: string;
  label: { en: string; zh: string; zhHans: string };
  activePaths: string[];
  icon: ParentNavIconName;
}> = [
  { href: "/parent", label: { en: "Overview", zh: "總覽", zhHans: "总览" }, activePaths: ["/parent"], icon: "overview" },
  { href: "/parent/reports", label: { en: "Reports", zh: "報告", zhHans: "报告" }, activePaths: ["/parent/reports"], icon: "reports" },
  { href: "/parent/messages", label: { en: "Messages", zh: "家校私信", zhHans: "家校私信" }, activePaths: ["/parent/messages"], icon: "messages" },
  { href: "/parent/notices", label: { en: "Notices", zh: "通知", zhHans: "通知" }, activePaths: ["/parent/notices"], icon: "notices" },
  { href: "/parent/connect", label: { en: "Connect child", zh: "綁定孩子", zhHans: "绑定孩子" }, activePaths: ["/parent/connect"], icon: "connect" }
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

function parentHrefWithChildFocus(href: string, selectedStudentId: string) {
  if (!selectedStudentId || href === "/parent/connect") return href;
  const params = new URLSearchParams();
  params.set("studentId", selectedStudentId);
  return `${href}?${params.toString()}`;
}

export function ParentShell({
  parent,
  children: linkedChildren,
  childrenContent
}: {
  parent: ParentIdentitySafe;
  children: ParentChildSummarySafe[];
  childrenContent: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t } = useSettings();
  const detailStudentId = childIdFromDetailPath(pathname);
  const routeStudentId = detailStudentId && linkedChildren.some((child) => child.student.id === detailStudentId) ? detailStudentId : null;
  const selectedStudentId = routeStudentId ?? searchParams.get("studentId") ?? linkedChildren[0]?.student.id ?? "";
  const overviewHref = parentHrefWithChildFocus("/parent", selectedStudentId);

  const switchChild = (studentId: string) => {
    if (!studentId) return;
    if (pathname.startsWith("/parent/children/")) {
      router.push(`/parent/children/${encodeURIComponent(studentId)}`);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentId", studentId);
    if (pathname === "/parent/messages") {
      params.delete("thread");
      params.delete("reportId");
      params.delete("subject");
    }
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  return (
    <div className="page-container py-5 sm:py-7" data-parent-shell>
      <header className="glass-panel overflow-hidden p-3 sm:p-4">
        <div className="grid gap-4 px-1 sm:px-2 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-end">
          <Link href={overviewHref} className="focus-ring block rounded-2xl px-2 py-2 transition hover:bg-slate-950/[0.03] dark:hover:bg-white/[0.05]">
            <p className="text-xs font-black tracking-[0.08em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Family space", zh: "家庭空間", zhHans: "家庭空间" })}
            </p>
            <p className="mt-2 break-words text-lg font-black text-slate-950 dark:text-white">{formatLearnerName(parent.name, language)}</p>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              {t({ en: "Family-school partnership", zh: "家校合作", zhHans: "家校合作" })}
            </p>
          </Link>

          <label className="grid gap-2 px-2 py-1">
            <span className="text-xs font-black tracking-[0.08em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Child focus", zh: "孩子焦點", zhHans: "孩子焦点" })}
            </span>
            <select
              value={selectedStudentId}
              onChange={(event) => switchChild(event.target.value)}
              className="focus-ring h-11 min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            >
              {linkedChildren.length ? (
                linkedChildren.map((child) => (
                  <option key={child.student.id} value={child.student.id}>
                    {child.student.name} · {formatGradeLabel(child.student.grade, language, true)}
                  </option>
                ))
              ) : (
                <option value="">{t({ en: "No linked child yet", zh: "尚未綁定孩子", zhHans: "尚未绑定孩子" })}</option>
              )}
            </select>
          </label>
        </div>

        <nav className="-mx-3 mt-3 overflow-x-auto border-t border-slate-200/70 px-3 pt-3 dark:border-white/10 sm:-mx-4 sm:px-4" aria-label={t({ en: "Parent navigation", zh: "家長導覽", zhHans: "家长导航" })}>
          <div className="flex min-w-max gap-2">
            {parentNavItems.map((item) => {
              const active = isActivePath(pathname, item);
              const preserveMessagesAll = item.href === "/parent/messages" && pathname === "/parent/messages" && !searchParams.has("studentId");
              const href = preserveMessagesAll ? "/parent/messages" : parentHrefWithChildFocus(item.href, selectedStudentId);
              return (
                <Link
                  key={item.href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black transition",
                    active
                      ? "border-cyan-200/90 bg-cyan-50/90 text-slate-950 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-white"
                      : "border-transparent text-slate-600 hover:border-slate-200/80 hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  )}
                >
                  <ParentNavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                  {t(item.label)}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <div className="mt-5 min-w-0">{childrenContent}</div>
    </div>
  );
}
