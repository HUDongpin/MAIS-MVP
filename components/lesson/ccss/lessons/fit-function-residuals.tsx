"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const DOT = "var(--band-middle)";
const W = 320, H = 210, PAD = 34;
const r2 = (n: number) => Math.round(n * 100) / 100;

const DATA: [number, number][] = [[1, 3], [2, 4], [3, 6], [4, 7], [5, 9], [6, 10], [7, 12]];

export default function Lesson() {
  const [m, setM] = useState(15); // slope ×0.1
  const [b, setB] = useState(2);
  const slope = m / 10;

  // x-range over which the fitted line stays within 0 <= y <= 14.
  const fitClip: [number, number] = (() => {
    const xs = [(0 - b) / slope, (14 - b) / slope].sort((p, q) => p - q);
    return [Math.max(0, xs[0]), Math.min(8, xs[1])];
  })();
  const sx = (x: number) => Math.round((PAD + (x / 8) * (W - 2 * PAD)) * 100) / 100;
  const sy = (y: number) => Math.round((H - PAD - (y / 14) * (H - 2 * PAD)) * 100) / 100;
  const pred = (x: number) => slope * x + b;
  const resid = DATA.map(([x, y]) => r2(y - pred(x)));
  const ssr = r2(resid.reduce((s, r) => s + r * r, 0));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Fitting a line to data means finding the one that comes closest to every
        point. The <strong>residual</strong>{" "}at each point is how far the data sits
        above or below the line. A good fit makes residuals <strong>small and
        patternless</strong>.
      </p>

      <Figure caption="Adjust the line to shrink the residuals (the vertical gaps). Look for no leftover pattern.">
        <div className="flex flex-col items-center gap-6">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" role="img" aria-label="scatter plot with fitted line and residuals">
            <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={PAD} y1={sy(0)} x2={PAD} y2={PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* residual segments */}
            {DATA.map(([x, y], i) => <line key={i} x1={sx(x)} y1={sy(y)} x2={sx(x)} y2={sy(pred(x))} stroke="var(--band-upper)" strokeWidth={1.5} strokeDasharray="3 2" />)}
            {/* pred(8) reaches 21 at slope 2.0, intercept 5, on a y-axis that
                stops at 14 — the line ran 37px above the viewBox. Clip it to
                the x-range where it is inside the plot. */}
            <line x1={sx(fitClip[0])} y1={sy(pred(fitClip[0]))} x2={sx(fitClip[1])} y2={sy(pred(fitClip[1]))} stroke={ACCENT} strokeWidth={2.5} />
            {DATA.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={4} fill={DOT} />)}
          </svg>

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono text-sm" style={{ borderColor: ACCENT }}>
            y = {slope}x + {b} · sum of squared residuals = <strong style={{ color: ACCENT }}>{ssr}</strong>
            <span className="ml-2 text-xs text-[var(--ink-faint)]">(smaller = better fit)</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* "slope ×0.1" made the buttons announce "Increase slope ×0.1",
                which reads as multiply; they add and subtract 0.1. */}
            <Stepper label="slope, in steps of 0.1" value={m} min={8} max={20} onChange={setM} display={slope} />
            <Stepper label="intercept" value={b} min={0} max={5} onChange={setB} display={b} />
          </div>
        </div>
      </Figure>

      <h2>Residuals judge the fit</h2>
      <p>
        Each residual = actual − predicted. Squaring and summing them ({ssr}) gives a
        single measure of misfit; the <strong>least-squares line</strong>{" "}minimizes
        it. Just as important is the <strong>residual plot</strong>: if leftover
        residuals show a curve or funnel, a straight line was the wrong model.
      </p>

      <MathCheck>
        <p>
          <strong>Fitting a function</strong>{" "}to data and analyzing{" "}
          <strong>residuals</strong>{" "}(S-ID.6): choose a model (often linear via
          least squares), then examine the residuals. Small, randomly scattered
          residuals support the fit; a systematic pattern means a different function
          would model the data better.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange, display }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; display: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-10 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{display}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
