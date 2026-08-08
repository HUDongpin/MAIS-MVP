"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const XMAX = 10, YMAX = 60, PXX = 26, PXY = 4, PAD = 32;
const W = XMAX * PXX + 2 * PAD, H = YMAX * PXY + 2 * PAD;

export default function Lesson() {
  const [base, setBase] = useState(5); // flat fee
  const [rate, setRate] = useState(3); // per mile
  const [total, setTotal] = useState(26);

  const miles = (total - base) / rate; // solve base + rate·m = total
  const cost = (x: number) => base + rate * x;

  const sx = (x: number) => PAD + x * PXX;
  const sy = (y: number) => PAD + (YMAX - Math.min(y, YMAX)) * PXY;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Word problems become math when you <strong>write an equation</strong>. A
        taxi costs a flat fee plus a rate per mile: cost = {base} + {rate}·miles.
        As a <strong>one-variable</strong>{" "}equation you solve for miles; as{" "}
        <strong>two variables</strong>{" "}you graph the whole relationship.
      </p>

      <Figure caption="One equation, two views: solve base + rate·m = total, or graph y = base + rate·x.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-6 py-2 text-center font-mono">
            <div className="text-lg font-black">{base} + {rate}·m = {total}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">m = ({total} − {base}) / {rate} = <strong style={{ color: ACCENT }}>{Number.isInteger(miles) ? miles : miles.toFixed(2)}</strong>{" "}miles</div>
          </div>

          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="max-w-full"
            style={{ maxHeight: 260 }}
            role="img"
            aria-label={`Line y = ${base} + ${rate}x, cost against miles${
              Number.isInteger(miles) && miles >= 0 && miles <= XMAX
                ? `, with the solution dot at ${miles} mile${miles === 1 ? "" : "s"} and a total of ${total}`
                : ""
            }`}
          >
            {[0, 15, 30, 45, 60].map((y) => (
              <g key={y}>
                <line x1={sx(0)} y1={sy(y)} x2={sx(XMAX)} y2={sy(y)} stroke="var(--line)" strokeWidth={1} />
                <text x={sx(0) - 6} y={sy(y) + 3} textAnchor="end" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{y}</text>
              </g>
            ))}
            <line x1={sx(0)} y1={sy(0)} x2={sx(XMAX)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(YMAX)} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* Clip the segment at the x where it leaves the frame, rather than
                squashing its y-endpoint onto the ceiling: squashing changed the
                drawn slope away from the printed rate, leaving the solution dot
                floating ~50px off the line. */}
            <line x1={sx(0)} y1={sy(cost(0))} x2={sx(Math.min(XMAX, (YMAX - base) / rate))} y2={sy(cost(Math.min(XMAX, (YMAX - base) / rate)))} stroke={ACCENT} strokeWidth={3} />
            {Number.isInteger(miles) && miles >= 0 && miles <= XMAX && (
              <circle cx={sx(miles)} cy={sy(total)} r={5} fill="var(--band-upper)" stroke="white" strokeWidth={2} />
            )}
            <text x={sx(XMAX)} y={sy(0) + 16} textAnchor="end" fontSize={9} fill="var(--ink-faint)">miles</text>
          </svg>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* The total paid can never fall below the flat fee, or the model
                solves to a negative distance — "m = (5 − 15) / 1 = -10 miles"
                was presented as the answer to a modelling problem (A-CED.1).
                Equality is still allowed: that is the honest m = 0 case. */}
            <Stepper label="flat fee" value={base} min={0} max={15} onChange={(v) => { setBase(v); setTotal((p) => Math.max(p, v)); }} />
            <Stepper label="per mile" value={rate} min={1} max={8} onChange={setRate} />
            <Stepper label="total paid" value={total} min={Math.max(5, base)} max={60} onChange={(v) => setTotal(Math.max(v, base))} />
          </div>
        </div>
      </Figure>

      <h2>From words to a graph</h2>
      <p>
        The equation y = {base} + {rate}x is a line: it starts at (0, {base}) —
        the flat fee — and climbs {rate} per mile. Feeding in a total and solving
        for x answers "how far?"; the graph shows every possible trip at once.
      </p>

      <MathCheck>
        <p>
          <strong>Creating equations</strong>{" "}models a situation: a{" "}
          <strong>one-variable</strong>{" "}equation or inequality to solve for an
          unknown (A-CED.1), or a <strong>two-variable</strong>{" "}equation to graph
          the relationship between quantities (A-CED.2). The same story yields both,
          with axes labeled and scaled to the context.
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
        <span className="w-10 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
