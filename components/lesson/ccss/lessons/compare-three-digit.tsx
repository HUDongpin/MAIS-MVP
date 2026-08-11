"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const HC = "var(--band-upper)";
const TC = "var(--band-middle)";
const OC = "var(--band-early)";
const COLS = [HC, TC, OC];
const NAMES = ["hundreds", "tens", "ones"];

function digits(n: number) {
  return [Math.floor(n / 100), Math.floor((n / 10) % 10), n % 10];
}

export default function Lesson() {
  const [a, setA] = useState(324);
  const [b, setB] = useState(319);

  const da = digits(a), db = digits(b);
  const decideIdx = [0, 1, 2].find((i) => da[i] !== db[i]);
  const symbol = a > b ? ">" : a < b ? "<" : "=";
  const reason =
    decideIdx === undefined
      ? "Every digit matches — the numbers are equal."
      : `The ${NAMES[decideIdx]} digits differ first (${da[decideIdx]} vs ${db[decideIdx]}), so that decides it.`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To compare three-digit numbers, start at the <strong>biggest place</strong>{" "}
        — the hundreds. Only if those match do you look at the tens, and then the
        ones. The first place that differs decides the winner.
      </p>

      <Figure caption="Compare left to right: hundreds first, then tens, then ones.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex w-max max-w-none self-start mx-auto items-center gap-5">
            <NumberCols d={da} decideIdx={decideIdx} />
            <span className="font-mono text-5xl font-black">{symbol}</span>
            <NumberCols d={db} decideIdx={decideIdx} />
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">{reason}</p>

          <div className="font-mono text-2xl font-black">{a} {symbol} {b}</div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First number" value={a} onChange={setA} />
            <Stepper label="Second number" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Biggest place decides</h2>
      <p>
        A hundreds digit is worth far more than a tens or ones digit, so it wins
        first. Only a tie in the hundreds sends you to the tens, and only a tie
        there sends you to the ones.
      </p>

      <MathCheck>
        <p>
          Comparing two three-digit numbers means comparing{" "}
          <strong>hundreds, then tens, then ones</strong>, and recording the
          result with <strong>&gt;, =, or &lt;</strong>{" "}(2.NBT.A.4). The first
          place value that differs determines which number is greater — here,{" "}
          {a} {symbol} {b}.
        </p>
      </MathCheck>
    </div>
  );
}

function NumberCols({ d, decideIdx }: { d: number[]; decideIdx: number | undefined }) {
  return (
    <div className="flex gap-1">
      {d.map((digit, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="grid h-12 w-12 place-items-center rounded-lg text-2xl font-black text-white" style={{ background: COLS[i], outline: i === decideIdx ? "3px solid var(--ink)" : "none", outlineOffset: 2 }}>{digit}</div>
          <span className="mt-1 text-[10px] font-semibold uppercase text-[var(--ink-faint)]">{NAMES[i]}</span>
        </div>
      ))}
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(100, Math.min(999, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 100} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 999} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
