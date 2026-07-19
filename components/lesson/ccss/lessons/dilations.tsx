"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 6, CELL = 22, PAD = 22;
const SIZE = 2 * R * CELL + 2 * PAD;
const ORIG = "var(--ink-soft)";
const IMG = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

type P = [number, number];
const SHAPE: P[] = [[1, 1], [3, 1], [2, 3]];

export default function Lesson() {
  const [k, setK] = useState(2); // scale ×0.5 steps -> use tenths
  const scale = k / 2; // k=1→0.5, 2→1, 3→1.5, 4→2

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;
  const dil = ([x, y]: P): P => [r2(x * scale), r2(y * scale)];
  const poly = (pts: P[]) => pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ");

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>dilation</strong>{" "}with center C and scale factor k pushes every
        point k times as far from C. It <strong>scales lengths by k</strong>{" "}but{" "}
        <strong>keeps angles unchanged</strong>{" "}— and maps every line to a parallel
        line (unless it passes through C).
      </p>

      <Figure caption="Dilating from the origin by k stretches the triangle; each side scales by k, angles stay equal.">
        <div className="flex flex-col items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 320 }} role="img" aria-label="dilation from the origin">
            {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
              </g>
            ))}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* rays from center */}
            {SHAPE.map(([x, y], i) => <line key={i} x1={sx(0)} y1={sy(0)} x2={sx(x * scale)} y2={sy(y * scale)} stroke="var(--ink-faint)" strokeWidth={1} strokeDasharray="3 3" />)}
            <polygon points={poly(SHAPE)} fill="none" stroke={ORIG} strokeWidth={2} strokeDasharray="4 3" />
            <polygon points={poly(SHAPE.map(dil))} fill={IMG} fillOpacity={0.3} stroke={IMG} strokeWidth={2.5} style={{ transition: "all 0.4s ease" }} />
            <circle cx={sx(0)} cy={sy(0)} r={4} fill="var(--ink)" />
          </svg>

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono" style={{ borderColor: IMG }}>
            scale factor k = <strong style={{ color: IMG }}>{scale}</strong>
            <span className="ml-2 text-xs text-[var(--ink-faint)]">lengths ×{scale}, angles unchanged</span>
          </div>

          <Stepper label="scale ×0.5" value={k} min={1} max={4} onChange={setK} display={scale} />
        </div>
      </Figure>

      <h2>Scale the size, keep the shape</h2>
      <p>
        Each vertex (x, y) becomes (kx, ky), so it sits on the ray from the center
        {" "}k times as far out. With k = {scale}, every side length multiplies by{" "}
        {scale} while every angle stays the same — the image is{" "}
        <strong>similar</strong>{" "}to the original. When |k| &gt; 1 it enlarges;
        0 &lt; |k| &lt; 1 shrinks.
      </p>

      <MathCheck>
        <p>
          A <strong>dilation</strong>{" "}with center C and factor k (G-SRT.1) sends a
          point P to the point on ray CP with CP&apos; = k·CP. It{" "}
          <strong>multiplies all lengths by k</strong>{" "}and takes a line not through
          the center to a <strong>parallel</strong>{" "}line, while{" "}
          <strong>preserving angles</strong>{" "}— which is exactly why dilations create
          similar figures.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange, display }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; display: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-10 text-center text-2xl font-black tabular-nums" style={{ color: IMG }}>{display}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
