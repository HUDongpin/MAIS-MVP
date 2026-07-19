"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

const OPS = [
  { name: "A ∪ B (union)", desc: "In A or B (or both).", a: true, b: true, both: true, outside: false },
  { name: "A ∩ B (intersection)", desc: "In both A and B.", a: false, b: false, both: true, outside: false },
  { name: "A only", desc: "In A but not B.", a: true, b: false, both: false, outside: false },
  { name: "not A (complement)", desc: "Everything outside A.", a: false, b: true, both: false, outside: true },
];

export default function Lesson() {
  const [idx, setIdx] = useState(0);
  const o = OPS[idx];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        In probability, an <strong>event</strong>{" "}is a <strong>set of outcomes</strong>.
        So the language of sets applies: <strong>union</strong>{" "}(or),{" "}
        <strong>intersection</strong>{" "}(and), and <strong>complement</strong>{" "}(not). A
        Venn diagram pictures how events overlap.
      </p>

      <Figure caption="Shade the region an event describes — union, intersection, or complement.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2">
            {OPS.map((op, i) => (
              <button key={op.name} type="button" onClick={() => setIdx(i)} className="rounded-lg border px-3 py-1.5 text-xs font-bold" style={idx === i ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{op.name}</button>
            ))}
          </div>

          <svg width={260} height={170} viewBox="0 0 260 170" role="img" aria-label={o.name}>
            <rect x={5} y={5} width={250} height={160} fill={o.outside ? ACCENT : "none"} fillOpacity={o.outside ? 0.2 : 0} stroke="var(--line)" strokeWidth={1.5} />
            <defs>
              <clipPath id="aClip"><circle cx={100} cy={85} r={60} /></clipPath>
              <clipPath id="bClip"><circle cx={160} cy={85} r={60} /></clipPath>
            </defs>
            {/* A only */}
            {o.a && <circle cx={100} cy={85} r={60} fill={ACCENT} fillOpacity={0.3} clipPath="url(#aClip)" />}
            {/* B only */}
            {o.b && !o.outside && <circle cx={160} cy={85} r={60} fill={ACCENT} fillOpacity={0.3} clipPath="url(#bClip)" />}
            {/* both */}
            {o.both && <g clipPath="url(#aClip)"><circle cx={160} cy={85} r={60} fill={ACCENT} fillOpacity={0.55} /></g>}
            <circle cx={100} cy={85} r={60} fill="none" stroke={ACCENT} strokeWidth={2} />
            <circle cx={160} cy={85} r={60} fill="none" stroke={ACCENT} strokeWidth={2} />
            <text x={70} y={90} fontSize={16} fontWeight={800} fill="var(--ink)">A</text>
            <text x={185} y={90} fontSize={16} fontWeight={800} fill="var(--ink)">B</text>
          </svg>

          <div className="rounded-xl border-2 px-6 py-2 text-center" style={{ borderColor: ACCENT }}>
            <div className="font-bold" style={{ color: ACCENT }}>{o.name}</div>
            <div className="text-sm text-[var(--ink-soft)]">{o.desc}</div>
          </div>
        </div>
      </Figure>

      <h2>Events are sets of outcomes</h2>
      <p>
        If A = "roll even" = {"{2, 4, 6}"} and B = "roll ≥ 4" = {"{4, 5, 6}"}, then
        A ∩ B = {"{4, 6}"}, A ∪ B = {"{2, 4, 5, 6}"}, and "not A" = {"{1, 3, 5}"}.
        Describing events with unions, intersections, and complements is the first
        step toward computing their probabilities.
      </p>

      <MathCheck>
        <p>
          Events are <strong>subsets of a sample space</strong>, described with{" "}
          <strong>unions</strong>{" "}(or), <strong>intersections</strong>{" "}(and), and{" "}
          <strong>complements</strong>{" "}(not) of other events (S-CP.1). This set
          language, visualized with Venn diagrams, underlies every probability rule
          that follows.
        </p>
      </MathCheck>
    </div>
  );
}
