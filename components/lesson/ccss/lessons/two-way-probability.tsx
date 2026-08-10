"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  // rows: owns a bike?, cols: rides to school?
  const g = [[40, 10], [5, 45]]; // [bike][rides]
  const [q, setQ] = useState(0);

  const total = g.flat().reduce((a, b) => a + b, 0);
  const bikeTot = g[0][0] + g[0][1];
  const ridesTot = g[0][0] + g[1][0];

  // `exact` says whether the quotient really lands on two decimals; without it
  // the chained equals asserted "40/45 = 0.89" when 40/45 = 0.888…
  const exact2 = (n: number, d: number) => Math.abs((n / d) * 100 - Math.round((n / d) * 100)) < 1e-9;
  const QUESTIONS = [
    { text: "P(owns bike AND rides)", val: r2(g[0][0] / total), work: `${g[0][0]}/${total}`, exact: exact2(g[0][0], total) },
    { text: "P(owns bike)", val: r2(bikeTot / total), work: `${bikeTot}/${total}`, exact: exact2(bikeTot, total) },
    { text: "P(rides | owns bike)", val: r2(g[0][0] / bikeTot), work: `${g[0][0]}/${bikeTot}`, exact: exact2(g[0][0], bikeTot) },
    { text: "P(owns bike | rides)", val: r2(g[0][0] / ridesTot), work: `${g[0][0]}/${ridesTot}`, exact: exact2(g[0][0], ridesTot) },
  ];
  const rawRideGivenBike = g[0][0] / bikeTot;
  const rawRides = ridesTot / total;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>two-way table</strong>{" "}is a probability machine. Divide a cell by
        the grand total for a <strong>joint</strong>{" "}probability, by a row/column
        total for a <strong>conditional</strong>{" "}one. Independence shows up when
        conditioning doesn&apos;t change the probability.
      </p>

      <Figure caption="Pick a probability question — the table gives every joint, marginal, and conditional value.">
        <div className="flex flex-col items-center gap-6">
          <table className="border-collapse text-center font-mono text-sm">
            <thead><tr className="text-[var(--ink-faint)]"><th className="p-2" /><th className="p-2">rides</th><th className="p-2">walks</th><th className="p-2">total</th></tr></thead>
            <tbody>
              <tr><th className="p-2 text-right">owns bike</th><td className="p-2 text-lg font-black" style={{ color: ACCENT }}>{g[0][0]}</td><td className="p-2 text-lg">{g[0][1]}</td><td className="p-2 font-bold text-[var(--ink-soft)]">{bikeTot}</td></tr>
              <tr><th className="p-2 text-right">no bike</th><td className="p-2 text-lg">{g[1][0]}</td><td className="p-2 text-lg">{g[1][1]}</td><td className="p-2 font-bold text-[var(--ink-soft)]">{g[1][0] + g[1][1]}</td></tr>
              <tr className="text-[var(--ink-soft)]"><th className="p-2 text-right">total</th><td className="p-2 font-bold">{ridesTot}</td><td className="p-2 font-bold">{g[0][1] + g[1][1]}</td><td className="p-2 font-bold">{total}</td></tr>
            </tbody>
          </table>

          <div className="flex flex-wrap justify-center gap-2">
            {QUESTIONS.map((qu, i) => (
              <button key={i} type="button" onClick={() => setQ(i)} aria-pressed={q === i} className="rounded-lg border px-3 py-1.5 text-xs font-bold" style={q === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{qu.text}</button>
            ))}
          </div>

          <div className="rounded-2xl border-2 px-6 py-2 text-center font-mono" style={{ borderColor: ACCENT }}>
            {QUESTIONS[q].text} = {QUESTIONS[q].work} {QUESTIONS[q].exact === false ? "≈" : "="} <strong style={{ color: ACCENT }}>{QUESTIONS[q].val}</strong>
          </div>
        </div>
      </Figure>

      <h2>Denominator tells the story</h2>
      <p>
        A <strong>joint</strong>{" "}probability divides by the grand total ({total}); a{" "}
        <strong>conditional</strong>{" "}one divides by a row or column total, restricting
        the sample space. Compare P(rides | owns bike) {exact2(g[0][0], bikeTot) ? "=" : "≈"} {r2(rawRideGivenBike)} with the
        overall P(rides) {exact2(ridesTot, total) ? "=" : "≈"} {r2(rawRides)}: since they differ, owning a bike and
        riding are <strong>not independent</strong>.
      </p>

      <MathCheck>
        <p>
          A <strong>two-way frequency table</strong>{" "}(S-CP.4) organizes the sample
          space of two variables. Cells give <strong>joint</strong>{" "}probabilities,
          margins give <strong>marginal</strong>{" "}probabilities, and dividing within a
          row or column gives <strong>conditional</strong>{" "}probabilities — the basis
          for checking independence.
        </p>
      </MathCheck>
    </div>
  );
}
