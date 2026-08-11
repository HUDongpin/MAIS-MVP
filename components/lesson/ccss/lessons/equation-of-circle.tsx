"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const R = 7, CELL = 24, PAD = 22;
const SIZE = 2 * R * CELL + 2 * PAD;

export default function Lesson() {
  const [h, setH] = useState(1);
  const [k, setK] = useState(-1);
  const [rad, setRad] = useState(3);

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A circle is all points a fixed distance r from a center (h, k). Applying the
        distance formula to that condition gives the equation of a circle:{" "}
        <strong>(x − h)² + (y − k)² = r²</strong>. Every point on the circle
        satisfies it; no other point does.
      </p>

      <Figure caption="The equation just says 'distance from (h, k) equals r' — the Pythagorean distance formula.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-6 py-2 font-mono text-2xl font-black" style={{ color: ACCENT }}>
            (x − {h})² + (y − {k < 0 ? `(${k})` : k})² = {rad}²
          </div>

          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 320 }} role="img" aria-label="circle on a grid">
            {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
              </g>
            ))}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            <circle cx={sx(h)} cy={sy(k)} r={rad * CELL} fill={ACCENT} fillOpacity={0.12} stroke={ACCENT} strokeWidth={2.5} />
            <circle cx={sx(h)} cy={sy(k)} r={4} fill={ACCENT} />
            <text x={sx(h) + 6} y={sy(k) - 6} fontSize={11} fontWeight={800} fill={ACCENT}>({h}, {k})</text>
          </svg>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="center h" value={h} min={-3} max={3} onChange={setH} />
            <Stepper label="center k" value={k} min={-3} max={3} onChange={setK} />
            <Stepper label="radius r" value={rad} min={1} max={4} onChange={setRad} />
          </div>
        </div>
      </Figure>

      <h2>From distance to equation</h2>
      <p>
        A point (x, y) is on the circle exactly when its distance to ({h}, {k}) is{" "}
        {rad}. Squaring the distance formula √((x−h)² + (y−k)²) = r removes the root:
        {" "}(x − {h})² + (y − {k})² = {rad * rad}. If a circle&apos;s equation is
        given expanded, <strong>completing the square</strong>{" "}recovers the center
        and radius.
      </p>

      <MathCheck>
        <p>
          The <strong>equation of a circle</strong>{" "}(x − h)² + (y − k)² = r² is
          derived from the <strong>distance formula</strong>{" "}(itself the Pythagorean
          theorem), stating that every point is distance r from the center (h, k)
          (G-GPE.1). Completing the square converts a general expanded form back to
          center-radius form.
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
