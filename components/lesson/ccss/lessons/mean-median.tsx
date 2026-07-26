"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const MAXV = 10;
const PAD = 24;
const STEP = 30;
const W = MAXV * STEP + 2 * PAD;
const MEAN = "var(--band-early)";
const MED = "var(--band-upper)";

export default function Lesson() {
  const [data, setData] = useState([3, 5, 5, 6, 8]);

  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((s, v) => s + v, 0);
  const mean = sum / data.length;
  const median = sorted[Math.floor((sorted.length - 1) / 2)] === sorted[Math.ceil((sorted.length - 1) / 2)]
    ? sorted[Math.floor(sorted.length / 2)]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const range = Math.max(...data) - Math.min(...data);
  const mad = data.reduce((s, v) => s + Math.abs(v - mean), 0) / data.length;

  const x = (v: number) => PAD + (v - 1) * STEP + STEP / 2;
  // stack dots at each value
  const counts: Record<number, number> = {};
  const dots = sorted.map((v) => {
    counts[v] = (counts[v] || 0) + 1;
    return { v, level: counts[v] };
  });

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two kinds of numbers summarize data. <strong>Center</strong>{" "}— the{" "}
        <strong>mean</strong>{" "}(balance point) and <strong>median</strong>{" "}(middle
        value) — says what is typical. <strong>Spread</strong>{" "}— like the{" "}
        <strong>range</strong>{" "}— says how much the data varies.
      </p>

      <Figure caption="The orange triangle is the mean (balance point); the green line is the median (middle).">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <svg width={W} height={130} viewBox={`0 0 ${W} 130`} className="mx-auto" role="img" aria-label="dot plot with mean and median">
              <line x1={PAD} y1={100} x2={W - PAD} y2={100} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: MAXV }, (_, i) => (
                <text key={i} x={x(i + 1)} y={118} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{i + 1}</text>
              ))}
              {dots.map((d, i) => (
                <circle key={i} cx={x(d.v)} cy={94 - (d.level - 1) * 15} r={6} fill="var(--band-middle)" />
              ))}
              {/* median line */}
              <line x1={x(median)} y1={20} x2={x(median)} y2={104} stroke={MED} strokeWidth={2.5} strokeDasharray="4 3" />
              {/* mean marker */}
              <polygon points={`${x(mean)},104 ${x(mean) - 6},116 ${x(mean) + 6},116`} fill={MEAN} />
            </svg>
          </FigureScroll>

          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Fact label="Mean" value={mean.toFixed(1)} color={MEAN} />
            <Fact label="Median" value={`${median}`} color={MED} />
            <Fact label="Range" value={`${range}`} />
            <Fact label="MAD" value={mad.toFixed(1)} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {data.map((v, i) => (
              <Stepper key={i} label={`#${i + 1}`} value={v} onChange={(nv) => setData((d) => d.map((x, j) => (j === i ? nv : x)))} />
            ))}
          </div>
        </div>
      </Figure>

      <h2>Typical versus varied</h2>
      <p>
        The mean {mean.toFixed(1)} balances the data; the median {median} sits in
        the middle. The range {range} and the mean absolute deviation (MAD){" "}
        {mad.toFixed(1)} measure how spread out the values are — bigger means more
        variable.
      </p>

      <MathCheck>
        <p>
          A <strong>measure of center</strong>{" "}(mean or median) describes a single
          typical value, while a <strong>measure of variability</strong>{" "}(range,
          IQR, or MAD) describes how spread out the data is (6.SP.A.3). Summarizing
          a data set means reporting both (6.SP.B.5): here mean = {mean.toFixed(1)},
          median = {median}, range = {range}, MAD = {mad.toFixed(1)}.
        </p>
      </MathCheck>
    </div>
  );
}

function Fact({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</div>
      <div className="font-mono text-xl font-black" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1, Math.min(MAXV, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} className="h-8 w-7 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-5 text-center text-lg font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= MAXV} className="h-8 w-7 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
