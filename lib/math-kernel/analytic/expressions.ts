/**
 * Renderer- and CAS-independent MathJSON builders rewritten from Edulab
 * analytic_kernel.py at cf0bc1d68b4ea64307f57d7fac64667e6a3148cc
 * (Apache-2.0). See third_party/edulab for attribution.
 */

import type { Quadratic2D } from "../conics/model";
import {
  findNonExactNumericAtomPath,
  validateMathJson,
} from "../shared/mathjson";
import type { MathJsonExpr } from "../shared/types";
import type {
  EndpointSymmetricExpressions,
  LineConicExpressionSetup,
  LineFamily,
} from "./types";

function assertExactMathJson(value: MathJsonExpr): void {
  const validated = validateMathJson(value);
  if (!validated.ok) {
    throw new TypeError(`Invalid exact MathJSON at ${validated.error.path ?? "$"}.`);
  }
  const inexactPath = findNonExactNumericAtomPath(validated.value);
  if (inexactPath !== null) {
    throw new TypeError(
      `Exact expression builders accept safe-integer number atoms only; use explicit Rational/Divide MathJSON for fractions (${inexactPath}).`,
    );
  }
}

function assertExactMathJsonList(values: readonly MathJsonExpr[]): void {
  for (const value of values) assertExactMathJson(value);
}

function add(...values: MathJsonExpr[]): MathJsonExpr {
  assertExactMathJsonList(values);
  const kept = values.filter((value) => value !== 0);
  if (kept.length === 0) return 0;
  if (kept.length === 1) return kept[0];
  return ["Add", ...kept];
}

function neg(value: MathJsonExpr): MathJsonExpr {
  assertExactMathJson(value);
  if (typeof value === "number") return -value;
  return ["Negate", value];
}

function sub(left: MathJsonExpr, right: MathJsonExpr): MathJsonExpr {
  return add(left, neg(right));
}

function mul(...values: MathJsonExpr[]): MathJsonExpr {
  assertExactMathJsonList(values);
  if (values.some((value) => value === 0)) return 0;
  // Keep integer factors separate. Eager JavaScript multiplication can exceed
  // Number.MAX_SAFE_INTEGER or overflow to Infinity before the CAS boundary.
  const kept = values.filter((value) => value !== 1);
  if (kept.length === 0) return 1;
  if (kept.length === 1) return kept[0];
  return ["Multiply", ...kept];
}

function div(left: MathJsonExpr, right: MathJsonExpr): MathJsonExpr {
  assertExactMathJsonList([left, right]);
  if (right === 0) throw new RangeError("Exact expression division by literal zero is invalid.");
  return ["Divide", left, right];
}

function square(value: MathJsonExpr): MathJsonExpr {
  assertExactMathJson(value);
  if (value === 0 || value === 1 || value === -1) return Math.abs(value);
  return ["Power", value, 2];
}

function sqrt(value: MathJsonExpr): MathJsonExpr {
  assertExactMathJson(value);
  return ["Sqrt", value];
}

