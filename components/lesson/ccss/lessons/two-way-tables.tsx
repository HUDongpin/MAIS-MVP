"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
const MAX_CELL_COUNT = 99;

export default function Lesson() {
  // rows: has a pet? (yes/no); cols: likes animals movies? (yes/no)
  const [g, setG] = useState([[18, 6], [7, 9]]); // [pet][movie]

  const rowTot = g.map((r) => r[0] + r[1]);
  // Every cell steps down to 0, so a row total of 0 is reachable and 0/0
  // rendered "NaN%" in the table, the verdict panel and the paragraph.
  // A row with nobody in it has no rate to report.
  const pctPetYes = rowTot[0] > 0 ? (g[0][0] / rowTot[0]) * 100 : null;
  const pctPetNo = rowTot[1] > 0 ? (g[1][0] / rowTot[1]) * 100 : null;
  const comparable = pctPetYes !== null && pctPetNo !== null;
  // Apply the illustrative decision rule to the unrounded rates. Comparing the
  // displayed whole percentages can move a true gap across the 15-point cutoff.
  const association = comparable && Math.abs(pctPetYes - pctPetNo) >= 15;
  const pct = (v: number | null) => {
    if (v === null) return "—";
    const rounded = Math.round(v);
    return `${Math.abs(v - rounded) < 1e-9 ? "" : "≈ "}${rounded}%`;
  };

  const set = (i: number, j: number, d: number) => setG((prev) => prev.map((r, ri) => r.map((v, ci) => (
    ri === i && ci === j ? Math.max(0, Math.min(MAX_CELL_COUNT, v + d)) : v
  ))));

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
                <th className="p-2 text-[var(--ink-faint)]">% likes (nearest whole)</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1].map((i) => (
                <tr key={i}>
                  <th className="p-2 text-right">{i === 0 ? "has a pet" : "no pet"}</th>
                  {[0, 1].map((j) => (
                    <td key={j} className="p-1">
                      <div className="flex items-center justify-center gap-1">
                        {/* Eight buttons shared two names ("decrease"/"increase")
                            with nothing tying one to its cell. */}
                        <button type="button" onClick={() => set(i, j, -1)} disabled={g[i][j] <= 0} className="h-6 w-6 rounded border border-[var(--line)] text-xs font-bold disabled:opacity-40" aria-label={`Decrease ${i === 0 ? "has a pet" : "no pet"}, ${j === 0 ? "likes animal movies" : "does not"}`}>−</button>
                        <span className="w-6 text-lg font-black tabular-nums">{g[i][j]}</span>
                        <button type="button" onClick={() => set(i, j, 1)} disabled={g[i][j] >= MAX_CELL_COUNT} className="h-6 w-6 rounded border border-[var(--line)] text-xs font-bold disabled:opacity-40" aria-label={`Increase ${i === 0 ? "has a pet" : "no pet"}, ${j === 0 ? "likes animal movies" : "does not"}`}>+</button>
                      </div>
                    </td>
                  ))}
                  <td className="p-2 font-bold text-[var(--ink-soft)]">{rowTot[i]}</td>
                  <td className="p-2 font-black" style={{ color: ACCENT }}>{pct(i === 0 ? pctPetYes : pctPetNo)}</td>
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
              ? `Notable sample association by this display's 15-point rule, computed from the unrounded rates: pet owners like animal movies (${pct(pctPetYes)}) much ${(pctPetYes ?? 0) > (pctPetNo ?? 0) ? "more" : "less"} than non-owners (${pct(pctPetNo)}).`
              : comparable
                ? `By this display's rule, the unrounded gap is below 15 percentage points (${pct(pctPetYes)} vs ${pct(pctPetNo)}).`
                : "One row has nobody in it, so there is no rate to compare yet — add someone to both rows."}
          </div>
          <p className="m-0 text-center text-xs text-[var(--ink-faint)]">
            ≈ marks a rate rounded to the nearest whole percent; the rule uses the unrounded rates.
          </p>
        </div>
      </Figure>

      <h2>Compare the percentages</h2>
      {comparable ? (
        <p>
          Raw counts can mislead when group sizes differ, so convert to relative
          frequencies within each row: {pct(pctPetYes)} of pet owners like animal
          movies versus {pct(pctPetNo)} of non-owners. A gap describes an
          association in this sample; it does not by itself establish causation or
          statistical significance.
        </p>
      ) : (
        <p>
          One row total is zero, so its conditional percentage is undefined and
          the two groups cannot yet be compared. Add at least one observation to
          each row before describing an association.
        </p>
      )}

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
