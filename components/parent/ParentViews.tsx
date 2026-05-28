"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ParentMotivationSummary } from "@/components/gamification/ParentMotivationSummary";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, localeForLanguage, simplifyChineseText } from "@/lib/i18n";
import type {
  GuardianRelationship,
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

function formatDate(value: string | null, language: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeForLanguage(language as "en" | "zh" | "zh-Hans"), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

const englishSuggestedPracticeFallbacks = new Map<string, string>([
  ["每週兩次重做錯題簿", "Redo the mistake book twice a week"],
  ["完成二次函數基礎題組", "Complete the quadratic functions foundation set"]
]);

const chineseTextPattern = /[\u3400-\u9fff]/;

function suggestedPracticeForLanguage(items: string[], language: string) {
  if (language === "zh" || language === "zh-Hans") return items.map((item) => simplifyChineseText(item, language));
  if (language !== "en") return items;

  return items.map((item) => {
    const translated = englishSuggestedPracticeFallbacks.get(item);
    if (translated) return translated;
    return chineseTextPattern.test(item) ? "Review the teacher's recommended practice task" : item;
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

export function ParentChildDetail({ child }: { child: ParentChildSummary }) {
  const { language, t, text } = useSettings();

  return (
    <div className="grid gap-6">
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
              <p className="text-sm font-black text-slate-950 dark:text-white">{text(item.assignment.title)}</p>
              <p className="mt-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">{item.className} · {item.submission.status}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t({ en: "Score", zh: "分數" })}: {item.submission.score ?? "-"} · {t({ en: "Updated", zh: "更新" })} {formatDate(item.submission.updatedAt, language)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportCard({ report }: { report: TeacherReport }) {
  const { language, t, text } = useSettings();
  const suggestedPractice = report.preview ? suggestedPracticeForLanguage(report.preview.suggestedPractice, language).slice(0, 2) : [];

  return (
    <article className="soft-panel mt-4 p-4">
      <p className="text-sm font-black text-slate-950 dark:text-white">{text(report.title)}</p>
      <p className="mt-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">{formatDate(report.generatedAt, language)}</p>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{text(report.summary)}</p>
      {report.preview ? (
        <div className="mt-4 grid gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
          <p>{t({ en: "Average mastery", zh: "平均掌握" })}: {report.preview.metrics.averageMastery}%</p>
          <p>{t({ en: "Suggested practice", zh: "建議練習" })}: {suggestedPractice.join(" · ")}</p>
        </div>
      ) : null}
    </article>
  );
}

export function ParentReportsView({ data }: { data: ParentReportData }) {
  const { t } = useSettings();
  if (!data.children.length) {
    return <EmptyParentState title={t({ en: "No linked child yet", zh: "尚未綁定孩子" })} body={t({ en: "Connect a child before reading parent summaries.", zh: "綁定孩子後即可查看家長摘要。" })} actionHref="/parent/connect" />;
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Parent reports", zh: "家長摘要" })}</p>
        <h1 className="mt-3 text-4xl font-black text-slate-950 dark:text-white">{t({ en: "Teacher-published summaries", zh: "教師發佈摘要" })}</h1>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        {data.reports.map((report) => <ReportCard key={report.id} report={report} />)}
        {!data.reports.length ? <p className="glass-panel p-5 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No parent summaries yet.", zh: "暫未有家長摘要。" })}</p> : null}
      </section>
    </div>
  );
}

export function ParentMessagesView({ initialData }: { initialData: ParentMessagesData }) {
  const router = useRouter();
  const { language, t, text } = useSettings();
  const [data, setData] = useState(initialData);
  const [studentId, setStudentId] = useState(initialData.selectedChild?.student.id ?? initialData.children[0]?.student.id ?? "");
  const [category, setCategory] = useState<ParentMessageCategory>("learning-support");
  const [reportId, setReportId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");
  const selectedThread = data.selectedThread;
  const reportsForStudent = useMemo(() => data.reports.filter((report) => !studentId || report.studentId === studentId), [data.reports, studentId]);

  async function reload(threadId?: string) {
    const params = new URLSearchParams();
    if (studentId) params.set("studentId", studentId);
    if (threadId) params.set("thread", threadId);
    const response = await fetch(`/api/parent/messages?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json().catch(() => null) as { data?: ParentMessagesData } | null;
    if (response.ok && payload?.data) setData(payload.data);
  }

  async function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/parent/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, category, reportId, subject, body })
    });
    const payload = await response.json().catch(() => null) as { thread?: { id: string } } | null;
    if (!response.ok || !payload?.thread) {
      setMessage(t({ en: "Could not send this parent message.", zh: "暫時未能發送家長私信。" }));
      return;
    }
    setSubject("");
    setBody("");
    setReportId("");
    await reload(payload.thread.id);
    router.refresh();
  }

  async function sendReply() {
    if (!selectedThread || !reply.trim()) return;
    const response = await fetch(`/api/parent/messages/${encodeURIComponent(selectedThread.id)}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply })
    });
    if (!response.ok) {
      setMessage(t({ en: "Could not send reply.", zh: "暫時未能發送回覆。" }));
      return;
    }
    setReply("");
    await reload(selectedThread.id);
  }

  if (!data.children.length) {
    return <EmptyParentState title={t({ en: "No linked child yet", zh: "尚未綁定孩子" })} body={t({ en: "Connect a child before messaging teachers.", zh: "綁定孩子後即可與教師私信。" })} actionHref="/parent/connect" />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      <aside className="glass-panel p-4">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Threads", zh: "對話" })}</h1>
        <div className="mt-4 grid gap-2">
          {data.threads.map((thread) => (
            <button key={thread.id} type="button" onClick={() => void reload(thread.id)} className={`focus-ring rounded-2xl border p-3 text-left ${selectedThread?.id === thread.id ? "border-cyan-300/55 bg-cyan-400/12" : "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]"}`}>
              <p className="truncate text-sm font-black">{text(thread.subject)}</p>
              <p className="mt-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">{thread.teacherName} · {thread.studentName}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{thread.latestMessage}</p>
            </button>
          ))}
          {!data.threads.length ? <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No parent messages yet.", zh: "尚未有家長私信。" })}</p> : null}
        </div>
      </aside>

      <section className="glass-panel p-4 sm:p-5">
        {selectedThread ? (
          <>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">{selectedThread.teacherName}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{text(selectedThread.subject)}</h2>
            <div className="mt-5 grid gap-3">
              {selectedThread.messages.map((entry) => (
                <div key={entry.id} className={`max-w-[86%] rounded-2xl border p-4 ${entry.senderRole === "teacher" ? "border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.06]" : "ml-auto border-cyan-300/45 bg-cyan-400/10"}`}>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{entry.senderName} · {formatDate(entry.createdAt, language)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{entry.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3">
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.06]" />
              <button onClick={sendReply} type="button" className="focus-ring w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                {t({ en: "Send reply", zh: "發送回覆" })}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Choose or create a parent-teacher thread.", zh: "選擇或建立家校對話。" })}</p>
        )}
      </section>

      <aside className="glass-panel p-4">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Ask teacher", zh: "聯絡教師" })}</h2>
        <form onSubmit={createThread} className="mt-4 grid gap-3">
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
            {data.children.map((child) => <option key={child.student.id} value={child.student.id}>{child.student.name}</option>)}
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value as ParentMessageCategory)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
            {data.categories.map((item) => <option key={item.id} value={item.id}>{text(item.label)}</option>)}
          </select>
          <select value={reportId} onChange={(event) => setReportId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
            <option value="">{t({ en: "No linked report", zh: "不連結報告" })}</option>
            {reportsForStudent.map((report) => <option key={report.id} value={report.id}>{text(report.title)}</option>)}
          </select>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} required placeholder={t({ en: "Subject", zh: "主題" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={5} placeholder={t({ en: "What context would help at home?", zh: "家中想了解甚麼支援方向？" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.06]" />
          <button className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Send message", zh: "發送訊息" })}
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
          <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} required className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-lg font-black uppercase tracking-[0.12em] dark:border-white/10 dark:bg-white/[0.06]" />
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
