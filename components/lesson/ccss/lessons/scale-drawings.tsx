"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CELL = 26;
const DRAW = "var(--band-middle)";
const ACTUAL = "var(--band-upper)";

export default function Lesson() {
  const [dw, setDw] = useState(4);
  const [dh, setDh] = useState(3);
  const [scale, setScale] = useState(3); // 1 drawing unit = scale feet

  const aw = dw * scale, ah = dh * scale;
  const drawArea = dw * dh;
  const actualArea = aw * ah;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>scale drawing</strong>{" "}is a shrunken (or enlarged) copy of a
        real object. The <strong>scale</strong>{" "}tells you how much each drawing
        unit stands for. Multiply drawing lengths by the scale to get{" "}
        <strong>actual</strong>{" "}lengths.
      </p>

      <Figure caption="Every length in the drawing multiplies by the scale to become the real length.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2 text-sm font-bold">
            Scale: 1 grid unit = {scale} feet
          </div>

          <svg width={dw * CELL + 4} height={dh * CELL + 4} viewBox={`0 0 ${dw * CELL + 4} ${dh * CELL + 4}`} role="img" aria-label={`${dw} by ${dh} scale drawing`}>
            <g transform="translate(2,2)">
              {Array.from({ length: dh }, (_, r) => Array.from({ length: dw }, (_, c) => (
                <rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={DRAW} fillOpacity={0.25} stroke="var(--line)" strokeWidth={1} />
              )))}
              <rect x={0} y={0} width={dw * CELL} height={dh * CELL} fill="none" stroke={DRAW} strokeWidth={2.5} />
            </g>
          </svg>

          <div className="grid grid-cols-2 gap-6 text-center">
            <div className="rounded-xl border-2 px-5 py-3" style={{ borderColor: DRAW }}>
              <div className="text-xs font-bold uppercase" style={{ color: DRAW }}>Drawing</div>
              <div className="font-mono text-lg font-black">{dw} × {dh} units</div>
              <div className="text-xs text-[var(--ink-faint)]">area {drawArea} sq units</div>
            </div>
            <div className="rounded-xl border-2 px-5 py-3" style={{ borderColor: ACTUAL }}>
              <div className="text-xs font-bold uppercase" style={{ color: ACTUAL }}>Actual</div>
              <div className="font-mono text-lg font-black">{aw} × {ah} ft</div>
              <div className="text-xs text-[var(--ink-faint)]">area {actualArea} sq ft</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Width" value={dw} min={2} max={7} onChange={setDw} />
            <Stepper label="Height" value={dh} min={2} max={5} onChange={setDh} />
            <Stepper label="Scale (ft)" value={scale} min={2} max={6} onChange={setScale} />
          </div>
        </div>
      </Figure>

      <h2>Lengths scale once, area scales twice</h2>
      <p>
        Each length is {scale} times bigger, so {dw} units → {aw} ft. But the{" "}
        <strong>area</strong>{" "}grows by the scale <em>squared</em>:{" "}
        {scale}² = {scale * scale}, so {drawArea} sq units → {actualArea} sq ft.
        That is why doubling a drawing quadruples its area.
      </p>

      <MathCheck>
        <p>
          Scale drawings (7.G.A.1) reproduce a figure at a constant{" "}
          <strong>scale factor</strong>. Actual length = drawing length × scale,
          so lengths are proportional. Because area is length × length, area scales
          by the factor <strong>squared</strong>{" "}— here ×{scale} for lengths and
          ×{scale * scale} for area.
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
