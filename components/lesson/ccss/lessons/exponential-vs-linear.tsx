"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";
import {
  relationForDisplayedValue,
  spokenRelationForDisplayedValue,
} from "@/components/lesson/ccss/numberPresentation";

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
  // Renamed from r: construct-linear-exponential, on the same page, writes
  // y = start·(1 + r)ᵗ with r as the fractional RATE. A student carrying
  // r = 2 into that formula gets tripling instead of doubling.
  const [b, setB] = useState(2); // exponential growth factor

  const sx = (x: number) => PAD + x * PXX;
  const sy = (y: number) => PAD + (YMAX - y) * PXY;

  const lin = (x: number) => m * x;
  const exp = (x: number) => Math.pow(b, x);

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

      <Figure caption="Linear adds a fixed amount; exponential multiplies. Their early order depends on the parameters, but a factor above 1 eventually outgrows a positive-slope line.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll ariaLabel="Scrollable graph comparing linear and exponential growth">
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
            <span className="inline-flex items-center gap-2"><span className="h-1 w-5 rounded" style={{ background: EXP }} /> exponential&nbsp; y = {b}<sup>x</sup></span>
          </div>

          {/* value table */}
          <FigureScroll ariaLabel="Scrollable value table comparing linear and exponential growth">
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
                  <td className="px-2 py-1 text-left font-bold">{b}^x</td>
                  {Array.from({ length: XMAX + 1 }, (_, x) => {
                    const value = exp(x);
                    const displayedValue = Number.isInteger(value) ? String(value) : value.toFixed(1);
                    const relation = relationForDisplayedValue(value, displayedValue);
                    const spokenRelation = spokenRelationForDisplayedValue(value, displayedValue);
                    return (
                      <td key={x} className="px-2.5 py-1" aria-label={`${b} to the power ${x} ${spokenRelation} ${displayedValue}`}>
                        {relation === "=" ? displayedValue : `${relation} ${displayedValue}`}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </FigureScroll>

          <p className="m-0 text-center text-sm text-[var(--ink-soft)]">
            {crossover !== null ? (
              <>By <strong>x = {crossover}</strong>, the exponential is above the line — and stays ahead from there.</>
            ) : (
              <>At <strong>x = 0</strong>, the exponential starts above the line. At each displayed integer from x = 1 through x = {XMAX}, it does not exceed the line; farther right, exponential growth eventually pulls ahead.</>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Slider label={`Linear slope (m)`} value={m} min={1} max={8} step={1} onChange={setM} color={LIN} />
            <Slider label={`Exponential growth factor (b)`} value={b} min={1.5} max={3} step={0.5} onChange={setB} color={EXP} />
          </div>
        </div>
      </Figure>

      <h2>Adding versus multiplying</h2>
      <p>
        Look at the table. Each step to the right <strong>adds {m}</strong>{" "}to
        the linear row, but <strong>multiplies the exponential row by {b}</strong>.
        Multiplying compounds — the bigger it gets, the faster it grows.
      </p>

      <MathCheck>
        <p>
          A <strong>linear</strong>{" "}function has a constant{" "}
          <strong>difference</strong>{" "}between equally spaced outputs (here, +{m}),
          while an <strong>exponential</strong>{" "}function has a constant{" "}
          <strong>ratio</strong>{" "}(here, ×{b}) — that is exactly what distinguishes
          the two families (F-LE.1). Because each exponential step scales the
          whole positive quantity, an exponential of the form <strong>a·bˣ</strong>{" "}
          with <strong>a &gt; 0</strong>{" "}and <strong>b &gt; 1</strong>{" "}eventually
          exceeds any fixed polynomial as x increases (F-LE.3). The displayed
          model is the special case a = 1; the domain conditions matter.
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
