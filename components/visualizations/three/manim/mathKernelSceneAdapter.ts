/**
 * Client-safe adapter from MAIS math-kernel DTOs to the existing MathSceneSpec.
 *
 * This layer translates already-computed coordinates and authoritative LaTeX;
 * it deliberately performs no symbolic mathematics and imports no server code,
 * React, Three.js, R3F, or DOM API.
 */

import {
  validateBodyTopology,
  type BodyTopology,
} from "../../../../lib/math-kernel/bodies";
import type { AnalyticRangeSolutionDto } from "../../../../lib/math-kernel/analytic/types";
import type { ConicRenderSpec } from "../../../../lib/math-kernel/conics/model";
import { mathZUpToWorldYUp } from "../../../../lib/math-kernel/geometry/coordinates";
import type { GeometrySolutionDto } from "../../../../lib/math-kernel/geometry/solutionTypes";
import {
  KERNEL_ERROR_CODES,
  type MathKernelErrorCode,
} from "../../../../lib/math-kernel/shared/errors";
import { validateMathJson } from "../../../../lib/math-kernel/shared/mathjson";
import type {
  ExactValueDto,
  KernelResult,
} from "../../../../lib/math-kernel/shared/types";
import type {
  AnimationStep,
  AxisRangeSpec,
  MathObjectSpec,
  MathSceneParameterSpec,
  MathSceneSpec,
  Vec3,
} from "./mathSceneTypes";

export type MathKernelLocale = "en" | "zh-CN" | "zh-HK";

export interface MathKernelTeachingInput {
  readonly titleKey: string;
  readonly explanationKeys: readonly string[];
  readonly locale: MathKernelLocale;
}

export interface BodyMathKernelSceneInput {
  readonly kind: "body";
  readonly model: BodyTopology;
  /** Mathematical coordinates use z-up and are transformed exactly once here. */
  readonly vertexPositions: Readonly<
    Record<string, readonly [number, number, number]>
  >;
  readonly formula: ExactValueDto;
  readonly scale?: number;
  readonly parameters?: readonly MathSceneParameterSpec[];
  readonly teaching: MathKernelTeachingInput;
}

export interface ConicMathKernelSceneInput {
  readonly kind: "conic";
  readonly model: ConicRenderSpec;
  readonly equation: ExactValueDto;
  readonly parameters?: readonly MathSceneParameterSpec[];
  readonly teaching: MathKernelTeachingInput;
}

export interface GeometrySceneVectorInput {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly conceptId: string;
}

export interface GeometryScenePlaneInput {
  readonly id: string;
  /** Two-by-two world-point reference grid copied from GeometrySolutionDto. */
  readonly pointGrid: readonly [
    readonly [string, string],
    readonly [string, string],
  ];
  readonly conceptId: string;
}

export interface GeometryMathKernelSceneInput {
  readonly kind: "geometry";
  readonly model: GeometrySolutionDto;
  readonly topology: BodyTopology;
  /** References world-space renderPoints already present in the solution DTO. */
  readonly vectors?: readonly GeometrySceneVectorInput[];
  /** Explicit plane companions copied from renderPoints; no normal is recomputed here. */
  readonly planes?: readonly GeometryScenePlaneInput[];
  readonly parameters?: readonly MathSceneParameterSpec[];
  readonly teaching: MathKernelTeachingInput;
}

export interface AnalyticSceneSegmentInput {
  readonly id: string;
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
}

export interface AnalyticMathKernelSceneInput {
  readonly kind: "analytic";
  readonly model: AnalyticRangeSolutionDto;
  readonly render: {
    readonly conic: ConicRenderSpec;
    /** Explicit geometry companions computed upstream; the adapter never derives them. */
    readonly segments: readonly AnalyticSceneSegmentInput[];
  };
  readonly parameters?: readonly MathSceneParameterSpec[];
  readonly teaching: MathKernelTeachingInput;
}

