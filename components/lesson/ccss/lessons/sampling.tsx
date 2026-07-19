"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const TRUE_P = 0.6; // 60% of the population likes soccer
const BLUE = "var(--band-upper)";
const GRAY = "var(--surface-2)";

export default function Lesson() {
  const [size, setSize] = useState(20);
  // deterministic initial sample (12 of 20) to avoid hydration mismatch
  const [sample, setSample] = useState<boolean[]>(() => Array.from({ length: 20 }, (_, i) => i < 12));

  const draw = () => {
    setSample(Array.from({ length: size }, () => Math.random() < TRUE_P));
  };

  const liked = sample.filter(Boolean).length;
  const est = Math.round((liked / sample.length) * 100);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        You can&apos;t ask <em>everyone</em>, so you ask a <strong>sample</strong>.
        If the sample is chosen <strong>randomly</strong>, it tends to look like
        the whole <strong>population</strong>{" "}— so you can use it to estimate.
      </p>

      <Figure caption="Take a random sample. The fraction who like soccer estimates the whole school's fraction.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">Do students like soccer? (Colored = yes)</p>

          <div className="grid max-w-md gap-1" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
            {sample.map((liked, i) => (
              <div key={i} className="aspect-square rounded-full" style={{ background: liked ? BLUE : GRAY }} />
            ))}
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: BLUE }}>
            <div className="font-mono text-2xl font-black" style={{ color: BLUE }}>{liked} of {sample.length} = {est}%</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">estimated to like soccer</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <button type="button" onClick={draw} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: BLUE }}>🎲 Take a new sample</button>
            <Stepper label="Sample size" value={size} min={10} max={50} step={10} onChange={setSize} />
          </div>
          <p className="m-0 text-center text-sm text-[var(--ink-faint)]">
            Resample a few times: small samples jump around; larger samples stay closer to the true 60%.
          </p>
        </div>
      </Figure>

      <h2>A sample stands in for the whole</h2>
      <p>
        Each random sample gives a slightly different estimate — that is{" "}
        <strong>sampling variability</strong>. But a representative sample is a
        valid way to infer about the population, and <strong>bigger samples</strong>{" "}
        give more reliable estimates.
      </p>

      <MathCheck>
        <p>
          Statistics uses a <strong>sample</strong>{" "}to learn about a population
          that is too big to measure fully (7.SP.A.1). A <strong>random</strong>{" "}
          (representative) sample supports valid <strong>inferences</strong>{" "}
          (7.SP.A.2): the sample proportion estimates the population proportion,
          and larger samples reduce the variability of that estimate.
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
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
