"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const L = "var(--band-middle)";
const Rr = "var(--band-early)";

export default function Lesson() {
  const [a, setA] = useState(4);
  const [b, setB] = useState(3);
  const [right, setRight] = useState(7);
  const [solve, setSolve] = useState(false);

  const left = a + b;
  const effRight = solve ? left : right; // in solve mode the box equals whatever balances
  const balanced = left === effRight;
  const tilt = Math.max(-11, Math.min(11, (effRight - left) * 4)); // heavier side dips

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>equal sign</strong>{" "}is not “here comes the answer.” It means{" "}
        <strong>the same as</strong>{" "}— both sides are worth exactly the same,
        like a balanced scale.
      </p>

      <Figure caption="When the two sides are equal, the scale is level. If one side is bigger, it tips down.">
        <div className="flex flex-col items-center gap-6">
          <svg className="mx-auto max-w-none self-start" width="320" height="180" viewBox="0 0 320 180" role="img" aria-label={`balance ${left} versus ${effRight}`}>
            {/* base */}
            <polygon points="160,150 140,175 180,175" fill="var(--ink-soft)" />
            <rect x="156" y="70" width="8" height="82" fill="var(--ink-soft)" />
            {/* beam */}
            <g transform={`rotate(${tilt} 160 72)`} style={{ transition: "transform 0.45s ease" }}>
              <rect x="40" y="68" width="240" height="8" rx="4" fill="var(--ink)" />
              {/* left pan */}
              <line x1="70" y1="72" x2="70" y2="100" stroke="var(--ink-soft)" strokeWidth="2" />
              <rect x="34" y="100" width="72" height="30" rx="8" fill={L} opacity="0.9" />
              <text x="70" y="120" textAnchor="middle" fontSize="16" fontWeight="800" fill="white" fontFamily="var(--font-mono)">{a} + {b}</text>
              {/* right pan */}
              <line x1="250" y1="72" x2="250" y2="100" stroke="var(--ink-soft)" strokeWidth="2" />
              <rect x="214" y="100" width="72" height="30" rx="8" fill={Rr} opacity="0.9" />
              <text x="250" y="120" textAnchor="middle" fontSize="16" fontWeight="800" fill="white" fontFamily="var(--font-mono)">{solve ? effRight : right}</text>
            </g>
          </svg>

          <div className="text-center">
            <div className="font-mono text-3xl font-black">
              <span style={{ color: L }}>{a} + {b}</span>{" "}
              <span style={{ color: balanced ? "var(--band-upper)" : "var(--ink-faint)" }}>=</span>{" "}
              <span style={{ color: Rr }}>{solve ? effRight : right}</span>
            </div>
            <p className="mt-1 text-lg font-black" style={{ color: balanced ? "var(--band-upper)" : Rr }}>
              {balanced ? "Balanced — this is TRUE ✓" : `${left} ≠ ${right} — this is FALSE`}
            </p>
          </div>

          <button type="button" onClick={() => setSolve((s) => !s)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "var(--brand)" }}>
            {solve ? "Set the right side myself" : "Fill the box to balance →"}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="a" value={a} min={0} max={10} color={L} onChange={(v) => setA(v)} />
            <Stepper label="b" value={b} min={0} max={10} color={L} onChange={(v) => setB(v)} />
            {!solve && <Stepper label="right side" value={right} min={0} max={20} color={Rr} onChange={setRight} />}
          </div>
        </div>
      </Figure>

      <h2>Same on both sides</h2>
      <p>
        {solve
          ? `To balance ${a} + ${b}, the box must hold ${left}. Now both sides are ${left}.`
          : balanced
            ? `Both sides equal ${left}, so the scale is level and the sentence is true.`
            : `One side is ${left} and the other is ${right} — not the same, so the scale tips and the sentence is false.`}
      </p>

      <MathCheck>
        <p>
          The equal sign means <strong>“the same amount as,”</strong>{" "}not “compute
          the answer” — an equation is true only when both sides have equal value
          (1.OA.D.7). Finding the number that makes a scale balance is solving for
          the <strong>unknown</strong>{" "}in an equation like {a} + □ = {left}{" "}
          (1.OA.D.8). Equations can even have the operation on the right, like{" "}
          {left} = {a} + {b}.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
