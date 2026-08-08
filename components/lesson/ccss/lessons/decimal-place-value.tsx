"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const COLORS = ["var(--band-high)", "var(--band-middle)", "var(--band-upper)", "var(--band-early)"];
const NAMES = ["tens", "ones", "tenths", "hundredths"];
const PLACE = [10, 1, 0.1, 0.01];
const digit = 4;

export default function Lesson() {
  const [sel, setSel] = useState(1);

  const valAt = (i: number) => +(digit * PLACE[i]).toFixed(2);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Place value keeps going <strong>past the decimal point</strong>. Moving
        one place <strong>left</strong>{" "}makes a digit ten times bigger; moving one
        place <strong>right</strong>{" "}makes it <strong>one tenth</strong>{" "}as big.
      </p>

      <Figure caption="The same 4, worth ten times more each step left — and a tenth as much each step right.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-end gap-1.5">
            {PLACE.map((_, i) => (
              <div key={i} className="flex items-end">
                {i === 2 && <span className="pb-6 text-3xl font-black">.</span>}
                <div className="flex flex-col items-center gap-1">
                  {/* Four tiles, one announced name. */}
                  <button type="button" onClick={() => setSel(i)} aria-label={`${digit} in the ${NAMES[i]} place, worth ${valAt(i)}`} aria-pressed={i === sel} className="grid h-14 w-14 place-items-center rounded-xl text-3xl font-black text-white" style={{ background: COLORS[i], outline: i === sel ? "3px solid var(--ink)" : "none", outlineOffset: 3 }}>{digit}</button>
                  <span className="text-[9px] font-semibold uppercase text-[var(--ink-faint)]">{NAMES[i]}</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: COLORS[i] }}>{valAt(i)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="text-2xl font-black">
              The 4 in the <span style={{ color: COLORS[sel] }}>{NAMES[sel]}</span> place is worth <span style={{ color: COLORS[sel] }}>{valAt(sel)}</span>.
            </div>
            <p className="mt-1 font-mono text-[15px] text-[var(--ink-soft)]">
              {sel > 0 && <>{valAt(sel)} = {valAt(sel - 1)} ÷ 10 </>}
              {sel < 3 && <>· {valAt(sel)} = {valAt(sel + 1)} × 10</>}
            </p>
          </div>
        </div>
      </Figure>

      <h2>Both directions from the dot</h2>
      <p>
        To the left of the dot: ones, tens, hundreds — each ten times the last. To
        the right: tenths, hundredths, thousandths — each one tenth of the last.
        The decimal point marks where the ones place ends.
      </p>

      <MathCheck>
        <p>
          In a multi-digit number, a digit is worth <strong>10 times</strong>{" "}the
          same digit one place to its right, and <strong>1/10</strong>{" "}as much one
          place to its left (5.NBT.A.1). This pattern extends place value past the
          decimal point: 4 tenths (0.4) is ten times 4 hundredths (0.04), and one
          tenth of 4 ones (4).
        </p>
      </MathCheck>
    </div>
  );
}
