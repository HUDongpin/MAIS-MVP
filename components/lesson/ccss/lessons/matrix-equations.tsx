"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  // system: a x + b y = e ; c x + d y = f
  const [a, setA] = useState(2);
  const [b, setB] = useState(1);
  const [c, setC] = useState(1);
  const [d, setD] = useState(3);
  const [e, setE] = useState(5);
  const [f, setF] = useState(10);

  const det = a * d - b * c;
  const x = det !== 0 ? r2((e * d - b * f) / det) : NaN;
  const y = det !== 0 ? r2((a * f - e * c) / det) : NaN;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A linear system can be packed into a single{" "}
        <strong>matrix equation Ax = b</strong>. If A has an{" "}
        <strong>inverse</strong>{" "}(when det A ≠ 0), the solution is{" "}
        <strong>x = A⁻¹b</strong>{" "}— the matrix version of dividing.
      </p>

      <Figure caption="Write the system as A·[x, y] = [e, f], then multiply by A⁻¹ to solve.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1 font-mono text-lg">
            <span>{a}x + {b}y = {e}</span>
            <span>{c}x + {d}y = {f}</span>
          </div>

          <div className="mx-auto flex w-max max-w-none self-start items-center gap-3 font-mono">
            <Mat rows={[[a, b], [c, d]]} label="A" />
            <Mat rows={[["x"], ["y"]]} label="x" />
            <span className="text-2xl font-black">=</span>
            <Mat rows={[[e], [f]]} label="b" />
          </div>

          <div className="rounded-2xl border-2 px-6 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">det A = {a}·{d} − {b}·{c} = <strong>{det}</strong></div>
            {det !== 0 ? (
              <div className="mt-1 text-xl font-black" style={{ color: ACCENT }}>x = {x},  y = {y}</div>
            ) : (
              <div className="mt-1 font-black" style={{ color: ACCENT }}>det = 0 → no unique solution (A is singular)</div>
            )}
          </div>

          <div className="mx-auto grid w-max max-w-none self-start grid-cols-2 gap-x-1 gap-y-2 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-6">
            <Stepper label="a" value={a} onChange={setA} />
            <Stepper label="b" value={b} onChange={setB} />
            <Stepper label="c" value={c} onChange={setC} />
            <Stepper label="d" value={d} onChange={setD} />
            <Stepper label="e" value={e} onChange={setE} />
            <Stepper label="f" value={f} onChange={setF} />
          </div>
        </div>
      </Figure>

      <h2>Inverse matrices solve systems</h2>
      <p>
        For a 2×2 matrix, A⁻¹ = (1/det A)·[[d, −b], [−c, a]]. Multiplying both
        sides of Ax = b by A⁻¹ isolates x, giving x = A⁻¹b. It works precisely when{" "}
        <strong>det A ≠ 0</strong>; a zero determinant means the equations are
        dependent or inconsistent — no single solution.
      </p>

      <MathCheck>
        <p>
          A system of linear equations is equivalent to a{" "}
          <strong>matrix equation Ax = b</strong>{" "}(A-REI.8). When the coefficient
          matrix is invertible, the unique solution is{" "}
          <strong>x = A⁻¹b</strong>{" "}(A-REI.9); the inverse exists exactly when the
          determinant is nonzero, which is also when the lines actually cross at one
          point.
        </p>
      </MathCheck>
    </div>
  );
}

function Mat({ rows, label }: { rows: (number | string)[][]; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-stretch">
        <span className="w-1.5 rounded-l border-2 border-r-0 border-[var(--ink-soft)]" />
        <div className="flex flex-col gap-1 px-2 py-1.5 text-lg font-bold">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-3">{row.map((v, j) => <span key={j} className="w-5 text-center">{v}</span>)}</div>
          ))}
        </div>
        <span className="w-1.5 rounded-r border-2 border-l-0 border-[var(--ink-soft)]" />
      </div>
      <span className="text-xs font-bold text-[var(--ink-faint)]">{label}</span>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(-9, value - 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-lg font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(12, value + 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
