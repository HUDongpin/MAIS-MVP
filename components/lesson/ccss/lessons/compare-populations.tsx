"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";
import {
  relationForDisplayedValue,
  spokenRelationForDisplayedValue,
} from "@/components/lesson/ccss/numberPresentation";

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
  const mad = (arr: number[]) => {
    const center = mean(arr);
    return arr.reduce((s, v) => s + Math.abs(v - center), 0) / arr.length;
  };
  const meanA = mean(GROUP_A), meanB = mean(groupB);
  const diff = Math.abs(meanB - meanA);
  // A horizontal shift does not alter variability. Compute the actual MAD from
  // the dots instead of using 2, almost twice the true 50/49.
  const spread = (mad(GROUP_A) + mad(groupB)) / 2;
  const separation = diff / spread;
  const meanADisplay = meanA.toFixed(1);
  const meanBDisplay = meanB.toFixed(1);
  const diffDisplay = diff.toFixed(1);
  const spreadDisplay = spread.toFixed(2);
  const separationDisplay = separation.toFixed(1);
  const meanARelation = relationForDisplayedValue(meanA, meanADisplay);
  const meanBRelation = relationForDisplayedValue(meanB, meanBDisplay);
  const separationRelation = relationForDisplayedValue(separation, separationDisplay);
  const meanASpokenRelation = spokenRelationForDisplayedValue(meanA, meanADisplay);
  const meanBSpokenRelation = spokenRelationForDisplayedValue(meanB, meanBDisplay);
  const spreadSpokenRelation = spokenRelationForDisplayedValue(spread, spreadDisplay);
  const separationSpokenRelation = spokenRelationForDisplayedValue(separation, separationDisplay);
  const separationAdverb = separationRelation === "=" ? "exactly" : "approximately";

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
        the <strong>spread</strong>, the displayed samples are more separated. If
        they overlap a lot, their centers are less distinct relative to their
        variability.
      </p>

      <Figure caption="Two groups on one axis. Slide group B and watch the overlap — and the gap between means.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <svg width={W} height={150} viewBox={`0 0 ${W} 150`} className="mx-auto" role="img" aria-label={`Two dot plots on a common axis: group A mean ${meanASpokenRelation} ${meanADisplay}, group B mean ${meanBSpokenRelation} ${meanBDisplay}`}>
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
            <Fact label="Mean A" value={`${meanARelation} ${meanADisplay}`} ariaValue={`Mean A ${meanASpokenRelation} ${meanADisplay}`} color={A} />
            <Fact label="Mean B" value={`${meanBRelation} ${meanBDisplay}`} ariaValue={`Mean B ${meanBSpokenRelation} ${meanBDisplay}`} color={B} />
            <Fact label="Gap ÷ MAD" value={`${separationRelation} ${separationDisplay}×`} ariaValue={`Gap divided by mean absolute deviation ${separationSpokenRelation} ${separationDisplay}`} />
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            {separation < 1 ? "The groups overlap a lot — the difference in means is small compared with the MAD." : separation < 2 ? "Some overlap, with a visible difference in center." : "The displayed samples have little overlap and well-separated centers."}
          </p>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">shift group B: +{shift}</span>
            <input type="range" min={0} max={8} value={shift} onChange={(e) => setShift(Number(e.target.value))} className="w-56 accent-[var(--band-upper)]" aria-label="shift group B" />
          </div>
        </div>
      </Figure>

      <h2>Difference measured in spreads</h2>
      <p>
        The means differ by {diffDisplay}. Their mean absolute deviation{" "}
        {spreadSpokenRelation} {spreadDisplay} (nearest hundredth), so the centers are
        {" "}{separationAdverb} {separationDisplay} MADs apart. This describes separation
        in the displayed samples; deciding whether
        a population difference is statistically significant needs an inferential
        method and information about how the samples were obtained.
      </p>

      <MathCheck>
        <p>
          Comparing two populations (7.SP.B.3, B.4) means assessing the{" "}
          <strong>visual overlap</strong>{" "}of their distributions and expressing the
          difference in <strong>centers</strong>{" "}as a multiple of the{" "}
          <strong>variability</strong>, such as the mean absolute deviation. This is
          an informal comparison of the displayed distributions, not by itself a
          significance test or a causal conclusion.
        </p>
      </MathCheck>
    </div>
  );
}

function Fact({ label, value, ariaValue, color }: { label: string; value: string; ariaValue: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</div>
      <div className="font-mono text-xl font-black" style={color ? { color } : undefined} aria-label={ariaValue}>{value}</div>
    </div>
  );
}
