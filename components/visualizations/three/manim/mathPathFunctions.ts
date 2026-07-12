import type { Vec3 } from "./mathSceneTypes";

export const TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT =
  "Mobject.interpolate(start,target,alpha,path_func): pointlike fields follow path functions while non-point data blends linearly" as const;
export const TRANSFORM_PATH_POINTLIKE_FIELD_POLICY = "pointlike-fields-use-path-function" as const;
export const TRANSFORM_PATH_NON_POINT_FIELD_POLICY = "non-point-data-linear-blend" as const;

export type TransformPathFunction = (from: Vec3, to: Vec3, alpha: number) => Vec3;

export type TransformPathSpec =
  | { type: "arc"; angleRadians: number; axis?: Vec3 }
  | { type: "straight" };

export type TransformPathFunctionCatalogPlanInput = {
  id: string;
  objectId: string;
  path?: TransformPathSpec;
  sampleFrom?: Vec3;
  sampleTo?: Vec3;
  targetObjectId: string;
};

export type TransformPathFunctionCatalogEntry = {
  animationPlanId: string;
  objectId: string;
  pathSummary: string;
  pathType: TransformPathSpec["type"];
  targetObjectId: string;
};

export type TransformPathFunctionCatalog = {
  animationPlanCount: number;
  arcAngleRange: string;
  arcAxisSummary: string;
  arcMidpointDeviationRange: string;
  arcPathCount: number;
  authoredPathCount: number;
  degenerateArcCount: number;
  entries: TransformPathFunctionCatalogEntry[];
  midpointDeviationSummary: string;
  nonPointFieldPolicy: typeof TRANSFORM_PATH_NON_POINT_FIELD_POLICY;
  objectIds: string;
  pathSummaries: string;
  pointlikeFieldPolicy: typeof TRANSFORM_PATH_POINTLIKE_FIELD_POLICY;
  sampleAlpha: number;
  sampledMidpointSummary: string;
  sampledPathCount: number;
  sceneId: string;
  sourceContract: typeof TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT;
  straightPathCount: number;
  summary: string;
};

const DEFAULT_AXIS: Vec3 = [0, 0, 1];
const EPSILON = 1e-9;
const SAMPLE_ALPHA = 0.5;

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function safeVec3(value: Vec3): Vec3 {
  return [
    finite(value[0], 0),
    finite(value[1], 0),
    finite(value[2], 0)
  ];
}

