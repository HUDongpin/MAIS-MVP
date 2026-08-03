"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const EST = "var(--band-middle)";
const ACCENT = "var(--band-upper)";

export default function Lesson() {
  const [dividend, setDividend] = useState(432);
  const [divisor, setDivisor] = useState(16);

  const q = Math.floor(dividend / divisor);
  const r = dividend % divisor;
  const dRound = Math.round(divisor / 10) * 10 || 10;
  const est = Math.floor(dividend / dRound);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Dividing by a <strong>two-digit number</strong>{" "}gets easier if you{" "}
        <strong>estimate first</strong>. Round the divisor to a friendly ten, make
        a guess, then adjust. Every division still checks with multiplication.
      </p>

      <Figure caption="Round the divisor to estimate the quotient, then find the exact answer.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-3xl font-black">{dividend} ÷ {divisor} = <span style={{ color: ACCENT }}>{q}</span>{r > 0 && <span> R {r}</span>}</div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 px-6 py-4 text-center" style={{ borderColor: EST }}>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: EST }}>Estimate</div>
              <div className="font-mono text-sm text-[var(--ink-soft)]">round {divisor} → {dRound}</div>
              <div className="font-mono text-2xl font-black" style={{ color: EST }}>{dividend} ÷ {dRound} ≈ {est}</div>
            </div>
            <div className="rounded-2xl border-2 px-6 py-4 text-center" style={{ borderColor: ACCENT }}>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Exact</div>
              <div className="font-mono text-sm text-[var(--ink-soft)]">{dividend} ÷ {divisor}</div>
              <div className="font-mono text-2xl font-black" style={{ color: ACCENT }}>= {q} R {r}</div>
            </div>
          </div>

          <p className="m-0 max-w-md text-center font-mono text-[15px] font-semibold text-[var(--ink-soft)]">
            check: {divisor} × {q} {r > 0 ? `+ ${r} ` : ""}= {dividend} ✓
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Dividend" value={dividend} min={100} max={999} step={1} onChange={setDividend} />
            <Stepper label="Divisor" value={divisor} min={11} max={40} step={1} onChange={setDivisor} />
          </div>
        </div>
      </Figure>

      <h2>Estimate, then adjust</h2>
      <p>
        Rounding {divisor} to {dRound} gives a quick estimate of about {est}. The
        exact quotient is {q}, which is close — so you know your answer is
        {/* The check has to include the remainder, or it does not check
            anything: 432 ÷ 17 = 25 R 7 was "confirmed" by 17 × 25 = 425. */}
        reasonable. Multiplying back confirms it: {divisor} × {q}{r > 0 ? ` + ${r}` : ""} = {divisor * q + r}.
      </p>

      <MathCheck>
        <p>
          Finding whole-number quotients with up to four-digit dividends and{" "}
          <strong>two-digit divisors</strong>{" "}(5.NBT.B.6) uses place value,
          estimation, and the relationship between multiplication and division.
          Rounding the divisor to estimate the quotient keeps the work manageable,
          and <strong>divisor × quotient + remainder = dividend</strong>{" "}checks it:{" "}
          {divisor} × {q} {r > 0 ? `+ ${r} ` : ""}= {dividend}.
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
        <span className="w-12 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
