export type MathSceneFinishAnimationSpec = {
  animationId: string;
  finalAlphaValue?: number;
  mobjectWasUpdating?: boolean;
  objectId?: string;
  remover?: boolean;
  runTime: number;
  suspendMobjectUpdating?: boolean;
};

export type MathSceneFinishAnimationRow = {
  animationId: string;
  callsCleanUpFromScene: boolean;
  callsFinish: boolean;
  callsResumeUpdating: boolean;
  finalAlphaValue: number;
  mobjectWasUpdating: boolean;
  objectId: string;
  removedObjectId: string | null;
  remover: boolean;
  resumeUpdaterDt: number | null;
  setAnimatingStatusFalse: boolean;
  suspendMobjectUpdating: boolean;
};

export type MathSceneFinishAnimationsPlan = {
  animationCount: number;
  callsSceneUpdateMobjects: boolean;
  cleanUpCallCount: number;
  cleanupPolicy: string;
  finalAlphaSummary: string;
  finishCallCount: number;
  finishLifecycleSummary: string;
  removedObjectCount: number;
  removedObjectIds: string[];
  resumeObjectIds: string[];
  resumePolicy: string;
  resumeUpdaterDtSummary: string;
  resumeUpdatingCallCount: number;
  rows: MathSceneFinishAnimationRow[];
  runTime: number;
  sceneUpdateMobjectsDt: number;
  setAnimatingStatusFalseCount: number;
  skipAnimations: boolean;
  sourceContract: string;
  summary: string;
  version: "mais-manim-finish-animations/v1";
};

export type MathSceneFinishAnimationsInput = {
  animations: MathSceneFinishAnimationSpec[];
  skipAnimations?: boolean;
};

export const SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT =
  "Scene.finish_animations -> Animation.finish(final_alpha_value/set_animating_status(False)/resume_updating) -> Animation.clean_up_from_scene(scene) -> Scene.update_mobjects";

export const SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY =
  "final-alpha-then-remover-cleanup-with-skipped-update-dt";

export const SCENE_FINISH_ANIMATIONS_RESUME_POLICY =
  "resume-updating-only-if-animation-suspended-and-mobject-was-updating-with-dt-zero-updater-call";

