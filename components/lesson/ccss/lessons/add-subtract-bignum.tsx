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

  const top = a;
  const bot = b;
  const exact = op === "add" ? a + b : a - b;
  const estimate = op === "add" ? round100(top) + round100(bot) : round100(top) - round100(bot);
  const estimateGap = Math.abs(exact - estimate);
  const smallDifferenceWarning = op === "sub" && exact > 0 && estimateGap > exact / 2;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The standard algorithm works for numbers of <strong>any size</strong>{" "}—
        just keep the places lined up. And a quick <strong>estimate</strong>{" "}
        (round, then add or subtract) gives a scale check for your exact answer.
      </p>

      <Figure caption="Estimate first with rounded numbers, then compute the exact answer and compare.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {(["add", "sub"] as const).map((o) => (
              <button key={o} type="button" onClick={() => {
                setOp(o);
                if (o === "sub" && a < b) {
                  setA(b);
                  setB(a);
                }
              }} aria-pressed={op === o} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={op === o ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o === "add" ? "Add" : "Subtract"}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 px-6 py-4 text-center" style={{ borderColor: EST }}>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: EST }}>Estimate</div>
              <div className="font-mono text-sm text-[var(--ink-soft)]">{round100(top).toLocaleString()} {op === "add" ? "+" : "−"} {round100(bot).toLocaleString()}</div>
              <div className="font-mono text-2xl font-black" style={{ color: EST }}>= {estimate.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border-2 px-6 py-4 text-center" style={{ borderColor: ACCENT }}>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Exact</div>
              <div className="font-mono text-sm text-[var(--ink-soft)]">{top.toLocaleString()} {op === "add" ? "+" : "−"} {bot.toLocaleString()}</div>
              <div className="font-mono text-2xl font-black" style={{ color: ACCENT }}>= {exact.toLocaleString()}</div>
            </div>
          </div>

          <p className="m-0 max-w-lg text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            The estimate and exact answer are {estimateGap.toLocaleString()} apart.
            Rounding each input to the nearest hundred can change it by up to 50,
            so the final sum or difference can be up to 100 away.
            {smallDifferenceWarning && <> Because the exact difference is small compared with the inputs, round to a finer place for a more useful check.</>}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First" value={a} min={op === "sub" ? b : 1000} onChange={setA} />
            <Stepper label="Second" value={b} max={op === "sub" ? a : 9999} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Estimate to check</h2>
      <p>
        Rounding {top.toLocaleString()} and {bot.toLocaleString()} to the nearest
        hundred gives a quick estimate of {estimate.toLocaleString()}. The exact
        answer {exact.toLocaleString()} is {estimateGap.toLocaleString()} away,
        which is within the 100-unit error bound for rounding two inputs to the
        nearest hundred.{smallDifferenceWarning && <> Here that gap is large compared with the exact difference, so rounding to the nearest ten would make a sharper check.</>}
      </p>

      <MathCheck>
        <p>
          Fluently adding and subtracting multi-digit whole numbers with the{" "}
          <strong>standard algorithm</strong>{" "}(4.NBT.B.4) means aligning places
          and regrouping across as many columns as needed. Pairing it with an{" "}
          <strong>estimate</strong>{" "}({estimate.toLocaleString()}) gives a scale
          check for the exact result ({exact.toLocaleString()}). Its usefulness
          depends on the rounding place: rounding two inputs to the nearest
          hundred can change a resulting sum or difference by at most 100.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min = 1000, max = 9999, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(value - 100)} disabled={value - 100 < min} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold disabled:opacity-40" aria-label={`Decrease ${label} by 100`}>−100</button>
        <button type="button" onClick={() => set(value - 1)} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label} by 1`}>−</button>
        <span className="w-16 text-center text-xl font-black tabular-nums">{value.toLocaleString()}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label} by 1`}>+</button>
        <button type="button" onClick={() => set(value + 100)} disabled={value + 100 > max} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold disabled:opacity-40" aria-label={`Increase ${label} by 100`}>+100</button>
      </div>
    </div>
  );
}
