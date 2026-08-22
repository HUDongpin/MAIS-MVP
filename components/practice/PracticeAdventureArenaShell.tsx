"use client";

import Image from "next/image";
import { useState } from "react";
import { NovaCompanion } from "@/components/practice/NovaCompanion";
import { PracticeStarReward } from "@/components/practice/PracticeQuestPager";
import type { LocalizedText } from "@/types";
import {
  practiceIslandMaxStarsPerRegion,
  type PracticeIslandRegion,
  type PracticeIslandRegionId
} from "@/data/practiceIslandRegions";
import { cn } from "@/lib/utils";
import islandMap from "./assets/math-adventure-island-map.png";

export type PracticeIslandRegionStatus = {
  region: PracticeIslandRegion;
  stars: number;
  locked: boolean;
};

export type PracticeAdventureArenaMode = "chooser" | "unit" | "explore";

type PracticeAdventureArenaShellProps = {
  t: (localized: LocalizedText) => string;
  mode: PracticeAdventureArenaMode;
  onModeChange: (mode: PracticeAdventureArenaMode) => void;
  progressValue: number;
  progressTotal: number;
  regions: PracticeIslandRegionStatus[];
  pulseRegionId?: PracticeIslandRegionId | null;
  regionNotice?: string | null;
  onStartMission: () => void;
  onRegionSelect: (regionId: PracticeIslandRegionId) => void;
};

const regionPulseClassName = "ring-4 ring-amber-300 ring-offset-2 ring-offset-sky-100 motion-safe:animate-pulse";

function UnitExerciseIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      data-practice-cta-icon="unit-exercise"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
    >
      <path
        d="M7 3.5h7.2L18 7.3v11.2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M14 3.8v3.7h3.7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m8 10.6 1.1 1.1 2-2.2M12.8 10.5H15M8 15.4l1.1 1.1 2-2.2M12.8 15.3H15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function FreeExplorationIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      data-practice-cta-icon="free-exploration"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1Z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
    </svg>
  );
}

function StarIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="m12 3 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8L12 3Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}

function ArrowRightIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function LockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <rect x="6" y="10" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function RegionStars({ stars, starClassName = "size-4" }: { stars: number; starClassName?: string }) {
  return (
    <span aria-hidden="true" className="flex justify-center gap-0.5 text-amber-400">
      {Array.from({ length: practiceIslandMaxStarsPerRegion }, (_, index) => (
        <StarIcon key={index} className={cn(starClassName, index < stars ? "" : "opacity-30")} />
      ))}
    </span>
  );
}

const regionQuestIconPaths: Record<PracticeIslandRegionId, string> = {
  "algebra-peaks": "m3 19 5.5-9 3.5 5.5L15.5 9l5.5 10H3Z",
  "geometry-garden": "M12 4 21 20H3L12 4Z",
  "number-forest": "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  "question-cavern": "m12 3 2.2 5.3L20 10.5l-5.8 2.2L12 18l-2.2-5.3L4 10.5l5.8-2.2L12 3Z",
  "masters-keep": "m4 9 3 2.5L12 5l5 6.5L20 9v10H4V9Z",
  "challenge-shore": "M6 3v18M6 4h11l-2.5 4L17 12H6"
};

