"use client";

import Link from "next/link";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, localeForLanguage } from "@/lib/i18n";
import type { Language, LocalizedText, TeacherActionQueueItem, TeacherDashboardData, TeacherMasteryHeatmapCell } from "@/types";

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

function formatDateTime(value: string, language: Language) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function heatmapTone(value: number) {
  if (value >= 75) return "border-emerald-300/55 bg-emerald-400/15 text-emerald-800 dark:text-emerald-100";
  if (value >= 55) return "border-amber-300/55 bg-amber-400/15 text-amber-800 dark:text-amber-100";
  return "border-rose-300/60 bg-rose-400/15 text-rose-800 dark:text-rose-100";
}

function compactClassName(className: string) {
  return className.replace(/\s+mathematics$/i, "");
}

function priorityTone(priority: TeacherActionQueueItem["priority"]) {
  if (priority === "high") return "border-rose-300/60 bg-rose-400/12 text-rose-800 dark:text-rose-100";
  if (priority === "medium") return "border-amber-300/55 bg-amber-400/12 text-amber-800 dark:text-amber-100";
  return "border-slate-200/80 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200";
}

function actionTypeLabel(type: TeacherActionQueueItem["type"]): LocalizedText {
  const labels: Record<TeacherActionQueueItem["type"], LocalizedText> = {
    "overdue-assignment": { en: "Overdue", zh: "逾期" },
    "pending-grading": { en: "Grade", zh: "批改" },
    "unreplied-message": { en: "Reply", zh: "回覆" },
    "consecutive-mistakes": { en: "Mistakes", zh: "連錯" },
    "inactive-student": { en: "Inactive", zh: "低活躍" },
    "high-ai-tutor": { en: "AI Tutor", zh: "AI Tutor" }
  };

  return labels[type];
}

function HeatmapCell({ cell }: { cell: TeacherMasteryHeatmapCell }) {
  const { language, text, t } = useSettings();

  return (
    <Link
      href={cell.href}
      className={`focus-ring block overflow-hidden rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 ${heatmapTone(cell.averageMastery)}`}
      aria-label={t({
        en: `${cell.className} ${cell.topicTitle.en} average mastery ${cell.averageMastery}%`,
        zh: `${cell.className} ${cell.topicTitle.zh} 平均掌握度 ${cell.averageMastery}%`
      })}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <p className="min-w-0 text-[11px] font-black uppercase leading-4 tracking-[0.12em] opacity-75">
          <span className="block">{formatGradeLabel(cell.grade, language, true)}</span>
          <span className="line-clamp-2 break-words [overflow-wrap:anywhere]" title={cell.className}>
            {compactClassName(cell.className)}
          </span>
        </p>
        <p className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xl font-black leading-none text-slate-950 shadow-sm ring-1 ring-black/5 dark:bg-slate-950/45 dark:text-white dark:ring-white/10 sm:text-2xl">
          {formatPercent(cell.averageMastery)}
        </p>
      </div>
      <h3 className="mt-3 max-w-full break-words text-base font-black leading-6 text-slate-950 [overflow-wrap:anywhere] dark:text-white" title={text(cell.topicTitle)}>
        {text(cell.topicTitle)}
      </h3>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/10 dark:bg-white/15">
        <div className="h-2 rounded-full bg-current" style={{ width: formatPercent(cell.averageMastery) }} />
      </div>
      <p className="mt-3 text-xs font-bold opacity-80">
        {t({ en: `${cell.weakStudentCount}/${cell.studentCount} students below 60%`, zh: `${cell.weakStudentCount}/${cell.studentCount} 位學生低於 60%` })}
      </p>
    </Link>
  );
}

