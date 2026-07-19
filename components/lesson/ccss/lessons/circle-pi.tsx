"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const PXU = 24; // px per unit for the circle
const SEG = 140; // px per diameter on the "unrolled" bar

export default function Lesson() {
  const [r, setR] = useState(4);

  const d = 2 * r;
  const C = 2 * Math.PI * r;
  const A = Math.PI * r * r;

  // circle svg
  const rad = r * PXU;
  const cx = 150;
  const cy = 150;
  const box = 300;

  // unrolled circumference bar: length = π diameters (constant for every circle)
  const barW = Math.PI * SEG; // ≈ 3.14159 diameters
  const barH = 34;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Every circle hides the same magic number. If you measure the distance
        around a circle (the <strong>circumference</strong>) and divide by the
        distance across it (the <strong>diameter</strong>), you always get the
        same value — a little more than 3. We call it{" "}
        <strong>π (pi) ≈ 3.14159</strong>.
      </p>

      <Figure caption="The bar below is the circumference “unrolled.” It is always about 3.14 diameters long — for any size circle.">
        <div className="flex flex-col items-center gap-6">
          <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="max-w-full" style={{ maxHeight: 280 }} role="img" aria-label={`Circle with radius ${r}`}>
            <circle cx={cx} cy={cy} r={rad} fill={ACCENT} fillOpacity={0.14} stroke={ACCENT} strokeWidth={3} />
            {/* diameter */}
            <line x1={cx - rad} y1={cy} x2={cx + rad} y2={cy} stroke={ACCENT} strokeWidth={2} strokeDasharray="5 4" />
            {/* radius */}
            <line x1={cx} y1={cy} x2={cx + rad} y2={cy} stroke="var(--band-high)" strokeWidth={2.5} />
            <circle cx={cx} cy={cy} r={3.5} fill="var(--ink)" />
            <text x={cx + rad / 2} y={cy - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--band-high)" fontFamily="var(--font-mono)">
              r = {r}
            </text>
            <text x={cx} y={cy + 20} textAnchor="middle" fontSize={12} fontWeight={700} fill={ACCENT} fontFamily="var(--font-mono)">
              d = {d}
            </text>
          </svg>

          {/* unrolled circumference */}
          <div className="w-full overflow-x-auto">
            <svg width={barW + 4} height={barH + 30} viewBox={`0 0 ${barW + 4} ${barH + 30}`} className="mx-auto max-w-full" role="img" aria-label="Circumference unrolled into diameter lengths">
              <g transform="translate(2,2)">
                {[0, 1, 2].map((i) => (
                  <rect key={i} x={i * SEG} y={0} width={SEG} height={barH} fill={ACCENT} opacity={i % 2 === 0 ? 0.85 : 0.6} stroke="var(--surface)" strokeWidth={2} />
                ))}
                {/* the 0.14 stub */}
                <rect x={3 * SEG} y={0} width={barW - 3 * SEG} height={barH} fill="var(--band-high)" opacity={0.8} stroke="var(--surface)" strokeWidth={2} />
                {[0, 1, 2].map((i) => (
                  <text key={i} x={i * SEG + SEG / 2} y={barH + 18} textAnchor="middle" fontSize={11} fill="var(--ink-faint)" fontFamily="var(--font-mono)">
                    1 diameter
                  </text>
                ))}
                <text x={3 * SEG + (barW - 3 * SEG) / 2} y={barH + 18} textAnchor="middle" fontSize={11} fill="var(--band-high)" fontFamily="var(--font-mono)">
                  0.14
                </text>
              </g>
            </svg>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="C ÷ d" value="π ≈ 3.14159" note="always constant" highlight />
            <Stat label="Circumference" value={`2π(${r}) ≈ ${C.toFixed(2)}`} note="C = 2πr" />
            <Stat label="Area" value={`π(${r})² ≈ ${A.toFixed(2)}`} note="A = πr²" />
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
              Radius: <span className="text-[var(--ink)]">{r}</span>
            </span>
            <input
              type="range"
              min={1}
              max={6}
              value={r}
              onChange={(e) => setR(Number(e.target.value))}
              className="w-48 accent-[var(--band-middle)]"
              aria-label="Radius"
            />
          </div>
        </div>
      </Figure>

      <h2>Two formulas from one idea</h2>
      <p>
        Because the circumference is always <strong>π</strong>{" "}times the
        diameter, and the diameter is twice the radius, we get{" "}
        <strong>C = πd = 2πr</strong>. The area of the disk turns out to be{" "}
        <strong>A = πr²</strong>{" "}— the same π, now measuring the space inside.
      </p>

      <MathCheck>
        <p>
          For <em>every</em>{" "}circle, circumference ÷ diameter is the same
          constant, <strong>π</strong>{" "}— that is the definition of π (7.G.B.4).
          So circumference grows in exact proportion to diameter:{" "}
          <strong>C = πd = 2πr</strong>. The area is{" "}
          <strong>A = πr²</strong>; you can see why by slicing the disk into thin
          wedges and rearranging them into a shape that fills a rectangle of
          height r and width half the circumference (πr), giving πr × r = πr².
        </p>
      </MathCheck>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl border px-4 py-3 text-center"
      style={{
        borderColor: highlight ? "var(--band-middle)" : "var(--line)",
        background: highlight ? "color-mix(in oklab, var(--band-middle) 8%, var(--surface))" : "var(--surface)",
      }}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
      <div className="text-xs text-[var(--ink-faint)]">{note}</div>
    </div>
  );
}
