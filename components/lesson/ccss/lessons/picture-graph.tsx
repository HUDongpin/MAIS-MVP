"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Row = { name: string; singular: string; emoji: string; color: string };
const ROWS: Row[] = [
  { name: "dogs", singular: "dog", emoji: "🐶", color: "var(--band-early)" },
  { name: "cats", singular: "cat", emoji: "🐱", color: "var(--band-middle)" },
  { name: "fish", singular: "fish", emoji: "🐟", color: "var(--band-high)" },
];
const petCount = (count: number) => `${count} pet${count === 1 ? "" : "s"}`;

export default function Lesson() {
  const [counts, setCounts] = useState([6, 4, 8]);
  const total = counts.reduce((s, n) => s + n, 0);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  const topNames = ROWS.filter((_, i) => counts[i] === maxCount).map((row) => row.name);
  const bottomNames = ROWS.filter((_, i) => counts[i] === minCount).map((row) => row.name);
  const allEqual = maxCount === minCount;
  const diff = maxCount - minCount;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>picture graph</strong>{" "}lines up data so we can read it fast.
        Each picture stands for one. Longer rows mean more. Then we can ask{" "}
        <strong>how many more</strong>, <strong>how many fewer</strong>, and{" "}
        <strong>how many in all</strong>.
      </p>

      <Figure caption="Our class pets. Each row is one kind of pet — count and compare the rows.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex w-full flex-col gap-3">
            {ROWS.map((row, i) => (
              <div key={row.name} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-right text-sm font-bold" style={{ color: row.color }}>{row.name}</span>
                <div className="flex flex-1 flex-wrap gap-0.5 text-2xl" role="img" aria-label={`${counts[i]} ${counts[i] === 1 ? row.singular : row.name}`}>
                  {Array.from({ length: counts[i] }, (_, k) => <span key={k} aria-hidden="true">{row.emoji}</span>)}
                </div>
                <span className="w-6 text-lg font-black tabular-nums" style={{ color: row.color }}>{counts[i]}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
            <Fact label="In all" value={petCount(total)} />
            <Fact
              label={allEqual ? "Same count" : topNames.length === 1 ? "Most" : "Tied for most"}
              value={allEqual ? `${maxCount} in every row` : `${joinNames(topNames)} (${maxCount})`}
            />
            <Fact
              label={allEqual ? "Difference" : `${joinNames(topNames)} vs ${joinNames(bottomNames)}`}
              value={allEqual ? "0 — all equal" : `${diff} more`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {ROWS.map((row, i) => (
              <Stepper key={row.name} label={row.name} value={counts[i]} color={row.color} onChange={(v) => setCounts((prev) => prev.map((n, j) => (j === i ? v : n)))} />
            ))}
          </div>
        </div>
      </Figure>

      <h2>Reading the graph</h2>
      <p>
        {total === 1 ? "There is" : "There are"}{" "}<strong>{petCount(total)}</strong>{" "}in all.{" "}
        {allEqual
          ? <>Every row has the same number, so no pet is more common than another.</>
          : <>
              The largest {topNames.length === 1 ? "row is" : "rows are"}{" "}
              <strong>{joinNames(topNames)} ({maxCount})</strong>, and the smallest {bottomNames.length === 1 ? "row is" : "rows are"}{" "}
              <strong>{joinNames(bottomNames)} ({minCount})</strong>. The difference is <strong>{diff}</strong>.
            </>}{" "}
        The graph makes the comparison easy to see.
      </p>

      <MathCheck>
        <p>
          Organizing data into up to three categories and reading it — total
          count, which category has <strong>most</strong>{" "}or <strong>least</strong>,
          and <strong>how many more or fewer</strong>{" "}one category has than
          another — is 1.MD.C.4. A picture graph turns counting into a
          comparison you can see at a glance.
        </p>
      </MathCheck>
    </div>
  );
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</div>
      <div className="text-base font-black">{value}</div>
    </div>
  );
}

function Stepper({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Fewer ${label}`}>−</button>
        <span className="w-6 text-center text-xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(10, value + 1))} disabled={value >= 10} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`More ${label}`}>+</button>
      </div>
    </div>
  );
}
