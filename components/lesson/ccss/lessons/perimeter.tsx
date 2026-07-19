"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CELL = 34;
const EDGE = "var(--band-upper)";
const FILL = "color-mix(in oklab, var(--band-upper) 14%, var(--surface))";

export default function Lesson() {
  const [w, setW] = useState(6);
  const [h, setH] = useState(3);
  const perimeter = 2 * (w + h);
  const area = w * h;
  const W = w * CELL, H = h * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <strong>Perimeter</strong>{" "}is the distance <em>around</em>{" "}a shape — add
        up all the sides. Area is the space inside; perimeter is the fence around
        it. They are different measurements.
      </p>

      <Figure caption="The thick border is the perimeter. Add all four sides.">
        <div className="flex flex-col items-center gap-6">
          <svg width={W + 60} height={H + 60} viewBox={`0 0 ${W + 60} ${H + 60}`} className="max-w-full" role="img" aria-label={`rectangle ${w} by ${h}, perimeter ${perimeter}`}>
            <g transform="translate(30,30)">
              <rect x={0} y={0} width={W} height={H} fill={FILL} stroke={EDGE} strokeWidth={5} />
              <text x={W / 2} y={-10} textAnchor="middle" fontSize={14} fontWeight={800} fill={EDGE} fontFamily="var(--font-mono)">{w}</text>
              <text x={W / 2} y={H + 22} textAnchor="middle" fontSize={14} fontWeight={800} fill={EDGE} fontFamily="var(--font-mono)">{w}</text>
              <text x={-14} y={H / 2 + 4} textAnchor="middle" fontSize={14} fontWeight={800} fill={EDGE} fontFamily="var(--font-mono)">{h}</text>
              <text x={W + 16} y={H / 2 + 4} textAnchor="middle" fontSize={14} fontWeight={800} fill={EDGE} fontFamily="var(--font-mono)">{h}</text>
            </g>
          </svg>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">
              Perimeter = {w} + {h} + {w} + {h} = <span style={{ color: EDGE }}>{perimeter}</span> units
            </div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">= 2 × ({w} + {h}) = {perimeter} · (area inside = {area} sq units)</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Width" value={w} min={1} max={8} onChange={setW} />
            <Stepper label="Height" value={h} min={1} max={6} onChange={setH} />
          </div>
        </div>
      </Figure>

      <h2>Around versus inside</h2>
      <p>
        This rectangle has perimeter {perimeter} but area {area} — two different
        numbers measuring two different things. Two shapes can even share a
        perimeter yet have different areas.
      </p>

      <MathCheck>
        <p>
          The <strong>perimeter</strong>{" "}of a polygon is the sum of its side
          lengths (3.MD.D.8). For a rectangle that is{" "}
          <strong>2 × (width + height)</strong>{" "}= 2 × ({w} + {h}) = {perimeter}.
          Perimeter (distance around) and area (space covered) are distinct — you
          can change one while keeping the other the same.
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
