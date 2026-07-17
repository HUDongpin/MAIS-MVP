import type { MathObjectGraph, RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";
import { parseSvgPathCommands } from "./mathSvgPathMorph";

export const VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT =
  "VMobject points/Bezier arrays|SVGMobject SVG path conversion|pointwise_become_partial arc-length reveal";

export type VMobjectBezierPathPointKind = "anchor" | "handle";

export type VMobjectBezierPathPoint = {
  index: number;
  kind: VMobjectBezierPathPointKind;
  point: Vec3;
};

export type VMobjectBezierPathSegment =
  | { end: Vec3; length: number; start: Vec3; type: "line" }
  | { end: Vec3; handle1: Vec3; handle2: Vec3; length: number; start: Vec3; type: "cubic" };

export type VMobjectBezierPath = {
  anchorPointCount: number;
  closed: boolean;
  conceptId: string;
  cubicSegmentCount: number;
  handlePointCount: number;
  id: string;
  lineSegmentCount: number;
  points: VMobjectBezierPathPoint[];
  segmentCount: number;
  segments: VMobjectBezierPathSegment[];
  totalLength: number;
};

export type VMobjectBezierPathSummary = {
  anchorPointCount: number;
  closedPathCount: number;
  cubicSegmentCount: number;
  handlePointCount: number;
  pathCount: number;
  pathIds: string;
  samplePointCount: number;
  segmentCount: number;
  sourceContract: typeof VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT;
  summary: string;
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number) {
  return clamp(finite(value, 0), 0, 1);
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function sanitizeVec3(point: Vec3 | undefined): Vec3 {
  if (point && point.every(Number.isFinite)) return point;
  return [0, 0, 0];
}

function interpolatePoint(start: Vec3, end: Vec3, progress: number): Vec3 {
  return [
    lerp(start[0], end[0], progress),
    lerp(start[1], end[1], progress),
    lerp(start[2], end[2], progress)
  ];
}

function cubicPoint(start: Vec3, handle1: Vec3, handle2: Vec3, end: Vec3, progress: number): Vec3 {
  const alpha = clamp01(progress);
  const oneMinusAlpha = 1 - alpha;
  const a = oneMinusAlpha * oneMinusAlpha * oneMinusAlpha;
  const b = 3 * oneMinusAlpha * oneMinusAlpha * alpha;
  const c = 3 * oneMinusAlpha * alpha * alpha;
  const d = alpha * alpha * alpha;

  return [
    a * start[0] + b * handle1[0] + c * handle2[0] + d * end[0],
    a * start[1] + b * handle1[1] + c * handle2[1] + d * end[1],
    a * start[2] + b * handle1[2] + c * handle2[2] + d * end[2]
  ];
}

function distance(left: Vec3, right: Vec3) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function lineLength(start: Vec3, end: Vec3) {
  return distance(start, end);
}

function cubicLength(start: Vec3, handle1: Vec3, handle2: Vec3, end: Vec3, samples = 24) {
  const sampleCount = Math.max(1, Math.floor(finite(samples, 24)));
  let length = 0;
  let previous = start;

  for (let index = 1; index <= sampleCount; index += 1) {
    const point = cubicPoint(start, handle1, handle2, end, index / sampleCount);
    length += distance(previous, point);
    previous = point;
  }

  return length;
}

function pointAtSegmentProgress(segment: VMobjectBezierPathSegment, progress: number): Vec3 {
  if (segment.type === "line") return interpolatePoint(segment.start, segment.end, progress);
  return cubicPoint(segment.start, segment.handle1, segment.handle2, segment.end, progress);
}

function lineSegment(start: Vec3, end: Vec3): VMobjectBezierPathSegment {
  return {
    end,
    length: lineLength(start, end),
    start,
    type: "line"
  };
}

function cubicSegment(start: Vec3, handle1: Vec3, handle2: Vec3, end: Vec3): VMobjectBezierPathSegment {
  return {
    end,
    handle1,
    handle2,
    length: cubicLength(start, handle1, handle2, end),
    start,
    type: "cubic"
  };
}

function pointEntry(index: number, kind: VMobjectBezierPathPointKind, point: Vec3): VMobjectBezierPathPoint {
  return { index, kind, point };
}

function buildPath({
  closed,
  conceptId,
  id,
  points,
  segments
}: {
  closed: boolean;
  conceptId: string;
  id: string;
  points: VMobjectBezierPathPoint[];
  segments: VMobjectBezierPathSegment[];
}): VMobjectBezierPath {
  const cubicSegmentCount = segments.filter((segment) => segment.type === "cubic").length;
  const handlePointCount = points.filter((point) => point.kind === "handle").length;

  return {
    anchorPointCount: points.length - handlePointCount,
    closed,
    conceptId,
    cubicSegmentCount,
    handlePointCount,
    id,
    lineSegmentCount: segments.length - cubicSegmentCount,
    points,
    segmentCount: segments.length,
    segments,
    totalLength: segments.reduce((sum, segment) => sum + segment.length, 0)
  };
}

export function buildVMobjectBezierPathFromPoints({
  conceptId,
  id,
  points
}: {
  conceptId: string;
  id: string;
  points: Vec3[];
}): VMobjectBezierPath {
  const safePoints = points.map(sanitizeVec3);
  const anchors = safePoints.length >= 2 ? safePoints : [sanitizeVec3(safePoints[0]), sanitizeVec3(safePoints[0])];
  const segments = anchors.slice(1).map((point, index) => lineSegment(anchors[index], point));

  return buildPath({
    closed: false,
    conceptId,
    id,
    points: anchors.map((point, index) => pointEntry(index, "anchor", point)),
    segments
  });
}

function vec3FromValues(values: number[], offset = 0): Vec3 {
  return [
    finite(values[offset], 0),
    finite(values[offset + 1], 0),
    0
  ];
}

export function buildVMobjectBezierPathFromSvgPath({
  conceptId,
  id,
  path
}: {
  conceptId: string;
  id: string;
  path: string;
}): VMobjectBezierPath {
  const commands = parseSvgPathCommands(path);
  const points: VMobjectBezierPathPoint[] = [];
  const segments: VMobjectBezierPathSegment[] = [];
  let closed = false;
  let current: Vec3 = [0, 0, 0];
  let subpathStart: Vec3 = [0, 0, 0];

  for (const command of commands) {
    if (command.type === "M") {
      current = vec3FromValues(command.values);
      subpathStart = current;
      points.push(pointEntry(points.length, "anchor", current));
      continue;
    }

    if (command.type === "L") {
      const end = vec3FromValues(command.values);
      segments.push(lineSegment(current, end));
      points.push(pointEntry(points.length, "anchor", end));
      current = end;
      continue;
    }

    if (command.type === "C") {
      const handle1 = vec3FromValues(command.values, 0);
      const handle2 = vec3FromValues(command.values, 2);
      const end = vec3FromValues(command.values, 4);
      segments.push(cubicSegment(current, handle1, handle2, end));
      points.push(pointEntry(points.length, "handle", handle1));
      points.push(pointEntry(points.length, "handle", handle2));
      points.push(pointEntry(points.length, "anchor", end));
      current = end;
      continue;
    }

    if (command.type === "Z") {
      segments.push(lineSegment(current, subpathStart));
      points.push(pointEntry(points.length, "anchor", subpathStart));
      current = subpathStart;
      closed = true;
    }
  }

  return buildPath({
    closed,
    conceptId,
    id,
    points,
    segments
  });
}

export function sampleVMobjectBezierPath(path: VMobjectBezierPath, samplesPerSegment = 8): Vec3[] {
  const sampleCount = Math.max(1, Math.floor(finite(samplesPerSegment, 8)));
  const [firstSegment] = path.segments;
  if (!firstSegment) return path.points.filter((point) => point.kind === "anchor").map((point) => point.point);

  const samples: Vec3[] = [firstSegment.start];

  for (const segment of path.segments) {
    for (let index = 1; index <= sampleCount; index += 1) {
      samples.push(pointAtSegmentProgress(segment, index / sampleCount));
    }
  }

  return samples;
}

function pointAtSampleArcLength(samples: Vec3[], arcLength: number) {
  if (samples.length === 0) return [0, 0, 0] as Vec3;
  if (samples.length === 1) return samples[0];

  const segmentLengths = samples.slice(1).map((point, index) => distance(samples[index], point));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  const target = clamp(finite(arcLength, 0), 0, totalLength);
  let accumulated = 0;

  if (target <= 0 || totalLength === 0) return samples[0];

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const length = segmentLengths[index];
    const next = accumulated + length;

    if (target <= next) {
      const local = length === 0 ? 0 : (target - accumulated) / length;
      return interpolatePoint(samples[index], samples[index + 1], local);
    }

    accumulated = next;
  }

  return samples[samples.length - 1];
}

export function partialVMobjectBezierPathByArcRange(
  path: VMobjectBezierPath,
  startProgress: number,
  endProgress: number,
  samplesPerSegment = 24
): Vec3[] {
  const samples = sampleVMobjectBezierPath(path, samplesPerSegment);
  const segmentLengths = samples.slice(1).map((point, index) => distance(samples[index], point));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  const start = clamp01(startProgress);
  const end = clamp01(endProgress);
  const lower = Math.min(start, end) * totalLength;
  const upper = Math.max(start, end) * totalLength;
  let accumulated = 0;
  const middle: Vec3[] = [];

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const next = accumulated + segmentLengths[index];
    if (next > lower && next < upper) middle.push(samples[index + 1]);
    accumulated = next;
  }

  return [
    pointAtSampleArcLength(samples, lower),
    ...middle,
    pointAtSampleArcLength(samples, upper)
  ];
}

