"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [pa, setPa] = useState(50);
  const [pb, setPb] = useState(40);
  const [pab, setPab] = useState(20);

  const pOr = r2((pa + pb - pab) / 100);
  const naive = r2((pa + pb) / 100);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        What&apos;s the chance of A <strong>or</strong>{" "}B? You can&apos;t just add
        P(A) + P(B) — that counts the overlap twice. The <strong>Addition Rule</strong>{" "}
        fixes it: <strong>P(A or B) = P(A) + P(B) − P(A and B)</strong>.
      </p>

      <Figure caption="Add the two events, then subtract the double-counted intersection.">
        <div className="flex flex-col items-center gap-6">
          <svg width={240} height={150} viewBox="0 0 240 150" role="img" aria-label="union of two events">
            <circle cx={95} cy={75} r={55} fill={ACCENT} fillOpacity={0.3} stroke={ACCENT} strokeWidth={2} />
            <circle cx={150} cy={75} r={45} fill="var(--band-upper)" fillOpacity={0.3} stroke="var(--band-upper)" strokeWidth={2} />
            <text x={70} y={80} fontSize={13} fontWeight={800} fill={ACCENT}>A</text>
            <text x={165} y={80} fontSize={13} fontWeight={800} fill="var(--band-upper)">B</text>
            <text x={120} y={80} fontSize={10} fill="var(--ink)">A∩B</text>
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">P(A) + P(B) − P(A∩B)</div>
            <div className="mt-1 text-lg font-black">{r2(pa / 100)} + {r2(pb / 100)} − {r2(pab / 100)} = <span style={{ color: ACCENT }}>{pOr}</span></div>
            <div className="mt-1 text-xs text-[var(--ink-faint)]">(naively adding would give {naive} — too big by {r2(pab / 100)})</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* Re-clamp the intersection when P(A) or P(B) drops: capping it only
                in its own stepper let P(A∩B) exceed P(A), an impossible
                assignment that rendered "0.1 + 0.4 − 0.2 = 0.3". */}
            <Stepper label="P(A) %" value={pa} min={10} max={90} onChange={(v) => { setPa(v); setPab((x) => Math.min(x, v, pb)); }} />
            <Stepper label="P(B) %" value={pb} min={10} max={90} onChange={(v) => { setPb(v); setPab((x) => Math.min(x, pa, v)); }} />
            <Stepper label="P(A∩B) %" value={pab} min={0} max={Math.min(pa, pb)} onChange={setPab} />
          </div>
        </div>
      </Figure>

      <h2>Don&apos;t double-count the overlap</h2>
      <p>
        When you shade A and then shade B, the intersection gets colored twice. Adding
        P(A) + P(B) makes the same error, so you subtract P(A and B) once to correct
        it. If the events are <strong>mutually exclusive</strong>{" "}(no overlap, P(A and
        B) = 0), the rule simplifies to P(A or B) = P(A) + P(B).
      </p>

      <MathCheck>
        <p>
          The <strong>Addition Rule</strong>: P(A or B) = P(A) + P(B) − P(A and B)
          (S-CP.7). Subtracting the intersection corrects for double-counting the
          overlap; for <strong>mutually exclusive</strong>{" "}events the intersection is
          empty and the rule reduces to simple addition.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 5))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-10 text-center text-xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 5))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
