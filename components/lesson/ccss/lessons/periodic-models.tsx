"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const W = 360, H = 220, PAD = 30;
const MIDX = PAD, MIDY = H / 2;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [A, setA] = useState(2); // amplitude
  const [period, setPeriod] = useState(4); // period in x-units
  const [D, setD] = useState(1); // midline

  const plotW = W - 2 * PAD;
  const yScale = 30; // px per unit
  const xUnits = 8; // show 0..8
  const xScale = plotW / xUnits;

  const f = (x: number) => A * Math.sin((2 * Math.PI * x) / period) + D;
  const pts: string[] = [];
  for (let x = 0; x <= xUnits + 0.001; x += 0.05) {
    pts.push(`${r2(MIDX + x * xScale)},${r2(MIDY - f(x) * yScale)}`);
  }

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Tides, daylight, sound, and heartbeats all <strong>repeat</strong>. A sine
        model <strong>y = A·sin(2πx / P) + D</strong>{" "}captures them with three
        dials: <strong>amplitude</strong>{" "}A (how far it swings),{" "}
        <strong>period</strong>{" "}P (how long one cycle takes), and{" "}
        <strong>midline</strong>{" "}D (the center level).
      </p>

      <Figure caption="Amplitude sets the height of the swing, period its length, midline its center.">
        <div className="flex flex-col items-center gap-6">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" role="img" aria-label={`Sine curve with amplitude ${A}, period ${period} and midline y = ${D}`}>
            {/* midline */}
            <line x1={MIDX} y1={r2(MIDY - D * yScale)} x2={W - PAD} y2={r2(MIDY - D * yScale)} stroke="var(--band-upper)" strokeWidth={1.5} strokeDasharray="5 4" />
            {/* max/min guides */}
            <line x1={MIDX} y1={r2(MIDY - (D + A) * yScale)} x2={W - PAD} y2={r2(MIDY - (D + A) * yScale)} stroke="var(--line)" strokeWidth={1} />
            <line x1={MIDX} y1={r2(MIDY - (D - A) * yScale)} x2={W - PAD} y2={r2(MIDY - (D - A) * yScale)} stroke="var(--line)" strokeWidth={1} />
            {/* axes */}
            <line x1={MIDX} y1={PAD} x2={MIDX} y2={H - PAD} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <polyline points={pts.join(" ")} fill="none" stroke={ACCENT} strokeWidth={2.5} />
            <text x={W - PAD} y={r2(MIDY - D * yScale) - 4} textAnchor="end" fontSize={10} fill="var(--band-upper)">midline y = {D}</text>
          </svg>

          <div className="grid grid-cols-3 gap-4 text-center font-mono text-sm">
            <Info label="amplitude" value={`${A}`} />
            <Info label="period" value={`${period}`} />
            <Info label="midline" value={`${D}`} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* A and D were independent, so A = 3 with D = 2 put the crests at
                y = 5 — 40px above the top of the canvas — slicing every crest
                flat and drawing the "max guide" entirely off-figure. The drawable
                range at 30px/unit is ±3.6, so |D| + A is held to 3. */}
            <Stepper label="amplitude A" value={A} min={1} max={3 - Math.abs(D)} onChange={setA} />
            <Stepper label="period P" value={period} min={2} max={8} onChange={setPeriod} />
            <Stepper label="midline D" value={D} min={-1} max={2} onChange={(v) => { setD(v); setA((p) => Math.max(1, Math.min(p, 3 - Math.abs(v)))); }} />
          </div>
        </div>
      </Figure>

      <h2>Three dials shape this sine curve</h2>
      <p>
        The curve rises to D + A = {D + A} and falls to D − A = {D - A}, completing a
        full cycle every {period} units. Change A to stretch it vertically, P to
        stretch it horizontally, and D to raise or lower it. This interactive model
        fixes the phase shift at zero, so the curve crosses its midline at x = 0.
        A fourth control for phase shift would be needed to slide it left or right.
      </p>

      <MathCheck>
        <p>
          <strong>Periodic phenomena</strong>{" "}are modeled by sinusoids
          y = A·sin(B(x − C)) + D (F-TF.5), where <strong>amplitude</strong>{" "}|A| is
          the swing, the <strong>period</strong>{" "}is 2π/B, <strong>C</strong>{" "}is a
          phase shift, and <strong>D</strong>{" "}is the midline. Fitting these to data
          models tides, temperature, and other cycles.
        </p>
      </MathCheck>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
      <div className="text-[10px] uppercase text-[var(--ink-faint)]">{label}</div>
      <div className="text-lg font-black" style={{ color: ACCENT }}>{value}</div>
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
