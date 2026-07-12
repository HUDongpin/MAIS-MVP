import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import { restoreMobjectState, saveMobjectState, type MathMobjectStateNode } from "./mathMobjectState";
import type { MathObjectGraph, RuntimeMathObjectNode } from "./mathSceneRuntimeState";

export const MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT =
  "Mobject.save_state/restore: capture a mobject family state snapshot and restore render data while preserving object identity and family membership" as const;

export type MathMobjectStateRestoreBridgePlan = {
  afterFamilyIds: string[];
  afterObjectIds: string[];
  beforeFamilyIds: string[];
  beforeObjectIds: string[];
  currentSignature: string;
  familyPreserved: boolean;
  identityPreserved: boolean;
  objectId: string;
  restored: boolean;
  restoredSignature: string;
  restoreMismatchCount: number;
  savedFamilyIds: string[];
  savedNodeCount: number;
  savedPointCount: number;
  savedSignature: string;
  sourceContract: typeof MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-mobject-state-restore-bridge/v1";
};

export type MathMobjectStateRestoreBridgeInput = {
  graph: MathObjectGraph;
  objectId?: string;
};

type ComparableMobjectState = Pick<
  MathMobjectStateNode,
  "boundingBox" | "childIds" | "colorRole" | "conceptId" | "id" | "parentId" | "renderState" | "spec" | "type" | "uniforms"
>;

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

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `mobject-state-restore-${hash.toString(16).padStart(8, "0")}`;
}

function cloneJson<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function summarizeIds(ids: string[]) {
  return ids.join(",") || "none";
}

