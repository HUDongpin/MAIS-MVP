"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { ClassPerformanceBars, CompletionGauge, RosterStatusDonut, type ClassBarDatum } from "@/components/teacher/DashboardCharts";
import { TeacherNavIcon, type TeacherNavIconName } from "@/components/teacher/teacherNavIcons";
import {
  countStatus,
  rateStatus,
  statusChipClass,
  statusValueClass,
  teacherZoneLabels,
  zoneBarClass,
  zoneChipClass,
  zoneEyebrowClass,
  zoneTileClass,
  type TeacherStatus,
  type TeacherZone
} from "@/components/teacher/teacherZones";
import { formatGradeLabel } from "@/lib/i18n";
import { cn, formatDateInHongKong } from "@/lib/utils";
import type { Language, LocalizedText, TeacherActionQueueItem, TeacherDashboardData, TeacherMasteryHeatmapCell } from "@/types";

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

function formatDateTime(value: string, language: Language) {
  return formatDateInHongKong(value, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Renders the deterministic (SSR-safe) Hong Kong formatting first, then swaps to
// the viewer's own locale/timezone after mount so US teachers see local time.
function LocalDateTime({ value, language }: { value: string; language: Language }) {
  const [label, setLabel] = useState(() => formatDateTime(value, language));

  useEffect(() => {
    try {
      setLabel(
        new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-Hant", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date(value))
      );
    } catch {
      setLabel(formatDateTime(value, language));
    }
  }, [value, language]);

  return <>{label}</>;
}

function heatmapTone(value: number) {
  if (value >= 75) return "border-emerald-300/55 bg-emerald-400/15 text-emerald-800 dark:text-emerald-100";
  if (value >= 55) return "border-amber-300/55 bg-amber-400/15 text-amber-800 dark:text-amber-100";
  return "border-rose-300/60 bg-rose-400/15 text-rose-800 dark:text-rose-100";
}

function masteryStatus(value: number): TeacherStatus {
  if (value >= 75) return "good";
  if (value >= 55) return "warn";
  return "risk";
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
    "overdue-assignment": { en: "Overdue", zh: "逾期", zhHans: "逾期" },
    "pending-grading": { en: "Grade", zh: "批改", zhHans: "批改" },
    "pending-correction-review": { en: "Correction", zh: "訂正", zhHans: "订正" },
    "overdue-correction": { en: "Overdue correction", zh: "逾期訂正", zhHans: "逾期订正" },
    "unreplied-message": { en: "Reply", zh: "回覆", zhHans: "回复" },
    "consecutive-mistakes": { en: "Mistakes", zh: "連錯", zhHans: "连错" },
    "inactive-student": { en: "Inactive", zh: "低活躍", zhHans: "低活跃" },
    "high-ai-tutor": { en: "AI Tutor", zh: "AI Tutor", zhHans: "AI Tutor" }
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
        zh: `${cell.className} ${cell.topicTitle.zh} 平均掌握度 ${cell.averageMastery}%`, zhHans: `${cell.className} ${cell.topicTitle.zh} 平均掌握度 ${cell.averageMastery}%`
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
        {t({ en: `${cell.weakStudentCount}/${cell.studentCount} students below 60%`, zh: `${cell.weakStudentCount}/${cell.studentCount} 位學生低於 60%`, zhHans: `${cell.weakStudentCount}/${cell.studentCount} 位学生低于 60%` })}
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
        <span>{t({ en: "Updated", zh: "更新", zhHans: "更新" })} <LocalDateTime value={item.createdAt} language={language} /></span>
      </div>
    </Link>
  );
}

function EnterpriseWorkflowCard({
  eyebrow,
  title,
  detail,
  signal,
  href,
  cta,
  zone,
  icon,
  signalStatus
}: {
  eyebrow: string;
  title: string;
  detail: string;
  signal: string;
  href: string;
  cta: string;
  zone: TeacherZone;
  icon: TeacherNavIconName;
  signalStatus?: TeacherStatus;
}) {
  // The chip carries urgency when the card has a live workload signal;
  // otherwise it repeats the card's zone hue so hue always means the same thing.
  const chipClass = signalStatus ? statusChipClass[signalStatus] : zoneChipClass[zone];
  return (
    <Link href={href} className="focus-ring glass-panel relative flex min-h-[196px] min-w-0 flex-col justify-between overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
      <span className={cn("absolute inset-x-0 top-0 h-1", zoneBarClass[zone])} aria-hidden="true" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", zoneTileClass[zone])}>
              <TeacherNavIcon name={icon} className="h-[18px] w-[18px]" />
            </span>
            <p className={cn("break-words text-xs font-black uppercase tracking-[0.14em]", zoneEyebrowClass[zone])}>{eyebrow}</p>
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${chipClass}`}>{signal}</span>
        </div>
        <h2 className="mt-4 break-words text-xl font-black text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{detail}</p>
      </div>
      <p className={cn("mt-5 text-sm font-black", zoneEyebrowClass[zone])}>{cta}</p>
    </Link>
  );
}

export function TeacherDashboardView({ dashboard }: { dashboard: TeacherDashboardData }) {
  const { language, t, text } = useSettings();
  const classCount = dashboard.classSummaries.length;
  const atRiskStudents = dashboard.kpis.atRiskStudents;
  const weeklyCompletionRate = dashboard.kpis.weeklyAssignmentCompletionRate;
  const kpis: { label: string; value: string | number; detail: string; href: string; zone: TeacherZone; status: TeacherStatus }[] = [
    {
      label: t({ en: "Pending grading", zh: "待批改提交", zhHans: "待批改提交" }),
      value: dashboard.kpis.pendingGrading,
      detail: t({ en: "Submitted or late work awaiting teacher feedback", zh: "已提交或遲交但尚未批改", zhHans: "已提交或迟交但尚未批改" }),
      href: "/teacher/assignments?filter=grading",
      zone: "today",
      status: countStatus(dashboard.kpis.pendingGrading)
    },
    {
      label: t({ en: "Correction review", zh: "訂正覆核", zhHans: "订正复核" }),
      value: dashboard.kpis.pendingCorrectionReview,
      detail: t({ en: "Returned corrections waiting for a second review", zh: "學生已重交、等待教師覆核", zhHans: "学生已重交、等待教师复核" }),
      href: "/teacher/assignments?filter=correction-review",
      zone: "today",
      status: countStatus(dashboard.kpis.pendingCorrectionReview)
    },
    {
      label: t({ en: "Needs correction", zh: "需訂正", zhHans: "需订正" }),
      value: dashboard.kpis.correctionsRequired,
      detail: t({ en: "Students currently working on teacher-requested corrections", zh: "學生正在處理教師退回訂正", zhHans: "学生正在处理教师退回订正" }),
      href: "/teacher/assignments?filter=correction-required",
      zone: "today",
      status: countStatus(dashboard.kpis.correctionsRequired)
    },
    {
      label: t({ en: "Unreplied messages", zh: "未回覆留言", zhHans: "未回复留言" }),
      value: dashboard.kpis.unrepliedMessages,
      detail: t({ en: "Open student questions and private messages", zh: "未解決學生提問與私信", zhHans: "未解决学生提问与私信" }),
      href: "/teacher/communications/inbox?filter=open",
      zone: "today",
      status: countStatus(dashboard.kpis.unrepliedMessages)
    },
    {
      label: t({ en: "Weekly completion", zh: "本週作業完成率", zhHans: "本周作业完成率" }),
      value: formatPercent(weeklyCompletionRate),
      detail: t({ en: "Completion across recent assignment submissions", zh: "近期作業提交完成比例", zhHans: "近期作业提交完成比例" }),
      href: "/teacher/assignments",
      zone: "today",
      // Exactly 0% almost always means "no submissions yet", not a crisis.
      status: weeklyCompletionRate === 0 ? "neutral" : rateStatus(weeklyCompletionRate)
    },
    {
      label: t({ en: "Needs attention", zh: "需要關注學生", zhHans: "需要关注学生" }),
      value: dashboard.kpis.atRiskStudents,
      detail: t({ en: "Low mastery, repeated errors, inactivity, or heavy tutor usage", zh: "低掌握、連續錯題、低活躍或頻繁求助", zhHans: "低掌握、连续错题、低活跃或频繁求助" }),
      href: "/teacher/analytics",
      zone: "students",
      status: countStatus(dashboard.kpis.atRiskStudents, true)
    }
  ];
  const completionStatus: TeacherStatus = weeklyCompletionRate === 0 ? "neutral" : rateStatus(weeklyCompletionRate);
  const totalStudents = dashboard.classSummaries.reduce((sum, summary) => sum + summary.studentCount, 0);
  const attentionStudents = Math.min(totalStudents, atRiskStudents);
  const onTrackStudents = Math.max(0, totalStudents - attentionStudents);
  const classBars: ClassBarDatum[] = dashboard.classSummaries
    .filter((summary) => summary.studentCount > 0)
    .sort((a, b) => b.averageMastery - a.averageMastery)
    .map((summary) => ({
      key: summary.classId,
      className: compactClassName(summary.className),
      subLabel: `${formatGradeLabel(summary.grade, language, true)} · ${summary.studentCount}`,
      mastery: summary.averageMastery,
      completion: summary.assignmentCompletionRate,
      href: summary.href
    }));
  const enterpriseWorkflows: {
    eyebrow: string;
    title: string;
    detail: string;
    signal: string;
    href: string;
    cta: string;
    zone: TeacherZone;
    icon: TeacherNavIconName;
    signalStatus?: TeacherStatus;
  }[] = [
    {
      eyebrow: t({ en: "Plan", zh: "備課", zhHans: "备课" }),
      title: t({ en: "Build a lesson kit", zh: "建立備課包", zhHans: "建立备课包" }),
      detail: t({ en: "Prepare lesson plan, guide, slides, board design, examples, practice, and homework for the selected class.", zh: "為指定班級準備教案、導學案、課件、板書、例題、練習與作業。", zhHans: "为指定班级准备教案、导学案、课件、板书、例题、练习与作业。" }),
      signal: t({ en: `${classCount} classes`, zh: `${classCount} 個班級`, zhHans: `${classCount} 个班级` }),
      href: "/teacher/lesson-kits/new",
      cta: t({ en: "Open prep center", zh: "進入備課中心", zhHans: "进入备课中心" }),
      zone: "plan",
      icon: "lessonKits"
    },
    {
      eyebrow: t({ en: "Teach", zh: "授課", zhHans: "授课" }),
      title: t({ en: "Run live classroom", zh: "啟動課堂模式", zhHans: "启动课堂模式" }),
      detail: t({ en: "Start a class check, share the student-facing prompt, and control presenter or mobile classroom screens.", zh: "發起課堂檢查，分享學生端任務，並控制大屏或移動控課頁。", zhHans: "发起课堂检查，分享学生端任务，并控制大屏或移动控课页。" }),
      signal: t({ en: "Live", zh: "即時", zhHans: "即时" }),
      href: "/teacher/classroom-sessions",
      cta: t({ en: "Start classroom", zh: "開始課堂", zhHans: "开始课堂" }),
      zone: "today",
      icon: "live"
    },
    {
      eyebrow: t({ en: "Assess", zh: "測評", zhHans: "测评" }),
      title: t({ en: "Create assessment", zh: "建立測驗", zhHans: "建立测验" }),
      detail: t({ en: "Assemble manual, imported, bank, or AI-assisted questions and publish them to the class workflow.", zh: "組合手動、批量、題庫或 AI 輔助題目，發布到班級流程。", zhHans: "组合手动、批量、题库或 AI 辅助题目，发布到班级流程。" }),
      signal: t({ en: `${dashboard.kpis.pendingGrading} to grade`, zh: `${dashboard.kpis.pendingGrading} 待批改`, zhHans: `${dashboard.kpis.pendingGrading} 待批改` }),
      href: "/teacher/assessments/new",
      cta: t({ en: "Create quiz or test", zh: "建立測驗或考試", zhHans: "建立测验或考试" }),
      zone: "plan",
      icon: "assessments",
      signalStatus: countStatus(dashboard.kpis.pendingGrading)
    },
    {
      eyebrow: t({ en: "Intervene", zh: "干預", zhHans: "干预" }),
      title: t({ en: "Act on learning risk", zh: "處理學習風險", zhHans: "处理学习风险" }),
      detail: t({ en: "Review mastery gaps, open follow-ups, and set teacher targets before the next assignment cycle.", zh: "查看掌握度缺口、建立跟進，並在下一輪作業前設定教師目標。", zhHans: "查看掌握度缺口、建立跟进，并在下一轮作业前设定教师目标。" }),
      signal: t({ en: `${atRiskStudents} students`, zh: `${atRiskStudents} 位學生`, zhHans: `${atRiskStudents} 位学生` }),
      href: "/teacher/analytics",
      cta: t({ en: "Open analytics", zh: "查看學習分析", zhHans: "查看学习分析" }),
      zone: "students",
      icon: "analytics",
      signalStatus: countStatus(atRiskStudents, true)
    },
    {
      eyebrow: t({ en: "Communicate", zh: "家校", zhHans: "家校" }),
      title: t({ en: "Send school notices", zh: "發送校務通知", zhHans: "发送校务通知" }),
      detail: t({ en: "Create school notices, track delivery, and collect parent or student acknowledgements.", zh: "建立校務通知，追蹤送達情況，收集家長或學生回執。", zhHans: "建立校务通知，追踪送达情况，收集家长或学生回执。" }),
      signal: t({ en: `${dashboard.kpis.unrepliedMessages} open`, zh: `${dashboard.kpis.unrepliedMessages} 未回覆`, zhHans: `${dashboard.kpis.unrepliedMessages} 未回复` }),
      href: "/teacher/operations/notices",
      cta: t({ en: "Open school notices", zh: "前往校務通知", zhHans: "前往校务通知" }),
      zone: "records",
      icon: "inbox",
      signalStatus: countStatus(dashboard.kpis.unrepliedMessages)
    },
    {
      eyebrow: t({ en: "Wrap up", zh: "結算", zhHans: "结算" }),
      title: t({ en: "Save reports and archive", zh: "保存報告與歸檔", zhHans: "保存报告与归档" }),
      detail: t({ en: "Export bilingual reports, save term snapshots, and keep organized class records.", zh: "匯出雙語報告，保存學期快照，維持整齊的班級記錄。", zhHans: "汇出双语报告，保存学期快照，维持整齐的班级记录。" }),
      signal: t({ en: "Records ready", zh: "記錄齊備", zhHans: "记录齐备" }),
      href: "/teacher/operations/term-archives",
      cta: t({ en: "Archive term", zh: "學期歸檔", zhHans: "学期归档" }),
      zone: "records",
      icon: "reports"
    }
  ];

  return (
    <div className="grid gap-7">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
          {t({ en: "Teacher dashboard", zh: "教師儀表板", zhHans: "教师仪表板" })}
        </p>
        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {t({ en: "Today’s teaching queue", zh: "今日教學處理清單", zhHans: "今日教学处理清单" })}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              {t({
                en: "Assignments, inbox, mastery gaps, and intervention signals are gathered here so the next action is obvious.",
                zh: "集中顯示作業、私信、掌握度缺口與干預訊號，讓教師一進來就知道下一步。", zhHans: "集中显示作业、私信、掌握度缺口与干预讯号，让教师一进来就知道下一步。"
              })}
            </p>
          </div>
          <p className="rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300">
            {t({ en: "Updated", zh: "更新", zhHans: "更新" })} <LocalDateTime value={dashboard.generatedAt} language={language} />
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div data-tour="kpis">
          <div className="mb-4">
            <p className={cn("text-sm font-black uppercase tracking-[0.22em]", zoneEyebrowClass.today)}>
              {t({ en: "Today", zh: "今日", zhHans: "今日" })}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{t({ en: "Today's numbers", zh: "今日數據", zhHans: "今日数据" })}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {kpis.map((kpi) => (
              <Link key={kpi.label} href={kpi.href} className="focus-ring glass-panel relative block overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
                <span className={cn("absolute inset-x-0 top-0 h-1", zoneBarClass[kpi.zone])} aria-hidden="true" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{kpi.label}</p>
                <p className={cn("mt-4 text-4xl font-black tracking-tight", statusValueClass[kpi.status])}>{kpi.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{kpi.detail}</p>
              </Link>
            ))}
          </div>
        </div>

        <aside data-tour="action-queue">
          <div className="mb-4">
            <p className={cn("text-sm font-black uppercase tracking-[0.22em]", zoneEyebrowClass.today)}>
              {t({ en: "Action queue", zh: "待處理清單", zhHans: "待处理清单" })}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{t({ en: "What needs attention", zh: "需要跟進事項", zhHans: "需要跟进事项" })}</h2>
          </div>
          <div className="grid gap-3">
            {dashboard.actionQueue.length ? (
              dashboard.actionQueue.map((item) => <ActionQueueItem key={item.id} item={item} />)
            ) : (
              <div className="soft-panel p-6 text-center">
                <p className="text-base font-black text-slate-950 dark:text-white">{t({ en: "All clear", zh: "暫無待處理事項", zhHans: "暂无待处理事项" })}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t({ en: "New risks and follow-ups will appear here.", zh: "新的風險與跟進事項會顯示在這裡。", zhHans: "新的风险与跟进事项会显示在这里。" })}
                </p>
              </div>
            )}
          </div>
        </aside>
      </section>

      <section data-tour="insights">
        <div className="mb-4">
          <p className={cn("text-sm font-black uppercase tracking-[0.22em]", zoneEyebrowClass.students)}>
            {t({ en: "Learning insights", zh: "學習洞察", zhHans: "学习洞察" })}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {t({ en: "Performance at a glance", zh: "學習表現一覽", zhHans: "学习表现一览" })}
          </h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="glass-panel p-5 sm:p-6">
            <p className="text-sm font-black text-slate-950 dark:text-white">
              {t({ en: "Mastery & completion by class", zh: "各班掌握度與完成率", zhHans: "各班掌握度与完成率" })}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              {t({
                en: "Ranked by average mastery. Select a class for the full breakdown.",
                zh: "按平均掌握度排序，點選班級查看完整分析。", zhHans: "按平均掌握度排序，点选班级查看完整分析。"
              })}
            </p>
            <div className="mt-5">
              <ClassPerformanceBars
                rows={classBars}
                masteryLabel={t({ en: "Mastery", zh: "掌握度", zhHans: "掌握度" })}
                completionLabel={t({ en: "Completion", zh: "完成率", zhHans: "完成率" })}
                emptyLabel={t({
                  en: "No enrolled students yet — bars appear once a class has learners.",
                  zh: "尚未有學生加入，班級有學生後即顯示圖表。", zhHans: "尚未有学生加入，班级有学生后即显示图表。"
                })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="glass-panel flex items-center justify-center p-5">
              <CompletionGauge
                value={weeklyCompletionRate}
                status={completionStatus}
                title={t({ en: "Weekly completion", zh: "本週完成率", zhHans: "本周完成率" })}
                caption={t({ en: "Across recent submissions", zh: "近期作業提交比例", zhHans: "近期作业提交比例" })}
              />
            </div>
            <div className="glass-panel flex items-center justify-center p-5">
              <RosterStatusDonut
                onTrack={onTrackStudents}
                attention={attentionStudents}
                centerLabel={t({ en: "Students", zh: "學生", zhHans: "学生" })}
                onTrackLabel={t({ en: "On track", zh: "進度正常", zhHans: "进度正常" })}
                attentionLabel={t({ en: "Needs attention", zh: "需要關注", zhHans: "需要关注" })}
                emptyLabel={t({ en: "No enrolled students yet.", zh: "尚未有學生。", zhHans: "尚未有学生。" })}
              />
            </div>
          </div>
        </div>
      </section>

      <section data-tour="workflow">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              {t({ en: "Teaching workflow", zh: "教學工作流", zhHans: "教学工作流" })}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
              {t({ en: "Plan, teach, and follow up", zh: "備課、授課、跟進", zhHans: "备课、授课、跟进" })}
            </h2>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {(["today", "plan", "students", "records"] as TeacherZone[]).map((zone) => (
                <span key={zone} className={cn("flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em]", zoneEyebrowClass[zone])}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", zoneBarClass[zone])} aria-hidden="true" />
                  {text(teacherZoneLabels[zone])}
                </span>
              ))}
            </div>
          </div>
          <Link href="/teacher/operations/notices" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "School notices", zh: "校務通知", zhHans: "校务通知" })}
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {enterpriseWorkflows.map((workflow) => (
            <EnterpriseWorkflowCard key={workflow.href} {...workflow} />
          ))}
        </div>
      </section>

      <section className="glass-panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={cn("text-sm font-black uppercase tracking-[0.22em]", zoneEyebrowClass.students)}>
              {t({ en: "Points system", zh: "積分系統", zhHans: "积分系统" })}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{t({ en: "Reward queue", zh: "積分獎勵隊列", zhHans: "积分奖励队列" })}</h2>
          </div>
          <Link href="/teacher/rewards" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
            {t({ en: "Open rewards", zh: "開啟積分獎勵", zhHans: "开启积分奖励" })}
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-300/45 bg-amber-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800 dark:text-amber-100">{t({ en: "Pending approval", zh: "等待批核", zhHans: "等待批核" })}</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{dashboard.rewardSummary.pendingRedemptions}</p>
          </div>
          <div className="rounded-2xl border border-cyan-300/45 bg-cyan-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-100">{t({ en: "Approved gifts", zh: "已批核獎品", zhHans: "已批核奖品" })}</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{dashboard.rewardSummary.approvedRedemptions}</p>
          </div>
          <div className="rounded-2xl border border-emerald-300/45 bg-emerald-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">{t({ en: "Awarded this week", zh: "本週加分", zhHans: "本周加分" })}</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{dashboard.rewardSummary.pointsAwardedThisWeek}</p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              {dashboard.rewardSummary.topStudentName
                ? t({
                    en: `${dashboard.rewardSummary.topStudentName}: ${dashboard.rewardSummary.topStudentAvailablePoints} available`,
                    zh: `${dashboard.rewardSummary.topStudentName}：${dashboard.rewardSummary.topStudentAvailablePoints} 可用`, zhHans: `${dashboard.rewardSummary.topStudentName}：${dashboard.rewardSummary.topStudentAvailablePoints} 可用`
                  })
                : t({ en: "No student balances yet", zh: "尚未有學生積分", zhHans: "尚未有学生积分" })}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={cn("text-sm font-black uppercase tracking-[0.22em]", zoneEyebrowClass.students)}>
              {t({ en: "Class health", zh: "班級狀態", zhHans: "班级状态" })}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{t({ en: "Class learning status", zh: "班級學習狀態", zhHans: "班级学习状态" })}</h2>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {dashboard.classSummaries.map((summary) => (
            <Link key={summary.classId} href={summary.href} className="focus-ring glass-panel block p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-black text-slate-950 dark:text-white">{summary.className}</p>
                  <p className="mt-1 text-sm font-bold text-cyan-700 dark:text-cyan-200">
                    {formatGradeLabel(summary.grade, language, true)} · {summary.studentCount} {t({ en: "students", zh: "學生", zhHans: "学生" })}
                  </p>
                </div>
                <p className={cn("text-3xl font-black", statusValueClass[summary.studentCount === 0 ? "neutral" : masteryStatus(summary.averageMastery)])}>{formatPercent(summary.averageMastery)}</p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Assignments", zh: "作業", zhHans: "作业" })}</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{formatPercent(summary.assignmentCompletionRate)}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Active", zh: "進行中", zhHans: "进行中" })}</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{summary.activeAssignments}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Attention", zh: "關注", zhHans: "关注" })}</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{summary.atRiskStudents}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={cn("text-sm font-black uppercase tracking-[0.22em]", zoneEyebrowClass.students)}>
              {t({ en: "Mastery heatmap", zh: "掌握度熱力圖", zhHans: "掌握度热力图" })}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{t({ en: "Weak topics by class", zh: "按班級顯示薄弱課題", zhHans: "按班级显示薄弱课题" })}</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.masteryHeatmap.length ? (
            dashboard.masteryHeatmap.map((cell) => <HeatmapCell key={cell.id} cell={cell} />)
          ) : (
            <div className="soft-panel p-6 text-center md:col-span-2 xl:col-span-3">
              <p className="text-base font-black text-slate-950 dark:text-white">{t({ en: "No mastery data yet", zh: "尚未有掌握度資料", zhHans: "尚未有掌握度资料" })}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t({ en: "Heatmap cells appear after students are enrolled and have topic progress.", zh: "學生加入班級並產生課題進度後，這裡會顯示熱力圖。", zhHans: "学生加入班级并产生课题进度后，这里会显示热力图。" })}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
