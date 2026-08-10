"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A = "var(--band-early)";
const B = "var(--band-middle)";

function Frame({ fill }: { fill: (string | null)[] }) {
  return (
    <div className="grid gap-1 rounded-xl border-2 border-[var(--line)] bg-[var(--surface)] p-1.5" style={{ gridTemplateColumns: "repeat(5, 1.5rem)", gridAutoRows: "1.5rem" }}>
      {fill.map((c, i) => <div key={i} className="rounded-full border" style={{ borderColor: "var(--line)", background: c ?? "var(--surface-2)" }} />)}
    </div>
  );
}

export default function Lesson() {
  const [a, setA] = useState(8);
  const [b, setB] = useState(7);
  const sum = a + b;

  const strategy =
    a === b ? { name: "Doubles", hint: `${a} + ${a} is a double you can memorize = ${sum}.` }
    : Math.abs(a - b) === 1 ? { name: "Near double", hint: `${a} + ${b} = ${Math.min(a, b)} + ${Math.min(a, b)} + 1 = ${2 * Math.min(a, b)} + 1 = ${sum}.` }
    : a + b > 10 && a < 10 && b < 10 ? { name: "Make a ten", hint: `Fill the first ten: ${a} + ${10 - a} = 10, then 10 + ${b - (10 - a)} = ${sum}.` }
    : { name: "Count on", hint: `Start at ${Math.max(a, b)} and count on ${Math.min(a, b)} = ${sum}.` };

  const first = Array.from({ length: 10 }, (_, i) => (i < a ? A : null));
  const second = Array.from({ length: 10 }, (_, i) => (i < b ? B : null));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Fast adders do not count every dot — they use <strong>mental strategies</strong>.
        Doubles, near-doubles, and “make a ten” turn a hard fact into an easy
        one. Soon you just <em>know</em>{" "}the answer.
      </p>

      <Figure caption="Pick two numbers. One useful mental strategy appears automatically.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-3xl font-black">
            <span style={{ color: A }}>{a}</span> + <span style={{ color: B }}>{b}</span> = {sum}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Frame fill={first} />
            <Frame fill={second} />
          </div>

          <div className="rounded-xl border-2 px-5 py-3 text-center" style={{ borderColor: B }}>
            <div className="text-sm font-black uppercase tracking-wide" style={{ color: B }}>{strategy.name}</div>
            <div className="text-[15px] text-[var(--ink-soft)]">{strategy.hint}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={a} min={1} max={10} color={A} onChange={setA} />
            <Stepper label="Second" value={b} min={1} max={10} color={B} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Know it from memory</h2>
      <p>
        With practice, sums within 20 become facts you remember instantly. The
        strategies are the bridge: they help you <em>understand</em>{" "}the fact
        before you memorize it.
      </p>

      <MathCheck>
        <p>
          Fluently adding within 20 with mental strategies —{" "}
          <strong>doubles</strong>, <strong>near-doubles</strong>, and{" "}
          <strong>making a ten</strong>{" "}— and knowing sums of two one-digit
          numbers from memory is part of 2.OA.B.2. Every strategy relies on the same idea:
          break a number apart and put it back together in an easier way.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
