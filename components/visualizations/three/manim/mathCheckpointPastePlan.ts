import {
  buildSceneSkipControlPlan,
  sceneSkipControlDataAttributes,
  type MathSceneSkipControlPlan
} from "./mathSceneSkipControl";
import {
  buildSceneProgressControlPlan,
  sceneProgressControlDataAttributes,
  type MathSceneProgressControlPlan
} from "./mathSceneProgressControl";

export const SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT =
  "Scene.checkpoint_paste -> runs pasted code under temporary scene config, derives comment labels as checkpoint keys, saves first-run state, restores existing state before replay, and invalidates later checkpoints";

export const SCENE_CHECKPOINT_PASTE_REPLAY_POLICY =
  "comment-keyed-paste-restores-existing-checkpoint-before-replay-saves-new-checkpoints-and-invalidates-later-checkpoints-on-restore";

export type MathCheckpointPasteRestoreMode = "restore-existing" | "save-new";
export type MathCheckpointPasteRestoreAction =
  | "save-new-checkpoint"
  | "restore-and-invalidate-later"
  | "restore-without-invalidating";

export type MathCheckpointPastePlan = {
  checkpointKey: string;
  checkpointRestoreAction: MathCheckpointPasteRestoreAction;
  elapsedSeconds: number;
  invalidatesLaterCheckpointCount: number;
  invalidatedCheckpointKeys: string[];
  lineCount: number;
  operationLineCount: number;
  progressBar: boolean;
  progressControlFinalShowAnimationProgress: boolean;
  progressControlPlan: MathSceneProgressControlPlan;
  progressControlRestoredPreviousStatus: boolean;
  progressControlSummary: string;
  progressControlTransitionCount: number;
  record: boolean;
  retainedCheckpointKeysAfterRestore: string[];
  restoreMode: MathCheckpointPasteRestoreMode;
  restoresExistingCheckpoint: boolean;
  replayPolicy: typeof SCENE_CHECKPOINT_PASTE_REPLAY_POLICY;
  sceneId: string;
  skip: boolean;
  skipControlFinalSkipAnimations: boolean;
  skipControlPlan: MathSceneSkipControlPlan;
  skipControlStoppedTransitionCount: number;
  skipControlSummary: string;
  skipControlTransitionCount: number;
  sourceLabel: string;
  sourceContract: typeof SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-checkpoint-paste/v1";
};

export type BuildMathCheckpointPastePlanInput = {
  checkpointKeys?: string[];
  elapsedSeconds?: number;
  initialShowAnimationProgress?: boolean;
  initialSkipAnimations?: boolean;
  progressBar?: boolean;
  record?: boolean;
  sceneId: string;
  skip?: boolean;
  snippet: string;
};

function finiteFixed(value: number | undefined, digits = 3) {
  const finiteValue = Number.isFinite(value) ? value ?? 0 : 0;
  return Number(finiteValue.toFixed(digits));
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

function trimBlockComment(line: string) {
  const blockComment = line.match(/^\/\*\s*(.*?)\s*\*\/$/);
  return blockComment?.[1]?.trim() ?? null;
}

function labelFromCommentLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("#")) return trimmed.replace(/^#+\s*/, "").trim() || null;
  if (trimmed.startsWith("//")) return trimmed.replace(/^\/\/+\s*/, "").trim() || null;
  return trimBlockComment(trimmed);
}

