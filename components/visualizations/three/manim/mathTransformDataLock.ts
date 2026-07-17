import type { MathObjectTransformPlan } from "./mathObjectTransform";
import { resampleCurveByArcLength } from "./mathCoordinateSpace";
import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { RuntimeRenderState } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";
import { alignSurfaceSamplesForMorph, buildSurfaceObjectFromGrid } from "./mathSurfaceObject";

export const TRANSFORM_DATA_LOCK_SOURCE_CONTRACT = "Transform.begin:lock_matching_data" as const;

export type TransformDataLockKind = MathObjectTransformPlan["transformData"]["kind"] | "axes" | "point";

export type TransformDataLockPlan = {
  kind: TransformDataLockKind;
  lockedPointCount: number;
  lockedPointIndices: number[];
  movingPointCount: number;
  objectId: string;
  sourceSummary?: string;
  targetObjectId: string;
  totalPointCount: number;
};

export type TransformDataLockEvidence = {
  alignmentSummary: string;
  kindSummary: string;
  lockedPointCount: number;
  movingPointCount: number;
  objectIds: string;
  planCount: number;
  sourceContract: typeof TRANSFORM_DATA_LOCK_SOURCE_CONTRACT;
  summary: string;
  targetObjectIds: string;
  totalPointCount: number;
};

export type RuntimeTransformDataLockInput = {
  objectId: string;
  sourceRenderState: RuntimeRenderState;
  targetObjectId: string;
  targetRenderState: RuntimeRenderState;
};

type PointPair = {
  source: Vec3;
  target: Vec3;
};

type RuntimeSurfaceRenderState = Extract<RuntimeRenderState, { kind: "surface" }>;

