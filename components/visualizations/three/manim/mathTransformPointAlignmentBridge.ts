import { resampleCurveByArcLength } from "./mathCoordinateSpace";
import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { RuntimeRenderState } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";
import type { TransformFamilyAlignmentPlan } from "./mathTransformFamilyAlignment";
import {
  VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT,
  alignSmoothVMobjectPathsForMorph
} from "./mathVMobjectSmoothPath";

export const TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT =
  "Mobject.align_data_and_family|align_points: align matched source/target render-data point counts before Transform.interpolate_mobject" as const;

export type TransformPointAlignmentBridgeRow = {
  alignedPointCount: number;
  alignedPointSignature: string;
  alignmentPolicy: "direct-point-array" | "none" | "vmobject-insert-n-curves";
  compatible: boolean;
  interpolationObjectId: string;
  resampled: boolean;
  sourceAlignedPointPreview: string;
  sourceId: string;
  sourceKind: RuntimeRenderState["kind"];
  sourcePointCount: number;
  targetAlignedPointPreview: string;
  targetId: string;
  targetKind: RuntimeRenderState["kind"];
  targetPointCount: number;
  vmobjectAlignedCurveCount: number;
  vmobjectSourceContract: typeof VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT | "none";
  vmobjectSourceInsertNCurvesCount: number;
  vmobjectTargetInsertNCurvesCount: number;
};

export type TransformPointAlignmentBridgePlan = {
  compatibleEntryCount: number;
  matchedEntryCount: number;
  resampledEntryCount: number;
  rows: TransformPointAlignmentBridgeRow[];
  sourceContract: typeof TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT;
  sourceRootId: string;
  summary: string;
  targetRootId: string;
  totalAlignedPointCount: number;
  version: "mais-manim-transform-point-alignment-bridge/v1";
};

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

function pointCountFor(renderState: RuntimeRenderState) {
  return pointsForRuntimeRenderState(renderState).length;
}

function finiteNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function sanitizePoint(point: Vec3): Vec3 {
  return [finiteNumber(point[0]), finiteNumber(point[1]), finiteNumber(point[2])];
}

function formatPoint(point: Vec3) {
  return sanitizePoint(point)
    .map((value) => value.toFixed(3))
    .join(",");
}

function pointPreview(points: Vec3[]) {
  if (points.length === 0) return "none";
  const preview = points.length <= 4 ? points : [...points.slice(0, 3), points[points.length - 1]];
  return preview.map(formatPoint).join("|");
}

function pointEndpoints(points: Vec3[]) {
  if (points.length === 0) return "none";
  return `${formatPoint(points[0])}..${formatPoint(points[points.length - 1])}`;
}

function repeatedPoint(point: Vec3, count: number) {
  const sanitized = sanitizePoint(point);
  return Array.from({ length: Math.max(0, count) }, (): Vec3 => [...sanitized]);
}

function resamplePointsForAlignment(points: Vec3[], count: number) {
  const boundedCount = Math.max(0, Math.floor(finiteNumber(count)));
  if (boundedCount === 0) return [];
  if (points.length === 0) return repeatedPoint([0, 0, 0], boundedCount);
  if (points.length === 1) return repeatedPoint(points[0], boundedCount);
  if (points.length === boundedCount) return points.map(sanitizePoint);

  return resampleCurveByArcLength(
    points.map((point, index) => {
      const sanitized = sanitizePoint(point);
      return {
        math: sanitized,
        t: index,
        world: sanitized
      };
    }),
    boundedCount
  ).map((sample) => sanitizePoint(sample.world));
}

