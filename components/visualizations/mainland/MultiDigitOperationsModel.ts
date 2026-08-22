export const MULTI_DIGIT_OPERATIONS_MODEL_VERSION =
  "multi-digit-operations-v1" as const;

export const MULTI_DIGIT_OPERATIONS_DOMAIN = Object.freeze({
  minOperand: 0,
  maxOperand: 999_999,
  roundingPlaces: Object.freeze([1, 10, 100, 1_000, 10_000, 100_000] as const),
});

export type MultiDigitBaseOperation =
  "add" | "subtract" | "multiply" | "divide";
export type MultiDigitOperation = MultiDigitBaseOperation | "estimate-check";

export type MultiDigitOperationsInput =
  | {
      operation: MultiDigitBaseOperation;
      left: number;
      right: number;
    }
  | {
      operation: "estimate-check";
      exactOperation: MultiDigitBaseOperation;
      left: number;
      right: number;
      roundingPlace: number;
    };

export type MultiDigitOperationsDomainErrorCode =
  | "NON_SAFE_INTEGER"
  | "OPERAND_OUT_OF_DOMAIN"
  | "SUBTRACTION_NEGATIVE_RESULT"
  | "DIVISOR_ZERO"
  | "INVALID_ROUNDING_PLACE"
  | "ESTIMATE_DIVISOR_ROUNDS_TO_ZERO"
  | "INVALID_OPERATION"
  | "UNSAFE_RESULT";

export class MultiDigitOperationsDomainError extends RangeError {
  readonly code: MultiDigitOperationsDomainErrorCode;

  constructor(code: MultiDigitOperationsDomainErrorCode, message: string) {
    super(message);
    this.name = "MultiDigitOperationsDomainError";
    this.code = code;
  }
}

export type PlaceValueReceipt = {
  place: number;
  digit: number;
  contribution: number;
};

export type AdditionColumnReceipt = {
  place: number;
  leftDigit: number;
  rightDigit: number;
  carryIn: number;
  rawTotal: number;
  resultDigit: number;
  carryOut: number;
};

export type SubtractionColumnReceipt = {
  place: number;
  leftDigit: number;
  rightDigit: number;
  borrowIn: number;
  availableBeforeTrade: number;
  adjustedLeftDigit: number;
  resultDigit: number;
  borrowOut: number;
};

export type MultiplicationDigitReceipt = {
  multiplicandPlace: number;
  multiplierPlace: number;
  outputPlace: number;
  multiplicandDigit: number;
  multiplierDigit: number;
  carryIn: number;
  rawProduct: number;
  outputDigit: number;
  carryOut: number;
};

export type PartialProductReceipt = {
  multiplierPlace: number;
  multiplierDigit: number;
  multiplierContribution: number;
  digitSteps: MultiplicationDigitReceipt[];
  finalCarry: number;
  finalCarryPlace: number;
  finalCarryContribution: number;
  reconstructedFromDigits: number;
  partialProduct: number;
};

export type DivisionStepReceipt = {
  sourcePlace: number;
  broughtDownDigit: number;
  workingDividend: number;
  quotientDigit: number;
  quotientContribution: number;
  partialProduct: number;
  remainder: number;
};

export type MultiDigitAlgorithmReceipt =
  | {
      kind: "addition";
      columns: AdditionColumnReceipt[];
      reconstructedResult: number;
    }
  | {
      kind: "subtraction";
      columns: SubtractionColumnReceipt[];
      reconstructedResult: number;
    }
  | {
      kind: "multiplication";
      partialProducts: PartialProductReceipt[];
      reconstructedResult: number;
    }
  | {
      kind: "division";
      steps: DivisionStepReceipt[];
      reconstructedQuotient: number;
      quotient: number;
      remainder: number;
      inverseReconstruction: number;
    };

export type MultiDigitOperationResult =
  | {
      kind: "whole";
      value: number;
    }
  | {
      kind: "division";
      quotient: number;
      remainder: number;
      inverseReconstruction: number;
    };

export type EstimateReceipt = {
  exactOperation: MultiDigitBaseOperation;
  roundingPlace: number;
  roundedLeft: number;
  roundedRight: number;
  exactComparisonValue: number;
  estimatedValue: number;
  signedError: number;
  absoluteError: number;
};

