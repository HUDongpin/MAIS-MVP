import type { CoordinateSpaceSpec, SampledPoint, Vec3 } from "./mathSceneTypes";

export const COORDINATE_SPACE_SOURCE_CONTRACT = "CoordinateSystem.c2p/p2c|get_graph|arc-length sampling";

export type CoordinateSpaceEvidence = {
  arcLength: number;
  c2pSummary: string;
  curveSampleCount: number;
  endpointSummary: string;
  finiteSampleCount: number;
  mathRangeSummary: string;
  maxRoundTripError: number;
  p2cSummary: string;
  resampledSampleCount: number;
  sampleCount: number;
  scaleSummary: string;
  sourceContract: typeof COORDINATE_SPACE_SOURCE_CONTRACT;
  summary: string;
  vectorDeltaSummary: string;
  worldRangeSummary: string;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function midpoint([min, max]: [number, number]) {
  return (min + max) / 2;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function normalize(value: number, [min, max]: [number, number]) {
  if (min === max) return 0.5;
  return (value - min) / (max - min);
}

function mapAxis(value: number, mathRange: [number, number], worldRange: [number, number]) {
  const safeValue = finite(value, midpoint(mathRange));
  return lerp(worldRange[0], worldRange[1], normalize(safeValue, mathRange));
}

function mapInverseAxis(value: number, mathRange: [number, number], worldRange: [number, number]) {
  const safeValue = finite(value, midpoint(worldRange));
  return lerp(mathRange[0], mathRange[1], normalize(safeValue, worldRange));
}

function mapDeltaAxis(value: number, mathRange: [number, number], worldRange: [number, number]) {
  const mathSpan = mathRange[1] - mathRange[0];
  if (mathSpan === 0) return 0;

  return finite(value, 0) * ((worldRange[1] - worldRange[0]) / mathSpan);
}

export function mapMathPointToWorld([x, y, z]: Vec3, coordinateSpace: CoordinateSpaceSpec): Vec3 {
  return [
    mapAxis(x, coordinateSpace.mathRange.x, coordinateSpace.worldRange.x),
    mapAxis(y, coordinateSpace.mathRange.y, coordinateSpace.worldRange.y),
    mapAxis(z, coordinateSpace.mathRange.z, coordinateSpace.worldRange.z)
  ];
}

export function mapWorldPointToMath([x, y, z]: Vec3, coordinateSpace: CoordinateSpaceSpec): Vec3 {
  return [
    mapInverseAxis(x, coordinateSpace.mathRange.x, coordinateSpace.worldRange.x),
    mapInverseAxis(y, coordinateSpace.mathRange.y, coordinateSpace.worldRange.y),
    mapInverseAxis(z, coordinateSpace.mathRange.z, coordinateSpace.worldRange.z)
  ];
}

export function mapMathVectorToWorldDelta([x, y, z]: Vec3, coordinateSpace: CoordinateSpaceSpec): Vec3 {
  return [
    mapDeltaAxis(x, coordinateSpace.mathRange.x, coordinateSpace.worldRange.x),
    mapDeltaAxis(y, coordinateSpace.mathRange.y, coordinateSpace.worldRange.y),
    mapDeltaAxis(z, coordinateSpace.mathRange.z, coordinateSpace.worldRange.z)
  ];
}

export function sampleParametricCurve({
  coordinateSpace,
  sampleCount,
  tRange,
  valueAt
}: {
  coordinateSpace: CoordinateSpaceSpec;
  sampleCount: number;
  tRange: [number, number];
  valueAt: (t: number) => Vec3;
}): SampledPoint[] {
  const count = Math.max(2, Math.floor(finite(sampleCount, 2)));

  return Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const t = lerp(tRange[0], tRange[1], progress);
    const math = valueAt(t).map((value, axis) => {
      const range = axis === 0 ? coordinateSpace.mathRange.x : axis === 1 ? coordinateSpace.mathRange.y : coordinateSpace.mathRange.z;
      return finite(value, midpoint(range));
    }) as Vec3;

    return {
      math,
      t,
      world: mapMathPointToWorld(math, coordinateSpace)
    };
  });
}

function distance(left: Vec3, right: Vec3) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

export function totalArcLength(points: Vec3[]) {
  return points.reduce((sum, point, index) => {
    if (index === 0) return 0;
    return sum + distance(points[index - 1], point);
  }, 0);
}

function interpolatePoint(left: SampledPoint, right: SampledPoint, progress: number): SampledPoint {
  return {
    math: [
      lerp(left.math[0], right.math[0], progress),
      lerp(left.math[1], right.math[1], progress),
      lerp(left.math[2], right.math[2], progress)
    ],
    t: lerp(left.t, right.t, progress),
    world: [
      lerp(left.world[0], right.world[0], progress),
      lerp(left.world[1], right.world[1], progress),
      lerp(left.world[2], right.world[2], progress)
    ]
  };
}

