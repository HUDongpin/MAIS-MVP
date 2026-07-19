"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const MODES = [
  {
    name: "Inscribed circle",
    desc: "The incircle touches all three sides. Its center is the incenter — where the three angle bisectors meet.",
    center: [120, 105] as [number, number], r: 34, kind: "in",
  },
  {
    name: "Circumscribed circle",
    desc: "The circumcircle passes through all three vertices. Its center is the circumcenter — where the perpendicular bisectors of the sides meet.",
    center: [120, 95] as [number, number], r: 78, kind: "circum",
  },
  {
    name: "Tangent line",
    desc: "A tangent touches a circle at one point, perpendicular to the radius there. From an external point, draw it using the radius–tangent right angle.",
    center: [110, 100] as [number, number], r: 45, kind: "tangent",
  },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const m = MODES[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Compass and straightedge do more than bisect segments. They let you build
        the <strong>incircle</strong>{" "}and <strong>circumcircle</strong>{" "}of a
        triangle, and a <strong>tangent</strong>{" "}to a circle — each resting on a
        special point where certain lines concur.
      </p>

      <Figure caption="Angle bisectors meet at the incenter; perpendicular bisectors meet at the circumcenter.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {MODES.map((mo, i) => (
              <button key={mo.name} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{mo.name}</button>
            ))}
          </div>

          <svg width={240} height={190} viewBox="0 0 240 190" role="img" aria-label={m.name}>
            <polygon points="40,160 200,160 120,30" fill={ACCENT} fillOpacity={0.1} stroke={ACCENT} strokeWidth={2} />
            <circle cx={m.center[0]} cy={m.center[1]} r={m.r} fill="none" stroke="var(--band-upper)" strokeWidth={2.5} />
            <circle cx={m.center[0]} cy={m.center[1]} r={3} fill="var(--band-upper)" />
            {m.kind === "tangent" && (
              <>
                <line x1={m.center[0]} y1={m.center[1] - m.r} x2={230} y2={m.center[1] - m.r} stroke={ACCENT} strokeWidth={2} />
                <line x1={m.center[0]} y1={m.center[1]} x2={m.center[0]} y2={m.center[1] - m.r} stroke="var(--ink-soft)" strokeWidth={1.5} strokeDasharray="3 2" />
                <rect x={m.center[0]} y={m.center[1] - m.r} width={10} height={10} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
              </>
            )}
          </svg>

          <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">{m.desc}</p>
        </div>
      </Figure>

      <h2>Concurrent lines locate the center</h2>
      <p>
        The three <strong>angle bisectors</strong>{" "}of a triangle always meet at one
        point equidistant from the sides — the incenter, center of the inscribed
        circle. The three <strong>perpendicular bisectors</strong>{" "}meet at a point
        equidistant from the vertices — the circumcenter. A tangent is built by
        exploiting the right angle a radius makes with the tangent line.
      </p>

      <MathCheck>
        <p>
          Constructing the <strong>inscribed and circumscribed circles</strong>{" "}of a
          triangle (G-C.3): the incenter is the concurrence of angle bisectors, the
          circumcenter of perpendicular bisectors. Constructing a{" "}
          <strong>tangent line</strong>{" "}to a circle from a point (G-C.4) uses the
          fact that the tangent is perpendicular to the radius at the point of
          contact.
        </p>
      </MathCheck>
    </div>
  );
}
