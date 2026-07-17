import type {
  MathObjectSpec,
  MathSceneAlwaysMethodPointExpressionSpec,
  MathSceneAlwaysMethodUpdaterSpec,
  MathSceneAlwaysRedrawFactorySpec,
  MathSceneAlwaysRedrawScalarExpressionSpec,
  MathSceneAlwaysRedrawSpec,
  Vec3
} from "./mathSceneTypes";
import type { MathTrackerRegistry } from "./mathValueTracker";

export type AlwaysRedrawDependency = {
  id: string;
  normalizedValue: number;
  present: boolean;
  value: number;
};

export type AlwaysRedrawDependencyState = {
  byId: Record<string, AlwaysRedrawDependency>;
  missingTrackerIds: string[];
  signature: string;
  trackerIds: string[];
};

export type AlwaysRedrawFactory<TObject extends MathObjectSpec = MathObjectSpec> = (
  state: AlwaysRedrawDependencyState
) => TObject;

export type AlwaysRedrawFrame<TObject extends MathObjectSpec = MathObjectSpec> = {
  changed: boolean;
  dependencyState: AlwaysRedrawDependencyState;
  object: TObject;
  objectId: string;
  planId: string;
  source: "alwaysRedraw";
};

export type AlwaysUpdaterAuthoringCatalog = {
  alwaysMethodCount: number;
  alwaysRedrawCount: number;
  dependencyTrackerIds: string[];
  factoryCount: number;
  missingTrackerIds: string[];
  objectIds: string[];
  operationTypes: string[];
  sourceContract: typeof ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT;
  summary: string;
  totalUpdaterCount: number;
  updaterIds: string[];
  version: "mais-manim-always-updater/v1";
};

export const ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT =
  "Mobject.always/f_always/always_redraw: declare updater relationships separately from frame execution" as const;

