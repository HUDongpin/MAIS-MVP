import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  addSceneMobject,
  buildSceneGraphStore,
  removeSceneMobject,
  type MathSceneGraphStore,
  type MathSceneRenderGroup
} from "./mathSceneGraph";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const modulePath = "components/visualizations/three/manim/mathSceneAddMobjectBridge.ts";
const expectedSourceContract =
  "Scene.add: assign a mobject to a render group, restore its family from removed state, and sort scene additions by z_index" as const;

type AddBridgePlan = {
  afterFixedInFrameIds: string[];
  afterForegroundIds: string[];
  afterRenderGroupIds: string[];
  afterSceneIds: string[];
  beforeFixedInFrameIds: string[];
  beforeForegroundIds: string[];
  beforeRenderGroupIds: string[];
  beforeSceneIds: string[];
  group: MathSceneRenderGroup;
  objectId: string;
  added: boolean;
  restoredFamilyCount: number;
  restoredFamilyIds: string[];
  sourceContract: typeof expectedSourceContract;
  summary: string;
  version: "mais-manim-scene-add-mobject-bridge/v1";
};

type AddBridgeModule = {
  SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT: typeof expectedSourceContract;
  buildSceneAddMobjectBridgePlan: (input: {
    familyIndex: ReturnType<typeof buildMobjectFamilyIndex>;
    group?: MathSceneRenderGroup;
    objectId: string;
    store: MathSceneGraphStore;
  }) => AddBridgePlan;
  sceneAddMobjectBridgeDataAttributes: (plan: AddBridgePlan) => Record<string, string>;
  serializeSceneAddMobjectBridgePlan: (plan: AddBridgePlan) => string;
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
  const storeWithRemovedCurve = removeSceneMobject(baseStore, "function-curve");

  return {
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    store: storeWithRemovedCurve
  };
}

async function importAddBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.add mobject bridge module");
  return await import("./mathSceneAddMobjectBridge") as AddBridgeModule;
}

test("buildSceneAddMobjectBridgePlan restores removed families into the requested render group", async () => {
  const {
    SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    buildSceneAddMobjectBridgePlan,
    sceneAddMobjectBridgeDataAttributes,
    serializeSceneAddMobjectBridgePlan
  } = await importAddBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const plan = buildSceneAddMobjectBridgePlan({
    familyIndex,
    group: "foreground",
    objectId: "function-curve",
    store
  });

  assert.equal(SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.version, "mais-manim-scene-add-mobject-bridge/v1");
  assert.equal(plan.objectId, "function-curve");
  assert.equal(plan.group, "foreground");
  assert.equal(plan.added, true);
  assert.equal(plan.restoredFamilyCount, 3);
  assert.deepEqual(plan.restoredFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.beforeSceneIds, ["axes"]);
  assert.deepEqual(plan.afterSceneIds, ["axes"]);
  assert.deepEqual(plan.beforeForegroundIds, []);
  assert.deepEqual(plan.afterForegroundIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.beforeFixedInFrameIds, []);
  assert.deepEqual(plan.afterFixedInFrameIds, []);
  assert.deepEqual(plan.beforeRenderGroupIds, ["axes"]);
  assert.deepEqual(plan.afterRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.equal(
    plan.summary,
    "scene-add:function-curve:group=foreground:added=true:restored=function-curve,moving-probe,probe-trace:render=axes,function-curve,moving-probe,probe-trace"
  );
  assert.deepEqual(sceneAddMobjectBridgeDataAttributes(plan), {
    "data-viz-scene-add-mobject-after-fixed-in-frame-ids": "none",
    "data-viz-scene-add-mobject-after-foreground-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-scene-add-mobject-after-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-add-mobject-after-scene-ids": "axes",
    "data-viz-scene-add-mobject-before-fixed-in-frame-ids": "none",
    "data-viz-scene-add-mobject-before-foreground-ids": "none",
    "data-viz-scene-add-mobject-before-render-group-ids": "axes",
    "data-viz-scene-add-mobject-before-scene-ids": "axes",
    "data-viz-scene-add-mobject-added": "true",
    "data-viz-scene-add-mobject-group": "foreground",
    "data-viz-scene-add-mobject-object-id": "function-curve",
    "data-viz-scene-add-mobject-restored-family-count": "3",
    "data-viz-scene-add-mobject-restored-family-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-scene-add-mobject-source-contract": SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    "data-viz-scene-add-mobject-summary": plan.summary
  });

  const serialized = serializeSceneAddMobjectBridgePlan(plan);
  assert.doesNotMatch(serialized, /</);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("buildSceneAddMobjectBridgePlan reports already-visible scene additions deterministically", async () => {
  const { buildSceneAddMobjectBridgePlan, sceneAddMobjectBridgeDataAttributes } = await importAddBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const visibleStore = addSceneMobject(store, "function-curve", { group: "scene" });
  const plan = buildSceneAddMobjectBridgePlan({
    familyIndex,
    objectId: "function-curve",
    store: visibleStore
  });
  const attributes = sceneAddMobjectBridgeDataAttributes(plan);

  assert.equal(plan.added, false);
  assert.deepEqual(plan.restoredFamilyIds, []);
  assert.deepEqual(plan.beforeRenderGroupIds, plan.afterRenderGroupIds);
  assert.equal(
    plan.summary,
    "scene-add:function-curve:group=scene:added=false:restored=none:render=axes,function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-scene-add-mobject-added"], "false");
  assert.equal(attributes["data-viz-scene-add-mobject-object-id"], "function-curve");
  assert.equal(attributes["data-viz-scene-add-mobject-restored-family-ids"], "none");
});

test("buildSceneAddMobjectBridgePlan treats moving a visible mobject to foreground as a Scene.add change", async () => {
  const { buildSceneAddMobjectBridgePlan } = await importAddBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const visibleStore = addSceneMobject(store, "function-curve", { group: "scene" });
  const plan = buildSceneAddMobjectBridgePlan({
    familyIndex,
    group: "foreground",
    objectId: "function-curve",
    store: visibleStore
  });

  assert.equal(plan.added, true);
  assert.deepEqual(plan.beforeSceneIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterSceneIds, ["axes"]);
  assert.deepEqual(plan.beforeForegroundIds, []);
  assert.deepEqual(plan.afterForegroundIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.equal(
    plan.summary,
    "scene-add:function-curve:group=foreground:added=true:restored=none:render=axes,function-curve,moving-probe,probe-trace"
  );
});
