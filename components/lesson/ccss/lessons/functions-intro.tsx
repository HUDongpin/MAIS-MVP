"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const IN = "var(--band-middle)";
const OUT = "var(--band-upper)";

export default function Lesson() {
  const [x, setX] = useState(3);

  const rule = (n: number) => 2 * n + 1; // function A: y = 2x + 1
  const y = rule(x);

  // function B given by a table (rate 3, starts at 0)
  const tableB = [0, 1, 2, 3].map((n) => ({ x: n, y: 3 * n }));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>function</strong>{" "}is a rule that gives <strong>exactly one
        output for each input</strong>{" "}— like a machine. Put in a number, get one
        number out. Two functions can be compared even when shown different ways.
      </p>

      <Figure caption="Feed the machine an input; it returns exactly one output. That is what makes it a function.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-xl text-3xl font-black text-white" style={{ background: IN }}>{x}</div>
            <div className="flex flex-col items-center">
              <span className="text-2xl">→</span>
              <span className="rounded-lg bg-[var(--surface-2)] px-3 py-1 font-mono text-sm font-bold">y = 2x + 1</span>
              <span className="text-2xl">→</span>
            </div>
            <div className="grid h-16 w-16 place-items-center rounded-xl text-3xl font-black text-white" style={{ background: OUT }}>{y}</div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">input x = {x}</span>
            <input type="range" min={0} max={8} value={x} onChange={(e) => setX(Number(e.target.value))} className="w-56 accent-[var(--band-upper)]" aria-label="input x" />
          </div>

          {/* comparison */}
          <div className="w-full max-w-md rounded-2xl border-2 border-[var(--line)] px-5 py-4">
            <div className="text-center text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Compare two functions</div>
            <div className="mt-2 flex flex-wrap items-start justify-center gap-6">
              <div className="text-center">
                <div className="text-xs font-bold" style={{ color: IN }}>Function A (equation)</div>
                <div className="font-mono text-lg font-black">y = 2x + 1</div>
                <div className="text-xs text-[var(--ink-faint)]">rate of change = 2</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-bold" style={{ color: OUT }}>Function B (table)</div>
                <table className="mx-auto font-mono text-xs">
                  <tbody>
                    <tr>{tableB.map((r) => <td key={r.x} className="px-1.5">{r.x}</td>)}</tr>
                    <tr>{tableB.map((r) => <td key={r.x} className="px-1.5 font-bold" style={{ color: OUT }}>{r.y}</td>)}</tr>
                  </tbody>
                </table>
                <div className="text-xs text-[var(--ink-faint)]">rate of change = 3</div>
              </div>
            </div>
            <p className="m-0 mt-2 text-center text-sm font-semibold text-[var(--ink-soft)]">Function B grows faster (rate 3 &gt; 2).</p>
          </div>
        </div>
      </Figure>

      <h2>One input, one output</h2>
      <p>
        The rule y = 2x + 1 is a function because every x produces exactly one y.
        If an input could give two different outputs, it would <em>not</em>{" "}be a
        function. Comparing A and B, their rates of change (2 and 3) tell you which
        rises faster.
      </p>

      <MathCheck>
        <p>
          A <strong>function</strong>{" "}assigns to each input exactly one output
          (8.F.A.1) — the defining property. You can <strong>compare</strong>{" "}two
          functions even when they are represented differently (8.F.A.2): read the
          rate of change from an equation (the coefficient of x) or from a table
          (the change in y per step in x). Here 3 &gt; 2, so B changes faster.
        </p>
      </MathCheck>
    </div>
  );
}
