"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { TeacherGamificationPanel } from "@/components/gamification/TeacherGamificationPanel";
import { useSettings } from "@/components/providers/AppProviders";
import { TeacherReportsBackToTopButton } from "@/components/teacher/TeacherReportsBackToTopButton";
import { formatGradeLabel, localeForLanguage, textForLanguage } from "@/lib/i18n";
import { cn, formatDateInHongKong } from "@/lib/utils";
import type { Language, RewardRedemptionRequest, RewardRedemptionStatus, TeacherRewardsData } from "@/types";

function readTeacherRewards(value: unknown) {
  const response = value as { rewards?: unknown } | null;
  return (response?.rewards ?? null) as TeacherRewardsData | null;
}

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return textForLanguage({ en: "No record", zh: "未有紀錄" }, language);
  return formatDateInHongKong(value, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPointValue(value: number, language: Language) {
  return new Intl.NumberFormat(localeForLanguage(language)).format(value);
}

function statusLabel(status: RewardRedemptionStatus) {
  const labels: Record<RewardRedemptionStatus, { en: string; zh: string }> = {
    pending: { en: "Pending approval", zh: "等待批核" },
    approved: { en: "Approved", zh: "已批核" },
    rejected: { en: "Rejected", zh: "已拒絕" },
    fulfilled: { en: "Fulfilled", zh: "已派發" }
  };
  return labels[status];
}

function statusTone(status: RewardRedemptionStatus) {
  if (status === "fulfilled") return "border-emerald-300/60 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100";
  if (status === "approved") return "border-cyan-300/60 bg-cyan-400/12 text-cyan-800 dark:text-cyan-100";
  if (status === "rejected") return "border-slate-300/70 bg-slate-400/12 text-slate-700 dark:text-slate-200";
  return "border-amber-300/60 bg-amber-400/12 text-amber-800 dark:text-amber-100";
}

type RewardOperation =
  | {
      type: "award";
      studentId: string;
      studentName: string;
      amount: number;
      label: string;
    }
  | {
      type: "redemption";
      requestId: string;
      studentId: string;
      studentName: string;
      itemName: string;
      status: RewardRedemptionStatus;
    };

function RedemptionActions({
  request,
  isBusy,
  onUpdate
}: {
  request: RewardRedemptionRequest;
  isBusy: boolean;
  onUpdate: (requestId: string, status: RewardRedemptionStatus) => void;
}) {
  const { t } = useSettings();

  if (request.status === "fulfilled" || request.status === "rejected") {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {request.status === "pending" ? (
        <>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onUpdate(request.id, "approved")}
            className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
          >
            {t({ en: "Approve request", zh: "批核申請" })}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onUpdate(request.id, "rejected")}
            className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
          >
            {t({ en: "Reject", zh: "拒絕" })}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onUpdate(request.id, "fulfilled")}
          className="focus-ring rounded-full bg-emerald-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          {t({ en: "Mark fulfilled", zh: "標記已派發" })}
        </button>
      )}
    </div>
  );
}

