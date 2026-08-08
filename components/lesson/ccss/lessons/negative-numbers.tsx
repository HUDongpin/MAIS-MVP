"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const POS = "var(--band-upper)";
const NEG = "var(--band-early)";
const R = 10;
const STEP = 15;
const H = 2 * R * STEP + 40;

type Ctx = { key: string; label: string; unit: string; prefix?: boolean; up: string; down: string };
const CTXS: Ctx[] = [
  { key: "temp", label: "Temperature", unit: "°C", up: "above freezing", down: "below freezing" },
  { key: "elev", label: "Elevation", unit: " m", up: "above sea level", down: "below sea level" },
  { key: "money", label: "Bank balance", unit: "$", prefix: true, up: "savings", down: "debt" },
];

// The unit used to be appended to every context, which is right for "°C" and
// " m" but printed the Bank balance as "-6$" and "6$ debt".
const amount = (n: number, ctx: Ctx, sign: boolean) => {
  const s = sign ? (n > 0 ? "+" : n < 0 ? "−" : "") : "";
  const mag = `${Math.abs(n)}`;
  return ctx.prefix ? `${s}${ctx.unit}${mag}` : `${s}${mag}${ctx.unit}`;
};

export default function Lesson() {
  const [v, setV] = useState(6);
  const [ci, setCi] = useState(0);
  const ctx = CTXS[ci];
  const y = (n: number) => 20 + (R - n) * STEP;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Numbers go <strong>both ways</strong>{" "}from zero. Positive numbers count up
        from 0; <strong>negative numbers</strong>{" "}count down below it. They model{" "}
        <strong>opposite</strong>{" "}quantities — like above vs. below, or savings vs.
        debt.
      </p>

      <Figure caption="Zero is the reference point. The same size number can point up (+) or down (−).">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {CTXS.map((c, i) => (
              <button key={c.key} type="button" onClick={() => setCi(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={ci === i ? { background: "var(--band-middle)", color: "white", borderColor: "var(--band-middle)" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{c.label}</button>
            ))}
          </div>

          <div className="flex items-center gap-8">
            <svg width="120" height={H} viewBox={`0 0 120 ${H}`} role="img" aria-label={`number line at ${v}`}>
              <line x1={60} y1={20} x2={60} y2={H - 20} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: 2 * R + 1 }, (_, i) => {
                const n = R - i;
                return (
                  <g key={n}>
                    <line x1={55} y1={y(n)} x2={65} y2={y(n)} stroke={n === 0 ? "var(--ink)" : "var(--ink-soft)"} strokeWidth={n === 0 ? 2 : 1} />
                    {n % 2 === 0 && <text x={48} y={y(n) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{n}</text>}
                  </g>
                );
              })}
              <circle cx={60} cy={y(v)} r={7} fill={v >= 0 ? POS : NEG} stroke="white" strokeWidth={2} />
              <text x={78} y={y(v) + 4} fontSize={14} fontWeight={800} fill={v >= 0 ? POS : NEG} fontFamily="var(--font-mono)">{v > 0 ? "+" : ""}{v}</text>
            </svg>

            <div className="text-center">
              <div className="text-4xl font-black" style={{ color: v >= 0 ? POS : NEG }}>{amount(v, ctx, true)}</div>
              <p className="mt-1 max-w-[10rem] text-[15px] text-[var(--ink-soft)]">
                {v === 0 ? "right at zero" : v > 0 ? `${amount(v, ctx, false)} ${ctx.up}` : `${amount(v, ctx, false)} ${ctx.down}`}
              </p>
              <div className="mt-3 text-sm text-[var(--ink-faint)]">opposite: <span className="font-mono font-bold">{-v > 0 ? "+" : ""}{-v}</span></div>
            </div>
          </div>

          <input type="range" min={-R} max={R} value={v} onChange={(e) => setV(Number(e.target.value))} className="w-56 accent-[var(--band-middle)]" aria-label={`${ctx.label} value, ${amount(v, ctx, true)}`} />
        </div>
      </Figure>

      <h2>Opposites around zero</h2>
      <p>
        {v > 0 ? v : Math.abs(v)} and {v > 0 ? -v : v} are <strong>opposites</strong>{" "}—
        the same distance from 0 but in opposite directions. Their sum is 0. Zero
        itself is its own opposite and marks the boundary between positive and
        negative.
      </p>

      <MathCheck>
        <p>
          Positive and negative numbers describe quantities with{" "}
          <strong>opposite directions or values</strong>{" "}— temperature above/below
          zero, elevation above/below sea level, credit/debit (6.NS.C.5). Zero is
          the reference point, and every number has an <strong>opposite</strong>{" "}
          the same distance from 0 on the other side.
        </p>
      </MathCheck>
    </div>
  );
}
