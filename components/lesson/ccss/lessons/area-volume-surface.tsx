"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
const BASE = "var(--band-middle)";

export default function Lesson() {
  const [b, setB] = useState(4);
  const [h, setH] = useState(3);
  const [len, setLen] = useState(6);

  const baseArea = (b * h) / 2;
  const volume = baseArea * len;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Volume of any <strong>prism</strong>{" "}follows one rule:{" "}
        <strong>base area × length</strong>{" "}(V = B·ℓ). A triangular prism is just a
        triangle&apos;s area, stretched. Find the base area first, then multiply by
        the length.
      </p>

      <Figure caption="A triangular prism: the triangle base slides along the length.">
        <div className="flex flex-col items-center gap-6">
          <svg width="240" height="160" viewBox="0 0 240 160" role="img" aria-label={`Triangular prism: base ${b}, triangle height ${h}, length ${len} — cross-section area ${baseArea}, volume ${volume}`}>
            {/* back triangle */}
            <polygon points="140,30 200,110 80,110" fill={BASE} fillOpacity={0.3} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {/* front triangle */}
            <polygon points="90,50 150,130 30,130" fill={BASE} fillOpacity={0.6} stroke="var(--ink)" strokeWidth={2} />
            {/* connecting edges */}
            <line x1="90" y1="50" x2="140" y2="30" stroke="var(--ink)" strokeWidth={2} />
            <line x1="150" y1="130" x2="200" y2="110" stroke="var(--ink)" strokeWidth={2} />
            <line x1="30" y1="130" x2="80" y2="110" stroke="var(--ink-soft)" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={90} y={148} textAnchor="middle" fontSize={12} fontWeight={800} fill={BASE} fontFamily="var(--font-mono)">b = {b}</text>
            <text x={22} y={92} fontSize={12} fontWeight={800} fill={BASE} fontFamily="var(--font-mono)">h={h}</text>
            <text x={175} y={135} fontSize={12} fontWeight={800} fill={ACCENT} fontFamily="var(--font-mono)">ℓ={len}</text>
          </svg>

          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[var(--line)] px-6 py-4 font-mono">
            <div className="text-[15px]"><span style={{ color: BASE }}>Base area</span> = ½ × {b} × {h} = {baseArea}</div>
            <div className="text-[15px]"><span style={{ color: ACCENT }}>Volume</span> = {baseArea} × {len}</div>
            <div className="text-3xl font-black" style={{ color: ACCENT }}>{volume} cubic units</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Base" value={b} min={2} max={8} onChange={setB} />
            <Stepper label="Triangle height" value={h} min={2} max={6} onChange={setH} />
            <Stepper label="Length" value={len} min={2} max={10} onChange={setLen} />
          </div>
        </div>
      </Figure>

      <h2>Base area, then length</h2>
      <p>
        The triangular base has area ½ × {b} × {h} = {baseArea}. Sliding it along a
        length of {len} sweeps out a volume of {baseArea} × {len} = {volume} cubic
        units. Every prism&apos;s volume works this way — even oddly shaped ones.
      </p>

      <MathCheck>
        <p>
          Solving area, surface-area, and volume problems for two- and
          three-dimensional objects (7.G.B.6) often reduces to a formula plus
          careful computation. For any prism, <strong>volume = base area × length</strong>: here ½ × {b} × {h} = {baseArea}, times {len}, gives {volume}.
          Composite figures are handled by decomposing into pieces you know.
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
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
