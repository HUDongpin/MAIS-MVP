"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ParentMotivationSummary } from "@/components/gamification/ParentMotivationSummary";
import { useSettings } from "@/components/providers/AppProviders";
import {
  parentFetchWithTimeout,
  parentIdempotencyAttempt,
  parentLatestRequestIsCurrent,
  parentMessageContextKey,
  parentMessageHref,
  parentMessageOutcome,
  parentReportPrefillSubject,
  parentWeekdayLabel,
  resolveParentComposeTarget,
  type ParentIdempotencyAttempt,
  type ParentMessageOutcomeCode
} from "@/components/parent/parentMessageUi";
import { formatGradeLabel, simplifyChineseText } from "@/lib/i18n";
import { parentInviteCodeMaxLength, parentMessageBodyMaxLength, parentMessageSubjectMaxLength } from "@/lib/parentConstraints";
import { formatDateInHongKong } from "@/lib/utils";
import type {
  GuardianRelationship,
  Language,
  ParentChildSummarySafe,
  ParentFoundationSafeData,
  ParentMessageCategory,
  ParentMessagesSafeData,
  ParentReportSafe,
  ParentReportSafeData
} from "@/types";

function percent(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

function formatDate(value: string | null, language: Language) {
  if (!value) return "-";
  return formatDateInHongKong(value, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatOptionalDate(value: string | null | undefined, language: Language) {
  return formatDate(value ?? null, language);
}

const englishSuggestedPracticeFallbacks = new Map<string, string>([
  ["每週兩次重做錯題簿", "Redo the mistake book twice a week"],
  ["完成二次函數基礎題組", "Complete the quadratic functions foundation set"]
]);

const chineseTextPattern = /[\u3400-\u9fff]/;
const openAssignmentStatuses = new Set(["not-started", "in-progress", "late", "correction-required"]);

function suggestedPracticeForLanguage(items: string[], language: string) {
  if (language === "zh" || language === "zh-Hans") return items.map((item) => simplifyChineseText(item, language));
  if (language !== "en") return items;

  return items.map((item) => {
    const translated = englishSuggestedPracticeFallbacks.get(item);
    if (translated) return translated;
    return chineseTextPattern.test(item) ? "Review the teacher's recommended practice task" : item;
  });
}

function pendingAssignmentCount(child: ParentChildSummarySafe) {
  return child.pendingAssignmentCount;
}

function correctionAssignmentCount(child: ParentChildSummarySafe) {
  return child.assignments.filter((item) => item.submission.status === "correction-required").length;
}

function assignmentStatusLabel(status: string) {
  const labels: Record<string, { en: string; zh: string }> = {
    "not-started": { en: "Not started", zh: "未開始" },
    "in-progress": { en: "In progress", zh: "進行中" },
    submitted: { en: "Submitted", zh: "已提交" },
    graded: { en: "Graded", zh: "已評分" },
    late: { en: "Late", zh: "逾期" },
    "correction-required": { en: "Correction needed", zh: "需訂正" },
    "correction-submitted": { en: "Correction submitted", zh: "訂正已交" },
    resolved: { en: "Resolved", zh: "已完成" }
  };
  return labels[status] ?? { en: status, zh: status };
}

function assignmentStatusClasses(status: string) {
  if (status === "graded" || status === "resolved" || status === "submitted" || status === "correction-submitted") {
    return "border-emerald-300/60 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100";
  }
  if (status === "late" || status === "correction-required") {
    return "border-amber-300/60 bg-amber-400/12 text-amber-800 dark:text-amber-100";
  }
  return "border-cyan-300/60 bg-cyan-400/12 text-cyan-800 dark:text-cyan-100";
}

function parentMessageCategoryLabel(category?: ParentMessageCategory | null) {
  const labels: Record<ParentMessageCategory, { en: string; zh: string }> = {
    "learning-support": { en: "Learning support", zh: "學習支援" },
    homework: { en: "Homework", zh: "家課 / 作業" },
    wellbeing: { en: "Wellbeing", zh: "身心狀態" },
    "report-question": { en: "Report question", zh: "報告查詢" },
    logistics: { en: "Logistics", zh: "行政安排" }
  };
  return category ? labels[category] : { en: "Message", zh: "私信" };
}

function parentMessageStatusLabel(status: string) {
  const labels: Record<string, { en: string; zh: string }> = {
    unread: { en: "Needs reply", zh: "待回覆" },
    open: { en: "Open", zh: "跟進中" },
    resolved: { en: "Resolved", zh: "已解決" }
  };
  return labels[status] ?? { en: status, zh: status };
}

function parentMessageStatusClasses(status: string) {
  if (status === "resolved") return "border-emerald-300/60 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100";
  if (status === "unread") return "border-amber-300/60 bg-amber-400/12 text-amber-800 dark:text-amber-100";
  return "border-cyan-300/60 bg-cyan-400/12 text-cyan-800 dark:text-cyan-100";
}

function parentReportMessageHref(report: ParentReportSafe, language: Language) {
  return parentMessageHref({
    studentId: report.studentId,
    category: "report-question",
    reportId: report.id,
    subject: parentReportPrefillSubject(report.title, language)
  });
}

function EmptyParentState({ title, body, actionHref }: { title: string; body: string; actionHref?: string }) {
  const { t } = useSettings();
  return (
    <section className="glass-panel p-6 text-center">
      <h1 className="text-3xl font-black text-slate-950 dark:text-white">{title}</h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{body}</p>
      {actionHref ? (
        <Link href={actionHref} className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
          {t({ en: "Connect a child", zh: "綁定孩子" })}
        </Link>
      ) : null}
    </section>
  );
}

function ChildPulseCard({ child }: { child: ParentChildSummarySafe }) {
  const { language, t, text } = useSettings();
  const maxMinutes = Math.max(1, ...child.weeklyActivity.map((day) => day.minutes));

  return (
    <article className="glass-panel min-w-0 overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
            {formatGradeLabel(child.student.grade, language, true)}
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{child.student.name}</h2>
          <p className="mt-1 text-sm font-bold text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
            {child.classes.map((item) => item.name).join(", ") || t({ en: "No class linked", zh: "尚未加入班級" })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black gradient-text">{percent(child.averageMastery)}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "average mastery", zh: "平均掌握" })}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <div className="soft-panel p-3">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{child.learningMinutes7d}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "minutes 7d", zh: "7日分鐘" })}</p>
        </div>
        <div className="soft-panel p-3">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{child.assignments.length}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "recent tasks", zh: "近期任務" })}</p>
        </div>
        <div className="soft-panel p-3">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{child.rewardSummary.available}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "points", zh: "可用積分" })}</p>
        </div>
        <div className="soft-panel p-3">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{child.motivationSummary?.level.current.level ?? 1}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "level", zh: "等級" })}</p>
        </div>
      </div>

      <div className="mt-5 grid h-28 grid-cols-7 items-end gap-2 rounded-2xl border border-slate-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.04]">
        {child.weeklyActivity.map((day) => {
          const weekday = parentWeekdayLabel(day.day, language);
          const minutes = t({ en: `${day.minutes} minutes`, zh: `${day.minutes} 分鐘`, zhHans: `${day.minutes} 分钟` });
          return (
            <div key={day.day} className="grid h-full min-w-0 items-end gap-1 text-center" aria-label={`${weekday.long}: ${minutes}`}>
              <div
                className="rounded-t-xl bg-cyan-400"
                style={{ height: `${Math.max(8, (day.minutes / maxMinutes) * 100)}%` }}
                aria-hidden="true"
              />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400" aria-hidden="true">{weekday.short}</span>
              <span className="sr-only">{weekday.long}: {minutes}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">{t({ en: "Celebrate", zh: "值得鼓勵" })}</h3>
          <div className="mt-2 grid gap-2">
            {child.celebrate.map((item) => <p key={text(item)} className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-800 dark:text-emerald-100">{text(item)}</p>)}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">{t({ en: "Support", zh: "家庭支援" })}</h3>
          <div className="mt-2 grid gap-2">
            {child.support.map((item) => <p key={text(item)} className="rounded-2xl bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-800 dark:text-amber-100">{text(item)}</p>)}
          </div>
        </div>
      </div>
    </article>
  );
}

function ParentFocusCard({ child }: { child: ParentChildSummarySafe }) {
  const { language, t, text } = useSettings();
  const childParams = new URLSearchParams({ studentId: child.student.id });
  const correction = child.assignments.find((item) => item.submission.status === "correction-required") ?? null;
  const openAssignment = child.assignments.find((item) => openAssignmentStatuses.has(item.submission.status)) ?? null;
  const topSupportTopic = child.supportTopics[0] ?? null;
  const nextAction = correction
    ? {
        eyebrow: t({ en: "Correction follow-up", zh: "訂正跟進" }),
        title: text(correction.assignment.title),
        body: correction.submission.correctionRequest
          ? text(correction.submission.correctionRequest)
          : t({ en: "Check the teacher's correction request and help schedule a short redo block.", zh: "查看教師訂正要求，安排一段短時間重做。" }),
        href: `/parent/messages?${childParams.toString()}`,
        cta: t({ en: "Message teacher", zh: "聯絡教師", zhHans: "联系教师" })
      }
    : openAssignment
      ? {
          eyebrow: t({ en: "Assignment attention", zh: "作業留意" }),
          title: text(openAssignment.assignment.title),
          body: t({ en: "Confirm the plan at home and ask the teacher if the task context is unclear.", zh: "在家確認完成計劃，如不清楚任務背景可向教師查詢。" }),
          href: `/parent/messages?${childParams.toString()}`,
          cta: t({ en: "Message teacher", zh: "聯絡教師", zhHans: "联系教师" })
        }
      : topSupportTopic
        ? {
            eyebrow: t({ en: "Home practice focus", zh: "家庭練習焦點" }),
            title: text(topSupportTopic.title),
            body: t({ en: "Use a 10-minute explanation check before the next practice session.", zh: "下次練習前，可用 10 分鐘做一次口頭講解檢查。" }),
            href: `/parent/reports?${childParams.toString()}`,
            cta: t({ en: "View report", zh: "查看報告", zhHans: "查看报告" })
          }
        : {
            eyebrow: t({ en: "Keep momentum", zh: "保持節奏" }),
            title: child.student.name,
            body: t({ en: "Celebrate the latest effort and keep the routine light, visible, and consistent.", zh: "鼓勵最近的努力，保持輕量、可見且穩定的學習節奏。" }),
            href: `/parent/reports?${childParams.toString()}`,
            cta: t({ en: "View report", zh: "查看報告", zhHans: "查看报告" })
          };

  return (
    <section className="glass-panel relative min-w-0 overflow-hidden bg-gradient-to-br from-cyan-50/95 via-white/90 to-amber-50/90 p-6 dark:from-cyan-950/45 dark:via-slate-950/85 dark:to-amber-950/25 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-300/10" aria-hidden="true" />
      <div className="relative min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
          <span className="max-w-full rounded-full border border-cyan-200/80 bg-white/75 px-3 py-1.5 [overflow-wrap:anywhere] dark:border-cyan-300/20 dark:bg-white/[0.07]">
            {child.student.name} · {formatGradeLabel(child.student.grade, language, true)}
          </span>
          <span className="[overflow-wrap:anywhere]">{t({ en: "Latest activity", zh: "最近活動", zhHans: "最近活动" })}: {formatOptionalDate(child.latestActivityAt, language)}</span>
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          {t({ en: "Today’s focus", zh: "今日關注", zhHans: "今日关注" })}
        </h1>
        <p className="mt-5 text-sm font-black tracking-[0.04em] text-amber-700 dark:text-amber-200">{nextAction.eyebrow}</p>
        <h2 className="mt-2 max-w-3xl text-2xl font-black tracking-tight text-slate-950 [overflow-wrap:anywhere] dark:text-white sm:text-3xl">{nextAction.title}</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{nextAction.body}</p>
        <Link href={nextAction.href} className="focus-ring mt-6 inline-flex min-h-11 items-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
          {nextAction.cta}
        </Link>
      </div>
    </section>
  );
}

function ParentWeeklySummary({ child }: { child: ParentChildSummarySafe }) {
  const { language, t, text } = useSettings();
  const maxMinutes = Math.max(1, ...child.weeklyActivity.map((day) => day.minutes));
  const positiveHighlight = child.celebrate[0];
  const detailsHref = `/parent/children/${encodeURIComponent(child.student.id)}`;
  const weeklyActivityDescription = child.weeklyActivity
    .map((day) => {
      const weekday = parentWeekdayLabel(day.day, language);
      return t({ en: `${weekday.long}: ${day.minutes} minutes`, zh: `${weekday.long}：${day.minutes} 分鐘`, zhHans: `${weekday.long}：${day.minutes} 分钟` });
    })
    .join(t({ en: ", ", zh: "；", zhHans: "；" }));

  return (
    <section className="glass-panel min-w-0 overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[0.06em] text-cyan-600 [overflow-wrap:anywhere] dark:text-cyan-300">{child.student.name}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "This week", zh: "本週概覽", zhHans: "本周概览" })}</h2>
        </div>
        <span className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs font-black text-cyan-800 dark:text-cyan-100">
          {t({ en: "At a glance", zh: "一目了然" })}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/55 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04]">
        {[
          { label: t({ en: "7d learning", zh: "7日學習", zhHans: "7日学习" }), value: `${child.learningMinutes7d}m` },
          { label: t({ en: "Mastery", zh: "平均掌握" }), value: `${child.averageMastery}%` },
          { label: t({ en: "Pending", zh: "待處理", zhHans: "待处理" }), value: pendingAssignmentCount(child) }
        ].map((item) => (
          <div key={item.label} className="min-w-0 px-2 py-4 text-center sm:px-4">
            <p className="text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
            <p className="mt-1 break-words text-[11px] font-bold leading-4 text-slate-500 dark:text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="text-xs font-black tracking-[0.06em] text-slate-500 dark:text-slate-400">{t({ en: "Learning rhythm", zh: "學習節奏", zhHans: "学习节奏" })}</p>
        <div className="mt-3 grid h-24 grid-cols-7 items-end gap-2 border-y border-slate-200/70 py-3 dark:border-white/10" role="img" aria-label={`${t({ en: "Weekly learning activity", zh: "每週學習活動", zhHans: "每周学习活动" })}. ${weeklyActivityDescription}`}>
          {child.weeklyActivity.map((day) => {
            const weekday = parentWeekdayLabel(day.day, language);
            const minutes = t({ en: `${day.minutes} minutes`, zh: `${day.minutes} 分鐘`, zhHans: `${day.minutes} 分钟` });
            return (
              <div key={day.day} className="grid h-full min-w-0 items-end gap-1 text-center" aria-label={`${weekday.long}: ${minutes}`}>
                <div className="mx-auto w-full max-w-7 rounded-t-lg bg-cyan-400" style={{ height: `${Math.max(8, (day.minutes / maxMinutes) * 100)}%` }} aria-hidden="true" />
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400" aria-hidden="true">{weekday.short}</span>
                <span className="sr-only">{weekday.long}: {minutes}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-emerald-400/10 px-4 py-3 text-emerald-900 dark:text-emerald-100">
        <p className="text-xs font-black tracking-[0.06em]">{t({ en: "A win to celebrate", zh: "值得鼓勵", zhHans: "值得鼓励" })}</p>
        <p className="mt-2 text-sm font-bold leading-6 [overflow-wrap:anywhere]">
          {positiveHighlight
            ? text(positiveHighlight)
            : t({ en: "Small, consistent check-ins help learning stay visible.", zh: "保持簡短而穩定的關心，讓學習進度持續可見。", zhHans: "保持简短而稳定的关心，让学习进度持续可见。" })}
        </p>
      </div>

      <Link href={detailsHref} className="focus-ring mt-5 flex min-h-11 items-center justify-between rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-black text-slate-950 transition hover:border-cyan-300/70 hover:bg-cyan-50/70 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:border-cyan-300/25 dark:hover:bg-cyan-300/10">
        <span>{t({ en: "View learning details", zh: "查看學習詳情", zhHans: "查看学习详情" })}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

export function ParentOverview({ data }: { data: ParentFoundationSafeData }) {
  const { t } = useSettings();
  if (!data.children.length) {
    return <EmptyParentState title={t({ en: "Connect your first child", zh: "綁定第一位孩子" })} body={t({ en: "Ask the teacher for a parent invite code to open learning summaries and parent-teacher messages.", zh: "向教師索取家長邀請碼，即可查看學習摘要和家校私信。" })} actionHref="/parent/connect" />;
  }

  const selectedChild = data.selectedChild ?? data.children[0];

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] xl:items-start">
      <ParentFocusCard child={selectedChild} />
      <ParentWeeklySummary child={selectedChild} />
    </div>
  );
}

function ChildWorkflowStrip({ child }: { child: ParentChildSummarySafe }) {
  const { language, t } = useSettings();
  const childParams = new URLSearchParams({ studentId: child.student.id });
  const messageParams = new URLSearchParams({ studentId: child.student.id, category: "learning-support" });
  const pendingAssignments = pendingAssignmentCount(child);
  const corrections = correctionAssignmentCount(child);

  return (
    <section className="glass-panel p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
            {t({ en: "Parent workflow", zh: "家長工作流" })}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{child.student.name}</h1>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            {formatGradeLabel(child.student.grade, language, true)} · {t({ en: "Latest activity", zh: "最近活動" })} {formatOptionalDate(child.latestActivityAt, language)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/parent/messages?${messageParams.toString()}`} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Message teacher", zh: "聯絡教師" })}
          </Link>
          <Link href={`/parent/reports?${childParams.toString()}`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Reports", zh: "報告" })}
          </Link>
          <Link href={`/parent/notices?${childParams.toString()}`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Notices", zh: "通知" })}
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="soft-panel p-4">
          <p className="text-3xl font-black text-slate-950 dark:text-white">{pendingAssignments}</p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "open assignment actions", zh: "待處理作業行動" })}</p>
        </div>
        <div className="soft-panel p-4">
          <p className="text-3xl font-black text-slate-950 dark:text-white">{corrections}</p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "corrections to monitor", zh: "需留意訂正" })}</p>
        </div>
        <div className="soft-panel p-4">
          <p className="text-3xl font-black text-slate-950 dark:text-white">{child.supportTopics.length}</p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "support topics", zh: "支援課題" })}</p>
        </div>
      </div>
    </section>
  );
}

export function ParentChildDetail({ child }: { child: ParentChildSummarySafe }) {
  const { language, t, text } = useSettings();

  return (
    <div className="grid gap-6">
      <ChildWorkflowStrip child={child} />
      <ChildPulseCard child={child} />
      <ParentMotivationSummary summary={child.motivationSummary} />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-panel p-5">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Support topics", zh: "支援課題" })}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {child.supportTopics.map((topic) => (
              <article key={topic.id} className="soft-panel p-4">
                <p className="text-sm font-black text-slate-950 dark:text-white">{text(topic.title)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{topic.mastery}% {t({ en: "mastery", zh: "掌握" })}</p>
                <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-2 rounded-full bg-amber-400" style={{ width: percent(topic.mastery) }} />
                </div>
              </article>
            ))}
            {!child.supportTopics.length ? <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No support topics flagged yet.", zh: "暫未標記需要支援的課題。" })}</p> : null}
          </div>
        </div>

        <aside className="glass-panel p-5">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Latest parent report", zh: "最新家長摘要" })}</h2>
          {child.latestParentReport ? (
            <ReportCard report={child.latestParentReport} />
          ) : (
            <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Teacher-published parent summaries will appear here.", zh: "教師發佈的家長摘要會顯示在這裡。" })}</p>
          )}
        </aside>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Recent assignments", zh: "近期作業" })}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {child.assignments.map((item) => (
            <article key={item.submission.id} className="soft-panel min-w-0 overflow-hidden p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{text(item.assignment.title)}</p>
                  <p className="mt-1 text-xs font-bold text-cyan-700 [overflow-wrap:anywhere] dark:text-cyan-200">{item.className}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${assignmentStatusClasses(item.submission.status)}`}>
                  {t(assignmentStatusLabel(item.submission.status))}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
                {t({ en: "Score", zh: "分數" })}: {item.submission.score ?? "-"} · {t({ en: "Due", zh: "截止" })} {formatOptionalDate(item.assignment.dueAt, language)} · {t({ en: "Updated", zh: "更新" })} {formatDate(item.submission.updatedAt, language)}
              </p>
              {item.submission.correctionRequest ? (
                <p className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs font-bold leading-5 text-amber-800 [overflow-wrap:anywhere] dark:border-amber-200/25 dark:bg-amber-300/[0.12] dark:text-amber-100">
                  {t({ en: "Correction", zh: "訂正" })}: {text(item.submission.correctionRequest)}
                  {item.submission.correctionDueAt ? ` · ${formatDate(item.submission.correctionDueAt, language)}` : ""}
                </p>
              ) : null}
              {item.submission.feedback ? (
                <p className="mt-3 text-xs font-bold leading-5 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{t({ en: "Teacher feedback", zh: "教師回饋" })}: {text(item.submission.feedback)}</p>
              ) : null}
            </article>
          ))}
          {!child.assignments.length ? (
            <p className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400">
              {t({ en: "No recent assignments need parent visibility yet.", zh: "暫未有需要家長留意的近期作業。" })}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ReportCard({ report, showActions = false }: { report: ParentReportSafe; showActions?: boolean }) {
  const { language, t, text } = useSettings();
  const suggestedPractice = report.preview ? suggestedPracticeForLanguage(report.preview.suggestedPractice, language).slice(0, 2) : [];
  const previewMetrics = report.preview
    ? [
        { label: t({ en: "Learning minutes", zh: "學習分鐘" }), value: report.preview.metrics.learningMinutes },
        { label: t({ en: "Mastery", zh: "掌握" }), value: `${report.preview.metrics.averageMastery}%` },
        { label: t({ en: "Completion", zh: "完成率" }), value: report.preview.metrics.completionRate === null ? "-" : `${report.preview.metrics.completionRate}%` },
        { label: t({ en: "Accuracy", zh: "準確率" }), value: report.preview.metrics.accuracy === null ? "-" : `${report.preview.metrics.accuracy}%` }
      ]
    : [];

  return (
    <article className="soft-panel mt-4 min-w-0 overflow-hidden p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{text(report.title)}</p>
          <p className="mt-1 text-xs font-bold text-cyan-700 [overflow-wrap:anywhere] dark:text-cyan-200">
            {formatDate(report.generatedAt, language)} · {t({ en: "Author", zh: "作者", zhHans: "作者" })}: {report.teacherName}
          </p>
        </div>
        <span className="rounded-full border border-cyan-300/60 bg-cyan-400/12 px-3 py-1 text-xs font-black text-cyan-800 dark:text-cyan-100">
          {t({ en: "Parent summary", zh: "家長摘要" })}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{text(report.summary)}</p>
      {report.preview ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {previewMetrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.05]">
                <p className="text-lg font-black text-slate-950 dark:text-white">{metric.value}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{metric.label}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">{t({ en: "Strengths", zh: "強項" })}</p>
              <div className="mt-2 grid gap-2">
                {report.preview.strengths.slice(0, 2).map((item) => (
                  <p key={item} className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-800 [overflow-wrap:anywhere] dark:text-emerald-100">{item}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">{t({ en: "Watch", zh: "留意" })}</p>
              <div className="mt-2 grid gap-2">
                {(report.preview.weaknesses.length ? report.preview.weaknesses : report.preview.mistakeTypes).slice(0, 2).map((item) => (
                  <p key={item} className="rounded-2xl bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-800 [overflow-wrap:anywhere] dark:text-amber-100">{item}</p>
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">
            {t({ en: "Suggested practice", zh: "建議練習" })}: {suggestedPractice.length ? suggestedPractice.join(" · ") : t({ en: "No specific practice suggested yet.", zh: "暫未有指定建議練習。" })}
          </p>
        </div>
      ) : null}
      {showActions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={parentReportMessageHref(report, language)} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Ask teacher about this report", zh: "就此報告詢問教師" })}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function ParentReportsView({ data }: { data: ParentReportSafeData }) {
  const { language, t } = useSettings();
  if (!data.children.length) {
    return <EmptyParentState title={t({ en: "No linked child yet", zh: "尚未綁定孩子" })} body={t({ en: "Connect a child before reading parent summaries.", zh: "綁定孩子後即可查看家長摘要。" })} actionHref="/parent/connect" />;
  }

  const selectedChild = data.selectedChild;
  const latestReport = data.reports[0] ?? null;
  const reportCountsByStudent = new Map<string, number>();
  data.reports.forEach((report) => {
    if (!report.studentId) return;
    reportCountsByStudent.set(report.studentId, (reportCountsByStudent.get(report.studentId) ?? 0) + 1);
  });

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Parent reports", zh: "家長摘要" })}</p>
        <div className="mt-3 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-950 dark:text-white">{t({ en: "Teacher-published summaries", zh: "教師發佈摘要" })}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {selectedChild
                ? t({ en: "Focused on the selected child. Open a report to turn teacher context into a parent-teacher question.", zh: "目前聚焦所選孩子。可把教師摘要直接轉成家校查詢。" })
                : t({ en: "All linked children are shown. Use child filters to focus reports before messaging teachers.", zh: "目前顯示所有已綁定孩子。可先用孩子篩選聚焦摘要，再聯絡教師。" })}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-sm font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300">
            <p>{t({ en: "Reports", zh: "報告" })}: <span className="font-black text-slate-950 dark:text-white">{data.reports.length}</span></p>
            <p className="mt-1">{t({ en: "Latest", zh: "最新" })}: {formatOptionalDate(latestReport?.generatedAt, language)}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/parent/reports" aria-current={!selectedChild ? "page" : undefined} className={`focus-ring rounded-full border px-4 py-2 text-sm font-black ${!selectedChild ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"}`}>
            {t({ en: "All children", zh: "全部孩子" })}
          </Link>
          {data.children.map((child) => {
            const active = selectedChild?.student.id === child.student.id;
            const params = new URLSearchParams({ studentId: child.student.id });
            return (
              <Link key={child.student.id} href={`/parent/reports?${params.toString()}`} aria-current={active ? "page" : undefined} className={`focus-ring max-w-full rounded-full border px-4 py-2 text-sm font-black [overflow-wrap:anywhere] ${active ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"}`}>
                {child.student.name}
                <span className="ml-2 text-xs opacity-70">{reportCountsByStudent.get(child.student.id) ?? (child.latestParentReport ? 1 : 0)}</span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        {data.reports.map((report) => <ReportCard key={report.id} report={report} showActions />)}
        {!data.reports.length ? (
          <div className="glass-panel p-5">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No parent summaries yet.", zh: "暫未有家長摘要。" })}</p>
            <Link href="/parent/messages" className="focus-ring mt-4 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
              {t({ en: "Ask teacher for context", zh: "向教師了解情況" })}
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}

type ParentActionFeedback = {
  kind: "status" | "error";
  text: string;
};

type ParentRequestFailure = Error & {
  status?: number;
  retryAfter?: string | null;
};

function requestFailure(status?: number, retryAfter?: string | null) {
  return Object.assign(new Error("Parent request failed."), { status, retryAfter }) as ParentRequestFailure;
}

export function ParentMessagesView({ initialData }: { initialData: ParentMessagesSafeData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t, text } = useSettings();
  const [data, setData] = useState(initialData);
  const searchCategory = searchParams.get("category") as ParentMessageCategory | null;
  const initialCategory = searchCategory && initialData.categories.some((item) => item.id === searchCategory) ? searchCategory : "learning-support";
  const requestedStudentId = searchParams.get("studentId");
  const initialComposeStudentId = requestedStudentId && initialData.children.some((child) => child.student.id === requestedStudentId)
    ? requestedStudentId
    : initialData.selectedChild?.student.id ?? initialData.children[0]?.student.id ?? "";
  const [category, setCategory] = useState<ParentMessageCategory>(initialCategory);
  const requestedReportId = searchParams.get("reportId");
  const initialReport = requestedReportId ? initialData.reports.find((report) => report.id === requestedReportId) ?? null : null;
  const [composeStudentId, setComposeStudentId] = useState(initialComposeStudentId);
  const [reportId, setReportId] = useState(requestedReportId && initialData.reports.some((report) => report.id === requestedReportId) ? requestedReportId : "");
  const [subject, setSubject] = useState(() => (
    searchParams.get("subject")
    ?? (initialReport ? parentReportPrefillSubject(initialReport.title, language) : "")
  ).slice(0, parentMessageSubjectMaxLength));
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const initialComposeTargets = initialData.composeTargets
    .filter((target) => target.studentId === initialComposeStudentId);
  const [composeClassId, setComposeClassId] = useState(() => resolveParentComposeTarget({
    reportId: initialReport?.id,
    selectedClassId: null,
    targets: initialComposeTargets
  })?.classId ?? "");
  const [feedback, setFeedback] = useState<ParentActionFeedback | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [selectingThreadId, setSelectingThreadId] = useState("");
  const createAttemptRef = useRef<ParentIdempotencyAttempt | null>(null);
  const replyAttemptRef = useRef<ParentIdempotencyAttempt | null>(null);
  const threadSelectionControllerRef = useRef<AbortController | null>(null);
  const threadSelectionGenerationRef = useRef(0);
  const selectedThread = data.selectedThread;
  const activeStudentFilter = searchParams.get("studentId");
  const reportsForStudent = useMemo(() => data.reports.filter((report) => !composeStudentId || report.studentId === composeStudentId), [data.reports, composeStudentId]);
  const selectedReport = reportsForStudent.find((report) => report.id === reportId) ?? null;
  const composeTargetsForStudent = useMemo(
    () => data.composeTargets.filter((target) => target.studentId === composeStudentId),
    [composeStudentId, data.composeTargets]
  );
  const generalComposeTargetsForStudent = useMemo(
    () => composeTargetsForStudent.filter((target) => !target.reportId),
    [composeTargetsForStudent]
  );
  const selectedReportTarget = resolveParentComposeTarget({
    reportId: selectedReport?.id,
    selectedClassId: composeClassId,
    targets: composeTargetsForStudent
  });
  const availableComposeTargets = selectedReport
    ? selectedReportTarget ? [selectedReportTarget] : []
    : generalComposeTargetsForStudent;
  const effectiveClassId = selectedReportTarget?.classId ?? "";
  const navigationContextKey = parentMessageContextKey({
    studentId: searchParams.get("studentId"),
    threadId: searchParams.get("thread"),
    reportId: searchParams.get("reportId"),
    category: searchParams.get("category"),
    subject: searchParams.get("subject")
  });
  const renderedNavigationContextKeyRef = useRef(navigationContextKey);
  renderedNavigationContextKeyRef.current = navigationContextKey;
  const processedNavigationContextKeyRef = useRef(navigationContextKey);
  const dataRequestGenerationRef = useRef(0);
  const replyThreadRef = useRef(selectedThread?.id ?? "");
  const messageTemplates = [
    {
      id: "home-plan",
      label: t({ en: "Home plan", zh: "家庭計劃" }),
      category: "learning-support" as const,
      subject: t({ en: "Home practice support", zh: "家庭練習支援" }),
      body: t({ en: "Could you suggest the most useful 10-minute home practice routine for this week?", zh: "可否建議本週最有效的 10 分鐘家庭練習安排？" })
    },
    {
      id: "homework",
      label: t({ en: "Homework", zh: "作業" }),
      category: "homework" as const,
      subject: t({ en: "Question about homework progress", zh: "作業進度查詢" }),
      body: t({ en: "We want to support the assignment at home. Which step should we check first?", zh: "我們想在家支援這份作業，應先檢查哪一步？" })
    },
    {
      id: "wellbeing",
      label: t({ en: "Wellbeing", zh: "身心" }),
      category: "wellbeing" as const,
      subject: t({ en: "Learning confidence check-in", zh: "學習信心跟進" }),
      body: t({ en: "I noticed a change in confidence at home. Could we compare notes on recent class signals?", zh: "我留意到孩子在家中的信心有變化，可否對照一下近期課堂訊號？" })
    }
  ];

  function feedbackForOutcome(code: ParentMessageOutcomeCode, retryAfterSeconds?: number): ParentActionFeedback {
    if (code === "sent") {
      return { kind: "status", text: t({ en: "Message sent.", zh: "訊息已發送。", zhHans: "消息已发送。" }) };
    }
    if (code === "sent-refresh-failed") {
      return {
        kind: "status",
        text: t({
          en: "Message sent, but the conversation could not refresh. Reload to see the latest copy.",
          zh: "訊息已發送，但對話暫時未能重新整理。請重新載入查看最新內容。",
          zhHans: "消息已发送，但对话暂时无法刷新。请重新加载查看最新内容。"
        })
      };
    }
    if (code === "invalid") {
      return { kind: "error", text: t({ en: "Not sent. Check the child, class, report and message fields.", zh: "尚未發送。請檢查孩子、班級、報告及訊息欄位。", zhHans: "尚未发送。请检查孩子、班级、报告及消息字段。" }) };
    }
    if (code === "not-found") {
      return { kind: "error", text: t({ en: "Not sent. This child, class, report or conversation is no longer available.", zh: "尚未發送。此孩子、班級、報告或對話已不可用。", zhHans: "尚未发送。此孩子、班级、报告或对话已不可用。" }) };
    }
    if (code === "too-long") {
      return { kind: "error", text: t({ en: "Not sent. Shorten the subject or message and try again.", zh: "尚未發送。請縮短主題或訊息後再試。", zhHans: "尚未发送。请缩短主题或消息后重试。" }) };
    }
    if (code === "rate-limited") {
      const wait = retryAfterSeconds === undefined
        ? t({ en: "Please wait before trying again.", zh: "請稍後再試。", zhHans: "请稍后重试。" })
        : t({ en: `Try again in about ${retryAfterSeconds} seconds.`, zh: `請約 ${retryAfterSeconds} 秒後再試。`, zhHans: `请约 ${retryAfterSeconds} 秒后重试。` });
      return { kind: "error", text: `${t({ en: "Not sent because too many requests were made.", zh: "因要求過於頻密，尚未發送。", zhHans: "因请求过于频繁，尚未发送。" })} ${wait}` };
    }
    if (code === "unavailable") {
      return { kind: "error", text: t({ en: "The service is temporarily unavailable. Delivery was not confirmed; retrying is safe.", zh: "服務暫時不可用，未能確認是否送達；可安全重試。", zhHans: "服务暂时不可用，未能确认是否送达；可安全重试。" }) };
    }
    if (code === "network-ambiguous") {
      return { kind: "error", text: t({ en: "The connection ended before delivery could be confirmed. Retry safely; the same message will not be duplicated.", zh: "連線在確認送達前中斷。可安全重試，同一訊息不會重複建立。", zhHans: "连接在确认送达前中断。可安全重试，同一消息不会重复创建。" }) };
    }
    return { kind: "error", text: t({ en: "Not sent. Please try again.", zh: "尚未發送，請再試一次。", zhHans: "尚未发送，请重试。" }) };
  }

  function failureFeedback(error: unknown) {
    const failure = error as ParentRequestFailure;
    const outcome = parentMessageOutcome({
      status: failure?.status,
      retryAfter: failure?.retryAfter,
      networkError: typeof failure?.status !== "number"
    });
    return feedbackForOutcome(outcome.code, outcome.retryAfterSeconds);
  }

  function threadReadFailureFeedback(error: unknown): ParentActionFeedback {
    const failure = error as ParentRequestFailure;
    if (failure?.status === 400) {
      return { kind: "error", text: t({ en: "This conversation request is invalid. No new message was sent.", zh: "此對話要求無效，沒有發送任何新訊息。", zhHans: "此对话请求无效，没有发送任何新消息。" }) };
    }
    if (failure?.status === 404) {
      return { kind: "error", text: t({ en: "This conversation is no longer available. No new message was sent.", zh: "此對話已不可用，沒有發送任何新訊息。", zhHans: "此对话已不可用，没有发送任何新消息。" }) };
    }
    if (failure?.status === 429) {
      const outcome = parentMessageOutcome({ status: 429, retryAfter: failure.retryAfter });
      const wait = outcome.retryAfterSeconds === undefined
        ? t({ en: "Please wait before trying again.", zh: "請稍後再試。", zhHans: "请稍后重试。" })
        : t({ en: `Try again in about ${outcome.retryAfterSeconds} seconds.`, zh: `請約 ${outcome.retryAfterSeconds} 秒後再試。`, zhHans: `请约 ${outcome.retryAfterSeconds} 秒后重试。` });
      return { kind: "error", text: `${t({ en: "The conversation could not be loaded because too many requests were made. No new message was sent.", zh: "因要求過於頻密，未能載入對話；沒有發送任何新訊息。", zhHans: "因请求过于频繁，未能加载对话；没有发送任何新消息。" })} ${wait}` };
    }
    if (failure?.status === 503) {
      return { kind: "error", text: t({ en: "The conversation service is temporarily unavailable. No new message was sent.", zh: "對話服務暫時不可用，沒有發送任何新訊息。", zhHans: "对话服务暂时不可用，没有发送任何新消息。" }) };
    }
    if (typeof failure?.status !== "number") {
      return { kind: "error", text: t({ en: "The conversation could not be loaded. Check your connection and try again; no new message was sent.", zh: "未能載入對話。請檢查網絡後再試；沒有發送任何新訊息。", zhHans: "未能加载对话。请检查网络后重试；没有发送任何新消息。" }) };
    }
    return { kind: "error", text: t({ en: "The conversation could not be loaded. No new message was sent.", zh: "未能載入對話，沒有發送任何新訊息。", zhHans: "未能加载对话，没有发送任何新消息。" }) };
  }

  useEffect(() => {
    setData(initialData);
    if (processedNavigationContextKeyRef.current === navigationContextKey) return;
    processedNavigationContextKeyRef.current = navigationContextKey;
    dataRequestGenerationRef.current += 1;
    threadSelectionGenerationRef.current += 1;
    threadSelectionControllerRef.current?.abort();
    threadSelectionControllerRef.current = null;
    setSelectingThreadId("");
    const nextStudentId = searchParams.get("studentId");
    const validStudentId = nextStudentId && initialData.children.some((child) => child.student.id === nextStudentId)
      ? nextStudentId
      : "";
    const nextCategory = searchParams.get("category") as ParentMessageCategory | null;
    const nextReportId = searchParams.get("reportId");
    const nextReport = nextReportId ? initialData.reports.find((report) => report.id === nextReportId) ?? null : null;
    const fallbackStudentId = initialData.selectedChild?.student.id ?? initialData.children[0]?.student.id ?? "";
    const ownedStudentId = nextReport?.studentId || validStudentId || fallbackStudentId;
    const availableTargets = initialData.composeTargets
      .filter((target) => target.studentId === ownedStudentId);
    setComposeStudentId(ownedStudentId);
    setReportId(nextReport?.id ?? "");
    setCategory(nextReport
      ? "report-question"
      : nextCategory && initialData.categories.some((item) => item.id === nextCategory)
        ? nextCategory
        : "learning-support");
    setComposeClassId(resolveParentComposeTarget({
      reportId: nextReport?.id,
      selectedClassId: null,
      targets: availableTargets
    })?.classId ?? "");
    const nextSubject = searchParams.get("subject");
    setSubject((nextSubject ?? (nextReport ? parentReportPrefillSubject(nextReport.title, language) : "")).slice(0, parentMessageSubjectMaxLength));
    setBody("");
    setReply("");
    createAttemptRef.current = null;
    replyAttemptRef.current = null;
    setFeedback(null);
  }, [initialData, language, navigationContextKey, searchParams]);

  useEffect(() => {
    const selectedThreadId = selectedThread?.id ?? "";
    if (replyThreadRef.current === selectedThreadId) return;
    replyThreadRef.current = selectedThreadId;
    setReply("");
    replyAttemptRef.current = null;
  }, [selectedThread?.id]);

  useEffect(() => () => {
    dataRequestGenerationRef.current += 1;
    threadSelectionGenerationRef.current += 1;
    threadSelectionControllerRef.current?.abort();
  }, []);

  async function reload({
    threadId,
    studentId,
    updateUrl = false,
    signal,
    mayCommit,
    expectedContextKey = renderedNavigationContextKeyRef.current,
    expectedDataGeneration = dataRequestGenerationRef.current
  }: {
    threadId?: string;
    studentId?: string;
    updateUrl?: boolean;
    signal?: AbortSignal;
    mayCommit?: () => boolean;
    expectedContextKey?: string;
    expectedDataGeneration?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (studentId) params.set("studentId", studentId);
    if (threadId) params.set("thread", threadId);
    let response: Response;
    try {
      response = await parentFetchWithTimeout(`/api/parent/messages${params.size ? `?${params.toString()}` : ""}`, { cache: "no-store", signal });
    } catch {
      throw requestFailure();
    }
    const payload = await response.json().catch(() => null) as { data?: ParentMessagesSafeData } | null;
    if (!response.ok) throw requestFailure(response.status, response.headers.get("Retry-After"));
    if (!payload?.data) throw requestFailure();
    if (renderedNavigationContextKeyRef.current !== expectedContextKey) return null;
    if (dataRequestGenerationRef.current !== expectedDataGeneration) return null;
    if (mayCommit && !mayCommit()) return null;
    setData(payload.data);
    if (updateUrl) router.push(parentMessageHref({ studentId, threadId }), { scroll: false });
    return payload.data;
  }

  async function selectThread(threadId: string) {
    const expectedContextKey = renderedNavigationContextKeyRef.current;
    const expectedDataGeneration = dataRequestGenerationRef.current + 1;
    dataRequestGenerationRef.current = expectedDataGeneration;
    const generation = threadSelectionGenerationRef.current + 1;
    threadSelectionGenerationRef.current = generation;
    threadSelectionControllerRef.current?.abort();
    const controller = new AbortController();
    threadSelectionControllerRef.current = controller;
    const isCurrentSelection = () => (
      renderedNavigationContextKeyRef.current === expectedContextKey
      && dataRequestGenerationRef.current === expectedDataGeneration
      && parentLatestRequestIsCurrent({
        latestGeneration: threadSelectionGenerationRef.current,
        requestGeneration: generation,
        aborted: controller.signal.aborted
      })
    );
    if (selectedThread?.id !== threadId) {
      setReply("");
      replyAttemptRef.current = null;
    }
    setSelectingThreadId(threadId);
    setFeedback(null);
    try {
      await reload({
        threadId,
        studentId: activeStudentFilter ?? undefined,
        updateUrl: true,
        signal: controller.signal,
        mayCommit: isCurrentSelection,
        expectedContextKey,
        expectedDataGeneration
      });
    } catch (error) {
      if (!isCurrentSelection()) return;
      setFeedback(threadReadFailureFeedback(error));
    } finally {
      if (isCurrentSelection()) {
        threadSelectionControllerRef.current = null;
        setSelectingThreadId("");
      }
    }
  }

  async function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!composeStudentId || !effectiveClassId || !trimmedSubject || !trimmedBody || isSending) return;
    const expectedContextKey = renderedNavigationContextKeyRef.current;
    const expectedDataGeneration = dataRequestGenerationRef.current + 1;
    dataRequestGenerationRef.current = expectedDataGeneration;
    threadSelectionGenerationRef.current += 1;
    threadSelectionControllerRef.current?.abort();
    threadSelectionControllerRef.current = null;
    setSelectingThreadId("");
    const actionIsCurrent = () => (
      renderedNavigationContextKeyRef.current === expectedContextKey
      && dataRequestGenerationRef.current === expectedDataGeneration
    );
    const normalizedReportId = selectedReport?.id ?? "";
    const fingerprint = JSON.stringify({
      studentId: composeStudentId,
      classId: effectiveClassId,
      category,
      reportId: normalizedReportId,
      subject: trimmedSubject,
      body: trimmedBody
    });
    createAttemptRef.current = parentIdempotencyAttempt(createAttemptRef.current, fingerprint);
    const idempotencyKey = createAttemptRef.current.key;
    setFeedback(null);
    setIsSending(true);
    try {
      let response: Response;
      try {
        response = await parentFetchWithTimeout("/api/parent/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: composeStudentId,
            classId: effectiveClassId,
            idempotencyKey,
            category,
            reportId: normalizedReportId || null,
            subject: trimmedSubject,
            body: trimmedBody
          })
        });
      } catch {
        throw requestFailure();
      }
      const payload = await response.json().catch(() => null) as { thread?: { id: string } } | null;
      if (!response.ok) throw requestFailure(response.status, response.headers.get("Retry-After"));
      if (!payload?.thread?.id) throw requestFailure();
      if (!actionIsCurrent()) return;

      createAttemptRef.current = null;
      setSubject("");
      setBody("");
      setReportId("");
      try {
        const refreshed = await reload({
          threadId: payload.thread.id,
          studentId: activeStudentFilter ?? undefined,
          updateUrl: true,
          expectedContextKey,
          expectedDataGeneration
        });
        if (!refreshed || !actionIsCurrent()) return;
        setFeedback(feedbackForOutcome("sent"));
      } catch {
        if (actionIsCurrent()) setFeedback(feedbackForOutcome("sent-refresh-failed"));
      }
      if (actionIsCurrent()) router.refresh();
    } catch (error) {
      if (actionIsCurrent()) setFeedback(failureFeedback(error));
    } finally {
      setIsSending(false);
    }
  }

  async function sendReply() {
    const trimmedReply = reply.trim();
    if (!selectedThread || !trimmedReply || isReplying || selectingThreadId) return;
    const expectedContextKey = renderedNavigationContextKeyRef.current;
    const expectedDataGeneration = dataRequestGenerationRef.current + 1;
    dataRequestGenerationRef.current = expectedDataGeneration;
    threadSelectionGenerationRef.current += 1;
    threadSelectionControllerRef.current?.abort();
    threadSelectionControllerRef.current = null;
    setSelectingThreadId("");
    const actionIsCurrent = () => (
      renderedNavigationContextKeyRef.current === expectedContextKey
      && dataRequestGenerationRef.current === expectedDataGeneration
    );
    const fingerprint = JSON.stringify({ threadId: selectedThread.id, body: trimmedReply });
    replyAttemptRef.current = parentIdempotencyAttempt(replyAttemptRef.current, fingerprint);
    const idempotencyKey = replyAttemptRef.current.key;
    setIsReplying(true);
    setFeedback(null);
    try {
      let response: Response;
      try {
        response = await parentFetchWithTimeout(`/api/parent/messages/${encodeURIComponent(selectedThread.id)}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmedReply, idempotencyKey })
        });
      } catch {
        throw requestFailure();
      }
      const payload = await response.json().catch(() => null) as { entryId?: string } | null;
      if (!response.ok) throw requestFailure(response.status, response.headers.get("Retry-After"));
      if (!payload?.entryId) throw requestFailure();
      if (!actionIsCurrent()) return;

      replyAttemptRef.current = null;
      setReply("");
      try {
        const refreshed = await reload({
          threadId: selectedThread.id,
          studentId: activeStudentFilter ?? undefined,
          updateUrl: true,
          expectedContextKey,
          expectedDataGeneration
        });
        if (!refreshed || !actionIsCurrent()) return;
        setFeedback(feedbackForOutcome("sent"));
      } catch {
        if (actionIsCurrent()) setFeedback(feedbackForOutcome("sent-refresh-failed"));
      }
    } catch (error) {
      if (actionIsCurrent()) setFeedback(failureFeedback(error));
    } finally {
      setIsReplying(false);
    }
  }

  if (!data.children.length) {
    return <EmptyParentState title={t({ en: "No linked child yet", zh: "尚未綁定孩子" })} body={t({ en: "Connect a child before messaging teachers.", zh: "綁定孩子後即可與教師私信。" })} actionHref="/parent/connect" />;
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(250px,300px)_minmax(0,1fr)_minmax(290px,340px)]">
      {feedback ? (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live={feedback.kind === "error" ? "assertive" : "polite"}
          className={`rounded-2xl border px-4 py-3 text-sm font-bold [overflow-wrap:anywhere] xl:col-span-3 ${feedback.kind === "error" ? "border-rose-300/50 bg-rose-400/10 text-rose-700 dark:text-rose-200" : "border-emerald-300/50 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100"}`}
        >
          {feedback.text}
        </p>
      ) : null}
      <aside className="glass-panel min-w-0 overflow-hidden p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Threads", zh: "對話" })}</h1>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              {data.threads.length} {t({ en: "visible", zh: "可見" })}
            </p>
          </div>
          <Link
            href="/parent/messages"
            aria-current={!activeStudentFilter ? "page" : undefined}
            className={`focus-ring rounded-full border px-3 py-2 text-xs font-black ${!activeStudentFilter ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"}`}
          >
            {t({ en: "All", zh: "全部" })}
          </Link>
        </div>
        <div className="mt-4 grid gap-2">
          {data.threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              aria-pressed={selectedThread?.id === thread.id}
              aria-busy={selectingThreadId === thread.id}
              disabled={selectingThreadId === thread.id}
              onClick={() => void selectThread(thread.id)}
              className={`focus-ring min-w-0 rounded-2xl border p-3 text-left disabled:cursor-wait disabled:opacity-70 ${selectedThread?.id === thread.id ? "border-cyan-300/55 bg-cyan-400/12" : "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-black [overflow-wrap:anywhere]">{text(thread.subject)}</p>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${parentMessageStatusClasses(thread.status)}`}>
                  {t(parentMessageStatusLabel(thread.status))}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-cyan-700 [overflow-wrap:anywhere] dark:text-cyan-200">{thread.teacherName} · {thread.studentName}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
                {t(parentMessageCategoryLabel(thread.parentCategory))} · {formatDate(thread.lastMessageAt, language)}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">{thread.latestMessage}</p>
            </button>
          ))}
          {!data.threads.length ? <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No parent messages yet.", zh: "尚未有家長私信。" })}</p> : null}
        </div>
      </aside>

      <section className="glass-panel min-w-0 overflow-hidden p-4 sm:p-5">
        {selectedThread ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-600 [overflow-wrap:anywhere] dark:text-cyan-300">{selectedThread.teacherName}</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{text(selectedThread.subject)}</h2>
                <p className="mt-2 text-sm font-bold text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
                  {selectedThread.studentName}
                  {selectedThread.className ? ` · ${selectedThread.className}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${parentMessageStatusClasses(selectedThread.status)}`}>
                  {t(parentMessageStatusLabel(selectedThread.status))}
                </span>
                <span className="rounded-full border border-cyan-300/60 bg-cyan-400/12 px-3 py-1 text-xs font-black text-cyan-800 dark:text-cyan-100">
                  {t(parentMessageCategoryLabel(selectedThread.parentCategory))}
                </span>
              </div>
            </div>
            {selectedThread.reportId ? (
              <Link href={`/parent/reports?studentId=${encodeURIComponent(selectedThread.studentId)}`} className="focus-ring mt-4 inline-flex rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                {t({ en: "Open linked report", zh: "打開關聯報告" })}
              </Link>
            ) : null}
            <div className="mt-5 grid gap-3">
              {selectedThread.messages.map((entry) => (
                <div key={entry.id} className={`min-w-0 max-w-[92%] rounded-2xl border p-4 sm:max-w-[86%] ${entry.senderRole === "teacher" ? "border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.06]" : "ml-auto border-cyan-300/45 bg-cyan-400/10"}`}>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">{entry.senderName} · {formatDate(entry.createdAt, language)}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">{entry.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3">
              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "Reply", zh: "回覆", zhHans: "回复" })}</span>
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  disabled={Boolean(selectingThreadId)}
                  maxLength={parentMessageBodyMaxLength}
                  rows={4}
                  placeholder={t({ en: "Reply with home context or a follow-up question...", zh: "回覆家庭情況或後續問題...", zhHans: "回复家庭情况或后续问题..." })}
                  className="focus-ring min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm [overflow-wrap:anywhere] dark:border-white/10 dark:bg-white/[0.06]"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{reply.length}/{parentMessageBodyMaxLength}</p>
                <button onClick={sendReply} disabled={!reply.trim() || isReplying || Boolean(selectingThreadId)} type="button" className="focus-ring w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950">
                  {isReplying ? t({ en: "Sending...", zh: "發送中..." }) : t({ en: "Send reply", zh: "發送回覆" })}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Choose or create a parent-teacher thread.", zh: "選擇或建立家校對話。" })}</p>
        )}
      </section>

      <aside className="glass-panel min-w-0 overflow-hidden p-4">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Ask teacher", zh: "聯絡教師" })}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {messageTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                setCategory(template.category);
                setSubject(template.subject.slice(0, parentMessageSubjectMaxLength));
                setBody(template.body.slice(0, parentMessageBodyMaxLength));
              }}
              className="focus-ring rounded-full border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
            >
              {template.label}
            </button>
          ))}
        </div>
        <form onSubmit={createThread} className="mt-4 grid gap-3">
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "Child", zh: "孩子" })}</span>
            <select
              value={composeStudentId}
              onChange={(event) => {
                const studentId = event.target.value;
                const targets = data.composeTargets.filter((target) => target.studentId === studentId);
                setComposeStudentId(studentId);
                setComposeClassId(resolveParentComposeTarget({ reportId: null, selectedClassId: null, targets })?.classId ?? "");
                setReportId("");
                setSubject("");
                setBody("");
                createAttemptRef.current = null;
                setFeedback(null);
              }}
              className="focus-ring min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]"
            >
              {data.children.map((child) => <option key={child.student.id} value={child.student.id}>{child.student.name}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "Class and teacher", zh: "班級與教師", zhHans: "班级与教师" })}</span>
            <select
              value={effectiveClassId}
              disabled={Boolean(selectedReport) || !availableComposeTargets.length}
              onChange={(event) => {
                setComposeClassId(event.target.value);
                createAttemptRef.current = null;
              }}
              required
              className="focus-ring min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/[0.06]"
            >
              <option value="">
                {availableComposeTargets.length
                  ? t({ en: "Choose a class and teacher", zh: "選擇班級與教師", zhHans: "选择班级与教师" })
                  : t({ en: "No available teacher", zh: "沒有可聯絡教師", zhHans: "没有可联系教师" })}
              </option>
              {availableComposeTargets.map((target) => (
                <option key={`${target.studentId}:${target.classId}:${target.teacherId}:${target.reportId ?? "general"}`} value={target.classId}>
                  {target.className} · {target.teacherName}
                </option>
              ))}
            </select>
          </label>
          {generalComposeTargetsForStudent.length > 1 && !selectedReport && !effectiveClassId ? (
            <p className="rounded-2xl border border-amber-300/50 bg-amber-400/10 px-3 py-2 text-xs font-bold leading-5 text-amber-800 dark:text-amber-100">
              {t({ en: "This child has more than one class. Choose the teacher who should receive this message.", zh: "此孩子屬於多個班級，請明確選擇接收訊息的教師。", zhHans: "此孩子属于多个班级，请明确选择接收消息的教师。" })}
            </p>
          ) : null}
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "Category", zh: "類別", zhHans: "类别" })}</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as ParentMessageCategory)} className="focus-ring min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              {data.categories.map((item) => <option key={item.id} value={item.id}>{text(item.label)}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "Linked report", zh: "關聯報告", zhHans: "关联报告" })}</span>
            <select
              value={reportId}
              onChange={(event) => {
                const nextReportId = event.target.value;
                const report = reportsForStudent.find((item) => item.id === nextReportId) ?? null;
                setReportId(nextReportId);
                const target = resolveParentComposeTarget({
                  reportId: report?.id,
                  selectedClassId: null,
                  targets: composeTargetsForStudent
                });
                setComposeClassId(target?.classId ?? "");
                if (report) {
                  setCategory("report-question");
                  setSubject(parentReportPrefillSubject(report.title, language).slice(0, parentMessageSubjectMaxLength));
                } else {
                  setSubject("");
                }
                setBody("");
                createAttemptRef.current = null;
                setFeedback(null);
              }}
              className="focus-ring min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]"
            >
              <option value="">{t({ en: "No linked report", zh: "不連結報告", zhHans: "不关联报告" })}</option>
              {reportsForStudent.map((report) => <option key={report.id} value={report.id}>{text(report.title)}</option>)}
            </select>
          </label>
          {selectedReport ? (
            <p className="rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold leading-5 text-cyan-800 [overflow-wrap:anywhere] dark:text-cyan-100">
              {t({ en: "Linked report", zh: "關聯報告", zhHans: "关联报告" })}: {text(selectedReport.title)} · {t({ en: "Author", zh: "作者", zhHans: "作者" })}: {selectedReportTarget?.teacherName ?? selectedReport.teacherName}
            </p>
          ) : null}
          {selectedReport && !selectedReportTarget ? (
            <p role="alert" className="rounded-2xl border border-rose-300/50 bg-rose-400/10 px-3 py-2 text-xs font-bold leading-5 text-rose-700 [overflow-wrap:anywhere] dark:text-rose-200">
              {t({
                en: "This report author is no longer available for parent messages. Choose another report or contact an active class teacher without linking a report.",
                zh: "此報告作者目前已不可接收家長私信。請選擇其他報告，或取消連結報告後聯絡仍在任的班級教師。",
                zhHans: "此报告作者目前已无法接收家长消息。请选择其他报告，或取消关联报告后联系仍在任的班级教师。"
              })}
            </p>
          ) : null}
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "Subject", zh: "主題", zhHans: "主题" })}</span>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={parentMessageSubjectMaxLength} required className="focus-ring min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold [overflow-wrap:anywhere] dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <p className="-mt-2 text-right text-xs font-bold text-slate-500 dark:text-slate-400">{subject.length}/{parentMessageSubjectMaxLength}</p>
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "Message", zh: "訊息", zhHans: "消息" })}</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={parentMessageBodyMaxLength} required rows={5} placeholder={t({ en: "What context would help at home?", zh: "家中想了解甚麼支援方向？", zhHans: "家中想了解什么支持方向？" })} className="focus-ring min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm [overflow-wrap:anywhere] dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <p className="-mt-2 text-right text-xs font-bold text-slate-500 dark:text-slate-400">{body.length}/{parentMessageBodyMaxLength}</p>
          <button disabled={!composeStudentId || !effectiveClassId || !subject.trim() || !body.trim() || isSending} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950">
            {isSending ? t({ en: "Sending...", zh: "發送中..." }) : t({ en: "Send message", zh: "發送訊息" })}
          </button>
        </form>
      </aside>
    </div>
  );
}

