"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
const TEN = "var(--band-middle)";

export default function Lesson() {
  const [a, setA] = useState(9);
  const [tens, setTens] = useState(8);
  const multiple = tens * 10;
  const base = a * tens;
  const product = base * 10;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Multiplying by a multiple of 10 is a two-part trick: multiply the{" "}
        <strong>easy fact</strong>{" "}first, then make it <strong>ten times
        bigger</strong>. So 9 × 80 is just 9 × 8, then × 10.
      </p>

      <Figure caption="Do the basic fact, then slide every digit up one place — that is × 10.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-3xl font-black">
            {a} × <span style={{ color: TEN }}>{multiple}</span> = <span style={{ color: ACCENT }}>{product}</span>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[var(--line)] px-6 py-4">
            <div className="font-mono text-lg">
              Step 1: <strong>{a} × {tens} = {base}</strong>
            </div>
            <span className="text-[var(--ink-faint)]">↓ ten times bigger</span>
            <div className="font-mono text-lg">
              Step 2: <strong style={{ color: ACCENT }}>{base} × 10 = {product}</strong>
            </div>
          </div>

          <p className="m-0 text-center text-[15px] text-[var(--ink-soft)]">
            The <strong>{base}</strong>{" "}is now <strong>{base} tens</strong>, so a zero appears in the ones place: {product}.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="One-digit" value={a} min={1} max={9} onChange={setA} />
            <Stepper label="Tens" value={tens} min={1} max={9} onChange={setTens} suffix="0" />
          </div>
        </div>
      </Figure>

      <h2>Why the zero appears</h2>
      <p>
        {a} group{a === 1 ? "" : "s"} of {multiple} is {a} group{a === 1 ? "" : "s"} of {tens} ten{tens === 1 ? "" : "s"}, which is {base}{" "}
        tens. And {base} tens is written <strong>{product}</strong>{" "}— the same{" "}
        {base} with a 0 in the ones place.
      </p>

      <MathCheck>
        <p>
          Multiplying a one-digit number by a multiple of 10 (3.NBT.A.3) uses
          place value and the associative property: {a} × {multiple} = {a} × ({tens} × 10) = ({a} × {tens}) × 10 = {base} × 10 = {product}. Doing the easy
          fact first and then multiplying by ten is why the answer is the basic
          product with a zero attached.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange, suffix }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}{suffix}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
