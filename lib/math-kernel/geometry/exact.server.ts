import "server-only";

/**
 * Server-only exact geometry ported from Edulab geometry_kernel.py at
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
} from "../shared/types";
import {
  boxVolumeValue,
  dihedralCosFromNormalsValue,
  dihedralHalfPlaneCosValue,
  edgeOrthogonalComponent,
  lineLineAngleCosValue,
  linePlaneAngleSinValue,
  normalFromThreePoints,
  pointPlaneDistanceValue,
  prismVolumeValue,
  pyramidVolumeValue,
  tetrahedronVolumeValue,
  vecCross,
  vecMidpoint,
  vecNormSquared,
  vecSub,
  type ScalarOps,
  type Vec3,
} from "./core";

/** @internal Shared by exact geometry and its deterministic server solvers. */
export const exactGeometryScalarOps: ScalarOps<MathJsonExpr> = {
  zero: 0,
  fromInteger: (value) => value,
  add: (left, right) => ["Add", left, right],
  sub: (left, right) => ["Subtract", left, right],
  mul: (left, right) => ["Multiply", left, right],
  // Keep the reciprocal grouped. CE 0.118.1 can corrupt close-radical
  // magnitudes when it eagerly canonicalizes a direct a/b quotient.
  div: (left, right) => ["Multiply", left, ["Divide", 1, right]],
  abs: (value) => ["Abs", value],
  sqrt: (value) => ["Sqrt", value],
};

const EXACT_OPS = exactGeometryScalarOps;

interface CanonicalVec3 {
  readonly expression: Vec3<MathJsonExpr>;
  readonly dto: ExactVec3Dto;
}

interface CanonicalScalar {
  readonly expression: MathJsonExpr;
  readonly dto: ExactValueDto;
}

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): KernelResult<T> {
  return { ok: false, error: { code, message, details } };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function exactScalar(
  input: MathJsonExpr,
  label: string,
  session: CasSession,
): KernelResult<CanonicalScalar> {
  const canonical = session.toCanonicalExactValueDto(input);
  if (!canonical.ok) {
    if (
      canonical.error.code === KERNEL_ERROR_CODES.casInvalidExpression ||
      canonical.error.code === KERNEL_ERROR_CODES.casOperationFailed
    ) {
      return fail(
        KERNEL_ERROR_CODES.nonRealExpression,
        `${label} must be a provably finite real constant.`,
        { label },
      );
    }
    return canonical;
  }
  const finiteReal = session.isFiniteRealExactMathJson(
    canonical.value.mathJson,
  );
  if (!finiteReal.ok || !finiteReal.value) {
    return fail(
      KERNEL_ERROR_CODES.nonRealExpression,
      `${label} must be a provably finite real constant.`,
      { label },
    );
  }
  const dto = deepFreeze(canonical.value);
  return {
    ok: true,
    value: {
      expression: dto.mathJson,
      dto,
    },
  };
}

function exactVector(
  input: Vec3<MathJsonExpr>,
  label: string,
  session: CasSession,
): KernelResult<CanonicalVec3> {
  if (!Array.isArray(input) || input.length !== 3) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      `${label} must contain exactly three coordinates.`,
      { label },
    );
  }

  const x = exactScalar(input[0], `${label}.x`, session);
  if (!x.ok) return x;
  const y = exactScalar(input[1], `${label}.y`, session);
  if (!y.ok) return y;
  const z = exactScalar(input[2], `${label}.z`, session);
  if (!z.ok) return z;

  const components = deepFreeze([x.value.dto, y.value.dto, z.value.dto] as const);
  const dto = deepFreeze({ schemaVersion: 1, components } as const);
  return {
    ok: true,
    value: {
      expression: [
        x.value.expression,
        y.value.expression,
        z.value.expression,
      ],
      dto,
    },
  };
}

function vectorDto(
  input: Vec3<MathJsonExpr>,
  label: string,
  session: CasSession,
): KernelResult<ExactVec3Dto> {
  const vector = exactVector(input, label, session);
  return vector.ok ? { ok: true, value: vector.value.dto } : vector;
}

