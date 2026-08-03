"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

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
  // Collapse floating-point residue below display precision to an unsigned
  // zero: sin(2π) is −2.4e−16, which printed "−0.000" at the slider maximum and
  // implied the full turn lands slightly below the positive x-axis.
  const coord = (n: number) => (Math.abs(n) < 5e-4 ? "0.000" : n.toFixed(3));
  const px = r3(C + R * cos);
  const py = r3(C - R * sin);

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
              d={describeArc(C, C, 26, 0, deg)}
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
            <Stat label="cos θ (x)" value={coord(cos)} color={COS} />
            <Stat label="sin θ (y)" value={coord(sin)} color={SIN} />
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

/** SVG arc path from angle a0 to a1 (degrees, counterclockwise) at radius r. */
function describeArc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  // sweep flag 0 because screen y is inverted (counterclockwise math → clockwise screen)
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 0 ${p1.x} ${p1.y}`;
}
function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return { x: round(cx + r * Math.cos(a)), y: round(cy - r * Math.sin(a)) };
}
