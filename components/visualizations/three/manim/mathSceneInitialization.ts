import { randomSeedForScene } from "./mathSceneRandom";
import type { MathSceneHistorySummary } from "./mathSceneHistory";
import type { MathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";

export const SCENE_INITIALIZATION_SOURCE_CONTRACT =
  "Scene.__init__: Camera|CameraFrame|SceneFileWriter|mobjects|render_groups|time|num_plays|undo/redo|random seed" as const;

export type MathSceneInitializationEvidence = {
  cameraFrameId: string;
  cameraFrameReady: boolean;
  cameraId: string;
  cameraReady: boolean;
  fileWriterReady: boolean;
  numPlays: number;
  randomSeedSignature: string;
  ready: boolean;
  redoStackCount: number;
  renderGroupCount: number;
  renderGroupIds: string;
  sceneId: string;
  sceneTimeSeconds: number;
  sourceContract: typeof SCENE_INITIALIZATION_SOURCE_CONTRACT;
  sourceSummary: string;
  summary: string;
  topLevelMobjectCount: number;
  undoStackCount: number;
};

export type MathSceneInitializationEvidenceInput = {
  history: MathSceneHistorySummary;
  runtimeState: MathSceneRuntimeState;
  scene: MathSceneSpec;
};

function formatNumber(value: number) {
  return value.toFixed(3);
}

function joinIds(ids: string[]) {
  return ids.join(",") || "none";
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

export function buildMathSceneInitializationEvidence({
  history,
  runtimeState,
  scene
}: MathSceneInitializationEvidenceInput): MathSceneInitializationEvidence {
  // Source contract: Manim Scene.__init__ creates the Camera, CameraFrame,
  // SceneFileWriter, top-level mobjects/render groups, time=0, num_plays=0,
  // undo/redo stacks, and a deterministic random seed before construct().
  const randomSeed = randomSeedForScene(scene);
  const cameraId = runtimeState.cameraDirector.activeShotId || "none";
  const cameraFrameId = runtimeState.cameraDirector.frame.id || "none";
  const topLevelMobjectCount = runtimeState.sceneGraph.summary.topLevelCount;
  const renderGroupIds = joinIds(runtimeState.sceneGraph.renderGroups.all);
  const renderGroupCount = runtimeState.sceneGraph.renderGroups.all.length;
  const sceneTimeSeconds = 0;
  const numPlays = 0;
  const cameraReady = cameraId !== "none";
  const cameraFrameReady = cameraFrameId !== "none";
  const fileWriterReady = true;
  const ready = cameraReady && cameraFrameReady && fileWriterReady && randomSeed.signature.length > 0;
  const sourceSummary = [
    `Scene.__init__:camera=${cameraReady}`,
    `cameraFrame=${cameraFrameReady}`,
    `fileWriter=${fileWriterReady}`,
    `mobjects=${topLevelMobjectCount}`,
    `renderGroups=${renderGroupCount}`,
    `time=${formatNumber(sceneTimeSeconds)}`,
    `numPlays=${numPlays}`,
    `history=${history.undoCount}/${history.redoCount}`
  ].join(":");

  return {
    cameraFrameId,
    cameraFrameReady,
    cameraId,
    cameraReady,
    fileWriterReady,
    numPlays,
    randomSeedSignature: randomSeed.signature,
    ready,
    redoStackCount: history.redoCount,
    renderGroupCount,
    renderGroupIds,
    sceneId: scene.sceneId,
    sceneTimeSeconds,
    sourceContract: SCENE_INITIALIZATION_SOURCE_CONTRACT,
    sourceSummary,
    summary: [
      `scene-init:${scene.sceneId}`,
      `ready=${ready}`,
      `camera=${cameraId}`,
      `frame=${cameraFrameId}`,
      `writer=${fileWriterReady}`,
      `topLevel=${topLevelMobjectCount}`,
      `renderGroups=${renderGroupCount}`,
      `seed=${randomSeed.signature}`
    ].join(":"),
    topLevelMobjectCount,
    undoStackCount: history.undoCount
  };
}

export function mathSceneInitializationDataAttributes(evidence: MathSceneInitializationEvidence): Record<string, string> {
  return {
    "data-viz-manim-scene-init-camera-frame-ready": evidence.cameraFrameReady ? "true" : "false",
    "data-viz-manim-scene-init-camera-ready": evidence.cameraReady ? "true" : "false",
    "data-viz-manim-scene-init-file-writer-ready": evidence.fileWriterReady ? "true" : "false",
    "data-viz-manim-scene-init-num-plays": String(evidence.numPlays),
    "data-viz-manim-scene-init-random-seed-signature": evidence.randomSeedSignature,
    "data-viz-manim-scene-init-ready": evidence.ready ? "true" : "false",
    "data-viz-manim-scene-init-redo-count": String(evidence.redoStackCount),
    "data-viz-manim-scene-init-render-group-count": String(evidence.renderGroupCount),
    "data-viz-manim-scene-init-render-group-ids": evidence.renderGroupIds,
    "data-viz-manim-scene-init-source-contract": evidence.sourceContract,
    "data-viz-manim-scene-init-source-summary": evidence.sourceSummary,
    "data-viz-manim-scene-init-summary": evidence.summary,
    "data-viz-manim-scene-init-time-seconds": formatNumber(evidence.sceneTimeSeconds),
    "data-viz-manim-scene-init-top-level-mobject-count": String(evidence.topLevelMobjectCount),
    "data-viz-manim-scene-init-undo-count": String(evidence.undoStackCount)
  };
}

export function serializeMathSceneInitializationEvidence(evidence: MathSceneInitializationEvidence) {
  return stableSerialize(evidence);
}
