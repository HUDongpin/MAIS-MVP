import type { MathMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  clearSceneMobjects,
  sceneRenderGroupIds,
  type MathSceneGraphStore
} from "./mathSceneGraph";

export const SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT =
  "Scene.clear: remove all visible mobject render groups while preserving the object catalog for later restore" as const;

export type MathSceneClearMobjectBridgePlan = {
  afterFixedInFrameIds: string[];
  afterForegroundIds: string[];
  afterRenderGroupIds: string[];
  afterSceneIds: string[];
  beforeFixedInFrameIds: string[];
  beforeForegroundIds: string[];
  beforeRenderGroupIds: string[];
  beforeSceneIds: string[];
  cleared: boolean;
  clearedObjectCount: number;
  clearedObjectIds: string[];
  objectCatalogCount: number;
  sourceContract: typeof SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-scene-clear-mobject-bridge/v1";
};

export type MathSceneClearMobjectBridgeInput = {
  enabled?: boolean;
  familyIndex: MathMobjectFamilyIndex;
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

function addedIds(beforeIds: string[], afterIds: string[]) {
  const beforeSet = new Set(beforeIds);
  return afterIds.filter((id) => !beforeSet.has(id));
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function renderGroupSnapshot(store: MathSceneGraphStore, familyIndex: MathMobjectFamilyIndex) {
  return sceneRenderGroupIds(store, familyIndex);
}

function buildSummary(plan: Omit<MathSceneClearMobjectBridgePlan, "sourceContract" | "summary" | "version">) {
  return [
    "scene-clear",
    `cleared=${String(plan.cleared)}`,
    `ids=${summarizeIds(plan.clearedObjectIds)}`,
    `render=${summarizeIds(plan.afterRenderGroupIds)}`,
    `catalog=${plan.objectCatalogCount}`
  ].join(":");
}

export function buildSceneClearMobjectBridgePlan(
  input: MathSceneClearMobjectBridgeInput
): MathSceneClearMobjectBridgePlan {
  const beforeGroups = renderGroupSnapshot(input.store, input.familyIndex);
  const nextStore = input.enabled === false ? input.store : clearSceneMobjects(input.store);
  const afterGroups = renderGroupSnapshot(nextStore, input.familyIndex);
  const clearedObjectIds = addedIds(input.store.removedObjectIds, nextStore.removedObjectIds);
  const cleared = clearedObjectIds.length > 0 ||
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
    cleared,
    clearedObjectCount: clearedObjectIds.length,
    clearedObjectIds,
    objectCatalogCount: Object.keys(input.store.byId).length
  };

  return {
    ...planWithoutSummary,
    sourceContract: SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: buildSummary(planWithoutSummary),
    version: "mais-manim-scene-clear-mobject-bridge/v1"
  };
}

export function sceneClearMobjectBridgeDataAttributes(plan: MathSceneClearMobjectBridgePlan): Record<string, string> {
  return {
    "data-viz-scene-clear-mobject-after-fixed-in-frame-ids": summarizeIds(plan.afterFixedInFrameIds),
    "data-viz-scene-clear-mobject-after-foreground-ids": summarizeIds(plan.afterForegroundIds),
    "data-viz-scene-clear-mobject-after-render-group-ids": summarizeIds(plan.afterRenderGroupIds),
    "data-viz-scene-clear-mobject-after-scene-ids": summarizeIds(plan.afterSceneIds),
    "data-viz-scene-clear-mobject-before-fixed-in-frame-ids": summarizeIds(plan.beforeFixedInFrameIds),
    "data-viz-scene-clear-mobject-before-foreground-ids": summarizeIds(plan.beforeForegroundIds),
    "data-viz-scene-clear-mobject-before-render-group-ids": summarizeIds(plan.beforeRenderGroupIds),
    "data-viz-scene-clear-mobject-before-scene-ids": summarizeIds(plan.beforeSceneIds),
    "data-viz-scene-clear-mobject-cleared": String(plan.cleared),
    "data-viz-scene-clear-mobject-cleared-object-count": String(plan.clearedObjectCount),
    "data-viz-scene-clear-mobject-cleared-object-ids": summarizeIds(plan.clearedObjectIds),
    "data-viz-scene-clear-mobject-object-catalog-count": String(plan.objectCatalogCount),
    "data-viz-scene-clear-mobject-source-contract": plan.sourceContract,
    "data-viz-scene-clear-mobject-summary": plan.summary
  };
}

export function serializeSceneClearMobjectBridgePlan(plan: MathSceneClearMobjectBridgePlan) {
  return stableSerialize(plan);
}
