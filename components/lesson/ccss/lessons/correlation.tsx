"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const W = 240, H = 200, PAD = 24;

const SETS = [
  { name: "strong +", r: 0.95, pts: [[1, 2], [2, 3], [3, 3], [4, 5], [5, 6], [6, 6], [7, 8]] },
  { name: "weak +", r: 0.45, pts: [[1, 3], [2, 2], [3, 5], [4, 3], [5, 6], [6, 4], [7, 7]] },
  { name: "none", r: 0.02, pts: [[1, 5], [2, 2], [3, 6], [4, 3], [5, 6], [6, 2], [7, 5]] },
  { name: "strong −", r: -0.93, pts: [[1, 8], [2, 6], [3, 6], [4, 4], [5, 3], [6, 3], [7, 1]] },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const s = SETS[idx];
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
              <button key={se.name} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{se.name}</button>
            ))}
          </div>

          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" role="img" aria-label={`Scatter plot with ${s.name === "none" ? "no correlation" : `${s.name.replace("+", "positive").replace("−", "negative")} correlation`}, r = ${s.r}`}>
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={PAD} y1={H - PAD} x2={PAD} y2={PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            {s.pts.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={5} fill={ACCENT} />)}
          </svg>

          <div className="rounded-2xl border-2 px-8 py-2 text-center" style={{ borderColor: ACCENT }}>
            <div className="text-xs uppercase text-[var(--ink-faint)]">correlation coefficient</div>
            <div className="font-mono text-2xl font-black" style={{ color: ACCENT }}>r ≈ {s.r}</div>
          </div>
        </div>
      </Figure>

      <h2>Correlation ≠ causation</h2>
      <p>
        {/* "A high |r|" was hard-coded while r follows the selected data set, so
            picking "none" read "A high |r| (0.02) says the linear pattern is
            weak" — and disagreed with the button's own label. */}
        Here |r| = {Math.abs(s.r)}, so the linear pattern is {Math.abs(s.r) > 0.8 ? "strong" : Math.abs(s.r) > 0.3 ? "moderate" : "weak"}. Even a strong one does
        <em>not</em>{" "}mean one variable causes the other. Ice-cream sales and
        drowning both rise in summer (a <strong>lurking variable</strong>: heat), yet
        neither causes the other. Only a <strong>randomized experiment</strong>{" "}can
        establish causation.
      </p>

      <MathCheck>
        <p>
          The <strong>correlation coefficient r</strong>{" "}measures the strength and
          direction of a linear relationship (S-ID.8), from −1 to +1. Crucially,{" "}
          <strong>correlation does not imply causation</strong>{" "}(S-ID.9): an
          association may be explained by a lurking variable, and only controlled
          experiments can support causal claims.
        </p>
      </MathCheck>
    </div>
  );
}
