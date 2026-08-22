import {
  DECIMAL_ARITHMETIC_MODEL_CONTRACT,
  buildDecimalArithmeticState,
  type DecimalArithmeticState,
  type ExactDecimalOperand,
} from "./DecimalArithmeticModel";

export const EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT = deepFreeze({
  family: "algebra-solver-suite" as const,
  groupId: "G08" as const,
  version: "equation-inequality-system-v1" as const,
});

export const EQUATION_INEQUALITY_SYSTEM_LAB_IDS = deepFreeze([
  "bnu-junior-s2-lower-inequalities-systems",
  "bnu-junior-s2-upper-linear-systems",
  "pep-junior-s1-lower-equations-inequalities-data",
  "pep-primary-p5-upper-decimals-equations",
] as const);

export const EQUATION_INEQUALITY_SYSTEM_MODES = deepFreeze([
  "equation",
  "decimal-operation",
  "inequality",
  "inequality-system",
  "substitution",
  "elimination",
  "graph-intersection",
  "data",
] as const);

export type EquationInequalitySystemLabId =
  (typeof EQUATION_INEQUALITY_SYSTEM_LAB_IDS)[number];
export type EquationInequalitySystemMode =
  (typeof EQUATION_INEQUALITY_SYSTEM_MODES)[number];

export const EQUATION_INEQUALITY_SYSTEM_MODE_ALLOWLIST = deepFreeze({
  "bnu-junior-s2-lower-inequalities-systems": [
    "inequality",
    "inequality-system",
  ],
  "bnu-junior-s2-upper-linear-systems": [
    "substitution",
    "elimination",
    "graph-intersection",
  ],
  "pep-junior-s1-lower-equations-inequalities-data": [
    "inequality",
    "inequality-system",
    "substitution",
    "elimination",
    "graph-intersection",
    "data",
  ],
  "pep-primary-p5-upper-decimals-equations": [
    "equation",
    "decimal-operation",
  ],
} as const satisfies Record<
  EquationInequalitySystemLabId,
  readonly EquationInequalitySystemMode[]
>);

/**
 * Curriculum-derived chapter partition. A mixed-title Lab is never represented
 * by a single unrelated solver strand. The decimal strand delegates to G02.
 */
export const EQUATION_INEQUALITY_SYSTEM_COMPOSITE_STRANDS = deepFreeze({
  "bnu-junior-s2-lower-inequalities-systems": [
    "inequality",
    "inequality-system",
  ],
  "bnu-junior-s2-upper-linear-systems": ["linear-system"],
  "pep-junior-s1-lower-equations-inequalities-data": [
    "linear-system",
    "inequality",
    "data",
  ],
  "pep-primary-p5-upper-decimals-equations": [
    "decimal-arithmetic",
    "equation",
  ],
} as const satisfies Record<
  EquationInequalitySystemLabId,
  readonly string[]
>);

export const EQUATION_INEQUALITY_SYSTEM_DOMAIN = deepFreeze({
  maxAbsCoefficient: 50_000,
  maxDatasetSize: 64,
  maxDecimalScale: 6,
  maxDecimalPrecision: 4,
});

export type ExactRational = {
  denominator: number;
  numerator: number;
  text: string;
};

export type ExactScalarInput =
  | number
  | {
      kind: "decimal";
      scale: number;
      unscaled: number;
    }
  | {
      denominator: number;
      kind: "rational";
      numerator: number;
    };

export type LinearFormInput = {
  coefficient: ExactScalarInput;
  constant: ExactScalarInput;
};

export type LinearForm = {
  coefficient: ExactRational;
  constant: ExactRational;
};

export type LinearEquationSnapshot = {
  left: LinearForm;
  right: LinearForm;
};

export type EquationBalanceStep = {
  after: LinearEquationSnapshot;
  appliedEqually: true;
  before: LinearEquationSnapshot;
  operand: ExactRational;
  operation:
    | "subtract-linear-term"
    | "subtract-constant"
    | "divide";
};

export type EquationResidualReceipt = {
  candidate: ExactRational;
  leftProduct: ExactRational;
  leftValue: ExactRational;
  passed: boolean;
  rightProduct: ExactRational;
  rightValue: ExactRational;
  signedResidual: ExactRational;
};

export type DecimalEquationExactnessReceipt = {
  commonScale: number;
  powerOfTen: number;
  reconstructs: boolean;
  scaledEquation: {
    leftCoefficient: number;
    leftConstant: number;
    rightCoefficient: number;
    rightConstant: number;
  };
};

export type EquationClassification = "unique" | "infinite" | "none";

export type EquationState = {
  balance: {
    final: LinearEquationSnapshot;
    initial: LinearEquationSnapshot;
    steps: EquationBalanceStep[];
  };
  candidateResidual: EquationResidualReceipt | null;
  classification: EquationClassification;
  classificationReceipt: {
    effectiveCoefficient: ExactRational;
    effectiveConstant: ExactRational;
    reducedStatement: string;
  };
  decimalExactness: DecimalEquationExactnessReceipt;
  effectiveCoefficient: ExactRational;
  effectiveConstant: ExactRational;
  solution: ExactRational | null;
  solutionResidual: EquationResidualReceipt | null;
};

export type InequalityRelation = "<" | "<=" | ">" | ">=";
export type InequalityRelationInput =
  | InequalityRelation
  | "≤"
  | "≥";

export type InequalityOperationInput = {
  factor: ExactScalarInput;
  operation: "multiply" | "divide";
};

export type LinearInequalityInput = {
  left: LinearFormInput;
  operationStep?: InequalityOperationInput;
  relation: InequalityRelationInput;
  right: LinearFormInput;
};

export type LinearInequalitySnapshot = {
  left: LinearForm;
  relation: InequalityRelation;
  right: LinearForm;
};

export type InequalityTransformationReceipt = {
  after: LinearInequalitySnapshot;
  before: LinearInequalitySnapshot;
  factor: ExactRational;
  factorSign: "negative" | "positive";
  operation: "multiply" | "divide";
  reconstructionPassed: boolean;
  relationAfter: InequalityRelation;
  relationBefore: InequalityRelation;
  signReversed: boolean;
};

export type InequalitySolutionSet =
  | {
      kind: "all-real";
    }
  | {
      kind: "empty";
      reason: "constant-statement-false";
    }
  | {
      boundary: ExactRational;
      direction: "left" | "right";
      endpointClosed: boolean;
      kind: "ray";
      relation: InequalityRelation;
    };

export type SolvedInequality = {
  classification: "ray" | "all-real" | "empty";
  coefficientPath: "positive-coefficient" | "negative-coefficient" | "degenerate";
  effectiveCoefficient: ExactRational;
  effectiveConstant: ExactRational;
  initial: LinearInequalitySnapshot;
  operationProof: InequalityTransformationReceipt | null;
  probeChecks: InequalityProbeCheck[];
  reduced: LinearInequalitySnapshot;
  solutionSet: InequalitySolutionSet;
  solveTransformation: InequalityTransformationReceipt | null;
};

export type InequalityProbeCheck = {
  matchesSolutionSet: boolean;
  originalHolds: boolean;
  role: "boundary" | "below-boundary" | "above-boundary" | "negative-probe" | "zero-probe" | "positive-probe";
  solutionSetContains: boolean;
  x: ExactRational;
};

export type InequalitySystemEndpoint = {
  closed: boolean;
  sourceConstraintIndexes: number[];
  value: ExactRational;
};

export type InequalitySystemIntersection =
  | {
      kind: "all-real";
    }
  | {
      kind: "empty";
      reason: "constraint-empty" | "disjoint-bounds" | "open-touch";
    }
  | {
      kind: "interval";
      lower: InequalitySystemEndpoint | null;
      upper: InequalitySystemEndpoint | null;
    };

export type InequalitySystemMembershipAuditCheck = {
  constraintHolds: [boolean, boolean];
  expectedIntersectionContains: boolean;
  intersectionContains: boolean;
  passed: boolean;
  x: ExactRational;
};

export type InequalitySystemIntersectionAuditReceipt = {
  expectedEmptyReason:
    | "constraint-empty"
    | "disjoint-bounds"
    | "open-touch"
    | null;
  expectedKind: InequalitySystemIntersection["kind"];
  expectedLowerSourceConstraintIndexes: number[];
  expectedUpperSourceConstraintIndexes: number[];
  kindPassed: boolean;
  membershipChecks: InequalitySystemMembershipAuditCheck[];
  membershipPassed: boolean;
  openTouchPassed: boolean;
  passed: boolean;
  sourceIndexesPassed: boolean;
};

export type LinearSystemEquation = {
  constant: ExactScalarInput;
  xCoefficient: ExactScalarInput;
  yCoefficient: ExactScalarInput;
};

export type ExactLinearSystemEquation = {
  constant: ExactRational;
  xCoefficient: ExactRational;
  yCoefficient: ExactRational;
};

export type ExactPointInput = {
  x: ExactScalarInput;
  y: ExactScalarInput;
};

export type ExactPoint = {
  x: ExactRational;
  y: ExactRational;
};

export type LinearSystemResidual = {
  constant: ExactRational;
  leftValue: ExactRational;
  passed: boolean;
  signedResidual: ExactRational;
  xProduct: ExactRational;
  yProduct: ExactRational;
};

export type DualResidualReceipt = {
  first: LinearSystemResidual;
  second: LinearSystemResidual;
};

export type EliminationReceipt = {
  backSubstitution: {
    equationIndex: 0 | 1;
    reconstructedConstant: ExactRational;
    solvedX: ExactRational;
  };
  combinedEquation: ExactLinearSystemEquation;
  eliminatedVariable: "x";
  multipliers: {
    first: ExactRational;
    second: ExactRational;
  };
  reconstructedPoint: ExactPoint;
  scaledEquations: {
    first: ExactLinearSystemEquation;
    second: ExactLinearSystemEquation;
  };
  solvedValue: ExactRational;
  solvedVariable: "y";
};

export type SubstitutionReceipt = {
  expression: {
    constant: ExactRational;
    otherCoefficient: ExactRational;
  };
  otherValue: ExactRational;
  otherVariable: "x" | "y";
  pivotEquationIndex: 0;
  reconstructedPoint: ExactPoint;
  subject: "x" | "y";
  subjectValue: ExactRational;
  substitutedEquation: {
    coefficient: ExactRational;
    constant: ExactRational;
  };
};

export type LinearSystemClassification = "unique" | "infinite" | "none";

export type LinearSystemState = {
  candidateCheck: {
    point: ExactPoint;
    residuals: DualResidualReceipt;
    satisfiesBoth: boolean;
  } | null;
  classification: LinearSystemClassification;
  classificationReceipt: {
    determinant: ExactRational;
    impossibleRowIndexes: number[];
    reason:
      | "unique-determinant"
      | "parallel-distinct"
      | "coincident"
      | "contradictory-zero-row"
      | "universal-system"
      | "underdetermined";
    xNumerator: ExactRational;
    yNumerator: ExactRational;
  };
  determinant: ExactRational;
  equations: [ExactLinearSystemEquation, ExactLinearSystemEquation];
  intersection: {
    exact: true;
    kind: "exact-rational";
    x: ExactRational;
    y: ExactRational;
  } | null;
  methodReceipts: {
    elimination: EliminationReceipt;
    substitution: SubstitutionReceipt;
  } | null;
  selectedMethod: "substitution" | "elimination" | "graph-intersection";
  solutionResiduals: DualResidualReceipt | null;
};

