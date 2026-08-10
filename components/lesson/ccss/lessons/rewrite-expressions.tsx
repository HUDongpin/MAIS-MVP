"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;
const addend = (n: number) => n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`;

export default function Lesson() {
  // x² + bx + c → complete the square: (x + b/2)² + (c − (b/2)²)
  const [b, setB] = useState(6);
  const [c, setC] = useState(5);

  const half = b / 2;
  const k = r2(c - half * half); // vertex y
  const h = -half; // vertex x

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <em>same</em>{" "}quadratic can be written many ways, and each reveals
        something. <strong>Factored</strong>{" "}form shows the roots;{" "}
        <strong>vertex</strong>{" "}form (from <strong>completing the square</strong>)
        shows the minimum. Rewriting is how you extract the fact you need.
      </p>

      <Figure caption="Complete the square: turn x² + bx + c into (x + b/2)² plus a constant. The vertex appears.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-6 py-2 font-mono text-2xl font-black">
            x² {addend(b)}x {addend(c)}
          </div>

          <div className="flex flex-col items-center gap-1 font-mono text-lg">
            <span className="text-[var(--ink-faint)] text-sm">add and subtract (b/2)² = {r2(half * half)}</span>
            <span>x² {addend(b)}x + {r2(half * half)} − {r2(half * half)} {addend(c)}</span>
            <span className="text-2xl font-black" style={{ color: ACCENT }}>(x {half < 0 ? "−" : "+"} {Math.abs(half)})² {addend(k)}</span>
          </div>

          <div className="rounded-xl border-2 px-6 py-2 text-center" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">vertex</div>
            <div className="font-mono text-lg font-black" style={{ color: ACCENT }}>({h}, {k})</div>
            <div className="text-xs text-[var(--ink-faint)]">{k < 0 ? "crosses the x-axis twice (two real roots)" : k === 0 ? "touches the x-axis once (a repeated real root)" : "sits above the x-axis (no real roots)"}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="b" value={b} min={-8} max={8} onChange={setB} />
            <Stepper label="c" value={c} min={-6} max={12} onChange={setC} />
          </div>
        </div>
      </Figure>

      <h2>Completing the square</h2>
      <p>
        Take half of b to get {half}, square it ({r2(half * half)}), and add-then-subtract
        it. The first three terms fold into (x {half < 0 ? "−" : "+"} {Math.abs(half)})², leaving the constant{" "}
        {k}. Now the vertex ({h}, {k}) is visible — no graphing needed. Factoring,
        by contrast, would expose the roots directly.
      </p>

      <MathCheck>
        <p>
          <strong>Rewriting</strong>{" "}an expression in an equivalent form reveals
          hidden properties (A-SSE.3): <strong>factoring</strong>{" "}exposes zeros,
          and <strong>completing the square</strong>{" "}exposes the vertex and
          extreme value. Choosing the form that answers your question is a core
          algebraic skill.
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
