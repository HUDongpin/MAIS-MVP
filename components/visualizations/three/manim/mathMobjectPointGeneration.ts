import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { MathObjectGraph, RuntimeMathObjectNode } from "./mathSceneRuntimeState";

export const MOBJECT_POINT_GENERATION_SOURCE_CONTRACT =
  "Mobject.generate_points|Mobject.init_points|pointsForRuntimeRenderState" as const;

export type MobjectPointGenerationGenerator =
  | "axis3d-axis-endpoints"
  | "movingPoint-initial-position"
  | "parametricCurve-samples"
  | "parametricSurface-grid"
  | "trace-initial-empty-path"
  | "vector-endpoints";

export type MobjectPointGenerationRow = {
  finitePointCount: number;
  generator: MobjectPointGenerationGenerator;
  nonFinitePointCount: number;
  objectId: string;
  pointCount: number;
  type: RuntimeMathObjectNode["type"];
};

export type MobjectPointGenerationTable = {
  finitePointCount: number;
  generatedObjectCount: number;
  generatorKindSummary: string;
  nonFinitePointCount: number;
  objectCount: number;
  pointCount: number;
  rows: MobjectPointGenerationRow[];
  signature: string;
  sourceContract: typeof MOBJECT_POINT_GENERATION_SOURCE_CONTRACT;
  summary: string;
  zeroPointObjectCount: number;
  zeroPointObjectIds: string;
};

const GENERATOR_KIND_ORDER: RuntimeMathObjectNode["type"][] = [
  "axis3d",
  "movingPoint",
  "parametricCurve",
  "parametricSurface",
  "trace",
  "vector"
];

function generatorForNode(node: RuntimeMathObjectNode): MobjectPointGenerationGenerator {
  if (node.type === "axis3d") return "axis3d-axis-endpoints";
  if (node.type === "movingPoint") return "movingPoint-initial-position";
  if (node.type === "parametricCurve") return "parametricCurve-samples";
  if (node.type === "parametricSurface") return "parametricSurface-grid";
  if (node.type === "trace") return "trace-initial-empty-path";
  return "vector-endpoints";
}

function isFinitePoint(point: number[]) {
  return point.every(Number.isFinite);
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

  return `mobject-point-generation-${hash.toString(16).padStart(8, "0")}`;
}

function pointGenerationRow(node: RuntimeMathObjectNode): MobjectPointGenerationRow {
  const points = pointsForRuntimeRenderState(node.renderState);
  const finitePointCount = points.filter(isFinitePoint).length;

  return {
    finitePointCount,
    generator: generatorForNode(node),
    nonFinitePointCount: points.length - finitePointCount,
    objectId: node.id,
    pointCount: points.length,
    type: node.type
  };
}

function summarizeGeneratorKinds(rows: MobjectPointGenerationRow[]) {
  const counts = new Map<RuntimeMathObjectNode["type"], number>();

  rows.forEach((row) => {
    counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
  });

  return GENERATOR_KIND_ORDER
    .filter((type) => counts.has(type))
    .map((type) => `${type}=${counts.get(type)}`)
    .join(";") || "none";
}

export function summarizeMobjectPointGenerationTable(table: MobjectPointGenerationTable) {
  return table.summary;
}

export function buildMobjectPointGenerationTable(objectGraph: MathObjectGraph): MobjectPointGenerationTable {
  const rows = Object.values(objectGraph.byId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(pointGenerationRow);
  const zeroPointObjectIds = rows.filter((row) => row.pointCount === 0).map((row) => row.objectId).join(",") || "none";
  const baseTable = {
    finitePointCount: rows.reduce((sum, row) => sum + row.finitePointCount, 0),
    generatedObjectCount: rows.filter((row) => row.pointCount > 0).length,
    generatorKindSummary: summarizeGeneratorKinds(rows),
    nonFinitePointCount: rows.reduce((sum, row) => sum + row.nonFinitePointCount, 0),
    objectCount: rows.length,
    pointCount: rows.reduce((sum, row) => sum + row.pointCount, 0),
    rows,
    zeroPointObjectCount: rows.filter((row) => row.pointCount === 0).length,
    zeroPointObjectIds
  };
  const summary = `mobject-point-generation:objects=${baseTable.objectCount}:generated=${baseTable.generatedObjectCount}:points=${baseTable.pointCount}:finite=${baseTable.finitePointCount}:nonFinite=${baseTable.nonFinitePointCount}:zero=${baseTable.zeroPointObjectIds}`;
  const signatureInput = { ...baseTable, summary };

  return {
    ...baseTable,
    signature: hashStableJson(stableSerialize(signatureInput)),
    sourceContract: MOBJECT_POINT_GENERATION_SOURCE_CONTRACT,
    summary
  };
}

export function mobjectPointGenerationDataAttributes(table: MobjectPointGenerationTable) {
  return {
    "data-viz-mobject-point-generation-finite-point-count": String(table.finitePointCount),
    "data-viz-mobject-point-generation-generated-object-count": String(table.generatedObjectCount),
    "data-viz-mobject-point-generation-generator-kind-summary": table.generatorKindSummary,
    "data-viz-mobject-point-generation-non-finite-point-count": String(table.nonFinitePointCount),
    "data-viz-mobject-point-generation-object-count": String(table.objectCount),
    "data-viz-mobject-point-generation-point-count": String(table.pointCount),
    "data-viz-mobject-point-generation-signature": table.signature,
    "data-viz-mobject-point-generation-source-contract": table.sourceContract,
    "data-viz-mobject-point-generation-summary": table.summary,
    "data-viz-mobject-point-generation-zero-point-object-count": String(table.zeroPointObjectCount),
    "data-viz-mobject-point-generation-zero-point-object-ids": table.zeroPointObjectIds
  } as const;
}
