import "server-only";

/**
 * Constrained server-only TypeScript rewrite of Edulab analytic_kernel.py at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 *
 * This module accepts only application-constructed MathJSON constants and the
 * fixed parameter symbol `m`. It is deliberately not a general online CAS.
 */

import type { Quadratic2D } from "../conics/model";
import { CasSession } from "../cas/computeEngine.server";
import { KERNEL_ERROR_CODES, type MathKernelErrorCode } from "../shared/errors";
import type {
  ExactEndpointDto,
  ExactIntervalDto,
  ExactValueDto,
  KernelResult,
  MathJsonExpr,
  RangeWitnessDto,
  SolutionStepDto,
} from "../shared/types";
import {
  analyticMathJsonOps as ops,
  chordLengthSquaredExpression,
  dotProductExpression,
  lineConicCoefficientExpressions,
  reconstructEndpointSymmetricExpressions,
  triangleAreaExpression,
} from "./expressions";
import type {
  AnalyticRangeMetric,
  AnalyticRangeSolutionDto,
  ConstantInParameterDto,
  EccentricityRangeSolutionDto,
  ExactIntersectionResultDto,
  ExactLineConicSetupDto,
  LineConicExpressionSetup,
  LineFamilyOrientation,
  RangeOverLineFamilyRequest,
} from "./types";

