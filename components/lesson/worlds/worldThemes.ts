import type { GradeId, LocalizedText, TextbookPublisher } from "@/types";

/**
 * MAIS Learning Worlds — one navigation engine, one themed world per grade
 * band. The lesson menu becomes the world map of the student's band, and each
 * unit is a place in it (see the porting plan §3).
 *
 *   K–2  Sprout Meadow    (storybook forest floor — Phase 0)
 *   3–5  Voyager Seas     (ocean chart — Phase 3)
 *   6–8  Skyline Heights  (floating sky city — with the G6–G12 program)
 *   9–12 Deep Space       (the galaxy — with the G6–G12 program)
 *
 * A band without a theme (or a student who toggles "List view") gets the
 * accordion fallback — the world scene is additive presentation, never the
 * only door. All engine visuals are driven by these tokens so a new world is
 * a config, not a rewrite.
 */

export type LessonWorldBand = "early" | "upper" | "middle" | "high";

export type LessonWorldTheme = {
  id: "sprout-meadow" | "voyager-seas" | "skyline-heights" | "deep-space";
  band: LessonWorldBand;
  name: LocalizedText;
  tagline: LocalizedText;
  /** What a unit is called in this world ("clearing", "island", …). */
  stopNoun: LocalizedText;
  /** Verb phrase for the progress summary ("explored", "charted", …). */
  progressVerb: LocalizedText;
  /** Default stop emoji when a unit has no CCSS lesson emoji to borrow. */
  fallbackStopEmoji: string;
  /** Stable age-appropriate cartoons used when a raw unit marker is numeric. */
  stopEmojiPalette: readonly string[];
  /** Scene wrapper classes (background gradient etc., light + dark). */
  sceneClassName: string;
  /** Aside frame (border + shadow tint). */
  frameClassName: string;
  /** Divider/border tint inside the scene. */
  lineClassName: string;
  /** Stroke classes for the winding path: ahead of the student vs. behind. */
  pathClassName: string;
  pathDoneClassName: string;
  /** Header + label text tints. */
  headingClassName: string;
  softTextClassName: string;
  accentTextClassName: string;
  /** Header chip + view-toggle button. */
  chipClassName: string;
  /** Stop circle classes per state. */
  stopCompletedClassName: string;
  stopCurrentClassName: string;
  stopNextClassName: string;
  stopFutureClassName: string;
  /** Quick-jump stones for the current unit's lesson parts. */
  quickJumpClassName: string;
  /** "You are here" chip. */
  hereChipClassName: string;
};

export function lessonWorldBandForGrade(grade: GradeId): LessonWorldBand {
  switch (grade) {
    case "K":
    case "P1":
    case "P2":
      return "early";
    case "P3":
    case "P4":
    case "P5":
      return "upper";
    case "P6":
    case "S1":
    case "S2":
      return "middle";
    default:
      return "high";
  }
}

