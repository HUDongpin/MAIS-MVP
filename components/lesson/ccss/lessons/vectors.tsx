"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 5;
const CELL = 30;
const PAD = 24;
const SIZE = 2 * R * CELL + 2 * PAD;
const VEC = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [p1, setP1] = useState({ x: -3, y: -2 });
  const [p2, setP2] = useState({ x: 2, y: 3 });

  const cx = p2.x - p1.x, cy = p2.y - p1.y;
  const exactMag = Math.sqrt(cx * cx + cy * cy);
  const mag = r2(exactMag);
  const isZeroVector = cx === 0 && cy === 0;
  const exactDir = isZeroVector ? null : (Math.atan2(cy, cx) * 180) / Math.PI;
  const dir = exactDir === null ? null : r2(exactDir);
  const magSymbol = Number.isInteger(exactMag) ? "=" : "≈";
  const dirSymbol = exactDir !== null && Number.isInteger(exactDir) ? "=" : "≈";

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>vector</strong>{" "}has both <strong>magnitude</strong>{" "}(length)
        and <strong>direction</strong>{" "}— think velocity or force, not just a
        number. Drawn as an arrow from one point to another, its{" "}
        <strong>components</strong>{" "}are just the changes in x and y.
      </p>

      <Figure caption={isZeroVector
        ? "The zero vector is a point, not an arrow; its magnitude is 0 and its direction is undefined."
        : "An arrow from the tail to the tip. Components are Δx and Δy; magnitude is the length."}>
        <div className="flex flex-col items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 340 }} role="img" aria-label={`Vector from (${p1.x}, ${p1.y}) to (${p2.x}, ${p2.y}); components ${cx}, ${cy}; magnitude ${magSymbol === "=" ? "equals" : "is approximately"} ${mag}${magSymbol === "≈" ? " to the nearest hundredth" : ""}; direction ${dir === null ? "is undefined for the zero vector" : `${dirSymbol === "=" ? "equals" : "is approximately"} ${dir} degrees${dirSymbol === "≈" ? " to the nearest hundredth of a degree" : ""}`}.`}>
            {Array.from({ length: 2 * R + 1 }, (_, i) => {
              const v = i - R;
              return (
                <g key={v} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                  <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
                </g>
              );
            })}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            {!isZeroVector ? (
              <>
                {/* component legs */}
                <line x1={sx(p1.x)} y1={sy(p1.y)} x2={sx(p2.x)} y2={sy(p1.y)} stroke={VEC} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
                <line x1={sx(p2.x)} y1={sy(p1.y)} x2={sx(p2.x)} y2={sy(p2.y)} stroke={VEC} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
                <text x={(sx(p1.x) + sx(p2.x)) / 2} y={sy(p1.y) + 14} textAnchor="middle" fontSize={11} fontWeight={800} fill={VEC}>Δx={cx}</text>
                <text x={sx(p2.x) + 6} y={(sy(p1.y) + sy(p2.y)) / 2} fontSize={11} fontWeight={800} fill={VEC}>Δy={cy}</text>
                {/* vector arrow */}
                <defs>
                  <marker id="vArrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill={VEC} />
                  </marker>
                </defs>
                <line x1={sx(p1.x)} y1={sy(p1.y)} x2={sx(p2.x)} y2={sy(p2.y)} stroke={VEC} strokeWidth={3.5} markerEnd="url(#vArrow)" />
                <circle cx={sx(p1.x)} cy={sy(p1.y)} r={4} fill="var(--ink)" />
              </>
            ) : (
              <>
                <circle cx={sx(p1.x)} cy={sy(p1.y)} r={6} fill={VEC} />
                <text x={sx(p1.x) + 9} y={sy(p1.y) - 9} fontSize={11} fontWeight={800} fill={VEC}>zero vector</text>
              </>
            )}
          </svg>

          <div className="grid w-full max-w-md grid-cols-3 gap-2 font-mono text-center text-sm">
            <Info label="components" value={`⟨${cx}, ${cy}⟩`} />
            <Info label="magnitude" value={`${magSymbol} ${mag}`} />
            <Info label="direction" value={dir === null ? "undefined" : `${dirSymbol} ${dir}°`} />
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
            <Stepper label="tail x" value={p1.x} onChange={(v) => setP1({ ...p1, x: v })} />
            <Stepper label="tail y" value={p1.y} onChange={(v) => setP1({ ...p1, y: v })} />
            <Stepper label="tip x" value={p2.x} onChange={(v) => setP2({ ...p2, x: v })} />
            <Stepper label="tip y" value={p2.y} onChange={(v) => setP2({ ...p2, y: v })} />
          </div>
        </div>
      </Figure>

      <h2>Components, length, and angle</h2>
      <p>
        From tail (x₁, y₁) to tip (x₂, y₂), the components are ⟨x₂ − x₁, y₂ − y₁⟩
        = ⟨{cx}, {cy}⟩. The magnitude √(Δx² + Δy²) {magSymbol} {mag} is the
        Pythagorean length. {dir === null
          ? "This is the zero vector, so it has no defined direction angle."
          : `Its direction angle ${dirSymbol} ${dir}° (to the nearest hundredth of a degree).`} Translating a
        nonzero arrow without changing its components gives the same vector.
      </p>

      <MathCheck>
        <p>
          A <strong>vector</strong>{" "}is a quantity with magnitude and direction,
          often written ⟨Δx, Δy⟩ (N-VM.1). Its <strong>components</strong>{" "}between
          two points are the coordinate differences (N-VM.2), and vectors model
          real quantities like displacement, velocity, and force (N-VM.3) where
          direction matters as much as size.
        </p>
      </MathCheck>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-[var(--surface-2)] px-2 py-1.5">
      <span className="text-[10px] uppercase text-[var(--ink-faint)]">{label}</span>
      <span className="text-lg font-black" style={{ color: VEC }}>{value}</span>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(-5, value - 1))} disabled={value <= -5} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-lg font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(5, value + 1))} disabled={value >= 5} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
