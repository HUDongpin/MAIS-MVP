"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel } from "@/lib/i18n";
import type {
  TeacherAnalyticsData,
  TeacherAnalyticsInterventionGroup,
  TeacherAnalyticsStudentRisk,
  TeacherAnalyticsTopicCell,
  TeacherAnalyticsTrendPoint,
  TeacherInterventionAction,
  TeacherStudentRiskTag
} from "@/types";

function percent(value: number | null) {
  return value === null ? "-" : `${Math.max(0, Math.min(100, value))}%`;
}

function seconds(value: number | null) {
  return value === null ? "-" : `${value}s`;
}

function heatTone(value: number) {
  if (value >= 75) return "border-emerald-300/55 bg-emerald-400/15 text-emerald-800 dark:text-emerald-100";
  if (value >= 58) return "border-amber-300/55 bg-amber-400/15 text-amber-800 dark:text-amber-100";
  return "border-rose-300/60 bg-rose-400/15 text-rose-800 dark:text-rose-100";
}

function compactClassName(className: string) {
  return className.replace(/\s+mathematics$/i, "");
}

function riskTagLabel(tag: TeacherStudentRiskTag) {
  const labels: Record<TeacherStudentRiskTag, { en: string; zh: string }> = {
    "low-mastery": { en: "Low mastery", zh: "低掌握" },
    "repeated-mistakes": { en: "Repeated mistakes", zh: "重複錯題" },
    inactive: { en: "Inactive", zh: "低活躍" },
    "high-ai-tutor": { en: "AI help spike", zh: "AI 求助偏高" },
    "late-work": { en: "Late work", zh: "遲交" }
  };
  return labels[tag];
}

function actionLabel(action: TeacherInterventionAction) {
  const labels: Record<TeacherInterventionAction, { en: string; zh: string }> = {
    "rebuild-foundation": { en: "Rebuild foundation", zh: "補基礎" },
    "redo-mistakes": { en: "Redo mistakes", zh: "重做錯題" },
    "challenge-extension": { en: "Challenge", zh: "進階挑戰" },
    "teacher-message": { en: "Message follow-up", zh: "私信跟進" }
  };
  return labels[action];
}

