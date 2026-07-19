"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const YES = "var(--band-upper)";
const NO = "var(--band-early)";

type Q = { text: string; stat: boolean; why: string };
const QUESTIONS: Q[] = [
  { text: "How old am I?", stat: false, why: "One answer, no variability — not statistical." },
  { text: "How old are the students in my class?", stat: true, why: "Answers vary from student to student — statistical." },
  { text: "How tall is the teacher?", stat: false, why: "A single value — not statistical." },
  { text: "How many hours do sixth-graders sleep?", stat: true, why: "Different kids sleep different amounts — statistical." },
];

// a sample distribution (ages), for the dot plot
const DATA = [10, 11, 11, 11, 12, 12, 12, 12, 13, 13];

export default function Lesson() {
  const [idx, setIdx] = useState(1);
  const q = QUESTIONS[idx];

  const values = Array.from(new Set(DATA)).sort((a, b) => a - b);
  const counts = values.map((v) => DATA.filter((d) => d === v).length);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>statistical question</strong>{" "}is one you expect will have{" "}
        <strong>different answers</strong>{" "}— it anticipates <em>variability</em>.
        &ldquo;How old am I?&rdquo; has one answer. &ldquo;How old are the students
        in my class?&rdquo; has many.
      </p>

      <Figure caption="Tap a question. A statistical one collects a whole distribution of answers, like the dot plot.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col gap-2">
            {QUESTIONS.map((qq, i) => (
              <button key={i} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-4 py-2 text-left text-sm font-bold" style={idx === i ? { borderColor: qq.stat ? YES : NO, background: `color-mix(in oklab, ${qq.stat ? YES : NO} 10%, var(--surface))` } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{qq.text}</button>
            ))}
          </div>

          <div className="rounded-xl px-5 py-2 text-center text-lg font-black" style={{ color: q.stat ? YES : NO }}>
            {q.stat ? "✓ Statistical question" : "✗ Not statistical"}
          </div>
          <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">{q.why}</p>

          {/* dot plot */}
          <div className="flex items-end justify-center gap-5" style={{ minHeight: 90 }}>
            {values.map((v, i) => (
              <div key={v} className="flex flex-col items-center gap-1">
                <div className="flex flex-col-reverse gap-0.5">
                  {Array.from({ length: counts[i] }, (_, k) => <span key={k} className="text-lg leading-none" style={{ color: YES }}>●</span>)}
                </div>
                <span className="font-mono text-xs font-bold">{v}</span>
              </div>
            ))}
          </div>
          <div className="-mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">ages of students (a distribution)</div>
        </div>
      </Figure>

      <h2>Variability is the point</h2>
      <p>
        Because a statistical question expects varied answers, those answers form
        a <strong>distribution</strong>{" "}— you can describe its <strong>center</strong>{" "}
        (a typical value), its <strong>spread</strong>{" "}(how much it varies), and
        its <strong>shape</strong>.
      </p>

      <MathCheck>
        <p>
          A <strong>statistical question</strong>{" "}anticipates variability in the
          answers (6.SP.A.1) — that is what makes it worth collecting data. The
          collected answers form a <strong>distribution</strong>{" "}described by its{" "}
          <strong>center, spread, and overall shape</strong>{" "}(6.SP.A.2), rather
          than a single number.
        </p>
      </MathCheck>
    </div>
  );
}
