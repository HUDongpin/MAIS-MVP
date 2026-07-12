import { buildTimelineState } from "./mathTimeline";
import { buildCameraFrameTransition, type CameraFrameState } from "./mathCameraFrame";
import { applyCameraFrameUpdaters } from "./mathCameraFrameUpdater";
import type { AnimationStep, CameraShot, MathSceneSpec, Vec3 } from "./mathSceneTypes";

export const CAMERA_DIRECTOR_SOURCE_CONTRACT = "CameraFrame->CameraDirector|timeline cameraTo";

export type CameraDirectorState = {
  activeShotId: string;
  cameraAmbientRotationDegrees: number;
  cameraUpdaterActiveCount: number;
  cameraUpdaterActiveIds: string[];
  cameraUpdaterActiveSeconds: number;
  cameraUpdaterActiveWindowSummary: string;
  cameraUpdaterCount: number;
  cameraUpdaterTimeMode: "delta" | "elapsed";
  canonicalFrame: CameraFrameState;
  canonicalShotId: string;
  frame: CameraFrameState;
  progress: number;
  resetFrame: CameraFrameState;
  resetShotId: string;
  shot: CameraShot | null;
};

export type CameraDirectorEvidence = {
  activeShotId: string;
  activeUpdaterCount: number;
  activeUpdaterIds: string;
  ambientRotationDegrees: number;
  canonicalShotId: string;
  progress: number;
  resetShotId: string;
  shotFov: number;
  shotPosition: string;
  shotTarget: string;
  sourceContract: typeof CAMERA_DIRECTOR_SOURCE_CONTRACT;
  summary: string;
  timelineShotId: string;
  transitionSummary: string;
  updaterCount: number;
};

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatNumber(value: number) {
  return roundNumber(value).toFixed(3);
}

