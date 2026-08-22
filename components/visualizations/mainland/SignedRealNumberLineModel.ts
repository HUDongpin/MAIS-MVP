export const SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT = Object.freeze({
  family: "signed-real-number-line" as const,
  groupId: "G03" as const,
  version: "signed-real-number-line-v1" as const,
});

export const SIGNED_REAL_NUMBER_LINE_LAB_IDS = Object.freeze([
  "bnu-junior-s1-upper-rational-numbers",
  "bnu-junior-s2-upper-real-numbers",
  "hjb-junior-s2-upper-quadratic-radicals",
  "hjb-junior-s2-upper-real-numbers",
  "hjb-primary-p6-lower-rational-numbers",
  "pep-junior-s1-upper-rational-numbers",
] as const);

export const SIGNED_REAL_NUMBER_LINE_MODES = Object.freeze([
  "locate",
  "compare",
  "add",
  "subtract",
  "absolute-value",
  "radical",
] as const);

export const SIGNED_REAL_NUMBER_LINE_EXACT_MODES = Object.freeze([
  "locate",
  "compare",
  "add",
  "subtract",
  "multiply",
  "divide",
  "opposite",
  "absolute-value",
  "radical",
  "classify",
  "square-root",
  "cube-root",
  "estimate",
  "simplify",
  "radical-add",
  "radical-subtract",
  "radical-multiply",
  "radical-divide",
  "estimate-check",
] as const);

const RATIONAL_TOPIC_MODES = Object.freeze([
  "locate",
  "compare",
  "add",
  "subtract",
  "multiply",
  "divide",
  "opposite",
  "absolute-value",
] as const);

const REAL_TOPIC_MODES = Object.freeze([
  "locate",
  "compare",
  "absolute-value",
  "radical",
  "classify",
  "square-root",
  "cube-root",
  "estimate",
] as const);

const QUADRATIC_RADICAL_TOPIC_MODES = Object.freeze([
  "simplify",
  "radical-add",
  "radical-subtract",
  "radical-multiply",
  "radical-divide",
  "estimate-check",
] as const);

export const SIGNED_REAL_NUMBER_LINE_DOMAIN = Object.freeze({
  maxAbsInteger: 50_000,
  maxPrecision: 6,
  minRadicalIndex: 2,
  maxRadicalIndex: 9,
});

export type SignedRealNumberLineLabId =
  (typeof SIGNED_REAL_NUMBER_LINE_LAB_IDS)[number];
export type SignedRealNumberLineMode =
  (typeof SIGNED_REAL_NUMBER_LINE_MODES)[number];
export type SignedRealNumberLineExactMode =
  (typeof SIGNED_REAL_NUMBER_LINE_EXACT_MODES)[number];
export type SignedRealSign = -1 | 0 | 1;

export type SignedRealNumberLineTopicKind =
  | "rational"
  | "real"
  | "quadratic-radical";

export type SignedRealNumberLineTopicProfile = {
  kind: SignedRealNumberLineTopicKind;
  allowedModes: readonly SignedRealNumberLineExactMode[];
};

export const SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES = Object.freeze({
  "bnu-junior-s1-upper-rational-numbers": Object.freeze({
    kind: "rational" as const,
    allowedModes: RATIONAL_TOPIC_MODES,
  }),
  "bnu-junior-s2-upper-real-numbers": Object.freeze({
    kind: "real" as const,
    allowedModes: REAL_TOPIC_MODES,
  }),
  "hjb-junior-s2-upper-quadratic-radicals": Object.freeze({
    kind: "quadratic-radical" as const,
    allowedModes: QUADRATIC_RADICAL_TOPIC_MODES,
  }),
  "hjb-junior-s2-upper-real-numbers": Object.freeze({
    kind: "real" as const,
    allowedModes: REAL_TOPIC_MODES,
  }),
  "hjb-primary-p6-lower-rational-numbers": Object.freeze({
    kind: "rational" as const,
    allowedModes: RATIONAL_TOPIC_MODES,
  }),
  "pep-junior-s1-upper-rational-numbers": Object.freeze({
    kind: "rational" as const,
    allowedModes: RATIONAL_TOPIC_MODES,
  }),
}) satisfies Readonly<
  Record<SignedRealNumberLineLabId, SignedRealNumberLineTopicProfile>
>;

export function getSignedRealNumberLineTopicProfile(
  labId: SignedRealNumberLineLabId,
): SignedRealNumberLineTopicProfile {
  return SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[labId];
}

export type ExactRationalInput = {
  kind: "rational";
  numerator: number;
  denominator: number;
};

export type ExactRadicalInput = {
  kind: "radical";
  radicand: number;
  index: number;
  /** A negative odd radicand is canonicalized by multiplying this sign by -1. */
  sign?: -1 | 1;
};

export type ExactRealInput = ExactRationalInput | ExactRadicalInput;

export type QuadraticSurdInput = {
  kind: "quadratic-surd";
  coefficient: ExactRationalInput;
  radicand: number;
};

type SignedRealNumberLineBaseInput = {
  labId: SignedRealNumberLineLabId;
  precision: number;
};

export type SignedRealNumberLineInput =
  | (SignedRealNumberLineBaseInput & {
      mode: "locate" | "absolute-value" | "radical";
      value: ExactRealInput;
    })
  | (SignedRealNumberLineBaseInput & {
      mode: "compare";
      left: ExactRealInput;
      right: ExactRealInput;
    })
  | (SignedRealNumberLineBaseInput & {
      mode: "add" | "subtract";
      start: ExactRationalInput;
      step: ExactRationalInput;
    })
  | (SignedRealNumberLineBaseInput & {
      mode: "multiply" | "divide";
      left: ExactRationalInput;
      right: ExactRationalInput;
    })
  | (SignedRealNumberLineBaseInput & {
      mode: "opposite";
      value: ExactRationalInput;
    })
  | (SignedRealNumberLineBaseInput & {
      mode: "classify" | "estimate";
      value: ExactRealInput;
    })
  | (SignedRealNumberLineBaseInput & {
      mode: "square-root" | "cube-root";
      radicand: number;
    })
  | (SignedRealNumberLineBaseInput & {
      mode: "simplify" | "estimate-check";
      value: QuadraticSurdInput;
    })
  | (SignedRealNumberLineBaseInput & {
      mode:
        | "radical-add"
        | "radical-subtract"
        | "radical-multiply"
        | "radical-divide";
      left: QuadraticSurdInput;
      right: QuadraticSurdInput;
    });

export type ExactRational = {
  numerator: number;
  denominator: number;
};

export type ExactRationalPoint = ExactRational & {
  kind: "rational";
  symbolic: string;
};

export type ExactRadicalPoint = {
  kind: "radical";
  sign: -1 | 1;
  radicand: number;
  index: number;
  /** Positive rational magnitude multiplying the radical; omitted means 1. */
  coefficient?: ExactRational;
  symbolic: string;
};

export type ExactRealPoint = ExactRationalPoint | ExactRadicalPoint;

export type RadicalPowerReceipt = {
  index: number;
  scale: number;
  lowerMagnitudeUnscaled: number;
  lowerPower: string;
  scaledRadicand: string;
  nextMagnitudeUnscaled: number;
  nextPower: string;
  exact: boolean;
};

export type DecimalApproximationReceipt = {
  method: "toward-zero";
  precision: number;
  scale: number;
  unscaled: number;
  text: string;
  value: number;
  exact: boolean;
  interval: {
    lower: ExactRational;
    upper: ExactRational;
  };
  /** Exact for rational points; null for an irrational radical. */
  exactAbsoluteError: ExactRational | null;
  /** A rational bound on |exact point - decimal approximation|. */
  errorBound: ExactRational;
  powerReceipt: RadicalPowerReceipt | null;
};

export type ExactComparisonStrategy =
  | "zero"
  | "sign"
  | "rational-cross-product"
  | "rational-radical-power"
  | "radical-common-power";

export type ExactComparisonReceipt = {
  strategy: ExactComparisonStrategy;
  commonPower: number;
  leftCrossProduct: string;
  rightCrossProduct: string;
  magnitudeResult: SignedRealSign;
  signAdjusted: boolean;
};

