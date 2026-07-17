import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneSkipControlAction =
  | "force_skipping"
  | "revert_to_original_skipping_status"
  | "stop_skipping"
  | "temp_skip_enter"
  | "temp_skip_exit";

const expectedSkipControlSourceContract =
  "Scene force_skipping/revert_to_original_skipping_status/stop_skipping/temp_skip -> preserve original skip state while allowing temporary skip mode" as const;
const expectedSkipControlStatePolicy =
  "save-original-skip-status-force-temporary-skip-restore-original-and-reset-animation-clock-when-stop-skipping-runs" as const;

type MathSceneSkipControlTransition = {
  action: MathSceneSkipControlAction;
  afterSkipAnimations: boolean;
  beforeSkipAnimations: boolean;
  hasOriginalSkippingStatus: boolean;
  originalSkippingStatus: boolean;
  resetsAnimationClock: boolean;
  restoredOriginalStatus: boolean;
  stoppedSkipping: boolean;
  summary: string;
  tempSkipPreviousStatus: boolean;
};

type MathSceneSkipControlPlan = {
  finalHasOriginalSkippingStatus: boolean;
  finalOriginalSkippingStatus: boolean;
  finalSkipAnimations: boolean;
  finalTempSkipPreviousStatus: boolean;
  skippedTransitionCount: number;
  sourceContract: typeof expectedSkipControlSourceContract;
  statePolicy: typeof expectedSkipControlStatePolicy;
  stoppedTransitionCount: number;
  summary: string;
  transitionCount: number;
  transitions: MathSceneSkipControlTransition[];
};

