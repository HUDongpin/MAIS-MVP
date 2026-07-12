import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT, CAMERA_FRAME_SOURCE_CONTRACT } from "./mathCameraFrame";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const modulePath = "components/visualizations/three/manim/mathCameraFramePayload.ts";
const expectedMidpointTargetCameraDepth = -Number(Math.hypot(2.7, 1.61, 3.4).toFixed(6));

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

function elapsedAtMidpointOfCameraMove() {
  assert.ok(functionGraphSpec);
  let elapsed = 0;

  for (const step of functionGraphSpec.timeline) {
    if (step.type === "cameraTo") return elapsed + step.duration / 2;
    elapsed += Math.max(0, step.duration);
  }

  throw new Error("missing cameraTo step");
}

test("CameraFrame payload exposes the current frame as a Manim-style animatable Mobject", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure CameraFrame payload module");
  const {
    buildCameraFramePayload,
    summarizeCameraFramePayload
  } = await import("./mathCameraFramePayload");

  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfCameraMove());
  const payload = buildCameraFramePayload({
    cameraDirector: runtimeState.cameraDirector,
    sceneId: runtimeState.sceneId
  });

  assert.equal(payload.sceneId, "mais-manim-function-graph");
  assert.equal(payload.sourceContract, CAMERA_FRAME_SOURCE_CONTRACT);
  assert.equal(payload.activeShotId, "curve-detail");
  assert.equal(payload.canonicalShotId, "overview");
  assert.equal(payload.resetShotId, "overview");
  assert.equal(payload.currentFrameId, "overview->curve-detail");
  assert.equal(payload.currentFov, 46);
  assert.deepEqual(payload.currentEulerAngles, {
    gamma: 0,
    phi: 0.355106,
    theta: 0.671144
  });
  assert.deepEqual(payload.currentUniforms, {
    center: [0.1, 0.865, 0],
    fovy: 46,
    orientationQuaternion: [-0.16677, 0.324132, 0.058163, 0.929378],
    shape: [16, 9]
  });
  assert.equal(payload.uniformCount, 4);
  assert.equal(payload.uniformSummary, "uniforms=center,fovy,orientationQuaternion,shape");
  assert.equal(payload.uniformQuaternionReady, true);
  assert.ok(payload.uniformQuaternionMaxError <= 1e-9);
  assert.deepEqual(payload.currentPosition, [2.8, 2.475, 3.4]);
  assert.deepEqual(payload.currentTarget, [0.1, 0.865, 0]);
  assert.equal(payload.currentProgress, 0.5);
  assert.equal(payload.frameCount, 3);
  assert.equal(payload.fixedInFrameOverlayCount, 3);
  assert.equal(payload.restorableFrameCount, 1);
  assert.equal(payload.matrixEntryCount, 96);
  assert.equal(payload.finiteMatrixEntryCount, 96);
  assert.equal(payload.orientationOrthonormalReady, true);
  assert.ok(payload.orientationOrthonormalMaxError <= 1e-9);
  assert.equal(payload.viewInverseReady, true);
  assert.ok(payload.viewInverseMaxError <= 1e-9);
  assert.equal(payload.pointRoundTripSourceContract, CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT);
  assert.equal(payload.pointRoundTripReady, true);
  assert.ok(payload.pointRoundTripMaxError <= 1e-9);
  assert.deepEqual(payload.currentTargetCameraPoint, [0, 0, expectedMidpointTargetCameraDepth]);
  assert.deepEqual(payload.currentCameraOriginPoint, [0, 0, 0]);
  assert.equal(
    payload.pointRoundTripSummary,
    `pointRoundTrip:target=0.000,0.000,${expectedMidpointTargetCameraDepth.toFixed(3)}:origin=0.000,0.000,0.000:maxError=0.000000:ready=true`
  );
  assert.equal(payload.currentViewMatrixDeterminant, 1);
  assert.equal(payload.currentInverseViewMatrixDeterminant, 1);
  assert.equal(payload.matrixDeterminantReady, true);
  assert.ok(payload.matrixDeterminantMaxError <= 1e-9);
  assert.equal(
    payload.matrixDeterminantSummary,
    "determinants:view=1.000000:inverse=1.000000:maxError=0.000000:ready=true"
  );
  assert.equal(
    payload.currentViewMatrixSummary,
    "0.783,-0.216,0.583,0.000,0.000,0.938,0.348,0.000,-0.622,-0.272,0.734,0.000,-0.078,-0.789,-4.990,1.000"
  );
  assert.equal(
    payload.currentInverseViewMatrixSummary,
    "0.783,0.000,-0.622,0.000,-0.216,0.938,-0.272,0.000,0.583,0.348,0.734,0.000,2.800,2.475,3.400,1.000"
  );
  assert.match(payload.signature, /^camera-frame-[0-9a-f]{8}$/);
  assert.equal(
    summarizeCameraFramePayload(payload),
    "camera-frame:scene=mais-manim-function-graph:active=curve-detail:canonical=overview:progress=0.500:fov=46.000:euler=0.671,0.355,0.000:fixed=3:matrices=96:finite=96"
  );
  assert.deepEqual(
    payload.rows.map((row) => ({
      eulerAngles: row.eulerAngles,
      fixedInFrameOverlay: row.fixedInFrameOverlay,
      fov: row.fov,
      frameId: row.frameId,
      kind: row.kind,
      position: row.position,
      progress: row.progress,
      shotId: row.shotId,
      target: row.target,
      uniforms: row.uniforms
    })),
    [
      {
        eulerAngles: { gamma: 0, phi: 0.355106, theta: 0.671144 },
        fixedInFrameOverlay: true,
        fov: 46,
        frameId: "overview->curve-detail",
        kind: "current",
        position: [2.8, 2.475, 3.4],
        progress: 0.5,
        shotId: "curve-detail",
        target: [0.1, 0.865, 0],
        uniforms: {
          center: [0.1, 0.865, 0],
          fovy: 46,
          orientationQuaternion: [-0.16677, 0.324132, 0.058163, 0.929378],
          shape: [16, 9]
        }
      },
      {
        eulerAngles: { gamma: 0, phi: 0.362489, theta: 0.692334 },
        fixedInFrameOverlay: true,
        fov: 48,
        frameId: "overview",
        kind: "canonical",
        position: [3.4, 2.8, 4.1],
        progress: 1,
        shotId: "overview",
        target: [0, 0.78, 0],
        uniforms: {
          center: [0, 0.78, 0],
          fovy: 48,
          orientationQuaternion: [-0.169561, 0.333737, 0.061159, 0.925272],
          shape: [16, 9]
        }
      },
      {
        eulerAngles: { gamma: 0, phi: 0.362489, theta: 0.692334 },
        fixedInFrameOverlay: true,
        fov: 48,
        frameId: "overview",
        kind: "reset",
        position: [3.4, 2.8, 4.1],
        progress: 1,
        shotId: "overview",
        target: [0, 0.78, 0],
        uniforms: {
          center: [0, 0.78, 0],
          fovy: 48,
          orientationQuaternion: [-0.169561, 0.333737, 0.061159, 0.925272],
          shape: [16, 9]
        }
      }
    ]
  );
});