function add(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function sub(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scale(value: Vec3, factor: number): Vec3 {
  return [value[0] * factor, value[1] * factor, value[2] * factor];
}

function dot(left: Vec3, right: Vec3) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function length(value: Vec3) {
  return Math.hypot(value[0], value[1], value[2]);
}

function normalize(value: Vec3, fallback: Vec3): Vec3 {
  const magnitude = length(value);
  if (!Number.isFinite(magnitude) || magnitude <= EPSILON) return fallback;
  return scale(value, 1 / magnitude);
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : "NaN";
}

function formatAxis(axis: Vec3) {
  return axis.map((value) => (Number.isFinite(value) ? value.toFixed(3) : "NaN")).join(",");
}

function formatPoint(point: Vec3) {
  return safeVec3(point)
    .map((value) => value.toFixed(3))
    .join(",");
}

function formatDeviation(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : "0.0000";
}

function rotateAroundAxis(point: Vec3, axis: Vec3, angleRadians: number): Vec3 {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const axisDot = dot(axis, point);
  const axisCrossPoint = cross(axis, point);

  return add(
    add(scale(point, cos), scale(axisCrossPoint, sin)),
    scale(axis, axisDot * (1 - cos))
  );
}

export const straightPath: TransformPathFunction = (from, to, alpha) => {
  const start = safeVec3(from);
  const end = safeVec3(to);
  const progress = clamp01(alpha);

  return [
    lerp(start[0], end[0], progress),
    lerp(start[1], end[1], progress),
    lerp(start[2], end[2], progress)
  ];
};

export function pathAlongArc(angleRadians: number, axis: Vec3 = DEFAULT_AXIS): TransformPathFunction {
  const angle = finite(angleRadians, 0);
  const safeAxis = normalize(safeVec3(axis), DEFAULT_AXIS);

  if (Math.abs(angle) <= EPSILON) return straightPath;

  return (from, to, alpha) => {
    const start = safeVec3(from);
    const end = safeVec3(to);
    const progress = clamp01(alpha);
    const chord = sub(end, start);
    const chordLength = length(chord);

    if (chordLength <= EPSILON) return straightPath(start, end, progress);

    const chordDirection = scale(chord, 1 / chordLength);
    const centerNormal = normalize(cross(safeAxis, chordDirection), [0, 0, 0]);
    const tanHalfAngle = Math.tan(angle / 2);

    if (length(centerNormal) <= EPSILON || Math.abs(tanHalfAngle) <= EPSILON) {
      return straightPath(start, end, progress);
    }

    const centerOffset = chordLength / (2 * tanHalfAngle);
    if (!Number.isFinite(centerOffset)) return straightPath(start, end, progress);

    const midpoint = scale(add(start, end), 0.5);
    const center = add(midpoint, scale(centerNormal, centerOffset));
    const relativeStart = sub(start, center);

    return add(center, rotateAroundAxis(relativeStart, safeAxis, angle * progress));
  };
}

export function resolveTransformPathFunction(spec: TransformPathSpec | undefined): TransformPathFunction {
  if (!spec || spec.type === "straight") return straightPath;
  return pathAlongArc(spec.angleRadians, spec.axis);
}

export function summarizeTransformPathSpec(spec: TransformPathSpec | undefined) {
  if (!spec || spec.type === "straight") return "straight";
  const axis = normalize(safeVec3(spec.axis ?? DEFAULT_AXIS), DEFAULT_AXIS);
  const axisLabel = axis[2] >= 0 ? "z+" : "z-";

  return `arc(${finite(spec.angleRadians, 0).toFixed(4)}rad,${axisLabel})`;
}

function joined(values: string[]) {
  return values.join(",") || "none";
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

function pathType(spec: TransformPathSpec | undefined): TransformPathSpec["type"] {
  return spec?.type === "arc" ? "arc" : "straight";
}

function arcSpecs(plans: TransformPathFunctionCatalogPlanInput[]) {
  return plans
    .filter((plan): plan is TransformPathFunctionCatalogPlanInput & { path: Extract<TransformPathSpec, { type: "arc" }> } => plan.path?.type === "arc")
    .map((plan) => ({
      angleRadians: finite(plan.path.angleRadians, 0),
      axis: normalize(safeVec3(plan.path.axis ?? DEFAULT_AXIS), DEFAULT_AXIS),
      objectId: plan.objectId
    }));
}

function formatArcAngleRange(arcEntries: ReturnType<typeof arcSpecs>) {
  if (arcEntries.length === 0) return "none";
  const angles = arcEntries.map((entry) => entry.angleRadians);
  return `${formatNumber(Math.min(...angles))}..${formatNumber(Math.max(...angles))}rad`;
}

function formatArcAxisSummary(arcEntries: ReturnType<typeof arcSpecs>) {
  return arcEntries.map((entry) => `${entry.objectId}=${formatAxis(entry.axis)}`).join(";") || "none";
}

function sampledPathRows(plans: TransformPathFunctionCatalogPlanInput[]) {
  return plans
    .filter((plan): plan is TransformPathFunctionCatalogPlanInput & { sampleFrom: Vec3; sampleTo: Vec3 } =>
      Boolean(plan.sampleFrom && plan.sampleTo)
    )
    .map((plan) => {
      const sampleFrom = safeVec3(plan.sampleFrom);
      const sampleTo = safeVec3(plan.sampleTo);
      const pathSample = resolveTransformPathFunction(plan.path)(sampleFrom, sampleTo, SAMPLE_ALPHA);
      const straightSample = straightPath(sampleFrom, sampleTo, SAMPLE_ALPHA);

      return {
        deviation: length(sub(pathSample, straightSample)),
        midpoint: pathSample,
        objectId: plan.objectId,
        pathType: pathType(plan.path)
      };
    });
}

function formatArcMidpointDeviationRange(rows: ReturnType<typeof sampledPathRows>) {
  const deviations = rows
    .filter((row) => row.pathType === "arc")
    .map((row) => row.deviation)
    .filter(Number.isFinite);

  if (deviations.length === 0) return "none";
  return `${formatDeviation(Math.min(...deviations))}..${formatDeviation(Math.max(...deviations))}`;
}

export function summarizeTransformPathFunctionCatalog(
  catalog: Omit<TransformPathFunctionCatalog, "summary"> | TransformPathFunctionCatalog
) {
  return [
    `transformPaths:${catalog.sceneId}`,
    `plans=${catalog.animationPlanCount}`,
    `authored=${catalog.authoredPathCount}`,
    `arc=${catalog.arcPathCount}`,
    `straight=${catalog.straightPathCount}`,
    `objects=${catalog.objectIds}`,
    `paths=${catalog.pathSummaries}`
  ].join(":");
}

export function buildTransformPathFunctionCatalog(input: {
  plans?: TransformPathFunctionCatalogPlanInput[];
  sceneId: string;
}): TransformPathFunctionCatalog {
  const plans = input.plans ?? [];
  const authoredArcSpecs = arcSpecs(plans);
  const samples = sampledPathRows(plans);
  const entries = plans.map((plan): TransformPathFunctionCatalogEntry => ({
    animationPlanId: plan.id,
    objectId: plan.objectId,
    pathSummary: summarizeTransformPathSpec(plan.path),
    pathType: pathType(plan.path),
    targetObjectId: plan.targetObjectId
  }));
  const catalogWithoutSummary = {
    animationPlanCount: plans.length,
    arcAngleRange: formatArcAngleRange(authoredArcSpecs),
    arcAxisSummary: formatArcAxisSummary(authoredArcSpecs),
    arcMidpointDeviationRange: formatArcMidpointDeviationRange(samples),
    arcPathCount: entries.filter((entry) => entry.pathType === "arc").length,
    authoredPathCount: plans.filter((plan) => plan.path !== undefined).length,
    degenerateArcCount: authoredArcSpecs.filter((entry) => Math.abs(entry.angleRadians) <= EPSILON).length,
    entries,
    midpointDeviationSummary: samples.map((sample) => `${sample.objectId}=${formatDeviation(sample.deviation)}`).join(";") || "none",
    nonPointFieldPolicy: TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
    objectIds: joined(entries.map((entry) => entry.objectId)),
    pathSummaries: joined(entries.map((entry) => entry.pathSummary)),
    pointlikeFieldPolicy: TRANSFORM_PATH_POINTLIKE_FIELD_POLICY,
    sampleAlpha: SAMPLE_ALPHA,
    sampledMidpointSummary: samples.map((sample) => `${sample.objectId}=${formatPoint(sample.midpoint)}`).join(";") || "none",
    sampledPathCount: samples.length,
    sceneId: input.sceneId,
    sourceContract: TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT,
    straightPathCount: entries.filter((entry) => entry.pathType === "straight").length
  };

  return {
    ...catalogWithoutSummary,
    summary: summarizeTransformPathFunctionCatalog(catalogWithoutSummary)
  };
}

export function transformPathFunctionCatalogDataAttributes(catalog: TransformPathFunctionCatalog): Record<string, string> {
  return {
    "data-viz-manim-transform-path-arc-angle-range": catalog.arcAngleRange,
    "data-viz-manim-transform-path-arc-axis-summary": catalog.arcAxisSummary,
    "data-viz-manim-transform-path-arc-midpoint-deviation-range": catalog.arcMidpointDeviationRange,
    "data-viz-manim-transform-path-arc-count": String(catalog.arcPathCount),
    "data-viz-manim-transform-path-authored-count": String(catalog.authoredPathCount),
    "data-viz-manim-transform-path-degenerate-arc-count": String(catalog.degenerateArcCount),
    "data-viz-manim-transform-path-midpoint-deviation-summary": catalog.midpointDeviationSummary,
    "data-viz-manim-transform-path-non-point-field-policy": catalog.nonPointFieldPolicy,
    "data-viz-manim-transform-path-object-ids": catalog.objectIds,
    "data-viz-manim-transform-path-pointlike-field-policy": catalog.pointlikeFieldPolicy,
    "data-viz-manim-transform-path-plan-count": String(catalog.animationPlanCount),
    "data-viz-manim-transform-path-sample-alpha": catalog.sampleAlpha.toFixed(3),
    "data-viz-manim-transform-path-sampled-count": String(catalog.sampledPathCount),
    "data-viz-manim-transform-path-sampled-midpoints": catalog.sampledMidpointSummary,
    "data-viz-manim-transform-path-straight-count": String(catalog.straightPathCount),
    "data-viz-manim-transform-path-summaries": catalog.pathSummaries,
    "data-viz-manim-transform-path-source-contract": catalog.sourceContract,
    "data-viz-manim-transform-path-summary": catalog.summary
  };
}

export function serializeTransformPathFunctionCatalog(catalog: TransformPathFunctionCatalog) {
  return stableSerialize(catalog);
}
