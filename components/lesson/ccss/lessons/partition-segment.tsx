"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const R = 6, CELL = 22, PAD = 22;
const SIZE = 2 * R * CELL + 2 * PAD;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [A] = useState({ x: -4, y: -3 });
  const [B] = useState({ x: 4, y: 3 });
  const [ratio, setRatio] = useState(1); // ratio index → t = ratio/4

  const t = ratio / 4; // fraction from A to B
  const px = r2(A.x + t * (B.x - A.x));
  const py = r2(A.y + t * (B.y - A.y));

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To find the point that divides a segment in a given ratio, just take that{" "}
        <strong>fraction of the way</strong>{" "}from one end to the other. The point
        that partitions AB in ratio t:(1−t) is{" "}
        <strong>A + t·(B − A)</strong>{" "}— a weighted average of the endpoints.
      </p>

      <Figure caption="The partition point moves the fraction t of the way from A toward B.">
        <div className="flex flex-col items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 310 }} role="img" aria-label="partitioning a segment">
            {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
              </g>
            ))}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(A.x)} y1={sy(A.y)} x2={sx(B.x)} y2={sy(B.y)} stroke={ACCENT} strokeWidth={2.5} />
            <circle cx={sx(A.x)} cy={sy(A.y)} r={4} fill="var(--ink)" /><text x={sx(A.x) - 14} y={sy(A.y) + 4} fontSize={12}>A</text>
            <circle cx={sx(B.x)} cy={sy(B.y)} r={4} fill="var(--ink)" /><text x={sx(B.x) + 6} y={sy(B.y) + 4} fontSize={12}>B</text>
            <circle cx={sx(px)} cy={sy(py)} r={6} fill="var(--band-upper)" stroke="white" strokeWidth={2} />
            <text x={sx(px) + 8} y={sy(py) - 8} fontSize={11} fontWeight={800} fill="var(--band-upper)" fontFamily="var(--font-mono)">({px}, {py})</text>
          </svg>

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono text-sm" style={{ borderColor: ACCENT }}>
            P = A + {r2(t)}·(B − A) = <strong style={{ color: "var(--band-upper)" }}>({px}, {py})</strong>
            <span className="ml-2 text-xs text-[var(--ink-faint)]">ratio {ratio}:{4 - ratio}</span>
          </div>

          <Stepper label="fraction (×¼)" value={ratio} min={0} max={4} onChange={setRatio} display={r2(t)} />
        </div>
      </Figure>

      <h2>A weighted average of endpoints</h2>
      <p>
        Moving t of the way from A to B changes each coordinate by t times the total
        change: x = A.x + t(B.x − A.x). With t = {r2(t)} that gives ({px}, {py}). At
        t = ½ this is the midpoint; at t = ⅓ it divides AB in ratio 1:2. The same
        weighting works in any dimension.
      </p>

      <MathCheck>
        <p>
          To <strong>partition a directed segment</strong>{" "}AB in a given ratio
          (G-GPE.6), the dividing point is P = A + t·(B − A), where t is the fraction
          of the way from A to B. Equivalently P = ((1−t)·A + t·B) — a weighted
          average of the endpoints. The midpoint is the case t = ½.
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
        <span className="w-10 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{display}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