const sproutMeadow: LessonWorldTheme = {
  id: "sprout-meadow",
  band: "early",
  name: { en: "Sprout Meadow", zh: "萌芽草原", zhHans: "萌芽草原" },
  tagline: {
    en: "Follow the path through the meadow — every clearing is a new math adventure.",
    zh: "沿著草原小路前進——每個林間空地都是新的數學冒險。",
    zhHans: "沿着草原小路前进——每个林间空地都是新的数学冒险。"
  },
  stopNoun: { en: "clearing", zh: "空地", zhHans: "空地" },
  progressVerb: { en: "explored", zh: "已探索", zhHans: "已探索" },
  fallbackStopEmoji: "🌼",
  stopEmojiPalette: ["🌼", "🐝", "🦋", "🐞", "🌱", "🍄", "🐿️", "🌈"],
  sceneClassName:
    "bg-gradient-to-b from-emerald-50 via-lime-50/70 to-amber-50/60 dark:from-emerald-950/40 dark:via-slate-950 dark:to-slate-950",
  frameClassName: "border-emerald-200/80 shadow-emerald-950/10 dark:border-emerald-300/15",
  lineClassName: "border-emerald-200/70 dark:border-emerald-300/15",
  pathClassName: "stroke-amber-300/90 dark:stroke-amber-200/40",
  pathDoneClassName: "stroke-emerald-500/90 dark:stroke-emerald-300/70",
  headingClassName: "text-emerald-950 dark:text-white",
  softTextClassName: "text-emerald-800/80 dark:text-emerald-100/70",
  accentTextClassName: "text-emerald-700 dark:text-emerald-200",
  chipClassName:
    "border-emerald-300/80 bg-white/80 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-100 dark:hover:bg-emerald-300/15",
  stopCompletedClassName:
    "border-emerald-500 bg-emerald-400/90 shadow-emerald-500/40 dark:border-emerald-300 dark:bg-emerald-400/80",
  stopCurrentClassName:
    "border-amber-400 bg-white shadow-amber-400/40 motion-safe:animate-pulse dark:border-amber-300 dark:bg-slate-900",
  stopNextClassName:
    "border-amber-300/90 bg-white/95 shadow-amber-300/50 ring-4 ring-amber-200/60 dark:border-amber-200/50 dark:bg-white/[0.08] dark:ring-amber-200/20",
  stopFutureClassName:
    "border-emerald-200 bg-white/90 shadow-emerald-900/10 dark:border-emerald-300/20 dark:bg-white/[0.07]",
  quickJumpClassName:
    "border-emerald-200/90 bg-white/85 text-emerald-900 hover:border-amber-300 hover:bg-amber-50 dark:border-emerald-300/20 dark:bg-white/[0.06] dark:text-emerald-50 dark:hover:bg-amber-300/10",
  hereChipClassName: "bg-amber-300/90 text-amber-950"
};

const voyagerSeas: LessonWorldTheme = {
  id: "voyager-seas",
  band: "upper",
  name: { en: "Voyager Seas", zh: "遠航之海", zhHans: "远航之海" },
  tagline: {
    en: "Sail the chart from island to island — every landing teaches new math.",
    zh: "沿著海圖從一座島航向另一座島——每次靠岸都學到新的數學。",
    zhHans: "沿着海图从一座岛航向另一座岛——每次靠岸都学到新的数学。"
  },
  stopNoun: { en: "island", zh: "島嶼", zhHans: "岛屿" },
  progressVerb: { en: "charted", zh: "已探明", zhHans: "已探明" },
  fallbackStopEmoji: "🏝️",
  stopEmojiPalette: ["🏝️", "🐬", "🐢", "🐚", "⛵", "🦀", "🐠", "🌊"],
  sceneClassName:
    "bg-gradient-to-b from-sky-50 via-cyan-50/70 to-blue-50/60 dark:from-sky-950/45 dark:via-slate-950 dark:to-slate-950",
  frameClassName: "border-cyan-200/80 shadow-cyan-950/10 dark:border-cyan-300/15",
  lineClassName: "border-cyan-200/70 dark:border-cyan-300/15",
  pathClassName: "stroke-sky-300/90 dark:stroke-sky-200/40",
  pathDoneClassName: "stroke-cyan-500/90 dark:stroke-cyan-300/70",
  headingClassName: "text-sky-950 dark:text-white",
  softTextClassName: "text-sky-800/80 dark:text-sky-100/70",
  accentTextClassName: "text-cyan-700 dark:text-cyan-200",
  chipClassName:
    "border-cyan-300/80 bg-white/80 text-cyan-800 hover:bg-cyan-50 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:bg-cyan-300/15",
  stopCompletedClassName:
    "border-cyan-500 bg-cyan-400/90 shadow-cyan-500/40 dark:border-cyan-300 dark:bg-cyan-400/80",
  stopCurrentClassName:
    "border-orange-400 bg-white shadow-orange-400/40 motion-safe:animate-pulse dark:border-orange-300 dark:bg-slate-900",
  stopNextClassName:
    "border-orange-300/90 bg-white/95 shadow-orange-300/50 ring-4 ring-orange-200/60 dark:border-orange-200/50 dark:bg-white/[0.08] dark:ring-orange-200/20",
  stopFutureClassName:
    "border-cyan-200 bg-white/90 shadow-cyan-900/10 dark:border-cyan-300/20 dark:bg-white/[0.07]",
  quickJumpClassName:
    "border-cyan-200/90 bg-white/85 text-sky-900 hover:border-orange-300 hover:bg-orange-50 dark:border-cyan-300/20 dark:bg-white/[0.06] dark:text-sky-50 dark:hover:bg-orange-300/10",
  hereChipClassName: "bg-orange-300/90 text-orange-950"
};

