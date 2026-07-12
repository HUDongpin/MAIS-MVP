import { buildAlwaysRedrawDependencyState, evaluateAlwaysRedrawScalarExpression } from "./mathAlwaysRedraw";
import {
  buildMobjectToCornerLayoutPlan,
  buildMobjectToEdgeLayoutPlan,
  type MathMobjectToCornerLayoutPlan,
  type MathMobjectToEdgeLayoutPlan
} from "./mathMobjectLayout";
import { normalizeMobjectUniforms } from "./mathMobjectUniforms";
import { mapRuntimeRenderState, pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { MathObjectGraph, MathSceneRuntimeState, RuntimeBoundingBox, RuntimeMathObjectNode, RuntimeRenderState } from "./mathSceneRuntimeState";
import type { MathSceneAlwaysRedrawScalarExpressionSpec, MathSceneAlwaysMethodUpdaterSpec, MathSceneSpec, Vec3 } from "./mathSceneTypes";
import type { MathTrackerRegistry } from "./mathValueTracker";
import { buildVMobjectStyle, summarizeVMobjectStyle, type VMobjectStyle, type VMobjectStyleInput } from "./mathVMobjectStyle";

export const ALWAYS_METHOD_UPDATER_SOURCE_CONTRACT =
  "Manim always(mobject.method, ...): method relationship is re-evaluated after frame/object updaters";

export type ApplyAlwaysMethodUpdaterInput = {
  elapsedSeconds?: number;
  graph: Record<string, RuntimeMathObjectNode>;
  object: RuntimeMathObjectNode;
  trackers?: MathTrackerRegistry;
  updater: MathSceneAlwaysMethodUpdaterSpec;
};

export type AlwaysMethodUpdaterEvidence = {
  boundingBoxSummary: string;
  buffSummary: string;
  directionSummary: string;
  dynamicBuffCount: number;
  maxPlacementError: number;
  missingObjectCount: number;
  missingTargetCount: number;
  objectIds: string;
  operationTypes: string;
  placedCount: number;
  placementSummary: string;
  sourceContract: typeof ALWAYS_METHOD_UPDATER_SOURCE_CONTRACT;
  summary: string;
  targetObjectIds: string;
  updaterCount: number;
  updaterIds: string;
};

function finite(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function cleanVec3(vector: Vec3 | undefined, fallback: Vec3 = [0, 0, 0]): Vec3 {
  return [
    finite(vector?.[0], fallback[0]),
    finite(vector?.[1], fallback[1]),
    finite(vector?.[2], fallback[2])
  ];
}

function addVec3(point: Vec3, vector: Vec3): Vec3 {
  return [point[0] + vector[0], point[1] + vector[1], point[2] + vector[2]];
}

function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function multiplyVec3(vector: Vec3, factor: number): Vec3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

function scaleVec3(point: Vec3, factor: number, aboutPoint: Vec3): Vec3 {
  const alpha = finite(factor, 1);
  return [
    aboutPoint[0] + (point[0] - aboutPoint[0]) * alpha,
    aboutPoint[1] + (point[1] - aboutPoint[1]) * alpha,
    aboutPoint[2] + (point[2] - aboutPoint[2]) * alpha
  ];
}

function stretchVec3(point: Vec3, factor: number, dim: "x" | "y" | "z", aboutPoint: Vec3): Vec3 {
  const alpha = finite(factor, 1);
  const stretched: Vec3 = [...point];
  const index = dim === "z" ? 2 : dim === "y" ? 1 : 0;
  stretched[index] = aboutPoint[index] + (point[index] - aboutPoint[index]) * alpha;
  return stretched;
}

function scaleVec3ByAxis(point: Vec3, factor: Vec3, aboutPoint: Vec3): Vec3 {
  return [
    aboutPoint[0] + (point[0] - aboutPoint[0]) * factor[0],
    aboutPoint[1] + (point[1] - aboutPoint[1]) * factor[1],
    aboutPoint[2] + (point[2] - aboutPoint[2]) * factor[2]
  ];
}

function rotateVec3(point: Vec3, angleRadians: number, axis: "x" | "y" | "z", aboutPoint: Vec3): Vec3 {
  const angle = finite(angleRadians, 0);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point[0] - aboutPoint[0];
  const dy = point[1] - aboutPoint[1];
  const dz = point[2] - aboutPoint[2];

  if (axis === "x") {
    return [aboutPoint[0] + dx, aboutPoint[1] + dy * cos - dz * sin, aboutPoint[2] + dy * sin + dz * cos];
  }

  if (axis === "y") {
    return [aboutPoint[0] + dx * cos + dz * sin, aboutPoint[1] + dy, aboutPoint[2] - dx * sin + dz * cos];
  }

  return [aboutPoint[0] + dx * cos - dy * sin, aboutPoint[1] + dx * sin + dy * cos, aboutPoint[2] + dz];
}

function dotVec3(left: Vec3, right: Vec3) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function distanceVec3(left: Vec3, right: Vec3) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function expressionTrackerIds(expression: MathSceneAlwaysRedrawScalarExpressionSpec | undefined): string[] {
  if (!expression) return [];
  if (expression.type === "tracker") return [expression.trackerId];
  if (expression.type === "add") return uniqueStrings(expression.terms.flatMap(expressionTrackerIds));
  if (expression.type === "max" || expression.type === "min") return uniqueStrings(expression.terms.flatMap(expressionTrackerIds));
  if (expression.type === "multiply") return uniqueStrings(expression.factors.flatMap(expressionTrackerIds));
  if (expression.type === "sin" || expression.type === "log") return expressionTrackerIds(expression.value);
  return [];
}

function pointExpressionTrackerIds(
  pointExpression:
    | Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "moveTo" }>["pointExpression"]
    | Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "shift" }>["vectorExpression"]
): string[] {
  if (!pointExpression) return [];

  return uniqueStrings([
    ...expressionTrackerIds(pointExpression.x),
    ...expressionTrackerIds(pointExpression.y),
    ...expressionTrackerIds(pointExpression.z)
  ]);
}

function normalizeDirection(direction: Vec3 | undefined): Vec3 {
  const cleanDirection = cleanVec3(direction ?? [1, 0, 0], [1, 0, 0]);
  const length = Math.hypot(cleanDirection[0], cleanDirection[1], cleanDirection[2]);

  if (length <= 0) return [1, 0, 0];
  return [cleanDirection[0] / length, cleanDirection[1] / length, cleanDirection[2] / length];
}

function normalizeAlignmentDirection(direction: Vec3 | undefined): Vec3 {
  const cleanDirection = cleanVec3(direction ?? [1, 0, 0], [1, 0, 0]);
  const aligned: Vec3 = [
    cleanDirection[0] === 0 ? 0 : Math.sign(cleanDirection[0]),
    cleanDirection[1] === 0 ? 0 : Math.sign(cleanDirection[1]),
    cleanDirection[2] === 0 ? 0 : Math.sign(cleanDirection[2])
  ];

  return aligned.some((value) => value !== 0) ? aligned : [1, 0, 0];
}

function oppositeDirection(direction: Vec3): Vec3 {
  return [-direction[0], -direction[1], -direction[2]];
}

function isCoordinateMatchOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "matchX" | "matchY" | "matchZ" }> {
  return operation.type === "matchX" || operation.type === "matchY" || operation.type === "matchZ";
}

function isCoordinateSetterOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setX" | "setY" | "setZ" }> {
  return operation.type === "setX" || operation.type === "setY" || operation.type === "setZ";
}

function isOpacitySetterOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setOpacity" }> {
  return operation.type === "setOpacity";
}

function isStrokeSetterOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setStroke" }> {
  return operation.type === "setStroke";
}

function isFillSetterOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setFill" }> {
  return operation.type === "setFill";
}

function isStyleSetterOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setStyle" }> {
  return operation.type === "setStyle";
}

function isVMobjectStyleOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setFill" | "setStroke" | "setStyle" }> {
  return isStrokeSetterOperation(operation) || isFillSetterOperation(operation) || isStyleSetterOperation(operation);
}

function isMoveToOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "moveTo" }> {
  return operation.type === "moveTo";
}

function isCenterOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "center" }> {
  return operation.type === "center";
}

function isShiftOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "shift" }> {
  return operation.type === "shift";
}

function isScaleOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "scale" }> {
  return operation.type === "scale";
}

function isStretchOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "stretch" }> {
  return operation.type === "stretch";
}

function isDimensionSetterOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setDepth" | "setHeight" | "setWidth" }> {
  return operation.type === "setDepth" || operation.type === "setHeight" || operation.type === "setWidth";
}

function isDimensionMatchOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "matchDepth" | "matchHeight" | "matchWidth" }> {
  return operation.type === "matchDepth" || operation.type === "matchHeight" || operation.type === "matchWidth";
}

function isRotateOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "rotate" }> {
  return operation.type === "rotate";
}

function isFrameLayoutOperation(
  operation: MathSceneAlwaysMethodUpdaterSpec["operation"]
): operation is Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "toCorner" | "toEdge" }> {
  return operation.type === "toCorner" || operation.type === "toEdge";
}

function coordinateAxisDirection(operationType: "matchX" | "matchY" | "matchZ" | "setX" | "setY" | "setZ"): Vec3 {
  if (operationType === "matchY" || operationType === "setY") return [0, 1, 0];
  if (operationType === "matchZ" || operationType === "setZ") return [0, 0, 1];
  return [1, 0, 0];
}

function rotationAxisDirection(axis: "x" | "y" | "z" | undefined): Vec3 {
  if (axis === "x") return [1, 0, 0];
  if (axis === "y") return [0, 1, 0];
  return [0, 0, 1];
}

function stretchDimensionDirection(dim: "x" | "y" | "z"): Vec3 {
  if (dim === "y") return [0, 1, 0];
  if (dim === "z") return [0, 0, 1];
  return [1, 0, 0];
}

function dimensionSetterDirection(operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setDepth" | "setHeight" | "setWidth" }>): Vec3 {
  if (operation.type === "setHeight") return [0, 1, 0];
  if (operation.type === "setDepth") return [0, 0, 1];
  return [1, 0, 0];
}

function dimensionMatcherDirection(operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "matchDepth" | "matchHeight" | "matchWidth" }>): Vec3 {
  if (operation.type === "matchHeight") return [0, 1, 0];
  if (operation.type === "matchDepth") return [0, 0, 1];
  return [1, 0, 0];
}

function operationDirection(operation: MathSceneAlwaysMethodUpdaterSpec["operation"]): Vec3 {
  if (operation.type === "alignTo") return normalizeAlignmentDirection(operation.direction);
  if (isCenterOperation(operation)) return [1, 1, 1];
  if (isMoveToOperation(operation)) return [1, 1, 1];
  if (isOpacitySetterOperation(operation)) return [1, 1, 1];
  if (isVMobjectStyleOperation(operation)) return [1, 1, 1];
  if (operation.type === "nextTo") return normalizeDirection(operation.direction);
  if (isShiftOperation(operation)) return cleanVec3(operation.vector, [0, 0, 0]);
  if (isScaleOperation(operation)) return [1, 1, 1];
  if (isStretchOperation(operation)) return stretchDimensionDirection(operation.dim);
  if (isDimensionSetterOperation(operation)) return dimensionSetterDirection(operation);
  if (isDimensionMatchOperation(operation)) return dimensionMatcherDirection(operation);
  if (isRotateOperation(operation)) return rotationAxisDirection(operation.axis);
  if (operation.type === "toCorner") return cleanVec3(operation.direction, [1, 1, 0]);
  if (operation.type === "toEdge") return normalizeDirection(operation.direction);
  return coordinateAxisDirection(operation.type);
}

function targetObjectIdForOperation(operation: MathSceneAlwaysMethodUpdaterSpec["operation"]) {
  if (
    operation.type === "alignTo" ||
    operation.type === "nextTo" ||
    isCoordinateMatchOperation(operation) ||
    isDimensionMatchOperation(operation)
  ) {
    return operation.targetObjectId;
  }

  return undefined;
}

function renderStatePoints(renderState: RuntimeRenderState): Vec3[] {
  return pointsForRuntimeRenderState(renderState);
}

function specPoints(object: RuntimeMathObjectNode): Vec3[] {
  const spec = object.spec;
  if (spec.type === "axis3d") return renderStatePoints(object.renderState);
  if (spec.type === "movingPoint") return renderStatePoints(object.renderState);
  if (spec.type === "parametricCurve") return spec.samples;
  if (spec.type === "parametricSurface") return spec.samples.flat();
  if (spec.type === "trace") return renderStatePoints(object.renderState);
  if (spec.type === "vector") return [spec.from, spec.to];
  return [];
}

function finitePoints(points: Vec3[]) {
  return points.filter((point) => point.every(Number.isFinite));
}