const SOURCE_REVISION =
  "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc" as const;

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): KernelResult<T> {
  return { ok: false, error: { code, message, details } };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

interface ExactConstant {
  readonly expression: MathJsonExpr;
  readonly dto: ExactValueDto;
}

function exactConstant(
  session: CasSession,
  input: unknown,
  label: string,
): KernelResult<ExactConstant> {
  if (typeof input === "number" && !Number.isFinite(input)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} must be a finite real exact constant.`,
      { label },
    );
  }
  const dto = session.toCanonicalExactValueDto(input);
  if (!dto.ok) return dto;
  const finiteReal = session.isFiniteRealExactMathJson(dto.value.mathJson);
  if (!finiteReal.ok) return finiteReal;
  if (!finiteReal.value) {
    return fail(
      KERNEL_ERROR_CODES.nonRealExpression,
      `${label} must be a provably finite real exact constant.`,
      { label },
    );
  }
  return {
    ok: true,
    value: {
      expression: dto.value.mathJson,
      dto: deepFreeze(dto.value),
    },
  };
}

function exactExpression(
  session: CasSession,
  input: MathJsonExpr,
): KernelResult<ExactValueDto> {
  const dto = session.toExactValueDto(input);
  return dto.ok ? { ok: true, value: deepFreeze(dto.value) } : dto;
}

function exactOrder(
  session: CasSession,
  left: MathJsonExpr,
  right: MathJsonExpr,
): KernelResult<"less" | "equal" | "greater"> {
  const comparison = session.compareExactOrder(left, right);
  if (!comparison.ok) return comparison;
  return comparison.value === "unknown"
    ? fail(
        KERNEL_ERROR_CODES.indeterminateSymbolicResult,
        "The exact order could not be proven.",
      )
    : { ok: true, value: comparison.value };
}

function exactEqual(
  session: CasSession,
  left: MathJsonExpr,
  right: MathJsonExpr,
): KernelResult<boolean> {
  const comparison = session.compareExactMathJson(left, right);
  if (!comparison.ok) return comparison;
  return comparison.value === "unknown"
    ? fail(
        KERNEL_ERROR_CODES.indeterminateSymbolicResult,
        "The exact equality could not be proven.",
      )
    : { ok: true, value: comparison.value === "equal" };
}

interface CanonicalSetupInput {
  readonly conic: Quadratic2D<MathJsonExpr>;
  readonly orientation: LineFamilyOrientation;
  readonly through: readonly [MathJsonExpr, MathJsonExpr];
  readonly setup: LineConicExpressionSetup;
}

function canonicalSetupInput(
  request: unknown,
  session: CasSession,
): KernelResult<CanonicalSetupInput> {
  if (!isRecord(request) || !hasOnlyKeys(request, ["conic", "line"])) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "Line-conic setup must contain only conic and line fields.",
    );
  }
  if (!isRecord(request.conic)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "conic must be a plain object.");
  }
  const conicRecord = request.conic;
  const conicKeys = ["x2", "xy", "y2", "x", "y", "constant"] as const;
  if (
    !hasOnlyKeys(conicRecord, conicKeys) ||
    conicKeys.some((key) => !(key in conicRecord))
  ) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "conic must contain exactly x2, xy, y2, x, y, and constant.",
    );
  }
  if (!isRecord(request.line) || !hasOnlyKeys(request.line, ["orientation", "through"])) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "line must contain only orientation and through; the public parameter is fixed as m.",
    );
  }
  const orientation = request.line.orientation;
  if (orientation !== "xFromY" && orientation !== "yFromX") {
    return fail(
      KERNEL_ERROR_CODES.invalidOrientation,
      "Line orientation must be xFromY or yFromX.",
    );
  }
  if (!Array.isArray(request.line.through) || request.line.through.length !== 2) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "line.through must contain exactly two exact coordinates.",
    );
  }

  const canonicalCoefficients: Partial<Record<(typeof conicKeys)[number], MathJsonExpr>> = {};
  for (const key of conicKeys) {
    const value = exactConstant(session, conicRecord[key], `conic.${key}`);
    if (!value.ok) return value;
    canonicalCoefficients[key] = value.value.expression;
  }
  const throughX = exactConstant(session, request.line.through[0], "line.through.x");
  if (!throughX.ok) return throughX;
  const throughY = exactConstant(session, request.line.through[1], "line.through.y");
  if (!throughY.ok) return throughY;

  const conic = canonicalCoefficients as unknown as Quadratic2D<MathJsonExpr>;
  const through = [throughX.value.expression, throughY.value.expression] as const;
  const setup = lineConicCoefficientExpressions(conic, {
    orientation,
    through,
    parameter: "m",
  });
  return { ok: true, value: { conic, orientation, through, setup } };
}

function setupDto(
  setup: LineConicExpressionSetup,
  session: CasSession,
): KernelResult<ExactLineConicSetupDto> {
  const intercept = exactExpression(session, setup.intercept);
  if (!intercept.ok) return intercept;
  const A = exactExpression(session, setup.A);
  if (!A.ok) return A;
  const B = exactExpression(session, setup.B);
  if (!B.ok) return B;
  const C = exactExpression(session, setup.C);
  if (!C.ok) return C;
  const discriminant = exactExpression(session, setup.discriminant);
  if (!discriminant.ok) return discriminant;
  const firstSum = exactExpression(session, setup.firstSum);
  if (!firstSum.ok) return firstSum;
  const firstProduct = exactExpression(session, setup.firstProduct);
  if (!firstProduct.ok) return firstProduct;
  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: 1,
      orientation: setup.orientation,
      parameter: "m",
      parameterMeaning:
        setup.orientation === "xFromY" ? "inverse-slope" : "slope",
      intercept: intercept.value,
      A: A.value,
      B: B.value,
      C: C.value,
      discriminant: discriminant.value,
      firstSum: firstSum.value,
      firstProduct: firstProduct.value,
    }),
  };
}

export function setupLineConicIntersection(
  request: {
    readonly conic: Quadratic2D<MathJsonExpr>;
    readonly line: {
      readonly orientation: LineFamilyOrientation;
      readonly through: readonly [MathJsonExpr, MathJsonExpr];
    };
  },
  session = new CasSession(),
): KernelResult<ExactLineConicSetupDto> {
  const canonical = canonicalSetupInput(request, session);
  return canonical.ok ? setupDto(canonical.value.setup, session) : canonical;
}

function substituteFixedParameter(
  value: MathJsonExpr,
  parameter: MathJsonExpr,
): MathJsonExpr {
  if (value === "m") return parameter;
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      index === 0 ? entry : substituteFixedParameter(entry, parameter),
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        substituteFixedParameter(entry, parameter),
      ]),
    );
  }
  return value;
}

function exactPointDto(
  session: CasSession,
  point: readonly [MathJsonExpr, MathJsonExpr],
): KernelResult<readonly [ExactValueDto, ExactValueDto]> {
  const x = exactExpression(session, point[0]);
  if (!x.ok) return x;
  const y = exactExpression(session, point[1]);
  if (!y.ok) return y;
  return { ok: true, value: deepFreeze([x.value, y.value] as const) };
}

function pointFromFirstCoordinate(
  orientation: LineFamilyOrientation,
  first: MathJsonExpr,
  parameter: MathJsonExpr,
  intercept: MathJsonExpr,
): readonly [MathJsonExpr, MathJsonExpr] {
  const dependent = ops.add(ops.mul(parameter, first), intercept);
  return orientation === "xFromY"
    ? [dependent, first]
    : [first, dependent];
}

export function intersectLineConicExact(
  request: {
    readonly conic: Quadratic2D<MathJsonExpr>;
    readonly line: {
      readonly orientation: LineFamilyOrientation;
      readonly through: readonly [MathJsonExpr, MathJsonExpr];
      readonly parameter: MathJsonExpr;
    };
  },
  session = new CasSession(),
): KernelResult<ExactIntersectionResultDto> {
  if (!isRecord(request) || !isRecord(request.line)) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "Exact intersection request is malformed.");
  }
  const parameter = exactConstant(session, request.line.parameter, "line.parameter");
  if (!parameter.ok) return parameter;
  const canonical = canonicalSetupInput(
    {
      conic: request.conic,
      line: {
        orientation: request.line.orientation,
        through: request.line.through,
      },
    },
    session,
  );
  if (!canonical.ok) return canonical;

  const raw = canonical.value.setup;
  const AExpression = substituteFixedParameter(raw.A, parameter.value.expression);
  const BExpression = substituteFixedParameter(raw.B, parameter.value.expression);
  const CExpression = substituteFixedParameter(raw.C, parameter.value.expression);
  const interceptExpression = substituteFixedParameter(
    raw.intercept,
    parameter.value.expression,
  );
  const A = exactExpression(session, AExpression);
  if (!A.ok) return A;
  const B = exactExpression(session, BExpression);
  if (!B.ok) return B;
  const C = exactExpression(session, CExpression);
  if (!C.ok) return C;
  const aOrder = exactOrder(session, A.value.mathJson, 0);
  if (!aOrder.ok) return aOrder;

  if (aOrder.value === "equal") {
    const bOrder = exactOrder(session, B.value.mathJson, 0);
    if (!bOrder.ok) return bOrder;
    if (bOrder.value === "equal") {
      const cOrder = exactOrder(session, C.value.mathJson, 0);
      if (!cOrder.ok) return cOrder;
      return {
        ok: true,
        value: deepFreeze({
          schemaVersion: 1,
          kind: "invalid",
          reason: cOrder.value === "equal" ? "coincident" : "constant-nonzero",
          coefficients: { A: A.value, B: B.value, C: C.value, discriminant: null },
        }),
      };
    }
    const first = ops.div(ops.neg(C.value.mathJson), B.value.mathJson);
    const point = exactPointDto(
      session,
      pointFromFirstCoordinate(
        canonical.value.orientation,
        first,
        parameter.value.expression,
        interceptExpression,
      ),
    );
    if (!point.ok) return point;
    return {
      ok: true,
      value: deepFreeze({
        schemaVersion: 1,
        kind: "linear-degenerate",
        point: point.value,
        coefficients: { A: A.value, B: B.value, C: C.value, discriminant: null },
      }),
    };
  }

  const discriminantExpression = ops.sub(
    ops.square(B.value.mathJson),
    ops.mul(4, A.value.mathJson, C.value.mathJson),
  );
  const discriminant = exactExpression(session, discriminantExpression);
  if (!discriminant.ok) return discriminant;
  const discriminantOrder = exactOrder(session, discriminant.value.mathJson, 0);
  if (!discriminantOrder.ok) return discriminantOrder;
  const coefficients = {
    A: A.value,
    B: B.value,
    C: C.value,
    discriminant: discriminant.value,
  } as const;
  if (discriminantOrder.value === "less") {
    return {
      ok: true,
      value: deepFreeze({ schemaVersion: 1, kind: "disjoint", coefficients }),
    };
  }

  const denominator = ops.mul(2, A.value.mathJson);
  if (discriminantOrder.value === "equal") {
    const first = ops.div(ops.neg(B.value.mathJson), denominator);
    const point = exactPointDto(
      session,
      pointFromFirstCoordinate(
        canonical.value.orientation,
        first,
        parameter.value.expression,
        interceptExpression,
      ),
    );
    if (!point.ok) return point;
    return {
      ok: true,
      value: deepFreeze({
        schemaVersion: 1,
        kind: "tangent",
        point: point.value,
        coefficients,
      }),
    };
  }

  const root = ops.sqrt(discriminant.value.mathJson);
  const first1 = ops.div(
    ops.sub(ops.neg(B.value.mathJson), root),
    denominator,
  );
  const first2 = ops.div(
    ops.add(ops.neg(B.value.mathJson), root),
    denominator,
  );
  let point1 = exactPointDto(
    session,
    pointFromFirstCoordinate(
      canonical.value.orientation,
      first1,
      parameter.value.expression,
      interceptExpression,
    ),
  );
  if (!point1.ok) return point1;
  let point2 = exactPointDto(
    session,
    pointFromFirstCoordinate(
      canonical.value.orientation,
      first2,
      parameter.value.expression,
      interceptExpression,
    ),
  );
  if (!point2.ok) return point2;
  const firstOrder = exactOrder(session, first1, first2);
  if (!firstOrder.ok) return firstOrder;
  if (firstOrder.value === "greater") {
    [point1, point2] = [point2, point1];
  }
  const dx = ops.sub(point2.value[0].mathJson, point1.value[0].mathJson);
  const dy = ops.sub(point2.value[1].mathJson, point1.value[1].mathJson);
  const chordLengthSquared = exactExpression(
    session,
    ops.add(ops.square(dx), ops.square(dy)),
  );
  if (!chordLengthSquared.ok) return chordLengthSquared;
  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: 1,
      kind: "secant",
      points: [point1.value, point2.value],
      chordLengthSquared: chordLengthSquared.value,
      coefficients,
    }),
  };
}

interface Fraction {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

type Polynomial = ReadonlyMap<number, Fraction>;

interface RationalFunction {
  readonly numerator: Polynomial;
  readonly denominator: Polynomial;
}

function bigintAbs(value: bigint): bigint {
  return value < BigInt(0) ? -value : value;
}

function bigintGcd(left: bigint, right: bigint): bigint {
  let a = bigintAbs(left);
  let b = bigintAbs(right);
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a === BigInt(0) ? BigInt(1) : a;
}

function fraction(numerator: bigint, denominator = BigInt(1)): Fraction | null {
  if (denominator === BigInt(0)) return null;
  let n = numerator;
  let d = denominator;
  if (d < BigInt(0)) {
    n = -n;
    d = -d;
  }
  const divisor = bigintGcd(n, d);
  return { numerator: n / divisor, denominator: d / divisor };
}

const ZERO_FRACTION = fraction(BigInt(0))!;
const ONE_FRACTION = fraction(BigInt(1))!;

function fractionAdd(left: Fraction, right: Fraction): Fraction {
  return fraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  )!;
}

function fractionNeg(value: Fraction): Fraction {
  return { numerator: -value.numerator, denominator: value.denominator };
}

function fractionSub(left: Fraction, right: Fraction): Fraction {
  return fractionAdd(left, fractionNeg(right));
}

function fractionMul(left: Fraction, right: Fraction): Fraction {
  return fraction(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  )!;
}

function fractionDiv(left: Fraction, right: Fraction): Fraction | null {
  return fraction(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

function fractionCompare(left: Fraction, right: Fraction): -1 | 0 | 1 {
  const difference =
    left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < BigInt(0) ? -1 : difference > BigInt(0) ? 1 : 0;
}

function fractionEqual(left: Fraction, right: Fraction): boolean {
  return fractionCompare(left, right) === 0;
}

function integerFromMathJson(value: MathJsonExpr): bigint | null {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? BigInt(value)
    : null;
}

function parseFraction(value: MathJsonExpr): Fraction | null {
  const integer = integerFromMathJson(value);
  if (integer !== null) return fraction(integer);
  if (!Array.isArray(value) || typeof value[0] !== "string") return null;
  const operator = value[0];
  if (operator === "Negate" && value.length === 2) {
    const operand = parseFraction(value[1]);
    return operand === null ? null : fractionNeg(operand);
  }
  if ((operator === "Divide" || operator === "Rational") && value.length === 3) {
    const left = parseFraction(value[1]);
    const right = parseFraction(value[2]);
    return left === null || right === null ? null : fractionDiv(left, right);
  }
  if (operator === "Add") {
    let result = ZERO_FRACTION;
    for (const operand of value.slice(1)) {
      const parsed = parseFraction(operand);
      if (parsed === null) return null;
      result = fractionAdd(result, parsed);
    }
    return result;
  }
  if (operator === "Subtract" && value.length === 3) {
    const left = parseFraction(value[1]);
    const right = parseFraction(value[2]);
    return left === null || right === null ? null : fractionSub(left, right);
  }
  if (operator === "Multiply") {
    let result = ONE_FRACTION;
    for (const operand of value.slice(1)) {
      const parsed = parseFraction(operand);
      if (parsed === null) return null;
      result = fractionMul(result, parsed);
    }
    return result;
  }
  if (operator === "Power" && value.length === 3) {
    const base = parseFraction(value[1]);
    const exponent = integerFromMathJson(value[2]);
    if (base === null || exponent === null || exponent < BigInt(0) || exponent > BigInt(12)) {
      return null;
    }
    let result = ONE_FRACTION;
    for (let index = BigInt(0); index < exponent; index += BigInt(1)) {
      result = fractionMul(result, base);
    }
    return result;
  }
  return null;
}

function constantPolynomial(value: Fraction): Polynomial {
  return new Map(value.numerator === BigInt(0) ? [] : [[0, value]]);
}

function polynomialCoefficient(value: Polynomial, degree: number): Fraction {
  return value.get(degree) ?? ZERO_FRACTION;
}

function polynomialDegree(value: Polynomial): number {
  return value.size === 0 ? -1 : Math.max(...value.keys());
}

function polynomialAdd(left: Polynomial, right: Polynomial): Polynomial {
  const result = new Map<number, Fraction>();
  for (const degree of new Set([...left.keys(), ...right.keys()])) {
    const coefficient = fractionAdd(
      polynomialCoefficient(left, degree),
      polynomialCoefficient(right, degree),
    );
    if (coefficient.numerator !== BigInt(0)) result.set(degree, coefficient);
  }
  return result;
}

function polynomialNeg(value: Polynomial): Polynomial {
  return new Map(
    [...value].map(([degree, coefficient]) => [degree, fractionNeg(coefficient)]),
  );
}

function polynomialSub(left: Polynomial, right: Polynomial): Polynomial {
  return polynomialAdd(left, polynomialNeg(right));
}

function polynomialMul(left: Polynomial, right: Polynomial): Polynomial | null {
  const result = new Map<number, Fraction>();
  for (const [leftDegree, leftCoefficient] of left) {
    for (const [rightDegree, rightCoefficient] of right) {
      const degree = leftDegree + rightDegree;
      if (degree > 12) return null;
      const coefficient = fractionAdd(
        polynomialCoefficient(result, degree),
        fractionMul(leftCoefficient, rightCoefficient),
      );
      if (coefficient.numerator === BigInt(0)) result.delete(degree);
      else result.set(degree, coefficient);
    }
  }
  return result;
}

function polynomialPow(value: Polynomial, exponent: number): Polynomial | null {
  let result: Polynomial = constantPolynomial(ONE_FRACTION);
  for (let index = 0; index < exponent; index += 1) {
    const multiplied = polynomialMul(result, value);
    if (multiplied === null) return null;
    result = multiplied;
  }
  return result;
}

function polynomialDerivative(value: Polynomial): Polynomial {
  const result = new Map<number, Fraction>();
  for (const [degree, coefficient] of value) {
    if (degree === 0) continue;
    result.set(
      degree - 1,
      fractionMul(coefficient, fraction(BigInt(degree))!),
    );
  }
  return result;
}

function polynomialEvaluate(value: Polynomial, at: Fraction): Fraction {
  let result = ZERO_FRACTION;
  for (let degree = polynomialDegree(value); degree >= 0; degree -= 1) {
    result = fractionAdd(
      fractionMul(result, at),
      polynomialCoefficient(value, degree),
    );
  }
  return result;
}

function parsePolynomialInM(value: MathJsonExpr): Polynomial | null {
  if (value === "m") return new Map([[1, ONE_FRACTION]]);
  const constant = parseFraction(value);
  if (constant !== null) return constantPolynomial(constant);
  if (!Array.isArray(value) || typeof value[0] !== "string") return null;
  const operator = value[0];
  if (operator === "Negate" && value.length === 2) {
    const operand = parsePolynomialInM(value[1]);
    return operand === null ? null : polynomialNeg(operand);
  }
  if (operator === "Add") {
    let result: Polynomial = new Map();
    for (const operand of value.slice(1)) {
      const parsed = parsePolynomialInM(operand);
      if (parsed === null) return null;
      result = polynomialAdd(result, parsed);
    }
    return result;
  }
  if (operator === "Subtract" && value.length === 3) {
    const left = parsePolynomialInM(value[1]);
    const right = parsePolynomialInM(value[2]);
    return left === null || right === null ? null : polynomialSub(left, right);
  }
  if (operator === "Multiply") {
    let result: Polynomial = constantPolynomial(ONE_FRACTION);
    for (const operand of value.slice(1)) {
      const parsed = parsePolynomialInM(operand);
      if (parsed === null) return null;
      const multiplied = polynomialMul(result, parsed);
      if (multiplied === null) return null;
      result = multiplied;
    }
    return result;
  }
  if (operator === "Power" && value.length === 3) {
    const base = parsePolynomialInM(value[1]);
    const exponent = integerFromMathJson(value[2]);
    if (base === null || exponent === null || exponent < BigInt(0) || exponent > BigInt(12)) {
      return null;
    }
    return polynomialPow(base, Number(exponent));
  }
  if (operator === "Divide" && value.length === 3) {
    const numerator = parsePolynomialInM(value[1]);
    const denominator = parseFraction(value[2]);
    if (numerator === null || denominator === null || denominator.numerator === BigInt(0)) {
      return null;
    }
    const result = new Map<number, Fraction>();
    for (const [degree, coefficient] of numerator) {
      const divided = fractionDiv(coefficient, denominator);
      if (divided === null) return null;
      result.set(degree, divided);
    }
    return result;
  }
  return null;
}

function rationalFunctionFromPolynomial(value: Polynomial): RationalFunction {
  return { numerator: value, denominator: constantPolynomial(ONE_FRACTION) };
}

function rationalFunctionAdd(
  left: RationalFunction,
  right: RationalFunction,
): RationalFunction | null {
  const leftNumerator = polynomialMul(left.numerator, right.denominator);
  const rightNumerator = polynomialMul(right.numerator, left.denominator);
  const denominator = polynomialMul(left.denominator, right.denominator);
  if (leftNumerator === null || rightNumerator === null || denominator === null) {
    return null;
  }
  return {
    numerator: polynomialAdd(leftNumerator, rightNumerator),
    denominator,
  };
}

function rationalFunctionNeg(value: RationalFunction): RationalFunction {
  return { numerator: polynomialNeg(value.numerator), denominator: value.denominator };
}

function rationalFunctionMul(
  left: RationalFunction,
  right: RationalFunction,
): RationalFunction | null {
  const numerator = polynomialMul(left.numerator, right.numerator);
  const denominator = polynomialMul(left.denominator, right.denominator);
  return numerator === null || denominator === null
    ? null
    : { numerator, denominator };
}

function rationalFunctionDiv(
  left: RationalFunction,
  right: RationalFunction,
): RationalFunction | null {
  if (polynomialDegree(right.numerator) < 0) return null;
  const numerator = polynomialMul(left.numerator, right.denominator);
  const denominator = polynomialMul(left.denominator, right.numerator);
  return numerator === null || denominator === null
    ? null
    : { numerator, denominator };
}

function rationalFunctionPow(
  value: RationalFunction,
  exponent: number,
): RationalFunction | null {
  const numerator = polynomialPow(value.numerator, exponent);
  const denominator = polynomialPow(value.denominator, exponent);
  return numerator === null || denominator === null
    ? null
    : { numerator, denominator };
}

function parseRationalFunctionInM(value: MathJsonExpr): RationalFunction | null {
  const polynomial = parsePolynomialInM(value);
  if (polynomial !== null) return rationalFunctionFromPolynomial(polynomial);
  if (!Array.isArray(value) || typeof value[0] !== "string") return null;
  const operator = value[0];
  if (operator === "Negate" && value.length === 2) {
    const operand = parseRationalFunctionInM(value[1]);
    return operand === null ? null : rationalFunctionNeg(operand);
  }
  if (operator === "Add") {
    let result = rationalFunctionFromPolynomial(constantPolynomial(ZERO_FRACTION));
    for (const operand of value.slice(1)) {
      const parsed = parseRationalFunctionInM(operand);
      if (parsed === null) return null;
      const added = rationalFunctionAdd(result, parsed);
      if (added === null) return null;
      result = added;
    }
    return result;
  }
  if (operator === "Subtract" && value.length === 3) {
    const left = parseRationalFunctionInM(value[1]);
    const right = parseRationalFunctionInM(value[2]);
    return left === null || right === null
      ? null
      : rationalFunctionAdd(left, rationalFunctionNeg(right));
  }
  if (operator === "Multiply") {
    let result = rationalFunctionFromPolynomial(constantPolynomial(ONE_FRACTION));
    for (const operand of value.slice(1)) {
      const parsed = parseRationalFunctionInM(operand);
      if (parsed === null) return null;
      const multiplied = rationalFunctionMul(result, parsed);
      if (multiplied === null) return null;
      result = multiplied;
    }
    return result;
  }
  if (operator === "Divide" && value.length === 3) {
    const left = parseRationalFunctionInM(value[1]);
    const right = parseRationalFunctionInM(value[2]);
    return left === null || right === null ? null : rationalFunctionDiv(left, right);
  }
  if (operator === "Power" && value.length === 3) {
    const base = parseRationalFunctionInM(value[1]);
    const exponent = integerFromMathJson(value[2]);
    if (base === null || exponent === null || exponent < BigInt(0) || exponent > BigInt(6)) {
      return null;
    }
    return rationalFunctionPow(base, Number(exponent));
  }
  return null;
}

function evenPolynomialToU(value: Polynomial): Polynomial | null {
  const result = new Map<number, Fraction>();
  for (const [degree, coefficient] of value) {
    if (degree % 2 !== 0) return null;
    result.set(degree / 2, coefficient);
  }
  return result;
}

function evenRationalFunction(value: MathJsonExpr): RationalFunction | null {
  const parsed = parseRationalFunctionInM(value);
  if (parsed === null) return null;
  const numerator = evenPolynomialToU(parsed.numerator);
  const denominator = evenPolynomialToU(parsed.denominator);
  return numerator === null || denominator === null
    ? null
    : { numerator, denominator };
}

function rationalFunctionEvaluate(
  value: RationalFunction,
  at: Fraction,
): Fraction | null {
  return fractionDiv(
    polynomialEvaluate(value.numerator, at),
    polynomialEvaluate(value.denominator, at),
  );
}

function derivativeNumerator(value: RationalFunction): Polynomial | null {
  const first = polynomialMul(
    polynomialDerivative(value.numerator),
    value.denominator,
  );
  const second = polynomialMul(
    value.numerator,
    polynomialDerivative(value.denominator),
  );
  return first === null || second === null ? null : polynomialSub(first, second);
}

function bigintSquareRoot(value: bigint): bigint | null {
  if (value < BigInt(0)) return null;
  if (value < BigInt(2)) return value;
  let x = BigInt(1) << (BigInt(value.toString(2).length) + BigInt(1) >> BigInt(1));
  while (true) {
    const next = (x + value / x) >> BigInt(1);
    if (next >= x) return x * x === value ? x : null;
    x = next;
  }
}

function fractionSquareRoot(value: Fraction): Fraction | null {
  if (value.numerator < BigInt(0)) return null;
  const numerator = bigintSquareRoot(value.numerator);
  const denominator = bigintSquareRoot(value.denominator);
  return numerator === null || denominator === null
    ? null
    : fraction(numerator, denominator);
}

function rationalRoots(value: Polynomial): readonly Fraction[] | null {
  const degree = polynomialDegree(value);
  if (degree < 1) return [];
  if (degree === 1) {
    const root = fractionDiv(
      fractionNeg(polynomialCoefficient(value, 0)),
      polynomialCoefficient(value, 1),
    );
    return root === null ? null : [root];
  }
  if (degree !== 2) return null;
  const a = polynomialCoefficient(value, 2);
  const b = polynomialCoefficient(value, 1);
  const c = polynomialCoefficient(value, 0);
  const discriminant = fractionSub(
    fractionMul(b, b),
    fractionMul(fraction(BigInt(4))!, fractionMul(a, c)),
  );
  const squareRoot = fractionSquareRoot(discriminant);
  if (squareRoot === null) return null;
  const denominator = fractionMul(fraction(BigInt(2))!, a);
  const first = fractionDiv(fractionSub(fractionNeg(b), squareRoot), denominator);
  const second = fractionDiv(fractionAdd(fractionNeg(b), squareRoot), denominator);
  if (first === null || second === null) return null;
  return fractionEqual(first, second) ? [first] : [first, second];
}

type RationalLimit =
  | { readonly kind: "finite"; readonly value: Fraction }
  | { readonly kind: "infinity"; readonly sign: -1 | 1 };

function rationalFunctionInfinityLimit(value: RationalFunction): RationalLimit | null {
  const numeratorDegree = polynomialDegree(value.numerator);
  const denominatorDegree = polynomialDegree(value.denominator);
  if (denominatorDegree < 0) return null;
  if (numeratorDegree < denominatorDegree) {
    return { kind: "finite", value: ZERO_FRACTION };
  }
  const leadingRatio = fractionDiv(
    polynomialCoefficient(value.numerator, numeratorDegree),
    polynomialCoefficient(value.denominator, denominatorDegree),
  );
  if (leadingRatio === null) return null;
  if (numeratorDegree === denominatorDegree) {
    return { kind: "finite", value: leadingRatio };
  }
  return {
    kind: "infinity",
    sign: leadingRatio.numerator < BigInt(0) ? -1 : 1,
  };
}

function safeBigintNumber(value: bigint): number | null {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : null;
}

function fractionMathJson(value: Fraction): MathJsonExpr | null {
  const numerator = safeBigintNumber(value.numerator);
  const denominator = safeBigintNumber(value.denominator);
  if (numerator === null || denominator === null) return null;
  return denominator === 1 ? numerator : ["Divide", numerator, denominator];
}

type SupportedConicProfile = "ellipse" | "parabola" | "hyperbola";

interface RangeProfile {
  readonly kind: SupportedConicProfile;
  readonly projectiveSecant: boolean;
}

function requireExactZero(
  session: CasSession,
  value: MathJsonExpr,
  label: string,
): KernelResult<true> {
  const comparison = exactEqual(session, value, 0);
  if (!comparison.ok) return comparison;
  return comparison.value
    ? { ok: true, value: true }
    : fail(
        KERNEL_ERROR_CODES.unsupportedExpression,
        `${label} must be zero for the supported exact range profile.`,
      );
}

function rangeProfile(
  canonical: CanonicalSetupInput,
  session: CasSession,
): KernelResult<RangeProfile> {
  const { conic, orientation, through } = canonical;
  const dependent2 = orientation === "xFromY" ? conic.x2 : conic.y2;
  const independent2 = orientation === "xFromY" ? conic.y2 : conic.x2;
  const dependent1 = orientation === "xFromY" ? conic.x : conic.y;
  const independent1 = orientation === "xFromY" ? conic.y : conic.x;
  const dependentThrough = orientation === "xFromY" ? through[0] : through[1];
  const independentThrough = orientation === "xFromY" ? through[1] : through[0];

  for (const [value, label] of [
    [conic.xy, "conic.xy"],
    [independentThrough, "line.through independent coordinate"],
  ] as const) {
    const zero = requireExactZero(session, value, label);
    if (!zero.ok) return zero;
  }

  const dependent2Order = exactOrder(session, dependent2, 0);
  if (!dependent2Order.ok) return dependent2Order;
  const independent2Order = exactOrder(session, independent2, 0);
  if (!independent2Order.ok) return independent2Order;
  const dependent1Order = exactOrder(session, dependent1, 0);
  if (!dependent1Order.ok) return dependent1Order;
  const constantOrder = exactOrder(session, conic.constant, 0);
  if (!constantOrder.ok) return constantOrder;

  if (
    dependent2Order.value !== "equal" &&
    independent2Order.value !== "equal" &&
    dependent1Order.value === "equal"
  ) {
    const independentLinearZero = requireExactZero(
      session,
      independent1,
      "conic independent linear coefficient",
    );
    if (!independentLinearZero.ok) return independentLinearZero;
    const sameQuadraticSign =
      dependent2Order.value === independent2Order.value;
    const constantOpposesDependent =
      constantOrder.value !== "equal" &&
      constantOrder.value !== dependent2Order.value;
    if (!constantOpposesDependent) {
      return fail(
        KERNEL_ERROR_CODES.unsupportedExpression,
        "The central conic does not have the required real dependent-axis branch.",
      );
    }
    const dependentSemiSquared = ops.div(ops.neg(conic.constant), dependent2);
    const throughSquared = ops.square(dependentThrough);

    if (sameQuadraticSign) {
      const independentSemiSquared = ops.div(
        ops.neg(conic.constant),
        independent2,
      );
      const focusSquared = ops.sub(
        dependentSemiSquared,
        independentSemiSquared,
      );
      const focusOrder = exactOrder(session, focusSquared, 0);
      if (!focusOrder.ok) return focusOrder;
      if (focusOrder.value !== "greater") {
        return fail(
          KERNEL_ERROR_CODES.unsupportedExpression,
          "The supported ellipse line family must pass through a focus on its major axis.",
        );
      }
      const atFocus = exactEqual(session, throughSquared, focusSquared);
      if (!atFocus.ok) return atFocus;
      return atFocus.value
        ? { ok: true, value: { kind: "ellipse", projectiveSecant: true } }
        : fail(
            KERNEL_ERROR_CODES.unsupportedExpression,
            "The supported ellipse line family must pass through an exact focus.",
          );
    }

    const atVertex = exactEqual(session, throughSquared, dependentSemiSquared);
    if (!atVertex.ok) return atVertex;
    return atVertex.value
      ? { ok: true, value: { kind: "hyperbola", projectiveSecant: true } }
      : fail(
          KERNEL_ERROR_CODES.unsupportedExpression,
          "The supported hyperbola line family must pass through a transverse-axis vertex.",
        );
  }

  if (
    dependent2Order.value === "equal" &&
    independent2Order.value !== "equal" &&
    dependent1Order.value !== "equal"
  ) {
    for (const [value, label] of [
      [independent1, "conic independent linear coefficient"],
      [conic.constant, "conic constant"],
    ] as const) {
      const zero = requireExactZero(session, value, label);
      if (!zero.ok) return zero;
    }
    const focus = ops.div(
      ops.neg(dependent1),
      ops.mul(4, independent2),
    );
    const atFocus = exactEqual(session, dependentThrough, focus);
    if (!atFocus.ok) return atFocus;
    return atFocus.value
      ? { ok: true, value: { kind: "parabola", projectiveSecant: false } }
      : fail(
          KERNEL_ERROR_CODES.unsupportedExpression,
          "The supported parabola line family must pass through its exact focus.",
        );
  }

  return fail(
    KERNEL_ERROR_CODES.unsupportedExpression,
    "The conic and line family are outside centered-axis-aligned-even-rational-v1.",
  );
}

interface MetricExpressions {
  readonly display: MathJsonExpr;
  readonly rangeBase: MathJsonExpr;
  readonly squareRootOutput: boolean;
}

function metricExpressions(
  setup: LineConicExpressionSetup,
  metric: AnalyticRangeMetric<MathJsonExpr>,
): MetricExpressions {
  const symmetric = reconstructEndpointSymmetricExpressions(setup);
  if (metric.kind === "dot-product") {
    const expression = dotProductExpression(setup, symmetric, metric.vertex);
    return { display: expression, rangeBase: expression, squareRootOutput: false };
  }
  const chordSquared = chordLengthSquaredExpression(setup);
  if (metric.kind === "chord-length-squared") {
    return {
      display: chordSquared,
      rangeBase: chordSquared,
      squareRootOutput: false,
    };
  }
  if (metric.kind === "chord-length") {
    return {
      display: ops.sqrt(chordSquared),
      rangeBase: chordSquared,
      squareRootOutput: true,
    };
  }

  const [vx, vy] = metric.vertex;
  const residual = setup.orientation === "xFromY"
    ? ops.sub(ops.sub(vx, ops.mul(setup.parameter, vy)), setup.intercept)
    : ops.sub(ops.sub(vy, ops.mul(setup.parameter, vx)), setup.intercept);
  const areaSquared = ops.div(
    ops.mul(ops.square(residual), setup.discriminant),
    ops.mul(4, ops.square(setup.A)),
  );
  return {
    display: triangleAreaExpression(setup, metric.vertex),
    rangeBase: areaSquared,
    squareRootOutput: true,
  };
}

function positivePoleInU(setup: LineConicExpressionSetup): Fraction | null {
  const polynomialInM = parsePolynomialInM(setup.A);
  const polynomial = polynomialInM === null ? null : evenPolynomialToU(polynomialInM);
  if (polynomial === null || polynomialDegree(polynomial) !== 1) return null;
  const root = fractionDiv(
    fractionNeg(polynomialCoefficient(polynomial, 0)),
    polynomialCoefficient(polynomial, 1),
  );
  return root !== null && root.numerator > BigInt(0) ? root : null;
}

function denominatorExclusionDtos(
  setup: LineConicExpressionSetup,
  session: CasSession,
): KernelResult<readonly ExactValueDto[]> {
  const pole = positivePoleInU(setup);
  if (pole === null) return { ok: true, value: deepFreeze([]) };
  const poleExpression = fractionMathJson(pole);
  if (poleExpression === null) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "A denominator exclusion exceeds the bounded JSON integer representation.",
    );
  }
  const positive = exactExpression(session, ops.sqrt(poleExpression));
  if (!positive.ok) return positive;
  const negative = exactExpression(session, ops.neg(ops.sqrt(poleExpression)));
  if (!negative.ok) return negative;
  return { ok: true, value: deepFreeze([negative.value, positive.value]) };
}

interface Candidate {
  readonly value: Fraction;
  readonly u: Fraction | null;
  readonly atInfinity: boolean;
  readonly attained: boolean;
  readonly witnessKind: RangeWitnessDto["kind"];
  readonly note: string;
}

function candidateWitnesses(
  candidate: Candidate,
  session: CasSession,
): KernelResult<readonly RangeWitnessDto[]> {
  if (candidate.atInfinity) {
    return {
      ok: true,
      value: deepFreeze([
        {
          kind: candidate.witnessKind,
          parameters: {},
          note: candidate.note,
        },
      ]),
    };
  }
  if (candidate.u === null) return { ok: true, value: deepFreeze([]) };
  const uExpression = fractionMathJson(candidate.u);
  if (uExpression === null) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "A range witness exceeds the bounded JSON integer representation.",
    );
  }
  const parameterExpressions: MathJsonExpr[] = candidate.u.numerator === BigInt(0)
    ? [0]
    : [ops.neg(ops.sqrt(uExpression)), ops.sqrt(uExpression)];
  const witnesses: RangeWitnessDto[] = [];
  for (const parameterExpression of parameterExpressions) {
    const parameter = exactExpression(session, parameterExpression);
    if (!parameter.ok) return parameter;
    witnesses.push({
      kind: candidate.witnessKind,
      parameters: { m: parameter.value },
      note: candidate.note,
    });
  }
  return { ok: true, value: deepFreeze(witnesses) };
}

function endpointExpression(
  value: Fraction,
  squareRootOutput: boolean,
): MathJsonExpr | null {
  const rational = fractionMathJson(value);
  return rational === null
    ? null
    : squareRootOutput
      ? ops.sqrt(rational)
      : rational;
}

function finiteEndpoint(
  value: Fraction,
  candidates: readonly Candidate[],
  squareRootOutput: boolean,
  session: CasSession,
): KernelResult<Extract<ExactEndpointDto, { readonly kind: "finite" }>> {
  const expression = endpointExpression(value, squareRootOutput);
  if (expression === null) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "A range endpoint exceeds the bounded JSON integer representation.",
    );
  }
  const dto = exactExpression(session, expression);
  if (!dto.ok) return dto;
  const matching = candidates.filter((candidate) =>
    fractionEqual(candidate.value, value),
  );
  const witnesses: RangeWitnessDto[] = [];
  for (const candidate of matching) {
    const produced = candidateWitnesses(candidate, session);
    if (!produced.ok) return produced;
    witnesses.push(...produced.value);
  }
  return {
    ok: true,
    value: deepFreeze({
      kind: "finite",
      value: dto.value,
      closed: matching.some((candidate) => candidate.attained),
      witnesses,
    }),
  };
}

function intervalLatexUnsafe(interval: ExactIntervalDto): string {
  const lowerBracket =
    interval.lower.kind === "finite" && interval.lower.closed ? "[" : "(";
  const upperBracket =
    interval.upper.kind === "finite" && interval.upper.closed ? "]" : ")";
  const lower =
    interval.lower.kind === "infinity"
      ? interval.lower.sign < 0
        ? "-\\infty"
        : "+\\infty"
      : interval.lower.value.latex;
  const upper =
    interval.upper.kind === "infinity"
      ? interval.upper.sign < 0
        ? "-\\infty"
        : "+\\infty"
      : interval.upper.value.latex;
  return `${lowerBracket}${lower},\\ ${upper}${upperBracket}`;
}

export function intervalToLatex(
  interval: ExactIntervalDto,
  session = new CasSession(),
): KernelResult<string> {
  try {
    if (
      !isRecord(interval) ||
      !hasOnlyKeys(interval, ["lower", "upper"]) ||
      !isRecord(interval.lower) ||
      !isRecord(interval.upper)
    ) {
      return fail(KERNEL_ERROR_CODES.invalidInput, "An exact interval must contain two endpoint objects.");
    }
    const canonicalEndpoint = (
      endpoint: ExactIntervalDto["lower"],
    ): KernelResult<ExactIntervalDto["lower"]> => {
      if (endpoint.kind === "infinity") {
        return hasOnlyKeys(endpoint, ["kind", "sign", "closed"]) &&
          (endpoint.sign === -1 || endpoint.sign === 1) &&
          endpoint.closed === false
          ? { ok: true, value: endpoint }
          : fail(
              KERNEL_ERROR_CODES.invalidInput,
              "An infinite interval endpoint must have sign -1 or 1 and must be open.",
            );
      }
      if (
        endpoint.kind !== "finite" ||
        !hasOnlyKeys(endpoint, ["kind", "value", "closed", "witnesses"]) ||
        typeof endpoint.closed !== "boolean" ||
        !Array.isArray(endpoint.witnesses) ||
        !isRecord(endpoint.value) ||
        !hasOnlyKeys(endpoint.value, [
          "schemaVersion",
          "mathJson",
          "latex",
          "decimal",
          "approx",
        ]) ||
        endpoint.value.schemaVersion !== 1 ||
        typeof endpoint.value.latex !== "string" ||
        !(
          endpoint.value.decimal === null ||
          typeof endpoint.value.decimal === "string"
        ) ||
        !(
          endpoint.value.approx === null ||
          (typeof endpoint.value.approx === "number" &&
            Number.isFinite(endpoint.value.approx))
        ) ||
        !("mathJson" in endpoint.value)
      ) {
        return fail(KERNEL_ERROR_CODES.invalidInput, "A finite interval endpoint is malformed.");
      }
      const canonical = exactExpression(
        session,
        endpoint.value.mathJson as MathJsonExpr,
      );
      if (!canonical.ok) return canonical;
      const finiteReal = session.isFiniteRealExactMathJson(
        canonical.value.mathJson,
      );
      if (!finiteReal.ok) return finiteReal;
      if (!finiteReal.value) {
        return fail(
          KERNEL_ERROR_CODES.invalidInput,
          "A finite interval endpoint must contain a finite real exact value.",
        );
      }
      return {
        ok: true,
        value: deepFreeze({
          kind: "finite",
          value: canonical.value,
          closed: endpoint.closed,
          witnesses: [],
        }),
      };
    };
    const lower = canonicalEndpoint(interval.lower);
    if (!lower.ok) return lower;
    const upper = canonicalEndpoint(interval.upper);
    if (!upper.ok) return upper;
    if (lower.value.kind === "infinity" && lower.value.sign !== -1) {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        "A lower infinite endpoint must be negative infinity.",
      );
    }
    if (upper.value.kind === "infinity" && upper.value.sign !== 1) {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        "An upper infinite endpoint must be positive infinity.",
      );
    }
    if (lower.value.kind === "finite" && upper.value.kind === "finite") {
      const order = exactOrder(
        session,
        lower.value.value.mathJson,
        upper.value.value.mathJson,
      );
      if (!order.ok) return order;
      if (order.value === "greater") {
        return fail(
          KERNEL_ERROR_CODES.invalidInput,
          "An interval lower endpoint cannot exceed its upper endpoint.",
        );
      }
      if (
        order.value === "equal" &&
        (!lower.value.closed || !upper.value.closed)
      ) {
        return fail(
          KERNEL_ERROR_CODES.invalidInput,
          "An interval with equal finite endpoints must be closed at both ends.",
        );
      }
    }
    return {
      ok: true,
      value: intervalLatexUnsafe({ lower: lower.value, upper: upper.value }),
    };
  } catch {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "The exact interval could not be safely inspected.",
    );
  }
}

interface BuiltRange {
  readonly interval: ExactIntervalDto;
  readonly projectiveIncluded: boolean;
}

function buildContinuousRange(
  value: RationalFunction,
  squareRootOutput: boolean,
  projectiveSecant: boolean,
  excludeZeroMetric: boolean,
  session: CasSession,
): KernelResult<BuiltRange> {
  if (excludeZeroMetric && polynomialDegree(value.numerator) < 0) {
    return fail(
      KERNEL_ERROR_CODES.emptyRealDomain,
      "Every line in this family gives a degenerate zero-valued metric.",
    );
  }
  const denominatorRoots = rationalRoots(value.denominator);
  if (denominatorRoots === null) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "The denominator roots could not be proven complete by the constrained range solver.",
    );
  }
  if (denominatorRoots.some((root) => root.numerator >= BigInt(0))) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "This continuous range profile contains a nonnegative pole.",
    );
  }

  const derivative = derivativeNumerator(value);
  if (derivative === null) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "The exact derivative exceeded the constrained polynomial profile.",
    );
  }
  const criticalRoots = rationalRoots(derivative);
  if (criticalRoots === null) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "The exact critical points are outside the constrained rational-root profile.",
    );
  }

  const candidates: Candidate[] = [];
  const addFiniteCandidate = (u: Fraction, note: string): KernelResult<true> => {
    if (u.numerator < BigInt(0)) return { ok: true, value: true };
    if (
      candidates.some(
        (candidate) =>
          !candidate.atInfinity &&
          candidate.u !== null &&
          fractionEqual(candidate.u, u),
      )
    ) {
      return { ok: true, value: true };
    }
    const evaluated = rationalFunctionEvaluate(value, u);
    if (evaluated === null) {
      return fail(
        KERNEL_ERROR_CODES.unsupportedExpression,
        "A critical point coincides with an excluded denominator zero.",
      );
    }
    if (squareRootOutput && evaluated.numerator < BigInt(0)) {
      return fail(
        KERNEL_ERROR_CODES.nonRealExpression,
        "A squared metric became negative on the proven real domain.",
      );
    }
    const excludedZero =
      excludeZeroMetric && evaluated.numerator === BigInt(0);
    candidates.push({
      value: evaluated,
      u,
      atInfinity: false,
      attained: !excludedZero,
      witnessKind: excludedZero ? "excluded" : "attained",
      note: excludedZero
        ? "This zero value is excluded because it represents a degenerate geometric configuration."
        : note,
    });
    return { ok: true, value: true };
  };

  const zeroCandidate = addFiniteCandidate(
    ZERO_FRACTION,
    "The endpoint is attained at m=0.",
  );
  if (!zeroCandidate.ok) return zeroCandidate;
  for (const root of criticalRoots) {
    const added = addFiniteCandidate(
      root,
      "The endpoint is attained at an exact stationary parameter.",
    );
    if (!added.ok) return added;
  }

  const limit = rationalFunctionInfinityLimit(value);
  if (limit === null) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "The two-sided projective limit could not be proven.",
    );
  }
  let projectiveIncluded = projectiveSecant;
  if (
    excludeZeroMetric &&
    limit.kind === "finite" &&
    limit.value.numerator === BigInt(0)
  ) {
    projectiveIncluded = false;
  }
  if (limit.kind === "finite") {
    if (squareRootOutput && limit.value.numerator < BigInt(0)) {
      return fail(
        KERNEL_ERROR_CODES.nonRealExpression,
        "The squared metric has a negative projective limit.",
      );
    }
    candidates.push({
      value: limit.value,
      u: null,
      atInfinity: true,
      attained: projectiveIncluded,
      witnessKind: projectiveIncluded ? "attained" : "limit",
      note: projectiveIncluded
        ? "The same value is attained by the real projective endpoint line (m→±∞)."
        : "The value is approached from both m→+∞ and m→-∞ but is not in the metric domain.",
    });
  }

  if (candidates.length === 0) {
    return fail(KERNEL_ERROR_CODES.emptyRealDomain, "The real secant domain is empty.");
  }
  let lowerValue = candidates[0].value;
  let upperValue = candidates[0].value;
  for (const candidate of candidates.slice(1)) {
    if (fractionCompare(candidate.value, lowerValue) < 0) {
      lowerValue = candidate.value;
    }
    if (fractionCompare(candidate.value, upperValue) > 0) {
      upperValue = candidate.value;
    }
  }

  let lower: ExactEndpointDto;
  let upper: ExactEndpointDto;
  if (limit.kind === "infinity" && limit.sign < 0) {
    if (squareRootOutput) {
      return fail(
        KERNEL_ERROR_CODES.nonRealExpression,
        "A nonnegative metric cannot have a negative-infinite squared limit.",
      );
    }
    lower = { kind: "infinity", sign: -1, closed: false };
  } else {
    const endpoint = finiteEndpoint(
      lowerValue,
      candidates,
      squareRootOutput,
      session,
    );
    if (!endpoint.ok) return endpoint;
    lower = endpoint.value;
  }
  if (limit.kind === "infinity" && limit.sign > 0) {
    upper = { kind: "infinity", sign: 1, closed: false };
  } else {
    const endpoint = finiteEndpoint(
      upperValue,
      candidates,
      squareRootOutput,
      session,
    );
    if (!endpoint.ok) return endpoint;
    upper = endpoint.value;
  }

  return {
    ok: true,
    value: {
      interval: deepFreeze({ lower, upper }),
      projectiveIncluded,
    },
  };
}

function buildHyperbolaChordRange(
  value: RationalFunction,
  squareRootOutput: boolean,
  pole: Fraction,
  session: CasSession,
): KernelResult<BuiltRange> {
  const zero = rationalFunctionEvaluate(value, ZERO_FRACTION);
  if (zero === null || zero.numerator !== BigInt(0)) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "The supported hyperbola chord profile must approach zero at its excluded tangent.",
    );
  }
  const denominatorAtPole = polynomialEvaluate(value.denominator, pole);
  const numeratorAtPole = polynomialEvaluate(value.numerator, pole);
  if (denominatorAtPole.numerator !== BigInt(0) || numeratorAtPole.numerator <= BigInt(0)) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "The supported hyperbola chord profile requires a genuine positive pole.",
    );
  }
  const lowerExpression = endpointExpression(
    ZERO_FRACTION,
    squareRootOutput,
  );
  if (lowerExpression === null) {
    return fail(KERNEL_ERROR_CODES.unsupportedExpression, "Cannot represent zero endpoint.");
  }
  const lowerValue = exactExpression(session, lowerExpression);
  if (!lowerValue.ok) return lowerValue;
  const mZero = exactExpression(session, 0);
  if (!mZero.ok) return mZero;
  const lower: ExactEndpointDto = deepFreeze({
    kind: "finite",
    value: lowerValue.value,
    closed: false,
    witnesses: [
      {
        kind: "excluded",
        parameters: { m: mZero.value },
        note: "m=0 is a tangent, so the zero-length limit is excluded from the secant domain.",
      },
    ],
  });
  return {
    ok: true,
    value: {
      interval: deepFreeze({
        lower,
        upper: { kind: "infinity", sign: 1, closed: false },
      }),
      projectiveIncluded: true,
    },
  };
}

function buildConstantHyperbolaRange(
  value: RationalFunction,
  pole: Fraction,
  squareRootOutput: boolean,
  excludeDegenerate: boolean,
  session: CasSession,
): KernelResult<BuiltRange> {
  const trial = fractionEqual(pole, ONE_FRACTION)
    ? fraction(BigInt(2))!
    : ONE_FRACTION;
  const evaluated = rationalFunctionEvaluate(value, trial);
  if (evaluated === null || (squareRootOutput && evaluated.numerator < BigInt(0))) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "The constant hyperbola metric has no valid exact witness.",
    );
  }
  if (excludeDegenerate && evaluated.numerator === BigInt(0)) {
    return fail(
      KERNEL_ERROR_CODES.emptyRealDomain,
      "Every real secant in this family produces a degenerate triangle.",
    );
  }
  const candidate: Candidate = {
    value: evaluated,
    u: trial,
    atInfinity: false,
    attained: true,
    witnessKind: "attained",
    note: "The constant value is attained by a finite secant parameter.",
  };
  const endpoint = finiteEndpoint(
    evaluated,
    [candidate],
    squareRootOutput,
    session,
  );
  if (!endpoint.ok) return endpoint;
  return {
    ok: true,
    value: {
      interval: deepFreeze({ lower: endpoint.value, upper: endpoint.value }),
      projectiveIncluded: true,
    },
  };
}

function rangeIntermediates(
  setup: LineConicExpressionSetup,
  expression: ExactValueDto,
  discriminant: ExactValueDto,
  session: CasSession,
): KernelResult<readonly SolutionStepDto[]> {
  const coefficient = exactExpression(session, setup.A);
  if (!coefficient.ok) return coefficient;
  return {
    ok: true,
    value: deepFreeze([
      {
        id: "line-conic-coefficient",
        title: "Line-conic equation",
        explanation: "Substitution produces a quadratic in the independent line coordinate.",
        value: coefficient.value,
      },
      {
        id: "real-secant-domain",
        title: "Real secant domain",
        explanation: "The exact discriminant and all denominator zeros define the feasible parameter domain.",
        value: discriminant,
      },
      {
        id: "metric-expression",
        title: "Metric from Vieta relations",
        explanation: "The requested metric is derived from the same exact intersection coefficients.",
        value: expression,
      },
    ]),
  };
}

export function rangeOverLineFamily(
  request: RangeOverLineFamilyRequest,
  session = new CasSession(),
): KernelResult<AnalyticRangeSolutionDto> {
  const canonical = canonicalSetupInput(
    { conic: request?.conic, line: request?.line },
    session,
  );
  if (!canonical.ok) return canonical;
  if (!isRecord(request.metric) || typeof request.metric.kind !== "string") {
    return fail(KERNEL_ERROR_CODES.invalidInput, "metric must be a supported metric object.");
  }
  if (
    request.metric.kind !== "dot-product" &&
    request.metric.kind !== "chord-length" &&
    request.metric.kind !== "chord-length-squared" &&
    request.metric.kind !== "triangle-area"
  ) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "metric.kind is not supported.");
  }
  const metricRecord = request.metric as unknown as Record<string, unknown>;
  const metricKind = request.metric.kind;
  const allowedMetricKeys = metricKind === "dot-product"
    ? ["kind", "vertex"]
    : metricKind === "triangle-area"
      ? ["kind", "vertex", "excludeDegenerate"]
      : ["kind"];
  if (!hasOnlyKeys(metricRecord, allowedMetricKeys)) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "metric contains fields that are not allowed for its kind.",
    );
  }
  if (
    (metricKind === "dot-product" || metricKind === "triangle-area") &&
    (!Array.isArray(request.metric.vertex) || request.metric.vertex.length !== 2)
  ) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "This metric requires a two-coordinate vertex.");
  }
  if (
    metricKind === "triangle-area" &&
    "excludeDegenerate" in metricRecord &&
    typeof metricRecord.excludeDegenerate !== "boolean"
  ) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "metric.excludeDegenerate must be a boolean when provided.",
    );
  }

  let metric = request.metric;
  if (metric.kind === "dot-product" || metric.kind === "triangle-area") {
    const first = exactConstant(session, metric.vertex[0], "metric.vertex.x");
    if (!first.ok) return first;
    const second = exactConstant(session, metric.vertex[1], "metric.vertex.y");
    if (!second.ok) return second;
    metric = {
      ...metric,
      vertex: [first.value.expression, second.value.expression],
    };
  }

  const profile = rangeProfile(canonical.value, session);
  if (!profile.ok) return profile;
  const expressions = metricExpressions(canonical.value.setup, metric);
  const rational = evenRationalFunction(expressions.rangeBase);
  if (rational === null) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "The metric is not an even rational function of u=m² in the supported proof profile.",
    );
  }
  const display = exactExpression(session, expressions.display);
  if (!display.ok) return display;
  const discriminant = exactExpression(
    session,
    canonical.value.setup.discriminant,
  );
  if (!discriminant.ok) return discriminant;
  const exclusions = denominatorExclusionDtos(canonical.value.setup, session);
  if (!exclusions.ok) return exclusions;

  let ranged: KernelResult<BuiltRange>;
  if (profile.value.kind === "hyperbola") {
    const pole = positivePoleInU(canonical.value.setup);
    if (pole === null || exclusions.value.length !== 2) {
      return fail(
        KERNEL_ERROR_CODES.unsupportedExpression,
        "The hyperbola profile requires two exact finite denominator exclusions.",
      );
    }
    const derivative = derivativeNumerator(rational);
    if (derivative === null) {
      return fail(KERNEL_ERROR_CODES.unsupportedExpression, "Cannot prove the hyperbola derivative.");
    }
    if (polynomialDegree(derivative) < 0) {
      ranged = buildConstantHyperbolaRange(
        rational,
        pole,
        expressions.squareRootOutput,
        metric.kind === "triangle-area" && metric.excludeDegenerate === true,
        session,
      );
    } else if (
      metric.kind === "chord-length" ||
      metric.kind === "chord-length-squared"
    ) {
      ranged = buildHyperbolaChordRange(
        rational,
        expressions.squareRootOutput,
        pole,
        session,
      );
    } else {
      return fail(
        KERNEL_ERROR_CODES.unsupportedExpression,
        "This nonconstant hyperbola metric does not have a complete constrained interval proof.",
      );
    }
  } else {
    ranged = buildContinuousRange(
      rational,
      expressions.squareRootOutput,
      profile.value.projectiveSecant,
      metric.kind === "triangle-area" && metric.excludeDegenerate === true,
      session,
    );
  }
  if (!ranged.ok) return ranged;

  const steps = rangeIntermediates(
    canonical.value.setup,
    display.value,
    discriminant.value,
    session,
  );
  if (!steps.ok) return steps;
  const domain = deepFreeze({
    parameter: "m" as const,
    parameterMeaning:
      canonical.value.orientation === "xFromY"
        ? ("inverse-slope" as const)
        : ("slope" as const),
    discriminantConstraint: `${discriminant.value.latex} > 0`,
    denominatorExclusions: exclusions.value,
    projectiveEndpoint: {
      line:
        canonical.value.orientation === "xFromY"
          ? ("horizontal" as const)
          : ("vertical" as const),
      included: ranged.value.projectiveIncluded,
      hasRealGeometryWitness: profile.value.projectiveSecant,
      note: ranged.value.projectiveIncluded
        ? "The m→+∞ and m→-∞ limits represent the same real projective secant line."
        : "The projective endpoint is not an admissible nondegenerate metric witness.",
    },
  });
  const proof = deepFreeze({
    profile: "centered-axis-aligned-even-rational-v1" as const,
    checkedCriticalPoints: true,
    checkedDomainBoundaries: true,
    checkedPoles: true,
    checkedPositiveInfinity: true as const,
    checkedNegativeInfinity: true as const,
    exactNotSampled: true as const,
  });
  const interval = ranged.value.interval;
  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: 1,
      metric: metric.kind,
      expression: display.value,
      interval,
      intervalLatex: intervalLatexUnsafe(interval),
      domain,
      proof,
      intermediates: steps.value,
      provenance: {
        kernel: "analytic",
        operation: "rangeOverLineFamily",
        sourceRevision: SOURCE_REVISION,
      },
    }),
  };
}

function mathJsonUsesOnlyFixedParameter(value: MathJsonExpr): boolean {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return true;
  }
  if (typeof value === "string") return value === "m";
  if (Array.isArray(value)) {
    if (typeof value[0] !== "string") return false;
    return value.slice(1).every(mathJsonUsesOnlyFixedParameter);
  }
  return false;
}

export function isConstantInParameter(
  expression: MathJsonExpr,
  session = new CasSession(),
): KernelResult<ConstantInParameterDto> {
  const boxed = session.boxMathJson(expression);
  if (!boxed.ok) return boxed;
  if (!mathJsonUsesOnlyFixedParameter(boxed.value)) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "Only the fixed application parameter m is allowed in constant checks.",
    );
  }
  const rational = parseRationalFunctionInM(boxed.value);
  if (rational === null) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "The expression is outside the constrained rational constant-check profile.",
    );
  }
  const derivative = derivativeNumerator(rational);
  if (derivative === null) {
    return fail(
      KERNEL_ERROR_CODES.unsupportedExpression,
      "The exact derivative exceeded the constrained profile.",
    );
  }
  const constant = polynomialDegree(derivative) < 0;
  let value: KernelResult<ExactValueDto>;
  if (constant) {
    const evaluated = rationalFunctionEvaluate(rational, ZERO_FRACTION);
    if (evaluated === null) {
      return fail(
        KERNEL_ERROR_CODES.unsupportedExpression,
        "The constant expression is undefined at its proof witness.",
      );
    }
    const exact = fractionMathJson(evaluated);
    if (exact === null) {
      return fail(
        KERNEL_ERROR_CODES.unsupportedExpression,
        "The constant exceeds the bounded JSON integer representation.",
      );
    }
    value = exactExpression(session, exact);
  } else {
    value = exactExpression(session, boxed.value);
  }
  if (!value.ok) return value;
  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: 1,
      parameter: "m",
      constant,
      value: value.value,
    }),
  };
}

export function toFiniteApprox(
  expression: MathJsonExpr,
  session = new CasSession(),
): KernelResult<number> {
  const exact = exactExpression(session, expression);
  if (!exact.ok) return exact;
  return exact.value.approx !== null && Number.isFinite(exact.value.approx)
    ? { ok: true, value: exact.value.approx }
    : fail(
        KERNEL_ERROR_CODES.exactToNumberFailed,
        "The exact expression has no safe finite JavaScript approximation.",
      );
}

export function isReadableExact(
  expression: MathJsonExpr,
  session = new CasSession(),
): KernelResult<boolean> {
  return session.isReadableExactMathJson(expression);
}

export interface CentralConicSlopeProductOptions {
  readonly a: MathJsonExpr;
  readonly b: MathJsonExpr;
  readonly center: readonly [MathJsonExpr, MathJsonExpr];
  readonly point: readonly [MathJsonExpr, MathJsonExpr];
  /** Optional actual moving point; omitted means the exact invariant theorem. */
  readonly movingPoint?: readonly [MathJsonExpr, MathJsonExpr];
}

function positiveExact(
  session: CasSession,
  value: ExactConstant,
  label: string,
): KernelResult<true> {
  const order = exactOrder(session, value.expression, 0);
  if (!order.ok) return order;
  return order.value === "greater"
    ? { ok: true, value: true }
    : fail(KERNEL_ERROR_CODES.invalidInput, `${label} must be positive.`);
}

function ellipsePointCheck(
  session: CasSession,
  a: MathJsonExpr,
  b: MathJsonExpr,
  center: readonly [MathJsonExpr, MathJsonExpr],
  point: readonly [MathJsonExpr, MathJsonExpr],
  label: string,
): KernelResult<true> {
  const normalized = ops.add(
    ops.div(ops.square(ops.sub(point[0], center[0])), ops.square(a)),
    ops.div(ops.square(ops.sub(point[1], center[1])), ops.square(b)),
  );
  const onCurve = exactEqual(session, normalized, 1);
  if (!onCurve.ok) return onCurve;
  return onCurve.value
    ? { ok: true, value: true }
    : fail(KERNEL_ERROR_CODES.invalidInput, `${label} must lie on the ellipse.`);
}

export function centralConicSlopeProduct(
  options: CentralConicSlopeProductOptions,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  if (
    !isRecord(options) ||
    !Array.isArray(options.center) ||
    options.center.length !== 2 ||
    !Array.isArray(options.point) ||
    options.point.length !== 2 ||
    (options.movingPoint !== undefined &&
      (!Array.isArray(options.movingPoint) || options.movingPoint.length !== 2))
  ) {
    return fail(KERNEL_ERROR_CODES.invalidInput, "Central-conic options are malformed.");
  }
  const a = exactConstant(session, options.a, "a");
  if (!a.ok) return a;
  const b = exactConstant(session, options.b, "b");
  if (!b.ok) return b;
  const positiveA = positiveExact(session, a.value, "a");
  if (!positiveA.ok) return positiveA;
  const positiveB = positiveExact(session, b.value, "b");
  if (!positiveB.ok) return positiveB;

  const constants: ExactConstant[] = [];
  for (const [value, label] of [
    [options.center[0], "center.x"],
    [options.center[1], "center.y"],
    [options.point[0], "point.x"],
    [options.point[1], "point.y"],
  ] as const) {
    const canonical = exactConstant(session, value, label);
    if (!canonical.ok) return canonical;
    constants.push(canonical.value);
  }
  const center = [constants[0].expression, constants[1].expression] as const;
  const point = [constants[2].expression, constants[3].expression] as const;
  const fixedPoint = ellipsePointCheck(
    session,
    a.value.expression,
    b.value.expression,
    center,
    point,
    "point",
  );
  if (!fixedPoint.ok) return fixedPoint;

  if (options.movingPoint === undefined) {
    return exactExpression(
      session,
      ops.div(ops.neg(ops.square(b.value.expression)), ops.square(a.value.expression)),
    );
  }

  const movingX = exactConstant(session, options.movingPoint[0], "movingPoint.x");
  if (!movingX.ok) return movingX;
  const movingY = exactConstant(session, options.movingPoint[1], "movingPoint.y");
  if (!movingY.ok) return movingY;
  const moving = [movingX.value.expression, movingY.value.expression] as const;
  const movingOnCurve = ellipsePointCheck(
    session,
    a.value.expression,
    b.value.expression,
    center,
    moving,
    "movingPoint",
  );
  if (!movingOnCurve.ok) return movingOnCurve;
  const opposite = [
    ops.sub(ops.mul(2, center[0]), moving[0]),
    ops.sub(ops.mul(2, center[1]), moving[1]),
  ] as const;
  const firstDenominator = ops.sub(moving[0], point[0]);
  const secondDenominator = ops.sub(opposite[0], point[0]);
  for (const denominator of [firstDenominator, secondDenominator]) {
    const order = exactOrder(session, denominator, 0);
    if (!order.ok) return order;
    if (order.value === "equal") {
      return fail(
        KERNEL_ERROR_CODES.undefinedSlope,
        "One of the two exact line slopes is vertical and therefore undefined.",
      );
    }
  }
  return exactExpression(
    session,
    ops.mul(
      ops.div(ops.sub(moving[1], point[1]), firstDenominator),
      ops.div(ops.sub(opposite[1], point[1]), secondDenominator),
    ),
  );
}

export function eccentricityRangeFromFocalRatio(
  input: MathJsonExpr,
  session = new CasSession(),
): KernelResult<EccentricityRangeSolutionDto> {
  const k = exactConstant(session, input, "k");
  if (!k.ok) return k;
  const order = exactOrder(session, k.value.expression, 1);
  if (!order.ok) return order;
  if (order.value !== "greater") {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "The focal-distance ratio k must be greater than 1.",
    );
  }
  const upperExpression = ops.div(
    ops.add(k.value.expression, 1),
    ops.sub(k.value.expression, 1),
  );
  const lower = exactExpression(session, 1);
  if (!lower.ok) return lower;
  const upper = exactExpression(session, upperExpression);
  if (!upper.ok) return upper;
  const interval: ExactIntervalDto = deepFreeze({
    lower: {
      kind: "finite",
      value: lower.value,
      closed: false,
      witnesses: [
        {
          kind: "limit",
          parameters: {},
          note: "Hyperbola eccentricity approaches 1 but never equals 1.",
        },
      ],
    },
    upper: {
      kind: "finite",
      value: upper.value,
      closed: true,
      witnesses: [
        {
          kind: "attained",
          parameters: { e: upper.value },
          note: "Equality is attained when the shorter focal radius reaches c-a.",
        },
      ],
    },
  });
  const derivation: readonly SolutionStepDto[] = deepFreeze([
    {
      id: "focal-radius-difference",
      title: "Use the hyperbola focal-radius identity",
      explanation: "The right branch satisfies |PF1|-|PF2|=2a.",
      value: null,
    },
    {
      id: "eccentricity-upper-bound",
      title: "Apply the minimum shorter focal radius",
      explanation: "Combining |PF2|=2a/(k-1) with |PF2|≥c-a gives the exact upper endpoint.",
      value: upper.value,
    },
  ]);
  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: 1,
      k: k.value.dto,
      interval,
      intervalLatex: intervalLatexUnsafe(interval),
      derivation,
      provenance: {
        kernel: "analytic",
        operation: "eccentricityRangeFromFocalRatio",
        sourceRevision: SOURCE_REVISION,
      },
    }),
  };
}
