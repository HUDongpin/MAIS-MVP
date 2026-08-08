"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Color = { name: string; emoji: string; color: string };
const COLORS: Color[] = [
  { name: "red", emoji: "🔴", color: "var(--band-early)" },
  { name: "blue", emoji: "🔵", color: "var(--band-upper)" },
  { name: "green", emoji: "🟢", color: "var(--band-high)" },
];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function Lesson() {
  const [counts, setCounts] = useState([3, 2, 1]);
  const total = counts.reduce((s, c) => s + c, 0);
  const uniform = counts.every((c) => c === counts[0]);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>probability model</strong>{" "}lists every outcome and its
        probability. When all outcomes are equally likely, the model is{" "}
        <strong>uniform</strong>{" "}(like a fair die). When they aren&apos;t, each
        probability is its share of the total.
      </p>

      <Figure caption="A bag of marbles. Each color's probability is its count over the total.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-1 rounded-2xl border-2 border-[var(--line)] p-4 text-3xl" style={{ maxWidth: 260 }}>
            {COLORS.flatMap((c, i) => Array.from({ length: counts[i] }, (_, k) => <span key={`${c.name}${k}`}>{c.emoji}</span>))}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {COLORS.map((c, i) => {
              const g = gcd(counts[i], total);
              const frac = counts[i] === 0 ? "0" : g === total ? "1" : `${counts[i] / g}/${total / g}`;
              return (
                <div key={c.name} className="rounded-xl border-2 px-4 py-2" style={{ borderColor: c.color }}>
                  <div className="text-xs font-bold uppercase" style={{ color: c.color }}>P({c.name})</div>
                  <div className="font-mono text-xl font-black">{frac}</div>
                  <div className="text-[10px] text-[var(--ink-faint)]">{counts[i]}/{total} = {(counts[i] / total).toFixed(2)}</div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg px-4 py-1.5 text-sm font-bold" style={{ color: uniform ? "var(--band-upper)" : "var(--ink-soft)" }}>
            {uniform ? "✓ Uniform model — all equally likely" : "Non-uniform — probabilities differ"} · they sum to {total}/{total} = 1
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {COLORS.map((c, i) => (
              <div key={c.name} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold" style={{ color: c.color }}>{c.name}</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setCounts((p) => p.map((v, j) => (j === i ? Math.max(0, v - 1) : v)))} disabled={counts[i] <= 0 || total <= 1} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`fewer ${c.name}`}>−</button>
                  <span className="w-5 text-center text-lg font-black tabular-nums">{counts[i]}</span>
                  <button type="button" onClick={() => setCounts((p) => p.map((v, j) => (j === i ? Math.min(6, v + 1) : v)))} disabled={counts[i] >= 6} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`more ${c.name}`}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Probabilities that add to 1</h2>
      <p>
        {/* The old chain read "P(color) = (that color) ÷ (total) = 3 + 2 + 1
            over 6", i.e. P = 6/6 = 1 for every colour: the numerator shown was
            the sum of ALL counts. Show the per-colour fractions instead. */}
        Every marble is equally likely to be drawn, so each color&apos;s probability
        is its own count over the total: {counts.map((c, i) => `${c}/${total}`).join(", ")}. Those add to{" "}
        {counts.reduce((s, c) => s + c, 0)}/{total} = 1, because every outcome is counted exactly once.
      </p>

      <MathCheck>
        <p>
          A <strong>probability model</strong>{" "}assigns a probability to each
          outcome so they sum to 1 (7.SP.C.7). A <strong>uniform</strong>{" "}model
          gives every outcome the same probability (a fair die: 1/6 each); a
          non-uniform model uses the outcomes&apos; relative frequencies (here P(red)
          = {counts[0]}/{total}). Theoretical probabilities come straight from the
          model.
        </p>
      </MathCheck>
    </div>
  );
}
