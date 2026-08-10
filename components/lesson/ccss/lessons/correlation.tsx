"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import {
  relationForDisplayedValue,
  spokenRelationForDisplayedValue,
} from "@/components/lesson/ccss/numberPresentation";

const ACCENT = "var(--band-high)";
const W = 240, H = 200, PAD = 24;

type Point = [number, number];
const SETS: { name: string; pts: Point[] }[] = [
  { name: "strong +", pts: [[1, 2], [2, 3], [3, 3], [4, 5], [5, 6], [6, 6], [7, 8]] },
  { name: "moderate +", pts: [[1, 3], [2, 2], [3, 5], [4, 3], [5, 6], [6, 4], [7, 7]] },
  { name: "none", pts: [[1, 5], [2, 2], [3, 6], [4, 3], [5, 6], [6, 2], [7, 5]] },
  { name: "strong −", pts: [[1, 8], [2, 6], [3, 6], [4, 4], [5, 3], [6, 3], [7, 1]] },
];

function correlation(points: Point[]) {
  const meanX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  const numerator = points.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0);
  const sumSqX = points.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);
  const sumSqY = points.reduce((sum, [, y]) => sum + (y - meanY) ** 2, 0);
  return numerator / Math.sqrt(sumSqX * sumSqY);
}

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const s = SETS[idx];
  const r = correlation(s.pts);
  const rDisplay = Math.round(r * 100) / 100;
  const rRelation = relationForDisplayedValue(r, rDisplay);
  const rSpokenRelation = spokenRelationForDisplayedValue(r, rDisplay);
  const absR = Math.abs(r);
  const absRDisplay = Math.abs(rDisplay);
  const absRRelation = relationForDisplayedValue(absR, absRDisplay);
  const absRSpokenRelation = spokenRelationForDisplayedValue(absR, absRDisplay);
  const sx = (x: number) => Math.round((PAD + (x / 8) * (W - 2 * PAD)) * 100) / 100;
  const sy = (y: number) => Math.round((H - PAD - (y / 9) * (H - 2 * PAD)) * 100) / 100;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>correlation coefficient r</strong>{" "}measures how tightly points
        cluster around a line, from −1 (perfect downhill) through 0 (no linear
        relationship) to +1 (perfect uphill). But beware: <strong>correlation is not
        causation</strong>.
      </p>

      <Figure caption="r near ±1 means a tight linear pattern; r near 0 means little or none.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {SETS.map((se, i) => (
              <button key={se.name} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{se.name}</button>
            ))}
          </div>

          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" role="img" aria-label={`Scatter plot with ${s.name === "none" ? "no linear correlation" : `${s.name.replace("+", "positive").replace("−", "negative")} correlation`}, r ${rSpokenRelation} ${rDisplay}`}>
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={PAD} y1={H - PAD} x2={PAD} y2={PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            {s.pts.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={5} fill={ACCENT} />)}
          </svg>

          <div className="rounded-2xl border-2 px-8 py-2 text-center" style={{ borderColor: ACCENT }}>
            <div className="text-xs uppercase text-[var(--ink-faint)]">correlation coefficient</div>
            <div className="font-mono text-2xl font-black" style={{ color: ACCENT }} aria-label={`r ${rSpokenRelation} ${rDisplay}`}>r {rRelation} {rDisplay}</div>
          </div>
        </div>
      </Figure>

      <h2>Correlation ≠ causation</h2>
      <p>
        {/* "A high |r|" was hard-coded while r follows the selected data set, so
            picking "none" read "A high |r| (0.02) says the linear pattern is
            weak" — and disagreed with the button's own label. */}
        Here <span aria-label={`the absolute value of r ${absRSpokenRelation} ${absRDisplay}`}>|r| {absRRelation} {absRDisplay}</span>, so the linear pattern is {absR > 0.8 ? "strong" : absR > 0.3 ? "moderate" : "weak"}. Even a strong one does
        <em>not</em>{" "}mean one variable causes the other. Ice-cream sales and
        drowning both rise in summer (a <strong>lurking variable</strong>: heat), yet
        neither causes the other. A well-designed <strong>randomized controlled
        experiment</strong>{" "}can support a causal conclusion under its design
        assumptions; this scatter plot alone cannot.
      </p>

      <MathCheck>
        <p>
          The <strong>correlation coefficient r</strong>{" "}measures the strength and
          direction of a linear relationship (S-ID.8), from −1 to +1. Crucially,{" "}
          <strong>correlation does not imply causation</strong>{" "}(S-ID.9): an
          association may be explained by a lurking variable. Well-designed
          randomized experiments can support causal claims; observational
          association alone cannot.
        </p>
      </MathCheck>
    </div>
  );
}