function positiveNormSquared(
  vector: Vec3<MathJsonExpr>,
  zeroCode: MathKernelErrorCode,
  zeroMessage: string,
  label: string,
  session: CasSession,
): KernelResult<MathJsonExpr> {
  const squared = exactScalar(vecNormSquared(EXACT_OPS, vector), label, session);
  if (!squared.ok) return squared;

  // A single provably non-zero real component is already an exact geometric
  // proof that the shared sum-of-squares norm is positive. This also handles
  // close radical differences without duplicating the norm formula here.
  let everyComponentIsZero = true;
  for (const component of vector) {
    const componentOrder = session.compareExactOrder(component, 0);
    if (!componentOrder.ok) return componentOrder;
    if (
      componentOrder.value === "less" ||
      componentOrder.value === "greater"
    ) {
      return { ok: true, value: squared.value.expression };
    }
    if (componentOrder.value !== "equal") everyComponentIsZero = false;
  }
  if (everyComponentIsZero) return fail(zeroCode, zeroMessage);

  const order = session.compareExactOrder(squared.value.expression, 0);
  if (!order.ok) return order;
  if (order.value === "greater") {
    return { ok: true, value: squared.value.expression };
  }
  if (order.value === "equal") return fail(zeroCode, zeroMessage);
  return fail(
    KERNEL_ERROR_CODES.nonRealExpression,
    `${label} could not be proven positive.`,
    { label },
  );
}

function positiveScalar(
  input: MathJsonExpr,
  label: string,
  session: CasSession,
): KernelResult<MathJsonExpr> {
  const exact = exactScalar(input, label, session);
  if (!exact.ok) return exact;
  const order = session.compareExactOrder(exact.value.expression, 0);
  if (!order.ok) return order;
  if (order.value === "greater") {
    return { ok: true, value: exact.value.expression };
  }
  if (order.value === "equal" || order.value === "less") {
    return fail(
      KERNEL_ERROR_CODES.nonPositiveDimension,
      `${label} must be positive.`,
      { label },
    );
  }
  return fail(
    KERNEL_ERROR_CODES.nonRealExpression,
    `${label} could not be proven positive.`,
    { label },
  );
}

function scalarDto(
  expression: MathJsonExpr,
  label: string,
  session: CasSession,
): KernelResult<ExactValueDto> {
  const exact = exactScalar(expression, label, session);
  return exact.ok ? { ok: true, value: exact.value.dto } : exact;
}

function vectorsAreProvablyParallel(
  first: Vec3<MathJsonExpr>,
  second: Vec3<MathJsonExpr>,
  session: CasSession,
): KernelResult<boolean> {
  const cross = vecCross(EXACT_OPS, first, second);
  let allComponentsAreZero = true;
  for (const component of cross) {
    const order = session.compareExactOrder(component, 0);
    if (!order.ok) return order;
    if (order.value === "less" || order.value === "greater") {
      return { ok: true, value: false };
    }
    if (order.value !== "equal") allComponentsAreZero = false;
  }
  return { ok: true, value: allComponentsAreZero };
}

export function vec3(
  x: MathJsonExpr,
  y: MathJsonExpr,
  z: MathJsonExpr,
  session = new CasSession(),
): KernelResult<ExactVec3Dto> {
  return vectorDto([x, y, z], "vector", session);
}

export function midpoint(
  left: Vec3<MathJsonExpr>,
  right: Vec3<MathJsonExpr>,
  session = new CasSession(),
): KernelResult<ExactVec3Dto> {
  const validLeft = exactVector(left, "left point", session);
  if (!validLeft.ok) return validLeft;
  const validRight = exactVector(right, "right point", session);
  if (!validRight.ok) return validRight;
  return vectorDto(
    vecMidpoint(EXACT_OPS, validLeft.value.expression, validRight.value.expression),
    "midpoint",
    session,
  );
}

export function normalFromPoints(
  first: Vec3<MathJsonExpr>,
  second: Vec3<MathJsonExpr>,
  third: Vec3<MathJsonExpr>,
  session = new CasSession(),
): KernelResult<ExactVec3Dto> {
  const validFirst = exactVector(first, "first point", session);
  if (!validFirst.ok) return validFirst;
  const validSecond = exactVector(second, "second point", session);
  if (!validSecond.ok) return validSecond;
  const validThird = exactVector(third, "third point", session);
  if (!validThird.ok) return validThird;

  const normal = normalFromThreePoints(
    EXACT_OPS,
    validFirst.value.expression,
    validSecond.value.expression,
    validThird.value.expression,
  );
  const nonzero = positiveNormSquared(
    normal,
    KERNEL_ERROR_CODES.collinearPlanePoints,
    "Three collinear points do not define a plane.",
    "plane normal squared norm",
    session,
  );
  if (!nonzero.ok) return nonzero;
  return vectorDto(normal, "plane normal", session);
}

