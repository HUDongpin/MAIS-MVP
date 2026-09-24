import type { LocalizedText } from "@/types";

/**
 * Teacher Console zone system.
 *
 * Cool hues mean PLACES (nav groups / destinations); warm hues mean URGENCY
 * (status). One hue always carries the same meaning everywhere:
 *   today = cyan, plan = indigo, students = violet, records = slate.
 * Status stays reserved for emerald (on track), amber (needs review),
 * rose (at risk) so zone colors never collide with urgency colors.
 */
export type TeacherZone = "today" | "plan" | "students" | "records";

export const teacherZoneLabels: Record<TeacherZone, LocalizedText> = {
  today: { en: "Today", zh: "今日", zhHans: "今日" },
  plan: { en: "Plan & teach", zh: "備課與教學", zhHans: "备课与教学" },
  students: { en: "Students & data", zh: "學生與數據", zhHans: "学生与数据" },
  records: { en: "School & records", zh: "校務與記錄", zhHans: "校务与记录" }
};

export const zoneEyebrowClass: Record<TeacherZone, string> = {
  today: "text-cyan-600 dark:text-cyan-300",
  plan: "text-indigo-600 dark:text-indigo-300",
  students: "text-violet-600 dark:text-violet-300",
  records: "text-slate-500 dark:text-slate-400"
};

export const zoneBarClass: Record<TeacherZone, string> = {
  today: "bg-cyan-500/80 dark:bg-cyan-300/80",
  plan: "bg-indigo-500/80 dark:bg-indigo-300/80",
  students: "bg-violet-500/80 dark:bg-violet-300/80",
  records: "bg-slate-400/80 dark:bg-slate-500/80"
};

export const zoneChipClass: Record<TeacherZone, string> = {
  today: "border-cyan-300/55 bg-cyan-400/12 text-cyan-800 dark:text-cyan-100",
  plan: "border-indigo-300/55 bg-indigo-400/12 text-indigo-800 dark:text-indigo-100",
  students: "border-violet-300/55 bg-violet-400/12 text-violet-800 dark:text-violet-100",
  records: "border-slate-200/80 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200"
};

export const zoneTileClass: Record<TeacherZone, string> = {
  today: "bg-cyan-500/12 text-cyan-700 dark:bg-cyan-300/15 dark:text-cyan-200",
  plan: "bg-indigo-500/12 text-indigo-700 dark:bg-indigo-300/15 dark:text-indigo-200",
  students: "bg-violet-500/12 text-violet-700 dark:bg-violet-300/15 dark:text-violet-200",
  records: "bg-slate-500/10 text-slate-600 dark:bg-white/[0.08] dark:text-slate-300"
};

export const zoneTopBorderClass: Record<TeacherZone, string> = {
  today: "border-t-4 border-t-cyan-400/70 dark:border-t-cyan-300/60",
  plan: "border-t-4 border-t-indigo-400/70 dark:border-t-indigo-300/60",
  students: "border-t-4 border-t-violet-400/70 dark:border-t-violet-300/60",
  records: "border-t-4 border-t-slate-300/80 dark:border-t-slate-500/60"
};

export type TeacherStatus = "good" | "warn" | "risk" | "neutral";

export const statusChipClass: Record<TeacherStatus, string> = {
  good: "border-emerald-300/55 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100",
  warn: "border-amber-300/55 bg-amber-400/12 text-amber-800 dark:text-amber-100",
  risk: "border-rose-300/55 bg-rose-400/12 text-rose-800 dark:text-rose-100",
  neutral: "border-slate-200/80 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200"
};

export const statusValueClass: Record<TeacherStatus, string> = {
  good: "text-emerald-600 dark:text-emerald-300",
  warn: "text-amber-600 dark:text-amber-300",
  risk: "text-rose-600 dark:text-rose-300",
  neutral: "text-slate-950 dark:text-white"
};

export function countStatus(count: number, riskWhenPositive = false): TeacherStatus {
  if (count <= 0) return "good";
  return riskWhenPositive ? "risk" : "warn";
}

export function rateStatus(rate: number): TeacherStatus {
  if (rate >= 80) return "good";
  if (rate >= 55) return "warn";
  return "risk";
}
