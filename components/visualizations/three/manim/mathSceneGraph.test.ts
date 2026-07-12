import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState, type MathObjectGraph } from "./mathSceneRuntimeState";
import type { AnimationStep, MathSceneSpec } from "./mathSceneTypes";

type MathSceneGraphModule = {
  SCENE_MEMBERSHIP_SOURCE_CONTRACT: string;
  SCENE_RESTRUCTURE_SOURCE_CONTRACT: string;
  addSceneMobject: (
    store: MathSceneGraphStore,
    objectId: string,
    options?: { group?: "scene" | "foreground" | "fixedInFrame" }
  ) => MathSceneGraphStore;
  buildSceneMembershipState: (
    timeline: AnimationStep[],
    elapsedSeconds: number,
    objectIds?: string[]
  ) => {
    activeIntroducerIds: string[];
    activeRemoverIds: string[];
    excludedObjectIds: string[];
    eventSummary: string;
    pendingIntroducerIds: string[];
    removedObjectIds: string[];
    sourceContract: string;
    sourceSummary: string;
  };
  buildSceneGraphStore: (
    graph: MathObjectGraph,
    options?: { fixedInFrameIds?: string[]; foregroundIds?: string[] }
  ) => MathSceneGraphStore;
  bringSceneMobjectToFront: (
    store: MathSceneGraphStore,
    objectId: string,
    options?: { group?: "scene" | "foreground" | "fixedInFrame" }
  ) => MathSceneGraphStore;
  clearSceneMobjects: (store: MathSceneGraphStore) => MathSceneGraphStore;
  removeAllExceptSceneMobjects: (store: MathSceneGraphStore, objectIdsToKeep: string[]) => MathSceneGraphStore;
  removeSceneMobject: (store: MathSceneGraphStore, objectId: string) => MathSceneGraphStore;
  replaceSceneMobject: (
    store: MathSceneGraphStore,
    objectId: string,
    replacementIds: string[],
    options?: { group?: "scene" | "foreground" | "fixedInFrame" }
  ) => MathSceneGraphStore;
  restructureSceneMobjects: (
    store: MathSceneGraphStore,
    objectIdsToRemove: string[]
  ) => {
    plan: {
      detachedRootIds: string[];
      removedObjectIds: string[];
      requestedObjectIds: string[];
      restructuredParentIds: string[];
      sourceContract: string;
      summary: string;
    };
    store: MathSceneGraphStore;
  };
  sceneRestructureDataAttributes: (plan: {
    detachedRootIds: string[];
    removedObjectIds: string[];
    requestedObjectIds: string[];
    restructuredParentIds: string[];
    sourceContract: string;
    summary: string;
  }) => Record<string, string>;
  serializeSceneRestructurePlan: (plan: {
    detachedRootIds: string[];
    removedObjectIds: string[];
    requestedObjectIds: string[];
    restructuredParentIds: string[];
    sourceContract: string;
    summary: string;
  }) => string;
  sceneMembershipDataAttributes: (membership: {
    activeIntroducerIds: string[];
    activeRemoverIds: string[];
    excludedObjectIds: string[];
    eventSummary: string;
    pendingIntroducerIds: string[];
    removedObjectIds: string[];
    sourceContract: string;
    sourceSummary: string;
  }) => Record<string, string>;
  serializeSceneMembershipState: (membership: {
    activeIntroducerIds: string[];
    activeRemoverIds: string[];
    excludedObjectIds: string[];
    eventSummary: string;
    pendingIntroducerIds: string[];
    removedObjectIds: string[];
    sourceContract: string;
    sourceSummary: string;
  }) => string;
  sceneGraphDataAttributes: (summary: MathSceneGraphSummary) => Record<string, string>;
  serializeSceneGraphSummary: (summary: MathSceneGraphSummary) => string;
  sceneRenderGroupIds: (
    store: MathSceneGraphStore,
    familyIndex: ReturnType<typeof buildMobjectFamilyIndex>,
    options?: { excludedObjectIds?: string[] }
  ) => {
    all: string[];
    fixedInFrame: string[];
    foreground: string[];
    scene: string[];
  };
  sendSceneMobjectToBack: (
    store: MathSceneGraphStore,
    objectId: string,
    options?: { group?: "scene" | "foreground" | "fixedInFrame" }
  ) => MathSceneGraphStore;
  summarizeSceneGraph: (
    store: MathSceneGraphStore,
    familyIndex: ReturnType<typeof buildMobjectFamilyIndex>
  ) => MathSceneGraphSummary;
};

