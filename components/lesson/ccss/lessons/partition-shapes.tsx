"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const C1 = "var(--band-early)";
const C2 = "var(--band-middle)";
const C3 = "var(--band-high)";
const C4 = "var(--band-upper)";
const FILLS = [C1, C2, C3, C4];

export default function Lesson() {
  const [shape, setShape] = useState<"circle" | "rect">("circle");
  const [parts, setParts] = useState<2 | 4>(2);

  const word = parts === 2 ? "halves" : "fourths";
  const one = parts === 2 ? "one half" : "one fourth (a quarter)";

  return (
    <div className="prose-lesson max-w-none">
      <p>
        We can cut a shape into <strong>equal shares</strong>{" "}— pieces that are
        exactly the same size. Two equal parts are <strong>halves</strong>. Four
        equal parts are <strong>fourths</strong>{" "}(also called quarters).
      </p>

      <Figure caption="Same shape, cut into equal shares. Each piece is one share of the whole.">
        <div className="flex flex-col items-center gap-6">
          <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label={`${shape === "rect" ? "Rectangle" : "Circle"} in ${parts} equal parts`}>
            {shape === "circle" ? (
              <CirclePartition parts={parts} />
            ) : (
              <RectPartition parts={parts} />
            )}
          </svg>

          <div className="text-center">
            <div className="text-2xl font-black">
              {parts} equal parts = <span style={{ color: C1 }}>{word}</span>
            </div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              Each piece is <strong>{one}</strong>{" "}of the whole shape.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              {(["circle", "rect"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setShape(s)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={shape === s ? { background: C1, color: "white", borderColor: C1 } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s === "circle" ? "Circle" : "Rectangle"}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {([2, 4] as const).map((p) => (
                <button key={p} type="button" onClick={() => setParts(p)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={parts === p ? { background: C2, color: "white", borderColor: C2 } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{p === 2 ? "Halves (2)" : "Fourths (4)"}</button>
              ))}
            </div>
          </div>
        </div>
      </Figure>

      <h2>More parts, smaller pieces</h2>
      <p>
        Cutting the <em>same</em>{" "}shape into 4 parts makes each piece{" "}
        <strong>smaller</strong>{" "}than cutting it into 2. A fourth is smaller than
        a half — even though four sounds bigger than two!
      </p>

      <MathCheck>
        <p>
          Partitioning circles and rectangles into <strong>two and four equal
          shares</strong>, and naming the shares <em>halves</em>{" "}and{" "}
          <em>fourths/quarters</em>, is 1.G.A.3. The shares must be{" "}
          <strong>equal</strong>{" "}in size. And decomposing a whole into more equal
          shares makes each share smaller — the seed of understanding fractions in
          later grades.
        </p>
      </MathCheck>
    </div>
  );
}

function CirclePartition({ parts }: { parts: 2 | 4 }) {
  const cx = 85, cy = 85, r = 70;
  if (parts === 2) {
    return (
      <g>
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`} fill={C1} opacity={0.85} />
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`} fill={C2} opacity={0.85} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--ink-soft)" strokeWidth={2} />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="var(--surface)" strokeWidth={2} />
      </g>
    );
  }
  // four quadrants
  const rd = (n: number) => Math.round(n * 1000) / 1000;
  const quad = (a0: number, fill: string) => {
    const a1 = a0 + 90;
    const p0 = [rd(cx + r * Math.cos((a0 * Math.PI) / 180)), rd(cy + r * Math.sin((a0 * Math.PI) / 180))];
    const p1 = [rd(cx + r * Math.cos((a1 * Math.PI) / 180)), rd(cy + r * Math.sin((a1 * Math.PI) / 180))];
    return <path d={`M ${cx} ${cy} L ${p0[0]} ${p0[1]} A ${r} ${r} 0 0 1 ${p1[0]} ${p1[1]} Z`} fill={fill} opacity={0.85} />;
  };
  return (
    <g>
      {quad(-90, FILLS[0])}
      {quad(0, FILLS[1])}
      {quad(90, FILLS[2])}
      {quad(180, FILLS[3])}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--ink-soft)" strokeWidth={2} />
    </g>
  );
}

function RectPartition({ parts }: { parts: 2 | 4 }) {
  const x = 15, y = 35, w = 140, h = 100;
  if (parts === 2) {
    return (
      <g>
        <rect x={x} y={y} width={w / 2} height={h} fill={C1} opacity={0.85} />
        <rect x={x + w / 2} y={y} width={w / 2} height={h} fill={C2} opacity={0.85} />
        <rect x={x} y={y} width={w} height={h} fill="none" stroke="var(--ink-soft)" strokeWidth={2} />
        <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="var(--surface)" strokeWidth={2} />
      </g>
    );
  }
  return (
    <g>
      <rect x={x} y={y} width={w / 2} height={h / 2} fill={FILLS[0]} opacity={0.85} />
      <rect x={x + w / 2} y={y} width={w / 2} height={h / 2} fill={FILLS[1]} opacity={0.85} />
      <rect x={x} y={y + h / 2} width={w / 2} height={h / 2} fill={FILLS[2]} opacity={0.85} />
      <rect x={x + w / 2} y={y + h / 2} width={w / 2} height={h / 2} fill={FILLS[3]} opacity={0.85} />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="var(--ink-soft)" strokeWidth={2} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="var(--surface)" strokeWidth={2} />
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke="var(--surface)" strokeWidth={2} />
    </g>
  );
}