interface RationalComponent {
  readonly numerator: number;
  readonly denominator: number;
}

function rationalComponent(value: MathJsonExpr): RationalComponent | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return { numerator: value, denominator: 1 };
  }
  if (
    Array.isArray(value) &&
    value.length === 3 &&
    value[0] === "Rational" &&
    typeof value[1] === "number" &&
    typeof value[2] === "number" &&
    Number.isSafeInteger(value[1]) &&
    Number.isSafeInteger(value[2]) &&
    value[2] !== 0
  ) {
    const sign = value[2] < 0 ? -1 : 1;
    return {
      numerator: sign * value[1],
      denominator: Math.abs(value[2]),
    };
  }
  return null;
}

function integerGcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function integerLcm(left: number, right: number): number | null {
  if (left === 0 || right === 0) return 0;
  const value = Math.abs((left / integerGcd(left, right)) * right);
  return Number.isSafeInteger(value) ? value : null;
}

function primitiveRationalDirection(
  vector: Vec3<MathJsonExpr>,
): Vec3<MathJsonExpr> | null {
  const fractions = vector.map(rationalComponent);
  if (fractions.some((value) => value === null)) return null;
  const values = fractions as unknown as readonly [
    RationalComponent,
    RationalComponent,
    RationalComponent,
  ];

  let commonDenominator = 1;
  for (const value of values) {
    const next = integerLcm(commonDenominator, value.denominator);
    if (next === null || next === 0) return null;
    commonDenominator = next;
  }

  const integers = values.map((value) =>
    value.numerator * (commonDenominator / value.denominator));
  if (!integers.every(Number.isSafeInteger)) return null;
  const divisor = integers.reduce(integerGcd, 0);
  if (divisor === 0) return null;
  return [
    integers[0] / divisor,
    integers[1] / divisor,
    integers[2] / divisor,
  ];
}

function primitiveSymbolicDirection(
  vector: Vec3<MathJsonExpr>,
  session: CasSession,
): KernelResult<Vec3<MathJsonExpr> | null> {
  let pivot: MathJsonExpr | null = null;
  let pivotOrder: "less" | "greater" | null = null;
  for (const component of vector) {
    const order = session.compareExactOrder(component, 0);
    if (!order.ok) return order;
    if (order.value === "less" || order.value === "greater") {
      pivot = component;
      pivotOrder = order.value;
      break;
    }
  }
  if (pivot === null || pivotOrder === null) {
    return { ok: true, value: null };
  }

  const ratios: MathJsonExpr[] = [];
  for (const component of vector) {
    const ratio = exactScalar(
      EXACT_OPS.div(component, pivot),
      "display direction ratio",
      session,
    );
    if (!ratio.ok || rationalComponent(ratio.value.expression) === null) {
      return { ok: true, value: null };
    }
    ratios.push(ratio.value.expression);
  }
  const primitive = primitiveRationalDirection(
    ratios as unknown as Vec3<MathJsonExpr>,
  );
  if (primitive === null) return { ok: true, value: null };
  return {
    ok: true,
    value: pivotOrder === "less"
      ? primitive.map((component) =>
          EXACT_OPS.sub(EXACT_OPS.zero, component)) as unknown as Vec3<MathJsonExpr>
      : primitive,
  };
}

export function primitiveDirectionForDisplay(
  vector: Vec3<MathJsonExpr>,
  session = new CasSession(),
): KernelResult<ExactVec3Dto> {
  const valid = exactVector(vector, "direction", session);
  if (!valid.ok) return valid;
  const nonzero = positiveNormSquared(
    valid.value.expression,
    KERNEL_ERROR_CODES.zeroDirection,
    "A zero vector has no display direction.",
    "direction squared norm",
    session,
  );
  if (!nonzero.ok) return nonzero;

  const primitive = primitiveRationalDirection(valid.value.expression);
  if (primitive) {
    return vectorDto(primitive, "primitive display direction", session);
  }
  const symbolic = primitiveSymbolicDirection(
    valid.value.expression,
    session,
  );
  if (!symbolic.ok) return symbolic;
  return symbolic.value
    ? vectorDto(symbolic.value, "primitive display direction", session)
    : { ok: true, value: valid.value.dto };
}

