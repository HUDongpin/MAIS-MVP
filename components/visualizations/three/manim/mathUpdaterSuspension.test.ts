import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  UPDATER_SUSPENSION_POLICY,
  UPDATER_SUSPENSION_SOURCE_CONTRACT,
  buildUpdaterSuspensionPlan,
  serializeUpdaterSuspensionPlan
} from "./mathUpdaterSuspension";

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

function elapsedAtMidpointOfComposition(compositionId: string) {
  assert.ok(functionGraphSpec);
  let elapsed = 0;

  for (const step of functionGraphSpec.timeline) {
    if (step.type === "animationComposition" && step.compositionId === compositionId) return elapsed + step.duration / 2;
    elapsed += Math.max(0, step.duration);
  }

  throw new Error(`missing animationComposition step for ${compositionId}`);
}

test("suspends descendant updaters while a curve reveal owns the Mobject family", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0.5);
  const plan = buildUpdaterSuspensionPlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    timeline: runtimeState.timeline,
    updaters: runtimeState.updaters
  });

  assert.equal(plan.phase, "animation");
  assert.deepEqual(plan.animatedObjectIds, ["function-curve"]);
  assert.deepEqual(plan.activeUpdaterIds, ["function-curve:reveal"]);
  assert.deepEqual(plan.suspendedObjectIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.suspendedUpdaterIds, ["function-curve:always-redraw", "moving-probe:move", "probe-trace:trace"]);
  assert.deepEqual(plan.reasonByUpdaterId["function-curve:always-redraw"], "suspended-by-revealCurve");
  assert.deepEqual(plan.reasonByUpdaterId["moving-probe:move"], "suspended-by-revealCurve");
  assert.equal(plan.sourceContract, UPDATER_SUSPENSION_SOURCE_CONTRACT);
  assert.equal(plan.suspensionPolicy, UPDATER_SUSPENSION_POLICY);
});

test("animationComposition beats suspend child animation plan families", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(
    functionGraphSpec,
    elapsedAtMidpointOfComposition("function-attention-lagged-start")
  );
  const plan = buildUpdaterSuspensionPlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    scene: functionGraphSpec,
    timeline: runtimeState.timeline,
    updaters: runtimeState.updaters
  });

  assert.equal(runtimeState.timeline.activeStep?.type, "animationComposition");
  assert.equal(plan.phase, "animation");
  assert.deepEqual(plan.animatedObjectIds, ["function-curve", "moving-probe"]);
  assert.deepEqual(plan.activeUpdaterIds, []);
  assert.deepEqual(plan.suspendedObjectIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.suspendedUpdaterIds, [
    "function-curve:always-redraw",
    "function-curve:reveal",
    "moving-probe:move",
    "probe-trace:trace"
  ]);
  assert.equal(
    plan.reasonByUpdaterId["moving-probe:move"],
    "suspended-by-animationComposition:function-attention-lagged-start"
  );
});

test("allows moving point and trace updaters during moveAlongPath beats", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 3.5);
  const plan = buildUpdaterSuspensionPlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    timeline: runtimeState.timeline,
    updaters: runtimeState.updaters
  });

  assert.equal(plan.phase, "animation");
  assert.deepEqual(plan.animatedObjectIds, ["moving-probe"]);
  assert.deepEqual(plan.suspendedObjectIds, []);
  assert.deepEqual(plan.suspendedUpdaterIds, []);
  assert.deepEqual(plan.activeUpdaterIds.sort(), [
    "function-curve:always-redraw",
    "function-curve:reveal",
    "moving-probe:move",
    "probe-trace:trace"
  ]);
});

test("transformObject beats suspend all updaters on the transformed family", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
      worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 3, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      { type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "curve" },
      { type: "movingPoint", id: "point", pathObjectId: "curve", colorRole: "probe", conceptId: "point" },
      { type: "trace", id: "tail", sourceObjectId: "point", durationSeconds: 1, colorRole: "trace" }
    ],
    sceneId: "updater-transform-test",
    timeline: [{ type: "transformObject", objectId: "curve", targetObjectId: "target-curve", duration: 2 }]
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 1);
  const plan = buildUpdaterSuspensionPlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    timeline: runtimeState.timeline,
    updaters: runtimeState.updaters
  });

  assert.deepEqual(plan.animatedObjectIds, ["curve"]);
  assert.deepEqual(plan.suspendedObjectIds, ["curve", "point", "tail"]);
  assert.deepEqual(plan.activeUpdaterIds, []);
  assert.deepEqual(plan.suspendedUpdaterIds, ["curve:reveal", "point:move", "tail:trace"]);
});

