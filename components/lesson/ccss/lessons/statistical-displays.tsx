"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const DATA = [4, 5, 5, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 9, 9, 12];
const W = 340, H = 160, PAD = 30;

function median(a: number[]) { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }

export default function Lesson() {
  const [mode, setMode] = useState<"dot" | "histogram" | "box">("dot");

  const min = Math.min(...DATA), max = Math.max(...DATA);
  const sorted = [...DATA].sort((a, b) => a - b);
  const q1 = median(sorted.slice(0, 8));
  const q2 = median(sorted);
  const q3 = median(sorted.slice(8));
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const lowerWhisker = sorted.find((value) => value >= lowerFence) ?? min;
  const upperWhisker = [...sorted].reverse().find((value) => value <= upperFence) ?? max;
  const outliers = sorted.filter((value) => value < lowerFence || value > upperFence);
  const sx = (v: number) => Math.round((PAD + ((v - 2) / 12) * (W - 2 * PAD)) * 100) / 100;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The same data can be pictured many ways. A <strong>dot plot</strong>{" "}shows
        every value; a <strong>histogram</strong>{" "}groups them into bins; a{" "}
        <strong>box plot</strong>{" "}summarizes quartiles, whiskers, and possible outliers. Each highlights
        a different feature of the distribution.
      </p>

      <Figure caption="One data set, three views — dots, bars, and a box-and-whisker summary.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {(["dot", "histogram", "box"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className="rounded-lg border px-3 py-1.5 text-sm font-bold capitalize" style={mode === m ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{m === "box" ? "box plot" : m}</button>
            ))}
          </div>

          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full" role="img" aria-label={mode === "dot" ? "dot plot" : mode === "histogram" ? "histogram" : `modified box plot with whiskers from ${lowerWhisker} to ${upperWhisker} and outlier ${outliers.join(", ")}`}>
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            {Array.from({ length: 11 }, (_, i) => i + 2).map((v) => (
              <text key={v} x={sx(v)} y={H - PAD + 15} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{v}</text>
            ))}
            {mode === "dot" && Array.from({ length: 13 }, (_, i) => i + 2).map((v) => {
              const count = DATA.filter((d) => d === v).length;
              return Array.from({ length: count }, (_, j) => <circle key={`${v}-${j}`} cx={sx(v)} cy={H - PAD - 10 - j * 11} r={4} fill={ACCENT} />);
            })}
            {mode === "histogram" && [[4, 5], [6, 7], [8, 9], [10, 11], [12, 13]].map(([lo, hi], i) => {
              const count = DATA.filter((d) => d >= lo && d <= hi).length;
              const bw = (sx(hi + 1) - sx(lo)) - 4;
              return <rect key={i} x={sx(lo)} y={H - PAD - count * 14} width={bw} height={count * 14} fill={ACCENT} fillOpacity={0.5} stroke={ACCENT} strokeWidth={1.5} />;
            })}
            {mode === "box" && (
              <g>
                <line x1={sx(lowerWhisker)} y1={H / 2} x2={sx(q1)} y2={H / 2} stroke={ACCENT} strokeWidth={2} />
                <line x1={sx(q3)} y1={H / 2} x2={sx(upperWhisker)} y2={H / 2} stroke={ACCENT} strokeWidth={2} />
                <rect x={sx(q1)} y={H / 2 - 22} width={sx(q3) - sx(q1)} height={44} fill={ACCENT} fillOpacity={0.25} stroke={ACCENT} strokeWidth={2} />
                <line x1={sx(q2)} y1={H / 2 - 22} x2={sx(q2)} y2={H / 2 + 22} stroke={ACCENT} strokeWidth={3} />
                {[lowerWhisker, upperWhisker].map((v, i) => <line key={i} x1={sx(v)} y1={H / 2 - 12} x2={sx(v)} y2={H / 2 + 12} stroke={ACCENT} strokeWidth={2} />)}
                {outliers.map((v, i) => <circle key={`${v}-${i}`} cx={sx(v)} cy={H / 2} r={4} fill={ACCENT} />)}
              </g>
            )}
          </svg>

          <div className="rounded-xl bg-[var(--surface-2)] px-6 py-2 text-center font-mono text-sm">
            five-number summary: min {min}, Q1 {q1}, median {q2}, Q3 {q3}, max {max}
            <div className="mt-1 text-xs text-[var(--ink-faint)]">modified-box whiskers: {lowerWhisker} to {upperWhisker}; outlier: {outliers.join(", ")}</div>
          </div>
        </div>
      </Figure>

      <h2>Choosing a display</h2>
      <p>
        A dot plot keeps every value visible — great for small sets and spotting the
        isolated high value at 12. A histogram reveals overall shape (here, a peak around 7). A
        box plot compresses the center and spread, ideal for comparing groups. The median
        {" "}{q2} and IQR = Q3 − Q1 = {q3} − {q1} = {iqr} resist extreme values
        better than the mean and range would. Under the common 1.5·IQR rule, the
        fences are {lowerFence} and {upperFence}, so 12 exceeds the upper fence and
        is a Tukey outlier; the modified box plot marks it separately from the whisker at {upperWhisker}.
      </p>

      <MathCheck>
        <p>
          Data on a single quantitative variable is represented with{" "}
          <strong>dot plots, histograms, and box plots</strong>{" "}(S-ID.1). Each
          display exposes different aspects — individual values, shape, or the
          five-number summary — and choosing well depends on the data and the
          question.
        </p>
      </MathCheck>
    </div>
  );
}