export type SignedRealComparison = {
  left: ExactRealPoint;
  right: ExactRealPoint;
  result: SignedRealSign;
  relation: "less-than" | "equal" | "greater-than";
  exactReceipt: ExactComparisonReceipt;
};

export type SignedNumberLineOperation = {
  kind: "add" | "subtract";
  start: ExactRationalPoint;
  inputStep: ExactRationalPoint;
  signedStep: ExactRationalPoint;
  endpoint: ExactRationalPoint;
  startApproximation: DecimalApproximationReceipt;
  inputStepApproximation: DecimalApproximationReceipt;
  signedStepApproximation: DecimalApproximationReceipt;
  endpointApproximation: DecimalApproximationReceipt;
};

export type ExactRationalOperationReceipt = {
  kind:
    | "add"
    | "subtract"
    | "multiply"
    | "divide"
    | "opposite"
    | "absolute-value";
  left: ExactRationalPoint;
  right: ExactRationalPoint | null;
  result: ExactRationalPoint;
  reconstruction: string;
  reconstructionPassed: boolean;
};

export type CanonicalQuadraticSurd = {
  kind: "quadratic-surd";
  coefficient: ExactRational;
  radicand: number;
  symbolic: string;
  rational: ExactRationalPoint | null;
};

export type CanonicalQuadraticSurdSum = {
  kind: "quadratic-surd-sum";
  terms: readonly CanonicalQuadraticSurd[];
  symbolic: string;
};

export type CanonicalQuadraticExpression =
  | CanonicalQuadraticSurd
  | CanonicalQuadraticSurdSum;

export type QuadraticRadicalOperationReceipt = {
  kind:
    | "simplify"
    | "radical-add"
    | "radical-subtract"
    | "radical-multiply"
    | "radical-divide"
    | "estimate-check";
  left: CanonicalQuadraticSurd;
  right: CanonicalQuadraticSurd | null;
  combinable: boolean;
  defined: boolean;
  result: CanonicalQuadraticExpression;
  reconstruction: string;
  reconstructionPassed: boolean;
};

export type RealNumberClassification =
  | "natural"
  | "whole"
  | "integer"
  | "rational"
  | "irrational"
  | "real";

export type RealNumberConceptReceipt = {
  kind: "classification" | "root" | "estimate";
  classification: readonly RealNumberClassification[] | null;
  root: {
    index: 2 | 3;
    radicand: number;
    defined: boolean;
    exact: boolean;
    reconstructedPower: string;
  } | null;
};

export type SignedRealInvariantId =
  | "rational-point"
  | "radical-square-error"
  | "absolute-value-distance"
  | "signed-origin-stability"
  | "exact-cross-product"
  | "additive-endpoint"
  | "topic-mode-allowlist"
  | "rational-operation-reconstruction"
  | "real-concept-reconstruction"
  | "quadratic-radical-reconstruction";

export type SignedRealInvariantReceipt = {
  id: SignedRealInvariantId;
  applicable: boolean;
  status: "pass" | "fail" | "not-applicable";
  expected: string;
  observed: string;
  passed: boolean | null;
};

export type SignedRealNumberLineSerializedState = {
  version: typeof SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.version;
  labId: SignedRealNumberLineLabId;
  mode: SignedRealNumberLineExactMode;
  precision: number;
  point: ExactRealPoint;
  comparisonPoint: ExactRealPoint | null;
  operationStart: ExactRationalPoint | null;
  operationStep: ExactRationalPoint | null;
};

export type SignedRealNumberLineModel = {
  family: typeof SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.family;
  groupId: typeof SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.groupId;
  version: typeof SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.version;
  labId: SignedRealNumberLineLabId;
  mode: SignedRealNumberLineExactMode;
  topicKind: SignedRealNumberLineTopicKind;
  allowedModes: readonly SignedRealNumberLineExactMode[];
  numberKind: ExactRealPoint["kind"];
  precision: number;
  point: ExactRealPoint;
  approximation: DecimalApproximationReceipt;
  origin: ExactRationalPoint;
  sign: SignedRealSign;
  side: "negative" | "origin" | "positive";
  absoluteValueDistance: {
    exact: ExactRealPoint;
    approximation: DecimalApproximationReceipt;
  };
  comparison: SignedRealComparison | null;
  operation: SignedNumberLineOperation | null;
  rationalOperation: ExactRationalOperationReceipt | null;
  realConcept: RealNumberConceptReceipt | null;
  radicalOperation: QuadraticRadicalOperationReceipt | null;
  invariantReceipts: SignedRealInvariantReceipt[];
  state: SignedRealNumberLineSerializedState;
  stateKey: string;
};

export type SignedRealNumberLineDomainErrorCode =
  | "INVALID_LAB_ID"
  | "INVALID_MODE"
  | "INVALID_NUMBER_KIND"
  | "NON_FINITE_NUMBER"
  | "NON_SAFE_INTEGER"
  | "COMPONENT_OUT_OF_DOMAIN"
  | "ZERO_DENOMINATOR"
  | "INVALID_RADICAL_INDEX"
  | "EVEN_ROOT_OF_NEGATIVE"
  | "INVALID_RADICAL_SIGN"
  | "INVALID_PRECISION"
  | "MISSING_MODE_INPUT"
  | "MODE_KIND_MISMATCH"
  | "MODE_NOT_ALLOWED_FOR_TOPIC"
  | "DIVISION_BY_ZERO"
  | "UNLIKE_RADICALS"
  | "UNSAFE_RESULT";

export class SignedRealNumberLineDomainError extends RangeError {
  readonly code: SignedRealNumberLineDomainErrorCode;

  constructor(code: SignedRealNumberLineDomainErrorCode, message: string) {
    super(message);
    this.name = "SignedRealNumberLineDomainError";
    this.code = code;
  }
}

type UnknownRecord = Record<string, unknown>;

const BIG_ZERO = BigInt(0);
const BIG_ONE = BigInt(1);
const BIG_TWO = BigInt(2);

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalNumber(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function assertSafeInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SignedRealNumberLineDomainError(
      "NON_FINITE_NUMBER",
      `${field} must be a finite number.`,
    );
  }
  if (!Number.isSafeInteger(value)) {
    throw new SignedRealNumberLineDomainError(
      "NON_SAFE_INTEGER",
      `${field} must be a safe integer.`,
    );
  }
}

function assertInputComponent(value: unknown, field: string): number {
  assertSafeInteger(value, field);
  if (Math.abs(value) > SIGNED_REAL_NUMBER_LINE_DOMAIN.maxAbsInteger) {
    throw new SignedRealNumberLineDomainError(
      "COMPONENT_OUT_OF_DOMAIN",
      `${field} exceeds the signed real number-line domain.`,
    );
  }
  return value;
}

function gcdNumber(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function gcdBigInt(left: bigint, right: bigint): bigint {
  let a = left < BIG_ZERO ? -left : left;
  let b = right < BIG_ZERO ? -right : right;
  while (b !== BIG_ZERO) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a === BIG_ZERO ? BIG_ONE : a;
}

function safeBigIntToNumber(value: bigint, field: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || BigInt(result) !== value) {
    throw new SignedRealNumberLineDomainError(
      "UNSAFE_RESULT",
      `${field} exceeds the exact safe-integer result domain.`,
    );
  }
  return canonicalNumber(result);
}

function rationalFromBigInt(
  numerator: bigint,
  denominator: bigint,
  field: string,
): ExactRational {
  if (denominator === BIG_ZERO) {
    throw new SignedRealNumberLineDomainError(
      "ZERO_DENOMINATOR",
      `${field} denominator cannot be zero.`,
    );
  }
  const sign = denominator < BIG_ZERO ? -BIG_ONE : BIG_ONE;
  const divisor = gcdBigInt(numerator, denominator);
  const normalizedNumerator = (sign * numerator) / divisor;
  const normalizedDenominator =
    (denominator < BIG_ZERO ? -denominator : denominator) / divisor;
  return {
    numerator: safeBigIntToNumber(normalizedNumerator, `${field} numerator`),
    denominator: safeBigIntToNumber(
      normalizedDenominator,
      `${field} denominator`,
    ),
  };
}

function rationalSymbolic(value: ExactRational): string {
  if (value.numerator === 0) return "0";
  return value.denominator === 1
    ? String(value.numerator)
    : `${value.numerator}/${value.denominator}`;
}

