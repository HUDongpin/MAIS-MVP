"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const N = 12;
const CELL = 22;
const PAD = 28;
const SIZE = N * CELL + 2 * PAD;
const ACCENT = "var(--band-upper)";

export default function Lesson() {
  const [k, setK] = useState(2);
  const rows = Array.from({ length: 6 }, (_, x) => ({ x, y: k * x }));
  const sx = (x: number) => PAD + x * CELL;
  const sy = (y: number) => SIZE - PAD - y * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two quantities are <strong>proportional</strong>{" "}when their ratio is
        always the same — the <strong>constant of proportionality</strong>, k. On
        a graph, a proportional relationship is a <strong>straight line through
        the origin</strong>, and its equation is <strong>y = kx</strong>.
      </p>

      <Figure caption="Every y ÷ x equals the same k. The graph is a line through (0, 0).">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-5 py-2 font-mono text-xl font-black">
            y = <span style={{ color: ACCENT }}>{k}</span>x
          </div>

          <div className="flex self-start flex-wrap items-center justify-start gap-6 sm:self-center sm:justify-center">
            <table className="font-mono text-sm">
              <thead>
                <tr className="text-[var(--ink-faint)]">
                  <th className="px-3 py-1">x</th>
                  <th className="px-3 py-1">y</th>
                  <th className="px-3 py-1">y ÷ x</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((r) => (
                  <tr key={r.x}>
                    <td className="px-3 py-0.5 text-center">{r.x}</td>
                    <td className="px-3 py-0.5 text-center font-bold" style={{ color: ACCENT }}>{r.y}</td>
                    <td className="px-3 py-0.5 text-center" style={{ color: "var(--band-middle)" }}>{k}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: 250 }} role="img" aria-label="graph of y = kx">
              {Array.from({ length: N + 1 }, (_, i) => (
                <g key={i} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} />
                  <line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} />
                </g>
              ))}
              <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
              <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={2} />
              <line x1={sx(0)} y1={sy(0)} x2={sx(Math.min(N, N))} y2={sy(Math.min(N, k * N))} stroke={ACCENT} strokeWidth={2.5} />
              {rows.filter((r) => r.y <= N).map((r) => (
                <circle key={r.x} cx={sx(r.x)} cy={sy(r.y)} r={5} fill={ACCENT} stroke="white" strokeWidth={1.5} />
              ))}
            </svg>
          </div>

          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            The constant of proportionality is k = {k}: every y is {k} times its x, and the line passes through the origin.
          </p>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">k = {k}</span>
            <input type="range" min={1} max={3} value={k} onChange={(e) => setK(Number(e.target.value))} className="w-44 accent-[var(--band-upper)]" aria-label="constant of proportionality" />
          </div>
        </div>
      </Figure>

      <h2>Same ratio everywhere</h2>
      <p>
        In a proportional relationship, y ÷ x never changes — it always equals k = {k}. That constant is the unit rate, the slope of the line, and the number
        that multiplies x in the equation y = {k}x.
      </p>

      <MathCheck>
        <p>
          A <strong>proportional relationship</strong>{" "}(7.RP.A.2) has a constant
          ratio y/x = k, the <strong>constant of proportionality</strong>. It shows
          up as a straight line through the <strong>origin</strong>{" "}on a graph, a
          constant y ÷ x in a table, and the equation <strong>y = kx</strong>. Here
          k = {k}.
        </p>
      </MathCheck>
    </div>
  );
}
