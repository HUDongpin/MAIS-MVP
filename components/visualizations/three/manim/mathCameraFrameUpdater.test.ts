import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildCameraDirectorState } from "./mathCameraDirector";
import { buildCameraFrameState } from "./mathCameraFrame";
import {
  CAMERA_FRAME_UPDATER_SOURCE_CONTRACT,
  applyCameraFrameUpdaters,
  applyCameraFrameUpdatersWithDelta,
  buildCameraFrameUpdaterPayload,
  cameraFrameUpdaterDataAttributes,
  serializeCameraFrameUpdaterPayload,
  summarizeCameraFrameUpdaters
} from "./mathCameraFrameUpdater";
import type { CameraShot, MathSceneSpec, MathSceneCameraUpdaterSpec, Vec3 } from "./mathSceneTypes";

const expectedCameraFrameUpdaterSourceContract =
  "CameraFrame updater: camera.frame.add_updater ambient rotation mutates the mobject-like frame before rendering" as const;

const overviewShot: CameraShot = {
  fov: 48,
  id: "overview",
  position: [3, 3, 4],
  target: [0, 0.7, 0]
};

const ambientOrbit: MathSceneCameraUpdaterSpec = {
  degreesPerSecond: 30,
  id: "ambient-orbit",
  startSeconds: 2,
  type: "ambientRotation"
};

function roundedVec3(point: Vec3): Vec3 {
  return point.map((value) => {
    const rounded = Math.round(value * 1000) / 1000;
    return Object.is(rounded, -0) ? 0 : rounded;
  }) as Vec3;
}

function buildAmbientScene(): MathSceneSpec {
  return {
    bindings: [],
    cameraShots: [overviewShot],
    cameraUpdaters: [ambientOrbit],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 0, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [],
    sceneId: "ambient-camera-test",
    timeline: [{ type: "wait", duration: 10 }]
  };
}

test("applies ambient CameraFrame rotation around the teaching target", () => {
  const frame = buildCameraFrameState(overviewShot);
  const updated = applyCameraFrameUpdaters(frame, [ambientOrbit], 5);

  assert.equal(CAMERA_FRAME_UPDATER_SOURCE_CONTRACT, expectedCameraFrameUpdaterSourceContract);
  assert.equal(updated.sourceContract, CAMERA_FRAME_UPDATER_SOURCE_CONTRACT);
  assert.deepEqual(updated.activeUpdaterIds, ["ambient-orbit"]);
  assert.equal(updated.activeUpdaterCount, 1);
  assert.equal(updated.updaterCount, 1);
  assert.equal(updated.ambientRotationDegrees, 90);
  assert.equal(updated.ambientRotationActiveSeconds, 3);
  assert.equal(updated.activeWindowSummary, "ambient-orbit=3.000s");
  assert.equal(updated.timeMode, "elapsed");
  assert.deepEqual(roundedVec3(updated.frame.position), [4, 3, -3]);
  assert.deepEqual(updated.frame.target, frame.target);
  assert.equal(updated.frame.fixedInFrameOverlay, true);
  assert.ok(updated.frame.viewMatrix.every(Number.isFinite));
});

test("applies ambient CameraFrame updaters with Manim-style dt accumulation", () => {
  const frame = buildCameraFrameState(overviewShot);
  const atFourSeconds = applyCameraFrameUpdaters(frame, [ambientOrbit], 4);
  const stepped = applyCameraFrameUpdatersWithDelta(atFourSeconds.frame, [ambientOrbit], 5, 1);
  const direct = applyCameraFrameUpdaters(frame, [ambientOrbit], 5);

  assert.deepEqual(stepped.activeUpdaterIds, ["ambient-orbit"]);
  assert.equal(stepped.activeUpdaterCount, 1);
  assert.equal(stepped.updaterCount, 1);
  assert.equal(stepped.ambientRotationDegrees, 30);
  assert.equal(stepped.ambientRotationActiveSeconds, 1);
  assert.equal(stepped.activeWindowSummary, "ambient-orbit=1.000s");
  assert.equal(stepped.timeMode, "delta");
  assert.deepEqual(roundedVec3(stepped.frame.position), roundedVec3(direct.frame.position));
  assert.deepEqual(stepped.frame.target, frame.target);

  const crossingStart = applyCameraFrameUpdatersWithDelta(frame, [ambientOrbit], 2.5, 1);
  assert.equal(crossingStart.ambientRotationDegrees, 15);
  assert.equal(crossingStart.ambientRotationActiveSeconds, 0.5);
  assert.equal(crossingStart.activeWindowSummary, "ambient-orbit=0.500s");
});

test("keeps inactive ambient camera updaters inspectable without moving the frame", () => {
  const frame = buildCameraFrameState(overviewShot);
  const updated = applyCameraFrameUpdaters(
    frame,
    [{ ...ambientOrbit, endSeconds: 4, id: "expired-orbit" }],
    5
  );

  assert.deepEqual(updated.activeUpdaterIds, []);
  assert.equal(updated.activeUpdaterCount, 0);
  assert.equal(updated.updaterCount, 1);
  assert.equal(updated.ambientRotationDegrees, 0);
  assert.equal(updated.ambientRotationActiveSeconds, 0);
  assert.equal(updated.activeWindowSummary, "none");
  assert.equal(updated.timeMode, "elapsed");
  assert.deepEqual(updated.frame.position, frame.position);
});

