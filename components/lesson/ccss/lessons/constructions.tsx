"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const COMPASS_RADIUS = 95;
const HALF_SEGMENT = 70;
const ARC_INTERSECTION_X = 130;
const ARC_INTERSECTION_Y_OFFSET = Math.sqrt(COMPASS_RADIUS ** 2 - HALF_SEGMENT ** 2);
const ARC_TOP_Y = 100 - ARC_INTERSECTION_Y_OFFSET;
const ARC_BOTTOM_Y = 100 + ARC_INTERSECTION_Y_OFFSET;

const STEPS = [
  "Start with segment AB.",
  "With the compass wider than half AB, draw an arc centered at A.",
  "Keep the same radius; draw an arc centered at B. The arcs cross at two points.",
  "The line through the two crossings is the perpendicular bisector of AB.",
];

export default function Lesson() {
  const [step, setStep] = useState(0);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        With only a <strong>compass and straightedge</strong>{" "}— no ruler markings —
        you can build exact figures. The classic: the{" "}
        <strong>perpendicular bisector</strong>{" "}of a segment. The same tools inscribe
        a regular hexagon in a circle by stepping the radius around it.
      </p>

      <Figure caption="Two equal-radius arcs from the endpoints cross at points equidistant from A and B.">
        <div className="flex flex-col items-center gap-6">
          <svg className="mx-auto h-auto max-w-full" width={260} height={200} viewBox="0 0 260 200" role="img" aria-label="perpendicular bisector construction">
            {/* segment AB */}
            <line x1={60} y1={100} x2={200} y2={100} stroke="var(--ink)" strokeWidth={2.5} />
            <circle cx={60} cy={100} r={4} fill="var(--ink)" /><text x={50} y={118} fontSize={12}>A</text>
            <circle cx={200} cy={100} r={4} fill="var(--ink)" /><text x={200} y={118} fontSize={12}>B</text>
            {/* arcs */}
            {step >= 1 && (
              <path
                d={`M ${ARC_INTERSECTION_X} ${ARC_TOP_Y} A ${COMPASS_RADIUS} ${COMPASS_RADIUS} 0 0 1 ${ARC_INTERSECTION_X} ${ARC_BOTTOM_Y}`}
                fill="none"
                stroke={ACCENT}
                strokeWidth={1.5}
                opacity={0.55}
              />
            )}
            {step >= 2 && (
              <path
                d={`M ${ARC_INTERSECTION_X} ${ARC_TOP_Y} A ${COMPASS_RADIUS} ${COMPASS_RADIUS} 0 0 0 ${ARC_INTERSECTION_X} ${ARC_BOTTOM_Y}`}
                fill="none"
                stroke="var(--band-upper)"
                strokeWidth={1.5}
                opacity={0.55}
              />
            )}
            {/* perpendicular bisector at x=130 */}
            {step >= 3 && (
              <>
                <line x1={130} y1={15} x2={130} y2={185} stroke={ACCENT} strokeWidth={2.5} />
                <rect x={130} y={100} width={11} height={11} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
                <circle cx={130} cy={100} r={3} fill="var(--ink)" />
              </>
            )}
          </svg>

          <p className="m-0 h-10 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">{STEPS[step]}</p>

          <div className="flex items-center gap-2">
            {STEPS.map((_, s) => (
              <button key={s} type="button" onClick={() => setStep(s)} className="grid h-9 w-9 place-items-center rounded-lg border text-sm font-black" style={step === s ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s + 1}</button>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Why the construction works</h2>
      <p>
        Both arcs use the <em>same radius</em>, so each crossing point is exactly as
        far from A as from B — it lies on the perpendicular bisector by definition.
        Two such points determine the line. Stepping a circle&apos;s radius around it
        marks six equally spaced points: an <strong>inscribed regular hexagon</strong>.
      </p>

      <MathCheck>
        <p>
          Formal <strong>compass-and-straightedge constructions</strong>{" "}(G-CO.12) —
          copying a segment or angle, bisecting, perpendiculars, and parallels — are
          justified by the equal-radius arcs they use. Stepping the radius around a
          circle <strong>inscribes a regular hexagon</strong>, and related methods
          give the equilateral triangle and square (G-CO.13).
        </p>
      </MathCheck>
    </div>
  );
}
