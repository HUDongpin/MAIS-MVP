import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneSkippingWindowAction =
  | "continue_skip_before_start"
  | "end_window_raise_end_scene"
  | "none"
  | "start_window_preserve_original_skip"
  | "start_window_stop_skipping";

type MathSceneSkippingWindowPlay = {
  actionSummary: string;
  actions: MathSceneSkippingWindowAction[];
  beforeSkipAnimations: boolean;
  endScene: boolean;
  finalSkipAnimations: boolean;
  playIndex: number;
  playStartSeconds: number;
  resetsAnimationClock: boolean;
  skipTimeSeconds: number | null;
  stoppedSkipping: boolean;
};

type MathSceneSkippingWindowPlan = {
  constructorForcedSkip: boolean;
  endAtAnimationNumber: number | null;
  endScenePlayIndex: number | null;
  finalSkipAnimations: boolean;
  gatePolicy: typeof expectedGatePolicy;
  initialSkipAnimations: boolean;
  originalSkippingStatus: boolean;
  playCount: number;
  plays: MathSceneSkippingWindowPlay[];
  renderedPlayCount: number;
  skippedPlayCount: number;
  sourceContract: typeof expectedSourceContract;
  startAtAnimationNumber: number | null;
  summary: string;
  truncatedByEndScene: boolean;
  version: "mais-manim-skipping-window/v1";
};

