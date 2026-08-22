export const SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT = deepFreeze({
  family: "symbolic-transform-suite",
  groupId: "G07",
  version: "symbolic-transform-suite-v1",
} as const);

export const SYMBOLIC_EXPRESSIONS_LAB_IDS = deepFreeze([
  "bnu-junior-s1-upper-algebraic-expressions",
  "bnu-junior-s2-lower-algebraic-fractions-equations",
  "hjb-junior-s1-upper-algebraic-fractions",
  "hjb-junior-s1-upper-polynomial-add-subtract",
  "hjb-primary-p6-lower-simple-algebraic-expressions",
  "pep-junior-s1-upper-expressions-linear-equations",
  "pep-junior-s2-upper-polynomials-fractions",
] as const);

export type SymbolicExpressionsLabId =
  (typeof SYMBOLIC_EXPRESSIONS_LAB_IDS)[number];

export const SYMBOLIC_EXPRESSIONS_MODES = deepFreeze([
  "collect-like-terms",
  "add",
  "subtract",
  "expand",
  "factor",
  "substitute",
  "fraction-simplify",
  "solve",
] as const);

export type SymbolicExpressionsMode =
  (typeof SYMBOLIC_EXPRESSIONS_MODES)[number];

export type PolynomialInput = readonly number[];

export type MonomialInput = {
  coefficient: number;
  degree: number;
};

export type ExactRationalInput = {
  numerator: number;
  denominator: number;
};

export type AlgebraicFractionInput = {
  numerator: PolynomialInput;
  denominator: PolynomialInput;
};

export type AlgebraicEquationInput = {
  left: AlgebraicFractionInput;
  right: AlgebraicFractionInput;
};

type SymbolicExpressionsBaseInput = {
  labId: SymbolicExpressionsLabId;
};

export type SymbolicExpressionsInput =
  | (SymbolicExpressionsBaseInput & {
      mode: "collect-like-terms";
      terms: readonly MonomialInput[];
    })
  | (SymbolicExpressionsBaseInput & {
      mode: "add" | "subtract";
      left: PolynomialInput;
      right: PolynomialInput;
    })
  | (SymbolicExpressionsBaseInput & {
      mode: "expand";
      factors: readonly [PolynomialInput, PolynomialInput];
    })
  | (SymbolicExpressionsBaseInput & {
      mode: "factor";
      polynomial: PolynomialInput;
      factor: PolynomialInput;
    })
  | (SymbolicExpressionsBaseInput & {
      mode: "substitute";
      polynomial: PolynomialInput;
      value: ExactRationalInput;
    })
  | (SymbolicExpressionsBaseInput & {
      mode: "fraction-simplify";
      fraction: AlgebraicFractionInput;
      cancelFactors: readonly PolynomialInput[];
      domainValue?: ExactRationalInput;
    })
  | (SymbolicExpressionsBaseInput & {
      mode: "solve";
      equation: AlgebraicEquationInput;
      candidate?: ExactRationalInput;
    });

export const SYMBOLIC_EXPRESSIONS_DOMAIN = deepFreeze({
  maxAbsCoefficient: 100_000_000,
  maxCancelFactors: 6,
  maxDegree: 6,
  maxResultDegree: 12,
  maxTerms: 64,
} as const);

export type SymbolicExpressionsDomainErrorCode =
  | "COEFFICIENT_OUT_OF_DOMAIN"
  | "DEGREE_OUT_OF_DOMAIN"
  | "DOMAIN_VIOLATION"
  | "EMPTY_TERMS"
  | "INTERNAL_INVARIANT_FAILURE"
  | "INVALID_FACTOR_COUNT"
  | "INVALID_LAB_ID"
  | "INVALID_MODE"
  | "INVALID_POLYNOMIAL"
  | "MODE_NOT_ALLOWED"
  | "NON_EXACT_CANCELLATION"
  | "NON_EXACT_FACTOR"
  | "NON_FINITE_INTEGER"
  | "NON_INTEGER"
  | "NON_SAFE_INTEGER"
  | "TOO_MANY_CANCELLATION_FACTORS"
  | "TOO_MANY_TERMS"
  | "TRIVIAL_CANCELLATION_FACTOR"
  | "UNSAFE_RESULT"
  | "UNSUPPORTED_EQUATION_DEGREE"
  | "ZERO_CANCELLATION_FACTOR"
  | "ZERO_POLYNOMIAL_DENOMINATOR"
  | "ZERO_RATIONAL_DENOMINATOR";

export class SymbolicExpressionsDomainError extends RangeError {
  readonly code: SymbolicExpressionsDomainErrorCode;

  constructor(code: SymbolicExpressionsDomainErrorCode, message: string) {
    super(message);
    this.name = "SymbolicExpressionsDomainError";
    this.code = code;
  }
}

export type ExactRational = {
  numerator: number;
  denominator: number;
  text: string;
};

export type PolynomialTerm = {
  coefficient: number;
  degree: number;
  sign: -1 | 1;
  text: string;
  variablePart: string;
};

export type PolynomialTileGroup = {
  coefficient: number;
  count: number;
  degree: number;
  sign: "negative" | "positive";
};

export type PolynomialState = {
  coefficients: number[];
  degree: number;
  isZero: boolean;
  terms: PolynomialTerm[];
  text: string;
  tiles: {
    complete: true;
    groups: PolynomialTileGroup[];
    reconstructedCoefficients: number[];
    totalCount: number;
  };
};

export type AlgebraicFractionState = {
  denominator: PolynomialState;
  numerator: PolynomialState;
  text: string;
};

export type PolynomialIdentityReceipt = {
  coefficientResidual: number[];
  equivalent: boolean;
  expected: PolynomialState;
  observed: PolynomialState;
};

export type AlgebraicFractionEquivalenceReceipt = {
  coefficientResidual: number[];
  domainCondition: string;
  equivalent: boolean;
  leftCrossProduct: PolynomialState;
  original: AlgebraicFractionState;
  rightCrossProduct: PolynomialState;
  transformed: AlgebraicFractionState;
};

export type SymbolicInvariantId =
  | "algebraic-fraction-domain"
  | "algebraic-fraction-equivalence"
  | "equation-substitution-residual"
  | "like-term-coefficient-conservation"
  | "polynomial-expansion"
  | "polynomial-visible-tiles";

export const SYMBOLIC_INVARIANT_IDS = deepFreeze([
  "algebraic-fraction-domain",
  "algebraic-fraction-equivalence",
  "equation-substitution-residual",
  "like-term-coefficient-conservation",
  "polynomial-expansion",
  "polynomial-visible-tiles",
] as const satisfies readonly SymbolicInvariantId[]);

type ApplicableSymbolicInvariantReceipt = {
  applicable: true;
  exact: true;
  expected: string;
  holds: boolean;
  id: SymbolicInvariantId;
  observed: string;
  residual: number | number[] | ExactRational;
  status: "failed" | "passed";
};

type NotApplicableSymbolicInvariantReceipt = {
  applicable: false;
  exact: true;
  expected: "not-applicable";
  holds: null;
  id: SymbolicInvariantId;
  observed: "not-applicable";
  residual: null;
  status: "not-applicable";
};

export type SymbolicInvariantReceipt =
  | ApplicableSymbolicInvariantReceipt
  | NotApplicableSymbolicInvariantReceipt;

export type SymbolicControlReceipt = {
  controlId: string;
  expected: string;
  observed: string;
  projection: "identity";
  requested: string;
};

export type CollectLikeTermsWork = {
  coefficientResidual: number[];
  groups: Array<{
    coefficientSum: number;
    coefficients: number[];
    degree: number;
    sourceIndices: number[];
  }>;
  kind: "collect-like-terms";
  sourceTerms: Array<MonomialInput & {
    sourceIndex: number;
    text: string;
    variablePart: string;
  }>;
};

export type BinaryPolynomialWork = {
  coefficientResidual: number[];
  columns: Array<{
    degree: number;
    effectiveRightCoefficient: number;
    leftCoefficient: number;
    resultCoefficient: number;
    rightCoefficient: number;
  }>;
  kind: "binary-polynomial";
  left: PolynomialState;
  operator: "+" | "-";
  right: PolynomialState;
  signedRight: PolynomialState;
};

export type ExpansionWork = {
  coefficientResidual: number[];
  coefficientSums: Array<{
    coefficientSum: number;
    degree: number;
    productIndices: number[];
  }>;
  factors: [PolynomialState, PolynomialState];
  kind: "expansion";
  products: Array<{
    coefficientProduct: number;
    leftCoefficient: number;
    leftDegree: number;
    productDegree: number;
    productIndex: number;
    rightCoefficient: number;
    rightDegree: number;
  }>;
};

export type FactorizationWork = {
  coefficientResidual: number[];
  divisionRemainder: PolynomialState;
  expandedProduct: PolynomialState;
  factor: PolynomialState;
  kind: "factorization";
  original: PolynomialState;
  quotient: PolynomialState;
};

export type SubstitutionWork = {
  contributions: Array<{
    coefficient: number;
    contribution: ExactRational;
    degree: number;
    power: ExactRational;
  }>;
  kind: "substitution";
  polynomial: PolynomialState;
  reconstructedResult: ExactRational;
  residual: ExactRational;
  substitutedExpression: string;
  value: ExactRational;
};

export type FractionCancellationReceipt = {
  after: AlgebraicFractionState;
  before: AlgebraicFractionState;
  denominatorRemainder: PolynomialState;
  factor: PolynomialState;
  numeratorRemainder: PolynomialState;
};

export type FractionDomainReceipt = {
  checkedValue: {
    allowed: true;
    originalDenominatorValue: ExactRational;
    value: ExactRational;
  } | null;
  condition: string;
  effectiveRationalExclusions: ExactRational[];
  originalDenominator: PolynomialState;
  rationalExclusions: ExactRational[];
  retainedOriginalRestrictions: true;
  simplifiedDenominator: PolynomialState;
};

