"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const INPUT_MIN = -8;
const INPUT_MAX = 8;
// Both inputs can point in the same direction, so the result can reach ±16.
// Keep that full domain in the plot instead of projecting the endpoint beyond
// a narrower ±10 viewBox.
const MIN = INPUT_MIN * 2;
const MAX = INPUT_MAX * 2;
const W = 620;
const H = 170;
const PAD = 30;
const AXIS_Y = 110;
const lineW = W - 2 * PAD;

const C1 = "var(--band-early)"; // first arrow
const C2 = "var(--band-middle)"; // second arrow
const SUM = "var(--band-high)";

export default function Lesson() {
  const [p, setP] = useState(5);
  const [q, setQ] = useState(-8);

  const x = (v: number) => PAD + ((v - MIN) / (MAX - MIN)) * lineW;
  const sum = p + q;

  function Arrow({
    from,
    to,
    y,
    color,
  }: {
    from: number;
    to: number;
    y: number;
    color: string;
  }) {
    if (from === to) return null;
    const x1 = x(from);
    const x2 = x(to);
    const dir = x2 > x1 ? 1 : -1;
    const headSize = 8;
    return (
      <g stroke={color} fill={color}>
        <line x1={x1} y1={y} x2={x2} y2={y} strokeWidth={3} />
        <polygon
          points={`${x2},${y} ${x2 - dir * headSize},${y - headSize * 0.7} ${
            x2 - dir * headSize
          },${y + headSize * 0.7}`}
          stroke="none"
        />
      </g>
    );
  }

  return (
    <div className="prose-lesson max-w-none">
      <p>
        On the number line, <strong>adding</strong>{" "}means taking a step. Adding a{" "}
        <strong>positive</strong>{" "}number steps to the <strong>right</strong>;
        adding a <strong>negative</strong>{" "}number steps to the{" "}
        <strong>left</strong>. Chain two steps to add two integers.
      </p>

      <Figure caption="The first arrow starts at 0. The second arrow starts where the first one ends.">
        <div className="flex flex-col items-center gap-5">
          <FigureScroll>
            <svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              className="mx-auto max-w-full"
              role="img"
              aria-label={`Number line adding ${p} and ${q}`}
            >
              {/* axis */}
              <line x1={PAD} y1={AXIS_Y} x2={W - PAD} y2={AXIS_Y} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: MAX - MIN + 1 }, (_, i) => {
                const v = MIN + i;
                return (
                  <g key={v}>
                    <line
                      x1={x(v)}
                      y1={AXIS_Y - (v === 0 ? 10 : 6)}
                      x2={x(v)}
                      y2={AXIS_Y + (v === 0 ? 10 : 6)}
                      stroke="var(--ink-soft)"
                      strokeWidth={v === 0 ? 2 : 1}
                    />
                    {v % 2 === 0 ? (
                      <text
                        x={x(v)}
                        y={AXIS_Y + 26}
                        textAnchor="middle"
                        fontSize={11}
                        fill="var(--ink-faint)"
                        fontFamily="var(--font-mono)"
                      >
                        {v}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              {/* arrows */}
              <Arrow from={0} to={p} y={AXIS_Y - 26} color={C1} />
              <Arrow from={p} to={sum} y={AXIS_Y - 50} color={C2} />
              {/* sum marker */}
              <circle cx={x(sum)} cy={AXIS_Y} r={7} fill={SUM} stroke="white" strokeWidth={2.5} />
              <text x={x(sum)} y={AXIS_Y + 44} textAnchor="middle" fontSize={13} fontWeight={800} fill={SUM}>
                {sum}
              </text>
            </svg>
          </FigureScroll>

          <div className="rounded-xl bg-[var(--surface-2)] px-6 py-3 text-center font-mono text-2xl font-black">
            <span style={{ color: C1 }}>{p}</span>{" "}
            <span className="text-[var(--ink-faint)]">+</span>{" "}
            <span style={{ color: C2 }}>({q})</span>{" "}
            <span className="text-[var(--ink-faint)]">=</span>{" "}
            <span style={{ color: SUM }}>{sum}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Slider label="First number (p)" value={p} onChange={setP} color={C1} />
            <Slider label="Second number (q)" value={q} onChange={setQ} color={C2} />
          </div>
        </div>
      </Figure>

      <h2>Same direction or opposite?</h2>
      <p>
        When both steps go the <strong>same way</strong>, the distances add and
        the answer is bigger. When they go <strong>opposite ways</strong>, they
        partly cancel — you end up at the difference of their sizes, pointed the
        way of the longer arrow. Here the two arrows are{" "}
        <strong>
          {Math.sign(p) === Math.sign(q) || p === 0 || q === 0
            ? "pointing the same way (or one is zero)"
            : "pointing opposite ways"}
        </strong>
        .
      </p>

      <MathCheck>
        <p>
          Adding <strong>q</strong>{" "}to a number means translating it{" "}
          <strong>|q|</strong>{" "}units — right if q &gt; 0, left if q &lt; 0
          (7.NS.A.1). A number and its opposite are the same distance from 0 in
          opposite directions, so <strong>p + (−p) = 0</strong>: they form a{" "}
          <em>zero pair</em>. That is exactly why opposite-direction arrows
          cancel. The endpoint of the second arrow is always the true sum,
          because translations on the number line compose by adding.
        </p>
      </MathCheck>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
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
        min={INPUT_MIN}
        max={INPUT_MAX}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40"
        style={{ accentColor: color }}
        aria-label={label}
      />
    </div>
  );
}
