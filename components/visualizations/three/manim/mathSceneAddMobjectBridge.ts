import type { MathMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  addSceneMobject,
  sceneRenderGroupIds,
  type MathSceneGraphStore,
  type MathSceneRenderGroup
} from "./mathSceneGraph";

export const SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT =
  "Scene.add: assign a mobject to a render group, restore its family from removed state, and sort scene additions by z_index" as const;

export type MathSceneAddMobjectBridgePlan = {
  afterFixedInFrameIds: string[];
  afterForegroundIds: string[];
  afterRenderGroupIds: string[];
  afterSceneIds: string[];
  beforeFixedInFrameIds: string[];
  beforeForegroundIds: string[];
  beforeRenderGroupIds: string[];
  beforeSceneIds: string[];
  group: MathSceneRenderGroup;
  objectId: string;
  added: boolean;
  restoredFamilyCount: number;
  restoredFamilyIds: string[];
  sourceContract: typeof SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-scene-add-mobject-bridge/v1";
};

export type MathSceneAddMobjectBridgeInput = {
  familyIndex: MathMobjectFamilyIndex;
  group?: MathSceneRenderGroup;
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

function restoredIds(beforeIds: string[], afterIds: string[]) {
  const afterSet = new Set(afterIds);
  return beforeIds.filter((id) => !afterSet.has(id));
}

function groupForObject(store: MathSceneGraphStore, objectId: string): MathSceneRenderGroup {
  if (store.fixedInFrameIds.includes(objectId)) return "fixedInFrame";
  if (store.foregroundIds.includes(objectId)) return "foreground";
  return "scene";
}

function renderGroupSnapshot(store: MathSceneGraphStore, familyIndex: MathMobjectFamilyIndex) {
  return sceneRenderGroupIds(store, familyIndex);
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function buildSummary(plan: Omit<MathSceneAddMobjectBridgePlan, "sourceContract" | "summary" | "version">) {
  return [
    `scene-add:${plan.objectId}`,
    `group=${plan.group}`,
    `added=${String(plan.added)}`,
    `restored=${summarizeIds(plan.restoredFamilyIds)}`,
    `render=${summarizeIds(plan.afterRenderGroupIds)}`
  ].join(":");
}

export function buildSceneAddMobjectBridgePlan(input: MathSceneAddMobjectBridgeInput): MathSceneAddMobjectBridgePlan {
  const objectId = input.objectId.trim() || "none";
  const group = input.group ?? groupForObject(input.store, objectId);
  const beforeGroups = renderGroupSnapshot(input.store, input.familyIndex);
  const nextStore = addSceneMobject(input.store, objectId, { group });
  const afterGroups = renderGroupSnapshot(nextStore, input.familyIndex);
  const restoredFamilyIds = restoredIds(input.store.removedObjectIds, nextStore.removedObjectIds);
  const added = restoredFamilyIds.length > 0 ||
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
    group,
    objectId,
    added,
    restoredFamilyCount: restoredFamilyIds.length,
    restoredFamilyIds
  };

  return {
    ...planWithoutSummary,
    sourceContract: SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: buildSummary(planWithoutSummary),
    version: "mais-manim-scene-add-mobject-bridge/v1"
  };
}

export function sceneAddMobjectBridgeDataAttributes(plan: MathSceneAddMobjectBridgePlan): Record<string, string> {
  return {
    "data-viz-scene-add-mobject-after-fixed-in-frame-ids": summarizeIds(plan.afterFixedInFrameIds),
    "data-viz-scene-add-mobject-after-foreground-ids": summarizeIds(plan.afterForegroundIds),
    "data-viz-scene-add-mobject-after-render-group-ids": summarizeIds(plan.afterRenderGroupIds),
    "data-viz-scene-add-mobject-after-scene-ids": summarizeIds(plan.afterSceneIds),
    "data-viz-scene-add-mobject-before-fixed-in-frame-ids": summarizeIds(plan.beforeFixedInFrameIds),
    "data-viz-scene-add-mobject-before-foreground-ids": summarizeIds(plan.beforeForegroundIds),
    "data-viz-scene-add-mobject-before-render-group-ids": summarizeIds(plan.beforeRenderGroupIds),
    "data-viz-scene-add-mobject-before-scene-ids": summarizeIds(plan.beforeSceneIds),
    "data-viz-scene-add-mobject-added": String(plan.added),
    "data-viz-scene-add-mobject-group": plan.group,
    "data-viz-scene-add-mobject-object-id": plan.objectId,
    "data-viz-scene-add-mobject-restored-family-count": String(plan.restoredFamilyCount),
    "data-viz-scene-add-mobject-restored-family-ids": summarizeIds(plan.restoredFamilyIds),
    "data-viz-scene-add-mobject-source-contract": plan.sourceContract,
    "data-viz-scene-add-mobject-summary": plan.summary
  };
}

export function serializeSceneAddMobjectBridgePlan(plan: MathSceneAddMobjectBridgePlan) {
  return stableSerialize(plan);
}
