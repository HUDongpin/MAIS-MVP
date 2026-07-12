import { mapRuntimeRenderState, pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { MathObjectGraph, RuntimeMathObjectNode, RuntimeRenderState } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";

export const MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT =
  "Mobject.apply_points_function_about_point|Mobject.shift|Mobject.scale|Mobject.rotate";

export type MobjectPointTransformAxis = "x" | "y" | "z";

export type MobjectPointTransformOperation =
  | { id?: string; type: "applyFunction"; aboutPoint?: Vec3; sourceSummary?: string; transform: (point: Vec3) => Vec3 }
  | { id?: string; type: "rotate"; aboutPoint?: Vec3; angleRadians: number; axis?: MobjectPointTransformAxis }
  | { id?: string; type: "scale"; aboutPoint?: Vec3; factor: number }
  | { id?: string; type: "shift"; vector: Vec3 };

export type MobjectPointTransformRow = {
  aboutPointSummary: string;
  changedPointCount: number;
  conceptId: string;
  finitePointCount: number;
  firstPointAfter: Vec3 | null;
  firstPointBefore: Vec3 | null;
  maxDisplacement: number;
  objectId: string;
  operationId: string;
  operationType: MobjectPointTransformOperation["type"];
  pointCount: number;
  type: RuntimeMathObjectNode["type"];
};

export type MobjectPointTransformEvidence = {
  changedPointCount: number;
  finiteTransformedPointCount: number;
  maxDisplacement: number;
  objectCount: number;
  operationCount: number;
  operationIds: string;
  rowCount: number;
  rows: MobjectPointTransformRow[];
  signature: string;
  sourceContract: typeof MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT;
  sourcePointCount: number;
  summary: string;
  transformableObjectCount: number;
  transformedPointCount: number;
};

const DEFAULT_POINT_TRANSFORM_OPERATIONS: Required<
  Pick<Extract<MobjectPointTransformOperation, { type: "shift" }>, "id" | "type" | "vector">
>[] = [
  { id: "shift-evidence", type: "shift", vector: [0.125, -0.125, 0.0625] }
];

function defaultOperations(): MobjectPointTransformOperation[] {
  return [
    ...DEFAULT_POINT_TRANSFORM_OPERATIONS,
    { factor: 1.125, id: "scale-about-center", type: "scale" },
    { angleRadians: Math.PI / 12, axis: "z", id: "rotate-about-center", type: "rotate" }
  ];
}

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function cleanVec3(value: Vec3 | undefined, fallback: Vec3 = [0, 0, 0]): Vec3 {
  if (!value) return [...fallback];
  return [finite(value[0], fallback[0]), finite(value[1], fallback[1]), finite(value[2], fallback[2])];
}

function add(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subtract(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scale(point: Vec3, factor: number): Vec3 {
  return [point[0] * factor, point[1] * factor, point[2] * factor];
}

function rotate(point: Vec3, angleRadians: number, axis: MobjectPointTransformAxis): Vec3 {
  const cos = Math.cos(finite(angleRadians));
  const sin = Math.sin(finite(angleRadians));
  const [x, y, z] = point;

  if (axis === "x") return [x, y * cos - z * sin, y * sin + z * cos];
  if (axis === "y") return [x * cos + z * sin, y, -x * sin + z * cos];

  return [x * cos - y * sin, x * sin + y * cos, z];
}

function roundNumber(value: number, digits = 6) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : value;
}

function roundVec3(value: Vec3): Vec3 {
  return value.map((entry) => roundNumber(entry)) as Vec3;
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "none";
}

function formatVec3(value: Vec3 | null) {
  return value ? value.map((entry) => formatNumber(entry)).join(",") : "none";
}

function distance(left: Vec3, right: Vec3) {
  if (!left.every(Number.isFinite) || !right.every(Number.isFinite)) return Number.NaN;

  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function finitePoints(points: Vec3[]) {
  return points.filter((point) => point.every(Number.isFinite));
}

function centerOfPoints(points: Vec3[]): Vec3 {
  const finiteSourcePoints = finitePoints(points);
  if (finiteSourcePoints.length === 0) return [0, 0, 0];

  const min: Vec3 = [...finiteSourcePoints[0]];
  const max: Vec3 = [...finiteSourcePoints[0]];
  finiteSourcePoints.forEach((point) => {
    min[0] = Math.min(min[0], point[0]);
    min[1] = Math.min(min[1], point[1]);
    min[2] = Math.min(min[2], point[2]);
    max[0] = Math.max(max[0], point[0]);
    max[1] = Math.max(max[1], point[1]);
    max[2] = Math.max(max[2], point[2]);
  });

  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

function operationId(operation: MobjectPointTransformOperation) {
  if (operation.id) return operation.id;
  if (operation.type === "shift") return "shift";
  if (operation.type === "scale") return "scale";
  if (operation.type === "rotate") return `rotate-${operation.axis ?? "z"}`;
  return operation.sourceSummary ?? "apply-function";
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  if (typeof value === "function") return JSON.stringify("[function]");
  return JSON.stringify(value);
}

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `mobject-point-transform-${hash.toString(16).padStart(8, "0")}`;
}

export function applyPointsFunctionAboutPointToRenderState(
  renderState: RuntimeRenderState,
  transform: (point: Vec3) => Vec3,
  options: { aboutPoint?: Vec3 } = {}
): RuntimeRenderState {
  const aboutPoint = cleanVec3(options.aboutPoint);

  return mapRuntimeRenderState(renderState, (point) => {
    const relativePoint = subtract(point, aboutPoint);
    return add(aboutPoint, transform(relativePoint));
  });
}

export function shiftRuntimeRenderState(renderState: RuntimeRenderState, vector: Vec3): RuntimeRenderState {
  const delta = cleanVec3(vector);
  return mapRuntimeRenderState(renderState, (point) => add(point, delta));
}

export function scaleRuntimeRenderState(
  renderState: RuntimeRenderState,
  factor: number,
  options: { aboutPoint?: Vec3 } = {}
): RuntimeRenderState {
  const scaleFactor = finite(factor, 1);
  return applyPointsFunctionAboutPointToRenderState(renderState, (point) => scale(point, scaleFactor), options);
}

export function rotateRuntimeRenderState(
  renderState: RuntimeRenderState,
  angleRadians: number,
  options: { aboutPoint?: Vec3; axis?: MobjectPointTransformAxis } = {}
): RuntimeRenderState {
  const axis = options.axis ?? "z";
  return applyPointsFunctionAboutPointToRenderState(
    renderState,
    (point) => rotate(point, angleRadians, axis),
    { aboutPoint: options.aboutPoint }
  );
}

function transformedRenderStateForOperation(
  renderState: RuntimeRenderState,
  operation: MobjectPointTransformOperation,
  fallbackAboutPoint: Vec3
) {
  if (operation.type === "shift") return shiftRuntimeRenderState(renderState, operation.vector);
  if (operation.type === "scale") {
    return scaleRuntimeRenderState(renderState, operation.factor, {
      aboutPoint: operation.aboutPoint ?? fallbackAboutPoint
    });
  }
  if (operation.type === "rotate") {
    return rotateRuntimeRenderState(renderState, operation.angleRadians, {
      aboutPoint: operation.aboutPoint ?? fallbackAboutPoint,
      axis: operation.axis
    });
  }

  return applyPointsFunctionAboutPointToRenderState(renderState, operation.transform, {
    aboutPoint: operation.aboutPoint ?? fallbackAboutPoint
  });
}

function buildRow(
  node: RuntimeMathObjectNode,
  operation: MobjectPointTransformOperation
): MobjectPointTransformRow | null {
  const beforePoints = pointsForRuntimeRenderState(node.renderState);
  if (beforePoints.length === 0) return null;

  const aboutPoint = operation.type === "shift"
    ? [0, 0, 0] as Vec3
    : cleanVec3("aboutPoint" in operation ? operation.aboutPoint : undefined, centerOfPoints(beforePoints));
  const transformedState = transformedRenderStateForOperation(node.renderState, operation, aboutPoint);
  const afterPoints = pointsForRuntimeRenderState(transformedState);
  const distances = beforePoints.map((point, index) => distance(point, afterPoints[index] ?? point));
  const finiteDistances = distances.filter(Number.isFinite);

  return {
    aboutPointSummary: operation.type === "shift" ? "none" : formatVec3(aboutPoint),
    changedPointCount: finiteDistances.filter((entry) => entry > 1e-9).length,
    conceptId: node.conceptId,
    finitePointCount: finitePoints(afterPoints).length,
    firstPointAfter: afterPoints[0] ? roundVec3(afterPoints[0]) : null,
    firstPointBefore: beforePoints[0] ? roundVec3(beforePoints[0]) : null,
    maxDisplacement: finiteDistances.length > 0 ? roundNumber(Math.max(...finiteDistances)) : 0,
    objectId: node.id,
    operationId: operationId(operation),
    operationType: operation.type,
    pointCount: afterPoints.length,
    type: node.type
  };
}

export function summarizeMobjectPointTransformEvidence(evidence: MobjectPointTransformEvidence) {
  return `mobject-point-transform:objects=${evidence.objectCount}:transformable=${evidence.transformableObjectCount}:ops=${evidence.operationCount}:rows=${evidence.rowCount}:sourcePoints=${evidence.sourcePointCount}:transformed=${evidence.transformedPointCount}:finite=${evidence.finiteTransformedPointCount}:ids=${evidence.operationIds}`;
}

export function buildMobjectPointTransformEvidence(
  objectGraph: MathObjectGraph,
  options: { operations?: MobjectPointTransformOperation[] } = {}
): MobjectPointTransformEvidence {
  const operations = options.operations ?? defaultOperations();
  const nodes = Object.values(objectGraph.byId).sort((left, right) => left.id.localeCompare(right.id));
  const transformableNodes = nodes.filter((node) => pointsForRuntimeRenderState(node.renderState).length > 0);
  const rows = transformableNodes.flatMap((node) =>
    operations
      .map((operation) => buildRow(node, operation))
      .filter((row): row is MobjectPointTransformRow => Boolean(row))
  );
  const operationIds = operations.map(operationId).join(",") || "none";
  const baseEvidence = {
    changedPointCount: rows.reduce((sum, row) => sum + row.changedPointCount, 0),
    finiteTransformedPointCount: rows.reduce((sum, row) => sum + row.finitePointCount, 0),
    maxDisplacement: rows.length > 0 ? roundNumber(Math.max(...rows.map((row) => row.maxDisplacement))) : 0,
    objectCount: nodes.length,
    operationCount: operations.length,
    operationIds,
    rowCount: rows.length,
    rows,
    sourcePointCount: transformableNodes.reduce(
      (sum, node) => sum + pointsForRuntimeRenderState(node.renderState).length,
      0
    ),
    transformableObjectCount: transformableNodes.length,
    transformedPointCount: rows.reduce((sum, row) => sum + row.pointCount, 0)
  };
  const evidence: MobjectPointTransformEvidence = {
    ...baseEvidence,
    signature: hashStableJson(stableSerialize(baseEvidence)),
    sourceContract: MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT,
    summary: "",
  };

  return {
    ...evidence,
    summary: summarizeMobjectPointTransformEvidence(evidence)
  };
}

export function mobjectPointTransformDataAttributes(evidence: MobjectPointTransformEvidence) {
  return {
    "data-viz-mobject-point-transform-changed-point-count": String(evidence.changedPointCount),
    "data-viz-mobject-point-transform-finite-transformed-point-count": String(evidence.finiteTransformedPointCount),
    "data-viz-mobject-point-transform-max-displacement": evidence.maxDisplacement.toFixed(3),
    "data-viz-mobject-point-transform-object-count": String(evidence.objectCount),
    "data-viz-mobject-point-transform-operation-count": String(evidence.operationCount),
    "data-viz-mobject-point-transform-operation-ids": evidence.operationIds,
    "data-viz-mobject-point-transform-row-count": String(evidence.rowCount),
    "data-viz-mobject-point-transform-signature": evidence.signature,
    "data-viz-mobject-point-transform-source-contract": evidence.sourceContract,
    "data-viz-mobject-point-transform-source-point-count": String(evidence.sourcePointCount),
    "data-viz-mobject-point-transform-summary": evidence.summary,
    "data-viz-mobject-point-transform-transformable-object-count": String(evidence.transformableObjectCount),
    "data-viz-mobject-point-transform-transformed-point-count": String(evidence.transformedPointCount)
  } as const;
}