type MathSceneGraphStore = {
  byId: MathObjectGraph["byId"];
  fixedInFrameIds: string[];
  foregroundIds: string[];
  removedObjectIds: string[];
  sceneIds: string[];
  topLevelIds: string[];
};

type MathSceneGraphSummary = {
  fixedInFrameCount: number;
  fixedInFrameIds: string;
  foregroundCount: number;
  foregroundIds: string;
  renderGroupOverlapCount: number;
  renderGroupOverlapIds: string;
  renderGroupCount: number;
  renderGroupIds: string;
  sceneRenderableCount: number;
  sceneRenderableIds: string;
  topLevelCount: number;
};

const modulePath = "components/visualizations/three/manim/mathSceneGraph.ts";
const functionGraphSpec = buildMathSceneSpecForThreeDFamily({
  accent: "#22d3ee",
  state: {
    comparison: 5,
    depthValue: 1.4,
    familyId: "three-function-graph",
    mode: 0,
    primaryValue: 6,
    secondaryValue: 5,
    stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
    templateId: "function-graph",
    value: 6
  }
});

function buildZIndexScene(): MathSceneSpec {
  return {
    sceneId: "scene-graph-z-index-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      { type: "vector", id: "front-vector", conceptId: "front", colorRole: "attention", from: [0, 0, 0], to: [1, 0, 0], zIndex: 3 },
      { type: "vector", id: "middle-a", conceptId: "middle-a", colorRole: "function", from: [0, 0, 0], to: [0, 1, 0] },
      { type: "vector", id: "back-vector", conceptId: "back", colorRole: "reference", from: [0, 0, 0], to: [-1, 0, 0], zIndex: -1 },
      { type: "vector", id: "middle-b", conceptId: "middle-b", colorRole: "parameter", from: [0, 0, 0], to: [0, -1, 0] }
    ],
    formulas: [],
    bindings: [],
    timeline: [],
    cameraShots: [{ id: "intro", position: [0, 0, 6], target: [0, 0, 0] }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 4, expectedTokenCount: 0 }
  };
}

async function importSceneGraphModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene-level mobject/render-group module");
  return await import("./mathSceneGraph") as MathSceneGraphModule;
}

