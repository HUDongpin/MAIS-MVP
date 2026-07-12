import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathSceneEmitFramePlan } from "./mathSceneEmitFrame";
import type { MathScenePresenterHoldPlan } from "./mathScenePresenterHold";
import type { MathSceneTimeProgressionPlan } from "./mathSceneTimeProgression";
import type { MathSceneUpdateFramePlan } from "./mathSceneUpdateFrame";

type MathSceneWaitControlMode = "fixed-duration" | "presenter-hold" | "wait-until";

type MathSceneWaitControlPlan = {
  calledEmitFrameCount: number;
  calledUpdateFrameCount: number;
  description: string;
  effectiveDuration: number;
  emittedFrameCount: number;
  emittedTimes: number[];
  fps: number;
  frameOperationSummary: string;
  frameInterval: number;
  frames: Array<{
    callsEmitFrame: boolean;
    dtSeconds: number;
    emitFrame: MathSceneEmitFramePlan;
    frameIndex: number;
    incrementsSceneTime: boolean;
    stopConditionBreaks: boolean;
    tSeconds: number;
    updateFrame: MathSceneUpdateFramePlan;
    updateMobjectsDtSeconds: number;
    updaterValueAfterFrame: number;
    updatesMobjects: boolean;
    writesFrame: boolean;
  }>;
  maxTime: number;
  mode: MathSceneWaitControlMode;
  nIterations: number;
  overrideSkipAnimations: boolean;
  runTime: number;
  skipAnimations: boolean;
  sourceContract: string;
  stopConditionId: string;
  stopConditionSatisfied: boolean;
  summary: string;
  presenterHold: MathScenePresenterHoldPlan;
  timeProgression: MathSceneTimeProgressionPlan;
  updateMobjectFrameCount: number;
  updaterFinalValue: number;
  updaterValueSummary: string;
  updaterValues: number[];
  updateMobjectTotalDtSeconds: number;
  updatesMobjectsDuringPresenterHold: boolean;
  updatesMobjectsDuringWait: boolean;
  updatesMobjectsWhileSkipping: boolean;
  framePolicy: string;
  updaterPolicy: string;
};

