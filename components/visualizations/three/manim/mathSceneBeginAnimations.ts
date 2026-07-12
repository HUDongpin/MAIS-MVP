export type MathSceneBeginAnimationSpec = {
  animationId: string;
  familyIds?: string[];
  mobjectWasUpdating?: boolean;
  objectId?: string;
  runTime: number;
  suspendMobjectUpdating?: boolean;
  timeSpan?: [number, number] | null;
};

export type MathSceneBeginAnimationRow = {
  addedFamilyIds: string[];
  addedToScene: boolean;
  animationId: string;
  callsBegin: boolean;
  callsInterpolateZero: boolean;
  callsSuspendUpdating: boolean;
  familyIds: string[];
  familyTupleCount: number;
  mobjectWasUpdating: boolean;
  objectId: string;
  runTimeAfterBegin: number;
  runTimeBeforeBegin: number;
  setsAnimatingStatusTrue: boolean;
  startingMobjectId: string;
  timeSpanEnd: number | null;
};

export type MathSceneBeginAnimationsPlan = {
  addedFamilyIds: string[];
  addedObjectCount: number;
  addedObjectIds: string[];
  animationCount: number;
  beginCallCount: number;
  beginLifecycleSummary: string;
  finalSceneFamilyIds: string[];
  initialSceneFamilyIds: string[];
  interpolateZeroCallCount: number;
  maxRunTime: number;
  rows: MathSceneBeginAnimationRow[];
  sceneAddCallCount: number;
  sceneFamilyCountAfter: number;
  sceneFamilyCountBefore: number;
  setAnimatingStatusCount: number;
  sourceContract: string;
  startStatePolicy: string;
  startingMobjectCopyCount: number;
  startingMobjectIds: string[];
  summary: string;
  suspendUpdatingCallCount: number;
  version: "mais-manim-begin-animations/v1";
};

export type MathSceneBeginAnimationsInput = {
  animations: MathSceneBeginAnimationSpec[];
  sceneFamilyIds?: string[];
};

export const SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT =
  "Scene.begin_animations -> Animation.begin -> set_animating_status(True)/create_starting_mobject/suspend_updating/interpolate(0) -> scene.add missing families";

export const SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY =
  "starting-mobject-copy-before-interpolate-zero-and-family-admission";

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

