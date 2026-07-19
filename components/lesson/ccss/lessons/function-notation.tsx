"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

export default function Lesson() {
  const [x, setX] = useState(3);
  // f(x) = 2x + 1
  const f = (n: number) => 2 * n + 1;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>function</strong>{" "}is a rule that gives each input{" "}
        <strong>exactly one output</strong>. We write it{" "}
        <strong>f(x)</strong>{" "}— read "f of x" — where x is the input and f(x)
        the result. A <strong>sequence</strong>{" "}is just a function whose inputs
        are the counting numbers.
      </p>

      <Figure caption="Feed x into the machine; out comes f(x) = 2x + 1. Each input has one output.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-xs uppercase text-[var(--ink-faint)]">input</span>
              <div className="grid h-14 w-14 place-items-center rounded-xl border-2 border-[var(--ink-soft)] text-2xl font-black">{x}</div>
            </div>
            <span className="text-2xl">→</span>
            <div className="grid h-16 w-28 place-items-center rounded-xl text-lg font-black text-white" style={{ background: ACCENT }}>f(x)=2x+1</div>
            <span className="text-2xl">→</span>
            <div className="flex flex-col items-center">
              <span className="text-xs uppercase text-[var(--ink-faint)]">output</span>
              <div className="grid h-14 w-14 place-items-center rounded-xl border-2 text-2xl font-black" style={{ borderColor: ACCENT, color: ACCENT }}>{f(x)}</div>
            </div>
          </div>

          <div className="font-mono text-lg">f({x}) = 2·{x} + 1 = <strong style={{ color: ACCENT }}>{f(x)}</strong></div>

          <Stepper label="input x" value={x} onChange={setX} />

          <div className="w-full max-w-md">
            <div className="text-center text-xs font-bold uppercase text-[var(--ink-faint)]">as a sequence aₙ = f(n)</div>
            <table className="mx-auto mt-1 text-center font-mono text-sm">
              <thead><tr className="text-[var(--ink-faint)]"><th className="px-3">n</th>{[1, 2, 3, 4, 5].map((n) => <th key={n} className="px-3">{n}</th>)}</tr></thead>
              <tbody><tr><td className="px-3 font-bold">aₙ</td>{[1, 2, 3, 4, 5].map((n) => <td key={n} className="px-3" style={n === x ? { color: ACCENT, fontWeight: 800 } : undefined}>{f(n)}</td>)}</tr></tbody>
            </table>
          </div>
        </div>
      </Figure>

      <h2>Notation, evaluation, and sequences</h2>
      <p>
        f({x}) = {f(x)} does not mean multiply f by {x}; it means "apply the rule f
        to {x}." The vertical-line test captures the one-output rule graphically. And
        a sequence like 3, 5, 7, 9, … is the function f(n) = 2n + 1 restricted to the
        integers — its domain is the counting numbers.
      </p>

      <MathCheck>
        <p>
          A <strong>function</strong>{" "}assigns each input exactly one output
          (F-IF.1). <strong>Function notation</strong>{" "}f(x) names the output for
          input x and lets us evaluate and interpret it in context (F-IF.2).{" "}
          <strong>Sequences</strong>{" "}are functions whose domain is a subset of the
          integers (F-IF.3), often defined recursively or explicitly.
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
        <button type="button" onClick={() => onChange(Math.max(-5, value - 1))} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(9, value + 1))} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
