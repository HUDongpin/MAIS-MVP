"use client";

import { useSettings } from "@/components/providers/AppProviders";
import type { GamificationSummary } from "@/types";

export function ParentMotivationSummary({ summary }: { summary: GamificationSummary | null }) {
  const { t, text } = useSettings();

  if (!summary) return null;

  const nextQuest = summary.quests.find((quest) => !quest.completed) ?? summary.quests[0];
  const latestBadge = summary.earnedBadges[0];

  return (
    <section className="glass-panel p-5">
      <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Motivation report", zh: "激勵報告" })}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="soft-panel p-3">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{summary.level.current.level}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{text(summary.level.current.title)}</p>
        </div>
        <div className="soft-panel p-3">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{summary.streakDays}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "streak days", zh: "連續學習日" })}</p>
        </div>
        <div className="soft-panel p-3">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{summary.rewardSummary.available}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "spendable points", zh: "可兌換積分" })}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-100">
          {latestBadge
            ? t({ en: `Celebrate the ${latestBadge.name.en} badge tonight.`, zh: `今晚可鼓勵「${latestBadge.name.zh}」徽章。` })
            : text(summary.motivation.celebrate[0])}
        </div>
        <div className="rounded-2xl bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-100">
          {nextQuest
            ? t({ en: `A calm next step is ${nextQuest.quest.title.en}.`, zh: `溫和下一步：${nextQuest.quest.title.zh}。` })
            : text(summary.motivation.support[0])}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {t({
          en: "Growth XP stays with the child even when reward points are redeemed.",
          zh: "成長 XP 會一直保留，兌換獎品只扣可兌換積分。"
        })}
      </p>
    </section>
  );
}