test("builds a Manim-style top-level scene graph from parent-linked runtime objects", async () => {
  assert.ok(functionGraphSpec);
  const {
    buildSceneGraphStore,
    sceneRenderGroupIds,
    summarizeSceneGraph,
    sceneGraphDataAttributes,
    serializeSceneGraphSummary
  } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const store = buildSceneGraphStore(runtimeState.objectGraph);
  const renderGroups = sceneRenderGroupIds(store, familyIndex);
  const summary = summarizeSceneGraph(store, familyIndex);

  assert.deepEqual(store.topLevelIds, ["axes", "function-curve"]);
  assert.deepEqual(store.sceneIds, ["axes", "function-curve"]);
  assert.deepEqual(renderGroups.scene, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(renderGroups.foreground, []);
  assert.deepEqual(summary, {
    fixedInFrameCount: 0,
    fixedInFrameIds: "none",
    foregroundCount: 0,
    foregroundIds: "none",
    renderGroupOverlapCount: 0,
    renderGroupOverlapIds: "none",
    renderGroupCount: 4,
    renderGroupIds: "axes,function-curve,moving-probe,probe-trace",
    sceneRenderableCount: 4,
    sceneRenderableIds: "axes,function-curve,moving-probe,probe-trace",
    topLevelCount: 2
  });
  assert.deepEqual(sceneGraphDataAttributes(summary), {
    "data-viz-scene-fixed-in-frame-count": "0",
    "data-viz-scene-fixed-in-frame-ids": "none",
    "data-viz-scene-foreground-count": "0",
    "data-viz-scene-foreground-ids": "none",
    "data-viz-scene-render-group-overlap-count": "0",
    "data-viz-scene-render-group-overlap-ids": "none",
    "data-viz-scene-render-group-count": "4",
    "data-viz-scene-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-renderable-count": "4",
    "data-viz-scene-renderable-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-top-level-mobject-count": "2"
  });
  const json = serializeSceneGraphSummary(summary);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    fixedInFrameCount: 0,
    fixedInFrameIds: "none",
    foregroundCount: 0,
    foregroundIds: "none",
    renderGroupCount: 4,
    renderGroupIds: "axes,function-curve,moving-probe,probe-trace",
    renderGroupOverlapCount: 0,
    renderGroupOverlapIds: "none",
    sceneRenderableCount: 4,
    sceneRenderableIds: "axes,function-curve,moving-probe,probe-trace",
    topLevelCount: 2
  });
});

test("orders scene render groups with Manim bring_to_front and bring_to_back semantics", async () => {
  assert.ok(functionGraphSpec);
  const { bringSceneMobjectToFront, buildSceneGraphStore, sceneRenderGroupIds, sendSceneMobjectToBack } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const initialStore = buildSceneGraphStore(runtimeState.objectGraph);
  const axesInFront = bringSceneMobjectToFront(initialStore, "axes");
  const axesBackAgain = sendSceneMobjectToBack(axesInFront, "axes");
  const overlayStore = buildSceneGraphStore(runtimeState.objectGraph, {
    foregroundIds: ["function-curve", "axes"]
  });
  const axesBehindForeground = sendSceneMobjectToBack(overlayStore, "axes");

  assert.deepEqual(initialStore.sceneIds, ["axes", "function-curve"]);
  assert.deepEqual(axesInFront.sceneIds, ["function-curve", "axes"]);
  assert.deepEqual(sceneRenderGroupIds(axesInFront, familyIndex).all, [
    "function-curve",
    "moving-probe",
    "probe-trace",
    "axes"
  ]);
  assert.deepEqual(axesBackAgain.sceneIds, ["axes", "function-curve"]);
  assert.deepEqual(sceneRenderGroupIds(axesBackAgain, familyIndex).all, [
    "axes",
    "function-curve",
    "moving-probe",
    "probe-trace"
  ]);
  assert.deepEqual(overlayStore.foregroundIds, ["function-curve", "axes"]);
  assert.deepEqual(axesBehindForeground.foregroundIds, ["axes", "function-curve"]);
  assert.deepEqual(sceneRenderGroupIds(axesBehindForeground, familyIndex).all, [
    "axes",
    "function-curve",
    "moving-probe",
    "probe-trace"
  ]);
});

