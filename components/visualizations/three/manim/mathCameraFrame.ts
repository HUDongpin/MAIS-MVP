import { buildTimelineState } from "./mathTimeline";
import type { CameraShot, MathSceneSpec, Vec3 } from "./mathSceneTypes";

export const CAMERA_FRAME_SOURCE_CONTRACT =
  "CameraFrame: mobject-like frame stores center/shape/euler/uniforms; fixed-in-frame overlays stay attached while camera animates" as const;

export const CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT =
  "CameraFrame: viewMatrix/inverseViewMatrix round-trip world points through camera coordinates" as const;

export type CameraFrameOrientation = {
  forward: Vec3;
  right: Vec3;
  up: Vec3;
};

export type CameraFrameEulerAngles = {
  gamma: number;
  phi: number;
  theta: number;
};

export type CameraFrameQuaternion = [number, number, number, number];

export type CameraFrameShape = [number, number];

export type CameraFrameUniforms = {
  center: Vec3;
  fovy: number;
  orientationQuaternion: CameraFrameQuaternion;
  shape: CameraFrameShape;
};

export type CameraFrameState = {
  eulerAngles: CameraFrameEulerAngles;
  fixedInFrameOverlay: true;
  fov: number;
  id: string;
  inverseViewMatrix: number[];
  orientation: CameraFrameOrientation;
  position: Vec3;
  progress: number;
  sourceContract: typeof CAMERA_FRAME_SOURCE_CONTRACT;
  target: Vec3;
  uniforms: CameraFrameUniforms;
  viewMatrix: number[];
};

export type CameraFrameTransitionState = {
  activeShotId: string;
  canonicalFrame: CameraFrameState;
  frame: CameraFrameState;
  progress: number;
  resetFrame: CameraFrameState;
};

