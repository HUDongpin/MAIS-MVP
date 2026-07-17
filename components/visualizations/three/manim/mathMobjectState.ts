import { buildMobjectFamilyIndex, type MathMobjectFamilyIndex } from "./mathMobjectFamily";
import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type {
  MathObjectGraph,
  RuntimeBoundingBox,
  RuntimeMathObjectNode,
  RuntimeRenderState
} from "./mathSceneRuntimeState";
import type { RuntimeMobjectUniforms } from "./mathMobjectUniforms";
import type { Vec3 } from "./mathSceneTypes";

export const MOBJECT_STATE_SOURCE_CONTRACT = "Mobject.save_state|restore|generate_target|become";

export type MathMobjectStateNode = {
  boundingBox: RuntimeBoundingBox;
  childIds: string[];
  colorRole?: string;
  conceptId: string;
  id: string;
  parentId?: string;
  renderState: RuntimeRenderState;
  spec: RuntimeMathObjectNode["spec"];
  type: RuntimeMathObjectNode["type"];
  uniforms?: RuntimeMobjectUniforms;
};

export type MathMobjectStateSnapshot = {
  conceptId: string;
  familyIds: string[];
  nodes: Record<string, MathMobjectStateNode>;
  rootId: string;
};

export type MathMobjectTargetState = MathMobjectStateSnapshot & {
  kind: "target";
  sourceObjectId: string;
  targetId: string;
};

export type MathMobjectStateReadinessSummary = {
  restorableObjectCount: number;
  stateFamilyRootCount: number;
  stateSnapshotNodeCount: number;
  targetableObjectCount: number;
};

export type MathMobjectStatePayloadRow = {
  becomeReady: boolean;
  conceptId: string;
  familyIds: string[];
  nodeCount: number;
  pointCount: number;
  renderDataNodeCount: number;
  restorable: boolean;
  restoreMismatchCount: number;
  restoreReady: boolean;
  rootId: string;
  targetId: string;
  targetKind: MathMobjectTargetState["kind"];
};

export type MathMobjectStatePayload = MathMobjectStateReadinessSummary & {
  becomeAppliedCount: number;
  becomeNodeCount: number;
  becomePointCount: number;
  becomeReadyCount: number;
  becomeRenderDataNodeCount: number;
  restoreMismatchCount: number;
  restoreNodeCount: number;
  restorePointCount: number;
  restoreReadyCount: number;
  restoreRenderDataNodeCount: number;
  restoreSourceSummary: string;
  restoreUniformNodeCount: number;
  rows: MathMobjectStatePayloadRow[];
  signature: string;
  sourceContract: typeof MOBJECT_STATE_SOURCE_CONTRACT;
  snapshotCount: number;
  targetCount: number;
  targetIds: string[];
  targetNodeCount: number;
  targetPointCount: number;
  targetRenderDataNodeCount: number;
};

