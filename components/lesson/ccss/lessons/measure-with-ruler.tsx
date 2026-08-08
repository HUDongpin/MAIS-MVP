"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const BIGU = 44; // px per big unit
const BAR = "var(--band-middle)";

export default function Lesson() {
  const [len, setLen] = useState(4); // length in big units
  const [small, setSmall] = useState(false); // measure in small (half) units

  const unitPx = small ? BIGU / 2 : BIGU;
  const count = small ? len * 2 : len;
  // The stepper minimum is 1, where "1 small units" reads wrong.
  const unitName = small ? "small unit" : "big unit";
  const barPx = len * BIGU;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To measure, line up a ruler at <strong>0</strong>{" "}and read where the
        object ends. The <strong>same object</strong>{" "}measures a bigger number
        when you use <strong>smaller units</strong>{" "}— because more of them fit.
      </p>

      <Figure caption="Switch the ruler's units. The bar stays the same length, but the number changes.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <div className="mx-auto" style={{ width: barPx + 4 }}>
              {/* the object */}
              <div className="mb-1 rounded" style={{ width: barPx, height: 26, background: BAR }} />
              {/* the ruler */}
              <div className="relative border-t-2 border-[var(--ink)]" style={{ width: barPx }}>
                {Array.from({ length: count + 1 }, (_, i) => (
                  <div key={i} className="absolute top-0 flex flex-col items-center" style={{ left: i * unitPx - 0.5 }}>
                    <div style={{ width: 2, height: 9, background: "var(--ink-soft)" }} />
                    <span className="mt-0.5 font-mono text-[10px] text-[var(--ink-faint)]">{i}</span>
                  </div>
                ))}
              </div>
            </div>
          </FigureScroll>

          <div className="text-center">
            <div className="text-3xl font-black" style={{ color: BAR }}>{count} {unitName}{count === 1 ? "" : "s"}</div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              The bar is the same length either way — {len} big units is the same as {len * 2} small units.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <button type="button" onClick={() => setSmall((s) => !s)} className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: BAR }}>
              Measure in {small ? "big" : "small"} units
            </button>
            <Stepper label="Bar length" value={len} min={1} max={8} onChange={setLen} />
          </div>
        </div>
      </Figure>

      <h2>Smaller units, bigger number</h2>
      <p>
        A small unit is shorter, so it takes more of them to cover the bar. That
        is why the number goes up when the unit gets smaller — even though the
        bar never changed.
      </p>

      <MathCheck>
        <p>
          Measuring length with a tool means counting equal units from 0
          (2.MD.A.1). Measuring the <em>same</em>{" "}object with two different units
          gives two different numbers (2.MD.A.2): a smaller unit yields a larger
          count because it takes more of them to span the same length. The length
          itself is unchanged — only the unit did.
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
