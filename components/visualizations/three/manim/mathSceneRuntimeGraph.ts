import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { fixedInFrameUniformObjectIds } from "./mathMobjectUniforms";
import {
  buildSceneGraphStore,
  buildSceneMembershipState,
  sceneRenderGroupIds,
  summarizeSceneGraph
} from "./mathSceneGraph";
import { buildSceneRenderBatches } from "./mathSceneRenderBatches";
import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type {
  MathObjectGraph,
  MathSceneGraphState,
  MathSceneRuntimeState,
  RuntimeBoundingBox,
  RuntimeMathObjectNode,
  RuntimeRenderState
} from "./mathSceneRuntimeState";
import type { MathSceneSpec, TimelineState, Vec3 } from "./mathSceneTypes";

export const RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT =
  "Mobject.update(dt): refresh object bounding boxes and Scene render groups after frame mutations" as const;

export type MathSceneRuntimeGraphFrame = {
  objectGraph: MathObjectGraph;
  sceneGraph: MathSceneGraphState;
  sourceContract: typeof RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT;
};

export type MathSceneRuntimeGraphFrameInput = {
  objectGraph: MathObjectGraph;
  scene: MathSceneSpec;
  timeline: TimelineState;
};

function finiteVec3(points: Vec3[]) {
  return points.filter((point) => point.every(Number.isFinite));
}

