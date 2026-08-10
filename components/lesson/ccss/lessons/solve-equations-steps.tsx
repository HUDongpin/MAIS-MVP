"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { relationForDisplayedValue } from "@/components/lesson/ccss/numberPresentation";

const ACCENT = "var(--band-high)";

function integerText(value: number) {
  return value < 0 ? "−" + Math.abs(value) : String(value);
}

function linearExpression(coefficient: number, constant: number) {
  const xTerm = integerText(coefficient) + "x";
  if (constant === 0) return xTerm;
  return xTerm + (constant < 0 ? " − " : " + ") + Math.abs(constant);
}

function inverseMove(value: number, variable = "", sentenceStart = false) {
  const magnitude = Math.abs(value);
  const term = (variable && magnitude === 1 ? "" : String(magnitude)) + variable;
  const verb = value < 0
    ? (sentenceStart ? "Adding" : "add")
    : (sentenceStart ? "Subtracting" : "subtract");
  return value < 0
    ? verb + " " + term + " to both sides"
    : verb + " " + term + " from both sides";
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function reducedFractionText(numerator: number, denominator: number) {
  const divisor = greatestCommonDivisor(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const reducedNumerator = sign * numerator / divisor;
  const reducedDenominator = sign * denominator / divisor;
  return reducedDenominator === 1
    ? integerText(reducedNumerator)
    : `${integerText(reducedNumerator)}/${reducedDenominator}`;
}

export default function Lesson() {
  // solve 3x + 2 = x + 10  →  x = 4  (kept integer)
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [c, setC] = useState(1);
  const [d, setD] = useState(10);

  const solvable = a !== c;
  const numerator = d - b;
  const denominator = a - c;
  const x = solvable ? numerator / denominator : NaN;
  const xIsInteger = solvable && Number.isInteger(x);
  const exactX = solvable ? reducedFractionText(numerator, denominator) : "";
  const xDisplay = solvable ? x.toFixed(2) : "";
  const xDisplayRelation = solvable ? relationForDisplayedValue(x, xDisplay) : "≈";
  const firstMoveProperty = c < 0 ? "addition property of equality" : "subtraction property of equality";

  const steps = [
    { line: `${linearExpression(a, b)} = ${linearExpression(c, d)}`, why: "original equation" },
    { line: `${linearExpression(a - c, b)} = ${integerText(d)}`, why: inverseMove(c, "x") },
    { line: `${integerText(a - c)}x = ${integerText(d - b)}`, why: inverseMove(b) },
    // a === c collapses the x-terms, so there is nothing to divide by. Printing
    // "divide both sides by 0" as the justification is the one thing an
    // A-REI.1 lesson about legitimate steps must never do.
    {
      line: solvable
        ? (xIsInteger
            ? `x = ${exactX}`
            : `x = ${exactX} ${xDisplayRelation} ${xDisplay} (${xDisplayRelation === "=" ? "exact decimal" : "nearest hundredth"})`)
        : (d - b === 0 ? "0 = 0 — true for every x" : `0 = ${integerText(d - b)} — impossible`),
      why: solvable
        ? `divide both sides by ${integerText(a - c)}`
        : (d - b === 0 ? "the x-terms cancel and the equation is always true" : "the x-terms cancel and the equation is never true"),
    },
  ];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Solving an equation is a chain of <strong>reversible moves</strong>, each
        keeping both sides equal. Every step has a <em>reason</em>{" "}— a property of
        equality. Naming the reason is what turns "getting the answer" into a
        genuine proof.
      </p>

      <Figure caption="Each line follows from the one above by doing the same thing to both sides.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex w-full max-w-lg flex-col gap-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-4 py-2" style={{ background: i === steps.length - 1 ? "var(--surface-2)" : "transparent", border: i === steps.length - 1 ? `2px solid ${ACCENT}` : "1px solid var(--line)" }}>
                <span className="font-mono text-lg font-black" style={{ color: i === steps.length - 1 ? ACCENT : "var(--ink)" }}>{s.line}</span>
                <span className="text-xs text-[var(--ink-faint)]">{s.why}</span>
              </div>
            ))}
          </div>

          {!solvable && <p className="m-0 text-center text-sm font-bold" style={{ color: ACCENT }}>Equal slopes (a = c): no unique solution — all-x or no-x.</p>}

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
            <Stepper label="a" value={a} onChange={setA} />
            <Stepper label="b" value={b} onChange={setB} />
            <Stepper label="c" value={c} onChange={setC} />
            <Stepper label="d" value={d} onChange={setD} />
          </div>
        </div>
      </Figure>

      <h2>Every step is justified</h2>
      {solvable ? (
        <p>
          {inverseMove(c, "x", true)} is justified by the{" "}
          <strong>{firstMoveProperty}</strong>. Because {integerText(a - c)} is
          nonzero, dividing both sides by {integerText(a - c)} is allowed by the{" "}
          <strong>division property of equality</strong>. The exact solution is x ={" "}
          {exactX}.{!xIsInteger && <> Its two-decimal form {xDisplayRelation === "=" ? "is exactly" : "is approximately"} {xDisplay}
          {xDisplayRelation === "≈" ? " to the nearest hundredth" : ""}.</>} Each algebraic equality through x = {exactX}
          is reversible and has exactly the same solutions as the first equation.
          {!xIsInteger && xDisplayRelation === "≈" && <> The rounded decimal is a presentation approximation,
          not another equality-preserving algebra step.</>}
        </p>
      ) : (
        <p>
          {inverseMove(c, "x", true)} makes the variable terms cancel. The resulting
          statement is {d - b === 0 ? "0 = 0, so every real x is a solution" : `0 = ${integerText(d - b)}, so there is no solution`}.
          There is no division step: dividing by zero is undefined.
        </p>
      )}

      <MathCheck>
        <p>
          Each step in solving an equation follows from the previous by a{" "}
          <strong>property of equality</strong>, and a viable argument names them
          (A-REI.1). This method solves any <strong>linear equation or
          inequality</strong>{" "}in one variable (A-REI.3) — with inequalities
          flipping direction when you multiply or divide by a negative.
        </p>
      </MathCheck>
    </div>
  );
}

// The equation on screen is written in numerals only ("3x + 2 = 1x + 10"), so the
// letters a, b, c and d name nothing a screen-reader user can locate. The buttons
// pair the letter with the role that coefficient plays in the equation.
const ROLE: Record<string, string | undefined> = {
  a: "left-side x coefficient",
  b: "left-side constant",
  c: "right-side x coefficient",
  d: "right-side constant",
};

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const role = ROLE[label] ?? label;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(-9, value - 1))} disabled={value <= -9} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Decrease ${label}, the ${role}`}>−</button>
        <span className="w-7 text-center text-lg font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(12, value + 1))} disabled={value >= 12} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Increase ${label}, the ${role}`}>+</button>
      </div>
    </div>
  );
}
