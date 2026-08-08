"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  // spinner: values with probabilities
  const [values, setValues] = useState([10, 5, 0, -3]);
  const probs = [1, 2, 3, 2]; // weights out of 8
  const totalW = probs.reduce((a, b) => a + b, 0);

  // Sum the SAME rounded products the table shows, so the column and the total
  // agree: the weights are eighths, so products land on values that round.
  const ev = r2(values.reduce((s, v, i) => s + r2((v * probs[i]) / totalW), 0));

  const setVal = (i: number, d: number) => setValues((vs) => vs.map((v, vi) => (vi === i ? v + d : v)));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>expected value</strong>{" "}is the long-run average of a random
        variable — each outcome <strong>weighted by its probability</strong>. It
        tells you what to expect <em>per trial</em>{" "}if you repeated the process many
        times, even if no single trial gives exactly that.
      </p>

      <Figure caption="Multiply each payoff by its probability and add. That weighted sum is the expected value.">
        <div className="flex flex-col items-center gap-6">
          <table className="text-center font-mono text-sm">
            <thead><tr className="text-[var(--ink-faint)]"><th className="px-3 py-1">payoff</th><th className="px-3 py-1">probability</th><th className="px-3 py-1">product</th></tr></thead>
            <tbody>
              {values.map((v, i) => (
                <tr key={i}>
                  <td className="px-3 py-1">
                    {/* Nothing tied a button to the row it edits. */}
                    <button type="button" onClick={() => setVal(i, -1)} aria-label={`Decrease payoff for outcome ${i + 1}`} className="mr-1 text-xs font-bold text-[var(--ink-faint)]">−</button>
                    <span className="font-bold" style={{ color: v < 0 ? "var(--band-upper)" : "var(--ink)" }}>{v}</span>
                    <button type="button" onClick={() => setVal(i, 1)} aria-label={`Increase payoff for outcome ${i + 1}`} className="ml-1 text-xs font-bold text-[var(--ink-faint)]">+</button>
                  </td>
                  <td className="px-3 py-1">{probs[i]}/{totalW}</td>
                  <td className="px-3 py-1" style={{ color: ACCENT }}>{r2(v * probs[i] / totalW)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">E(X) = Σ value × probability</div>
            <div className="mt-1 font-mono text-2xl font-black" style={{ color: ACCENT }}>{ev}</div>
          </div>
          <p className="m-0 text-xs text-[var(--ink-faint)]">Tap −/+ to change a payoff and watch the expected value respond.</p>
        </div>
      </Figure>

      <h2>A weighted average</h2>
      <p>
        Multiply each outcome by its probability and sum: E(X) = {ev}. That&apos;s the
        average you&apos;d approach over thousands of plays. A{" "}
        <strong>theoretical</strong>{" "}distribution (like a spinner&apos;s known odds)
        and an <strong>empirical</strong>{" "}one (from observed data) are combined the
        same way — value times probability, summed.
      </p>

      <MathCheck>
        <p>
          The <strong>expected value</strong>{" "}E(X) = Σ xᵢ·P(xᵢ) is the
          probability-weighted average of a random variable&apos;s values (S-MD.2),
          interpreted as the long-run mean. It&apos;s computed from a{" "}
          <strong>theoretical</strong>{" "}distribution (S-MD.3) or estimated from an{" "}
          <strong>empirical</strong>{" "}one built from data (S-MD.4).
        </p>
      </MathCheck>
    </div>
  );
}
