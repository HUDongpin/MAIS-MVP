"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";

export default function Lesson() {
  const [p, setP] = useState(25);
  const [mode, setMode] = useState<"sq" | "cube">("sq");

  const root = mode === "sq" ? Math.sqrt(p) : Math.cbrt(p);
  const perfect = Number.isInteger(Math.round(root) ** (mode === "sq" ? 2 : 3)) && Math.abs(root - Math.round(root)) < 1e-9;
  const rootStr = perfect ? `${Math.round(root)}` : root.toFixed(3) + "…";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>square root</strong>{" "}undoes squaring; a <strong>cube root</strong>{" "}
        undoes cubing. So <strong>x² = {mode === "sq" ? p : 0}</strong>{" "}is solved by
        a square root, and <strong>x³ = p</strong>{" "}by a cube root. Some come out
        whole; most are irrational.
      </p>

      <Figure caption="A square root is the side of a square with that area; a cube root, the edge of a cube.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {([["sq", "Square root √"], ["cube", "Cube root ∛"]] as const).map(([m, lbl]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          <div className="font-mono text-4xl font-black">
            {mode === "sq" ? "√" : "∛"}{p} = <span style={{ color: ACCENT }}>{rootStr}</span>
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: ACCENT }}>
            {mode === "sq" ? (
              <div className="font-mono text-lg font-black">x² = {p} → x = ±{rootStr}</div>
            ) : (
              <div className="font-mono text-lg font-black">x³ = {p} → x = {rootStr}</div>
            )}
            <div className="mt-1 text-sm text-[var(--ink-soft)]">
              {perfect ? `${p} is a perfect ${mode === "sq" ? "square" : "cube"} — the root is a whole number.` : `${p} is not a perfect ${mode === "sq" ? "square" : "cube"}, so the root is irrational.`}
            </div>
          </div>

          <Stepper label="p =" value={p} onChange={setP} />
        </div>
      </Figure>

      <h2>Roots solve power equations</h2>
      <p>
        {mode === "sq"
          ? `x² = ${p} has two solutions, +${rootStr} and −${rootStr}, because both a positive and a negative number square to a positive.`
          : `x³ = ${p} has one real solution, ${rootStr}, because cubing keeps the sign.`}
      </p>

      <MathCheck>
        <p>
          The <strong>square-root</strong>{" "}and <strong>cube-root</strong>{" "}symbols
          evaluate perfect squares and cubes and solve equations of the form{" "}
          <strong>x² = p</strong>{" "}and <strong>x³ = p</strong>{" "}(8.EE.A.2). Note x² = p
          gives <strong>two</strong>{" "}solutions (±√p) while x³ = p gives one, and √2
          (or the root of any non-perfect square) is irrational.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1, Math.min(100, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label="Decrease p">−</button>
        <span className="w-12 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 100} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label="Increase p">+</button>
      </div>
    </div>
  );
}
