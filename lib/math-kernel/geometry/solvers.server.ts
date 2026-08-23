import "server-only";

/**
 * Deterministic solid-geometry solvers ported from Edulab geometry_kernel.py at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 */

import { CasSession } from "../cas/computeEngine.server";
import { KERNEL_ERROR_CODES, type MathKernelErrorCode } from "../shared/errors";
import type {
  ExactValueDto,
  ExactVec3Dto,
  KernelResult,
  MathJsonExpr,
  SolutionStepDto,
} from "../shared/types";
import {
  vecDot,
  vecNormSquared,
  vecSub,
  type ScalarOps,
  type Vec3,
} from "./core";
import { mathZUpToWorldYUp } from "./coordinates";
import {
  formatExactVec3Latex,
  exactGeometryScalarOps,
  linePlaneAngleSin,
  midpoint,
  normalFromPoints,
  primitiveDirectionForDisplay,
  vec3 as exactVec3,
} from "./exact.server";
import {
  cubeCoordinatesRaw,
  regularQuadPyramidCoordinatesRaw,
} from "./solids";
import type { GeometrySolutionDto } from "./solutionTypes";

export type {
  GeometrySolutionDto,
  GeometrySolutionProvenanceDto,
} from "./solutionTypes";

const SOURCE_REVISION = "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc" as const;

const EXACT_OPS: ScalarOps<MathJsonExpr> = exactGeometryScalarOps;

export interface RegularQuadPyramidLinePlaneAngleOptions {
  readonly baseEdge?: MathJsonExpr;
  readonly height?: MathJsonExpr;
  /** Rendering scale. Positive is recommended; any finite non-zero scale is valid. */
  readonly scale?: number;
}

export interface CubeLinePlaneAngleOptions {
  readonly edge?: MathJsonExpr;
  /** Rendering scale. Positive is recommended; any finite non-zero scale is valid. */
  readonly scale?: number;
}

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): KernelResult<T> {
  return { ok: false, error: { code, message, details } };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function validateScale(scale: number): KernelResult<number> {
  if (!Number.isFinite(scale) || scale === 0) {
    return fail(
      KERNEL_ERROR_CODES.invalidScale,
      "Rendering scale must be a finite non-zero number; a positive scale is recommended.",
    );
  }
  return { ok: true, value: scale };
}

function positiveExactConstant(
  session: CasSession,
  input: MathJsonExpr,
  label: string,
): KernelResult<MathJsonExpr> {
  if (typeof input === "number" && !Number.isFinite(input)) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, `${label} must be finite and real.`);
  }
  const boxed = session.boxMathJson(input);
  if (!boxed.ok) {
    if (
      boxed.error.code === KERNEL_ERROR_CODES.casInvalidExpression ||
      boxed.error.code === KERNEL_ERROR_CODES.casOperationFailed
    ) {
      return fail(
        KERNEL_ERROR_CODES.nonRealExpression,
        `${label} must be a provably finite real constant.`,
        { label },
      );
    }
    return boxed;
  }
  const dto = session.toCanonicalExactValueDto(boxed.value);
  if (!dto.ok) {
    if (
      dto.error.code === KERNEL_ERROR_CODES.casInvalidExpression ||
      dto.error.code === KERNEL_ERROR_CODES.casOperationFailed
    ) {
      return fail(
        KERNEL_ERROR_CODES.nonRealExpression,
        `${label} must be a provably finite real constant.`,
        { label },
      );
    }
    return dto;
  }
  const finiteReal = session.isFiniteRealExactMathJson(boxed.value);
  if (!finiteReal.ok || !finiteReal.value) {
    return fail(
      KERNEL_ERROR_CODES.nonRealExpression,
      `${label} must be a provably finite real constant.`,
      { label },
    );
  }
  // The DTO is only a finite-real classifier here. Preserve and compare the
  // validated exact expression: DTO serialization may choose a presentation
  // form and must never become an ordering oracle for close radicals.
  const order = session.compareExactOrder(boxed.value, 0);
  if (!order.ok) return order;
  if (order.value === "greater") return { ok: true, value: boxed.value };
  if (order.value === "equal" || order.value === "less") {
    return fail(KERNEL_ERROR_CODES.nonPositiveDimension, `${label} must be positive.`, { label });
  }
  return fail(
    KERNEL_ERROR_CODES.nonRealExpression,
    `${label} could not be proven positive and real.`,
    { label },
  );
}

function rawVector(dto: ExactVec3Dto): Vec3<MathJsonExpr> {
  return [
    dto.components[0].mathJson,
    dto.components[1].mathJson,
    dto.components[2].mathJson,
  ];
}

function exactScalar(
  session: CasSession,
  expression: MathJsonExpr,
): KernelResult<ExactValueDto> {
  return session.toCanonicalExactValueDto(expression);
}

