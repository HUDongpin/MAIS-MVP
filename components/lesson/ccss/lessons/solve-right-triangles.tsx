"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [dist, setDist] = useState(50); // distance to building
  const [angle, setAngle] = useState(35); // angle of elevation

  const height = r2(dist * Math.tan((angle * Math.PI) / 180));
  const lineOfSight = r2(dist / Math.cos((angle * Math.PI) / 180));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Trigonometry <em>measures the unreachable</em>. Stand {dist} m from a
        building, measure the <strong>angle of elevation</strong>{" "}to its top, and
        you can compute the height without climbing — using tan θ = opposite /
        adjacent.
      </p>

      <Figure caption="From a known distance and angle of elevation, tangent gives the height.">
        <div className="flex flex-col items-center gap-6">
          <svg width={260} height={180} viewBox="0 0 260 180" role="img" aria-label={`A ${angle} degree angle of elevation measured ${dist} metres from a building, giving a height of about ${height} metres`}>
            {/* ground */}
            <line x1={20} y1={150} x2={240} y2={150} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* building */}
            <line x1={210} y1={150} x2={210} y2={60} stroke={ACCENT} strokeWidth={3} />
            {/* line of sight */}
            <line x1={30} y1={150} x2={210} y2={60} stroke="var(--band-upper)" strokeWidth={2} strokeDasharray="5 3" />
            <rect x={198} y={138} width={12} height={12} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
            <path d="M 60 150 A 30 30 0 0 0 55 135" fill="none" stroke="var(--band-middle)" strokeWidth={2} />
            <text x={64} y={144} fontSize={11} fill="var(--band-middle)">{angle}°</text>
            <text x={110} y={166} fontSize={11} fill="var(--ink-faint)">{dist} m</text>
            <text x={216} y={108} fontSize={12} fontWeight={800} fill={ACCENT}>h = {height}</text>
          </svg>

          <div className="grid grid-cols-2 gap-4 text-center font-mono text-sm">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">height = {dist}·tan {angle}°<br /><strong style={{ color: ACCENT }}>≈ {height} m</strong></div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">line of sight = {dist}/cos {angle}°<br /><strong>≈ {lineOfSight} m</strong></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Slider label="distance (m)" value={dist} min={20} max={100} step={5} onChange={setDist} />
            <Slider label="elevation angle" value={angle} min={15} max={70} step={5} onChange={setAngle} />
          </div>
        </div>
      </Figure>

      <h2>Choose the right ratio</h2>
      <p>
        You know the <strong>adjacent</strong>{" "}side ({dist} m) and want the{" "}
        <strong>opposite</strong>{" "}side (the height), so use{" "}
        <strong>tangent</strong>: height = {dist}·tan {angle}° ≈ {height} m. Need the
        slanted line of sight instead? That&apos;s the hypotenuse, so use cosine — or
        the Pythagorean theorem once two sides are known.
      </p>

      <MathCheck>
        <p>
          Right-triangle trigonometry and the Pythagorean theorem{" "}
          <strong>solve applied problems</strong>{" "}(G-SRT.8): identify which sides are
          opposite, adjacent, and hypotenuse relative to a known angle, then pick sine,
          cosine, or tangent to find the missing length or angle — as in surveying,
          navigation, and heights.
        </p>
      </MathCheck>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}: <span style={{ color: ACCENT }}>{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-48" style={{ accentColor: ACCENT }} aria-label={label} />
    </div>
  );
}
