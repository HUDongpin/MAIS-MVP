"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

export default function Lesson() {
  const [angle, setAngle] = useState(50); // the transversal angle

  const a = angle;
  const supp = 180 - a;

  // The transversal used to be a hard-coded segment at a fixed 51.3°, so the
  // slider changed only the printed numbers and never the picture. Drive it from
  // `angle` about the centre of the strip.
  const TOP_Y = 70;
  const BOT_Y = 140;
  const CX = 130;
  const CY = (TOP_Y + BOT_Y) / 2;
  const t = Math.tan((a * Math.PI) / 180);
  const halfDx = Math.min(75 / t, 118);
  const halfDy = halfDx * t;
  // Where the transversal actually crosses each parallel.
  const xTop = CX - (CY - TOP_Y) / t;
  const xBot = CX + (BOT_Y - CY) / t;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        When a <strong>transversal</strong>{" "}cuts two <strong>parallel
        lines</strong>, the eight angles formed come in just two sizes. Vertical
        angles are equal, and <strong>corresponding</strong>{" "}and{" "}
        <strong>alternate</strong>{" "}angles are equal too — facts you can prove, then
        use everywhere.
      </p>

      <Figure caption="One angle determines all eight. Equal angles are the same color; supplementary pairs sum to 180°.">
        <div className="flex flex-col items-center gap-6">
          <svg width={260} height={200} viewBox="0 0 260 200" role="img" aria-label="parallel lines cut by a transversal">
            {/* two parallel lines */}
            <line x1={20} y1={TOP_Y} x2={240} y2={TOP_Y} stroke="var(--ink-soft)" strokeWidth={2.5} />
            <line x1={20} y1={BOT_Y} x2={240} y2={BOT_Y} stroke="var(--ink-soft)" strokeWidth={2.5} />
            {/* transversal, rotated by the slider */}
            <line x1={CX - halfDx} y1={CY - halfDy} x2={CX + halfDx} y2={CY + halfDy} stroke={ACCENT} strokeWidth={2.5} />
            {/* At each crossing the acute angle a sits in the upper-LEFT wedge and
                the supplement in the upper-RIGHT one. The labels used to be
                swapped, printing the acute value inside the obtuse corner. */}
            <text x={xTop - 24} y={TOP_Y - 8} fontSize={13} fontWeight={800} fill={ACCENT}>{a}°</text>
            <text x={xTop + 8} y={TOP_Y - 8} fontSize={12} fill="var(--band-upper)">{supp}°</text>
            <text x={xBot - 24} y={BOT_Y - 8} fontSize={13} fontWeight={800} fill={ACCENT}>{a}°</text>
            <text x={xBot + 8} y={BOT_Y - 8} fontSize={12} fill="var(--band-upper)">{supp}°</text>
          </svg>

          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">Corresponding &amp; alternate angles: <strong style={{ color: ACCENT }}>{a}°</strong></div>
            <div className="rounded-lg bg-[var(--surface-2)] px-4 py-2">Supplementary (co-interior): <strong style={{ color: "var(--band-upper)" }}>{a}° + {supp}° = 180°</strong></div>
          </div>

          <Slider label="transversal angle" value={angle} onChange={setAngle} />
        </div>
      </Figure>

      <h2>Proving the angle relationships</h2>
      <p>
        <strong>Vertical angles</strong>{" "}are equal because each is supplementary to
        the same neighbor. When the lines are parallel, a translation along the
        transversal carries the top intersection exactly onto the bottom, matching{" "}
        <strong>corresponding angles</strong>{" "}({a}° = {a}°). Alternate interior
        angles then follow, and co-interior angles are supplementary: {a}° + {supp}°
        = 180°.
      </p>

      <MathCheck>
        <p>
          Theorems about lines and angles (G-CO.9): <strong>vertical angles</strong>{" "}
          are congruent; when a transversal crosses <strong>parallel lines</strong>,
          alternate interior and corresponding angles are congruent and co-interior
          angles are supplementary; and points on a{" "}
          <strong>perpendicular bisector</strong>{" "}are equidistant from the segment&apos;s
          endpoints. Each is proved from rigid motions or earlier theorems.
        </p>
      </MathCheck>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}: <span style={{ color: ACCENT }}>{value}°</span></span>
      <input type="range" min={30} max={75} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-56" style={{ accentColor: ACCENT }} aria-label={label} />
    </div>
  );
}
