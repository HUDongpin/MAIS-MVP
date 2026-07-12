import type { MathMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  removeSceneMobject,
  sceneRenderGroupIds,
  type MathSceneGraphStore
} from "./mathSceneGraph";

export const SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT =
  "Scene.remove: remove a mobject family from all render groups and prevent removed descendants from leaking through parent expansion" as const;

export type MathSceneRemoveMobjectBridgePlan = {
  afterFixedInFrameIds: string[];
  afterForegroundIds: string[];
  afterRenderGroupIds: string[];
  afterSceneIds: string[];
  beforeFixedInFrameIds: string[];
  beforeForegroundIds: string[];
  beforeRenderGroupIds: string[];
  beforeSceneIds: string[];
  descendantRemovedIds: string[];
  objectId: string;
  removed: boolean;
  removedFamilyCount: number;
  removedFamilyIds: string[];
  sourceContract: typeof SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-scene-remove-mobject-bridge/v1";
};

export type MathSceneRemoveMobjectBridgeInput = {
  familyIndex: MathMobjectFamilyIndex;
  objectId: string;
  store: MathSceneGraphStore;
};

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

function changedIds(beforeIds: string[], afterIds: string[]) {
  const afterSet = new Set(afterIds);
  return beforeIds.filter((id) => !afterSet.has(id));
}

function descendantIds(objectId: string, familyIds: string[]) {
  return familyIds.filter((id) => id !== objectId);
}

function renderGroupSnapshot(store: MathSceneGraphStore, familyIndex: MathMobjectFamilyIndex) {
  return sceneRenderGroupIds(store, familyIndex);
}

function buildSummary(plan: Omit<MathSceneRemoveMobjectBridgePlan, "sourceContract" | "summary" | "version">) {
  return [
    `scene-remove:${plan.objectId}`,
    `removed=${String(plan.removed)}`,
    `family=${summarizeIds(plan.removedFamilyIds)}`,
    `descendants=${summarizeIds(plan.descendantRemovedIds)}`,
    `render=${summarizeIds(plan.afterRenderGroupIds)}`
  ].join(":");
}

export function buildSceneRemoveMobjectBridgePlan(
  input: MathSceneRemoveMobjectBridgeInput
): MathSceneRemoveMobjectBridgePlan {
  const objectId = input.objectId.trim() || "none";
  const beforeGroups = renderGroupSnapshot(input.store, input.familyIndex);
  const nextStore = removeSceneMobject(input.store, objectId);
  const afterGroups = renderGroupSnapshot(nextStore, input.familyIndex);
  const removedFamilyIds = changedIds(nextStore.removedObjectIds, input.store.removedObjectIds);
  const removed = removedFamilyIds.length > 0;
  const planWithoutSummary = {
    afterFixedInFrameIds: afterGroups.fixedInFrame,
    afterForegroundIds: afterGroups.foreground,
    afterRenderGroupIds: afterGroups.all,
    afterSceneIds: afterGroups.scene,
    beforeFixedInFrameIds: beforeGroups.fixedInFrame,
    beforeForegroundIds: beforeGroups.foreground,
    beforeRenderGroupIds: beforeGroups.all,
    beforeSceneIds: beforeGroups.scene,
    descendantRemovedIds: removed ? descendantIds(objectId, removedFamilyIds) : [],
    objectId,
    removed,
    removedFamilyCount: removedFamilyIds.length,
    removedFamilyIds
  };

  return {
    ...planWithoutSummary,
    sourceContract: SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: buildSummary(planWithoutSummary),
    version: "mais-manim-scene-remove-mobject-bridge/v1"
  };
}

export function sceneRemoveMobjectBridgeDataAttributes(plan: MathSceneRemoveMobjectBridgePlan): Record<string, string> {
  return {
    "data-viz-scene-remove-mobject-after-fixed-in-frame-ids": summarizeIds(plan.afterFixedInFrameIds),
    "data-viz-scene-remove-mobject-after-foreground-ids": summarizeIds(plan.afterForegroundIds),
    "data-viz-scene-remove-mobject-after-render-group-ids": summarizeIds(plan.afterRenderGroupIds),
    "data-viz-scene-remove-mobject-after-scene-ids": summarizeIds(plan.afterSceneIds),
    "data-viz-scene-remove-mobject-before-fixed-in-frame-ids": summarizeIds(plan.beforeFixedInFrameIds),
    "data-viz-scene-remove-mobject-before-foreground-ids": summarizeIds(plan.beforeForegroundIds),
    "data-viz-scene-remove-mobject-before-render-group-ids": summarizeIds(plan.beforeRenderGroupIds),
    "data-viz-scene-remove-mobject-before-scene-ids": summarizeIds(plan.beforeSceneIds),
    "data-viz-scene-remove-mobject-descendant-removed-ids": summarizeIds(plan.descendantRemovedIds),
    "data-viz-scene-remove-mobject-object-id": plan.objectId,
    "data-viz-scene-remove-mobject-removed": String(plan.removed),
    "data-viz-scene-remove-mobject-removed-family-count": String(plan.removedFamilyCount),
    "data-viz-scene-remove-mobject-removed-family-ids": summarizeIds(plan.removedFamilyIds),
    "data-viz-scene-remove-mobject-source-contract": plan.sourceContract,
    "data-viz-scene-remove-mobject-summary": plan.summary
  };
}

export function serializeSceneRemoveMobjectBridgePlan(plan: MathSceneRemoveMobjectBridgePlan) {
  return stableSerialize(plan);
}