export function ParentConnectView() {
  const router = useRouter();
  const { t } = useSettings();
  const [inviteCode, setInviteCode] = useState("");
  const [relationship, setRelationship] = useState<GuardianRelationship>("guardian");
  const [feedback, setFeedback] = useState<ParentActionFeedback | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  function linkFailure(status?: number, retryAfter?: string | null): ParentActionFeedback {
    if (status === 400) return { kind: "error", text: t({ en: "Check the invite code and relationship, then try again.", zh: "請檢查邀請碼和關係後再試。", zhHans: "请检查邀请码和关系后重试。" }) };
    if (status === 404) return { kind: "error", text: t({ en: "This invite code was not found.", zh: "找不到此邀請碼。", zhHans: "找不到此邀请码。" }) };
    if (status === 409) return { kind: "error", text: t({ en: "This invitation has already been used or the child is already connected.", zh: "此邀請已使用，或孩子已經綁定。", zhHans: "此邀请已使用，或孩子已经绑定。" }) };
    if (status === 410) return { kind: "error", text: t({ en: "This invitation has expired or was revoked. Ask the teacher for a new code.", zh: "此邀請已過期或被撤銷，請向教師索取新邀請碼。", zhHans: "此邀请已过期或被撤销，请向教师索取新邀请码。" }) };
    if (status === 429) {
      const seconds = Number(retryAfter);
      return {
        kind: "error",
        text: Number.isFinite(seconds)
          ? t({ en: `Too many attempts. Try again in about ${Math.ceil(seconds)} seconds.`, zh: `嘗試次數過多，請約 ${Math.ceil(seconds)} 秒後再試。`, zhHans: `尝试次数过多，请约 ${Math.ceil(seconds)} 秒后重试。` })
          : t({ en: "Too many attempts. Please wait before trying again.", zh: "嘗試次數過多，請稍後再試。", zhHans: "尝试次数过多，请稍后重试。" })
      };
    }
    if (status === 503) return { kind: "error", text: t({ en: "The service is temporarily unavailable. No child was connected; please try again.", zh: "服務暫時不可用，尚未綁定孩子；請再試一次。", zhHans: "服务暂时不可用，尚未绑定孩子；请重试。" }) };
    if (status === undefined) return { kind: "error", text: t({ en: "The connection failed before linking could be confirmed. Check your network and try again.", zh: "連線在確認綁定前中斷，請檢查網絡後再試。", zhHans: "连接在确认绑定前中断，请检查网络后重试。" }) };
    return { kind: "error", text: t({ en: "The invite code could not be linked.", zh: "暫時未能使用此邀請碼綁定。", zhHans: "暂时无法使用此邀请码绑定。" }) };
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteCode.trim() || isConnecting) return;
    setFeedback(null);
    setIsConnecting(true);
    try {
      let response: Response;
      try {
        response = await parentFetchWithTimeout("/api/parent/children/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: inviteCode.trim(), relationship })
        });
      } catch {
        setFeedback(linkFailure());
        return;
      }
      if (!response.ok) {
        setFeedback(linkFailure(response.status, response.headers.get("Retry-After")));
        return;
      }
      setFeedback({ kind: "status", text: t({ en: "Child connected. Opening the family overview...", zh: "孩子已綁定，正在打開家庭總覽...", zhHans: "孩子已绑定，正在打开家庭总览..." }) });
      router.push("/parent");
      router.refresh();
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <section className="glass-panel p-6 sm:p-8">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Connect child", zh: "綁定孩子" })}</p>
      <h1 className="mt-3 text-4xl font-black text-slate-950 dark:text-white">{t({ en: "Use a parent invite code", zh: "使用家長邀請碼" })}</h1>
      <form onSubmit={connect} className="mt-6 grid max-w-xl gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "Invite code", zh: "邀請碼" })}</span>
          <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} maxLength={parentInviteCodeMaxLength} required className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-lg font-black uppercase tracking-[0.12em] dark:border-white/10 dark:bg-white/[0.06]" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t({ en: "Relationship", zh: "關係" })}</span>
          <select value={relationship} onChange={(event) => setRelationship(event.target.value as GuardianRelationship)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
            <option value="guardian">{t({ en: "Guardian", zh: "監護人" })}</option>
            <option value="mother">{t({ en: "Mother", zh: "母親" })}</option>
            <option value="father">{t({ en: "Father", zh: "父親" })}</option>
            <option value="other">{t({ en: "Other", zh: "其他" })}</option>
          </select>
        </label>
        <button disabled={!inviteCode.trim() || isConnecting} className="focus-ring w-fit rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950">
          {isConnecting ? t({ en: "Connecting...", zh: "綁定中...", zhHans: "绑定中..." }) : t({ en: "Connect", zh: "綁定", zhHans: "绑定" })}
        </button>
      </form>
      {feedback ? (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live={feedback.kind === "error" ? "assertive" : "polite"}
          className={`mt-4 max-w-xl rounded-2xl border px-4 py-3 text-sm font-bold [overflow-wrap:anywhere] ${feedback.kind === "error" ? "border-rose-300/50 bg-rose-400/10 text-rose-700 dark:text-rose-200" : "border-emerald-300/50 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100"}`}
        >
          {feedback.text}
        </p>
      ) : null}
    </section>
  );
}
