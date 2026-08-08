"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const ACCENT = "var(--band-upper)";
const PAD = 46;
const LWIDTH = 400;
const PLACES: [number, string][] = [[10, "ten"], [100, "hundred"], [1000, "thousand"]];

export default function Lesson() {
  const [n, setN] = useState(3472);
  const [place, setPlace] = useState(100);

  const lower = Math.floor(n / place) * place;
  const upper = lower + place;
  const mid = lower + place / 2;
  const rounded = n - lower >= place / 2 ? upper : lower;
  const px = PAD + ((n - lower) / place) * LWIDTH;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        You can round to <strong>any place</strong>{" "}— tens, hundreds, or
        thousands. The idea never changes: find the two multiples the number sits
        between, then choose the <strong>closer</strong>{" "}one.
      </p>

      <Figure caption="Pick a place to round to. The number snaps to whichever multiple is nearer.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {PLACES.map(([p, name]) => (
              <button key={p} type="button" onClick={() => setPlace(p)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={place === p ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>nearest {name}</button>
            ))}
          </div>

          <FigureScroll>
            <svg width={LWIDTH + 2 * PAD} height={90} viewBox={`0 0 ${LWIDTH + 2 * PAD} 90`} className="mx-auto" role="img" aria-label={`${n} between ${lower} and ${upper}`}>
              <line x1={PAD} y1={55} x2={PAD + LWIDTH} y2={55} stroke="var(--ink-soft)" strokeWidth={2} />
              {[[lower, PAD], [upper, PAD + LWIDTH]].map(([val, xx], i) => (
                <g key={i}>
                  <line x1={xx} y1={48} x2={xx} y2={62} stroke="var(--ink)" strokeWidth={2} />
                  <text x={xx} y={80} textAnchor="middle" fontSize={13} fontWeight={800} fill={rounded === val ? ACCENT : "var(--ink-soft)"} fontFamily="var(--font-mono)">{val.toLocaleString()}</text>
                </g>
              ))}
              <line x1={PAD + LWIDTH / 2} y1={40} x2={PAD + LWIDTH / 2} y2={62} stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={PAD + LWIDTH / 2} y={34} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{mid.toLocaleString()}</text>
              <circle cx={px} cy={55} r={7} fill={ACCENT} stroke="white" strokeWidth={2} />
              <text x={px} y={22} textAnchor="middle" fontSize={14} fontWeight={800} fill={ACCENT} fontFamily="var(--font-mono)">{n.toLocaleString()}</text>
            </svg>
          </FigureScroll>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">{n.toLocaleString()} → <span style={{ color: ACCENT }}>{rounded.toLocaleString()}</span></div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">rounded to the nearest {PLACES.find(([p]) => p === place)![1]}</div>
          </div>

          <Stepper label="Number" value={n} onChange={setN} />
        </div>
      </Figure>

      <h2>Look at the next digit</h2>
      <p>
        A shortcut: to round to a place, look at the digit just to its{" "}
        <strong>right</strong>. If it is 5 or more, round up; if it is 4 or less,
        round down. Here {n.toLocaleString()} rounds to {rounded.toLocaleString()}.
      </p>

      <MathCheck>
        <p>
          Rounding a multi-digit whole number to <strong>any place</strong>{" "}
          (4.NBT.A.3) uses place-value understanding: locate the two multiples of
          that place the number lies between, compare with the halfway point{" "}
          ({mid.toLocaleString()}), and choose the nearer one — rounding up at the
          halfway mark.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(9999, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(value - 100)} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold" aria-label={`Decrease ${label} by 100`}>−100</button>
        <button type="button" onClick={() => set(value - 1)} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-16 text-center text-xl font-black tabular-nums">{value.toLocaleString()}</span>
        <button type="button" onClick={() => set(value + 1)} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold" aria-label={`Increase ${label}`}>+</button>
        <button type="button" onClick={() => set(value + 100)} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold" aria-label={`Increase ${label} by 100`}>+100</button>
      </div>
    </div>
  );
}
