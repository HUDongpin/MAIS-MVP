"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

type Kind = "arithmetic" | "geometric";

export default function Lesson() {
  const [kind, setKind] = useState<Kind>("arithmetic");
  const [a1, setA1] = useState(3);
  const [step, setStep] = useState(2); // common difference or ratio

  const term = (n: number) => (kind === "arithmetic" ? a1 + (n - 1) * step : a1 * Math.pow(step, n - 1));
  const seq = Array.from({ length: 6 }, (_, i) => term(i + 1));
  const recursive = kind === "arithmetic" ? `aₙ = aₙ₋₁ + ${step}` : `aₙ = aₙ₋₁ × ${step}`;
  const explicit = kind === "arithmetic" ? `aₙ = ${a1} + (n − 1)·${step}` : `aₙ = ${a1} · ${step}^(n−1)`;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A pattern can be written two ways. The <strong>recursive</strong>{" "}rule
        says how to get the next term from the last; the <strong>explicit</strong>{" "}
        rule jumps straight to the nth term. <strong>Arithmetic</strong>{" "}sequences
        add a fixed amount; <strong>geometric</strong>{" "}ones multiply.
      </p>

      <Figure caption="Build a sequence recursively (step from the last term) or explicitly (formula in n).">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {(["arithmetic", "geometric"] as Kind[]).map((k) => (
              <button key={k} type="button" onClick={() => { setKind(k); if (k === "geometric") setStep((current) => Math.max(2, current)); }} aria-pressed={kind === k} className="rounded-lg border px-4 py-1.5 text-sm font-bold capitalize" style={kind === k ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{k}</button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-lg">
            {seq.map((v, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-[var(--ink-faint)]">{kind === "arithmetic" ? `+${step}` : `×${step}`}→</span>}
                <span className="rounded-lg bg-[var(--surface-2)] px-3 py-1 font-bold" style={{ color: ACCENT }}>{v}</span>
              </span>
            ))}
          </div>

          <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border-2 p-3 text-center" style={{ borderColor: ACCENT }}>
              <div className="text-xs font-bold uppercase text-[var(--ink-faint)]">recursive</div>
              <div className="font-mono font-black">{recursive}</div>
              <div className="text-xs text-[var(--ink-faint)]">a₁ = {a1}</div>
            </div>
            <div className="rounded-xl border-2 p-3 text-center" style={{ borderColor: ACCENT }}>
              <div className="text-xs font-bold uppercase text-[var(--ink-faint)]">explicit</div>
              <div className="font-mono font-black">{explicit}</div>
              <div className="text-xs text-[var(--ink-faint)]">a₅ = {term(5)}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="first term a₁" value={a1} min={1} max={9} onChange={setA1} />
            <Stepper label={kind === "arithmetic" ? "difference d" : "ratio r"} value={step} min={kind === "geometric" ? 2 : 1} max={5} onChange={setStep} />
          </div>
        </div>
      </Figure>

      <h2>Recursive vs. explicit</h2>
      <p>
        The recursive form ({recursive}) is easy to build step by step but slow for,
        say, the 100th term. The explicit form ({explicit}) computes any term
        directly. Both describe the same sequence {seq.slice(0, 4).join(", ")}, … —
        and you build functions the same way from any real-world relationship.
      </p>

      <MathCheck>
        <p>
          <strong>Building a function</strong>{" "}means writing a rule for a
          relationship, sometimes by combining simpler functions (F-BF.1).{" "}
          <strong>Arithmetic and geometric sequences</strong>{" "}can be written both{" "}
          <strong>recursively</strong>{" "}(next from previous) and{" "}
          <strong>explicitly</strong>{" "}(nth term as a formula in n) (F-BF.2) — the
          two forms are interchangeable.
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
