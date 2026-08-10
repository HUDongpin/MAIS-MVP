"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const L = "var(--band-upper)";
const R = "var(--band-middle)";

export default function Lesson() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(6);
  const [mode, setMode] = useState<"commute" | "distribute">("commute");
  const [split, setSplit] = useState(2);
  const s = Math.min(split, cols - 1);
  const total = rows * cols;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>properties of operations</strong>{" "}are shortcuts that always
        work. You can <strong>swap the factors</strong>, and you can{" "}
        <strong>break a factor apart</strong>{" "}— the product never changes.
      </p>

      <Figure caption="An array of dots shows why the properties are true — just count them a different way.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {([["commute", "Commutative"], ["distribute", "Distributive"]] as const).map(([m, lbl]) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m ? { background: L, color: "white", borderColor: L } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1.35rem)` }}>
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => (
                <div key={`${r}-${c}`} className="h-5 w-5 rounded-full" style={{ background: mode === "distribute" && c >= s ? R : L }} />
              )),
            )}
          </div>

          <div className="text-center font-mono text-lg font-black">
            {mode === "commute" ? (
              <><span style={{ color: L }}>{rows} × {cols}</span> = <span style={{ color: R }}>{cols} × {rows}</span> = {total}</>
            ) : (
              <>{rows} × {cols} = <span style={{ color: L }}>{rows}×{s}</span> + <span style={{ color: R }}>{rows}×{cols - s}</span> = {rows * s} + {rows * (cols - s)} = {total}</>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Rows" value={rows} min={1} max={5} onChange={setRows} />
            <Stepper label="Columns" value={cols} min={2} max={8} onChange={(v) => { setCols(v); setSplit((p) => Math.min(p, v - 1)); }} />
            {mode === "distribute" && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Split at: {s}</span>
                <input type="range" min={1} max={cols - 1} value={s} onChange={(e) => setSplit(Number(e.target.value))} className="w-28 accent-[var(--band-upper)]" aria-label={`Split the ${cols} columns after column ${s}`} />
              </div>
            )}
          </div>
        </div>
      </Figure>

      <h2>Same dots, counted differently</h2>
      <p>
        Turn the array on its side and {rows} × {cols} becomes {cols} × {rows} —
        the <strong>commutative</strong>{" "}property. Split it into two blocks and
        you get the <strong>distributive</strong>{" "}property. Either way, the total
        is {total}.
      </p>

      <MathCheck>
        <p>
          Properties of operations make multiplication flexible (3.OA.B.5):{" "}
          <strong>commutative</strong>{" "}({rows} × {cols} = {cols} × {rows}),{" "}
          <strong>associative</strong>{" "}(grouping factors any way, e.g. (2×3)×4 =
          2×(3×4)), and <strong>distributive</strong>{" "}({rows} × {cols} ={" "}
          {rows}×{s} + {rows}×{cols - s}). The distributive property is the key to
          breaking hard facts into easy ones.
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
