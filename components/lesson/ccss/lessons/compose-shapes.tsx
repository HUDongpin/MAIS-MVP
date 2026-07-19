"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const A = "var(--band-early)";
const B = "var(--band-middle)";

type Build = { key: string; label: string; pieces: string; makes: string };
const BUILDS: Build[] = [
  { key: "square", label: "2 triangles → square", pieces: "two triangles", makes: "square" },
  { key: "rectangle", label: "2 squares → rectangle", pieces: "two squares", makes: "rectangle" },
];

export default function Lesson() {
  const [build, setBuild] = useState(0);
  const [joined, setJoined] = useState(false);
  const b = BUILDS[build];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Small shapes can join together to build <strong>bigger</strong>{" "}shapes.
        Two triangles can make a square. Two squares can make a rectangle. Tap{" "}
        <strong>Join</strong>{" "}and watch them come together.
      </p>

      <Figure caption="The pieces are the same shapes — moving them together makes one larger shape.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {BUILDS.map((bb, i) => (
              <button
                key={bb.key}
                type="button"
                onClick={() => { setBuild(i); setJoined(false); }}
                className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                style={i === build ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}
              >
                {bb.label}
              </button>
            ))}
          </div>

          <svg width="200" height="150" viewBox="0 0 200 150" role="img" aria-label={joined ? `a ${b.makes}` : b.pieces}>
            {b.key === "square" ? (
              <>
                {/* upper-left triangle (fixed) */}
                <polygon points="60,35 140,35 60,115" fill={A} stroke="var(--surface)" strokeWidth="2" />
                {/* lower-right triangle: moves in when joined */}
                <polygon
                  points="140,35 140,115 60,115"
                  fill={B}
                  stroke="var(--surface)"
                  strokeWidth="2"
                  style={{ transform: joined ? "translate(0,0)" : "translate(34px, 26px)", transition: "transform 0.5s ease" }}
                />
              </>
            ) : (
              <>
                <rect x="42" y="45" width="58" height="58" rx="4" fill={A} stroke="var(--surface)" strokeWidth="2" />
                <rect
                  x="100" y="45" width="58" height="58" rx="4"
                  fill={B}
                  stroke="var(--surface)"
                  strokeWidth="2"
                  style={{ transform: joined ? "translate(0,0)" : "translate(30px,0)", transition: "transform 0.5s ease" }}
                />
              </>
            )}
          </svg>

          <button
            type="button"
            onClick={() => setJoined((j) => !j)}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--brand)" }}
          >
            {joined ? "← Take apart" : "Join them →"}
          </button>

          <p className="m-0 text-center text-xl font-bold">
            {b.pieces} {joined ? "make" : "→"}{" "}
            {joined ? <span style={{ color: A }}>one {b.makes}</span> : <span className="text-[var(--ink-faint)]">tap Join</span>}
          </p>
        </div>
      </Figure>

      <h2>Build big shapes from small ones</h2>
      <p>
        The little shapes do not change — a triangle is still a triangle. But put
        together the right way, they <strong>compose</strong>{" "}a brand-new, bigger
        shape.
      </p>

      <MathCheck>
        <p>
          Putting simple shapes together to make a larger shape is{" "}
          <strong>composing shapes</strong>{" "}(K.G.B.6): here, {b.pieces} form a{" "}
          {b.makes}. Building and arranging shapes like this is how young learners{" "}
          <strong>model shapes in the world</strong>{" "}(K.G.B.5) — and it previews
          how area is built from smaller pieces in later grades.
        </p>
      </MathCheck>
    </div>
  );
}
