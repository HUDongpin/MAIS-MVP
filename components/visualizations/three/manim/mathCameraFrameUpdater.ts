import { buildCameraFrameState, buildCameraFrameTransition, type CameraFrameState } from "./mathCameraFrame";
import type { MathSceneCameraUpdaterSpec, MathSceneSpec, Vec3 } from "./mathSceneTypes";

export const CAMERA_FRAME_UPDATER_SOURCE_CONTRACT =
  "CameraFrame updater: camera.frame.add_updater ambient rotation mutates the mobject-like frame before rendering" as const;

export type CameraFrameUpdaterResult = {
  activeUpdaterCount: number;
  activeUpdaterIds: string[];
  activeWindowSummary: string;
  ambientRotationActiveSeconds: number;
  ambientRotationDegrees: number;
  frame: CameraFrameState;
  sourceContract: typeof CAMERA_FRAME_UPDATER_SOURCE_CONTRACT;
  timeMode: "delta" | "elapsed";
  updaterCount: number;
};

export type CameraFrameUpdaterSummary = {
  activeUpdaterCount: number;
  activeUpdaterIds: string[];
  activeWindowSummary: string;
  ambientRotationActiveSeconds: number;
  ambientRotationDegrees: number;
  sourceContract: typeof CAMERA_FRAME_UPDATER_SOURCE_CONTRACT;
  timeMode: "delta" | "elapsed";
  updaterCount: number;
};

