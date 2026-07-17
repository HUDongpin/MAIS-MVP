import type { MathSceneAnimatePlanSpec, MathSceneAnimationCompositionSpec } from "./mathSceneTypes";

export type MathLagRatioSourceType = "animationPlan" | "animationComposition";

export const LAG_RATIO_SOURCE_CONTRACT =
  "Animation.interpolate_mobject(...): lag_ratio computes per-family sub-alpha before mobject interpolation";

export const LAG_RATIO_SUB_ALPHA_POLICY = "lag-ratio-staggers-animation-progress-through-sub-alpha-windows";

export type MathLagRatioCatalogEntry = {
  authored: boolean;
  lagRatio: number;
  objectId: string;
  sourceId: string;
  sourceType: MathLagRatioSourceType;
};

export type MathLagRatioCatalog = {
  animationPlanCount: number;
  authoredLagRatioCount: number;
  compositionCount: number;
  compositionIds: string;
  entries: MathLagRatioCatalogEntry[];
  maxLagRatio: number;
  nonZeroLagRatioCount: number;
  objectIds: string;
  sceneId: string;
  sourceContract: typeof LAG_RATIO_SOURCE_CONTRACT;
  subAlphaPolicy: typeof LAG_RATIO_SUB_ALPHA_POLICY;
  summary: string;
  zeroLagRatioCount: number;
};

type LagRatioAnimationPlanInput = Pick<MathSceneAnimatePlanSpec, "id" | "lagRatio" | "objectId">;
type LagRatioAnimationCompositionInput = Pick<
  MathSceneAnimationCompositionSpec,
  "animationPlanIds" | "id" | "lagRatio" | "type"
>;

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? value! : fallback;
}

function stableNonNegative(value: number | undefined) {
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
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right)).join(",") || "none";
}

function hasAuthoredLagRatio(value: number | undefined) {
  return value !== undefined && Number.isFinite(value);
}

export function summarizeLagRatioCatalog(catalog: Omit<MathLagRatioCatalog, "summary"> | MathLagRatioCatalog) {
  return [
    `lagRatios:${catalog.sceneId}`,
    `plans=${catalog.animationPlanCount}`,
    `compositions=${catalog.compositionCount}`,
    `authored=${catalog.authoredLagRatioCount}`,
    `nonzero=${catalog.nonZeroLagRatioCount}`,
    `zero=${catalog.zeroLagRatioCount}`,
    `max=${catalog.maxLagRatio.toFixed(3)}`,
    `objects=${catalog.objectIds}`,
    `compositions=${catalog.compositionIds}`
  ].join(":");
}

export function buildLagRatioCatalog(input: {
  animationCompositions?: LagRatioAnimationCompositionInput[];
  animationPlans?: LagRatioAnimationPlanInput[];
  sceneId: string;
}): MathLagRatioCatalog {
  const animationPlans = input.animationPlans ?? [];
  const animationCompositions = input.animationCompositions ?? [];
  const planEntries = animationPlans.map((plan): MathLagRatioCatalogEntry => ({
    authored: hasAuthoredLagRatio(plan.lagRatio),
    lagRatio: stableNonNegative(plan.lagRatio),
    objectId: plan.objectId,
    sourceId: plan.id,
    sourceType: "animationPlan"
  }));
  const compositionEntries = animationCompositions.map((composition): MathLagRatioCatalogEntry => ({
    authored: hasAuthoredLagRatio(composition.lagRatio),
    lagRatio: stableNonNegative(composition.lagRatio),
    objectId: "none",
    sourceId: composition.id,
    sourceType: "animationComposition"
  }));
  const entries = [...planEntries, ...compositionEntries];
  const catalogWithoutSummary: Omit<MathLagRatioCatalog, "summary"> = {
    animationPlanCount: animationPlans.length,
    authoredLagRatioCount: entries.filter((entry) => entry.authored).length,
    compositionCount: animationCompositions.length,
    compositionIds: joinedUnique(animationCompositions.map((composition) => composition.id)),
    entries,
    maxLagRatio: Number(Math.max(0, ...entries.map((entry) => entry.lagRatio)).toFixed(6)),
    nonZeroLagRatioCount: entries.filter((entry) => entry.lagRatio > 0).length,
    objectIds: joinedUnique(animationPlans.map((plan) => plan.objectId)),
    sceneId: input.sceneId,
    sourceContract: LAG_RATIO_SOURCE_CONTRACT,
    subAlphaPolicy: LAG_RATIO_SUB_ALPHA_POLICY,
    zeroLagRatioCount: entries.filter((entry) => entry.lagRatio === 0).length
  };

  return {
    ...catalogWithoutSummary,
    summary: summarizeLagRatioCatalog(catalogWithoutSummary)
  };
}

export function lagRatioCatalogDataAttributes(catalog: MathLagRatioCatalog): Record<string, string> {
  return {
    "data-viz-manim-lag-ratio-animation-plan-count": String(catalog.animationPlanCount),
    "data-viz-manim-lag-ratio-authored-count": String(catalog.authoredLagRatioCount),
    "data-viz-manim-lag-ratio-composition-count": String(catalog.compositionCount),
    "data-viz-manim-lag-ratio-composition-ids": catalog.compositionIds,
    "data-viz-manim-lag-ratio-max": catalog.maxLagRatio.toFixed(3),
    "data-viz-manim-lag-ratio-nonzero-count": String(catalog.nonZeroLagRatioCount),
    "data-viz-manim-lag-ratio-object-ids": catalog.objectIds,
    "data-viz-manim-lag-ratio-source-contract": catalog.sourceContract,
    "data-viz-manim-lag-ratio-sub-alpha-policy": catalog.subAlphaPolicy,
    "data-viz-manim-lag-ratio-summary": catalog.summary,
    "data-viz-manim-lag-ratio-zero-count": String(catalog.zeroLagRatioCount)
  };
}

export function serializeLagRatioCatalog(catalog: MathLagRatioCatalog) {
  return stableSerialize(catalog);
}
