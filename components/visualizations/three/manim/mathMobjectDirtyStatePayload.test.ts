import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const modulePath = "components/visualizations/three/manim/mathMobjectDirtyStatePayload.ts";

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

function cloneRuntimeState<T>(runtimeState: T): T {
  return JSON.parse(JSON.stringify(runtimeState)) as T;
}

test("Mobject dirty-state payload exposes invalidation, ownership, and family-cache reuse rows", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure Mobject dirty-state payload module");
  const {
    buildMobjectDirtyStatePayload,
    MOBJECT_INVALIDATION_SOURCE_CONTRACT,
    summarizeMobjectDirtyStatePayload
  } = await import("./mathMobjectDirtyStatePayload");

  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const previousRuntimeState = cloneRuntimeState(runtimeState);
  previousRuntimeState.objectGraph.byId["moving-probe"].renderState = {
    kind: "point",
    position: [9, 9, 9]
  };

  const payload = buildMobjectDirtyStatePayload({
    previousRuntimeState,
    runtimeState,
    scene: functionGraphSpec
  });

  assert.equal(payload.cacheStatus, "cache-hit");
  assert.equal(payload.familyCacheReusable, true);
  assert.equal(payload.totalObjectCount, 4);
  assert.equal(payload.invalidatedCount, 1);
  assert.equal(payload.unchangedCount, 3);
  assert.equal(payload.dataChangedCount, 1);
  assert.equal(payload.boundingBoxStaleCount, 1);
  assert.equal(payload.familyChangedCount, 0);
  assert.equal(payload.sourceContract, MOBJECT_INVALIDATION_SOURCE_CONTRACT);
  assert.match(MOBJECT_INVALIDATION_SOURCE_CONTRACT, /_data_has_changed/);
  assert.match(MOBJECT_INVALIDATION_SOURCE_CONTRACT, /_needs_new_bounding_box/);
  assert.equal(payload.metadataChangedCount, 0);
  assert.equal(payload.uniformsChangedCount, 0);
  assert.equal(payload.animationOwnedInvalidationCount, 1);
  assert.equal(payload.updaterActiveInvalidationCount, 0);
  assert.equal(payload.unknownInvalidationCount, 0);
  assert.equal(payload.reusedFamilyCount, 4);
  assert.equal(payload.recomputedFamilyCount, 0);
  assert.deepEqual(payload.invalidatedIds, ["moving-probe"]);
  assert.match(payload.signature, /^mobject-dirty-[0-9a-f]{8}$/);
  assert.equal(
    summarizeMobjectDirtyStatePayload(payload),
    "mobject-dirty:status=cache-hit:invalidated=1:data=1:bbox=1:family=0:metadata=0:uniforms=0:animation=1:updater=0:unknown=0:reused=4:recomputed=0"
  );
  assert.deepEqual(
    payload.rows
      .filter((row) => row.invalidated)
      .map((row) => ({
        dataHasChanged: row.dataHasChanged,
        familyHasChanged: row.familyHasChanged,
        invalidated: row.invalidated,
        metadataHasChanged: row.metadataHasChanged,
        needsNewBoundingBox: row.needsNewBoundingBox,
        objectId: row.objectId,
        ownership: row.ownership,
        reasons: row.reasons,
        uniformsHaveChanged: row.uniformsHaveChanged
      })),
    [
      {
        dataHasChanged: true,
        familyHasChanged: false,
        invalidated: true,
        metadataHasChanged: false,
        needsNewBoundingBox: true,
        objectId: "moving-probe",
        ownership: "animation-owned",
        reasons: ["render-state-changed", "bounding-box-changed"],
        uniformsHaveChanged: false
      }
    ]
  );
});

