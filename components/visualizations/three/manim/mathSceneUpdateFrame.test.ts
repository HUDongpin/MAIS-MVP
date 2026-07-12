import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  SCENE_UPDATE_FRAME_FRAME_POLICY,
  SCENE_UPDATE_FRAME_SOURCE_CONTRACT
} from "./mathSceneUpdateFrame";

type MathSceneUpdateFrameAction = "capture" | "dispatch-events" | "end-scene" | "skip-return";

type MathSceneUpdateFramePlan = {
  action: MathSceneUpdateFrameAction;
  callsCameraCapture: boolean;
  callsEndScene: boolean;
  callsIncrementTime: boolean;
  callsUpdateMobjects: boolean;
  callsWindowDispatchEvents: boolean;
  capturedRenderGroupIds: string[];
  dtSeconds: number;
  forceDraw: boolean;
  hasUndrawnWindowEvent: boolean;
  hasWindow: boolean;
  nextSceneTimeSeconds: number;
  previousSceneTimeSeconds: number;
  renderGroupCount: number;
  skipAnimations: boolean;
  framePolicy: typeof SCENE_UPDATE_FRAME_FRAME_POLICY;
  sourceContract: typeof SCENE_UPDATE_FRAME_SOURCE_CONTRACT;
  summary: string;
  updateFrameVersion: "mais-manim-update-frame/v1";
  updateMobjectsDtSeconds: number;
  windowClosing: boolean;
  windowSleepSeconds: number;
};

