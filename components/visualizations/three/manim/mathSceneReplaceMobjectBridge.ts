import type { MathMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  replaceSceneMobject,
  sceneRenderGroupIds,
  type MathSceneGraphStore,
  type MathSceneRenderGroup
} from "./mathSceneGraph";

export const SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT =
  "Scene.replace: remove old mobject family, insert replacement mobjects in the same render group/order, and restore replacement families from removed state" as const;

export type MathSceneReplaceMobjectBridgePlan = {
  afterRenderGroupIds: string[];
  beforeRenderGroupIds: string[];
  group: MathSceneRenderGroup;
  objectId: string;
  removedFamilyIds: string[];
  replaced: boolean;
  replacementCount: number;
  replacementIds: string[];
  requestedReplacementIds: string[];
  restoredReplacementFamilyIds: string[];
  sourceContract: typeof SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-scene-replace-mobject-bridge/v1";
};

export type MathSceneReplaceMobjectBridgeInput = {
  familyIndex: MathMobjectFamilyIndex;
  group?: MathSceneRenderGroup;
  objectId: string;
  replacementIds: string[];
  store: MathSceneGraphStore;
};

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

function summarizeIds(ids: string[]) {
  return ids.join(",") || "none";
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

function groupIds(store: MathSceneGraphStore, group: MathSceneRenderGroup) {
  if (group === "fixedInFrame") return store.fixedInFrameIds;
  if (group === "foreground") return store.foregroundIds;
  return store.sceneIds;
}

function groupForObject(store: MathSceneGraphStore, objectId: string): MathSceneRenderGroup {
  if (store.fixedInFrameIds.includes(objectId)) return "fixedInFrame";
  if (store.foregroundIds.includes(objectId)) return "foreground";
  return "scene";
}

function changedIds(beforeIds: string[], afterIds: string[]) {
  const afterSet = new Set(afterIds);
  return beforeIds.filter((id) => !afterSet.has(id));
}

function restoredIds(beforeIds: string[], afterIds: string[]) {
  const afterSet = new Set(afterIds);
  return beforeIds.filter((id) => !afterSet.has(id));
}

function buildSummary(plan: Omit<MathSceneReplaceMobjectBridgePlan, "sourceContract" | "summary" | "version">) {
  return [
    `scene-replace:${plan.objectId}->${summarizeIds(plan.replacementIds)}`,
    `group=${plan.group}`,
    `replaced=${String(plan.replaced)}`,
    `removed=${summarizeIds(plan.removedFamilyIds)}`,
    `restored=${summarizeIds(plan.restoredReplacementFamilyIds)}`
  ].join(":");
}

export function buildSceneReplaceMobjectBridgePlan(
  input: MathSceneReplaceMobjectBridgeInput
): MathSceneReplaceMobjectBridgePlan {
  const objectId = input.objectId.trim() || "none";
  const requestedReplacementIds = uniqueNonEmptyIds(input.replacementIds);
  const replacementIds = requestedReplacementIds.filter((id) => id !== objectId && Boolean(input.store.byId[id]));
  const group = input.group ?? groupForObject(input.store, objectId);
  const beforeRenderGroupIds = sceneRenderGroupIds(input.store, input.familyIndex).all;
  const beforeGroupIds = groupIds(input.store, group);
  const nextStore = replaceSceneMobject(input.store, objectId, replacementIds, { group });
  const afterRenderGroupIds = sceneRenderGroupIds(nextStore, input.familyIndex).all;
  const replaced = Boolean(input.store.byId[objectId] && beforeGroupIds.includes(objectId)) &&
    (
      beforeRenderGroupIds.length !== afterRenderGroupIds.length ||
      beforeRenderGroupIds.some((id, index) => id !== afterRenderGroupIds[index])
    );
  const removedFamilyIds = replaced ? changedIds(nextStore.removedObjectIds, input.store.removedObjectIds) : [];
  const restoredReplacementFamilyIds = replaced ? restoredIds(input.store.removedObjectIds, nextStore.removedObjectIds) : [];
  const planWithoutSummary = {
    afterRenderGroupIds,
    beforeRenderGroupIds,
    group,
    objectId,
    removedFamilyIds,
    replaced,
    replacementCount: replacementIds.length,
    replacementIds,
    requestedReplacementIds,
    restoredReplacementFamilyIds
  };

  return {
    ...planWithoutSummary,
    sourceContract: SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: buildSummary(planWithoutSummary),
    version: "mais-manim-scene-replace-mobject-bridge/v1"
  };
}

export function sceneReplaceMobjectBridgeDataAttributes(plan: MathSceneReplaceMobjectBridgePlan): Record<string, string> {
  return {
    "data-viz-scene-replace-mobject-after-render-group-ids": summarizeIds(plan.afterRenderGroupIds),
    "data-viz-scene-replace-mobject-before-render-group-ids": summarizeIds(plan.beforeRenderGroupIds),
    "data-viz-scene-replace-mobject-group": plan.group,
    "data-viz-scene-replace-mobject-object-id": plan.objectId,
    "data-viz-scene-replace-mobject-removed-family-ids": summarizeIds(plan.removedFamilyIds),
    "data-viz-scene-replace-mobject-replaced": String(plan.replaced),
    "data-viz-scene-replace-mobject-replacement-count": String(plan.replacementCount),
    "data-viz-scene-replace-mobject-replacement-ids": summarizeIds(plan.replacementIds),
    "data-viz-scene-replace-mobject-requested-replacement-ids": summarizeIds(plan.requestedReplacementIds),
    "data-viz-scene-replace-mobject-restored-replacement-family-ids": summarizeIds(plan.restoredReplacementFamilyIds),
    "data-viz-scene-replace-mobject-source-contract": plan.sourceContract,
    "data-viz-scene-replace-mobject-summary": plan.summary
  };
}

export function serializeSceneReplaceMobjectBridgePlan(plan: MathSceneReplaceMobjectBridgePlan) {
  return stableSerialize(plan);
}
