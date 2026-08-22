"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";

export default function Lesson() {
  const [angle, setAngle] = useState(50); // the transversal angle

  const a = angle;
  const supp = 180 - a;

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
          <svg className="mx-auto h-auto max-w-full" width={260} height={200} viewBox="0 0 260 200" role="img" aria-label="parallel lines cut by a transversal">
            {/* two parallel lines */}
            <line x1={20} y1={70} x2={240} y2={70} stroke="var(--ink-soft)" strokeWidth={2.5} />
            <line x1={20} y1={140} x2={240} y2={140} stroke="var(--ink-soft)" strokeWidth={2.5} />
            {/* transversal */}
            <line x1={70} y1={30} x2={190} y2={180} stroke={ACCENT} strokeWidth={2.5} />
            {/* angle labels at top intersection (~103,70) */}
            <text x={112} y={62} fontSize={13} fontWeight={800} fill={ACCENT}>{a}°</text>
            <text x={86} y={62} fontSize={12} fill="var(--band-upper)">{supp}°</text>
            {/* bottom intersection (~157,140) — corresponding angle equal */}
            <text x={166} y={132} fontSize={13} fontWeight={800} fill={ACCENT}>{a}°</text>
            <text x={140} y={158} fontSize={12} fill="var(--band-upper)">{supp}°</text>
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
