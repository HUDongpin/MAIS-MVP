import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneProgressControlTransition = {
  action: "temp_progress_bar_enter" | "temp_progress_bar_exit";
  enabledAfter: boolean;
  enabledBefore: boolean;
  restoredPreviousStatus: boolean;
};

const expectedProgressControlSourceContract =
  "Scene.temp_progress_bar -> stores previous show_animation_progress, enables progress display inside the context, and restores it in finally" as const;
const expectedProgressControlStatePolicy =
  "remember-previous-progress-status-enable-temporarily-and-finally-restore-previous-status" as const;

type MathSceneProgressControlPlan = {
  actionSummary: string;
  finalShowAnimationProgress: boolean;
  initialShowAnimationProgress: boolean;
  previousShowAnimationProgress: boolean;
  requested: boolean;
  restoredPreviousStatus: boolean;
  sourceContract: typeof expectedProgressControlSourceContract;
  statePolicy: typeof expectedProgressControlStatePolicy;
  summary: string;
  transitionCount: number;
  transitions: MathSceneProgressControlTransition[];
};

type MathSceneProgressControlModule = {
  SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT: typeof expectedProgressControlSourceContract;
  SCENE_PROGRESS_CONTROL_STATE_POLICY: typeof expectedProgressControlStatePolicy;
  buildSceneProgressControlPlan: (input: {
    initialShowAnimationProgress?: boolean;
    requested?: boolean;
  }) => MathSceneProgressControlPlan;
  sceneProgressControlDataAttributes: (plan: MathSceneProgressControlPlan) => Record<string, string>;
  serializeSceneProgressControlPlan: (plan: MathSceneProgressControlPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneProgressControl.ts";

async function importProgressControlModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure temp_progress_bar control module");
  return await import("./mathSceneProgressControl") as MathSceneProgressControlModule;
}

test("buildSceneProgressControlPlan models temp_progress_bar enter and finally restore", async () => {
  const {
    SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT,
    SCENE_PROGRESS_CONTROL_STATE_POLICY,
    buildSceneProgressControlPlan
  } = await importProgressControlModule();
  const plan = buildSceneProgressControlPlan({
    initialShowAnimationProgress: false,
    requested: true
  });

  assert.equal(plan.sourceContract, SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT);
  assert.match(plan.sourceContract, /temp_progress_bar.*show_animation_progress/i);
  assert.equal(plan.statePolicy, SCENE_PROGRESS_CONTROL_STATE_POLICY);
  assert.match(plan.statePolicy, /previous.*finally.*restore/i);
  assert.equal(plan.requested, true);
  assert.equal(plan.initialShowAnimationProgress, false);
  assert.equal(plan.previousShowAnimationProgress, false);
  assert.equal(plan.finalShowAnimationProgress, false);
  assert.equal(plan.restoredPreviousStatus, true);
  assert.equal(plan.transitionCount, 2);
  assert.deepEqual(plan.transitions.map((transition) => `${transition.action}:${transition.enabledBefore}->${transition.enabledAfter}:restored=${transition.restoredPreviousStatus}`), [
    "temp_progress_bar_enter:false->true:restored=false",
    "temp_progress_bar_exit:true->false:restored=true"
  ]);
  assert.equal(
    plan.summary,
    "progressControl:requested=true:transitions=2:initial=false:final=false:restored=true:actions=temp_progress_bar_enter,temp_progress_bar_exit"
  );
});

test("buildSceneProgressControlPlan restores an already-visible progress bar", async () => {
  const { buildSceneProgressControlPlan } = await importProgressControlModule();
  const plan = buildSceneProgressControlPlan({
    initialShowAnimationProgress: true,
    requested: true
  });

  assert.equal(plan.initialShowAnimationProgress, true);
  assert.equal(plan.finalShowAnimationProgress, true);
  assert.equal(plan.transitions[0]?.enabledAfter, true);
  assert.equal(plan.transitions[1]?.enabledAfter, true);
  assert.equal(plan.summary, "progressControl:requested=true:transitions=2:initial=true:final=true:restored=true:actions=temp_progress_bar_enter,temp_progress_bar_exit");
});

test("buildSceneProgressControlPlan stays idle when progress_bar is disabled", async () => {
  const { buildSceneProgressControlPlan } = await importProgressControlModule();
  const plan = buildSceneProgressControlPlan({
    initialShowAnimationProgress: false,
    requested: false
  });

  assert.equal(plan.requested, false);
  assert.equal(plan.transitionCount, 0);
  assert.equal(plan.finalShowAnimationProgress, false);
  assert.equal(plan.actionSummary, "none");
  assert.equal(plan.summary, "progressControl:requested=false:transitions=0:initial=false:final=false:restored=false:actions=none");
});

test("sceneProgressControlDataAttributes exposes stable browser QA evidence", async () => {
  const {
    buildSceneProgressControlPlan,
    sceneProgressControlDataAttributes
  } = await importProgressControlModule();
  const plan = buildSceneProgressControlPlan({
    initialShowAnimationProgress: false,
    requested: true
  });

  assert.deepEqual(sceneProgressControlDataAttributes(plan), {
    "data-viz-manim-progress-control-action-summary": "temp_progress_bar_enter,temp_progress_bar_exit",
    "data-viz-manim-progress-control-final-progress": "false",
    "data-viz-manim-progress-control-initial-progress": "false",
    "data-viz-manim-progress-control-previous-progress": "false",
    "data-viz-manim-progress-control-requested": "true",
    "data-viz-manim-progress-control-restored-previous": "true",
    "data-viz-manim-progress-control-source-contract": plan.sourceContract,
    "data-viz-manim-progress-control-state-policy": plan.statePolicy,
    "data-viz-manim-progress-control-summary": plan.summary,
    "data-viz-manim-progress-control-transition-count": "2"
  });
});

test("serializeSceneProgressControlPlan emits deterministic safe JSON for browser QA", async () => {
  const { buildSceneProgressControlPlan, serializeSceneProgressControlPlan } = await importProgressControlModule();
  const plan = buildSceneProgressControlPlan({
    initialShowAnimationProgress: false,
    requested: true
  });

  const serialized = serializeSceneProgressControlPlan(plan);
  const reparsed = JSON.parse(serialized) as MathSceneProgressControlPlan;

  assert.equal(
    serializeSceneProgressControlPlan(JSON.parse(JSON.stringify(plan)) as MathSceneProgressControlPlan),
    serialized
  );
  assert.equal(reparsed.summary, plan.summary);
  assert.equal(reparsed.transitions[0]?.action, "temp_progress_bar_enter");
  assert.equal(reparsed.transitions[1]?.restoredPreviousStatus, true);
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("Scene progress control stays pure and documents the temp_progress_bar source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneProgressControl.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /temp_progress_bar/);
  assert.match(source, /show_animation_progress/);
  assert.match(source, /temp_config_change/);
  assert.match(source, /SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_PROGRESS_CONTROL_STATE_POLICY/);
  assert.match(source, /serializeSceneProgressControlPlan/);
  assert.match(source, /stableSerialize/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|window|document|setTimeout|requestAnimationFrame|ThreeDLabCanvas/);
});
