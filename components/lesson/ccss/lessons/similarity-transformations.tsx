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

  // Build BOTH triangles from the angles the steppers actually set, so the two
  // shapes joined by "~" really are similar and the corner labelled a1 really
  // measures a1. They were hard-coded and were not similar at all: the small
  // one measured ~69/45/66 and the large ~46/69/64, and a1 was printed at the
  // bottom-left of both even though those corners differ.
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const tri = (w: number, h: number) => {
    const pad = 16;
    const base = 100;
    const legLeft = valid ? (base * Math.sin(rad(a2))) / Math.sin(rad(a3)) : base;
    const apexX = legLeft * Math.cos(rad(a1));
    const apexY = legLeft * Math.sin(rad(a1));
    const minX = Math.min(0, apexX);
    const maxX = Math.max(base, apexX);
    const scale = Math.min((w - 2 * pad) / (maxX - minX), (h - 2 * pad) / Math.max(apexY, 1));
    const ox = pad - minX * scale;
    const oy = h - pad;
    return {
      points: `${ox},${oy} ${ox + base * scale},${oy} ${ox + apexX * scale},${oy - apexY * scale}`,
      leftX: ox + 6,
      rightX: ox + base * scale - 26,
      labelY: oy - 6,
    };
  };
  const small = tri(150, 120);
  const large = tri(190, 150);

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
          <div className="flex items-center gap-8">
            <svg width={150} height={120} viewBox="0 0 150 120" role="img" aria-label={`Smaller triangle with angles ${a1}, ${a2} and ${a3} degrees`}>
              <polygon points={small.points} fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={2.5} />
              <text x={small.leftX} y={small.labelY} fontSize={11} fill="var(--band-upper)">{a1}°</text>
              <text x={small.rightX} y={small.labelY} fontSize={11} fill="var(--band-middle)">{valid ? a2 : "?"}°</text>
            </svg>
            <span className="text-2xl font-black" style={{ color: ACCENT }}>~</span>
            <svg width={190} height={150} viewBox="0 0 190 150" role="img" aria-label={`Larger triangle with the same angles: ${a1}, ${a2} and ${a3} degrees`}>
              <polygon points={large.points} fill={ACCENT} fillOpacity={0.3} stroke={ACCENT} strokeWidth={2.5} />
              <text x={large.leftX} y={large.labelY} fontSize={12} fill="var(--band-upper)">{a1}°</text>
              <text x={large.rightX} y={large.labelY} fontSize={12} fill="var(--band-middle)">{valid ? a2 : "?"}°</text>
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
