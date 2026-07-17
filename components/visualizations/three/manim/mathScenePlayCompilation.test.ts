import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathRateFunctionName } from "./mathRateFunctions";

type MathSceneProtoAnimationSpec = {
  animationId: string;
  kind: "animation" | "builder" | "invalid";
  lagRatio?: number;
  objectId?: string;
  rateFunction?: MathRateFunctionName;
  runTime?: number;
  timeSpan?: [number, number] | null;
};

type MathScenePlayCompilationRow = {
  animationId: string;
  callsBuilderBuild: boolean;
  callsPrepareAnimation: boolean;
  callsUpdateRateInfo: boolean;
  errorMessage: string | null;
  kind: "animation" | "builder" | "invalid";
  lagRatioAfter: number;
  lagRatioBefore: number;
  objectId: string;
  rateFunctionAfter: MathRateFunctionName;
  rateFunctionBefore: MathRateFunctionName;
  runTimeAfter: number;
  runTimeBefore: number;
  valid: boolean;
};

type MathScenePlayCompilationPlan = {
  animationCount: number;
  callOrder: string[];
  callOrderReady: boolean;
  callOrderSummary: string;
  errorMessageSummary: string;
  invalidCount: number;
  maxRunTime: number;
  pipelineEnabled: boolean;
  preparePolicy: string;
  protoAnimationCount: number;
  preparedAnimationIds: string[];
  rows: MathScenePlayCompilationRow[];
  sourceContract: string;
  summary: string;
  updateRateInfoCallCount: number;
  version: "mais-manim-play-compilation/v1";
  warningMessage: string | null;
  warningNoAnimations: boolean;
};

