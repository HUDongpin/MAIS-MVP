"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { buildMathAngleContract, serializeMathAngleContract } from "@/lib/mathDiagramGeometry";

const ACCENT = "var(--band-high)";

type Pt = [number, number];
const V0: Pt = [20, 110], V1: Pt = [130, 110], V2: Pt = [50, 25];
const v0Angle = buildMathAngleContract({
  id: "congruence-v0-angle",
  origin: { x: V0[0], y: V0[1] },
  radius: 15,
  startRay: { x: V1[0] - V0[0], y: V1[1] - V0[1] },
  endRay: { x: V2[0] - V0[0], y: V2[1] - V0[1] },
  sweepRadians: Math.atan2(85, 30)
});
const v1Angle = buildMathAngleContract({
  id: "congruence-v1-angle",
  origin: { x: V1[0], y: V1[1] },
  radius: 15,
  startRay: { x: V0[0] - V1[0], y: V0[1] - V1[1] },
  endRay: { x: V2[0] - V1[0], y: V2[1] - V1[1] },
  sweepRadians: -Math.acos(80 / Math.hypot(80, 85))
});
const v1OuterAngle = buildMathAngleContract({ ...v1Angle, id: "congruence-v1-outer-angle", radius: 20 });

function Ticks({ p, q, n }: { p: Pt; q: Pt; n: number }) {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;

  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const off = (i - (n - 1) / 2) * 5;
        const cx = mx + ux * off, cy = my + uy * off;
        return <line key={i} x1={cx - px * 6} y1={cy - py * 6} x2={cx + px * 6} y2={cy + py * 6} stroke="var(--band-upper)" strokeWidth={3} />;
      })}
    </>
  );
}

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

          <div className="flex max-w-full flex-wrap items-center justify-center gap-4 sm:gap-8">
            {[0, 1].map((k) => (
              <svg key={k} width={150} height={130} viewBox="0 0 150 130" role="img" aria-label={`triangle ${k + 1}`}>
                <polygon points={`${V0[0]},${V0[1]} ${V1[0]},${V1[1]} ${V2[0]},${V2[1]}`} fill={ACCENT} fillOpacity={k === 0 ? 0.15 : 0.3} stroke={ACCENT} strokeWidth={2.5} />
                <Ticks p={V0} q={V1} n={1} />
                {(c.name === "SSS" || c.name === "SAS") && <Ticks p={V0} q={V2} n={2} />}
                {c.name === "SSS" && <Ticks p={V1} q={V2} n={3} />}
                {(c.name === "ASA" || c.name === "SAS") && <path data-diagram-angle-arc data-math-angle-contract={serializeMathAngleContract(v0Angle)} d="M 35 110 A 15 15 0 0 0 24.992 95.855" fill="none" stroke="var(--band-middle)" strokeWidth={2} />}
                {c.name === "ASA" && <path data-diagram-angle-arc data-math-angle-contract={serializeMathAngleContract(v1Angle)} d="M 115 110 A 15 15 0 0 1 119.720 99.077" fill="none" stroke="var(--band-middle)" strokeWidth={2} />}
                {c.name === "ASA" && <path data-diagram-angle-arc data-math-angle-contract={serializeMathAngleContract(v1OuterAngle)} d="M 110 110 A 20 20 0 0 1 116.293 95.436" fill="none" stroke="var(--band-middle)" strokeWidth={2} />}
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
