"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { StudentBadgeLogo } from "@/components/gamification/StudentBadgeLogo";
import { useSettings } from "@/components/providers/AppProviders";
import { localeForLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LocalizedText } from "@/types";

type PreviewMode = "new" | "active" | "pending";
type QuestKind = "practice" | "lesson" | "mistake";
type RewardKind = "pencil" | "puzzle" | "geometry" | "notebook";

type PreviewState = {
  badgeProgress: Record<string, number>;
  earnedBadgeIds: string[];
  level: number;
  levelTitle: LocalizedText;
  points: number;
  questProgress: Record<QuestKind, number>;
  reserved: number;
  streak: number;
  xp: number;
  xpGoal: number;
  xpIntoLevel: number;
};

type RewardPreview = {
  category: LocalizedText;
  description: LocalizedText;
  id: string;
  kind: RewardKind;
  name: LocalizedText;
  pointsCost: number;
};

type StatusMessage = {
  tone: "info" | "success";
  text: string;
};

const previewModeOptions: Array<{ id: PreviewMode; label: LocalizedText; detail: LocalizedText }> = [
  {
    id: "new",
    label: { en: "New learner", zh: "新學習者", zhHans: "新学习者" },
    detail: { en: "Level 1 · 0 XP · 0 points", zh: "第 1 級 · 0 XP · 0 積分", zhHans: "第 1 级 · 0 XP · 0 积分" }
  },
  {
    id: "active",
    label: { en: "Active learner", zh: "持續學習中", zhHans: "持续学习中" },
    detail: { en: "Progress, badges, and an affordable reward", zh: "已有進度、徽章與可兌換獎勵", zhHans: "已有进度、徽章与可兑换奖励" }
  },
  {
    id: "pending",
    label: { en: "Reward pending", zh: "獎勵審批中", zhHans: "奖励审批中" },
    detail: { en: "Points reserved for teacher review", zh: "積分已預留，等待教師審批", zhHans: "积分已预留，等待教师审批" }
  }
];

const previewStates: Record<PreviewMode, PreviewState> = {
  new: {
    badgeProgress: { "first-lesson": 0, "accuracy-builder": 0, "three-day-rhythm": 0, "mistake-repair": 0 },
    earnedBadgeIds: [],
    level: 1,
    levelTitle: { en: "Starter", zh: "起步探索者", zhHans: "起步探索者" },
    points: 0,
    questProgress: { lesson: 0, mistake: 0, practice: 0 },
    reserved: 0,
    streak: 0,
    xp: 0,
    xpGoal: 200,
    xpIntoLevel: 0
  },
  active: {
    badgeProgress: { "first-lesson": 1, "accuracy-builder": 3, "three-day-rhythm": 6, "mistake-repair": 0 },
    earnedBadgeIds: ["first-lesson", "accuracy-builder", "three-day-rhythm"],
    level: 3,
    levelTitle: { en: "Pattern Builder", zh: "規律建構者", zhHans: "规律建构者" },
    points: 185,
    questProgress: { lesson: 1, mistake: 0, practice: 2 },
    reserved: 0,
    streak: 6,
    xp: 640,
    xpGoal: 400,
    xpIntoLevel: 140
  },
  pending: {
    badgeProgress: { "first-lesson": 1, "accuracy-builder": 3, "three-day-rhythm": 6, "mistake-repair": 5 },
    earnedBadgeIds: ["first-lesson", "accuracy-builder", "three-day-rhythm", "mistake-repair"],
    level: 3,
    levelTitle: { en: "Pattern Builder", zh: "規律建構者", zhHans: "规律建构者" },
    points: 65,
    questProgress: { lesson: 1, mistake: 1, practice: 3 },
    reserved: 120,
    streak: 7,
    xp: 705,
    xpGoal: 400,
    xpIntoLevel: 205
  }
};

const quests: Array<{
  action: LocalizedText;
  detail: LocalizedText;
  kind: QuestKind;
  points: number;
  target: number;
  title: LocalizedText;
  xp: number;
}> = [
  {
    action: { en: "Start practice", zh: "開始練習", zhHans: "开始练习" },
    detail: { en: "Answer 3 questions carefully", zh: "細心完成 3 題", zhHans: "细心完成 3 题" },
    kind: "practice",
    points: 10,
    target: 3,
    title: { en: "Careful practice", zh: "細心練習", zhHans: "细心练习" },
    xp: 45
  },
  {
    action: { en: "Continue lesson", zh: "繼續課時", zhHans: "继续课时" },
    detail: { en: "Complete one guided lesson step", zh: "完成一個導學步驟", zhHans: "完成一个导学步骤" },
    kind: "lesson",
    points: 15,
    target: 1,
    title: { en: "Lesson step", zh: "課時進度", zhHans: "课时进度" },
    xp: 60
  },
  {
    action: { en: "Review a mistake", zh: "訂正錯題", zhHans: "订正错题" },
    detail: { en: "Repair one answer and explain why", zh: "訂正一題並說明原因", zhHans: "订正一题并说明原因" },
    kind: "mistake",
    points: 10,
    target: 1,
    title: { en: "Repair one mistake", zh: "修正一個錯誤", zhHans: "修正一个错误" },
    xp: 35
  }
];

const rewards: RewardPreview[] = [
  {
    category: { en: "Stationery", zh: "文具", zhHans: "文具" },
    description: { en: "A colorful set for showing your math thinking.", zh: "用色彩整理及展示數學思路。", zhHans: "用色彩整理及展示数学思路。" },
    id: "pencil-studio-set",
    kind: "pencil",
    name: { en: "Pencil Studio Set", zh: "繽紛鉛筆套裝", zhHans: "缤纷铅笔套装" },
    pointsCost: 120
  },
  {
    category: { en: "Learning game", zh: "學習遊戲", zhHans: "学习游戏" },
    description: { en: "Quick pattern puzzles to solve with friends.", zh: "與同學一起破解規律小謎題。", zhHans: "与同学一起破解规律小谜题。" },
    id: "pattern-puzzle-cards",
    kind: "puzzle",
    name: { en: "Pattern Puzzle Cards", zh: "規律解謎卡", zhHans: "规律解谜卡" },
    pointsCost: 180
  },
  {
    category: { en: "Learning kit", zh: "學習套裝", zhHans: "学习套装" },
    description: { en: "Build, measure, and explore shapes hands-on.", zh: "動手拼砌、測量與探索圖形。", zhHans: "动手拼搭、测量与探索图形。" },
    id: "geometry-maker-kit",
    kind: "geometry",
    name: { en: "Geometry Maker Kit", zh: "幾何創作套裝", zhHans: "几何创作套装" },
    pointsCost: 260
  },
  {
    category: { en: "Stationery", zh: "文具", zhHans: "文具" },
    description: { en: "A grid notebook for diagrams and problem solving.", zh: "適合畫圖與解題的方格筆記簿。", zhHans: "适合画图与解题的方格笔记本。" },
    id: "math-grid-notebook",
    kind: "notebook",
    name: { en: "Math Grid Notebook", zh: "數學方格筆記簿", zhHans: "数学方格笔记本" },
    pointsCost: 320
  }
];

