"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const W = 360, H = 200, PAD = 30;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [mean, setMean] = useState(100);
  const [sd, setSd] = useState(15);
  const [z, setZ] = useState(1); // shade within ±z sd

  const pct = z === 1 ? 68 : z === 2 ? 95 : 99.7;
  const lo = mean - z * sd, hi = mean + z * sd;

  // bell curve points
  const midX = W / 2, spread = 40; // px per sd
  const f = (sig: number) => Math.exp(-0.5 * sig * sig);
  const pts: string[] = [];
  for (let s = -3.2; s <= 3.2; s += 0.1) {
    pts.push(`${r2(midX + s * spread)},${r2(H - PAD - f(s) * 130)}`);
  }
  const shade: string[] = [`${midX - z * spread},${H - PAD}`];
  for (let s = -z; s <= z + 0.001; s += 0.1) shade.push(`${r2(midX + s * spread)},${r2(H - PAD - f(s) * 130)}`);
  shade.push(`${midX + z * spread},${H - PAD}`);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Many measurements — heights, test scores, errors — pile up in a symmetric{" "}
        <strong>bell curve</strong>, the <strong>normal distribution</strong>. Its
        magic is the <strong>68–95–99.7 rule</strong>: fixed percentages of data fall
        within 1, 2, and 3 standard deviations of the mean.
      </p>

      <Figure caption="Shade within ±z standard deviations to read off the percentage of data it contains.">
        <div className="flex flex-col items-center gap-6">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" role="img" aria-label="normal distribution">
            <polygon points={shade.join(" ")} fill={ACCENT} fillOpacity={0.3} />
            <polyline points={pts.join(" ")} fill="none" stroke={ACCENT} strokeWidth={2.5} />
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            {[-3, -2, -1, 0, 1, 2, 3].map((s) => (
              <text key={s} x={midX + s * spread} y={H - PAD + 15} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{mean + s * sd}</text>
            ))}
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-lg font-black" style={{ color: ACCENT }}>≈ {pct}% of data</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">within ±{z} SD: from {lo} to {hi}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="mean" value={mean} min={50} max={150} step={5} onChange={setMean} />
            <Stepper label="std dev" value={sd} min={5} max={25} step={5} onChange={setSd} />
            <Stepper label="±z SD" value={z} min={1} max={3} step={1} onChange={setZ} />
          </div>
        </div>
      </Figure>

      <h2>The empirical rule</h2>
      <p>
        For a normal model with mean {mean} and SD {sd}: about 68% of values lie in
        [{mean - sd}, {mean + sd}], 95% within two SDs, and 99.7% within three. So a
        value beyond ±2 SD is genuinely unusual (only ~5% of data). This lets you
        estimate population percentages — but only when the data are roughly bell-shaped.
      </p>

      <MathCheck>
        <p>
          When a distribution is approximately <strong>normal</strong>, its mean and
          standard deviation let you estimate population percentages using the{" "}
          <strong>68–95–99.7 (empirical) rule</strong>{" "}or normal tables (S-ID.4). It
          is essential to check that the bell-shape assumption is reasonable before
          applying it.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
