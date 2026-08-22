"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel } from "@/lib/i18n";
import { formatDateInHongKong } from "@/lib/utils";
import { studentVisualizationToolsPath } from "@/lib/visualizationRoutes";
import type { AttendanceStatus, ClassroomLiveAttentionReason, ClassroomLiveRoster, ClassroomLiveRosterEntry, ClassroomLiveSession, ClassroomLiveStudentState, LearningAnalyticsEventSource, Language, LocalizedText, TeacherClass, TeacherLiveData, TeacherLivePromptType, TeacherLiveSession, TeacherLiveToolType, WhiteboardStroke } from "@/types";

function formatPercent(value: number | null) {
  return value === null ? "-" : `${value}%`;
}

function formatLiveSessionTime(value: string | null, language: Language) {
  if (!value) return "-";
  return formatDateInHongKong(value, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const liveMathDelimiterPattern = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
const liveMathCandidatePatterns = [
  /\b[a-zA-Z](?:\([a-zA-Z]\))?\s*=\s*[−-]?(?:\d+(?:\.\d+)?\s*)?[a-zA-Z](?:[²³]|\^\d+)?(?:\s*[+\-−]\s*\d*(?:\.\d+)?[a-zA-Z]?(?:[²³]|\^\d+)?)*(?=$|[\s,，.。?？;；])/g,
  /\b[a-zA-Z]\s*=\s*[−-]?\d+(?:\.\d+)?(?=$|[\s,，.。?？;；])/g,
  /(?:[−-]?\d*(?:\.\d+)?[a-zA-Z](?:[²³]|\^\d+)?|\d+(?:\.\d+)?)(?:\s*[+\-−*/÷]\s*(?:\d*(?:\.\d+)?[a-zA-Z](?:[²³]|\^\d+)?|\d+(?:\.\d+)?))*\s*=\s*[−-]?\d+(?:\.\d+)?(?=$|[\s,，.。?？;；])/g
];

function hasLiveMathDelimiters(value: string) {
  liveMathDelimiterPattern.lastIndex = 0;
  return liveMathDelimiterPattern.test(value);
}

function delimitLiveMathText(value: string) {
  if (hasLiveMathDelimiters(value)) return value;

  const ranges: { start: number; end: number }[] = [];
  liveMathCandidatePatterns.forEach((pattern) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(value)) !== null) {
      const raw = match[0];
      const trimmed = raw.trim();
      if (!trimmed || !/[a-zA-Z²³^]/.test(trimmed)) continue;

      const leadingSpace = raw.length - raw.trimStart().length;
      const trailingSpace = raw.length - raw.trimEnd().length;
      ranges.push({
        start: match.index + leadingSpace,
        end: match.index + raw.length - trailingSpace
      });
    }
  });

  const mergedRanges = ranges
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce<{ start: number; end: number }[]>((merged, range) => {
      const last = merged.at(-1);
      if (!last || range.start >= last.end) {
        merged.push(range);
      } else if (range.end > last.end) {
        last.end = range.end;
      }
      return merged;
    }, []);

  if (!mergedRanges.length) return value;

  let cursor = 0;
  let result = "";
  mergedRanges.forEach((range) => {
    result += value.slice(cursor, range.start);
    result += `\\(${value.slice(range.start, range.end)}\\)`;
    cursor = range.end;
  });

  return result + value.slice(cursor);
}

function LiveMathText({
  value,
  as,
  className
}: {
  value: string;
  as?: "span" | "p" | "h2" | "h3";
  className?: string;
}) {
  return <MathText as={as ?? "span"} text={delimitLiveMathText(value)} className={className} />;
}

function answerLabel(session: TeacherLiveSession, answer: string) {
  const option = session.currentPrompt.options.find((candidate) => candidate.id === answer);
  return option?.label ?? { en: answer, zh: answer };
}