function exactPointRecord(
  session: CasSession,
  rawPoints: Readonly<object>,
): KernelResult<Readonly<Record<string, readonly ExactValueDto[]>>> {
  const points: Record<string, readonly ExactValueDto[]> = {};
  for (const [name, point] of Object.entries(
    rawPoints as Readonly<Record<string, Vec3<MathJsonExpr>>>,
  )) {
    const dto = exactVec3(point[0], point[1], point[2], session);
    if (!dto.ok) return dto;
    points[name] = dto.value.components;
  }
  return { ok: true, value: deepFreeze(points) };
}

function renderPointRecord(
  session: CasSession,
  exactPoints: Readonly<Record<string, readonly ExactValueDto[]>>,
  scale: number,
): KernelResult<Readonly<Record<string, readonly [number, number, number]>>> {
  const renderPoints: Record<string, readonly [number, number, number]> = {};
  for (const [name, components] of Object.entries(exactPoints)) {
    if (components.length !== 3) {
      return fail(KERNEL_ERROR_CODES.invalidInput, `Point ${name} must contain three exact coordinates.`);
    }
    const numeric = components.map((component) => component.approx);
    if (numeric.some((component) => component === null || !Number.isFinite(component))) {
      return fail(
        KERNEL_ERROR_CODES.exactToNumberFailed,
        `Point ${name} cannot be represented by finite renderer coordinates.`,
        { point: name },
      );
    }
    for (let index = 0; index < components.length; index += 1) {
      const order = session.compareExactOrder(components[index].mathJson, 0);
      const approximation = numeric[index] as number;
      const approximationOrder = approximation < 0
        ? "less"
        : approximation > 0
          ? "greater"
          : "equal";
      if (!order.ok || order.value === "unknown" || order.value !== approximationOrder) {
        return fail(
          KERNEL_ERROR_CODES.exactToNumberFailed,
          `Point ${name} has a renderer approximation inconsistent with its exact coordinate.`,
          { point: name, coordinate: index },
        );
      }
    }
    const transformed = mathZUpToWorldYUp(
      [numeric[0] as number, numeric[1] as number, numeric[2] as number],
      scale,
    );
    if (!transformed.ok) return transformed;
    renderPoints[name] = transformed.value;
  }
  return { ok: true, value: deepFreeze(renderPoints) };
}

function vectorExplanation(
  id: string,
  title: string,
  prefix: string,
  vector: ExactVec3Dto,
): KernelResult<SolutionStepDto> {
  const latex = formatExactVec3Latex(vector);
  if (!latex.ok) return latex;
  return {
    ok: true,
    value: {
      id,
      title,
      explanation: `${prefix} ${latex.value}`,
      value: null,
    },
  };
}

function solvePyramidWithSession(
  options: RegularQuadPyramidLinePlaneAngleOptions,
  session: CasSession,
): KernelResult<GeometrySolutionDto> {
  const scale = options.scale ?? 1.5;
  const validScale = validateScale(scale);
  if (!validScale.ok) return validScale;
  const baseEdge = positiveExactConstant(session, options.baseEdge ?? 2, "baseEdge");
  if (!baseEdge.ok) return baseEdge;
  const height = positiveExactConstant(session, options.height ?? 1, "height");
  if (!height.ok) return height;

  const built = regularQuadPyramidCoordinatesRaw(EXACT_OPS, baseEdge.value, height.value);
  const middle = midpoint(built.P, built.C, session);
  if (!middle.ok) return middle;
  const middleRaw = rawVector(middle.value);
  const beRaw = vecSub(EXACT_OPS, middleRaw, built.B);
  const be = exactVec3(beRaw[0], beRaw[1], beRaw[2], session);
  if (!be.ok) return be;
  const normal = normalFromPoints(built.P, built.A, built.C, session);
  if (!normal.ok) return normal;
  const primitiveNormal = primitiveDirectionForDisplay(rawVector(normal.value), session);
  if (!primitiveNormal.ok) return primitiveNormal;
  const answer = linePlaneAngleSin(beRaw, rawVector(normal.value), session);
  if (!answer.ok) return answer;

  const rawPoints: Record<string, Vec3<MathJsonExpr>> = {
    ...built,
    E: middleRaw,
  };
  const points = exactPointRecord(session, rawPoints);
  if (!points.ok) return points;
  const renderPoints = renderPointRecord(session, points.value, validScale.value);
  if (!renderPoints.ok) return renderPoints;

  const dot = exactScalar(
    session,
    EXACT_OPS.abs(vecDot(EXACT_OPS, beRaw, rawVector(primitiveNormal.value))),
  );
  if (!dot.ok) return dot;
  const lineNorm = exactScalar(session, ["Sqrt", vecNormSquared(EXACT_OPS, beRaw)]);
  if (!lineNorm.ok) return lineNorm;
  const eStep = vectorExplanation("E", "Midpoint E", "E =", middle.value);
  if (!eStep.ok) return eStep;
  const beStep = vectorExplanation("BE", "Line direction BE", "BE =", be.value);
  if (!beStep.ok) return beStep;
  const normalStep = vectorExplanation("normal", "Plane normal", "n =", primitiveNormal.value);
  if (!normalStep.ok) return normalStep;

  const intermediates: readonly SolutionStepDto[] = [
    eStep.value,
    beStep.value,
    normalStep.value,
    {
      id: "dot",
      title: "Dot product",
      explanation: "Compute the absolute line-normal dot product.",
      value: dot.value,
    },
    {
      id: "lineNorm",
      title: "Line-direction norm",
      explanation: "Compute the exact length of BE.",
      value: lineNorm.value,
    },
    {
      id: "sinTheta",
      title: "Line-plane angle sine",
      explanation: "Use |v·n|/(|v||n|).",
      value: answer.value,
    },
  ];

  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: 1,
      answer: answer.value,
      points: points.value,
      renderPoints: renderPoints.value,
      intermediates,
      provenance: {
        kernel: "geometry",
        operation: "regularQuadPyramidLinePlaneAngle",
        sourceRevision: SOURCE_REVISION,
      },
    }),
  };
}

