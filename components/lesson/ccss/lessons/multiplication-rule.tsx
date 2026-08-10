"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 1000) / 1000;

export default function Lesson() {
  // draw 2 cards without replacement from a small deck: draw two aces from 4 aces in 12 cards
  const [aces, setAces] = useState(4);
  const [deck, setDeck] = useState(12);

  const p1 = aces / deck;
  const p2 = (aces - 1) / (deck - 1); // conditional, without replacement
  const both = r2(p1 * p2);
  const withRepl = r2((aces / deck) * (aces / deck));
  // These quotients rarely land on three decimals (4/12 = 0.333…), so the
  // readouts show approximations and the chained "=" asserted, for example,
  // 0.1 × 0.053 = 0.005.
  const exact3 = (n: number) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-9;
  const eq1 = exact3(p1) ? "=" : "≈";
  const eq2 = exact3(p2) ? "=" : "≈";
  const eqBoth = exact3(p1) && exact3(p2) && exact3(p1 * p2) ? "=" : "≈";
  const eqRepl = exact3(p1) && exact3(p1 * p1) ? "=" : "≈";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        For A <strong>and</strong>{" "}B to both happen, multiply — but use the{" "}
        <strong>conditional</strong>{" "}probability of the second given the first:{" "}
        <strong>P(A and B) = P(A) · P(B | A)</strong>. When the events are
        independent, P(B | A) = P(B) and it&apos;s just a product.
      </p>

      <Figure caption="Draw two aces without replacement: the second probability shrinks because a card is gone.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1 font-mono text-lg">
            <span>P(1st ace) = {aces}/{deck} {eq1} {r2(p1)}</span>
            <span>P(2nd ace | 1st ace) = {aces - 1}/{deck - 1} {eq2} {r2(p2)}</span>
            <span className="mt-1 text-xl font-black" style={{ color: ACCENT }}>P(both) = {r2(p1)} × {r2(p2)} {eqBoth} {both}</span>
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] px-6 py-2 text-center text-sm">
            {/* "Slightly" is false at the corners: aces = 2, deck = 20 gives
                0.005 against 0.01, exactly twice as large. */}
            With replacement (independent), it would be {r2(aces / deck)} × {r2(aces / deck)} {eqRepl} {withRepl} — higher, because putting the card back leaves the second draw exactly as likely as the first.
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="aces" value={aces} min={2} max={6} onChange={setAces} />
            <Stepper label="deck size" value={deck} min={8} max={20} onChange={setDeck} />
          </div>
        </div>
      </Figure>

      <h2>The second draw depends on the first</h2>
      <p>
        After removing one ace, only {aces - 1} {aces - 1 === 1 ? "ace" : "aces"} remain among {deck - 1} cards —
        so the second probability ({eq2 === "=" ? "" : "about "}{r2(p2)}) is smaller than the first. Multiplying gives
        P(both) {eqBoth} {both}. This <strong>general multiplication rule</strong>{" "}works for
        any two events; independence is just the special case where the condition
        doesn&apos;t matter.
      </p>

      <MathCheck>
        <p>
          The <strong>general Multiplication Rule</strong>: P(A and B) = P(A)·P(B | A)
          (S-CP.8). The conditional factor accounts for how the first event changes
          the second — as in drawing without replacement. For{" "}
          <strong>independent</strong>{" "}events P(B | A) = P(B), recovering
          P(A)·P(B).
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
