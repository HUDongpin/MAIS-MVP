"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CELL = 34;
const FILL = "var(--band-upper)";

export default function Lesson() {
  const [w, setW] = useState(5);
  const [h, setH] = useState(4);
  const [lshape, setLshape] = useState(false);

  // Remove a bounded corner block so at least one top-row cell and two bottom rows remain.
  const cutW = lshape ? Math.max(1, w - 3) : 0;
  const cutH = lshape ? Math.max(1, h - 2) : 0;
  const filledCell = (r: number, c: number) => !(lshape && r < cutH && c >= w - cutW);
  let area = 0;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (filledCell(r, c)) area++;

  const W = w * CELL, H = h * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <strong>Area</strong>{" "}is how much flat space a shape covers. We measure it
        by <strong>counting unit squares</strong>{" "}— squares that are 1 unit on
        each side — with no gaps and no overlaps.
      </p>

      <Figure caption="Every square is 1 square unit. Count them all to find the area.">
        <div className="flex flex-col items-center gap-6">
          <button type="button" onClick={() => setLshape((l) => !l)} className="rounded-lg border-2 px-4 py-1.5 text-sm font-bold" style={{ borderColor: FILL, color: FILL }}>
            {lshape ? "Show a rectangle" : "Show an L-shape"}
          </button>

          <svg width={W + 2} height={H + 2} viewBox={`0 0 ${W + 2} ${H + 2}`} className="max-w-full" role="img" aria-label={`shape with area ${area}`}>
            <g transform="translate(1,1)">
              {Array.from({ length: h }, (_, r) =>
                Array.from({ length: w }, (_, c) =>
                  filledCell(r, c) ? (
                    <rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={FILL} fillOpacity={0.8} stroke="var(--surface)" strokeWidth={2} />
                  ) : null,
                ),
              )}
            </g>
          </svg>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">Area = <span style={{ color: FILL }}>{area}</span> square units</div>
            {!lshape && <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">{h} rows × {w} columns = {area}</div>}
            {lshape && <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">counted one square at a time</div>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Width" value={w} min={2} max={7} onChange={setW} />
            <Stepper label="Height" value={h} min={2} max={5} onChange={setH} />
          </div>
        </div>
      </Figure>

      <h2>Squares that cover</h2>
      <p>
        The unit squares must fit exactly — touching, with no gaps or overlaps.
        The number of squares <em>is</em>{" "}the area. Even a bumpy L-shape has an
        area you can find just by counting.
      </p>

      <MathCheck>
        <p>
          Area is an attribute of flat shapes, measured in <strong>unit squares</strong>{" "}
          — a square with side 1 has area &ldquo;one square unit&rdquo; (3.MD.C.5).
          When a shape is covered exactly by whole unit squares, you can find its
          area by <strong>counting</strong>{" "}those squares with no gaps or overlaps
          (3.MD.C.6); here that
          count is {area}.
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
