"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const FILL = "var(--band-upper)";
const INK = "var(--ink)";

type Tri = { key: string; name: string; points: string; desc: string; mark?: { x: number; y: number } };
const TRIS: Tri[] = [
  { key: "right", name: "Right triangle", points: "40,140 40,30 170,140", desc: "Has one right angle (exactly 90°).", mark: { x: 40, y: 140 } },
  { key: "acute", name: "Acute triangle", points: "100,25 40,140 160,140", desc: "All three angles are less than 90°." },
  { key: "obtuse", name: "Obtuse triangle", points: "35,120 175,140 150,80", desc: "Has one angle greater than 90°." },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const tri = TRIS[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Triangles can be sorted by their <strong>angles</strong>. If one angle is
        exactly 90°, it is a <strong>right triangle</strong>. If every angle is
        smaller than 90°, it is <strong>acute</strong>. If one angle is bigger
        than 90°, it is <strong>obtuse</strong>.
      </p>

      <Figure caption="Tap a type to see it. The little square marks a right angle.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {TRIS.map((t, i) => (
              <button key={t.key} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: FILL, color: "white", borderColor: FILL } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{t.name}</button>
            ))}
          </div>

          <svg width="210" height="170" viewBox="0 0 210 170" role="img" aria-label={tri.name}>
            <polygon points={tri.points} fill={FILL} fillOpacity={0.8} stroke={INK} strokeWidth={2.5} />
            {tri.mark && <rect x={tri.mark.x + 2} y={tri.mark.y - 15} width={13} height={13} fill="none" stroke={INK} strokeWidth={1.5} />}
          </svg>

          <div className="text-center">
            <div className="text-2xl font-black" style={{ color: FILL }}>{tri.name}</div>
            <p className="mt-1 max-w-sm text-[15px] text-[var(--ink-soft)]">{tri.desc}</p>
          </div>
        </div>
      </Figure>

      <h2>Sorted by their angles</h2>
      <p>
        Every triangle fits exactly one of these angle categories. Shapes can
        also be sorted by their <strong>sides</strong>{" "}— or by whether they have{" "}
        <strong>parallel</strong>{" "}or <strong>perpendicular</strong>{" "}lines, like
        the right angle in a right triangle.
      </p>

      <MathCheck>
        <p>
          Classifying two-dimensional figures by the presence or absence of{" "}
          <strong>parallel</strong>{" "}or <strong>perpendicular</strong>{" "}lines, and by
          the size of their angles — and recognizing <strong>right triangles</strong>{" "}
          as their own category — is 4.G.A.2. A triangle is right, acute, or obtuse
          depending on its largest angle.
        </p>
      </MathCheck>
    </div>
  );
}
