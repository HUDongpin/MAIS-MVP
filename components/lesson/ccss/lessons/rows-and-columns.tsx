"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CELL = 44;
const FILL = "var(--band-upper)";

export default function Lesson() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const total = rows * cols;
  const W = cols * CELL, H = rows * CELL;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Split a rectangle into equal <strong>rows</strong>{" "}and{" "}
        <strong>columns</strong>{" "}of same-size squares, and you can count the
        squares. Each row has the same number, so you can add or multiply to
        find how many.
      </p>

      <Figure caption="Same-size squares fill the rectangle in equal rows and columns.">
        <div className="flex flex-col items-center gap-6">
          <svg width={W + 2} height={H + 2} viewBox={`0 0 ${W + 2} ${H + 2}`} className="max-w-full" role="img" aria-label={`${rows} rows and ${cols} columns of squares`}>
            <g transform="translate(1,1)">
              {Array.from({ length: rows }, (_, r) =>
                Array.from({ length: cols }, (_, c) => (
                  <rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={FILL} fillOpacity={0.8} stroke="var(--surface)" strokeWidth={2} />
                )),
              )}
            </g>
          </svg>

          <div className="text-center">
            <div className="font-mono text-xl font-black">{rows} rows × {cols} columns = <span style={{ color: FILL }}>{total}</span> squares</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">
              {Array.from({ length: rows }, () => cols).join(" + ")} = {total}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Rows" value={rows} min={1} max={5} onChange={setRows} />
            <Stepper label="Columns" value={cols} min={1} max={5} onChange={setCols} />
          </div>
        </div>
      </Figure>

      <h2>Equal rows, equal columns</h2>
      <p>
        Because the squares are all the same size and fill the rectangle with no
        gaps, every row holds the same count and every column holds the same
        count. Counting them is the start of finding <strong>area</strong>.
      </p>

      <MathCheck>
        <p>
          Partitioning a rectangle into <strong>rows and columns of same-size
          squares</strong>{" "}and counting them (2.G.A.2) builds the idea of area.
          The total is the same whether you add equal rows
          ({Array.from({ length: rows }, () => cols).join(" + ")} = {total}) or
          multiply rows × columns ({rows} × {cols} = {total}).
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
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
