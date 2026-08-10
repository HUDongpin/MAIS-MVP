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
  const digitDirection = e > 0 ? "left" : "right";
  const zeros = Math.abs(e);
  // The magnitude of the power that is being multiplied or divided BY, always
  // written with the same unsigned exponent the copy prints. Pairing the
  // unsigned exponent with a signed value rendered "10² = 0.01" on the ÷10²
  // button; and a negative exponent is 8.EE.A.1, not this Grade 5 standard.
  const magnitudeStr = `1${"0".repeat(zeros)}`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Multiplying or dividing by a <strong>power of 10</strong>{" "}shifts every
        digit to a new place value. Multiplying by 10, 100, or 1000 shifts the
        digits left; dividing shifts them right. The decimal point stays fixed as
        the separator between ones and tenths. The <strong>exponent</strong>{" "}
        counts the place-value shifts.
      </p>

      <Figure caption="Pick a power of ten. Every digit shifts that many places on the place-value chart.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {/* The exponent is an inline <sup>, so the accessible name
                concatenated to "×102" — "times one hundred and two". */}
            {EXPS.map((ex) => (
              <button key={ex} type="button" onClick={() => setE(ex)} aria-label={`${ex > 0 ? "Multiply" : "Divide"} by 10 to the power of ${Math.abs(ex)}`} aria-pressed={e === ex} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={e === ex ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                {ex > 0 ? "×" : "÷"}10{Math.abs(ex) > 1 ? <sup>{Math.abs(ex)}</sup> : ""}
              </button>
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-3xl font-black">
              {fmt(base)} {e > 0 ? "×" : "÷"} <PowerOfTen exponent={Math.abs(e)} /> = <span style={{ color: ACCENT }}>{fmt(result)}</span>
            </div>
            <div className="mt-2 font-mono text-[15px] text-[var(--ink-soft)]">
              <PowerOfTen exponent={zeros} /> = {magnitudeStr} — each digit shifts <strong>{zeros}</strong>{" "}place{zeros === 1 ? "" : "s"} to the <strong>{digitDirection}</strong>
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
        <PowerOfTen exponent={zeros} /> means {zeros} factor{zeros === 1 ? "" : "s"} of 10, which is {magnitudeStr}. That is why {e > 0 ? "multiplying" : "dividing"} by
        it shifts every digit exactly {zeros} place{zeros === 1 ? "" : "s"} to the {digitDirection}.
      </p>

      <MathCheck>
        <p>
          Multiplying or dividing by a power of 10 shifts every digit to a new
          place value (5.NBT.A.2). The <strong>exponent</strong>{" "}tells you how many
          place-value shifts occur: {fmt(base)} {e > 0 ? "×" : "÷"}{" "}
          <PowerOfTen exponent={zeros} /> = {fmt(result)}, because <PowerOfTen exponent={zeros} /> = {magnitudeStr}.
        </p>
      </MathCheck>
    </div>
  );
}

function PowerOfTen({ exponent }: { exponent: number }) {
  return (
    <span>
      <span className="sr-only">10 to the power of {exponent}</span>
      <span aria-hidden="true">10<sup>{exponent}</sup></span>
    </span>
  );
}
