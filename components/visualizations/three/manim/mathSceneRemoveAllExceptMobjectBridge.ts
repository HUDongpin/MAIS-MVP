import type { MathMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  removeAllExceptSceneMobjects,
  sceneRenderGroupIds,
  type MathSceneGraphStore
} from "./mathSceneGraph";

export const SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT =
  "Scene.remove_all_except: clear scene render groups, then restore requested mobjects with Scene.add z_index semantics" as const;

export type MathSceneRemoveAllExceptMobjectBridgePlan = {
  afterFixedInFrameIds: string[];
  afterForegroundIds: string[];
  afterRenderGroupIds: string[];
  afterSceneIds: string[];
  beforeFixedInFrameIds: string[];
  beforeForegroundIds: string[];
  beforeRenderGroupIds: string[];
  beforeSceneIds: string[];
  changed: boolean;
  keptObjectCount: number;
  keptObjectIds: string[];
  objectCatalogCount: number;
  removedObjectCount: number;
  removedObjectIds: string[];
  requestedKeepIds: string[];
  sourceContract: typeof SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-scene-remove-all-except-mobject-bridge/v1";
};

export type MathSceneRemoveAllExceptMobjectBridgeInput = {
  enabled?: boolean;
  familyIndex: MathMobjectFamilyIndex;
  objectIdsToKeep: string[];
  store: MathSceneGraphStore;
};

function summarizeIds(ids: string[]) {
  return ids.join(",") || "none";
}
function uniqueNonEmptyIds(ids: string[]) {
  const seen = new Set<string>();
  return ids
    .map((id) => id.trim())
    .filter((id) => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
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

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function renderGroupSnapshot(store: MathSceneGraphStore, familyIndex: MathMobjectFamilyIndex) {
  return sceneRenderGroupIds(store, familyIndex);
}

function changedIds(beforeIds: string[], afterIds: string[]) {
  const beforeSet = new Set(beforeIds);
  return afterIds.filter((id) => !beforeSet.has(id));
}

function validKeepIds(store: MathSceneGraphStore, requestedKeepIds: string[]) {
  return requestedKeepIds.filter((id) => Boolean(store.byId[id]));
}

function buildSummary(
  plan: Omit<MathSceneRemoveAllExceptMobjectBridgePlan, "sourceContract" | "summary" | "version">
) {
  return [
    `scene-remove-all-except:keep=${summarizeIds(plan.keptObjectIds)}`,
    `changed=${String(plan.changed)}`,
    `removed=${summarizeIds(plan.removedObjectIds)}`,
    `render=${summarizeIds(plan.afterRenderGroupIds)}`,
    `catalog=${plan.objectCatalogCount}`
  ].join(":");
}

export function buildSceneRemoveAllExceptMobjectBridgePlan(
  input: MathSceneRemoveAllExceptMobjectBridgeInput
): MathSceneRemoveAllExceptMobjectBridgePlan {
  const requestedKeepIds = uniqueNonEmptyIds(input.objectIdsToKeep);
  const beforeGroups = renderGroupSnapshot(input.store, input.familyIndex);
  const nextStore = input.enabled === false ? input.store : removeAllExceptSceneMobjects(input.store, requestedKeepIds);
  const afterGroups = renderGroupSnapshot(nextStore, input.familyIndex);
  const keptObjectIds = input.enabled === false ? [] : validKeepIds(input.store, requestedKeepIds);
  const removedObjectIds = input.enabled === false ? [] : changedIds(input.store.removedObjectIds, nextStore.removedObjectIds);
  const changed = removedObjectIds.length > 0 ||
    !sameIds(beforeGroups.scene, afterGroups.scene) ||
    !sameIds(beforeGroups.foreground, afterGroups.foreground) ||
    !sameIds(beforeGroups.fixedInFrame, afterGroups.fixedInFrame) ||
    !sameIds(beforeGroups.all, afterGroups.all);
  const planWithoutSummary = {
    afterFixedInFrameIds: afterGroups.fixedInFrame,
    afterForegroundIds: afterGroups.foreground,
    afterRenderGroupIds: afterGroups.all,
    afterSceneIds: afterGroups.scene,
    beforeFixedInFrameIds: beforeGroups.fixedInFrame,
    beforeForegroundIds: beforeGroups.foreground,
    beforeRenderGroupIds: beforeGroups.all,
    beforeSceneIds: beforeGroups.scene,
    changed,
    keptObjectCount: keptObjectIds.length,
    keptObjectIds,
    objectCatalogCount: Object.keys(input.store.byId).length,
    removedObjectCount: removedObjectIds.length,
    removedObjectIds,
    requestedKeepIds
  };

  return {
    ...planWithoutSummary,
    sourceContract: SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: buildSummary(planWithoutSummary),
    version: "mais-manim-scene-remove-all-except-mobject-bridge/v1"
  };
}

export function sceneRemoveAllExceptMobjectBridgeDataAttributes(
  plan: MathSceneRemoveAllExceptMobjectBridgePlan
): Record<string, string> {
  return {
    "data-viz-scene-remove-all-except-mobject-after-fixed-in-frame-ids": summarizeIds(plan.afterFixedInFrameIds),
    "data-viz-scene-remove-all-except-mobject-after-foreground-ids": summarizeIds(plan.afterForegroundIds),
    "data-viz-scene-remove-all-except-mobject-after-render-group-ids": summarizeIds(plan.afterRenderGroupIds),
    "data-viz-scene-remove-all-except-mobject-after-scene-ids": summarizeIds(plan.afterSceneIds),
    "data-viz-scene-remove-all-except-mobject-before-fixed-in-frame-ids": summarizeIds(plan.beforeFixedInFrameIds),
    "data-viz-scene-remove-all-except-mobject-before-foreground-ids": summarizeIds(plan.beforeForegroundIds),
    "data-viz-scene-remove-all-except-mobject-before-render-group-ids": summarizeIds(plan.beforeRenderGroupIds),
    "data-viz-scene-remove-all-except-mobject-before-scene-ids": summarizeIds(plan.beforeSceneIds),
    "data-viz-scene-remove-all-except-mobject-changed": String(plan.changed),
    "data-viz-scene-remove-all-except-mobject-kept-count": String(plan.keptObjectCount),
    "data-viz-scene-remove-all-except-mobject-kept-ids": summarizeIds(plan.keptObjectIds),
    "data-viz-scene-remove-all-except-mobject-object-catalog-count": String(plan.objectCatalogCount),
    "data-viz-scene-remove-all-except-mobject-removed-count": String(plan.removedObjectCount),
    "data-viz-scene-remove-all-except-mobject-removed-ids": summarizeIds(plan.removedObjectIds),
    "data-viz-scene-remove-all-except-mobject-requested-keep-ids": summarizeIds(plan.requestedKeepIds),
    "data-viz-scene-remove-all-except-mobject-source-contract": plan.sourceContract,
    "data-viz-scene-remove-all-except-mobject-summary": plan.summary
  };
}

export function serializeSceneRemoveAllExceptMobjectBridgePlan(plan: MathSceneRemoveAllExceptMobjectBridgePlan) {
  return stableSerialize(plan);
}
