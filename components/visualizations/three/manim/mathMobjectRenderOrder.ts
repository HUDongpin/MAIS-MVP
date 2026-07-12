import type { MathMobjectFamilyIndex } from "./mathMobjectFamily";
import type { MathSceneGraphState, RuntimeMathObjectNode } from "./mathSceneRuntimeState";

export type MobjectRenderOrderGroup = "scene" | "foreground" | "fixedInFrame";

export type MobjectRenderOrderRow = {
  familyDepth: number;
  group: MobjectRenderOrderGroup;
  hasRenderData: boolean;
  objectId: string;
  renderIndex: number;
  topLevelAncestorId: string;
  type: RuntimeMathObjectNode["type"] | "unknown";
};

export type MobjectRenderOrderPlan = {
  allObjectIds: string[];
  fixedInFrameObjectCount: number;
  fixedInFrameObjectIds: string[];
  foregroundObjectCount: number;
  foregroundObjectIds: string[];
  planVersion: "mais-manim-render-order/v1";
  renderOrderSummary: string;
  renderedObjectCount: number;
  rows: MobjectRenderOrderRow[];
  sceneObjectIds: string[];
  signature: string;
  summary: string;
  topLevelObjectCount: number;
  topLevelObjectIds: string[];
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

  return `mobject-render-order-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function commaList(ids: string[]) {
  return ids.length > 0 ? ids.join(",") : "none";
}

function chainList(ids: string[]) {
  return ids.length > 0 ? ids.join(">") : "none";
}

function topLevelAncestorId(index: MathMobjectFamilyIndex, objectId: string) {
  let currentId = objectId;
  const seen = new Set<string>();

  while (index.byId[currentId]?.parentId && !seen.has(currentId)) {
    seen.add(currentId);
    const parentId = index.byId[currentId]?.parentId;
    if (!parentId || !index.byId[parentId]) break;
    currentId = parentId;
  }

  return currentId;
}

function rowsForGroup(
  objectIds: string[],
  group: MobjectRenderOrderGroup,
  familyIndex: MathMobjectFamilyIndex,
  renderIndexOffset: number
): MobjectRenderOrderRow[] {
  return objectIds.map((objectId, index) => {
    const familyNode = familyIndex.byId[objectId];

    return {
      familyDepth: familyNode?.depth ?? 0,
      group,
      hasRenderData: familyNode?.hasRenderData ?? false,
      objectId,
      renderIndex: renderIndexOffset + index,
      topLevelAncestorId: familyNode ? topLevelAncestorId(familyIndex, objectId) : objectId,
      type: familyNode?.type ?? "unknown"
    };
  });
}

export function summarizeMobjectRenderOrderPlan(plan: MobjectRenderOrderPlan) {
  return `render-order:top=${plan.topLevelObjectCount}:rendered=${plan.renderedObjectCount}:foreground=${plan.foregroundObjectCount}:fixed=${plan.fixedInFrameObjectCount}`;
}

export function buildMobjectRenderOrderPlan(
  sceneGraph: Pick<MathSceneGraphState, "renderGroups" | "topLevelIds">,
  familyIndex: MathMobjectFamilyIndex
): MobjectRenderOrderPlan {
  const sceneObjectIds = sceneGraph.renderGroups.scene;
  const foregroundObjectIds = sceneGraph.renderGroups.foreground;
  const fixedInFrameObjectIds = sceneGraph.renderGroups.fixedInFrame;
  const allObjectIds = sceneGraph.renderGroups.all;
  const rows = [
    ...rowsForGroup(sceneObjectIds, "scene", familyIndex, 0),
    ...rowsForGroup(foregroundObjectIds, "foreground", familyIndex, sceneObjectIds.length),
    ...rowsForGroup(fixedInFrameObjectIds, "fixedInFrame", familyIndex, sceneObjectIds.length + foregroundObjectIds.length)
  ];
  const basePlan = {
    allObjectIds,
    fixedInFrameObjectCount: fixedInFrameObjectIds.length,
    fixedInFrameObjectIds,
    foregroundObjectCount: foregroundObjectIds.length,
    foregroundObjectIds,
    planVersion: "mais-manim-render-order/v1" as const,
    renderOrderSummary: `scene=${chainList(sceneObjectIds)};foreground=${chainList(foregroundObjectIds)};fixed=${chainList(fixedInFrameObjectIds)}`,
    renderedObjectCount: allObjectIds.length,
    rows,
    sceneObjectIds,
    topLevelObjectCount: sceneGraph.topLevelIds.length,
    topLevelObjectIds: sceneGraph.topLevelIds
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan)),
    summary: summarizeMobjectRenderOrderPlan({
      ...basePlan,
      signature: "pending",
      summary: "pending"
    })
  };
}

export function mobjectRenderOrderDataAttributes(plan: MobjectRenderOrderPlan) {
  return {
    "data-viz-mobject-render-order-all-ids": commaList(plan.allObjectIds),
    "data-viz-mobject-render-order-fixed-count": String(plan.fixedInFrameObjectCount),
    "data-viz-mobject-render-order-fixed-ids": commaList(plan.fixedInFrameObjectIds),
    "data-viz-mobject-render-order-foreground-count": String(plan.foregroundObjectCount),
    "data-viz-mobject-render-order-foreground-ids": commaList(plan.foregroundObjectIds),
    "data-viz-mobject-render-order-rendered-count": String(plan.renderedObjectCount),
    "data-viz-mobject-render-order-scene-ids": commaList(plan.sceneObjectIds),
    "data-viz-mobject-render-order-signature": plan.signature,
    "data-viz-mobject-render-order-summary": plan.summary,
    "data-viz-mobject-render-order-top-level-count": String(plan.topLevelObjectCount),
    "data-viz-mobject-render-order-top-level-ids": commaList(plan.topLevelObjectIds)
  } as const;
}

export function serializeMobjectRenderOrderPlan(plan: MobjectRenderOrderPlan) {
  return escapedJson(stableSerialize(plan));
}
