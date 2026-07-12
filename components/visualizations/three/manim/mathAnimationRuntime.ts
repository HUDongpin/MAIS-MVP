import type { MathAnimatePlan } from "./mathAnimationBuilder";
import { buildSceneAnimationCompositionPlans, sampleAnimationCompositionFrame } from "./mathAnimationComposition";
import {
  TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
  TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
  resolveTransformPathFunction,
  summarizeTransformPathSpec,
  type TransformPathFunction,
  type TransformPathSpec
} from "./mathPathFunctions";
import { applyRateFunction, rateFunctionForStep, type MathRateFunctionName } from "./mathRateFunctions";
import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import { alignSurfaceSamplesForMorph, buildSurfaceObjectFromGrid } from "./mathSurfaceObject";
import type { MathSceneRuntimeState, RuntimeBoundingBox, RuntimeRenderState } from "./mathSceneRuntimeState";
import { interpolateMobjectUniforms, type RuntimeMobjectUniforms } from "./mathMobjectUniforms";
import { rebuildMathSceneRuntimeGraphState } from "./mathSceneRuntimeGraph";
import type { Vec3 } from "./mathSceneTypes";
import { alignSmoothVMobjectPathsForMorph } from "./mathVMobjectSmoothPath";
import { interpolateVMobjectStyle, type VMobjectStyle } from "./mathVMobjectStyle";

export const ANIMATION_RUNTIME_SOURCE_CONTRACT =
  "Animation.interpolate(alpha)->interpolate_mobject with lagged sub-alpha and Mobject.interpolate render-state updates";
export const MOBJECT_INTERPOLATE_RENDER_POLICY =
  "mobject-interpolate-pointlike-fields-use-path-functions-nonpoint-data-blends-linearly" as const;
export const MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY =
  "Mobject.interpolate:start-target-data+uniforms+bounding-boxes" as const;

export type MathAnimationRuntimeNodeFrame = {
  boundingBox: RuntimeBoundingBox;
  colorRole?: string;
  laggedProgress: number;
  objectId: string;
  pathSummary?: string;
  pathType?: TransformPathSpec["type"];
  progress: number;
  rateFunction: MathRateFunctionName;
  rawProgress: number;
  renderState: RuntimeRenderState;
  uniforms?: RuntimeMobjectUniforms;
};

export type MathAnimationRuntimeFrame = {
  active: boolean;
  activePlanIds: string[];
  nodeFrames: MathAnimationRuntimeNodeFrame[];
  objectId?: string;
  progress: number;
  targetObjectId?: string;
};

export type MathAnimationRuntimeFrameSummary = {
  active: boolean;
  activePlanIds: string[];
  animatedNodeCount: number;
  nodeProgressSummary: string;
  objectId?: string;
  progress: number;
  targetObjectId?: string;
};

export type MathAnimationRuntimeUniformEvidence = {
  clippingPlaneCount: number;
  nodeCount: number;
  objectIds: string;
  opacityRange: string;
  opacitySampleCount: number;
  sourceSummary: string;
  summary: string;
  uniformNodeCount: number;
};

export type MathAnimationRuntimeBoundingBoxEvidence = {
  emptyBoundingBoxCount: number;
  finiteBoundingBoxCount: number;
  nodeCount: number;
  objectIds: string;
  sourceSummary: string;
  summary: string;
};

export type MathAnimationRuntimeInterpolateFieldEvidence = {
  arcPathNodeCount: number;
  boundingBoxNodeCount: number;
  nodeCount: number;
  nonPointFieldCount: number;
  nonPointFieldPolicy: typeof TRANSFORM_PATH_NON_POINT_FIELD_POLICY;
  objectIds: string;
  pathSummary: string;
  pointlikeFieldCount: number;
  pointlikeFieldPolicy: typeof TRANSFORM_PATH_POINTLIKE_FIELD_POLICY;
  pointlikeFieldSummary: string;
  sourceSummary: typeof MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY;
  straightPathNodeCount: number;
  styleNodeCount: number;
  summary: string;
  uniformNodeCount: number;
};

