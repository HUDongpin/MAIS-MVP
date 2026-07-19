"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Row = { name: string; emoji: string; color: string };
const ROWS: Row[] = [
  { name: "dogs", emoji: "🐶", color: "var(--band-early)" },
  { name: "cats", emoji: "🐱", color: "var(--band-middle)" },
  { name: "fish", emoji: "🐟", color: "var(--band-high)" },
];

export default function Lesson() {
  const [counts, setCounts] = useState([6, 4, 8]);
  const total = counts.reduce((s, n) => s + n, 0);
  const maxIdx = counts.indexOf(Math.max(...counts));
  const minIdx = counts.indexOf(Math.min(...counts));
  const diff = counts[maxIdx] - counts[minIdx];

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
                <div className="flex flex-1 flex-wrap gap-0.5 text-2xl">
                  {Array.from({ length: counts[i] }, (_, k) => <span key={k}>{row.emoji}</span>)}
                </div>
                <span className="w-6 text-lg font-black tabular-nums" style={{ color: row.color }}>{counts[i]}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
            <Fact label="In all" value={`${total} pets`} />
            <Fact label="Most" value={`${ROWS[maxIdx].name} (${counts[maxIdx]})`} />
            <Fact label={`${ROWS[maxIdx].name} vs ${ROWS[minIdx].name}`} value={`${diff} more`} />
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
        There are <strong>{total}</strong>{" "}pets in all. There are{" "}
        <strong>{diff} more {ROWS[maxIdx].name}</strong>{" "}than {ROWS[minIdx].name}.
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
