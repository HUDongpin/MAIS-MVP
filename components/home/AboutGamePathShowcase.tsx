"use client";

import Link from "next/link";
import { useSettings } from "@/components/providers/AppProviders";
import { studentPracticeGameHrefs } from "@/lib/gameBasedLearning";

type GameWelcomePreviewCopy = {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
};

function AdventureCoinPreviewIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 drop-shadow-sm">
      <circle cx="16" cy="16" r="13" fill="#facc15" />
      <circle cx="13" cy="12" r="8" fill="#fff7ad" opacity="0.42" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#f59e0b" strokeWidth="3" />
      <path d="M11 10.5c1.4-1.5 7.8-2.1 10.2 1" fill="none" stroke="#fff7ed" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

function AdventureHammerPreviewIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 drop-shadow-sm">
      <path d="M6.5 27.5 20 14" stroke="#92400e" strokeLinecap="round" strokeWidth="5" />
      <path d="M15 9.2 21.2 3 29 10.8 22.8 17 15 9.2Z" fill="#475569" />
      <path d="M18.2 8.5 23.5 13.8" fill="none" stroke="#e2e8f0" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M6.5 27.5 12.2 21.8" stroke="#fbbf24" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function AdventureEnemyPreviewIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 drop-shadow-sm">
      <path d="M6 21c0-6.2 4.5-11 10-11s10 4.8 10 11v3H6v-3Z" fill="#ef4444" />
      <path d="M7.4 20.2C9.8 15.4 17 12.8 25 19" fill="none" stroke="#fecaca" strokeLinecap="round" strokeWidth="3" />
      <circle cx="12" cy="21" r="2" fill="#0f172a" />
      <circle cx="20" cy="21" r="2" fill="#0f172a" />
      <path d="M10 25h12" stroke="#f8fafc" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

function AdventureWelcomePreview({
  eyebrow,
  title,
  description,
  objective,
  buttonLabel
}: GameWelcomePreviewCopy & { objective: string }) {
  return (
    <div
      aria-hidden="true"
      className="relative h-full overflow-hidden bg-[linear-gradient(180deg,#7dd3fc_0%,#34d399_48%,#14532d_100%)] text-center"
    >
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-[linear-gradient(180deg,rgba(20,83,45,0)_0%,rgba(20,83,45,0.9)_100%)]" />
      <div className="absolute left-0 top-0 h-full w-[34%] bg-[linear-gradient(90deg,rgba(69,26,3,0.5)_0%,rgba(21,128,61,0.3)_44%,rgba(21,128,61,0)_100%)]" />
      <div className="absolute left-[4%] top-[8%] h-[76%] w-8 rounded-full bg-amber-950/70 shadow-[28px_12px_0_rgba(69,26,3,0.42),54px_-8px_0_rgba(69,26,3,0.28)]" />
      <div className="absolute left-[2%] top-[2%] h-28 w-44 rounded-b-full bg-emerald-800/70 blur-[1px]" />
      <div className="absolute left-[18%] top-[14%] h-20 w-36 rounded-b-full bg-lime-700/55 blur-[1px]" />
      <div className="absolute right-[8%] top-[10%] h-16 w-28 rounded-b-full bg-cyan-100/30" />
      <div className="absolute bottom-[9%] right-[8%] h-12 w-48 rounded-lg border border-amber-300/50 bg-amber-800/75 shadow-[0_8px_0_rgba(69,26,3,0.45)]" />
      <div className="absolute bottom-[20%] right-[21%] h-10 w-40 rounded-lg border border-amber-300/45 bg-amber-700/75 shadow-[0_8px_0_rgba(69,26,3,0.36)]" />
      <div className="absolute bottom-[12%] left-[10%] grid h-12 w-12 place-items-center rounded-full border border-yellow-100/80 bg-yellow-300 shadow-[0_6px_0_rgba(146,64,14,0.6)]">
        <AdventureCoinPreviewIcon />
      </div>
      <div className="absolute bottom-[27%] left-[13%] grid h-12 w-12 place-items-center rounded-full border border-yellow-100/70 bg-yellow-300 shadow-[0_6px_0_rgba(146,64,14,0.5)]">
        <AdventureCoinPreviewIcon />
      </div>
      <div className="absolute bottom-[10%] right-[24%] grid h-14 w-14 rotate-[-8deg] place-items-center rounded-2xl border border-slate-100/70 bg-white/80 shadow-lg">
        <AdventureHammerPreviewIcon />
      </div>
      <div className="absolute bottom-[9%] right-[11%] grid h-14 w-16 place-items-center rounded-t-full border border-rose-200/70 bg-rose-500/85 shadow-[0_6px_0_rgba(127,29,29,0.4)]">
        <AdventureEnemyPreviewIcon />
      </div>
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 py-3 text-white">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-emerald-50/95 sm:text-xs">{eyebrow}</p>
        <p className="mt-1.5 text-2xl font-black leading-none drop-shadow sm:text-3xl">{title}</p>
        <p className="mt-2 hidden max-w-[17rem] text-[0.68rem] font-bold leading-4 text-emerald-50/95 sm:block sm:text-xs sm:leading-5">
          {description}
        </p>
        <p className="mt-2 hidden max-w-[16rem] border-l-4 border-yellow-200 pl-2 text-left text-[0.66rem] font-black leading-4 drop-shadow sm:block sm:text-xs sm:leading-5">
          {objective}
        </p>
        <span className="mt-3 rounded-full border border-yellow-200 bg-gradient-to-b from-yellow-200 to-amber-500 px-7 py-2 text-sm font-black text-sky-950 shadow-[0_7px_0_rgba(120,53,15,0.55)]">
          {buttonLabel}
        </span>
      </div>
    </div>
  );
}