function rationalPoint(value: ExactRational): ExactRationalPoint {
  return {
    kind: "rational",
    numerator: value.numerator,
    denominator: value.denominator,
    symbolic: rationalSymbolic(value),
  };
}

function normalizeRationalInput(
  value: unknown,
  field: string,
): ExactRationalPoint {
  if (!isRecord(value)) {
    throw new SignedRealNumberLineDomainError(
      "MISSING_MODE_INPUT",
      `${field} is required.`,
    );
  }
  if (value.kind !== "rational") {
    throw new SignedRealNumberLineDomainError(
      "MODE_KIND_MISMATCH",
      `${field} must be an exact rational value.`,
    );
  }
  const numerator = assertInputComponent(value.numerator, `${field}.numerator`);
  const denominator = assertInputComponent(
    value.denominator,
    `${field}.denominator`,
  );
  if (denominator === 0) {
    throw new SignedRealNumberLineDomainError(
      "ZERO_DENOMINATOR",
      `${field}.denominator cannot be zero.`,
    );
  }
  const divisor = gcdNumber(numerator, denominator);
  const denominatorSign = denominator < 0 ? -1 : 1;
  const normalizedNumerator = canonicalNumber(
    (denominatorSign * numerator) / divisor,
  );
  return rationalPoint({
    numerator: normalizedNumerator,
    denominator: Math.abs(denominator / divisor),
  });
}

function radicalSymbolic(
  sign: -1 | 1,
  radicand: number,
  index: number,
): string {
  const prefix = sign < 0 && radicand !== 0 ? "-" : "";
  return index === 2
    ? `${prefix}√(${radicand})`
    : `${prefix}√[${index}](${radicand})`;
}

function exactIntegerRoot(magnitude: number, index: number): number | null {
  if (magnitude === 0) return 0;
  const estimate = Math.floor(magnitude ** (1 / index));
  for (const candidate of [estimate - 1, estimate, estimate + 1, estimate + 2]) {
    if (candidate < 0) continue;
    if (powBigInt(BigInt(candidate), index) === BigInt(magnitude)) {
      return candidate;
    }
  }
  return null;
}

function normalizeRadicalInput(
  value: UnknownRecord,
  field: string,
): ExactRealPoint {
  const rawRadicand = assertInputComponent(
    value.radicand,
    `${field}.radicand`,
  );
  assertSafeInteger(value.index, `${field}.index`);
  const index = value.index;
  if (
    index < SIGNED_REAL_NUMBER_LINE_DOMAIN.minRadicalIndex ||
    index > SIGNED_REAL_NUMBER_LINE_DOMAIN.maxRadicalIndex
  ) {
    throw new SignedRealNumberLineDomainError(
      "INVALID_RADICAL_INDEX",
      `${field}.index must be between ${SIGNED_REAL_NUMBER_LINE_DOMAIN.minRadicalIndex} and ${SIGNED_REAL_NUMBER_LINE_DOMAIN.maxRadicalIndex}.`,
    );
  }
  const rawSign = value.sign === undefined ? 1 : value.sign;
  if (rawSign !== -1 && rawSign !== 1) {
    throw new SignedRealNumberLineDomainError(
      "INVALID_RADICAL_SIGN",
      `${field}.sign must be -1 or 1.`,
    );
  }
  if (rawRadicand < 0 && index % 2 === 0) {
    throw new SignedRealNumberLineDomainError(
      "EVEN_ROOT_OF_NEGATIVE",
      `${field} cannot take an even real root of a negative radicand.`,
    );
  }
  const radicand = Math.abs(rawRadicand);
  const effectiveSign =
    radicand === 0 ? 1 : rawRadicand < 0 ? (-rawSign as -1 | 1) : rawSign;
  const exactRoot = exactIntegerRoot(radicand, index);
  if (exactRoot !== null) {
    return rationalPoint({
      numerator: effectiveSign * exactRoot,
      denominator: 1,
    });
  }
  return {
    kind: "radical",
    sign: effectiveSign,
    radicand,
    index,
    symbolic: radicalSymbolic(effectiveSign, radicand, index),
  };
}

function normalizeExactRealInput(
  value: unknown,
  field: string,
): ExactRealPoint {
  if (!isRecord(value)) {
    throw new SignedRealNumberLineDomainError(
      "MISSING_MODE_INPUT",
      `${field} is required.`,
    );
  }
  if (value.kind === "rational") return normalizeRationalInput(value, field);
  if (value.kind === "radical") return normalizeRadicalInput(value, field);
  throw new SignedRealNumberLineDomainError(
    "INVALID_NUMBER_KIND",
    `${field}.kind must be rational or radical.`,
  );
}

function pow10(exponent: number): number {
  return 10 ** exponent;
}

function powBigInt(base: bigint, exponent: number): bigint {
  let result = BIG_ONE;
  for (let cursor = 0; cursor < exponent; cursor += 1) result *= base;
  return result;
}

function decimalText(unscaled: number, precision: number): string {
  const sign = unscaled < 0 ? "-" : "";
  const digits = String(Math.abs(unscaled)).padStart(precision + 1, "0");
  if (precision === 0) return `${sign}${digits}`;
  const split = digits.length - precision;
  return `${sign}${digits.slice(0, split)}.${digits.slice(split)}`;
}

function rationalApproximation(
  point: ExactRationalPoint,
  precision: number,
): DecimalApproximationReceipt {
  const scale = pow10(precision);
  const absoluteScaledNumerator =
    BigInt(Math.abs(point.numerator)) * BigInt(scale);
  const denominator = BigInt(point.denominator);
  const magnitude = absoluteScaledNumerator / denominator;
  const remainder = absoluteScaledNumerator % denominator;
  const signedMagnitude = point.numerator < 0 ? -magnitude : magnitude;
  const unscaled = safeBigIntToNumber(
    signedMagnitude,
    "rational decimal approximation",
  );
  const exact = remainder === BIG_ZERO;
  const approximation = rationalFromBigInt(
    signedMagnitude,
    BigInt(scale),
    "rational decimal approximation",
  );
  const lower =
    exact || point.numerator >= 0
      ? approximation
      : rationalFromBigInt(
          -(magnitude + BIG_ONE),
          BigInt(scale),
          "rational decimal lower bound",
        );
  const upper =
    exact || point.numerator <= 0
      ? approximation
      : rationalFromBigInt(
          magnitude + BIG_ONE,
          BigInt(scale),
          "rational decimal upper bound",
        );
  const exactAbsoluteError = rationalFromBigInt(
    remainder,
    denominator * BigInt(scale),
    "rational decimal absolute error",
  );
  return {
    method: "toward-zero",
    precision,
    scale,
    unscaled,
    text: decimalText(unscaled, precision),
    value: canonicalNumber(unscaled / scale),
    exact,
    interval: { lower, upper },
    exactAbsoluteError,
    errorBound: exactAbsoluteError,
    powerReceipt: null,
  };
}

function floorScaledRadical(
  radicand: number,
  index: number,
  scale: number,
): {
  magnitude: bigint;
  lowerPower: bigint;
  targetPower: bigint;
  nextPower: bigint;
} {
  const scaleBig = BigInt(scale);
  const targetPower = BigInt(radicand) * powBigInt(scaleBig, index);
  if (radicand === 0) {
    return {
      magnitude: BIG_ZERO,
      lowerPower: BIG_ZERO,
      targetPower,
      nextPower: BIG_ONE,
    };
  }
  let low = BIG_ZERO;
  let high = BigInt(radicand) * scaleBig + BIG_ONE;
  while (low + BIG_ONE < high) {
    const middle = (low + high) / BIG_TWO;
    if (powBigInt(middle, index) <= targetPower) low = middle;
    else high = middle;
  }
  return {
    magnitude: low,
    lowerPower: powBigInt(low, index),
    targetPower,
    nextPower: powBigInt(low + BIG_ONE, index),
  };
}

