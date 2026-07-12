"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { assignmentContentTypeLabels, submissionStatusLabels } from "@/components/teacher/teacherLabels";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { lessonHrefForSlug, studentLessonsPath } from "@/lib/lessonLinks";
import { studentAssessmentHref } from "@/lib/studentAssessmentRoutes";
import { studentAssignmentHref, studentAssignmentsPath } from "@/lib/studentAssignmentRoutes";
import { studentVisualizationToolsPath } from "@/lib/visualizationRoutes";
import type { StudentAssignmentItem, Submission } from "@/types";

type AssignmentsResponse = {
  assignments?: unknown;
};

type StudentAssignmentsViewProps = {
  assignmentId?: string;
};

function readAssignments(value: unknown) {
  const response = value as AssignmentsResponse | null;
  return Array.isArray(response?.assignments) ? (response.assignments as StudentAssignmentItem[]) : [];
}

function formatDate(value: string | null, language: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat(language === "en" ? "en-HK" : language === "zh-Hans" ? "zh-CN" : "zh-HK", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function assignmentTargetHref(item: StudentAssignmentItem) {
  const targetId = item.assignment.targetId;
  if (item.assignment.contentType === "lesson") return targetId ? lessonHrefForSlug(targetId) : studentLessonsPath;
  if (item.assignment.contentType === "practice") return "/practice";
  if (item.assignment.contentType === "visualization") return studentVisualizationToolsPath;
  if (item.assignment.contentType === "resource" && targetId) return `/resource/${encodeURIComponent(targetId)}`;
  if (item.assignment.contentType === "assessment" && targetId) return studentAssessmentHref(targetId);
  return "/practice";
}

function statusTone(status: Submission["status"]) {
  if (status === "graded" || status === "resolved") return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-200/25 dark:bg-emerald-300/[0.12] dark:text-emerald-100";
  if (status === "correction-required" || status === "late") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-200/25 dark:bg-amber-300/[0.12] dark:text-amber-100";
  if (status === "submitted" || status === "correction-submitted") return "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-200/25 dark:bg-cyan-300/[0.12] dark:text-cyan-100";
  return "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200";
}

function scoreLabel(score: number | null) {
  return score === null ? "-" : `${score}/100`;
}

function AssignmentStatusPill({ item }: { item: StudentAssignmentItem }) {
  const { text } = useSettings();
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone(item.submission.status)}`}>
      {text(submissionStatusLabels[item.submission.status])}
    </span>
  );
}

function AssignmentCard({ item }: { item: StudentAssignmentItem }) {
  const { language, t, text } = useSettings();
  const dueDate = formatDate(item.assignment.dueAt, language);

  return (
    <article className="soft-panel grid gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-200/80 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-800 dark:border-cyan-200/25 dark:bg-cyan-300/[0.12] dark:text-cyan-100">
          {text(assignmentContentTypeLabels[item.assignment.contentType])}
        </span>
        <AssignmentStatusPill item={item} />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.className}</p>
        <Link href={studentAssignmentHref(item.assignment.id)} className="focus-ring mt-2 inline-flex break-words text-lg font-black leading-tight text-slate-950 underline-offset-4 hover:underline dark:text-white">
          {text(item.assignment.title)}
        </Link>
        <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{text(item.assignment.description)}</p>
      </div>
      <div className="grid gap-2 text-sm font-bold text-slate-600 sm:grid-cols-3 dark:text-slate-300">
        <span>{t({ en: "Due", zh: "截止", zhHans: "截止" })}: {dueDate ?? t({ en: "No due date", zh: "無截止日期", zhHans: "无截止日期" })}</span>
        <span>{t({ en: "Score", zh: "分數", zhHans: "分数" })}: {scoreLabel(item.submission.score)}</span>
        <span>{t({ en: "Updated", zh: "更新", zhHans: "更新" })}: {formatDate(item.submission.updatedAt, language)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={studentAssignmentHref(item.assignment.id)} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
          {t({ en: "Open assignment", zh: "打開作業", zhHans: "打开作业" })}
        </Link>
        <Link href={assignmentTargetHref(item)} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
          {t({ en: "Open target", zh: "開啟內容", zhHans: "打开内容" })}
        </Link>
      </div>
    </article>
  );
}

export function StudentAssignmentsView({ assignmentId }: StudentAssignmentsViewProps) {
  const { currentUser, language, settingsReady, t, text } = useSettings();
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const assignmentLoadErrorCopy = t({ en: "Could not load assignments.", zh: "暫時無法載入作業。", zhHans: "暂时无法载入作业。" });

  const selectedAssignment = useMemo(
    () => assignmentId ? assignments.find((item) => item.assignment.id === assignmentId) ?? null : null,
    [assignmentId, assignments]
  );
  const openAssignments = assignments.filter((item) => item.submission.status !== "graded" && item.submission.status !== "resolved");
  const dueSoonAssignments = assignments.filter((item) => item.assignment.dueAt && new Date(item.assignment.dueAt).getTime() >= Date.now()).slice(0, 3);

  const loadAssignments = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/assignments", { cache: "no-store", signal });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(assignmentLoadErrorCopy);
      setAssignments(readAssignments(payload));
    } catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : assignmentLoadErrorCopy);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [assignmentLoadErrorCopy]);

  useEffect(() => {
    if (!settingsReady) return;
    if (!currentUser || currentUser.role !== "student") {
      setAssignments([]);
      setIsLoading(false);
      setLoadError("");
      return;
    }

    const controller = new AbortController();
    void loadAssignments(controller.signal);
    return () => controller.abort();
  }, [currentUser?.id, currentUser?.role, loadAssignments, settingsReady]);

  useEffect(() => {
    setDraft("");
    setMessage("");
  }, [assignmentId]);

  async function submitAssignment(item: StudentAssignmentItem) {
    if (!draft.trim()) return;
    setMessage("");
    setIsSubmitting(true);
    const endpoint = item.submission.status === "correction-required"
      ? `/api/assignments/${encodeURIComponent(item.assignment.id)}/corrections`
      : `/api/assignments/${encodeURIComponent(item.assignment.id)}/submissions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerText: draft.trim(), inputType: "text" })
    });
    const payload = await response.json().catch(() => null) as { submission?: Submission } | null;
    setIsSubmitting(false);

    if (!response.ok || !payload?.submission) {
      setMessage(t({ en: "Could not submit this assignment yet.", zh: "暫時未能提交此作業。", zhHans: "暂时未能提交此作业。" }));
      return;
    }

    setAssignments((current) => current.map((candidate) =>
      candidate.assignment.id === item.assignment.id ? { ...candidate, submission: payload.submission as Submission } : candidate
    ));
    setDraft("");
    setMessage(t({ en: "Assignment submitted.", zh: "作業已提交。", zhHans: "作业已提交。" }));
  }

  if (isLoading) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel min-h-72 p-6 sm:p-8" aria-live="polite" role="status">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Student assignments", zh: "學生作業", zhHans: "学生作业" })}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{t({ en: "My assignments", zh: "我的作業", zhHans: "我的作业" })}</h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
            <span className="block">{t({ en: "Loading assignments", zh: "正在載入作業", zhHans: "正在载入作业" })}</span>
            {settingsReady
              ? t({ en: "Fetching your class missions, due dates, and submission status.", zh: "正在載入你的課堂任務、截止日期與提交狀態。", zhHans: "正在载入你的课堂任务、截止日期与提交状态。" })
              : t({ en: "Checking your student session before opening the assignment list.", zh: "正在檢查學生登入狀態，然後開啟作業清單。", zhHans: "正在检查学生登录状态，然后打开作业清单。" })}
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
          <h1 className="text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Assignments are for student accounts", zh: "作業頁面只供學生帳戶使用", zhHans: "作业页面只供学生账户使用" })}</h1>
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
          <button type="button" onClick={() => void loadAssignments()} className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Retry", zh: "重試", zhHans: "重试" })}
          </button>
        </section>
      </div>
    );
  }

  if (assignmentId && !selectedAssignment) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Student assignments", zh: "學生作業", zhHans: "学生作业" })}</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Assignment unavailable", zh: "未能開啟此作業", zhHans: "未能打开此作业" })}</h1>
          <Link href={studentAssignmentsPath} className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Back to assignments", zh: "返回作業", zhHans: "返回作业" })}
          </Link>
        </section>
      </div>
    );
  }

  if (selectedAssignment) {
    const dueDate = formatDate(selectedAssignment.assignment.dueAt, language);
    const targetHref = assignmentTargetHref(selectedAssignment);
    const latestAttempt = selectedAssignment.submission.latestAttempt;

    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
                {selectedAssignment.className} · {text(assignmentContentTypeLabels[selectedAssignment.assignment.contentType])}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{text(selectedAssignment.assignment.title)}</h1>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{text(selectedAssignment.assignment.description)}</p>
            </div>
            <AssignmentStatusPill item={selectedAssignment} />
          </div>
          <div className="mt-6 grid gap-3 text-sm font-bold text-slate-600 sm:grid-cols-2 lg:grid-cols-4 dark:text-slate-300">
            <span className="soft-panel px-4 py-3">{t({ en: "Due", zh: "截止", zhHans: "截止" })}: {dueDate ?? t({ en: "No due date", zh: "無截止日期", zhHans: "无截止日期" })}</span>
            <span className="soft-panel px-4 py-3">{t({ en: "Score", zh: "分數", zhHans: "分数" })}: {scoreLabel(selectedAssignment.submission.score)}</span>
            <span className="soft-panel px-4 py-3">{t({ en: "Submitted", zh: "提交", zhHans: "提交" })}: {formatDate(selectedAssignment.submission.submittedAt, language) ?? "-"}</span>
            <span className="soft-panel px-4 py-3">{t({ en: "Updated", zh: "更新", zhHans: "更新" })}: {formatDate(selectedAssignment.submission.updatedAt, language)}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={studentAssignmentsPath} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
              {t({ en: "All assignments", zh: "全部作業", zhHans: "全部作业" })}
            </Link>
            <Link href={targetHref} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
              {t({ en: "Open target content", zh: "開啟指定內容", zhHans: "打开指定内容" })}
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="glass-panel p-5 sm:p-6">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              {selectedAssignment.submission.status === "correction-required"
                ? t({ en: "Correction", zh: "訂正內容", zhHans: "订正内容" })
                : t({ en: "Submission", zh: "提交內容", zhHans: "提交内容" })}
            </h2>
            <textarea
              rows={8}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="focus-ring mt-4 w-full rounded-2xl border border-cyan-100/80 bg-white/80 px-4 py-3 text-sm text-slate-950 dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                disabled={isSubmitting || !draft.trim()}
                onClick={() => void submitAssignment(selectedAssignment)}
                type="button"
                className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
              >
                {isSubmitting
                  ? t({ en: "Submitting", zh: "提交中", zhHans: "提交中" })
                  : selectedAssignment.submission.status === "correction-required"
                    ? t({ en: "Submit correction", zh: "提交訂正", zhHans: "提交订正" })
                    : t({ en: "Submit work", zh: "提交作業", zhHans: "提交作业" })}
              </button>
              {message ? <p className="text-sm font-bold text-cyan-700 dark:text-cyan-200">{message}</p> : null}
            </div>
          </div>

          <aside className="grid gap-4">
            {selectedAssignment.submission.feedback ? (
              <section className="soft-panel p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Teacher feedback", zh: "老師回饋", zhHans: "老师反馈" })}</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">{text(selectedAssignment.submission.feedback)}</p>
              </section>
            ) : null}
            {selectedAssignment.submission.correctionRequest ? (
              <section className="soft-panel border-amber-200/80 bg-amber-50/80 p-4 text-amber-900 dark:border-amber-200/25 dark:bg-amber-300/[0.12] dark:text-amber-100">
                <h2 className="text-sm font-black uppercase tracking-[0.14em]">{t({ en: "Correction request", zh: "訂正要求", zhHans: "订正要求" })}</h2>
                <p className="mt-2 text-sm font-bold leading-6">{text(selectedAssignment.submission.correctionRequest)}</p>
              </section>
            ) : null}
            {latestAttempt ? (
              <section className="soft-panel p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Latest attempt", zh: "最近提交", zhHans: "最近提交" })}</h2>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">{latestAttempt.answerText || "-"}</p>
                <p className="mt-3 text-xs font-black text-slate-500 dark:text-slate-400">{formatDate(latestAttempt.submittedAt, language)}</p>
              </section>
            ) : null}
          </aside>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container py-10 sm:py-12">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Student workspace", zh: "學生工作區", zhHans: "学生工作区" })}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{t({ en: "My assignments", zh: "我的作業", zhHans: "我的作业" })}</h1>
        <div className="mt-6 grid gap-3 text-sm font-bold text-slate-600 sm:grid-cols-3 dark:text-slate-300">
          <span className="soft-panel px-4 py-3">{t({ en: "Total", zh: "總數", zhHans: "总数" })}: {assignments.length}</span>
          <span className="soft-panel px-4 py-3">{t({ en: "Open", zh: "待完成", zhHans: "待完成" })}: {openAssignments.length}</span>
          <span className="soft-panel px-4 py-3">{t({ en: "Upcoming due dates", zh: "即將截止", zhHans: "即将截止" })}: {dueSoonAssignments.length}</span>
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        {assignments.length ? assignments.map((item) => <AssignmentCard key={item.assignment.id} item={item} />) : (
          <div className="soft-panel p-6 text-sm font-bold text-slate-500 dark:text-slate-400">
            {t({ en: "No assignments yet.", zh: "暫時沒有作業。", zhHans: "暂时没有作业。" })}
          </div>
        )}
      </section>
    </div>
  );
}
