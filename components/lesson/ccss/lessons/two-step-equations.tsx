"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
const S1 = "var(--band-middle)";

export default function Lesson() {
  const [p, setP] = useState(3);
  const [q, setQ] = useState(4);
  const [s, setS] = useState(5); // solution

  const r = p * s + q;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>two-step equation</strong>{" "}like <strong>px + q = r</strong>{" "}
        needs two inverse operations, in order: first <strong>undo the addition</strong>,
        then <strong>undo the multiplication</strong>{" "}— always doing the same to
        both sides.
      </p>

      <Figure caption="Peel the operations off in reverse: subtract first, then divide.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-4xl font-black">{p}x + {q} = {r}</div>

          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[var(--line)] px-8 py-4 font-mono">
            <div className="text-[15px]"><span style={{ color: S1 }}>Step 1:</span> subtract {q} → {p}x = {r - q}</div>
            <div className="text-[15px]"><span style={{ color: ACCENT }}>Step 2:</span> divide by {p} → x = {r - q} ÷ {p}</div>
            <div className="text-3xl font-black" style={{ color: ACCENT }}>x = {s}</div>
          </div>

          <p className="m-0 rounded-xl bg-[var(--surface-2)] px-5 py-2 text-center font-mono text-[15px] font-semibold">
            check: {p}({s}) + {q} = {p * s} + {q} = {r} ✓
          </p>

          <p className="m-0 text-center text-sm text-[var(--ink-faint)]">
            The same steps solve the inequality {p}x + {q} &gt; {r} — the solution is x &gt; {s}.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="p" value={p} min={2} max={6} onChange={setP} />
            <Stepper label="q" value={q} min={1} max={9} onChange={setQ} />
            <Stepper label="solution x" value={s} min={1} max={9} onChange={setS} />
          </div>
        </div>
      </Figure>

      <h2>Reverse order of operations</h2>
      <p>
        Building the expression, you multiply x by {p} <em>then</em>{" "}add {q}. To
        undo it, reverse the order: subtract {q} first, then divide by {p}. That is
        why x = ({r} − {q}) ÷ {p} = {s}.
      </p>

      <MathCheck>
        <p>
          Solving equations of the form <strong>px + q = r</strong>{" "}and{" "}
          <strong>p(x + q) = r</strong>{" "}fluently (7.EE.B.4) uses inverse operations
          in reverse order. The same reasoning solves inequalities like px + q &gt;
          r, whose solution is a range of values (here x &gt; {s}) rather than a
          single number.
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
