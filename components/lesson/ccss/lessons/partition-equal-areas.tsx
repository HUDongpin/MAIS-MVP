"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const HL = "var(--band-upper)";
const REST = "color-mix(in oklab, var(--band-upper) 15%, var(--surface))";
const W = 320, H = 120;

export default function Lesson() {
  const [parts, setParts] = useState(4);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Split a shape into <strong>equal-area parts</strong>, and each part is a{" "}
        <strong>unit fraction</strong>{" "}of the whole. Cut a rectangle into {parts}{" "}
        equal pieces and each one is <strong>1/{parts}</strong>{" "}of its area.
      </p>

      <Figure caption="The dark piece is one equal part — exactly one unit fraction of the whole area.">
        <div className="flex flex-col items-center gap-6">
          <svg width={W + 2} height={H + 2} viewBox={`0 0 ${W + 2} ${H + 2}`} className="max-w-full" role="img" aria-label={`rectangle in ${parts} equal parts`}>
            <g transform="translate(1,1)">
              {Array.from({ length: parts }, (_, i) => (
                <rect key={i} x={(i * W) / parts} y={0} width={W / parts} height={H} fill={i === 0 ? HL : REST} stroke="var(--surface)" strokeWidth={2} />
              ))}
              <rect x={0} y={0} width={W} height={H} fill="none" stroke="var(--ink-soft)" strokeWidth={2} />
            </g>
          </svg>

          <div className="text-center">
            <div className="text-3xl font-black">
              each part = <span style={{ color: HL }}>1/{parts}</span> of the area
            </div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              All {parts} parts together are {parts}/{parts} = 1 whole.
            </p>
          </div>

          <Stepper label="Equal parts" value={parts} min={2} max={8} onChange={setParts} />
        </div>
      </Figure>

      <h2>Equal areas, unit fractions</h2>
      <p>
        The pieces do not have to look the same to be equal — they just have to
        cover the <em>same amount</em>{" "}of space. When a whole is cut into {parts}{" "}
        equal areas, one piece is <strong>1/{parts}</strong>{" "}of the whole.
      </p>

      <MathCheck>
        <p>
          Partitioning a shape into parts with <strong>equal areas</strong>{" "}and
          naming each part as a <strong>unit fraction</strong>{" "}of the whole is
          3.G.A.2. Splitting into {parts} equal parts makes each part{" "}
          <strong>1/{parts}</strong>{" "}of the total area — the bridge between
          geometry and fractions. The equal parts need not have the same shape,
          only the same area.
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