test("sorts scene render groups by Manim z_index while preserving insertion order within each layer", async () => {
  const { buildSceneGraphStore, sceneRenderGroupIds, summarizeSceneGraph } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(buildZIndexScene(), 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const store = buildSceneGraphStore(runtimeState.objectGraph);
  const groups = sceneRenderGroupIds(store, familyIndex);

  assert.deepEqual(store.topLevelIds, ["back-vector", "middle-a", "middle-b", "front-vector"]);
  assert.deepEqual(store.sceneIds, ["back-vector", "middle-a", "middle-b", "front-vector"]);
  assert.deepEqual(groups.all, ["back-vector", "middle-a", "middle-b", "front-vector"]);
  assert.equal(summarizeSceneGraph(store, familyIndex).renderGroupIds, "back-vector,middle-a,middle-b,front-vector");
});

test("addSceneMobject re-sorts scene groups by z_index like Manim Scene.add", async () => {
  const { addSceneMobject, buildSceneGraphStore, removeSceneMobject, sceneRenderGroupIds } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(buildZIndexScene(), 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const initialStore = buildSceneGraphStore(runtimeState.objectGraph);
  const withoutBack = removeSceneMobject(initialStore, "back-vector");
  const withBackAgain = addSceneMobject(withoutBack, "back-vector", { group: "scene" });

  assert.deepEqual(withoutBack.sceneIds, ["middle-a", "middle-b", "front-vector"]);
  assert.deepEqual(withBackAgain.sceneIds, ["back-vector", "middle-a", "middle-b", "front-vector"]);
  assert.deepEqual(sceneRenderGroupIds(withBackAgain, familyIndex).all, [
    "back-vector",
    "middle-a",
    "middle-b",
    "front-vector"
  ]);
});

test("replaceSceneMobject keeps replacements at the original Scene index without z_index resorting", async () => {
  const { buildSceneGraphStore, removeSceneMobject, replaceSceneMobject, sceneRenderGroupIds } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(buildZIndexScene(), 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const initialStore = buildSceneGraphStore(runtimeState.objectGraph);
  const withoutFront = removeSceneMobject(initialStore, "front-vector");
  const replaced = replaceSceneMobject(withoutFront, "middle-a", ["front-vector"]);

  assert.deepEqual(withoutFront.sceneIds, ["back-vector", "middle-a", "middle-b"]);
  assert.deepEqual(replaced.sceneIds, ["back-vector", "front-vector", "middle-b"]);
  assert.deepEqual(replaced.removedObjectIds, ["middle-a"]);
  assert.deepEqual(sceneRenderGroupIds(replaced, familyIndex).all, ["back-vector", "front-vector", "middle-b"]);
});

test("clearSceneMobjects removes every render group while preserving the object catalog", async () => {
  assert.ok(functionGraphSpec);
  const { addSceneMobject, buildSceneGraphStore, clearSceneMobjects, sceneRenderGroupIds, summarizeSceneGraph } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const store = buildSceneGraphStore(runtimeState.objectGraph, {
    fixedInFrameIds: ["probe-trace"],
    foregroundIds: ["moving-probe"]
  });
  const cleared = clearSceneMobjects(store);
  const restoredProbe = addSceneMobject(cleared, "moving-probe");

  assert.equal(Object.keys(cleared.byId).length, Object.keys(store.byId).length);
  assert.deepEqual(cleared.sceneIds, []);
  assert.deepEqual(cleared.foregroundIds, []);
  assert.deepEqual(cleared.fixedInFrameIds, []);
  assert.deepEqual(cleared.removedObjectIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(sceneRenderGroupIds(cleared, familyIndex), {
    all: [],
    fixedInFrame: [],
    foreground: [],
    scene: []
  });
  assert.equal(summarizeSceneGraph(cleared, familyIndex).renderGroupIds, "none");
  assert.deepEqual(restoredProbe.sceneIds, ["moving-probe"]);
  assert.deepEqual(restoredProbe.removedObjectIds, ["axes", "function-curve"]);
  assert.deepEqual(sceneRenderGroupIds(restoredProbe, familyIndex).scene, ["moving-probe", "probe-trace"]);
});

test("removeAllExceptSceneMobjects follows Manim clear plus add z_index semantics", async () => {
  const { buildSceneGraphStore, removeAllExceptSceneMobjects, sceneRenderGroupIds } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(buildZIndexScene(), 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const store = buildSceneGraphStore(runtimeState.objectGraph);
  const onlyEdges = removeAllExceptSceneMobjects(store, ["front-vector", "back-vector"]);

  assert.deepEqual(onlyEdges.sceneIds, ["back-vector", "front-vector"]);
  assert.deepEqual(onlyEdges.foregroundIds, []);
  assert.deepEqual(onlyEdges.fixedInFrameIds, []);
  assert.deepEqual(onlyEdges.removedObjectIds, ["middle-a", "middle-b"]);
  assert.deepEqual(sceneRenderGroupIds(onlyEdges, familyIndex).all, ["back-vector", "front-vector"]);
});

test("adds, reorders, and removes mobject families without mutating previous scene graph stores", async () => {
  assert.ok(functionGraphSpec);
  const { addSceneMobject, buildSceneGraphStore, removeSceneMobject, sceneRenderGroupIds, summarizeSceneGraph } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const initialStore = buildSceneGraphStore(runtimeState.objectGraph);
  const withForeground = addSceneMobject(initialStore, "moving-probe", { group: "foreground" });
  const withFixedOverlay = addSceneMobject(withForeground, "probe-trace", { group: "fixedInFrame" });
  const overlaySummary = summarizeSceneGraph(withFixedOverlay, familyIndex);
  const withoutCurve = removeSceneMobject(withFixedOverlay, "function-curve");
  const renderGroups = sceneRenderGroupIds(withoutCurve, familyIndex);
  const summary = summarizeSceneGraph(withoutCurve, familyIndex);

  assert.deepEqual(initialStore.foregroundIds, []);
  assert.deepEqual(withForeground.foregroundIds, ["moving-probe"]);
  assert.deepEqual(withFixedOverlay.fixedInFrameIds, ["probe-trace"]);
  assert.equal(overlaySummary.renderGroupOverlapCount, 2);
  assert.equal(overlaySummary.renderGroupOverlapIds, "moving-probe,probe-trace");
  assert.deepEqual(withoutCurve.sceneIds, ["axes"]);
  assert.deepEqual(withoutCurve.foregroundIds, []);
  assert.deepEqual(withoutCurve.fixedInFrameIds, []);
  assert.deepEqual(renderGroups.scene, ["axes"]);
  assert.deepEqual(renderGroups.foreground, []);
  assert.deepEqual(renderGroups.fixedInFrame, []);
  assert.deepEqual(renderGroups.all, ["axes"]);
  assert.deepEqual(summary, {
    fixedInFrameCount: 0,
    fixedInFrameIds: "none",
    foregroundCount: 0,
    foregroundIds: "none",
    renderGroupOverlapCount: 0,
    renderGroupOverlapIds: "none",
    renderGroupCount: 1,
    renderGroupIds: "axes",
    sceneRenderableCount: 1,
    sceneRenderableIds: "axes",
    topLevelCount: 2
  });
});

test("removeSceneMobject clears descendant group entries when a parent family is removed", async () => {
  assert.ok(functionGraphSpec);
  const { addSceneMobject, buildSceneGraphStore, removeSceneMobject, sceneRenderGroupIds } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const store = buildSceneGraphStore(runtimeState.objectGraph, {
    fixedInFrameIds: ["probe-trace"],
    foregroundIds: ["moving-probe"]
  });
  const withDuplicateSceneChild = addSceneMobject(store, "probe-trace", { group: "scene" });
  const withoutCurve = removeSceneMobject(withDuplicateSceneChild, "function-curve");
  const renderGroups = sceneRenderGroupIds(withoutCurve, familyIndex);

  assert.deepEqual(withoutCurve.sceneIds, ["axes"]);
  assert.deepEqual(withoutCurve.foregroundIds, []);
  assert.deepEqual(withoutCurve.fixedInFrameIds, []);
  assert.deepEqual(renderGroups, {
    all: ["axes"],
    fixedInFrame: [],
    foreground: [],
    scene: ["axes"]
  });
});

test("removeSceneMobject keeps removed child family members from leaking through parent expansion", async () => {
  assert.ok(functionGraphSpec);
  const { buildSceneGraphStore, removeSceneMobject, sceneRenderGroupIds, summarizeSceneGraph } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const store = buildSceneGraphStore(runtimeState.objectGraph);
  const withoutProbe = removeSceneMobject(store, "moving-probe");
  const renderGroups = sceneRenderGroupIds(withoutProbe, familyIndex);

  assert.deepEqual(withoutProbe.sceneIds, ["axes", "function-curve"]);
  assert.deepEqual(withoutProbe.removedObjectIds, ["moving-probe", "probe-trace"]);
  assert.deepEqual(renderGroups.scene, ["axes", "function-curve"]);
  assert.deepEqual(renderGroups.all, ["axes", "function-curve"]);
  assert.equal(summarizeSceneGraph(withoutProbe, familyIndex).renderGroupIds, "axes,function-curve");
});

test("restructureSceneMobjects mirrors Manim restructure_mobjects for nested child removal", async () => {
  assert.ok(functionGraphSpec);
  const {
    buildSceneGraphStore,
    restructureSceneMobjects,
    SCENE_RESTRUCTURE_SOURCE_CONTRACT,
    sceneRenderGroupIds,
    sceneRestructureDataAttributes,
    serializeSceneRestructurePlan
  } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const store = buildSceneGraphStore(runtimeState.objectGraph);

  const { plan, store: restructured } = restructureSceneMobjects(store, ["moving-probe"]);
  const renderGroups = sceneRenderGroupIds(restructured, familyIndex);

  assert.deepEqual(store.byId["function-curve"].childIds, ["moving-probe"]);
  assert.deepEqual(restructured.byId["function-curve"].childIds, []);
  assert.equal(restructured.byId["moving-probe"].parentId, undefined);
  assert.deepEqual(restructured.removedObjectIds, ["moving-probe", "probe-trace"]);
  assert.deepEqual(renderGroups.scene, ["axes", "function-curve"]);
  assert.deepEqual(renderGroups.all, ["axes", "function-curve"]);
  assert.deepEqual(plan, {
    detachedRootIds: ["moving-probe"],
    removedObjectIds: ["moving-probe", "probe-trace"],
    requestedObjectIds: ["moving-probe"],
    restructuredParentIds: ["function-curve"],
    sourceContract: SCENE_RESTRUCTURE_SOURCE_CONTRACT,
    summary: "restructure:requested=moving-probe:parents=function-curve:removed=moving-probe,probe-trace:detached=moving-probe"
  });
  assert.deepEqual(sceneRestructureDataAttributes(plan), {
    "data-viz-scene-restructure-detached-root-count": "1",
    "data-viz-scene-restructure-detached-root-ids": "moving-probe",
    "data-viz-scene-restructure-parent-count": "1",
    "data-viz-scene-restructure-parent-ids": "function-curve",
    "data-viz-scene-restructure-removed-count": "2",
    "data-viz-scene-restructure-removed-ids": "moving-probe,probe-trace",
    "data-viz-scene-restructure-requested-count": "1",
    "data-viz-scene-restructure-requested-ids": "moving-probe",
    "data-viz-scene-restructure-source-contract": SCENE_RESTRUCTURE_SOURCE_CONTRACT,
    "data-viz-scene-restructure-summary": plan.summary
  });

  const json = serializeSceneRestructurePlan(plan);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    detachedRootIds: ["moving-probe"],
    removedObjectIds: ["moving-probe", "probe-trace"],
    requestedObjectIds: ["moving-probe"],
    restructuredParentIds: ["function-curve"],
    sourceContract: SCENE_RESTRUCTURE_SOURCE_CONTRACT,
    summary: "restructure:requested=moving-probe:parents=function-curve:removed=moving-probe,probe-trace:detached=moving-probe"
  });
});

test("scene membership follows Manim introducer and remover animation lifecycle", async () => {
  const {
    buildSceneGraphStore,
    buildSceneMembershipState,
    SCENE_MEMBERSHIP_SOURCE_CONTRACT,
    sceneMembershipDataAttributes,
    sceneRenderGroupIds,
    serializeSceneMembershipState
  } = await importSceneGraphModule();
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec!, 0);
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const store = buildSceneGraphStore(runtimeState.objectGraph);
  const timeline: AnimationStep[] = [
    { type: "wait", duration: 1 },
    { type: "fadeInObject", objectId: "function-curve", duration: 2, easing: "linear" },
    { type: "wait", duration: 1 },
    { type: "fadeOutObject", objectId: "axes", duration: 2, easing: "linear" }
  ];

  const beforeIntro = buildSceneMembershipState(timeline, 0.5, Object.keys(runtimeState.objectGraph.byId));
  const duringIntro = buildSceneMembershipState(timeline, 1.5, Object.keys(runtimeState.objectGraph.byId));
  const afterRemover = buildSceneMembershipState(timeline, 6, Object.keys(runtimeState.objectGraph.byId));

  assert.deepEqual(beforeIntro.pendingIntroducerIds, ["function-curve"]);
  assert.deepEqual(beforeIntro.excludedObjectIds, ["function-curve"]);
  assert.equal(
    beforeIntro.eventSummary,
    "introducer:function-curve@1.000-3.000|remover:axes@4.000-6.000"
  );
  assert.equal(
    beforeIntro.sourceSummary,
    "membership:events=2:introducers=function-curve:removers=axes"
  );
  assert.equal(beforeIntro.sourceContract, SCENE_MEMBERSHIP_SOURCE_CONTRACT);
  assert.equal(
    sceneMembershipDataAttributes(beforeIntro)["data-viz-scene-membership-source-contract"],
    SCENE_MEMBERSHIP_SOURCE_CONTRACT
  );
  const json = serializeSceneMembershipState(beforeIntro);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    activeIntroducerIds: [],
    activeRemoverIds: [],
    excludedObjectIds: ["function-curve"],
    eventSummary: "introducer:function-curve@1.000-3.000|remover:axes@4.000-6.000",
    pendingIntroducerIds: ["function-curve"],
    removedObjectIds: [],
    sourceContract: SCENE_MEMBERSHIP_SOURCE_CONTRACT,
    sourceSummary: "membership:events=2:introducers=function-curve:removers=axes"
  });
  assert.deepEqual(sceneRenderGroupIds(store, familyIndex, { excludedObjectIds: beforeIntro.excludedObjectIds }).scene, ["axes"]);
  assert.deepEqual(duringIntro.activeIntroducerIds, ["function-curve"]);
  assert.deepEqual(duringIntro.excludedObjectIds, []);
  assert.deepEqual(sceneRenderGroupIds(store, familyIndex, { excludedObjectIds: duringIntro.excludedObjectIds }).scene, [
    "axes",
    "function-curve",
    "moving-probe",
    "probe-trace"
  ]);
  assert.deepEqual(afterRemover.removedObjectIds, ["axes"]);
  assert.deepEqual(afterRemover.excludedObjectIds, ["axes"]);
  assert.deepEqual(sceneRenderGroupIds(store, familyIndex, { excludedObjectIds: afterRemover.excludedObjectIds }).scene, [
    "function-curve",
    "moving-probe",
    "probe-trace"
  ]);
});

test("scene graph module stays pure and separate from R3F rendering", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneGraph.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
  assert.match(source, /bringSceneMobjectToFront/);
  assert.match(source, /sendSceneMobjectToBack/);
  assert.match(source, /replaceSceneMobject/);
  assert.match(source, /SCENE_MEMBERSHIP_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_RESTRUCTURE_SOURCE_CONTRACT/);
  assert.match(source, /restructureSceneMobjects/);
  assert.match(source, /serializeSceneGraphSummary/);
  assert.match(source, /serializeSceneMembershipState/);
  assert.match(source, /serializeSceneRestructurePlan/);
  assert.match(source, /stableSerialize/);
  assert.match(source, /clearSceneMobjects/);
  assert.match(source, /removeAllExceptSceneMobjects/);
});
