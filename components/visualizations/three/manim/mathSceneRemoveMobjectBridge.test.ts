import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  addSceneMobject,
  buildSceneGraphStore,
  type MathSceneGraphStore
} from "./mathSceneGraph";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const modulePath = "components/visualizations/three/manim/mathSceneRemoveMobjectBridge.ts";
const expectedSourceContract =
  "Scene.remove: remove a mobject family from all render groups and prevent removed descendants from leaking through parent expansion" as const;

type RemoveBridgePlan = {
  afterFixedInFrameIds: string[];
  afterForegroundIds: string[];
  afterRenderGroupIds: string[];
  afterSceneIds: string[];
  beforeFixedInFrameIds: string[];
  beforeForegroundIds: string[];
  beforeRenderGroupIds: string[];
  beforeSceneIds: string[];
  descendantRemovedIds: string[];
  objectId: string;
  removed: boolean;
  removedFamilyCount: number;
  removedFamilyIds: string[];
  sourceContract: typeof expectedSourceContract;
  summary: string;
  version: "mais-manim-scene-remove-mobject-bridge/v1";
};

type RemoveBridgeModule = {
  SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT: typeof expectedSourceContract;
  buildSceneRemoveMobjectBridgePlan: (input: {
    familyIndex: ReturnType<typeof buildMobjectFamilyIndex>;
    objectId: string;
    store: MathSceneGraphStore;
  }) => RemoveBridgePlan;
  sceneRemoveMobjectBridgeDataAttributes: (plan: RemoveBridgePlan) => Record<string, string>;
  serializeSceneRemoveMobjectBridgePlan: (plan: RemoveBridgePlan) => string;
};

function buildFunctionGraphState() {
  const scene = buildMathSceneSpecForThreeDFamily({
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

  if (!scene) throw new Error("expected function graph MAIS Manim spec");

  const runtimeState = buildMathSceneRuntimeState(scene, 0);
  const baseStore = buildSceneGraphStore(runtimeState.objectGraph);
  const withForegroundChild = addSceneMobject(baseStore, "moving-probe", { group: "foreground" });
  const withFixedChild = addSceneMobject(withForegroundChild, "probe-trace", { group: "fixedInFrame" });

  return {
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    store: withFixedChild
  };
}

async function importRemoveBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.remove mobject bridge module");
  return await import("./mathSceneRemoveMobjectBridge") as RemoveBridgeModule;
}

test("buildSceneRemoveMobjectBridgePlan removes parent families from every render group", async () => {
  const {
    SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    buildSceneRemoveMobjectBridgePlan,
    sceneRemoveMobjectBridgeDataAttributes,
    serializeSceneRemoveMobjectBridgePlan
  } = await importRemoveBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const plan = buildSceneRemoveMobjectBridgePlan({
    familyIndex,
    objectId: "function-curve",
    store
  });

  assert.equal(SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.version, "mais-manim-scene-remove-mobject-bridge/v1");
  assert.equal(plan.objectId, "function-curve");
  assert.equal(plan.removed, true);
  assert.equal(plan.removedFamilyCount, 3);
  assert.deepEqual(plan.removedFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.descendantRemovedIds, ["moving-probe", "probe-trace"]);
  assert.deepEqual(plan.beforeSceneIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterSceneIds, ["axes"]);
  assert.deepEqual(plan.beforeForegroundIds, ["moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterForegroundIds, []);
  assert.deepEqual(plan.beforeFixedInFrameIds, ["probe-trace"]);
  assert.deepEqual(plan.afterFixedInFrameIds, []);
  assert.deepEqual(plan.beforeRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterRenderGroupIds, ["axes"]);
  assert.equal(
    plan.summary,
    "scene-remove:function-curve:removed=true:family=function-curve,moving-probe,probe-trace:descendants=moving-probe,probe-trace:render=axes"
  );
  assert.deepEqual(sceneRemoveMobjectBridgeDataAttributes(plan), {
    "data-viz-scene-remove-mobject-after-fixed-in-frame-ids": "none",
    "data-viz-scene-remove-mobject-after-foreground-ids": "none",
    "data-viz-scene-remove-mobject-after-render-group-ids": "axes",
    "data-viz-scene-remove-mobject-after-scene-ids": "axes",
    "data-viz-scene-remove-mobject-before-fixed-in-frame-ids": "probe-trace",
    "data-viz-scene-remove-mobject-before-foreground-ids": "moving-probe,probe-trace",
    "data-viz-scene-remove-mobject-before-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-remove-mobject-before-scene-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-remove-mobject-descendant-removed-ids": "moving-probe,probe-trace",
    "data-viz-scene-remove-mobject-object-id": "function-curve",
    "data-viz-scene-remove-mobject-removed": "true",
    "data-viz-scene-remove-mobject-removed-family-count": "3",
    "data-viz-scene-remove-mobject-removed-family-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-scene-remove-mobject-source-contract": SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    "data-viz-scene-remove-mobject-summary": plan.summary
  });

  const serialized = serializeSceneRemoveMobjectBridgePlan(plan);
  assert.doesNotMatch(serialized, /</);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("buildSceneRemoveMobjectBridgePlan reports missing objects as deterministic no-ops", async () => {
  const { buildSceneRemoveMobjectBridgePlan, sceneRemoveMobjectBridgeDataAttributes } = await importRemoveBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const plan = buildSceneRemoveMobjectBridgePlan({
    familyIndex,
    objectId: "missing-curve",
    store
  });
  const attributes = sceneRemoveMobjectBridgeDataAttributes(plan);

  assert.equal(plan.removed, false);
  assert.deepEqual(plan.removedFamilyIds, []);
  assert.deepEqual(plan.descendantRemovedIds, []);
  assert.deepEqual(plan.afterRenderGroupIds, plan.beforeRenderGroupIds);
  assert.equal(plan.summary, "scene-remove:missing-curve:removed=false:family=none:descendants=none:render=axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-scene-remove-mobject-removed"], "false");
  assert.equal(attributes["data-viz-scene-remove-mobject-object-id"], "missing-curve");
  assert.equal(attributes["data-viz-scene-remove-mobject-removed-family-ids"], "none");
});
