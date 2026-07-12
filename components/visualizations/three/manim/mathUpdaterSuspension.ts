import type { MathMobjectFamilyIndex } from "./mathMobjectFamily";
import type { AnimationStep, MathSceneSpec, TimelineState } from "./mathSceneTypes";
import type { MathUpdaterEntry, MathUpdaterRegistry } from "./mathUpdaterRegistry";

export const UPDATER_SUSPENSION_SOURCE_CONTRACT =
  "Animation.begin may suspend mobject updating for animated families until finish" as const;
export const UPDATER_SUSPENSION_POLICY = "animated-family-updaters-suspended-during-animation" as const;

export type MathUpdaterSuspensionPlan = {
  activeUpdaterIds: string[];
  animatedObjectIds: string[];
  phase: "animation" | "open";
  reasonByUpdaterId: Record<string, string>;
  sourceContract: typeof UPDATER_SUSPENSION_SOURCE_CONTRACT;
  suspendedObjectIds: string[];
  suspendedUpdaterIds: string[];
  suspensionPolicy: typeof UPDATER_SUSPENSION_POLICY;
};

export type MathUpdaterSuspensionInput = {
  familyIndex: MathMobjectFamilyIndex;
  scene?: MathSceneSpec;
  timeline: TimelineState;
  updaters: MathUpdaterRegistry;
};

function sortedIds(ids: string[]) {
  return [...ids].sort((left, right) => left.localeCompare(right));
}

function uniqueSorted(ids: string[]) {
  return sortedIds([...new Set(ids)]);
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

function targetObjectId(step: AnimationStep | undefined) {
  if (!step) return undefined;
  if (
    step.type === "revealCurve" ||
    step.type === "revealSurface" ||
    step.type === "fadeInObject" ||
    step.type === "fadeOutObject" ||
    step.type === "growFromCenter" ||
    step.type === "moveAlongPath" ||
    step.type === "transformObject"
  ) {
    return step.objectId;
  }
  return undefined;
}

function compositionObjectIds(scene: MathSceneSpec | undefined, compositionId: string) {
  if (!scene) return [];

  const composition = scene.animationCompositions?.find((entry) => entry.id === compositionId);
  if (!composition) return [];

  const objectIdByPlanId = new Map((scene.animationPlans ?? []).map((plan) => [plan.id, plan.objectId]));
  return uniqueSorted(
    composition.animationPlanIds.flatMap((planId) => {
      const objectId = objectIdByPlanId.get(planId);
      return objectId ? [objectId] : [];
    })
  );
}

function animationOwningObjectIds(step: AnimationStep | undefined, scene: MathSceneSpec | undefined) {
  const directObjectId = targetObjectId(step);
  if (directObjectId) return [directObjectId];
  if (step?.type === "animationComposition") return compositionObjectIds(scene, step.compositionId);
  return [];
}

function allowedUpdaterTypesForStep(step: AnimationStep | undefined): MathUpdaterEntry["type"][] {
  if (step?.type === "revealCurve") return ["reveal-curve"];
  if (step?.type === "revealSurface") return ["reveal-surface"];
  if (step?.type === "moveAlongPath") return ["move-along-path", "trace-recent-path"];
  return [];
}

function familyIdsForObjects(familyIndex: MathMobjectFamilyIndex, objectIds: string[]) {
  return uniqueSorted(objectIds.flatMap((objectId) => familyIndex.byId[objectId]?.familyIds ?? [objectId]));
}

function suspensionReason(step: AnimationStep | undefined) {
  if (step?.type === "animationComposition") return `suspended-by-animationComposition:${step.compositionId}`;
  return `suspended-by-${step?.type ?? "unknown"}`;
}

export function buildUpdaterSuspensionPlan({
  familyIndex,
  scene,
  timeline,
  updaters
}: MathUpdaterSuspensionInput): MathUpdaterSuspensionPlan {
  const step = timeline.activeStep;
  const animatedObjectIds = animationOwningObjectIds(step, scene);

  if (animatedObjectIds.length === 0) {
    return {
      activeUpdaterIds: sortedIds(updaters.entries.map((entry) => entry.id)),
      animatedObjectIds: [],
      phase: "open",
      reasonByUpdaterId: {},
      sourceContract: UPDATER_SUSPENSION_SOURCE_CONTRACT,
      suspendedObjectIds: [],
      suspendedUpdaterIds: [],
      suspensionPolicy: UPDATER_SUSPENSION_POLICY
    };
  }

  const familySet = new Set(familyIdsForObjects(familyIndex, animatedObjectIds));
  const allowedTypes = new Set(allowedUpdaterTypesForStep(step));
  const suspendedEntries = updaters.entries.filter((entry) => familySet.has(entry.objectId) && !allowedTypes.has(entry.type));
  const reason = suspensionReason(step);
  const reasonByUpdaterId = Object.fromEntries(suspendedEntries.map((entry) => [entry.id, reason]));

  return {
    activeUpdaterIds: sortedIds(updaters.entries.filter((entry) => !reasonByUpdaterId[entry.id]).map((entry) => entry.id)),
    animatedObjectIds,
    phase: "animation",
    reasonByUpdaterId,
    sourceContract: UPDATER_SUSPENSION_SOURCE_CONTRACT,
    suspendedObjectIds: uniqueSorted(suspendedEntries.map((entry) => entry.objectId)),
    suspendedUpdaterIds: sortedIds(suspendedEntries.map((entry) => entry.id)),
    suspensionPolicy: UPDATER_SUSPENSION_POLICY
  };
}

export function serializeUpdaterSuspensionPlan(plan: MathUpdaterSuspensionPlan) {
  return stableSerialize(plan);
}
