import Image from "next/image";
import type { LocalizedText } from "@/types";
import { cn } from "@/lib/utils";
import islandMap from "./assets/math-adventure-island-map.png";

type PracticeAdventureArenaShellProps = {
  t: (localized: LocalizedText) => string;
  progressValue: number;
  progressTotal: number;
  onStartMission: () => void;
};

const mapLabels = [
  { label: "Algebra Peaks", className: "left-[25%] top-[21%]" },
  { label: "Geometry Garden", className: "left-[68%] top-[21%]" },
  { label: "Number Forest", className: "left-[18%] top-[55%]" },
  { label: "Question Cavern", className: "left-[50%] top-[53%]" },
  { label: "Master's Keep", className: "left-[78%] top-[57%]" },
  { label: "Challenge Shore", className: "left-[58%] top-[78%]", wideOnly: true }
];

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

export function PracticeAdventureArenaShell({
  t,
  progressValue,
  progressTotal,
  onStartMission
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
          {mapLabels.map((item) => (
            <div
              key={item.label}
              className={cn(
                "absolute hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-lg",
                item.className,
                item.wideOnly ? "min-[1800px]:block" : "lg:block"
              )}
            >
              {item.label}
              <div className="mt-1 flex justify-center gap-0.5 text-amber-400">
                <StarIcon className="size-4" />
                <StarIcon className="size-4" />
                <StarIcon className="size-4 opacity-45" />
              </div>
            </div>
          ))}
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
    </section>
  );
}