export type DataState = {
  count: number;
  frequencies: Array<{
    count: number;
    value: ExactRational;
  }>;
  mean: ExactRational;
  median: ExactRational;
  range: ExactRational;
  reconstruction: {
    frequencyCount: number;
    frequencyWeightedSum: ExactRational;
    meanTimesCount: ExactRational;
    medianSourceIndexes: [number, number];
    passed: boolean;
    rangeEndpoints: {
      maximum: ExactRational;
      minimum: ExactRational;
    };
    residual: ExactRational;
  };
  sortedValues: ExactRational[];
  sum: ExactRational;
  values: ExactRational[];
};

export type DecimalOperationReconstruction =
  | {
      kind: "scaled-product";
      leftUnscaled: number;
      passed: boolean;
      productUnscaled: number;
      reconstructed: ExactRational;
      resultScale: number;
      rightUnscaled: number;
    }
  | {
      dividend: number;
      divisor: number;
      kind: "division-identity";
      passed: boolean;
      quotient: number;
      reconstructedDividend: number;
      remainder: number;
    };

export type DecimalOperationState = {
  childModel: DecimalArithmeticState;
  delegatedFamily: typeof DECIMAL_ARITHMETIC_MODEL_CONTRACT.family;
  delegatedVersion: typeof DECIMAL_ARITHMETIC_MODEL_CONTRACT.version;
  exactResult: ExactRational;
  operation: "multiply" | "divide";
  reconstruction: DecimalOperationReconstruction;
  scaledIntegerReceipt: {
    left: ExactDecimalOperand & { exact: ExactRational };
    observedResult: ExactRational;
    operation: "multiply" | "divide";
    passed: boolean;
    reconstructedResult: ExactRational;
    right: ExactDecimalOperand & { exact: ExactRational };
  };
};

export type EquationInequalitySystemInvariantId =
  | "equation-balance"
  | "equation-substitution-residual"
  | "inequality-endpoint-openness"
  | "inequality-sign-reversal"
  | "inequality-system-intersection"
  | "line-intersection"
  | "linear-system-dual-residual"
  | "decimal-scaled-integer-exactness"
  | "decimal-arithmetic-delegation"
  | "data-count-sum-mean"
  | "data-summary-exactness";

export type EquationInequalitySystemInvariantOwner =
  | "equation"
  | "decimal-operation"
  | "inequality"
  | "constraint:0"
  | "constraint:1"
  | "intersection"
  | "linear-system"
  | "data";

export type EquationInequalitySystemInvariantScope =
  | "equation"
  | "decimal-operation"
  | "inequality"
  | "inequality-system-constraint"
  | "inequality-system-intersection"
  | "linear-system"
  | "data";

type EquationInequalitySystemInvariantReceiptBase = {
  exact: true;
  expected: string;
  id: EquationInequalitySystemInvariantId;
  observed: string;
  owner: EquationInequalitySystemInvariantOwner;
  receiptId: string;
  residual:
    | ExactRational
    | {
        first: ExactRational;
        second: ExactRational;
      }
    | null;
  scope: EquationInequalitySystemInvariantScope;
};

export type EquationInequalitySystemInvariantReceipt =
  | (EquationInequalitySystemInvariantReceiptBase & {
      applicable: true;
      holds: true;
      passed: true;
      status: "passed";
    })
  | (EquationInequalitySystemInvariantReceiptBase & {
      applicable: true;
      holds: false;
      passed: false;
      status: "failed";
    })
  | (EquationInequalitySystemInvariantReceiptBase & {
      applicable: false;
      holds: null;
      passed: false;
      status: "not-applicable";
    });

type ModelBase<M extends EquationInequalitySystemMode> = {
  family: typeof EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.family;
  groupId: typeof EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.groupId;
  invariantReceipts: EquationInequalitySystemInvariantReceipt[];
  labId: EquationInequalitySystemLabId;
  mode: M;
  state: Record<string, unknown>;
  stateKey: string;
  version: typeof EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.version;
};

export type EquationModel = ModelBase<"equation"> & {
  equation: EquationState;
};

export type DecimalOperationModel = ModelBase<"decimal-operation"> & {
  decimalOperation: DecimalOperationState;
};

export type InequalityModel = ModelBase<"inequality"> & {
  inequality: SolvedInequality;
};

export type InequalitySystemModel = ModelBase<"inequality-system"> & {
  inequalitySystem: {
    constraints: [SolvedInequality, SolvedInequality];
    intersection: InequalitySystemIntersection;
    intersectionAudit: InequalitySystemIntersectionAuditReceipt;
  };
};

export type SystemModel = ModelBase<
  "substitution" | "elimination" | "graph-intersection"
> & {
  system: LinearSystemState;
};

export type DataModel = ModelBase<"data"> & {
  data: DataState;
};

export type EquationInequalitySystemModel =
  | EquationModel
  | DecimalOperationModel
  | InequalityModel
  | InequalitySystemModel
  | SystemModel
  | DataModel;

export type EquationInput = {
  candidate?: ExactScalarInput;
  labId: EquationInequalitySystemLabId;
  left: LinearFormInput;
  mode: "equation";
  right: LinearFormInput;
};

export type DecimalOperationInput = {
  labId: EquationInequalitySystemLabId;
  left: ExactDecimalOperand;
  mode: "decimal-operation";
  operation: "multiply" | "divide";
  precision: number;
  right: ExactDecimalOperand;
};

export type InequalityInput = LinearInequalityInput & {
  labId: EquationInequalitySystemLabId;
  mode: "inequality";
};

export type InequalitySystemInput = {
  constraints: readonly [LinearInequalityInput, LinearInequalityInput];
  labId: EquationInequalitySystemLabId;
  mode: "inequality-system";
};

export type SystemInput = {
  candidate?: ExactPointInput;
  equations: readonly [LinearSystemEquation, LinearSystemEquation];
  labId: EquationInequalitySystemLabId;
  mode: "substitution" | "elimination" | "graph-intersection";
};

export type DataInput = {
  dataset: readonly ExactScalarInput[];
  labId: EquationInequalitySystemLabId;
  mode: "data";
};

export type EquationInequalitySystemInput =
  | EquationInput
  | DecimalOperationInput
  | InequalityInput
  | InequalitySystemInput
  | SystemInput
  | DataInput;

export type EquationInequalitySystemDomainErrorCode =
  | "INVALID_INPUT"
  | "INVALID_LAB_ID"
  | "INVALID_MODE"
  | "MODE_NOT_ALLOWED"
  | "INVALID_RELATION"
  | "INVALID_COEFFICIENT"
  | "NON_FINITE_COEFFICIENT"
  | "NON_INTEGER_COEFFICIENT"
  | "UNSAFE_COEFFICIENT"
  | "COEFFICIENT_OUT_OF_DOMAIN"
  | "ZERO_DENOMINATOR"
  | "INVALID_DECIMAL_SCALE"
  | "NON_TERMINATING_DECIMAL_COEFFICIENT"
  | "INVALID_OPERATION"
  | "ZERO_OPERATION_FACTOR"
  | "DIVISION_BY_ZERO"
  | "INVALID_DECIMAL_PRECISION"
  | "INVALID_SYSTEM_SHAPE"
  | "EMPTY_DATASET"
  | "DATASET_TOO_LARGE"
  | "UNSAFE_RESULT"
  | "DECIMAL_CHILD_REJECTED"
  | "INTERNAL_INVARIANT_FAILURE";

export class EquationInequalitySystemDomainError extends RangeError {
  readonly code: EquationInequalitySystemDomainErrorCode;

  constructor(
    code: EquationInequalitySystemDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "EquationInequalitySystemDomainError";
    this.code = code;
  }
}

type UnknownRecord = Record<string, unknown>;
type ScalarReceipt = {
  decimal: {
    scale: number;
    unscaled: number;
  } | null;
  exact: ExactRational;
};

const BIG_ZERO = BigInt(0);
const BIG_ONE = BigInt(1);
const BIG_TEN = BigInt(10);

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(object)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalNumber(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function absoluteBigInt(value: bigint): bigint {
  return value < BIG_ZERO ? -value : value;
}

function gcdBigInt(left: bigint, right: bigint): bigint {
  let a = absoluteBigInt(left);
  let b = absoluteBigInt(right);
  while (b !== BIG_ZERO) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a === BIG_ZERO ? BIG_ONE : a;
}

function toSafeNumber(value: bigint, field: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || BigInt(number) !== value) {
    throw new EquationInequalitySystemDomainError(
      "UNSAFE_RESULT",
      `${field} exceeds the JSON-safe exact-integer result domain.`,
    );
  }
  return canonicalNumber(number);
}

function exactRationalFromBigInt(
  numerator: bigint,
  denominator: bigint,
): ExactRational {
  if (denominator === BIG_ZERO) {
    throw new EquationInequalitySystemDomainError(
      "DIVISION_BY_ZERO",
      "An exact rational result cannot have denominator zero.",
    );
  }
  const sign = denominator < BIG_ZERO ? -BIG_ONE : BIG_ONE;
  const divisor = gcdBigInt(numerator, denominator);
  const normalizedNumerator = (sign * numerator) / divisor;
  const normalizedDenominator = absoluteBigInt(denominator / divisor);
  const numeratorNumber = toSafeNumber(
    normalizedNumerator,
    "rational numerator",
  );
  const denominatorNumber = toSafeNumber(
    normalizedDenominator,
    "rational denominator",
  );
  return {
    denominator: denominatorNumber,
    numerator: numeratorNumber,
    text:
      denominatorNumber === 1
        ? String(numeratorNumber)
        : `${numeratorNumber}/${denominatorNumber}`,
  };
}

function exactInteger(value: number): ExactRational {
  return exactRationalFromBigInt(BigInt(value), BIG_ONE);
}

