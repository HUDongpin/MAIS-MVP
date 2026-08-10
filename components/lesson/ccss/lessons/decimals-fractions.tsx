"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const TENTH = "var(--band-middle)";
const HUND = "var(--band-upper)";
const placeCount = (count: number, singular: "tenth" | "hundredth") =>
  `${count} ${count === 1 ? singular : `${singular}s`}`;

export default function Lesson() {
  const [v, setV] = useState(37); // hundredths, 0..99

  const tenthsDigit = Math.floor(v / 10);
  const hundDigit = v % 10;
  const decimal = (v / 100).toFixed(2);

  const color = (i: number) => (i < tenthsDigit * 10 ? TENTH : i < v ? HUND : null);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>decimal</strong>{" "}is just another way to write a fraction with a
        denominator of 10 or 100. The first digit after the dot is{" "}
        <strong>tenths</strong>; the second is <strong>hundredths</strong>. So{" "}
        <strong>{v}/100 = {decimal}</strong>.
      </p>

      {/* The grid is filled in DOM order across a 10-column layout, so cells
          0–9 are the top ROW. The caption said columns. */}
      <Figure caption="The whole square is 1. Full rows are tenths (0.1); single squares are hundredths (0.01).">
        <div className="flex flex-col items-center gap-6">
          <div className="grid gap-px rounded border-2 border-[var(--ink-soft)] p-px" style={{ gridTemplateColumns: "repeat(10, 1.35rem)" }}>
            {Array.from({ length: 100 }, (_, i) => (
              <div key={i} style={{ width: "1.35rem", height: "1.35rem", background: color(i) ?? "var(--surface-2)" }} />
            ))}
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-xs font-bold uppercase text-[var(--ink-faint)]">fraction</div>
              <div className="font-mono text-3xl font-black">{v}/100</div>
            </div>
            <div className="text-3xl font-black text-[var(--ink-faint)]">=</div>
            <div className="text-center">
              <div className="text-xs font-bold uppercase text-[var(--ink-faint)]">decimal</div>
              <div className="font-mono text-3xl font-black" style={{ color: HUND }}>{decimal}</div>
            </div>
          </div>

          <p className="m-0 text-center font-mono text-[15px] text-[var(--ink-soft)]">
            {decimal} = <span style={{ color: TENTH }}>{placeCount(tenthsDigit, "tenth")}</span> + <span style={{ color: HUND }}>{placeCount(hundDigit, "hundredth")}</span>
          </p>

          <Stepper label="Hundredths" value={v} onChange={setV} />
        </div>
      </Figure>

      <h2>Reading the places after the dot</h2>
      <p>
        In {decimal}, the {tenthsDigit} is {placeCount(tenthsDigit, "tenth")} ({tenthsDigit}/10)
        and the {hundDigit} is {placeCount(hundDigit, "hundredth")} ({hundDigit}/100). Together
        that is {placeCount(v, "hundredth")} — the same amount shaded in the grid.
      </p>

      <MathCheck>
        <p>
          Decimal notation writes fractions with denominators 10 or 100 using the
          places after the decimal point (4.NF.C.6): the tenths place and the
          hundredths place. So {v}/100 = {decimal}, and {tenthsDigit}/10 ={" "}
          {(tenthsDigit / 10).toFixed(1)}. Decimals extend place value to the right
          of the ones.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(99, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(value - 10)} disabled={value - 10 < 0} className="h-9 w-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold disabled:opacity-40" aria-label={`Decrease ${label} by ten hundredths`}>−10</button>
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 0} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label} by one hundredth`}>−</button>
        <span className="w-10 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 99} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label} by one hundredth`}>+</button>
        <button type="button" onClick={() => set(value + 10)} disabled={value + 10 > 99} className="h-9 w-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold disabled:opacity-40" aria-label={`Increase ${label} by ten hundredths`}>+10</button>
      </div>
    </div>
  );
}
