"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const L = "var(--band-middle)";
const Rr = "var(--band-upper)";

export default function Lesson() {
  const [mode, setMode] = useState<"dist" | "combine">("dist");
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [x, setX] = useState(4);

  const left = mode === "dist" ? a * (x + b) : a * x + b * x;
  const right = mode === "dist" ? a * x + a * b : (a + b) * x;
  const leftExpr = mode === "dist" ? `${a}(x + ${b})` : `${a}x + ${b}x`;
  const rightExpr = mode === "dist" ? `${a}x + ${a * b}` : `${a + b}x`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two expressions are <strong>equivalent</strong>{" "}if they always give the
        same value, no matter what the variable is. The{" "}
        <strong>properties of operations</strong>{" "}let you rewrite one as the
        other.
      </p>

      <Figure caption="Change x — both expressions always land on the same value.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {([["dist", "Distributive"], ["combine", "Combine like terms"]] as const).map(([m, lbl]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m ? { background: L, color: "white", borderColor: L } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          <div className="font-mono text-3xl font-black">
            <span style={{ color: L }}>{leftExpr}</span> = <span style={{ color: Rr }}>{rightExpr}</span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl border-2 px-6 py-3 text-center" style={{ borderColor: L }}>
              {/* replaceAll, not replace: "3x + 2x" has two x's, so substituting only
                  the first rendered "3(4) + 2x" above a value computed from both. */}
              <div className="font-mono text-sm text-[var(--ink-soft)]">{leftExpr.replaceAll("x", `(${x})`)}</div>
              <div className="font-mono text-2xl font-black" style={{ color: L }}>= {left}</div>
            </div>
            <div className="rounded-xl border-2 px-6 py-3 text-center" style={{ borderColor: Rr }}>
              <div className="font-mono text-sm text-[var(--ink-soft)]">{rightExpr.replaceAll("x", `(${x})`)}</div>
              <div className="font-mono text-2xl font-black" style={{ color: Rr }}>= {right}</div>
            </div>
          </div>

          <p className="m-0 text-center text-lg font-black" style={{ color: left === right ? "var(--band-upper)" : "var(--band-early)" }}>
            {left} = {right} · same value ✓ (equivalent)
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">x = {x}</span>
              <input type="range" min={0} max={10} value={x} onChange={(e) => setX(Number(e.target.value))} className="w-44 accent-[var(--band-middle)]" aria-label="value of x" />
            </div>
            <Stepper label={mode === "dist" ? "a" : "first coefficient"} value={a} onChange={setA} />
            <Stepper label={mode === "dist" ? "b" : "second coefficient"} value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Same value, every time</h2>
      <p>
        {mode === "dist"
          ? `The distributive property spreads the ${a} across the sum: ${a}(x + ${b}) = ${a}x + ${a * b}. Both are ${left} when x = ${x}.`
          : `${a}x and ${b}x are like terms, so they combine: ${a}x + ${b}x = ${a + b}x. Both are ${left} when x = ${x}.`}
      </p>

      <MathCheck>
        <p>
          Using the properties of operations (distributive, commutative,
          associative) to rewrite an expression produces an{" "}
          <strong>equivalent</strong>{" "}expression (6.EE.A.3): {leftExpr} = {rightExpr}. Two expressions are equivalent when they name the same value for{" "}
          <em>every</em>{" "}value of the variable (6.EE.A.4) — which is why both sides
          match at x = {x} and at every other x.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1, Math.min(6, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-6 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 6} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
