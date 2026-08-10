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
  const additionComparison = pab === 0
    ? "No overlap, so direct addition gives the exact union probability."
    : `Direct addition gives ${naive}, which is too big by ${r2(pab / 100)} because it counts the overlap twice.`;
  const eventsOverlap = pab > 0;
  const circleACenterX = eventsOverlap ? 95 : 62;
  const circleBCenterX = eventsOverlap ? 150 : 178;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        What&apos;s the chance of A <strong>or</strong>{" "}B? If the events overlap,
        adding P(A) + P(B) alone counts that overlap twice. The <strong>Addition
        Rule</strong>{" "}handles both overlapping and mutually exclusive events:
        {" "}<strong>P(A or B) = P(A) + P(B) − P(A and B)</strong>.
      </p>

      <Figure caption={eventsOverlap
        ? "Add the two overlapping events, then subtract the double-counted intersection."
        : "The separated circles show mutually exclusive events, so their probabilities add directly."}>
        <div className="flex flex-col items-center gap-6">
          <svg
            width={240}
            height={150}
            viewBox="0 0 240 150"
            role="img"
            aria-label={eventsOverlap
              ? `Events A and B overlap: P(A) is ${pa}%, P(B) is ${pb}%, and P(A intersection B) is ${pab}%.`
              : `Events A and B are mutually exclusive: P(A) is ${pa}%, P(B) is ${pb}%, and their intersection is empty.`}
          >
            <circle cx={circleACenterX} cy={75} r={55} fill={ACCENT} fillOpacity={0.3} stroke={ACCENT} strokeWidth={2} />
            <circle cx={circleBCenterX} cy={75} r={45} fill="var(--band-upper)" fillOpacity={0.3} stroke="var(--band-upper)" strokeWidth={2} />
            <text x={circleACenterX - 25} y={80} fontSize={13} fontWeight={800} fill={ACCENT}>A</text>
            <text x={circleBCenterX + 15} y={80} fontSize={13} fontWeight={800} fill="var(--band-upper)">B</text>
            {eventsOverlap && (
              <text x={(circleACenterX + circleBCenterX) / 2} y={80} textAnchor="middle" fontSize={10} fill="var(--ink)">A∩B</text>
            )}
          </svg>

          <div className="rounded-2xl border-2 px-8 py-3 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-sm text-[var(--ink-soft)]">P(A) + P(B) − P(A∩B)</div>
            <div className="mt-1 text-lg font-black">{r2(pa / 100)} + {r2(pb / 100)} − {r2(pab / 100)} = <span style={{ color: ACCENT }}>{pOr}</span></div>
            <div className="mt-1 text-xs text-[var(--ink-faint)]">({additionComparison})</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* The intersection is bounded on BOTH sides:
                  max(0, P(A) + P(B) − 1) ≤ P(A∩B) ≤ min(P(A), P(B)).
                An earlier pass enforced only the upper bound, so raising both
                marginals to 90 while the intersection stayed at 20 produced
                P(A∪B) = 1.6 — a probability above 1. */}
            <Stepper label="P(A) %" value={pa} min={10} max={90} onChange={(v) => { setPa(v); setPab((x) => Math.max(Math.max(0, v + pb - 100), Math.min(x, v, pb))); }} />
            <Stepper label="P(B) %" value={pb} min={10} max={90} onChange={(v) => { setPb(v); setPab((x) => Math.max(Math.max(0, pa + v - 100), Math.min(x, pa, v))); }} />
            <Stepper label="P(A∩B) %" value={pab} min={Math.max(0, pa + pb - 100)} max={Math.min(pa, pb)} onChange={setPab} />
          </div>
        </div>
      </Figure>

      <h2>Correct for any overlap</h2>
      <p>
        When A and B overlap, shading A and then shading B colors the intersection
        twice. Adding P(A) + P(B) likewise double-counts that shared part, so subtract
        P(A and B) once. If the events are <strong>mutually exclusive</strong>{" "}(no
        overlap, P(A and B) = 0), the rule simplifies to P(A or B) = P(A) + P(B).
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
