"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const COLORS = ["var(--band-upper)", "var(--band-high)", "var(--band-middle)", "var(--band-early)"];
const PLACE = [1000, 100, 10, 1];

function digs(n: number) {
  return [Math.floor(n / 1000) % 10, Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];
}

export default function Lesson() {
  const [a, setA] = useState(4825);
  const [b, setB] = useState(4790);

  const da = digs(a), db = digs(b);
  const expanded = da.map((d, i) => d * PLACE[i]).filter((v) => v > 0);
  const decideIdx = [0, 1, 2, 3].find((i) => da[i] !== db[i]);
  const symbol = a > b ? ">" : a < b ? "<" : "=";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Big numbers are read in <strong>place-value chunks</strong>. Writing a
        number as a sum of its places is <strong>expanded form</strong>. To
        compare two numbers, line them up and check from the{" "}
        <strong>biggest place</strong>{" "}down.
      </p>

      <Figure caption="Expanded form breaks the number into the value of each digit.">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <div className="font-mono text-4xl font-black">{a.toLocaleString()}</div>
            <div className="mt-2 font-mono text-lg">
              {da.map((d, i) => (
                <span key={i}>
                  <span style={{ color: COLORS[i] }}>{d * PLACE[i]}</span>
                  {i < 3 && <span className="text-[var(--ink-faint)]"> + </span>}
                </span>
              ))}
            </div>
            <div className="mt-1 text-xs text-[var(--ink-faint)]">expanded form ({expanded.length} nonzero places)</div>
          </div>

          <div className="w-full border-t border-[var(--line)] pt-4">
            <div className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Compare</div>
            <div className="mt-2 flex items-center justify-center gap-4">
              <span className="font-mono text-3xl font-black" style={{ color: "var(--band-middle)" }}>{a.toLocaleString()}</span>
              <span className="font-mono text-4xl font-black">{symbol}</span>
              <span className="font-mono text-3xl font-black" style={{ color: "var(--band-early)" }}>{b.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
              {decideIdx === undefined ? "Every digit matches — equal." : `First difference is in the ${["thousands", "hundreds", "tens", "ones"][decideIdx]} place (${da[decideIdx]} vs ${db[decideIdx]}).`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First number" value={a} onChange={setA} />
            <Stepper label="Second number" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Biggest place first</h2>
      <p>
        {/* The last two digits were concatenated as characters, so a 0 in the
            tens place rendered "05" instead of "five". */}
        Reading {a.toLocaleString()} as &ldquo;{da[0]} thousand, {da[1]} hundred{" "}
        {da[2] * 10 + da[3]}&rdquo; and writing it as {da[0] * 1000} + {da[1] * 100} +{" "}
        {da[2] * 10} + {da[3]} shows exactly what each digit is worth — which is
        also how you compare two numbers.
      </p>

      <MathCheck>
        <p>
          Reading and writing multi-digit numbers in <strong>standard</strong>,{" "}
          <strong>expanded</strong>, and <strong>word</strong>{" "}form, and comparing
          two of them with <strong>&gt;, =, &lt;</strong>{" "}using place value, is
          4.NBT.A.2. The comparison is decided by the highest place where the
          digits differ — here, {a.toLocaleString()} {symbol} {b.toLocaleString()}.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1000, Math.min(9999, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(value - 100)} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold" aria-label={`${label} minus 100`}>−100</button>
        <button type="button" onClick={() => set(value - 1)} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-16 text-center text-xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Increase ${label}`}>+</button>
        <button type="button" onClick={() => set(value + 100)} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold" aria-label={`${label} plus 100`}>+100</button>
      </div>
    </div>
  );
}
