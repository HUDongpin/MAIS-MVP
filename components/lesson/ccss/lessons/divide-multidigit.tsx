"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";

function partialQuotients(D: number, d: number) {
  const steps: { mult: number; product: number; remaining: number }[] = [];
  let remaining = D;
  let place = Math.floor(Math.log10(D / d) + 1e-9);
  if (place < 0) place = 0;
  for (let p = place; p >= 0; p--) {
    const chunk = d * Math.pow(10, p);
    const count = Math.floor(remaining / chunk);
    if (count > 0) {
      const product = chunk * count;
      remaining -= product;
      steps.push({ mult: count * Math.pow(10, p), product, remaining });
    }
  }
  return steps;
}

export default function Lesson() {
  const [D, setD] = useState(4728);
  const [d, setDivisor] = useState(24);

  const steps = partialQuotients(D, d);
  const quotient = Math.floor(D / d);
  const remainder = D % d;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To divide big numbers, take away the divisor in <strong>big friendly
        chunks</strong>{" "}— hundreds of them, then tens, then ones. Add up the
        chunks and you have the quotient. This is <strong>partial quotients</strong>.
      </p>

      {/* "until nothing is left" is false whenever there is a remainder, which
          one press of the dividend stepper reaches, and the figure directly
          below shows the remainder. */}
      <Figure caption="Subtract easy multiples of the divisor, largest first, until what is left is smaller than the divisor.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-3xl font-black">{D.toLocaleString()} ÷ {d} = <span style={{ color: ACCENT }}>{quotient}</span>{remainder > 0 && <span> R {remainder}</span>}</div>

          <div className="flex flex-col gap-1.5">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-4 rounded-lg border border-[var(--line)] px-4 py-1.5 font-mono text-sm">
                <span style={{ color: ACCENT }}>{d} × {s.mult} = {s.product.toLocaleString()}</span>
                <span className="text-[var(--ink-faint)]">leaves {s.remaining.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] px-5 py-2 text-center font-mono text-[15px] font-semibold">
            quotient = {steps.map((s) => s.mult).join(" + ")} = <strong style={{ color: ACCENT }}>{quotient}</strong>{remainder > 0 && <>, remainder {remainder}</>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Dividend" value={D} min={100} max={9999} step={1} big onChange={setD} />
            <Stepper label="Divisor" value={d} min={11} max={99} step={1} onChange={setDivisor} />
          </div>
        </div>
      </Figure>

      <h2>Chunks add up to the quotient</h2>
      <p>
        Each line removes a whole batch of {d}s. Because {steps.map((s) => s.mult).join(" + ")} = {quotient} {quotient === 1 ? "batch was" : "batches were"} taken out with {remainder} left over,{" "}
        {D.toLocaleString()} ÷ {d} = {quotient} R {remainder}. Check: {d} × {quotient} {remainder > 0 ? `+ ${remainder} ` : ""}= {D.toLocaleString()}.
      </p>

      <MathCheck>
        <p>
          Fluently dividing multi-digit numbers (6.NS.B.2) can be done with the
          standard algorithm or with <strong>partial quotients</strong>: subtract
          convenient multiples of the divisor and total the multipliers. Both rely
          on place value, and both check with <strong>divisor × quotient +
          remainder = dividend</strong>.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step, big, onChange }: { label: string; value: number; min: number; max: number; step: number; big?: boolean; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        {big && <button type="button" onClick={() => onChange(value - 100)} disabled={value - 100 < min} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold disabled:opacity-40" aria-label={`Decrease ${label} by 100`}>−100</button>}
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-16 text-center text-xl font-black tabular-nums">{value.toLocaleString()}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
        {big && <button type="button" onClick={() => onChange(value + 100)} disabled={value + 100 > max} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold disabled:opacity-40" aria-label={`Increase ${label} by 100`}>+100</button>}
      </div>
    </div>
  );
}
