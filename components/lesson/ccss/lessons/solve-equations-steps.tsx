"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

export default function Lesson() {
  // solve 3x + 2 = x + 10  →  x = 4  (kept integer)
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [c, setC] = useState(1);
  const [d, setD] = useState(10);

  const solvable = a !== c;
  const x = solvable ? (d - b) / (a - c) : NaN;

  const steps = [
    { line: `${a}x + ${b} = ${c}x + ${d}`, why: "original equation" },
    { line: `${a - c}x + ${b} = ${d}`, why: `subtract ${c}x from both sides` },
    { line: `${a - c}x = ${d - b}`, why: `subtract ${b} from both sides` },
    // a === c collapses the x-terms, so there is nothing to divide by. Printing
    // "divide both sides by 0" as the justification is the one thing an
    // A-REI.1 lesson about legitimate steps must never do.
    {
      line: solvable
        ? `x = ${Number.isInteger(x) ? x : x.toFixed(2)}`
        : (d - b === 0 ? "0 = 0 — true for every x" : `0 = ${d - b} — impossible`),
      why: solvable
        ? `divide both sides by ${a - c}`
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
      <p>
        Subtracting {c}x from both sides is the <strong>subtraction property of
        equality</strong>; dividing by {a - c} is the <strong>division
        property</strong>. Because each move is reversible, the final line x ={" "}
        {solvable ? (Number.isInteger(x) ? x : x.toFixed(2)) : "?"} has exactly the
        same solutions as the first — that&apos;s why the answer is valid.
      </p>

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
        <button type="button" onClick={() => onChange(Math.max(-9, value - 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Decrease ${label}, the ${role}`}>−</button>
        <span className="w-7 text-center text-lg font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(12, value + 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Increase ${label}, the ${role}`}>+</button>
      </div>
    </div>
  );
}
