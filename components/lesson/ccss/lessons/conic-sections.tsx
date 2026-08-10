"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const PLOT_ORIGIN_X = 120;
const PLOT_ORIGIN_Y = 95;
const PARABOLA_VERTEX_X = PLOT_ORIGIN_X;
const PARABOLA_VERTEX_Y = PLOT_ORIGIN_Y;
const PARABOLA_P = 12;
const PARABOLA_HALF_WIDTH = 60;
const PARABOLA_EDGE_Y = PARABOLA_VERTEX_Y - (PARABOLA_HALF_WIDTH ** 2) / (4 * PARABOLA_P);
const PARABOLA_CONTROL_Y = 2 * PARABOLA_VERTEX_Y - PARABOLA_EDGE_Y;
const PARABOLA_FOCUS_Y = PARABOLA_VERTEX_Y - PARABOLA_P;
const PARABOLA_DIRECTRIX_Y = PARABOLA_VERTEX_Y + PARABOLA_P;
const PARABOLA_PATH = `M ${PARABOLA_VERTEX_X - PARABOLA_HALF_WIDTH} ${PARABOLA_EDGE_Y} Q ${PARABOLA_VERTEX_X} ${PARABOLA_CONTROL_Y} ${PARABOLA_VERTEX_X + PARABOLA_HALF_WIDTH} ${PARABOLA_EDGE_Y}`;
const HYPERBOLA_CENTER_X = PLOT_ORIGIN_X;
const HYPERBOLA_CENTER_Y = PLOT_ORIGIN_Y;
const HYPERBOLA_A = 40;
const HYPERBOLA_FOCUS_OFFSET = 65;
const HYPERBOLA_B = Math.sqrt(HYPERBOLA_FOCUS_OFFSET ** 2 - HYPERBOLA_A ** 2);
const HYPERBOLA_Y_LIMIT = 70;

function hyperbolaPath(branch: -1 | 1) {
  return Array.from({ length: 41 }, (_, index) => {
    const yOffset = -HYPERBOLA_Y_LIMIT + (2 * HYPERBOLA_Y_LIMIT * index) / 40;
    const xOffset = branch * HYPERBOLA_A
      * Math.sqrt(1 + (yOffset * yOffset) / (HYPERBOLA_B * HYPERBOLA_B));
    const command = index === 0 ? "M " : "L ";
    return command
      + (HYPERBOLA_CENTER_X + xOffset).toFixed(2)
      + " "
      + (HYPERBOLA_CENTER_Y + yOffset).toFixed(2);
  }).join(" ");
}

const HYPERBOLA_LEFT_PATH = hyperbolaPath(-1);
const HYPERBOLA_RIGHT_PATH = hyperbolaPath(1);

