import type { MathObjectGraph, RuntimeMathObjectNode, RuntimeRenderState } from "./mathSceneRuntimeState";

export const MOBJECT_FAMILY_SOURCE_CONTRACT =
  "Mobject.submobjects|parents|get_family|family_members_with_points";

export type MathMobjectFamilyNode = {
  childIds: string[];
  conceptId: string;
  depth: number;
  familyIds: string[];
  hasRenderData: boolean;
  id: string;
  parentId?: string;
  type: RuntimeMathObjectNode["type"];
};

export type MathMobjectFamilyIndex = {
  byId: Record<string, MathMobjectFamilyNode>;
  cycleIds: string[];
  orphanIds: string[];
  sourceContract: typeof MOBJECT_FAMILY_SOURCE_CONTRACT;
  topLevelIds: string[];
};

export type MathMobjectFamilySummary = {
  cycleCount: number;
  familyMemberCount: number;
  maxDepth: number;
  orphanCount: number;
  rootCount: number;
};

function renderStateHasData(renderState: RuntimeRenderState) {
  if (renderState.kind === "empty") return false;
  if (renderState.kind === "polyline") return renderState.points.length >= 2;
  if (renderState.kind === "surface") return renderState.points.length > 0 || renderState.wireframeRows.length > 0 || renderState.wireframeColumns.length > 0;
  return true;
}

function sortedIds(ids: string[]) {
  return [...ids].sort((left, right) => left.localeCompare(right));
}

function uniqueInOrder(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) return false;
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

function cleanChildIds(graph: MathObjectGraph, node: RuntimeMathObjectNode) {
  return node.childIds.filter((childId) => childId !== node.id && Boolean(graph.byId[childId]));
}

function depthFor(graph: MathObjectGraph, objectId: string, visiting = new Set<string>()): number {
  const node = graph.byId[objectId];
  if (!node?.parentId || !graph.byId[node.parentId]) return 0;
  if (visiting.has(objectId)) return 0;

  const nextVisiting = new Set(visiting);
  nextVisiting.add(objectId);
  return depthFor(graph, node.parentId, nextVisiting) + 1;
}

function collectFamilyIds(
  graph: MathObjectGraph,
  objectId: string,
  cycleIds: Set<string>,
  visiting = new Set<string>()
): string[] {
  const node = graph.byId[objectId];
  if (!node) return [];
  if (visiting.has(objectId)) {
    cycleIds.add(objectId);
    return [];
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(objectId);
  const descendants = cleanChildIds(graph, node).flatMap((childId) => collectFamilyIds(graph, childId, cycleIds, nextVisiting));

  return uniqueInOrder([objectId, ...descendants]);
}

export function buildMobjectFamilyIndex(graph: MathObjectGraph): MathMobjectFamilyIndex {
  const cycleIds = new Set<string>();
  const objectIds = Object.keys(graph.byId);
  const orphanIds = sortedIds(
    objectIds.filter((objectId) => {
      const parentId = graph.byId[objectId]?.parentId;
      return Boolean(parentId && !graph.byId[parentId]);
    })
  );
  const topLevelIds = sortedIds(
    objectIds.filter((objectId) => {
      const parentId = graph.byId[objectId]?.parentId;
      return !parentId || !graph.byId[parentId];
    })
  );

  const byId = Object.fromEntries(
    objectIds.map((objectId) => {
      const node = graph.byId[objectId];
      const familyNode: MathMobjectFamilyNode = {
        childIds: cleanChildIds(graph, node),
        conceptId: node.conceptId,
        depth: depthFor(graph, objectId),
        familyIds: collectFamilyIds(graph, objectId, cycleIds),
        hasRenderData: renderStateHasData(node.renderState),
        id: node.id,
        parentId: node.parentId,
        type: node.type
      };

      return [objectId, familyNode];
    })
  );

  return {
    byId,
    cycleIds: sortedIds([...cycleIds]),
    orphanIds,
    sourceContract: MOBJECT_FAMILY_SOURCE_CONTRACT,
    topLevelIds
  };
}

export function mobjectFamilyIds(index: MathMobjectFamilyIndex, objectId: string) {
  return index.byId[objectId]?.familyIds ?? [];
}

export function mobjectFamilyMembersWithRenderData(index: MathMobjectFamilyIndex, objectId: string) {
  return mobjectFamilyIds(index, objectId).filter((familyId) => index.byId[familyId]?.hasRenderData);
}

export function mobjectConceptFamilyIds(index: MathMobjectFamilyIndex, conceptId: string) {
  return sortedIds(Object.values(index.byId).filter((node) => node.conceptId === conceptId).map((node) => node.id));
}

export function summarizeMobjectFamilies(index: MathMobjectFamilyIndex): MathMobjectFamilySummary {
  return {
    cycleCount: index.cycleIds.length,
    familyMemberCount: Object.keys(index.byId).length,
    maxDepth: Math.max(0, ...Object.values(index.byId).map((node) => node.depth)),
    orphanCount: index.orphanIds.length,
    rootCount: index.topLevelIds.length
  };
}

export function mobjectFamilySummaryDataAttributes(summary: MathMobjectFamilySummary) {
  return {
    "data-viz-mobject-family-cycle-count": String(summary.cycleCount),
    "data-viz-mobject-family-max-depth": String(summary.maxDepth),
    "data-viz-mobject-family-member-count": String(summary.familyMemberCount),
    "data-viz-mobject-family-orphan-count": String(summary.orphanCount),
    "data-viz-mobject-family-root-count": String(summary.rootCount)
  } as const;
}

export function serializeMobjectFamilyIndex(index: MathMobjectFamilyIndex) {
  return stableSerialize(index);
}
