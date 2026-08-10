"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [base, setBase] = useState(2);
  const [target, setTarget] = useState(3); // solve base^x = value; use exponent target for exactness

  const value = Math.pow(base, target);
  const solved = r2(Math.log(value) / Math.log(base));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>logarithm answers "what exponent?"</strong>{" "}Since 2⁵ = 32, we say
        log₂ 32 = 5. So to solve an exponential equation like 2ˣ = 32, you take a
        logarithm of both sides — the log undoes the exponent.
      </p>

      <Figure caption="For b > 0, b ≠ 1, and value > 0, log_b(value) is the exponent that solves bˣ = value.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-2xl border-2 px-8 py-4 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-2xl font-black">{base}<sup>x</sup> = {value}</div>
            <div className="mt-2 font-mono text-lg">x = log<sub>{base}</sub>({value}) = <span style={{ color: ACCENT }}>{solved}</span></div>
          </div>

          <div className="flex flex-col items-center gap-1 font-mono text-sm text-[var(--ink-soft)]">
            <span>exponential form: {base}<sup>{target}</sup> = {value}</span>
            <span>logarithmic form: log<sub>{base}</sub>({value}) = {target}</span>
            <span className="text-[var(--ink-faint)]">— two ways to say the same fact</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="base b" value={base} min={2} max={5} onChange={setBase} />
            <Stepper label="exponent" value={target} min={1} max={6} onChange={setTarget} />
          </div>
        </div>
      </Figure>

      <h2>Logs turn multiplication into addition</h2>
      <p>
        For one fixed valid base b, exponents add when positive powers multiply,
        so logs turn products into sums: <strong>logᵦ(xy) = logᵦx + logᵦy</strong>{" "}
        for x &gt; 0 and y &gt; 0. That property lets you{" "}
        <strong>solve for an unknown exponent</strong>: from A·bᵗ = C with A ≠ 0, first isolate
        bᵗ and verify C/A &gt; 0, then take logᵦ to bring t down. Logarithms solve
        exponential models such as half-life and compound interest, and they define
        logarithmic scales such as pH and decibels.
      </p>

      <MathCheck>
        <p>
          For real logarithms, the base must satisfy <strong>b &gt; 0</strong>{" "}and{" "}
          <strong>b ≠ 1</strong>, and the input must satisfy <strong>y &gt; 0</strong>.
          Then <strong>logᵦ(y)</strong>{" "}is the exponent x with bˣ = y, so it is
          the inverse of that exponential. To <strong>solve exponential
          equations</strong>{" "}like a·bᵗ = c with a ≠ 0 and c/a &gt; 0, take a logarithm
          after isolating bᵗ to free the exponent (F-LE.4). This is how continuous growth and decay models are
          solved for time.
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
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
