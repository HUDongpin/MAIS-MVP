import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createMathAnimateBuilder } from "./mathAnimationBuilder";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";

const transformBeginModulePath = "components/visualizations/three/manim/mathTransformBeginPlan.ts";

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

async function loadTransformBeginModule() {
  assert.ok(
    fs.existsSync(transformBeginModulePath),
    "MAIS Manim should provide a pure Transform.begin alignment/data-lock module"
  );
  return await import("./mathTransformBeginPlan") as typeof import("./mathTransformBeginPlan") & {
    TRANSFORM_BEGIN_SOURCE_POLICY: string;
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

test("builds a Transform.begin payload with family alignment and locked data evidence", async () => {
  const { buildMathTransformBeginPlan, summarizeMathTransformBeginPlan } = await loadTransformBeginModule();
  const { plan, runtimeState, scene } = buildTransformScene();
  const beginPlan = buildMathTransformBeginPlan(scene, runtimeState, plan);

  assert.equal(beginPlan.animationPlanId, "function-curve:animate-target");
  assert.equal(beginPlan.objectId, "function-curve");
  assert.equal(beginPlan.targetObjectId, "function-curve:animate-target");
  assert.equal(
    beginPlan.sourcePolicy,
    "transform-begin-creates-target-aligns-source-target-family-and-locks-matching-render-data"
  );
  assert.equal(beginPlan.targetCreated, true);
  assert.deepEqual(beginPlan.sourceFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(beginPlan.targetFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);

  assert.equal(beginPlan.alignment.entryCount, 3);
  assert.equal(beginPlan.alignment.matchedCount, 3);
  assert.equal(beginPlan.alignment.alignedPointPairCount, beginPlan.dataLocks.totalPointCount);
  assert.equal(beginPlan.alignment.enteringCount, 0);
  assert.equal(beginPlan.alignment.exitingCount, 0);
  assert.equal(beginPlan.alignment.typeMismatchCount, 0);
  assert.equal(beginPlan.alignment.maxDepth, 2);
  assert.deepEqual(beginPlan.alignment.familyPairIds, [
    "function-curve->function-curve",
    "moving-probe->moving-probe",
    "probe-trace->probe-trace"
  ]);
  assert.equal(
    beginPlan.alignment.familyPairSummary,
    "function-curve->function-curve|moving-probe->moving-probe|probe-trace->probe-trace"
  );

  assert.equal(beginPlan.dataLocks.entryCount, 3);
  assert.equal(beginPlan.dataLocks.kindSummary, "curve=2,point=1");
  assert.equal(
    beginPlan.dataLocks.alignmentSummary,
    "runtime-polyline-align:source=0:target=0:aligned=0:strategy=arc-length,runtime-polyline-align:source=72:target=72:aligned=72:strategy=arc-length"
  );
  assert.equal(
    beginPlan.dataLocks.lockSummary,
    "function-curve->function-curve:curve;locked=0;moving=72;indices=none|moving-probe->moving-probe:point;locked=0;moving=1;indices=none|probe-trace->probe-trace:curve;locked=0;moving=0;indices=none"
  );
  assert.equal(beginPlan.dataLocks.lockedPointCount, 0);
  assert.ok(beginPlan.dataLocks.movingPointCount > 70);
  assert.equal(beginPlan.dataLocks.totalPointCount, beginPlan.dataLocks.movingPointCount);
  assert.deepEqual(beginPlan.dataLocks.lockedObjectIds, []);
  assert.deepEqual(beginPlan.dataLocks.movingObjectIds, ["function-curve", "moving-probe"]);

  assert.equal(
    summarizeMathTransformBeginPlan(beginPlan),
    `transform-begin:plan=function-curve:animate-target:object=function-curve:target=function-curve:animate-target:aligned=3:matched=3:pairs=3:pointPairs=${beginPlan.alignment.alignedPointPairCount}:locked=0:moving=${beginPlan.dataLocks.movingPointCount}`
  );
  assert.match(beginPlan.signature, /^transform-begin-[0-9a-f]{8}$/);
});

test("reports source family ids from the runtime Mobject family instead of the generated target family", async () => {
  const { buildMathTransformBeginPlan } = await loadTransformBeginModule();
  const { plan, runtimeState, scene } = buildTransformScene();
  const renamedTargetPlan = {
    ...plan,
    target: {
      ...plan.target,
      familyIds: plan.target.familyIds.map((familyId) => `target-${familyId}`)
    }
  };

  const beginPlan = buildMathTransformBeginPlan(scene, runtimeState, renamedTargetPlan);

  assert.deepEqual(beginPlan.sourceFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(beginPlan.targetFamilyIds, [
    "target-function-curve",
    "target-moving-probe",
    "target-probe-trace"
  ]);
});

test("serializes Transform.begin payloads and maps them to browser QA attributes", async () => {
  const {
    buildMathTransformBeginPlan,
    serializeMathTransformBeginPlan,
    summarizeMathTransformBeginPlan,
    transformBeginPlanDataAttributes
  } = await loadTransformBeginModule();
  const { plan, runtimeState, scene } = buildTransformScene();
  const beginPlan = buildMathTransformBeginPlan(scene, runtimeState, plan);
  const serialized = serializeMathTransformBeginPlan(beginPlan);
  const attributes = transformBeginPlanDataAttributes(beginPlan);

  assert.doesNotMatch(serialized, /</);
  assert.match(serialized, /"animationPlanId":"function-curve:animate-target"/);
  assert.match(serialized, /"targetCreated":true/);
  assert.deepEqual(attributes, {
    "data-viz-manim-transform-begin-aligned-entry-count": "3",
    "data-viz-manim-transform-begin-aligned-point-pair-count": String(beginPlan.alignment.alignedPointPairCount),
    "data-viz-manim-transform-begin-data-lock-count": "3",
    "data-viz-manim-transform-begin-data-lock-alignment-summary":
      "runtime-polyline-align:source=0:target=0:aligned=0:strategy=arc-length,runtime-polyline-align:source=72:target=72:aligned=72:strategy=arc-length",
    "data-viz-manim-transform-begin-data-lock-kind-summary": "curve=2,point=1",
    "data-viz-manim-transform-begin-data-lock-summary":
      "function-curve->function-curve:curve;locked=0;moving=72;indices=none|moving-probe->moving-probe:point;locked=0;moving=1;indices=none|probe-trace->probe-trace:curve;locked=0;moving=0;indices=none",
    "data-viz-manim-transform-begin-entering-count": "0",
    "data-viz-manim-transform-begin-exiting-count": "0",
    "data-viz-manim-transform-begin-family-pair-ids": "function-curve->function-curve,moving-probe->moving-probe,probe-trace->probe-trace",
    "data-viz-manim-transform-begin-family-pair-summary":
      "function-curve->function-curve|moving-probe->moving-probe|probe-trace->probe-trace",
    "data-viz-manim-transform-begin-locked-object-ids": "none",
    "data-viz-manim-transform-begin-locked-point-count": "0",
    "data-viz-manim-transform-begin-matched-count": "3",
    "data-viz-manim-transform-begin-max-depth": "2",
    "data-viz-manim-transform-begin-moving-object-ids": "function-curve,moving-probe",
    "data-viz-manim-transform-begin-moving-point-count": String(beginPlan.dataLocks.movingPointCount),
    "data-viz-manim-transform-begin-object-id": "function-curve",
    "data-viz-manim-transform-begin-plan-id": "function-curve:animate-target",
    "data-viz-manim-transform-begin-signature": beginPlan.signature,
    "data-viz-manim-transform-begin-source-family-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-manim-transform-begin-source-policy":
      "transform-begin-creates-target-aligns-source-target-family-and-locks-matching-render-data",
    "data-viz-manim-transform-begin-summary": summarizeMathTransformBeginPlan(beginPlan),
    "data-viz-manim-transform-begin-target-created": "true",
    "data-viz-manim-transform-begin-target-family-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-manim-transform-begin-target-id": "function-curve:animate-target",
    "data-viz-manim-transform-begin-total-point-count": String(beginPlan.dataLocks.totalPointCount),
    "data-viz-manim-transform-begin-type-mismatch-count": "0"
  });
});

test("Transform.begin planning stays pure and reuses alignment plus data-lock helpers", async () => {
  const { TRANSFORM_BEGIN_SOURCE_POLICY } = await loadTransformBeginModule();
  const source = fs.readFileSync(transformBeginModulePath, "utf8");
  const dataLockSource = fs.readFileSync("components/visualizations/three/manim/mathTransformDataLock.ts", "utf8");

  assert.equal(
    TRANSFORM_BEGIN_SOURCE_POLICY,
    "transform-begin-creates-target-aligns-source-target-family-and-locks-matching-render-data"
  );
  assert.match(source, /TRANSFORM_BEGIN_SOURCE_POLICY/);
  assert.match(source, /buildTransformFamilyAlignment/);
  assert.match(source, /summarizeTransformFamilyAlignment/);
  assert.match(source, /buildRuntimeTransformDataLockPlan/);
  assert.match(source, /becomeMobjectState/);
  assert.match(dataLockSource, /buildRuntimeTransformDataLockPlan/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