function radicalApproximation(
  point: ExactRadicalPoint,
  precision: number,
): DecimalApproximationReceipt {
  const scale = pow10(precision);
  const coefficient = point.coefficient ?? { numerator: 1, denominator: 1 };
  const coefficientMagnitude = Math.abs(coefficient.numerator);
  const floor = (() => {
    if (coefficientMagnitude === coefficient.denominator) {
      return floorScaledRadical(point.radicand, point.index, scale);
    }
    const denominator = BigInt(coefficient.denominator);
    const scaledCoefficient = BigInt(coefficientMagnitude) * BigInt(scale);
    const targetPower =
      BigInt(point.radicand) * powBigInt(scaledCoefficient, point.index);
    let low = BIG_ZERO;
    let high =
      BigInt(Math.max(1, point.radicand)) * scaledCoefficient + BIG_ONE;
    while (low + BIG_ONE < high) {
      const middle = (low + high) / BIG_TWO;
      if (powBigInt(middle * denominator, point.index) <= targetPower) {
        low = middle;
      } else {
        high = middle;
      }
    }
    return {
      magnitude: low,
      lowerPower: powBigInt(low * denominator, point.index),
      targetPower,
      nextPower: powBigInt((low + BIG_ONE) * denominator, point.index),
    };
  })();
  const exact = floor.lowerPower === floor.targetPower;
  const signedMagnitude = point.sign < 0 ? -floor.magnitude : floor.magnitude;
  const unscaled = safeBigIntToNumber(
    signedMagnitude,
    "radical decimal approximation",
  );
  const approximation = rationalFromBigInt(
    signedMagnitude,
    BigInt(scale),
    "radical decimal approximation",
  );
  const lower =
    exact || point.sign > 0
      ? approximation
      : rationalFromBigInt(
          -(floor.magnitude + BIG_ONE),
          BigInt(scale),
          "radical decimal lower bound",
        );
  const upper =
    exact || point.sign < 0
      ? approximation
      : rationalFromBigInt(
          floor.magnitude + BIG_ONE,
          BigInt(scale),
          "radical decimal upper bound",
        );
  return {
    method: "toward-zero",
    precision,
    scale,
    unscaled,
    text: decimalText(unscaled, precision),
    value: canonicalNumber(unscaled / scale),
    exact,
    interval: { lower, upper },
    exactAbsoluteError: exact ? { numerator: 0, denominator: 1 } : null,
    errorBound: exact
      ? { numerator: 0, denominator: 1 }
      : rationalFromBigInt(BIG_ONE, BigInt(scale), "radical error bound"),
    powerReceipt: {
      index: point.index,
      scale,
      lowerMagnitudeUnscaled: safeBigIntToNumber(
        floor.magnitude,
        "radical lower magnitude",
      ),
      lowerPower: floor.lowerPower.toString(),
      scaledRadicand: floor.targetPower.toString(),
      nextMagnitudeUnscaled: safeBigIntToNumber(
        floor.magnitude + BIG_ONE,
        "radical next magnitude",
      ),
      nextPower: floor.nextPower.toString(),
      exact,
    },
  };
}

function approximatePoint(
  point: ExactRealPoint,
  precision: number,
): DecimalApproximationReceipt {
  return point.kind === "rational"
    ? rationalApproximation(point, precision)
    : radicalApproximation(point, precision);
}

function pointSign(point: ExactRealPoint): SignedRealSign {
  if (point.kind === "rational") {
    return point.numerator === 0 ? 0 : point.numerator < 0 ? -1 : 1;
  }
  return point.radicand === 0 ? 0 : point.sign;
}

function absolutePoint(point: ExactRealPoint): ExactRealPoint {
  if (point.kind === "rational") {
    return rationalPoint({
      numerator: Math.abs(point.numerator),
      denominator: point.denominator,
    });
  }
  return {
    ...point,
    sign: 1,
    symbolic: point.coefficient
      ? quadraticSurdSymbolic(point.coefficient, point.radicand)
      : radicalSymbolic(1, point.radicand, point.index),
  };
}

function compareBigInt(left: bigint, right: bigint): SignedRealSign {
  return left === right ? 0 : left < right ? -1 : 1;
}

