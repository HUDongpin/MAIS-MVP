"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import {
  buildMathAngleContract,
  serializeMathAngleContract,
  svgAngleArcPath
} from "@/lib/mathDiagramGeometry";

const ACCENT = "var(--band-high)";
const CX = 120, CY = 120, RAD = 95;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [radius, setRadius] = useState(6);
  const [deg, setDeg] = useState(90);

  const frac = deg / 360;
  const arcLen = r2(2 * Math.PI * radius * frac);
  const sectorArea = r2(Math.PI * radius * radius * frac);

  // sector path
  const endX = r2(CX + RAD * Math.cos((-deg * Math.PI) / 180));
  const endY = r2(CY + RAD * Math.sin((-deg * Math.PI) / 180));
  const large = deg > 180 ? 1 : 0;
  const angleRadians = deg * Math.PI / 180;
  const angleContract = buildMathAngleContract({
    id: "arc-length-sector-central-angle",
    origin: { x: CX, y: CY },
    radius: RAD,
    startRay: { x: 1, y: 0 },
    endRay: { x: Math.cos(angleRadians), y: -Math.sin(angleRadians) },
    sweepRadians: angleRadians
  });

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A slice of a circle is a <strong>sector</strong>, and its curved edge is an{" "}
        <strong>arc</strong>. Both are just <em>fractions</em>{" "}of the whole circle:
        the fraction is the central angle over 360°. That one idea gives arc length
        and sector area at once.
      </p>

      <Figure caption="A sector is (angle/360) of the circle — so is its arc length and its area.">
        <div className="flex flex-col items-center gap-6">
          <svg className="mx-auto h-auto max-w-full" width={240} height={240} viewBox="0 0 240 240" role="img" aria-label="circle sector">
            <circle cx={CX} cy={CY} r={RAD} fill="none" stroke="var(--line)" strokeWidth={2} />
            <path d={`M ${CX} ${CY} L ${CX + RAD} ${CY} A ${RAD} ${RAD} 0 ${large} 0 ${endX} ${endY} Z`} fill={ACCENT} fillOpacity={0.25} />
            <path data-diagram-angle-arc data-math-angle-contract={serializeMathAngleContract(angleContract)} d={svgAngleArcPath(angleContract)} fill="none" stroke={ACCENT} strokeWidth={2.5} />
            <text x={CX + 10} y={CY - 8} fontSize={12} fontWeight={800} fill={ACCENT}>{deg}°</text>
          </svg>

          <div className="grid grid-cols-2 gap-4 text-center font-mono text-sm">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">arc length = 2πr·({deg}/360)<br /><strong style={{ color: ACCENT }}>≈ {arcLen}</strong></div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">sector area = πr²·({deg}/360)<br /><strong style={{ color: ACCENT }}>≈ {sectorArea}</strong></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="radius r" value={radius} min={2} max={10} onChange={setRadius} />
            <Slider label="angle" value={deg} onChange={setDeg} />
          </div>
        </div>
      </Figure>

      <h2>Radians make it cleaner</h2>
      <p>
        In <strong>radians</strong>, the central angle θ is defined as arc length
        over radius, so <strong>arc length = rθ</strong>{" "}and{" "}
        <strong>sector area = ½r²θ</strong>{" "}— no fractions of 360 needed. Here the{" "}
        {deg}° slice ({r2(frac)} of the circle) has arc {arcLen} and area {sectorArea}.
        The proportionality of arc to radius is what <em>defines</em>{" "}radian measure.
      </p>

      <MathCheck>
        <p>
          <strong>Arc length</strong>{" "}is proportional to the radius, and this
          constant of proportionality defines the <strong>radian</strong>{" "}measure of
          the central angle (G-C.5). The <strong>sector area</strong>{" "}is the same
          fraction of πr²; in radians, arc = rθ and sector area = ½r²θ.
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

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}: <span style={{ color: ACCENT }}>{value}°</span></span>
      <input type="range" min={30} max={300} step={30} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-40" style={{ accentColor: ACCENT }} aria-label={label} />
    </div>
  );
}