function FishingWelcomePreview({ eyebrow, title, description, buttonLabel }: GameWelcomePreviewCopy) {
  return (
    <div
      aria-hidden="true"
      className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(125,211,252,0.48),transparent_34%),linear-gradient(180deg,#0ea5e9_0%,#075985_58%,#083344_100%)] text-center"
    >
      <div className="absolute left-[8%] top-[12%] h-14 w-14 rounded-full border border-white/30 bg-white/15" />
      <div className="absolute right-[12%] top-[18%] h-9 w-9 rounded-full border border-white/25 bg-white/10" />
      <div className="absolute bottom-[9%] left-[10%] h-20 w-32 rounded-t-full bg-cyan-950/40" />
      <div className="absolute bottom-[8%] right-[8%] h-28 w-44 rounded-t-full bg-purple-950/35" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 py-3 text-white">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-cyan-50/90 sm:text-xs">{eyebrow}</p>
        <p className="mt-1.5 text-2xl font-black leading-none drop-shadow sm:text-3xl">{title}</p>
        <p className="mt-3 hidden max-w-[17rem] text-[0.68rem] font-bold leading-4 text-cyan-50/90 sm:block sm:text-xs sm:leading-5">
          {description}
        </p>
        <span className="mt-4 rounded-full border border-yellow-200 bg-gradient-to-b from-yellow-200 to-amber-500 px-7 py-2 text-sm font-black text-sky-950 shadow-[0_7px_0_rgba(120,53,15,0.55)] sm:mt-5">
          {buttonLabel}
        </span>
      </div>
    </div>
  );
}

