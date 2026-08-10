"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const CONJ = "var(--band-upper)";
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function fmt(re: number, im: number) {
  if (im === 0) return `${re}`;
  const sign = im < 0 ? "−" : "+";
  const mag = Math.abs(im) === 1 ? "" : Math.abs(im);
  return `${re} ${sign} ${mag}i`;
}

function squaredTerm(value: number) {
  const base = value < 0 ? "(" + value + ")" : String(value);
  return base + "²";
}

export default function Lesson() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);

  const modulus = r3(Math.sqrt(a * a + b * b));
  const prod = a * a + b * b; // z · conj(z)
  const isZero = prod === 0;
  const modulusRelation = Number.isInteger(Math.sqrt(prod)) ? "=" : "≈";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>conjugate</strong>{" "}of z = a + bi is z̄ = a − bi — flip the
        sign of the imaginary part. It has a magic property: z · z̄ is always a{" "}
        <strong>real</strong>{" "}number, equal to a² + b². That is the key to
        dividing complex numbers and to finding a number&apos;s size.
      </p>

      {/* There is no SVG in this lesson — the figure is the two values and the
          formula rows below them — so "reflects across the real axis" pointed
          at a picture that is not drawn. */}
      <Figure caption="Flipping the sign of the imaginary part gives the conjugate; z · z̄ = a² + b² is real and equals |z|².">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6 font-mono text-xl">
            <span>z = <strong style={{ color: ACCENT }}>{fmt(a, b)}</strong></span>
            <span>z̄ = <strong style={{ color: CONJ }}>{fmt(a, -b)}</strong></span>
          </div>

          <div className="grid w-full max-w-md grid-cols-1 gap-3 font-mono">
            {/* modulus is rounded to 3dp, so "√2 = 1.414" asserted equality
                with a terminating decimal whenever a² + b² is not a square. */}
            <Row label="modulus |z| = √(a² + b²)" value={`√${prod} ${modulusRelation} ${modulus}`} />
            <Row label="z · z̄ = a² + b²" value={squaredTerm(a) + " + " + squaredTerm(b) + " = " + prod} />
            <Row label="1/z = z̄ / |z|² (z ≠ 0)" value={isZero ? "undefined for z = 0" : `(${fmt(a, -b)}) / ${prod}`} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="a (real)" value={a} onChange={setA} />
            <Stepper label="b (imag)" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Why the product is real</h2>
      <p>
        Multiply (a + bi)(a − bi) = a² − (bi)² = a² − b²i² = a² + b². The
        imaginary terms cancel and −i² becomes +1. So z · z̄ = {prod}, a real
        number, and its square root {modulusRelation} {modulus} is the <strong>modulus</strong>{" "}
        — the distance from 0 to z in the plane.
      </p>

      <MathCheck>
        <p>
          For z = a + bi, the <strong>conjugate</strong>{" "}z̄ = a − bi, the{" "}
          <strong>modulus</strong>{" "}|z| = √(a² + b²), and the{" "}
          <strong>quotient</strong>{" "}z/w, for w ≠ 0, is computed by multiplying
          numerator and denominator by w̄ to make the denominator real (N-CN.3). The identity{" "}
          z · z̄ = |z|² = a² + b² is what makes this work.
        </p>
      </MathCheck>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-2">
      <span className="text-xs text-[var(--ink-faint)]">{label}</span>
      <span className="text-lg font-black" style={{ color: ACCENT }}>{value}</span>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(-9, value - 1))} disabled={value <= -9} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(9, value + 1))} disabled={value >= 9} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
