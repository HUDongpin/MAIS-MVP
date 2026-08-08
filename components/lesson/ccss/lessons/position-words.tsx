"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

type Pos = { key: string; word: string; ball: { x: number; y: number } };
// box sits at center (100,90), 60x50
const POSITIONS: Pos[] = [
  { key: "above", word: "above", ball: { x: 130, y: 30 } },
  { key: "below", word: "below", ball: { x: 130, y: 150 } },
  { key: "left", word: "beside (left of)", ball: { x: 55, y: 90 } },
  { key: "right", word: "beside (right of)", ball: { x: 205, y: 90 } },
];

const ACCENT = "var(--band-high)";

export default function Lesson() {
  const [i, setI] = useState(0);
  const pos = POSITIONS[i];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        We use special words to tell <strong>where</strong>{" "}something is:{" "}
        <strong>above</strong>, <strong>below</strong>, and{" "}
        <strong>beside</strong>. Move the ball around the box and say where it
        lands.
      </p>

      <Figure caption="The box stays put. Watch where the ball goes and name its position.">
        <div className="flex flex-col items-center gap-6">
          <svg width="260" height="180" viewBox="0 0 260 180" role="img" aria-label={`ball ${pos.word} the box`}>
            {/* box */}
            <rect x="100" y="65" width="60" height="50" rx="6" fill="var(--band-early)" />
            <text x="130" y="95" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">box</text>
            {/* ball */}
            <circle cx={pos.ball.x} cy={pos.ball.y} r="18" fill={ACCENT} style={{ transition: "cx 0.4s ease, cy 0.4s ease" }} />
            <text x={pos.ball.x} y={pos.ball.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="white">ball</text>
          </svg>

          <p className="m-0 text-center text-2xl font-black">
            The ball is <span style={{ color: ACCENT }}>{pos.word}</span> the box.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {POSITIONS.map((p, pi) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setI(pi)}
                className="rounded-lg border px-4 py-2 text-sm font-bold"
                style={pi === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}
              >
                {p.word}
              </button>
            ))}
          </div>
        </div>
      </Figure>

      <h2>Words that tell where</h2>
      <p>
        Position words help us describe the world: the cup is{" "}
        <strong>above</strong>{" "}the table, the shoes are <strong>below</strong>{" "}
        the bed, the lamp is <strong>beside</strong>{" "}the chair.
      </p>

      <MathCheck>
        <p>
          Describing objects using shape names and their{" "}
          <strong>relative positions</strong>{" "}— above, below, beside, in front
          of, behind, next to — is K.G.A.1. This spatial language is the
          vocabulary students use to describe and build shapes, and it lays the
          groundwork for coordinates and geometry in later grades.
        </p>
      </MathCheck>
    </div>
  );
}
