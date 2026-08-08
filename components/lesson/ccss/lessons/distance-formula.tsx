"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const N = 10;
const CELL = 30;
const PAD = 30;
const SIZE = N * CELL + 2 * PAD;
const LEG = "var(--band-middle)";
const DIST = "var(--band-upper)";

export default function Lesson() {
  const [p1, setP1] = useState({ x: 2, y: 2 });
  const [p2, setP2] = useState({ x: 8, y: 6 });

  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const perfect = Number.isInteger(dist);

  const sx = (x: number) => PAD + x * CELL;
  const sy = (y: number) => SIZE - PAD - y * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        How far apart are two points? Draw the <strong>horizontal</strong>{" "}and{" "}
        <strong>vertical</strong>{" "}gaps between them — they are the legs of a right
        triangle, and the straight-line distance is the <strong>hypotenuse</strong>.
        It&apos;s the Pythagorean theorem on a grid.
      </p>

      <Figure caption="The dashed legs are the coordinate differences; the solid line is the distance.">
        <div className="flex flex-col items-center gap-6">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="max-w-full"
            style={{ maxHeight: 340 }}
            role="img"
            aria-label={
              dx === 0 && dy === 0
                ? `Both points at (${p1.x}, ${p1.y}), so the distance is 0`
                : `Points (${p1.x}, ${p1.y}) and (${p2.x}, ${p2.y}) joined by a line of length ${perfect ? dist : `about ${dist.toFixed(2)}`}, with a horizontal leg of ${dx} and a vertical leg of ${dy}`
            }
          >
            {Array.from({ length: N + 1 }, (_, i) => (
              <g key={i} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} />
                <line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} />
              </g>
            ))}
            <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* legs */}
            <line x1={sx(p1.x)} y1={sy(p1.y)} x2={sx(p2.x)} y2={sy(p1.y)} stroke={LEG} strokeWidth={2.5} strokeDasharray="5 4" />
            <line x1={sx(p2.x)} y1={sy(p1.y)} x2={sx(p2.x)} y2={sy(p2.y)} stroke={LEG} strokeWidth={2.5} strokeDasharray="5 4" />
            <text x={(sx(p1.x) + sx(p2.x)) / 2} y={sy(p1.y) + 16} textAnchor="middle" fontSize={11} fontWeight={800} fill={LEG}>{dx}</text>
            <text x={sx(p2.x) + 10} y={(sy(p1.y) + sy(p2.y)) / 2} fontSize={11} fontWeight={800} fill={LEG}>{dy}</text>
            {/* distance */}
            <line x1={sx(p1.x)} y1={sy(p1.y)} x2={sx(p2.x)} y2={sy(p2.y)} stroke={DIST} strokeWidth={3} />
            {[p1, p2].map((p, i) => (
              <g key={i}>
                <circle cx={sx(p.x)} cy={sy(p.y)} r={6} fill={DIST} stroke="white" strokeWidth={2} />
                <text x={sx(p.x)} y={sy(p.y) - 12} textAnchor="middle" fontSize={11} fontWeight={800} fill={DIST} fontFamily="var(--font-mono)">({p.x},{p.y})</text>
              </g>
            ))}
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: DIST }}>
            <div className="font-mono text-[15px]">d = √({dx}² + {dy}²) = √{dx * dx + dy * dy}</div>
            {/* "≈" for the irrational case, not "= 7.21…": the ellipsis promised
                the printed digits continue, but toFixed rounds, so for 41 of the
                121 reachable point pairs they were not a prefix of the expansion. */}
            <div className="mt-1 font-mono text-2xl font-black" style={{ color: DIST }}>{perfect ? `= ${dist}` : `≈ ${dist.toFixed(2)}`}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Stepper label="x₁" value={p1.x} onChange={(v) => setP1({ ...p1, x: v })} />
            <Stepper label="y₁" value={p1.y} onChange={(v) => setP1({ ...p1, y: v })} />
            <Stepper label="x₂" value={p2.x} onChange={(v) => setP2({ ...p2, x: v })} />
            <Stepper label="y₂" value={p2.y} onChange={(v) => setP2({ ...p2, y: v })} />
          </div>
        </div>
      </Figure>

      <h2>Pythagoras on a grid</h2>
      <p>
        The horizontal gap is {dx} and the vertical gap is {dy}, so the distance is
        √({dx}² + {dy}²) = √{dx * dx + dy * dy} {perfect ? `= ${dist}` : `≈ ${dist.toFixed(2)}`}.
        It works for any two points — just subtract the coordinates.
      </p>

      <MathCheck>
        <p>
          The distance between two points is found with the{" "}
          <strong>Pythagorean theorem</strong>{" "}(8.G.B.8): the horizontal and
          vertical differences (|x₂ − x₁| and |y₂ − y₁|) are the legs, so the
          distance is <strong>√((x₂ − x₁)² + (y₂ − y₁)²)</strong>{" "}— here √({dx}² + {dy}²) {perfect ? `= ${dist}` : `≈ ${dist.toFixed(2)}`}.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(N, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 0} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-6 text-center text-xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= N} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
