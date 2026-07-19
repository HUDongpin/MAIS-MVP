"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const TENTH = "var(--band-middle)";
const HUND = "var(--band-upper)";

export default function Lesson() {
  const [tenths, setTenths] = useState(3);
  const [hund, setHund] = useState(4);

  const tenthAsHund = tenths * 10;
  const total = tenthAsHund + hund;

  // shade first tenthAsHund cells (reading order) as tenths, next `hund` as hundredths
  const color = (i: number) => (i < tenthAsHund ? TENTH : i < total ? HUND : null);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Tenths and hundredths are family: <strong>1 tenth = 10 hundredths</strong>.
        So to add <strong>{tenths}/10 + {hund}/100</strong>, first rename the
        tenths as hundredths, then add.
      </p>

      <Figure caption="The big square is one whole = 100 hundredths. Each column is one tenth.">
        <div className="flex flex-col items-center gap-6">
          <div className="grid gap-px rounded border-2 border-[var(--ink-soft)] p-px" style={{ gridTemplateColumns: "repeat(10, 1.35rem)" }}>
            {Array.from({ length: 100 }, (_, i) => (
              <div key={i} style={{ width: "1.35rem", height: "1.35rem", background: color(i) ?? "var(--surface-2)" }} />
            ))}
          </div>

          <div className="text-center">
            <div className="font-mono text-xl font-black">
              <span style={{ color: TENTH }}>{tenths}/10</span> + <span style={{ color: HUND }}>{hund}/100</span>
            </div>
            <div className="mt-1 font-mono text-[15px] text-[var(--ink-soft)]">
              = <span style={{ color: TENTH }}>{tenthAsHund}/100</span> + <span style={{ color: HUND }}>{hund}/100</span> = <strong>{total}/100</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Tenths" value={tenths} min={0} max={9} color={TENTH} onChange={(v) => { setTenths(v); }} />
            <Stepper label="Hundredths" value={hund} min={0} max={9} color={HUND} onChange={setHund} />
          </div>
        </div>
      </Figure>

      <h2>Rename, then add</h2>
      <p>
        You cannot add tenths and hundredths directly — the pieces are different
        sizes. Renaming {tenths}/10 as {tenthAsHund}/100 makes every piece a
        hundredth, so {tenthAsHund}/100 + {hund}/100 = {total}/100.
      </p>

      <MathCheck>
        <p>
          Adding fractions with denominators 10 and 100 (4.NF.C.5) uses equivalent
          fractions: because 1/10 = 10/100, you rewrite {tenths}/10 as{" "}
          {tenthAsHund}/100 and then add like denominators: {tenthAsHund}/100 + {hund}/100 = {total}/100. This is the groundwork for decimals.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
