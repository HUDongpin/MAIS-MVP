import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildOdeTrajectoryObjectBridgeEvidence,
  buildOdeTrajectoryObjectBridgeEvidenceForScene,
  buildOdeTrajectoryObjectSpecs,
  expandSceneOdeTrajectoryObjects,
  ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT,
  odeTrajectoryRuntimeObjectIds,
  serializeOdeTrajectoryObjectBridgePayload
} from "./mathOdeTrajectoryObjects";
import type { MathSceneSpec } from "./mathSceneTypes";

function odeScene(): MathSceneSpec {
  return {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3], target: [0, 0, 0], fov: 48 }],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }, conceptId: "coordinate-frame" }
    ],
    odeTrajectories: [
      {
        colorRole: "attention",
        conceptId: "phase-flow",
        id: "phase-orbit",
        method: "rk4",
        start: [1, 0, 0],
        stepCount: 8,
        system: { type: "linear2d", matrix: [[0, -1], [1, 0]] },
        tailDurationSeconds: 0.25,
        tRange: [0, 1]
      }
    ],
    sceneId: "ode-runtime-scene",
    timeline: []
  };
}

test("builds Manim-style runtime MathObjects from solved ODE trajectory specs", () => {
  const objects = buildOdeTrajectoryObjectSpecs(odeScene());
  const ids = odeTrajectoryRuntimeObjectIds("phase-orbit");

  assert.deepEqual(ids, {
    currentStateId: "phase-orbit:current-state",
    pathId: "phase-orbit:trajectory-path",
    traceId: "phase-orbit:trace-tail"
  });
  assert.equal(objects.length, 3);
  assert.equal(objects[0]?.type, "parametricCurve");
  assert.equal(objects[0]?.id, ids.pathId);
  assert.equal(objects[0]?.conceptId, "phase-flow");
  assert.equal(objects[0]?.colorRole, "attention");
  assert.ok("samples" in objects[0]! && objects[0].samples.length === 9);
  assert.equal(objects[1]?.type, "movingPoint");
  assert.equal(objects[1]?.id, ids.currentStateId);
  assert.equal(objects[1]?.conceptId, "phase-flow");
  assert.equal(objects[1]?.colorRole, "probe");
  assert.ok("pathObjectId" in objects[1]! && objects[1].pathObjectId === ids.pathId);
  assert.equal(objects[2]?.type, "trace");
  assert.equal(objects[2]?.id, ids.traceId);
  assert.equal(objects[2]?.colorRole, "trace");
  assert.ok("sourceObjectId" in objects[2]! && objects[2].sourceObjectId === ids.currentStateId);
  assert.ok("durationSeconds" in objects[2]! && objects[2].durationSeconds === 0.25);
});

test("builds scene-level ODE trajectory object bridge evidence", () => {
  const scene = odeScene();
  const objects = buildOdeTrajectoryObjectSpecs(scene);
  const evidence = buildOdeTrajectoryObjectBridgeEvidence(objects);
  const sceneEvidence = buildOdeTrajectoryObjectBridgeEvidenceForScene(scene);

  assert.equal(evidence.objectCount, 3);
  assert.equal(evidence.pathObjectCount, 1);
  assert.equal(evidence.currentStateObjectCount, 1);
  assert.equal(evidence.traceObjectCount, 1);
  assert.equal(evidence.sourceContract, ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(evidence.objectIds, "phase-orbit:trajectory-path,phase-orbit:current-state,phase-orbit:trace-tail");
  assert.equal(
    evidence.summary,
    "odeObjectBridge:objects=3;paths=1;markers=1;traces=1;ids=phase-orbit:trajectory-path,phase-orbit:current-state,phase-orbit:trace-tail"
  );
  assert.deepEqual(sceneEvidence, evidence);
});

test("serializes ODE trajectory object bridge payloads for browser QA without unsafe script characters", () => {
  const scene: MathSceneSpec = {
    ...odeScene(),
    odeTrajectories: [
      {
        ...odeScene().odeTrajectories![0]!,
        conceptId: "phase-flow<script>",
        id: "phase-orbit<script>"
      }
    ]
  };
  const objects = buildOdeTrajectoryObjectSpecs(scene);
  const json = serializeOdeTrajectoryObjectBridgePayload(objects);
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.version, "mais-manim-ode-trajectory-object-bridge/v1");
  assert.equal(parsed.objectCount, 3);
  assert.equal(parsed.pathObjectCount, 1);
  assert.equal(parsed.currentStateObjectCount, 1);
  assert.equal(parsed.traceObjectCount, 1);
  assert.equal(parsed.sourceContract, ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT);
  assert.equal(parsed.objects.length, 3);
  assert.equal(parsed.objects[0].id, "phase-orbit<script>:trajectory-path");
  assert.equal(parsed.objects[0].conceptId, "phase-flow<script>");
  assert.equal(parsed.objects[1].id, "phase-orbit<script>:current-state");
  assert.equal(parsed.objects[1].pathObjectId, "phase-orbit<script>:trajectory-path");
  assert.equal(parsed.objects[2].id, "phase-orbit<script>:trace-tail");
  assert.equal(parsed.objects[2].sourceObjectId, "phase-orbit<script>:current-state");
});

test("expands scene ODE trajectories before runtime graph construction", () => {
  const scene = odeScene();
  const expanded = expandSceneOdeTrajectoryObjects(scene);

  assert.notEqual(expanded, scene);
  assert.equal(scene.objects.length, 1);
  assert.equal(expanded.objects.length, 4);
  assert.equal(expanded.diagnostics.expectedObjectCount, 4);
  assert.deepEqual(expanded.objects.map((object) => object.id), [
    "axes",
    "phase-orbit:trajectory-path",
    "phase-orbit:current-state",
    "phase-orbit:trace-tail"
  ]);
  assert.equal(expanded.odeTrajectories?.length, 1);
});

test("ODE trajectory object bridge stays pure and is consumed by runtime state", () => {
  const bridgeSource = fs.readFileSync("components/visualizations/three/manim/mathOdeTrajectoryObjects.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeState.ts", "utf8");

  assert.doesNotMatch(bridgeSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(bridgeSource, /ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(bridgeSource, /buildSceneOdeTrajectories/);
  assert.match(bridgeSource, /buildOdeTrajectoryObjectSpecs/);
  assert.match(bridgeSource, /buildOdeTrajectoryObjectBridgeEvidence/);
  assert.match(bridgeSource, /serializeOdeTrajectoryObjectBridgePayload/);
  assert.match(runtimeSource, /expandSceneOdeTrajectoryObjects/);
});

test("ODE trajectory object bridge names its Manim source contract", () => {
  assert.match(ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT, /ode_solution_points/);
  assert.match(ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT, /ParametricCurve/);
  assert.match(ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT, /moving state marker/);
  assert.match(ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT, /TracingTail/);
});