export function linePlaneAngleSin(
  lineDirection: Vec3<MathJsonExpr>,
  planeNormal: Vec3<MathJsonExpr>,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  const line = exactVector(lineDirection, "line direction", session);
  if (!line.ok) return line;
  const normal = exactVector(planeNormal, "plane normal", session);
  if (!normal.ok) return normal;
  const lineNorm = positiveNormSquared(
    line.value.expression,
    KERNEL_ERROR_CODES.zeroDirection,
    "Line direction must be non-zero.",
    "line direction squared norm",
    session,
  );
  if (!lineNorm.ok) return lineNorm;
  const normalNorm = positiveNormSquared(
    normal.value.expression,
    KERNEL_ERROR_CODES.degeneratePlane,
    "Plane normal must be non-zero.",
    "plane normal squared norm",
    session,
  );
  if (!normalNorm.ok) return normalNorm;
  const parallel = vectorsAreProvablyParallel(
    line.value.expression,
    normal.value.expression,
    session,
  );
  if (!parallel.ok) return parallel;
  if (parallel.value) return scalarDto(1, "line-plane angle sine", session);
  return scalarDto(
    linePlaneAngleSinValue(EXACT_OPS, line.value.expression, normal.value.expression),
    "line-plane angle sine",
    session,
  );
}

export function lineLineAngleCos(
  firstDirection: Vec3<MathJsonExpr>,
  secondDirection: Vec3<MathJsonExpr>,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  const first = exactVector(firstDirection, "first line direction", session);
  if (!first.ok) return first;
  const second = exactVector(secondDirection, "second line direction", session);
  if (!second.ok) return second;
  const firstNorm = positiveNormSquared(
    first.value.expression,
    KERNEL_ERROR_CODES.zeroDirection,
    "First line direction must be non-zero.",
    "first line direction squared norm",
    session,
  );
  if (!firstNorm.ok) return firstNorm;
  const secondNorm = positiveNormSquared(
    second.value.expression,
    KERNEL_ERROR_CODES.zeroDirection,
    "Second line direction must be non-zero.",
    "second line direction squared norm",
    session,
  );
  if (!secondNorm.ok) return secondNorm;
  const parallel = vectorsAreProvablyParallel(
    first.value.expression,
    second.value.expression,
    session,
  );
  if (!parallel.ok) return parallel;
  if (parallel.value) return scalarDto(1, "line-line angle cosine", session);
  return scalarDto(
    lineLineAngleCosValue(EXACT_OPS, first.value.expression, second.value.expression),
    "line-line angle cosine",
    session,
  );
}

export function pointPlaneDistance(
  point: Vec3<MathJsonExpr>,
  planePoint: Vec3<MathJsonExpr>,
  planeNormal: Vec3<MathJsonExpr>,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  const validPoint = exactVector(point, "point", session);
  if (!validPoint.ok) return validPoint;
  const validPlanePoint = exactVector(planePoint, "plane point", session);
  if (!validPlanePoint.ok) return validPlanePoint;
  const normal = exactVector(planeNormal, "plane normal", session);
  if (!normal.ok) return normal;
  const normalNorm = positiveNormSquared(
    normal.value.expression,
    KERNEL_ERROR_CODES.degeneratePlane,
    "Plane normal must be non-zero.",
    "plane normal squared norm",
    session,
  );
  if (!normalNorm.ok) return normalNorm;
  return scalarDto(
    pointPlaneDistanceValue(
      EXACT_OPS,
      validPoint.value.expression,
      validPlanePoint.value.expression,
      normal.value.expression,
    ),
    "point-plane distance",
    session,
  );
}

