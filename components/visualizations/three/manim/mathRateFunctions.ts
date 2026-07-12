import type { AnimationStep } from "./mathSceneTypes";

export type MathRateFunctionName = "linear" | "smooth";

export const RATE_FUNCTION_SOURCE_CONTRACT =
  "Scene.play(..., rate_func): linear time alpha is transformed by rate_func before animation interpolation";

export const RATE_FUNCTION_ALPHA_POLICY = "rate-function-maps-linear-time-alpha-to-eased-animation-alpha";

export type MathRateFunctionCatalogEntry = {
  duration: number;
  rateFunction: MathRateFunctionName;
  stepIndex: number;
  stepType: AnimationStep["type"];
};

export type MathRateFunctionCatalog = {
  alphaPolicy: typeof RATE_FUNCTION_ALPHA_POLICY;
  entries: MathRateFunctionCatalogEntry[];
  linearDuration: number;
  linearStepCount: number;
  rateFunctionIds: string;
  sceneId: string;
  smoothDuration: number;
  smoothStepCount: number;
  sourceContract: typeof RATE_FUNCTION_SOURCE_CONTRACT;
  stepCount: number;
  stepTypes: string;
  summary: string;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function smoothStep(alpha: number) {
  return alpha * alpha * (3 - 2 * alpha);
}

export function applyRateFunction(rateFunction: MathRateFunctionName, alpha: number) {
  const bounded = clamp01(alpha);

  if (rateFunction === "smooth") return smoothStep(bounded);
  return bounded;
}

export function rateFunctionForStep(step: AnimationStep | undefined): MathRateFunctionName {
  if (!step) return "linear";
  if (step.type === "animateTracker") return step.easing;
  if (step.type === "sweepParameter") return step.easing;
  if (step.type === "revealCurve") return step.easing;
  if (step.type === "revealSurface") return step.easing;
  if (step.type === "fadeInObject") return step.easing;
  if (step.type === "fadeOutObject") return step.easing;
  if (step.type === "growFromCenter") return step.easing;
  if (step.type === "moveAlongPath") return "linear";
  if (step.type === "wait") return "linear";
  return "smooth";
}

function stableDuration(value: number) {
  return Number(Math.max(0, finite(value, 0)).toFixed(6));
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

function joinedUnique(values: string[]) {
  return [...new Set(values)].join(",") || "none";
}

export function buildRateFunctionCatalog(input: {
  sceneId: string;
  timeline: AnimationStep[];
}): MathRateFunctionCatalog {
  const entries = input.timeline.map((step, stepIndex): MathRateFunctionCatalogEntry => ({
    duration: stableDuration(step.duration),
    rateFunction: rateFunctionForStep(step),
    stepIndex,
    stepType: step.type
  }));
  const linearEntries = entries.filter((entry) => entry.rateFunction === "linear");
  const smoothEntries = entries.filter((entry) => entry.rateFunction === "smooth");
  const linearDuration = stableDuration(linearEntries.reduce((sum, entry) => sum + entry.duration, 0));
  const smoothDuration = stableDuration(smoothEntries.reduce((sum, entry) => sum + entry.duration, 0));
  const rateFunctionIds = joinedUnique(entries.map((entry) => entry.rateFunction).sort());
  const stepTypes = entries.map((entry) => entry.stepType).join(",") || "none";

  return {
    alphaPolicy: RATE_FUNCTION_ALPHA_POLICY,
    entries,
    linearDuration,
    linearStepCount: linearEntries.length,
    rateFunctionIds,
    sceneId: input.sceneId,
    smoothDuration,
    smoothStepCount: smoothEntries.length,
    sourceContract: RATE_FUNCTION_SOURCE_CONTRACT,
    stepCount: entries.length,
    stepTypes,
    summary: [
      `rateFunctions:${input.sceneId}`,
      `steps=${entries.length}`,
      `linear=${linearEntries.length}/${linearDuration.toFixed(3)}`,
      `smooth=${smoothEntries.length}/${smoothDuration.toFixed(3)}`,
      `ids=${rateFunctionIds}`,
      `types=${stepTypes}`
    ].join(":")
  };
}

export function rateFunctionCatalogDataAttributes(catalog: MathRateFunctionCatalog): Record<string, string> {
  return {
    "data-viz-manim-rate-function-alpha-policy": catalog.alphaPolicy,
    "data-viz-manim-rate-function-ids": catalog.rateFunctionIds,
    "data-viz-manim-rate-function-linear-count": String(catalog.linearStepCount),
    "data-viz-manim-rate-function-linear-duration": catalog.linearDuration.toFixed(3),
    "data-viz-manim-rate-function-smooth-count": String(catalog.smoothStepCount),
    "data-viz-manim-rate-function-smooth-duration": catalog.smoothDuration.toFixed(3),
    "data-viz-manim-rate-function-source-contract": catalog.sourceContract,
    "data-viz-manim-rate-function-step-count": String(catalog.stepCount),
    "data-viz-manim-rate-function-step-types": catalog.stepTypes,
    "data-viz-manim-rate-function-summary": catalog.summary
  };
}

export function serializeRateFunctionCatalog(catalog: MathRateFunctionCatalog) {
  return stableSerialize(catalog);
}