function SessionStats({ session }: { session: TeacherLiveSession }) {
  const { text, t } = useSettings();
  const summary = session.responseSummary;
  const submitted = summary.totalSubmissions;
  const pending = Math.max(0, session.studentCount - submitted);

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="glass-panel p-4">
        <p className="text-3xl font-black gradient-text">{submitted}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Submitted", zh: "已提交" })}</p>
      </article>
      <article className="glass-panel p-4">
        <p className="text-3xl font-black gradient-text">{pending}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Waiting", zh: "未提交" })}</p>
      </article>
      <article className="glass-panel p-4">
        <p className="text-3xl font-black gradient-text">{formatPercent(summary.accuracy)}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Correct rate", zh: "正確率" })}</p>
      </article>
      <article className={`glass-panel p-4 ${summary.needsReteach ? "ring-2 ring-rose-300/60" : ""}`}>
        <p className="text-2xl font-black gradient-text">{summary.needsReteach ? t({ en: "Reteach", zh: "重講" }) : t({ en: "Continue", zh: "繼續" })}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Signal", zh: "判斷" })}</p>
      </article>
      <div className="glass-panel p-4 sm:col-span-2 xl:col-span-4">
        <h3 className="text-lg font-black text-slate-950 dark:text-white">{t({ en: "Common answers", zh: "常見答案" })}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.commonAnswers.length ? summary.commonAnswers.map((answer) => (
            <div key={answer.answer} className={`rounded-2xl border p-3 ${answer.isCorrect === true ? "border-emerald-300/55 bg-emerald-400/12" : answer.isCorrect === false ? "border-rose-300/55 bg-rose-400/12" : "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.07]"}`}>
              <LiveMathText as="p" value={text(answerLabel(session, answer.answer))} className="text-lg font-black text-slate-950 dark:text-white" />
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{answer.count} {t({ en: "students", zh: "學生" })}</p>
            </div>
          )) : (
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Waiting for submissions.", zh: "等待學生提交。" })}</p>
          )}
        </div>
      </div>
      <div className="glass-panel p-4 sm:col-span-2 xl:col-span-4">
        <h3 className="text-lg font-black text-slate-950 dark:text-white">{t({ en: "Recent classroom events", zh: "最近課堂事件" })}</h3>
        <div className="mt-3 grid gap-2">
          {session.toolState.events.length ? session.toolState.events.slice(0, 8).map((event) => (
            <div key={event.id} className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{text(event.label)}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          )) : (
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Tool events will appear here.", zh: "工具事件會顯示在這裡。" })}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function SessionActionPanel({ session, onEndSession }: { session: TeacherLiveSession; onEndSession: () => void }) {
  const { t } = useSettings();
  const summary = session.responseSummary;
  const submitted = summary.totalSubmissions;
  const pending = Math.max(0, session.studentCount - submitted);

  return (
    <aside className="glass-panel h-fit p-4 lg:sticky lg:top-24">
      <div className="rounded-2xl border border-cyan-300/40 bg-cyan-400/10 p-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">{t({ en: "Join code", zh: "加入碼" })}</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{session.joinCode}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{submitted}</p>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "In", zh: "已交" })}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{pending}</p>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Waiting", zh: "未交" })}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{formatPercent(summary.accuracy)}</p>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Correct", zh: "正確" })}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${summary.needsReteach ? "border-rose-300/55 bg-rose-400/12" : "border-emerald-300/55 bg-emerald-400/12"}`}>
          <p className="text-base font-black text-slate-950 dark:text-white">{summary.needsReteach ? t({ en: "Reteach", zh: "重講" }) : t({ en: "Continue", zh: "繼續" })}</p>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Signal", zh: "判斷" })}</p>
        </div>
      </div>

      <button type="button" onClick={onEndSession} className="focus-ring mt-4 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
        {t({ en: "End session", zh: "結束課堂" })}
      </button>
      <Link href={`/classroom?code=${encodeURIComponent(session.joinCode)}`} className="focus-ring mt-3 block rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-center text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">
        {t({ en: "Open student view", zh: "開啟學生端" })}
      </Link>
    </aside>
  );
}

function RecentSessionsPanel({ sessions }: { sessions: TeacherLiveSession[] }) {
  const { language, t, text } = useSettings();

  if (!sessions.length) return null;

  return (
    <section className="glass-panel w-full max-w-5xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Recent sessions", zh: "最近課堂" })}</h2>
        <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
          {sessions.length}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {sessions.map((recentSession) => {
          const isActive = recentSession.status === "active";
          const summary = recentSession.responseSummary;
          const followUpTargetId = recentSession.topicId || recentSession.lessonSlug || recentSession.currentPrompt.id || recentSession.id;
          const followUpTitle = summary.needsReteach
            ? t({ en: `${text(recentSession.lessonTitle)} reteach practice`, zh: `${text(recentSession.lessonTitle)} 重講練習` })
            : t({ en: `${text(recentSession.lessonTitle)} follow-up practice`, zh: `${text(recentSession.lessonTitle)} 課後練習` });
          const encodedClassId = encodeURIComponent(recentSession.classId);
          const assignmentHref = `/teacher/assignments/new?classId=${encodedClassId}&contentType=practice&targetId=${encodeURIComponent(followUpTargetId)}&title=${encodeURIComponent(followUpTitle)}`;
          const analyticsHref = `/teacher/analytics?classId=${encodedClassId}`;
          const noticeHref = `/teacher/operations/notices?classId=${encodedClassId}`;

          return (
            <article key={recentSession.id} className="soft-panel grid min-w-0 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${isActive ? "border-emerald-300/60 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100" : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300"}`}>
                    {isActive ? t({ en: "Active", zh: "進行中" }) : t({ en: "Ended", zh: "已結束" })}
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">{recentSession.joinCode}</span>
                </div>
                <h3 className="mt-2 break-words text-lg font-black text-slate-950 dark:text-white">{text(recentSession.lessonTitle)}</h3>
                <p className="mt-1 break-words text-sm font-bold text-slate-500 dark:text-slate-400">
                  {recentSession.className} · {formatGradeLabel(recentSession.grade, language, true)}
                </p>
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-2 text-sm">
                <div className="min-w-0 rounded-2xl bg-white/70 p-3 dark:bg-white/[0.06]">
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Submitted", zh: "已交" })}</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{recentSession.responseSummary.totalSubmissions}/{recentSession.studentCount}</p>
                </div>
                <div className="min-w-0 rounded-2xl bg-white/70 p-3 dark:bg-white/[0.06]">
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Accuracy", zh: "正確率" })}</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{formatPercent(recentSession.responseSummary.accuracy)}</p>
                </div>
              </div>
              <div className="grid min-w-0 gap-2 lg:justify-items-end">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {formatLiveSessionTime(recentSession.startedAt, language)}
                  {recentSession.endedAt ? ` - ${formatLiveSessionTime(recentSession.endedAt, language)}` : ""}
                </p>
                {isActive ? (
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/teacher/classroom-sessions/${recentSession.id}/presenter`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black dark:border-white/10 dark:bg-white/[0.07]">
                      {t({ en: "Presenter", zh: "大屏" })}
                    </Link>
                    <Link href={`/teacher/classroom-sessions/${recentSession.id}/controller`} className="focus-ring rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                      {t({ en: "Controller", zh: "控課" })}
                    </Link>
                  </div>
                ) : null}
              </div>
              {!isActive ? (
                <div className="grid gap-3 border-t border-slate-200/70 pt-4 dark:border-white/10 lg:col-span-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className={`min-w-0 rounded-2xl border px-3 py-2 ${summary.needsReteach ? "border-rose-300/55 bg-rose-400/12" : "border-emerald-300/55 bg-emerald-400/12"}`}>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Signal", zh: "判斷" })}</p>
                      <p className="mt-1 break-words text-sm font-black text-slate-950 dark:text-white">
                        {summary.needsReteach ? t({ en: "Reteach set", zh: "安排重講" }) : t({ en: "Practice ready", zh: "可派練習" })}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Work samples", zh: "作答樣本" })}</p>
                      <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{recentSession.workSamples.length}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Events", zh: "事件" })}</p>
                      <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{recentSession.toolState.events.length}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Link href={assignmentHref} className="focus-ring rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                      {t({ en: "Create follow-up", zh: "建立跟進" })}
                    </Link>
                    <Link href={analyticsHref} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black dark:border-white/10 dark:bg-white/[0.07]">
                      {t({ en: "Class analytics", zh: "班級分析" })}
                    </Link>
                    <Link href={noticeHref} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black dark:border-white/10 dark:bg-white/[0.07]">
                      {t({ en: "Send notice", zh: "發送通知" })}
                    </Link>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function formatTimerSeconds(value: number) {
  const bounded = Math.max(0, Math.floor(value));
  const minutes = Math.floor(bounded / 60).toString().padStart(2, "0");
  const seconds = (bounded % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function attendanceStatusLabel(status: AttendanceStatus) {
  if (status === "present") return { en: "Present", zh: "出席" };
  if (status === "late") return { en: "Late", zh: "遲到" };
  if (status === "excused") return { en: "Excused", zh: "請假" };
  return { en: "Absent", zh: "缺席" };
}

function toolLabel(tool: TeacherLiveToolType) {
  const labels: Record<TeacherLiveToolType, { en: string; zh: string }> = {
    attendance: { en: "Attendance", zh: "考勤" },
    "random-call": { en: "Random call", zh: "隨機點名" },
    buzzer: { en: "Buzzer", zh: "搶答" },
    timer: { en: "Timer", zh: "計時器" },
    teams: { en: "Teams", zh: "分組競賽" },
    projector: { en: "Projector", zh: "作答上屏" },
    "screen-sync": { en: "Screen sync", zh: "手機同步" },
    whiteboard: { en: "Whiteboard", zh: "白板批注" },
    "math-workbench": { en: "Math tools", zh: "數學工具" }
  };
  return labels[tool];
}

function strokePath(stroke: WhiteboardStroke) {
  return stroke.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${(point.x * 640).toFixed(1)} ${(point.y * 360).toFixed(1)}`)
    .join(" ");
}

