"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CELL = 46;
const WIDTHC = "var(--band-upper)"; // first fraction (across)
const HEIGHTC = "var(--band-middle)"; // second fraction (down)
const OVERLAP = "var(--band-high)"; // the product

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function Lesson() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const [c, setC] = useState(3);
  const [d, setD] = useState(4);

  const clampNum = (v: number, den: number) => Math.max(1, Math.min(den, v));
  const setDen = (setD_: (n: number) => void, setN: (n: number) => void, num: number) => (den: number) => {
    setD_(den);
    setN(Math.min(num, den));
  };

  const W = b * CELL;
  const H = d * CELL;
  const prodN = a * c;
  const prodD = b * d;
  const g = gcd(prodN, prodD);
  const simplified = g > 1 ? `${prodN / g}/${prodD / g}` : null;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        What does <strong>“⅔ of ¾”</strong>{" "}mean? Multiplying fractions is
        taking a <em>part of a part</em>. Shade one fraction across a square and
        the other down it — the piece where they <strong>overlap</strong>{" "}is the
        answer.
      </p>

      <Figure caption="Green shades the first fraction across; blue shades the second one down. The overlap is the product.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <svg width={W + 2} height={H + 2} viewBox={`0 0 ${W + 2} ${H + 2}`} className="max-w-full" role="img" aria-label={`${a}/${b} times ${c}/${d}`}>
              <g transform="translate(1,1)">
                {Array.from({ length: d }, (_, row) =>
                  Array.from({ length: b }, (_, col) => {
                    const inW = col < a;
                    const inH = row < c;
                    let fill = "var(--surface-2)";
                    let opacity = 1;
                    if (inW && inH) {
                      fill = OVERLAP;
                      opacity = 0.9;
                    } else if (inW) {
                      fill = WIDTHC;
                      opacity = 0.3;
                    } else if (inH) {
                      fill = HEIGHTC;
                      opacity = 0.3;
                    }
                    return (
                      <rect
                        key={`${row}-${col}`}
                        x={col * CELL}
                        y={row * CELL}
                        width={CELL}
                        height={CELL}
                        fill={fill}
                        opacity={opacity}
                        stroke="var(--surface)"
                        strokeWidth={2}
                      />
                    );
                  }),
                )}
              </g>
            </svg>
          </div>

          <div className="text-center">
            <div className="font-mono text-xl font-bold">
              {a}/{b} × {c}/{d} ={" "}
              <span style={{ color: OVERLAP }}>
                {prodN}/{prodD}
              </span>
              {simplified && (
                <span className="text-[var(--ink-soft)]"> = {simplified}</span>
              )}
            </div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">
              The whole square has <strong>{prodD}</strong>{" "}equal pieces; the
              overlap covers <strong>{prodN}</strong>{" "}of them.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <FractionControl
              label="Across"
              color={WIDTHC}
              num={a}
              den={b}
              onNum={(v) => setA(clampNum(v, b))}
              onDen={setDen(setB, setA, a)}
            />
            <FractionControl
              label="Down"
              color={HEIGHTC}
              num={c}
              den={d}
              onNum={(v) => setC(clampNum(v, d))}
              onDen={setDen(setD, setC, c)}
            />
          </div>
        </div>
      </Figure>

      <h2>Why you multiply across</h2>
      <p>
        Cutting the square into <strong>{b}</strong>{" "}columns and{" "}
        <strong>{d}</strong>{" "}rows makes <strong>{b} × {d} = {prodD}</strong>{" "}
        equal little pieces. The overlap is <strong>{a}</strong>{" "}columns by{" "}
        <strong>{c}</strong>{" "}rows, which is <strong>{a} × {c} = {prodN}</strong>{" "}
        pieces. So the answer is <strong>{prodN} out of {prodD}</strong>.
      </p>

      <MathCheck>
        <p>
          Multiplying fractions means taking a fraction <em>of</em>{" "}a fraction:{" "}
          <strong>a/b × c/d = (a×c)/(b×d)</strong>{" "}(5.NF.B.4). The area model
          shows exactly why — splitting the unit square into b columns and d rows
          creates <strong>b×d</strong>{" "}equal parts, and the region that is inside
          both shadings is <strong>a×c</strong>{" "}of them. Because you take a part
          of a part, multiplying by a fraction <em>less than 1</em>{" "}gives a
          product <em>smaller</em>{" "}than the other factor; multiplying by a
          fraction equal to 1 (like 3/3) leaves it unchanged (5.NF.B.5).
        </p>
      </MathCheck>
    </div>
  );
}

function FractionControl({
  label,
  color,
  num,
  den,
  onNum,
  onDen,
}: {
  label: string;
  color: string;
  num: number;
  den: number;
  onNum: (v: number) => void;
  onDen: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        {label}: {num}/{den}
      </span>
      <div className="flex items-center gap-4">
        <MiniStepper label="numerator" value={num} min={1} max={den} onChange={onNum} />
        <span className="text-2xl text-[var(--ink-faint)]">/</span>
        <MiniStepper label="denominator" value={den} min={2} max={5} onChange={onDen} />
      </div>
    </div>
  );
}

function MiniStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
      <span className="w-5 text-center text-lg font-black tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-7 w-7 rounded-md border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}