function roundNumber(value: number) {
  const rounded = Math.round(finite(value, 0) * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatVec3(value: Vec3 | undefined) {
  if (!value) return "none";
  return value.map((entry) => formatNumber(entry)).join(",");
}

function sameVec3(a: Vec3, b: Vec3) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
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
  const frameTransition = buildCameraFrameTransition(scene, elapsedSeconds);
  const timelineState = buildTimelineState(scene.timeline, elapsedSeconds);
  const timelineShot = cameraShotForTimeline(scene.timeline, scene.cameraShots, elapsedSeconds);
  const activeShot = timelineShot ?? canonicalShot;
  const progress = timelineShot
    ? timelineState.easedLocalProgress >= 1 - 1e-9
      ? 1
      : timelineState.easedLocalProgress <= 1e-9
        ? 0
        : timelineState.easedLocalProgress
    : 1;
  const shot = canonicalShot && timelineShot
    ? interpolateCameraShot(canonicalShot, timelineShot, progress)
    : activeShot;
  const cameraUpdaterResult = applyCameraFrameUpdaters(frameTransition.frame, scene.cameraUpdaters, elapsedSeconds);

  return {
    activeShotId: activeShot?.id ?? "default",
    cameraAmbientRotationDegrees: cameraUpdaterResult.ambientRotationDegrees,
    cameraUpdaterActiveCount: cameraUpdaterResult.activeUpdaterCount,
    cameraUpdaterActiveIds: cameraUpdaterResult.activeUpdaterIds,
    cameraUpdaterActiveSeconds: cameraUpdaterResult.ambientRotationActiveSeconds,
    cameraUpdaterActiveWindowSummary: cameraUpdaterResult.activeWindowSummary,
    cameraUpdaterCount: cameraUpdaterResult.updaterCount,
    cameraUpdaterTimeMode: cameraUpdaterResult.timeMode,
    canonicalFrame: frameTransition.canonicalFrame,
    canonicalShotId: canonicalShot?.id ?? "default",
    frame: cameraUpdaterResult.frame,
    progress,
    resetFrame: frameTransition.resetFrame,
    resetShotId: canonicalShot?.id ?? "default",
    shot: shot && canonicalShot && sameVec3(shot.position, canonicalShot.position) && sameVec3(shot.target, canonicalShot.target)
      ? canonicalShot
      : shot
  };
}

export function buildCameraDirectorEvidence(scene: MathSceneSpec, elapsedSeconds: number): CameraDirectorEvidence {
  const director = buildCameraDirectorState(scene, elapsedSeconds);
  const timelineShot = cameraShotForTimeline(scene.timeline, scene.cameraShots, elapsedSeconds);
  const timelineShotId = timelineShot?.id ?? "none";
  const transitionTargetId = timelineShot?.id ?? director.activeShotId;
  const shotFov = roundNumber(finite(director.shot?.fov, director.frame.fov));
  const progress = roundNumber(finite(director.progress, 1));
  const ambientRotationDegrees = roundNumber(finite(director.cameraAmbientRotationDegrees, 0));
  const activeUpdaterIds = director.cameraUpdaterActiveIds.join(",") || "none";
  const transitionSummary = [
    "camera-director-transition",
    `${director.canonicalShotId}->${transitionTargetId}@${formatNumber(progress)}`
  ].join(":");
  const summary = [
    `camera-director:active=${director.activeShotId}`,
    `canonical=${director.canonicalShotId}`,
    `reset=${director.resetShotId}`,
    `timeline=${timelineShotId}`,
    `progress=${formatNumber(progress)}`,
    `updaters=${director.cameraUpdaterCount}`,
    `activeUpdaters=${director.cameraUpdaterActiveCount}`,
    `ambient=${formatNumber(ambientRotationDegrees)}`
  ].join(":");

  return {
    activeShotId: director.activeShotId,
    activeUpdaterCount: director.cameraUpdaterActiveCount,
    activeUpdaterIds,
    ambientRotationDegrees,
    canonicalShotId: director.canonicalShotId,
    progress,
    resetShotId: director.resetShotId,
    shotFov,
    shotPosition: formatVec3(director.shot?.position),
    shotTarget: formatVec3(director.shot?.target),
    sourceContract: CAMERA_DIRECTOR_SOURCE_CONTRACT,
    summary,
    timelineShotId,
    transitionSummary,
    updaterCount: director.cameraUpdaterCount
  };
}

export function cameraDirectorEvidenceDataAttributes(evidence: CameraDirectorEvidence) {
  return {
    "data-viz-manim-camera-director-active-shot": evidence.activeShotId,
    "data-viz-manim-camera-director-canonical-shot": evidence.canonicalShotId,
    "data-viz-manim-camera-director-reset-shot": evidence.resetShotId,
    "data-viz-manim-camera-director-timeline-shot": evidence.timelineShotId,
    "data-viz-manim-camera-director-progress": formatNumber(evidence.progress),
    "data-viz-manim-camera-director-transition-summary": evidence.transitionSummary,
    "data-viz-manim-camera-director-updater-count": String(evidence.updaterCount),
    "data-viz-manim-camera-director-active-updater-count": String(evidence.activeUpdaterCount),
    "data-viz-manim-camera-director-active-updater-ids": evidence.activeUpdaterIds,
    "data-viz-manim-camera-director-ambient-rotation-degrees": formatNumber(evidence.ambientRotationDegrees),
    "data-viz-manim-camera-director-shot-position": evidence.shotPosition,
    "data-viz-manim-camera-director-shot-target": evidence.shotTarget,
    "data-viz-manim-camera-director-shot-fov": formatNumber(evidence.shotFov),
    "data-viz-manim-camera-director-source-contract": evidence.sourceContract,
    "data-viz-manim-camera-director-summary": evidence.summary
  } as const;
}

export function serializeCameraDirectorEvidence(evidence: CameraDirectorEvidence) {
  return stableSerialize(evidence);
}
