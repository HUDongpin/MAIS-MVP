"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const fmt = (n: number) => Number(n.toFixed(4)).toString();

export default function Lesson() {
  const [pa, setPa] = useState(50); // P(A) percent
  const [pb, setPb] = useState(40); // P(B) percent
  const [pab, setPab] = useState(20); // P(A and B) percent

  // All three controls are whole percentages, so the test can be exact.
  // A 0.5-percentage-point tolerance called P(A)=P(B)=45%, P(A∩B)=20%
  // independent (0.2 vs 0.2025), and rounding both readouts to 2 decimals
  // printed the same 0.2 twice, hiding the gap it was asked to judge.
  const product = (pa * pb) / 100;
  const independent = pa * pb === pab * 100;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two events are <strong>independent</strong>{" "}when one happening tells you
        nothing about the other. The test:{" "}
        <strong>P(A and B) = P(A) · P(B)</strong>. If the joint probability equals the
        product, they&apos;re independent; if not, they&apos;re associated.
      </p>

      <Figure caption="Compare P(A and B) to P(A)·P(B). Equal ⟹ independent; different ⟹ associated.">
        <div className="flex flex-col items-center gap-6">
          <div className="grid grid-cols-2 gap-4 text-center font-mono">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2"><div className="text-xs text-[var(--ink-faint)]">P(A and B) observed</div><div className="text-xl font-black" style={{ color: ACCENT }}>{fmt(pab / 100)}</div></div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2"><div className="text-xs text-[var(--ink-faint)]">P(A)·P(B)</div><div className="text-xl font-black">{fmt(product / 100)}</div></div>
          </div>

          <div className="rounded-2xl border-2 px-6 py-3 text-center" style={{ borderColor: independent ? ACCENT : "var(--band-upper)" }}>
            <div className="font-bold" style={{ color: independent ? ACCENT : "var(--band-upper)" }}>
              {independent ? "Independent — P(A and B) = P(A)·P(B) ✓" : "Not independent — the events are associated"}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* Re-clamp the intersection when P(A) or P(B) drops — an
                intersection larger than either event is impossible, and here it
                also flipped the independence verdict on impossible inputs. */}
            {/* Both Fréchet bounds, not just the upper one:
                max(0, P(A) + P(B) − 1) ≤ P(A∩B) ≤ min(P(A), P(B)). */}
            <Stepper label="P(A) %" value={pa} min={10} max={90} onChange={(v) => { setPa(v); setPab((x) => Math.max(Math.max(0, v + pb - 100), Math.min(x, v, pb))); }} />
            <Stepper label="P(B) %" value={pb} min={10} max={90} onChange={(v) => { setPb(v); setPab((x) => Math.max(Math.max(0, pa + v - 100), Math.min(x, pa, v))); }} />
            <Stepper label="P(A and B) %" value={pab} min={Math.max(0, pa + pb - 100)} max={Math.min(pa, pb)} onChange={setPab} />
          </div>
        </div>
      </Figure>

      <h2>Independence in context</h2>
      <p>
        Two fair coin flips are independent: the first result doesn&apos;t change the
        second, so P(both heads) = ½·½ = ¼. But "being a smoker" and "having lung
        disease" are <em>not</em>{" "}independent — knowing one changes the probability
        of the other. Equivalently, A and B are independent iff{" "}
        <strong>P(A|B) = P(A)</strong>.
      </p>

      <MathCheck>
        <p>
          Events A and B are <strong>independent</strong>{" "}iff{" "}
          <strong>P(A and B) = P(A)·P(B)</strong>{" "}(S-CP.2), equivalently P(A|B) =
          P(A). Interpreting independence and conditional probability in everyday
          language (S-CP.5) — e.g. whether a medical test result changes the
          probability of disease — is central to using probability well.
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
        <button type="button" onClick={() => onChange(Math.max(min, value - 5))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-10 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 5))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
