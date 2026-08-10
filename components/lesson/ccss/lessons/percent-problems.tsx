"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Mode = "discount" | "tax" | "tip";
const ACCENT = "var(--band-upper)";
const AMT = "var(--band-middle)";

const LABELS: Record<Mode, { name: string; add: boolean }> = {
  discount: { name: "Discount", add: false },
  tax: { name: "Sales tax", add: true },
  tip: { name: "Tip", add: true },
};

export default function Lesson() {
  const [price, setPrice] = useState(40);
  const [percent, setPercent] = useState(15);
  const [mode, setMode] = useState<Mode>("discount");

  const amount = (percent / 100) * price;
  const add = LABELS[mode].add;
  const final = add ? price + amount : price - amount;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Percents run the real world: <strong>discounts</strong>{" "}off a price,{" "}
        <strong>tax</strong>{" "}and <strong>tips</strong>{" "}added on. Each is a two-step
        problem — find the percent <em>amount</em>, then add it or subtract it.
      </p>

      <Figure caption="First find the percent of the price, then adjust the total up or down.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(Object.keys(LABELS) as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{LABELS[m].name}</button>
            ))}
          </div>

          <p className="m-0 text-center text-lg font-semibold">
            A ${price} item with a {percent}% {LABELS[mode].name.toLowerCase()}.
          </p>

          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[var(--line)] px-6 py-4 font-mono">
            <div className="text-[15px] text-[var(--ink-soft)]">Step 1: {percent}% of ${price} = <span style={{ color: AMT }}>${amount.toFixed(2)}</span></div>
            <div className="text-[15px] text-[var(--ink-soft)]">Step 2: ${price} {add ? "+" : "−"} ${amount.toFixed(2)}</div>
            <div className="text-3xl font-black" style={{ color: ACCENT }}>${final.toFixed(2)}</div>
          </div>

          <p className="m-0 text-center text-sm text-[var(--ink-faint)]">
            Shortcut: multiply by {add ? `1 + ${percent}/100 = ${(1 + percent / 100).toFixed(2)}` : `1 − ${percent}/100 = ${(1 - percent / 100).toFixed(2)}`} → ${final.toFixed(2)}.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Price ($)" value={price} min={5} max={100} step={5} onChange={setPrice} />
            <Stepper label="Percent" value={percent} min={5} max={50} step={5} onChange={setPercent} suffix="%" />
          </div>
        </div>
      </Figure>

      <h2>Percent of, then adjust</h2>
      <p>
        A {percent}% {LABELS[mode].name.toLowerCase()} on ${price} is ${amount.toFixed(2)}. {add ? "Adding" : "Subtracting"} it gives ${final.toFixed(2)}.
        You can also do it in one step by multiplying by {add ? (1 + percent / 100).toFixed(2) : (1 - percent / 100).toFixed(2)}.
      </p>

      <MathCheck>
        <p>
          Multistep percent problems — <strong>tax, tip, markup, discount, and
          percent change</strong>{" "}— use proportional reasoning (7.RP.A.3). Find the
          percent of the base ({percent}% of ${price} = ${amount.toFixed(2)}), then{" "}
          {add ? "add it" : "subtract it"} to get ${final.toFixed(2)}. A single
          multiplier ({add ? (1 + percent / 100).toFixed(2) : (1 - percent / 100).toFixed(2)}) does both steps at once.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-14 text-center text-2xl font-black tabular-nums">{value}{suffix}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
