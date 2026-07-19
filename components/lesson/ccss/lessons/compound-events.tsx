"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const HL = "var(--band-upper)";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function Lesson() {
  const [target, setTarget] = useState(7);

  let favorable = 0;
  for (let d1 = 1; d1 <= 6; d1++) for (let d2 = 1; d2 <= 6; d2++) if (d1 + d2 === target) favorable++;
  const g = gcd(favorable, 36) || 1;
  const fracStr = favorable === 0 ? "0" : `${favorable / g}/${36 / g}`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>compound event</strong>{" "}combines two or more simple events —
        like rolling <strong>two dice</strong>. To find its probability, list every
        possible outcome (the <strong>sample space</strong>) and count the ones you
        want.
      </p>

      <Figure caption="All 36 equally likely outcomes. The highlighted ones give the target sum.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 text-center text-lg font-semibold">P(the two dice sum to {target})</p>

          <div className="w-full overflow-x-auto">
            <table className="mx-auto border-collapse font-mono text-xs sm:text-sm">
              <tbody>
                <tr>
                  <th className="p-1 text-[var(--ink-faint)]">+</th>
                  {[1, 2, 3, 4, 5, 6].map((d) => <th key={d} className="w-8 p-1 text-center text-[var(--ink-faint)]">{d}</th>)}
                </tr>
                {[1, 2, 3, 4, 5, 6].map((d1) => (
                  <tr key={d1}>
                    <th className="p-1 text-center text-[var(--ink-faint)]">{d1}</th>
                    {[1, 2, 3, 4, 5, 6].map((d2) => {
                      const sum = d1 + d2;
                      const on = sum === target;
                      return (
                        <td key={d2} className="p-0">
                          <div className="grid h-8 w-8 place-items-center rounded font-bold" style={{ background: on ? HL : "var(--surface-2)", color: on ? "white" : "var(--ink-faint)" }}>{sum}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: HL }}>
            <div className="font-mono text-2xl font-black" style={{ color: HL }}>{favorable}/36 = {fracStr} ≈ {(favorable / 36).toFixed(2)}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{favorable} favorable outcome{favorable === 1 ? "" : "s"} out of 36</div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">target sum: {target}</span>
            <input type="range" min={2} max={12} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-56 accent-[var(--band-upper)]" aria-label="target sum" />
          </div>
        </div>
      </Figure>

      <h2>Count the sample space</h2>
      <p>
        With two dice there are 6 × 6 = 36 equally likely outcomes. A sum of {target}{" "}
        happens {favorable} of those ways, so the probability is {favorable}/36 = {fracStr}. Sums like 7 are most likely because more pairs make them.
      </p>

      <MathCheck>
        <p>
          The probability of a <strong>compound event</strong>{" "}is found by listing
          the <strong>sample space</strong>{" "}— with an organized list, table, or tree
          diagram — and dividing the favorable outcomes by the total (7.SP.C.8).
          Two dice have 36 equally likely outcomes, so P(sum = {target}) = {favorable}/36 = {fracStr}.
        </p>
      </MathCheck>
    </div>
  );
}
