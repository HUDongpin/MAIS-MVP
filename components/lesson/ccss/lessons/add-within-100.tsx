"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Mode = "ones" | "tens" | "subtens";
const TENC = "var(--band-upper)";
const ONEC = "var(--band-early)";
const ADDC = "var(--band-middle)";

function Blocks({ tens, ones, extraTens = 0, extraOnes = 0 }: { tens: number; ones: number; extraTens?: number; extraOnes?: number }) {
  return (
    <div className="flex items-end justify-center gap-2" style={{ minHeight: 74 }}>
      <div className="flex items-end gap-1">
        {Array.from({ length: tens }, (_, i) => <div key={`t${i}`} className="rounded-sm" style={{ width: 9, height: 68, background: TENC }} />)}
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
  const result = Math.max(0, Math.min(99, base + delta));
  const carry = mode === "ones" && (base % 10) + amt >= 10;

  const baseTens = Math.floor(base / 10), baseOnes = base % 10;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Adding bigger numbers is easy when you use tens and ones. Add ones to
        ones, and tens to tens. Sometimes ten ones bundle up into a brand-new{" "}
        <strong>ten</strong>.
      </p>

      <Figure caption="Purple blocks are what you add or take away. Watch the tens and ones.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {([["ones", "+ ones"], ["tens", "+ tens"], ["subtens", "− tens"]] as [Mode, string][]).map(([m, lbl]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m ? { background: ADDC, color: "white", borderColor: ADDC } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          <Blocks
            tens={baseTens}
            ones={baseOnes}
            extraTens={mode === "tens" ? amt : 0}
            extraOnes={mode === "ones" ? amt : 0}
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
            <Stepper label="Start number" value={base} min={10} max={89} onChange={setBase} />
            <Stepper label={mode === "ones" ? "ones to add" : "tens"} value={amt} min={1} max={mode === "ones" ? 9 : 5} onChange={setAmt} />
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
