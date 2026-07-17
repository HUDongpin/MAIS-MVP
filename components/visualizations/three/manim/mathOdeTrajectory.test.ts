import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildOdeTrajectory,
  buildOdeTrajectoryEvidenceForScene,
  buildSceneOdeTrajectories,
  odeTrajectoryDataAttributes,
  odeTrajectoryPointAtTime,
  odeTrajectoryTail,
  ODE_TRAJECTORY_SOURCE_CONTRACT,
  resolveOdeSystem,
  serializeOdeTrajectoryPayload,
  summarizeOdeTrajectories
} from "./mathOdeTrajectory";
import type { MathSceneSpec } from "./mathSceneTypes";

function roundedPoint(point: [number, number, number], digits = 6) {
  return point.map((value) => Number(value.toFixed(digits)));
}

function assertNear(actual: number, expected: number, tolerance = 1e-4) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}`);
}

function odeSceneForPayload(id = "scene-trajectory", conceptId = "rotation"): MathSceneSpec {
  return {
    bindings: [],
    cameraShots: [],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }
    },
    diagnostics: {
      expectedBindingCount: 0,
      expectedObjectCount: 0,
      expectedTokenCount: 0
    },
    familyId: "three-function-graph",
    formulas: [],
    objects: [],
    odeTrajectories: [
      {
        conceptId,
        id,
        method: "rk4",
        start: [1, 0, 0],
        stepCount: 16,
        system: { type: "linear2d", matrix: [[0, -1], [1, 0]] },
        tailDurationSeconds: 0.4,
        tRange: [0, 1]
      }
    ],
    sceneId: "ode-payload-scene",
    timeline: []
  };
}

test("builds deterministic ODE trajectories with cached time samples", () => {
  const trajectory = buildOdeTrajectory({
    conceptId: "constant-motion",
    id: "linear-particle",
    method: "rk4",
    start: [0, 0, 0],
    stepCount: 4,
    system: () => [1, 2, 0],
    tailDurationSeconds: 0.5,
    tRange: [0, 1]
  });

  assert.equal(trajectory.id, "linear-particle");
  assert.equal(trajectory.conceptId, "constant-motion");
  assert.equal(trajectory.method, "rk4");
  assert.equal(trajectory.stoppedReason, "completed");
  assert.equal(trajectory.samples.length, 5);
  assert.deepEqual(trajectory.samples.map((sample) => Number(sample.time.toFixed(2))), [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual(roundedPoint(trajectory.samples.at(-1)?.point ?? [NaN, NaN, NaN]), [1, 2, 0]);
  assert.equal(trajectory.finiteSampleCount, 5);
  assert.equal(trajectory.tailSamples.length, 3);
});

test("uses RK4 to solve curved dynamic-system trajectories with math-time accuracy", () => {
  const trajectory = buildOdeTrajectory({
    conceptId: "rotation",
    id: "quarter-turn",
    method: "rk4",
    start: [1, 0, 0],
    stepCount: 80,
    system: ([x, y]) => [-y, x, 0],
    tRange: [0, Math.PI / 2]
  });
  const end = trajectory.samples.at(-1)?.point ?? [NaN, NaN, NaN];

  assert.equal(trajectory.stoppedReason, "completed");
  assertNear(end[0], 0, 2e-6);
  assertNear(end[1], 1, 2e-6);
  assertNear(end[2], 0, 1e-8);
});

test("keeps non-finite derivatives out of cached trajectory samples", () => {
  const trajectory = buildOdeTrajectory({
    conceptId: "bad-system",
    id: "nan-system",
    start: [1, 1, 0],
    stepCount: 3,
    system: () => [Number.NaN, 0, 0],
    tRange: [0, 1]
  });

  assert.equal(trajectory.stoppedReason, "non-finite-derivative");
  assert.equal(trajectory.samples.length, 1);
  assert.equal(trajectory.finiteSampleCount, 1);
  assert.deepEqual(trajectory.samples[0]?.point, [1, 1, 0]);
});

test("stops ODE trajectories at authored math bounds", () => {
  const trajectory = buildOdeTrajectory({
    bounds: { x: [0, 0.2], y: [-1, 1], z: [-1, 1] },
    conceptId: "bounded-system",
    id: "bounded-line",
    method: "euler",
    start: [0, 0, 0],
    stepCount: 10,
    system: () => [1, 0, 0],
    tRange: [0, 1]
  });

  assert.equal(trajectory.stoppedReason, "out-of-bounds");
  assert.deepEqual(roundedPoint(trajectory.samples.at(-1)?.point ?? [NaN, NaN, NaN]), [0.2, 0, 0]);
});

test("samples moving particles and trace tails by ODE math time", () => {
  const trajectory = buildOdeTrajectory({
    conceptId: "linear-time",
    id: "time-line",
    start: [0, 0, 0],
    stepCount: 4,
    system: () => [2, 0, 0],
    tRange: [0, 2]
  });
  const point = odeTrajectoryPointAtTime(trajectory, 1.25);
  const tail = odeTrajectoryTail(trajectory, 1.25, 0.75);

  assert.deepEqual(roundedPoint(point), [2.5, 0, 0]);
  assert.deepEqual(tail.map((sample) => Number(sample.time.toFixed(2))), [0.5, 1, 1.25]);
  assert.deepEqual(roundedPoint(tail[0]?.point ?? [NaN, NaN, NaN]), [1, 0, 0]);
  assert.deepEqual(roundedPoint(tail.at(-1)?.point ?? [NaN, NaN, NaN]), [2.5, 0, 0]);
});

test("resolves serializable scene ODE specs into source-level trajectories", () => {
  const system = resolveOdeSystem({ type: "linear2d", matrix: [[0, -1], [1, 0]] });
  const derivative = system([1, 0, 0], 0);
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }
    },
    diagnostics: {
      expectedBindingCount: 0,
      expectedObjectCount: 0,
      expectedTokenCount: 0
    },
    familyId: "three-function-graph",
    formulas: [],
    objects: [],
    odeTrajectories: [
      {
        conceptId: "rotation",
        id: "scene-trajectory",
        method: "rk4",
        start: [1, 0, 0],
        stepCount: 16,
        system: { type: "linear2d", matrix: [[0, -1], [1, 0]] },
        tailDurationSeconds: 0.4,
        tRange: [0, 1]
      }
    ],
    sceneId: "ode-scene",
    timeline: []
  };
  const trajectories = buildSceneOdeTrajectories(scene);
  const summary = summarizeOdeTrajectories(trajectories);

  assert.deepEqual(derivative, [0, 1, 0]);
  assert.equal(trajectories.length, 1);
  assert.equal(trajectories[0]?.id, "scene-trajectory");
  assert.equal(trajectories[0]?.stoppedReason, "completed");
  assert.ok((trajectories[0]?.tailSamples.length ?? 0) > 1);
  assert.equal(summary.initialStateSummary, "scene-trajectory=[1.000,0.000,0.000]");
  assert.equal(summary.stepCountSummary, "scene-trajectory=16");
  assert.equal(summary.boundsSummary, "scene-trajectory=none");
  assert.equal(summary.systemSummary, "scene-trajectory:linear2d[[0.000,-1.000],[1.000,0.000]]");
});

test("builds scene-level ODE trajectory evidence from pure scene specs", () => {
  const evidence = buildOdeTrajectoryEvidenceForScene(odeSceneForPayload());

  assert.equal(evidence.trajectoryCount, 1);
  assert.equal(evidence.sampleCount, 17);
  assert.equal(evidence.finiteSampleCount, 17);
  assert.equal(evidence.stoppedCount, 0);
  assert.ok(evidence.tailSampleCount > 1);
  assert.equal(evidence.sourceContract, ODE_TRAJECTORY_SOURCE_CONTRACT);
  assert.equal(evidence.trajectoryIds, "scene-trajectory");
  assert.equal(evidence.initialStateSummary, "scene-trajectory=[1.000,0.000,0.000]");
  assert.equal(evidence.stepCountSummary, "scene-trajectory=16");
  assert.equal(evidence.systemSummary, "scene-trajectory:linear2d[[0.000,-1.000],[1.000,0.000]]");
  assert.match(evidence.summary, /^odeTrajectories=1;samples=17;finite=17;stopped=0;tails=\d+;ids=scene-trajectory$/);
});

test("serializes ODE trajectory payloads for browser QA without unsafe script characters", () => {
  const scene = odeSceneForPayload("scene-trajectory<script>", "rotation<script>");
  const trajectories = buildSceneOdeTrajectories(scene);
  const json = serializeOdeTrajectoryPayload(trajectories);
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.version, "mais-manim-ode-trajectory/v1");
  assert.equal(parsed.trajectoryCount, 1);
  assert.equal(parsed.sampleCount, 17);
  assert.equal(parsed.sourceContract, ODE_TRAJECTORY_SOURCE_CONTRACT);
  assert.equal(parsed.trajectories.length, 1);
  assert.equal(parsed.trajectories[0].id, "scene-trajectory<script>");
  assert.equal(parsed.trajectories[0].conceptId, "rotation<script>");
  assert.equal(parsed.trajectories[0].method, "rk4");
  assert.equal(parsed.trajectories[0].sourceSystemSummary, "linear2d[[0.000,-1.000],[1.000,0.000]]");
  assert.equal(parsed.trajectories[0].samples.length, 17);
  assert.equal(parsed.trajectories[0].samples[0].index, 0);
  assert.ok(parsed.trajectories[0].tailSamples.length > 1);
});

test("summarizes ODE trajectory evidence for browser QA attributes", () => {
  const completed = buildOdeTrajectory({
    conceptId: "constant-motion",
    id: "linear-particle",
    start: [0, 0, 0],
    stepCount: 2,
    system: () => [1, 0, 0],
    tailDurationSeconds: 0.5,
    tRange: [0, 1]
  });
  const stopped = buildOdeTrajectory({
    conceptId: "bad-system",
    id: "nan-system",
    start: [0, 0, 0],
    stepCount: 2,
    system: () => [Number.NaN, 0, 0],
    tRange: [0, 1]
  });
  const summary = summarizeOdeTrajectories([completed, stopped]);
  const attributes = odeTrajectoryDataAttributes(summary);

  assert.equal(summary.trajectoryCount, 2);
  assert.equal(summary.sampleCount, 4);
  assert.equal(summary.finiteSampleCount, 4);
  assert.equal(summary.stoppedCount, 1);
  assert.equal(summary.tailSampleCount, 2);
  assert.equal(summary.sourceContract, ODE_TRAJECTORY_SOURCE_CONTRACT);
  assert.equal(summary.solverContract, "ode_solution_points|rk4|euler");
  assert.equal(summary.methodIds, "rk4");
  assert.equal(summary.initialStateSummary, "linear-particle=[0.000,0.000,0.000];nan-system=[0.000,0.000,0.000]");
  assert.equal(summary.stepCountSummary, "linear-particle=2;nan-system=2");
  assert.equal(summary.boundsSummary, "linear-particle=none;nan-system=none");
  assert.equal(summary.systemSummary, "linear-particle:function;nan-system:function");
  assert.equal(summary.stepSizeSummary, "linear-particle=0.500;nan-system=0.500");
  assert.equal(summary.timeRangeSummary, "linear-particle=0.000..1.000;nan-system=0.000..1.000");
  assert.equal(summary.stoppedReasonSummary, "completed=1;non-finite-derivative=1;out-of-bounds=0");
  assert.equal(summary.summary, "odeTrajectories=2;samples=4;finite=4;stopped=1;tails=2;ids=linear-particle,nan-system");
  assert.equal(attributes["data-viz-manim-ode-trajectory-count"], "2");
  assert.equal(attributes["data-viz-manim-ode-sample-count"], "4");
  assert.equal(attributes["data-viz-manim-ode-finite-sample-count"], "4");
  assert.equal(attributes["data-viz-manim-ode-stopped-count"], "1");
  assert.equal(attributes["data-viz-manim-ode-tail-sample-count"], "2");
  assert.equal(attributes["data-viz-manim-ode-source-contract"], ODE_TRAJECTORY_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-ode-solver-contract"], "ode_solution_points|rk4|euler");
  assert.equal(attributes["data-viz-manim-ode-method-ids"], "rk4");
  assert.equal(attributes["data-viz-manim-ode-initial-state-summary"], summary.initialStateSummary);
  assert.equal(attributes["data-viz-manim-ode-step-count-summary"], summary.stepCountSummary);
  assert.equal(attributes["data-viz-manim-ode-bounds-summary"], summary.boundsSummary);
  assert.equal(attributes["data-viz-manim-ode-system-summary"], summary.systemSummary);
  assert.equal(attributes["data-viz-manim-ode-step-size-summary"], "linear-particle=0.500;nan-system=0.500");
  assert.equal(attributes["data-viz-manim-ode-time-range-summary"], "linear-particle=0.000..1.000;nan-system=0.000..1.000");
  assert.equal(attributes["data-viz-manim-ode-stopped-reason-summary"], "completed=1;non-finite-derivative=1;out-of-bounds=0");
  assert.equal(attributes["data-viz-manim-ode-summary"], summary.summary);
});

test("ODE trajectory source stays pure and feeds browser evidence", () => {
  const odeSource = fs.readFileSync("components/visualizations/three/manim/mathOdeTrajectory.ts", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");

  assert.doesNotMatch(odeSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(odeSource, /buildOdeTrajectory/);
  assert.match(odeSource, /buildSceneOdeTrajectories/);
  assert.match(odeSource, /buildOdeTrajectoryEvidenceForScene/);
  assert.match(odeSource, /serializeOdeTrajectoryPayload/);
  assert.match(odeSource, /ODE_TRAJECTORY_SOURCE_CONTRACT/);
  assert.match(odeSource, /odeTrajectoryDataAttributes/);
  assert.match(evidenceSource, /buildOdeTrajectoryEvidenceForScene/);
  assert.match(evidenceSource, /odeTrajectoryDataAttributes/);
});
