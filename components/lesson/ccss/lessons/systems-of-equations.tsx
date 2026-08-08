"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const N = 10;
const CELL = 30;
const PAD = 30;
const SIZE = N * CELL + 2 * PAD;
const L1 = "var(--band-middle)";
const L2 = "var(--band-upper)";

const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [m1, setM1] = useState(1);
  const [b1, setB1] = useState(1);
  const [m2, setM2] = useState(-1);
  const [b2, setB2] = useState(9);

  const sx = (x: number) => PAD + x * CELL;
  const sy = (y: number) => SIZE - PAD - y * CELL;
  const parallel = m1 === m2;
  // Round each coordinate from the exact intersection. Feeding the already
  // rounded ix back through the line gave (0.33, 0.66) for the true (1/3, 2/3),
  // so "plug it into either equation and it checks out" failed for the second.
  const ixExact = parallel ? 0 : (b2 - b1) / (m1 - m2);
  const ix = r2(ixExact);
  const iy = r2(m1 * ixExact + b1);
  const inRange = !parallel && ix >= 0 && ix <= N && iy >= 0 && iy <= N;

  const linePts = (m: number, b: number) => {
    // draw across the visible box
    const pts: string[] = [];
    for (let x = 0; x <= N; x += 0.5) {
      const y = m * x + b;
      if (y >= -1 && y <= N + 1) pts.push(`${sx(x)},${sy(y)}`);
    }
    return pts.join(" ");
  };

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>system</strong>{" "}is two equations at once. Its solution is the{" "}
        <strong>point where the lines cross</strong>{" "}— the (x, y) that satisfies{" "}
        <em>both</em>. Parallel lines never cross, so some systems have no solution.
      </p>

      <Figure caption="Graph both lines. Where they intersect is the one point that solves both equations.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6 font-mono text-lg font-black">
            <span style={{ color: L1 }}>y = {m1}x + {b1}</span>
            <span style={{ color: L2 }}>y = {m2}x + {b2}</span>
          </div>

          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 340 }} role="img" aria-label={parallel ? (b1 === b2 ? "two identical lines, every point shared" : "two parallel lines, no intersection") : inRange ? `two lines meeting at (${ix}, ${iy})` : "two lines whose intersection falls outside this grid"}>
            {Array.from({ length: N + 1 }, (_, i) => (
              <g key={i} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} />
                <line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} />
              </g>
            ))}
            <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={2} />
            <polyline points={linePts(m1, b1)} fill="none" stroke={L1} strokeWidth={3} />
            <polyline points={linePts(m2, b2)} fill="none" stroke={L2} strokeWidth={3} />
            {inRange && (
              <g>
                <circle cx={sx(ix)} cy={sy(iy)} r={7} fill="var(--ink)" stroke="white" strokeWidth={2.5} />
                <text x={sx(ix)} y={sy(iy) - 12} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-mono)">({ix}, {iy})</text>
              </g>
            )}
          </svg>

          <div className="rounded-xl px-5 py-2 text-center text-lg font-black" style={{ color: parallel ? "var(--band-early)" : "var(--band-upper)" }}>
            {/* The grid only covers 0..10; outside it the dot is suppressed but
                the panel still announced a solution with nothing to point at. */}
            {parallel ? (b1 === b2 ? "Same line — infinitely many solutions" : "Parallel lines — no solution") : `Solution: (${ix}, ${iy})${inRange ? "" : " — off this grid"}`}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Stepper label="m₁" value={m1} min={-3} max={3} onChange={setM1} />
            <Stepper label="b₁" value={b1} min={0} max={9} onChange={setB1} />
            <Stepper label="m₂" value={m2} min={-3} max={3} onChange={setM2} />
            <Stepper label="b₂" value={b2} min={0} max={9} onChange={setB2} />
          </div>
        </div>
      </Figure>

      <h2>The crossing point solves both</h2>
      <p>
        {parallel
          ? "Equal slopes make parallel lines — they share no point, so there is no solution (unless they are the very same line)."
          : `The lines meet at (${ix}, ${iy}). Plug it into either equation and it checks out — that single point satisfies both.`}
      </p>

      <MathCheck>
        <p>
          A system of two linear equations (8.EE.C.8) is solved by the point where
          their graphs <strong>intersect</strong>, since that (x, y) makes both
          true. <strong>One</strong>{" "}intersection = one solution;{" "}
          <strong>parallel</strong>{" "}lines = no solution; the <strong>same</strong>{" "}
          line = infinitely many. Systems can also be solved algebraically by
          substitution or elimination.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-lg font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
