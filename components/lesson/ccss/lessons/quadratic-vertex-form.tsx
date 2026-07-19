"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 7; // grid range
const CELL = 24;
const PAD = 18;
const SIZE = 2 * R * CELL + 2 * PAD;
const ORIGIN = PAD + R * CELL;

const CURVE = "var(--band-high)";

function fmt(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

export default function Lesson() {
  const [a, setA] = useState(1);
  const [h, setH] = useState(-2);
  const [k, setK] = useState(-3);

  const sx = (x: number) => ORIGIN + x * CELL;
  const sy = (y: number) => ORIGIN - y * CELL;

  // sample the curve, keeping points inside the visible window
  const points: string[] = [];
  for (let x = -R; x <= R + 0.001; x += 0.1) {
    const y = a * (x - h) * (x - h) + k;
    if (y >= -R - 0.5 && y <= R + 0.5) {
      points.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
    }
  }

  const sign = (v: number) => (v < 0 ? `+ ${-v}` : `− ${v}`); // for (x - h): h negative → x + |h|

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Every quadratic function can be written in <strong>vertex form</strong>,{" "}
        <span className="font-mono">y = a(x − h)² + k</span>. The three numbers
        each do one job: <strong>a</strong>{" "}stretches and flips the parabola,{" "}
        <strong>h</strong>{" "}slides it left/right, and <strong>k</strong>{" "}slides it
        up/down. Move the sliders to see each effect on its own.
      </p>

      <Figure caption="The vertex sits exactly at (h, k), and the curve is a mirror image across the line x = h.">
        <div className="flex flex-col items-center gap-5">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="max-w-full"
            style={{ maxHeight: 380 }}
            role="img"
            aria-label={`Parabola y = ${fmt(a)}(x − ${fmt(h)})² + ${fmt(k)}`}
          >
            {/* grid */}
            {Array.from({ length: 2 * R + 1 }, (_, i) => {
              const v = -R + i;
              return (
                <g key={v} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                  <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
                </g>
              );
            })}
            {/* axis of symmetry */}
            <line
              x1={sx(h)}
              y1={sy(-R)}
              x2={sx(h)}
              y2={sy(R)}
              stroke={CURVE}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              opacity={0.5}
            />
            {/* axes */}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={1.75} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={1.75} />

            {/* the parabola */}
            {points.length > 1 && (
              <polyline
                points={points.join(" ")}
                fill="none"
                stroke={CURVE}
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* vertex */}
            <circle cx={sx(h)} cy={sy(k)} r={6} fill={CURVE} stroke="white" strokeWidth={2.5} />
          </svg>

          <div className="rounded-xl bg-[var(--surface-2)] px-6 py-3 text-center">
            <div className="font-mono text-lg font-bold" style={{ color: CURVE }}>
              y = {fmt(a)}(x {sign(h)})² {k < 0 ? `− ${-k}` : `+ ${k}`}
            </div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">
              Vertex at <strong>({fmt(h)}, {fmt(k)})</strong>{" "}· opens{" "}
              <strong>{a > 0 ? "upward" : a < 0 ? "downward" : "flat (a = 0)"}</strong>
              {a !== 0 && (
                <>
                  {" "}
                  · {Math.abs(a) > 1 ? "narrower" : Math.abs(a) < 1 ? "wider" : "same width"} than y = x²
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Slider label="a (stretch/flip)" value={a} min={-3} max={3} step={0.5} onChange={setA} />
            <Slider label="h (left/right)" value={h} min={-5} max={5} step={1} onChange={setH} />
            <Slider label="k (up/down)" value={k} min={-5} max={5} step={1} onChange={setK} />
          </div>
        </div>
      </Figure>

      <h2>Why the vertex is exactly (h, k)</h2>
      <p>
        A square is never negative: <span className="font-mono">(x − h)²</span>{" "}
        is 0 when <span className="font-mono">x = h</span> and positive
        everywhere else. So when <strong>a &gt; 0</strong>, the smallest value of{" "}
        <span className="font-mono">a(x − h)² + k</span> happens right at{" "}
        <span className="font-mono">x = h</span>, and that lowest point is{" "}
        <span className="font-mono">y = k</span>.
      </p>

      <MathCheck>
        <p>
          In <strong>y = a(x − h)² + k</strong>, the term{" "}
          <strong>(x − h)²</strong>{" "}equals 0 only at <strong>x = h</strong>{" "}and
          is positive otherwise, so the graph turns around at the point{" "}
          <strong>(h, k)</strong>{" "}— the vertex (F-IF.8). Replacing x with (x − h)
          shifts the graph right by h; adding k shifts it up by k; multiplying by
          a scales it vertically and, if a &lt; 0, reflects it over its axis
          (F-BF.3). Because (x − h)² gives the same value for inputs the same
          distance on either side of h, the parabola is symmetric about the line{" "}
          <strong>x = h</strong>.
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
        {label}: <span className="text-[var(--ink)]">{fmt(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40 accent-[var(--band-high)]"
        aria-label={label}
      />
    </div>
  );
}