export type MultiDigitInvariantReceipt = {
  id: string;
  passed: true;
  expected: number | string;
  observed: number | string;
};

export type MultiDigitOperationsSerializedState = {
  version: typeof MULTI_DIGIT_OPERATIONS_MODEL_VERSION;
  operation: MultiDigitOperation;
  exactOperation: MultiDigitBaseOperation;
  left: number;
  right: number;
  resultValue: number | null;
  quotient: number | null;
  remainder: number | null;
  roundingPlace: number | null;
  roundedLeft: number | null;
  roundedRight: number | null;
  estimatedValue: number | null;
  signedEstimateError: number | null;
};

export type MultiDigitOperationsModel = {
  version: typeof MULTI_DIGIT_OPERATIONS_MODEL_VERSION;
  operation: MultiDigitOperation;
  exactOperation: MultiDigitBaseOperation;
  operands: {
    left: number;
    right: number;
  };
  result: MultiDigitOperationResult;
  placeValues: {
    left: PlaceValueReceipt[];
    right: PlaceValueReceipt[];
    result: PlaceValueReceipt[];
  };
  algorithm: MultiDigitAlgorithmReceipt;
  estimate: EstimateReceipt | null;
  invariantReceipts: MultiDigitInvariantReceipt[];
  state: MultiDigitOperationsSerializedState;
  stateKey: string;
};

export const MULTI_DIGIT_OPERATIONS_RESET_INPUT = Object.freeze({
  operation: "multiply" as const,
  left: 347,
  right: 26,
});

type CoreModel = {
  result: MultiDigitOperationResult;
  algorithm: MultiDigitAlgorithmReceipt;
  placeValues: MultiDigitOperationsModel["placeValues"];
  invariantReceipts: MultiDigitInvariantReceipt[];
};

const BASE_OPERATIONS = new Set<MultiDigitBaseOperation>([
  "add",
  "subtract",
  "multiply",
  "divide",
]);

function isBaseOperation(value: unknown): value is MultiDigitBaseOperation {
  return (
    typeof value === "string" &&
    BASE_OPERATIONS.has(value as MultiDigitBaseOperation)
  );
}

function validateOperation(
  value: unknown,
): asserts value is MultiDigitOperation {
  if (value !== "estimate-check" && !isBaseOperation(value)) {
    throw new MultiDigitOperationsDomainError(
      "INVALID_OPERATION",
      `Unsupported multi-digit operation: ${String(value)}`,
    );
  }
}

function validateOperand(value: number, field: "left" | "right"): void {
  if (!Number.isSafeInteger(value)) {
    throw new MultiDigitOperationsDomainError(
      "NON_SAFE_INTEGER",
      `${field} must be a safe integer.`,
    );
  }
  if (
    value < MULTI_DIGIT_OPERATIONS_DOMAIN.minOperand ||
    value > MULTI_DIGIT_OPERATIONS_DOMAIN.maxOperand
  ) {
    throw new MultiDigitOperationsDomainError(
      "OPERAND_OUT_OF_DOMAIN",
      `${field} must be between ${MULTI_DIGIT_OPERATIONS_DOMAIN.minOperand} and ${MULTI_DIGIT_OPERATIONS_DOMAIN.maxOperand}.`,
    );
  }
}

function validateBaseOperationOperands(
  operation: MultiDigitBaseOperation,
  left: number,
  right: number,
): void {
  validateOperand(left, "left");
  validateOperand(right, "right");
  if (operation === "subtract" && left < right) {
    throw new MultiDigitOperationsDomainError(
      "SUBTRACTION_NEGATIVE_RESULT",
      "Whole-number subtraction requires left to be greater than or equal to right.",
    );
  }
  if (operation === "divide" && right === 0) {
    throw new MultiDigitOperationsDomainError(
      "DIVISOR_ZERO",
      "The divisor must be positive.",
    );
  }
}

function toSafeNumber(value: bigint, label: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || BigInt(result) !== value) {
    throw new MultiDigitOperationsDomainError(
      "UNSAFE_RESULT",
      `${label} is outside the safe-integer result domain.`,
    );
  }
  return result;
}

