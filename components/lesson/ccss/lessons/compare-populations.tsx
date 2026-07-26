"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const MAXX = 20;
const PAD = 24;
const STEP = 26;
const W = MAXX * STEP + 2 * PAD;
const A = "var(--band-middle)";
const B = "var(--band-upper)";

const GROUP_A = [6, 7, 7, 8, 8, 9, 10];
const BASE_B = [5, 6, 6, 7, 7, 8, 9];

export default function Lesson() {
  const [shift, setShift] = useState(4);
  const groupB = BASE_B.map((v) => v + shift);

  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const meanA = mean(GROUP_A), meanB = mean(groupB);
  const diff = Math.abs(meanB - meanA);
  const spread = 2; // approx MAD for these sets
  const separation = diff / spread;

  const x = (v: number) => PAD + v * STEP;
  const dots = (arr: number[], color: string, baseY: number) => {
    const counts: Record<number, number> = {};
    return arr.slice().sort((a, b) => a - b).map((v, i) => {
      counts[v] = (counts[v] || 0) + 1;
      return <circle key={i} cx={x(v)} cy={baseY - (counts[v] - 1) * 11} r={5} fill={color} />;
    });
  };

  return (
    <div className="prose-lesson max-w-none">
      <p>
        To compare two groups, look at how much their <strong>distributions
        overlap</strong>. If the <strong>centers</strong>{" "}are far apart compared to
        the <strong>spread</strong>, the difference is meaningful. If they overlap a
        lot, it may not be.
      </p>

      <Figure caption="Two groups on one axis. Slide group B and watch the overlap — and the gap between means.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <svg width={W} height={150} viewBox={`0 0 ${W} 150`} className="mx-auto" role="img" aria-label="two dot plots">
              <line x1={PAD} y1={120} x2={W - PAD} y2={120} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: MAXX + 1 }, (_, i) => (i % 2 === 0 ? <text key={i} x={x(i)} y={138} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{i}</text> : null))}
              {dots(GROUP_A, A, 112)}
              {dots(groupB, B, 60)}
              {/* mean markers */}
              <polygon points={`${x(meanA)},116 ${x(meanA) - 5},126 ${x(meanA) + 5},126`} fill={A} />
              <polygon points={`${x(meanB)},64 ${x(meanB) - 5},54 ${x(meanB) + 5},54`} fill={B} />
              <text x={x(meanA)} y={138} textAnchor="middle" fontSize={9} fill={A} fontFamily="var(--font-mono)"></text>
            </svg>
          </FigureScroll>

          <div className="grid grid-cols-3 gap-3 text-center">
            <Fact label="Mean A" value={meanA.toFixed(1)} color={A} />
            <Fact label="Mean B" value={meanB.toFixed(1)} color={B} />
            <Fact label="Gap ÷ spread" value={`${separation.toFixed(1)}×`} />
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {separation < 1 ? "The groups overlap a lot — the difference in means is small compared to the spread." : separation < 2 ? "Some overlap, but a noticeable difference in center." : "The groups barely overlap — a large, meaningful difference."}
          </p>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">shift group B: +{shift}</span>
            <input type="range" min={0} max={8} value={shift} onChange={(e) => setShift(Number(e.target.value))} className="w-56 accent-[var(--band-upper)]" aria-label="shift group B" />
          </div>
        </div>
      </Figure>

      <h2>Difference measured in spreads</h2>
      <p>
        The means differ by {diff.toFixed(1)}. Compared with the typical spread
        (about {spread}), that is roughly {separation.toFixed(1)} spreads apart. A
        gap that is large relative to the spread signals a real difference between
        the groups.
      </p>

      <MathCheck>
        <p>
          Comparing two populations (7.SP.B.3, B.4) means assessing the{" "}
          <strong>visual overlap</strong>{" "}of their distributions and expressing the
          difference in <strong>centers</strong>{" "}as a multiple of the{" "}
          <strong>variability</strong>. A difference in means that is several
          spreads wide is meaningful; heavily overlapping distributions are not
          clearly different.
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
