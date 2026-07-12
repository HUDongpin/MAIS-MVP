import { buildMobjectFamilyIndex, type MathMobjectFamilyIndex } from "./mathMobjectFamily";
import { buildMobjectFamilyCachePlan, type MobjectFamilyCacheStatus } from "./mathMobjectFamilyCache";
import {
  MOBJECT_INVALIDATION_SOURCE_CONTRACT,
  buildMobjectInvalidationPlan,
  classifyMobjectInvalidationOwnership,
  invalidatedMobjectIds,
  type MobjectInvalidationOwnership,
  type MobjectInvalidationReason
} from "./mathMobjectInvalidation";
import { buildUpdaterSuspensionPlan } from "./mathUpdaterSuspension";
import type { MathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";

export { MOBJECT_INVALIDATION_SOURCE_CONTRACT };

export type MathMobjectDirtyStatePayloadRow = {
  dataHasChanged: boolean;
  familyHasChanged: boolean;
  invalidated: boolean;
  metadataHasChanged: boolean;
  needsNewBoundingBox: boolean;
  objectId: string;
  ownership: MobjectInvalidationOwnership;
  reasons: MobjectInvalidationReason[];
  uniformsHaveChanged: boolean;
};

export type MathMobjectDirtyStatePayload = {
  animationOwnedInvalidationCount: number;
  boundingBoxStaleCount: number;
  cacheStatus: MobjectFamilyCacheStatus;
  dataChangedCount: number;
  familyCacheReusable: boolean;
  familyChangedCount: number;
  invalidatedCount: number;
  invalidatedIds: string[];
  metadataChangedCount: number;
  recomputedFamilyCount: number;
  recomputedFamilyIds: string[];
  reusedFamilyCount: number;
  reusedFamilyIds: string[];
  rows: MathMobjectDirtyStatePayloadRow[];
  signature: string;
  sourceContract: typeof MOBJECT_INVALIDATION_SOURCE_CONTRACT;
  totalObjectCount: number;
  unchangedCount: number;
  unknownInvalidationCount: number;
  uniformsChangedCount: number;
  updaterActiveInvalidationCount: number;
};

export type MathMobjectDirtyStatePayloadInput = {
  previousRuntimeState?: MathSceneRuntimeState;
  reducedMotion?: boolean;
  runtimeState: MathSceneRuntimeState;
  scene: MathSceneSpec;
};

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

  return `mobject-dirty-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function sortedUniqueStrings(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function mobjectFamilyIdsForDirtyPayload(familyIndex: MathMobjectFamilyIndex, objectIds: string[]) {
  return sortedUniqueStrings(objectIds.flatMap((objectId) => familyIndex.byId[objectId]?.familyIds ?? [objectId]));
}

function activeUpdaterObjectIdsForDirtyPayload(runtimeState: MathSceneRuntimeState, activeUpdaterIds: string[]) {
  const activeIds = new Set(activeUpdaterIds);

  return sortedUniqueStrings(
    runtimeState.updaters.entries
      .filter((entry) => activeIds.has(entry.id))
      .map((entry) => entry.objectId)
  );
}

function dirtyRow({
  dataHasChanged,
  familyHasChanged,
  metadataHasChanged,
  needsNewBoundingBox,
  objectId,
  ownership,
  reasons,
  uniformsHaveChanged
}: {
  objectId: string;
  ownership: MobjectInvalidationOwnership;
  reasons: MobjectInvalidationReason[];
} & Pick<MathMobjectDirtyStatePayloadRow, "dataHasChanged" | "familyHasChanged" | "metadataHasChanged" | "needsNewBoundingBox" | "uniformsHaveChanged">): MathMobjectDirtyStatePayloadRow {
  return {
    dataHasChanged,
    familyHasChanged,
    invalidated: reasons.length > 0,
    metadataHasChanged,
    needsNewBoundingBox,
    objectId,
    ownership,
    reasons,
    uniformsHaveChanged
  };
}

export function summarizeMobjectDirtyStatePayload(payload: MathMobjectDirtyStatePayload) {
  return `mobject-dirty:status=${payload.cacheStatus}:invalidated=${payload.invalidatedCount}:data=${payload.dataChangedCount}:bbox=${payload.boundingBoxStaleCount}:family=${payload.familyChangedCount}:metadata=${payload.metadataChangedCount}:uniforms=${payload.uniformsChangedCount}:animation=${payload.animationOwnedInvalidationCount}:updater=${payload.updaterActiveInvalidationCount}:unknown=${payload.unknownInvalidationCount}:reused=${payload.reusedFamilyCount}:recomputed=${payload.recomputedFamilyCount}`;
}

export function buildMobjectDirtyStatePayload({
  previousRuntimeState,
  runtimeState,
  scene
}: MathMobjectDirtyStatePayloadInput): MathMobjectDirtyStatePayload {
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const previousFamilyIndex = previousRuntimeState ? buildMobjectFamilyIndex(previousRuntimeState.objectGraph) : undefined;
  const familyCachePlan = buildMobjectFamilyCachePlan({
    nextGraph: runtimeState.objectGraph,
    previousGraph: previousRuntimeState?.objectGraph,
    previousIndex: previousFamilyIndex
  });
  const invalidationPlan = buildMobjectInvalidationPlan(
    previousRuntimeState?.objectGraph ?? runtimeState.objectGraph,
    runtimeState.objectGraph
  );
  const updaterSuspension = buildUpdaterSuspensionPlan({
    familyIndex,
    scene,
    timeline: runtimeState.timeline,
    updaters: runtimeState.updaters
  });
  const ownershipPlan = classifyMobjectInvalidationOwnership(invalidationPlan, {
    activeUpdaterObjectIds: activeUpdaterObjectIdsForDirtyPayload(runtimeState, updaterSuspension.activeUpdaterIds),
    animationOwnedObjectIds: mobjectFamilyIdsForDirtyPayload(familyIndex, updaterSuspension.animatedObjectIds)
  });
  const invalidatedIds = invalidatedMobjectIds(invalidationPlan);
  const rows = invalidationPlan.objectIds.map((objectId) => {
    const record = invalidationPlan.byId[objectId];
    const ownershipRecord = ownershipPlan.byId[objectId];

    return dirtyRow({
      dataHasChanged: record?.dataHasChanged ?? false,
      familyHasChanged: record?.familyHasChanged ?? false,
      metadataHasChanged: record?.metadataHasChanged ?? false,
      needsNewBoundingBox: record?.needsNewBoundingBox ?? false,
      objectId,
      ownership: ownershipRecord?.ownership ?? "unknown",
      reasons: record?.reasons ?? [],
      uniformsHaveChanged: record?.uniformsHaveChanged ?? false
    });
  });
  const basePayload = {
    animationOwnedInvalidationCount: ownershipPlan.animationOwnedInvalidationCount,
    boundingBoxStaleCount: invalidationPlan.boundingBoxStaleCount,
    cacheStatus: familyCachePlan.cacheStatus,
    dataChangedCount: invalidationPlan.dataChangedCount,
    familyCacheReusable: familyCachePlan.familyCacheReusable,
    familyChangedCount: invalidationPlan.familyChangedCount,
    invalidatedCount: invalidatedIds.length,
    invalidatedIds,
    metadataChangedCount: invalidationPlan.metadataChangedCount,
    recomputedFamilyCount: familyCachePlan.recomputedFamilyCount,
    recomputedFamilyIds: familyCachePlan.recomputedFamilyIds,
    reusedFamilyCount: familyCachePlan.reusedFamilyCount,
    reusedFamilyIds: familyCachePlan.reusedFamilyIds,
    rows,
    totalObjectCount: invalidationPlan.objectIds.length,
    unchangedCount: invalidationPlan.unchangedCount,
    unknownInvalidationCount: ownershipPlan.unknownInvalidationCount,
    uniformsChangedCount: invalidationPlan.uniformsChangedCount,
    updaterActiveInvalidationCount: ownershipPlan.updaterActiveInvalidationCount
  };

  return {
    ...basePayload,
    signature: hashStableJson(stableSerialize(basePayload)),
    sourceContract: invalidationPlan.sourceContract
  };
}

export function serializeMobjectDirtyStatePayload(payload: MathMobjectDirtyStatePayload) {
  return escapedJson(stableSerialize(payload));
}

export function mobjectDirtyStatePayloadDataAttributes(payload: MathMobjectDirtyStatePayload) {
  return {
    "data-viz-mobject-dirty-animation-owned-count": String(payload.animationOwnedInvalidationCount),
    "data-viz-mobject-dirty-bounding-box-stale-count": String(payload.boundingBoxStaleCount),
    "data-viz-mobject-dirty-cache-status": payload.cacheStatus,
    "data-viz-mobject-dirty-data-changed-count": String(payload.dataChangedCount),
    "data-viz-mobject-dirty-family-cache-reusable": payload.familyCacheReusable ? "true" : "false",
    "data-viz-mobject-dirty-family-changed-count": String(payload.familyChangedCount),
    "data-viz-mobject-dirty-invalidated-count": String(payload.invalidatedCount),
    "data-viz-mobject-dirty-invalidated-ids": payload.invalidatedIds.length > 0 ? payload.invalidatedIds.join(",") : "none",
    "data-viz-mobject-dirty-metadata-changed-count": String(payload.metadataChangedCount),
    "data-viz-mobject-dirty-recomputed-family-count": String(payload.recomputedFamilyCount),
    "data-viz-mobject-dirty-reused-family-count": String(payload.reusedFamilyCount),
    "data-viz-mobject-dirty-signature": payload.signature,
    "data-viz-mobject-dirty-source-contract": payload.sourceContract,
    "data-viz-mobject-dirty-summary": summarizeMobjectDirtyStatePayload(payload),
    "data-viz-mobject-dirty-unknown-count": String(payload.unknownInvalidationCount),
    "data-viz-mobject-dirty-uniforms-changed-count": String(payload.uniformsChangedCount),
    "data-viz-mobject-dirty-updater-active-count": String(payload.updaterActiveInvalidationCount)
  };
}