function gcdPositiveInteger(left: number, right: number): number {
  let a = left;
  let b = right;
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function magnitudeComparison(
  left: ExactRealPoint,
  right: ExactRealPoint,
): {
  result: SignedRealSign;
  receipt: Omit<ExactComparisonReceipt, "signAdjusted">;
} {
  if (left.kind === "rational" && right.kind === "rational") {
    const leftCross =
      BigInt(Math.abs(left.numerator)) * BigInt(right.denominator);
    const rightCross =
      BigInt(Math.abs(right.numerator)) * BigInt(left.denominator);
    const result = compareBigInt(leftCross, rightCross);
    return {
      result,
      receipt: {
        strategy: "rational-cross-product",
        commonPower: 1,
        leftCrossProduct: leftCross.toString(),
        rightCrossProduct: rightCross.toString(),
        magnitudeResult: result,
      },
    };
  }
  if (left.kind === "rational" && right.kind === "radical") {
    const leftCross = powBigInt(BigInt(Math.abs(left.numerator)), right.index);
    const rightCross =
      BigInt(right.radicand) *
      powBigInt(BigInt(left.denominator), right.index);
    const result = compareBigInt(leftCross, rightCross);
    return {
      result,
      receipt: {
        strategy: "rational-radical-power",
        commonPower: right.index,
        leftCrossProduct: leftCross.toString(),
        rightCrossProduct: rightCross.toString(),
        magnitudeResult: result,
      },
    };
  }
  if (left.kind === "radical" && right.kind === "rational") {
    const leftCross =
      BigInt(left.radicand) *
      powBigInt(BigInt(right.denominator), left.index);
    const rightCross = powBigInt(BigInt(Math.abs(right.numerator)), left.index);
    const result = compareBigInt(leftCross, rightCross);
    return {
      result,
      receipt: {
        strategy: "rational-radical-power",
        commonPower: left.index,
        leftCrossProduct: leftCross.toString(),
        rightCrossProduct: rightCross.toString(),
        magnitudeResult: result,
      },
    };
  }
  if (left.kind !== "radical" || right.kind !== "radical") {
    throw new Error("Exact real comparison received an unreachable kind.");
  }
  const commonPower =
    (left.index * right.index) /
    gcdPositiveInteger(left.index, right.index);
  const leftCross = powBigInt(
    BigInt(left.radicand),
    commonPower / left.index,
  );
  const rightCross = powBigInt(
    BigInt(right.radicand),
    commonPower / right.index,
  );
  const result = compareBigInt(leftCross, rightCross);
  return {
    result,
    receipt: {
      strategy: "radical-common-power",
      commonPower,
      leftCrossProduct: leftCross.toString(),
      rightCrossProduct: rightCross.toString(),
      magnitudeResult: result,
    },
  };
}

function compareExactPoints(
  left: ExactRealPoint,
  right: ExactRealPoint,
): SignedRealComparison {
  const leftSign = pointSign(left);
  const rightSign = pointSign(right);
  let result: SignedRealSign;
  let exactReceipt: ExactComparisonReceipt;
  if (left.kind === "rational" && right.kind === "rational") {
    const leftCross = BigInt(left.numerator) * BigInt(right.denominator);
    const rightCross = BigInt(right.numerator) * BigInt(left.denominator);
    result = compareBigInt(leftCross, rightCross);
    exactReceipt = {
      strategy: "rational-cross-product",
      commonPower: 1,
      leftCrossProduct: leftCross.toString(),
      rightCrossProduct: rightCross.toString(),
      magnitudeResult: result,
      signAdjusted: false,
    };
  } else if (leftSign === 0 && rightSign === 0) {
    result = 0;
    exactReceipt = {
      strategy: "zero",
      commonPower: 0,
      leftCrossProduct: "0",
      rightCrossProduct: "0",
      magnitudeResult: 0,
      signAdjusted: false,
    };
  } else if (leftSign !== rightSign) {
    result = leftSign < rightSign ? -1 : 1;
    exactReceipt = {
      strategy: "sign",
      commonPower: 0,
      leftCrossProduct: String(leftSign),
      rightCrossProduct: String(rightSign),
      magnitudeResult: result,
      signAdjusted: false,
    };
  } else {
    const magnitude = magnitudeComparison(left, right);
    const signAdjusted = leftSign < 0;
    result = signAdjusted
      ? magnitude.result === 0
        ? 0
        : magnitude.result === 1
          ? -1
          : 1
      : magnitude.result;
    exactReceipt = { ...magnitude.receipt, signAdjusted };
  }
  return {
    left,
    right,
    result,
    relation:
      result === 0 ? "equal" : result < 0 ? "less-than" : "greater-than",
    exactReceipt,
  };
}

function negateRational(point: ExactRationalPoint): ExactRationalPoint {
  return rationalPoint({
    numerator: canonicalNumber(-point.numerator),
    denominator: point.denominator,
  });
}

function addRationals(
  left: ExactRationalPoint,
  right: ExactRationalPoint,
): ExactRationalPoint {
  return rationalPoint(
    rationalFromBigInt(
      BigInt(left.numerator) * BigInt(right.denominator) +
        BigInt(right.numerator) * BigInt(left.denominator),
      BigInt(left.denominator) * BigInt(right.denominator),
      "additive endpoint",
    ),
  );
}

function subtractRationals(
  left: ExactRationalPoint,
  right: ExactRationalPoint,
): ExactRationalPoint {
  return addRationals(left, negateRational(right));
}

function multiplyRationals(
  left: ExactRationalPoint,
  right: ExactRationalPoint,
  field = "rational product",
): ExactRationalPoint {
  return rationalPoint(
    rationalFromBigInt(
      BigInt(left.numerator) * BigInt(right.numerator),
      BigInt(left.denominator) * BigInt(right.denominator),
      field,
    ),
  );
}

function divideRationals(
  left: ExactRationalPoint,
  right: ExactRationalPoint,
  field = "rational quotient",
): ExactRationalPoint {
  if (right.numerator === 0) {
    throw new SignedRealNumberLineDomainError(
      "DIVISION_BY_ZERO",
      `${field} divisor cannot be zero.`,
    );
  }
  return rationalPoint(
    rationalFromBigInt(
      BigInt(left.numerator) * BigInt(right.denominator),
      BigInt(left.denominator) * BigInt(right.numerator),
      field,
    ),
  );
}

function buildRationalOperationReceipt(
  kind: ExactRationalOperationReceipt["kind"],
  left: ExactRationalPoint,
  right: ExactRationalPoint | null,
): ExactRationalOperationReceipt {
  const result =
    kind === "add" && right
      ? addRationals(left, right)
      : kind === "subtract" && right
        ? subtractRationals(left, right)
        : kind === "multiply" && right
          ? multiplyRationals(left, right)
          : kind === "divide" && right
            ? divideRationals(left, right)
            : kind === "opposite"
              ? negateRational(left)
              : rationalPoint({
                  numerator: Math.abs(left.numerator),
                  denominator: left.denominator,
                });
  const operator =
    kind === "add"
      ? "+"
      : kind === "subtract"
        ? "−"
        : kind === "multiply"
          ? "×"
          : kind === "divide"
            ? "÷"
            : kind === "opposite"
              ? "opposite"
              : "absolute-value";
  return {
    kind,
    left,
    right,
    result,
    reconstruction: right
      ? `${left.symbolic} ${operator} ${right.symbolic} = ${result.symbolic}`
      : `${operator}(${left.symbolic}) = ${result.symbolic}`,
    reconstructionPassed: rationalIsNormalized(result),
  };
}

function quadraticSurdSymbolic(
  coefficient: ExactRational,
  radicand: number,
): string {
  if (coefficient.numerator === 0 || radicand === 0) return "0";
  if (radicand === 1) return rationalSymbolic(coefficient);
  const negative = coefficient.numerator < 0;
  const magnitude = {
    numerator: Math.abs(coefficient.numerator),
    denominator: coefficient.denominator,
  };
  const coefficientText =
    magnitude.numerator === magnitude.denominator
      ? ""
      : magnitude.denominator === 1
        ? String(magnitude.numerator)
        : `${magnitude.numerator}/${magnitude.denominator}`;
  return `${negative ? "-" : ""}${coefficientText}√${radicand}`;
}

function largestSquareExtraction(radicand: number): {
  outside: number;
  remaining: number;
} {
  if (radicand === 0) return { outside: 0, remaining: 1 };
  let outside = 1;
  let remaining = radicand;
  for (let factor = 2; factor * factor <= remaining; factor += 1) {
    const square = factor * factor;
    while (remaining % square === 0) {
      outside *= factor;
      remaining /= square;
    }
  }
  return { outside, remaining };
}

function quadraticSurdIsCanonical(value: CanonicalQuadraticSurd): boolean {
  if (!rationalIsNormalized(rationalPoint(value.coefficient))) return false;
  if (value.radicand < 1 || !Number.isSafeInteger(value.radicand)) return false;
  for (let factor = 2; factor * factor <= value.radicand; factor += 1) {
    if (value.radicand % (factor * factor) === 0) return false;
  }
  const expectedRational =
    value.radicand === 1 ? rationalPoint(value.coefficient) : null;
  if (
    (expectedRational === null) !== (value.rational === null) ||
    (expectedRational &&
      value.rational &&
      !sameExactPoint(expectedRational, value.rational))
  ) {
    return false;
  }
  return (
    value.symbolic ===
    quadraticSurdSymbolic(value.coefficient, value.radicand)
  );
}

function canonicalQuadraticSurdFromParts(
  coefficient: ExactRationalPoint,
  radicand: number,
  field: string,
): CanonicalQuadraticSurd {
  assertSafeInteger(radicand, `${field}.radicand`);
  if (radicand < 0) {
    throw new SignedRealNumberLineDomainError(
      "EVEN_ROOT_OF_NEGATIVE",
      `${field} cannot take a square root of a negative radicand.`,
    );
  }
  if (coefficient.numerator === 0 || radicand === 0) {
    const rational = rationalPoint({ numerator: 0, denominator: 1 });
    return {
      kind: "quadratic-surd",
      coefficient: { numerator: 0, denominator: 1 },
      radicand: 1,
      symbolic: "0",
      rational,
    };
  }
  const extraction = largestSquareExtraction(radicand);
  const extractedCoefficient = rationalPoint(
    rationalFromBigInt(
      BigInt(coefficient.numerator) * BigInt(extraction.outside),
      BigInt(coefficient.denominator),
      `${field} coefficient`,
    ),
  );
  const rational =
    extraction.remaining === 1 ? extractedCoefficient : null;
  return {
    kind: "quadratic-surd",
    coefficient: {
      numerator: extractedCoefficient.numerator,
      denominator: extractedCoefficient.denominator,
    },
    radicand: extraction.remaining,
    symbolic: quadraticSurdSymbolic(
      extractedCoefficient,
      extraction.remaining,
    ),
    rational,
  };
}

function normalizeQuadraticSurdInput(
  value: unknown,
  field: string,
): CanonicalQuadraticSurd {
  if (!isRecord(value)) {
    throw new SignedRealNumberLineDomainError(
      "MISSING_MODE_INPUT",
      `${field} is required.`,
    );
  }
  if (value.kind !== "quadratic-surd") {
    throw new SignedRealNumberLineDomainError(
      "MODE_KIND_MISMATCH",
      `${field} must be a quadratic surd.`,
    );
  }
  const coefficient = normalizeRationalInput(value.coefficient, `${field}.coefficient`);
  const radicand = assertInputComponent(value.radicand, `${field}.radicand`);
  return canonicalQuadraticSurdFromParts(coefficient, radicand, field);
}

function signedSurdTerm(
  value: CanonicalQuadraticSurd,
  sign: 1 | -1,
  field: string,
): CanonicalQuadraticSurd {
  return canonicalQuadraticSurdFromParts(
    rationalPoint({
      numerator: sign * value.coefficient.numerator,
      denominator: value.coefficient.denominator,
    }),
    value.radicand,
    field,
  );
}

function sumSymbolic(terms: readonly CanonicalQuadraticSurd[]): string {
  return terms
    .map((term, index) => {
      const negative = term.coefficient.numerator < 0;
      const magnitude = signedSurdTerm(term, negative ? -1 : 1, "sum display");
      const unsigned = negative
        ? quadraticSurdSymbolic(
            {
              numerator: Math.abs(magnitude.coefficient.numerator),
              denominator: magnitude.coefficient.denominator,
            },
            magnitude.radicand,
          )
        : magnitude.symbolic;
      if (index === 0) return negative ? `-${unsigned}` : unsigned;
      return `${negative ? "−" : "+"} ${unsigned}`;
    })
    .join(" ");
}

function pointForQuadraticSurd(value: CanonicalQuadraticSurd): ExactRealPoint {
  if (value.rational) return value.rational;
  const sign: -1 | 1 = value.coefficient.numerator < 0 ? -1 : 1;
  const magnitude = {
    numerator: Math.abs(value.coefficient.numerator),
    denominator: value.coefficient.denominator,
  };
  return {
    kind: "radical",
    sign,
    radicand: value.radicand,
    index: 2,
    coefficient: magnitude,
    symbolic: value.symbolic,
  };
}

function buildQuadraticRadicalOperation(
  mode: QuadraticRadicalOperationReceipt["kind"],
  leftInput: unknown,
  rightInput: unknown,
): QuadraticRadicalOperationReceipt {
  const left = normalizeQuadraticSurdInput(leftInput, "left");
  const right = rightInput === null ? null : normalizeQuadraticSurdInput(rightInput, "right");
  if (mode === "simplify" || mode === "estimate-check") {
    return {
      kind: mode,
      left,
      right: null,
      combinable: true,
      defined: true,
      result: left,
      reconstruction: left.symbolic,
      reconstructionPassed: quadraticSurdIsCanonical(left),
    };
  }
  if (!right) throw new Error("Binary radical operation requires right input.");
  if (mode === "radical-add" || mode === "radical-subtract") {
    const effectiveRight =
      mode === "radical-subtract"
        ? signedSurdTerm(right, -1, "radical subtraction")
        : right;
    if (left.radicand === effectiveRight.radicand) {
      const coefficient = addRationals(
        rationalPoint(left.coefficient),
        rationalPoint(effectiveRight.coefficient),
      );
      const result = canonicalQuadraticSurdFromParts(
        coefficient,
        left.radicand,
        "like radical sum",
      );
      return {
        kind: mode,
        left,
        right,
        combinable: true,
        defined: true,
        result,
        reconstruction: `${left.symbolic} ${mode === "radical-add" ? "+" : "−"} ${right.symbolic} = ${result.symbolic}`,
        reconstructionPassed:
          quadraticSurdIsCanonical(left) &&
          quadraticSurdIsCanonical(right) &&
          quadraticSurdIsCanonical(result),
      };
    }
    const terms = [left, effectiveRight] as const;
    const result: CanonicalQuadraticSurdSum = {
      kind: "quadratic-surd-sum",
      terms,
      symbolic: sumSymbolic(terms),
    };
    return {
      kind: mode,
      left,
      right,
      combinable: false,
      defined: true,
      result,
      reconstruction: result.symbolic,
      reconstructionPassed: terms.every(quadraticSurdIsCanonical),
    };
  }
  if (mode === "radical-multiply") {
    const coefficient = multiplyRationals(
      rationalPoint(left.coefficient),
      rationalPoint(right.coefficient),
      "radical product coefficient",
    );
    const radicand = safeBigIntToNumber(
      BigInt(left.radicand) * BigInt(right.radicand),
      "radical product radicand",
    );
    const result = canonicalQuadraticSurdFromParts(
      coefficient,
      radicand,
      "radical product",
    );
    return {
      kind: mode,
      left,
      right,
      combinable: true,
      defined: true,
      result,
      reconstruction: `${left.symbolic} × ${right.symbolic} = ${result.symbolic}`,
      reconstructionPassed:
        quadraticSurdIsCanonical(left) &&
        quadraticSurdIsCanonical(right) &&
        quadraticSurdIsCanonical(result),
    };
  }
  if (right.coefficient.numerator === 0) {
    throw new SignedRealNumberLineDomainError(
      "DIVISION_BY_ZERO",
      "Quadratic radical divisor cannot be zero.",
    );
  }
  const coefficientQuotient = divideRationals(
    rationalPoint(left.coefficient),
    rationalPoint(right.coefficient),
    "radical quotient coefficient",
  );
  const rationalizingDenominator = rationalPoint({
    numerator: right.radicand,
    denominator: 1,
  });
  const coefficient = divideRationals(
    coefficientQuotient,
    rationalizingDenominator,
    "rationalized radical quotient coefficient",
  );
  const radicand = safeBigIntToNumber(
    BigInt(left.radicand) * BigInt(right.radicand),
    "radical quotient radicand",
  );
  const result = canonicalQuadraticSurdFromParts(
    coefficient,
    radicand,
    "radical quotient",
  );
  return {
    kind: mode,
    left,
    right,
    combinable: true,
    defined: true,
    result,
    reconstruction: `${left.symbolic} ÷ ${right.symbolic} = ${result.symbolic}`,
    reconstructionPassed:
      quadraticSurdIsCanonical(left) &&
      quadraticSurdIsCanonical(right) &&
      quadraticSurdIsCanonical(result),
  };
}

function buildOperation(
  mode: "add" | "subtract",
  start: ExactRationalPoint,
  inputStep: ExactRationalPoint,
  precision: number,
): SignedNumberLineOperation {
  const signedStep = mode === "add" ? inputStep : negateRational(inputStep);
  const endpoint = addRationals(start, signedStep);
  return {
    kind: mode,
    start,
    inputStep,
    signedStep,
    endpoint,
    startApproximation: approximatePoint(start, precision),
    inputStepApproximation: approximatePoint(inputStep, precision),
    signedStepApproximation: approximatePoint(signedStep, precision),
    endpointApproximation: approximatePoint(endpoint, precision),
  };
}

function rationalIsNormalized(point: ExactRationalPoint): boolean {
  return (
    point.denominator > 0 &&
    gcdNumber(point.numerator, point.denominator) === 1 &&
    !Object.is(point.numerator, -0)
  );
}

function sameExactPoint(left: ExactRealPoint, right: ExactRealPoint): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "rational" && right.kind === "rational") {
    return (
      left.numerator === right.numerator &&
      left.denominator === right.denominator
    );
  }
  if (left.kind === "radical" && right.kind === "radical") {
    const leftCoefficient = left.coefficient ?? { numerator: 1, denominator: 1 };
    const rightCoefficient = right.coefficient ?? { numerator: 1, denominator: 1 };
    return (
      left.sign === right.sign &&
      left.radicand === right.radicand &&
      left.index === right.index &&
      leftCoefficient.numerator === rightCoefficient.numerator &&
      leftCoefficient.denominator === rightCoefficient.denominator
    );
  }
  return false;
}

