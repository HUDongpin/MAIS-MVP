import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  CAMERA_FRAME_SOURCE_CONTRACT,
  buildCameraFrameState,
  buildCameraFrameTransition,
  interpolateCameraFrames
} from "./mathCameraFrame";
import type { MathSceneSpec } from "./mathSceneTypes";

const expectedCameraFrameSourceContract =
  "CameraFrame: mobject-like frame stores center/shape/euler/uniforms; fixed-in-frame overlays stay attached while camera animates" as const;

const overviewShot = {
  id: "overview",
  position: [3, 3, 4] as [number, number, number],
  target: [0, 0.7, 0] as [number, number, number],
  fov: 48
};

const detailShot = {
  id: "detail",
  position: [1.5, 2.2, 2.6] as [number, number, number],
  target: [0.2, 1.1, 0.1] as [number, number, number],
  fov: 42
};

function roundVec(values: number[]) {
  return values.map((value) => Number(value.toFixed(6)));
}

const scene: MathSceneSpec = {
  sceneId: "camera-frame-test",
  familyId: "three-function-graph",
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
    worldRange: { x: [-2, 2], y: [0, 2], z: [-1, 1] }
  },
  objects: [],
  formulas: [],
  bindings: [],
  timeline: [
    { type: "wait", duration: 1 },
    { type: "cameraTo", shotId: "detail", duration: 2 },
    { type: "wait", duration: 1 }
  ],
  cameraShots: [overviewShot, detailShot],
  diagnostics: { expectedBindingCount: 0, expectedObjectCount: 0, expectedTokenCount: 0 }
};

test("builds a serializable CameraFrame state with orientation basis and view matrices", () => {
  const frame = buildCameraFrameState(overviewShot);

  assert.equal(CAMERA_FRAME_SOURCE_CONTRACT, expectedCameraFrameSourceContract);
  assert.equal(frame.sourceContract, CAMERA_FRAME_SOURCE_CONTRACT);
  assert.equal(frame.id, "overview");
  assert.equal(frame.fov, 48);
  assert.equal(frame.fixedInFrameOverlay, true);
  assert.deepEqual(frame.position, [3, 3, 4]);
  assert.deepEqual(frame.target, [0, 0.7, 0]);
  assert.equal(frame.viewMatrix.length, 16);
  assert.equal(frame.inverseViewMatrix.length, 16);
  assert.ok(frame.orientation.forward.every(Number.isFinite));
  assert.ok(frame.orientation.right.every(Number.isFinite));
  assert.ok(frame.orientation.up.every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(...frame.orientation.forward) - 1) < 1e-9);
  assert.deepEqual(frame.eulerAngles, {
    gamma: 0,
    phi: 0.43113874071878217,
    theta: 0.6435011087932844
  });
  assert.deepEqual(frame.uniforms.center, [0, 0.7, 0]);
  assert.equal(frame.uniforms.fovy, 48);
  assert.deepEqual(frame.uniforms.shape, [16, 9]);
  assert.deepEqual(
    frame.uniforms.orientationQuaternion.map((value) => Number(value.toFixed(6))),
    [-0.202927, 0.308909, 0.067642, 0.926726]
  );
  assert.ok(Math.abs(Math.hypot(...frame.uniforms.orientationQuaternion) - 1) < 1e-9);
});

