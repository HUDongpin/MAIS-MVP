"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const MARK = "var(--band-upper)";
const POINTS = [
  { e: 1, label: "1/8" },
  { e: 2, label: "1/4" },
  { e: 3, label: "3/8" },
  { e: 4, label: "1/2" },
];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
function simplify(numer: number, denom: number): string {
  if (numer === 0) return "0";
  const g = gcd(numer, denom);
  const nn = numer / g, dd = denom / g;
  return dd === 1 ? `${nn}` : `${nn}/${dd}`;
}

export function cupUnit(totalEighths: number) {
  return totalEighths === 8 ? "cup" : "cups";
}

export function beakerUnit(count: number) {
  return count === 1 ? "beaker" : "beakers";
}

export default function Lesson() {
  const [counts, setCounts] = useState([2, 1, 2, 1]);
  const n = counts.reduce((s, c) => s + c, 0);
  const totalEighths = counts.reduce((s, c, i) => s + c * POINTS[i].e, 0);
  // equal share = totalEighths / (8 * n) of a cup -> in eighths: totalEighths / n
  const shareDecimal = n > 0 ? totalEighths / 8 / n : 0;
  const roundedShare = +shareDecimal.toFixed(3);
  const exactToThousandth = Math.abs(shareDecimal - roundedShare) < 1e-9;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Once measurements are on a line plot, you can <strong>compute with the
        data</strong>. A classic question: if you poured all the liquid together
        and shared it <strong>equally</strong>, how much would be in each beaker?
      </p>

      <Figure caption="Each X is one beaker's amount, in cups. Add them all, then share equally.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-end justify-center gap-8" style={{ minHeight: 110 }}>
            {POINTS.map((p, i) => (
              <div key={p.label} className="flex flex-col items-center gap-1">
                <div className="flex flex-col-reverse gap-0.5" style={{ minHeight: 80 }}>
                  {Array.from({ length: counts[i] }, (_, k) => <span key={k} className="text-lg font-black leading-none" style={{ color: MARK }}>✕</span>)}
                </div>
                <div className="h-0.5 w-8 bg-[var(--ink-soft)]" />
                <span className="font-mono text-sm font-bold">{p.label}</span>
              </div>
            ))}
          </div>
          <div className="-mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">cups of liquid</div>

          <output className="rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center" aria-label="Line-plot redistribution result" aria-live="polite" aria-atomic="true">
            <div className="font-mono text-[15px]">Total = <strong style={{ color: MARK }}>{simplify(totalEighths, 8)}</strong>{" "}{cupUnit(totalEighths)}, in {n} {beakerUnit(n)}</div>
            <div className="mt-1 font-mono text-lg font-black">
              {simplify(totalEighths, 8)} ÷ {n} = <span style={{ color: MARK }}>{simplify(totalEighths, 8 * n)}</span> cup each
              <span className="text-[var(--ink-soft)]"> ({exactToThousandth ? "=" : "≈"} {roundedShare.toFixed(3)})</span>
            </div>
          </output>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {POINTS.map((p, i) => (
              <div key={p.label} className="flex flex-col items-center gap-1">
                <span className="font-mono text-xs font-bold text-[var(--ink-faint)]">{p.label}</span>
                <div className="flex items-center gap-1.5">
                  {/* Keep at least one beaker: the all-zero state rendered
                      "0 ÷ 0 = 0 cup each" and "in 0 beakers". */}
                  <button type="button" onClick={() => setCounts((c) => c.map((v, j) => (j === i ? Math.max(0, v - 1) : v)))} disabled={counts[i] <= 0 || n <= 1} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Remove one beaker containing ${p.label} cup`}>−</button>
                  <span className="w-5 text-center font-black tabular-nums">{counts[i]}</span>
                  <button type="button" onClick={() => setCounts((c) => c.map((v, j) => (j === i ? Math.min(4, v + 1) : v)))} disabled={counts[i] >= 4} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Add one beaker containing ${p.label} cup`}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Add, then share</h2>
      <p>
        Adding fractions of a cup gives a total of {simplify(totalEighths, 8)}{" "}
        {cupUnit(totalEighths)}. Dividing that equally among {n} {beakerUnit(n)} — a fraction ÷ whole
        number — puts {simplify(totalEighths, 8 * n)} cup in each.
      </p>

      <MathCheck>
        <p>
          Making a line plot of fractional measurements and using{" "}
          <strong>operations on fractions</strong>{" "}to solve problems is 5.MD.B.2.
          Here you add unlike fractions to a total ({simplify(totalEighths, 8)}{" "}
          {cupUnit(totalEighths)}) and then divide by a whole number to redistribute equally
          ({simplify(totalEighths, 8 * n)} cup each) — combining fraction addition
          and division.
        </p>
      </MathCheck>
    </div>
  );
}
