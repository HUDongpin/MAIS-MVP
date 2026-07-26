"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const ACCENT = "var(--band-upper)";
const PAD = 30;
const W = 420;

export default function Lesson() {
  const [n, setN] = useState(2); // find sqrt(n)
  const val = Math.sqrt(n);
  const lo = Math.floor(val), hi = lo + 1;
  // which perfect squares bracket n
  const loSq = lo * lo, hiSq = hi * hi;

  const x = (v: number) => Math.round((PAD + ((v - lo) / 1) * W) * 100) / 100;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        You can&apos;t write √{n} exactly, but you can <strong>pin it down</strong>{" "}
        between two whole numbers, then narrow it. √{n} lies between{" "}
        <strong>{lo}</strong>{" "}and <strong>{hi}</strong>{" "}because {loSq} &lt; {n} &lt; {hiSq}.
      </p>

      <Figure caption="Trap the irrational between perfect squares, then zoom in to its place on the line.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <svg width={W + 2 * PAD} height={80} viewBox={`0 0 ${W + 2 * PAD} 80`} className="mx-auto" role="img" aria-label={`square root of ${n} on a number line`}>
              <line x1={PAD} y1={45} x2={PAD + W} y2={45} stroke="var(--ink-soft)" strokeWidth={2} />
              {[lo, lo + 0.5, hi].map((t) => (
                <g key={t}>
                  <line x1={x(t)} y1={40} x2={x(t)} y2={50} stroke="var(--ink-soft)" strokeWidth={1.5} />
                  <text x={x(t)} y={66} textAnchor="middle" fontSize={11} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{t}</text>
                </g>
              ))}
              <circle cx={x(val)} cy={45} r={7} fill={ACCENT} stroke="white" strokeWidth={2} />
              <text x={x(val)} y={26} textAnchor="middle" fontSize={13} fontWeight={800} fill={ACCENT} fontFamily="var(--font-mono)">√{n} ≈ {val.toFixed(2)}</text>
            </svg>
          </FigureScroll>

          <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-[var(--line)] px-6 py-3 font-mono text-[15px]">
            <div>{loSq} &lt; {n} &lt; {hiSq}, so {lo} &lt; √{n} &lt; {hi}</div>
            <div className="text-[var(--ink-soft)]">{lo}.{Math.floor((val - lo) * 10)}² = {(lo + Math.floor((val - lo) * 10) / 10).toFixed(1)}² = {Math.pow(lo + Math.floor((val - lo) * 10) / 10, 2).toFixed(2)} — closing in</div>
            <div className="text-2xl font-black" style={{ color: ACCENT }}>√{n} ≈ {val.toFixed(3)}</div>
          </div>

          <Stepper label="Find √n, n =" value={n} onChange={setN} />
        </div>
      </Figure>

      <h2>Squeeze it between squares</h2>
      <p>
        Since {loSq} and {hiSq} are the perfect squares around {n}, √{n} must be
        between {lo} and {hi}. Testing decimals like {(val).toFixed(1)} narrows it
        further — √{n} ≈ {val.toFixed(2)}, close enough to plot on the line.
      </p>

      <MathCheck>
        <p>
          Irrational numbers can be <strong>approximated by rationals</strong>{" "}
          (8.NS.A.2). To estimate √{n}, find the perfect squares it falls between
          ({loSq} and {hiSq}), so √{n} is between {lo} and {hi}; then test decimals
          to get more digits (√{n} ≈ {val.toFixed(2)}) and place it on a number
          line.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(2, Math.min(30, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 2} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label="Decrease n">−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 30} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label="Increase n">+</button>
      </div>
    </div>
  );
}
