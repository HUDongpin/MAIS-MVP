"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

// Division was promised three times on this page - the guided practice ("Add,
// subtract, multiply, and divide decimals to hundredths"), the teacher guide
// (5.NBT.B.7 attributed to this lesson) and this lesson's own Math Check - and
// rendered nowhere.
type Op = "add" | "sub" | "mul" | "div";
const ACCENT = "var(--band-upper)";

function fmt(n: number) {
  return Number(n.toFixed(4)).toString();
}

export default function Lesson() {
  const [aInt, setAInt] = useState(125); // hundredths -> 1.25
  const [bInt, setBInt] = useState(40); // hundredths -> 0.40
  const [op, setOp] = useState<Op>("add");

  const a = aInt / 100, b = bInt / 100;
  const hi = Math.max(aInt, bInt), lo = Math.min(aInt, bInt);
  const result =
    op === "add" ? (aInt + bInt) / 100
    : op === "sub" ? (hi - lo) / 100
    : op === "mul" ? (aInt * bInt) / 10000
    : aInt / bInt;
  // The quotient rarely lands on four decimals (1.25 / 0.40 = 3.125 does, 1.25 / 0.30
  // does not), so the display has to say which it is.
  const exact4 = (n: number) => Math.abs(n * 10000 - Math.round(n * 10000)) < 1e-9;
  const eq = exact4(result) ? "=" : "≈";

  const tip =
    op === "mul"
      ? "Ignore the dots, multiply the whole numbers, then put back the total number of decimal places."
      : op === "div"
        ? `Make the divisor whole: multiply both by 100 and divide as whole numbers, ${aInt} ÷ ${bInt} ${eq} ${fmt(result)}.`
        : "Line up the decimal points (and the places), then add or subtract as usual.";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Decimals use the same four operations as whole numbers — you just have to{" "}
        <strong>keep track of the decimal point</strong>. For <strong>+</strong>{" "}
        and <strong>−</strong>, line up the points. For <strong>×</strong>, count
        the decimal places. For <strong>÷</strong>, make the divisor whole first.
      </p>

      <Figure caption="Pick an operation. The rule for placing the decimal point appears with the answer.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {([["add", "+"], ["sub", "−"], ["mul", "×"], ["div", "÷"]] as [Op, string][]).map(([o, sym]) => (
              <button key={o} type="button" onClick={() => setOp(o)} className="grid h-10 w-10 place-items-center rounded-lg border text-xl font-black" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{sym}</button>
            ))}
          </div>

          <div className="font-mono text-3xl font-black">
            {op === "sub" ? fmt(hi / 100) : fmt(a)} {op === "add" ? "+" : op === "sub" ? "−" : op === "mul" ? "×" : "÷"} {op === "sub" ? fmt(lo / 100) : fmt(b)} {eq} <span style={{ color: ACCENT }}>{fmt(result)}</span>
          </div>

          <p className="m-0 max-w-md rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {tip}
            {op === "mul" && <> Here {aInt}×{bInt} = {aInt * bInt}, and 2 + 2 decimal places → the point goes 4 places in, giving {fmt(result)}.</>}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={aInt} onChange={setAInt} />
            <Stepper label="Second" value={bInt} onChange={setBInt} />
          </div>
        </div>
      </Figure>

      <h2>The point is the only new rule</h2>
      <p>
        {op === "mul"
          ? `Multiplying like whole numbers, ${aInt} × ${bInt} = ${aInt * bInt}. Since each factor had 2 decimal places, the answer has 4 — then you drop trailing zeros: ${fmt(result)}.`
          : op === "div"
            ? `Scaling both numbers by 100 leaves the quotient unchanged, so ${fmt(a)} ÷ ${fmt(b)} is the whole-number division ${aInt} ÷ ${bInt} ${eq} ${fmt(result)}.`
            : `Once the decimal points are lined up, ${op === "add" ? "adding" : "subtracting"} works exactly like whole numbers, and the point in the answer sits right below the others: ${fmt(result)}.`}
      </p>

      <MathCheck>
        <p>
          Adding, subtracting, multiplying, and dividing decimals to hundredths
          (5.NBT.B.7) uses place-value strategies. For + and −, align the places
          so you combine like units. For ×, multiply as whole numbers and place the
          decimal point by <strong>counting total decimal places</strong>. For ÷,
          scale both numbers by the same power of 10 until the divisor is a whole
          number, which leaves the quotient unchanged — the model always ties back
          to fractions of tenths and hundredths.
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