function invariantReceipt(
  id: SignedRealInvariantId,
  applicable: boolean,
  expected: string,
  observed: string,
  passed: boolean,
): SignedRealInvariantReceipt {
  return {
    id,
    applicable,
    status: applicable ? (passed ? "pass" : "fail") : "not-applicable",
    expected,
    observed,
    passed: applicable ? passed : null,
  };
}

function buildInvariantReceipts(
  point: ExactRealPoint,
  approximation: DecimalApproximationReceipt,
  distance: ExactRealPoint,
  sign: SignedRealSign,
  side: SignedRealNumberLineModel["side"],
  comparison: SignedRealComparison | null,
  operation: SignedNumberLineOperation | null,
  rationalOperation: ExactRationalOperationReceipt | null,
  realConcept: RealNumberConceptReceipt | null,
  radicalOperation: QuadraticRadicalOperationReceipt | null,
): SignedRealInvariantReceipt[] {
  const rationals: ExactRationalPoint[] = [
    point,
    distance,
    comparison?.right,
    operation?.start,
    operation?.inputStep,
    operation?.signedStep,
    operation?.endpoint,
  ].filter((candidate): candidate is ExactRationalPoint =>
    Boolean(candidate && candidate.kind === "rational"),
  );
  const rationalPointPassed = rationals.every(rationalIsNormalized);
  const radicalSquareApplicable = point.kind === "radical" && point.index === 2;
  const power = approximation.powerReceipt;
  const radicalPowerPassed =
    !radicalSquareApplicable ||
    Boolean(
      power &&
        BigInt(power.lowerPower) <= BigInt(power.scaledRadicand) &&
        (power.exact
          ? BigInt(power.lowerPower) === BigInt(power.scaledRadicand)
          : BigInt(power.scaledRadicand) < BigInt(power.nextPower)),
    );
  const expectedDistance = absolutePoint(point);
  const distancePassed = sameExactPoint(expectedDistance, distance);
  const expectedSide =
    sign === 0 ? "origin" : sign < 0 ? "negative" : "positive";
  const originPassed = side === expectedSide;
  const comparisonPassed = comparison
    ? compareExactPoints(comparison.left, comparison.right).result ===
      comparison.result
    : true;
  const reconstructedEndpoint = operation
    ? addRationals(operation.start, operation.signedStep)
    : null;
  const operationPassed = operation
    ? Boolean(
        reconstructedEndpoint &&
          sameExactPoint(reconstructedEndpoint, operation.endpoint),
      )
    : true;
  const realConceptPassed = realConcept?.root
    ? !realConcept.root.exact ||
      BigInt(realConcept.root.reconstructedPower) ===
        BigInt(realConcept.root.radicand)
    : true;
  return [
    invariantReceipt(
      "rational-point",
      rationals.length > 0,
      "all rational denominators are positive and reduced",
      rationals.map(({ symbolic }) => symbolic).join(";") || "not-applicable",
      rationalPointPassed,
    ),
    invariantReceipt(
      "radical-square-error",
      radicalSquareApplicable,
      "lower^2 <= scaled radicand < next^2",
      power
        ? `${power.lowerPower}<=${power.scaledRadicand}<${power.nextPower}`
        : "not-applicable",
      radicalPowerPassed,
    ),
    invariantReceipt(
      "absolute-value-distance",
      true,
      expectedDistance.symbolic,
      distance.symbolic,
      distancePassed,
    ),
    invariantReceipt(
      "signed-origin-stability",
      true,
      expectedSide,
      side,
      originPassed,
    ),
    invariantReceipt(
      "exact-cross-product",
      comparison !== null,
      comparison ? String(comparison.result) : "not-applicable",
      comparison ? String(comparison.result) : "not-applicable",
      comparisonPassed,
    ),
    invariantReceipt(
      "additive-endpoint",
      operation !== null,
      reconstructedEndpoint?.symbolic ?? "not-applicable",
      operation?.endpoint.symbolic ?? "not-applicable",
      operationPassed,
    ),
    invariantReceipt(
      "topic-mode-allowlist",
      true,
      "mode belongs to the exact topic allowlist",
      "mode belongs to the exact topic allowlist",
      true,
    ),
    invariantReceipt(
      "rational-operation-reconstruction",
      rationalOperation !== null,
      rationalOperation?.result.symbolic ?? "not-applicable",
      rationalOperation?.result.symbolic ?? "not-applicable",
      rationalOperation?.reconstructionPassed ?? true,
    ),
    invariantReceipt(
      "real-concept-reconstruction",
      realConcept !== null,
      realConcept?.root?.radicand.toString() ?? "classification-or-estimate",
      realConcept?.root?.reconstructedPower ?? "classification-or-estimate",
      realConceptPassed,
    ),
    invariantReceipt(
      "quadratic-radical-reconstruction",
      radicalOperation !== null,
      radicalOperation?.result.symbolic ?? "not-applicable",
      radicalOperation?.result.symbolic ?? "not-applicable",
      radicalOperation?.reconstructionPassed ?? true,
    ),
  ];
}