function abs(value: MathJsonExpr): MathJsonExpr {
  assertExactMathJson(value);
  if (typeof value === "number") return Math.abs(value);
  return ["Abs", value];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

interface Fraction {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

type Polynomial = ReadonlyMap<number, Fraction>;

function bigintAbs(value: bigint): bigint {
  return value < BigInt(0) ? -value : value;
}

function gcd(left: bigint, right: bigint): bigint {
  let a = bigintAbs(left);
  let b = bigintAbs(right);
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a === BigInt(0) ? BigInt(1) : a;
}

function lcm(left: bigint, right: bigint): bigint {
  return bigintAbs((left / gcd(left, right)) * right);
}

function fraction(numerator: bigint, denominator = BigInt(1)): Fraction | null {
  if (denominator === BigInt(0)) return null;
  let n = numerator;
  let d = denominator;
  if (d < BigInt(0)) {
    n = -n;
    d = -d;
  }
  const divisor = gcd(n, d);
  return { numerator: n / divisor, denominator: d / divisor };
}

const ZERO_FRACTION = fraction(BigInt(0))!;

function fractionAdd(left: Fraction, right: Fraction): Fraction {
  return fraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  )!;
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

function constantPolynomial(value: Fraction): Polynomial {
  return new Map(value.numerator === BigInt(0) ? [] : [[0, value]]);
}

function variablePolynomial(): Polynomial {
  return new Map([[1, fraction(BigInt(1))!]]);
}

function polynomialCoefficient(polynomial: Polynomial, degree: number): Fraction {
  return polynomial.get(degree) ?? ZERO_FRACTION;
}

function polynomialAdd(left: Polynomial, right: Polynomial): Polynomial {
  const output = new Map<number, Fraction>();
  const degrees = new Set([...left.keys(), ...right.keys()]);
  for (const degree of degrees) {
    const value = fractionAdd(
      polynomialCoefficient(left, degree),
      polynomialCoefficient(right, degree),
    );
    if (value.numerator !== BigInt(0)) output.set(degree, value);
  }
  return output;
}

function polynomialNeg(value: Polynomial): Polynomial {
  return new Map(
    [...value].map(([degree, coefficient]) => [
      degree,
      { numerator: -coefficient.numerator, denominator: coefficient.denominator },
    ]),
  );
}

function polynomialSub(left: Polynomial, right: Polynomial): Polynomial {
  return polynomialAdd(left, polynomialNeg(right));
}

function polynomialDegree(value: Polynomial): number {
  return value.size === 0 ? -1 : Math.max(...value.keys());
}

function polynomialScale(value: Polynomial, scalar: Fraction): Polynomial {
  const output = new Map<number, Fraction>();
  for (const [degree, coefficient] of value) {
    const scaled = fractionMul(coefficient, scalar);
    if (scaled.numerator !== BigInt(0)) output.set(degree, scaled);
  }
  return output;
}

function polynomialShift(value: Polynomial, degree: number): Polynomial {
  return new Map(
    [...value].map(([entryDegree, coefficient]) => [
      entryDegree + degree,
      coefficient,
    ]),
  );
}

function polynomialDivide(
  numerator: Polynomial,
  denominator: Polynomial,
): { readonly quotient: Polynomial; readonly remainder: Polynomial } | null {
  const denominatorDegree = polynomialDegree(denominator);
  if (denominatorDegree < 0) return null;
  const denominatorLeading = polynomialCoefficient(
    denominator,
    denominatorDegree,
  );
  let remainder: Polynomial = new Map(numerator);
  let quotient: Polynomial = new Map();
  let guard = 0;

  while (polynomialDegree(remainder) >= denominatorDegree) {
    if (guard++ > 16) return null;
    const remainderDegree = polynomialDegree(remainder);
    const termDegree = remainderDegree - denominatorDegree;
    const termCoefficient = fractionDiv(
      polynomialCoefficient(remainder, remainderDegree),
      denominatorLeading,
    );
    if (termCoefficient === null) return null;
    quotient = polynomialAdd(
      quotient,
      new Map([[termDegree, termCoefficient]]),
    );
    remainder = polynomialSub(
      remainder,
      polynomialShift(
        polynomialScale(denominator, termCoefficient),
        termDegree,
      ),
    );
  }

  return { quotient, remainder };
}

function polynomialMul(left: Polynomial, right: Polynomial): Polynomial | null {
  const output = new Map<number, Fraction>();
  for (const [leftDegree, leftCoefficient] of left) {
    for (const [rightDegree, rightCoefficient] of right) {
      const degree = leftDegree + rightDegree;
      if (degree > 8) return null;
      const next = fractionAdd(
        polynomialCoefficient(output, degree),
        fractionMul(leftCoefficient, rightCoefficient),
      );
      if (next.numerator === BigInt(0)) output.delete(degree);
      else output.set(degree, next);
    }
  }
  return output;
}

function integerFromMathJson(value: MathJsonExpr): bigint | null {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? BigInt(value)
    : null;
}

function parseRationalConstant(value: MathJsonExpr): Fraction | null {
  const integer = integerFromMathJson(value);
  if (integer !== null) return fraction(integer);
  if (!Array.isArray(value) || typeof value[0] !== "string") return null;
  const operator = value[0];
  if (operator === "Negate" && value.length === 2) {
    const operand = parseRationalConstant(value[1]);
    return operand === null
      ? null
      : { numerator: -operand.numerator, denominator: operand.denominator };
  }
  if ((operator === "Divide" || operator === "Rational") && value.length === 3) {
    const left = parseRationalConstant(value[1]);
    const right = parseRationalConstant(value[2]);
    return left === null || right === null ? null : fractionDiv(left, right);
  }
  if (operator === "Add") {
    let output = ZERO_FRACTION;
    for (const operand of value.slice(1)) {
      const parsed = parseRationalConstant(operand);
      if (parsed === null) return null;
      output = fractionAdd(output, parsed);
    }
    return output;
  }
  if (operator === "Subtract" && value.length === 3) {
    const left = parseRationalConstant(value[1]);
    const right = parseRationalConstant(value[2]);
    return left === null || right === null
      ? null
      : fractionAdd(left, { numerator: -right.numerator, denominator: right.denominator });
  }
  if (operator === "Multiply") {
    let output = fraction(BigInt(1))!;
    for (const operand of value.slice(1)) {
      const parsed = parseRationalConstant(operand);
      if (parsed === null) return null;
      output = fractionMul(output, parsed);
    }
    return output;
  }
  if (operator === "Power" && value.length === 3) {
    const base = parseRationalConstant(value[1]);
    const exponent = integerFromMathJson(value[2]);
    if (base === null || exponent === null || exponent < BigInt(0) || exponent > BigInt(8)) return null;
    let output = fraction(BigInt(1))!;
    for (let index = BigInt(0); index < exponent; index += BigInt(1)) output = fractionMul(output, base);
    return output;
  }
  return null;
}

function parsePolynomial(value: MathJsonExpr, symbol: string): Polynomial | null {
  if (value === symbol) return variablePolynomial();
  const constant = parseRationalConstant(value);
  if (constant !== null) return constantPolynomial(constant);
  if (!Array.isArray(value) || typeof value[0] !== "string") return null;
  const operator = value[0];
  if (operator === "Negate" && value.length === 2) {
    const operand = parsePolynomial(value[1], symbol);
    return operand === null ? null : polynomialNeg(operand);
  }
  if (operator === "Add") {
    let output: Polynomial = new Map();
    for (const operand of value.slice(1)) {
      const parsed = parsePolynomial(operand, symbol);
      if (parsed === null) return null;
      output = polynomialAdd(output, parsed);
    }
    return output;
  }
  if (operator === "Subtract" && value.length === 3) {
    const left = parsePolynomial(value[1], symbol);
    const right = parsePolynomial(value[2], symbol);
    return left === null || right === null
      ? null
      : polynomialAdd(left, polynomialNeg(right));
  }
  if (operator === "Multiply") {
    let output: Polynomial = constantPolynomial(fraction(BigInt(1))!);
    for (const operand of value.slice(1)) {
      const parsed = parsePolynomial(operand, symbol);
      if (parsed === null) return null;
      const multiplied = polynomialMul(output, parsed);
      if (multiplied === null) return null;
      output = multiplied;
    }
    return output;
  }
  if (operator === "Power" && value.length === 3) {
    const base = parsePolynomial(value[1], symbol);
    const exponent = integerFromMathJson(value[2]);
    if (base === null || exponent === null || exponent < BigInt(0) || exponent > BigInt(8)) return null;
    let output: Polynomial = constantPolynomial(fraction(BigInt(1))!);
    for (let index = BigInt(0); index < exponent; index += BigInt(1)) {
      const multiplied = polynomialMul(output, base);
      if (multiplied === null) return null;
      output = multiplied;
    }
    return output;
  }
  if (operator === "Divide" && value.length === 3) {
    const numerator = parsePolynomial(value[1], symbol);
    const denominator = parseRationalConstant(value[2]);
    if (numerator === null || denominator === null || denominator.numerator === BigInt(0)) return null;
    const output = new Map<number, Fraction>();
    for (const [degree, coefficient] of numerator) {
      const divided = fractionDiv(coefficient, denominator);
      if (divided === null) return null;
      output.set(degree, divided);
    }
    return output;
  }
  return null;
}

function safeNumber(value: bigint): number | null {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function fractionToMathJson(value: Fraction): MathJsonExpr | null {
  const numerator = safeNumber(value.numerator);
  const denominator = safeNumber(value.denominator);
  if (numerator === null || denominator === null) return null;
  return denominator === 1 ? numerator : ["Divide", numerator, denominator];
}

function polynomialToMathJson(
  polynomial: Polynomial,
  symbol: string,
): MathJsonExpr | null {
  const terms: MathJsonExpr[] = [];
  const degrees = [...polynomial.keys()].sort((left, right) => right - left);
  for (const degree of degrees) {
    const coefficient = fractionToMathJson(
      polynomialCoefficient(polynomial, degree),
    );
    if (coefficient === null) return null;
    if (degree === 0) {
      terms.push(coefficient);
      continue;
    }
    const power: MathJsonExpr =
      degree === 1 ? symbol : ["Power", symbol, degree];
    terms.push(
      coefficient === 1
        ? power
        : coefficient === -1
          ? neg(power)
          : mul(coefficient, power),
    );
  }
  return add(...terms);
}

function polynomialQuotientExpression(
  numeratorExpression: MathJsonExpr,
  denominatorExpression: MathJsonExpr,
  symbol: string,
): MathJsonExpr | null {
  const numerator = parsePolynomial(numeratorExpression, symbol);
  const denominator = parsePolynomial(denominatorExpression, symbol);
  if (numerator === null || denominator === null) return null;
  const divided = polynomialDivide(numerator, denominator);
  if (divided === null) return null;
  const quotient = polynomialToMathJson(divided.quotient, symbol);
  const remainder = polynomialToMathJson(divided.remainder, symbol);
  const divisor = polynomialToMathJson(denominator, symbol);
  if (quotient === null || remainder === null || divisor === null) return null;
  return polynomialDegree(divided.remainder) < 0
    ? quotient
    : add(quotient, div(remainder, divisor));
}

function provablyPositivePolynomial(
  expression: MathJsonExpr,
  symbol: string,
): boolean {
  const polynomial = parsePolynomial(expression, symbol);
  if (polynomial === null) return false;
  const degree = polynomialDegree(polynomial);
  if (degree === 0) {
    return polynomialCoefficient(polynomial, 0).numerator > BigInt(0);
  }
  if (degree !== 2) return false;

  const a = polynomialCoefficient(polynomial, 2);
  const b = polynomialCoefficient(polynomial, 1);
  const c = polynomialCoefficient(polynomial, 0);
  if (a.numerator <= BigInt(0)) return false;
  const discriminant = fractionAdd(
    fractionMul(b, b),
    fraction(
      -BigInt(4) * a.numerator * c.numerator,
      a.denominator * c.denominator,
    )!,
  );
  return discriminant.numerator < BigInt(0);
}

function polynomialToIntegerMathJson(
  polynomial: Polynomial,
  denominatorLcm: bigint,
  commonDivisor: bigint,
  sign: bigint,
  symbol: string,
): MathJsonExpr | null {
  const terms: MathJsonExpr[] = [];
  const degrees = [...polynomial.keys()].sort((left, right) => right - left);
  for (const degree of degrees) {
    const coefficient = polynomialCoefficient(polynomial, degree);
    const scaled =
      sign *
      (coefficient.numerator * (denominatorLcm / coefficient.denominator)) /
      commonDivisor;
    const numeric = safeNumber(scaled);
    if (numeric === null) return null;
    if (numeric === 0) continue;
    if (degree === 0) {
      terms.push(numeric);
      continue;
    }
    const power: MathJsonExpr = degree === 1 ? symbol : ["Power", symbol, degree];
    terms.push(numeric === 1 ? power : numeric === -1 ? neg(power) : mul(numeric, power));
  }
  return add(...terms);
}

function clearCommonRationalScale(
  values: readonly [MathJsonExpr, MathJsonExpr, MathJsonExpr],
  symbol: string,
): readonly [MathJsonExpr, MathJsonExpr, MathJsonExpr] {
  const polynomials = values.map((value) => parsePolynomial(value, symbol));
  if (polynomials.some((value) => value === null)) return values;
  const parsed = polynomials as [Polynomial, Polynomial, Polynomial];
  const coefficients = parsed.flatMap((polynomial) => [...polynomial.values()]);
  let denominatorLcm = BigInt(1);
  for (const coefficient of coefficients) denominatorLcm = lcm(denominatorLcm, coefficient.denominator);
  const integerCoefficients = coefficients.map(
    (coefficient) => coefficient.numerator * (denominatorLcm / coefficient.denominator),
  );
  let commonDivisor = BigInt(0);
  for (const coefficient of integerCoefficients) commonDivisor = gcd(commonDivisor, coefficient);
  if (commonDivisor === BigInt(0)) commonDivisor = BigInt(1);
  const firstNonZero = integerCoefficients.find((value) => value !== BigInt(0));
  const sign = firstNonZero !== undefined && firstNonZero < BigInt(0)
    ? -BigInt(1)
    : BigInt(1);
  const output = parsed.map((polynomial) =>
    polynomialToIntegerMathJson(
      polynomial,
      denominatorLcm,
      commonDivisor,
      sign,
      symbol,
    ),
  );
  return output.some((value) => value === null)
    ? values
    : output as [MathJsonExpr, MathJsonExpr, MathJsonExpr];
}

/** @internal Use setupLineConicIntersection() at the public server boundary. */
export function lineConicCoefficientExpressions(
  conic: Quadratic2D<MathJsonExpr>,
  line: LineFamily<MathJsonExpr>,
): LineConicExpressionSetup {
  if (line.orientation !== "xFromY" && line.orientation !== "yFromX") {
    throw new TypeError("The exact line-family orientation must be xFromY or yFromX.");
  }
  if (!Array.isArray(line.through) || line.through.length !== 2) {
    throw new TypeError("The exact line-family anchor must contain two coordinates.");
  }
  if (line.parameter !== undefined && line.parameter !== "m") {
    throw new TypeError('The exact line-family parameter must be the fixed symbol "m".');
  }
  assertExactMathJsonList([
    conic.x2,
    conic.xy,
    conic.y2,
    conic.x,
    conic.y,
    conic.constant,
    line.through[0],
    line.through[1],
  ]);
  const parameter = "m";
  const m: MathJsonExpr = parameter;
  const [x0, y0] = line.through;
  const intercept = line.orientation === "xFromY"
    ? sub(x0, mul(m, y0))
    : sub(y0, mul(m, x0));

  const raw: readonly [MathJsonExpr, MathJsonExpr, MathJsonExpr] =
    line.orientation === "xFromY"
      ? [
          add(mul(conic.x2, square(m)), mul(conic.xy, m), conic.y2),
          add(mul(2, conic.x2, m, intercept), mul(conic.xy, intercept), mul(conic.x, m), conic.y),
          add(mul(conic.x2, square(intercept)), mul(conic.x, intercept), conic.constant),
        ]
      : [
          add(mul(conic.y2, square(m)), mul(conic.xy, m), conic.x2),
          add(mul(2, conic.y2, m, intercept), mul(conic.xy, intercept), mul(conic.y, m), conic.x),
          add(mul(conic.y2, square(intercept)), mul(conic.y, intercept), conic.constant),
        ];
  const [A, B, C] = clearCommonRationalScale(raw, parameter);
  const discriminant = sub(square(B), mul(4, A, C));
  const firstSum = div(neg(B), A);
  const firstProduct = div(C, A);
  return deepFreeze({
    orientation: line.orientation,
    parameter,
    intercept,
    A,
    B,
    C,
    discriminant,
    firstSum,
    firstProduct,
  });
}

/** @internal Consume only setupLineConicIntersection() output. */
export function reconstructEndpointSymmetricExpressions(
  setup: LineConicExpressionSetup,
): EndpointSymmetricExpressions {
  const m: MathJsonExpr = setup.parameter;
  const dependentSum = setup.firstSum;
  const dependentProduct = setup.firstProduct;
  const independentSum = add(mul(m, dependentSum), mul(2, setup.intercept));
  const independentProduct = add(
    mul(square(m), dependentProduct),
    mul(m, setup.intercept, dependentSum),
    square(setup.intercept),
  );
  return deepFreeze(
    setup.orientation === "xFromY"
      ? {
          xSum: independentSum,
          xProduct: independentProduct,
          ySum: dependentSum,
          yProduct: dependentProduct,
        }
      : {
          xSum: dependentSum,
          xProduct: dependentProduct,
          ySum: independentSum,
          yProduct: independentProduct,
        },
  );
}

/** @internal Consume only validated exact setup data. */
export function dotProductExpression(
  setup: LineConicExpressionSetup,
  _symmetric: EndpointSymmetricExpressions,
  vertex: readonly [MathJsonExpr, MathJsonExpr],
): MathJsonExpr {
  const [vx, vy] = vertex;
  const dependentVertex = setup.orientation === "xFromY" ? vx : vy;
  const firstVertex = setup.orientation === "xFromY" ? vy : vx;
  const m: MathJsonExpr = setup.parameter;
  const numerator = add(
    mul(square(m), setup.C),
    neg(mul(m, setup.intercept, setup.B)),
    mul(square(setup.intercept), setup.A),
    mul(dependentVertex, m, setup.B),
    neg(mul(2, dependentVertex, setup.intercept, setup.A)),
    mul(square(dependentVertex), setup.A),
    setup.C,
    mul(firstVertex, setup.B),
    mul(square(firstVertex), setup.A),
  );
  return (
    polynomialQuotientExpression(numerator, setup.A, setup.parameter) ??
    div(numerator, setup.A)
  );
}

/** @internal Consume only validated exact setup data. */
export function chordLengthSquaredExpression(
  setup: LineConicExpressionSetup,
): MathJsonExpr {
  return div(
    mul(add(1, square(setup.parameter)), setup.discriminant),
    square(setup.A),
  );
}

/** @internal Consume only validated exact setup data. */
export function triangleAreaExpression(
  setup: LineConicExpressionSetup,
  vertex: readonly [MathJsonExpr, MathJsonExpr],
): MathJsonExpr {
  const [vx, vy] = vertex;
  const residual = setup.orientation === "xFromY"
    ? sub(sub(vx, mul(setup.parameter, vy)), setup.intercept)
    : sub(sub(vy, mul(setup.parameter, vx)), setup.intercept);
  const denominator = provablyPositivePolynomial(setup.A, setup.parameter)
    ? setup.A
    : abs(setup.A);
  return div(
    mul(abs(residual), sqrt(setup.discriminant)),
    mul(2, denominator),
  );
}

/** @internal Exact range proof uses the same safe constructors. */
export const analyticMathJsonOps = Object.freeze({
  add,
  sub,
  mul,
  div,
  neg,
  square,
  sqrt,
  abs,
  parseRationalConstant,
});
