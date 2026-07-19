"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [a, setA] = useState(2); // first term
  const [ratio, setRatio] = useState(3);
  const [n, setN] = useState(4); // number of terms

  const terms = Array.from({ length: n }, (_, i) => a * Math.pow(ratio, i));
  const sumDirect = terms.reduce((s, t) => s + t, 0);
  // formula a(rⁿ − 1)/(r − 1)
  const sumFormula = ratio === 1 ? a * n : r2((a * (Math.pow(ratio, n) - 1)) / (ratio - 1));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>geometric series</strong>{" "}adds terms that each multiply by a
        fixed ratio r: a + ar + ar² + …. Adding many terms one by one is slow —
        but a clever subtraction trick collapses the whole sum into a{" "}
        <strong>single formula</strong>.
      </p>

      <Figure caption="Add the terms directly, or use S = a(rⁿ − 1)/(r − 1). They always match.">
        <div className="flex flex-col items-center gap-6">
          <div className="w-full overflow-x-auto">
            <div className="mx-auto flex min-w-max items-center justify-center gap-2 font-mono text-lg">
              {terms.map((t, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-[var(--ink-faint)]">+</span>}
                  <span className="rounded-lg bg-[var(--surface-2)] px-3 py-1 font-bold">{t}</span>
                </span>
              ))}
              <span className="text-2xl">=</span>
              <span className="text-2xl font-black" style={{ color: ACCENT }}>{sumDirect}</span>
            </div>
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">S = a(rⁿ − 1)/(r − 1)</div>
            <div className="mt-1 text-lg font-black">
              {a}({ratio}<sup>{n}</sup> − 1)/({ratio} − 1) = <span style={{ color: ACCENT }}>{sumFormula}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="first a" value={a} min={1} max={9} onChange={setA} />
            <Stepper label="ratio r" value={ratio} min={2} max={5} onChange={setRatio} />
            <Stepper label="terms n" value={n} min={1} max={7} onChange={setN} />
          </div>
        </div>
      </Figure>

      <h2>The subtraction trick</h2>
      <p>
        Write S = a + ar + … + arⁿ⁻¹, then rS = ar + ar² + … + arⁿ. Subtract: almost
        everything cancels, leaving rS − S = arⁿ − a, so{" "}
        <strong>S = a(rⁿ − 1)/(r − 1)</strong>. Here that gives {sumFormula},
        matching the direct sum {sumDirect}.
      </p>

      <MathCheck>
        <p>
          A finite <strong>geometric series</strong>{" "}with first term a, ratio r,
          and n terms sums to <strong>a(rⁿ − 1)/(r − 1)</strong>{" "}(A-SSE.4),
          derived by computing S − rS so all interior terms cancel. It powers
          formulas for loan payments, annuities, and repeated growth.
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
