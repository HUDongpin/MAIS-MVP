"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [a, setA] = useState(8);
  const [b, setB] = useState(6);
  const [C, setC] = useState(50); // included angle

  const area = r2(0.5 * a * b * Math.sin((C * Math.PI) / 180));
  const height = r2(b * Math.sin((C * Math.PI) / 180));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        You can find a triangle&apos;s area from <strong>two sides and the angle
        between them</strong>{" "}— no separate height measurement needed. The formula{" "}
        <strong>Area = ½·a·b·sin C</strong>{" "}works because b·sin C <em>is</em>{" "}the
        height dropped to side a.
      </p>

      <Figure caption="The height onto side a equals b·sin C, so the area is ½·a·(b sin C).">
        <div className="flex flex-col items-center gap-6">
          <svg width={240} height={170} viewBox="0 0 240 170" role="img" aria-label="triangle with included angle">
            <polygon points="30,140 210,140 90,50" fill={ACCENT} fillOpacity={0.12} stroke={ACCENT} strokeWidth={2.5} />
            {/* height */}
            <line x1={90} y1={50} x2={90} y2={140} stroke="var(--band-upper)" strokeWidth={2} strokeDasharray="4 3" />
            <rect x={90} y={128} width={12} height={12} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
            <text x={40} y={135} fontSize={11} fill="var(--band-middle)">C = {C}°</text>
            <text x={130} y={158} fontSize={11} fill="var(--ink-faint)">side a = {a}</text>
            <text x={48} y={95} fontSize={11} fill="var(--ink-faint)">b = {b}</text>
            <text x={96} y={100} fontSize={11} fill="var(--band-upper)">h = {height}</text>
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">Area = ½·a·b·sin C</div>
            <div className="mt-1 text-lg font-black">= ½·{a}·{b}·sin {C}° = <span style={{ color: ACCENT }}>{area}</span></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="side a" value={a} min={3} max={12} onChange={setA} />
            <Stepper label="side b" value={b} min={3} max={12} onChange={setB} />
            <Slider label="angle C" value={C} onChange={setC} />
          </div>
        </div>
      </Figure>

      <h2>Height hidden in the sine</h2>
      <p>
        Drop a perpendicular from the top vertex to side a. In the little right
        triangle, that height is the opposite side over hypotenuse b, so h = b·sin C
        = {height}. Then the familiar ½·base·height becomes ½·a·b·sin C = {area}. One
        formula, two sides and an angle.
      </p>

      <MathCheck>
        <p>
          The area of a triangle is <strong>½·a·b·sin C</strong>{" "}(G-SRT.9), derived
          by drawing an altitude from a vertex: its length is b·sin C, turning the
          standard ½·base·height into a formula that needs only two sides and their{" "}
          <strong>included angle</strong>.
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
      <input type="range" min={20} max={90} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-40" style={{ accentColor: ACCENT }} aria-label={label} />
    </div>
  );
}
