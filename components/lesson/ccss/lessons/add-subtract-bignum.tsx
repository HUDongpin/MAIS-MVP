"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
const EST = "var(--band-middle)";

const round100 = (n: number) => Math.round(n / 100) * 100;

export default function Lesson() {
  const [a, setA] = useState(3648);
  const [b, setB] = useState(1875);
  const [op, setOp] = useState<"add" | "sub">("add");

  const hi = Math.max(a, b), lo = Math.min(a, b);
  const top = op === "add" ? a : hi;
  const bot = op === "add" ? b : lo;
  const exact = op === "add" ? a + b : hi - lo;
  const estimate = op === "add" ? round100(top) + round100(bot) : round100(top) - round100(bot);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The standard algorithm works for numbers of <strong>any size</strong>{" "}—
        just keep the places lined up. And a quick <strong>estimate</strong>{" "}
        (round, then add or subtract) tells you whether your exact answer is
        reasonable.
      </p>

      <Figure caption="Estimate first with rounded numbers, then compute the exact answer and compare.">
        <div className="mx-auto flex w-max max-w-none self-start flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["add", "sub"] as const).map((o) => (
              <button key={o} type="button" onClick={() => setOp(o)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o === "add" ? "Add" : "Subtract"}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 px-6 py-4 text-center" style={{ borderColor: EST }}>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: EST }}>Estimate</div>
              <div className="font-mono text-sm text-[var(--ink-soft)]">{round100(top).toLocaleString()} {op === "add" ? "+" : "−"} {round100(bot).toLocaleString()}</div>
              <div className="font-mono text-2xl font-black" style={{ color: EST }}>≈ {estimate.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border-2 px-6 py-4 text-center" style={{ borderColor: ACCENT }}>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Exact</div>
              <div className="font-mono text-sm text-[var(--ink-soft)]">{top.toLocaleString()} {op === "add" ? "+" : "−"} {bot.toLocaleString()}</div>
              <div className="font-mono text-2xl font-black" style={{ color: ACCENT }}>= {exact.toLocaleString()}</div>
            </div>
          </div>

          <p className="m-0 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            The exact answer {exact.toLocaleString()} is close to the estimate {estimate.toLocaleString()} — so it is reasonable. ✓
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First" value={a} onChange={setA} />
            <Stepper label="Second" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Estimate to check</h2>
      <p>
        Rounding {top.toLocaleString()} and {bot.toLocaleString()} to the nearest
        hundred gives a quick estimate of {estimate.toLocaleString()}. Because the
        exact answer {exact.toLocaleString()} lands near it, you can trust you did
        not slip a digit.
      </p>

      <MathCheck>
        <p>
          Fluently adding and subtracting multi-digit whole numbers with the{" "}
          <strong>standard algorithm</strong>{" "}(4.NBT.B.4) means aligning places
          and regrouping across as many columns as needed. Pairing it with an{" "}
          <strong>estimate</strong>{" "}({estimate.toLocaleString()}) is how you judge
          whether the exact result ({exact.toLocaleString()}) is reasonable.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1000, Math.min(9999, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(value - 100)} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold" aria-label="minus 100">−100</button>
        <button type="button" onClick={() => set(value - 1)} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-16 text-center text-xl font-black tabular-nums">{value.toLocaleString()}</span>
        <button type="button" onClick={() => set(value + 1)} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Increase ${label}`}>+</button>
        <button type="button" onClick={() => set(value + 100)} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold" aria-label="plus 100">+100</button>
      </div>
    </div>
  );
}
