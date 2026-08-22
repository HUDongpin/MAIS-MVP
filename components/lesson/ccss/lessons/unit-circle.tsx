"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import {
  buildMathAngleContract,
  serializeMathAngleContract,
  svgAngleArcPath
} from "@/lib/mathDiagramGeometry";

const R = 120;
const C = 160;
const BOX = 320;
const COS = "var(--band-early)";
const SIN = "var(--band-middle)";
const RAY = "var(--band-high)";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function radiansLabel(deg: number): string {
  // express deg° as a reduced fraction of π (deg/180)
  if (deg === 0) return "0";
  const g = gcd(deg, 180);
  const p = deg / g;
  const q = 180 / g;
  const num = p === 1 ? "π" : `${p}π`;
  return q === 1 ? num : `${num}/${q}`;
}

export default function Lesson() {
  const [deg, setDeg] = useState(45);

  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const px = r3(C + R * cos);
  const py = r3(C - R * sin);
  const angleContract = buildMathAngleContract({
    id: "unit-circle-central-angle",
    origin: { x: C, y: C },
    radius: 26,
    startRay: { x: 1, y: 0 },
    endRay: { x: cos, y: -sin },
    sweepRadians: rad
  });

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>unit circle</strong>{" "}is a circle of radius 1 centered at the
        origin. Sweep a ray out to an angle <strong>θ</strong>, and the point
        where it meets the circle has coordinates{" "}
        <strong>(cos θ, sin θ)</strong>. That single idea is the whole engine of
        trigonometry.
      </p>

      <Figure caption="The horizontal leg is cos θ; the vertical leg is sin θ. Together they place the point on the circle.">
        <div className="flex flex-col items-center gap-5">
          <svg width={BOX} height={BOX} viewBox={`0 0 ${BOX} ${BOX}`} className="max-w-full" style={{ maxHeight: 320 }} role="img" aria-label={`Unit circle at ${deg} degrees`}>
            {/* axes */}
            <line x1={C - R - 20} y1={C} x2={C + R + 20} y2={C} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={C} y1={C - R - 20} x2={C} y2={C + R + 20} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {/* circle */}
            <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" strokeWidth={2} />
            {/* legs of the reference triangle */}
            <line x1={C} y1={C} x2={px} y2={C} stroke={COS} strokeWidth={3} />
            <line x1={px} y1={C} x2={px} y2={py} stroke={SIN} strokeWidth={3} />
            {/* radius ray */}
            <line x1={C} y1={C} x2={px} y2={py} stroke={RAY} strokeWidth={2.5} />
            {/* angle arc */}
            <path
              data-diagram-angle-arc
              data-math-angle-contract={serializeMathAngleContract(angleContract)}
              d={svgAngleArcPath(angleContract)}
              fill="none"
              stroke={RAY}
              strokeWidth={2}
            />
            {/* point */}
            <circle cx={px} cy={py} r={6} fill={RAY} stroke="white" strokeWidth={2} />
          </svg>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="angle" value={`${deg}°`} />
            <Stat label="radians" value={radiansLabel(deg)} />
            <Stat label="cos θ (x)" value={cos.toFixed(3)} color={COS} />
            <Stat label="sin θ (y)" value={sin.toFixed(3)} color={SIN} />
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
              Angle θ: <span className="text-[var(--ink)]">{deg}°</span>
            </span>
            <input
              type="range"
              min={0}
              max={360}
              step={15}
              value={deg}
              onChange={(e) => setDeg(Number(e.target.value))}
              className="w-56 accent-[var(--band-high)]"
              aria-label="Angle in degrees"
            />
          </div>
        </div>
      </Figure>

      <h2>Why the coordinates are cosine and sine</h2>
      <p>
        Drop a vertical line from the point to the x-axis. You get a right
        triangle whose hypotenuse is the radius, <strong>1</strong>. By the
        definition of the trig ratios, the horizontal leg is{" "}
        <span className="font-mono">cos θ</span> and the vertical leg is{" "}
        <span className="font-mono">sin θ</span> — so the point itself is at{" "}
        <span className="font-mono">(cos θ, sin θ)</span>.
      </p>

      <MathCheck>
        <p>
          On the unit circle, the point at angle <strong>θ</strong>{" "}is{" "}
          <strong>(cos θ, sin θ)</strong>{" "}by definition — this extends sine and
          cosine to every angle, not just those in a right triangle (F-TF.2).
          Because the point lies on the circle x² + y² = 1, we get the
          Pythagorean identity <strong>cos²θ + sin²θ = 1</strong>{" "}for free. The
          radian measure of θ equals the length of the arc it cuts on the unit
          circle, which is why a full turn is <strong>2π</strong>{" "}(F-TF.1).
        </p>
      </MathCheck>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-center">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</div>
      <div className="font-mono text-base font-bold" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