export type CameraFramePointRoundTrip = {
  cameraPoint: Vec3;
  frameId: string;
  restoredWorldPoint: Vec3;
  roundTripMaxError: number;
  sourceContract: typeof CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT;
  worldPoint: Vec3;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function round(value: number, places = 12) {
  const scaleFactor = 10 ** places;
  return Math.round(finite(value, 0) * scaleFactor) / scaleFactor;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function vec3(value: Vec3, fallback: Vec3): Vec3 {
  return [
    finite(value[0], fallback[0]),
    finite(value[1], fallback[1]),
    finite(value[2], fallback[2])
  ];
}

function add(left: Vec3, right: Vec3): Vec3 {
  return [round(left[0] + right[0]), round(left[1] + right[1]), round(left[2] + right[2])];
}

function sub(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function dot(left: Vec3, right: Vec3) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function scale(value: Vec3, factor: number): Vec3 {
  return [value[0] * factor, value[1] * factor, value[2] * factor];
}

function normalize(value: Vec3, fallback: Vec3): Vec3 {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (!Number.isFinite(length) || length <= 1e-9) return fallback;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function lerpVec3(start: Vec3, end: Vec3, progress: number): Vec3 {
  return [
    lerp(start[0], end[0], progress),
    lerp(start[1], end[1], progress),
    lerp(start[2], end[2], progress)
  ];
}

function orientationFor(position: Vec3, target: Vec3): CameraFrameOrientation {
  const worldUp: Vec3 = [0, 1, 0];
  const forward = normalize(sub(target, position), [0, 0, -1]);
  const right = normalize(cross(forward, worldUp), [1, 0, 0]);
  const up = normalize(cross(right, forward), [0, 1, 0]);

  return { forward, right, up };
}

function eulerAnglesFor(position: Vec3, target: Vec3): CameraFrameEulerAngles {
  const offset = sub(position, target);
  const horizontalRadius = Math.hypot(offset[0], offset[2]);

  return {
    gamma: 0,
    phi: finite(Math.atan2(offset[1], horizontalRadius), 0),
    theta: finite(Math.atan2(offset[0], offset[2]), 0)
  };
}

function normalizeQuaternion(value: CameraFrameQuaternion): CameraFrameQuaternion {
  const length = Math.hypot(value[0], value[1], value[2], value[3]);
  if (!Number.isFinite(length) || length <= 1e-9) return [0, 0, 0, 1];

  return [value[0] / length, value[1] / length, value[2] / length, value[3] / length];
}

function orientationQuaternionFor(orientation: CameraFrameOrientation): CameraFrameQuaternion {
  const { right, up, forward } = orientation;
  const backward = scale(forward, -1);
  const m00 = right[0];
  const m01 = up[0];
  const m02 = backward[0];
  const m10 = right[1];
  const m11 = up[1];
  const m12 = backward[1];
  const m20 = right[2];
  const m21 = up[2];
  const m22 = backward[2];
  const trace = m00 + m11 + m22;
  let quaternion: CameraFrameQuaternion;

  if (trace > 0) {
    const scaleFactor = Math.sqrt(trace + 1) * 2;
    quaternion = [
      (m21 - m12) / scaleFactor,
      (m02 - m20) / scaleFactor,
      (m10 - m01) / scaleFactor,
      0.25 * scaleFactor
    ];
  } else if (m00 > m11 && m00 > m22) {
    const scaleFactor = Math.sqrt(1 + m00 - m11 - m22) * 2;
    quaternion = [
      0.25 * scaleFactor,
      (m01 + m10) / scaleFactor,
      (m02 + m20) / scaleFactor,
      (m21 - m12) / scaleFactor
    ];
  } else if (m11 > m22) {
    const scaleFactor = Math.sqrt(1 + m11 - m00 - m22) * 2;
    quaternion = [
      (m01 + m10) / scaleFactor,
      0.25 * scaleFactor,
      (m12 + m21) / scaleFactor,
      (m02 - m20) / scaleFactor
    ];
  } else {
    const scaleFactor = Math.sqrt(1 + m22 - m00 - m11) * 2;
    quaternion = [
      (m02 + m20) / scaleFactor,
      (m12 + m21) / scaleFactor,
      0.25 * scaleFactor,
      (m10 - m01) / scaleFactor
    ];
  }

  return normalizeQuaternion(quaternion);
}

function uniformsFor(target: Vec3, orientation: CameraFrameOrientation, fov: number): CameraFrameUniforms {
  return {
    center: target,
    fovy: fov,
    orientationQuaternion: orientationQuaternionFor(orientation),
    shape: [16, 9]
  };
}

function viewMatrixFor(position: Vec3, orientation: CameraFrameOrientation) {
  const { forward, right, up } = orientation;
  const backward = scale(forward, -1);

  return [
    right[0], up[0], backward[0], 0,
    right[1], up[1], backward[1], 0,
    right[2], up[2], backward[2], 0,
    -dot(right, position), -dot(up, position), -dot(backward, position), 1
  ];
}

function inverseViewMatrixFor(position: Vec3, orientation: CameraFrameOrientation) {
  const { forward, right, up } = orientation;
  const backward = scale(forward, -1);

  return [
    right[0], right[1], right[2], 0,
    up[0], up[1], up[2], 0,
    backward[0], backward[1], backward[2], 0,
    position[0], position[1], position[2], 1
  ];
}

const identityMatrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function matrixEntry(matrix: number[], index: number) {
  if (matrix.length !== 16) return identityMatrix4[index];
  return finite(matrix[index], identityMatrix4[index]);
}

export function transformCameraFramePoint(matrix: number[], point: Vec3): Vec3 {
  const safePoint = vec3(point, [0, 0, 0]);
  const x = safePoint[0];
  const y = safePoint[1];
  const z = safePoint[2];
  const tx =
    matrixEntry(matrix, 0) * x +
    matrixEntry(matrix, 4) * y +
    matrixEntry(matrix, 8) * z +
    matrixEntry(matrix, 12);
  const ty =
    matrixEntry(matrix, 1) * x +
    matrixEntry(matrix, 5) * y +
    matrixEntry(matrix, 9) * z +
    matrixEntry(matrix, 13);
  const tz =
    matrixEntry(matrix, 2) * x +
    matrixEntry(matrix, 6) * y +
    matrixEntry(matrix, 10) * z +
    matrixEntry(matrix, 14);
  const tw =
    matrixEntry(matrix, 3) * x +
    matrixEntry(matrix, 7) * y +
    matrixEntry(matrix, 11) * z +
    matrixEntry(matrix, 15);

  if (Math.abs(tw) > 1e-12 && Math.abs(tw - 1) > 1e-12) {
    return [tx / tw, ty / tw, tz / tw];
  }

  return [tx, ty, tz];
}

function maxVecDelta(left: Vec3, right: Vec3) {
  return Math.max(
    Math.abs(left[0] - right[0]),
    Math.abs(left[1] - right[1]),
    Math.abs(left[2] - right[2])
  );
}

function withoutSignedZero(value: number) {
  return Math.abs(value) <= 1e-12 ? 0 : value;
}

export function projectWorldPointThroughCameraFrame(frame: CameraFrameState, worldPoint: Vec3): CameraFramePointRoundTrip {
  const safeWorldPoint = vec3(worldPoint, [0, 0, 0]);
  const cameraPoint = transformCameraFramePoint(frame.viewMatrix, safeWorldPoint).map(withoutSignedZero) as Vec3;
  const restoredWorldPoint = transformCameraFramePoint(frame.inverseViewMatrix, cameraPoint).map(withoutSignedZero) as Vec3;

  return {
    cameraPoint,
    frameId: frame.id,
    restoredWorldPoint,
    roundTripMaxError: maxVecDelta(safeWorldPoint, restoredWorldPoint),
    sourceContract: CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT,
    worldPoint: safeWorldPoint
  };
}

export function buildCameraFrameState(shot: CameraShot, options: { progress?: number } = {}): CameraFrameState {
  const position = vec3(shot.position, [0, 0, 5]);
  const target = vec3(shot.target, [0, 0, 0]);
  const orientation = orientationFor(position, target);
  const fov = finite(shot.fov ?? 48, 48);

  return {
    fixedInFrameOverlay: true,
    fov,
    id: shot.id,
    eulerAngles: eulerAnglesFor(position, target),
    inverseViewMatrix: inverseViewMatrixFor(position, orientation),
    orientation,
    position,
    progress: clamp01(options.progress ?? 1),
    sourceContract: CAMERA_FRAME_SOURCE_CONTRACT,
    target,
    uniforms: uniformsFor(target, orientation, fov),
    viewMatrix: viewMatrixFor(position, orientation)
  };
}

export function shiftCameraFrame(frame: CameraFrameState, vector: Vec3): CameraFrameState {
  const safeVector = vec3(vector, [0, 0, 0]);

  return buildCameraFrameState(
    {
      fov: frame.fov,
      id: `${frame.id}+shift`,
      position: add(frame.position, safeVector),
      target: add(frame.target, safeVector)
    },
    { progress: frame.progress }
  );
}

export function scaleCameraFrame(frame: CameraFrameState, factor: number): CameraFrameState {
  const safeFactor = Math.max(0.01, finite(factor, 1));

  return buildCameraFrameState(
    {
      fov: frame.fov * safeFactor,
      id: `${frame.id}+scale`,
      position: frame.position,
      target: frame.target
    },
    { progress: frame.progress }
  );
}

function rotateAroundY(offset: Vec3, degrees: number): Vec3 {
  const radians = (finite(degrees, 0) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return [
    offset[0] * cos + offset[2] * sin,
    offset[1],
    -offset[0] * sin + offset[2] * cos
  ];
}

export function rotateCameraFrameAroundTarget(frame: CameraFrameState, degrees: number): CameraFrameState {
  const rotatedOffset = rotateAroundY(sub(frame.position, frame.target), degrees);

  return buildCameraFrameState(
    {
      fov: frame.fov,
      id: `${frame.id}+rotate`,
      position: add(frame.target, rotatedOffset),
      target: frame.target
    },
    { progress: frame.progress }
  );
}

export function restoreCameraFrame(_frame: CameraFrameState, savedFrame: CameraFrameState): CameraFrameState {
  return buildCameraFrameState(
    {
      fov: savedFrame.fov,
      id: savedFrame.id,
      position: savedFrame.position,
      target: savedFrame.target
    },
    { progress: savedFrame.progress }
  );
}

export function interpolateCameraFrames(from: CameraFrameState, to: CameraFrameState, progress: number): CameraFrameState {
  const alpha = clamp01(progress);

  return buildCameraFrameState(
    {
      fov: lerp(from.fov, to.fov, alpha),
      id: alpha >= 1 ? to.id : `${from.id}->${to.id}`,
      position: lerpVec3(from.position, to.position, alpha),
      target: lerpVec3(from.target, to.target, alpha)
    },
    { progress: alpha }
  );
}

export function buildCameraFrameTransition(scene: MathSceneSpec, elapsedSeconds: number): CameraFrameTransitionState {
  const canonicalShot = scene.cameraShots[0] ?? { id: "default", position: [0, 0, 5] as Vec3, target: [0, 0, 0] as Vec3, fov: 48 };
  const canonicalFrame = buildCameraFrameState(canonicalShot);
  const timelineState = buildTimelineState(scene.timeline, elapsedSeconds);
  const activeStep = timelineState.activeStep;
  const activeShot = activeStep?.type === "cameraTo"
    ? scene.cameraShots.find((shot) => shot.id === activeStep.shotId) ?? canonicalShot
    : canonicalShot;
  const activeFrame = buildCameraFrameState(activeShot);
  const rawProgress = activeStep?.type === "cameraTo" ? timelineState.easedLocalProgress : 1;
  const progress = rawProgress >= 1 - 1e-9 ? 1 : rawProgress <= 1e-9 ? 0 : rawProgress;

  return {
    activeShotId: activeShot.id,
    canonicalFrame,
    frame: activeShot.id === canonicalShot.id ? canonicalFrame : interpolateCameraFrames(canonicalFrame, activeFrame, progress),
    progress,
    resetFrame: canonicalFrame
  };
}