function addRational(
  left: ExactRational,
  right: ExactRational,
): ExactRational {
  return exactRationalFromBigInt(
    BigInt(left.numerator) * BigInt(right.denominator) +
      BigInt(right.numerator) * BigInt(left.denominator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function subtractRational(
  left: ExactRational,
  right: ExactRational,
): ExactRational {
  return exactRationalFromBigInt(
    BigInt(left.numerator) * BigInt(right.denominator) -
      BigInt(right.numerator) * BigInt(left.denominator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function multiplyRational(
  left: ExactRational,
  right: ExactRational,
): ExactRational {
  return exactRationalFromBigInt(
    BigInt(left.numerator) * BigInt(right.numerator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function divideRational(
  left: ExactRational,
  right: ExactRational,
): ExactRational {
  if (right.numerator === 0) {
    throw new EquationInequalitySystemDomainError(
      "DIVISION_BY_ZERO",
      "Exact division by zero is not defined.",
    );
  }
  return exactRationalFromBigInt(
    BigInt(left.numerator) * BigInt(right.denominator),
    BigInt(left.denominator) * BigInt(right.numerator),
  );
}

function negateRational(value: ExactRational): ExactRational {
  return exactRationalFromBigInt(
    -BigInt(value.numerator),
    BigInt(value.denominator),
  );
}

function compareRational(
  left: ExactRational,
  right: ExactRational,
): -1 | 0 | 1 {
  const difference =
    BigInt(left.numerator) * BigInt(right.denominator) -
    BigInt(right.numerator) * BigInt(left.denominator);
  return difference < BIG_ZERO ? -1 : difference > BIG_ZERO ? 1 : 0;
}

function rationalEqual(left: ExactRational, right: ExactRational): boolean {
  return (
    left.numerator === right.numerator &&
    left.denominator === right.denominator
  );
}

function isZero(value: ExactRational): boolean {
  return value.numerator === 0;
}

function assertFiniteSafeDomainInteger(
  value: unknown,
  field: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new EquationInequalitySystemDomainError(
      "NON_FINITE_COEFFICIENT",
      `${field} must be a finite number.`,
    );
  }
  if (!Number.isInteger(value)) {
    throw new EquationInequalitySystemDomainError(
      "NON_INTEGER_COEFFICIENT",
      `${field} must use an exact integer, rational, or scaled-decimal representation.`,
    );
  }
  if (!Number.isSafeInteger(value)) {
    throw new EquationInequalitySystemDomainError(
      "UNSAFE_COEFFICIENT",
      `${field} must be a safe integer.`,
    );
  }
  if (Math.abs(value) > EQUATION_INEQUALITY_SYSTEM_DOMAIN.maxAbsCoefficient) {
    throw new EquationInequalitySystemDomainError(
      "COEFFICIENT_OUT_OF_DOMAIN",
      `${field} exceeds the exact coefficient domain.`,
    );
  }
  return canonicalNumber(value);
}

function pow10(exponent: number): number {
  let value = BIG_ONE;
  for (let index = 0; index < exponent; index += 1) value *= BIG_TEN;
  return toSafeNumber(value, "power of ten");
}

function decimalRepresentation(value: ExactRational, field: string) {
  for (
    let scale = 0;
    scale <= EQUATION_INEQUALITY_SYSTEM_DOMAIN.maxDecimalScale;
    scale += 1
  ) {
    const power = BigInt(pow10(scale));
    const scaledNumerator = BigInt(value.numerator) * power;
    const denominator = BigInt(value.denominator);
    if (scaledNumerator % denominator === BIG_ZERO) {
      return {
        scale,
        unscaled: toSafeNumber(
          scaledNumerator / denominator,
          `${field} scaled integer`,
        ),
      };
    }
  }
  throw new EquationInequalitySystemDomainError(
    "NON_TERMINATING_DECIMAL_COEFFICIENT",
    `${field} cannot be represented within the exact decimal scale domain.`,
  );
}

function normalizeScalar(value: unknown, field: string): ScalarReceipt {
  if (typeof value === "number") {
    const integer = assertFiniteSafeDomainInteger(value, field);
    return {
      decimal: { scale: 0, unscaled: integer },
      exact: exactInteger(integer),
    };
  }
  if (!isRecord(value)) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_COEFFICIENT",
      `${field} must be an exact scalar.`,
    );
  }
  if (value.kind === "decimal") {
    const unscaled = assertFiniteSafeDomainInteger(
      value.unscaled,
      `${field}.unscaled`,
    );
    const scale = assertFiniteSafeDomainInteger(value.scale, `${field}.scale`);
    if (
      scale < 0 ||
      scale > EQUATION_INEQUALITY_SYSTEM_DOMAIN.maxDecimalScale
    ) {
      throw new EquationInequalitySystemDomainError(
        "INVALID_DECIMAL_SCALE",
        `${field}.scale must be between 0 and ${EQUATION_INEQUALITY_SYSTEM_DOMAIN.maxDecimalScale}.`,
      );
    }
    return {
      decimal: { scale, unscaled },
      exact: exactRationalFromBigInt(
        BigInt(unscaled),
        BigInt(pow10(scale)),
      ),
    };
  }
  if (value.kind === "rational") {
    const numerator = assertFiniteSafeDomainInteger(
      value.numerator,
      `${field}.numerator`,
    );
    const denominator = assertFiniteSafeDomainInteger(
      value.denominator,
      `${field}.denominator`,
    );
    if (denominator === 0) {
      throw new EquationInequalitySystemDomainError(
        "ZERO_DENOMINATOR",
        `${field}.denominator cannot be zero.`,
      );
    }
    const exact = exactRationalFromBigInt(
      BigInt(numerator),
      BigInt(denominator),
    );
    let decimal: ScalarReceipt["decimal"] = null;
    try {
      decimal = decimalRepresentation(exact, field);
    } catch (error) {
      if (
        !(
          error instanceof EquationInequalitySystemDomainError &&
          error.code === "NON_TERMINATING_DECIMAL_COEFFICIENT"
        )
      ) {
        throw error;
      }
    }
    return {
      decimal,
      exact,
    };
  }
  throw new EquationInequalitySystemDomainError(
    "INVALID_COEFFICIENT",
    `${field} must declare kind decimal or rational.`,
  );
}

function normalizeLinearForm(value: unknown, field: string) {
  if (!isRecord(value)) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_COEFFICIENT",
      `${field} must contain coefficient and constant exact scalars.`,
    );
  }
  const coefficient = normalizeScalar(
    value.coefficient,
    `${field}.coefficient`,
  );
  const constant = normalizeScalar(value.constant, `${field}.constant`);
  return {
    form: {
      coefficient: coefficient.exact,
      constant: constant.exact,
    },
    receipts: { coefficient, constant },
  };
}

function validateLabId(value: unknown): EquationInequalitySystemLabId {
  if (
    typeof value !== "string" ||
    !EQUATION_INEQUALITY_SYSTEM_LAB_IDS.includes(
      value as EquationInequalitySystemLabId,
    )
  ) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_LAB_ID",
      `Unsupported G08 Lab ID: ${String(value)}.`,
    );
  }
  return value as EquationInequalitySystemLabId;
}

function validateMode(value: unknown): EquationInequalitySystemMode {
  if (
    typeof value !== "string" ||
    !EQUATION_INEQUALITY_SYSTEM_MODES.includes(
      value as EquationInequalitySystemMode,
    )
  ) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_MODE",
      `Unsupported G08 mode: ${String(value)}.`,
    );
  }
  return value as EquationInequalitySystemMode;
}

function validateRelation(value: unknown): InequalityRelation {
  if (value === "<" || value === "<=" || value === ">" || value === ">=") {
    return value;
  }
  if (value === "≤") return "<=";
  if (value === "≥") return ">=";
  throw new EquationInequalitySystemDomainError(
    "INVALID_RELATION",
    `Unsupported inequality relation: ${String(value)}.`,
  );
}

function reverseRelation(relation: InequalityRelation): InequalityRelation {
  if (relation === "<") return ">";
  if (relation === "<=") return ">=";
  if (relation === ">") return "<";
  return "<=";
}

function relationHolds(
  left: ExactRational,
  right: ExactRational,
  relation: InequalityRelation,
): boolean {
  const comparison = compareRational(left, right);
  if (relation === "<") return comparison < 0;
  if (relation === "<=") return comparison <= 0;
  if (relation === ">") return comparison > 0;
  return comparison >= 0;
}

function solutionSetContains(
  solutionSet: InequalitySolutionSet,
  x: ExactRational,
): boolean {
  if (solutionSet.kind === "all-real") return true;
  if (solutionSet.kind === "empty") return false;
  return relationHolds(x, solutionSet.boundary, solutionSet.relation);
}

function buildInequalityProbeChecks(
  initial: LinearInequalitySnapshot,
  solutionSet: InequalitySolutionSet,
): InequalityProbeCheck[] {
  const probes: Array<{
    role: InequalityProbeCheck["role"];
    x: ExactRational;
  }> =
    solutionSet.kind === "ray"
      ? [
          { role: "boundary", x: solutionSet.boundary },
          {
            role: "below-boundary",
            x: subtractRational(solutionSet.boundary, exactInteger(1)),
          },
          {
            role: "above-boundary",
            x: addRational(solutionSet.boundary, exactInteger(1)),
          },
        ]
      : [
          { role: "negative-probe", x: exactInteger(-1) },
          { role: "zero-probe", x: exactInteger(0) },
          { role: "positive-probe", x: exactInteger(1) },
        ];
  return probes.map(({ role, x }) => {
    const leftValue = addRational(
      multiplyRational(initial.left.coefficient, x),
      initial.left.constant,
    );
    const rightValue = addRational(
      multiplyRational(initial.right.coefficient, x),
      initial.right.constant,
    );
    const originalHolds = relationHolds(
      leftValue,
      rightValue,
      initial.relation,
    );
    const contains = solutionSetContains(solutionSet, x);
    return {
      matchesSolutionSet: originalHolds === contains,
      originalHolds,
      role,
      solutionSetContains: contains,
      x,
    };
  });
}

function invariantScopeForOwner(
  owner: EquationInequalitySystemInvariantOwner,
): EquationInequalitySystemInvariantScope {
  if (owner === "constraint:0" || owner === "constraint:1") {
    return "inequality-system-constraint";
  }
  if (owner === "intersection") return "inequality-system-intersection";
  return owner;
}

function invariantReceipt(
  id: EquationInequalitySystemInvariantId,
  owner: EquationInequalitySystemInvariantOwner,
  applicable: boolean,
  passed: boolean,
  expected: string,
  observed: string,
  residual: EquationInequalitySystemInvariantReceipt["residual"] = applicable
    ? exactInteger(0)
    : null,
): EquationInequalitySystemInvariantReceipt {
  const scope = invariantScopeForOwner(owner);
  const common = {
    exact: true as const,
    expected,
    id,
    observed,
    owner,
    receiptId: `${scope}:${owner}:${id}`,
    residual,
    scope,
  };
  if (!applicable) {
    return {
      ...common,
      applicable: false,
      holds: null,
      passed: false,
      status: "not-applicable",
    };
  }
  if (!passed) {
    throw new EquationInequalitySystemDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      `${id} failed: expected ${expected}, observed ${observed}.`,
    );
  }
  return {
    ...common,
    applicable: true,
    holds: true,
    passed: true,
    status: "passed",
  };
}

function finalizeModel<T extends Omit<EquationInequalitySystemModel, "stateKey">>(
  model: T,
): T & { stateKey: string } {
  const stateKey = JSON.stringify(model.state);
  return deepFreeze({ ...model, stateKey });
}

function applyEquationStep(
  snapshot: LinearEquationSnapshot,
  operation: EquationBalanceStep["operation"],
  operand: ExactRational,
): LinearEquationSnapshot {
  const transform = (form: LinearForm): LinearForm => {
    if (operation === "subtract-linear-term") {
      return {
        coefficient: subtractRational(form.coefficient, operand),
        constant: form.constant,
      };
    }
    if (operation === "subtract-constant") {
      return {
        coefficient: form.coefficient,
        constant: subtractRational(form.constant, operand),
      };
    }
    return {
      coefficient: divideRational(form.coefficient, operand),
      constant: divideRational(form.constant, operand),
    };
  };
  return { left: transform(snapshot.left), right: transform(snapshot.right) };
}

