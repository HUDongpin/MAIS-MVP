"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
const B = "var(--band-middle)";

function expand(c: number, e: number) {
  const v = c * Math.pow(10, e);
  if (e >= 0) return v.toLocaleString();
  return Number(v.toFixed(Math.abs(e))).toString();
}

export default function Lesson() {
  const [c1, setC1] = useState(3);
  const [e1, setE1] = useState(5);
  const [c2, setC2] = useState(2);
  const [e2, setE2] = useState(3);

  // product
  let pc = c1 * c2;
  let pe = e1 + e2;
  if (pc >= 10) { pc = pc / 10; pe += 1; }

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <strong>Scientific notation</strong>{" "}writes any number as a coefficient
        (between 1 and 10) times a <strong>power of 10</strong>. It makes huge and
        tiny numbers manageable — and multiplying them is easy: multiply the
        coefficients, add the exponents.
      </p>

      <Figure caption="A coefficient times a power of ten. Multiply by multiplying coefficients and adding exponents.">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <div className="font-mono text-3xl font-black">
              <span style={{ color: B }}>{c1}</span> × 10<sup>{e1}</sup> = <span style={{ color: ACCENT }}>{expand(c1, e1)}</span>
            </div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{e1 >= 0 ? "move the point right" : "move the point left"} {Math.abs(e1)} places</div>
          </div>

          <div className="w-full max-w-md border-t border-[var(--line)] pt-4 text-center">
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Multiply two of them</div>
            <div className="mt-2 font-mono text-lg font-black">
              ({c1}×10<sup>{e1}</sup>)({c2}×10<sup>{e2}</sup>)
            </div>
            <div className="mt-1 font-mono text-[15px] text-[var(--ink-soft)]">
              = ({c1}×{c2}) × 10<sup>{e1}+{e2}</sup> = {c1 * c2} × 10<sup>{e1 + e2}</sup>
            </div>
            <div className="mt-1 font-mono text-2xl font-black" style={{ color: ACCENT }}>
              = {pc} × 10<sup>{pe}</sup>
            </div>
            {c1 * c2 >= 10 && <div className="text-xs text-[var(--ink-faint)]">(normalized: {c1 * c2} × 10^{e1 + e2} = {pc} × 10^{pe})</div>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* The subscripts ₁/₂ are dropped at default symbol verbosity,
                leaving two buttons named "Decrease c" and two named
                "Decrease e". */}
            <Stepper label="first coefficient" value={c1} min={1} max={9} onChange={setC1} />
            <Stepper label="first exponent" value={e1} min={-5} max={8} onChange={setE1} />
            <Stepper label="second coefficient" value={c2} min={1} max={9} onChange={setC2} />
            <Stepper label="second exponent" value={e2} min={-5} max={8} onChange={setE2} />
          </div>
        </div>
      </Figure>

      <h2>Exponents count the zeros</h2>
      <p>
        {c1} × 10<sup>{e1}</sup> means {c1} followed by {e1 >= 0 ? `${e1} place shift right (${expand(c1, e1)})` : `a shift ${Math.abs(e1)} places left`}. Multiplying powers of ten adds their exponents, which is why the
        product&apos;s exponent is {e1} + {e2} = {e1 + e2}.
      </p>

      <MathCheck>
        <p>
          <strong>Scientific notation</strong>{" "}expresses a number as (1 ≤ c &lt; 10)
          × 10ⁿ (8.EE.A.3), ideal for very large or very small quantities.{" "}
          <strong>Operations</strong>{" "}(8.EE.A.4) use exponent rules: to multiply,
          multiply the coefficients and <strong>add the exponents</strong>, then
          renormalize the coefficient to between 1 and 10 if needed.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-lg font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
