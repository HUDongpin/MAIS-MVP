"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const P1 = "var(--band-middle)";
const P2 = "var(--band-high)";
const TOT = "var(--band-upper)";

export default function Lesson() {
  const [a, setA] = useState(34);
  const [b, setB] = useState(27);

  const bOnes = b % 10;
  const bTens = Math.floor(b / 10);
  const pp1 = a * bOnes;
  const pp2 = a * bTens * 10;
  const total = a * b;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>standard algorithm</strong>{" "}stacks the numbers and multiplies
        by one digit at a time. Multiply by the <strong>ones</strong>, then by the{" "}
        <strong>tens</strong>{" "}(shifted one place), and add the two{" "}
        <strong>partial products</strong>.
      </p>

      <Figure caption="Two partial products — ones and tens — added into the final answer.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-3xl leading-relaxed">
            <div className="grid grid-cols-[3ch_5ch] justify-items-end font-black">
              <span /><span>{a}</span>
            </div>
            <div className="grid grid-cols-[3ch_5ch] justify-items-end border-b-2 border-[var(--ink)] pb-1 font-black">
              <span>×</span><span>{b}</span>
            </div>
            <div className="grid grid-cols-[3ch_5ch] justify-items-end pt-1 font-black" style={{ color: P1 }}>
              <span /><span>{pp1}</span>
            </div>
            <div className="grid grid-cols-[3ch_5ch] justify-items-end border-b-2 border-[var(--ink)] pb-1 font-black" style={{ color: P2 }}>
              <span>+</span><span>{pp2}</span>
            </div>
            <div className="grid grid-cols-[3ch_5ch] justify-items-end pt-1 font-black" style={{ color: TOT }}>
              <span /><span>{total}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 text-center font-mono text-[15px] text-[var(--ink-soft)]">
            <div><span style={{ color: P1 }}>{a} × {bOnes} = {pp1}</span> (the ones)</div>
            <div><span style={{ color: P2 }}>{a} × {bTens * 10} = {pp2}</span> (the tens)</div>
            <div><strong style={{ color: TOT }}>{pp1} + {pp2} = {total}</strong></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={a} onChange={setA} />
            <Stepper label="Second" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Two rows, then add</h2>
      <p>
        Multiplying {a} by {b} means {a} × {bOnes} ones plus {a} × {bTens} tens.
        The second partial product ({pp2}) already includes the extra zero because
        the {bTens} is really {bTens * 10}. Adding them gives {total}.
      </p>

      <MathCheck>
        <p>
          Fluently multiplying multi-digit whole numbers with the{" "}
          <strong>standard algorithm</strong>{" "}(5.NBT.B.5) breaks the second factor
          into place-value parts: {a} × {b} = {a} × {bOnes} + {a} × {bTens * 10} = {pp1} + {pp2} = {total}. Each partial product lines up in its correct
          place before you add.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(11, Math.min(99, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 11} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 99} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
