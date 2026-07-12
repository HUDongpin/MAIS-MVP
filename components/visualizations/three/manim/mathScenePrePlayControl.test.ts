import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathScenePrePlayAction =
  | "begin-animation"
  | "end-scene"
  | "none"
  | "presenter-hold"
  | "reset-window-clock"
  | "skip-before-start"
  | "start-gate-preserve-skip"
  | "start-gate-stop-skipping";

type MathScenePrePlayRow = {
  actionSummary: string;
  actions: MathScenePrePlayAction[];
  beginAnimation: boolean;
  endScene: boolean;
  hasWindow: boolean;
  numPlaysBefore: number;
  playIndex: number;
  presenterHoldFrameCount: number;
  sceneTimeSeconds: number;
  skipAnimationsAfterSkippingStatus: boolean;
  skipAnimationsBefore: boolean;
  startGate: boolean;
  stopSkippingClockReset: boolean;
  windowClockReset: boolean;
};

type MathScenePrePlayControlPlan = {
  beginAnimationCount: number;
  constructorForcedSkip: boolean;
  endScenePlayIndex: number | null;
  finalSkipAnimations: boolean;
  hasWindow: boolean;
  playCount: number;
  presenterHoldCount: number;
  processedPlayCount: number;
  rows: MathScenePrePlayRow[];
  skipGatePolicy: string;
  sourceContract: string;
  startGateCount: number;
  stopSkippingClockResetCount: number;
  summary: string;
  truncatedByEndScene: boolean;
  version: "mais-manim-pre-play-control/v1";
  windowClockResetCount: number;
};

