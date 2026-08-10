"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const L = "var(--band-middle)";
const Rr = "var(--band-upper)";

export default function Lesson() {
  const [mode, setMode] = useState<"expand" | "combine">("expand");
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [c, setC] = useState(4);

  const left = mode === "expand" ? `${a}(x + ${b})` : `${a}x + ${b} + ${c}x`;
  const right = mode === "expand" ? `${a}x + ${a * b}` : `${a + c}x + ${b}`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Linear expressions can be rewritten without changing their value.{" "}
        <strong>Expanding</strong>{" "}uses the distributive property to remove
        parentheses; <strong>factoring</strong>{" "}puts them back; and{" "}
        <strong>combining like terms</strong>{" "}tidies things up.
      </p>

      <Figure caption="Two forms of the same expression. Expanding and factoring are opposites.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {([["expand", "Expand"], ["combine", "Combine like terms"]] as const).map(([m, lbl]) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m ? { background: L, color: "white", borderColor: L } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          <div className="font-mono text-3xl font-black">
            <span style={{ color: L }}>{left}</span> = <span style={{ color: Rr }}>{right}</span>
          </div>

          <div className="max-w-md rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center text-[15px] text-[var(--ink-soft)]">
            {mode === "expand"
              ? <>The {a} multiplies <em>both</em>{" "}terms inside: {a}·x = {a}x and {a}·{b} = {a * b}. So {a}(x + {b}) = {a}x + {a * b}.</>
              : <>{a}x and {c}x are <em>like terms</em>{" "}(both have x), so they add: {a}x + {c}x = {a + c}x. The {b} stays separate.</>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="a" value={a} onChange={setA} />
            <Stepper label="b" value={b} onChange={setB} />
            {mode === "combine" && <Stepper label="c" value={c} onChange={setC} />}
          </div>
        </div>
      </Figure>

      <h2>Same value, cleaner form</h2>
      <p>
        {mode === "expand"
          ? `Expanding ${a}(x + ${b}) gives ${a}x + ${a * b}. Factoring reverses it — pull the ${a} back out. Both name the same number for every x.`
          : `Combining ${a}x + ${c}x into ${a + c}x groups the like terms. The constant ${b} has no x, so it cannot be combined with them.`}
      </p>

      <MathCheck>
        <p>
          Adding, subtracting, factoring, and expanding linear expressions with
          rational coefficients (7.EE.A.1) all use the properties of operations.
          Rewriting an expression in an equivalent form (7.EE.A.2) can reveal how
          quantities relate — here {left} and {right} are the same expression, just
          written two ways.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1, Math.min(9, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-6 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 9} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
