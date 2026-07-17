import { mobjectFamilyIds, type MathMobjectFamilyIndex } from "./mathMobjectFamily";
import type { MathObjectGraph } from "./mathSceneRuntimeState";
import type { AnimationStep } from "./mathSceneTypes";

export const SCENE_RESTRUCTURE_SOURCE_CONTRACT =
  "Scene.restructure_mobjects: detach removed nested mobjects from parent families while keeping remaining parents renderable" as const;
export const SCENE_MEMBERSHIP_SOURCE_CONTRACT =
  "Scene.play introducers/removers: fade/grow add visible mobjects, fade-out removes after animation window" as const;

export type MathSceneRenderGroup = "scene" | "foreground" | "fixedInFrame";

export type MathSceneGraphStore = {
  byId: MathObjectGraph["byId"];
  fixedInFrameIds: string[];
  foregroundIds: string[];
  removedObjectIds: string[];
  sceneIds: string[];
  topLevelIds: string[];
};

export type MathSceneRenderGroups = {
  all: string[];
  fixedInFrame: string[];
  foreground: string[];
  scene: string[];
};

export type MathSceneGraphSummary = {
  fixedInFrameCount: number;
  fixedInFrameIds: string;
  foregroundCount: number;
  foregroundIds: string;
  renderGroupCount: number;
  renderGroupIds: string;
  renderGroupOverlapCount: number;
  renderGroupOverlapIds: string;
  sceneRenderableCount: number;
  sceneRenderableIds: string;
  topLevelCount: number;
};

export type MathSceneMembershipState = {
  activeIntroducerIds: string[];
  activeRemoverIds: string[];
  excludedObjectIds: string[];
  eventSummary: string;
  pendingIntroducerIds: string[];
  removedObjectIds: string[];
  sourceContract: typeof SCENE_MEMBERSHIP_SOURCE_CONTRACT;
  sourceSummary: string;
};

export type MathSceneRestructurePlan = {
  detachedRootIds: string[];
  removedObjectIds: string[];
  requestedObjectIds: string[];
  restructuredParentIds: string[];
  sourceContract: typeof SCENE_RESTRUCTURE_SOURCE_CONTRACT;
  summary: string;
};

export type MathSceneRestructureResult = {
  plan: MathSceneRestructurePlan;
  store: MathSceneGraphStore;
};

export type MathSceneRenderGroupOptions = {
  excludedObjectIds?: string[];
};