function exactReceipt(
  id: string,
  expected: number | string,
  observed: number | string,
  passed = expected === observed,
): MultiDigitInvariantReceipt {
  if (!passed) {
    throw new Error(
      `${id} invariant failed: expected ${String(expected)}, observed ${String(observed)}.`,
    );
  }
  return { id, passed: true, expected, observed };
}

// The repository compiles below an ES2020 target while shipping the ESNext
// BigInt library. Constructor constants keep exact arithmetic without using
// BigInt literal syntax, which TypeScript cannot emit for that target.
const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TWO = BigInt(2);
const BIGINT_TEN = BigInt(10);

function decomposePlaceValues(value: number): PlaceValueReceipt[] {
  let remaining = BigInt(value);
  let place = BIGINT_ONE;
  const receipts: PlaceValueReceipt[] = [];
  do {
    const digit = remaining % BIGINT_TEN;
    receipts.push({
      place: toSafeNumber(place, "place"),
      digit: toSafeNumber(digit, "digit"),
      contribution: toSafeNumber(digit * place, "place-value contribution"),
    });
    remaining /= BIGINT_TEN;
    place *= BIGINT_TEN;
  } while (remaining > BIGINT_ZERO);
  return receipts;
}

function reconstructPlaceValues(receipts: PlaceValueReceipt[]): number {
  return receipts.reduce((sum, receipt) => sum + receipt.contribution, 0);
}

function buildAddition(left: number, right: number): CoreModel {
  let leftRemaining = BigInt(left);
  let rightRemaining = BigInt(right);
  let carry = BIGINT_ZERO;
  let place = BIGINT_ONE;
  const columns: AdditionColumnReceipt[] = [];
  let reconstructed = BIGINT_ZERO;

  do {
    const leftDigit = leftRemaining % BIGINT_TEN;
    const rightDigit = rightRemaining % BIGINT_TEN;
    const rawTotal = leftDigit + rightDigit + carry;
    const resultDigit = rawTotal % BIGINT_TEN;
    const carryOut = rawTotal / BIGINT_TEN;
    columns.push({
      place: toSafeNumber(place, "addition place"),
      leftDigit: toSafeNumber(leftDigit, "addition left digit"),
      rightDigit: toSafeNumber(rightDigit, "addition right digit"),
      carryIn: toSafeNumber(carry, "addition carry in"),
      rawTotal: toSafeNumber(rawTotal, "addition raw total"),
      resultDigit: toSafeNumber(resultDigit, "addition result digit"),
      carryOut: toSafeNumber(carryOut, "addition carry out"),
    });
    reconstructed += resultDigit * place;
    leftRemaining /= BIGINT_TEN;
    rightRemaining /= BIGINT_TEN;
    carry = carryOut;
    place *= BIGINT_TEN;
  } while (
    leftRemaining > BIGINT_ZERO ||
    rightRemaining > BIGINT_ZERO ||
    carry > BIGINT_ZERO ||
    columns.length === 0
  );

  const value = toSafeNumber(BigInt(left) + BigInt(right), "addition result");
  const reconstructedResult = toSafeNumber(
    reconstructed,
    "addition reconstruction",
  );
  const placeValues = {
    left: decomposePlaceValues(left),
    right: decomposePlaceValues(right),
    result: decomposePlaceValues(value),
  };
  return {
    result: { kind: "whole", value },
    algorithm: { kind: "addition", columns, reconstructedResult },
    placeValues,
    invariantReceipts: [
      exactReceipt(
        "place-value-reconstruction:left",
        left,
        reconstructPlaceValues(placeValues.left),
      ),
      exactReceipt(
        "place-value-reconstruction:right",
        right,
        reconstructPlaceValues(placeValues.right),
      ),
      exactReceipt(
        "place-value-reconstruction:result",
        value,
        reconstructPlaceValues(placeValues.result),
      ),
      exactReceipt("addition-carry-reconstruction", value, reconstructedResult),
    ],
  };
}