function normalizeId(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function uniqueIds(ids: string[]) {
  const seen = new Set<string>();

  return ids
    .map((id) => id.trim())
    .filter((id) => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

function normalizeFamilyIds(objectId: string, familyIds: string[] | undefined) {
  const ids = uniqueIds(familyIds ?? []);
  return ids.includes(objectId) ? ids : [objectId, ...ids];
}

function normalizeAnimation(animation: MathSceneBeginAnimationSpec, index: number) {
  const animationId = normalizeId(animation.animationId, `animation-${index}`);
  const objectId = normalizeId(animation.objectId, animationId);
  const runTimeBeforeBegin = stableRunTime(animation.runTime);
  const timeSpanEnd = animation.timeSpan ? stableNumber(animation.timeSpan[1]) : null;
  const runTimeAfterBegin = timeSpanEnd === null ? runTimeBeforeBegin : Math.max(runTimeBeforeBegin, timeSpanEnd);

  return {
    animationId,
    familyIds: normalizeFamilyIds(objectId, animation.familyIds),
    mobjectWasUpdating: animation.mobjectWasUpdating === true,
    objectId,
    runTimeAfterBegin,
    runTimeBeforeBegin,
    suspendMobjectUpdating: animation.suspendMobjectUpdating === true,
    timeSpanEnd
  };
}

function summarizeIds(ids: string[]) {
  return ids.join(",") || "none";
}

function buildSummary(plan: Omit<MathSceneBeginAnimationsPlan, "summary" | "version">) {
  return [
    `beginAnimations:animations=${plan.animationCount}`,
    `begin=${plan.beginCallCount}`,
    `added=${summarizeIds(plan.addedObjectIds)}`,
    `suspend=${plan.suspendUpdatingCallCount}`,
    `run=${plan.maxRunTime.toFixed(3)}`,
    `families=${plan.sceneFamilyCountAfter}`
  ].join(":");
}

function lifecycleStepsForRow(row: MathSceneBeginAnimationRow) {
  return [
    ...(row.setsAnimatingStatusTrue ? ["set_animating_status"] : []),
    "create_starting_mobject",
    ...(row.callsSuspendUpdating ? ["suspend_updating"] : []),
    ...(row.callsInterpolateZero ? ["interpolate_zero"] : []),
    ...(row.addedToScene ? ["scene_add"] : [])
  ];
}

function summarizeBeginLifecycle(rows: MathSceneBeginAnimationRow[]) {
  return rows.map((row) => `${row.animationId}=${lifecycleStepsForRow(row).join(">")}`).join(";") || "none";
}

// Manim source contract:
// - Scene.begin_animations builds all_mobjects from scene family members.
// - It calls animation.begin() before deciding whether scene.add is needed.
// - Animation.begin adjusts run_time for time_span, calls set_animating_status(True),
//   creates a create_starting_mobject copy, optionally calls suspend_updating,
//   stores get_family tuples, and calls interpolate(0).
// - If animation.mobject is not already in all_mobjects, Scene.begin_animations
//   calls scene.add(animation.mobject) and unions animation.mobject.get_family().
export function buildSceneBeginAnimationsPlan(input: MathSceneBeginAnimationsInput): MathSceneBeginAnimationsPlan {
  const animations = input.animations.map(normalizeAnimation);
  const initialSceneFamilyIds = uniqueIds(input.sceneFamilyIds ?? []);
  const sceneFamilyIds = [...initialSceneFamilyIds];
  const sceneFamilySet = new Set(sceneFamilyIds);
  const addedObjectIds: string[] = [];
  const addedFamilyIds: string[] = [];
  const rows = animations.map((animation) => {
    const addedToScene = !sceneFamilySet.has(animation.objectId);
    const newlyAddedFamilyIds = addedToScene
      ? animation.familyIds.filter((familyId) => !sceneFamilySet.has(familyId))
      : [];

    if (addedToScene) {
      addedObjectIds.push(animation.objectId);
      newlyAddedFamilyIds.forEach((familyId) => {
        sceneFamilySet.add(familyId);
        sceneFamilyIds.push(familyId);
        addedFamilyIds.push(familyId);
      });
    }

    return {
      addedFamilyIds: newlyAddedFamilyIds,
      addedToScene,
      animationId: animation.animationId,
      callsBegin: true,
      callsInterpolateZero: true,
      callsSuspendUpdating: animation.suspendMobjectUpdating,
      familyIds: animation.familyIds,
      familyTupleCount: animation.familyIds.length,
      mobjectWasUpdating: animation.mobjectWasUpdating,
      objectId: animation.objectId,
      runTimeAfterBegin: animation.runTimeAfterBegin,
      runTimeBeforeBegin: animation.runTimeBeforeBegin,
      setsAnimatingStatusTrue: true,
      startingMobjectId: `${animation.objectId}:starting-mobject`,
      timeSpanEnd: animation.timeSpanEnd
    };
  });
  const startingMobjectIds = rows.map((row) => row.startingMobjectId);
  const basePlan = {
    addedFamilyIds,
    addedObjectCount: addedObjectIds.length,
    addedObjectIds,
    animationCount: animations.length,
    beginCallCount: rows.length,
    beginLifecycleSummary: summarizeBeginLifecycle(rows),
    finalSceneFamilyIds: sceneFamilyIds,
    initialSceneFamilyIds,
    interpolateZeroCallCount: rows.length,
    maxRunTime: rows.reduce((maxRunTime, row) => Math.max(maxRunTime, row.runTimeAfterBegin), 0),
    rows,
    sceneAddCallCount: addedObjectIds.length,
    sceneFamilyCountAfter: sceneFamilyIds.length,
    sceneFamilyCountBefore: initialSceneFamilyIds.length,
    setAnimatingStatusCount: rows.length,
    sourceContract: SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT,
    startStatePolicy: SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY,
    startingMobjectCopyCount: rows.length,
    startingMobjectIds,
    suspendUpdatingCallCount: rows.filter((row) => row.callsSuspendUpdating).length
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan),
    version: "mais-manim-begin-animations/v1"
  };
}

export function sceneBeginAnimationsDataAttributes(plan: MathSceneBeginAnimationsPlan): Record<string, string> {
  return {
    "data-viz-manim-begin-animations-added-count": String(plan.addedObjectCount),
    "data-viz-manim-begin-animations-added-ids": summarizeIds(plan.addedObjectIds),
    "data-viz-manim-begin-animations-begin-count": String(plan.beginCallCount),
    "data-viz-manim-begin-animations-count": String(plan.animationCount),
    "data-viz-manim-begin-animations-lifecycle-summary": plan.beginLifecycleSummary,
    "data-viz-manim-begin-animations-family-count-after": String(plan.sceneFamilyCountAfter),
    "data-viz-manim-begin-animations-family-count-before": String(plan.sceneFamilyCountBefore),
    "data-viz-manim-begin-animations-interpolate-zero-count": String(plan.interpolateZeroCallCount),
    "data-viz-manim-begin-animations-run-time": plan.maxRunTime.toFixed(3),
    "data-viz-manim-begin-animations-scene-add-count": String(plan.sceneAddCallCount),
    "data-viz-manim-begin-animations-set-animating-status-count": String(plan.setAnimatingStatusCount),
    "data-viz-manim-begin-animations-source-contract": plan.sourceContract,
    "data-viz-manim-begin-animations-start-state-policy": plan.startStatePolicy,
    "data-viz-manim-begin-animations-starting-copy-count": String(plan.startingMobjectCopyCount),
    "data-viz-manim-begin-animations-starting-copy-ids": summarizeIds(plan.startingMobjectIds),
    "data-viz-manim-begin-animations-summary": plan.summary,
    "data-viz-manim-begin-animations-suspend-count": String(plan.suspendUpdatingCallCount)
  };
}

export function serializeSceneBeginAnimationsPlan(plan: MathSceneBeginAnimationsPlan) {
  return stableSerialize(plan);
}
