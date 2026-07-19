"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const LINE = "var(--band-upper)";
const W = 280, H = 180, PAD = 24;

type Story = { title: string; desc: string; path: string; nonlinear: boolean };
const STORIES: Story[] = [
  {
    title: "Filling a bathtub",
    desc: "The water rises steadily (linear increase), then stays level once you turn off the tap (constant).",
    path: `${PAD},${H - PAD} 150,40 ${W - PAD},40`, nonlinear: false,
  },
  {
    title: "A ball thrown up",
    desc: "Height rises, slows, peaks, then falls faster and faster — a curved, nonlinear path.",
    path: `${PAD},${H - PAD} 90,50 150,35 210,50 ${W - PAD},${H - PAD}`, nonlinear: true,
  },
  {
    title: "Coasting to a stop",
    desc: "Speed decreases at a steady rate until the car stops (linear decrease to zero).",
    path: `${PAD},40 ${W - PAD},${H - PAD}`, nonlinear: false,
  },
  {
    title: "Waiting, then walking",
    desc: "Distance stays flat while you wait (constant), then increases as you walk away (increasing).",
    path: `${PAD},${H - PAD} 130,${H - PAD} ${W - PAD},40`, nonlinear: false,
  },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const s = STORIES[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A graph tells a story <em>without numbers</em>. Its <strong>shape</strong>{" "}
        — rising, falling, level, straight, or curved — describes how one quantity
        changes as another does. You can match a graph to a situation and back.
      </p>

      <Figure caption="Read the shape: steeper means faster; flat means unchanging; curved means the rate itself changes.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {STORIES.map((st, i) => (
              <button key={st.title} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: LINE, color: "white", borderColor: LINE } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{st.title}</button>
            ))}
          </div>

          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={s.title}>
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--ink-soft)" strokeWidth={2} />
            <polyline points={s.path} fill="none" stroke={LINE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">time →</text>
          </svg>

          <div className="text-center">
            <div className="text-lg font-black" style={{ color: LINE }}>{s.title}</div>
            <p className="mt-1 max-w-md text-[15px] text-[var(--ink-soft)]">{s.desc}</p>
            <div className="mt-1 text-xs font-bold uppercase" style={{ color: s.nonlinear ? "var(--band-early)" : "var(--band-upper)" }}>{s.nonlinear ? "nonlinear (curved)" : "piecewise linear (straight parts)"}</div>
          </div>
        </div>
      </Figure>

      <h2>Shape tells the story</h2>
      <p>
        An upward slope means increasing; downward means decreasing; flat means no
        change. A <strong>straight</strong>{" "}segment means a constant rate; a{" "}
        <strong>curve</strong>{" "}means the rate itself is changing. That is how a
        graph captures a story qualitatively.
      </p>

      <MathCheck>
        <p>
          Describing a graph <strong>qualitatively</strong>{" "}(8.F.B.5) means reading
          where a function is increasing, decreasing, or constant, and whether it is
          linear (straight) or nonlinear (curved) — without exact numbers. You can
          also <strong>sketch</strong>{" "}a graph that fits a verbal description, like
          the ones above.
        </p>
      </MathCheck>
    </div>
  );
}
