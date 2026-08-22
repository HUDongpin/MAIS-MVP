export const FRACTION_OPERATIONS_MODEL_CONTRACT = deepFreeze({
  family: "fraction-operations-v2",
  version: "fraction-operations-v2",
} as const);

export const FRACTION_OPERATIONS_LAB_IDS = deepFreeze([
  "bnu-primary-p5-lower-fraction-add-sub",
  "bnu-primary-p5-lower-fraction-division",
  "bnu-primary-p5-lower-fraction-multiplication",
  "hjb-primary-p5-lower-fractions-equivalence-operations",
  "pep-primary-p5-lower-factors-fractions",
] as const);

export type FractionOperationsLabId =
  (typeof FRACTION_OPERATIONS_LAB_IDS)[number];

export const FRACTION_OPERATIONS_MODES = deepFreeze([
  "equivalence",
  "compare",
  "add",
  "subtract",
  "multiply",
  "divide",
  "simplify",
  "estimate",
] as const);

export type FractionOperationsMode =
  (typeof FRACTION_OPERATIONS_MODES)[number];

export const FRACTION_ARITHMETIC_OPERATIONS = deepFreeze([
  "add",
  "subtract",
  "multiply",
  "divide",
] as const);

export type FractionArithmeticOperation =
  (typeof FRACTION_ARITHMETIC_OPERATIONS)[number];

export type ExactFractionInput = {
  denominator: number;
  numerator: number;
};

export type FractionOperationsInput = {
  estimateOperation?: FractionArithmeticOperation;
  labId: FractionOperationsLabId;
  left: ExactFractionInput;
  mode: FractionOperationsMode;
  right: ExactFractionInput;
};

export type FractionOperationsDomainErrorCode =
  | "DENOMINATOR_NON_POSITIVE"
  | "DIVISION_BY_ZERO"
  | "ESTIMATE_OPERATION_NOT_ALLOWED"
  | "INTERNAL_INVARIANT_FAILURE"
  | "INVALID_ESTIMATE_OPERATION"
  | "INVALID_LAB_ID"
  | "INVALID_MODE"
  | "MODE_NOT_ALLOWED"
  | "NON_FINITE_INTEGER"
  | "NON_INTEGER"
  | "UNSAFE_INTEGER"
  | "UNSAFE_RESULT";

export class FractionOperationsDomainError extends RangeError {
  readonly code: FractionOperationsDomainErrorCode;

  constructor(code: FractionOperationsDomainErrorCode, message: string) {
    super(message);
    this.name = "FractionOperationsDomainError";
    this.code = code;
  }
}

export type ExactFraction = {
  denominator: number;
  numerator: number;
  text: string;
};

export type MixedNumberForm = {
  denominator: number;
  explicitWhole: boolean;
  numerator: number;
  reconstructed: ExactFraction;
  sign: -1 | 0 | 1;
  text: string;
  whole: number;
};

export type FractionSimplificationReceipt = {
  dividedDenominator: number;
  dividedNumerator: number;
  gcf: number;
  normalized: ExactFraction;
  source: ExactFraction;
  wasSimplified: boolean;
};

export type EquivalentFractionReceipt = {
  equivalent: ExactFraction;
  multiplier: number;
  source: ExactFraction;
};

export type FractionOperandState = {
  equivalent: EquivalentFractionReceipt;
  mixed: MixedNumberForm;
  normalized: ExactFraction;
  simplification: FractionSimplificationReceipt;
  source: ExactFraction;
};

export type CommonDenominatorReceipt = {
  denominatorGcf: number;
  leastCommonDenominator: number;
  left: {
    converted: ExactFraction;
    multiplier: number;
    source: ExactFraction;
  };
  right: {
    converted: ExactFraction;
    multiplier: number;
    source: ExactFraction;
  };
};

export type FractionComparisonReceipt = {
  leftCrossProduct: number;
  relation: -1 | 0 | 1;
  rightCrossProduct: number;
  symbol: "<" | "=" | ">";
};

export type FractionEvaluatedOperation =
  | Exclude<FractionOperationsMode, "estimate">
  | FractionArithmeticOperation;

export type FractionOperationReceipt = {
  evaluatedOperation: FractionEvaluatedOperation;
  exactResult: ExactFraction;
  mixedResult: MixedNumberForm;
  operator: "+" | "-" | "x" | "/" | "<" | "=" | ">" | "≡" | "→";
  operatorIsolated: true;
  requestedMode: FractionOperationsMode;
  resultSimplification: FractionSimplificationReceipt;
  unsimplifiedResult: ExactFraction;
};

export type FractionArithmeticVisibleEquation = {
  exactResult: ExactFraction;
  left: ExactFraction;
  operator: "+" | "-" | "x" | "/";
  right: ExactFraction;
  unsimplifiedResult: ExactFraction;
};

export type FractionVisibleReceipt =
  | {
      exactResult: ExactFraction;
      expansion: {
        denominator: { factor: number; product: number; source: number };
        numerator: { factor: number; product: number; source: number };
      };
      expanded: ExactFraction;
      kind: "equivalence";
      mode: "equivalence";
      source: ExactFraction;
    }
  | {
      kind: "comparison";
      mode: "compare";
      relation: {
        left: ExactFraction;
        leftCrossProduct: number;
        right: ExactFraction;
        rightCrossProduct: number;
        symbol: FractionComparisonReceipt["symbol"];
      };
      signedGap: {
        exact: ExactFraction;
        unsimplified: ExactFraction;
      };
    }
  | {
      denominatorDivision: {
        dividend: number;
        divisor: number;
        quotient: number;
      };
      gcf: number;
      kind: "simplification";
      mode: "simplify";
      numeratorDivision: {
        dividend: number;
        divisor: number;
        quotient: number;
      };
      simplified: ExactFraction;
      source: ExactFraction;
    }
  | {
      equation: FractionArithmeticVisibleEquation;
      kind: "arithmetic";
      mode: FractionArithmeticOperation;
    }
  | {
      equation: FractionArithmeticVisibleEquation;
      estimate: FractionEstimateReceipt;
      evaluatedOperation: FractionArithmeticOperation;
      kind: "estimate";
      mode: "estimate";
    };

export type FractionEstimateReceipt = {
  absoluteError: ExactFraction;
  estimatedWhole: ExactFraction;
  evaluatedOperation: FractionArithmeticOperation;
  exactResult: ExactFraction;
  lowerWhole: number;
  roundingRule: "nearest-whole-half-away-from-zero";
  signedError: ExactFraction;
  upperWhole: number;
};

export type FractionMultiplicationInterpretation = {
  area: {
    applicability: FractionPhysicalInterpretationApplicability;
    cellsPerUnit: number;
    columnFactor: ExactFraction;
    columnUnitCount: number;
    columns: number;
    gridUnitCount: number;
    overlapCells: number;
    reconstructedProduct: ExactFraction;
    remainingCells: number;
    resultSign: -1 | 0 | 1;
    rowFactor: ExactFraction;
    rowUnitCount: number;
    rows: number;
    selectedColumns: number;
    selectedRows: number;
    totalGridCells: number;
    wholeUnits: number;
  };
  product: ExactFraction;
  repeatedGroup: {
    applicability: FractionPhysicalInterpretationApplicability;
    factor: ExactFraction;
    groupCount: number;
    groupValue: ExactFraction;
    partitionDenominator: number;
    partitionReconstructedStarting: ExactFraction;
    reconstructedMagnitude: ExactFraction;
    resultSign: -1 | 0 | 1;
    selectedCount: number;
    selectedReconstructedProduct: ExactFraction;
    startingQuantity: ExactFraction;
    unitShare: ExactFraction;
  };
  scaling: {
    applicability: FractionPhysicalInterpretationApplicability;
    factor: ExactFraction;
    product: ExactFraction;
    scaleDirection: "enlarge" | "preserve" | "reduce";
    signReversed: boolean;
    startingValue: ExactFraction;
  };
};

