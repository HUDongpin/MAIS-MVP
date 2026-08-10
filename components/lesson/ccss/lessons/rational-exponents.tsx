"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export default function Lesson() {
  const [base, setBase] = useState(8);
  const [m, setM] = useState(2); // numerator
  const [n, setN] = useState(3); // denominator (root)

  const exactRoot = Math.pow(base, 1 / n);
  const exactValue = Math.pow(base, m / n);
  const root = r3(exactRoot);
  const value = r3(exactValue);
  const rootRelation = Math.abs(exactRoot - root) < 1e-10 ? "=" : "≈";
  const valueRelation = Math.abs(exactValue - value) < 1e-10 ? "=" : "≈";
  // Raise the EXACT root, not its three-decimal display value. Powering the
  // rounded root printed "27^(4/4) = 27" beside "= (2.28)^4 = 27.023" — the two
  // routes this lesson exists to show are equal, disagreeing on screen.
  const asRootThenPow = r3(Math.pow(exactRoot, m));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        What could <strong>8^(1/3)</strong>{" "}mean? To keep the power-of-a-power
        rule <strong>(b^p)^q = b^(pq)</strong>{" "}working, we need
        (8^(1/3))³ = 8¹ = 8 — so 8^(1/3) must be the number whose cube is 8. A{" "}
        <strong>rational exponent is a root</strong>.
      </p>

      <Figure caption="A fractional exponent m/n means: take the nth root, then raise to the mth power.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-2xl border-2 px-8 py-4 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-3xl font-black">
              {base}<sup>{m}/{n}</sup> {valueRelation} <span style={{ color: ACCENT }}>{value}</span>
            </div>
            <div className="mt-3 text-sm text-[var(--ink-soft)]">
              {/* The index belongs above the radical. Rendered inline, "3√8"
                  is the standard way of writing 3·√8 ≈ 8.49. */}
              exactly: {base}<sup>{m}/{n}</sup> = (<sup>{n}</sup>√{base})<sup>{m}</sup>; numerically, <sup>{n}</sup>√{base} {rootRelation} {root} and the final value {valueRelation} {asRootThenPow}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-center font-mono text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">
              <div className="text-xs text-[var(--ink-faint)]">nth root first</div>
              {base}<sup>1/{n}</sup> {rootRelation} {root}
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">
              <div className="text-xs text-[var(--ink-faint)]">then mth power</div>
              (<sup>{n}</sup>√{base})<sup>{m}</sup> {valueRelation} {asRootThenPow}
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">
              <div className="text-xs text-[var(--ink-faint)]">radical form</div>
              <sup>{n}</sup>√({base}<sup>{m}</sup>)
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Stepper label="base b" value={base} min={2} max={27} onChange={setBase} />
            <Stepper label="power m" value={m} min={1} max={4} onChange={setM} />
            <Stepper label="root n" value={n} min={1} max={4} onChange={setN} />
          </div>
        </div>
      </Figure>

      <h2>Roots and powers are the same idea</h2>
      <p>
        Because exponents add when you multiply and multiply when you nest,{" "}
        <strong>b^(m/n)</strong>{" "}has to equal the nth root of b, raised to the
        mth power. Here {base}<sup>{m}/{n}</sup> {valueRelation} {value}{valueRelation === "≈" ? " (to the nearest thousandth)" : ""}. The rule for integer
        exponents forces this definition — nothing new is assumed.
      </p>

      <MathCheck>
        <p>
          Extending exponents to <strong>rational</strong>{" "}values follows from
          the integer-exponent laws (N-RN.1). For b &gt; 0, as in this display,
          defining b<sup>1/n</sup> as the{" "}
          <strong>nth root</strong>{" "}is the only choice that keeps
          (b<sup>1/n</sup>)<sup>n</sup> = b. So any radical can be rewritten with
          a rational exponent and vice versa (N-RN.2):{" "}
          <strong>b<sup>m/n</sup> = <sup>n</sup>√(b<sup>m</sup>)</strong>.
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
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