const badges = [
  {
    description: { en: "Complete your first tracked lesson", zh: "完成第一個有紀錄的課時", zhHans: "完成第一个有记录的课时" },
    id: "first-lesson",
    name: { en: "First Lesson Complete", zh: "完成第一課", zhHans: "完成第一课" },
    target: 1
  },
  {
    description: { en: "Answer 3 questions accurately", zh: "準確完成 3 題", zhHans: "准确完成 3 题" },
    id: "accuracy-builder",
    name: { en: "Accuracy Builder", zh: "準確達人", zhHans: "准确达人" },
    target: 3
  },
  {
    description: { en: "Keep a 3-day learning rhythm", zh: "保持連續 3 天學習節奏", zhHans: "保持连续 3 天学习节奏" },
    id: "three-day-rhythm",
    name: { en: "Three-Day Rhythm", zh: "三日節奏", zhHans: "三日节奏" },
    target: 3
  },
  {
    description: { en: "Review five mistake-book items", zh: "重溫五項錯題簿內容", zhHans: "复习五项错题本内容" },
    id: "mistake-repair",
    name: { en: "Mistake Repair", zh: "錯題修復", zhHans: "错题修复" },
    target: 5
  }
] satisfies Array<{ description: LocalizedText; id: string; name: LocalizedText; target: number }>;

function safePercent(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function SparkleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l1.5 5.1L18 9l-4.5 1.9L12 16l-1.5-5.1L6 9l4.5-1.9L12 2z" />
      <path d="M5 14l.8 2.7L8 18l-2.2 1.3L5 22l-.8-2.7L2 18l2.2-1.3L5 14z" />
      <path d="M19 13l.6 2 1.9 1-.9 2-.6 2-.7-2-1.8-1 .9-2 .6-2z" />
    </svg>
  );
}

function CoinIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="7" rx="6.5" ry="3" />
      <path d="M5.5 7v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3V7" />
      <path d="M5.5 12v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-5" />
    </svg>
  );
}

function FlameIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.6 2.8c.5 3.4-1 5.1-2.6 6.7-1.3 1.4-2.4 2.6-2 4.8.7-1.2 1.6-2 2.7-2.8-.2 2.3.8 3.5 2.1 4.7.8-.8 1.4-1.9 1.5-3.5 1.5 1.5 2.3 3.1 1.9 5-1 3.6-4.4 4.8-7.4 3.8-3.6-1.2-5.4-5-4.1-8.5 1.1-3 4-4.9 5.1-8.5.9 1.5 1.4 2.7 1.4 4.1 1.1-1.5 1.6-3.1 1.4-5.8z" />
    </svg>
  );
}

function GiftIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h16v10H4z" />
      <path d="M3 7h18v4H3zM12 7v13" />
      <path d="M12 7H8.8A2.8 2.8 0 1 1 12 3.3V7zM12 7h3.2A2.8 2.8 0 1 0 12 3.3V7z" />
    </svg>
  );
}

function QuestIcon({ kind }: { kind: QuestKind }) {
  if (kind === "lesson") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5z" />
        <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5z" />
      </svg>
    );
  }

  if (kind === "mistake") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20l4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20z" />
        <path d="M13.8 7l3.2 3.2M4.5 11.5l2.2 2.2 4.4-5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function RewardIllustration({ kind }: { kind: RewardKind }) {
  const common = "h-16 w-16";

  if (kind === "pencil") {
    return (
      <svg aria-hidden="true" viewBox="0 0 72 72" className={common}>
        <rect x="13" y="17" width="46" height="38" rx="13" fill="#ffffff" opacity="0.82" />
        <path d="M23 49l5-28 7 2-5 28z" fill="#f97316" />
        <path d="M35 49l2-29 7 .5-2 29z" fill="#06b6d4" />
        <path d="M46 49l-2-27 7-.5 2 27z" fill="#8b5cf6" />
        <path d="M28 21l4-5 3 7M37 20l4-5 3 5.5M44 22l3-6 4 5.5" fill="#fde68a" />
      </svg>
    );
  }

  if (kind === "puzzle") {
    return (
      <svg aria-hidden="true" viewBox="0 0 72 72" className={common}>
        <path d="M16 18h18v12c0 3 4 4 4 0 0-6 4-9 9-9s9 4 9 9-3 9-9 9c-4 0-3 5 0 5h9v12H38c0-6-4-9-9-9s-9 3-9 9h-4V38c6 0 9-4 9-9s-3-9-9-9v-2z" fill="#ffffff" opacity="0.84" />
        <path d="M16 18h18v12M56 44v12H38M16 38v18h4" fill="none" stroke="#0f766e" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="43" cy="29" r="8" fill="#fbbf24" />
        <circle cx="29" cy="55" r="7" fill="#38bdf8" />
      </svg>
    );
  }

  if (kind === "geometry") {
    return (
      <svg aria-hidden="true" viewBox="0 0 72 72" className={common}>
        <circle cx="27" cy="34" r="16" fill="#ffffff" opacity="0.78" stroke="#0ea5e9" strokeWidth="4" />
        <path d="M40 51l14-31 10 31H40z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="4" strokeLinejoin="round" />
        <path d="M14 56h45" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" />
        <path d="M20 52v8M29 52v8M38 52v8M47 52v8" stroke="#7c3aed" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 72 72" className={common}>
      <rect x="17" y="12" width="40" height="48" rx="7" fill="#ffffff" opacity="0.84" stroke="#2563eb" strokeWidth="4" />
      <path d="M25 22h24M25 31h24M25 40h24M25 49h24M33 17v38M41 17v38" stroke="#93c5fd" strokeWidth="2" />
      <path d="M13 20h9M13 31h9M13 42h9M13 53h9" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ProgressBar({ label, percent, tone = "cyan" }: { label: string; percent: number; tone?: "amber" | "cyan" | "emerald" }) {
  const fill = tone === "amber" ? "bg-amber-400" : tone === "emerald" ? "bg-emerald-400" : "bg-cyan-500";

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10"
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", fill)} style={{ width: `${percent}%` }} />
    </div>
  );
}

function LevelRing({ label, level, percent }: { label: string; level: number; percent: number }) {
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center">
      <svg aria-hidden="true" viewBox="0 0 104 104" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="52" cy="52" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-blue-100 dark:text-white/10" />
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="text-blue-600 transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none dark:text-blue-400"
        />
      </svg>
      <span className="relative text-center">
        <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-200">{label}</span>
        <span className="mt-0.5 block text-4xl font-black tabular-nums text-slate-950 dark:text-white">{level}</span>
      </span>
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-h-16 min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-black tabular-nums text-slate-950 dark:text-white">{value}</span>
        <span className="block truncate text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
      </span>
    </div>
  );
}

