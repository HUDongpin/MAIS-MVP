"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const SHARE = "var(--band-upper)";
const BARW = 220;

export default function Lesson() {
  const [a, setA] = useState(3); // things to share
  const [b, setB] = useState(4); // people

  const decimal = +(a / b).toFixed(3);
  // b = 3 and b = 6 give repeating decimals, and the page asserted
  // "1/3 = 0.333" with a bare equals sign — a terminating decimal presented as
  // exactly equal to a repeating one, in the lesson that introduces the idea.
  const exactDecimal = Math.abs(a / b - decimal) < 1e-9;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A fraction <strong>is</strong>{" "}a division. Sharing <strong>{a}</strong>{" "}
        things equally among <strong>{b}</strong>{" "}people gives each person{" "}
        <strong>{a} ÷ {b} = {a}/{b}</strong>. The numerator is what you share; the
        denominator is how many share it.
      </p>

      <Figure caption="Cut each whole into equal parts; one person's share (highlighted) from every whole makes a/b.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 text-center text-lg font-semibold">
            {a} cookie{a === 1 ? "" : "s"} shared equally by {b} friends — how much each?
          </p>

          <div className="flex flex-col gap-2">
            {Array.from({ length: a }, (_, w) => (
              <div key={w} className="flex overflow-hidden rounded-lg border-2 border-[var(--line)]" style={{ width: BARW, height: 28 }}>
                {Array.from({ length: b }, (_, i) => (
                  <div key={i} className="border-r border-white/60 last:border-r-0" style={{ width: BARW / b, background: i === 0 ? SHARE : "var(--surface-2)" }} />
                ))}
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">{a} ÷ {b} = <span style={{ color: SHARE }}>{a}/{b}</span> {exactDecimal ? "=" : "≈"} {decimal}</div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              Each friend gets one piece from each of the {a} cookie{a === 1 ? "" : "s"} — that is {a} piece{a === 1 ? "" : "s"} of size 1/{b}, or {a}/{b} of a cookie.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Cookies (a)" value={a} min={1} max={6} onChange={setA} />
            <Stepper label="Friends (b)" value={b} min={2} max={6} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Numerator ÷ denominator</h2>
      <p>
        This is why <strong>a/b = a ÷ b</strong>. Whether you think &ldquo;{a}{" "}
        cut into {b} equal shares&rdquo; or &ldquo;{a} divided by {b},&rdquo; the
        answer is the same fraction, {a}/{b} — which {exactDecimal ? "equals the decimal" : "is about"} {decimal}{exactDecimal ? "" : " (the decimal repeats forever)"}.
      </p>

      <MathCheck>
        <p>
          A fraction is the result of dividing the numerator by the denominator:{" "}
          <strong>a/b = a ÷ b</strong>{" "}(5.NF.B.3). Sharing {a} wholes among {b}{" "}
          people gives each {a}/{b}, because each person takes one of the {b} equal
          parts from every whole. This also explains how to write a fraction as a
          decimal.
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
