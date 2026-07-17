import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  becomeMobjectState,
  generateMobjectTarget,
  saveMobjectState,
  type MathMobjectStateNode
} from "./mathMobjectState";
import { mapRuntimeRenderState, pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { MathObjectGraph, RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";

export const MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT =
  "Mobject.generate_target|MoveToTarget|become: generate a target state, apply it into an existing mobject family, and preserve source identity" as const;

export type MathMobjectMoveToTargetBridgePlan = {
  afterFamilyIds: string[];
  afterSignature: string;
  appliedNodeCount: number;
  becomeApplied: boolean;
  familyPreserved: boolean;
  identityPreserved: boolean;
  objectId: string;
  renderStateChanged: boolean;
  sourceContract: typeof MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT;
  sourceFamilyIds: string[];
  sourceNodeCount: number;
  sourceSignature: string;
  summary: string;
  targetFamilyIds: string[];
  targetGenerated: boolean;
  targetId: string;
  targetNodeCount: number;
  targetPointCount: number;
  targetSignature: string;
  version: "mais-manim-mobject-move-to-target-bridge/v1";
};

export type MathMobjectMoveToTargetBridgeInput = {
  graph: MathObjectGraph;
  objectId?: string;
  targetId?: string;
  targetOffset?: Vec3;
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

  return `mobject-move-to-target-${hash.toString(16).padStart(8, "0")}`;
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

function translatedNodeOverrides(snapshotNodes: Record<string, MathMobjectStateNode>, familyIds: string[], offset: Vec3) {
  return Object.fromEntries(
    familyIds.map((objectId) => {
      const node = snapshotNodes[objectId];
      return [
        objectId,
        {
          renderState: node
            ? mapRuntimeRenderState(node.renderState, (point) => [
                point[0] + offset[0],
                point[1] + offset[1],
                point[2] + offset[2]
              ])
            : { kind: "empty" as const }
        }
      ];
    })
  );
}

function pointCountForNodes(nodes: Record<string, MathMobjectStateNode | RuntimeMathObjectNode>, familyIds: string[]) {
  return familyIds.reduce((sum, objectId) => {
    const node = nodes[objectId];
    return sum + (node ? pointsForRuntimeRenderState(node.renderState).length : 0);
  }, 0);
}

export function summarizeMobjectMoveToTargetBridgePlan(plan: MathMobjectMoveToTargetBridgePlan) {
  return [
    `mobject-move-to-target:${plan.objectId}`,
    `target=${plan.targetId}`,
    `nodes=${plan.targetNodeCount}`,
    `points=${plan.targetPointCount}`,
    `changed=${String(plan.renderStateChanged)}`,
    `become=${String(plan.becomeApplied)}`,
    `identity=${String(plan.identityPreserved)}`
  ].join(":");
}

export function buildMobjectMoveToTargetBridgePlan(
  input: MathMobjectMoveToTargetBridgeInput
): MathMobjectMoveToTargetBridgePlan {
  const objectId = input.objectId?.trim() || defaultObjectId(input.graph);
  const targetOffset = input.targetOffset ?? [0.25, 0.25, 0];
  const beforeObjectIds = sortedObjectIds(input.graph);
  const sourceFamilyIds = familyIdsFor(input.graph, objectId);
  const sourceSnapshot = saveMobjectState(input.graph, objectId);
  const target = generateMobjectTarget(sourceSnapshot, {
    nodeOverrides: translatedNodeOverrides(sourceSnapshot.nodes, sourceSnapshot.familyIds, targetOffset),
    targetId: input.targetId ?? `${objectId}:target`
  });
  const afterGraph = becomeMobjectState(input.graph, objectId, target);
  const afterFamilyIds = familyIdsFor(afterGraph, objectId);
  const afterObjectIds = sortedObjectIds(afterGraph);
  const sourceSignature = signatureForNodes(sourceSnapshot.nodes, sourceSnapshot.familyIds);
  const targetSignature = signatureForNodes(target.nodes, target.familyIds);
  const afterSignature = signatureForNodes(afterGraph.byId, target.familyIds);
  const planWithoutSummary = {
    afterFamilyIds,
    afterSignature,
    appliedNodeCount: afterFamilyIds.length,
    becomeApplied: targetSignature === afterSignature,
    familyPreserved: sameIds(sourceFamilyIds, afterFamilyIds) && sameIds(sourceFamilyIds, target.familyIds),
    identityPreserved: sameIds(beforeObjectIds, afterObjectIds) && sameIds(input.graph.rootIds, afterGraph.rootIds),
    objectId,
    renderStateChanged: sourceSignature !== targetSignature,
    sourceFamilyIds,
    sourceNodeCount: sourceFamilyIds.length,
    sourceSignature,
    targetFamilyIds: target.familyIds,
    targetGenerated: target.kind === "target" && Object.keys(target.nodes).length > 0,
    targetId: target.targetId,
    targetNodeCount: target.familyIds.length,
    targetPointCount: pointCountForNodes(target.nodes, target.familyIds),
    targetSignature
  };

  return {
    ...planWithoutSummary,
    sourceContract: MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT,
    summary: summarizeMobjectMoveToTargetBridgePlan({
      ...planWithoutSummary,
      sourceContract: MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT,
      summary: "",
      version: "mais-manim-mobject-move-to-target-bridge/v1"
    }),
    version: "mais-manim-mobject-move-to-target-bridge/v1"
  };
}

export function mobjectMoveToTargetBridgeDataAttributes(
  plan: MathMobjectMoveToTargetBridgePlan
): Record<string, string> {
  return {
    "data-viz-mobject-move-to-target-after-family-ids": summarizeIds(plan.afterFamilyIds),
    "data-viz-mobject-move-to-target-after-signature": plan.afterSignature,
    "data-viz-mobject-move-to-target-applied-node-count": String(plan.appliedNodeCount),
    "data-viz-mobject-move-to-target-become-applied": String(plan.becomeApplied),
    "data-viz-mobject-move-to-target-family-preserved": String(plan.familyPreserved),
    "data-viz-mobject-move-to-target-identity-preserved": String(plan.identityPreserved),
    "data-viz-mobject-move-to-target-object-id": plan.objectId,
    "data-viz-mobject-move-to-target-render-state-changed": String(plan.renderStateChanged),
    "data-viz-mobject-move-to-target-source-contract": plan.sourceContract,
    "data-viz-mobject-move-to-target-source-family-ids": summarizeIds(plan.sourceFamilyIds),
    "data-viz-mobject-move-to-target-source-node-count": String(plan.sourceNodeCount),
    "data-viz-mobject-move-to-target-source-signature": plan.sourceSignature,
    "data-viz-mobject-move-to-target-summary": plan.summary,
    "data-viz-mobject-move-to-target-target-family-ids": summarizeIds(plan.targetFamilyIds),
    "data-viz-mobject-move-to-target-target-generated": String(plan.targetGenerated),
    "data-viz-mobject-move-to-target-target-id": plan.targetId,
    "data-viz-mobject-move-to-target-target-node-count": String(plan.targetNodeCount),
    "data-viz-mobject-move-to-target-target-point-count": String(plan.targetPointCount),
    "data-viz-mobject-move-to-target-target-signature": plan.targetSignature
  };
}

export function serializeMobjectMoveToTargetBridgePlan(plan: MathMobjectMoveToTargetBridgePlan) {
  return stableSerialize(plan);
}
