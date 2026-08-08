"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  // A line parallel to the base cuts the sides proportionally.
  // Big triangle height 6; cut at height h from apex.
  const [cut, setCut] = useState(3); // 1..5, fraction cut/6 of the way down
  const ratio = cut / 6;
  const [full, setFull] = useState(9); // full base length

  const topBase = r2(full * ratio); // similar-scaled base at the cut
  const leftFull = 6; // side length proxy
  const leftTop = r2(leftFull * ratio);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Similarity <em>proves</em>{" "}theorems. The <strong>side-splitter</strong>:
        a line drawn parallel to one side of a triangle cuts the other two sides in
        the <strong>same ratio</strong>. It works because the small top triangle is
        similar to the whole.
      </p>

      <Figure caption="A cut parallel to the base makes a smaller similar triangle — sides split proportionally.">
        <div className="flex flex-col items-center gap-6">
          <svg width={240} height={200} viewBox="0 0 240 200" role="img" aria-label={`Triangle with a line drawn parallel to the base, ${cut} sixth${cut === 1 ? "" : "s"} of the way down from the apex, cutting off a smaller similar triangle`}>
            {/* full triangle: apex at top */}
            <polygon points="120,20 40,180 200,180" fill={ACCENT} fillOpacity={0.12} stroke={ACCENT} strokeWidth={2.5} />
            {/* parallel cut */}
            {(() => {
              const y = 20 + (180 - 20) * ratio;
              const halfW = 80 * ratio;
              return (
                <>
                  <line x1={120 - halfW} y1={y} x2={120 + halfW} y2={y} stroke="var(--band-upper)" strokeWidth={2.5} />
                  <circle cx={120 - halfW} cy={y} r={3} fill="var(--band-upper)" />
                  <circle cx={120 + halfW} cy={y} r={3} fill="var(--band-upper)" />
                </>
              );
            })()}
          </svg>

          <div className="grid grid-cols-2 gap-4 text-center font-mono text-sm">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">top base = {topBase}<br /><span className="text-xs text-[var(--ink-faint)]">of full base {full}</span></div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">ratio = {cut}/6 = <strong style={{ color: ACCENT }}>{r2(ratio)}</strong><br /><span className="text-xs text-[var(--ink-faint)]">same on every side</span></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="cut position" value={cut} min={1} max={5} onChange={setCut} />
            <Stepper label="full base" value={full} min={4} max={12} onChange={setFull} />
          </div>
        </div>
      </Figure>

      <h2>Proportional reasoning</h2>
      <p>
        The top triangle shares the apex angle and has equal corresponding angles
        (parallel lines!), so it&apos;s similar to the whole by AA. Similar triangles
        have proportional sides, so the cut divides each side in the ratio {r2(ratio)}.
        The <strong>Pythagorean theorem itself</strong>{" "}can be proved this way, by
        dropping an altitude to make two similar sub-triangles.
      </p>

      <MathCheck>
        <p>
          <strong>Similarity proofs</strong>{" "}(G-SRT.4): a line parallel to one side
          of a triangle divides the other two <strong>proportionally</strong>, and
          the Pythagorean theorem follows from similar right triangles formed by an
          altitude. These similarity and congruence criteria then{" "}
          <strong>solve problems</strong>{" "}and prove relationships in figures
          (G-SRT.5).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
