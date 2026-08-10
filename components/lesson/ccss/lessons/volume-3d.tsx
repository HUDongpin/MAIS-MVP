"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Shape = "cylinder" | "cone" | "sphere";
const ACCENT = "var(--band-upper)";

export default function Lesson() {
  const [shape, setShape] = useState<Shape>("cylinder");
  const [r, setR] = useState(3);
  const [h, setH] = useState(5);

  const vol =
    shape === "cylinder" ? Math.PI * r * r * h
    : shape === "cone" ? (1 / 3) * Math.PI * r * r * h
    : (4 / 3) * Math.PI * r * r * r;

  const formula =
    shape === "cylinder" ? <>V = πr²h = π({r})²({h})</>
    : shape === "cone" ? <>V = ⅓πr²h = ⅓·π({r})²({h})</>
    : <>V = 4⁄3·πr³ = 4⁄3·π({r})³</>;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Round solids have their own volume formulas, all built on π and the radius.
        A <strong>cone</strong>{" "}is exactly <strong>one-third</strong>{" "}of a
        cylinder with the same base and perpendicular height. A sphere is{" "}
        <strong>two-thirds</strong>{" "}of its circumscribed cylinder — the cylinder
        with the same radius and height equal to the sphere&apos;s diameter, 2r.
      </p>

      <Figure caption="Pick a solid and its dimensions. Each formula uses π and the radius.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["cylinder", "cone", "sphere"] as Shape[]).map((s) => (
              <button key={s} type="button" onClick={() => setShape(s)} aria-pressed={shape === s} className="rounded-lg border px-3 py-1.5 text-sm font-bold capitalize" style={shape === s ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s}</button>
            ))}
          </div>

          {/* The drawing is a fixed schematic: r and h are not depicted or labeled
              inside it, so the name says which solid is shown and nothing more. */}
          <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={`Drawing of a ${shape}`}>
            {shape === "cylinder" && (
              <g fill={ACCENT} fillOpacity={0.4} stroke="var(--ink)" strokeWidth={2}>
                <rect x={50} y={40} width={60} height={80} />
                <ellipse cx={80} cy={120} rx={30} ry={10} />
                <ellipse cx={80} cy={40} rx={30} ry={10} fill={ACCENT} fillOpacity={0.7} />
              </g>
            )}
            {shape === "cone" && (
              <g fill={ACCENT} fillOpacity={0.4} stroke="var(--ink)" strokeWidth={2}>
                <path d="M80,30 L112,120 L48,120 Z" />
                <ellipse cx={80} cy={120} rx={32} ry={10} />
              </g>
            )}
            {shape === "sphere" && (
              <g fill={ACCENT} fillOpacity={0.4} stroke="var(--ink)" strokeWidth={2}>
                <circle cx={80} cy={80} r={45} />
                <ellipse cx={80} cy={80} rx={45} ry={14} fill="none" strokeDasharray="4 3" />
              </g>
            )}
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-lg font-black">{formula}</div>
            <div className="mt-1 font-mono text-2xl font-black" style={{ color: ACCENT }}>≈ {vol.toFixed(1)} cubic units</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Radius" value={r} min={1} max={6} onChange={setR} />
            {shape !== "sphere" && <Stepper label="Height" value={h} min={2} max={8} onChange={setH} />}
          </div>
        </div>
      </Figure>

      <h2>All from π and the radius</h2>
      <p>
        {shape === "cylinder" && `The cylinder holds πr²h ≈ ${vol.toFixed(1)} — the base area (πr²) times the height.`}
        {shape === "cone" && `The cone is a third of that cylinder: ⅓πr²h ≈ ${vol.toFixed(1)}.`}
        {shape === "sphere" && `The sphere's volume is 4⁄3·πr³ ≈ ${vol.toFixed(1)} — it depends only on the radius.`}
      </p>

      <MathCheck>
        <p>
          The volume formulas for round solids (8.G.C.9):{" "}
          <strong>cylinder = πr²h</strong>, <strong>cone = ⅓πr²h</strong>, and{" "}
          <strong>sphere = 4⁄3·πr³</strong>. The cone is one-third of its enclosing
          cylinder with the same base and height. A sphere fills two-thirds of its
          circumscribed cylinder (radius r and height 2r) — relationships you can
          use to solve real-world volume problems.
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
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
