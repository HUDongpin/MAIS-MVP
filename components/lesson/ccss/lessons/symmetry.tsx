"use client";

import { useState, type ReactNode } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const FILL = "var(--band-upper)";
const LINE = "var(--band-early)";

type Shape = { key: string; name: string; count: number; shape: ReactNode; lines: ReactNode };
const dash = (x1: number, y1: number, x2: number, y2: number, key: string) => (
  <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={LINE} strokeWidth={2} strokeDasharray="5 4" />
);

const SHAPES: Shape[] = [
  {
    key: "square", name: "Square", count: 4,
    shape: <rect x={45} y={25} width={110} height={110} fill={FILL} fillOpacity={0.75} stroke="var(--ink)" strokeWidth={2} />,
    lines: <>{dash(100, 15, 100, 145, "v")}{dash(35, 80, 165, 80, "h")}{dash(45, 25, 155, 135, "d1")}{dash(155, 25, 45, 135, "d2")}</>,
  },
  {
    key: "rect", name: "Rectangle", count: 2,
    shape: <rect x={25} y={45} width={150} height={70} fill={FILL} fillOpacity={0.75} stroke="var(--ink)" strokeWidth={2} />,
    lines: <>{dash(100, 35, 100, 125, "v")}{dash(15, 80, 185, 80, "h")}</>,
  },
  {
    key: "tri", name: "Equilateral triangle", count: 3,
    // Was "100,20 160,135 40,135": sides 129.711 / 120.000 / 129.711 and angles
    // 55.11 / 62.45 / 62.45 — labelled equilateral, drawn isosceles, in the one
    // lesson about symmetry where the three fold lines depend on it. The apex
    // is now at the true equilateral height, 135 − 60√3 = 31.077.
    shape: <polygon points="100,31.08 160,135 40,135" fill={FILL} fillOpacity={0.75} stroke="var(--ink)" strokeWidth={2} />,
    lines: <>{dash(100, 23, 100, 135, "a")}{dash(40, 135, 130, 83.04, "b")}{dash(160, 135, 70, 83.04, "c")}</>,
  },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);
  const s = SHAPES[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>line of symmetry</strong>{" "}folds a shape into two matching
        halves — each is a mirror image of the other. Some shapes have several
        lines of symmetry; some have none.
      </p>

      <Figure caption="The dashed lines are folds where the two halves match exactly.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {SHAPES.map((sh, i) => (
              <button key={sh.key} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: FILL, color: "white", borderColor: FILL } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{sh.name}</button>
            ))}
          </div>

          <svg width="200" height="160" viewBox="0 0 200 160" role="img" aria-label={show ? `${s.name} with its ${s.count} lines of symmetry drawn as dashed folds` : `${s.name} with no fold lines shown`}>
            {s.shape}
            {show && s.lines}
          </svg>

          <div className="text-center">
            <div className="text-2xl font-black" style={{ color: FILL }}>{s.name}</div>
            <div className="mt-1 text-[15px] text-[var(--ink-soft)]">
              <strong style={{ color: LINE }}>{s.count}</strong>{" "}line{s.count === 1 ? "" : "s"} of symmetry
            </div>
          </div>

          <button type="button" onClick={() => setShow((v) => !v)} className="rounded-lg border-2 px-4 py-1.5 text-sm font-bold" style={{ borderColor: LINE, color: LINE }}>
            {show ? "Hide fold lines" : "Show fold lines"}
          </button>
        </div>
      </Figure>

      <h2>Fold and match</h2>
      <p>
        If you fold along a line of symmetry, the two halves land exactly on top
        of each other. A square has {SHAPES[0].count} such lines; a rectangle has
        only {SHAPES[1].count}, because its diagonals do <em>not</em>{" "}match up.
      </p>

      <MathCheck>
        <p>
          A <strong>line of symmetry</strong>{" "}divides a figure into two parts that
          are mirror images — folding across it makes the halves coincide
          (4.G.A.3). Different shapes have different numbers of them: an
          equilateral triangle has 3, a square has 4, and many shapes have none at
          all.
        </p>
      </MathCheck>
    </div>
  );
}
