"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const DOT = "var(--band-upper)";

function factorPairs(n: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let a = 1; a * a <= n; a++) if (n % a === 0) pairs.push([a, n / a]);
  return pairs;
}

export default function Lesson() {
  const [n, setN] = useState(12);
  const [pi, setPi] = useState(0);

  const pairs = factorPairs(n);
  const isPrime = pairs.length === 1; // only 1 × n
  const p = pairs[Math.min(pi, pairs.length - 1)];
  const [rows, cols] = [p[0], p[1]];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>factors</strong>{" "}of a number are the whole numbers that
        divide it evenly — the sides of every rectangle you can build with that
        many squares. A number with <strong>only two</strong>{" "}factors (1 and
        itself) is <strong>prime</strong>.
      </p>

      <Figure caption="Each rectangle shows a factor pair. Tap a pair to build it.">
        <div className="flex flex-col items-center gap-6">
          <div className="text-4xl font-black">{n}</div>

          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1.1rem)` }}>
            {Array.from({ length: rows * cols }, (_, i) => <div key={i} className="h-4 w-4 rounded-sm" style={{ background: DOT }} />)}
          </div>
          <div className="font-mono text-lg font-bold" style={{ color: DOT }}>{rows} × {cols} = {n}</div>

          <div className="flex flex-wrap justify-center gap-2">
            {pairs.map((pr, i) => (
              <button key={i} type="button" onClick={() => setPi(i)} aria-pressed={i === Math.min(pi, pairs.length - 1)} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={i === Math.min(pi, pairs.length - 1) ? { background: DOT, color: "white", borderColor: DOT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{pr[0]} × {pr[1]}</button>
            ))}
          </div>

          <div className="rounded-xl px-5 py-2 text-center text-lg font-black" style={{ background: isPrime ? "color-mix(in oklab, var(--band-early) 14%, var(--surface))" : "color-mix(in oklab, var(--band-upper) 12%, var(--surface))", color: isPrime ? "var(--band-early)" : "var(--band-upper)" }}>
            {n} is {isPrime ? "PRIME" : "COMPOSITE"} — {isPrime ? "only 1 × " + n : pairs.length + " factor pairs"}
          </div>

          <Stepper label="Number" value={n} min={2} max={36} onChange={(v) => { setN(v); setPi(0); }} />
        </div>
      </Figure>

      <h2>Prime or composite</h2>
      <p>
        {isPrime
          ? `${n} makes only one rectangle — a single row of ${n}. That is what makes it prime.`
          : `${n} can be built as ${pairs.length} different rectangles, so it has more than two factors — it is composite.`}{" "}
        Every multiple of {n} (like {n * 2}, {n * 3}, …) has {n} as one of its factors.
      </p>

      <MathCheck>
        <p>
          Finding all <strong>factor pairs</strong>{" "}of a number from 1 to 100, and
          telling whether it is <strong>prime</strong>{" "}(exactly two factors) or{" "}
          <strong>composite</strong>{" "}(more than two), is 4.OA.B.4. A number is a{" "}
          <strong>multiple</strong>{" "}of each of its factors, so {n} is a multiple of{" "}
          {rows} and of {cols}.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-10 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