type MathSceneWaitControlModule = {
  SCENE_WAIT_CONTROL_FRAME_POLICY: string;
  SCENE_WAIT_CONTROL_SOURCE_CONTRACT: string;
  SCENE_WAIT_CONTROL_UPDATER_POLICY: string;
  buildSceneWaitControl: (input: {
    defaultWaitTime?: number;
    duration?: number;
    fps?: number;
    holdOnWait?: boolean;
    ignorePresenterMode?: boolean;
    maxTime?: number;
    note?: string;
    playIndex?: number;
    presenterMode?: boolean;
    presenterReleaseAfterFrames?: number;
    skipAnimations?: boolean;
    stopConditionId?: string;
    stopConditionSatisfiedAt?: number;
  }) => MathSceneWaitControlPlan;
  sceneWaitControlDataAttributes: (plan: MathSceneWaitControlPlan) => Record<string, string>;
  serializeSceneWaitControlPlan: (plan: MathSceneWaitControlPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneWaitControl.ts";

async function importSceneWaitControlModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.wait / wait_until control module");
  return await import("./mathSceneWaitControl") as MathSceneWaitControlModule;
}

test("buildSceneWaitControl uses Manim default wait time for fixed waits", async () => {
  const { buildSceneWaitControl } = await importSceneWaitControlModule();
  const plan = buildSceneWaitControl({ defaultWaitTime: 1, fps: 4, playIndex: 7 });

  assert.deepEqual(plan.emittedTimes, [0.25, 0.5, 0.75, 1]);
  assert.equal(plan.frames.length, 4);
  assert.equal(plan.frames[0].dtSeconds, 0.25);
  assert.equal(plan.frames[0].incrementsSceneTime, true);
  assert.equal(plan.frames[0].updatesMobjects, true);
  assert.equal(plan.frames[0].updateMobjectsDtSeconds, 0.25);
  assert.equal(plan.frames[0].updaterValueAfterFrame, 0.25);
  assert.equal(plan.frames[0].callsEmitFrame, true);
  assert.equal(plan.frames[0].writesFrame, true);
  assert.equal(plan.frames[0].emitFrame.status, "write-frame");
  assert.equal(plan.frames[0].emitFrame.callsFileWriterWriteFrame, true);
  assert.equal(plan.frames[0].updateFrame.action, "capture");
  assert.equal(plan.calledEmitFrameCount, 4);
  assert.equal(plan.calledUpdateFrameCount, 4);
  assert.equal(plan.frameOperationSummary, "waitFrameOps:update_frame>emit_frame:frames=4:update=4:emit=4:write=4:mobjects=4");
  assert.equal(
    plan.frames[0].updateFrame.summary,
    "updateFrame:action=capture:dt=0.250:time=0.250:capture=true:dispatch=false:sleep=0.000"
  );
  assert.equal(plan.description, "7 Waiting");
  assert.equal(plan.effectiveDuration, 1);
  assert.equal(plan.emittedFrameCount, 4);
  assert.equal(plan.fps, 4);
  assert.equal(plan.frameInterval, 0.25);
  assert.equal(plan.maxTime, 1);
  assert.equal(plan.mode, "fixed-duration");
  assert.equal(plan.nIterations, 4);
  assert.equal(plan.overrideSkipAnimations, false);
  assert.equal(plan.runTime, 1);
  assert.equal(plan.stopConditionId, "none");
  assert.equal(plan.stopConditionSatisfied, false);
  assert.equal(plan.updateMobjectFrameCount, 4);
  assert.equal(plan.updaterFinalValue, 1);
  assert.deepEqual(plan.updaterValues, [0.25, 0.5, 0.75, 1]);
  assert.equal(plan.updaterValueSummary, "waitUpdater:mode=fixed-duration:frames=4:final=1.000:values=0.250,0.500,0.750,1.000");
  assert.equal(plan.updateMobjectTotalDtSeconds, 1);
  assert.equal(plan.updatesMobjectsDuringWait, true);
  assert.equal(plan.updatesMobjectsWhileSkipping, false);
  assert.equal(plan.updatesMobjectsDuringPresenterHold, false);
});

test("buildSceneWaitControl mirrors wait_until by overriding skipped animations and stopping after a satisfied frame", async () => {
  const { buildSceneWaitControl } = await importSceneWaitControlModule();
  const plan = buildSceneWaitControl({
    fps: 4,
    maxTime: 2,
    playIndex: 3,
    skipAnimations: true,
    stopConditionId: "probe-near-target",
    stopConditionSatisfiedAt: 0.7
  });

  assert.deepEqual(plan.emittedTimes, [0.25, 0.5, 0.75]);
  assert.equal(plan.frames.length, 3);
  assert.ok(plan.frames.every((frame) => frame.callsEmitFrame));
  assert.ok(plan.frames.every((frame) => !frame.writesFrame));
  assert.ok(plan.frames.every((frame) => frame.incrementsSceneTime));
  assert.ok(plan.frames.every((frame) => frame.updatesMobjects));
  assert.deepEqual(plan.frames.map((frame) => frame.updateMobjectsDtSeconds), [0.25, 0.25, 0.25]);
  assert.deepEqual(plan.frames.map((frame) => frame.updaterValueAfterFrame), [0.25, 0.5, 0.75]);
  assert.ok(plan.frames.every((frame) => frame.emitFrame.status === "skipped"));
  assert.ok(plan.frames.every((frame) => frame.updateFrame.action === "skip-return"));
  assert.equal(plan.frames[2].stopConditionBreaks, true);
  assert.equal(plan.description, "3 Waiting");
  assert.equal(plan.effectiveDuration, 0.75);
  assert.equal(plan.emittedFrameCount, 3);
  assert.equal(plan.maxTime, 2);
  assert.equal(plan.mode, "wait-until");
  assert.equal(plan.nIterations, -1);
  assert.equal(plan.overrideSkipAnimations, true);
  assert.equal(plan.runTime, 2);
  assert.equal(plan.skipAnimations, true);
  assert.equal(plan.stopConditionId, "probe-near-target");
  assert.equal(plan.stopConditionSatisfied, true);
  assert.equal(plan.updateMobjectFrameCount, 3);
  assert.equal(plan.calledEmitFrameCount, 3);
  assert.equal(plan.calledUpdateFrameCount, 3);
  assert.equal(plan.frameOperationSummary, "waitFrameOps:update_frame>emit_frame:frames=3:update=3:emit=3:write=0:mobjects=3");
  assert.equal(plan.updaterFinalValue, 0.75);
  assert.deepEqual(plan.updaterValues, [0.25, 0.5, 0.75]);
  assert.equal(plan.updaterValueSummary, "waitUpdater:mode=wait-until:frames=3:final=0.750:values=0.250,0.500,0.750");
  assert.equal(plan.updateMobjectTotalDtSeconds, 0.75);
  assert.equal(plan.updatesMobjectsDuringWait, true);
  assert.equal(plan.updatesMobjectsWhileSkipping, true);
  assert.equal(plan.updatesMobjectsDuringPresenterHold, false);
  assert.equal(
    plan.summary,
    "waitControl:wait-until:condition=probe-near-target:run=2.000:effective=0.750:frames=3:overrideSkip=true:satisfied=true"
  );
});

test("buildSceneWaitControl falls through to max_time when wait_until condition is not satisfied", async () => {
  const { buildSceneWaitControl } = await importSceneWaitControlModule();
  const plan = buildSceneWaitControl({
    fps: 2,
    maxTime: 1.25,
    stopConditionId: "never-ready"
  });

  assert.deepEqual(plan.emittedTimes, [0.5, 1, 1.5]);
  assert.equal(plan.effectiveDuration, 1.5);
  assert.equal(plan.maxTime, 1.25);
  assert.equal(plan.mode, "wait-until");
  assert.equal(plan.nIterations, -1);
  assert.equal(plan.stopConditionSatisfied, false);
  assert.match(plan.summary, /run=1\.250:effective=1\.500:frames=3/);
});

test("buildSceneWaitControl mirrors presenter_mode wait by using hold_loop instead of timeline frames", async () => {
  const { buildSceneWaitControl } = await importSceneWaitControlModule();
  const plan = buildSceneWaitControl({
    defaultWaitTime: 1,
    fps: 4,
    holdOnWait: true,
    note: "pause for teacher explanation",
    playIndex: 5,
    presenterMode: true,
    presenterReleaseAfterFrames: 2,
    skipAnimations: false
  });

  assert.equal(plan.mode, "presenter-hold");
  assert.deepEqual(plan.emittedTimes, [0.25, 0.5]);
  assert.equal(plan.frames.length, 2);
  assert.ok(plan.frames.every((frame) => !frame.callsEmitFrame));
  assert.ok(plan.frames.every((frame) => !frame.writesFrame));
  assert.ok(plan.frames.every((frame) => frame.emitFrame.status === "not-called"));
  assert.ok(plan.frames.every((frame) => frame.updateFrame.action === "capture"));
  assert.equal(plan.effectiveDuration, 0.5);
  assert.equal(plan.emittedFrameCount, 2);
  assert.equal(plan.calledEmitFrameCount, 0);
  assert.equal(plan.calledUpdateFrameCount, 2);
  assert.equal(plan.frameOperationSummary, "waitFrameOps:update_frame>hold_loop:frames=2:update=2:emit=0:write=0:mobjects=2");
  assert.equal(plan.presenterHold.mode, "presenter-hold");
  assert.equal(plan.presenterHold.noteLogged, true);
  assert.equal(plan.presenterHold.releaseEvent, "space-or-right-arrow");
  assert.equal(plan.presenterHold.shouldUseTimelineWait, false);
  assert.equal(plan.updateMobjectFrameCount, 2);
  assert.equal(plan.updaterFinalValue, 0.5);
  assert.deepEqual(plan.updaterValues, [0.25, 0.5]);
  assert.equal(plan.updaterValueSummary, "waitUpdater:mode=presenter-hold:frames=2:final=0.500:values=0.250,0.500");
  assert.equal(plan.updateMobjectTotalDtSeconds, 0.5);
  assert.equal(plan.updatesMobjectsDuringWait, true);
  assert.equal(plan.updatesMobjectsWhileSkipping, false);
  assert.equal(plan.updatesMobjectsDuringPresenterHold, true);
  assert.equal(
    plan.summary,
    "waitControl:presenter-hold:condition=none:run=1.000:effective=0.500:frames=2:overrideSkip=false:satisfied=false"
  );
});

test("sceneWaitControlDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_WAIT_CONTROL_FRAME_POLICY,
    SCENE_WAIT_CONTROL_SOURCE_CONTRACT,
    SCENE_WAIT_CONTROL_UPDATER_POLICY,
    buildSceneWaitControl,
    sceneWaitControlDataAttributes
  } = await importSceneWaitControlModule();
  const plan = buildSceneWaitControl({
    fps: 5,
    maxTime: 1,
    playIndex: 4,
    stopConditionId: "trace-finished",
    stopConditionSatisfiedAt: 0.4
  });

  assert.deepEqual(sceneWaitControlDataAttributes(plan), {
    "data-viz-manim-wait-control-description": "4 Waiting",
    "data-viz-manim-wait-control-called-emit-frame-count": "2",
    "data-viz-manim-wait-control-called-update-frame-count": "2",
    "data-viz-manim-wait-control-emit-frame-statuses": "write-frame,write-frame",
    "data-viz-manim-wait-control-effective-duration": "0.400",
    "data-viz-manim-wait-control-emitted-frame-count": "2",
    "data-viz-manim-wait-control-emitted-time-range": "0.200..0.400",
    "data-viz-manim-wait-control-emitted-times": "0.200,0.400",
    "data-viz-manim-wait-control-fps": "5",
    "data-viz-manim-wait-control-frame-interval": "0.200",
    "data-viz-manim-wait-control-frame-policy": SCENE_WAIT_CONTROL_FRAME_POLICY,
    "data-viz-manim-wait-control-frame-operation-summary": "waitFrameOps:update_frame>emit_frame:frames=2:update=2:emit=2:write=2:mobjects=2",
    "data-viz-manim-wait-control-increments-scene-time": "true,true",
    "data-viz-manim-wait-control-max-time": "1.000",
    "data-viz-manim-wait-control-mode": "wait-until",
    "data-viz-manim-wait-control-n-iterations": "-1",
    "data-viz-manim-wait-control-override-skip": "true",
    "data-viz-manim-wait-control-run-time": "1.000",
    "data-viz-manim-wait-control-skip-animations": "false",
    "data-viz-manim-wait-control-source-contract": SCENE_WAIT_CONTROL_SOURCE_CONTRACT,
    "data-viz-manim-wait-control-stop-condition-id": "trace-finished",
    "data-viz-manim-wait-control-stop-condition-satisfied": "true",
    "data-viz-manim-wait-control-summary": "waitControl:wait-until:condition=trace-finished:run=1.000:effective=0.400:frames=2:overrideSkip=true:satisfied=true",
    "data-viz-manim-wait-control-update-frame-actions": "capture,capture",
    "data-viz-manim-wait-control-update-mobject-frame-count": "2",
    "data-viz-manim-wait-control-update-mobject-total-dt": "0.400",
    "data-viz-manim-wait-control-update-mobject-dts": "0.200,0.200",
    "data-viz-manim-wait-control-updater-final-value": "0.400",
    "data-viz-manim-wait-control-updater-value-summary": "waitUpdater:mode=wait-until:frames=2:final=0.400:values=0.200,0.400",
    "data-viz-manim-wait-control-updater-values": "0.200,0.400",
    "data-viz-manim-wait-control-updates-mobjects-during-presenter-hold": "false",
    "data-viz-manim-wait-control-updates-mobjects-during-wait": "true",
    "data-viz-manim-wait-control-updates-mobjects-while-skipping": "false",
    "data-viz-manim-wait-control-updates-mobjects": "true,true",
    "data-viz-manim-wait-control-updater-policy": SCENE_WAIT_CONTROL_UPDATER_POLICY,
    "data-viz-manim-wait-control-written-frame-count": "2"
  });
});

