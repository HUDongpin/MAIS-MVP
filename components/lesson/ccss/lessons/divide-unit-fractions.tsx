"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A = "var(--band-upper)";
const B = "var(--band-middle)";
const BARW = 260;

export default function Lesson() {
  const [mode, setMode] = useState<"uw" | "wu">("wu");
  const [w, setW] = useState(4); // whole
  const [b, setB] = useState(2); // unit fraction 1/b
  const [n, setN] = useState(3); // divide by whole

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Dividing with <strong>unit fractions</strong>{" "}asks a &ldquo;how many
        fit&rdquo; or &ldquo;split into&rdquo; question. There are two kinds: a
        whole number divided by a unit fraction, and a unit fraction divided by a
        whole number.
      </p>

      <Figure caption="Whole ÷ unit fraction counts how many pieces fit. Unit fraction ÷ whole splits one piece further.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMode("wu")} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === "wu" ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>whole ÷ 1/b</button>
            <button type="button" onClick={() => setMode("uw")} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === "uw" ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>1/b ÷ whole</button>
          </div>

          {mode === "wu" ? (
            <>
              <div className="mx-auto flex w-max max-w-none self-start flex-col gap-1.5">
                {Array.from({ length: w }, (_, wi) => (
                  <div key={wi} className="flex overflow-hidden rounded border-2 border-[var(--line)]" style={{ width: BARW, height: 24 }}>
                    {Array.from({ length: b }, (_, i) => <div key={i} className="border-r border-white last:border-r-0" style={{ width: BARW / b, background: (wi * b + i) % 2 === 0 ? A : B, opacity: 0.85 }} />)}
                  </div>
                ))}
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl font-black">{w} ÷ 1/{b} = <span style={{ color: A }}>{w * b}</span></div>
                <p className="mt-1 text-[15px] text-[var(--ink-soft)]">There are {b} pieces of size 1/{b} in each whole, and {w} wholes — so {w} × {b} = {w * b} pieces.</p>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto flex w-max max-w-none self-start flex-col items-center gap-2">
                <div className="flex overflow-hidden rounded border-2 border-[var(--line)]" style={{ width: BARW, height: 30 }}>
                  {Array.from({ length: b }, (_, i) => (
                    <div key={i} className="flex border-r border-white last:border-r-0" style={{ width: BARW / b }}>
                      {i === 0 && Array.from({ length: n }, (_, j) => <div key={j} className="border-r border-white/70 last:border-r-0" style={{ width: (BARW / b) / n, height: 26, background: A, opacity: 0.85 }} />)}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-[var(--ink-faint)]">the first 1/{b} is split into {n} equal parts</span>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl font-black">1/{b} ÷ {n} = <span style={{ color: A }}>1/{b * n}</span></div>
                <p className="mt-1 text-[15px] text-[var(--ink-soft)]">Splitting 1/{b} into {n} equal parts makes each part 1/({b}×{n}) = 1/{b * n}.</p>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6">
            {mode === "wu" && <Stepper label="Whole" value={w} min={1} max={6} onChange={setW} />}
            <Stepper label="Denominator b" value={b} min={2} max={5} onChange={setB} />
            {mode === "uw" && <Stepper label="Divide by" value={n} min={2} max={5} onChange={setN} />}
          </div>
        </div>
      </Figure>

      <h2>Two questions, one idea</h2>
      <p>
        {mode === "wu"
          ? `"How many 1/${b}s are in ${w}?" Each whole holds ${b} of them, so ${w} ÷ 1/${b} = ${w * b}.`
          : `"Split 1/${b} into ${n} equal parts." Each part is 1/${b * n}, so 1/${b} ÷ ${n} = 1/${b * n}.`}{" "}
        You can always check by multiplying back.
      </p>

      <MathCheck>
        <p>
          Dividing unit fractions by whole numbers and whole numbers by unit
          fractions (5.NF.B.7): a whole ÷ 1/b counts how many 1/b pieces fit ({w} ÷ 1/{b} = {w * b}), and 1/b ÷ a whole splits one piece into smaller ones (1/{b} ÷ {n} = 1/{b * n}). Each answer checks with the matching
          multiplication.
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
