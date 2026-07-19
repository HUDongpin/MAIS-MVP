"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const CRITERIA = [
  { name: "SSS", full: "Side-Side-Side", desc: "All three pairs of sides equal → triangles congruent.", marks: ["side", "side", "side"] },
  { name: "SAS", full: "Side-Angle-Side", desc: "Two sides and the included angle equal → congruent.", marks: ["side", "angle", "side"] },
  { name: "ASA", full: "Angle-Side-Angle", desc: "Two angles and the included side equal → congruent.", marks: ["angle", "side", "angle"] },
];

export default function Lesson() {
  const [idx, setIdx] = useState(1);
  const c = CRITERIA[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        You don&apos;t need all six measurements to know two triangles are{" "}
        <strong>congruent</strong>. Just the right three will do:{" "}
        <strong>SSS, SAS, or ASA</strong>. Each shortcut is really a theorem —
        provable from the fact that rigid motions preserve length and angle.
      </p>

      <Figure caption="Match the right three parts and the triangles must be congruent — no need to check the rest.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {CRITERIA.map((cr, i) => (
              <button key={cr.name} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-4 py-1.5 font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{cr.name}</button>
            ))}
          </div>

          <div className="flex items-center gap-8">
            {[0, 1].map((k) => (
              <svg key={k} width={150} height={130} viewBox="0 0 150 130" role="img" aria-label={`triangle ${k + 1}`}>
                <polygon points="20,110 130,110 50,25" fill={ACCENT} fillOpacity={k === 0 ? 0.15 : 0.3} stroke={ACCENT} strokeWidth={2.5} />
                {/* mark bottom side */}
                {(c.marks[0] === "side" || c.marks[2] === "side" || c.marks[1] === "side") && (
                  <line x1={70} y1={110} x2={80} y2={110} stroke="var(--band-upper)" strokeWidth={3} />
                )}
                {c.name === "SAS" && <line x1={35} y1={67} x2={45} y2={72} stroke="var(--band-upper)" strokeWidth={3} />}
                {(c.name === "ASA" || c.name === "SAS") && <path d="M 35 110 A 15 15 0 0 1 45 100" fill="none" stroke="var(--band-middle)" strokeWidth={2} />}
                {c.name === "ASA" && <path d="M 115 110 A 15 15 0 0 0 108 98" fill="none" stroke="var(--band-middle)" strokeWidth={2} />}
              </svg>
            ))}
          </div>
          <div className="text-lg font-black" style={{ color: ACCENT }}>△₁ ≅ △₂</div>

          <div className="rounded-xl border-2 px-6 py-2 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-bold">{c.name} — {c.full}</div>
            <div className="max-w-sm text-sm text-[var(--ink-soft)]">{c.desc}</div>
          </div>
        </div>
      </Figure>

      <h2>From rigid motions to CPCTC</h2>
      <p>
        Two figures are congruent when a sequence of rigid motions maps one onto the
        other — and rigid motions never change length or angle. That&apos;s why{" "}
        {c.name} forces congruence, and why <strong>corresponding parts of
        congruent triangles are congruent</strong>{" "}(CPCTC) once you&apos;ve
        established it. Note SSA is <em>not</em>{" "}a valid criterion.
      </p>

      <MathCheck>
        <p>
          Two figures are <strong>congruent</strong>{" "}iff rigid motions map one to
          the other (G-CO.6), which shows corresponding sides and angles are equal
          (G-CO.7). The shortcuts <strong>ASA, SAS, and SSS</strong>{" "}for triangles
          follow from the definition of congruence in terms of rigid motions
          (G-CO.8).
        </p>
      </MathCheck>
    </div>
  );
}
