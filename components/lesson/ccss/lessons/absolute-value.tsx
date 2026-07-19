"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 8;
const PAD = 24;
const STEP = 30;
const W = 2 * R * STEP + 2 * PAD;
const A = "var(--band-middle)";
const B = "var(--band-early)";

export default function Lesson() {
  const [a, setA] = useState(-6);
  const [b, setB] = useState(-3);
  const x = (n: number) => PAD + (n + R) * STEP;

  const symbol = a < b ? "<" : a > b ? ">" : "=";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        On the number line, <strong>farther left means less</strong>: −6 &lt; −3,
        even though 6 &gt; 3. But <strong>absolute value</strong>{" "}— the{" "}
        <em>distance</em>{" "}from zero — ignores direction, so |−6| = 6.
      </p>

      <Figure caption="Order is left-to-right; absolute value is the distance from 0 (the arrows).">
        <div className="flex flex-col items-center gap-6">
          <div className="w-full overflow-x-auto">
            <svg width={W} height={110} viewBox={`0 0 ${W} 110`} className="mx-auto" role="img" aria-label={`a at ${a}, b at ${b}`}>
              <line x1={PAD} y1={70} x2={W - PAD} y2={70} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: 2 * R + 1 }, (_, i) => {
                const n = i - R;
                return (
                  <g key={n}>
                    <line x1={x(n)} y1={65} x2={x(n)} y2={75} stroke={n === 0 ? "var(--ink)" : "var(--ink-soft)"} strokeWidth={n === 0 ? 2 : 1} />
                    {n % 2 === 0 && <text x={x(n)} y={90} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{n}</text>}
                  </g>
                );
              })}
              {/* distance arrows */}
              <line x1={x(0)} y1={50} x2={x(a)} y2={50} stroke={A} strokeWidth={2.5} />
              <line x1={x(0)} y1={38} x2={x(b)} y2={38} stroke={B} strokeWidth={2.5} />
              <text x={(x(0) + x(a)) / 2} y={44} textAnchor="middle" fontSize={11} fontWeight={800} fill={A}>|{a}| = {Math.abs(a)}</text>
              <text x={(x(0) + x(b)) / 2} y={32} textAnchor="middle" fontSize={11} fontWeight={800} fill={B}>|{b}| = {Math.abs(b)}</text>
              {/* markers */}
              <circle cx={x(a)} cy={70} r={7} fill={A} stroke="white" strokeWidth={2} />
              <circle cx={x(b)} cy={70} r={7} fill={B} stroke="white" strokeWidth={2} />
              <text x={x(a)} y={106} textAnchor="middle" fontSize={12} fontWeight={800} fill={A} fontFamily="var(--font-mono)">a={a}</text>
              <text x={x(b)} y={106} textAnchor="middle" fontSize={12} fontWeight={800} fill={B} fontFamily="var(--font-mono)">b={b}</text>
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-xl border-2 border-[var(--line)] px-5 py-2">
              <div className="text-xs font-bold uppercase text-[var(--ink-faint)]">Order</div>
              <div className="font-mono text-xl font-black">{a} {symbol} {b}</div>
            </div>
            <div className="rounded-xl border-2 border-[var(--line)] px-5 py-2">
              <div className="text-xs font-bold uppercase text-[var(--ink-faint)]">Absolute values</div>
              <div className="font-mono text-xl font-black">|{a}| {Math.abs(a) > Math.abs(b) ? ">" : Math.abs(a) < Math.abs(b) ? "<" : "="} |{b}|</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="a" value={a} color={A} onChange={setA} />
            <Stepper label="b" value={b} color={B} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Distance versus direction</h2>
      <p>
        {a} {symbol} {b} tells you their <em>order</em>{" "}on the line. But |{a}| = {Math.abs(a)} and |{b}| = {Math.abs(b)} tell you their <em>distance</em>{" "}from 0.
        A debt of $8 (−8) is a smaller number than −3, yet it is a bigger debt —
        that is |−8| = 8.
      </p>

      <MathCheck>
        <p>
          Ordering rational numbers uses their position on the number line — the
          number farther left is less (6.NS.C.7). <strong>Absolute value</strong>{" "}
          |x| is the distance from 0, always non-negative, and describes
          magnitude regardless of sign. So −6 &lt; −3, but |−6| = 6 &gt; 3 = |−3|.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(-R, Math.min(R, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= -R} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= R} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
