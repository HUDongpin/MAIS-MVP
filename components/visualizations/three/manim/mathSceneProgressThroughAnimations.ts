import {
  buildSceneTimeProgression,
  type MathSceneTimeProgressionPlan
} from "./mathSceneTimeProgression";
import {
  buildSceneEmitFramePlan,
  type MathSceneEmitFramePlan
} from "./mathSceneEmitFrame";
import {
  buildSceneUpdateFramePlan,
  type MathSceneUpdateFramePlan
} from "./mathSceneUpdateFrame";

export const PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT =
  "Scene.progress_through_animations: time progression -> animation.update_mobjects(dt via get_all_mobjects_to_update excluding primary mobject) -> animation.interpolate(alpha) -> update_frame(dt) -> emit_frame" as const;

export const PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY =
  "for-each-sampled-scene-time-compute-dt-then-update-mobjects-then-interpolate-then-update-frame-then-emit-frame" as const;

export const PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY =
  "update_mobjects-calls-get_all_mobjects_to_update-and-updates-starting-target-target_copy-while-excluding-primary-mobject" as const;

export type MathSceneProgressAnimationSpec = {
  animationId: string;
  objectId?: string;
  runTime: number;
  startingMobjectId?: string;
  targetCopyObjectId?: string;
  targetObjectId?: string;
};

export type MathSceneProgressAnimationFrame = {
  allMobjectIds: string[];
  animationId: string;
  callsInterpolate: boolean;
  callsUpdateMobjects: boolean;
  objectId: string;
  primaryMobjectExcluded: boolean;
  rawAlpha: number;
  runTime: number;
  updatedMobjectCount: number;
  updatedMobjectIds: string[];
};

export type MathSceneProgressFrame = {
  animationFrames: MathSceneProgressAnimationFrame[];
  callsEmitFrame: boolean;
  callsUpdateFrame: boolean;
  dtSeconds: number;
  emitFrame: MathSceneEmitFramePlan;
  frameIndex: number;
  tSeconds: number;
  updateFrame: MathSceneUpdateFramePlan;
  updateFrameDtSeconds: number;
  writesFrame: boolean;
};

export type MathSceneProgressThroughAnimationsPlan = {
  animationCount: number;
  emitFrameCallCount: number;
  finalAlphaSummary: string;
  finalTime: number;
  fps: number;
  frameInterval: number;
  framePolicy: typeof PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY;
  frameOperationSequenceSummary: string;
  frameOrderSummary: string;
  frameCount: number;
  frames: MathSceneProgressFrame[];
  interpolateCallCount: number;
  rawAlphaOvershootAnimationIds: string;
  rawAlphaOvershootCount: number;
  rawAlphaSequenceSummary: string;
  runTime: number;
  skipAnimations: boolean;
  sourceContract: typeof PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT;
  summary: string;
  timeProgression: MathSceneTimeProgressionPlan;
  timeProgressionSummary: string;
  updateFrameActionSummary: string;
  updateFrameCallCount: number;
  updateMobjectExclusionPolicy: typeof PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY;
  updateMobjectObjectDtSummary: string;
  updateMobjectObjectCallCount: number;
  updateMobjectTargetSummary: string;
  updateMobjectsCallCount: number;
  updateMobjectsDtSummary: string;
  version: "mais-manim-progress-through-animations/v1";
  writtenFrameCount: number;
};

export type MathSceneProgressThroughAnimationsInput = {
  animations: MathSceneProgressAnimationSpec[];
  description?: string;
  fps?: number;
  skipAnimations?: boolean;
};

