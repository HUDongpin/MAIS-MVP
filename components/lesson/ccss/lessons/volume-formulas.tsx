"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

type Solid = "cylinder" | "cone" | "sphere" | "pyramid";

export default function Lesson() {
  const [solid, setSolid] = useState<Solid>("cylinder");
  const [r, setR] = useState(3);
  const [h, setH] = useState(5);

  const vol =
    solid === "cylinder" ? r2(Math.PI * r * r * h) :
    solid === "cone" ? r2((Math.PI * r * r * h) / 3) :
    solid === "sphere" ? r2((4 / 3) * Math.PI * r * r * r) :
    r2((2 * r) * (2 * r) * h / 3); // square pyramid, base side 2r

  // The pyramid's base side is 2r, which nothing on screen used to state — the
  // displayed value was the one solid a student could not reproduce from the
  // numbers in front of them (⅓·π·3²·5 ≈ 47.1 and ⅓·3²·5 = 15, but it read 60).
  const formula =
    solid === "cylinder" ? "V = πr²h" :
    solid === "cone" ? "V = ⅓πr²h" :
    solid === "sphere" ? "V = 4⁄3·πr³" :
    `V = ⅓·s²·h, base side s = 2r = ${2 * r}`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Every 3-D volume formula is really "<strong>how much fits inside</strong>."
        A cone is exactly <strong>one-third</strong>{" "}its enclosing cylinder; a sphere
        is 4⁄3·πr³. Change the radius and height and watch the volume respond.
      </p>

      <Figure caption="Cylinder, cone, sphere, pyramid — each has its own volume formula.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {(["cylinder", "cone", "sphere", "pyramid"] as Solid[]).map((s) => (
              <button key={s} type="button" onClick={() => setSolid(s)} className="rounded-lg border px-3 py-1.5 text-sm font-bold capitalize" style={solid === s ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s}</button>
            ))}
          </div>

          <svg width={180} height={180} viewBox="0 0 180 180" role="img" aria-label={solid}>
            {solid === "cylinder" && (<>
              <ellipse cx={90} cy={40} rx={45} ry={14} fill={ACCENT} fillOpacity={0.3} stroke={ACCENT} strokeWidth={2} />
              <path d="M 45 40 L 45 140 A 45 14 0 0 0 135 140 L 135 40" fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={2} />
            </>)}
            {solid === "cone" && (<>
              <path d="M 90 30 L 45 140 A 45 14 0 0 0 135 140 Z" fill={ACCENT} fillOpacity={0.2} stroke={ACCENT} strokeWidth={2} />
              <ellipse cx={90} cy={140} rx={45} ry={14} fill="none" stroke={ACCENT} strokeWidth={2} />
            </>)}
            {solid === "sphere" && (<>
              <circle cx={90} cy={90} r={55} fill={ACCENT} fillOpacity={0.2} stroke={ACCENT} strokeWidth={2} />
              <ellipse cx={90} cy={90} rx={55} ry={16} fill="none" stroke={ACCENT} strokeWidth={1.5} strokeDasharray="4 3" />
            </>)}
            {solid === "pyramid" && (<>
              <path d="M 90 30 L 40 145 L 140 145 Z" fill={ACCENT} fillOpacity={0.2} stroke={ACCENT} strokeWidth={2} />
              <path d="M 90 30 L 140 145 L 115 155 Z" fill={ACCENT} fillOpacity={0.1} stroke={ACCENT} strokeWidth={2} />
            </>)}
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">{formula}</div>
            <div className="mt-1 text-2xl font-black" style={{ color: ACCENT }}>≈ {vol}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* A square pyramid has no radius — r acts as its half-base here. */}
            <Stepper label={solid === "pyramid" ? "half-base r" : "radius r"} value={r} min={1} max={6} onChange={setR} />
            {solid !== "sphere" && <Stepper label="height h" value={h} min={1} max={9} onChange={setH} />}
          </div>
        </div>
      </Figure>

      <h2>The one-third and 4⁄3 factors</h2>
      <p>
        A cone and a cylinder with the same base and height hold liquid in ratio
        1:3 — pour three cones to fill the cylinder. That&apos;s why V_cone = ⅓πr²h.
        Pyramids share the ⅓ factor for the same reason. The sphere&apos;s 4⁄3·πr³
        comes from a Cavalieri comparison with a cylinder minus two cones.
      </p>

      <MathCheck>
        <p>
          The <strong>volume formulas</strong>{" "}(G-GMD.3): cylinder V = πr²h,{" "}
          <strong>pyramid and cone</strong>{" "}V = ⅓·(base area)·h, and{" "}
          <strong>sphere</strong>{" "}V = 4⁄3·πr³. The one-third factor for cones and
          pyramids and the sphere formula are justified by dissection and{" "}
          <strong>Cavalieri&apos;s principle</strong>, then applied to real solids.
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
