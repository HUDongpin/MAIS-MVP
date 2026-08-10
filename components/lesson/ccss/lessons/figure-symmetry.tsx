"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const CX = 120, CY = 120, RAD = 90;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [n, setN] = useState(6); // regular n-gon

  const verts = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI / 2) + (2 * Math.PI * i) / n;
    return [r2(CX + RAD * Math.cos(a)), r2(CY - RAD * Math.sin(a))] as [number, number];
  });
  const poly = verts.map(([x, y]) => `${x},${y}`).join(" ");

  const symLines = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI / 2) + (Math.PI * i) / n;
    return [r2(CX + RAD * Math.cos(a)), r2(CY - RAD * Math.sin(a)), r2(CX - RAD * Math.cos(a)), r2(CY + RAD * Math.sin(a))];
  });
  const turnAngle = 360 / n;
  const turnLabel = Number.isInteger(turnAngle) ? `${turnAngle}°` : `≈ ${turnAngle.toFixed(2)}°`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A shape has <strong>symmetry</strong>{" "}when a rotation or reflection maps it
        exactly onto itself. A regular n-gon has <strong>n lines of reflection
        symmetry</strong>{" "}and <strong>rotational symmetry</strong>{" "}of order n —
        turning it by 360°/n leaves it unchanged.
      </p>

      <Figure caption="A regular polygon carries onto itself under n reflections and n rotations.">
        <div className="flex flex-col items-center gap-6">
          <svg width={240} height={240} viewBox="0 0 240 240" role="img" aria-label={`Regular ${n}-gon with its ${n} dashed lines of symmetry`}>
            {symLines.map((l, i) => (
              <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="var(--band-upper)" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
            ))}
            <polygon points={poly} fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={2.5} />
            {verts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.5} fill={ACCENT} />)}
          </svg>

          <div className="grid grid-cols-2 gap-4 text-center">
            <Info label="lines of symmetry" value={`${n}`} />
            <Info label="rotational order" value={`${n} (turn ${turnLabel})`} />
          </div>

          <Stepper label="sides n" value={n} min={3} max={8} onChange={setN} />
        </div>
      </Figure>

      <h2>Mapping a figure onto itself</h2>
      <p>
        For this regular {n}-gon, {n} mirror lines and {n} rotations (including the
        full turn) each carry it exactly onto itself. Non-regular figures have fewer:
        a non-square rectangle has exactly 2 lines of symmetry and rotational
        symmetry of order 2. Describing these self-maps is a precise way to capture
        "how symmetric" a shape is.
      </p>

      <MathCheck>
        <p>
          The <strong>symmetries</strong>{" "}of a figure are the rotations and
          reflections that carry it onto itself (G-CO.3). A regular n-gon has n
          reflection lines and rotational symmetry of order n; identifying these maps
          describes the figure&apos;s symmetry group — foundational for congruence
          arguments.
        </p>
      </MathCheck>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">
      <div className="text-[10px] uppercase text-[var(--ink-faint)]">{label}</div>
      <div className="text-lg font-black" style={{ color: ACCENT }}>{value}</div>
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
