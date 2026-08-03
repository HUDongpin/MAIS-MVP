"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const XMAX = 8, YMAX = 8, PXX = 40, PXY = 30, PAD = 30;
const W = XMAX * PXX + 2 * PAD, H = YMAX * PXY + 2 * PAD;
const r2 = (n: number) => Math.round(n * 100) / 100;

// a "rocket height" story: rises, peaks, falls — piecewise-ish via a downward parabola
export default function Lesson() {
  const [a, setA] = useState(2); // interval start for avg rate
  const [b, setB] = useState(6);

  // h(t) = -(t-4)² + 8  (peak at t=4, height 8)
  const h = (t: number) => -(t - 4) * (t - 4) + 8;
  const avgRate = r2((h(b) - h(a)) / (b - a));

  const sx = (x: number) => PAD + x * PXX;
  const sy = (y: number) => PAD + (YMAX - Math.max(0, Math.min(YMAX, y))) * PXY;

  const pts: string[] = [];
  for (let t = 0; t <= XMAX + 0.001; t += 0.1) if (h(t) >= 0) pts.push(`${sx(t).toFixed(1)},${sy(h(t)).toFixed(1)}`);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A graph tells a story: where a quantity <strong>rises or falls</strong>,
        its <strong>maximum</strong>, its <strong>intercepts</strong>, and how fast
        it changes on average. Reading these <strong>key features</strong>{" "}in
        context is what functions are for.
      </p>

      <Figure caption="A rocket's height h(t). Read the peak, the intercepts, and the average rate of change on [a, b].">
        <div className="flex flex-col items-center gap-6">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" style={{ maxHeight: 300 }} role="img" aria-label="height versus time graph">
            {Array.from({ length: YMAX + 1 }, (_, i) => (
              <line key={i} x1={sx(0)} y1={sy(i)} x2={sx(XMAX)} y2={sy(i)} stroke="var(--line)" strokeWidth={1} />
            ))}
            {Array.from({ length: XMAX + 1 }, (_, i) => (
              <text key={i} x={sx(i)} y={sy(0) + 15} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{i}</text>
            ))}
            <line x1={sx(0)} y1={sy(0)} x2={sx(XMAX)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(YMAX)} stroke="var(--ink-soft)" strokeWidth={2} />
            <polyline points={pts.join(" ")} fill="none" stroke={ACCENT} strokeWidth={3} />
            {/* peak */}
            <circle cx={sx(4)} cy={sy(8)} r={5} fill={ACCENT} />
            <text x={sx(4)} y={sy(8) - 10} textAnchor="middle" fontSize={11} fontWeight={800} fill={ACCENT}>max (4, 8)</text>
            {/* secant for avg rate */}
            <line x1={sx(a)} y1={sy(h(a))} x2={sx(b)} y2={sy(h(b))} stroke="var(--band-upper)" strokeWidth={2} strokeDasharray="5 3" />
            <circle cx={sx(a)} cy={sy(h(a))} r={4} fill="var(--band-upper)" />
            <circle cx={sx(b)} cy={sy(h(b))} r={4} fill="var(--band-upper)" />
          </svg>

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono text-sm" style={{ borderColor: "var(--band-upper)" }}>
            average rate on [{a}, {b}] = (h({b}) − h({a})) / ({b} − {a}) = <strong style={{ color: "var(--band-upper)" }}>{avgRate}</strong>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* Keep both endpoints inside the modelled domain, where h(t) ≥ 0 and
                the curve is actually drawn. Outside it the secant endpoints were
                clamped onto the axis, so the figure showed a flat secant while
                the readout reported an average rate of 7. */}
            <Stepper label="a" value={a} min={2} max={b - 1} onChange={setA} />
            <Stepper label="b" value={b} min={a + 1} max={6} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Features, domain, and average rate</h2>
      <p>
        This rocket climbs until t = 4 (increasing), peaks at height 8, then falls
        (decreasing), landing at t = {"≈"}6.83. The sensible <strong>domain</strong>{" "}
        {/* h(0) = −8, so the model is negative for t < 1.17 and the sensible
            domain starts where the rocket leaves the ground, not at t = 0. */}
        runs from lift-off (t ≈ 1.17, where the height reaches 0) to landing —
        outside that the model gives a negative height, which is meaningless. The dashed
        secant&apos;s slope, {avgRate}, is the <strong>average rate of change</strong>{" "}
        over the interval.
      </p>

      <MathCheck>
        <p>
          <strong>Key features</strong>{" "}of a graph — intercepts, intervals of
          increase/decrease, maxima/minima, end behavior — are interpreted in
          context (F-IF.4). The <strong>domain</strong>{" "}must fit the situation
          (F-IF.5), and the <strong>average rate of change</strong>{" "}over [a, b] is
          the slope of the secant line, (f(b) − f(a))/(b − a) (F-IF.6).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
