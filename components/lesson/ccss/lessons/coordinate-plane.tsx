"use client";

import { useRef, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const N = 10; // 0..N on each axis
const CELL = 30;
const PAD = 34;
const SIZE = N * CELL + 2 * PAD;
const ORIGIN_X = PAD;
const ORIGIN_Y = PAD + N * CELL;

const POINT = "var(--band-upper)";
const GHOST = "var(--band-early)";

export default function Lesson() {
  const [p, setP] = useState({ x: 4, y: 7 });
  const svgRef = useRef<SVGSVGElement>(null);

  const sx = (x: number) => ORIGIN_X + x * CELL;
  const sy = (y: number) => ORIGIN_Y - y * CELL;
  const clamp = (v: number) => Math.max(0, Math.min(N, v));

  function place(clientX: number, clientY: number) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    setP({
      x: clamp(Math.round((loc.x - ORIGIN_X) / CELL)),
      y: clamp(Math.round((ORIGIN_Y - loc.y) / CELL)),
    });
  }

  const swapped = p.x !== p.y;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>coordinate plane</strong>{" "}gives every point an address: an{" "}
        <strong>ordered pair</strong>{" "}<span className="font-mono">(x, y)</span>.
        The first number tells you how far to go <strong>right</strong>; the
        second tells you how far to go <strong>up</strong>. Click the grid to
        move the point.
      </p>

      <Figure caption="Right first, then up. The order of the two numbers changes where you land.">
        <div className="flex flex-col items-center gap-5">
          <svg
            ref={svgRef}
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="max-w-full cursor-pointer touch-none"
            style={{ maxHeight: 400 }}
            onPointerDown={(e) => place(e.clientX, e.clientY)}
            role="img"
            aria-label={`Point at (${p.x}, ${p.y})${swapped ? `, with the swapped pair (${p.y}, ${p.x}) drawn as an outlined circle` : ", where x and y are equal, so no swapped point is drawn"}`}
          >
            {/* grid */}
            {Array.from({ length: N + 1 }, (_, i) => (
              <g key={i} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} />
                <line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} />
              </g>
            ))}
            {/* axes */}
            <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* axis labels */}
            {Array.from({ length: N + 1 }, (_, i) => (
              <g key={`lab-${i}`} fontFamily="var(--font-mono)" fontSize={10} fill="var(--ink-faint)">
                {i > 0 && <text x={sx(i)} y={sy(0) + 16} textAnchor="middle">{i}</text>}
                {i > 0 && <text x={sx(0) - 10} y={sy(i) + 4} textAnchor="end">{i}</text>}
              </g>
            ))}
            <text x={sx(0) - 10} y={sy(0) + 16} textAnchor="end" fontSize={10} fill="var(--ink-faint)">0</text>

            {/* travel path: right then up */}
            <line x1={sx(0)} y1={sy(0)} x2={sx(p.x)} y2={sy(0)} stroke={GHOST} strokeWidth={2.5} strokeDasharray="4 3" />
            <line x1={sx(p.x)} y1={sy(0)} x2={sx(p.x)} y2={sy(p.y)} stroke={POINT} strokeWidth={2.5} strokeDasharray="4 3" />

            {/* swapped ghost point (y, x) */}
            {swapped && (
              <g>
                <circle cx={sx(p.y)} cy={sy(p.x)} r={7} fill="none" stroke={GHOST} strokeWidth={2.5} />
                <text x={sx(p.y)} y={sy(p.x) - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill={GHOST} fontFamily="var(--font-mono)">
                  ({p.y}, {p.x})
                </text>
              </g>
            )}

            {/* main point */}
            <circle cx={sx(p.x)} cy={sy(p.y)} r={8} fill={POINT} stroke="white" strokeWidth={2.5} />
            <text x={sx(p.x)} y={sy(p.y) - 14} textAnchor="middle" fontSize={13} fontWeight={800} fill={POINT} fontFamily="var(--font-mono)">
              ({p.x}, {p.y})
            </text>
          </svg>

          <div className="text-center text-[15px] text-[var(--ink-soft)]">
            {swapped ? (
              <>
                <span className="font-mono font-bold" style={{ color: POINT }}>({p.x}, {p.y})</span>{" "}
                and{" "}
                <span className="font-mono font-bold" style={{ color: GHOST }}>({p.y}, {p.x})</span>{" "}
                are <strong>different points</strong>. Order matters!
              </>
            ) : (
              <>Here x and y are equal, so the point sits on the diagonal.</>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="x (right)" value={p.x} onChange={(v) => setP({ ...p, x: clamp(v) })} />
            <Stepper label="y (up)" value={p.y} onChange={(v) => setP({ ...p, y: clamp(v) })} />
          </div>
        </div>
      </Figure>

      <h2>Why order matters</h2>
      <p>
        The point <span className="font-mono">(4, 7)</span> means{" "}
        <strong>4 right and 7 up</strong>. Swap the numbers to{" "}
        <span className="font-mono">(7, 4)</span> and you get{" "}
        <strong>7 right and 4 up</strong>{" "}— a completely different spot. That is
        why we call it an <em>ordered</em>{" "}pair.
      </p>

      <MathCheck>
        <p>
          In an ordered pair <strong>(x, y)</strong>, the first coordinate is the
          horizontal distance from the origin and the second is the vertical
          distance (5.G.A.1). Because the two coordinates play different roles,{" "}
          <strong>(x, y)</strong>{" "}and <strong>(y, x)</strong>{" "}name the same point
          only when <strong>x = y</strong>{" "}— otherwise they are two distinct
          locations.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= 0}
          className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center text-xl font-black tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= N}
          className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
