import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  addSceneMobject,
  buildSceneGraphStore,
  clearSceneMobjects,
  type MathSceneGraphStore
} from "./mathSceneGraph";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const modulePath = "components/visualizations/three/manim/mathSceneClearMobjectBridge.ts";
const expectedSourceContract =
  "Scene.clear: remove all visible mobject render groups while preserving the object catalog for later restore" as const;

type ClearBridgePlan = {
  afterFixedInFrameIds: string[];
  afterForegroundIds: string[];
  afterRenderGroupIds: string[];
  afterSceneIds: string[];
  beforeFixedInFrameIds: string[];
  beforeForegroundIds: string[];
  beforeRenderGroupIds: string[];
  beforeSceneIds: string[];
  cleared: boolean;
  clearedObjectCount: number;
  clearedObjectIds: string[];
  objectCatalogCount: number;
  sourceContract: typeof expectedSourceContract;
  summary: string;
  version: "mais-manim-scene-clear-mobject-bridge/v1";
};

type ClearBridgeModule = {
  SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT: typeof expectedSourceContract;
  buildSceneClearMobjectBridgePlan: (input: {
    enabled?: boolean;
    familyIndex: ReturnType<typeof buildMobjectFamilyIndex>;
    store: MathSceneGraphStore;
  }) => ClearBridgePlan;
  sceneClearMobjectBridgeDataAttributes: (plan: ClearBridgePlan) => Record<string, string>;
  serializeSceneClearMobjectBridgePlan: (plan: ClearBridgePlan) => string;
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

async function importClearBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.clear mobject bridge module");
  return await import("./mathSceneClearMobjectBridge") as ClearBridgeModule;
}

test("buildSceneClearMobjectBridgePlan removes every render group while preserving the object catalog", async () => {
  const {
    SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    buildSceneClearMobjectBridgePlan,
    sceneClearMobjectBridgeDataAttributes,
    serializeSceneClearMobjectBridgePlan
  } = await importClearBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const plan = buildSceneClearMobjectBridgePlan({ familyIndex, store });

  assert.equal(SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.version, "mais-manim-scene-clear-mobject-bridge/v1");
  assert.equal(plan.cleared, true);
  assert.equal(plan.clearedObjectCount, 4);
  assert.deepEqual(plan.clearedObjectIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.equal(plan.objectCatalogCount, 4);
  assert.deepEqual(plan.beforeSceneIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterSceneIds, []);
  assert.deepEqual(plan.beforeForegroundIds, ["moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterForegroundIds, []);
  assert.deepEqual(plan.beforeFixedInFrameIds, ["probe-trace"]);
  assert.deepEqual(plan.afterFixedInFrameIds, []);
  assert.deepEqual(plan.beforeRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterRenderGroupIds, []);
  assert.equal(
    plan.summary,
    "scene-clear:cleared=true:ids=axes,function-curve,moving-probe,probe-trace:render=none:catalog=4"
  );
  assert.deepEqual(sceneClearMobjectBridgeDataAttributes(plan), {
    "data-viz-scene-clear-mobject-after-fixed-in-frame-ids": "none",
    "data-viz-scene-clear-mobject-after-foreground-ids": "none",
    "data-viz-scene-clear-mobject-after-render-group-ids": "none",
    "data-viz-scene-clear-mobject-after-scene-ids": "none",
    "data-viz-scene-clear-mobject-before-fixed-in-frame-ids": "probe-trace",
    "data-viz-scene-clear-mobject-before-foreground-ids": "moving-probe,probe-trace",
    "data-viz-scene-clear-mobject-before-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-clear-mobject-before-scene-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-clear-mobject-cleared": "true",
    "data-viz-scene-clear-mobject-cleared-object-count": "4",
    "data-viz-scene-clear-mobject-cleared-object-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-clear-mobject-object-catalog-count": "4",
    "data-viz-scene-clear-mobject-source-contract": SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    "data-viz-scene-clear-mobject-summary": plan.summary
  });

  const serialized = serializeSceneClearMobjectBridgePlan(plan);
  assert.doesNotMatch(serialized, /</);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("buildSceneClearMobjectBridgePlan reports already-cleared stores as deterministic no-ops", async () => {
  const { buildSceneClearMobjectBridgePlan, sceneClearMobjectBridgeDataAttributes } = await importClearBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const clearedStore = clearSceneMobjects(store);
  const plan = buildSceneClearMobjectBridgePlan({ familyIndex, store: clearedStore });
  const attributes = sceneClearMobjectBridgeDataAttributes(plan);

  assert.equal(plan.cleared, false);
  assert.deepEqual(plan.clearedObjectIds, []);
  assert.deepEqual(plan.beforeRenderGroupIds, []);
  assert.deepEqual(plan.afterRenderGroupIds, []);
  assert.equal(plan.objectCatalogCount, 4);
  assert.equal(plan.summary, "scene-clear:cleared=false:ids=none:render=none:catalog=4");
  assert.equal(attributes["data-viz-scene-clear-mobject-cleared"], "false");
  assert.equal(attributes["data-viz-scene-clear-mobject-cleared-object-ids"], "none");
});

test("buildSceneClearMobjectBridgePlan supports disabled evidence mode for default runtime diagnostics", async () => {
  const { buildSceneClearMobjectBridgePlan } = await importClearBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const plan = buildSceneClearMobjectBridgePlan({
    enabled: false,
    familyIndex,
    store
  });

  assert.equal(plan.cleared, false);
  assert.deepEqual(plan.clearedObjectIds, []);
  assert.deepEqual(plan.beforeRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.equal(
    plan.summary,
    "scene-clear:cleared=false:ids=none:render=axes,function-curve,moving-probe,probe-trace:catalog=4"
  );
});