export function AboutGamePathShowcase() {
  const { t } = useSettings();

  return (
    <section id="about-game-path" className="page-container pb-16 pt-2 sm:pb-20" aria-labelledby="about-game-path-title">
      <div className="overflow-hidden rounded-2xl border border-emerald-300/45 bg-gradient-to-r from-emerald-400/12 via-sky-400/12 to-amber-300/15 p-4 shadow-sm shadow-emerald-500/10 dark:border-emerald-200/20 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
              {t({ en: "Game path", zh: "遊戲路線", zhHans: "游戏路线" })}
            </p>
            <h2 id="about-game-path-title" className="mt-2 text-xl font-black leading-tight text-slate-950 dark:text-white sm:text-2xl">
              {t({
                en: "Win the round, then enter the topic game challenge.",
                zh: "完成達標回合，即可進入本課題遊戲挑戰。",
                zhHans: "完成达标回合，即可进入本课题游戏挑战。"
              })}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
              {t({
                en: "Use one topic for all 5 questions. Reach 80%+ to open Adventure Island; after clearing it, another qualifying round unlocks Fishing Master.",
                zh: "5 題需屬於同一課題。達到 80%+ 先開啟探险岛；通關後再完成一次達標回合，即可解鎖捕魚達人。",
                zhHans: "5 题需属于同一课题。达到 80%+ 先开启探险岛；通关后再完成一次达标回合，即可解锁捕鱼达人。"
              })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.08]">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-200">80%</span>
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
              {t({ en: "Same-topic target", zh: "同課題目標", zhHans: "同课题目标" })}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
          <article className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.07]">
            <div className="relative aspect-[16/9] overflow-hidden bg-emerald-100 dark:bg-emerald-950/35">
              <AdventureWelcomePreview
                eyebrow={t({ en: "Adventure Island", zh: "探险岛", zhHans: "探险岛" })}
                title={t({ en: "Adventure Island", zh: "探险岛", zhHans: "探险岛" })}
                description={t({
                  en: "Jump across storybook steps, collect coins and hammers, and solve math battles to defeat monsters before reaching the trophy.",
                  zh: "在故事書般的台階上跳躍，收集金幣和錘子，回答數學挑戰擊敗怪物，最後抵達獎盃。",
                  zhHans: "在故事书般的台阶上跳跃，收集金币和锤子，回答数学挑战击败怪物，最后抵达奖杯。"
                })}
                objective={t({
                  en: "Defeat 3 monsters to clear the island.",
                  zh: "擊敗 3 隻怪物即可通關。",
                  zhHans: "击败 3 只怪物即可通关。"
                })}
                buttonLabel={t({ en: "Start Game", zh: "开始游戏", zhHans: "开始游戏" })}
              />
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-200">
                  {t({ en: "Step 1", zh: "第 1 站" })}
                </span>
                <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-200">
                  {t({ en: "80%+", zh: "80%+" })}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white">
                {t({ en: "Adventure Island", zh: "探险岛", zhHans: "探险岛" })}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {t({
                  en: "Complete this same-topic 5-question round to start the island challenge.",
                  zh: "完成本次同課題 5 題達標回合，即可開始探险岛挑戰。",
                  zhHans: "完成本次同课题 5 题达标回合，即可开始探险岛挑战。"
                })}
              </p>
              <Link
                href={studentPracticeGameHrefs.adventureIsland}
                className="focus-ring mt-4 inline-flex w-full justify-center rounded-full border border-emerald-300/45 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-400/20 dark:text-emerald-200"
              >
                {t({ en: "Open Adventure Island", zh: "開啟探险岛", zhHans: "开启探险岛" })}
              </Link>
            </div>
          </article>

          <div className="hidden items-center justify-center px-1 lg:flex">
            <div className="rounded-full border border-slate-200/80 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-300">
              {t({ en: "Then", zh: "然後", zhHans: "然后" })}
            </div>
          </div>

          <article className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.07]">
            <div className="relative aspect-[16/9] overflow-hidden bg-sky-100 dark:bg-sky-950/35">
              <FishingWelcomePreview
                eyebrow={t({ en: "Math Fishing", zh: "數學捕魚", zhHans: "数学捕鱼" })}
                title={t({ en: "Fishing Master", zh: "捕魚達人", zhHans: "捕鱼达人" })}
                description={t({
                  en: "Catch sea creatures with the cannon net. Solve the math question only after a real catch.",
                  zh: "用炮台發射魚網捕捉海洋生物。真正命中後才回答數學題。",
                  zhHans: "用炮台发射渔网捕捉海洋生物。真正命中后才回答数学题。"
                })}
                buttonLabel={t({ en: "Start Game", zh: "开始游戏", zhHans: "开始游戏" })}
              />
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-sky-700 dark:text-sky-200">
                  {t({ en: "Step 2", zh: "第 2 站" })}
                </span>
                <span className="rounded-full bg-teal-400/20 px-3 py-1 text-xs font-black text-teal-700 dark:text-teal-200">
                  {t({ en: "After island", zh: "通關後", zhHans: "通关后" })}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white">
                {t({ en: "Fishing Master", zh: "捕魚達人", zhHans: "捕鱼达人" })}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {t({
                  en: "Clear Adventure Island, then finish another qualifying round to open the fishing challenge.",
                  zh: "先通關探险岛，再完成另一次達標回合，即可開啟捕魚挑戰。",
                  zhHans: "先通关探险岛，再完成另一次达标回合，即可开启捕鱼挑战。"
                })}
              </p>
              <Link
                href={studentPracticeGameHrefs.fishingMaster}
                className="focus-ring mt-4 inline-flex w-full justify-center rounded-full border border-sky-300/45 bg-sky-400/10 px-5 py-3 text-sm font-black text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-400/20 dark:text-sky-200"
              >
                {t({ en: "Open Fishing Master", zh: "開啟捕魚達人", zhHans: "开启捕鱼达人" })}
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