function boundingBox(points: Vec3[]): RuntimeBoundingBox {
  const pointsForBox = finitePoints(points);
  if (pointsForBox.length === 0) return { kind: "empty" };

  const min: Vec3 = [...pointsForBox[0]];
  const max: Vec3 = [...pointsForBox[0]];

  pointsForBox.forEach((point) => {
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

function boxSize(box: RuntimeBoundingBox): Vec3 {
  if (box.kind !== "finite") return [0, 0, 0];
  return [box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]];
}

function dimensionIndex(dim: "x" | "y" | "z") {
  if (dim === "z") return 2;
  if (dim === "y") return 1;
  return 0;
}

function dimensionScale(targetSize: number, currentSize: number) {
  if (!Number.isFinite(targetSize) || currentSize <= 0) return 1;
  return Math.max(0, targetSize) / currentSize;
}

function dimensionScaleFactor(factor: number, dim: "x" | "y" | "z", stretch: boolean | undefined): Vec3 {
  const cleanFactor = finite(factor, 1);
  if (!stretch) return [cleanFactor, cleanFactor, cleanFactor];

  const scaleFactor: Vec3 = [1, 1, 1];
  scaleFactor[dimensionIndex(dim)] = cleanFactor;
  return scaleFactor;
}

function multiplyVec3ByAxis(vector: Vec3, factor: Vec3): Vec3 {
  return [
    vector[0] * Math.abs(factor[0]),
    vector[1] * Math.abs(factor[1]),
    vector[2] * Math.abs(factor[2])
  ];
}

function stretchBoxSize(size: Vec3, factor: number, dim: "x" | "y" | "z"): Vec3 {
  const stretched: Vec3 = [...size];
  const index = dimensionIndex(dim);
  stretched[index] *= Math.abs(finite(factor, 1));
  return stretched;
}

function criticalPoint(box: RuntimeBoundingBox, direction: Vec3): Vec3 {
  if (box.kind !== "finite") return [0, 0, 0];

  return [
    direction[0] > 0 ? box.max[0] : direction[0] < 0 ? box.min[0] : box.center[0],
    direction[1] > 0 ? box.max[1] : direction[1] < 0 ? box.min[1] : box.center[1],
    direction[2] > 0 ? box.max[2] : direction[2] < 0 ? box.min[2] : box.center[2]
  ];
}

function axisDelta(sourcePoint: Vec3, targetPoint: Vec3, direction: Vec3): Vec3 {
  return [
    direction[0] === 0 ? 0 : finite(targetPoint[0] - sourcePoint[0], 0),
    direction[1] === 0 ? 0 : finite(targetPoint[1] - sourcePoint[1], 0),
    direction[2] === 0 ? 0 : finite(targetPoint[2] - sourcePoint[2], 0)
  ];
}

function coordinateForDirection(point: Vec3, direction: Vec3) {
  if (direction[1] !== 0) return point[1];
  if (direction[2] !== 0) return point[2];
  return point[0];
}

function pointWithCoordinate(point: Vec3, direction: Vec3, coordinate: number): Vec3 {
  return [
    direction[0] === 0 ? point[0] : coordinate,
    direction[1] === 0 ? point[1] : coordinate,
    direction[2] === 0 ? point[2] : coordinate
  ];
}

function mapRenderState(renderState: RuntimeRenderState, mapper: (point: Vec3) => Vec3): RuntimeRenderState {
  return mapRuntimeRenderState(renderState, mapper);
}

function withRenderState(object: RuntimeMathObjectNode, renderState: RuntimeRenderState): RuntimeMathObjectNode {
  return {
    ...object,
    boundingBox: boundingBox(renderStatePoints(renderState)),
    renderState
  };
}

function withVMobjectStyle(object: RuntimeMathObjectNode, style: VMobjectStyle): RuntimeMathObjectNode {
  if (object.renderState.kind !== "polyline" && object.renderState.kind !== "surface" && object.renderState.kind !== "vector") {
    return object;
  }

  return {
    ...object,
    renderState: {
      ...object.renderState,
      style
    }
  };
}

function runtimeGraphFromRecord(graph: Record<string, RuntimeMathObjectNode>, object: RuntimeMathObjectNode): MathObjectGraph {
  const byId = {
    ...graph,
    [object.id]: object
  };

  return {
    byId,
    rootIds: Object.keys(byId).sort((left, right) => left.localeCompare(right))
  };
}

function formatNumber(value: number) {
  return finite(value, 0).toFixed(3);
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

function formatVec3(vector: Vec3) {
  return `[${vector.map(formatNumber).join(",")}]`;
}

function formatVec3List(points: Vec3[]) {
  return `[${points.map(formatVec3).join(";")}]`;
}

function joinOrNone(values: string[]) {
  return values.length > 0 ? values.join(",") : "none";
}

function evaluateNextToBuff(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "nextTo" }>,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number
) {
  const staticBuff = finite(operation.buff, 0.25);
  if (operation.buffExpression === undefined) return Math.max(0, staticBuff);

  const dependencyState = buildAlwaysRedrawDependencyState(trackers, expressionTrackerIds(operation.buffExpression));
  const expressionBuff = evaluateAlwaysRedrawScalarExpression(operation.buffExpression, {
    dependencyState,
    t: finite(elapsedSeconds, 0)
  });

  return Math.max(0, finite(expressionBuff, staticBuff));
}

function frameLayoutBuff(operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "toCorner" | "toEdge" }>) {
  return Math.max(0, finite(operation.buff, 0.5));
}

function evaluateCoordinateSetterValue(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setX" | "setY" | "setZ" }>,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number,
  fallbackCoordinate: number
) {
  const staticCoordinate = finite(operation.coordinate, fallbackCoordinate);
  if (operation.coordinateExpression === undefined) return staticCoordinate;

  const dependencyState = buildAlwaysRedrawDependencyState(trackers, expressionTrackerIds(operation.coordinateExpression));
  const expressionCoordinate = evaluateAlwaysRedrawScalarExpression(operation.coordinateExpression, {
    dependencyState,
    t: finite(elapsedSeconds, 0)
  });

  return finite(expressionCoordinate, staticCoordinate);
}

function evaluateOpacitySetterValue(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setOpacity" }>,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number,
  fallbackOpacity: number
) {
  const staticOpacity = clamp01(finite(operation.opacity, fallbackOpacity));
  if (operation.opacityExpression === undefined) return staticOpacity;

  const dependencyState = buildAlwaysRedrawDependencyState(trackers, expressionTrackerIds(operation.opacityExpression));
  const expressionOpacity = evaluateAlwaysRedrawScalarExpression(operation.opacityExpression, {
    dependencyState,
    t: finite(elapsedSeconds, 0)
  });

  return clamp01(finite(expressionOpacity, staticOpacity));
}

function evaluateScalarExpressionValue(
  expression: MathSceneAlwaysRedrawScalarExpressionSpec | undefined,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number,
  fallbackValue: number
) {
  if (expression === undefined) return fallbackValue;

  const dependencyState = buildAlwaysRedrawDependencyState(trackers, expressionTrackerIds(expression));
  const value = evaluateAlwaysRedrawScalarExpression(expression, {
    dependencyState,
    t: finite(elapsedSeconds, 0)
  });

  return finite(value, fallbackValue);
}

function renderStateVMobjectStyle(renderState: RuntimeRenderState): VMobjectStyle | null {
  if (renderState.kind !== "polyline" && renderState.kind !== "surface" && renderState.kind !== "vector") return null;

  return buildVMobjectStyle(renderState.style);
}

function evaluateVMobjectStylePatch(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setFill" | "setStroke" | "setStyle" }>,
  currentStyle: VMobjectStyle,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number
): VMobjectStyle {
  if (operation.type === "setStroke") {
    return buildVMobjectStyle({
      ...currentStyle,
      strokeOpacity: clamp01(evaluateScalarExpressionValue(
        operation.strokeOpacityExpression,
        trackers,
        elapsedSeconds,
        finite(operation.strokeOpacity, currentStyle.strokeOpacity)
      )),
      strokeRole: operation.strokeRole ?? currentStyle.strokeRole,
      strokeWidth: Math.max(0, evaluateScalarExpressionValue(
        operation.strokeWidthExpression,
        trackers,
        elapsedSeconds,
        finite(operation.strokeWidth, currentStyle.strokeWidth)
      ))
    });
  }

  if (operation.type === "setFill") {
    return buildVMobjectStyle({
      ...currentStyle,
      fillOpacity: clamp01(evaluateScalarExpressionValue(
        operation.fillOpacityExpression,
        trackers,
        elapsedSeconds,
        finite(operation.fillOpacity, currentStyle.fillOpacity)
      )),
      fillRole: operation.fillRole ?? currentStyle.fillRole
    });
  }

  const input: VMobjectStyleInput = {
    antiAliasWidth: operation.antiAliasWidth,
    baseNormal: operation.baseNormal,
    fillOpacity: operation.fillOpacity,
    fillRole: operation.fillRole,
    jointAngleDegrees: operation.jointAngleDegrees,
    strokeOpacity: operation.strokeOpacity,
    strokeRole: operation.strokeRole,
    strokeWidth: operation.strokeWidth,
    strokeZoomBehavior: operation.strokeZoomBehavior
  };

  return buildVMobjectStyle({
    ...currentStyle,
    ...input,
    antiAliasWidth: Math.max(0, evaluateScalarExpressionValue(
      operation.antiAliasWidthExpression,
      trackers,
      elapsedSeconds,
      finite(input.antiAliasWidth, currentStyle.antiAliasWidth)
    )),
    fillOpacity: clamp01(evaluateScalarExpressionValue(
      operation.fillOpacityExpression,
      trackers,
      elapsedSeconds,
      finite(input.fillOpacity, currentStyle.fillOpacity)
    )),
    jointAngleDegrees: evaluateScalarExpressionValue(
      operation.jointAngleDegreesExpression,
      trackers,
      elapsedSeconds,
      finite(input.jointAngleDegrees, currentStyle.jointAngleDegrees)
    ),
    strokeOpacity: clamp01(evaluateScalarExpressionValue(
      operation.strokeOpacityExpression,
      trackers,
      elapsedSeconds,
      finite(input.strokeOpacity, currentStyle.strokeOpacity)
    )),
    strokeWidth: Math.max(0, evaluateScalarExpressionValue(
      operation.strokeWidthExpression,
      trackers,
      elapsedSeconds,
      finite(input.strokeWidth, currentStyle.strokeWidth)
    ))
  });
}

function vmobjectStylePrimaryMetric(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setFill" | "setStroke" | "setStyle" }>,
  style: VMobjectStyle
) {
  if (operation.type === "setFill") return style.fillOpacity;
  return style.strokeWidth;
}

function vmobjectStylePlacementError(observed: VMobjectStyle, expected: VMobjectStyle) {
  return Math.max(
    Math.abs(observed.antiAliasWidth - expected.antiAliasWidth),
    Math.abs(observed.fillOpacity - expected.fillOpacity),
    observed.fillRole === expected.fillRole ? 0 : 1,
    Math.abs(observed.jointAngleDegrees - expected.jointAngleDegrees),
    observed.strokeRole === expected.strokeRole ? 0 : 1,
    Math.abs(observed.strokeOpacity - expected.strokeOpacity),
    Math.abs(observed.strokeWidth - expected.strokeWidth),
    observed.strokeZoomBehavior === expected.strokeZoomBehavior ? 0 : 1,
    distanceVec3(observed.baseNormal, expected.baseNormal)
  );
}

function evaluateMoveToPoint(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "moveTo" }>,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number,
  fallbackPoint: Vec3
): Vec3 {
  const staticPoint = cleanVec3(operation.point, fallbackPoint);
  if (operation.pointExpression === undefined) return staticPoint;

  const dependencyState = buildAlwaysRedrawDependencyState(trackers, pointExpressionTrackerIds(operation.pointExpression));
  const input = {
    dependencyState,
    t: finite(elapsedSeconds, 0)
  };

  return [
    operation.pointExpression.x === undefined
      ? staticPoint[0]
      : finite(evaluateAlwaysRedrawScalarExpression(operation.pointExpression.x, input), staticPoint[0]),
    operation.pointExpression.y === undefined
      ? staticPoint[1]
      : finite(evaluateAlwaysRedrawScalarExpression(operation.pointExpression.y, input), staticPoint[1]),
    operation.pointExpression.z === undefined
      ? staticPoint[2]
      : finite(evaluateAlwaysRedrawScalarExpression(operation.pointExpression.z, input), staticPoint[2])
  ];
}

