import type { CameraDirectorState } from "./mathCameraDirector";
import {
  CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT,
  CAMERA_FRAME_SOURCE_CONTRACT,
  projectWorldPointThroughCameraFrame
} from "./mathCameraFrame";
import type { CameraFrameEulerAngles, CameraFrameOrientation, CameraFrameState, CameraFrameUniforms } from "./mathCameraFrame";
import type { Vec3 } from "./mathSceneTypes";

export type CameraFramePayloadRowKind = "canonical" | "current" | "reset";

export type CameraFramePayloadRow = {
  eulerAngles: CameraFrameEulerAngles;
  finiteMatrixEntryCount: number;
  fixedInFrameOverlay: boolean;
  fov: number;
  frameId: string;
  inverseViewMatrix: number[];
  kind: CameraFramePayloadRowKind;
  matrixEntryCount: number;
  orientation: CameraFrameOrientation;
  position: Vec3;
  progress: number;
  shotId: string;
  target: Vec3;
  uniforms: CameraFrameUniforms;
  viewMatrix: number[];
};

export type CameraFramePayload = {
  activeShotId: string;
  canonicalShotId: string;
  currentEulerAngles: CameraFrameEulerAngles;
  currentFov: number;
  currentFrameId: string;
  currentCameraOriginPoint: Vec3;
  currentInverseViewMatrixSummary: string;
  currentInverseViewMatrixDeterminant: number;
  currentPosition: Vec3;
  currentProgress: number;
  currentTarget: Vec3;
  currentTargetCameraPoint: Vec3;
  currentUniforms: CameraFrameUniforms;
  currentViewMatrixDeterminant: number;
  currentViewMatrixSummary: string;
  finiteMatrixEntryCount: number;
  fixedInFrameOverlayCount: number;
  frameCount: number;
  matrixDeterminantMaxError: number;
  matrixDeterminantReady: boolean;
  matrixDeterminantSummary: string;
  matrixEntryCount: number;
  orientationOrthonormalMaxError: number;
  orientationOrthonormalReady: boolean;
  pointRoundTripMaxError: number;
  pointRoundTripReady: boolean;
  pointRoundTripSourceContract: typeof CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT;
  pointRoundTripSummary: string;
  resetShotId: string;
  restorableFrameCount: number;
  rows: CameraFramePayloadRow[];
  sceneId: string;
  signature: string;
  sourceContract: typeof CAMERA_FRAME_SOURCE_CONTRACT;
  uniformCount: number;
  uniformQuaternionMaxError: number;
  uniformQuaternionReady: boolean;
  uniformSummary: string;
  viewInverseMaxError: number;
  viewInverseReady: boolean;
};

