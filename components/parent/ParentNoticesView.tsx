"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { formatDateInHongKong } from "@/lib/utils";
import type { Language, ParentNoticeData, TeacherNoticeRecipient } from "@/types";

type NoticeFilter = "all" | "pending" | "acknowledged";

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return "-";
  return formatDateInHongKong(value, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function preferredRecipient(recipients: TeacherNoticeRecipient[], targetRecipientId?: string | null) {
  return (
    (targetRecipientId ? recipients.find((recipient) => recipient.id === targetRecipientId) : null) ??
    recipients.find((recipient) => recipient.status === "pending") ??
    recipients[0] ??
    null
  );
}

function recipientMatchesFilter(recipient: TeacherNoticeRecipient | null, filter: NoticeFilter) {
  if (filter === "all") return true;
  return recipient?.status === filter;
}

export function ParentNoticesView({ data, targetRecipientId }: { data: ParentNoticeData; targetRecipientId?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t, text } = useSettings();
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<NoticeFilter>("all");
  const [acknowledgingId, setAcknowledgingId] = useState("");
  const regularNotices = data.notices.filter((notice) => notice.source?.kind !== "teacher-review-lesson");
  const targetRecipient = targetRecipientId
    ? data.notices.flatMap((notice) => notice.recipients).find((recipient) => recipient.id === targetRecipientId) ?? null
    : null;
  const selectedStudentId = targetRecipient?.studentId ?? searchParams.get("studentId");
  const allRecipients = data.notices.flatMap((notice) => notice.recipients);
  const pendingCount = allRecipients.filter((recipient) => recipient.status === "pending").length;
  const acknowledgedCount = allRecipients.filter((recipient) => recipient.status === "acknowledged").length;
  const draftCards = data.parentSafeDrafts
    .map((draft) => {
      const notice = data.notices.find((item) => item.id === draft.noticeId);
      return {
        draft,
        notice,
        recipient: preferredRecipient(notice?.recipients ?? [], targetRecipientId)
      };
    })
    .filter((item) => recipientMatchesFilter(item.recipient, filter));
  const visibleRegularNotices = regularNotices.filter((notice) => {
    const recipient = preferredRecipient(notice.recipients, targetRecipientId);
    return recipientMatchesFilter(recipient, filter);
  });

  useEffect(() => {
    if (!targetRecipient || searchParams.get("studentId") === targetRecipient.studentId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentId", targetRecipient.studentId);
    params.set("recipientId", targetRecipient.id);
    router.replace(`/parent/notices?${params.toString()}`, { scroll: false });
  }, [router, searchParams, targetRecipient?.id, targetRecipient?.studentId]);

  async function acknowledge(recipientId: string) {
    setAcknowledgingId(recipientId);
    const response = await fetch(`/api/parent/notices/${encodeURIComponent(recipientId)}/ack`, { method: "POST" });
    setMessage(response.ok ? t({ en: "Receipt confirmed.", zh: "已確認回執。" }) : t({ en: "Could not confirm receipt.", zh: "暫時未能確認回執。" }));
    setAcknowledgingId("");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Notices", zh: "通知回執" })}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Confirm school notices", zh: "確認學校通知" })}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t({ en: "Teacher notices sent through class channels appear here for MAIS-side acknowledgement.", zh: "教師透過班級渠道發出的通知會在此顯示，回執以 MAIS 確認為準。" })}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: t({ en: "Pending receipts", zh: "待確認回執" }), value: pendingCount },
            { label: t({ en: "Acknowledged", zh: "已確認" }), value: acknowledgedCount },
            { label: t({ en: "Visible notices", zh: "可見通知" }), value: data.notices.length }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/parent/notices" className={`focus-ring rounded-full border px-4 py-2 text-sm font-black ${!selectedStudentId ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"}`}>
            {t({ en: "All children", zh: "全部孩子" })}
          </Link>
          {data.children.map((child) => {
            const params = new URLSearchParams({ studentId: child.student.id });
            const active = selectedStudentId === child.student.id;
            return (
              <Link key={child.student.id} href={`/parent/notices?${params.toString()}`} className={`focus-ring rounded-full border px-4 py-2 text-sm font-black ${active ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"}`}>
                {child.student.name}
              </Link>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t({ en: "Notice receipt filter", zh: "通知回執篩選" })}>
          {[
            { id: "all" as const, label: t({ en: "All", zh: "全部" }) },
            { id: "pending" as const, label: t({ en: "Pending", zh: "待確認" }) },
            { id: "acknowledged" as const, label: t({ en: "Acknowledged", zh: "已確認" }) }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`focus-ring rounded-full border px-4 py-2 text-sm font-black ${filter === item.id ? "border-cyan-500 bg-cyan-400/15 text-cyan-800 dark:text-cyan-100" : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {message ? <p className="mt-4 rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-800 dark:text-cyan-100">{message}</p> : null}
      </section>

      {draftCards.length ? (
        <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-200">{t({ en: "Teacher-approved drafts", zh: "教師已審核草稿" })}</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Parent-safe review updates", zh: "家長安全講評更新" })}</h2>
            </div>
          </div>
          {draftCards.map(({ draft, recipient }) => (
            (() => {
              const pending = recipient?.status === "pending";
              return (
                <article key={draft.id} className="glass-panel p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xl font-black text-slate-950 dark:text-white">{text(draft.title)}</p>
                      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{draft.className} · {formatDate(draft.publishedAt, language)}</p>
                    </div>
                    <span className="rounded-full border border-emerald-300/60 bg-emerald-400/12 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-800 dark:text-emerald-100">
                      {t({ en: "Teacher approved", zh: "教師已審核" })}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{text(draft.summary)}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <p className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                      {t({ en: "Teacher", zh: "教師" })}: {draft.teacherName}
                    </p>
                    <p className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                      {t({ en: "Pending", zh: "待確認" })}: {draft.acknowledgement.pending}
                    </p>
                    <p className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                      {t({ en: "Confirmed", zh: "已確認" })}: {draft.acknowledgement.acknowledged}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      {recipient ? `${recipient.studentName} · ${formatDate(recipient.acknowledgedAt, language)}` : t({ en: "No recipient record", zh: "沒有回執記錄" })}
                    </p>
                    {recipient && pending ? (
                      <button
                        type="button"
                        onClick={() => acknowledge(recipient.id)}
                        disabled={acknowledgingId === recipient.id}
                        className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
                      >
                        {acknowledgingId === recipient.id ? t({ en: "Confirming...", zh: "確認中..." }) : t({ en: "Confirm receipt", zh: "確認回執" })}
                      </button>
                    ) : recipient ? (
                      <span className="rounded-full border border-emerald-300/60 bg-emerald-400/12 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-800 dark:text-emerald-100">
                        {t({ en: "Acknowledged", zh: "已確認" })}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })()
          ))}
        </section>
      ) : null}

      <section className="grid gap-4">
        {visibleRegularNotices.map((notice) => {
          const recipient = preferredRecipient(notice.recipients, targetRecipientId);
          const pending = recipient?.status === "pending";
          return (
            <article key={notice.id} className="glass-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-black text-slate-950 dark:text-white">{text(notice.subject)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{notice.className} · {formatDate(notice.sentAt, language)}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${pending ? "border-amber-300/60 bg-amber-400/12 text-amber-800 dark:text-amber-100" : "border-emerald-300/60 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100"}`}>
                  {pending ? t({ en: "Pending", zh: "待確認" }) : t({ en: "Acknowledged", zh: "已確認" })}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(notice.body)}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <p className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                  {t({ en: "Channel", zh: "渠道" })}: {notice.channelName}
                </p>
                <p className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                  {t({ en: "Due", zh: "截止" })}: {formatDate(notice.dueAt, language)}
                </p>
                <p className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                  {t({ en: "Receipts", zh: "回執" })}: {notice.acknowledgement.acknowledged}/{notice.acknowledgement.total}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {recipient ? `${recipient.studentName} · ${formatDate(recipient.acknowledgedAt, language)}` : t({ en: "No recipient record", zh: "沒有回執記錄" })}
                </p>
                {recipient && pending ? (
                  <button
                    type="button"
                    onClick={() => acknowledge(recipient.id)}
                    disabled={acknowledgingId === recipient.id}
                    className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
                  >
                    {acknowledgingId === recipient.id ? t({ en: "Confirming...", zh: "確認中..." }) : t({ en: "Confirm receipt", zh: "確認回執" })}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        {!visibleRegularNotices.length && !draftCards.length ? (
          <section className="glass-panel p-6 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
            {t({ en: "No school notices need confirmation right now.", zh: "目前沒有需要確認的學校通知。" })}
          </section>
        ) : null}
      </section>
    </div>
  );
}
