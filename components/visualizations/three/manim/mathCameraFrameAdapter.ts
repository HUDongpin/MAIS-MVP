import type { CameraFrameState } from "./mathCameraFrame";
import type { Vec3 } from "./mathSceneTypes";

export type ThreeCameraFrameVector = {
  x: number;
  y: number;
  z: number;
};

export type ThreeCameraFrameAdapterState = {
  fov: number;
  id: string;
  position: ThreeCameraFrameVector;
  progress: number;
  smokeState: string;
  target: ThreeCameraFrameVector;
};

const defaultPosition: Vec3 = [0, 0, 5];
const defaultTarget: Vec3 = [0, 0, 0];

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function finiteVec3(value: Vec3, fallback: Vec3): Vec3 {
  return [
    finite(value[0], fallback[0]),
    finite(value[1], fallback[1]),
    finite(value[2], fallback[2])
  ];
}

function finiteFov(value: number) {
  return Math.min(120, Math.max(1, finite(value, 48)));
}

function finiteProgress(value: number) {
  return Math.min(1, Math.max(0, finite(value, 1)));
}

function vectorForThree(value: Vec3): ThreeCameraFrameVector {
  return { x: value[0], y: value[1], z: value[2] };
}

function vectorSmokeState(value: ThreeCameraFrameVector) {
  return `${value.x.toFixed(2)},${value.y.toFixed(2)},${value.z.toFixed(2)}`;
}

export function cameraFrameAdapterForThree(frame: CameraFrameState): ThreeCameraFrameAdapterState {
  const position = vectorForThree(finiteVec3(frame.position, defaultPosition));
  const target = vectorForThree(finiteVec3(frame.target, defaultTarget));
  const fov = finiteFov(frame.fov);
  const id = frame.id || "default";

  return {
    fov,
    id,
    position,
    progress: finiteProgress(frame.progress),
    smokeState: `shot=${id};fov=${fov.toFixed(2)};position=${vectorSmokeState(position)};target=${vectorSmokeState(target)}`,
    target
  };
}
