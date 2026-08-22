export const DECIMAL_ARITHMETIC_MODEL_CONTRACT = {
  family: "decimal-arithmetic",
  version: "decimal-arithmetic-v1",
} as const;

export const decimalArithmeticOperations = [
  "add",
  "subtract",
  "multiply",
  "divide",
  "estimate-check",
] as const;

export type DecimalArithmeticOperation =
  (typeof decimalArithmeticOperations)[number];

export type ExactDecimalOperand = {
  /** Integer coefficient. The exact value is unscaled / 10^scale. */
  unscaled: number;
  scale: number;
};

export type ExactRational = {
  denominator: number;
  numerator: number;
};

export type DecimalColumn = {
  exponent: number;
  label: string;
  leftDigit: number;
  rightDigit: number;
};

export type DecimalRegroupReceipt = {
  columnExponent: number;
  incoming: number;
  kind: "borrow" | "carry";
  outgoing: number;
  resultDigit: number;
};

export type DecimalInvariantReceipt = {
  actual: string;
  expected: string;
  holds: boolean;
  id:
    | "decimal-scaled-integer-exactness"
    | "place-value-reconstruction"
    | "signed-column-reconstruction"
    | "division-reconstruction"
    | "area-product"
    | "estimate-error";
};

export type DecimalSign = -1 | 0 | 1;

export type DecimalColumnCalculationReceipt = {
  /** The signed second term after subtract has been rewritten as add-opposite. */
  alignedLeftTerm: number;
  alignedRightTerm: number;
  bottomMagnitude: number;
  bottomSource: "left" | "right";
  columns: DecimalColumn[];
  effectiveOperation: "add" | "subtract";
  expectedAlignedResult: number;
  operandsSwapped: boolean;
  reconstructedAlignedResult: number;
  resultMagnitude: number;
  resultSign: DecimalSign;
  topMagnitude: number;
  topSource: "left" | "right";
};

export type DecimalArithmeticInput = {
  left: ExactDecimalOperand;
  operation: DecimalArithmeticOperation;
  /** Decimal places used by the estimate/error receipt. */
  precision: number;
  /** estimate-check evaluates this exact operation before rounding its result. */
  right: ExactDecimalOperand;
  estimateOperation?: Exclude<DecimalArithmeticOperation, "estimate-check">;
};

export type DecimalArithmeticState = {
  family: typeof DECIMAL_ARITHMETIC_MODEL_CONTRACT.family;
  version: typeof DECIMAL_ARITHMETIC_MODEL_CONTRACT.version;
  operation: DecimalArithmeticOperation;
  evaluatedOperation: Exclude<DecimalArithmeticOperation, "estimate-check">;
  left: ExactDecimalOperand & { denominator: number; text: string };
  right: ExactDecimalOperand & { denominator: number; text: string };
  alignment: {
    alignedLeft: number;
    alignedRight: number;
    columns: DecimalColumn[];
    commonScale: number;
    decimalPointAfterColumn: number;
  };
  columnCalculation: DecimalColumnCalculationReceipt | null;
  regrouping: DecimalRegroupReceipt[];
  multiplication: {
    exactUnscaledProduct: number;
    leftSign: DecimalSign;
    partialProducts: Array<{
      digit: number;
      digitPlace: number;
      partialProduct: number;
    }>;
    resultSign: DecimalSign;
    resultScale: number;
    rightSign: DecimalSign;
  } | null;
  division: {
    dividend: number;
    dividendSign: DecimalSign;
    divisor: number;
    divisorSign: DecimalSign;
    exactResultSign: DecimalSign;
    quotient: number;
    quotientSign: DecimalSign;
    remainder: number;
  } | null;
  result: {
    exact: ExactRational;
    text: string;
  };
  estimate: {
    absoluteError: ExactRational;
    exact: ExactRational;
    precision: number;
    rounded: ExactDecimalOperand & { text: string };
    signedError: ExactRational;
  };
  invariants: DecimalInvariantReceipt[];
};

