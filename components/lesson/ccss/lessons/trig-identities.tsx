"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import {
  relationForDisplayedValue,
  spokenRelationForDisplayedValue,
} from "@/components/lesson/ccss/numberPresentation";

const ACCENT = "var(--band-high)";
const CX = 120, CY = 120, RAD = 90;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [deg, setDeg] = useState(37);
  const rad = (deg * Math.PI) / 180;
  const rawCos = Math.cos(rad);
  const rawSin = Math.sin(rad);
  const cos = r2(rawCos);
  const sin = r2(rawSin);
  // Square the exact values, not the two-decimal display values: rounding first
  // and squaring after prints 0.99 or 1.01 directly under "= 1 for every angle θ",
  // which is the misconception this lesson exists to prevent.
  const displayedSumSquares = sin ** 2 + cos ** 2;
  const roundedSumSquares = r2(displayedSumSquares);
  const displayedSumRelation = relationForDisplayedValue(displayedSumSquares, roundedSumSquares);
  const identityRelation = relationForDisplayedValue(displayedSumSquares, 1);
  const px = r2(CX + RAD * Math.cos(rad));
  const py = r2(CY - RAD * Math.sin(rad));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        On the unit circle, a point is (cos θ, sin θ), and its distance from the
        center is 1. The Pythagorean theorem then gives the most-used identity in
        trigonometry: <strong>sin²θ + cos²θ = 1</strong>. Build on it and you get
        the addition formulas too.
      </p>

      <Figure caption="The right triangle inside the unit circle has legs cos θ and sin θ, hypotenuse 1 — Pythagoras.">
        <div className="flex flex-col items-center gap-6">
          <svg width={240} height={240} viewBox="0 0 240 240" role="img" aria-label={`Unit circle with a right triangle for an angle of ${deg} degrees: horizontal leg cos θ ${spokenRelationForDisplayedValue(rawCos, cos)} ${cos}, vertical leg sin θ ${spokenRelationForDisplayedValue(rawSin, sin)} ${sin}, both shown to the nearest hundredth; hypotenuse exactly 1`}>
            <circle cx={CX} cy={CY} r={RAD} fill="none" stroke="var(--line)" strokeWidth={2} />
            <line x1={CX - RAD - 15} y1={CY} x2={CX + RAD + 15} y2={CY} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={CX} y1={CY - RAD - 15} x2={CX} y2={CY + RAD + 15} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {/* triangle */}
            <polygon points={`${CX},${CY} ${px},${CY} ${px},${py}`} fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={1.5} />
            <line x1={CX} y1={CY} x2={px} y2={py} stroke={ACCENT} strokeWidth={2.5} />
            <circle cx={px} cy={py} r={5} fill={ACCENT} />
            <text x={(CX + px) / 2} y={CY + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink)">cos θ</text>
            <text x={px + 6} y={(CY + py) / 2} fontSize={11} fontWeight={700} fill="var(--ink)">sin θ</text>
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">sin²θ + cos²θ =</div>
            <div className="text-lg font-black">({sin})² + ({cos})² {displayedSumRelation} <span style={{ color: ACCENT }}>{roundedSumSquares}</span></div>
            <div className="text-xs text-[var(--ink-faint)]">rounded coordinates may shift the sum; unrounded sin²θ + cos²θ = 1 exactly</div>
          </div>

          <Slider label="angle θ" value={deg} onChange={setDeg} />
        </div>
      </Figure>

      <h2>One identity leads to many</h2>
      <p>
        For every real θ, sin²θ + cos²θ = 1. For the selected angle, {sin}² +{" "}
        {cos}² {identityRelation} 1 (rounding aside). Where cos θ ≠ 0, dividing by cos²θ gives
        1 + tan²θ = sec²θ. And the <strong>addition formulas</strong>{" "}—
        sin(A + B) = sin A cos B + cos A sin B, cos(A + B) = cos A cos B − sin A sin B
        — let you find exact values like sin 75° = sin(45° + 30°). Identities turn
        hard angles into known ones.
      </p>

      <MathCheck>
        <p>
          The <strong>Pythagorean identity</strong>{" "}sin²θ + cos²θ = 1 follows from
          the unit circle and lets you find one ratio from another given the quadrant
          (F-TF.8). The <strong>addition and subtraction formulas</strong>{" "}for sine
          and cosine (F-TF.9) compute exact values of combined angles and underlie
          much of trig manipulation.
        </p>
      </MathCheck>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}: <span style={{ color: ACCENT }}>{value}°</span></span>
      <input type="range" min={10} max={80} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-56" style={{ accentColor: ACCENT }} aria-label={label} />
    </div>
  );
}
