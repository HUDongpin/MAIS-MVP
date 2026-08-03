"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A = "var(--band-middle)";
const B = "var(--band-early)";
const CC = "var(--band-high)";
const PXU = 5;

export default function Lesson() {
  const [twoStep, setTwoStep] = useState(false);
  const [a, setA] = useState(45);
  const [b, setB] = useState(18);
  const [c, setC] = useState(12);

  const step1 = a - Math.min(b, a); // birds left after b fly away
  const answer = twoStep ? step1 + c : a + b;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Word problems are math hiding inside a story. A <strong>tape diagram</strong>{" "}
        (a bar) helps you see what to add and what to take away — even when the
        story has <strong>two steps</strong>.
      </p>

      <Figure caption="The bars show the amounts. Read the story, then add or subtract.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {[false, true].map((v) => (
              <button key={String(v)} type="button" onClick={() => setTwoStep(v)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={twoStep === v ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{v ? "Two step" : "One step"}</button>
            ))}
          </div>

          <p className="m-0 max-w-md text-center text-lg font-semibold">
            {twoStep
              ? <>{a} birds sat on a wire. {Math.min(b, a)} flew away. Then {c} more landed. How many birds now?</>
              : <>The library had {a} books. {b} more were donated. How many books in all?</>}
          </p>

          {/* tape diagram */}
          <div className="flex w-full max-w-lg flex-col items-center gap-2">
            <div className="flex h-8 overflow-hidden rounded-lg">
              {/* In two-step mode the bar has to start from what is LEFT after
                  the birds fly away. It drew the full starting bar plus the
                  landed bar, so the picture showed 45 + 12 = 57 beside an
                  equation reading 45 − 18 + 12 = 39, and nothing represented
                  the subtraction the caption promises. */}
              <div className="grid place-items-center text-xs font-bold text-white" style={{ width: (twoStep ? step1 : a) * PXU, background: A }}>{twoStep ? step1 : a}</div>
              {!twoStep && <div className="grid place-items-center border-l-2 border-white text-xs font-bold text-white" style={{ width: b * PXU, background: B }}>{b}</div>}
              {twoStep && <div className="grid place-items-center border-l-2 border-white text-xs font-bold text-white" style={{ width: c * PXU, background: CC }}>+{c}</div>}
            </div>
            {twoStep && (
              <p className="m-0 text-xs text-[var(--ink-faint)]">first {a} − {Math.min(b, a)} = {step1}, then + {c}</p>
            )}
          </div>

          <div className="font-mono text-2xl font-black">
            {twoStep ? <>{a} − {Math.min(b, a)} + {c}</> : <>{a} + {b}</>} ={" "}
            <span style={{ color: A }}>{answer}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Start" value={a} min={10} max={80} color={A} onChange={setA} />
            <Stepper label={twoStep ? "Flew away" : "Added"} value={b} min={1} max={twoStep ? a : 40} color={B} onChange={setB} />
            {twoStep && <Stepper label="Landed" value={c} min={1} max={40} color={CC} onChange={setC} />}
          </div>
        </div>
      </Figure>

      <h2>One step or two</h2>
      <p>
        A one-step problem needs a single add or subtract. A two-step problem
        makes you do one operation, then use that answer in the next. The bar
        keeps track of the amounts.
      </p>

      <MathCheck>
        <p>
          Using addition and subtraction within 100 to solve one- and two-step
          word problems — putting together, taking apart, and comparing — is
          2.OA.A.1. A <strong>tape diagram</strong>{" "}models the story so you can
          choose the right operations{twoStep ? `: first ${a} − ${Math.min(b, a)} = ${step1}, then ${step1} + ${c} = ${answer}` : `: ${a} + ${b} = ${answer}`}.
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
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
