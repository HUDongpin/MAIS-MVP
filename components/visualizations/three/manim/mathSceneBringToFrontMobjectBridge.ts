import type { MathMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  bringSceneMobjectToFront,
  sceneRenderGroupIds,
  type MathSceneGraphStore,
  type MathSceneRenderGroup
} from "./mathSceneGraph";

export const SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT =
  "Scene.bring_to_front: reorder a mobject within its render group so it draws after sibling mobjects while preserving family expansion" as const;

export type MathSceneBringToFrontMobjectBridgePlan = {
  afterFixedInFrameIds: string[];
  afterForegroundIds: string[];
  afterRenderGroupIds: string[];
  afterSceneIds: string[];
  beforeFixedInFrameIds: string[];
  beforeForegroundIds: string[];
  beforeRenderGroupIds: string[];
  beforeSceneIds: string[];
  group: MathSceneRenderGroup;
  moved: boolean;
  nextIndex: number;
  objectId: string;
  previousIndex: number;
  sourceContract: typeof SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-scene-bring-to-front-mobject-bridge/v1";
};

export type MathSceneBringToFrontMobjectBridgeInput = {
  enabled?: boolean;
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

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function renderGroupSnapshot(store: MathSceneGraphStore, familyIndex: MathMobjectFamilyIndex) {
  return sceneRenderGroupIds(store, familyIndex);
}

function groupForObject(store: MathSceneGraphStore, objectId: string): MathSceneRenderGroup {
  if (store.fixedInFrameIds.includes(objectId)) return "fixedInFrame";
  if (store.foregroundIds.includes(objectId)) return "foreground";
  return "scene";
}

function groupIds(store: MathSceneGraphStore, group: MathSceneRenderGroup) {
  if (group === "fixedInFrame") return store.fixedInFrameIds;
  if (group === "foreground") return store.foregroundIds;
  return store.sceneIds;
}

function indexOfOrFallback(ids: string[], objectId: string, fallback: number) {
  const index = ids.indexOf(objectId);
  return index >= 0 ? index : fallback;
}

function buildSummary(
  plan: Omit<MathSceneBringToFrontMobjectBridgePlan, "sourceContract" | "summary" | "version">
) {
  return [
    `scene-bring-to-front:${plan.objectId}`,
    `group=${plan.group}`,
    `moved=${String(plan.moved)}`,
    `index=${plan.previousIndex}->${plan.nextIndex}`,
    `render=${summarizeIds(plan.afterRenderGroupIds)}`
  ].join(":");
}

export function buildSceneBringToFrontMobjectBridgePlan(
  input: MathSceneBringToFrontMobjectBridgeInput
): MathSceneBringToFrontMobjectBridgePlan {
  const objectId = input.objectId.trim() || "none";
  const group = input.group ?? groupForObject(input.store, objectId);
  const beforeGroups = renderGroupSnapshot(input.store, input.familyIndex);
  const beforeGroupIds = groupIds(input.store, group);
  const nextStore = input.enabled === false ? input.store : bringSceneMobjectToFront(input.store, objectId, { group });
  const afterGroups = renderGroupSnapshot(nextStore, input.familyIndex);
  const afterGroupIds = groupIds(nextStore, group);
  const previousIndex = indexOfOrFallback(beforeGroupIds, objectId, -1);
  const nextIndex = input.enabled === false ? previousIndex : indexOfOrFallback(afterGroupIds, objectId, -1);
  const moved = input.enabled !== false && (
    previousIndex !== nextIndex ||
    !sameIds(beforeGroups.scene, afterGroups.scene) ||
    !sameIds(beforeGroups.foreground, afterGroups.foreground) ||
    !sameIds(beforeGroups.fixedInFrame, afterGroups.fixedInFrame) ||
    !sameIds(beforeGroups.all, afterGroups.all)
  );
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
    moved,
    nextIndex,
    objectId,
    previousIndex
  };

  return {
    ...planWithoutSummary,
    sourceContract: SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    summary: buildSummary(planWithoutSummary),
    version: "mais-manim-scene-bring-to-front-mobject-bridge/v1"
  };
}

export function sceneBringToFrontMobjectBridgeDataAttributes(
  plan: MathSceneBringToFrontMobjectBridgePlan
): Record<string, string> {
  return {
    "data-viz-scene-bring-to-front-mobject-after-fixed-in-frame-ids": summarizeIds(plan.afterFixedInFrameIds),
    "data-viz-scene-bring-to-front-mobject-after-foreground-ids": summarizeIds(plan.afterForegroundIds),
    "data-viz-scene-bring-to-front-mobject-after-render-group-ids": summarizeIds(plan.afterRenderGroupIds),
    "data-viz-scene-bring-to-front-mobject-after-scene-ids": summarizeIds(plan.afterSceneIds),
    "data-viz-scene-bring-to-front-mobject-before-fixed-in-frame-ids": summarizeIds(plan.beforeFixedInFrameIds),
    "data-viz-scene-bring-to-front-mobject-before-foreground-ids": summarizeIds(plan.beforeForegroundIds),
    "data-viz-scene-bring-to-front-mobject-before-render-group-ids": summarizeIds(plan.beforeRenderGroupIds),
    "data-viz-scene-bring-to-front-mobject-before-scene-ids": summarizeIds(plan.beforeSceneIds),
    "data-viz-scene-bring-to-front-mobject-group": plan.group,
    "data-viz-scene-bring-to-front-mobject-moved": String(plan.moved),
    "data-viz-scene-bring-to-front-mobject-next-index": String(plan.nextIndex),
    "data-viz-scene-bring-to-front-mobject-object-id": plan.objectId,
    "data-viz-scene-bring-to-front-mobject-previous-index": String(plan.previousIndex),
    "data-viz-scene-bring-to-front-mobject-source-contract": plan.sourceContract,
    "data-viz-scene-bring-to-front-mobject-summary": plan.summary
  };
}

export function serializeSceneBringToFrontMobjectBridgePlan(plan: MathSceneBringToFrontMobjectBridgePlan) {
  return stableSerialize(plan);
}
