export const PERCENT_APPLICATIONS_MODEL_CONTRACT = deepFreeze({
  family: "percent-applications",
  version: "percent-applications-v1",
} as const);

export const PERCENT_APPLICATIONS_LAB_IDS = deepFreeze([
  "bnu-primary-p6-upper-percentage-applications",
  "pep-primary-p6-upper-percent-fractions",
] as const);

export type PercentApplicationsLabId =
  (typeof PERCENT_APPLICATIONS_LAB_IDS)[number];

export const PERCENT_APPLICATIONS_MODES = deepFreeze([
  "convert",
  "find-part",
  "find-whole",
  "increase",
  "decrease",
  "discount",
  "inverse",
] as const);

export type PercentApplicationsMode =
  (typeof PERCENT_APPLICATIONS_MODES)[number];

export type PercentChangeDirection = "decrease" | "increase";

export type PercentApplicationsInput = {
  /** Known part for find-whole. */
  amount: number;
  /** Whole, original value, or original price for forward applications. */
  base: number;
  inverseDirection: PercentChangeDirection;
  labId: PercentApplicationsLabId;
  mode: PercentApplicationsMode;
  /** Observed value after the change for inverse mode. */
  newValue: number;
  /** Hundredths of one percent: 1_250 basis points = 12.5%. */
  rateBasisPoints: number;
};

export type PercentApplicationsDomainErrorCode =
  | "APPLICATION_RATE_OUT_OF_RANGE"
  | "INTERNAL_INVARIANT_FAILURE"
  | "INVALID_DIRECTION"
  | "INVALID_LAB_ID"
  | "INVALID_MODE"
  | "NON_INTEGER"
  | "NON_INVERTIBLE_RATE"
  | "QUANTITY_OUT_OF_RANGE"
  | "RATE_OUT_OF_RANGE"
  | "UNSAFE_RESULT"
  | "ZERO_RATE";

export class PercentApplicationsDomainError extends RangeError {
  readonly code: PercentApplicationsDomainErrorCode;

  constructor(code: PercentApplicationsDomainErrorCode, message: string) {
    super(message);
    this.name = "PercentApplicationsDomainError";
    this.code = code;
  }
}

export type PercentExactRational = {
  denominator: number;
  numerator: number;
  text: string;
};

export type PercentRateReceipt = {
  basisPoints: number;
  decimal: PercentExactRational;
  fraction: PercentExactRational;
  percentText: string;
};

export type PercentApplicationsVisibleReceipt =
  | {
      decimal: PercentExactRational;
      fraction: PercentExactRational;
      kind: "conversion";
      percentText: string;
    }
  | {
      base: PercentExactRational;
      kind: "find-part";
      part: PercentExactRational;
      rate: PercentExactRational;
      reconstruction: PercentExactRational;
    }
  | {
      kind: "find-whole";
      knownPart: PercentExactRational;
      rate: PercentExactRational;
      reconstruction: PercentExactRational;
      whole: PercentExactRational;
    }
  | {
      absoluteChange: PercentExactRational;
      direction: PercentChangeDirection;
      kind: "percent-change";
      multiplier: PercentExactRational;
      newValue: PercentExactRational;
      original: PercentExactRational;
      reconstruction: PercentExactRational;
    }
  | {
      discountAmount: PercentExactRational;
      discountRate: PercentExactRational;
      kind: "discount";
      originalPrice: PercentExactRational;
      reconstruction: PercentExactRational;
      salePrice: PercentExactRational;
    }
  | {
      direction: PercentChangeDirection;
      forwardCheck: PercentExactRational;
      kind: "inverse";
      multiplier: PercentExactRational;
      observedNewValue: PercentExactRational;
      original: PercentExactRational;
    };

export type PercentApplicationsInvariantId =
  | "discount-base-consistency"
  | "fraction-decimal-percent-sync"
  | "percent-change-reconstruction"
  | "percent-forward-inverse";

export type PercentApplicationsInvariantReceipt = {
  applicable: boolean;
  holds: boolean | null;
  id: PercentApplicationsInvariantId;
  status: "not-applicable" | "pass";
};

