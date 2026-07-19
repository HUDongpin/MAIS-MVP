"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  // Law of cosines demo: sides a, b and included angle C → find c
  const [a, setA] = useState(7);
  const [b, setB] = useState(9);
  const [C, setC] = useState(60);

  const cSq = a * a + b * b - 2 * a * b * Math.cos((C * Math.PI) / 180);
  const c = r2(Math.sqrt(cSq));

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
          <svg width={240} height={160} viewBox="0 0 240 160" role="img" aria-label="general triangle">
            <polygon points="40,130 200,130 100,40" fill={ACCENT} fillOpacity={0.12} stroke={ACCENT} strokeWidth={2.5} />
            <text x={64} y={124} fontSize={12} fill="var(--band-middle)">C = {C}°</text>
            <text x={115} y={148} fontSize={11} fill="var(--ink-faint)">a = {a}</text>
            <text x={58} y={88} fontSize={11} fill="var(--ink-faint)">b = {b}</text>
            <text x={158} y={82} fontSize={12} fontWeight={800} fill={ACCENT}>c = {c}</text>
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
