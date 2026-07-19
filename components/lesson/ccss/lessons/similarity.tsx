"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const N = 10;
const CELL = 28;
const PAD = 26;
const SIZE = N * CELL + 2 * PAD;
const ORIG = "var(--band-middle)";
const IMG = "var(--band-upper)";

type P = [number, number];
const TRI: P[] = [[1, 1], [3, 1], [1, 2]];

export default function Lesson() {
  const [k, setK] = useState(2);
  const image = TRI.map(([x, y]) => [x * k, y * k] as P);

  const sx = (x: number) => PAD + x * CELL;
  const sy = (y: number) => SIZE - PAD - y * CELL;
  const poly = (pts: P[]) => pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ");

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>dilation</strong>{" "}resizes a figure by a <strong>scale factor</strong>{" "}
        from a center point. The result is <strong>similar</strong>{" "}— same shape,
        same angles, but sides multiplied by k. Similar figures are scaled copies of
        each other.
      </p>

      <Figure caption="Dilating from the origin multiplies every coordinate by k. Angles stay; lengths scale.">
        <div className="flex flex-col items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 340 }} role="img" aria-label={`dilation by ${k}`}>
            {Array.from({ length: N + 1 }, (_, i) => (
              <g key={i} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} />
                <line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} />
              </g>
            ))}
            <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* rays from origin through vertices */}
            {k > 1 && image.map(([x, y], i) => (
              <line key={i} x1={sx(0)} y1={sy(0)} x2={sx(x)} y2={sy(y)} stroke="var(--ink-faint)" strokeWidth={0.8} strokeDasharray="3 3" />
            ))}
            <polygon points={poly(image)} fill={IMG} fillOpacity={0.35} stroke={IMG} strokeWidth={2.5} />
            <polygon points={poly(TRI)} fill={ORIG} fillOpacity={0.7} stroke={ORIG} strokeWidth={2.5} />
          </svg>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">scale factor k = <span style={{ color: IMG }}>{k}</span></div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              A base of 2 becomes {2 * k}; every side is {k} times longer, but the angles are unchanged. {k === 1 ? "At k = 1 the figures are congruent." : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((kk) => (
              <button key={kk} type="button" onClick={() => setK(kk)} className="grid h-10 w-10 place-items-center rounded-lg border text-lg font-black" style={k === kk ? { background: IMG, color: "white", borderColor: IMG } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{kk}×</button>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Same shape, scaled size</h2>
      <p>
        Every point of the image is k times as far from the center as the
        original. That stretches the sides by {k} while keeping all angles equal —
        so the two triangles are <strong>similar</strong>. When k = 1, similar
        becomes congruent.
      </p>

      <MathCheck>
        <p>
          Two figures are <strong>similar</strong>{" "}if one can be obtained from the
          other by a sequence of rigid motions and a <strong>dilation</strong>{" "}
          (8.G.A.4). Similarity preserves <strong>angles</strong>{" "}and scales all
          <strong>lengths</strong>{" "}by the same factor k. Here the image has the same
          angles as the original but sides {k}× as long.
        </p>
      </MathCheck>
    </div>
  );
}
