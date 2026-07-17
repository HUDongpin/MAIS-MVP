import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  RATE_FUNCTION_ALPHA_POLICY,
  RATE_FUNCTION_SOURCE_CONTRACT,
  applyRateFunction,
  buildRateFunctionCatalog,
  rateFunctionCatalogDataAttributes,
  rateFunctionForStep,
  serializeRateFunctionCatalog
} from "./mathRateFunctions";
import { buildTimelineState, timelineObjectProgress } from "./mathTimeline";
import type { AnimationStep } from "./mathSceneTypes";

test("applies deterministic Manim-style rate functions with clamped alpha", () => {
  assert.equal(applyRateFunction("linear", 0.25), 0.25);
  assert.equal(applyRateFunction("smooth", 0), 0);
  assert.equal(applyRateFunction("smooth", 0.25), 0.15625);
  assert.equal(applyRateFunction("smooth", 0.5), 0.5);
  assert.equal(applyRateFunction("smooth", 0.75), 0.84375);
  assert.equal(applyRateFunction("smooth", 1), 1);
  assert.equal(applyRateFunction("smooth", Number.NaN), 0);
  assert.equal(applyRateFunction("smooth", 1.5), 1);
});

test("chooses rate functions by animation semantics", () => {
  const reveal: AnimationStep = { type: "revealCurve", objectId: "curve", duration: 2, easing: "smooth" };
  const motion: AnimationStep = { type: "moveAlongPath", objectId: "point", pathObjectId: "curve", duration: 3 };
  const transform: AnimationStep = { type: "transformObject", objectId: "curve", targetObjectId: "target", duration: 2 };
  const camera: AnimationStep = { type: "cameraTo", shotId: "detail", duration: 1 };

  assert.equal(rateFunctionForStep(reveal), "smooth");
  assert.equal(rateFunctionForStep(motion), "linear");
  assert.equal(rateFunctionForStep(transform), "smooth");
  assert.equal(rateFunctionForStep(camera), "smooth");
});

test("timeline exposes raw and eased local progress separately", () => {
  const timeline: AnimationStep[] = [
    { type: "revealCurve", objectId: "curve", duration: 2, easing: "smooth" }
  ];
  const state = buildTimelineState(timeline, 0.5);

  assert.equal(state.localProgress, 0.25);
  assert.equal(state.easedLocalProgress, 0.15625);
  assert.equal(state.rateFunction, "smooth");
});

test("object progress uses eased reveal and transform progress while preserving linear path motion", () => {
  const timeline: AnimationStep[] = [
    { type: "revealCurve", objectId: "curve", duration: 2, easing: "smooth" },
    { type: "moveAlongPath", objectId: "point", pathObjectId: "curve", duration: 2 },
    { type: "transformObject", objectId: "morph", targetObjectId: "target", duration: 2 }
  ];

  assert.equal(timelineObjectProgress(timeline, 0.5, "curve"), 0.15625);
  assert.equal(timelineObjectProgress(timeline, 2.5, "point"), 0.25);
  assert.equal(timelineObjectProgress(timeline, 4.5, "morph"), 0.15625);
});