export type FractionSimplificationWork = {
  cancelledFactors: FractionCancellationReceipt[];
  domain: FractionDomainReceipt;
  equivalence: AlgebraicFractionEquivalenceReceipt;
  kind: "fraction-simplification";
  original: AlgebraicFractionState;
  simplified: AlgebraicFractionState;
};

export type EquationValueCheck = {
  candidate: ExactRational;
  domainValid: true;
  isSolution: boolean;
  leftDenominatorValue: ExactRational;
  leftValue: ExactRational;
  residual: ExactRational;
  rightDenominatorValue: ExactRational;
  rightValue: ExactRational;
};

export type EquationSolveWork = {
  acceptedSolutions: ExactRational[];
  candidateCheck: EquationValueCheck | null;
  crossEquation: {
    leftProduct: PolynomialState;
    residualPolynomial: PolynomialState;
    rightProduct: PolynomialState;
  };
  equationKind: "fractional-linear" | "linear";
  domain: {
    leftCondition: string;
    rationalExclusions: ExactRational[];
    rightCondition: string;
  };
  kind: "equation-solve";
  original: {
    left: AlgebraicFractionState;
    right: AlgebraicFractionState;
    text: string;
  };
  solution: ExactRational;
  solutionCheck: EquationValueCheck & { isSolution: true };
};

export type SymbolicExpressionsWork =
  | BinaryPolynomialWork
  | CollectLikeTermsWork
  | EquationSolveWork
  | ExpansionWork
  | FactorizationWork
  | FractionSimplificationWork
  | SubstitutionWork;

export type SymbolicExpressionsResult =
  | {
      kind: "algebraic-fraction";
      fraction: AlgebraicFractionState;
    }
  | {
      kind: "polynomial";
      polynomial: PolynomialState;
    }
  | {
      kind: "rational";
      value: ExactRational;
    };

export type SymbolicExpressionsSerializedState = {
  family: typeof SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.family;
  groupId: typeof SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.groupId;
  inputKey: string;
  labId: SymbolicExpressionsLabId;
  mode: SymbolicExpressionsMode;
  resultKey: string;
  version: typeof SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.version;
};

export type SymbolicExpressionsModel = {
  controls: SymbolicControlReceipt[];
  curriculum: (typeof SYMBOLIC_EXPRESSIONS_CURRICULUM)[SymbolicExpressionsLabId];
  family: typeof SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.family;
  groupId: typeof SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.groupId;
  invariantReceipts: SymbolicInvariantReceipt[];
  labId: SymbolicExpressionsLabId;
  mode: SymbolicExpressionsMode;
  result: SymbolicExpressionsResult;
  state: SymbolicExpressionsSerializedState;
  stateKey: string;
  version: typeof SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.version;
  work: SymbolicExpressionsWork;
};

export const SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST = deepFreeze({
  "bnu-junior-s1-upper-algebraic-expressions": [
    "collect-like-terms",
    "add",
    "subtract",
  ],
  "bnu-junior-s2-lower-algebraic-fractions-equations": [
    "fraction-simplify",
    "solve",
  ],
  "hjb-junior-s1-upper-algebraic-fractions": ["fraction-simplify"],
  "hjb-junior-s1-upper-polynomial-add-subtract": [
    "collect-like-terms",
    "add",
    "subtract",
  ],
  "hjb-primary-p6-lower-simple-algebraic-expressions": [
    "substitute",
    "collect-like-terms",
  ],
  "pep-junior-s1-upper-expressions-linear-equations": [
    "collect-like-terms",
    "solve",
  ],
  "pep-junior-s2-upper-polynomials-fractions": [
    "expand",
    "factor",
    "fraction-simplify",
  ],
} as const satisfies Record<
  SymbolicExpressionsLabId,
  readonly SymbolicExpressionsMode[]
>);

export type SymbolicExpressionsTopicModeKey =
  `${SymbolicExpressionsLabId}:${SymbolicExpressionsMode}`;

export const SYMBOLIC_EXPRESSIONS_INVARIANT_APPLICABILITY = deepFreeze({
  "bnu-junior-s1-upper-algebraic-expressions:collect-like-terms": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "bnu-junior-s1-upper-algebraic-expressions:add": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "bnu-junior-s1-upper-algebraic-expressions:subtract": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "bnu-junior-s2-lower-algebraic-fractions-equations:fraction-simplify": [
    "algebraic-fraction-domain",
    "algebraic-fraction-equivalence",
  ],
  "bnu-junior-s2-lower-algebraic-fractions-equations:solve": [
    "algebraic-fraction-domain",
    "equation-substitution-residual",
  ],
  "hjb-junior-s1-upper-algebraic-fractions:fraction-simplify": [
    "algebraic-fraction-domain",
    "algebraic-fraction-equivalence",
  ],
  "hjb-junior-s1-upper-polynomial-add-subtract:collect-like-terms": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "hjb-junior-s1-upper-polynomial-add-subtract:add": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "hjb-junior-s1-upper-polynomial-add-subtract:subtract": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "hjb-primary-p6-lower-simple-algebraic-expressions:substitute": [
    "equation-substitution-residual",
  ],
  "hjb-primary-p6-lower-simple-algebraic-expressions:collect-like-terms": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "pep-junior-s1-upper-expressions-linear-equations:collect-like-terms": [
    "like-term-coefficient-conservation",
    "polynomial-visible-tiles",
  ],
  "pep-junior-s1-upper-expressions-linear-equations:solve": [
    "equation-substitution-residual",
  ],
  "pep-junior-s2-upper-polynomials-fractions:expand": [
    "polynomial-expansion",
  ],
  "pep-junior-s2-upper-polynomials-fractions:factor": [
    "polynomial-expansion",
  ],
  "pep-junior-s2-upper-polynomials-fractions:fraction-simplify": [
    "algebraic-fraction-domain",
    "algebraic-fraction-equivalence",
  ],
} as const satisfies Record<
  | "bnu-junior-s1-upper-algebraic-expressions:collect-like-terms"
  | "bnu-junior-s1-upper-algebraic-expressions:add"
  | "bnu-junior-s1-upper-algebraic-expressions:subtract"
  | "bnu-junior-s2-lower-algebraic-fractions-equations:fraction-simplify"
  | "bnu-junior-s2-lower-algebraic-fractions-equations:solve"
  | "hjb-junior-s1-upper-algebraic-fractions:fraction-simplify"
  | "hjb-junior-s1-upper-polynomial-add-subtract:collect-like-terms"
  | "hjb-junior-s1-upper-polynomial-add-subtract:add"
  | "hjb-junior-s1-upper-polynomial-add-subtract:subtract"
  | "hjb-primary-p6-lower-simple-algebraic-expressions:substitute"
  | "hjb-primary-p6-lower-simple-algebraic-expressions:collect-like-terms"
  | "pep-junior-s1-upper-expressions-linear-equations:collect-like-terms"
  | "pep-junior-s1-upper-expressions-linear-equations:solve"
  | "pep-junior-s2-upper-polynomials-fractions:expand"
  | "pep-junior-s2-upper-polynomials-fractions:factor"
  | "pep-junior-s2-upper-polynomials-fractions:fraction-simplify",
  readonly SymbolicInvariantId[]
>);

// This partition is grounded in the frozen A18 oracle plus the corresponding
// mainland curriculum RAG cards. It deliberately keeps the seven titles from
// collapsing back to the old single factor-p/q demonstration.
export const SYMBOLIC_EXPRESSIONS_CURRICULUM = deepFreeze({
  "bnu-junior-s1-upper-algebraic-expressions": {
    capabilityIds: [
      "like-terms-by-variable-part",
      "polynomial-addition-subtraction",
      "sign-preserving-collection",
    ],
    sourceGrounding: ["oracle-v1", "data/rag/mainlandBnuJunior.ts"],
    unitTitleZhHans: "整式及其加减",
  },
  "bnu-junior-s2-lower-algebraic-fractions-equations": {
    capabilityIds: [
      "algebraic-fraction-domain",
      "equivalent-fraction-transform",
      "original-equation-domain-check",
      "original-equation-substitution-residual",
    ],
    sourceGrounding: ["oracle-v1", "data/rag/mainlandBnuJunior.ts"],
    unitTitleZhHans: "分式与分式方程",
  },
  "hjb-junior-s1-upper-algebraic-fractions": {
    capabilityIds: [
      "algebraic-fraction-domain",
      "factor-only-cancellation",
      "retained-original-exclusions",
    ],
    sourceGrounding: ["oracle-v1", "data/rag/mainlandHjbJunior.ts"],
    unitTitleZhHans: "分式",
  },
  "hjb-junior-s1-upper-polynomial-add-subtract": {
    capabilityIds: [
      "like-terms-by-variable-part",
      "polynomial-addition-subtraction",
      "bracket-sign-preservation",
    ],
    sourceGrounding: ["oracle-v1", "data/rag/mainlandHjbJunior.ts"],
    unitTitleZhHans: "整式的加减",
  },
  "hjb-primary-p6-lower-simple-algebraic-expressions": {
    capabilityIds: [
      "letter-as-quantity",
      "exact-substitution",
      "introductory-like-terms",
    ],
    sourceGrounding: ["oracle-v1", "data/rag/mainlandHjbPrimary.ts"],
    unitTitleZhHans: "简单的代数式",
  },
  "pep-junior-s1-upper-expressions-linear-equations": {
    capabilityIds: [
      "like-term-collection",
      "independent-linear-equation",
      "original-equation-substitution-residual",
    ],
    sourceGrounding: ["oracle-v1", "data/rag/mainlandPepJunior.ts"],
    unitTitleZhHans: "整式初步与一元一次方程",
  },
  "pep-junior-s2-upper-polynomials-fractions": {
    capabilityIds: [
      "polynomial-product",
      "factorization-coefficient-residual",
      "algebraic-fraction-domain",
      "factor-only-cancellation",
    ],
    sourceGrounding: ["oracle-v1", "data/rag/mainlandPepJunior.ts"],
    unitTitleZhHans: "整式乘法、因式分解与分式",
  },
} as const satisfies Record<
  SymbolicExpressionsLabId,
  {
    capabilityIds: readonly string[];
    sourceGrounding: readonly string[];
    unitTitleZhHans: string;
  }
>);

