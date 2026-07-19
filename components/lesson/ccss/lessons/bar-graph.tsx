"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Cat = { name: string; color: string };
const CATS: Cat[] = [
  { name: "apple", color: "var(--band-early)" },
  { name: "banana", color: "var(--band-middle)" },
  { name: "grape", color: "var(--band-high)" },
  { name: "orange", color: "var(--band-upper)" },
];
const MAXV = 10;
const BARH = 160;

export default function Lesson() {
  const [vals, setVals] = useState([6, 9, 3, 5]);
  const total = vals.reduce((s, n) => s + n, 0);
  const maxIdx = vals.indexOf(Math.max(...vals));
  const minIdx = vals.indexOf(Math.min(...vals));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>bar graph</strong>{" "}shows amounts as bars against a{" "}
        <strong>scale</strong>. Read a bar's height on the scale to get its
        value, then <strong>add</strong>{" "}or <strong>subtract</strong>{" "}to answer
        questions.
      </p>

      <Figure caption="Favorite fruits in our class. Compare the bars against the scale on the left.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-end gap-3">
            {/* y-axis */}
            <div className="flex flex-col-reverse justify-between pr-1 text-right font-mono text-[10px] text-[var(--ink-faint)]" style={{ height: BARH }}>
              {Array.from({ length: MAXV + 1 }, (_, i) => (i % 2 === 0 ? <span key={i} style={{ lineHeight: 1 }}>{i}</span> : <span key={i} />))}
            </div>
            {/* bars */}
            <div className="flex items-end gap-4 border-l-2 border-b-2 border-[var(--ink-soft)] pl-3" style={{ height: BARH }}>
              {CATS.map((cat, i) => (
                <div key={cat.name} className="flex flex-col items-center justify-end">
                  <span className="mb-1 text-sm font-black" style={{ color: cat.color }}>{vals[i]}</span>
                  <div className="w-9 rounded-t" style={{ height: (vals[i] / MAXV) * (BARH - 20), background: cat.color, transition: "height 0.3s ease" }} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4 pl-10">
            {CATS.map((c) => <span key={c.name} className="w-9 text-center text-[11px] font-semibold text-[var(--ink-soft)]">{c.name}</span>)}
          </div>

          <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
            <Fact label="Total" value={`${total} votes`} />
            <Fact label="Most popular" value={`${CATS[maxIdx].name} (${vals[maxIdx]})`} />
            <Fact label={`${CATS[maxIdx].name} − ${CATS[minIdx].name}`} value={`${vals[maxIdx] - vals[minIdx]} more`} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {CATS.map((cat, i) => (
              <div key={cat.name} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold" style={{ color: cat.color }}>{cat.name}</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setVals((p) => p.map((v, j) => (j === i ? Math.max(0, v - 1) : v)))} disabled={vals[i] <= 0} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`fewer ${cat.name}`}>−</button>
                  <span className="w-5 text-center font-black tabular-nums">{vals[i]}</span>
                  <button type="button" onClick={() => setVals((p) => p.map((v, j) => (j === i ? Math.min(MAXV, v + 1) : v)))} disabled={vals[i] >= MAXV} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`more ${cat.name}`}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Compare with the scale</h2>
      <p>
        The scale turns bar heights into numbers. Then “how many more” is a
        subtraction ({vals[maxIdx]} − {vals[minIdx]} = {vals[maxIdx] - vals[minIdx]})
        and “how many altogether” is an addition ({total}).
      </p>

      <MathCheck>
        <p>
          A <strong>bar graph</strong>{" "}with a single-unit scale shows data for
          several categories (2.MD.D.10). Reading heights off the scale lets you
          solve <strong>put-together</strong>{" "}(total = {total}),{" "}
          <strong>take-apart</strong>, and <strong>compare</strong>{" "}problems
          (difference = {vals[maxIdx] - vals[minIdx]}) using addition and
          subtraction.
        </p>
      </MathCheck>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</div>
      <div className="text-base font-black">{value}</div>
    </div>
  );
}