function encodePoint(point: ExactRealPoint | null): string {
  if (!point) return "-";
  return point.kind === "rational"
    ? `r:${point.numerator}/${point.denominator}`
    : `d:${point.sign}:${point.index}:${point.radicand}:${point.coefficient?.numerator ?? 1}/${point.coefficient?.denominator ?? 1}`;
}

function buildStateKey(state: SignedRealNumberLineSerializedState): string {
  return [
    state.version,
    `lab=${state.labId}`,
    `mode=${state.mode}`,
    `precision=${state.precision}`,
    `point=${encodePoint(state.point)}`,
    `compare=${encodePoint(state.comparisonPoint)}`,
    `start=${encodePoint(state.operationStart)}`,
    `step=${encodePoint(state.operationStep)}`,
  ].join("|");
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen);
  }
  return Object.freeze(value);
}

function validateLabId(value: unknown): SignedRealNumberLineLabId {
  if (
    typeof value !== "string" ||
    !SIGNED_REAL_NUMBER_LINE_LAB_IDS.includes(
      value as SignedRealNumberLineLabId,
    )
  ) {
    throw new SignedRealNumberLineDomainError(
      "INVALID_LAB_ID",
      `Unsupported signed real number-line lab ID: ${String(value)}.`,
    );
  }
  return value as SignedRealNumberLineLabId;
}

function validateMode(value: unknown): SignedRealNumberLineExactMode {
  if (
    typeof value !== "string" ||
    !SIGNED_REAL_NUMBER_LINE_EXACT_MODES.includes(
      value as SignedRealNumberLineExactMode,
    )
  ) {
    throw new SignedRealNumberLineDomainError(
      "INVALID_MODE",
      `Unsupported signed real number-line mode: ${String(value)}.`,
    );
  }
  return value as SignedRealNumberLineExactMode;
}

function validateModeForTopic(
  labId: SignedRealNumberLineLabId,
  mode: SignedRealNumberLineExactMode,
): SignedRealNumberLineTopicProfile {
  const profile = getSignedRealNumberLineTopicProfile(labId);
  if (!profile.allowedModes.includes(mode)) {
    throw new SignedRealNumberLineDomainError(
      "MODE_NOT_ALLOWED_FOR_TOPIC",
      `${mode} is not part of the exact curriculum contract for ${labId}.`,
    );
  }
  return profile;
}

function validatePrecision(value: unknown): number {
  assertSafeInteger(value, "precision");
  if (value < 0 || value > SIGNED_REAL_NUMBER_LINE_DOMAIN.maxPrecision) {
    throw new SignedRealNumberLineDomainError(
      "INVALID_PRECISION",
      `precision must be between 0 and ${SIGNED_REAL_NUMBER_LINE_DOMAIN.maxPrecision}.`,
    );
  }
  return value;
}

function classifyExactPoint(
  point: ExactRealPoint,
): readonly RealNumberClassification[] {
  if (point.kind === "radical") return ["irrational", "real"];
  if (point.denominator !== 1) return ["rational", "real"];
  if (point.numerator > 0) {
    return ["natural", "whole", "integer", "rational", "real"];
  }
  if (point.numerator === 0) {
    return ["whole", "integer", "rational", "real"];
  }
  return ["integer", "rational", "real"];
}