function boundingBoxForPoints(points: Vec3[]): RuntimeBoundingBox {
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

export function boundingBoxForRuntimeRenderState(
  renderState: RuntimeRenderState,
  fallback: RuntimeBoundingBox = { kind: "empty" }
): RuntimeBoundingBox {
  const renderStateBox = boundingBoxForPoints(pointsForRuntimeRenderState(renderState));
  return renderStateBox.kind === "finite" ? renderStateBox : fallback;
}

function refreshRuntimeObjectNodeBounds(node: RuntimeMathObjectNode): RuntimeMathObjectNode {
  return {
    ...node,
    boundingBox: boundingBoxForRuntimeRenderState(node.renderState, node.boundingBox),
    childIds: []
  };
}

function relinkRuntimeObjectFamilies(objectGraph: MathObjectGraph): MathObjectGraph {
  const byId = Object.fromEntries(
    Object.entries(objectGraph.byId).map(([objectId, node]) => [objectId, refreshRuntimeObjectNodeBounds(node)])
  );
  const objectIds = Object.keys(byId);

  objectIds.forEach((objectId) => {
    const node = byId[objectId];
    const parentId = node.parentId;
    if (!parentId || parentId === objectId || !byId[parentId]) return;
    byId[parentId].childIds.push(objectId);
  });

  const rootIds = [...objectGraph.rootIds, ...objectIds].filter((objectId, index, ids) => {
    const node = byId[objectId];
    if (!node || ids.indexOf(objectId) !== index) return false;
    return !node.parentId || !byId[node.parentId];
  });

  return {
    byId,
    rootIds
  };
}

function runtimeFixedInFrameObjectIds(scene: MathSceneSpec, objectGraph: MathObjectGraph) {
  return [
    ...(scene.renderGroups?.fixedInFrameObjectIds ?? []),
    ...fixedInFrameUniformObjectIds(scene.objects),
    ...Object.values(objectGraph.byId)
      .filter((node) => node.uniforms?.fixedInFrame)
      .map((node) => node.id)
  ];
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

function summarizeIds(ids: string[]) {
  return ids.length > 0 ? ids.join(",") : "none";
}

function finiteBoundingBoxCount(objectGraph: MathObjectGraph) {
  return Object.values(objectGraph.byId).filter((node) => node.boundingBox.kind === "finite").length;
}

export function summarizeMathSceneRuntimeGraphFrame(frame: MathSceneRuntimeGraphFrame) {
  const objectCount = Object.keys(frame.objectGraph.byId).length;
  const topLevelIds = summarizeIds(frame.sceneGraph.topLevelIds);
  const renderGroupIds = frame.sceneGraph.summary.renderGroupIds;
  const foregroundIds = frame.sceneGraph.summary.foregroundIds;
  const fixedInFrameIds = frame.sceneGraph.summary.fixedInFrameIds;
  const excludedObjectIds = summarizeIds(frame.sceneGraph.membership.excludedObjectIds);

  return [
    `runtime-graph:objects=${objectCount}`,
    `top=${topLevelIds}`,
    `render=${renderGroupIds}`,
    `foreground=${foregroundIds}`,
    `fixed=${fixedInFrameIds}`,
    `finiteBounds=${finiteBoundingBoxCount(frame.objectGraph)}`,
    `excluded=${excludedObjectIds}`
  ].join(":");
}

export function buildMathSceneRuntimeGraphFrame({
  objectGraph,
  scene,
  timeline
}: MathSceneRuntimeGraphFrameInput): MathSceneRuntimeGraphFrame {
  const refreshedObjectGraph = relinkRuntimeObjectFamilies(objectGraph);
  const sceneGraphStore = buildSceneGraphStore(refreshedObjectGraph, {
    fixedInFrameIds: runtimeFixedInFrameObjectIds(scene, refreshedObjectGraph),
    foregroundIds: scene.renderGroups?.foregroundObjectIds
  });
  const familyIndex = buildMobjectFamilyIndex(refreshedObjectGraph);
  const membership = buildSceneMembershipState(scene.timeline, timeline.elapsedSeconds, Object.keys(refreshedObjectGraph.byId));
  const renderGroupOptions = { excludedObjectIds: membership.excludedObjectIds };
  const renderGroups = sceneRenderGroupIds(sceneGraphStore, familyIndex, renderGroupOptions);
  const renderBatches = buildSceneRenderBatches({ objectGraph: refreshedObjectGraph, renderGroups });
  const sceneGraph = {
    ...sceneGraphStore,
    membership,
    renderBatches,
    renderGroups,
    summary: summarizeSceneGraph(sceneGraphStore, familyIndex, renderGroupOptions)
  };

  return {
    objectGraph: refreshedObjectGraph,
    sceneGraph,
    sourceContract: RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT
  };
}

export function runtimeGraphFrameDataAttributes(frame: MathSceneRuntimeGraphFrame) {
  return {
    "data-viz-manim-runtime-graph-excluded-object-ids": summarizeIds(frame.sceneGraph.membership.excludedObjectIds),
    "data-viz-manim-runtime-graph-finite-bounding-box-count": String(finiteBoundingBoxCount(frame.objectGraph)),
    "data-viz-manim-runtime-graph-fixed-in-frame-ids": frame.sceneGraph.summary.fixedInFrameIds,
    "data-viz-manim-runtime-graph-foreground-ids": frame.sceneGraph.summary.foregroundIds,
    "data-viz-manim-runtime-graph-object-count": String(Object.keys(frame.objectGraph.byId).length),
    "data-viz-manim-runtime-graph-render-group-count": String(frame.sceneGraph.summary.renderGroupCount),
    "data-viz-manim-runtime-graph-render-group-ids": frame.sceneGraph.summary.renderGroupIds,
    "data-viz-manim-runtime-graph-source-contract": frame.sourceContract,
    "data-viz-manim-runtime-graph-summary": summarizeMathSceneRuntimeGraphFrame(frame),
    "data-viz-manim-runtime-graph-top-level-ids": summarizeIds(frame.sceneGraph.topLevelIds)
  } as const;
}

export function serializeMathSceneRuntimeGraphFrame(frame: MathSceneRuntimeGraphFrame) {
  return stableSerialize(frame);
}

export function rebuildMathSceneRuntimeGraphState(
  state: MathSceneRuntimeState,
  objectGraph: MathObjectGraph = state.objectGraph
): MathSceneRuntimeState {
  const frame = buildMathSceneRuntimeGraphFrame({
    objectGraph,
    scene: state.sourceScene,
    timeline: state.timeline
  });

  return {
    ...state,
    objectGraph: frame.objectGraph,
    sceneGraph: frame.sceneGraph
  };
}
