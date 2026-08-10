"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-early)";

type Shape = {
  name: string;
  sides: number;
  corners: number;
  definition: string;
  render: (fill: string) => ReactNode;
};

const SHAPES: Shape[] = [
  { name: "circle", sides: 0, corners: 0, definition: "a closed round curve with no straight sides or corners", render: (f) => <circle cx="70" cy="70" r="52" fill={f} /> },
  { name: "triangle", sides: 3, corners: 3, definition: "a closed flat shape with 3 straight sides", render: (f) => <polygon points="70,16 124,120 16,120" fill={f} /> },
  { name: "square", sides: 4, corners: 4, definition: "a closed flat shape with 4 equal straight sides and 4 right-angle corners", render: (f) => <rect x="20" y="20" width="100" height="100" fill={f} /> },
  { name: "rectangle", sides: 4, corners: 4, definition: "a closed flat shape with 4 straight sides and 4 right-angle corners", render: (f) => <rect x="10" y="38" width="120" height="64" fill={f} /> },
  { name: "hexagon", sides: 6, corners: 6, definition: "a closed flat shape with 6 straight sides", render: (f) => <polygon points="70,14 122,44 122,96 70,126 18,96 18,44" fill={f} /> },
];

export default function Lesson() {
  const [i, setI] = useState(2);
  const shape = SHAPES[i];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Shapes have names, and a shape keeps its name no matter how you{" "}
        <strong>turn</strong>{" "}it or how <strong>big</strong>{" "}it is. Straight
        sides and corners are two useful <strong>attributes</strong>. Some shapes
        share the same counts, so we also notice equal sides, right-angle
        corners, and curved edges.
      </p>

      <Figure caption="Pick a shape. Count its straight sides and its corners (vertices), then read the attributes that define it.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {SHAPES.map((s, si) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setI(si)}
                aria-pressed={si === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold capitalize"
                style={si === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}
              >
                {s.name}
              </button>
            ))}
          </div>

          <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`${shape.name}: ${shape.definition}`}>
            {shape.render(ACCENT)}
          </svg>

          <div className="text-center">
            <div className="text-3xl font-black capitalize">{shape.name}</div>
            <div className="mt-1 flex justify-center gap-6 text-lg font-bold">
              <span><span className="text-2xl" style={{ color: ACCENT }}>{shape.sides}</span> straight sides</span>
              <span><span className="text-2xl" style={{ color: ACCENT }}>{shape.corners}</span> corners</span>
            </div>
            <p className="mt-2 max-w-sm text-[15px] text-[var(--ink-soft)]">
              A {shape.name} is {shape.definition}.
            </p>
          </div>

          {/* flat vs solid */}
          <div className="flex items-center justify-center gap-6 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-5 py-3 text-center text-sm">
            <div>
              <div className="text-3xl">⬛</div>
              <div className="font-bold">flat (2-D)</div>
              <div className="text-xs text-[var(--ink-faint)]">like this shape</div>
            </div>
            <div className="text-2xl text-[var(--ink-faint)]">vs</div>
            <div>
              <div className="text-3xl">🧊</div>
              <div className="font-bold">solid (3-D)</div>
              <div className="text-xs text-[var(--ink-faint)]">a box you can hold</div>
            </div>
          </div>
        </div>
      </Figure>

      <h2>A shape is still itself, turned any way</h2>
      <p>
        A triangle pointing up, sideways, or upside down is <em>still</em>{" "}a
        triangle. A triangle is a closed flat shape with 3 straight sides, so it
        has 3 corners too. Those defining attributes stay the same no matter its
        size or direction.
      </p>

      <MathCheck>
        <p>
          Shapes are named by their attributes, not their orientation or size — a{" "}
          <strong>{shape.name}</strong>{" "}is a {shape.name} however it is turned
          (K.G.A.2). We <strong>compare shapes by their attributes</strong>{" "}
          (K.G.B.4): this one has {shape.sides} straight sides and {shape.corners}{" "}
          corners, and it is {shape.definition}. Flat shapes like these are <strong>two-dimensional</strong>,
          while a box or ball is <strong>three-dimensional</strong>{" "}(K.G.A.3).
        </p>
      </MathCheck>
    </div>
  );
}
