"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const FILL = "var(--band-middle)";

export default function Lesson() {
  const [percent, setPercent] = useState(30);
  const [whole, setWhole] = useState(60);

  const part = (percent / 100) * whole;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>percent</strong>{" "}is a rate <strong>&ldquo;per 100.&rdquo;</strong>{" "}
        {percent}% means {percent} out of every 100. To find {percent}% of a
        number, treat it as the ratio {percent} : 100 and scale.
      </p>

      <Figure caption="The 100-grid is the whole. The shaded squares are the percent.">
        <div className="flex flex-col items-center gap-6">
          <div className="grid gap-px rounded border-2 border-[var(--ink-soft)] p-px" style={{ gridTemplateColumns: "repeat(10, 1.3rem)" }}>
            {Array.from({ length: 100 }, (_, i) => (
              <div key={i} style={{ width: "1.3rem", height: "1.3rem", background: i < percent ? FILL : "var(--surface-2)" }} />
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-3xl font-black" style={{ color: FILL }}>{percent}%</div>
            <div className="mt-1 font-mono text-[15px] text-[var(--ink-soft)]">= {percent}/100 = {(percent / 100).toFixed(2)}</div>
          </div>

          <div className="rounded-2xl bg-[var(--surface-2)] px-6 py-3 text-center">
            <div className="font-mono text-lg font-black">{percent}% of {whole} = <span style={{ color: FILL }}>{part % 1 === 0 ? part : part.toFixed(1)}</span></div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">{percent}/100 × {whole} = {part % 1 === 0 ? part : part.toFixed(1)}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Percent" value={percent} min={0} max={100} step={5} onChange={setPercent} suffix="%" />
            <Stepper label="Whole" value={whole} min={10} max={200} step={10} onChange={setWhole} />
          </div>
        </div>
      </Figure>

      <h2>Out of one hundred</h2>
      <p>
        Because a percent is always out of 100, {percent}% is the same as the
        fraction {percent}/100 and the decimal {(percent / 100).toFixed(2)}.
        Finding a percent of a number is just multiplying by that decimal.
      </p>

      <MathCheck>
        <p>
          A <strong>percent</strong>{" "}is a rate per 100 — a special ratio (6.RP.A.3).
          {" "}{percent}% = {percent}/100, so {percent}% of {whole} = {percent}/100 × {whole} = {part % 1 === 0 ? part : part.toFixed(1)}. Percents, along with tables,
          tape diagrams, and double number lines, are all ratio-reasoning tools for
          solving real-world rate problems.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-14 text-center text-2xl font-black tabular-nums">{value}{suffix}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
