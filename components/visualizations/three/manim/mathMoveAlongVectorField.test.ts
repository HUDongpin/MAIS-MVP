import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMoveAlongVectorFieldPayload,
  buildMoveAlongVectorFieldEvidence,
  evaluateMoveAlongVectorFieldUpdater,
  MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT,
  moveAlongVectorFieldEvidenceDataAttributes,
  serializeMoveAlongVectorFieldPayload
} from "./mathMoveAlongVectorField";
import type { MathSceneSpec } from "./mathSceneTypes";

const modulePath = "components/visualizations/three/manim/mathMoveAlongVectorField.ts";

const coordinateScene: MathSceneSpec = {
  bindings: [],
  cameraShots: [{ id: "overview", position: [0, 0, 8], target: [0, 0, 0] }],
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
    worldRange: { x: [-4, 4], y: [0, 4], z: [-1, 1] }
  },
  diagnostics: { expectedBindingCount: 0, expectedObjectCount: 0, expectedTokenCount: 0 },
  familyId: "three-function-graph",
  formulas: [],
  objects: [],
  sceneId: "move-along-vector-field-test",
  timeline: []
};

test("evaluates Manim move_along_vector_field displacement in math coordinates", () => {
  const frame = evaluateMoveAlongVectorFieldUpdater({
    deltaSeconds: 0.25,
    elapsedSeconds: 3,
    scene: coordinateScene,
    updater: {
      coordinateMode: "math",
      id: "flow-probe-vector-field",
      objectId: "flow-probe",
      speedScale: 2,
      system: { type: "constantVelocity", velocity: [1, 0, 0] },
      type: "moveAlongVectorField"
    },
    worldAnchor: [0, 2, 0]
  });

  assert.equal(frame.status, "moved");
  assert.equal(frame.coordinateMode, "math");
  assert.deepEqual(frame.mathAnchor.map((value) => Number(value.toFixed(3))), [0, 0, 0]);
  assert.deepEqual(frame.vector.map((value) => Number(value.toFixed(3))), [1, 0, 0]);
  assert.deepEqual(frame.mathDelta.map((value) => Number(value.toFixed(3))), [0.5, 0, 0]);
  assert.deepEqual(frame.worldDelta.map((value) => Number(value.toFixed(3))), [1, 0, 0]);
  assert.equal(frame.vectorMagnitude.toFixed(3), "1.000");
  assert.equal(frame.displacementMagnitude.toFixed(3), "1.000");
});

test("records out-of-bounds vector-field updater frames without moving the object", () => {
  const frame = evaluateMoveAlongVectorFieldUpdater({
    deltaSeconds: 1,
    elapsedSeconds: 3,
    scene: coordinateScene,
    updater: {
      bounds: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
      coordinateMode: "world",
      id: "flow-probe-vector-field",
      objectId: "flow-probe",
      speedScale: 1,
      system: { type: "constantVelocity", velocity: [10, 0, 0] },
      type: "moveAlongVectorField"
    },
    worldAnchor: [0, 0, 0]
  });

  assert.equal(frame.status, "out-of-bounds");
  assert.deepEqual(frame.worldDelta, [0, 0, 0]);
  assert.equal(frame.vectorMagnitude.toFixed(3), "10.000");
  assert.equal(frame.displacementMagnitude.toFixed(3), "0.000");
});

