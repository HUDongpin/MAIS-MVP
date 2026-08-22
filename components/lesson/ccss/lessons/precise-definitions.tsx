"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { buildMathAngleContract, serializeMathAngleContract } from "@/lib/mathDiagramGeometry";

const ACCENT = "var(--band-high)";

const preciseDefinitionsAngle = buildMathAngleContract({
  id: "precise-definitions-angle",
  origin: { x: 40, y: 120 },
  radius: 40,
  startRay: { x: 150, y: 0 },
  endRay: { x: 120, y: -80 },
  sweepRadians: Math.atan2(80, 120)
});

const TERMS = [
  { name: "Angle", def: "Two rays sharing a common endpoint (the vertex).", draw: "angle" },
  { name: "Circle", def: "All points a fixed distance (the radius) from a center point.", draw: "circle" },
  { name: "Parallel lines", def: "Two lines in a plane that never meet — the same direction, always the same distance apart.", draw: "parallel" },
  { name: "Perpendicular", def: "Two lines that meet at a right (90°) angle.", draw: "perp" },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const t = TERMS[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Geometry is built on <strong>precise definitions</strong>. Before proving
        anything, terms like <em>angle</em>, <em>circle</em>, <em>parallel</em>, and{" "}
        <em>perpendicular</em>{" "}must be pinned down using only more basic ideas:
        point, line, distance, and the plane.
      </p>

      <Figure caption="Each term is defined from undefined basics — point, line, and distance.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {TERMS.map((tm, i) => (
              <button
                key={tm.name}
                type="button"
                aria-pressed={idx === i}
                data-ccss-diagram-state={tm.draw}
                data-ccss-diagram-state-button
                onClick={() => setIdx(i)}
                className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}
              >
                {tm.name}
              </button>
            ))}
          </div>

          <svg width={220} height={160} viewBox="0 0 220 160" role="img" aria-label={t.name}>
            {t.draw === "angle" && (
              <>
                <path
                  data-diagram-angle-arc
                  data-math-angle-contract={serializeMathAngleContract(preciseDefinitionsAngle)}
                  d="M 80 120 A 40 40 0 0 0 73.282 97.812"
                  fill="none"
                  stroke="var(--ink-soft)"
                  strokeWidth={2}
                  strokeLinecap="butt"
                />
                <line data-diagram-defining-ray x1={40} y1={120} x2={190} y2={120} stroke={ACCENT} strokeWidth={3} />
                <line data-diagram-defining-ray x1={40} y1={120} x2={160} y2={40} stroke={ACCENT} strokeWidth={3} />
                <circle cx={40} cy={120} r={4} fill="var(--ink)" />
                <text x={44} y={136} fontSize={11} fill="var(--ink-faint)">vertex</text>
              </>
            )}
            {t.draw === "circle" && (
              <>
                <circle cx={110} cy={80} r={55} fill="none" stroke={ACCENT} strokeWidth={3} />
                <circle cx={110} cy={80} r={4} fill="var(--ink)" />
                <line x1={110} y1={80} x2={165} y2={80} stroke="var(--ink-soft)" strokeWidth={2} strokeDasharray="4 3" />
                <text x={128} y={74} fontSize={11} fill="var(--ink-faint)">radius</text>
              </>
            )}
            {t.draw === "parallel" && (
              <>
                <line x1={30} y1={55} x2={190} y2={55} stroke={ACCENT} strokeWidth={3} />
                <line x1={30} y1={105} x2={190} y2={105} stroke={ACCENT} strokeWidth={3} />
                <line x1={70} y1={45} x2={70} y2={115} stroke="var(--ink-faint)" strokeWidth={1} strokeDasharray="3 3" />
                <line x1={150} y1={45} x2={150} y2={115} stroke="var(--ink-faint)" strokeWidth={1} strokeDasharray="3 3" />
              </>
            )}
            {t.draw === "perp" && (
              <>
                <line x1={30} y1={80} x2={190} y2={80} stroke={ACCENT} strokeWidth={3} />
                <line x1={110} y1={20} x2={110} y2={140} stroke={ACCENT} strokeWidth={3} />
                <rect x={110} y={68} width={12} height={12} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
              </>
            )}
          </svg>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">{t.def}</p>
        </div>
      </Figure>

      <h2>Definitions come before proofs</h2>
      <p>
        A definition must be unambiguous and rely only on already-known ideas. An
        angle is <em>two rays with a shared endpoint</em>; a circle is <em>the set
        of points equidistant from a center</em>. These exact statements are what
        let later theorems be proved rather than merely observed.
      </p>

      <MathCheck>
        <p>
          Precise <strong>definitions</strong>{" "}of angle, circle, perpendicular and
          parallel lines, and line segment are based on the undefined notions of{" "}
          <strong>point, line, distance along a line, and distance around a
          circular arc</strong>{" "}(G-CO.1). Rigorous definitions make deductive proof
          possible.
        </p>
      </MathCheck>
    </div>
  );
}