export function resampleCurveByArcLength(samples: SampledPoint[], sampleCount: number): SampledPoint[] {
  if (samples.length <= 1) return samples;

  const count = Math.max(2, Math.floor(finite(sampleCount, 2)));
  const cumulative = samples.map((_, index) =>
    totalArcLength(samples.slice(0, index + 1).map((sample) => sample.world))
  );
  const total = cumulative[cumulative.length - 1];

  if (total === 0) return samples.slice(0, count);

  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return samples[0];
    if (index === count - 1) return samples[samples.length - 1];

    const target = (index / Math.max(1, count - 1)) * total;
    const rightIndex = cumulative.findIndex((length) => length >= target);
    const boundedRightIndex = Math.max(1, rightIndex);
    const leftLength = cumulative[boundedRightIndex - 1];
    const rightLength = cumulative[boundedRightIndex];
    const segmentProgress = rightLength === leftLength ? 0 : (target - leftLength) / (rightLength - leftLength);

    return interpolatePoint(samples[boundedRightIndex - 1], samples[boundedRightIndex], segmentProgress);
  });
}

function axisNames() {
  return ["x", "y", "z"] as const;
}

function roundTo(value: number, places: number) {
  const scale = 10 ** places;
  const rounded = Math.round(finite(value, 0) * scale) / scale;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatFixedNumber(value: number, places = 3) {
  return roundTo(value, places).toFixed(places);
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

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) return "NaN";
  return formatFixedNumber(value).replace(/\.?0+$/, "");
}

function formatVec3(value: Vec3) {
  return value.map((entry) => formatFixedNumber(entry)).join(",");
}

function formatRangeSummary(coordinateSpace: CoordinateSpaceSpec, rangeKind: "mathRange" | "worldRange") {
  return axisNames()
    .map((axis) => `${axis}=${formatCompactNumber(coordinateSpace[rangeKind][axis][0])}..${formatCompactNumber(coordinateSpace[rangeKind][axis][1])}`)
    .join(";");
}

function formatScaleSummary(coordinateSpace: CoordinateSpaceSpec) {
  return axisNames()
    .map((axis) => {
      const mathSpan = coordinateSpace.mathRange[axis][1] - coordinateSpace.mathRange[axis][0];
      const worldSpan = coordinateSpace.worldRange[axis][1] - coordinateSpace.worldRange[axis][0];
      const scale = mathSpan === 0 ? 0 : worldSpan / mathSpan;

      return `${axis}=${formatFixedNumber(scale)}`;
    })
    .join(";");
}

function defaultSampleMathPoint(coordinateSpace: CoordinateSpaceSpec): Vec3 {
  return [
    midpoint(coordinateSpace.mathRange.x),
    midpoint(coordinateSpace.mathRange.y),
    midpoint(coordinateSpace.mathRange.z)
  ];
}

function defaultCurveSamples(coordinateSpace: CoordinateSpaceSpec): SampledPoint[] {
  return sampleParametricCurve({
    coordinateSpace,
    sampleCount: 7,
    tRange: [0, 1],
    valueAt: (t) => [
      lerp(coordinateSpace.mathRange.x[0], coordinateSpace.mathRange.x[1], t),
      lerp(coordinateSpace.mathRange.y[0], coordinateSpace.mathRange.y[1], t),
      lerp(coordinateSpace.mathRange.z[0], coordinateSpace.mathRange.z[1], t)
    ]
  });
}

function curveSamplesFromWorld(coordinateSpace: CoordinateSpaceSpec, samples: Vec3[]): SampledPoint[] {
  return samples.map((world, index) => ({
    math: mapWorldPointToMath(world, coordinateSpace),
    t: index,
    world
  }));
}

function isFiniteVec3(value: Vec3) {
  return value.every(Number.isFinite);
}