export type FractionDivisionInterpretation = {
  measurement: {
    applicability: FractionPhysicalInterpretationApplicability;
    available: ExactFraction;
    numberOfGroups: ExactFraction;
    unitSize: ExactFraction;
  };
  quotient: ExactFraction;
  reciprocal: ExactFraction;
  reciprocalProduct: ExactFraction;
  sharing: {
    applicability: FractionPhysicalInterpretationApplicability;
    groupCount: ExactFraction;
    sharePerGroup: ExactFraction;
    total: ExactFraction;
  };
};

export type FractionPhysicalInterpretationApplicability =
  | { status: "supported" }
  | {
      reason:
        | "measurement-requires-nonnegative-available-and-positive-unit"
        | "sharing-requires-positive-integer-group-count"
        | "signed-operands-require-sign-model";
      status: "unsupported";
    };

export type FractionEquationReconstructionId =
  | "fraction-equation.additive-inverse"
  | "fraction-equation.comparison-difference"
  | "fraction-equation.division-inverse"
  | "fraction-equation.equivalent-expansion"
  | "fraction-equation.estimate-error-reconstruction"
  | "fraction-equation.multiplication-forward"
  | "fraction-equation.simplification-equivalence"
  | "fraction-equation.subtractive-inverse";

export type FractionEquationCheck = {
  holds: true;
  kind:
    | "additive-inverse"
    | "comparison-difference"
    | "division-inverse"
    | "equivalent-expansion"
    | "estimate-error-reconstruction"
    | "multiplication-forward"
    | "simplification-equivalence"
    | "subtractive-inverse";
  leftSide: ExactFraction;
  /** @deprecated Package C consumes reconstructionId and localizes it. */
  reconstruction: FractionEquationReconstructionId;
  reconstructionId: FractionEquationReconstructionId;
  rightSide: ExactFraction;
};

export type FractionInvariantId =
  | "fraction-denominator-nonzero"
  | "fraction-exact-rational"
  | "fraction-cross-product"
  | "fraction-common-denominator"
  | "fraction-simplification"
  | "fraction-whole-explicit"
  | "fraction-operation-interpretation"
  | "fraction-multiplication-area-reconstruction"
  | "fraction-multiplication-part-of-quantity-reconstruction"
  | "fraction-multiplication-scaling-reconstruction"
  | "fraction-division-reciprocal-reconstruction"
  | "fraction-division-measurement-reconstruction"
  | "fraction-division-sharing-reconstruction";

export type FractionInvariantReceipt = {
  holds: true;
  id: FractionInvariantId;
  observed: string;
  expected: string;
};

export type FractionOperationsSerializedState = {
  estimateOperation: FractionArithmeticOperation | null;
  evaluatedOperation: FractionEvaluatedOperation;
  family: typeof FRACTION_OPERATIONS_MODEL_CONTRACT.family;
  labId: FractionOperationsLabId;
  leftDenominator: number;
  leftNumerator: number;
  mode: FractionOperationsMode;
  relation: FractionComparisonReceipt["symbol"];
  resultDenominator: number;
  resultNumerator: number;
  rightDenominator: number;
  rightNumerator: number;
  version: typeof FRACTION_OPERATIONS_MODEL_CONTRACT.version;
};

export type FractionOperationsModel = {
  commonDenominator: CommonDenominatorReceipt;
  comparison: FractionComparisonReceipt;
  equationCheck: FractionEquationCheck;
  estimate: FractionEstimateReceipt | null;
  family: typeof FRACTION_OPERATIONS_MODEL_CONTRACT.family;
  invariantReceipts: FractionInvariantReceipt[];
  labId: FractionOperationsLabId;
  mode: FractionOperationsMode;
  operands: {
    left: FractionOperandState;
    right: FractionOperandState;
  };
  operation: FractionOperationReceipt;
  operationInterpretation: {
    division: FractionDivisionInterpretation | null;
    multiplication: FractionMultiplicationInterpretation | null;
  };
  state: FractionOperationsSerializedState;
  stateKey: string;
  version: typeof FRACTION_OPERATIONS_MODEL_CONTRACT.version;
  visibleReceipt: FractionVisibleReceipt;
};

const FRACTION_OPERATIONS_LAB_ID_SET = new Set<string>(
  FRACTION_OPERATIONS_LAB_IDS,
);
const FRACTION_OPERATIONS_MODE_SET = new Set<string>(
  FRACTION_OPERATIONS_MODES,
);
const FRACTION_ARITHMETIC_OPERATION_SET = new Set<string>(
  FRACTION_ARITHMETIC_OPERATIONS,
);

export const FRACTION_OPERATIONS_MODE_ALLOWLIST = deepFreeze({
  "bnu-primary-p5-lower-fraction-add-sub": [
    "add",
    "subtract",
    "simplify",
    "estimate",
  ],
  "bnu-primary-p5-lower-fraction-division": [
    "divide",
    "simplify",
    "estimate",
  ],
  "bnu-primary-p5-lower-fraction-multiplication": [
    "multiply",
    "simplify",
    "estimate",
  ],
  "hjb-primary-p5-lower-fractions-equivalence-operations": [
    "equivalence",
    "compare",
    "add",
    "subtract",
    "simplify",
    "estimate",
  ],
  "pep-primary-p5-lower-factors-fractions": FRACTION_OPERATIONS_MODES,
} as const satisfies Record<
  FractionOperationsLabId,
  readonly FractionOperationsMode[]
>);

const ESTIMATE_OPERATION_ALLOWLIST = deepFreeze({
  "bnu-primary-p5-lower-fraction-add-sub": ["add", "subtract"],
  "bnu-primary-p5-lower-fraction-division": ["divide"],
  "bnu-primary-p5-lower-fraction-multiplication": ["multiply"],
  "hjb-primary-p5-lower-fractions-equivalence-operations": [
    "add",
    "subtract",
  ],
  "pep-primary-p5-lower-factors-fractions": FRACTION_ARITHMETIC_OPERATIONS,
} as const satisfies Record<
  FractionOperationsLabId,
  readonly FractionArithmeticOperation[]
>);

export const FRACTION_OPERATIONS_RESET_INPUTS = deepFreeze({
  "bnu-primary-p5-lower-fraction-add-sub": {
    labId: "bnu-primary-p5-lower-fraction-add-sub",
    left: { numerator: 7, denominator: 4 },
    mode: "add",
    right: { numerator: 5, denominator: 6 },
  },
  "bnu-primary-p5-lower-fraction-division": {
    labId: "bnu-primary-p5-lower-fraction-division",
    left: { numerator: 7, denominator: 4 },
    mode: "divide",
    right: { numerator: 5, denominator: 6 },
  },
  "bnu-primary-p5-lower-fraction-multiplication": {
    labId: "bnu-primary-p5-lower-fraction-multiplication",
    left: { numerator: 7, denominator: 4 },
    mode: "multiply",
    right: { numerator: 5, denominator: 6 },
  },
  "hjb-primary-p5-lower-fractions-equivalence-operations": {
    labId: "hjb-primary-p5-lower-fractions-equivalence-operations",
    left: { numerator: 6, denominator: 4 },
    mode: "equivalence",
    right: { numerator: 9, denominator: 6 },
  },
  "pep-primary-p5-lower-factors-fractions": {
    labId: "pep-primary-p5-lower-factors-fractions",
    left: { numerator: 12, denominator: 8 },
    mode: "simplify",
    right: { numerator: 15, denominator: 10 },
  },
} as const satisfies Record<FractionOperationsLabId, FractionOperationsInput>);

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TWO = BigInt(2);

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