function finite(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableNumber(value: number | undefined) {
  return Number(finite(value).toFixed(6));
}

function stableRunTime(value: number | undefined) {
  return Math.max(0, stableNumber(value));
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

function normalizeAnimation(animation: MathSceneFinishAnimationSpec, index: number) {
  const animationId = animation.animationId.trim() || `animation-${index}`;
  const objectId = animation.objectId?.trim() || animationId;

  return {
    animationId,
    finalAlphaValue: stableNumber(animation.finalAlphaValue ?? 1),
    mobjectWasUpdating: animation.mobjectWasUpdating === true,
    objectId,
    remover: animation.remover === true,
    runTime: stableRunTime(animation.runTime),
    suspendMobjectUpdating: animation.suspendMobjectUpdating === true
  };
}

function summarizeRemovedIds(ids: string[] | undefined) {
  return ids?.join(",") || "none";
}

function buildSummary(plan: Omit<MathSceneFinishAnimationsPlan, "summary" | "version">) {
  const parts = [
    `finishAnimations:animations=${plan.animationCount}`,
    `finish=${plan.finishCallCount}`,
    `cleanup=${plan.cleanUpCallCount}`,
    `removed=${summarizeRemovedIds(plan.removedObjectIds)}`,
    `updateDt=${plan.sceneUpdateMobjectsDt.toFixed(3)}`,
    `skip=${String(plan.skipAnimations)}`
  ];

  if (plan.resumeUpdatingCallCount > 0) parts.push(`resume=${summarizeRemovedIds(plan.resumeObjectIds)}`);

  return parts.join(":");
}

function summarizeFinalAlphas(rows: MathSceneFinishAnimationRow[]) {
  return rows.map((row) => `${row.objectId}=${row.finalAlphaValue.toFixed(3)}`).join(",") || "none";
}

function summarizeResumeUpdaterDt(rows: MathSceneFinishAnimationRow[]) {
  return rows
    .filter((row) => row.callsResumeUpdating)
    .map((row) => `${row.objectId}=${(row.resumeUpdaterDt ?? 0).toFixed(3)}`)
    .join(",") || "none";
}

function lifecycleStepsForRow(row: MathSceneFinishAnimationRow) {
  return [
    `interpolate_final_alpha(${row.finalAlphaValue.toFixed(3)})`,
    ...(row.setAnimatingStatusFalse ? ["set_animating_status_false"] : []),
    ...(row.callsResumeUpdating ? [`resume_updating(dt=${(row.resumeUpdaterDt ?? 0).toFixed(3)})`] : []),
    ...(row.callsCleanUpFromScene ? ["clean_up_from_scene"] : []),
    ...(row.removedObjectId ? ["remove_mobject"] : [])
  ];
}

function summarizeFinishLifecycle(rows: MathSceneFinishAnimationRow[], sceneUpdateMobjectsDt: number) {
  return [
    ...rows.map((row) => `${row.animationId}=${lifecycleStepsForRow(row).join(">")}`),
    `scene=update_mobjects(dt=${sceneUpdateMobjectsDt.toFixed(3)})`
  ].join(";");
}

// Manim source contract:
// - finish_animations iterates animations and calls animation.finish().
// - Animation.finish interpolates final_alpha_value and clears animating status.
// - Animation.finish calls resume_updating() only when begin suspended a mobject
//   that had been updating; resume_updating() calls update(dt=0) by default.
// - finish_animations then calls animation.clean_up_from_scene(scene).
// - clean_up_from_scene removes the mobject only when the animation is a remover.
// - Finally, Scene.update_mobjects receives get_run_time(animations) when
//   skip_animations is true, otherwise it receives 0.
export function buildSceneFinishAnimationsPlan(input: MathSceneFinishAnimationsInput): MathSceneFinishAnimationsPlan {
  const animations = input.animations.map(normalizeAnimation);
  const skipAnimations = input.skipAnimations === true;
  const rows = animations.map((animation) => {
    const callsResumeUpdating = animation.suspendMobjectUpdating && animation.mobjectWasUpdating;

    return {
      animationId: animation.animationId,
      callsCleanUpFromScene: true,
      callsFinish: true,
      callsResumeUpdating,
      finalAlphaValue: animation.finalAlphaValue,
      mobjectWasUpdating: animation.mobjectWasUpdating,
      objectId: animation.objectId,
      removedObjectId: animation.remover ? animation.objectId : null,
      remover: animation.remover,
      resumeUpdaterDt: callsResumeUpdating ? 0 : null,
      setAnimatingStatusFalse: true,
      suspendMobjectUpdating: animation.suspendMobjectUpdating
    };
  });
  const removedObjectIds = rows.flatMap((row) => row.removedObjectId ? [row.removedObjectId] : []);
  const resumeObjectIds = rows.filter((row) => row.callsResumeUpdating).map((row) => row.objectId);
  const runTime = animations.reduce((maxRunTime, animation) => Math.max(maxRunTime, animation.runTime), 0);
  const sceneUpdateMobjectsDt = skipAnimations ? runTime : 0;
  const basePlan = {
    animationCount: animations.length,
    callsSceneUpdateMobjects: true,
    cleanUpCallCount: rows.length,
    cleanupPolicy: SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY,
    finalAlphaSummary: summarizeFinalAlphas(rows),
    finishCallCount: rows.length,
    finishLifecycleSummary: summarizeFinishLifecycle(rows, sceneUpdateMobjectsDt),
    removedObjectCount: removedObjectIds.length,
    removedObjectIds,
    resumeObjectIds,
    resumePolicy: SCENE_FINISH_ANIMATIONS_RESUME_POLICY,
    resumeUpdaterDtSummary: summarizeResumeUpdaterDt(rows),
    resumeUpdatingCallCount: resumeObjectIds.length,
    rows,
    runTime,
    sceneUpdateMobjectsDt,
    setAnimatingStatusFalseCount: rows.filter((row) => row.setAnimatingStatusFalse).length,
    skipAnimations,
    sourceContract: SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan),
    version: "mais-manim-finish-animations/v1"
  };
}

export function sceneFinishAnimationsDataAttributes(plan: MathSceneFinishAnimationsPlan): Record<string, string> {
  return {
    "data-viz-manim-finish-animations-cleanup-count": String(plan.cleanUpCallCount),
    "data-viz-manim-finish-animations-cleanup-policy": plan.cleanupPolicy,
    "data-viz-manim-finish-animations-count": String(plan.animationCount),
    "data-viz-manim-finish-animations-final-alpha-summary": plan.finalAlphaSummary,
    "data-viz-manim-finish-animations-finish-count": String(plan.finishCallCount),
    "data-viz-manim-finish-animations-lifecycle-summary": plan.finishLifecycleSummary,
    "data-viz-manim-finish-animations-removed-count": String(plan.removedObjectCount),
    "data-viz-manim-finish-animations-removed-ids": summarizeRemovedIds(plan.removedObjectIds),
    "data-viz-manim-finish-animations-resume-count": String(plan.resumeUpdatingCallCount ?? 0),
    "data-viz-manim-finish-animations-resume-dt-summary": plan.resumeUpdaterDtSummary ?? "none",
    "data-viz-manim-finish-animations-resume-ids": summarizeRemovedIds(plan.resumeObjectIds),
    "data-viz-manim-finish-animations-resume-policy": plan.resumePolicy ?? SCENE_FINISH_ANIMATIONS_RESUME_POLICY,
    "data-viz-manim-finish-animations-run-time": plan.runTime.toFixed(3),
    "data-viz-manim-finish-animations-scene-update-dt": plan.sceneUpdateMobjectsDt.toFixed(3),
    "data-viz-manim-finish-animations-set-animating-status-false-count": String(plan.setAnimatingStatusFalseCount),
    "data-viz-manim-finish-animations-skip": String(plan.skipAnimations),
    "data-viz-manim-finish-animations-source-contract": plan.sourceContract,
    "data-viz-manim-finish-animations-summary": plan.summary
  };
}

export function serializeSceneFinishAnimationsPlan(plan: MathSceneFinishAnimationsPlan) {
  return stableSerialize(plan);
}