type MathSceneSkipControlModule = {
  SCENE_SKIP_CONTROL_SOURCE_CONTRACT: typeof expectedSkipControlSourceContract;
  SCENE_SKIP_CONTROL_STATE_POLICY: typeof expectedSkipControlStatePolicy;
  buildSceneSkipControlPlan: (input: {
    actions: MathSceneSkipControlAction[];
    initialOriginalSkippingStatus?: boolean;
    initialSkipAnimations?: boolean;
  }) => MathSceneSkipControlPlan;
  sceneSkipControlDataAttributes: (plan: MathSceneSkipControlPlan) => Record<string, string>;
  serializeSceneSkipControlPlan: (plan: MathSceneSkipControlPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneSkipControl.ts";

async function importSceneSkipControlModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene skip-control module");
  return await import("./mathSceneSkipControl") as MathSceneSkipControlModule;
}

test("buildSceneSkipControlPlan mirrors force_skipping and revert_to_original_skipping_status", async () => {
  const {
    SCENE_SKIP_CONTROL_SOURCE_CONTRACT,
    SCENE_SKIP_CONTROL_STATE_POLICY,
    buildSceneSkipControlPlan
  } = await importSceneSkipControlModule();
  const plan = buildSceneSkipControlPlan({
    actions: ["force_skipping", "revert_to_original_skipping_status"],
    initialSkipAnimations: false
  });

  assert.equal(plan.sourceContract, SCENE_SKIP_CONTROL_SOURCE_CONTRACT);
  assert.match(plan.sourceContract, /force_skipping.*temp_skip/i);
  assert.equal(plan.statePolicy, SCENE_SKIP_CONTROL_STATE_POLICY);
  assert.match(plan.statePolicy, /original.*clock/i);
  assert.equal(plan.finalSkipAnimations, false);
  assert.equal(plan.finalOriginalSkippingStatus, false);
  assert.equal(plan.finalHasOriginalSkippingStatus, true);
  assert.equal(plan.transitionCount, 2);
  assert.equal(plan.skippedTransitionCount, 1);
  assert.equal(plan.stoppedTransitionCount, 0);
  assert.deepEqual(
    plan.transitions.map((transition) => transition.summary),
    [
      "skipControl:force_skipping:before=false:after=true:original=false:restored=false:stopped=false:clockReset=false",
      "skipControl:revert_to_original_skipping_status:before=true:after=false:original=false:restored=true:stopped=false:clockReset=false"
    ]
  );
  assert.equal(
    plan.summary,
    "skipControl:transitions=2:finalSkip=false:original=false:stopped=0:actions=force_skipping,revert_to_original_skipping_status"
  );
});

test("buildSceneSkipControlPlan preserves an originally skipped scene after force and revert", async () => {
  const { buildSceneSkipControlPlan } = await importSceneSkipControlModule();
  const plan = buildSceneSkipControlPlan({
    actions: ["force_skipping", "revert_to_original_skipping_status"],
    initialSkipAnimations: true
  });

  assert.equal(plan.finalSkipAnimations, true);
  assert.equal(plan.finalOriginalSkippingStatus, true);
  assert.equal(plan.transitions[0].originalSkippingStatus, true);
  assert.equal(plan.transitions[1].afterSkipAnimations, true);
});

test("buildSceneSkipControlPlan models temp_skip enter and finally-style exit", async () => {
  const { buildSceneSkipControlPlan } = await importSceneSkipControlModule();
  const plan = buildSceneSkipControlPlan({
    actions: ["temp_skip_enter", "temp_skip_exit"],
    initialSkipAnimations: false
  });

  assert.equal(plan.finalSkipAnimations, false);
  assert.equal(plan.finalTempSkipPreviousStatus, false);
  assert.equal(plan.stoppedTransitionCount, 1);
  assert.equal(plan.transitions[0].tempSkipPreviousStatus, false);
  assert.equal(plan.transitions[0].afterSkipAnimations, true);
  assert.equal(plan.transitions[1].stoppedSkipping, true);
  assert.equal(plan.transitions[1].resetsAnimationClock, true);
  assert.equal(
    plan.transitions[1].summary,
    "skipControl:temp_skip_exit:before=true:after=false:original=false:restored=false:stopped=true:clockReset=true"
  );
});

test("buildSceneSkipControlPlan keeps skip enabled when temp_skip started inside an already skipped scene", async () => {
  const { buildSceneSkipControlPlan } = await importSceneSkipControlModule();
  const plan = buildSceneSkipControlPlan({
    actions: ["temp_skip_enter", "temp_skip_exit"],
    initialSkipAnimations: true
  });

  assert.equal(plan.finalSkipAnimations, true);
  assert.equal(plan.stoppedTransitionCount, 0);
  assert.equal(plan.transitions[1].stoppedSkipping, false);
  assert.equal(plan.transitions[1].resetsAnimationClock, false);
});

test("sceneSkipControlDataAttributes exposes stable browser QA evidence", async () => {
  const { buildSceneSkipControlPlan, sceneSkipControlDataAttributes } = await importSceneSkipControlModule();
  const plan = buildSceneSkipControlPlan({
    actions: ["temp_skip_enter", "temp_skip_exit"],
    initialSkipAnimations: false
  });

  assert.deepEqual(sceneSkipControlDataAttributes(plan), {
    "data-viz-manim-skip-control-action-summary": "temp_skip_enter,temp_skip_exit",
    "data-viz-manim-skip-control-final-original-status": "false",
    "data-viz-manim-skip-control-final-skip": "false",
    "data-viz-manim-skip-control-final-temp-previous": "false",
    "data-viz-manim-skip-control-has-original-status": "true",
    "data-viz-manim-skip-control-skipped-transition-count": "1",
    "data-viz-manim-skip-control-source-contract": plan.sourceContract,
    "data-viz-manim-skip-control-state-policy": plan.statePolicy,
    "data-viz-manim-skip-control-stopped-transition-count": "1",
    "data-viz-manim-skip-control-summary": "skipControl:transitions=2:finalSkip=false:original=false:stopped=1:actions=temp_skip_enter,temp_skip_exit",
    "data-viz-manim-skip-control-transition-count": "2"
  });
});

test("serializeSceneSkipControlPlan emits deterministic safe JSON for browser QA", async () => {
  const { buildSceneSkipControlPlan, serializeSceneSkipControlPlan } = await importSceneSkipControlModule();
  const plan = buildSceneSkipControlPlan({
    actions: ["force_skipping", "revert_to_original_skipping_status", "temp_skip_enter", "temp_skip_exit"],
    initialSkipAnimations: false
  });

  const serialized = serializeSceneSkipControlPlan(plan);
  const reparsed = JSON.parse(serialized) as MathSceneSkipControlPlan;

  assert.equal(
    serializeSceneSkipControlPlan(JSON.parse(JSON.stringify(plan)) as MathSceneSkipControlPlan),
    serialized
  );
  assert.equal(reparsed.summary, plan.summary);
  assert.equal(reparsed.transitions[0].summary, plan.transitions[0].summary);
  assert.equal(reparsed.transitions[3].action, "temp_skip_exit");
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("Scene skip control stays pure and documents the force/temp skip source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneSkipControl.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /force_skipping/);
  assert.match(source, /revert_to_original_skipping_status/);
  assert.match(source, /temp_skip/);
  assert.match(source, /stop_skipping/);
  assert.match(source, /SCENE_SKIP_CONTROL_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_SKIP_CONTROL_STATE_POLICY/);
  assert.match(source, /serializeSceneSkipControlPlan/);
  assert.match(source, /stableSerialize/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
