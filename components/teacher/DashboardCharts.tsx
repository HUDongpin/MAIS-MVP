"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TeacherStatus } from "@/components/teacher/teacherZones";

/**
 * Lightweight, dependency-free dashboard charts for the Teacher Console overview.
 *
 * Every value shown here is point-in-time (no time-series is available), so we
 * only use honest forms: a completion ring gauge (single headline number), a
 * roster-status donut (a two-way split), and grouped horizontal bars (comparing
 * classes on the same 0–100% scale). Series identity is carried by color AND a
 * legend AND direct value labels, so nothing depends on color alone.
 *
 * Palette (validated for CVD + light/dark surfaces via the dataviz validator):
 *   Mastery series    → violet #8b5cf6 (both modes)
 *   Completion series → cyan  #06b6d4 light / #0891b2 dark
 *   Status arcs       → reserved emerald / amber / rose, always with a label.
 */

const statusStrokeClass: Record<TeacherStatus, string> = {
  good: "text-emerald-500 dark:text-emerald-400",
  warn: "text-amber-500 dark:text-amber-400",
  risk: "text-rose-500 dark:text-rose-400",
  neutral: "text-slate-400 dark:text-slate-500"
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// ---------------------------------------------------------------------------
// Completion ring gauge — a single 0–100% headline drawn as a circular meter.
// ---------------------------------------------------------------------------

export function CompletionGauge({
  value,
  status,
  title,
  caption
}: {
  value: number;
  status: TeacherStatus;
  title: string;
  caption: string;
}) {
  const pct = clampPercent(value);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const arc = (pct / 100) * circumference;

  return (
    <figure className="flex flex-col items-center" role="img" aria-label={`${title}: ${pct}%`}>
      <div className="relative h-[132px] w-[132px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="12"
            className="text-slate-200/80 dark:text-white/10"
            stroke="currentColor"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference - arc}`}
            className={cn("transition-[stroke-dasharray] duration-700", statusStrokeClass[status])}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{pct}%</span>
        </div>
      </div>
      <figcaption className="mt-3 text-center">
        <p className="text-sm font-black text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{caption}</p>
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Roster-status donut — a two-way split of students (on track vs. attention).
// ---------------------------------------------------------------------------

export function RosterStatusDonut({
  onTrack,
  attention,
  centerLabel,
  onTrackLabel,
  attentionLabel,
  emptyLabel
}: {
  onTrack: number;
  attention: number;
  centerLabel: string;
  onTrackLabel: string;
  attentionLabel: string;
  emptyLabel: string;
}) {
  const total = onTrack + attention;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  // A 2px surface gap between the two fills keeps segments from touching.
  const gap = total > 0 && onTrack > 0 && attention > 0 ? 4 : 0;
  const onTrackArc = total > 0 ? Math.max(0, (onTrack / total) * circumference - gap) : 0;
  const attentionArc = total > 0 ? Math.max(0, (attention / total) * circumference - gap) : 0;

  return (
    <figure className="flex flex-col items-center" role="img" aria-label={`${centerLabel}: ${onTrack} ${onTrackLabel}, ${attention} ${attentionLabel}`}>
      <div className="relative h-[132px] w-[132px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="14" className="text-slate-200/80 dark:text-white/10" stroke="currentColor" />
          {total > 0 ? (
            <>
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="14"
                strokeDasharray={`${onTrackArc} ${circumference - onTrackArc}`}
                className="text-emerald-500 dark:text-emerald-400"
                stroke="currentColor"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="14"
                strokeDasharray={`${attentionArc} ${circumference - attentionArc}`}
                strokeDashoffset={-(onTrackArc + gap)}
                className="text-rose-500 dark:text-rose-400"
                stroke="currentColor"
              />
            </>
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{total}</span>
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{centerLabel}</span>
        </div>
      </div>
      {total > 0 ? (
        <figcaption className="mt-3 grid w-full max-w-[220px] gap-2">
          <LegendRow dotClass="bg-emerald-500 dark:bg-emerald-400" label={onTrackLabel} value={onTrack} total={total} />
          <LegendRow dotClass="bg-rose-500 dark:bg-rose-400" label={attentionLabel} value={attention} total={total} />
        </figcaption>
      ) : (
        <figcaption className="mt-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">{emptyLabel}</figcaption>
      )}
    </figure>
  );
}

function LegendRow({ dotClass, label, value, total }: { dotClass: string; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex min-w-0 items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClass)} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-black text-slate-950 dark:text-white">
        {value} <span className="font-bold text-slate-400 dark:text-slate-500">({pct}%)</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Class comparison — grouped horizontal bars (mastery + completion per class).
// ---------------------------------------------------------------------------

export type ClassBarDatum = {
  key: string;
  className: string;
  subLabel: string;
  mastery: number;
  completion: number;
  href: string;
};

export function ClassPerformanceBars({
  rows,
  masteryLabel,
  completionLabel,
  emptyLabel
}: {
  rows: ClassBarDatum[];
  masteryLabel: string;
  completionLabel: string;
  emptyLabel: string;
}) {
  if (!rows.length) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-200/80 p-6 text-center text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
        <LegendKey dotClass="bg-[#8b5cf6]" label={masteryLabel} />
        <LegendKey dotClass="bg-[#06b6d4] dark:bg-[#0891b2]" label={completionLabel} />
      </div>
      <ul className="grid gap-4">
        {rows.map((row) => (
          <li key={row.key}>
            <Link
              href={row.href}
              className="focus-ring block rounded-2xl p-2 transition hover:bg-slate-500/[0.06] dark:hover:bg-white/[0.04]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-black text-slate-950 dark:text-white" title={row.className}>
                  {row.className}
                </p>
                <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">{row.subLabel}</p>
              </div>
              <div className="mt-2 grid gap-1.5">
                <Bar value={row.mastery} fillClass="bg-[#8b5cf6]" label={masteryLabel} className={row.className} />
                <Bar value={row.completion} fillClass="bg-[#06b6d4] dark:bg-[#0891b2]" label={completionLabel} className={row.className} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegendKey({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
      <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} aria-hidden="true" />
      {label}
    </span>
  );
}

function Bar({ value, fillClass, label, className }: { value: number; fillClass: string; label: string; className: string }) {
  const pct = clampPercent(value);
  return (
    <div className="flex items-center gap-2.5" aria-label={`${className} — ${label} ${pct}%`}>
      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
        <div
          className={cn("h-2.5 rounded-full transition-[width] duration-700", fillClass)}
          style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
          title={`${label}: ${pct}%`}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-black tabular-nums text-slate-950 dark:text-white">{pct}%</span>
    </div>
  );
}
