import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { MathObjectGraph } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";
import {
  sampleVMobjectBezierPath,
  type VMobjectBezierPath,
  type VMobjectBezierPathPoint,
  type VMobjectBezierPathSegment
} from "./mathVMobjectBezierPath";

export const VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT =
  "VMobject.set_points_smoothly|VMobject.make_smooth|VMobject.change_anchor_mode|VMobject.insert_n_curves";

type SmoothPathCommandId = "changeAnchorMode" | "insertNCurves" | "makeSmooth" | "setPointsSmoothly";

export type VMobjectSmoothPathPlan = {
  anchorPointCount: number;
  changeAnchorModeCount: number;
  commandCount: number;
  commandIds: SmoothPathCommandId[];
  commandSummary: string;
  conceptId: string;
  continuityPassCount: number;
  cubicSegmentCount: number;
  handlePointCount: number;
  id: string;
  insertNCurvesCount: number;
  makeSmoothCount: number;
  maxHandleLength: number;
  path: VMobjectBezierPath;
  setPointsSmoothlyCount: number;
  smoothingMode: "catmull-rom-cubic";
  sourceContract: typeof VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT;
};

export type VMobjectSmoothPathEvidence = {
  anchorPointCount: number;
  changeAnchorModeCount: number;
  commandCount: number;
  continuityPassCount: number;
  cubicSegmentCount: number;
  handlePointCount: number;
  insertNCurvesCount: number;
  makeSmoothCount: number;
  maxHandleLength: number;
  operationSummary: string;
  pathCount: number;
  pathIds: string;
  plans: VMobjectSmoothPathPlan[];
  setPointsSmoothlyCount: number;
  signature: string;
  smoothingModeSummary: string;
  sourceContract: typeof VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT;
  summary: string;
};

