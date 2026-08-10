"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A_COL = "var(--band-high)";
const B_COL = "var(--band-upper)";
const r2 = (n: number) => Math.round(n * 100) / 100;

const A = [6, 7, 7, 8, 8, 8, 9, 9, 10];
const B = [2, 5, 7, 8, 8, 9, 11, 13, 15];

function stats(a: number[]) {
  const mean = a.reduce((s, x) => s + x, 0) / a.length;
  const s = [...a].sort((x, y) => x - y);
  const med = s[(s.length - 1) / 2];
  const range = s[s.length - 1] - s[0];
  // Compute spread from the exact mean; round only the value presented to the learner.
  const variance = a.reduce((acc, x) => acc + (x - mean) ** 2, 0) / a.length;
  const sd = Math.sqrt(variance);
  return { mean, med, range, sd };
}

function roundedStat(value: number) {
  const rounded = r2(value);
  return `${Math.abs(value - rounded) < 1e-9 ? "" : "≈ "}${rounded}`;
}

export default function Lesson() {
  const [outlier, setOutlier] = useState(false);
  const bData = outlier ? [...B.slice(0, -1), 40] : B;
  const sa = stats(A), sb = stats(bData);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two classes take the same quiz. Their <strong>centers</strong>{" "}might match
        while their <strong>spreads</strong>{" "}differ wildly. Comparing distributions
        means looking at both — and being careful, because a single{" "}
        <strong>outlier</strong>{" "}can drag the mean far more than the median.
      </p>

      {/* The figure is two panels of summary statistics and a button - there is
          no dot plot to look "clustered" or "spread out". */}
      <Figure caption={outlier
        ? "Class B now has an extreme score of 40. Compare how its center and spread changed."
        : "Before introducing an extreme score, compare the two classes' centers and spreads."}>
        <div className="flex flex-col items-center gap-6">
          <div className="grid w-full max-w-lg grid-cols-2 gap-4">
            <div className="rounded-xl border-2 p-3" style={{ borderColor: A_COL }}>
              <div className="text-center text-xs font-bold uppercase" style={{ color: A_COL }}>Class A</div>
              <Row label="mean" value={roundedStat(sa.mean)} /><Row label="median" value={sa.med} /><Row label="range" value={sa.range} /><Row label="population SD" value={roundedStat(sa.sd)} />
            </div>
            <div className="rounded-xl border-2 p-3" style={{ borderColor: B_COL }}>
              <div className="text-center text-xs font-bold uppercase" style={{ color: B_COL }}>Class B</div>
              <Row label="mean" value={roundedStat(sb.mean)} /><Row label="median" value={sb.med} /><Row label="range" value={sb.range} /><Row label="population SD" value={roundedStat(sb.sd)} />
            </div>
          </div>
          <p className="m-0 text-center text-xs text-[var(--ink-faint)]">≈ marks a mean or population standard deviation rounded to the nearest hundredth.</p>

          <button type="button" onClick={() => setOutlier((v) => !v)} className="rounded-lg border-2 px-4 py-2 text-sm font-bold" style={{ borderColor: B_COL, color: B_COL }}>
            {outlier ? "Restore Class B's score of 15" : "Replace Class B's score of 15 with 40"}
          </button>

          <p className="m-0 max-w-md text-center text-sm text-[var(--ink-soft)]">
            {outlier
              ? `The outlier pushes Class B's mean to ${roundedStat(sb.mean)} but the median stays ${sb.med} — the median resists outliers.`
              : "Both classes center near 8, but Class B's larger population standard deviation shows it is much more variable."}
          </p>
        </div>
      </Figure>

      <h2>Center, spread, and outliers</h2>
      <p>
        {outlier
          ? <>After replacing 15 with 40, Class B&apos;s mean is {roundedStat(sb.mean)}, far from Class A&apos;s {roundedStat(sa.mean)}, while its median remains {sb.med}. </>
          : <>Before the replacement, the classes have similar centers, but Class B&apos;s population standard deviation ({roundedStat(sb.sd)}) is larger than Class A&apos;s ({roundedStat(sa.sd)}). </>}
        When an outlier appears, compare <strong>median and IQR</strong>{" "}(resistant)
        with <strong>mean and standard deviation</strong>{" "}(sensitive), and explain
        why the summaries differ. This summary-card panel isolates center, spread,
        and outlier effects; it does not display distribution shape. A full
        comparison also needs a dot plot, histogram, or another distribution plot
        to inspect shape.
      </p>

      <MathCheck>
        <p>
          Comparing data sets uses <strong>center</strong>{" "}(mean, median) and{" "}
          <strong>spread</strong>{" "}(range, IQR, standard deviation) (S-ID.2), and
          interprets differences in <strong>shape, center, and spread</strong>{" "}while
          accounting for <strong>outliers</strong>{" "}(S-ID.3). The median and IQR are
          resistant to extreme values; the mean and standard deviation are not.
          This panel shows center and spread summaries only, so a distribution plot
          is still needed before making a claim about shape.
        </p>
      </MathCheck>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between font-mono text-sm">
      <span className="text-[var(--ink-faint)]">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}
