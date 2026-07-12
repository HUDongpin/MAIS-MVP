import { buildMobjectFamilyIndex, type MathMobjectFamilyIndex } from "./mathMobjectFamily";
import { buildMathUpdaterSignaturePlan, type MathUpdaterExecutionMode } from "./mathUpdaterSignature";
import { buildUpdaterSuspensionPlan } from "./mathUpdaterSuspension";
import type { MathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathUpdaterEntry } from "./mathUpdaterRegistry";

export const MOBJECT_UPDATE_SOURCE_CONTRACT =
  "Mobject.update(dt): recursively update submobjects, then call updater functions; dt-aware updaters receive elapsed time" as const;

export type MathUpdaterExecutionPhase = "active" | "idle" | "mixed" | "suspended";

export type MathUpdaterExecutionRow = {
  activeUpdaterIds: string[];
  dependencyUpdaterIds: string[];
  depth: number;
  dtAwareUpdaterIds: string[];
  familyPath: string;
  objectId: string;
  order: number;
  parentId?: string;
  phase: MathUpdaterExecutionPhase;
  suspendedUpdaterIds: string[];
  timelineUpdaterIds: string[];
  updaterIds: string[];
};

export type MathUpdaterExecutionPlan = {
  activeCallSequence: string[];
  activeUpdaterCount: number;
  activeUpdaterIds: string[];
  dependencyUpdaterCount: number;
  dtAwareUpdaterCount: number;
  familyPaths: string[];
  familyTraversalObjectIds: string[];
  familyTraversalSummary: string;
  idleTraversalObjectIds: string[];
  maxDepth: number;
  orderSummary: string;
  phase: "animation" | "open";
  recursiveOrder: "children-first";
  rows: MathUpdaterExecutionRow[];
  rowCount: number;
  signature: string;
  sourceContract: typeof MOBJECT_UPDATE_SOURCE_CONTRACT;
  suspendedUpdaterCount: number;
  suspendedUpdaterIds: string[];
  timelineUpdaterCount: number;
  totalUpdaterCount: number;
  traversalObjectIds: string[];
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

  return `updater-execution-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function commaList(ids: string[]) {
  return ids.length > 0 ? ids.join(",") : "none";
}

function pipeList(ids: string[]) {
  return ids.length > 0 ? ids.join("|") : "none";
}

function postorderTraversal(index: MathMobjectFamilyIndex, objectId: string, seen = new Set<string>()): string[] {
  if (seen.has(objectId) || !index.byId[objectId]) return [];

  const nextSeen = new Set(seen);
  nextSeen.add(objectId);
  const childIds = [...index.byId[objectId].childIds].sort((left, right) => left.localeCompare(right));

  return [
    ...childIds.flatMap((childId) => postorderTraversal(index, childId, nextSeen)),
    objectId
  ];
}

function traversalObjectIds(index: MathMobjectFamilyIndex) {
  const seen = new Set<string>();
  const ids: string[] = [];

  index.topLevelIds.forEach((rootId) => {
    postorderTraversal(index, rootId).forEach((objectId) => {
      if (seen.has(objectId)) return;
      seen.add(objectId);
      ids.push(objectId);
    });
  });

  return ids;
}

function familyPath(index: MathMobjectFamilyIndex, objectId: string) {
  const ids: string[] = [];
  let currentId: string | undefined = objectId;
  const seen = new Set<string>();

  while (currentId && !seen.has(currentId) && index.byId[currentId]) {
    seen.add(currentId);
    ids.push(currentId);
    currentId = index.byId[currentId].parentId;
  }

  return ids.reverse().join("/");
}

function rowPhase(activeUpdaterIds: string[], suspendedUpdaterIds: string[]): MathUpdaterExecutionPhase {
  if (activeUpdaterIds.length > 0 && suspendedUpdaterIds.length > 0) return "mixed";
  if (activeUpdaterIds.length > 0) return "active";
  if (suspendedUpdaterIds.length > 0) return "suspended";
  return "idle";
}

function maxDepthFor(rows: MathUpdaterExecutionRow[]) {
  return rows.reduce((maxDepth, row) => Math.max(maxDepth, row.depth), 0);
}

function updaterOrderSummary(rows: MathUpdaterExecutionRow[]) {
  const orderedRows = rows.map((row) => `${row.objectId}@${row.depth}`).join("<") || "none";

  return `children-first:${orderedRows}`;
}

function updaterFamilyTraversalSummary(familyTraversalObjectIds: string[], traversalObjectIds: string[], idleTraversalObjectIds: string[]) {
  return [
    `familyTraversal:visited=${familyTraversalObjectIds.length}`,
    `withUpdaters=${traversalObjectIds.length}`,
    `idle=${idleTraversalObjectIds.length}`,
    "order=children-first",
    `ids=${commaList(familyTraversalObjectIds)}`
  ].join(":");
}

function executionModeLabel(mode: MathUpdaterExecutionMode | undefined) {
  if (mode === "dt-aware") return "dt";
  if (mode === "timeline-progress") return "timeline";
  if (mode === "dependency-redraw") return "dependencies";
  return "unknown";
}

function activeUpdaterCallSequence(
  rows: MathUpdaterExecutionRow[],
  executionModeByUpdaterId: Map<string, MathUpdaterExecutionMode>
) {
  return rows.flatMap((row) => {
    const activeUpdaterIds = new Set(row.activeUpdaterIds);

    return row.updaterIds
      .filter((updaterId) => activeUpdaterIds.has(updaterId))
      .map((updaterId) => `${updaterId}(${executionModeLabel(executionModeByUpdaterId.get(updaterId))})`);
  });
}

function idsForMode(entries: MathUpdaterEntry[], executionModeByUpdaterId: Map<string, MathUpdaterExecutionMode>, mode: MathUpdaterExecutionMode) {
  return entries
    .filter((entry) => executionModeByUpdaterId.get(entry.id) === mode)
    .map((entry) => entry.id);
}

function updaterRows(runtimeState: MathSceneRuntimeState, index: MathMobjectFamilyIndex) {
  const signaturePlan = buildMathUpdaterSignaturePlan(runtimeState.updaters);
  const executionModeByUpdaterId = new Map(signaturePlan.entries.map((entry) => [entry.id, entry.executionMode]));
  const suspensionPlan = buildUpdaterSuspensionPlan({
    familyIndex: index,
    scene: runtimeState.sourceScene,
    timeline: runtimeState.timeline,
    updaters: runtimeState.updaters
  });
  const activeUpdaterIds = new Set(suspensionPlan.activeUpdaterIds);
  const suspendedUpdaterIds = new Set(suspensionPlan.suspendedUpdaterIds);
  const registryOrder = new Map(runtimeState.updaters.entries.map((entry, index) => [entry.id, index]));
  const entriesByObjectId = runtimeState.updaters.entries.reduce<Record<string, MathUpdaterEntry[]>>((grouped, entry) => {
    grouped[entry.objectId] = [...(grouped[entry.objectId] ?? []), entry];
    return grouped;
  }, {});
  const traversalIds = traversalObjectIds(index);
  const rows = traversalIds
    .map((objectId) => {
      const entries = (entriesByObjectId[objectId] ?? []).sort(
        (left, right) => (registryOrder.get(left.id) ?? 0) - (registryOrder.get(right.id) ?? 0)
      );
      if (entries.length === 0) return null;

      const updaterIds = entries.map((entry) => entry.id);
      const activeIds = updaterIds.filter((updaterId) => activeUpdaterIds.has(updaterId));
      const suspendedIds = updaterIds.filter((updaterId) => suspendedUpdaterIds.has(updaterId));
      const node = index.byId[objectId];
      const row: MathUpdaterExecutionRow = {
        activeUpdaterIds: activeIds,
        dependencyUpdaterIds: idsForMode(entries, executionModeByUpdaterId, "dependency-redraw"),
        depth: node.depth,
        dtAwareUpdaterIds: idsForMode(entries, executionModeByUpdaterId, "dt-aware"),
        familyPath: familyPath(index, objectId),
        objectId,
        order: 0,
        phase: rowPhase(activeIds, suspendedIds),
        suspendedUpdaterIds: suspendedIds,
        timelineUpdaterIds: idsForMode(entries, executionModeByUpdaterId, "timeline-progress"),
        updaterIds
      };

      return node.parentId ? { ...row, parentId: node.parentId } : row;
    })
    .filter((row): row is MathUpdaterExecutionRow => Boolean(row))
    .map((row, order) => ({ ...row, order }));

  return {
    familyTraversalObjectIds: traversalIds,
    rows,
    signaturePlan,
    suspensionPlan
  };
}

export function summarizeMathUpdaterExecutionPlan(plan: MathUpdaterExecutionPlan) {
  return `updater-execution:phase=${plan.phase}:rows=${plan.rowCount}:updaters=${plan.totalUpdaterCount}:active=${plan.activeUpdaterCount}:suspended=${plan.suspendedUpdaterCount}:dt=${plan.dtAwareUpdaterCount}:timeline=${plan.timelineUpdaterCount}:dependency=${plan.dependencyUpdaterCount}`;
}

export function buildMathUpdaterExecutionPlan(runtimeState: MathSceneRuntimeState): MathUpdaterExecutionPlan {
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const { familyTraversalObjectIds, rows, signaturePlan, suspensionPlan } = updaterRows(runtimeState, familyIndex);
  const executionModeByUpdaterId = new Map(signaturePlan.entries.map((entry) => [entry.id, entry.executionMode]));
  const activeCallSequence = activeUpdaterCallSequence(rows, executionModeByUpdaterId);
  const familyPaths = rows.map((row) => row.familyPath);
  const traversalObjectIds = rows.map((row) => row.objectId);
  const updaterObjectIds = new Set(traversalObjectIds);
  const idleTraversalObjectIds = familyTraversalObjectIds.filter((objectId) => !updaterObjectIds.has(objectId));
  const basePlan = {
    activeCallSequence,
    activeUpdaterCount: suspensionPlan.activeUpdaterIds.length,
    activeUpdaterIds: suspensionPlan.activeUpdaterIds,
    dependencyUpdaterCount: signaturePlan.dependencyUpdaterIds.length,
    dtAwareUpdaterCount: signaturePlan.dtAwareUpdaterIds.length,
    familyPaths,
    familyTraversalObjectIds,
    familyTraversalSummary: updaterFamilyTraversalSummary(familyTraversalObjectIds, traversalObjectIds, idleTraversalObjectIds),
    idleTraversalObjectIds,
    maxDepth: maxDepthFor(rows),
    orderSummary: updaterOrderSummary(rows),
    phase: suspensionPlan.phase,
    recursiveOrder: "children-first" as const,
    rows,
    rowCount: rows.length,
    sourceContract: MOBJECT_UPDATE_SOURCE_CONTRACT,
    suspendedUpdaterCount: suspensionPlan.suspendedUpdaterIds.length,
    suspendedUpdaterIds: suspensionPlan.suspendedUpdaterIds,
    timelineUpdaterCount: signaturePlan.timelineUpdaterIds.length,
    totalUpdaterCount: signaturePlan.totalUpdaterCount,
    traversalObjectIds
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan))
  };
}

export function serializeMathUpdaterExecutionPlan(plan: MathUpdaterExecutionPlan) {
  return escapedJson(stableSerialize(plan));
}

export function updaterExecutionPlanDataAttributes(plan: MathUpdaterExecutionPlan) {
  return {
    "data-viz-manim-updater-execution-active-call-sequence": plan.activeCallSequence.join(">") || "none",
    "data-viz-manim-updater-execution-active-count": String(plan.activeUpdaterCount),
    "data-viz-manim-updater-execution-dependency-count": String(plan.dependencyUpdaterCount),
    "data-viz-manim-updater-execution-dt-aware-count": String(plan.dtAwareUpdaterCount),
    "data-viz-manim-updater-execution-family-paths": pipeList(plan.familyPaths),
    "data-viz-manim-updater-execution-family-traversal-object-ids": commaList(plan.familyTraversalObjectIds),
    "data-viz-manim-updater-execution-family-traversal-summary": plan.familyTraversalSummary,
    "data-viz-manim-updater-execution-idle-object-ids": commaList(plan.idleTraversalObjectIds),
    "data-viz-manim-updater-execution-max-depth": String(plan.maxDepth),
    "data-viz-manim-updater-execution-object-ids": commaList(plan.traversalObjectIds),
    "data-viz-manim-updater-execution-order-summary": plan.orderSummary,
    "data-viz-manim-updater-execution-phase": plan.phase,
    "data-viz-manim-updater-execution-recursive-order": plan.recursiveOrder,
    "data-viz-manim-updater-execution-row-count": String(plan.rowCount),
    "data-viz-manim-updater-execution-signature": plan.signature,
    "data-viz-manim-updater-execution-source-contract": plan.sourceContract,
    "data-viz-manim-updater-execution-summary": summarizeMathUpdaterExecutionPlan(plan),
    "data-viz-manim-updater-execution-suspended-count": String(plan.suspendedUpdaterCount),
    "data-viz-manim-updater-execution-timeline-count": String(plan.timelineUpdaterCount),
    "data-viz-manim-updater-execution-updater-count": String(plan.totalUpdaterCount)
  };
}
