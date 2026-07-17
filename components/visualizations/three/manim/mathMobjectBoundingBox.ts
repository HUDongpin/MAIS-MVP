import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { MathObjectGraph, RuntimeBoundingBox, RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";

export const MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT =
  "Mobject.get_bounding_box|get_all_points|_needs_new_bounding_box";

export type MobjectBoundingBoxRow = {
  center: Vec3;
  conceptId: string;
  finite: boolean;
  kind: RuntimeBoundingBox["kind"];
  max: Vec3;
  min: Vec3;
  objectId: string;
  size: Vec3;
  type: RuntimeMathObjectNode["type"];
};

export type MobjectBoundingBoxTable = {
  emptyCount: number;
  finiteCount: number;
  objectIds: string;
  rowCount: number;
  rows: MobjectBoundingBoxRow[];
  signature: string;
  sourceContract: typeof MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT;
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function safeVec3(value: Vec3 | undefined, fallback: Vec3 = [0, 0, 0]): Vec3 {
  if (!value) return [...fallback];
  return [finite(value[0], fallback[0]), finite(value[1], fallback[1]), finite(value[2], fallback[2])];
}

function finiteVec3(points: Vec3[]) {
  return points.filter((point) => point.every(Number.isFinite));
}

function boundingBoxForPoints(points: Vec3[]): RuntimeBoundingBox {
  const finitePoints = finiteVec3(points);
  if (finitePoints.length === 0) return { kind: "empty" };

  const min: Vec3 = [...finitePoints[0]];
  const max: Vec3 = [...finitePoints[0]];

  finitePoints.forEach((point) => {
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

export function effectiveMobjectBoundingBox(node: RuntimeMathObjectNode): RuntimeBoundingBox {
  const renderStateBox = boundingBoxForPoints(pointsForRuntimeRenderState(node.renderState));
  return renderStateBox.kind === "finite" ? renderStateBox : node.boundingBox;
}

function collectFamilyPoints(
  objectGraph: MathObjectGraph,
  objectId: string,
  visited = new Set<string>()
): Vec3[] {
  if (visited.has(objectId)) return [];

  const node = objectGraph.byId[objectId];
  if (!node) return [];

  const nextVisited = new Set(visited);
  nextVisited.add(objectId);

  return [
    ...pointsForRuntimeRenderState(node.renderState),
    ...node.childIds.flatMap((childId) => collectFamilyPoints(objectGraph, childId, nextVisited))
  ];
}

export function effectiveMobjectFamilyBoundingBox(
  objectGraph: MathObjectGraph,
  node: RuntimeMathObjectNode
): RuntimeBoundingBox {
  const familyBox = boundingBoxForPoints(collectFamilyPoints(objectGraph, node.id));
  return familyBox.kind === "finite" ? familyBox : effectiveMobjectBoundingBox(node);
}

function sizeForBox(min: Vec3, max: Vec3): Vec3 {
  return [
    finite(max[0] - min[0]),
    finite(max[1] - min[1]),
    finite(max[2] - min[2])
  ];
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

  return `mobject-bounds-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function boundingBoxRow(objectGraph: MathObjectGraph, node: RuntimeMathObjectNode): MobjectBoundingBoxRow {
  const boundingBox = effectiveMobjectFamilyBoundingBox(objectGraph, node);

  if (boundingBox.kind === "empty") {
    return {
      center: [0, 0, 0],
      conceptId: node.conceptId,
      finite: false,
      kind: "empty",
      max: [0, 0, 0],
      min: [0, 0, 0],
      objectId: node.id,
      size: [0, 0, 0],
      type: node.type
    };
  }

  const center = safeVec3(boundingBox.center);
  const min = safeVec3(boundingBox.min, center);
  const max = safeVec3(boundingBox.max, center);

  return {
    center,
    conceptId: node.conceptId,
    finite: true,
    kind: "finite",
    max,
    min,
    objectId: node.id,
    size: sizeForBox(min, max),
    type: node.type
  };
}

export function summarizeMobjectBoundingBoxTable(table: MobjectBoundingBoxTable) {
  return `mobject-bounds:rows=${table.rowCount}:finite=${table.finiteCount}:empty=${table.emptyCount}:ids=${table.objectIds}`;
}

export function buildMobjectBoundingBoxTable(objectGraph: MathObjectGraph): MobjectBoundingBoxTable {
  const rows = Object.values(objectGraph.byId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node) => boundingBoxRow(objectGraph, node));
  const baseTable = {
    emptyCount: rows.filter((row) => !row.finite).length,
    finiteCount: rows.filter((row) => row.finite).length,
    objectIds: rows.map((row) => row.objectId).join(",") || "none",
    rowCount: rows.length,
    rows
  };

  return {
    ...baseTable,
    signature: hashStableJson(stableSerialize(baseTable)),
    sourceContract: MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT
  };
}

export function serializeMobjectBoundingBoxTable(table: MobjectBoundingBoxTable) {
  return escapedJson(stableSerialize(table));
}

export function mobjectBoundingBoxDataAttributes(table: MobjectBoundingBoxTable) {
  return {
    "data-viz-mobject-bounding-box-count": String(table.rowCount),
    "data-viz-mobject-bounding-box-empty-count": String(table.emptyCount),
    "data-viz-mobject-bounding-box-finite-count": String(table.finiteCount),
    "data-viz-mobject-bounding-box-object-ids": table.objectIds,
    "data-viz-mobject-bounding-box-signature": table.signature,
    "data-viz-mobject-bounding-box-source-contract": table.sourceContract,
    "data-viz-mobject-bounding-box-summary": summarizeMobjectBoundingBoxTable(table)
  };
}
