import { buildCurveObject, type CurveObject } from "./mathCurveObject";
import { resampleCurveByArcLength } from "./mathCoordinateSpace";
import { buildSurfaceObjectFromGrid, type SurfaceObject } from "./mathSurfaceObject";
import type { AxisRangeSpec, CoordinateSpaceSpec, Range2, SampledPoint, Vec3 } from "./mathSceneTypes";

export type CoordinateSystem3D = {
  c2p: (x: number, y?: number, z?: number) => Vec3;
  coordinateSpace: CoordinateSpaceSpec;
  p2c: (point: Vec3) => Vec3;
  ranges: AxisRangeSpec;
  worldRanges: AxisRangeSpec;
};

export type GraphCurveObject = {
  curve: CurveObject;
  mathSamples: Vec3[];
  worldSamples: Vec3[];
};

export type ParametricCurveObject = GraphCurveObject;

export type ParametricSurfaceObject = {
  mathSamples: Vec3[][];
  surface: SurfaceObject;
  worldSamples: Vec3[][];
};

export type CoordinateSystemEvidence = {
  axisCount: number;
  finiteSampleCount: number;
  mathRangeSummary: string;
  maxRoundTripError: number;
  originWorldPoint: string;
  sampleCount: number;
  scaleSummary: string;
  summary: string;
  systemReady: boolean;
  version: "mais-manim-coordinate-system/v1";
  worldRangeSummary: string;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function midpoint([min, max]: [number, number]) {
  return (min + max) / 2;
}

function normalize(value: number, [min, max]: [number, number]) {
  if (min === max) return 0.5;
  return (value - min) / (max - min);
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function safeSegmentCount(value: number) {
  return Math.max(1, Math.floor(finite(value, 1)));
}

function mapAxis(value: number, sourceRange: [number, number], targetRange: [number, number]) {
  return lerp(targetRange[0], targetRange[1], normalize(finite(value, midpoint(sourceRange)), sourceRange));
}

export function createCoordinateSystem3D(coordinateSpace: CoordinateSpaceSpec): CoordinateSystem3D {
  return {
    c2p: (x, y = 0, z = 0): Vec3 => [
      mapAxis(x, coordinateSpace.mathRange.x, coordinateSpace.worldRange.x),
      mapAxis(y, coordinateSpace.mathRange.y, coordinateSpace.worldRange.y),
      mapAxis(z, coordinateSpace.mathRange.z, coordinateSpace.worldRange.z)
    ],
    coordinateSpace,
    p2c: ([x, y, z]): Vec3 => [
      mapAxis(x, coordinateSpace.worldRange.x, coordinateSpace.mathRange.x),
      mapAxis(y, coordinateSpace.worldRange.y, coordinateSpace.mathRange.y),
      mapAxis(z, coordinateSpace.worldRange.z, coordinateSpace.mathRange.z)
    ],
    ranges: coordinateSpace.mathRange,
    worldRanges: coordinateSpace.worldRange
  };
}

function isFiniteVec3(point: Vec3) {
  return point.every(Number.isFinite);
}

function axisNames() {
  return ["x", "y", "z"] as const;
}

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) return "NaN";
  if (Object.is(value, -0)) return "0";
  return value.toFixed(3).replace(/\.?0+$/, "");
}

