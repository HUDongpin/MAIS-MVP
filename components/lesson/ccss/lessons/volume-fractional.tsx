"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";

function fmtFrac(halves: number) {
  const whole = Math.floor(halves / 2);
  const half = halves % 2;
  if (half === 0) return `${whole}`;
  return whole === 0 ? "½" : `${whole}½`;
}
function fmt(n: number) {
  return Number(n.toFixed(3)).toString();
}

export default function Lesson() {
  // dimensions in half-units
  const [lh, setLh] = useState(3); // 1½
  const [wh, setWh] = useState(4); // 2
  const [hh, setHh] = useState(6); // 3

  const l = lh / 2, w = wh / 2, h = hh / 2;
  const base = l * w;
  const vol = l * w * h;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Volume works even when the edges are <strong>fractions</strong>. A box
        that is 1½ units on a side is filled with little cubes ½ unit across. The
        formula never changes: <strong>V = length × width × height</strong>.
      </p>

      <Figure caption="A right rectangular prism. Multiply the three edge lengths — even fractional ones.">
        <div className="flex flex-col items-center gap-6">
          <svg width="220" height="180" viewBox="0 0 220 180" role="img" aria-label={`prism ${fmtFrac(lh)} by ${fmtFrac(wh)} by ${fmtFrac(hh)}`}>
            {/* isometric box */}
            <polygon points="40,60 140,60 180,40 80,40" fill={ACCENT} fillOpacity={0.25} stroke="var(--ink)" strokeWidth={2} />
            <polygon points="40,60 140,60 140,150 40,150" fill={ACCENT} fillOpacity={0.5} stroke="var(--ink)" strokeWidth={2} />
            <polygon points="140,60 180,40 180,130 140,150" fill={ACCENT} fillOpacity={0.7} stroke="var(--ink)" strokeWidth={2} />
            <text x={90} y={168} textAnchor="middle" fontSize={13} fontWeight={800} fontFamily="var(--font-mono)">l = {fmtFrac(lh)}</text>
            <text x={200} y={90} textAnchor="middle" fontSize={13} fontWeight={800} fontFamily="var(--font-mono)">h = {fmtFrac(hh)}</text>
            <text x={165} y={30} textAnchor="middle" fontSize={13} fontWeight={800} fontFamily="var(--font-mono)">w = {fmtFrac(wh)}</text>
          </svg>

          <div className="text-center">
            <div className="font-mono text-xl font-black">V = {fmtFrac(lh)} × {fmtFrac(wh)} × {fmtFrac(hh)} = <span style={{ color: ACCENT }}>{fmt(vol)}</span> cubic units</div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">= base area ({fmt(base)}) × height ({fmt(h)}) = B × h</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Length" halves={lh} onChange={setLh} />
            <Stepper label="Width" halves={wh} onChange={setWh} />
            <Stepper label="Height" halves={hh} onChange={setHh} />
          </div>
        </div>
      </Figure>

      <h2>Fractional cubes fill it up</h2>
      <p>
        You can pack the box with cubes that are ½ unit on each side (each worth ⅛
        of a unit cube). Counting them gives the same answer as{" "}
        {fmtFrac(lh)} × {fmtFrac(wh)} × {fmtFrac(hh)} = {fmt(vol)} cubic units.
      </p>

      <MathCheck>
        <p>
          The volume of a right rectangular prism with <strong>fractional edge
          lengths</strong>{" "}is still V = l × w × h (6.G.A.2), and it equals the
          number of unit-fraction cubes that fill it. It also equals{" "}
          <strong>B × h</strong>, the base area times the height: here {fmt(base)} × {fmt(h)} = {fmt(vol)}.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, halves, onChange }: { label: string; halves: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1, Math.min(8, v)));
  const fmtF = (h: number) => { const w = Math.floor(h / 2); const hf = h % 2; return hf === 0 ? `${w}` : w === 0 ? "½" : `${w}½`; };
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(halves - 1)} disabled={halves <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-xl font-black tabular-nums">{fmtF(halves)}</span>
        <button type="button" onClick={() => set(halves + 1)} disabled={halves >= 8} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
