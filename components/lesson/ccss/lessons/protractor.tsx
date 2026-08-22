"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CX = 160, CY = 150, R = 130;
const RAY = "var(--band-upper)";

const r3 = (n: number) => Math.round(n * 1000) / 1000;
function pt(deg: number, rad: number) {
  const a = (deg * Math.PI) / 180;
  return { x: r3(CX + rad * Math.cos(a)), y: r3(CY - rad * Math.sin(a)) };
}

function angleType(d: number) {
  if (d === 90) return "a right angle";
  if (d < 90) return "an acute angle";
  if (d < 180) return "an obtuse angle";
  return "a straight angle";
}

export default function Lesson() {
  const [deg, setDeg] = useState(60);
  const end = pt(deg, R - 12);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        A <strong>protractor</strong>{" "}is a ruler for angles. Line its center on
        the corner and its 0° line on one ray, then read where the other ray
        crosses the scale. That number is the angle in <strong>degrees</strong>.
      </p>

      <Figure caption="Read the scale where the orange ray crosses it. Slide to change the angle.">
        <div className="flex flex-col items-center gap-6">
          <svg className="mx-auto max-w-none self-start" width="320" height="180" viewBox="0 0 320 180" role="img" aria-label={`angle of ${deg} degrees`}>
            {/* protractor body */}
            <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY} Z`} fill="color-mix(in oklab, var(--band-upper) 8%, var(--surface))" stroke="var(--line)" strokeWidth={1.5} />
            {/* ticks */}
            {Array.from({ length: 19 }, (_, i) => {
              const d = i * 10;
              const outer = pt(d, R);
              const inner = pt(d, d % 30 === 0 ? R - 14 : R - 8);
              return <line key={i} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke="var(--ink-soft)" strokeWidth={d % 30 === 0 ? 1.6 : 0.8} />;
            })}
            {/* labels */}
            {[0, 30, 60, 90, 120, 150, 180].map((d) => {
              const p = pt(d, R - 26);
              return <text key={d} x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{d}</text>;
            })}
            {/* baseline ray (0 degrees) */}
            <line x1={CX} y1={CY} x2={CX + R - 12} y2={CY} stroke="var(--ink)" strokeWidth={2.5} />
            {/* measured ray */}
            <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke={RAY} strokeWidth={3} />
            <circle cx={CX} cy={CY} r={4} fill="var(--ink)" />
          </svg>

          <div className="text-center">
            <div className="font-mono text-3xl font-black" style={{ color: RAY }}>{deg}°</div>
            <div className="mt-1 text-[15px] font-semibold text-[var(--ink-soft)]">That is {angleType(deg)}.</div>
          </div>

          <div className="flex w-64 max-w-full flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Angle: {deg}°</span>
            <input type="range" min={0} max={180} step={5} value={deg} onChange={(e) => setDeg(Number(e.target.value))} className="w-full accent-[var(--band-upper)]" aria-label="angle degrees" />
          </div>
        </div>
      </Figure>

      <h2>Acute, right, obtuse</h2>
      <p>
        Angles smaller than 90° are <strong>acute</strong>; exactly 90° is a{" "}
        <strong>right</strong>{" "}angle; between 90° and 180° is <strong>obtuse</strong>.
        At {deg}°, this is {angleType(deg)}.
      </p>

      <MathCheck>
        <p>
          A protractor measures and draws angles in degrees (4.MD.C.6). You place
          its center at the angle&apos;s vertex, align 0° with one ray, and read the
          scale at the other ray — here {deg}°. Because a straight line is 180°,
          the protractor&apos;s scale runs 0° to 180°.
        </p>
      </MathCheck>
    </div>
  );
}
