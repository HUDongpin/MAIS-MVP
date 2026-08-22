"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const LENGTHS = [3, 4, 5, 6, 7]; // cm
const MARK = "var(--band-middle)";

export default function Lesson() {
  const [counts, setCounts] = useState([1, 3, 4, 2, 1]);
  const total = counts.reduce((s, n) => s + n, 0);
  const maxIdx = counts.indexOf(Math.max(...counts));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        When you measure a bunch of things, a <strong>line plot</strong>{" "}stacks
        an <strong>X</strong>{" "}for each one above its length on a number line.
        Taller stacks mean that length happened more often.
      </p>

      <Figure caption="Each X is one pencil. The stacks show how many pencils were each length.">
        <div className="flex flex-col items-center gap-6">
          <div className="mx-auto flex w-max max-w-none self-start items-end justify-center gap-6" style={{ minHeight: 150 }}>
            {LENGTHS.map((len, i) => (
              <div key={len} className="flex flex-col items-center gap-1">
                <div className="flex flex-col-reverse gap-0.5" style={{ minHeight: 120, justifyContent: "flex-start" }}>
                  {Array.from({ length: counts[i] }, (_, k) => (
                    <span key={k} className="text-lg font-black leading-none" style={{ color: MARK }}>✕</span>
                  ))}
                </div>
                <div className="h-0.5 w-10 bg-[var(--ink-soft)]" />
                <span className="font-mono text-sm font-bold">{len}</span>
              </div>
            ))}
          </div>
          <div className="-mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">length in centimeters</div>

          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {total} pencils measured. Most were <strong>{LENGTHS[maxIdx]} cm</strong>{" "}({counts[maxIdx]} of them).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {LENGTHS.map((len, i) => (
              <div key={len} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-[var(--ink-faint)]">{len} cm</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setCounts((p) => p.map((c, j) => (j === i ? Math.max(0, c - 1) : c)))} disabled={counts[i] <= 0} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`fewer at ${len}`}>−</button>
                  <span className="w-5 text-center font-black tabular-nums">{counts[i]}</span>
                  <button type="button" onClick={() => setCounts((p) => p.map((c, j) => (j === i ? Math.min(6, c + 1) : c)))} disabled={counts[i] >= 6} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`more at ${len}`}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Reading the stacks</h2>
      <p>
        Each X is one measurement. Count a stack to see how many things had that
        length. The tallest stack is the most common length — here,{" "}
        {LENGTHS[maxIdx]} cm.
      </p>

      <MathCheck>
        <p>
          A <strong>line plot</strong>{" "}displays measurement data by placing an X
          for each measurement above its value on a number line marked in whole
          units (2.MD.D.9). The height of each stack is the count at that length,
          so you can read totals and compare how often each length occurred.
        </p>
      </MathCheck>
    </div>
  );
}
