"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const FILL = "var(--band-upper)";

type Shape = { key: string; name: string; points: string; attrs: string };
const SHAPES: Shape[] = [
  { key: "square", name: "Square", points: "45,25 145,25 145,125 45,125", attrs: "4 equal sides · 4 right angles · it's a rectangle AND a rhombus" },
  { key: "rect", name: "Rectangle", points: "25,40 165,40 165,110 25,110", attrs: "4 right angles · opposite sides equal" },
  { key: "rhombus", name: "Rhombus", points: "95,20 160,75 95,130 30,75", attrs: "4 equal sides · opposite sides parallel" },
  { key: "trap", name: "Trapezoid", points: "55,30 135,30 165,120 25,120", attrs: "exactly one pair of parallel sides" },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const shape = SHAPES[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>quadrilateral</strong>{" "}is any shape with <strong>4 straight
        sides</strong>. That shared attribute makes a whole category — and inside
        it are special kinds like rectangles, rhombuses, and squares.
      </p>

      <Figure caption="Every shape here has 4 sides, so all are quadrilaterals. Each also has its own special traits.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {SHAPES.map((s, i) => (
              <button key={s.key} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: FILL, color: "white", borderColor: FILL } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s.name}</button>
            ))}
          </div>

          <svg width="190" height="150" viewBox="0 0 190 150" role="img" aria-label={shape.name}>
            <polygon points={shape.points} fill={FILL} fillOpacity={0.82} stroke="var(--ink)" strokeWidth={2.5} />
          </svg>

          <div className="text-center">
            <div className="text-2xl font-black" style={{ color: FILL }}>{shape.name}</div>
            <p className="mt-1 max-w-md text-[15px] text-[var(--ink-soft)]">{shape.attrs}</p>
          </div>
        </div>
      </Figure>

      <h2>Categories inside categories</h2>
      <p>
        All four shapes are quadrilaterals because they share &ldquo;4
        sides.&rdquo; A <strong>square</strong>{" "}is special: it has 4 right angles{" "}
        <em>and</em>{" "}4 equal sides, so it belongs to the rectangle family and the
        rhombus family at once.
      </p>

      <MathCheck>
        <p>
          Shapes are grouped into categories by <strong>shared attributes</strong>{" "}
          (3.G.A.1). &ldquo;4 sides&rdquo; defines the quadrilaterals; adding
          &ldquo;4 right angles&rdquo; gives rectangles; adding &ldquo;4 equal
          sides&rdquo; gives rhombuses; a <strong>square</strong>{" "}has both, so it
          is a rectangle and a rhombus. Larger categories contain the special
          ones.
        </p>
      </MathCheck>
    </div>
  );
}
