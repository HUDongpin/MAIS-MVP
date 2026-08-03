"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const P_COL = "var(--band-middle)";
const G_COL = "var(--band-upper)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [P, setP] = useState(1000);
  const [rate, setRate] = useState(5); // percent
  const [t, setT] = useState(3);

  const r = rate / 100;
  const growth = r2(Math.pow(1 + r, t));
  // Compute the balance from the exact growth factor, not its rounded display
  // value — chaining off `growth` puts the headline dollar amount up to $25 out,
  // which a student can disprove with a calculator.
  const value = r2(P * Math.pow(1 + r, t));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        An expression tells a story. In <strong>P(1 + r)ᵗ</strong>, each piece
        means something: P is the <strong>starting amount</strong>, (1 + r) is the{" "}
        <strong>growth factor</strong>, and t is <strong>time</strong>. Reading
        the parts — and regrouping them — is the heart of algebra.
      </p>

      <Figure caption="Compound interest. Each part of P(1+r)ᵗ has a real meaning; the structure reveals how it grows.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-2xl border-2 px-8 py-4 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-2xl font-black">
              <span style={{ color: P_COL }}>{P}</span>(1 + <span style={{ color: G_COL }}>{r2(r)}</span>)<sup>{t}</sup> = <span style={{ color: ACCENT }}>${value}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <Part color={P_COL} name="principal P" value={`$${P}`} note="what you start with" />
            <Part color={G_COL} name="growth factor (1 + r)" value={`${r2(1 + r)}`} note={`grows ${rate}% each year`} />
            <Part color={ACCENT} name="factor (1+r)ᵗ" value={`${growth}`} note={`after ${t} years`} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="P ($)" value={P} min={100} max={5000} step={100} onChange={setP} />
            <Stepper label="rate (%)" value={rate} min={1} max={20} step={1} onChange={setRate} />
            <Stepper label="years t" value={t} min={1} max={10} step={1} onChange={setT} />
          </div>
        </div>
      </Figure>

      <h2>Structure lets you rewrite</h2>
      <p>
        Seeing (1 + r) as a single <strong>chunk</strong>{" "}means (1 + r)ᵗ is
        repeated multiplication — the value multiplies by {r2(1 + r)} every year.
        The same structural eye rewrites x⁴ − 16 as (x² − 4)(x² + 4), or a trinomial
        as a perfect square. Grouping is a superpower.
      </p>

      <MathCheck>
        <p>
          <strong>Interpreting</strong>{" "}an expression means reading its parts —
          terms, factors, coefficients — in context (A-SSE.1): here P is principal
          and (1 + r) the growth factor. <strong>Using structure</strong>{" "}means
          treating a compound piece as a single object to rewrite the whole
          (A-SSE.2), like viewing x⁴ − y⁴ as a difference of squares.
        </p>
      </MathCheck>
    </div>
  );
}

function Part({ color, name, value, note }: { color: string; name: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border-l-4 bg-[var(--surface-2)] px-4 py-2" style={{ borderColor: color }}>
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{name}</div>
      <div className="font-mono text-lg font-black">{value}</div>
      <div className="text-xs text-[var(--ink-faint)]">{note}</div>
    </div>
  );
}

function Stepper({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-16 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
