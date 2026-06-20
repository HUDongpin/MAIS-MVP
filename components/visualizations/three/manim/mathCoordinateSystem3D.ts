import { buildCurveObject, type CurveObject } from "./mathCurveObject";
import type { AxisRangeSpec, CoordinateSpaceSpec, Vec3 } from "./mathSceneTypes";

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

export function buildGraphCurveObject({
  colorRole,
  conceptId,
  coordinateSystem,
  id,
  sampleCount,
  valueAt,
  xRange
}: {
  colorRole: string;
  conceptId: string;
  coordinateSystem: CoordinateSystem3D;
  id: string;
  sampleCount: number;
  valueAt: (x: number, progress: number) => Vec3;
  xRange: [number, number];
}): GraphCurveObject {
  const count = Math.max(2, Math.floor(finite(sampleCount, 2)));
  const mathSamples = Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const x = lerp(xRange[0], xRange[1], progress);
    const sample = valueAt(x, progress);

    return [
      finite(sample[0], x),
      finite(sample[1], midpoint(coordinateSystem.ranges.y)),
      finite(sample[2], midpoint(coordinateSystem.ranges.z))
    ] as Vec3;
  });
  const worldSamples = mathSamples.map((sample) => coordinateSystem.c2p(sample[0], sample[1], sample[2]));

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
