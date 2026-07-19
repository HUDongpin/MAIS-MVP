"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const FILL = "var(--band-upper)";
const YES = "var(--band-upper)";

const CATS = ["Quadrilateral", "Parallelogram", "Rectangle", "Rhombus", "Square"];
type Shape = { key: string; name: string; points: string; member: boolean[] };
const SHAPES: Shape[] = [
  { key: "trap", name: "Trapezoid", points: "50,120 150,120 120,40 80,40", member: [true, false, false, false, false] },
  { key: "para", name: "Parallelogram", points: "40,120 130,120 160,40 70,40", member: [true, true, false, false, false] },
  { key: "rect", name: "Rectangle", points: "40,45 160,45 160,115 40,115", member: [true, true, true, false, false] },
  { key: "rhom", name: "Rhombus", points: "100,35 155,80 100,125 45,80", member: [true, true, false, true, false] },
  { key: "square", name: "Square", points: "55,35 145,35 145,125 55,125", member: [true, true, true, true, true] },
];

export default function Lesson() {
  const [idx, setIdx] = useState(4);
  const s = SHAPES[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Shapes live in a <strong>hierarchy</strong>{" "}— categories inside
        categories. When a shape belongs to a category, it inherits{" "}
        <strong>all</strong>{" "}that category&apos;s attributes. That is why{" "}
        <em>every square is also a rectangle</em>.
      </p>

      <Figure caption="Pick a shape. The checklist shows every category it belongs to.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {SHAPES.map((sh, i) => (
              <button key={sh.key} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: FILL, color: "white", borderColor: FILL } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{sh.name}</button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <svg width="200" height="160" viewBox="0 0 200 160" role="img" aria-label={s.name}>
              <polygon points={s.points} fill={FILL} fillOpacity={0.8} stroke="var(--ink)" strokeWidth={2.5} />
            </svg>

            <div className="flex flex-col gap-1.5">
              {CATS.map((cat, i) => (
                <div key={cat} className="flex items-center gap-2 text-[15px]">
                  <span className="grid h-5 w-5 place-items-center rounded-full text-xs font-black text-white" style={{ background: s.member[i] ? YES : "var(--surface-2)", color: s.member[i] ? "white" : "var(--ink-faint)" }}>{s.member[i] ? "✓" : "✗"}</span>
                  <span className={s.member[i] ? "font-bold" : "text-[var(--ink-faint)]"}>{cat}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="m-0 max-w-md text-center text-[15px] font-semibold text-[var(--ink-soft)]">
            A {s.name.toLowerCase()} is {CATS.filter((_, i) => s.member[i]).length > 1 ? "also a " + CATS.filter((c, i) => s.member[i] && c !== s.name).map((c) => c.toLowerCase()).join(", ") : "a quadrilateral"}.
          </p>
        </div>
      </Figure>

      <h2>Attributes pass down</h2>
      <p>
        A rectangle has four right angles. A square has four right angles too —
        <em>because</em>{" "}it is a rectangle. Belonging to a category means having
        every attribute of that category, all the way up the hierarchy to
        &ldquo;quadrilateral.&rdquo;
      </p>

      <MathCheck>
        <p>
          Attributes of a category of shapes belong to <strong>all</strong>{" "}
          subcategories (5.G.B.3), so figures can be classified in a{" "}
          <strong>hierarchy</strong>{" "}(5.G.B.4). Every square is a rectangle, a
          rhombus, a parallelogram, and a quadrilateral — it inherits the defining
          properties of each larger category it sits inside.
        </p>
      </MathCheck>
    </div>
  );
}
