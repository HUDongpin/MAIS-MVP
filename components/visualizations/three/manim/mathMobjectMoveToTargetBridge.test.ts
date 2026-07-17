import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

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

function runtimeGraph() {
  assert.ok(functionGraphSpec);
  return buildMathSceneRuntimeState(functionGraphSpec, 0).objectGraph;
}

test("builds a Manim MoveToTarget bridge plan that applies generated target data to the source family", async () => {
  const {
    MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT,
    buildMobjectMoveToTargetBridgePlan,
    summarizeMobjectMoveToTargetBridgePlan
  } = await import("./mathMobjectMoveToTargetBridge");

  const plan = buildMobjectMoveToTargetBridgePlan({
    graph: runtimeGraph(),
    objectId: "function-curve",
    targetOffset: [0.5, -0.25, 0]
  });

  assert.equal(
    plan.sourceContract,
    "Mobject.generate_target|MoveToTarget|become: generate a target state, apply it into an existing mobject family, and preserve source identity"
  );
  assert.equal(plan.sourceContract, MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.objectId, "function-curve");
  assert.equal(plan.targetId, "function-curve:target");
  assert.deepEqual(plan.sourceFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.targetFamilyIds, plan.sourceFamilyIds);
  assert.deepEqual(plan.afterFamilyIds, plan.sourceFamilyIds);
  assert.equal(plan.sourceNodeCount, 3);
  assert.equal(plan.targetNodeCount, 3);
  assert.equal(plan.appliedNodeCount, 3);
  assert.ok(plan.targetPointCount > plan.targetNodeCount);
  assert.equal(plan.targetGenerated, true);
  assert.equal(plan.becomeApplied, true);
  assert.equal(plan.identityPreserved, true);
  assert.equal(plan.familyPreserved, true);
  assert.equal(plan.renderStateChanged, true);
  assert.match(plan.sourceSignature, /^mobject-move-to-target-/);
  assert.match(plan.targetSignature, /^mobject-move-to-target-/);
  assert.match(plan.afterSignature, /^mobject-move-to-target-/);
  assert.notEqual(plan.sourceSignature, plan.targetSignature);
  assert.equal(plan.targetSignature, plan.afterSignature);
  assert.equal(plan.summary, summarizeMobjectMoveToTargetBridgePlan(plan));
  assert.equal(
    plan.summary,
    `mobject-move-to-target:function-curve:target=function-curve:target:nodes=3:points=${plan.targetPointCount}:changed=true:become=true:identity=true`
  );
});

test("serializes MoveToTarget bridge evidence into stable QA attributes", async () => {
  const {
    buildMobjectMoveToTargetBridgePlan,
    mobjectMoveToTargetBridgeDataAttributes,
    serializeMobjectMoveToTargetBridgePlan
  } = await import("./mathMobjectMoveToTargetBridge");

  const plan = buildMobjectMoveToTargetBridgePlan({
    graph: runtimeGraph(),
    objectId: "function-curve"
  });
  const attributes = mobjectMoveToTargetBridgeDataAttributes(plan);
  const serialized = serializeMobjectMoveToTargetBridgePlan(plan);

  assert.equal(attributes["data-viz-mobject-move-to-target-object-id"], "function-curve");
  assert.equal(attributes["data-viz-mobject-move-to-target-target-id"], "function-curve:target");
  assert.equal(attributes["data-viz-mobject-move-to-target-source-family-ids"], "function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-mobject-move-to-target-target-node-count"], "3");
  assert.equal(attributes["data-viz-mobject-move-to-target-become-applied"], "true");
  assert.equal(attributes["data-viz-mobject-move-to-target-identity-preserved"], "true");
  assert.equal(attributes["data-viz-mobject-move-to-target-family-preserved"], "true");
  assert.equal(attributes["data-viz-mobject-move-to-target-render-state-changed"], "true");
  assert.equal(attributes["data-viz-mobject-move-to-target-source-contract"], plan.sourceContract);
  assert.equal(attributes["data-viz-mobject-move-to-target-summary"], plan.summary);
  assert.match(serialized, /"targetId":"function-curve:target"/);
  assert.doesNotMatch(serialized, /</);
});

test("documents that the MoveToTarget bridge is backed by generate_target and become", () => {
  const source = fs.readFileSync(
    "components/visualizations/three/manim/mathMobjectMoveToTargetBridge.ts",
    "utf8"
  );

  assert.match(source, /MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT/);
  assert.match(source, /generateMobjectTarget/);
  assert.match(source, /becomeMobjectState/);
});
