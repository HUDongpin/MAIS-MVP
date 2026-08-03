"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";

export default function Lesson() {
  const [cost, setCost] = useState(6);
  const [items, setItems] = useState(3);

  const rate = cost / items;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>unit rate</strong>{" "}tells you &ldquo;how much for{" "}
        <strong>one</strong>.&rdquo; Take a ratio like <strong>${cost} for {items}{" "}
        apples</strong>{" "}and divide to find the cost of a single apple — the rate{" "}
        <em>per 1</em>.
      </p>

      <Figure caption="Divide the ratio down to one apple to find the unit rate.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-1 text-2xl">
            {Array.from({ length: items }, (_, i) => <span key={i}>🍎</span>)}
          </div>

          <div className="font-mono text-2xl font-black">${cost} for {items} apple{items === 1 ? "" : "s"}</div>
          <span className="text-[var(--ink-faint)]">↓ divide both by {items}</span>
          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-3xl font-black" style={{ color: ACCENT }}>${rate.toFixed(2)} per apple</div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">{cost} ÷ {items} = {rate.toFixed(2)}</div>
          </div>

          <p className="m-0 text-center text-[15px] text-[var(--ink-soft)]">
            So {items} apple{items === 1 ? "" : "s"} cost ${cost}, and each apple is ${rate.toFixed(2)}. At that rate, {items * 2} apples would be ${(rate * items * 2).toFixed(2)}.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Total cost ($)" value={cost} min={1} max={30} onChange={setCost} />
            <Stepper label="Apples" value={items} min={1} max={10} onChange={setItems} />
          </div>
        </div>
      </Figure>

      <h2>Per one</h2>
      <p>
        The ratio {cost}:{items} and the unit rate {rate.toFixed(2)}:1 describe the
        same relationship. The unit rate is the most useful form for comparing
        prices, speeds, and any &ldquo;per&rdquo; quantity.
      </p>

      <MathCheck>
        <p>
          A <strong>unit rate</strong>{" "}is the value a/b associated with a ratio
          a : b, giving the amount of the first quantity per <em>one</em>{" "}of the
          second (6.RP.A.2). Here ${cost} for {items} apple{items === 1 ? "" : "s"} is a unit rate of{" "}
          {cost} ÷ {items} = ${rate.toFixed(2)} per apple. Unit rates make it easy
          to compare and scale ratios.
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
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
