"use client";

import Image from "next/image";
import { NovaCompanion } from "@/components/practice/NovaCompanion";
import { PracticeStarReward } from "@/components/practice/PracticeQuestPager";
import type { LocalizedText } from "@/types";
import {
  practiceIslandMaxStarsPerRegion,
  type PracticeIslandRegion,
  type PracticeIslandRegionId
} from "@/data/practiceIslandRegions";
import { studentPracticeGameHrefs } from "@/lib/gameBasedLearning";
import { cn } from "@/lib/utils";
import islandMap from "./assets/math-adventure-island-map.png";

export type PracticeIslandRegionStatus = {
  region: PracticeIslandRegion;
  stars: number;
  locked: boolean;
};

export type PracticeIslandGamesStatus = {
  adventureIslandUnlocked: boolean;
  fishingMasterUnlocked: boolean;
};

export type PracticeAdventureArenaMode = "chooser" | "unit" | "explore";
export type PracticeUnitMissionStatus = "loading" | "ready" | "unavailable";

type PracticeAdventureArenaShellProps = {
  t: (localized: LocalizedText) => string;
  mode: PracticeAdventureArenaMode;
  unitStatus: PracticeUnitMissionStatus;
  onModeChange: (mode: PracticeAdventureArenaMode) => void;
  progressValue: number;
  progressTotal: number;
  regions: PracticeIslandRegionStatus[];
  games: PracticeIslandGamesStatus;
  pulseRegionId?: PracticeIslandRegionId | null;
  regionNotice?: string | null;
  onStartMission: () => void;
  onRegionSelect: (regionId: PracticeIslandRegionId) => void;
};

const regionPulseClassName = "ring-4 ring-amber-300 ring-offset-2 ring-offset-sky-100 motion-safe:animate-pulse";

const islandGameMarkers = [
  {
    id: "adventure-island",
    href: studentPracticeGameHrefs.adventureIsland,
    label: { en: "Adventure Island", zh: "探險島", zhHans: "探险岛" },
    pinClassName: "left-[88%] top-[38%]",
    unlockedKey: "adventureIslandUnlocked"
  },
  {
    id: "fishing-master",
    href: studentPracticeGameHrefs.fishingMaster,
    label: { en: "Fishing Master", zh: "捕魚達人", zhHans: "捕鱼达人" },
    pinClassName: "left-[9%] top-[82%]",
    unlockedKey: "fishingMasterUnlocked"
  }
] as const satisfies ReadonlyArray<{
  id: string;
  href: string;
  label: LocalizedText;
  pinClassName: string;
  unlockedKey: keyof PracticeIslandGamesStatus;
}>;

const islandGameUnlockedText: LocalizedText = {
  en: "Unlocked — tap to play!",
  zh: "已解鎖－立即遊玩！",
  zhHans: "已解锁－立即游玩！"
};

const islandGameLockedHint: LocalizedText = {
  en: "Score 4 of 5 in a single-topic mission to unlock",
  zh: "在單一課題任務答對 4/5 即可解鎖",
  zhHans: "在单一课题任务答对 4/5 即可解锁"
};

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

function ArrowRightIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
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

function PlayIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
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

// Quest status is derived from data the island already tracks: the review region
// locks until enough stars are banked, a full three stars means the region is
// cleared, and the adaptive region is the AI-picked mission, so it carries the
// single "recommended" highlight rather than an arbitrary card being featured.
type RegionQuestTone = "locked" | "complete" | "recommended" | "progress" | "ready";

function resolveRegionQuestTone(status: PracticeIslandRegionStatus): RegionQuestTone {
  if (status.locked) return "locked";
  if (status.stars >= practiceIslandMaxStarsPerRegion) return "complete";
  if (status.region.kind === "adaptive") return "recommended";
  if (status.stars > 0) return "progress";
  return "ready";
}

function regionQuestBadgeLabel(t: PracticeAdventureArenaShellProps["t"], tone: RegionQuestTone) {
  if (tone === "locked") return t({ en: "Locked", zh: "未解鎖", zhHans: "未解锁" });
  if (tone === "complete") return t({ en: "Complete", zh: "已完成", zhHans: "已完成" });
  if (tone === "recommended") return t({ en: "Recommended", zh: "推薦", zhHans: "推荐" });
  if (tone === "progress") return t({ en: "In progress", zh: "進行中", zhHans: "进行中" });
  return t({ en: "Ready", zh: "待挑戰", zhHans: "待挑战" });
}