export function dihedralHalfPlaneCos(
  edgeStart: Vec3<MathJsonExpr>,
  edgeEnd: Vec3<MathJsonExpr>,
  firstHalfPlanePoint: Vec3<MathJsonExpr>,
  secondHalfPlanePoint: Vec3<MathJsonExpr>,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  const start = exactVector(edgeStart, "edge start", session);
  if (!start.ok) return start;
  const end = exactVector(edgeEnd, "edge end", session);
  if (!end.ok) return end;
  const firstPoint = exactVector(firstHalfPlanePoint, "first half-plane point", session);
  if (!firstPoint.ok) return firstPoint;
  const secondPoint = exactVector(secondHalfPlanePoint, "second half-plane point", session);
  if (!secondPoint.ok) return secondPoint;

  const edge = vecSub(EXACT_OPS, end.value.expression, start.value.expression);
  const edgeNorm = positiveNormSquared(
    edge,
    KERNEL_ERROR_CODES.degenerateEdge,
    "Dihedral edge must be non-degenerate.",
    "dihedral edge squared norm",
    session,
  );
  if (!edgeNorm.ok) return edgeNorm;
  const first = edgeOrthogonalComponent(
    EXACT_OPS,
    edge,
    vecSub(EXACT_OPS, firstPoint.value.expression, start.value.expression),
  );
  const second = edgeOrthogonalComponent(
    EXACT_OPS,
    edge,
    vecSub(EXACT_OPS, secondPoint.value.expression, start.value.expression),
  );
  const firstNorm = positiveNormSquared(
    first,
    KERNEL_ERROR_CODES.degenerateHalfPlane,
    "First half-plane point must not lie on the edge.",
    "first half-plane squared norm",
    session,
  );
  if (!firstNorm.ok) return firstNorm;
  const secondNorm = positiveNormSquared(
    second,
    KERNEL_ERROR_CODES.degenerateHalfPlane,
    "Second half-plane point must not lie on the edge.",
    "second half-plane squared norm",
    session,
  );
  if (!secondNorm.ok) return secondNorm;
  return scalarDto(
    dihedralHalfPlaneCosValue(
      EXACT_OPS,
      start.value.expression,
      end.value.expression,
      firstPoint.value.expression,
      secondPoint.value.expression,
    ),
    "dihedral cosine",
    session,
  );
}

/** @deprecated Use dihedralHalfPlaneCos(), whose name states the half-plane convention. */
export const dihedralCos = dihedralHalfPlaneCos;

export function dihedralCosFromNormals(
  firstNormal: Vec3<MathJsonExpr>,
  secondNormal: Vec3<MathJsonExpr>,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  const first = exactVector(firstNormal, "first half-plane normal", session);
  if (!first.ok) return first;
  const second = exactVector(secondNormal, "second half-plane normal", session);
  if (!second.ok) return second;
  const firstNorm = positiveNormSquared(
    first.value.expression,
    KERNEL_ERROR_CODES.degenerateHalfPlane,
    "First half-plane normal must be non-zero.",
    "first half-plane normal squared norm",
    session,
  );
  if (!firstNorm.ok) return firstNorm;
  const secondNorm = positiveNormSquared(
    second.value.expression,
    KERNEL_ERROR_CODES.degenerateHalfPlane,
    "Second half-plane normal must be non-zero.",
    "second half-plane normal squared norm",
    session,
  );
  if (!secondNorm.ok) return secondNorm;
  return scalarDto(
    dihedralCosFromNormalsValue(EXACT_OPS, first.value.expression, second.value.expression),
    "normal-based dihedral cosine",
    session,
  );
}

export function boxVolume(
  x: MathJsonExpr,
  y: MathJsonExpr,
  z: MathJsonExpr,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  const validX = positiveScalar(x, "x length", session);
  if (!validX.ok) return validX;
  const validY = positiveScalar(y, "y length", session);
  if (!validY.ok) return validY;
  const validZ = positiveScalar(z, "z length", session);
  if (!validZ.ok) return validZ;
  return scalarDto(
    boxVolumeValue(EXACT_OPS, validX.value, validY.value, validZ.value),
    "box volume",
    session,
  );
}

export function prismVolume(
  baseArea: MathJsonExpr,
  height: MathJsonExpr,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  const validBaseArea = positiveScalar(baseArea, "base area", session);
  if (!validBaseArea.ok) return validBaseArea;
  const validHeight = positiveScalar(height, "height", session);
  if (!validHeight.ok) return validHeight;
  return scalarDto(
    prismVolumeValue(EXACT_OPS, validBaseArea.value, validHeight.value),
    "prism volume",
    session,
  );
}

