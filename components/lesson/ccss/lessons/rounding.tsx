"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-upper)";
const PAD = 40;
const LWIDTH = 420;

export default function Lesson() {
  const [n, setN] = useState(63);
  const [base, setBase] = useState(10);

  const lower = Math.floor(n / base) * base;
  const upper = lower + base;
  const mid = lower + base / 2;
  const rounded = n - lower >= base / 2 ? upper : lower;
  const frac = (n - lower) / base; // 0..1 position
  const px = PAD + frac * LWIDTH;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        <strong>Rounding</strong>{" "}replaces a number with a nearby, tidier one.
        Find the two multiples it sits between, then pick the{" "}
        <strong>closer</strong>{" "}one. Exactly halfway? Round up.
      </p>

      <Figure caption="See which multiple the number is closer to. The dashed line is the halfway point.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {[10, 100].map((b) => (
              <button key={b} type="button" onClick={() => { setBase(b); setN((v) => Math.min(v, b === 10 ? 100 : 1000)); }} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={base === b ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>nearest {b}</button>
            ))}
          </div>

          <div className="w-full overflow-x-auto">
            <svg width={LWIDTH + 2 * PAD} height={90} viewBox={`0 0 ${LWIDTH + 2 * PAD} 90`} className="mx-auto" role="img" aria-label={`${n} between ${lower} and ${upper}`}>
              <line x1={PAD} y1={55} x2={PAD + LWIDTH} y2={55} stroke="var(--ink-soft)" strokeWidth={2} />
              {/* endpoints */}
              {[["lower", lower, PAD], ["upper", upper, PAD + LWIDTH]].map(([key, val, xx]) => (
                <g key={key as string}>
                  <line x1={xx as number} y1={48} x2={xx as number} y2={62} stroke="var(--ink)" strokeWidth={2} />
                  <text x={xx as number} y={80} textAnchor="middle" fontSize={13} fontWeight={800} fill={rounded === val ? ACCENT : "var(--ink-soft)"} fontFamily="var(--font-mono)">{val}</text>
                </g>
              ))}
              {/* midpoint */}
              <line x1={PAD + LWIDTH / 2} y1={40} x2={PAD + LWIDTH / 2} y2={62} stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={PAD + LWIDTH / 2} y={34} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{mid}</text>
              {/* the number */}
              <circle cx={px} cy={55} r={7} fill={ACCENT} stroke="white" strokeWidth={2} />
              <text x={px} y={22} textAnchor="middle" fontSize={14} fontWeight={800} fill={ACCENT} fontFamily="var(--font-mono)">{n}</text>
            </svg>
          </div>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">{n} rounds to <span style={{ color: ACCENT }}>{rounded}</span></div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">to the nearest {base}</div>
          </div>

          <Stepper label="Number" value={n} min={0} max={base === 10 ? 100 : 1000} onChange={setN} />
        </div>
      </Figure>

      <h2>Closer wins</h2>
      <p>
        {n} is between {lower} and {upper}. The halfway point is {mid}, and {n} is{" "}
        {n - lower >= base / 2 ? "at or past" : "below"} it — so {n} rounds to{" "}
        <strong>{rounded}</strong>.
      </p>

      <MathCheck>
        <p>
          Rounding a whole number to the nearest 10 or 100 (3.NBT.A.1) means
          choosing the multiple it is closest to on the number line. Compare the
          number to the <strong>halfway point</strong>{" "}({mid}); if it is at or
          past halfway, round up, otherwise round down. Rounding is what makes
          estimation quick and reliable.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const bump = max > 100 ? 10 : 1;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - bump))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-14 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + bump))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
