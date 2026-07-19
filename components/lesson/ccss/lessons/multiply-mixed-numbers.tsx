"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const WHOLE = "var(--band-upper)";
const FRAC = "var(--band-middle)";
const UNIT = 26;

export default function Lesson() {
  const [w, setW] = useState(1);
  const [n, setN] = useState(3);
  const [d, setD] = useState(4);
  const [k, setK] = useState(3);

  const num = n % d;
  const improper = w * d + num; // in dths
  const resultNum = k * improper;
  const rw = Math.floor(resultNum / d);
  const rr = resultNum % d;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>mixed number</strong>{" "}like 1¾ has a whole part and a fraction
        part. To multiply it by a whole number, the easiest way is to turn it into
        an <strong>improper fraction</strong>, multiply, then change back.
      </p>

      <Figure caption="Each row is one batch of the recipe. Stack up k batches.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 text-center text-lg font-semibold">
            A recipe needs <strong>{w} {num}/{d}</strong>{" "}cups. You make <strong>{k}</strong>{" "}batches. How many cups?
          </p>

          <div className="flex flex-col gap-1.5">
            {Array.from({ length: k }, (_, row) => (
              <div key={row} className="flex items-center gap-1">
                {Array.from({ length: w }, (_, i) => <div key={`w${i}`} className="rounded" style={{ width: UNIT * d / 2, height: 22, background: WHOLE }} />)}
                <div className="flex overflow-hidden rounded border border-[var(--line)]">
                  {Array.from({ length: d }, (_, i) => <div key={i} className="border-r border-white/60 last:border-r-0" style={{ width: UNIT / 2, height: 22, background: i < num ? FRAC : "var(--surface-2)" }} />)}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">
              {k} × {w} {num}/{d} = {k} × {improper}/{d} = <span style={{ color: WHOLE }}>{resultNum}/{d}</span> = {rw}{rr > 0 ? ` ${rr}/${d}` : ""}
            </div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              {w} {num}/{d} = {improper}/{d}, and {k} copies is {resultNum}/{d} = <strong>{rw}{rr > 0 ? ` ${rr}/${d}` : ""}</strong>{" "}cups.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Stepper label="Whole" value={w} min={0} max={3} onChange={setW} />
            <Stepper label="Numerator" value={num} min={0} max={d - 1} onChange={setN} />
            <Stepper label="Denominator" value={d} min={2} max={5} onChange={(v) => { setD(v); setN((p) => Math.min(p, v - 1)); }} />
            <Stepper label="Batches" value={k} min={2} max={5} onChange={setK} />
          </div>
        </div>
      </Figure>

      <h2>Improper fractions make it easy</h2>
      <p>
        Writing {w} {num}/{d} as {improper}/{d} means it is {improper} pieces of
        size 1/{d}. Making {k} batches gives {k} × {improper} = {resultNum} of
        those pieces, which is {rw}{rr > 0 ? ` ${rr}/${d}` : ""} cups.
      </p>

      <MathCheck>
        <p>
          Solving real-world problems that multiply fractions and mixed numbers
          (5.NF.B.6) is easiest by converting mixed numbers to improper fractions
          first: {w} {num}/{d} = {improper}/{d}, so {k} × {w} {num}/{d} = {resultNum}/{d} = {rw}{rr > 0 ? ` ${rr}/${d}` : ""}. Multiplying the numerator by the whole
          number scales the amount.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-6 text-center text-xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