function buildSubtraction(left: number, right: number): CoreModel {
  let leftRemaining = BigInt(left);
  let rightRemaining = BigInt(right);
  let borrow = BIGINT_ZERO;
  let place = BIGINT_ONE;
  const columns: SubtractionColumnReceipt[] = [];
  let reconstructed = BIGINT_ZERO;

  do {
    const leftDigit = leftRemaining % BIGINT_TEN;
    const rightDigit = rightRemaining % BIGINT_TEN;
    const availableBeforeTrade = leftDigit - borrow;
    const borrowOut =
      availableBeforeTrade < rightDigit ? BIGINT_ONE : BIGINT_ZERO;
    const adjustedLeftDigit = availableBeforeTrade + borrowOut * BIGINT_TEN;
    const resultDigit = adjustedLeftDigit - rightDigit;
    columns.push({
      place: toSafeNumber(place, "subtraction place"),
      leftDigit: toSafeNumber(leftDigit, "subtraction left digit"),
      rightDigit: toSafeNumber(rightDigit, "subtraction right digit"),
      borrowIn: toSafeNumber(borrow, "subtraction borrow in"),
      availableBeforeTrade: toSafeNumber(
        availableBeforeTrade,
        "subtraction available digit",
      ),
      adjustedLeftDigit: toSafeNumber(
        adjustedLeftDigit,
        "subtraction adjusted digit",
      ),
      resultDigit: toSafeNumber(resultDigit, "subtraction result digit"),
      borrowOut: toSafeNumber(borrowOut, "subtraction borrow out"),
    });
    reconstructed += resultDigit * place;
    leftRemaining /= BIGINT_TEN;
    rightRemaining /= BIGINT_TEN;
    borrow = borrowOut;
    place *= BIGINT_TEN;
  } while (
    leftRemaining > BIGINT_ZERO ||
    rightRemaining > BIGINT_ZERO ||
    borrow > BIGINT_ZERO ||
    columns.length === 0
  );

  if (borrow !== BIGINT_ZERO) {
    throw new Error("Subtraction finished with an unresolved borrow.");
  }
  const value = toSafeNumber(
    BigInt(left) - BigInt(right),
    "subtraction result",
  );
  const reconstructedResult = toSafeNumber(
    reconstructed,
    "subtraction reconstruction",
  );
  const placeValues = {
    left: decomposePlaceValues(left),
    right: decomposePlaceValues(right),
    result: decomposePlaceValues(value),
  };
  return {
    result: { kind: "whole", value },
    algorithm: { kind: "subtraction", columns, reconstructedResult },
    placeValues,
    invariantReceipts: [
      exactReceipt(
        "place-value-reconstruction:left",
        left,
        reconstructPlaceValues(placeValues.left),
      ),
      exactReceipt(
        "place-value-reconstruction:right",
        right,
        reconstructPlaceValues(placeValues.right),
      ),
      exactReceipt(
        "place-value-reconstruction:result",
        value,
        reconstructPlaceValues(placeValues.result),
      ),
      exactReceipt(
        "subtraction-borrow-reconstruction",
        value,
        reconstructedResult,
      ),
    ],
  };
}

function buildPartialProduct(
  multiplicand: number,
  multiplierTerm: PlaceValueReceipt,
): PartialProductReceipt {
  const multiplicandTerms = decomposePlaceValues(multiplicand);
  const multiplierDigit = BigInt(multiplierTerm.digit);
  const multiplierPlace = BigInt(multiplierTerm.place);
  let carry = BIGINT_ZERO;
  let reconstructed = BIGINT_ZERO;
  const digitSteps: MultiplicationDigitReceipt[] = [];

  for (const multiplicandTerm of multiplicandTerms) {
    const multiplicandDigit = BigInt(multiplicandTerm.digit);
    const outputPlace = BigInt(multiplicandTerm.place) * multiplierPlace;
    const rawProduct = multiplicandDigit * multiplierDigit + carry;
    const outputDigit = rawProduct % BIGINT_TEN;
    const carryOut = rawProduct / BIGINT_TEN;
    digitSteps.push({
      multiplicandPlace: multiplicandTerm.place,
      multiplierPlace: multiplierTerm.place,
      outputPlace: toSafeNumber(outputPlace, "multiplication output place"),
      multiplicandDigit: multiplicandTerm.digit,
      multiplierDigit: multiplierTerm.digit,
      carryIn: toSafeNumber(carry, "multiplication carry in"),
      rawProduct: toSafeNumber(rawProduct, "multiplication raw product"),
      outputDigit: toSafeNumber(outputDigit, "multiplication output digit"),
      carryOut: toSafeNumber(carryOut, "multiplication carry out"),
    });
    reconstructed += outputDigit * outputPlace;
    carry = carryOut;
  }

  const highestMultiplicandPlace = BigInt(multiplicandTerms.at(-1)?.place ?? 1);
  const finalCarryPlace =
    highestMultiplicandPlace * BIGINT_TEN * multiplierPlace;
  const finalCarryContribution = carry * finalCarryPlace;
  reconstructed += finalCarryContribution;
  const expected = BigInt(multiplicand) * multiplierDigit * multiplierPlace;
  return {
    multiplierPlace: multiplierTerm.place,
    multiplierDigit: multiplierTerm.digit,
    multiplierContribution: multiplierTerm.contribution,
    digitSteps,
    finalCarry: toSafeNumber(carry, "multiplication final carry"),
    finalCarryPlace: toSafeNumber(
      finalCarryPlace,
      "multiplication final carry place",
    ),
    finalCarryContribution: toSafeNumber(
      finalCarryContribution,
      "multiplication final carry contribution",
    ),
    reconstructedFromDigits: toSafeNumber(
      reconstructed,
      "partial-product reconstruction",
    ),
    partialProduct: toSafeNumber(expected, "partial product"),
  };
}

