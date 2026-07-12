import type { MathRateFunctionName } from "./mathRateFunctions";

export type MathSceneProtoAnimationSpec = {
  animationId: string;
  kind: "animation" | "builder" | "invalid";
  lagRatio?: number;
  objectId?: string;
  rateFunction?: MathRateFunctionName;
  runTime?: number;
  timeSpan?: [number, number] | null;
};

export type MathScenePlayCompilationRow = {
  animationId: string;
  callsBuilderBuild: boolean;
  callsPrepareAnimation: boolean;
  callsUpdateRateInfo: boolean;
  errorMessage: string | null;
  kind: "animation" | "builder" | "invalid";
  lagRatioAfter: number;
  lagRatioBefore: number;
  objectId: string;
  rateFunctionAfter: MathRateFunctionName;
  rateFunctionBefore: MathRateFunctionName;
  runTimeAfter: number;
  runTimeBefore: number;
  valid: boolean;
};

export type MathScenePlayCompilationPlan = {
  animationCount: number;
  callOrder: string[];
  callOrderReady: boolean;
  callOrderSummary: string;
  errorMessageSummary: string;
  invalidCount: number;
  maxRunTime: number;
  pipelineEnabled: boolean;
  preparePolicy: string;
  protoAnimationCount: number;
  preparedAnimationIds: string[];
  rows: MathScenePlayCompilationRow[];
  sourceContract: string;
  summary: string;
  updateRateInfoCallCount: number;
  version: "mais-manim-play-compilation/v1";
  warningMessage: string | null;
  warningNoAnimations: boolean;
};

export type MathScenePlayCompilationInput = {
  lagRatio?: number | null;
  protoAnimations: MathSceneProtoAnimationSpec[];
  rateFunction?: MathRateFunctionName | null;
  runTime?: number | null;
};

const playPipeline = ["pre_play", "begin_animations", "progress_through_animations", "finish_animations", "post_play"];
const expectedCallOrder = ["prepare_animation", "update_rate_info", ...playPipeline];

export const SCENE_PLAY_COMPILATION_SOURCE_CONTRACT =
  "Scene.play -> prepare_animation -> Animation.update_rate_info(run_time, rate_func, lag_ratio) -> pre_play/begin_animations/progress_through_animations/finish_animations/post_play";

export const SCENE_PLAY_COMPILATION_PREPARE_POLICY =
  "prepare-animation-builds-builders-before-update-rate-info-and-playback-pipeline";

