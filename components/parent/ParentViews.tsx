"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ParentMotivationSummary } from "@/components/gamification/ParentMotivationSummary";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, simplifyChineseText } from "@/lib/i18n";
import { parentInviteCodeMaxLength, parentMessageBodyMaxLength, parentMessageSubjectMaxLength } from "@/lib/parentConstraints";
import { formatDateInHongKong } from "@/lib/utils";
import type {
  GuardianRelationship,
  Language,
  ParentChildSummary,
  ParentFoundationData,
  ParentMessageCategory,
  ParentMessagesData,
  ParentReportData,
  TeacherReport
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

function pendingAssignmentCount(child: ParentChildSummary) {
  return child.assignments.filter((item) => openAssignmentStatuses.has(item.submission.status)).length;
}

function correctionAssignmentCount(child: ParentChildSummary) {
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

function parentReportMessageHref(report: TeacherReport) {
  const params = new URLSearchParams();
  if (report.studentId) params.set("studentId", report.studentId);
  params.set("category", "report-question");
  params.set("reportId", report.id);
  params.set("subject", `Question about ${report.title.en}`);
  return `/parent/messages?${params.toString()}`;
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

function ChildPulseCard({ child }: { child: ParentChildSummary }) {
  const { language, t, text } = useSettings();
  const maxMinutes = Math.max(1, ...child.weeklyActivity.map((day) => day.minutes));

  return (
    <article className="glass-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
            {formatGradeLabel(child.student.grade, language, true)}
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{child.student.name}</h2>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
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
        {child.weeklyActivity.map((day) => (
          <div key={day.day} className="grid h-full items-end gap-1 text-center">
            <div className="rounded-t-xl bg-cyan-400" style={{ height: `${Math.max(8, (day.minutes / maxMinutes) * 100)}%` }} />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{day.day}</span>
          </div>
        ))}
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

function FamilyOperationsBoard({ data }: { data: ParentFoundationData }) {
  const { language, t, text } = useSettings();
  const selectedChild = data.selectedChild ?? data.children[0];
  const totalMinutes = data.children.reduce((sum, child) => sum + child.learningMinutes7d, 0);
  const averageMastery = data.children.length
    ? Math.round(data.children.reduce((sum, child) => sum + child.averageMastery, 0) / data.children.length)
    : 0;
  const supportTopicCount = data.children.reduce((sum, child) => sum + child.supportTopics.length, 0);
  const correctionCount = data.children.reduce((sum, child) => sum + correctionAssignmentCount(child), 0);
  const focusedHref = (href: string) => {
    if (!selectedChild || href === "/parent/connect") return href;
    const params = new URLSearchParams();
    params.set("studentId", selectedChild.student.id);
    return `${href}?${params.toString()}`;
  };
  const correction = selectedChild?.assignments.find((item) => item.submission.status === "correction-required") ?? null;
  const openAssignment = selectedChild?.assignments.find((item) => openAssignmentStatuses.has(item.submission.status)) ?? null;
  const topSupportTopic = selectedChild?.supportTopics[0] ?? null;
  const nextAction = correction
    ? {
        eyebrow: t({ en: "Correction follow-up", zh: "訂正跟進" }),
        title: text(correction.assignment.title),
        body: correction.submission.correctionRequest
          ? text(correction.submission.correctionRequest)
          : t({ en: "Check the teacher's correction request and help schedule a short redo block.", zh: "查看教師訂正要求，安排一段短時間重做。" }),
        href: focusedHref("/parent/messages")
      }
    : openAssignment
      ? {
          eyebrow: t({ en: "Assignment attention", zh: "作業留意" }),
          title: text(openAssignment.assignment.title),
          body: t({ en: "Confirm the plan at home and ask the teacher if the task context is unclear.", zh: "在家確認完成計劃，如不清楚任務背景可向教師查詢。" }),
          href: focusedHref("/parent/messages")
        }
      : topSupportTopic
        ? {
            eyebrow: t({ en: "Home practice focus", zh: "家庭練習焦點" }),
            title: text(topSupportTopic.title),
            body: t({ en: "Use a 10-minute explanation check before the next practice session.", zh: "下次練習前，可用 10 分鐘做一次口頭講解檢查。" }),
            href: focusedHref("/parent/reports")
          }
        : {
            eyebrow: t({ en: "Keep momentum", zh: "保持節奏" }),
            title: selectedChild ? selectedChild.student.name : t({ en: "Family routine", zh: "家庭節奏" }),
            body: t({ en: "Celebrate the latest effort and keep the routine light, visible, and consistent.", zh: "鼓勵最近的努力，保持輕量、可見且穩定的學習節奏。" }),
            href: focusedHref("/parent/reports")
          };

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Family command center", zh: "家庭指揮中心" })}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {t({ en: "Portfolio health and parent actions", zh: "孩子組合健康度與家長行動" })}
            </h2>
          </div>
          <p className="rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300">
            {formatDate(data.selectedChild?.generatedAt ?? null, language)}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: t({ en: "7d learning", zh: "7日學習" }), value: `${totalMinutes}m`, hint: t({ en: "family total", zh: "家庭總計" }) },
            { label: t({ en: "Avg mastery", zh: "平均掌握" }), value: `${averageMastery}%`, hint: t({ en: "linked children", zh: "已綁定孩子" }) },
            { label: t({ en: "Support topics", zh: "支援課題" }), value: supportTopicCount, hint: t({ en: "needs visibility", zh: "需要看見" }) },
            { label: t({ en: "Corrections", zh: "訂正" }), value: correctionCount, hint: t({ en: "parent follow-up", zh: "家長跟進" }) }
          ].map((item) => (
            <article key={item.label} className="soft-panel min-h-28 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{item.value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.hint}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            { label: t({ en: "Read reports", zh: "閱讀摘要" }), body: t({ en: "Review teacher-published parent summaries.", zh: "查看教師發佈的家長摘要。" }), href: focusedHref("/parent/reports") },
            { label: t({ en: "Message teacher", zh: "聯絡教師" }), body: t({ en: "Ask for context without exposing student private chats.", zh: "在不暴露學生私信的情況下詢問背景。" }), href: `${focusedHref("/parent/messages")}&category=learning-support` },
            { label: t({ en: "Confirm notices", zh: "確認通知" }), body: t({ en: "Keep school receipts and review updates current.", zh: "讓學校通知回執與講評更新保持最新。" }), href: focusedHref("/parent/notices") },
            { label: t({ en: "Connect another child", zh: "綁定另一位孩子" }), body: t({ en: "Use a teacher invite code for another learner.", zh: "使用教師邀請碼綁定另一位學習者。" }), href: "/parent/connect" }
          ].map((item) => (
            <Link key={item.label} href={item.href} className="focus-ring soft-panel block p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/50">
              <p className="text-sm font-black text-slate-950 dark:text-white">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.body}</p>
            </Link>
          ))}
        </div>
      </div>

      <aside className="glass-panel p-5 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">
          {t({ en: "Next best action", zh: "下一個最佳行動" })}
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{nextAction.title}</h2>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{nextAction.eyebrow}</p>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{nextAction.body}</p>
        {selectedChild ? (
          <div className="mt-5 grid gap-2">
            <p className="rounded-2xl bg-white/70 px-3 py-2 text-sm font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {t({ en: "Focus child", zh: "焦點孩子" })}: {selectedChild.student.name}
            </p>
            <p className="rounded-2xl bg-white/70 px-3 py-2 text-sm font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {t({ en: "Latest activity", zh: "最近活動" })}: {formatOptionalDate(selectedChild.latestActivityAt, language)}
            </p>
          </div>
        ) : null}
        <Link href={nextAction.href} className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
          {t({ en: "Open action", zh: "打開行動" })}
        </Link>
      </aside>
    </section>
  );
}

export function ParentOverview({ data }: { data: ParentFoundationData }) {
  const { language, t } = useSettings();
  if (!data.children.length) {
    return <EmptyParentState title={t({ en: "Connect your first child", zh: "綁定第一位孩子" })} body={t({ en: "Ask the teacher for a parent invite code to open learning summaries and parent-teacher messages.", zh: "向教師索取家長邀請碼，即可查看學習摘要和家校私信。" })} actionHref="/parent/connect" />;
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Family learning hub", zh: "家庭學習中心" })}</p>
        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{t({ en: "Today’s home-school picture", zh: "今日家校合作概覽" })}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              {t({ en: "See where to celebrate, where to support, and when to ask the teacher for context.", zh: "看清哪些地方值得鼓勵、哪些地方需要家庭支援，以及何時向教師了解更多。" })}
            </p>
          </div>
          <p className="rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300">
            {formatDate(data.selectedChild?.generatedAt ?? null, language)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t({ en: "Linked children", zh: "已綁定孩子" }), value: data.totals.children },
          { label: t({ en: "Parent reports", zh: "家長摘要" }), value: data.totals.activeReports },
          { label: t({ en: "Open messages", zh: "待跟進私信" }), value: data.totals.openMessages },
          { label: t({ en: "Pending tasks", zh: "待留意任務" }), value: data.totals.pendingAssignments }
        ].map((item) => (
          <article key={item.label} className="glass-panel p-5">
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-4 text-4xl font-black gradient-text">{item.value}</p>
          </article>
        ))}
      </section>

      <FamilyOperationsBoard data={data} />

      <section className="grid gap-4 xl:grid-cols-2">
        {data.children.map((child) => (
          <Link key={child.student.id} href={`/parent/children/${encodeURIComponent(child.student.id)}`} className="focus-ring block rounded-[1.75rem]">
            <ChildPulseCard child={child} />
          </Link>
        ))}
      </section>
    </div>
  );
}

