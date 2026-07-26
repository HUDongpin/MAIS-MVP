"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const XMAX = 6;
const YMAX = 40;
const PXX = 60;
const PXY = 7;
const PAD = 34;
const W = XMAX * PXX + 2 * PAD;
const H = YMAX * PXY + 2 * PAD;

const LIN = "var(--band-middle)";
const EXP = "var(--band-high)";

export default function Lesson() {
  const [m, setM] = useState(5); // linear slope
  const [r, setR] = useState(2); // exponential base

  const sx = (x: number) => PAD + x * PXX;
  const sy = (y: number) => PAD + (YMAX - y) * PXY;
  const clampY = (y: number) => Math.min(y, YMAX);

  const lin = (x: number) => m * x;
  const exp = (x: number) => Math.pow(r, x);

  // linear polyline (clipped)
  const linPts: string[] = [];
  for (let x = 0; x <= XMAX + 0.001; x += 0.25) {
    if (lin(x) <= YMAX) linPts.push(`${sx(x).toFixed(1)},${sy(lin(x)).toFixed(1)}`);
  }
  // exponential polyline (clipped)
  const expPts: string[] = [];
  for (let x = 0; x <= XMAX + 0.001; x += 0.1) {
    if (exp(x) <= YMAX) expPts.push(`${sx(x).toFixed(1)},${sy(exp(x)).toFixed(1)}`);
  }

  // first integer step where exponential overtakes linear
  let crossover: number | null = null;
  for (let x = 1; x <= XMAX; x++) {
    if (exp(x) > lin(x)) {
      crossover = x;
      break;
    }
  }

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two quantities can both grow, but in very different ways. A{" "}
        <strong>linear</strong>{" "}function grows by <em>adding</em>{" "}the same amount
        each step. An <strong>exponential</strong>{" "}function grows by{" "}
        <em>multiplying</em>{" "}by the same factor each step. Watch what that
        difference does.
      </p>

      <Figure caption="Linear adds a fixed amount; exponential multiplies. Small at first — then the exponential runs away.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto max-w-full" role="img" aria-label="Linear versus exponential growth">
              {/* horizontal gridlines every 5 */}
              {Array.from({ length: YMAX / 5 + 1 }, (_, i) => {
                const y = i * 5;
                return (
                  <g key={`h${i}`}>
                    <line x1={sx(0)} y1={sy(y)} x2={sx(XMAX)} y2={sy(y)} stroke="var(--line)" strokeWidth={1} />
                    <text x={sx(0) - 8} y={sy(y) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{y}</text>
                  </g>
                );
              })}
              {/* vertical gridlines */}
              {Array.from({ length: XMAX + 1 }, (_, x) => (
                <g key={`v${x}`}>
                  <line x1={sx(x)} y1={sy(0)} x2={sx(x)} y2={sy(YMAX)} stroke="var(--line)" strokeWidth={1} />
                  <text x={sx(x)} y={sy(0) + 18} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{x}</text>
                </g>
              ))}
              {/* axes */}
              <line x1={sx(0)} y1={sy(0)} x2={sx(XMAX)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
              <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(YMAX)} stroke="var(--ink-soft)" strokeWidth={2} />
              {/* curves */}
              <polyline points={linPts.join(" ")} fill="none" stroke={LIN} strokeWidth={3} strokeLinecap="round" />
              <polyline points={expPts.join(" ")} fill="none" stroke={EXP} strokeWidth={3} strokeLinecap="round" />
              {/* integer dots on exponential */}
              {Array.from({ length: XMAX + 1 }, (_, x) =>
                exp(x) <= YMAX ? (
                  <circle key={x} cx={sx(x)} cy={sy(exp(x))} r={3.5} fill={EXP} />
                ) : null,
              )}
            </svg>
          </FigureScroll>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold">
            <span className="inline-flex items-center gap-2"><span className="h-1 w-5 rounded" style={{ background: LIN }} /> linear&nbsp; y = {m}x</span>
            <span className="inline-flex items-center gap-2"><span className="h-1 w-5 rounded" style={{ background: EXP }} /> exponential&nbsp; y = {r}<sup>x</sup></span>
          </div>

          {/* value table */}
          <FigureScroll>
            <table className="mx-auto text-center font-mono text-sm">
              <thead>
                <tr className="text-[var(--ink-faint)]">
                  <th className="px-2 py-1 text-left">x</th>
                  {Array.from({ length: XMAX + 1 }, (_, x) => <th key={x} className="px-2.5 py-1">{x}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr style={{ color: LIN }}>
                  <td className="px-2 py-1 text-left font-bold">{m}x</td>
                  {Array.from({ length: XMAX + 1 }, (_, x) => <td key={x} className="px-2.5 py-1">{lin(x)}</td>)}
                </tr>
                <tr style={{ color: EXP }}>
                  <td className="px-2 py-1 text-left font-bold">{r}^x</td>
                  {Array.from({ length: XMAX + 1 }, (_, x) => <td key={x} className="px-2.5 py-1">{Number.isInteger(exp(x)) ? exp(x) : exp(x).toFixed(1)}</td>)}
                </tr>
              </tbody>
            </table>
          </FigureScroll>

          <p className="m-0 text-center text-sm text-[var(--ink-soft)]">
            {crossover !== null ? (
              <>By <strong>x = {crossover}</strong>, the exponential has already passed the line — and it never looks back.</>
            ) : (
              <>Within this window the line is still ahead — but push x further and the exponential always wins.</>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Slider label={`Linear slope (m)`} value={m} min={1} max={8} step={1} onChange={setM} color={LIN} />
            <Slider label={`Exponential base (r)`} value={r} min={1.5} max={3} step={0.5} onChange={setR} color={EXP} />
          </div>
        </div>
      </Figure>

      <h2>Adding versus multiplying</h2>
      <p>
        Look at the table. Each step to the right <strong>adds {m}</strong>{" "}to
        the linear row, but <strong>multiplies the exponential row by {r}</strong>.
        Multiplying compounds — the bigger it gets, the faster it grows.
      </p>

      <MathCheck>
        <p>
          A <strong>linear</strong>{" "}function has a constant{" "}
          <strong>difference</strong>{" "}between equally spaced outputs (here, +{m}),
          while an <strong>exponential</strong>{" "}function has a constant{" "}
          <strong>ratio</strong>{" "}(here, ×{r}) — that is exactly what distinguishes
          the two families (F-LE.1). Because each exponential step scales the
          whole quantity, an increasing exponential function eventually exceeds{" "}
          <em>any</em>{" "}linear (in fact any polynomial) function (F-LE.3), no
          matter how large the slope starts out.
        </p>
      </MathCheck>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  color,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {label}: <span style={{ color }}>{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-44"
        style={{ accentColor: color }}
        aria-label={label}
      />
    </div>
  );
}