function uniqueValidIds(ids: string[], graph: MathObjectGraph) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (!graph.byId[id] || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function topLevelIdsForGraph(graph: MathObjectGraph) {
  return uniqueValidIds(graph.rootIds, graph)
    .filter((id) => {
      const parentId = graph.byId[id]?.parentId;
      return !parentId || !graph.byId[parentId];
    })
    .map((id) => id);
}

function sortIdsByZIndex(ids: string[], byId: MathObjectGraph["byId"]) {
  return ids
    .map((id, sceneOrder) => ({ id, sceneOrder, zIndex: finiteZIndex(byId[id]?.spec.zIndex) }))
    .sort((left, right) => left.zIndex - right.zIndex || left.sceneOrder - right.sceneOrder)
    .map(({ id }) => id);
}

function withoutId(ids: string[], objectId: string) {
  return ids.filter((id) => id !== objectId);
}

function withoutIds(ids: string[], idsToRemove: Set<string>) {
  return ids.filter((id) => !idsToRemove.has(id));
}

function validStoreIds(ids: string[], store: MathSceneGraphStore) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (!store.byId[id] || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function storeObjectIds(store: MathSceneGraphStore) {
  return Object.keys(store.byId);
}

function uniqueIds(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function finiteZIndex(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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

function cloneStore(store: MathSceneGraphStore): MathSceneGraphStore {
  return {
    byId: store.byId,
    fixedInFrameIds: [...store.fixedInFrameIds],
    foregroundIds: [...store.foregroundIds],
    removedObjectIds: [...store.removedObjectIds],
    sceneIds: [...store.sceneIds],
    topLevelIds: [...store.topLevelIds]
  };
}

function cloneStoreWithObjectGraph(store: MathSceneGraphStore): MathSceneGraphStore {
  return {
    ...cloneStore(store),
    byId: Object.fromEntries(
      Object.entries(store.byId).map(([objectId, node]) => [
        objectId,
        {
          ...node,
          childIds: [...node.childIds]
        }
      ])
    )
  };
}

function assignGroup(store: MathSceneGraphStore, objectId: string, group: MathSceneRenderGroup) {
  const familyIdsToRestore = new Set(storeFamilyIds(store, objectId));
  const next = {
    ...cloneStore(store),
    fixedInFrameIds: withoutId(store.fixedInFrameIds, objectId),
    foregroundIds: withoutId(store.foregroundIds, objectId),
    removedObjectIds: withoutIds(store.removedObjectIds, familyIdsToRestore),
    sceneIds: withoutId(store.sceneIds, objectId)
  };

  if (group === "fixedInFrame") next.fixedInFrameIds.push(objectId);
  if (group === "foreground") next.foregroundIds.push(objectId);
  if (group === "scene") {
    next.sceneIds.push(objectId);
    next.sceneIds = sortIdsByZIndex(next.sceneIds, next.byId);
  }

  return next;
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

function replaceIdsInGroup(ids: string[], objectId: string, replacementIds: string[]) {
  const replacements = new Set(replacementIds);
  let replaced = false;
  const nextIds: string[] = [];

  ids.forEach((id) => {
    if (id === objectId) {
      nextIds.push(...replacementIds);
      replaced = true;
      return;
    }
    if (!replacements.has(id)) nextIds.push(id);
  });

  return replaced ? nextIds : ids;
}

function reorderGroup(
  store: MathSceneGraphStore,
  objectId: string,
  group: MathSceneRenderGroup,
  placement: "back" | "front"
) {
  if (!store.byId[objectId]) return cloneStore(store);

  const next = {
    ...cloneStore(store),
    fixedInFrameIds: withoutId(store.fixedInFrameIds, objectId),
    foregroundIds: withoutId(store.foregroundIds, objectId),
    sceneIds: withoutId(store.sceneIds, objectId)
  };
  const ids = groupIds(next, group);

  if (placement === "front") ids.push(objectId);
  else ids.unshift(objectId);

  return next;
}

function expandedExcludedIds(familyIndex: MathMobjectFamilyIndex, excludedObjectIds: string[]) {
  const excludedIds = new Set<string>();

  excludedObjectIds.forEach((objectId) => {
    const familyIds = mobjectFamilyIds(familyIndex, objectId);
    const ids = familyIds.length > 0 ? familyIds : [objectId];
    ids.forEach((id) => excludedIds.add(id));
  });

  return excludedIds;
}

function expandGroup(ids: string[], familyIndex: MathMobjectFamilyIndex, excludedIds = new Set<string>()) {
  const seen = new Set<string>();
  const expanded = ids.flatMap((id) => {
    const familyIds = mobjectFamilyIds(familyIndex, id);
    return familyIds.length > 0 ? familyIds : [id];
  });

  return expanded.filter((id) => {
    if (!familyIndex.byId[id] || seen.has(id) || excludedIds.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function storeFamilyIds(store: MathSceneGraphStore, objectId: string, visiting = new Set<string>()): string[] {
  const node = store.byId[objectId];
  if (!node || visiting.has(objectId)) return [];

  const nextVisiting = new Set(visiting);
  nextVisiting.add(objectId);
  const descendants = node.childIds.flatMap((childId) => storeFamilyIds(store, childId, nextVisiting));

  return [objectId, ...descendants];
}

function summarizeIds(ids: string[]) {
  return ids.join(",") || "none";
}

function summarizeSceneRestructurePlan(plan: Omit<MathSceneRestructurePlan, "sourceContract" | "summary">) {
  return [
    `restructure:requested=${summarizeIds(plan.requestedObjectIds)}`,
    `parents=${summarizeIds(plan.restructuredParentIds)}`,
    `removed=${summarizeIds(plan.removedObjectIds)}`,
    `detached=${summarizeIds(plan.detachedRootIds)}`
  ].join(":");
}

function renderGroupOverlapIds(groups: MathSceneRenderGroups) {
  return groups.all.filter((id) => {
    const groupCount = [groups.scene, groups.foreground, groups.fixedInFrame].filter((group) => group.includes(id)).length;
    return groupCount > 1;
  });
}

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function membershipForStep(step: AnimationStep): { kind: "introducer" | "remover"; objectId: string } | null {
  if (step.type === "fadeInObject" || step.type === "growFromCenter") {
    return { kind: "introducer", objectId: step.objectId };
  }
  if (step.type === "fadeOutObject") return { kind: "remover", objectId: step.objectId };
  return null;
}

type SceneMembershipEvent = {
  endSeconds: number;
  kind: "introducer" | "remover";
  objectId: string;
  startSeconds: number;
};

function sceneMembershipEvents(timeline: AnimationStep[]) {
  const events: SceneMembershipEvent[] = [];
  let elapsedBeforeStep = 0;

  timeline.forEach((step) => {
    const duration = Math.max(0, finite(step.duration, 0));
    const membership = membershipForStep(step);

    if (membership) {
      events.push({
        endSeconds: elapsedBeforeStep + duration,
        kind: membership.kind,
        objectId: membership.objectId,
        startSeconds: elapsedBeforeStep
      });
    }

    elapsedBeforeStep += duration;
  });

  return events;
}

function summarizeMembershipEvents(events: SceneMembershipEvent[]) {
  return events
    .map((event) => `${event.kind}:${event.objectId}@${event.startSeconds.toFixed(3)}-${event.endSeconds.toFixed(3)}`)
    .join("|") || "none";
}

function summarizeMembershipSource(events: SceneMembershipEvent[]) {
  const introducerIds = uniqueIds(events.filter((event) => event.kind === "introducer").map((event) => event.objectId));
  const removerIds = uniqueIds(events.filter((event) => event.kind === "remover").map((event) => event.objectId));

  return [
    `membership:events=${events.length}`,
    `introducers=${summarizeIds(introducerIds)}`,
    `removers=${summarizeIds(removerIds)}`
  ].join(":");
}

export function buildSceneMembershipState(
  timeline: AnimationStep[],
  elapsedSeconds: number,
  objectIds: string[] = []
): MathSceneMembershipState {
  const elapsed = finite(elapsedSeconds, 0);
  const events = sceneMembershipEvents(timeline);
  const eventsByObject = events.reduce((byObject, event) => {
    byObject[event.objectId] = [...(byObject[event.objectId] ?? []), event];
    return byObject;
  }, {} as Record<string, SceneMembershipEvent[]>);
  const orderedObjectIds = uniqueIds([...objectIds, ...events.map((event) => event.objectId)]);
  const activeIntroducerIds: string[] = [];
  const activeRemoverIds: string[] = [];
  const excludedObjectIds: string[] = [];
  const pendingIntroducerIds: string[] = [];
  const removedObjectIds: string[] = [];

  orderedObjectIds.forEach((objectId) => {
    const objectEvents = eventsByObject[objectId] ?? [];
    if (objectEvents.length === 0) return;

    const hasIntroducer = objectEvents.some((event) => event.kind === "introducer");
    let visible = !hasIntroducer;
    let pendingIntroducer = false;
    let removed = false;
    let activeIntroducer = false;
    let activeRemover = false;

    for (const event of objectEvents) {
      if (elapsed < event.startSeconds) {
        if (event.kind === "introducer" && !visible) {
          pendingIntroducer = true;
          removed = false;
        }
        break;
      }

      if (event.kind === "introducer") {
        pendingIntroducer = false;
        removed = false;

        if (elapsed < event.endSeconds) {
          visible = true;
          activeIntroducer = true;
          break;
        }

        visible = true;
        continue;
      }

      if (elapsed < event.endSeconds) {
        visible = true;
        activeRemover = true;
        removed = false;
        break;
      }

      visible = false;
      removed = true;
    }

    if (activeIntroducer) activeIntroducerIds.push(objectId);
    if (activeRemover) activeRemoverIds.push(objectId);
    if (!visible) excludedObjectIds.push(objectId);
    if (pendingIntroducer) pendingIntroducerIds.push(objectId);
    if (removed) removedObjectIds.push(objectId);
  });

  return {
    activeIntroducerIds,
    activeRemoverIds,
    excludedObjectIds,
    eventSummary: summarizeMembershipEvents(events),
    pendingIntroducerIds,
    removedObjectIds,
    sourceContract: SCENE_MEMBERSHIP_SOURCE_CONTRACT,
    sourceSummary: summarizeMembershipSource(events)
  };
}

export function sceneMembershipDataAttributes(membership: MathSceneMembershipState): Record<string, string> {
  return {
    "data-viz-scene-membership-active-introducer-count": String(membership.activeIntroducerIds.length),
    "data-viz-scene-membership-active-introducer-ids": summarizeIds(membership.activeIntroducerIds),
    "data-viz-scene-membership-active-remover-count": String(membership.activeRemoverIds.length),
    "data-viz-scene-membership-active-remover-ids": summarizeIds(membership.activeRemoverIds),
    "data-viz-scene-membership-event-summary": membership.eventSummary,
    "data-viz-scene-membership-excluded-count": String(membership.excludedObjectIds.length),
    "data-viz-scene-membership-excluded-ids": summarizeIds(membership.excludedObjectIds),
    "data-viz-scene-membership-pending-introducer-count": String(membership.pendingIntroducerIds.length),
    "data-viz-scene-membership-pending-introducer-ids": summarizeIds(membership.pendingIntroducerIds),
    "data-viz-scene-membership-removed-count": String(membership.removedObjectIds.length),
    "data-viz-scene-membership-removed-ids": summarizeIds(membership.removedObjectIds),
    "data-viz-scene-membership-source-contract": membership.sourceContract,
    "data-viz-scene-membership-source-summary": membership.sourceSummary
  };
}

export function serializeSceneMembershipState(membership: MathSceneMembershipState) {
  return stableSerialize(membership);
}

export function buildSceneGraphStore(
  graph: MathObjectGraph,
  options: { fixedInFrameIds?: string[]; foregroundIds?: string[] } = {}
): MathSceneGraphStore {
  const topLevelIds = sortIdsByZIndex(topLevelIdsForGraph(graph), graph.byId);
  const baseStore: MathSceneGraphStore = {
    byId: graph.byId,
    fixedInFrameIds: [],
    foregroundIds: [],
    removedObjectIds: [],
    sceneIds: topLevelIds,
    topLevelIds
  };

  const withForeground = uniqueValidIds(options.foregroundIds ?? [], graph).reduce(
    (store, objectId) => assignGroup(store, objectId, "foreground"),
    baseStore
  );

  return uniqueValidIds(options.fixedInFrameIds ?? [], graph).reduce(
    (store, objectId) => assignGroup(store, objectId, "fixedInFrame"),
    withForeground
  );
}

export function clearSceneMobjects(store: MathSceneGraphStore): MathSceneGraphStore {
  return {
    ...cloneStore(store),
    fixedInFrameIds: [],
    foregroundIds: [],
    removedObjectIds: uniqueIds([...store.removedObjectIds, ...storeObjectIds(store)]),
    sceneIds: []
  };
}

export function addSceneMobject(
  store: MathSceneGraphStore,
  objectId: string,
  options: { group?: MathSceneRenderGroup } = {}
): MathSceneGraphStore {
  if (!store.byId[objectId]) return cloneStore(store);
  return assignGroup(store, objectId, options.group ?? "scene");
}

export function removeAllExceptSceneMobjects(
  store: MathSceneGraphStore,
  objectIdsToKeep: string[]
): MathSceneGraphStore {
  return validStoreIds(objectIdsToKeep, store).reduce(
    (nextStore, objectId) => addSceneMobject(nextStore, objectId),
    clearSceneMobjects(store)
  );
}

export function bringSceneMobjectToFront(
  store: MathSceneGraphStore,
  objectId: string,
  options: { group?: MathSceneRenderGroup } = {}
): MathSceneGraphStore {
  return reorderGroup(store, objectId, options.group ?? groupForObject(store, objectId), "front");
}

export function sendSceneMobjectToBack(
  store: MathSceneGraphStore,
  objectId: string,
  options: { group?: MathSceneRenderGroup } = {}
): MathSceneGraphStore {
  return reorderGroup(store, objectId, options.group ?? groupForObject(store, objectId), "back");
}

export function removeSceneMobject(store: MathSceneGraphStore, objectId: string): MathSceneGraphStore {
  const familyIdsToRemove = new Set(storeFamilyIds(store, objectId));

  return {
    ...cloneStore(store),
    fixedInFrameIds: withoutIds(store.fixedInFrameIds, familyIdsToRemove),
    foregroundIds: withoutIds(store.foregroundIds, familyIdsToRemove),
    removedObjectIds: uniqueIds([...store.removedObjectIds, ...familyIdsToRemove]),
    sceneIds: withoutIds(store.sceneIds, familyIdsToRemove)
  };
}

// Manim source contract: Scene.restructure_mobjects removes nested mobjects
// from parent submobject lists so a removed child cannot reappear via family
// traversal while the remaining parent stays renderable.
export function restructureSceneMobjects(
  store: MathSceneGraphStore,
  objectIdsToRemove: string[]
): MathSceneRestructureResult {
  const requestedObjectIds = validStoreIds(objectIdsToRemove, store);
  const removedObjectIds = uniqueIds(requestedObjectIds.flatMap((objectId) => storeFamilyIds(store, objectId)));
  const removedSet = new Set(removedObjectIds);
  const restructuredParentIds = uniqueIds(
    requestedObjectIds
      .map((objectId) => store.byId[objectId]?.parentId)
      .filter((parentId): parentId is string => Boolean(parentId && store.byId[parentId] && !removedSet.has(parentId)))
  );
  const detachedRootIds = requestedObjectIds.filter((objectId) => Boolean(store.byId[objectId]?.parentId));
  const nextStore = cloneStoreWithObjectGraph(store);

  Object.values(nextStore.byId).forEach((node) => {
    node.childIds = node.childIds.filter((childId) => !removedSet.has(childId));
    if (removedSet.has(node.id)) node.parentId = undefined;
  });

  nextStore.fixedInFrameIds = withoutIds(nextStore.fixedInFrameIds, removedSet);
  nextStore.foregroundIds = withoutIds(nextStore.foregroundIds, removedSet);
  nextStore.removedObjectIds = uniqueIds([...nextStore.removedObjectIds, ...removedObjectIds]);
  nextStore.sceneIds = withoutIds(nextStore.sceneIds, removedSet);
  nextStore.topLevelIds = withoutIds(nextStore.topLevelIds, removedSet);

  const planWithoutSummary = {
    detachedRootIds,
    removedObjectIds,
    requestedObjectIds,
    restructuredParentIds
  };

  return {
    plan: {
      ...planWithoutSummary,
      sourceContract: SCENE_RESTRUCTURE_SOURCE_CONTRACT,
      summary: summarizeSceneRestructurePlan(planWithoutSummary)
    },
    store: nextStore
  };
}

export function sceneRestructureDataAttributes(plan: MathSceneRestructurePlan): Record<string, string> {
  return {
    "data-viz-scene-restructure-detached-root-count": String(plan.detachedRootIds.length),
    "data-viz-scene-restructure-detached-root-ids": summarizeIds(plan.detachedRootIds),
    "data-viz-scene-restructure-parent-count": String(plan.restructuredParentIds.length),
    "data-viz-scene-restructure-parent-ids": summarizeIds(plan.restructuredParentIds),
    "data-viz-scene-restructure-removed-count": String(plan.removedObjectIds.length),
    "data-viz-scene-restructure-removed-ids": summarizeIds(plan.removedObjectIds),
    "data-viz-scene-restructure-requested-count": String(plan.requestedObjectIds.length),
    "data-viz-scene-restructure-requested-ids": summarizeIds(plan.requestedObjectIds),
    "data-viz-scene-restructure-source-contract": plan.sourceContract,
    "data-viz-scene-restructure-summary": plan.summary
  };
}

export function serializeSceneRestructurePlan(plan: MathSceneRestructurePlan) {
  return stableSerialize(plan);
}

export function replaceSceneMobject(
  store: MathSceneGraphStore,
  objectId: string,
  replacementIds: string[],
  options: { group?: MathSceneRenderGroup } = {}
): MathSceneGraphStore {
  const group = options.group ?? groupForObject(store, objectId);
  const ids = groupIds(store, group);
  if (!store.byId[objectId] || !ids.includes(objectId)) return cloneStore(store);

  const replacements = validStoreIds(replacementIds, store).filter((id) => id !== objectId);
  const idsToRemoveFromGroups = new Set([objectId, ...replacements]);
  const removedFamilyIds = storeFamilyIds(store, objectId);
  const replacementFamilyIds = new Set(replacements.flatMap((id) => storeFamilyIds(store, id)));
  const next: MathSceneGraphStore = {
    ...cloneStore(store),
    fixedInFrameIds: withoutIds(store.fixedInFrameIds, idsToRemoveFromGroups),
    foregroundIds: withoutIds(store.foregroundIds, idsToRemoveFromGroups),
    removedObjectIds: withoutIds(uniqueIds([...store.removedObjectIds, ...removedFamilyIds]), replacementFamilyIds),
    sceneIds: withoutIds(store.sceneIds, idsToRemoveFromGroups)
  };
  const replacedIds = replaceIdsInGroup(ids, objectId, replacements);

  if (group === "fixedInFrame") next.fixedInFrameIds = replacedIds;
  if (group === "foreground") next.foregroundIds = replacedIds;
  if (group === "scene") next.sceneIds = replacedIds;

  return next;
}

export function sceneRenderGroupIds(
  store: MathSceneGraphStore,
  familyIndex: MathMobjectFamilyIndex,
  options: MathSceneRenderGroupOptions = {}
): MathSceneRenderGroups {
  const excludedIds = new Set(store.removedObjectIds);
  expandedExcludedIds(familyIndex, options.excludedObjectIds ?? []).forEach((id) => excludedIds.add(id));
  const scene = expandGroup(store.sceneIds, familyIndex, excludedIds);
  const foreground = expandGroup(store.foregroundIds, familyIndex, excludedIds);
  const fixedInFrame = expandGroup(store.fixedInFrameIds, familyIndex, excludedIds);
  const all = [...scene, ...foreground, ...fixedInFrame].filter((id, index, ids) => ids.indexOf(id) === index);

  return {
    all,
    fixedInFrame,
    foreground,
    scene
  };
}

export function summarizeSceneGraph(
  store: MathSceneGraphStore,
  familyIndex: MathMobjectFamilyIndex,
  options: MathSceneRenderGroupOptions = {}
): MathSceneGraphSummary {
  const groups = sceneRenderGroupIds(store, familyIndex, options);
  const overlapIds = renderGroupOverlapIds(groups);

  return {
    fixedInFrameCount: groups.fixedInFrame.length,
    fixedInFrameIds: summarizeIds(groups.fixedInFrame),
    foregroundCount: groups.foreground.length,
    foregroundIds: summarizeIds(groups.foreground),
    renderGroupCount: groups.all.length,
    renderGroupIds: summarizeIds(groups.all),
    renderGroupOverlapCount: overlapIds.length,
    renderGroupOverlapIds: summarizeIds(overlapIds),
    sceneRenderableCount: groups.scene.length,
    sceneRenderableIds: summarizeIds(groups.scene),
    topLevelCount: store.topLevelIds.length
  };
}

export function sceneGraphDataAttributes(summary: MathSceneGraphSummary): Record<string, string> {
  return {
    "data-viz-scene-fixed-in-frame-count": String(summary.fixedInFrameCount),
    "data-viz-scene-fixed-in-frame-ids": summary.fixedInFrameIds,
    "data-viz-scene-foreground-count": String(summary.foregroundCount),
    "data-viz-scene-foreground-ids": summary.foregroundIds,
    "data-viz-scene-render-group-count": String(summary.renderGroupCount),
    "data-viz-scene-render-group-ids": summary.renderGroupIds,
    "data-viz-scene-render-group-overlap-count": String(summary.renderGroupOverlapCount),
    "data-viz-scene-render-group-overlap-ids": summary.renderGroupOverlapIds,
    "data-viz-scene-renderable-count": String(summary.sceneRenderableCount),
    "data-viz-scene-renderable-ids": summary.sceneRenderableIds,
    "data-viz-scene-top-level-mobject-count": String(summary.topLevelCount)
  };
}

export function serializeSceneGraphSummary(summary: MathSceneGraphSummary) {
  return stableSerialize(summary);
}
