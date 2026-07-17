import type { Range2, Vec3 } from "./mathSceneTypes";

export type MathVectorFieldColorBand = "high" | "low" | "mid" | "zero";

export type MathVectorFieldFunction = (point: Vec3) => Vec3;

export type MathVectorFieldSample = {
  anchor: Vec3;
  colorBand: MathVectorFieldColorBand;
  conceptId: string;
  direction: Vec3;
  id: string;
  magnitude: number;
  normalizedMagnitude: number;
  vector: Vec3;
};

export type MathVectorField = {
  conceptId: string;
  id: string;
  samples: MathVectorFieldSample[];
  xRange: Range2;
  yRange: Range2;
};

export type MathVectorFieldArrow = {
  colorBand: MathVectorFieldColorBand;
  conceptId: string;
  from: Vec3;
  id: string;
  length: number;
  magnitude: number;
  to: Vec3;
};

export type MathVectorFieldSummary = {
  finiteVectorCount: number;
  highBandCount: number;
  lowBandCount: number;
  maxMagnitude: number;
  midBandCount: number;
  sampleCount: number;
  zeroBandCount: number;
  zeroVectorCount: number;
};

export type MathVectorFieldTrace = {
  points: Vec3[];
  stoppedReason: "completed" | "non-finite-vector" | "out-of-bounds";
};

export type VectorFieldBounds = {
  x?: Range2;
  y?: Range2;
  z?: Range2;
};

export type SampleVectorField2DInput = {
  conceptId: string;
  field: MathVectorFieldFunction;
  id: string;
  xRange: Range2;
  xSteps: number;
  yRange: Range2;
  ySteps: number;
  z?: number;
};

export type TraceVectorFieldPathInput = {
  bounds?: VectorFieldBounds;
  dt: number;
  field: MathVectorFieldFunction;
  start: Vec3;
  steps: number;
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function finiteVec3(vector: Vec3): vector is Vec3 {
  return vector.every(Number.isFinite);
}

function sanitizeVec3(vector: Vec3): Vec3 {
  return finiteVec3(vector) ? vector : [0, 0, 0];
}

function magnitude(vector: Vec3) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function direction(vector: Vec3, vectorMagnitude: number): Vec3 {
  if (vectorMagnitude <= 0) return [0, 0, 0];
  return [vector[0] / vectorMagnitude, vector[1] / vectorMagnitude, vector[2] / vectorMagnitude];
}

function colorBand(normalizedMagnitude: number, vectorMagnitude: number): MathVectorFieldColorBand {
  if (vectorMagnitude <= 0) return "zero";
  if (normalizedMagnitude < 1 / 3) return "low";
  if (normalizedMagnitude < 2 / 3) return "mid";
  return "high";
}

function sampleRange([start, end]: Range2, steps: number) {
  const safeSteps = Math.max(1, Math.floor(finite(steps, 1)));
  if (safeSteps === 1) return [(start + end) / 2];

  return Array.from({ length: safeSteps }, (_, index) => start + ((end - start) * index) / (safeSteps - 1));
}

function addScaled(point: Vec3, vector: Vec3, scale: number): Vec3 {
  return [
    point[0] + vector[0] * scale,
    point[1] + vector[1] * scale,
    point[2] + vector[2] * scale
  ];
}

function inRange(value: number, range: Range2 | undefined) {
  if (!range) return true;
  return value >= Math.min(range[0], range[1]) && value <= Math.max(range[0], range[1]);
}

function withinBounds(point: Vec3, bounds: VectorFieldBounds | undefined) {
  return inRange(point[0], bounds?.x) && inRange(point[1], bounds?.y) && inRange(point[2], bounds?.z);
}

export function sampleVectorField2D({
  conceptId,
  field,
  id,
  xRange,
  xSteps,
  yRange,
  ySteps,
  z = 0
}: SampleVectorField2DInput): MathVectorField {
  const anchors = sampleRange(yRange, ySteps).flatMap((y) =>
    sampleRange(xRange, xSteps).map((x) => [x, y, z] as Vec3)
  );
  const rawSamples = anchors.map((anchor, index) => {
    const rawVector = field(anchor);
    const vector = sanitizeVec3(rawVector);
    const sampleMagnitude = magnitude(vector);

    return {
      anchor,
      conceptId,
      direction: direction(vector, sampleMagnitude),
      id: `${id}:sample-${index}`,
      magnitude: sampleMagnitude,
      vector
    };
  });
  const maxMagnitude = Math.max(0, ...rawSamples.map((sample) => sample.magnitude));

  return {
    conceptId,
    id,
    samples: rawSamples.map((sample) => {
      const normalizedMagnitude = maxMagnitude > 0 ? sample.magnitude / maxMagnitude : 0;

      return {
        ...sample,
        colorBand: colorBand(normalizedMagnitude, sample.magnitude),
        normalizedMagnitude
      };
    }),
    xRange,
    yRange
  };
}

export function summarizeVectorField(field: MathVectorField): MathVectorFieldSummary {
  return {
    finiteVectorCount: field.samples.filter((sample) => finiteVec3(sample.vector)).length,
    highBandCount: field.samples.filter((sample) => sample.colorBand === "high").length,
    lowBandCount: field.samples.filter((sample) => sample.colorBand === "low").length,
    maxMagnitude: Math.max(0, ...field.samples.map((sample) => sample.magnitude)),
    midBandCount: field.samples.filter((sample) => sample.colorBand === "mid").length,
    sampleCount: field.samples.length,
    zeroBandCount: field.samples.filter((sample) => sample.colorBand === "zero").length,
    zeroVectorCount: field.samples.filter((sample) => sample.magnitude === 0).length
  };
}

export function buildVectorFieldArrows(
  field: MathVectorField,
  options: { maxArrowLength?: number } = {}
): MathVectorFieldArrow[] {
  const maxArrowLength = Math.max(0, finite(options.maxArrowLength ?? 1, 1));

  return field.samples.map((sample) => {
    const length = maxArrowLength * sample.normalizedMagnitude;

    return {
      colorBand: sample.colorBand,
      conceptId: sample.conceptId,
      from: sample.anchor,
      id: `${sample.id}:arrow`,
      length,
      magnitude: sample.magnitude,
      to: addScaled(sample.anchor, sample.direction, length)
    };
  });
}

export function traceVectorFieldPath({
  bounds,
  dt,
  field,
  start,
  steps
}: TraceVectorFieldPathInput): MathVectorFieldTrace {
  const safeDt = finite(dt, 0);
  const safeSteps = Math.max(0, Math.floor(finite(steps, 0)));
  const points: Vec3[] = [start];
  let current = start;

  for (let index = 0; index < safeSteps; index += 1) {
    const vector = field(current);
    if (!finiteVec3(vector)) return { points, stoppedReason: "non-finite-vector" };

    const next = addScaled(current, vector, safeDt);
    if (!finiteVec3(next)) return { points, stoppedReason: "non-finite-vector" };
    if (!withinBounds(next, bounds)) return { points, stoppedReason: "out-of-bounds" };

    points.push(next);
    current = next;
  }

  return { points, stoppedReason: "completed" };
}
