"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const BARW = 280;
const A = "var(--band-upper)";
const B = "var(--band-middle)";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function Bar({ num, den, color }: { num: number; den: number; color: string }) {
  return (
    <div className="flex overflow-hidden rounded-lg border-2 border-[var(--line)]" style={{ width: BARW, height: 36 }}>
      {Array.from({ length: den }, (_, i) => (
        <div key={i} className="border-r border-white/60 last:border-r-0" style={{ width: BARW / den, background: i < num ? color : "var(--surface-2)" }} />
      ))}
    </div>
  );
}

export default function Lesson() {
  const [n1, setN1] = useState(2);
  const [d1, setD1] = useState(3);
  const [n2, setN2] = useState(3);
  const [d2, setD2] = useState(5);

  const lcm = (d1 * d2) / gcd(d1, d2);
  const na = n1 * (lcm / d1);
  const nc = n2 * (lcm / d2);
  const symbol = na > nc ? ">" : na < nc ? "<" : "=";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        How do you compare fractions with <strong>different denominators</strong>,
        like 2/3 and 3/5? Rewrite them with a <strong>common denominator</strong>{" "}
        so the pieces are the same size — then just compare the numerators.
      </p>

      <Figure caption="Rewrite both with the same denominator, then the bars line up for a fair comparison.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <Bar num={n1} den={d1} color={A} />
              <span className="w-14 font-mono text-lg font-bold" style={{ color: A }}>{n1}/{d1}</span>
            </div>
            <div className="flex items-center gap-3">
              <Bar num={n2} den={d2} color={B} />
              <span className="w-14 font-mono text-lg font-bold" style={{ color: B }}>{n2}/{d2}</span>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center">
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Common denominator {lcm}</div>
            <div className="font-mono text-[15px]">
              <span style={{ color: A }}>{n1}/{d1} = {na}/{lcm}</span>
              <span className="mx-3 text-[var(--ink-faint)]">·</span>
              <span style={{ color: B }}>{n2}/{d2} = {nc}/{lcm}</span>
            </div>
          </div>

          <div className="font-mono text-3xl font-black">
            <span style={{ color: A }}>{n1}/{d1}</span> {symbol} <span style={{ color: B }}>{n2}/{d2}</span>
          </div>
          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            With denominator {lcm}, compare {na} vs {nc} — {symbol === "=" ? "they are equal" : `${na > nc ? na : nc}/${lcm} is more`}.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <FracControl label="First" color={A} num={n1} den={d1} onNum={setN1} onDen={(v) => { setD1(v); setN1((p) => Math.min(p, v)); }} />
            <FracControl label="Second" color={B} num={n2} den={d2} onNum={setN2} onDen={(v) => { setD2(v); setN2((p) => Math.min(p, v)); }} />
          </div>
        </div>
      </Figure>

      <h2>Make the pieces match</h2>
      <p>
        You can only compare numerators when the denominators agree. A quick
        {/* The two fractions were hard-coded while the clause after them was
            live, so the sentence attributed the displayed numbers to 2/3 and
            3/5 whatever the controls were set to. */}
        shortcut is the <strong>benchmark 1/2</strong>: {n1}/{d1} is {n1 / d1 > 0.5 ? "more" : n1 / d1 < 0.5 ? "less" : "exactly"} than half and{" "}
        {n2}/{d2} is {n2 / d2 > 0.5 ? "more" : n2 / d2 < 0.5 ? "less" : "exactly"} than half, so you rewrite to be sure — {na}/{lcm} vs {nc}/{lcm}.
      </p>

      <MathCheck>
        <p>
          Comparing two fractions with different numerators and denominators
          (4.NF.A.2) works by creating <strong>common denominators</strong>{" "}(or
          common numerators), or by comparing to a <strong>benchmark</strong>{" "}like
          1/2. Here both become fractions of {lcm}ths, so {n1}/{d1} {symbol} {n2}/{d2}. A comparison is only valid when the two wholes are the same.
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
