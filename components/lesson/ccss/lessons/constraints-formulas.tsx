"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

const FORMULAS = [
  { name: "Area of triangle", forward: "A = ½bh", solveFor: "h", rearranged: "h = 2A / b", compute: (A: number, b: number) => r2((2 * A) / b) },
  { name: "Distance", forward: "d = rt", solveFor: "t", rearranged: "t = d / r", compute: (d: number, r: number) => r2(d / r) },
  { name: "Circle area", forward: "A = πr²", solveFor: "r", rearranged: "r = √(A / π)", compute: (A: number) => r2(Math.sqrt(A / Math.PI)) },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const [x, setX] = useState(24);
  const [y, setY] = useState(6);
  const f = FORMULAS[idx];
  const val = idx === 2 ? f.compute(x, 0) : f.compute(x, y);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Real problems come with <strong>constraints</strong>{" "}— limits written as
        equations, inequalities, or systems. And a single formula can be{" "}
        <strong>rearranged</strong>{" "}to solve for whichever quantity you want,
        using the very same moves as solving an equation.
      </p>

      <Figure caption="Rearrange a formula to isolate a chosen variable — then it computes that quantity directly.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {FORMULAS.map((fo, i) => (
              <button key={fo.name} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{fo.name}</button>
            ))}
          </div>

          <div className="flex items-center gap-4 font-mono text-2xl font-black">
            <span>{f.forward}</span>
            <span className="text-[var(--ink-faint)] text-lg">→ solve for {f.solveFor} →</span>
            <span style={{ color: ACCENT }}>{f.rearranged}</span>
          </div>

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono" style={{ borderColor: ACCENT }}>
            {idx === 2 ? (
              <div>with A = {x}: {f.solveFor} = <strong style={{ color: ACCENT }}>{val}</strong></div>
            ) : (
              <div>with {idx === 0 ? "A" : "d"} = {x}, {idx === 0 ? "b" : "r"} = {y}: {f.solveFor} = <strong style={{ color: ACCENT }}>{val}</strong></div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label={idx === 2 ? "A" : idx === 0 ? "A" : "d"} value={x} min={1} max={60} onChange={setX} />
            {idx !== 2 && <Stepper label={idx === 0 ? "b" : "r"} value={y} min={1} max={12} onChange={setY} />}
          </div>
        </div>
      </Figure>

      <h2>Constraints and rearranging</h2>
      <p>
        A budget "spend at most $50" is a constraint 3x + 2y ≤ 50; combining
        several gives a <strong>system</strong>{" "}whose solutions are the allowed
        choices. And isolating a variable — dividing both sides by b to get h =
        2A/b — is the same balancing act as solving any equation.
      </p>

      <MathCheck>
        <p>
          Situations impose <strong>constraints</strong>{" "}modeled by equations,
          inequalities, or systems, whose solution set is the feasible options
          (A-CED.3). <strong>Rearranging a formula</strong>{" "}to highlight a
          quantity of interest (A-CED.4) uses the same inverse operations as
          solving — treating the other letters as constants.
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
        <span className="w-10 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
