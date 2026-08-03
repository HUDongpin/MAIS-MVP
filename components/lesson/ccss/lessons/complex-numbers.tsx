"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

function fmt(re: number, im: number) {
  if (im === 0) return `${re}`;
  if (re === 0) return im === 1 ? "i" : im === -1 ? "−i" : `${im}i`.replace("-", "−");
  const sign = im < 0 ? "−" : "+";
  const mag = Math.abs(im) === 1 ? "" : Math.abs(im);
  return `${re} ${sign} ${mag}i`;
}

/** Parenthesise a negative operand so it never sits bare after +, − or ·. */
const p = (n: number) => (n < 0 ? `(−${Math.abs(n)})` : `${n}`);

export default function Lesson() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [c, setC] = useState(1);
  const [d, setD] = useState(-4);

  const sumRe = a + c, sumIm = b + d;
  // (a+bi)(c+di) = (ac − bd) + (ad + bc)i
  const prodRe = a * c - b * d;
  const prodIm = a * d + b * c;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Some equations, like x² = −1, have no <em>real</em>{" "}solution. So we
        invent a new number <strong>i</strong>{" "}with <strong>i² = −1</strong>.
        Every <strong>complex number</strong>{" "}has the form a + bi, and they
        add and multiply just like binomials — using i² = −1 to simplify.
      </p>

      <Figure caption="Set two complex numbers. Addition combines like parts; multiplication uses i² = −1.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6 font-mono text-xl font-black">
            <span>z = <span style={{ color: ACCENT }}>{fmt(a, b)}</span></span>
            <span>w = <span style={{ color: ACCENT }}>{fmt(c, d)}</span></span>
          </div>

          <div className="grid w-full max-w-md grid-cols-1 gap-3">
            {/* Parenthesise negative operands. d defaults to −4, so on first
                load these read "(2+-4)i" and "(2−-4)i" — the second being
                exactly the add-or-subtract ambiguity the detail line exists to
                remove. */}
            <Row op="z + w" result={fmt(sumRe, sumIm)} detail={`(${a}+${p(c)}) + (${b}+${p(d)})i`} />
            <Row op="z − w" result={fmt(a - c, b - d)} detail={`(${a}−${p(c)}) + (${b}−${p(d)})i`} />
            <Row op="z · w" result={fmt(prodRe, prodIm)} detail={`(${a}·${p(c)} − ${b}·${p(d)}) + (${a}·${p(d)} + ${b}·${p(c)})i`} />
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            <Stepper label="a (Re z)" value={a} onChange={setA} />
            <Stepper label="b (Im z)" value={b} onChange={setB} />
            <Stepper label="c (Re w)" value={c} onChange={setC} />
            <Stepper label="d (Im w)" value={d} onChange={setD} />
          </div>
        </div>
      </Figure>

      <h2>Multiply like binomials, then use i² = −1</h2>
      <p>
        Expanding (a + bi)(c + di) gives ac + adi + bci + bd·i². Since{" "}
        <strong>i² = −1</strong>, the last term becomes −bd, so the product is{" "}
        <strong>(ac − bd) + (ad + bc)i</strong>. The real and imaginary parts stay
        neatly separate.
      </p>

      <MathCheck>
        <p>
          The imaginary unit <strong>i</strong>{" "}satisfies i² = −1 (N-CN.1), so
          −1 has a square root and the complex numbers a + bi extend the reals.
          They <strong>add, subtract, and multiply</strong>{" "}by treating i as a
          symbol and replacing i² with −1 (N-CN.2), which keeps the commutative,
          associative, and distributive laws intact.
        </p>
      </MathCheck>
    </div>
  );
}

function Row({ op, result, detail }: { op: string; result: string; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-2 font-mono">
      <span className="font-bold">{op}</span>
      <span className="text-xs text-[var(--ink-faint)]">{detail}</span>
      <span className="text-lg font-black" style={{ color: ACCENT }}>{result}</span>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(-9, value - 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-lg font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(9, value + 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