export type MathMobjectTargetOptions = {
  nodeOverrides?: Record<string, Partial<Omit<MathMobjectStateNode, "id" | "type">>>;
  targetId?: string;
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

  return `mobject-state-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

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

function finiteVec3(points: Vec3[]) {
  return points.filter((point) => point.every(Number.isFinite));
}

function boundingBox(points: Vec3[]): RuntimeBoundingBox {
  const finitePoints = finiteVec3(points);
  if (finitePoints.length === 0) return { kind: "empty" };

  const min: Vec3 = [...finitePoints[0]];
  const max: Vec3 = [...finitePoints[0]];

  finitePoints.forEach((point) => {
    min[0] = Math.min(min[0], point[0]);
    min[1] = Math.min(min[1], point[1]);
    min[2] = Math.min(min[2], point[2]);
    max[0] = Math.max(max[0], point[0]);
    max[1] = Math.max(max[1], point[1]);
    max[2] = Math.max(max[2], point[2]);
  });

  return {
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    kind: "finite",
    max,
    min
  };
}

function pointsFromRenderState(renderState: RuntimeRenderState): Vec3[] {
  return pointsForRuntimeRenderState(renderState);
}

function stateNodeFromRuntimeNode(node: RuntimeMathObjectNode): MathMobjectStateNode {
  return {
    boundingBox: cloneJson(node.boundingBox),
    childIds: cloneJson(node.childIds),
    colorRole: node.colorRole,
    conceptId: node.conceptId,
    id: node.id,
    parentId: node.parentId,
    renderState: cloneJson(node.renderState),
    spec: cloneJson(node.spec),
    type: node.type,
    uniforms: node.uniforms ? cloneJson(node.uniforms) : undefined
  };
}

function applyNodeOverride(
  node: MathMobjectStateNode,
  override: Partial<Omit<MathMobjectStateNode, "id" | "type">> | undefined
): MathMobjectStateNode {
  if (!override) return cloneJson(node);

  const next: MathMobjectStateNode = {
    ...cloneJson(node),
    ...cloneJson(override)
  };

  if (override.renderState && !override.boundingBox) {
    next.boundingBox = boundingBox(pointsFromRenderState(override.renderState));
  }

  return next;
}

function snapshotFromNodes(rootId: string, familyIds: string[], nodes: Record<string, MathMobjectStateNode>): MathMobjectStateSnapshot {
  const root = nodes[rootId];

  return {
    conceptId: root?.conceptId ?? rootId,
    familyIds: cloneJson(familyIds),
    nodes: cloneJson(nodes),
    rootId
  };
}

export function saveMobjectState(graph: MathObjectGraph, objectId: string): MathMobjectStateSnapshot {
  const familyIndex = buildMobjectFamilyIndex(graph);
  const familyIds = familyIndex.byId[objectId]?.familyIds ?? (graph.byId[objectId] ? [objectId] : []);
  const nodes = Object.fromEntries(
    familyIds
      .map((familyId) => graph.byId[familyId])
      .filter(Boolean)
      .map((node) => [node.id, stateNodeFromRuntimeNode(node)])
  );

  return snapshotFromNodes(objectId, familyIds, nodes);
}

export function restoreMobjectState(graph: MathObjectGraph, snapshot: MathMobjectStateSnapshot): MathObjectGraph {
  const byId = cloneJson(graph.byId);

  snapshot.familyIds.forEach((objectId) => {
    const savedNode = snapshot.nodes[objectId];
    const currentNode = byId[objectId];
    if (!savedNode || !currentNode) return;

    byId[objectId] = {
      ...currentNode,
      boundingBox: cloneJson(savedNode.boundingBox),
      childIds: cloneJson(savedNode.childIds),
      colorRole: savedNode.colorRole,
      conceptId: savedNode.conceptId,
      parentId: savedNode.parentId,
      renderState: cloneJson(savedNode.renderState),
      spec: cloneJson(savedNode.spec),
      type: savedNode.type,
      uniforms: savedNode.uniforms ? cloneJson(savedNode.uniforms) : undefined
    };
  });

  return {
    byId,
    rootIds: cloneJson(graph.rootIds)
  };
}

export function generateMobjectTarget(
  snapshot: MathMobjectStateSnapshot,
  options: MathMobjectTargetOptions = {}
): MathMobjectTargetState {
  const nodes = Object.fromEntries(
    Object.entries(snapshot.nodes).map(([objectId, node]) => [
      objectId,
      applyNodeOverride(node, options.nodeOverrides?.[objectId])
    ])
  );

  return {
    ...snapshotFromNodes(snapshot.rootId, snapshot.familyIds, nodes),
    kind: "target",
    sourceObjectId: snapshot.rootId,
    targetId: options.targetId ?? `${snapshot.rootId}:target`
  };
}

export function becomeMobjectState(
  graph: MathObjectGraph,
  objectId: string,
  target: MathMobjectTargetState
): MathObjectGraph {
  if (!graph.byId[objectId]) return cloneJson(graph);

  const familyIndex = buildMobjectFamilyIndex(graph);
  const sourceFamilyIds = familyIndex.byId[objectId]?.familyIds ?? [objectId];
  const nodes = Object.fromEntries(
    sourceFamilyIds.map((sourceFamilyId, index) => {
      const sourceNode = graph.byId[sourceFamilyId];
      const targetFamilyId = target.familyIds[index];
      const targetNode = targetFamilyId ? target.nodes[targetFamilyId] : undefined;
      const nextNode = targetNode ? cloneJson(targetNode) : stateNodeFromRuntimeNode(sourceNode);

      return [
        sourceFamilyId,
        {
          ...nextNode,
          childIds: cloneJson(sourceNode.childIds),
          id: sourceFamilyId,
          parentId: sourceNode.parentId,
          spec: cloneJson(sourceNode.spec),
          // Manim's become copies target data into the existing mobject without changing its runtime class.
          type: sourceNode.type
        }
      ];
    })
  );

  return restoreMobjectState(graph, {
    conceptId: nodes[objectId]?.conceptId ?? objectId,
    familyIds: sourceFamilyIds,
    nodes,
    rootId: objectId
  });
}

export function summarizeMobjectStateReadiness(graph: MathObjectGraph): MathMobjectStateReadinessSummary {
  const familyIndex = buildMobjectFamilyIndex(graph);
  const familyNodes = Object.values(familyIndex.byId);

  return {
    restorableObjectCount: familyNodes.length,
    stateFamilyRootCount: familyIndex.topLevelIds.length,
    stateSnapshotNodeCount: familyNodes.length,
    targetableObjectCount: familyNodes.filter((node) => node.hasRenderData).length
  };
}

function pointCountForSnapshot(snapshot: MathMobjectStateSnapshot) {
  return Object.values(snapshot.nodes).reduce(
    (sum, node) => sum + pointsFromRenderState(node.renderState).length,
    0
  );
}

function renderDataNodeCountForSnapshot(snapshot: MathMobjectStateSnapshot, familyIndex: MathMobjectFamilyIndex) {
  return snapshot.familyIds.filter((objectId) => familyIndex.byId[objectId]?.hasRenderData).length;
}

function comparableRestoreState(node: MathMobjectStateNode | RuntimeMathObjectNode | undefined) {
  if (!node) return null;

  return {
    boundingBox: node.boundingBox,
    renderState: node.renderState,
    uniforms: node.uniforms
  };
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

function restoreMismatchCount(graph: MathObjectGraph, snapshot: MathMobjectStateSnapshot) {
  const restored = restoreMobjectState(graphWithCorruptedFamilyState(graph, snapshot.familyIds), snapshot);

  return snapshot.familyIds.filter((objectId) => {
    const savedNode = snapshot.nodes[objectId];
    const restoredNode = restored.byId[objectId];

    return stableSerialize(comparableRestoreState(savedNode)) !== stableSerialize(comparableRestoreState(restoredNode));
  }).length;
}

function uniformNodeCountForSnapshot(snapshot: MathMobjectStateSnapshot) {
  return snapshot.familyIds.filter((objectId) => Boolean(snapshot.nodes[objectId]?.uniforms)).length;
}

function statePayloadRow(graph: MathObjectGraph, rootId: string, familyIndex: MathMobjectFamilyIndex): MathMobjectStatePayloadRow {
  const snapshot = saveMobjectState(graph, rootId);
  const target = generateMobjectTarget(snapshot);
  const restorable = snapshot.familyIds.every((objectId) => Boolean(graph.byId[objectId] && snapshot.nodes[objectId]));
  const mismatchCount = restoreMismatchCount(graph, snapshot);

  return {
    becomeReady: Boolean(graph.byId[rootId] && target.nodes[target.rootId]),
    conceptId: snapshot.conceptId,
    familyIds: snapshot.familyIds,
    nodeCount: snapshot.familyIds.length,
    pointCount: pointCountForSnapshot(snapshot),
    renderDataNodeCount: renderDataNodeCountForSnapshot(snapshot, familyIndex),
    restorable,
    restoreMismatchCount: mismatchCount,
    restoreReady: restorable && mismatchCount === 0,
    rootId: snapshot.rootId,
    targetId: target.targetId,
    targetKind: target.kind
  };
}

export function summarizeMobjectStatePayload(payload: MathMobjectStatePayload) {
  return `mobject-state:snapshots=${payload.snapshotCount}:nodes=${payload.stateSnapshotNodeCount}:restorable=${payload.restorableObjectCount}:targetable=${payload.targetableObjectCount}:targets=${payload.targetCount}:become=${payload.becomeReadyCount}`;
}

export function buildMobjectStatePayload(graph: MathObjectGraph): MathMobjectStatePayload {
  const familyIndex = buildMobjectFamilyIndex(graph);
  const rows = familyIndex.topLevelIds
    .map((rootId) => statePayloadRow(graph, rootId, familyIndex))
    .sort((left, right) => left.rootId.localeCompare(right.rootId));
  const becomeRows = rows.filter((row) => row.becomeReady);
  const restoreRows = rows.filter((row) => row.restoreReady);
  const readiness = summarizeMobjectStateReadiness(graph);
  const restoreMismatchCountTotal = rows.reduce((sum, row) => sum + row.restoreMismatchCount, 0);
  const restoreNodeCount = restoreRows.reduce((sum, row) => sum + row.nodeCount, 0);
  const restorePointCount = restoreRows.reduce((sum, row) => sum + row.pointCount, 0);
  const restoreRenderDataNodeCount = restoreRows.reduce((sum, row) => sum + row.renderDataNodeCount, 0);
  const restoreUniformNodeCount = rows.reduce((sum, row) => {
    const snapshot = saveMobjectState(graph, row.rootId);
    return sum + uniformNodeCountForSnapshot(snapshot);
  }, 0);
  const basePayload: Omit<MathMobjectStatePayload, "signature"> = {
    ...readiness,
    becomeAppliedCount: becomeRows.length,
    becomeNodeCount: becomeRows.reduce((sum, row) => sum + row.nodeCount, 0),
    becomePointCount: becomeRows.reduce((sum, row) => sum + row.pointCount, 0),
    becomeReadyCount: rows.filter((row) => row.becomeReady).length,
    becomeRenderDataNodeCount: becomeRows.reduce((sum, row) => sum + row.renderDataNodeCount, 0),
    restoreMismatchCount: restoreMismatchCountTotal,
    restoreNodeCount,
    restorePointCount,
    restoreReadyCount: restoreRows.length,
    restoreRenderDataNodeCount,
    restoreSourceSummary: [
      `restore:rows=${rows.length}`,
      `ready=${restoreRows.length}`,
      `mismatch=${restoreMismatchCountTotal}`,
      `nodes=${restoreNodeCount}`,
      `points=${restorePointCount}`,
      `uniforms=${restoreUniformNodeCount}`
    ].join(":"),
    restoreUniformNodeCount,
    rows,
    sourceContract: MOBJECT_STATE_SOURCE_CONTRACT,
    snapshotCount: rows.length,
    targetCount: rows.length,
    targetIds: rows.map((row) => row.targetId),
    targetNodeCount: rows.reduce((sum, row) => sum + row.nodeCount, 0),
    targetPointCount: rows.reduce((sum, row) => sum + row.pointCount, 0),
    targetRenderDataNodeCount: rows.reduce((sum, row) => sum + row.renderDataNodeCount, 0)
  };

  return {
    ...basePayload,
    signature: hashStableJson(stableSerialize(basePayload))
  };
}

export function serializeMobjectStatePayload(payload: MathMobjectStatePayload) {
  return escapedJson(stableSerialize(payload));
}

export function mobjectStatePayloadDataAttributes(payload: MathMobjectStatePayload) {
  return {
    "data-viz-mobject-state-become-applied-count": String(payload.becomeAppliedCount),
    "data-viz-mobject-state-become-node-count": String(payload.becomeNodeCount),
    "data-viz-mobject-state-become-point-count": String(payload.becomePointCount),
    "data-viz-mobject-state-become-ready-count": String(payload.becomeReadyCount),
    "data-viz-mobject-state-become-render-data-count": String(payload.becomeRenderDataNodeCount),
    "data-viz-mobject-state-family-root-count": String(payload.stateFamilyRootCount),
    "data-viz-mobject-state-node-count": String(payload.stateSnapshotNodeCount),
    "data-viz-mobject-state-restorable-count": String(payload.restorableObjectCount),
    "data-viz-mobject-state-restore-mismatch-count": String(payload.restoreMismatchCount),
    "data-viz-mobject-state-restore-node-count": String(payload.restoreNodeCount),
    "data-viz-mobject-state-restore-point-count": String(payload.restorePointCount),
    "data-viz-mobject-state-restore-ready-count": String(payload.restoreReadyCount),
    "data-viz-mobject-state-restore-render-data-count": String(payload.restoreRenderDataNodeCount),
    "data-viz-mobject-state-restore-source-summary": payload.restoreSourceSummary,
    "data-viz-mobject-state-restore-uniform-node-count": String(payload.restoreUniformNodeCount),
    "data-viz-mobject-state-signature": payload.signature,
    "data-viz-mobject-state-source-contract": payload.sourceContract,
    "data-viz-mobject-state-snapshot-count": String(payload.snapshotCount),
    "data-viz-mobject-state-summary": summarizeMobjectStatePayload(payload),
    "data-viz-mobject-state-target-count": String(payload.targetCount),
    "data-viz-mobject-state-target-ids": payload.targetIds.length > 0 ? payload.targetIds.join(",") : "none",
    "data-viz-mobject-state-target-node-count": String(payload.targetNodeCount),
    "data-viz-mobject-state-target-point-count": String(payload.targetPointCount),
    "data-viz-mobject-state-target-render-data-count": String(payload.targetRenderDataNodeCount),
    "data-viz-mobject-state-targetable-count": String(payload.targetableObjectCount)
  };
}