export function pyramidVolume(
  baseArea: MathJsonExpr,
  height: MathJsonExpr,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  const validBaseArea = positiveScalar(baseArea, "base area", session);
  if (!validBaseArea.ok) return validBaseArea;
  const validHeight = positiveScalar(height, "height", session);
  if (!validHeight.ok) return validHeight;
  return scalarDto(
    pyramidVolumeValue(EXACT_OPS, validBaseArea.value, validHeight.value),
    "pyramid volume",
    session,
  );
}

export function tetrahedronVolume(
  first: Vec3<MathJsonExpr>,
  second: Vec3<MathJsonExpr>,
  third: Vec3<MathJsonExpr>,
  fourth: Vec3<MathJsonExpr>,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  const validFirst = exactVector(first, "first point", session);
  if (!validFirst.ok) return validFirst;
  const validSecond = exactVector(second, "second point", session);
  if (!validSecond.ok) return validSecond;
  const validThird = exactVector(third, "third point", session);
  if (!validThird.ok) return validThird;
  const validFourth = exactVector(fourth, "fourth point", session);
  if (!validFourth.ok) return validFourth;
  return scalarDto(
    tetrahedronVolumeValue(
      EXACT_OPS,
      validFirst.value.expression,
      validSecond.value.expression,
      validThird.value.expression,
      validFourth.value.expression,
    ),
    "tetrahedron volume",
    session,
  );
}

function hasOnlyDataProperties(
  value: object,
  keys: readonly string[],
): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    return false;
  }
  return keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined &&
      "value" in descriptor &&
      descriptor.enumerable;
  });
}

function isDenseStandardArray(value: unknown, length: number): value is unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length !== length
  ) {
    return false;
  }
  const expectedKeys = [
    ...Array.from({ length }, (_, index) => String(index)),
    "length",
  ];
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== expectedKeys.length ||
    ownKeys.some((key) =>
      typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    return false;
  }
  return Array.from({ length }, (_, index) => index).every((index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    return descriptor !== undefined &&
      "value" in descriptor &&
      descriptor.enumerable;
  });
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function validExactValueDto(
  value: unknown,
  session: CasSession,
): value is ExactValueDto {
  if (
    value === null ||
    typeof value !== "object" ||
    !hasOnlyDataProperties(
      value,
      ["schemaVersion", "mathJson", "latex", "decimal", "approx"],
    )
  ) {
    return false;
  }
  const component = value as ExactValueDto;
  if (
    component.schemaVersion !== 1 ||
    typeof component.latex !== "string" ||
    (component.decimal !== null && typeof component.decimal !== "string") ||
    (component.approx !== null &&
      (typeof component.approx !== "number" || !Number.isFinite(component.approx)))
  ) {
    return false;
  }
  const authoritative = session.toCanonicalExactValueDto(component.mathJson);
  if (!authoritative.ok) return false;
  return (
    sameJsonValue(component.mathJson, authoritative.value.mathJson) &&
    component.latex === authoritative.value.latex &&
    component.decimal === authoritative.value.decimal &&
    component.approx === authoritative.value.approx
  );
}

function validExactVec3Dto(
  value: ExactVec3Dto,
  session: CasSession,
): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    hasOnlyDataProperties(value, ["schemaVersion", "components"]) &&
    value.schemaVersion === 1 &&
    isDenseStandardArray(value.components, 3) &&
    value.components.every((component) =>
      validExactValueDto(component, session))
  );
}

export function formatExactVec3Latex(
  vector: ExactVec3Dto,
  session = new CasSession(),
): KernelResult<string> {
  if (!validExactVec3Dto(vector, session)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "Exact vector DTO is invalid.");
  }
  return {
    ok: true,
    value: `(${vector.components.map((component) => component.latex).join(", ")})`,
  };
}

export function isReadableExactVec3(
  vector: ExactVec3Dto,
  session = new CasSession(),
): KernelResult<boolean> {
  if (!validExactVec3Dto(vector, session)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "Exact vector DTO is invalid.");
  }
  for (const component of vector.components) {
    const readable = session.isReadableExactMathJson(component.mathJson);
    if (!readable.ok) return readable;
    if (!readable.value) return { ok: true, value: false };
  }
  return { ok: true, value: true };
}
