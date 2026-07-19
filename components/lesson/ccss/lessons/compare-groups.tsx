"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A_COLOR = "var(--band-early)";
const B_COLOR = "var(--band-middle)";

export default function Lesson() {
  const [a, setA] = useState(6);
  const [b, setB] = useState(4);

  const rel = a > b ? "greater than" : a < b ? "less than" : "equal to";
  const symbol = a > b ? ">" : a < b ? "<" : "=";
  const bigger = Math.max(a, b);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Which group has <strong>more</strong>? Line the groups up and match them
        one to one. Whichever group has some left over is the{" "}
        <strong>greater</strong>{" "}one.
      </p>

      <Figure caption="Each row matches one dot to one dot. Left-over dots show the group that has more.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-start justify-center gap-10">
            <DotColumn count={a} color={A_COLOR} max={bigger} label={a} />
            <DotColumn count={b} color={B_COLOR} max={bigger} label={b} />
          </div>

          <div className="text-center">
            <div className="font-mono text-4xl font-black">
              <span style={{ color: A_COLOR }}>{a}</span>{" "}
              <span>{symbol}</span>{" "}
              <span style={{ color: B_COLOR }}>{b}</span>
            </div>
            <p className="mt-1 text-lg font-bold">
              {a} is <strong>{rel}</strong>{" "}{b}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First group" value={a} color={A_COLOR} onChange={setA} />
            <Stepper label="Second group" value={b} color={B_COLOR} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>More, fewer, or the same</h2>
      <p>
        When both groups match up with none left over, they are{" "}
        <strong>equal</strong>. When one group has extra, it is{" "}
        <strong>greater</strong>{" "}— and the other is <strong>less</strong>.
      </p>

      <MathCheck>
        <p>
          Matching objects one-to-one shows whether one group is{" "}
          <strong>greater than, less than, or equal to</strong>{" "}another
          (K.CC.C.6). The same comparison works on the written numerals:{" "}
          <strong>{a} {symbol} {b}</strong>{" "}(K.CC.C.7). A number is greater
          exactly when you say it <em>later</em>{" "}while counting.
        </p>
      </MathCheck>
    </div>
  );
}

function DotColumn({ count, color, max, label }: { count: number; color: string; max: number; label: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col-reverse gap-1.5">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className="h-7 w-7 rounded-full border-2"
            style={{
              background: i < count ? color : "transparent",
              borderColor: i < count ? color : "var(--line)",
              opacity: i < count ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <span className="text-2xl font-black tabular-nums" style={{ color }}>{label}</span>
    </div>
  );
}

function Stepper({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Fewer ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(10, value + 1))} disabled={value >= 10} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`More ${label}`}>+</button>
      </div>
    </div>
  );
}