test("projects world points through CameraFrame view matrices and restores them through inverse matrices", async () => {
  const cameraFrameModule = await import("./mathCameraFrame") as typeof import("./mathCameraFrame") & {
    CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT?: string;
    projectWorldPointThroughCameraFrame?: (
      frame: ReturnType<typeof buildCameraFrameState>,
      worldPoint: [number, number, number]
    ) => {
      cameraPoint: [number, number, number];
      frameId: string;
      restoredWorldPoint: [number, number, number];
      roundTripMaxError: number;
      sourceContract: string;
      worldPoint: [number, number, number];
    };
  };
  const frame = buildCameraFrameState(overviewShot);

  assert.equal(typeof cameraFrameModule.projectWorldPointThroughCameraFrame, "function");
  assert.equal(
    cameraFrameModule.CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT,
    "CameraFrame: viewMatrix/inverseViewMatrix round-trip world points through camera coordinates"
  );

  const targetProjection = cameraFrameModule.projectWorldPointThroughCameraFrame!(frame, overviewShot.target);
  const cameraOriginProjection = cameraFrameModule.projectWorldPointThroughCameraFrame!(frame, overviewShot.position);
  const arbitraryProjection = cameraFrameModule.projectWorldPointThroughCameraFrame!(frame, [1.2, -0.4, 0.75]);

  assert.equal(targetProjection.sourceContract, cameraFrameModule.CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT);
  assert.equal(targetProjection.frameId, "overview");
  assert.deepEqual(roundVec(targetProjection.cameraPoint), [0, 0, -Number(Math.hypot(3, 2.3, 4).toFixed(6))]);
  assert.deepEqual(roundVec(targetProjection.restoredWorldPoint), [0, 0.7, 0]);
  assert.ok(targetProjection.roundTripMaxError <= 1e-9);

  assert.deepEqual(roundVec(cameraOriginProjection.cameraPoint), [0, 0, 0]);
  assert.deepEqual(roundVec(arbitraryProjection.restoredWorldPoint), [1.2, -0.4, 0.75]);
  assert.ok(arbitraryProjection.roundTripMaxError <= 1e-9);
  assert.ok(arbitraryProjection.cameraPoint.every(Number.isFinite));
});

test("interpolates CameraFrame states as animatable objects", () => {
  const from = buildCameraFrameState(overviewShot);
  const to = buildCameraFrameState(detailShot);
  const frame = interpolateCameraFrames(from, to, 0.5);

  assert.equal(frame.id, "overview->detail");
  assert.equal(frame.progress, 0.5);
  assert.equal(frame.fov, 45);
  assert.deepEqual(frame.position, [2.25, 2.6, 3.3]);
  assert.deepEqual(frame.target, [0.1, 0.9, 0.05]);
  assert.deepEqual(frame.eulerAngles, {
    gamma: 0,
    phi: 0.4113659135338109,
    theta: 0.5844438997093513
  });
  assert.deepEqual(frame.uniforms.center, [0.1, 0.9, 0.05]);
  assert.equal(frame.uniforms.fovy, 45);
  assert.deepEqual(frame.uniforms.shape, [16, 9]);
  assert.deepEqual(
    frame.uniforms.orientationQuaternion.map((value) => Number(value.toFixed(6))),
    [-0.195577, 0.282008, 0.058836, 0.937421]
  );
  assert.ok(frame.viewMatrix.every(Number.isFinite));
  assert.ok(frame.inverseViewMatrix.every(Number.isFinite));
});

test("builds a CameraFrame transition from scene timeline state", () => {
  const transition = buildCameraFrameTransition(scene, 2);

  assert.equal(transition.activeShotId, "detail");
  assert.equal(transition.canonicalFrame.id, "overview");
  assert.equal(transition.resetFrame.id, "overview");
  assert.equal(transition.frame.id, "overview->detail");
  assert.equal(transition.progress, 0.5);
  assert.equal(transition.frame.progress, 0.5);
  assert.equal(transition.frame.fixedInFrameOverlay, true);
  assert.equal(transition.frame.sourceContract, CAMERA_FRAME_SOURCE_CONTRACT);
  assert.equal(transition.canonicalFrame.sourceContract, CAMERA_FRAME_SOURCE_CONTRACT);
  assert.equal(transition.resetFrame.sourceContract, CAMERA_FRAME_SOURCE_CONTRACT);
});

test("CameraFrame transitions use eased cameraTo progress from the timeline", () => {
  const transition = buildCameraFrameTransition(scene, 1.5);

  assert.equal(transition.activeShotId, "detail");
  assert.equal(transition.progress, 0.15625);
  assert.equal(transition.frame.progress, 0.15625);
});

