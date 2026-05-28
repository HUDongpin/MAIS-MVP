"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentBadgeLogo } from "@/components/gamification/StudentBadgeLogo";
import { useSettings } from "@/components/providers/AppProviders";
import { localeForLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { GamificationSummary } from "@/types";

function readGamification(value: unknown) {
  const response = value as { gamification?: unknown } | null;
  return (response?.gamification ?? null) as GamificationSummary | null;
}

function progressWidth(value: number) {
  return `${Math.max(4, Math.min(100, value))}%`;
}

export function StudentMotivationHub() {
  const { currentUser, language, t, text } = useSettings();
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const numberFormat = useMemo(() => new Intl.NumberFormat(localeForLanguage(language)), [language]);
  const loadErrorCopy = t({ en: "Could not load motivation data.", zh: "暫時無法載入激勵資料。" });

  useEffect(() => {
    if (!currentUser || currentUser.role !== "student") {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadSummary() {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await fetch("/api/gamification/summary", { cache: "no-store", signal: controller.signal });
        const nextSummary = readGamification(await response.json());
        if (!response.ok || !nextSummary) throw new Error(loadErrorCopy);
        setSummary(nextSummary);
      } catch (error) {
        if (!controller.signal.aborted) {
          setSummary(null);
          setLoadError(error instanceof Error ? error.message : loadErrorCopy);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadSummary();
    return () => controller.abort();
  }, [currentUser?.id, currentUser?.role, loadErrorCopy]);

  if (!currentUser || currentUser.role !== "student") return null;

  const earnedBadges = summary?.earnedBadges.slice(0, 4) ?? [];

  return (
    <section aria-labelledby="motivation-hub-title" className="glass-panel mt-6 overflow-hidden p-5 sm:p-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] xl:items-stretch">
        <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.045]">
          <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">{t({ en: "Motivation hub", zh: "學習激勵中心" })}</p>
          <h2 id="motivation-hub-title" className="mt-2 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            {summary
              ? t({ en: `Level ${summary.level.current.level}`, zh: `第 ${summary.level.current.level} 級` })
              : t({ en: "Growth track", zh: "成長軌道" })}
          </h2>
          <p className="mt-2 text-base font-bold text-slate-600 dark:text-slate-300">
            {summary ? text(summary.level.current.title) : t({ en: "Loading growth progress", zh: "正在載入成長進度" })}
          </p>
          {isLoading ? <p className="mt-4 text-sm font-bold text-cyan-700 dark:text-cyan-200">{t({ en: "Loading motivation data...", zh: "正在載入激勵資料..." })}</p> : null}
          {loadError ? <p className="mt-4 text-sm font-bold text-rose-700 dark:text-rose-200">{loadError}</p> : null}
          {summary ? (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3 text-sm font-black text-slate-600 dark:text-slate-300">
                <span>{numberFormat.format(summary.xp)} XP</span>
                <span>{summary.level.progressPercent}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-full rounded-full bg-cyan-400" style={{ width: progressWidth(summary.level.progressPercent) }} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="soft-panel p-3">
                  <p className="text-2xl font-black text-slate-950 dark:text-white">{summary.streakDays}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "streak days", zh: "連續學習日" })}</p>
                </div>
                <div className="soft-panel p-3">
                  <p className="text-2xl font-black text-slate-950 dark:text-white">{earnedBadges.length}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "earned badges", zh: "已獲徽章" })}</p>
                </div>
                <div className="soft-panel p-3">
                  <p className="text-2xl font-black text-slate-950 dark:text-white">{numberFormat.format(summary.rewardSummary.available)}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "spendable points", zh: "可兌換積分" })}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-cyan-300/50 bg-cyan-400/10 p-5">
          <h3 className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Daily quests", zh: "每日任務" })}</h3>
          <div className="mt-4 grid gap-3">
            {(summary?.quests ?? []).map((quest) => (
              <div key={quest.quest.id} className="rounded-2xl border border-slate-200/70 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.05]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-slate-950 dark:text-white">{text(quest.quest.title)}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{quest.progress}/{quest.target} · +{quest.xpReward} XP · +{quest.rewardPointReward}</p>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black",
                    quest.completed
                      ? "bg-emerald-400/15 text-emerald-800 dark:text-emerald-100"
                      : "bg-slate-950/[0.06] text-slate-600 dark:bg-white/[0.08] dark:text-slate-300"
                  )}>
                    {quest.completed ? t({ en: "Done", zh: "完成" }) : t({ en: "Open", zh: "進行中" })}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: progressWidth((quest.progress / quest.target) * 100) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {summary ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
          <section className="soft-panel p-4 sm:p-5">
            <h3 className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Badges", zh: "成就徽章" })}</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {summary.badges.slice(0, 6).map((badge) => (
                <div key={badge.id} className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-4 py-3",
                  badge.earned
                    ? "border-emerald-300/60 bg-emerald-400/10 shadow-sm shadow-emerald-500/10"
                    : "border-slate-200/70 bg-white/45 dark:border-white/10 dark:bg-white/[0.035]"
                )}>
                  <StudentBadgeLogo badgeId={badge.id} earned={badge.earned} />
                  <div className="min-w-0">
                    <p className="font-black text-slate-950 dark:text-white">{text(badge.name)}</p>
                    <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500 dark:text-slate-400">{badge.progress}/{badge.criteria.target} · {text(badge.description)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="soft-panel p-4 sm:p-5">
            <h3 className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Class leaderboard", zh: "班級排行榜" })}</h3>
            <div className="mt-3 grid gap-2">
              {summary.leaderboard.map((entry) => (
                <div key={entry.studentId} className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-2 text-sm",
                  entry.isCurrentStudent ? "bg-cyan-400/15" : "bg-white/45 dark:bg-white/[0.035]"
                )}>
                  <span className="font-black text-cyan-700 dark:text-cyan-200">#{entry.rank}</span>
                  <span className="truncate font-black text-slate-700 dark:text-slate-200">{entry.studentName}</span>
                  <span className="font-black text-slate-500 dark:text-slate-400">{numberFormat.format(entry.weeklyXp)} XP</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