function signOfBigInt(value: bigint): -1 | 0 | 1 {
  if (value < BIGINT_ZERO) return -1;
  if (value > BIGINT_ZERO) return 1;
  return 0;
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
  const number = Number(value);
  if (!Number.isSafeInteger(number) || BigInt(number) !== value) {
    throw new FractionOperationsDomainError(
      "UNSAFE_RESULT",
      `${label} is outside the JSON-safe integer domain.`,
    );
  }
  return Object.is(number, -0) ? 0 : number;
}

function assertInteger(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new FractionOperationsDomainError(
      "NON_FINITE_INTEGER",
      `${label} must be finite.`,
    );
  }
  if (!Number.isInteger(value)) {
    throw new FractionOperationsDomainError(
      "NON_INTEGER",
      `${label} must be an integer.`,
    );
  }
  if (!Number.isSafeInteger(value)) {
    throw new FractionOperationsDomainError(
      "UNSAFE_INTEGER",
      `${label} must be a safe integer.`,
    );
  }
}

function assertFraction(input: ExactFractionInput, label: string): void {
  assertInteger(input.numerator, `${label}.numerator`);
  assertInteger(input.denominator, `${label}.denominator`);
  if (input.denominator <= 0) {
    throw new FractionOperationsDomainError(
      "DENOMINATOR_NON_POSITIVE",
      `${label}.denominator must be positive.`,
    );
  }
}

function fractionText(numerator: number, denominator: number): string {
  return denominator === 1
    ? String(numerator)
    : `${numerator}/${denominator}`;
}

function rawFraction(numerator: bigint, denominator: bigint): ExactFraction {
  if (denominator === BIGINT_ZERO) {
    throw new FractionOperationsDomainError(
      "DIVISION_BY_ZERO",
      "A fraction denominator cannot be zero.",
    );
  }
  const sign = denominator < BIGINT_ZERO ? -BIGINT_ONE : BIGINT_ONE;
  const safeNumerator = toSafeNumber(numerator * sign, "fraction numerator");
  const safeDenominator = toSafeNumber(
    absoluteBigInt(denominator),
    "fraction denominator",
  );
  return {
    denominator: safeDenominator,
    numerator: safeNumerator,
    text: fractionText(safeNumerator, safeDenominator),
  };
}

function normalizeFraction(
  numerator: bigint,
  denominator: bigint,
): ExactFraction {
  const source = rawFraction(numerator, denominator);
  if (source.numerator === 0) {
    return { denominator: 1, numerator: 0, text: "0" };
  }
  const divisor = greatestCommonDivisorBigInt(
    BigInt(source.numerator),
    BigInt(source.denominator),
  );
  const normalizedNumerator = toSafeNumber(
    BigInt(source.numerator) / divisor,
    "normalized numerator",
  );
  const normalizedDenominator = toSafeNumber(
    BigInt(source.denominator) / divisor,
    "normalized denominator",
  );
  return {
    denominator: normalizedDenominator,
    numerator: normalizedNumerator,
    text: fractionText(normalizedNumerator, normalizedDenominator),
  };
}

function equalFractions(left: ExactFraction, right: ExactFraction): boolean {
  return (
    BigInt(left.numerator) * BigInt(right.denominator) ===
    BigInt(right.numerator) * BigInt(left.denominator)
  );
}

