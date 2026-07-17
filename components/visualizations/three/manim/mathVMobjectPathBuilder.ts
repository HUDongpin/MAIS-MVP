import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { MathObjectGraph } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";
import type {
  VMobjectBezierPath,
  VMobjectBezierPathPoint,
  VMobjectBezierPathPointKind,
  VMobjectBezierPathSegment
} from "./mathVMobjectBezierPath";

export const VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT =
  "VMobject.start_new_path|VMobject.add_line_to|VMobject.add_cubic_bezier_curve_to|VMobject.set_points_as_corners|VMobject.close_path";

type VMobjectPathCommandId =
  | "addCubicBezierCurveTo"
  | "addLineTo"
  | "closePath"
  | "setPointsAsCorners"
  | "startNewPath";

export type VMobjectPathConstructionPlan = {
  addCubicBezierCurveToCount: number;
  addLineToCount: number;
  closePathCount: number;
  commandCount: number;
  commandIds: VMobjectPathCommandId[];
  commandSummary: string;
  conceptId: string;
  id: string;
  path: VMobjectBezierPath;
  setPointsAsCornersCount: number;
  sourceContract: typeof VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT;
  startNewPathCount: number;
};

export type VMobjectPathConstructionEvidence = {
  addCubicBezierCurveToCount: number;
  addLineToCount: number;
  anchorPointCount: number;
  closePathCount: number;
  closedPathCount: number;
  commandCount: number;
  cubicSegmentCount: number;
  handlePointCount: number;
  lineSegmentCount: number;
  operationSummary: string;
  pathCount: number;
  pathIds: string;
  plans: VMobjectPathConstructionPlan[];
  segmentCount: number;
  setPointsAsCornersCount: number;
  signature: string;
  sourceContract: typeof VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT;
  startNewPathCount: number;
  summary: string;
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeVec3(point: Vec3 | undefined): Vec3 {
  if (point && point.every(Number.isFinite)) return point;
  return [0, 0, 0];
}

function distance(left: Vec3, right: Vec3) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
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

function lineSegment(start: Vec3, end: Vec3): VMobjectBezierPathSegment {
  return { end, length: distance(start, end), start, type: "line" };
}

function cubicSegment(start: Vec3, handle1: Vec3, handle2: Vec3, end: Vec3): VMobjectBezierPathSegment {
  return { end, handle1, handle2, length: cubicLength(start, handle1, handle2, end), start, type: "cubic" };
}

function pointEntry(index: number, kind: VMobjectBezierPathPointKind, point: Vec3): VMobjectBezierPathPoint {
  return { index, kind, point };
}

function commandSummary(commandIds: VMobjectPathCommandId[]) {
  return [
    `startNewPath=${commandIds.filter((id) => id === "startNewPath").length}`,
    `addLineTo=${commandIds.filter((id) => id === "addLineTo").length}`,
    `addCubicBezierCurveTo=${commandIds.filter((id) => id === "addCubicBezierCurveTo").length}`,
    `closePath=${commandIds.filter((id) => id === "closePath").length}`,
    `setPointsAsCorners=${commandIds.filter((id) => id === "setPointsAsCorners").length}`
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

  return `vmobject-path-builder-${hash.toString(16).padStart(8, "0")}`;
}

function buildPath({
  closed,
  commandIds,
  conceptId,
  id,
  points,
  segments
}: {
  closed: boolean;
  commandIds: VMobjectPathCommandId[];
  conceptId: string;
  id: string;
  points: VMobjectBezierPathPoint[];
  segments: VMobjectBezierPathSegment[];
}): VMobjectPathConstructionPlan {
  const path: VMobjectBezierPath = {
    anchorPointCount: points.filter((point) => point.kind === "anchor").length,
    closed,
    conceptId,
    cubicSegmentCount: segments.filter((segment) => segment.type === "cubic").length,
    handlePointCount: points.filter((point) => point.kind === "handle").length,
    id,
    lineSegmentCount: segments.filter((segment) => segment.type === "line").length,
    points,
    segmentCount: segments.length,
    segments,
    totalLength: segments.reduce((sum, segment) => sum + segment.length, 0)
  };

  return {
    addCubicBezierCurveToCount: commandIds.filter((commandId) => commandId === "addCubicBezierCurveTo").length,
    addLineToCount: commandIds.filter((commandId) => commandId === "addLineTo").length,
    closePathCount: commandIds.filter((commandId) => commandId === "closePath").length,
    commandCount: commandIds.length,
    commandIds,
    commandSummary: commandSummary(commandIds),
    conceptId,
    id,
    path,
    setPointsAsCornersCount: commandIds.filter((commandId) => commandId === "setPointsAsCorners").length,
    sourceContract: VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT,
    startNewPathCount: commandIds.filter((commandId) => commandId === "startNewPath").length
  };
}

export function createVMobjectPathBuilder({ conceptId, id }: { conceptId: string; id: string }) {
  const commandIds: VMobjectPathCommandId[] = [];
  const points: VMobjectBezierPathPoint[] = [];
  const segments: VMobjectBezierPathSegment[] = [];
  let closed = false;
  let currentPoint: Vec3 | null = null;
  let startPoint: Vec3 | null = null;

  function pushPoint(kind: VMobjectBezierPathPointKind, point: Vec3) {
    points.push(pointEntry(points.length, kind, sanitizeVec3(point)));
  }

  const builder = {
    addCubicBezierCurveTo(handle1: Vec3, handle2: Vec3, end: Vec3) {
      const safeEnd = sanitizeVec3(end);
      if (!currentPoint) builder.startNewPath(safeEnd);
      const start = currentPoint ?? safeEnd;

      commandIds.push("addCubicBezierCurveTo");
      const safeHandle1 = sanitizeVec3(handle1);
      const safeHandle2 = sanitizeVec3(handle2);
      segments.push(cubicSegment(start, safeHandle1, safeHandle2, safeEnd));
      pushPoint("handle", safeHandle1);
      pushPoint("handle", safeHandle2);
      pushPoint("anchor", safeEnd);
      currentPoint = safeEnd;
      return builder;
    },
    addLineTo(end: Vec3) {
      const safeEnd = sanitizeVec3(end);
      if (!currentPoint) builder.startNewPath(safeEnd);
      const start = currentPoint ?? safeEnd;

      commandIds.push("addLineTo");
      segments.push(lineSegment(start, safeEnd));
      pushPoint("anchor", safeEnd);
      currentPoint = safeEnd;
      return builder;
    },
    build() {
      return buildPath({
        closed,
        commandIds: [...commandIds],
        conceptId,
        id,
        points: points.map((point) => ({ ...point, point: [...point.point] as Vec3 })),
        segments: segments.map((segment) => ({ ...segment })),
      });
    },
    closePath() {
      commandIds.push("closePath");
      if (startPoint && currentPoint && distance(currentPoint, startPoint) > 1e-9) {
        segments.push(lineSegment(currentPoint, startPoint));
        pushPoint("anchor", startPoint);
        currentPoint = startPoint;
      }
      closed = true;
      return builder;
    },
    startNewPath(point: Vec3) {
      const safePoint = sanitizeVec3(point);
      commandIds.push("startNewPath");
      pushPoint("anchor", safePoint);
      currentPoint = safePoint;
      startPoint = safePoint;
      closed = false;
      return builder;
    }
  };

  return builder;
}

export function buildVMobjectPathFromCorners({
  conceptId,
  id,
  points
}: {
  conceptId: string;
  id: string;
  points: Vec3[];
}): VMobjectPathConstructionPlan {
  const safePoints = points.map(sanitizeVec3);
  const builder = createVMobjectPathBuilder({ conceptId, id });

  if (safePoints.length === 0) {
    return buildPath({
      closed: false,
      commandIds: ["setPointsAsCorners"],
      conceptId,
      id,
      points: [],
      segments: []
    });
  }

  builder.startNewPath(safePoints[0]);
  safePoints.slice(1).forEach((point) => builder.addLineTo(point));
  const plan = builder.build();
  const commandIds: VMobjectPathCommandId[] = ["setPointsAsCorners", ...plan.commandIds];

  return buildPath({
    closed: plan.path.closed,
    commandIds,
    conceptId,
    id,
    points: plan.path.points,
    segments: plan.path.segments
  });
}

function operationSummaryForPlans(plans: VMobjectPathConstructionPlan[]) {
  const commandIds = plans.flatMap((plan) => plan.commandIds);
  return [
    `addCubicBezierCurveTo=${commandIds.filter((id) => id === "addCubicBezierCurveTo").length}`,
    `addLineTo=${commandIds.filter((id) => id === "addLineTo").length}`,
    `closePath=${commandIds.filter((id) => id === "closePath").length}`,
    `setPointsAsCorners=${commandIds.filter((id) => id === "setPointsAsCorners").length}`,
    `startNewPath=${commandIds.filter((id) => id === "startNewPath").length}`
  ].join(";");
}

export function summarizeVMobjectPathConstructionEvidence(evidence: VMobjectPathConstructionEvidence) {
  return `vmobject-path-builder:paths=${evidence.pathCount}:commands=${evidence.commandCount}:start=${evidence.startNewPathCount}:line=${evidence.addLineToCount}:cubic=${evidence.addCubicBezierCurveToCount}:close=${evidence.closePathCount}:corners=${evidence.setPointsAsCornersCount}:segments=${evidence.segmentCount}:closed=${evidence.closedPathCount}:ids=${evidence.pathIds}`;
}

export function buildVMobjectPathConstructionEvidence(
  plans: VMobjectPathConstructionPlan[]
): VMobjectPathConstructionEvidence {
  const sortedPlans = [...plans].sort((left, right) => left.id.localeCompare(right.id));
  const baseEvidence = {
    addCubicBezierCurveToCount: sortedPlans.reduce((sum, plan) => sum + plan.addCubicBezierCurveToCount, 0),
    addLineToCount: sortedPlans.reduce((sum, plan) => sum + plan.addLineToCount, 0),
    anchorPointCount: sortedPlans.reduce((sum, plan) => sum + plan.path.anchorPointCount, 0),
    closePathCount: sortedPlans.reduce((sum, plan) => sum + plan.closePathCount, 0),
    closedPathCount: sortedPlans.filter((plan) => plan.path.closed).length,
    commandCount: sortedPlans.reduce((sum, plan) => sum + plan.commandCount, 0),
    cubicSegmentCount: sortedPlans.reduce((sum, plan) => sum + plan.path.cubicSegmentCount, 0),
    handlePointCount: sortedPlans.reduce((sum, plan) => sum + plan.path.handlePointCount, 0),
    lineSegmentCount: sortedPlans.reduce((sum, plan) => sum + plan.path.lineSegmentCount, 0),
    operationSummary: operationSummaryForPlans(sortedPlans),
    pathCount: sortedPlans.length,
    pathIds: sortedPlans.map((plan) => plan.id).join(",") || "none",
    plans: sortedPlans,
    segmentCount: sortedPlans.reduce((sum, plan) => sum + plan.path.segmentCount, 0),
    setPointsAsCornersCount: sortedPlans.reduce((sum, plan) => sum + plan.setPointsAsCornersCount, 0),
    startNewPathCount: sortedPlans.reduce((sum, plan) => sum + plan.startNewPathCount, 0)
  };
  const evidence: VMobjectPathConstructionEvidence = {
    ...baseEvidence,
    signature: hashStableJson(stableSerialize(baseEvidence)),
    sourceContract: VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT,
    summary: ""
  };

  return {
    ...evidence,
    summary: summarizeVMobjectPathConstructionEvidence(evidence)
  };
}

export function buildVMobjectPathConstructionPlansFromObjectGraph(
  objectGraph: MathObjectGraph
): VMobjectPathConstructionPlan[] {
  return Object.values(objectGraph.byId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .filter((node) => node.renderState.kind === "polyline")
    .map((node) => ({
      node,
      points: pointsForRuntimeRenderState(node.renderState)
    }))
    .filter((entry) => entry.points.length >= 2)
    .map((entry) =>
      buildVMobjectPathFromCorners({
        conceptId: entry.node.conceptId,
        id: entry.node.id,
        points: entry.points
      })
    );
}

export function vmobjectPathConstructionDataAttributes(evidence: VMobjectPathConstructionEvidence) {
  return {
    "data-viz-vmobject-path-builder-add-cubic-bezier-count": String(evidence.addCubicBezierCurveToCount),
    "data-viz-vmobject-path-builder-add-line-to-count": String(evidence.addLineToCount),
    "data-viz-vmobject-path-builder-anchor-point-count": String(evidence.anchorPointCount),
    "data-viz-vmobject-path-builder-close-path-count": String(evidence.closePathCount),
    "data-viz-vmobject-path-builder-closed-path-count": String(evidence.closedPathCount),
    "data-viz-vmobject-path-builder-command-count": String(evidence.commandCount),
    "data-viz-vmobject-path-builder-cubic-segment-count": String(evidence.cubicSegmentCount),
    "data-viz-vmobject-path-builder-handle-point-count": String(evidence.handlePointCount),
    "data-viz-vmobject-path-builder-line-segment-count": String(evidence.lineSegmentCount),
    "data-viz-vmobject-path-builder-operation-summary": evidence.operationSummary,
    "data-viz-vmobject-path-builder-path-count": String(evidence.pathCount),
    "data-viz-vmobject-path-builder-path-ids": evidence.pathIds,
    "data-viz-vmobject-path-builder-set-points-as-corners-count": String(evidence.setPointsAsCornersCount),
    "data-viz-vmobject-path-builder-signature": evidence.signature,
    "data-viz-vmobject-path-builder-source-contract": evidence.sourceContract,
    "data-viz-vmobject-path-builder-start-new-path-count": String(evidence.startNewPathCount),
    "data-viz-vmobject-path-builder-summary": evidence.summary
  } as const;
}