test("CameraFrame payload data attributes and JSON serialization are deterministic for browser QA", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure CameraFrame payload module");
  const {
    buildCameraFramePayload,
    cameraFramePayloadDataAttributes,
    serializeCameraFramePayload,
    summarizeCameraFramePayload
  } = await import("./mathCameraFramePayload");

  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, elapsedAtMidpointOfCameraMove());
  const payload = buildCameraFramePayload({
    cameraDirector: runtimeState.cameraDirector,
    sceneId: runtimeState.sceneId
  });
  const attributes = cameraFramePayloadDataAttributes(payload);
  const json = serializeCameraFramePayload(payload);

  assert.deepEqual(attributes, {
    "data-viz-manim-camera-frame-active-shot": "curve-detail",
    "data-viz-manim-camera-frame-canonical-shot": "overview",
    "data-viz-manim-camera-frame-count": "3",
    "data-viz-manim-camera-frame-current-id": "overview->curve-detail",
    "data-viz-manim-camera-frame-euler-summary": "theta=0.671;phi=0.355;gamma=0.000",
    "data-viz-manim-camera-frame-finite-matrix-count": "96",
    "data-viz-manim-camera-frame-fixed-overlay-count": "3",
    "data-viz-manim-camera-frame-fov": "46.000",
    "data-viz-manim-camera-frame-gamma": "0.000",
    "data-viz-manim-camera-frame-inverse-view-matrix-summary": "0.783,0.000,-0.622,0.000,-0.216,0.938,-0.272,0.000,0.583,0.348,0.734,0.000,2.800,2.475,3.400,1.000",
    "data-viz-manim-camera-frame-inverse-view-matrix-determinant": "1.000000",
    "data-viz-manim-camera-frame-matrix-determinant-max-error": "0.000000",
    "data-viz-manim-camera-frame-matrix-determinant-ready": "true",
    "data-viz-manim-camera-frame-matrix-determinant-summary": "determinants:view=1.000000:inverse=1.000000:maxError=0.000000:ready=true",
    "data-viz-manim-camera-frame-matrix-count": "96",
    "data-viz-manim-camera-frame-orientation-orthonormal-max-error": "0.000000",
    "data-viz-manim-camera-frame-orientation-orthonormal-ready": "true",
    "data-viz-manim-camera-frame-phi": "0.355",
    "data-viz-manim-camera-frame-position": "2.800,2.475,3.400",
    "data-viz-manim-camera-frame-point-roundtrip-max-error": "0.000000",
    "data-viz-manim-camera-frame-point-roundtrip-ready": "true",
    "data-viz-manim-camera-frame-point-roundtrip-source-contract": CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT,
    "data-viz-manim-camera-frame-point-roundtrip-summary":
      `pointRoundTrip:target=0.000,0.000,${expectedMidpointTargetCameraDepth.toFixed(3)}:origin=0.000,0.000,0.000:maxError=0.000000:ready=true`,
    "data-viz-manim-camera-frame-progress": "0.500",
    "data-viz-manim-camera-frame-reset-shot": "overview",
    "data-viz-manim-camera-frame-restorable-count": "1",
    "data-viz-manim-camera-frame-signature": payload.signature,
    "data-viz-manim-camera-frame-source-contract": CAMERA_FRAME_SOURCE_CONTRACT,
    "data-viz-manim-camera-frame-summary": summarizeCameraFramePayload(payload),
    "data-viz-manim-camera-frame-target": "0.100,0.865,0.000",
    "data-viz-manim-camera-frame-target-camera-point": `0.000,0.000,${expectedMidpointTargetCameraDepth.toFixed(3)}`,
    "data-viz-manim-camera-frame-theta": "0.671",
    "data-viz-manim-camera-frame-origin-camera-point": "0.000,0.000,0.000",
    "data-viz-manim-camera-frame-uniform-center": "0.100,0.865,0.000",
    "data-viz-manim-camera-frame-uniform-count": "4",
    "data-viz-manim-camera-frame-uniform-fovy": "46.000",
    "data-viz-manim-camera-frame-uniform-orientation-quaternion": "-0.167,0.324,0.058,0.929",
    "data-viz-manim-camera-frame-uniform-quaternion-max-error": "0.000000",
    "data-viz-manim-camera-frame-uniform-quaternion-ready": "true",
    "data-viz-manim-camera-frame-uniform-shape": "16.000,9.000",
    "data-viz-manim-camera-frame-uniform-summary": "uniforms=center,fovy,orientationQuaternion,shape",
    "data-viz-manim-camera-frame-view-inverse-max-error": "0.000000",
    "data-viz-manim-camera-frame-view-inverse-ready": "true",
    "data-viz-manim-camera-frame-view-matrix-determinant": "1.000000",
    "data-viz-manim-camera-frame-view-matrix-summary": "0.783,-0.216,0.583,0.000,0.000,0.938,0.348,0.000,-0.622,-0.272,0.734,0.000,-0.078,-0.789,-4.990,1.000",
    "data-viz-manim-camera-frame-operation-count": "0",
    "data-viz-manim-camera-frame-operation-ids": "none",
    "data-viz-manim-camera-frame-operation-summary": "operations=none",
    "data-viz-manim-camera-frame-restored-id": "none",
    "data-viz-manim-camera-frame-rotated-theta": "0.000",
    "data-viz-manim-camera-frame-scaled-fovy": "0.000",
    "data-viz-manim-camera-frame-shifted-center": "0.000,0.000,0.000"
  });
  assert.doesNotMatch(json, /<script/i);
  assert.deepEqual(JSON.parse(json), payload);
  assert.equal(JSON.parse(json).sourceContract, CAMERA_FRAME_SOURCE_CONTRACT);
});

test("CameraFrame payload module remains pure TypeScript without React, R3F, or Three.js imports", () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure CameraFrame payload module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildCameraFramePayload/);
  assert.match(source, /CAMERA_FRAME_SOURCE_CONTRACT/);
  assert.match(source, /cameraFramePayloadDataAttributes/);
});