function RegionQuestIcon({ regionId, className = "size-5" }: { regionId: PracticeIslandRegionId; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path
        d={regionQuestIconPaths[regionId]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function regionButtonLabel(t: PracticeAdventureArenaShellProps["t"], status: PracticeIslandRegionStatus) {
  const starText = t({
    en: `${status.stars} of ${practiceIslandMaxStarsPerRegion} stars`,
    zh: `已獲 ${status.stars}/${practiceIslandMaxStarsPerRegion} 星`,
    zhHans: `已获 ${status.stars}/${practiceIslandMaxStarsPerRegion} 星`
  });
  const lockedText = status.locked ? ` ${t({ en: "(locked)", zh: "（未解鎖）", zhHans: "（未解锁）" })}` : "";
  return `${t(status.region.label)} · ${t(status.region.subtitle)} · ${starText}${lockedText}`;
}

const selectedRegionNextQuest: Record<PracticeIslandRegionId, LocalizedText> = {
  "algebra-peaks": {
    en: "Solve equations with one unknown",
    zh: "解一個未知數的方程",
    zhHans: "解一个未知数的方程"
  },
  "geometry-garden": {
    en: "Find missing angles in a triangle",
    zh: "找出三角形的未知角",
    zhHans: "找出三角形的未知角"
  },
  "number-forest": {
    en: "Compare decimals on a number line",
    zh: "在數線上比較小數",
    zhHans: "在数线上比较小数"
  },
  "question-cavern": {
    en: "Your recommended skill mix",
    zh: "你的推薦技能組合",
    zhHans: "你的推荐技能组合"
  },
  "challenge-shore": {
    en: "Three skills, one beach challenge",
    zh: "三種技能，一場海岸挑戰",
    zhHans: "三种技能，一场海岸挑战"
  },
  "masters-keep": {
    en: "Earn 12 stars to open this region",
    zh: "取得 12 顆星以開放此區域",
    zhHans: "取得 12 颗星以开放此区域"
  }
};

const regionQuestListSubtitle: Record<PracticeIslandRegionId, LocalizedText> = {
  "algebra-peaks": { en: "Operations & equations", zh: "運算與方程", zhHans: "运算与方程" },
  "geometry-garden": { en: "Shapes, measures & data", zh: "圖形、量度與數據", zhHans: "图形、测量与数据" },
  "number-forest": { en: "Counting & place value", zh: "數數與位值", zhHans: "数数与位值" },
  "question-cavern": { en: "A mission picked for you", zh: "為你精選的任務", zhHans: "为你精选的任务" },
  "challenge-shore": { en: "Mixed-skill challenges", zh: "混合技能挑戰", zhHans: "混合技能挑战" },
  "masters-keep": { en: "Earn 12 stars to open", zh: "取得 12 顆星以開放", zhHans: "取得 12 颗星以开放" }
};

const regionQuestListOrder: PracticeIslandRegionId[] = [
  "algebra-peaks",
  "geometry-garden",
  "number-forest",
  "question-cavern",
  "challenge-shore",
  "masters-keep"
];

const unitExercisePreviewSteps = [1, 2, 3, 4, 5] as const;

function UnitExerciseTrailPreview({ t }: { t: PracticeAdventureArenaShellProps["t"] }) {
  return (
    <div
      data-practice-reward-preview
      className="relative h-48 w-full overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-cyan-50 via-sky-50 to-emerald-50 sm:h-52 lg:h-56"
    >
      <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
        <PracticeStarReward
          correctCount={0}
          answeredCount={0}
          total={5}
          t={t}
          prefersReducedMotion
        />
      </div>

      <div aria-hidden="true" className="absolute inset-x-4 bottom-8 flex items-center sm:inset-x-6 sm:bottom-9">
        {unitExercisePreviewSteps.map((step, index) => (
          <div key={step} className={cn("flex items-center", index < unitExercisePreviewSteps.length - 1 ? "flex-1" : null)}>
            <span className="relative grid shrink-0 place-items-center">
              {index === 0 ? (
                <span className="absolute bottom-full left-1/2 grid -translate-x-1/2 place-items-center pb-1.5">
                  <NovaCompanion mood="cheer" className="h-9 w-9 drop-shadow-[0_4px_5px_rgba(2,132,199,0.28)] sm:h-10 sm:w-10" />
                  <span className="h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-amber-400" />
                </span>
              ) : null}
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full border-2 bg-white text-xs font-black shadow-sm sm:size-10 sm:text-sm",
                  index === 0
                    ? "border-blue-500 text-blue-700 ring-4 ring-blue-100"
                    : "border-sky-100 text-slate-500"
                )}
              >
                {step}
              </span>
            </span>
            {index < unitExercisePreviewSteps.length - 1 ? (
              <span className="mx-1 h-1.5 flex-1 rounded-full bg-sky-100 sm:mx-1.5" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PracticeAdventureArenaShell({
  t,
  mode,
  onModeChange,
  progressValue,
  progressTotal,
  regions,
  pulseRegionId = null,
  regionNotice,
  onStartMission,
  onRegionSelect
}: PracticeAdventureArenaShellProps) {
  const [selectedRegionId, setSelectedRegionId] = useState<PracticeIslandRegionId>(
    () => regions.find((status) => !status.locked)?.region.id ?? "algebra-peaks"
  );
  const safeProgressTotal = Math.max(1, progressTotal);
  const selectedRegionStatus = regions.find((status) => status.region.id === selectedRegionId) ?? regions[0];
  const questListRegionStatuses = [...regions].sort(
    (left, right) => regionQuestListOrder.indexOf(left.region.id) - regionQuestListOrder.indexOf(right.region.id)
  );

  const handleStartMission = () => {
    onModeChange("unit");
    window.setTimeout(() => {
      onStartMission();
    }, 0);
  };

  const handleOpenExplore = () => {
    onModeChange("explore");
  };

  const handleAdjustPractice = () => {
    onModeChange("chooser");
  };

  const handleSelectedQuestStart = () => {
    if (!selectedRegionStatus || selectedRegionStatus.locked) {
      document.getElementById("island-quests")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    onRegionSelect(selectedRegionStatus.region.id);
  };

  if (mode === "chooser") {
    return (
      <section
        className="relative pb-4 text-slate-900 [&~*]:hidden"
        aria-labelledby="practice-adventure-title"
        data-practice-mode="chooser"
      >
        <header
          data-practice-chooser-heading
          className="mx-auto mb-4 max-w-3xl rounded-[1.5rem] border border-white/90 bg-white/95 px-5 py-3 text-center shadow-[0_14px_32px_rgba(15,23,42,0.14)] backdrop-blur sm:mb-5 sm:px-7 sm:py-4"
        >
          <h1
            id="practice-adventure-title"
            tabIndex={-1}
            className="text-3xl font-black leading-none tracking-[-0.04em] text-blue-950 focus:outline-none sm:text-4xl lg:text-5xl"
          >
            <span className="sr-only">
              {t({ en: "Practice Arena. ", zh: "練習競技場。", zhHans: "练习竞技场。" })}
            </span>
            {t({ en: "Where do you want to go?", zh: "想去哪裡開始？", zhHans: "想从哪里开始？" })}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-5 text-slate-700 sm:text-base">
            {t({
              en: "Pick one path. You can change it anytime.",
              zh: "選一條路線，之後可隨時切換。",
              zhHans: "选择一条路线，之后可随时切换。"
            })}
          </p>
        </header>

        <div
          role="group"
          aria-label={t({ en: "Choose a practice mode", zh: "選擇練習模式", zhHans: "选择练习模式" })}
          data-practice-chooser-grid
          className="relative mx-auto grid max-w-[1180px] gap-4 lg:grid-cols-2 lg:gap-6"
        >
          <article
            data-practice-mode-choice="guided"
            className="flex min-h-full flex-col overflow-hidden rounded-[1.65rem] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.14)] sm:p-5"
          >
            <UnitExerciseTrailPreview t={t} />
            <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                {t({ en: "Guided", zh: "引導練習", zhHans: "引导练习" })}
              </p>
              <h2 className="mt-1.5 text-3xl font-black leading-none tracking-[-0.04em] text-blue-950 sm:text-4xl">
                {t({ en: "Unit Exercise", zh: "單元練習", zhHans: "单元练习" })}
              </h2>
              <p className="mt-2.5 text-sm font-semibold leading-5 text-slate-600 sm:text-[15px]">
                {t({
                  en: "Five questions from the unit you are learning now.",
                  zh: "完成正在學習單元的五道題目。",
                  zhHans: "完成正在学习单元的五道题目。"
                })}
              </p>
              <ul className="mt-3 grid grid-cols-3 gap-2 text-xs font-extrabold leading-4 text-slate-700">
                {[
                  { en: "5-question goal", zh: "五題目標", zhHans: "五题目标" },
                  { en: "Instant feedback", zh: "即時回饋", zhHans: "即时反馈" },
                  { en: "About 8 min", zh: "約 8 分鐘", zhHans: "约 8 分钟" }
                ].map((benefit) => (
                  <li key={benefit.en} className="flex min-h-10 items-start gap-1.5 rounded-xl bg-white/75 px-2 py-2 shadow-sm">
                    <span aria-hidden="true" className="text-sm leading-none text-emerald-500">✓</span>
                    <span>{t(benefit)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleStartMission}
                data-tour="student-practice-start"
                aria-label={t({
                  en: "Choose Unit Exercise — Start Mission",
                  zh: "選擇單元練習－開始任務",
                  zhHans: "选择单元练习－开始任务"
                })}
                className="focus-ring mt-4 inline-flex min-h-12 w-full items-center justify-between rounded-xl bg-[#c9433b] px-4 py-2.5 text-sm font-black text-white shadow-[0_6px_0_#a9322c,0_12px_22px_rgba(169,50,44,0.22)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_2px_0_#a9322c]"
              >
                <span className="inline-flex items-center gap-2">
                  <UnitExerciseIcon className="size-5 shrink-0" />
                  {t({ en: "Choose Unit Exercise", zh: "選擇單元練習", zhHans: "选择单元练习" })}
                </span>
                <ArrowRightIcon />
              </button>
            </div>
          </article>

          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-500 shadow-lg lg:grid"
          >
            {t({ en: "or", zh: "或", zhHans: "或" })}
          </span>

          <div className="flex items-center justify-center gap-3 lg:hidden" aria-hidden="true">
            <span className="h-px w-16 bg-slate-300" />
            <span className="grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-xs font-black uppercase text-slate-500 shadow-sm">
              {t({ en: "or", zh: "或", zhHans: "或" })}
            </span>
            <span className="h-px w-16 bg-slate-300" />
          </div>

          <article
            data-practice-mode-choice="explore"
            className="flex min-h-full flex-col overflow-hidden rounded-[1.65rem] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.14)] sm:p-5"
          >
            <div
              data-tour="student-practice-map"
              data-practice-map-preview
              className="relative h-48 w-full overflow-hidden rounded-[1.35rem] bg-cyan-100 sm:h-52 lg:h-56"
            >
              <Image
                src={islandMap}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain"
                loading="eager"
              />
            </div>
            <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
                {t({ en: "Open choice", zh: "自由選擇", zhHans: "自由选择" })}
              </p>
              <h2 className="mt-1.5 text-3xl font-black leading-none tracking-[-0.04em] text-blue-950 sm:text-4xl">
                {t({ en: "Free Exploration", zh: "自由探索", zhHans: "自由探索" })}
              </h2>
              <p className="mt-2.5 text-sm font-semibold leading-5 text-slate-600 sm:text-[15px]">
                {t({
                  en: "Choose an island region and practice in any order.",
                  zh: "選擇島嶼區域，按自己的順序練習。",
                  zhHans: "选择岛屿区域，按自己的顺序练习。"
                })}
              </p>
              <ul className="mt-3 grid grid-cols-3 gap-2 text-xs font-extrabold leading-4 text-slate-700">
                {[
                  { en: "Six math regions", zh: "六個數學區域", zhHans: "六个数学区域" },
                  { en: "No set order", zh: "沒有固定順序", zhHans: "没有固定顺序" },
                  { en: "Earn island stars", zh: "贏取島嶼星星", zhHans: "赢取岛屿星星" }
                ].map((benefit) => (
                  <li key={benefit.en} className="flex min-h-10 items-start gap-1.5 rounded-xl bg-white/75 px-2 py-2 shadow-sm">
                    <span aria-hidden="true" className="text-sm leading-none text-emerald-500">✓</span>
                    <span>{t(benefit)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleOpenExplore}
                className="focus-ring mt-4 inline-flex min-h-12 w-full items-center justify-between rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white shadow-[0_6px_0_#075f82,0_12px_22px_rgba(8,124,167,0.2)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_2px_0_#075f82]"
              >
                <span className="inline-flex items-center gap-2">
                  <FreeExplorationIcon className="size-5 shrink-0" />
                  {t({ en: "Choose Free Exploration", zh: "選擇自由探索", zhHans: "选择自由探索" })}
                </span>
                <ArrowRightIcon />
              </button>
            </div>
          </article>

        </div>
      </section>
    );
  }

  if (mode === "unit") {
    return (
      <section className="sr-only" aria-labelledby="practice-adventure-title" data-practice-mode="unit">
        <h1 id="practice-adventure-title" className="sr-only">
          {t({
            en: "Practice Arena. Unit Exercise",
            zh: "練習競技場。單元練習",
            zhHans: "练习竞技场。单元练习"
          })}
        </h1>
      </section>
    );
  }

  return (
    <section
      className="relative mx-auto max-w-[1240px] pb-12 text-[#14213d]"
      aria-labelledby="practice-adventure-title"
      data-practice-mode="explore"
    >
      <div id="practice-adventure-hero">
        <header
          data-practice-explore-heading
          className="mb-[18px] flex items-center justify-between gap-[18px] px-1.5 pb-1 pt-6 max-[620px]:flex-col max-[620px]:items-start"
        >
          <div>
            <p className="inline-flex min-h-[31px] items-center rounded-full bg-[#ddf5ff] px-4 text-xs font-black uppercase tracking-[0.15em] text-[#075f82]">
              {t({ en: "Free Exploration", zh: "自由探索", zhHans: "自由探索" })}
            </p>
            <h1
              id="practice-adventure-title"
              tabIndex={-1}
              className="mt-3 text-[clamp(2rem,4vw,3.7rem)] font-black leading-[1.02] tracking-[-0.045em] text-[#14213d] focus:outline-none"
            >
              <span className="sr-only">
                {t({ en: "Practice Arena. ", zh: "練習競技場。", zhHans: "练习竞技场。" })}
              </span>
              {t({ en: "Explore the math island.", zh: "探索數學島。", zhHans: "探索数学岛。" })}
            </h1>
            <p className="mt-2.5 text-base font-bold leading-6 text-[#65758b]">
              {t({
                en: "Choose a region. There is no set order and no timer.",
                zh: "選擇一個區域，沒有固定順序，也沒有計時。",
                zhHans: "选择一个区域，没有固定顺序，也没有计时。"
              })}
            </p>
          </div>
          <div
            data-practice-island-progress
            aria-label={t({
              en: `Island progress: ${progressValue} of ${safeProgressTotal} stars`,
              zh: `島嶼進度：${progressValue}/${safeProgressTotal} 顆星`,
              zhHans: `岛屿进度：${progressValue}/${safeProgressTotal} 颗星`
            })}
            className="flex min-h-16 min-w-[155px] shrink-0 items-baseline justify-center gap-1.5 rounded-[18px] border border-[#f4dd8d] bg-[#fff9df] px-4 py-3 text-[#7a5a00]"
          >
            <StarIcon className="size-6 self-center text-[#f6be2c]" />
            <strong className="text-[1.65rem] font-black">{progressValue}</strong>
            <span className="text-xs font-black text-[#7d6d3f]">
              / {safeProgressTotal} {t({ en: "stars", zh: "顆星", zhHans: "颗星" })}
            </span>
          </div>
        </header>

        <div
          data-practice-explore-layout
          className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(265px,0.55fr)]"
        >
          <div
            data-tour="student-practice-map"
            data-practice-explore-map
            className="relative min-h-[530px] overflow-hidden rounded-[28px] border-[6px] border-white bg-[#4ac6ea] shadow-[0_20px_46px_rgba(8,95,130,0.20)] max-[840px]:min-h-[500px] max-[620px]:min-h-[390px] max-[620px]:rounded-[22px] max-[620px]:border-4"
          >
            <Image
              src={islandMap}
              alt={t({
                en: "Adventure island map with math mission landmarks",
                zh: "包含數學任務地標的探險島地圖",
                zhHans: "包含数学任务地标的探险岛地图"
              })}
              fill
              sizes="(min-width: 1024px) 75vw, 100vw"
              className="object-cover"
              loading="eager"
            />
            {regions.map((status) => {
              const selected = selectedRegionId === status.region.id;
              const recommended = status.region.kind === "adaptive";
              const challenge = status.region.kind === "challenge";
              return (
                <button
                  key={status.region.id}
                  type="button"
                  data-island-region-pin={status.region.id}
                  onClick={() => setSelectedRegionId(status.region.id)}
                  aria-label={regionButtonLabel(t, status)}
                  aria-pressed={selected}
                  title={t(status.region.subtitle)}
                  className={cn(
                    "focus-ring absolute z-10 grid min-h-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-white/95 px-[13px] py-2 text-center text-[0.74rem] font-black leading-[1.15] text-[#14213d] shadow-[0_8px_20px_rgba(20,33,61,0.24)] backdrop-blur-md transition duration-150 hover:-translate-y-[calc(50%+4px)] hover:scale-[1.03] hover:border-[#f6be2c] hover:ring-4 hover:ring-[#f6be2c]/25 max-[620px]:max-w-[116px] max-[620px]:px-2 max-[620px]:py-1.5 max-[620px]:text-[0.58rem]",
                    status.region.pinClassName,
                    selected || recommended ? "border-[#f6be2c]" : "border-white/95",
                    selected ? "-translate-y-[calc(50%+4px)] scale-[1.03] ring-4 ring-[#f6be2c]/25" : null,
                    status.locked ? "opacity-[0.83]" : null,
                    challenge ? "max-[620px]:hidden" : null,
                    pulseRegionId === status.region.id ? regionPulseClassName : null
                  )}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {status.locked ? <LockIcon className="size-3.5 text-slate-500" /> : null}
                    {t(status.region.label)}
                  </span>
                  {!challenge && !status.locked ? (
                    <span className="mt-1 block text-[0.61rem] text-[#d69b00] max-[620px]:hidden">
                      {recommended
                        ? t({ en: "Recommended", zh: "推薦", zhHans: "推荐" })
                        : <RegionStars stars={status.stars} starClassName="size-3" />}
                    </span>
                  ) : null}
                </button>
              );
            })}
            <div
              aria-hidden="true"
              className="absolute bottom-[18px] right-[18px] z-10 grid gap-1 rounded-[15px] border border-white/80 bg-white/95 px-4 py-3 text-xs shadow-[0_8px_20px_rgba(20,33,61,0.18)] max-[620px]:hidden"
            >
              <strong>{t({ en: "Island progress", zh: "島嶼進度", zhHans: "岛屿进度" })}</strong>
              <span className="inline-flex items-center gap-1 text-base font-black text-[#8b6500]">
                <StarIcon className="size-4" /> {progressValue} / {safeProgressTotal}
              </span>
            </div>
          </div>

          <aside
            data-selected-island-region={selectedRegionStatus?.region.id}
            aria-live="polite"
            className="flex min-h-full flex-col rounded-[28px] border border-[#cfe4ee] bg-white p-7 shadow-[0_10px_28px_rgba(20,33,61,0.09)]"
          >
            {selectedRegionStatus ? (
              <>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#087ca7]">
                  {t({ en: "Selected region", zh: "已選區域", zhHans: "已选区域" })}
                </p>
                <span className="mt-8 grid size-[58px] place-items-center rounded-[18px] bg-gradient-to-br from-[#5c7cfa] to-[#3446a8] text-white shadow-[0_8px_18px_rgba(52,70,168,0.22)]">
                  {selectedRegionStatus.locked
                    ? <LockIcon className="size-6" />
                    : <RegionQuestIcon regionId={selectedRegionStatus.region.id} className="size-6" />}
                </span>
                <h2 className="mt-[17px] text-[1.72rem] font-black leading-[1.1] text-[#14213d]">
                  {t(selectedRegionStatus.region.label)}
                </h2>
                <p className="mt-2 text-sm font-bold text-[#65758b]">
                  {t(selectedRegionStatus.region.subtitle)}
                </p>
                <div className="my-7 grid gap-2 border-y border-[#dbe7ef] py-5">
                  <span className="text-[0.7rem] font-black uppercase tracking-[0.1em] text-[#0b9f7d]">
                    {t({ en: "Next quest", zh: "下一個任務", zhHans: "下一个任务" })}
                  </span>
                  <strong className="text-base font-black leading-[1.45] text-[#14213d]">
                    {t(selectedRegionNextQuest[selectedRegionStatus.region.id])}
                  </strong>
                </div>
                <button
                  type="button"
                  data-start-selected-region
                  onClick={handleSelectedQuestStart}
                  className="focus-ring mt-auto min-h-14 w-full rounded-[18px] bg-[#087ca7] px-3 py-3 text-sm font-black text-white shadow-[0_7px_0_#075f82,0_14px_26px_rgba(8,124,167,0.18)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_2px_0_#075f82]"
                >
                  {selectedRegionStatus.locked
                    ? t({ en: "See open quests", zh: "查看已開放任務", zhHans: "查看已开放任务" })
                    : t({
                        en: `Start ${t(selectedRegionStatus.region.label)} quest`,
                        zh: `開始${t(selectedRegionStatus.region.label)}任務`,
                        zhHans: `开始${t(selectedRegionStatus.region.label)}任务`
                      })}
                </button>
                <button
                  type="button"
                  data-adjust-practice
                  onClick={handleAdjustPractice}
                  className="focus-ring min-h-11 bg-transparent px-1 py-2.5 text-sm font-black text-[#075f82] underline decoration-1 underline-offset-4"
                >
                  {t({ en: "Adjust practice", zh: "調整練習", zhHans: "调整练习" })}
                </button>
                <p className={cn("text-sm font-bold text-blue-950/85", regionNotice ? "mt-2" : "sr-only")}>
                  {regionNotice ?? ""}
                </p>
              </>
            ) : null}
          </aside>
        </div>
      </div>

      <section
        id="island-quests"
        data-island-quest-list
        className="mt-[18px] scroll-mt-24 rounded-[28px] border border-[#d4e7ef] bg-white/90 p-[clamp(20px,3vw,28px)] shadow-[0_10px_28px_rgba(20,33,61,0.09)]"
      >
        <div className="flex items-center justify-between gap-6 max-[620px]:flex-col max-[620px]:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#087ca7]">
              {t({ en: "Island quests", zh: "島嶼任務", zhHans: "岛屿任务" })}
            </p>
            <h2 className="mt-1.5 text-[1.55rem] font-black text-[#14213d]">
              {t({ en: "Pick a region", zh: "選擇一個區域", zhHans: "选择一个区域" })}
            </h2>
          </div>
          <p className="max-w-[340px] text-sm font-bold text-[#65758b]">
            {t({
              en: "Map and list always stay in sync.",
              zh: "地圖與列表會一直保持同步。",
              zhHans: "地图与列表会一直保持同步。"
            })}
          </p>
        </div>
        <div
          role="group"
          aria-label={t({ en: "Island regions", zh: "島嶼區域", zhHans: "岛屿区域" })}
          className="mt-[18px] grid gap-[11px] min-[841px]:grid-cols-3 max-[620px]:gap-2"
        >
          {questListRegionStatuses.map((status) => {
            const selected = selectedRegionId === status.region.id;
            const recommended = status.region.kind === "adaptive";
            const challenge = status.region.kind === "challenge";
            return (
              <button
                key={status.region.id}
                type="button"
                data-island-region-chip={status.region.id}
                onClick={() => setSelectedRegionId(status.region.id)}
                aria-label={regionButtonLabel(t, status)}
                aria-pressed={selected}
                title={t(status.region.subtitle)}
                className={cn(
                  "focus-ring grid min-h-[94px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[11px] rounded-[17px] border bg-white p-[13px] text-left shadow-[0_4px_10px_rgba(20,33,61,0.04)] transition duration-150 hover:-translate-y-0.5 hover:border-[#087ca7] hover:shadow-[0_8px_18px_rgba(8,124,167,0.12)] max-[620px]:min-h-[82px]",
                  recommended ? "border-[#efcf63] bg-[#fffdf3]" : selected ? "border-[#087ca7]" : "border-[#d8e7ef]",
                  selected ? "-translate-y-0.5 shadow-[0_8px_18px_rgba(8,124,167,0.12)]" : null,
                  status.locked ? "bg-[#f3f6f8] opacity-[0.82]" : null,
                  pulseRegionId === status.region.id ? regionPulseClassName : null
                )}
              >
                <span className="grid size-[42px] shrink-0 place-items-center rounded-[13px] bg-[#e5f7fd] text-[#075f82]">
                  {status.locked
                    ? <LockIcon className="size-5" />
                    : <RegionQuestIcon regionId={status.region.id} className="size-5" />}
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm font-black leading-snug text-[#14213d]">
                    {t(status.region.label)}
                  </strong>
                  <span className="mt-1 block text-xs font-bold leading-tight text-[#65758b]">
                    {t(regionQuestListSubtitle[status.region.id])}
                  </span>
                </span>
                {recommended || challenge || status.locked ? (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide",
                      recommended ? "bg-[#fff0b8] text-[#806000]" : null,
                      challenge ? "bg-[#dff8f0] text-[#08795f]" : null,
                      status.locked ? "bg-[#e3e9ed] text-[#65758b]" : null
                    )}
                  >
                    {status.locked
                      ? t({ en: "Locked", zh: "未解鎖", zhHans: "未解锁" })
                      : recommended
                        ? t({ en: "Recommended", zh: "推薦", zhHans: "推荐" })
                        : t({ en: "Ready", zh: "待挑戰", zhHans: "待挑战" })}
                  </span>
                ) : (
                  <RegionStars stars={status.stars} starClassName="size-3.5" />
                )}
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}
