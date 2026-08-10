"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const HL = "var(--band-upper)";

const PATTERNS: Record<number, string> = {
  2: "Multiples of 2 are the even numbers — they fill every other column and always end in 0, 2, 4, 6, or 8.",
  5: "Multiples of 5 line up in two straight columns and always end in 0 or 5.",
  // "always add up to 9" is false for 99 (9+9 = 18), which is on the chart.
  // The Math Check was corrected earlier; this table entry was missed.
  9: "From 9 through 81, the multiples of 9 make a descending diagonal. Then the hundred chart wraps to a new row for 90 and 99. Their digits always add up to a multiple of 9 (18 → 1+8 = 9, 99 → 9+9 = 18).",
  10: "Multiples of 10 fill the last column and always end in 0.",
};

export default function Lesson() {
  const [k, setK] = useState(5);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Numbers are full of <strong>patterns</strong>. On a hundred chart, the
        multiples of a number make a shape you can see — and the pattern has a{" "}
        <strong>reason</strong>{" "}behind it, from place value and the properties of
        operations.
      </p>

      <Figure caption="Highlight the multiples of a number and watch the pattern appear.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {[2, 5, 9, 10].map((v) => (
              <button key={v} type="button" onClick={() => setK(v)} aria-pressed={k === v} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={k === v ? { background: HL, color: "white", borderColor: HL } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>×{v}</button>
            ))}
          </div>

          <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(10, 1fr)", maxWidth: 340 }}>
            {Array.from({ length: 100 }, (_, i) => {
              const n = i + 1;
              const on = n % k === 0;
              return (
                // Colour was the only channel marking a multiple: no text, no
                // outline, no accessible name. Now a ring carries it visually
                // and the name carries it for a screen reader.
                <div key={n} aria-label={on ? `${n}, a multiple of ${k}` : `${n}`} className="grid aspect-square place-items-center rounded text-[9px] font-bold tabular-nums sm:text-[11px]" style={{ background: on ? HL : "var(--surface-2)", color: on ? "white" : "var(--ink-faint)", outline: on ? "2px solid var(--ink)" : "none", outlineOffset: -2 }}>{n}</div>
              );
            })}
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">{PATTERNS[k]}</p>
        </div>
      </Figure>

      <h2>Patterns have reasons</h2>
      <p>
        The shapes are not accidents. Multiples of 10 end in 0 because ten is one
        full place. Even numbers repeat every other square because you add 2 each
        time. Finding the <em>why</em>{" "}is the real math.
      </p>

      <MathCheck>
        <p>
          Identifying arithmetic patterns — in the addition table, the
          multiplication table, or a hundred chart — and explaining them using
          properties of operations is 3.OA.D.9. For example, multiples of {k}{" "}
          {k === 9 ? "have digits that sum to a multiple of 9 (9, 18, 27, …)" : `end in ${k === 2 ? "an even digit" : k === 5 ? "0 or 5" : "0"}`},
          and that pattern follows directly from how place value and repeated
          addition work.
        </p>
      </MathCheck>
    </div>
  );
}
