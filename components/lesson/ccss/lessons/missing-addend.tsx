"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const KNOWN = "var(--band-middle)";
const MISSING = "var(--band-early)";
const WHOLE = "var(--band-upper)";
const UNIT = 30;

export default function Lesson() {
  const [whole, setWhole] = useState(8);
  const [known, setKnown] = useState(3);
  const [revealed, setRevealed] = useState(false);

  const k = Math.min(known, whole);
  const missing = whole - k;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Here is a secret: <strong>subtraction is just addition with a missing
        part</strong>. “{whole} − {k} = ?” is really asking “{k} + ? = {whole}?”
        Find the part that fills the gap.
      </p>

      <Figure caption="The long bar is the whole. One part is known — the missing part completes it.">
        <div className="mx-auto flex w-max max-w-none self-start flex-col items-center gap-6">
          {/* whole bar */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 overflow-hidden rounded-xl border-2 border-[var(--line)]">
              {Array.from({ length: whole }, (_, i) => (
                <div key={i} className="border-r border-white/50" style={{ width: UNIT, background: i < k ? KNOWN : revealed ? MISSING : "var(--surface-2)" }} />
              ))}
            </div>
            <span className="text-sm font-bold" style={{ color: WHOLE }}>whole = {whole}</span>
          </div>

          <div className="flex items-center gap-8 text-center">
            <div>
              <div className="text-3xl font-black" style={{ color: KNOWN }}>{k}</div>
              <div className="text-xs font-semibold text-[var(--ink-faint)]">known part</div>
            </div>
            <div className="text-2xl font-black text-[var(--ink-faint)]">+</div>
            <div>
              <div className="grid h-12 w-12 place-items-center rounded-xl border-2 text-3xl font-black" style={{ borderColor: MISSING, color: MISSING, background: revealed ? "color-mix(in oklab, var(--band-early) 12%, var(--surface))" : "var(--surface)" }}>
                {revealed ? missing : "?"}
              </div>
              <div className="text-xs font-semibold text-[var(--ink-faint)]">missing part</div>
            </div>
          </div>

          <div className="font-mono text-2xl font-black">
            {k} + <span style={{ color: MISSING }}>{revealed ? missing : "?"}</span> = {whole}
            <span className="mx-3 text-[var(--ink-faint)]">↔</span>
            {whole} − {k} = <span style={{ color: MISSING }}>{revealed ? missing : "?"}</span>
          </div>

          <button type="button" onClick={() => setRevealed((r) => !r)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: MISSING }}>
            {revealed ? "Hide the answer" : "Show the missing part"}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Whole" value={whole} min={2} max={12} color={WHOLE} onChange={(v) => { setWhole(v); setKnown((p) => Math.min(p, v)); setRevealed(false); }} />
            <Stepper label="Known part" value={k} min={0} max={whole} color={KNOWN} onChange={(v) => { setKnown(v); setRevealed(false); }} />
          </div>
        </div>
      </Figure>

      <h2>Two questions, one answer</h2>
      <p>
        “{whole} take away {k}” and “what do I add to {k} to get {whole}” have
        the very same answer: <strong>{missing}</strong>. That is why knowing
        your addition facts also gives you the subtraction facts.
      </p>

      <MathCheck>
        <p>
          Subtraction is an <strong>unknown-addend problem</strong>{" "}(1.OA.B.4):{" "}
          {whole} − {k} asks for the number that, added to {k}, makes {whole} — so{" "}
          {k} + {missing} = {whole}. Seeing subtraction this way lets students use
          addition facts they already know to subtract.
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