function buildMultiplication(left: number, right: number): CoreModel {
  const partialProducts = decomposePlaceValues(right).map((term) =>
    buildPartialProduct(left, term),
  );
  const reconstructedResult = partialProducts.reduce(
    (sum, receipt) => sum + receipt.partialProduct,
    0,
  );
  const value = toSafeNumber(
    BigInt(left) * BigInt(right),
    "multiplication result",
  );
  const everyPartialReconstructs = partialProducts.every(
    (receipt) => receipt.reconstructedFromDigits === receipt.partialProduct,
  );
  const placeValues = {
    left: decomposePlaceValues(left),
    right: decomposePlaceValues(right),
    result: decomposePlaceValues(value),
  };
  return {
    result: { kind: "whole", value },
    algorithm: { kind: "multiplication", partialProducts, reconstructedResult },
    placeValues,
    invariantReceipts: [
      exactReceipt(
        "place-value-reconstruction:left",
        left,
        reconstructPlaceValues(placeValues.left),
      ),
      exactReceipt(
        "place-value-reconstruction:right",
        right,
        reconstructPlaceValues(placeValues.right),
      ),
      exactReceipt(
        "place-value-reconstruction:result",
        value,
        reconstructPlaceValues(placeValues.result),
      ),
      exactReceipt("partial-products-sum", value, reconstructedResult),
      exactReceipt(
        "multiplication-carry-reconstruction",
        "every-partial-product-reconstructs",
        everyPartialReconstructs
          ? "every-partial-product-reconstructs"
          : "carry-drift",
        everyPartialReconstructs,
      ),
    ],
  };
}

