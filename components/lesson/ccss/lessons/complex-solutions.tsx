"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  // x² + bx + c = 0
  const [b, setB] = useState(2);
  const [c, setC] = useState(5);

  const disc = b * b - 4 * c;
  const real = -b / 2;
  const imag = r2(Math.sqrt(Math.abs(disc)) / 2);

  let roots: string;
  if (disc > 0) {
    const s = r2(Math.sqrt(disc) / 2);
    roots = `x = ${r2(real - s)}  or  x = ${r2(real + s)}`;
  } else if (disc === 0) {
    roots = `x = ${r2(real)} (double root)`;
  } else {
    const rp = r2(real);
    roots = `x = ${rp} ± ${imag}i`;
  }

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A quadratic like x² + 2x + 5 = 0 has no real roots — its parabola never
        crosses the x-axis. But over the <strong>complex numbers</strong>{" "}it has
        two roots, a <strong>conjugate pair</strong>{" "}a ± bi. Every polynomial
        factors completely once i is allowed.
      </p>

      <Figure caption="When the discriminant b² − 4c is negative, the two roots are complex conjugates.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-6 py-2 font-mono text-2xl font-black">
            x² + {b}x + {c} = 0
          </div>

          <div className="grid w-full max-w-md grid-cols-1 gap-2 font-mono text-sm">
            <div className="flex justify-between rounded-lg bg-[var(--surface-2)] px-4 py-2">
              <span className="text-[var(--ink-faint)]">discriminant b² − 4c</span>
              <span className="font-black" style={{ color: disc < 0 ? ACCENT : "var(--ink)" }}>{b}² − 4·{c} = {disc}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-[var(--surface-2)] px-4 py-2">
              <span className="text-[var(--ink-faint)]">nature of roots</span>
              <span className="font-black">{disc > 0 ? "two real" : disc === 0 ? "one real (double)" : "complex conjugates"}</span>
            </div>
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono text-xl font-black" style={{ borderColor: ACCENT, color: ACCENT }}>
            {roots}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="b" value={b} min={-6} max={6} onChange={setB} />
            <Stepper label="c" value={c} min={-6} max={12} onChange={setC} />
          </div>
        </div>
      </Figure>

      <h2>The quadratic formula always works</h2>
      <p>
        x = (−b ± √(b² − 4c)) / 2. When b² − 4c &lt; 0, that square root is
        imaginary, giving x = {r2(real)} ± {imag}i. The two roots are mirror
        images across the real axis — a <strong>conjugate pair</strong>{" "}— and
        multiplying (x − root)(x − root̄) rebuilds the original real polynomial.
      </p>

      <MathCheck>
        <p>
          Completing the square or the quadratic formula solves{" "}
          <strong>any</strong>{" "}quadratic over the complex numbers (N-CN.7); a
          negative discriminant yields conjugate roots a ± bi. Identities like{" "}
          x² + y² = (x + yi)(x − yi) extend factoring to ℂ (N-CN.8), and the{" "}
          <strong>Fundamental Theorem of Algebra</strong>{" "}guarantees a degree-n
          polynomial has exactly n complex roots (N-CN.9).
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
