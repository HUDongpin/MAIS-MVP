"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;
const VW = 240, VH = 170, MARGIN = 30;

export default function Lesson() {
  // Law of cosines demo: sides a, b and included angle C → find c
  const [a, setA] = useState(7);
  const [b, setB] = useState(9);
  const [C, setC] = useState(60);

  const rad = (C * Math.PI) / 180;
  const cSq = a * a + b * b - 2 * a * b * Math.cos(rad);
  const c = r2(Math.sqrt(cSq));

  // The triangle used to be a fixed polygon with live numbers stamped on it: its
  // C-vertex measured 56.3° whatever the slider said, and side a stayed the
  // longest even when b was stepped past it. Build it from a, b and C instead.
  // Vertex C at the origin, side a along the axis to B, side b at angle C to A —
  // so the drawn angle at C is C and the third side is the computed c.
  const tri = [
    { x: 0, y: 0 },
    { x: a, y: 0 },
    { x: b * Math.cos(rad), y: b * Math.sin(rad) },
  ];
  const xs = tri.map((p) => p.x), ys = tri.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const k = Math.min((VW - 2 * MARGIN) / spanX, (VH - 2 * MARGIN) / spanY);
  const ox = (VW - spanX * k) / 2 - Math.min(...xs) * k;
  const oy = (VH + spanY * k) / 2 + Math.min(...ys) * k;
  const sc = tri.map((p) => ({ x: ox + p.x * k, y: oy - p.y * k }));
  const gx = (sc[0].x + sc[1].x + sc[2].x) / 3, gy = (sc[0].y + sc[1].y + sc[2].y) / 3;
  // Push each label off the figure, away from the centroid.
  const outward = (x: number, y: number, d: number) => {
    const dx = x - gx, dy = y - gy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: x + (dx / len) * d, y: y + (dy / len) * d };
  };
  const sideLabel = (i: number, j: number) => outward((sc[i].x + sc[j].x) / 2, (sc[i].y + sc[j].y) / 2, 13);
  const labA = sideLabel(0, 1); // C→B is side a
  const labB = sideLabel(0, 2); // C→A is side b
  const labC = sideLabel(1, 2); // B→A is side c
  const labAngle = outward(sc[0].x, sc[0].y, -24);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The Pythagorean theorem is only for right triangles. For <em>any</em>{" "}
        triangle, two laws take over: the <strong>Law of Cosines</strong>{" "}
        (c² = a² + b² − 2ab·cos C) and the <strong>Law of Sines</strong>{" "}
        (a/sin A = b/sin B = c/sin C). Together they solve every triangle.
      </p>

      <Figure caption="Two sides and the included angle → the Law of Cosines finds the third side.">
        <div className="flex flex-col items-center gap-6">
          <svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={`triangle with sides ${a} and ${b} and included angle ${C} degrees`}>
            <polygon points={sc.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill={ACCENT} fillOpacity={0.12} stroke={ACCENT} strokeWidth={2.5} />
            <text x={labAngle.x} y={labAngle.y} textAnchor="middle" fontSize={12} fill="var(--band-middle)">C = {C}°</text>
            <text x={labA.x} y={labA.y} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">a = {a}</text>
            <text x={labB.x} y={labB.y} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">b = {b}</text>
            <text x={labC.x} y={labC.y} textAnchor="middle" fontSize={12} fontWeight={800} fill={ACCENT}>c = {c}</text>
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">c² = a² + b² − 2ab·cos C</div>
            <div className="mt-1 text-base font-black">= {a}² + {b}² − 2·{a}·{b}·cos {C}° = {r2(cSq)}</div>
            <div className="mt-1 text-lg font-black" style={{ color: ACCENT }}>c = {c}</div>
          </div>

          <p className="m-0 max-w-md text-center text-sm text-[var(--ink-soft)]">
            When C = 90°, cos C = 0 and this collapses to c² = a² + b² — the
            Pythagorean theorem is a special case.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="side a" value={a} min={3} max={12} onChange={setA} />
            <Stepper label="side b" value={b} min={3} max={12} onChange={setB} />
            <Slider label="angle C" value={C} onChange={setC} />
          </div>
        </div>
      </Figure>

      <h2>Which law to use</h2>
      <p>
        Know two sides and the <strong>included</strong>{" "}angle (or all three sides)?
        Use the <strong>Law of Cosines</strong>. Know a side and its opposite angle
        plus one more? Use the <strong>Law of Sines</strong>{" "}a/sin A = b/sin B. These
        handle surveying, navigation, and any oblique triangle Pythagoras can&apos;t.
      </p>

      <MathCheck>
        <p>
          The <strong>Law of Sines</strong>{" "}(a/sin A = b/sin B = c/sin C) and{" "}
          <strong>Law of Cosines</strong>{" "}(c² = a² + b² − 2ab·cos C) are proved with
          altitudes and the area formula (G-SRT.10). They{" "}
          <strong>solve any triangle</strong>{" "}— finding unknown sides and angles in
          applied and surveying problems (G-SRT.11).
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
      <input type="range" min={20} max={140} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-40" style={{ accentColor: ACCENT }} aria-label={label} />
    </div>
  );
}
