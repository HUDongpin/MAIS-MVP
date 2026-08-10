"use client";

import { useState, type ReactNode } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const C = "var(--band-upper)";
const INK = "var(--ink)";

type Item = { key: string; name: string; desc: string; draw: ReactNode };
const ITEMS: Item[] = [
  { key: "point", name: "Point", desc: "An exact location — no size, just a spot.", draw: <circle cx={110} cy={60} r={5} fill={C} /> },
  { key: "segment", name: "Line segment", desc: "A straight path with two endpoints.", draw: <g><line x1={40} y1={60} x2={180} y2={60} stroke={C} strokeWidth={3} /><circle cx={40} cy={60} r={4} fill={INK} /><circle cx={180} cy={60} r={4} fill={INK} /></g> },
  { key: "ray", name: "Ray", desc: "Starts at a point and goes forever one way.", draw: <g><line x1={40} y1={60} x2={180} y2={60} stroke={C} strokeWidth={3} markerEnd="url(#arw)" /><circle cx={40} cy={60} r={4} fill={INK} /></g> },
  { key: "line", name: "Line", desc: "Straight and endless in both directions.", draw: <line x1={30} y1={60} x2={190} y2={60} stroke={C} strokeWidth={3} markerStart="url(#arw)" markerEnd="url(#arw)" /> },
  // The description says "two rays", and the ray entry above marks its arrow
  // with markerEnd — these two were drawn as bare segments in the one lesson
  // that teaches the difference.
  { key: "angle", name: "Angle", desc: "Two rays meeting at a vertex (a corner).", draw: <g><line x1={60} y1={95} x2={180} y2={95} stroke={C} strokeWidth={3} markerEnd="url(#arw)" /><line x1={60} y1={95} x2={150} y2={25} stroke={C} strokeWidth={3} markerEnd="url(#arw)" /><circle cx={60} cy={95} r={4} fill={INK} /></g> },
  { key: "parallel", name: "Parallel lines", desc: "Always the same distance apart — never meet.", draw: <g><line x1={30} y1={45} x2={190} y2={45} stroke={C} strokeWidth={3} markerStart="url(#arw)" markerEnd="url(#arw)" /><line x1={30} y1={80} x2={190} y2={80} stroke={C} strokeWidth={3} markerStart="url(#arw)" markerEnd="url(#arw)" /></g> },
  { key: "perp", name: "Perpendicular lines", desc: "Cross at a right angle (90°).", draw: <g><line x1={30} y1={65} x2={190} y2={65} stroke={C} strokeWidth={3} markerStart="url(#arw)" markerEnd="url(#arw)" /><line x1={110} y1={20} x2={110} y2={110} stroke={C} strokeWidth={3} markerStart="url(#arw)" markerEnd="url(#arw)" /><rect x={112} y={53} width={11} height={11} fill="none" stroke={INK} strokeWidth={1.5} /></g> },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const item = ITEMS[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Geometry starts with a small set of building blocks:{" "}
        <strong>points</strong>, <strong>lines</strong>, <strong>rays</strong>,
        and <strong>angles</strong>. Two lines can be <strong>parallel</strong>{" "}
        (never meeting) or <strong>perpendicular</strong>{" "}(meeting at a square
        corner).
      </p>

      <Figure caption="Tap each name to see what it looks like.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {ITEMS.map((it, i) => (
              <button key={it.key} type="button" onClick={() => setIdx(i)} aria-pressed={idx === i} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={idx === i ? { background: C, color: "white", borderColor: C } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{it.name}</button>
            ))}
          </div>

          <svg width="220" height="130" viewBox="0 0 220 130" role="img" aria-label={item.name}>
            <defs>
              <marker id="arw" markerWidth="9" markerHeight="9" refX="5" refY="4.5" orient="auto-start-reverse"><path d="M0,0 L8,4.5 L0,9 Z" fill={C} /></marker>
            </defs>
            {item.draw}
          </svg>

          <div className="text-center">
            <div className="text-2xl font-black" style={{ color: C }}>{item.name}</div>
            <p className="mt-1 max-w-sm text-[15px] text-[var(--ink-soft)]">{item.desc}</p>
          </div>
        </div>
      </Figure>

      <h2>The words of geometry</h2>
      <p>
        A <strong>ray</strong>{" "}has one endpoint and one arrow; a <strong>line</strong>{" "}
        has arrows on both ends; a <strong>segment</strong>{" "}has two endpoints.
        Perpendicular lines make the little square symbol that means exactly 90°.
      </p>

      <MathCheck>
        <p>
          Drawing and identifying <strong>points, lines, line segments, rays,
          angles</strong>{" "}(right, acute, obtuse), and <strong>parallel</strong>{" "}and{" "}
          <strong>perpendicular</strong>{" "}lines is 4.G.A.1. These are the shared
          vocabulary for describing every two-dimensional figure.
        </p>
      </MathCheck>
    </div>
  );
}
