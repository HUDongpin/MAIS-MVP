import Image from "next/image";
import type { GradeId, LocalizedText } from "@/types";
import { cn } from "@/lib/utils";
import islandMap from "./assets/math-adventure-island-map.png";

export type PracticeAdventureTopicTone = "green" | "blue" | "amber" | "violet";
export type PracticeAdventureTopicIcon = "pie" | "equation" | "geometry" | "fraction";

export type PracticeAdventureGradeChip = {
  id: GradeId;
  label: string;
};

export type PracticeAdventureTopicCard = {
  id: string;
  title: string;
  gradeLabel: string;
  missionCount: number;
  progressPercent: number;
  stars: number;
  tone: PracticeAdventureTopicTone;
  icon: PracticeAdventureTopicIcon;
};

type PracticeAdventureArenaShellProps = {
  t: (localized: LocalizedText) => string;
  gradeChips: PracticeAdventureGradeChip[];
  activeGradeId: GradeId;
  gradeSelectionDisabled?: boolean;
  topicCards: PracticeAdventureTopicCard[];
  selectedTopicId: string;
  progressValue: number;
  progressTotal: number;
  accuracyPercent: number;
  streakDays: number;
  onSelectGrade: (gradeId: GradeId) => void;
  onSelectTopic: (topicId: string) => void;
  onStartMission: () => void;
  onChooseTopic: () => void;
};

const mapLabels = [
  { label: "Algebra Peaks", className: "left-[25%] top-[21%]" },
  { label: "Geometry Garden", className: "left-[68%] top-[21%]" },
  { label: "Number Forest", className: "left-[18%] top-[55%]" },
  { label: "Question Cavern", className: "left-[50%] top-[53%]" },
  { label: "Master's Keep", className: "left-[78%] top-[57%]" },
  { label: "Challenge Shore", className: "left-[58%] top-[78%]", wideOnly: true }
];

const toneClasses: Record<PracticeAdventureTopicTone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-600",
  blue: "border-sky-200 bg-sky-50 text-cyan-500",
  amber: "border-amber-200 bg-amber-50 text-amber-400",
  violet: "border-violet-200 bg-violet-50 text-violet-400"
};

const progressToneClasses: Record<PracticeAdventureTopicTone, string> = {
  green: "bg-emerald-500",
  blue: "bg-emerald-500",
  amber: "bg-amber-400",
  violet: "bg-violet-400"
};

function HomeIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M4 10.8 12 4l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.2Z" fill="currentColor" />
    </svg>
  );
}

function PracticeIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M5 19 19 5M7 5l12 12M4 20l4-1-3-3-1 4ZM17 3l4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function FlagIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M5 21V5M6 5h10l-1.2 3L16 11H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
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

function TopicIcon({ icon }: { icon: PracticeAdventureTopicIcon }) {
  if (icon === "equation") {
    return <span className="grid size-11 place-items-center rounded-2xl bg-cyan-400 text-lg font-black text-white shadow-lg shadow-cyan-700/20">x+3</span>;
  }
  if (icon === "geometry") {
    return <span className="block size-0 border-x-[22px] border-b-[38px] border-x-transparent border-b-amber-400 drop-shadow-lg" aria-hidden="true" />;
  }
  if (icon === "fraction") {
    return <span className="grid size-11 place-items-center rounded-full bg-violet-400 text-base font-black text-white shadow-lg shadow-violet-700/20">1/2</span>;
  }
  return (
    <span className="relative grid size-12 place-items-center rounded-full bg-emerald-400 shadow-lg shadow-emerald-700/20" aria-hidden="true">
      <span className="absolute inset-2 rounded-full border-[10px] border-emerald-600 border-r-white/70" />
    </span>
  );
}