export type PercentApplicationsState = {
  family: typeof PERCENT_APPLICATIONS_MODEL_CONTRACT.family;
  input: PercentApplicationsInput;
  invariants: PercentApplicationsInvariantReceipt[];
  mode: PercentApplicationsMode;
  rate: PercentRateReceipt;
  version: typeof PERCENT_APPLICATIONS_MODEL_CONTRACT.version;
  visibleReceipt: PercentApplicationsVisibleReceipt;
};

const RATE_DENOMINATOR = 10_000;
const MAX_RATE_BASIS_POINTS = 50_000;
const MAX_QUANTITY = 1_000_000;
const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function greatestCommonDivisor(left: bigint, right: bigint) {
  let a = left < BIGINT_ZERO ? -left : left;
  let b = right < BIGINT_ZERO ? -right : right;
  while (b !== BIGINT_ZERO) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || BIGINT_ONE;
}

function safeNumber(value: bigint, label: string) {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new PercentApplicationsDomainError(
      "UNSAFE_RESULT",
      `${label} exceeds the exact safe-integer domain.`,
    );
  }
  return Number(value);
}

function exactRational(
  rawNumerator: bigint | number,
  rawDenominator: bigint | number = 1,
): PercentExactRational {
  let numerator = BigInt(rawNumerator);
  let denominator = BigInt(rawDenominator);
  if (denominator === BIGINT_ZERO) {
    throw new PercentApplicationsDomainError(
      "NON_INVERTIBLE_RATE",
      "An exact percentage relationship cannot divide by zero.",
    );
  }
  if (denominator < BIGINT_ZERO) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = greatestCommonDivisor(numerator, denominator);
  numerator /= divisor;
  denominator /= divisor;
  const safeNumerator = safeNumber(numerator, "rational numerator");
  const safeDenominator = safeNumber(denominator, "rational denominator");
  return {
    denominator: safeDenominator,
    numerator: Object.is(safeNumerator, -0) ? 0 : safeNumerator,
    text: `${Object.is(safeNumerator, -0) ? 0 : safeNumerator}/${safeDenominator}`,
  };
}

