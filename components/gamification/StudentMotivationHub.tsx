"use client";

import { useEffect, useId, useMemo, useState } from "react";
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

function MotivationHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-7 w-7 fill-none stroke-current stroke-[2.4]">
      <path d="M16 5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L16 18.3 10.8 21l1-5.8-4.2-4.1 5.8-.8L16 5z" />
      <path d="M10 25h12" />
      <path d="M13 21.5v3.5" />
      <path d="M19 21.5v3.5" />
    </svg>
  );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={cn(
        "grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cyan-100/80 text-cyan-800 transition dark:bg-white/15 dark:text-white",
        expanded ? "rotate-45" : ""
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 fill-none stroke-current stroke-[2.4]">
        <path d="M16 7v18" />
        <path d="M7 16h18" />
      </svg>
    </span>
  );
}

export function StudentMotivationHub() {
  const { currentUser, language, t, text } = useSettings();
  const expandedContentId = useId();
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
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
  const title = summary
    ? t({ en: `Level ${summary.level.current.level}`, zh: `第 ${summary.level.current.level} 級` })
    : t({ en: "Growth track", zh: "成長軌道" });
  const collapsedDetail = loadError
    ? loadError
    : isLoading
      ? t({ en: "Loading motivation data.", zh: "正在載入激勵資料。" })
      : summary
        ? t({
            en: `${numberFormat.format(summary.xp)} XP, ${summary.level.progressPercent}% progress, ${numberFormat.format(summary.rewardSummary.available)} points ready.`,
            zh: `${numberFormat.format(summary.xp)} XP，${summary.level.progressPercent}% 進度，${numberFormat.format(summary.rewardSummary.available)} 積分可用。`
          })
        : t({ en: "Open motivation hub to review growth progress, quests, and badges.", zh: "開啟學習激勵中心以查看成長進度、任務與徽章。" });

  return (
    <section aria-labelledby="motivation-hub-title" className="mt-6">
      <details className="group" onToggle={(event) => setIsExpanded(event.currentTarget.open)}>
        <summary
          aria-controls={expandedContentId}
          className="focus-ring relative min-w-0 cursor-pointer list-none overflow-hidden rounded-[2rem] border border-cyan-100/80 bg-sky-50 text-left text-slate-950 shadow-2xl shadow-cyan-900/10 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-cyan-950/20 [&::-webkit-details-marker]:hidden"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-70 dark:opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(6,182,212,0.16) 0 1px, transparent 1.6px), radial-gradient(circle, rgba(16,185,129,0.16) 0 1px, transparent 1.6px)",
              backgroundPosition: "0 0, 46px 34px",
              backgroundSize: "112px 112px, 148px 148px"
            }}
          />
          <div className="relative z-10 grid gap-4 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6">
            <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-200 via-sky-400 to-emerald-400 text-slate-950 shadow-2xl shadow-cyan-400/25">
              <span aria-hidden="true" className="absolute -inset-[14%] rounded-full border border-white/60 opacity-70 dark:border-white/25" />
              <span className="relative z-10 drop-shadow-[0_2px_10px_rgba(255,255,255,0.28)]">
                <MotivationHubIcon />
              </span>
            </span>
            <div className="min-w-0">
              <h2 id="motivation-hub-title" className="text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">
                {title}
              </h2>
              <p className={cn(
                "mt-2 max-w-3xl text-sm font-bold leading-6 sm:text-base",
                loadError ? "text-rose-700 dark:text-rose-200" : "text-slate-600 dark:text-slate-300"
              )}>
                {collapsedDetail}
              </p>
            </div>
            <span className="inline-flex h-20 w-full max-w-full items-center justify-between gap-4 rounded-[1.6rem] border border-cyan-100/80 bg-sky-50/75 px-4 py-2 text-base font-black leading-tight text-emerald-900 shadow-[0_14px_30px_rgba(14,165,233,0.08)] backdrop-blur-md transition dark:border-white/10 dark:bg-white/[0.06] dark:text-emerald-100 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_14px_30px_rgba(15,23,42,0.24)] sm:w-80 sm:text-lg">
              <span className="min-w-0 flex-1 break-words text-left leading-tight">
                {isExpanded ? t({ en: "Hide motivation hub", zh: "收起學習激勵" }) : t({ en: "Open motivation hub", zh: "開啟學習激勵" })}
              </span>
              <ExpandIcon expanded={isExpanded} />
            </span>
          </div>
        </summary>

        <div id={expandedContentId} className="mt-4">
          <div className="glass-panel overflow-hidden p-5 sm:p-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] xl:items-stretch">
              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.045]">
                <p className="text-sm font-black uppercase text-cyan-600 dark:text-cyan-300">{t({ en: "Growth progress", zh: "成長進度" })}</p>
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
              <section className="soft-panel mt-6 p-4 sm:p-5">
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
            ) : null}
          </div>
        </div>
      </details>
    </section>
  );
}