export const SYMBOLIC_EXPRESSIONS_RESET_INPUTS = deepFreeze({
  "bnu-junior-s1-upper-algebraic-expressions": {
    labId: "bnu-junior-s1-upper-algebraic-expressions",
    mode: "collect-like-terms",
    terms: [
      { coefficient: 3, degree: 1 },
      { coefficient: 5, degree: 2 },
      { coefficient: -2, degree: 1 },
      { coefficient: 4, degree: 0 },
    ],
  },
  "bnu-junior-s2-lower-algebraic-fractions-equations": {
    candidate: { numerator: 3, denominator: 1 },
    equation: {
      left: { numerator: [2], denominator: [-1, 1] },
      right: { numerator: [1], denominator: [1] },
    },
    labId: "bnu-junior-s2-lower-algebraic-fractions-equations",
    mode: "solve",
  },
  "hjb-junior-s1-upper-algebraic-fractions": {
    cancelFactors: [[-1, 1]],
    domainValue: { numerator: 2, denominator: 1 },
    fraction: {
      numerator: [-1, 0, 1],
      denominator: [-1, 1],
    },
    labId: "hjb-junior-s1-upper-algebraic-fractions",
    mode: "fraction-simplify",
  },
  "hjb-junior-s1-upper-polynomial-add-subtract": {
    labId: "hjb-junior-s1-upper-polynomial-add-subtract",
    left: [1, -2, 3],
    mode: "subtract",
    right: [-5, 4, 1],
  },
  "hjb-primary-p6-lower-simple-algebraic-expressions": {
    labId: "hjb-primary-p6-lower-simple-algebraic-expressions",
    mode: "substitute",
    polynomial: [-2, 3],
    value: { numerator: 4, denominator: 1 },
  },
  "pep-junior-s1-upper-expressions-linear-equations": {
    candidate: { numerator: 3, denominator: 1 },
    equation: {
      left: { numerator: [1, 2], denominator: [1] },
      right: { numerator: [7], denominator: [1] },
    },
    labId: "pep-junior-s1-upper-expressions-linear-equations",
    mode: "solve",
  },
  "pep-junior-s2-upper-polynomials-fractions": {
    factors: [
      [-4, 1],
      [-4, 1],
    ],
    labId: "pep-junior-s2-upper-polynomials-fractions",
    mode: "expand",
  },
} as const satisfies Record<SymbolicExpressionsLabId, SymbolicExpressionsInput>);

type BigPolynomial = bigint[];

type BigRational = {
  denominator: bigint;
  numerator: bigint;
};

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const LAB_ID_SET = new Set<string>(SYMBOLIC_EXPRESSIONS_LAB_IDS);
const MODE_SET = new Set<string>(SYMBOLIC_EXPRESSIONS_MODES);

function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(object)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function absoluteBigInt(value: bigint): bigint {
  return value < BIGINT_ZERO ? -value : value;
}

function greatestCommonDivisorBigInt(left: bigint, right: bigint): bigint {
  let a = absoluteBigInt(left);
  let b = absoluteBigInt(right);
  while (b !== BIGINT_ZERO) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a === BIGINT_ZERO ? BIGINT_ONE : a;
}

function toSafeNumber(value: bigint, label: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || BigInt(result) !== value) {
    throw new SymbolicExpressionsDomainError(
      "UNSAFE_RESULT",
      `${label} is outside the JSON-safe integer domain.`,
    );
  }
  return Object.is(result, -0) ? 0 : result;
}

function assertSafeInteger(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SymbolicExpressionsDomainError(
      "NON_FINITE_INTEGER",
      `${label} must be a finite integer.`,
    );
  }
  if (!Number.isInteger(value)) {
    throw new SymbolicExpressionsDomainError(
      "NON_INTEGER",
      `${label} must be an integer.`,
    );
  }
  if (!Number.isSafeInteger(value)) {
    throw new SymbolicExpressionsDomainError(
      "NON_SAFE_INTEGER",
      `${label} must be a safe integer.`,
    );
  }
}

function assertCoefficient(value: unknown, label: string): asserts value is number {
  assertSafeInteger(value, label);
  if (Math.abs(value) > SYMBOLIC_EXPRESSIONS_DOMAIN.maxAbsCoefficient) {
    throw new SymbolicExpressionsDomainError(
      "COEFFICIENT_OUT_OF_DOMAIN",
      `${label} exceeds the exact symbolic coefficient domain.`,
    );
  }
}

function normalizeBigPolynomial(coefficients: readonly bigint[]): BigPolynomial {
  const result = coefficients.slice();
  while (result.length > 1 && result.at(-1) === BIGINT_ZERO) result.pop();
  return result.length === 0 ? [BIGINT_ZERO] : result;
}

function isZeroBigPolynomial(polynomial: readonly bigint[]): boolean {
  return polynomial.length === 1 && polynomial[0] === BIGINT_ZERO;
}

function validatePolynomial(
  input: unknown,
  label: string,
): BigPolynomial {
  if (!Array.isArray(input) || input.length === 0) {
    throw new SymbolicExpressionsDomainError(
      "INVALID_POLYNOMIAL",
      `${label} must be a non-empty coefficient vector.`,
    );
  }
  if (input.length - 1 > SYMBOLIC_EXPRESSIONS_DOMAIN.maxDegree) {
    throw new SymbolicExpressionsDomainError(
      "DEGREE_OUT_OF_DOMAIN",
      `${label} exceeds degree ${SYMBOLIC_EXPRESSIONS_DOMAIN.maxDegree}.`,
    );
  }
  const coefficients = input.map((coefficient, degree) => {
    assertCoefficient(coefficient, `${label}[${degree}]`);
    return BigInt(coefficient);
  });
  return normalizeBigPolynomial(coefficients);
}

function addBigPolynomials(
  left: readonly bigint[],
  right: readonly bigint[],
): BigPolynomial {
  const length = Math.max(left.length, right.length);
  return normalizeBigPolynomial(
    Array.from(
      { length },
      (_, degree) =>
        (left[degree] ?? BIGINT_ZERO) + (right[degree] ?? BIGINT_ZERO),
    ),
  );
}

function subtractBigPolynomials(
  left: readonly bigint[],
  right: readonly bigint[],
): BigPolynomial {
  const length = Math.max(left.length, right.length);
  return normalizeBigPolynomial(
    Array.from(
      { length },
      (_, degree) =>
        (left[degree] ?? BIGINT_ZERO) - (right[degree] ?? BIGINT_ZERO),
    ),
  );
}

function multiplyBigPolynomials(
  left: readonly bigint[],
  right: readonly bigint[],
): BigPolynomial {
  if (isZeroBigPolynomial(left) || isZeroBigPolynomial(right)) {
    return [BIGINT_ZERO];
  }
  const degree = left.length + right.length - 2;
  if (degree > SYMBOLIC_EXPRESSIONS_DOMAIN.maxResultDegree) {
    throw new SymbolicExpressionsDomainError(
      "DEGREE_OUT_OF_DOMAIN",
      `Polynomial product exceeds result degree ${SYMBOLIC_EXPRESSIONS_DOMAIN.maxResultDegree}.`,
    );
  }
  const result = Array.from(
    { length: left.length + right.length - 1 },
    () => BIGINT_ZERO,
  );
  left.forEach((leftCoefficient, leftDegree) => {
    right.forEach((rightCoefficient, rightDegree) => {
      result[leftDegree + rightDegree] += leftCoefficient * rightCoefficient;
    });
  });
  // Conversion here is an intentional boundary check even when the caller
  // later serializes the same vector through polynomialState.
  result.forEach((coefficient, index) =>
    toSafeNumber(coefficient, `product coefficient ${index}`),
  );
  return normalizeBigPolynomial(result);
}

function polynomialVariablePart(degree: number): string {
  if (degree === 0) return "1";
  if (degree === 1) return "x";
  return `x^${degree}`;
}

function formatPolynomialTerm(
  coefficient: number,
  degree: number,
  includeSign: boolean,
): string {
  const sign = coefficient < 0 ? "-" : includeSign ? "+" : "";
  const magnitude = Math.abs(coefficient);
  const variablePart = polynomialVariablePart(degree);
  const magnitudeText =
    degree > 0 && magnitude === 1 ? "" : String(magnitude);
  const body = degree === 0 ? magnitudeText : `${magnitudeText}${variablePart}`;
  if (!includeSign) return coefficient < 0 ? `-${body}` : body;
  return `${sign} ${body}`;
}

function polynomialState(polynomial: readonly bigint[]): PolynomialState {
  const normalized = normalizeBigPolynomial(polynomial);
  const coefficients = normalized.map((coefficient, degree) =>
    toSafeNumber(coefficient, `polynomial coefficient ${degree}`),
  );
  const terms: PolynomialTerm[] = [];
  for (let degree = coefficients.length - 1; degree >= 0; degree -= 1) {
    const coefficient = coefficients[degree] ?? 0;
    if (coefficient === 0) continue;
    terms.push({
      coefficient,
      degree,
      sign: coefficient < 0 ? -1 : 1,
      text: formatPolynomialTerm(coefficient, degree, terms.length > 0),
      variablePart: polynomialVariablePart(degree),
    });
  }
  const isZero = terms.length === 0;
  const groups: PolynomialTileGroup[] = terms.map(({ coefficient, degree }) => ({
    coefficient,
    count: Math.abs(coefficient),
    degree,
    sign: coefficient < 0 ? "negative" : "positive",
  }));
  const totalCountBigInt = groups.reduce(
    (total, group) => total + BigInt(group.count),
    BIGINT_ZERO,
  );
  const reconstructed = Array.from(
    { length: coefficients.length },
    () => 0,
  );
  groups.forEach((group) => {
    reconstructed[group.degree] = group.coefficient;
  });
  return {
    coefficients,
    degree: isZero ? 0 : coefficients.length - 1,
    isZero,
    terms,
    text: isZero
      ? "0"
      : terms
          .map((term, index) =>
            formatPolynomialTerm(term.coefficient, term.degree, index > 0),
          )
          .join(" "),
    tiles: {
      complete: true,
      groups,
      reconstructedCoefficients: normalizeNumberVector(reconstructed),
      totalCount: toSafeNumber(totalCountBigInt, "complete tile count"),
    },
  };
}

