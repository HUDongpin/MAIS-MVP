"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const SEL = "var(--band-early)";
const NEXT = "var(--band-middle)";

export default function Lesson() {
  const [sel, setSel] = useState(47);
  const nexts = [sel + 1, sel + 2, sel + 3].filter((n) => n <= 120);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        In first grade, the counting goes all the way to <strong>120</strong>.
        Tap any number to see it, then keep counting <strong>forward</strong>{" "}
        from there. The chart never runs out.
      </p>

      <Figure caption="Tap a number. The blue squares show the next numbers you would say.">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <div className="text-5xl font-black" style={{ color: SEL }}>{sel}</div>
            <div className="text-sm font-semibold text-[var(--ink-faint)]">then {nexts.join(", ")}…</div>
          </div>

          <FigureScroll>
            <div className="mx-auto grid gap-0.5" style={{ gridTemplateColumns: "repeat(10, minmax(0,1fr))", maxWidth: 500 }}>
              {Array.from({ length: 120 }, (_, i) => {
                const n = i + 1;
                const isSel = n === sel;
                const isNext = nexts.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSel(n)}
                    className="grid aspect-square place-items-center rounded text-[10px] font-bold tabular-nums sm:text-xs"
                    style={{
                      background: isSel ? SEL : isNext ? NEXT : "var(--surface-2)",
                      color: isSel || isNext ? "white" : "var(--ink-soft)",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </FigureScroll>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSel((n) => Math.max(1, n - 1))} disabled={sel <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label="Previous number">−</button>
            <span className="w-14 text-center text-2xl font-black tabular-nums" style={{ color: SEL }}>{sel}</span>
            <button type="button" onClick={() => setSel((n) => Math.min(120, n + 1))} disabled={sel >= 120} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label="Next number">+</button>
          </div>
        </div>
      </Figure>

      <h2>Reading and writing big numbers</h2>
      <p>
        Every number from 1 to 120 has its own written numeral. Once you can
        read and write them and count forward from any spot, you are ready to add
        and subtract bigger numbers.
      </p>

      <MathCheck>
        <p>
          Counting to <strong>120</strong>, starting from any number, and reading
          and writing the numerals is 1.NBT.A.1. The chart makes the pattern
          visible: moving right adds one, moving down adds ten — the same base-ten
          structure that powers place value.
        </p>
      </MathCheck>
    </div>
  );
}
