"use client";

import { useMemo, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Cat = { name: string; color: string; emoji: string };
const CATS: Cat[] = [
  { name: "apples", color: "var(--band-early)", emoji: "🍎" },
  { name: "bananas", color: "var(--band-upper)", emoji: "🍌" },
  { name: "grapes", color: "var(--band-high)", emoji: "🍇" },
];

// a fixed jumble (seeded) so the "before" view is stable
const JUMBLE = [0, 2, 1, 0, 2, 0, 1, 2, 0, 1, 2, 0];

export default function Lesson() {
  const [sorted, setSorted] = useState(false);
  const [counts, setCounts] = useState([5, 3, 4]); // apples, bananas, grapes

  const total = counts.reduce((s, n) => s + n, 0);
  // Every category at the top count, not just the first one. `indexOf(max)`
  // named a single winner on a tie — with [4, 3, 4] it said "Most of all:
  // apples (4)" while the grapes basket beside it also held 4, and reading the
  // most from the picture is the whole point of K.MD.B.3.
  const maxCount = Math.max(...counts);
  const leaders = counts.map((n, i) => (n === maxCount ? i : -1)).filter((i) => i >= 0);

  // build the jumble to display before sorting, honoring current counts
  const jumbleItems = useMemo(() => {
    const pool: number[] = [];
    counts.forEach((n, ci) => { for (let i = 0; i < n; i++) pool.push(ci); });
    // interleave using JUMBLE order as a guide
    return pool
      .map((c, i) => ({ c, k: JUMBLE[i % JUMBLE.length] * 100 + i }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.c);
  }, [counts]);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        When things are all mixed up, we can <strong>sort</strong>{" "}them into
        groups that belong together. Then we <strong>count</strong>{" "}each group to
        see how many — and which group has the <strong>most</strong>.
      </p>

      <Figure caption="Tap Sort to gather each kind of fruit into its own basket, then count.">
        <div className="flex flex-col items-center gap-6">
          {!sorted ? (
            <div
              className="flex max-w-md flex-wrap justify-center gap-1.5 text-3xl"
              role="img"
              aria-label={`A jumbled pile of ${total} pieces of fruit: apples, bananas, and grapes all mixed together`}
            >
              {jumbleItems.map((c, i) => (
                <span key={i} aria-hidden="true">{CATS[c].emoji}</span>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-end justify-center gap-6">
              {CATS.map((cat, ci) => (
                <div key={cat.name} className="flex flex-col items-center gap-2">
                  <div className="flex flex-col-reverse items-center gap-1 rounded-2xl border-2 p-2" style={{ borderColor: cat.color, minWidth: 64 }}>
                    {Array.from({ length: counts[ci] }, (_, i) => (
                      <span key={i} className="text-2xl">{cat.emoji}</span>
                    ))}
                  </div>
                  <span className="text-2xl font-black" style={{ color: cat.color }}>{counts[ci]}</span>
                  <span className="text-xs font-semibold text-[var(--ink-soft)]">{cat.name}</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setSorted((s) => !s)}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--brand)" }}
          >
            {sorted ? "Mix them up again" : "Sort into baskets →"}
          </button>

          {sorted && (
            <p className="m-0 text-center text-lg font-bold">
              {leaders.length === 1 ? "Most of all: " : "Tied for most: "}
              {leaders.map((li, order) => (
                <span key={CATS[li].name}>
                  {order > 0 ? (order === leaders.length - 1 ? " and " : ", ") : ""}
                  <span style={{ color: CATS[li].color }}>{CATS[li].emoji} {CATS[li].name}</span>
                </span>
              ))}
              {" "}({maxCount}). Total fruit: {total}.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6">
            {CATS.map((cat, ci) => (
              <Stepper
                key={cat.name}
                label={cat.name}
                value={counts[ci]}
                color={cat.color}
                onChange={(v) => setCounts((prev) => prev.map((n, i) => (i === ci ? v : n)))}
              />
            ))}
          </div>
        </div>
      </Figure>

      <h2>Sorting makes counting easy</h2>
      <p>
        Once each kind is in its own basket, counting is simple — and it is easy
        to see which basket has more and which has fewer.
      </p>

      <MathCheck>
        <p>
          <strong>Classifying objects into categories</strong>, counting each
          category, and then ordering the categories by how many — most to least
          — is exactly K.MD.B.3. Sorting first turns a messy pile into groups you
          can count and compare accurately.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Fewer ${label}`}>−</button>
        <span className="w-6 text-center text-xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(8, value + 1))} disabled={value >= 8} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`More ${label}`}>+</button>
      </div>
    </div>
  );
}
