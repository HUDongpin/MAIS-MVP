"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CELL = 30;
const TRI = "var(--band-middle)";
const RECT = "var(--band-upper)";

export default function Lesson() {
  const [b, setB] = useState(6);
  const [h, setH] = useState(4);
  const [apex, setApex] = useState(2); // apex x-position (0..b)

  const area = (b * h) / 2;
  const W = b * CELL, H = h * CELL;
  const ax = Math.min(apex, b);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A triangle has <strong>exactly half the area</strong>{" "}of a
        base-by-height parallelogram (or of a rectangle after rearranging a
        matching copy). That is why the area of a triangle is{" "}
        <strong>½ × base × height</strong>{" "}— no matter what shape the triangle is.
      </p>

      <Figure caption="The dashed rectangle is base × height. The triangle has exactly half its area.">
        <div className="flex flex-col items-center gap-6">
          <svg width={W + 40} height={H + 40} viewBox={`0 0 ${W + 40} ${H + 40}`} className="max-w-full" role="img" aria-label={`triangle base ${b} height ${h}`}>
            <g transform="translate(20,20)">
              {/* grid */}
              {Array.from({ length: h }, (_, r) => Array.from({ length: b }, (_, c) => (
                <rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill="none" stroke="var(--line)" strokeWidth={1} />
              )))}
              {/* bounding rectangle */}
              <rect x={0} y={0} width={W} height={H} fill="none" stroke={RECT} strokeWidth={2.5} strokeDasharray="6 4" />
              {/* triangle */}
              <polygon points={`0,${H} ${W},${H} ${ax * CELL},0`} fill={TRI} fillOpacity={0.7} stroke="var(--ink)" strokeWidth={2} />
              {/* height line */}
              <line x1={ax * CELL} y1={0} x2={ax * CELL} y2={H} stroke="var(--ink)" strokeWidth={1} strokeDasharray="3 3" />
              <text x={W / 2} y={H + 16} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-mono)">base = {b}</text>
              {/* Flip the height label inside the triangle at the right-hand end
                  of the apex slider, where it used to be clipped by the viewBox
                  exactly when the triangle became a right triangle. */}
              <text x={ax === b ? ax * CELL - 6 : ax * CELL + 6} y={H / 2} textAnchor={ax === b ? "end" : "start"} fontSize={13} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-mono)">h = {h}</text>
            </g>
          </svg>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">Area = ½ × {b} × {h} = <span style={{ color: TRI }}>{area}</span> sq units</div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">the rectangle is {b} × {h} = {b * h}, and the triangle is half</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Base" value={b} min={2} max={8} onChange={(v) => { setB(v); setApex((p) => Math.min(p, v)); }} />
            <Stepper label="Height" value={h} min={2} max={6} onChange={setH} />
            <Stepper label="Top corner position" value={apex} min={0} max={b} onChange={setApex} />
          </div>
        </div>
      </Figure>

      <h2>Half of a rectangle</h2>
      <p>
        Slide the top corner: the triangle changes shape, but its area stays {area} —
        because base and height never change. Any polygon can be found this way,
        by <strong>decomposing</strong>{" "}it into triangles and rectangles.
      </p>

      <MathCheck>
        <p>
          The area of a triangle is <strong>½ × base × perpendicular height</strong>{" "}because it has half the area of a base-by-height parallelogram
          (or a rearranged matching rectangle) (6.G.A.1). More complex
          polygons are found by <strong>composing and decomposing</strong>{" "}them
          into triangles and rectangles and adding the areas. Here ½ × {b} × {h} = {area}.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
