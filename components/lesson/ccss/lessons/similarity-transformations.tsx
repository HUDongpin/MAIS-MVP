"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [a1, setA1] = useState(40);
  const [a2, setA2] = useState(70);
  const a3 = 180 - a1 - a2;
  const valid = a3 > 0;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two figures are <strong>similar</strong>{" "}if a <strong>similarity
        transformation</strong>{" "}— a dilation followed by a rigid motion — maps one
        onto the other. For triangles there&apos;s a beautiful shortcut: if two
        angles match, the triangles are similar (<strong>AA</strong>).
      </p>

      <Figure caption="Two triangles with the same two angles are similar — corresponding sides are proportional.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex max-w-full flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <svg width={150} height={120} viewBox="0 0 150 120" role="img" aria-label="small triangle">
              <polygon points="20,100 110,100 45,35" fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={2.5} />
              <text x={26} y={94} fontSize={11} fill="var(--band-upper)">{a1}°</text>
              <text x={92} y={94} fontSize={11} fill="var(--band-middle)">{valid ? a2 : "?"}°</text>
            </svg>
            <span className="text-2xl font-black" style={{ color: ACCENT }}>~</span>
            <svg width={190} height={150} viewBox="0 0 190 150" role="img" aria-label="large triangle">
              <polygon points="20,130 160,130 120,25" fill={ACCENT} fillOpacity={0.3} stroke={ACCENT} strokeWidth={2.5} />
              <text x={26} y={124} fontSize={12} fill="var(--band-upper)">{a1}°</text>
              <text x={135} y={124} fontSize={12} fill="var(--band-middle)">{valid ? a2 : "?"}°</text>
            </svg>
          </div>

          <div className="rounded-xl border-2 px-6 py-2 text-center" style={{ borderColor: ACCENT }}>
            {valid ? (
              <span>Two equal angles ({a1}° and {a2}°) ⟹ <strong style={{ color: ACCENT }}>similar by AA</strong>. Third angles both {a3}°.</span>
            ) : (
              <span className="font-bold" style={{ color: ACCENT }}>Angles must total &lt; 180°.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="angle 1" value={a1} min={20} max={110} onChange={setA1} />
            <Stepper label="angle 2" value={a2} min={20} max={110} onChange={setA2} />
          </div>
        </div>
      </Figure>

      <h2>Similarity = dilation + rigid motion</h2>
      <p>
        Because a similarity transformation is a dilation (scaling by some factor k)
        composed with a congruence, similar figures have <strong>equal
        corresponding angles</strong>{" "}and <strong>proportional corresponding
        sides</strong>. AA works because fixing two angles fixes the third ({a3}°
        here), and scaling can then match the sizes exactly.
      </p>

      <MathCheck>
        <p>
          <strong>Similarity</strong>{" "}is defined by a <strong>similarity
          transformation</strong>{" "}— a dilation combined with rigid motions (G-SRT.2)
          — giving equal angles and proportional sides. The <strong>AA
          criterion</strong>{" "}(two pairs of equal angles) is enough to conclude two
          triangles are similar (G-SRT.3).
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
        <button type="button" onClick={() => onChange(Math.max(min, value - 5))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}°</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 5))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
