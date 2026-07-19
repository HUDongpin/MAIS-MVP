"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const N = 12;
const CELL = 22;
const PAD = 26;
const SIZE = N * CELL + 2 * PAD;
const INDEP = "var(--band-middle)";
const DEP = "var(--band-upper)";

export default function Lesson() {
  const [m, setM] = useState(2);
  const rows = Array.from({ length: 6 }, (_, x) => ({ x, y: m * x }));
  const sx = (x: number) => PAD + x * CELL;
  const sy = (y: number) => SIZE - PAD - y * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        When two quantities change together, one <strong>depends</strong>{" "}on the
        other. You pick the <strong>independent</strong>{" "}variable (x); the{" "}
        <strong>dependent</strong>{" "}variable (y) follows from the rule. The same
        relationship shows up as an <strong>equation, a table, and a graph</strong>.
      </p>

      <Figure caption="Total cost (y) depends on how many you buy (x). Equation, table, and graph agree.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-5 py-2 font-mono text-xl font-black">
            <span style={{ color: DEP }}>y</span> = {m} × <span style={{ color: INDEP }}>x</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <table className="font-mono text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-1" style={{ color: INDEP }}>x (buy)</th>
                  <th className="px-3 py-1" style={{ color: DEP }}>y (cost)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.x}>
                    <td className="px-3 py-0.5 text-center" style={{ color: INDEP }}>{r.x}</td>
                    <td className="px-3 py-0.5 text-center font-bold" style={{ color: DEP }}>{r.y}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: 250 }} role="img" aria-label="graph of y = mx">
              {Array.from({ length: N + 1 }, (_, i) => (
                <g key={i} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={sy(N)} />
                  <line x1={sx(0)} y1={sy(i)} x2={sx(N)} y2={sy(i)} />
                </g>
              ))}
              <line x1={sx(0)} y1={sy(0)} x2={sx(N)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
              <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(N)} stroke="var(--ink-soft)" strokeWidth={2} />
              {rows.filter((r) => r.y <= N).map((r) => (
                <circle key={r.x} cx={sx(r.x)} cy={sy(r.y)} r={5} fill={DEP} stroke="white" strokeWidth={1.5} />
              ))}
            </svg>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">price per item = {m}</span>
            <input type="range" min={1} max={3} value={m} onChange={(e) => setM(Number(e.target.value))} className="w-44 accent-[var(--band-upper)]" aria-label="rate" />
          </div>
        </div>
      </Figure>

      <h2>One rule, three views</h2>
      <p>
        Choosing x = 4 items forces y = {m} × 4 = {m * 4}. The equation states the
        rule, the table lists example pairs, and the graph shows them as points —
        all describing how the dependent variable y responds to the independent
        variable x.
      </p>

      <MathCheck>
        <p>
          Using variables to represent two quantities that change in relationship
          to one another (6.EE.C.9): the <strong>independent</strong>{" "}variable is
          the input you choose (x), and the <strong>dependent</strong>{" "}variable is
          the output determined by the rule (y = {m}x). Equations, tables, and
          graphs are three connected ways to show the same relationship.
        </p>
      </MathCheck>
    </div>
  );
}
