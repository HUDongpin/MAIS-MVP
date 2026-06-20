import type { Vec3 } from "./mathSceneTypes";

export type CurveArcLengthEntry = {
  length: number;
  point: Vec3;
};

export type CurveObject = {
  arcLengthTable: CurveArcLengthEntry[];
  colorRole: string;
  conceptId: string;
  id: string;
  samples: Vec3[];
  totalLength: number;
};

export type AlignedCurveSamples = {
  conceptId: string;
  source: Vec3[];
  sourceId: string;
  target: Vec3[];
  targetId: string;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function interpolatePoint(left: Vec3, right: Vec3, progress: number): Vec3 {
  return [
    lerp(left[0], right[0], progress),
    lerp(left[1], right[1], progress),
    lerp(left[2], right[2], progress)
  ];
}

function distance(left: Vec3, right: Vec3) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function safeSamples(samples: Vec3[]) {
  const finiteSamples = samples.filter((sample) => sample.every(Number.isFinite));
  if (finiteSamples.length >= 2) return finiteSamples;
  if (finiteSamples.length === 1) return [finiteSamples[0], finiteSamples[0]];
  return [[0, 0, 0] as Vec3, [0, 0, 0] as Vec3];
}

export function buildCurveObject({
  colorRole,
  conceptId,
  id,
  samples
}: {
  colorRole: string;
  conceptId: string;
  id: string;
  samples: Vec3[];
}): CurveObject {
  const safe = safeSamples(samples);
  let length = 0;
  const arcLengthTable = safe.map((point, index) => {
    if (index > 0) length += distance(safe[index - 1], point);
    return { length, point };
  });

  return {
    arcLengthTable,
    colorRole,
    conceptId,
    id,
    samples: safe,
    totalLength: length
  };
}

export function pointAtArcLength(curve: CurveObject, arcLength: number): Vec3 {
  if (curve.arcLengthTable.length === 0) return [0, 0, 0];
  const targetLength = clamp(finite(arcLength, 0), 0, curve.totalLength);

  if (targetLength <= 0 || curve.totalLength === 0) return curve.arcLengthTable[0].point;
  if (targetLength >= curve.totalLength) return curve.arcLengthTable[curve.arcLengthTable.length - 1].point;

  const rightIndex = curve.arcLengthTable.findIndex((entry) => entry.length >= targetLength);
  const boundedRightIndex = Math.max(1, rightIndex);
  const left = curve.arcLengthTable[boundedRightIndex - 1];
  const right = curve.arcLengthTable[boundedRightIndex];
  const local = right.length === left.length ? 0 : (targetLength - left.length) / (right.length - left.length);

  return interpolatePoint(left.point, right.point, local);
}

export function pointAtArcProgress(curve: CurveObject, progress: number): Vec3 {
  return pointAtArcLength(curve, clamp(finite(progress, 0), 0, 1) * curve.totalLength);
}

export function partialCurveByArcRange(curve: CurveObject, startProgress: number, endProgress: number): Vec3[] {
  const start = clamp(finite(startProgress, 0), 0, 1);
  const end = clamp(finite(endProgress, 1), 0, 1);
  const lower = Math.min(start, end);
  const upper = Math.max(start, end);
  const startLength = lower * curve.totalLength;
  const endLength = upper * curve.totalLength;
  const middle = curve.arcLengthTable
    .filter((entry) => entry.length > startLength && entry.length < endLength)
    .map((entry) => entry.point);

  return [
    pointAtArcLength(curve, startLength),
    ...middle,
    pointAtArcLength(curve, endLength)
  ];
}

function resampleCurvePoints(curve: CurveObject, count: number) {
  const sampleCount = Math.max(2, Math.floor(finite(count, 2)));
  return Array.from({ length: sampleCount }, (_, index) =>
    pointAtArcProgress(curve, index / Math.max(1, sampleCount - 1))
  );
}

export function alignCurveSamplesForMorph(source: CurveObject, target: CurveObject, sampleCount?: number): AlignedCurveSamples {
  const count = Math.max(
    2,
    Math.floor(finite(sampleCount ?? Math.max(source.samples.length, target.samples.length), 2))
  );

  return {
    conceptId: source.conceptId === target.conceptId ? source.conceptId : `${source.conceptId}->${target.conceptId}`,
    source: resampleCurvePoints(source, count),
    sourceId: source.id,
    target: resampleCurvePoints(target, count),
    targetId: target.id
  };
}

export function interpolateAlignedCurves(aligned: AlignedCurveSamples, progress: number): Vec3[] {
  const alpha = clamp(finite(progress, 0), 0, 1);
  const count = Math.min(aligned.source.length, aligned.target.length);

  return Array.from({ length: count }, (_, index) =>
    interpolatePoint(aligned.source[index], aligned.target[index], alpha)
  );
}
