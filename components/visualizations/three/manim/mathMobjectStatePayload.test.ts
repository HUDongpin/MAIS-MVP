import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const modulePath = "components/visualizations/three/manim/mathMobjectState.ts";

function runtimeGraph() {
  const spec = buildMathSceneSpecForThreeDFamily({
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

  assert.ok(spec);
  return buildMathSceneRuntimeState(spec, 0).objectGraph;
}

test("Mobject state payload exposes save_state, generate_target, and become-ready rows", async () => {
  const {
    buildMobjectStatePayload,
    summarizeMobjectStatePayload
  } = await import("./mathMobjectState");

  assert.equal(typeof buildMobjectStatePayload, "function");
  assert.equal(typeof summarizeMobjectStatePayload, "function");

  const payload = buildMobjectStatePayload(runtimeGraph());

  assert.equal(payload.snapshotCount, 2);
  assert.equal(payload.stateFamilyRootCount, 2);
  assert.equal(payload.stateSnapshotNodeCount, 4);
  assert.equal(payload.restorableObjectCount, 4);
  assert.equal(payload.targetableObjectCount, 3);
  assert.equal(payload.targetCount, 2);
  assert.equal(payload.targetNodeCount, 4);
  assert.equal(payload.targetPointCount, 79);
  assert.equal(payload.targetRenderDataNodeCount, 3);
  assert.equal(payload.becomeAppliedCount, 2);
  assert.equal(payload.becomeNodeCount, 4);
  assert.equal(payload.becomePointCount, 79);
  assert.equal(payload.becomeReadyCount, 2);
  assert.equal(payload.becomeRenderDataNodeCount, 3);
  assert.equal(payload.restoreReadyCount, 2);
  assert.equal(payload.restoreMismatchCount, 0);
  assert.equal(payload.restoreNodeCount, 4);
  assert.equal(payload.restorePointCount, 79);
  assert.equal(payload.restoreRenderDataNodeCount, 3);
  assert.equal(payload.restoreUniformNodeCount, 4);
  assert.equal(payload.restoreSourceSummary, "restore:rows=2:ready=2:mismatch=0:nodes=4:points=79:uniforms=4");
  assert.deepEqual(payload.targetIds, ["axes:target", "function-curve:target"]);
  assert.match(payload.signature, /^mobject-state-[0-9a-f]{8}$/);
  assert.equal(
    summarizeMobjectStatePayload(payload),
    "mobject-state:snapshots=2:nodes=4:restorable=4:targetable=3:targets=2:become=2"
  );
  assert.deepEqual(
    payload.rows.map((row) => ({
      becomeReady: row.becomeReady,
      conceptId: row.conceptId,
      familyIds: row.familyIds,
      nodeCount: row.nodeCount,
      pointCount: row.pointCount,
      renderDataNodeCount: row.renderDataNodeCount,
      restorable: row.restorable,
      restoreMismatchCount: row.restoreMismatchCount,
      restoreReady: row.restoreReady,
      rootId: row.rootId,
      targetId: row.targetId,
      targetKind: row.targetKind
    })),
    [
      {
        becomeReady: true,
        conceptId: "coordinate-frame",
        familyIds: ["axes"],
        nodeCount: 1,
        pointCount: 6,
        renderDataNodeCount: 1,
        restorable: true,
        restoreMismatchCount: 0,
        restoreReady: true,
        rootId: "axes",
        targetId: "axes:target",
        targetKind: "target"
      },
      {
        becomeReady: true,
        conceptId: "function-rule",
        familyIds: ["function-curve", "moving-probe", "probe-trace"],
        nodeCount: 3,
        pointCount: 73,
        renderDataNodeCount: 2,
        restorable: true,
        restoreMismatchCount: 0,
        restoreReady: true,
        rootId: "function-curve",
        targetId: "function-curve:target",
        targetKind: "target"
      }
    ]
  );
});

test("Mobject state payload data attributes and JSON serialization are deterministic for browser QA", async () => {
  const {
    buildMobjectStatePayload,
    mobjectStatePayloadDataAttributes,
    serializeMobjectStatePayload,
    summarizeMobjectStatePayload
  } = await import("./mathMobjectState");

  assert.equal(typeof mobjectStatePayloadDataAttributes, "function");
  assert.equal(typeof serializeMobjectStatePayload, "function");

  const payload = buildMobjectStatePayload(runtimeGraph());
  const attributes = mobjectStatePayloadDataAttributes(payload);
  const json = serializeMobjectStatePayload(payload);

  assert.deepEqual(attributes, {
    "data-viz-mobject-state-become-applied-count": "2",
    "data-viz-mobject-state-become-node-count": "4",
    "data-viz-mobject-state-become-point-count": "79",
    "data-viz-mobject-state-become-ready-count": "2",
    "data-viz-mobject-state-become-render-data-count": "3",
    "data-viz-mobject-state-family-root-count": "2",
    "data-viz-mobject-state-node-count": "4",
    "data-viz-mobject-state-restorable-count": "4",
    "data-viz-mobject-state-restore-mismatch-count": "0",
    "data-viz-mobject-state-restore-node-count": "4",
    "data-viz-mobject-state-restore-point-count": "79",
    "data-viz-mobject-state-restore-ready-count": "2",
    "data-viz-mobject-state-restore-render-data-count": "3",
    "data-viz-mobject-state-restore-source-summary": "restore:rows=2:ready=2:mismatch=0:nodes=4:points=79:uniforms=4",
    "data-viz-mobject-state-restore-uniform-node-count": "4",
    "data-viz-mobject-state-signature": payload.signature,
    "data-viz-mobject-state-source-contract": "Mobject.save_state|restore|generate_target|become",
    "data-viz-mobject-state-snapshot-count": "2",
    "data-viz-mobject-state-summary": summarizeMobjectStatePayload(payload),
    "data-viz-mobject-state-target-count": "2",
    "data-viz-mobject-state-target-ids": "axes:target,function-curve:target",
    "data-viz-mobject-state-target-node-count": "4",
    "data-viz-mobject-state-target-point-count": "79",
    "data-viz-mobject-state-target-render-data-count": "3",
    "data-viz-mobject-state-targetable-count": "3"
  });
  assert.doesNotMatch(json, /<script/i);
  assert.deepEqual(JSON.parse(json), payload);
});

test("Mobject state payload stays pure TypeScript without React, R3F, or Three.js imports", () => {
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildMobjectStatePayload/);
  assert.match(source, /mobjectStatePayloadDataAttributes/);
});
