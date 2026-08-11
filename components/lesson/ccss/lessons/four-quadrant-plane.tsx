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
type Quadrant = "I" | "II" | "III" | "IV";
type CoordinateLabelRole = "main" | "reflected";
type CoordinateTextAnchor = "end" | "middle" | "start";
type Point = { x: number; y: number };

type DiagramBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

const COORDINATE_LABEL_METRICS = {
  main: {
    fontSize: 13,
    fontWeight: 800,
    markerRadius: 8,
    markerStrokeWidth: 2.5,
  },
  reflected: {
    fontSize: 12,
    fontWeight: 700,
    markerRadius: 7,
    markerStrokeWidth: 2.5,
  },
} as const;
const COORDINATE_LABEL_WIDTH_EM = 0.72;
const COORDINATE_LABEL_ASCENT_EM = 1.05;
const COORDINATE_LABEL_DESCENT_EM = 0.35;
const COORDINATE_LABEL_MARKER_GAP = 2;

const sx = (x: number) => ORIGIN + x * CELL;
const sy = (y: number) => ORIGIN - y * CELL;
const clamp = (v: number) => Math.max(-R, Math.min(R, v));

function horizontalTextBounds(
  textAnchor: CoordinateTextAnchor,
  x: number,
  width: number,
): Pick<DiagramBounds, "left" | "right"> {
  if (textAnchor === "start") return { left: x, right: x + width };
  if (textAnchor === "end") return { left: x - width, right: x };
  return { left: x - width / 2, right: x + width / 2 };
}

export function coordinateLabelLayout(point: Point, role: CoordinateLabelRole) {
  const metrics = COORDINATE_LABEL_METRICS[role];
  const text = `(${point.x}, ${point.y})`;
  const width = text.length * metrics.fontSize * COORDINATE_LABEL_WIDTH_EM;
  const ascent = metrics.fontSize * COORDINATE_LABEL_ASCENT_EM;
  const descent = metrics.fontSize * COORDINATE_LABEL_DESCENT_EM;
  const height = ascent + descent;
  const markerPaintRadius = metrics.markerRadius + metrics.markerStrokeWidth / 2;
  let x = sx(point.x);
  let textAnchor: CoordinateTextAnchor = point.x < 0 ? "end" : point.x > 0 ? "start" : "middle";
  let horizontal = horizontalTextBounds(textAnchor, x, width);

  if (horizontal.left < 0 || horizontal.right > SIZE) {
    textAnchor = textAnchor === "end" ? "start" : textAnchor === "start" ? "end" : "middle";
    horizontal = horizontalTextBounds(textAnchor, x, width);
  }
  if (horizontal.left < 0 || horizontal.right > SIZE) {
    textAnchor = "middle";
    x = Math.max(width / 2, Math.min(SIZE - width / 2, x));
    horizontal = horizontalTextBounds(textAnchor, x, width);
  }

  const pointY = sy(point.y);
  let placement: "above" | "below" = point.y < 0 ? "below" : "above";
  const verticalBounds = (nextPlacement: "above" | "below") => {
    const top = nextPlacement === "above"
      ? pointY - markerPaintRadius - COORDINATE_LABEL_MARKER_GAP - height
      : pointY + markerPaintRadius + COORDINATE_LABEL_MARKER_GAP;
    return { bottom: top + height, top };
  };
  let vertical = verticalBounds(placement);
  if (vertical.top < 0 || vertical.bottom > SIZE) {
    placement = placement === "above" ? "below" : "above";
    vertical = verticalBounds(placement);
  }
  if (vertical.top < 0 || vertical.bottom > SIZE) {
    const top = Math.max(0, Math.min(SIZE - height, vertical.top));
    vertical = { bottom: top + height, top };
  }

  return {
    ascent,
    bounds: { ...horizontal, ...vertical },
    fontSize: metrics.fontSize,
    fontWeight: metrics.fontWeight,
    markerPaintRadius,
    markerRadius: metrics.markerRadius,
    markerStrokeWidth: metrics.markerStrokeWidth,
    placement,
    text,
    textAnchor,
    x,
    y: vertical.top + ascent,
  };
}

function boundsOverlap(a: DiagramBounds, b: DiagramBounds) {
  return Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
    Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
}

function markerPaintBounds(point: Point, paintRadius: number): DiagramBounds {
  return {
    bottom: sy(point.y) + paintRadius,
    left: sx(point.x) - paintRadius,
    right: sx(point.x) + paintRadius,
    top: sy(point.y) - paintRadius,
  };
}

function quadrantTextBounds(quadrant: Quadrant, point: Point): DiagramBounds {
  const width = quadrant.length * 11;
  return {
    bottom: sy(point.y) + 3,
    left: sx(point.x) - width / 2,
    right: sx(point.x) + width / 2,
    top: sy(point.y) - 18,
  };
}

const QUADRANT_SIGNS: Record<Quadrant, { x: -1 | 1; y: -1 | 1 }> = {
  I: { x: 1, y: 1 },
  II: { x: -1, y: 1 },
  III: { x: -1, y: -1 },
  IV: { x: 1, y: -1 },
};

