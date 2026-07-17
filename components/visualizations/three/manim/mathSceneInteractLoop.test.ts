import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  SCENE_INTERACT_LOOP_SOURCE_CONTRACT,
  SCENE_INTERACT_LOOP_STATE_POLICY
} from "./mathSceneInteractLoop";
import type { MathSceneUpdateFramePlan } from "./mathSceneUpdateFrame";

type MathSceneInteractLoopTermination = "max-frames" | "no-window" | "quit-interaction" | "window-closing";

type MathSceneInteractLoopFrame = {
  dtSeconds: number;
  frameIndex: number;
  sceneTimeAfter: number;
  sceneTimeBefore: number;
  updateFrame: MathSceneUpdateFramePlan;
};

type MathSceneInteractLoopPlan = {
  dtSeconds: number;
  finalSceneTimeSeconds: number;
  finalSkipAnimations: boolean;
  frameCount: number;
  frames: MathSceneInteractLoopFrame[];
  hasWindow: boolean;
  initialSkipAnimations: boolean;
  interactVersion: "mais-manim-interact-loop/v1";
  logsInteractionTips: boolean;
  maxFrames: number;
  setsSkipAnimationsFalse: boolean;
  sourceContract: typeof SCENE_INTERACT_LOOP_SOURCE_CONTRACT;
  statePolicy: typeof SCENE_INTERACT_LOOP_STATE_POLICY;
  summary: string;
  termination: MathSceneInteractLoopTermination;
  updateFrameCallCount: number;
};

