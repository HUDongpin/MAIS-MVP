import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createMathAnimateBuilder } from "./mathAnimationBuilder";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";

const lifecycleModulePath = "components/visualizations/three/manim/mathAnimationLifecycle.ts";

const functionGraphSpec = buildMathSceneSpecForThreeDFamily({
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

async function loadLifecycleModule() {
  assert.ok(
    fs.existsSync(lifecycleModulePath),
    "MAIS Manim should provide a pure Animation.begin/finish lifecycle module"
  );
  return await import("./mathAnimationLifecycle") as typeof import("./mathAnimationLifecycle") & {
    ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY: string;
    ANIMATION_LIFECYCLE_SOURCE_CONTRACT: string;
  };
}

function buildTransformScene(delta: Vec3 = [1, -0.5, 0.25], duration = 2) {
  assert.ok(functionGraphSpec);
  const sourceState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "function-curve")
    .shift(delta)
    .setColorRole("attention")
    .build({ duration });
  const scene: MathSceneSpec = {
    ...functionGraphSpec,
    timeline: [plan.step]
  };

  return {
    plan,
    runtimeState: buildMathSceneRuntimeState(scene, 0),
    scene
  };
}

test("builds a deterministic Animation.begin/finish lifecycle payload for a transform plan", async () => {
  const {
    ANIMATION_LIFECYCLE_SOURCE_CONTRACT,
    buildMathAnimationLifecyclePlan,
    summarizeMathAnimationLifecyclePlan
  } = await loadLifecycleModule();
  const { plan, runtimeState, scene } = buildTransformScene();
  const lifecycle = buildMathAnimationLifecyclePlan(scene, runtimeState, plan);

  assert.equal(lifecycle.animationPlanId, "function-curve:animate-target");
  assert.equal(lifecycle.sourceContract, ANIMATION_LIFECYCLE_SOURCE_CONTRACT);
  assert.match(ANIMATION_LIFECYCLE_SOURCE_CONTRACT, /Animation\.begin/);
  assert.match(ANIMATION_LIFECYCLE_SOURCE_CONTRACT, /interpolate\(0\)/);
  assert.match(ANIMATION_LIFECYCLE_SOURCE_CONTRACT, /finish_animations/);
  assert.equal(lifecycle.objectId, "function-curve");
  assert.equal(lifecycle.targetObjectId, "function-curve:animate-target");
  assert.deepEqual(lifecycle.sourceFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(lifecycle.targetFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.equal(lifecycle.familyTupleCount, 3);
  assert.deepEqual(lifecycle.timing, {
    frameCountAt60Fps: 120,
    lagRatio: 0,
    rateFunction: "smooth",
    runTimeSeconds: 2,
    sampleAlphas: [0, 0.5, 1]
  });

  assert.equal(lifecycle.begin.snapshotNodeCount, 3);
  assert.equal(lifecycle.begin.animatingStatus, "started");
  assert.equal(lifecycle.begin.copiedNodeCount, 3);
  assert.equal(lifecycle.begin.copyRootId, "function-curve:animation-begin-copy");
  assert.equal(
    lifecycle.begin.sourcePolicy,
    "animation-begin-copies-starting-mobject-suspends-updaters-gathers-family-tuples-and-interpolates-zero"
  );
  assert.equal(lifecycle.begin.initialInterpolationAlpha, 0);
  assert.equal(lifecycle.begin.initialInterpolationCallCount, 1);
  assert.equal(lifecycle.begin.startsAtProgress, 0);
  assert.equal(lifecycle.begin.updaterSuspensionPhase, "animation");
  assert.deepEqual(lifecycle.begin.suspendedUpdaterIds, [
    "function-curve:always-redraw",
    "function-curve:reveal",
    "moving-probe:move",
    "probe-trace:trace"
  ]);

  assert.equal(lifecycle.finish.targetNodeCount, 3);
  assert.equal(lifecycle.finish.animatingStatus, "finished");
  assert.equal(lifecycle.finish.finalInterpolationAlpha, 1);
  assert.equal(lifecycle.finish.finalInterpolationCallCount, 1);
  assert.equal(lifecycle.finish.persistentNodeCount, 3);
  assert.equal(lifecycle.finish.renderDataNodeCount, 2);
  assert.equal(lifecycle.finish.colorRoleCount, 3);
  assert.equal(lifecycle.finish.finishesAtProgress, 1);
  assert.deepEqual(lifecycle.finish.persistentObjectIds, ["function-curve", "moving-probe", "probe-trace"]);

  assert.equal(
    summarizeMathAnimationLifecyclePlan(lifecycle),
    "animation-lifecycle:plan=function-curve:animate-target:object=function-curve:target=function-curve:animate-target:familyTuples=3:begin=3:finish=3:suspended=4:timing=2.000:smooth:lag=0.000:frames=120"
  );
  assert.match(lifecycle.signature, /^animation-lifecycle-[0-9a-f]{8}$/);
});

test("serializes lifecycle payloads and maps them to browser QA attributes", async () => {
  const {
    animationLifecycleDataAttributes,
    buildMathAnimationLifecyclePlan,
    serializeMathAnimationLifecyclePlan,
    summarizeMathAnimationLifecyclePlan
  } = await loadLifecycleModule();
  const { plan, runtimeState, scene } = buildTransformScene();
  const lifecycle = buildMathAnimationLifecyclePlan(scene, runtimeState, plan);
  const serialized = serializeMathAnimationLifecyclePlan(lifecycle);
  const attributes = animationLifecycleDataAttributes(lifecycle);

  assert.doesNotMatch(serialized, /</);
  assert.match(serialized, /"animationPlanId":"function-curve:animate-target"/);
  assert.match(serialized, /"updaterSuspensionPhase":"animation"/);
  assert.deepEqual(attributes, {
    "data-viz-manim-animation-lifecycle-animating-status": "started",
    "data-viz-manim-animation-lifecycle-begin-node-count": "3",
    "data-viz-manim-animation-lifecycle-begin-source-policy":
      "animation-begin-copies-starting-mobject-suspends-updaters-gathers-family-tuples-and-interpolates-zero",
    "data-viz-manim-animation-lifecycle-copied-node-count": "3",
    "data-viz-manim-animation-lifecycle-family-tuple-count": "3",
    "data-viz-manim-animation-lifecycle-final-alpha": "1.000",
    "data-viz-manim-animation-lifecycle-final-interpolate-count": "1",
    "data-viz-manim-animation-lifecycle-finish-animating-status": "finished",
    "data-viz-manim-animation-lifecycle-finish-color-role-count": "3",
    "data-viz-manim-animation-lifecycle-finish-node-count": "3",
    "data-viz-manim-animation-lifecycle-initial-alpha": "0.000",
    "data-viz-manim-animation-lifecycle-initial-interpolate-count": "1",
    "data-viz-manim-animation-lifecycle-object-id": "function-curve",
    "data-viz-manim-animation-lifecycle-persistent-node-count": "3",
    "data-viz-manim-animation-lifecycle-plan-id": "function-curve:animate-target",
    "data-viz-manim-animation-lifecycle-signature": lifecycle.signature,
    "data-viz-manim-animation-lifecycle-source-contract": lifecycle.sourceContract,
    "data-viz-manim-animation-lifecycle-summary": summarizeMathAnimationLifecyclePlan(lifecycle),
    "data-viz-manim-animation-lifecycle-suspended-updater-count": "4",
    "data-viz-manim-animation-lifecycle-timing-frame-count": "120",
    "data-viz-manim-animation-lifecycle-timing-lag-ratio": "0.000",
    "data-viz-manim-animation-lifecycle-timing-rate-function": "smooth",
    "data-viz-manim-animation-lifecycle-timing-run-time": "2.000",
    "data-viz-manim-animation-lifecycle-target-id": "function-curve:animate-target"
  });
});

test("lifecycle timing payload preserves authored run time, rate function, and lag ratio", async () => {
  const { buildMathAnimationLifecyclePlan, summarizeMathAnimationLifecyclePlan } = await loadLifecycleModule();
  const { plan, runtimeState, scene } = buildTransformScene([0.5, 0.25, 0], 3.5);
  plan.step.lagRatio = 0.4;
  const lifecycle = buildMathAnimationLifecyclePlan(scene, runtimeState, plan);

  assert.deepEqual(lifecycle.timing, {
    frameCountAt60Fps: 210,
    lagRatio: 0.4,
    rateFunction: "smooth",
    runTimeSeconds: 3.5,
    sampleAlphas: [0, 0.5, 1]
  });
  assert.match(
    summarizeMathAnimationLifecyclePlan(lifecycle),
    /timing=3\.500:smooth:lag=0\.400:frames=210/
  );
});

test("Animation lifecycle planning stays pure and renderer-independent", async () => {
  const { ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY, ANIMATION_LIFECYCLE_SOURCE_CONTRACT } = await loadLifecycleModule();
  const source = fs.readFileSync(lifecycleModulePath, "utf8");

  assert.equal(
    ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY,
    "animation-begin-copies-starting-mobject-suspends-updaters-gathers-family-tuples-and-interpolates-zero"
  );
  assert.match(ANIMATION_LIFECYCLE_SOURCE_CONTRACT, /Animation\.begin/);
  assert.match(source, /ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY/);
  assert.match(source, /ANIMATION_LIFECYCLE_SOURCE_CONTRACT/);
  assert.match(source, /buildUpdaterSuspensionPlan/);
  assert.match(source, /saveMobjectState/);
  assert.match(source, /becomeMobjectState/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
