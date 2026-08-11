"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { clipLinearFunctionToSquare } from "@/lib/mathDiagramGeometry";

const ACCENT = "var(--band-high)";
const R = 6, CELL = 22, PAD = 22;
const SIZE = 2 * R * CELL + 2 * PAD;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [m, setM] = useState(2); // slope of first line

  // perpendicular slope is -1/m; parallel is same m
  const perpSlope = r2(-1 / m);
  const product = r2(m * perpSlope);
  const primaryLine = clipLinearFunctionToSquare(m, 0, R)!;
  const perpendicularLine = clipLinearFunctionToSquare(perpSlope, 0, R)!;

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Coordinates turn geometry into algebra. Placing a figure on a grid, you can{" "}
        <strong>prove</strong>{" "}theorems with slope and distance — for example, that
        two lines are <strong>perpendicular exactly when their slopes multiply to
        −1</strong>, and parallel when their slopes are equal.
      </p>

      <Figure caption="Perpendicular lines have slopes that multiply to −1; parallel lines share a slope.">
        <div className="flex flex-col items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto max-w-full" style={{ maxHeight: 310 }} role="img" aria-label="perpendicular slopes">
            {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
              </g>
            ))}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* line 1 slope m through origin */}
            <line x1={sx(primaryLine[0].x)} y1={sy(primaryLine[0].y)} x2={sx(primaryLine[1].x)} y2={sy(primaryLine[1].y)} stroke={ACCENT} strokeWidth={2.5} />
            {/* perpendicular slope -1/m */}
            <line x1={sx(perpendicularLine[0].x)} y1={sy(perpendicularLine[0].y)} x2={sx(perpendicularLine[1].x)} y2={sy(perpendicularLine[1].y)} stroke="var(--band-upper)" strokeWidth={2.5} />
            <rect x={sx(0) - 6} y={sy(0) - 6} width={12} height={12} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
          </svg>

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono" style={{ borderColor: ACCENT }}>
            slopes {m} and {perpSlope}: product = {m} × {perpSlope} = <strong style={{ color: ACCENT }}>{product}</strong>
            <span className="ml-2 text-xs text-[var(--ink-faint)]">= −1 ⟹ perpendicular</span>
          </div>

          <Stepper label="slope m" value={m} min={1} max={4} onChange={setM} />
        </div>
      </Figure>

      <h2>Algebra proves geometry</h2>
      <p>
        A line of slope {m} and one of slope {perpSlope} meet at a right angle
        because {m} × {perpSlope} = −1. Using this, you can prove a quadrilateral is a
        rectangle (opposite sides parallel, adjacent sides perpendicular), or find a
        triangle&apos;s type — all by computing slopes and distances between labeled
        coordinate points.
      </p>

      <MathCheck>
        <p>
          <strong>Coordinate proofs</strong>{" "}(G-GPE.4) establish geometric facts
          algebraically — e.g. showing a figure is a parallelogram or that a point
          lies on a circle. The <strong>slope criteria</strong>{" "}(G-GPE.5): parallel
          lines have <strong>equal slopes</strong>; perpendicular lines have slopes
          whose <strong>product is −1</strong>{" "}(negative reciprocals).
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
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
