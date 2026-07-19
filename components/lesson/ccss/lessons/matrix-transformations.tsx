"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 5;
const CELL = 26;
const PAD = 24;
const SIZE = 2 * R * CELL + 2 * PAD;
const ORIG = "var(--ink-soft)";
const IMG = "var(--band-high)";

type M = [[number, number], [number, number]];

// a house-like shape
const SHAPE: [number, number][] = [[0, 0], [2, 0], [2, 2], [1, 3], [0, 2]];

const PRESETS: { name: string; m: M }[] = [
  { name: "identity", m: [[1, 0], [0, 1]] },
  { name: "scale ×2", m: [[2, 0], [0, 2]] },
  { name: "rotate 90°", m: [[0, -1], [1, 0]] },
  { name: "reflect x", m: [[1, 0], [0, -1]] },
  { name: "shear", m: [[1, 1], [0, 1]] },
];

export default function Lesson() {
  const [mi, setMi] = useState(2);
  const m = PRESETS[mi].m;

  const apply = ([x, y]: [number, number]): [number, number] => [
    m[0][0] * x + m[0][1] * y,
    m[1][0] * x + m[1][1] * y,
  ];
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;
  const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ");

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>2×2 matrix is a transformation of the plane</strong>. Multiply
        it by each point&apos;s coordinate vector and the whole shape moves —
        rotating, scaling, reflecting, or shearing. The matrix&apos;s{" "}
        <strong>columns</strong>{" "}tell you where (1,0) and (0,1) land.
      </p>

      <Figure caption="Every point [x, y] becomes M·[x, y]. The determinant is the area scale factor.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((p, i) => (
              <button key={p.name} type="button" onClick={() => setMi(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mi === i ? { background: IMG, color: "white", borderColor: IMG } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{p.name}</button>
            ))}
          </div>

          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 330 }} role="img" aria-label="matrix transformation of a shape">
            {Array.from({ length: 2 * R + 1 }, (_, i) => {
              const c = i - R;
              return (
                <g key={c} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(c)} y1={sy(-R)} x2={sx(c)} y2={sy(R)} />
                  <line x1={sx(-R)} y1={sy(c)} x2={sx(R)} y2={sy(c)} />
                </g>
              );
            })}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            <polygon points={poly(SHAPE)} fill="none" stroke={ORIG} strokeWidth={2} strokeDasharray="4 3" />
            <polygon points={poly(SHAPE.map(apply))} fill={IMG} fillOpacity={0.35} stroke={IMG} strokeWidth={2.5} style={{ transition: "all 0.4s ease" }} />
          </svg>

          <div className="flex items-center gap-4">
            <div className="flex items-stretch">
              <span className="w-1.5 rounded-l border-2 border-r-0" style={{ borderColor: IMG }} />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-2 py-1.5 font-mono text-lg font-black" style={{ color: IMG }}>
                {m.flat().map((v, i) => <span key={i} className="w-6 text-center">{v}</span>)}
              </div>
              <span className="w-1.5 rounded-r border-2 border-l-0" style={{ borderColor: IMG }} />
            </div>
            <div className="text-sm">
              <div className="font-mono">det = ({m[0][0]})({m[1][1]}) − ({m[0][1]})({m[1][0]}) = <strong style={{ color: IMG }}>{det}</strong></div>
              <div className="text-xs text-[var(--ink-faint)]">area scales by |det| = {Math.abs(det)}{det < 0 ? " (orientation flips)" : ""}</div>
            </div>
          </div>
        </div>
      </Figure>

      <h2>Columns show where the basis goes</h2>
      <p>
        The first column of M is the image of (1, 0); the second is the image of
        (0, 1). Because the transformation is linear, that fixes where{" "}
        <em>every</em>{" "}point goes. The <strong>determinant</strong>{" "}({det})
        measures how areas scale — and a negative value flips the plane over.
      </p>

      <MathCheck>
        <p>
          Multiplying a matrix by a vector <strong>transforms</strong>{" "}that vector
          (N-VM.11). A 2×2 matrix therefore encodes a linear{" "}
          <strong>transformation of the plane</strong>{" "}(N-VM.12) — rotations,
          scalings, reflections, shears — with its columns giving the images of
          the basis vectors and its <strong>determinant</strong>{" "}giving the area
          scale factor.
        </p>
      </MathCheck>
    </div>
  );
}
