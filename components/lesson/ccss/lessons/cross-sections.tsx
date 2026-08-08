"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CUT = "var(--band-upper)";

type Slice = { key: string; name: string; shape: string; desc: string; cut: string; section: React.ReactNode };
const SLICES: Slice[] = [
  {
    key: "horiz", name: "Horizontal", shape: "Square", desc: "A cut parallel to the top and bottom gives a square the same size as a face.",
    cut: "20,70 100,50 180,70 100,90",
    section: <rect x={45} y={30} width={70} height={70} fill={CUT} fillOpacity={0.7} stroke="var(--ink)" strokeWidth={2} />,
  },
  {
    key: "diag", name: "Diagonal", shape: "Rectangle", desc: "A slanted cut from one edge to the opposite edge makes a longer rectangle.",
    cut: "30,40 170,40 150,120 50,120",
    section: <rect x={35} y={40} width={90} height={55} fill={CUT} fillOpacity={0.7} stroke="var(--ink)" strokeWidth={2} />,
  },
  {
    key: "corner", name: "Corner", shape: "Triangle", desc: "Slicing off a corner through three edges makes a triangle.",
    cut: "40,40 150,60 70,120",
    section: <polygon points="80,25 140,105 30,105" fill={CUT} fillOpacity={0.7} stroke="var(--ink)" strokeWidth={2} />,
  },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const slice = SLICES[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Slice through a solid and the flat face you expose is a{" "}
        <strong>cross-section</strong>. The <em>same</em>{" "}cube can reveal a square,
        a rectangle, or even a triangle, depending on how you cut it.
      </p>

      <Figure caption="Choose a cut through the cube. The exposed face is the cross-section.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {SLICES.map((s, i) => (
              <button key={s.key} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: CUT, color: "white", borderColor: CUT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{s.name}</button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="text-center">
              <svg width="200" height="160" viewBox="0 0 200 160" role="img" aria-label={`Cube with a ${slice.name.toLowerCase()} cut through it`}>
                {/* isometric cube */}
                <polygon points="40,50 120,50 160,30 80,30" fill="var(--surface-2)" stroke="var(--ink-soft)" strokeWidth={1.5} />
                <polygon points="40,50 120,50 120,130 40,130" fill="var(--surface-2)" stroke="var(--ink-soft)" strokeWidth={1.5} />
                <polygon points="120,50 160,30 160,110 120,130" fill="var(--surface-2)" stroke="var(--ink-soft)" strokeWidth={1.5} />
                {/* cut plane */}
                <polygon points={slice.cut} fill={CUT} fillOpacity={0.5} stroke={CUT} strokeWidth={2} />
              </svg>
              <div className="text-xs font-bold text-[var(--ink-faint)]">the cut through the cube</div>
            </div>

            <div className="text-center">
              <svg width="160" height="140" viewBox="0 0 160 140" role="img" aria-label={`The cross-section this cut exposes: a ${slice.shape.toLowerCase()}`}>
                {slice.section}
              </svg>
              <div className="text-lg font-black" style={{ color: CUT }}>{slice.shape}</div>
              <div className="text-xs font-bold text-[var(--ink-faint)]">the cross-section</div>
            </div>
          </div>

          <p className="m-0 max-w-md text-center text-[15px] text-[var(--ink-soft)]">{slice.desc}</p>
        </div>
      </Figure>

      <h2>The shape depends on the cut</h2>
      <p>
        A horizontal slice matches a face (a square); a slanted slice stretches it
        into a rectangle; and cutting across a corner exposes a triangle. The angle
        and position of the plane determine the cross-section.
      </p>

      <MathCheck>
        <p>
          A <strong>cross-section</strong>{" "}is the two-dimensional shape formed when
          a plane slices through a three-dimensional figure (7.G.A.3). For a cube,
          the cross-section can be a square, a rectangle, a triangle, or even a
          hexagon — its shape depends entirely on the orientation of the slicing
          plane.
        </p>
      </MathCheck>
    </div>
  );
}
