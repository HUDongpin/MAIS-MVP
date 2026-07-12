import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const expectedSourceContract =
  "Scene.bring_to_front: reorder a mobject within its render group so it draws after sibling mobjects while preserving family expansion" as const;
const modulePath = "components/visualizations/three/manim/mathSceneBringToFrontMobjectBridge.ts";

type BringToFrontBridgePlan = {
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
  version: "mais-manim-scene-bring-to-front-mobject-bridge/v1";
};

type BringToFrontBridgeModule = {
  SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT: typeof expectedSourceContract;
  buildSceneBringToFrontMobjectBridgePlan: (input: {
    enabled?: boolean;
    familyIndex: ReturnType<typeof buildMobjectFamilyIndex>;
    group?: "scene" | "foreground" | "fixedInFrame";
    objectId: string;
    store: ReturnType<typeof buildMathSceneRuntimeState>["sceneGraph"];
  }) => BringToFrontBridgePlan;
  sceneBringToFrontMobjectBridgeDataAttributes: (plan: BringToFrontBridgePlan) => Record<string, string>;
  serializeSceneBringToFrontMobjectBridgePlan: (plan: BringToFrontBridgePlan) => string;
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
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.bring_to_front bridge module");
  return await import("./mathSceneBringToFrontMobjectBridge") as BringToFrontBridgeModule;
}

test("buildSceneBringToFrontMobjectBridgePlan reorders a visible mobject to the front of its render group", async () => {
  const {
    SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    buildSceneBringToFrontMobjectBridgePlan,
    sceneBringToFrontMobjectBridgeDataAttributes,
    serializeSceneBringToFrontMobjectBridgePlan
  } = await importBridgeModule();
  const runtimeState = buildFunctionGraphRuntimeState();
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const plan = buildSceneBringToFrontMobjectBridgePlan({
    familyIndex,
    objectId: "axes",
    store: runtimeState.sceneGraph
  });

  assert.equal(SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.version, "mais-manim-scene-bring-to-front-mobject-bridge/v1");
  assert.equal(plan.objectId, "axes");
  assert.equal(plan.group, "scene");
  assert.equal(plan.moved, true);
  assert.equal(plan.previousIndex, 0);
  assert.equal(plan.nextIndex, 1);
  assert.deepEqual(plan.beforeSceneIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterSceneIds, ["function-curve", "moving-probe", "probe-trace", "axes"]);
  assert.deepEqual(plan.beforeRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.afterRenderGroupIds, ["function-curve", "moving-probe", "probe-trace", "axes"]);
  assert.equal(
    plan.summary,
    "scene-bring-to-front:axes:group=scene:moved=true:index=0->1:render=function-curve,moving-probe,probe-trace,axes"
  );
  assert.deepEqual(sceneBringToFrontMobjectBridgeDataAttributes(plan), {
    "data-viz-scene-bring-to-front-mobject-after-fixed-in-frame-ids": "none",
    "data-viz-scene-bring-to-front-mobject-after-foreground-ids": "none",
    "data-viz-scene-bring-to-front-mobject-after-render-group-ids": "function-curve,moving-probe,probe-trace,axes",
    "data-viz-scene-bring-to-front-mobject-after-scene-ids": "function-curve,moving-probe,probe-trace,axes",
    "data-viz-scene-bring-to-front-mobject-before-fixed-in-frame-ids": "none",
    "data-viz-scene-bring-to-front-mobject-before-foreground-ids": "none",
    "data-viz-scene-bring-to-front-mobject-before-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-bring-to-front-mobject-before-scene-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-scene-bring-to-front-mobject-group": "scene",
    "data-viz-scene-bring-to-front-mobject-moved": "true",
    "data-viz-scene-bring-to-front-mobject-next-index": "1",
    "data-viz-scene-bring-to-front-mobject-object-id": "axes",
    "data-viz-scene-bring-to-front-mobject-previous-index": "0",
    "data-viz-scene-bring-to-front-mobject-source-contract": SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT,
    "data-viz-scene-bring-to-front-mobject-summary": plan.summary
  });

  const serialized = serializeSceneBringToFrontMobjectBridgePlan(plan);
  assert.equal(
    serializeSceneBringToFrontMobjectBridgePlan(JSON.parse(JSON.stringify(plan)) as BringToFrontBridgePlan),
    serialized
  );
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("buildSceneBringToFrontMobjectBridgePlan supports disabled evidence mode for default runtime diagnostics", async () => {
  const { buildSceneBringToFrontMobjectBridgePlan, sceneBringToFrontMobjectBridgeDataAttributes } =
    await importBridgeModule();
  const runtimeState = buildFunctionGraphRuntimeState();
  const familyIndex = buildMobjectFamilyIndex(runtimeState.objectGraph);
  const plan = buildSceneBringToFrontMobjectBridgePlan({
    enabled: false,
    familyIndex,
    objectId: "axes",
    store: runtimeState.sceneGraph
  });
  const attributes = sceneBringToFrontMobjectBridgeDataAttributes(plan);

  assert.equal(plan.moved, false);
  assert.equal(plan.previousIndex, 0);
  assert.equal(plan.nextIndex, 0);
  assert.deepEqual(plan.afterRenderGroupIds, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.equal(
    plan.summary,
    "scene-bring-to-front:axes:group=scene:moved=false:index=0->0:render=axes,function-curve,moving-probe,probe-trace"
  );
  assert.equal(attributes["data-viz-scene-bring-to-front-mobject-moved"], "false");
});
