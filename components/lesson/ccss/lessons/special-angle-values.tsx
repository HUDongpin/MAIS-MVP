"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const ANGLES = [
  { deg: 30, rad: "π/6", sin: "1/2", cos: "√3/2", tan: "1/√3", tri: "30-60-90" },
  { deg: 45, rad: "π/4", sin: "√2/2", cos: "√2/2", tan: "1", tri: "45-45-90" },
  { deg: 60, rad: "π/3", sin: "√3/2", cos: "1/2", tan: "√3", tri: "30-60-90" },
];

export default function Lesson() {
  const [idx, setIdx] = useState(1);
  const a = ANGLES[idx];

  // Leg lengths in px that actually realise each special triangle: equal legs
  // for 45-45-90, and √3 : 1 (horizontal : vertical) for 30-60-90, matching the
  // side labels printed on them.
  const legX = a.tri === "45-45-90" ? 130 : 160;
  const legY = a.tri === "45-45-90" ? 130 : Math.round(160 / Math.sqrt(3));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A few angles have <strong>exact</strong>{" "}trig values — no calculator
        needed. They come from two special right triangles: the{" "}
        <strong>45-45-90</strong>{" "}(sides 1, 1, √2) and the{" "}
        <strong>30-60-90</strong>{" "}(sides 1, √3, 2). Memorizing these unlocks
        countless problems.
      </p>

      <Figure caption="Read sine, cosine, and tangent straight off the special triangle's side ratios.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {ANGLES.map((an, i) => (
              <button key={an.deg} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{an.deg}°</button>
            ))}
          </div>

          <svg width={240} height={180} viewBox="0 0 240 180" role="img" aria-label={`${a.tri} triangle`}>
            {/* The polygon has to match the triangle being labelled. One fixed
                shape with 160 × 110 legs was reused for both, so the default
                45-45-90 view showed a plainly scalene triangle with both legs
                labelled "1" — in the lesson whose point is that those legs are
                equal. Legs are now 130 × 130 for 45-45-90 and 160 × 160/√3 for
                30-60-90, matching the printed side labels. */}
            <polygon points={`40,150 ${40 + legX},150 40,${150 - legY}`} fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={2.5} />
            <rect x="40" y="138" width="12" height="12" fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
            {/* labels depend on triangle */}
            {a.tri === "45-45-90" ? (
              <>
                <text x={40 + legX / 2} y="168" textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">1</text>
                <text x="24" y={150 - legY / 2} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">1</text>
                <text x={48 + legX / 2} y={150 - legY / 2 - 6} fontSize={13} fontWeight={700} fill={ACCENT}>√2</text>
                <text x={20 + legX} y="145" fontSize={12} fill="var(--ink-soft)">45°</text>
              </>
            ) : (
              <>
                <text x={40 + legX / 2} y="168" textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">√3</text>
                <text x="24" y={150 - legY / 2} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">1</text>
                <text x={48 + legX / 2} y={150 - legY / 2 - 6} fontSize={13} fontWeight={700} fill={ACCENT}>2</text>
                <text x={16 + legX} y="145" fontSize={12} fill="var(--ink-soft)">30°</text>
                <text x="46" y={168 - legY} fontSize={12} fill="var(--ink-soft)">60°</text>
              </>
            )}
          </svg>

          <div className="grid grid-cols-4 gap-3 text-center font-mono">
            <Cell label="angle" value={`${a.deg}° = ${a.rad}`} />
            <Cell label="sin" value={a.sin} accent />
            <Cell label="cos" value={a.cos} accent />
            <Cell label="tan" value={a.tan} accent />
          </div>
        </div>
      </Figure>

      <h2>Ratios from the triangle</h2>
      <p>
        For {a.deg}°, sine is opposite/hypotenuse = {a.sin}, cosine is
        adjacent/hypotenuse = {a.cos}, and tangent is opposite/adjacent = {a.tan}.
        These aren&apos;t approximations — they&apos;re exact side ratios of a
        triangle you can draw. The unit circle then extends them to every angle.
      </p>

      <MathCheck>
        <p>
          The <strong>special triangles</strong>{" "}45-45-90 (sides 1, 1, √2) and
          30-60-90 (sides 1, √3, 2) give the <strong>exact</strong>{" "}values of sine,
          cosine, and tangent for π/6, π/4, and π/3 (F-TF.3). These anchor points,
          reflected around the unit circle, produce exact values throughout all four
          quadrants.
        </p>
      </MathCheck>
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] px-2 py-2">
      <div className="text-[10px] uppercase text-[var(--ink-faint)]">{label}</div>
      <div className="text-lg font-black" style={{ color: accent ? ACCENT : "var(--ink)" }}>{value}</div>
    </div>
  );
}