test("summarizes move_along_vector_field frames for browser QA", () => {
  const moved = evaluateMoveAlongVectorFieldUpdater({
    deltaSeconds: 0.25,
    elapsedSeconds: 3,
    scene: coordinateScene,
    updater: {
      coordinateMode: "math",
      id: "flow-probe-vector-field",
      objectId: "flow-probe",
      speedScale: 2,
      system: { type: "constantVelocity", velocity: [1, 0, 0] },
      type: "moveAlongVectorField"
    },
    worldAnchor: [0, 2, 0]
  });
  const blocked = evaluateMoveAlongVectorFieldUpdater({
    deltaSeconds: 1,
    elapsedSeconds: 3,
    scene: coordinateScene,
    updater: {
      bounds: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
      coordinateMode: "world",
      id: "blocked-flow-vector-field",
      objectId: "blocked-probe",
      speedScale: 1,
      system: { type: "constantVelocity", velocity: [10, 0, 0] },
      type: "moveAlongVectorField"
    },
    worldAnchor: [0, 0, 0]
  });
  const evidence = buildMoveAlongVectorFieldEvidence([moved, blocked]);
  const attributes = moveAlongVectorFieldEvidenceDataAttributes(evidence);

  assert.equal(evidence.updaterCount, 2);
  assert.equal(evidence.movedCount, 1);
  assert.equal(evidence.blockedCount, 1);
  assert.equal(evidence.finiteVectorCount, 2);
  assert.equal(evidence.finiteDisplacementCount, 1);
  assert.equal(evidence.updaterIds, "blocked-flow-vector-field,flow-probe-vector-field");
  assert.equal(evidence.objectIds, "blocked-probe,flow-probe");
  assert.equal(evidence.coordinateModes, "math,world");
  assert.equal(evidence.deltaSecondsSummary, "blocked-flow-vector-field=1.000s;flow-probe-vector-field=0.250s");
  assert.equal(evidence.speedScaleSummary, "blocked-flow-vector-field=1.000;flow-probe-vector-field=2.000");
  assert.equal(evidence.vectorMagnitudeRange, "1.000..10.000");
  assert.equal(evidence.displacementMagnitudeRange, "1.000..1.000");
  assert.equal(evidence.statusSummary, "moved=1;missing-anchor=0;non-finite-vector=0;out-of-bounds=1");
  assert.equal(evidence.sourceContract, MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(
    evidence.summary,
    "moveAlongVectorField:updaters=2:moved=1:blocked=1:finiteVectors=2:finiteDisplacements=1:ids=blocked-flow-vector-field,flow-probe-vector-field:objects=blocked-probe,flow-probe:modes=math,world:vector=1.000..10.000:displacement=1.000..1.000"
  );
  assert.equal(attributes["data-viz-manim-move-along-vector-field-count"], "2");
  assert.equal(attributes["data-viz-manim-move-along-vector-field-moved-count"], "1");
  assert.equal(attributes["data-viz-manim-move-along-vector-field-blocked-count"], "1");
  assert.equal(attributes["data-viz-manim-move-along-vector-field-source-contract"], MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-move-along-vector-field-summary"], evidence.summary);
});

test("serializes move_along_vector_field payloads as deterministic script-safe browser QA JSON", () => {
  const frame = evaluateMoveAlongVectorFieldUpdater({
    deltaSeconds: 0.25,
    elapsedSeconds: 3,
    scene: coordinateScene,
    updater: {
      coordinateMode: "math",
      id: "flow</script>-vector-field",
      objectId: "flow-probe</script>",
      speedScale: 2,
      system: { type: "constantVelocity", velocity: [1, 0, 0] },
      type: "moveAlongVectorField"
    },
    worldAnchor: [0, 2, 0]
  });
  const payload = buildMoveAlongVectorFieldPayload([frame]);
  const json = serializeMoveAlongVectorFieldPayload(payload);

  assert.equal(json, serializeMoveAlongVectorFieldPayload(payload));
  assert.doesNotMatch(json, /<|<\/script>/i);

  const parsed = JSON.parse(json) as typeof payload;
  assert.equal(parsed.sourceContract, MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(parsed.updaterCount, 1);
  assert.equal(parsed.frames.length, 1);
  assert.equal(parsed.frames[0].updaterId, "flow</script>-vector-field");
  assert.equal(parsed.frames[0].objectId, "flow-probe</script>");
  assert.equal(parsed.frames[0].status, "moved");
  assert.deepEqual(parsed.frames[0].mathDelta.map((value) => Number(value.toFixed(3))), [0.5, 0, 0]);
});

test("move_along_vector_field evidence stays pure and feeds the updater registry", () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure move_along_vector_field module");
  const source = fs.readFileSync(modulePath, "utf8");
  const updaterSource = fs.readFileSync("components/visualizations/three/manim/mathUpdaterRegistry.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /evaluateMoveAlongVectorFieldUpdater/);
  assert.match(source, /MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT/);
  assert.match(source, /buildMoveAlongVectorFieldPayload/);
  assert.match(source, /serializeMoveAlongVectorFieldPayload/);
  assert.match(source, /moveAlongVectorFieldEvidenceDataAttributes/);
  assert.match(updaterSource, /evaluateMoveAlongVectorFieldUpdater/);
});
