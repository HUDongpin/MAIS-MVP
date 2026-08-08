"use client";

import { useRef, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const R = 6; // -R..R on each axis
const CELL = 24;
const PAD = 26;
const SIZE = 2 * R * CELL + 2 * PAD;
const ORIGIN = PAD + R * CELL;

const POINT = "var(--band-middle)";
const REFLECT = "var(--band-early)";

type Axis = "x" | "y";

export default function Lesson() {
  const [p, setP] = useState({ x: 3, y: 4 });
  const [axis, setAxis] = useState<Axis>("y");
  const svgRef = useRef<SVGSVGElement>(null);

  const sx = (x: number) => ORIGIN + x * CELL;
  const sy = (y: number) => ORIGIN - y * CELL;
  const clamp = (v: number) => Math.max(-R, Math.min(R, v));

  function place(clientX: number, clientY: number) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const nx = clamp(Math.round((loc.x - ORIGIN) / CELL));
    const ny = clamp(Math.round((ORIGIN - loc.y) / CELL));
    if (nx === 0 && ny === 0) return;
    setP({ x: nx, y: ny });
  }

  const reflected = axis === "x" ? { x: p.x, y: -p.y } : { x: -p.x, y: p.y };
  const quadrant = quadrantOf(p);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Numbers go both ways from zero, and so do the axes. The plane splits into
        four <strong>quadrants</strong>. The <strong>signs</strong>{" "}of a point&apos;s
        coordinates — plus or minus — tell you exactly which quadrant it is in.
        Click anywhere to move the point.
      </p>

      <Figure caption="Reflecting a point across an axis flips the sign of one coordinate — like a mirror.">
        <div className="flex flex-col items-center gap-5">
          <svg
            ref={svgRef}
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="max-w-full cursor-pointer touch-none"
            style={{ maxHeight: 380 }}
            onPointerDown={(e) => place(e.clientX, e.clientY)}
            role="img"
            // quadrantOf returns "none" on an axis, which read as "in quadrant
            // none". A screen reader gets the same wording the sighted reader gets.
            aria-label={quadrant === "none" ? `Point at (${p.x}, ${p.y}), on an axis and in no quadrant` : `Point at (${p.x}, ${p.y}) in quadrant ${quadrant}`}
          >
            {/* grid */}
            {Array.from({ length: 2 * R + 1 }, (_, i) => {
              const v = -R + i;
              return (
                <g key={v} stroke="var(--line)" strokeWidth={1}>
                  <line x1={sx(v)} y1={sy(-R)} x2={sx(v)} y2={sy(R)} />
                  <line x1={sx(-R)} y1={sy(v)} x2={sx(R)} y2={sy(v)} />
                </g>
              );
            })}
            {/* quadrant labels */}
            {(["I", "II", "III", "IV"] as const).map((q, i) => {
              const pos = [
                { x: R - 1, y: R - 1 },
                { x: -R + 1, y: R - 1 },
                { x: -R + 1, y: -R + 1 },
                { x: R - 1, y: -R + 1 },
              ][i];
              return (
                <text key={q} x={sx(pos.x)} y={sy(pos.y)} textAnchor="middle" fontSize={18} fontWeight={800} fill="var(--line)">
                  {q}
                </text>
              );
            })}
            {/* mirror line highlight */}
            {axis === "y" ? (
              <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke={REFLECT} strokeWidth={2.5} strokeDasharray="5 4" opacity={0.7} />
            ) : (
              <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke={REFLECT} strokeWidth={2.5} strokeDasharray="5 4" opacity={0.7} />
            )}
            {/* axes */}
            <line x1={sx(-R)} y1={sy(0)} x2={sx(R)} y2={sy(0)} stroke="var(--ink-soft)" strokeWidth={2} />
            <line x1={sx(0)} y1={sy(-R)} x2={sx(0)} y2={sy(R)} stroke="var(--ink-soft)" strokeWidth={2} />

            {/* connector */}
            <line x1={sx(p.x)} y1={sy(p.y)} x2={sx(reflected.x)} y2={sy(reflected.y)} stroke={REFLECT} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.5} />

            {/* reflected point */}
            <circle cx={sx(reflected.x)} cy={sy(reflected.y)} r={7} fill="none" stroke={REFLECT} strokeWidth={2.5} />
            <text x={sx(reflected.x)} y={sy(reflected.y) - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill={REFLECT} fontFamily="var(--font-mono)">
              ({reflected.x}, {reflected.y})
            </text>

            {/* main point */}
            <circle cx={sx(p.x)} cy={sy(p.y)} r={8} fill={POINT} stroke="white" strokeWidth={2.5} />
            <text x={sx(p.x)} y={sy(p.y) - 14} textAnchor="middle" fontSize={13} fontWeight={800} fill={POINT} fontFamily="var(--font-mono)">
              ({p.x}, {p.y})
            </text>
          </svg>

          <div className="text-center text-[15px] text-[var(--ink-soft)]">
            <span className="font-mono font-bold" style={{ color: POINT }}>({p.x}, {p.y})</span>{" "}
            is in <strong>Quadrant {quadrant}</strong>. Its mirror across the{" "}
            <strong>{axis}-axis</strong>{" "}is{" "}
            <span className="font-mono font-bold" style={{ color: REFLECT }}>({reflected.x}, {reflected.y})</span>.
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Mirror across</span>
              {(["y", "x"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAxis(a)}
                  className="rounded-lg border px-3 py-1.5 text-sm font-bold"
                  style={
                    axis === a
                      ? { background: REFLECT, color: "white", borderColor: REFLECT }
                      : { borderColor: "var(--line)", color: "var(--ink-soft)" }
                  }
                >
                  {a}-axis
                </button>
              ))}
            </div>
            <div className="flex items-center gap-6">
              <Stepper label="x" value={p.x} onChange={(v) => setP({ ...p, x: clamp(v) })} />
              <Stepper label="y" value={p.y} onChange={(v) => setP({ ...p, y: clamp(v) })} />
            </div>
          </div>
        </div>
      </Figure>

      <h2>Signs make quadrants</h2>
      <p>
        Quadrant <strong>I</strong>{" "}is (+, +); <strong>II</strong>{" "}is (−, +);{" "}
        <strong>III</strong>{" "}is (−, −); and <strong>IV</strong>{" "}is (+, −). Reading
        the two signs tells you the quadrant before you even plot the point.
      </p>

      <MathCheck>
        <p>
          Every point has a signed pair <strong>(x, y)</strong>: the sign of{" "}
          <strong>x</strong>{" "}says left (−) or right (+) of the y-axis, and the
          sign of <strong>y</strong>{" "}says below (−) or above (+) the x-axis
          (6.NS.C.6). Reflecting a point across an axis changes only the sign of
          the coordinate perpendicular to that axis: across the y-axis{" "}
          <strong>(x, y) → (−x, y)</strong>; across the x-axis{" "}
          <strong>(x, y) → (x, −y)</strong>{" "}(6.NS.C.8).
        </p>
      </MathCheck>
    </div>
  );
}

// A point on an axis is in no quadrant; the caller substitutes this string
// into sentences that already supply their own wording for that case.
function quadrantOf(p: { x: number; y: number }): string {
  if (p.x === 0 || p.y === 0) return "none";
  if (p.x > 0 && p.y > 0) return "I";
  if (p.x < 0 && p.y > 0) return "II";
  if (p.x < 0 && p.y < 0) return "III";
  return "IV";
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= -R} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= R} className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
