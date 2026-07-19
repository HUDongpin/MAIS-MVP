"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const SMALL = "var(--band-middle)";
const BIG = "var(--band-upper)";
const PXU = 16;

export default function Lesson() {
  const [base, setBase] = useState(7);
  const [times, setTimes] = useState(5);
  const product = base * times;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Multiplication can mean <strong>&ldquo;times as many.&rdquo;</strong>{" "}
        Saying <strong>{product} is {times} times as many as {base}</strong>{" "}is the
        same as the equation <strong>{times} × {base} = {product}</strong>. One bar
        is a stack of copies of the other.
      </p>

      <Figure caption="The long bar is several copies of the short bar — that many times as much.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded" style={{ width: base * PXU, height: 26, background: SMALL }} />
              <span className="text-sm font-bold" style={{ color: SMALL }}>{base}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex overflow-hidden rounded">
                {Array.from({ length: times }, (_, i) => (
                  <div key={i} className="border-r-2 border-white" style={{ width: base * PXU, height: 26, background: BIG }} />
                ))}
              </div>
              <span className="text-sm font-bold" style={{ color: BIG }}>{product}</span>
            </div>
          </div>

          <p className="m-0 text-center text-lg font-semibold">
            <span style={{ color: BIG }}>{product}</span> is <strong>{times} times</strong>{" "}as many as <span style={{ color: SMALL }}>{base}</span>.
          </p>

          <div className="font-mono text-2xl font-black">{times} × {base} = <span style={{ color: BIG }}>{product}</span></div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Smaller amount" value={base} min={2} max={12} color={SMALL} onChange={setBase} />
            <Stepper label="Times as many" value={times} min={2} max={6} color={BIG} onChange={setTimes} />
          </div>
        </div>
      </Figure>

      <h2>Comparing by multiplying</h2>
      <p>
        This is different from &ldquo;{times} more than {base}.&rdquo; <em>Times as
        many</em>{" "}means copying, not adding. So {product} is {times} times {base},
        while {base} is {times} times <em>smaller</em>{" "}— its {times}th part.
      </p>

      <MathCheck>
        <p>
          A multiplication equation can be read as a <strong>comparison</strong>{" "}
          (4.OA.A.1): {times} × {base} = {product} says &ldquo;{product} is {times}{" "}
          times as many as {base}.&rdquo; Solving word problems with this idea —
          finding the product, the size, or the multiplier — is 4.OA.A.2.
          &ldquo;Times as many&rdquo; (multiply) is different from &ldquo;more
          than&rdquo; (add).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
