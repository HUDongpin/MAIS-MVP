"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { forumClassSpaces, forumSeedThreads } from "@/data/forum";
import {
  forumDefaultPageSize,
  forumModerationVisible,
  localizedForumDate,
  summarizeForum,
  type ForumClassSpace,
  type ForumFilter,
  type ForumPageInfo,
  type ForumThread,
  type ForumWorkspaceData
} from "@/lib/forum";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/providers/AppProviders";

const fallbackPageInfo: ForumPageInfo = {
  page: 1,
  pageSize: forumDefaultPageSize,
  totalThreads: forumSeedThreads.length,
  totalPages: 1,
  query: ""
};

const filters: Array<{ id: ForumFilter; label: { en: string; zh: string; zhHans: string } }> = [
  { id: "all", label: { en: "All", zh: "全部", zhHans: "全部" } },
  { id: "questions", label: { en: "Questions", zh: "提問", zhHans: "提问" } },
  { id: "live", label: { en: "Live", zh: "即時", zhHans: "即时" } },
  { id: "resolved", label: { en: "Resolved", zh: "已解決", zhHans: "已解决" } },
  { id: "pinned", label: { en: "Pinned", zh: "置頂", zhHans: "置顶" } }
];

function visibleReplyCount(thread: ForumThread) {
  return thread.replies.filter((reply) => forumModerationVisible(reply.moderation)).length;
}

function fallbackClassForSpaces(spaces: ForumClassSpace[]) {
  return spaces[0] ?? forumClassSpaces[0];
}

