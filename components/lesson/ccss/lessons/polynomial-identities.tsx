"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const IDENTITIES = [
  { name: "(a + b)²", expand: "a² + 2ab + b²", check: (a: number, b: number) => (a + b) ** 2 === a * a + 2 * a * b + b * b },
  { name: "(a − b)²", expand: "a² − 2ab + b²", check: (a: number, b: number) => (a - b) ** 2 === a * a - 2 * a * b + b * b },
  { name: "(a + b)(a − b)", expand: "a² − b²", check: (a: number, b: number) => (a + b) * (a - b) === a * a - b * b },
  { name: "(a + b)³", expand: "a³ + 3a²b + 3ab² + b³", check: (a: number, b: number) => (a + b) ** 3 === a ** 3 + 3 * a * a * b + 3 * a * b * b + b ** 3 },
];

// Pascal's triangle rows for the binomial theorem
const PASCAL = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1], [1, 5, 10, 10, 5, 1]];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const id = IDENTITIES[idx];
  const pascalRowIndex = idx === 3 ? 3 : idx <= 1 ? 2 : null;
  const pascalNote = idx === 1
    ? "Row 2 supplies the coefficient magnitudes 1, 2, 1; substituting −b creates the negative middle term."
    : pascalRowIndex === null
      ? "The difference-of-squares product is not a single binomial power, so no Pascal row is highlighted."
      : `Row ${pascalRowIndex} supplies the coefficients for ${id.name}.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A polynomial <strong>identity</strong>{" "}is true for <em>every</em>{" "}value —
        like (a + b)² = a² + 2ab + b². These aren&apos;t equations to solve; they
        are always-true rewrites. The <strong>Binomial Theorem</strong>{" "}gives them
        all at once, with coefficients from Pascal&apos;s triangle.
      </p>

      <Figure caption="Pick an identity and plug in numbers — both sides always agree. A matching Pascal row is highlighted when the identity is a binomial power.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {IDENTITIES.map((it, i) => (
              <button key={it.name} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{it.name}</button>
            ))}
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-xl font-black">{id.name} = {id.expand}</div>
            <div className="mt-2 text-sm text-[var(--ink-soft)]">
              with a = {a}, b = {b}: both sides = <strong style={{ color: ACCENT }}>{id.name === "(a + b)²" ? (a + b) ** 2 : id.name === "(a − b)²" ? (a - b) ** 2 : id.name === "(a + b)(a − b)" ? (a + b) * (a - b) : (a + b) ** 3}</strong>
              <span className="ml-2">{id.check(a, b) ? "✓" : "✗"}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="a" value={a} onChange={setA} />
            <Stepper label="b" value={b} onChange={setB} />
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold uppercase text-[var(--ink-faint)]">Pascal&apos;s triangle → binomial coefficients</span>
            {PASCAL.map((row, i) => (
              <div key={i} className="flex gap-2 font-mono text-sm" style={{ color: i === pascalRowIndex ? ACCENT : "var(--ink-soft)" }}>
                {row.map((v, j) => <span key={j} className="w-6 text-center">{v}</span>)}
              </div>
            ))}
            <span className="mt-1 max-w-md text-center text-xs text-[var(--ink-faint)]">{pascalNote}</span>
          </div>
        </div>
      </Figure>

      <h2>Identities and the Binomial Theorem</h2>
      <p>
        The row <strong>1 3 3 1</strong>{" "}gives (a + b)³ = a³ + 3a²b + 3ab² + b³ —
        each coefficient is a way to choose terms. In general (a + b)ⁿ expands with
        coefficients ⁿCₖ, the entries of Pascal&apos;s triangle. Identities like
        x² − y² = (x + y)(x − y) then factor numbers and simplify sums.
      </p>

      <MathCheck>
        <p>
          Polynomial <strong>identities</strong>{" "}hold for all values and are
          proved by expanding both sides (A-APR.4) — useful for factoring and even
          number theory (e.g. generating Pythagorean triples). The{" "}
          <strong>Binomial Theorem</strong>{" "}expands (a + b)ⁿ using coefficients
          ⁿCₖ from Pascal&apos;s triangle (A-APR.5).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(-5, value - 1))} disabled={value <= -5} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(9, value + 1))} disabled={value >= 9} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