function multiply(
  left: PercentExactRational,
  right: PercentExactRational,
) {
  return exactRational(
    BigInt(left.numerator) * BigInt(right.numerator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function divide(left: PercentExactRational, right: PercentExactRational) {
  if (right.numerator === 0) {
    throw new PercentApplicationsDomainError(
      "ZERO_RATE",
      "A zero percent rate cannot determine the unknown whole.",
    );
  }
  return exactRational(
    BigInt(left.numerator) * BigInt(right.denominator),
    BigInt(left.denominator) * BigInt(right.numerator),
  );
}

function add(left: PercentExactRational, right: PercentExactRational) {
  return exactRational(
    BigInt(left.numerator) * BigInt(right.denominator) +
      BigInt(right.numerator) * BigInt(left.denominator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function subtract(left: PercentExactRational, right: PercentExactRational) {
  return exactRational(
    BigInt(left.numerator) * BigInt(right.denominator) -
      BigInt(right.numerator) * BigInt(left.denominator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function equal(left: PercentExactRational, right: PercentExactRational) {
  return (
    BigInt(left.numerator) * BigInt(right.denominator) ===
    BigInt(right.numerator) * BigInt(left.denominator)
  );
}

function percentText(basisPoints: number) {
  const whole = Math.floor(basisPoints / 100);
  const hundredths = basisPoints % 100;
  if (hundredths === 0) return `${whole}%`;
  if (hundredths % 10 === 0) return `${whole}.${hundredths / 10}%`;
  return `${whole}.${String(hundredths).padStart(2, "0")}%`;
}

function assertInput(input: PercentApplicationsInput) {
  if (!(PERCENT_APPLICATIONS_LAB_IDS as readonly string[]).includes(input.labId)) {
    throw new PercentApplicationsDomainError(
      "INVALID_LAB_ID",
      `Unsupported percentage-application Lab ${String(input.labId)}.`,
    );
  }
  if (!(PERCENT_APPLICATIONS_MODES as readonly string[]).includes(input.mode)) {
    throw new PercentApplicationsDomainError(
      "INVALID_MODE",
      `Unsupported percentage-application mode ${String(input.mode)}.`,
    );
  }
  if (input.inverseDirection !== "increase" && input.inverseDirection !== "decrease") {
    throw new PercentApplicationsDomainError(
      "INVALID_DIRECTION",
      `Unsupported inverse direction ${String(input.inverseDirection)}.`,
    );
  }
  for (const [label, value] of [
    ["amount", input.amount],
    ["base", input.base],
    ["newValue", input.newValue],
    ["rateBasisPoints", input.rateBasisPoints],
  ] as const) {
    if (!Number.isSafeInteger(value)) {
      throw new PercentApplicationsDomainError(
        "NON_INTEGER",
        `${label} must be a safe integer.`,
      );
    }
  }
  for (const [label, value] of [
    ["amount", input.amount],
    ["base", input.base],
    ["newValue", input.newValue],
  ] as const) {
    if (value < 0 || value > MAX_QUANTITY) {
      throw new PercentApplicationsDomainError(
        "QUANTITY_OUT_OF_RANGE",
        `${label} must be between 0 and ${MAX_QUANTITY}.`,
      );
    }
  }
  if (
    input.rateBasisPoints < 0 ||
    input.rateBasisPoints > MAX_RATE_BASIS_POINTS
  ) {
    throw new PercentApplicationsDomainError(
      "RATE_OUT_OF_RANGE",
      `rateBasisPoints must be between 0 and ${MAX_RATE_BASIS_POINTS}.`,
    );
  }
  if (
    (input.mode === "decrease" ||
      input.mode === "discount" ||
      (input.mode === "inverse" && input.inverseDirection === "decrease")) &&
    input.rateBasisPoints > RATE_DENOMINATOR
  ) {
    throw new PercentApplicationsDomainError(
      "APPLICATION_RATE_OUT_OF_RANGE",
      `${input.mode} cannot use a decrease or discount rate above 100%.`,
    );
  }
}

function invariant(
  id: PercentApplicationsInvariantId,
  applicable: boolean,
  holds: boolean,
): PercentApplicationsInvariantReceipt {
  if (!applicable) {
    return { applicable: false, holds: null, id, status: "not-applicable" };
  }
  if (!holds) {
    throw new PercentApplicationsDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      `${id} failed for a constructed percentage-application state.`,
    );
  }
  return { applicable: true, holds: true, id, status: "pass" };
}

function buildVisibleReceipt(
  input: PercentApplicationsInput,
  rate: PercentExactRational,
): PercentApplicationsVisibleReceipt {
  const base = exactRational(input.base);
  const amount = exactRational(input.amount);
  const observedNewValue = exactRational(input.newValue);
  const one = exactRational(1);

  switch (input.mode) {
    case "convert":
      return {
        decimal: rate,
        fraction: rate,
        kind: "conversion",
        percentText: percentText(input.rateBasisPoints),
      };
    case "find-part": {
      const part = multiply(base, rate);
      return {
        base,
        kind: "find-part",
        part,
        rate,
        reconstruction: multiply(base, rate),
      };
    }
    case "find-whole": {
      if (input.rateBasisPoints === 0) {
        throw new PercentApplicationsDomainError(
          "ZERO_RATE",
          "A zero percent rate cannot determine the unknown whole.",
        );
      }
      const whole = divide(amount, rate);
      return {
        kind: "find-whole",
        knownPart: amount,
        rate,
        reconstruction: multiply(whole, rate),
        whole,
      };
    }
    case "increase":
    case "decrease": {
      const absoluteChange = multiply(base, rate);
      const multiplier =
        input.mode === "increase" ? add(one, rate) : subtract(one, rate);
      const newValue = multiply(base, multiplier);
      return {
        absoluteChange,
        direction: input.mode,
        kind: "percent-change",
        multiplier,
        newValue,
        original: base,
        reconstruction:
          input.mode === "increase"
            ? add(base, absoluteChange)
            : subtract(base, absoluteChange),
      };
    }
    case "discount": {
      const discountAmount = multiply(base, rate);
      const salePrice = subtract(base, discountAmount);
      return {
        discountAmount,
        discountRate: rate,
        kind: "discount",
        originalPrice: base,
        reconstruction: add(salePrice, discountAmount),
        salePrice,
      };
    }
    case "inverse": {
      const multiplier =
        input.inverseDirection === "increase"
          ? add(one, rate)
          : subtract(one, rate);
      if (multiplier.numerator === 0) {
        throw new PercentApplicationsDomainError(
          "NON_INVERTIBLE_RATE",
          "A 100% decrease cannot be inverted to one unique original value.",
        );
      }
      const original = divide(observedNewValue, multiplier);
      return {
        direction: input.inverseDirection,
        forwardCheck: multiply(original, multiplier),
        kind: "inverse",
        multiplier,
        observedNewValue,
        original,
      };
    }
  }
}

function buildInvariants(
  input: PercentApplicationsInput,
  rate: PercentRateReceipt,
  receipt: PercentApplicationsVisibleReceipt,
) {
  const canonicalRate = exactRational(input.rateBasisPoints, RATE_DENOMINATOR);
  const syncHolds =
    equal(rate.fraction, canonicalRate) &&
    equal(rate.decimal, canonicalRate) &&
    rate.percentText === percentText(input.rateBasisPoints);

  let forwardInverseApplicable = false;
  let forwardInverseHolds = true;
  if (receipt.kind === "find-part") {
    forwardInverseApplicable = true;
    forwardInverseHolds = equal(
      receipt.part,
      multiply(receipt.base, receipt.rate),
    );
  } else if (receipt.kind === "find-whole") {
    forwardInverseApplicable = true;
    forwardInverseHolds = equal(
      receipt.knownPart,
      multiply(receipt.whole, receipt.rate),
    );
  } else if (receipt.kind === "inverse") {
    forwardInverseApplicable = true;
    forwardInverseHolds = equal(
      receipt.forwardCheck,
      receipt.observedNewValue,
    );
  }

  const percentChangeApplicable =
    receipt.kind === "percent-change" || receipt.kind === "inverse";
  const percentChangeHolds =
    receipt.kind === "percent-change"
      ? equal(receipt.reconstruction, receipt.newValue) &&
        equal(receipt.absoluteChange, multiply(receipt.original, rate.fraction))
      : receipt.kind === "inverse"
        ? equal(receipt.forwardCheck, receipt.observedNewValue)
        : true;

  const discountApplicable = receipt.kind === "discount";
  const discountHolds =
    receipt.kind !== "discount" ||
    (equal(receipt.reconstruction, receipt.originalPrice) &&
      equal(
        receipt.discountAmount,
        multiply(receipt.originalPrice, receipt.discountRate),
      ));

  return [
    invariant("fraction-decimal-percent-sync", true, syncHolds),
    invariant(
      "percent-forward-inverse",
      forwardInverseApplicable,
      forwardInverseHolds,
    ),
    invariant(
      "percent-change-reconstruction",
      percentChangeApplicable,
      percentChangeHolds,
    ),
    invariant(
      "discount-base-consistency",
      discountApplicable,
      discountHolds,
    ),
  ];
}

export function buildPercentApplicationsState(
  rawInput: PercentApplicationsInput,
): PercentApplicationsState {
  const input = { ...rawInput };
  assertInput(input);
  const fraction = exactRational(input.rateBasisPoints, RATE_DENOMINATOR);
  const rate: PercentRateReceipt = {
    basisPoints: input.rateBasisPoints,
    decimal: fraction,
    fraction,
    percentText: percentText(input.rateBasisPoints),
  };
  const visibleReceipt = buildVisibleReceipt(input, fraction);
  const state: PercentApplicationsState = {
    family: PERCENT_APPLICATIONS_MODEL_CONTRACT.family,
    input,
    invariants: buildInvariants(input, rate, visibleReceipt),
    mode: input.mode,
    rate,
    version: PERCENT_APPLICATIONS_MODEL_CONTRACT.version,
    visibleReceipt,
  };
  return deepFreeze(state);
}
