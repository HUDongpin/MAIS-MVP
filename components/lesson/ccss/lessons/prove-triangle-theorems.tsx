"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const THEOREMS = [
  { name: "Angle sum", claim: "The three angles of a triangle sum to 180°.", why: "Draw a line through one vertex parallel to the opposite side; the two base angles reappear as alternate angles, forming a straight line with the top angle." },
  { name: "Isosceles base angles", claim: "If two sides are equal, the base angles are equal.", why: "The reflection across the angle bisector of the apex maps the triangle onto itself, swapping the two base angles." },
  { name: "Midsegment", claim: "The segment joining two midpoints is parallel to the third side and half its length.", why: "A dilation of factor 2 centered at a vertex maps the midsegment to the full third side." },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const t = THEOREMS[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The classic triangle theorems — the <strong>180° angle sum</strong>, the{" "}
        <strong>isosceles base angles</strong>, the <strong>midsegment</strong>{" "}rule
        — aren&apos;t just true, they&apos;re <em>provable</em>{" "}from parallel-line
        angles and rigid motions. A picture suggests it; a proof settles it.
      </p>

      <Figure caption="Each theorem follows from parallel-line angle facts or a symmetry of the figure.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {THEOREMS.map((th, i) => (
              <button key={th.name} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{th.name}</button>
            ))}
          </div>

          <svg width={240} height={170} viewBox="0 0 240 170" role="img" aria-label={t.name}>
            <polygon points="40,140 200,140 90,40" fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={2.5} />
            {idx === 0 && <line x1={50} y1={40} x2={130} y2={40} stroke="var(--band-upper)" strokeWidth={2} strokeDasharray="4 3" />}
            {idx === 1 && <line x1={90} y1={40} x2={120} y2={140} stroke="var(--band-upper)" strokeWidth={1.5} strokeDasharray="4 3" />}
            {idx === 2 && (
              <>
                <line x1={65} y1={90} x2={145} y2={90} stroke="var(--band-upper)" strokeWidth={3} />
                <circle cx={65} cy={90} r={3} fill="var(--band-upper)" />
                <circle cx={145} cy={90} r={3} fill="var(--band-upper)" />
              </>
            )}
          </svg>

          <div className="rounded-2xl border-2 px-6 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-bold" style={{ color: ACCENT }}>{t.claim}</div>
            <div className="mt-2 max-w-md text-sm text-[var(--ink-soft)]"><strong>Why:</strong>{" "}{t.why}</div>
          </div>
        </div>
      </Figure>

      <h2>From diagram to deduction</h2>
      <p>
        Take the angle sum: the auxiliary parallel line converts the triangle&apos;s
        three angles into three angles along a straight line, which total 180°. The
        isosceles theorem uses a reflection symmetry. Each proof reduces a new claim
        to facts already established — that&apos;s the deductive method.
      </p>

      <MathCheck>
        <p>
          Theorems about triangles (G-CO.10): the <strong>interior angles sum to
          180°</strong>; the <strong>base angles of an isosceles triangle are
          congruent</strong>; the <strong>midsegment</strong>{" "}is parallel to and
          half the third side; and the medians meet at a centroid. Each is proved
          using parallel-line angles, congruence criteria, or similarity.
        </p>
      </MathCheck>
    </div>
  );
}