function finite(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function fixed(value: number) {
  return finite(value, 0).toFixed(6);
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

function stableSampleCount(value: number) {
  return Math.max(2, Math.min(512, Math.floor(finite(value, 2))));
}

function lerp(left: number, right: number, progress: number) {
  return left + (right - left) * progress;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function expressionTrackerIds(expression: MathSceneAlwaysRedrawScalarExpressionSpec | undefined): string[] {
  if (!expression) return [];
  if (expression.type === "tracker") return [expression.trackerId];
  if (expression.type === "add") return uniqueStrings(expression.terms.flatMap(expressionTrackerIds));
  if (expression.type === "max" || expression.type === "min") return uniqueStrings(expression.terms.flatMap(expressionTrackerIds));
  if (expression.type === "multiply") return uniqueStrings(expression.factors.flatMap(expressionTrackerIds));
  if (expression.type === "sin" || expression.type === "log") return expressionTrackerIds(expression.value);
  return [];
}

function pointExpressionTrackerIds(pointExpression: MathSceneAlwaysMethodPointExpressionSpec | undefined): string[] {
  if (!pointExpression) return [];

  return uniqueStrings([
    ...expressionTrackerIds(pointExpression.x),
    ...expressionTrackerIds(pointExpression.y),
    ...expressionTrackerIds(pointExpression.z)
  ]);
}

function factoryTrackerIds(factory: MathSceneAlwaysRedrawFactorySpec | undefined): string[] {
  if (!factory) return [];
  if (factory.type === "parametricCurve") {
    return uniqueStrings([
      ...expressionTrackerIds(factory.x),
      ...expressionTrackerIds(factory.y),
      ...expressionTrackerIds(factory.z)
    ]);
  }

  return [];
}

export function alwaysRedrawDependencyTrackerIds(plan: MathSceneAlwaysRedrawSpec) {
  return uniqueStrings([
    ...plan.dependencyTrackerIds,
    ...factoryTrackerIds(plan.factory)
  ]);
}

function dependencyForTracker(trackers: MathTrackerRegistry, trackerId: string): AlwaysRedrawDependency {
  const tracker = trackers.byId[trackerId];
  if (!tracker) {
    return {
      id: trackerId,
      normalizedValue: 0,
      present: false,
      value: 0
    };
  }

  return {
    id: trackerId,
    normalizedValue: finite(tracker.normalizedValue, 0),
    present: true,
    value: finite(tracker.value, 0)
  };
}

function signaturePart(dependency: AlwaysRedrawDependency) {
  if (!dependency.present) return `missing:${dependency.id}`;
  return `${dependency.id}=${fixed(dependency.value)}@${fixed(dependency.normalizedValue)}`;
}

export function buildAlwaysRedrawDependencyState(
  trackers: MathTrackerRegistry,
  dependencyTrackerIds: string[]
): AlwaysRedrawDependencyState {
  const trackerIds = [...dependencyTrackerIds];
  const dependencies = trackerIds.map((trackerId) => dependencyForTracker(trackers, trackerId));

  return {
    byId: Object.fromEntries(dependencies.map((dependency) => [dependency.id, dependency])),
    missingTrackerIds: dependencies.filter((dependency) => !dependency.present).map((dependency) => dependency.id),
    signature: dependencies.map(signaturePart).join("|"),
    trackerIds
  };
}

export function evaluateAlwaysRedrawFrame<TObject extends MathObjectSpec>(
  plan: MathSceneAlwaysRedrawSpec,
  trackers: MathTrackerRegistry,
  factory: AlwaysRedrawFactory<TObject>,
  previousFrame?: AlwaysRedrawFrame<TObject>
): AlwaysRedrawFrame<TObject> {
  const dependencyState = buildAlwaysRedrawDependencyState(trackers, alwaysRedrawDependencyTrackerIds(plan));

  if (previousFrame?.dependencyState.signature === dependencyState.signature) {
    return {
      ...previousFrame,
      changed: false,
      dependencyState
    };
  }

  return {
    changed: true,
    dependencyState,
    object: factory(dependencyState),
    objectId: plan.objectId,
    planId: plan.id,
    source: "alwaysRedraw"
  };
}

export function evaluateAlwaysRedrawScalarExpression(
  expression: MathSceneAlwaysRedrawScalarExpressionSpec | undefined,
  input: { dependencyState: AlwaysRedrawDependencyState; t: number }
): number {
  if (!expression) return 0;

  if (expression.type === "constant") return finite(expression.value, 0);
  if (expression.type === "t") {
    const scale = finite(expression.scale, 1);
    const offset = finite(expression.offset, 0);
    return finite(input.t, 0) * scale + offset;
  }
  if (expression.type === "tracker") {
    const dependency = input.dependencyState.byId[expression.trackerId];
    const scale = finite(expression.scale, 1);
    const offset = finite(expression.offset, 0);
    return finite(dependency?.value, 0) * scale + offset;
  }
  if (expression.type === "add") {
    return expression.terms.reduce((sum, term) => sum + evaluateAlwaysRedrawScalarExpression(term, input), 0);
  }
  if (expression.type === "max") {
    return Math.max(...expression.terms.map((term) => evaluateAlwaysRedrawScalarExpression(term, input)));
  }
  if (expression.type === "min") {
    return Math.min(...expression.terms.map((term) => evaluateAlwaysRedrawScalarExpression(term, input)));
  }
  if (expression.type === "sin") {
    return Math.sin(evaluateAlwaysRedrawScalarExpression(expression.value, input));
  }
  if (expression.type === "log") {
    return Math.log(Math.max(Number.EPSILON, evaluateAlwaysRedrawScalarExpression(expression.value, input)));
  }

  return expression.factors.reduce((product, factor) => product * evaluateAlwaysRedrawScalarExpression(factor, input), 1);
}

function objectColorRole(object: MathObjectSpec) {
  return "colorRole" in object ? object.colorRole : "function";
}

function objectConceptId(object: MathObjectSpec, objectId: string) {
  if ("conceptId" in object && object.conceptId) return object.conceptId;
  return objectId;
}

function parametricCurveFromFactory(
  factory: Extract<MathSceneAlwaysRedrawFactorySpec, { type: "parametricCurve" }>,
  plan: MathSceneAlwaysRedrawSpec,
  trackers: MathTrackerRegistry,
  fallbackObject: MathObjectSpec
): Extract<MathObjectSpec, { type: "parametricCurve" }> {
  const dependencyState = buildAlwaysRedrawDependencyState(trackers, alwaysRedrawDependencyTrackerIds(plan));
  const sampleCount = stableSampleCount(factory.sampleCount);
  const [start, end] = factory.tRange;
  const tStart = finite(start, 0);
  const tEnd = finite(end, tStart);
  const samples = Array.from({ length: sampleCount }, (_, index): Vec3 => {
    const progress = sampleCount === 1 ? 0 : index / (sampleCount - 1);
    const t = lerp(tStart, tEnd, progress);
    const input = { dependencyState, t };

    return [
      finite(evaluateAlwaysRedrawScalarExpression(factory.x, input), 0),
      finite(evaluateAlwaysRedrawScalarExpression(factory.y, input), 0),
      finite(evaluateAlwaysRedrawScalarExpression(factory.z, input), 0)
    ];
  });

  return {
    colorRole: factory.colorRole ?? objectColorRole(fallbackObject),
    conceptId: factory.conceptId ?? objectConceptId(fallbackObject, plan.objectId),
    id: plan.objectId,
    samples,
    style: factory.style ?? ("style" in fallbackObject ? fallbackObject.style : undefined),
    type: "parametricCurve",
    uniforms: factory.uniforms ?? fallbackObject.uniforms
  };
}

export function buildAlwaysRedrawObjectFromFactory(
  plan: MathSceneAlwaysRedrawSpec,
  trackers: MathTrackerRegistry,
  fallbackObject: MathObjectSpec
): MathObjectSpec {
  if (!plan.factory) return fallbackObject;
  if (plan.factory.type === "parametricCurve") return parametricCurveFromFactory(plan.factory, plan, trackers, fallbackObject);
  return fallbackObject;
}

export function summarizeAlwaysRedrawPlan(plan: MathSceneAlwaysRedrawSpec) {
  return `${plan.id}->${plan.objectId}[${alwaysRedrawDependencyTrackerIds(plan).join(",")}]`;
}

function alwaysMethodDependencyTrackerIds(updater: MathSceneAlwaysMethodUpdaterSpec) {
  if (updater.operation.type === "nextTo") return expressionTrackerIds(updater.operation.buffExpression);
  if (updater.operation.type === "moveTo") return pointExpressionTrackerIds(updater.operation.pointExpression);
  if (updater.operation.type === "scale") return expressionTrackerIds(updater.operation.factorExpression);
  if (updater.operation.type === "stretch") return expressionTrackerIds(updater.operation.factorExpression);
  if (updater.operation.type === "setDepth") return expressionTrackerIds(updater.operation.depthExpression);
  if (updater.operation.type === "setHeight") return expressionTrackerIds(updater.operation.heightExpression);
  if (updater.operation.type === "setWidth") return expressionTrackerIds(updater.operation.widthExpression);
  if (updater.operation.type === "rotate") return expressionTrackerIds(updater.operation.angleExpression);
  if (updater.operation.type === "setOpacity") return expressionTrackerIds(updater.operation.opacityExpression);
  if (updater.operation.type === "setStroke") {
    return uniqueStrings([
      ...expressionTrackerIds(updater.operation.strokeOpacityExpression),
      ...expressionTrackerIds(updater.operation.strokeWidthExpression)
    ]);
  }
  if (updater.operation.type === "setFill") return expressionTrackerIds(updater.operation.fillOpacityExpression);
  if (updater.operation.type === "setStyle") {
    return uniqueStrings([
      ...expressionTrackerIds(updater.operation.antiAliasWidthExpression),
      ...expressionTrackerIds(updater.operation.fillOpacityExpression),
      ...expressionTrackerIds(updater.operation.jointAngleDegreesExpression),
      ...expressionTrackerIds(updater.operation.strokeOpacityExpression),
      ...expressionTrackerIds(updater.operation.strokeWidthExpression)
    ]);
  }
  if (updater.operation.type === "setX" || updater.operation.type === "setY" || updater.operation.type === "setZ") {
    return expressionTrackerIds(updater.operation.coordinateExpression);
  }

  return [];
}

function buildAlwaysUpdaterSummary(catalog: Omit<AlwaysUpdaterAuthoringCatalog, "summary" | "version">) {
  return [
    `alwaysUpdater:total=${catalog.totalUpdaterCount}`,
    `redraw=${catalog.alwaysRedrawCount}`,
    `method=${catalog.alwaysMethodCount}`,
    `objects=${catalog.objectIds.join(",") || "none"}`,
    `trackers=${catalog.dependencyTrackerIds.join(",") || "none"}`,
    `missing=${catalog.missingTrackerIds.join(",") || "none"}`,
    `factories=${catalog.factoryCount}`,
    `operations=${catalog.operationTypes.join(",") || "none"}`
  ].join(":");
}

// Manim source contract:
// - always_redraw rebuilds an object when captured tracker dependencies change.
// - always / f_always attach method-like relationship updaters to mobjects.
// - both are authoring-time updater declarations and need QA evidence separate
//   from frame-by-frame updater execution.
export function buildAlwaysUpdaterAuthoringCatalog({
  alwaysMethodUpdaters = [],
  alwaysRedraw = [],
  trackers = { byId: {} }
}: {
  alwaysMethodUpdaters?: MathSceneAlwaysMethodUpdaterSpec[];
  alwaysRedraw?: MathSceneAlwaysRedrawSpec[];
  trackers?: MathTrackerRegistry;
}): AlwaysUpdaterAuthoringCatalog {
  const dependencyTrackerIds = uniqueSorted([
    ...alwaysRedraw.flatMap(alwaysRedrawDependencyTrackerIds),
    ...alwaysMethodUpdaters.flatMap(alwaysMethodDependencyTrackerIds)
  ]);
  const dependencyState = buildAlwaysRedrawDependencyState(trackers, dependencyTrackerIds);
  const baseCatalog = {
    alwaysMethodCount: alwaysMethodUpdaters.length,
    alwaysRedrawCount: alwaysRedraw.length,
    dependencyTrackerIds,
    factoryCount: alwaysRedraw.filter((plan) => plan.factory !== undefined).length,
    missingTrackerIds: uniqueSorted(dependencyState.missingTrackerIds),
    objectIds: uniqueSorted([
      ...alwaysRedraw.map((plan) => plan.objectId),
      ...alwaysMethodUpdaters.map((updater) => updater.objectId)
    ]),
    operationTypes: uniqueSorted(alwaysMethodUpdaters.map((updater) => updater.operation.type)),
    sourceContract: ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT,
    totalUpdaterCount: alwaysRedraw.length + alwaysMethodUpdaters.length,
    updaterIds: uniqueSorted([
      ...alwaysRedraw.map((plan) => plan.id),
      ...alwaysMethodUpdaters.map((updater) => updater.id)
    ])
  };

  return {
    ...baseCatalog,
    summary: buildAlwaysUpdaterSummary(baseCatalog),
    version: "mais-manim-always-updater/v1"
  };
}

export function alwaysUpdaterAuthoringDataAttributes(catalog: AlwaysUpdaterAuthoringCatalog): Record<string, string> {
  return {
    "data-viz-manim-always-updater-count": String(catalog.totalUpdaterCount),
    "data-viz-manim-always-updater-always-method-count": String(catalog.alwaysMethodCount),
    "data-viz-manim-always-updater-always-redraw-count": String(catalog.alwaysRedrawCount),
    "data-viz-manim-always-updater-dependency-tracker-count": String(catalog.dependencyTrackerIds.length),
    "data-viz-manim-always-updater-dependency-tracker-ids": catalog.dependencyTrackerIds.join(",") || "none",
    "data-viz-manim-always-updater-factory-count": String(catalog.factoryCount),
    "data-viz-manim-always-updater-missing-tracker-count": String(catalog.missingTrackerIds.length),
    "data-viz-manim-always-updater-object-ids": catalog.objectIds.join(",") || "none",
    "data-viz-manim-always-updater-operation-types": catalog.operationTypes.join(",") || "none",
    "data-viz-manim-always-updater-source-contract": catalog.sourceContract,
    "data-viz-manim-always-updater-summary": catalog.summary,
    "data-viz-manim-always-updater-updater-ids": catalog.updaterIds.join(",") || "none"
  };
}

export function serializeAlwaysUpdaterAuthoringCatalog(catalog: AlwaysUpdaterAuthoringCatalog) {
  return stableSerialize(catalog);
}