function pointAlignmentForRenderStates({
  alignedPointCount,
  conceptId,
  source,
  sourceId,
  target,
  targetId
}: {
  alignedPointCount: number;
  conceptId: string;
  source: RuntimeRenderState;
  sourceId: string;
  target: RuntimeRenderState;
  targetId: string;
}) {
  if (alignedPointCount <= 0) {
    return {
      alignmentPolicy: "none" as const,
      sourceAlignedPoints: [] as Vec3[],
      targetAlignedPoints: [] as Vec3[],
      vmobjectAlignedCurveCount: 0,
      vmobjectSourceContract: "none" as const,
      vmobjectSourceInsertNCurvesCount: 0,
      vmobjectTargetInsertNCurvesCount: 0
    };
  }

  if (source.kind === "polyline" && target.kind === "polyline") {
    const alignment = alignSmoothVMobjectPathsForMorph({
      conceptId,
      sourceId,
      sourcePoints: source.points,
      targetId,
      targetPoints: target.points
    });

    return {
      alignmentPolicy: "vmobject-insert-n-curves" as const,
      sourceAlignedPoints: alignment.source,
      targetAlignedPoints: alignment.target,
      vmobjectAlignedCurveCount: alignment.alignedCurveCount,
      vmobjectSourceContract: alignment.sourceContract,
      vmobjectSourceInsertNCurvesCount: alignment.sourceInsertNCurvesCount,
      vmobjectTargetInsertNCurvesCount: alignment.targetInsertNCurvesCount
    };
  }

  return {
    alignmentPolicy: "direct-point-array" as const,
    sourceAlignedPoints: resamplePointsForAlignment(pointsForRuntimeRenderState(source), alignedPointCount),
    targetAlignedPoints: resamplePointsForAlignment(pointsForRuntimeRenderState(target), alignedPointCount),
    vmobjectAlignedCurveCount: 0,
    vmobjectSourceContract: "none" as const,
    vmobjectSourceInsertNCurvesCount: 0,
    vmobjectTargetInsertNCurvesCount: 0
  };
}

function alignedPointSignature(sourceId: string, targetId: string, count: number, source: Vec3[], target: Vec3[]) {
  return [
    `${sourceId}->${targetId}`,
    `aligned=${count}`,
    `source=${pointEndpoints(source)}`,
    `target=${pointEndpoints(target)}`
  ].join(":");
}

function alignedPointCountFor(source: RuntimeRenderState, target: RuntimeRenderState) {
  if (source.kind !== target.kind) return 0;
  if (source.kind === "empty") return 0;
  if (source.kind === "point") return 1;
  if (source.kind === "vector") return 2;
  if (source.kind === "polyline" && target.kind === "polyline") {
    if (source.points.length === 0 && target.points.length === 0) return 0;
    return Math.max(2, source.points.length, target.points.length);
  }
  if (source.kind === "surface" && target.kind === "surface") {
    return Math.max(source.points.length, target.points.length);
  }

  return Math.max(pointCountFor(source), pointCountFor(target));
}

function rowSummary(row: TransformPointAlignmentBridgeRow) {
  return [
    `${row.sourceId}->${row.targetId}`,
    `${row.sourceKind}->${row.targetKind}`,
    `${row.sourcePointCount}->${row.targetPointCount}=${row.alignedPointCount}`
  ].join(":");
}

function summarizeRows(rows: TransformPointAlignmentBridgeRow[]) {
  return rows.map(rowSummary).join(";") || "none";
}

function countedSummary(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  return [...counts.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => `${value}=${counts.get(value) ?? 0}`)
    .join(";") || "none";
}

function vmobjectSourceContractSummary(rows: TransformPointAlignmentBridgeRow[]) {
  const contracts = [...new Set(
    rows
      .map((row) => row.vmobjectSourceContract)
      .filter((contract) => contract !== "none")
  )];

  return contracts.sort((left, right) => left.localeCompare(right)).join("|") || "none";
}

export function summarizeTransformPointAlignmentBridgePlan(plan: TransformPointAlignmentBridgePlan) {
  return [
    `transform-point-align:source=${plan.sourceRootId}`,
    `target=${plan.targetRootId}`,
    `matched=${plan.matchedEntryCount}`,
    `compatible=${plan.compatibleEntryCount}`,
    `resampled=${plan.resampledEntryCount}`,
    `points=${plan.totalAlignedPointCount}`
  ].join(":");
}