test("summarizes scene-level rate-function timing for browser QA", () => {
  const timeline: AnimationStep[] = [
    { type: "revealCurve", objectId: "curve", duration: 2, easing: "smooth" },
    { type: "moveAlongPath", objectId: "point", pathObjectId: "curve", duration: 3 },
    { type: "cameraTo", shotId: "detail", duration: 1 },
    { type: "wait", duration: 0.5 },
    { type: "animateTracker", trackerId: "parameter:value", targetValue: 8, duration: 1.2, easing: "linear" },
    { type: "fadeInObject", objectId: "label", duration: 0.8, easing: "smooth" }
  ];
  const catalog = buildRateFunctionCatalog({ sceneId: "rate-test", timeline });
  const attributes = rateFunctionCatalogDataAttributes(catalog);

  assert.equal(catalog.stepCount, 6);
  assert.equal(catalog.linearStepCount, 3);
  assert.equal(catalog.smoothStepCount, 3);
  assert.equal(catalog.linearDuration, 4.7);
  assert.equal(catalog.smoothDuration, 3.8);
  assert.equal(catalog.rateFunctionIds, "linear,smooth");
  assert.equal(catalog.stepTypes, "revealCurve,moveAlongPath,cameraTo,wait,animateTracker,fadeInObject");
  assert.equal(catalog.sourceContract, RATE_FUNCTION_SOURCE_CONTRACT);
  assert.equal(catalog.alphaPolicy, RATE_FUNCTION_ALPHA_POLICY);
  assert.equal(
    catalog.summary,
    "rateFunctions:rate-test:steps=6:linear=3/4.700:smooth=3/3.800:ids=linear,smooth:types=revealCurve,moveAlongPath,cameraTo,wait,animateTracker,fadeInObject"
  );
  assert.equal(attributes["data-viz-manim-rate-function-step-count"], "6");
  assert.equal(attributes["data-viz-manim-rate-function-linear-count"], "3");
  assert.equal(attributes["data-viz-manim-rate-function-smooth-count"], "3");
  assert.equal(attributes["data-viz-manim-rate-function-linear-duration"], "4.700");
  assert.equal(attributes["data-viz-manim-rate-function-smooth-duration"], "3.800");
  assert.equal(attributes["data-viz-manim-rate-function-ids"], "linear,smooth");
  assert.equal(attributes["data-viz-manim-rate-function-step-types"], catalog.stepTypes);
  assert.equal(attributes["data-viz-manim-rate-function-source-contract"], RATE_FUNCTION_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-rate-function-alpha-policy"], RATE_FUNCTION_ALPHA_POLICY);
  assert.equal(attributes["data-viz-manim-rate-function-summary"], catalog.summary);

  const json = serializeRateFunctionCatalog(catalog);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    alphaPolicy: RATE_FUNCTION_ALPHA_POLICY,
    entries: [
      { duration: 2, rateFunction: "smooth", stepIndex: 0, stepType: "revealCurve" },
      { duration: 3, rateFunction: "linear", stepIndex: 1, stepType: "moveAlongPath" },
      { duration: 1, rateFunction: "smooth", stepIndex: 2, stepType: "cameraTo" },
      { duration: 0.5, rateFunction: "linear", stepIndex: 3, stepType: "wait" },
      { duration: 1.2, rateFunction: "linear", stepIndex: 4, stepType: "animateTracker" },
      { duration: 0.8, rateFunction: "smooth", stepIndex: 5, stepType: "fadeInObject" }
    ],
    linearDuration: 4.7,
    linearStepCount: 3,
    rateFunctionIds: "linear,smooth",
    sceneId: "rate-test",
    smoothDuration: 3.8,
    smoothStepCount: 3,
    sourceContract: RATE_FUNCTION_SOURCE_CONTRACT,
    stepCount: 6,
    stepTypes: "revealCurve,moveAlongPath,cameraTo,wait,animateTracker,fadeInObject",
    summary:
      "rateFunctions:rate-test:steps=6:linear=3/4.700:smooth=3/3.800:ids=linear,smooth:types=revealCurve,moveAlongPath,cameraTo,wait,animateTracker,fadeInObject"
  });
});

test("timeline imports the pure rate function module without renderer dependencies", () => {
  const rateSource = fs.readFileSync("components/visualizations/three/manim/mathRateFunctions.ts", "utf8");
  const timelineSource = fs.readFileSync("components/visualizations/three/manim/mathTimeline.ts", "utf8");

  assert.match(rateSource, /applyRateFunction/);
  assert.match(rateSource, /rateFunctionForStep/);
  assert.match(rateSource, /RATE_FUNCTION_SOURCE_CONTRACT/);
  assert.match(rateSource, /RATE_FUNCTION_ALPHA_POLICY/);
  assert.match(rateSource, /serializeRateFunctionCatalog/);
  assert.match(timelineSource, /applyRateFunction/);
  assert.match(timelineSource, /easedLocalProgress/);
  assert.doesNotMatch(rateSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
