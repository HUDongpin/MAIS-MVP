import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { MathObjectGraph, RuntimeMathObjectNode, RuntimeRenderState } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";

export type Rgba = [number, number, number, number];

export const MOBJECT_DATA_ARRAY_SOURCE_CONTRACT =
  "Manim Mobject.data point and rgba arrays: Browser QA records sanitized point rows, rgba rows, semantic roles, and stable signatures from runtime render state.";

export type MobjectDataRow = {
  conceptId: string;
  finitePointCount: number;
  objectId: string;
  pointCount: number;
  points: Vec3[];
  rgba: Rgba[];
  semanticRole: string;
  type: RuntimeMathObjectNode["type"];
};

export type MobjectDataTable = {
  finitePointCount: number;
  objectIds: string;
  pointCount: number;
  rgbaCount: number;
  rowCount: number;
  rows: MobjectDataRow[];
  semanticRoleCount: number;
  semanticRoles: string[];
  signature: string;
  sourceContract: typeof MOBJECT_DATA_ARRAY_SOURCE_CONTRACT;
};

const ROLE_RGB: Record<string, [number, number, number]> = {
  area: [0.24, 0.84, 0.55],
  attention: [1, 0.28, 0.44],
  derivative: [0.98, 0.76, 0.17],
  function: [0.13, 0.83, 0.93],
  probe: [0.98, 0.76, 0.17],
  reference: [0.58, 0.64, 0.72],
  surface: [0.45, 0.55, 0.98],
  trace: [0.45, 0.55, 0.98],
  vector: [0.52, 0.7, 1]
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizePoint([x, y, z]: Vec3): Vec3 {
  return [finite(x), finite(y), finite(z)];
}

function isFinitePoint(point: Vec3) {
  return point.every(Number.isFinite);
}

function roleForNode(node: RuntimeMathObjectNode) {
  const renderState = node.renderState;

  if ("style" in renderState && renderState.style?.strokeRole) return renderState.style.strokeRole;
  if (node.colorRole) return node.colorRole;

  return "reference";
}

function opacityForNode(node: RuntimeMathObjectNode) {
  const renderState = node.renderState;
  const uniformOpacity = Math.min(1, Math.max(0, finite(node.uniforms?.opacity ?? 1, 1)));

  if ("style" in renderState && renderState.style?.strokeOpacity !== undefined) {
    return Math.min(1, Math.max(0, finite(renderState.style.strokeOpacity, 1))) * uniformOpacity;
  }

  return uniformOpacity;
}

function rgbaForRole(role: string, opacity: number): Rgba {
  const rgb = ROLE_RGB[role] ?? ROLE_RGB.reference;

  return [rgb[0], rgb[1], rgb[2], opacity];
}

function buildMobjectDataRow(node: RuntimeMathObjectNode): MobjectDataRow {
  const rawPoints = pointsForRuntimeRenderState(node.renderState);
  const points = rawPoints.map(sanitizePoint);
  const semanticRole = roleForNode(node);
  const rgba = points.map(() => rgbaForRole(semanticRole, opacityForNode(node)));

  return {
    conceptId: node.conceptId,
    finitePointCount: rawPoints.filter(isFinitePoint).length,
    objectId: node.id,
    pointCount: points.length,
    points,
    rgba,
    semanticRole,
    type: node.type
  };
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
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

  return `mobject-data-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

export function summarizeMobjectDataTable(table: MobjectDataTable) {
  const roles = table.semanticRoles.join(",") || "none";

  return `mobject-data:rows=${table.rowCount}:points=${table.pointCount}:finite=${table.finitePointCount}:rgba=${table.rgbaCount}:roles=${roles}`;
}

export function buildMobjectDataTable(objectGraph: MathObjectGraph): MobjectDataTable {
  const rows = Object.values(objectGraph.byId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(buildMobjectDataRow);
  const semanticRoles = uniqueSorted(rows.map((row) => row.semanticRole));
  const baseTable = {
    finitePointCount: rows.reduce((sum, row) => sum + row.finitePointCount, 0),
    objectIds: rows.map((row) => row.objectId).join(",") || "none",
    pointCount: rows.reduce((sum, row) => sum + row.pointCount, 0),
    rgbaCount: rows.reduce((sum, row) => sum + row.rgba.length, 0),
    rowCount: rows.length,
    rows,
    semanticRoleCount: semanticRoles.length,
    semanticRoles
  };

  return {
    ...baseTable,
    signature: hashStableJson(stableSerialize(baseTable)),
    sourceContract: MOBJECT_DATA_ARRAY_SOURCE_CONTRACT
  };
}

export function serializeMobjectDataTable(table: MobjectDataTable) {
  return escapedJson(stableSerialize(table));
}

export function mobjectDataTableDataAttributes(table: MobjectDataTable) {
  return {
    "data-viz-mobject-data-array-finite-point-count": String(table.finitePointCount),
    "data-viz-mobject-data-array-object-ids": table.objectIds,
    "data-viz-mobject-data-array-point-count": String(table.pointCount),
    "data-viz-mobject-data-array-rgba-count": String(table.rgbaCount),
    "data-viz-mobject-data-array-role-count": String(table.semanticRoleCount),
    "data-viz-mobject-data-array-row-count": String(table.rowCount),
    "data-viz-mobject-data-array-signature": table.signature,
    "data-viz-mobject-data-array-source-contract": table.sourceContract,
    "data-viz-mobject-data-array-summary": summarizeMobjectDataTable(table)
  };
}
