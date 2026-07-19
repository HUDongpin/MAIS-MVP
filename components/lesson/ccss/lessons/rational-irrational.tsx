"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const RAT = "var(--band-upper)";
const IRR = "var(--band-early)";

type Num = { label: string; decimal: string; rational: boolean; why: string };
const NUMS: Num[] = [
  { label: "1/2", decimal: "0.5", rational: true, why: "The decimal terminates (stops), so it's rational." },
  { label: "1/3", decimal: "0.333…", rational: true, why: "The decimal repeats (3 forever), so it's rational." },
  { label: "2/7", decimal: "0.285714…", rational: true, why: "It repeats in a block (285714), so it's rational." },
  { label: "√2", decimal: "1.41421356…", rational: false, why: "It never terminates and never repeats — irrational." },
  { label: "π", decimal: "3.14159265…", rational: false, why: "Non-terminating, non-repeating — irrational." },
  { label: "√9", decimal: "3", rational: true, why: "√9 = 3, a whole number — rational." },
];

export default function Lesson() {
  const [idx, setIdx] = useState(3);
  const n = NUMS[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Every number is either <strong>rational</strong>{" "}(a ratio of integers) or{" "}
        <strong>irrational</strong>. The secret is in the <strong>decimal</strong>:
        rationals either <em>stop</em>{" "}or <em>repeat</em>; irrationals go on
        forever with no pattern.
      </p>

      <Figure caption="Look at the decimal expansion. Terminating or repeating means rational.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {NUMS.map((num, i) => (
              <button key={num.label} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={idx === i ? { background: "var(--band-middle)", color: "white", borderColor: "var(--band-middle)" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{num.label}</button>
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">{n.label} = {n.decimal}</div>
          </div>

          <div className="rounded-xl px-6 py-2 text-center text-2xl font-black" style={{ background: `color-mix(in oklab, ${n.rational ? RAT : IRR} 12%, var(--surface))`, color: n.rational ? RAT : IRR }}>
            {n.rational ? "RATIONAL" : "IRRATIONAL"}
          </div>
          <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">{n.why}</p>
        </div>
      </Figure>

      <h2>Two kinds of numbers</h2>
      <p>
        A <strong>rational</strong>{" "}number can be written as a fraction of
        integers, and its decimal always terminates or repeats. An{" "}
        <strong>irrational</strong>{" "}number — like √2 or π — cannot be written as
        such a fraction, and its decimal runs forever without repeating.
      </p>

      <MathCheck>
        <p>
          A number is <strong>rational</strong>{" "}if it equals a ratio of two
          integers; its decimal expansion <strong>terminates or eventually
          repeats</strong>{" "}(8.NS.A.1). A number whose decimal is non-terminating
          and non-repeating is <strong>irrational</strong>{" "}— √2, π, and most square
          roots of non-perfect-squares. Together they form the real numbers.
        </p>
      </MathCheck>
    </div>
  );
}