function formatFixedNumber(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "NaN";
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function formatRangeSummary(range: AxisRangeSpec) {
  return axisNames()
    .map((axis) => `${axis}=${formatCompactNumber(range[axis][0])}..${formatCompactNumber(range[axis][1])}`)
    .join(";");
}

function formatScaleSummary(mathRange: AxisRangeSpec, worldRange: AxisRangeSpec) {
  return axisNames()
    .map((axis) => {
      const mathSpan = Math.abs(mathRange[axis][1] - mathRange[axis][0]);
      const worldSpan = Math.abs(worldRange[axis][1] - worldRange[axis][0]);
      const scale = mathSpan === 0 ? 0 : worldSpan / mathSpan;

      return `${axis}=${formatFixedNumber(scale)}`;
    })
    .join(";");
}

function formatVec3(point: Vec3) {
  return point.map((value) => formatFixedNumber(value)).join(",");
}

function defaultCoordinateSamples(coordinateSpace: CoordinateSpaceSpec): Vec3[] {
  const { mathRange } = coordinateSpace;

  return [
    [mathRange.x[0], mathRange.y[0], mathRange.z[0]],
    [midpoint(mathRange.x), midpoint(mathRange.y), midpoint(mathRange.z)],
    [mathRange.x[1], mathRange.y[1], mathRange.z[1]]
  ];
}

export function buildCoordinateSystemEvidence(
  coordinateSpace: CoordinateSpaceSpec,
  options: { sampleMathPoints?: Vec3[] } = {}
): CoordinateSystemEvidence {
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const sampleMathPoints = options.sampleMathPoints?.length
    ? options.sampleMathPoints
    : defaultCoordinateSamples(coordinateSpace);
  let finiteSampleCount = 0;
  let maxRoundTripError = 0;

  for (const mathPoint of sampleMathPoints) {
    if (!isFiniteVec3(mathPoint)) continue;

    const worldPoint = coordinateSystem.c2p(...mathPoint);
    const roundTrippedPoint = coordinateSystem.p2c(worldPoint);

    if (!isFiniteVec3(worldPoint) || !isFiniteVec3(roundTrippedPoint)) continue;

    finiteSampleCount += 1;
    maxRoundTripError = Math.max(
      maxRoundTripError,
      ...axisNames().map((_, index) => Math.abs(roundTrippedPoint[index] - mathPoint[index]))
    );
  }

  const axisCount = axisNames().filter((axis) => (
    coordinateSpace.mathRange[axis].every(Number.isFinite) &&
    coordinateSpace.worldRange[axis].every(Number.isFinite)
  )).length;
  const mathRangeSummary = formatRangeSummary(coordinateSpace.mathRange);
  const worldRangeSummary = formatRangeSummary(coordinateSpace.worldRange);
  const originWorldPoint = formatVec3(coordinateSystem.c2p(0, 0, 0));
  const scaleSummary = formatScaleSummary(coordinateSpace.mathRange, coordinateSpace.worldRange);
  const roundTripSummary = formatFixedNumber(maxRoundTripError, 6);
  const systemReady = axisCount === 3 && finiteSampleCount === sampleMathPoints.length && maxRoundTripError < 1e-6;
  const summary = [
    `coordinateSystem:axes=${axisCount}`,
    `samples=${sampleMathPoints.length}`,
    `finite=${finiteSampleCount}`,
    `roundtrip=${roundTripSummary}`,
    `math=${mathRangeSummary}`,
    `world=${worldRangeSummary}`
  ].join(":");

  return {
    axisCount,
    finiteSampleCount,
    mathRangeSummary,
    maxRoundTripError,
    originWorldPoint,
    sampleCount: sampleMathPoints.length,
    scaleSummary,
    summary,
    systemReady,
    version: "mais-manim-coordinate-system/v1",
    worldRangeSummary
  };
}

export function coordinateSystemEvidenceDataAttributes(evidence: CoordinateSystemEvidence): Record<string, string> {
  return {
    "data-viz-manim-coordinate-axis-count": String(evidence.axisCount),
    "data-viz-manim-coordinate-c2p-finite-count": String(evidence.finiteSampleCount),
    "data-viz-manim-coordinate-math-range": evidence.mathRangeSummary,
    "data-viz-manim-coordinate-origin-world-point": evidence.originWorldPoint,
    "data-viz-manim-coordinate-p2c-roundtrip-error": formatFixedNumber(evidence.maxRoundTripError, 6),
    "data-viz-manim-coordinate-sample-count": String(evidence.sampleCount),
    "data-viz-manim-coordinate-scale": evidence.scaleSummary,
    "data-viz-manim-coordinate-summary": evidence.summary,
    "data-viz-manim-coordinate-system-ready": evidence.systemReady ? "true" : "false",
    "data-viz-manim-coordinate-world-range": evidence.worldRangeSummary
  };
}

export function serializeCoordinateSystemEvidence(evidence: CoordinateSystemEvidence) {
  return stableSerialize(evidence);
}

export function buildGraphCurveObject({
  colorRole,
  conceptId,
  coordinateSystem,
  displaySampleCount,
  id,
  sampleCount,
  valueAt,
  xRange
}: {
  colorRole: string;
  conceptId: string;
  coordinateSystem: CoordinateSystem3D;
  id: string;
  displaySampleCount?: number;
  sampleCount: number;
  valueAt: (x: number, progress: number) => Vec3;
  xRange: [number, number];
}): GraphCurveObject {
  const count = Math.max(2, Math.floor(finite(sampleCount, 2)));
  const rawSamples: SampledPoint[] = Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const x = lerp(xRange[0], xRange[1], progress);
    const sample = valueAt(x, progress);
    const math: Vec3 = [
      finite(sample[0], x),
      finite(sample[1], midpoint(coordinateSystem.ranges.y)),
      finite(sample[2], midpoint(coordinateSystem.ranges.z))
    ];

    return {
      math,
      t: x,
      world: coordinateSystem.c2p(math[0], math[1], math[2])
    };
  });
  const displayCount = displaySampleCount === undefined
    ? count
    : Math.max(2, Math.floor(finite(displaySampleCount, count)));
  const displaySamples = displayCount === count ? rawSamples : resampleCurveByArcLength(rawSamples, displayCount);
  const mathSamples = displaySamples.map((sample) => sample.math);
  const worldSamples = displaySamples.map((sample) => sample.world);

  return {
    curve: buildCurveObject({
      colorRole,
      conceptId,
      id,
      samples: worldSamples
    }),
    mathSamples,
    worldSamples
  };
}

