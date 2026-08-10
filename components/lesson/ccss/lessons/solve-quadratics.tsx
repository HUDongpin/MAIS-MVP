"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;
const exactToHundredth = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;
const relation = (...values: number[]) => values.every(exactToHundredth) ? "=" : "≈";

export default function Lesson() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-5);
  const [c, setC] = useState(6);

  const disc = b * b - 4 * a * c;
  // Substituted values need their sign folded in, not a literal "−" prefixed:
  // the default b = −5 rendered "(−-5 ± √1) / 2", and "−5² − 4·1·6" is false as
  // written because −5² is −25 under the order of operations.
  const paren = (n: number) => (n < 0 ? `(−${Math.abs(n)})` : `${n}`);
  const signed = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `${n}`);
  const radicand = disc < 0 ? `−${Math.abs(disc)}` : `${disc}`;
  let roots: string;
  if (disc > 0) {
    const s = Math.sqrt(disc);
    const first = (-b - s) / (2 * a), second = (-b + s) / (2 * a);
    roots = `x ${relation(first)} ${r2(first)}  or  x ${relation(second)} ${r2(second)}`;
  } else if (disc === 0) {
    const root = -b / (2 * a);
    roots = `x ${relation(root)} ${r2(root)} (double root)`;
  } else {
    const real = -b / (2 * a), imag = Math.sqrt(-disc) / (2 * a);
    roots = `x ${relation(real, imag)} ${r2(real)} ± ${r2(imag)}i`;
  }

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A quadratic ax² + bx + c = 0 can be solved four ways:{" "}
        <strong>factoring</strong>, <strong>completing the square</strong>, the{" "}
        <strong>quadratic formula</strong>, or reading a <strong>graph</strong>.
        The <strong>discriminant</strong>{" "}b² − 4ac tells you what kind of roots
        to expect before you start.
      </p>

      <Figure caption="The discriminant b² − 4ac decides: two real roots, one, or a complex pair.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-6 py-2 font-mono text-2xl font-black">
            {a}x² {b < 0 ? "−" : "+"} {Math.abs(b)}x {c < 0 ? "−" : "+"} {Math.abs(c)} = 0
          </div>

          <div className="grid w-full max-w-md grid-cols-1 gap-2 font-mono text-sm">
            <Row label="discriminant" value={`${paren(b)}² − 4·${paren(a)}·${paren(c)} = ${disc}`} />
            <Row label="nature" value={disc > 0 ? "two real roots" : disc === 0 ? "one real (repeated)" : "two complex roots"} />
            <Row label="quadratic formula" value={`(${signed(-b)} ± √${radicand}) / ${2 * a}`} />
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono text-xl font-black" style={{ borderColor: ACCENT, color: ACCENT }}>
            {roots}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="a" value={a} min={1} max={4} onChange={setA} />
            <Stepper label="b" value={b} min={-8} max={8} onChange={setB} />
            <Stepper label="c" value={c} min={-8} max={12} onChange={setC} />
          </div>
        </div>
      </Figure>

      <h2>One formula, from completing the square</h2>
      <p>
        The quadratic formula is completing the square done once, symbolically:{" "}
        x = (−b ± √(b² − 4ac)) / 2a. When b² − 4ac &gt; 0 the parabola crosses the
        x-axis twice; when it equals 0 the vertex sits on the axis; when it&apos;s
        negative the roots are a complex conjugate pair.
      </p>

      <MathCheck>
        <p>
          Quadratics are solved by <strong>inspection/factoring, completing the
          square, the quadratic formula, or graphing</strong>{" "}(A-REI.4). The{" "}
          <strong>discriminant</strong>{" "}b² − 4ac determines the number and type
          of real roots, and completing the square on ax² + bx + c derives the
          quadratic formula in general.
        </p>
      </MathCheck>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-4 py-2">
      <span className="text-xs text-[var(--ink-faint)]">{label}</span>
      <span className="font-black">{value}</span>
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
