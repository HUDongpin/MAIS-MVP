"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const OTHER = "var(--band-upper)";

export default function Lesson() {
  // Function A given as a graph/formula: f(x) = 3x + 4  (rate 3, intercept 4)
  // Function B given as a table. Let user set B's rate and intercept.
  const [mB, setMB] = useState(5);
  const [bB, setBB] = useState(1);

  const fA = (x: number) => 3 * x + 4;
  const fB = (x: number) => mB * x + bB;

  const fasterRate = mB > 3 ? "B" : mB < 3 ? "A" : "tie";
  const higherStart = bB > 4 ? "B" : bB < 4 ? "A" : "tie";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two functions are often described <em>differently</em>{" "}— one as a formula,
        another as a table or graph. To compare them, pull out the same features:
        their <strong>rate of change</strong>{" "}and their <strong>starting
        value</strong>. Then they stack up directly.
      </p>

      <Figure caption="Function A is a formula; B is a table. Compare their rates and intercepts head to head.">
        <div className="flex flex-col items-center gap-6">
          <div className="grid w-full max-w-lg grid-cols-2 gap-4">
            <div className="rounded-xl border-2 p-3 text-center" style={{ borderColor: ACCENT }}>
              <div className="text-xs font-bold uppercase" style={{ color: ACCENT }}>Function A (formula)</div>
              <div className="font-mono text-lg font-black">f(x) = 3x + 4</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">rate 3, start 4</div>
            </div>
            <div className="rounded-xl border-2 p-3 text-center" style={{ borderColor: OTHER }}>
              <div className="text-xs font-bold uppercase" style={{ color: OTHER }}>Function B (table)</div>
              <table className="mx-auto font-mono text-xs">
                <thead><tr className="text-[var(--ink-faint)]"><th className="px-1.5">x</th>{[0, 1, 2, 3].map((x) => <th key={x} className="px-1.5">{x}</th>)}</tr></thead>
                <tbody><tr><td className="px-1.5 font-bold">y</td>{[0, 1, 2, 3].map((x) => <td key={x} className="px-1.5">{fB(x)}</td>)}</tr></tbody>
              </table>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">rate {mB}, start {bB}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">Greater rate of change: <strong style={{ color: fasterRate === "A" ? ACCENT : fasterRate === "B" ? OTHER : "var(--ink)" }}>{fasterRate === "tie" ? "equal" : fasterRate}</strong></div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">Greater starting value: <strong style={{ color: higherStart === "A" ? ACCENT : higherStart === "B" ? OTHER : "var(--ink)" }}>{higherStart === "tie" ? "equal" : higherStart}</strong></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="B's rate" value={mB} min={1} max={9} onChange={setMB} />
            <Stepper label="B's start" value={bB} min={0} max={10} onChange={setBB} />
          </div>
        </div>
      </Figure>

      <h2>Same features, different clothes</h2>
      <p>
        A&apos;s rate is 3 and B&apos;s is {mB}, so {fasterRate === "tie" ? "they change at the same pace" : `${fasterRate} grows faster`}. B&apos;s
        table shows its start ({bB}) at x = 0, versus A&apos;s 4. Whichever
        eventually wins depends on the rates — a bigger slope always overtakes,
        given enough x. Comparison just needs the features in a common language.
      </p>

      <MathCheck>
        <p>
          To <strong>compare functions</strong>{" "}given in different
          representations — algebraic, graphical, numerical, verbal — extract and
          compare their key properties (F-IF.9), such as rate of change, intercepts,
          and maximum values. The representation changes; the underlying features
          are what you match up.
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
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: OTHER }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