function sortedObjectIds(graph: MathObjectGraph) {
  return Object.keys(graph.byId).sort((left, right) => left.localeCompare(right));
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function defaultObjectId(graph: MathObjectGraph) {
  const familyIndex = buildMobjectFamilyIndex(graph);
  const renderableRootIds = familyIndex.topLevelIds.filter((objectId) => familyIndex.byId[objectId]?.hasRenderData);

  return renderableRootIds.find((objectId) => graph.byId[objectId]?.type !== "axis3d")
    ?? renderableRootIds[0]
    ?? familyIndex.topLevelIds[0]
    ?? sortedObjectIds(graph)[0]
    ?? "none";
}

function familyIdsFor(graph: MathObjectGraph, objectId: string) {
  const familyIndex = buildMobjectFamilyIndex(graph);
  return familyIndex.byId[objectId]?.familyIds ?? (graph.byId[objectId] ? [objectId] : []);
}

function comparableNodeState(node: MathMobjectStateNode | RuntimeMathObjectNode | undefined): ComparableMobjectState | null {
  if (!node) return null;

  return {
    boundingBox: node.boundingBox,
    childIds: node.childIds,
    colorRole: node.colorRole,
    conceptId: node.conceptId,
    id: node.id,
    parentId: node.parentId,
    renderState: node.renderState,
    spec: node.spec,
    type: node.type,
    uniforms: node.uniforms
  };
}

function signatureForNodes(nodes: Record<string, MathMobjectStateNode | RuntimeMathObjectNode>, familyIds: string[]) {
  return hashStableJson(
    stableSerialize({
      familyIds,
      nodes: familyIds.map((objectId) => comparableNodeState(nodes[objectId]))
    })
  );
}

function graphWithCorruptedFamilyState(graph: MathObjectGraph, familyIds: string[]): MathObjectGraph {
  const byId = cloneJson(graph.byId);

  familyIds.forEach((objectId) => {
    const node = byId[objectId];
    if (!node) return;

    byId[objectId] = {
      ...node,
      boundingBox: { kind: "empty" },
      renderState: { kind: "empty" },
      uniforms: node.uniforms
        ? {
            ...node.uniforms,
            opacity: 0
          }
        : undefined
    };
  });

  return {
    byId,
    rootIds: cloneJson(graph.rootIds)
  };
}

function pointCountForNodes(nodes: Record<string, MathMobjectStateNode>, familyIds: string[]) {
  return familyIds.reduce((sum, objectId) => {
    const node = nodes[objectId];
    return sum + (node ? pointsForRuntimeRenderState(node.renderState).length : 0);
  }, 0);
}

function restoreMismatchCount(
  savedNodes: Record<string, MathMobjectStateNode>,
  restoredNodes: Record<string, RuntimeMathObjectNode>,
  familyIds: string[]
) {
  return familyIds.filter(
    (objectId) =>
      stableSerialize(comparableNodeState(savedNodes[objectId])) !==
      stableSerialize(comparableNodeState(restoredNodes[objectId]))
  ).length;
}

export function summarizeMobjectStateRestoreBridgePlan(plan: MathMobjectStateRestoreBridgePlan) {
  return [
    `mobject-state-restore:${plan.objectId}`,
    `family=${plan.savedFamilyIds.length}`,
    `points=${plan.savedPointCount}`,
    `restored=${String(plan.restored)}`,
    `mismatch=${plan.restoreMismatchCount}`,
    `identity=${String(plan.identityPreserved)}`
  ].join(":");
}

export function buildMobjectStateRestoreBridgePlan(
  input: MathMobjectStateRestoreBridgeInput
): MathMobjectStateRestoreBridgePlan {
  const objectId = input.objectId?.trim() || defaultObjectId(input.graph);
  const beforeObjectIds = sortedObjectIds(input.graph);
  const beforeFamilyIds = familyIdsFor(input.graph, objectId);
  const snapshot = saveMobjectState(input.graph, objectId);
  const currentGraph = graphWithCorruptedFamilyState(input.graph, snapshot.familyIds);
  const restoredGraph = restoreMobjectState(currentGraph, snapshot);
  const afterObjectIds = sortedObjectIds(restoredGraph);
  const afterFamilyIds = familyIdsFor(restoredGraph, objectId);
  const restoreMismatchTotal = restoreMismatchCount(snapshot.nodes, restoredGraph.byId, snapshot.familyIds);
  const identityPreserved = sameIds(beforeObjectIds, afterObjectIds) && sameIds(input.graph.rootIds, restoredGraph.rootIds);
  const familyPreserved = sameIds(beforeFamilyIds, afterFamilyIds) && sameIds(snapshot.familyIds, afterFamilyIds);
  const planWithoutSummary = {
    afterFamilyIds,
    afterObjectIds,
    beforeFamilyIds,
    beforeObjectIds,
    currentSignature: signatureForNodes(currentGraph.byId, snapshot.familyIds),
    familyPreserved,
    identityPreserved,
    objectId,
    restored: Boolean(snapshot.nodes[objectId]) && restoreMismatchTotal === 0 && identityPreserved && familyPreserved,
    restoredSignature: signatureForNodes(restoredGraph.byId, snapshot.familyIds),
    restoreMismatchCount: restoreMismatchTotal,
    savedFamilyIds: snapshot.familyIds,
    savedNodeCount: snapshot.familyIds.length,
    savedPointCount: pointCountForNodes(snapshot.nodes, snapshot.familyIds),
    savedSignature: signatureForNodes(snapshot.nodes, snapshot.familyIds)
  };

  return {
    ...planWithoutSummary,
    sourceContract: MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT,
    summary: summarizeMobjectStateRestoreBridgePlan({
      ...planWithoutSummary,
      sourceContract: MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT,
      summary: "",
      version: "mais-manim-mobject-state-restore-bridge/v1"
    }),
    version: "mais-manim-mobject-state-restore-bridge/v1"
  };
}

export function mobjectStateRestoreBridgeDataAttributes(
  plan: MathMobjectStateRestoreBridgePlan
): Record<string, string> {
  return {
    "data-viz-mobject-state-restore-bridge-after-family-ids": summarizeIds(plan.afterFamilyIds),
    "data-viz-mobject-state-restore-bridge-after-object-ids": summarizeIds(plan.afterObjectIds),
    "data-viz-mobject-state-restore-bridge-before-family-ids": summarizeIds(plan.beforeFamilyIds),
    "data-viz-mobject-state-restore-bridge-before-object-ids": summarizeIds(plan.beforeObjectIds),
    "data-viz-mobject-state-restore-bridge-current-signature": plan.currentSignature,
    "data-viz-mobject-state-restore-bridge-family-ids": summarizeIds(plan.savedFamilyIds),
    "data-viz-mobject-state-restore-bridge-family-preserved": String(plan.familyPreserved),
    "data-viz-mobject-state-restore-bridge-identity-preserved": String(plan.identityPreserved),
    "data-viz-mobject-state-restore-bridge-object-id": plan.objectId,
    "data-viz-mobject-state-restore-bridge-restored": String(plan.restored),
    "data-viz-mobject-state-restore-bridge-restored-signature": plan.restoredSignature,
    "data-viz-mobject-state-restore-bridge-restore-mismatch-count": String(plan.restoreMismatchCount),
    "data-viz-mobject-state-restore-bridge-saved-node-count": String(plan.savedNodeCount),
    "data-viz-mobject-state-restore-bridge-saved-point-count": String(plan.savedPointCount),
    "data-viz-mobject-state-restore-bridge-saved-signature": plan.savedSignature,
    "data-viz-mobject-state-restore-bridge-source-contract": plan.sourceContract,
    "data-viz-mobject-state-restore-bridge-summary": plan.summary
  };
}

export function serializeMobjectStateRestoreBridgePlan(plan: MathMobjectStateRestoreBridgePlan) {
  return stableSerialize(plan);
}