function buildDivision(left: number, right: number): CoreModel {
  const divisor = BigInt(right);
  const dividendTerms = decomposePlaceValues(left).slice().reverse();
  let remainder = BIGINT_ZERO;
  let reconstructedQuotient = BIGINT_ZERO;
  const steps: DivisionStepReceipt[] = [];

  for (const term of dividendTerms) {
    const workingDividend = remainder * BIGINT_TEN + BigInt(term.digit);
    const quotientDigit = workingDividend / divisor;
    const partialProduct = quotientDigit * divisor;
    remainder = workingDividend - partialProduct;
    const quotientContribution = quotientDigit * BigInt(term.place);
    reconstructedQuotient += quotientContribution;
    steps.push({
      sourcePlace: term.place,
      broughtDownDigit: term.digit,
      workingDividend: toSafeNumber(
        workingDividend,
        "division working dividend",
      ),
      quotientDigit: toSafeNumber(quotientDigit, "division quotient digit"),
      quotientContribution: toSafeNumber(
        quotientContribution,
        "division quotient contribution",
      ),
      partialProduct: toSafeNumber(partialProduct, "division partial product"),
      remainder: toSafeNumber(remainder, "division remainder"),
    });
  }

  const quotient = BigInt(left) / divisor;
  const inverseReconstruction = divisor * quotient + remainder;
  const quotientNumber = toSafeNumber(quotient, "division quotient");
  const remainderNumber = toSafeNumber(remainder, "division remainder");
  const inverseNumber = toSafeNumber(
    inverseReconstruction,
    "division inverse reconstruction",
  );
  const reconstructedQuotientNumber = toSafeNumber(
    reconstructedQuotient,
    "partial-quotient reconstruction",
  );
  const remainderBound = remainder >= BIGINT_ZERO && remainder < divisor;
  const placeValues = {
    left: decomposePlaceValues(left),
    right: decomposePlaceValues(right),
    result: decomposePlaceValues(quotientNumber),
  };
  return {
    result: {
      kind: "division",
      quotient: quotientNumber,
      remainder: remainderNumber,
      inverseReconstruction: inverseNumber,
    },
    algorithm: {
      kind: "division",
      steps,
      reconstructedQuotient: reconstructedQuotientNumber,
      quotient: quotientNumber,
      remainder: remainderNumber,
      inverseReconstruction: inverseNumber,
    },
    placeValues,
    invariantReceipts: [
      exactReceipt(
        "place-value-reconstruction:left",
        left,
        reconstructPlaceValues(placeValues.left),
      ),
      exactReceipt(
        "place-value-reconstruction:right",
        right,
        reconstructPlaceValues(placeValues.right),
      ),
      exactReceipt(
        "place-value-reconstruction:result",
        quotientNumber,
        reconstructPlaceValues(placeValues.result),
      ),
      exactReceipt("division-reconstruction", left, inverseNumber),
      exactReceipt(
        "remainder-bound",
        "0<=remainder<divisor",
        remainderBound ? "0<=remainder<divisor" : "out-of-bound",
        remainderBound,
      ),
      exactReceipt(
        "partial-quotients-reconstruction",
        quotientNumber,
        reconstructedQuotientNumber,
      ),
    ],
  };
}

function buildCore(
  operation: MultiDigitBaseOperation,
  left: number,
  right: number,
): CoreModel {
  validateBaseOperationOperands(operation, left, right);
  switch (operation) {
    case "add":
      return buildAddition(left, right);
    case "subtract":
      return buildSubtraction(left, right);
    case "multiply":
      return buildMultiplication(left, right);
    case "divide":
      return buildDivision(left, right);
  }
}

function validateRoundingPlace(value: number): void {
  if (
    !Number.isSafeInteger(value) ||
    !MULTI_DIGIT_OPERATIONS_DOMAIN.roundingPlaces.some(
      (allowed) => allowed === value,
    )
  ) {
    throw new MultiDigitOperationsDomainError(
      "INVALID_ROUNDING_PLACE",
      `roundingPlace must be one of ${MULTI_DIGIT_OPERATIONS_DOMAIN.roundingPlaces.join(", ")}.`,
    );
  }
}

function roundIntegerToPlace(value: number, roundingPlace: number): number {
  const integer = BigInt(value);
  const place = BigInt(roundingPlace);
  const quotient = integer / place;
  const remainder = integer % place;
  const roundedQuotient =
    remainder * BIGINT_TWO >= place ? quotient + BIGINT_ONE : quotient;
  return toSafeNumber(roundedQuotient * place, "rounded operand");
}

function comparisonValue(result: MultiDigitOperationResult): number {
  return result.kind === "whole" ? result.value : result.quotient;
}

function estimatedValue(
  operation: MultiDigitBaseOperation,
  roundedLeft: number,
  roundedRight: number,
): number {
  const left = BigInt(roundedLeft);
  const right = BigInt(roundedRight);
  switch (operation) {
    case "add":
      return toSafeNumber(left + right, "estimated sum");
    case "subtract":
      return toSafeNumber(left - right, "estimated difference");
    case "multiply":
      return toSafeNumber(left * right, "estimated product");
    case "divide":
      if (right === BIGINT_ZERO) {
        throw new MultiDigitOperationsDomainError(
          "ESTIMATE_DIVISOR_ROUNDS_TO_ZERO",
          "The rounded divisor must remain positive.",
        );
      }
      return toSafeNumber(left / right, "estimated quotient");
  }
}