const skylineHeights: LessonWorldTheme = {
  id: "skyline-heights",
  band: "middle",
  name: { en: "Skyline Heights", zh: "天際之城", zhHans: "天际之城" },
  tagline: {
    en: "Ride the sky bridges from district to district — the city rises with everything you learn.",
    zh: "乘著天橋在城區之間穿梭——你學會的一切讓城市不斷升高。",
    zhHans: "乘着天桥在城区之间穿梭——你学会的一切让城市不断升高。"
  },
  stopNoun: { en: "district", zh: "城區", zhHans: "城区" },
  progressVerb: { en: "connected", zh: "已連通", zhHans: "已连通" },
  fallbackStopEmoji: "🎈",
  stopEmojiPalette: ["🎈", "🚁", "🛸", "🏙️", "☁️", "🌉", "🪁", "🚡"],
  sceneClassName:
    "bg-gradient-to-b from-indigo-50 via-violet-50/70 to-slate-50/60 dark:from-indigo-950/45 dark:via-slate-950 dark:to-slate-950",
  frameClassName: "border-indigo-200/80 shadow-indigo-950/10 dark:border-indigo-300/15",
  lineClassName: "border-indigo-200/70 dark:border-indigo-300/15",
  pathClassName: "stroke-violet-300/90 dark:stroke-violet-200/40",
  pathDoneClassName: "stroke-indigo-500/90 dark:stroke-indigo-300/70",
  headingClassName: "text-indigo-950 dark:text-white",
  softTextClassName: "text-indigo-800/80 dark:text-indigo-100/70",
  accentTextClassName: "text-violet-700 dark:text-violet-200",
  chipClassName:
    "border-indigo-300/80 bg-white/80 text-indigo-800 hover:bg-indigo-50 dark:border-indigo-300/25 dark:bg-indigo-300/10 dark:text-indigo-100 dark:hover:bg-indigo-300/15",
  stopCompletedClassName:
    "border-indigo-500 bg-indigo-400/90 shadow-indigo-500/40 dark:border-indigo-300 dark:bg-indigo-400/80",
  stopCurrentClassName:
    "border-amber-400 bg-white shadow-amber-400/40 motion-safe:animate-pulse dark:border-amber-300 dark:bg-slate-900",
  stopNextClassName:
    "border-amber-300/90 bg-white/95 shadow-amber-300/50 ring-4 ring-amber-200/60 dark:border-amber-200/50 dark:bg-white/[0.08] dark:ring-amber-200/20",
  stopFutureClassName:
    "border-indigo-200 bg-white/90 shadow-indigo-900/10 dark:border-indigo-300/20 dark:bg-white/[0.07]",
  quickJumpClassName:
    "border-indigo-200/90 bg-white/85 text-indigo-900 hover:border-amber-300 hover:bg-amber-50 dark:border-indigo-300/20 dark:bg-white/[0.06] dark:text-indigo-50 dark:hover:bg-amber-300/10",
  hereChipClassName: "bg-amber-300/90 text-amber-950"
};

