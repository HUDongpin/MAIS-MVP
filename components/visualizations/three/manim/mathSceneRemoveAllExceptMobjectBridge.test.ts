import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  buildSceneGraphStore,
  type MathSceneGraphStore
} from "./mathSceneGraph";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const modulePath = "components/visualizations/three/manim/mathSceneRemoveAllExceptMobjectBridge.ts";
const expectedSourceContract =
  "Scene.remove_all_except: clear scene render groups, then restore requested mobjects with Scene.add z_index semantics" as const;

type RemoveAllExceptBridgePlan = {
  afterFixedInFrameIds: string[];
  afterForegroundIds: string[];
  afterRenderGroupIds: string[];
  afterSceneIds: string[];
  beforeFixedInFrameIds: string[];
  beforeForegroundIds: string[];
  beforeRenderGroupIds: string[];
  beforeSceneIds: string[];
  changed: boolean;
  keptObjectCount: number;
  keptObjectIds: string[];
  objectCatalogCount: number;
  removedObjectCount: number;
  removedObjectIds: string[];
  requestedKeepIds: string[];
  sourceContract: typeof expectedSourceContract;
  summary: string;
  version: "mais-manim-scene-remove-all-except-mobject-bridge/v1";
};

type RemoveAllExceptBridgeModule = {
  SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT: typeof expectedSourceContract;
  buildSceneRemoveAllExceptMobjectBridgePlan: (input: {
    enabled?: boolean;
    familyIndex: ReturnType<typeof buildMobjectFamilyIndex>;
    objectIdsToKeep: string[];
    store: MathSceneGraphStore;
  }) => RemoveAllExceptBridgePlan;
  sceneRemoveAllExceptMobjectBridgeDataAttributes: (plan: RemoveAllExceptBridgePlan) => Record<string, string>;
  serializeSceneRemoveAllExceptMobjectBridgePlan: (plan: RemoveAllExceptBridgePlan) => string;
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
  return {
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    store: buildSceneGraphStore(runtimeState.objectGraph)
  };
}

async function importRemoveAllExceptBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.remove_all_except mobject bridge module");
  return await import("./mathSceneRemoveAllExceptMobjectBridge") as RemoveAllExceptBridgeModule;
}

test("buildSceneRemoveAllExceptMobjectBridgePlan clears the scene and restores only requested mobjects", async () => {
  const {
    SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    buildSceneRemoveAllExceptMobjectBridgePlan,
    sceneRemoveAllExceptMobjectBridgeDataAttributes,
    serializeSceneRemoveAllExceptMobjectBridgePlan
  } = await importRemoveAllExceptBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const plan = buildSceneRemoveAllExceptMobjectBridgePlan({
    familyIndex,
    objectIdsToKeep: ["missing-object", "moving-probe", "moving-probe"],
    store
  });

  assert.equal(SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.version, "mais-manim-scene-remove-all-except-mobject-bridge/v1");
  assert.equal(plan.changed, true);
  assert.deepEqual(plan.requestedKeepIds, ["missing-object", "moving-probe"]);
  assert.equal(plan.keptObjectCount, 1);
  assert.deepEqual(plan.keptObjectIds, ["moving-probe"]);
  assert.equal(plan.removedObjectCount, 2);
  assert.deepEqual(plan.removedObjectIds, ["axes", "function-curve"]);
  assert.equal(plan.objectCatalogCount, 4);
  assert.deepEqual(plan.beforeSceneIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterSceneIds, ["moving-probe", "probe-trace"]);
  assert.deepEqual(plan.beforeRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterRenderGroupIds, ["moving-probe", "probe-trace"]);
  assert.deepEqual(plan.beforeForegroundIds, []);
  assert.deepEqual(plan.afterForegroundIds, []);
  assert.deepEqual(plan.beforeFixedInFrameIds, []);
  assert.deepEqual(plan.afterFixedInFrameIds, []);
  assert.equal(
    plan.summary,
    "scene-remove-all-except:keep=moving-probe:changed=true:removed=axes,function-curve:render=moving-probe,probe-trace:catalog=4"
  );
  assert.deepEqual(sceneRemoveAllExceptMobjectBridgeDataAttributes(plan), {
    "data-viz-scene-remove-all-except-mobject-after-fixed-in-frame-ids": "none",
    "data-viz-scene-remove-all-except-mobject-after-foreground-ids": "none",
    "data-viz-scene-remove-all-except-mobject-after-render-group-ids": "moving-probe,probe-trace",
    "data-viz-scene-remove-all-except-mobject-after-scene-ids": "moving-probe,probe-trace",
    "data-viz-scene-remove-all-except-mobject-before-fixed-in-frame-ids": "none",
    "data-viz-scene-remove-all-except-mobject-before-foreground-ids": "none",
    "data-viz-scene-remove-all-except-mobject-before-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-remove-all-except-mobject-before-scene-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-remove-all-except-mobject-changed": "true",
    "data-viz-scene-remove-all-except-mobject-kept-count": "1",
    "data-viz-scene-remove-all-except-mobject-kept-ids": "moving-probe",
    "data-viz-scene-remove-all-except-mobject-object-catalog-count": "4",
    "data-viz-scene-remove-all-except-mobject-removed-count": "2",
    "data-viz-scene-remove-all-except-mobject-removed-ids": "axes,function-curve",
    "data-viz-scene-remove-all-except-mobject-requested-keep-ids": "missing-object,moving-probe",
    "data-viz-scene-remove-all-except-mobject-source-contract": SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    "data-viz-scene-remove-all-except-mobject-summary": plan.summary
  });

  const serialized = serializeSceneRemoveAllExceptMobjectBridgePlan(plan);
  assert.doesNotMatch(serialized, /</);
  assert.deepEqual(JSON.parse(serialized), plan);
});
test("buildSceneRemoveAllExceptMobjectBridgePlan supports disabled evidence mode for default runtime diagnostics", async () => {
  const { buildSceneRemoveAllExceptMobjectBridgePlan, sceneRemoveAllExceptMobjectBridgeDataAttributes } =
    await importRemoveAllExceptBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const plan = buildSceneRemoveAllExceptMobjectBridgePlan({
    enabled: false,
    familyIndex,
    objectIdsToKeep: ["moving-probe"],
    store
  });
  const attributes = sceneRemoveAllExceptMobjectBridgeDataAttributes(plan);

  assert.equal(plan.changed, false);
  assert.deepEqual(plan.requestedKeepIds, ["moving-probe"]);
  assert.deepEqual(plan.keptObjectIds, []);
  assert.deepEqual(plan.removedObjectIds, []);
  assert.deepEqual(plan.beforeRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.equal(
    plan.summary,
    "scene-remove-all-except:keep=none:changed=false:removed=none:render=axes,function-curve,moving-probe,probe-trace:catalog=4"
  );
  assert.equal(attributes["data-viz-scene-remove-all-except-mobject-changed"], "false");
  assert.equal(attributes["data-viz-scene-remove-all-except-mobject-kept-ids"], "none");
  assert.equal(attributes["data-viz-scene-remove-all-except-mobject-removed-ids"], "none");
});
