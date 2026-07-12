export type MathSceneRunFromBeatPlanInput = {
  checkpointKeys?: string[];
  checkpointRestoreKey?: string;
  compositionReplay?: MathSceneRunFromBeatCompositionReplayInput;
  playEndSeconds?: number[];
  playStartSeconds?: number[];
  requestedBeatIndex?: number;
};

export type MathSceneRunFromBeatCompositionType = "animationGroup" | "laggedStart" | "succession" | "none";

export type MathSceneRunFromBeatCompositionReplayInput = {
  compositionId?: string;
  compositionType?: Exclude<MathSceneRunFromBeatCompositionType, "none">;
  windowIds?: string[];
  windowSummary?: string;
};

export type MathSceneRunFromBeatCheckpointRestoreMode =
  | "restore-existing"
  | "missing-checkpoint"
  | "not-ready";

export type MathSceneRunFromBeatCheckpointRestoreAction =
  | "restore-and-invalidate-later"
  | "restore-without-invalidating"
  | "missing-checkpoint"
  | "not-ready";

export type MathSceneRunFromBeatPlan = {
  checkpointInvalidationSummary: string;
  checkpointKeyCount: number;
  checkpointKeys: string[];
  checkpointPolicy: typeof SCENE_RUN_FROM_BEAT_CHECKPOINT_POLICY;
  checkpointRestoreAction: MathSceneRunFromBeatCheckpointRestoreAction;
  checkpointRestoreKey: string;
  checkpointRestoreMode: MathSceneRunFromBeatCheckpointRestoreMode;
  checkpointRestoreReady: boolean;
  checkpointSummary: string;
  compositionId: string;
  compositionReplayPolicy: typeof SCENE_RUN_FROM_BEAT_COMPOSITION_REPLAY_POLICY;
  compositionReplayReady: boolean;
  compositionReplaySummary: string;
  compositionType: MathSceneRunFromBeatCompositionType;
  compositionWindowCount: number;
  compositionWindowIds: string[];
  compositionWindowSummary: string;
  elapsedBeforeReplay: number;
  finalElapsedSeconds: number;
  invalidatedCheckpointKeys: string[];
  invalidatesLaterCheckpointCount: number;
  normalizedBeatIndex: number;
  preparedBeatIndices: number[];
  ready: boolean;
  replayBeatIndices: number[];
  replayPlayCount: number;
  replayPolicy: typeof SCENE_RUN_FROM_BEAT_REPLAY_POLICY;
  requestedBeatIndex: number;
  retainedCheckpointKeysAfterRestore: string[];
  skippedBeforeCount: number;
  sourceContract: typeof SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT;
  summary: string;
  totalPlayCount: number;
  version: "mais-manim-run-from-beat/v1";
};

export const SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT =
  "InteractiveSceneEmbed run-from-beat -> restore checkpointed scene state before selected play and replay selected/later plays" as const;

export const SCENE_RUN_FROM_BEAT_REPLAY_POLICY =
  "checkpoint-prepare-earlier-beats-then-replay-selected-beat-window" as const;

export const SCENE_RUN_FROM_BEAT_CHECKPOINT_POLICY =
  "restore-existing-checkpoint-before-selected-beat-then-replay-window" as const;

export const SCENE_RUN_FROM_BEAT_COMPOSITION_REPLAY_POLICY =
  "restore-checkpoint-then-replay-selected-Scene.play-group-with-child-windows" as const;

function finite(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? value ?? fallback : fallback;
}

function stableNumber(value: number) {
  return Number(finite(value).toFixed(3));
}

function formatSeconds(value: number) {
  return stableNumber(value).toFixed(3);
}

function nonNegativeSeconds(values: number[] | undefined) {
  return (values ?? []).map((value) => Math.max(0, stableNumber(value)));
}

