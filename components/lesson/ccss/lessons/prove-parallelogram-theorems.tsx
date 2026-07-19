"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const PROPS = [
  { name: "Opposite sides", claim: "Opposite sides are congruent.", show: "sides" },
  { name: "Opposite angles", claim: "Opposite angles are congruent.", show: "angles" },
  { name: "Diagonals bisect", claim: "The diagonals bisect each other.", show: "diagonals" },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const p = PROPS[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>parallelogram</strong>{" "}has both pairs of opposite sides parallel —
        and from that single fact, a cascade of properties follows:{" "}
        <strong>opposite sides and angles are equal</strong>, and the{" "}
        <strong>diagonals bisect each other</strong>. Each is proved with congruent
        triangles.
      </p>

      <Figure caption="Draw a diagonal to split the parallelogram into two congruent triangles — the key to every proof.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {PROPS.map((pr, i) => (
              <button key={pr.name} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{pr.name}</button>
            ))}
          </div>

          <svg width={240} height={160} viewBox="0 0 240 160" role="img" aria-label="parallelogram">
            <polygon points="40,130 120,30 200,30 120,130" fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={2.5} />
            {p.show === "diagonals" && (
              <>
                <line x1={40} y1={130} x2={200} y2={30} stroke="var(--band-upper)" strokeWidth={2} />
                <line x1={120} y1={30} x2={120} y2={130} stroke="var(--band-upper)" strokeWidth={2} />
                <circle cx={120} cy={80} r={4} fill="var(--band-upper)" />
                <text x={126} y={78} fontSize={11} fill="var(--band-upper)">midpoint</text>
              </>
            )}
            {p.show === "sides" && (
              <>
                <line x1={40} y1={130} x2={120} y2={30} stroke="var(--band-upper)" strokeWidth={3} />
                <line x1={200} y1={30} x2={120} y2={130} stroke="var(--band-upper)" strokeWidth={3} />
              </>
            )}
            {p.show === "angles" && (
              <>
                <circle cx={44} cy={126} r={3} fill="var(--band-upper)" />
                <circle cx={196} cy={34} r={3} fill="var(--band-upper)" />
              </>
            )}
          </svg>

          <div className="rounded-2xl border-2 px-6 py-3 text-center font-bold" style={{ borderColor: ACCENT, color: ACCENT }}>{p.claim}</div>
        </div>
      </Figure>

      <h2>One diagonal does the work</h2>
      <p>
        Drawing a diagonal creates two triangles. The parallel sides give equal
        alternate angles, and the shared diagonal is a common side — so the triangles
        are congruent by ASA. Then <strong>CPCTC</strong>{" "}delivers equal opposite
        sides and angles. A second diagonal, by the same argument, shows the
        diagonals cross at their shared midpoint.
      </p>

      <MathCheck>
        <p>
          Theorems about parallelograms (G-CO.11): <strong>opposite sides</strong>{" "}
          and <strong>opposite angles</strong>{" "}are congruent, the{" "}
          <strong>diagonals bisect each other</strong>, and conversely a
          quadrilateral with these properties is a parallelogram. The proofs split
          the figure into congruent triangles via a diagonal.
        </p>
      </MathCheck>
    </div>
  );
}