export function quadrantLabelPosition(
  quadrant: Quadrant,
  activePoints: ReadonlyArray<Point>,
) {
  const signs = QUADRANT_SIGNS[quadrant];
  const outer = { x: signs.x * (R - 1), y: signs.y * (R - 1) };
  const inner = { x: signs.x * 1.5, y: signs.y * 1.5 };
  const mainPoint = activePoints[0];
  const reflectedPoint = activePoints[1];
  if (!mainPoint) return outer;

  const visiblePoints = [
    { label: coordinateLabelLayout(mainPoint, "main"), point: mainPoint },
    ...(reflectedPoint && (mainPoint.x !== reflectedPoint.x || mainPoint.y !== reflectedPoint.y)
      ? [{ label: coordinateLabelLayout(reflectedPoint, "reflected"), point: reflectedPoint }]
      : []),
  ];
  const obstacles = visiblePoints.flatMap(({ label, point }) => [
    label.bounds,
    markerPaintBounds(point, label.markerPaintRadius),
  ]);

  return [outer, inner].find((candidate) =>
    obstacles.every((obstacle) => !boundsOverlap(quadrantTextBounds(quadrant, candidate), obstacle)),
  ) ?? inner;
}

export default function Lesson() {
  const [p, setP] = useState({ x: 3, y: 4 });
  const [axis, setAxis] = useState<Axis>("y");
  const svgRef = useRef<SVGSVGElement>(null);

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
  const isSelfReflection = p.x === reflected.x && p.y === reflected.y;
  const mainLabel = coordinateLabelLayout(p, "main");
  const reflectedLabel = coordinateLabelLayout(reflected, "reflected");
  const pointLocation = describePointLocation(p, quadrant);
  const reflectionDescription = isSelfReflection
    ? `Reflecting it across the ${axis}-axis leaves it unchanged.`
    : `Its reflection across the ${axis}-axis is (${reflected.x}, ${reflected.y}).`;

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
            aria-label={`Point at (${p.x}, ${p.y}) ${pointLocation}. ${reflectionDescription}`}
            data-diagram-self-reflection={isSelfReflection ? "true" : "false"}
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
            {(["I", "II", "III", "IV"] as const).map((q) => {
              const pos = quadrantLabelPosition(q, [p, reflected]);
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

            {!isSelfReflection && (
              <g data-diagram-reflected-point>
                {/* connector */}
                <line x1={sx(p.x)} y1={sy(p.y)} x2={sx(reflected.x)} y2={sy(reflected.y)} stroke={REFLECT} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.5} />

                {/* reflected point */}
                <circle
                  cx={sx(reflected.x)}
                  cy={sy(reflected.y)}
                  r={reflectedLabel.markerRadius}
                  fill="none"
                  stroke={REFLECT}
                  strokeWidth={reflectedLabel.markerStrokeWidth}
                />
                <text
                  x={reflectedLabel.x}
                  y={reflectedLabel.y}
                  textAnchor={reflectedLabel.textAnchor}
                  fontSize={reflectedLabel.fontSize}
                  fontWeight={reflectedLabel.fontWeight}
                  fill={REFLECT}
                  fontFamily="var(--font-mono)"
                >
                  {reflectedLabel.text}
                </text>
              </g>
            )}

            {/* main point */}
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={mainLabel.markerRadius}
              fill={POINT}
              stroke={isSelfReflection ? REFLECT : "white"}
              strokeWidth={mainLabel.markerStrokeWidth}
              data-diagram-main-point
            />
            <text
              x={mainLabel.x}
              y={mainLabel.y}
              textAnchor={mainLabel.textAnchor}
              fontSize={mainLabel.fontSize}
              fontWeight={mainLabel.fontWeight}
              fill={POINT}
              fontFamily="var(--font-mono)"
              data-diagram-main-point-label
            >
              {mainLabel.text}
            </text>
          </svg>

          <div className="text-center text-[15px] text-[var(--ink-soft)]">
            <span className="font-mono font-bold" style={{ color: POINT }}>({p.x}, {p.y})</span>{" "}
            is <strong>{pointLocation}</strong>.{" "}
            {isSelfReflection ? (
              <>
                It lies on the <strong>{axis}-axis</strong>, so its reflection is the same point — unchanged.
              </>
            ) : (
              <>
                Its mirror across the <strong>{axis}-axis</strong>{" "}is{" "}
                <span className="font-mono font-bold" style={{ color: REFLECT }}>({reflected.x}, {reflected.y})</span>.
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex flex-wrap items-center justify-center gap-2">
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
            <div className="flex flex-wrap items-center justify-center gap-6">
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

function quadrantOf(p: Point): Quadrant | null {
  if (p.x === 0 || p.y === 0) return null;
  if (p.x > 0 && p.y > 0) return "I";
  if (p.x < 0 && p.y > 0) return "II";
  if (p.x < 0 && p.y < 0) return "III";
  return "IV";
}

function describePointLocation(p: Point, quadrant: Quadrant | null): string {
  if (p.x === 0 && p.y === 0) return "at the origin";
  if (p.x === 0) return "on the y-axis";
  if (p.y === 0) return "on the x-axis";
  return `in Quadrant ${quadrant}`;
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
