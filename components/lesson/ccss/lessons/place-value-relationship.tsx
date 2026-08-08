"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const COLORS = ["var(--band-upper)", "var(--band-high)", "var(--band-middle)", "var(--band-early)"];
const NAMES = ["thousands", "hundreds", "tens", "ones"];
const PLACE = [1000, 100, 10, 1];

export default function Lesson() {
  const [sel, setSel] = useState(1); // which place is highlighted (0..3)
  const digit = 3; // same digit in every place to show the ×10 growth

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Our number system is <strong>base ten</strong>: each place is worth{" "}
        <strong>ten times</strong>{" "}the place to its right. The same digit means
        ten times as much one step to the left.
      </p>

      <Figure caption="The same 3 is worth ten times more each place you move left.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-end gap-2">
            {PLACE.map((place, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                {/* The place name and the value are unassociated sibling spans,
                    so all four tiles announced only their digit. */}
                <button type="button" onClick={() => setSel(i)} aria-label={`${digit} in the ${NAMES[i]} place, worth ${digit * place}`} aria-pressed={i === sel} className="grid h-16 w-16 place-items-center rounded-xl text-4xl font-black text-white" style={{ background: COLORS[i], outline: i === sel ? "3px solid var(--ink)" : "none", outlineOffset: 3 }}>{digit}</button>
                <span className="text-[10px] font-semibold uppercase text-[var(--ink-faint)]">{NAMES[i]}</span>
                <span className="font-mono text-xs font-bold" style={{ color: COLORS[i] }}>{digit * place}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="text-2xl font-black">
              The {digit} in the <span style={{ color: COLORS[sel] }}>{NAMES[sel]}</span> place is worth <span style={{ color: COLORS[sel] }}>{digit * PLACE[sel]}</span>.
            </div>
            {sel < 3 && (
              <p className="mt-1 font-mono text-[15px] text-[var(--ink-soft)]">
                {digit * PLACE[sel]} = 10 × {digit * PLACE[sel + 1]} (ten times the place on its right)
              </p>
            )}
            {sel === 3 && (
              <p className="mt-1 font-mono text-[15px] text-[var(--ink-soft)]">
                Move one place left and it becomes 10 × {digit} = {digit * 10}.
              </p>
            )}
          </div>
        </div>
      </Figure>

      <h2>Ten of these make one of those</h2>
      <p>
        Ten ones make a ten, ten tens make a hundred, ten hundreds make a
        thousand. That constant &ldquo;×10&rdquo; is the engine of place value —
        it is why the algorithms for adding, multiplying, and rounding all work.
      </p>

      <MathCheck>
        <p>
          In a multi-digit number, a digit in one place represents <strong>ten
          times</strong>{" "}what it would in the place to its right (4.NBT.A.1). The
          digit {digit} is worth {digit} in the ones place, {digit * 10} in the
          tens, {digit * 100} in the hundreds, and {digit * 1000} in the thousands
          — each ten times the last.
        </p>
      </MathCheck>
    </div>
  );
}