export type VMobjectSmoothPathMorphAlignment = {
  alignedCurveCount: number;
  alignedPointCount: number;
  conceptId: string;
  source: Vec3[];
  sourceContract: typeof VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT;
  sourceId: string;
  sourceInsertNCurvesCount: number;
  summary: string;
  target: Vec3[];
  targetId: string;
  targetInsertNCurvesCount: number;
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeVec3(point: Vec3 | undefined): Vec3 {
  if (point && point.every(Number.isFinite)) return point;
  return [0, 0, 0];
}

function add(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subtract(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scale(point: Vec3, scalar: number): Vec3 {
  const amount = finite(scalar, 0);
  return [point[0] * amount, point[1] * amount, point[2] * amount];
}

function distance(left: Vec3, right: Vec3) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function magnitude(point: Vec3) {
  return Math.hypot(point[0], point[1], point[2]);
}

function normalize(point: Vec3): Vec3 {
  const length = magnitude(point);
  if (length <= 1e-9) return [0, 0, 0];
  return [point[0] / length, point[1] / length, point[2] / length];
}

function cubicPoint(start: Vec3, handle1: Vec3, handle2: Vec3, end: Vec3, progress: number): Vec3 {
  const alpha = Math.min(1, Math.max(0, finite(progress)));
  const beta = 1 - alpha;
  const a = beta * beta * beta;
  const b = 3 * beta * beta * alpha;
  const c = 3 * beta * alpha * alpha;
  const d = alpha * alpha * alpha;

  return [
    a * start[0] + b * handle1[0] + c * handle2[0] + d * end[0],
    a * start[1] + b * handle1[1] + c * handle2[1] + d * end[1],
    a * start[2] + b * handle1[2] + c * handle2[2] + d * end[2]
  ];
}

function cubicDerivative(start: Vec3, handle1: Vec3, handle2: Vec3, end: Vec3, progress: number): Vec3 {
  const alpha = Math.min(1, Math.max(0, finite(progress)));
  const beta = 1 - alpha;
  const startTerm = scale(subtract(handle1, start), 3 * beta * beta);
  const middleTerm = scale(subtract(handle2, handle1), 6 * beta * alpha);
  const endTerm = scale(subtract(end, handle2), 3 * alpha * alpha);

  return add(add(startTerm, middleTerm), endTerm);
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

function pointEntry(index: number, kind: "anchor" | "handle", point: Vec3): VMobjectBezierPathPoint {
  return { index, kind, point };
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

function subdivideCubicSegment(segment: VMobjectBezierPathSegment, parts: number): VMobjectBezierPathSegment[] {
  if (segment.type !== "cubic") return [segment];
  const count = Math.max(1, Math.floor(finite(parts, 1)));

  return Array.from({ length: count }, (_, index) => {
    const lower = index / count;
    const upper = (index + 1) / count;
    const span = upper - lower;
    const start = cubicPoint(segment.start, segment.handle1, segment.handle2, segment.end, lower);
    const end = cubicPoint(segment.start, segment.handle1, segment.handle2, segment.end, upper);
    const startHandle = add(start, scale(cubicDerivative(segment.start, segment.handle1, segment.handle2, segment.end, lower), span / 3));
    const endHandle = subtract(end, scale(cubicDerivative(segment.start, segment.handle1, segment.handle2, segment.end, upper), span / 3));

    return cubicSegment(start, startHandle, endHandle, end);
  });
}

function insertNCurves(segments: VMobjectBezierPathSegment[], targetCurveCount: number | undefined) {
  const target = Math.max(0, Math.floor(finite(targetCurveCount ?? 0, 0)));
  if (segments.length === 0 || target <= segments.length) return segments;
  const baseSplitCount = Math.floor(target / segments.length);
  let remainder = target % segments.length;

  return segments.flatMap((segment) => {
    const splitCount = baseSplitCount + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return subdivideCubicSegment(segment, splitCount);
  });
}

function pathPointsForSegments(segments: VMobjectBezierPathSegment[]): VMobjectBezierPathPoint[] {
  const [firstSegment] = segments;
  if (!firstSegment) return [];
  const points: VMobjectBezierPathPoint[] = [pointEntry(0, "anchor", firstSegment.start)];

  for (const segment of segments) {
    if (segment.type === "cubic") {
      points.push(pointEntry(points.length, "handle", segment.handle1));
      points.push(pointEntry(points.length, "handle", segment.handle2));
    }
    points.push(pointEntry(points.length, "anchor", segment.end));
  }

  return points;
}

function repeatedVec3(point: Vec3, count: number) {
  const safePoint = sanitizeVec3(point);
  return Array.from({ length: Math.max(0, count) }, (): Vec3 => [...safePoint]);
}

function morphAnchors(points: Vec3[]) {
  const safePoints = points.map(sanitizeVec3);
  if (safePoints.length >= 2) return safePoints;
  if (safePoints.length === 1) return [safePoints[0], safePoints[0]];
  return repeatedVec3([0, 0, 0], 2);
}

function padSamples(points: Vec3[], count: number) {
  const boundedCount = Math.max(0, Math.floor(finite(count, 0)));
  if (boundedCount === 0) return [];
  if (points.length === 0) return repeatedVec3([0, 0, 0], boundedCount);
  if (points.length >= boundedCount) return points.slice(0, boundedCount).map(sanitizeVec3);

  const fallback = points[points.length - 1];
  return [
    ...points.map(sanitizeVec3),
    ...repeatedVec3(fallback, boundedCount - points.length)
  ];
}

function tangentDirectionAt(points: Vec3[], index: number): Vec3 {
  if (points.length <= 1) return [0, 0, 0];
  if (index <= 0) return normalize(subtract(points[1], points[0]));
  if (index >= points.length - 1) return normalize(subtract(points[points.length - 1], points[points.length - 2]));
  return normalize(subtract(points[index + 1], points[index - 1]));
}

function handleLengthAt(points: Vec3[], index: number) {
  if (points.length <= 1) return 0;
  if (index <= 0) return distance(points[0], points[1]) / 3;
  if (index >= points.length - 1) return distance(points[points.length - 2], points[points.length - 1]) / 3;

  return Math.min(distance(points[index - 1], points[index]), distance(points[index], points[index + 1])) / 3;
}

function commandSummary(commandIds: SmoothPathCommandId[]) {
  return [
    `setPointsSmoothly=${commandIds.filter((id) => id === "setPointsSmoothly").length}`,
    `makeSmooth=${commandIds.filter((id) => id === "makeSmooth").length}`,
    `changeAnchorMode=${commandIds.filter((id) => id === "changeAnchorMode").length}`,
    `insertNCurves=${commandIds.filter((id) => id === "insertNCurves").length}`
  ].join(";");
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `vmobject-smooth-path-${hash.toString(16).padStart(8, "0")}`;
}

function round3(value: number) {
  return finite(value, 0).toFixed(3);
}

export function buildSmoothVMobjectPathFromAnchors({
  conceptId,
  id,
  points,
  targetCurveCount
}: {
  conceptId: string;
  id: string;
  points: Vec3[];
  targetCurveCount?: number;
}): VMobjectSmoothPathPlan {
  const anchors = points.map(sanitizeVec3);
  const commandIds: SmoothPathCommandId[] = ["setPointsSmoothly", "makeSmooth", "changeAnchorMode"];
  const segments: VMobjectBezierPathSegment[] = [];
  let maxHandleLength = 0;

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const start = anchors[index];
    const end = anchors[index + 1];
    const startHandle = add(start, scale(tangentDirectionAt(anchors, index), handleLengthAt(anchors, index)));
    const endHandle = subtract(end, scale(tangentDirectionAt(anchors, index + 1), handleLengthAt(anchors, index + 1)));

    maxHandleLength = Math.max(maxHandleLength, distance(start, startHandle), distance(end, endHandle));
    segments.push(cubicSegment(start, startHandle, endHandle, end));
  }

  const smoothSegments = insertNCurves(segments, targetCurveCount);
  const pathPoints = smoothSegments.length > 0
    ? pathPointsForSegments(smoothSegments)
    : anchors.map((point, index) => pointEntry(index, "anchor", point));
  if (smoothSegments.length > segments.length) commandIds.push("insertNCurves");

  const path: VMobjectBezierPath = {
    anchorPointCount: pathPoints.filter((point) => point.kind === "anchor").length,
    closed: false,
    conceptId,
    cubicSegmentCount: smoothSegments.length,
    handlePointCount: pathPoints.filter((point) => point.kind === "handle").length,
    id,
    lineSegmentCount: 0,
    points: pathPoints,
    segmentCount: smoothSegments.length,
    segments: smoothSegments,
    totalLength: smoothSegments.reduce((sum, segment) => sum + segment.length, 0)
  };

  return {
    anchorPointCount: path.anchorPointCount,
    changeAnchorModeCount: 1,
    commandCount: commandIds.length,
    commandIds,
    commandSummary: commandSummary(commandIds),
    conceptId,
    continuityPassCount: segments.length > 0 ? 1 : 0,
    cubicSegmentCount: path.cubicSegmentCount,
    handlePointCount: path.handlePointCount,
    id,
    insertNCurvesCount: Math.max(0, smoothSegments.length - segments.length),
    makeSmoothCount: 1,
    maxHandleLength,
    path,
    setPointsSmoothlyCount: 1,
    smoothingMode: "catmull-rom-cubic",
    sourceContract: VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT
  };
}

export function sampleSmoothVMobjectPathFromAnchors({
  conceptId,
  id,
  points,
  samplesPerSegment = 8,
  targetCurveCount
}: {
  conceptId: string;
  id: string;
  points: Vec3[];
  samplesPerSegment?: number;
  targetCurveCount?: number;
}): Vec3[] {
  const safePoints = points.map(sanitizeVec3);
  if (safePoints.length < 2) return safePoints;
  return sampleVMobjectBezierPath(
    buildSmoothVMobjectPathFromAnchors({ conceptId, id, points: safePoints, targetCurveCount }).path,
    samplesPerSegment
  );
}

export function alignSmoothVMobjectPathsForMorph({
  conceptId,
  samplesPerSegment = 1,
  sourceId,
  sourcePoints,
  targetId,
  targetPoints
}: {
  conceptId: string;
  samplesPerSegment?: number;
  sourceId: string;
  sourcePoints: Vec3[];
  targetId: string;
  targetPoints: Vec3[];
}): VMobjectSmoothPathMorphAlignment {
  const sourceAnchors = morphAnchors(sourcePoints);
  const targetAnchors = morphAnchors(targetPoints);
  const alignedCurveCount = Math.max(1, sourceAnchors.length - 1, targetAnchors.length - 1);
  const sourcePlan = buildSmoothVMobjectPathFromAnchors({
    conceptId,
    id: sourceId,
    points: sourceAnchors,
    targetCurveCount: alignedCurveCount
  });
  const targetPlan = buildSmoothVMobjectPathFromAnchors({
    conceptId,
    id: targetId,
    points: targetAnchors,
    targetCurveCount: alignedCurveCount
  });
  const sourceSamples = sampleVMobjectBezierPath(sourcePlan.path, samplesPerSegment);
  const targetSamples = sampleVMobjectBezierPath(targetPlan.path, samplesPerSegment);
  const alignedPointCount = Math.max(sourceSamples.length, targetSamples.length);
  const source = padSamples(sourceSamples, alignedPointCount);
  const target = padSamples(targetSamples, alignedPointCount);
  const alignment: Omit<VMobjectSmoothPathMorphAlignment, "summary"> = {
    alignedCurveCount,
    alignedPointCount,
    conceptId,
    source,
    sourceContract: VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT,
    sourceId,
    sourceInsertNCurvesCount: sourcePlan.insertNCurvesCount,
    target,
    targetId,
    targetInsertNCurvesCount: targetPlan.insertNCurvesCount
  };

  return {
    ...alignment,
    summary: [
      `vmobject-morph-align:source=${sourceId}`,
      `target=${targetId}`,
      `curves=${alignedCurveCount}`,
      `points=${alignedPointCount}`,
      `sourceInsert=${alignment.sourceInsertNCurvesCount}`,
      `targetInsert=${alignment.targetInsertNCurvesCount}`
    ].join(":")
  };
}

function operationSummaryForPlans(plans: VMobjectSmoothPathPlan[]) {
  const commandIds = plans.flatMap((plan) => plan.commandIds);
  return commandSummary(commandIds);
}

function smoothingModeSummaryForPlans(plans: VMobjectSmoothPathPlan[]) {
  const counts = new Map<string, number>();
  plans.forEach((plan) => counts.set(plan.smoothingMode, (counts.get(plan.smoothingMode) ?? 0) + 1));
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([mode, count]) => `${mode}=${count}`)
    .join(";") || "none";
}

export function summarizeVMobjectSmoothPathEvidence(evidence: VMobjectSmoothPathEvidence) {
  return `vmobject-smooth-path:paths=${evidence.pathCount}:commands=${evidence.commandCount}:cubic=${evidence.cubicSegmentCount}:anchors=${evidence.anchorPointCount}:handles=${evidence.handlePointCount}:continuity=${evidence.continuityPassCount}:maxHandle=${round3(evidence.maxHandleLength)}:ids=${evidence.pathIds}`;
}

export function buildVMobjectSmoothPathEvidence(plans: VMobjectSmoothPathPlan[]): VMobjectSmoothPathEvidence {
  const sortedPlans = [...plans].sort((left, right) => left.id.localeCompare(right.id));
  const baseEvidence = {
    anchorPointCount: sortedPlans.reduce((sum, plan) => sum + plan.anchorPointCount, 0),
    changeAnchorModeCount: sortedPlans.reduce((sum, plan) => sum + plan.changeAnchorModeCount, 0),
    commandCount: sortedPlans.reduce((sum, plan) => sum + plan.commandCount, 0),
    continuityPassCount: sortedPlans.reduce((sum, plan) => sum + plan.continuityPassCount, 0),
    cubicSegmentCount: sortedPlans.reduce((sum, plan) => sum + plan.cubicSegmentCount, 0),
    handlePointCount: sortedPlans.reduce((sum, plan) => sum + plan.handlePointCount, 0),
    insertNCurvesCount: sortedPlans.reduce((sum, plan) => sum + plan.insertNCurvesCount, 0),
    makeSmoothCount: sortedPlans.reduce((sum, plan) => sum + plan.makeSmoothCount, 0),
    maxHandleLength: sortedPlans.reduce((max, plan) => Math.max(max, plan.maxHandleLength), 0),
    operationSummary: operationSummaryForPlans(sortedPlans),
    pathCount: sortedPlans.length,
    pathIds: sortedPlans.map((plan) => plan.id).join(",") || "none",
    plans: sortedPlans,
    setPointsSmoothlyCount: sortedPlans.reduce((sum, plan) => sum + plan.setPointsSmoothlyCount, 0),
    smoothingModeSummary: smoothingModeSummaryForPlans(sortedPlans)
  };
  const evidence: VMobjectSmoothPathEvidence = {
    ...baseEvidence,
    signature: hashStableJson(stableSerialize(baseEvidence)),
    sourceContract: VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT,
    summary: ""
  };

  return {
    ...evidence,
    summary: summarizeVMobjectSmoothPathEvidence(evidence)
  };
}

export function buildVMobjectSmoothPathPlansFromObjectGraph(objectGraph: MathObjectGraph): VMobjectSmoothPathPlan[] {
  return Object.values(objectGraph.byId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .filter((node) => node.renderState.kind === "polyline")
    .map((node) => ({
      node,
      points: pointsForRuntimeRenderState(node.renderState)
    }))
    .filter((entry) => entry.points.length >= 2)
    .map((entry) =>
      buildSmoothVMobjectPathFromAnchors({
        conceptId: entry.node.conceptId,
        id: entry.node.id,
        points: entry.points
      })
    );
}

export function vmobjectSmoothPathDataAttributes(evidence: VMobjectSmoothPathEvidence) {
  return {
    "data-viz-vmobject-smooth-path-anchor-point-count": String(evidence.anchorPointCount),
    "data-viz-vmobject-smooth-path-change-anchor-mode-count": String(evidence.changeAnchorModeCount),
    "data-viz-vmobject-smooth-path-command-count": String(evidence.commandCount),
    "data-viz-vmobject-smooth-path-continuity-pass-count": String(evidence.continuityPassCount),
    "data-viz-vmobject-smooth-path-count": String(evidence.pathCount),
    "data-viz-vmobject-smooth-path-cubic-segment-count": String(evidence.cubicSegmentCount),
    "data-viz-vmobject-smooth-path-handle-point-count": String(evidence.handlePointCount),
    "data-viz-vmobject-smooth-path-ids": evidence.pathIds,
    "data-viz-vmobject-smooth-path-insert-n-curves-count": String(evidence.insertNCurvesCount),
    "data-viz-vmobject-smooth-path-make-smooth-count": String(evidence.makeSmoothCount),
    "data-viz-vmobject-smooth-path-max-handle-length": round3(evidence.maxHandleLength),
    "data-viz-vmobject-smooth-path-operation-summary": evidence.operationSummary,
    "data-viz-vmobject-smooth-path-set-points-smoothly-count": String(evidence.setPointsSmoothlyCount),
    "data-viz-vmobject-smooth-path-signature": evidence.signature,
    "data-viz-vmobject-smooth-path-smoothing-mode-summary": evidence.smoothingModeSummary,
    "data-viz-vmobject-smooth-path-source-contract": evidence.sourceContract,
    "data-viz-vmobject-smooth-path-summary": evidence.summary
  } as const;
}