test("serializeSceneWaitControlPlan exposes deterministic safe JSON for browser QA", async () => {
  const { buildSceneWaitControl, serializeSceneWaitControlPlan } = await importSceneWaitControlModule();
  const plan = buildSceneWaitControl({
    fps: 4,
    holdOnWait: true,
    note: "pause before </script> redraw",
    playIndex: 2,
    presenterMode: true,
    presenterReleaseAfterFrames: 2
  });

  const serialized = serializeSceneWaitControlPlan(plan);
  const reparsed = JSON.parse(serialized) as MathSceneWaitControlPlan;

  assert.equal(
    serializeSceneWaitControlPlan(JSON.parse(JSON.stringify(plan)) as MathSceneWaitControlPlan),
    serialized
  );
  assert.equal(reparsed.summary, plan.summary);
  assert.equal(reparsed.presenterHold.note, "pause before </script> redraw");
  assert.equal(reparsed.frames[0].updateFrame.summary, plan.frames[0].updateFrame.summary);
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("Scene wait control stays pure and documents the wait/update source contract", async () => {
  const {
    SCENE_WAIT_CONTROL_FRAME_POLICY,
    SCENE_WAIT_CONTROL_SOURCE_CONTRACT,
    SCENE_WAIT_CONTROL_UPDATER_POLICY
  } = await importSceneWaitControlModule();

  assert.ok(fs.existsSync(modulePath), "mathSceneWaitControl.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /wait_until/);
  assert.match(source, /get_wait_time_progression/);
  assert.match(source, /stop_condition/);
  assert.match(source, /override_skip_animations/);
  assert.match(source, /presenter_mode/);
  assert.match(source, /ignore_presenter_mode/);
  assert.match(source, /hold_loop/);
  assert.match(source, /update_frame/);
  assert.match(source, /emit_frame/);
  assert.match(source, /SCENE_WAIT_CONTROL_FRAME_POLICY/);
  assert.match(source, /SCENE_WAIT_CONTROL_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_WAIT_CONTROL_UPDATER_POLICY/);
  assert.match(source, /serializeSceneWaitControlPlan/);
  assert.match(source, /stableSerialize/);
  assert.equal(
    SCENE_WAIT_CONTROL_FRAME_POLICY,
    "timeline-wait-update-frame-then-emit-frame-per-sampled-time-presenter-hold-update-frame-without-emit-frame"
  );
  assert.equal(
    SCENE_WAIT_CONTROL_SOURCE_CONTRACT,
    "Scene.wait samples time, calls update_frame, and emits frames so mobject updaters continue"
  );
  assert.equal(SCENE_WAIT_CONTROL_UPDATER_POLICY, "wait-updates-mobjects-each-frame");
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
