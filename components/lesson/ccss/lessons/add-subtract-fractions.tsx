"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A = "var(--band-upper)";
const B = "var(--band-middle)";
const UNIT = 30;

// The denominator is a student control (2–8), so the unit's name has to follow
// it. It used to be hard-coded as "fifths" in the caption, a stepper label and
// two sentences of prose, which read "3 fifths plus 4 fifths is 7 fifths" over a
// picture of eighths.
const UNIT_NAMES: Record<number, [string, string]> = {
  2: ["half", "halves"],
  3: ["third", "thirds"],
  4: ["fourth", "fourths"],
  5: ["fifth", "fifths"],
  6: ["sixth", "sixths"],
  7: ["seventh", "sevenths"],
  8: ["eighth", "eighths"]
};
const unitName = (count: number, den: number) => UNIT_NAMES[den]?.[count === 1 ? 0 : 1] ?? `${den}ths`;

export default function Lesson() {
  const [n1, setN1] = useState(3);
  const [n2, setN2] = useState(4);
  const [d, setD] = useState(5);
  const [op, setOp] = useState<"add" | "sub">("add");

  const a = n1;
  const b = n2;
  const result = op === "add" ? a + b : a - b;
  const whole = Math.floor(result / d);
  const rem = result % d;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Adding fractions with the <strong>same denominator</strong>{" "}is just
        counting the pieces. The pieces are all the same size (1/{d}), so you add
        or subtract the <strong>numerators</strong>{" "}and keep the denominator.
      </p>

      <Figure caption={`Same-size pieces (${unitName(2, d)} here). Join them to add; take some away to subtract.`}>
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["add", "sub"] as const).map((o) => (
              <button key={o} type="button" onClick={() => { setOp(o); if (o === "sub") setN2((p) => Math.min(p, n1)); }} aria-pressed={op === o} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o === "add" ? "Add" : "Subtract"}</button>
            ))}
          </div>

          {/* pieces */}
          <div className="flex flex-wrap items-center justify-center gap-1">
            {Array.from({ length: a }, (_, i) => <div key={`a${i}`} className="rounded" style={{ width: UNIT, height: 30, background: A }} />)}
            <span className="mx-1 text-2xl font-black text-[var(--ink-faint)]">{op === "add" ? "+" : "−"}</span>
            {Array.from({ length: b }, (_, i) => <div key={`b${i}`} className="rounded" style={{ width: UNIT, height: 30, background: op === "add" ? B : "var(--surface-2)", border: op === "sub" ? `2px dashed ${B}` : "none" }} />)}
          </div>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">
              {a}/{d} {op === "add" ? "+" : "−"} {b}/{d} = <span style={{ color: A }}>{result}/{d}</span>
            </div>
            {result >= d && (
              <div className="mt-1 font-mono text-[15px] text-[var(--ink-soft)]">
                = {whole}{rem > 0 ? ` ${rem}/${d}` : ""} (as a {rem > 0 ? "mixed number" : "whole number"})
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label={op === "add" ? `First (${unitName(2, d)})` : "Start"} value={n1} min={1} max={d * 2} onChange={(v) => { setN1(v); if (op === "sub") setN2((p) => Math.min(p, v)); }} />
            <Stepper label={op === "add" ? "Second" : "Take away"} value={n2} min={1} max={op === "sub" ? a : d * 2} onChange={setN2} />
            <Stepper label="Denominator" value={d} min={2} max={8} onChange={(v) => {
              const nextFirst = Math.min(n1, v * 2);
              const nextSecond = Math.min(n2, op === "sub" ? nextFirst : v * 2);
              setD(v);
              setN1(nextFirst);
              setN2(nextSecond);
            }} />
          </div>
        </div>
      </Figure>

      <h2>Count the pieces</h2>
      <p>
        {a} {unitName(a, d)} {op === "add" ? "plus" : "minus"} {b} {unitName(b, d)} is {result}{" "}
        {unitName(result, d)}. When you have {d} or more {unitName(2, d)}, that is one or more{" "}
        <strong>wholes</strong>{result >= d ? <> — {result}/{d} = {whole}{rem > 0 ? ` ${rem}/${d}` : ""}</> : <>. Here {result}/{d} is still less than one whole</>}.
      </p>

      <MathCheck>
        <p>
          Adding and subtracting fractions with like denominators (4.NF.B.3) is{" "}
          <strong>joining or separating parts</strong>{" "}of the same whole: add the
          numerators, keep the denominator. A fraction like {result}/{d} can be{" "}
          <strong>decomposed</strong>{" "}into wholes and any remaining part. {result >= d
            ? rem > 0
              ? <>Here it is the <strong>mixed number</strong>{" "}{whole} {rem}/{d}, because each {d}/{d} makes 1 whole.</>
              : <>Here it is the <strong>whole number</strong>{" "}{whole}, because {result}/{d} contains exactly {whole} group{whole === 1 ? "" : "s"} of {d}/{d}.</>
            : <>{result}/{d} is less than one whole, so it remains a single fraction.</>}
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
