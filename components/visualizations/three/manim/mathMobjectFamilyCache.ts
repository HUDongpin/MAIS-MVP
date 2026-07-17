import { buildMobjectInvalidationPlan } from "./mathMobjectInvalidation";
import { buildMobjectFamilyIndex, type MathMobjectFamilyIndex } from "./mathMobjectFamily";
import type { MathObjectGraph } from "./mathSceneRuntimeState";

export const MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT =
  "Mobject.get_family cache|family invalidation|_data_has_changed";

export type MobjectFamilyCacheStatus = "cache-hit" | "cold-miss" | "family-dirty";

export type MobjectFamilyCachePlan = {
  cacheStatus: MobjectFamilyCacheStatus;
  dataDirtyCount: number;
  familyCacheReusable: boolean;
  familyDirtyCount: number;
  recomputedFamilyCount: number;
  recomputedFamilyIds: string[];
  reusedFamilyCount: number;
  reusedFamilyIds: string[];
  sourceContract: typeof MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT;
};

export type MobjectFamilyCacheInput = {
  nextGraph: MathObjectGraph;
  previousGraph?: MathObjectGraph;
  previousIndex?: MathMobjectFamilyIndex;
};

function sortedIds(ids: string[]) {
  return [...ids].sort((left, right) => left.localeCompare(right));
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

function familyTopologyDirtyReasons(reasons: string[]) {
  return reasons.some((reason) => reason === "family-changed" || reason === "missing-next" || reason === "missing-previous");
}

function addObjectAndAncestors(affectedIds: Set<string>, graph: MathObjectGraph, objectId: string) {
  let currentId: string | undefined = objectId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    if (graph.byId[currentId]) affectedIds.add(currentId);
    currentId = graph.byId[currentId]?.parentId;
  }
}

function affectedFamilyIdsForTopologyChange(
  dirtyObjectIds: string[],
  previousGraph: MathObjectGraph,
  nextGraph: MathObjectGraph,
  nextIndex: MathMobjectFamilyIndex
) {
  const affectedIds = new Set<string>();

  for (const objectId of dirtyObjectIds) {
    addObjectAndAncestors(affectedIds, previousGraph, objectId);
    addObjectAndAncestors(affectedIds, nextGraph, objectId);
  }

  return sortedIds([...affectedIds].filter((objectId) => Boolean(nextIndex.byId[objectId])));
}

function coldMiss(nextGraph: MathObjectGraph): MobjectFamilyCachePlan {
  const recomputedFamilyIds = sortedIds(Object.keys(nextGraph.byId));

  return {
    cacheStatus: "cold-miss",
    dataDirtyCount: 0,
    familyCacheReusable: false,
    familyDirtyCount: recomputedFamilyIds.length,
    recomputedFamilyCount: recomputedFamilyIds.length,
    recomputedFamilyIds,
    reusedFamilyCount: 0,
    reusedFamilyIds: [],
    sourceContract: MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT
  };
}

export function buildMobjectFamilyCachePlan({
  nextGraph,
  previousGraph,
  previousIndex
}: MobjectFamilyCacheInput): MobjectFamilyCachePlan {
  if (!previousGraph || !previousIndex) return coldMiss(nextGraph);

  const nextIndex = buildMobjectFamilyIndex(nextGraph);
  const invalidation = buildMobjectInvalidationPlan(previousGraph, nextGraph);
  const familyDirtyIds = invalidation.objectIds.filter((objectId) =>
    familyTopologyDirtyReasons(invalidation.byId[objectId]?.reasons ?? [])
  );
  const dataDirtyIds = invalidation.objectIds.filter((objectId) => {
    const record = invalidation.byId[objectId];
    return record?.dataHasChanged && !familyTopologyDirtyReasons(record.reasons);
  });
  const familyCacheReusable = familyDirtyIds.length === 0;
  const recomputedFamilyIds = familyCacheReusable
    ? []
    : affectedFamilyIdsForTopologyChange(familyDirtyIds, previousGraph, nextGraph, nextIndex);
  const recomputedFamilyIdSet = new Set(recomputedFamilyIds);
  const reusedFamilyIds = sortedIds(Object.keys(nextIndex.byId).filter((objectId) => !recomputedFamilyIdSet.has(objectId)));

  return {
    cacheStatus: familyCacheReusable ? "cache-hit" : "family-dirty",
    dataDirtyCount: dataDirtyIds.length,
    familyCacheReusable,
    familyDirtyCount: familyDirtyIds.length,
    recomputedFamilyCount: recomputedFamilyIds.length,
    recomputedFamilyIds,
    reusedFamilyCount: reusedFamilyIds.length,
    reusedFamilyIds,
    sourceContract: MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT
  };
}

export function summarizeMobjectFamilyCachePlan(plan: MobjectFamilyCachePlan) {
  return [
    `status=${plan.cacheStatus}`,
    `reusable=${plan.familyCacheReusable ? "true" : "false"}`,
    `familyDirty=${plan.familyDirtyCount}`,
    `dataDirty=${plan.dataDirtyCount}`,
    `reused=${plan.reusedFamilyCount}`,
    `recomputed=${plan.recomputedFamilyCount}`
  ].join(";");
}

function joinedIds(ids: string[]) {
  return ids.length > 0 ? ids.join(",") : "none";
}

export function mobjectFamilyCacheDataAttributes(plan: MobjectFamilyCachePlan): Record<string, string> {
  return {
    "data-viz-mobject-family-cache-data-dirty-count": String(plan.dataDirtyCount),
    "data-viz-mobject-family-cache-family-dirty-count": String(plan.familyDirtyCount),
    "data-viz-mobject-family-cache-recomputed-count": String(plan.recomputedFamilyCount),
    "data-viz-mobject-family-cache-recomputed-ids": joinedIds(plan.recomputedFamilyIds),
    "data-viz-mobject-family-cache-reusable": plan.familyCacheReusable ? "true" : "false",
    "data-viz-mobject-family-cache-reused-count": String(plan.reusedFamilyCount),
    "data-viz-mobject-family-cache-reused-ids": joinedIds(plan.reusedFamilyIds),
    "data-viz-mobject-family-cache-source-contract": plan.sourceContract,
    "data-viz-mobject-family-cache-status": plan.cacheStatus,
    "data-viz-mobject-family-cache-summary": summarizeMobjectFamilyCachePlan(plan)
  };
}

export function serializeMobjectFamilyCachePlan(plan: MobjectFamilyCachePlan) {
  return stableSerialize(plan);
}