export function buildCoordinateSpaceEvidence(
  coordinateSpace: CoordinateSpaceSpec,
  options: {
    curveSamples?: SampledPoint[];
    curveWorldSamples?: Vec3[];
    resampleCount?: number;
    sampleMathPoints?: Vec3[];
    vectorMathDelta?: Vec3;
  } = {}
): CoordinateSpaceEvidence {
  const sampleMathPoints = options.sampleMathPoints?.length
    ? options.sampleMathPoints
    : [defaultSampleMathPoint(coordinateSpace)];
  const firstSampleMathPoint = sampleMathPoints.find(isFiniteVec3) ?? defaultSampleMathPoint(coordinateSpace);
  const firstSampleWorldPoint = mapMathPointToWorld(firstSampleMathPoint, coordinateSpace);
  const firstSampleRoundTrip = mapWorldPointToMath(firstSampleWorldPoint, coordinateSpace);
  const curveSamples = options.curveSamples ??
    (options.curveWorldSamples?.length ? curveSamplesFromWorld(coordinateSpace, options.curveWorldSamples) : defaultCurveSamples(coordinateSpace));
  const resampledCount = options.resampleCount ?? Math.min(9, Math.max(2, curveSamples.length));
  const resampledSamples = curveSamples.length > 1 ? resampleCurveByArcLength(curveSamples, resampledCount) : curveSamples;
  let finiteSampleCount = 0;
  let maxRoundTripError = 0;

  sampleMathPoints.forEach((mathPoint) => {
    if (!isFiniteVec3(mathPoint)) return;

    const worldPoint = mapMathPointToWorld(mathPoint, coordinateSpace);
    const roundTripPoint = mapWorldPointToMath(worldPoint, coordinateSpace);
    if (!isFiniteVec3(worldPoint) || !isFiniteVec3(roundTripPoint)) return;

    finiteSampleCount += 1;
    maxRoundTripError = Math.max(
      maxRoundTripError,
      ...roundTripPoint.map((value, index) => Math.abs(value - mathPoint[index]))
    );
  });

  const vectorMathDelta = options.vectorMathDelta ?? [1, 1, 1];
  const vectorWorldDelta = mapMathVectorToWorldDelta(vectorMathDelta, coordinateSpace);
  const arcLength = roundTo(totalArcLength(curveSamples.map((sample) => sample.world)), 6);
  const endpointSummary = curveSamples.length > 0
    ? `${formatVec3(curveSamples[0].world)}->${formatVec3(curveSamples[curveSamples.length - 1].world)}`
    : "none";
  const scaleSummary = formatScaleSummary(coordinateSpace);
  const roundTripError = roundTo(maxRoundTripError, 6);
  const summary = [
    `coordinate-space:samples=${sampleMathPoints.length}`,
    `finite=${finiteSampleCount}`,
    `roundtrip=${formatFixedNumber(roundTripError, 6)}`,
    `curveSamples=${curveSamples.length}`,
    `resampled=${resampledSamples.length}`,
    `arc=${formatFixedNumber(arcLength, 6)}`,
    `scale=${scaleSummary}`
  ].join(":");

  return {
    arcLength,
    c2pSummary: `${formatVec3(firstSampleMathPoint)}=>${formatVec3(firstSampleWorldPoint)}`,
    curveSampleCount: curveSamples.length,
    endpointSummary,
    finiteSampleCount,
    mathRangeSummary: formatRangeSummary(coordinateSpace, "mathRange"),
    maxRoundTripError: roundTripError,
    p2cSummary: `${formatVec3(firstSampleWorldPoint)}=>${formatVec3(firstSampleRoundTrip)}`,
    resampledSampleCount: resampledSamples.length,
    sampleCount: sampleMathPoints.length,
    scaleSummary,
    sourceContract: COORDINATE_SPACE_SOURCE_CONTRACT,
    summary,
    vectorDeltaSummary: `${formatVec3(vectorMathDelta)}=>${formatVec3(vectorWorldDelta)}`,
    worldRangeSummary: formatRangeSummary(coordinateSpace, "worldRange")
  };
}

export function coordinateSpaceEvidenceDataAttributes(evidence: CoordinateSpaceEvidence): Record<string, string> {
  return {
    "data-viz-manim-coordinate-space-source-contract": evidence.sourceContract,
    "data-viz-manim-coordinate-space-math-range": evidence.mathRangeSummary,
    "data-viz-manim-coordinate-space-world-range": evidence.worldRangeSummary,
    "data-viz-manim-coordinate-space-scale": evidence.scaleSummary,
    "data-viz-manim-coordinate-space-c2p-summary": evidence.c2pSummary,
    "data-viz-manim-coordinate-space-p2c-summary": evidence.p2cSummary,
    "data-viz-manim-coordinate-space-vector-delta": evidence.vectorDeltaSummary,
    "data-viz-manim-coordinate-space-sample-count": String(evidence.sampleCount),
    "data-viz-manim-coordinate-space-finite-sample-count": String(evidence.finiteSampleCount),
    "data-viz-manim-coordinate-space-roundtrip-error": formatFixedNumber(evidence.maxRoundTripError, 6),
    "data-viz-manim-coordinate-space-curve-sample-count": String(evidence.curveSampleCount),
    "data-viz-manim-coordinate-space-arc-length": formatFixedNumber(evidence.arcLength, 6),
    "data-viz-manim-coordinate-space-resampled-count": String(evidence.resampledSampleCount),
    "data-viz-manim-coordinate-space-endpoints": evidence.endpointSummary,
    "data-viz-manim-coordinate-space-summary": evidence.summary
  };
}

export function serializeCoordinateSpaceEvidence(evidence: CoordinateSpaceEvidence) {
  return stableSerialize(evidence);
}