function evaluateShiftVector(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "shift" }>,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number
): Vec3 {
  const staticVector = cleanVec3(operation.vector, [0, 0, 0]);
  if (operation.vectorExpression === undefined) return staticVector;

  const dependencyState = buildAlwaysRedrawDependencyState(trackers, pointExpressionTrackerIds(operation.vectorExpression));
  const input = {
    dependencyState,
    t: finite(elapsedSeconds, 0)
  };

  return [
    operation.vectorExpression.x === undefined
      ? staticVector[0]
      : finite(evaluateAlwaysRedrawScalarExpression(operation.vectorExpression.x, input), staticVector[0]),
    operation.vectorExpression.y === undefined
      ? staticVector[1]
      : finite(evaluateAlwaysRedrawScalarExpression(operation.vectorExpression.y, input), staticVector[1]),
    operation.vectorExpression.z === undefined
      ? staticVector[2]
      : finite(evaluateAlwaysRedrawScalarExpression(operation.vectorExpression.z, input), staticVector[2])
  ];
}

function evaluateScaleFactor(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "scale" }>,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number
) {
  const staticFactor = finite(operation.factor, 1);
  if (operation.factorExpression === undefined) return staticFactor;

  const dependencyState = buildAlwaysRedrawDependencyState(trackers, expressionTrackerIds(operation.factorExpression));
  const expressionFactor = evaluateAlwaysRedrawScalarExpression(operation.factorExpression, {
    dependencyState,
    t: finite(elapsedSeconds, 0)
  });

  return finite(expressionFactor, staticFactor);
}

function evaluateStretchFactor(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "stretch" }>,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number
) {
  const staticFactor = finite(operation.factor, 1);
  if (operation.factorExpression === undefined) return staticFactor;

  const dependencyState = buildAlwaysRedrawDependencyState(trackers, expressionTrackerIds(operation.factorExpression));
  const expressionFactor = evaluateAlwaysRedrawScalarExpression(operation.factorExpression, {
    dependencyState,
    t: finite(elapsedSeconds, 0)
  });

  return finite(expressionFactor, staticFactor);
}

function dimensionSetterDim(operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setDepth" | "setHeight" | "setWidth" }>): "x" | "y" | "z" {
  if (operation.type === "setHeight") return "y";
  if (operation.type === "setDepth") return "z";
  return "x";
}

function dimensionMatcherDim(operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "matchDepth" | "matchHeight" | "matchWidth" }>): "x" | "y" | "z" {
  if (operation.type === "matchHeight") return "y";
  if (operation.type === "matchDepth") return "z";
  return "x";
}

function dimensionSetterStaticSize(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setDepth" | "setHeight" | "setWidth" }>,
  fallbackSize: number
) {
  if (operation.type === "setHeight") return finite(operation.height, fallbackSize);
  if (operation.type === "setDepth") return finite(operation.depth, fallbackSize);
  return finite(operation.width, fallbackSize);
}

function dimensionSetterExpression(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setDepth" | "setHeight" | "setWidth" }>
) {
  if (operation.type === "setHeight") return operation.heightExpression;
  if (operation.type === "setDepth") return operation.depthExpression;
  return operation.widthExpression;
}

function vmobjectStyleOperationHasExpression(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setFill" | "setStroke" | "setStyle" }>
) {
  if (operation.type === "setStroke") {
    return operation.strokeOpacityExpression !== undefined || operation.strokeWidthExpression !== undefined;
  }
  if (operation.type === "setFill") return operation.fillOpacityExpression !== undefined;
  return (
    operation.antiAliasWidthExpression !== undefined ||
    operation.fillOpacityExpression !== undefined ||
    operation.jointAngleDegreesExpression !== undefined ||
    operation.strokeOpacityExpression !== undefined ||
    operation.strokeWidthExpression !== undefined
  );
}

function evaluateDimensionSetterSize(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setDepth" | "setHeight" | "setWidth" }>,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number,
  fallbackSize: number
) {
  const staticSize = dimensionSetterStaticSize(operation, fallbackSize);
  const expression = dimensionSetterExpression(operation);
  if (expression === undefined) return staticSize;

  const dependencyState = buildAlwaysRedrawDependencyState(trackers, expressionTrackerIds(expression));
  const expressionSize = evaluateAlwaysRedrawScalarExpression(expression, {
    dependencyState,
    t: finite(elapsedSeconds, 0)
  });

  return Math.max(0, finite(expressionSize, staticSize));
}

function evaluateRotateAngle(
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "rotate" }>,
  trackers: MathTrackerRegistry,
  elapsedSeconds: number
) {
  const staticAngle = finite(operation.angleRadians, 0);
  if (operation.angleExpression === undefined) return staticAngle;

  const dependencyState = buildAlwaysRedrawDependencyState(trackers, expressionTrackerIds(operation.angleExpression));
  const expressionAngle = evaluateAlwaysRedrawScalarExpression(operation.angleExpression, {
    dependencyState,
    t: finite(elapsedSeconds, 0)
  });

  return finite(expressionAngle, staticAngle);
}

function applyNextTo(
  graph: Record<string, RuntimeMathObjectNode>,
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "nextTo" }>,
  trackers: MathTrackerRegistry | undefined,
  elapsedSeconds: number | undefined
) {
  const target = graph[operation.targetObjectId];
  if (!target) return object;

  const direction = normalizeDirection(operation.direction);
  const staticBuff = finite(operation.buff, 0.25);
  const dependencyState = buildAlwaysRedrawDependencyState(trackers ?? { byId: {} }, expressionTrackerIds(operation.buffExpression));
  const expressionBuff = operation.buffExpression === undefined
    ? staticBuff
    : evaluateAlwaysRedrawScalarExpression(operation.buffExpression, {
        dependencyState,
        t: finite(elapsedSeconds, 0)
      });
  const buff = Math.max(0, finite(expressionBuff, staticBuff));
  const sourceBox = boundingBox(renderStatePoints(object.renderState));
  const targetBox = boundingBox(renderStatePoints(target.renderState));
  const sourcePoint = criticalPoint(sourceBox, oppositeDirection(direction));
  const targetPoint = criticalPoint(targetBox, direction);
  const vector = addVec3(subtractVec3(targetPoint, sourcePoint), multiplyVec3(direction, buff));
  const renderState = mapRenderState(object.renderState, (point) => addVec3(point, vector));

  return withRenderState(object, renderState);
}