export function buildSignedRealNumberLineModel(
  input: SignedRealNumberLineInput,
): SignedRealNumberLineModel {
  if (!isRecord(input)) {
    throw new SignedRealNumberLineDomainError(
      "MISSING_MODE_INPUT",
      "Signed real number-line input is required.",
    );
  }
  const labId = validateLabId(input.labId);
  const mode = validateMode(input.mode);
  const precision = validatePrecision(input.precision);
  const topicProfile = validateModeForTopic(labId, mode);

  let point: ExactRealPoint;
  let comparison: SignedRealComparison | null = null;
  let operation: SignedNumberLineOperation | null = null;
  let rationalOperation: ExactRationalOperationReceipt | null = null;
  let realConcept: RealNumberConceptReceipt | null = null;
  let radicalOperation: QuadraticRadicalOperationReceipt | null = null;

  if (
    mode === "simplify" ||
    mode === "estimate-check" ||
    mode === "radical-add" ||
    mode === "radical-subtract" ||
    mode === "radical-multiply" ||
    mode === "radical-divide"
  ) {
    if (mode === "simplify" || mode === "estimate-check") {
      if (!("value" in input)) {
        throw new SignedRealNumberLineDomainError(
          "MISSING_MODE_INPUT",
          `${mode} requires a quadratic surd value.`,
        );
      }
      radicalOperation = buildQuadraticRadicalOperation(
        mode,
        input.value,
        null,
      );
    } else {
      if (!("left" in input) || !("right" in input)) {
        throw new SignedRealNumberLineDomainError(
          "MISSING_MODE_INPUT",
          `${mode} requires left and right quadratic surds.`,
        );
      }
      radicalOperation = buildQuadraticRadicalOperation(
        mode,
        input.left,
        input.right,
      );
    }
    point =
      radicalOperation.result.kind === "quadratic-surd"
        ? pointForQuadraticSurd(radicalOperation.result)
        : pointForQuadraticSurd(radicalOperation.left);
  } else if (mode === "square-root" || mode === "cube-root") {
    if (!("radicand" in input)) {
      throw new SignedRealNumberLineDomainError(
        "MISSING_MODE_INPUT",
        `${mode} requires an integer radicand.`,
      );
    }
    const radicand = assertInputComponent(input.radicand, "radicand");
    const index = mode === "square-root" ? 2 : 3;
    if (radicand < 0 && index === 2) {
      throw new SignedRealNumberLineDomainError(
        "EVEN_ROOT_OF_NEGATIVE",
        "A real square root requires a nonnegative radicand.",
      );
    }
    point = normalizeExactRealInput(
      { kind: "radical", radicand, index, sign: 1 },
      "root",
    );
    realConcept = {
      kind: "root",
      classification: classifyExactPoint(point),
      root: {
        index,
        radicand,
        defined: true,
        exact: point.kind === "rational",
        reconstructedPower:
          point.kind === "rational"
            ? powBigInt(BigInt(point.numerator), index).toString()
            : String(radicand),
      },
    };
  } else if (mode === "classify" || mode === "estimate") {
    if (!("value" in input)) {
      throw new SignedRealNumberLineDomainError(
        "MISSING_MODE_INPUT",
        `${mode} requires an exact real value.`,
      );
    }
    point = normalizeExactRealInput(input.value, "value");
    realConcept = {
      kind: mode === "classify" ? "classification" : "estimate",
      classification: classifyExactPoint(point),
      root: null,
    };
  } else if (mode === "compare") {
    if (!("left" in input) || !("right" in input)) {
      throw new SignedRealNumberLineDomainError(
        "MISSING_MODE_INPUT",
        "compare mode requires left and right exact values.",
      );
    }
    const left =
      topicProfile.kind === "rational"
        ? normalizeRationalInput(input.left, "left")
        : normalizeExactRealInput(input.left, "left");
    const right =
      topicProfile.kind === "rational"
        ? normalizeRationalInput(input.right, "right")
        : normalizeExactRealInput(input.right, "right");
    comparison = compareExactPoints(left, right);
    point = left;
  } else if (mode === "add" || mode === "subtract") {
    if (!("start" in input) || !("step" in input)) {
      throw new SignedRealNumberLineDomainError(
        "MISSING_MODE_INPUT",
        `${mode} mode requires start and step rational values.`,
      );
    }
    const start = normalizeRationalInput(input.start, "start");
    const step = normalizeRationalInput(input.step, "step");
    operation = buildOperation(mode, start, step, precision);
    point = operation.endpoint;
    rationalOperation = buildRationalOperationReceipt(mode, start, step);
  } else if (mode === "multiply" || mode === "divide") {
    if (!("left" in input) || !("right" in input)) {
      throw new SignedRealNumberLineDomainError(
        "MISSING_MODE_INPUT",
        `${mode} requires left and right rational values.`,
      );
    }
    const left = normalizeRationalInput(input.left, "left");
    const right = normalizeRationalInput(input.right, "right");
    rationalOperation = buildRationalOperationReceipt(mode, left, right);
    point = rationalOperation.result;
  } else if (mode === "opposite") {
    if (!("value" in input)) {
      throw new SignedRealNumberLineDomainError(
        "MISSING_MODE_INPUT",
        "opposite mode requires an exact rational value.",
      );
    }
    const value = normalizeRationalInput(input.value, "value");
    rationalOperation = buildRationalOperationReceipt("opposite", value, null);
    point = rationalOperation.result;
  } else {
    if (!("value" in input)) {
      throw new SignedRealNumberLineDomainError(
        "MISSING_MODE_INPUT",
        `${mode} mode requires an exact value.`,
      );
    }
    point =
      topicProfile.kind === "rational"
        ? normalizeRationalInput(input.value, "value")
        : normalizeExactRealInput(input.value, "value");
    if (
      mode === "radical" &&
      (!isRecord(input.value) || input.value.kind !== "radical")
    ) {
      throw new SignedRealNumberLineDomainError(
        "MODE_KIND_MISMATCH",
        "radical mode requires a radical exact value.",
      );
    }
    if (mode === "absolute-value" && point.kind === "rational") {
      rationalOperation = buildRationalOperationReceipt(
        "absolute-value",
        point,
        null,
      );
    }
  }

  const approximation = approximatePoint(point, precision);
  const origin = rationalPoint({ numerator: 0, denominator: 1 });
  const sign = pointSign(point);
  const side = sign === 0 ? "origin" : sign < 0 ? "negative" : "positive";
  const distance = absolutePoint(point);
  const absoluteValueDistance = {
    exact: distance,
    approximation: approximatePoint(distance, precision),
  };
  const invariantReceipts = buildInvariantReceipts(
    point,
    approximation,
    distance,
    sign,
    side,
    comparison,
    operation,
    rationalOperation,
    realConcept,
    radicalOperation,
  );
  if (invariantReceipts.some(({ status }) => status === "fail")) {
    throw new Error("Signed real number-line invariant construction failed.");
  }
  const state: SignedRealNumberLineSerializedState = {
    version: SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.version,
    labId,
    mode,
    precision,
    point,
    comparisonPoint: comparison?.right ?? null,
    operationStart: operation?.start ?? null,
    operationStep: operation?.inputStep ?? null,
  };
  return deepFreeze({
    family: SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.family,
    groupId: SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.groupId,
    version: SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.version,
    labId,
    mode,
    topicKind: topicProfile.kind,
    allowedModes: topicProfile.allowedModes,
    numberKind: point.kind,
    precision,
    point,
    approximation,
    origin,
    sign,
    side,
    absoluteValueDistance,
    comparison,
    operation,
    rationalOperation,
    realConcept,
    radicalOperation,
    invariantReceipts,
    state,
    stateKey: buildStateKey(state),
  });
}

export const SIGNED_REAL_NUMBER_LINE_RESET_INPUT = deepFreeze({
  labId: "bnu-junior-s1-upper-rational-numbers" as const,
  mode: "locate" as const,
  precision: 2,
  value: {
    kind: "rational" as const,
    numerator: -3,
    denominator: 2,
  },
});

export const SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS = deepFreeze({
  "bnu-junior-s1-upper-rational-numbers": SIGNED_REAL_NUMBER_LINE_RESET_INPUT,
  "hjb-primary-p6-lower-rational-numbers": {
    ...SIGNED_REAL_NUMBER_LINE_RESET_INPUT,
    labId: "hjb-primary-p6-lower-rational-numbers" as const,
  },
  "pep-junior-s1-upper-rational-numbers": {
    ...SIGNED_REAL_NUMBER_LINE_RESET_INPUT,
    labId: "pep-junior-s1-upper-rational-numbers" as const,
  },
  "bnu-junior-s2-upper-real-numbers": {
    labId: "bnu-junior-s2-upper-real-numbers" as const,
    mode: "radical" as const,
    precision: 3,
    value: {
      kind: "radical" as const,
      radicand: 2,
      index: 2,
      sign: 1 as const,
    },
  },
  "hjb-junior-s2-upper-real-numbers": {
    labId: "hjb-junior-s2-upper-real-numbers" as const,
    mode: "radical" as const,
    precision: 3,
    value: {
      kind: "radical" as const,
      radicand: 2,
      index: 2,
      sign: 1 as const,
    },
  },
  "hjb-junior-s2-upper-quadratic-radicals": {
    labId: "hjb-junior-s2-upper-quadratic-radicals" as const,
    mode: "simplify" as const,
    precision: 3,
    value: {
      kind: "quadratic-surd" as const,
      coefficient: {
        kind: "rational" as const,
        numerator: 1,
        denominator: 1,
      },
      radicand: 12,
    },
  },
}) satisfies Readonly<Record<SignedRealNumberLineLabId, SignedRealNumberLineInput>>;

export function buildSignedRealNumberLineResetModel(
  labId: SignedRealNumberLineLabId = SIGNED_REAL_NUMBER_LINE_RESET_INPUT.labId,
): SignedRealNumberLineModel {
  return buildSignedRealNumberLineModel(
    SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS[labId],
  );
}