export type MathKernelSceneInput =
  | BodyMathKernelSceneInput
  | ConicMathKernelSceneInput
  | GeometryMathKernelSceneInput
  | AnalyticMathKernelSceneInput;

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONIC_KINDS = new Set(["ellipse", "hyperbola", "parabola", "circle"]);
const CONIC_BRANCH_IDS = new Set(["curve", "negative", "positive"]);

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): KernelResult<T> {
  return {
    ok: false,
    error: details === undefined
      ? { code, message }
      : { code, message, details },
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isFiniteVec2(value: unknown): value is readonly [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((component) =>
      typeof component === "number" && Number.isFinite(component)
    )
  );
}

function isFiniteVec3(
  value: unknown,
): value is readonly [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((component) =>
      typeof component === "number" && Number.isFinite(component)
    )
  );
}

function copyVec3(value: readonly [number, number, number]): Vec3 {
  return [value[0], value[1], value[2]];
}

function validateSafeId(value: unknown, label: string): KernelResult<string> {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      `${label} must be a stable ASCII identifier of at most 128 characters.`,
      { label },
    );
  }
  return { ok: true, value };
}

function validateTeaching(
  teaching: unknown,
): KernelResult<MathKernelTeachingInput> {
  if (!isPlainRecord(teaching)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "teaching must be a plain object.");
  }
  const { titleKey, explanationKeys, locale } = teaching;
  if (typeof titleKey !== "string" || titleKey.trim().length === 0) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "teaching.titleKey must be non-empty.");
  }
  if (
    !Array.isArray(explanationKeys) ||
    !explanationKeys.every((key) => typeof key === "string" && key.trim().length > 0)
  ) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "teaching.explanationKeys must contain only non-empty localization keys.",
    );
  }
  if (locale !== "en" && locale !== "zh-CN" && locale !== "zh-HK") {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "teaching.locale must be en, zh-CN, or zh-HK.",
    );
  }
  return {
    ok: true,
    value: { titleKey, explanationKeys, locale },
  };
}