// The bound keeps every product, rounding receipt, and cross-multiplied
// invariant inside Number's exact safe-integer range at precision 4.
const MAX_ABS_UNSCALED = 9_999;
const MAX_SCALE = 3;
const MAX_PRECISION = 4;

function assertSafeInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${name} must be a safe integer.`);
  }
}

function assertOperand(operand: ExactDecimalOperand, name: string) {
  assertSafeInteger(operand.unscaled, `${name}.unscaled`);
  assertSafeInteger(operand.scale, `${name}.scale`);
  if (Math.abs(operand.unscaled) > MAX_ABS_UNSCALED) {
    throw new RangeError(`${name}.unscaled exceeds the exact model domain.`);
  }
  if (operand.scale < 0 || operand.scale > MAX_SCALE) {
    throw new RangeError(`${name}.scale must be between 0 and ${MAX_SCALE}.`);
  }
}

function safeMultiply(left: number, right: number, name: string) {
  const product = left * right;
  assertSafeInteger(product, name);
  return Object.is(product, -0) ? 0 : product;
}

function pow10(exponent: number) {
  assertSafeInteger(exponent, "power-of-ten exponent");
  if (exponent < 0 || exponent > 9) {
    throw new RangeError(
      "Power-of-ten exponent is outside the exact model domain.",
    );
  }
  return 10 ** exponent;
}

function gcd(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

export function normalizeExactRational(
  numerator: number,
  denominator: number,
): ExactRational {
  assertSafeInteger(numerator, "rational numerator");
  assertSafeInteger(denominator, "rational denominator");
  if (denominator === 0)
    throw new RangeError("Rational denominator cannot be zero.");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  const normalizedNumerator = sign * (numerator / divisor);
  return {
    numerator: Object.is(normalizedNumerator, -0) ? 0 : normalizedNumerator,
    denominator: Math.abs(denominator / divisor),
  };
}

function subtractRational(left: ExactRational, right: ExactRational) {
  return normalizeExactRational(
    safeMultiply(
      left.numerator,
      right.denominator,
      "signed error numerator left",
    ) -
      safeMultiply(
        right.numerator,
        left.denominator,
        "signed error numerator right",
      ),
    safeMultiply(
      left.denominator,
      right.denominator,
      "signed error denominator",
    ),
  );
}

function absoluteRational(value: ExactRational) {
  return { ...value, numerator: Math.abs(value.numerator) };
}

function decimalText(unscaled: number, scale: number) {
  const sign = unscaled < 0 ? "-" : "";
  const absoluteDigits = String(Math.abs(unscaled)).padStart(scale + 1, "0");
  if (scale === 0) return `${sign}${absoluteDigits}`;
  const split = absoluteDigits.length - scale;
  return `${sign}${absoluteDigits.slice(0, split)}.${absoluteDigits.slice(split)}`;
}

function rationalText(value: ExactRational) {
  return value.denominator === 1
    ? String(value.numerator)
    : `${value.numerator}/${value.denominator}`;
}

function exactOperand(operand: ExactDecimalOperand) {
  return {
    ...operand,
    denominator: pow10(operand.scale),
    text: decimalText(operand.unscaled, operand.scale),
  };
}

function alignedInteger(operand: ExactDecimalOperand, commonScale: number) {
  return safeMultiply(
    operand.unscaled,
    pow10(commonScale - operand.scale),
    "aligned decimal integer",
  );
}

function digitAt(value: number, position: number) {
  return Math.floor(Math.abs(value) / pow10(position)) % 10;
}

function decimalSign(value: number): DecimalSign {
  return value === 0 ? 0 : value < 0 ? -1 : 1;
}

function canonicalZero(value: number) {
  return Object.is(value, -0) ? 0 : value;
}

function columnLabel(exponent: number) {
  if (exponent === 0) return "ones";
  if (exponent === 1) return "tens";
  if (exponent === 2) return "hundreds";
  if (exponent === 3) return "thousands";
  if (exponent === -1) return "tenths";
  if (exponent === -2) return "hundredths";
  if (exponent === -3) return "thousandths";
  return `10^${exponent}`;
}

function buildColumns(left: number, right: number, commonScale: number) {
  const magnitude = Math.max(Math.abs(left), Math.abs(right), 1);
  const integerDigits = Math.max(
    1,
    String(Math.floor(magnitude / pow10(commonScale))).length,
  );
  const totalDigits = integerDigits + commonScale;
  const columns: DecimalColumn[] = [];
  for (let position = totalDigits - 1; position >= 0; position -= 1) {
    const exponent = position - commonScale;
    columns.push({
      exponent,
      label: columnLabel(exponent),
      leftDigit: digitAt(left, position),
      rightDigit: digitAt(right, position),
    });
  }
  return columns;
}

function additionRegrouping(left: number, right: number, commonScale: number) {
  const magnitude = Math.max(Math.abs(left), Math.abs(right), 1);
  const digits = String(magnitude).length + 1;
  const receipts: DecimalRegroupReceipt[] = [];
  let carry = 0;
  for (let position = 0; position < digits; position += 1) {
    const incoming = carry;
    const sum = digitAt(left, position) + digitAt(right, position) + incoming;
    carry = Math.floor(sum / 10);
    receipts.push({
      columnExponent: position - commonScale,
      incoming,
      kind: "carry",
      outgoing: carry,
      resultDigit: sum % 10,
    });
  }
  return receipts;
}

function subtractionRegrouping(
  left: number,
  right: number,
  commonScale: number,
) {
  if (left < 0 || right < 0 || right > left) {
    throw new RangeError(
      "Subtraction regrouping requires ordered non-negative magnitudes.",
    );
  }
  const minuend = left;
  const subtrahend = right;
  const digits = String(Math.max(minuend, 1)).length;
  const receipts: DecimalRegroupReceipt[] = [];
  let borrow = 0;
  for (let position = 0; position < digits; position += 1) {
    const incoming = borrow;
    let difference =
      digitAt(minuend, position) - incoming - digitAt(subtrahend, position);
    borrow = difference < 0 ? 1 : 0;
    if (borrow) difference += 10;
    receipts.push({
      columnExponent: position - commonScale,
      incoming,
      kind: "borrow",
      outgoing: borrow,
      resultDigit: difference,
    });
  }
  return receipts;
}

function regroupedMagnitude(
  receipts: DecimalRegroupReceipt[],
  commonScale: number,
) {
  return receipts.reduce((total, receipt) => {
    const position = receipt.columnExponent + commonScale;
    if (!Number.isInteger(position) || position < 0) {
      throw new Error(
        "Decimal regroup receipt has an invalid column exponent.",
      );
    }
    return (
      total +
      safeMultiply(receipt.resultDigit, pow10(position), "regrouped magnitude")
    );
  }, 0);
}

function signedColumnCalculation(
  operation: "add" | "subtract",
  alignedLeft: number,
  alignedRight: number,
  commonScale: number,
) {
  const alignedRightTerm = operation === "add" ? alignedRight : -alignedRight;
  const expectedAlignedResult = alignedLeft + alignedRightTerm;
  const leftSign = decimalSign(alignedLeft);
  const rightTermSign = decimalSign(alignedRightTerm);
  const sameDirection =
    leftSign === 0 || rightTermSign === 0 || leftSign === rightTermSign;
  const effectiveOperation = sameDirection ? "add" : "subtract";
  let topMagnitude = Math.abs(alignedLeft);
  let bottomMagnitude = Math.abs(alignedRightTerm);
  let topSource: DecimalColumnCalculationReceipt["topSource"] = "left";
  let bottomSource: DecimalColumnCalculationReceipt["bottomSource"] = "right";
  let operandsSwapped = false;

  if (effectiveOperation === "subtract" && bottomMagnitude > topMagnitude) {
    [topMagnitude, bottomMagnitude] = [bottomMagnitude, topMagnitude];
    [topSource, bottomSource] = [bottomSource, topSource];
    operandsSwapped = true;
  }

  const regrouping =
    effectiveOperation === "add"
      ? additionRegrouping(topMagnitude, bottomMagnitude, commonScale)
      : subtractionRegrouping(topMagnitude, bottomMagnitude, commonScale);
  const resultMagnitude = regroupedMagnitude(regrouping, commonScale);
  const resultSign = decimalSign(expectedAlignedResult);
  const reconstructedAlignedResult = resultSign * resultMagnitude;
  if (reconstructedAlignedResult !== expectedAlignedResult) {
    throw new Error(
      `Signed decimal column reconstruction failed: expected ${expectedAlignedResult}, received ${reconstructedAlignedResult}.`,
    );
  }

  return {
    receipt: {
      alignedLeftTerm: alignedLeft,
      alignedRightTerm,
      bottomMagnitude,
      bottomSource,
      columns: buildColumns(topMagnitude, bottomMagnitude, commonScale),
      effectiveOperation,
      expectedAlignedResult,
      operandsSwapped,
      reconstructedAlignedResult,
      resultMagnitude,
      resultSign,
      topMagnitude,
      topSource,
    } satisfies DecimalColumnCalculationReceipt,
    regrouping,
  };
}

function operationResult(
  operation: Exclude<DecimalArithmeticOperation, "estimate-check">,
  left: ExactDecimalOperand,
  right: ExactDecimalOperand,
) {
  const leftDenominator = pow10(left.scale);
  const rightDenominator = pow10(right.scale);
  if (operation === "add" || operation === "subtract") {
    const commonScale = Math.max(left.scale, right.scale);
    const alignedLeft = alignedInteger(left, commonScale);
    const alignedRight = alignedInteger(right, commonScale);
    return normalizeExactRational(
      operation === "add"
        ? alignedLeft + alignedRight
        : alignedLeft - alignedRight,
      pow10(commonScale),
    );
  }
  if (operation === "multiply") {
    return normalizeExactRational(
      safeMultiply(left.unscaled, right.unscaled, "decimal product"),
      safeMultiply(
        leftDenominator,
        rightDenominator,
        "decimal product denominator",
      ),
    );
  }
  if (right.unscaled === 0)
    throw new RangeError("Decimal division divisor cannot be zero.");
  return normalizeExactRational(
    safeMultiply(left.unscaled, rightDenominator, "decimal division numerator"),
    safeMultiply(
      right.unscaled,
      leftDenominator,
      "decimal division denominator",
    ),
  );
}

function roundRational(value: ExactRational, precision: number) {
  const scale = pow10(precision);
  const scaledNumerator = safeMultiply(
    Math.abs(value.numerator),
    scale,
    "rounded decimal numerator",
  );
  const quotient = Math.floor(scaledNumerator / value.denominator);
  const remainder = scaledNumerator % value.denominator;
  const roundedMagnitude =
    quotient + (remainder * 2 >= value.denominator ? 1 : 0);
  const unscaled = value.numerator < 0 ? -roundedMagnitude : roundedMagnitude;
  return { unscaled, scale: precision, text: decimalText(unscaled, precision) };
}

function invariant(
  id: DecimalInvariantReceipt["id"],
  actual: string,
  expected: string,
  holds: boolean,
): DecimalInvariantReceipt {
  return { id, actual, expected, holds };
}

export function buildDecimalArithmeticState(
  input: DecimalArithmeticInput,
): DecimalArithmeticState {
  assertOperand(input.left, "left");
  assertOperand(input.right, "right");
  assertSafeInteger(input.precision, "precision");
  if (input.precision < 0 || input.precision > MAX_PRECISION) {
    throw new RangeError(`precision must be between 0 and ${MAX_PRECISION}.`);
  }
  if (!decimalArithmeticOperations.includes(input.operation)) {
    throw new RangeError("Unsupported decimal arithmetic operation.");
  }

  const exactOperations = ["add", "subtract", "multiply", "divide"] as const;
  const rawEstimateOperation: unknown = input.estimateOperation;
  if (
    rawEstimateOperation !== undefined &&
    !exactOperations.includes(
      rawEstimateOperation as (typeof exactOperations)[number],
    )
  ) {
    throw new RangeError(
      "estimateOperation must name an exact arithmetic operation.",
    );
  }
  const evaluatedOperation: (typeof exactOperations)[number] =
    input.operation === "estimate-check"
      ? ((rawEstimateOperation as
          (typeof exactOperations)[number] | undefined) ?? "add")
      : input.operation;

  const commonScale = Math.max(input.left.scale, input.right.scale);
  const alignedLeft = alignedInteger(input.left, commonScale);
  const alignedRight = alignedInteger(input.right, commonScale);
  const exactResult = operationResult(
    evaluatedOperation,
    input.left,
    input.right,
  );
  const rounded = roundRational(exactResult, input.precision);
  const roundedRational = normalizeExactRational(
    rounded.unscaled,
    pow10(rounded.scale),
  );
  const signedError = subtractRational(exactResult, roundedRational);

  const columnCalculation =
    evaluatedOperation === "add" || evaluatedOperation === "subtract"
      ? signedColumnCalculation(
          evaluatedOperation,
          alignedLeft,
          alignedRight,
          commonScale,
        )
      : null;
  const regrouping = columnCalculation?.regrouping ?? [];

  const multiplication =
    evaluatedOperation === "multiply"
      ? {
          exactUnscaledProduct: safeMultiply(
            input.left.unscaled,
            input.right.unscaled,
            "decimal multiplication product",
          ),
          leftSign: decimalSign(input.left.unscaled),
          partialProducts: String(Math.abs(input.right.unscaled))
            .split("")
            .reverse()
            .map((digitText, digitPlace) => {
              const digit = Number(digitText);
              const multiplierSign = input.right.unscaled < 0 ? -1 : 1;
              return {
                digit,
                digitPlace,
                partialProduct: safeMultiply(
                  safeMultiply(
                    input.left.unscaled,
                    digit * multiplierSign,
                    "partial product digit",
                  ),
                  pow10(digitPlace),
                  "partial product place",
                ),
              };
            }),
          resultSign: decimalSign(
            safeMultiply(
              input.left.unscaled,
              input.right.unscaled,
              "decimal multiplication result sign",
            ),
          ),
          resultScale: input.left.scale + input.right.scale,
          rightSign: decimalSign(input.right.unscaled),
        }
      : null;

  const divisionDividend =
    evaluatedOperation === "divide"
      ? safeMultiply(
          input.left.unscaled,
          pow10(input.right.scale),
          "division transformed dividend",
        )
      : 0;
  const divisionDivisor =
    evaluatedOperation === "divide"
      ? safeMultiply(
          input.right.unscaled,
          pow10(input.left.scale),
          "division transformed divisor",
        )
      : 1;
  const divisionQuotient =
    evaluatedOperation === "divide"
      ? canonicalZero(Math.trunc(divisionDividend / divisionDivisor))
      : 0;
  const divisionRemainder =
    evaluatedOperation === "divide"
      ? canonicalZero(divisionDividend % divisionDivisor)
      : 0;
  const division =
    evaluatedOperation === "divide"
      ? {
          dividend: divisionDividend,
          dividendSign: decimalSign(divisionDividend),
          divisor: divisionDivisor,
          divisorSign: decimalSign(divisionDivisor),
          exactResultSign: decimalSign(exactResult.numerator),
          quotient: divisionQuotient,
          quotientSign: decimalSign(divisionQuotient),
          remainder: divisionRemainder,
        }
      : null;

  const alignmentDenominator = pow10(commonScale);
  const invariants: DecimalInvariantReceipt[] = [
    invariant(
      "decimal-scaled-integer-exactness",
      `${input.left.unscaled}/${pow10(input.left.scale)};${input.right.unscaled}/${pow10(input.right.scale)}`,
      `${exactOperand(input.left).text};${exactOperand(input.right).text}`,
      true,
    ),
    invariant(
      "place-value-reconstruction",
      `${alignedLeft}/${alignmentDenominator};${alignedRight}/${alignmentDenominator}`,
      `${input.left.unscaled}/${pow10(input.left.scale)};${input.right.unscaled}/${pow10(input.right.scale)}`,
      alignedLeft * pow10(input.left.scale) ===
        input.left.unscaled * alignmentDenominator &&
        alignedRight * pow10(input.right.scale) ===
          input.right.unscaled * alignmentDenominator,
    ),
    invariant(
      "signed-column-reconstruction",
      columnCalculation
        ? String(columnCalculation.receipt.reconstructedAlignedResult)
        : "not-applicable",
      columnCalculation
        ? String(columnCalculation.receipt.expectedAlignedResult)
        : "not-applicable",
      columnCalculation
        ? columnCalculation.receipt.reconstructedAlignedResult ===
            columnCalculation.receipt.expectedAlignedResult
        : true,
    ),
    invariant(
      "division-reconstruction",
      division
        ? `${division.divisor}*${division.quotient}+${division.remainder}`
        : "not-applicable",
      division ? String(division.dividend) : "not-applicable",
      division
        ? division.divisor * division.quotient + division.remainder ===
            division.dividend &&
            Math.abs(division.remainder) < Math.abs(division.divisor)
        : true,
    ),
    invariant(
      "area-product",
      multiplication
        ? multiplication.partialProducts
            .reduce((sum, part) => sum + part.partialProduct, 0)
            .toString()
        : "not-applicable",
      multiplication
        ? String(multiplication.exactUnscaledProduct)
        : "not-applicable",
      multiplication
        ? multiplication.partialProducts.reduce(
            (sum, part) => sum + part.partialProduct,
            0,
          ) === multiplication.exactUnscaledProduct
        : true,
    ),
    invariant(
      "estimate-error",
      rationalText(
        normalizeExactRational(
          signedError.numerator * roundedRational.denominator +
            roundedRational.numerator * signedError.denominator,
          signedError.denominator * roundedRational.denominator,
        ),
      ),
      rationalText(exactResult),
      signedError.numerator * roundedRational.denominator +
        roundedRational.numerator * signedError.denominator ===
        exactResult.numerator *
          ((signedError.denominator * roundedRational.denominator) /
            exactResult.denominator),
    ),
  ];

  if (invariants.some((receipt) => !receipt.holds)) {
    throw new Error("Decimal arithmetic invariant construction failed.");
  }

  return {
    family: DECIMAL_ARITHMETIC_MODEL_CONTRACT.family,
    version: DECIMAL_ARITHMETIC_MODEL_CONTRACT.version,
    operation: input.operation,
    evaluatedOperation,
    left: exactOperand(input.left),
    right: exactOperand(input.right),
    alignment: {
      alignedLeft,
      alignedRight,
      columns: buildColumns(alignedLeft, alignedRight, commonScale),
      commonScale,
      decimalPointAfterColumn: Math.max(
        1,
        buildColumns(alignedLeft, alignedRight, commonScale).length -
          commonScale,
      ),
    },
    columnCalculation: columnCalculation?.receipt ?? null,
    regrouping,
    multiplication,
    division,
    result: {
      exact: exactResult,
      text: rationalText(exactResult),
    },
    estimate: {
      absoluteError: absoluteRational(signedError),
      exact: exactResult,
      precision: input.precision,
      rounded,
      signedError,
    },
    invariants,
  };
}

export const decimalArithmeticResetInput: DecimalArithmeticInput = {
  left: { unscaled: 125, scale: 1 },
  operation: "add",
  precision: 2,
  right: { unscaled: 375, scale: 2 },
};