export function buildParametricCurveObject({
  colorRole,
  conceptId,
  coordinateSystem,
  displaySampleCount,
  id,
  sampleCount,
  tRange,
  valueAt
}: {
  colorRole: string;
  conceptId: string;
  coordinateSystem: CoordinateSystem3D;
  displaySampleCount?: number;
  id: string;
  sampleCount: number;
  tRange: [number, number];
  valueAt: (t: number, progress: number) => Vec3;
}): ParametricCurveObject {
  const count = Math.max(2, Math.floor(finite(sampleCount, 2)));
  const rawSamples: SampledPoint[] = Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const t = lerp(tRange[0], tRange[1], progress);
    const sample = valueAt(t, progress);
    const math: Vec3 = [
      finite(sample[0], midpoint(coordinateSystem.ranges.x)),
      finite(sample[1], midpoint(coordinateSystem.ranges.y)),
      finite(sample[2], midpoint(coordinateSystem.ranges.z))
    ];

    return {
      math,
      t,
      world: coordinateSystem.c2p(math[0], math[1], math[2])
    };
  });
  const displayCount = displaySampleCount === undefined
    ? count
    : Math.max(2, Math.floor(finite(displaySampleCount, count)));
  const displaySamples = displayCount === count ? rawSamples : resampleCurveByArcLength(rawSamples, displayCount);
  const mathSamples = displaySamples.map((sample) => sample.math);
  const worldSamples = displaySamples.map((sample) => sample.world);

  return {
    curve: buildCurveObject({
      colorRole,
      conceptId,
      id,
      samples: worldSamples
    }),
    mathSamples,
    worldSamples
  };
}

export function buildParametricSurfaceObject({
  colorRole,
  conceptId,
  coordinateSystem,
  id,
  uRange,
  uSegments,
  valueAt,
  vRange,
  vSegments
}: {
  colorRole: string;
  conceptId: string;
  coordinateSystem: CoordinateSystem3D;
  id: string;
  uRange: Range2;
  uSegments: number;
  valueAt: (u: number, v: number, uProgress: number, vProgress: number) => Vec3;
  vRange: Range2;
  vSegments: number;
}): ParametricSurfaceObject {
  const rows = safeSegmentCount(uSegments) + 1;
  const columns = safeSegmentCount(vSegments) + 1;
  const mathSamples: Vec3[][] = [];
  const worldSamples: Vec3[][] = [];

  for (let row = 0; row < rows; row += 1) {
    const uProgress = row / Math.max(1, rows - 1);
    const u = lerp(uRange[0], uRange[1], uProgress);
    const mathRow: Vec3[] = [];
    const worldRow: Vec3[] = [];

    for (let column = 0; column < columns; column += 1) {
      const vProgress = column / Math.max(1, columns - 1);
      const v = lerp(vRange[0], vRange[1], vProgress);
      const sample = valueAt(u, v, uProgress, vProgress);
      const math: Vec3 = [
        finite(sample[0], u),
        finite(sample[1], midpoint(coordinateSystem.ranges.y)),
        finite(sample[2], v)
      ];

      mathRow.push(math);
      worldRow.push(coordinateSystem.c2p(math[0], math[1], math[2]));
    }

    mathSamples.push(mathRow);
    worldSamples.push(worldRow);
  }

  return {
    mathSamples,
    surface: buildSurfaceObjectFromGrid({
      colorRole,
      conceptId,
      id,
      samples: worldSamples,
      uRange,
      vRange
    }),
    worldSamples
  };
}
