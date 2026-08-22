"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const CONICS = [
  { name: "Parabola", def: "All points equidistant from a focus point and a directrix line.", eq: "y = (1/4p)x²", draw: "parabola" },
  { name: "Ellipse", def: "All points whose distances to two foci add to a constant.", eq: "x²/a² + y²/b² = 1", draw: "ellipse" },
  { name: "Hyperbola", def: "All points whose distances to two foci differ by a constant.", eq: "x²/a² − y²/b² = 1", draw: "hyperbola" },
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
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {CONICS.map((co, i) => (
              <button key={co.name} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{co.name}</button>
            ))}
          </div>

          <svg className="mx-auto h-auto max-w-full" width={240} height={190} viewBox="0 0 240 190" role="img" aria-label={c.name}>
            <line x1={20} y1={95} x2={220} y2={95} stroke="var(--line)" strokeWidth={1} />
            <line x1={120} y1={20} x2={120} y2={170} stroke="var(--line)" strokeWidth={1} />
            {c.draw === "parabola" && (
              <>
                <path d="M 60 40 Q 120 190 180 40" fill="none" stroke={ACCENT} strokeWidth={2.5} />
                <line x1={40} y1={130} x2={200} y2={130} stroke="var(--band-upper)" strokeWidth={2} strokeDasharray="4 3" />
                <circle cx={120} cy={80} r={4} fill="var(--band-upper)" />
                <text x={128} y={78} fontSize={10} fill="var(--band-upper)">focus</text>
                <text x={150} y={144} fontSize={10} fill="var(--band-upper)">directrix</text>
              </>
            )}
            {c.draw === "ellipse" && (
              <>
                <ellipse cx={120} cy={95} rx={80} ry={45} fill="none" stroke={ACCENT} strokeWidth={2.5} />
                <circle cx={85} cy={95} r={4} fill="var(--band-upper)" />
                <circle cx={155} cy={95} r={4} fill="var(--band-upper)" />
                <text x={70} y={86} fontSize={10} fill="var(--band-upper)">foci</text>
              </>
            )}
            {c.draw === "hyperbola" && (
              <>
                <path d="M 70 25 Q 100 95 70 165" fill="none" stroke={ACCENT} strokeWidth={2.5} />
                <path d="M 170 25 Q 140 95 170 165" fill="none" stroke={ACCENT} strokeWidth={2.5} />
                <circle cx={55} cy={95} r={4} fill="var(--band-upper)" />
                <circle cx={185} cy={95} r={4} fill="var(--band-upper)" />
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
        <strong>hyperbola</strong>{" "}uses a constant difference. Setting up the
        distance equation and simplifying is how each standard form is derived.
      </p>

      <MathCheck>
        <p>
          A <strong>parabola</strong>{" "}is derived from its focus and directrix
          (G-GPE.2). An <strong>ellipse</strong>{" "}and <strong>hyperbola</strong>{" "}come
          from the sum or difference of distances to two foci being constant
          (G-GPE.3). In every case, translating the distance definition into
          coordinates and simplifying gives the standard equation.
        </p>
      </MathCheck>
    </div>
  );
}
