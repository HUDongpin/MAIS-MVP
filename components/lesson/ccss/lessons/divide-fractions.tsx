"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A = "var(--band-middle)";
const B = "var(--band-upper)";
const BARW = 300;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function Lesson() {
  const [n1, setN1] = useState(3);
  const [d1, setD1] = useState(4);
  const [n2, setN2] = useState(1);
  const [d2, setD2] = useState(8);

  const rn = n1 * d2, rd = d1 * n2;
  const g = gcd(rn, rd);
  const simN = rn / g, simD = rd / g;
  const resultStr = simD === 1 ? `${simN}` : `${simN}/${simD}`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Dividing by a fraction asks <strong>&ldquo;how many fit?&rdquo;</strong>{" "}
        How many {n2}/{d2}s are in {n1}/{d1}? The shortcut is famous:{" "}
        <strong>keep, change, flip</strong>{" "}— multiply by the reciprocal.
      </p>

      <Figure caption="The shaded bar is the first fraction. Count how many of the second fraction fit inside it.">
        <div className="flex flex-col items-center gap-6">
          {/* dividend bar with divisor tick marks */}
          <div className="relative rounded-lg border-2 border-[var(--line)] overflow-hidden" style={{ width: BARW, height: 40 }}>
            <div className="h-full" style={{ width: (n1 / d1) * BARW, background: A, opacity: 0.85 }} />
            {Array.from({ length: Math.floor((d1 * d2) / gcd(d1, d2)) + 1 }, (_, i) => {
              const x = i * (n2 / d2) * BARW;
              return x <= (n1 / d1) * BARW + 0.5 ? <div key={i} className="absolute top-0 h-full" style={{ left: x, width: 2, background: B }} /> : null;
            })}
          </div>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">
              {n1}/{d1} ÷ {n2}/{d2} = {n1}/{d1} × {d2}/{n2} = <span style={{ color: B }}>{resultStr}</span>
            </div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              Flip the divisor ({n2}/{d2} → {d2}/{n2}) and multiply: {n1}×{d2} = {rn} over {d1}×{n2} = {rd}, which is {resultStr}.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <FracControl label="Dividend" color={A} num={n1} den={d1} onNum={setN1} onDen={(v) => { setD1(v); setN1((p) => Math.min(p, v)); }} />
            <FracControl label="Divisor" color={B} num={n2} den={d2} onNum={setN2} onDen={(v) => { setD2(v); setN2((p) => Math.min(p, v)); }} />
          </div>
        </div>
      </Figure>

      <h2>Why flip and multiply</h2>
      <p>
        Dividing by {n2}/{d2} is the same as multiplying by its{" "}
        <strong>reciprocal</strong>{" "}{d2}/{n2}, because a number times its
        reciprocal is 1. Counting how many {n2}/{d2}-pieces fit in {n1}/{d1} gives{" "}
        {resultStr}.
      </p>

      <MathCheck>
        <p>
          Dividing a fraction by a fraction (6.NS.A.1) means finding how many of
          the divisor fit in the dividend. It equals multiplying by the{" "}
          <strong>reciprocal</strong>: {n1}/{d1} ÷ {n2}/{d2} = {n1}/{d1} × {d2}/{n2} = {resultStr}. This works because dividing and multiplying by the
          flipped fraction undo each other.
        </p>
      </MathCheck>
    </div>
  );
}

function FracControl({ label, color, num, den, onNum, onDen }: { label: string; color: string; num: number; den: number; onNum: (v: number) => void; onDen: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{label}: {num}/{den}</span>
      <div className="flex items-center gap-3">
        {/* FracControl knows whether it is the Dividend or the Divisor; the
            controls inside it did not. */}
        <Mini label={`${label} numerator`} value={num} min={1} max={den} onChange={onNum} />
        <span className="text-2xl text-[var(--ink-faint)]">/</span>
        <Mini label={`${label} denominator`} value={den} min={2} max={8} onChange={onDen} />
      </div>
    </div>
  );
}

function Mini({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
      <span className="w-5 text-center text-lg font-black tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}