function finite(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function pointsMatch(source: Vec3, target: Vec3, epsilon: number) {
  return (
    Math.abs(finite(source[0]) - finite(target[0])) <= epsilon &&
    Math.abs(finite(source[1]) - finite(target[1])) <= epsilon &&
    Math.abs(finite(source[2]) - finite(target[2])) <= epsilon
  );
}

function flattenSurfacePairs(source: Vec3[][], target: Vec3[][]): PointPair[] {
  return source.flatMap((row, rowIndex) =>
    row.map((point, columnIndex) => ({
      source: point,
      target: target[rowIndex]?.[columnIndex] ?? point
    }))
  );
}

function pointPairsForTransform(plan: MathObjectTransformPlan): PointPair[] {
  const transformData = plan.transformData;

  if (transformData.kind === "curve") {
    return transformData.aligned.source.map((point, index) => ({
      source: point,
      target: transformData.aligned.target[index] ?? point
    }));
  }

  if (transformData.kind === "surface") {
    return flattenSurfacePairs(transformData.aligned.source, transformData.aligned.target);
  }

  if (transformData.kind === "vector") {
    return [
      { source: transformData.sourceFrom, target: transformData.targetFrom },
      { source: transformData.sourceTo, target: transformData.targetTo }
    ];
  }

  return [];
}

function lastPoint(points: Vec3[]) {
  return points.at(-1) ?? [0, 0, 0];
}

function sanitizedPoint(point: Vec3): Vec3 {
  return [finite(point[0]), finite(point[1]), finite(point[2])];
}

function resamplePointArray(points: Vec3[], count: number) {
  const boundedCount = Math.max(0, Math.floor(finite(count)));
  if (boundedCount === 0) return [];
  if (points.length === 0) return Array.from({ length: boundedCount }, (): Vec3 => [0, 0, 0]);
  if (points.length === 1) return Array.from({ length: boundedCount }, () => sanitizedPoint(points[0]));
  if (points.length === boundedCount) return points.map(sanitizedPoint);

  return resampleCurveByArcLength(
    points.map((point, index) => {
      const sanitized = sanitizedPoint(point);
      return {
        math: sanitized,
        t: index,
        world: sanitized
      };
    }),
    boundedCount
  ).map((sample) => sanitizedPoint(sample.world));
}

function pointPairsFromPointArrays(source: Vec3[], target: Vec3[]): PointPair[] {
  const count = Math.max(source.length, target.length);

  return Array.from({ length: count }, (_, index) => ({
    source: source[index] ?? lastPoint(source),
    target: target[index] ?? lastPoint(target)
  }));
}

function alignedCurvePointPairs(source: Vec3[], target: Vec3[]) {
  const count = Math.max(source.length, target.length);
  const alignedSource = resamplePointArray(source, count);
  const alignedTarget = resamplePointArray(target, count);

  return alignedSource.map((point, index) => ({
    source: point,
    target: alignedTarget[index] ?? point
  }));
}

function runtimeSurfaceRows(renderState: RuntimeSurfaceRenderState) {
  if (renderState.wireframeRows.length > 0) {
    return renderState.wireframeRows.map((row) => row.map(sanitizedPoint));
  }

  const rowCount = Math.max(0, Math.floor(finite(renderState.rows)));
  const columnCount = Math.max(0, Math.floor(finite(renderState.columns)));
  const rows = Array.from({ length: rowCount }, (_, row) =>
    renderState.points.slice(row * columnCount, (row + 1) * columnCount).map(sanitizedPoint)
  ).filter((row) => row.length > 0);

  return rows.length > 0 ? rows : [[[0, 0, 0] satisfies Vec3]];
}

function runtimeSurfaceObject(id: string, renderState: RuntimeSurfaceRenderState) {
  return buildSurfaceObjectFromGrid({
    colorRole: "surface",
    conceptId: "runtime-transform",
    id,
    samples: runtimeSurfaceRows(renderState),
    uRange: [0, 1],
    vRange: [0, 1]
  });
}

function runtimeSurfaceAlignedCount(source: RuntimeSurfaceRenderState, target: RuntimeSurfaceRenderState) {
  return Math.max(2, Math.floor(finite(Math.max(source.rows, source.columns, target.rows, target.columns))));
}

function alignedSurfacePointPairs(source: RuntimeSurfaceRenderState, target: RuntimeSurfaceRenderState) {
  const aligned = alignSurfaceSamplesForMorph(
    runtimeSurfaceObject("source-surface", source),
    runtimeSurfaceObject("target-surface", target),
    runtimeSurfaceAlignedCount(source, target)
  );

  return flattenSurfacePairs(aligned.source, aligned.target);
}

function kindForRuntimeRenderState(source: RuntimeRenderState, target: RuntimeRenderState): TransformDataLockKind {
  if (source.kind !== target.kind) return "empty";
  if (source.kind === "axes") return "axes";
  if (source.kind === "polyline") return "curve";
  if (source.kind === "point") return "point";
  if (source.kind === "surface") return "surface";
  if (source.kind === "vector") return "vector";
  return "empty";
}

function pointPairsForRuntimeRenderState(source: RuntimeRenderState, target: RuntimeRenderState): PointPair[] {
  if (source.kind === "axes" && target.kind === "axes") {
    return pointPairsFromPointArrays(pointsForRuntimeRenderState(source), pointsForRuntimeRenderState(target));
  }

  if (source.kind === "polyline" && target.kind === "polyline") {
    return alignedCurvePointPairs(source.points, target.points);
  }

  if (source.kind === "point" && target.kind === "point") {
    return [{ source: source.position, target: target.position }];
  }

  if (source.kind === "surface" && target.kind === "surface") {
    return alignedSurfacePointPairs(source, target);
  }

  if (source.kind === "vector" && target.kind === "vector") {
    return [
      { source: source.from, target: target.from },
      { source: source.to, target: target.to }
    ];
  }

  return [];
}

function buildLockPlanFromPairs(
  objectId: string,
  targetObjectId: string,
  kind: TransformDataLockKind,
  pairs: PointPair[],
  epsilon: number,
  sourceSummary?: string
): TransformDataLockPlan {
  const lockedPointIndices = pairs
    .map((pair, index) => (pointsMatch(pair.source, pair.target, Math.max(0, finite(epsilon))) ? index : -1))
    .filter((index) => index >= 0);

  return {
    kind,
    lockedPointCount: lockedPointIndices.length,
    lockedPointIndices,
    movingPointCount: pairs.length - lockedPointIndices.length,
    objectId,
    ...(sourceSummary ? { sourceSummary } : {}),
    targetObjectId,
    totalPointCount: pairs.length
  };
}

export function buildTransformDataLockPlan(
  plan: MathObjectTransformPlan,
  { epsilon = 1e-9 }: { epsilon?: number } = {}
): TransformDataLockPlan {
  const pairs = pointPairsForTransform(plan);
  return buildLockPlanFromPairs(plan.objectId, plan.targetObjectId, plan.transformData.kind, pairs, epsilon);
}

export function buildRuntimeTransformDataLockPlan(
  input: RuntimeTransformDataLockInput,
  { epsilon = 1e-9 }: { epsilon?: number } = {}
): TransformDataLockPlan {
  const kind = kindForRuntimeRenderState(input.sourceRenderState, input.targetRenderState);
  const pairs = pointPairsForRuntimeRenderState(input.sourceRenderState, input.targetRenderState);
  let sourceSummary: string | undefined;

  if (input.sourceRenderState.kind === "polyline" && input.targetRenderState.kind === "polyline") {
    sourceSummary = [
      `runtime-polyline-align:source=${input.sourceRenderState.points.length}`,
      `target=${input.targetRenderState.points.length}`,
      `aligned=${pairs.length}`,
      "strategy=arc-length"
    ].join(":");
  }

  if (input.sourceRenderState.kind === "surface" && input.targetRenderState.kind === "surface") {
    const alignedCount = runtimeSurfaceAlignedCount(input.sourceRenderState, input.targetRenderState);
    sourceSummary = [
      `runtime-surface-align:source=${input.sourceRenderState.rows}x${input.sourceRenderState.columns}`,
      `target=${input.targetRenderState.rows}x${input.targetRenderState.columns}`,
      `aligned=${alignedCount}x${alignedCount}`,
      "strategy=surface-grid"
    ].join(":");
  }

  return buildLockPlanFromPairs(
    input.objectId,
    input.targetObjectId,
    kind,
    pairs,
    epsilon,
    sourceSummary
  );
}

export function summarizeTransformDataLockPlan(plan: TransformDataLockPlan) {
  const indices = plan.lockedPointIndices.join(",") || "none";
  return `${plan.objectId}->${plan.targetObjectId}:${plan.kind};locked=${plan.lockedPointCount};moving=${plan.movingPointCount};indices=${indices}`;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function summarizeIds(values: string[]) {
  return uniqueSorted(values).join(",") || "none";
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

function summarizeKinds(plans: TransformDataLockPlan[]) {
  const orderedKinds: TransformDataLockKind[] = ["curve", "surface", "vector", "axes", "point", "empty"];
  const counts = new Map<TransformDataLockKind, number>();

  plans.forEach((plan) => counts.set(plan.kind, (counts.get(plan.kind) ?? 0) + 1));

  return orderedKinds
    .filter((kind) => counts.has(kind))
    .map((kind) => `${kind}=${counts.get(kind)}`)
    .join(";") || "none";
}

export function summarizeTransformDataLockEvidence(plans: TransformDataLockPlan[]): TransformDataLockEvidence {
  const alignmentSummary = summarizeIds(plans.map((plan) => plan.sourceSummary ?? "none").filter((summary) => summary !== "none"));
  const objectIds = summarizeIds(plans.map((plan) => plan.objectId));
  const targetObjectIds = summarizeIds(plans.map((plan) => plan.targetObjectId));
  const kindSummary = summarizeKinds(plans);
  const totalPointCount = plans.reduce((sum, plan) => sum + plan.totalPointCount, 0);
  const lockedPointCount = plans.reduce((sum, plan) => sum + plan.lockedPointCount, 0);
  const movingPointCount = plans.reduce((sum, plan) => sum + plan.movingPointCount, 0);
  const summary = [
    `transform-data-lock:plans=${plans.length}`,
    `total=${totalPointCount}`,
    `locked=${lockedPointCount}`,
    `moving=${movingPointCount}`,
    `objects=${objectIds}`,
    `kinds=${kindSummary}`
  ].join(":");

  return {
    alignmentSummary,
    kindSummary,
    lockedPointCount,
    movingPointCount,
    objectIds,
    planCount: plans.length,
    sourceContract: TRANSFORM_DATA_LOCK_SOURCE_CONTRACT,
    summary,
    targetObjectIds,
    totalPointCount
  };
}

export function transformDataLockEvidenceDataAttributes(evidence: TransformDataLockEvidence): Record<string, string> {
  return {
    "data-viz-manim-transform-data-lock-alignment-summary": evidence.alignmentSummary,
    "data-viz-manim-transform-data-lock-kind-summary": evidence.kindSummary,
    "data-viz-manim-transform-data-lock-locked-point-count": String(evidence.lockedPointCount),
    "data-viz-manim-transform-data-lock-moving-point-count": String(evidence.movingPointCount),
    "data-viz-manim-transform-data-lock-object-ids": evidence.objectIds,
    "data-viz-manim-transform-data-lock-plan-count": String(evidence.planCount),
    "data-viz-manim-transform-data-lock-source-contract": evidence.sourceContract,
    "data-viz-manim-transform-data-lock-summary": evidence.summary,
    "data-viz-manim-transform-data-lock-target-object-ids": evidence.targetObjectIds,
    "data-viz-manim-transform-data-lock-total-point-count": String(evidence.totalPointCount)
  };
}

export function serializeTransformDataLockEvidence(evidence: TransformDataLockEvidence) {
  return stableSerialize(evidence);
}