function applyAlignTo(
  graph: Record<string, RuntimeMathObjectNode>,
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "alignTo" }>
) {
  const target = graph[operation.targetObjectId];
  if (!target) return object;

  const direction = normalizeAlignmentDirection(operation.direction);
  const sourceBox = boundingBox(renderStatePoints(object.renderState));
  const targetBox = boundingBox(renderStatePoints(target.renderState));

  if (sourceBox.kind !== "finite" || targetBox.kind !== "finite") return object;

  const sourcePoint = criticalPoint(sourceBox, direction);
  const targetPoint = criticalPoint(targetBox, direction);
  const vector = axisDelta(sourcePoint, targetPoint, direction);
  const renderState = mapRenderState(object.renderState, (point) => addVec3(point, vector));

  return withRenderState(object, renderState);
}

function applyCoordinateMatch(
  graph: Record<string, RuntimeMathObjectNode>,
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "matchX" | "matchY" | "matchZ" }>
) {
  const target = graph[operation.targetObjectId];
  if (!target) return object;

  const direction = coordinateAxisDirection(operation.type);
  const sourceBox = boundingBox(renderStatePoints(object.renderState));
  const targetBox = boundingBox(renderStatePoints(target.renderState));

  if (sourceBox.kind !== "finite" || targetBox.kind !== "finite") return object;

  const vector = axisDelta(sourceBox.center, targetBox.center, direction);
  const renderState = mapRenderState(object.renderState, (point) => addVec3(point, vector));

  return withRenderState(object, renderState);
}

function applyCoordinateSetter(
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setX" | "setY" | "setZ" }>,
  trackers: MathTrackerRegistry | undefined,
  elapsedSeconds: number | undefined
) {
  const direction = coordinateAxisDirection(operation.type);
  const sourceBox = boundingBox(renderStatePoints(object.renderState));

  if (sourceBox.kind !== "finite") return object;

  const currentCoordinate = coordinateForDirection(sourceBox.center, direction);
  const targetCoordinate = evaluateCoordinateSetterValue(
    operation,
    trackers ?? { byId: {} },
    finite(elapsedSeconds, 0),
    currentCoordinate
  );
  const targetCenter = pointWithCoordinate(sourceBox.center, direction, targetCoordinate);
  const vector = axisDelta(sourceBox.center, targetCenter, direction);
  const renderState = mapRenderState(object.renderState, (point) => addVec3(point, vector));

  return withRenderState(object, renderState);
}

function applySetOpacity(
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setOpacity" }>,
  trackers: MathTrackerRegistry | undefined,
  elapsedSeconds: number | undefined
) {
  const uniforms = normalizeMobjectUniforms(object.uniforms);
  const opacity = evaluateOpacitySetterValue(
    operation,
    trackers ?? { byId: {} },
    finite(elapsedSeconds, 0),
    uniforms.opacity
  );

  return {
    ...object,
    uniforms: {
      ...uniforms,
      opacity
    }
  };
}

function applyVMobjectStyle(
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setFill" | "setStroke" | "setStyle" }>,
  trackers: MathTrackerRegistry | undefined,
  elapsedSeconds: number | undefined
) {
  const currentStyle = renderStateVMobjectStyle(object.renderState);
  if (!currentStyle) return object;

  const style = evaluateVMobjectStylePatch(
    operation,
    currentStyle,
    trackers ?? { byId: {} },
    finite(elapsedSeconds, 0)
  );

  return withVMobjectStyle(object, style);
}

function applyMoveTo(
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "moveTo" }>,
  trackers: MathTrackerRegistry | undefined,
  elapsedSeconds: number | undefined
) {
  const sourceBox = boundingBox(renderStatePoints(object.renderState));

  if (sourceBox.kind !== "finite") return object;

  const targetCenter = evaluateMoveToPoint(
    operation,
    trackers ?? { byId: {} },
    finite(elapsedSeconds, 0),
    sourceBox.center
  );
  const vector = subtractVec3(targetCenter, sourceBox.center);
  const renderState = mapRenderState(object.renderState, (point) => addVec3(point, vector));

  return withRenderState(object, renderState);
}

function applyCenter(object: RuntimeMathObjectNode) {
  const sourceBox = boundingBox(renderStatePoints(object.renderState));

  if (sourceBox.kind !== "finite") return object;

  const vector = subtractVec3([0, 0, 0], sourceBox.center);
  const renderState = mapRenderState(object.renderState, (point) => addVec3(point, vector));

  return withRenderState(object, renderState);
}

function applyShift(
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "shift" }>,
  trackers: MathTrackerRegistry | undefined,
  elapsedSeconds: number | undefined
) {
  const vector = evaluateShiftVector(operation, trackers ?? { byId: {} }, finite(elapsedSeconds, 0));
  const renderState = mapRenderState(object.renderState, (point) => addVec3(point, vector));

  return withRenderState(object, renderState);
}

function applyScale(
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "scale" }>,
  trackers: MathTrackerRegistry | undefined,
  elapsedSeconds: number | undefined
) {
  const sourceBox = boundingBox(renderStatePoints(object.renderState));

  if (sourceBox.kind !== "finite") return object;

  const factor = evaluateScaleFactor(operation, trackers ?? { byId: {} }, finite(elapsedSeconds, 0));
  const aboutPoint = cleanVec3(operation.aboutPoint, sourceBox.center);
  const renderState = mapRenderState(object.renderState, (point) => scaleVec3(point, factor, aboutPoint));

  return withRenderState(object, renderState);
}

function applyStretch(
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "stretch" }>,
  trackers: MathTrackerRegistry | undefined,
  elapsedSeconds: number | undefined
) {
  const sourceBox = boundingBox(renderStatePoints(object.renderState));

  if (sourceBox.kind !== "finite") return object;

  const factor = evaluateStretchFactor(operation, trackers ?? { byId: {} }, finite(elapsedSeconds, 0));
  const aboutPoint = cleanVec3(operation.aboutPoint, sourceBox.center);
  const renderState = mapRenderState(object.renderState, (point) => stretchVec3(point, factor, operation.dim, aboutPoint));

  return withRenderState(object, renderState);
}

function applyDimensionSetter(
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "setDepth" | "setHeight" | "setWidth" }>,
  trackers: MathTrackerRegistry | undefined,
  elapsedSeconds: number | undefined
) {
  const sourceBox = boundingBox(renderStatePoints(object.renderState));

  if (sourceBox.kind !== "finite") return object;

  const dim = dimensionSetterDim(operation);
  const sourceSize = boxSize(sourceBox);
  const currentSize = sourceSize[dimensionIndex(dim)];
  const targetSize = evaluateDimensionSetterSize(
    operation,
    trackers ?? { byId: {} },
    finite(elapsedSeconds, 0),
    currentSize
  );
  const factor = dimensionScale(targetSize, currentSize);
  const scaleFactor = dimensionScaleFactor(factor, dim, operation.stretch);
  const aboutPoint = cleanVec3(operation.aboutPoint, sourceBox.center);
  const renderState = mapRenderState(object.renderState, (point) => scaleVec3ByAxis(point, scaleFactor, aboutPoint));

  return withRenderState(object, renderState);
}