test("Mobject dirty-state payload reports uniform-only changes without stale bounding boxes", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure Mobject dirty-state payload module");
  const {
    buildMobjectDirtyStatePayload,
    summarizeMobjectDirtyStatePayload
  } = await import("./mathMobjectDirtyStatePayload");

  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const previousRuntimeState = cloneRuntimeState(runtimeState);
  previousRuntimeState.objectGraph.byId["function-curve"].uniforms = {
    clippingPlanes: [],
    fixedInFrame: false,
    opacity: 0.25,
    shadeIn3D: false
  };

  const payload = buildMobjectDirtyStatePayload({
    previousRuntimeState,
    runtimeState,
    scene: functionGraphSpec
  });
  const row = payload.rows.find((entry) => entry.objectId === "function-curve");

  assert.equal(payload.invalidatedCount, 1);
  assert.equal(payload.dataChangedCount, 1);
  assert.equal(payload.uniformsChangedCount, 1);
  assert.equal(payload.metadataChangedCount, 0);
  assert.equal(payload.boundingBoxStaleCount, 0);
  assert.equal(payload.unchangedCount, payload.totalObjectCount - 1);
  assert.ok(row);
  assert.equal(row.uniformsHaveChanged, true);
  assert.equal(row.dataHasChanged, true);
  assert.equal(row.metadataHasChanged, false);
  assert.equal(row.needsNewBoundingBox, false);
  assert.equal(row.ownership, "animation-owned");
  assert.deepEqual(row.reasons, ["uniforms-changed"]);
  assert.equal(
    summarizeMobjectDirtyStatePayload(payload),
    `mobject-dirty:status=cache-hit:invalidated=1:data=1:bbox=0:family=0:metadata=0:uniforms=1:animation=1:updater=0:unknown=0:reused=${payload.reusedFamilyCount}:recomputed=0`
  );
});

test("Mobject dirty-state payload data attributes and JSON serialization are deterministic for browser QA", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure Mobject dirty-state payload module");
  const {
    buildMobjectDirtyStatePayload,
    MOBJECT_INVALIDATION_SOURCE_CONTRACT,
    mobjectDirtyStatePayloadDataAttributes,
    serializeMobjectDirtyStatePayload,
    summarizeMobjectDirtyStatePayload
  } = await import("./mathMobjectDirtyStatePayload");

  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfComposition("function-attention-lagged-start"));
  const previousRuntimeState = cloneRuntimeState(runtimeState);
  previousRuntimeState.objectGraph.byId["moving-probe"].renderState = {
    kind: "point",
    position: [9, 9, 9]
  };
  const payload = buildMobjectDirtyStatePayload({
    previousRuntimeState,
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = mobjectDirtyStatePayloadDataAttributes(payload);
  const json = serializeMobjectDirtyStatePayload(payload);

  assert.deepEqual(attributes, {
    "data-viz-mobject-dirty-animation-owned-count": "1",
    "data-viz-mobject-dirty-bounding-box-stale-count": "1",
    "data-viz-mobject-dirty-cache-status": "cache-hit",
    "data-viz-mobject-dirty-data-changed-count": "1",
    "data-viz-mobject-dirty-family-cache-reusable": "true",
    "data-viz-mobject-dirty-family-changed-count": "0",
    "data-viz-mobject-dirty-invalidated-count": "1",
    "data-viz-mobject-dirty-invalidated-ids": "moving-probe",
    "data-viz-mobject-dirty-metadata-changed-count": "0",
    "data-viz-mobject-dirty-recomputed-family-count": "0",
    "data-viz-mobject-dirty-reused-family-count": "4",
    "data-viz-mobject-dirty-signature": payload.signature,
    "data-viz-mobject-dirty-source-contract": MOBJECT_INVALIDATION_SOURCE_CONTRACT,
    "data-viz-mobject-dirty-summary": summarizeMobjectDirtyStatePayload(payload),
    "data-viz-mobject-dirty-unknown-count": "0",
    "data-viz-mobject-dirty-uniforms-changed-count": "0",
    "data-viz-mobject-dirty-updater-active-count": "0"
  });
  assert.doesNotMatch(json, /<script/i);
  assert.deepEqual(JSON.parse(json), payload);
});

test("Mobject dirty-state payload module remains pure TypeScript without React, R3F, or Three.js imports", () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure Mobject dirty-state payload module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildMobjectDirtyStatePayload/);
  assert.match(source, /MOBJECT_INVALIDATION_SOURCE_CONTRACT/);
  assert.match(source, /mobjectDirtyStatePayloadDataAttributes/);
});
