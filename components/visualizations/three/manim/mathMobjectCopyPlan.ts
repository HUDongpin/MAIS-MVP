import { buildMobjectFamilyIndex, mobjectFamilyMembersWithRenderData } from "./mathMobjectFamily";
import { pointsForRuntimeRenderState, runtimeRenderStateHasPoints } from "./mathRuntimeRenderState";
import type { MathObjectGraph, RuntimeMathObjectNode, RuntimeRenderState } from "./mathSceneRuntimeState";
import type { MathObjectSpec } from "./mathSceneTypes";

export const MOBJECT_COPY_SOURCE_CONTRACT = "Mobject.copy|copy.deepcopy|family graph duplication";

export type MathMobjectCopyPlan = {
  childLinkCount: number;
  cloneIsolationPreserved: boolean;
  cloneIsolationSummary: string;
  copiedFamilyCount: number;
  copiedNodeIds: string[];
  copyRootId: string;
  idMap: Record<string, string>;
  nodes: Record<string, RuntimeMathObjectNode>;
  parentLinkCount: number;
  pointCount: number;
  renderDataNodeCount: number;
  sharedReferenceCount: number;
  signature: string;
  sourceContract: typeof MOBJECT_COPY_SOURCE_CONTRACT;
  sourceFamilyIds: string[];
  sourceObjectId: string;
};

export type MathMobjectCopyPlanOptions = {
  copySuffix?: string;
};

