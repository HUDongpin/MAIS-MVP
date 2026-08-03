"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const HC = "var(--band-upper)";
const TC = "var(--band-middle)";
const OC = "var(--band-early)";
const COLS = [HC, TC, OC];
const NAMES = ["hundreds", "tens", "ones"];

export default function Lesson() {
  const [n, setN] = useState(346);
  const [changed, setChanged] = useState<number | null>(null);
  const [rolled, setRolled] = useState(false);

  const d = [Math.floor(n / 100), Math.floor((n / 10) % 10), n % 10];

  const apply = (delta: number) => {
    const next = n + delta;
    if (next < 100 || next > 999) return;
    // Report what actually changed, not which button was pressed. Adding 10 to
    // 396 rolls the tens over, so the hundreds digit moves too — the caption
    // used to insist "the tens digit changed by 1" while 3 → 4 and 9 → 0.
    const rolled = Math.floor(next / 100) !== Math.floor(n / 100);
    setChanged(Math.abs(delta) === 100 || rolled ? 0 : 1);
    setRolled(rolled && Math.abs(delta) === 10);
    setN(next);
  };

  return (
    <div className="prose-lesson max-w-none">
      <p>
        You do not need to write anything to add <strong>10</strong>{" "}or{" "}
        <strong>100</strong>. Adding 10 changes only the <strong>tens</strong>{" "}
        digit. Adding 100 changes only the <strong>hundreds</strong>{" "}digit. The
        rest stays put.
      </p>

      {/* "just one digit" is false on a roll-over (396 + 10 moves both the
          tens and the hundreds); the status line was corrected earlier but
          this caption still promised it. */}
      <Figure caption="Press a button and watch which digits change.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-1.5">
            {d.map((digit, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="grid h-16 w-16 place-items-center rounded-xl text-4xl font-black text-white" style={{ background: COLS[i], outline: i === changed ? "3px solid var(--ink)" : "none", outlineOffset: 3 }}>{digit}</div>
                <span className="mt-1 text-[10px] font-semibold uppercase text-[var(--ink-faint)]">{NAMES[i]}</span>
              </div>
            ))}
          </div>

          <div className="text-3xl font-black">{n}</div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button type="button" onClick={() => apply(-100)} disabled={n - 100 < 100} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: HC }}>− 100</button>
            <button type="button" onClick={() => apply(-10)} disabled={n - 10 < 100} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: TC }}>− 10</button>
            <button type="button" onClick={() => apply(10)} disabled={n + 10 > 999} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: TC }}>+ 10</button>
            <button type="button" onClick={() => apply(100)} disabled={n + 100 > 999} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: HC }}>+ 100</button>
          </div>
          <p className="m-0 text-sm text-[var(--ink-faint)]">
            {changed === null
              ? "Usually only one digit moves each time."
              : rolled
                ? "The tens rolled over, so the hundreds digit changed too."
                : changed === 0
                  ? "The hundreds digit changed by 1."
                  : "The tens digit changed by 1."}
          </p>
        </div>
      </Figure>

      <h2>One digit at a time</h2>
      <p>
        Because 10 lives in the tens place and 100 lives in the hundreds place,
        adding them touches only that one digit (unless it rolls past 9). That is
        what makes it fast mental math.
      </p>

      <MathCheck>
        <p>
          Mentally adding or subtracting <strong>10 or 100</strong>{" "}to a number
          from 100 to 900 (2.NBT.B.8) works because 10 and 100 each belong to a
          single place value — so only the tens or the hundreds digit changes,
          while the other digits stay exactly the same.
        </p>
      </MathCheck>
    </div>
  );
}