type MathScenePlayCompilationModule = {
  SCENE_PLAY_COMPILATION_PREPARE_POLICY: string;
  SCENE_PLAY_COMPILATION_SOURCE_CONTRACT: string;
  buildScenePlayCompilationPlan: (input: {
    lagRatio?: number | null;
    protoAnimations: MathSceneProtoAnimationSpec[];
    rateFunction?: MathRateFunctionName | null;
    runTime?: number | null;
  }) => MathScenePlayCompilationPlan;
  scenePlayCompilationDataAttributes: (plan: MathScenePlayCompilationPlan) => Record<string, string>;
  serializeScenePlayCompilationPlan: (plan: MathScenePlayCompilationPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathScenePlayCompilation.ts";

async function importPlayCompilationModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.play compilation module");
  return (await import("./mathScenePlayCompilation")) as MathScenePlayCompilationModule;
}

test("buildScenePlayCompilationPlan mirrors prepare_animation and update_rate_info", async () => {
  const {
    SCENE_PLAY_COMPILATION_PREPARE_POLICY,
    SCENE_PLAY_COMPILATION_SOURCE_CONTRACT,
    buildScenePlayCompilationPlan
  } = await importPlayCompilationModule();
  const plan = buildScenePlayCompilationPlan({
    lagRatio: 0.25,
    protoAnimations: [
      { animationId: "curve-builder", kind: "builder", objectId: "curve", rateFunction: "linear", runTime: 1 },
      { animationId: "dot-fade", kind: "animation", objectId: "dot", rateFunction: "smooth", runTime: 0.5 }
    ],
    rateFunction: "smooth",
    runTime: 2.5
  });

  assert.equal(plan.version, "mais-manim-play-compilation/v1");
  assert.equal(plan.sourceContract, SCENE_PLAY_COMPILATION_SOURCE_CONTRACT);
  assert.equal(plan.preparePolicy, SCENE_PLAY_COMPILATION_PREPARE_POLICY);
  assert.match(plan.sourceContract, /Scene\.play/);
  assert.match(plan.sourceContract, /prepare_animation/);
  assert.match(plan.preparePolicy, /prepare-animation/);
  assert.match(plan.preparePolicy, /update-rate-info/);
  assert.equal(plan.protoAnimationCount, 2);
  assert.equal(plan.animationCount, 2);
  assert.equal(plan.invalidCount, 0);
  assert.equal(plan.errorMessageSummary, "none");
  assert.equal(plan.warningMessage, null);
  assert.equal(plan.warningNoAnimations, false);
  assert.equal(plan.pipelineEnabled, true);
  assert.deepEqual(plan.preparedAnimationIds, ["curve-builder", "dot-fade"]);
  assert.deepEqual(plan.callOrder, ["prepare_animation", "update_rate_info", "pre_play", "begin_animations", "progress_through_animations", "finish_animations", "post_play"]);
  assert.equal(plan.callOrderReady, true);
  assert.equal(
    plan.callOrderSummary,
    "prepare_animation>update_rate_info>pre_play>begin_animations>progress_through_animations>finish_animations>post_play"
  );
  assert.equal(plan.updateRateInfoCallCount, 2);
  assert.equal(plan.maxRunTime, 2.5);
  assert.deepEqual(plan.rows.map((row) => row.callsBuilderBuild), [true, false]);
  assert.deepEqual(plan.rows.map((row) => row.runTimeAfter), [2.5, 2.5]);
  assert.deepEqual(plan.rows.map((row) => row.rateFunctionAfter), ["smooth", "smooth"]);
  assert.deepEqual(plan.rows.map((row) => row.lagRatioAfter), [0.25, 0.25]);
  assert.ok(plan.rows.every((row) => row.callsPrepareAnimation));
  assert.ok(plan.rows.every((row) => row.callsUpdateRateInfo));
  assert.ok(plan.rows.every((row) => row.valid));
  assert.equal(
    plan.summary,
    "playCompilation:proto=2:prepared=2:updateRate=2:run=2.500:pipeline=pre_play>begin_animations>progress_through_animations>finish_animations>post_play"
  );
});

test("buildScenePlayCompilationPlan preserves source no-animation warning behavior", async () => {
  const { buildScenePlayCompilationPlan } = await importPlayCompilationModule();
  const plan = buildScenePlayCompilationPlan({ protoAnimations: [] });

  assert.equal(plan.warningNoAnimations, true);
  assert.equal(plan.warningMessage, "Called Scene.play with no animations");
  assert.equal(plan.errorMessageSummary, "none");
  assert.equal(plan.pipelineEnabled, false);
  assert.deepEqual(plan.callOrder, []);
  assert.equal(plan.callOrderReady, false);
  assert.equal(plan.callOrderSummary, "none");
  assert.equal(plan.animationCount, 0);
  assert.equal(plan.maxRunTime, 0);
  assert.equal(
    plan.summary,
    "playCompilation:proto=0:prepared=0:updateRate=0:run=0.000:pipeline=none"
  );
});

test("buildScenePlayCompilationPlan reports invalid proto animations before playback", async () => {
  const { buildScenePlayCompilationPlan } = await importPlayCompilationModule();
  const plan = buildScenePlayCompilationPlan({
    protoAnimations: [
      { animationId: "bad-entry", kind: "invalid", objectId: "bad", runTime: 1 },
      { animationId: "curve-reveal", kind: "animation", objectId: "curve", runTime: 1 }
    ]
  });

  assert.equal(plan.invalidCount, 1);
  assert.equal(plan.animationCount, 1);
  assert.equal(plan.pipelineEnabled, false);
  assert.equal(
    plan.errorMessageSummary,
    "bad-entry:Object bad-entry cannot be converted to an animation"
  );
  assert.equal(plan.warningMessage, null);
  assert.equal(plan.rows[0].valid, false);
  assert.equal(plan.rows[0].errorMessage, "Object bad-entry cannot be converted to an animation");
  assert.equal(plan.rows[1].valid, true);
  assert.deepEqual(plan.preparedAnimationIds, ["curve-reveal"]);
});

test("scenePlayCompilationDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_PLAY_COMPILATION_PREPARE_POLICY,
    SCENE_PLAY_COMPILATION_SOURCE_CONTRACT,
    buildScenePlayCompilationPlan,
    scenePlayCompilationDataAttributes
  } = await importPlayCompilationModule();
  const plan = buildScenePlayCompilationPlan({
    protoAnimations: [{ animationId: "curve-builder", kind: "builder", objectId: "curve", runTime: 1 }],
    runTime: 1.25
  });

  assert.deepEqual(scenePlayCompilationDataAttributes(plan), {
    "data-viz-manim-play-compilation-animation-count": "1",
    "data-viz-manim-play-compilation-builder-count": "1",
    "data-viz-manim-play-compilation-call-order": "prepare_animation>update_rate_info>pre_play>begin_animations>progress_through_animations>finish_animations>post_play",
    "data-viz-manim-play-compilation-call-order-ready": "true",
    "data-viz-manim-play-compilation-error-summary": "none",
    "data-viz-manim-play-compilation-invalid-count": "0",
    "data-viz-manim-play-compilation-pipeline": "pre_play>begin_animations>progress_through_animations>finish_animations>post_play",
    "data-viz-manim-play-compilation-prepare-policy": SCENE_PLAY_COMPILATION_PREPARE_POLICY,
    "data-viz-manim-play-compilation-prepared-ids": "curve-builder",
    "data-viz-manim-play-compilation-proto-count": "1",
    "data-viz-manim-play-compilation-run-time": "1.250",
    "data-viz-manim-play-compilation-source-contract": SCENE_PLAY_COMPILATION_SOURCE_CONTRACT,
    "data-viz-manim-play-compilation-summary": plan.summary,
    "data-viz-manim-play-compilation-update-rate-count": "1",
    "data-viz-manim-play-compilation-warning-empty": "false",
    "data-viz-manim-play-compilation-warning-message": "none"
  });
});

test("serializeScenePlayCompilationPlan emits escaped deterministic browser JSON", async () => {
  const {
    buildScenePlayCompilationPlan,
    serializeScenePlayCompilationPlan
  } = await importPlayCompilationModule();
  const plan = buildScenePlayCompilationPlan({
    protoAnimations: [{ animationId: "<play-compilation>", kind: "builder", objectId: "curve", runTime: 1 }],
    runTime: 1.25
  });

  const serialized = serializeScenePlayCompilationPlan(plan);

  assert.equal(
    serializeScenePlayCompilationPlan(JSON.parse(JSON.stringify(plan)) as MathScenePlayCompilationPlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<play-compilation>|<\/script/i);
  assert.match(serialized, /\\u003cplay-compilation>/);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("Scene play compilation stays pure and documents the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathScenePlayCompilation.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /Scene\.play/);
  assert.match(source, /SCENE_PLAY_COMPILATION_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_PLAY_COMPILATION_PREPARE_POLICY/);
  assert.match(source, /prepare_animation/);
  assert.match(source, /_AnimationBuilder/);
  assert.match(source, /update_rate_info/);
  assert.match(source, /pre_play/);
  assert.match(source, /begin_animations/);
  assert.match(source, /progress_through_animations/);
  assert.match(source, /finish_animations/);
  assert.match(source, /post_play/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|\bdocument\b|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /\bwindow(?:\.|\[)/);
});
