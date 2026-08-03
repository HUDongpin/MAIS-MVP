"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [phat, setPhat] = useState(52); // sample proportion percent
  const [n, setN] = useState(400);

  const p = phat / 100;
  // margin of error ≈ 1.96·sqrt(p(1-p)/n)
  const moe = r2(196 * Math.sqrt((p * (1 - p)) / n)); // ×100 for percent
  const lo = r2(phat - moe), hi = r2(phat + moe);
  // The axis has to span every reachable state, not just 40–60: the sample-%
  // stepper runs 30–70 and the widest interval (p = 50%, n = 100) reaches
  // ±9.8, so the marker used to be drawn off-canvas for 10 of the 21 settings.
  const AXIS_MIN = 20;
  const AXIS_MAX = 80;
  const TICKS = [20, 30, 40, 50, 60, 70, 80];
  const bx = (v: number) =>
    r2(20 + ((Math.max(AXIS_MIN, Math.min(AXIS_MAX, v)) - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * 280);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A poll finds {phat}% support. But the true value could be a bit higher or
        lower — so we report a <strong>margin of error</strong>{" "}and a{" "}
        <strong>confidence interval</strong>. Larger samples give tighter estimates.
      </p>

      <Figure caption="The estimate ± margin of error gives an interval likely to contain the true population value.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-2xl border-2 px-8 py-4 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-lg text-[var(--ink-soft)]">sample: {phat}% of n = {n}</div>
            <div className="mt-1 font-mono text-2xl font-black" style={{ color: ACCENT }}>{phat}% ± {moe}%</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">95% CI: [{lo}%, {hi}%]</div>
          </div>

          {/* interval bar */}
          <svg width={320} height={60} viewBox="0 0 320 60" role="img" aria-label="confidence interval">
            <line x1={20} y1={30} x2={300} y2={30} stroke="var(--line)" strokeWidth={2} />
            {TICKS.map((v) => <text key={v} x={bx(v)} y={50} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{v}</text>)}
            <rect x={bx(lo)} y={22} width={r2(bx(hi) - bx(lo))} height={16} fill={ACCENT} fillOpacity={0.3} stroke={ACCENT} strokeWidth={2} rx={3} />
            <line x1={bx(phat)} y1={18} x2={bx(phat)} y2={42} stroke={ACCENT} strokeWidth={3} />
          </svg>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="sample %" value={phat} min={30} max={70} step={2} onChange={setPhat} />
            <Stepper label="sample size n" value={n} min={100} max={1600} step={100} onChange={setN} />
          </div>
        </div>
      </Figure>

      <h2>Bigger samples, tighter bounds</h2>
      <p>
        The margin of error shrinks like 1/√n — quadrupling the sample halves it. So
        going from n = 400 to 1600 tightens the estimate to ± {r2(196 * Math.sqrt((p * (1 - p)) / 1600))}%. A
        95% confidence interval means: if we repeated this poll many times, about 95%
        of the intervals would capture the true proportion.
      </p>

      <MathCheck>
        <p>
          A sample statistic <strong>estimates a population mean or proportion</strong>,
          reported with a <strong>margin of error</strong>{" "}(S-IC.4) that reflects
          sampling variability. The margin narrows with larger n (∝ 1/√n), and a
          confidence interval quantifies the plausible range for the true parameter.
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
        <span className="w-14 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