const deepSpace: LessonWorldTheme = {
  id: "deep-space",
  band: "high",
  name: { en: "Deep Space", zh: "深空星域", zhHans: "深空星域" },
  tagline: {
    en: "Chart the constellations — every unit is a star system waiting to light up.",
    zh: "繪製你的星圖——每個單元都是等待點亮的星系。",
    zhHans: "绘制你的星图——每个单元都是等待点亮的星系。"
  },
  stopNoun: { en: "star system", zh: "星系", zhHans: "星系" },
  progressVerb: { en: "ignited", zh: "已點亮", zhHans: "已点亮" },
  fallbackStopEmoji: "🌌",
  stopEmojiPalette: ["🌌", "🚀", "🪐", "🛰️", "☄️", "🌟", "👾", "🔭"],
  sceneClassName:
    "bg-gradient-to-b from-slate-100 via-indigo-50/60 to-slate-50 dark:from-slate-950 dark:via-indigo-950/50 dark:to-slate-950",
  frameClassName: "border-slate-300/80 shadow-slate-950/10 dark:border-indigo-300/15",
  lineClassName: "border-slate-300/70 dark:border-indigo-300/15",
  pathClassName: "stroke-slate-400/70 dark:stroke-indigo-200/30",
  pathDoneClassName: "stroke-cyan-500/90 dark:stroke-cyan-300/80",
  headingClassName: "text-slate-950 dark:text-white",
  softTextClassName: "text-slate-700/80 dark:text-indigo-100/70",
  accentTextClassName: "text-indigo-700 dark:text-cyan-200",
  chipClassName:
    "border-slate-400/60 bg-white/80 text-slate-800 hover:bg-slate-100 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:bg-cyan-300/15",
  stopCompletedClassName:
    "border-cyan-500 bg-cyan-400/90 shadow-cyan-500/50 dark:border-cyan-300 dark:bg-cyan-400/80",
  stopCurrentClassName:
    "border-amber-400 bg-white shadow-amber-400/40 motion-safe:animate-pulse dark:border-amber-300 dark:bg-slate-900",
  stopNextClassName:
    "border-amber-300/90 bg-white/95 shadow-amber-300/50 ring-4 ring-amber-200/60 dark:border-amber-200/50 dark:bg-white/[0.08] dark:ring-amber-200/20",
  stopFutureClassName:
    "border-slate-300 bg-white/90 shadow-slate-900/10 dark:border-indigo-300/20 dark:bg-white/[0.07]",
  quickJumpClassName:
    "border-slate-300/90 bg-white/85 text-slate-900 hover:border-amber-300 hover:bg-amber-50 dark:border-indigo-300/20 dark:bg-white/[0.06] dark:text-indigo-50 dark:hover:bg-amber-300/10",
  hereChipClassName: "bg-amber-300/90 text-amber-950"
};

/** All four worlds shipped (Phase 5). Bands without a theme fall back to the list. */
export const lessonWorldThemesByBand: Partial<Record<LessonWorldBand, LessonWorldTheme>> = {
  early: sproutMeadow,
  upper: voyagerSeas,
  middle: skylineHeights,
  high: deepSpace
};

export function lessonWorldThemeForGrade(grade: GradeId): LessonWorldTheme | null {
  return lessonWorldThemesByBand[lessonWorldBandForGrade(grade)] ?? null;
}

/**
 * The world a lesson belongs to. Worlds ship with the California course, so
 * everything else keeps the neutral list. Callers outside the menu (the
 * collapsed rail, for one) resolve the theme through here so the rail and the
 * map it replaces are always tinted by the same world.
 */
export function lessonWorldThemeForCourse(
  course: {
    grade: GradeId;
    publisher?: TextbookPublisher | null;
    curriculumProfile?: { publisher?: TextbookPublisher | null } | null;
  } | null
): LessonWorldTheme | null {
  if (!course) return null;
  const isCaliforniaCourse =
    course.publisher === "US_CA_MATH" || course.curriculumProfile?.publisher === "US_CA_MATH";
  return isCaliforniaCourse ? lessonWorldThemeForGrade(course.grade) : null;
}
