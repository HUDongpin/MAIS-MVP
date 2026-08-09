"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const COEF = "var(--band-middle)";
const VARC = "var(--band-upper)";
const CONST = "var(--band-early)";

export default function Lesson() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(5);
  const [x, setX] = useState(4);

  const value = a * x + b;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>variable</strong>{" "}is a letter that stands for a number that can
        change. An <strong>expression</strong>{" "}like{" "}
        <strong>{a}x + {b}</strong>{" "}is a rule: whatever <em>x</em>{" "}is, multiply by{" "}
        {a} and add {b}.
      </p>

      <Figure caption="Slide x and the expression takes a value. Substitute, then evaluate.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-4xl font-black">
            <span style={{ color: COEF }}>{a}</span><span style={{ color: VARC }}>x</span> + <span style={{ color: CONST }}>{b}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold uppercase">
            <span style={{ color: COEF }}>coefficient</span>
            <span style={{ color: VARC }}>variable</span>
            <span style={{ color: CONST }}>constant</span>
          </div>

          <div className="rounded-2xl border-2 px-8 py-4 text-center" style={{ borderColor: VARC }}>
            <div className="text-xs font-bold uppercase text-[var(--ink-faint)]">when x = {x}</div>
            <div className="font-mono text-lg">{a}({x}) + {b} = {a * x} + {b}</div>
            <div className="font-mono text-3xl font-black" style={{ color: VARC }}>= {value}</div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">x = <span style={{ color: VARC }}>{x}</span></span>
            <input type="range" min={0} max={10} value={x} onChange={(e) => setX(Number(e.target.value))} className="w-56 accent-[var(--band-upper)]" aria-label="x value" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Coefficient" value={a} min={1} max={9} color={COEF} onChange={setA} />
            <Stepper label="Constant" value={b} min={0} max={9} color={CONST} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Reading and writing expressions</h2>
      <p>
        &ldquo;{a} times a number, plus {b}&rdquo; becomes {a}x + {b}. Using a
        letter lets one expression describe <em>every</em>{" "}case at once — you only
        plug in a value to <strong>evaluate</strong>{" "}it.
      </p>

      <MathCheck>
        <p>
          Variables represent numbers, so an expression like <strong>{a}x + {b}</strong>{" "}
          captures a rule (6.EE.B.6). Reading, writing, and{" "}
          <strong>evaluating</strong>{" "}such expressions — substituting a value for
          the variable and computing — is 6.EE.A.2. Here, at x = {x}, {a}x + {b} = {value}. The parts are a coefficient, a variable, and a constant.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