function finite(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableNumber(value: number | undefined, fallback = 0) {
  return Number(finite(value, fallback).toFixed(6));
}

function stableRunTime(value: number | undefined) {
  return Math.max(0, stableNumber(value, 1));
}

function stableLagRatio(value: number | undefined) {
  return Math.max(0, stableNumber(value, 0));
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

function normalizeId(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function overrideRunTime(current: number, override: number | null | undefined) {
  if (typeof override !== "number" || !Number.isFinite(override) || override === 0) return current;
  return Math.max(0, stableNumber(override));
}

function overrideLagRatio(current: number, override: number | null | undefined) {
  if (typeof override !== "number" || !Number.isFinite(override) || override === 0) return current;
  return Math.max(0, stableNumber(override));
}

function overrideRateFunction(current: MathRateFunctionName, override: MathRateFunctionName | null | undefined) {
  return override ?? current;
}

function runTimeWithTimeSpan(runTime: number, timeSpan: [number, number] | null | undefined) {
  if (!timeSpan) return runTime;
  return Math.max(runTime, stableNumber(timeSpan[1]));
}

function normalizeProtoAnimation(protoAnimation: MathSceneProtoAnimationSpec, index: number) {
  const animationId = normalizeId(protoAnimation.animationId, `proto-animation-${index}`);
  const objectId = normalizeId(protoAnimation.objectId, animationId);

  return {
    animationId,
    kind: protoAnimation.kind,
    lagRatioBefore: stableLagRatio(protoAnimation.lagRatio),
    objectId,
    rateFunctionBefore: protoAnimation.rateFunction ?? "smooth",
    runTimeBefore: stableRunTime(protoAnimation.runTime),
    timeSpan: protoAnimation.timeSpan ?? null
  };
}

function invalidErrorMessage(animationId: string) {
  return `Object ${animationId} cannot be converted to an animation`;
}

function summarizeErrorMessages(rows: Array<Pick<MathScenePlayCompilationRow, "animationId" | "errorMessage">>) {
  return rows
    .filter((row) => row.errorMessage)
    .map((row) => `${row.animationId}:${row.errorMessage}`)
    .join("|") || "none";
}

function warningMessageForNoAnimations(warningNoAnimations: boolean) {
  return warningNoAnimations ? "Called Scene.play with no animations" : null;
}

function summarizePipeline(plan: Omit<MathScenePlayCompilationPlan, "summary" | "version">) {
  return plan.pipelineEnabled ? playPipeline.join(">") : "none";
}

function summarizeCallOrder(callOrder: string[]) {
  return callOrder.join(">") || "none";
}

function callOrderReady(callOrder: string[]) {
  return callOrder.length === expectedCallOrder.length &&
    expectedCallOrder.every((phase, index) => callOrder[index] === phase);
}

function buildSummary(plan: Omit<MathScenePlayCompilationPlan, "summary" | "version">) {
  return [
    `playCompilation:proto=${plan.protoAnimationCount}`,
    `prepared=${plan.animationCount}`,
    `updateRate=${plan.updateRateInfoCallCount}`,
    `run=${plan.maxRunTime.toFixed(3)}`,
    `pipeline=${summarizePipeline(plan)}`
  ].join(":");
}

// Manim source contract:
// - Scene.play warns and returns early when no proto animations are provided.
// - It maps proto animations through prepare_animation, which accepts Animation
//   instances and builds _AnimationBuilder values.
// - Invalid values raise the same conversion error before the playback pipeline.
// - Prepared animations receive anim.update_rate_info(run_time, rate_func, lag_ratio).
// - Successful Scene.play then calls pre_play, begin_animations,
//   progress_through_animations, finish_animations, and post_play in that order.
export function buildScenePlayCompilationPlan(input: MathScenePlayCompilationInput): MathScenePlayCompilationPlan {
  const protoAnimations = input.protoAnimations.map(normalizeProtoAnimation);
  const warningNoAnimations = protoAnimations.length === 0;
  const hasInvalid = protoAnimations.some((protoAnimation) => protoAnimation.kind === "invalid");
  const pipelineEnabled = !warningNoAnimations && !hasInvalid;
  const rows = protoAnimations.map((protoAnimation) => {
    const valid = protoAnimation.kind !== "invalid";
    const callsUpdateRateInfo = pipelineEnabled && valid;
    const runTimeAfterUpdate = callsUpdateRateInfo
      ? overrideRunTime(protoAnimation.runTimeBefore, input.runTime)
      : protoAnimation.runTimeBefore;
    const lagRatioAfter = callsUpdateRateInfo
      ? overrideLagRatio(protoAnimation.lagRatioBefore, input.lagRatio)
      : protoAnimation.lagRatioBefore;
    const rateFunctionAfter = callsUpdateRateInfo
      ? overrideRateFunction(protoAnimation.rateFunctionBefore, input.rateFunction)
      : protoAnimation.rateFunctionBefore;

    return {
      animationId: protoAnimation.animationId,
      callsBuilderBuild: protoAnimation.kind === "builder",
      callsPrepareAnimation: true,
      callsUpdateRateInfo,
      errorMessage: valid ? null : invalidErrorMessage(protoAnimation.animationId),
      kind: protoAnimation.kind,
      lagRatioAfter,
      lagRatioBefore: protoAnimation.lagRatioBefore,
      objectId: protoAnimation.objectId,
      rateFunctionAfter,
      rateFunctionBefore: protoAnimation.rateFunctionBefore,
      runTimeAfter: runTimeWithTimeSpan(runTimeAfterUpdate, protoAnimation.timeSpan),
      runTimeBefore: protoAnimation.runTimeBefore,
      valid
    };
  });
  const preparedAnimationIds = rows.filter((row) => row.valid).map((row) => row.animationId);
  const basePlan = {
    animationCount: preparedAnimationIds.length,
    callOrder: pipelineEnabled ? expectedCallOrder : [],
    callOrderReady: pipelineEnabled && callOrderReady(pipelineEnabled ? expectedCallOrder : []),
    callOrderSummary: summarizeCallOrder(pipelineEnabled ? expectedCallOrder : []),
    errorMessageSummary: summarizeErrorMessages(rows),
    invalidCount: rows.filter((row) => !row.valid).length,
    maxRunTime: pipelineEnabled ? rows.reduce((maxRunTime, row) => Math.max(maxRunTime, row.runTimeAfter), 0) : 0,
    pipelineEnabled,
    preparePolicy: SCENE_PLAY_COMPILATION_PREPARE_POLICY,
    protoAnimationCount: protoAnimations.length,
    preparedAnimationIds,
    rows,
    sourceContract: SCENE_PLAY_COMPILATION_SOURCE_CONTRACT,
    updateRateInfoCallCount: rows.filter((row) => row.callsUpdateRateInfo).length,
    warningMessage: warningMessageForNoAnimations(warningNoAnimations),
    warningNoAnimations
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan),
    version: "mais-manim-play-compilation/v1"
  };
}

export function scenePlayCompilationDataAttributes(plan: MathScenePlayCompilationPlan): Record<string, string> {
  return {
    "data-viz-manim-play-compilation-animation-count": String(plan.animationCount),
    "data-viz-manim-play-compilation-builder-count": String(plan.rows.filter((row) => row.kind === "builder" && row.valid).length),
    "data-viz-manim-play-compilation-call-order": plan.callOrderSummary,
    "data-viz-manim-play-compilation-call-order-ready": String(plan.callOrderReady),
    "data-viz-manim-play-compilation-error-summary": plan.errorMessageSummary,
    "data-viz-manim-play-compilation-invalid-count": String(plan.invalidCount),
    "data-viz-manim-play-compilation-pipeline": summarizePipeline(plan),
    "data-viz-manim-play-compilation-prepare-policy": plan.preparePolicy,
    "data-viz-manim-play-compilation-prepared-ids": plan.preparedAnimationIds.join(",") || "none",
    "data-viz-manim-play-compilation-proto-count": String(plan.protoAnimationCount),
    "data-viz-manim-play-compilation-run-time": plan.maxRunTime.toFixed(3),
    "data-viz-manim-play-compilation-source-contract": plan.sourceContract,
    "data-viz-manim-play-compilation-summary": plan.summary,
    "data-viz-manim-play-compilation-update-rate-count": String(plan.updateRateInfoCallCount),
    "data-viz-manim-play-compilation-warning-empty": String(plan.warningNoAnimations),
    "data-viz-manim-play-compilation-warning-message": plan.warningMessage ?? "none"
  };
}

export function serializeScenePlayCompilationPlan(plan: MathScenePlayCompilationPlan) {
  return stableSerialize(plan);
}