export function buildTransformPointAlignmentBridgePlan(
  alignment: TransformFamilyAlignmentPlan
): TransformPointAlignmentBridgePlan {
  const rows = alignment.entries
    .filter(
      (entry) =>
        entry.kind === "matched" &&
        entry.sourceId &&
        entry.targetId &&
        entry.sourceRenderState &&
        entry.targetRenderState
    )
    .map((entry): TransformPointAlignmentBridgeRow => {
      const source = entry.sourceRenderState as RuntimeRenderState;
      const target = entry.targetRenderState as RuntimeRenderState;
      const sourcePointCount = pointCountFor(source);
      const targetPointCount = pointCountFor(target);
      const compatible = source.kind === target.kind;
      const alignedPointCount = compatible ? alignedPointCountFor(source, target) : 0;
      const pointAlignment = compatible
        ? pointAlignmentForRenderStates({
            alignedPointCount,
            conceptId: entry.conceptId,
            source,
            sourceId: entry.sourceId as string,
            target,
            targetId: entry.targetId as string
          })
        : {
            alignmentPolicy: "none" as const,
            sourceAlignedPoints: [] as Vec3[],
            targetAlignedPoints: [] as Vec3[],
            vmobjectAlignedCurveCount: 0,
            vmobjectSourceContract: "none" as const,
            vmobjectSourceInsertNCurvesCount: 0,
            vmobjectTargetInsertNCurvesCount: 0
          };

      return {
        alignedPointCount,
        alignedPointSignature: alignedPointSignature(
          entry.sourceId as string,
          entry.targetId as string,
          alignedPointCount,
          pointAlignment.sourceAlignedPoints,
          pointAlignment.targetAlignedPoints
        ),
        alignmentPolicy: pointAlignment.alignmentPolicy,
        compatible,
        interpolationObjectId: entry.interpolationObjectId,
        resampled: compatible && alignedPointCount > 0 && sourcePointCount !== targetPointCount,
        sourceAlignedPointPreview: pointPreview(pointAlignment.sourceAlignedPoints),
        sourceId: entry.sourceId as string,
        sourceKind: source.kind,
        sourcePointCount,
        targetAlignedPointPreview: pointPreview(pointAlignment.targetAlignedPoints),
        targetId: entry.targetId as string,
        targetKind: target.kind,
        targetPointCount,
        vmobjectAlignedCurveCount: pointAlignment.vmobjectAlignedCurveCount,
        vmobjectSourceContract: pointAlignment.vmobjectSourceContract,
        vmobjectSourceInsertNCurvesCount: pointAlignment.vmobjectSourceInsertNCurvesCount,
        vmobjectTargetInsertNCurvesCount: pointAlignment.vmobjectTargetInsertNCurvesCount
      };
    });
  const planWithoutSummary = {
    compatibleEntryCount: rows.filter((row) => row.compatible).length,
    matchedEntryCount: rows.length,
    resampledEntryCount: rows.filter((row) => row.resampled).length,
    rows,
    sourceRootId: alignment.sourceRootId,
    targetRootId: alignment.targetRootId,
    totalAlignedPointCount: rows.reduce((sum, row) => sum + row.alignedPointCount, 0)
  };

  return {
    ...planWithoutSummary,
    sourceContract: TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT,
    summary: summarizeTransformPointAlignmentBridgePlan({
      ...planWithoutSummary,
      sourceContract: TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT,
      summary: "",
      version: "mais-manim-transform-point-alignment-bridge/v1"
    }),
    version: "mais-manim-transform-point-alignment-bridge/v1"
  };
}

export function transformPointAlignmentBridgeDataAttributes(
  plan: TransformPointAlignmentBridgePlan
): Record<string, string> {
  return {
    "data-viz-manim-transform-point-alignment-compatible-count": String(plan.compatibleEntryCount),
    "data-viz-manim-transform-point-alignment-matched-count": String(plan.matchedEntryCount),
    "data-viz-manim-transform-point-alignment-policy-summary": countedSummary(
      plan.rows.map((row) => row.alignmentPolicy)
    ),
    "data-viz-manim-transform-point-alignment-resampled-count": String(plan.resampledEntryCount),
    "data-viz-manim-transform-point-alignment-row-summary": summarizeRows(plan.rows),
    "data-viz-manim-transform-point-alignment-source-contract": plan.sourceContract,
    "data-viz-manim-transform-point-alignment-source-root-id": plan.sourceRootId,
    "data-viz-manim-transform-point-alignment-summary": plan.summary,
    "data-viz-manim-transform-point-alignment-target-root-id": plan.targetRootId,
    "data-viz-manim-transform-point-alignment-total-point-count": String(plan.totalAlignedPointCount),
    "data-viz-manim-transform-point-alignment-vmobject-aligned-curve-count": String(
      plan.rows.reduce((sum, row) => sum + row.vmobjectAlignedCurveCount, 0)
    ),
    "data-viz-manim-transform-point-alignment-vmobject-source-contract": vmobjectSourceContractSummary(plan.rows),
    "data-viz-manim-transform-point-alignment-vmobject-source-insert-n-curves-count": String(
      plan.rows.reduce((sum, row) => sum + row.vmobjectSourceInsertNCurvesCount, 0)
    ),
    "data-viz-manim-transform-point-alignment-vmobject-target-insert-n-curves-count": String(
      plan.rows.reduce((sum, row) => sum + row.vmobjectTargetInsertNCurvesCount, 0)
    )
  };
}

export function serializeTransformPointAlignmentBridgePlan(plan: TransformPointAlignmentBridgePlan) {
  return stableSerialize(plan);
}
