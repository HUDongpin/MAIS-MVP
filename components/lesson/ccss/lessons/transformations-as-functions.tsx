"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 5, CELL = 26, PAD = 22;
const SIZE = 2 * R * CELL + 2 * PAD;
const ORIG = "var(--ink-soft)";
const IMG = "var(--band-high)";

type P = [number, number];
const SHAPE: P[] = [[1, 1], [3, 1], [3, 2], [2, 3]];

type T = { name: string; fn: (p: P) => P; rule: string };
const TRANSFORMS: T[] = [
  { name: "translate", fn: ([x, y]) => [x - 3, y + 1], rule: "(x, y) → (x − 3, y + 1)" },
  { name: "reflect (y-axis)", fn: ([x, y]) => [-x, y], rule: "(x, y) → (−x, y)" },
  { name: "rotate 90°", fn: ([x, y]) => [-y, x], rule: "(x, y) → (−y, x)" },
  { name: "rotate 180°", fn: ([x, y]) => [-x, -y], rule: "(x, y) → (−x, −y)" },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const t = TRANSFORMS[idx];

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;
  const poly = (pts: P[]) => pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ");

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>transformation is a function</strong>{" "}— it takes each point of
        the plane to exactly one image point. <strong>Rigid motions</strong>{" "}
        (translations, reflections, rotations) preserve distance and angle, so the
        image is congruent to the original.
      </p>

      <Figure caption="Each transformation is a rule on coordinates. Apply it to every vertex to get the image.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {TRANSFORMS.map((tr, i) => (
              <button key={tr.name} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: IMG, color: "white", borderColor: IMG } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{tr.name}</button>
            ))}
          </div>

          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 330 }} role="img" aria-label={`${t.name}: dashed original quadrilateral and its image under ${t.rule}`}>
            {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
              </g>
            ))}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            <polygon points={poly(SHAPE)} fill="none" stroke={ORIG} strokeWidth={2} strokeDasharray="4 3" />
            <polygon points={poly(SHAPE.map(t.fn))} fill={IMG} fillOpacity={0.35} stroke={IMG} strokeWidth={2.5} style={{ transition: "all 0.4s ease" }} />
          </svg>

          <div className="rounded-xl border-2 px-6 py-2 font-mono text-lg font-black" style={{ borderColor: IMG, color: IMG }}>{t.rule}</div>
        </div>
      </Figure>

      <h2>Functions on the plane</h2>
      <p>
        Writing a transformation as a coordinate rule — like{" "}
        <strong>(x, y) → (−y, x)</strong>{" "}for a 90° turn — makes it a genuine
        function you can apply, compose, and invert. Because rigid motions keep
        lengths and angles fixed, the dashed original and solid image are always
        the same size and shape.
      </p>

      <MathCheck>
        <p>
          Transformations are <strong>functions of the plane</strong>{" "}taking points
          to points (G-CO.2). <strong>Rotations, reflections, and translations</strong>{" "}
          are defined by how they move every point (G-CO.4), and you can{" "}
          <strong>draw the image</strong>{" "}of a figure by applying the rule to each
          vertex (G-CO.5). Rigid motions preserve distance and angle.
        </p>
      </MathCheck>
    </div>
  );
}
