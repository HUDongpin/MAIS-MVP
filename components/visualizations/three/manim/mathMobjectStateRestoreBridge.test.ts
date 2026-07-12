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

test("builds a Manim Mobject.save_state/restore bridge plan for one object family", async () => {
  const {
    MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT,
    buildMobjectStateRestoreBridgePlan,
    summarizeMobjectStateRestoreBridgePlan
  } = await import("./mathMobjectStateRestoreBridge");

  const plan = buildMobjectStateRestoreBridgePlan({
    graph: runtimeGraph(),
    objectId: "function-curve"
  });

  assert.equal(
    plan.sourceContract,
    "Mobject.save_state/restore: capture a mobject family state snapshot and restore render data while preserving object identity and family membership"
  );
  assert.equal(plan.sourceContract, MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT);
  assert.equal(plan.objectId, "function-curve");
  assert.deepEqual(plan.savedFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.beforeFamilyIds, plan.savedFamilyIds);
  assert.deepEqual(plan.afterFamilyIds, plan.savedFamilyIds);
  assert.equal(plan.savedNodeCount, 3);
  assert.ok(plan.savedPointCount > 10);
  assert.equal(plan.restored, true);
  assert.equal(plan.restoreMismatchCount, 0);
  assert.equal(plan.identityPreserved, true);
  assert.equal(plan.familyPreserved, true);
  assert.match(plan.savedSignature, /^mobject-state-restore-/);
  assert.match(plan.currentSignature, /^mobject-state-restore-/);
  assert.match(plan.restoredSignature, /^mobject-state-restore-/);
  assert.equal(plan.summary, summarizeMobjectStateRestoreBridgePlan(plan));
  assert.equal(
    plan.summary,
    `mobject-state-restore:function-curve:family=3:points=${plan.savedPointCount}:restored=true:mismatch=0:identity=true`
  );
});

test("serializes Mobject state restore bridge evidence into stable QA attributes", async () => {
  const {
    buildMobjectStateRestoreBridgePlan,
    mobjectStateRestoreBridgeDataAttributes,
    serializeMobjectStateRestoreBridgePlan
  } = await import("./mathMobjectStateRestoreBridge");

  const plan = buildMobjectStateRestoreBridgePlan({
    graph: runtimeGraph(),
    objectId: "function-curve"
  });
  const attributes = mobjectStateRestoreBridgeDataAttributes(plan);
  const serialized = serializeMobjectStateRestoreBridgePlan(plan);

  assert.equal(attributes["data-viz-mobject-state-restore-bridge-object-id"], "function-curve");
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-family-ids"], "function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-saved-node-count"], "3");
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-saved-point-count"], String(plan.savedPointCount));
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-restored"], "true");
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-restore-mismatch-count"], "0");
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-identity-preserved"], "true");
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-family-preserved"], "true");
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-source-contract"], plan.sourceContract);
  assert.equal(attributes["data-viz-mobject-state-restore-bridge-summary"], plan.summary);
  assert.match(serialized, /"objectId":"function-curve"/);
  assert.doesNotMatch(serialized, /</);
});

test("documents that the restore bridge is backed by the pure Mobject state functions", () => {
  const source = fs.readFileSync(
    "components/visualizations/three/manim/mathMobjectStateRestoreBridge.ts",
    "utf8"
  );

  assert.match(source, /MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT/);
  assert.match(source, /saveMobjectState/);
  assert.match(source, /restoreMobjectState/);
});