export type MathAnimationRuntimeEvidence = {
  active: boolean;
  activePlanCount: number;
  activePlanIds: string;
  easedProgressRange: string;
  finiteBoundingBoxCount: number;
  laggedProgressRange: string;
  mobjectInterpolateRenderPolicy: typeof MOBJECT_INTERPOLATE_RENDER_POLICY;
  nodeCount: number;
  objectId: string;
  objectIds: string;
  progress: number;
  rateFunctionIds: string;
  rawProgressRange: string;
  renderKindSummary: string;
  sourceContract: typeof ANIMATION_RUNTIME_SOURCE_CONTRACT;
  summary: string;
  targetObjectId: string;
};

type MathAnimationRuntimePlanProgress = {
  plan: MathAnimatePlan;
  progress: number;
  rateFunction: MathRateFunctionName;
  rawProgress: number;
};

type RuntimeBoundingBoxSource = {
  boundingBox: RuntimeBoundingBox;
  renderState: RuntimeRenderState;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function stableNumber(value: number) {
  return Number(finite(value, 0).toFixed(6));
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

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function lastPoint(points: Vec3[], fallback: Vec3): Vec3 {
  return points.at(-1) ?? fallback;
}

function interpolatePointAlongPath(source: Vec3, target: Vec3, progress: number, pathFunction: TransformPathFunction): Vec3 {
  return pathFunction(source, target, progress);
}

function interpolatePointArrays(source: Vec3[], target: Vec3[], progress: number, pathFunction: TransformPathFunction) {
  const count = Math.max(source.length, target.length);
  const fallback: Vec3 = [0, 0, 0];

  return Array.from({ length: count }, (_, index) =>
    interpolatePointAlongPath(
      source[index] ?? lastPoint(source, fallback),
      target[index] ?? lastPoint(target, fallback),
      progress,
      pathFunction
    )
  );
}

function interpolatePolylinePoints(source: Vec3[], target: Vec3[], progress: number, pathFunction: TransformPathFunction) {
  if (source.length === target.length) {
    return interpolatePointArrays(source, target, progress, pathFunction);
  }

  const aligned = alignSmoothVMobjectPathsForMorph({
    conceptId: "runtime-transform",
    sourceId: "source-polyline",
    sourcePoints: source,
    targetId: "target-polyline",
    targetPoints: target
  });

  return aligned.source.map((point, index) =>
    interpolatePointAlongPath(point, aligned.target[index], progress, pathFunction)
  );
}

function interpolateStyle(
  source: VMobjectStyle | undefined,
  target: VMobjectStyle | undefined,
  progress: number
): VMobjectStyle | undefined {
  if (!source && !target) return undefined;
  if (source && target) return interpolateVMobjectStyle(source, target, progress);
  return progress >= 1 ? target ?? source : source ?? target;
}

function interpolateNestedPointArrays(source: Vec3[][], target: Vec3[][], progress: number, pathFunction: TransformPathFunction) {
  const count = Math.max(source.length, target.length);

  return Array.from({ length: count }, (_, index) =>
    interpolatePointArrays(source[index] ?? [], target[index] ?? [], progress, pathFunction)
  );
}

function surfaceForGrid(id: string, rows: Vec3[][]) {
  return buildSurfaceObjectFromGrid({
    colorRole: "surface",
    conceptId: "runtime-transform",
    id,
    samples: rows,
    uRange: [0, 1],
    vRange: [0, 1]
  });
}

function transposeGrid(rows: Vec3[][]) {
  const columns = Math.max(0, ...rows.map((row) => row.length));

  return Array.from({ length: columns }, (_, column) =>
    rows.map((row) => row[column]).filter((point): point is Vec3 => Boolean(point))
  );
}

function interpolateAlignedSurfaceRows(
  source: Extract<RuntimeRenderState, { kind: "surface" }>,
  target: Extract<RuntimeRenderState, { kind: "surface" }>,
  progress: number,
  pathFunction: TransformPathFunction
) {
  const aligned = alignSurfaceSamplesForMorph(
    surfaceForGrid("source-surface", source.wireframeRows),
    surfaceForGrid("target-surface", target.wireframeRows),
    Math.max(source.rows, source.columns, target.rows, target.columns)
  );

  return aligned.source.map((row, rowIndex) =>
    row.map((point, columnIndex) =>
      interpolatePointAlongPath(point, aligned.target[rowIndex][columnIndex], progress, pathFunction)
    )
  );
}

function boundingBox(renderState: RuntimeRenderState): RuntimeBoundingBox {
  const points = pointsForRuntimeRenderState(renderState).filter((point) => point.every(Number.isFinite));
  if (points.length === 0) return { kind: "empty" };

  const min: Vec3 = [...points[0]];
  const max: Vec3 = [...points[0]];

  points.forEach((point) => {
    min[0] = Math.min(min[0], point[0]);
    min[1] = Math.min(min[1], point[1]);
    min[2] = Math.min(min[2], point[2]);
    max[0] = Math.max(max[0], point[0]);
    max[1] = Math.max(max[1], point[1]);
    max[2] = Math.max(max[2], point[2]);
  });

  return {
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    kind: "finite",
    max,
    min
  };
}

function interpolateBoundingBox(
  source: RuntimeBoundingBox,
  target: RuntimeBoundingBox,
  progress: number
): RuntimeBoundingBox {
  if (source.kind !== "finite" || target.kind !== "finite") return { kind: "empty" };

  return {
    center: [
      lerp(source.center[0], target.center[0], progress),
      lerp(source.center[1], target.center[1], progress),
      lerp(source.center[2], target.center[2], progress)
    ],
    kind: "finite",
    max: [
      lerp(source.max[0], target.max[0], progress),
      lerp(source.max[1], target.max[1], progress),
      lerp(source.max[2], target.max[2], progress)
    ],
    min: [
      lerp(source.min[0], target.min[0], progress),
      lerp(source.min[1], target.min[1], progress),
      lerp(source.min[2], target.min[2], progress)
    ]
  };
}

function effectiveRuntimeBoundingBox(node: RuntimeBoundingBoxSource): RuntimeBoundingBox {
  const renderStateBox = boundingBox(node.renderState);
  return renderStateBox.kind === "finite" ? renderStateBox : node.boundingBox;
}

function runtimeFrameBoundingBox(
  source: RuntimeBoundingBoxSource,
  target: RuntimeBoundingBoxSource,
  renderState: RuntimeRenderState,
  progress: number
): RuntimeBoundingBox {
  const renderStateBox = boundingBox(renderState);
  if (renderStateBox.kind === "finite") return renderStateBox;

  return interpolateBoundingBox(effectiveRuntimeBoundingBox(source), effectiveRuntimeBoundingBox(target), progress);
}

function interpolateRenderState(
  source: RuntimeRenderState,
  target: RuntimeRenderState,
  progress: number,
  pathFunction: TransformPathFunction
): RuntimeRenderState {
  if (source.kind === "point" && target.kind === "point") {
    return { kind: "point", position: interpolatePointAlongPath(source.position, target.position, progress, pathFunction) };
  }

  if (source.kind === "polyline" && target.kind === "polyline") {
    const style = interpolateStyle(source.style, target.style, progress);

    return {
      kind: "polyline",
      points: interpolatePolylinePoints(source.points, target.points, progress, pathFunction),
      ...(style ? { style } : {})
    };
  }

  if (source.kind === "vector" && target.kind === "vector") {
    const style = interpolateStyle(source.style, target.style, progress);

    return {
      from: interpolatePointAlongPath(source.from, target.from, progress, pathFunction),
      kind: "vector",
      ...(style ? { style } : {}),
      to: interpolatePointAlongPath(source.to, target.to, progress, pathFunction)
    };
  }

  if (source.kind === "surface" && target.kind === "surface") {
    const shouldAlignGrid = source.rows !== target.rows || source.columns !== target.columns;
    const wireframeRows = shouldAlignGrid
      ? interpolateAlignedSurfaceRows(source, target, progress, pathFunction)
      : interpolateNestedPointArrays(source.wireframeRows, target.wireframeRows, progress, pathFunction);
    const wireframeColumns = shouldAlignGrid
      ? transposeGrid(wireframeRows)
      : interpolateNestedPointArrays(source.wireframeColumns, target.wireframeColumns, progress, pathFunction);
    const style = interpolateStyle(source.style, target.style, progress);

    return {
      columns: wireframeRows[0]?.length ?? target.columns,
      kind: "surface",
      points: wireframeRows.flat(),
      rows: wireframeRows.length,
      ...(style ? { style } : {}),
      wireframeColumns,
      wireframeRows
    };
  }

  return progress >= 1 ? target : source;
}

function laggedProgress(progress: number, index: number, count: number, lagRatio: number) {
  if (count <= 1) return clamp01(progress);

  const alpha = clamp01(progress);
  const lag = Math.min(0.99, clamp01(lagRatio));
  const start = (index * lag) / Math.max(1, count - 1);
  const duration = 1 - lag;

  return clamp01((alpha - start) / duration);
}

function summarizeNodeProgress(nodeFrames: MathAnimationRuntimeNodeFrame[]) {
  return nodeFrames
    .map(
      (nodeFrame) =>
        `${nodeFrame.objectId}:raw=${nodeFrame.rawProgress.toFixed(3)}/lag=${nodeFrame.laggedProgress.toFixed(3)}/eased=${nodeFrame.progress.toFixed(3)}/rate=${nodeFrame.rateFunction}`
    )
    .join("|") || "none";
}

function summarizeRuntimeIds(ids: string[]) {
  return Array.from(new Set(ids)).sort().join(",") || "none";
}

function formatUniformEvidenceNumber(value: number) {
  return finite(value, 0).toFixed(3);
}

function progressRange(values: number[]) {
  if (values.length === 0) return "none";

  const finiteValues = values.map((value) => finite(value, 0));
  return `${formatUniformEvidenceNumber(Math.min(...finiteValues))}..${formatUniformEvidenceNumber(Math.max(...finiteValues))}`;
}

function hasRenderStyle(renderState: RuntimeRenderState) {
  return "style" in renderState && Boolean(renderState.style);
}

function pathTypeForNodeFrame(nodeFrame: MathAnimationRuntimeNodeFrame): TransformPathSpec["type"] {
  return nodeFrame.pathType === "arc" ? "arc" : "straight";
}

function pathSummaryForNodeFrame(nodeFrame: MathAnimationRuntimeNodeFrame) {
  return nodeFrame.pathSummary || "straight";
}

function countedSummary(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => `${value}:${counts.get(value) ?? 0}`)
    .join(",") || "none";
}

function pointlikeFieldSummary(nodeFrames: MathAnimationRuntimeNodeFrame[]) {
  const counts = new Map<string, { nodes: number; points: number }>();

  for (const nodeFrame of nodeFrames) {
    const kind = nodeFrame.renderState.kind;
    const current = counts.get(kind) ?? { nodes: 0, points: 0 };
    current.nodes += 1;
    current.points += pointsForRuntimeRenderState(nodeFrame.renderState).length;
    counts.set(kind, current);
  }

  return [...counts.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((kind) => {
      const count = counts.get(kind) ?? { nodes: 0, points: 0 };
      return `${kind}=${count.nodes}/${count.points}`;
    })
    .join(";") || "none";
}

function summarizeRenderKinds(frame: MathAnimationRuntimeFrame) {
  const counts = frame.nodeFrames.reduce<Record<string, number>>((accumulator, nodeFrame) => {
    accumulator[nodeFrame.renderState.kind] = (accumulator[nodeFrame.renderState.kind] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.keys(counts)
    .sort((left, right) => left.localeCompare(right))
    .map((kind) => `${kind}=${counts[kind]}`)
    .join(";") || "none";
}

export function buildMathAnimationRuntimeInterpolateFieldEvidence(
  frame: MathAnimationRuntimeFrame
): MathAnimationRuntimeInterpolateFieldEvidence {
  const nodeCount = frame.nodeFrames.length;
  const pointlikeFieldCount = frame.nodeFrames.reduce(
    (total, nodeFrame) => total + pointsForRuntimeRenderState(nodeFrame.renderState).length,
    0
  );
  const styleNodeCount = frame.nodeFrames.filter((nodeFrame) => hasRenderStyle(nodeFrame.renderState)).length;
  const uniformNodeCount = frame.nodeFrames.filter((nodeFrame) => nodeFrame.uniforms).length;
  const boundingBoxNodeCount = nodeCount;
  const nonPointFieldCount = styleNodeCount + uniformNodeCount + boundingBoxNodeCount;
  const arcPathNodeCount = frame.nodeFrames.filter((nodeFrame) => pathTypeForNodeFrame(nodeFrame) === "arc").length;
  const straightPathNodeCount = nodeCount - arcPathNodeCount;
  const objectIds = summarizeRuntimeIds(frame.nodeFrames.map((nodeFrame) => nodeFrame.objectId));
  const pathSummary = countedSummary(frame.nodeFrames.map(pathSummaryForNodeFrame));
  const fieldSummary = pointlikeFieldSummary(frame.nodeFrames);
  const summary = [
    `transform-interpolate-fields:nodes=${nodeCount}`,
    `pointlike=${pointlikeFieldCount}`,
    `nonPoint=${nonPointFieldCount}`,
    `style=${styleNodeCount}`,
    `uniforms=${uniformNodeCount}`,
    `bounds=${boundingBoxNodeCount}`,
    `paths=${pathSummary}`,
    `kinds=${fieldSummary}`
  ].join(":");

  return {
    arcPathNodeCount,
    boundingBoxNodeCount,
    nodeCount,
    nonPointFieldCount,
    nonPointFieldPolicy: TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
    objectIds,
    pathSummary,
    pointlikeFieldCount,
    pointlikeFieldPolicy: TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
    pointlikeFieldSummary: fieldSummary,
    sourceSummary: MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY,
    straightPathNodeCount,
    styleNodeCount,
    summary,
    uniformNodeCount
  };
}

export function buildMathAnimationRuntimeUniformEvidence(
  frame: MathAnimationRuntimeFrame
): MathAnimationRuntimeUniformEvidence {
  const uniformFrames = frame.nodeFrames.filter((nodeFrame) => nodeFrame.uniforms);
  const opacities = uniformFrames
    .map((nodeFrame) => nodeFrame.uniforms?.opacity)
    .filter((opacity): opacity is number => typeof opacity === "number" && Number.isFinite(opacity));
  const clippingPlaneCount = uniformFrames.reduce(
    (total, nodeFrame) => total + (nodeFrame.uniforms?.clippingPlanes.length ?? 0),
    0
  );
  const objectIds = summarizeRuntimeIds(uniformFrames.map((nodeFrame) => nodeFrame.objectId));
  const opacityRange = opacities.length > 0
    ? `${formatUniformEvidenceNumber(Math.min(...opacities))}..${formatUniformEvidenceNumber(Math.max(...opacities))}`
    : "none";
  const summary = [
    `transform-interpolate-uniforms:nodes=${frame.nodeFrames.length}`,
    `uniforms=${uniformFrames.length}`,
    `opacitySamples=${opacities.length}`,
    `clipPlanes=${clippingPlaneCount}`,
    `opacityRange=${opacityRange}`,
    `ids=${objectIds}`
  ].join(":");

  return {
    clippingPlaneCount,
    nodeCount: frame.nodeFrames.length,
    objectIds,
    opacityRange,
    opacitySampleCount: opacities.length,
    sourceSummary: MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY,
    summary,
    uniformNodeCount: uniformFrames.length
  };
}

export function buildMathAnimationRuntimeBoundingBoxEvidence(
  frame: MathAnimationRuntimeFrame
): MathAnimationRuntimeBoundingBoxEvidence {
  const nodeCount = frame.nodeFrames.length;
  const finiteBoundingBoxCount = frame.nodeFrames.filter((nodeFrame) => nodeFrame.boundingBox.kind === "finite").length;
  const emptyBoundingBoxCount = nodeCount - finiteBoundingBoxCount;
  const objectIds = summarizeRuntimeIds(frame.nodeFrames.map((nodeFrame) => nodeFrame.objectId));
  const summary = [
    `transform-interpolate-bounds:nodes=${nodeCount}`,
    `finite=${finiteBoundingBoxCount}`,
    `empty=${emptyBoundingBoxCount}`,
    `ids=${objectIds}`
  ].join(":");

  return {
    emptyBoundingBoxCount,
    finiteBoundingBoxCount,
    nodeCount,
    objectIds,
    sourceSummary: MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY,
    summary
  };
}

export function buildMathAnimationRuntimeEvidence(frame: MathAnimationRuntimeFrame): MathAnimationRuntimeEvidence {
  const activePlanIds = summarizeRuntimeIds(frame.activePlanIds);
  const objectIds = summarizeRuntimeIds(frame.nodeFrames.map((nodeFrame) => nodeFrame.objectId));
  const rawProgressRange = progressRange(frame.nodeFrames.map((nodeFrame) => nodeFrame.rawProgress));
  const laggedProgressRange = progressRange(frame.nodeFrames.map((nodeFrame) => nodeFrame.laggedProgress));
  const easedProgressRange = progressRange(frame.nodeFrames.map((nodeFrame) => nodeFrame.progress));
  const rateFunctionIds = summarizeRuntimeIds(frame.nodeFrames.map((nodeFrame) => nodeFrame.rateFunction));
  const renderKindSummary = summarizeRenderKinds(frame);
  const finiteBoundingBoxCount = frame.nodeFrames.filter((nodeFrame) => nodeFrame.boundingBox.kind === "finite").length;
  const summary = [
    `animationRuntime:active=${frame.active ? "true" : "false"}`,
    `plans=${frame.activePlanIds.length}`,
    `nodes=${frame.nodeFrames.length}`,
    `kinds=${renderKindSummary}`,
    `raw=${rawProgressRange}`,
    `lagged=${laggedProgressRange}`,
    `eased=${easedProgressRange}`,
    `rates=${rateFunctionIds}`
  ].join(":");

  return {
    active: frame.active,
    activePlanCount: frame.activePlanIds.length,
    activePlanIds,
    easedProgressRange,
    finiteBoundingBoxCount,
    laggedProgressRange,
    mobjectInterpolateRenderPolicy: MOBJECT_INTERPOLATE_RENDER_POLICY,
    nodeCount: frame.nodeFrames.length,
    objectId: frame.objectId ?? "none",
    objectIds,
    progress: frame.progress,
    rateFunctionIds,
    rawProgressRange,
    renderKindSummary,
    sourceContract: ANIMATION_RUNTIME_SOURCE_CONTRACT,
    summary,
    targetObjectId: frame.targetObjectId ?? "none"
  };
}

export function animationRuntimeEvidenceDataAttributes(evidence: MathAnimationRuntimeEvidence): Record<string, string> {
  return {
    "data-viz-manim-animation-runtime-active": evidence.active ? "true" : "false",
    "data-viz-manim-animation-runtime-active-plan-count": String(evidence.activePlanCount),
    "data-viz-manim-animation-runtime-active-plan-ids": evidence.activePlanIds,
    "data-viz-manim-animation-runtime-eased-progress-range": evidence.easedProgressRange,
    "data-viz-manim-animation-runtime-finite-bounding-box-count": String(evidence.finiteBoundingBoxCount),
    "data-viz-manim-animation-runtime-lagged-progress-range": evidence.laggedProgressRange,
    "data-viz-manim-animation-runtime-mobject-interpolate-policy": evidence.mobjectInterpolateRenderPolicy,
    "data-viz-manim-animation-runtime-node-count": String(evidence.nodeCount),
    "data-viz-manim-animation-runtime-object-id": evidence.objectId,
    "data-viz-manim-animation-runtime-object-ids": evidence.objectIds,
    "data-viz-manim-animation-runtime-progress": formatUniformEvidenceNumber(evidence.progress),
    "data-viz-manim-animation-runtime-rate-functions": evidence.rateFunctionIds,
    "data-viz-manim-animation-runtime-raw-progress-range": evidence.rawProgressRange,
    "data-viz-manim-animation-runtime-render-kind-summary": evidence.renderKindSummary,
    "data-viz-manim-animation-runtime-source-contract": evidence.sourceContract,
    "data-viz-manim-animation-runtime-summary": evidence.summary,
    "data-viz-manim-animation-runtime-target-object-id": evidence.targetObjectId
  };
}

export function transformInterpolateFieldEvidenceDataAttributes(
  evidence: MathAnimationRuntimeInterpolateFieldEvidence
): Record<string, string> {
  return {
    "data-viz-manim-transform-interpolate-field-arc-path-node-count": String(evidence.arcPathNodeCount),
    "data-viz-manim-transform-interpolate-field-bounding-box-node-count": String(evidence.boundingBoxNodeCount),
    "data-viz-manim-transform-interpolate-field-node-count": String(evidence.nodeCount),
    "data-viz-manim-transform-interpolate-field-non-point-count": String(evidence.nonPointFieldCount),
    "data-viz-manim-transform-interpolate-field-non-point-policy": evidence.nonPointFieldPolicy,
    "data-viz-manim-transform-interpolate-field-object-ids": evidence.objectIds,
    "data-viz-manim-transform-interpolate-field-path-summary": evidence.pathSummary,
    "data-viz-manim-transform-interpolate-field-pointlike-count": String(evidence.pointlikeFieldCount),
    "data-viz-manim-transform-interpolate-field-pointlike-policy": evidence.pointlikeFieldPolicy,
    "data-viz-manim-transform-interpolate-field-pointlike-summary": evidence.pointlikeFieldSummary,
    "data-viz-manim-transform-interpolate-field-source-summary": evidence.sourceSummary,
    "data-viz-manim-transform-interpolate-field-straight-path-node-count": String(evidence.straightPathNodeCount),
    "data-viz-manim-transform-interpolate-field-style-node-count": String(evidence.styleNodeCount),
    "data-viz-manim-transform-interpolate-field-summary": evidence.summary,
    "data-viz-manim-transform-interpolate-field-uniform-node-count": String(evidence.uniformNodeCount)
  };
}

export function serializeMathAnimationRuntimeEvidence(evidence: MathAnimationRuntimeEvidence) {
  return stableSerialize(evidence);
}

export function serializeMathAnimationRuntimeInterpolateFieldEvidence(evidence: MathAnimationRuntimeInterpolateFieldEvidence) {
  return stableSerialize(evidence);
}

export function serializeMathAnimationRuntimeUniformEvidence(evidence: MathAnimationRuntimeUniformEvidence) {
  return stableSerialize(evidence);
}

export function serializeMathAnimationRuntimeBoundingBoxEvidence(evidence: MathAnimationRuntimeBoundingBoxEvidence) {
  return stableSerialize(evidence);
}

function planProgress(plan: MathAnimatePlan, rawProgress: number): MathAnimationRuntimePlanProgress {
  const rateFunction = rateFunctionForStep(plan.step);
  const boundedRawProgress = clamp01(rawProgress);

  return {
    plan,
    progress: applyRateFunction(rateFunction, boundedRawProgress),
    rateFunction,
    rawProgress: boundedRawProgress
  };
}

function progressForPlan(state: MathSceneRuntimeState, plan: MathAnimatePlan): MathAnimationRuntimePlanProgress | undefined {
  const elapsed = state.timeline.elapsedSeconds;
  let elapsedBeforeStep = 0;

  for (const step of state.sourceScene.timeline) {
    const duration = Math.max(0, finite(step.duration, 0));
    const elapsedAfterStep = elapsedBeforeStep + duration;
    const isCompositionStep = step.type === "animationComposition";
    const composition = isCompositionStep
      ? buildSceneAnimationCompositionPlans(state.sourceScene).find((entry) => entry.id === step.compositionId)
      : undefined;
    const compositionIncludesPlan = Boolean(composition?.windows.some((window) => window.animationPlanId === plan.id));

    if (composition && compositionIncludesPlan) {
      if (elapsed < elapsedBeforeStep) return undefined;
      if (elapsed >= elapsedAfterStep) return planProgress(plan, 1);

      const compositionElapsed = composition.durationSeconds * (duration === 0 ? 1 : clamp01((elapsed - elapsedBeforeStep) / duration));
      const frame = sampleAnimationCompositionFrame(composition, compositionElapsed);
      if (frame.completedAnimationPlanIds.includes(plan.id)) return planProgress(plan, 1);
      const activeWindow = frame.activeWindows.find((window) => window.animationPlanId === plan.id);
      if (activeWindow) return planProgress(plan, activeWindow.localProgress);
      return undefined;
    }

    const isPlanStep = step.type === "transformObject" && step.objectId === plan.objectId && step.targetObjectId === plan.targetObjectId;

    if (isPlanStep) {
      if (elapsed < elapsedBeforeStep) return undefined;
      if (elapsed >= elapsedAfterStep) return planProgress(plan, 1);
      return planProgress(plan, duration === 0 ? 1 : (elapsed - elapsedBeforeStep) / duration);
    }

    elapsedBeforeStep = elapsedAfterStep;
  }

  return undefined;
}

export function buildMathAnimationRuntimeFrame(
  state: MathSceneRuntimeState,
  plans: MathAnimatePlan[] = []
): MathAnimationRuntimeFrame {
  const applicablePlans = plans
    .map((plan) => progressForPlan(state, plan))
    .filter((entry): entry is MathAnimationRuntimePlanProgress => entry !== undefined);

  if (applicablePlans.length === 0) {
    return {
      active: false,
      activePlanIds: [],
      nodeFrames: [],
      progress: 1
    };
  }

  const nodeFrames = applicablePlans.flatMap(({ plan, rateFunction, rawProgress }) => {
    const familyIds = plan.target.familyIds;
    const pathFunction = resolveTransformPathFunction(plan.step.path);
    const pathSummary = summarizeTransformPathSpec(plan.step.path);
    const pathType: TransformPathSpec["type"] = plan.step.path?.type === "arc" ? "arc" : "straight";
    return familyIds.flatMap((objectId, index) => {
      const source = state.objectGraph.byId[objectId];
      const target = plan.target.nodes[objectId];
      if (!source || !target) return [];

      const nodeRawProgress = stableNumber(rawProgress);
      const nodeLaggedProgress = stableNumber(laggedProgress(rawProgress, index, familyIds.length, plan.step.lagRatio ?? 0));
      const nodeProgress = stableNumber(applyRateFunction(rateFunction, nodeLaggedProgress));
      const renderState = interpolateRenderState(source.renderState, target.renderState, nodeProgress, pathFunction);

      return [{
        boundingBox: runtimeFrameBoundingBox(source, target, renderState, nodeProgress),
        colorRole: nodeProgress >= 1 ? target.colorRole : source.colorRole,
        laggedProgress: nodeLaggedProgress,
        objectId,
        pathSummary,
        pathType,
        progress: nodeProgress,
        rateFunction,
        rawProgress: nodeRawProgress,
        renderState,
        uniforms: interpolateMobjectUniforms(source.uniforms, target.uniforms, nodeProgress)
      }];
    });
  });
  const currentPlan = applicablePlans.at(-1);

  return {
    active: true,
    activePlanIds: applicablePlans.map(({ plan }) => plan.id),
    nodeFrames,
    objectId: currentPlan?.plan.objectId,
    progress: currentPlan?.progress ?? 1,
    targetObjectId: currentPlan?.plan.targetObjectId
  };
}

export function applyMathAnimatePlans(
  state: MathSceneRuntimeState,
  plans: MathAnimatePlan[] = []
): MathSceneRuntimeState {
  const frame = buildMathAnimationRuntimeFrame(state, plans);

  if (!frame.active) return state;

  const byId = { ...state.objectGraph.byId };

  frame.nodeFrames.forEach((nodeFrame) => {
    const source = byId[nodeFrame.objectId];
    if (!source) return;

    byId[nodeFrame.objectId] = {
      ...source,
      boundingBox: nodeFrame.boundingBox,
      colorRole: nodeFrame.colorRole,
      renderState: nodeFrame.renderState,
      uniforms: nodeFrame.uniforms
    };
  });

  return rebuildMathSceneRuntimeGraphState({
    ...state,
    objectGraph: {
      ...state.objectGraph,
      byId
    }
  });
}

export function summarizeMathAnimationRuntimeFrame(
  frame: MathAnimationRuntimeFrame
): MathAnimationRuntimeFrameSummary {
  return {
    active: frame.active,
    activePlanIds: frame.activePlanIds,
    animatedNodeCount: frame.nodeFrames.length,
    nodeProgressSummary: summarizeNodeProgress(frame.nodeFrames),
    objectId: frame.objectId,
    progress: frame.progress,
    targetObjectId: frame.targetObjectId
  };
}
