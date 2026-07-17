import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildSceneWaitControl } from "./mathSceneWaitControl";
import type { MathSceneSpec } from "./mathSceneTypes";

type MathSceneWaitFrameStepperBridgeRow = {
  activeStep: string;
  cameraShot: string;
  deltaMatchesWait: boolean;
  frameStepUpdateFrameAction: string;
  frameIndex: number;
  frameStepDeltaSeconds: number;
  frameStepElapsedSeconds: number;
  frameStepWritesFrame: boolean;
  sceneId: string;
  timeMatchesWait: boolean;
  updaterActiveCount: number;
  updaterSuspendedCount: number;
  waitDtSeconds: number;
  waitUpdaterValueAfterFrame: number;
  waitUpdatesMobjects: boolean;
  waitTSeconds: number;
};

type MathSceneWaitFrameStepperBridgePlan = {
  frameStepCount: number;
  mismatchCount: number;
  rows: MathSceneWaitFrameStepperBridgeRow[];
  sourceContract: string;
  summary: string;
  waitFrameCount: number;
};

type MathSceneWaitFrameStepperBridgeModule = {
  SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT: string;
  buildSceneWaitFrameStepperBridge: (input: {
    fps?: number;
    scene: MathSceneSpec;
    waitControl: ReturnType<typeof buildSceneWaitControl>;
  }) => MathSceneWaitFrameStepperBridgePlan;
  sceneWaitFrameStepperBridgeDataAttributes: (plan: MathSceneWaitFrameStepperBridgePlan) => Record<string, string>;
  serializeSceneWaitFrameStepperBridge: (plan: MathSceneWaitFrameStepperBridgePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneWaitFrameStepperBridge.ts";

function buildFunctionGraphSpec() {
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

  if (!spec) throw new Error("expected function graph MAIS Manim spec");
  return spec;
}

async function importWaitFrameStepperBridgeModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should bridge Scene.wait sampled frames into update_frame captures");
  return await import("./mathSceneWaitFrameStepperBridge") as MathSceneWaitFrameStepperBridgeModule;
}

test("buildSceneWaitFrameStepperBridge maps Scene.wait sampled times to actual frame-step captures", async () => {
  const {
    SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT,
    buildSceneWaitFrameStepperBridge
  } = await importWaitFrameStepperBridgeModule();
  const waitControl = buildSceneWaitControl({ defaultWaitTime: 1, fps: 4, playIndex: 2 });
  const plan = buildSceneWaitFrameStepperBridge({
    fps: 4,
    scene: buildFunctionGraphSpec(),
    waitControl
  });

  assert.equal(plan.sourceContract, SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.waitFrameCount, 4);
  assert.equal(plan.frameStepCount, 4);
  assert.equal(plan.mismatchCount, 0);
  assert.deepEqual(plan.rows.map((row) => row.frameIndex), [0, 1, 2, 3]);
  assert.deepEqual(plan.rows.map((row) => row.waitTSeconds), [0.25, 0.5, 0.75, 1]);
  assert.deepEqual(plan.rows.map((row) => row.waitDtSeconds), [0.25, 0.25, 0.25, 0.25]);
  assert.deepEqual(plan.rows.map((row) => row.waitUpdaterValueAfterFrame), [0.25, 0.5, 0.75, 1]);
  assert.ok(plan.rows.every((row) => row.waitUpdatesMobjects));
  assert.ok(plan.rows.every((row) => row.frameStepUpdateFrameAction === "capture"));
  assert.ok(plan.rows.every((row) => row.frameStepWritesFrame));
  assert.deepEqual(plan.rows.map((row) => row.frameStepElapsedSeconds), [0.25, 0.5, 0.75, 1]);
  assert.ok(plan.rows.every((row) => row.sceneId === "mais-manim-function-graph"));
  assert.ok(plan.rows.every((row) => row.activeStep === "revealCurve"));
  assert.ok(plan.rows.every((row) => row.cameraShot === "overview"));
  assert.equal(
    plan.summary,
    "waitFrameStepperBridge:waitFrames=4:frameSteps=4:mismatches=0:times=0.250,0.500,0.750,1.000"
  );
});

test("sceneWaitFrameStepperBridgeDataAttributes exposes stable QA evidence", async () => {
  const { buildSceneWaitFrameStepperBridge, sceneWaitFrameStepperBridgeDataAttributes } =
    await importWaitFrameStepperBridgeModule();
  const waitControl = buildSceneWaitControl({ defaultWaitTime: 0.5, fps: 4, playIndex: 3 });
  const plan = buildSceneWaitFrameStepperBridge({
    fps: 4,
    scene: buildFunctionGraphSpec(),
    waitControl
  });

  assert.deepEqual(sceneWaitFrameStepperBridgeDataAttributes(plan), {
    "data-viz-manim-wait-frame-stepper-active-steps": "revealCurve,revealCurve",
    "data-viz-manim-wait-frame-stepper-camera-shots": "overview,overview",
    "data-viz-manim-wait-frame-stepper-frame-step-count": "2",
    "data-viz-manim-wait-frame-stepper-mismatch-count": "0",
    "data-viz-manim-wait-frame-stepper-scene-ids": "mais-manim-function-graph",
    "data-viz-manim-wait-frame-stepper-source-contract": plan.sourceContract,
    "data-viz-manim-wait-frame-stepper-summary": plan.summary,
    "data-viz-manim-wait-frame-stepper-update-frame-actions": "capture,capture",
    "data-viz-manim-wait-frame-stepper-updater-value-after-frames": "0.250,0.500",
    "data-viz-manim-wait-frame-stepper-updater-active-counts": plan.rows.map((row) => String(row.updaterActiveCount)).join(","),
    "data-viz-manim-wait-frame-stepper-updater-suspended-counts": plan.rows.map((row) => String(row.updaterSuspendedCount)).join(","),
    "data-viz-manim-wait-frame-stepper-wait-frame-count": "2",
    "data-viz-manim-wait-frame-stepper-wait-updates-mobjects": "true,true",
    "data-viz-manim-wait-frame-stepper-write-frame-flags": "true,true",
    "data-viz-manim-wait-frame-stepper-wait-times": "0.250,0.500"
  });
});

test("serializeSceneWaitFrameStepperBridge emits script-safe deterministic JSON", async () => {
  const { buildSceneWaitFrameStepperBridge, serializeSceneWaitFrameStepperBridge } =
    await importWaitFrameStepperBridgeModule();
  const waitControl = buildSceneWaitControl({ defaultWaitTime: 0.5, fps: 4, playIndex: 3 });
  const plan = buildSceneWaitFrameStepperBridge({
    fps: 4,
    scene: buildFunctionGraphSpec(),
    waitControl
  });
  const json = serializeSceneWaitFrameStepperBridge(plan);
  const parsed = JSON.parse(json) as MathSceneWaitFrameStepperBridgePlan;

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.waitFrameCount, 2);
  assert.equal(parsed.frameStepCount, 2);
  assert.equal(parsed.mismatchCount, 0);
  assert.deepEqual(parsed.rows.map((row) => row.waitTSeconds), [0.25, 0.5]);
});

test("Scene.wait frame-stepper bridge stays pure and consumes waitControl plus frameStepper contracts", () => {
  assert.ok(fs.existsSync(modulePath), "wait frame-stepper bridge should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /buildSceneWaitFrameStepperBridge/);
  assert.match(source, /stepMathSceneFrame/);
  assert.match(source, /MathSceneWaitControlPlan/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
