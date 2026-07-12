import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const expectedSourceContract =
  "Scene.send_to_back: reorder a mobject within its render group so it draws before sibling mobjects while preserving family expansion" as const;
const modulePath = "components/visualizations/three/manim/mathSceneSendToBackMobjectBridge.ts";

type SendToBackBridgePlan = {
  afterFixedInFrameIds: string[];
  afterForegroundIds: string[];
  afterRenderGroupIds: string[];
  afterSceneIds: string[];
  beforeFixedInFrameIds: string[];
  beforeForegroundIds: string[];
  beforeRenderGroupIds: string[];
  beforeSceneIds: string[];
  group: "scene" | "foreground" | "fixedInFrame";
  moved: boolean;
  nextIndex: number;
  objectId: string;
  previousIndex: number;
  sourceContract: typeof expectedSourceContract;
  summary: string;
  version: "mais-manim-scene-send-to-back-mobject-bridge/v1";
};

type SendToBackBridgeModule = {
  SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT: typeof expectedSourceContract;
  buildSceneSendToBackMobjectBridgePlan: (input: {
    enabled?: boolean;
    familyIndex: ReturnType<typeof buildMobjectFamilyIndex>;
    group?: "scene" | "foreground" | "fixedInFrame";
    objectId: string;
    store: ReturnType<typeof buildMathSceneRuntimeState>["sceneGraph"];
  }) => SendToBackBridgePlan;
  sceneSendToBackMobjectBridgeDataAttributes: (plan: SendToBackBridgePlan) => Record<string, string>;
  serializeSceneSendToBackMobjectBridgePlan: (plan: SendToBackBridgePlan) => string;
};

function buildFunctionGraphRuntimeState() {
  const spec = buildMathSceneSpecForThreeDFamily({
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

  assert.ok(spec, "expected function graph MAIS Manim spec");
  return buildMathSceneRuntimeState(spec, 0);
}

async function importBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.send_to_back bridge module");
  return await import("./mathSceneSendToBackMobjectBridge") as SendToBackBridgeModule;
}

test("buildSceneSendToBackMobjectBridgePlan reorders a visible mobject to the back of its render group", async () => {
  const {
    SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    buildSceneSendToBackMobjectBridgePlan,
    sceneSendToBackMobjectBridgeDataAttributes,
    serializeSceneSendToBackMobjectBridgePlan
  } = await importBridgeModule();
  const runtimeState = buildFunctionGraphRuntimeState();
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const plan = buildSceneSendToBackMobjectBridgePlan({
    familyIndex,
    objectId: "function-curve",
    store: runtimeState.sceneGraph
  });

  assert.equal(SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.version, "mais-manim-scene-send-to-back-mobject-bridge/v1");
  assert.equal(plan.objectId, "function-curve");
  assert.equal(plan.group, "scene");
  assert.equal(plan.moved, true);
  assert.equal(plan.previousIndex, 1);
  assert.equal(plan.nextIndex, 0);
  assert.deepEqual(plan.beforeSceneIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterSceneIds, ["function-curve", "moving-probe", "probe-trace", "axes"]);
  assert.deepEqual(plan.beforeRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterRenderGroupIds, ["function-curve", "moving-probe", "probe-trace", "axes"]);
  assert.equal(
    plan.summary,
    "scene-send-to-back:function-curve:group=scene:moved=true:index=1->0:render=function-curve,moving-probe,probe-trace,axes"
  );
  assert.deepEqual(sceneSendToBackMobjectBridgeDataAttributes(plan), {
    "data-viz-scene-send-to-back-mobject-after-fixed-in-frame-ids": "none",
    "data-viz-scene-send-to-back-mobject-after-foreground-ids": "none",
    "data-viz-scene-send-to-back-mobject-after-render-group-ids": "function-curve,moving-probe,probe-trace,axes",
    "data-viz-scene-send-to-back-mobject-after-scene-ids": "function-curve,moving-probe,probe-trace,axes",
    "data-viz-scene-send-to-back-mobject-before-fixed-in-frame-ids": "none",
    "data-viz-scene-send-to-back-mobject-before-foreground-ids": "none",
    "data-viz-scene-send-to-back-mobject-before-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-send-to-back-mobject-before-scene-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-send-to-back-mobject-group": "scene",
    "data-viz-scene-send-to-back-mobject-moved": "true",
    "data-viz-scene-send-to-back-mobject-next-index": "0",
    "data-viz-scene-send-to-back-mobject-object-id": "function-curve",
    "data-viz-scene-send-to-back-mobject-previous-index": "1",
    "data-viz-scene-send-to-back-mobject-source-contract": SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    "data-viz-scene-send-to-back-mobject-summary": plan.summary
  });

  const serialized = serializeSceneSendToBackMobjectBridgePlan(plan);
  assert.equal(
    serializeSceneSendToBackMobjectBridgePlan(JSON.parse(JSON.stringify(plan)) as SendToBackBridgePlan),
    serialized
  );
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("buildSceneSendToBackMobjectBridgePlan supports disabled evidence mode for default runtime diagnostics", async () => {
  const { buildSceneSendToBackMobjectBridgePlan, sceneSendToBackMobjectBridgeDataAttributes } =
    await importBridgeModule();
  const runtimeState = buildFunctionGraphRuntimeState();
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const plan = buildSceneSendToBackMobjectBridgePlan({
    enabled: false,
    familyIndex,
    objectId: "function-curve",
    store: runtimeState.sceneGraph
  });
  const attributes = sceneSendToBackMobjectBridgeDataAttributes(plan);

  assert.equal(plan.moved, false);
  assert.equal(plan.previousIndex, 1);
  assert.equal(plan.nextIndex, 1);
  assert.deepEqual(plan.afterRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.equal(
    plan.summary,
    "scene-send-to-back:function-curve:group=scene:moved=false:index=1->1:render=axes,function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-scene-send-to-back-mobject-moved"], "false");
});
