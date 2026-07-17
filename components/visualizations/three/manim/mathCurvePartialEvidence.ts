import {
  buildCurveObject,
  pointwiseBecomePartialCurveObject,
  type CurvePartialFrame
} from "./mathCurveObject";
import type { MathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";

function isParametricCurveSpec(
  object: MathSceneSpec["objects"][number]
): object is Extract<MathSceneSpec["objects"][number], { type: "parametricCurve" }> {
  return object.type === "parametricCurve";
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

export function buildActiveCurvePartialFrame(runtimeState: MathSceneRuntimeState): CurvePartialFrame | null {
  const activeStep = runtimeState.timeline.activeStep;
  if (!activeStep || activeStep.type !== "revealCurve") return null;

  const curveSpec = runtimeState.sourceScene.objects.find(
    (object) => isParametricCurveSpec(object) && object.id === activeStep.objectId
  );
  if (!curveSpec || !isParametricCurveSpec(curveSpec)) return null;

  const progress = runtimeState.trackers.byId[`${curveSpec.id}:progress`]?.value ?? runtimeState.timeline.easedLocalProgress;
  const curve = buildCurveObject({
    colorRole: curveSpec.colorRole,
    conceptId: curveSpec.conceptId,
    id: curveSpec.id,
    samples: curveSpec.samples,
    style: curveSpec.style
  });

  return pointwiseBecomePartialCurveObject(curve, 0, progress);
}

export function serializeCurvePartialFrame(frame: CurvePartialFrame) {
  return stableSerialize(frame);
}

export type { CurvePartialFrame };
