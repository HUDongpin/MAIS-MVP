import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import {
  buildSceneGraphStore,
  removeSceneMobject,
  type MathSceneGraphStore
} from "./mathSceneGraph";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const modulePath = "components/visualizations/three/manim/mathSceneReplaceMobjectBridge.ts";
const expectedSourceContract =
  "Scene.replace: remove old mobject family, insert replacement mobjects in the same render group/order, and restore replacement families from removed state" as const;

type ReplaceBridgePlan = {
  afterRenderGroupIds: string[];
  beforeRenderGroupIds: string[];
  group: "scene" | "foreground" | "fixedInFrame";
  objectId: string;
  removedFamilyIds: string[];
  replaced: boolean;
  replacementCount: number;
  replacementIds: string[];
  requestedReplacementIds: string[];
  restoredReplacementFamilyIds: string[];
  sourceContract: typeof expectedSourceContract;
  summary: string;
  version: "mais-manim-scene-replace-mobject-bridge/v1";
};

type ReplaceBridgeModule = {
  SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT: typeof expectedSourceContract;
  buildSceneReplaceMobjectBridgePlan: (input: {
    familyIndex: ReturnType<typeof buildMobjectFamilyIndex>;
    group?: "scene" | "foreground" | "fixedInFrame";
    objectId: string;
    replacementIds: string[];
    store: MathSceneGraphStore;
  }) => ReplaceBridgePlan;
  sceneReplaceMobjectBridgeDataAttributes: (plan: ReplaceBridgePlan) => Record<string, string>;
  serializeSceneReplaceMobjectBridgePlan: (plan: ReplaceBridgePlan) => string;
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

async function importReplaceBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.replace mobject bridge module");
  return await import("./mathSceneReplaceMobjectBridge") as ReplaceBridgeModule;
}

test("buildSceneReplaceMobjectBridgePlan preserves render group order and restores replacement families", async () => {
  const {
    SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    buildSceneReplaceMobjectBridgePlan,
    sceneReplaceMobjectBridgeDataAttributes,
    serializeSceneReplaceMobjectBridgePlan
  } = await importReplaceBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const storeWithRemovedReplacement = removeSceneMobject(store, "function-curve");
  const plan = buildSceneReplaceMobjectBridgePlan({
    familyIndex,
    objectId: "axes",
    replacementIds: ["function-curve"],
    store: storeWithRemovedReplacement
  });

  assert.equal(SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.version, "mais-manim-scene-replace-mobject-bridge/v1");
  assert.equal(plan.objectId, "axes");
  assert.deepEqual(plan.requestedReplacementIds, ["function-curve"]);
  assert.deepEqual(plan.replacementIds, ["function-curve"]);
  assert.equal(plan.replacementCount, 1);
  assert.equal(plan.group, "scene");
  assert.equal(plan.replaced, true);
  assert.deepEqual(plan.beforeRenderGroupIds, ["axes"]);
  assert.deepEqual(plan.afterRenderGroupIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.removedFamilyIds, ["axes"]);
  assert.deepEqual(plan.restoredReplacementFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.equal(
    plan.summary,
    "scene-replace:axes->function-curve:group=scene:replaced=true:removed=axes:restored=function-curve,moving-probe,probe-trace"
  );
  assert.deepEqual(sceneReplaceMobjectBridgeDataAttributes(plan), {
    "data-viz-scene-replace-mobject-after-render-group-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-scene-replace-mobject-before-render-group-ids": "axes",
    "data-viz-scene-replace-mobject-group": "scene",
    "data-viz-scene-replace-mobject-object-id": "axes",
    "data-viz-scene-replace-mobject-removed-family-ids": "axes",
    "data-viz-scene-replace-mobject-replaced": "true",
    "data-viz-scene-replace-mobject-replacement-count": "1",
    "data-viz-scene-replace-mobject-replacement-ids": "function-curve",
    "data-viz-scene-replace-mobject-requested-replacement-ids": "function-curve",
    "data-viz-scene-replace-mobject-restored-replacement-family-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-scene-replace-mobject-source-contract": SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    "data-viz-scene-replace-mobject-summary": plan.summary
  });

  const serialized = serializeSceneReplaceMobjectBridgePlan(plan);
  assert.doesNotMatch(serialized, /</);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("buildSceneReplaceMobjectBridgePlan reports no-op replacements deterministically", async () => {
  const { buildSceneReplaceMobjectBridgePlan, sceneReplaceMobjectBridgeDataAttributes } = await importReplaceBridgeModule();
  const { familyIndex, store } = buildFunctionGraphState();
  const plan = buildSceneReplaceMobjectBridgePlan({
    familyIndex,
    objectId: "missing-curve",
    replacementIds: ["axes", "missing-replacement"],
    store
  });
  const attributes = sceneReplaceMobjectBridgeDataAttributes(plan);

  assert.equal(plan.replaced, false);
  assert.deepEqual(plan.requestedReplacementIds, ["axes", "missing-replacement"]);
  assert.deepEqual(plan.replacementIds, ["axes"]);
  assert.deepEqual(plan.beforeRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterRenderGroupIds, plan.beforeRenderGroupIds);
  assert.deepEqual(plan.removedFamilyIds, []);
  assert.deepEqual(plan.restoredReplacementFamilyIds, []);
  assert.equal(plan.summary, "scene-replace:missing-curve->axes:group=scene:replaced=false:removed=none:restored=none");
  assert.equal(attributes["data-viz-scene-replace-mobject-replaced"], "false");
  assert.equal(attributes["data-viz-scene-replace-mobject-requested-replacement-ids"], "axes,missing-replacement");
  assert.equal(attributes["data-viz-scene-replace-mobject-replacement-ids"], "axes");
});
