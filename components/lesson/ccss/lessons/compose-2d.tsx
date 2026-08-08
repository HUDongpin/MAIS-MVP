"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A = "var(--band-middle)";
const B = "var(--band-early)";

type Build = { key: string; label: string; pieces: string; makes: string };
const BUILDS: Build[] = [
  { key: "house", label: "square + triangle → house", pieces: "a square and a triangle", makes: "house" },
  { key: "hexagon", label: "2 trapezoids → hexagon", pieces: "two trapezoids", makes: "hexagon" },
];

export default function Lesson() {
  const [bi, setBi] = useState(0);
  const [joined, setJoined] = useState(false);
  const b = BUILDS[bi];
  // At gap 34 the roof apex lands at y = 20 − 34 = −14, above the viewBox, so
  // the separated "triangle" rendered with a flat top and four visible
  // vertices. 18 keeps the apex at y = 2, inside the view.
  const gap = joined ? 0 : 18;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Shapes are like building blocks. Put a square and a triangle together and
        you get a <strong>house</strong>. Put two trapezoids together and you get
        a <strong>hexagon</strong>. The new shape is a <strong>composite</strong>{" "}
        shape.
      </p>

      <Figure caption="Tap Join to bring the pieces together into one new, bigger shape.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {BUILDS.map((bb, i) => (
              <button key={bb.key} type="button" onClick={() => { setBi(i); setJoined(false); }} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={i === bi ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{bb.label}</button>
            ))}
          </div>

          <svg width="200" height="180" viewBox="0 0 200 180" role="img" aria-label={joined ? `a ${b.makes}` : b.pieces}>
            {b.key === "house" ? (
              <>
                {/* roof (moves down to sit on the square) */}
                <polygon points="55,60 145,60 100,20" fill={B} stroke="var(--surface)" strokeWidth="2" style={{ transform: `translateY(${-gap}px)`, transition: "transform 0.5s ease" }} />
                {/* square base (fixed) */}
                <rect x="55" y="62" width="90" height="90" fill={A} stroke="var(--surface)" strokeWidth="2" />
              </>
            ) : (
              <>
                {/* top trapezoid (fixed) */}
                <polygon points="60,55 140,55 160,92 40,92" fill={A} stroke="var(--surface)" strokeWidth="2" />
                {/* bottom trapezoid (moves up) */}
                <polygon points="40,94 160,94 140,131 60,131" fill={B} stroke="var(--surface)" strokeWidth="2" style={{ transform: `translateY(${gap}px)`, transition: "transform 0.5s ease" }} />
              </>
            )}
          </svg>

          <button type="button" onClick={() => setJoined((j) => !j)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "var(--brand)" }}>
            {joined ? "← Take apart" : "Join them →"}
          </button>

          <p className="m-0 text-center text-xl font-bold">
            {b.pieces} {joined ? <>make <span style={{ color: A }}>one {b.makes}</span></> : <span className="text-[var(--ink-faint)]">→ tap Join</span>}
          </p>
        </div>
      </Figure>

      <h2>New shapes from old</h2>
      <p>
        The little shapes do not change — a triangle is still a triangle. Put
        together the right way, they make a bigger, brand-new shape you can name.
      </p>

      <MathCheck>
        <p>
          Combining shapes such as squares, triangles, and trapezoids (and 3-D
          shapes like cubes and cylinders) to build a{" "}
          <strong>composite shape</strong>{" "}is 1.G.A.2 — here, {b.pieces} form a{" "}
          {b.makes}. A composite can then be broken apart again, or used as a new
          piece to build something even larger.
        </p>
      </MathCheck>
    </div>
  );
}