function integer(value: number | undefined, fallback = 0) {
  return Math.round(finite(value, fallback));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function range(start: number, endExclusive: number) {
  return Array.from({ length: Math.max(0, endExclusive - start) }, (_, index) => start + index);
}

function indexSummary(indices: number[]) {
  return indices.join(",") || "none";
}

function checkpointKeySummary(keys: readonly string[] | undefined) {
  return (keys ?? []).join("|") || "none";
}

function stableCheckpointKey(value: string | undefined) {
  const key = value?.trim();
  return key ? key : "none";
}

function stableCheckpointKeys(values: string[] | undefined) {
  return (values ?? []).map(stableCheckpointKey).filter((key) => key !== "none");
}

function stableId(value: string | undefined) {
  const id = value?.trim();
  return id ? id : "none";
}

function stableIds(values: string[] | undefined) {
  return (values ?? []).map(stableId).filter((id) => id !== "none");
}

function compositionType(value: MathSceneRunFromBeatCompositionReplayInput["compositionType"]): MathSceneRunFromBeatCompositionType {
  return value === "animationGroup" || value === "laggedStart" || value === "succession" ? value : "none";
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

function summarizeRunFromBeat(plan: Omit<
  MathSceneRunFromBeatPlan,
  "checkpointInvalidationSummary" | "checkpointSummary" | "compositionReplaySummary" | "summary" | "version"
>) {
  return [
    `runFromBeat:ready=${String(plan.ready)}`,
    `requested=${plan.requestedBeatIndex}`,
    `normalized=${plan.normalizedBeatIndex}`,
    `prepared=${indexSummary(plan.preparedBeatIndices)}`,
    `replay=${indexSummary(plan.replayBeatIndices)}`,
    `elapsed=${formatSeconds(plan.elapsedBeforeReplay)}`,
    `final=${formatSeconds(plan.finalElapsedSeconds)}`
  ].join(":");
}

function checkpointRestoreMode(
  ready: boolean,
  checkpointKeys: string[],
  checkpointRestoreKey: string
): MathSceneRunFromBeatCheckpointRestoreMode {
  if (!ready) return "not-ready";
  return checkpointRestoreKey !== "none" && checkpointKeys.includes(checkpointRestoreKey)
    ? "restore-existing"
    : "missing-checkpoint";
}

function summarizeCheckpointRestore(plan: Pick<
  MathSceneRunFromBeatPlan,
  "checkpointKeyCount" | "checkpointRestoreKey" | "checkpointRestoreMode" | "checkpointRestoreReady"
>) {
  return [
    `checkpoint:${plan.checkpointRestoreMode}`,
    `key=${plan.checkpointRestoreKey}`,
    `count=${plan.checkpointKeyCount}`,
    `ready=${String(plan.checkpointRestoreReady)}`
  ].join(":");
}

function checkpointRestoreAction(
  restoreMode: MathSceneRunFromBeatCheckpointRestoreMode,
  invalidatedCheckpointKeys: readonly string[]
): MathSceneRunFromBeatCheckpointRestoreAction {
  if (restoreMode === "not-ready") return "not-ready";
  if (restoreMode === "missing-checkpoint") return "missing-checkpoint";
  return invalidatedCheckpointKeys.length > 0
    ? "restore-and-invalidate-later"
    : "restore-without-invalidating";
}

function summarizeCheckpointInvalidation(plan: Pick<
  MathSceneRunFromBeatPlan,
  | "checkpointRestoreAction"
  | "invalidatedCheckpointKeys"
  | "invalidatesLaterCheckpointCount"
  | "retainedCheckpointKeysAfterRestore"
>) {
  return [
    `checkpointInvalidation:action=${plan.checkpointRestoreAction}`,
    `invalidates=${plan.invalidatesLaterCheckpointCount}`,
    `invalidated=${checkpointKeySummary(plan.invalidatedCheckpointKeys)}`,
    `retained=${checkpointKeySummary(plan.retainedCheckpointKeysAfterRestore)}`
  ].join(":");
}

function summarizeCompositionReplay(plan: Pick<
  MathSceneRunFromBeatPlan,
  "compositionId" | "compositionReplayReady" | "compositionType" | "compositionWindowCount"
>) {
  return [
    `composition:ready=${String(plan.compositionReplayReady)}`,
    `id=${plan.compositionId}`,
    `type=${plan.compositionType}`,
    `windows=${plan.compositionWindowCount}`
  ].join(":");
}

// Manim source contract:
// - InteractiveSceneEmbed gives authors replay shortcuts around Scene.play.
// - A browser run-from-beat control should not mutate renderer-owned meshes.
// - It restores or prepares checkpointed scene state before the requested play,
//   then replays the selected play and later plays through the normal timeline.
export function buildSceneRunFromBeatPlan(input: MathSceneRunFromBeatPlanInput = {}): MathSceneRunFromBeatPlan {
  const checkpointKeys = stableCheckpointKeys(input.checkpointKeys);
  const compositionId = stableId(input.compositionReplay?.compositionId);
  const compositionWindowIds = stableIds(input.compositionReplay?.windowIds);
  const compositionWindowSummary = stableId(input.compositionReplay?.windowSummary);
  const selectedCompositionType = compositionType(input.compositionReplay?.compositionType);
  const playStartSeconds = nonNegativeSeconds(input.playStartSeconds);
  const playEndSeconds = nonNegativeSeconds(input.playEndSeconds);
  const totalPlayCount = playStartSeconds.length;
  const requestedBeatIndex = integer(input.requestedBeatIndex);
  const ready = totalPlayCount > 0;
  const normalizedBeatIndex = ready ? clamp(requestedBeatIndex, 0, totalPlayCount - 1) : -1;
  const preparedBeatIndices = ready ? range(0, normalizedBeatIndex) : [];
  const replayBeatIndices = ready ? range(normalizedBeatIndex, totalPlayCount) : [];
  const fallbackFinalElapsedSeconds = playStartSeconds.at(-1) ?? 0;
  const finalElapsedSeconds = ready
    ? Math.max(fallbackFinalElapsedSeconds, playEndSeconds.at(-1) ?? fallbackFinalElapsedSeconds)
    : 0;
  const checkpointRestoreKey = stableCheckpointKey(input.checkpointRestoreKey ?? checkpointKeys.at(-1));
  const restoreMode = checkpointRestoreMode(ready, checkpointKeys, checkpointRestoreKey);
  const checkpointRestoreIndex = checkpointKeys.indexOf(checkpointRestoreKey);
  const checkpointRestoreReady = restoreMode === "restore-existing";
  const invalidatedCheckpointKeys = checkpointRestoreReady
    ? checkpointKeys.slice(checkpointRestoreIndex + 1)
    : [];
  const retainedCheckpointKeysAfterRestore = checkpointRestoreReady
    ? checkpointKeys.slice(0, checkpointRestoreIndex + 1)
    : [];
  const basePlan = {
    checkpointKeyCount: checkpointKeys.length,
    checkpointKeys,
    checkpointPolicy: SCENE_RUN_FROM_BEAT_CHECKPOINT_POLICY,
    checkpointRestoreAction: checkpointRestoreAction(restoreMode, invalidatedCheckpointKeys),
    checkpointRestoreKey,
    checkpointRestoreMode: restoreMode,
    checkpointRestoreReady,
    compositionId,
    compositionReplayPolicy: SCENE_RUN_FROM_BEAT_COMPOSITION_REPLAY_POLICY,
    compositionReplayReady: ready && compositionId !== "none" && selectedCompositionType !== "none" && compositionWindowIds.length > 0,
    compositionType: selectedCompositionType,
    compositionWindowCount: compositionWindowIds.length,
    compositionWindowIds,
    compositionWindowSummary,
    elapsedBeforeReplay: ready ? playStartSeconds[normalizedBeatIndex] ?? 0 : 0,
    finalElapsedSeconds,
    invalidatedCheckpointKeys,
    invalidatesLaterCheckpointCount: invalidatedCheckpointKeys.length,
    normalizedBeatIndex,
    preparedBeatIndices,
    ready,
    replayBeatIndices,
    replayPlayCount: replayBeatIndices.length,
    replayPolicy: SCENE_RUN_FROM_BEAT_REPLAY_POLICY,
    requestedBeatIndex,
    retainedCheckpointKeysAfterRestore,
    skippedBeforeCount: preparedBeatIndices.length,
    sourceContract: SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT,
    totalPlayCount
  };

  return {
    ...basePlan,
    checkpointInvalidationSummary: summarizeCheckpointInvalidation(basePlan),
    checkpointSummary: summarizeCheckpointRestore(basePlan),
    compositionReplaySummary: summarizeCompositionReplay(basePlan),
    summary: summarizeRunFromBeat(basePlan),
    version: "mais-manim-run-from-beat/v1"
  };
}

export function sceneRunFromBeatDataAttributes(plan: MathSceneRunFromBeatPlan): Record<string, string> {
  const invalidatedCheckpointKeys = plan.invalidatedCheckpointKeys ?? [];
  const invalidatesLaterCheckpointCount = plan.invalidatesLaterCheckpointCount ?? invalidatedCheckpointKeys.length;
  const retainedCheckpointKeysAfterRestore = plan.retainedCheckpointKeysAfterRestore ?? [];
  const checkpointRestoreActionValue = plan.checkpointRestoreAction
    ?? checkpointRestoreAction(plan.checkpointRestoreMode, invalidatedCheckpointKeys);
  const checkpointInvalidationSummary = plan.checkpointInvalidationSummary ?? summarizeCheckpointInvalidation({
    checkpointRestoreAction: checkpointRestoreActionValue,
    invalidatedCheckpointKeys,
    invalidatesLaterCheckpointCount,
    retainedCheckpointKeysAfterRestore
  });

  return {
    "data-viz-manim-run-from-beat-checkpoint-count": String(plan.checkpointKeyCount),
    "data-viz-manim-run-from-beat-checkpoint-invalidates-count": String(invalidatesLaterCheckpointCount),
    "data-viz-manim-run-from-beat-checkpoint-invalidated-keys": checkpointKeySummary(invalidatedCheckpointKeys),
    "data-viz-manim-run-from-beat-checkpoint-invalidation-summary": checkpointInvalidationSummary,
    "data-viz-manim-run-from-beat-checkpoint-keys": checkpointKeySummary(plan.checkpointKeys),
    "data-viz-manim-run-from-beat-checkpoint-policy": plan.checkpointPolicy,
    "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore": checkpointKeySummary(retainedCheckpointKeysAfterRestore),
    "data-viz-manim-run-from-beat-checkpoint-restore-action": checkpointRestoreActionValue,
    "data-viz-manim-run-from-beat-checkpoint-restore-key": plan.checkpointRestoreKey,
    "data-viz-manim-run-from-beat-checkpoint-restore-mode": plan.checkpointRestoreMode,
    "data-viz-manim-run-from-beat-checkpoint-restore-ready": String(plan.checkpointRestoreReady),
    "data-viz-manim-run-from-beat-checkpoint-summary": plan.checkpointSummary,
    "data-viz-manim-run-from-beat-composition-id": plan.compositionId,
    "data-viz-manim-run-from-beat-composition-replay-policy": plan.compositionReplayPolicy,
    "data-viz-manim-run-from-beat-composition-replay-ready": String(plan.compositionReplayReady),
    "data-viz-manim-run-from-beat-composition-replay-summary": plan.compositionReplaySummary,
    "data-viz-manim-run-from-beat-composition-type": plan.compositionType,
    "data-viz-manim-run-from-beat-composition-window-count": String(plan.compositionWindowCount),
    "data-viz-manim-run-from-beat-composition-window-ids": checkpointKeySummary(plan.compositionWindowIds),
    "data-viz-manim-run-from-beat-composition-window-summary": plan.compositionWindowSummary,
    "data-viz-manim-run-from-beat-elapsed-before": formatSeconds(plan.elapsedBeforeReplay),
    "data-viz-manim-run-from-beat-final-elapsed": formatSeconds(plan.finalElapsedSeconds),
    "data-viz-manim-run-from-beat-normalized-index": String(plan.normalizedBeatIndex),
    "data-viz-manim-run-from-beat-prepared-count": String(plan.preparedBeatIndices.length),
    "data-viz-manim-run-from-beat-prepared-indices": indexSummary(plan.preparedBeatIndices),
    "data-viz-manim-run-from-beat-ready": String(plan.ready),
    "data-viz-manim-run-from-beat-replay-count": String(plan.replayPlayCount),
    "data-viz-manim-run-from-beat-replay-indices": indexSummary(plan.replayBeatIndices),
    "data-viz-manim-run-from-beat-replay-policy": plan.replayPolicy,
    "data-viz-manim-run-from-beat-requested-index": String(plan.requestedBeatIndex),
    "data-viz-manim-run-from-beat-source-contract": plan.sourceContract,
    "data-viz-manim-run-from-beat-summary": plan.summary,
    "data-viz-manim-run-from-beat-total-play-count": String(plan.totalPlayCount)
  };
}

export function serializeSceneRunFromBeatPlan(plan: MathSceneRunFromBeatPlan) {
  return stableSerialize(plan);
}
