import type { MathSceneHistorySummary } from "./mathSceneHistory";
import type { MathSceneSpec } from "./mathSceneTypes";

export const SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT =
  "Scene state snapshot: save_state/restore serializes mobjects, camera, timeline, checkpoints, and history for replay" as const;

export type MathSceneStateSnapshot = {
  activeStep: string;
  authoringMode: string;
  cameraMode: string;
  cameraShotId: string;
  cameraShotCount: number;
  checkpointCount: number;
  checkpointKeys: string[];
  elapsedSeconds: number;
  familyId: MathSceneSpec["familyId"];
  formulaTokenCount: number;
  frameIndex: number;
  historyCurrentLabel: string;
  historyDroppedUndoCount: number;
  historyMaxUndoEntries: number;
  historyRedoCount: number;
  historyRevision: number;
  historyUndoCount: number;
  latestCheckpointKey: string;
  objectCount: number;
  objectFamilyRootIds: string[];
  objectIds: string[];
  objectIdentitySummary: string;
  objectRootIds: string[];
  playbackState: string;
  sceneId: string;
  sceneSignature: string;
  selectedFamilyId: string;
  selectedParameterId: string;
  selectedSceneId: string;
  semanticBindingCount: number;
  signature: string;
  snapshotVersion: "mais-manim-state-snapshot/v1";
  sourceContract: typeof SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT;
  summary: string;
  timelineStepCount: number;
};

export type MathSceneStateSnapshotInput = {
  activeStep: string;
  authoringMode: string;
  cameraMode: string;
  cameraShotId: string;
  checkpointKeys?: string[];
  elapsedSeconds: number;
  frameIndex: number;
  historySummary: MathSceneHistorySummary;
  objectGraphIdentity?: {
    familyRootIds: string[];
    objectIds: string[];
    rootIds: string[];
  };
  playbackState: string;
  scene: MathSceneSpec;
  sceneSignature: string;
  selectedFamilyId: string;
  selectedParameterId: string;
  selectedSceneId: string;
};

function roundMillis(value: number) {
  return Math.round(value * 1000) / 1000;
}

function finiteNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function nonNegativeInteger(value: number) {
  return Math.max(0, Math.round(finiteNumber(value)));
}

function nonEmpty(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function formulaTokenCount(scene: MathSceneSpec) {
  return scene.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0);
}

function sortedUnique(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => nonEmpty(value, "none"))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function parentIdForSceneObject(scene: MathSceneSpec, objectId: string) {
  const object = scene.objects.find((entry) => entry.id === objectId);
  if (!object) return undefined;
  if (object.type === "movingPoint") return object.pathObjectId;
  if (object.type === "trace") return object.sourceObjectId;
  return undefined;
}

function fallbackObjectIdentity(scene: MathSceneSpec) {
  const objectIds = scene.objects.map((object) => object.id);
  const objectIdSet = new Set(objectIds);
  const rootIds = objectIds.filter((objectId) => {
    const parentId = parentIdForSceneObject(scene, objectId);
    return !parentId || !objectIdSet.has(parentId);
  });

  return {
    familyRootIds: rootIds,
    objectIds,
    rootIds
  };
}

