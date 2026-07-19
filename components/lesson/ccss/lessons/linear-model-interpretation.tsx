"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

export default function Lesson() {
  // model: monthly phone cost = base + perGB·data
  const [base, setBase] = useState(20);
  const [perGB, setPerGB] = useState(8);
  const [gb, setGb] = useState(3);

  const cost = base + perGB * gb;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        In a linear model y = mx + b, the <strong>slope</strong>{" "}and{" "}
        <strong>intercept</strong>{" "}aren&apos;t just numbers — they have real-world
        meaning with units. Interpreting them correctly is what turns a regression
        line into an insight.
      </p>

      <Figure caption="A phone plan: cost = base + rate·data. The slope is dollars per GB; the intercept is the fixed fee.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-6 py-2 font-mono text-xl font-black">
            cost = {base} + {perGB}·(GB)
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border-l-4 bg-[var(--surface-2)] px-4 py-2" style={{ borderColor: ACCENT }}>
              <div className="text-xs font-bold uppercase" style={{ color: ACCENT }}>slope = {perGB}</div>
              <div className="text-sm">each extra GB adds <strong>${perGB}</strong>{" "}— dollars per GB</div>
            </div>
            <div className="rounded-xl border-l-4 bg-[var(--surface-2)] px-4 py-2" style={{ borderColor: "var(--band-upper)" }}>
              <div className="text-xs font-bold uppercase" style={{ color: "var(--band-upper)" }}>intercept = {base}</div>
              <div className="text-sm">the <strong>${base}</strong>{" "}fixed fee at 0 GB</div>
            </div>
          </div>

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono" style={{ borderColor: ACCENT }}>
            at {gb} GB: cost = {base} + {perGB}·{gb} = <strong style={{ color: ACCENT }}>${cost}</strong>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="fixed fee" value={base} min={0} max={40} step={5} onChange={setBase} />
            <Stepper label="$ per GB" value={perGB} min={2} max={15} step={1} onChange={setPerGB} />
            <Stepper label="GB used" value={gb} min={0} max={10} step={1} onChange={setGb} />
          </div>
        </div>
      </Figure>

      <h2>Slope and intercept, in context</h2>
      <p>
        The <strong>slope {perGB}</strong>{" "}means the cost rises ${perGB} for every
        additional GB — a rate of change with units of dollars per GB. The{" "}
        <strong>intercept {base}</strong>{" "}is the cost of using zero data, the plan&apos;s
        fixed fee. Reading these in context — not just "m and b" — is the whole point
        of a statistical model.
      </p>

      <MathCheck>
        <p>
          <strong>Interpreting the slope and intercept</strong>{" "}of a linear model
          in the context of the data (S-ID.7): the slope is the{" "}
          <strong>rate of change</strong>{" "}(with units), and the intercept is the{" "}
          <strong>predicted value when x = 0</strong>. Meaningful interpretation
          requires attaching the real-world units and checking that x = 0 makes sense.
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
        <span className="w-10 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
