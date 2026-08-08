"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const CX = 130, CY = 130, RAD = 100;
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Lesson() {
  const [deg, setDeg] = useState(40);

  const rad = (deg * Math.PI) / 180;
  const cos = r2(Math.cos(rad));
  const sin = r2(Math.sin(rad));
  const px = r2(CX + RAD * Math.cos(rad));
  const py = r2(CY - RAD * Math.sin(rad));
  // reflection across y-axis: 180 - deg (same sine, opposite cosine)
  const rd2 = ((180 - deg) * Math.PI) / 180;
  const qx = r2(CX + RAD * Math.cos(rd2));
  const qy = r2(CY - RAD * Math.sin(rd2));

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The unit circle is full of <strong>symmetry</strong>. Reflecting an angle
        gives predictable sign changes: cos(−θ) = cos θ, sin(π − θ) = sin θ. And
        going all the way around returns you to the start, which is why sine and
        cosine are <strong>periodic</strong>{" "}with period 2π.
      </p>

      <Figure caption="θ and its reflection π − θ share the same sine but opposite cosine. Symmetry gives the signs.">
        <div className="flex flex-col items-center gap-6">
          <svg width={260} height={260} viewBox="0 0 260 260" role="img" aria-label={`Unit circle with a solid radius drawn to the point at ${deg} degrees and a dashed radius drawn to its mirror point at ${180 - deg} degrees, both points the same height above the horizontal axis`}>
            <circle cx={CX} cy={CY} r={RAD} fill="none" stroke="var(--line)" strokeWidth={2} />
            <line x1={CX - RAD - 15} y1={CY} x2={CX + RAD + 15} y2={CY} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={CX} y1={CY - RAD - 15} x2={CX} y2={CY + RAD + 15} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {/* main angle */}
            <line x1={CX} y1={CY} x2={px} y2={py} stroke={ACCENT} strokeWidth={2.5} />
            <circle cx={px} cy={py} r={5} fill={ACCENT} />
            {/* reflected angle */}
            <line x1={CX} y1={CY} x2={qx} y2={qy} stroke="var(--band-upper)" strokeWidth={2.5} strokeDasharray="4 3" />
            <circle cx={qx} cy={qy} r={5} fill="var(--band-upper)" />
          </svg>

          <div className="grid grid-cols-2 gap-4 text-center font-mono text-sm">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2" style={{ color: ACCENT }}>
              θ = {deg}°<br />(cos, sin) = ({cos}, {sin})
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2" style={{ color: "var(--band-upper)" }}>
              180° − θ = {180 - deg}°<br />(cos, sin) = ({r2(-cos)}, {sin})
            </div>
          </div>
          <p className="m-0 text-center text-sm text-[var(--ink-soft)]">Same sine ({sin}), opposite cosine — the reflection across the y-axis.</p>

          <Slider label="angle θ" value={deg} onChange={setDeg} />
        </div>
      </Figure>

      <h2>Symmetry and periodicity</h2>
      <p>
        Cosine is <strong>even</strong>: cos(−θ) = cos θ (reflection across the
        x-axis). Sine is <strong>odd</strong>: sin(−θ) = −sin θ. And since one full
        turn is 2π, adding 2π to any angle lands on the same point:{" "}
        sin(θ + 2π) = sin θ. These identities let you evaluate any angle from a
        first-quadrant reference.
      </p>

      <MathCheck>
        <p>
          The unit circle&apos;s <strong>symmetry</strong>{" "}explains sign patterns
          and <strong>periodicity</strong>{" "}(F-TF.4): reflections give even/odd
          identities cos(−θ) = cos θ and sin(−θ) = −sin θ, and full rotations give
          period 2π. Every angle reduces to a first-quadrant reference angle with the
          appropriate sign.
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