function TopicCell({ cell }: { cell: TeacherAnalyticsTopicCell }) {
  const { language, text, t } = useSettings();

  return (
    <Link href={cell.href} className={`focus-ring block overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5 ${heatTone(cell.averageMastery)}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <p className="min-w-0 text-[11px] font-black uppercase leading-4 tracking-[0.12em] opacity-75">
          <span className="block">{formatGradeLabel(cell.grade, language, true)}</span>
          <span className="line-clamp-2 break-words [overflow-wrap:anywhere]" title={cell.className}>
            {compactClassName(cell.className)}
          </span>
        </p>
        <p className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xl font-black leading-none text-slate-950 shadow-sm ring-1 ring-black/5 dark:bg-slate-950/45 dark:text-white dark:ring-white/10 sm:text-2xl">
          {percent(cell.averageMastery)}
        </p>
      </div>
      <h3 className="mt-3 max-w-full break-words text-base font-black leading-6 text-slate-950 [overflow-wrap:anywhere] dark:text-white" title={text(cell.topicTitle)}>
        {text(cell.topicTitle)}
      </h3>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold">
        <span>{t({ en: "Weak", zh: "薄弱" })} {cell.weakStudentCount}/{cell.studentCount}</span>
        <span>{t({ en: "Avg", zh: "均時" })} {seconds(cell.averageAnswerSeconds)}</span>
        <span>{t({ en: "Hints", zh: "提示" })} {cell.hintRequests}</span>
      </div>
      {cell.reteachRecommended ? (
        <p className="mt-3 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-black text-rose-800 dark:text-rose-100">
          {t({ en: "Reteach signal", zh: "建議重講" })}
        </p>
      ) : null}
    </Link>
  );
}

function RiskRow({ risk }: { risk: TeacherAnalyticsStudentRisk }) {
  const { text, t } = useSettings();

  return (
    <Link href={risk.href} className="focus-ring soft-panel block overflow-hidden p-4 transition hover:-translate-y-0.5">
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <p className="break-words text-base font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{risk.studentName}</p>
          <p className="mt-1 break-words text-xs font-bold text-cyan-700 [overflow-wrap:anywhere] dark:text-cyan-200">{risk.className}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {risk.tags.length ? risk.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-amber-300/55 bg-amber-400/12 px-2.5 py-1 text-xs font-black text-amber-800 dark:text-amber-100">
                {text(riskTagLabel(tag))}
              </span>
            )) : (
              <span className="rounded-full border border-emerald-300/55 bg-emerald-400/12 px-2.5 py-1 text-xs font-black text-emerald-800 dark:text-emerald-100">
                {t({ en: "Extension ready", zh: "可挑戰" })}
              </span>
            )}
          </div>
        </div>
        <p className="text-3xl font-black leading-none gradient-text md:text-right">{risk.riskScore}</p>
        <div className="grid min-w-0 gap-3 text-sm font-bold text-slate-600 dark:text-slate-300 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] md:col-span-2">
          <div className="min-w-0">
            <p>{t({ en: "Mastery", zh: "掌握" })} {percent(risk.averageMastery)}</p>
            <p>{t({ en: "Avg time", zh: "均時" })} {seconds(risk.averageAnswerSeconds)}</p>
          </div>
          <div className="min-w-0">
            <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">{text(actionLabel(risk.recommendedAction))}</p>
            <p className="mt-1 break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{text(risk.recommendation)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TrendBars({ points }: { points: TeacherAnalyticsTrendPoint[] }) {
  const maxActive = Math.max(1, ...points.map((point) => point.activeStudents));

  return (
    <div className="grid grid-cols-7 items-end gap-2">
      {points.slice(-7).map((point) => (
        <div key={point.date} className="grid gap-2 text-center">
          <div className="flex h-28 items-end rounded-2xl bg-slate-950/5 p-1 dark:bg-white/10">
            <div
              className="w-full rounded-xl bg-cyan-400"
              style={{ height: `${Math.max(8, (point.activeStudents / maxActive) * 100)}%` }}
              title={`${point.date}: ${point.activeStudents}`}
            />
          </div>
          <p className="text-[11px] font-black text-slate-500 dark:text-slate-400">{point.date.slice(5)}</p>
        </div>
      ))}
    </div>
  );
}

function InterventionCard({ group }: { group: TeacherAnalyticsInterventionGroup }) {
  const router = useRouter();
  const { text, t } = useSettings();
  const [status, setStatus] = useState<"idle" | "saving" | "created" | "error">("idle");

  const createFollowUp = async () => {
    setStatus("saving");
    const response = await fetch("/api/teacher/analytics/follow-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: group.classId,
        studentIds: group.studentIds,
        title: text(group.assignmentTitle),
        description: text(group.assignmentDescription),
        targetId: group.targetId
      })
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    setStatus("created");
    router.refresh();
  };

  return (
    <article className="soft-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-base font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{text(group.title)}</p>
          <p className="mt-1 break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{text(group.description)}</p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-300/50 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-800 dark:text-cyan-100">
          {text(actionLabel(group.action))}
        </span>
      </div>
      <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        {group.studentNames.slice(0, 4).join(", ")}{group.studentNames.length > 4 ? ` +${group.studentNames.length - 4}` : ""}
      </p>
      <button
        type="button"
        onClick={createFollowUp}
        disabled={status === "saving" || status === "created"}
        className="focus-ring mt-4 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-55 dark:bg-white dark:text-slate-950"
      >
        {status === "saving"
          ? t({ en: "Creating", zh: "建立中" })
          : status === "created"
            ? t({ en: "Added", zh: "已加入" })
            : t({ en: "Create follow-up", zh: "加入跟進作業" })}
      </button>
      {status === "error" ? <p className="mt-2 text-xs font-bold text-rose-700 dark:text-rose-200">{t({ en: "Could not create assignment.", zh: "未能建立作業。" })}</p> : null}
    </article>
  );
}

export function TeacherAnalyticsView({ analytics }: { analytics: TeacherAnalyticsData }) {
  const router = useRouter();
  const { t, text } = useSettings();
  const summaryCards = [
    { label: t({ en: "Average mastery", zh: "平均掌握度" }), value: percent(analytics.summary.averageMastery), detail: t({ en: "Across selected class topics", zh: "所選班級課題平均" }) },
    { label: t({ en: "At-risk students", zh: "風險學生" }), value: analytics.summary.atRiskStudents, detail: t({ en: "Needs support or extension", zh: "需要支援或挑戰" }) },
    { label: t({ en: "Average answer time", zh: "平均答題時間" }), value: seconds(analytics.summary.averageAnswerSeconds), detail: t({ en: "Saved practice attempts", zh: "已儲存練習作答" }) },
    { label: t({ en: "Hint / AI use", zh: "提示 / AI 使用" }), value: `${analytics.summary.hintRequests7d}/${analytics.summary.aiTutorMessages7d}`, detail: t({ en: "Last 7 days", zh: "最近 7 天" }) }
  ];

  return (
    <div className="grid gap-7">
      <section className="glass-panel p-6 sm:p-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Learning analytics", zh: "學習分析" })}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {t({ en: "Class insight and intervention", zh: "班級洞察與干預建議" })}
            </h1>
          </div>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Class", zh: "班級" })}</span>
            <select
              value={analytics.selectedClassId}
              onChange={(event) => {
                const value = event.target.value;
                router.push(value === "all" ? "/teacher/analytics" : `/teacher/analytics?classId=${encodeURIComponent(value)}`);
              }}
              className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]"
            >
              <option value="all">{t({ en: "All classes", zh: "全部班級" })}</option>
              {analytics.classes.map((teacherClass) => <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className="glass-panel p-5">
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-4 text-4xl font-black gradient-text">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Topic mastery heatmap", zh: "課題掌握熱力圖" })}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {analytics.topicMastery.map((cell) => <TopicCell key={cell.id} cell={cell} />)}
          </div>
        </div>
        <aside className="glass-panel min-w-0 p-5">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Active trend", zh: "活躍趨勢" })}</h2>
          <div className="mt-5"><TrendBars points={analytics.activityTrend7d} /></div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold">
            <div className="soft-panel p-3"><p className="text-2xl font-black gradient-text">{analytics.summary.activeStudents7d}</p><p>{t({ en: "Active 7d", zh: "7日活躍" })}</p></div>
            <div className="soft-panel p-3"><p className="text-2xl font-black gradient-text">{analytics.summary.activeStudents30d}</p><p>{t({ en: "Active 30d", zh: "30日活躍" })}</p></div>
          </div>
        </aside>
      </section>

      <section className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="grid min-w-0 gap-4">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Student risk list", zh: "學生風險列表" })}</h2>
          {analytics.studentRisks.length ? analytics.studentRisks.map((risk) => <RiskRow key={`${risk.classId}-${risk.studentId}`} risk={risk} />) : (
            <div className="soft-panel p-6 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No risk signals yet.", zh: "暫未有風險訊號。" })}</div>
          )}

          <section className="glass-panel min-w-0 p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Intervention groups", zh: "干預建議小組" })}</h2>
            <div className="mt-4 grid gap-3">
              {analytics.interventionGroups.length ? analytics.interventionGroups.map((group) => <InterventionCard key={group.id} group={group} />) : (
                <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No intervention group generated yet.", zh: "暫未生成干預小組。" })}</p>
              )}
            </div>
          </section>
        </div>
        <aside className="grid min-w-0 gap-6">
          <section className="glass-panel min-w-0 p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Frequent mistakes", zh: "高頻錯題" })}</h2>
            <div className="mt-4 grid gap-3">
              {analytics.frequentMistakes.length ? analytics.frequentMistakes.map((mistake) => (
                <article key={mistake.id} className="soft-panel p-3">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{text(mistake.topicTitle)}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{text(mistake.prompt)}</p>
                  <p className="mt-2 text-xs font-black text-rose-700 dark:text-rose-200">{mistake.wrongAttempts} {t({ en: "wrong attempts", zh: "次錯誤" })} · {mistake.studentCount} {t({ en: "students", zh: "學生" })}</p>
                </article>
              )) : <p className="soft-panel p-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No repeated mistakes yet.", zh: "暫未有重複錯題。" })}</p>}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
