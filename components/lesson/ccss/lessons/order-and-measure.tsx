"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const UNIT = 26;
type Bar = { name: string; color: string; len: number };

export default function Lesson() {
  const [bars, setBars] = useState<Bar[]>([
    // Names must match the tokens a Grade 1 student sees: --band-early is
    // ORANGE and --band-high is PURPLE, so the strips called "red" and "green"
    // rendered orange and purple while the prose named the wrong colours.
    { name: "orange", color: "var(--band-early)", len: 5 },
    { name: "blue", color: "var(--band-middle)", len: 8 },
    { name: "purple", color: "var(--band-high)", len: 3 },
  ]);

  const sorted = [...bars].sort((a, b) => a.len - b.len);
  const minLen = sorted[0].len, maxLen = sorted[sorted.length - 1].len;
  const rankWord = (len: number, all: typeof sorted) => {
    if (minLen === maxLen) return "all the same";
    const sharesMax = all.filter((x) => x.len === maxLen).length > 1;
    const sharesMin = all.filter((x) => x.len === minLen).length > 1;
    if (len === maxLen) return sharesMax ? "tied longest" : "longest";
    if (len === minLen) return sharesMin ? "tied shortest" : "shortest";
    return "middle";
  };
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
                  {/* The word came from the sorted index alone, so at
                      orange 5, blue 5, purple 3 the two equal strips were
                      badged "middle" and "longest". The prose below already
                      handled ties; this badge did not. */}
                  {rankWord(bar.len, sorted)}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: bar.len }, (_, i) => (
                    <div key={i} className="rounded-sm border border-white/50" style={{ width: UNIT, height: 24, background: bar.color }} />
                  ))}
                </div>
                <span className="text-sm font-bold" style={{ color: bar.color }}>{bar.len} unit{bar.len === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {/* Two short sentences instead of one 26-word chain, and honest when
                two strips tie — the old wording claimed "longer than" for equal
                lengths, and Grade 1 readers lose the middle term of a chain. */}
            {sorted[2].len === sorted[0].len ? (
              <>All three strips are the same length.</>
            ) : sorted[2].len === sorted[1].len ? (
              <>The {sorted[2].name} strip and the {sorted[1].name} strip are the same length. Both are longer than the {sorted[0].name} strip.</>
            ) : sorted[1].len === sorted[0].len ? (
              <>The {sorted[2].name} strip is the longest. The {sorted[1].name} strip and the {sorted[0].name} strip are the same length.</>
            ) : (
              <>The {sorted[2].name} strip is longer than the {sorted[1].name} strip. The {sorted[1].name} strip is longer than the {sorted[0].name} strip. So the {sorted[2].name} strip is the longest.</>
            )}
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
