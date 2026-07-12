"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { useMemo, useRef, useState } from "react";

type VertexKey = "A" | "B" | "C";
type Point = { x: number; y: number };
type Triangle = Record<VertexKey, Point>;
type EvidenceEntry = {
  id: number;
  verb: string;
  detail: string;
};
type DragState = {
  key: VertexKey;
  pointerId: number;
};

type EulerFields = {
  area: number;
  circumRadius: number;
  OG: number;
  GH: number;
  ratioGH_OG: number;
  ninePointRadius: number;
  collinear: boolean;
  eulerDegenerate: boolean;
  O: Point;
  G: Point;
  H: Point;
  N: Point;
  eulerLine: { a: Point; b: Point } | null;
  ninePointDots: Point[];
};

const vertexKeys: VertexKey[] = ["A", "B", "C"];
const plot = { x: 30, y: 30, width: 600, height: 400 };
const initialTriangle: Triangle = {
  A: { x: 322, y: 112 },
  B: { x: 166, y: 382 },
  C: { x: 545, y: 324 }
};

const taskBank = [
  "Move a vertex and keep O, G, H locked on one Euler line.",
  "Make the nine-point circle visibly pass through the side midpoints.",
  "Create a tall triangle and watch GH stay twice OG.",
  "Drag C close to the circumcircle edge and compare R9 with R/2."
];

const summaryCardClass =
  "rounded-lg border border-sky-300/25 bg-sky-950/45 px-4 py-3 shadow-[0_0_0_1px_rgba(96,165,250,0.04)]";

function sq(value: number) {
  return value * value;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function triangleArea(tri: Triangle) {
  const { A, B, C } = tri;
  return Math.abs((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x)) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(point: Point, factor: number): Point {
  return { x: point.x * factor, y: point.y * factor };
}

function projectPointToLine(point: Point, lineA: Point, lineB: Point): Point {
  const vx = lineB.x - lineA.x;
  const vy = lineB.y - lineA.y;
  const denom = vx * vx + vy * vy || 1;
  const t = ((point.x - lineA.x) * vx + (point.y - lineA.y) * vy) / denom;
  return { x: lineA.x + vx * t, y: lineA.y + vy * t };
}

function circumcenter(tri: Triangle): { center: Point; degenerate: boolean } {
  const { A, B, C } = tri;
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));

  if (Math.abs(d) < 0.001) {
    return { center: centroid(tri), degenerate: true };
  }

  const a2 = sq(A.x) + sq(A.y);
  const b2 = sq(B.x) + sq(B.y);
  const c2 = sq(C.x) + sq(C.y);

  return {
    center: {
      x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d,
      y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d
    },
    degenerate: false
  };
}

function centroid(tri: Triangle): Point {
  return {
    x: (tri.A.x + tri.B.x + tri.C.x) / 3,
    y: (tri.A.y + tri.B.y + tri.C.y) / 3
  };
}

function buildEulerLine(O: Point, H: Point): { a: Point; b: Point } | null {
  const vector = subtract(H, O);
  const length = Math.hypot(vector.x, vector.y);
  if (length < 0.001) return null;

  const unit = scale(vector, 1 / length);
  return {
    a: add(O, scale(unit, -900)),
    b: add(O, scale(unit, 900))
  };
}

function computeEulerFields(triangle: Triangle): EulerFields {
  const OResult = circumcenter(triangle);
  const O = OResult.center;
  const G = centroid(triangle);
  const H = {
    x: triangle.A.x + triangle.B.x + triangle.C.x - 2 * O.x,
    y: triangle.A.y + triangle.B.y + triangle.C.y - 2 * O.y
  };
  const N = midpoint(O, H);
  const circumRadius = distance(O, triangle.A);
  const OG = distance(O, G);
  const GH = distance(G, H);
  const ratioGH_OG = OG < 0.001 ? 0 : GH / OG;
  const cross = Math.abs((G.x - O.x) * (H.y - O.y) - (G.y - O.y) * (H.x - O.x));
  const collinearityError = cross / Math.max(1, distance(O, H));
  const eulerLine = buildEulerLine(O, H);

  return {
    area: triangleArea(triangle),
    circumRadius,
    OG,
    GH,
    ratioGH_OG,
    ninePointRadius: circumRadius / 2,
    collinear: collinearityError < 0.4,
    eulerDegenerate: OResult.degenerate || !eulerLine,
    O,
    G,
    H,
    N,
    eulerLine,
    ninePointDots: [
      midpoint(triangle.A, triangle.B),
      midpoint(triangle.B, triangle.C),
      midpoint(triangle.C, triangle.A),
      midpoint(triangle.A, H),
      midpoint(triangle.B, H),
      midpoint(triangle.C, H),
      projectPointToLine(triangle.A, triangle.B, triangle.C),
      projectPointToLine(triangle.B, triangle.C, triangle.A),
      projectPointToLine(triangle.C, triangle.A, triangle.B)
    ]
  };
}