export function ForumWorkspace() {
  const { currentUser, language, settingsReady, t, text } = useSettings();
  const fallbackClass = fallbackClassForSpaces(forumClassSpaces);
  const [classes, setClasses] = useState<ForumClassSpace[]>(forumClassSpaces);
  const [classId, setClassId] = useState(fallbackClass.classId);
  const [threads, setThreads] = useState<ForumThread[]>(forumSeedThreads);
  const [filter, setFilter] = useState<ForumFilter>("all");
  const [query, setQuery] = useState("");
  const [pageInfo, setPageInfo] = useState<ForumPageInfo>(fallbackPageInfo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [posting, setPosting] = useState(false);

  const activeClass = classes.find((item) => item.classId === classId) ?? fallbackClassForSpaces(classes);
  const summary = useMemo(() => summarizeForum(threads, activeClass.classId), [activeClass.classId, threads]);
  const canPost = Boolean(currentUser && currentUser.role !== "parent");

  const loadForum = useCallback(async () => {
    if (!settingsReady || !currentUser) return;

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        classId,
        filter,
        page: String(pageInfo.page),
        pageSize: String(forumDefaultPageSize)
      });
      if (query.trim()) params.set("query", query.trim());

      const response = await fetch(`/api/forum?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as (ForumWorkspaceData & { error?: string }) | null;
      if (!response.ok || !payload) throw new Error(payload?.error ?? "Forum data could not be loaded.");

      setClasses(payload.classes.length ? payload.classes : forumClassSpaces);
      setClassId(payload.activeClassId ?? payload.classes[0]?.classId ?? fallbackClass.classId);
      setThreads(payload.threads);
      setPageInfo(payload.pageInfo);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Forum data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [classId, currentUser, fallbackClass.classId, filter, pageInfo.page, query, settingsReady]);

  useEffect(() => {
    void loadForum();
  }, [loadForum]);

  async function submitThread() {
    if (!canPost || posting) return;

    setPosting(true);
    setError("");
    try {
      const response = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: activeClass.classId,
          title,
          body,
          subject,
          tags: subject ? [subject] : [],
          mode: "async",
          kind: "question"
        })
      });
      const payload = await response.json().catch(() => null) as { thread?: ForumThread; error?: string } | null;
      if (!response.ok || !payload?.thread) throw new Error(payload?.error ?? "The discussion could not be posted.");

      setThreads((current) => [payload.thread!, ...current.filter((thread) => thread.threadId !== payload.thread!.threadId)]);
      setTitle("");
      setBody("");
      setSubject("");
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "The discussion could not be posted.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-slate-50 py-8 dark:bg-slate-950">
      <div className="page-container grid gap-6">
        <section className="glass-panel p-6">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
            {t({ en: "Class forum", zh: "班級論壇", zhHans: "班级论坛" })}
          </p>
          <h1 id="forum-page-title" className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {t({ en: "Forum inbox", zh: "論壇收件箱", zhHans: "论坛收件箱" })}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-300">
            {t({
              en: "Forum code and API remain available, while the main navigation entry can be hidden independently.",
              zh: "論壇程式碼與 API 仍保留，主導覽入口可獨立暫時隱藏。",
              zhHans: "论坛代码与 API 仍保留，主导航入口可独立暂时隐藏。"
            })}
          </p>
        </section>

        {error ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100" role="status">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              {t({ en: "Class space", zh: "班級空間", zhHans: "班级空间" })}
              <select
                className="focus-ring min-h-11 rounded-xl border border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-slate-900"
                value={activeClass.classId}
                onChange={(event) => {
                  setClassId(event.target.value);
                  setPageInfo((current) => ({ ...current, page: 1 }));
                }}
              >
                {classes.map((item) => (
                  <option key={item.classId} value={item.classId}>{text(item.name)}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <span className="rounded-xl bg-blue-50 px-3 py-2 font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">{summary.totalThreads} {t({ en: "threads", zh: "討論", zhHans: "讨论" })}</span>
              <span className="rounded-xl bg-emerald-50 px-3 py-2 font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">{summary.teacherReplies} {t({ en: "teacher replies", zh: "教師回覆", zhHans: "教师回复" })}</span>
              <span className="rounded-xl bg-amber-50 px-3 py-2 font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-100">{summary.unresolvedQuestions} {t({ en: "open", zh: "待解決", zhHans: "待解决" })}</span>
              <span className="rounded-xl bg-violet-50 px-3 py-2 font-black text-violet-700 dark:bg-violet-500/10 dark:text-violet-100">{summary.activeLiveThreads} {t({ en: "live", zh: "即時", zhHans: "即时" })}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "focus-ring min-h-10 rounded-full px-4 text-sm font-black",
                    filter === item.id
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                  )}
                  onClick={() => {
                    setFilter(item.id);
                    setPageInfo((current) => ({ ...current, page: 1 }));
                  }}
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t({ en: "Search forum", zh: "搜尋論壇", zhHans: "搜索论坛" })}</span>
              <input
                className="focus-ring min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-slate-900"
                name="forum-search"
                placeholder={t({ en: "Search questions or topics", zh: "搜尋問題或主題", zhHans: "搜索问题或主题" })}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
        </section>

        {canPost ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">{t({ en: "Post a question", zh: "發布問題", zhHans: "发布问题" })}</h2>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm font-bold">
                {t({ en: "Title", zh: "標題", zhHans: "标题" })}
                <input className="focus-ring min-h-11 rounded-xl border border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-slate-900" value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                {t({ en: "Subject", zh: "主題", zhHans: "主题" })}
                <input className="focus-ring min-h-11 rounded-xl border border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-slate-900" value={subject} onChange={(event) => setSubject(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                {t({ en: "Explanation", zh: "說明", zhHans: "说明" })}
                <textarea className="focus-ring min-h-28 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900" value={body} onChange={(event) => setBody(event.target.value)} />
              </label>
              <button type="button" className="focus-ring min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-60" disabled={posting} onClick={submitThread}>
                {posting ? t({ en: "Posting...", zh: "發布中...", zhHans: "发布中..." }) : t({ en: "Post discussion", zh: "發布討論", zhHans: "发布讨论" })}
              </button>
            </div>
          </section>
        ) : null}

        <section id="forum-board" className="grid gap-3" aria-label={t({ en: "Discussion list", zh: "討論列表", zhHans: "讨论列表" })}>
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/[0.05]">
              {t({ en: "Loading forum...", zh: "正在載入論壇...", zhHans: "正在载入论坛..." })}
            </div>
          ) : null}
          {threads.map((thread) => (
            <article key={thread.threadId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">{text(thread.subject)}</p>
                  <h2 id="forum-thread-heading" className="mt-1 text-xl font-black text-slate-950 dark:text-white">{text(thread.title)}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-200">
                  {thread.mode === "live" ? t({ en: "Live", zh: "即時", zhHans: "即时" }) : t({ en: "Async", zh: "非同步", zhHans: "异步" })}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(thread.body)}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{thread.author.name}</span>
                <span>{localizedForumDate(thread.updatedAt, language)}</span>
                <span>{visibleReplyCount(thread)} {t({ en: "replies", zh: "回覆", zhHans: "回复" })}</span>
                <span>{thread.meTooCount} {t({ en: "me too", zh: "同問", zhHans: "同问" })}</span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
