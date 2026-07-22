"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import {
  assessmentTypeLabels,
  assignmentContentTypeLabels,
  submissionStatusLabels,
  teacherMessageStatusLabels
} from "@/components/teacher/teacherLabels";
import { gradeIds } from "@/data/grades";
import { formatGradeLabel, textForLanguage } from "@/lib/i18n";
import { cn, formatDateInHongKong } from "@/lib/utils";
import type {
  Assignment,
  AssignmentContentType,
  AssignmentGradingRun,
  AssignmentTeacherReviewAction,
  Assessment,
  ClassAiTutorMode,
  ClassAiTutorPolicy,
  GradeId,
  Language,
  StudentAssignmentItem,
  Submission,
  TeacherAssignmentDetailData,
  LearningPathStepKind,
  TeacherClass,
  TeacherClassDetailData,
  TeacherClassStudentSummary,
  TeacherClassTopicOption,
  TeacherInboxData,
  TeacherInboxThread,
  TeacherLearningPath,
  TeacherStudentGroup,
  TeacherStudentGroupTier,
  TeacherStudentMasteryTarget,
  TeacherStudentProfileData,
  TeacherStudentRiskTag,
  TeachingResource
} from "@/types";

const grades = gradeIds;
const contentTypes: AssignmentContentType[] = ["lesson", "practice", "visualization", "resource", "assessment"];
export type TeacherAssignmentQueueFilter = "all" | "grading" | "correction-required" | "correction-review";
type TeacherInboxQueueFilter = "all" | "open" | "unread" | "urgent" | "parent" | "privacy" | "resolved";
const teacherInboxQueueFilters = new Set<TeacherInboxQueueFilter>(["all", "open", "unread", "urgent", "parent", "privacy", "resolved"]);

type AssignmentReviewOperation =
  | {
      type: "grading-run";
      submission: Submission;
      gradingRun: AssignmentGradingRun;
    }
  | {
      type: "teacher-review";
      submission: Submission;
      action: AssignmentTeacherReviewAction;
    };

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return textForLanguage({ en: "No record", zh: "未有紀錄" }, language);
  return formatDateInHongKong(value, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function percent(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

type MasteryTargetPriority = "met" | "watch" | "priority" | "urgent";
type MasteryTargetOperation = {
  type: "saved" | "cleared";
  topicId: string;
  topicTitle: string;
  actualMastery: number;
  targetMastery: number | null;
  gap: number;
  priority: MasteryTargetPriority;
  note: string;
};

function boundedPercentValue(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function masteryTargetGap(actualMastery: number, targetMastery: number) {
  return Math.max(0, boundedPercentValue(targetMastery) - boundedPercentValue(actualMastery));
}

function masteryTargetPriorityFor(gap: number): MasteryTargetPriority {
  if (gap >= 25) return "urgent";
  if (gap >= 12) return "priority";
  if (gap > 0) return "watch";
  return "met";
}

function masteryTargetPriorityLabel(priority: MasteryTargetPriority) {
  const labels: Record<MasteryTargetPriority, { en: string; zh: string }> = {
    met: { en: "Target met", zh: "已達目標" },
    watch: { en: "Monitor", zh: "觀察" },
    priority: { en: "Priority", zh: "優先" },
    urgent: { en: "Urgent", zh: "緊急" }
  };
  return labels[priority];
}

function masteryTargetPriorityTone(priority: MasteryTargetPriority) {
  if (priority === "urgent") return "border-rose-300/60 bg-rose-400/12 text-rose-800 dark:text-rose-100";
  if (priority === "priority") return "border-amber-300/60 bg-amber-400/15 text-amber-800 dark:text-amber-100";
  if (priority === "watch") return "border-cyan-300/55 bg-cyan-400/12 text-cyan-800 dark:text-cyan-100";
  return "border-emerald-300/55 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100";
}

function MasteryTargetReadyPanel({
  operation,
  classId,
  studentId,
  studentName
}: {
  operation: MasteryTargetOperation;
  classId: string;
  studentId: string;
  studentName: string;
}) {
  const { t } = useSettings();
  const isSaved = operation.type === "saved";
  const assignmentParams = new URLSearchParams({
    classId,
    contentType: "practice",
    targetId: operation.topicId,
    title: t({ en: `Practice: ${operation.topicTitle}`, zh: `${operation.topicTitle} 練習` })
  });

  return (
    <section aria-live="polite" className="rounded-2xl border border-emerald-300/55 bg-emerald-400/12 p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">
            {isSaved ? t({ en: "Mastery target ready", zh: "掌握目標已就緒" }) : t({ en: "Mastery target cleared", zh: "掌握目標已清除" })}
          </p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{studentName} · {operation.topicTitle}</p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
            {isSaved && operation.targetMastery !== null
              ? `${t({ en: "Actual", zh: "實際" })} ${percent(operation.actualMastery)} · ${t({ en: "Target", zh: "目標" })} ${percent(operation.targetMastery)} · ${t({ en: "Gap", zh: "差距" })} +${operation.gap}`
              : t({ en: "Adaptive signal removed from this topic.", zh: "此課題的自適應信號已移除。" })}
          </p>
          {operation.note ? <p className="mt-2 break-words text-xs font-semibold text-emerald-900 dark:text-emerald-100">{operation.note}</p> : null}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${masteryTargetPriorityTone(operation.priority)}`}>
          {t(masteryTargetPriorityLabel(operation.priority))}
        </span>
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap gap-2">
        {isSaved ? (
          <Link href={`/teacher/assignments/new?${assignmentParams.toString()}`} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Create practice", zh: "建立練習" })}
          </Link>
        ) : null}
        <a href="#mastery-target" className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
          {t({ en: "Open target", zh: "查看目標" })}
        </a>
        <Link href={`/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
          {t({ en: "Student profile", zh: "學生檔案" })}
        </Link>
        <Link href={`/teacher/assignments?classId=${encodeURIComponent(classId)}`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
          {t({ en: "Assignment queue", zh: "作業隊列" })}
        </Link>
      </div>
    </section>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image file."));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Could not read image file.")));
    reader.readAsDataURL(file);
  });
}

function riskLabel(tag: TeacherStudentRiskTag) {
  const labels: Record<TeacherStudentRiskTag, { en: string; zh: string }> = {
    "low-mastery": { en: "Low mastery", zh: "低掌握" },
    "repeated-mistakes": { en: "Repeated errors", zh: "連續錯題" },
    inactive: { en: "Inactive", zh: "低活躍" },
    "high-ai-tutor": { en: "AI help spike", zh: "AI 求助偏高" },
    "late-work": { en: "Late work", zh: "遲交" }
  };
  return labels[tag];
}

function statusTone(status: string) {
  if (status === "graded" || status === "resolved" || status === "reply-sent") return "border-emerald-300/55 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100";
  if (status === "late" || status === "unread") return "border-rose-300/60 bg-rose-400/12 text-rose-800 dark:text-rose-100";
  if (status === "correction-required" || status === "draft-ready") return "border-amber-300/55 bg-amber-400/15 text-amber-800 dark:text-amber-100";
  if (status === "correction-submitted") return "border-violet-300/55 bg-violet-400/15 text-violet-800 dark:text-violet-100";
  if (status === "submitted" || status === "open" || status === "active" || status === "thread-reopened") return "border-cyan-300/55 bg-cyan-400/12 text-cyan-800 dark:text-cyan-100";
  return "border-slate-200/80 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200";
}

function StatusPill({ value, label }: { value: string; label: string }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusTone(value)}`}>{label}</span>;
}

function AssignmentDeleteButton({
  assignmentId,
  assignmentTitle,
  onDeleted,
  align = "start"
}: {
  assignmentId: string;
  assignmentTitle: string;
  onDeleted?: () => void;
  align?: "start" | "end";
}) {
  const router = useRouter();
  const { t } = useSettings();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const deleteAssignment = async () => {
    if (!isConfirming) {
      setError("");
      setIsConfirming(true);
      return;
    }

    setIsDeleting(true);
    setError("");
    const response = await fetch(`/api/teacher/assignments/${encodeURIComponent(assignmentId)}`, {
      method: "DELETE"
    });
    setIsDeleting(false);

    if (!response.ok) {
      setError(t({ en: "Could not delete this assignment.", zh: "暫時未能刪除此作業。" }));
      setIsConfirming(false);
      return;
    }

    setIsConfirming(false);
    if (onDeleted) {
      onDeleted();
    } else {
      router.refresh();
    }
  };

  return (
    <div className={`grid gap-2 ${align === "end" ? "justify-items-end text-right" : ""}`}>
      <div className={`flex flex-wrap gap-2 ${align === "end" ? "justify-end" : ""}`}>
        <button
          type="button"
          disabled={isDeleting}
          onClick={deleteAssignment}
          aria-label={t({ en: `Delete ${assignmentTitle}`, zh: `刪除 ${assignmentTitle}` })}
          className={`focus-ring rounded-full border px-4 py-2 text-xs font-black disabled:opacity-50 ${
            isConfirming
              ? "border-rose-300/70 bg-rose-50 text-rose-800 dark:border-rose-300/40 dark:bg-rose-300/[0.12] dark:text-rose-100"
              : "border-slate-200/80 bg-white/75 text-slate-600 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200"
          }`}
        >
          {isDeleting ? t({ en: "Deleting...", zh: "刪除中..." }) : isConfirming ? t({ en: "Confirm delete", zh: "確認刪除" }) : t({ en: "Delete", zh: "刪除" })}
        </button>
        {isConfirming ? (
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              setIsConfirming(false);
              setError("");
            }}
            className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200"
          >
            {t({ en: "Cancel", zh: "取消" })}
          </button>
        ) : null}
      </div>
      {error ? <p className="max-w-[220px] text-xs font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
    </div>
  );
}

function isDataDeletionRequestThread(thread: Pick<TeacherInboxThread, "subject">) {
  return [thread.subject.en, thread.subject.zh].some((value) => value.trim().toLowerCase() === "data deletion request" || value.trim() === "數據刪除申請");
}

function matchesInboxQueue(thread: TeacherInboxThread, filter: TeacherInboxQueueFilter) {
  if (filter === "open") return thread.status !== "resolved";
  if (filter === "unread") return thread.status === "unread";
  if (filter === "urgent") return thread.priority === "urgent";
  if (filter === "parent") return Boolean(thread.parentContext);
  if (filter === "privacy") return isDataDeletionRequestThread(thread);
  if (filter === "resolved") return thread.status === "resolved";
  return true;
}

function parentCategoryLabel(category: NonNullable<TeacherInboxThread["parentCategory"]>) {
  const labels: Record<NonNullable<TeacherInboxThread["parentCategory"]>, { en: string; zh: string }> = {
    "learning-support": { en: "Learning support", zh: "學習支援" },
    homework: { en: "Homework", zh: "家課 / 作業" },
    wellbeing: { en: "Wellbeing", zh: "身心狀態" },
    "report-question": { en: "Report question", zh: "報告查詢" },
    logistics: { en: "Logistics", zh: "行政安排" }
  };
  return labels[category];
}

type InboxOperation =
  | {
      type: "reply-sent";
      threadId: string;
      studentId: string;
      studentName: string;
      className?: string;
      subject: string;
      audience: string;
      bodyLength: number;
      createdAt: string;
    }
  | {
      type: "draft-ready";
      threadId: string;
      studentId: string;
      studentName: string;
      className?: string;
      subject: string;
      audience: string;
      bodyLength: number;
      createdAt: string;
    }
  | {
      type: "status-updated";
      threadId: string;
      studentId: string;
      studentName: string;
      className?: string;
      subject: string;
      audience: string;
      nextStatus: TeacherInboxThread["status"];
      createdAt: string;
    };

function domIdPart(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "-");
}

function inboxThreadAnchorId(threadId: string) {
  return `inbox-thread-${domIdPart(threadId)}`;
}

function inboxOperationBase(thread: TeacherInboxThread, subject: string, audience: string) {
  return {
    threadId: thread.id,
    studentId: thread.studentId,
    studentName: thread.studentName,
    className: thread.className,
    subject,
    audience,
    createdAt: new Date().toISOString()
  };
}

function InboxOperationPanel({ operation }: { operation: InboxOperation }) {
  const { language, t } = useSettings();
  const isReply = operation.type === "reply-sent";
  const isDraft = operation.type === "draft-ready";
  const statusValue = isReply ? "reply-sent" : isDraft ? "draft-ready" : operation.nextStatus === "resolved" ? "resolved" : "thread-reopened";
  const statusLabel = isReply
    ? t({ en: "Reply sent", zh: "回覆已發送" })
    : isDraft
      ? t({ en: "Draft ready", zh: "草稿已就緒" })
      : operation.nextStatus === "resolved"
        ? t({ en: "Thread resolved", zh: "對話已解決" })
        : t({ en: "Thread reopened", zh: "對話已重開" });
  const detail = isReply
    ? t({ en: "Reply was recorded and the inbox refresh is queued.", zh: "回覆已記錄，收件匣正在刷新。" })
    : isDraft
      ? t({ en: "Draft text is loaded into the composer for teacher review.", zh: "草稿已載入回覆框，待教師審閱。" })
      : operation.nextStatus === "resolved"
        ? t({ en: "Follow-up is closed. Keep the thread available for audit.", zh: "跟進已閉環，對話仍可供審計。" })
        : t({ en: "Thread is back in the open queue for follow-up.", zh: "對話已回到待跟進隊列。" });

  return (
    <section className="mt-5 rounded-3xl border border-emerald-300/50 bg-emerald-400/10 p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">
            {t({ en: "Inbox handoff ready", zh: "收件匣交接已就緒" })}
          </p>
          <p className="mt-1 break-words text-base font-black text-slate-950 dark:text-white">{operation.subject}</p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
            {operation.audience} · {operation.studentName}{operation.className ? ` · ${operation.className}` : ""} · {formatDate(operation.createdAt, language)}
          </p>
        </div>
        <StatusPill value={statusValue} label={statusLabel} />
      </div>
      <p className="mt-3 break-words text-sm font-semibold leading-6 text-emerald-900 dark:text-emerald-100">{detail}</p>
      {operation.type !== "status-updated" ? (
        <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
          <div className="soft-panel min-w-0 p-3">
            <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Reply length", zh: "回覆長度" })}</p>
            <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{operation.bodyLength}</p>
          </div>
          <div className="soft-panel min-w-0 p-3">
            <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Audit path", zh: "審計路徑" })}</p>
            <p className="mt-2 break-words text-sm font-black text-slate-950 dark:text-white">{operation.threadId}</p>
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex min-w-0 flex-wrap gap-2">
        <a href={`#${inboxThreadAnchorId(operation.threadId)}`} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
          {t({ en: "Open thread", zh: "打開對話" })}
        </a>
        <a href="#inbox-composer" className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
          {t({ en: "Composer", zh: "回覆框" })}
        </a>
        <Link href={`/teacher/students/${encodeURIComponent(operation.studentId)}`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
          {t({ en: "Student profile", zh: "學生檔案" })}
        </Link>
      </div>
    </section>
  );
}

