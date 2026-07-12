import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  CAMERA_DIRECTOR_SOURCE_CONTRACT,
  buildCameraDirectorEvidence,
  buildCameraDirectorState,
  cameraDirectorEvidenceDataAttributes,
  serializeCameraDirectorEvidence
} from "./mathCameraDirector";
import type { CameraShot, MathSceneCameraUpdaterSpec, MathSceneSpec } from "./mathSceneTypes";

const overviewShot: CameraShot = {
  fov: 48,
  id: "overview",
  position: [3, 3, 4],
  target: [0, 0.7, 0]
};

const detailShot: CameraShot = {
  fov: 42,
  id: "detail",
  position: [1.5, 2.2, 2.6],
  target: [0.2, 1.1, 0.1]
};

const ambientOrbit: MathSceneCameraUpdaterSpec = {
  degreesPerSecond: 10,
  id: "ambient-orbit",
  startSeconds: 0,
  endSeconds: 3,
  type: "ambientRotation"
};

const scene: MathSceneSpec = {
  bindings: [],
  cameraShots: [overviewShot, detailShot],
  cameraUpdaters: [ambientOrbit],
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
    worldRange: { x: [-2, 2], y: [0, 2], z: [-1, 1] }
  },
  diagnostics: { expectedBindingCount: 0, expectedObjectCount: 0, expectedTokenCount: 0 },
  familyId: "three-function-graph",
  formulas: [],
  objects: [],
  sceneId: "camera-director-test",
  timeline: [
    { type: "wait", duration: 1 },
    { type: "cameraTo", shotId: "detail", duration: 2 },
    { type: "wait", duration: 1 }
  ]
};

test("CameraDirector keeps canonical and reset shots stable before camera timeline beats", () => {
  const director = buildCameraDirectorState(scene, 0);
  const evidence = buildCameraDirectorEvidence(scene, 0);

  assert.equal(director.activeShotId, "overview");
  assert.equal(director.canonicalShotId, "overview");
  assert.equal(director.resetShotId, "overview");
  assert.equal(director.progress, 1);
  assert.equal(evidence.activeShotId, "overview");
  assert.equal(evidence.canonicalShotId, "overview");
  assert.equal(evidence.resetShotId, "overview");
  assert.equal(evidence.timelineShotId, "none");
  assert.equal(evidence.progress, 1);
  assert.equal(evidence.transitionSummary, "camera-director-transition:overview->overview@1.000");
});

test("CameraDirector evidence exposes timeline cameraTo progress and updater state", () => {
  const evidence = buildCameraDirectorEvidence(scene, 2);
  const attributes = cameraDirectorEvidenceDataAttributes(evidence);

  assert.equal(evidence.activeShotId, "detail");
  assert.equal(evidence.canonicalShotId, "overview");
  assert.equal(evidence.resetShotId, "overview");
  assert.equal(evidence.timelineShotId, "detail");
  assert.equal(evidence.progress, 0.5);
  assert.equal(evidence.updaterCount, 1);
  assert.equal(evidence.activeUpdaterCount, 1);
  assert.equal(evidence.activeUpdaterIds, "ambient-orbit");
  assert.equal(evidence.ambientRotationDegrees, 20);
  assert.equal(evidence.transitionSummary, "camera-director-transition:overview->detail@0.500");
  assert.equal(evidence.shotPosition, "2.250,2.600,3.300");
  assert.equal(evidence.shotTarget, "0.100,0.900,0.050");
  assert.equal(evidence.shotFov, 45);
  assert.equal(evidence.sourceContract, CAMERA_DIRECTOR_SOURCE_CONTRACT);
  assert.equal(
    evidence.summary,
    "camera-director:active=detail:canonical=overview:reset=overview:timeline=detail:progress=0.500:updaters=1:activeUpdaters=1:ambient=20.000"
  );

  assert.equal(attributes["data-viz-manim-camera-director-active-shot"], "detail");
  assert.equal(attributes["data-viz-manim-camera-director-canonical-shot"], "overview");
  assert.equal(attributes["data-viz-manim-camera-director-reset-shot"], "overview");
  assert.equal(attributes["data-viz-manim-camera-director-timeline-shot"], "detail");
  assert.equal(attributes["data-viz-manim-camera-director-progress"], "0.500");
  assert.equal(attributes["data-viz-manim-camera-director-transition-summary"], evidence.transitionSummary);
  assert.equal(attributes["data-viz-manim-camera-director-updater-count"], "1");
  assert.equal(attributes["data-viz-manim-camera-director-active-updater-count"], "1");
  assert.equal(attributes["data-viz-manim-camera-director-active-updater-ids"], "ambient-orbit");
  assert.equal(attributes["data-viz-manim-camera-director-ambient-rotation-degrees"], "20.000");
  assert.equal(attributes["data-viz-manim-camera-director-shot-position"], "2.250,2.600,3.300");
  assert.equal(attributes["data-viz-manim-camera-director-shot-target"], "0.100,0.900,0.050");
  assert.equal(attributes["data-viz-manim-camera-director-shot-fov"], "45.000");
  assert.equal(attributes["data-viz-manim-camera-director-source-contract"], evidence.sourceContract);
  assert.equal(attributes["data-viz-manim-camera-director-summary"], evidence.summary);

  const json = serializeCameraDirectorEvidence(evidence);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    activeShotId: "detail",
    activeUpdaterCount: 1,
    activeUpdaterIds: "ambient-orbit",
    ambientRotationDegrees: 20,
    canonicalShotId: "overview",
    progress: 0.5,
    resetShotId: "overview",
    shotFov: 45,
    shotPosition: "2.250,2.600,3.300",
    shotTarget: "0.100,0.900,0.050",
    sourceContract: CAMERA_DIRECTOR_SOURCE_CONTRACT,
    summary: "camera-director:active=detail:canonical=overview:reset=overview:timeline=detail:progress=0.500:updaters=1:activeUpdaters=1:ambient=20.000",
    timelineShotId: "detail",
    transitionSummary: "camera-director-transition:overview->detail@0.500",
    updaterCount: 1
  });
});

test("CameraDirector source stays pure and documents Manim camera-as-mobject semantics", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathCameraDirector.ts", "utf8");

  assert.match(source, /CAMERA_DIRECTOR_SOURCE_CONTRACT/);
  assert.match(source, /buildCameraDirectorEvidence/);
  assert.match(source, /cameraDirectorEvidenceDataAttributes/);
  assert.match(source, /serializeCameraDirectorEvidence/);
  assert.match(source, /buildCameraFrameTransition/);
  assert.match(source, /cameraShotForTimeline/);
  assert.match(source, /applyCameraFrameUpdaters/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