export function regularQuadPyramidLinePlaneAngleFormula(
  baseEdge: MathJsonExpr,
  height: MathJsonExpr,
): MathJsonExpr {
  return [
    "Divide",
    ["Multiply", 2, baseEdge],
    [
      "Sqrt",
      [
        "Add",
        ["Multiply", 5, ["Power", baseEdge, 2]],
        ["Multiply", 2, ["Power", height, 2]],
      ],
    ],
  ];
}

export function solveRegularQuadPyramidLinePlaneAngle(
  options: RegularQuadPyramidLinePlaneAngleOptions = {},
  session = new CasSession(),
): KernelResult<GeometrySolutionDto> {
  return solvePyramidWithSession(options, session);
}

/** @deprecated Use solveRegularQuadPyramidLinePlaneAngle(). */
export function solvePyramidLinePlaneAngle(
  options: RegularQuadPyramidLinePlaneAngleOptions = {},
  session = new CasSession(),
): KernelResult<GeometrySolutionDto> {
  return solvePyramidWithSession(options, session);
}

function solveCubeWithSession(
  options: CubeLinePlaneAngleOptions,
  session: CasSession,
): KernelResult<GeometrySolutionDto> {
  const scale = options.scale ?? 2;
  const validScale = validateScale(scale);
  if (!validScale.ok) return validScale;
  const edge = positiveExactConstant(session, options.edge ?? 1, "edge");
  if (!edge.ok) return edge;

  const built = cubeCoordinatesRaw(EXACT_OPS, edge.value);
  const lineRaw = vecSub(EXACT_OPS, built.C, built.A1);
  const line = exactVec3(lineRaw[0], lineRaw[1], lineRaw[2], session);
  if (!line.ok) return line;
  const normal = normalFromPoints(built.A, built.B, built.D, session);
  if (!normal.ok) return normal;
  const primitiveNormal = primitiveDirectionForDisplay(rawVector(normal.value), session);
  if (!primitiveNormal.ok) return primitiveNormal;
  const answer = linePlaneAngleSin(lineRaw, rawVector(normal.value), session);
  if (!answer.ok) return answer;

  const points = exactPointRecord(session, built);
  if (!points.ok) return points;
  const renderPoints = renderPointRecord(session, points.value, validScale.value);
  if (!renderPoints.ok) return renderPoints;
  const dot = exactScalar(
    session,
    EXACT_OPS.abs(vecDot(EXACT_OPS, lineRaw, rawVector(primitiveNormal.value))),
  );
  if (!dot.ok) return dot;
  const lineNorm = exactScalar(session, ["Sqrt", vecNormSquared(EXACT_OPS, lineRaw)]);
  if (!lineNorm.ok) return lineNorm;
  const lineStep = vectorExplanation("A1C", "Line direction A1C", "A1C =", line.value);
  if (!lineStep.ok) return lineStep;
  const normalStep = vectorExplanation("normal", "Base-plane normal", "n =", primitiveNormal.value);
  if (!normalStep.ok) return normalStep;

  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: 1,
      answer: answer.value,
      points: points.value,
      renderPoints: renderPoints.value,
      intermediates: [
        lineStep.value,
        normalStep.value,
        {
          id: "dot",
          title: "Dot product",
          explanation: "Compute the absolute line-normal dot product.",
          value: dot.value,
        },
        {
          id: "lineNorm",
          title: "Line-direction norm",
          explanation: "Compute the exact length of A1C.",
          value: lineNorm.value,
        },
        {
          id: "sinTheta",
          title: "Line-plane angle sine",
          explanation: "Use |v·n|/(|v||n|).",
          value: answer.value,
        },
      ],
      provenance: {
        kernel: "geometry",
        operation: "cubeLinePlaneAngle",
        sourceRevision: SOURCE_REVISION,
      },
    }),
  };
}

export function solveCubeLinePlaneAngle(
  options: CubeLinePlaneAngleOptions = {},
  session = new CasSession(),
): KernelResult<GeometrySolutionDto> {
  return solveCubeWithSession(options, session);
}
