"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ONE = "var(--band-upper)";
const NONE = "var(--band-early)";
const INF = "var(--band-middle)";

export default function Lesson() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [c, setC] = useState(1);
  const [d, setD] = useState(6);

  const coefX = a - c;
  const constant = d - b;
  let kind: "one" | "none" | "inf";
  let sol = 0;
  if (coefX !== 0) { kind = "one"; sol = constant / coefX; }
  else if (constant === 0) kind = "inf";
  else kind = "none";

  const color = kind === "one" ? ONE : kind === "none" ? NONE : INF;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To solve a linear equation, gather the variable on one side and the
        numbers on the other. Usually you get <strong>one solution</strong>{" "}— but
        sometimes there are <strong>none</strong>, or <strong>infinitely many</strong>.
      </p>

      <Figure caption="Collect the x-terms. What is left tells you which of the three cases you have.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-3xl font-black">{a}x + {b} = {c}x + {d}</div>

          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[var(--line)] px-6 py-4 font-mono">
            <div className="text-[15px] text-[var(--ink-soft)]">subtract {c}x and {b}: {coefX}x = {constant}</div>
            {kind === "one" && <div className="text-[15px] text-[var(--ink-soft)]">divide by {coefX}: x = {constant} ÷ {coefX}</div>}
            <div className="text-2xl font-black" style={{ color }}>
              {kind === "one" ? `x = ${sol % 1 === 0 ? sol : sol.toFixed(2)}` : kind === "inf" ? "0 = 0 → all x work" : `0 = ${constant} → impossible`}
            </div>
          </div>

          <div className="rounded-xl px-5 py-2 text-center text-lg font-black" style={{ color }}>
            {kind === "one" ? "ONE solution" : kind === "inf" ? "INFINITELY MANY solutions" : "NO solution"}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Stepper label="a" value={a} onChange={setA} />
            <Stepper label="b" value={b} onChange={setB} />
            <Stepper label="c" value={c} onChange={setC} />
            <Stepper label="d" value={d} onChange={setD} />
          </div>
          <p className="m-0 text-center text-sm text-[var(--ink-faint)]">Try a = c to see the special cases (set b = d for infinite, b ≠ d for none).</p>
        </div>
      </Figure>

      <h2>When the x&apos;s cancel</h2>
      <p>
        {kind === "one"
          ? `Here the x-terms don't cancel (${a} ≠ ${c}), so there's a single solution: x = ${sol % 1 === 0 ? sol : sol.toFixed(2)}.`
          : kind === "inf"
            ? `Both sides are identical, so every value of x makes it true — infinitely many solutions.`
            : `The x's cancel but the numbers disagree (0 = ${constant}), so no value of x can work.`}
      </p>

      <MathCheck>
        <p>
          Solving a linear equation in one variable (8.EE.C.7) can give exactly{" "}
          <strong>one solution</strong>, <strong>no solution</strong>, or{" "}
          <strong>infinitely many</strong>. Collect like terms first: if the x-terms
          differ you get one answer; if they cancel, the equation reduces to a true
          statement (infinite) or a false one (none).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(9, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 0} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-6 text-center text-xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 9} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
