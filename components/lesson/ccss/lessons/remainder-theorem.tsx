"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const ACCENT = "var(--band-high)";
const XR = 4; // x from -XR..XR
const YR = 8;
const PXX = 34;
const PXY = 15;
const PAD = 28;
const W = 2 * XR * PXX + 2 * PAD;
const H = 2 * YR * PXY + 2 * PAD;

export default function Lesson() {
  const [roots, setRoots] = useState([-2, 1, 3]);
  const [a, setA] = useState(0);

  const p = (x: number) => roots.reduce((prod, r) => prod * (x - r), 1);
  const pa = p(a);
  // A negative root must fold into the sign: "(x − -2)" is not how a factor is
  // written, and the default roots include -2, so it showed on first load.
  const factor = (r: number) => (r < 0 ? `(x + ${-r})` : `(x − ${r})`);

  const sx = (x: number) => PAD + (x + XR) * PXX;
  const sy = (y: number) => PAD + (YR - Math.max(-YR, Math.min(YR, y))) * PXY;

  const pts: string[] = [];
  for (let x = -XR; x <= XR + 0.001; x += 0.1) {
    const y = p(x);
    if (y >= -YR - 1 && y <= YR + 1) pts.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
  }

  const setRoot = (i: number, v: number) => setRoots((rs) => rs.map((r, ri) => (ri === i ? v : r)));
  // Nothing stops two steppers from holding the same value, and at a repeated
  // root the curve touches the axis and turns back instead of crossing — which
  // the caption and the paragraph below both used to deny.
  const distinct = Array.from(new Set(roots)).sort((x, y) => x - y);
  const repeated = distinct.length < roots.length;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Dividing a polynomial p(x) by (x − a) leaves a remainder — and that
        remainder is simply <strong>p(a)</strong>. So <strong>p(a) = 0 means
        (x − a) is a factor</strong>, and the <strong>zeros</strong>{" "}are exactly
        where the graph crosses the x-axis.
      </p>

      <Figure caption="The curve meets the x-axis at each root. Evaluating p(a) gives the remainder on dividing by (x − a).">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto max-w-full" style={{ maxHeight: 320 }} role="img" aria-label="cubic polynomial graph">
              <line x1={sx(-XR)} y1={sy(0)} x2={sx(XR)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
              <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: 2 * XR + 1 }, (_, i) => i - XR).map((x) => (
                <text key={x} x={sx(x)} y={sy(0) + 14} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{x}</text>
              ))}
              <polyline points={pts.join(" ")} fill="none" stroke={ACCENT} strokeWidth={2.5} />
              {roots.map((r, i) => (
                <circle key={i} cx={sx(r)} cy={sy(0)} r={5} fill={ACCENT} stroke="white" strokeWidth={1.5} />
              ))}
              {/* point at a */}
              <circle cx={sx(a)} cy={sy(Math.max(-YR, Math.min(YR, pa)))} r={5} fill="var(--band-upper)" stroke="white" strokeWidth={1.5} />
              <line x1={sx(a)} y1={sy(0)} x2={sx(a)} y2={sy(Math.max(-YR, Math.min(YR, pa)))} stroke="var(--band-upper)" strokeWidth={1} strokeDasharray="3 2" />
            </svg>
          </FigureScroll>

          <div className="flex flex-wrap items-center justify-center gap-4 font-mono">
            <span>p(x) = {roots.map(factor).join("")}</span>
          </div>
          <div className="rounded-xl border-2 px-6 py-2 text-center font-mono" style={{ borderColor: "var(--band-upper)" }}>
            p({a}) = <strong style={{ color: "var(--band-upper)" }}>{pa}</strong>
            <span className="ml-2 text-xs text-[var(--ink-faint)]">= remainder when dividing by {factor(a)}{pa === 0 ? ` → ${factor(a)} is a factor!` : ""}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {roots.map((r, i) => <Stepper key={i} label={`root ${i + 1}`} value={r} onChange={(v) => setRoot(i, v)} />)}
            <Stepper label="a" value={a} onChange={setA} accent />
          </div>
        </div>
      </Figure>

      <h2>Zeros build the graph</h2>
      <p>
        Because p(a) is the remainder, checking a value tells you instantly whether
        (x − a) divides evenly. The zeros {distinct.join(", ")} are where p meets
        zero.{" "}
        {repeated
          ? "A zero that appears twice is a point where the curve touches the axis and turns back instead of crossing, so the sign of p is the same on both sides of it."
          : "Between them the sign of p can’t change without a crossing — so the roots alone sketch the curve’s shape."}
      </p>

      <MathCheck>
        <p>
          The <strong>Remainder Theorem</strong>{" "}says dividing p(x) by (x − a)
          gives remainder p(a) (A-APR.2); hence a is a zero exactly when (x − a) is
          a factor. Knowing the <strong>zeros</strong>{" "}lets you construct a rough
          graph (A-APR.3) — the curve crosses the x-axis at each root and keeps its
          sign between them.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange, accent }: { label: string; value: number; onChange: (n: number) => void; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(-4, value - 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-lg font-black tabular-nums" style={{ color: accent ? "var(--band-upper)" : ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(4, value + 1))} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