function regionQuestActionLabel(t: PracticeAdventureArenaShellProps["t"], tone: RegionQuestTone) {
  if (tone === "locked") return t({ en: "How to unlock", zh: "如何解鎖", zhHans: "如何解锁" });
  if (tone === "complete") return t({ en: "Replay", zh: "再玩一次", zhHans: "再玩一次" });
  if (tone === "recommended") return t({ en: "Play next", zh: "開始下一關", zhHans: "开始下一关" });
  if (tone === "progress") return t({ en: "Resume", zh: "繼續", zhHans: "继续" });
  return t({ en: "Play", zh: "開始", zhHans: "开始" });
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

function islandGameMarkerLabel(
  t: PracticeAdventureArenaShellProps["t"],
  marker: (typeof islandGameMarkers)[number],
  unlocked: boolean
) {
  return `${t(marker.label)} · ${t(unlocked ? islandGameUnlockedText : islandGameLockedHint)}`;
}

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
          <div
            key={step}
            className={cn("flex items-center", index < unitExercisePreviewSteps.length - 1 ? "flex-1" : null)}
          >
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
  unitStatus,
  onModeChange,
  progressValue,
  progressTotal,
  regions,
  games,
  pulseRegionId = null,
  regionNotice,
  onStartMission,
  onRegionSelect
}: PracticeAdventureArenaShellProps) {
  const handleStartMission = () => {
    if (unitStatus === "unavailable") return;
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

  const unitStatusText = unitStatus === "ready"
    ? t({ en: "Available", zh: "可以開始", zhHans: "可以开始" })
    : unitStatus === "loading"
      ? t({ en: "Preparing questions", zh: "正在準備題目", zhHans: "正在准备题目" })
      : t({ en: "Temporarily unavailable", zh: "暫時未能使用", zhHans: "暂时无法使用" });

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
                  en: "Five questions from the unit you are learning now, with one star available for each correct answer.",
                  zh: "完成正在學習單元的五道題目，每答對一題可獲一顆星。",
                  zhHans: "完成正在学习单元的五道题目，每答对一题可获一颗星。"
                })}
              </p>
              <p
                data-unit-exercise-door-status={unitStatus}
                aria-live="polite"
                className={cn(
                  "mt-3 text-xs font-black",
                  unitStatus === "ready"
                    ? "text-emerald-700"
                    : unitStatus === "loading"
                      ? "text-blue-700"
                      : "text-rose-700"
                )}
              >
                {unitStatusText}
              </p>
              <ul className="mt-3 grid grid-cols-3 gap-2 text-xs font-extrabold leading-4 text-slate-700">
                {[
                  { en: "5-question goal", zh: "五題目標", zhHans: "五题目标" },
                  { en: "Instant feedback", zh: "即時回饋", zhHans: "即时反馈" },
                  { en: "Earn 5 stars", zh: "贏取五顆星", zhHans: "赢取五颗星" }
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
                disabled={unitStatus === "unavailable"}
                data-tour="student-practice-start"
                aria-label={t({
                  en: "Choose Unit Exercise — Start Mission",
                  zh: "選擇單元練習－開始任務",
                  zhHans: "选择单元练习－开始任务"
                })}
                className="focus-ring mt-4 inline-flex min-h-12 w-full items-center justify-between rounded-xl bg-[#c9433b] px-4 py-2.5 text-sm font-black text-white shadow-[0_6px_0_#a9322c,0_12px_22px_rgba(169,50,44,0.22)] transition enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-[0_2px_0_#a9322c] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
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
                priority
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

  const safeProgressTotal = Math.max(1, progressTotal);
  const progressPercent = Math.min(100, Math.max(8, (progressValue / safeProgressTotal) * 100));

  return (
    <section
      className="relative text-slate-900"
      aria-labelledby="practice-adventure-title"
      data-practice-mode="explore"
    >
      <div id="practice-adventure-hero" className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
        <div className="relative min-h-[390px] rounded-[16px] border border-white/70 bg-white p-6 shadow-[0_22px_46px_rgba(15,23,42,0.14)] sm:p-9">
          <div className="flex items-start justify-between gap-4 sm:gap-5">
            <h1 id="practice-adventure-title" tabIndex={-1} className="min-w-0 max-w-[12ch] text-4xl font-black leading-[0.98] tracking-normal text-blue-950 focus:outline-none sm:max-w-[14ch] sm:text-6xl lg:text-[3.9rem]">
              {t({
                en: "Practice Arena — Free Exploration",
                zh: "練習競技場－自由探索",
                zhHans: "练习竞技场－自由探索"
              })}
            </h1>
            <div className="grid size-14 shrink-0 rotate-0 place-items-center rounded-3xl border-4 border-white bg-yellow-300 text-amber-500 shadow-xl sm:size-16 sm:rotate-12">
              <StarIcon className="size-9 sm:size-10" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-black leading-tight text-emerald-600">
            {t({ en: "Mission Practice", zh: "練習競技場", zhHans: "练习竞技场" })}
          </p>
          <p className="mt-6 max-w-[34rem] text-lg font-semibold leading-7 text-slate-700">
            {t({
              en: "Embark on math missions, solve challenges, and collect stars as you level up your skills.",
              zh: "完成數學任務、挑戰題目，收集星星並提升你的能力。",
              zhHans: "完成数学任务、挑战题目，收集星星并提升你的能力。"
            })}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onStartMission}
              data-tour="student-practice-start"
              className="focus-ring inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#ff5a4f] px-8 text-xl font-black text-white shadow-[0_10px_0_#dc3f37,0_18px_32px_rgba(220,63,55,0.25)] transition hover:-translate-y-0.5 active:translate-y-0"
            >
              <UnitExerciseIcon />{t({ en: "Start Mission", zh: "開始任務", zhHans: "开始任务" })}
            </button>
            <button
              type="button"
              data-adjust-practice
              onClick={handleAdjustPractice}
              className="focus-ring min-h-11 rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5"
            >
              {t({ en: "Choose mode", zh: "選擇模式", zhHans: "选择模式" })}
            </button>
          </div>
        </div>

        <div data-tour="student-practice-map" className="relative min-h-[390px] overflow-hidden rounded-[18px] shadow-[0_18px_42px_rgba(8,47,73,0.18)]">
          <Image src={islandMap} alt={t({ en: "Adventure island map with math mission landmarks", zh: "包含數學任務地標的探險島地圖", zhHans: "包含数学任务地标的探险岛地图" })} fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover object-[58%_50%] lg:object-center" priority />
          {regions.map((status) => (
            <button
              key={status.region.id}
              type="button"
              data-island-region-pin={status.region.id}
              onClick={() => onRegionSelect(status.region.id)}
              aria-label={regionButtonLabel(t, status)}
              title={t(status.region.subtitle)}
              className={cn(
                "focus-ring absolute hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-lg transition hover:scale-105",
                status.region.pinClassName,
                status.region.pinWideOnly ? "min-[1800px]:block" : "lg:block",
                status.locked ? "opacity-80" : null,
                pulseRegionId === status.region.id ? regionPulseClassName : null
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                {status.locked ? <LockIcon className="size-4 text-slate-500" /> : null}
                {t(status.region.label)}
              </span>
              <span className="mt-1 block">
                <RegionStars stars={status.stars} />
              </span>
            </button>
          ))}
          {islandGameMarkers.map((marker) => {
            const unlocked = games[marker.unlockedKey];
            return unlocked ? (
              <a
                key={marker.id}
                href={marker.href}
                aria-label={islandGameMarkerLabel(t, marker, true)}
                data-testid={`island-game-${marker.id}`}
                className={cn(
                  "focus-ring absolute hidden -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-lg transition hover:scale-105 lg:block",
                  marker.pinClassName
                )}
              >
                <span className="flex items-center gap-1.5"><PlayIcon className="size-4" />{t(marker.label)}</span>
              </a>
            ) : (
              <div
                key={marker.id}
                role="img"
                aria-label={islandGameMarkerLabel(t, marker, false)}
                title={t(islandGameLockedHint)}
                data-testid={`island-game-${marker.id}`}
                className={cn(
                  "absolute hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300/80 bg-white/80 px-4 py-2 text-sm font-black text-slate-500 shadow-md backdrop-blur-sm lg:block",
                  marker.pinClassName
                )}
              >
                <span className="flex items-center gap-1.5"><LockIcon className="size-4" />{t(marker.label)}</span>
              </div>
            );
          })}
          <div className="absolute bottom-5 right-5 rounded-2xl border border-sky-200 bg-white/95 px-5 py-4 shadow-xl backdrop-blur sm:px-6">
            <p className="text-sm font-black text-blue-950">{t({ en: "Island Progress", zh: "島嶼進度", zhHans: "岛屿进度" })}</p>
            <div className="mt-2 flex items-center gap-4">
              <span className="flex items-center gap-2 text-2xl font-black text-slate-800"><span className="text-amber-400"><StarIcon /></span>{progressValue} / {safeProgressTotal}</span>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 sm:w-28">
                <div className="h-full rounded-full bg-yellow-400" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-white/70 bg-white/85 p-3 shadow-[0_14px_30px_rgba(15,23,42,0.10)] backdrop-blur sm:p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-base font-black text-blue-950 sm:text-lg">
            {t({ en: "Island quests", zh: "島嶼任務", zhHans: "岛屿任务" })}
          </h2>
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
            {t({
              en: `${progressValue} of ${safeProgressTotal} stars`,
              zh: `已獲 ${progressValue}/${safeProgressTotal} 星`,
              zhHans: `已获 ${progressValue}/${safeProgressTotal} 星`
            })}
          </span>
        </div>
        <div
          role="group"
          aria-label={t({ en: "Island regions", zh: "島嶼區域", zhHans: "岛屿区域" })}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {regions.map((status) => {
            const tone = resolveRegionQuestTone(status);
            const starPercent = Math.round((Math.min(status.stars, practiceIslandMaxStarsPerRegion) / practiceIslandMaxStarsPerRegion) * 100);
            return (
              <button
                key={status.region.id}
                type="button"
                data-island-region-chip={status.region.id}
                data-island-region-quest-tone={tone}
                onClick={() => onRegionSelect(status.region.id)}
                aria-label={regionButtonLabel(t, status)}
                title={t(status.region.subtitle)}
                className={cn(
                  "focus-ring group flex flex-col gap-3 rounded-2xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_24px_-18px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_16px_30px_-18px_rgba(15,23,42,0.6)]",
                  tone === "recommended" ? "border-amber-300 ring-1 ring-amber-300" : "border-sky-100",
                  status.locked ? "opacity-75" : null,
                  pulseRegionId === status.region.id ? regionPulseClassName : null
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl border",
                      tone === "recommended"
                        ? "border-amber-200 bg-amber-50 text-amber-600"
                        : tone === "complete"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                          : "border-sky-100 bg-sky-50 text-blue-600"
                    )}
                  >
                    {status.locked ? <LockIcon className="size-5 text-slate-500" /> : <RegionQuestIcon regionId={status.region.id} />}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide",
                      tone === "recommended"
                        ? "bg-amber-100 text-amber-800"
                        : tone === "complete"
                          ? "bg-emerald-100 text-emerald-700"
                          : tone === "progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {tone === "recommended" ? <StarIcon className="size-3" /> : null}
                    {regionQuestBadgeLabel(t, tone)}
                  </span>
                </span>
                <span className="block">
                  <span className="block text-[0.95rem] font-black leading-snug text-blue-950">{t(status.region.label)}</span>
                  <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">{t(status.region.subtitle)}</span>
                </span>
                <span className="block h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={cn(
                      "block h-full rounded-full transition-[width] duration-500",
                      tone === "complete" ? "bg-emerald-500" : "bg-amber-400"
                    )}
                    style={{ width: `${starPercent}%` }}
                  />
                </span>
                <span className="flex items-center justify-between gap-2">
                  <RegionStars stars={status.stars} starClassName="size-4" />
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition",
                      tone === "recommended"
                        ? "bg-amber-400 text-amber-950 group-hover:bg-amber-300"
                        : tone === "locked"
                          ? "bg-slate-100 text-slate-600"
                          : tone === "complete"
                            ? "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                            : "bg-blue-600 text-white group-hover:bg-blue-500"
                    )}
                  >
                    {regionQuestActionLabel(t, tone)}
                    {tone === "locked" ? null : <PlayIcon className="size-3.5" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {islandGameMarkers.map((marker) => {
            const unlocked = games[marker.unlockedKey];
            return unlocked ? (
              <a
                key={marker.id}
                href={marker.href}
                aria-label={islandGameMarkerLabel(t, marker, true)}
                data-testid={`island-game-chip-${marker.id}`}
                className="focus-ring flex min-h-11 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
              >
                <PlayIcon className="size-4" />
                {t(marker.label)}
              </a>
            ) : (
              <span
                key={marker.id}
                role="img"
                aria-label={islandGameMarkerLabel(t, marker, false)}
                title={t(islandGameLockedHint)}
                data-testid={`island-game-chip-${marker.id}`}
                className="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-black text-slate-500 shadow-sm"
              >
                <LockIcon className="size-4" />
                {t(marker.label)}
              </span>
            );
          })}
        </div>
        <p aria-live="polite" className={cn("text-sm font-bold text-blue-950/85", regionNotice ? "mt-3" : "sr-only")}>
          {regionNotice ?? ""}
        </p>
      </div>
    </section>
  );
}
