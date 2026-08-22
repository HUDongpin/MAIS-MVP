"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const LIN = "var(--band-middle)";
const EXP = "var(--band-high)";

export default function Lesson() {
  const [start, setStart] = useState(100); // both start here
  const [addRate, setAddRate] = useState(20); // linear: +20/yr
  const [mulRate, setMulRate] = useState(10); // exponential: +10%/yr

  const lin = (t: number) => start + addRate * t;
  const factor = 1 + mulRate / 100;
  const exp = (t: number) => Math.round(start * Math.pow(factor, t));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two savings plans start with ${start}. One <strong>adds</strong>{" "}a fixed
        amount each year (linear); the other <strong>multiplies</strong>{" "}by a fixed
        percent (exponential). From a description or a table, you can construct the
        function — and read what each number means.
      </p>

      <Figure caption="Linear: y = start + rate·t. Exponential: y = start·(1 + r)ᵗ. Build both from the description.">
        <div className="flex flex-col items-center gap-6">
          <div className="grid w-full max-w-lg grid-cols-2 gap-4">
            <div className="rounded-xl border-2 p-3 text-center" style={{ borderColor: LIN }}>
              <div className="text-xs font-bold uppercase" style={{ color: LIN }}>Linear (adds)</div>
              <div className="font-mono font-black">y = {start} + {addRate}t</div>
            </div>
            <div className="rounded-xl border-2 p-3 text-center" style={{ borderColor: EXP }}>
              <div className="text-xs font-bold uppercase" style={{ color: EXP }}>Exponential (×)</div>
              <div className="font-mono font-black">y = {start}·{(factor).toFixed(2)}ᵗ</div>
            </div>
          </div>

          <table className="mx-auto w-max max-w-none self-start font-mono text-sm">
            <thead>
              <tr className="text-[var(--ink-faint)]">
                <th className="px-3 py-1">year t</th>
                {[0, 1, 2, 3, 4, 5].map((t) => <th key={t} className="px-3 py-1">{t}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr style={{ color: LIN }}><td className="px-3 font-bold">linear</td>{[0, 1, 2, 3, 4, 5].map((t) => <td key={t} className="px-3">{lin(t)}</td>)}</tr>
              <tr style={{ color: EXP }}><td className="px-3 font-bold">exp.</td>{[0, 1, 2, 3, 4, 5].map((t) => <td key={t} className="px-3">{exp(t)}</td>)}</tr>
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="start ($)" value={start} min={50} max={200} step={10} color={LIN} onChange={setStart} />
            <Stepper label="+ per year" value={addRate} min={5} max={40} step={5} color={LIN} onChange={setAddRate} />
            <Stepper label="% per year" value={mulRate} min={5} max={30} step={5} color={EXP} onChange={setMulRate} />
          </div>
        </div>
      </Figure>

      <h2>What the parameters mean</h2>
      <p>
        In the linear model, {start} is the starting balance and {addRate} is the
        constant yearly increase. In the exponential model, {start} is again the
        start, and {(factor).toFixed(2)} is the <strong>growth factor</strong>{" "}
        (a {mulRate}% rise). Reading these parameters in context is how you turn a
        formula back into a story.
      </p>

      <MathCheck>
        <p>
          <strong>Constructing</strong>{" "}linear and exponential functions from a
          description, a table, or two points (F-LE.2): linear from a constant{" "}
          <em>difference</em>, exponential from a constant <em>ratio</em>. And{" "}
          <strong>interpreting the parameters</strong>{" "}in context (F-LE.5) — the
          initial value, the rate of change, and the growth factor — closes the loop
          between algebra and the situation.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step, color, onChange }: { label: string; value: number; min: number; max: number; step: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