type MathScenePrePlayControlModule = {
  SCENE_PRE_PLAY_SKIP_GATE_POLICY: string;
  SCENE_PRE_PLAY_SOURCE_CONTRACT: string;
  buildScenePrePlayControlPlan: (input: {
    endAtAnimationNumber?: number | null;
    fps?: number;
    hasWindow?: boolean;
    holdOnWait?: boolean;
    initialSkipAnimations?: boolean;
    playCount: number;
    playStartSeconds?: number[];
    presenterMode?: boolean;
    presenterReleaseAfterFrames?: number;
    startAtAnimationNumber?: number | null;
    startNumPlays?: number;
  }) => MathScenePrePlayControlPlan;
  scenePrePlayControlDataAttributes: (plan: MathScenePrePlayControlPlan) => Record<string, string>;
  serializeScenePrePlayControlPlan: (plan: MathScenePrePlayControlPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathScenePrePlayControl.ts";

async function importPrePlayControlModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.pre_play control module");
  return (await import("./mathScenePrePlayControl")) as MathScenePrePlayControlModule;
}

test("buildScenePrePlayControlPlan mirrors Scene.pre_play ordering and gates", async () => {
  const {
    SCENE_PRE_PLAY_SKIP_GATE_POLICY,
    SCENE_PRE_PLAY_SOURCE_CONTRACT,
    buildScenePrePlayControlPlan
  } = await importPrePlayControlModule();
  const plan = buildScenePrePlayControlPlan({
    endAtAnimationNumber: 3,
    fps: 4,
    hasWindow: true,
    holdOnWait: true,
    initialSkipAnimations: false,
    playCount: 4,
    playStartSeconds: [0, 1, 1.5, 2.5],
    presenterMode: true,
    presenterReleaseAfterFrames: 2,
    startAtAnimationNumber: 1
  });

  assert.equal(plan.version, "mais-manim-pre-play-control/v1");
  assert.equal(plan.sourceContract, SCENE_PRE_PLAY_SOURCE_CONTRACT);
  assert.equal(plan.skipGatePolicy, SCENE_PRE_PLAY_SKIP_GATE_POLICY);
  assert.match(plan.sourceContract, /Scene\.pre_play/);
  assert.match(plan.sourceContract, /update_skipping_status/);
  assert.match(plan.skipGatePolicy, /start-at-end-at/);
  assert.match(plan.skipGatePolicy, /window-clock-reset/);
  assert.equal(plan.constructorForcedSkip, true);
  assert.equal(plan.playCount, 4);
  assert.equal(plan.processedPlayCount, 4);
  assert.equal(plan.presenterHoldCount, 1);
  assert.equal(plan.startGateCount, 1);
  assert.equal(plan.beginAnimationCount, 2);
  assert.equal(plan.windowClockResetCount, 3);
  assert.equal(plan.stopSkippingClockResetCount, 1);
  assert.equal(plan.truncatedByEndScene, true);
  assert.equal(plan.endScenePlayIndex, 3);
  assert.deepEqual(plan.rows.map((row) => row.actionSummary), [
    "presenter-hold+skip-before-start+reset-window-clock",
    "start-gate-stop-skipping+begin-animation+reset-window-clock",
    "begin-animation+reset-window-clock",
    "end-scene"
  ]);
  assert.equal(plan.rows[0].presenterHoldFrameCount, 2);
  assert.equal(plan.rows[0].skipAnimationsBefore, true);
  assert.equal(plan.rows[1].startGate, true);
  assert.equal(plan.rows[1].skipAnimationsAfterSkippingStatus, false);
  assert.equal(plan.rows[1].beginAnimation, true);
  assert.equal(plan.rows[3].beginAnimation, false);
  assert.equal(plan.rows[3].windowClockReset, false);
  assert.equal(
    plan.summary,
    "prePlay:plays=4:begin=2:hold=1:startGate=1:endScene=1:windowClock=3"
  );
});

test("buildScenePrePlayControlPlan begins ordinary animations without window clock evidence", async () => {
  const { buildScenePrePlayControlPlan } = await importPrePlayControlModule();
  const plan = buildScenePrePlayControlPlan({
    hasWindow: false,
    initialSkipAnimations: false,
    playCount: 2
  });

  assert.equal(plan.constructorForcedSkip, false);
  assert.equal(plan.truncatedByEndScene, false);
  assert.deepEqual(plan.rows.map((row) => row.actionSummary), ["begin-animation", "begin-animation"]);
  assert.equal(plan.beginAnimationCount, 2);
  assert.equal(plan.windowClockResetCount, 0);
  assert.equal(plan.finalSkipAnimations, false);
  assert.equal(plan.summary, "prePlay:plays=2:begin=2:hold=0:startGate=0:endScene=0:windowClock=0");
});

test("buildScenePrePlayControlPlan preserves originally skipped scenes at the start gate", async () => {
  const { buildScenePrePlayControlPlan } = await importPrePlayControlModule();
  const plan = buildScenePrePlayControlPlan({
    hasWindow: true,
    initialSkipAnimations: true,
    playCount: 2,
    startAtAnimationNumber: 1
  });

  assert.equal(plan.constructorForcedSkip, true);
  assert.equal(plan.beginAnimationCount, 0);
  assert.equal(plan.stopSkippingClockResetCount, 0);
  assert.deepEqual(plan.rows.map((row) => row.actionSummary), [
    "skip-before-start+reset-window-clock",
    "start-gate-preserve-skip+reset-window-clock"
  ]);
  assert.equal(plan.rows[1].startGate, true);
  assert.equal(plan.rows[1].skipAnimationsAfterSkippingStatus, true);
  assert.equal(plan.finalSkipAnimations, true);
});

test("scenePrePlayControlDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_PRE_PLAY_SKIP_GATE_POLICY,
    SCENE_PRE_PLAY_SOURCE_CONTRACT,
    buildScenePrePlayControlPlan,
    scenePrePlayControlDataAttributes
  } = await importPrePlayControlModule();
  const plan = buildScenePrePlayControlPlan({
    endAtAnimationNumber: 2,
    hasWindow: true,
    initialSkipAnimations: false,
    playCount: 3,
    startAtAnimationNumber: 1
  });

  assert.deepEqual(scenePrePlayControlDataAttributes(plan), {
    "data-viz-manim-pre-play-begin-animation-count": "1",
    "data-viz-manim-pre-play-constructor-forced-skip": "true",
    "data-viz-manim-pre-play-end-scene-play": "2",
    "data-viz-manim-pre-play-final-skip": "false",
    "data-viz-manim-pre-play-has-window": "true",
    "data-viz-manim-pre-play-presenter-hold-count": "0",
    "data-viz-manim-pre-play-processed-play-count": "3",
    "data-viz-manim-pre-play-skip-gate-policy": SCENE_PRE_PLAY_SKIP_GATE_POLICY,
    "data-viz-manim-pre-play-source-contract": SCENE_PRE_PLAY_SOURCE_CONTRACT,
    "data-viz-manim-pre-play-start-gate-count": "1",
    "data-viz-manim-pre-play-summary": plan.summary,
    "data-viz-manim-pre-play-truncated": "true",
    "data-viz-manim-pre-play-window-clock-reset-count": "2"
  });
});

test("serializeScenePrePlayControlPlan emits escaped deterministic browser JSON", async () => {
  const {
    buildScenePrePlayControlPlan,
    serializeScenePrePlayControlPlan
  } = await importPrePlayControlModule();
  const plan = buildScenePrePlayControlPlan({
    hasWindow: true,
    initialSkipAnimations: false,
    playCount: 2,
    playStartSeconds: [0, 1.25],
    startAtAnimationNumber: 1
  });
  const unsafePlan = {
    ...plan,
    summary: `${plan.summary}:<pre-play-control>`
  };

  const serialized = serializeScenePrePlayControlPlan(unsafePlan);

  assert.equal(
    serializeScenePrePlayControlPlan(JSON.parse(JSON.stringify(unsafePlan)) as MathScenePrePlayControlPlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<pre-play-control>|<\/script/i);
  assert.match(serialized, /\\u003cpre-play-control>/);
  assert.deepEqual(JSON.parse(serialized), unsafePlan);
});

test("Scene pre-play control stays pure and documents the pre_play source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathScenePrePlayControl.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /pre_play/);
  assert.match(source, /SCENE_PRE_PLAY_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_PRE_PLAY_SKIP_GATE_POLICY/);
  assert.match(source, /presenter_mode/);
  assert.match(source, /hold_loop/);
  assert.match(source, /update_skipping_status/);
  assert.match(source, /begin_animation/);
  assert.match(source, /virtual_animation_start_time/);
  assert.match(source, /real_animation_start_time/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|\bdocument\b|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /\bwindow(?:\.|\[)/);
});
