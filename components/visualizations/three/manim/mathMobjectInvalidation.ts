import { effectiveMobjectBoundingBox } from "./mathMobjectBoundingBox";
import type { MathObjectGraph, RuntimeMathObjectNode } from "./mathSceneRuntimeState";

export const MOBJECT_INVALIDATION_SOURCE_CONTRACT =
  "Mobject._data_has_changed|_needs_new_bounding_box|family dirty state";

export type MobjectInvalidationReason =
  | "bounding-box-changed"
  | "family-changed"
  | "metadata-changed"
  | "missing-next"
  | "missing-previous"
  | "render-state-changed"
  | "uniforms-changed";

export type MobjectInvalidationRecord = {
  dataHasChanged: boolean;
  familyHasChanged: boolean;
  metadataHasChanged: boolean;
  needsNewBoundingBox: boolean;
  objectId: string;
  reasons: MobjectInvalidationReason[];
  uniformsHaveChanged: boolean;
};

export type MobjectInvalidationPlan = {
  boundingBoxStaleCount: number;
  byId: Record<string, MobjectInvalidationRecord>;
  dataChangedCount: number;
  familyChangedCount: number;
  metadataChangedCount: number;
  objectIds: string[];
  sourceContract: typeof MOBJECT_INVALIDATION_SOURCE_CONTRACT;
  unchangedCount: number;
  uniformsChangedCount: number;
};

export type MobjectInvalidationOwnership = "animation-owned" | "unknown" | "updater-active";

export type MobjectInvalidationOwnershipRecord = {
  objectId: string;
  ownership: MobjectInvalidationOwnership;
  reasons: MobjectInvalidationReason[];
};

export type MobjectInvalidationOwnershipPlan = {
  animationOwnedInvalidationCount: number;
  byId: Record<string, MobjectInvalidationOwnershipRecord>;
  invalidatedObjectIds: string[];
  unknownInvalidationCount: number;
  updaterActiveInvalidationCount: number;
};

export type MobjectInvalidationOwnershipInput = {
  activeUpdaterObjectIds?: string[];
  animationOwnedObjectIds?: string[];
};

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function changed(left: unknown, right: unknown) {
  return stableSerialize(left) !== stableSerialize(right);
}

function uniqueSortedIds(previous: MathObjectGraph, next: MathObjectGraph) {
  return Array.from(new Set([...Object.keys(previous.byId), ...Object.keys(next.byId)])).sort();
}

function metadataChanged(previous: RuntimeMathObjectNode, next: RuntimeMathObjectNode) {
  return (
    previous.colorRole !== next.colorRole ||
    previous.conceptId !== next.conceptId ||
    previous.parentId !== next.parentId ||
    previous.type !== next.type
  );
}

function recordForObject(
  objectId: string,
  previous: RuntimeMathObjectNode | undefined,
  next: RuntimeMathObjectNode | undefined
): MobjectInvalidationRecord {
  if (!previous) {
    return {
      dataHasChanged: true,
      familyHasChanged: false,
      metadataHasChanged: false,
      needsNewBoundingBox: true,
      objectId,
      reasons: ["missing-previous"],
      uniformsHaveChanged: false
    };
  }

  if (!next) {
    return {
      dataHasChanged: true,
      familyHasChanged: false,
      metadataHasChanged: false,
      needsNewBoundingBox: true,
      objectId,
      reasons: ["missing-next"],
      uniformsHaveChanged: false
    };
  }

  const renderStateChanged = changed(previous.renderState, next.renderState);
  const boundingBoxChanged = changed(effectiveMobjectBoundingBox(previous), effectiveMobjectBoundingBox(next));
  const familyHasChanged = changed(previous.childIds, next.childIds) || previous.parentId !== next.parentId;
  const metadataHasChanged = metadataChanged(previous, next);
  const uniformsHaveChanged = changed(previous.uniforms, next.uniforms);
  const reasons: MobjectInvalidationReason[] = [];

  if (renderStateChanged) reasons.push("render-state-changed");
  if (boundingBoxChanged) reasons.push("bounding-box-changed");
  if (familyHasChanged) reasons.push("family-changed");
  if (metadataHasChanged) reasons.push("metadata-changed");
  if (uniformsHaveChanged) reasons.push("uniforms-changed");

  return {
    dataHasChanged: renderStateChanged || metadataHasChanged || uniformsHaveChanged,
    familyHasChanged,
    metadataHasChanged,
    needsNewBoundingBox: renderStateChanged || familyHasChanged || boundingBoxChanged,
    objectId,
    reasons,
    uniformsHaveChanged
  };
}

