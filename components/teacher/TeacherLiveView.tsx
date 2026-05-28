"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel } from "@/lib/i18n";
import type { ClassroomLiveSession, TeacherLiveData, TeacherLivePromptType, TeacherLiveSession } from "@/types";

function formatPercent(value: number | null) {
  return value === null ? "-" : `${value}%`;
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

export function TeacherLiveView({ live }: { live: TeacherLiveData }) {
  const router = useRouter();
  const { language, t, text } = useSettings();
  const [selectedClassId, setSelectedClassId] = useState(live.activeSession?.classId ?? live.classes.find((teacherClass) => teacherClass.studentCount > 0)?.id ?? live.classes[0]?.id ?? "");
  const [promptType, setPromptType] = useState<TeacherLivePromptType>("poll");
  const [error, setError] = useState("");
  const session = live.activeSession;

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [router]);

  const startSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/teacher/live", {
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
  };

  const endSession = async () => {
    if (!session) return;
    await fetch("/api/teacher/live", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, status: "ended" })
    });
    router.refresh();
  };

  const visualizationHref = session?.lessonSlug ? `/lesson/${encodeURIComponent(session.lessonSlug)}#visualization` : "/visualization-lab";

  return (
    <div className="grid gap-5">
      <section className="glass-panel p-5 sm:p-6">
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

      {session ? (
        <>
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="glass-panel p-5 sm:p-6">
              <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-5 dark:border-white/10 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{session.className} · {formatGradeLabel(session.grade, language, true)}</p>
                  <h2 className="mt-2 max-w-4xl text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">{text(session.lessonTitle)}</h2>
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

              <div className="pt-5">
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
            </div>
            <SessionActionPanel session={session} onEndSession={endSession} />
          </section>
          <SessionStats session={session} />
        </>
      ) : null}

      <section className="glass-panel p-5 sm:p-6">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Start session", zh: "開啟課堂" })}</h2>
        <form onSubmit={startSession} className="mt-5 grid gap-4 xl:grid-cols-[220px_160px_minmax(240px,1fr)_160px_160px_auto] xl:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Class", zh: "班級" })}</span>
            <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              {live.classes.map((teacherClass) => <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Mode", zh: "模式" })}</span>
            <select value={promptType} onChange={(event) => setPromptType(event.target.value as TeacherLivePromptType)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="poll">{t({ en: "Quick poll", zh: "快速投票" })}</option>
              <option value="exit-ticket">{t({ en: "Exit ticket", zh: "離場回饋" })}</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Question", zh: "題目" })}</span>
            <input name="question" required placeholder={t({ en: "What is the next step?", zh: "下一步應怎樣做？" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Answer", zh: "答案" })}</span>
            <select name="correctOptionId" disabled={promptType === "exit-ticket"} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-bold disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06]">
              {["a", "b", "c", "d"].map((option) => <option key={option} value={option}>{option.toUpperCase()}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Topic ID", zh: "課題 ID" })}</span>
            <input name="topicId" placeholder="quadratic-patterns" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <button type="submit" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "Start", zh: "開始" })}</button>
        </form>
        {error ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
      </section>
    </div>
  );
}

export function StudentClassroomView({ initialCode }: { initialCode: string }) {
  const { t, text } = useSettings();
  const [code, setCode] = useState(initialCode);
  const [session, setSession] = useState<ClassroomLiveSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const isTeacherPreview = session?.viewerMode === "teacher-preview";

  useEffect(() => {
    if (!initialCode) return;
    let cancelled = false;

    async function loadSession() {
      const response = await fetch(`/api/classroom/live?code=${encodeURIComponent(initialCode)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { session?: ClassroomLiveSession } | null;
      if (!cancelled) setSession(response.ok && payload?.session ? payload.session : null);
    }

    loadSession();
    const timer = window.setInterval(loadSession, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [initialCode]);

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
      ) : null}
    </div>
  );
}
