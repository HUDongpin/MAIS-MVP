"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 1000) / 1000;

// distribution of the sum of two dice
const SUMS = Array.from({ length: 11 }, (_, i) => i + 2);
const WAYS = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]; // ways to make 2..12
const TOTAL = 36;

export default function Lesson() {
  const [highlight, setHighlight] = useState(7);

  const prob = (s: number) => WAYS[s - 2] / TOTAL;
  const relation = (s: number) => Math.abs(prob(s) * 1000 - Math.round(prob(s) * 1000)) < 1e-9 ? "=" : "≈";
  const maxWays = Math.max(...WAYS);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>random variable</strong>{" "}assigns a number to each outcome — like
        the <em>sum</em>{" "}of two dice. Its <strong>probability distribution</strong>{" "}
        lists each value with its probability, and it graphs as a bar chart of what to
        expect.
      </p>

      <Figure caption="The sum of two dice, 2–12. Its distribution peaks at 7, the most likely sum.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-end gap-1.5">
            {SUMS.map((s) => (
              // The name was the concatenated children — "3/36 4" — with the
              // trailing number never identified as the dice sum.
              <button key={s} type="button" onClick={() => setHighlight(s)} aria-label={`Sum ${s}: ${WAYS[s - 2]} favorable ${WAYS[s - 2] === 1 ? "way" : "ways"} out of 36 total ways`} aria-pressed={s === highlight} className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono text-[var(--ink-faint)]">{WAYS[s - 2]}/36</span>
                <div className="w-6 rounded-t" style={{ height: Math.round((WAYS[s - 2] / maxWays) * 110), background: s === highlight ? ACCENT : "color-mix(in srgb, var(--band-high) 40%, transparent)" }} />
                <span className="text-xs font-bold" style={{ color: s === highlight ? ACCENT : "var(--ink-soft)" }}>{s}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border-2 px-6 py-2 text-center font-mono" style={{ borderColor: ACCENT }}>
            P(sum = {highlight}) = {WAYS[highlight - 2]}/36 {relation(highlight)} <strong style={{ color: ACCENT }}>{r2(prob(highlight))}</strong>{relation(highlight) === "≈" ? " (nearest thousandth)" : ""}
          </div>
          <p className="m-0 text-xs text-[var(--ink-faint)]">All probabilities sum to 1 (36/36). Tap a bar.</p>
        </div>
      </Figure>

      <h2>Numbers assigned to chance</h2>
      <p>
        Each roll of two dice produces a sum from 2 to 12; that sum is the random
        variable. There are {WAYS[5]} ways to roll a 7 but only 1 way to roll a 2, so
        7 is six times as likely. Graphing the whole distribution shows the shape of
        the randomness — and its probabilities always total 1.
      </p>

      <MathCheck>
        <p>
          A <strong>random variable</strong>{" "}assigns a numerical value to each
          outcome of a chance process; its <strong>probability distribution</strong>{" "}
          pairs each value with a probability and can be graphed (S-MD.1). The
          probabilities are nonnegative and sum to 1 — the foundation for expected
          value and decision-making.
        </p>
      </MathCheck>
    </div>
  );
}
