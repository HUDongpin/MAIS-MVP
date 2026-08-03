"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const INV = "var(--band-upper)";
const XR = 6, PXX = 24, PAD = 26;
const SIZE = 2 * XR * PXX + 2 * PAD;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [m, setM] = useState(2);
  const [b, setB] = useState(1);

  // b's stepper runs from −4, so interpolating it raw rendered the lesson's two
  // headline formulas as "f(x) = 2x + -3" and "f⁻¹(x) = (x − -3)/2".
  const addB = `${b < 0 ? "−" : "+"} ${Math.abs(b)}`;
  const subB = `${b < 0 ? "+" : "−"} ${Math.abs(b)}`;
  const bWord = b < 0 ? `subtracts ${Math.abs(b)}` : `adds ${b}`;
  const bInverseWord = b < 0 ? `adds ${Math.abs(b)}` : `subtracts ${b}`;
  const [x, setX] = useState(2);

  const f = (t: number) => m * t + b;
  const fInv = (t: number) => (t - b) / m; // solve y = m x + b for x

  const sx = (v: number) => PAD + (v + XR) * PXX;
  const sy = (v: number) => SIZE - PAD - (v + XR) * PXX;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        An <strong>inverse function</strong>{" "}f⁻¹ undoes f: if f sends x to y, then
        f⁻¹ sends y back to x. To find it, <strong>swap x and y</strong>{" "}and solve.
        Its graph is the mirror image of f across the line <strong>y = x</strong>.
      </p>

      <Figure caption="f and f⁻¹ are reflections across y = x. Applying one then the other returns your input.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6 font-mono text-lg font-black">
            <span style={{ color: ACCENT }}>f(x) = {m}x {addB}</span>
            <span style={{ color: INV }}>f⁻¹(x) = (x {subB})/{m}</span>
          </div>

          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 320 }} role="img" aria-label="function and its inverse">
            {Array.from({ length: 2 * XR + 1 }, (_, i) => i - XR).map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(v)} y1={sy(-XR)} x2={sx(v)} y2={sy(XR)} />
                <line x1={sx(-XR)} y1={sy(v)} x2={sx(XR)} y2={sy(v)} />
              </g>
            ))}
            <line x1={sx(-XR)} y1={sy(0)} x2={sx(XR)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-XR)} x2={sx(0)} y2={sy(XR)} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* y = x mirror */}
            <line x1={sx(-XR)} y1={sy(-XR)} x2={sx(XR)} y2={sy(XR)} stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="5 4" />
            <line x1={sx(-XR)} y1={sy(f(-XR))} x2={sx(XR)} y2={sy(f(XR))} stroke={ACCENT} strokeWidth={2.5} />
            <line x1={sx(-XR)} y1={sy(fInv(-XR))} x2={sx(XR)} y2={sy(fInv(XR))} stroke={INV} strokeWidth={2.5} />
          </svg>

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono text-sm" style={{ borderColor: ACCENT }}>
            f({x}) = {f(x)}, then f⁻¹({f(x)}) = <strong style={{ color: ACCENT }}>{r2(fInv(f(x)))}</strong>{" "}— back to {x} ✓
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="m" value={m} min={1} max={4} onChange={setM} />
            <Stepper label="b" value={b} min={-4} max={4} onChange={setB} />
            <Stepper label="input x" value={x} min={-4} max={4} onChange={setX} />
          </div>
        </div>
      </Figure>

      <h2>Undoing, and logarithms</h2>
      <p>
        Because f multiplies by {m} then {bWord}, its inverse {bInverseWord} then
        divides by {m} — the operations reversed, in reverse order. The most
        important inverse pair in all of math is <strong>exponential and
        logarithm</strong>: since 10³ = 1000, log₁₀ 1000 = 3. A log <em>is</em>{" "}an
        exponent.
      </p>

      <MathCheck>
        <p>
          The <strong>inverse function</strong>{" "}f⁻¹ reverses f, found by swapping
          x and y and solving; f(f⁻¹(x)) = x (F-BF.4). A function has an inverse when
          it is one-to-one. The <strong>logarithm</strong>{" "}is the inverse of the
          exponential (F-BF.5): logᵦ(bˣ) = x, so logarithms extract exponents.
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