function ChildWorkflowStrip({ child }: { child: ParentChildSummary }) {
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

export function ParentChildDetail({ child }: { child: ParentChildSummary }) {
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
            <article key={item.submission.id} className="soft-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">{text(item.assignment.title)}</p>
                  <p className="mt-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">{item.className}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${assignmentStatusClasses(item.submission.status)}`}>
                  {t(assignmentStatusLabel(item.submission.status))}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t({ en: "Score", zh: "分數" })}: {item.submission.score ?? "-"} · {t({ en: "Due", zh: "截止" })} {formatOptionalDate(item.assignment.dueAt, language)} · {t({ en: "Updated", zh: "更新" })} {formatDate(item.submission.updatedAt, language)}
              </p>
              {item.submission.correctionRequest ? (
                <p className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs font-bold leading-5 text-amber-800 dark:border-amber-200/25 dark:bg-amber-300/[0.12] dark:text-amber-100">
                  {t({ en: "Correction", zh: "訂正" })}: {text(item.submission.correctionRequest)}
                  {item.submission.correctionDueAt ? ` · ${formatDate(item.submission.correctionDueAt, language)}` : ""}
                </p>
              ) : null}
              {item.submission.feedback ? (
                <p className="mt-3 text-xs font-bold leading-5 text-slate-600 dark:text-slate-300">{t({ en: "Teacher feedback", zh: "教師回饋" })}: {text(item.submission.feedback)}</p>
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

      <ChildDataRightsCard child={child} />
    </div>
  );
}

/**
 * Under COPPA §312.6 the deletion right belongs to the parent, so a guardian
 * needs their own route to it rather than having to ask an operator.
 */
function ChildDataRightsCard({ child }: { child: ParentChildSummary }) {
  const { t } = useSettings();

  return (
    <section className="glass-panel p-5">
      <h2 className="text-2xl font-black text-slate-950 dark:text-white">
        {t({ en: "Your child's data", zh: "你子女的資料", zhHans: "你子女的数据" })}
      </h2>
      <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
        {t({
          en: "As this learner's guardian you can permanently delete their account and all of their data. Deletion happens straight away and cannot be undone.",
          zh: "作為此學生的家長／監護人，你可永久刪除其帳戶及所有資料。刪除即時生效，且無法復原。",
          zhHans: "作为此学生的家长／监护人，你可永久删除其账户及所有数据。删除立即生效，且无法恢复。"
        })}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/account/delete?studentId=${encodeURIComponent(child.student.id)}`}
          className="focus-ring inline-flex items-center rounded-full border border-rose-300/70 bg-rose-50/80 px-4 py-2 text-sm font-black text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100/80 dark:border-rose-300/25 dark:bg-rose-400/[0.1] dark:text-rose-100"
        >
          {t({ en: "Delete this account and data", zh: "刪除此帳戶及資料", zhHans: "删除此账户及数据" })}
        </Link>
        <Link
          href="/privacy#your-rights"
          className="focus-ring inline-flex items-center rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200"
        >
          {t({ en: "Read the privacy policy", zh: "閱讀私隱政策", zhHans: "阅读隐私政策" })}
        </Link>
      </div>
    </section>
  );
}