const CONICS = [
  { name: "Parabola", def: "All points equidistant from a focus point and a directrix line.", eq: "y = x²/(4p)", draw: "parabola" },
  { name: "Ellipse", def: "All points whose distances to two foci add to a constant.", eq: "x²/a² + y²/b² = 1", draw: "ellipse" },
  { name: "Hyperbola", def: "All points for which the absolute difference of the distances to two foci is constant: |d₁ − d₂| is constant.", eq: "x²/a² − y²/b² = 1", draw: "hyperbola" },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const c = CONICS[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Slice a cone at different angles and you get the <strong>conic
        sections</strong>: parabola, ellipse, hyperbola. Each also has a{" "}
        <em>distance definition</em>{" "}involving special points (foci) and lines, and
        from that definition you can derive its equation.
      </p>

      <Figure caption="Each conic is defined by a distance rule involving foci and/or a directrix.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {CONICS.map((co, i) => (
              <button key={co.name} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{co.name}</button>
            ))}
          </div>

          <svg width={240} height={190} viewBox="0 0 240 190" role="img" aria-label={c.draw === "parabola" ? "Parabola with its vertex at the axes' origin, its focus above the vertex, and its directrix equally far below" : c.draw === "ellipse" ? "Ellipse with its two foci marked on the horizontal axis" : "Hyperbola with two branches and its two foci marked on the horizontal axis"}>
            <line x1={20} y1={PLOT_ORIGIN_Y} x2={220} y2={PLOT_ORIGIN_Y} stroke="var(--line)" strokeWidth={1} />
            <line x1={PLOT_ORIGIN_X} y1={20} x2={PLOT_ORIGIN_X} y2={170} stroke="var(--line)" strokeWidth={1} />
            {c.draw === "parabola" && (
              <>
                {/* In SVG coordinates y increases downward. This exact quadratic
                    Bézier represents y = x²/(4p) about the plotted origin: the
                    vertex is on the axes, the focus is p above it, and the
                    directrix is p below it. */}
                <path d={PARABOLA_PATH} fill="none" stroke={ACCENT} strokeWidth={2.5} />
                <line x1={40} y1={PARABOLA_DIRECTRIX_Y} x2={200} y2={PARABOLA_DIRECTRIX_Y} stroke="var(--band-upper)" strokeWidth={2} strokeDasharray="4 3" />
                <circle cx={PARABOLA_VERTEX_X} cy={PARABOLA_VERTEX_Y} r={3} fill={ACCENT} />
                <circle cx={PARABOLA_VERTEX_X} cy={PARABOLA_FOCUS_Y} r={4} fill="var(--band-upper)" />
                <text x={PARABOLA_VERTEX_X + 8} y={PARABOLA_FOCUS_Y - 2} fontSize={10} fill="var(--band-upper)">focus</text>
                <text x={PARABOLA_VERTEX_X + 30} y={PARABOLA_DIRECTRIX_Y + 14} fontSize={10} fill="var(--band-upper)">directrix</text>
              </>
            )}
            {c.draw === "ellipse" && (
              <>
                <ellipse cx={120} cy={95} rx={80} ry={45} fill="none" stroke={ACCENT} strokeWidth={2.5} />
                {/* For rx = 80, ry = 45 the focal distance is sqrt(80² − 45²) = 66.1,
                    so the foci belong at x = 53.9 and 186.1. They were drawn at
                    85 and 155 (c = 35) — the earlier parabola fix left the
                    ellipse untouched. */}
                <circle cx={53.9} cy={95} r={4} fill="var(--band-upper)" />
                <circle cx={186.1} cy={95} r={4} fill="var(--band-upper)" />
                <text x={40} y={86} fontSize={10} fill="var(--band-upper)">foci</text>
              </>
            )}
            {c.draw === "hyperbola" && (
              <>
                {/* Every sampled point satisfies x²/a² − y²/b² = 1. With
                    c² = a² + b², the marked foci use the same parameters. */}
                <path d={HYPERBOLA_LEFT_PATH} fill="none" stroke={ACCENT} strokeWidth={2.5} />
                <path d={HYPERBOLA_RIGHT_PATH} fill="none" stroke={ACCENT} strokeWidth={2.5} />
                <circle cx={HYPERBOLA_CENTER_X - HYPERBOLA_FOCUS_OFFSET} cy={HYPERBOLA_CENTER_Y} r={4} fill="var(--band-upper)" />
                <circle cx={HYPERBOLA_CENTER_X + HYPERBOLA_FOCUS_OFFSET} cy={HYPERBOLA_CENTER_Y} r={4} fill="var(--band-upper)" />
                <text x={HYPERBOLA_CENTER_X - HYPERBOLA_FOCUS_OFFSET - 14} y={HYPERBOLA_CENTER_Y - 9} fontSize={10} fill="var(--band-upper)">foci</text>
              </>
            )}
          </svg>

          <div className="rounded-2xl border-2 px-6 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-mono text-lg font-black" style={{ color: ACCENT }}>{c.eq}</div>
            <div className="mt-1 max-w-sm text-sm text-[var(--ink-soft)]">{c.def}</div>
          </div>
        </div>
      </Figure>

      <h2>From focus to equation</h2>
      <p>
        For a <strong>parabola</strong>, "distance to focus = distance to directrix"
        becomes, after squaring, y = x²/(4p). For an <strong>ellipse</strong>, the
        constant-sum condition on two foci yields x²/a² + y²/b² = 1; a{" "}
        <strong>hyperbola</strong>{" "}uses a constant absolute difference, |d₁ − d₂|.
        Setting up the
        distance equation and simplifying is how each standard form is derived.
      </p>

      <MathCheck>
        <p>
          A <strong>parabola</strong>{" "}is derived from its focus and directrix
          (G-GPE.2). An <strong>ellipse</strong>{" "}and <strong>hyperbola</strong>{" "}come
          from the sum or absolute difference of distances to two foci being constant
          (G-GPE.3). In every case, translating the distance definition into
          coordinates and simplifying gives the standard equation.
        </p>
      </MathCheck>
    </div>
  );
}
