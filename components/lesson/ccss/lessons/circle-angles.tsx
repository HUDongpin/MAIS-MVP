"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const CX = 130, CY = 130, RAD = 100;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [arc, setArc] = useState(100); // central angle degrees subtending the arc

  const central = arc;
  const inscribed = r2(arc / 2);

  // Points on circle: A at 210°, B at 210°+arc, both endpoints of the arc; inscribed vertex at top
  const pt = (deg: number) => [r2(CX + RAD * Math.cos((deg * Math.PI) / 180)), r2(CY - RAD * Math.sin((deg * Math.PI) / 180))];
  const A = pt(200);
  const B = pt(200 + arc);
  const V = pt(200 + arc + (360 - arc) / 2); // inscribed vertex on the major arc

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Every circle is a scaled copy of every other — all circles are{" "}
        <strong>similar</strong>. Inside one, a beautiful rule links angles to arcs:
        an <strong>inscribed angle is exactly half</strong>{" "}the central angle that
        cuts the same arc.
      </p>

      <Figure caption="The central angle (at the center) is twice any inscribed angle standing on the same arc.">
        <div className="flex flex-col items-center gap-6">
          <svg width={260} height={260} viewBox="0 0 260 260" role="img" aria-label={`Circle with a ${central} degree central angle and the ${inscribed} degree inscribed angle standing on the same arc`}>
            <circle cx={CX} cy={CY} r={RAD} fill="none" stroke="var(--line)" strokeWidth={2} />
            {/* central angle */}
            <line x1={CX} y1={CY} x2={A[0]} y2={A[1]} stroke={ACCENT} strokeWidth={2} />
            <line x1={CX} y1={CY} x2={B[0]} y2={B[1]} stroke={ACCENT} strokeWidth={2} />
            <circle cx={CX} cy={CY} r={4} fill="var(--ink)" />
            {/* inscribed angle */}
            <line x1={V[0]} y1={V[1]} x2={A[0]} y2={A[1]} stroke="var(--band-upper)" strokeWidth={2} />
            <line x1={V[0]} y1={V[1]} x2={B[0]} y2={B[1]} stroke="var(--band-upper)" strokeWidth={2} />
            <circle cx={A[0]} cy={A[1]} r={4} fill="var(--ink)" />
            <circle cx={B[0]} cy={B[1]} r={4} fill="var(--ink)" />
            <circle cx={V[0]} cy={V[1]} r={4} fill="var(--band-upper)" />
          </svg>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2"><div className="text-xs uppercase" style={{ color: ACCENT }}>central angle</div><div className="text-xl font-black" style={{ color: ACCENT }}>{central}°</div></div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2"><div className="text-xs uppercase" style={{ color: "var(--band-upper)" }}>inscribed angle</div><div className="text-xl font-black" style={{ color: "var(--band-upper)" }}>{inscribed}°</div></div>
          </div>

          <Slider label="arc (central angle)" value={arc} onChange={setArc} />
        </div>
      </Figure>

      <h2>Angles, radii, and chords</h2>
      <p>
        The inscribed angle {inscribed}° is half the central angle {central}° over
        the same arc — so all inscribed angles on that arc are equal, and an angle in
        a semicircle is always 90°. A <strong>tangent</strong>{" "}meets the radius at
        its point of contact at a right angle, and a radius perpendicular to a chord
        bisects it.
      </p>

      <MathCheck>
        <p>
          <strong>All circles are similar</strong>{" "}(G-C.1) — any two differ only by
          a dilation. Among the relationships of <strong>angles, radii, and
          chords</strong>{" "}(G-C.2): the inscribed angle is half the central angle on
          the same arc, angles in a semicircle are right, a radius to a tangent is
          perpendicular, and a radius perpendicular to a chord bisects it.
        </p>
      </MathCheck>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}: <span style={{ color: ACCENT }}>{value}°</span></span>
      <input type="range" min={40} max={160} step={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-56" style={{ accentColor: ACCENT }} aria-label={label} />
    </div>
  );
}