type MathSceneSkippingWindowModule = {
  SCENE_SKIPPING_WINDOW_GATE_POLICY: string;
  SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT: string;
  buildSceneSkippingWindowPlan: (input: {
    endAtAnimationNumber?: number | null;
    initialSkipAnimations?: boolean;
    playCount: number;
    playDurations?: number[];
    startAtAnimationNumber?: number | null;
  }) => MathSceneSkippingWindowPlan;
  sceneSkippingWindowDataAttributes: (plan: MathSceneSkippingWindowPlan) => Record<string, string>;
  serializeSceneSkippingWindowPlan: (plan: MathSceneSkippingWindowPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneSkippingWindow.ts";
const expectedGatePolicy =
  "constructor-forced-skip-start-window-stop-or-preserve-original-end-window-raise-EndScene" as const;
const expectedSourceContract =
  "Scene.update_skipping_status -> constructor start_at_animation_number forces skip_animations, records skip_time, and end_at_animation_number raises EndScene" as const;

async function importSkippingWindowModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.update_skipping_status window module");
  return (await import("./mathSceneSkippingWindow")) as MathSceneSkippingWindowModule;
}

test("buildSceneSkippingWindowPlan mirrors start/end animation number gates", async () => {
  const {
    SCENE_SKIPPING_WINDOW_GATE_POLICY,
    SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT,
    buildSceneSkippingWindowPlan
  } = await importSkippingWindowModule();
  const plan = buildSceneSkippingWindowPlan({
    endAtAnimationNumber: 4,
    initialSkipAnimations: false,
    playCount: 5,
    playDurations: [1, 0.5, 2, 1, 1],
    startAtAnimationNumber: 2
  });

  assert.equal(plan.version, "mais-manim-skipping-window/v1");
  assert.equal(plan.gatePolicy, SCENE_SKIPPING_WINDOW_GATE_POLICY);
  assert.match(plan.gatePolicy, /constructor.*start.*end/i);
  assert.equal(plan.sourceContract, SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT);
  assert.match(plan.sourceContract, /update_skipping_status.*EndScene/i);
  assert.equal(plan.constructorForcedSkip, true);
  assert.equal(plan.initialSkipAnimations, false);
  assert.equal(plan.originalSkippingStatus, false);
  assert.equal(plan.startAtAnimationNumber, 2);
  assert.equal(plan.endAtAnimationNumber, 4);
  assert.equal(plan.endScenePlayIndex, 4);
  assert.equal(plan.truncatedByEndScene, true);
  assert.equal(plan.renderedPlayCount, 5);
  assert.equal(plan.skippedPlayCount, 3);
  assert.equal(plan.finalSkipAnimations, false);
  assert.deepEqual(plan.plays.map((play) => play.actionSummary), [
    "continue_skip_before_start",
    "continue_skip_before_start",
    "start_window_stop_skipping",
    "none",
    "end_window_raise_end_scene"
  ]);
  assert.equal(plan.plays[2].playStartSeconds, 1.5);
  assert.equal(plan.plays[2].skipTimeSeconds, 1.5);
  assert.equal(plan.plays[2].stoppedSkipping, true);
  assert.equal(plan.plays[2].resetsAnimationClock, true);
  assert.equal(plan.plays[2].finalSkipAnimations, false);
  assert.equal(
    plan.summary,
    "skippingWindow:start=2:end=4:plays=5:rendered=5:skipped=3:finalSkip=false:endScene=true"
  );
});

test("buildSceneSkippingWindowPlan preserves an originally skipped scene at the start gate", async () => {
  const { buildSceneSkippingWindowPlan } = await importSkippingWindowModule();
  const plan = buildSceneSkippingWindowPlan({
    initialSkipAnimations: true,
    playCount: 3,
    playDurations: [1, 1, 1],
    startAtAnimationNumber: 1
  });

  assert.equal(plan.constructorForcedSkip, true);
  assert.equal(plan.originalSkippingStatus, true);
  assert.equal(plan.plays[1].actionSummary, "start_window_preserve_original_skip");
  assert.equal(plan.plays[1].stoppedSkipping, false);
  assert.equal(plan.plays[1].finalSkipAnimations, true);
  assert.equal(plan.finalSkipAnimations, true);
});

test("buildSceneSkippingWindowPlan stays idle without a configured animation window", async () => {
  const { buildSceneSkippingWindowPlan } = await importSkippingWindowModule();
  const plan = buildSceneSkippingWindowPlan({
    initialSkipAnimations: false,
    playCount: 2,
    playDurations: [0.5, 0.5]
  });

  assert.equal(plan.constructorForcedSkip, false);
  assert.equal(plan.finalSkipAnimations, false);
  assert.equal(plan.skippedPlayCount, 0);
  assert.deepEqual(plan.plays.map((play) => play.actionSummary), ["none", "none"]);
  assert.equal(plan.summary, "skippingWindow:start=none:end=none:plays=2:rendered=2:skipped=0:finalSkip=false:endScene=false");
});

test("sceneSkippingWindowDataAttributes exposes stable browser QA evidence", async () => {
  const {
    buildSceneSkippingWindowPlan,
    sceneSkippingWindowDataAttributes
  } = await importSkippingWindowModule();
  const plan = buildSceneSkippingWindowPlan({
    endAtAnimationNumber: 2,
    initialSkipAnimations: false,
    playCount: 3,
    playDurations: [1, 1, 1],
    startAtAnimationNumber: 1
  });

  assert.deepEqual(sceneSkippingWindowDataAttributes(plan), {
    "data-viz-manim-skipping-window-constructor-forced-skip": "true",
    "data-viz-manim-skipping-window-end-at": "2",
    "data-viz-manim-skipping-window-end-scene-play": "2",
    "data-viz-manim-skipping-window-final-skip": "false",
    "data-viz-manim-skipping-window-gate-policy": plan.gatePolicy,
    "data-viz-manim-skipping-window-play-count": "3",
    "data-viz-manim-skipping-window-rendered-play-count": "3",
    "data-viz-manim-skipping-window-skipped-play-count": "2",
    "data-viz-manim-skipping-window-source-contract": plan.sourceContract,
    "data-viz-manim-skipping-window-start-at": "1",
    "data-viz-manim-skipping-window-summary": plan.summary,
    "data-viz-manim-skipping-window-truncated": "true"
  });
});

test("serializeSceneSkippingWindowPlan emits deterministic safe JSON for browser QA", async () => {
  const { buildSceneSkippingWindowPlan, serializeSceneSkippingWindowPlan } = await importSkippingWindowModule();
  const plan = buildSceneSkippingWindowPlan({
    endAtAnimationNumber: 3,
    initialSkipAnimations: false,
    playCount: 4,
    playDurations: [0.25, 0.5, 0.75, 1],
    startAtAnimationNumber: 1
  });

  const serialized = serializeSceneSkippingWindowPlan(plan);
  const reparsed = JSON.parse(serialized) as MathSceneSkippingWindowPlan;

  assert.equal(
    serializeSceneSkippingWindowPlan(JSON.parse(JSON.stringify(plan)) as MathSceneSkippingWindowPlan),
    serialized
  );
  assert.equal(reparsed.summary, plan.summary);
  assert.equal(reparsed.plays[1].skipTimeSeconds, 0.25);
  assert.equal(reparsed.plays[3].actionSummary, "end_window_raise_end_scene");
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("Scene skipping window stays pure and documents the update_skipping_status source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneSkippingWindow.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /update_skipping_status/);
  assert.match(source, /start_at_animation_number/);
  assert.match(source, /end_at_animation_number/);
  assert.match(source, /skip_time/);
  assert.match(source, /EndScene/);
  assert.match(source, /SCENE_SKIPPING_WINDOW_GATE_POLICY/);
  assert.match(source, /SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT/);
  assert.match(source, /serializeSceneSkippingWindowPlan/);
  assert.match(source, /stableSerialize/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|\bdocument\b|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /\bwindow(?:\.|\[|\s|;|,|\))/);
});
