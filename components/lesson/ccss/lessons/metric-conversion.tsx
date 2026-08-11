"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
// exponent relative to the base unit (meter/gram/liter)
const UNITS = [
  { key: "km", name: "kilometers", exp: 3 },
  { key: "m", name: "meters", exp: 0 },
  { key: "cm", name: "centimeters", exp: -2 },
  { key: "mm", name: "millimeters", exp: -3 },
];
const MAX_SAFE_METRIC_INPUT = Number.MAX_VALUE / 1_000_000;

function fmt(n: number) {
  return Number(n.toFixed(4)).toString();
}

export default function Lesson() {
  const [value, setValue] = useState(3);
  const [from, setFrom] = useState(0); // index into UNITS -> km
  const [to, setTo] = useState(1); // -> m

  const shift = UNITS[from].exp - UNITS[to].exp;
  const result = value * Math.pow(10, shift);
  const bigger = shift > 0;
  const updateValue = (rawValue: string) => {
    const parsed = Number(rawValue);
    setValue(Number.isFinite(parsed) ? Math.min(MAX_SAFE_METRIC_INPUT, Math.max(0, parsed)) : 0);
  };

  return (
    <div
      className="prose-lesson max-w-none"
      data-diagram-exception-policy="metric-conversion-finite-number-and-unit-cross-product-v1"
    >
      <p>
        The <strong>metric system</strong>{" "}is built on tens. Each step between
        units is a <strong>power of 10</strong>, so converting is just multiplying
        or dividing by 10, 100, or 1000 — moving the decimal point.
      </p>

      <Figure caption="Going to a smaller unit multiplies (more of them); going bigger divides.">
        <div className="flex flex-col items-center gap-6">
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:w-auto sm:gap-3">
            <input data-diagram-exception-control="metric-value" type="number" value={value} min={0} max={MAX_SAFE_METRIC_INPUT} onChange={(e) => updateValue(e.target.value)} className="col-span-3 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-center text-xl font-black sm:col-span-1 sm:w-24" aria-label="value" />
            <select data-diagram-exception-control="metric-from-unit" value={from} onChange={(e) => setFrom(Number(e.target.value))} className="min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-bold sm:w-auto" aria-label="from unit">
              {UNITS.map((u, i) => <option key={u.key} value={i}>{u.name}</option>)}
            </select>
            <span className="text-xl font-black text-[var(--ink-faint)]">→</span>
            <select data-diagram-exception-control="metric-to-unit" value={to} onChange={(e) => setTo(Number(e.target.value))} className="min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-bold sm:w-auto" aria-label="to unit">
              {UNITS.map((u, i) => <option key={u.key} value={i}>{u.name}</option>)}
            </select>
          </div>

          <div
            data-metric-conversion-result-card
            data-metric-conversion-result-finite={String(Number.isFinite(result))}
            className="w-full min-w-0 max-w-full overflow-x-auto rounded-2xl border-2 px-4 py-4 text-center sm:px-8"
            style={{ borderColor: ACCENT }}
            tabIndex={0}
            aria-label="Metric conversion result"
          >
            <div className="min-w-max">
              <div className="font-mono text-3xl font-black">
                {fmt(value)} {UNITS[from].key} = <span style={{ color: ACCENT }}>{fmt(result)}</span> {UNITS[to].key}
              </div>
              <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">
                {shift === 0 ? "same unit" : `${bigger ? "×" : "÷"} 10${Math.abs(shift) > 1 ? `^${Math.abs(shift)}` : ""} = ${bigger ? "×" : "÷"} ${fmt(Math.pow(10, Math.abs(shift)))}`}
              </div>
            </div>
          </div>

          {/* staircase */}
          <div className="flex items-end gap-1">
            {UNITS.map((u, i) => (
              <div key={u.key} className="grid place-items-center rounded text-xs font-bold text-white" style={{ width: 46, height: 30 + (3 - i) * 8, background: i === from ? "var(--band-middle)" : i === to ? ACCENT : "var(--surface-2)", color: i === from || i === to ? "white" : "var(--ink-faint)" }}>{u.key}</div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Every step is a power of ten</h2>
      <p>
        From {UNITS[from].name} to {UNITS[to].name} is {Math.abs(shift)} step
        {Math.abs(shift) === 1 ? "" : "s"} on the metric staircase, so you{" "}
        {bigger ? "multiply" : "divide"} by 10{Math.abs(shift) > 1 ? <sup>{Math.abs(shift)}</sup> : ""}. That is why {fmt(value)} {UNITS[from].key} = {fmt(result)} {UNITS[to].key}.
      </p>

      <MathCheck>
        <p>
          Converting among metric units of the same measurement (5.MD.A.1) is
          multiplication or division by a power of 10, because the units are
          defined in tens (1 km = 1000 m, 1 m = 100 cm, 1 cm = 10 mm). These
          conversions let you solve multi-step, real-world measurement problems in
          a single unit.
        </p>
      </MathCheck>
    </div>
  );
}
