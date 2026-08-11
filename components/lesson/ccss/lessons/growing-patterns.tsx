"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const DOT = "var(--band-upper)";

export default function Lesson() {
  const [start, setStart] = useState(2);
  const [step, setStep] = useState(3);

  const seq = Array.from({ length: 6 }, (_, i) => start + i * step);
  const feature = step % 2 === 0
    ? `Because you add ${step} (an even number) each time, every term keeps the same parity — they are all ${start % 2 === 0 ? "even" : "odd"}.`
    : `Because you add ${step} (an odd number) each time, the terms alternate: odd, even, odd, even…`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Give a <strong>rule</strong>{" "}and a starting number, and you can{" "}
        <strong>generate a pattern</strong>. Then look closely — patterns hide
        features the rule did not say out loud, like whether the numbers are odd
        or even.
      </p>

      <Figure caption="Rule: start at the first number, then add the step each time. The rows grow.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2 text-sm font-bold">
            Rule: start at {start}, add {step} each time
          </div>

          <div className="mx-auto flex w-max max-w-none self-start flex-col gap-1.5">
            {seq.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-right font-mono text-xs text-[var(--ink-faint)]">{i + 1}.</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: v }, (_, k) => <div key={k} className="h-3.5 w-3.5 rounded-full" style={{ background: DOT }} />)}
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: DOT }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="font-mono text-lg font-black">{seq.join(", ")}, …</div>
          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">{feature}</p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Start" value={start} min={1} max={9} onChange={setStart} />
            <Stepper label="Add each time" value={step} min={1} max={6} onChange={setStep} />
          </div>
        </div>
      </Figure>

      <h2>Rules make patterns</h2>
      <p>
        The rule &ldquo;add {step}&rdquo; builds the whole sequence {seq[0]},{" "}
        {seq[1]}, {seq[2]}, … And a feature appears for free: {step % 2 === 0 ? "the parity never changes" : "the terms flip between odd and even"}.
      </p>

      <MathCheck>
        <p>
          Generating a number or shape pattern from a given rule, and then
          identifying features that were not part of the rule, is 4.OA.C.5. Adding{" "}
          {step} repeatedly makes the sequence {seq.slice(0, 4).join(", ")}, …; the
          hidden feature — {step % 2 === 0 ? "constant parity" : "alternating odd and even"} — follows from the step being {step % 2 === 0 ? "even" : "odd"}.
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
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
