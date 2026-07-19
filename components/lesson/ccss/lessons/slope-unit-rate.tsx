"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const N = 10;
const CELL = 26;
const PAD = 30;
const SIZE = N * CELL + 2 * PAD;
const A = "var(--band-middle)";
const B = "var(--band-upper)";

export default function Lesson() {
  const [mA, setMA] = useState(2);
  const [mB, setMB] = useState(3);

  const sx = (x: number) => PAD + x * CELL;
  const sy = (y: number) => SIZE - PAD - y * CELL;
  const endX = (m: number) => Math.min(N, N / m);
  const faster = mA > mB ? "A" : mB > mA ? "B" : "tie";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        For a proportional relationship, the <strong>slope</strong>{" "}of its graph{" "}
        <em>is</em>{" "}the unit rate. A steeper line means a faster rate. Comparing two
        lines is comparing two unit rates at a glance.
      </p>

      <Figure caption="Two runners. The steeper line covers more distance each second — the bigger unit rate.">
        <div className="flex flex-col items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 320 }} role="img" aria-label="two proportional lines">
            {Array.from({ length: N + 1 }, (_, i) => (
              <g key={i} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} />
                <line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} />
              </g>
            ))}
            <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(endX(mA))} y2={sy(Math.min(N, mA * endX(mA)))} stroke={A} strokeWidth={3} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(endX(mB))} y2={sy(Math.min(N, mB * endX(mB)))} stroke={B} strokeWidth={3} />
            <text x={sx(N) - 4} y={sy(0) + 18} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">time (s)</text>
          </svg>

          <div className="grid grid-cols-2 gap-6 text-center">
            <div className="rounded-xl border-2 px-5 py-2" style={{ borderColor: A }}>
              <div className="text-xs font-bold uppercase" style={{ color: A }}>Runner A</div>
              <div className="font-mono text-xl font-black">{mA} m/s</div>
              <div className="text-xs text-[var(--ink-faint)]">slope = {mA}</div>
            </div>
            <div className="rounded-xl border-2 px-5 py-2" style={{ borderColor: B }}>
              <div className="text-xs font-bold uppercase" style={{ color: B }}>Runner B</div>
              <div className="font-mono text-xl font-black">{mB} m/s</div>
              <div className="text-xs text-[var(--ink-faint)]">slope = {mB}</div>
            </div>
          </div>

          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {faster === "tie" ? "Same speed — the lines overlap." : `Runner ${faster} is faster: a steeper line = a greater unit rate (m/s).`}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Speed A" value={mA} color={A} onChange={setMA} />
            <Stepper label="Speed B" value={mB} color={B} onChange={setMB} />
          </div>
        </div>
      </Figure>

      <h2>Steeper means faster</h2>
      <p>
        Runner A goes {mA} m each second; runner B, {mB}. On the graph those are
        the slopes — rise over run — and they equal the unit rates. The line that
        rises more steeply represents the larger rate.
      </p>

      <MathCheck>
        <p>
          Graphing a proportional relationship shows the <strong>unit rate as the
          slope</strong>{" "}of the line through the origin (8.EE.B.5). Comparing two
          proportional relationships in different representations — two graphs, or a
          graph and a table — reduces to comparing their slopes: here {mA} vs {mB}{" "}
          m/s.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1, Math.min(5, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-6 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 5} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
