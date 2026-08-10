"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A = "var(--band-middle)";
const B = "var(--band-upper)";
const placeCount = (count: number, singular: "tenth" | "hundredth") =>
  `${count} ${count === 1 ? singular : `${singular}s`}`;

function Grid({ v, color }: { v: number; color: string }) {
  return (
    <div className="grid gap-px rounded border-2 border-[var(--ink-soft)] p-px" style={{ gridTemplateColumns: "repeat(10, 0.7rem)" }}>
      {Array.from({ length: 100 }, (_, i) => (
        <div key={i} style={{ width: "0.7rem", height: "0.7rem", background: i < v ? color : "var(--surface-2)" }} />
      ))}
    </div>
  );
}

export default function Lesson() {
  const [a, setA] = useState(37);
  const [b, setB] = useState(40);

  const da = (a / 100).toFixed(2), db = (b / 100).toFixed(2);
  const symbol = a > b ? ">" : a < b ? "<" : "=";
  const aT = Math.floor(a / 10), bT = Math.floor(b / 10);
  const reason = aT !== bT
    ? `Compare tenths first: ${placeCount(aT, "tenth")} vs ${placeCount(bT, "tenth")} — more tenths wins.`
    : a !== b
      ? `Same tenths (${aT}); compare hundredths: ${a % 10} vs ${b % 10}.`
      : "Same tenths and hundredths — the decimals are equal.";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To compare decimals, compare <strong>place by place</strong>, biggest
        first — tenths before hundredths. A common trap:{" "}
        <strong>0.4 is bigger than 0.37</strong>, because 4 tenths beats 3 tenths,
        even though 37 &ldquo;looks&rdquo; larger.
      </p>

      <Figure caption="Shaded squares show each decimal out of 100. More shaded = greater.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-start justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Grid v={a} color={A} />
              <span className="font-mono text-2xl font-black" style={{ color: A }}>{da}</span>
            </div>
            <span className="pt-8 font-mono text-4xl font-black">{symbol}</span>
            <div className="flex flex-col items-center gap-2">
              <Grid v={b} color={B} />
              <span className="font-mono text-2xl font-black" style={{ color: B }}>{db}</span>
            </div>
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">{reason}</p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First (0.__)" value={a} onChange={setA} />
            <Stepper label="Second (0.__)" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Tenths outrank hundredths</h2>
      <p>
        A tenth is worth ten hundredths, so the tenths place decides first. Only
        when the tenths tie do you look at the hundredths. That is why {da} {symbol} {db}.
      </p>

      <MathCheck>
        <p>
          Comparing two decimals to hundredths (4.NF.C.7) works place by place,
          starting with the <strong>tenths</strong>: {da} {symbol} {db} because{" "}
          {aT !== bT ? `${placeCount(aT, "tenth")} ${aT > bT ? ">" : "<"} ${placeCount(bT, "tenth")}` : `the tenths tie and ${placeCount(a % 10, "hundredth")} ${a % 10 === b % 10 ? "=" : a % 10 > b % 10 ? ">" : "<"} ${placeCount(b % 10, "hundredth")}`}. Comparisons are valid only when the decimals refer to the same whole.
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
        {/* The stepper stores hundredths, so this button moves the shown decimal
            by 0.1. Announcing it as "10" taught the exact place-value confusion
            4.NF.C.7 exists to correct. */}
        <button type="button" onClick={() => set(value - 10)} disabled={value - 10 < 0} className="h-9 w-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold disabled:opacity-40" aria-label={`Decrease ${label} by one tenth`}>−0.1</button>
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 0} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label} by one hundredth`}>−</button>
        <span className="w-14 text-center font-mono text-xl font-black tabular-nums">{(value / 100).toFixed(2)}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 99} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label} by one hundredth`}>+</button>
        <button type="button" onClick={() => set(value + 10)} disabled={value + 10 > 99} className="h-9 w-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold disabled:opacity-40" aria-label={`Increase ${label} by one tenth`}>+0.1</button>
      </div>
    </div>
  );
}
