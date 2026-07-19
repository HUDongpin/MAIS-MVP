"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const RATE = "var(--band-upper)";
const INIT = "var(--band-early)";

export default function Lesson() {
  const [init, setInit] = useState(5); // initial value b
  const [rate, setRate] = useState(3); // rate of change m

  const rows = Array.from({ length: 5 }, (_, x) => ({ x, y: rate * x + init }));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Many situations grow at a steady rate. From a <strong>starting amount</strong>{" "}
        and a <strong>rate of change</strong>, you can build a linear function{" "}
        <strong>y = mx + b</strong>{" "}— where m is the rate and b is where you begin.
      </p>

      <Figure caption="The plant's height each day. The steady growth is the rate; the day-0 height is the initial value.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 max-w-md text-center text-lg font-semibold">
            A plant starts at <strong style={{ color: INIT }}>{init} cm</strong>{" "}and grows{" "}
            <strong style={{ color: RATE }}>{rate} cm</strong>{" "}each day. Write a function for its height.
          </p>

          <div className="rounded-lg bg-[var(--surface-2)] px-6 py-2 font-mono text-2xl font-black">
            y = <span style={{ color: RATE }}>{rate}</span>x + <span style={{ color: INIT }}>{init}</span>
          </div>

          <table className="font-mono text-sm">
            <thead>
              <tr className="text-[var(--ink-faint)]">
                <th className="px-3 py-1">day (x)</th>
                <th className="px-3 py-1">height (y)</th>
                <th className="px-3 py-1">change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.x}>
                  <td className="px-3 py-0.5 text-center">{r.x}</td>
                  <td className="px-3 py-0.5 text-center font-bold">{r.y}</td>
                  <td className="px-3 py-0.5 text-center" style={{ color: RATE }}>{i === 0 ? `start = ${init}` : `+${rate}`}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Initial (b)" value={init} min={0} max={10} color={INIT} onChange={setInit} />
            <Stepper label="Rate (m)" value={rate} min={1} max={6} color={RATE} onChange={setRate} />
          </div>
        </div>
      </Figure>

      <h2>Rate and starting value</h2>
      <p>
        At day 0 the height is {init} — that is <strong>b</strong>, the initial
        value. Each day it climbs by {rate} — that is <strong>m</strong>, the rate
        of change. Together they give y = {rate}x + {init}, which predicts the
        height on any day.
      </p>

      <MathCheck>
        <p>
          Constructing a linear function to model a relationship (8.F.B.4): find
          the <strong>rate of change m</strong>{" "}(how much y changes per unit of x —
          here {rate}) and the <strong>initial value b</strong>{" "}(y when x = 0 —
          here {init}). The function is <strong>y = mx + b</strong>, readable from a
          description, a table, or two points.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
