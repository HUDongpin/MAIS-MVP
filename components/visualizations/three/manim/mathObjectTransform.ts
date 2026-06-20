import {
  alignCurveSamplesForMorph,
  buildCurveObject,
  interpolateAlignedCurves,
  type AlignedCurveSamples
} from "./mathCurveObject";
import type { MathObjectSpec, Vec3 } from "./mathSceneTypes";
import type { RuntimeRenderState } from "./mathSceneRuntimeState";

export type TransformPathFunction = (from: Vec3, to: Vec3, alpha: number) => Vec3;

export type MathObjectTransformPlan = {
  alignedPointCount: number;
  colorRole?: string;
  conceptId: string;
  objectId: string;
  objectType: MathObjectSpec["type"];
  pathFunction?: TransformPathFunction;
  targetObjectId: string;
  transformData:
    | { kind: "curve"; aligned: AlignedCurveSamples }
    | { kind: "empty" }
    | { kind: "vector"; sourceFrom: Vec3; sourceTo: Vec3; targetFrom: Vec3; targetTo: Vec3 };
};

export type MathObjectTransformFrame = {
  colorRole?: string;
  conceptId: string;
  objectId: string;
  progress: number;
  renderState: RuntimeRenderState;
  targetObjectId: string;
};

export type LaggedObjectTransformPlan = {
  entries: MathObjectTransformPlan[];
  lagRatio: number;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function interpolatePoint(source: Vec3, target: Vec3, progress: number): Vec3 {
  return [
    lerp(source[0], target[0], progress),
    lerp(source[1], target[1], progress),
    lerp(source[2], target[2], progress)
  ];
}

function pointByPath(source: Vec3, target: Vec3, progress: number, pathFunction?: TransformPathFunction) {
  return pathFunction ? pathFunction(source, target, progress) : interpolatePoint(source, target, progress);
}

function conceptIdForObject(object: MathObjectSpec) {
  if ("conceptId" in object && object.conceptId) return object.conceptId;
  if (object.type === "trace") return `${object.sourceObjectId}:trace`;
  return object.id;
}

function colorRoleForObject(object: MathObjectSpec) {
  return "colorRole" in object ? object.colorRole : undefined;
}

function curveForObject(object: Extract<MathObjectSpec, { type: "parametricCurve" }>) {
  return buildCurveObject({
    colorRole: object.colorRole,
    conceptId: object.conceptId,
    id: object.id,
    samples: object.samples
  });
}

function buildTransformData(
  source: MathObjectSpec,
  target: MathObjectSpec,
  sampleCount: number | undefined
): MathObjectTransformPlan["transformData"] {
  if (source.type === "parametricCurve" && target.type === "parametricCurve") {
    return {
      aligned: alignCurveSamplesForMorph(curveForObject(source), curveForObject(target), sampleCount),
      kind: "curve"
    };
  }

  if (source.type === "vector" && target.type === "vector") {
    return {
      kind: "vector",
      sourceFrom: source.from,
      sourceTo: source.to,
      targetFrom: target.from,
      targetTo: target.to
    };
  }

  return { kind: "empty" };
}

function alignedPointCount(transformData: MathObjectTransformPlan["transformData"]) {
  if (transformData.kind === "curve") return transformData.aligned.source.length;
  if (transformData.kind === "vector") return 2;
  return 0;
}

export function buildMathObjectTransformPlan(
  source: MathObjectSpec,
  target: MathObjectSpec,
  options: { pathFunction?: TransformPathFunction; sampleCount?: number } = {}
): MathObjectTransformPlan {
  const transformData = buildTransformData(source, target, options.sampleCount);

  return {
    alignedPointCount: alignedPointCount(transformData),
    colorRole: colorRoleForObject(source),
    conceptId: conceptIdForObject(source),
    objectId: source.id,
    objectType: source.type,
    pathFunction: options.pathFunction,
    targetObjectId: target.id,
    transformData
  };
}

export function interpolateMathObjectTransform(plan: MathObjectTransformPlan, progress: number): MathObjectTransformFrame {
  const alpha = clamp01(progress);
  let renderState: RuntimeRenderState = { kind: "empty" };

  if (plan.transformData.kind === "curve") {
    const points = plan.pathFunction
      ? plan.transformData.aligned.source.map((point, index) => pointByPath(point, plan.transformData.aligned.target[index], alpha, plan.pathFunction))
      : interpolateAlignedCurves(plan.transformData.aligned, alpha);
    renderState = { kind: "polyline", points };
  }

  if (plan.transformData.kind === "vector") {
    renderState = {
      from: pointByPath(plan.transformData.sourceFrom, plan.transformData.targetFrom, alpha, plan.pathFunction),
      kind: "vector",
      to: pointByPath(plan.transformData.sourceTo, plan.transformData.targetTo, alpha, plan.pathFunction)
    };
  }

  return {
    colorRole: plan.colorRole,
    conceptId: plan.conceptId,
    objectId: plan.objectId,
    progress: alpha,
    renderState,
    targetObjectId: plan.targetObjectId
  };
}

export function buildLaggedObjectTransformPlan(
  sourceObjects: MathObjectSpec[],
  targetObjects: MathObjectSpec[],
  options: { lagRatio?: number; pathFunction?: TransformPathFunction; sampleCount?: number } = {}
): LaggedObjectTransformPlan {
  const count = Math.min(sourceObjects.length, targetObjects.length);

  return {
    entries: Array.from({ length: count }, (_, index) =>
      buildMathObjectTransformPlan(sourceObjects[index], targetObjects[index], {
        pathFunction: options.pathFunction,
        sampleCount: options.sampleCount
      })
    ),
    lagRatio: clamp01(options.lagRatio ?? 0)
  };
}

function laggedProgress(progress: number, index: number, count: number, lagRatio: number) {
  if (count <= 1) return clamp01(progress);

  const alpha = clamp01(progress);
  const lag = Math.min(0.99, clamp01(lagRatio));
  const start = (index * lag) / Math.max(1, count - 1);
  const duration = 1 - lag;

  return clamp01((alpha - start) / duration);
}

export function interpolateLaggedObjectTransformFamily(plan: LaggedObjectTransformPlan, progress: number): MathObjectTransformFrame[] {
  return plan.entries.map((entry, index) =>
    interpolateMathObjectTransform(entry, laggedProgress(progress, index, plan.entries.length, plan.lagRatio))
  );
}