function ActionQueueItem({ item }: { item: TeacherActionQueueItem }) {
  const { language, text, t } = useSettings();

  return (
    <Link href={item.href} className="focus-ring soft-panel block p-4 transition hover:-translate-y-0.5 hover:shadow-glow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-950 dark:text-white">{text(item.title)}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(item.description)}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${priorityTone(item.priority)}`}>
          {text(actionTypeLabel(item.type))}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        {item.className ? <span>{item.className}</span> : null}
        {item.studentName ? <span>{item.studentName}</span> : null}
        <span>{t({ en: "Updated", zh: "更新" })} {formatDateTime(item.createdAt, language)}</span>
      </div>
    </Link>
  );
}

export function TeacherDashboardView({ dashboard }: { dashboard: TeacherDashboardData }) {
  const { language, t } = useSettings();
  const kpis = [
    {
      label: t({ en: "Pending grading", zh: "待批改提交" }),
      value: dashboard.kpis.pendingGrading,
      detail: t({ en: "Submitted or late work awaiting teacher feedback", zh: "已提交或遲交但尚未批改" }),
      href: "/teacher/assignments?filter=grading"
    },
    {
      label: t({ en: "Unreplied messages", zh: "未回覆留言" }),
      value: dashboard.kpis.unrepliedMessages,
      detail: t({ en: "Open student questions and private messages", zh: "未解決學生提問與私信" }),
      href: "/teacher/inbox?filter=open"
    },
    {
      label: t({ en: "Weekly completion", zh: "本週作業完成率" }),
      value: formatPercent(dashboard.kpis.weeklyAssignmentCompletionRate),
      detail: t({ en: "Completion across recent assignment submissions", zh: "近期作業提交完成比例" }),
      href: "/teacher/assignments"
    },
    {
      label: t({ en: "Needs attention", zh: "需要關注學生" }),
      value: dashboard.kpis.atRiskStudents,
      detail: t({ en: "Low mastery, repeated errors, inactivity, or heavy tutor usage", zh: "低掌握、連續錯題、低活躍或頻繁求助" }),
      href: "/teacher/classes?filter=attention"
    }
  ];

  return (
    <div className="grid gap-7">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
          {t({ en: "Teacher dashboard", zh: "教師儀表板" })}
        </p>
        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {t({ en: "Today’s teaching queue", zh: "今日教學處理清單" })}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              {t({
                en: "Assignments, inbox, mastery gaps, and intervention signals are gathered here so the next action is obvious.",
                zh: "集中顯示作業、私信、掌握度缺口與干預訊號，讓教師一進來就知道下一步。"
              })}
            </p>
          </div>
          <p className="rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300">
            {t({ en: "Updated", zh: "更新" })} {formatDateTime(dashboard.generatedAt, language)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="focus-ring glass-panel block p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">{kpi.label}</p>
            <p className="mt-4 text-4xl font-black tracking-tight gradient-text">{kpi.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{kpi.detail}</p>
          </Link>
        ))}
      </section>

      <section className="glass-panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Points system", zh: "積分系統" })}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Reward queue", zh: "積分獎勵隊列" })}</h2>
          </div>
          <Link href="/teacher/rewards" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
            {t({ en: "Open rewards", zh: "開啟積分獎勵" })}
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-300/45 bg-amber-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800 dark:text-amber-100">{t({ en: "Pending approval", zh: "等待批核" })}</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{dashboard.rewardSummary.pendingRedemptions}</p>
          </div>
          <div className="rounded-2xl border border-cyan-300/45 bg-cyan-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-100">{t({ en: "Approved gifts", zh: "已批核獎品" })}</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{dashboard.rewardSummary.approvedRedemptions}</p>
          </div>
          <div className="rounded-2xl border border-emerald-300/45 bg-emerald-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">{t({ en: "Awarded this week", zh: "本週加分" })}</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{dashboard.rewardSummary.pointsAwardedThisWeek}</p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              {dashboard.rewardSummary.topStudentName
                ? t({
                    en: `${dashboard.rewardSummary.topStudentName}: ${dashboard.rewardSummary.topStudentAvailablePoints} available`,
                    zh: `${dashboard.rewardSummary.topStudentName}：${dashboard.rewardSummary.topStudentAvailablePoints} 可用`
                  })
                : t({ en: "No student balances yet", zh: "尚未有學生積分" })}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Class health", zh: "班級狀態" })}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Class learning status", zh: "班級學習狀態" })}</h2>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {dashboard.classSummaries.map((summary) => (
            <Link key={summary.classId} href={summary.href} className="focus-ring glass-panel block p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-black text-slate-950 dark:text-white">{summary.className}</p>
                  <p className="mt-1 text-sm font-bold text-cyan-700 dark:text-cyan-200">
                    {formatGradeLabel(summary.grade, language, true)} · {summary.studentCount} {t({ en: "students", zh: "學生" })}
                  </p>
                </div>
                <p className="text-3xl font-black gradient-text">{formatPercent(summary.averageMastery)}</p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Assignments", zh: "作業" })}</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{formatPercent(summary.assignmentCompletionRate)}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Active", zh: "進行中" })}</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{summary.activeAssignments}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Attention", zh: "關注" })}</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{summary.atRiskStudents}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                {t({ en: "Mastery heatmap", zh: "掌握度熱力圖" })}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Weak topics by class", zh: "按班級顯示薄弱課題" })}</h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {dashboard.masteryHeatmap.length ? (
              dashboard.masteryHeatmap.map((cell) => <HeatmapCell key={cell.id} cell={cell} />)
            ) : (
              <div className="soft-panel p-6 text-center md:col-span-2 2xl:col-span-3">
                <p className="text-base font-black text-slate-950 dark:text-white">{t({ en: "No mastery data yet", zh: "尚未有掌握度資料" })}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t({ en: "Heatmap cells appear after students are enrolled and have topic progress.", zh: "學生加入班級並產生課題進度後，這裡會顯示熱力圖。" })}
                </p>
              </div>
            )}
          </div>
        </div>

        <aside>
          <div className="mb-4">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Action queue", zh: "待處理清單" })}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "What needs attention", zh: "需要跟進事項" })}</h2>
          </div>
          <div className="grid gap-3">
            {dashboard.actionQueue.length ? (
              dashboard.actionQueue.map((item) => <ActionQueueItem key={item.id} item={item} />)
            ) : (
              <div className="soft-panel p-6 text-center">
                <p className="text-base font-black text-slate-950 dark:text-white">{t({ en: "All clear", zh: "暫無待處理事項" })}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t({ en: "New risks and follow-ups will appear here.", zh: "新的風險與跟進事項會顯示在這裡。" })}
                </p>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