function addFractions(
  left: ExactFraction,
  right: ExactFraction,
): ExactFraction {
  return normalizeFraction(
    BigInt(left.numerator) * BigInt(right.denominator) +
      BigInt(right.numerator) * BigInt(left.denominator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function subtractFractions(
  left: ExactFraction,
  right: ExactFraction,
): ExactFraction {
  return normalizeFraction(
    BigInt(left.numerator) * BigInt(right.denominator) -
      BigInt(right.numerator) * BigInt(left.denominator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function multiplyFractions(
  left: ExactFraction,
  right: ExactFraction,
): ExactFraction {
  return normalizeFraction(
    BigInt(left.numerator) * BigInt(right.numerator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function divideFractions(
  left: ExactFraction,
  right: ExactFraction,
): ExactFraction {
  if (right.numerator === 0) {
    throw new FractionOperationsDomainError(
      "DIVISION_BY_ZERO",
      "A fraction operation cannot divide by zero.",
    );
  }
  return normalizeFraction(
    BigInt(left.numerator) * BigInt(right.denominator),
    BigInt(left.denominator) * BigInt(right.numerator),
  );
}

function absoluteFraction(value: ExactFraction): ExactFraction {
  return {
    denominator: value.denominator,
    numerator: Math.abs(value.numerator),
    text: fractionText(Math.abs(value.numerator), value.denominator),
  };
}

function negateFraction(value: ExactFraction): ExactFraction {
  return normalizeFraction(-BigInt(value.numerator), BigInt(value.denominator));
}

function buildMixedNumber(value: ExactFraction): MixedNumberForm {
  const normalized = normalizeFraction(
    BigInt(value.numerator),
    BigInt(value.denominator),
  );
  const sign = signOfBigInt(BigInt(normalized.numerator));
  const magnitude = absoluteBigInt(BigInt(normalized.numerator));
  const denominator = BigInt(normalized.denominator);
  const whole = toSafeNumber(magnitude / denominator, "mixed whole");
  const numerator = toSafeNumber(
    magnitude % denominator,
    "mixed numerator",
  );
  const explicitWhole = numerator === 0;
  let text: string;
  if (sign === 0) text = "0";
  else if (explicitWhole) text = `${sign < 0 ? "-" : ""}${whole}`;
  else if (whole === 0)
    text = `${sign < 0 ? "-" : ""}${numerator}/${normalized.denominator}`;
  else
    text = `${sign < 0 ? "-" : ""}${whole} ${numerator}/${normalized.denominator}`;

  const reconstructed = normalizeFraction(
    BigInt(sign) *
      (BigInt(whole) * BigInt(normalized.denominator) + BigInt(numerator)),
    BigInt(normalized.denominator),
  );
  return {
    denominator: normalized.denominator,
    explicitWhole,
    numerator,
    reconstructed,
    sign,
    text,
    whole,
  };
}

function buildSimplification(
  value: ExactFraction,
): FractionSimplificationReceipt {
  const divisor = greatestCommonDivisorBigInt(
    BigInt(value.numerator),
    BigInt(value.denominator),
  );
  const dividedNumerator = toSafeNumber(
    BigInt(value.numerator) / divisor,
    "simplified numerator",
  );
  const dividedDenominator = toSafeNumber(
    BigInt(value.denominator) / divisor,
    "simplified denominator",
  );
  return {
    dividedDenominator,
    dividedNumerator,
    gcf: toSafeNumber(divisor, "fraction GCF"),
    normalized: normalizeFraction(
      BigInt(value.numerator),
      BigInt(value.denominator),
    ),
    source: value,
    wasSimplified: divisor > BIGINT_ONE,
  };
}

function buildEquivalent(
  value: ExactFraction,
): EquivalentFractionReceipt {
  return {
    equivalent: rawFraction(
      BigInt(value.numerator) * BIGINT_TWO,
      BigInt(value.denominator) * BIGINT_TWO,
    ),
    multiplier: 2,
    source: value,
  };
}

function buildOperand(input: ExactFractionInput): FractionOperandState {
  const source = rawFraction(BigInt(input.numerator), BigInt(input.denominator));
  const normalized = normalizeFraction(
    BigInt(input.numerator),
    BigInt(input.denominator),
  );
  return {
    equivalent: buildEquivalent(source),
    mixed: buildMixedNumber(normalized),
    normalized,
    simplification: buildSimplification(source),
    source,
  };
}

function buildCommonDenominator(
  left: ExactFraction,
  right: ExactFraction,
): CommonDenominatorReceipt {
  const leftDenominator = BigInt(left.denominator);
  const rightDenominator = BigInt(right.denominator);
  const divisor = greatestCommonDivisorBigInt(
    leftDenominator,
    rightDenominator,
  );
  const leastCommonDenominator =
    (leftDenominator / divisor) * rightDenominator;
  const leftMultiplier = leastCommonDenominator / leftDenominator;
  const rightMultiplier = leastCommonDenominator / rightDenominator;
  return {
    denominatorGcf: toSafeNumber(divisor, "denominator GCF"),
    leastCommonDenominator: toSafeNumber(
      leastCommonDenominator,
      "least common denominator",
    ),
    left: {
      converted: rawFraction(
        BigInt(left.numerator) * leftMultiplier,
        leastCommonDenominator,
      ),
      multiplier: toSafeNumber(leftMultiplier, "left LCD multiplier"),
      source: left,
    },
    right: {
      converted: rawFraction(
        BigInt(right.numerator) * rightMultiplier,
        leastCommonDenominator,
      ),
      multiplier: toSafeNumber(rightMultiplier, "right LCD multiplier"),
      source: right,
    },
  };
}

function buildComparison(
  left: ExactFraction,
  right: ExactFraction,
): FractionComparisonReceipt {
  const leftCrossProduct = BigInt(left.numerator) * BigInt(right.denominator);
  const rightCrossProduct = BigInt(right.numerator) * BigInt(left.denominator);
  const relation = signOfBigInt(leftCrossProduct - rightCrossProduct);
  return {
    leftCrossProduct: toSafeNumber(leftCrossProduct, "left cross product"),
    relation,
    rightCrossProduct: toSafeNumber(rightCrossProduct, "right cross product"),
    symbol: relation < 0 ? "<" : relation > 0 ? ">" : "=",
  };
}

function arithmeticResult(
  operation: FractionArithmeticOperation,
  left: ExactFraction,
  right: ExactFraction,
): ExactFraction {
  if (operation === "add") return addFractions(left, right);
  if (operation === "subtract") return subtractFractions(left, right);
  if (operation === "multiply") return multiplyFractions(left, right);
  return divideFractions(left, right);
}

function arithmeticUnsimplifiedResult(
  operation: FractionArithmeticOperation,
  left: ExactFraction,
  right: ExactFraction,
  commonDenominator: CommonDenominatorReceipt,
): ExactFraction {
  if (operation === "add" || operation === "subtract") {
    const leftNumerator = BigInt(commonDenominator.left.converted.numerator);
    const rightNumerator = BigInt(commonDenominator.right.converted.numerator);
    return rawFraction(
      operation === "add"
        ? leftNumerator + rightNumerator
        : leftNumerator - rightNumerator,
      BigInt(commonDenominator.leastCommonDenominator),
    );
  }
  if (operation === "multiply") {
    return rawFraction(
      BigInt(left.numerator) * BigInt(right.numerator),
      BigInt(left.denominator) * BigInt(right.denominator),
    );
  }
  if (right.numerator === 0) {
    throw new FractionOperationsDomainError(
      "DIVISION_BY_ZERO",
      "A fraction operation cannot divide by zero.",
    );
  }
  return rawFraction(
    BigInt(left.numerator) * BigInt(right.denominator),
    BigInt(left.denominator) * BigInt(right.numerator),
  );
}

function buildOperation(
  input: FractionOperationsInput,
  evaluatedOperation: FractionEvaluatedOperation,
  left: ExactFraction,
  right: ExactFraction,
  commonDenominator: CommonDenominatorReceipt,
  comparison: FractionComparisonReceipt,
): FractionOperationReceipt {
  let operator: FractionOperationReceipt["operator"];
  let unsimplifiedResult: ExactFraction;
  let exactResult: ExactFraction;

  if (
    evaluatedOperation === "add" ||
    evaluatedOperation === "subtract" ||
    evaluatedOperation === "multiply" ||
    evaluatedOperation === "divide"
  ) {
    operator =
      evaluatedOperation === "add"
        ? "+"
        : evaluatedOperation === "subtract"
          ? "-"
          : evaluatedOperation === "multiply"
            ? "x"
            : "/";
    unsimplifiedResult = arithmeticUnsimplifiedResult(
      evaluatedOperation,
      left,
      right,
      commonDenominator,
    );
    exactResult = arithmeticResult(evaluatedOperation, left, right);
  } else if (evaluatedOperation === "compare") {
    operator = comparison.symbol;
    unsimplifiedResult = rawFraction(
      BigInt(commonDenominator.left.converted.numerator) -
        BigInt(commonDenominator.right.converted.numerator),
      BigInt(commonDenominator.leastCommonDenominator),
    );
    exactResult = normalizeFraction(
      BigInt(unsimplifiedResult.numerator),
      BigInt(unsimplifiedResult.denominator),
    );
  } else if (evaluatedOperation === "equivalence") {
    operator = "≡";
    unsimplifiedResult = buildEquivalent(left).equivalent;
    exactResult = normalizeFraction(
      BigInt(left.numerator),
      BigInt(left.denominator),
    );
  } else {
    operator = "→";
    unsimplifiedResult = left;
    exactResult = normalizeFraction(
      BigInt(left.numerator),
      BigInt(left.denominator),
    );
  }

  return {
    evaluatedOperation,
    exactResult,
    mixedResult: buildMixedNumber(exactResult),
    operator,
    operatorIsolated: true,
    requestedMode: input.mode,
    resultSimplification: buildSimplification(unsimplifiedResult),
    unsimplifiedResult,
  };
}

function nearestWhole(value: ExactFraction): {
  estimated: ExactFraction;
  lower: number;
  upper: number;
} {
  const numerator = BigInt(value.numerator);
  const denominator = BigInt(value.denominator);
  const truncated = numerator / denominator;
  const remainder = numerator % denominator;
  const adjustment =
    absoluteBigInt(remainder) * BIGINT_TWO >= denominator
      ? BigInt(signOfBigInt(numerator))
      : BIGINT_ZERO;
  const estimate = truncated + adjustment;
  const floor =
    numerator < BIGINT_ZERO && remainder !== BIGINT_ZERO
      ? truncated - BIGINT_ONE
      : truncated;
  const ceil =
    numerator > BIGINT_ZERO && remainder !== BIGINT_ZERO
      ? truncated + BIGINT_ONE
      : truncated;
  return {
    estimated: normalizeFraction(estimate, BIGINT_ONE),
    lower: toSafeNumber(floor, "estimate lower whole"),
    upper: toSafeNumber(ceil, "estimate upper whole"),
  };
}

function buildEstimate(
  operation: FractionArithmeticOperation,
  exactResult: ExactFraction,
): FractionEstimateReceipt {
  const nearest = nearestWhole(exactResult);
  const signedError = subtractFractions(nearest.estimated, exactResult);
  return {
    absoluteError: absoluteFraction(signedError),
    estimatedWhole: nearest.estimated,
    evaluatedOperation: operation,
    exactResult,
    lowerWhole: nearest.lower,
    roundingRule: "nearest-whole-half-away-from-zero",
    signedError,
    upperWhole: nearest.upper,
  };
}

function arithmeticVisibleOperator(
  operation: FractionArithmeticOperation,
): FractionArithmeticVisibleEquation["operator"] {
  if (operation === "add") return "+";
  if (operation === "subtract") return "-";
  if (operation === "multiply") return "x";
  return "/";
}

function buildArithmeticVisibleEquation(
  operation: FractionArithmeticOperation,
  left: ExactFraction,
  right: ExactFraction,
  receipt: FractionOperationReceipt,
): FractionArithmeticVisibleEquation {
  return {
    exactResult: receipt.exactResult,
    left,
    operator: arithmeticVisibleOperator(operation),
    right,
    unsimplifiedResult: receipt.unsimplifiedResult,
  };
}

function buildVisibleReceipt(args: {
  comparison: FractionComparisonReceipt;
  estimate: FractionEstimateReceipt | null;
  input: FractionOperationsInput;
  left: FractionOperandState;
  operation: FractionOperationReceipt;
  right: FractionOperandState;
}): FractionVisibleReceipt {
  const { comparison, estimate, input, left, operation, right } = args;

  if (input.mode === "equivalence") {
    const multiplier = left.equivalent.multiplier;
    return {
      exactResult: operation.exactResult,
      expansion: {
        denominator: {
          factor: multiplier,
          product: left.equivalent.equivalent.denominator,
          source: left.source.denominator,
        },
        numerator: {
          factor: multiplier,
          product: left.equivalent.equivalent.numerator,
          source: left.source.numerator,
        },
      },
      expanded: left.equivalent.equivalent,
      kind: "equivalence",
      mode: "equivalence",
      source: left.source,
    };
  }

  if (input.mode === "compare") {
    return {
      kind: "comparison",
      mode: "compare",
      relation: {
        left: left.source,
        leftCrossProduct: comparison.leftCrossProduct,
        right: right.source,
        rightCrossProduct: comparison.rightCrossProduct,
        symbol: comparison.symbol,
      },
      signedGap: {
        exact: operation.exactResult,
        unsimplified: operation.unsimplifiedResult,
      },
    };
  }

  if (input.mode === "simplify") {
    const simplification = left.simplification;
    return {
      denominatorDivision: {
        dividend: simplification.source.denominator,
        divisor: simplification.gcf,
        quotient: simplification.dividedDenominator,
      },
      gcf: simplification.gcf,
      kind: "simplification",
      mode: "simplify",
      numeratorDivision: {
        dividend: simplification.source.numerator,
        divisor: simplification.gcf,
        quotient: simplification.dividedNumerator,
      },
      simplified: simplification.normalized,
      source: simplification.source,
    };
  }

  const evaluatedOperation = operation.evaluatedOperation;
  if (
    evaluatedOperation !== "add" &&
    evaluatedOperation !== "subtract" &&
    evaluatedOperation !== "multiply" &&
    evaluatedOperation !== "divide"
  ) {
    throw new FractionOperationsDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      `Visible arithmetic receipt cannot represent ${evaluatedOperation}.`,
    );
  }
  const equation = buildArithmeticVisibleEquation(
    evaluatedOperation,
    left.source,
    right.source,
    operation,
  );
  if (input.mode === "estimate") {
    if (!estimate) {
      throw new FractionOperationsDomainError(
        "INTERNAL_INVARIANT_FAILURE",
        "Estimate visible receipt requires an estimate receipt.",
      );
    }
    return {
      equation,
      estimate,
      evaluatedOperation,
      kind: "estimate",
      mode: "estimate",
    };
  }
  return {
    equation,
    kind: "arithmetic",
    mode: evaluatedOperation,
  };
}

function supportedPhysicalInterpretation(): FractionPhysicalInterpretationApplicability {
  return { status: "supported" };
}

function unsupportedPhysicalInterpretation(
  reason: Extract<
    FractionPhysicalInterpretationApplicability,
    { status: "unsupported" }
  >["reason"],
): FractionPhysicalInterpretationApplicability {
  return { reason, status: "unsupported" };
}

function buildMultiplicationInterpretation(
  left: ExactFraction,
  right: ExactFraction,
  product: ExactFraction,
): FractionMultiplicationInterpretation {
  const physicalApplicability =
    left.numerator < 0 || right.numerator < 0
      ? unsupportedPhysicalInterpretation("signed-operands-require-sign-model")
      : supportedPhysicalInterpretation();
  const cellsPerUnit =
    BigInt(left.denominator) * BigInt(right.denominator);
  const selectedRows = absoluteBigInt(BigInt(left.numerator));
  const selectedColumns = absoluteBigInt(BigInt(right.numerator));
  const rows = BigInt(left.denominator);
  const columns = BigInt(right.denominator);
  const overlapCells = selectedRows * selectedColumns;
  const resultSign = signOfBigInt(
    BigInt(left.numerator) * BigInt(right.numerator),
  );
  const groupCount = absoluteBigInt(BigInt(left.numerator));
  const unitShare = normalizeFraction(
    BigInt(right.numerator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
  const partitionReconstructedStarting = multiplyFractions(
    normalizeFraction(rows, BIGINT_ONE),
    unitShare,
  );
  const selectedReconstructedProduct = multiplyFractions(
    normalizeFraction(BigInt(left.numerator), BIGINT_ONE),
    unitShare,
  );
  const groupValue = absoluteFraction(unitShare);
  const reconstructedMagnitude = absoluteFraction(
    selectedReconstructedProduct,
  );
  const absoluteFactorComparison =
    absoluteBigInt(BigInt(left.numerator)) - BigInt(left.denominator);
  const rowUnitCount =
    selectedRows === BIGINT_ZERO
      ? BIGINT_ONE
      : (selectedRows + rows - BIGINT_ONE) / rows;
  const columnUnitCount =
    selectedColumns === BIGINT_ZERO
      ? BIGINT_ONE
      : (selectedColumns + columns - BIGINT_ONE) / columns;
  const gridUnitCount = rowUnitCount * columnUnitCount;
  const reconstructedProduct = normalizeFraction(
    BigInt(resultSign) * overlapCells,
    cellsPerUnit,
  );

  return {
    area: {
      applicability: physicalApplicability,
      cellsPerUnit: toSafeNumber(cellsPerUnit, "area cells per unit"),
      columnFactor: right,
      columnUnitCount: toSafeNumber(
        columnUnitCount,
        "area column unit count",
      ),
      columns: right.denominator,
      gridUnitCount: toSafeNumber(gridUnitCount, "area grid unit count"),
      overlapCells: toSafeNumber(overlapCells, "area overlap cells"),
      reconstructedProduct,
      remainingCells: toSafeNumber(
        overlapCells % cellsPerUnit,
        "area remaining cells",
      ),
      resultSign,
      rowFactor: left,
      rowUnitCount: toSafeNumber(rowUnitCount, "area row unit count"),
      rows: left.denominator,
      selectedColumns: toSafeNumber(
        selectedColumns,
        "area selected columns",
      ),
      selectedRows: toSafeNumber(selectedRows, "area selected rows"),
      totalGridCells: toSafeNumber(
        gridUnitCount * cellsPerUnit,
        "area total grid cells",
      ),
      wholeUnits: toSafeNumber(
        overlapCells / cellsPerUnit,
        "area whole units",
      ),
    },
    product,
    repeatedGroup: {
      applicability: physicalApplicability,
      factor: left,
      groupCount: toSafeNumber(groupCount, "repeated group count"),
      groupValue,
      partitionDenominator: left.denominator,
      partitionReconstructedStarting,
      reconstructedMagnitude,
      resultSign,
      selectedCount: left.numerator,
      selectedReconstructedProduct,
      startingQuantity: right,
      unitShare,
    },
    scaling: {
      applicability: physicalApplicability,
      factor: normalizeFraction(
        BigInt(left.numerator),
        BigInt(left.denominator),
      ),
      product,
      scaleDirection:
        absoluteFactorComparison < BIGINT_ZERO
          ? "reduce"
          : absoluteFactorComparison > BIGINT_ZERO
            ? "enlarge"
            : "preserve",
      signReversed:
        left.numerator !== 0 && Math.sign(left.numerator) !== 1,
      startingValue: normalizeFraction(
        BigInt(right.numerator),
        BigInt(right.denominator),
      ),
    },
  };
}

function buildDivisionInterpretation(
  left: ExactFraction,
  right: ExactFraction,
  quotient: ExactFraction,
): FractionDivisionInterpretation {
  const reciprocal = normalizeFraction(
    BigInt(right.denominator),
    BigInt(right.numerator),
  );
  const normalizedLeft = normalizeFraction(
    BigInt(left.numerator),
    BigInt(left.denominator),
  );
  const normalizedRight = normalizeFraction(
    BigInt(right.numerator),
    BigInt(right.denominator),
  );
  const measurementApplicability =
    normalizedLeft.numerator < 0 || normalizedRight.numerator < 0
      ? unsupportedPhysicalInterpretation("signed-operands-require-sign-model")
      : normalizedRight.numerator > 0
        ? supportedPhysicalInterpretation()
        : unsupportedPhysicalInterpretation(
            "measurement-requires-nonnegative-available-and-positive-unit",
          );
  const sharingApplicability =
    normalizedLeft.numerator < 0 || normalizedRight.numerator < 0
      ? unsupportedPhysicalInterpretation("signed-operands-require-sign-model")
      : normalizedRight.numerator > 0 && normalizedRight.denominator === 1
        ? supportedPhysicalInterpretation()
        : unsupportedPhysicalInterpretation(
            "sharing-requires-positive-integer-group-count",
          );
  return {
    measurement: {
      applicability: measurementApplicability,
      available: normalizedLeft,
      numberOfGroups: quotient,
      unitSize: normalizedRight,
    },
    quotient,
    reciprocal,
    reciprocalProduct: multiplyFractions(normalizedLeft, reciprocal),
    sharing: {
      applicability: sharingApplicability,
      groupCount: normalizedRight,
      sharePerGroup: quotient,
      total: normalizedLeft,
    },
  };
}

function buildEquationCheck(
  input: FractionOperationsInput,
  operation: FractionOperationReceipt,
  left: ExactFraction,
  right: ExactFraction,
  estimate: FractionEstimateReceipt | null,
): FractionEquationCheck {
  const exactResult = operation.exactResult;
  let kind: FractionEquationCheck["kind"];
  let leftSide: ExactFraction;
  let rightSide: ExactFraction;
  let reconstructionId: FractionEquationReconstructionId;

  if (input.mode === "estimate") {
    if (!estimate) throw new Error("estimate receipt missing");
    kind = "estimate-error-reconstruction";
    leftSide = addFractions(exactResult, estimate.signedError);
    rightSide = estimate.estimatedWhole;
    reconstructionId = "fraction-equation.estimate-error-reconstruction";
  } else if (operation.evaluatedOperation === "add") {
    kind = "additive-inverse";
    leftSide = subtractFractions(exactResult, right);
    rightSide = normalizeFraction(
      BigInt(left.numerator),
      BigInt(left.denominator),
    );
    reconstructionId = "fraction-equation.additive-inverse";
  } else if (operation.evaluatedOperation === "subtract") {
    kind = "subtractive-inverse";
    leftSide = addFractions(exactResult, right);
    rightSide = normalizeFraction(
      BigInt(left.numerator),
      BigInt(left.denominator),
    );
    reconstructionId = "fraction-equation.subtractive-inverse";
  } else if (operation.evaluatedOperation === "multiply") {
    kind = "multiplication-forward";
    leftSide = multiplyFractions(left, right);
    rightSide = exactResult;
    reconstructionId = "fraction-equation.multiplication-forward";
  } else if (operation.evaluatedOperation === "divide") {
    kind = "division-inverse";
    leftSide = multiplyFractions(exactResult, right);
    rightSide = normalizeFraction(
      BigInt(left.numerator),
      BigInt(left.denominator),
    );
    reconstructionId = "fraction-equation.division-inverse";
  } else if (operation.evaluatedOperation === "compare") {
    kind = "comparison-difference";
    leftSide = subtractFractions(left, right);
    rightSide = exactResult;
    reconstructionId = "fraction-equation.comparison-difference";
  } else if (operation.evaluatedOperation === "equivalence") {
    kind = "equivalent-expansion";
    leftSide = normalizeFraction(
      BigInt(operation.unsimplifiedResult.numerator),
      BigInt(operation.unsimplifiedResult.denominator),
    );
    rightSide = normalizeFraction(
      BigInt(left.numerator),
      BigInt(left.denominator),
    );
    reconstructionId = "fraction-equation.equivalent-expansion";
  } else {
    kind = "simplification-equivalence";
    leftSide = normalizeFraction(
      BigInt(left.numerator),
      BigInt(left.denominator),
    );
    rightSide = exactResult;
    reconstructionId = "fraction-equation.simplification-equivalence";
  }

  if (!equalFractions(leftSide, rightSide)) {
    throw new FractionOperationsDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      `Equation reconstruction failed for ${operation.evaluatedOperation}.`,
    );
  }
  return {
    holds: true,
    kind,
    leftSide,
    reconstruction: reconstructionId,
    reconstructionId,
    rightSide,
  };
}

function invariantReceipt(
  id: FractionInvariantId,
  holds: boolean,
  expected: string,
  observed: string,
): FractionInvariantReceipt {
  if (!holds) {
    throw new FractionOperationsDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      `${id} failed: expected ${expected}; observed ${observed}.`,
    );
  }
  return { holds: true, id, observed, expected };
}

function mixedReconstructs(mixed: MixedNumberForm, value: ExactFraction) {
  return equalFractions(mixed.reconstructed, value);
}

function simplificationReconstructs(
  receipt: FractionSimplificationReceipt,
): boolean {
  return (
    receipt.source.numerator === receipt.dividedNumerator * receipt.gcf &&
    receipt.source.denominator === receipt.dividedDenominator * receipt.gcf &&
    equalFractions(receipt.source, receipt.normalized)
  );
}

function buildInvariantReceipts(args: {
  commonDenominator: CommonDenominatorReceipt;
  comparison: FractionComparisonReceipt;
  division: FractionDivisionInterpretation | null;
  equation: FractionEquationCheck;
  left: FractionOperandState;
  multiplication: FractionMultiplicationInterpretation | null;
  operation: FractionOperationReceipt;
  right: FractionOperandState;
}): FractionInvariantReceipt[] {
  const {
    commonDenominator,
    comparison,
    division,
    equation,
    left,
    multiplication,
    operation,
    right,
  } = args;
  const expectedRelation =
    comparison.leftCrossProduct < comparison.rightCrossProduct
      ? -1
      : comparison.leftCrossProduct > comparison.rightCrossProduct
        ? 1
        : 0;
  const commonDenominatorHolds =
    commonDenominator.left.converted.denominator ===
      commonDenominator.leastCommonDenominator &&
    commonDenominator.right.converted.denominator ===
      commonDenominator.leastCommonDenominator &&
    equalFractions(
      commonDenominator.left.source,
      commonDenominator.left.converted,
    ) &&
    equalFractions(
      commonDenominator.right.source,
      commonDenominator.right.converted,
    );
  const operationInterpretationHolds =
    equation.holds &&
    (!multiplication ||
      (equalFractions(multiplication.product, operation.exactResult) &&
        equalFractions(
          multiplication.area.reconstructedProduct,
          operation.exactResult,
        ) &&
        equalFractions(
          multiplication.repeatedGroup.selectedReconstructedProduct,
          operation.exactResult,
        ) &&
        equalFractions(
          multiplication.repeatedGroup.reconstructedMagnitude,
          absoluteFraction(operation.exactResult),
        ))) &&
    (!division ||
      (equalFractions(division.quotient, operation.exactResult) &&
        equalFractions(division.reciprocalProduct, operation.exactResult) &&
        equalFractions(
          multiplyFractions(division.quotient, right.normalized),
          left.normalized,
        )));

  const receipts: FractionInvariantReceipt[] = [
    invariantReceipt(
      "fraction-denominator-nonzero",
      left.source.denominator > 0 && right.source.denominator > 0,
      "left denominator > 0 and right denominator > 0",
      `${left.source.denominator},${right.source.denominator}`,
    ),
    invariantReceipt(
      "fraction-exact-rational",
      equalFractions(
        operation.unsimplifiedResult,
        operation.exactResult,
      ),
      operation.exactResult.text,
      normalizeFraction(
        BigInt(operation.unsimplifiedResult.numerator),
        BigInt(operation.unsimplifiedResult.denominator),
      ).text,
    ),
    invariantReceipt(
      "fraction-cross-product",
      expectedRelation === comparison.relation,
      String(expectedRelation),
      String(comparison.relation),
    ),
    invariantReceipt(
      "fraction-common-denominator",
      commonDenominatorHolds,
      String(commonDenominator.leastCommonDenominator),
      `${commonDenominator.left.converted.denominator},${commonDenominator.right.converted.denominator}`,
    ),
    invariantReceipt(
      "fraction-simplification",
      simplificationReconstructs(left.simplification) &&
        simplificationReconstructs(right.simplification) &&
        simplificationReconstructs(operation.resultSimplification),
      "source = GCF x simplified parts",
      `${left.simplification.gcf},${right.simplification.gcf},${operation.resultSimplification.gcf}`,
    ),
    invariantReceipt(
      "fraction-whole-explicit",
      mixedReconstructs(left.mixed, left.normalized) &&
        mixedReconstructs(right.mixed, right.normalized) &&
        mixedReconstructs(operation.mixedResult, operation.exactResult),
      "mixed and explicit whole forms reconstruct each exact fraction",
      `${left.mixed.text}|${right.mixed.text}|${operation.mixedResult.text}`,
    ),
    invariantReceipt(
      "fraction-operation-interpretation",
      operationInterpretationHolds,
      "visible interpretation and equation reconstruct exact result",
      `${operation.evaluatedOperation}:${equation.reconstruction}`,
    ),
  ];

  if (multiplication) {
    const area = multiplication.area;
    const repeatedGroup = multiplication.repeatedGroup;
    const scaling = multiplication.scaling;
    const areaReconstructs =
      equalFractions(area.rowFactor, left.source) &&
      equalFractions(area.columnFactor, right.source) &&
      area.rows === left.source.denominator &&
      area.columns === right.source.denominator &&
      area.selectedRows === Math.abs(left.source.numerator) &&
      area.selectedColumns === Math.abs(right.source.numerator) &&
      area.cellsPerUnit === area.rows * area.columns &&
      area.overlapCells === area.selectedRows * area.selectedColumns &&
      area.totalGridCells === area.gridUnitCount * area.cellsPerUnit &&
      area.overlapCells <= area.totalGridCells &&
      area.overlapCells ===
        area.wholeUnits * area.cellsPerUnit + area.remainingCells &&
      equalFractions(area.reconstructedProduct, operation.exactResult);
    const partOfQuantityReconstructs =
      equalFractions(repeatedGroup.factor, left.source) &&
      equalFractions(repeatedGroup.startingQuantity, right.source) &&
      repeatedGroup.partitionDenominator === left.source.denominator &&
      repeatedGroup.selectedCount === left.source.numerator &&
      equalFractions(
        multiplyFractions(
          normalizeFraction(
            BigInt(repeatedGroup.partitionDenominator),
            BIGINT_ONE,
          ),
          repeatedGroup.unitShare,
        ),
        repeatedGroup.startingQuantity,
      ) &&
      equalFractions(
        repeatedGroup.partitionReconstructedStarting,
        repeatedGroup.startingQuantity,
      ) &&
      equalFractions(
        multiplyFractions(
          normalizeFraction(
            BigInt(repeatedGroup.selectedCount),
            BIGINT_ONE,
          ),
          repeatedGroup.unitShare,
        ),
        operation.exactResult,
      ) &&
      equalFractions(
        repeatedGroup.selectedReconstructedProduct,
        operation.exactResult,
      );
    const scalingReconstructs =
      equalFractions(scaling.factor, left.normalized) &&
      equalFractions(scaling.startingValue, right.normalized) &&
      equalFractions(
        multiplyFractions(scaling.factor, scaling.startingValue),
        operation.exactResult,
      ) &&
      equalFractions(scaling.product, operation.exactResult);

    receipts.push(
      invariantReceipt(
        "fraction-multiplication-area-reconstruction",
        areaReconstructs,
        operation.exactResult.text,
        area.reconstructedProduct.text,
      ),
      invariantReceipt(
        "fraction-multiplication-part-of-quantity-reconstruction",
        partOfQuantityReconstructs,
        `${right.source.text}|${operation.exactResult.text}`,
        `${repeatedGroup.partitionReconstructedStarting.text}|${repeatedGroup.selectedReconstructedProduct.text}`,
      ),
      invariantReceipt(
        "fraction-multiplication-scaling-reconstruction",
        scalingReconstructs,
        operation.exactResult.text,
        multiplyFractions(scaling.factor, scaling.startingValue).text,
      ),
    );
  }

  if (division) {
    const reciprocalReconstructs =
      equalFractions(division.quotient, operation.exactResult) &&
      equalFractions(division.reciprocalProduct, operation.exactResult) &&
      equalFractions(
        multiplyFractions(right.normalized, division.reciprocal),
        normalizeFraction(BIGINT_ONE, BIGINT_ONE),
      );
    const measurementReconstructs =
      equalFractions(division.measurement.available, left.normalized) &&
      equalFractions(division.measurement.unitSize, right.normalized) &&
      equalFractions(
        division.measurement.numberOfGroups,
        operation.exactResult,
      ) &&
      equalFractions(
        multiplyFractions(
          division.measurement.numberOfGroups,
          division.measurement.unitSize,
        ),
        division.measurement.available,
      );
    const sharingReconstructs =
      equalFractions(division.sharing.total, left.normalized) &&
      equalFractions(division.sharing.groupCount, right.normalized) &&
      equalFractions(division.sharing.sharePerGroup, operation.exactResult) &&
      equalFractions(
        multiplyFractions(
          division.sharing.groupCount,
          division.sharing.sharePerGroup,
        ),
        division.sharing.total,
      );

    receipts.push(
      invariantReceipt(
        "fraction-division-reciprocal-reconstruction",
        reciprocalReconstructs,
        operation.exactResult.text,
        division.reciprocalProduct.text,
      ),
      invariantReceipt(
        "fraction-division-measurement-reconstruction",
        measurementReconstructs,
        division.measurement.available.text,
        multiplyFractions(
          division.measurement.numberOfGroups,
          division.measurement.unitSize,
        ).text,
      ),
      invariantReceipt(
        "fraction-division-sharing-reconstruction",
        sharingReconstructs,
        division.sharing.total.text,
        multiplyFractions(
          division.sharing.groupCount,
          division.sharing.sharePerGroup,
        ).text,
      ),
    );
  }

  return receipts;
}

export function isFractionOperationsLabId(
  value: string,
): value is FractionOperationsLabId {
  return FRACTION_OPERATIONS_LAB_ID_SET.has(value);
}

function validateIdentityAndMode(input: FractionOperationsInput): void {
  if (!isFractionOperationsLabId(input.labId)) {
    throw new FractionOperationsDomainError(
      "INVALID_LAB_ID",
      `Unsupported fraction-operations lab: ${String(input.labId)}.`,
    );
  }
  if (
    typeof input.mode !== "string" ||
    !FRACTION_OPERATIONS_MODE_SET.has(input.mode)
  ) {
    throw new FractionOperationsDomainError(
      "INVALID_MODE",
      `Unsupported fraction-operations mode: ${String(input.mode)}.`,
    );
  }
  const allowedModes = FRACTION_OPERATIONS_MODE_ALLOWLIST[input.labId] as
    readonly FractionOperationsMode[];
  if (!allowedModes.includes(input.mode)) {
    throw new FractionOperationsDomainError(
      "MODE_NOT_ALLOWED",
      `${input.mode} is not allowed for ${input.labId}.`,
    );
  }
}

function evaluatedOperationForInput(
  input: FractionOperationsInput,
): FractionEvaluatedOperation {
  if (input.mode !== "estimate") {
    if (input.estimateOperation !== undefined) {
      throw new FractionOperationsDomainError(
        "INVALID_ESTIMATE_OPERATION",
        "estimateOperation is only valid in estimate mode.",
      );
    }
    return input.mode;
  }
  if (
    typeof input.estimateOperation !== "string" ||
    !FRACTION_ARITHMETIC_OPERATION_SET.has(input.estimateOperation)
  ) {
    throw new FractionOperationsDomainError(
      "INVALID_ESTIMATE_OPERATION",
      "Estimate mode requires an exact arithmetic estimateOperation.",
    );
  }
  const allowedEstimateOperations = ESTIMATE_OPERATION_ALLOWLIST[
    input.labId
  ] as readonly FractionArithmeticOperation[];
  if (!allowedEstimateOperations.includes(input.estimateOperation)) {
    throw new FractionOperationsDomainError(
      "ESTIMATE_OPERATION_NOT_ALLOWED",
      `${input.estimateOperation} estimation is not allowed for ${input.labId}.`,
    );
  }
  return input.estimateOperation;
}

export function buildFractionOperationsModel(
  input: FractionOperationsInput,
): FractionOperationsModel {
  validateIdentityAndMode(input);
  assertFraction(input.left, "left");
  assertFraction(input.right, "right");
  const evaluatedOperation = evaluatedOperationForInput(input);
  if (evaluatedOperation === "divide" && input.right.numerator === 0) {
    throw new FractionOperationsDomainError(
      "DIVISION_BY_ZERO",
      "A fraction operation cannot divide by zero.",
    );
  }

  const left = buildOperand(input.left);
  const right = buildOperand(input.right);
  const commonDenominator = buildCommonDenominator(
    left.source,
    right.source,
  );
  const comparison = buildComparison(left.source, right.source);
  const operation = buildOperation(
    input,
    evaluatedOperation,
    left.source,
    right.source,
    commonDenominator,
    comparison,
  );
  const estimate =
    input.mode === "estimate"
      ? buildEstimate(
          evaluatedOperation as FractionArithmeticOperation,
          operation.exactResult,
        )
      : null;
  const visibleReceipt = buildVisibleReceipt({
    comparison,
    estimate,
    input,
    left,
    operation,
    right,
  });
  const multiplication =
    evaluatedOperation === "multiply"
      ? buildMultiplicationInterpretation(
          left.source,
          right.source,
          operation.exactResult,
        )
      : null;
  const division =
    evaluatedOperation === "divide"
      ? buildDivisionInterpretation(
          left.source,
          right.source,
          operation.exactResult,
        )
      : null;
  const equationCheck = buildEquationCheck(
    input,
    operation,
    left.source,
    right.source,
    estimate,
  );
  const invariantReceipts = buildInvariantReceipts({
    commonDenominator,
    comparison,
    division,
    equation: equationCheck,
    left,
    multiplication,
    operation,
    right,
  });
  const state: FractionOperationsSerializedState = {
    estimateOperation:
      input.mode === "estimate"
        ? (evaluatedOperation as FractionArithmeticOperation)
        : null,
    evaluatedOperation,
    family: FRACTION_OPERATIONS_MODEL_CONTRACT.family,
    labId: input.labId,
    leftDenominator: input.left.denominator,
    leftNumerator: input.left.numerator,
    mode: input.mode,
    relation: comparison.symbol,
    resultDenominator: operation.exactResult.denominator,
    resultNumerator: operation.exactResult.numerator,
    rightDenominator: input.right.denominator,
    rightNumerator: input.right.numerator,
    version: FRACTION_OPERATIONS_MODEL_CONTRACT.version,
  };
  const stateKey = [
    state.version,
    `lab=${state.labId}`,
    `mode=${state.mode}`,
    `evaluated=${state.evaluatedOperation}`,
    `left=${state.leftNumerator}/${state.leftDenominator}`,
    `right=${state.rightNumerator}/${state.rightDenominator}`,
    `result=${state.resultNumerator}/${state.resultDenominator}`,
  ].join("|");

  return deepFreeze({
    commonDenominator,
    comparison,
    equationCheck,
    estimate,
    family: FRACTION_OPERATIONS_MODEL_CONTRACT.family,
    invariantReceipts,
    labId: input.labId,
    mode: input.mode,
    operands: { left, right },
    operation,
    operationInterpretation: { division, multiplication },
    state,
    stateKey,
    version: FRACTION_OPERATIONS_MODEL_CONTRACT.version,
    visibleReceipt,
  });
}

export function buildFractionOperationsResetModel(
  labId: FractionOperationsLabId,
): FractionOperationsModel {
  if (!isFractionOperationsLabId(labId)) {
    throw new FractionOperationsDomainError(
      "INVALID_LAB_ID",
      `Unsupported fraction-operations lab: ${String(labId)}.`,
    );
  }
  return buildFractionOperationsModel(FRACTION_OPERATIONS_RESET_INPUTS[labId]);
}
