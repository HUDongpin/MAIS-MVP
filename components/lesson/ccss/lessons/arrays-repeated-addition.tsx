"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const DOT = "var(--band-middle)";

export default function Lesson() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const total = rows * cols;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        An <strong>array</strong>{" "}lines objects up in equal rows. To find the
        total, you can add the <strong>same number</strong>{" "}over and over — once
        for each row. That is <strong>repeated addition</strong>.
      </p>

      <Figure caption="Each row has the same number of dots. Add the rows to find the total.">
        <div className="flex flex-col items-center gap-6">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 2rem)` }}>
            {Array.from({ length: rows * cols }, (_, i) => (
              <div key={i} className="h-8 w-8 rounded-full" style={{ background: DOT }} />
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-xl font-black">
              {Array.from({ length: rows }, () => cols).join(" + ")} = <span style={{ color: DOT }}>{total}</span>
            </div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">
              {rows} row{rows === 1 ? "" : "s"} of {cols} — that is {cols} added {rows} time{rows === 1 ? "" : "s"}, which is {rows} × {cols} = {total}.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Rows" value={rows} min={1} max={5} onChange={setRows} />
            <Stepper label="In each row" value={cols} min={1} max={5} onChange={setCols} />
          </div>
        </div>
      </Figure>

      <h2>Equal rows add up fast</h2>
      <p>
        Because every row is equal, you do not count one by one. You add the row
        amount again and again. This is the very beginning of{" "}
        <strong>multiplication</strong>.
      </p>

      <MathCheck>
        <p>
          Finding the total number of objects in a rectangular array (up to 5 by
          5) by adding equal rows — <strong>repeated addition</strong>{" "}— is
          2.OA.C.4. Here, {rows} row{rows === 1 ? "" : "s"} of {cols} give {" "}
          {Array.from({ length: rows }, () => cols).join(" + ")} = {total}. Writing
          it as {rows} × {cols} is the multiplication you will meet in Grade 3.
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
