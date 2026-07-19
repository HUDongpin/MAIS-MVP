"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const GOOD = "var(--band-middle)";
const BAD = "var(--band-upper)";

type Ex = {
  title: string;
  eq: string;
  steps: string[];
  candidate: string;
  extraneous: boolean;
  note: string;
};

const EXAMPLES: Ex[] = [
  {
    title: "Radical (valid)",
    eq: "√(x + 3) = 4",
    steps: ["square both sides: x + 3 = 16", "x = 13"],
    candidate: "x = 13",
    extraneous: false,
    note: "Check: √(13 + 3) = √16 = 4 ✓",
  },
  {
    title: "Radical (extraneous!)",
    eq: "√(x) = x − 6",
    steps: ["square: x = x² − 12x + 36", "x² − 13x + 36 = 0 → x = 4 or 9"],
    candidate: "x = 4 fails, x = 9 works",
    extraneous: true,
    note: "Check x = 4: √4 = 2 but 4 − 6 = −2 ✗. Squaring introduced a false root.",
  },
  {
    title: "Rational",
    eq: "1/(x − 2) = 3",
    steps: ["multiply by (x − 2): 1 = 3(x − 2)", "1 = 3x − 6 → x = 7/3"],
    candidate: "x = 7/3",
    extraneous: false,
    note: "x = 7/3 ≠ 2, so the denominator is nonzero — valid.",
  },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const ex = EXAMPLES[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To solve a <strong>radical</strong>{" "}equation you square both sides; for a{" "}
        <strong>rational</strong>{" "}one you clear denominators. Both moves can
        create <strong>extraneous solutions</strong>{" "}— values that pass the new
        equation but fail the original. Always <em>check</em>.
      </p>

      <Figure caption="Solve, then substitute back. Squaring and clearing fractions can introduce false roots.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((e, i) => (
              <button key={e.title} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{e.title}</button>
            ))}
          </div>

          <div className="rounded-lg bg-[var(--surface-2)] px-6 py-2 font-mono text-2xl font-black">{ex.eq}</div>

          <div className="flex flex-col items-center gap-1 font-mono text-sm text-[var(--ink-soft)]">
            {ex.steps.map((s, i) => <div key={i}>{i + 1}. {s}</div>)}
          </div>

          <div className="rounded-2xl border-2 px-6 py-3 text-center" style={{ borderColor: ex.extraneous ? BAD : GOOD }}>
            <div className="font-mono text-lg font-black" style={{ color: ex.extraneous ? BAD : GOOD }}>{ex.candidate}</div>
            <div className="mt-1 max-w-sm text-xs text-[var(--ink-soft)]">{ex.note}</div>
          </div>
        </div>
      </Figure>

      <h2>Why false roots appear</h2>
      <p>
        Squaring is not reversible: if √x = x − 6, squaring also captures the
        solutions of √x = −(x − 6). So a root of the squared equation might solve
        the <em>wrong</em>{" "}sign version. Substituting back into the original
        weeds those out — the only safe guarantee.
      </p>

      <MathCheck>
        <p>
          Solving simple <strong>rational and radical equations</strong>{" "}(A-REI.2)
          uses reversible steps where possible, but squaring or multiplying by a
          variable expression can produce <strong>extraneous solutions</strong>.
          These arise because the operation isn&apos;t one-to-one; checking each
          candidate in the original equation is essential.
        </p>
      </MathCheck>
    </div>
  );
}