function RewardCard({
  availablePoints,
  item,
  onEarn,
  onRequest,
  pending,
  text,
  t
}: {
  availablePoints: number;
  item: RewardPreview;
  onEarn: (item: RewardPreview) => void;
  onRequest: (item: RewardPreview, trigger: HTMLButtonElement) => void;
  pending: boolean;
  text: ReturnType<typeof useSettings>["text"];
  t: ReturnType<typeof useSettings>["t"];
}) {
  const canRequest = availablePoints >= item.pointsCost && !pending;
  const pointsNeeded = Math.max(0, item.pointsCost - availablePoints);
  const percent = safePercent(Math.min(availablePoints, item.pointsCost), item.pointsCost);

  return (
    <article className="group flex min-w-0 flex-col rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-3.5 shadow-[0_8px_24px_rgba(30,64,110,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(30,64,110,0.11)] motion-reduce:transform-none dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-100 via-white to-amber-100 ring-1 ring-cyan-100 dark:from-cyan-400/20 dark:via-white/10 dark:to-amber-300/20 dark:ring-white/10">
          <RewardIllustration kind={item.kind} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.13em] text-cyan-700 dark:text-cyan-200">{text(item.category)}</p>
          <h4 className="mt-1 break-words text-base font-black leading-tight text-slate-950 dark:text-white">{text(item.name)}</h4>
          <p className="mt-1.5 flex items-center gap-1 text-sm font-black tabular-nums text-amber-700 dark:text-amber-300"><CoinIcon className="h-4 w-4" /> {item.pointsCost}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{text(item.description)}</p>
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
          <span>{pending ? t({ en: "Points reserved", zh: "積分已預留", zhHans: "积分已预留" }) : t({ en: `${Math.min(availablePoints, item.pointsCost)} of ${item.pointsCost}`, zh: `${Math.min(availablePoints, item.pointsCost)} / ${item.pointsCost}`, zhHans: `${Math.min(availablePoints, item.pointsCost)} / ${item.pointsCost}` })}</span>
          <span>{pending ? t({ en: "In review", zh: "審批中", zhHans: "审批中" }) : `${percent}%`}</span>
        </div>
        <ProgressBar label={t({ en: `Progress toward ${text(item.name)}`, zh: `${text(item.name)} 兌換進度`, zhHans: `${text(item.name)} 兑换进度` })} percent={pending ? 100 : percent} tone={pending ? "amber" : canRequest ? "emerald" : "cyan"} />
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={(event) => canRequest ? onRequest(item, event.currentTarget) : onEarn(item)}
        className={cn(
          "focus-ring mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-3 text-sm font-black transition motion-reduce:transform-none",
          pending
            ? "cursor-default border border-amber-300/70 bg-amber-100/80 text-amber-800 dark:border-amber-200/25 dark:bg-amber-300/[0.13] dark:text-amber-100"
            : canRequest
              ? "bg-slate-950 text-white hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
              : "border border-cyan-200/90 bg-cyan-50 text-cyan-800 hover:-translate-y-0.5 hover:bg-cyan-100 dark:border-cyan-200/25 dark:bg-cyan-300/[0.1] dark:text-cyan-100"
        )}
      >
        {pending
          ? t({ en: "Pending approval", zh: "等待教師審批", zhHans: "等待教师审批" })
          : canRequest
            ? t({ en: "Request reward", zh: "申請獎勵", zhHans: "申请奖励" })
            : t({ en: `Earn ${pointsNeeded} more`, zh: `再賺 ${pointsNeeded} 積分`, zhHans: `再赚 ${pointsNeeded} 积分` })}
      </button>
    </article>
  );
}

