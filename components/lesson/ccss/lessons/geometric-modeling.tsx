"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  // Model a tree trunk as a cylinder; estimate its mass from wood density.
  const [radius, setRadius] = useState(20); // cm
  const [height, setHeight] = useState(300); // cm
  const [density, setDensity] = useState(0.7); // g/cm³ (wood)

  const volume = Math.PI * radius * radius * height; // cm³
  const massKg = r2((volume * density) / 1000);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The real world isn&apos;t made of perfect shapes — but you can <strong>model</strong>{" "}
        it with them. A tree trunk is roughly a <strong>cylinder</strong>. Combine its
        volume with a <strong>density</strong>{" "}(mass per unit volume) and you can
        estimate its mass without a scale.
      </p>

      <Figure caption="Approximate a real object with a geometric solid, then apply density to estimate mass.">
        <div className="flex flex-col items-center gap-6">
          <svg width={140} height={180} viewBox="0 0 140 180" role="img" aria-label="tree trunk as a cylinder">
            <ellipse cx={70} cy={30} rx={35} ry={11} fill={ACCENT} fillOpacity={0.3} stroke={ACCENT} strokeWidth={2} />
            <path d="M 35 30 L 35 150 A 35 11 0 0 0 105 150 L 105 30" fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={2} />
            <text x={70} y={95} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">r = {radius} cm</text>
          </svg>

          <div className="grid grid-cols-2 gap-4 text-center font-mono text-sm">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">volume = πr²h<br /><strong>≈ {r2(volume / 1000)} L</strong></div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">mass = volume × density<br /><strong style={{ color: ACCENT }}>≈ {massKg} kg</strong></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="radius (cm)" value={radius} min={10} max={40} step={5} onChange={setRadius} />
            <Stepper label="height (cm)" value={height} min={100} max={500} step={50} onChange={setHeight} />
          </div>
          <p className="m-0 text-xs text-[var(--ink-faint)]">wood density ≈ {density} g/cm³</p>
        </div>
      </Figure>

      <h2>Shapes, density, and design</h2>
      <p>
        Modeling the trunk as a cylinder of radius {radius} cm and height {height} cm
        gives a volume, and multiplying by wood&apos;s density ({density} g/cm³)
        estimates its mass at ≈ {massKg} kg. The same thinking answers design
        questions — how many gallons a tank holds, or how to minimize material for a
        given volume (an optimization).
      </p>

      <MathCheck>
        <p>
          <strong>Geometric modeling</strong>: describing real objects with shapes and
          solids (G-MG.1); applying <strong>density</strong>{" "}concepts based on area or
          volume — population per square mile, mass per cubic centimeter (G-MG.2); and
          solving <strong>design problems</strong>{" "}with geometric methods, including
          optimizing cost or minimizing material (G-MG.3).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-14 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