type MathSceneUpdateFrameModule = {
  buildSceneUpdateFramePlan: (input: {
    dtSeconds?: number;
    forceDraw?: boolean;
    hasUndrawnWindowEvent?: boolean;
    hasWindow?: boolean;
    realAnimationElapsedSeconds?: number;
    renderGroupIds?: string[];
    sceneTimeSeconds?: number;
    skipAnimations?: boolean;
    virtualAnimationStartSeconds?: number;
    windowClosing?: boolean;
  }) => MathSceneUpdateFramePlan;
  sceneUpdateFrameDataAttributes: (plan: MathSceneUpdateFramePlan) => Record<string, string>;
  serializeSceneUpdateFramePlan: (plan: MathSceneUpdateFramePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneUpdateFrame.ts";

async function importUpdateFrameModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.update_frame module");
  return (await import("./mathSceneUpdateFrame")) as MathSceneUpdateFrameModule;
}

test("buildSceneUpdateFramePlan increments time and updates mobjects before skip return", async () => {
  const { buildSceneUpdateFramePlan } = await importUpdateFrameModule();
  const plan = buildSceneUpdateFramePlan({
    dtSeconds: 0.25,
    renderGroupIds: ["curve"],
    sceneTimeSeconds: 1,
    skipAnimations: true
  });

  assert.equal(plan.updateFrameVersion, "mais-manim-update-frame/v1");
  assert.equal(plan.previousSceneTimeSeconds, 1);
  assert.equal(plan.nextSceneTimeSeconds, 1.25);
  assert.equal(plan.callsIncrementTime, true);
  assert.equal(plan.callsUpdateMobjects, true);
  assert.equal(plan.updateMobjectsDtSeconds, 0.25);
  assert.equal(plan.sourceContract, SCENE_UPDATE_FRAME_SOURCE_CONTRACT);
  assert.equal(plan.framePolicy, SCENE_UPDATE_FRAME_FRAME_POLICY);
  assert.equal(plan.action, "skip-return");
  assert.equal(plan.callsCameraCapture, false);
  assert.equal(plan.callsWindowDispatchEvents, false);
  assert.equal(
    plan.summary,
    "updateFrame:action=skip-return:dt=0.250:time=1.250:capture=false:dispatch=false:sleep=0.000"
  );
});

test("buildSceneUpdateFramePlan dispatches window events without capture for idle zero-dt frames", async () => {
  const { buildSceneUpdateFramePlan } = await importUpdateFrameModule();
  const plan = buildSceneUpdateFramePlan({
    dtSeconds: 0,
    hasUndrawnWindowEvent: false,
    hasWindow: true,
    renderGroupIds: ["axes", "curve"],
    sceneTimeSeconds: 2,
    skipAnimations: false
  });

  assert.equal(plan.action, "dispatch-events");
  assert.equal(plan.callsWindowDispatchEvents, true);
  assert.equal(plan.callsCameraCapture, false);
  assert.equal(plan.windowSleepSeconds, 0);
});

test("buildSceneUpdateFramePlan captures render groups and syncs preview timing", async () => {
  const { buildSceneUpdateFramePlan } = await importUpdateFrameModule();
  const plan = buildSceneUpdateFramePlan({
    dtSeconds: 0.25,
    hasUndrawnWindowEvent: true,
    hasWindow: true,
    realAnimationElapsedSeconds: 0.6,
    renderGroupIds: ["axes", "curve", "dot"],
    sceneTimeSeconds: 1,
    skipAnimations: false,
    virtualAnimationStartSeconds: 0.5
  });

  assert.equal(plan.action, "capture");
  assert.equal(plan.callsCameraCapture, true);
  assert.deepEqual(plan.capturedRenderGroupIds, ["axes", "curve", "dot"]);
  assert.equal(plan.renderGroupCount, 3);
  assert.equal(plan.callsWindowDispatchEvents, false);
  assert.equal(plan.windowSleepSeconds, 0.15);
  assert.equal(
    plan.summary,
    "updateFrame:action=capture:dt=0.250:time=1.250:capture=true:dispatch=false:sleep=0.150"
  );
});

test("buildSceneUpdateFramePlan force-draws skipped frames without preview sleep", async () => {
  const { buildSceneUpdateFramePlan } = await importUpdateFrameModule();
  const plan = buildSceneUpdateFramePlan({
    dtSeconds: 0,
    forceDraw: true,
    hasWindow: true,
    renderGroupIds: ["curve"],
    sceneTimeSeconds: 3,
    skipAnimations: true
  });

  assert.equal(plan.action, "capture");
  assert.equal(plan.callsCameraCapture, true);
  assert.equal(plan.skipAnimations, true);
  assert.equal(plan.forceDraw, true);
  assert.equal(plan.windowSleepSeconds, 0);
});

test("buildSceneUpdateFramePlan reports EndScene after updater work when the window closes", async () => {
  const { buildSceneUpdateFramePlan } = await importUpdateFrameModule();
  const plan = buildSceneUpdateFramePlan({
    dtSeconds: 0.125,
    hasWindow: true,
    sceneTimeSeconds: 4,
    skipAnimations: false,
    windowClosing: true
  });

  assert.equal(plan.action, "end-scene");
  assert.equal(plan.callsEndScene, true);
  assert.equal(plan.callsIncrementTime, true);
  assert.equal(plan.callsUpdateMobjects, true);
  assert.equal(plan.callsCameraCapture, false);
  assert.equal(plan.nextSceneTimeSeconds, 4.125);
});

test("sceneUpdateFrameDataAttributes exposes stable browser QA evidence", async () => {
  const {
    buildSceneUpdateFramePlan,
    sceneUpdateFrameDataAttributes
  } = await importUpdateFrameModule();
  const plan = buildSceneUpdateFramePlan({
    dtSeconds: 0.25,
    renderGroupIds: ["axes", "curve"],
    sceneTimeSeconds: 1
  });

  assert.deepEqual(sceneUpdateFrameDataAttributes(plan), {
    "data-viz-manim-update-frame-action": "capture",
    "data-viz-manim-update-frame-capture": "true",
    "data-viz-manim-update-frame-dispatch-events": "false",
    "data-viz-manim-update-frame-dt": "0.250",
    "data-viz-manim-update-frame-force-draw": "false",
    "data-viz-manim-update-frame-frame-policy": SCENE_UPDATE_FRAME_FRAME_POLICY,
    "data-viz-manim-update-frame-increment-time": "true",
    "data-viz-manim-update-frame-render-group-count": "2",
    "data-viz-manim-update-frame-render-group-ids": "axes,curve",
    "data-viz-manim-update-frame-scene-time": "1.250",
    "data-viz-manim-update-frame-skip": "false",
    "data-viz-manim-update-frame-sleep": "0.000",
    "data-viz-manim-update-frame-source-contract": SCENE_UPDATE_FRAME_SOURCE_CONTRACT,
    "data-viz-manim-update-frame-summary": plan.summary,
    "data-viz-manim-update-frame-update-mobjects": "true",
    "data-viz-manim-update-frame-update-mobjects-dt": "0.250"
  });
});

test("serializeSceneUpdateFramePlan emits escaped deterministic browser JSON", async () => {
  const {
    buildSceneUpdateFramePlan,
    serializeSceneUpdateFramePlan
  } = await importUpdateFrameModule();
  const plan = buildSceneUpdateFramePlan({
    dtSeconds: 0.25,
    renderGroupIds: ["<update-frame>", "group-</script>"],
    sceneTimeSeconds: 1
  });
  const serialized = serializeSceneUpdateFramePlan(plan);

  assert.equal(
    serializeSceneUpdateFramePlan(JSON.parse(JSON.stringify(plan)) as MathSceneUpdateFramePlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<update-frame>/);
  assert.doesNotMatch(serialized, /<\/script/i);
  assert.match(serialized, /\\u003cupdate-frame>/);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("Scene update-frame stays pure and documents the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneUpdateFrame.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /update_frame/);
  assert.match(source, /increment_time/);
  assert.match(source, /update_mobjects/);
  assert.match(source, /skip_animations/);
  assert.match(source, /force_draw/);
  assert.match(source, /dispatch_events/);
  assert.match(source, /camera\.capture/);
  assert.match(source, /SCENE_UPDATE_FRAME_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_UPDATE_FRAME_FRAME_POLICY/);
  assert.match(source, /virtual_animation_start_time/);
  assert.match(source, /real_animation_start_time/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|\bdocument\b|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /\bwindow(?:\.|\[)/);
});
