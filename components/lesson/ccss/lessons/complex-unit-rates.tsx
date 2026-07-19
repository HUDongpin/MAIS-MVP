"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function Lesson() {
  const [distN, setDistN] = useState(1);
  const [distD, setDistD] = useState(2);
  const [timeN, setTimeN] = useState(1);
  const [timeD, setTimeD] = useState(4);

  // rate = (distN/distD) / (timeN/timeD) = (distN*timeD)/(distD*timeN)
  const rn = distN * timeD, rd = distD * timeN;
  const g = gcd(rn, rd);
  const simN = rn / g, simD = rd / g;
  const rateStr = simD === 1 ? `${simN}` : `${simN}/${simD}`;
  const rateDec = rn / rd;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A unit rate can come from <strong>fractions</strong>. If you walk ½ mile
        in ¼ hour, how fast is that per <em>whole</em>{" "}hour? Divide the two
        fractions — a <strong>complex fraction</strong>.
      </p>

      <Figure caption="Divide distance by time. Dividing fractions means multiplying by the reciprocal.">
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 max-w-md text-center text-lg font-semibold">
            You walk <strong>{distN}/{distD}</strong>{" "}mile in <strong>{timeN}/{timeD}</strong>{" "}hour. What is your speed in miles per hour?
          </p>

          <div className="flex items-center gap-4 font-mono">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black">{distN}/{distD}</span>
              <div className="my-1 h-0.5 w-16 bg-[var(--ink)]" />
              <span className="text-2xl font-black">{timeN}/{timeD}</span>
            </div>
            <span className="text-2xl">=</span>
            <span className="text-xl">{distN}/{distD} × {timeD}/{timeN}</span>
            <span className="text-2xl">=</span>
            <span className="text-3xl font-black" style={{ color: ACCENT }}>{rateStr}</span>
          </div>

          <div className="rounded-2xl border-2 px-8 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-2xl font-black" style={{ color: ACCENT }}>{rateDec % 1 === 0 ? rateDec : rateDec.toFixed(2)} miles per hour</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <FracControl label="Distance (mi)" num={distN} den={distD} onNum={setDistN} onDen={setDistD} />
            <FracControl label="Time (hr)" num={timeN} den={timeD} onNum={setTimeN} onDen={setTimeD} />
          </div>
        </div>
      </Figure>

      <h2>Rates with fractions</h2>
      <p>
        &ldquo;Per hour&rdquo; means dividing by the time. Since the time is a
        fraction ({timeN}/{timeD}), you divide by it — flip and multiply. The
        result, {rateStr} mph, is the unit rate for one whole hour.
      </p>

      <MathCheck>
        <p>
          Computing unit rates from <strong>ratios of fractions</strong>{" "}
          (7.RP.A.1) is a complex-fraction division: ({distN}/{distD}) ÷ ({timeN}/{timeD}) = ({distN}/{distD}) × ({timeD}/{timeN}) = {rateStr}. The unit rate
          expresses the amount per <em>one</em>{" "}unit — here, miles per single hour.
        </p>
      </MathCheck>
    </div>
  );
}

function FracControl({ label, num, den, onNum, onDen }: { label: string; num: number; den: number; onNum: (v: number) => void; onDen: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}: {num}/{den}</span>
      <div className="flex items-center gap-3">
        <Mini label="numerator" value={num} min={1} max={den} onChange={onNum} />
        <span className="text-2xl text-[var(--ink-faint)]">/</span>
        <Mini label="denominator" value={den} min={2} max={8} onChange={onDen} />
      </div>
    </div>
  );
}

function Mini({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
      <span className="w-5 text-center text-lg font-black tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}
