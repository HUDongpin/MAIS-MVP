"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const G = "var(--band-upper)";
const XR = 4, YR = 8, PXX = 40, PXY = 18, PAD = 26;
const W = 2 * XR * PXX + 2 * PAD, H = 2 * YR * PXY + 2 * PAD;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  // f(x) = m x + b  vs  g(x) = x²... use g fixed parabola x²-? Keep f line, g = 2 (horizontal) or line.
  const [m, setM] = useState(1);
  const [b, setB] = useState(1);
  // g(x) = -x + 5 fixed second line for f(x)=g(x)
  const g = (x: number) => -x + 5;
  const f = (x: number) => m * x + b;

  // solve m x + b = -x + 5
  // Fold the sign into the operator instead of interpolating a raw negative:
  // the stepper reaches negatives, which rendered "+ -4" / "− -3".
  const addend = (n: number) => `${n < 0 ? "−" : "+"} ${Math.abs(n)}`;
  const denom = m + 1;
  // Round each coordinate from the EXACT intersection. Feeding the rounded
  // xstar back through f made the printed y disagree with both lines.
  const xExact = denom !== 0 ? (5 - b) / denom : NaN;
  const xstar = denom !== 0 ? r2(xExact) : NaN;
  const ystar = denom !== 0 ? r2(f(xExact)) : NaN;

  const sx = (x: number) => PAD + (x + XR) * PXX;
  // A pure affine map. Clamping y inside the mapper bent each line to a wrong
  // slope and intercept whenever it left the window instead of clipping it: at
  // m = 3, b = 5 the "f(x) = 3x + 5" line was drawn through (0, 0.5), and the
  // marked intersection lay on neither drawn line. The lines are clipped to the
  // plot rectangle instead.
  const sy = (y: number) => PAD + (YR - y) * PXY;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A graph is not a picture <em>of</em>{" "}an equation — it <strong>is</strong>{" "}
        the equation&apos;s solution set: every point on the curve makes it true.
        So where two graphs cross, both equations hold — that&apos;s why{" "}
        <strong>f(x) = g(x)</strong>{" "}at the intersection.
      </p>

      <Figure caption="Each line is all the (x, y) satisfying it. The crossing point solves f(x) = g(x).">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6 font-mono text-lg font-black">
            <span style={{ color: ACCENT }}>f(x) = {m}x {addend(b)}</span>
            <span style={{ color: G }}>g(x) = −x + 5</span>
          </div>

          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" style={{ maxHeight: 300 }} role="img" aria-label={denom !== 0 ? "two functions and their intersection" : "two parallel functions, no intersection"}>
            {Array.from({ length: 2 * XR + 1 }, (_, i) => i - XR).map((x) => (
              <line key={x} x1={sx(x)} y1={PAD} x2={sx(x)} y2={H - PAD} stroke="var(--line)" strokeWidth={1} />
            ))}
            <line x1={sx(-XR)} y1={sy(0)} x2={sx(XR)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            <defs>
              <clipPath id="gs-plot">
                <rect x={PAD} y={PAD} width={2 * XR * PXX} height={2 * YR * PXY} />
              </clipPath>
            </defs>
            <g clipPath="url(#gs-plot)">
              <line x1={sx(-XR)} y1={sy(f(-XR))} x2={sx(XR)} y2={sy(f(XR))} stroke={ACCENT} strokeWidth={2.5} />
              <line x1={sx(-XR)} y1={sy(g(-XR))} x2={sx(XR)} y2={sy(g(XR))} stroke={G} strokeWidth={2.5} />
            </g>
            {/* Bounds-check y as well as x, and clip like the lines: the marker
                used to be drawn outside the plot rectangle whenever the crossing
                fell above or below the window. */}
            {denom !== 0 && xstar >= -XR && xstar <= XR && ystar >= -YR && ystar <= YR && (
              <g clipPath="url(#gs-plot)">
                <circle cx={sx(xstar)} cy={sy(ystar)} r={6} fill="var(--ink)" stroke="white" strokeWidth={2} />
                <text x={sx(xstar)} y={sy(ystar) - 10} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-mono)">({xstar}, {ystar})</text>
              </g>
            )}
          </svg>

          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono text-sm" style={{ borderColor: ACCENT }}>
            {/* m = −1 is reachable, and there b = 5 makes the two functions
                IDENTICAL — coincident lines have infinitely many solutions, not
                none. Calling that "parallel — no solution" inverted the lesson's
                own thesis in the one state where the graphs fully agree. */}
            {denom !== 0
              ? <>solve {m}x {addend(b)} = −x + 5 → x = <strong style={{ color: ACCENT }}>{xstar}</strong></>
              : b === 5
                ? "same line — every x is a solution"
                : "parallel — no solution"}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="slope m" value={m} min={-3} max={3} onChange={setM} />
            <Stepper label="intercept b" value={b} min={-5} max={5} onChange={setB} />
          </div>
        </div>
      </Figure>

      <h2>The graph is the solution set</h2>
      <p>
        Pick any point on the f-line: its coordinates satisfy y = {m}x {addend(b)}. Points
        off the line don&apos;t. So a curve is a complete record of an equation&apos;s
        solutions. Two curves share a point exactly when some x makes{" "}
        <strong>f(x) = g(x)</strong>{" "}— found algebraically, graphically, or by a
        table, even for curves with no formula.
      </p>

      <MathCheck>
        <p>
          The <strong>graph of an equation</strong>{" "}in two variables is the set of
          all its solution points (A-REI.10). The x-coordinates where{" "}
          <strong>f(x) = g(x)</strong>{" "}are the solutions of that equation, i.e. the
          intersections of the two graphs (A-REI.11) — approximable by tables or
          technology when exact algebra is hard.
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
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
