"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 6;
const CELL = 26;
const PAD = 20;
const SIZE = 2 * R * CELL + 2 * PAD;
const ORIG = "var(--band-middle)";
const IMG = "var(--band-upper)";

type Tf = { key: string; name: string; rule: string; fn: (p: [number, number]) => [number, number] };
const TFS: Tf[] = [
  { key: "trans", name: "Translate", rule: "(x, y) → (x + 4, y − 1)", fn: ([x, y]) => [x + 4, y - 1] },
  { key: "reflx", name: "Reflect over x-axis", rule: "(x, y) → (x, −y)", fn: ([x, y]) => [x, -y] },
  { key: "refly", name: "Reflect over y-axis", rule: "(x, y) → (−x, y)", fn: ([x, y]) => [-x, y] },
  { key: "rot", name: "Rotate 90° (CCW)", rule: "(x, y) → (−y, x)", fn: ([x, y]) => [-y, x] },
];

const TRI: [number, number][] = [[-4, 1], [-1, 1], [-4, 4]];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const tf = TFS[idx];
  const image = TRI.map(tf.fn);

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;
  const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ");

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>transformation</strong>{" "}moves a shape without bending it.{" "}
        <strong>Translations</strong>{" "}slide, <strong>reflections</strong>{" "}flip, and{" "}
        <strong>rotations</strong>{" "}turn. Each one changes the coordinates by a
        simple, predictable rule.
      </p>

      <Figure caption="The blue triangle is the image after the transformation. Read how the coordinates change.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {TFS.map((t, i) => (
              <button key={t.key} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: IMG, color: "white", borderColor: IMG } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{t.name}</button>
            ))}
          </div>

          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 340 }} role="img" aria-label={tf.name}>
            {Array.from({ length: 2 * R + 1 }, (_, i) => {
              const v = i - R;
              return (
                <g key={v} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                  <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
                </g>
              );
            })}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            <polygon points={poly(TRI)} fill={ORIG} fillOpacity={0.5} stroke={ORIG} strokeWidth={2} />
            <polygon points={poly(image)} fill={IMG} fillOpacity={0.6} stroke={IMG} strokeWidth={2} />
          </svg>

          <div className="rounded-2xl border-2 px-6 py-3 text-center" style={{ borderColor: IMG }}>
            <div className="font-mono text-xl font-black" style={{ color: IMG }}>{tf.rule}</div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">
              e.g. ({TRI[2][0]}, {TRI[2][1]}) → ({image[2][0]}, {image[2][1]})
            </div>
          </div>
          <p className="m-0 text-center text-sm text-[var(--ink-faint)]">The image is the same size and shape — only its position or orientation changed.</p>
        </div>
      </Figure>

      <h2>Rigid motions keep shape</h2>
      <p>
        Translations, reflections, and rotations are <strong>rigid motions</strong>:
        they preserve lengths and angles, so the image is congruent to the original.
        Only the coordinates change — by adding, negating, or swapping — following
        the rule <span className="font-mono">{tf.rule}</span>.
      </p>

      <MathCheck>
        <p>
          Rotations, reflections, and translations take lines to lines, preserve
          lengths and angle measures, and keep parallel lines parallel (8.G.A.1).
          Their effect on a figure can be described with <strong>coordinate rules</strong>{" "}
          (8.G.A.3) — reflecting over the x-axis negates y, over the y-axis negates
          x, and a 90° turn swaps and negates.
        </p>
      </MathCheck>
    </div>
  );
}