type MathSceneInteractLoopModule = {
  buildSceneInteractLoopPlan: (input: {
    fps?: number;
    hasWindow?: boolean;
    initialSceneTimeSeconds?: number;
    initialSkipAnimations?: boolean;
    maxFrames?: number;
    quitInteractionAtFrame?: number;
    renderGroupIds?: string[];
    windowClosesAtFrame?: number;
  }) => MathSceneInteractLoopPlan;
  sceneInteractLoopDataAttributes: (plan: MathSceneInteractLoopPlan) => Record<string, string>;
  serializeSceneInteractLoopPlan: (plan: MathSceneInteractLoopPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneInteractLoop.ts";

async function importInteractLoopModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.interact loop module");
  return await import("./mathSceneInteractLoop") as MathSceneInteractLoopModule;
}

test("buildSceneInteractLoopPlan returns immediately when Scene has no window", async () => {
  const { buildSceneInteractLoopPlan } = await importInteractLoopModule();
  const plan = buildSceneInteractLoopPlan({
    hasWindow: false,
    initialSceneTimeSeconds: 2,
    initialSkipAnimations: true,
    maxFrames: 5
  });

  assert.equal(plan.interactVersion, "mais-manim-interact-loop/v1");
  assert.equal(plan.hasWindow, false);
  assert.equal(plan.logsInteractionTips, false);
  assert.equal(plan.setsSkipAnimationsFalse, false);
  assert.equal(plan.initialSkipAnimations, true);
  assert.equal(plan.finalSkipAnimations, true);
  assert.equal(plan.frameCount, 0);
  assert.equal(plan.updateFrameCallCount, 0);
  assert.equal(plan.sourceContract, SCENE_INTERACT_LOOP_SOURCE_CONTRACT);
  assert.equal(plan.statePolicy, SCENE_INTERACT_LOOP_STATE_POLICY);
  assert.equal(plan.finalSceneTimeSeconds, 2);
  assert.equal(plan.termination, "no-window");
  assert.deepEqual(plan.frames, []);
  assert.equal(plan.summary, "interactLoop:termination=no-window:frames=0:dt=0.250:skip=true");
});

test("buildSceneInteractLoopPlan clears skip mode and calls update_frame at 1/fps until the window closes", async () => {
  const { buildSceneInteractLoopPlan } = await importInteractLoopModule();
  const plan = buildSceneInteractLoopPlan({
    fps: 4,
    hasWindow: true,
    initialSceneTimeSeconds: 1,
    initialSkipAnimations: true,
    maxFrames: 8,
    renderGroupIds: ["axes", "curve"],
    windowClosesAtFrame: 3
  });

  assert.equal(plan.hasWindow, true);
  assert.equal(plan.logsInteractionTips, true);
  assert.equal(plan.setsSkipAnimationsFalse, true);
  assert.equal(plan.finalSkipAnimations, false);
  assert.equal(plan.dtSeconds, 0.25);
  assert.equal(plan.termination, "window-closing");
  assert.equal(plan.frameCount, 3);
  assert.equal(plan.updateFrameCallCount, 3);
  assert.deepEqual(plan.frames.map((frame) => frame.sceneTimeBefore), [1, 1.25, 1.5]);
  assert.deepEqual(plan.frames.map((frame) => frame.sceneTimeAfter), [1.25, 1.5, 1.75]);
  assert.ok(plan.frames.every((frame) => frame.updateFrame.action === "capture"));
  assert.ok(plan.frames.every((frame) => frame.updateFrame.skipAnimations === false));
  assert.deepEqual(plan.frames[0].updateFrame.capturedRenderGroupIds, ["axes", "curve"]);
  assert.equal(
    plan.summary,
    "interactLoop:termination=window-closing:frames=3:dt=0.250:skip=false"
  );
});

test("buildSceneInteractLoopPlan treats quit_interaction as the same pre-frame loop guard as window closing", async () => {
  const { buildSceneInteractLoopPlan } = await importInteractLoopModule();
  const plan = buildSceneInteractLoopPlan({
    fps: 2,
    hasWindow: true,
    maxFrames: 6,
    quitInteractionAtFrame: 1
  });

  assert.equal(plan.termination, "quit-interaction");
  assert.equal(plan.frameCount, 1);
  assert.equal(plan.frames[0].dtSeconds, 0.5);
  assert.equal(plan.finalSceneTimeSeconds, 0.5);
});

test("buildSceneInteractLoopPlan caps an open-ended interactive session with deterministic max frames", async () => {
  const { buildSceneInteractLoopPlan } = await importInteractLoopModule();
  const plan = buildSceneInteractLoopPlan({
    fps: 10,
    hasWindow: true,
    maxFrames: 4
  });

  assert.equal(plan.termination, "max-frames");
  assert.equal(plan.frameCount, 4);
  assert.deepEqual(plan.frames.map((frame) => frame.sceneTimeAfter), [0.1, 0.2, 0.3, 0.4]);
});

test("sceneInteractLoopDataAttributes exposes stable browser QA evidence", async () => {
  const { buildSceneInteractLoopPlan, sceneInteractLoopDataAttributes } = await importInteractLoopModule();
  const plan = buildSceneInteractLoopPlan({
    fps: 5,
    hasWindow: true,
    maxFrames: 2
  });

  assert.deepEqual(sceneInteractLoopDataAttributes(plan), {
    "data-viz-manim-interact-dt": "0.200",
    "data-viz-manim-interact-final-scene-time": "0.400",
    "data-viz-manim-interact-frame-count": "2",
    "data-viz-manim-interact-has-window": "true",
    "data-viz-manim-interact-logs-tips": "true",
    "data-viz-manim-interact-sets-skip-false": "true",
    "data-viz-manim-interact-source-contract": SCENE_INTERACT_LOOP_SOURCE_CONTRACT,
    "data-viz-manim-interact-state-policy": SCENE_INTERACT_LOOP_STATE_POLICY,
    "data-viz-manim-interact-summary": plan.summary,
    "data-viz-manim-interact-termination": "max-frames",
    "data-viz-manim-interact-update-frame-actions": "capture,capture",
    "data-viz-manim-interact-update-frame-count": "2"
  });
});

test("serializeSceneInteractLoopPlan emits deterministic safe JSON for browser QA", async () => {
  const { buildSceneInteractLoopPlan, serializeSceneInteractLoopPlan } = await importInteractLoopModule();
  const plan = buildSceneInteractLoopPlan({
    fps: 4,
    hasWindow: true,
    initialSceneTimeSeconds: 1,
    initialSkipAnimations: true,
    maxFrames: 2,
    renderGroupIds: ["axes", "curve"]
  });

  const serialized = serializeSceneInteractLoopPlan(plan);
  const reparsed = JSON.parse(serialized) as MathSceneInteractLoopPlan;

  assert.equal(
    serializeSceneInteractLoopPlan(JSON.parse(JSON.stringify(plan)) as MathSceneInteractLoopPlan),
    serialized
  );
  assert.equal(reparsed.summary, plan.summary);
  assert.equal(reparsed.frames[0]?.updateFrame.action, "capture");
  assert.deepEqual(reparsed.frames[0]?.updateFrame.capturedRenderGroupIds, ["axes", "curve"]);
  assert.equal(reparsed.updateFrameCallCount, 2);
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("Scene interact-loop stays pure and documents the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneInteractLoop.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /interact/);
  assert.match(source, /is_window_closing/);
  assert.match(source, /skip_animations = False/);
  assert.match(source, /update_frame\(1 \/ self\.camera\.fps\)/);
  assert.match(source, /quit_interaction/);
  assert.match(source, /SCENE_INTERACT_LOOP_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_INTERACT_LOOP_STATE_POLICY/);
  assert.match(source, /buildSceneUpdateFramePlan/);
  assert.match(source, /serializeSceneInteractLoopPlan/);
  assert.match(source, /stableSerialize/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
