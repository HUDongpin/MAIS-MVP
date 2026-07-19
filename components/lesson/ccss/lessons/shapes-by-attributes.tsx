"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const FILL = "var(--band-middle)";
const NAMES: Record<number, string> = { 3: "triangle", 4: "quadrilateral", 5: "pentagon", 6: "hexagon" };

const r3 = (n: number) => Math.round(n * 1000) / 1000;

function polygonPoints(sides: number, cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * 2 * Math.PI - Math.PI / 2;
    pts.push(`${r3(cx + r * Math.cos(a))},${r3(cy + r * Math.sin(a))}`);
  }
  return pts.join(" ");
}

export default function Lesson() {
  const [sides, setSides] = useState(5);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Shapes are named by their <strong>attributes</strong>{" "}— how many{" "}
        <strong>sides</strong>{" "}and <strong>corners (angles)</strong>{" "}they have. A
        shape with 3 sides is a triangle; 4 sides, a quadrilateral; 5, a
        pentagon; 6, a hexagon.
      </p>

      <Figure caption="Change the number of sides and watch the shape — and its name — change.">
        <div className="flex flex-col items-center gap-6">
          <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label={`${NAMES[sides]} with ${sides} sides`}>
            <polygon points={polygonPoints(sides, 90, 90, 70)} fill={FILL} fillOpacity={0.85} stroke="var(--ink)" strokeWidth={2} />
          </svg>

          <div className="text-center">
            <div className="text-3xl font-black capitalize" style={{ color: FILL }}>{NAMES[sides]}</div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              {sides} sides · {sides} corners (angles)
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Number of sides: {sides}</span>
            <input type="range" min={3} max={6} value={sides} onChange={(e) => setSides(Number(e.target.value))} className="w-48 accent-[var(--band-middle)]" aria-label="number of sides" />
          </div>
        </div>
      </Figure>

      <h2>Count the sides and corners</h2>
      <p>
        The number of sides always equals the number of corners. Solid shapes
        are named by their <strong>faces</strong>{" "}instead — a cube has 6 square
        faces, 8 corners, and 12 edges.
      </p>

      <MathCheck>
        <p>
          Recognizing and drawing shapes by their attributes — a given number of{" "}
          <strong>sides</strong>{" "}and <strong>angles</strong>{" "}for flat shapes, or{" "}
          <strong>faces</strong>{" "}for solid shapes — is 2.G.A.1. A {NAMES[sides]}{" "}
          has {sides} sides and {sides} angles; that count is what names it,
          regardless of its size or color.
        </p>
      </MathCheck>
    </div>
  );
}
