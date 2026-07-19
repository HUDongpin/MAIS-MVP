"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const BARW = 300;
const A = "var(--band-upper)";
const B = "var(--band-middle)";

function Bar({ num, den, color }: { num: number; den: number; color: string }) {
  return (
    <div className="flex overflow-hidden rounded-lg border-2 border-[var(--line)]" style={{ width: BARW, height: 40 }}>
      {Array.from({ length: den }, (_, i) => (
        <div key={i} className="border-r border-white/60 last:border-r-0" style={{ width: BARW / den, background: i < num ? color : "var(--surface-2)" }} />
      ))}
    </div>
  );
}

export default function Lesson() {
  const [n1, setN1] = useState(1);
  const [d1, setD1] = useState(2);
  const [n2, setN2] = useState(2);
  const [d2, setD2] = useState(4);

  const v1 = n1 / d1, v2 = n2 / d2;
  const symbol = Math.abs(v1 - v2) < 1e-9 ? "=" : v1 > v2 ? ">" : "<";
  const equal = symbol === "=";
  const reason =
    equal ? `${n1}/${d1} and ${n2}/${d2} cover the same amount — they are equivalent fractions.`
    : d1 === d2 ? `Same denominator: more parts of the same size is bigger, so compare the numerators (${n1} vs ${n2}).`
    : n1 === n2 ? `Same numerator: fewer parts means bigger pieces, so the smaller denominator wins (${d1} vs ${d2}).`
    : "Compare how much of each whole is shaded.";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two fractions can be <strong>equivalent</strong>{" "}(the same amount named
        two ways) or one can be <strong>bigger</strong>. Line the bars up — the
        one with more shaded is greater. The whole must be the{" "}
        <strong>same size</strong>{" "}for the comparison to be fair.
      </p>

      <Figure caption="Both bars are the same whole. Compare how much of each is shaded.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <Bar num={n1} den={d1} color={A} />
              <span className="w-16 font-mono text-lg font-bold" style={{ color: A }}>{n1}/{d1}</span>
            </div>
            <div className="flex items-center gap-3">
              <Bar num={n2} den={d2} color={B} />
              <span className="w-16 font-mono text-lg font-bold" style={{ color: B }}>{n2}/{d2}</span>
            </div>
          </div>

          <div className="font-mono text-3xl font-black">
            <span style={{ color: A }}>{n1}/{d1}</span> <span style={{ color: equal ? "var(--band-upper)" : "var(--ink)" }}>{symbol}</span> <span style={{ color: B }}>{n2}/{d2}</span>
          </div>
          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">{reason}</p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <FracControl label="First" color={A} num={n1} den={d1} onNum={setN1} onDen={(v) => { setD1(v); setN1((p) => Math.min(p, v)); }} />
            <FracControl label="Second" color={B} num={n2} den={d2} onNum={setN2} onDen={(v) => { setD2(v); setN2((p) => Math.min(p, v)); }} />
          </div>
        </div>
      </Figure>

      <h2>Same size pieces, or same number of pieces</h2>
      <p>
        With the <strong>same denominator</strong>, just count parts — more parts
        wins. With the <strong>same numerator</strong>, the pieces differ in size,
        and <em>fewer</em>, larger pieces win. Fractions that shade the same amount
        are equivalent.
      </p>

      <MathCheck>
        <p>
          Explaining fraction equivalence and comparing fractions is 3.NF.A.3. Two
          fractions are <strong>equivalent</strong>{" "}when they mark the same point
          (like 1/2 = 2/4). To compare, reason about size: with a common
          denominator, compare numerators; with a common numerator, the smaller
          denominator gives the larger fraction. Comparisons are only valid when
          the wholes are the same size.
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
        <Mini label="numerator" value={num} min={0} max={den} onChange={onNum} />
        <span className="text-2xl text-[var(--ink-faint)]">/</span>
        <Mini label="denominator" value={den} min={2} max={8} onChange={onDen} />
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
