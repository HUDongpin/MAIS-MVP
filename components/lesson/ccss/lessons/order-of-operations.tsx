"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const PAR = "var(--band-upper)";
const MUL = "var(--band-middle)";

export default function Lesson() {
  const [a, setA] = useState(4);
  const [b, setB] = useState(3);
  const [c, setC] = useState(5);
  const [d, setD] = useState(2);
  const [paren, setParen] = useState(true);

  const withParen = (a + b) * c - d;
  const noParen = a + b * c - d;
  const result = paren ? withParen : noParen;
  // Grade 5 evaluates whole-number expressions; negative numbers are not
  // introduced until Grade 6. The ungrouped form is the smaller of the two,
  // so keeping d at or below it keeps both displayed results in scope.
  const maxSubtrahend = Math.min(9, a + b * c);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        When an expression mixes operations, <strong>order matters</strong>.{" "}
        <strong>Parentheses come first</strong>, then multiply and divide, then
        add and subtract. The same numbers can give different answers depending on
        the grouping.
      </p>

      <Figure caption="Toggle the parentheses. Watch how grouping changes what you do first — and the answer.">
        <div className="flex flex-col items-center gap-6">
          <button type="button" onClick={() => setParen((p) => !p)} className="rounded-lg border-2 px-4 py-1.5 text-sm font-bold" style={{ borderColor: PAR, color: PAR }}>
            {paren ? "Remove parentheses" : "Add parentheses"}
          </button>

          <div className="font-mono text-3xl font-black">
            {paren ? <><span style={{ color: PAR }}>(</span>{a} + {b}<span style={{ color: PAR }}>)</span> × {c} − {d}</> : <>{a} + {b} × {c} − {d}</>}
          </div>

          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[var(--line)] px-6 py-4">
            {paren ? (
              <>
                <div className="font-mono text-[15px]"><span style={{ color: PAR }}>({a} + {b})</span> = {a + b} <span className="text-[var(--ink-faint)]">(parentheses first)</span></div>
                <div className="font-mono text-[15px]">{a + b} <span style={{ color: MUL }}>× {c}</span> = {(a + b) * c} <span className="text-[var(--ink-faint)]">(then multiply)</span></div>
                <div className="font-mono text-[15px]">{(a + b) * c} − {d} = <strong style={{ color: PAR }}>{withParen}</strong></div>
              </>
            ) : (
              <>
                <div className="font-mono text-[15px]"><span style={{ color: MUL }}>{b} × {c}</span> = {b * c} <span className="text-[var(--ink-faint)]">(multiply first)</span></div>
                <div className="font-mono text-[15px]">{a} + {b * c} − {d} = <strong style={{ color: MUL }}>{noParen}</strong></div>
              </>
            )}
          </div>

          <div className="font-mono text-2xl font-black">= <span style={{ color: paren ? PAR : MUL }}>{result}</span></div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* The letters are state names — the expression on screen shows
                only their values, so "Decrease c" pointed at nothing. */}
            <Stepper label="first number" value={a} onChange={(v) => { setA(v); setD((p) => Math.min(p, v + b * c)); }} />
            <Stepper label="second number" value={b} onChange={(v) => { setB(v); setD((p) => Math.min(p, a + v * c)); }} />
            {/* c = 1 makes the two expressions algebraically identical
                (their difference is a·(c−1)), so the page read "Same digits,
                different answers" above two identical results. */}
            <Stepper label="multiplier" value={c} min={2} onChange={(v) => { setC(v); setD((p) => Math.min(p, a + b * v)); }} />
            <Stepper label="number subtracted" value={d} max={maxSubtrahend} onChange={setD} />
          </div>
        </div>
      </Figure>

      <h2>Grouping changes everything</h2>
      <p>
        With parentheses, {a} + {b} = {a + b} happens first, giving {withParen}.
        Without them, {b} × {c} = {b * c} happens first, giving {noParen}. Same
        digits, different answers — that is why we group with symbols.
      </p>

      <MathCheck>
        <p>
          Evaluating expressions with <strong>parentheses, brackets, and braces</strong>{" "}
          (5.OA.A.1) follows the order of operations: work inside grouping symbols
          first, then multiplication and division (left to right), then addition
          and subtraction. Grouping ({a} + {b}) forces that sum to happen before
          the multiplication — changing {noParen} into {withParen}.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min = 1, max = 9, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= min} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-6 text-center text-xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= max} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