test("CameraDirector applies ambient CameraFrame updaters after named shot resolution", () => {
  const director = buildCameraDirectorState(buildAmbientScene(), 5);

  assert.equal(director.activeShotId, "overview");
  assert.equal(director.cameraUpdaterCount, 1);
  assert.equal(director.cameraUpdaterActiveCount, 1);
  assert.deepEqual(director.cameraUpdaterActiveIds, ["ambient-orbit"]);
  assert.equal(director.cameraAmbientRotationDegrees, 90);
  assert.deepEqual(roundedVec3(director.frame.position), [4, 3, -3]);
  assert.equal(director.frame.target[1], 0.7);
});

test("summarizes ambient CameraFrame updater evidence for browser QA", () => {
  const frame = buildCameraFrameState(overviewShot);
  const updated = applyCameraFrameUpdaters(frame, [ambientOrbit], 5);
  const summary = summarizeCameraFrameUpdaters(updated);

  assert.deepEqual(summary, {
    activeUpdaterCount: 1,
    activeUpdaterIds: ["ambient-orbit"],
    activeWindowSummary: "ambient-orbit=3.000s",
    ambientRotationActiveSeconds: 3,
    ambientRotationDegrees: 90,
    sourceContract: CAMERA_FRAME_UPDATER_SOURCE_CONTRACT,
    timeMode: "elapsed",
    updaterCount: 1
  });
  assert.deepEqual(cameraFrameUpdaterDataAttributes(summary), {
    "data-viz-manim-camera-ambient-rotation-degrees": "90.000",
    "data-viz-manim-camera-updater-active-count": "1",
    "data-viz-manim-camera-updater-active-ids": "ambient-orbit",
    "data-viz-manim-camera-updater-active-seconds": "3.000",
    "data-viz-manim-camera-updater-active-window-summary": "ambient-orbit=3.000s",
    "data-viz-manim-camera-updater-count": "1",
    "data-viz-manim-camera-updater-source-contract": CAMERA_FRAME_UPDATER_SOURCE_CONTRACT,
    "data-viz-manim-camera-updater-time-mode": "elapsed"
  });
});

test("serializes CameraFrame updater payloads as deterministic script-safe browser QA JSON", () => {
  const scene = buildAmbientScene();
  const payload = buildCameraFrameUpdaterPayload(
    {
      ...scene,
      cameraUpdaters: [{ ...ambientOrbit, id: "ambient</script>-orbit" }]
    },
    5
  );
  const json = serializeCameraFrameUpdaterPayload(payload);

  assert.equal(json, serializeCameraFrameUpdaterPayload(payload));
  assert.doesNotMatch(json, /<|<\/script>/i);

  const parsed = JSON.parse(json) as typeof payload;
  assert.equal(parsed.sourceContract, CAMERA_FRAME_UPDATER_SOURCE_CONTRACT);
  assert.equal(parsed.updaterCount, 1);
  assert.equal(parsed.activeUpdaterCount, 1);
  assert.deepEqual(parsed.activeUpdaterIds, ["ambient</script>-orbit"]);
  assert.equal(parsed.ambientRotationDegrees, 90);
  assert.equal(parsed.ambientRotationActiveSeconds, 3);
  assert.equal(parsed.activeWindowSummary, "ambient</script>-orbit=3.000s");
  assert.equal(parsed.timeMode, "elapsed");
  assert.equal(parsed.frame.id, "overview+ambient</script>-orbit");
  assert.deepEqual(roundedVec3(parsed.frame.position), [4, 3, -3]);
});

test("CameraFrame updater source stays pure and is consumed by the director", () => {
  const updaterSource = fs.readFileSync("components/visualizations/three/manim/mathCameraFrameUpdater.ts", "utf8");
  const directorSource = fs.readFileSync("components/visualizations/three/manim/mathCameraDirector.ts", "utf8");
  const typesSource = fs.readFileSync("components/visualizations/three/manim/mathSceneTypes.ts", "utf8");

  assert.match(updaterSource, /applyCameraFrameUpdaters/);
  assert.match(updaterSource, /applyCameraFrameUpdatersWithDelta/);
  assert.match(updaterSource, /buildCameraFrameUpdaterPayload/);
  assert.match(updaterSource, /serializeCameraFrameUpdaterPayload/);
  assert.match(updaterSource, /CAMERA_FRAME_UPDATER_SOURCE_CONTRACT/);
  assert.match(updaterSource, /ambientRotation/);
  assert.match(directorSource, /applyCameraFrameUpdaters/);
  assert.match(typesSource, /cameraUpdaters\?: MathSceneCameraUpdaterSpec\[\]/);
  assert.doesNotMatch(updaterSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
