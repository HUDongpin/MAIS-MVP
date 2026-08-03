"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";

export default function Lesson() {
  // rows: has a pet? (yes/no); cols: likes animals movies? (yes/no)
  const [g, setG] = useState([[18, 6], [7, 9]]); // [pet][movie]

  const rowTot = g.map((r) => r[0] + r[1]);
  const pctPetYes = Math.round((g[0][0] / rowTot[0]) * 100);
  const pctPetNo = Math.round((g[1][0] / rowTot[1]) * 100);
  const association = Math.abs(pctPetYes - pctPetNo) >= 15;

  const set = (i: number, j: number, d: number) => setG((prev) => prev.map((r, ri) => r.map((v, ci) => (ri === i && ci === j ? Math.max(0, v + d) : v))));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>two-way table</strong>{" "}counts items by <strong>two</strong>{" "}
        categories at once. Turning counts into <strong>relative frequencies</strong>{" "}
        (percentages within a row) reveals whether the two categories are{" "}
        <strong>associated</strong>.
      </p>

      <Figure caption="Do pet owners like animal movies more? Compare the row percentages.">
        <div className="flex flex-col items-center gap-6">
          <table className="border-collapse text-center font-mono text-sm">
            <thead>
              <tr>
                <th className="p-2" />
                <th className="p-2" style={{ color: ACCENT }}>likes movies</th>
                <th className="p-2 text-[var(--ink-soft)]">doesn&apos;t</th>
                <th className="p-2 text-[var(--ink-faint)]">total</th>
                <th className="p-2 text-[var(--ink-faint)]">% likes</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1].map((i) => (
                <tr key={i}>
                  <th className="p-2 text-right">{i === 0 ? "has a pet" : "no pet"}</th>
                  {[0, 1].map((j) => (
                    <td key={j} className="p-1">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => set(i, j, -1)} className="h-6 w-6 rounded border border-[var(--line)] text-xs font-bold" aria-label="decrease">−</button>
                        <span className="w-6 text-lg font-black tabular-nums">{g[i][j]}</span>
                        <button type="button" onClick={() => set(i, j, 1)} className="h-6 w-6 rounded border border-[var(--line)] text-xs font-bold" aria-label="increase">+</button>
                      </div>
                    </td>
                  ))}
                  <td className="p-2 font-bold text-[var(--ink-soft)]">{rowTot[i]}</td>
                  <td className="p-2 font-black" style={{ color: ACCENT }}>{i === 0 ? pctPetYes : pctPetNo}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="rounded-xl px-5 py-2 text-center text-[15px] font-bold" style={{ color: association ? ACCENT : "var(--ink-soft)" }}>
            {association
              // Direction follows the data. It was hard-coded as "much more"
              // while the trigger is the absolute gap, so lowering the pet-owner
              // cell announced "Pet owners like animal movies (25%) much more
              // than non-owners (44%)" — the reverse of what the table showed.
              ? `Association! Pet owners like animal movies (${pctPetYes}%) much ${pctPetYes > pctPetNo ? "more" : "less"} than non-owners (${pctPetNo}%).`
              : `Little association — the two groups like movies at similar rates (${pctPetYes}% vs ${pctPetNo}%).`}
          </div>
        </div>
      </Figure>

      <h2>Compare the percentages</h2>
      <p>
        Raw counts can mislead when group sizes differ, so convert to relative
        frequencies within each row: {pctPetYes}% of pet owners like animal movies
        versus {pctPetNo}% of non-owners. A big gap signals the two categories are
        related.
      </p>

      <MathCheck>
        <p>
          A <strong>two-way frequency table</strong>{" "}summarizes bivariate
          categorical data (8.SP.A.4). Computing <strong>relative frequencies</strong>{" "}
          — counts as a fraction of a row or column total — lets you compare groups
          fairly. Differing conditional percentages indicate a possible{" "}
          <strong>association</strong>{" "}between the two variables.
        </p>
      </MathCheck>
    </div>
  );
}
