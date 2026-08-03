"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const N = 10;
const CELL = 30;
const PAD = 30;
const SIZE = N * CELL + 2 * PAD;
const FILL = "var(--band-middle)";

export default function Lesson() {
  const [x1, setX1] = useState(2);
  const [y1, setY1] = useState(2);
  const [x2, setX2] = useState(8);
  const [y2, setY2] = useState(6);

  const sx = (x: number) => PAD + x * CELL;
  const sy = (y: number) => SIZE - PAD - y * CELL;
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const lo = { x: Math.min(x1, x2), y: Math.min(y1, y2) };

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Plot the corners of a polygon on the coordinate plane and you can find its{" "}
        <strong>side lengths without a ruler</strong>. For horizontal and vertical
        sides, just <strong>subtract the coordinates</strong>.
      </p>

      <Figure caption="The side lengths are the differences of the corner coordinates.">
        <div className="flex flex-col items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 360 }} role="img" aria-label="rectangle on a grid">
            {Array.from({ length: N + 1 }, (_, i) => (
              <g key={i} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} />
                <line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} />
              </g>
            ))}
            <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={2} />
            <rect x={sx(lo.x)} y={sy(lo.y + height)} width={width * CELL} height={height * CELL} fill={FILL} fillOpacity={0.3} stroke={FILL} strokeWidth={2.5} />
            {[[x1, y1], [x2, y1], [x2, y2], [x1, y2]].map(([px, py], i) => (
              <g key={i}>
                <circle cx={sx(px)} cy={sy(py)} r={5} fill={FILL} stroke="white" strokeWidth={1.5} />
                <text x={sx(px) + (px === Math.max(x1, x2) ? 8 : -8)} y={sy(py) + (py === Math.max(y1, y2) ? -8 : 16)} textAnchor={px === Math.max(x1, x2) ? "start" : "end"} fontSize={11} fontWeight={700} fill={FILL} fontFamily="var(--font-mono)">({px},{py})</text>
              </g>
            ))}
          </svg>

          <div className="grid grid-cols-3 gap-3 text-center">
            <Fact label="Width" value={`${width}`} note={`|${x2} − ${x1}|`} />
            <Fact label="Height" value={`${height}`} note={`|${y2} − ${y1}|`} />
            <Fact label="Area" value={`${width * height}`} note={`${width} × ${height}`} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Stepper label="x₁" value={x1} forbid={x2} onChange={setX1} />
            <Stepper label="y₁" value={y1} forbid={y2} onChange={setY1} />
            <Stepper label="x₂" value={x2} forbid={x1} onChange={setX2} />
            <Stepper label="y₂" value={y2} forbid={y1} onChange={setY2} />
          </div>
        </div>
      </Figure>

      <h2>Subtract to measure</h2>
      <p>
        The horizontal side runs from x = {x1} to x = {x2}, so its length is |{x2}{" "}
        − {x1}| = {width}. The vertical side is |{y2} − {y1}| = {height}. From
        there the area ({width * height}) and perimeter ({2 * (width + height)})
        follow.
      </p>

      <MathCheck>
        <p>
          Drawing polygons in the coordinate plane from their vertices and finding
          side lengths (6.G.A.3): a side between two points with the same
          y-coordinate has length equal to the <strong>difference of the
          x-coordinates</strong>{" "}(and likewise for vertical sides). Here the
          rectangle is {width} by {height}, with area {width * height}.
        </p>
      </MathCheck>
    </div>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</div>
      <div className="font-mono text-xl font-black">{value}</div>
      <div className="font-mono text-[10px] text-[var(--ink-faint)]">{note}</div>
    </div>
  );
}

function Stepper({ label, value, forbid, onChange }: { label: string; value: number; forbid?: number; onChange: (n: number) => void }) {
  // Step over the opposite corner's coordinate. Letting them coincide collapsed
  // the rectangle to a point: a zero-by-zero rect, four "(5,5)" labels stacked
  // on one dot, and prose reading "its length is |5 − 5| = 0 … the area (0) and
  // perimeter (0) follow" in a lesson about polygons in the coordinate plane.
  // Clamping the step-over made it turn round at the grid edge: with x₂ = 0 and
  // x₁ = 1, "Decrease x₁" landed on 2. A step that has nowhere to go is simply
  // unavailable, so the button is disabled instead of reversing.
  const resolve = (dir: number) => {
    let next = value + dir;
    if (next === forbid) next += dir;
    return next >= 0 && next <= N ? next : null;
  };
  const dec = resolve(-1);
  const inc = resolve(1);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => dec !== null && onChange(dec)} disabled={dec === null} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-6 text-center text-xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => inc !== null && onChange(inc)} disabled={inc === null} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
