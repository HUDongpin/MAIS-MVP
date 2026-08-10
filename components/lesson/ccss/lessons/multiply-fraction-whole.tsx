"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const SH = "var(--band-upper)";
const UNIT = 22;
const UNIT_NAMES: Record<number, [string, string]> = {
  2: ["half", "halves"],
  3: ["third", "thirds"],
  4: ["fourth", "fourths"],
  5: ["fifth", "fifths"],
  6: ["sixth", "sixths"],
  7: ["seventh", "sevenths"],
  8: ["eighth", "eighths"],
};
const unitName = (count: number, den: number) => UNIT_NAMES[den]?.[count === 1 ? 0 : 1] ?? `${den}ths`;

export default function Lesson() {
  const [n, setN] = useState(3);
  const [a, setA] = useState(2);
  const [b, setB] = useState(5);
  const num = a; // keep the fraction at or below one whole
  const total = n * num;
  const whole = Math.floor(total / b);
  const rem = total % b;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Multiplying a fraction by a whole number is <strong>repeated addition</strong>{" "}
        of that fraction. <strong>{n} × {num}/{b}</strong>{" "}means {n} copies of{" "}
        {num}/{b} — so you multiply the <strong>numerator</strong>{" "}and keep the
        denominator.
      </p>

      <Figure caption="Each group is one copy of the fraction. Count all the shaded pieces.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: n }, (_, g) => (
              <div key={g} className="flex overflow-hidden rounded border-2 border-[var(--line)]">
                {Array.from({ length: b }, (_, i) => (
                  <div key={i} className="border-r border-white/60 last:border-r-0" style={{ width: UNIT, height: 32, background: i < num ? SH : "var(--surface-2)" }} />
                ))}
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">
              {n} × {num}/{b} = <span style={{ color: SH }}>{total}/{b}</span>
              {total >= b && <span className="text-[var(--ink-soft)]"> = {whole}{rem > 0 ? ` ${rem}/${b}` : ""}</span>}
            </div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">
              ({num}/{b}) + ({num}/{b}) {n > 2 ? "+ …" : ""} = {total} pieces of size 1/{b}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Whole number" value={n} min={2} max={6} onChange={setN} />
            <Stepper label="Numerator" value={a} min={1} max={b} onChange={setA} />
            <Stepper label="Denominator" value={b} min={2} max={8} onChange={(v) => { setB(v); setA((p) => Math.min(p, v)); }} />
          </div>
        </div>
      </Figure>

      <h2>Multiply the top, keep the bottom</h2>
      <p>
        {/* The pieces are unit fractions of size 1/b, not num/b — the same
            sentence ends "each 1/{b}". */}
        The pieces are still {unitName(2, b)} — their size never changes. You
        just end up with {n} times as many of them: {n} × {num} = {total} pieces,
        each 1/{b}. That is {total}/{b}.
      </p>

      <MathCheck>
        <p>
          Multiplying a fraction by a whole number (4.NF.B.4) uses the idea that{" "}
          {num}/{b} = {num} × (1/{b}), so {n} × {num}/{b} = ({n} × {num})/{b} = {total}/{b}. It is repeated addition of the unit fraction 1/{b}, which is why
          only the numerator changes.
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
