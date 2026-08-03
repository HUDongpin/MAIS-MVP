"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
// `bigOne` carries the singular because the larger unit is what the student
// sets, and it can be 1 ("1 hour", "1 foot" — not "1 hours", "1 feet"). The
// smaller unit is always a multiple of at least 12, so it stays plural.
type Conv = { key: string; big: string; bigOne: string; small: string; factor: number };
const CONVS: Conv[] = [
  { key: "hr", big: "hours", bigOne: "hour", small: "minutes", factor: 60 },
  { key: "ft", big: "feet", bigOne: "foot", small: "inches", factor: 12 },
  { key: "km", big: "kilometers", bigOne: "kilometer", small: "meters", factor: 1000 },
  { key: "kg", big: "kilograms", bigOne: "kilogram", small: "grams", factor: 1000 },
];

export default function Lesson() {
  const [ci, setCi] = useState(0);
  const [value, setValue] = useState(3);
  const conv = CONVS[ci];
  const result = value * conv.factor;
  const bigUnit = value === 1 ? conv.bigOne : conv.big;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Bigger units break into a fixed number of smaller ones: 1 hour is 60
        minutes, 1 foot is 12 inches, 1 kilometer is 1000 meters. To convert to
        the smaller unit, you <strong>multiply</strong>.
      </p>

      <Figure caption="Pick a conversion. Multiply the big unit by how many small ones fit inside it.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {CONVS.map((c, i) => (
              <button key={c.key} type="button" onClick={() => setCi(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={ci === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{c.big} → {c.small}</button>
            ))}
          </div>

          <div className="rounded-2xl border-2 border-[var(--line)] px-8 py-4 text-center">
            <div className="font-mono text-3xl font-black">
              {value} {bigUnit} = <span style={{ color: ACCENT }}>{result.toLocaleString()}</span> {conv.small}
            </div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">{value} × {conv.factor} = {result.toLocaleString()}</div>
          </div>

          <table className="font-mono text-sm">
            <thead>
              <tr className="text-[var(--ink-faint)]">
                <th className="px-3 py-1">{conv.big}</th>
                <th className="px-3 py-1">{conv.small}</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((n) => (
                <tr key={n} className={n === value ? "font-black" : "text-[var(--ink-soft)]"} style={n === value ? { color: ACCENT } : undefined}>
                  <td className="px-3 py-0.5 text-center">{n}</td>
                  <td className="px-3 py-0.5 text-center">{(n * conv.factor).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Stepper label={conv.big} value={value} min={1} max={10} onChange={setValue} />
        </div>
      </Figure>

      <h2>Multiply to go smaller</h2>
      <p>
        Because 1 {conv.bigOne} = {conv.factor} {conv.small}, having{" "}
        {value} of them means {value} × {conv.factor} = {result.toLocaleString()}{" "}
        {conv.small}. Going the other way (small → big) you would divide.
      </p>

      <MathCheck>
        <p>
          Knowing the relative sizes of measurement units and converting within a
          system (4.MD.A.1) is multiplication by the unit ratio: {value} {bigUnit} × {conv.factor} = {result.toLocaleString()} {conv.small}. These
          conversions let you solve measurement word problems — including ones with
          fractions and decimals — in a single, consistent unit (4.MD.A.2).
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
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
