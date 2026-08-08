"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const N = 10;
const CELL = 26;
const PAD = 26;
const SIZE = N * CELL + 2 * PAD;
const DOT = "var(--band-upper)";

type Assoc = { key: string; name: string; desc: string; points: [number, number][] };
const ASSOCS: Assoc[] = [
  { key: "pos", name: "Positive", desc: "As x increases, y tends to increase. The cloud slopes upward.", points: [[1, 2], [2, 3], [3, 3], [4, 5], [5, 5], [6, 7], [7, 7], [8, 9]] },
  { key: "neg", name: "Negative", desc: "As x increases, y tends to decrease. The cloud slopes downward.", points: [[1, 9], [2, 8], [3, 6], [4, 6], [5, 4], [6, 4], [7, 2], [8, 1]] },
  { key: "none", name: "No association", desc: "No clear trend — the points scatter with no pattern.", points: [[1, 5], [2, 2], [3, 8], [4, 4], [5, 7], [6, 3], [7, 6], [8, 5]] },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const a = ASSOCS[idx];

  const sx = (x: number) => PAD + x * CELL;
  const sy = (y: number) => SIZE - PAD - y * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>scatter plot</strong>{" "}shows two measurements for each item as a
        point. The pattern of the cloud reveals an <strong>association</strong>:
        positive (up together), negative (opposite), or none — and whether it looks
        linear or curved.
      </p>

      <Figure caption="Look at the overall trend of the cloud — not any single point.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {ASSOCS.map((as, i) => (
              <button key={as.key} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: DOT, color: "white", borderColor: DOT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{as.name}</button>
            ))}
          </div>

          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 320 }} role="img" aria-label={`Scatter plot showing ${a.key === "none" ? "no association" : `${a.name.toLowerCase()} association`}`}>
            {Array.from({ length: N + 1 }, (_, i) => (
              <g key={i} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} />
                <line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} />
              </g>
            ))}
            <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={2} />
            {a.points.map(([x, y], i) => (
              <circle key={i} cx={sx(x)} cy={sy(y)} r={5} fill={DOT} />
            ))}
          </svg>

          <div className="text-center">
            {/* ASSOCS[2].name is already "No association", so appending the noun
                rendered "No association association". */}
            <div className="text-lg font-black" style={{ color: DOT }}>{a.name.toLowerCase().includes("association") ? a.name : `${a.name} association`}</div>
            <p className="mt-1 max-w-md text-[15px] text-[var(--ink-soft)]">{a.desc}</p>
          </div>
        </div>
      </Figure>

      <h2>Read the whole cloud</h2>
      <p>
        Association is about the overall trend, not one point. A{" "}
        <strong>positive</strong>{" "}cloud rises left-to-right; a <strong>negative</strong>{" "}
        one falls; a shapeless scatter shows <strong>no association</strong>. Points
        far from the pattern are <strong>outliers</strong>.
      </p>

      <MathCheck>
        <p>
          A <strong>scatter plot</strong>{" "}displays bivariate (two-variable)
          measurement data (8.SP.A.1). Interpreting it means describing the pattern:
          the direction of <strong>association</strong>{" "}(positive, negative, none),
          its form (linear or nonlinear), the strength of the clustering, and any{" "}
          <strong>outliers</strong>.
        </p>
      </MathCheck>
    </div>
  );
}