function RewardOperationPanel({ operation }: { operation: RewardOperation }) {
  const { language, t, text } = useSettings();
  const isAward = operation.type === "award";

  return (
    <section aria-live="polite" className="glass-panel min-w-0 border-emerald-300/45 bg-emerald-400/10 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">
            {isAward ? t({ en: "Reward recorded", zh: "獎勵已記錄" }) : t({ en: "Redemption updated", zh: "兌換已更新" })}
          </p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-white">
            {isAward
              ? `${operation.studentName} · +${formatPointValue(operation.amount, language)} ${t({ en: "points", zh: "積分" })}`
              : `${operation.studentName} · ${operation.itemName}`}
          </p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
            {isAward ? operation.label : text(statusLabel(operation.status))}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          {isAward ? (
            <>
              <a href={`#student-balance-${operation.studentId}`} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                {t({ en: "Open balance", zh: "查看結餘" })}
              </a>
              <a href="#recent-point-activity" className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
                {t({ en: "Open activity", zh: "查看流水" })}
              </a>
            </>
          ) : (
            <a href={`#redemption-${operation.requestId}`} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
              {t({ en: "Open request", zh: "查看申請" })}
            </a>
          )}
          <Link href={`/teacher/students/${operation.studentId}`} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {t({ en: "Student profile", zh: "學生檔案" })}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function TeacherRewardsView({ rewards }: { rewards: TeacherRewardsData }) {
  const { language, text, t } = useSettings();
  const [data, setData] = useState(rewards);
  const [selectedStudentId, setSelectedStudentId] = useState(rewards.students[0]?.studentId ?? "");
  const [reasonPresetId, setReasonPresetId] = useState(rewards.reasonPresets[0]?.id ?? "great-effort");
  const [amount, setAmount] = useState(String(rewards.reasonPresets[0]?.points ?? 20));
  const [message, setMessage] = useState("");
  const [lastOperation, setLastOperation] = useState<RewardOperation | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState("");
  const selectedPreset = useMemo(
    () => data.reasonPresets.find((preset) => preset.id === reasonPresetId) ?? data.reasonPresets[0],
    [data.reasonPresets, reasonPresetId]
  );
  const catalogPointCostByItemId = useMemo(
    () => new Map(data.catalog.map((item) => [item.id, item.pointsCost])),
    [data.catalog]
  );
  const activeRedemptions = data.redemptions.filter((request) => request.status === "pending" || request.status === "approved");

  const updateData = (nextRewards: TeacherRewardsData | null, successMessage: string) => {
    if (nextRewards) {
      setData(nextRewards);
      if (!nextRewards.students.some((student) => student.studentId === selectedStudentId)) {
        setSelectedStudentId(nextRewards.students[0]?.studentId ?? "");
      }
    }
    setMessage(successMessage);
  };

  const handleAward = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStudentId) return;

    const formElement = event.currentTarget;
    setIsAwarding(true);
    setMessage("");
    setLastOperation(null);
    const form = new FormData(formElement);
    const response = await fetch("/api/teacher/reward-awards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selectedStudentId,
        reasonPresetId,
        amount: Number(amount),
        note: form.get("note")
      })
    });
    const payload = await response.json().catch(() => null);
    setIsAwarding(false);
    if (!response.ok) {
      setMessage(t({ en: "Could not award points yet.", zh: "暫時未能加積分。" }));
      return;
    }
    const nextRewards = readTeacherRewards(payload);
    const awardedStudent = nextRewards?.students.find((student) => student.studentId === selectedStudentId)
      ?? data.students.find((student) => student.studentId === selectedStudentId);
    const awardedAmount = Number(amount);
    setLastOperation({
      type: "award",
      studentId: selectedStudentId,
      studentName: awardedStudent?.studentName ?? selectedStudentId,
      amount: Number.isFinite(awardedAmount) ? awardedAmount : 0,
      label: selectedPreset ? text(selectedPreset.label) : t({ en: "Positive engagement bonus", zh: "正向參與獎勵" })
    });
    formElement.reset();
    updateData(nextRewards, t({ en: "Points awarded.", zh: "已加積分。" }));
  };

  const updateRedemption = async (requestId: string, status: RewardRedemptionStatus) => {
    setBusyRequestId(requestId);
    setMessage("");
    setLastOperation(null);
    const response = await fetch(`/api/teacher/rewards/redemptions/${encodeURIComponent(requestId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const payload = await response.json().catch(() => null);
    setBusyRequestId("");
    if (!response.ok) {
      setMessage(t({ en: "Could not update the gift request yet.", zh: "暫時未能更新兌換申請。" }));
      return;
    }
    const success = status === "fulfilled"
      ? t({ en: "Gift marked fulfilled.", zh: "已標記獎品派發。" })
      : status === "approved"
        ? t({ en: "Gift request approved.", zh: "已批核兌換申請。" })
        : t({ en: "Gift request rejected.", zh: "已拒絕兌換申請。" });
    const nextRewards = readTeacherRewards(payload);
    const updatedRequest = nextRewards?.redemptions.find((request) => request.id === requestId)
      ?? data.redemptions.find((request) => request.id === requestId);
    if (updatedRequest) {
      setLastOperation({
        type: "redemption",
        requestId,
        studentId: updatedRequest.studentId,
        studentName: updatedRequest.studentName,
        itemName: text(updatedRequest.item.name),
        status
      });
    }
    updateData(nextRewards, success);
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Points system", zh: "積分系統" })}</p>
        <div className="mt-3 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">{t({ en: "Rewards and gift redemptions", zh: "積分獎勵與獎品兌換" })}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t({
                en: "Award positive learning behavior, review physical gift requests, and keep fulfillment visible.",
                zh: "獎勵正向學習行為，批核實體獎品兌換，並清楚追蹤派發狀態。"
              })}
            </p>
          </div>
          <p className="rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300">
            {t({ en: "Updated", zh: "更新" })} {formatDate(data.generatedAt, language)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: t({ en: "Students", zh: "學生" }), value: data.totals.students, detail: t({ en: "with reward balances", zh: "已有積分帳戶" }) },
          { label: t({ en: "Available points", zh: "可用積分" }), value: data.totals.availablePoints, detail: t({ en: "across enrolled students", zh: "班內學生合計" }) },
          { label: t({ en: "Pending approval", zh: "等待批核" }), value: data.totals.pendingRedemptions, detail: t({ en: "gift requests", zh: "兌換申請" }) },
          { label: t({ en: "Approved", zh: "已批核" }), value: data.totals.approvedRedemptions, detail: t({ en: "awaiting handover", zh: "等待派發" }) },
          { label: t({ en: "Awarded this week", zh: "本週加分" }), value: data.totals.pointsAwardedThisWeek, detail: t({ en: "positive engagement points", zh: "正向學習積分" }) }
        ].map((item) => (
          <div key={item.label} className="glass-panel p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-black gradient-text">{formatPointValue(item.value, language)}</p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.detail}</p>
          </div>
        ))}
      </section>

      {data.students.length ? <TeacherGamificationPanel /> : null}

      {lastOperation ? <RewardOperationPanel operation={lastOperation} /> : null}

      <section className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="grid gap-6">
          <form onSubmit={handleAward} className="glass-panel p-5">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">{t({ en: "Award points", zh: "加積分" })}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Positive engagement bonus", zh: "正向參與獎勵" })}</h2>
            <label className="mt-5 grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Student", zh: "學生" })}</span>
              <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className="focus-ring h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]">
                {data.students.map((student) => (
                  <option key={student.studentId} value={student.studentId}>{student.studentName}</option>
                ))}
              </select>
            </label>
            <label className="mt-4 grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Reason", zh: "原因" })}</span>
              <select
                value={reasonPresetId}
                onChange={(event) => {
                  const preset = data.reasonPresets.find((candidate) => candidate.id === event.target.value);
                  setReasonPresetId(event.target.value);
                  if (preset) setAmount(String(preset.points));
                }}
                className="focus-ring h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]"
              >
                {data.reasonPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{text(preset.label)}</option>
                ))}
              </select>
            </label>
            {selectedPreset ? <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{text(selectedPreset.detail)}</p> : null}
            <label className="mt-4 grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Points", zh: "積分" })}</span>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} min={1} max={500} type="number" className="focus-ring h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
            </label>
            <label className="mt-4 grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Note", zh: "備註" })}</span>
              <input name="note" placeholder={t({ en: "Optional teacher note", zh: "可選教師備註" })} className="focus-ring h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
            </label>
            <button disabled={isAwarding || !selectedStudentId} className="focus-ring mt-5 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950" type="submit">
              {isAwarding ? t({ en: "Awarding", zh: "加分中" }) : t({ en: "Award points", zh: "加積分" })}
            </button>
            {message ? <p className="mt-3 text-sm font-bold text-emerald-700 dark:text-emerald-200">{message}</p> : null}
          </form>

          <div className="glass-panel p-5">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">{t({ en: "Reward catalog", zh: "獎品目錄" })}</p>
            <div className="mt-4 grid gap-3">
              {data.catalog.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-[11px] font-black text-slate-950 shadow-inner shadow-white/40", item.accent)}>{item.thumbnailLabel}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950 dark:text-white">{text(item.name)}</p>
                    <p className="text-xs font-bold text-cyan-700 dark:text-cyan-200">{formatPointValue(item.pointsCost, language)} {t({ en: "points", zh: "積分" })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="grid gap-6">
          <section className="glass-panel p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">{t({ en: "Redemption queue", zh: "兌換隊列" })}</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Physical gift handover", zh: "實體獎品派發" })}</h2>
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{activeRedemptions.length} {t({ en: "active", zh: "進行中" })}</p>
            </div>
            <div className="mt-5 grid gap-3">
              {data.redemptions.slice(0, 8).map((request) => (
                <article key={request.id} id={`redemption-${request.id}`} className="soft-panel scroll-mt-24 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-slate-950 dark:text-white">{request.studentName}</p>
                      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                        {text(request.item.name)} · {formatPointValue(catalogPointCostByItemId.get(request.item.id) ?? request.pointsCost, language)} {t({ en: "points", zh: "積分" })}
                      </p>
                    </div>
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em]", statusTone(request.status))}>{text(statusLabel(request.status))}</span>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t({ en: "Requested", zh: "申請" })} {formatDate(request.requestedAt, language)}
                    {request.fulfilledAt ? ` · ${t({ en: "Fulfilled", zh: "已派發" })} ${formatDate(request.fulfilledAt, language)}` : ""}
                  </p>
                  <RedemptionActions request={request} isBusy={busyRequestId === request.id} onUpdate={updateRedemption} />
                </article>
              ))}
              {!data.redemptions.length ? (
                <div className="soft-panel p-6 text-center text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No gift requests yet.", zh: "尚未有兌換申請。" })}</div>
              ) : null}
            </div>
          </section>

          <section className="glass-panel overflow-hidden p-5">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Student balances", zh: "學生積分結餘" })}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3 pr-4">{t({ en: "Student", zh: "學生" })}</th>
                    <th className="py-3 pr-4">{t({ en: "Class", zh: "班級" })}</th>
                    <th className="py-3 pr-4">{t({ en: "Available", zh: "可用" })}</th>
                    <th className="py-3 pr-4">{t({ en: "Reserved", zh: "已預留" })}</th>
                    <th className="py-3">{t({ en: "Earned", zh: "已賺取" })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
                  {data.students.map((student) => (
                    <tr key={student.studentId} id={`student-balance-${student.studentId}`} className="scroll-mt-24">
                      <td className="py-4 pr-4">
                        <Link href={`/teacher/students/${student.studentId}`} className="font-black text-cyan-700 dark:text-cyan-200">{student.studentName}</Link>
                        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{formatGradeLabel(student.grade, language, true)}</p>
                      </td>
                      <td className="py-4 pr-4 font-semibold">{student.classNames.join(", ")}</td>
                      <td className="py-4 pr-4 text-lg font-black gradient-text">{formatPointValue(student.summary.available, language)}</td>
                      <td className="py-4 pr-4 font-black">{formatPointValue(student.summary.reserved, language)}</td>
                      <td className="py-4 font-black">{formatPointValue(student.summary.lifetimeEarned, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="recent-point-activity" className="glass-panel scroll-mt-24 p-5">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Recent point activity", zh: "最近積分活動" })}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.recentLedger.map((entry) => (
                <div key={entry.id} className="soft-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950 dark:text-white">{entry.studentName}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(entry.label)}</p>
                    </div>
                    <p className={cn("text-2xl font-black", entry.amount >= 0 ? "text-emerald-700 dark:text-emerald-200" : "text-rose-700 dark:text-rose-200")}>
                      {entry.amount >= 0 ? "+" : ""}{formatPointValue(entry.amount, language)}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{formatDate(entry.createdAt, language)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
      <TeacherReportsBackToTopButton />
    </div>
  );
}
