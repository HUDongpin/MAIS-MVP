import { buildMobjectFamilyIndex, mobjectFamilyMembersWithRenderData } from "./mathMobjectFamily";
import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { MathObjectGraph, RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";

export const MOBJECT_POINT_CLOUD_SOURCE_CONTRACT =
  "Mobject.family_members_with_points|get_all_points";

export type MobjectPointCloudMember = {
  conceptId: string;
  objectId: string;
  pointCount: number;
  points: Vec3[];
  type: RuntimeMathObjectNode["type"];
};

export type MobjectPointCloudRow = {
  allPoints: Vec3[];
  conceptId: string;
  familyIds: string[];
  memberIdsWithPoints: string[];
  members: MobjectPointCloudMember[];
  pointCount: number;
  rootId: string;
};

export type MobjectPointCloudTable = {
  emptyFamilyCount: number;
  familyCount: number;
  familyIds: string;
  familyWithPointsCount: number;
  objectWithPointsCount: number;
  pointCount: number;
  rows: MobjectPointCloudRow[];
  signature: string;
  sourceContract: typeof MOBJECT_POINT_CLOUD_SOURCE_CONTRACT;
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizePoint([x, y, z]: Vec3): Vec3 {
  return [finite(x), finite(y), finite(z)];
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

  return `mobject-points-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function pointCloudMember(node: RuntimeMathObjectNode): MobjectPointCloudMember {
  const points = pointsForRuntimeRenderState(node.renderState).map(sanitizePoint);

  return {
    conceptId: node.conceptId,
    objectId: node.id,
    pointCount: points.length,
    points,
    type: node.type
  };
}

export function summarizeMobjectPointCloudTable(table: MobjectPointCloudTable) {
  return `mobject-points:families=${table.familyCount}:withPoints=${table.familyWithPointsCount}:objectsWithPoints=${table.objectWithPointsCount}:points=${table.pointCount}:ids=${table.familyIds}`;
}

export function buildMobjectPointCloudTable(objectGraph: MathObjectGraph): MobjectPointCloudTable {
  const familyIndex = buildMobjectFamilyIndex(objectGraph);
  const rows = familyIndex.topLevelIds.map((rootId) => {
    const root = familyIndex.byId[rootId];
    const memberIdsWithPoints = mobjectFamilyMembersWithRenderData(familyIndex, rootId);
    const members = memberIdsWithPoints
      .map((objectId) => objectGraph.byId[objectId])
      .filter((node): node is RuntimeMathObjectNode => Boolean(node))
      .map(pointCloudMember)
      .filter((member) => member.pointCount > 0);
    const allPoints = members.flatMap((member) => member.points);

    return {
      allPoints,
      conceptId: root?.conceptId ?? rootId,
      familyIds: root?.familyIds ?? [rootId],
      memberIdsWithPoints: members.map((member) => member.objectId),
      members,
      pointCount: allPoints.length,
      rootId
    };
  });
  const baseTable = {
    emptyFamilyCount: rows.filter((row) => row.pointCount === 0).length,
    familyCount: rows.length,
    familyIds: rows.map((row) => row.rootId).join(",") || "none",
    familyWithPointsCount: rows.filter((row) => row.pointCount > 0).length,
    objectWithPointsCount: rows.reduce((sum, row) => sum + row.members.length, 0),
    pointCount: rows.reduce((sum, row) => sum + row.pointCount, 0),
    rows
  };

  return {
    ...baseTable,
    signature: hashStableJson(stableSerialize(baseTable)),
    sourceContract: MOBJECT_POINT_CLOUD_SOURCE_CONTRACT
  };
}

export function serializeMobjectPointCloudTable(table: MobjectPointCloudTable) {
  return escapedJson(stableSerialize(table));
}

export function mobjectPointCloudDataAttributes(table: MobjectPointCloudTable) {
  return {
    "data-viz-mobject-point-cloud-empty-family-count": String(table.emptyFamilyCount),
    "data-viz-mobject-point-cloud-family-count": String(table.familyCount),
    "data-viz-mobject-point-cloud-family-ids": table.familyIds,
    "data-viz-mobject-point-cloud-family-with-points-count": String(table.familyWithPointsCount),
    "data-viz-mobject-point-cloud-object-with-points-count": String(table.objectWithPointsCount),
    "data-viz-mobject-point-cloud-point-count": String(table.pointCount),
    "data-viz-mobject-point-cloud-signature": table.signature,
    "data-viz-mobject-point-cloud-source-contract": table.sourceContract,
    "data-viz-mobject-point-cloud-summary": summarizeMobjectPointCloudTable(table)
  };
}
