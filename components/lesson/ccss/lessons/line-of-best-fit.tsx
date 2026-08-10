"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const PAD = 40;
const GW = 300, GH = 220;
const W = GW + 2 * PAD, H = GH + 2 * PAD;
const DOT = "var(--band-middle)";
const LINE = "var(--band-upper)";

// hours studied vs test score
const DATA: [number, number][] = [[1, 55], [2, 60], [3, 72], [4, 75], [5, 82], [6, 85], [7, 92], [8, 95]];

export default function Lesson() {
  const [m, setM] = useState(6);
  const [b, setB] = useState(50);

  const sx = (x: number) => PAD + (x / 10) * GW;
  const sy = (y: number) => PAD + GH - (y / 100) * GH;
  const predict = (x: number) => m * x + b;
  // Only draw the stretch of the model that lies inside the 0–100 score frame.
  const lineFrom = Math.max(0, Math.min(10, (0 - b) / m));
  const lineTo = Math.max(0, Math.min(10, (100 - b) / m));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        When a scatter plot follows a rough line, you can <strong>fit a straight
        line</strong>{" "}through it. Its equation <strong>y = mx + b</strong>{" "}lets you
        make predictions — and the slope and intercept have real meaning.
      </p>

      <Figure caption="Adjust the line to run through the middle of the cloud. Then use it to predict.">
        <div className="flex flex-col items-center gap-6">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" style={{ maxHeight: 300 }} role="img" aria-label={`Scatter plot of study hours against score with a line of slope ${m} and intercept ${b} laid over it`}>
            {[0, 20, 40, 60, 80, 100].map((y) => (
              <g key={y}>
                <line x1={PAD} y1={sy(y)} x2={PAD + GW} y2={sy(y)} stroke="var(--line)" strokeWidth={1} />
                <text x={PAD - 6} y={sy(y) + 4} textAnchor="end" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{y}</text>
              </g>
            ))}
            {Array.from({ length: 11 }, (_, x) => (
              <text key={x} x={sx(x)} y={PAD + GH + 16} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{x}</text>
            ))}
            <line x1={PAD} y1={sy(0)} x2={PAD + GW} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={PAD} y1={sy(0)} x2={PAD} y2={sy(100)} stroke="var(--ink-soft)" strokeWidth={2} />
            {/* best-fit line */}
            {/* Clip the segment to where the model is inside the 0–100 frame,
                instead of clamping its endpoints' y — clamping bent the drawn
                line away from y = mx + b whenever it left the frame. */}
            <line x1={sx(lineFrom)} y1={sy(predict(lineFrom))} x2={sx(lineTo)} y2={sy(predict(lineTo))} stroke={LINE} strokeWidth={3} />
            {DATA.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={5} fill={DOT} />)}
            <text x={PAD + GW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">hours studied</text>
          </svg>

          <div className="rounded-xl bg-[var(--surface-2)] px-6 py-2 text-center">
            <div className="font-mono text-xl font-black" style={{ color: LINE }}>y = {m}x + {b}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">predicts a score of <strong>{predict(5)}</strong>{" "}for 5 hours of study</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* Scores run 0–100, so the controls must not let the model predict
                an impossible one: m = 9 with b = 60 read "predicts a score of
                105". At the new bounds the highest prediction at 5 hours is
                99, inside the score scale. */}
            <Stepper label="Slope m" value={m} min={2} max={9} onChange={setM} />
            <Stepper label="Intercept b" value={b} min={40} max={54} step={2} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>Slope and intercept mean something</h2>
      <p>
        The fitted slope <strong>{m}</strong>{" "}associates one additional hour of
        study with about {m} more predicted points. The intercept <strong>{b}</strong>{" "}is
        the model&apos;s predicted score with no studying. This observational pattern
        supports prediction, but by itself it does not show that extra study time
        causes the score increase.
      </p>

      <MathCheck>
        <p>
          Fitting a straight line to bivariate data (8.SP.A.2) captures its trend
          without matching every point. Using the equation of the model (8.SP.A.3),
          the <strong>slope</strong>{" "}is the rate of change (points per hour here) and
          the <strong>intercept</strong>{" "}is the value when x = 0 — both interpreted in
          the data&apos;s context to make predictions.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