function makeBalanceStep(
  before: LinearEquationSnapshot,
  operation: EquationBalanceStep["operation"],
  operand: ExactRational,
): EquationBalanceStep {
  return {
    after: applyEquationStep(before, operation, operand),
    appliedEqually: true,
    before,
    operand,
    operation,
  };
}

function evaluateEquation(
  snapshot: LinearEquationSnapshot,
  candidate: ExactRational,
): EquationResidualReceipt {
  const leftProduct = multiplyRational(
    snapshot.left.coefficient,
    candidate,
  );
  const leftValue = addRational(leftProduct, snapshot.left.constant);
  const rightProduct = multiplyRational(
    snapshot.right.coefficient,
    candidate,
  );
  const rightValue = addRational(rightProduct, snapshot.right.constant);
  const signedResidual = subtractRational(leftValue, rightValue);
  return {
    candidate,
    leftProduct,
    leftValue,
    passed: isZero(signedResidual),
    rightProduct,
    rightValue,
    signedResidual,
  };
}

function buildDecimalEquationExactness(
  receipts: {
    leftCoefficient: ScalarReceipt;
    leftConstant: ScalarReceipt;
    rightCoefficient: ScalarReceipt;
    rightConstant: ScalarReceipt;
  },
): DecimalEquationExactnessReceipt {
  const entries = Object.values(receipts);
  const commonScale = Math.max(
    ...entries.map(({ decimal }) => {
      if (!decimal) {
        throw new EquationInequalitySystemDomainError(
          "NON_TERMINATING_DECIMAL_COEFFICIENT",
          "Equation coefficients must have a finite scaled-integer decimal representation.",
        );
      }
      return decimal.scale;
    }),
  );
  const powerOfTen = pow10(commonScale);
  const align = (receipt: ScalarReceipt, field: string) => {
    if (!receipt.decimal) {
      throw new EquationInequalitySystemDomainError(
        "NON_TERMINATING_DECIMAL_COEFFICIENT",
        `${field} lacks an exact decimal representation.`,
      );
    }
    return toSafeNumber(
      BigInt(receipt.decimal.unscaled) *
        BigInt(pow10(commonScale - receipt.decimal.scale)),
      `${field} aligned scaled integer`,
    );
  };
  const scaledEquation = {
    leftCoefficient: align(receipts.leftCoefficient, "left coefficient"),
    leftConstant: align(receipts.leftConstant, "left constant"),
    rightCoefficient: align(receipts.rightCoefficient, "right coefficient"),
    rightConstant: align(receipts.rightConstant, "right constant"),
  };
  const reconstructs =
    rationalEqual(
      exactRationalFromBigInt(
        BigInt(scaledEquation.leftCoefficient),
        BigInt(powerOfTen),
      ),
      receipts.leftCoefficient.exact,
    ) &&
    rationalEqual(
      exactRationalFromBigInt(
        BigInt(scaledEquation.leftConstant),
        BigInt(powerOfTen),
      ),
      receipts.leftConstant.exact,
    ) &&
    rationalEqual(
      exactRationalFromBigInt(
        BigInt(scaledEquation.rightCoefficient),
        BigInt(powerOfTen),
      ),
      receipts.rightCoefficient.exact,
    ) &&
    rationalEqual(
      exactRationalFromBigInt(
        BigInt(scaledEquation.rightConstant),
        BigInt(powerOfTen),
      ),
      receipts.rightConstant.exact,
    );
  return { commonScale, powerOfTen, reconstructs, scaledEquation };
}

function buildEquationModel(
  input: UnknownRecord,
  labId: EquationInequalitySystemLabId,
): EquationModel {
  const left = normalizeLinearForm(input.left, "left");
  const right = normalizeLinearForm(input.right, "right");
  const initial: LinearEquationSnapshot = {
    left: left.form,
    right: right.form,
  };
  const effectiveCoefficient = subtractRational(
    initial.left.coefficient,
    initial.right.coefficient,
  );
  const effectiveConstant = subtractRational(
    initial.right.constant,
    initial.left.constant,
  );
  const variableStep = makeBalanceStep(
    initial,
    "subtract-linear-term",
    initial.right.coefficient,
  );
  const constantStep = makeBalanceStep(
    variableStep.after,
    "subtract-constant",
    initial.left.constant,
  );
  const steps: EquationBalanceStep[] = [variableStep, constantStep];
  if (!isZero(effectiveCoefficient)) {
    steps.push(
      makeBalanceStep(
        constantStep.after,
        "divide",
        effectiveCoefficient,
      ),
    );
  }
  const final = steps[steps.length - 1]!.after;
  const classification: EquationClassification = !isZero(effectiveCoefficient)
    ? "unique"
    : isZero(effectiveConstant)
      ? "infinite"
      : "none";
  const solution =
    classification === "unique"
      ? divideRational(effectiveConstant, effectiveCoefficient)
      : null;
  const solutionResidual = solution ? evaluateEquation(initial, solution) : null;
  const candidate =
    input.candidate === undefined
      ? null
      : normalizeScalar(input.candidate, "candidate").exact;
  const candidateResidual = candidate
    ? evaluateEquation(initial, candidate)
    : null;
  const decimalExactness = buildDecimalEquationExactness({
    leftCoefficient: left.receipts.coefficient,
    leftConstant: left.receipts.constant,
    rightCoefficient: right.receipts.coefficient,
    rightConstant: right.receipts.constant,
  });
  const reducedStatement = isZero(effectiveCoefficient)
    ? `0 = ${effectiveConstant.text}`
    : `${effectiveCoefficient.text}x = ${effectiveConstant.text}`;
  const balancePassed =
    rationalEqual(final.left.coefficient, classification === "unique" ? exactInteger(1) : effectiveCoefficient) &&
    isZero(final.left.constant) &&
    isZero(final.right.coefficient) &&
    rationalEqual(
      final.right.constant,
      classification === "unique" ? solution! : effectiveConstant,
    );
  const invariantReceipts = [
    invariantReceipt(
      "equation-balance",
      "equation",
      true,
      balancePassed,
      classification === "unique" ? "x = exact solution" : reducedStatement,
      classification === "unique"
        ? `x = ${final.right.constant.text}`
        : reducedStatement,
    ),
    invariantReceipt(
      "equation-substitution-residual",
      "equation",
      classification === "unique",
      solutionResidual?.passed ?? true,
      classification === "unique" ? "0" : "not-applicable",
      solutionResidual?.signedResidual.text ?? "not-applicable",
      solutionResidual?.signedResidual ?? null,
    ),
    invariantReceipt(
      "decimal-scaled-integer-exactness",
      "equation",
      true,
      decimalExactness.reconstructs,
      "all coefficients reconstructed",
      decimalExactness.reconstructs
        ? "all coefficients reconstructed"
        : "reconstruction mismatch",
    ),
  ];
  const equation: EquationState = {
    balance: { final, initial, steps },
    candidateResidual,
    classification,
    classificationReceipt: {
      effectiveCoefficient,
      effectiveConstant,
      reducedStatement,
    },
    decimalExactness,
    effectiveCoefficient,
    effectiveConstant,
    solution,
    solutionResidual,
  };
  const state = {
    classification,
    decimalExactness,
    labId,
    left: initial.left,
    mode: "equation",
    right: initial.right,
    candidate,
  };
  return finalizeModel({
    equation,
    family: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.family,
    groupId: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.groupId,
    invariantReceipts,
    labId,
    mode: "equation",
    state,
    version: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.version,
  });
}

function validateDecimalOperand(
  value: unknown,
  field: string,
): ExactDecimalOperand {
  if (!isRecord(value)) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_COEFFICIENT",
      `${field} must be a scaled-decimal operand.`,
    );
  }
  const unscaled = assertFiniteSafeDomainInteger(
    value.unscaled,
    `${field}.unscaled`,
  );
  const scale = assertFiniteSafeDomainInteger(value.scale, `${field}.scale`);
  if (scale < 0 || scale > 3) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_DECIMAL_SCALE",
      `${field}.scale must be between 0 and 3 for G02 delegation.`,
    );
  }
  return { scale, unscaled };
}