function normalizeObjectIdentity(input: MathSceneStateSnapshotInput) {
  const fallback = fallbackObjectIdentity(input.scene);
  const identity = input.objectGraphIdentity ?? fallback;
  const objectIds = sortedUnique(identity.objectIds.length > 0 ? identity.objectIds : fallback.objectIds);
  const rootIds = sortedUnique(identity.rootIds.length > 0 ? identity.rootIds : fallback.rootIds);
  const familyRootIds = sortedUnique(identity.familyRootIds.length > 0 ? identity.familyRootIds : rootIds);
  const objectIdentitySummary = [
    `objects=${objectIds.join(",") || "none"}`,
    `roots=${rootIds.join(",") || "none"}`,
    `families=${familyRootIds.join(",") || "none"}`
  ].join(";");

  return {
    objectFamilyRootIds: familyRootIds,
    objectIds,
    objectIdentitySummary,
    objectRootIds: rootIds
  };
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

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `snapshot-${hash.toString(16).padStart(8, "0")}`;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function summarizeStateSnapshot(snapshot: Omit<MathSceneStateSnapshot, "signature" | "snapshotVersion" | "summary">) {
  return [
    "snapshot",
    snapshot.sceneId,
    snapshot.activeStep,
    `camera=${snapshot.cameraShotId}`,
    `elapsed=${snapshot.elapsedSeconds.toFixed(3)}`,
    `checkpoints=${snapshot.checkpointCount}`,
    `history=${snapshot.historyRevision}`
  ].join(":");
}

export function buildMathSceneStateSnapshot(input: MathSceneStateSnapshotInput): MathSceneStateSnapshot {
  const checkpointKeys = (input.checkpointKeys ?? []).map((key) => nonEmpty(key, "checkpoint"));
  const elapsedSeconds = roundMillis(Math.max(0, finiteNumber(input.elapsedSeconds)));
  const frameIndex = nonNegativeInteger(input.frameIndex);
  const historyRevision = nonNegativeInteger(input.historySummary.revision);
  const objectIdentity = normalizeObjectIdentity(input);
  const baseSnapshot = {
    activeStep: nonEmpty(input.activeStep, "none"),
    authoringMode: nonEmpty(input.authoringMode, "playback"),
    cameraMode: nonEmpty(input.cameraMode, "guided"),
    cameraShotId: nonEmpty(input.cameraShotId, "default"),
    cameraShotCount: input.scene.cameraShots.length,
    checkpointCount: checkpointKeys.length,
    checkpointKeys,
    elapsedSeconds,
    familyId: input.scene.familyId,
    formulaTokenCount: formulaTokenCount(input.scene),
    frameIndex,
    historyCurrentLabel: nonEmpty(input.historySummary.currentLabel, "state"),
    historyDroppedUndoCount: nonNegativeInteger(input.historySummary.droppedUndoCount),
    historyMaxUndoEntries: nonNegativeInteger(input.historySummary.maxUndoEntries),
    historyRedoCount: nonNegativeInteger(input.historySummary.redoCount),
    historyRevision,
    historyUndoCount: nonNegativeInteger(input.historySummary.undoCount),
    latestCheckpointKey: checkpointKeys.at(-1) ?? "none",
    objectCount: input.scene.objects.length,
    objectFamilyRootIds: objectIdentity.objectFamilyRootIds,
    objectIds: objectIdentity.objectIds,
    objectIdentitySummary: objectIdentity.objectIdentitySummary,
    objectRootIds: objectIdentity.objectRootIds,
    playbackState: nonEmpty(input.playbackState, "paused"),
    sceneId: input.scene.sceneId,
    sceneSignature: nonEmpty(input.sceneSignature, "none"),
    selectedFamilyId: nonEmpty(input.selectedFamilyId, input.scene.familyId),
    selectedParameterId: nonEmpty(input.selectedParameterId, "none"),
    selectedSceneId: nonEmpty(input.selectedSceneId, input.scene.sceneId),
    semanticBindingCount: input.scene.bindings.length,
    sourceContract: SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT,
    timelineStepCount: input.scene.timeline.length
  };
  const summary = summarizeStateSnapshot(baseSnapshot);
  const signature = hashStableJson(stableSerialize({ ...baseSnapshot, summary }));

  return {
    ...baseSnapshot,
    signature,
    snapshotVersion: "mais-manim-state-snapshot/v1",
    summary
  };
}

export function sceneStateSnapshotDataAttributes(snapshot: MathSceneStateSnapshot) {
  return {
    "data-viz-manim-state-snapshot-active-step": snapshot.activeStep,
    "data-viz-manim-state-snapshot-camera-shot": snapshot.cameraShotId,
    "data-viz-manim-state-snapshot-checkpoint-count": String(snapshot.checkpointCount),
    "data-viz-manim-state-snapshot-elapsed-seconds": snapshot.elapsedSeconds.toFixed(3),
    "data-viz-manim-state-snapshot-frame-index": String(snapshot.frameIndex),
    "data-viz-manim-state-snapshot-history-dropped-undo-count": String(snapshot.historyDroppedUndoCount),
    "data-viz-manim-state-snapshot-history-max-undo-entries": String(snapshot.historyMaxUndoEntries),
    "data-viz-manim-state-snapshot-history-revision": String(snapshot.historyRevision),
    "data-viz-manim-state-snapshot-family-root-ids": snapshot.objectFamilyRootIds.join(",") || "none",
    "data-viz-manim-state-snapshot-object-identity-summary": snapshot.objectIdentitySummary,
    "data-viz-manim-state-snapshot-object-ids": snapshot.objectIds.join(",") || "none",
    "data-viz-manim-state-snapshot-ready": "true",
    "data-viz-manim-state-snapshot-root-ids": snapshot.objectRootIds.join(",") || "none",
    "data-viz-manim-state-snapshot-scene-id": snapshot.sceneId,
    "data-viz-manim-state-snapshot-signature": snapshot.signature,
    "data-viz-manim-state-snapshot-source-contract": snapshot.sourceContract,
    "data-viz-manim-state-snapshot-summary": snapshot.summary
  } as const;
}

export function serializeMathSceneStateSnapshot(snapshot: MathSceneStateSnapshot) {
  return stableSerialize(snapshot);
}