function ReportCard({ report, showActions = false }: { report: TeacherReport; showActions?: boolean }) {
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
    <article className="soft-panel mt-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">{text(report.title)}</p>
          <p className="mt-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">{formatDate(report.generatedAt, language)}</p>
        </div>
        <span className="rounded-full border border-cyan-300/60 bg-cyan-400/12 px-3 py-1 text-xs font-black text-cyan-800 dark:text-cyan-100">
          {t({ en: "Parent summary", zh: "家長摘要" })}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{text(report.summary)}</p>
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
                  <p key={item} className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-100">{item}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">{t({ en: "Watch", zh: "留意" })}</p>
              <div className="mt-2 grid gap-2">
                {(report.preview.weaknesses.length ? report.preview.weaknesses : report.preview.mistakeTypes).slice(0, 2).map((item) => (
                  <p key={item} className="rounded-2xl bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-100">{item}</p>
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            {t({ en: "Suggested practice", zh: "建議練習" })}: {suggestedPractice.length ? suggestedPractice.join(" · ") : t({ en: "No specific practice suggested yet.", zh: "暫未有指定建議練習。" })}
          </p>
        </div>
      ) : null}
      {showActions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={parentReportMessageHref(report)} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Ask teacher about this report", zh: "就此報告詢問教師" })}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function ParentReportsView({ data }: { data: ParentReportData }) {
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
          <Link href="/parent/reports" className={`focus-ring rounded-full border px-4 py-2 text-sm font-black ${!selectedChild ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"}`}>
            {t({ en: "All children", zh: "全部孩子" })}
          </Link>
          {data.children.map((child) => {
            const active = selectedChild?.student.id === child.student.id;
            const params = new URLSearchParams({ studentId: child.student.id });
            return (
              <Link key={child.student.id} href={`/parent/reports?${params.toString()}`} className={`focus-ring rounded-full border px-4 py-2 text-sm font-black ${active ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"}`}>
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

export function ParentMessagesView({ initialData }: { initialData: ParentMessagesData }) {
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
  const [composeStudentId, setComposeStudentId] = useState(initialComposeStudentId);
  const [reportId, setReportId] = useState(requestedReportId && initialData.reports.some((report) => report.id === requestedReportId) ? requestedReportId : "");
  const [subject, setSubject] = useState((searchParams.get("subject") ?? "").slice(0, parentMessageSubjectMaxLength));
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const selectedThread = data.selectedThread;
  const reportsForStudent = useMemo(() => data.reports.filter((report) => !composeStudentId || report.studentId === composeStudentId), [data.reports, composeStudentId]);
  const selectedReport = reportsForStudent.find((report) => report.id === reportId) ?? null;
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

  function messageHref(studentId?: string | null, threadId?: string | null) {
    const params = new URLSearchParams();
    if (studentId) params.set("studentId", studentId);
    if (threadId) params.set("thread", threadId);
    return params.toString() ? `/parent/messages?${params.toString()}` : "/parent/messages";
  }

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    const nextStudentId = searchParams.get("studentId");
    if (nextStudentId && data.children.some((child) => child.student.id === nextStudentId)) {
      setComposeStudentId(nextStudentId);
    }
    const nextCategory = searchParams.get("category") as ParentMessageCategory | null;
    if (nextCategory && data.categories.some((item) => item.id === nextCategory)) {
      setCategory(nextCategory);
    }
    const nextReportId = searchParams.get("reportId");
    if (nextReportId && data.reports.some((report) => report.id === nextReportId)) {
      setReportId(nextReportId);
    }
    const nextSubject = searchParams.get("subject");
    if (nextSubject && !subject.trim()) {
      setSubject(nextSubject.slice(0, parentMessageSubjectMaxLength));
    }
  }, [data.categories, data.children, data.reports, searchParams, subject]);

  async function reload({ threadId, studentId, updateUrl = false }: { threadId?: string; studentId?: string; updateUrl?: boolean } = {}) {
    const params = new URLSearchParams();
    if (studentId) params.set("studentId", studentId);
    if (threadId) params.set("thread", threadId);
    const response = await fetch(`/api/parent/messages?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json().catch(() => null) as { data?: ParentMessagesData } | null;
    if (response.ok && payload?.data) {
      setData(payload.data);
      if (updateUrl) router.push(messageHref(studentId, threadId), { scroll: false });
    }
  }

  useEffect(() => {
    if (!selectedThread) return;
    const currentStudentId = searchParams.get("studentId");
    const currentThreadId = searchParams.get("thread");
    if (currentStudentId === selectedThread.studentId && currentThreadId === selectedThread.id) return;
    router.replace(messageHref(selectedThread.studentId, selectedThread.id), { scroll: false });
  }, [router, searchParams, selectedThread?.id, selectedThread?.studentId]);

  async function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!composeStudentId || !subject.trim() || !body.trim() || isSending) return;
    setMessage("");
    setIsSending(true);
    const response = await fetch("/api/parent/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: composeStudentId, category, reportId, subject, body })
    });
    const payload = await response.json().catch(() => null) as { thread?: { id: string } } | null;
    if (!response.ok || !payload?.thread) {
      setIsSending(false);
      setMessage(t({ en: "Could not send this parent message.", zh: "暫時未能發送家長私信。" }));
      return;
    }
    setSubject("");
    setBody("");
    setReportId("");
    await reload({ threadId: payload.thread.id, studentId: composeStudentId, updateUrl: true });
    setIsSending(false);
    router.refresh();
  }

  async function sendReply() {
    if (!selectedThread || !reply.trim() || isReplying) return;
    setIsReplying(true);
    setMessage("");
    const response = await fetch(`/api/parent/messages/${encodeURIComponent(selectedThread.id)}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply })
    });
    if (!response.ok) {
      setIsReplying(false);
      setMessage(t({ en: "Could not send reply.", zh: "暫時未能發送回覆。" }));
      return;
    }
    setReply("");
    await reload({ threadId: selectedThread.id, studentId: selectedThread.studentId, updateUrl: true });
    setIsReplying(false);
  }

  if (!data.children.length) {
    return <EmptyParentState title={t({ en: "No linked child yet", zh: "尚未綁定孩子" })} body={t({ en: "Connect a child before messaging teachers.", zh: "綁定孩子後即可與教師私信。" })} actionHref="/parent/connect" />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      <aside className="glass-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Threads", zh: "對話" })}</h1>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              {data.threads.length} {t({ en: "visible", zh: "可見" })}
            </p>
          </div>
          <Link href="/parent/messages" className="focus-ring rounded-full border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
            {t({ en: "All", zh: "全部" })}
          </Link>
        </div>
        <div className="mt-4 grid gap-2">
          {data.threads.map((thread) => (
            <button key={thread.id} type="button" onClick={() => void reload({ threadId: thread.id, studentId: thread.studentId, updateUrl: true })} className={`focus-ring rounded-2xl border p-3 text-left ${selectedThread?.id === thread.id ? "border-cyan-300/55 bg-cyan-400/12" : "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-black">{text(thread.subject)}</p>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${parentMessageStatusClasses(thread.status)}`}>
                  {t(parentMessageStatusLabel(thread.status))}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">{thread.teacherName} · {thread.studentName}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {t(parentMessageCategoryLabel(thread.parentCategory))} · {formatDate(thread.lastMessageAt, language)}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{thread.latestMessage}</p>
            </button>
          ))}
          {!data.threads.length ? <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No parent messages yet.", zh: "尚未有家長私信。" })}</p> : null}
        </div>
      </aside>

      <section className="glass-panel p-4 sm:p-5">
        {selectedThread ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">{selectedThread.teacherName}</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{text(selectedThread.subject)}</h2>
                <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
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
                <div key={entry.id} className={`max-w-[86%] rounded-2xl border p-4 ${entry.senderRole === "teacher" ? "border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.06]" : "ml-auto border-cyan-300/45 bg-cyan-400/10"}`}>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{entry.senderName} · {formatDate(entry.createdAt, language)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{entry.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3">
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                maxLength={parentMessageBodyMaxLength}
                rows={4}
                placeholder={t({ en: "Reply with home context or a follow-up question...", zh: "回覆家庭情況或後續問題..." })}
                className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.06]"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{reply.length}/{parentMessageBodyMaxLength}</p>
                <button onClick={sendReply} disabled={!reply.trim() || isReplying} type="button" className="focus-ring w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950">
                  {isReplying ? t({ en: "Sending...", zh: "發送中..." }) : t({ en: "Send reply", zh: "發送回覆" })}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Choose or create a parent-teacher thread.", zh: "選擇或建立家校對話。" })}</p>
        )}
      </section>

      <aside className="glass-panel p-4">
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
          <select
            value={composeStudentId}
            onChange={(event) => {
              setComposeStudentId(event.target.value);
              setReportId("");
            }}
            className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]"
          >
            {data.children.map((child) => <option key={child.student.id} value={child.student.id}>{child.student.name}</option>)}
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value as ParentMessageCategory)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
            {data.categories.map((item) => <option key={item.id} value={item.id}>{text(item.label)}</option>)}
          </select>
          <select value={reportId} onChange={(event) => setReportId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
            <option value="">{t({ en: "No linked report", zh: "不連結報告" })}</option>
            {reportsForStudent.map((report) => <option key={report.id} value={report.id}>{text(report.title)}</option>)}
          </select>
          {selectedReport ? (
            <p className="rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold leading-5 text-cyan-800 dark:text-cyan-100">
              {t({ en: "Linked report", zh: "關聯報告" })}: {text(selectedReport.title)}
            </p>
          ) : null}
          <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={parentMessageSubjectMaxLength} required placeholder={t({ en: "Subject", zh: "主題" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          <p className="-mt-2 text-right text-xs font-bold text-slate-500 dark:text-slate-400">{subject.length}/{parentMessageSubjectMaxLength}</p>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={parentMessageBodyMaxLength} required rows={5} placeholder={t({ en: "What context would help at home?", zh: "家中想了解甚麼支援方向？" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.06]" />
          <p className="-mt-2 text-right text-xs font-bold text-slate-500 dark:text-slate-400">{body.length}/{parentMessageBodyMaxLength}</p>
          <button disabled={!composeStudentId || !subject.trim() || !body.trim() || isSending} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950">
            {isSending ? t({ en: "Sending...", zh: "發送中..." }) : t({ en: "Send message", zh: "發送訊息" })}
          </button>
        </form>
        {message ? <p className="mt-4 text-sm font-bold text-rose-700 dark:text-rose-200">{message}</p> : null}
      </aside>
    </div>
  );
}

export function ParentConnectView() {
  const router = useRouter();
  const { t } = useSettings();
  const [inviteCode, setInviteCode] = useState("");
  const [relationship, setRelationship] = useState<GuardianRelationship>("guardian");
  const [message, setMessage] = useState("");

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/parent/children/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode, relationship })
    });
    if (!response.ok) {
      setMessage(t({ en: "Invite code could not be linked.", zh: "暫時未能使用此邀請碼綁定。" }));
      return;
    }
    router.push("/parent");
    router.refresh();
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
        <button className="focus-ring w-fit rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
          {t({ en: "Connect", zh: "綁定" })}
        </button>
      </form>
      {message ? <p className="mt-4 text-sm font-bold text-rose-700 dark:text-rose-200">{message}</p> : null}
    </section>
  );
}