test("CameraFrame exposes shift, scale, rotate, and restore operations as pure state transforms", async () => {
  const cameraFrameModule = await import("./mathCameraFrame") as typeof import("./mathCameraFrame") & {
    restoreCameraFrame?: (frame: ReturnType<typeof buildCameraFrameState>, savedFrame: ReturnType<typeof buildCameraFrameState>) => ReturnType<typeof buildCameraFrameState>;
    rotateCameraFrameAroundTarget?: (frame: ReturnType<typeof buildCameraFrameState>, degrees: number) => ReturnType<typeof buildCameraFrameState>;
    scaleCameraFrame?: (frame: ReturnType<typeof buildCameraFrameState>, factor: number) => ReturnType<typeof buildCameraFrameState>;
    shiftCameraFrame?: (frame: ReturnType<typeof buildCameraFrameState>, vector: [number, number, number]) => ReturnType<typeof buildCameraFrameState>;
  };
  const frame = buildCameraFrameState(overviewShot);
  const targetFrame = buildCameraFrameState(detailShot);

  assert.equal(typeof cameraFrameModule.shiftCameraFrame, "function");
  assert.equal(typeof cameraFrameModule.scaleCameraFrame, "function");
  assert.equal(typeof cameraFrameModule.rotateCameraFrameAroundTarget, "function");
  assert.equal(typeof cameraFrameModule.restoreCameraFrame, "function");

  const shifted = cameraFrameModule.shiftCameraFrame!(frame, [0.5, -0.2, 0.25]);
  const scaled = cameraFrameModule.scaleCameraFrame!(frame, 0.75);
  const rotated = cameraFrameModule.rotateCameraFrameAroundTarget!(frame, 30);
  const restored = cameraFrameModule.restoreCameraFrame!(targetFrame, frame);

  assert.equal(shifted.id, "overview+shift");
  assert.deepEqual(shifted.position, [3.5, 2.8, 4.25]);
  assert.deepEqual(shifted.target, [0.5, 0.5, 0.25]);
  assert.deepEqual(shifted.uniforms.center, [0.5, 0.5, 0.25]);
  assert.equal(shifted.fov, 48);
  assert.deepEqual(
    shifted.uniforms.orientationQuaternion.map((value) => Number(value.toFixed(6))),
    frame.uniforms.orientationQuaternion.map((value) => Number(value.toFixed(6)))
  );

  assert.equal(scaled.id, "overview+scale");
  assert.equal(scaled.fov, 36);
  assert.equal(scaled.uniforms.fovy, 36);
  assert.deepEqual(scaled.position, frame.position);
  assert.deepEqual(scaled.target, frame.target);

  assert.equal(rotated.id, "overview+rotate");
  assert.deepEqual(
    rotated.position.map((value) => Number(value.toFixed(6))),
    [4.598076, 3, 1.964102]
  );
  assert.deepEqual(rotated.target, frame.target);
  assert.equal(Number(rotated.eulerAngles.theta.toFixed(6)), 1.1671);
  assert.equal(Number(rotated.eulerAngles.phi.toFixed(6)), 0.431139);
  assert.equal(rotated.fov, 48);

  assert.equal(restored.id, "overview");
  assert.deepEqual(restored.position, frame.position);
  assert.deepEqual(restored.target, frame.target);
  assert.equal(restored.fov, frame.fov);
  assert.deepEqual(restored.uniforms, frame.uniforms);
});

test("mathCameraDirector consumes CameraFrame transition state without renderer imports", () => {
  const directorSource = fs.readFileSync("components/visualizations/three/manim/mathCameraDirector.ts", "utf8");
  const frameSource = fs.readFileSync("components/visualizations/three/manim/mathCameraFrame.ts", "utf8");

  assert.match(directorSource, /buildCameraFrameTransition/);
  assert.match(directorSource, /frame:/);
  assert.match(frameSource, /buildCameraFrameState/);
  assert.match(frameSource, /CAMERA_FRAME_SOURCE_CONTRACT/);
  assert.match(frameSource, /inverseViewMatrix/);
  assert.match(frameSource, /eulerAngles/);
  assert.match(frameSource, /theta/);
  assert.match(frameSource, /phi/);
  assert.match(frameSource, /gamma/);
  assert.match(frameSource, /uniforms/);
  assert.match(frameSource, /orientationQuaternion/);
  assert.match(frameSource, /fovy/);
  assert.match(frameSource, /shape/);
  assert.match(frameSource, /center/);
  assert.match(frameSource, /shiftCameraFrame/);
  assert.match(frameSource, /scaleCameraFrame/);
  assert.match(frameSource, /rotateCameraFrameAroundTarget/);
  assert.match(frameSource, /restoreCameraFrame/);
  assert.doesNotMatch(frameSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