function nodeToBezierPath(node: RuntimeMathObjectNode): VMobjectBezierPath | null {
  if (node.renderState.kind !== "polyline") return null;
  if (node.renderState.points.length < 2) return null;

  return buildVMobjectBezierPathFromPoints({
    conceptId: node.conceptId,
    id: node.id,
    points: node.renderState.points
  });
}

export function buildVMobjectBezierPathsFromObjectGraph(objectGraph: MathObjectGraph): VMobjectBezierPath[] {
  return Object.values(objectGraph.byId)
    .map(nodeToBezierPath)
    .filter((path): path is VMobjectBezierPath => Boolean(path));
}

export function summarizeVMobjectBezierPaths(paths: VMobjectBezierPath[]): VMobjectBezierPathSummary {
  const pathIds = paths.map((path) => path.id).sort((left, right) => left.localeCompare(right));
  const summary: Omit<VMobjectBezierPathSummary, "summary"> = {
    anchorPointCount: paths.reduce((sum, path) => sum + path.anchorPointCount, 0),
    closedPathCount: paths.filter((path) => path.closed).length,
    cubicSegmentCount: paths.reduce((sum, path) => sum + path.cubicSegmentCount, 0),
    handlePointCount: paths.reduce((sum, path) => sum + path.handlePointCount, 0),
    pathCount: paths.length,
    pathIds: pathIds.join(",") || "none",
    samplePointCount: paths.reduce((sum, path) => sum + sampleVMobjectBezierPath(path, 2).length, 0),
    segmentCount: paths.reduce((sum, path) => sum + path.segmentCount, 0),
    sourceContract: VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT
  };

  return {
    ...summary,
    summary: [
      `bezierPaths=${summary.pathCount}`,
      `segments=${summary.segmentCount}`,
      `cubic=${summary.cubicSegmentCount}`,
      `anchors=${summary.anchorPointCount}`,
      `handles=${summary.handlePointCount}`,
      `closed=${summary.closedPathCount}`,
      `samples=${summary.samplePointCount}`,
      `ids=${summary.pathIds}`
    ].join(";")
  };
}

export function vmobjectBezierPathDataAttributes(summary: VMobjectBezierPathSummary) {
  return {
    "data-viz-vmobject-bezier-anchor-count": String(summary.anchorPointCount),
    "data-viz-vmobject-bezier-cubic-segment-count": String(summary.cubicSegmentCount),
    "data-viz-vmobject-bezier-handle-count": String(summary.handlePointCount),
    "data-viz-vmobject-bezier-path-count": String(summary.pathCount),
    "data-viz-vmobject-bezier-sample-count": String(summary.samplePointCount),
    "data-viz-vmobject-bezier-segment-count": String(summary.segmentCount),
    "data-viz-vmobject-bezier-source-contract": summary.sourceContract,
    "data-viz-vmobject-bezier-summary": summary.summary
  } as const;
}
