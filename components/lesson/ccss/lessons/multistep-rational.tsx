"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const STEP = "var(--band-middle)";
const FINAL = "var(--band-upper)";

export default function Lesson() {
  const [price, setPrice] = useState(12);
  const [qty, setQty] = useState(4);
  const [discount, setDiscount] = useState(25);
  const [people, setPeople] = useState(3);

  const subtotal = price * qty;
  const afterDiscount = subtotal * (1 - discount / 100);
  const perPerson = afterDiscount / people;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Real problems often need several steps with{" "}
        <strong>fractions, decimals, and percents</strong>{" "}all mixed together. The
        key is to take them <strong>one step at a time</strong>{" "}and estimate to
        check.
      </p>

      <Figure caption="Multiply, then take the discount, then divide. Each step feeds the next.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 max-w-md text-center text-lg font-semibold">
            {qty} pizzas cost ${price} each. A {discount}% off coupon applies. You
            split the bill among {people} friends. How much does each pay?
          </p>

          <div className="flex w-full max-w-sm flex-col gap-2">
            <StepRow n={1} label={`Subtotal: ${qty} × $${price}`} value={`$${subtotal.toFixed(2)}`} color={STEP} />
            <StepRow n={2} label={`After ${discount}% off: × ${(1 - discount / 100).toFixed(2)}`} value={`$${afterDiscount.toFixed(2)}`} color={STEP} />
            <StepRow n={3} label={`Split ${people} ways: ÷ ${people}`} value={`$${perPerson.toFixed(2)}`} color={FINAL} />
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: FINAL }}>
            <div className="text-xs font-bold uppercase text-[var(--ink-faint)]">each friend pays</div>
            <div className="font-mono text-3xl font-black" style={{ color: FINAL }}>${perPerson.toFixed(2)}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Stepper label="Price ($)" value={price} min={5} max={25} step={1} onChange={setPrice} />
            <Stepper label="Pizzas" value={qty} min={1} max={8} step={1} onChange={setQty} />
            <Stepper label="Discount %" value={discount} min={0} max={50} step={5} onChange={setDiscount} />
            <Stepper label="Friends" value={people} min={1} max={6} step={1} onChange={setPeople} />
          </div>
        </div>
      </Figure>

      <h2>One step at a time</h2>
      <p>
        Subtotal ${subtotal.toFixed(2)}, minus {discount}% is ${afterDiscount.toFixed(2)}, split {people} ways is ${perPerson.toFixed(2)} each. A quick
        estimate (about ${Math.round(subtotal)} → ${Math.round(afterDiscount)} → ${(afterDiscount / people).toFixed(0)}) confirms the answer is reasonable.
      </p>

      <MathCheck>
        <p>
          Solving multistep real-life problems with positive and negative
          rational numbers in any form (7.EE.B.3) means applying operations in a
          sensible order and using <strong>estimation</strong>{" "}to judge whether
          the answer makes sense. Here the chain is × then × (the discount factor)
          then ÷, giving ${perPerson.toFixed(2)} per person.
        </p>
      </MathCheck>
    </div>
  );
}

function StepRow({ n, label, value, color }: { n: number; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] px-4 py-2">
      <span className="grid h-6 w-6 place-items-center rounded-full text-xs font-black text-white" style={{ background: color }}>{n}</span>
      <span className="flex-1 font-mono text-sm text-[var(--ink-soft)]">{label}</span>
      <span className="font-mono text-lg font-black" style={{ color }}>{value}</span>
    </div>
  );
}

function Stepper({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-lg font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
