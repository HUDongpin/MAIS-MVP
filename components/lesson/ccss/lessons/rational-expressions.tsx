"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

type Ex = { title: string; expr: string; steps: string[]; result: string };

const EXAMPLES: Ex[] = [
  {
    title: "Divide by factoring",
    expr: "(x² + 5x + 6) ÷ (x + 2)",
    steps: ["x² + 5x + 6 = (x + 2)(x + 3)", "cancel the (x + 2) factor"],
    result: "x + 3",
  },
  {
    title: "Divide with remainder",
    expr: "(x² + 1) ÷ (x + 1)",
    steps: ["x² + 1 = (x + 1)(x − 1) + 2", "quotient x − 1, remainder 2"],
    result: "x − 1 + 2/(x + 1)",
  },
  {
    title: "Add fractions",
    expr: "1/x + 1/(x + 1)",
    steps: ["common denominator x(x + 1)", "(x + 1) + x over x(x + 1)"],
    result: "(2x + 1) / [x(x + 1)]",
  },
  {
    title: "Multiply",
    expr: "(x/(x+1)) · ((x+1)/x²)",
    steps: ["multiply across", "cancel (x + 1) and one x"],
    result: "1/x",
  },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const ex = EXAMPLES[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>rational expression</strong>{" "}is a ratio of polynomials —
        algebra&apos;s version of a fraction. They follow the <em>same rules</em>{" "}
        as number fractions: factor, cancel common factors, find common
        denominators, and multiply across.
      </p>

      <Figure caption="Rational expressions add, subtract, multiply, and divide just like numeric fractions.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((e, i) => (
              <button key={e.title} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{e.title}</button>
            ))}
          </div>

          <div className="rounded-lg bg-[var(--surface-2)] px-6 py-2 font-mono text-xl font-black">{ex.expr}</div>

          <div className="flex flex-col items-center gap-1 font-mono text-sm text-[var(--ink-soft)]">
            {ex.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[var(--ink-faint)]">{i + 1}.</span> {s}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono text-2xl font-black" style={{ borderColor: ACCENT, color: ACCENT }}>
            = {ex.result}
          </div>
        </div>
      </Figure>

      <h2>Divide, then simplify</h2>
      <p>
        Polynomial <strong>long division</strong>{" "}rewrites p(x)/d(x) as a
        quotient plus remainder/divisor — exactly like turning 7/2 into 3 + 1/2.
        For +, −, ×, ÷ you factor first so common factors cancel. The rational
        expressions are closed under all four operations (with nonzero divisors).
      </p>

      <MathCheck>
        <p>
          Any rational expression can be rewritten as{" "}
          <strong>quotient + remainder/divisor</strong>{" "}using division or a
          computer algebra system (A-APR.6). Rational expressions form a system
          closed under <strong>+, −, ×, and ÷</strong>{" "}by nonzero expressions
          (A-APR.7) — analogous to the rational numbers.
        </p>
      </MathCheck>
    </div>
  );
}
