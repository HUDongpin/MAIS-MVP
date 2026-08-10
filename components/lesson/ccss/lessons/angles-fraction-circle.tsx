"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CX = 110, CY = 110, R = 90;
const WEDGE = "var(--band-upper)";

const r3 = (n: number) => Math.round(n * 1000) / 1000;
function pt(deg: number, rad: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: r3(CX + rad * Math.cos(a)), y: r3(CY + rad * Math.sin(a)) };
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function Lesson() {
  const [deg, setDeg] = useState(90);

  const g = gcd(deg, 360);
  const reducedDenominator = deg === 0 ? 1 : 360 / g;
  const fracStr = deg === 0 ? "0" : reducedDenominator === 1 ? `${deg / g}` : `${deg / g}/${reducedDenominator}`;
  const end = pt(deg, R);
  const large = deg > 180 ? 1 : 0;
  // A full turn has identical arc endpoints, and SVG omits such a segment
  // entirely — the wedge vanished at 360°, rendering pixel-identical to 0°
  // while the readout said "360°". Draw it as two half-turns instead.
  const arcPath =
    deg >= 360
      ? `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX} ${CY + R} A ${R} ${R} 0 1 1 ${CX} ${CY - R} Z`
      : `M ${CX} ${CY} L ${CX} ${CY - R} A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y} Z`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        An <strong>angle</strong>{" "}measures a turn. A full turn all the way around
        is <strong>360°</strong>. So an angle is a <strong>fraction of the whole
        circle</strong>{" "}— a quarter turn is 1/4 of 360°, which is 90°.
      </p>

      <Figure caption="The shaded wedge is the angle. It is that fraction of the whole 360° circle.">
        <div className="flex flex-col items-center gap-6">
          <svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label={`angle of ${deg} degrees`}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line)" strokeWidth={2} />
            {deg > 0 && <path d={arcPath} fill={WEDGE} fillOpacity={0.75} stroke={WEDGE} strokeWidth={2} />}
            <line x1={CX} y1={CY} x2={CX} y2={CY - R} stroke="var(--ink)" strokeWidth={2.5} />
            <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="var(--ink)" strokeWidth={2.5} />
            <circle cx={CX} cy={CY} r={3.5} fill="var(--ink)" />
          </svg>

          <div className="text-center">
            <div className="font-mono text-3xl font-black" style={{ color: WEDGE }}>{deg}°</div>
            <div className="mt-1 font-mono text-[15px] text-[var(--ink-soft)]">
              = {fracStr} of a full turn ({deg}/360)
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Angle: {deg}°</span>
            <input type="range" min={0} max={360} step={15} value={deg} onChange={(e) => setDeg(Number(e.target.value))} className="w-56 accent-[var(--band-upper)]" aria-label="angle degrees" />
          </div>
        </div>
      </Figure>

      <h2>Degrees are 360 tiny slices</h2>
      <p>
        Cut the circle into 360 equal slices — each is <strong>1 degree</strong>.
        An angle of {deg}° covers {deg} of those slices, which is {fracStr} of the
        whole circle.
      </p>

      <MathCheck>
        <p>
          An angle is measured by the <strong>fraction of the circular arc</strong>{" "}
          it cuts off (4.MD.C.5). A full turn is 360°, so one degree is 1/360 of a
          circle, and {deg}° is {deg}/360 = {fracStr} of a full turn. A 90° angle
          (a quarter turn) is a right angle.
        </p>
      </MathCheck>
    </div>
  );
}
