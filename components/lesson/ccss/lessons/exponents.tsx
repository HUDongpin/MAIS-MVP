"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";

export default function Lesson() {
  const [base, setBase] = useState(3);
  const [exp, setExp] = useState(4);

  const value = Math.pow(base, exp);
  const expansion = exp === 0 ? "1 (any base to the 0 power)" : Array.from({ length: exp }, () => base).join(" × ");
  const nameFor = exp === 2 ? "“" + base + " squared”" : exp === 3 ? "“" + base + " cubed”" : null;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        An <strong>exponent</strong>{" "}is a shortcut for repeated multiplication.{" "}
        <strong>{base}<sup>{exp}</sup></strong>{" "}means multiply {base} by itself{" "}
        {exp} time{exp === 1 ? "" : "s"} — not {base} × {exp}!
      </p>

      <Figure caption="The small raised number counts the factors, not what you multiply by.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-5xl font-black">{base}<sup className="text-3xl">{exp}</sup></div>

          <div className="text-center">
            <div className="font-mono text-xl">{expansion}</div>
            <div className="mt-2 font-mono text-3xl font-black">= <span style={{ color: ACCENT }}>{value.toLocaleString()}</span></div>
            {nameFor && <div className="mt-1 text-sm text-[var(--ink-faint)]">read as {nameFor}</div>}
          </div>

          {exp === 2 && (
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${base}, 1.1rem)` }}>
              {Array.from({ length: base * base }, (_, i) => <div key={i} className="h-4 w-4 rounded-sm" style={{ background: ACCENT }} />)}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Base" value={base} min={2} max={6} onChange={setBase} />
            <Stepper label="Exponent" value={exp} min={0} max={5} onChange={setExp} />
          </div>
        </div>
      </Figure>

      <h2>Base and exponent</h2>
      <p>
        The <strong>base</strong>{" "}({base}) is what gets multiplied; the{" "}
        {/* At exp = 1 (and exp = 0 with base 0) the "mistake" and the true value
            coincide, so the contrast asserted a difference that is not there. */}
        <strong>exponent</strong>{" "}({exp}) is how many times.{" "}
        {base * exp === value ? (
          <>Here {base} × {exp} happens to equal {base}<sup>{exp}</sup>{" "}= {value.toLocaleString()} — try a
          bigger exponent to see the two come apart.</>
        ) : (
          <>A common mistake is to compute {base} × {exp} = {base * exp} — but {base}<sup>{exp}</sup>{" "}is
          actually {value.toLocaleString()}.</>
        )}
      </p>

      <MathCheck>
        <p>
          A whole-number exponent counts how many times the base is used as a
          factor (6.EE.A.1): {base}<sup>{exp}</sup> = {exp === 0 ? "1" : expansion} = {value.toLocaleString()}. Exponent 2 is &ldquo;squared&rdquo; (it gives the area of
          a square), exponent 3 is &ldquo;cubed&rdquo; (the volume of a cube), and
          any nonzero base to the 0 power is 1.
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
