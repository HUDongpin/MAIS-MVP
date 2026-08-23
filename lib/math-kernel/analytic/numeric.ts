/**
 * Browser-safe finite-number analytic kernel rewritten from Edulab
 * analytic_kernel.py at cf0bc1d68b4ea64307f57d7fac64667e6a3148cc
 * (Apache-2.0). It has no symbolic-runtime or renderer dependency.
 */

import type { Quadratic2D } from "../conics/model";
import { KERNEL_ERROR_CODES, type MathKernelErrorCode } from "../shared/errors";
import type { KernelResult } from "../shared/types";
import type {
  NumericIntersectionResult,
  NumericLineFamily,
  NumericSecantIntersection,
} from "./types";

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
): KernelResult<T> {
  return { ok: false, error: { code, message } };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function finiteNumbers(values: readonly number[]): boolean {
  return values.every((value) => typeof value === "number" && Number.isFinite(value));
}

function finiteResult(value: number, label: string): KernelResult<number> {
  return Number.isFinite(value)
    ? { ok: true, value }
    : fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        `${label} overflowed or left the finite JavaScript numeric domain.`,
      );
}

interface Dyadic {
  /** Exact value is numerator * 2^exponent2. */
  readonly numerator: bigint;
  readonly exponent2: number;
}

const DOUBLE_BITS = new DataView(new ArrayBuffer(8));

function normalizeDyadic(value: Dyadic): Dyadic {
  if (value.numerator === BigInt(0)) return { numerator: BigInt(0), exponent2: 0 };
  let numerator = value.numerator;
  let exponent2 = value.exponent2;
  while ((numerator & BigInt(1)) === BigInt(0)) {
    numerator >>= BigInt(1);
    exponent2 += 1;
  }
  return { numerator, exponent2 };
}

function numberToDyadic(value: number): Dyadic {
  if (!Number.isFinite(value)) {
    throw new TypeError("numberToDyadic accepts only finite numbers.");
  }
  if (value === 0) return { numerator: BigInt(0), exponent2: 0 };
  DOUBLE_BITS.setFloat64(0, value, false);
  const high = DOUBLE_BITS.getUint32(0, false);
  const low = DOUBLE_BITS.getUint32(4, false);
  const negative = (high >>> 31) === 1;
  const exponentBits = (high >>> 20) & 0x7ff;
  const fractionBits =
    (BigInt(high & 0xfffff) << BigInt(32)) | BigInt(low);
  const significand = exponentBits === 0
    ? fractionBits
    : (BigInt(1) << BigInt(52)) | fractionBits;
  const exponent2 = exponentBits === 0
    ? -1074
    : exponentBits - 1023 - 52;
  return normalizeDyadic({
    numerator: negative ? -significand : significand,
    exponent2,
  });
}

function dyadicNeg(value: Dyadic): Dyadic {
  return { numerator: -value.numerator, exponent2: value.exponent2 };
}

function dyadicAdd(left: Dyadic, right: Dyadic): Dyadic {
  if (left.numerator === BigInt(0)) return right;
  if (right.numerator === BigInt(0)) return left;
  const exponent2 = Math.min(left.exponent2, right.exponent2);
  return normalizeDyadic({
    numerator:
      (left.numerator << BigInt(left.exponent2 - exponent2)) +
      (right.numerator << BigInt(right.exponent2 - exponent2)),
    exponent2,
  });
}

function dyadicSub(left: Dyadic, right: Dyadic): Dyadic {
  return dyadicAdd(left, dyadicNeg(right));
}

function dyadicMul(left: Dyadic, right: Dyadic): Dyadic {
  return normalizeDyadic({
    numerator: left.numerator * right.numerator,
    exponent2: left.exponent2 + right.exponent2,
  });
}

function dyadicSum(values: readonly Dyadic[]): Dyadic {
  return values.reduce(dyadicAdd, { numerator: BigInt(0), exponent2: 0 });
}

function bigintAbs(value: bigint): bigint {
  return value < BigInt(0) ? -value : value;
}

function bigintBitLength(value: bigint): number {
  return bigintAbs(value).toString(2).length;
}