function normalizeLines(snippet: string) {
  return snippet
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

function summarizeCheckpointPastePlan(plan: Omit<MathCheckpointPastePlan, "summary" | "version">) {
  return [
    "checkpointPaste",
    plan.sceneId,
    plan.restoreMode,
    `key=${plan.checkpointKey}`,
    `lines=${plan.lineCount}`,
    `operations=${plan.operationLineCount}`,
    `skip=${String(plan.skip)}`,
    `record=${String(plan.record)}`,
    `invalidates=${plan.invalidatesLaterCheckpointCount}`
  ].join(":");
}

function checkpointPasteRestoreAction(
  restoresExistingCheckpoint: boolean,
  invalidatedCheckpointKeys: readonly string[]
): MathCheckpointPasteRestoreAction {
  if (!restoresExistingCheckpoint) return "save-new-checkpoint";
  return invalidatedCheckpointKeys.length > 0
    ? "restore-and-invalidate-later"
    : "restore-without-invalidating";
}

export function buildMathCheckpointPastePlan(input: BuildMathCheckpointPastePlanInput): MathCheckpointPastePlan {
  const lines = normalizeLines(input.snippet);
  const firstLine = lines[0] ?? "";
  const label = labelFromCommentLine(firstLine);
  const checkpointKey = label ?? `${input.sceneId}:paste`;
  const operationLineCount = label ? Math.max(0, lines.length - 1) : lines.length;
  const checkpointKeys = input.checkpointKeys ?? [];
  const checkpointIndex = checkpointKeys.indexOf(checkpointKey);
  const restoresExistingCheckpoint = checkpointIndex >= 0;
  const invalidatedCheckpointKeys = restoresExistingCheckpoint
    ? checkpointKeys.slice(checkpointIndex + 1)
    : [];
  const retainedCheckpointKeysAfterRestore = restoresExistingCheckpoint
    ? checkpointKeys.slice(0, checkpointIndex + 1)
    : [];
  const restoreMode: MathCheckpointPasteRestoreMode = restoresExistingCheckpoint ? "restore-existing" : "save-new";
  const skipControlPlan = buildSceneSkipControlPlan({
    actions: input.skip ? ["temp_skip_enter", "temp_skip_exit"] : [],
    initialSkipAnimations: input.initialSkipAnimations
  });
  const progressControlPlan = buildSceneProgressControlPlan({
    initialShowAnimationProgress: input.initialShowAnimationProgress,
    requested: input.progressBar ?? true
  });

  const planWithoutSummary: Omit<MathCheckpointPastePlan, "summary" | "version"> = {
    checkpointKey,
    checkpointRestoreAction: checkpointPasteRestoreAction(restoresExistingCheckpoint, invalidatedCheckpointKeys),
    elapsedSeconds: finiteFixed(input.elapsedSeconds),
    invalidatesLaterCheckpointCount: invalidatedCheckpointKeys.length,
    invalidatedCheckpointKeys,
    lineCount: lines.length,
    operationLineCount,
    progressBar: input.progressBar ?? true,
    progressControlFinalShowAnimationProgress: progressControlPlan.finalShowAnimationProgress,
    progressControlPlan,
    progressControlRestoredPreviousStatus: progressControlPlan.restoredPreviousStatus,
    progressControlSummary: progressControlPlan.summary,
    progressControlTransitionCount: progressControlPlan.transitionCount,
    record: input.record ?? false,
    restoreMode,
    restoresExistingCheckpoint,
    replayPolicy: SCENE_CHECKPOINT_PASTE_REPLAY_POLICY,
    retainedCheckpointKeysAfterRestore,
    sceneId: input.sceneId,
    skip: input.skip ?? false,
    skipControlFinalSkipAnimations: skipControlPlan.finalSkipAnimations,
    skipControlPlan,
    skipControlStoppedTransitionCount: skipControlPlan.stoppedTransitionCount,
    skipControlSummary: skipControlPlan.summary,
    skipControlTransitionCount: skipControlPlan.transitionCount,
    sourceLabel: label ? firstLine.trim() : "scene fallback",
    sourceContract: SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT
  };

  return {
    ...planWithoutSummary,
    summary: summarizeCheckpointPastePlan(planWithoutSummary),
    version: "mais-manim-checkpoint-paste/v1"
  };
}

export function checkpointPastePlanDataAttributes(plan: MathCheckpointPastePlan) {
  const progressControlAttributes = sceneProgressControlDataAttributes(plan.progressControlPlan);
  const skipControlAttributes = sceneSkipControlDataAttributes(plan.skipControlPlan);

  return {
    "data-viz-manim-checkpoint-paste-key": plan.checkpointKey,
    "data-viz-manim-checkpoint-paste-line-count": String(plan.lineCount),
    "data-viz-manim-checkpoint-paste-operation-count": String(plan.operationLineCount),
    "data-viz-manim-checkpoint-paste-invalidates-count": String(plan.invalidatesLaterCheckpointCount),
    "data-viz-manim-checkpoint-paste-invalidated-keys": plan.invalidatedCheckpointKeys.join(",") || "none",
    "data-viz-manim-checkpoint-paste-retained-keys-after-restore": plan.retainedCheckpointKeysAfterRestore.join(",") || "none",
    "data-viz-manim-checkpoint-paste-restore-action": plan.checkpointRestoreAction,
    "data-viz-manim-checkpoint-paste-elapsed-seconds": plan.elapsedSeconds.toFixed(3),
    "data-viz-manim-checkpoint-paste-progress-bar": String(plan.progressBar),
    "data-viz-manim-checkpoint-paste-record": String(plan.record),
    "data-viz-manim-checkpoint-paste-replay-policy": plan.replayPolicy,
    "data-viz-manim-checkpoint-paste-restores-existing": String(plan.restoresExistingCheckpoint),
    "data-viz-manim-checkpoint-paste-restore-mode": plan.restoreMode,
    "data-viz-manim-checkpoint-paste-scene-id": plan.sceneId,
    "data-viz-manim-checkpoint-paste-skip": String(plan.skip),
    "data-viz-manim-checkpoint-paste-source-contract": plan.sourceContract,
    "data-viz-manim-checkpoint-paste-source-label": plan.sourceLabel,
    "data-viz-manim-checkpoint-paste-summary": plan.summary,
    "data-viz-manim-checkpoint-paste-version": plan.version,
    ...progressControlAttributes,
    ...skipControlAttributes
  };
}

export function serializeMathCheckpointPastePlan(plan: MathCheckpointPastePlan) {
  return stableSerialize(plan);
}