export type CameraFrameUpdaterPayload = CameraFrameUpdaterResult & {
  version: "mais-manim-camera-frame-updater/v1";
};

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function roundMillis(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatSeconds(value: number) {
  return roundMillis(value).toFixed(3);
}

function summarizeActiveWindows(entries: string[]) {
  return entries.length > 0 ? entries.join(";") : "none";
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

function elapsedForUpdater(updater: MathSceneCameraUpdaterSpec, elapsedSeconds: number) {
  const startSeconds = Math.max(0, finite(updater.startSeconds, 0));
  const endSeconds = updater.endSeconds === undefined ? Number.POSITIVE_INFINITY : Math.max(startSeconds, finite(updater.endSeconds, startSeconds));
  const elapsed = finite(elapsedSeconds, 0);

  if (updater.enabled === false || elapsed < startSeconds || elapsed > endSeconds) return null;
  return Math.max(0, elapsed - startSeconds);
}

function deltaForUpdater(updater: MathSceneCameraUpdaterSpec, elapsedSeconds: number, deltaSeconds: number) {
  const delta = Math.max(0, finite(deltaSeconds, 0));
  if (updater.enabled === false || delta <= 0) return null;

  const startSeconds = Math.max(0, finite(updater.startSeconds, 0));
  const endSeconds = updater.endSeconds === undefined ? Number.POSITIVE_INFINITY : Math.max(startSeconds, finite(updater.endSeconds, startSeconds));
  const elapsed = Math.max(0, finite(elapsedSeconds, 0));
  const previousElapsed = Math.max(0, elapsed - delta);
  const activeStart = Math.max(previousElapsed, startSeconds);
  const activeEnd = Math.min(elapsed, endSeconds);
  const activeDelta = activeEnd - activeStart;

  return activeDelta > 0 ? activeDelta : null;
}

function rotateAroundY(offset: Vec3, degrees: number): Vec3 {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return [
    offset[0] * cos + offset[2] * sin,
    offset[1],
    -offset[0] * sin + offset[2] * cos
  ];
}

function rotateFrameAroundTarget(frame: CameraFrameState, degrees: number, idSuffix: string): CameraFrameState {
  const offset: Vec3 = [
    frame.position[0] - frame.target[0],
    frame.position[1] - frame.target[1],
    frame.position[2] - frame.target[2]
  ];
  const rotatedOffset = rotateAroundY(offset, degrees);

  return buildCameraFrameState(
    {
      fov: frame.fov,
      id: `${frame.id}+${idSuffix}`,
      position: [
        frame.target[0] + rotatedOffset[0],
        frame.target[1] + rotatedOffset[1],
        frame.target[2] + rotatedOffset[2]
      ],
      target: frame.target
    },
    { progress: frame.progress }
  );
}

export function applyCameraFrameUpdaters(
  frame: CameraFrameState,
  updaters: MathSceneCameraUpdaterSpec[] = [],
  elapsedSeconds = 0
): CameraFrameUpdaterResult {
  let nextFrame = frame;
  let ambientRotationActiveSeconds = 0;
  let ambientRotationDegrees = 0;
  const activeUpdaterIds: string[] = [];
  const activeWindowEntries: string[] = [];

  updaters.forEach((updater) => {
    if (updater.type !== "ambientRotation") return;

    const activeElapsedSeconds = elapsedForUpdater(updater, elapsedSeconds);
    if (activeElapsedSeconds === null) return;

    const rotationDegrees = finite(updater.degreesPerSecond, 0) * activeElapsedSeconds;
    ambientRotationActiveSeconds += activeElapsedSeconds;
    ambientRotationDegrees += rotationDegrees;
    activeUpdaterIds.push(updater.id);
    activeWindowEntries.push(`${updater.id}=${formatSeconds(activeElapsedSeconds)}s`);
    nextFrame = rotateFrameAroundTarget(nextFrame, rotationDegrees, updater.id);
  });

  return {
    activeUpdaterCount: activeUpdaterIds.length,
    activeUpdaterIds,
    activeWindowSummary: summarizeActiveWindows(activeWindowEntries),
    ambientRotationActiveSeconds: roundMillis(ambientRotationActiveSeconds),
    ambientRotationDegrees: roundMillis(ambientRotationDegrees),
    frame: nextFrame,
    sourceContract: CAMERA_FRAME_UPDATER_SOURCE_CONTRACT,
    timeMode: "elapsed",
    updaterCount: updaters.length
  };
}

export function applyCameraFrameUpdatersWithDelta(
  frame: CameraFrameState,
  updaters: MathSceneCameraUpdaterSpec[] = [],
  elapsedSeconds = 0,
  deltaSeconds = 0
): CameraFrameUpdaterResult {
  let nextFrame = frame;
  let ambientRotationActiveSeconds = 0;
  let ambientRotationDegrees = 0;
  const activeUpdaterIds: string[] = [];
  const activeWindowEntries: string[] = [];

  updaters.forEach((updater) => {
    if (updater.type !== "ambientRotation") return;

    const activeDeltaSeconds = deltaForUpdater(updater, elapsedSeconds, deltaSeconds);
    if (activeDeltaSeconds === null) return;

    const rotationDegrees = finite(updater.degreesPerSecond, 0) * activeDeltaSeconds;
    ambientRotationActiveSeconds += activeDeltaSeconds;
    ambientRotationDegrees += rotationDegrees;
    activeUpdaterIds.push(updater.id);
    activeWindowEntries.push(`${updater.id}=${formatSeconds(activeDeltaSeconds)}s`);
    nextFrame = rotateFrameAroundTarget(nextFrame, rotationDegrees, updater.id);
  });

  return {
    activeUpdaterCount: activeUpdaterIds.length,
    activeUpdaterIds,
    activeWindowSummary: summarizeActiveWindows(activeWindowEntries),
    ambientRotationActiveSeconds: roundMillis(ambientRotationActiveSeconds),
    ambientRotationDegrees: roundMillis(ambientRotationDegrees),
    frame: nextFrame,
    sourceContract: CAMERA_FRAME_UPDATER_SOURCE_CONTRACT,
    timeMode: "delta",
    updaterCount: updaters.length
  };
}

export function summarizeCameraFrameUpdaters(result: CameraFrameUpdaterResult): CameraFrameUpdaterSummary {
  return {
    activeUpdaterCount: result.activeUpdaterCount,
    activeUpdaterIds: [...result.activeUpdaterIds],
    activeWindowSummary: result.activeWindowSummary,
    ambientRotationActiveSeconds: result.ambientRotationActiveSeconds,
    ambientRotationDegrees: result.ambientRotationDegrees,
    sourceContract: result.sourceContract,
    timeMode: result.timeMode,
    updaterCount: result.updaterCount
  };
}

export function buildCameraFrameUpdaterPayload(scene: MathSceneSpec, elapsedSeconds = 0): CameraFrameUpdaterPayload {
  const frameTransition = buildCameraFrameTransition(scene, elapsedSeconds);

  return {
    ...applyCameraFrameUpdaters(frameTransition.frame, scene.cameraUpdaters, elapsedSeconds),
    version: "mais-manim-camera-frame-updater/v1"
  };
}

export function serializeCameraFrameUpdaterPayload(payload: CameraFrameUpdaterPayload) {
  return stableSerialize(payload);
}

export function cameraFrameUpdaterDataAttributes(summary: CameraFrameUpdaterSummary) {
  return {
    "data-viz-manim-camera-ambient-rotation-degrees": summary.ambientRotationDegrees.toFixed(3),
    "data-viz-manim-camera-updater-active-count": String(summary.activeUpdaterCount),
    "data-viz-manim-camera-updater-active-ids": summary.activeUpdaterIds.join(",") || "none",
    "data-viz-manim-camera-updater-active-seconds": summary.ambientRotationActiveSeconds.toFixed(3),
    "data-viz-manim-camera-updater-active-window-summary": summary.activeWindowSummary,
    "data-viz-manim-camera-updater-count": String(summary.updaterCount),
    "data-viz-manim-camera-updater-source-contract": summary.sourceContract,
    "data-viz-manim-camera-updater-time-mode": summary.timeMode
  } as const;
}
