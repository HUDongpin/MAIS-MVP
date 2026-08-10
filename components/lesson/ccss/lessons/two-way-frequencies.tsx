"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

export default function Lesson() {
  // rows: grade level (9th/10th); cols: prefers online / in-person
  const g = [[30, 20], [15, 35]]; // [row][col]
  const [view, setView] = useState<"count" | "joint" | "row">("count");

  const total = g.flat().reduce((s, x) => s + x, 0);
  const rowTot = g.map((r) => r[0] + r[1]);
  const colTot = [g[0][0] + g[1][0], g[0][1] + g[1][1]];

  const cell = (i: number, j: number) => {
    if (view === "count") return `${g[i][j]}`;
    if (view === "joint") return `${Math.round((g[i][j] / total) * 100)}%`;
    return `${Math.round((g[i][j] / rowTot[i]) * 100)}%`;
  };
  const rowTotalDisplay = (i: number) => view === "count" ? `${rowTot[i]}` : view === "joint" ? `${Math.round((rowTot[i] / total) * 100)}%` : "100%";
  const colTotalDisplay = (j: number) => view === "count" ? `${colTot[j]}` : view === "joint" ? `${Math.round((colTot[j] / total) * 100)}%` : "—";
  const grandTotalDisplay = view === "count" ? `${total}` : view === "joint" ? "100%" : "—";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>two-way frequency table</strong>{" "}cross-classifies data by two
        categories. From the counts you compute <strong>joint</strong>{" "}(of the
        whole), <strong>marginal</strong>{" "}(the totals), and <strong>conditional</strong>{" "}
        (within a row) relative frequencies — each answering a different question.
      </p>

      <Figure caption="Toggle between raw counts, joint percentages, and row (conditional) percentages.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {(["count", "joint", "row"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={view === v ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{v === "count" ? "counts" : v === "joint" ? "joint %" : "row %"}</button>
            ))}
          </div>

          <table className="border-collapse text-center font-mono text-sm">
            <thead>
              <tr className="text-[var(--ink-faint)]">
                <th className="p-2" /><th className="p-2">online</th><th className="p-2">in-person</th><th className="p-2">total</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1].map((i) => (
                <tr key={i}>
                  <th className="p-2 text-right">{i === 0 ? "9th grade" : "10th grade"}</th>
                  <td className="p-2 text-lg font-black" style={{ color: ACCENT }}>{cell(i, 0)}</td>
                  <td className="p-2 text-lg font-black" style={{ color: ACCENT }}>{cell(i, 1)}</td>
                  <td className="p-2 font-bold text-[var(--ink-soft)]">{rowTotalDisplay(i)}</td>
                </tr>
              ))}
              <tr className="text-[var(--ink-soft)]">
                <th className="p-2 text-right">total</th><td className="p-2 font-bold">{colTotalDisplay(0)}</td><td className="p-2 font-bold">{colTotalDisplay(1)}</td><td className="p-2 font-bold">{grandTotalDisplay}</td>
              </tr>
            </tbody>
          </table>

          <p className="m-0 max-w-md text-center text-sm text-[var(--ink-soft)]">
            {view === "count" && "Raw counts of students in each category combination."}
            {view === "joint" && "Joint %: each cell as a fraction of all " + total + " students."}
            {view === "row" && "Row % (conditional): within each grade — do preferences differ by grade?"}
          </p>
        </div>
      </Figure>

      <h2>Joint, marginal, conditional</h2>
      <p>
        <strong>Joint</strong>{" "}frequencies divide by the grand total ({total});{" "}
        <strong>marginal</strong>{" "}frequencies are the row/column totals;{" "}
        <strong>conditional</strong>{" "}(row) frequencies divide within a row to compare
        groups fairly. Here 9th graders favor online (60% of their row) while 10th
        graders favor in-person — a possible <strong>association</strong>.
      </p>

      <MathCheck>
        <p>
          A <strong>two-way frequency table</strong>{" "}summarizes categorical data on
          two variables (S-ID.5). Computing <strong>joint, marginal, and
          conditional relative frequencies</strong>{" "}reveals patterns; differing
          conditional distributions across rows signal a possible association between
          the variables.
        </p>
      </MathCheck>
    </div>
  );
}