function buildEstimate(
  operation: MultiDigitBaseOperation,
  left: number,
  right: number,
  roundingPlace: number,
  exactResult: MultiDigitOperationResult,
): EstimateReceipt {
  validateRoundingPlace(roundingPlace);
  const roundedLeft = roundIntegerToPlace(left, roundingPlace);
  const roundedRight = roundIntegerToPlace(right, roundingPlace);
  const exactComparisonValue = comparisonValue(exactResult);
  const estimate = estimatedValue(operation, roundedLeft, roundedRight);
  const signedError = estimate - exactComparisonValue;
  if (!Number.isSafeInteger(signedError)) {
    throw new MultiDigitOperationsDomainError(
      "UNSAFE_RESULT",
      "The estimate error is outside the safe-integer result domain.",
    );
  }
  return {
    exactOperation: operation,
    roundingPlace,
    roundedLeft,
    roundedRight,
    exactComparisonValue,
    estimatedValue: estimate,
    signedError,
    absoluteError: signedError < 0 ? -signedError : signedError,
  };
}

function stateKey(state: MultiDigitOperationsSerializedState): string {
  return [
    MULTI_DIGIT_OPERATIONS_MODEL_VERSION,
    `operation=${state.operation}`,
    `exact=${state.exactOperation}`,
    `left=${state.left}`,
    `right=${state.right}`,
    `result=${state.resultValue ?? "-"}`,
    `quotient=${state.quotient ?? "-"}`,
    `remainder=${state.remainder ?? "-"}`,
    `rounding=${state.roundingPlace ?? "-"}`,
    `roundedLeft=${state.roundedLeft ?? "-"}`,
    `roundedRight=${state.roundedRight ?? "-"}`,
    `estimate=${state.estimatedValue ?? "-"}`,
    `error=${state.signedEstimateError ?? "-"}`,
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

export function buildMultiDigitOperationsModel(
  input: MultiDigitOperationsInput,
): MultiDigitOperationsModel {
  validateOperation(input.operation);
  const exactOperation =
    input.operation === "estimate-check"
      ? input.exactOperation
      : input.operation;
  if (!isBaseOperation(exactOperation)) {
    throw new MultiDigitOperationsDomainError(
      "INVALID_OPERATION",
      `Unsupported exact multi-digit operation: ${String(exactOperation)}`,
    );
  }

  const core = buildCore(exactOperation, input.left, input.right);
  const estimate =
    input.operation === "estimate-check"
      ? buildEstimate(
          exactOperation,
          input.left,
          input.right,
          input.roundingPlace,
          core.result,
        )
      : null;
  const exactValue = comparisonValue(core.result);
  const invariantReceipts = estimate
    ? [
        ...core.invariantReceipts,
        exactReceipt(
          "estimate-error",
          estimate.estimatedValue - exactValue,
          estimate.signedError,
        ),
        exactReceipt(
          "estimate-absolute-error",
          estimate.signedError < 0
            ? -estimate.signedError
            : estimate.signedError,
          estimate.absoluteError,
        ),
      ]
    : core.invariantReceipts;
  const state: MultiDigitOperationsSerializedState = {
    version: MULTI_DIGIT_OPERATIONS_MODEL_VERSION,
    operation: input.operation,
    exactOperation,
    left: input.left,
    right: input.right,
    resultValue: core.result.kind === "whole" ? core.result.value : null,
    quotient: core.result.kind === "division" ? core.result.quotient : null,
    remainder: core.result.kind === "division" ? core.result.remainder : null,
    roundingPlace: estimate?.roundingPlace ?? null,
    roundedLeft: estimate?.roundedLeft ?? null,
    roundedRight: estimate?.roundedRight ?? null,
    estimatedValue: estimate?.estimatedValue ?? null,
    signedEstimateError: estimate?.signedError ?? null,
  };
  return deepFreeze({
    version: MULTI_DIGIT_OPERATIONS_MODEL_VERSION,
    operation: input.operation,
    exactOperation,
    operands: { left: input.left, right: input.right },
    result: core.result,
    placeValues: core.placeValues,
    algorithm: core.algorithm,
    estimate,
    invariantReceipts,
    state,
    stateKey: stateKey(state),
  });
}

export function buildMultiDigitOperationsResetState(): MultiDigitOperationsModel {
  return buildMultiDigitOperationsModel(MULTI_DIGIT_OPERATIONS_RESET_INPUT);
}