export function buildMobjectInvalidationPlan(
  previous: MathObjectGraph,
  next: MathObjectGraph
): MobjectInvalidationPlan {
  const objectIds = uniqueSortedIds(previous, next);
  const records = objectIds.map((objectId) => recordForObject(objectId, previous.byId[objectId], next.byId[objectId]));
  const byId = Object.fromEntries(records.map((record) => [record.objectId, record]));

  return {
    boundingBoxStaleCount: records.filter((record) => record.needsNewBoundingBox).length,
    byId,
    dataChangedCount: records.filter((record) => record.dataHasChanged).length,
    familyChangedCount: records.filter((record) => record.familyHasChanged).length,
    metadataChangedCount: records.filter((record) => record.metadataHasChanged).length,
    objectIds,
    sourceContract: MOBJECT_INVALIDATION_SOURCE_CONTRACT,
    unchangedCount: records.filter(
      (record) =>
        !record.dataHasChanged &&
        !record.familyHasChanged &&
        !record.metadataHasChanged &&
        !record.needsNewBoundingBox &&
        !record.uniformsHaveChanged
    ).length,
    uniformsChangedCount: records.filter((record) => record.uniformsHaveChanged).length
  };
}

export function summarizeMobjectInvalidation(plan: MobjectInvalidationPlan) {
  return [
    `data=${plan.dataChangedCount}`,
    `bbox=${plan.boundingBoxStaleCount}`,
    `family=${plan.familyChangedCount}`,
    `metadata=${plan.metadataChangedCount}`,
    `uniforms=${plan.uniformsChangedCount}`,
    `unchanged=${plan.unchangedCount}`
  ].join(";");
}

export function serializeMobjectInvalidationPlan(plan: MobjectInvalidationPlan) {
  return escapedJson(stableSerialize(plan));
}

function isInvalidated(record: MobjectInvalidationRecord) {
  return record.reasons.length > 0;
}

export function invalidatedMobjectIds(plan: MobjectInvalidationPlan) {
  return plan.objectIds.filter((objectId) => isInvalidated(plan.byId[objectId]));
}

export function summarizeMobjectInvalidationReasons(plan: MobjectInvalidationPlan) {
  const summaries = invalidatedMobjectIds(plan).map((objectId) => {
    const reasons = plan.byId[objectId]?.reasons ?? [];
    return `${objectId}:${reasons.join(",") || "none"}`;
  });

  return summaries.join("|") || "none";
}

function ownershipForObjectId(
  objectId: string,
  animationOwnedObjectIds: ReadonlySet<string>,
  activeUpdaterObjectIds: ReadonlySet<string>
): MobjectInvalidationOwnership {
  if (animationOwnedObjectIds.has(objectId)) return "animation-owned";
  if (activeUpdaterObjectIds.has(objectId)) return "updater-active";
  return "unknown";
}

export function classifyMobjectInvalidationOwnership(
  plan: MobjectInvalidationPlan,
  { activeUpdaterObjectIds = [], animationOwnedObjectIds = [] }: MobjectInvalidationOwnershipInput = {}
): MobjectInvalidationOwnershipPlan {
  const animationOwned = new Set(animationOwnedObjectIds);
  const activeUpdater = new Set(activeUpdaterObjectIds);
  const invalidatedObjectIds = invalidatedMobjectIds(plan);
  const records = invalidatedObjectIds.map((objectId) => ({
    objectId,
    ownership: ownershipForObjectId(objectId, animationOwned, activeUpdater),
    reasons: plan.byId[objectId]?.reasons ?? []
  }));

  return {
    animationOwnedInvalidationCount: records.filter((record) => record.ownership === "animation-owned").length,
    byId: Object.fromEntries(records.map((record) => [record.objectId, record])),
    invalidatedObjectIds,
    unknownInvalidationCount: records.filter((record) => record.ownership === "unknown").length,
    updaterActiveInvalidationCount: records.filter((record) => record.ownership === "updater-active").length
  };
}

export function summarizeMobjectInvalidationOwnership(plan: MobjectInvalidationOwnershipPlan) {
  const summaries = plan.invalidatedObjectIds.map((objectId) => `${objectId}:${plan.byId[objectId]?.ownership ?? "unknown"}`);
  return summaries.join("|") || "none";
}
