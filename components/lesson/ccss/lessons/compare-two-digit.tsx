"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const TENC = "var(--band-upper)";
const ONEC = "var(--band-early)";

const placeCount = (count: number, singular: "ten" | "one") =>
  `${count} ${count === 1 ? singular : `${singular}s`}`;

function Blocks({ n }: { n: number }) {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (
    <div className="flex items-end justify-center gap-2" style={{ minHeight: 70 }}>
      <div className="flex items-end gap-1">
        {Array.from({ length: tens }, (_, i) => (
          <div key={i} className="rounded-sm" style={{ width: 8, height: 64, background: TENC }} />
        ))}
      </div>
      <div className="grid content-end gap-0.5" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        {Array.from({ length: ones }, (_, i) => (
          <div key={i} className="rounded-sm" style={{ width: 8, height: 8, background: ONEC }} />
        ))}
      </div>
    </div>
  );
}

export default function Lesson() {
  const [a, setA] = useState(42);
  const [b, setB] = useState(38);

  const symbol = a > b ? ">" : a < b ? "<" : "=";
  const ta = Math.floor(a / 10), tb = Math.floor(b / 10);
  const reason =
    ta !== tb
      ? `${a} has ${placeCount(ta, "ten")} and ${b} has ${placeCount(tb, "ten")} — more tens wins.`
      : a !== b
        ? `Same number of tens (${ta}), so compare the ones: ${a % 10} vs ${b % 10}.`
        : "Same tens and same ones — the numbers are equal.";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To compare two big numbers, look at the <strong>tens first</strong>. The
        number with more tens is bigger. If the tens are the same, then the{" "}
        <strong>ones</strong>{" "}break the tie.
      </p>

      <Figure caption="Tall bars are tens, tiny squares are ones. Compare the tall bars first.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-end justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <Blocks n={a} />
              <span className="text-3xl font-black" style={{ color: "var(--band-middle)" }}>{a}</span>
            </div>
            <span className="pb-8 font-mono text-5xl font-black">{symbol}</span>
            <div className="flex flex-col items-center gap-2">
              <Blocks n={b} />
              <span className="text-3xl font-black" style={{ color: ONEC }}>{b}</span>
            </div>
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">{reason}</p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First number" value={a} onChange={setA} />
            <Stepper label="Second number" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Tens first, then ones</h2>
      <p>
        {a === b
          ? `Both numbers have ${placeCount(ta, "ten")} and ${placeCount(a % 10, "one")}, so they are equal.`
          : ta !== tb
          ? `${a > b ? a : b} has more tens, so it is greater — no need to count every block.`
          : `Both have ${placeCount(ta, "ten")}, so the number with more ones is greater.`}
      </p>

      <MathCheck>
        <p>
          Comparing two two-digit numbers uses place value: compare the{" "}
          <strong>tens</strong>{" "}first, and only look at the <strong>ones</strong>{" "}
          when the tens are equal — then record the result with{" "}
          <strong>&gt;, =, or &lt;</strong>{" "}(1.NBT.B.3). Here, {a} {symbol} {b}.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(10, Math.min(99, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 10} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 99} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
