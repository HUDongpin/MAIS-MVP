"use client";

import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { localeForLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Language, RewardCatalogItem, RewardRedemptionStatus, StudentRewardsData } from "@/types";

function readRewards(value: unknown) {
  const response = value as { rewards?: unknown } | null;
  return (response?.rewards ?? null) as StudentRewardsData | null;
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
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

function categoryLabel(category: RewardCatalogItem["category"]) {
  const labels: Record<RewardCatalogItem["category"], { en: string; zh: string }> = {
    toy: { en: "Toy", zh: "玩具" },
    stationery: { en: "Stationery", zh: "文具" },
    "learning-tool": { en: "Learning kit", zh: "學習套裝" }
  };
  return labels[category];
}

function RewardCatalogButton({
  item,
  canRedeem,
  isSubmitting,
  requestStatus,
  onRedeem
}: {
  item: RewardCatalogItem;
  canRedeem: boolean;
  isSubmitting: boolean;
  requestStatus?: RewardRedemptionStatus;
  onRedeem: (itemId: string) => void;
}) {
  const { language, t, text } = useSettings();
  let buttonLabel = t({ en: "Need more points", zh: "積分不足" });

  if (isSubmitting) {
    buttonLabel = t({ en: "Requesting", zh: "申請中" });
  } else if (requestStatus === "pending") {
    buttonLabel = t({ en: "Request submitted", zh: "已提交申請" });
  } else if (requestStatus === "approved") {
    buttonLabel = t({ en: "Request approved", zh: "申請已批核" });
  } else if (!item.available) {
    buttonLabel = t({ en: "Unavailable", zh: "暫不可兌換" });
  } else if (canRedeem) {
    buttonLabel = t({ en: "Request gift", zh: "申請兌換" });
  }

  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/75 p-5 dark:border-white/10 dark:bg-white/[0.06]">
      <div>
        <div className="flex gap-4">
          <div className={cn("grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-xs font-black text-slate-950 shadow-inner shadow-white/40", item.accent)}>
            {item.thumbnailLabel}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-lg font-black leading-6 text-slate-950 dark:text-white">{text(item.name)}</p>
              <div className="shrink-0 text-right">
                <p className="text-xl font-black text-cyan-700 dark:text-cyan-200">{formatPointValue(item.pointsCost, language)}</p>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t({ en: "points", zh: "積分" })}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex min-w-0 items-center justify-between gap-2 whitespace-nowrap">
          <span className="min-w-0 truncate rounded-full bg-slate-950/[0.06] px-2.5 py-1 text-[10px] font-black uppercase leading-none text-slate-600 dark:bg-white/[0.08] dark:text-slate-300 sm:px-3 sm:text-[11px]">
            {text(categoryLabel(item.category))}
          </span>
          <span className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase leading-none sm:px-3 sm:text-[11px]",
            item.available
              ? "bg-emerald-400/12 text-emerald-800 dark:text-emerald-100"
              : "bg-slate-400/12 text-slate-600 dark:text-slate-300"
          )}>
            {item.available ? t({ en: "Available", zh: "可兌換" }) : t({ en: "Unavailable", zh: "暫不可兌換" })}
          </span>
        </div>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{text(item.description)}</p>
      </div>
      <button
        type="button"
        disabled={!canRedeem || isSubmitting || Boolean(requestStatus)}
        aria-busy={isSubmitting}
        onClick={() => onRedeem(item.id)}
        className="focus-ring mt-5 w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 dark:bg-white dark:text-slate-950"
      >
        {buttonLabel}
      </button>
    </article>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  const { language } = useSettings();

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/55 px-4 py-3 dark:border-white/10 dark:bg-white/[0.045]">
      <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{formatPointValue(value, language)}</dd>
    </div>
  );
}

function EmptyRequestsFallback() {
  const { t } = useSettings();

  return (
    <div className="rounded-2xl border border-dashed border-slate-200/80 px-4 py-5 text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-400">
      {t({ en: "No gift requests yet.", zh: "尚未有兌換申請。" })}
    </div>
  );
}

