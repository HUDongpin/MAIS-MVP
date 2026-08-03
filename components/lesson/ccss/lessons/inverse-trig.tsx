"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [deg, setDeg] = useState(30);
  const rad = (deg * Math.PI) / 180;
  const s = r2(Math.sin(rad));
  // arcsin returns principal value in [-90, 90]. Invert the EXACT sine, not the
  // two-decimal display value — arcsin(r2(sin 40°)) is 39.79°, which would have
  // the panel deny the very claim the lesson makes, that arcsin recovers the angle.
  const principal = r2((Math.asin(Math.sin(rad)) * 180) / Math.PI);
  const secondSolution = 180 - deg; // same sine in [0,360)

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Sine isn&apos;t one-to-one — many angles share a sine, so it has no inverse
        as-is. The fix: <strong>restrict the domain</strong>{" "}to [−90°, 90°], where
        sine climbs steadily. On that slice, <strong>arcsin</strong>{" "}is a genuine
        inverse that recovers the angle.
      </p>

      <Figure caption="sin(θ) = value has many solutions; arcsin returns the one principal angle in [−90°, 90°].">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-2xl border-2 px-8 py-4 text-center font-mono" style={{ borderColor: ACCENT }}>
            <div className="text-lg">sin({deg}°) = <strong style={{ color: ACCENT }}>{s}</strong></div>
            <div className="mt-2 text-lg">arcsin({s}) = <strong style={{ color: ACCENT }}>{principal}°</strong></div>
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] px-6 py-3 text-center text-sm">
            <div className="font-bold">Solving sin(x) = {s} on [0°, 360°):</div>
            <div className="mt-1 font-mono">x = {deg}° or x = {secondSolution}°</div>
            <div className="mt-1 text-xs text-[var(--ink-faint)]">arcsin gives the principal value; add symmetry &amp; periodicity for the rest.</div>
          </div>

          <Slider label="angle" value={deg} onChange={setDeg} />
        </div>
      </Figure>

      <h2>Restrict, invert, then solve</h2>
      <p>
        Because sine repeats, sin(x) = {s} has infinitely many solutions. The
        calculator&apos;s arcsin returns just the <strong>principal</strong>{" "}one,
        {principal}°. To find <em>all</em>{" "}solutions in a range you use the unit
        circle&apos;s symmetry (a second angle {secondSolution}°) and add multiples
        of 360°. Restricting the domain is what makes the inverse well-defined in the
        first place.
      </p>

      <MathCheck>
        <p>
          Trig functions repeat, so their domains must be <strong>restricted</strong>{" "}
          to make them one-to-one and invertible (F-TF.6): sine on [−π/2, π/2],
          cosine on [0, π]. The <strong>inverse trig functions</strong>{" "}then solve
          equations like sin x = k (F-TF.7), returning the principal value — with
          symmetry supplying the remaining solutions.
        </p>
      </MathCheck>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}: <span style={{ color: ACCENT }}>{value}°</span></span>
      <input type="range" min={10} max={80} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-56" style={{ accentColor: ACCENT }} aria-label={label} />
    </div>
  );
}
