"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 6;
const CELL = 26;
const PAD = 20;
const SIZE = 2 * R * CELL + 2 * PAD;
const MOVE = "var(--band-upper)";
const TARGET = "var(--band-early)";

type P = [number, number];
const A: P[] = [[-4, 1], [-1, 2], [-3, 4]];
const reflectY = (p: P): P => [-p[0], p[1]];
const translate = (p: P): P => [p[0], p[1] - 5];

const STEP1 = A.map(reflectY);
const STEP2 = STEP1.map(translate); // this is the target B

export default function Lesson() {
  const [step, setStep] = useState(0);
  const current = step === 0 ? A : step === 1 ? STEP1 : STEP2;

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;
  const poly = (pts: P[]) => pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ");

  const labels = ["Start: triangle A", "Step 1: reflect over the y-axis", "Step 2: translate down 5 — now it lands on B"];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two figures are <strong>congruent</strong>{" "}if one can be moved exactly onto
        the other using <strong>rigid motions</strong>{" "}— a sequence of translations,
        reflections, and rotations. If such a sequence exists, they are the same
        size and shape.
      </p>

      <Figure caption="Walk through the moves that carry triangle A onto target B — proving they're congruent.">
        <div className="flex flex-col items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 340 }} role="img" aria-label="congruence by transformation">
            {Array.from({ length: 2 * R + 1 }, (_, i) => {
              const v = i - R;
              return (
                <g key={v} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                  <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
                </g>
              );
            })}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* target B outline */}
            <polygon points={poly(STEP2)} fill="none" stroke={TARGET} strokeWidth={2.5} strokeDasharray="5 4" />
            {/* current moving triangle */}
            <polygon points={poly(current)} fill={MOVE} fillOpacity={0.6} stroke={MOVE} strokeWidth={2} style={{ transition: "all 0.4s ease" }} />
            <text x={sx(STEP2[1][0]) + 6} y={sy(STEP2[1][1])} fontSize={12} fontWeight={800} fill={TARGET}>B</text>
          </svg>

          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">{labels[step]}</p>

          <div className="flex items-center gap-2">
            {[0, 1, 2].map((s) => (
              <button key={s} type="button" onClick={() => setStep(s)} className="grid h-9 w-9 place-items-center rounded-lg border text-sm font-black" style={step === s ? { background: MOVE, color: "white", borderColor: MOVE } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s}</button>
            ))}
          </div>

          {step === 2 && <div className="rounded-xl px-5 py-2 text-lg font-black" style={{ color: MOVE }}>A ≅ B ✓ (congruent)</div>}
        </div>
      </Figure>

      <h2>A recipe of rigid motions</h2>
      <p>
        Reflecting triangle A over the y-axis and then translating it down 5 lands
        it exactly on B. Because only rigid motions were used, every side and angle
        matched — that <em>is</em>{" "}what congruent means.
      </p>

      <MathCheck>
        <p>
          Two two-dimensional figures are <strong>congruent</strong>{" "}if a{" "}
          <strong>sequence of rotations, reflections, and translations</strong>{" "}
          maps one onto the other (8.G.A.2). Since those motions preserve length and
          angle, congruent figures have equal corresponding sides and angles. Finding
          the sequence proves the congruence.
        </p>
      </MathCheck>
    </div>
  );
}
