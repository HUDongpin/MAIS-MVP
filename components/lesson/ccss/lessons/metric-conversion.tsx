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

function fmt(n: number) {
  // toFixed(4) underflowed every small-to-large conversion: 3 mm → km is 3e-6,
  // which printed "3 mm = 0 km" in a lesson whose whole claim is that
  // converting units does not change the amount. Keep enough significant
  // figures for the value to survive, and drop trailing zeros.
  if (n === 0) return "0";
  const decimals = Math.max(0, Math.min(12, 4 - Math.floor(Math.log10(Math.abs(n)))));
  return Number(n.toFixed(decimals)).toString();
}

export default function Lesson() {
  const [value, setValue] = useState(3);
  const [from, setFrom] = useState(0); // index into UNITS -> km
  const [to, setTo] = useState(1); // -> m

  const shift = UNITS[from].exp - UNITS[to].exp;
  const result = value * Math.pow(10, shift);
  const bigger = shift > 0;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>metric system</strong>{" "}is built on tens. Each step between
        units is a <strong>power of 10</strong>, so converting is just multiplying
        or dividing by 10, 100, or 1000 — moving the decimal point.
      </p>

      <Figure caption="Going to a smaller unit multiplies (more of them); going bigger divides.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <input type="number" value={value} min={0} onChange={(e) => setValue(Math.max(0, Number(e.target.value) || 0))} className="w-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-center text-xl font-black" aria-label="value to convert" />
            <select value={from} onChange={(e) => setFrom(Number(e.target.value))} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-bold" aria-label="from unit">
              {UNITS.map((u, i) => <option key={u.key} value={i}>{u.name}</option>)}
            </select>
            <span className="text-xl font-black text-[var(--ink-faint)]">→</span>
            <select value={to} onChange={(e) => setTo(Number(e.target.value))} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-bold" aria-label="to unit">
              {UNITS.map((u, i) => <option key={u.key} value={i}>{u.name}</option>)}
            </select>
          </div>

          <div className="rounded-2xl border-2 px-8 py-4 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-3xl font-black">
              {fmt(value)} {UNITS[from].key} = <span style={{ color: ACCENT }}>{fmt(result)}</span> {UNITS[to].key}
            </div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">
              {shift === 0 ? "same unit" : `${bigger ? "×" : "÷"} 10${Math.abs(shift) > 1 ? `^${Math.abs(shift)}` : ""} = ${bigger ? "×" : "÷"} ${fmt(Math.pow(10, Math.abs(shift)))}`}
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
