"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";

export default function Lesson() {
  const [a, setA] = useState(23);
  const [b, setB] = useState(45);

  const aT = Math.floor(a / 10) * 10, aO = a % 10;
  const bT = Math.floor(b / 10) * 10, bO = b % 10;
  const cells = [
    [aT * bT, aT * bO],
    [aO * bT, aO * bO],
  ];
  const parts = [cells[0][0], cells[0][1], cells[1][0], cells[1][1]];
  const total = a * b;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To multiply two-digit numbers, break each into <strong>tens and ones</strong>{" "}
        and multiply the pieces — the <strong>area model</strong>. The four
        rectangles are the <strong>partial products</strong>; add them for the
        answer.
      </p>

      <Figure caption="Each rectangle is tens or ones of one factor times the other. Add all four.">
        <div className="flex flex-col items-center gap-6">
          <div className="font-mono text-2xl font-black">{a} × {b} = ?</div>

          <div className="inline-grid" style={{ gridTemplateColumns: "2rem 1fr 1fr", gridTemplateRows: "1.6rem 1fr 1fr" }}>
            <div />
            <div className="grid place-items-center text-sm font-bold" style={{ color: "var(--band-middle)" }}>{bT}</div>
            <div className="grid place-items-center text-sm font-bold" style={{ color: "var(--band-early)" }}>{bO}</div>
            <div className="grid place-items-center text-sm font-bold" style={{ color: "var(--band-middle)" }}>{aT}</div>
            <Cell value={cells[0][0]} />
            <Cell value={cells[0][1]} />
            <div className="grid place-items-center text-sm font-bold" style={{ color: "var(--band-early)" }}>{aO}</div>
            <Cell value={cells[1][0]} />
            <Cell value={cells[1][1]} />
          </div>

          <div className="text-center">
            <div className="font-mono text-[15px] text-[var(--ink-soft)]">
              {parts.join(" + ")} = <strong style={{ color: ACCENT }}>{total.toLocaleString()}</strong>
            </div>
            <div className="mt-1 font-mono text-2xl font-black">{a} × {b} = <span style={{ color: ACCENT }}>{total.toLocaleString()}</span></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="First" value={a} onChange={setA} />
            <Stepper label="Second" value={b} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Four easy products</h2>
      <p>
        Splitting {a} into {aT} + {aO} and {b} into {bT} + {bO} turns one hard
        multiplication into four easy ones. That is the distributive property
        doing the heavy lifting.
      </p>

      <MathCheck>
        <p>
          Multiplying two-digit numbers (and up to four-digit by one-digit) uses
          place value and the properties of operations (4.NBT.B.5). The area model
          shows the <strong>distributive property</strong>: {a} × {b} = ({aT} + {aO}) × ({bT} + {bO}) = {parts.join(" + ")} = {total.toLocaleString()}. Partial products are just these four pieces added up.
        </p>
      </MathCheck>
    </div>
  );
}

function Cell({ value }: { value: number }) {
  return (
    <div className="grid h-16 min-w-[4rem] place-items-center border-2 border-[var(--line)] bg-[color-mix(in_oklab,var(--band-upper)_8%,var(--surface))] font-mono text-lg font-black">
      {value.toLocaleString()}
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(11, Math.min(99, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 11} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 99} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
