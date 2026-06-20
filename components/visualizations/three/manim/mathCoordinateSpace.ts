import type { CoordinateSpaceSpec, SampledPoint, Vec3 } from "./mathSceneTypes";

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

export function mapMathPointToWorld([x, y, z]: Vec3, coordinateSpace: CoordinateSpaceSpec): Vec3 {
  return [
    mapAxis(x, coordinateSpace.mathRange.x, coordinateSpace.worldRange.x),
    mapAxis(y, coordinateSpace.mathRange.y, coordinateSpace.worldRange.y),
    mapAxis(z, coordinateSpace.mathRange.z, coordinateSpace.worldRange.z)
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
