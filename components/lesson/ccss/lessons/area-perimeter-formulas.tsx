"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CELL = 30;
const AREAC = "var(--band-upper)";
const PERIC = "var(--band-middle)";

export default function Lesson() {
  const [l, setL] = useState(7);
  const [w, setW] = useState(4);
  const area = l * w;
  const perimeter = 2 * (l + w);
  const W = l * CELL, H = w * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        For a rectangle, two <strong>formulas</strong>{" "}do the work:{" "}
        <strong>Area = length × width</strong>{" "}and <strong>Perimeter = 2 × (length
        + width)</strong>. Know two things and you can find the rest.
      </p>

      <Figure caption="Green fills the area (l × w); blue traces the perimeter (all four sides).">
        <div className="flex flex-col items-center gap-6">
          <svg width={W + 70} height={H + 50} viewBox={`0 0 ${W + 70} ${H + 50}`} className="max-w-full" role="img" aria-label={`rectangle ${l} by ${w}`}>
            <g transform="translate(35,25)">
              <rect x={0} y={0} width={W} height={H} fill="color-mix(in oklab, var(--band-upper) 16%, var(--surface))" stroke={PERIC} strokeWidth={4} />
              {Array.from({ length: w }, (_, r) => Array.from({ length: l }, (_, c) => (
                <rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill="none" stroke="var(--line)" strokeWidth={1} />
              )))}
              <text x={W / 2} y={-9} textAnchor="middle" fontSize={13} fontWeight={800} fill={PERIC} fontFamily="var(--font-mono)">l = {l}</text>
              <text x={-11} y={H / 2 + 4} textAnchor="middle" fontSize={13} fontWeight={800} fill={PERIC} fontFamily="var(--font-mono)">w = {w}</text>
            </g>
          </svg>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border-2 px-5 py-3 text-center" style={{ borderColor: AREAC }}>
              <div className="text-xs font-bold uppercase" style={{ color: AREAC }}>Area</div>
              <div className="font-mono text-lg font-black">{l} × {w} = {area}</div>
              <div className="text-xs text-[var(--ink-faint)]">square units</div>
            </div>
            <div className="rounded-xl border-2 px-5 py-3 text-center" style={{ borderColor: PERIC }}>
              <div className="text-xs font-bold uppercase" style={{ color: PERIC }}>Perimeter</div>
              <div className="font-mono text-lg font-black">2 × ({l} + {w}) = {perimeter}</div>
              <div className="text-xs text-[var(--ink-faint)]">units</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Length" value={l} min={1} max={10} onChange={setL} />
            <Stepper label="Width" value={w} min={1} max={7} onChange={setW} />
          </div>
        </div>
      </Figure>

      <h2>Working backwards</h2>
      <p>
        The formulas run both ways. If you knew this rectangle&apos;s area ({area})
        and its width ({w}), you could find the length by dividing:{" "}
        <strong>{area} ÷ {w} = {l}</strong>. That is how you find a missing side.
      </p>

      <MathCheck>
        <p>
          Applying the rectangle formulas <strong>A = l × w</strong>{" "}and{" "}
          <strong>P = 2(l + w)</strong>{" "}to solve real problems is 4.MD.A.3. Here A = {area} and P = {perimeter}. Because the formulas are equations, you can
          also solve for an <strong>unknown side</strong>: given the area and one
          side, divide ({area} ÷ {w} = {l}).
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