function roundBigIntRight(value: bigint, shift: number): bigint {
  if (shift <= 0) return value;
  const divisor = BigInt(1) << BigInt(shift);
  const quotient = value / divisor;
  const remainder = value % divisor;
  const absoluteRemainder = bigintAbs(remainder);
  const half = divisor >> BigInt(1);
  if (absoluteRemainder < half) return quotient;
  const direction = value < BigInt(0) ? -BigInt(1) : BigInt(1);
  if (absoluteRemainder > half) return quotient + direction;
  return (bigintAbs(quotient) & BigInt(1)) === BigInt(0)
    ? quotient
    : quotient + direction;
}

function dyadicToFiniteNumber(
  value: Dyadic,
  label: string,
): KernelResult<number> {
  if (value.numerator === BigInt(0)) return { ok: true, value: 0 };
  const bitLength = bigintBitLength(value.numerator);
  const highestExponent = value.exponent2 + bitLength - 1;
  if (highestExponent > 1023 || highestExponent < -1074) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} is non-zero but cannot be represented as a finite JavaScript number.`,
    );
  }
  const precisionShift = Math.max(0, bitLength - 53);
  const subnormalShift = Math.max(0, -1074 - value.exponent2);
  let shift = Math.max(precisionShift, subnormalShift);
  let rounded = roundBigIntRight(value.numerator, shift);
  if (rounded === BigInt(0)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} is non-zero but underflows to zero in the JavaScript numeric domain.`,
    );
  }
  if (bigintBitLength(rounded) > 53) {
    rounded = roundBigIntRight(rounded, 1);
    shift += 1;
  }
  const numeric = Number(rounded) * 2 ** (value.exponent2 + shift);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} is outside the finite non-zero JavaScript numeric domain.`,
    );
  }
  return { ok: true, value: Object.is(numeric, -0) ? 0 : numeric };
}

function conicEntries(conic: Quadratic2D<number>): readonly number[] {
  return [conic.x2, conic.xy, conic.y2, conic.x, conic.y, conic.constant];
}

interface NumericCoefficientSetup {
  readonly A: number;
  readonly B: number;
  readonly C: number;
  readonly intercept: number;
  readonly exactDiscriminant: Dyadic;
}

function exactDyadicCoefficientSetup(
  conic: Quadratic2D<number>,
  line: NumericLineFamily,
): KernelResult<NumericCoefficientSetup> {
  const [x0, y0] = line.through.map(numberToDyadic) as [Dyadic, Dyadic];
  const m = numberToDyadic(line.parameter);
  const dependent0 = line.orientation === "xFromY" ? x0 : y0;
  const independent0 = line.orientation === "xFromY" ? y0 : x0;
  const intercept = dyadicSub(dependent0, dyadicMul(m, independent0));
  const dependent2 = numberToDyadic(
    line.orientation === "xFromY" ? conic.x2 : conic.y2,
  );
  const independent2 = numberToDyadic(
    line.orientation === "xFromY" ? conic.y2 : conic.x2,
  );
  const dependent1 = numberToDyadic(
    line.orientation === "xFromY" ? conic.x : conic.y,
  );
  const independent1 = numberToDyadic(
    line.orientation === "xFromY" ? conic.y : conic.x,
  );
  const xy = numberToDyadic(conic.xy);
  const constant = numberToDyadic(conic.constant);
  const two = numberToDyadic(2);
  const four = numberToDyadic(4);
  const mSquared = dyadicMul(m, m);
  const A = dyadicSum([
    dyadicMul(dependent2, mSquared),
    dyadicMul(xy, m),
    independent2,
  ]);
  const B = dyadicSum([
    dyadicMul(dyadicMul(dyadicMul(two, dependent2), m), intercept),
    dyadicMul(xy, intercept),
    dyadicMul(dependent1, m),
    independent1,
  ]);
  const C = dyadicSum([
    dyadicMul(dependent2, dyadicMul(intercept, intercept)),
    dyadicMul(dependent1, intercept),
    constant,
  ]);
  const discriminant = dyadicSub(
    dyadicMul(B, B),
    dyadicMul(four, dyadicMul(A, C)),
  );

  const numericIntercept = dyadicToFiniteNumber(intercept, "Line-family intercept");
  if (!numericIntercept.ok) return numericIntercept;
  const numericA = dyadicToFiniteNumber(A, "Quadratic coefficient A");
  if (!numericA.ok) return numericA;
  const numericB = dyadicToFiniteNumber(B, "Quadratic coefficient B");
  if (!numericB.ok) return numericB;
  const numericC = dyadicToFiniteNumber(C, "Quadratic coefficient C");
  if (!numericC.ok) return numericC;
  return {
    ok: true,
    value: {
      A: numericA.value,
      B: numericB.value,
      C: numericC.value,
      intercept: numericIntercept.value,
      exactDiscriminant: discriminant,
    },
  };
}

function coefficientSetup(
  conic: Quadratic2D<number>,
  line: NumericLineFamily,
): KernelResult<NumericCoefficientSetup> {
  if (
    conic === null ||
    typeof conic !== "object" ||
    line === null ||
    typeof line !== "object" ||
    !Array.isArray(line.through) ||
    line.through.length !== 2
  ) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "Conic coefficients and the line family must have the expected finite numeric shape.",
    );
  }
  const entries = [...conicEntries(conic), ...line.through, line.parameter];
  if (!finiteNumbers(entries)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "Conic coefficients, the through-point, and the line parameter must be finite numbers.",
    );
  }
  if (line.orientation !== "xFromY" && line.orientation !== "yFromX") {
    return fail(KERNEL_ERROR_CODES.invalidOrientation, "Line orientation must be xFromY or yFromX.");
  }
  return exactDyadicCoefficientSetup(conic, line);
}

function pointFromFirstCoordinate(
  orientation: NumericLineFamily["orientation"],
  first: number,
  m: number,
  intercept: number,
): KernelResult<readonly [number, number]> {
  const dependent = dyadicToFiniteNumber(
    dyadicAdd(
      dyadicMul(numberToDyadic(m), numberToDyadic(first)),
      numberToDyadic(intercept),
    ),
    "Intersection dependent coordinate",
  );
  if (!dependent.ok) return dependent;
  return checkedPoint(
    orientation === "xFromY"
      ? [dependent.value, first]
      : [first, dependent.value],
  );
}

function checkedPoint(
  point: readonly [number, number],
): KernelResult<readonly [number, number]> {
  return finiteNumbers(point)
    ? { ok: true, value: Object.freeze([point[0], point[1]]) }
    : fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        "An intersection coordinate overflowed the finite numeric domain.",
      );
}

function rootResidualIsCertified(
  a: number,
  b: number,
  c: number,
  root: number,
): boolean {
  let residual: number;
  let magnitude: number;
  if (Math.abs(root) <= 1) {
    residual = (a * root + b) * root + c;
    magnitude = Math.abs(a) * root * root + Math.abs(b) * Math.abs(root) + Math.abs(c);
  } else {
    const inverse = 1 / root;
    residual = a + b * inverse + c * inverse * inverse;
    magnitude = Math.abs(a) + Math.abs(b * inverse) + Math.abs(c * inverse * inverse);
  }
  return Number.isFinite(residual) && Number.isFinite(magnitude) &&
    Math.abs(residual) <= 128 * Number.EPSILON * Math.max(magnitude, Number.MIN_VALUE);
}

export function intersectLineConicNumeric(
  conic: Quadratic2D<number>,
  line: NumericLineFamily,
): KernelResult<NumericIntersectionResult> {
  const coefficients = coefficientSetup(conic, line);
  if (!coefficients.ok) return coefficients;
  const { A, B, C, intercept, exactDiscriminant } = coefficients.value;

  if (A === 0) {
    if (B === 0) {
      return {
        ok: true,
        value: deepFreeze({
          schemaVersion: 1,
          kind: "invalid",
          reason: C === 0 ? "coincident" : "constant-nonzero",
          coefficients: { A, B, C, discriminant: null },
        }),
      };
    }
    const first = -C / B;
    if (!Number.isFinite(first) || (C !== 0 && first === 0)) {
      return fail(KERNEL_ERROR_CODES.nonFiniteInput, "Linear intersection is not representable as a finite number.");
    }
    const point = pointFromFirstCoordinate(line.orientation, first, line.parameter, intercept);
    if (!point.ok) return point;
    return {
      ok: true,
      value: deepFreeze({
        schemaVersion: 1,
        kind: "linear-degenerate",
        point: point.value,
        coefficients: { A, B, C, discriminant: null },
      }),
    };
  }

  const exactNumeric = dyadicToFiniteNumber(
    exactDiscriminant,
    "Quadratic discriminant",
  );
  if (!exactNumeric.ok) return exactNumeric;
  const discriminant = exactNumeric.value;

  // Normalize only the root calculation. The public discriminant above keeps
  // the true B²-4AC scale and therefore remains semantically tied to A/B/C.
  const scale = Math.max(Math.abs(A), Math.abs(B), Math.abs(C));
  if (!Number.isFinite(scale) || scale === 0) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, "Quadratic coefficient scale is not representable.");
  }
  const a = A / scale;
  const b = B / scale;
  const c = C / scale;
  if (
    [A, B, C].some((value, index) => value !== 0 && [a, b, c][index] === 0)
  ) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, "Quadratic normalization underflowed a non-zero coefficient.");
  }
  const publicCoefficients = { A, B, C, discriminant } as const;
  if (discriminant < 0) {
    return { ok: true, value: deepFreeze({ schemaVersion: 1, kind: "disjoint", coefficients: publicCoefficients }) };
  }
  if (discriminant === 0) {
    const first = -b / (2 * a);
    if (!Number.isFinite(first) || !rootResidualIsCertified(a, b, c, first)) {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        "The tangent root failed the scale-free polynomial residual check.",
      );
    }
    const point = pointFromFirstCoordinate(line.orientation, first, line.parameter, intercept);
    if (!point.ok) return point;
    return { ok: true, value: deepFreeze({ schemaVersion: 1, kind: "tangent", point: point.value, coefficients: publicCoefficients }) };
  }

  const rootDiscriminant = Math.sqrt(discriminant) / scale;
  if (!Number.isFinite(rootDiscriminant) || rootDiscriminant === 0) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "The positive discriminant cannot separate two roots in the finite numeric domain.",
    );
  }
  const signedRoot = b < 0 ? -rootDiscriminant : rootDiscriminant;
  const q = -0.5 * (b + signedRoot);
  let firstRoot: number;
  let secondRoot: number;
  if (C === 0) {
    firstRoot = 0;
    secondRoot = -b / a;
  } else if (q === 0) {
    firstRoot = (-b - rootDiscriminant) / (2 * a);
    secondRoot = (-b + rootDiscriminant) / (2 * a);
  } else {
    firstRoot = q / a;
    secondRoot = c / q;
    if ((q !== 0 && firstRoot === 0) || (c !== 0 && secondRoot === 0)) {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        "A non-zero secant root underflowed to zero.",
      );
    }
  }
  if (
    !finiteNumbers([firstRoot, secondRoot]) ||
    firstRoot === secondRoot ||
    !rootResidualIsCertified(a, b, c, firstRoot) ||
    !rootResidualIsCertified(a, b, c, secondRoot)
  ) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, "Secant roots are not representable as two distinct finite numbers.");
  }
  if (firstRoot > secondRoot) [firstRoot, secondRoot] = [secondRoot, firstRoot];
  const firstPoint = pointFromFirstCoordinate(line.orientation, firstRoot, line.parameter, intercept);
  if (!firstPoint.ok) return firstPoint;
  const secondPoint = pointFromFirstCoordinate(line.orientation, secondRoot, line.parameter, intercept);
  if (!secondPoint.ok) return secondPoint;
  const deltaIndependent = dyadicToFiniteNumber(
    dyadicSub(numberToDyadic(secondRoot), numberToDyadic(firstRoot)),
    "Secant independent-coordinate separation",
  );
  if (!deltaIndependent.ok) return deltaIndependent;
  const deltaDependent = dyadicToFiniteNumber(
    dyadicMul(numberToDyadic(line.parameter), numberToDyadic(deltaIndependent.value)),
    "Secant dependent-coordinate separation",
  );
  if (!deltaDependent.ok && line.parameter !== 0) return deltaDependent;
  const length = Math.hypot(
    deltaIndependent.value,
    deltaDependent.ok ? deltaDependent.value : 0,
  );
  const chordLengthSquared = length * length;
  if (
    !Number.isFinite(length) ||
    length === 0 ||
    !Number.isFinite(chordLengthSquared) ||
    chordLengthSquared === 0
  ) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, "Secant chord length is not representable as a positive finite number.");
  }
  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: 1,
      kind: "secant",
      points: [firstPoint.value, secondPoint.value],
      chordLengthSquared,
      coefficients: publicCoefficients,
    }),
  };
}

function validPoint(point: readonly [number, number], label: string): KernelResult<true> {
  return Array.isArray(point) && point.length === 2 && finiteNumbers(point)
    ? { ok: true, value: true }
    : fail(KERNEL_ERROR_CODES.nonFiniteInput, `${label} must contain two finite numbers.`);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateSecantIntersection(
  value: unknown,
): KernelResult<NumericSecantIntersection> {
  try {
    if (!isPlainRecord(value) || value.schemaVersion !== 1 || value.kind !== "secant") {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        "A numeric secant metric requires a schemaVersion 1 secant DTO.",
      );
    }
    if (
      !Array.isArray(value.points) ||
      value.points.length !== 2 ||
      !value.points.every(
        (point) =>
          Array.isArray(point) &&
          point.length === 2 &&
          finiteNumbers(point),
      ) ||
      typeof value.chordLengthSquared !== "number" ||
      !Number.isFinite(value.chordLengthSquared) ||
      value.chordLengthSquared <= 0 ||
      !isPlainRecord(value.coefficients) ||
      !finiteNumbers([
        value.coefficients.A,
        value.coefficients.B,
        value.coefficients.C,
        value.coefficients.discriminant,
      ] as number[])
    ) {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        "The numeric secant DTO contains invalid points, metrics, or coefficients.",
      );
    }
    return { ok: true, value: value as unknown as NumericSecantIntersection };
  } catch {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "The numeric secant DTO could not be safely inspected.",
    );
  }
}

export function numericDotProductForSecant(
  intersection: NumericSecantIntersection,
  vertex: readonly [number, number],
): KernelResult<number> {
  const valid = validPoint(vertex, "vertex");
  if (!valid.ok) return valid;
  const checked = validateSecantIntersection(intersection);
  if (!checked.ok) return checked;
  const [first, second] = checked.value.points;
  const ax = dyadicSub(numberToDyadic(first[0]), numberToDyadic(vertex[0]));
  const ay = dyadicSub(numberToDyadic(first[1]), numberToDyadic(vertex[1]));
  const bx = dyadicSub(numberToDyadic(second[0]), numberToDyadic(vertex[0]));
  const by = dyadicSub(numberToDyadic(second[1]), numberToDyadic(vertex[1]));
  return dyadicToFiniteNumber(
    dyadicAdd(dyadicMul(ax, bx), dyadicMul(ay, by)),
    "Secant dot product",
  );
}

export function numericTriangleAreaForSecant(
  intersection: NumericSecantIntersection,
  vertex: readonly [number, number],
): KernelResult<number> {
  const valid = validPoint(vertex, "vertex");
  if (!valid.ok) return valid;
  const checked = validateSecantIntersection(intersection);
  if (!checked.ok) return checked;
  const [first, second] = checked.value.points;
  const ax = dyadicSub(numberToDyadic(first[0]), numberToDyadic(vertex[0]));
  const ay = dyadicSub(numberToDyadic(first[1]), numberToDyadic(vertex[1]));
  const bx = dyadicSub(numberToDyadic(second[0]), numberToDyadic(vertex[0]));
  const by = dyadicSub(numberToDyadic(second[1]), numberToDyadic(vertex[1]));
  const twiceArea = dyadicSub(dyadicMul(ax, by), dyadicMul(ay, bx));
  return dyadicToFiniteNumber(
    normalizeDyadic({
      numerator: bigintAbs(twiceArea.numerator),
      exponent2: twiceArea.exponent2 - 1,
    }),
    "Secant triangle area",
  );
}
