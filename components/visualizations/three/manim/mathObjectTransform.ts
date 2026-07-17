import {
  alignCurveSamplesForMorph,
  buildCurveObject,
  interpolateAlignedCurves,
  type AlignedCurveSamples
} from "./mathCurveObject";
import {
  alignSurfaceSamplesForMorph,
  buildSurfaceObjectFromGrid,
  interpolateAlignedSurfaces,
  type AlignedSurfaceSamples
} from "./mathSurfaceObject";
import { applyRateFunction, type MathRateFunctionName } from "./mathRateFunctions";
import type { TransformPathFunction } from "./mathPathFunctions";
import type { MathObjectSpec, Vec3 } from "./mathSceneTypes";
import {
  interpolateMobjectUniforms,
  normalizeMobjectUniforms,
  type RuntimeMobjectUniforms
} from "./mathMobjectUniforms";
import type { RuntimeRenderState } from "./mathSceneRuntimeState";

export const MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT =
  "Mobject.interpolate(start,target,alpha,path_func): align sampled geometry, move pointlike fields by path_func, and blend uniforms";

export type MathObjectTransformPlan = {
  alignedPointCount: number;
  colorRole?: string;
  conceptId: string;
  objectId: string;
  objectType: MathObjectSpec["type"];
  pathFunction?: TransformPathFunction;
  sourceContract: typeof MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT;
  sourceUniforms?: RuntimeMobjectUniforms;
  targetObjectId: string;
  targetUniforms?: RuntimeMobjectUniforms;
  transformData:
    | { kind: "curve"; aligned: AlignedCurveSamples }
    | { kind: "empty" }
    | { kind: "surface"; aligned: AlignedSurfaceSamples }
    | { kind: "vector"; sourceFrom: Vec3; sourceTo: Vec3; targetFrom: Vec3; targetTo: Vec3 };
};

export type MathObjectTransformFrame = {
  colorRole?: string;
  conceptId: string;
  objectId: string;
  progress: number;
  renderState: RuntimeRenderState;
  sourceContract: typeof MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT;
  targetObjectId: string;
  uniforms?: RuntimeMobjectUniforms;
};

export type LaggedObjectTransformPlan = {
  entries: MathObjectTransformPlan[];
  lagRatio: number;
  rateFunction: MathRateFunctionName;
  sourceContract: typeof MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT;
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

function uniformsForObject(object: MathObjectSpec) {
  return object.uniforms ? normalizeMobjectUniforms(object.uniforms) : undefined;
}

function curveForObject(object: Extract<MathObjectSpec, { type: "parametricCurve" }>) {
  return buildCurveObject({
    colorRole: object.colorRole,
    conceptId: object.conceptId,
    id: object.id,
    samples: object.samples
  });
}

function surfaceForObject(object: Extract<MathObjectSpec, { type: "parametricSurface" }>) {
  return buildSurfaceObjectFromGrid({
    colorRole: object.colorRole,
    conceptId: object.conceptId,
    id: object.id,
    samples: object.samples,
    uRange: object.uRange,
    vRange: object.vRange
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

  if (source.type === "parametricSurface" && target.type === "parametricSurface") {
    return {
      aligned: alignSurfaceSamplesForMorph(surfaceForObject(source), surfaceForObject(target), sampleCount),
      kind: "surface"
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
  if (transformData.kind === "surface") return transformData.aligned.rows * transformData.aligned.columns;
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
    sourceContract: MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT,
    sourceUniforms: uniformsForObject(source),
    targetObjectId: target.id,
    targetUniforms: uniformsForObject(target),
    transformData
  };
}

export function interpolateMathObjectTransform(plan: MathObjectTransformPlan, progress: number): MathObjectTransformFrame {
  const alpha = clamp01(progress);
  const pathFunction = plan.pathFunction;
  const transformData = plan.transformData;
  let renderState: RuntimeRenderState = { kind: "empty" };

  if (transformData.kind === "curve") {
    const aligned = transformData.aligned;
    const points = pathFunction
      ? aligned.source.map((point, index) => pointByPath(point, aligned.target[index], alpha, pathFunction))
      : interpolateAlignedCurves(aligned, alpha);
    renderState = { kind: "polyline", points };
  }

  if (transformData.kind === "vector") {
    renderState = {
      from: pointByPath(transformData.sourceFrom, transformData.targetFrom, alpha, pathFunction),
      kind: "vector",
      to: pointByPath(transformData.sourceTo, transformData.targetTo, alpha, pathFunction)
    };
  }

  if (transformData.kind === "surface") {
    const grid = interpolateAlignedSurfaces(transformData.aligned, alpha, pathFunction);
    renderState = {
      columns: transformData.aligned.columns,
      kind: "surface",
      points: grid.flat(),
      rows: transformData.aligned.rows,
      wireframeColumns: Array.from({ length: transformData.aligned.columns }, (_, column) =>
        Array.from({ length: transformData.aligned.rows }, (_, row) => grid[row][column])
      ),
      wireframeRows: grid
    };
  }

  return {
    colorRole: plan.colorRole,
    conceptId: plan.conceptId,
    objectId: plan.objectId,
    progress: alpha,
    renderState,
    sourceContract: plan.sourceContract,
    targetObjectId: plan.targetObjectId,
    uniforms: interpolateMobjectUniforms(plan.sourceUniforms, plan.targetUniforms, alpha)
  };
}

export function buildLaggedObjectTransformPlan(
  sourceObjects: MathObjectSpec[],
  targetObjects: MathObjectSpec[],
  options: { lagRatio?: number; pathFunction?: TransformPathFunction; rateFunction?: MathRateFunctionName; sampleCount?: number } = {}
): LaggedObjectTransformPlan {
  const count = Math.min(sourceObjects.length, targetObjects.length);

  return {
    entries: Array.from({ length: count }, (_, index) =>
      buildMathObjectTransformPlan(sourceObjects[index], targetObjects[index], {
        pathFunction: options.pathFunction,
        sampleCount: options.sampleCount
      })
    ),
    lagRatio: clamp01(options.lagRatio ?? 0),
    rateFunction: options.rateFunction ?? "linear",
    sourceContract: MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT
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
    interpolateMathObjectTransform(
      entry,
      applyRateFunction(plan.rateFunction, laggedProgress(progress, index, plan.entries.length, plan.lagRatio))
    )
  );
}
