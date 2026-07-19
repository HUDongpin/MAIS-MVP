"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const UNIT = 26;
type Bar = { name: string; color: string; len: number };

export default function Lesson() {
  const [bars, setBars] = useState<Bar[]>([
    { name: "red", color: "var(--band-early)", len: 5 },
    { name: "blue", color: "var(--band-middle)", len: 8 },
    { name: "green", color: "var(--band-high)", len: 3 },
  ]);

  const sorted = [...bars].sort((a, b) => a.len - b.len);
  const setLen = (i: number, len: number) => setBars((prev) => prev.map((b, j) => (j === i ? { ...b, len } : b)));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To measure length, lay down <strong>same-size units</strong>{" "}end to end
        and count them. To put objects in order, compare their lengths — shortest
        to longest.
      </p>

      <Figure caption="Each strip is made of unit tiles. Count the tiles to measure; the lengths are stacked shortest to longest.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex w-full flex-col gap-3">
            {sorted.map((bar, rank) => (
              <div key={bar.name} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-right text-xs font-bold uppercase text-[var(--ink-faint)]">
                  {rank === 0 ? "shortest" : rank === sorted.length - 1 ? "longest" : "middle"}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: bar.len }, (_, i) => (
                    <div key={i} className="rounded-sm border border-white/50" style={{ width: UNIT, height: 24, background: bar.color }} />
                  ))}
                </div>
                <span className="text-sm font-bold" style={{ color: bar.color }}>{bar.len} units</span>
              </div>
            ))}
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            The {sorted[2].name} strip is longer than the {sorted[1].name}, and the{" "}
            {sorted[1].name} is longer than the {sorted[0].name} — so the{" "}
            {sorted[2].name} strip is the longest of all.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {bars.map((bar, i) => (
              <div key={bar.name} className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: bar.color }}>{bar.name}: {bar.len}</span>
                <input type="range" min={1} max={10} value={bar.len} onChange={(e) => setLen(i, Number(e.target.value))} className="w-32" style={{ accentColor: bar.color }} aria-label={`${bar.name} length`} />
              </div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Same units, laid end to end</h2>
      <p>
        The tiles must all be the <strong>same size</strong>{" "}and have no gaps.
        Then the number of tiles is the length. Longer strips need more tiles.
      </p>

      <MathCheck>
        <p>
          A length can be given as a <strong>whole number of same-size units</strong>{" "}
          laid end to end with no gaps or overlaps (1.MD.A.2). To{" "}
          <strong>order three objects</strong>{" "}by length you compare them — and if
          the {sorted[2].name} beats the {sorted[1].name}, and the {sorted[1].name}{" "}
          beats the {sorted[0].name}, then the {sorted[2].name} beats the{" "}
          {sorted[0].name} too (1.MD.A.1). That last step is comparing lengths{" "}
          <em>indirectly</em>.
        </p>
      </MathCheck>
    </div>
  );
}
