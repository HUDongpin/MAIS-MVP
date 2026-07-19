import Image from "next/image";
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

type PracticeAdventureArenaShellProps = {
  t: (localized: LocalizedText) => string;
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

function PracticeIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M5 19 19 5M7 5l12 12M4 20l4-1-3-3-1 4ZM17 3l4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
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

export function PracticeAdventureArenaShell({
  t,
  progressValue,
  progressTotal,
  regions,
  games,
  pulseRegionId = null,
  regionNotice,
  onStartMission,
  onRegionSelect
}: PracticeAdventureArenaShellProps) {
  const safeProgressTotal = Math.max(1, progressTotal);
  const progressPercent = Math.min(100, Math.max(8, (progressValue / safeProgressTotal) * 100));

  return (
    <section className="relative text-slate-900" aria-labelledby="practice-adventure-title">
      <div id="practice-adventure-hero" className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
        <div className="relative min-h-[390px] rounded-[16px] border border-white/70 bg-white p-6 shadow-[0_22px_46px_rgba(15,23,42,0.14)] sm:p-9">
          <div className="flex items-start justify-between gap-4 sm:gap-5">
            <h1 id="practice-adventure-title" className="min-w-0 max-w-[9ch] text-4xl font-black leading-[0.98] tracking-normal text-blue-950 sm:max-w-[11ch] sm:text-6xl lg:text-[3.9rem]">
              Practice Arena
            </h1>
            <div className="grid size-14 shrink-0 rotate-12 place-items-center rounded-3xl border-4 border-white bg-yellow-300 text-amber-500 shadow-xl sm:size-16">
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
              className="focus-ring inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#ff5a4f] px-8 text-xl font-black text-white shadow-[0_10px_0_#dc3f37,0_18px_32px_rgba(220,63,55,0.25)] transition hover:-translate-y-0.5 active:translate-y-0"
            >
              <PracticeIcon />{t({ en: "Start Mission", zh: "開始任務", zhHans: "开始任务" })}
            </button>
          </div>
        </div>

        <div className="relative min-h-[390px] overflow-hidden rounded-[18px] shadow-[0_18px_42px_rgba(8,47,73,0.18)]">
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
        <div role="group" aria-label={t({ en: "Island regions", zh: "島嶼區域", zhHans: "岛屿区域" })} className="flex flex-wrap items-center gap-2">
          {regions.map((status) => (
            <button
              key={status.region.id}
              type="button"
              data-island-region-chip={status.region.id}
              onClick={() => onRegionSelect(status.region.id)}
              aria-label={regionButtonLabel(t, status)}
              title={t(status.region.subtitle)}
              className={cn(
                "focus-ring flex min-h-11 items-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 shadow-sm transition hover:-translate-y-0.5",
                status.locked ? "opacity-75" : null,
                pulseRegionId === status.region.id ? regionPulseClassName : null
              )}
            >
              {status.locked ? <LockIcon className="size-4 text-slate-500" /> : null}
              <span className="text-sm font-black text-blue-950">{t(status.region.label)}</span>
              <RegionStars stars={status.stars} starClassName="size-3.5" />
            </button>
          ))}
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
