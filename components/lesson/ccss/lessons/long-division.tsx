"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const S1 = "var(--band-middle)";
const S2 = "var(--band-upper)";

export default function Lesson() {
  const [dividend, setDividend] = useState(87);
  const [divisor, setDivisor] = useState(5);

  const lead = Math.floor(dividend / 10);
  const q1 = Math.floor(lead / divisor);
  const r1 = lead % divisor;
  const nextNum = r1 * 10 + (dividend % 10);
  const q2 = Math.floor(nextNum / divisor);
  const r2 = nextNum % divisor;
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <strong>Long division</strong>{" "}shares a number place by place. Divide the{" "}
        <strong>tens</strong>{" "}first, carry what is left over to the ones, then
        divide again. Any leftover at the very end is the <strong>remainder</strong>.
      </p>

      <Figure caption="Divide the tens, bring down the ones, divide again. Follow the two steps.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-3xl font-black">{dividend} ÷ {divisor} = <span style={{ color: S2 }}>{quotient}</span>{remainder > 0 && <span> R {remainder}</span>}</div>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl border-2 px-5 py-3" style={{ borderColor: S1 }}>
              <span className="text-xs font-bold uppercase" style={{ color: S1 }}>Step 1 · divide the tens</span>
              <div className="font-mono text-[15px]">{lead} tens ÷ {divisor} = <strong>{q1}</strong>{" "}(in the tens place), remainder {r1} ten{r1 === 1 ? "" : "s"}</div>
            </div>
            <div className="rounded-xl border-2 px-5 py-3" style={{ borderColor: S2 }}>
              <span className="text-xs font-bold uppercase" style={{ color: S2 }}>Step 2 · bring down the ones</span>
              {/* r1 runs 0..divisor-1 and the ones digit reaches 1, so neither plural
                  can be hard-coded. */}
              <div className="font-mono text-[15px]">{r1} ten{r1 === 1 ? "" : "s"} + {dividend % 10} one{dividend % 10 === 1 ? "" : "s"} = {nextNum}, and {nextNum} ÷ {divisor} = <strong>{q2}</strong>{" "}remainder {r2}</div>
            </div>
          </div>

          <p className="m-0 max-w-md text-center font-mono text-[15px] font-semibold text-[var(--ink-soft)]">
            check: {divisor} × {quotient} {remainder > 0 ? `+ ${remainder} ` : ""}= {dividend} ✓
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Dividend" value={dividend} min={20} max={98} onChange={setDividend} />
            <Stepper label="Divisor" value={divisor} min={2} max={9} onChange={setDivisor} />
          </div>
        </div>
      </Figure>

      <h2>Place by place</h2>
      <p>
        Dividing the tens first ({lead} ÷ {divisor}) and carrying the leftover to
        the ones is exactly what the long-division algorithm does. The final
        remainder {remainder} is what cannot be shared into another whole group.
      </p>

      <MathCheck>
        <p>
          Finding whole-number quotients and remainders with up to four-digit
          dividends and one-digit divisors (4.NBT.B.6) uses place value and the
          relationship between multiplication and division. You can always check
          with <strong>divisor × quotient + remainder = dividend</strong>: {divisor} × {quotient} {remainder > 0 ? `+ ${remainder} ` : ""}= {dividend}.
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
        <span className="w-10 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