export function PracticeAdventureArenaShell({
  t,
  gradeChips,
  activeGradeId,
  gradeSelectionDisabled = false,
  topicCards,
  selectedTopicId,
  progressValue,
  progressTotal,
  accuracyPercent,
  streakDays,
  onSelectGrade,
  onSelectTopic,
  onStartMission,
  onChooseTopic
}: PracticeAdventureArenaShellProps) {
  const safeProgressTotal = Math.max(1, progressTotal);
  const progressPercent = Math.min(100, Math.max(8, (progressValue / safeProgressTotal) * 100));
  const visibleTopics = topicCards.length ? topicCards.slice(0, 4) : [];

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
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onStartMission}
              className="focus-ring inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#ff5a4f] px-8 text-xl font-black text-white shadow-[0_10px_0_#dc3f37,0_18px_32px_rgba(220,63,55,0.25)] transition hover:-translate-y-0.5 active:translate-y-0"
            >
              <PracticeIcon />{t({ en: "Start Mission", zh: "開始任務", zhHans: "开始任务" })}
            </button>
            <button
              type="button"
              onClick={onChooseTopic}
              className="focus-ring inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-blue-500 bg-white px-8 text-xl font-black text-blue-600 shadow-[0_8px_20px_rgba(37,99,235,0.12)] transition hover:-translate-y-0.5 active:translate-y-0"
            >
              <HomeIcon />{t({ en: "Choose Topic", zh: "選擇課題", zhHans: "选择课题" })}
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

      <section className="mt-8 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-[0_22px_46px_rgba(15,23,42,0.12)] sm:p-5">
        <div className="flex items-center gap-3 overflow-x-auto pb-2" aria-label={t({ en: "Select grade", zh: "選擇年級", zhHans: "选择年级" })}>
          <span className="shrink-0 px-5 py-4 text-2xl font-black leading-none text-blue-950 sm:text-3xl">{t({ en: "Select Grade", zh: "選擇年級", zhHans: "选择年级" })}</span>
          {gradeChips.map((grade) => (
            <button
              key={grade.id}
              type="button"
              disabled={gradeSelectionDisabled}
              onClick={() => onSelectGrade(grade.id)}
              className={cn(
                "focus-ring min-h-16 shrink-0 rounded-2xl border px-7 text-2xl font-black shadow-sm disabled:cursor-not-allowed disabled:opacity-75 sm:px-8 sm:text-3xl",
                grade.id === activeGradeId ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"
              )}
            >
              {grade.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
          <div id="adventure-topic-missions" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-2xl font-black text-blue-950"><span className="text-[#ff5a4f]"><FlagIcon /></span>{t({ en: "Topic Missions", zh: "課題任務", zhHans: "课题任务" })}</h2>
              <button type="button" onClick={onChooseTopic} className="focus-ring rounded-full px-3 py-2 text-sm font-bold text-blue-600">{t({ en: "View all", zh: "查看全部", zhHans: "查看全部" })}</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleTopics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => onSelectTopic(topic.id)}
                  className={cn(
                    "focus-ring min-h-[210px] rounded-2xl border p-5 text-left shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-1",
                    toneClasses[topic.tone],
                    selectedTopicId === topic.id ? "ring-4 ring-blue-300/55" : ""
                  )}
                >
                  <TopicIcon icon={topic.icon} />
                  <h3 className="mt-5 min-h-[3rem] text-lg font-black leading-snug text-blue-950">{topic.title}</h3>
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    {topic.gradeLabel} · {topic.missionCount} {t({ en: "Missions", zh: "個任務", zhHans: "个任务" })}
                  </p>
                  <div className="mt-4 flex gap-1 text-amber-400">
                    {Array.from({ length: 3 }, (_, index) => (
                      <StarIcon key={index} className={cn("size-5", index < topic.stars ? "" : "text-slate-300")} />
                    ))}
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                    <div className={cn("h-full rounded-full", progressToneClasses[topic.tone])} style={{ width: `${topic.progressPercent}%` }} />
                  </div>
                  <p className="mt-2 text-right text-sm font-black text-slate-600">{topic.progressPercent}%</p>
                </button>
              ))}
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-base font-black text-emerald-800">{t({ en: "Current Streak", zh: "連續練習", zhHans: "连续练习" })}</p>
              <p className="mt-3 text-5xl font-black text-emerald-700">{streakDays} <span className="text-xl">{t({ en: "days", zh: "天", zhHans: "天" })}</span></p>
              <p className="mt-2 font-semibold text-emerald-800">{t({ en: "Keep it going!", zh: "保持節奏！", zhHans: "保持节奏！" })}</p>
            </div>
            <div className="rounded-3xl bg-amber-50 p-5 shadow-sm">
              <p className="text-base font-black text-orange-700">{t({ en: "Accuracy", zh: "準確率", zhHans: "准确率" })}</p>
              <p className="mt-3 text-5xl font-black text-slate-700">{accuracyPercent}%</p>
              <p className="mt-2 font-semibold text-emerald-700">{t({ en: "Nice work!", zh: "做得好！", zhHans: "做得好！" })}</p>
              <svg aria-hidden="true" viewBox="0 0 120 54" className="mt-2 h-12 w-full text-emerald-500">
                <path d="M8 42 34 29l18 8 22-25 13 12 25-18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
              </svg>
            </div>
          </aside>
        </div>

      </section>
    </section>
  );
}
