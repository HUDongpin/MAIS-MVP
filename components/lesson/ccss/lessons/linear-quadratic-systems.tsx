"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const LINE = "var(--band-upper)";
const XR = 4, YR = 10, PXX = 40, PXY = 15, PAD = 28;
const W = 2 * XR * PXX + 2 * PAD, H = YR * PXY + 2 * PAD;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [m, setM] = useState(1);
  const [k, setK] = useState(2);

  // x² = m x + k  →  x² − m x − k = 0
  const disc = m * m + 4 * k;
  const sols: number[] = disc > 0 ? [(m - Math.sqrt(disc)) / 2, (m + Math.sqrt(disc)) / 2] : disc === 0 ? [m / 2] : [];

  const sx = (x: number) => PAD + (x + XR) * PXX;
  const sy = (y: number) => PAD + (YR - Math.min(y, YR)) * PXY;

  const para: string[] = [];
  for (let x = -XR; x <= XR + 0.001; x += 0.1) if (x * x <= YR) para.push(`${sx(x).toFixed(1)},${sy(x * x).toFixed(1)}`);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A line and a parabola can meet <strong>twice, once, or never</strong>. To
        find where, set them equal — <strong>x² = mx + k</strong>{" "}— and solve the
        resulting quadratic. Its discriminant counts the intersection points.
      </p>

      <Figure caption="Where the line crosses the parabola solves both equations. Substitution turns it into one quadratic.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6 font-mono text-lg font-black">
            <span style={{ color: ACCENT }}>y = x²</span>
            <span style={{ color: LINE }}>y = {m}x + {k}</span>
          </div>

          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" style={{ maxHeight: 300 }} role="img" aria-label="line and parabola">
            {Array.from({ length: 2 * XR + 1 }, (_, i) => i - XR).map((x) => (
              <line key={x} x1={sx(x)} y1={PAD} x2={sx(x)} y2={H - PAD} stroke="var(--line)" strokeWidth={1} />
            ))}
            <line x1={sx(-XR)} y1={sy(0)} x2={sx(XR)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            <polyline points={para.join(" ")} fill="none" stroke={ACCENT} strokeWidth={2.5} />
            <line x1={sx(-XR)} y1={sy(m * -XR + k)} x2={sx(XR)} y2={sy(m * XR + k)} stroke={LINE} strokeWidth={2.5} />
            {sols.map((xv, i) => (
              <circle key={i} cx={sx(xv)} cy={sy(xv * xv)} r={5} fill="var(--ink)" stroke="white" strokeWidth={2} />
            ))}
          </svg>

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono text-sm" style={{ borderColor: ACCENT }}>
            x² − {m}x − {k} = 0 → discriminant {disc} → <strong style={{ color: ACCENT }}>{sols.length} intersection{sols.length === 1 ? "" : "s"}</strong>
            {sols.length > 0 && <div className="mt-1 text-[var(--ink-soft)]">x = {sols.map((s) => r2(s)).join(", ")}</div>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="slope m" value={m} min={-4} max={4} onChange={setM} />
            <Stepper label="intercept k" value={k} min={-4} max={8} onChange={setK} />
          </div>
        </div>
      </Figure>

      <h2>Substitute, then solve one quadratic</h2>
      <p>
        Since both equal y, set x² = {m}x + {k}, i.e. x² − {m}x − {k} = 0. Its
        solutions are the x-coordinates of the crossings; plug each back into either
        equation for y. The discriminant m² + 4k being positive, zero, or negative
        gives two, one, or no real meeting points.
      </p>

      <MathCheck>
        <p>
          A <strong>linear–quadratic system</strong>{" "}is solved by substitution
          (A-REI.7): setting the expressions equal yields a single quadratic whose
          real roots are the intersection x-values. Graphically, these are exactly
          the points where the line meets the parabola — algebra and geometry
          agreeing.
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
