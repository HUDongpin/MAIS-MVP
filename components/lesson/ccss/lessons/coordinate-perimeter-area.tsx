"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const R = 6, CELL = 22, PAD = 22;
const SIZE = 2 * R * CELL + 2 * PAD;
const r2 = (n: number) => Math.round(n * 100) / 100;

type P = [number, number];

export default function Lesson() {
  const [verts, setVerts] = useState<P[]>([[-3, -2], [3, -2], [2, 3]]);

  const sx = (x: number) => PAD + (x + R) * CELL;
  const sy = (y: number) => SIZE - PAD - (y + R) * CELL;

  const dist = (p: P, q: P) => Math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2);
  const perim = r2(verts.reduce((s, v, i) => s + dist(v, verts[(i + 1) % verts.length]), 0));
  // shoelace area
  const area = r2(Math.abs(verts.reduce((s, [x, y], i) => {
    const [x2, y2] = verts[(i + 1) % verts.length];
    return s + (x * y2 - x2 * y);
  }, 0)) / 2);

  const setV = (i: number, axis: 0 | 1, d: number) => setVerts((vs) => vs.map((v, vi) => (vi === i ? (axis === 0 ? [Math.max(-R, Math.min(R, v[0] + d)), v[1]] : [v[0], Math.max(-R, Math.min(R, v[1] + d))]) : v)));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Given a polygon&apos;s vertices, you can compute its <strong>perimeter</strong>{" "}
        and <strong>area</strong>{" "}directly. Perimeter adds up the side lengths (each a
        distance-formula computation); area uses the elegant{" "}
        <strong>shoelace formula</strong>.
      </p>

      <Figure caption="Perimeter sums the side lengths; the shoelace formula gives the area from the coordinates.">
        <div className="flex flex-col items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full" style={{ maxHeight: 300 }} role="img" aria-label="polygon on a grid">
            {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
              <g key={v} stroke="var(--line)" strokeWidth={1}>
                <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
              </g>
            ))}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />
            <polygon points={verts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")} fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={2.5} />
            {verts.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={4} fill={ACCENT} />)}
          </svg>

          <div className="grid grid-cols-2 gap-4 text-center font-mono text-sm">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">perimeter<br /><strong style={{ color: ACCENT }}>≈ {perim}</strong></div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">area (shoelace)<br /><strong style={{ color: ACCENT }}>= {area}</strong></div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {verts.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-[var(--ink-faint)]">({v[0]}, {v[1]})</span>
                <div className="flex gap-1">
                  {/* Twelve buttons announced only an arrow glyph; the vertex
                      they move sat in an unassociated sibling span. */}
                  <button type="button" onClick={() => setV(i, 0, -1)} aria-label={`Move vertex ${i + 1} left from (${v[0]}, ${v[1]})`} className="h-7 w-7 rounded border border-[var(--line)] text-xs font-bold">←</button>
                  <button type="button" onClick={() => setV(i, 0, 1)} aria-label={`Move vertex ${i + 1} right from (${v[0]}, ${v[1]})`} className="h-7 w-7 rounded border border-[var(--line)] text-xs font-bold">→</button>
                  <button type="button" onClick={() => setV(i, 1, 1)} aria-label={`Move vertex ${i + 1} up from (${v[0]}, ${v[1]})`} className="h-7 w-7 rounded border border-[var(--line)] text-xs font-bold">↑</button>
                  <button type="button" onClick={() => setV(i, 1, -1)} aria-label={`Move vertex ${i + 1} down from (${v[0]}, ${v[1]})`} className="h-7 w-7 rounded border border-[var(--line)] text-xs font-bold">↓</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Distance and the shoelace formula</h2>
      <p>
        Each side length is √((Δx)² + (Δy)²); summing them gives the perimeter ≈{" "}
        {perim}. The <strong>shoelace formula</strong>{" "}½|Σ(xᵢyᵢ₊₁ − xᵢ₊₁yᵢ)| = {area}
        {" "}computes the area from the coordinates alone, cross-multiplying consecutive
        vertices. Both are pure applications of the coordinate plane.
      </p>

      <MathCheck>
        <p>
          Using coordinates to <strong>compute perimeters and areas</strong>{" "}of
          polygons (G-GPE.7): side lengths come from the <strong>distance
          formula</strong>, and area from decomposition or the{" "}
          <strong>shoelace formula</strong>. This connects synthetic geometry to
          algebra and underlies computational geometry.
        </p>
      </MathCheck>
    </div>
  );
}
