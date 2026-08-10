"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

export default function Lesson() {
  // system: a1 x + b1 y = c1 ; a2 x + b2 y = c2 (chosen so solution is integer)
  const [x0, setX0] = useState(2);
  const [y0, setY0] = useState(3);

  // build two equations that pass through (x0, y0)
  const eq1 = { a: 2, b: 1, c: 2 * x0 + 1 * y0 };
  const eq2 = { a: 1, b: -1, c: 1 * x0 - 1 * y0 };

  // eliminate y: eq1 has +1y, eq2 has -1y → add
  const sumA = eq1.a + eq2.a;
  const sumC = eq1.c + eq2.c;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To solve two equations at once, <strong>elimination</strong>{" "}adds a
        multiple of one to the other so a variable cancels. This is legal because
        adding equal things to equal things keeps equality — the new system has
        the <em>same</em>{" "}solution as the old.
      </p>

      <Figure caption="Add the equations to eliminate y, solve for x, then back-substitute for y.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1 font-mono text-lg">
            <span>{eq1.a}x + {eq1.b}y = {eq1.c}</span>
            <span>{eq2.a}x {eq2.b < 0 ? "−" : "+"} {Math.abs(eq2.b)}y = {eq2.c}</span>
            <span className="my-1 h-px w-40 bg-[var(--ink-soft)]" />
            <span style={{ color: ACCENT }}>{sumA}x + 0y = {sumC}</span>
          </div>

          <div className="flex flex-col items-center gap-1 font-mono text-sm text-[var(--ink-soft)]">
            <span>add the two equations → the y-terms (+y and −y) cancel</span>
            <span>{sumA}x = {sumC} → x = {sumC / sumA}</span>
            <span>back-substitute: y = {y0}</span>
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono text-2xl font-black" style={{ borderColor: ACCENT, color: ACCENT }}>
            ({x0}, {y0})
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="solution x" value={x0} onChange={setX0} />
            <Stepper label="solution y" value={y0} onChange={setY0} />
          </div>
          <p className="m-0 text-center text-xs text-[var(--ink-faint)]">Set the answer; the system is built to have that solution.</p>
        </div>
      </Figure>

      <h2>Why adding equations is legal</h2>
      <p>
        If a₁x + b₁y = c₁ and a₂x + b₂y = c₂ are both true, then their sum is true
        too — you added equal quantities to both sides. So replacing one equation
        with a sum (or multiple) doesn&apos;t change which (x, y) satisfy the
        system. That is the whole justification for elimination.
      </p>

      <MathCheck>
        <p>
          <strong>Elimination</strong>{" "}works because replacing one equation with
          the sum of itself and a multiple of another produces a system with the
          <strong>same solutions</strong>{" "}(A-REI.5). Using it, any 2×2 (or larger)
          <strong>linear system</strong>{" "}can be solved exactly (A-REI.6) — by
          elimination or the equivalent substitution method.
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
        <button type="button" onClick={() => onChange(Math.min(5, value + 1))} disabled={value >= 5} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
