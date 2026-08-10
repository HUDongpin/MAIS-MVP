"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Row = { name: string; emoji: string; color: string };
const ROWS: Row[] = [
  { name: "Room A", emoji: "📕", color: "var(--band-early)" },
  { name: "Room B", emoji: "📗", color: "var(--band-middle)" },
  { name: "Room C", emoji: "📘", color: "var(--band-upper)" },
];

export function bookSymbolCount(count: number) {
  return `${count} book ${count === 1 ? "symbol" : "symbols"}`;
}

export default function Lesson() {
  const [icons, setIcons] = useState([4, 6, 3]);
  const [scale, setScale] = useState(5);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        When the numbers get big, one picture can stand for{" "}
        <strong>many</strong>. A <strong>scale</strong>{" "}tells you how much each
        symbol is worth, so you <strong>multiply</strong>{" "}to read the graph.
      </p>

      <Figure caption="Each book stands for several. Multiply the pictures by the scale to get the real count.">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2 text-sm font-bold">
            Key: each {ROWS[0].emoji} = {scale} books
          </div>

          <div className="flex w-full flex-col gap-3">
            {ROWS.map((row, i) => (
              <div key={row.name} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-right text-sm font-bold" style={{ color: row.color }}>{row.name}</span>
                <div className="flex flex-1 flex-wrap gap-0.5 text-2xl" role="img" aria-label={`${bookSymbolCount(icons[i])} for ${row.name}`}>
                  {Array.from({ length: icons[i] }, (_, k) => <span key={k} aria-hidden="true">{row.emoji}</span>)}
                </div>
                <span className="w-24 font-mono text-sm font-bold" style={{ color: row.color }}>
                  {icons[i]}×{scale} = {icons[i] * scale}
                </span>
              </div>
            ))}
          </div>

          <output className="sr-only" aria-label="Scaled graph results" aria-live="polite" aria-atomic="true">
            Each symbol represents {scale} books. {ROWS.map((row, index) => `${row.name}: ${icons[index] * scale} books`).join("; ")}.
          </output>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-[var(--ink-faint)]">each = </span>
              {[2, 5, 10].map((s) => (
                <button key={s} type="button" onClick={() => setScale(s)} aria-label={`Each icon stands for ${s}`} aria-pressed={scale === s} className="rounded-lg border px-3 py-1 text-sm font-bold" style={scale === s ? { background: "var(--band-upper)", color: "white", borderColor: "var(--band-upper)" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s}</button>
              ))}
            </div>
            {ROWS.map((row, i) => (
              <div key={row.name} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold" style={{ color: row.color }}>{row.name}</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setIcons((p) => p.map((c, j) => (j === i ? Math.max(1, c - 1) : c)))} disabled={icons[i] <= 1} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Remove one ${row.name} book symbol`}>−</button>
                  <span className="w-5 text-center font-black tabular-nums">{icons[i]}</span>
                  <button type="button" onClick={() => setIcons((p) => p.map((c, j) => (j === i ? Math.min(8, c + 1) : c)))} disabled={icons[i] >= 8} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Add one ${row.name} book symbol`}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>The key does the work</h2>
      <p>
        Room B shows {bookSymbolCount(icons[1])}, and each stands for {scale} books, so Room B
        really has {icons[1]} × {scale} = <strong>{icons[1] * scale}</strong>.
        This discrete-books graph uses only whole symbols, so every represented
        book count stays a whole number.
      </p>

      <MathCheck>
        <p>
          Scaled picture and bar graphs (3.MD.B.3) use a key so one symbol (or one
          unit of bar height) represents several. You <strong>multiply</strong>{" "}
          the number of symbols by the scale to read a value, and add or subtract
          those values to solve &ldquo;how many more&rdquo; and &ldquo;how many in
          all&rdquo; problems.
        </p>
      </MathCheck>
    </div>
  );
}
