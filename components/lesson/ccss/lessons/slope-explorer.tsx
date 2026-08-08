"use client";

import { useRef, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 6; // grid range: -R..R
const CELL = 26;
const PAD = 22;
const SIZE = 2 * R * CELL + 2 * PAD;
const ORIGIN = PAD + R * CELL;

const LINE = "var(--band-middle)";
const RISE = "var(--band-high)";
const RUN = "var(--band-early)";

type Pt = { x: number; y: number };

export default function Lesson() {
  const [p1, setP1] = useState<Pt>({ x: -3, y: -2 });
  const [p2, setP2] = useState<Pt>({ x: 3, y: 2 });
  const [drag, setDrag] = useState<0 | 1 | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const sx = (x: number) => ORIGIN + x * CELL;
  const sy = (y: number) => ORIGIN - y * CELL;
  const clamp = (v: number) => Math.max(-R, Math.min(R, v));

  function clientToData(clientX: number, clientY: number): Pt {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return {
      x: clamp(Math.round((loc.x - ORIGIN) / CELL)),
      y: clamp(Math.round((ORIGIN - loc.y) / CELL)),
    };
  }

  function onMove(e: React.PointerEvent) {
    if (drag === null) return;
    const next = clientToData(e.clientX, e.clientY);
    const other = drag === 0 ? p2 : p1;
    if (next.x === other.x && next.y === other.y) return; // don't collapse
    (drag === 0 ? setP1 : setP2)(next);
  }

  const run = p2.x - p1.x;
  const rise = p2.y - p1.y;
  const vertical = run === 0;

  // slope as a reduced fraction
  const g = gcd(Math.abs(rise), Math.abs(run)) || 1;
  const sign = rise * run < 0 ? "−" : "";
  const num = Math.abs(rise) / g;
  const den = Math.abs(run) / g;
  const slopeFrac = vertical ? "undefined" : den === 1 ? `${sign}${num}` : `${sign}${num}/${den}`;
  const slopeDec = vertical ? "—" : (rise / run).toFixed(2);

  // line endpoints across the whole grid (y = m x + b), or vertical
  let lineEnds: [Pt, Pt];
  if (vertical) {
    lineEnds = [
      { x: p1.x, y: -R },
      { x: p1.x, y: R },
    ];
  } else {
    const m = rise / run;
    const b = p1.y - m * p1.x;
    lineEnds = [
      { x: -R, y: m * -R + b },
      { x: R, y: m * R + b },
    ];
  }

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>slope</strong>{" "}of a line measures its steepness: how much it
        rises for each step you take to the right. Drag either point (or use the
        steppers) and watch the <strong style={{ color: RISE }}>rise</strong>{" "}and{" "}
        <strong style={{ color: RUN }}>run</strong>{" "}change.
      </p>

      <Figure caption="Slope = rise ÷ run. Try measuring between different points on the same line.">
        <div className="flex flex-col items-center gap-5">
          <svg
            ref={svgRef}
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="max-w-full touch-none select-none"
            style={{ maxHeight: 380 }}
            onPointerMove={onMove}
            onPointerUp={() => setDrag(null)}
            // role="img" made every child presentational, including the two
            // draggable points the intro tells the reader to drag.
            role="group"
            aria-label={`Line through (${p1.x}, ${p1.y}) and (${p2.x}, ${p2.y})`}
          >
            {/* grid */}
            {Array.from({ length: 2 * R + 1 }, (_, i) => {
              const v = -R + i;
              return (
                <g key={v} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                  <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
                </g>
              );
            })}
            {/* axes */}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={1.75} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={1.75} />

            {/* rise/run triangle */}
            {!vertical && rise !== 0 && (
              <line x1={sx(p1.x)} y1={sy(p1.y)} x2={sx(p2.x)} y2={sy(p1.y)} stroke={RUN} strokeWidth={2.5} />
            )}
            {!vertical && rise !== 0 && (
              <line x1={sx(p2.x)} y1={sy(p1.y)} x2={sx(p2.x)} y2={sy(p2.y)} stroke={RISE} strokeWidth={2.5} />
            )}

            {/* line */}
            <line
              x1={sx(lineEnds[0].x)}
              y1={sy(lineEnds[0].y)}
              x2={sx(lineEnds[1].x)}
              y2={sy(lineEnds[1].y)}
              stroke={LINE}
              strokeWidth={3}
              strokeLinecap="round"
            />

            {/* draggable points */}
            {[p1, p2].map((p, i) => (
              <circle
                key={i}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={9}
                fill={LINE}
                stroke="white"
                strokeWidth={3}
                className="cursor-grab"
                onPointerDown={(e) => {
                  svgRef.current?.setPointerCapture(e.pointerId);
                  setDrag(i as 0 | 1);
                }}
              />
            ))}
          </svg>

          <div className="rounded-xl bg-[var(--surface-2)] px-6 py-3 text-center">
            <div className="font-mono text-lg font-bold">
              slope ={" "}
              <span style={{ color: RISE }}>rise {rise >= 0 ? rise : `(${rise})`}</span> ÷{" "}
              <span style={{ color: RUN }}>run {run >= 0 ? run : `(${run})`}</span> ={" "}
              <span style={{ color: LINE }}>{slopeFrac}</span>
              {!vertical && <span className="text-[var(--ink-faint)]"> ≈ {slopeDec}</span>}
            </div>
            {vertical && (
              <div className="mt-1 text-sm text-[var(--ink-soft)]">
                A vertical line has <strong>no slope</strong>{" "}— you&apos;d be dividing by a run of 0.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <PointControls label="Point 1" p={p1} set={setP1} other={p2} clamp={clamp} />
            <PointControls label="Point 2" p={p2} set={setP2} other={p1} clamp={clamp} />
          </div>
        </div>
      </Figure>

      <h2>Slope is the same everywhere on a line</h2>
      <p>
        Pick <em>any</em>{" "}two points on the same straight line and measure rise
        over run — you always get the same number. That constant rate of change
        is what makes the graph a straight line in the first place.
      </p>

      <MathCheck>
        <p>
          For two points (x₁, y₁) and (x₂, y₂) on a non-vertical line, the slope
          is <strong>m = (y₂ − y₁) / (x₂ − x₁)</strong>{" "}(8.EE.B.6). It is the
          same for every pair of points because the right triangles you draw
          between them are all <strong>similar</strong>{" "}— same shape, scaled up
          or down — so their height-to-base ratios are equal. A line written as{" "}
          <strong>y = mx + b</strong>{" "}has slope m and y-intercept b (8.F.A.3); a
          vertical line can&apos;t be written this way, which is why its slope is
          undefined.
        </p>
      </MathCheck>
    </div>
  );
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function PointControls({
  label,
  p,
  set,
  other,
  clamp,
}: {
  label: string;
  p: Pt;
  set: (p: Pt) => void;
  other: Pt;
  clamp: (v: number) => number;
}) {
  const tryset = (next: Pt) => {
    if (next.x === other.x && next.y === other.y) return;
    set(next);
  };
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {label}: <span className="font-mono text-[var(--ink)]">({p.x}, {p.y})</span>
      </span>
      <div className="flex gap-3">
        {(["x", "y"] as const).map((axis) => (
          <div key={axis} className="flex items-center gap-1">
            <button
              type="button"
              className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] text-sm font-bold"
              onClick={() => tryset({ ...p, [axis]: clamp(p[axis] - 1) })}
              aria-label={`Decrease ${label} ${axis}`}
            >
              −
            </button>
            <span className="w-4 text-center font-mono text-xs font-bold">{axis}</span>
            <button
              type="button"
              className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] text-sm font-bold"
              onClick={() => tryset({ ...p, [axis]: clamp(p[axis] + 1) })}
              aria-label={`Increase ${label} ${axis}`}
            >
              +
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
