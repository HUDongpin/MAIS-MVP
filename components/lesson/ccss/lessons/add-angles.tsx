"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const CX = 120, CY = 130, R = 100;
const A = "var(--band-middle)";
const B = "var(--band-upper)";

const r3 = (n: number) => Math.round(n * 1000) / 1000;
function pt(deg: number, rad: number) {
  const a = (deg * Math.PI) / 180;
  return { x: r3(CX + rad * Math.cos(a)), y: r3(CY - rad * Math.sin(a)) };
}
function wedge(from: number, to: number, fill: string) {
  const p0 = pt(from, R), p1 = pt(to, R);
  const large = to - from > 180 ? 1 : 0;
  return <path d={`M ${CX} ${CY} L ${p0.x} ${p0.y} A ${R} ${R} 0 ${large} 0 ${p1.x} ${p1.y} Z`} fill={fill} fillOpacity={0.72} stroke={fill} strokeWidth={2} />;
}

export default function Lesson() {
  const [total, setTotal] = useState(90);
  const [a, setA] = useState(35);
  const known = Math.min(a, total);
  const b = total - known;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        When two angles sit <strong>side by side</strong>, their measures{" "}
        <strong>add up</strong>. So if a big angle is split into two pieces and you
        know one, you can find the other by <strong>subtracting</strong>.
      </p>

      <Figure caption="The two colored angles share a ray. Together they make the whole angle.">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {[90, 180].map((t) => (
              <button key={t} type="button" onClick={() => { setTotal(t); setA((p) => Math.min(p, t)); }} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={total === t ? { background: A, color: "white", borderColor: A } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{t === 90 ? "Right angle (90°)" : "Straight (180°)"}</button>
            ))}
          </div>

          <svg width="240" height="160" viewBox="0 0 240 160" role="img" aria-label={`${known} plus ${b} equals ${total} degrees`}>
            {wedge(0, known, A)}
            {wedge(known, total, B)}
            <line x1={CX} y1={CY} x2={pt(0, R).x} y2={pt(0, R).y} stroke="var(--ink)" strokeWidth={2.5} />
            <line x1={CX} y1={CY} x2={pt(known, R).x} y2={pt(known, R).y} stroke="var(--ink)" strokeWidth={2.5} />
            <line x1={CX} y1={CY} x2={pt(total, R).x} y2={pt(total, R).y} stroke="var(--ink)" strokeWidth={2.5} />
            <circle cx={CX} cy={CY} r={4} fill="var(--ink)" />
          </svg>

          <div className="text-center">
            <div className="font-mono text-2xl font-black">
              <span style={{ color: A }}>{known}°</span> + <span style={{ color: B }}>{b}°</span> = {total}°
            </div>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
              Know the whole ({total}°) and one part ({known}°)? The unknown is {total} − {known} = <strong style={{ color: B }}>{b}°</strong>.
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">First angle: {known}°</span>
            <input type="range" min={0} max={total} step={5} value={known} onChange={(e) => setA(Number(e.target.value))} className="w-56 accent-[var(--band-middle)]" aria-label="first angle" />
          </div>
        </div>
      </Figure>

      <h2>Angles join like lengths</h2>
      <p>
        Two angles that share a side combine into one bigger angle, just like two
        line segments join into a longer one. That is why {known}° and {b}° make{" "}
        {total}°.
      </p>

      <MathCheck>
        <p>
          Angle measure is <strong>additive</strong>{" "}(4.MD.C.7): when an angle is
          split into non-overlapping parts, the whole is the sum of the parts. So
          you can find an <strong>unknown angle</strong>{" "}by subtraction — here,{" "}
          {total}° − {known}° = {b}°. This solves &ldquo;find the missing
          angle&rdquo; problems.
        </p>
      </MathCheck>
    </div>
  );
}
