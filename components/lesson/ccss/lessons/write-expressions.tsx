"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
type Ex = { words: string; expr: string; note: string };
const EXAMPLES: Ex[] = [
  { words: "add 8 and 7, then multiply by 2", expr: "2 × (8 + 7)", note: "The parentheses show the sum happens first." },
  { words: "3 times as much as (6 plus 4)", expr: "3 × (6 + 4)", note: "“3 times as much” multiplies the whole group." },
  { words: "subtract 5 from 20, then divide by 3", expr: "(20 − 5) ÷ 3", note: "Group the subtraction so it happens before dividing." },
  { words: "double the sum of 9 and 1", expr: "2 × (9 + 1)", note: "“Double” means times 2; “the sum” is grouped." },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const [reveal, setReveal] = useState(false);
  const ex = EXAMPLES[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        You can write math as an <strong>expression</strong>{" "}without ever solving
        it. The words tell you which operations to use and how to{" "}
        <strong>group</strong>{" "}them with parentheses — capturing the plan, not the
        answer.
      </p>

      <Figure caption="Read the words, predict the expression, then reveal it.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((e, i) => (
              <button key={i} type="button" onClick={() => { setIdx(i); setReveal(false); }} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{i + 1}</button>
            ))}
          </div>

          <p className="m-0 max-w-md text-center text-lg font-semibold">&ldquo;{ex.words}&rdquo;</p>

          <div className="grid h-16 min-w-[14rem] place-items-center rounded-2xl border-2 px-6" style={{ borderColor: ACCENT }}>
            {reveal ? <span className="font-mono text-3xl font-black" style={{ color: ACCENT }}>{ex.expr}</span> : <span className="text-[var(--ink-faint)]">expression?</span>}
          </div>

          <button type="button" onClick={() => setReveal((r) => !r)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: reveal ? "var(--ink-soft)" : ACCENT }}>
            {reveal ? "Hide" : "Reveal the expression"}
          </button>

          {reveal && <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">{ex.note}</p>}
        </div>
      </Figure>

      <h2>Reading without solving</h2>
      <p>
        You can also compare expressions by reasoning, not calculating. For
        example, <span className="font-mono">3 × (18 + 597)</span> is exactly 3
        times as big as <span className="font-mono">(18 + 597)</span> — no need to
        add first.
      </p>

      <MathCheck>
        <p>
          Writing and interpreting numerical expressions — using{" "}
          <strong>parentheses</strong>{" "}to show grouping — without evaluating them
          is 5.OA.A.2. Phrases like &ldquo;add, then multiply&rdquo; or &ldquo;3
          times as much as&rdquo; translate directly into an expression such as{" "}
          <strong>{ex.expr}</strong>, which records the operations and their order.
        </p>
      </MathCheck>
    </div>
  );
}