function finite(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableNumber(value: number | undefined) {
  return Number(finite(value).toFixed(6));
}

function stableRunTime(value: number | undefined) {
  return Math.max(0, stableNumber(value));
}

function stableId(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function removeListRedundancies(ids: (string | undefined)[]) {
  const seen = new Set<string>();
  const stableIds: string[] = [];

  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    stableIds.push(id);
  }

  return stableIds;
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

function normalizeAnimation(animation: MathSceneProgressAnimationSpec, index: number) {
  const animationId = animation.animationId.trim() || `animation-${index}`;
  const objectId = animation.objectId?.trim() || animationId;
  const startingMobjectId = stableId(animation.startingMobjectId) ?? `${objectId}:starting-mobject`;
  const targetObjectId = stableId(animation.targetObjectId);
  const targetCopyObjectId = stableId(animation.targetCopyObjectId) ?? (targetObjectId ? `${targetObjectId}:target-copy` : undefined);
  const allMobjectIds = removeListRedundancies([objectId, startingMobjectId, targetObjectId, targetCopyObjectId]);
  const updatedMobjectIds = allMobjectIds.filter((mobjectId) => mobjectId !== objectId);

  return {
    allMobjectIds,
    animationId,
    objectId,
    primaryMobjectExcluded: allMobjectIds.includes(objectId) && !updatedMobjectIds.includes(objectId),
    runTime: stableRunTime(animation.runTime),
    startingMobjectId,
    targetCopyObjectId,
    targetObjectId,
    updatedMobjectIds
  };
}

function rawAlphaFor(tSeconds: number, runTime: number) {
  return runTime === 0 ? 1 : stableNumber(tSeconds / runTime);
}

function summarizeFinalAlphas(frames: MathSceneProgressFrame[], animations: ReturnType<typeof normalizeAnimation>[]) {
  const finalFrame = frames.at(-1);

  return animations
    .map((animation) => {
      const frame = finalFrame?.animationFrames.find((entry) => entry.animationId === animation.animationId);
      return `${animation.animationId}=${(frame?.rawAlpha ?? 0).toFixed(3)}`;
    })
    .join(",");
}

function buildSummary(plan: Omit<MathSceneProgressThroughAnimationsPlan, "summary" | "version">) {
  return [
    `progressThroughAnimations:animations=${plan.animationCount}`,
    `frames=${plan.frameCount}`,
    `run=${plan.runTime.toFixed(3)}`,
    `updates=${plan.updateMobjectsCallCount}`,
    `interpolates=${plan.interpolateCallCount}`,
    `writes=${plan.writtenFrameCount}`,
    `skip=${String(plan.skipAnimations)}`
  ].join(":");
}

function buildFrameOrderSummary(frameCount: number, animationCount: number) {
  return `frame-order:frames=${frameCount}:animations=${animationCount}:order=update_mobjects>interpolate>update_frame>emit_frame`;
}

function buildUpdateMobjectsDtSummary(frames: MathSceneProgressFrame[], animationCount: number, updateMobjectsCallCount: number) {
  const dtSequence = frames.map((frame) => frame.dtSeconds.toFixed(3)).join(",") || "none";
  const totalDt = stableNumber(frames.reduce((sum, frame) => sum + frame.dtSeconds, 0));

  return [
    `update-mobjects-dt:frames=${frames.length}`,
    `animations=${animationCount}`,
    `calls=${updateMobjectsCallCount}`,
    `dt=${dtSequence}`,
    `total=${totalDt.toFixed(3)}`
  ].join(":");
}

function buildUpdateMobjectTargetSummary(animations: ReturnType<typeof normalizeAnimation>[]) {
  return animations
    .map((animation) => [
      `${animation.animationId}:all=${animation.allMobjectIds.join("|") || "none"}`,
      `updated=${animation.updatedMobjectIds.join("|") || "none"}`,
      `excluded=${animation.primaryMobjectExcluded ? animation.objectId : "none"}`
    ].join(":"))
    .join(";") || "none";
}

function buildUpdateMobjectObjectDtSummary(frames: MathSceneProgressFrame[]) {
  return frames
    .map((frame) => {
      const updates = frame.animationFrames
        .map((animationFrame) => {
          const objectDtSummary = animationFrame.updatedMobjectIds
            .map((objectId) => `${objectId}@${frame.dtSeconds.toFixed(3)}`)
            .join(",") || "none";

          return `${animationFrame.animationId}=${objectDtSummary}`;
        })
        .join(";") || "none";

      return `frame-${frame.frameIndex}:${updates}`;
    })
    .join("|") || "none";
}

function buildRawAlphaSequenceSummary(frames: MathSceneProgressFrame[], animations: ReturnType<typeof normalizeAnimation>[]) {
  const sequences = animations
    .map((animation) => {
      const alphaSequence = frames
        .map((frame) => frame.animationFrames.find((entry) => entry.animationId === animation.animationId)?.rawAlpha ?? 0)
        .map((alpha) => alpha.toFixed(3))
        .join("|") || "none";

      return `${animation.animationId}=${alphaSequence}`;
    })
    .join(";") || "none";

  return `raw-alpha-sequence:frames=${frames.length}:animations=${animations.length}:${sequences}`;
}

function buildUpdateFrameActionSummary(frames: MathSceneProgressFrame[]) {
  const actions = frames.map((frame) => frame.updateFrame.action);
  const captureCount = actions.filter((action) => action === "capture").length;
  const dispatchCount = actions.filter((action) => action === "dispatch-events").length;
  const skipCount = actions.filter((action) => action === "skip-return").length;
  const endSceneCount = actions.filter((action) => action === "end-scene").length;

  return [
    `update-frame-actions:frames=${frames.length}`,
    `capture=${captureCount}`,
    `dispatch=${dispatchCount}`,
    `skip=${skipCount}`,
    `end=${endSceneCount}`,
    `actions=${actions.join(",") || "none"}`
  ].join(":");
}

function buildFrameOperationSequenceSummary(frames: MathSceneProgressFrame[]) {
  return frames
    .map((frame) => {
      const animationIds = frame.animationFrames.map((animationFrame) => animationFrame.animationId).join(",") || "none";

      return [
        `frame-${frame.frameIndex}:update_mobjects(${animationIds})`,
        `interpolate(${animationIds})`,
        `update_frame(${frame.updateFrame.action},dt=${frame.updateFrameDtSeconds.toFixed(3)})`,
        `emit_frame(${frame.emitFrame.status})`
      ].join(">");
    })
    .join("|") || "none";
}

function rawAlphaOvershootFrames(frames: MathSceneProgressFrame[]) {
  return frames.flatMap((frame) => frame.animationFrames.filter((animationFrame) => animationFrame.rawAlpha > 1));
}

// Manim source contract:
// - progress_through_animations asks get_animation_time_progression for sampled
//   scene times.
// - For each sampled t, it computes dt = t - last_t.
// - For every animation it calls animation.update_mobjects(dt), then computes
//   alpha = t / animation.run_time and calls animation.interpolate(alpha).
// - Animation.update_mobjects(dt) calls get_all_mobjects_to_update(), which
//   removes the primary self.mobject and updates starting/target/target_copy
//   mobjects instead; Scene.update_frame handles the primary mobject update.
// - After all animations advance, Scene.update_frame(dt) and emit_frame() run.
// - emit_frame calls file_writer.write_frame only when skip_animations is false.
export function buildSceneProgressThroughAnimationsPlan(
  input: MathSceneProgressThroughAnimationsInput
): MathSceneProgressThroughAnimationsPlan {
  const animations = input.animations.map(normalizeAnimation);
  const runTime = animations.reduce((maxRunTime, animation) => Math.max(maxRunTime, animation.runTime), 0);
  const skipAnimations = input.skipAnimations === true;
  const timeProgression = buildSceneTimeProgression({
    description: input.description ?? "",
    fps: input.fps,
    runTime,
    skipAnimations
  });
  let lastT = 0;
  let sceneTimeSeconds = 0;
  const frames = timeProgression.times.map((tSeconds, frameIndex) => {
    const dtSeconds = stableNumber(tSeconds - lastT);
    const updateFrame = buildSceneUpdateFramePlan({
      dtSeconds,
      sceneTimeSeconds,
      skipAnimations
    });
    const emitFrame = buildSceneEmitFramePlan({
      frameIndex,
      skipAnimations
    });
    lastT = tSeconds;
    sceneTimeSeconds = updateFrame.nextSceneTimeSeconds;

    return {
      animationFrames: animations.map((animation) => ({
        allMobjectIds: animation.allMobjectIds,
        animationId: animation.animationId,
        callsInterpolate: true,
        callsUpdateMobjects: true,
        objectId: animation.objectId,
        primaryMobjectExcluded: animation.primaryMobjectExcluded,
        rawAlpha: rawAlphaFor(tSeconds, animation.runTime),
        runTime: animation.runTime,
        updatedMobjectCount: animation.updatedMobjectIds.length,
        updatedMobjectIds: animation.updatedMobjectIds
      })),
      callsEmitFrame: emitFrame.callsSceneEmitFrame,
      callsUpdateFrame: true,
      dtSeconds,
      emitFrame,
      frameIndex,
      tSeconds,
      updateFrame,
      updateFrameDtSeconds: dtSeconds,
      writesFrame: emitFrame.writesMovieFrame
    };
  });
  const updateMobjectsCallCount = frames.reduce((sum, frame) => sum + frame.animationFrames.length, 0);
  const updateMobjectObjectCallCount = frames.reduce(
    (sum, frame) => sum + frame.animationFrames.reduce((frameSum, animationFrame) => frameSum + animationFrame.updatedMobjectCount, 0),
    0
  );
  const interpolateCallCount = updateMobjectsCallCount;
  const overshootFrames = rawAlphaOvershootFrames(frames);
  const overshootAnimationIds = Array.from(new Set(overshootFrames.map((frame) => frame.animationId))).sort();
  const basePlan: Omit<MathSceneProgressThroughAnimationsPlan, "summary" | "version"> = {
    animationCount: animations.length,
    emitFrameCallCount: frames.length,
    finalAlphaSummary: summarizeFinalAlphas(frames, animations),
    finalTime: stableNumber(timeProgression.finalTime),
    fps: timeProgression.fps,
    frameInterval: timeProgression.frameInterval,
    framePolicy: PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY,
    frameOperationSequenceSummary: buildFrameOperationSequenceSummary(frames),
    frameOrderSummary: buildFrameOrderSummary(frames.length, animations.length),
    frameCount: frames.length,
    frames,
    interpolateCallCount,
    rawAlphaOvershootAnimationIds: overshootAnimationIds.join(",") || "none",
    rawAlphaOvershootCount: overshootFrames.length,
    rawAlphaSequenceSummary: buildRawAlphaSequenceSummary(frames, animations),
    runTime,
    skipAnimations,
    sourceContract: PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT,
    timeProgression,
    timeProgressionSummary: timeProgression.summary,
    updateFrameActionSummary: buildUpdateFrameActionSummary(frames),
    updateFrameCallCount: frames.length,
    updateMobjectExclusionPolicy: PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY,
    updateMobjectObjectDtSummary: buildUpdateMobjectObjectDtSummary(frames),
    updateMobjectObjectCallCount,
    updateMobjectTargetSummary: buildUpdateMobjectTargetSummary(animations),
    updateMobjectsCallCount,
    updateMobjectsDtSummary: buildUpdateMobjectsDtSummary(frames, animations.length, updateMobjectsCallCount),
    writtenFrameCount: frames.filter((frame) => frame.writesFrame).length
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan),
    version: "mais-manim-progress-through-animations/v1"
  };
}

export function sceneProgressThroughAnimationsDataAttributes(
  plan: MathSceneProgressThroughAnimationsPlan
): Record<string, string> {
  return {
    "data-viz-manim-progress-through-animation-count": String(plan.animationCount),
    "data-viz-manim-progress-through-emit-frame-count": String(plan.emitFrameCallCount),
    "data-viz-manim-progress-through-emit-frame-statuses": plan.frames.map((frame) => frame.emitFrame.status).join(",") || "none",
    "data-viz-manim-progress-through-final-alpha-summary": plan.finalAlphaSummary,
    "data-viz-manim-progress-through-final-time": plan.finalTime.toFixed(3),
    "data-viz-manim-progress-through-fps": String(plan.fps),
    "data-viz-manim-progress-through-frame-interval": plan.frameInterval.toFixed(3),
    "data-viz-manim-progress-through-frame-policy": plan.framePolicy,
    "data-viz-manim-progress-through-frame-operation-sequence": plan.frameOperationSequenceSummary,
    "data-viz-manim-progress-through-frame-order-summary": plan.frameOrderSummary,
    "data-viz-manim-progress-through-frame-count": String(plan.frameCount),
    "data-viz-manim-progress-through-interpolate-count": String(plan.interpolateCallCount),
    "data-viz-manim-progress-through-raw-alpha-overshoot-animation-ids": plan.rawAlphaOvershootAnimationIds,
    "data-viz-manim-progress-through-raw-alpha-overshoot-count": String(plan.rawAlphaOvershootCount),
    "data-viz-manim-progress-through-raw-alpha-sequence-summary": plan.rawAlphaSequenceSummary,
    "data-viz-manim-progress-through-run-time": plan.runTime.toFixed(3),
    "data-viz-manim-progress-through-skip": String(plan.skipAnimations),
    "data-viz-manim-progress-through-source-contract": plan.sourceContract,
    "data-viz-manim-progress-through-summary": plan.summary,
    "data-viz-manim-progress-through-update-frame-action-summary": plan.updateFrameActionSummary,
    "data-viz-manim-progress-through-update-frame-count": String(plan.updateFrameCallCount),
    "data-viz-manim-progress-through-update-mobject-exclusion-policy": plan.updateMobjectExclusionPolicy,
    "data-viz-manim-progress-through-update-mobject-object-dt-summary": plan.updateMobjectObjectDtSummary,
    "data-viz-manim-progress-through-update-mobject-object-count": String(plan.updateMobjectObjectCallCount),
    "data-viz-manim-progress-through-update-mobject-target-summary": plan.updateMobjectTargetSummary,
    "data-viz-manim-progress-through-update-mobjects-count": String(plan.updateMobjectsCallCount),
    "data-viz-manim-progress-through-update-mobjects-dt-summary": plan.updateMobjectsDtSummary,
    "data-viz-manim-progress-through-written-frame-count": String(plan.writtenFrameCount)
  };
}

export function serializeSceneProgressThroughAnimationsPlan(plan: MathSceneProgressThroughAnimationsPlan) {
  return stableSerialize(plan);
}
