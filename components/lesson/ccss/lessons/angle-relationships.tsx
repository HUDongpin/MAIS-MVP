"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A = "var(--band-middle)";
const B = "var(--band-upper)";
const CX = 130, CY = 110, R = 90;

const r2 = (n: number) => Math.round(n * 100) / 100;
function pt(deg: number, rad = R) {
  const a = (deg * Math.PI) / 180;
  return { x: r2(CX + rad * Math.cos(a)), y: r2(CY - rad * Math.sin(a)) };
}

type Rel = "comp" | "supp" | "vert";
const REL: Record<Rel, { name: string; total: number; verb: string }> = {
  comp: { name: "Complementary", total: 90, verb: "add to 90°" },
  supp: { name: "Supplementary", total: 180, verb: "add to 180°" },
  vert: { name: "Vertical", total: 0, verb: "are equal" },
};

export default function Lesson() {
  const [rel, setRel] = useState<Rel>("supp");
  const [a, setA] = useState(50);

  const other = rel === "vert" ? a : REL[rel].total - a;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        When lines and angles meet, they form predictable pairs.{" "}
        <strong>Complementary</strong>{" "}angles add to 90°, <strong>supplementary</strong>{" "}
        add to 180°, and <strong>vertical</strong>{" "}angles (across an X) are always
        equal. Knowing one gives the other.
      </p>

      <Figure caption="One angle is known; the relationship gives the other with a quick equation.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(Object.keys(REL) as Rel[]).map((rk) => (
              // Clamp the known angle into the new relationship's range. It was
              // not re-clamped, so Supplementary at 160° then Complementary gave
              // "160° + -70° = 90°" in the readout, the prose and the Math Check.
              <button key={rk} type="button" onClick={() => { setRel(rk); setA((p) => Math.min(p, rk === "supp" ? 160 : 80)); }} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={rel === rk ? { background: B, color: "white", borderColor: B } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{REL[rk].name}</button>
            ))}
          </div>

          <svg width="260" height="200" viewBox="0 0 260 200" role="img" aria-label={`${REL[rel].name} angles`}>
            {rel === "comp" && (
              <g>
                <line x1={CX} y1={CY} x2={pt(0).x} y2={pt(0).y} stroke="var(--ink)" strokeWidth={2.5} />
                <line x1={CX} y1={CY} x2={pt(90).x} y2={pt(90).y} stroke="var(--ink)" strokeWidth={2.5} />
                <line x1={CX} y1={CY} x2={pt(a).x} y2={pt(a).y} stroke={A} strokeWidth={2.5} />
                <text x={pt(a / 2, 45).x} y={pt(a / 2, 45).y} fontSize={12} fontWeight={800} fill={A}>{a}°</text>
                <text x={pt((a + 90) / 2, 45).x} y={pt((a + 90) / 2, 45).y} fontSize={12} fontWeight={800} fill={B}>{other}°</text>
              </g>
            )}
            {rel === "supp" && (
              <g>
                <line x1={pt(0).x} y1={pt(0).y} x2={pt(180).x} y2={pt(180).y} stroke="var(--ink)" strokeWidth={2.5} />
                <line x1={CX} y1={CY} x2={pt(a).x} y2={pt(a).y} stroke={A} strokeWidth={2.5} />
                <text x={pt(a / 2, 50).x} y={pt(a / 2, 50).y} fontSize={12} fontWeight={800} fill={A}>{a}°</text>
                <text x={pt((a + 180) / 2, 50).x} y={pt((a + 180) / 2, 50).y} fontSize={12} fontWeight={800} fill={B}>{other}°</text>
              </g>
            )}
            {rel === "vert" && (
              <g>
                {/* The second line is horizontal, so the opening between the two
                    lines really is a°. It used to be drawn at −30°/150°, making
                    the true opening a + 30 — an 80° wedge labelled "50°" — and
                    the partner label sat in the wrong sector entirely. The
                    vertical pair is now a/2 and a/2 + 180, which are genuinely
                    opposite. */}
                <line x1={pt(a).x} y1={pt(a).y} x2={pt(a + 180).x} y2={pt(a + 180).y} stroke="var(--ink)" strokeWidth={2.5} />
                <line x1={pt(0).x} y1={pt(0).y} x2={pt(180).x} y2={pt(180).y} stroke="var(--ink)" strokeWidth={2.5} />
                <text x={pt(a / 2, 45).x} y={pt(a / 2, 45).y} fontSize={12} fontWeight={800} fill={A}>{a}°</text>
                <text x={pt(a / 2 + 180, 45).x} y={pt(a / 2 + 180, 45).y} fontSize={12} fontWeight={800} fill={B}>{a}°</text>
              </g>
            )}
          </svg>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">
              {rel === "vert" ? <>both angles = <span style={{ color: B }}>{a}°</span></> : <>{a}° + <span style={{ color: B }}>{other}°</span> = {REL[rel].total}°</>}
            </div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              {rel === "vert" ? "Vertical angles are congruent, so the unknown equals the known." : `Since they ${REL[rel].verb}, the unknown is ${REL[rel].total} − ${a} = ${other}°.`}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">known angle: {a}°</span>
            <input type="range" min={20} max={rel === "comp" ? 80 : rel === "vert" ? 80 : 160} step={5} value={a} onChange={(e) => setA(Number(e.target.value))} className="w-56 accent-[var(--band-upper)]" aria-label="known angle" />
          </div>
        </div>
      </Figure>

      <h2>Finding unknown angles</h2>
      <p>
        These relationships turn geometry into algebra: set up an equation from the
        relationship and solve. {rel === "vert" ? `Vertical angles are equal, so the answer is ${a}°.` : `The two angles ${REL[rel].verb}, so subtract: ${REL[rel].total} − ${a} = ${other}°.`}
      </p>

      <MathCheck>
        <p>
          Angle relationships — <strong>complementary</strong>{" "}(sum 90°),{" "}
          <strong>supplementary</strong>{" "}(sum 180°), <strong>vertical</strong>{" "}
          (equal), and adjacent — let you write and solve simple equations for
          unknown angles (7.G.B.5). Here the pair {REL[rel].verb}, giving an unknown
          of {other}°.
        </p>
      </MathCheck>
    </div>
  );
}