export function ProgressRewardsDesignPreview() {
  const { language, t, text } = useSettings();
  const [mode, setMode] = useState<PreviewMode>("new");
  const [dialogItem, setDialogItem] = useState<RewardPreview | null>(null);
  const [requestedRewardId, setRequestedRewardId] = useState("");
  const [activeSection, setActiveSection] = useState("preview-overview");
  const [showAllRewards, setShowAllRewards] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const requestConfirmedRef = useRef(false);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const statusMessageRef = useRef<HTMLDivElement | null>(null);
  const numberFormat = useMemo(() => new Intl.NumberFormat(localeForLanguage(language)), [language]);
  const baseState = previewStates[mode];
  const simulatedPendingItemId = mode === "pending" ? rewards[0].id : requestedRewardId;
  const simulatedPendingCost = requestedRewardId ? rewards.find((item) => item.id === requestedRewardId)?.pointsCost ?? 0 : 0;
  const availablePoints = Math.max(0, baseState.points - simulatedPendingCost);
  const reservedPoints = baseState.reserved + simulatedPendingCost;
  const xpPercent = safePercent(baseState.xpIntoLevel, baseState.xpGoal);
  const xpRemaining = Math.max(0, baseState.xpGoal - baseState.xpIntoLevel);
  const completedQuestCount = quests.filter((quest) => baseState.questProgress[quest.kind] >= quest.target).length;
  const nextQuestKind = quests.find((quest) => baseState.questProgress[quest.kind] < quest.target)?.kind ?? null;
  const pendingRequestCount = simulatedPendingItemId ? 1 : 0;
  const visibleRewards = showAllRewards ? rewards : rewards.slice(0, 2);

  useEffect(() => {
    if (!dialogItem) return;

    const previousOverflow = document.body.style.overflow;
    const focusableSelector = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDialogItem(null);
        return;
      }
      if (event.key !== "Tab") return;

      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown, true);
    window.requestAnimationFrame(() => focusable()[0]?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
      window.requestAnimationFrame(() => {
        if (requestConfirmedRef.current) statusMessageRef.current?.focus();
        else returnFocusRef.current?.focus();
        requestConfirmedRef.current = false;
      });
    };
  }, [dialogItem]);

  useEffect(() => {
    const sectionIds = ["preview-overview", "preview-goals", "preview-rewards", "preview-achievements", "preview-activity"];
    const sections = sectionIds.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-24% 0px -58% 0px", threshold: [0.05, 0.25, 0.5] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const changeMode = (nextMode: PreviewMode) => {
    setMode(nextMode);
    setDialogItem(null);
    setRequestedRewardId("");
    setStatusMessage(null);
    setShowAllRewards(false);
  };

  const showQuestPreview = (quest: (typeof quests)[number]) => {
    setStatusMessage({
      tone: "info",
      text: t({
        en: `Preview: “${text(quest.title)}” will open the matching learning activity in the live dashboard.`,
        zh: `預覽：正式 Dashboard 會由「${text(quest.title)}」開啟相應學習活動。`,
        zhHans: `预览：正式 Dashboard 会由“${text(quest.title)}”打开相应学习活动。`
      })
    });
  };

  const showEarnPreview = (item: RewardPreview) => {
    const pointsNeeded = Math.max(0, item.pointsCost - availablePoints);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("preview-goals")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setStatusMessage({
      tone: "info",
      text: t({
        en: `${pointsNeeded} more points unlock ${text(item.name)}. Start with today’s first goal.`,
        zh: `再賺 ${pointsNeeded} 積分即可申請「${text(item.name)}」。先完成今日第一個目標吧。`,
        zhHans: `再赚 ${pointsNeeded} 积分即可申请“${text(item.name)}”。先完成今日第一个目标吧。`
      })
    });
  };

  const openRequestDialog = (item: RewardPreview, trigger: HTMLButtonElement) => {
    requestConfirmedRef.current = false;
    returnFocusRef.current = trigger;
    setDialogItem(item);
    setStatusMessage(null);
  };

  const confirmRequest = () => {
    if (!dialogItem) return;
    const item = dialogItem;
    requestConfirmedRef.current = true;
    setRequestedRewardId(item.id);
    setDialogItem(null);
    setStatusMessage({
      tone: "success",
      text: t({
        en: `Preview state: ${text(item.name)} would now be pending teacher approval. No real points were reserved.`,
        zh: `模擬狀態：「${text(item.name)}」此時會等待教師審批；沒有預留任何真實積分。`,
        zhHans: `模拟状态：“${text(item.name)}”此时会等待教师审批；没有预留任何真实积分。`
      })
    });
  };

  return (
    <div className="relative pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(circle_at_14%_12%,rgba(56,189,248,0.17),transparent_28%),radial-gradient(circle_at_84%_8%,rgba(52,211,153,0.15),transparent_30%),radial-gradient(circle_at_62%_35%,rgba(251,191,36,0.11),transparent_22%)] dark:bg-[radial-gradient(circle_at_14%_12%,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_84%_8%,rgba(52,211,153,0.1),transparent_30%),radial-gradient(circle_at_62%_35%,rgba(251,191,36,0.08),transparent_22%)]" />

      <div className="page-container">
        <header className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-700 shadow-sm backdrop-blur dark:border-cyan-200/20 dark:bg-white/[0.06] dark:text-cyan-200">
            <SparkleIcon className="h-4 w-4" /> {t({ en: "MAIS design preview", zh: "MAIS 設計預覽", zhHans: "MAIS 设计预览" })}
          </span>
          <h1 className="mt-5 text-balance text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {t({ en: "One home for progress and rewards", zh: "成長與獎勵，整合在同一個 Dashboard", zhHans: "成长与奖励，整合在同一个 Dashboard" })}
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-pretty text-base font-semibold leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            {t({
              en: "A calm, game-inspired student console that connects Level, XP, daily goals, points, achievements, and teacher-approved rewards without hiding the important parts.",
              zh: "一個清晰而帶遊戲感的學生控制台，把 Level、XP、每日目標、積分、成就與教師審批獎勵自然串連起來。",
              zhHans: "一个清晰而有游戏感的学生控制台，把 Level、XP、每日目标、积分、成就与教师审批奖励自然串联起来。"
            })}
          </p>
        </header>

        <fieldset className="mx-auto mt-7 max-w-4xl rounded-3xl border border-slate-200/80 bg-white/80 p-2 shadow-[0_12px_34px_rgba(30,64,110,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-none">
          <legend className="sr-only">{t({ en: "Preview learner state", zh: "預覽學習狀態", zhHans: "预览学习状态" })}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {previewModeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={mode === option.id}
                onClick={() => changeMode(option.id)}
                className={cn(
                  "focus-ring min-h-16 rounded-2xl px-4 py-3 text-left transition",
                  mode === option.id
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-900/15 dark:bg-cyan-300 dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
                )}
              >
                <span className="block text-sm font-black">{text(option.label)}</span>
                <span className={cn("mt-1 block text-xs font-semibold leading-5", mode === option.id ? "text-white/70 dark:text-slate-700" : "text-slate-500 dark:text-slate-400")}>{text(option.detail)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <p className="mx-auto mt-3 max-w-4xl text-center text-xs font-bold text-slate-500 dark:text-slate-400">
          {t({ en: "Preview only — buttons demonstrate the flow and never change real points or requests.", zh: "僅供預覽——按鈕只示範流程，不會更改真實積分或申請。", zhHans: "仅供预览——按钮只演示流程，不会更改真实积分或申请。" })}
        </p>

        <section aria-labelledby="progress-rewards-preview-title" className="relative isolate mt-9 rounded-[2rem] border border-slate-200/80 bg-[#f8fbff]/95 shadow-[0_24px_70px_rgba(30,64,110,0.14)] dark:border-white/10 dark:bg-[#0b1220]/95 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 rounded-t-[2rem] bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_88%_4%,rgba(16,185,129,0.17),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.72),transparent)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.15),transparent_34%),radial-gradient(circle_at_88%_4%,rgba(16,185,129,0.12),transparent_34%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] opacity-[0.24] dark:opacity-[0.1]" style={{ backgroundImage: "linear-gradient(rgba(14,165,233,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.13) 1px, transparent 1px)", backgroundSize: "44px 44px", maskImage: "linear-gradient(to bottom, black, transparent 46%)" }} />

          <div className="relative p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-200">{t({ en: "Student dashboard", zh: "學生 Dashboard", zhHans: "学生 Dashboard" })}</p>
                <h2 id="progress-rewards-preview-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  {t({ en: "Progress & Rewards", zh: "學習進度與獎勵", zhHans: "学习进度与奖励" })}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  {t({ en: "Build skills, complete goals, and choose rewards.", zh: "完成小目標、累積成長，選擇你的獎勵。", zhHans: "完成小目标、积累成长，选择你的奖励。" })}
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs font-black text-emerald-800 dark:border-emerald-200/20 dark:bg-emerald-300/[0.1] dark:text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {mode === "new"
                  ? t({ en: "Your first mission is ready", zh: "你的第一個任務已準備好", zhHans: "你的第一个任务已准备好" })
                  : mode === "active"
                    ? t({ en: "You’re building momentum", zh: "你正在建立學習動力", zhHans: "你正在建立学习动力" })
                    : t({ en: "Previewing a pending reward", zh: "正在預覽獎勵審批狀態", zhHans: "正在预览奖励审批状态" })}
              </span>
            </header>

            <nav aria-label={t({ en: "Progress and rewards sections", zh: "學習進度與獎勵區域", zhHans: "学习进度与奖励区域" })} className="sticky top-16 z-20 -mx-4 mt-6 overflow-x-auto border-y border-slate-200/70 bg-white/85 px-4 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-2xl lg:border lg:bg-white/65 lg:px-2 lg:dark:bg-white/[0.045]">
              <div className="flex min-w-max items-center gap-1">
                <span className="mr-1 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-violet-200/80 bg-violet-50 px-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-800 dark:border-violet-200/20 dark:bg-violet-300/[0.1] dark:text-violet-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> {t({ en: "Simulation · No data writes", zh: "模擬 · 不會寫入資料", zhHans: "模拟 · 不会写入数据" })}
                </span>
                {[
                  { id: "preview-overview", label: t({ en: "Overview", zh: "總覽", zhHans: "总览" }) },
                  { id: "preview-goals", label: t({ en: "Today’s goals", zh: "今日目標", zhHans: "今日目标" }) },
                  { id: "preview-rewards", label: t({ en: "Reward shop", zh: "獎勵商店", zhHans: "奖励商店" }) },
                  { id: "preview-achievements", label: t({ en: "Achievements", zh: "成就", zhHans: "成就" }) },
                  { id: "preview-activity", label: t({ en: "Activity", zh: "動態", zhHans: "动态" }) }
                ].map((item) => {
                  const active = activeSection === item.id;
                  return (
                  <a key={item.id} href={`#${item.id}`} aria-current={active ? "location" : undefined} onClick={() => setActiveSection(item.id)} className={cn("focus-ring inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-black transition", active ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white")}>{item.label}</a>
                  );
                })}
              </div>
            </nav>

            <section id="preview-overview" aria-labelledby="preview-overview-title" className="scroll-mt-40 pt-5">
              <h3 id="preview-overview-title" className="sr-only">{t({ en: "Overview", zh: "總覽", zhHans: "总览" })}</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                <article className="relative min-w-0 overflow-hidden rounded-[1.55rem] border border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-[0_10px_30px_rgba(37,99,235,0.08)] dark:border-blue-200/15 dark:from-blue-500/[0.14] dark:via-white/[0.045] dark:to-cyan-400/[0.08] dark:shadow-none sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <LevelRing label={t({ en: "Level", zh: "級別", zhHans: "等级" })} level={baseState.level} percent={xpPercent} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-200">{t({ en: "Growth XP", zh: "成長 XP", zhHans: "成长 XP" })}</p>
                      <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{text(baseState.levelTitle)}</p>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <p className="text-lg font-black tabular-nums text-slate-950 dark:text-white">{numberFormat.format(baseState.xpIntoLevel)} <span className="text-sm text-slate-500 dark:text-slate-400">/ {numberFormat.format(baseState.xpGoal)} XP</span></p>
                        <span className="text-xs font-black tabular-nums text-blue-700 dark:text-blue-200">{xpPercent}%</span>
                      </div>
                      <div className="mt-2"><ProgressBar label={t({ en: "Level progress", zh: "級別進度", zhHans: "等级进度" })} percent={xpPercent} /></div>
                      <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                        {xpRemaining > 0
                          ? t({ en: `${numberFormat.format(xpRemaining)} XP to Level ${baseState.level + 1}`, zh: `再累積 ${numberFormat.format(xpRemaining)} XP 升至第 ${baseState.level + 1} 級`, zhHans: `再积累 ${numberFormat.format(xpRemaining)} XP 升至第 ${baseState.level + 1} 级` })
                          : t({ en: "Your next level is ready", zh: "你的下一級已準備好", zhHans: "你的下一级已准备好" })}
                      </p>
                    </div>
                  </div>
                  <a href="#preview-goals" className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700 motion-reduce:transform-none sm:w-auto">
                    {t({ en: "Continue learning", zh: "繼續學習", zhHans: "继续学习" })}
                  </a>
                </article>

                <article className="relative min-w-0 overflow-hidden rounded-[1.55rem] border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 shadow-[0_10px_30px_rgba(5,150,105,0.08)] dark:border-emerald-200/15 dark:from-emerald-500/[0.13] dark:via-white/[0.045] dark:to-amber-400/[0.08] dark:shadow-none sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">{t({ en: "Reward points", zh: "獎勵積分", zhHans: "奖励积分" })}</p>
                      <p className="mt-2 text-5xl font-black tabular-nums tracking-tight text-slate-950 dark:text-white sm:text-6xl">{numberFormat.format(availablePoints)}</p>
                      <p className="mt-1 text-sm font-black text-slate-600 dark:text-slate-300">{t({ en: "available points", zh: "可用積分", zhHans: "可用积分" })}</p>
                    </div>
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-300 text-amber-950 shadow-lg shadow-amber-500/20 ring-4 ring-white/75 dark:ring-white/10"><CoinIcon className="h-8 w-8" /></span>
                  </div>
                  {reservedPoints > 0 || pendingRequestCount > 0 ? (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/80 bg-white/75 p-3 dark:border-white/10 dark:bg-white/[0.055]">
                        <p className="text-xl font-black tabular-nums text-slate-950 dark:text-white">{numberFormat.format(reservedPoints)}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "reserved", zh: "已預留", zhHans: "已预留" })}</p>
                      </div>
                      <div className="rounded-xl border border-white/80 bg-white/75 p-3 dark:border-white/10 dark:bg-white/[0.055]">
                        <p className="text-xl font-black tabular-nums text-slate-950 dark:text-white">{pendingRequestCount}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "in review", zh: "審批中", zhHans: "审批中" })}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-white/80 bg-white/75 p-3 text-sm font-bold leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300">
                      {t({ en: "Complete your first goal to earn points for a reward you choose.", zh: "完成第一個目標，開始累積積分並選擇獎勵。", zhHans: "完成第一个目标，开始积累积分并选择奖励。" })}
                    </div>
                  )}
                  <a href="#preview-rewards" className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-emerald-300/80 bg-white/85 px-5 text-sm font-black text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-50 motion-reduce:transform-none dark:border-emerald-200/25 dark:bg-white/[0.08] dark:text-emerald-100 dark:hover:bg-white/[0.12] sm:w-auto">
                    {t({ en: "Browse rewards", zh: "瀏覽獎勵", zhHans: "浏览奖励" })}
                  </a>
                </article>
              </div>

              <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-3">
                <StatChip icon={<FlameIcon />} label={t({ en: "learning streak", zh: "連續學習", zhHans: "连续学习" })} value={baseState.streak ? t({ en: `${baseState.streak} day${baseState.streak === 1 ? "" : "s"}`, zh: `${baseState.streak} 天`, zhHans: `${baseState.streak} 天` }) : t({ en: "Start today", zh: "今天開始", zhHans: "今天开始" })} />
                <StatChip icon={<SparkleIcon />} label={t({ en: "badges earned", zh: "已獲徽章", zhHans: "已获徽章" })} value={baseState.earnedBadgeIds.length ? `${baseState.earnedBadgeIds.length} / ${badges.length}` : t({ en: "First one ready", zh: "首枚徽章待解鎖", zhHans: "首枚徽章待解锁" })} />
                <StatChip icon={<GiftIcon />} label={t({ en: "reward requests", zh: "獎勵申請", zhHans: "奖励申请" })} value={pendingRequestCount ? String(pendingRequestCount) : t({ en: "None yet", zh: "暫時沒有", zhHans: "暂时没有" })} />
              </div>

              <div className="mt-4 hidden gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.045] sm:grid sm:grid-cols-2 sm:items-center">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200"><SparkleIcon /></span>
                  <p className="text-sm font-bold leading-6 text-slate-600 dark:text-slate-300"><strong className="text-slate-950 dark:text-white">{t({ en: "XP builds your level.", zh: "XP 用來提升 Level。", zhHans: "XP 用来提升 Level。" })}</strong> {t({ en: "It is never spent.", zh: "它不會被消耗。", zhHans: "它不会被消耗。" })}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200"><CoinIcon className="h-5 w-5" /></span>
                  <p className="text-sm font-bold leading-6 text-slate-600 dark:text-slate-300"><strong className="text-slate-950 dark:text-white">{t({ en: "Points unlock rewards.", zh: "積分可用於申請獎勵。", zhHans: "积分可用于申请奖励。" })}</strong> {t({ en: "Your teacher approves each request.", zh: "每項申請均由教師審批。", zhHans: "每项申请均由教师审批。" })}</p>
                </div>
              </div>
            </section>

            {statusMessage ? (
              <div ref={statusMessageRef} tabIndex={-1} aria-live="polite" className={cn("focus-ring mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-6", statusMessage.tone === "success" ? "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-200/25 dark:bg-emerald-300/[0.1] dark:text-emerald-100" : "border-cyan-300/70 bg-cyan-50 text-cyan-800 dark:border-cyan-200/25 dark:bg-cyan-300/[0.1] dark:text-cyan-100") }>
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-current" />
                <span>{statusMessage.text}</span>
              </div>
            ) : null}

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(21rem,0.9fr)] xl:items-start">
              <section id="preview-goals" aria-labelledby="preview-goals-title" className="scroll-mt-40 rounded-[1.55rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Learn first", zh: "學習優先", zhHans: "学习优先" })}</p>
                    <h3 id="preview-goals-title" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Today’s goals", zh: "今日目標", zhHans: "今日目标" })}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">{completedQuestCount} / {quests.length} {t({ en: "complete", zh: "已完成", zhHans: "已完成" })}</span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {mode === "new"
                    ? t({ en: "Start with one short learning step. You’ll earn XP and points together.", zh: "先完成一個簡短學習步驟，你會同時獲得 XP 與積分。", zhHans: "先完成一个简短学习步骤，你会同时获得 XP 与积分。" })
                    : completedQuestCount === quests.length
                      ? t({ en: "Today’s goals are complete. Your progress is safely recorded.", zh: "今日目標已完成，學習進度已妥善記錄。", zhHans: "今日目标已完成，学习进度已妥善记录。" })
                      : t({ en: "A little progress at a time builds a strong learning rhythm.", zh: "每次前進一點，慢慢建立穩定的學習節奏。", zhHans: "每次前进一点，慢慢建立稳定的学习节奏。" })}
                </p>
                <div className="mt-4 grid gap-3">
                  {quests.map((quest) => {
                    const progress = Math.min(baseState.questProgress[quest.kind], quest.target);
                    const percent = safePercent(progress, quest.target);
                    const completed = progress >= quest.target;
                    const recommended = quest.kind === nextQuestKind;

                    return (
                      <article key={quest.kind} className={cn("grid gap-4 rounded-2xl border p-4 transition sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center", completed ? "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-200/20 dark:bg-emerald-300/[0.075]" : recommended ? "border-cyan-400 bg-cyan-50/70 ring-2 ring-cyan-200/70 dark:border-cyan-300/45 dark:bg-cyan-300/[0.075] dark:ring-cyan-300/15" : "border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/[0.045]") }>
                        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", completed ? "bg-emerald-500 text-white" : "bg-cyan-100 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-100")}><QuestIcon kind={quest.kind} /></span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2"><h4 className="text-base font-black text-slate-950 dark:text-white">{text(quest.title)}</h4>{recommended ? <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white dark:bg-cyan-300 dark:text-slate-950">{mode === "new" ? t({ en: "Start here", zh: "由此開始", zhHans: "从这里开始" }) : t({ en: "Next", zh: "下一步", zhHans: "下一步" })}</span> : null}</div>
                              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{text(quest.detail)}</p>
                            </div>
                            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", completed ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300")}>{completed ? t({ en: "Done", zh: "完成", zhHans: "完成" }) : `${progress} / ${quest.target}`}</span>
                          </div>
                          <div className="mt-3"><ProgressBar label={t({ en: `${text(quest.title)} progress`, zh: `${text(quest.title)}進度`, zhHans: `${text(quest.title)}进度` })} percent={percent} tone={completed ? "emerald" : "cyan"} /></div>
                          <p className="mt-2 text-xs font-black text-slate-600 dark:text-slate-300"><span className="text-blue-700 dark:text-blue-200">+{quest.xp} XP</span> <span aria-hidden="true">·</span> <span className="text-amber-700 dark:text-amber-300">+{quest.points} {t({ en: "points", zh: "積分", zhHans: "积分" })}</span></p>
                        </div>
                        <button type="button" disabled={completed} onClick={() => showQuestPreview(quest)} className={cn("focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-black transition sm:w-auto", completed ? "cursor-default border border-emerald-200/70 bg-white/70 text-emerald-800 dark:border-emerald-200/20 dark:bg-white/[0.05] dark:text-emerald-100" : recommended ? "bg-slate-950 text-white hover:-translate-y-0.5 motion-reduce:transform-none dark:bg-white dark:text-slate-950" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]")}>{completed ? t({ en: "Completed", zh: "已完成", zhHans: "已完成" }) : text(quest.action)}</button>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section id="preview-rewards" aria-labelledby="preview-rewards-title" className="scroll-mt-40 rounded-[1.55rem] border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white/90 to-emerald-50/80 p-4 shadow-sm shadow-amber-900/5 dark:border-amber-200/15 dark:from-amber-400/[0.085] dark:via-white/[0.045] dark:to-emerald-400/[0.065] dark:shadow-none sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">{t({ en: "A reward to work toward", zh: "努力爭取的獎勵", zhHans: "努力争取的奖励" })}</p>
                    <h3 id="preview-rewards-title" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Reward shop", zh: "獎勵商店", zhHans: "奖励商店" })}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1.5 text-xs font-black tabular-nums text-amber-800 dark:border-amber-200/20 dark:bg-white/[0.06] dark:text-amber-200"><CoinIcon className="h-4 w-4" /> {numberFormat.format(availablePoints)}</span>
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"><GiftIcon className="h-3.5 w-3.5" /></span>{t({ en: "Teacher approval keeps every request clear and safe.", zh: "每項申請均由教師審批，清晰又安心。", zhHans: "每项申请均由教师审批，清晰又安心。" })}</p>
                <p className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">{t({ en: "Concept reward items shown for design review.", zh: "獎勵項目為本次設計評審概念內容。", zhHans: "奖励项目为本次设计评审概念内容。" })}</p>
                <div className={cn("mt-4 grid gap-3", showAllRewards ? "sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-1")}>
                  {visibleRewards.map((item) => (
                    <RewardCard key={item.id} availablePoints={availablePoints} item={item} pending={simulatedPendingItemId === item.id} onEarn={showEarnPreview} onRequest={openRequestDialog} text={text} t={t} />
                  ))}
                </div>
                <button type="button" onClick={() => setShowAllRewards((current) => !current)} className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200/90 bg-white/80 px-4 text-sm font-black text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-200 dark:hover:bg-white/[0.09]">
                  {showAllRewards ? t({ en: "Show shop preview", zh: "收起完整商店", zhHans: "收起完整商店" }) : t({ en: `View all ${rewards.length} rewards`, zh: `查看全部 ${rewards.length} 項獎勵`, zhHans: `查看全部 ${rewards.length} 项奖励` })}
                </button>
              </section>
            </div>

            <section id="preview-achievements" aria-labelledby="preview-achievements-title" className="scroll-mt-40 mt-5 rounded-[1.55rem] border border-violet-200/70 bg-gradient-to-br from-violet-50/75 via-white/80 to-cyan-50/70 p-4 dark:border-violet-200/15 dark:from-violet-400/[0.075] dark:via-white/[0.04] dark:to-cyan-400/[0.055] sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-200">{t({ en: "Your milestones", zh: "你的里程碑", zhHans: "你的里程碑" })}</p>
                  <h3 id="preview-achievements-title" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Achievement shelf", zh: "成就展示架", zhHans: "成就展示架" })}</h3>
                </div>
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">{baseState.earnedBadgeIds.length} / {badges.length} {t({ en: "unlocked", zh: "已解鎖", zhHans: "已解锁" })}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {badges.map((badge) => {
                  const earned = baseState.earnedBadgeIds.includes(badge.id);
                  const progress = Math.min(baseState.badgeProgress[badge.id] ?? 0, badge.target);
                  return (
                    <article key={badge.id} className={cn("flex min-w-0 items-center gap-3 rounded-2xl border p-3.5", earned ? "border-violet-200/80 bg-white/85 dark:border-violet-200/20 dark:bg-white/[0.06]" : "border-slate-200/80 bg-white/55 dark:border-white/10 dark:bg-white/[0.035]")}>
                      <StudentBadgeLogo badgeId={badge.id} earned={earned} />
                      <div className="min-w-0">
                        <p className="text-sm font-black leading-tight text-slate-950 dark:text-white">{text(badge.name)}</p>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{text(badge.description)}</p>
                        <p className={cn("mt-1.5 text-[11px] font-black", earned ? "text-emerald-700 dark:text-emerald-200" : "text-violet-700 dark:text-violet-200")}>{earned ? t({ en: "Unlocked", zh: "已解鎖", zhHans: "已解锁" }) : `${progress} / ${badge.target}`}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section id="preview-activity" aria-labelledby="preview-activity-title" className="scroll-mt-40 mt-5">
              <h3 id="preview-activity-title" className="sr-only">{t({ en: "Recent activity", zh: "最近動態", zhHans: "最近动态" })}</h3>
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <article className="min-w-0 rounded-[1.55rem] border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.045] sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-lg font-black text-slate-950 dark:text-white">{t({ en: "Recent points", zh: "最近積分", zhHans: "最近积分" })}</h4>
                    <CoinIcon className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                  </div>
                  {mode === "new" ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300/80 px-4 py-5 dark:border-white/15">
                      <p className="font-black text-slate-800 dark:text-slate-100">{t({ en: "Your first points will appear here", zh: "你的第一筆積分會顯示在這裡", zhHans: "你的第一笔积分会显示在这里" })}</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">{t({ en: "Complete a goal to start your activity story.", zh: "完成一個目標，開始記錄你的成長。", zhHans: "完成一个目标，开始记录你的成长。" })}</p>
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-slate-200/80 dark:divide-white/10">
                      {[
                        { amount: "+15", label: t({ en: "Completed a lesson step", zh: "完成課時步驟", zhHans: "完成课时步骤" }), time: t({ en: "Today", zh: "今天", zhHans: "今天" }) },
                        { amount: "+10", label: t({ en: "Careful practice", zh: "細心練習", zhHans: "细心练习" }), time: t({ en: "Yesterday", zh: "昨天", zhHans: "昨天" }) },
                        { amount: "+10", label: t({ en: "Reviewed a mistake", zh: "訂正錯題", zhHans: "订正错题" }), time: t({ en: "2 days ago", zh: "2 天前", zhHans: "2 天前" }) }
                      ].slice(0, mode === "pending" ? 3 : 2).map((entry) => (
                        <div key={`${entry.label}-${entry.time}`} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                          <div className="min-w-0"><p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{entry.label}</p><p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{entry.time}</p></div>
                          <span className="shrink-0 text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-200">{entry.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="min-w-0 rounded-[1.55rem] border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.045] sm:p-5">
                  <div className="flex items-center justify-between gap-3"><h4 className="text-lg font-black text-slate-950 dark:text-white">{t({ en: "Reward requests", zh: "獎勵申請", zhHans: "奖励申请" })}</h4><GiftIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-200" /></div>
                  {simulatedPendingItemId ? (
                    <div className="mt-4 flex min-w-0 items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3.5 dark:border-amber-200/20 dark:bg-amber-300/[0.08]">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm dark:bg-white/10 dark:text-amber-200"><GiftIcon /></span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950 dark:text-white">{text(rewards.find((item) => item.id === simulatedPendingItemId)?.name ?? rewards[0].name)}</p><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{t({ en: `${reservedPoints} points reserved`, zh: `已預留 ${reservedPoints} 積分`, zhHans: `已预留 ${reservedPoints} 积分` })}</p></div>
                      <span className="shrink-0 rounded-full bg-amber-200/80 px-2.5 py-1 text-[11px] font-black text-amber-900 dark:bg-amber-300/20 dark:text-amber-100">{t({ en: "Pending", zh: "審批中", zhHans: "审批中" })}</span>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300/80 px-4 py-5 dark:border-white/15"><p className="font-black text-slate-800 dark:text-slate-100">{t({ en: "No reward requests yet", zh: "尚未有獎勵申請", zhHans: "尚未有奖励申请" })}</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">{t({ en: "When you make a request, its teacher-review status will stay visible here.", zh: "申請後，教師審批狀態會持續顯示在這裡。", zhHans: "申请后，教师审批状态会持续显示在这里。" })}</p></div>
                  )}
                </article>
              </div>
            </section>
          </div>
        </section>
      </div>

      {dialogItem ? (
        <div className="fixed inset-0 z-[180] grid place-items-end bg-slate-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogItem(null); }}>
          <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="reward-request-dialog-title" aria-describedby="reward-request-dialog-description" className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[1.75rem] border border-white/80 bg-white p-5 text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.38)] dark:border-white/10 dark:bg-slate-950 dark:text-white sm:max-h-[calc(100dvh-2rem)] sm:rounded-[1.75rem] sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-100 to-amber-100 dark:from-cyan-400/20 dark:to-amber-300/20"><RewardIllustration kind={dialogItem.kind} /></span>
              <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Confirm request", zh: "確認申請", zhHans: "确认申请" })}</p><h2 id="reward-request-dialog-title" className="mt-1 text-2xl font-black leading-tight">{text(dialogItem.name)}</h2></div>
            </div>
            <p id="reward-request-dialog-description" className="mt-5 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{t({ en: `In the live dashboard, this would request the reward for ${dialogItem.pointsCost} points. Your teacher would review it, and the points would stay reserved while you wait. No request will be sent from this preview.`, zh: `在正式 Dashboard 中，這會以 ${dialogItem.pointsCost} 積分申請獎勵，並在教師審批期間預留積分。本預覽不會送出真實申請。`, zhHans: `在正式 Dashboard 中，这会以 ${dialogItem.pointsCost} 积分申请奖励，并在教师审批期间预留积分。本预览不会提交真实申请。` })}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/[0.07]"><dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "Available now", zh: "目前可用", zhHans: "目前可用" })}</dt><dd className="mt-1 text-2xl font-black tabular-nums">{availablePoints}</dd></div>
              <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-300/[0.08]"><dt className="text-xs font-bold text-amber-700 dark:text-amber-200">{t({ en: "After request", zh: "申請後可用", zhHans: "申请后可用" })}</dt><dd className="mt-1 text-2xl font-black tabular-nums">{Math.max(0, availablePoints - dialogItem.pointsCost)}</dd></div>
            </dl>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setDialogItem(null)} className="focus-ring min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]">{t({ en: "Not yet", zh: "暫不申請", zhHans: "暂不申请" })}</button>
              <button type="button" onClick={confirmRequest} className="focus-ring min-h-12 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:-translate-y-0.5 motion-reduce:transform-none dark:bg-white dark:text-slate-950">{t({ en: "Send request", zh: "送出申請", zhHans: "提交申请" })}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
