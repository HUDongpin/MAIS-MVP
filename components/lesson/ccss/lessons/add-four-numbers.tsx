"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";

export default function Lesson() {
  const [nums, setNums] = useState([23, 15, 34, 12]);
  const total = nums.reduce((s, n) => s + n, 0);
  const onesSum = nums.reduce((s, n) => s + (n % 10), 0);
  const tensSum = nums.reduce((s, n) => s + Math.floor(n / 10), 0);
  const carry = Math.floor(onesSum / 10);

  const setN = (i: number, v: number) => setNums((p) => p.map((n, j) => (j === i ? Math.max(10, Math.min(99, v)) : n)));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        You can add more than two numbers at once. Stack them up, add all the{" "}
        <strong>ones</strong>{" "}together, then all the <strong>tens</strong>{" "}— and
        carry any extra tens along the way.
      </p>

      <Figure caption="Add the ones column, then the tens column. Extra tens carry over.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-2xl font-black leading-tight">
            {nums.map((n, i) => (
              <div key={i} className="grid grid-cols-[1.5rem_2ch_2ch] justify-items-end">
                <span>{i === nums.length - 1 ? "+" : ""}</span>
                <span>{Math.floor(n / 10)}</span>
                <span>{n % 10}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1.5rem_2ch_2ch] justify-items-end border-t-2 border-[var(--ink)] pt-1" style={{ color: ACCENT }}>
              <span />
              <span>{Math.floor(total / 10)}</span>
              <span>{total % 10}</span>
            </div>
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            Ones add to <strong>{onesSum}</strong>{" "}(carry {carry} ten{carry === 1 ? "" : "s"}); tens add to{" "}
            <strong>{tensSum}</strong>{" "}+ {carry} = {tensSum + carry}. Total ={" "}
            <strong style={{ color: ACCENT }}>{total}</strong>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {nums.map((n, i) => (
              <Stepper key={i} label={`#${i + 1}`} value={n} onChange={(v) => setN(i, v)} />
            ))}
          </div>
        </div>
      </Figure>

      <h2>Group and add</h2>
      <p>
        The order does not matter — you can add the numbers in any order and
        still get {total}. Adding the ones first, then the tens, keeps the work
        organized.
      </p>

      <MathCheck>
        <p>
          Adding up to four two-digit numbers using place value and properties of
          operations is 2.NBT.B.6. Add each place separately — the ones column
          here totals {onesSum}, contributing {carry} carried ten{carry === 1 ? "" : "s"} to the {tensSum} tens —
          and because addition is commutative and associative, the order and
          grouping never change the total.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 10} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= 99} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