function validateExactValue(
  value: unknown,
  label: string,
): KernelResult<ExactValueDto> {
  if (!isPlainRecord(value) || value.schemaVersion !== 1) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      `${label} must be an ExactValueDto with schemaVersion 1.`,
    );
  }
  if (typeof value.latex !== "string" || value.latex.trim().length === 0) {
    return fail(KERNEL_ERROR_CODES.invalidInput, `${label}.latex must be non-empty.`);
  }
  if (value.decimal !== null && typeof value.decimal !== "string") {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      `${label}.decimal must be a string or null.`,
    );
  }
  if (
    value.approx !== null &&
    (typeof value.approx !== "number" || !Number.isFinite(value.approx))
  ) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label}.approx must be a finite number or null.`,
    );
  }
  const mathJson = validateMathJson(value.mathJson);
  if (!mathJson.ok) return mathJson;
  return { ok: true, value: value as unknown as ExactValueDto };
}

function validateConicRenderSpec(
  value: unknown,
): KernelResult<ConicRenderSpec> {
  if (!isPlainRecord(value) || !CONIC_KINDS.has(String(value.kind))) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "Invalid conic render kind.");
  }
  if (
    typeof value.sampleCount !== "number" ||
    !Number.isInteger(value.sampleCount) ||
    value.sampleCount < 3 ||
    value.sampleCount > 10_000
  ) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "Conic sampleCount must be an integer between 3 and 10,000.",
    );
  }
  if (
    !isFiniteVec2(value.parameterRange) ||
    value.parameterRange[0] >= value.parameterRange[1]
  ) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "Conic parameterRange must be a finite, strictly increasing pair.",
    );
  }
  if (!Array.isArray(value.branches) || value.branches.length === 0) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "A conic needs at least one branch.");
  }

  const seen = new Set<string>();
  for (const branch of value.branches) {
    if (!isPlainRecord(branch) || !CONIC_BRANCH_IDS.has(String(branch.id))) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Invalid conic branch identifier.");
    }
    if (seen.has(String(branch.id))) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Conic branch identifiers must be unique.");
    }
    seen.add(String(branch.id));
    if (typeof branch.closed !== "boolean" || !Array.isArray(branch.points)) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Invalid conic branch payload.");
    }
    if (branch.points.length !== value.sampleCount) {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        "Every conic branch must contain exactly sampleCount points.",
      );
    }
    if (!branch.points.every(isFiniteVec2)) {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        "Conic branch points must contain only finite coordinates.",
      );
    }
  }

  if (value.kind === "hyperbola") {
    if (seen.size !== 2 || !seen.has("negative") || !seen.has("positive")) {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        "A hyperbola render spec requires negative and positive branches.",
      );
    }
  } else if (seen.size !== 1 || !seen.has("curve")) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "Ellipse, circle, and parabola render specs require one curve branch.",
    );
  }

  return { ok: true, value: value as unknown as ConicRenderSpec };
}

function conicObjects(
  model: ConicRenderSpec,
  prefix: "conic" | "analytic-conic",
): MathObjectSpec[] {
  const objects: MathObjectSpec[] = model.branches.map((branch) => ({
    type: "parametricCurve",
    id: `${prefix}-branch-${branch.id}`,
    samples: branch.points.map(([x, y]) => [x, y, 0]),
    colorRole: "function",
    conceptId: `${prefix}-${model.kind}`,
  }));
  objects.push({
    type: "movingPoint",
    id: `${prefix}-moving-point`,
    pathObjectId: objects[0].id,
    colorRole: "probe",
    conceptId: `${prefix}-point`,
  });
  return objects;
}

function collectPoints(objects: readonly MathObjectSpec[]): Vec3[] {
  const points: Vec3[] = [];
  for (const object of objects) {
    if (object.type === "parametricCurve") {
      for (const point of object.samples) points.push(copyVec3(point));
    } else if (object.type === "parametricSurface") {
      for (const row of object.samples) {
        for (const point of row) points.push(copyVec3(point));
      }
    } else if (object.type === "vector") {
      points.push(copyVec3(object.from), copyVec3(object.to));
    }
  }
  return points;
}

function paddedRange(minimum: number, maximum: number): KernelResult<[number, number]> {
  const span = maximum - minimum;
  if (!Number.isFinite(span)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "Scene bounds exceed the finite renderer range.",
    );
  }
  const padding = span === 0 ? 1 : Math.max(0.25, span * 0.1);
  const lower = minimum - padding;
  const upper = maximum + padding;
  return Number.isFinite(lower) && Number.isFinite(upper)
    ? { ok: true, value: [lower, upper] }
    : fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        "Padded scene bounds exceed the finite renderer range.",
      );
}

function sceneBounds(points: readonly Vec3[]): KernelResult<AxisRangeSpec> {
  if (points.length === 0) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "A scene must contain renderable geometry.");
  }
  const minima: Vec3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const maxima: Vec3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (const point of points) {
    if (!isFiniteVec3(point)) {
      return fail(KERNEL_ERROR_CODES.nonFiniteInput, "Scene coordinates must be finite.");
    }
    for (let axis = 0; axis < 3; axis += 1) {
      minima[axis] = Math.min(minima[axis], point[axis]);
      maxima[axis] = Math.max(maxima[axis], point[axis]);
    }
  }
  const x = paddedRange(minima[0], maxima[0]);
  if (!x.ok) return x;
  const y = paddedRange(minima[1], maxima[1]);
  if (!y.ok) return y;
  const z = paddedRange(minima[2], maxima[2]);
  if (!z.ok) return z;
  return { ok: true, value: { x: x.value, y: y.value, z: z.value } };
}

function sceneTimeline(
  objects: readonly MathObjectSpec[],
  explanationKeys: readonly string[],
  focusConceptId?: string,
): AnimationStep[] {
  const timeline: AnimationStep[] = [];
  for (const object of objects) {
    // Learner presentation intentionally starts paused. Curves and vectors
    // therefore remain fully visible at t=0 instead of being hidden behind a
    // reveal/grow animation that the learner has not yet pressed Play to run.
    if (object.type === "movingPoint") {
      timeline.push({
        type: "moveAlongPath",
        objectId: object.id,
        pathObjectId: object.pathObjectId,
        duration: 1.5,
      });
    }
  }
  for (const note of explanationKeys) {
    timeline.push({ type: "wait", duration: 0.4, note });
  }
  if (focusConceptId) {
    timeline.push({ type: "highlight", conceptId: focusConceptId, duration: 0.8 });
  }
  return timeline;
}

interface SemanticFormulaTarget {
  readonly conceptId: string;
  readonly objectIds: readonly string[];
  readonly tokenText: string;
}

function validateSceneParameters(
  value: readonly MathSceneParameterSpec[] | undefined,
): KernelResult<MathSceneParameterSpec[]> {
  if (value === undefined) return { ok: true, value: [] };
  if (!Array.isArray(value)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "Scene parameters must be an array.");
  }
  const seen = new Set<string>();
  const parameters: MathSceneParameterSpec[] = [];
  for (const candidate of value) {
    if (!isPlainRecord(candidate)) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Every scene parameter must be a plain object.");
    }
    const id = validateSafeId(candidate.id, "scene parameter id");
    if (!id.ok) return id;
    if (seen.has(id.value)) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Scene parameter ids must be unique.");
    }
    seen.add(id.value);
    const label = candidate.label;
    const role = candidate.role;
    const parameterValue = candidate.value;
    const min = candidate.min;
    const max = candidate.max;
    if (
      typeof label !== "string" ||
      label.trim().length === 0 ||
      label.length > 160
    ) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Scene parameter labels must be non-empty and bounded.");
    }
    if (
      role !== "control" &&
      role !== "derived" &&
      role !== "timeline"
    ) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Scene parameters require a supported role.");
    }
    if (typeof parameterValue !== "number" || !Number.isFinite(parameterValue)) {
      return fail(KERNEL_ERROR_CODES.nonFiniteInput, "Scene parameter values must be finite.");
    }
    for (const bound of [min, max]) {
      if (bound !== undefined && (typeof bound !== "number" || !Number.isFinite(bound))) {
        return fail(KERNEL_ERROR_CODES.nonFiniteInput, "Scene parameter bounds must be finite.");
      }
    }
    if (
      typeof min === "number" &&
      typeof max === "number" &&
      min > max
    ) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Scene parameter bounds must be ordered.");
    }
    if (
      (typeof min === "number" && parameterValue < min) ||
      (typeof max === "number" && parameterValue > max)
    ) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Scene parameter values must lie within their bounds.");
    }
    let conceptId: string | undefined;
    if (candidate.conceptId !== undefined) {
      const validatedConcept = validateSafeId(candidate.conceptId, "scene parameter conceptId");
      if (!validatedConcept.ok) return validatedConcept;
      conceptId = validatedConcept.value;
    }
    parameters.push({
      ...(conceptId === undefined ? {} : { conceptId }),
      id: id.value,
      label,
      ...(typeof max === "number" ? { max } : {}),
      ...(typeof min === "number" ? { min } : {}),
      role,
      value: Object.is(parameterValue, -0) ? 0 : parameterValue,
    });
  }
  return { ok: true, value: parameters };
}

function assembleScene(
  kind: MathKernelSceneInput["kind"],
  objects: MathObjectSpec[],
  latex: string,
  teaching: MathKernelTeachingInput,
  options: {
    readonly parameters?: readonly MathSceneParameterSpec[];
    readonly semanticFormulaTarget?: SemanticFormulaTarget;
  } = {},
): KernelResult<MathSceneSpec> {
  if (objects.length === 0) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "The adapter produced no scene objects.");
  }
  const bounds = sceneBounds(collectPoints(objects));
  if (!bounds.ok) return bounds;
  const { x, y, z } = bounds.value;
  const center: Vec3 = [
    (x[0] + x[1]) / 2,
    (y[0] + y[1]) / 2,
    (z[0] + z[1]) / 2,
  ];
  const span = Math.max(x[1] - x[0], y[1] - y[0], z[1] - z[0]);
  const distance = Math.max(6, span * 1.75);
  const position: Vec3 =
    kind === "conic" || kind === "analytic"
      ? [center[0], center[1], center[2] + distance]
      : [center[0] + distance, center[1] + distance * 0.7, center[2] + distance];
  if (!isFiniteVec3(position)) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, "Camera coordinates must be finite.");
  }
  const parameters = validateSceneParameters(options.parameters);
  if (!parameters.ok) return parameters;
  if (
    options.semanticFormulaTarget !== undefined &&
    !latex.includes(options.semanticFormulaTarget.tokenText)
  ) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "A semantic formula token must occur in the authoritative display LaTeX.",
    );
  }

  const formulaId = "math-kernel-result-formula";
  const tokenId = "math-kernel-result-token";
  const semanticFormulaTarget = options.semanticFormulaTarget;
  const formulaConcept = semanticFormulaTarget?.conceptId ?? teaching.titleKey;
  const bindings = semanticFormulaTarget === undefined
    ? []
    : semanticFormulaTarget.objectIds.map((objectId) => ({
        conceptId: semanticFormulaTarget.conceptId,
        formulaId,
        objectId,
        tokenId,
      }));
  const familyId = kind === "conic" || kind === "analytic"
    ? "three-conic-sections-deep"
    : "three-space-vectors-lines-planes";
  const scene: MathSceneSpec = {
    // The authoritative result remains screen-fixed. A binding is emitted only
    // when the caller supplied an explicit semantic vector/chord target; it is
    // never attached to an arbitrary first edge or curve.
    bindings,
    cameraShots: [{ id: "math-kernel-default-camera", position, target: center }],
    coordinateSpace: {
      mathRange: { x: [...x], y: [...y], z: [...z] },
      worldRange: { x: [...x], y: [...y], z: [...z] },
    },
    diagnostics: {
      expectedBindingCount: bindings.length,
      expectedObjectCount: objects.length,
      expectedTokenCount: 1,
    },
    familyId,
    formulas: [{
      id: formulaId,
      latex,
      tokens: [{
        conceptId: formulaConcept,
        id: tokenId,
        text: options.semanticFormulaTarget?.tokenText ?? latex,
      }],
    }],
    objects,
    ...(parameters.value.length === 0 ? {} : { parameters: parameters.value }),
    sceneId: `math-kernel-${kind}-${teaching.locale}`,
    timeline: sceneTimeline(
      objects,
      teaching.explanationKeys,
      options.semanticFormulaTarget?.conceptId,
    ),
  };
  return { ok: true, value: deepFreeze(scene) };
}

function adaptBody(
  input: BodyMathKernelSceneInput,
  teaching: MathKernelTeachingInput,
): KernelResult<MathSceneSpec> {
  const topology = validateBodyTopology(input.model);
  if (!topology.ok) return topology;
  const formula = validateExactValue(input.formula, "formula");
  if (!formula.ok) return formula;
  if (!isPlainRecord(input.vertexPositions)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "vertexPositions must be a plain object.");
  }
  const coordinateKeys = Object.keys(input.vertexPositions).sort();
  const vertexKeys = [...topology.value.vertices].sort();
  if (
    coordinateKeys.length !== vertexKeys.length ||
    coordinateKeys.some((key, index) => key !== vertexKeys[index])
  ) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "vertexPositions keys must exactly match the topology vertices.",
    );
  }

  const worldPoints = new Map<string, Vec3>();
  for (const vertex of topology.value.vertices) {
    const point = input.vertexPositions[vertex];
    if (!isFiniteVec3(point)) {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        `vertexPositions.${vertex} must contain three finite coordinates.`,
      );
    }
    const transformed = mathZUpToWorldYUp(point, input.scale ?? 1);
    if (!transformed.ok) return transformed;
    worldPoints.set(vertex, copyVec3(transformed.value));
  }

  const objects: MathObjectSpec[] = topology.value.edges.map((edge, index) => ({
    type: "parametricCurve",
    id: `body-edge-${index}`,
    samples: [copyVec3(worldPoints.get(edge.a)!), copyVec3(worldPoints.get(edge.b)!)],
    colorRole: "function",
    conceptId: "body-edge",
  }));
  return assembleScene("body", objects, formula.value.latex, teaching, {
    parameters: input.parameters,
  });
}

function adaptConic(
  input: ConicMathKernelSceneInput,
  teaching: MathKernelTeachingInput,
): KernelResult<MathSceneSpec> {
  const model = validateConicRenderSpec(input.model);
  if (!model.ok) return model;
  const equation = validateExactValue(input.equation, "equation");
  if (!equation.ok) return equation;
  return assembleScene(
    "conic",
    conicObjects(model.value, "conic"),
    equation.value.latex,
    teaching,
    { parameters: input.parameters },
  );
}

function validateGeometrySolution(
  model: unknown,
): KernelResult<GeometrySolutionDto> {
  if (!isPlainRecord(model) || model.schemaVersion !== 1) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "Invalid GeometrySolutionDto schema.");
  }
  const answer = validateExactValue(model.answer, "geometry.answer");
  if (!answer.ok) return answer;
  if (!isPlainRecord(model.renderPoints)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "geometry.renderPoints must be a plain object.");
  }
  for (const [id, point] of Object.entries(model.renderPoints)) {
    if (!isFiniteVec3(point)) {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        `geometry.renderPoints.${id} must contain three finite coordinates.`,
      );
    }
  }
  return { ok: true, value: model as unknown as GeometrySolutionDto };
}

function adaptGeometry(
  input: GeometryMathKernelSceneInput,
  teaching: MathKernelTeachingInput,
): KernelResult<MathSceneSpec> {
  const model = validateGeometrySolution(input.model);
  if (!model.ok) return model;
  const topology = validateBodyTopology(input.topology);
  if (!topology.ok) return topology;
  for (const vertex of topology.value.vertices) {
    if (!Object.prototype.hasOwnProperty.call(model.value.renderPoints, vertex)) {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        `geometry.renderPoints is missing topology vertex ${vertex}.`,
      );
    }
  }

  const objects: MathObjectSpec[] = topology.value.edges.map((edge, index) => ({
    type: "parametricCurve",
    id: `geometry-edge-${index}`,
    samples: [
      copyVec3(model.value.renderPoints[edge.a]),
      copyVec3(model.value.renderPoints[edge.b]),
    ],
    colorRole: "function",
    conceptId: "geometry-edge",
  }));
  const seenVectors = new Set<string>();
  if (input.vectors !== undefined && !Array.isArray(input.vectors)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "geometry.vectors must be an array.");
  }
  for (const vector of input.vectors ?? []) {
    if (!isPlainRecord(vector)) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Every geometry vector must be a plain object.");
    }
    const id = validateSafeId(vector.id, "geometry vector id");
    if (!id.ok) return id;
    if (seenVectors.has(id.value)) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Geometry vector ids must be unique.");
    }
    seenVectors.add(id.value);
    if (
      typeof vector.from !== "string" ||
      typeof vector.to !== "string" ||
      typeof vector.conceptId !== "string"
    ) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Invalid geometry vector references.");
    }
    const conceptId = validateSafeId(vector.conceptId, "geometry vector conceptId");
    if (!conceptId.ok) return conceptId;
    const from = model.value.renderPoints[vector.from];
    const to = model.value.renderPoints[vector.to];
    if (!isFiniteVec3(from) || !isFiniteVec3(to)) {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        "Geometry vectors must reference existing finite renderPoints.",
      );
    }
    objects.push({
      type: "vector",
      id: `geometry-vector-${id.value}`,
      from: copyVec3(from),
      to: copyVec3(to),
      colorRole: "probe",
      conceptId: conceptId.value,
    });
  }

  const seenPlanes = new Set<string>();
  if (input.planes !== undefined && !Array.isArray(input.planes)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "geometry.planes must be an array.");
  }
  for (const plane of input.planes ?? []) {
    if (!isPlainRecord(plane)) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Every geometry plane must be a plain object.");
    }
    const id = validateSafeId(plane.id, "geometry plane id");
    if (!id.ok) return id;
    if (seenPlanes.has(id.value)) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Geometry plane ids must be unique.");
    }
    seenPlanes.add(id.value);
    const conceptId = validateSafeId(plane.conceptId, "geometry plane conceptId");
    if (!conceptId.ok) return conceptId;
    if (
      !Array.isArray(plane.pointGrid) ||
      plane.pointGrid.length !== 2 ||
      !plane.pointGrid.every((row) => Array.isArray(row) && row.length === 2)
    ) {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        "Geometry planes require a two-by-two renderPoint reference grid.",
      );
    }
    const pointIds = plane.pointGrid.flat();
    if (new Set(pointIds).size !== 4) {
      return fail(
        KERNEL_ERROR_CODES.degeneratePlane,
        "Geometry plane reference grids require four distinct points.",
      );
    }
    const samples: Vec3[][] = [];
    for (const row of plane.pointGrid) {
      const sampleRow: Vec3[] = [];
      for (const pointId of row) {
        if (typeof pointId !== "string") {
          return fail(
            KERNEL_ERROR_CODES.invalidInput,
            "Geometry plane point references must be strings.",
          );
        }
        const point = model.value.renderPoints[pointId];
        if (!isFiniteVec3(point)) {
          return fail(
            KERNEL_ERROR_CODES.invalidInput,
            "Geometry planes must reference existing finite renderPoints.",
          );
        }
        sampleRow.push(copyVec3(point));
      }
      samples.push(sampleRow);
    }
    objects.push({
      type: "parametricSurface",
      id: `geometry-plane-${id.value}`,
      samples,
      uRange: [0, 1],
      vRange: [0, 1],
      colorRole: "reference",
      conceptId: conceptId.value,
      style: {
        fillOpacity: 0.18,
        fillRole: "reference",
        strokeOpacity: 0.4,
        strokeRole: "reference",
        strokeWidth: 2,
      },
    });
  }

  const semanticPair = objects
    .filter((object) => object.type === "vector")
    .map((vector) => ({
      vector,
      plane: objects.find((object) => (
        object.type === "parametricSurface" &&
        object.conceptId === vector.conceptId
      )),
    }))
    .find((pair) => pair.plane?.type === "parametricSurface");
  const semanticVector = semanticPair?.vector;
  const semanticPlane = semanticPair?.plane;
  const semanticFormulaTarget =
    semanticVector && semanticVector.type === "vector" &&
    semanticPlane && semanticPlane.type === "parametricSurface"
      ? {
          conceptId: semanticVector.conceptId,
          objectIds: [semanticVector.id, semanticPlane.id],
          tokenText: "\\theta",
        }
      : undefined;
  const formulaLatex = semanticFormulaTarget === undefined
    ? model.value.answer.latex
    : `\\sin\\theta=${model.value.answer.latex}`;
  return assembleScene("geometry", objects, formulaLatex, teaching, {
    parameters: input.parameters,
    semanticFormulaTarget,
  });
}

function validateAnalyticRangeSolution(
  model: unknown,
): KernelResult<AnalyticRangeSolutionDto> {
  if (
    !isPlainRecord(model) ||
    model.schemaVersion !== 1 ||
    typeof model.intervalLatex !== "string" ||
    model.intervalLatex.trim().length === 0
  ) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "Invalid AnalyticRangeSolutionDto schema.");
  }
  const expression = validateExactValue(model.expression, "analytic.expression");
  if (!expression.ok) return expression;
  if (!isPlainRecord(model.interval)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "analytic.interval must be a plain object.");
  }
  for (const name of ["lower", "upper"] as const) {
    const endpoint = model.interval[name];
    if (!isPlainRecord(endpoint) || (endpoint.kind !== "finite" && endpoint.kind !== "infinity")) {
      return fail(KERNEL_ERROR_CODES.invalidInput, `Invalid analytic interval ${name} endpoint.`);
    }
    if (endpoint.kind === "finite") {
      const exact = validateExactValue(endpoint.value, `analytic.interval.${name}.value`);
      if (!exact.ok) return exact;
      if (typeof endpoint.closed !== "boolean" || !Array.isArray(endpoint.witnesses)) {
        return fail(KERNEL_ERROR_CODES.invalidInput, `Invalid finite ${name} endpoint payload.`);
      }
    } else if (
      (endpoint.sign !== -1 && endpoint.sign !== 1) ||
      endpoint.closed !== false
    ) {
      return fail(KERNEL_ERROR_CODES.invalidInput, `Invalid infinite ${name} endpoint payload.`);
    }
  }
  return { ok: true, value: model as unknown as AnalyticRangeSolutionDto };
}

function adaptAnalytic(
  input: AnalyticMathKernelSceneInput,
  teaching: MathKernelTeachingInput,
): KernelResult<MathSceneSpec> {
  const model = validateAnalyticRangeSolution(input.model);
  if (!model.ok) return model;
  if (!isPlainRecord(input.render)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "analytic.render must be a plain object.");
  }
  const conic = validateConicRenderSpec(input.render.conic);
  if (!conic.ok) return conic;
  if (!Array.isArray(input.render.segments)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "analytic.render.segments must be an array.");
  }
  const objects = conicObjects(conic.value, "analytic-conic");
  const seen = new Set<string>();
  for (const segment of input.render.segments) {
    if (!isPlainRecord(segment)) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Every analytic segment must be a plain object.");
    }
    const id = validateSafeId(segment.id, "analytic segment id");
    if (!id.ok) return id;
    if (seen.has(id.value)) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Analytic segment ids must be unique.");
    }
    seen.add(id.value);
    if (!isFiniteVec2(segment.from) || !isFiniteVec2(segment.to)) {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        "Analytic segment endpoints must contain finite coordinates.",
      );
    }
    objects.push({
      type: "parametricCurve",
      id: `analytic-segment-${id.value}`,
      samples: [
        [segment.from[0], segment.from[1], 0],
        [segment.to[0], segment.to[1], 0],
      ],
      colorRole: "probe",
      conceptId: `analytic-segment-${id.value}`,
    });
  }
  const semanticSegment = objects.find((object) => object.id.startsWith("analytic-segment-"));
  const semanticFormulaTarget =
    semanticSegment && semanticSegment.type === "parametricCurve"
      ? {
          conceptId: semanticSegment.conceptId,
          objectIds: [semanticSegment.id],
          tokenText: "L",
        }
      : undefined;
  const formulaLatex = semanticFormulaTarget === undefined
    ? model.value.intervalLatex
    : `L\\in${model.value.intervalLatex}`;
  return assembleScene("analytic", objects, formulaLatex, teaching, {
    parameters: input.parameters,
    semanticFormulaTarget,
  });
}

/** Translate a validated kernel DTO into the existing renderer-neutral scene contract. */
export function toMathSceneSpec(
  input: MathKernelSceneInput,
): KernelResult<MathSceneSpec> {
  try {
    if (!isPlainRecord(input)) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "Math-kernel scene input must be a plain object.");
    }
    const teaching = validateTeaching(input.teaching);
    if (!teaching.ok) return teaching;
    switch (input.kind) {
      case "body":
        return adaptBody(input, teaching.value);
      case "conic":
        return adaptConic(input, teaching.value);
      case "geometry":
        return adaptGeometry(input, teaching.value);
      case "analytic":
        return adaptAnalytic(input, teaching.value);
      default:
        return fail(KERNEL_ERROR_CODES.invalidInput, "Unknown math-kernel scene input kind.");
    }
  } catch {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "The math-kernel scene input could not be safely inspected.",
    );
  }
}