export type CameraFramePayloadInput = {
  cameraDirector: CameraDirectorState;
  sceneId: string;
};

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `camera-frame-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function finiteNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function roundNumber(value: number, places = 6) {
  const scale = 10 ** places;
  return Math.round(finiteNumber(value) * scale) / scale;
}

function roundVec3(value: Vec3): Vec3 {
  return [roundNumber(value[0]), roundNumber(value[1]), roundNumber(value[2])];
}

function roundArray(values: number[]) {
  return values.map((value) => roundNumber(value));
}

function roundVec2(value: [number, number]): [number, number] {
  return [roundNumber(value[0]), roundNumber(value[1])];
}

function roundVec4(value: [number, number, number, number]): [number, number, number, number] {
  return [roundNumber(value[0]), roundNumber(value[1]), roundNumber(value[2]), roundNumber(value[3])];
}

function roundOrientation(orientation: CameraFrameOrientation): CameraFrameOrientation {
  return {
    forward: roundVec3(orientation.forward),
    right: roundVec3(orientation.right),
    up: roundVec3(orientation.up)
  };
}

function roundEulerAngles(eulerAngles: CameraFrameEulerAngles): CameraFrameEulerAngles {
  return {
    gamma: roundNumber(eulerAngles.gamma),
    phi: roundNumber(eulerAngles.phi),
    theta: roundNumber(eulerAngles.theta)
  };
}

function roundUniforms(uniforms: CameraFrameUniforms): CameraFrameUniforms {
  return {
    center: roundVec3(uniforms.center),
    fovy: roundNumber(uniforms.fovy),
    orientationQuaternion: roundVec4(uniforms.orientationQuaternion),
    shape: roundVec2(uniforms.shape)
  };
}

function finiteMatrixEntryCount(frame: CameraFrameState) {
  return [...frame.viewMatrix, ...frame.inverseViewMatrix].filter(Number.isFinite).length;
}

function vecLength(value: Vec3) {
  return Math.hypot(value[0], value[1], value[2]);
}

function vecDot(left: Vec3, right: Vec3) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function orientationOrthonormalMaxError(frame: CameraFrameState) {
  const { forward, right, up } = frame.orientation;

  return Math.max(
    Math.abs(vecLength(forward) - 1),
    Math.abs(vecLength(right) - 1),
    Math.abs(vecLength(up) - 1),
    Math.abs(vecDot(forward, right)),
    Math.abs(vecDot(forward, up)),
    Math.abs(vecDot(right, up))
  );
}

function uniformQuaternionMaxError(frame: CameraFrameState) {
  const [x, y, z, w] = frame.uniforms.orientationQuaternion;

  return Math.abs(Math.hypot(x, y, z, w) - 1);
}

function multiplyColumnMajorMatrix(left: number[], right: number[]) {
  return Array.from({ length: 16 }, (_, index) => {
    const column = Math.floor(index / 4);
    const row = index % 4;
    let sum = 0;

    for (let inner = 0; inner < 4; inner += 1) {
      sum += left[inner * 4 + row] * right[column * 4 + inner];
    }

    return sum;
  });
}

function maxIdentityError(matrix: number[]) {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return Math.max(0, ...matrix.map((entry, index) => Math.abs(entry - identity[index])));
}

function viewInverseMaxError(frame: CameraFrameState) {
  if (frame.viewMatrix.length !== 16 || frame.inverseViewMatrix.length !== 16) return Number.POSITIVE_INFINITY;
  return maxIdentityError(multiplyColumnMajorMatrix(frame.viewMatrix, frame.inverseViewMatrix));
}

function matrixDeterminant4x4(matrix: number[]) {
  if (matrix.length !== 16 || matrix.some((entry) => !Number.isFinite(entry))) return Number.NaN;

  const [
    a00, a01, a02, a03,
    a10, a11, a12, a13,
    a20, a21, a22, a23,
    a30, a31, a32, a33
  ] = matrix;
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}

function matrixDeterminantMaxError(frames: CameraFrameState[]) {
  return Math.max(
    0,
    ...frames.flatMap((frame) => [
      Math.abs(matrixDeterminant4x4(frame.viewMatrix) - 1),
      Math.abs(matrixDeterminant4x4(frame.inverseViewMatrix) - 1)
    ])
  );
}

function formatMatrixDeterminantSummary(
  viewDeterminant: number,
  inverseViewDeterminant: number,
  maxError: number,
  ready: boolean
) {
  return [
    `determinants:view=${formatSmallNumber(viewDeterminant)}`,
    `inverse=${formatSmallNumber(inverseViewDeterminant)}`,
    `maxError=${formatSmallNumber(maxError)}`,
    `ready=${ready}`
  ].join(":");
}

function frameRow(kind: CameraFramePayloadRowKind, shotId: string, frame: CameraFrameState): CameraFramePayloadRow {
  const viewMatrix = roundArray(frame.viewMatrix);
  const inverseViewMatrix = roundArray(frame.inverseViewMatrix);

  return {
    eulerAngles: roundEulerAngles(frame.eulerAngles),
    finiteMatrixEntryCount: finiteMatrixEntryCount(frame),
    fixedInFrameOverlay: frame.fixedInFrameOverlay,
    fov: roundNumber(frame.fov),
    frameId: frame.id || shotId,
    inverseViewMatrix,
    kind,
    matrixEntryCount: viewMatrix.length + inverseViewMatrix.length,
    orientation: roundOrientation(frame.orientation),
    position: roundVec3(frame.position),
    progress: roundNumber(frame.progress),
    shotId,
    target: roundVec3(frame.target),
    uniforms: roundUniforms(frame.uniforms),
    viewMatrix
  };
}

function formatNumber(value: number) {
  return value.toFixed(3);
}

function formatSmallNumber(value: number) {
  return value.toFixed(6);
}

function formatVec3(value: Vec3) {
  return value.map(formatNumber).join(",");
}

function formatNumberArray(values: number[]) {
  return values.map(formatNumber).join(",");
}

function formatEulerAngles(value: CameraFrameEulerAngles) {
  return `${formatNumber(value.theta)},${formatNumber(value.phi)},${formatNumber(value.gamma)}`;
}

function formatEulerSummary(value: CameraFrameEulerAngles) {
  return `theta=${formatNumber(value.theta)};phi=${formatNumber(value.phi)};gamma=${formatNumber(value.gamma)}`;
}

function formatPointRoundTripSummary(targetCameraPoint: Vec3, cameraOriginPoint: Vec3, maxError: number, ready: boolean) {
  return [
    `pointRoundTrip:target=${formatVec3(targetCameraPoint)}`,
    `origin=${formatVec3(cameraOriginPoint)}`,
    `maxError=${formatSmallNumber(maxError)}`,
    `ready=${ready}`
  ].join(":");
}

export function summarizeCameraFramePayload(payload: CameraFramePayload) {
  return `camera-frame:scene=${payload.sceneId}:active=${payload.activeShotId}:canonical=${payload.canonicalShotId}:progress=${formatNumber(payload.currentProgress)}:fov=${formatNumber(payload.currentFov)}:euler=${formatEulerAngles(payload.currentEulerAngles)}:fixed=${payload.fixedInFrameOverlayCount}:matrices=${payload.matrixEntryCount}:finite=${payload.finiteMatrixEntryCount}`;
}

export function buildCameraFramePayload({
  cameraDirector,
  sceneId
}: CameraFramePayloadInput): CameraFramePayload {
  const rows = [
    frameRow("current", cameraDirector.activeShotId, cameraDirector.frame),
    frameRow("canonical", cameraDirector.canonicalShotId, cameraDirector.canonicalFrame),
    frameRow("reset", cameraDirector.resetShotId, cameraDirector.resetFrame)
  ];

  const current = rows[0];
  const viewInverseMaxErrorValue = roundNumber(
    Math.max(0, ...[cameraDirector.frame, cameraDirector.canonicalFrame, cameraDirector.resetFrame].map(viewInverseMaxError)),
    12
  );
  const orientationOrthonormalMaxErrorValue = roundNumber(
    Math.max(
      0,
      ...[cameraDirector.frame, cameraDirector.canonicalFrame, cameraDirector.resetFrame].map(orientationOrthonormalMaxError)
    ),
    12
  );
  const uniformQuaternionMaxErrorValue = roundNumber(
    Math.max(
      0,
      ...[cameraDirector.frame, cameraDirector.canonicalFrame, cameraDirector.resetFrame].map(uniformQuaternionMaxError)
    ),
    12
  );
  const currentViewMatrixDeterminant = roundNumber(matrixDeterminant4x4(cameraDirector.frame.viewMatrix), 12);
  const currentInverseViewMatrixDeterminant = roundNumber(matrixDeterminant4x4(cameraDirector.frame.inverseViewMatrix), 12);
  const matrixDeterminantMaxErrorValue = roundNumber(
    matrixDeterminantMaxError([cameraDirector.frame, cameraDirector.canonicalFrame, cameraDirector.resetFrame]),
    12
  );
  const matrixDeterminantReady = matrixDeterminantMaxErrorValue <= 1e-9;
  const targetProjection = projectWorldPointThroughCameraFrame(cameraDirector.frame, cameraDirector.frame.target);
  const cameraOriginProjection = projectWorldPointThroughCameraFrame(cameraDirector.frame, cameraDirector.frame.position);
  const currentTargetCameraPoint = roundVec3(targetProjection.cameraPoint);
  const currentCameraOriginPoint = roundVec3(cameraOriginProjection.cameraPoint);
  const pointRoundTripMaxError = roundNumber(
    Math.max(targetProjection.roundTripMaxError, cameraOriginProjection.roundTripMaxError),
    12
  );
  const pointRoundTripReady = pointRoundTripMaxError <= 1e-9;
  const pointRoundTripSummary = formatPointRoundTripSummary(
    currentTargetCameraPoint,
    currentCameraOriginPoint,
    pointRoundTripMaxError,
    pointRoundTripReady
  );
  const basePayload = {
    activeShotId: cameraDirector.activeShotId,
    canonicalShotId: cameraDirector.canonicalShotId,
    currentEulerAngles: current.eulerAngles,
    currentFov: current.fov,
    currentFrameId: current.frameId,
    currentCameraOriginPoint,
    currentInverseViewMatrixDeterminant,
    currentInverseViewMatrixSummary: formatNumberArray(current.inverseViewMatrix),
    currentPosition: current.position,
    currentProgress: current.progress,
    currentTarget: current.target,
    currentTargetCameraPoint,
    currentUniforms: current.uniforms,
    currentViewMatrixDeterminant,
    currentViewMatrixSummary: formatNumberArray(current.viewMatrix),
    finiteMatrixEntryCount: rows.reduce((sum, row) => sum + row.finiteMatrixEntryCount, 0),
    fixedInFrameOverlayCount: rows.filter((row) => row.fixedInFrameOverlay).length,
    frameCount: rows.length,
    matrixDeterminantMaxError: matrixDeterminantMaxErrorValue,
    matrixDeterminantReady,
    matrixDeterminantSummary: formatMatrixDeterminantSummary(
      currentViewMatrixDeterminant,
      currentInverseViewMatrixDeterminant,
      matrixDeterminantMaxErrorValue,
      matrixDeterminantReady
    ),
    matrixEntryCount: rows.reduce((sum, row) => sum + row.matrixEntryCount, 0),
    orientationOrthonormalMaxError: orientationOrthonormalMaxErrorValue,
    orientationOrthonormalReady: orientationOrthonormalMaxErrorValue <= 1e-9,
    pointRoundTripMaxError,
    pointRoundTripReady,
    pointRoundTripSourceContract: CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT,
    pointRoundTripSummary,
    resetShotId: cameraDirector.resetShotId,
    restorableFrameCount: rows.filter((row) => row.kind === "reset").length,
    rows,
    sceneId,
    sourceContract: CAMERA_FRAME_SOURCE_CONTRACT,
    uniformCount: 4,
    uniformQuaternionMaxError: uniformQuaternionMaxErrorValue,
    uniformQuaternionReady: uniformQuaternionMaxErrorValue <= 1e-9,
    uniformSummary: "uniforms=center,fovy,orientationQuaternion,shape",
    viewInverseMaxError: viewInverseMaxErrorValue,
    viewInverseReady: viewInverseMaxErrorValue <= 1e-9
  };

  return {
    ...basePayload,
    signature: hashStableJson(stableSerialize(basePayload))
  };
}

export function serializeCameraFramePayload(payload: CameraFramePayload) {
  return escapedJson(stableSerialize(payload));
}

export function cameraFramePayloadDataAttributes(payload: CameraFramePayload) {
  return {
    "data-viz-manim-camera-frame-active-shot": payload.activeShotId,
    "data-viz-manim-camera-frame-canonical-shot": payload.canonicalShotId,
    "data-viz-manim-camera-frame-count": String(payload.frameCount),
    "data-viz-manim-camera-frame-current-id": payload.currentFrameId,
    "data-viz-manim-camera-frame-euler-summary": formatEulerSummary(payload.currentEulerAngles),
    "data-viz-manim-camera-frame-finite-matrix-count": String(payload.finiteMatrixEntryCount),
    "data-viz-manim-camera-frame-fixed-overlay-count": String(payload.fixedInFrameOverlayCount),
    "data-viz-manim-camera-frame-fov": formatNumber(payload.currentFov),
    "data-viz-manim-camera-frame-gamma": formatNumber(payload.currentEulerAngles.gamma),
    "data-viz-manim-camera-frame-inverse-view-matrix-determinant": formatSmallNumber(payload.currentInverseViewMatrixDeterminant),
    "data-viz-manim-camera-frame-inverse-view-matrix-summary": payload.currentInverseViewMatrixSummary,
    "data-viz-manim-camera-frame-matrix-determinant-max-error": formatSmallNumber(payload.matrixDeterminantMaxError),
    "data-viz-manim-camera-frame-matrix-determinant-ready": String(payload.matrixDeterminantReady),
    "data-viz-manim-camera-frame-matrix-determinant-summary": payload.matrixDeterminantSummary,
    "data-viz-manim-camera-frame-matrix-count": String(payload.matrixEntryCount),
    "data-viz-manim-camera-frame-orientation-orthonormal-max-error": formatSmallNumber(payload.orientationOrthonormalMaxError),
    "data-viz-manim-camera-frame-orientation-orthonormal-ready": String(payload.orientationOrthonormalReady),
    "data-viz-manim-camera-frame-phi": formatNumber(payload.currentEulerAngles.phi),
    "data-viz-manim-camera-frame-position": formatVec3(payload.currentPosition),
    "data-viz-manim-camera-frame-point-roundtrip-max-error": formatSmallNumber(payload.pointRoundTripMaxError),
    "data-viz-manim-camera-frame-point-roundtrip-ready": String(payload.pointRoundTripReady),
    "data-viz-manim-camera-frame-point-roundtrip-source-contract": payload.pointRoundTripSourceContract,
    "data-viz-manim-camera-frame-point-roundtrip-summary": payload.pointRoundTripSummary,
    "data-viz-manim-camera-frame-progress": formatNumber(payload.currentProgress),
    "data-viz-manim-camera-frame-reset-shot": payload.resetShotId,
    "data-viz-manim-camera-frame-restorable-count": String(payload.restorableFrameCount),
    "data-viz-manim-camera-frame-signature": payload.signature,
    "data-viz-manim-camera-frame-source-contract": payload.sourceContract,
    "data-viz-manim-camera-frame-summary": summarizeCameraFramePayload(payload),
    "data-viz-manim-camera-frame-target": formatVec3(payload.currentTarget),
    "data-viz-manim-camera-frame-target-camera-point": formatVec3(payload.currentTargetCameraPoint),
    "data-viz-manim-camera-frame-theta": formatNumber(payload.currentEulerAngles.theta),
    "data-viz-manim-camera-frame-origin-camera-point": formatVec3(payload.currentCameraOriginPoint),
    "data-viz-manim-camera-frame-uniform-center": formatVec3(payload.currentUniforms.center),
    "data-viz-manim-camera-frame-uniform-count": String(payload.uniformCount),
    "data-viz-manim-camera-frame-uniform-fovy": formatNumber(payload.currentUniforms.fovy),
    "data-viz-manim-camera-frame-uniform-orientation-quaternion": formatNumberArray(payload.currentUniforms.orientationQuaternion),
    "data-viz-manim-camera-frame-uniform-quaternion-max-error": formatSmallNumber(payload.uniformQuaternionMaxError),
    "data-viz-manim-camera-frame-uniform-quaternion-ready": String(payload.uniformQuaternionReady),
    "data-viz-manim-camera-frame-uniform-shape": formatNumberArray(payload.currentUniforms.shape),
    "data-viz-manim-camera-frame-uniform-summary": payload.uniformSummary,
    "data-viz-manim-camera-frame-view-inverse-max-error": formatSmallNumber(payload.viewInverseMaxError),
    "data-viz-manim-camera-frame-view-inverse-ready": String(payload.viewInverseReady),
    "data-viz-manim-camera-frame-view-matrix-determinant": formatSmallNumber(payload.currentViewMatrixDeterminant),
    "data-viz-manim-camera-frame-view-matrix-summary": payload.currentViewMatrixSummary,
    "data-viz-manim-camera-frame-operation-count": "0",
    "data-viz-manim-camera-frame-operation-ids": "none",
    "data-viz-manim-camera-frame-operation-summary": "operations=none",
    "data-viz-manim-camera-frame-restored-id": "none",
    "data-viz-manim-camera-frame-rotated-theta": "0.000",
    "data-viz-manim-camera-frame-scaled-fovy": "0.000",
    "data-viz-manim-camera-frame-shifted-center": "0.000,0.000,0.000"
  };
}
