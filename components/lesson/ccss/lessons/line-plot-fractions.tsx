"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const MARK = "var(--band-upper)";
const POINTS = [
  { e: 2, label: "1/4" },
  { e: 3, label: "3/8" },
  { e: 4, label: "1/2" },
  { e: 5, label: "5/8" },
  { e: 6, label: "3/4" },
];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
function frac(eighths: number): string {
  if (eighths === 0) return "0";
  const g = gcd(eighths, 8);
  return `${eighths / g}/${8 / g}`;
}

export default function Lesson() {
  const [counts, setCounts] = useState([2, 1, 3, 2, 1]);
  const withData = POINTS.filter((_, i) => counts[i] > 0);
  // Guard the empty plot: with every count at 0, Math.max(...[]) is -Infinity
  // and the fraction helper then recursed on NaN until the stack overflowed.
  // The last remaining measurement cannot be removed (see the − button below),
  // so withData is never empty, but the fallbacks keep that a local guarantee.
  const total = counts.reduce((s, v) => s + v, 0);
  const maxE = withData.length ? Math.max(...withData.map((p) => p.e)) : 0;
  const minE = withData.length ? Math.min(...withData.map((p) => p.e)) : 0;
  const diff = maxE - minE;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A line plot can measure to <strong>eighths</strong>{" "}of an inch. Once the
        data is plotted, you can <strong>add and subtract the fractions</strong>{" "}—
        like finding how much longer the longest is than the shortest.
      </p>

      <Figure caption="Each X is one ribbon, measured to the nearest eighth-inch.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-end justify-center gap-7" style={{ minHeight: 120 }}>
            {POINTS.map((p, i) => (
              <div key={p.label} className="flex flex-col items-center gap-1">
                <div className="flex flex-col-reverse gap-0.5" style={{ minHeight: 90 }}>
                  {Array.from({ length: counts[i] }, (_, k) => <span key={k} className="text-lg font-black leading-none" style={{ color: MARK }}>✕</span>)}
                </div>
                <div className="h-0.5 w-8 bg-[var(--ink-soft)]" />
                <span className="font-mono text-sm font-bold">{p.label}</span>
              </div>
            ))}
          </div>
          <div className="-mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">length in inches</div>

          <div className="rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center">
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Longest − shortest</div>
            <div className="font-mono text-lg font-black" style={{ color: MARK }}>
              {/* One measurement can remain, where maxE === minE and the
                  difference is 0 — "0 inch". */}
              {frac(maxE)} − {frac(minE)} = {frac(diff)} {diff === 8 ? "inch" : "inches"}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {POINTS.map((p, i) => (
              <div key={p.label} className="flex flex-col items-center gap-1">
                <span className="font-mono text-xs font-bold text-[var(--ink-faint)]">{p.label}″</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setCounts((c) => c.map((v, j) => (j === i ? Math.max(0, v - 1) : v)))} disabled={counts[i] <= 0 || total <= 1} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Remove one ${p.label}-inch ribbon measurement`}>−</button>
                  <span className="w-5 text-center font-black tabular-nums">{counts[i]}</span>
                  <button type="button" onClick={() => setCounts((c) => c.map((v, j) => (j === i ? Math.min(5, v + 1) : v)))} disabled={counts[i] >= 5} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Add one ${p.label}-inch ribbon measurement`}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Fractions from the data</h2>
      <p>
        The plot shows lengths as eighths. To subtract, give them a common
        denominator of 8: {frac(maxE)} = {maxE}/8 and {frac(minE)} = {minE}/8, so
        the difference is {maxE}/8 − {minE}/8 = {diff}/8 = {frac(diff)}.
      </p>

      <MathCheck>
        <p>
          Making a line plot of measurement data in fractions of a unit (halves,
          quarters, <strong>eighths</strong>) and using it to solve add/subtract
          problems is 4.MD.B.4. Here the longest ribbon minus the shortest is{" "}
          {frac(maxE)} − {frac(minE)} = {frac(diff)} {diff === 8 ? "inch" : "inches"} — a fraction subtraction
          read straight off the plot.
        </p>
      </MathCheck>
    </div>
  );
}