function buildDecimalOperationModel(
  input: UnknownRecord,
  labId: EquationInequalitySystemLabId,
): DecimalOperationModel {
  if (input.operation !== "multiply" && input.operation !== "divide") {
    throw new EquationInequalitySystemDomainError(
      "INVALID_OPERATION",
      "Decimal operation mode supports multiply or divide only.",
    );
  }
  const left = validateDecimalOperand(input.left, "left");
  const right = validateDecimalOperand(input.right, "right");
  const precision = assertFiniteSafeDomainInteger(input.precision, "precision");
  if (
    precision < 0 ||
    precision > EQUATION_INEQUALITY_SYSTEM_DOMAIN.maxDecimalPrecision
  ) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_DECIMAL_PRECISION",
      `precision must be between 0 and ${EQUATION_INEQUALITY_SYSTEM_DOMAIN.maxDecimalPrecision}.`,
    );
  }
  if (input.operation === "divide" && right.unscaled === 0) {
    throw new EquationInequalitySystemDomainError(
      "DIVISION_BY_ZERO",
      "The exact decimal divisor cannot be zero.",
    );
  }
  let childModel: DecimalArithmeticState;
  try {
    childModel = buildDecimalArithmeticState({
      left,
      operation: input.operation,
      precision,
      right,
    });
  } catch (error) {
    throw new EquationInequalitySystemDomainError(
      "DECIMAL_CHILD_REJECTED",
      `G02 decimal arithmetic rejected the delegated input: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
  const exactResult = exactRationalFromBigInt(
    BigInt(childModel.result.exact.numerator),
    BigInt(childModel.result.exact.denominator),
  );
  const exactLeft = exactRationalFromBigInt(
    BigInt(left.unscaled),
    BigInt(pow10(left.scale)),
  );
  const exactRight = exactRationalFromBigInt(
    BigInt(right.unscaled),
    BigInt(pow10(right.scale)),
  );
  const reconstructedResult =
    input.operation === "multiply"
      ? multiplyRational(exactLeft, exactRight)
      : divideRational(exactLeft, exactRight);
  const scaledIntegerReceipt: DecimalOperationState["scaledIntegerReceipt"] = {
    left: { ...left, exact: exactLeft },
    observedResult: exactResult,
    operation: input.operation,
    passed: rationalEqual(reconstructedResult, exactResult),
    reconstructedResult,
    right: { ...right, exact: exactRight },
  };
  let reconstruction: DecimalOperationReconstruction;
  if (input.operation === "multiply") {
    const multiplication = childModel.multiplication;
    if (!multiplication) {
      throw new EquationInequalitySystemDomainError(
        "INTERNAL_INVARIANT_FAILURE",
        "G02 multiplication receipt is missing.",
      );
    }
    const reconstructed = exactRationalFromBigInt(
      BigInt(multiplication.exactUnscaledProduct),
      BigInt(pow10(multiplication.resultScale)),
    );
    reconstruction = {
      kind: "scaled-product",
      leftUnscaled: left.unscaled,
      passed: rationalEqual(reconstructed, exactResult),
      productUnscaled: multiplication.exactUnscaledProduct,
      reconstructed,
      resultScale: multiplication.resultScale,
      rightUnscaled: right.unscaled,
    };
  } else {
    const division = childModel.division;
    if (!division) {
      throw new EquationInequalitySystemDomainError(
        "INTERNAL_INVARIANT_FAILURE",
        "G02 division receipt is missing.",
      );
    }
    const reconstructedDividend =
      division.divisor * division.quotient + division.remainder;
    reconstruction = {
      dividend: division.dividend,
      divisor: division.divisor,
      kind: "division-identity",
      passed:
        reconstructedDividend === division.dividend &&
        Math.abs(division.remainder) < Math.abs(division.divisor),
      quotient: division.quotient,
      reconstructedDividend,
      remainder: division.remainder,
    };
  }
  const childExactness = childModel.invariants.find(
    ({ id }) => id === "decimal-scaled-integer-exactness",
  );
  const passed =
    reconstruction.passed &&
    scaledIntegerReceipt.passed &&
    Boolean(childExactness?.holds) &&
    childModel.invariants.every(({ holds }) => holds);
  const invariantReceipts = [
    invariantReceipt(
      "decimal-arithmetic-delegation",
      "decimal-operation",
      true,
      passed,
      "G02 exact child and reconstruction pass",
      passed ? "G02 exact child and reconstruction pass" : "delegation failed",
    ),
    invariantReceipt(
      "decimal-scaled-integer-exactness",
      "decimal-operation",
      true,
      Boolean(childExactness?.holds),
      "scaled integers reconstruct operands",
      childExactness?.holds
        ? "scaled integers reconstruct operands"
        : "scaled-integer receipt missing",
    ),
  ];
  const decimalOperation: DecimalOperationState = {
    childModel,
    delegatedFamily: DECIMAL_ARITHMETIC_MODEL_CONTRACT.family,
    delegatedVersion: DECIMAL_ARITHMETIC_MODEL_CONTRACT.version,
    exactResult,
    operation: input.operation,
    reconstruction,
    scaledIntegerReceipt,
  };
  const state = {
    exactResult,
    labId,
    left,
    mode: "decimal-operation",
    operation: input.operation,
    precision,
    right,
  };
  return finalizeModel({
    decimalOperation,
    family: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.family,
    groupId: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.groupId,
    invariantReceipts,
    labId,
    mode: "decimal-operation",
    state,
    version: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.version,
  });
}

function transformLinearFormByFactor(
  form: LinearForm,
  operation: "multiply" | "divide",
  factor: ExactRational,
): LinearForm {
  const transform = operation === "multiply" ? multiplyRational : divideRational;
  return {
    coefficient: transform(form.coefficient, factor),
    constant: transform(form.constant, factor),
  };
}

function buildInequalityTransformation(
  before: LinearInequalitySnapshot,
  operation: "multiply" | "divide",
  factor: ExactRational,
): InequalityTransformationReceipt {
  if (isZero(factor)) {
    throw new EquationInequalitySystemDomainError(
      "ZERO_OPERATION_FACTOR",
      "An inequality transformation factor cannot be zero.",
    );
  }
  const signReversed = factor.numerator < 0;
  const relationAfter = signReversed
    ? reverseRelation(before.relation)
    : before.relation;
  const after: LinearInequalitySnapshot = {
    left: transformLinearFormByFactor(before.left, operation, factor),
    relation: relationAfter,
    right: transformLinearFormByFactor(before.right, operation, factor),
  };
  const reconstruct = (value: ExactRational) =>
    operation === "multiply"
      ? divideRational(value, factor)
      : multiplyRational(value, factor);
  const reconstructionPassed =
    rationalEqual(reconstruct(after.left.coefficient), before.left.coefficient) &&
    rationalEqual(reconstruct(after.left.constant), before.left.constant) &&
    rationalEqual(reconstruct(after.right.coefficient), before.right.coefficient) &&
    rationalEqual(reconstruct(after.right.constant), before.right.constant);
  return {
    after,
    before,
    factor,
    factorSign: signReversed ? "negative" : "positive",
    operation,
    reconstructionPassed,
    relationAfter,
    relationBefore: before.relation,
    signReversed,
  };
}

function solveInequality(input: unknown, field: string): SolvedInequality {
  if (!isRecord(input)) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_INPUT",
      `${field} must be a linear inequality.`,
    );
  }
  const left = normalizeLinearForm(input.left, `${field}.left`).form;
  const right = normalizeLinearForm(input.right, `${field}.right`).form;
  const relation = validateRelation(input.relation);
  const initial: LinearInequalitySnapshot = { left, relation, right };
  const effectiveCoefficient = subtractRational(
    left.coefficient,
    right.coefficient,
  );
  const effectiveConstant = subtractRational(
    right.constant,
    left.constant,
  );
  const reduced: LinearInequalitySnapshot = {
    left: { coefficient: effectiveCoefficient, constant: exactInteger(0) },
    relation,
    right: { coefficient: exactInteger(0), constant: effectiveConstant },
  };
  let operationProof: InequalityTransformationReceipt | null = null;
  if (input.operationStep !== undefined) {
    if (!isRecord(input.operationStep)) {
      throw new EquationInequalitySystemDomainError(
        "INVALID_OPERATION",
        `${field}.operationStep must declare multiply or divide and a factor.`,
      );
    }
    if (
      input.operationStep.operation !== "multiply" &&
      input.operationStep.operation !== "divide"
    ) {
      throw new EquationInequalitySystemDomainError(
        "INVALID_OPERATION",
        `${field}.operationStep.operation must be multiply or divide.`,
      );
    }
    const factor = normalizeScalar(
      input.operationStep.factor,
      `${field}.operationStep.factor`,
    ).exact;
    operationProof = buildInequalityTransformation(
      initial,
      input.operationStep.operation,
      factor,
    );
  }
  if (isZero(effectiveCoefficient)) {
    const trueStatement = relationHolds(
      exactInteger(0),
      effectiveConstant,
      relation,
    );
    const solutionSet: InequalitySolutionSet = trueStatement
      ? { kind: "all-real" }
      : { kind: "empty", reason: "constant-statement-false" };
    return {
      classification: trueStatement ? "all-real" : "empty",
      coefficientPath: "degenerate",
      effectiveCoefficient,
      effectiveConstant,
      initial,
      operationProof,
      probeChecks: buildInequalityProbeChecks(initial, solutionSet),
      reduced,
      solutionSet,
      solveTransformation: null,
    };
  }
  const solveTransformation = buildInequalityTransformation(
    reduced,
    "divide",
    effectiveCoefficient,
  );
  const boundary = divideRational(
    effectiveConstant,
    effectiveCoefficient,
  );
  const solvedRelation = solveTransformation.relationAfter;
  const endpointClosed =
    solvedRelation === "<=" || solvedRelation === ">=";
  const direction =
    solvedRelation === "<" || solvedRelation === "<=" ? "left" : "right";
  const solutionSet: InequalitySolutionSet = {
    boundary,
    direction,
    endpointClosed,
    kind: "ray",
    relation: solvedRelation,
  };
  return {
    classification: "ray",
    coefficientPath:
      effectiveCoefficient.numerator < 0
        ? "negative-coefficient"
        : "positive-coefficient",
    effectiveCoefficient,
    effectiveConstant,
    initial,
    operationProof,
    probeChecks: buildInequalityProbeChecks(initial, solutionSet),
    reduced,
    solutionSet,
    solveTransformation,
  };
}

function inequalityInvariantReceipts(
  inequality: SolvedInequality,
  owner: "inequality" | "constraint:0" | "constraint:1",
): EquationInequalitySystemInvariantReceipt[] {
  const solutionSet = inequality.solutionSet;
  const ray = solutionSet.kind === "ray";
  const endpointPassed =
    inequality.probeChecks.every(({ matchesSolutionSet }) =>
      matchesSolutionSet,
    ) &&
    (solutionSet.kind !== "ray" ||
      solutionSet.endpointClosed ===
        (solutionSet.relation === "<=" || solutionSet.relation === ">="));
  const solveReversalPassed =
    !inequality.solveTransformation ||
    (inequality.solveTransformation.signReversed ===
      (inequality.solveTransformation.factor.numerator < 0) &&
      inequality.solveTransformation.reconstructionPassed);
  const proofReversalPassed =
    !inequality.operationProof ||
    (inequality.operationProof.signReversed ===
      (inequality.operationProof.factor.numerator < 0) &&
      inequality.operationProof.reconstructionPassed);
  return [
    invariantReceipt(
      "inequality-endpoint-openness",
      owner,
      ray,
      endpointPassed,
      ray ? "strict=open; inclusive=closed" : "not-applicable",
      solutionSet.kind === "ray"
        ? solutionSet.endpointClosed
          ? "closed"
          : "open"
        : "not-applicable",
    ),
    invariantReceipt(
      "inequality-sign-reversal",
      owner,
      Boolean(inequality.solveTransformation || inequality.operationProof),
      solveReversalPassed && proofReversalPassed,
      "relation reverses iff factor is negative",
      "relation reverses iff factor is negative",
    ),
  ];
}

function buildInequalityModel(
  input: UnknownRecord,
  labId: EquationInequalitySystemLabId,
): InequalityModel {
  const inequality = solveInequality(input, "inequality");
  const state = {
    coefficientPath: inequality.coefficientPath,
    initial: inequality.initial,
    labId,
    mode: "inequality",
    operationProof: inequality.operationProof,
    solutionSet: inequality.solutionSet,
  };
  return finalizeModel({
    family: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.family,
    groupId: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.groupId,
    inequality,
    invariantReceipts: inequalityInvariantReceipts(inequality, "inequality"),
    labId,
    mode: "inequality",
    state,
    version: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.version,
  });
}

function combineEndpoint(
  current: InequalitySystemEndpoint | null,
  candidate: InequalitySystemEndpoint,
  chooseLower: boolean,
): InequalitySystemEndpoint {
  if (!current) return candidate;
  const comparison = compareRational(candidate.value, current.value);
  const candidateWins = chooseLower ? comparison > 0 : comparison < 0;
  if (candidateWins) return candidate;
  if (comparison !== 0) return current;
  return {
    closed: current.closed && candidate.closed,
    sourceConstraintIndexes: [
      ...current.sourceConstraintIndexes,
      ...candidate.sourceConstraintIndexes,
    ],
    value: current.value,
  };
}

function intersectInequalities(
  constraints: [SolvedInequality, SolvedInequality],
): InequalitySystemIntersection {
  if (constraints.some(({ solutionSet }) => solutionSet.kind === "empty")) {
    return { kind: "empty", reason: "constraint-empty" };
  }
  let lower: InequalitySystemEndpoint | null = null;
  let upper: InequalitySystemEndpoint | null = null;
  for (let index = 0; index < constraints.length; index += 1) {
    const constraint = constraints[index]!;
    if (constraint.solutionSet.kind !== "ray") continue;
    const endpoint: InequalitySystemEndpoint = {
      closed: constraint.solutionSet.endpointClosed,
      sourceConstraintIndexes: [index],
      value: constraint.solutionSet.boundary,
    };
    if (constraint.solutionSet.direction === "right") {
      lower = combineEndpoint(lower, endpoint, true);
    } else {
      upper = combineEndpoint(upper, endpoint, false);
    }
  }
  if (!lower && !upper) return { kind: "all-real" };
  if (lower && upper) {
    const comparison = compareRational(lower.value, upper.value);
    if (comparison > 0) return { kind: "empty", reason: "disjoint-bounds" };
    if (comparison === 0 && !(lower.closed && upper.closed)) {
      return { kind: "empty", reason: "open-touch" };
    }
  }
  return { kind: "interval", lower, upper };
}

type IndependentConstraintSet =
  | { kind: "all-real" }
  | { kind: "empty" }
  | {
      boundary: ExactRational;
      closed: boolean;
      direction: "left" | "right";
      kind: "ray";
      sourceConstraintIndex: number;
    };

function independentlySolveConstraint(
  constraint: SolvedInequality,
  sourceConstraintIndex: number,
): IndependentConstraintSet {
  const effectiveCoefficient = subtractRational(
    constraint.initial.left.coefficient,
    constraint.initial.right.coefficient,
  );
  const effectiveConstant = subtractRational(
    constraint.initial.right.constant,
    constraint.initial.left.constant,
  );
  if (isZero(effectiveCoefficient)) {
    return relationHolds(
      exactInteger(0),
      effectiveConstant,
      constraint.initial.relation,
    )
      ? { kind: "all-real" }
      : { kind: "empty" };
  }
  const relation =
    effectiveCoefficient.numerator < 0
      ? reverseRelation(constraint.initial.relation)
      : constraint.initial.relation;
  return {
    boundary: divideRational(effectiveConstant, effectiveCoefficient),
    closed: relation === "<=" || relation === ">=",
    direction: relation === "<" || relation === "<=" ? "left" : "right",
    kind: "ray",
    sourceConstraintIndex,
  };
}

function independentlyCombineEndpoint(
  current: InequalitySystemEndpoint | null,
  candidate: InequalitySystemEndpoint,
  chooseGreater: boolean,
): InequalitySystemEndpoint {
  if (!current) return candidate;
  const comparison = compareRational(candidate.value, current.value);
  if ((chooseGreater && comparison > 0) || (!chooseGreater && comparison < 0)) {
    return candidate;
  }
  if (comparison !== 0) return current;
  return {
    closed: current.closed && candidate.closed,
    sourceConstraintIndexes: [
      ...current.sourceConstraintIndexes,
      ...candidate.sourceConstraintIndexes,
    ],
    value: current.value,
  };
}

type IndependentIntersectionExpectation = {
  intersection: InequalitySystemIntersection;
  lower: InequalitySystemEndpoint | null;
  upper: InequalitySystemEndpoint | null;
};

function independentlyIntersectConstraints(
  constraints: [SolvedInequality, SolvedInequality],
): IndependentIntersectionExpectation {
  const independentlySolved = constraints.map(independentlySolveConstraint);
  let lower: InequalitySystemEndpoint | null = null;
  let upper: InequalitySystemEndpoint | null = null;
  for (const constraint of independentlySolved) {
    if (constraint.kind !== "ray") continue;
    const endpoint: InequalitySystemEndpoint = {
      closed: constraint.closed,
      sourceConstraintIndexes: [constraint.sourceConstraintIndex],
      value: constraint.boundary,
    };
    if (constraint.direction === "right") {
      lower = independentlyCombineEndpoint(lower, endpoint, true);
    } else {
      upper = independentlyCombineEndpoint(upper, endpoint, false);
    }
  }
  if (independentlySolved.some(({ kind }) => kind === "empty")) {
    return {
      intersection: { kind: "empty", reason: "constraint-empty" },
      lower,
      upper,
    };
  }
  if (!lower && !upper) {
    return { intersection: { kind: "all-real" }, lower, upper };
  }
  if (lower && upper) {
    const comparison = compareRational(lower.value, upper.value);
    if (comparison > 0) {
      return {
        intersection: { kind: "empty", reason: "disjoint-bounds" },
        lower,
        upper,
      };
    }
    if (comparison === 0 && (!lower.closed || !upper.closed)) {
      return {
        intersection: { kind: "empty", reason: "open-touch" },
        lower,
        upper,
      };
    }
  }
  return { intersection: { kind: "interval", lower, upper }, lower, upper };
}

function intersectionContains(
  intersection: InequalitySystemIntersection,
  value: ExactRational,
): boolean {
  if (intersection.kind === "all-real") return true;
  if (intersection.kind === "empty") return false;
  if (intersection.lower) {
    const comparison = compareRational(value, intersection.lower.value);
    if (comparison < 0 || (comparison === 0 && !intersection.lower.closed)) {
      return false;
    }
  }
  if (intersection.upper) {
    const comparison = compareRational(value, intersection.upper.value);
    if (comparison > 0 || (comparison === 0 && !intersection.upper.closed)) {
      return false;
    }
  }
  return true;
}

function originalConstraintHoldsAt(
  constraint: SolvedInequality,
  x: ExactRational,
): boolean {
  const left = addRational(
    multiplyRational(constraint.initial.left.coefficient, x),
    constraint.initial.left.constant,
  );
  const right = addRational(
    multiplyRational(constraint.initial.right.coefficient, x),
    constraint.initial.right.constant,
  );
  return relationHolds(left, right, constraint.initial.relation);
}

function endpointMatches(
  observed: InequalitySystemEndpoint | null,
  expected: InequalitySystemEndpoint | null,
): boolean {
  if (!observed || !expected) return observed === expected;
  return (
    observed.closed === expected.closed &&
    rationalEqual(observed.value, expected.value) &&
    observed.sourceConstraintIndexes.length ===
      expected.sourceConstraintIndexes.length &&
    observed.sourceConstraintIndexes.every(
      (sourceIndex, index) =>
        sourceIndex === expected.sourceConstraintIndexes[index],
    )
  );
}

function buildInequalitySystemIntersectionAudit(
  constraints: [SolvedInequality, SolvedInequality],
  observedIntersection: InequalitySystemIntersection,
): InequalitySystemIntersectionAuditReceipt {
  const expected = independentlyIntersectConstraints(constraints);
  const expectedIntersection = expected.intersection;
  const probes: ExactRational[] = [];
  const addProbe = (probe: ExactRational) => {
    if (!probes.some((candidate) => rationalEqual(candidate, probe))) {
      probes.push(probe);
    }
  };
  for (const integer of [-1, 0, 1]) addProbe(exactInteger(integer));
  const independentConstraints = constraints.map(independentlySolveConstraint);
  for (const constraint of independentConstraints) {
    if (constraint.kind !== "ray") continue;
    addProbe(constraint.boundary);
    addProbe(subtractRational(constraint.boundary, exactInteger(1)));
    addProbe(addRational(constraint.boundary, exactInteger(1)));
  }
  if (
    expectedIntersection.kind === "interval" &&
    expectedIntersection.lower &&
    expectedIntersection.upper
  ) {
    addProbe(
      divideRational(
        addRational(
          expectedIntersection.lower.value,
          expectedIntersection.upper.value,
        ),
        exactInteger(2),
      ),
    );
  }
  const membershipChecks = probes.map((x) => {
    const constraintHolds: [boolean, boolean] = [
      originalConstraintHoldsAt(constraints[0], x),
      originalConstraintHoldsAt(constraints[1], x),
    ];
    const originalSystemContains = constraintHolds[0] && constraintHolds[1];
    const expectedIntersectionContains = intersectionContains(
      expectedIntersection,
      x,
    );
    const observedContains = intersectionContains(observedIntersection, x);
    return {
      constraintHolds,
      expectedIntersectionContains,
      intersectionContains: observedContains,
      passed:
        originalSystemContains === expectedIntersectionContains &&
        expectedIntersectionContains === observedContains,
      x,
    };
  });
  const expectedEmptyReason =
    expectedIntersection.kind === "empty" ? expectedIntersection.reason : null;
  const kindPassed =
    observedIntersection.kind === expectedIntersection.kind &&
    (expectedIntersection.kind !== "empty" ||
      (observedIntersection.kind === "empty" &&
        observedIntersection.reason === expectedIntersection.reason));
  const sourceIndexesPassed =
    expectedIntersection.kind !== "interval"
      ? observedIntersection.kind === expectedIntersection.kind
      : observedIntersection.kind === "interval" &&
        endpointMatches(observedIntersection.lower, expectedIntersection.lower) &&
        endpointMatches(observedIntersection.upper, expectedIntersection.upper);
  const openTouchPassed =
    expectedEmptyReason === "open-touch"
      ? observedIntersection.kind === "empty" &&
        observedIntersection.reason === "open-touch"
      : !(
          observedIntersection.kind === "empty" &&
          observedIntersection.reason === "open-touch"
        );
  const membershipPassed = membershipChecks.every(({ passed }) => passed);
  return {
    expectedEmptyReason,
    expectedKind: expectedIntersection.kind,
    expectedLowerSourceConstraintIndexes:
      expected.lower?.sourceConstraintIndexes ?? [],
    expectedUpperSourceConstraintIndexes:
      expected.upper?.sourceConstraintIndexes ?? [],
    kindPassed,
    membershipChecks,
    membershipPassed,
    openTouchPassed,
    passed:
      kindPassed &&
      membershipPassed &&
      openTouchPassed &&
      sourceIndexesPassed,
    sourceIndexesPassed,
  };
}

function buildInequalitySystemModel(
  input: UnknownRecord,
  labId: EquationInequalitySystemLabId,
): InequalitySystemModel {
  if (!Array.isArray(input.constraints) || input.constraints.length !== 2) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_SYSTEM_SHAPE",
      "inequality-system mode requires exactly two constraints.",
    );
  }
  const constraints: [SolvedInequality, SolvedInequality] = [
    solveInequality(input.constraints[0], "constraints[0]"),
    solveInequality(input.constraints[1], "constraints[1]"),
  ];
  const intersection = intersectInequalities(constraints);
  const intersectionAudit = buildInequalitySystemIntersectionAudit(
    constraints,
    intersection,
  );
  const invariantReceipts = [
    ...inequalityInvariantReceipts(constraints[0], "constraint:0"),
    ...inequalityInvariantReceipts(constraints[1], "constraint:1"),
    invariantReceipt(
      "inequality-system-intersection",
      "intersection",
      true,
      intersectionAudit.passed,
      "independent membership, openness, and source ownership reconstruct",
      intersection.kind,
    ),
  ];
  const inequalitySystem = { constraints, intersection, intersectionAudit };
  const state = {
    constraints: constraints.map(({ initial }) => initial),
    intersection,
    labId,
    mode: "inequality-system",
  };
  return finalizeModel({
    family: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.family,
    groupId: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.groupId,
    inequalitySystem,
    invariantReceipts,
    labId,
    mode: "inequality-system",
    state,
    version: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.version,
  });
}

function normalizeSystemEquation(
  value: unknown,
  field: string,
): ExactLinearSystemEquation {
  if (!isRecord(value)) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_SYSTEM_SHAPE",
      `${field} must contain xCoefficient, yCoefficient, and constant.`,
    );
  }
  return {
    constant: normalizeScalar(value.constant, `${field}.constant`).exact,
    xCoefficient: normalizeScalar(
      value.xCoefficient,
      `${field}.xCoefficient`,
    ).exact,
    yCoefficient: normalizeScalar(
      value.yCoefficient,
      `${field}.yCoefficient`,
    ).exact,
  };
}

function scaleSystemEquation(
  equation: ExactLinearSystemEquation,
  multiplier: ExactRational,
): ExactLinearSystemEquation {
  return {
    constant: multiplyRational(equation.constant, multiplier),
    xCoefficient: multiplyRational(equation.xCoefficient, multiplier),
    yCoefficient: multiplyRational(equation.yCoefficient, multiplier),
  };
}

function addSystemEquations(
  first: ExactLinearSystemEquation,
  second: ExactLinearSystemEquation,
): ExactLinearSystemEquation {
  return {
    constant: addRational(first.constant, second.constant),
    xCoefficient: addRational(first.xCoefficient, second.xCoefficient),
    yCoefficient: addRational(first.yCoefficient, second.yCoefficient),
  };
}

function evaluateSystemEquation(
  equation: ExactLinearSystemEquation,
  point: ExactPoint,
): LinearSystemResidual {
  const xProduct = multiplyRational(equation.xCoefficient, point.x);
  const yProduct = multiplyRational(equation.yCoefficient, point.y);
  const leftValue = addRational(xProduct, yProduct);
  const signedResidual = subtractRational(leftValue, equation.constant);
  return {
    constant: equation.constant,
    leftValue,
    passed: isZero(signedResidual),
    signedResidual,
    xProduct,
    yProduct,
  };
}

function evaluateSystem(
  equations: [ExactLinearSystemEquation, ExactLinearSystemEquation],
  point: ExactPoint,
): DualResidualReceipt {
  return {
    first: evaluateSystemEquation(equations[0], point),
    second: evaluateSystemEquation(equations[1], point),
  };
}

function normalizePoint(value: unknown, field: string): ExactPoint {
  if (!isRecord(value)) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_SYSTEM_SHAPE",
      `${field} must contain exact x and y coordinates.`,
    );
  }
  return {
    x: normalizeScalar(value.x, `${field}.x`).exact,
    y: normalizeScalar(value.y, `${field}.y`).exact,
  };
}

function buildEliminationReceipt(
  equations: [ExactLinearSystemEquation, ExactLinearSystemEquation],
  point: ExactPoint,
): EliminationReceipt {
  const firstMultiplier = equations[1].xCoefficient;
  const secondMultiplier = negateRational(equations[0].xCoefficient);
  const firstScaled = scaleSystemEquation(equations[0], firstMultiplier);
  const secondScaled = scaleSystemEquation(equations[1], secondMultiplier);
  const combinedEquation = addSystemEquations(firstScaled, secondScaled);
  if (!isZero(combinedEquation.xCoefficient) || isZero(combinedEquation.yCoefficient)) {
    throw new EquationInequalitySystemDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      "Exact x-elimination did not produce a solvable y equation.",
    );
  }
  const solvedValue = divideRational(
    combinedEquation.constant,
    combinedEquation.yCoefficient,
  );
  const equationIndex: 0 | 1 = !isZero(equations[0].xCoefficient) ? 0 : 1;
  const backEquation = equations[equationIndex];
  const reconstructedConstant = subtractRational(
    backEquation.constant,
    multiplyRational(backEquation.yCoefficient, solvedValue),
  );
  const solvedX = divideRational(
    reconstructedConstant,
    backEquation.xCoefficient,
  );
  const reconstructedPoint = { x: solvedX, y: solvedValue };
  if (
    !rationalEqual(reconstructedPoint.x, point.x) ||
    !rationalEqual(reconstructedPoint.y, point.y)
  ) {
    throw new EquationInequalitySystemDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      "Elimination receipt did not reconstruct the exact intersection.",
    );
  }
  return {
    backSubstitution: {
      equationIndex,
      reconstructedConstant,
      solvedX,
    },
    combinedEquation,
    eliminatedVariable: "x",
    multipliers: { first: firstMultiplier, second: secondMultiplier },
    reconstructedPoint,
    scaledEquations: { first: firstScaled, second: secondScaled },
    solvedValue,
    solvedVariable: "y",
  };
}

function buildSubstitutionReceipt(
  equations: [ExactLinearSystemEquation, ExactLinearSystemEquation],
  point: ExactPoint,
): SubstitutionReceipt {
  const pivot = equations[0];
  const other = equations[1];
  if (!isZero(pivot.xCoefficient)) {
    const expressionConstant = divideRational(
      pivot.constant,
      pivot.xCoefficient,
    );
    const expressionOtherCoefficient = divideRational(
      negateRational(pivot.yCoefficient),
      pivot.xCoefficient,
    );
    const substitutedCoefficient = addRational(
      multiplyRational(other.xCoefficient, expressionOtherCoefficient),
      other.yCoefficient,
    );
    const substitutedConstant = subtractRational(
      other.constant,
      multiplyRational(other.xCoefficient, expressionConstant),
    );
    const otherValue = divideRational(
      substitutedConstant,
      substitutedCoefficient,
    );
    const subjectValue = addRational(
      expressionConstant,
      multiplyRational(expressionOtherCoefficient, otherValue),
    );
    const reconstructedPoint = { x: subjectValue, y: otherValue };
    if (
      !rationalEqual(reconstructedPoint.x, point.x) ||
      !rationalEqual(reconstructedPoint.y, point.y)
    ) {
      throw new EquationInequalitySystemDomainError(
        "INTERNAL_INVARIANT_FAILURE",
        "Substitution receipt did not reconstruct the exact intersection.",
      );
    }
    return {
      expression: {
        constant: expressionConstant,
        otherCoefficient: expressionOtherCoefficient,
      },
      otherValue,
      otherVariable: "y",
      pivotEquationIndex: 0,
      reconstructedPoint,
      subject: "x",
      subjectValue,
      substitutedEquation: {
        coefficient: substitutedCoefficient,
        constant: substitutedConstant,
      },
    };
  }
  if (isZero(pivot.yCoefficient)) {
    throw new EquationInequalitySystemDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      "A unique system cannot use a zero pivot equation.",
    );
  }
  const expressionConstant = divideRational(
    pivot.constant,
    pivot.yCoefficient,
  );
  const expressionOtherCoefficient = divideRational(
    negateRational(pivot.xCoefficient),
    pivot.yCoefficient,
  );
  const substitutedCoefficient = addRational(
    other.xCoefficient,
    multiplyRational(other.yCoefficient, expressionOtherCoefficient),
  );
  const substitutedConstant = subtractRational(
    other.constant,
    multiplyRational(other.yCoefficient, expressionConstant),
  );
  const otherValue = divideRational(
    substitutedConstant,
    substitutedCoefficient,
  );
  const subjectValue = addRational(
    expressionConstant,
    multiplyRational(expressionOtherCoefficient, otherValue),
  );
  const reconstructedPoint = { x: otherValue, y: subjectValue };
  if (
    !rationalEqual(reconstructedPoint.x, point.x) ||
    !rationalEqual(reconstructedPoint.y, point.y)
  ) {
    throw new EquationInequalitySystemDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      "Substitution receipt did not reconstruct the exact intersection.",
    );
  }
  return {
    expression: {
      constant: expressionConstant,
      otherCoefficient: expressionOtherCoefficient,
    },
    otherValue,
    otherVariable: "x",
    pivotEquationIndex: 0,
    reconstructedPoint,
    subject: "y",
    subjectValue,
    substitutedEquation: {
      coefficient: substitutedCoefficient,
      constant: substitutedConstant,
    },
  };
}

function buildSystemModel(
  input: UnknownRecord,
  labId: EquationInequalitySystemLabId,
  mode: "substitution" | "elimination" | "graph-intersection",
): SystemModel {
  if (!Array.isArray(input.equations) || input.equations.length !== 2) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_SYSTEM_SHAPE",
      "A linear system requires exactly two equations.",
    );
  }
  const equations: [ExactLinearSystemEquation, ExactLinearSystemEquation] = [
    normalizeSystemEquation(input.equations[0], "equations[0]"),
    normalizeSystemEquation(input.equations[1], "equations[1]"),
  ];
  const determinant = subtractRational(
    multiplyRational(
      equations[0].xCoefficient,
      equations[1].yCoefficient,
    ),
    multiplyRational(
      equations[1].xCoefficient,
      equations[0].yCoefficient,
    ),
  );
  const xNumerator = subtractRational(
    multiplyRational(equations[0].constant, equations[1].yCoefficient),
    multiplyRational(equations[1].constant, equations[0].yCoefficient),
  );
  const yNumerator = subtractRational(
    multiplyRational(equations[0].xCoefficient, equations[1].constant),
    multiplyRational(equations[1].xCoefficient, equations[0].constant),
  );
  const impossibleRowIndexes = equations.flatMap((equation, index) =>
    isZero(equation.xCoefficient) &&
    isZero(equation.yCoefficient) &&
    !isZero(equation.constant)
      ? [index]
      : [],
  );
  const bothUniversal = equations.every(
    (equation) =>
      isZero(equation.xCoefficient) &&
      isZero(equation.yCoefficient) &&
      isZero(equation.constant),
  );
  const oneUniversal = equations.some(
    (equation) =>
      isZero(equation.xCoefficient) &&
      isZero(equation.yCoefficient) &&
      isZero(equation.constant),
  );
  let classification: LinearSystemClassification;
  let reason: LinearSystemState["classificationReceipt"]["reason"];
  if (!isZero(determinant)) {
    classification = "unique";
    reason = "unique-determinant";
  } else if (impossibleRowIndexes.length > 0) {
    classification = "none";
    reason = "contradictory-zero-row";
  } else if (!isZero(xNumerator) || !isZero(yNumerator)) {
    classification = "none";
    reason = "parallel-distinct";
  } else {
    classification = "infinite";
    reason = bothUniversal
      ? "universal-system"
      : oneUniversal
        ? "underdetermined"
        : "coincident";
  }
  const point: ExactPoint | null =
    classification === "unique"
      ? {
          x: divideRational(xNumerator, determinant),
          y: divideRational(yNumerator, determinant),
        }
      : null;
  const intersection = point
    ? {
        exact: true as const,
        kind: "exact-rational" as const,
        x: point.x,
        y: point.y,
      }
    : null;
  const solutionResiduals = point ? evaluateSystem(equations, point) : null;
  const methodReceipts = point
    ? {
        elimination: buildEliminationReceipt(equations, point),
        substitution: buildSubstitutionReceipt(equations, point),
      }
    : null;
  const candidate =
    input.candidate === undefined
      ? null
      : normalizePoint(input.candidate, "candidate");
  const candidateResiduals = candidate
    ? evaluateSystem(equations, candidate)
    : null;
  const candidateCheck =
    candidate && candidateResiduals
      ? {
          point: candidate,
          residuals: candidateResiduals,
          satisfiesBoth:
            candidateResiduals.first.passed &&
            candidateResiduals.second.passed,
        }
      : null;
  const dualResidualPassed =
    !solutionResiduals ||
    (solutionResiduals.first.passed && solutionResiduals.second.passed);
  const intersectionPassed =
    !point ||
    (!isZero(determinant) &&
      methodReceipts !== null &&
      rationalEqual(methodReceipts.elimination.reconstructedPoint.x, point.x) &&
      rationalEqual(methodReceipts.elimination.reconstructedPoint.y, point.y) &&
      rationalEqual(methodReceipts.substitution.reconstructedPoint.x, point.x) &&
      rationalEqual(methodReceipts.substitution.reconstructedPoint.y, point.y));
  const invariantReceipts = [
    invariantReceipt(
      "line-intersection",
      "linear-system",
      classification === "unique",
      intersectionPassed,
      classification === "unique"
        ? "nonzero determinant and exact method reconstruction"
        : "no unique point",
      classification === "unique"
        ? "nonzero determinant and exact method reconstruction"
        : "no unique point",
    ),
    invariantReceipt(
      "linear-system-dual-residual",
      "linear-system",
      classification === "unique",
      dualResidualPassed,
      classification === "unique" ? "0;0" : "not-applicable",
      solutionResiduals
        ? `${solutionResiduals.first.signedResidual.text};${solutionResiduals.second.signedResidual.text}`
        : "not-applicable",
      solutionResiduals
        ? {
            first: solutionResiduals.first.signedResidual,
            second: solutionResiduals.second.signedResidual,
          }
        : null,
    ),
  ];
  const system: LinearSystemState = {
    candidateCheck,
    classification,
    classificationReceipt: {
      determinant,
      impossibleRowIndexes,
      reason,
      xNumerator,
      yNumerator,
    },
    determinant,
    equations,
    intersection,
    methodReceipts,
    selectedMethod: mode,
    solutionResiduals,
  };
  const state = {
    candidate,
    classification,
    equations,
    labId,
    mode,
  };
  return finalizeModel({
    family: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.family,
    groupId: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.groupId,
    invariantReceipts,
    labId,
    mode,
    state,
    system,
    version: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.version,
  });
}

function buildDataModel(
  input: UnknownRecord,
  labId: EquationInequalitySystemLabId,
): DataModel {
  if (!Array.isArray(input.dataset)) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_INPUT",
      "data mode requires a dataset array.",
    );
  }
  if (input.dataset.length === 0) {
    throw new EquationInequalitySystemDomainError(
      "EMPTY_DATASET",
      "data mode requires at least one exact observation.",
    );
  }
  if (input.dataset.length > EQUATION_INEQUALITY_SYSTEM_DOMAIN.maxDatasetSize) {
    throw new EquationInequalitySystemDomainError(
      "DATASET_TOO_LARGE",
      `data mode supports at most ${EQUATION_INEQUALITY_SYSTEM_DOMAIN.maxDatasetSize} observations.`,
    );
  }
  const values = input.dataset.map((value, index) =>
    normalizeScalar(value, `dataset[${index}]`).exact,
  );
  const sum = values.reduce(
    (total, value) => addRational(total, value),
    exactInteger(0),
  );
  const count = values.length;
  const mean = divideRational(sum, exactInteger(count));
  const sortedValues = [...values].sort(compareRational);
  const lowerMedianIndex = Math.floor((count - 1) / 2);
  const upperMedianIndex = Math.floor(count / 2);
  const lowerMedianValue = sortedValues[lowerMedianIndex]!;
  const upperMedianValue = sortedValues[upperMedianIndex]!;
  const median =
    lowerMedianIndex === upperMedianIndex
      ? lowerMedianValue
      : divideRational(
          addRational(lowerMedianValue, upperMedianValue),
          exactInteger(2),
        );
  const minimum = sortedValues[0]!;
  const maximum = sortedValues[sortedValues.length - 1]!;
  const range = subtractRational(maximum, minimum);
  const frequencies: DataState["frequencies"] = [];
  for (const value of sortedValues) {
    const latest = frequencies[frequencies.length - 1];
    if (latest && rationalEqual(latest.value, value)) {
      latest.count += 1;
    } else {
      frequencies.push({ count: 1, value });
    }
  }
  const frequencyCount = frequencies.reduce(
    (total, item) => total + item.count,
    0,
  );
  const frequencyWeightedSum = frequencies.reduce(
    (total, item) =>
      addRational(
        total,
        multiplyRational(item.value, exactInteger(item.count)),
      ),
    exactInteger(0),
  );
  const meanTimesCount = multiplyRational(mean, exactInteger(count));
  const residual = subtractRational(frequencyWeightedSum, sum);
  const passed =
    frequencyCount === count &&
    rationalEqual(frequencyWeightedSum, sum) &&
    rationalEqual(meanTimesCount, sum) &&
    isZero(residual) &&
    compareRational(median, minimum) >= 0 &&
    compareRational(median, maximum) <= 0 &&
    compareRational(range, exactInteger(0)) >= 0;
  const reconstruction = {
    frequencyCount,
    frequencyWeightedSum,
    meanTimesCount,
    medianSourceIndexes: [
      lowerMedianIndex,
      upperMedianIndex,
    ] as [number, number],
    passed,
    rangeEndpoints: { maximum, minimum },
    residual,
  };
  const data: DataState = {
    count,
    frequencies,
    mean,
    median,
    range,
    reconstruction,
    sortedValues,
    sum,
    values,
  };
  const invariantReceipts = [
    invariantReceipt(
      "data-count-sum-mean",
      "data",
      true,
      passed,
      "frequency count=count; weighted sum=sum; mean*count=sum",
      passed
        ? "frequency count=count; weighted sum=sum; mean*count=sum"
        : "data reconstruction failed",
      residual,
    ),
    invariantReceipt(
      "data-summary-exactness",
      "data",
      true,
      passed,
      "median and range derive from the same exact sorted dataset",
      passed
        ? "median and range derive from the same exact sorted dataset"
        : "summary derivation failed",
      residual,
    ),
  ];
  const state = {
    dataset: values,
    labId,
    mean,
    median,
    mode: "data",
    range,
    sum,
  };
  return finalizeModel({
    data,
    family: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.family,
    groupId: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.groupId,
    invariantReceipts,
    labId,
    mode: "data",
    state,
    version: EQUATION_INEQUALITY_SYSTEM_MODEL_CONTRACT.version,
  });
}

export function buildEquationInequalitySystemModel(
  input: EquationInequalitySystemInput,
): EquationInequalitySystemModel {
  if (!isRecord(input)) {
    throw new EquationInequalitySystemDomainError(
      "INVALID_INPUT",
      "G08 model input must be an object.",
    );
  }
  const labId = validateLabId(input.labId);
  const mode = validateMode(input.mode);
  const allowedModes = EQUATION_INEQUALITY_SYSTEM_MODE_ALLOWLIST[labId] as readonly EquationInequalitySystemMode[];
  if (!allowedModes.includes(mode)) {
    throw new EquationInequalitySystemDomainError(
      "MODE_NOT_ALLOWED",
      `${mode} is not an exact strand for ${labId}.`,
    );
  }
  if (mode === "equation") return buildEquationModel(input, labId);
  if (mode === "decimal-operation") {
    return buildDecimalOperationModel(input, labId);
  }
  if (mode === "inequality") return buildInequalityModel(input, labId);
  if (mode === "inequality-system") {
    return buildInequalitySystemModel(input, labId);
  }
  if (
    mode === "substitution" ||
    mode === "elimination" ||
    mode === "graph-intersection"
  ) {
    return buildSystemModel(input, labId, mode);
  }
  return buildDataModel(input, labId);
}

export function defaultEquationInequalitySystemInputFor(
  requestedLabId: EquationInequalitySystemLabId,
  requestedMode: EquationInequalitySystemMode,
): EquationInequalitySystemInput {
  const labId = validateLabId(requestedLabId);
  const mode = validateMode(requestedMode);
  const allowedModes = EQUATION_INEQUALITY_SYSTEM_MODE_ALLOWLIST[
    labId
  ] as readonly EquationInequalitySystemMode[];
  if (!allowedModes.includes(mode)) {
    throw new EquationInequalitySystemDomainError(
      "MODE_NOT_ALLOWED",
      `${mode} is not an exact strand for ${labId}.`,
    );
  }
  if (mode === "equation") {
    return deepFreeze({
      labId,
      left: {
        coefficient: { kind: "decimal" as const, scale: 1, unscaled: 3 },
        constant: { kind: "decimal" as const, scale: 1, unscaled: 2 },
      },
      mode,
      right: {
        coefficient: 0,
        constant: { kind: "decimal" as const, scale: 1, unscaled: 11 },
      },
    });
  }
  if (mode === "decimal-operation") {
    return deepFreeze({
      labId,
      left: { scale: 1, unscaled: 24 },
      mode,
      operation: "multiply" as const,
      precision: 2,
      right: { scale: 0, unscaled: 3 },
    });
  }
  if (mode === "inequality") {
    return deepFreeze({
      labId,
      left: { coefficient: -2, constant: 5 },
      mode,
      relation: "<" as const,
      right: { coefficient: 0, constant: 13 },
    });
  }
  if (mode === "inequality-system") {
    return deepFreeze({
      constraints: [
        {
          left: { coefficient: 1, constant: 0 },
          relation: ">" as const,
          right: { coefficient: 0, constant: -2 },
        },
        {
          left: { coefficient: 1, constant: 0 },
          relation: "<=" as const,
          right: { coefficient: 0, constant: 3 },
        },
      ],
      labId,
      mode,
    });
  }
  if (
    mode === "substitution" ||
    mode === "elimination" ||
    mode === "graph-intersection"
  ) {
    return deepFreeze({
      equations: [
        { constant: 6, xCoefficient: 1, yCoefficient: 1 },
        { constant: 2, xCoefficient: 1, yCoefficient: -1 },
      ],
      labId,
      mode,
    });
  }
  return deepFreeze({
    dataset: [5, 7, 7, 9],
    labId,
    mode,
  });
}

export const EQUATION_INEQUALITY_SYSTEM_RESET_INPUTS = deepFreeze({
  "bnu-junior-s2-lower-inequalities-systems": {
    labId: "bnu-junior-s2-lower-inequalities-systems",
    left: { coefficient: -2, constant: 5 },
    mode: "inequality",
    relation: "<",
    right: { coefficient: 0, constant: 13 },
  },
  "bnu-junior-s2-upper-linear-systems": {
    equations: [
      { constant: 6, xCoefficient: 1, yCoefficient: 1 },
      { constant: 2, xCoefficient: 1, yCoefficient: -1 },
    ],
    labId: "bnu-junior-s2-upper-linear-systems",
    mode: "elimination",
  },
  "pep-junior-s1-lower-equations-inequalities-data": {
    dataset: [5, 7, 7, 9],
    labId: "pep-junior-s1-lower-equations-inequalities-data",
    mode: "data",
  },
  "pep-primary-p5-upper-decimals-equations": {
    labId: "pep-primary-p5-upper-decimals-equations",
    left: {
      coefficient: { kind: "decimal", scale: 1, unscaled: 3 },
      constant: { kind: "decimal", scale: 1, unscaled: 2 },
    },
    mode: "equation",
    right: {
      coefficient: 0,
      constant: { kind: "decimal", scale: 1, unscaled: 11 },
    },
  },
} as const satisfies Record<
  EquationInequalitySystemLabId,
  EquationInequalitySystemInput
>);

export function buildEquationInequalitySystemResetModel(
  labId: EquationInequalitySystemLabId,
): EquationInequalitySystemModel {
  return buildEquationInequalitySystemModel(
    EQUATION_INEQUALITY_SYSTEM_RESET_INPUTS[labId],
  );
}
