"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { assignmentContentTypeLabels, submissionStatusLabels } from "@/components/teacher/teacherLabels";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { studentAssignmentHref, studentAssignmentsPath } from "@/lib/studentAssignmentRoutes";
import { studentResourceHref } from "@/lib/studentResourceRoutes";
import type { StudentAssignmentItem } from "@/types";

type AssignmentsResponse = {
  assignments?: unknown;
};

function readAssignments(value: unknown) {
  const response = value as AssignmentsResponse | null;
  return Array.isArray(response?.assignments) ? (response.assignments as StudentAssignmentItem[]) : [];
}

function resourceAssignments(items: StudentAssignmentItem[]) {
  return items.filter((item) => item.assignment.contentType === "resource" && item.assignment.targetId);
}

export default function StudentResourcesPage() {
  const { currentUser, settingsReady, t, text } = useSettings();
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const loadErrorCopy = t({ en: "Could not load resources.", zh: "暫時無法載入資源。", zhHans: "暂时无法载入资源。" });

  const loadResources = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/assignments", { cache: "no-store", signal });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(loadErrorCopy);
      setAssignments(resourceAssignments(readAssignments(payload)));
    } catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : loadErrorCopy);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [loadErrorCopy]);

  useEffect(() => {
    if (!settingsReady) return;
    if (!currentUser || currentUser.role !== "student") {
      setAssignments([]);
      setIsLoading(false);
      setLoadError("");
      return;
    }

    const controller = new AbortController();
    void loadResources(controller.signal);
    return () => controller.abort();
  }, [currentUser?.id, currentUser?.role, loadResources, settingsReady]);

  if (isLoading) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel min-h-72 p-6 sm:p-8" aria-live="polite" role="status">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Student resources", zh: "學生資源", zhHans: "学生资源" })}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{t({ en: "My resources", zh: "我的資源", zhHans: "我的资源" })}</h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
            {t({ en: "Loading assigned slides, papers, and files.", zh: "正在載入已分派的課件、試卷與檔案。", zhHans: "正在载入已分派的课件、试卷与档案。" })}
          </p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-cyan-100/80 dark:bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-400 dark:bg-cyan-300" />
          </div>
        </section>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "student") {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel p-6 sm:p-8">
          <h1 className="text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Resources are for student accounts", zh: "資源頁面只供學生帳戶使用", zhHans: "资源页面只供学生账户使用" })}</h1>
          <Link href="/login" className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t(dictionary.nav.login)}
          </Link>
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel p-6 sm:p-8">
          <h1 className="text-3xl font-black text-slate-950 dark:text-white">{loadError}</h1>
          <button type="button" onClick={() => void loadResources()} className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Retry", zh: "重試", zhHans: "重试" })}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container py-10 sm:py-12">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Student resources", zh: "學生資源", zhHans: "学生资源" })}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{t({ en: "My resources", zh: "我的資源", zhHans: "我的资源" })}</h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
          {t({
            en: "Slides, papers, and files your teacher assigned. Open a file here or from your assignments list.",
            zh: "老師分派的課件、試卷與檔案。可在此開啟，或從作業清單進入。",
            zhHans: "老师分派的课件、试卷与档案。可在此打开，或从作业清单进入。"
          })}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={studentAssignmentsPath} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "All assignments", zh: "全部作業", zhHans: "全部作业" })}
          </Link>
          <Link href="/dashboard" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t(dictionary.nav.dashboard)}
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        {assignments.length ? assignments.map((item) => {
          const resourceId = item.assignment.targetId;
          if (!resourceId) return null;
          return (
            <article key={item.assignment.id} className="soft-panel grid gap-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-200/80 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-800 dark:border-cyan-200/25 dark:bg-cyan-300/[0.12] dark:text-cyan-100">
                  {text(assignmentContentTypeLabels.resource)}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
                  {text(submissionStatusLabels[item.submission.status])}
                </span>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.className}</p>
                <h2 className="mt-2 text-lg font-black leading-tight text-slate-950 dark:text-white">{text(item.assignment.title)}</h2>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{text(item.assignment.description)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={studentResourceHref(resourceId)} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
                  {t({ en: "Open resource", zh: "開啟資源", zhHans: "打开资源" })}
                </Link>
                <Link href={studentAssignmentHref(item.assignment.id)} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
                  {t({ en: "Open assignment", zh: "打開作業", zhHans: "打开作业" })}
                </Link>
              </div>
            </article>
          );
        }) : (
          <div className="soft-panel p-6 text-sm font-bold text-slate-500 dark:text-slate-400">
            {t({
              en: "No assigned resources yet. When a teacher shares slides or papers, they will appear here.",
              zh: "暫時沒有已分派的資源。老師分享課件或試卷後，會顯示在這裡。",
              zhHans: "暂时没有已分派的资源。老师分享课件或试卷后，会显示在这里。"
            })}
          </div>
        )}
      </section>
    </div>
  );
}