function normalizeNumberVector(values: readonly number[]): number[] {
  const result = values.map((value) => (Object.is(value, -0) ? 0 : value));
  while (result.length > 1 && result.at(-1) === 0) result.pop();
  return result.length === 0 ? [0] : result;
}

function polynomialIdentityReceiptFromBig(
  expected: readonly bigint[],
  observed: readonly bigint[],
): PolynomialIdentityReceipt {
  const residual = subtractBigPolynomials(expected, observed);
  return {
    coefficientResidual: polynomialState(residual).coefficients,
    equivalent: isZeroBigPolynomial(residual),
    expected: polynomialState(expected),
    observed: polynomialState(observed),
  };
}

function fractionState(
  numerator: readonly bigint[],
  denominator: readonly bigint[],
): AlgebraicFractionState {
  const denominatorState = polynomialState(denominator);
  if (denominatorState.isZero) {
    throw new SymbolicExpressionsDomainError(
      "ZERO_POLYNOMIAL_DENOMINATOR",
      "An algebraic-fraction denominator cannot be the zero polynomial.",
    );
  }
  const numeratorState = polynomialState(numerator);
  return {
    denominator: denominatorState,
    numerator: numeratorState,
    text: `(${numeratorState.text})/(${denominatorState.text})`,
  };
}

function validateFraction(
  input: unknown,
  label: string,
): { denominator: BigPolynomial; numerator: BigPolynomial } {
  if (!input || typeof input !== "object") {
    throw new SymbolicExpressionsDomainError(
      "INVALID_POLYNOMIAL",
      `${label} must contain numerator and denominator coefficient vectors.`,
    );
  }
  const candidate = input as Partial<AlgebraicFractionInput>;
  const numerator = validatePolynomial(candidate.numerator, `${label}.numerator`);
  const denominator = validatePolynomial(
    candidate.denominator,
    `${label}.denominator`,
  );
  if (isZeroBigPolynomial(denominator)) {
    throw new SymbolicExpressionsDomainError(
      "ZERO_POLYNOMIAL_DENOMINATOR",
      `${label}.denominator cannot be the zero polynomial.`,
    );
  }
  return { denominator, numerator };
}

function normalizeBigRational(
  numerator: bigint,
  denominator: bigint,
): BigRational {
  if (denominator === BIGINT_ZERO) {
    throw new SymbolicExpressionsDomainError(
      "ZERO_RATIONAL_DENOMINATOR",
      "An exact rational denominator cannot be zero.",
    );
  }
  const sign = denominator < BIGINT_ZERO ? -BIGINT_ONE : BIGINT_ONE;
  const divisor = greatestCommonDivisorBigInt(numerator, denominator);
  const normalizedNumerator = (sign * numerator) / divisor;
  return {
    denominator: absoluteBigInt(denominator) / divisor,
    numerator:
      normalizedNumerator === BIGINT_ZERO ? BIGINT_ZERO : normalizedNumerator,
  };
}

function validateRational(
  input: unknown,
  label: string,
): BigRational {
  if (!input || typeof input !== "object") {
    throw new SymbolicExpressionsDomainError(
      "NON_FINITE_INTEGER",
      `${label} must be an exact rational.`,
    );
  }
  const candidate = input as Partial<ExactRationalInput>;
  assertSafeInteger(candidate.numerator, `${label}.numerator`);
  assertSafeInteger(candidate.denominator, `${label}.denominator`);
  return normalizeBigRational(
    BigInt(candidate.numerator),
    BigInt(candidate.denominator),
  );
}

function exactRational(value: BigRational): ExactRational {
  const normalized = normalizeBigRational(value.numerator, value.denominator);
  const numerator = toSafeNumber(normalized.numerator, "rational numerator");
  const denominator = toSafeNumber(
    normalized.denominator,
    "rational denominator",
  );
  return {
    denominator,
    numerator,
    text: denominator === 1 ? String(numerator) : `${numerator}/${denominator}`,
  };
}

