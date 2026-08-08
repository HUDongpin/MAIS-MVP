"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Op = "add" | "sub" | "mul" | "div";
const ACCENT = "var(--band-middle)";

function fmt(n: number) {
  return Number(n.toFixed(4)).toString();
}

export default function Lesson() {
  const [aInt, setAInt] = useState(120); // 1.20
  const [bInt, setBInt] = useState(40); // 0.40
  const [op, setOp] = useState<Op>("div");

  const a = aInt / 100, b = bInt / 100;
  const hi = Math.max(aInt, bInt), lo = Math.min(aInt, bInt);
  const result =
    op === "add" ? (aInt + bInt) / 100
    : op === "sub" ? (hi - lo) / 100
    : op === "mul" ? (aInt * bInt) / 10000
    : bInt === 0 ? 0 : aInt / bInt;

  // fmt() shows four decimals, but 1.00 ÷ 0.30 is 3.333… — two clicks from the
  // default — so a chained "=" asserted 1 ÷ 0.3 = 3.3333.
  const exact4 = (n: number) => Math.abs(n * 10000 - Math.round(n * 10000)) < 1e-9;
  const eq = exact4(result) ? "=" : "≈";
  const quotient = aInt / bInt;
  const eqQuot = exact4(quotient) ? "=" : "≈";

  const tip =
    op === "div"
      ? `Make the divisor a whole number: multiply both by 100 → ${aInt} ÷ ${bInt} ${eq} ${fmt(result)}.`
      : op === "mul"
        ? `Multiply as whole numbers (${aInt} × ${bInt} = ${aInt * bInt}), then place the point 4 digits in.`
        : "Line up the decimal points, then add or subtract in columns.";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Decimals follow the same four operations as whole numbers. Addition and
        subtraction <strong>line up the point</strong>; multiplication{" "}
        <strong>counts places</strong>; and <strong>division</strong>{" "}makes the
        divisor whole first.
      </p>

      <Figure caption="Choose an operation. The rule that keeps the decimal point in the right place appears.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {([["add", "+"], ["sub", "−"], ["mul", "×"], ["div", "÷"]] as [Op, string][]).map(([o, sym]) => (
              <button key={o} type="button" onClick={() => setOp(o)} className="grid h-10 w-10 place-items-center rounded-lg border text-xl font-black" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{sym}</button>
            ))}
          </div>

          <div className="font-mono text-3xl font-black">
            {op === "sub" ? fmt(hi / 100) : fmt(a)} {op === "add" ? "+" : op === "sub" ? "−" : op === "mul" ? "×" : "÷"} {op === "sub" ? fmt(lo / 100) : fmt(b)} {eq} <span style={{ color: ACCENT }}>{fmt(result)}</span>
          </div>

          <p className="m-0 max-w-md rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center text-[15px] font-semibold text-[var(--ink-soft)]">{tip}</p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={aInt} onChange={setAInt} />
            <Stepper label="Second" value={bInt} onChange={setBInt} />
          </div>
        </div>
      </Figure>

      <h2>Division: shift, then divide</h2>
      <p>
        {op === "div"
          ? `Dividing ${fmt(a)} ÷ ${fmt(b)} is tricky with a decimal divisor. Multiply both by 100 so the divisor is a whole number: ${aInt} ÷ ${bInt} ${eq} ${fmt(result)} — the answer is the same because you scaled both sides equally.`
          : `Once the decimal point is placed correctly, ${op === "add" ? "adding" : op === "sub" ? "subtracting" : "multiplying"} decimals is just like whole-number arithmetic: the answer is ${fmt(result)}.`}
      </p>

      <MathCheck>
        <p>
          Fluently adding, subtracting, multiplying, and dividing multi-digit
          decimals (6.NS.B.3) extends the whole-number algorithms. The one new
          idea is division: multiply the dividend and divisor by the same power of
          10 to make the <strong>divisor a whole number</strong>, which does not
          change the quotient. Here {fmt(a)} ÷ {fmt(b)} {eqQuot} {fmt(quotient)}.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1, Math.min(999, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(value - 10)} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs font-bold" aria-label={`Decrease ${label} by one tenth`}>−0.1</button>
        <button type="button" onClick={() => set(value - 1)} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-16 text-center font-mono text-lg font-black tabular-nums">{(value / 100).toFixed(2)}</span>
        <button type="button" onClick={() => set(value + 1)} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Increase ${label}`}>+</button>
        <button type="button" onClick={() => set(value + 10)} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs font-bold" aria-label={`Increase ${label} by one tenth`}>+0.1</button>
      </div>
    </div>
  );
}
