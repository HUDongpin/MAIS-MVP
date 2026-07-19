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
  const mean = r2(a.reduce((s, x) => s + x, 0) / a.length);
  const s = [...a].sort((x, y) => x - y);
  const med = s[(s.length - 1) / 2];
  const range = s[s.length - 1] - s[0];
  const variance = a.reduce((acc, x) => acc + (x - mean) ** 2, 0) / a.length;
  const sd = r2(Math.sqrt(variance));
  return { mean, med, range, sd };
}

export default function Lesson() {
  const [outlier, setOutlier] = useState(false);
  const bData = outlier ? [...B.slice(0, 8), 40] : B;
  const sa = stats(A), sb = stats(bData);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Two classes take the same quiz. Their <strong>centers</strong>{" "}might match
        while their <strong>spreads</strong>{" "}differ wildly. Comparing distributions
        means looking at both — and being careful, because a single{" "}
        <strong>outlier</strong>{" "}can drag the mean far more than the median.
      </p>

      <Figure caption="Class A is tightly clustered; Class B is spread out. Same center, different consistency.">
        <div className="flex flex-col items-center gap-6">
          <div className="grid w-full max-w-lg grid-cols-2 gap-4">
            <div className="rounded-xl border-2 p-3" style={{ borderColor: A_COL }}>
              <div className="text-center text-xs font-bold uppercase" style={{ color: A_COL }}>Class A</div>
              <Row label="mean" value={sa.mean} /><Row label="median" value={sa.med} /><Row label="range" value={sa.range} /><Row label="std dev" value={sa.sd} />
            </div>
            <div className="rounded-xl border-2 p-3" style={{ borderColor: B_COL }}>
              <div className="text-center text-xs font-bold uppercase" style={{ color: B_COL }}>Class B</div>
              <Row label="mean" value={sb.mean} /><Row label="median" value={sb.med} /><Row label="range" value={sb.range} /><Row label="std dev" value={sb.sd} />
            </div>
          </div>

          <button type="button" onClick={() => setOutlier((v) => !v)} className="rounded-lg border-2 px-4 py-2 text-sm font-bold" style={{ borderColor: B_COL, color: B_COL }}>
            {outlier ? "Remove Class B's outlier (40)" : "Add an outlier (40) to Class B"}
          </button>

          <p className="m-0 max-w-md text-center text-sm text-[var(--ink-soft)]">
            {outlier
              ? `The outlier pushes Class B's mean to ${sb.mean} but the median stays ${sb.med} — the median resists outliers.`
              : "Both classes center near 8, but Class B's larger std dev shows it's far less consistent."}
          </p>
        </div>
      </Figure>

      <h2>Center, spread, and outliers</h2>
      <p>
        Class A and B have similar centers, but B&apos;s standard deviation ({sb.sd})
        dwarfs A&apos;s ({sa.sd}) — B&apos;s scores are far more variable. When an
        outlier appears, prefer <strong>median and IQR</strong>{" "}(resistant) over{" "}
        <strong>mean and standard deviation</strong>{" "}(sensitive). Always describe
        shape, center, <em>and</em>{" "}spread together.
      </p>

      <MathCheck>
        <p>
          Comparing data sets uses <strong>center</strong>{" "}(mean, median) and{" "}
          <strong>spread</strong>{" "}(range, IQR, standard deviation) (S-ID.2), and
          interprets differences in <strong>shape, center, and spread</strong>{" "}while
          accounting for <strong>outliers</strong>{" "}(S-ID.3). The median and IQR are
          resistant to extreme values; the mean and standard deviation are not.
        </p>
      </MathCheck>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between font-mono text-sm">
      <span className="text-[var(--ink-faint)]">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}
