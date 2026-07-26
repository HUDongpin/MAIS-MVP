"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const DATA = [3, 5, 6, 6, 7, 8, 8, 9, 10, 12, 14, 15];
const MAXX = 16;
const PAD = 30;
const STEP = 26;
const W = MAXX * STEP + 2 * PAD;
const ACCENT = "var(--band-middle)";
const BOX = "var(--band-upper)";

type Mode = "dot" | "hist" | "box";

export default function Lesson() {
  const [mode, setMode] = useState<Mode>("dot");
  const x = (v: number) => PAD + v * STEP;

  // box plot stats
  const s = [...DATA].sort((a, b) => a - b);
  const median = (s[5] + s[6]) / 2;
  const q1 = (s[2] + s[3]) / 2;
  const q3 = (s[8] + s[9]) / 2;
  const min = s[0], max = s[s.length - 1];

  // histogram bins width 3: [0-2],[3-5],[6-8],[9-11],[12-14],[15-17]
  const bins = [0, 3, 6, 9, 12, 15];
  const binCounts = bins.map((b) => DATA.filter((d) => d >= b && d < b + 3).length);

  // dot plot counts
  const counts: Record<number, number> = {};

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The same data can be shown in different ways. A <strong>dot plot</strong>{" "}
        shows every value; a <strong>histogram</strong>{" "}groups values into bins; a{" "}
        <strong>box plot</strong>{" "}summarizes the spread into quarters. Each reveals
        something different.
      </p>

      <Figure caption="One data set, three displays. Switch between them.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {([["dot", "Dot plot"], ["hist", "Histogram"], ["box", "Box plot"]] as [Mode, string][]).map(([m, lbl]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={mode === m ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{lbl}</button>
            ))}
          </div>

          <FigureScroll>
            <svg width={W} height={140} viewBox={`0 0 ${W} 140`} className="mx-auto" role="img" aria-label={`${mode} of the data`}>
              <line x1={PAD} y1={110} x2={W - PAD} y2={110} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: MAXX + 1 }, (_, i) => (i % 2 === 0 ? <text key={i} x={x(i)} y={128} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{i}</text> : null))}

              {mode === "dot" && s.map((v, i) => {
                counts[v] = (counts[v] || 0) + 1;
                return <circle key={i} cx={x(v)} cy={104 - (counts[v] - 1) * 14} r={5.5} fill={ACCENT} />;
              })}

              {mode === "hist" && bins.map((b, i) => (
                <rect key={b} x={x(b) + 1} y={110 - binCounts[i] * 22} width={3 * STEP - 2} height={binCounts[i] * 22} fill={ACCENT} fillOpacity={0.7} stroke="var(--surface)" strokeWidth={1} />
              ))}

              {mode === "box" && (
                <g>
                  <line x1={x(min)} y1={70} x2={x(q1)} y2={70} stroke="var(--ink)" strokeWidth={2} />
                  <line x1={x(q3)} y1={70} x2={x(max)} y2={70} stroke="var(--ink)" strokeWidth={2} />
                  <line x1={x(min)} y1={58} x2={x(min)} y2={82} stroke="var(--ink)" strokeWidth={2} />
                  <line x1={x(max)} y1={58} x2={x(max)} y2={82} stroke="var(--ink)" strokeWidth={2} />
                  <rect x={x(q1)} y={50} width={x(q3) - x(q1)} height={40} fill={BOX} fillOpacity={0.4} stroke={BOX} strokeWidth={2} />
                  <line x1={x(median)} y1={50} x2={x(median)} y2={90} stroke={BOX} strokeWidth={3} />
                  <text x={x(min)} y={44} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">min {min}</text>
                  <text x={x(median)} y={44} textAnchor="middle" fontSize={9} fontWeight={700} fill={BOX} fontFamily="var(--font-mono)">med {median}</text>
                  <text x={x(max)} y={44} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">max {max}</text>
                </g>
              )}
            </svg>
          </FigureScroll>

          <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">
            {mode === "dot" && "Every dot is one data value — you see the exact numbers and how they cluster."}
            {mode === "hist" && "Bars count how many values fall in each interval of 3 — good for larger data sets."}
            {mode === "box" && `The box holds the middle half (Q1 ${q1} to Q3 ${q3}); the whiskers reach the min and max.`}
          </p>
        </div>
      </Figure>

      <h2>Different views, different insights</h2>
      <p>
        The dot plot keeps every value; the histogram shows the overall shape by
        grouping; the box plot highlights the median and the middle 50% of the
        data (from {q1} to {q3}). Choosing the right display depends on what you
        want to show.
      </p>

      <MathCheck>
        <p>
          Numerical data can be displayed as <strong>dot plots</strong>,{" "}
          <strong>histograms</strong>, and <strong>box plots</strong>{" "}(6.SP.B.4).
          Dot plots and histograms show the distribution&apos;s shape; a box plot
          summarizes it with five numbers — minimum, Q1, median ({median}), Q3, and
          maximum — making center and spread easy to compare.
        </p>
      </MathCheck>
    </div>
  );
}