function applyDimensionMatcher(
  graph: Record<string, RuntimeMathObjectNode>,
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "matchDepth" | "matchHeight" | "matchWidth" }>
) {
  const target = graph[operation.targetObjectId];
  if (!target) return object;

  const sourceBox = boundingBox(renderStatePoints(object.renderState));
  const targetBox = boundingBox(renderStatePoints(target.renderState));

  if (sourceBox.kind !== "finite" || targetBox.kind !== "finite") return object;

  const dim = dimensionMatcherDim(operation);
  const sourceSize = boxSize(sourceBox);
  const targetSize = boxSize(targetBox)[dimensionIndex(dim)];
  const currentSize = sourceSize[dimensionIndex(dim)];
  const factor = dimensionScale(targetSize, currentSize);
  const scaleFactor = dimensionScaleFactor(factor, dim, operation.stretch);
  const aboutPoint = cleanVec3(operation.aboutPoint, sourceBox.center);
  const renderState = mapRenderState(object.renderState, (point) => scaleVec3ByAxis(point, scaleFactor, aboutPoint));

  return withRenderState(object, renderState);
}

function applyRotate(
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "rotate" }>,
  trackers: MathTrackerRegistry | undefined,
  elapsedSeconds: number | undefined
) {
  const sourceBox = boundingBox(renderStatePoints(object.renderState));

  if (sourceBox.kind !== "finite") return object;

  const angleRadians = evaluateRotateAngle(operation, trackers ?? { byId: {} }, finite(elapsedSeconds, 0));
  const axis = operation.axis ?? "z";
  const aboutPoint = cleanVec3(operation.aboutPoint, sourceBox.center);
  const renderState = mapRenderState(object.renderState, (point) => rotateVec3(point, angleRadians, axis, aboutPoint));

  return withRenderState(object, renderState);
}

function buildFrameLayoutPlan(
  graph: Record<string, RuntimeMathObjectNode>,
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "toCorner" | "toEdge" }>
): MathMobjectToCornerLayoutPlan | MathMobjectToEdgeLayoutPlan {
  const runtimeGraph = runtimeGraphFromRecord(graph, object);

  if (operation.type === "toCorner") {
    return buildMobjectToCornerLayoutPlan(runtimeGraph, {
      buff: operation.buff,
      direction: operation.direction,
      frame: operation.frame,
      objectId: object.id
    });
  }

  return buildMobjectToEdgeLayoutPlan(runtimeGraph, {
    buff: operation.buff,
    direction: operation.direction,
    frame: operation.frame,
    objectId: object.id
  });
}

function applyFrameLayout(
  graph: Record<string, RuntimeMathObjectNode>,
  object: RuntimeMathObjectNode,
  operation: Extract<MathSceneAlwaysMethodUpdaterSpec["operation"], { type: "toCorner" | "toEdge" }>
) {
  const plan = buildFrameLayoutPlan(graph, object, operation);
  const row = plan.rows.find((candidate) => candidate.objectId === object.id);
  if (!row) return object;

  const renderState = mapRenderState(object.renderState, (point) => addVec3(point, row.delta));
  return withRenderState(object, renderState);
}

export function applyAlwaysMethodUpdater({
  elapsedSeconds,
  graph,
  object,
  trackers,
  updater
}: ApplyAlwaysMethodUpdaterInput): RuntimeMathObjectNode {
  if (updater.operation.type === "alignTo") return applyAlignTo(graph, object, updater.operation);
  if (isCenterOperation(updater.operation)) return applyCenter(object);
  if (isCoordinateMatchOperation(updater.operation)) return applyCoordinateMatch(graph, object, updater.operation);
  if (isCoordinateSetterOperation(updater.operation)) return applyCoordinateSetter(object, updater.operation, trackers, elapsedSeconds);
  if (isOpacitySetterOperation(updater.operation)) return applySetOpacity(object, updater.operation, trackers, elapsedSeconds);
  if (isVMobjectStyleOperation(updater.operation)) return applyVMobjectStyle(object, updater.operation, trackers, elapsedSeconds);
  if (isMoveToOperation(updater.operation)) return applyMoveTo(object, updater.operation, trackers, elapsedSeconds);
  if (updater.operation.type === "nextTo") return applyNextTo(graph, object, updater.operation, trackers, elapsedSeconds);
  if (isShiftOperation(updater.operation)) return applyShift(object, updater.operation, trackers, elapsedSeconds);
  if (isScaleOperation(updater.operation)) return applyScale(object, updater.operation, trackers, elapsedSeconds);
  if (isStretchOperation(updater.operation)) return applyStretch(object, updater.operation, trackers, elapsedSeconds);
  if (isDimensionSetterOperation(updater.operation)) return applyDimensionSetter(object, updater.operation, trackers, elapsedSeconds);
  if (isDimensionMatchOperation(updater.operation)) return applyDimensionMatcher(graph, object, updater.operation);
  if (isRotateOperation(updater.operation)) return applyRotate(object, updater.operation, trackers, elapsedSeconds);
  if (isFrameLayoutOperation(updater.operation)) return applyFrameLayout(graph, object, updater.operation);
  return object;
}

