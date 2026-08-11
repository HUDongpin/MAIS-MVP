"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const FILL = "var(--band-middle)";
const BASE = 240;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [aAng, setAAng] = useState(55);
  const [bAng, setBAng] = useState(60);
  const cAng = 180 - aAng - bAng;

  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const legFromA = (BASE * Math.sin(rad(bAng))) / Math.sin(rad(cAng));
  const apexX = legFromA * Math.cos(rad(aAng));
  const apexY = legFromA * Math.sin(rad(aAng));

  const PAD = 30;
  const FRAME_W = 300;
  const FRAME_H = 175;
  const minX = Math.min(0, apexX);
  const maxX = Math.max(BASE, apexX);
  const scale = Math.min(FRAME_W / (maxX - minX), FRAME_H / apexY);
  const ox = r2(PAD - minX * scale);
  const oy = r2(PAD + apexY * scale);
  const baseW = r2(BASE * scale);
  const apexPx = r2(ox + apexX * scale);
  const apexPy = r2(oy - apexY * scale);
  const apexTextY = r2(apexPy + 22);
  const svgW = r2((maxX - minX) * scale + 2 * PAD);
  const svgH = r2(apexY * scale + 2 * PAD);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The three angles of <strong>any</strong>{" "}triangle always add to{" "}
        <strong>180°</strong>. Change two of them and the third has to adjust to
        keep the sum. This single fact unlocks most angle problems.
      </p>

      <Figure caption="Adjust two angles; the third is forced. They always total 180°.">
        <div className="flex flex-col items-center gap-6">
          <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="max-w-full" role="img" aria-label={`triangle with angles ${aAng}, ${bAng}, ${cAng}`}>
            <polygon points={`${ox},${oy} ${ox + baseW},${oy} ${apexPx},${apexPy}`} fill={FILL} fillOpacity={0.6} stroke="var(--ink)" strokeWidth={2} />
            <text x={ox + 14} y={oy - 8} fontSize={13} fontWeight={800} fill="var(--band-early)" fontFamily="var(--font-mono)">{aAng}°</text>
            <text x={ox + baseW - 30} y={oy - 8} fontSize={13} fontWeight={800} fill="var(--band-middle)" fontFamily="var(--font-mono)">{bAng}°</text>
            <text x={r2(apexPx - 12)} y={apexTextY} fontSize={13} fontWeight={800} fill="var(--band-upper)" fontFamily="var(--font-mono)">{cAng}°</text>
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: FILL }}>
            <div className="font-mono text-2xl font-black">{aAng}° + {bAng}° + {cAng}° = <span style={{ color: FILL }}>180°</span></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Angle A" value={aAng} min={20} max={Math.min(120, 160 - bAng)} onChange={setAAng} />
            <Stepper label="Angle B" value={bAng} min={20} max={Math.min(120, 160 - aAng)} onChange={setBAng} />
          </div>
        </div>
      </Figure>

      <h2>Why the sum is always 180°</h2>
      <p>
        Draw a line through the top vertex parallel to the base. The two base
        angles reappear as alternate angles along that line, and together with the
        top angle they form a straight line — <strong>180°</strong>. That is also
        why two triangles with two equal angles (AA) must be similar.
      </p>

      <MathCheck>
        <p>
          The <strong>angle sum</strong>{" "}of a triangle is 180° (8.G.A.5), provable
          using <strong>parallel lines cut by a transversal</strong>{" "}and the
          alternate-interior-angle fact. An <strong>exterior angle</strong>{" "}equals
          the sum of the two remote interior angles, and two triangles sharing two
          angles (<strong>angle-angle</strong>) are similar.
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
        <button type="button" onClick={() => onChange(Math.max(min, value - 5))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-2xl font-black tabular-nums">{value}°</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 5))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
