"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";
import {
  relationForDisplayedValue,
  spokenRelationForDisplayedValue,
} from "@/components/lesson/ccss/numberPresentation";

const ACCENT = "var(--band-upper)";
const PAD = 50;
const LWIDTH = 380;
// work in thousandths (integers). place values in thousandths:
const PLACES: [number, string, number][] = [[1000, "whole", 0], [100, "tenth", 1], [10, "hundredth", 2]];

function dec(th: number, digits: number) {
  return (th / 1000).toFixed(digits);
}

export default function Lesson() {
  const [v, setV] = useState(3472); // thousandths -> 3.472
  const [place, setPlace] = useState(100);

  const lower = Math.floor(v / place) * place;
  const upper = lower + place;
  const mid = lower + place / 2;
  const rounded = v - lower >= place / 2 ? upper : lower;
  const digits = PLACES.find(([p]) => p === place)![2];
  const exactDisplay = dec(v, 3);
  const roundedDisplay = dec(rounded, digits);
  const roundingRelation = relationForDisplayedValue(v / 1000, roundedDisplay);
  const roundingSpokenRelation = spokenRelationForDisplayedValue(v / 1000, roundedDisplay);
  const px = PAD + ((v - lower) / place) * LWIDTH;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Decimals round just like whole numbers — to the nearest{" "}
        <strong>whole</strong>, <strong>tenth</strong>, or <strong>hundredth</strong>.
        Find the two values it sits between, then pick the closer one.
      </p>

      <Figure caption="Choose a place. The decimal snaps to whichever neighbor is nearer.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {PLACES.map(([p, name]) => (
              <button key={p} type="button" onClick={() => setPlace(p)} aria-pressed={place === p} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={place === p ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>nearest {name}</button>
            ))}
          </div>

          <FigureScroll>
            <svg width={LWIDTH + 2 * PAD} height={90} viewBox={`0 0 ${LWIDTH + 2 * PAD} 90`} className="mx-auto" role="img" aria-label={`${dec(v, 3)} between ${dec(lower, digits)} and ${dec(upper, digits)}`}>
              <line x1={PAD} y1={55} x2={PAD + LWIDTH} y2={55} stroke="var(--ink-soft)" strokeWidth={2} />
              {[[lower, PAD], [upper, PAD + LWIDTH]].map(([val, xx], i) => (
                <g key={i}>
                  <line x1={xx} y1={48} x2={xx} y2={62} stroke="var(--ink)" strokeWidth={2} />
                  <text x={xx} y={80} textAnchor="middle" fontSize={13} fontWeight={800} fill={rounded === val ? ACCENT : "var(--ink-soft)"} fontFamily="var(--font-mono)">{dec(val, digits)}</text>
                </g>
              ))}
              <line x1={PAD + LWIDTH / 2} y1={40} x2={PAD + LWIDTH / 2} y2={62} stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={PAD + LWIDTH / 2} y={34} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{dec(mid, 3)}</text>
              <circle cx={px} cy={55} r={7} fill={ACCENT} stroke="white" strokeWidth={2} />
              <text x={px} y={22} textAnchor="middle" fontSize={14} fontWeight={800} fill={ACCENT} fontFamily="var(--font-mono)">{dec(v, 3)}</text>
            </svg>
          </FigureScroll>

          <div className="text-center">
            <div className="font-mono text-2xl font-black" aria-label={`${exactDisplay} rounds to ${roundedDisplay}`}>{exactDisplay} → <span style={{ color: ACCENT }}>{roundedDisplay}</span></div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">rounded to the nearest {PLACES.find(([p]) => p === place)![1]}</div>
          </div>

          <Stepper label="Decimal" value={v} onChange={setV} />
        </div>
      </Figure>

      <h2>Look at the next digit</h2>
      <p>
        To round to a place, check the digit just to its right. Here {exactDisplay}{" "}
        rounds to {roundedDisplay} because it is {v - lower >= place / 2 ? "at or past" : "below"} the
        halfway point {dec(mid, 3)}.
      </p>

      <MathCheck>
        <p>
          Rounding decimals to any place (5.NBT.A.4) uses place-value reasoning:
          find the two multiples of that place the number lies between, compare to
          the halfway point ({dec(mid, 3)}), and take the nearer one — rounding up
          at the halfway mark. So <span aria-label={`${exactDisplay} ${roundingSpokenRelation} ${roundedDisplay}`}>{exactDisplay} {roundingRelation} {roundedDisplay}</span>.
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
        <button type="button" onClick={() => set(value - 100)} disabled={value - 100 < 0} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs font-bold disabled:opacity-40" aria-label={`Decrease ${label} by one tenth`}>−0.1</button>
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 0} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-16 text-center font-mono text-lg font-black tabular-nums">{(value / 1000).toFixed(3)}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 9999} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
        <button type="button" onClick={() => set(value + 100)} disabled={value + 100 > 9999} className="h-9 w-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs font-bold disabled:opacity-40" aria-label={`Increase ${label} by one tenth`}>+0.1</button>
      </div>
    </div>
  );
}