function WhiteboardSurface({
  strokes,
  onStrokeComplete,
  readonly = false
}: {
  strokes: WhiteboardStroke[];
  onStrokeComplete?: (points: Array<{ x: number; y: number }>) => void;
  readonly?: boolean;
}) {
  const { t } = useSettings();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draftPoints, setDraftPoints] = useState<Array<{ x: number; y: number }>>([]);

  function eventPoint(event: PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }

  function beginStroke(event: PointerEvent<SVGSVGElement>) {
    if (readonly) return;
    const point = eventPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraftPoints([point]);
  }

  function moveStroke(event: PointerEvent<SVGSVGElement>) {
    if (readonly || draftPoints.length === 0) return;
    const point = eventPoint(event);
    if (!point) return;
    setDraftPoints((current) => [...current, point].slice(-120));
  }

  function endStroke(event: PointerEvent<SVGSVGElement>) {
    if (readonly || draftPoints.length === 0) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const nextPoints = draftPoints;
    setDraftPoints([]);
    if (nextPoints.length >= 2) onStrokeComplete?.(nextPoints);
  }

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={t({ en: "Classroom whiteboard annotations", zh: "課堂白板批注" })}
      viewBox="0 0 640 360"
      className={`h-[260px] w-full rounded-2xl border border-slate-200/80 bg-white shadow-inner dark:border-white/10 dark:bg-slate-950 ${readonly ? "" : "cursor-crosshair touch-none"}`}
      onPointerDown={beginStroke}
      onPointerMove={moveStroke}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
    >
      <rect width="640" height="360" fill="currentColor" className="text-white dark:text-slate-950" />
      <g opacity="0.55">
        {Array.from({ length: 16 }, (_, index) => (
          <line key={`v-${index}`} x1={index * 42} x2={index * 42} y1="0" y2="360" stroke="rgba(148,163,184,.28)" />
        ))}
        {Array.from({ length: 10 }, (_, index) => (
          <line key={`h-${index}`} x1="0" x2="640" y1={index * 40} y2={index * 40} stroke="rgba(148,163,184,.28)" />
        ))}
      </g>
      {strokes.map((stroke) => (
        <path
          key={stroke.id}
          d={strokePath(stroke)}
          fill="none"
          stroke={stroke.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={stroke.width}
          opacity={stroke.tool === "highlighter" ? 0.55 : 0.95}
        />
      ))}
      {draftPoints.length ? (
        <path
          d={draftPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${(point.x * 640).toFixed(1)} ${(point.y * 360).toFixed(1)}`).join(" ")}
          fill="none"
          stroke="#0891b2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
      ) : null}
    </svg>
  );
}

function ClassroomStage({ session, onToolAction }: { session: TeacherLiveSession; onToolAction: (action: string, payload?: Record<string, unknown>) => Promise<void> }) {
  const { t, text } = useSettings();
  const toolState = session.toolState;
  const presentCount = toolState.attendance.filter((entry) => entry.status === "present" || entry.status === "late").length;
  const answerRows = session.responseSummary.submissions;
  const selectedWorkSample = session.workSamples.find((sample) => sample.id === toolState.projection.selectedWorkSampleId) ?? session.workSamples[0] ?? null;

  if (toolState.activeTool === "attendance") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {(["present", "late", "absent", "excused"] as AttendanceStatus[]).map((status) => (
            <div key={status} className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-3xl font-black text-slate-950 dark:text-white">{toolState.attendance.filter((entry) => entry.status === status).length}</p>
              <p className="mt-1 text-xs font-black uppercase text-slate-500 dark:text-slate-400">{text(attendanceStatusLabel(status))}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-cyan-300/45 bg-cyan-400/10 p-5">
          <p className="text-sm font-black uppercase text-cyan-700 dark:text-cyan-200">{t({ en: "Checked in", zh: "已簽到" })}</p>
          <p className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{presentCount}/{session.studentCount}</p>
        </div>
      </div>
    );
  }

  if (toolState.activeTool === "random-call") {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-8 text-center dark:border-white/10 dark:bg-white/[0.06]">
        <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">{t({ en: "Now calling", zh: "正在點名" })}</p>
        <p className="mt-4 text-5xl font-black text-slate-950 dark:text-white">{toolState.randomCall.currentStudentName ?? t({ en: "Ready", zh: "準備就緒" })}</p>
        <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
          {toolState.randomCall.selectedStudentIds.length} {t({ en: "called this round", zh: "本輪已點名" })}
        </p>
      </div>
    );
  }

  if (toolState.activeTool === "buzzer") {
    return (
      <div className="grid gap-4">
        <div className={`rounded-3xl border p-6 text-center ${toolState.buzzer.status === "open" ? "border-emerald-300/60 bg-emerald-400/12" : "border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.06]"}`}>
          <p className="text-sm font-black uppercase text-slate-500 dark:text-slate-400">{t({ en: "Buzzer status", zh: "搶答狀態" })}</p>
          <p className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{toolState.buzzer.status === "open" ? t({ en: "Open", zh: "進行中" }) : t({ en: "Closed", zh: "已關閉" })}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {toolState.buzzer.entries.slice(0, 3).map((entry) => (
            <div key={entry.studentId} className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-300">Rank {entry.rank}</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{entry.studentName}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (toolState.activeTool === "timer") {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-8 text-center dark:border-white/10 dark:bg-white/[0.06]">
        <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">{toolState.timer.mode === "countdown" ? t({ en: "Countdown", zh: "倒數" }) : t({ en: "Stopwatch", zh: "正計時" })}</p>
        <p className="mt-4 font-mono text-7xl font-black text-slate-950 dark:text-white">{formatTimerSeconds(toolState.timer.remainingSeconds)}</p>
        <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{toolState.timer.status}</p>
      </div>
    );
  }

  if (toolState.activeTool === "teams") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {toolState.teams.teams.length ? toolState.teams.teams.map((team) => (
          <div key={team.id} className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-sm font-black text-slate-600 dark:text-slate-300">{text(team.name)}</p>
            <p className="mt-3 text-5xl font-black text-slate-950 dark:text-white">{team.score}</p>
            <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{team.studentIds.length} {t({ en: "students", zh: "學生" })}</p>
          </div>
        )) : (
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Create teams to start scoring.", zh: "建立分組後即可計分。" })}</p>
        )}
      </div>
    );
  }

  if (toolState.activeTool === "projector") {
    return (
      <div className="grid gap-4">
        {toolState.projection.mode === "work-samples" && selectedWorkSample ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.06]">
            <img src={selectedWorkSample.imageDataUrl} alt={selectedWorkSample.caption || "Selected student work"} className="max-h-[360px] w-full rounded-xl object-contain" />
            <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">
              {toolState.projection.showNames ? selectedWorkSample.studentName : t({ en: "Anonymous student work", zh: "匿名學生作答" })}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {answerRows.length ? answerRows.map((row, index) => (
              <div key={`${row.studentId}-${row.submittedAt}`} className={`rounded-2xl border p-4 ${row.isCorrect === true ? "border-emerald-300/55 bg-emerald-400/12" : row.isCorrect === false ? "border-rose-300/55 bg-rose-400/12" : "border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.06]"}`}>
                <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{toolState.projection.showNames ? row.studentName : `${t({ en: "Student", zh: "學生" })} ${index + 1}`}</p>
                <LiveMathText as="p" value={text(answerLabel(session, row.answer))} className="mt-2 text-2xl font-black text-slate-950 dark:text-white" />
              </div>
            )) : (
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Waiting for student answers.", zh: "等待學生作答。" })}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (toolState.activeTool === "whiteboard") {
    return (
      <WhiteboardSurface
        strokes={toolState.whiteboard.strokes}
        onStrokeComplete={(points) => onToolAction("whiteboard-add-stroke", { points, color: "#0891b2", width: 5 })}
      />
    );
  }

  if (toolState.activeTool === "math-workbench") {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-6 dark:border-white/10 dark:bg-white/[0.06]">
        <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">{text(toolState.mathWorkbench.title)}</p>
        <p className="mt-3 text-4xl font-black text-slate-950 dark:text-white">{toolState.mathWorkbench.tool.replace(/-/g, " ")}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {Object.entries(toolState.mathWorkbench.parameters).map(([key, value]) => (
            <div key={key} className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{key}</p>
              <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{String(value)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-6 dark:border-white/10 dark:bg-white/[0.06]">
      <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">{text(toolState.screenSync.title)}</p>
      <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{toolState.screenSync.locked ? t({ en: "Locked to student devices", zh: "已鎖定學生裝置" }) : t({ en: "Ready to sync", zh: "準備同步" })}</p>
    </div>
  );
}

function TeacherToolPanel({ session, onToolAction, pendingAction }: { session: TeacherLiveSession; onToolAction: (action: string, payload?: Record<string, unknown>) => Promise<void>; pendingAction: string }) {
  const { t, text } = useSettings();
  const toolState = session.toolState;
  const buttonClass = "focus-ring min-h-11 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200";
  const activeClass = "border-cyan-300 bg-cyan-400/15 text-cyan-800 dark:text-cyan-100";

  function actionButton(label: string, action: string, payload?: Record<string, unknown>) {
    return (
      <button
        key={`${action}-${label}`}
        type="button"
        disabled={Boolean(pendingAction)}
        onClick={() => onToolAction(action, payload)}
        className={`${buttonClass} ${pendingAction === action ? activeClass : ""}`}
      >
        {label}
      </button>
    );
  }

  return (
    <aside className="glass-panel h-fit p-4 xl:sticky xl:top-24">
      <p className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-300">{t({ en: "Classroom tools", zh: "課堂工具" })}</p>
      <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{text(toolLabel(toolState.activeTool))}</p>

      <div className="mt-4 grid gap-4">
        <section className="grid gap-2">
          <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{t({ en: "Attendance", zh: "考勤" })}</p>
          <div className="flex flex-wrap gap-2">
            {actionButton(t({ en: "Open", zh: "開啟" }), "attendance-open")}
          </div>
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/55 p-2 dark:border-white/10 dark:bg-white/[0.04]">
            {toolState.attendance.map((entry) => (
              <div key={entry.studentId} className="grid gap-2 border-b border-slate-200/60 py-2 last:border-0 dark:border-white/10">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{entry.studentName}</p>
                <div className="grid grid-cols-2 gap-1">
                  {(["present", "late", "absent", "excused"] as AttendanceStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={Boolean(pendingAction)}
                      onClick={() => onToolAction("attendance-set", { studentId: entry.studentId, status })}
                      className={`focus-ring rounded-xl border px-2 py-1.5 text-xs font-black transition disabled:opacity-50 ${entry.status === status ? "border-cyan-300 bg-cyan-400/15 text-cyan-800 dark:text-cyan-100" : "border-slate-200/80 bg-white/80 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"}`}
                    >
                      {text(attendanceStatusLabel(status))}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-2">
          <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{t({ en: "Call and buzz", zh: "點名與搶答" })}</p>
          <div className="flex flex-wrap gap-2">
            {actionButton(t({ en: "Pick student", zh: "抽學生" }), "random-call")}
            {actionButton(t({ en: "Allow repeat", zh: "允許重複" }), "random-call", { allowRepeats: true })}
            {actionButton(t({ en: "Reset calls", zh: "重設點名" }), "random-call-reset")}
            {actionButton(t({ en: "Open buzzer", zh: "開始搶答" }), "buzzer-open")}
            {actionButton(t({ en: "Close buzzer", zh: "結束搶答" }), "buzzer-close")}
          </div>
        </section>

        <section className="grid gap-2">
          <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{t({ en: "Timer", zh: "計時器" })}</p>
          <div className="flex flex-wrap gap-2">
            {actionButton("03:00", "timer-start", { mode: "countdown", durationSeconds: 180 })}
            {actionButton("05:00", "timer-start", { mode: "countdown", durationSeconds: 300 })}
            {actionButton(t({ en: "Stopwatch", zh: "正計時" }), "timer-start", { mode: "stopwatch", durationSeconds: 0 })}
            {toolState.timer.status === "running" ? actionButton(t({ en: "Pause", zh: "暫停" }), "timer-pause") : actionButton(t({ en: "Resume", zh: "繼續" }), "timer-resume")}
            {actionButton(t({ en: "End", zh: "結束" }), "timer-stop")}
          </div>
        </section>

        <section className="grid gap-2">
          <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{t({ en: "Teams", zh: "分組" })}</p>
          <div className="flex flex-wrap gap-2">
            {actionButton(t({ en: "Auto 4 teams", zh: "自動 4 組" }), "teams-auto", { teamCount: 4 })}
            {toolState.teams.teams.map((team) => (
              <span key={team.id} className="inline-flex overflow-hidden rounded-full border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.06]">
                <button type="button" disabled={Boolean(pendingAction)} onClick={() => onToolAction("team-score", { teamId: team.id, delta: 1 })} className="focus-ring px-3 py-2 text-sm font-black text-slate-700 disabled:opacity-50 dark:text-slate-200">
                  {text(team.name)} +1
                </button>
                <button type="button" disabled={Boolean(pendingAction)} onClick={() => onToolAction("team-score", { teamId: team.id, delta: -1 })} className="focus-ring border-l border-slate-200/80 px-3 py-2 text-sm font-black text-slate-500 disabled:opacity-50 dark:border-white/10 dark:text-slate-300">
                  -1
                </button>
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-2">
          <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{t({ en: "Projection and sync", zh: "上屏與同步" })}</p>
          <div className="flex flex-wrap gap-2">
            {actionButton(t({ en: "Anonymous answers", zh: "匿名答案" }), "projector-set", { mode: "answers", showNames: false })}
            {actionButton(t({ en: "Show names", zh: "顯示姓名" }), "projector-set", { mode: "answers", showNames: true })}
            {session.workSamples.length ? actionButton(t({ en: "Work samples", zh: "作答樣本" }), "projector-set", { mode: "work-samples", showNames: false, selectedWorkSampleId: session.workSamples[0]?.id }) : null}
            {actionButton(t({ en: "Sync prompt", zh: "同步題目" }), "screen-sync", { target: "prompt", title: text(session.currentPrompt.question), href: `/classroom?code=${encodeURIComponent(session.joinCode)}`, locked: true })}
            {actionButton(t({ en: "Sync visual", zh: "同步圖像" }), "screen-sync", { target: "visualization", title: text(session.visualizationTitle), href: studentVisualizationToolsPath, locked: true })}
          </div>
        </section>

        <section className="grid gap-2">
          <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{t({ en: "Board and math", zh: "白板與數學工具" })}</p>
          <div className="flex flex-wrap gap-2">
            {actionButton(t({ en: "Open board", zh: "開啟白板" }), "whiteboard-open")}
            {actionButton(t({ en: "Sync board", zh: "同步白板" }), "screen-sync", { target: "whiteboard", title: t({ en: "Whiteboard", zh: "白板" }), href: `/classroom?code=${encodeURIComponent(session.joinCode)}`, locked: true })}
            {actionButton(t({ en: "Undo", zh: "撤銷" }), "whiteboard-undo")}
            {actionButton(t({ en: "Clear", zh: "清空" }), "whiteboard-clear")}
            {actionButton(t({ en: "Function graph", zh: "函數圖像" }), "math-workbench-set", { tool: "function-graph", title: text(session.visualizationTitle), topicId: session.topicId, parameters: { a: 1, b: -4, c: 3 }, locked: true })}
            {actionButton(t({ en: "Geometry", zh: "幾何工具" }), "math-workbench-set", { tool: "geometry", title: t({ en: "Geometry explorer", zh: "幾何探索器" }), topicId: session.topicId, parameters: { angle: 60, sides: 3 }, locked: true })}
          </div>
        </section>
      </div>
    </aside>
  );
}

function StudentClassroomToolPanel({
  session,
  onAction
}: {
  session: ClassroomLiveSession;
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  const { t, text } = useSettings();
  const [pendingAction, setPendingAction] = useState("");
  const isTeacherPreview = session.viewerMode === "teacher-preview";
  const toolState = session.toolState;
  const currentAttendance = session.attendanceStatus === "present" || session.attendanceStatus === "late";
  const ownBuzzerEntry = session.viewerStudentId
    ? toolState.buzzer.entries.find((entry) => entry.studentId === session.viewerStudentId)
    : null;

  async function run(action: string, payload?: Record<string, unknown>) {
    if (isTeacherPreview) return;
    setPendingAction(action);
    try {
      await onAction(action, payload);
    } finally {
      setPendingAction("");
    }
  }

  return (
    <section className="glass-panel mt-6 p-6 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">{t({ en: "Classroom tools", zh: "課堂工具" })}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{text(toolLabel(toolState.activeTool))}</h2>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
          {text(toolState.screenSync.title)}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => run("attendance-check-in")}
              disabled={isTeacherPreview || Boolean(pendingAction)}
              className="focus-ring min-h-14 rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {currentAttendance ? t({ en: "Checked in", zh: "已簽到" }) : t({ en: "Check in", zh: "簽到" })}
            </button>
            <button
              type="button"
              onClick={() => run("buzzer-submit")}
              disabled={isTeacherPreview || Boolean(ownBuzzerEntry) || toolState.buzzer.status !== "open" || Boolean(pendingAction)}
              className="focus-ring min-h-14 rounded-2xl border border-emerald-300/55 bg-emerald-400/15 px-5 py-4 text-base font-black text-emerald-800 disabled:opacity-50 dark:text-emerald-100"
            >
              {ownBuzzerEntry ? t({ en: "Buzz received", zh: "已收到搶答" }) : toolState.buzzer.status === "open" ? t({ en: "Buzz in", zh: "搶答" }) : t({ en: "Buzzer closed", zh: "搶答未開始" })}
            </button>
          </div>

          {toolState.screenSync.locked ? (
            <button
              type="button"
              onClick={() => run("screen-ack")}
              disabled={isTeacherPreview || Boolean(pendingAction)}
              className="focus-ring rounded-2xl border border-cyan-300/50 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-800 disabled:opacity-50 dark:text-cyan-100"
            >
              {t({ en: "I'm on the synced task", zh: "我已進入同步任務" })}
            </button>
          ) : null}

          <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-5 dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-300">{toolState.timer.mode === "countdown" ? t({ en: "Countdown", zh: "倒數" }) : t({ en: "Stopwatch", zh: "正計時" })}</p>
            <p className="mt-2 font-mono text-5xl font-black text-slate-950 dark:text-white">{formatTimerSeconds(toolState.timer.remainingSeconds)}</p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{toolState.timer.status}</p>
          </div>

          {toolState.activeTool === "whiteboard" || toolState.screenSync.target === "whiteboard" ? (
            <WhiteboardSurface strokes={toolState.whiteboard.strokes} readonly />
          ) : null}

          {toolState.activeTool === "math-workbench" || toolState.screenSync.target === "math-workbench" ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-5 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-300">{text(toolState.mathWorkbench.title)}</p>
              <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{toolState.mathWorkbench.tool.replace(/-/g, " ")}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {Object.entries(toolState.mathWorkbench.parameters).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.06]">
                    <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{key}</p>
                    <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="grid gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{t({ en: "Buzzer ranking", zh: "搶答排名" })}</p>
            <div className="mt-3 grid gap-2">
              {toolState.buzzer.entries.slice(0, 3).length ? toolState.buzzer.entries.slice(0, 3).map((entry) => (
                <div key={`${entry.studentId}-${entry.rank}`} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 dark:bg-white/[0.08] dark:text-slate-200">
                  {entry.rank}. {entry.studentName}
                </div>
              )) : (
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Waiting.", zh: "等待中。" })}</p>
              )}
            </div>
            {ownBuzzerEntry ? <p className="mt-2 text-xs font-bold text-cyan-700 dark:text-cyan-200">{t({ en: "Your buzz was received.", zh: "已收到你的搶答。" })}</p> : null}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{t({ en: "Team scores", zh: "小組分數" })}</p>
            <div className="mt-3 grid gap-2">
              {toolState.teams.teams.length ? toolState.teams.teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 dark:bg-white/[0.08] dark:text-slate-200">
                  <span>{text(team.name)}</span>
                  <span>{team.score}</span>
                </div>
              )) : (
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No teams yet.", zh: "尚未分組。" })}</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

const rosterStateStyles: Record<ClassroomLiveStudentState, { badge: string; card: string; dot: string; label: LocalizedText }> = {
  stuck: {
    badge: "border-rose-300/60 bg-rose-400/15 text-rose-800 dark:text-rose-100",
    card: "border-rose-300/70 bg-rose-400/[0.08] ring-2 ring-rose-300/50 dark:ring-rose-400/30",
    dot: "bg-rose-500",
    label: { en: "Needs help", zh: "需要協助" }
  },
  idle: {
    badge: "border-amber-300/60 bg-amber-400/15 text-amber-800 dark:text-amber-100",
    card: "border-amber-300/55 bg-amber-400/[0.06]",
    dot: "bg-amber-500",
    label: { en: "Idle", zh: "閒置" }
  },
  working: {
    badge: "border-cyan-300/60 bg-cyan-400/15 text-cyan-800 dark:text-cyan-100",
    card: "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]",
    dot: "bg-cyan-500",
    label: { en: "Working", zh: "作答中" }
  },
  done: {
    badge: "border-emerald-300/60 bg-emerald-400/15 text-emerald-800 dark:text-emerald-100",
    card: "border-emerald-300/50 bg-emerald-400/[0.06]",
    dot: "bg-emerald-500",
    label: { en: "Done", zh: "已完成" }
  },
  offline: {
    badge: "border-slate-200/80 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400",
    card: "border-slate-200/70 bg-white/50 opacity-75 dark:border-white/10 dark:bg-white/[0.03]",
    dot: "bg-slate-400",
    label: { en: "Offline", zh: "未上線" }
  }
};

// Ordered the way a teacher scans the room: who to help first, who's coasting last.
const rosterStateOrder: ClassroomLiveStudentState[] = ["stuck", "idle", "working", "done", "offline"];

function rosterReasonLabel(reason: ClassroomLiveAttentionReason | null): LocalizedText | null {
  switch (reason) {
    case "repeated-wrong":
      return { en: "2+ wrong in a row", zh: "連續答錯" };
    case "many-hints":
      return { en: "Leaning on hints", zh: "頻繁看提示" };
    case "wrong-answer":
      return { en: "Stopped on a wrong answer", zh: "停在錯題上" };
    case "idle":
      return { en: "Quiet for a while", zh: "一段時間沒有作答" };
    case "inactive":
      return { en: "Not in this lesson yet", zh: "尚未進入本課" };
    case "not-started":
      return { en: "Hasn't started", zh: "尚未開始" };
    default:
      return null;
  }
}

const rosterSourceLabels: Record<LearningAnalyticsEventSource, LocalizedText> = {
  "adaptive-learning": { en: "Adaptive", zh: "自適應" },
  dashboard: { en: "Home", zh: "主頁" },
  practice: { en: "Practice", zh: "練習" },
  progress: { en: "Progress", zh: "進度" },
  lesson: { en: "Lesson", zh: "課堂" },
  "ai-tutor": { en: "AI tutor", zh: "AI 導師" },
  "mistake-book": { en: "Mistakes", zh: "錯題本" },
  "visualization-lab": { en: "Visual lab", zh: "視覺實驗室" },
  "function-graph": { en: "Visual lab", zh: "視覺實驗室" },
  "function-model": { en: "Visual lab", zh: "視覺實驗室" },
  geometry: { en: "Visual lab", zh: "視覺實驗室" },
  probability: { en: "Visual lab", zh: "視覺實驗室" },
  "coordinate-plane": { en: "Visual lab", zh: "視覺實驗室" },
  "trig-wave": { en: "Visual lab", zh: "視覺實驗室" },
  "calculus-stats": { en: "Visual lab", zh: "視覺實驗室" },
  "learning-path": { en: "Learning path", zh: "學習路徑" },
  navigation: { en: "Browsing", zh: "瀏覽中" }
};

function formatSinceActive(seconds: number | null, t: ReturnType<typeof useSettings>["t"]) {
  if (seconds === null) return "";
  if (seconds < 60) return t({ en: `${seconds}s ago`, zh: `${seconds} 秒前` });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t({ en: `${minutes}m ago`, zh: `${minutes} 分鐘前` });
  const hours = Math.floor(minutes / 60);
  return t({ en: `${hours}h ago`, zh: `${hours} 小時前` });
}

function LiveRosterStudentCard({ entry }: { entry: ClassroomLiveRosterEntry }) {
  const { t, text } = useSettings();
  const styles = rosterStateStyles[entry.state];
  const reason = rosterReasonLabel(entry.reason);
  const sourceLabel = entry.currentSource ? rosterSourceLabels[entry.currentSource] : null;

  return (
    <article className={`grid gap-2 rounded-2xl border p-3.5 transition ${styles.card}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words text-sm font-black text-slate-950 dark:text-white">{entry.studentName}</p>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.66rem] font-black uppercase tracking-[0.08em] ${styles.badge}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
          {text(styles.label)}
        </span>
      </div>

      {reason && entry.state !== "working" && entry.state !== "done" ? (
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{text(reason)}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 text-[0.68rem] font-bold text-slate-500 dark:text-slate-400">
        {sourceLabel ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">{text(sourceLabel)}</span>
        ) : null}
        {entry.lastQuestionId ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
            {t({ en: "Q", zh: "題" })} {entry.lastQuestionId}
          </span>
        ) : entry.currentTopicId ? (
          <span className="max-w-[10rem] truncate rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">{entry.currentTopicId}</span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 text-[0.7rem] font-black">
        <div className="flex items-center gap-2.5">
          <span className="text-emerald-600 dark:text-emerald-300">✓ {entry.correctCount}</span>
          <span className="text-rose-600 dark:text-rose-300">✗ {entry.wrongCount}</span>
          {entry.hintCount > 0 ? <span className="text-amber-600 dark:text-amber-300">{t({ en: "Hints", zh: "提示" })} {entry.hintCount}</span> : null}
        </div>
        <span className="font-bold text-slate-400 dark:text-slate-500">{formatSinceActive(entry.secondsSinceActive, t)}</span>
      </div>
    </article>
  );
}

function LiveRosterCountChip({ count, label, tone }: { count: number; label: LocalizedText; tone: string }) {
  const { text } = useSettings();
  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${tone}`}>
      <span className="text-xl font-black tabular-nums">{count}</span>
      <span className="text-[0.7rem] font-black uppercase tracking-[0.1em]">{text(label)}</span>
    </div>
  );
}

function LiveRosterGrid({
  classId,
  classes,
  onSelectClass,
  lockedClassName
}: {
  classId: string;
  classes: TeacherClass[];
  onSelectClass: (classId: string) => void;
  lockedClassName?: string;
}) {
  const { t, text } = useSettings();
  const [roster, setRoster] = useState<ClassroomLiveRoster | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!classId) {
      setRoster(null);
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/teacher/classroom-sessions/roster?classId=${encodeURIComponent(classId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("roster");
        const payload = (await response.json()) as { roster?: ClassroomLiveRoster };
        if (cancelled) return;
        if (payload.roster) {
          setRoster(payload.roster);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    setStatus("loading");
    setRoster(null);
    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [classId]);

  const counts = roster?.counts;
  const liveCount = counts ? counts.stuck + counts.idle + counts.working + counts.done : 0;
  const sortedStudents = roster
    ? [...roster.students].sort(
        (a, b) => rosterStateOrder.indexOf(a.state) - rosterStateOrder.indexOf(b.state)
      )
    : [];

  return (
    <section className="glass-panel w-full p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-4 dark:border-white/10 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
            {t({ en: "Live monitor", zh: "即時監控" })}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {t({ en: "Who needs me right now", zh: "誰現在需要我" })}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
            {roster
              ? t({ en: `${roster.counts.total} students · refreshes every 5s`, zh: `${roster.counts.total} 位學生 · 每 5 秒更新` })
              : t({ en: "Live per-student status from the current lesson", zh: "本課即時逐生狀態" })}
          </p>
        </div>
        {lockedClassName ? (
          <span className="w-fit rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
            {lockedClassName}
          </span>
        ) : classes.length ? (
          <label className="grid gap-1">
            <span className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Class", zh: "班級" })}</span>
            <select
              value={classId}
              onChange={(event) => onSelectClass(event.target.value)}
              className="focus-ring w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06] lg:w-56"
            >
              {classes.map((teacherClass) => (
                <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {counts ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <LiveRosterCountChip count={counts.stuck} label={{ en: "Needs help", zh: "需要協助" }} tone="border-rose-300/60 bg-rose-400/12 text-rose-800 dark:text-rose-100" />
          <LiveRosterCountChip count={counts.idle} label={{ en: "Idle", zh: "閒置" }} tone="border-amber-300/60 bg-amber-400/12 text-amber-800 dark:text-amber-100" />
          <LiveRosterCountChip count={counts.working} label={{ en: "Working", zh: "作答中" }} tone="border-cyan-300/60 bg-cyan-400/12 text-cyan-800 dark:text-cyan-100" />
          <LiveRosterCountChip count={counts.done} label={{ en: "Done", zh: "已完成" }} tone="border-emerald-300/60 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100" />
          <LiveRosterCountChip count={counts.offline} label={{ en: "Offline", zh: "未上線" }} tone="border-slate-200/80 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300" />
        </div>
      ) : null}

      {status === "loading" && !roster ? (
        <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Loading live status…", zh: "正在載入即時狀態…" })}</p>
      ) : null}

      {status === "error" && !roster ? (
        <p className="mt-5 text-sm font-bold text-rose-700 dark:text-rose-200">{t({ en: "Could not load live status. Retrying…", zh: "暫時無法載入即時狀態，重試中…" })}</p>
      ) : null}

      {roster && roster.students.length === 0 ? (
        <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">
          {t({ en: "No students enrolled in this class yet.", zh: "此班級尚未有學生。" })}
        </p>
      ) : null}

      {roster && roster.students.length > 0 && liveCount === 0 ? (
        <p className="mt-4 rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
          {t({ en: "Live status will fill in as students start working in the lesson.", zh: "當學生開始作答，即時狀態便會顯示。" })}
        </p>
      ) : null}

      {roster && roster.students.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {sortedStudents.map((entry) => (
            <LiveRosterStudentCard key={entry.studentId} entry={entry} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function TeacherLiveView({ live, initialClassId = "" }: { live: TeacherLiveData; initialClassId?: string }) {
  const router = useRouter();
  const { language, t, text } = useSettings();
  const requestedClassId = live.classes.some((teacherClass) => teacherClass.id === initialClassId) ? initialClassId : "";
  const fallbackClassId = live.classes.find((teacherClass) => teacherClass.studentCount > 0)?.id ?? live.classes[0]?.id ?? "";
  const activeLiveSession = live.activeSession?.status === "active" ? live.activeSession : null;
  const [selectedClassId, setSelectedClassId] = useState(activeLiveSession?.classId ?? (requestedClassId || fallbackClassId));
  const [promptType, setPromptType] = useState<TeacherLivePromptType>("poll");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const session = activeLiveSession;

  useEffect(() => {
    if (!live.classes.length && !activeLiveSession) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [activeLiveSession, live.classes.length, router]);

  const startSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!selectedClassId) {
      // Never let Start be a silent no-op: with no class selected there is nothing
      // to start, so say so inline.
      setError(t({ en: "Select a class before starting a session.", zh: "開始課堂前請先選擇班級。", zhHans: "开始课堂前请先选择班级。" }));
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/teacher/classroom-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          promptType,
          question: form.get("question"),
          correctOptionId: form.get("correctOptionId"),
          topicId: form.get("topicId")
        })
      });
      if (!response.ok) {
        setError(t({ en: "Could not start the live session.", zh: "暫時未能開始課堂。" }));
        return;
      }
      formElement.reset();
      router.refresh();
    } catch {
      setError(t({ en: "Could not start the live session.", zh: "暫時未能開始課堂。" }));
    }
  };

  const endSession = async () => {
    if (!session) return;
    await fetch("/api/teacher/classroom-sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, status: "ended" })
    });
    router.refresh();
  };

  const runToolAction = async (action: string, payload?: Record<string, unknown>) => {
    if (!session) return;
    setPendingAction(action);
    setError("");
    try {
      const response = await fetch("/api/teacher/classroom-sessions/tool-commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, action, payload })
      });
      if (!response.ok) {
        setError(t({ en: "Could not update the classroom tool.", zh: "暫時未能更新課堂工具。" }));
        return;
      }
      router.refresh();
    } catch {
      setError(t({ en: "Could not update the classroom tool.", zh: "暫時未能更新課堂工具。" }));
      return;
    } finally {
      setPendingAction("");
    }
  };

  const visualizationHref = studentVisualizationToolsPath;

  return (
    <div className="grid gap-5">
      <section className="glass-panel w-full max-w-5xl p-5 sm:p-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Live classroom", zh: "課堂模式" })}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {session ? text(session.title) : t({ en: "Start a classroom check", zh: "開始課堂檢查" })}
            </h1>
            {session ? (
              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                {session.className} · {formatGradeLabel(session.grade, language, true)} · {t({ en: "Refreshing every 5 seconds", zh: "每 5 秒更新" })}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {live.classes.length ? (
        <LiveRosterGrid
          classId={selectedClassId}
          classes={live.classes}
          onSelectClass={setSelectedClassId}
          lockedClassName={session ? session.className : undefined}
        />
      ) : null}

      {session ? (
        <>
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="glass-panel p-5 sm:p-6">
              <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-5 dark:border-white/10 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{session.className} · {formatGradeLabel(session.grade, language, true)}</p>
                  <h2 className="mt-2 max-w-4xl text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">{text(session.lessonTitle)}</h2>
                  <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                    {t({ en: "Active tool", zh: "目前工具" })}: {text(toolLabel(session.toolState.activeTool))}
                  </p>
                </div>
                <Link
                  href={visualizationHref}
                  aria-label={t({ en: `Open ${text(session.visualizationTitle)}`, zh: `開啟${text(session.visualizationTitle)}` })}
                  className="focus-ring group inline-flex w-fit shrink-0 items-center gap-2.5 rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-2 text-left text-cyan-800 shadow-sm shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:border-cyan-300/70 hover:bg-cyan-400/20 dark:text-cyan-100"
                >
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-[0.72rem] font-black text-white shadow-sm transition group-hover:scale-105 dark:bg-white dark:text-slate-950">
                    fx
                  </span>
                  <span className="whitespace-nowrap text-sm font-black leading-none tracking-normal">
                    {text(session.visualizationTitle)}
                  </span>
                </Link>
              </div>

              <div className="border-b border-slate-200/70 py-5 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="w-fit rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                    {session.currentPrompt.type === "poll" ? t({ en: "Quick poll", zh: "快速投票" }) : t({ en: "Exit ticket", zh: "離場回饋" })}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t({ en: "Student-facing prompt", zh: "學生端題目" })}
                  </p>
                </div>
                <LiveMathText as="h3" value={text(session.currentPrompt.question)} className="mt-4 max-w-4xl text-2xl font-black leading-snug text-slate-950 dark:text-white sm:text-3xl" />
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {session.currentPrompt.options.map((option) => (
                    <div key={option.id} className="grid grid-cols-[2.5rem_1fr] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">{option.id.toUpperCase()}</span>
                      <LiveMathText value={text(option.label)} className="text-lg font-black text-slate-950 dark:text-white" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-5">
                <ClassroomStage session={session} onToolAction={runToolAction} />
              </div>
            </div>
            <div className="grid gap-5">
              <SessionActionPanel session={session} onEndSession={endSession} />
              <TeacherToolPanel session={session} onToolAction={runToolAction} pendingAction={pendingAction} />
            </div>
          </section>
          <SessionStats session={session} />
        </>
      ) : null}

      <section className="glass-panel w-full max-w-5xl p-5 sm:p-6">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Start session", zh: "開啟課堂" })}</h2>
        <form onSubmit={startSession} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end">
          <label className="grid gap-2 xl:col-span-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Class", zh: "班級" })}</span>
            <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="focus-ring w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              {live.classes.length ? (
                live.classes.map((teacherClass) => <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.name}</option>)
              ) : (
                <option value="">{t({ en: "No classes yet", zh: "尚未建立班級", zhHans: "尚未创建班级" })}</option>
              )}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Mode", zh: "模式" })}</span>
            <select value={promptType} onChange={(event) => setPromptType(event.target.value as TeacherLivePromptType)} className="focus-ring w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="poll">{t({ en: "Quick poll", zh: "快速投票" })}</option>
              <option value="exit-ticket">{t({ en: "Exit ticket", zh: "離場回饋" })}</option>
            </select>
          </label>
          <label className="grid gap-2 xl:col-span-3">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Question", zh: "題目" })}</span>
            <input name="question" required placeholder={t({ en: "What is the next step?", zh: "下一步應怎樣做？" })} className="focus-ring w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Answer", zh: "答案" })}</span>
            <select name="correctOptionId" disabled={promptType === "exit-ticket"} className="focus-ring w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06]">
              {["a", "b", "c", "d"].map((option) => <option key={option} value={option}>{option.toUpperCase()}</option>)}
            </select>
          </label>
          <label className="grid gap-2 xl:col-span-3">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Topic ID", zh: "課題 ID" })}</span>
            <input name="topicId" placeholder="quadratic-patterns" className="focus-ring w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <button
            type="submit"
            disabled={!live.classes.length}
            className="focus-ring min-h-12 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 xl:col-span-2 xl:w-fit xl:px-8"
          >
            {t({ en: "Start", zh: "開始" })}
          </button>
        </form>
        {!live.classes.length ? (
          <p className="mt-3 text-sm font-bold text-amber-700 dark:text-amber-200">
            {t({ en: "Create a class first to run a live session.", zh: "請先建立班級，才可開始課堂。", zhHans: "请先创建班级，才可开始课堂。" })}{" "}
            <Link href="/teacher/classes" className="underline underline-offset-4">{t({ en: "Create a class", zh: "建立班級", zhHans: "创建班级" })}</Link>
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
      </section>

      <RecentSessionsPanel sessions={live.recentSessions} />
    </div>
  );
}

export function StudentClassroomView({ initialCode }: { initialCode: string }) {
  const { t, text } = useSettings();
  const [code, setCode] = useState(initialCode);
  const [joinedCode, setJoinedCode] = useState(initialCode);
  const [session, setSession] = useState<ClassroomLiveSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const isTeacherPreview = session?.viewerMode === "teacher-preview";

  useEffect(() => {
    if (!joinedCode) return;
    let cancelled = false;

    async function loadSession() {
      const response = await fetch(`/api/classroom/live?code=${encodeURIComponent(joinedCode)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { session?: ClassroomLiveSession } | null;
      if (!cancelled) setSession(response.ok && payload?.session ? payload.session : null);
    }

    loadSession();
    const timer = window.setInterval(loadSession, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [joinedCode]);

  const join = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const response = await fetch(`/api/classroom/live?code=${encodeURIComponent(code)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => null) as { session?: ClassroomLiveSession } | null;
    if (!response.ok || !payload?.session) {
      setSession(null);
      setMessage(t({ en: "No active session found for this code.", zh: "找不到此加入碼的課堂。" }));
      return;
    }
    setSession(payload.session);
    setJoinedCode(code);
  };

  const submit = async () => {
    if (!session || !answer || !session.canSubmit) return;
    const response = await fetch("/api/classroom/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        promptId: session.currentPrompt.id,
        answer
      })
    });
    if (!response.ok) {
      setMessage(t({ en: "Could not submit yet.", zh: "暫時未能提交。" }));
      return;
    }
    setMessage(t({ en: "Submitted.", zh: "已提交。" }));
    const refreshed = await fetch(`/api/classroom/live?code=${encodeURIComponent(session.joinCode)}`, { cache: "no-store" });
    const payload = await refreshed.json().catch(() => null) as { session?: ClassroomLiveSession } | null;
    if (payload?.session) setSession(payload.session);
  };

  const submitClassroomAction = async (action: string, payload?: Record<string, unknown>) => {
    if (!session) return;
    setMessage("");
    const response = await fetch("/api/classroom/live/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        action,
        payload
      })
    });
    const refreshed = await response.json().catch(() => null) as { session?: ClassroomLiveSession; error?: string } | null;
    if (!response.ok || !refreshed?.session) {
      setMessage(t({ en: "Could not update the classroom action.", zh: "暫時未能更新課堂動作。" }));
      return;
    }
    setSession(refreshed.session);
    setMessage(t({ en: "Updated.", zh: "已更新。" }));
  };

  return (
    <div className="page-container py-10 sm:py-12">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Classroom session", zh: "課堂 Session" })}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{t({ en: "Join live classroom", zh: "加入即時課堂" })}</h1>
        <form onSubmit={join} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t({ en: "Join code", zh: "加入碼" })} className="focus-ring min-h-12 flex-1 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-lg font-black uppercase tracking-[0.12em] dark:border-white/10 dark:bg-white/[0.06]" />
          <button type="submit" className="focus-ring rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "Join", zh: "加入" })}</button>
        </form>
        {message ? <p className="mt-3 text-sm font-bold text-cyan-700 dark:text-cyan-200">{message}</p> : null}
      </section>

      {session ? (
        <>
          <section className="glass-panel mt-6 p-6 sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">{session.className} · {text(session.lessonTitle)}</p>
            {isTeacherPreview ? (
              <p className="mt-3 w-fit rounded-full border border-amber-300/55 bg-amber-400/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-amber-700 dark:text-amber-100">
                {t({ en: "Teacher preview", zh: "教師預覽" })} · {t({ en: "Readonly student view. Answers are not submitted.", zh: "唯讀學生端預覽，不會提交答案。" })}
              </p>
            ) : null}
            <LiveMathText as="h2" value={text(session.currentPrompt.question)} className="mt-3 text-4xl font-black text-slate-950 dark:text-white" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {session.currentPrompt.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAnswer(option.id)}
                  disabled={isTeacherPreview}
                  className={`focus-ring rounded-3xl border px-5 py-5 text-left text-2xl font-black transition disabled:cursor-not-allowed disabled:opacity-70 ${answer === option.id ? "border-cyan-300 bg-cyan-400/15" : "border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.07]"}`}
                >
                  <span>{option.id.toUpperCase()} · </span>
                  <LiveMathText value={text(option.label)} />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!answer || !session.canSubmit}
              className="focus-ring mt-6 rounded-full bg-slate-950 px-7 py-4 text-base font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {isTeacherPreview ? t({ en: "Preview only", zh: "預覽模式，不會提交答案" }) : session.submitted ? t({ en: "Submitted", zh: "已提交" }) : t({ en: "Submit answer", zh: "提交答案" })}
            </button>
          </section>
          <StudentClassroomToolPanel session={session} onAction={submitClassroomAction} />
        </>
      ) : null}
    </div>
  );
}