function formatMetric(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(digits);
}

function constrainPoint(point: Point): Point {
  return {
    x: clamp(point.x, plot.x + 32, plot.x + plot.width - 32),
    y: clamp(point.y, plot.y + 32, plot.y + plot.height - 32)
  };
}

function canUseTriangle(triangle: Triangle) {
  const separated = vertexKeys.every((key, index) =>
    vertexKeys.slice(index + 1).every((otherKey) => distance(triangle[key], triangle[otherKey]) > 54)
  );
  return separated && triangleArea(triangle) > 2000;
}

function getSvgPoint(svg: SVGSVGElement | null, event: { clientX: number; clientY: number }) {
  const screenMatrix = svg?.getScreenCTM();
  if (!svg || !screenMatrix) return null;

  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const svgPoint = point.matrixTransform(screenMatrix.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
}

function nextEvidenceId(entries: EvidenceEntry[]) {
  return entries.length ? Math.max(...entries.map((entry) => entry.id)) + 1 : 1;
}

function FieldCard({
  accent,
  label,
  value
}: {
  accent: "blue" | "mint" | "yellow";
  label: string;
  value: string;
}) {
  const valueClass =
    accent === "mint" ? "text-emerald-300" : accent === "yellow" ? "text-amber-300" : "text-sky-300";

  return (
    <div className={summaryCardClass}>
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-sky-200/70">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-black leading-none sm:text-3xl ${valueClass}`}>{value}</p>
    </div>
  );
}

export function StembenchEulerLineDemo() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const triangleRef = useRef<Triangle>(initialTriangle);
  const [triangle, setTriangle] = useState<Triangle>(initialTriangle);
  const [dragging, setDragging] = useState<VertexKey | null>(null);
  const [activeVertex, setActiveVertex] = useState<VertexKey>("A");
  const [taskIndex, setTaskIndex] = useState(0);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([
    { id: 1, verb: "report", detail: "Initial Euler fields computed from A, B, C." }
  ]);

  const fields = useMemo(() => computeEulerFields(triangle), [triangle]);
  const minorGridX = useMemo(() => Array.from({ length: 21 }, (_, index) => plot.x + index * 30), []);
  const minorGridY = useMemo(() => Array.from({ length: 15 }, (_, index) => plot.y + index * 30), []);
  const majorGridX = useMemo(() => Array.from({ length: 7 }, (_, index) => plot.x + index * 100), []);
  const majorGridY = useMemo(() => Array.from({ length: 5 }, (_, index) => plot.y + index * 100), []);

  function pushEvidence(verb: string, detail: string) {
    setEvidence((entries) => [{ id: nextEvidenceId(entries), verb, detail }, ...entries].slice(0, 5));
  }

  function updateVertex(key: VertexKey, point: Point) {
    setTriangle((current) => {
      const candidate = { ...current, [key]: constrainPoint(point) };
      const nextTriangle = canUseTriangle(candidate) ? candidate : current;
      triangleRef.current = nextTriangle;
      return nextTriangle;
    });
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const svgPoint = getSvgPoint(svgRef.current, event);
    if (!svgPoint) return;
    event.preventDefault();
    updateVertex(drag.key, svgPoint);
  }

  function finishDrag(event?: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const nextFields = computeEulerFields(triangleRef.current);
    pushEvidence(
      "adjusted",
      `Moved vertex ${drag.key}; OG=${formatMetric(nextFields.OG)}, GH=${formatMetric(nextFields.GH)}, GH/OG=${formatMetric(nextFields.ratioGH_OG, 2)}.`
    );
    if (event?.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }
    dragRef.current = null;
    setDragging(null);
  }

  function handleVertexKeyDown(key: VertexKey, event: KeyboardEvent<SVGGElement>) {
    const step = event.shiftKey ? 18 : 8;
    const deltas: Record<string, Point> = {
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 }
    };
    const delta = deltas[event.key];
    if (!delta) return;

    event.preventDefault();
    const current = triangle[key];
    updateVertex(key, { x: current.x + delta.x, y: current.y + delta.y });
    pushEvidence("nudged", `Keyboard nudged vertex ${key}.`);
  }

  function chooseTask() {
    setTaskIndex((index) => {
      const nextIndex = (index + 1) % taskBank.length;
      pushEvidence("selected", `Task: ${taskBank[nextIndex]}`);
      return nextIndex;
    });
  }

  function resetTriangle() {
    triangleRef.current = initialTriangle;
    dragRef.current = null;
    setTriangle(initialTriangle);
    setDragging(null);
    setActiveVertex("A");
    pushEvidence("reset", "Triangle returned to the demonstration seed state.");
  }

  const liveReport = {
    OG: Number(formatMetric(fields.OG)),
    GH: Number(formatMetric(fields.GH)),
    ratioGH_OG: Number(formatMetric(fields.ratioGH_OG, 2)),
    ninePointRadius: Number(formatMetric(fields.ninePointRadius)),
    collinear: fields.collinear,
    eulerDegenerate: fields.eulerDegenerate
  };

  return (
    <section
      className="mx-auto w-full max-w-[1500px] rounded-[24px] border border-sky-300/25 bg-[#071d2b] text-sky-100 shadow-2xl shadow-sky-950/60"
      data-stembench-svg-demo="euler-line-nine-point-circle"
      data-report-og={formatMetric(fields.OG, 2)}
      data-report-gh={formatMetric(fields.GH, 2)}
      data-report-ratio-gh-og={formatMetric(fields.ratioGH_OG, 3)}
      data-report-nine-point-radius={formatMetric(fields.ninePointRadius, 2)}
    >
      <header className="flex flex-col gap-2 border-b border-sky-300/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="font-mono text-sm font-bold uppercase tracking-[0.28em] text-sky-200/80">Construction Blueprint</p>
        <h1 className="font-mono text-base font-bold text-sky-200/80 sm:text-lg">Euler line & nine-point circle</h1>
      </header>

      <div className="space-y-5 p-5 sm:p-7">
        <div className="space-y-3">
          <button
            type="button"
            onClick={chooseTask}
            className="rounded-lg bg-amber-400 px-5 py-3 font-mono text-lg font-black text-slate-950 shadow-lg shadow-amber-900/20 transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 sm:px-7"
          >
            Give me a task
          </button>
          <p className="max-w-4xl font-mono text-sm leading-7 text-sky-200/72 sm:text-base">{taskBank[taskIndex]}</p>
        </div>

        <div className="rounded-lg border border-sky-300/25 bg-[#061927] p-2">
          <svg
            ref={svgRef}
            role="img"
            aria-label="Interactive Euler line and nine-point circle construction"
            viewBox="0 0 660 500"
            className="h-[420px] w-full touch-none select-none sm:h-[640px] xl:h-[680px]"
            data-viz-surface
            data-stembench-svg="advanced-geometry-euler-line"
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <defs>
              <clipPath id="stembench-euler-clip">
                <rect x={plot.x} y={plot.y} width={plot.width} height={plot.height} rx="8" />
              </clipPath>
            </defs>

            <rect width="660" height="500" fill="#061927" />
            <rect x={plot.x} y={plot.y} width={plot.width} height={plot.height} rx="8" fill="#071b29" stroke="#2c5878" strokeWidth="1.5" />

            <g clipPath="url(#stembench-euler-clip)">
              {minorGridX.map((x) => (
                <line key={`minor-x-${x}`} x1={x} y1={plot.y} x2={x} y2={plot.y + plot.height} stroke="#123044" strokeWidth="0.8" />
              ))}
              {minorGridY.map((y) => (
                <line key={`minor-y-${y}`} x1={plot.x} y1={y} x2={plot.x + plot.width} y2={y} stroke="#123044" strokeWidth="0.8" />
              ))}
              {majorGridX.map((x) => (
                <line key={`major-x-${x}`} x1={x} y1={plot.y} x2={x} y2={plot.y + plot.height} stroke="#18415d" strokeWidth="1.2" />
              ))}
              {majorGridY.map((y) => (
                <line key={`major-y-${y}`} x1={plot.x} y1={y} x2={plot.x + plot.width} y2={y} stroke="#18415d" strokeWidth="1.2" />
              ))}

              <circle cx={fields.O.x} cy={fields.O.y} r={fields.circumRadius} fill="none" stroke="#88b8d7" strokeOpacity="0.72" strokeWidth="2" />
              <circle cx={fields.N.x} cy={fields.N.y} r={fields.ninePointRadius} fill="none" stroke="#56f1b0" strokeWidth="3" />

              {fields.eulerLine ? (
                <line
                  x1={fields.eulerLine.a.x}
                  y1={fields.eulerLine.a.y}
                  x2={fields.eulerLine.b.x}
                  y2={fields.eulerLine.b.y}
                  stroke="#f1bd3f"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              ) : null}

              <polygon
                points={`${triangle.A.x},${triangle.A.y} ${triangle.B.x},${triangle.B.y} ${triangle.C.x},${triangle.C.y}`}
                fill="rgba(125, 211, 252, 0.035)"
                stroke="#e8f4ff"
                strokeWidth="3"
                strokeLinejoin="round"
              />

              {fields.ninePointDots.map((point, index) => (
                <circle key={`nine-point-${index}`} cx={point.x} cy={point.y} r="4.5" fill="#56f1b0" />
              ))}

              {[
                { key: "O", point: fields.O, color: "#f1bd3f", dx: 12, dy: 16 },
                { key: "G", point: fields.G, color: "#f1bd3f", dx: 12, dy: -8 },
                { key: "H", point: fields.H, color: "#f1bd3f", dx: 12, dy: -8 },
                { key: "N", point: fields.N, color: "#56f1b0", dx: -24, dy: -8 }
              ].map((mark) => (
                <g key={mark.key}>
                  <circle cx={mark.point.x} cy={mark.point.y} r="5" fill={mark.color} stroke="#082235" strokeWidth="1.8" />
                  <text
                    x={mark.point.x + mark.dx}
                    y={mark.point.y + mark.dy}
                    fill={mark.color}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                    fontSize="18"
                    fontWeight="900"
                    fontStyle="italic"
                  >
                    {mark.key}
                  </text>
                </g>
              ))}

              {vertexKeys.map((key) => {
                const point = triangle[key];
                const isActive = activeVertex === key || dragging === key;
                return (
	                  <g
	                    key={key}
	                    role="button"
	                    tabIndex={0}
	                    aria-label={`Drag vertex ${key}`}
	                    transform={`translate(${point.x} ${point.y})`}
	                    className="cursor-grab focus:outline-none"
	                    style={{ outline: "none" }}
	                    onPointerDown={(event) => {
	                      event.preventDefault();
	                      svgRef.current?.setPointerCapture(event.pointerId);
	                      dragRef.current = { key, pointerId: event.pointerId };
	                      setDragging(key);
	                      setActiveVertex(key);
	                      pushEvidence("started", `Started dragging vertex ${key}.`);
	                    }}
	                    onFocus={() => setActiveVertex(key)}
	                    onKeyDown={(event) => handleVertexKeyDown(key, event)}
	                  >
	                    <circle r="31" fill="transparent" pointerEvents="all" />
	                    <circle r={isActive ? 20 : 17} fill="#61a9f4" fillOpacity="0.48" />
	                    <circle r="8" fill="#80c7ff" stroke="#082235" strokeWidth="3" />
                    <text
                      x={key === "C" ? -18 : -15}
                      y="-16"
                      fill="#79bdff"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                      fontSize="18"
                      fontWeight="900"
                      fontStyle="italic"
                    >
                      {key}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div className="rounded-lg border border-sky-300/25 bg-sky-900/35 px-4 py-3 font-mono text-sm leading-7 text-sky-100/82 sm:text-base">
          GH/OG = {formatMetric(fields.ratioGH_OG, 2)} (approx 2) · R9 = {formatMetric(fields.ninePointRadius)} = R/2 · O, G, H{" "}
          {fields.collinear ? "on" : "near"} the Euler line. Drag a vertex.
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <FieldCard label="OG" value={formatMetric(fields.OG)} accent="blue" />
          <FieldCard label="GH" value={formatMetric(fields.GH)} accent="blue" />
          <FieldCard label="GH / OG" value={formatMetric(fields.ratioGH_OG, 2)} accent="yellow" />
          <FieldCard label="R9 = R/2" value={formatMetric(fields.ninePointRadius)} accent="mint" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className={summaryCardClass}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-sm font-black uppercase tracking-[0.18em] text-sky-200/80">Live report(fields)</h2>
              <button
                type="button"
                onClick={resetTriangle}
                className="rounded-lg border border-sky-300/25 px-3 py-1.5 font-mono text-xs font-black text-sky-100 transition hover:bg-sky-300/10 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                Reset
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950/45 p-3 font-mono text-xs leading-6 text-sky-100/82">
              {JSON.stringify(liveReport, null, 2)}
            </pre>
          </div>

          <div className={summaryCardClass}>
            <h2 className="font-mono text-sm font-black uppercase tracking-[0.18em] text-sky-200/80">event(...)</h2>
            <ol className="mt-3 space-y-2">
              {evidence.map((entry) => (
                <li key={entry.id} className="rounded-lg bg-slate-950/35 px-3 py-2 font-mono text-xs leading-5 text-sky-100/82">
                  <span className="font-black text-amber-300">{entry.verb}</span>: {entry.detail}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
