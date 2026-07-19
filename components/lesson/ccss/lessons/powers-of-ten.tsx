"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
const EXPS = [-2, -1, 1, 2, 3];

function fmt(n: number) {
  return Number(n.toFixed(4)).toString();
}

export default function Lesson() {
  const [base] = useState(4.5);
  const [e, setE] = useState(2);

  const power = Math.pow(10, e);
  const result = base * power;
  const dir = e > 0 ? "right" : "left";
  const zeros = Math.abs(e);
  const powerStr = e > 0 ? `1${"0".repeat(e)}` : `0.${"0".repeat(-e - 1)}1`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Multiplying or dividing by a <strong>power of 10</strong>{" "}just{" "}
        <strong>slides the decimal point</strong>. Multiply by 10, 100, 1000 → the
        digits shift left (number grows). Divide → they shift right (number
        shrinks). The <strong>exponent</strong>{" "}counts the places.
      </p>

      <Figure caption="Pick a power of ten. The decimal point jumps that many places.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {EXPS.map((ex) => (
              <button key={ex} type="button" onClick={() => setE(ex)} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={e === ex ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                {ex > 0 ? "×" : "÷"}10{Math.abs(ex) > 1 ? <sup>{Math.abs(ex)}</sup> : ""}
              </button>
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-3xl font-black">
              {fmt(base)} {e > 0 ? "×" : "÷"} 10<sup>{Math.abs(e)}</sup> = <span style={{ color: ACCENT }}>{fmt(result)}</span>
            </div>
            <div className="mt-2 font-mono text-[15px] text-[var(--ink-soft)]">
              10<sup>{Math.abs(e)}</sup> = {powerStr} · the decimal moves <strong>{zeros}</strong>{" "}place{zeros === 1 ? "" : "s"} to the <strong>{dir}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] px-6 py-3 font-mono text-2xl font-black">
            <span>{fmt(base)}</span>
            <span className="text-[var(--ink-faint)]">→</span>
            <span style={{ color: ACCENT }}>{fmt(result)}</span>
          </div>
        </div>
      </Figure>

      <h2>Exponents count the zeros</h2>
      <p>
        10<sup>{Math.abs(e)}</sup> means {Math.abs(e)} factor{Math.abs(e) === 1 ? "" : "s"} of 10, which is {powerStr}. That is why {e > 0 ? "multiplying" : "dividing"} by
        it moves the decimal point exactly {zeros} place{zeros === 1 ? "" : "s"}.
      </p>

      <MathCheck>
        <p>
          Multiplying or dividing by a power of 10 shifts every digit to a new
          place value (5.NBT.A.2). The <strong>exponent</strong>{" "}tells you how many
          places the decimal point moves: {fmt(base)} {e > 0 ? "×" : "÷"} 10<sup>{Math.abs(e)}</sup> = {fmt(result)}, because 10<sup>{Math.abs(e)}</sup> = {powerStr}.
        </p>
      </MathCheck>
    </div>
  );
}