function StudentRiskTags({ student }: { student: TeacherClassStudentSummary }) {
  const { text, t } = useSettings();
  if (!student.riskTags.length) {
    return <span className="rounded-full border border-emerald-300/50 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-100">{t({ en: "On track", zh: "穩定" })}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {student.riskTags.map((tag) => (
        <span key={tag} className="rounded-full border border-amber-300/55 bg-amber-400/12 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-100">
          {text(riskLabel(tag))}
        </span>
      ))}
    </div>
  );
}

const classAiTutorModes: ClassAiTutorMode[] = ["open", "limited", "fallback-only"];

function aiTutorPolicyModeLabel(mode: ClassAiTutorMode) {
  if (mode === "open") return { en: "Open", zh: "開放" };
  if (mode === "limited") return { en: "Limited", zh: "限流" };
  return { en: "Fallback", zh: "本機提示" };
}

function TeacherClassAiTutorPolicyPanel({ classId }: { classId: string }) {
  const { t } = useSettings();
  const [policy, setPolicy] = useState<ClassAiTutorPolicy | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPolicy() {
      const response = await fetch(`/api/teacher/classes/${encodeURIComponent(classId)}/ai-tutor-policy`, {
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = await response.json().catch(() => null) as {
        policy?: ClassAiTutorPolicy;
        canEdit?: boolean;
      } | null;
      if (cancelled) return;
      if (!response.ok || !payload?.policy) {
        setMessage(t({ en: "AI Tutor policy unavailable.", zh: "暫時未能讀取 AI Tutor 設定。" }));
        return;
      }
      setPolicy(payload.policy);
      setCanEdit(Boolean(payload.canEdit));
      setMessage("");
    }
    void loadPolicy();
    return () => {
      cancelled = true;
    };
  }, [classId, t]);

  async function savePolicy(nextMode: ClassAiTutorMode, limits = policy) {
    if (!policy || !canEdit || isSaving) return;
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(classId)}/ai-tutor-policy`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({
        mode: nextMode,
        perStudentMinuteLimit: limits?.perStudentMinuteLimit ?? 2,
        perStudentHourLimit: limits?.perStudentHourLimit ?? 20
      })
    });
    const payload = await response.json().catch(() => null) as { policy?: ClassAiTutorPolicy } | null;
    setIsSaving(false);
    if (!response.ok || !payload?.policy) {
      setMessage(t({ en: "Could not update class AI.", zh: "未能更新班級 AI 設定。" }));
      return;
    }
    setPolicy(payload.policy);
    setMessage(t({ en: "Class AI updated.", zh: "班級 AI 設定已更新。" }));
  }

  const liveMode = policy?.mode !== "fallback-only";
  const nextToggleMode: ClassAiTutorMode = liveMode ? "fallback-only" : policy?.previousLiveMode ?? "open";

  return (
    <section className="glass-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">AI Tutor</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Class AI", zh: "班級 AI" })}</h2>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            {policy
              ? `${t(aiTutorPolicyModeLabel(policy.mode))} · ${policy.perStudentMinuteLimit}/min · ${policy.perStudentHourLimit}/hour`
              : t({ en: "Loading", zh: "載入中" })}
          </p>
        </div>
        <button
          type="button"
          disabled={!policy || !canEdit || isSaving}
          onClick={() => void savePolicy(nextToggleMode)}
          className={cn(
            "focus-ring min-h-11 rounded-full px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
            liveMode
              ? "bg-rose-600 text-white shadow-sm hover:bg-rose-700"
              : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
          )}
        >
          {liveMode ? t({ en: "Pause", zh: "暫停" }) : t({ en: "Live", zh: "啟用" })}
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px_220px]">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/80 bg-white/70 p-2 dark:border-white/10 dark:bg-white/[0.05]">
          {classAiTutorModes.map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={!policy || !canEdit || isSaving}
              onClick={() => void savePolicy(mode)}
              className={cn(
                "focus-ring min-h-11 rounded-xl px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
                policy?.mode === mode
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              )}
            >
              {t(aiTutorPolicyModeLabel(mode))}
            </button>
          ))}
        </div>
        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {t({ en: "Per minute", zh: "每分鐘" })}
          <input
            type="number"
            min={1}
            max={6}
            disabled={!policy || !canEdit || isSaving}
            value={policy?.perStudentMinuteLimit ?? 2}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!policy || !Number.isFinite(value)) return;
              setPolicy({ ...policy, perStudentMinuteLimit: value });
            }}
            onBlur={() => policy ? void savePolicy(policy.mode, policy) : undefined}
            className="focus-ring min-h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-base font-black text-slate-950 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          />
        </label>
        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {t({ en: "Per hour", zh: "每小時" })}
          <input
            type="number"
            min={5}
            max={60}
            disabled={!policy || !canEdit || isSaving}
            value={policy?.perStudentHourLimit ?? 20}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!policy || !Number.isFinite(value)) return;
              setPolicy({ ...policy, perStudentHourLimit: value });
            }}
            onBlur={() => policy ? void savePolicy(policy.mode, policy) : undefined}
            className="focus-ring min-h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-base font-black text-slate-950 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          />
        </label>
      </div>
      {message ? <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300" role="status">{message}</p> : null}
      {!canEdit && policy ? <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Read only", zh: "只讀" })}</p> : null}
    </section>
  );
}

export function TeacherClassesManager({ classes }: { classes: TeacherClass[] }) {
  const router = useRouter();
  const { language, revalidateSession, t, text } = useSettings();
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [createdClass, setCreatedClass] = useState<TeacherClass | null>(null);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A create action must never leave the button on "Creating" forever; give a
        // hung request a hard deadline and surface the failure.
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          name: form.get("name"),
          grade: form.get("grade"),
          academicYear: form.get("academicYear"),
          description: form.get("description")
        })
      });
      const payload = await response.json().catch(() => null) as { class?: TeacherClass; error?: string } | null;
      if (response.status === 401 || response.status === 403) {
        setError(t({
          en: "Your sign-in is no longer a teacher session. Log in again as a teacher to create classes.",
          zh: "你的登入已不是教師工作階段，請重新以教師身份登入後再建立班級。",
          zhHans: "你的登录已不是教师会话，请重新以教师身份登录后再创建班级。"
        }));
        void revalidateSession();
        return;
      }
      if (!response.ok || !payload?.class) {
        setError(t({ en: "Could not create the class yet.", zh: "暫時未能建立班級。" }));
        return;
      }
      setCreatedClass(payload.class);
      formElement.reset();
      router.refresh();
    } catch {
      setError(t({
        en: "The request timed out before the class could be created. Try again in a moment.",
        zh: "建立班級的請求逾時，請稍後再試。",
        zhHans: "创建班级的请求超时，请稍后再试。"
      }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Classes", zh: "班級" })}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Class and student management", zh: "班級與學生管理" })}</h1>
        <form onSubmit={handleCreate} className="mt-6 grid gap-4 lg:grid-cols-[minmax(180px,1.2fr)_120px_180px_minmax(220px,1fr)_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="whitespace-nowrap text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Class name", zh: "班級名稱" })}</span>
            <input name="name" required className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="grid gap-2">
            <span className="whitespace-nowrap text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Grade", zh: "年級" })}</span>
            <select name="grade" defaultValue="S3" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              {grades.map((grade) => <option key={grade} value={grade}>{formatGradeLabel(grade, language, true)}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="whitespace-nowrap text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Academic year", zh: "學年" })}</span>
            <input name="academicYear" required defaultValue="2025-2026" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="grid gap-2">
            <span className="whitespace-nowrap text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Notes", zh: "備註" })}</span>
            <input name="description" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <button disabled={isSaving} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950" type="submit">
            {isSaving ? t({ en: "Creating", zh: "建立中" }) : t({ en: "Create", zh: "建立" })}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
        {createdClass ? (
          <div className="mt-5 rounded-3xl border border-cyan-300/45 bg-cyan-400/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Class ready", zh: "班級已建立" })}</p>
                <h2 className="mt-2 break-words text-xl font-black text-slate-950 dark:text-white">{createdClass.name}</h2>
                <p className="mt-1 break-words text-sm font-bold text-slate-600 dark:text-slate-300">
                  {formatGradeLabel(createdClass.grade, language, true)} · {createdClass.academicYear} · {t({ en: "Invite code", zh: "邀請碼" })} {createdClass.inviteCode}
                </p>
              </div>
              <div className="grid w-full min-w-0 gap-2 sm:w-auto sm:grid-cols-2 xl:grid-cols-4">
                <Link href={`/teacher/classes/${encodeURIComponent(createdClass.id)}`} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-center text-sm font-black text-white dark:bg-white dark:text-slate-950">
                  {t({ en: "Open class", zh: "打開班級" })}
                </Link>
                <Link href={`/teacher/operations/roster?classId=${encodeURIComponent(createdClass.id)}`} className="focus-ring rounded-full border border-cyan-300/60 bg-white/75 px-4 py-2 text-center text-sm font-black text-cyan-800 dark:border-cyan-200/30 dark:bg-white/[0.07] dark:text-cyan-100">
                  {t({ en: "Import roster", zh: "導入花名冊" })}
                </Link>
                <Link href={`/teacher/assignments?classId=${encodeURIComponent(createdClass.id)}`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-center text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
                  {t({ en: "Assignment queue", zh: "作業隊列" })}
                </Link>
                <Link href={`/teacher/classroom-sessions?classId=${encodeURIComponent(createdClass.id)}`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-center text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
                  {t({ en: "Start class", zh: "開始課堂" })}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {classes.map((teacherClass) => (
          <Link href={`/teacher/classes/${teacherClass.id}`} key={teacherClass.id} className="focus-ring glass-panel block p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xl font-black text-slate-950 dark:text-white">{teacherClass.name}</p>
                <p className="mt-1 text-sm font-bold text-cyan-700 dark:text-cyan-200">{formatGradeLabel(teacherClass.grade, language, true)} · {teacherClass.academicYear}</p>
              </div>
              <span className="rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-xs font-black dark:border-white/10 dark:bg-white/[0.07]">
                {teacherClass.studentCount} {t({ en: "students", zh: "學生" })}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(teacherClass.description)}</p>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Invite", zh: "邀請碼" })}: {teacherClass.inviteCode}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

export function TeacherClassDetailView({ detail }: { detail: TeacherClassDetailData }) {
  const router = useRouter();
  const { language, t } = useSettings();
  const [currentDetail, setCurrentDetail] = useState(detail);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCurrentDetail(detail);
  }, [detail]);

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(currentDetail.class.id)}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username") })
    });
    const payload = await response.json().catch(() => null) as { detail?: TeacherClassDetailData | null } | null;
    if (!response.ok) {
      setMessage(t({ en: "Could not add that student. Check the username and class membership.", zh: "未能加入該學生，請檢查用戶名稱或是否已在班內。" }));
      return;
    }
    if (payload?.detail) setCurrentDetail(payload.detail);
    formElement.reset();
    router.refresh();
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <Link href="/teacher/classes" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to classes", zh: "返回班級" })}</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{formatGradeLabel(currentDetail.class.grade, language, true)}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{currentDetail.class.name}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{currentDetail.class.academicYear} · {currentDetail.class.studentCount} {t({ en: "students", zh: "學生" })}</p>
          </div>
          <div className="rounded-2xl border border-cyan-300/45 bg-cyan-400/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Invite code", zh: "邀請碼" })}</p>
            <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{currentDetail.class.inviteCode}</p>
          </div>
        </div>
        <form onSubmit={handleAdd} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input name="username" required placeholder={t({ en: "Student username, e.g. HK Student Peter", zh: "學生用戶名稱，例如 HK Student Peter" })} className="focus-ring min-h-11 flex-1 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          <button className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="submit">{t({ en: "Add student", zh: "加入學生" })}</button>
        </form>
        {message ? <p className="mt-3 text-sm font-bold text-amber-700 dark:text-amber-100">{message}</p> : null}
      </section>

      <TeacherClassAiTutorPolicyPanel classId={currentDetail.class.id} />

      <TeacherClassGroupsPanel detail={currentDetail} />

      <TeacherClassLearningPathsPanel detail={currentDetail} />

      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Student roster", zh: "學生名單" })}</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 pr-4">{t({ en: "Student", zh: "學生" })}</th>
                <th className="py-3 pr-4">{t({ en: "Recent activity", zh: "最近活躍" })}</th>
                <th className="py-3 pr-4">{t({ en: "Avg mastery", zh: "平均掌握" })}</th>
                <th className="py-3 pr-4">{t({ en: "Assignment completion", zh: "作業完成" })}</th>
                <th className="py-3">{t({ en: "Risk tags", zh: "風險標籤" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
              {currentDetail.students.map((student) => (
                <tr key={student.studentId}>
                  <td className="py-4 pr-4">
                    <Link href={`/teacher/classes/${currentDetail.class.id}/students/${student.studentId}`} className="font-black text-cyan-700 dark:text-cyan-200">{student.studentName}</Link>
                    <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{formatGradeLabel(student.grade, language, true)}</p>
                  </td>
                  <td className="py-4 pr-4 font-semibold">{formatDate(student.recentActivityAt, language)}</td>
                  <td className="py-4 pr-4 font-black">{percent(student.averageMastery)}</td>
                  <td className="py-4 pr-4 font-black">{percent(student.assignmentCompletionRate)}</td>
                  <td className="py-4"><StudentRiskTags student={student} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const groupTierOrder: TeacherStudentGroupTier[] = ["support", "core", "stretch", "custom"];

const groupTierLabels: Record<TeacherStudentGroupTier, { en: string; zh: string }> = {
  support: { en: "Support", zh: "補底" },
  core: { en: "Core", zh: "核心" },
  stretch: { en: "Stretch", zh: "拔尖" },
  custom: { en: "Custom", zh: "自訂" }
};

const groupColorBadgeClasses: Record<string, string> = {
  sky: "border-sky-300/50 bg-sky-400/10 text-sky-700 dark:text-sky-200",
  amber: "border-amber-300/50 bg-amber-400/10 text-amber-700 dark:text-amber-100",
  emerald: "border-emerald-300/50 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200",
  violet: "border-violet-300/50 bg-violet-400/10 text-violet-700 dark:text-violet-200",
  rose: "border-rose-300/50 bg-rose-400/10 text-rose-700 dark:text-rose-200",
  slate: "border-slate-300/50 bg-slate-400/10 text-slate-700 dark:text-slate-200"
};

function groupBadgeClass(color: string) {
  return groupColorBadgeClasses[color] ?? groupColorBadgeClasses.slate;
}

function TeacherClassGroupCard({
  classId,
  group,
  students,
  topicOptions,
  onChange,
  onRemove
}: {
  classId: string;
  group: TeacherStudentGroup;
  students: TeacherClassStudentSummary[];
  topicOptions: TeacherClassTopicOption[];
  onChange: (group: TeacherStudentGroup) => void;
  onRemove: (groupId: string) => void;
}) {
  const { text, t } = useSettings();
  const [editingMembers, setEditingMembers] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(group.memberStudentIds);
  const [goalTopicId, setGoalTopicId] = useState(group.masteryTarget?.topicId ?? topicOptions[0]?.id ?? "");
  const [goalMastery, setGoalMastery] = useState(group.masteryTarget?.mastery ?? 80);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggleMember = (studentId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );
  };

  const saveMembers = async () => {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(classId)}/groups/${encodeURIComponent(group.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberStudentIds: selectedMemberIds })
    });
    setBusy(false);
    const payload = await response.json().catch(() => null) as { group?: TeacherStudentGroup } | null;
    if (!response.ok || !payload?.group) {
      setError(t({ en: "Could not update members.", zh: "未能更新成員。" }));
      return;
    }
    onChange(payload.group);
    setEditingMembers(false);
  };

  const saveGoal = async () => {
    if (!goalTopicId) {
      setError(t({ en: "Pick a topic for the goal.", zh: "請選擇目標課題。" }));
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch(
      `/api/teacher/classes/${encodeURIComponent(classId)}/groups/${encodeURIComponent(group.id)}/mastery-target`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: goalTopicId, mastery: goalMastery })
      }
    );
    setBusy(false);
    const payload = await response.json().catch(() => null) as { group?: TeacherStudentGroup } | null;
    if (!response.ok || !payload?.group) {
      setError(t({ en: "Could not save the goal.", zh: "未能儲存目標。" }));
      return;
    }
    onChange(payload.group);
    setEditingGoal(false);
  };

  const clearGoal = async () => {
    setBusy(true);
    setError("");
    const response = await fetch(
      `/api/teacher/classes/${encodeURIComponent(classId)}/groups/${encodeURIComponent(group.id)}/mastery-target`,
      { method: "DELETE" }
    );
    setBusy(false);
    const payload = await response.json().catch(() => null) as { group?: TeacherStudentGroup } | null;
    if (!response.ok || !payload?.group) {
      setError(t({ en: "Could not clear the goal.", zh: "未能清除目標。" }));
      return;
    }
    onChange(payload.group);
    setEditingGoal(false);
  };

  const removeGroup = async () => {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(classId)}/groups/${encodeURIComponent(group.id)}`, {
      method: "DELETE"
    });
    setBusy(false);
    if (!response.ok) {
      setError(t({ en: "Could not delete this group.", zh: "未能刪除此小組。" }));
      return;
    }
    onRemove(group.id);
  };

  const goalTopicTitle = group.masteryTarget
    ? topicOptions.find((option) => option.id === group.masteryTarget?.topicId)?.title
    : null;
  const assignHref = `/teacher/assignments/new?classId=${encodeURIComponent(classId)}&groupId=${encodeURIComponent(group.id)}`;

  return (
    <article className="soft-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-3 py-1 text-xs font-black", groupBadgeClass(group.color))}>
              {t(groupTierLabels[group.tier])}
            </span>
            <p className="break-words text-base font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{group.name}</p>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{group.studentCount} {t({ en: "students", zh: "學生" })}</span>
          </div>
          {group.memberNames.length ? (
            <p className="mt-2 break-words text-sm font-semibold text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">
              {group.memberNames.slice(0, 8).join(", ")}{group.memberNames.length > 8 ? ` +${group.memberNames.length - 8}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{t({ en: "No students yet — add members.", zh: "尚未有學生，請加入成員。" })}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={assignHref} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Assign work", zh: "指派作業" })}
          </Link>
          <button type="button" onClick={() => { setEditingMembers((value) => !value); setEditingGoal(false); setSelectedMemberIds(group.memberStudentIds); }} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Members", zh: "成員" })}
          </button>
          <button type="button" onClick={() => { setEditingGoal((value) => !value); setEditingMembers(false); }} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Goal", zh: "目標" })}
          </button>
          <button type="button" onClick={removeGroup} disabled={busy} className="focus-ring rounded-full border border-rose-300/60 bg-rose-400/10 px-4 py-2 text-xs font-black text-rose-700 disabled:opacity-50 dark:text-rose-200">
            {t({ en: "Delete", zh: "刪除" })}
          </button>
        </div>
      </div>

      {group.masteryTarget && goalTopicTitle ? (
        <p className="mt-3 rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-800 dark:text-cyan-200">
          {t({ en: "Goal", zh: "目標" })}: {text(goalTopicTitle)} → {group.masteryTarget.mastery}%
        </p>
      ) : null}

      {editingMembers ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <label key={student.studentId} className="soft-panel flex items-center gap-2 p-2 text-xs font-bold">
                <input type="checkbox" checked={selectedMemberIds.includes(student.studentId)} onChange={() => toggleMember(student.studentId)} />
                <span className="min-w-0 break-words">{student.studentName}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={saveMembers} disabled={busy} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{t({ en: "Save members", zh: "儲存成員" })}</button>
            <button type="button" onClick={() => setEditingMembers(false)} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">{t({ en: "Cancel", zh: "取消" })}</button>
          </div>
        </div>
      ) : null}

      {editingGoal ? (
        <div className="mt-4 grid gap-3">
          {topicOptions.length ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
              <label className="grid gap-1 text-xs font-black">
                <span>{t({ en: "Topic", zh: "課題" })}</span>
                <select value={goalTopicId} onChange={(event) => setGoalTopicId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
                  {topicOptions.map((option) => <option key={option.id} value={option.id}>{text(option.title)}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black">
                <span>{t({ en: "Target %", zh: "目標 %" })}</span>
                <input type="number" min={0} max={100} value={goalMastery} onChange={(event) => setGoalMastery(Number(event.target.value))} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
              </label>
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "No class topics available for a goal yet.", zh: "此班級暫無可設定目標的課題。" })}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveGoal} disabled={busy || !topicOptions.length} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{t({ en: "Save goal", zh: "儲存目標" })}</button>
            {group.masteryTarget ? (
              <button type="button" onClick={clearGoal} disabled={busy} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">{t({ en: "Clear goal", zh: "清除目標" })}</button>
            ) : null}
            <button type="button" onClick={() => setEditingGoal(false)} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">{t({ en: "Cancel", zh: "取消" })}</button>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t({ en: "Setting a goal applies this mastery target to every group member.", zh: "設定目標會為每位組員套用此掌握目標。" })}</p>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
    </article>
  );
}

function TeacherClassGroupsPanel({ detail }: { detail: TeacherClassDetailData }) {
  const { t } = useSettings();
  const [groups, setGroups] = useState<TeacherStudentGroup[]>(detail.groups);
  const [name, setName] = useState("");
  const [tier, setTier] = useState<TeacherStudentGroupTier>("support");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setGroups(detail.groups);
  }, [detail.groups]);

  const sortedGroups = useMemo(
    () =>
      [...groups].sort((a, b) => {
        const order = groupTierOrder.indexOf(a.tier) - groupTierOrder.indexOf(b.tier);
        return order !== 0 ? order : a.name.localeCompare(b.name);
      }),
    [groups]
  );

  const toggleMember = (studentId: string) => {
    setMemberIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );
  };

  const createGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t({ en: "Name your group.", zh: "請為小組命名。" }));
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(detail.class.id)}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), tier, memberStudentIds: memberIds })
    });
    setBusy(false);
    const payload = await response.json().catch(() => null) as { group?: TeacherStudentGroup } | null;
    if (!response.ok || !payload?.group) {
      setError(t({ en: "Could not create this group.", zh: "未能建立此小組。" }));
      return;
    }
    setGroups((current) => [...current, payload.group as TeacherStudentGroup]);
    setName("");
    setTier("support");
    setMemberIds([]);
  };

  const updateGroupInList = (updated: TeacherStudentGroup) => {
    setGroups((current) => current.map((group) => (group.id === updated.id ? updated : group)));
  };

  const removeGroupFromList = (groupId: string) => {
    setGroups((current) => current.filter((group) => group.id !== groupId));
  };

  return (
    <section className="glass-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Small groups", zh: "分層小組" })}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{t({ en: "Group students by readiness, then assign differentiated work or a shared goal.", zh: "按程度分組，再指派差異化作業或共同目標。" })}</p>
        </div>
        <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">{groups.length} {t({ en: "groups", zh: "小組" })}</span>
      </div>

      <form onSubmit={createGroup} className="mt-5 grid gap-3 rounded-2xl border border-slate-200/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
          <label className="grid gap-1 text-sm font-black">
            <span>{t({ en: "Group name", zh: "小組名稱" })}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t({ en: "e.g. Fractions support", zh: "例如：分數補底組" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="grid gap-1 text-sm font-black">
            <span>{t({ en: "Tier", zh: "層級" })}</span>
            <select value={tier} onChange={(event) => setTier(event.target.value as TeacherStudentGroupTier)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              {groupTierOrder.map((tierOption) => <option key={tierOption} value={tierOption}>{t(groupTierLabels[tierOption])}</option>)}
            </select>
          </label>
        </div>
        {detail.students.length ? (
          <div className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Members", zh: "成員" })} ({memberIds.length})</span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {detail.students.map((student) => (
                <label key={student.studentId} className="soft-panel flex items-center gap-2 p-2 text-xs font-bold">
                  <input type="checkbox" checked={memberIds.includes(student.studentId)} onChange={() => toggleMember(student.studentId)} />
                  <span className="min-w-0 break-words">{student.studentName}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "Add students to the class first.", zh: "請先為班級加入學生。" })}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="focus-ring w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{busy ? t({ en: "Creating...", zh: "建立中..." }) : t({ en: "Create group", zh: "建立小組" })}</button>
          {error ? <p className="text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
        </div>
      </form>

      <div className="mt-5 grid gap-3">
        {sortedGroups.length ? (
          sortedGroups.map((group) => (
            <TeacherClassGroupCard
              key={group.id}
              classId={detail.class.id}
              group={group}
              students={detail.students}
              topicOptions={detail.topicOptions}
              onChange={updateGroupInList}
              onRemove={removeGroupFromList}
            />
          ))
        ) : (
          <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No groups yet. Create a small group to differentiate work.", zh: "尚未有小組。建立分層小組以差異化教學。" })}</p>
        )}
      </div>
    </section>
  );
}

const learningPathStepKindOrder: LearningPathStepKind[] = ["lesson", "practice", "assessment", "visualization", "resource"];

const learningPathStepKindLabels: Record<LearningPathStepKind, { en: string; zh: string }> = {
  lesson: { en: "Lesson", zh: "課堂" },
  practice: { en: "Practice", zh: "練習" },
  assessment: { en: "Assessment", zh: "測驗" },
  visualization: { en: "Visualization", zh: "視覺化" },
  resource: { en: "Resource", zh: "資源" }
};

type LearningPathStepDraft = { kind: LearningPathStepKind; targetId: string; title: string };

function newLearningPathStepDraft(): LearningPathStepDraft {
  return { kind: "lesson", targetId: "", title: "" };
}

function TeacherLearningPathCard({
  path,
  onRemove
}: {
  path: TeacherLearningPath;
  onRemove: (pathId: string) => void;
}) {
  const { t } = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const removePath = async () => {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(path.classId)}/learning-paths/${encodeURIComponent(path.id)}`, {
      method: "DELETE"
    });
    setBusy(false);
    if (!response.ok) {
      setError(t({ en: "Could not delete this path.", zh: "未能刪除此路徑。" }));
      return;
    }
    onRemove(path.id);
  };

  return (
    <article className="soft-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-base font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{path.title}</p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            {path.steps.length} {t({ en: "steps", zh: "步驟" })} · {path.groupName ? `${t({ en: "Group", zh: "小組" })}: ${path.groupName}` : t({ en: "Whole class", zh: "全班" })} · {path.assignedCount} {t({ en: "students", zh: "學生" })}
          </p>
        </div>
        <button type="button" onClick={removePath} disabled={busy} className="focus-ring rounded-full border border-rose-300/60 bg-rose-400/10 px-4 py-2 text-xs font-black text-rose-700 disabled:opacity-50 dark:text-rose-200">
          {t({ en: "Delete", zh: "刪除" })}
        </button>
      </div>
      {path.description ? <p className="mt-2 break-words text-sm font-semibold text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{path.description}</p> : null}
      <ol className="mt-3 grid gap-2">
        {path.steps.map((step, index) => (
          <li key={step.id} className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950/90 text-xs font-black text-white dark:bg-white dark:text-slate-950">{index + 1}</span>
            <span className="rounded-full border border-slate-200/70 bg-white/70 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">{t(learningPathStepKindLabels[step.kind])}</span>
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{step.title}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-black">
        <span className="rounded-full border border-emerald-300/50 bg-emerald-400/10 px-3 py-1 text-emerald-700 dark:text-emerald-200">{path.completedCount}/{path.assignedCount} {t({ en: "finished", zh: "已完成" })}</span>
        <span className="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">{t({ en: "Avg steps done", zh: "平均完成步驟" })}: {path.averageStepsCompleted}/{path.steps.length}</span>
      </div>
      {error ? <p className="mt-2 text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
    </article>
  );
}

function TeacherClassLearningPathsPanel({ detail }: { detail: TeacherClassDetailData }) {
  const { t } = useSettings();
  const [paths, setPaths] = useState<TeacherLearningPath[]>(detail.learningPaths);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState("");
  const [steps, setSteps] = useState<LearningPathStepDraft[]>([newLearningPathStepDraft()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPaths(detail.learningPaths);
  }, [detail.learningPaths]);

  const updateStep = (index: number, patch: Partial<LearningPathStepDraft>) => {
    setSteps((current) => current.map((step, stepIndex) => (stepIndex === index ? { ...step, ...patch } : step)));
  };
  const addStep = () => setSteps((current) => [...current, newLearningPathStepDraft()]);
  const removeStep = (index: number) => setSteps((current) => (current.length <= 1 ? current : current.filter((_, stepIndex) => stepIndex !== index)));

  const createPath = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanSteps = steps
      .map((step) => ({ ...step, title: step.title.trim(), targetId: step.targetId.trim() }))
      .filter((step) => step.title || step.targetId);
    if (!title.trim()) {
      setError(t({ en: "Name your path.", zh: "請為路徑命名。" }));
      return;
    }
    if (!cleanSteps.length) {
      setError(t({ en: "Add at least one step.", zh: "請至少加入一個步驟。" }));
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(detail.class.id)}/learning-paths`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        groupId: groupId || undefined,
        steps: cleanSteps.map((step) => ({ kind: step.kind, targetId: step.targetId, title: step.title || undefined }))
      })
    });
    setBusy(false);
    const payload = await response.json().catch(() => null) as { path?: TeacherLearningPath } | null;
    if (!response.ok || !payload?.path) {
      setError(t({ en: "Could not create this path.", zh: "未能建立此路徑。" }));
      return;
    }
    setPaths((current) => [payload.path as TeacherLearningPath, ...current]);
    setTitle("");
    setDescription("");
    setGroupId("");
    setSteps([newLearningPathStepDraft()]);
  };

  const removePathFromList = (pathId: string) => setPaths((current) => current.filter((path) => path.id !== pathId));

  return (
    <section className="glass-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Learning paths", zh: "學習路徑" })}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{t({ en: "Build an ordered sequence of steps; students unlock them one at a time.", zh: "建立有序的步驟序列，學生逐步解鎖。" })}</p>
        </div>
        <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">{paths.length} {t({ en: "paths", zh: "路徑" })}</span>
      </div>

      <form onSubmit={createPath} className="mt-5 grid gap-3 rounded-2xl border border-slate-200/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <label className="grid gap-1 text-sm font-black">
            <span>{t({ en: "Path name", zh: "路徑名稱" })}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t({ en: "e.g. Fractions mastery track", zh: "例如：分數精熟路徑" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="grid gap-1 text-sm font-black">
            <span>{t({ en: "Assign to", zh: "指派給" })}</span>
            <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="">{t({ en: "Whole class", zh: "全班" })}</option>
              {detail.groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.studentCount})</option>)}
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-black">
          <span>{t({ en: "Description", zh: "描述" })}</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
        </label>
        <div className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Steps (in order)", zh: "步驟（按順序）" })}</span>
          {steps.map((step, index) => (
            <div key={index} className="grid gap-2 rounded-2xl border border-slate-200/60 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.05] sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <select value={step.kind} onChange={(event) => updateStep(index, { kind: event.target.value as LearningPathStepKind })} className="focus-ring rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
                {learningPathStepKindOrder.map((kind) => <option key={kind} value={kind}>{t(learningPathStepKindLabels[kind])}</option>)}
              </select>
              <input value={step.title} onChange={(event) => updateStep(index, { title: event.target.value })} placeholder={t({ en: "Step title", zh: "步驟標題" })} className="focus-ring min-w-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
              <input value={step.targetId} onChange={(event) => updateStep(index, { targetId: event.target.value })} placeholder={t({ en: "lesson slug / topic / assessment id", zh: "課堂 slug／課題／測驗 ID" })} className="focus-ring min-w-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
              <button type="button" onClick={() => removeStep(index)} disabled={steps.length <= 1} className="focus-ring rounded-xl border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">{t({ en: "Remove", zh: "移除" })}</button>
            </div>
          ))}
          <button type="button" onClick={addStep} className="focus-ring w-fit rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">{t({ en: "+ Add step", zh: "＋ 新增步驟" })}</button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="focus-ring w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{busy ? t({ en: "Creating...", zh: "建立中..." }) : t({ en: "Create path", zh: "建立路徑" })}</button>
          {error ? <p className="text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
        </div>
      </form>

      <div className="mt-5 grid gap-3">
        {paths.length ? (
          paths.map((path) => <TeacherLearningPathCard key={path.id} path={path} onRemove={removePathFromList} />)
        ) : (
          <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No learning paths yet. Build a step-by-step path to guide students.", zh: "尚未有學習路徑。建立逐步路徑引導學生。" })}</p>
        )}
      </div>
    </section>
  );
}

export function TeacherStudentProfileView({
  profile,
  backHref = "/teacher/classes",
  activeClassId
}: {
  profile: TeacherStudentProfileData;
  backHref?: string;
  activeClassId?: string;
}) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const activeTargetClassId = activeClassId ?? profile.classes[0]?.id ?? "";
  const initialTargetTopic = profile.progress.find((topic) => topic.teacherMasteryTarget) ?? profile.progress[0];
  const [targetTopicId, setTargetTopicId] = useState(initialTargetTopic?.topicId ?? "");
  const [targetMastery, setTargetMastery] = useState(
    String(initialTargetTopic?.teacherMasteryTarget?.mastery ?? Math.max(70, initialTargetTopic?.mastery ?? 70))
  );
  const [targetNote, setTargetNote] = useState(initialTargetTopic?.teacherMasteryTarget?.note ?? "");
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [targetMessage, setTargetMessage] = useState("");
  const [targetOperation, setTargetOperation] = useState<MasteryTargetOperation | null>(null);
  const selectedTargetTopic = profile.progress.find((topic) => topic.topicId === targetTopicId) ?? profile.progress[0] ?? null;
  const targetMasteryValue = boundedPercentValue(Number(targetMastery));
  const selectedTargetGap = selectedTargetTopic ? masteryTargetGap(selectedTargetTopic.mastery, targetMasteryValue) : 0;
  const selectedTargetPriority = masteryTargetPriorityFor(selectedTargetGap);
  const selectedTargetSaved = Boolean(selectedTargetTopic?.teacherMasteryTarget);

  const selectTargetTopic = (topicId: string) => {
    const nextTopic = profile.progress.find((topic) => topic.topicId === topicId) ?? profile.progress[0] ?? null;
    setTargetTopicId(topicId);
    setTargetMastery(String(nextTopic?.teacherMasteryTarget?.mastery ?? Math.max(70, nextTopic?.mastery ?? 70)));
    setTargetNote(nextTopic?.teacherMasteryTarget?.note ?? "");
    setTargetMessage("");
    setTargetOperation(null);
  };

  const patchMasteryTarget = async (mastery: number | null) => {
    if (!selectedTargetTopic || !activeTargetClassId) return;
    setIsSavingTarget(true);
    setTargetMessage("");
    setTargetOperation(null);
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(activeTargetClassId)}/students/${encodeURIComponent(profile.student.id)}/mastery-target`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicId: selectedTargetTopic.topicId,
        mastery,
        note: targetNote
      })
    });
    const payload = await response.json().catch(() => null) as { target?: TeacherStudentMasteryTarget | null; error?: string } | null;
    setIsSavingTarget(false);

    if (!response.ok) {
      setTargetMessage(t({ en: "Could not save this mastery target yet.", zh: "暫時未能儲存此掌握目標。" }));
      return;
    }

    const nextTargetMastery = payload?.target?.mastery ?? (mastery === null ? null : boundedPercentValue(mastery));
    const nextGap = nextTargetMastery === null ? 0 : masteryTargetGap(selectedTargetTopic.mastery, nextTargetMastery);
    setTargetOperation({
      type: mastery === null ? "cleared" : "saved",
      topicId: selectedTargetTopic.topicId,
      topicTitle: text(selectedTargetTopic.title),
      actualMastery: selectedTargetTopic.mastery,
      targetMastery: nextTargetMastery,
      gap: nextGap,
      priority: masteryTargetPriorityFor(nextGap),
      note: payload?.target?.note ?? targetNote
    });
    setTargetMessage(mastery === null ? t({ en: "Mastery target signal cleared.", zh: "已清除此掌握目標信號。" }) : t({ en: "Mastery target saved as an adaptive signal.", zh: "掌握目標已作為自適應信號儲存。" }));
    router.refresh();
  };

  const saveMasteryTarget = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericMastery = Number(targetMastery);
    if (!Number.isFinite(numericMastery)) {
      setTargetMessage(t({ en: "Enter a mastery target from 0 to 100.", zh: "請輸入 0 至 100 的掌握目標。" }));
      return;
    }
    await patchMasteryTarget(boundedPercentValue(numericMastery));
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <Link href={backHref} className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to classes", zh: "返回班級" })}</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{formatGradeLabel(profile.student.grade, language, true)}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{profile.student.name}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{profile.classes.map((item) => item.name).join(", ")}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="soft-panel px-4 py-3"><p className="text-2xl font-black gradient-text">{percent(profile.averageMastery)}</p><p className="text-xs font-bold">{t({ en: "Mastery", zh: "掌握" })}</p></div>
            <div className="soft-panel px-4 py-3"><p className="text-2xl font-black gradient-text">{profile.mistakes.filter((item) => !item.mastered).length}</p><p className="text-xs font-bold">{t({ en: "Active mistakes", zh: "錯題" })}</p></div>
            <div className="soft-panel px-4 py-3"><p className="text-2xl font-black gradient-text">{profile.aiTutor.messageCount7d}</p><p className="text-xs font-bold">{t({ en: "AI 7d", zh: "AI 7日" })}</p></div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          <div className="glass-panel p-5">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Progress", zh: "進度" })}</h2>
            {selectedTargetTopic ? (
              <form id="mastery-target" onSubmit={saveMasteryTarget} className="soft-panel mt-4 grid gap-4 p-4">
                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
                  <label className="grid min-w-0 gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Topic", zh: "課題" })}</span>
                    <select
                      value={targetTopicId}
                      onChange={(event) => selectTargetTopic(event.target.value)}
                      className="focus-ring min-h-11 w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]"
                    >
                      {profile.progress.map((topic) => (
                        <option key={topic.topicId} value={topic.topicId}>{text(topic.title)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Mastery target", zh: "掌握目標" })}</span>
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_76px] gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={targetMastery}
                        onChange={(event) => setTargetMastery(event.target.value)}
                        className="focus-ring min-w-0 w-full"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={targetMastery}
                        onChange={(event) => setTargetMastery(event.target.value)}
                        className="focus-ring min-w-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-black dark:border-white/10 dark:bg-white/[0.06]"
                      />
                    </div>
                  </label>
                </div>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Teacher note", zh: "教師備註" })}</span>
                  <input
                    value={targetNote}
                    onChange={(event) => setTargetNote(event.target.value)}
                    maxLength={280}
                    placeholder={t({ en: "e.g. Stretch to 90% before algebra quiz", zh: "例如：代數小測前提升至 90%" })}
                    className="focus-ring min-h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]"
                  />
                </label>
                <div
                  className="rounded-2xl border border-cyan-200/70 bg-cyan-50/70 p-4 dark:border-cyan-200/15 dark:bg-cyan-300/[0.08]"
                  data-adaptive-target-source="teacher-manual-mastery-target"
                  data-adaptive-target-class-id={activeTargetClassId}
                  data-adaptive-target-student-id={profile.student.id}
                  data-adaptive-target-topic-id={selectedTargetTopic.topicId}
                  data-adaptive-target-actual={selectedTargetTopic.mastery}
                  data-adaptive-target-mastery={targetMasteryValue}
                  data-adaptive-target-gap={selectedTargetGap}
                  data-adaptive-target-priority={selectedTargetPriority}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Adaptive signal", zh: "自適應信號" })}</p>
                      <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                        {selectedTargetSaved
                          ? t({ en: "Ready for recommendation", zh: "可供推薦使用" })
                          : t({ en: "Save to activate", zh: "儲存後啟用" })}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${masteryTargetPriorityTone(selectedTargetPriority)}`}>
                      {t(masteryTargetPriorityLabel(selectedTargetPriority))}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.06]">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Actual", zh: "實際" })}</p>
                      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{percent(selectedTargetTopic.mastery)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.06]">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Target", zh: "目標" })}</p>
                      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{percent(targetMasteryValue)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/75 p-3 dark:bg-white/[0.06]">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Gap", zh: "差距" })}</p>
                      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">+{selectedTargetGap} {t({ en: "pts", zh: "點" })}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-bold text-cyan-800 dark:text-cyan-100">
                    {t({ en: "Teacher-priority source: manual mastery target", zh: "教師優先來源：手動掌握目標" })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    <span>{t({ en: "Actual", zh: "實際" })}: {percent(selectedTargetTopic.mastery)}</span>
                    <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                    <span>{t({ en: "Target", zh: "目標" })}: {percent(targetMasteryValue)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isSavingTarget || !selectedTargetTopic.teacherMasteryTarget}
                      onClick={() => patchMasteryTarget(null)}
                      className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.07]"
                    >
                      {t({ en: "Clear target", zh: "清除目標" })}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingTarget}
                      className="focus-ring rounded-full bg-slate-950 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                    >
                      {isSavingTarget ? t({ en: "Saving", zh: "儲存中" }) : t({ en: "Save target", zh: "儲存目標" })}
                    </button>
                  </div>
                </div>
                {targetMessage ? <p className="text-sm font-bold text-cyan-700 dark:text-cyan-200">{targetMessage}</p> : null}
                {targetOperation ? (
                  <MasteryTargetReadyPanel
                    operation={targetOperation}
                    classId={activeTargetClassId}
                    studentId={profile.student.id}
                    studentName={profile.student.name}
                  />
                ) : null}
              </form>
            ) : null}
            <div className="mt-4 grid gap-3">
              {profile.progress.slice(0, 8).map((topic) => {
                const savedTarget = topic.teacherMasteryTarget;
                const savedTargetGap = savedTarget ? masteryTargetGap(topic.mastery, savedTarget.mastery) : 0;
                const savedTargetPriority = masteryTargetPriorityFor(savedTargetGap);

                return (
                  <div key={topic.topicId}>
                    <div className="flex flex-wrap justify-between gap-3 text-sm font-bold">
                      <span>{text(topic.title)}</span>
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        <span>{percent(topic.mastery)}</span>
                        {savedTarget ? (
                          <>
                            <span className="rounded-full border border-amber-300/55 bg-amber-400/12 px-2.5 py-0.5 text-[11px] font-black text-amber-800 dark:text-amber-100">
                              {t({ en: "Target", zh: "目標" })} {percent(savedTarget.mastery)}
                            </span>
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${masteryTargetPriorityTone(savedTargetPriority)}`}>
                              +{savedTargetGap} {t({ en: "pts", zh: "點" })}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </div>
                    <div className="relative mt-2 h-2 rounded-full bg-slate-200 dark:bg-white/10">
                      <div className="h-2 rounded-full bg-cyan-400" style={{ width: percent(topic.mastery) }} />
                      {savedTarget ? (
                        <span
                          className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 shadow-sm dark:bg-amber-200"
                          style={{ left: percent(savedTarget.mastery) }}
                          aria-label={t({ en: `Target ${percent(savedTarget.mastery)}`, zh: `目標 ${percent(savedTarget.mastery)}` })}
                        />
                      ) : null}
                    </div>
                    {savedTarget?.note ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{savedTarget.note}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel p-5">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Assignments", zh: "作業紀錄" })}</h2>
            <div className="mt-4 grid gap-3">
              {profile.assignments.map(({ assignment, submission }) => {
                const submissionStatus = submission?.status ?? "not-started";
                return (
                  <Link href={`/teacher/assignments/${assignment.id}`} key={assignment.id} className="soft-panel block p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <p className="font-black text-slate-950 dark:text-white">{text(assignment.title)}</p>
                      <StatusPill value={submissionStatus} label={text(submissionStatusLabels[submissionStatus])} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{submission?.score === null || submission?.score === undefined ? t({ en: "No score yet", zh: "暫無分數" }) : `${submission.score}%`}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="grid gap-6">
          <div className="glass-panel p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Mistakes", zh: "錯題" })}</h2>
            <div className="mt-4 grid gap-3">
              {profile.mistakes.slice(0, 4).map((mistake) => (
                <div key={mistake.questionId} className="soft-panel p-3">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{text(mistake.question.topic)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{mistake.wrongAttempts} {t({ en: "wrong attempts", zh: "次錯誤" })}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Recent attempts", zh: "最近練習" })}</h2>
            <div className="mt-4 grid gap-3">
              {profile.recentAttempts.map((attempt) => (
                <div key={attempt.id} className="soft-panel p-3">
                  <p className="text-sm font-black">{text(attempt.topic)}</p>
                  <p className={attempt.isCorrect ? "text-xs font-bold text-emerald-600 dark:text-emerald-200" : "text-xs font-bold text-rose-600 dark:text-rose-200"}>{attempt.isCorrect ? t({ en: "Correct", zh: "正確" }) : t({ en: "Wrong", zh: "錯誤" })}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Messages and AI Tutor", zh: "私信與 AI Tutor", zhHans: "私信与 AI Tutor" })}</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{profile.messages.length} {t({ en: "teacher message threads", zh: "個教師私信串" })}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t({ en: "Last AI message", zh: "最近 AI 訊息" })}: {formatDate(profile.aiTutor.lastMessageAt, language)}</p>
          </div>
          <div className="glass-panel p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Parent access", zh: "家長端存取" })}</h2>
            <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Invite code", zh: "邀請碼" })}</p>
            <p className="mt-2 rounded-2xl border border-cyan-300/45 bg-cyan-400/10 px-4 py-3 text-lg font-black tracking-[0.12em] text-cyan-800 dark:text-cyan-100">{profile.parentInviteCode}</p>
            <div className="mt-4 grid gap-2">
              {profile.guardianLinks.map((link) => (
                <div key={link.id} className="soft-panel p-3 text-sm font-bold">
                  {link.parentName} · {link.relationship}
                </div>
              ))}
              {!profile.guardianLinks.length ? <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No parent accounts linked yet.", zh: "尚未綁定家長帳戶。" })}</p> : null}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function AssignmentRows({ assignments }: { assignments: Assignment[] }) {
  const { language, text, t } = useSettings();
  return (
    <div className="grid gap-3">
      {assignments.map((assignment) => (
        <article key={assignment.id} className="soft-panel p-4 transition hover:-translate-y-0.5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_110px_auto] lg:items-center">
            <Link href={`/teacher/assignments/${assignment.id}`} className="focus-ring min-w-0 rounded-xl">
              <p className="text-lg font-black text-slate-950 dark:text-white">{text(assignment.title)}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text(assignmentContentTypeLabels[assignment.contentType])} · {text(assignment.description)}</p>
            </Link>
            <p className="text-sm font-bold">{formatDate(assignment.dueAt, language)}</p>
            <p className="text-right text-2xl font-black gradient-text">{assignment.submissionCount ? percent(Math.round((assignment.completedCount / assignment.submissionCount) * 100)) : "0%"}</p>
            <AssignmentDeleteButton assignmentId={assignment.id} assignmentTitle={text(assignment.title)} align="end" />
          </div>
        </article>
      ))}
      {!assignments.length ? <p className="soft-panel p-5 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No assignments yet.", zh: "尚未有作業。" })}</p> : null}
    </div>
  );
}

export function TeacherAssignmentsManager({
  assignments,
  classes = [],
  activeFilter = "all",
  activeClassId = "",
  query = "",
  queueCounts,
  totalCount = assignments.length
}: {
  assignments: Assignment[];
  classes?: TeacherClass[];
  activeFilter?: TeacherAssignmentQueueFilter;
  activeClassId?: string;
  query?: string;
  queueCounts?: Record<TeacherAssignmentQueueFilter, number>;
  totalCount?: number;
}) {
  const { t } = useSettings();
  const activeClass = classes.find((teacherClass) => teacherClass.id === activeClassId);
  const counts = queueCounts ?? {
    all: assignments.length,
    grading: 0,
    "correction-required": 0,
    "correction-review": 0
  };
  const queueOptions: Array<{ id: TeacherAssignmentQueueFilter; label: string; detail: string }> = [
    {
      id: "all",
      label: t({ en: "All assignments", zh: "全部作業" }),
      detail: t({ en: "Full queue", zh: "全部隊列" })
    },
    {
      id: "grading",
      label: t({ en: "Needs grading", zh: "待批改" }),
      detail: t({ en: "Submitted work", zh: "已提交" })
    },
    {
      id: "correction-required",
      label: t({ en: "Returned", zh: "已退回訂正" }),
      detail: t({ en: "Student action", zh: "待學生" })
    },
    {
      id: "correction-review",
      label: t({ en: "Correction review", zh: "訂正覆核" }),
      detail: t({ en: "Teacher action", zh: "待教師" })
    }
  ];
  const activeFilterLabel = queueOptions.find((option) => option.id === activeFilter)?.label ?? queueOptions[0].label;
  const buildQueueHref = (filter: TeacherAssignmentQueueFilter) => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (activeClassId) params.set("classId", activeClassId);
    if (query) params.set("q", query);
    const queryString = params.toString();
    return `/teacher/assignments${queryString ? `?${queryString}` : ""}`;
  };
  return (
    <section className="glass-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Assignments", zh: "作業" })}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Assignment distribution", zh: "作業分派" })}</h1>
        </div>
        <Link href="/teacher/assignments/new" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "New assignment", zh: "新增作業" })}</Link>
      </div>
      <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-4">
        {queueOptions.map((option) => {
          const isActive = activeFilter === option.id;
          return (
            <Link
              key={option.id}
              href={buildQueueHref(option.id)}
              aria-current={isActive ? "page" : undefined}
              className={`focus-ring soft-panel min-w-0 p-4 transition ${isActive ? "border-cyan-300/70 bg-cyan-400/10 dark:border-cyan-200/40" : ""}`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-slate-950 dark:text-white">{option.label}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{option.detail}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${isActive ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "border border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.07]"}`}>
                  {counts[option.id]}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
        <p className="min-w-0 break-words">
          {t({ en: "Showing", zh: "顯示" })} <span className="font-black text-slate-950 dark:text-white">{assignments.length}</span> / {activeFilter === "all" ? totalCount : counts.all} · {activeFilterLabel}
          {activeClass ? ` · ${activeClass.name}` : ""}
          {query ? ` · ${query}` : ""}
        </p>
        {(activeFilter !== "all" || activeClassId || query) ? (
          <Link href="/teacher/assignments" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Clear queue", zh: "清除篩選" })}
          </Link>
        ) : null}
      </div>
      <div className="mt-6"><AssignmentRows assignments={assignments} /></div>
    </section>
  );
}

export function TeacherAssignmentNewView({
  classDetails,
  resources = [],
  assessments = [],
  initialClassId = "",
  initialContentType,
  initialTargetId = "",
  initialTitle = "",
  initialGroupId = ""
}: {
  classDetails: TeacherClassDetailData[];
  resources?: TeachingResource[];
  assessments?: Assessment[];
  initialClassId?: string;
  initialContentType?: AssignmentContentType;
  initialTargetId?: string;
  initialTitle?: string;
  initialGroupId?: string;
}) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const initialSelectedClassId = classDetails.some((detail) => detail.class.id === initialClassId)
    ? initialClassId
    : classDetails[0]?.class.id ?? "";
  const resolvedInitialContentType = initialContentType ?? "lesson";
  const initialResourceId = resources.some((resource) => resource.id === initialTargetId)
    ? initialTargetId
    : resources[0]?.id ?? "";
  const initialAssessmentId = assessments.some((assessment) => assessment.id === initialTargetId)
    ? initialTargetId
    : assessments[0]?.id ?? "";
  const [selectedClassId, setSelectedClassId] = useState(initialSelectedClassId);
  const selectedClass = classDetails.find((detail) => detail.class.id === selectedClassId) ?? classDetails[0];
  const initialGroupIsValid = Boolean(
    initialGroupId && selectedClass?.groups.some((group) => group.id === initialGroupId)
  );
  const [scope, setScope] = useState<"all" | "selected" | "group">(initialGroupIsValid ? "group" : "all");
  const [groupId, setGroupId] = useState(
    initialGroupIsValid ? initialGroupId : selectedClass?.groups[0]?.id ?? ""
  );
  const [contentType, setContentType] = useState<AssignmentContentType>(resolvedInitialContentType);
  const [useAIGeneration, setUseAIGeneration] = useState(resolvedInitialContentType === "practice");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const groups = classDetails.find((detail) => detail.class.id === selectedClassId)?.groups ?? [];
    setGroupId((current) => (groups.some((group) => group.id === current) ? current : groups[0]?.id ?? ""));
  }, [selectedClassId, classDetails]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const studentIds = scope === "selected" ? form.getAll("studentIds").map(String) : undefined;
    const selectedGroupId = scope === "group" && groupId ? groupId : undefined;
    if (scope === "group" && !selectedGroupId) {
      setError(t({ en: "Pick a group to assign to.", zh: "請選擇要指派的小組。" }));
      return;
    }
    const shouldGenerate = contentType === "practice" && useAIGeneration;
    const imageFile = form.get("questionImage");
    let imageDataUrl: string | undefined;
    let imageFileName: string | undefined;

    if (shouldGenerate && imageFile instanceof File && imageFile.size > 0) {
      if (imageFile.size > 1_500_000) {
        setError(t({ en: "Image is too large. Use an image under 1.5 MB.", zh: "圖片過大，請使用 1.5 MB 以下的圖片。" }));
        return;
      }
      try {
        imageDataUrl = await readFileAsDataUrl(imageFile);
      } catch {
        setError(t({ en: "Could not read this image.", zh: "未能讀取此圖片。" }));
        return;
      }
      imageFileName = imageFile.name;
    }

    setIsSaving(true);
    const response = await fetch("/api/teacher/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: selectedClassId,
        studentIds,
        groupId: selectedGroupId,
        title: form.get("title"),
        description: form.get("description"),
        contentType,
        targetId: form.get("targetId"),
        dueAt: form.get("dueAt"),
        allowRetake: form.get("allowRetake") === "on",
        showAnswers: form.get("showAnswers") === "on",
        countTowardsGrade: form.get("countTowardsGrade") === "on",
        language,
        llmGenerate: shouldGenerate,
        questionCount: Number(form.get("questionCount") || 5),
        imageDataUrl,
        imageFileName
      })
    });
    setIsSaving(false);
    const payload = await response.json().catch(() => null) as { assignment?: Assignment; assessment?: Assessment; error?: string } | null;
    if (!response.ok || !payload?.assignment) {
      const generationError = payload?.error?.startsWith("assignment-generation-");
      setError(generationError
        ? t({ en: "AI assignment generation is unavailable. Check the provider configuration or try without AI generation.", zh: "AI 作業生成暫時不可用，請檢查供應商配置或取消 AI 生成後再試。" })
        : t({ en: "Could not create this assignment yet.", zh: "暫時未能建立此作業。" }));
      return;
    }
    router.push(`/teacher/assignments/${payload.assignment.id}`);
  };

  return (
    <section className="glass-panel p-5 sm:p-6">
      <Link href="/teacher/assignments" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to assignments", zh: "返回作業" })}</Link>
      <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Create assignment", zh: "建立作業" })}</h1>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Class", zh: "班級" })}</span><select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">{classDetails.map((detail) => <option key={detail.class.id} value={detail.class.id}>{detail.class.name} · {formatGradeLabel(detail.class.grade, language, true)}</option>)}</select></label>
          <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Content type", zh: "內容類型" })}</span><select value={contentType} onChange={(event) => {
            const nextContentType = event.target.value as AssignmentContentType;
            setContentType(nextContentType);
            setUseAIGeneration(nextContentType === "practice");
          }} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">{contentTypes.map((type) => <option key={type} value={type}>{text(assignmentContentTypeLabels[type])}</option>)}</select></label>
          <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Title", zh: "標題" })}</span><input name="title" required defaultValue={initialTitle} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
          {contentType === "resource" ? (
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Resource", zh: "資源" })}</span><select name="targetId" defaultValue={initialResourceId} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">{resources.map((resource) => <option key={resource.id} value={resource.id}>{text(resource.title)} · {resource.fileType}</option>)}</select></label>
          ) : contentType === "assessment" ? (
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Assessment", zh: "測驗" })}</span><select name="targetId" defaultValue={initialAssessmentId} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">{assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{text(assessment.title)} · {text(assessmentTypeLabels[assessment.type])}</option>)}</select></label>
          ) : (
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Target ID", zh: "目標 ID" })}</span><input name="targetId" defaultValue={initialTargetId} placeholder={t({ en: "lesson slug, question id, topic id", zh: "課堂 slug、題目 ID、課題 ID" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
          )}
          <label className="grid gap-2 lg:col-span-2"><span className="text-sm font-black">{t({ en: "Description", zh: "描述" })}</span><textarea name="description" rows={3} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
          {contentType === "practice" ? (
            <div className="soft-panel grid gap-3 p-4 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
              <label className="flex min-w-0 items-center gap-3 text-sm font-black">
                <input type="checkbox" checked={useAIGeneration} onChange={(event) => setUseAIGeneration(event.target.checked)} />
                <span className="min-w-0 break-words">{t({ en: "AI generate practice", zh: "AI 生成練習" })}</span>
              </label>
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Questions", zh: "題數" })}</span>
                <input name="questionCount" type="number" min="1" max="10" defaultValue={5} disabled={!useAIGeneration} className="focus-ring min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06]" />
              </label>
              <label className="grid min-w-0 gap-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Image", zh: "圖片" })}</span>
                <input name="questionImage" type="file" accept="image/png,image/jpeg,image/webp" disabled={!useAIGeneration} className="focus-ring min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06]" />
              </label>
            </div>
          ) : null}
          <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Due date", zh: "截止日期" })}</span><input name="dueAt" type="datetime-local" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
          <div className="grid gap-2"><span className="text-sm font-black">{t({ en: "Recipients", zh: "對象" })}</span><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setScope("all")} className={`focus-ring rounded-full px-4 py-2 text-sm font-black ${scope === "all" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "soft-panel"}`}>{t({ en: "Whole class", zh: "全班" })}</button><button type="button" onClick={() => setScope("group")} className={`focus-ring rounded-full px-4 py-2 text-sm font-black ${scope === "group" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "soft-panel"}`}>{t({ en: "Group", zh: "小組" })}</button><button type="button" onClick={() => setScope("selected")} className={`focus-ring rounded-full px-4 py-2 text-sm font-black ${scope === "selected" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "soft-panel"}`}>{t({ en: "Selected students", zh: "指定學生" })}</button></div></div>
        </div>
        {scope === "group" ? (
          selectedClass?.groups.length ? (
            <label className="grid gap-2">
              <span className="text-sm font-black">{t({ en: "Small group", zh: "分層小組" })}</span>
              <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
                {selectedClass.groups.map((group) => (
                  <option key={group.id} value={group.id}>{t(groupTierLabels[group.tier])} · {group.name} ({group.studentCount})</option>
                ))}
              </select>
            </label>
          ) : (
            <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "This class has no groups yet. Create one from the class page.", zh: "此班級尚未有小組，請於班級頁面建立。" })}</p>
          )
        ) : null}
        {scope === "selected" && selectedClass ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selectedClass.students.map((student) => (
              <label key={student.studentId} className="soft-panel flex items-center gap-3 p-3 text-sm font-bold"><input name="studentIds" type="checkbox" value={student.studentId} />{student.studentName}</label>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <label className="soft-panel flex items-center gap-2 px-4 py-3 text-sm font-bold"><input name="allowRetake" type="checkbox" defaultChecked />{t({ en: "Allow retake", zh: "允許重做" })}</label>
          <label className="soft-panel flex items-center gap-2 px-4 py-3 text-sm font-bold"><input name="showAnswers" type="checkbox" />{t({ en: "Show answers", zh: "顯示答案" })}</label>
          <label className="soft-panel flex items-center gap-2 px-4 py-3 text-sm font-bold"><input name="countTowardsGrade" type="checkbox" defaultChecked />{t({ en: "Count toward grade", zh: "計入成績" })}</label>
        </div>
        {error ? <p className="text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
        <button disabled={isSaving} className="focus-ring w-fit rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950" type="submit">{isSaving ? t({ en: "Creating...", zh: "建立中..." }) : t({ en: "Create assignment", zh: "建立作業" })}</button>
      </form>
    </section>
  );
}

function AssignmentReviewOperationPanel({
  operation,
  classId
}: {
  operation: AssignmentReviewOperation;
  classId: string;
}) {
  const { text, t } = useSettings();
  const submission = operation.submission;
  const isGradingRun = operation.type === "grading-run";
  const queueHref = isGradingRun
    ? "/teacher/assignments?filter=grading"
    : operation.action === "request-correction"
      ? "/teacher/assignments?filter=correction-required"
      : operation.action === "resolve"
        ? "/teacher/assignments?filter=correction-review"
        : "/teacher/assignments";

  return (
    <section aria-live="polite" className="mt-5 rounded-2xl border border-emerald-300/55 bg-emerald-400/12 p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">
            {isGradingRun ? t({ en: "AI suggestion ready", zh: "AI 建議已就緒" }) : t({ en: "Review recorded", zh: "批改已記錄" })}
          </p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{submission.studentName}</p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
            {isGradingRun
              ? `${t({ en: "Suggested score", zh: "建議分數" })}: ${operation.gradingRun.suggestedScore ?? "-"}`
              : `${text(submissionStatusLabels[submission.status])} · ${t({ en: "Score", zh: "分數" })} ${submission.score ?? "-"}`}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <a href={`#submission-${submission.id}`} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Open submission", zh: "查看提交" })}
          </a>
          <Link href={`/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(submission.studentId)}`} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {t({ en: "Student profile", zh: "學生檔案" })}
          </Link>
          <Link href={queueHref} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Queue", zh: "隊列" })}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function TeacherAssignmentDetailView({
  detail,
  initialSubmissionId
}: {
  detail: TeacherAssignmentDetailData;
  initialSubmissionId?: string;
}) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const [scoreBySubmission, setScoreBySubmission] = useState<Record<string, string>>({});
  const [feedbackBySubmission, setFeedbackBySubmission] = useState<Record<string, string>>({});
  const [correctionBySubmission, setCorrectionBySubmission] = useState<Record<string, string>>({});
  const [busySubmissionId, setBusySubmissionId] = useState("");
  const [lastOperation, setLastOperation] = useState<AssignmentReviewOperation | null>(null);

  const scoreFor = (submission: Submission) => Number(scoreBySubmission[submission.id] ?? submission.latestGradingRun?.suggestedScore ?? submission.score ?? 0);
  const feedbackFor = (submission: Submission) => feedbackBySubmission[submission.id] ?? text(submission.latestGradingRun?.feedback ?? submission.feedback ?? { en: "", zh: "" });
  const correctionFor = (submission: Submission) => correctionBySubmission[submission.id] ?? text(submission.latestGradingRun?.correctionRequest ?? submission.correctionRequest ?? { en: "", zh: "" });
  const assignmentTitle = text(detail.assignment.title);

  const runGrading = async (submission: Submission) => {
    setBusySubmissionId(submission.id);
    setLastOperation(null);
    const response = await fetch(`/api/teacher/submissions/${encodeURIComponent(submission.id)}/grading-runs`, {
      method: "POST"
    });
    const payload = await response.json().catch(() => null) as { gradingRun?: AssignmentGradingRun; submission?: Submission } | null;
    setBusySubmissionId("");
    if (response.ok && payload?.gradingRun && payload?.submission) {
      setLastOperation({ type: "grading-run", gradingRun: payload.gradingRun, submission: payload.submission });
      router.refresh();
    }
  };

  const reviewSubmission = async (submission: Submission, action: AssignmentTeacherReviewAction) => {
    setBusySubmissionId(submission.id);
    setLastOperation(null);
    const response = await fetch(`/api/teacher/submissions/${encodeURIComponent(submission.id)}/reviews`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        score: scoreFor(submission),
        feedback: feedbackFor(submission),
        correctionRequest: correctionFor(submission)
      })
    });
    const payload = await response.json().catch(() => null) as { submission?: Submission } | null;
    setBusySubmissionId("");
    if (response.ok && payload?.submission) {
      setLastOperation({ type: "teacher-review", action, submission: payload.submission });
      router.refresh();
    }
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <Link href="/teacher/assignments" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to assignments", zh: "返回作業" })}</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{detail.class.name}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{text(detail.assignment.title)}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text(detail.assignment.description)}</p>
          </div>
          <div className="grid gap-3 text-right sm:justify-items-end">
            <p className="text-4xl font-black gradient-text">{percent(detail.completionRate)}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "completion", zh: "完成率" })}</p>
            <AssignmentDeleteButton
              assignmentId={detail.assignment.id}
              assignmentTitle={assignmentTitle}
              align="end"
              onDeleted={() => {
                router.push("/teacher/assignments");
                router.refresh();
              }}
            />
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="soft-panel p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Pending grading", zh: "待批改" })}</p>
            <p className="mt-2 text-2xl font-black gradient-text">{detail.gradingSummary.pendingGrading}</p>
          </div>
          <div className="soft-panel p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Needs correction", zh: "需訂正" })}</p>
            <p className="mt-2 text-2xl font-black gradient-text">{detail.gradingSummary.correctionRequired}</p>
          </div>
          <div className="soft-panel p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Correction review", zh: "訂正覆核" })}</p>
            <p className="mt-2 text-2xl font-black gradient-text">{detail.gradingSummary.correctionSubmitted}</p>
          </div>
          <div className="soft-panel p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Resolved", zh: "已閉環" })}</p>
            <p className="mt-2 text-2xl font-black gradient-text">{detail.gradingSummary.resolved}</p>
          </div>
        </div>
      </section>
      <section className="grid gap-4">
        {detail.submissions.map((submission) => {
          const isBusy = busySubmissionId === submission.id;
          const latestAnswer = submission.latestAttempt?.ocrResult?.text || submission.latestAttempt?.answerText || "";
          const gradingRun = submission.latestGradingRun;
          const isLinkedSubmission = initialSubmissionId === submission.id;
          return (
            <article
              key={submission.id}
              id={`submission-${submission.id}`}
              className={`glass-panel p-5 sm:p-6 ${isLinkedSubmission ? "ring-2 ring-cyan-300/70 dark:ring-cyan-200/50" : ""}`}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link className="text-lg font-black text-cyan-700 dark:text-cyan-200" href={`/teacher/classes/${detail.class.id}/students/${submission.studentId}`}>{submission.studentName}</Link>
                    <StatusPill value={submission.status} label={text(submissionStatusLabels[submission.status])} />
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                    {t({ en: "Submitted", zh: "提交" })}: {formatDate(submission.submittedAt, language)} · {t({ en: "Score", zh: "分數" })}: {submission.score ?? "-"}
                  </p>
                  {submission.correctionDueAt ? (
                    <p className="mt-2 text-sm font-bold text-amber-700 dark:text-amber-200">{t({ en: "Correction due", zh: "訂正截止" })}: {formatDate(submission.correctionDueAt, language)}</p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <button disabled={isBusy} onClick={() => runGrading(submission)} type="button" className="focus-ring rounded-full border border-cyan-200/80 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-800 disabled:opacity-50 dark:border-cyan-200/25 dark:bg-cyan-300/[0.12] dark:text-cyan-100">
                    {isBusy ? t({ en: "Working", zh: "處理中" }) : t({ en: "Run OCR/AI suggestion", zh: "生成 OCR/AI 建議" })}
                  </button>
                  <button disabled={isBusy} onClick={() => reviewSubmission(submission, submission.status === "correction-submitted" ? "resolve" : "accept")} type="button" className="focus-ring rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                    {t({ en: "Confirm and close loop", zh: "確認並閉環" })}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <div className="soft-panel p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Latest evidence", zh: "最新提交" })}</p>
                  <p className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {latestAnswer || t({ en: "No answer text captured yet.", zh: "暫未擷取答案文字。" })}
                  </p>
                </div>
                <div className="soft-panel p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "OCR/AI suggestion", zh: "OCR/AI 建議" })}</p>
                  {gradingRun ? (
                    <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      <p className="font-black">{t({ en: "Suggested score", zh: "建議分數" })}: {gradingRun.suggestedScore ?? "-"}</p>
                      <p>{t({ en: "Confidence", zh: "信心" })}: {gradingRun.confidence === null ? "-" : `${Math.round(gradingRun.confidence * 100)}%`}</p>
                      <p className="whitespace-pre-wrap break-words">{text(gradingRun.feedback ?? { en: "Teacher review required.", zh: "需教師審核。" })}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No suggestion generated yet.", zh: "尚未生成建議。" })}</p>
                  )}
                </div>
                <div className="soft-panel p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Last teacher review", zh: "最近教師審核" })}</p>
                  {submission.latestTeacherReview ? (
                    <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      <p className="font-black">{submission.latestTeacherReview.reviewerName} · {formatDate(submission.latestTeacherReview.createdAt, language)}</p>
                      <p className="whitespace-pre-wrap break-words">{text(submission.latestTeacherReview.feedback ?? { en: "No feedback.", zh: "未有回饋。" })}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No teacher review yet.", zh: "尚未審核。" })}</p>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Score", zh: "分數" })}</span>
                  <input type="number" min={0} max={100} value={scoreBySubmission[submission.id] ?? submission.latestGradingRun?.suggestedScore ?? submission.score ?? ""} onChange={(event) => setScoreBySubmission((current) => ({ ...current, [submission.id]: event.target.value }))} className="focus-ring rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Teacher feedback", zh: "教師回饋" })}</span>
                  <textarea rows={3} value={feedbackFor(submission)} onChange={(event) => setFeedbackBySubmission((current) => ({ ...current, [submission.id]: event.target.value }))} className="focus-ring rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm dark:border-white/10 dark:bg-white/[0.06]" />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Correction request", zh: "訂正要求" })}</span>
                  <textarea rows={3} value={correctionFor(submission)} onChange={(event) => setCorrectionBySubmission((current) => ({ ...current, [submission.id]: event.target.value }))} className="focus-ring rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm dark:border-white/10 dark:bg-white/[0.06]" />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button disabled={isBusy} onClick={() => reviewSubmission(submission, "score-only")} type="button" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.07]">
                  {t({ en: "Save score", zh: "儲存分數" })}
                </button>
                <button disabled={isBusy} onClick={() => reviewSubmission(submission, "request-correction")} type="button" className="focus-ring rounded-full border border-amber-300/70 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 disabled:opacity-50 dark:border-amber-200/30 dark:bg-amber-300/[0.12] dark:text-amber-100">
                  {t({ en: "Return for correction", zh: "退回訂正" })}
                </button>
              </div>

              {!submission.submittedAt ? (
                <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t({
                    en: "No online submission yet — saving a score here records an offline or paper result for this student.",
                    zh: "尚未有線上提交——在此儲存分數將記錄此學生的線下或紙本成績。",
                    zhHans: "尚未有在线提交——在此保存分数将记录此学生的线下或纸本成绩。"
                  })}
                </p>
              ) : null}

              {lastOperation?.submission.id === submission.id ? (
                <AssignmentReviewOperationPanel operation={lastOperation} classId={detail.class.id} />
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}

export function TeacherInboxManager({ inbox }: { inbox: TeacherInboxData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, text, t } = useSettings();
  const [reply, setReply] = useState("");
  const [inboxActionMessage, setInboxActionMessage] = useState("");
  const [lastInboxOperation, setLastInboxOperation] = useState<InboxOperation | null>(null);
  const requestedFilter = searchParams.get("filter") as TeacherInboxQueueFilter | null;
  const activeFilter = requestedFilter && teacherInboxQueueFilters.has(requestedFilter) ? requestedFilter : "all";
  const selectedThreadId = searchParams.get("thread");
  const queueOptions: Array<{ id: TeacherInboxQueueFilter; label: string; detail: string }> = [
    { id: "all", label: t({ en: "All threads", zh: "全部對話" }), detail: t({ en: "Every message", zh: "所有訊息" }) },
    { id: "open", label: t({ en: "Needs reply", zh: "待跟進" }), detail: t({ en: "Unread or open", zh: "未讀或開啟" }) },
    { id: "unread", label: t({ en: "Unread", zh: "未讀" }), detail: t({ en: "New messages", zh: "新訊息" }) },
    { id: "urgent", label: t({ en: "Urgent", zh: "緊急" }), detail: t({ en: "High priority", zh: "高優先" }) },
    { id: "parent", label: t({ en: "Parent", zh: "家長" }), detail: t({ en: "Guardian threads", zh: "監護人對話" }) },
    { id: "privacy", label: t({ en: "Data requests", zh: "數據申請" }), detail: t({ en: "Privacy workflow", zh: "私隱流程" }) },
    { id: "resolved", label: t({ en: "Resolved", zh: "已解決" }), detail: t({ en: "Closed loop", zh: "已閉環" }) }
  ];
  const queueCounts = useMemo(() => queueOptions.reduce<Record<TeacherInboxQueueFilter, number>>((memo, option) => {
    memo[option.id] = inbox.threads.filter((thread) => matchesInboxQueue(thread, option.id)).length;
    return memo;
  }, { all: 0, open: 0, unread: 0, urgent: 0, parent: 0, privacy: 0, resolved: 0 }), [inbox.threads, queueOptions]);
  const filteredThreads = useMemo(() => inbox.threads.filter((thread) => matchesInboxQueue(thread, activeFilter)), [activeFilter, inbox.threads]);
  const selected = filteredThreads.find((thread) => thread.id === selectedThreadId) ??
    (selectedThreadId ? inbox.threads.find((thread) => thread.id === selectedThreadId) : null) ??
    (inbox.selectedThread && matchesInboxQueue(inbox.selectedThread, activeFilter) ? inbox.selectedThread : null) ??
    filteredThreads[0] ??
    null;
  const selectedIsDataDeletionRequest = selected ? isDataDeletionRequestThread(selected) : false;
  const activeFilterLabel = queueOptions.find((option) => option.id === activeFilter)?.label ?? queueOptions[0].label;
  const buildQueueHref = (filter: TeacherInboxQueueFilter) => filter === "all" ? "/teacher/communications/inbox" : `/teacher/communications/inbox?filter=${encodeURIComponent(filter)}`;
  const buildThreadHref = (threadId: string) => {
    const params = new URLSearchParams();
    params.set("thread", threadId);
    if (activeFilter !== "all") params.set("filter", activeFilter);
    return `/teacher/communications/inbox?${params.toString()}`;
  };

  const patchThread = async (thread: TeacherInboxThread, patch: Record<string, unknown>) => {
    setInboxActionMessage("");
    const response = await fetch(`/api/teacher/inbox/${encodeURIComponent(thread.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (response.ok) {
      if (typeof patch.status === "string") {
        setLastInboxOperation({
          type: "status-updated",
          ...inboxOperationBase(thread, text(thread.subject), thread.parentContext ? thread.parentContext.guardianName : thread.studentName),
          nextStatus: patch.status as TeacherInboxThread["status"]
        });
      }
      router.refresh();
      return;
    }
    setInboxActionMessage(t({ en: "Could not update this thread yet.", zh: "暫時未能更新此對話。" }));
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setInboxActionMessage("");
    const replyBody = reply.trim();
    const response = await fetch(`/api/teacher/inbox/${encodeURIComponent(selected.id)}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyBody })
    });
    if (response.ok) {
      setLastInboxOperation({
        type: "reply-sent",
        ...inboxOperationBase(selected, text(selected.subject), selected.parentContext ? selected.parentContext.guardianName : selected.studentName),
        bodyLength: replyBody.length
      });
      setReply("");
      router.refresh();
      return;
    }
    setInboxActionMessage(t({ en: "Could not send this reply yet.", zh: "暫時未能發送此回覆。" }));
  };

  const draftReply = async () => {
    if (!selected) return;
    setInboxActionMessage("");
    const response = await fetch(`/api/teacher/inbox/${encodeURIComponent(selected.id)}/draft-replies`, {
      method: "POST"
    });
    const payload = await response.json().catch(() => null) as { draft?: string } | null;
    if (response.ok && payload?.draft) {
      setReply(payload.draft);
      setLastInboxOperation({
        type: "draft-ready",
        ...inboxOperationBase(selected, text(selected.subject), selected.parentContext ? selected.parentContext.guardianName : selected.studentName),
        bodyLength: payload.draft.length
      });
      return;
    }
    setInboxActionMessage(t({ en: "Could not draft a reply yet.", zh: "暫時未能草擬回覆。" }));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="glass-panel p-4">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Inbox", zh: "收件匣" })}</h1>
        <div className="mt-4 grid gap-2">
          {queueOptions.map((option) => {
            const isActive = activeFilter === option.id;
            return (
              <Link
                key={option.id}
                href={buildQueueHref(option.id)}
                aria-current={isActive ? "page" : undefined}
                className={`focus-ring rounded-2xl border p-3 transition hover:-translate-y-0.5 ${isActive ? "border-cyan-300/55 bg-cyan-400/12" : "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]"}`}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-slate-950 dark:text-white">{option.label}</p>
                    <p className="mt-1 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{option.detail}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${isActive ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "border border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.07]"}`}>
                    {queueCounts[option.id]}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
          <span className="min-w-0 break-words">
            {t({ en: "Showing", zh: "顯示" })} <span className="font-black text-slate-950 dark:text-white">{filteredThreads.length}</span> / {inbox.threads.length} · {activeFilterLabel}
          </span>
          {activeFilter !== "all" ? (
            <Link href="/teacher/communications/inbox" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-3 py-1.5 font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
              {t({ en: "Clear", zh: "清除" })}
            </Link>
          ) : null}
        </div>
        <div className="mt-4 grid gap-2">
          {filteredThreads.map((thread) => (
            <Link id={`inbox-thread-row-${domIdPart(thread.id)}`} key={thread.id} href={buildThreadHref(thread.id)} className={`focus-ring scroll-mt-24 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${selected?.id === thread.id ? "border-cyan-300/55 bg-cyan-400/12" : "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]"}`}>
              <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-black">{text(thread.subject)}</p><span>{thread.starred ? "★" : ""}</span></div>
              <p className="mt-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">{thread.studentName}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {isDataDeletionRequestThread(thread) ? (
                  <span className="rounded-full border border-rose-300/60 bg-rose-400/12 px-2.5 py-1 text-[11px] font-black text-rose-800 dark:text-rose-100">
                    {t({ en: "Data deletion request", zh: "數據刪除申請" })}
                  </span>
                ) : null}
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statusTone(thread.status)}`}>{text(teacherMessageStatusLabels[thread.status])}</span>
                {thread.priority === "urgent" ? (
                  <span className="rounded-full border border-amber-300/60 bg-amber-400/12 px-2.5 py-1 text-[11px] font-black text-amber-800 dark:text-amber-100">
                    {t({ en: "Urgent", zh: "緊急" })}
                  </span>
                ) : null}
                {thread.parentContext ? (
                  <span className="rounded-full border border-violet-300/60 bg-violet-400/12 px-2.5 py-1 text-[11px] font-black text-violet-800 dark:text-violet-100">
                    {t({ en: "Parent", zh: "家長" })}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{thread.latestMessage}</p>
            </Link>
          ))}
          {!filteredThreads.length ? (
            <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">
              {t({ en: "No threads in this queue.", zh: "此隊列暫無對話。" })}
            </p>
          ) : null}
        </div>
      </aside>
      <section id={selected ? inboxThreadAnchorId(selected.id) : undefined} className="glass-panel scroll-mt-24 p-4 sm:p-5">
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                  {selected.parentContext ? `${selected.parentContext.guardianName} · ${selected.studentName}` : selected.studentName}
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{text(selected.subject)}</h2>
                {selected.parentContext ? (
                  <span className="mt-3 inline-flex rounded-full border border-violet-300/60 bg-violet-400/12 px-3 py-1 text-xs font-black text-violet-800 dark:text-violet-100">
                    {text(parentCategoryLabel(selected.parentContext.category))}
                  </span>
                ) : null}
                {selectedIsDataDeletionRequest ? (
                  <span className="mt-3 inline-flex rounded-full border border-rose-300/60 bg-rose-400/12 px-3 py-1 text-xs font-black text-rose-800 dark:text-rose-100">
                    {t({ en: "Data deletion request", zh: "數據刪除申請" })}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => patchThread(selected, { starred: !selected.starred })} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">{selected.starred ? t({ en: "Unstar", zh: "取消星標" }) : t({ en: "Star", zh: "加星" })}</button>
                <button type="button" onClick={() => patchThread(selected, { status: selected.status === "resolved" ? "open" : "resolved" })} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950">{selected.status === "resolved" ? t({ en: "Reopen", zh: "重開" }) : t({ en: "Resolve", zh: "標記解決" })}</button>
              </div>
            </div>
            {selectedIsDataDeletionRequest ? (
              <div className="mt-5 rounded-2xl border border-rose-300/50 bg-rose-400/10 p-4 text-sm font-semibold leading-6 text-rose-800 dark:text-rose-100">
                {t({
                  en: "Privacy workflow: confirm the student's identity and school retention policy before deleting analytics records. Mark this thread resolved only after the data deletion request is handled.",
                  zh: "私隱流程：刪除學習分析紀錄前，請先確認學生身份及學校資料保留政策。完成數據刪除申請後才將此對話標記為已解決。"
                })}
              </div>
            ) : null}
            {inboxActionMessage ? (
              <p className="mt-5 rounded-2xl border border-amber-300/45 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-100">{inboxActionMessage}</p>
            ) : null}
            {lastInboxOperation?.threadId === selected.id ? <InboxOperationPanel operation={lastInboxOperation} /> : null}
            <div className="mt-5 grid gap-3">
              {selected.messages.map((message) => (
                <div key={message.id} className={`max-w-[86%] rounded-2xl border p-4 ${message.senderRole === "teacher" ? "ml-auto border-cyan-300/45 bg-cyan-400/10" : "border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.06]"}`}>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{message.senderName} · {formatDate(message.createdAt, language)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{message.body}</p>
                  {message.attachments.length ? <p className="mt-2 text-xs font-bold text-cyan-700 dark:text-cyan-200">{message.attachments.length} {t({ en: "attachments", zh: "附件" })}</p> : null}
                </div>
              ))}
            </div>
            <div id="inbox-composer" className="mt-5 grid scroll-mt-24 gap-3">
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} placeholder={selected.parentContext ? t({ en: "Reply to the parent", zh: "回覆家長" }) : t({ en: "Reply to the student", zh: "回覆學生" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.06]" />
              <div className="flex flex-wrap gap-2">
                <button onClick={draftReply} type="button" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">{t({ en: "Draft reply", zh: "草擬回覆" })}</button>
                <button onClick={sendReply} type="button" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "Send reply", zh: "發送回覆" })}</button>
              </div>
            </div>
          </>
        ) : <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No messages yet.", zh: "尚未有私信。" })}</p>}
      </section>
      <aside className="glass-panel p-4">
        {selected ? (
          <>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Student context", zh: "學生上下文" })}</h2>
            <p className="mt-3 text-sm font-bold text-cyan-700 dark:text-cyan-200">{formatGradeLabel(selected.studentGrade, language, true)} · {selected.className ?? ""}</p>
            <p className="mt-3 text-3xl font-black gradient-text">{percent(selected.studentContext.averageMastery)}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "average mastery", zh: "平均掌握" })}</p>
            {selected.parentContext ? (
              <div className="mt-5 rounded-2xl border border-violet-300/45 bg-violet-400/10 p-3 text-sm font-bold text-violet-800 dark:text-violet-100">
                <p>{t({ en: "Parent", zh: "家長" })}: {selected.parentContext.guardianName}</p>
                <p className="mt-1">{t({ en: "Category", zh: "類型" })}: {text(parentCategoryLabel(selected.parentContext.category))}</p>
              </div>
            ) : null}
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Active mistakes", zh: "目前錯題" })}</h3>
            <div className="mt-3 grid gap-2">
              {selected.studentContext.activeMistakes.map((mistake) => <div key={mistake.questionId} className="soft-panel p-3 text-xs font-bold">{text(mistake.question.topic)} · {mistake.wrongAttempts}</div>)}
            </div>
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Current assignments", zh: "目前作業" })}</h3>
            <div className="mt-3 grid gap-2">
              {selected.studentContext.currentAssignments.map((item: StudentAssignmentItem) => <Link key={item.assignment.id} href={`/teacher/assignments/${item.assignment.id}`} className="soft-panel block p-3 text-xs font-bold">{text(item.assignment.title)} · {text(submissionStatusLabels[item.submission.status])}</Link>)}
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
