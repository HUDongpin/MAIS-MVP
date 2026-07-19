"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const S = 11; // px per unit
const LW = "var(--band-upper)"; // top/bottom (l×w)
const LH = "var(--band-middle)"; // front/back (l×h)
const WH = "var(--band-high)"; // sides (w×h)

export default function Lesson() {
  const [l, setL] = useState(4);
  const [w, setW] = useState(3);
  const [h, setH] = useState(2);

  const lw = l * w, lh = l * h, wh = w * h;
  const surface = 2 * (lw + lh + wh);

  // net layout (cross): column at x=w
  const col = w;
  const face = (x: number, y: number, ww: number, hh: number, fill: string, label: string) => (
    <g>
      <rect x={x * S} y={y * S} width={ww * S} height={hh * S} fill={fill} fillOpacity={0.6} stroke="var(--ink)" strokeWidth={1.5} />
      <text x={(x + ww / 2) * S} y={(y + hh / 2) * S + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--ink)" fontFamily="var(--font-mono)">{label}</text>
    </g>
  );
  const totalW = (2 * w + l) * S;
  const totalH = (2 * w + 2 * h) * S;

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Unfold a box flat and you get its <strong>net</strong>{" "}— all six
        rectangular faces laid out. The <strong>surface area</strong>{" "}is simply the
        sum of the areas of those faces.
      </p>

      <Figure caption="The six faces come in three matching pairs. Add their areas for the surface area.">
        <div className="flex flex-col items-center gap-6">
          <svg width={totalW + 4} height={totalH + 4} viewBox={`0 0 ${totalW + 4} ${totalH + 4}`} className="max-w-full" role="img" aria-label="net of a rectangular prism">
            <g transform="translate(2,2)">
              {face(col, 0, l, w, LW, `${lw}`)}
              {face(0, w, w, h, WH, `${wh}`)}
              {face(col, w, l, h, LH, `${lh}`)}
              {face(col + l, w, w, h, WH, `${wh}`)}
              {face(col, w + h, l, w, LW, `${lw}`)}
              {face(col, 2 * w + h, l, h, LH, `${lh}`)}
            </g>
          </svg>

          <div className="text-center">
            <div className="font-mono text-lg font-black">
              2(<span style={{ color: LW }}>{lw}</span>) + 2(<span style={{ color: LH }}>{lh}</span>) + 2(<span style={{ color: WH }}>{wh}</span>) = <span style={{ color: "var(--band-upper)" }}>{surface}</span>
            </div>
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">Surface area = 2(lw + lh + wh) = {surface} sq units</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Length" value={l} onChange={setL} />
            <Stepper label="Width" value={w} onChange={setW} />
            <Stepper label="Height" value={h} onChange={setH} />
          </div>
        </div>
      </Figure>

      <h2>Six faces, three pairs</h2>
      <p>
        A box has a top and bottom ({l}×{w} = {lw} each), a front and back ({l}×{h}{" "}
        = {lh} each), and two sides ({w}×{h} = {wh} each). Adding all six —
        2({lw}) + 2({lh}) + 2({wh}) — gives {surface} square units.
      </p>

      <MathCheck>
        <p>
          A <strong>net</strong>{" "}unfolds a three-dimensional figure into its flat
          faces (6.G.A.4). The <strong>surface area</strong>{" "}is the total area of
          the net: for a rectangular prism that is 2(lw + lh + wh) = {surface}.
          Nets make surface area a straightforward area-addition problem.
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const set = (v: number) => onChange(Math.max(1, Math.min(5, v)));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= 1} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-7 text-center text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= 5} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
