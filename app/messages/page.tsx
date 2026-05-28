"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { localeForLanguage } from "@/lib/i18n";
import type { Language, StudentMessagesData } from "@/types";

type MessagesResponse = {
  data?: StudentMessagesData;
};

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function StudentMessagesPage() {
  const { language, t, text } = useSettings();
  const [data, setData] = useState<StudentMessagesData | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [classId, setClassId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");

  const selectedThread = useMemo(() => {
    if (!data) return null;
    return data.threads.find((thread) => thread.id === selectedThreadId) ?? data.selectedThread;
  }, [data, selectedThreadId]);

  async function loadMessages(threadId = selectedThreadId) {
    const query = threadId ? `?thread=${encodeURIComponent(threadId)}` : "";
    const response = await fetch(`/api/messages${query}`, { cache: "no-store" });
    const payload = await response.json().catch(() => null) as MessagesResponse | null;
    const nextData = response.ok ? payload?.data ?? null : null;
    setData(nextData);
    const nextThread = nextData?.selectedThread?.id ?? "";
    setSelectedThreadId(threadId || nextThread);
    setClassId((current) => current || nextData?.classes[0]?.id || "");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    void loadMessages(params.get("thread") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, assignmentId, subject, body })
    });
    const payload = await response.json().catch(() => null) as { thread?: { id: string } } | null;
    if (!response.ok || !payload?.thread) {
      setMessage(t({ en: "Could not send this message yet.", zh: "暫時未能發送此訊息。" }));
      return;
    }
    setSubject("");
    setBody("");
    setAssignmentId("");
    setMessage(t({ en: "Message sent.", zh: "訊息已發送。" }));
    await loadMessages(payload.thread.id);
  }

  async function sendReply() {
    if (!selectedThread || !reply.trim()) return;
    setMessage("");
    const response = await fetch(`/api/messages/${encodeURIComponent(selectedThread.id)}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply })
    });
    if (!response.ok) {
      setMessage(t({ en: "Could not send this reply yet.", zh: "暫時未能發送回覆。" }));
      return;
    }
    setReply("");
    await loadMessages(selectedThread.id);
  }

  return (
    <div className="page-container py-10 sm:py-12">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Messages", zh: "私信" })}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{t({ en: "Ask your teacher", zh: "向老師提問" })}</h1>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside className="glass-panel p-4">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Threads", zh: "對話" })}</h2>
          <div className="mt-4 grid gap-2">
            {data?.threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => {
                  setSelectedThreadId(thread.id);
                  window.history.replaceState(null, "", `/messages?thread=${encodeURIComponent(thread.id)}`);
                }}
                className={`focus-ring rounded-2xl border p-3 text-left transition ${selectedThread?.id === thread.id ? "border-cyan-300/55 bg-cyan-400/12" : "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]"}`}
              >
                <p className="truncate text-sm font-black">{text(thread.subject)}</p>
                <p className="mt-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">{thread.teacherName}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{thread.latestMessage}</p>
              </button>
            ))}
            {!data?.threads.length ? <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No messages yet.", zh: "尚未有私信。" })}</p> : null}
          </div>
        </aside>

        <section className="glass-panel p-4 sm:p-5">
          {selectedThread ? (
            <>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">{selectedThread.teacherName}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{text(selectedThread.subject)}</h2>
              <div className="mt-5 grid gap-3">
                {selectedThread.messages.map((entry) => (
                  <div key={entry.id} className={`max-w-[86%] rounded-2xl border p-4 ${entry.senderRole === "student" ? "ml-auto border-cyan-300/45 bg-cyan-400/10" : "border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.06]"}`}>
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
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Choose or create a thread.", zh: "選擇或建立對話。" })}</p>
          )}
        </section>

        <aside className="glass-panel p-4">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "New message", zh: "新訊息" })}</h2>
          <form onSubmit={createThread} className="mt-4 grid gap-3">
            <select value={classId} onChange={(event) => setClassId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              {data?.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="">{t({ en: "No assignment", zh: "不指定作業" })}</option>
              {data?.assignments.map((item) => <option key={item.assignment.id} value={item.assignment.id}>{text(item.assignment.title)}</option>)}
            </select>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} required placeholder={t({ en: "Subject", zh: "主題" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
            <textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={5} placeholder={t({ en: "What would you like help with?", zh: "你想請教甚麼？" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.06]" />
            <button className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
              {t({ en: "Send message", zh: "發送訊息" })}
            </button>
          </form>
          {message ? <p className="mt-4 text-sm font-bold text-cyan-700 dark:text-cyan-200">{message}</p> : null}
          <Link href="/dashboard" className="focus-ring mt-5 inline-flex rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">
            {t(dictionary.nav.dashboard)}
          </Link>
        </aside>
      </div>
    </div>
  );
}
