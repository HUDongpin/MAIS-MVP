"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [angle, setAngle] = useState(37);
  const rad = (angle * Math.PI) / 180;
  const sin = r2(Math.sin(rad));
  const cos = r2(Math.cos(rad));
  const tan = r2(Math.tan(rad));
  const comp = 90 - angle;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        In a right triangle the ratios of sides depend <em>only on the angle</em>,
        not the size — because all right triangles with that angle are similar. Those
        fixed ratios are <strong>sine, cosine, and tangent</strong>. SOH-CAH-TOA
        names them.
      </p>

      <Figure caption="For angle θ: sin = opp/hyp, cos = adj/hyp, tan = opp/adj — the same for any similar right triangle.">
        <div className="flex flex-col items-center gap-6">
          <svg width={240} height={170} viewBox="0 0 240 170" role="img" aria-label="right triangle trig ratios">
            <polygon points="30,140 200,140 30,40" fill={ACCENT} fillOpacity={0.12} stroke={ACCENT} strokeWidth={2.5} />
            <rect x={30} y={128} width={12} height={12} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
            <text x={165} y={158} fontSize={12} fill="var(--band-upper)">θ = {angle}°</text>
            <text x={110} y={158} fontSize={11} fill="var(--ink-faint)">adjacent</text>
            <text x={8} y={95} fontSize={11} fill="var(--ink-faint)" transform="rotate(-90 12 95)">opposite</text>
            <text x={118} y={82} fontSize={11} fill="var(--ink-faint)">hyp</text>
          </svg>

          <div className="grid grid-cols-3 gap-3 text-center font-mono">
            <Cell label="sin θ" value={`${sin}`} />
            <Cell label="cos θ" value={`${cos}`} />
            <Cell label="tan θ" value={`${tan}`} />
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] px-6 py-2 text-center text-sm">
            Complementary angle: sin({angle}°) = cos({comp}°) = <strong style={{ color: ACCENT }}>{sin}</strong>
          </div>

          <Slider label="angle θ" value={angle} onChange={setAngle} />
        </div>
      </Figure>

      <h2>Ratios from similarity</h2>
      <p>
        Scale a right triangle up or down and every side scales together, so
        opp/hyp is unchanged — that&apos;s why sin θ = {sin} is a property of the{" "}
        <em>angle</em>. Notice sin θ = cos(90° − θ): the opposite side for θ is the
        adjacent side for its complement. That&apos;s the origin of the name
        "co-sine" (complement&apos;s sine).
      </p>

      <MathCheck>
        <p>
          Because all right triangles sharing an acute angle are{" "}
          <strong>similar</strong>, the side ratios are fixed, <em>defining</em>{" "}
          sine, cosine, and tangent (G-SRT.6). The{" "}
          <strong>complementary-angle relationship</strong>{" "}sin θ = cos(90° − θ)
          (G-SRT.7) follows directly from swapping which leg is "opposite."
        </p>
      </MathCheck>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
      <div className="text-[10px] uppercase text-[var(--ink-faint)]">{label}</div>
      <div className="text-xl font-black" style={{ color: ACCENT }}>{value}</div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}: <span style={{ color: ACCENT }}>{value}°</span></span>
      <input type="range" min={15} max={75} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-56" style={{ accentColor: ACCENT }} aria-label={label} />
    </div>
  );
}