function cloneJson<TValue>(value: TValue): TValue {
  // Deep-clones JSON-shaped state without the JSON.parse(JSON.stringify(...))
  // string round-trip that dominated ~10-second lab-page main-thread long
  // tasks (profiled 2026-07-09). Mirrors JSON semantics for plain data:
  // undefined object properties are dropped and undefined array items become
  // null.
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : cloneJson(item))) as TValue;
  }
  const clone: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry === undefined) continue;
    clone[key] = cloneJson(entry);
  }
  return clone as TValue;
}

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

  return `mobject-copy-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function renderStateHasData(renderState: RuntimeRenderState) {
  return runtimeRenderStateHasPoints(renderState);
}

function defaultSourceObjectId(graph: MathObjectGraph) {
  const familyIndex = buildMobjectFamilyIndex(graph);
  const renderableRootId = familyIndex.topLevelIds.find(
    (rootId) =>
      mobjectFamilyMembersWithRenderData(familyIndex, rootId).some((objectId) => {
        const node = graph.byId[objectId];
        return Boolean(node && renderStateHasData(node.renderState));
      })
  );

  return renderableRootId ?? familyIndex.topLevelIds[0] ?? Object.keys(graph.byId).sort()[0] ?? "none";
}

function uniqueCopyId(graph: MathObjectGraph, sourceId: string, copySuffix: string, usedIds: Set<string>) {
  const baseId = `${sourceId}${copySuffix}`;
  if (!graph.byId[baseId] && !usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let index = 2;
  while (graph.byId[`${baseId}-${index}`] || usedIds.has(`${baseId}-${index}`)) {
    index += 1;
  }

  const id = `${baseId}-${index}`;
  usedIds.add(id);
  return id;
}

function rewriteSpecIds(spec: MathObjectSpec, idMap: Record<string, string>, sourceId: string, copiedId: string): MathObjectSpec {
  const copy = cloneJson(spec);
  copy.id = copiedId;

  if (copy.type === "movingPoint" && copy.pathObjectId === sourceId) {
    copy.pathObjectId = idMap[sourceId] ?? copy.pathObjectId;
  }

  if (copy.type === "trace" && copy.sourceObjectId === sourceId) {
    copy.sourceObjectId = idMap[sourceId] ?? copy.sourceObjectId;
  }

  if (copy.type === "movingPoint" && idMap[copy.pathObjectId]) {
    copy.pathObjectId = idMap[copy.pathObjectId];
  }

  if (copy.type === "trace" && idMap[copy.sourceObjectId]) {
    copy.sourceObjectId = idMap[copy.sourceObjectId];
  }

  return copy;
}

function copiedNode(
  graph: MathObjectGraph,
  sourceId: string,
  copiedId: string,
  idMap: Record<string, string>,
  sourceRootId: string
): RuntimeMathObjectNode {
  const source = graph.byId[sourceId];
  const parentId = source.id === sourceRootId ? undefined : source.parentId ? idMap[source.parentId] : undefined;

  return {
    ...cloneJson(source),
    childIds: source.childIds.map((childId) => idMap[childId]).filter((childId): childId is string => Boolean(childId)),
    id: copiedId,
    parentId,
    spec: rewriteSpecIds(source.spec, idMap, sourceId, copiedId)
  };
}

function sharesObjectReference(left: unknown, right: unknown) {
  return Boolean(left && right && typeof left === "object" && left === right);
}

function sharedReferenceCountForCopyPlan(
  graph: MathObjectGraph,
  idMap: Record<string, string>,
  nodes: Record<string, RuntimeMathObjectNode>
) {
  return Object.entries(idMap).reduce((sum, [sourceId, copiedId]) => {
    const source = graph.byId[sourceId];
    const copy = nodes[copiedId];
    if (!source || !copy) return sum;

    return sum + [
      sharesObjectReference(source, copy),
      sharesObjectReference(source.boundingBox, copy.boundingBox),
      sharesObjectReference(source.childIds, copy.childIds),
      sharesObjectReference(source.renderState, copy.renderState),
      sharesObjectReference(source.spec, copy.spec),
      sharesObjectReference(source.uniforms, copy.uniforms)
    ].filter(Boolean).length;
  }, 0);
}

export function summarizeMobjectCopyPlan(plan: MathMobjectCopyPlan) {
  return `mobject-copy:source=${plan.sourceObjectId}:copyRoot=${plan.copyRootId}:family=${plan.copiedFamilyCount}:render=${plan.renderDataNodeCount}:points=${plan.pointCount}:childLinks=${plan.childLinkCount}`;
}

export function summarizeMobjectCopyCloneIsolation(plan: Pick<MathMobjectCopyPlan, "cloneIsolationPreserved" | "copiedFamilyCount" | "sharedReferenceCount">) {
  return `cloneIsolation:isolated=${String(plan.cloneIsolationPreserved)}:sharedRefs=${plan.sharedReferenceCount}:nodes=${plan.copiedFamilyCount}`;
}

export function summarizeMobjectCopyIdMap(plan: Pick<MathMobjectCopyPlan, "idMap">) {
  const entries = Object.entries(plan.idMap);
  if (entries.length === 0) return "none";

  return entries.map(([sourceId, copiedId]) => `${sourceId}=>${copiedId}`).join(",");
}

export function buildMobjectCopyPlan(
  graph: MathObjectGraph,
  objectId = defaultSourceObjectId(graph),
  options: MathMobjectCopyPlanOptions = {}
): MathMobjectCopyPlan {
  const familyIndex = buildMobjectFamilyIndex(graph);
  const sourceFamilyIds = familyIndex.byId[objectId]?.familyIds ?? (graph.byId[objectId] ? [objectId] : []);
  const copySuffix = options.copySuffix ?? ":copy";
  const usedIds = new Set<string>();
  const idMap = Object.fromEntries(
    sourceFamilyIds.map((sourceId) => [sourceId, uniqueCopyId(graph, sourceId, copySuffix, usedIds)])
  );
  const nodes = Object.fromEntries(
    sourceFamilyIds
      .map((sourceId) => graph.byId[sourceId])
      .filter((node): node is RuntimeMathObjectNode => Boolean(node))
      .map((node) => {
        const copiedId = idMap[node.id];
        return [copiedId, copiedNode(graph, node.id, copiedId, idMap, objectId)];
      })
  );
  const copiedNodeIds = sourceFamilyIds.map((sourceId) => idMap[sourceId]).filter(Boolean);
  const renderDataNodeCount = Object.values(nodes).filter((node) => renderStateHasData(node.renderState)).length;
  const sharedReferenceCount = sharedReferenceCountForCopyPlan(graph, idMap, nodes);
  const cloneIsolationPreserved = sharedReferenceCount === 0;
  const basePlan: Omit<MathMobjectCopyPlan, "signature"> = {
    childLinkCount: Object.values(nodes).reduce((sum, node) => sum + node.childIds.length, 0),
    cloneIsolationPreserved,
    cloneIsolationSummary: summarizeMobjectCopyCloneIsolation({
      cloneIsolationPreserved,
      copiedFamilyCount: copiedNodeIds.length,
      sharedReferenceCount
    }),
    copiedFamilyCount: copiedNodeIds.length,
    copiedNodeIds,
    copyRootId: idMap[objectId] ?? "none",
    idMap,
    nodes,
    parentLinkCount: Object.values(nodes).filter((node) => Boolean(node.parentId)).length,
    pointCount: Object.values(nodes).reduce((sum, node) => sum + pointsForRuntimeRenderState(node.renderState).length, 0),
    renderDataNodeCount,
    sharedReferenceCount,
    sourceContract: MOBJECT_COPY_SOURCE_CONTRACT,
    sourceFamilyIds,
    sourceObjectId: objectId
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan))
  };
}

export function copyMobjectFamilyIntoGraph(graph: MathObjectGraph, plan: MathMobjectCopyPlan): MathObjectGraph {
  const byId = {
    ...cloneJson(graph.byId),
    ...cloneJson(plan.nodes)
  };
  const rootIds = graph.rootIds.includes(plan.copyRootId) || plan.copyRootId === "none"
    ? cloneJson(graph.rootIds)
    : [...cloneJson(graph.rootIds), plan.copyRootId];

  return {
    byId,
    rootIds
  };
}

export function serializeMobjectCopyPlan(plan: MathMobjectCopyPlan) {
  return escapedJson(stableSerialize(plan));
}

export function mobjectCopyPlanDataAttributes(plan: MathMobjectCopyPlan) {
  return {
    "data-viz-mobject-copy-child-link-count": String(plan.childLinkCount),
    "data-viz-mobject-copy-clone-isolated": String(plan.cloneIsolationPreserved),
    "data-viz-mobject-copy-clone-isolation-summary": plan.cloneIsolationSummary,
    "data-viz-mobject-copy-family-count": String(plan.copiedFamilyCount),
    "data-viz-mobject-copy-id-map-summary": summarizeMobjectCopyIdMap(plan),
    "data-viz-mobject-copy-parent-link-count": String(plan.parentLinkCount),
    "data-viz-mobject-copy-point-count": String(plan.pointCount),
    "data-viz-mobject-copy-render-data-count": String(plan.renderDataNodeCount),
    "data-viz-mobject-copy-root-id": plan.copyRootId,
    "data-viz-mobject-copy-signature": plan.signature,
    "data-viz-mobject-copy-shared-reference-count": String(plan.sharedReferenceCount),
    "data-viz-mobject-copy-source-contract": plan.sourceContract,
    "data-viz-mobject-copy-source-id": plan.sourceObjectId,
    "data-viz-mobject-copy-summary": summarizeMobjectCopyPlan(plan)
  };
}
