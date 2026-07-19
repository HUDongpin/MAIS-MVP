"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const FILLS = ["var(--band-early)", "var(--band-middle)", "var(--band-high)", "var(--band-upper)"];
const WORD: Record<number, string> = { 2: "halves", 3: "thirds", 4: "fourths" };
const ONE: Record<number, string> = { 2: "half", 3: "third", 4: "fourth" };

const r3 = (n: number) => Math.round(n * 1000) / 1000;

function Pie({ parts }: { parts: number }) {
  const cx = 85, cy = 85, r = 70;
  const slices = [];
  for (let i = 0; i < parts; i++) {
    const a0 = (i / parts) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / parts) * 2 * Math.PI - Math.PI / 2;
    const p0 = `${r3(cx + r * Math.cos(a0))},${r3(cy + r * Math.sin(a0))}`;
    const p1 = `${r3(cx + r * Math.cos(a1))},${r3(cy + r * Math.sin(a1))}`;
    const large = 1 / parts > 0.5 ? 1 : 0;
    slices.push(<path key={i} d={`M ${cx} ${cy} L ${p0} A ${r} ${r} 0 ${large} 1 ${p1} Z`} fill={FILLS[i]} fillOpacity={0.85} stroke="var(--surface)" strokeWidth={2} />);
  }
  return <g>{slices}<circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--ink-soft)" strokeWidth={2} /></g>;
}

function RectStrips({ parts, vertical }: { parts: number; vertical: boolean }) {
  const x = 8, y = 30, w = 154, h = 110;
  const strips = Array.from({ length: parts }, (_, i) =>
    vertical
      ? <rect key={i} x={x + (i * w) / parts} y={y} width={w / parts} height={h} fill={FILLS[i]} fillOpacity={0.85} stroke="var(--surface)" strokeWidth={2} />
      : <rect key={i} x={x} y={y + (i * h) / parts} width={w} height={h / parts} fill={FILLS[i]} fillOpacity={0.85} stroke="var(--surface)" strokeWidth={2} />,
  );
  return <g>{strips}<rect x={x} y={y} width={w} height={h} fill="none" stroke="var(--ink-soft)" strokeWidth={2} /></g>;
}

export default function Lesson() {
  const [shape, setShape] = useState<"circle" | "rect">("circle");
  const [parts, setParts] = useState(3);
  const [vertical, setVertical] = useState(true);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A whole can be split into <strong>2 halves</strong>,{" "}
        <strong>3 thirds</strong>, or <strong>4 fourths</strong>{" "}— always{" "}
        <strong>equal shares</strong>. And equal shares of the same whole can even
        be different <em>shapes</em>, as long as they cover the same amount.
      </p>

      <Figure caption="Halves, thirds, or fourths — every piece is an equal share of the whole.">
        <div className="flex flex-col items-center gap-6">
          <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label={`${shape} in ${parts} equal ${WORD[parts]}`}>
            {shape === "circle" ? <Pie parts={parts} /> : <RectStrips parts={parts} vertical={vertical} />}
          </svg>

          <div className="text-center">
            <div className="text-2xl font-black">{parts} equal parts = <span style={{ color: FILLS[0] }}>{WORD[parts]}</span></div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">Each piece is <strong>one {ONE[parts]}</strong>{" "}of the whole.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              {(["circle", "rect"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setShape(s)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={shape === s ? { background: FILLS[0], color: "white", borderColor: FILLS[0] } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s === "circle" ? "Circle" : "Rectangle"}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {[2, 3, 4].map((p) => (
                <button key={p} type="button" onClick={() => setParts(p)} className="rounded-lg border px-3 py-1.5 text-sm font-bold capitalize" style={parts === p ? { background: FILLS[1], color: "white", borderColor: FILLS[1] } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{WORD[p]}</button>
              ))}
            </div>
            {shape === "rect" && (
              <button type="button" onClick={() => setVertical((v) => !v)} className="rounded-lg border-2 px-3 py-1.5 text-sm font-bold" style={{ borderColor: FILLS[2], color: FILLS[2] }}>
                cut {vertical ? "↔ across" : "↕ down"}
              </button>
            )}
          </div>
          {shape === "rect" && (
            <p className="m-0 text-center text-sm text-[var(--ink-faint)]">
              Cutting across or down both make {WORD[parts]} — different shapes, same-size shares.
            </p>
          )}
        </div>
      </Figure>

      <h2>Equal, even if they look different</h2>
      <p>
        Whether you slice a rectangle into strips going across or down, each of
        the {parts} pieces holds the same amount. Equal shares must be the same{" "}
        <em>size</em>, but not always the same <em>shape</em>.
      </p>

      <MathCheck>
        <p>
          Partitioning circles and rectangles into two, three, or four equal
          shares — <strong>halves, thirds, fourths</strong>{" "}— and describing the
          whole as two halves, three thirds, or four fourths is 2.G.A.3. A key
          idea: <strong>equal shares of identical wholes need not have the same
          shape</strong>, only the same size.
        </p>
      </MathCheck>
    </div>
  );
}
