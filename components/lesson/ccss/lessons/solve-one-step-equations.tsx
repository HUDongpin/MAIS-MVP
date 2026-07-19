"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";

export default function Lesson() {
  const [mode, setMode] = useState<"add" | "mult">("add");
  const [p, setP] = useState(5);
  const [s, setS] = useState(4); // the solution

  const q = mode === "add" ? s + p : p * s;
  const inverse = mode === "add" ? `subtract ${p}` : `divide by ${p}`;
  const eqn = mode === "add" ? `x + ${p} = ${q}` : `${p}x = ${q}`;
  const step = mode === "add" ? `x = ${q} − ${p}` : `x = ${q} ÷ ${p}`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <strong>Solving</strong>{" "}an equation means finding the value of the
        variable that makes it <strong>true</strong>. To get x by itself, undo
        what was done to it with the <strong>inverse operation</strong>{" "}— on{" "}
        <em>both</em>{" "}sides.
      </p>

      <Figure caption="Do the same thing to both sides to keep the equation balanced.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {([["add", "x + p = q"], ["mult", "px = q"]] as const).map(([m, lbl]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={mode === m ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          <div className="font-mono text-3xl font-black">{eqn}</div>

          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[var(--line)] px-6 py-4 font-mono">
            <div className="text-[15px] text-[var(--ink-soft)]">to undo &ldquo;{mode === "add" ? `+ ${p}` : `× ${p}`}&rdquo;, {inverse} on both sides</div>
            <div className="text-lg">{step}</div>
            <div className="text-3xl font-black" style={{ color: ACCENT }}>x = {s}</div>
          </div>

          <p className="m-0 rounded-xl bg-[var(--surface-2)] px-5 py-2 text-center font-mono text-[15px] font-semibold">
            check: {mode === "add" ? `${s} + ${p} = ${q}` : `${p} × ${s} = ${q}`} ✓
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label={mode === "add" ? "p (added)" : "p (multiplier)"} value={p} min={mode === "mult" ? 2 : 1} max={9} onChange={setP} />
            <Stepper label="solution x" value={s} min={1} max={9} onChange={setS} />
          </div>
        </div>
      </Figure>

      <h2>Inverse operations</h2>
      <p>
        {mode === "add"
          ? `Since ${p} was added to x, subtracting ${p} from both sides isolates x: x = ${q} − ${p} = ${s}.`
          : `Since x was multiplied by ${p}, dividing both sides by ${p} isolates x: x = ${q} ÷ ${p} = ${s}.`}{" "}
        The solution is the one value that makes the equation true.
      </p>

      <MathCheck>
        <p>
          A <strong>solution</strong>{" "}is a value that makes an equation true
          (6.EE.B.5). To solve <strong>x + p = q</strong>{" "}or <strong>px = q</strong>{" "}
          (6.EE.B.7), apply the inverse operation to both sides so the variable is
          alone: {eqn} → {step} → x = {s}. Substituting back confirms it.
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
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