function addBigRationals(left: BigRational, right: BigRational): BigRational {
  return normalizeBigRational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function subtractBigRationals(
  left: BigRational,
  right: BigRational,
): BigRational {
  return normalizeBigRational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function multiplyBigRationals(
  left: BigRational,
  right: BigRational,
): BigRational {
  return normalizeBigRational(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

function divideBigRationals(left: BigRational, right: BigRational): BigRational {
  if (right.numerator === BIGINT_ZERO) {
    throw new SymbolicExpressionsDomainError(
      "DOMAIN_VIOLATION",
      "An algebraic expression is undefined at the requested value.",
    );
  }
  return normalizeBigRational(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

function powerBigRational(value: BigRational, exponent: number): BigRational {
  let result = normalizeBigRational(BIGINT_ONE, BIGINT_ONE);
  for (let index = 0; index < exponent; index += 1) {
    result = multiplyBigRationals(result, value);
  }
  return result;
}

function evaluateBigPolynomial(
  polynomial: readonly bigint[],
  value: BigRational,
): BigRational {
  let result = normalizeBigRational(BIGINT_ZERO, BIGINT_ONE);
  for (let degree = polynomial.length - 1; degree >= 0; degree -= 1) {
    result = addBigRationals(multiplyBigRationals(result, value), {
      denominator: BIGINT_ONE,
      numerator: polynomial[degree] ?? BIGINT_ZERO,
    });
  }
  return result;
}

function bigRationalIsZero(value: BigRational): boolean {
  return value.numerator === BIGINT_ZERO;
}

function equalBigRationals(left: BigRational, right: BigRational): boolean {
  return (
    left.numerator === right.numerator && left.denominator === right.denominator
  );
}

function compareBigRationals(left: BigRational, right: BigRational): number {
  const difference =
    left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < BIGINT_ZERO ? -1 : difference > BIGINT_ZERO ? 1 : 0;
}

function exactDividePolynomial(
  dividend: readonly bigint[],
  divisor: readonly bigint[],
): { quotient: BigPolynomial; remainder: BigPolynomial } {
  const normalizedDividend = normalizeBigPolynomial(dividend);
  const normalizedDivisor = normalizeBigPolynomial(divisor);
  if (isZeroBigPolynomial(normalizedDivisor)) {
    return { quotient: [BIGINT_ZERO], remainder: normalizedDividend };
  }
  if (
    normalizedDividend.length < normalizedDivisor.length ||
    isZeroBigPolynomial(normalizedDividend)
  ) {
    return {
      quotient: [BIGINT_ZERO],
      remainder: normalizedDividend,
    };
  }
  const remainder = normalizedDividend.slice();
  const quotient = Array.from(
    { length: normalizedDividend.length - normalizedDivisor.length + 1 },
    () => BIGINT_ZERO,
  );
  const divisorDegree = normalizedDivisor.length - 1;
  const divisorLeading = normalizedDivisor[divisorDegree] ?? BIGINT_ZERO;

  while (
    !isZeroBigPolynomial(normalizeBigPolynomial(remainder)) &&
    normalizeBigPolynomial(remainder).length >= normalizedDivisor.length
  ) {
    const normalizedRemainder = normalizeBigPolynomial(remainder);
    const remainderDegree = normalizedRemainder.length - 1;
    const remainderLeading =
      normalizedRemainder[remainderDegree] ?? BIGINT_ZERO;
    if (remainderLeading % divisorLeading !== BIGINT_ZERO) break;
    const quotientDegree = remainderDegree - divisorDegree;
    const quotientCoefficient = remainderLeading / divisorLeading;
    quotient[quotientDegree] += quotientCoefficient;
    for (let index = 0; index <= divisorDegree; index += 1) {
      const targetDegree = index + quotientDegree;
      remainder[targetDegree] =
        (remainder[targetDegree] ?? BIGINT_ZERO) -
        quotientCoefficient * (normalizedDivisor[index] ?? BIGINT_ZERO);
    }
    const trimmed = normalizeBigPolynomial(remainder);
    remainder.length = 0;
    remainder.push(...trimmed);
  }
  return {
    quotient: normalizeBigPolynomial(quotient),
    remainder: normalizeBigPolynomial(remainder),
  };
}

function positiveDivisors(value: number): number[] {
  const absolute = Math.abs(value);
  if (absolute === 0) return [1];
  const result = new Set<number>();
  for (let divisor = 1; divisor * divisor <= absolute; divisor += 1) {
    if (absolute % divisor !== 0) continue;
    result.add(divisor);
    result.add(absolute / divisor);
  }
  return [...result].sort((left, right) => left - right);
}

function rationalRoots(polynomial: readonly bigint[]): BigRational[] {
  let working = normalizeBigPolynomial(polynomial);
  const roots = new Map<string, BigRational>();
  while (working.length > 1 && working[0] === BIGINT_ZERO) {
    roots.set("0/1", normalizeBigRational(BIGINT_ZERO, BIGINT_ONE));
    working = normalizeBigPolynomial(working.slice(1));
  }
  if (working.length <= 1) return [...roots.values()];
  const constant = toSafeNumber(working[0] ?? BIGINT_ZERO, "root constant");
  const leading = toSafeNumber(working.at(-1) ?? BIGINT_ONE, "root leading");
  for (const numeratorMagnitude of positiveDivisors(constant)) {
    for (const denominator of positiveDivisors(leading)) {
      for (const sign of [-1, 1] as const) {
        const candidate = normalizeBigRational(
          BigInt(sign * numeratorMagnitude),
          BigInt(denominator),
        );
        if (!bigRationalIsZero(evaluateBigPolynomial(working, candidate))) {
          continue;
        }
        roots.set(`${candidate.numerator}/${candidate.denominator}`, candidate);
      }
    }
  }
  return [...roots.values()].sort(compareBigRationals);
}

function mergeRationalRoots(
  ...collections: readonly BigRational[][]
): BigRational[] {
  const values = new Map<string, BigRational>();
  collections.flat().forEach((value) => {
    const normalized = normalizeBigRational(value.numerator, value.denominator);
    values.set(
      `${normalized.numerator}/${normalized.denominator}`,
      normalized,
    );
  });
  return [...values.values()].sort(compareBigRationals);
}

function invariantReceipt(
  id: SymbolicInvariantId,
  holds: boolean,
  expected: string,
  observed: string,
  residual: number | number[] | ExactRational = 0,
): SymbolicInvariantReceipt {
  return {
    applicable: true,
    exact: true,
    expected,
    holds,
    id,
    observed,
    residual,
    status: holds ? "passed" : "failed",
  };
}

function notApplicableInvariantReceipt(
  id: SymbolicInvariantId,
): NotApplicableSymbolicInvariantReceipt {
  return {
    applicable: false,
    exact: true,
    expected: "not-applicable",
    holds: null,
    id,
    observed: "not-applicable",
    residual: null,
    status: "not-applicable",
  };
}

function completeInvariantReceipts(
  labId: SymbolicExpressionsLabId,
  mode: SymbolicExpressionsMode,
  receipts: readonly SymbolicInvariantReceipt[],
): SymbolicInvariantReceipt[] {
  const key = `${labId}:${mode}` as keyof typeof SYMBOLIC_EXPRESSIONS_INVARIANT_APPLICABILITY;
  const expectedIds = new Set<SymbolicInvariantId>(
    SYMBOLIC_EXPRESSIONS_INVARIANT_APPLICABILITY[key],
  );
  const byId = new Map<SymbolicInvariantId, SymbolicInvariantReceipt>();
  for (const receipt of receipts) {
    if (byId.has(receipt.id) || !expectedIds.has(receipt.id)) {
      throw new SymbolicExpressionsDomainError(
        "INTERNAL_INVARIANT_FAILURE",
        `${key} received an unexpected or duplicate ${receipt.id} receipt.`,
      );
    }
    byId.set(receipt.id, receipt);
  }
  for (const expectedId of expectedIds) {
    const receipt = byId.get(expectedId);
    if (!receipt || receipt.status !== "passed") {
      throw new SymbolicExpressionsDomainError(
        "INTERNAL_INVARIANT_FAILURE",
        `${key} did not pass its applicable ${expectedId} receipt.`,
      );
    }
  }
  return SYMBOLIC_INVARIANT_IDS.map(
    (id) => byId.get(id) ?? notApplicableInvariantReceipt(id),
  );
}

function identityControl(
  controlId: string,
  requested: string,
  expected = requested,
  observed = expected,
): SymbolicControlReceipt {
  return {
    controlId,
    expected,
    observed,
    projection: "identity",
    requested,
  };
}

function tilesReconstruct(polynomial: PolynomialState): boolean {
  return (
    polynomial.tiles.complete &&
    polynomial.tiles.totalCount ===
      polynomial.coefficients.reduce(
        (total, coefficient) => total + Math.abs(coefficient),
        0,
      ) &&
    polynomial.tiles.reconstructedCoefficients.length ===
      polynomial.coefficients.length &&
    polynomial.tiles.reconstructedCoefficients.every(
      (coefficient, index) => coefficient === polynomial.coefficients[index],
    )
  );
}

function validateIdentityAndMode(
  input: SymbolicExpressionsInput,
): { labId: SymbolicExpressionsLabId; mode: SymbolicExpressionsMode } {
  if (!input || typeof input !== "object") {
    throw new SymbolicExpressionsDomainError(
      "INVALID_LAB_ID",
      "A symbolic model input must include an exact lab ID.",
    );
  }
  const raw = input as unknown as { labId?: unknown; mode?: unknown };
  if (typeof raw.labId !== "string" || !LAB_ID_SET.has(raw.labId)) {
    throw new SymbolicExpressionsDomainError(
      "INVALID_LAB_ID",
      `Unsupported symbolic-expression lab: ${String(raw.labId)}.`,
    );
  }
  if (typeof raw.mode !== "string" || !MODE_SET.has(raw.mode)) {
    throw new SymbolicExpressionsDomainError(
      "INVALID_MODE",
      `Unsupported symbolic-expression mode: ${String(raw.mode)}.`,
    );
  }
  const labId = raw.labId as SymbolicExpressionsLabId;
  const mode = raw.mode as SymbolicExpressionsMode;
  const allowedModes = SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[labId] as readonly SymbolicExpressionsMode[];
  if (!allowedModes.includes(mode)) {
    throw new SymbolicExpressionsDomainError(
      "MODE_NOT_ALLOWED",
      `${mode} is not curriculum-authorized for ${labId}.`,
    );
  }
  return { labId, mode };
}

function resultKey(result: SymbolicExpressionsResult): string {
  if (result.kind === "polynomial") {
    return `p:${result.polynomial.coefficients.join(",")}`;
  }
  if (result.kind === "rational") {
    return `q:${result.value.numerator}/${result.value.denominator}`;
  }
  return `f:${result.fraction.numerator.coefficients.join(",")}/${result.fraction.denominator.coefficients.join(",")}`;
}

function finalizeModel(args: {
  controls: SymbolicControlReceipt[];
  inputKey: string;
  invariantReceipts: SymbolicInvariantReceipt[];
  labId: SymbolicExpressionsLabId;
  mode: SymbolicExpressionsMode;
  result: SymbolicExpressionsResult;
  work: SymbolicExpressionsWork;
}): SymbolicExpressionsModel {
  const invariantReceipts = completeInvariantReceipts(
    args.labId,
    args.mode,
    args.invariantReceipts,
  );
  const state: SymbolicExpressionsSerializedState = {
    family: SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.family,
    groupId: SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.groupId,
    inputKey: args.inputKey,
    labId: args.labId,
    mode: args.mode,
    resultKey: resultKey(args.result),
    version: SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.version,
  };
  const stateKey = [
    state.version,
    `lab=${state.labId}`,
    `mode=${state.mode}`,
    `input=${state.inputKey}`,
    `result=${state.resultKey}`,
  ].join("|");
  return deepFreeze({
    controls: args.controls,
    curriculum: SYMBOLIC_EXPRESSIONS_CURRICULUM[args.labId],
    family: SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.family,
    groupId: SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.groupId,
    invariantReceipts,
    labId: args.labId,
    mode: args.mode,
    result: args.result,
    state,
    stateKey,
    version: SYMBOLIC_EXPRESSIONS_MODEL_CONTRACT.version,
    work: args.work,
  });
}

function polynomialReceipts(
  state: PolynomialState,
  identityHolds: boolean,
  applicablePolynomialIds: readonly Extract<
    SymbolicInvariantId,
    "polynomial-expansion" | "polynomial-visible-tiles"
  >[],
  additional: SymbolicInvariantReceipt[] = [],
): SymbolicInvariantReceipt[] {
  return [
    ...(applicablePolynomialIds.includes("polynomial-expansion")
      ? [
          invariantReceipt(
            "polynomial-expansion",
            identityHolds,
            "full coefficient residual vector is zero",
            identityHolds ? "0" : "nonzero",
            [0],
          ),
        ]
      : []),
    ...(applicablePolynomialIds.includes("polynomial-visible-tiles")
      ? [
          invariantReceipt(
            "polynomial-visible-tiles",
            tilesReconstruct(state),
            state.coefficients.join(","),
            state.tiles.reconstructedCoefficients.join(","),
            [0],
          ),
        ]
      : []),
    ...additional,
  ];
}

function buildCollectLikeTermsModel(
  input: Extract<SymbolicExpressionsInput, { mode: "collect-like-terms" }>,
): SymbolicExpressionsModel {
  if (!Array.isArray(input.terms) || input.terms.length === 0) {
    throw new SymbolicExpressionsDomainError(
      "EMPTY_TERMS",
      "Collect-like-terms mode requires at least one source term.",
    );
  }
  if (input.terms.length > SYMBOLIC_EXPRESSIONS_DOMAIN.maxTerms) {
    throw new SymbolicExpressionsDomainError(
      "TOO_MANY_TERMS",
      `At most ${SYMBOLIC_EXPRESSIONS_DOMAIN.maxTerms} source terms are supported.`,
    );
  }
  const groups = new Map<
    number,
    { coefficients: bigint[]; sourceIndices: number[] }
  >();
  const sourceTerms = input.terms.map((term, sourceIndex) => {
    if (!term || typeof term !== "object") {
      throw new SymbolicExpressionsDomainError(
        "NON_FINITE_INTEGER",
        `terms[${sourceIndex}] must be a monomial.`,
      );
    }
    assertCoefficient(term.coefficient, `terms[${sourceIndex}].coefficient`);
    assertSafeInteger(term.degree, `terms[${sourceIndex}].degree`);
    if (
      term.degree < 0 ||
      term.degree > SYMBOLIC_EXPRESSIONS_DOMAIN.maxDegree
    ) {
      throw new SymbolicExpressionsDomainError(
        "DEGREE_OUT_OF_DOMAIN",
        `terms[${sourceIndex}].degree is outside the exact model domain.`,
      );
    }
    const existing = groups.get(term.degree) ?? {
      coefficients: [],
      sourceIndices: [],
    };
    existing.coefficients.push(BigInt(term.coefficient));
    existing.sourceIndices.push(sourceIndex);
    groups.set(term.degree, existing);
    return {
      coefficient: term.coefficient,
      degree: term.degree,
      sourceIndex,
      text: formatPolynomialTerm(term.coefficient, term.degree, false),
      variablePart: polynomialVariablePart(term.degree),
    };
  });
  const maximumDegree = Math.max(...groups.keys());
  const resultCoefficients = Array.from(
    { length: maximumDegree + 1 },
    () => BIGINT_ZERO,
  );
  const groupReceipts = [...groups.entries()]
    .sort(([leftDegree], [rightDegree]) => rightDegree - leftDegree)
    .map(([degree, group]) => {
      const coefficientSum = group.coefficients.reduce(
        (sum, coefficient) => sum + coefficient,
        BIGINT_ZERO,
      );
      resultCoefficients[degree] = coefficientSum;
      return {
        coefficientSum: toSafeNumber(
          coefficientSum,
          `like-term degree ${degree} sum`,
        ),
        coefficients: group.coefficients.map((coefficient) =>
          toSafeNumber(coefficient, `like-term degree ${degree} coefficient`),
        ),
        degree,
        sourceIndices: group.sourceIndices,
      };
    });
  const resultPolynomial = polynomialState(resultCoefficients);
  const reconstructed = Array.from(
    { length: resultCoefficients.length },
    () => BIGINT_ZERO,
  );
  groupReceipts.forEach((group) => {
    reconstructed[group.degree] = BigInt(group.coefficientSum);
  });
  const identity = polynomialIdentityReceiptFromBig(
    resultCoefficients,
    reconstructed,
  );
  const work: CollectLikeTermsWork = {
    coefficientResidual: identity.coefficientResidual,
    groups: groupReceipts,
    kind: "collect-like-terms",
    sourceTerms,
  };
  return finalizeModel({
    controls: [
      identityControl("expression-form", input.mode),
      identityControl(
        "coefficients",
        sourceTerms
          .map(({ coefficient, degree }) => `${coefficient}x^${degree}`)
          .join(","),
      ),
    ],
    inputKey: sourceTerms
      .map(({ coefficient, degree }) => `${coefficient}x^${degree}`)
      .join(","),
    invariantReceipts: polynomialReceipts(
      resultPolynomial,
      identity.equivalent,
      ["polynomial-visible-tiles"],
      [
        invariantReceipt(
          "like-term-coefficient-conservation",
          identity.equivalent,
          resultPolynomial.coefficients.join(","),
          polynomialState(reconstructed).coefficients.join(","),
          identity.coefficientResidual,
        ),
      ],
    ),
    labId: input.labId,
    mode: input.mode,
    result: { kind: "polynomial", polynomial: resultPolynomial },
    work,
  });
}

function buildBinaryPolynomialModel(
  input: Extract<SymbolicExpressionsInput, { mode: "add" | "subtract" }>,
): SymbolicExpressionsModel {
  const left = validatePolynomial(input.left, "left");
  const right = validatePolynomial(input.right, "right");
  const rightSign = input.mode === "add" ? BIGINT_ONE : -BIGINT_ONE;
  const length = Math.max(left.length, right.length);
  const columns = Array.from({ length }, (_, degree) => {
    const leftCoefficient = left[degree] ?? BIGINT_ZERO;
    const rightCoefficient = right[degree] ?? BIGINT_ZERO;
    const effectiveRightCoefficient = rightSign * rightCoefficient;
    const resultCoefficient = leftCoefficient + effectiveRightCoefficient;
    return {
      degree,
      effectiveRightCoefficient: toSafeNumber(
        effectiveRightCoefficient,
        `degree ${degree} effective right coefficient`,
      ),
      leftCoefficient: toSafeNumber(
        leftCoefficient,
        `degree ${degree} left coefficient`,
      ),
      resultCoefficient: toSafeNumber(
        resultCoefficient,
        `degree ${degree} result coefficient`,
      ),
      rightCoefficient: toSafeNumber(
        rightCoefficient,
        `degree ${degree} right coefficient`,
      ),
    };
  });
  const resultBig =
    input.mode === "add"
      ? addBigPolynomials(left, right)
      : subtractBigPolynomials(left, right);
  const reconstructed = columns.map(({ resultCoefficient }) =>
    BigInt(resultCoefficient),
  );
  const identity = polynomialIdentityReceiptFromBig(resultBig, reconstructed);
  const resultPolynomial = polynomialState(resultBig);
  const signedRight = polynomialState(
    right.map((coefficient) => rightSign * coefficient),
  );
  const work: BinaryPolynomialWork = {
    coefficientResidual: identity.coefficientResidual,
    columns,
    kind: "binary-polynomial",
    left: polynomialState(left),
    operator: input.mode === "add" ? "+" : "-",
    right: polynomialState(right),
    signedRight,
  };
  return finalizeModel({
    controls: [
      identityControl("operation", input.mode),
      identityControl(
        "coefficients:left",
        work.left.coefficients.join(","),
      ),
      identityControl(
        "coefficients:right",
        work.right.coefficients.join(","),
      ),
    ],
    inputKey: `${polynomialState(left).coefficients.join(",")}${work.operator}${polynomialState(right).coefficients.join(",")}`,
    invariantReceipts: polynomialReceipts(
      resultPolynomial,
      identity.equivalent,
      ["polynomial-visible-tiles"],
      [
        invariantReceipt(
          "like-term-coefficient-conservation",
          identity.equivalent,
          resultPolynomial.coefficients.join(","),
          polynomialState(reconstructed).coefficients.join(","),
          identity.coefficientResidual,
        ),
      ],
    ),
    labId: input.labId,
    mode: input.mode,
    result: { kind: "polynomial", polynomial: resultPolynomial },
    work,
  });
}

function buildExpansionModel(
  input: Extract<SymbolicExpressionsInput, { mode: "expand" }>,
): SymbolicExpressionsModel {
  if (!Array.isArray(input.factors) || input.factors.length !== 2) {
    throw new SymbolicExpressionsDomainError(
      "INVALID_FACTOR_COUNT",
      "Expand mode requires exactly two factor coefficient vectors.",
    );
  }
  const left = validatePolynomial(input.factors[0], "factors[0]");
  const right = validatePolynomial(input.factors[1], "factors[1]");
  const products: ExpansionWork["products"] = [];
  left.forEach((leftCoefficient, leftDegree) => {
    right.forEach((rightCoefficient, rightDegree) => {
      const coefficientProduct = leftCoefficient * rightCoefficient;
      products.push({
        coefficientProduct: toSafeNumber(
          coefficientProduct,
          `convolution product ${leftDegree},${rightDegree}`,
        ),
        leftCoefficient: toSafeNumber(leftCoefficient, "left coefficient"),
        leftDegree,
        productDegree: leftDegree + rightDegree,
        productIndex: products.length,
        rightCoefficient: toSafeNumber(rightCoefficient, "right coefficient"),
        rightDegree,
      });
    });
  });
  const resultBig = multiplyBigPolynomials(left, right);
  const coefficientSums = Array.from(
    { length: left.length + right.length - 1 },
    (_, degree) => {
      const matching = products.filter(
        (product) => product.productDegree === degree,
      );
      const coefficientSum = matching.reduce(
        (sum, product) => sum + BigInt(product.coefficientProduct),
        BIGINT_ZERO,
      );
      return {
        coefficientSum: toSafeNumber(
          coefficientSum,
          `convolution degree ${degree} sum`,
        ),
        degree,
        productIndices: matching.map(({ productIndex }) => productIndex),
      };
    },
  );
  const reconstructed = coefficientSums.map(({ coefficientSum }) =>
    BigInt(coefficientSum),
  );
  const identity = polynomialIdentityReceiptFromBig(resultBig, reconstructed);
  const resultPolynomial = polynomialState(resultBig);
  const work: ExpansionWork = {
    coefficientResidual: identity.coefficientResidual,
    coefficientSums,
    factors: [polynomialState(left), polynomialState(right)],
    kind: "expansion",
    products,
  };
  return finalizeModel({
    controls: [
      identityControl("expression-form", input.mode),
      identityControl(
        "factor-choice:left",
        work.factors[0].coefficients.join(","),
      ),
      identityControl(
        "factor-choice:right",
        work.factors[1].coefficients.join(","),
      ),
    ],
    inputKey: `${work.factors[0].coefficients.join(",")}*${work.factors[1].coefficients.join(",")}`,
    invariantReceipts: polynomialReceipts(
      resultPolynomial,
      identity.equivalent,
      ["polynomial-expansion"],
    ),
    labId: input.labId,
    mode: input.mode,
    result: { kind: "polynomial", polynomial: resultPolynomial },
    work,
  });
}

function buildFactorizationModel(
  input: Extract<SymbolicExpressionsInput, { mode: "factor" }>,
): SymbolicExpressionsModel {
  const original = validatePolynomial(input.polynomial, "polynomial");
  const factor = validatePolynomial(input.factor, "factor");
  if (isZeroBigPolynomial(factor)) {
    throw new SymbolicExpressionsDomainError(
      "NON_EXACT_FACTOR",
      "The zero polynomial cannot be used as a factor.",
    );
  }
  const division = exactDividePolynomial(original, factor);
  if (!isZeroBigPolynomial(division.remainder)) {
    throw new SymbolicExpressionsDomainError(
      "NON_EXACT_FACTOR",
      `${polynomialState(factor).text} is not an exact polynomial factor.`,
    );
  }
  const expanded = multiplyBigPolynomials(factor, division.quotient);
  const identity = polynomialIdentityReceiptFromBig(original, expanded);
  if (!identity.equivalent) {
    throw new SymbolicExpressionsDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      "Exact factor division did not reconstruct the source polynomial.",
    );
  }
  const originalState = polynomialState(original);
  const work: FactorizationWork = {
    coefficientResidual: identity.coefficientResidual,
    divisionRemainder: polynomialState(division.remainder),
    expandedProduct: polynomialState(expanded),
    factor: polynomialState(factor),
    kind: "factorization",
    original: originalState,
    quotient: polynomialState(division.quotient),
  };
  return finalizeModel({
    controls: [
      identityControl("expression-form", input.mode),
      identityControl("coefficients", originalState.coefficients.join(",")),
      identityControl(
        "factor-choice",
        work.factor.coefficients.join(","),
      ),
    ],
    inputKey: `${originalState.coefficients.join(",")}/${work.factor.coefficients.join(",")}`,
    invariantReceipts: polynomialReceipts(
      originalState,
      identity.equivalent,
      ["polynomial-expansion"],
    ),
    labId: input.labId,
    mode: input.mode,
    result: { kind: "polynomial", polynomial: originalState },
    work,
  });
}

function buildSubstitutionModel(
  input: Extract<SymbolicExpressionsInput, { mode: "substitute" }>,
): SymbolicExpressionsModel {
  const polynomial = validatePolynomial(input.polynomial, "polynomial");
  const value = validateRational(input.value, "value");
  const contributions: SubstitutionWork["contributions"] = polynomial.map(
    (coefficient, degree) => {
      const power = powerBigRational(value, degree);
      const contribution = multiplyBigRationals(power, {
        denominator: BIGINT_ONE,
        numerator: coefficient,
      });
      return {
        coefficient: toSafeNumber(
          coefficient,
          `substitution coefficient ${degree}`,
        ),
        contribution: exactRational(contribution),
        degree,
        power: exactRational(power),
      };
    },
  );
  const reconstructed = contributions.reduce<BigRational>(
    (sum, contribution) =>
      addBigRationals(sum, {
        denominator: BigInt(contribution.contribution.denominator),
        numerator: BigInt(contribution.contribution.numerator),
      }),
    normalizeBigRational(BIGINT_ZERO, BIGINT_ONE),
  );
  const result = evaluateBigPolynomial(polynomial, value);
  const residual = subtractBigRationals(result, reconstructed);
  const polynomialOutput = polynomialState(polynomial);
  const work: SubstitutionWork = {
    contributions,
    kind: "substitution",
    polynomial: polynomialOutput,
    reconstructedResult: exactRational(reconstructed),
    residual: exactRational(residual),
    substitutedExpression: polynomialOutput.terms
      .map(
        ({ coefficient, degree }) =>
          `(${coefficient})*(${exactRational(value).text})^${degree}`,
      )
      .join(" + "),
    value: exactRational(value),
  };
  return finalizeModel({
    controls: [
      identityControl("expression-form", input.mode),
      identityControl(
        "coefficients",
        polynomialOutput.coefficients.join(","),
      ),
      identityControl(
        "substitution-value",
        `${work.value.numerator}/${work.value.denominator}`,
      ),
    ],
    inputKey: `${polynomialOutput.coefficients.join(",")}@${work.value.numerator}/${work.value.denominator}`,
    invariantReceipts: polynomialReceipts(
      polynomialOutput,
      bigRationalIsZero(residual),
      [],
      [
        invariantReceipt(
          "equation-substitution-residual",
          bigRationalIsZero(residual),
          "0",
          work.residual.text,
          work.residual,
        ),
      ],
    ),
    labId: input.labId,
    mode: input.mode,
    result: { kind: "rational", value: exactRational(result) },
    work,
  });
}

function algebraicFractionEquivalenceFromBig(
  original: { denominator: BigPolynomial; numerator: BigPolynomial },
  transformed: { denominator: BigPolynomial; numerator: BigPolynomial },
): AlgebraicFractionEquivalenceReceipt {
  const leftCrossProduct = multiplyBigPolynomials(
    original.numerator,
    transformed.denominator,
  );
  const rightCrossProduct = multiplyBigPolynomials(
    transformed.numerator,
    original.denominator,
  );
  const residual = subtractBigPolynomials(leftCrossProduct, rightCrossProduct);
  const originalState = fractionState(
    original.numerator,
    original.denominator,
  );
  return {
    coefficientResidual: polynomialState(residual).coefficients,
    domainCondition: `${originalState.denominator.text} ≠ 0`,
    equivalent: isZeroBigPolynomial(residual),
    leftCrossProduct: polynomialState(leftCrossProduct),
    original: originalState,
    rightCrossProduct: polynomialState(rightCrossProduct),
    transformed: fractionState(
      transformed.numerator,
      transformed.denominator,
    ),
  };
}

export function buildPolynomialIdentityReceipt(
  expectedInput: PolynomialInput,
  observedInput: PolynomialInput,
): PolynomialIdentityReceipt {
  const expected = validatePolynomial(expectedInput, "expected");
  const observed = validatePolynomial(observedInput, "observed");
  return deepFreeze(polynomialIdentityReceiptFromBig(expected, observed));
}

export function buildAlgebraicFractionEquivalenceReceipt(
  originalInput: AlgebraicFractionInput,
  transformedInput: AlgebraicFractionInput,
): AlgebraicFractionEquivalenceReceipt {
  const original = validateFraction(originalInput, "original");
  const transformed = validateFraction(transformedInput, "transformed");
  return deepFreeze(
    algebraicFractionEquivalenceFromBig(original, transformed),
  );
}

function buildFractionSimplificationModel(
  input: Extract<SymbolicExpressionsInput, { mode: "fraction-simplify" }>,
): SymbolicExpressionsModel {
  const original = validateFraction(input.fraction, "fraction");
  if (!Array.isArray(input.cancelFactors)) {
    throw new SymbolicExpressionsDomainError(
      "INVALID_FACTOR_COUNT",
      "fraction-simplify mode requires explicit cancellation factors.",
    );
  }
  if (input.cancelFactors.length === 0) {
    throw new SymbolicExpressionsDomainError(
      "INVALID_FACTOR_COUNT",
      "fraction-simplify mode requires at least one explicit common factor.",
    );
  }
  if (
    input.cancelFactors.length >
    SYMBOLIC_EXPRESSIONS_DOMAIN.maxCancelFactors
  ) {
    throw new SymbolicExpressionsDomainError(
      "TOO_MANY_CANCELLATION_FACTORS",
      `At most ${SYMBOLIC_EXPRESSIONS_DOMAIN.maxCancelFactors} cancellation factors are supported.`,
    );
  }
  let current = {
    denominator: original.denominator,
    numerator: original.numerator,
  };
  const cancelledFactors: FractionCancellationReceipt[] = [];
  input.cancelFactors.forEach((factorInput, index) => {
    const factor = validatePolynomial(factorInput, `cancelFactors[${index}]`);
    if (isZeroBigPolynomial(factor)) {
      throw new SymbolicExpressionsDomainError(
        "ZERO_CANCELLATION_FACTOR",
        "The zero polynomial cannot be cancelled.",
      );
    }
    if (
      factor.length === 1 &&
      absoluteBigInt(factor[0] ?? BIGINT_ZERO) === BIGINT_ONE
    ) {
      throw new SymbolicExpressionsDomainError(
        "TRIVIAL_CANCELLATION_FACTOR",
        "Cancelling a unit factor does not produce a symbolic transformation.",
      );
    }
    const numeratorDivision = exactDividePolynomial(current.numerator, factor);
    const denominatorDivision = exactDividePolynomial(
      current.denominator,
      factor,
    );
    if (
      !isZeroBigPolynomial(numeratorDivision.remainder) ||
      !isZeroBigPolynomial(denominatorDivision.remainder)
    ) {
      throw new SymbolicExpressionsDomainError(
        "NON_EXACT_CANCELLATION",
        `${polynomialState(factor).text} is not a common polynomial factor.`,
      );
    }
    const next = {
      denominator: denominatorDivision.quotient,
      numerator: numeratorDivision.quotient,
    };
    cancelledFactors.push({
      after: fractionState(next.numerator, next.denominator),
      before: fractionState(current.numerator, current.denominator),
      denominatorRemainder: polynomialState(denominatorDivision.remainder),
      factor: polynomialState(factor),
      numeratorRemainder: polynomialState(numeratorDivision.remainder),
    });
    current = next;
  });
  const equivalence = algebraicFractionEquivalenceFromBig(original, current);
  if (!equivalence.equivalent) {
    throw new SymbolicExpressionsDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      "Exact factor cancellation produced a non-equivalent fraction.",
    );
  }
  let checkedValue: FractionDomainReceipt["checkedValue"] = null;
  if (input.domainValue !== undefined) {
    const value = validateRational(input.domainValue, "domainValue");
    const denominatorValue = evaluateBigPolynomial(
      original.denominator,
      value,
    );
    if (bigRationalIsZero(denominatorValue)) {
      throw new SymbolicExpressionsDomainError(
        "DOMAIN_VIOLATION",
        `${exactRational(value).text} violates the original denominator restriction.`,
      );
    }
    checkedValue = {
      allowed: true,
      originalDenominatorValue: exactRational(denominatorValue),
      value: exactRational(value),
    };
  }
  const originalState = fractionState(
    original.numerator,
    original.denominator,
  );
  const simplifiedState = fractionState(
    current.numerator,
    current.denominator,
  );
  const originalRationalExclusions = rationalRoots(original.denominator).map(
    exactRational,
  );
  const domain: FractionDomainReceipt = {
    checkedValue,
    condition: `${originalState.denominator.text} ≠ 0`,
    effectiveRationalExclusions: originalRationalExclusions.map(
      ({ denominator, numerator, text }) => ({ denominator, numerator, text }),
    ),
    originalDenominator: originalState.denominator,
    rationalExclusions: originalRationalExclusions,
    retainedOriginalRestrictions: true,
    simplifiedDenominator: simplifiedState.denominator,
  };
  const work: FractionSimplificationWork = {
    cancelledFactors,
    domain,
    equivalence,
    kind: "fraction-simplification",
    original: originalState,
    simplified: simplifiedState,
  };
  const visiblePolynomial = simplifiedState.numerator;
  return finalizeModel({
    controls: [
      identityControl("expression-form", input.mode),
      identityControl(
        "coefficients:numerator",
        originalState.numerator.coefficients.join(","),
      ),
      identityControl(
        "coefficients:denominator",
        originalState.denominator.coefficients.join(","),
      ),
      identityControl(
        "factor-choice",
        cancelledFactors
          .map(({ factor }) => factor.coefficients.join(","))
          .join(";"),
      ),
      identityControl(
        "domain-value",
        checkedValue
          ? `${checkedValue.value.numerator}/${checkedValue.value.denominator}`
          : "none",
      ),
    ],
    inputKey: `${originalState.numerator.coefficients.join(",")}/${originalState.denominator.coefficients.join(",")};cancel=${cancelledFactors.map(({ factor }) => factor.coefficients.join(",")).join(";")};domain=${checkedValue ? `${checkedValue.value.numerator}/${checkedValue.value.denominator}` : "none"}`,
    invariantReceipts: polynomialReceipts(
      visiblePolynomial,
      equivalence.equivalent,
      [],
      [
        invariantReceipt(
          "algebraic-fraction-domain",
          !originalState.denominator.isZero &&
            domain.retainedOriginalRestrictions &&
            (checkedValue === null || checkedValue.allowed),
          domain.condition,
          domain.condition,
          0,
        ),
        invariantReceipt(
          "algebraic-fraction-equivalence",
          equivalence.equivalent,
          "0",
          equivalence.coefficientResidual.join(","),
          equivalence.coefficientResidual,
        ),
      ],
    ),
    labId: input.labId,
    mode: input.mode,
    result: { kind: "algebraic-fraction", fraction: simplifiedState },
    work,
  });
}

function equationValueCheck(
  equation: {
    left: { denominator: BigPolynomial; numerator: BigPolynomial };
    right: { denominator: BigPolynomial; numerator: BigPolynomial };
  },
  candidate: BigRational,
  label: string,
): EquationValueCheck {
  const leftDenominatorValue = evaluateBigPolynomial(
    equation.left.denominator,
    candidate,
  );
  const rightDenominatorValue = evaluateBigPolynomial(
    equation.right.denominator,
    candidate,
  );
  if (
    bigRationalIsZero(leftDenominatorValue) ||
    bigRationalIsZero(rightDenominatorValue)
  ) {
    throw new SymbolicExpressionsDomainError(
      "DOMAIN_VIOLATION",
      `${label} ${exactRational(candidate).text} violates an original equation denominator.`,
    );
  }
  const leftNumeratorValue = evaluateBigPolynomial(
    equation.left.numerator,
    candidate,
  );
  const rightNumeratorValue = evaluateBigPolynomial(
    equation.right.numerator,
    candidate,
  );
  const leftValue = divideBigRationals(
    leftNumeratorValue,
    leftDenominatorValue,
  );
  const rightValue = divideBigRationals(
    rightNumeratorValue,
    rightDenominatorValue,
  );
  const residual = subtractBigRationals(leftValue, rightValue);
  return {
    candidate: exactRational(candidate),
    domainValid: true,
    isSolution: bigRationalIsZero(residual),
    leftDenominatorValue: exactRational(leftDenominatorValue),
    leftValue: exactRational(leftValue),
    residual: exactRational(residual),
    rightDenominatorValue: exactRational(rightDenominatorValue),
    rightValue: exactRational(rightValue),
  };
}

function buildEquationSolveModel(
  input: Extract<SymbolicExpressionsInput, { mode: "solve" }>,
): SymbolicExpressionsModel {
  if (!input.equation || typeof input.equation !== "object") {
    throw new SymbolicExpressionsDomainError(
      "INVALID_POLYNOMIAL",
      "Solve mode requires an independent original equation.",
    );
  }
  const left = validateFraction(input.equation.left, "equation.left");
  const right = validateFraction(input.equation.right, "equation.right");
  const leftProduct = multiplyBigPolynomials(
    left.numerator,
    right.denominator,
  );
  const rightProduct = multiplyBigPolynomials(
    right.numerator,
    left.denominator,
  );
  const residualPolynomial = subtractBigPolynomials(
    leftProduct,
    rightProduct,
  );
  if (residualPolynomial.length !== 2 || residualPolynomial[1] === BIGINT_ZERO) {
    throw new SymbolicExpressionsDomainError(
      "UNSUPPORTED_EQUATION_DEGREE",
      "The exact G07 solve model requires a unique linear cross-polynomial.",
    );
  }
  const solution = normalizeBigRational(
    -(residualPolynomial[0] ?? BIGINT_ZERO),
    residualPolynomial[1] ?? BIGINT_ONE,
  );
  const equation = { left, right };
  const solutionCheck = equationValueCheck(equation, solution, "solution");
  if (!solutionCheck.isSolution) {
    throw new SymbolicExpressionsDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      "The derived linear solution does not satisfy the original equation.",
    );
  }
  const candidateCheck =
    input.candidate === undefined
      ? null
      : equationValueCheck(
          equation,
          validateRational(input.candidate, "candidate"),
          "candidate",
        );
  const leftState = fractionState(left.numerator, left.denominator);
  const rightState = fractionState(right.numerator, right.denominator);
  const residualState = polynomialState(residualPolynomial);
  const work: EquationSolveWork = {
    acceptedSolutions: [exactRational(solution)],
    candidateCheck,
    crossEquation: {
      leftProduct: polynomialState(leftProduct),
      residualPolynomial: residualState,
      rightProduct: polynomialState(rightProduct),
    },
    equationKind:
      left.denominator.length === 1 && right.denominator.length === 1
        ? "linear"
        : "fractional-linear",
    domain: {
      leftCondition: `${leftState.denominator.text} ≠ 0`,
      rationalExclusions: mergeRationalRoots(
        rationalRoots(left.denominator),
        rationalRoots(right.denominator),
      ).map(exactRational),
      rightCondition: `${rightState.denominator.text} ≠ 0`,
    },
    kind: "equation-solve",
    original: {
      left: leftState,
      right: rightState,
      text: `${leftState.text} = ${rightState.text}`,
    },
    solution: exactRational(solution),
    solutionCheck: solutionCheck as EquationValueCheck & { isSolution: true },
  };
  return finalizeModel({
    controls: [
      identityControl("expression-form", input.mode),
      identityControl("equation:left", leftState.text),
      identityControl("equation:right", rightState.text),
      identityControl(
        "domain-value",
        candidateCheck
          ? `${candidateCheck.candidate.numerator}/${candidateCheck.candidate.denominator}`
          : "derived-solution",
      ),
    ],
    inputKey: `${leftState.numerator.coefficients.join(",")}/${leftState.denominator.coefficients.join(",")}=${rightState.numerator.coefficients.join(",")}/${rightState.denominator.coefficients.join(",")};candidate=${candidateCheck ? `${candidateCheck.candidate.numerator}/${candidateCheck.candidate.denominator}` : "none"}`,
    invariantReceipts: polynomialReceipts(
      residualState,
      solutionCheck.isSolution,
      [],
      [
        ...(work.equationKind === "fractional-linear"
          ? [
              invariantReceipt(
                "algebraic-fraction-domain",
                solutionCheck.domainValid,
                "derived solution satisfies both original denominator restrictions",
                `${solutionCheck.leftDenominatorValue.text},${solutionCheck.rightDenominatorValue.text}`,
                0,
              ),
            ]
          : []),
        invariantReceipt(
          "equation-substitution-residual",
          solutionCheck.isSolution && solutionCheck.residual.numerator === 0,
          "0",
          solutionCheck.residual.text,
          solutionCheck.residual,
        ),
      ],
    ),
    labId: input.labId,
    mode: input.mode,
    result: { kind: "rational", value: exactRational(solution) },
    work,
  });
}

export function buildSymbolicExpressionsModel(
  input: SymbolicExpressionsInput,
): SymbolicExpressionsModel {
  const identity = validateIdentityAndMode(input);
  switch (identity.mode) {
    case "collect-like-terms":
      return buildCollectLikeTermsModel(
        input as Extract<
          SymbolicExpressionsInput,
          { mode: "collect-like-terms" }
        >,
      );
    case "add":
    case "subtract":
      return buildBinaryPolynomialModel(
        input as Extract<
          SymbolicExpressionsInput,
          { mode: "add" | "subtract" }
        >,
      );
    case "expand":
      return buildExpansionModel(
        input as Extract<SymbolicExpressionsInput, { mode: "expand" }>,
      );
    case "factor":
      return buildFactorizationModel(
        input as Extract<SymbolicExpressionsInput, { mode: "factor" }>,
      );
    case "substitute":
      return buildSubstitutionModel(
        input as Extract<SymbolicExpressionsInput, { mode: "substitute" }>,
      );
    case "fraction-simplify":
      return buildFractionSimplificationModel(
        input as Extract<
          SymbolicExpressionsInput,
          { mode: "fraction-simplify" }
        >,
      );
    case "solve":
      return buildEquationSolveModel(
        input as Extract<SymbolicExpressionsInput, { mode: "solve" }>,
      );
  }
}

export function buildSymbolicExpressionsResetModel(
  labId: SymbolicExpressionsLabId,
): SymbolicExpressionsModel {
  if (typeof labId !== "string" || !LAB_ID_SET.has(labId)) {
    throw new SymbolicExpressionsDomainError(
      "INVALID_LAB_ID",
      `Unsupported symbolic-expression lab: ${String(labId)}.`,
    );
  }
  return buildSymbolicExpressionsModel(SYMBOLIC_EXPRESSIONS_RESET_INPUTS[labId]);
}
