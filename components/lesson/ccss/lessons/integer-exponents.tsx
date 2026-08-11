"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Rule = "product" | "quotient" | "power";
const ACCENT = "var(--band-upper)";

function expStr(base: number, e: number) {
  return <span>{base}<sup>{e}</sup></span>;
}
function value(base: number, e: number) {
  const v = Math.pow(base, e);
  return v % 1 === 0 ? `${v}` : `1/${Math.pow(base, -e)}`;
}

export default function Lesson() {
  const [base] = useState(2);
  const [m, setM] = useState(3);
  const [n, setN] = useState(2);
  const [rule, setRule] = useState<Rule>("product");

  const resultExp = rule === "product" ? m + n : rule === "quotient" ? m - n : m * n;
  const RULES: Record<Rule, { name: string; formula: React.ReactNode }> = {
    product: { name: "Product rule", formula: <>{expStr(base, m)} × {expStr(base, n)} = {base}<sup>{m}+{n}</sup> = {expStr(base, m + n)}</> },
    quotient: { name: "Quotient rule", formula: <>{expStr(base, m)} ÷ {expStr(base, n)} = {base}<sup>{m}−{n}</sup> = {expStr(base, m - n)}</> },
    power: { name: "Power rule", formula: <>({expStr(base, m)})<sup>{n}</sup> = {base}<sup>{m}×{n}</sup> = {expStr(base, m * n)}</> },
  };

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Exponents follow tidy <strong>rules</strong>. Multiplying the same base{" "}
        <strong>adds</strong>{" "}exponents; dividing <strong>subtracts</strong>;
        raising a power to a power <strong>multiplies</strong>. These also explain{" "}
        <strong>negative</strong>{" "}and <strong>zero</strong>{" "}exponents.
      </p>

      <Figure caption="Same base, one operation — the exponents combine by a simple rule.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(Object.keys(RULES) as Rule[]).map((rk) => (
              <button key={rk} type="button" onClick={() => setRule(rk)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={rule === rk ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{RULES[rk].name}</button>
            ))}
          </div>

          <div className="font-mono text-3xl font-black">{RULES[rule].formula}</div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-2xl font-black" style={{ color: ACCENT }}>= {value(base, resultExp)}</div>
            {resultExp === 0 && <div className="text-sm text-[var(--ink-soft)]">any base to the 0 power is 1</div>}
            {resultExp < 0 && <div className="text-sm text-[var(--ink-soft)]">a negative exponent means a reciprocal</div>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Exponent m" value={m} onChange={setM} />
            <Stepper label="Exponent n" value={n} onChange={setN} />
          </div>
        </div>
      </Figure>

      <h2>Why zero and negatives work</h2>
      <p>
        The quotient rule forces it: {base}³ ÷ {base}³ = {base}<sup>0</sup>, but any
        number over itself is 1 — so {base}<sup>0</sup> = 1. And {base}² ÷ {base}⁵ = {base}<sup>−3</sup> = 1/{base}³. The rules stay consistent.
      </p>

      <MathCheck>
        <p>
          The properties of integer exponents (8.EE.A.1): <strong>aᵐ · aⁿ = aᵐ⁺ⁿ</strong>,{" "}
          <strong>aᵐ ÷ aⁿ = aᵐ⁻ⁿ</strong>, and <strong>(aᵐ)ⁿ = aᵐⁿ</strong>. From
          these it follows that <strong>a⁰ = 1</strong>{" "}and <strong>a⁻ⁿ = 1/aⁿ</strong>,
          letting you generate equivalent numerical expressions.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(-3, Math.min(5, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= -3} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 5} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
