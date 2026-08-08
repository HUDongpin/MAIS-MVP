"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Mode = "ones" | "tens" | "subtens";
const TENC = "var(--band-upper)";
const ONEC = "var(--band-early)";
const ADDC = "var(--band-middle)";

function Blocks({ tens, ones, extraTens = 0, extraOnes = 0, removeTens = 0 }: { tens: number; ones: number; extraTens?: number; extraOnes?: number; removeTens?: number }) {
  // In "− tens" mode nothing used to be marked, so the caption's "or take away"
  // had no referent: the figure just showed the untouched number. The rods on
  // their way out are now marked in the same colour, faded and dashed.
  const keptTens = Math.max(0, tens - removeTens);
  return (
    <div className="flex items-end justify-center gap-2" style={{ minHeight: 74 }}>
      <div className="flex items-end gap-1">
        {Array.from({ length: keptTens }, (_, i) => <div key={`t${i}`} className="rounded-sm" style={{ width: 9, height: 68, background: TENC }} />)}
        {Array.from({ length: Math.min(removeTens, tens) }, (_, i) => <div key={`rt${i}`} className="rounded-sm border-2 border-dashed" style={{ width: 9, height: 68, background: ADDC, opacity: 0.45, borderColor: ADDC }} />)}
        {Array.from({ length: extraTens }, (_, i) => <div key={`et${i}`} className="rounded-sm" style={{ width: 9, height: 68, background: ADDC }} />)}
      </div>
      <div className="grid content-end gap-0.5" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        {Array.from({ length: ones }, (_, i) => <div key={`o${i}`} className="rounded-sm" style={{ width: 9, height: 9, background: ONEC }} />)}
        {Array.from({ length: extraOnes }, (_, i) => <div key={`eo${i}`} className="rounded-sm" style={{ width: 9, height: 9, background: ADDC }} />)}
      </div>
    </div>
  );
}

export default function Lesson() {
  const [base, setBase] = useState(34);
  const [amt, setAmt] = useState(7);
  const [mode, setMode] = useState<Mode>("ones");

  const delta = mode === "ones" ? amt : mode === "tens" ? amt * 10 : -amt * 10;
  // No clamp on the answer. Clamping it printed "89 + 50 = 99" and
  // "10 − 50 = 0" — in the equation, in the prose, and inside the Math Check —
  // while the blocks above drew the true quantity. The amount is bounded
  // instead, so every reachable state stays inside 0..99 and stays true.
  const result = base + delta;
  const amtMax =
    mode === "ones" ? Math.min(9, 99 - base)
    : mode === "tens" ? Math.max(1, Math.min(5, Math.floor((99 - base) / 10)))
    : Math.max(1, Math.min(5, Math.floor(base / 10)));
  const carry = mode === "ones" && (base % 10) + amt >= 10;

  const baseTens = Math.floor(base / 10), baseOnes = base % 10;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Adding bigger numbers is easy when you use tens and ones. Add ones to
        ones, and tens to tens. Sometimes ten ones bundle up into a brand-new{" "}
        <strong>ten</strong>.
      </p>

      <Figure caption="Blue blocks are what you add; faded dashed blocks are what you take away. Watch the tens and ones.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {([["ones", "+ ones"], ["tens", "+ tens"], ["subtens", "− tens"]] as [Mode, string][]).map(([m, lbl]) => (
              // Clamp the amount into the new mode's range: a 9 left over from
              // "+ ones" survived into "+ tens" and gave "34 + 90 = 99".
              <button key={m} type="button" onClick={() => { setMode(m); setAmt((p) => Math.max(1, Math.min(p, m === "ones" ? Math.min(9, 99 - base) : m === "tens" ? Math.floor((99 - base) / 10) : Math.floor(base / 10)))); }} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m ? { background: ADDC, color: "white", borderColor: ADDC } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          <Blocks
            tens={baseTens}
            ones={baseOnes}
            extraTens={mode === "tens" ? amt : 0}
            extraOnes={mode === "ones" ? amt : 0}
            removeTens={mode === "subtens" ? amt : 0}
          />

          <div className="font-mono text-3xl font-black">
            {base} {delta < 0 ? "−" : "+"} {Math.abs(delta)} ={" "}
            <span style={{ color: ADDC }}>{result}</span>
          </div>

          {carry && (
            <p className="m-0 rounded-lg bg-[color-mix(in_oklab,var(--band-middle)_12%,var(--surface))] px-4 py-2 text-center text-sm font-semibold">
              {baseOnes} + {amt} = {baseOnes + amt} ones — that makes a new ten! Bundle 10 ones into a ten.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* Re-clamp the amount whenever the base moves, or raising the base
                with the amount already high re-creates the overflow. */}
            <Stepper label="Start number" value={base} min={10} max={89} onChange={(v) => { setBase(v); setAmt((p) => Math.max(1, Math.min(p, mode === "ones" ? Math.min(9, 99 - v) : mode === "tens" ? Math.floor((99 - v) / 10) : Math.floor(v / 10)))); }} />
            {/* In subtens mode delta = −amt × 10, so "Increase tens" removed
                MORE ten-rods and lowered the answer. The name now says which
                direction the amount runs. */}
            <Stepper label={mode === "ones" ? "ones to add" : mode === "tens" ? "tens to add" : "tens to take away"} value={amt} min={1} max={amtMax} onChange={setAmt} />
          </div>
        </div>
      </Figure>

      <h2>Line up tens with tens</h2>
      <p>
        {mode === "subtens"
          ? `Taking away ${amt} ten${amt === 1 ? "" : "s"} removes ${amt} rod${amt === 1 ? "" : "s"}: ${base} − ${amt * 10} = ${result}.`
          : mode === "tens"
            ? `Adding ${amt} ten${amt === 1 ? "" : "s"} adds ${amt} rod${amt === 1 ? "" : "s"}, and the ones stay put: ${result}.`
            : `Add the ones together${carry ? ", and if you reach ten, make a new ten" : ""}: ${result}.`}
      </p>

      <MathCheck>
        <p>
          Adding within 100 uses place value: add ones to ones and tens to tens,
          and <strong>compose a new ten</strong>{" "}whenever the ones reach ten
          (1.NBT.C.4). Subtracting a multiple of ten just removes whole ten-rods,
          leaving the ones unchanged (1.NBT.C.6): {mode === "subtens" ? `${base} − ${amt * 10} = ${result}` : `e.g. ${base} − 10 = ${base - 10}`}.
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
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
