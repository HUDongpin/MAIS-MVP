"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const N = 12;
const CELL = 22;
const PAD = 28;
const SIZE = N * CELL + 2 * PAD;
const P1 = "var(--band-middle)";
const P2 = "var(--band-upper)";

export default function Lesson() {
  const [s1, setS1] = useState(1);
  const [s2, setS2] = useState(2);

  const terms = Array.from({ length: 5 }, (_, i) => ({ x: i * s1, y: i * s2 }));
  const sx = (x: number) => PAD + x * CELL;
  const sy = (y: number) => SIZE - PAD - y * CELL;
  const inRange = terms.filter((t) => t.x <= N && t.y <= N);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Make <strong>two patterns</strong>{" "}at once. Pair up matching terms into{" "}
        <strong>ordered pairs</strong>{" "}(x, y) and plot them — the points line up
        and reveal how the two patterns are related.
      </p>

      <Figure caption="Each point pairs a term from pattern 1 (x) with a term from pattern 2 (y).">
        <div className="flex flex-col items-center gap-6">
          <div className="flex self-start flex-wrap items-center justify-start gap-6 sm:self-center sm:justify-center">
            <table className="font-mono text-sm">
              <thead>
                <tr className="text-[var(--ink-faint)]">
                  <th className="px-2 py-1">step</th>
                  <th className="px-2 py-1" style={{ color: P1 }}>+{s1}</th>
                  <th className="px-2 py-1" style={{ color: P2 }}>+{s2}</th>
                  <th className="px-2 py-1">(x, y)</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t, i) => (
                  <tr key={i}>
                    <td className="px-2 py-0.5 text-center text-[var(--ink-faint)]">{i}</td>
                    <td className="px-2 py-0.5 text-center" style={{ color: P1 }}>{t.x}</td>
                    <td className="px-2 py-0.5 text-center" style={{ color: P2 }}>{t.y}</td>
                    <td className="px-2 py-0.5 text-center font-bold">({t.x}, {t.y})</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: 260 }} role="img" aria-label="graph of ordered pairs">
              {Array.from({ length: N + 1 }, (_, i) => (
                <g key={i} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} />
                  <line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} />
                </g>
              ))}
              <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
              <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={2} />
              {inRange.map((t, i) => (
                <circle key={i} cx={sx(t.x)} cy={sy(t.y)} r={5} fill={P2} stroke="white" strokeWidth={1.5} />
              ))}
            </svg>
          </div>

          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {s1 > 0 && `Each y is ${(s2 / s1) % 1 === 0 ? s2 / s1 : (s2 / s1).toFixed(2)} times its x — the points climb in a straight line.`}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Pattern 1: add" value={s1} color={P1} onChange={setS1} />
            <Stepper label="Pattern 2: add" value={s2} color={P2} onChange={setS2} />
          </div>
        </div>
      </Figure>

      <h2>Two patterns, one line</h2>
      <p>
        Pattern 1 grows by {s1}; pattern 2 by {s2}. Because both start at 0, every
        ordered pair follows the rule y = {(s2 / s1) % 1 === 0 ? s2 / s1 : (s2 / s1).toFixed(2)} × x, so the plotted points fall on a straight line through the origin.
      </p>

      <MathCheck>
        <p>
          Generating two numerical patterns from two rules, forming{" "}
          <strong>ordered pairs</strong>{" "}from corresponding terms, and graphing
          them (5.OA.B.3) makes the relationship visible. Here the pairs satisfy y
          = {(s2 / s1) % 1 === 0 ? s2 / s1 : (s2 / s1).toFixed(2)}x, which is why
          they line up — a first look at proportional relationships and functions.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1, Math.min(4, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-6 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 4} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
