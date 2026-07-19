"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const POS = "var(--band-upper)";
const NEG = "var(--band-early)";

export default function Lesson() {
  const [start, setStart] = useState(50);
  const [t1, setT1] = useState(-30);
  const [t2, setT2] = useState(15);

  const after1 = start + t1;
  const final = after1 + t2;

  const line = (label: string, value: number, running: number) => (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--line)] px-4 py-1.5 font-mono text-sm">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span style={{ color: value >= 0 ? POS : NEG }}>{value >= 0 ? "+" : "−"}${Math.abs(value)}</span>
      <span className="font-black">→ ${running}</span>
    </div>
  );

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Signed numbers describe real life: money in and out, temperatures rising
        and falling, going up and down. <strong>Adding a negative</strong>{" "}is a
        loss; <strong>adding a positive</strong>{" "}is a gain. Keep a running total.
      </p>

      <Figure caption="A deposit is positive; a withdrawal is negative. Track the balance after each.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 text-center text-lg font-semibold">Your account balance changes:</p>

          <div className="flex w-full max-w-sm flex-col gap-2">
            <div className="flex items-center justify-between gap-4 rounded-lg bg-[var(--surface-2)] px-4 py-1.5 font-mono text-sm">
              <span className="text-[var(--ink-soft)]">start</span>
              <span />
              <span className="font-black">${start}</span>
            </div>
            {line("transaction 1", t1, after1)}
            {line("transaction 2", t2, final)}
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: final >= 0 ? POS : NEG }}>
            <div className="text-xs font-bold uppercase text-[var(--ink-faint)]">final balance</div>
            <div className="font-mono text-3xl font-black" style={{ color: final >= 0 ? POS : NEG }}>${final}</div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">{start} + ({t1}) + ({t2}) = {final}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Start ($)" value={start} min={0} max={100} onChange={setStart} />
            <Stepper label="Transaction 1" value={t1} min={-60} max={60} onChange={setT1} />
            <Stepper label="Transaction 2" value={t2} min={-60} max={60} onChange={setT2} />
          </div>
        </div>
      </Figure>

      <h2>Positive and negative together</h2>
      <p>
        Starting with ${start}, a change of {t1 >= 0 ? "+" : ""}{t1} leaves ${after1},
        and then {t2 >= 0 ? "+" : ""}{t2} leaves ${final}. {final < 0 ? "A negative balance means the account is overdrawn." : "The balance stays positive."} The same
        adding of signed numbers models temperature, elevation, and more.
      </p>

      <MathCheck>
        <p>
          Solving real-world problems with all four operations on{" "}
          <strong>rational numbers</strong>{" "}(7.NS.A.3): deposits and withdrawals,
          rises and falls, are modeled by adding positive and negative values.
          Here {start} + ({t1}) + ({t2}) = {final}. A negative result is
          meaningful — it represents debt, a drop, or a position below zero.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(min, value - 5))} disabled={value <= min} className="h-9 w-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold disabled:opacity-40" aria-label={`Decrease ${label} by 5`}>−5</button>
        <span className="w-12 text-center text-xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 5))} disabled={value >= max} className="h-9 w-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold disabled:opacity-40" aria-label={`Increase ${label} by 5`}>+5</button>
      </div>
    </div>
  );
}