test("FadeIn, FadeOut, and GrowFromCenter beats suspend ordinary updaters on the owned family", () => {
  assert.ok(functionGraphSpec);
  const scene: MathSceneSpec = {
    ...functionGraphSpec,
    timeline: [{ type: "fadeOutObject", objectId: "function-curve", duration: 2, easing: "linear" }]
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 1);
  const plan = buildUpdaterSuspensionPlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    timeline: runtimeState.timeline,
    updaters: runtimeState.updaters
  });

  assert.equal(plan.phase, "animation");
  assert.deepEqual(plan.animatedObjectIds, ["function-curve"]);
  assert.deepEqual(plan.activeUpdaterIds, []);
  assert.deepEqual(plan.suspendedObjectIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.suspendedUpdaterIds, [
    "function-curve:always-redraw",
    "function-curve:reveal",
    "moving-probe:move",
    "probe-trace:trace"
  ]);
  assert.equal(plan.reasonByUpdaterId["function-curve:reveal"], "suspended-by-fadeOutObject");
});

test("wait, highlight, and camera beats resume ordinary updaters", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 6.5);
  const plan = buildUpdaterSuspensionPlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    timeline: runtimeState.timeline,
    updaters: runtimeState.updaters
  });

  assert.equal(plan.phase, "open");
  assert.deepEqual(plan.suspendedObjectIds, []);
  assert.deepEqual(plan.suspendedUpdaterIds, []);
  assert.equal(plan.activeUpdaterIds.length, runtimeState.updaters.entries.length);
});

test("serializes updater suspension plans as deterministic script-safe browser QA JSON", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0.5);
  const plan = buildUpdaterSuspensionPlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    scene: functionGraphSpec,
    timeline: runtimeState.timeline,
    updaters: {
      ...runtimeState.updaters,
      entries: runtimeState.updaters.entries.map((entry) =>
        entry.id === "moving-probe:move" ? { ...entry, id: "moving-probe</script>:move" } : entry
      )
    }
  });
  const json = serializeUpdaterSuspensionPlan(plan);

  assert.equal(json, serializeUpdaterSuspensionPlan(plan));
  assert.doesNotMatch(json, /<|<\/script>/i);

  const parsed = JSON.parse(json) as typeof plan;
  assert.equal(parsed.sourceContract, UPDATER_SUSPENSION_SOURCE_CONTRACT);
  assert.equal(parsed.suspensionPolicy, UPDATER_SUSPENSION_POLICY);
  assert.equal(parsed.phase, "animation");
  assert.deepEqual(parsed.animatedObjectIds, ["function-curve"]);
  assert.deepEqual(parsed.suspendedUpdaterIds, [
    "function-curve:always-redraw",
    "moving-probe</script>:move",
    "probe-trace:trace"
  ]);
  assert.equal(parsed.reasonByUpdaterId["moving-probe</script>:move"], "suspended-by-revealCurve");
});

test("MathUpdaterSuspension stays pure and independent of renderer modules", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathUpdaterSuspension.ts", "utf8");
  const registrySource = fs.readFileSync("components/visualizations/three/manim/mathUpdaterRegistry.ts", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /scene\?: MathSceneSpec/);
  assert.match(source, /animationComposition/);
  assert.match(source, /UPDATER_SUSPENSION_SOURCE_CONTRACT/);
  assert.match(source, /UPDATER_SUSPENSION_POLICY/);
  assert.match(source, /serializeUpdaterSuspensionPlan/);
  assert.equal(
    UPDATER_SUSPENSION_SOURCE_CONTRACT,
    "Animation.begin may suspend mobject updating for animated families until finish"
  );
  assert.equal(UPDATER_SUSPENSION_POLICY, "animated-family-updaters-suspended-during-animation");
  assert.match(registrySource, /scene: stateScene/);
  assert.match(evidenceSource, /scene,/);
});