export function buildAlwaysMethodUpdaterEvidence(
  scene: MathSceneSpec,
  runtimeState: MathSceneRuntimeState
): AlwaysMethodUpdaterEvidence {
  const updaters = scene.alwaysMethodUpdaters ?? [];
  const rows = updaters.map((updater) => {
    const object = runtimeState.objectGraph.byId[updater.objectId];
    const operationType = updater.operation.type;
    const targetObjectIdValue = targetObjectIdForOperation(updater.operation);
    const targetObjectId = targetObjectIdValue ?? "none";
    const target = targetObjectIdValue === undefined ? undefined : runtimeState.objectGraph.byId[targetObjectIdValue];
    const requiresTarget = targetObjectIdValue !== undefined;
    const dynamicBuff =
      (updater.operation.type === "nextTo" && updater.operation.buffExpression !== undefined) ||
      (isCoordinateSetterOperation(updater.operation) && updater.operation.coordinateExpression !== undefined) ||
      (isMoveToOperation(updater.operation) && updater.operation.pointExpression !== undefined) ||
      (isShiftOperation(updater.operation) && updater.operation.vectorExpression !== undefined) ||
      (isScaleOperation(updater.operation) && updater.operation.factorExpression !== undefined) ||
      (isStretchOperation(updater.operation) && updater.operation.factorExpression !== undefined) ||
      (isDimensionSetterOperation(updater.operation) && dimensionSetterExpression(updater.operation) !== undefined) ||
      (isRotateOperation(updater.operation) && updater.operation.angleExpression !== undefined) ||
      (isOpacitySetterOperation(updater.operation) && updater.operation.opacityExpression !== undefined) ||
      (isVMobjectStyleOperation(updater.operation) && vmobjectStyleOperationHasExpression(updater.operation));
    const direction = operationDirection(updater.operation);
    const buff = updater.operation.type === "nextTo"
      ? evaluateNextToBuff(updater.operation, runtimeState.trackers, runtimeState.timeline.elapsedSeconds)
      : isOpacitySetterOperation(updater.operation)
        ? evaluateOpacitySetterValue(
            updater.operation,
            runtimeState.trackers,
            runtimeState.timeline.elapsedSeconds,
            object?.uniforms?.opacity ?? 1
          )
      : isVMobjectStyleOperation(updater.operation) && object
        ? vmobjectStylePrimaryMetric(
            updater.operation,
            evaluateVMobjectStylePatch(
              updater.operation,
              renderStateVMobjectStyle(object.renderState) ?? buildVMobjectStyle(),
              runtimeState.trackers,
              runtimeState.timeline.elapsedSeconds
            )
          )
      : isFrameLayoutOperation(updater.operation)
        ? frameLayoutBuff(updater.operation)
      : 0;

    if (!object || (requiresTarget && !target)) {
      return {
        buff,
        direction,
        dynamicBuff,
        object,
        operationType,
        placementError: null,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isOpacitySetterOperation(updater.operation)) {
      const observedOpacity = normalizeMobjectUniforms(object.uniforms).opacity;
      const expectedOpacity = evaluateOpacitySetterValue(
        updater.operation,
        runtimeState.trackers,
        runtimeState.timeline.elapsedSeconds,
        observedOpacity
      );
      const placementError = Math.abs(observedOpacity - expectedOpacity);

      return {
        buff: expectedOpacity,
        boundingBoxSummary: `${updater.id}:opacity=${formatNumber(observedOpacity)}`,
        direction,
        dynamicBuff,
        object,
        observedBuff: observedOpacity,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatNumber(expectedOpacity)}:observed=${formatNumber(observedOpacity)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isVMobjectStyleOperation(updater.operation)) {
      const observedStyle = renderStateVMobjectStyle(object.renderState);
      if (!observedStyle) {
        return {
          buff,
          direction,
          dynamicBuff,
          object,
          operationType,
          placementError: null,
          requiresTarget,
          target,
          targetObjectId,
          updater
        };
      }

      const expectedStyle = evaluateVMobjectStylePatch(
        updater.operation,
        observedStyle,
        runtimeState.trackers,
        runtimeState.timeline.elapsedSeconds
      );
      const placementError = vmobjectStylePlacementError(observedStyle, expectedStyle);

      return {
        buff: vmobjectStylePrimaryMetric(updater.operation, expectedStyle),
        boundingBoxSummary: `${updater.id}:style=${summarizeVMobjectStyle(observedStyle)}`,
        direction,
        dynamicBuff,
        object,
        observedBuff: vmobjectStylePrimaryMetric(updater.operation, observedStyle),
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${summarizeVMobjectStyle(expectedStyle)}:` +
          `observed=${summarizeVMobjectStyle(observedStyle)}:error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    const objectBox = boundingBox(renderStatePoints(object.renderState));

    if (objectBox.kind !== "finite") {
      return {
        buff,
        direction,
        dynamicBuff,
        object,
        operationType,
        placementError: null,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isCoordinateSetterOperation(updater.operation)) {
      const observedCoordinate = coordinateForDirection(objectBox.center, direction);
      const expectedCoordinate = evaluateCoordinateSetterValue(
        updater.operation,
        runtimeState.trackers,
        runtimeState.timeline.elapsedSeconds,
        observedCoordinate
      );
      const placementError = Math.abs(observedCoordinate - expectedCoordinate);

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=none`,
        direction,
        dynamicBuff,
        object,
        observedBuff: observedCoordinate,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatNumber(expectedCoordinate)}:observed=${formatNumber(observedCoordinate)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isMoveToOperation(updater.operation)) {
      const observedPoint = objectBox.center;
      const expectedPoint = evaluateMoveToPoint(
        updater.operation,
        runtimeState.trackers,
        runtimeState.timeline.elapsedSeconds,
        observedPoint
      );
      const placementError = distanceVec3(observedPoint, expectedPoint);

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=none`,
        direction,
        dynamicBuff,
        object,
        observedBuff: placementError,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatVec3(expectedPoint)}:observed=${formatVec3(observedPoint)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isCenterOperation(updater.operation)) {
      const observedPoint = objectBox.center;
      const expectedPoint: Vec3 = [0, 0, 0];
      const placementError = distanceVec3(observedPoint, expectedPoint);

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=none`,
        direction,
        dynamicBuff,
        object,
        observedBuff: placementError,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatVec3(expectedPoint)}:observed=${formatVec3(observedPoint)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isShiftOperation(updater.operation)) {
      const sourceBox = boundingBox(specPoints(object));
      const expectedVector = evaluateShiftVector(
        updater.operation,
        runtimeState.trackers,
        runtimeState.timeline.elapsedSeconds
      );
      const observedVector = sourceBox.kind === "finite"
        ? subtractVec3(objectBox.center, sourceBox.center)
        : expectedVector;
      const placementError = distanceVec3(observedVector, expectedVector);

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=none`,
        direction: expectedVector,
        dynamicBuff,
        object,
        observedBuff: placementError,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatVec3(expectedVector)}:observed=${formatVec3(observedVector)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isScaleOperation(updater.operation)) {
      const sourceBox = boundingBox(specPoints(object));
      const factor = evaluateScaleFactor(
        updater.operation,
        runtimeState.trackers,
        runtimeState.timeline.elapsedSeconds
      );
      const expectedSize = multiplyVec3(boxSize(sourceBox), Math.abs(factor));
      const observedSize = boxSize(objectBox);
      const placementError = distanceVec3(observedSize, expectedSize);

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=scale:${formatVec3(expectedSize)}`,
        direction,
        dynamicBuff,
        object,
        observedBuff: placementError,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatVec3(expectedSize)}:observed=${formatVec3(observedSize)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isStretchOperation(updater.operation)) {
      const sourceBox = boundingBox(specPoints(object));
      const factor = evaluateStretchFactor(
        updater.operation,
        runtimeState.trackers,
        runtimeState.timeline.elapsedSeconds
      );
      const expectedSize = stretchBoxSize(boxSize(sourceBox), factor, updater.operation.dim);
      const observedSize = boxSize(objectBox);
      const placementError = distanceVec3(observedSize, expectedSize);

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=stretch:${formatVec3(expectedSize)}`,
        direction,
        dynamicBuff,
        object,
        observedBuff: placementError,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatVec3(expectedSize)}:observed=${formatVec3(observedSize)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isDimensionSetterOperation(updater.operation)) {
      const sourceBox = boundingBox(specPoints(object));
      const sourceSize = boxSize(sourceBox);
      const dim = dimensionSetterDim(updater.operation);
      const currentSize = sourceSize[dimensionIndex(dim)];
      const targetSize = evaluateDimensionSetterSize(
        updater.operation,
        runtimeState.trackers,
        runtimeState.timeline.elapsedSeconds,
        currentSize
      );
      const factor = dimensionScale(targetSize, currentSize);
      const scaleFactor = dimensionScaleFactor(factor, dim, updater.operation.stretch);
      const expectedSize = multiplyVec3ByAxis(sourceSize, scaleFactor);
      const observedSize = boxSize(objectBox);
      const placementError = distanceVec3(observedSize, expectedSize);

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=${updater.operation.type}:${formatVec3(expectedSize)}`,
        direction,
        dynamicBuff,
        object,
        observedBuff: placementError,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatVec3(expectedSize)}:observed=${formatVec3(observedSize)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isDimensionMatchOperation(updater.operation)) {
      if (!target) {
        return {
          buff,
          direction,
          dynamicBuff,
          object,
          operationType,
          placementError: null,
          requiresTarget,
          target,
          targetObjectId,
          updater
        };
      }

      const sourceBox = boundingBox(specPoints(object));
      const sourceSize = boxSize(sourceBox);
      const targetBox = boundingBox(renderStatePoints(target.renderState));
      const dim = dimensionMatcherDim(updater.operation);
      const targetSize = boxSize(targetBox)[dimensionIndex(dim)];
      const currentSize = sourceSize[dimensionIndex(dim)];
      const factor = dimensionScale(targetSize, currentSize);
      const scaleFactor = dimensionScaleFactor(factor, dim, updater.operation.stretch);
      const expectedSize = multiplyVec3ByAxis(sourceSize, scaleFactor);
      const observedSize = boxSize(objectBox);
      const placementError = distanceVec3(observedSize, expectedSize);

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=${updater.operation.type}:${formatVec3(expectedSize)}`,
        direction,
        dynamicBuff,
        object,
        observedBuff: placementError,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatVec3(expectedSize)}:observed=${formatVec3(observedSize)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isRotateOperation(updater.operation)) {
      const sourcePoints = finitePoints(specPoints(object));
      const sourceBox = boundingBox(sourcePoints);
      const aboutPoint = sourceBox.kind === "finite"
        ? cleanVec3(updater.operation.aboutPoint, sourceBox.center)
        : cleanVec3(updater.operation.aboutPoint, [0, 0, 0]);
      const angleRadians = evaluateRotateAngle(
        updater.operation,
        runtimeState.trackers,
        runtimeState.timeline.elapsedSeconds
      );
      const axis = updater.operation.axis ?? "z";
      const expectedPoints = sourcePoints.map((point) => rotateVec3(point, angleRadians, axis, aboutPoint));
      const observedPoints = finitePoints(renderStatePoints(object.renderState));
      const comparisonCount = Math.min(expectedPoints.length, observedPoints.length);
      const placementError = comparisonCount === 0
        ? Math.abs(expectedPoints.length - observedPoints.length)
        : Math.max(
            Math.abs(expectedPoints.length - observedPoints.length),
            ...Array.from({ length: comparisonCount }, (_, index) => distanceVec3(expectedPoints[index], observedPoints[index]))
          );

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=rotate:${formatVec3(aboutPoint)}`,
        direction,
        dynamicBuff,
        object,
        observedBuff: placementError,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatVec3List(expectedPoints)}:observed=${formatVec3List(observedPoints)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isFrameLayoutOperation(updater.operation)) {
      const plan = buildFrameLayoutPlan(runtimeState.objectGraph.byId, object, updater.operation);
      const frameDirection = plan.direction;
      const observedPoint = criticalPoint(objectBox, frameDirection);
      const expectedPoint = plan.frameTargetPoint;
      const placementError = Math.hypot(...axisDelta(observedPoint, expectedPoint, frameDirection));

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=frame:${formatVec3(expectedPoint)}`,
        direction: frameDirection,
        dynamicBuff,
        object,
        observedBuff: placementError,
        operationType,
        placementError,
        placementSummary:
          `${updater.id}:expected=${formatVec3(expectedPoint)}:observed=${formatVec3(observedPoint)}:` +
          `error=${formatNumber(placementError)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (!target) {
      return {
        buff,
        direction,
        dynamicBuff,
        object,
        operationType,
        placementError: null,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    const targetBox = boundingBox(renderStatePoints(target.renderState));

    if (targetBox.kind !== "finite") {
      return {
        buff,
        direction,
        dynamicBuff,
        object,
        operationType,
        placementError: null,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (isCoordinateMatchOperation(updater.operation)) {
      const observedGap = Math.hypot(...axisDelta(objectBox.center, targetBox.center, direction));

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=${formatVec3(targetBox.center)}`,
        direction,
        dynamicBuff,
        object,
        observedBuff: observedGap,
        operationType,
        placementError: observedGap,
        placementSummary: `${updater.id}:expected=0.000:observed=${formatNumber(observedGap)}:error=${formatNumber(observedGap)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    if (updater.operation.type === "alignTo") {
      const objectPoint = criticalPoint(objectBox, direction);
      const targetPoint = criticalPoint(targetBox, direction);
      const observedGap = Math.hypot(...axisDelta(objectPoint, targetPoint, direction));

      return {
        buff,
        boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=${formatVec3(targetBox.center)}`,
        direction,
        dynamicBuff,
        object,
        observedBuff: observedGap,
        operationType,
        placementError: observedGap,
        placementSummary: `${updater.id}:expected=0.000:observed=${formatNumber(observedGap)}:error=${formatNumber(observedGap)}`,
        requiresTarget,
        target,
        targetObjectId,
        updater
      };
    }

    const objectPoint = criticalPoint(objectBox, oppositeDirection(direction));
    const targetPoint = criticalPoint(targetBox, direction);
    const expectedObjectPoint = addVec3(targetPoint, multiplyVec3(direction, buff));
    const observedBuff = dotVec3(subtractVec3(objectPoint, targetPoint), direction);
    const placementError = distanceVec3(objectPoint, expectedObjectPoint);

    return {
      buff,
      boundingBoxSummary: `${updater.id}:objectCenter=${formatVec3(objectBox.center)}:targetCenter=${formatVec3(targetBox.center)}`,
      direction,
      dynamicBuff,
      object,
      observedBuff,
      operationType,
      placementError,
      placementSummary: `${updater.id}:expected=${formatNumber(buff)}:observed=${formatNumber(observedBuff)}:error=${formatNumber(placementError)}`,
      requiresTarget,
      target,
      targetObjectId,
      updater
    };
  });
  const placementErrors = rows
    .map((row) => row.placementError)
    .filter((placementError): placementError is number => placementError !== null);
  const maxPlacementError = placementErrors.length > 0 ? Math.max(...placementErrors) : 0;
  const updaterIds = joinOrNone(rows.map((row) => row.updater.id));
  const objectIds = joinOrNone(uniqueSorted(rows.map((row) => row.updater.objectId)));
  const targetObjectIds = joinOrNone(uniqueSorted(rows.map((row) => row.targetObjectId).filter((targetObjectId) => targetObjectId !== "none")));
  const operationTypes = joinOrNone(uniqueSorted(rows.map((row) => row.operationType)));
  const placedCount = rows.filter((row) => row.placementError !== null && row.placementError <= 1e-6).length;
  const missingObjectCount = rows.filter((row) => !row.object).length;
  const missingTargetCount = rows.filter((row) => row.requiresTarget && !row.target).length;
  const dynamicBuffCount = rows.filter((row) => row.dynamicBuff).length;
  const summary =
    `alwaysMethod:updaters=${rows.length}:placed=${placedCount}:missingObjects=${missingObjectCount}:` +
    `missingTargets=${missingTargetCount}:dynamicBuff=${dynamicBuffCount}:maxError=${formatNumber(maxPlacementError)}:ids=${updaterIds}`;

  return {
    boundingBoxSummary: joinOrNone(rows.map((row) => row.boundingBoxSummary).filter((value): value is string => Boolean(value))),
    buffSummary: joinOrNone(rows.map((row) => `${row.updater.id}=${formatNumber(row.buff)}`)),
    directionSummary: joinOrNone(rows.map((row) => `${row.updater.id}=${formatVec3(row.direction)}`)),
    dynamicBuffCount,
    maxPlacementError,
    missingObjectCount,
    missingTargetCount,
    objectIds,
    operationTypes,
    placedCount,
    placementSummary: joinOrNone(rows.map((row) => row.placementSummary).filter((value): value is string => Boolean(value))),
    sourceContract: ALWAYS_METHOD_UPDATER_SOURCE_CONTRACT,
    summary,
    targetObjectIds,
    updaterCount: rows.length,
    updaterIds
  };
}

export function alwaysMethodUpdaterEvidenceDataAttributes(evidence: AlwaysMethodUpdaterEvidence): Record<string, string> {
  return {
    "data-viz-manim-always-method-bounding-box-summary": evidence.boundingBoxSummary,
    "data-viz-manim-always-method-buff-summary": evidence.buffSummary,
    "data-viz-manim-always-method-count": String(evidence.updaterCount),
    "data-viz-manim-always-method-direction-summary": evidence.directionSummary,
    "data-viz-manim-always-method-dynamic-buff-count": String(evidence.dynamicBuffCount),
    "data-viz-manim-always-method-max-placement-error": formatNumber(evidence.maxPlacementError),
    "data-viz-manim-always-method-missing-object-count": String(evidence.missingObjectCount),
    "data-viz-manim-always-method-missing-target-count": String(evidence.missingTargetCount),
    "data-viz-manim-always-method-object-ids": evidence.objectIds,
    "data-viz-manim-always-method-operation-types": evidence.operationTypes,
    "data-viz-manim-always-method-placed-count": String(evidence.placedCount),
    "data-viz-manim-always-method-placement-summary": evidence.placementSummary,
    "data-viz-manim-always-method-source-contract": evidence.sourceContract,
    "data-viz-manim-always-method-summary": evidence.summary,
    "data-viz-manim-always-method-target-object-ids": evidence.targetObjectIds,
    "data-viz-manim-always-method-updater-ids": evidence.updaterIds
  };
}

export function serializeAlwaysMethodUpdaterEvidence(evidence: AlwaysMethodUpdaterEvidence) {
  return stableSerialize(evidence);
}
