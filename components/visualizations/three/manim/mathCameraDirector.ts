import { buildTimelineState } from "./mathTimeline";
import type { AnimationStep, CameraShot, MathSceneSpec, Vec3 } from "./mathSceneTypes";

export type CameraDirectorState = {
  activeShotId: string;
  canonicalShotId: string;
  progress: number;
  resetShotId: string;
  shot: CameraShot | null;
};

function sameVec3(a: Vec3, b: Vec3) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function cameraShotForTimeline(timeline: AnimationStep[], cameraShots: CameraShot[], elapsedSeconds: number) {
  const timelineState = buildTimelineState(timeline, elapsedSeconds);
  const activeStep = timelineState.activeStep;
  if (!activeStep || activeStep.type !== "cameraTo") return null;

  return cameraShots.find((shot) => shot.id === activeStep.shotId) ?? null;
}

export function interpolateCameraShot(from: CameraShot, to: CameraShot, progress: number): CameraShot {
  const alpha = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const lerp = (a: number, b: number) => a + (b - a) * alpha;

  return {
    fov: from.fov === undefined && to.fov === undefined ? undefined : lerp(from.fov ?? to.fov ?? 48, to.fov ?? from.fov ?? 48),
    id: alpha >= 1 ? to.id : `${from.id}->${to.id}`,
    position: [
      lerp(from.position[0], to.position[0]),
      lerp(from.position[1], to.position[1]),
      lerp(from.position[2], to.position[2])
    ],
    target: [
      lerp(from.target[0], to.target[0]),
      lerp(from.target[1], to.target[1]),
      lerp(from.target[2], to.target[2])
    ]
  };
}

export function buildCameraDirectorState(scene: MathSceneSpec, elapsedSeconds: number): CameraDirectorState {
  const canonicalShot = scene.cameraShots[0] ?? null;
  const timelineState = buildTimelineState(scene.timeline, elapsedSeconds);
  const timelineShot = cameraShotForTimeline(scene.timeline, scene.cameraShots, elapsedSeconds);
  const activeShot = timelineShot ?? canonicalShot;
  const progress = timelineShot
    ? timelineState.localProgress >= 1 - 1e-9
      ? 1
      : timelineState.localProgress <= 1e-9
        ? 0
        : timelineState.localProgress
    : 1;
  const shot = canonicalShot && timelineShot
    ? interpolateCameraShot(canonicalShot, timelineShot, progress)
    : activeShot;

  return {
    activeShotId: activeShot?.id ?? "default",
    canonicalShotId: canonicalShot?.id ?? "default",
    progress,
    resetShotId: canonicalShot?.id ?? "default",
    shot: shot && canonicalShot && sameVec3(shot.position, canonicalShot.position) && sameVec3(shot.target, canonicalShot.target)
      ? canonicalShot
      : shot
  };
}
