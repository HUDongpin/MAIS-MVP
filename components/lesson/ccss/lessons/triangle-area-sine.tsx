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

  const rad = (C * Math.PI) / 180;
  const exactArea = 0.5 * a * b * Math.sin(rad);
  const exactHeight = b * Math.sin(rad);
  const area = r2(exactArea);
  const height = r2(exactHeight);
  const relation = (raw: number) => Math.abs(raw * 100 - Math.round(raw * 100)) < 1e-9 ? "=" : "≈";
  const rawPoints = [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: b * Math.cos(rad), y: b * Math.sin(rad) }];
  const minX = Math.min(...rawPoints.map((p) => p.x));
  const maxX = Math.max(...rawPoints.map((p) => p.x));
  const maxY = Math.max(...rawPoints.map((p) => p.y));
  const scale = Math.min(180 / Math.max(maxX - minX, 1), 100 / Math.max(maxY, 1));
  const ox = 30 - minX * scale;
  const baseY = 140;
  const p0 = { x: ox, y: baseY };
  const p1 = { x: ox + a * scale, y: baseY };
  const apex = { x: ox + b * Math.cos(rad) * scale, y: baseY - b * Math.sin(rad) * scale };

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
          <svg width={240} height={170} viewBox="0 0 240 170" role="img" aria-label={`Triangle with side a = ${a} and side b = ${b} meeting at an included angle C of ${C} degrees, and the height h equals b times sine C and ${relation(exactHeight) === "=" ? "equals" : "is approximately"} ${height}${relation(exactHeight) === "≈" ? " to the nearest hundredth" : ""}, drawn from the top vertex down to side a`}>
            <polygon points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${apex.x},${apex.y}`} fill={ACCENT} fillOpacity={0.12} stroke={ACCENT} strokeWidth={2.5} />
            {apex.x > p1.x && <line x1={p1.x} y1={baseY} x2={apex.x} y2={baseY} stroke="var(--ink-soft)" strokeWidth={1.5} strokeDasharray="4 3" />}
            {/* height */}
            <line x1={apex.x} y1={apex.y} x2={apex.x} y2={baseY} stroke="var(--band-upper)" strokeWidth={2} strokeDasharray="4 3" />
            <rect x={apex.x} y={baseY - 10} width={10} height={10} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
            <text x={p0.x + 8} y={baseY - 6} fontSize={11} fill="var(--band-middle)">C = {C}°</text>
            <text x={(p0.x + p1.x) / 2} y={158} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">side a = {a}</text>
            <text x={(p0.x + apex.x) / 2 - 8} y={(p0.y + apex.y) / 2} fontSize={11} fill="var(--ink-faint)">b = {b}</text>
            <text x={apex.x + 6} y={(apex.y + baseY) / 2} fontSize={11} fill="var(--band-upper)">h {relation(exactHeight)} {height}</text>
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">Area = ½·a·b·sin C</div>
            <div className="mt-1 text-lg font-black">= ½·{a}·{b}·sin {C}° {relation(exactArea)} <span style={{ color: ACCENT }}>{area}</span>{relation(exactArea) === "≈" ? " (nearest hundredth)" : ""}</div>
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
        triangle, sin C = h/b (opposite ÷ hypotenuse), so h = b·sin C{" "}
        {relation(exactHeight)} {height}. Then the familiar ½·base·height becomes
        ½·a·b·sin C {relation(exactArea)} {area}. One formula, two sides and an
        angle.
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
