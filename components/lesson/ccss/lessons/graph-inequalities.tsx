"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const XR = 5, PXX = 30, PAD = 26;
const SIZE = 2 * XR * PXX + 2 * PAD;

export default function Lesson() {
  const [m, setM] = useState(1);
  const [b, setB] = useState(1);
  const [above, setAbove] = useState(true); // y ≥ or y ≤

  const sx = (x: number) => PAD + (x + XR) * PXX;
  const sy = (y: number) => SIZE - PAD - (y + XR) * PXX;
  const yAt = (x: number) => m * x + b;

  // shaded polygon: region above or below the line, within box
  const yL = Math.max(-XR, Math.min(XR, yAt(-XR)));
  const yR = Math.max(-XR, Math.min(XR, yAt(XR)));
  const topEdge = above ? XR : -XR;
  const shade = `${sx(-XR)},${sy(yAt(-XR))} ${sx(XR)},${sy(yAt(XR))} ${sx(XR)},${sy(topEdge)} ${sx(-XR)},${sy(topEdge)}`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The solutions of a linear <strong>inequality</strong>{" "}fill a whole{" "}
        <strong>half-plane</strong>. Graph the boundary line, then shade the side
        where the inequality holds — dashed if strict (&lt;, &gt;), solid if it
        includes equality (≤, ≥).
      </p>

      <Figure caption="Shade the half-plane of solutions. Overlapping shaded regions solve a system of inequalities.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 font-mono text-lg font-black">
            <span>y {above ? "≥" : "≤"} {m}x + {b}</span>
            <button type="button" onClick={() => setAbove((v) => !v)} className="rounded-lg border border-[var(--line)] px-3 py-1 text-sm">flip ≥ / ≤</button>
          </div>

          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 320 }} role="img" aria-label="linear inequality half-plane">
            {Array.from({ length: 2 * XR + 1 }, (_, i) => i - XR).map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(v)} y1={sy(-XR)} x2={sx(v)} y2={sy(XR)} />
                <line x1={sx(-XR)} y1={sy(v)} x2={sx(XR)} y2={sy(v)} />
              </g>
            ))}
            <polygon points={shade} fill={ACCENT} fillOpacity={0.25} />
            <line x1={sx(-XR)} y1={sy(0)} x2={sx(XR)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-XR)} x2={sx(0)} y2={sy(XR)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(-XR)} y1={sy(yL)} x2={sx(XR)} y2={sy(yR)} stroke={ACCENT} strokeWidth={3} />
          </svg>

          <p className="m-0 max-w-md text-center text-sm text-[var(--ink-soft)]">
            Test the origin (0, 0): is 0 {above ? "≥" : "≤"} {b}? {(above ? 0 >= b : 0 <= b) ? "Yes — (0,0) is in the shaded region." : "No — (0,0) lies in the unshaded region."}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="slope m" value={m} min={-3} max={3} onChange={setM} />
            <Stepper label="intercept b" value={b} min={-4} max={4} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Test a point to pick the side</h2>
      <p>
        The boundary splits the plane in two. Plug in an easy point like the origin:
        if it satisfies the inequality, shade its side; otherwise shade the other.
        For a <strong>system</strong>{" "}of inequalities, the solution is the region
        where <em>all</em>{" "}the shadings overlap — the feasible region of a
        modeling problem.
      </p>

      <MathCheck>
        <p>
          The solution set of a linear inequality is a <strong>half-plane</strong>{" "}
          bounded by the line (dashed for strict, solid for ≤/≥), and a{" "}
          <strong>system</strong>{" "}of inequalities is solved by the{" "}
          <strong>intersection</strong>{" "}of the half-planes (A-REI.12) — the basis
          of linear-programming feasible regions.
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
