"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const FILL = "var(--band-middle)";
const S = 26; // px per unit
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [a, setA] = useState(5);
  const [b, setB] = useState(4);
  const [c, setC] = useState(6);

  const sides = [a, b, c];
  const maxSide = Math.max(...sides);
  const valid = sides.reduce((s, v) => s + v, 0) - maxSide > maxSide;

  // place side a on base, find third vertex
  const vx = valid ? r2((a * a + b * b - c * c) / (2 * a)) : 0;
  const vyRaw = valid ? b * b - vx * vx : 0;
  const vy = valid && vyRaw > 0 ? r2(Math.sqrt(vyRaw)) : 0;

  const pad = 20;
  // Derive the horizontal extent from the apex rather than assuming 0 ≤ vx ≤ a:
  // an obtuse triangle puts the apex outside the base span (a = 5, b = 4, c = 8
  // gives vx = −2.3) and used to be drawn off the left edge of the viewBox.
  const minX = Math.min(0, vx);
  const maxX = Math.max(a, vx);
  const ox = pad - minX * S;
  const w = (maxX - minX) * S + 2 * pad;
  const h = (vy || 3) * S + 2 * pad;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Can any three lengths form a triangle? Not always! The{" "}
        <strong>triangle inequality</strong>{" "}says the two shorter sides together
        must be <strong>longer</strong>{" "}than the longest side — otherwise they
        cannot meet.
      </p>

      <Figure caption="Set three side lengths. If they satisfy the triangle inequality, they determine one triangle up to congruence and reflection.">
        <div className="flex flex-col items-center gap-6">
          {valid ? (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="max-w-full" role="img" aria-label={`Triangle with sides ${a}, ${b} and ${c}`}>
              <polygon points={`${ox},${h - pad} ${ox + a * S},${h - pad} ${ox + vx * S},${h - pad - vy * S}`} fill={FILL} fillOpacity={0.65} stroke="var(--ink)" strokeWidth={2} />
              <text x={ox + (a * S) / 2} y={h - pad + 15} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-mono)">{a}</text>
              <text x={(ox + ox + vx * S) / 2 - 8} y={h - pad - (vy * S) / 2} fontSize={12} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-mono)">{b}</text>
              <text x={(ox + a * S + ox + vx * S) / 2 + 4} y={h - pad - (vy * S) / 2} fontSize={12} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-mono)">{c}</text>
            </svg>
          ) : (
            <div className="grid h-32 w-full max-w-xs place-items-center rounded-xl border-2 border-dashed border-[var(--band-early)] text-center">
              <div>
                <div className="text-3xl">🚫</div>
                <div className="text-sm font-bold" style={{ color: "var(--band-early)" }}>No triangle possible</div>
              </div>
            </div>
          )}

          <div className="rounded-xl px-5 py-2 text-center font-mono text-[15px] font-bold" style={{ color: valid ? "var(--band-upper)" : "var(--band-early)" }}>
            {[...sides].sort((x, y) => x - y).slice(0, 2).join(" + ")} = {[...sides].sort((x, y) => x - y).slice(0, 2).reduce((s, v) => s + v, 0)} {valid ? ">" : "≤"} {maxSide} (longest)
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Side a" value={a} onChange={setA} />
            <Stepper label="Side b" value={b} onChange={setB} />
            <Stepper label="Side c" value={c} onChange={setC} />
          </div>
        </div>
      </Figure>

      <h2>Two short sides must reach</h2>
      <p>
        {valid
          ? `The two shorter sides add to more than ${maxSide}, so they can meet — and these three lengths determine one triangle up to congruence (a reflected drawing is the same shape and size).`
          : `The two shorter sides do not add up to more than ${maxSide}, so they can never close up into a triangle.`}
      </p>

      <MathCheck>
        <p>
          Drawing shapes from given conditions (7.G.A.2) includes deciding when
          three side lengths determine a triangle. By the{" "}
          <strong>triangle inequality</strong>, three lengths form a triangle only
          if the sum of the two shorter sides exceeds the longest. When they do, the
          triangle is <strong>unique up to congruence</strong>; otherwise no triangle exists.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(2, Math.min(9, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 2} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 9} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