export function StudentRewardsPanel() {
  const { currentUser, language, t, text } = useSettings();
  const [rewards, setRewards] = useState<StudentRewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingItemId, setPendingItemId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const visibleCatalog = useMemo(() => rewards?.catalog ?? [], [rewards?.catalog]);
  const activeRedemptionByItem = useMemo(() => {
    const activeRequests = new Map<string, RewardRedemptionStatus>();

    for (const request of rewards?.redemptions ?? []) {
      if (!activeRequests.has(request.item.id) && (request.status === "pending" || request.status === "approved")) {
        activeRequests.set(request.item.id, request.status);
      }
    }

    return activeRequests;
  }, [rewards?.redemptions]);
  const loadErrorCopy = t({ en: "Could not load points.", zh: "暫時無法載入積分。" });

  useEffect(() => {
    if (!currentUser || currentUser.role !== "student") {
      setRewards(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadRewards() {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await fetch("/api/rewards", { cache: "no-store", signal: controller.signal });
        const nextRewards = readRewards(await response.json());
        if (!response.ok || !nextRewards) throw new Error(loadErrorCopy);
        setRewards(nextRewards);
      } catch (error) {
        if (!controller.signal.aborted) {
          setRewards(null);
          setLoadError(error instanceof Error ? error.message : loadErrorCopy);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadRewards();

    return () => controller.abort();
  }, [currentUser?.id, currentUser?.role, loadErrorCopy]);

  if (!currentUser || currentUser.role !== "student") return null;

  const redeem = async (itemId: string) => {
    if (pendingItemId) return;

    setPendingItemId(itemId);
    setStatusMessage("");
    setLoadError("");
    try {
      const response = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId })
      });
      const payload = await response.json().catch(() => null);
      const nextRewards = readRewards(payload);
      if (nextRewards) setRewards(nextRewards);
      if (!response.ok) {
        setStatusMessage(t({ en: "Could not submit this request yet.", zh: "暫時未能提交兌換申請。" }));
        return;
      }
      setStatusMessage(t({ en: "Gift request sent to HK Teacher Chan.", zh: "兌換申請已送交 HK Teacher Chan。" }));
    } catch {
      setStatusMessage(t({ en: "Could not submit this request yet.", zh: "暫時未能提交兌換申請。" }));
    } finally {
      setPendingItemId("");
    }
  };

  const summaryStats = rewards
    ? [
        { label: t({ en: "earned", zh: "已賺取" }), value: rewards.summary.lifetimeEarned },
        { label: t({ en: "reserved", zh: "已預留" }), value: rewards.summary.reserved },
        { label: t({ en: "redeemed", zh: "已兌換" }), value: rewards.summary.spent }
      ]
    : [];

  return (
    <section aria-labelledby="student-rewards-title" className="glass-panel mt-6 overflow-hidden p-5 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-stretch">
        <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200/70 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.045]">
          <div>
            <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">{t({ en: "Points system", zh: "積分系統" })}</p>
            <h2 id="student-rewards-title" className="mt-2 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
              {t({ en: "Points balance", zh: "積分結餘" })}
            </h2>
          </div>

          {isLoading ? <p className="mt-4 text-sm font-bold text-cyan-700 dark:text-cyan-200">{t({ en: "Loading points...", zh: "正在載入積分..." })}</p> : null}
          {loadError ? <p className="mt-4 text-sm font-bold text-rose-700 dark:text-rose-200">{loadError}</p> : null}
        </div>

        <div className="rounded-2xl border border-cyan-300/50 bg-cyan-400/10 p-5 text-left shadow-inner shadow-cyan-100/40 dark:shadow-none">
          <p className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "available points", zh: "可用積分" })}</p>
          <p className="mt-3 break-words text-6xl font-black leading-none gradient-text sm:text-7xl">{formatPointValue(rewards?.summary.available ?? 0, language)}</p>
          <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
            {t({ en: "ready for teacher-approved gifts", zh: "可用於申請教師批核獎品" })}
          </p>
        </div>
      </div>

      {rewards ? (
        <>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {summaryStats.map((stat) => (
              <MetricChip key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </dl>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(18rem,0.38fr)_minmax(0,1fr)] xl:items-start">
            <section aria-labelledby="earn-more-title" className="soft-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 id="earn-more-title" className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Earn more", zh: "賺取更多積分" })}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "Ways to earn", zh: "賺分方法" })}</p>
              </div>

              <div className="mt-3 divide-y divide-slate-200/70 dark:divide-white/10">
                {rewards.earnRules.map((rule) => (
                  <div key={rule.id} className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-5 text-slate-800 dark:text-slate-100">{text(rule.label)}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{text(rule.detail)}</p>
                    </div>
                    <span className="w-fit rounded-full bg-cyan-400/12 px-3 py-1.5 text-sm font-black text-cyan-700 dark:text-cyan-200">+{formatPointValue(rule.points, language)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="reward-shop-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h3 id="reward-shop-title" className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Reward shop", zh: "獎品兌換" })}</h3>
                <p className="rounded-full bg-slate-950/[0.05] px-3 py-1.5 text-xs font-bold text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">
                  {t({ en: "Teacher approval required", zh: "需教師批核" })}
                </p>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {visibleCatalog.map((item) => {
                  const requestStatus = activeRedemptionByItem.get(item.id);

                  return (
                    <RewardCatalogButton
                      key={item.id}
                      item={item}
                      canRedeem={!requestStatus && item.available && rewards.summary.available >= item.pointsCost}
                      isSubmitting={pendingItemId === item.id}
                      requestStatus={requestStatus}
                      onRedeem={redeem}
                    />
                  );
                })}
              </div>
            </section>
          </div>

          {statusMessage ? <p className="mt-4 text-sm font-bold text-emerald-700 dark:text-emerald-200">{statusMessage}</p> : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section aria-labelledby="point-history-title" className="soft-panel p-4 sm:p-5">
              <h3 id="point-history-title" className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Recent point history", zh: "最近積分紀錄" })}</h3>
              <div className="mt-3 grid gap-2">
                {rewards.ledger.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="grid gap-2 rounded-2xl border border-slate-200/70 bg-white/45 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.035] sm:flex sm:items-center sm:justify-between sm:gap-3">
                    <span className="min-w-0 font-bold leading-5 text-slate-600 dark:text-slate-300 sm:truncate">{text(entry.label)}</span>
                    <span className={cn("w-fit shrink-0 font-black", entry.amount >= 0 ? "text-emerald-700 dark:text-emerald-200" : "text-rose-700 dark:text-rose-200")}>
                      {entry.amount >= 0 ? "+" : ""}{formatPointValue(entry.amount, language)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="gift-requests-title" className="soft-panel p-4 sm:p-5">
              <h3 id="gift-requests-title" className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Gift requests", zh: "兌換申請" })}</h3>
              <div className="mt-3 grid gap-2">
                {rewards.redemptions.length ? rewards.redemptions.slice(0, 3).map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-200/70 bg-white/45 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.035]">
                    <div className="grid gap-2 sm:flex sm:items-center sm:justify-between">
                      <span className="min-w-0 font-black text-slate-700 dark:text-slate-200">{text(request.item.name)}</span>
                      <span className={cn("w-fit max-w-full rounded-full border px-2.5 py-1 text-xs font-black", statusTone(request.status))}>{text(statusLabel(request.status))}</span>
                    </div>
                    <p className="mt-2 font-bold text-slate-500 dark:text-slate-400">{formatDate(request.requestedAt, language)} · {formatPointValue(request.pointsCost, language)} {t({ en: "points", zh: "積分" })}</p>
                  </div>
                )) : <EmptyRequestsFallback />}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
