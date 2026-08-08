"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const COLORS = ["var(--band-middle)", "var(--band-upper)", "var(--band-early)"];
const NAMES = ["tenths", "hundredths", "thousandths"];

function digs(th: number) {
  return [Math.floor(th / 100) % 10, Math.floor(th / 10) % 10, th % 10];
}

export default function Lesson() {
  const [a, setA] = useState(475); // thousandths
  const [b, setB] = useState(472);

  const da = digs(a), db = digs(b);
  const strA = (a / 1000).toFixed(3), strB = (b / 1000).toFixed(3);
  const decideIdx = [0, 1, 2].find((i) => da[i] !== db[i]);
  const symbol = a > b ? ">" : a < b ? "<" : "=";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Decimals reach a third place: <strong>thousandths</strong>. Reading{" "}
        {strA} means {da[0]} tenths, {da[1]} hundredths, and {da[2]} thousandths.
        To compare, check place by place from the <strong>tenths</strong>{" "}down.
      </p>

      <Figure caption="Expanded form shows each place. Comparison is decided by the first place that differs.">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <div className="font-mono text-4xl font-black">{strA}</div>
            <div className="mt-2 font-mono text-[15px]">
              {da.map((d, i) => (
                <span key={i}>
                  <span style={{ color: COLORS[i] }}>{d}/{[10, 100, 1000][i]}</span>
                  {i < 2 && <span className="text-[var(--ink-faint)]"> + </span>}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full border-t border-[var(--line)] pt-4">
            <div className="flex items-center justify-center gap-4">
              <span className="font-mono text-3xl font-black" style={{ color: "var(--band-middle)" }}>{strA}</span>
              <span className="font-mono text-4xl font-black">{symbol}</span>
              <span className="font-mono text-3xl font-black" style={{ color: "var(--band-early)" }}>{strB}</span>
            </div>
            <p className="mt-2 text-center text-[15px] font-semibold text-[var(--ink-soft)]">
              {decideIdx === undefined ? "All three places match — the decimals are equal." : `First difference is in the ${NAMES[decideIdx]} place (${da[decideIdx]} vs ${db[decideIdx]}).`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First (0.___)" value={a} onChange={setA} />
            <Stepper label="Second (0.___)" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Line up the places</h2>
      <p>
        A tenth beats any number of hundredths or thousandths, so the tenths place
        decides first. Writing {strA} in expanded form as {da[0]}/10 + {da[1]}/100
        + {da[2]}/1000 shows exactly what each digit is worth.
      </p>

      <MathCheck>
        <p>
          Reading, writing, and comparing decimals to <strong>thousandths</strong>{" "}
          (5.NBT.A.3) uses place value and expanded form:{" "}
          {strA} = {da[0]}×(1/10) + {da[1]}×(1/100) + {da[2]}×(1/1000). Comparison is
          decided by the highest place where the digits differ — here, {strA} {symbol} {strB}.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(999, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(value - 10)} className="h-9 w-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold" aria-label={`Decrease ${label} by ten`}>−10</button>
        <button type="button" onClick={() => set(value - 1)} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-16 text-center font-mono text-lg font-black tabular-nums">{(value / 1000).toFixed(3)}</span>
        <button type="button" onClick={() => set(value + 1)} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Increase ${label}`}>+</button>
        <button type="button" onClick={() => set(value + 10)} className="h-9 w-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold" aria-label={`Increase ${label} by ten`}>+10</button>
      </div>
    </div>
  );
}
