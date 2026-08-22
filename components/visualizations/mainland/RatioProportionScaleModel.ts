export const RATIO_PROPORTION_SCALE_MODEL_CONTRACT = deepFreeze({
  family: "ratio-proportion-scale",
  version: "ratio-proportion-scale-v1",
} as const);

export const RATIO_PROPORTION_SCALE_LAB_ID =
  "pep-primary-p6-lower-ratio-proportion-scale" as const;

export const RATIO_PROPORTION_SCALE_MODES = deepFreeze([
  "equivalent-ratios",
  "direct-proportion",
  "inverse-proportion",
  "scale-drawing",
] as const);

export type RatioProportionScaleMode =
  (typeof RATIO_PROPORTION_SCALE_MODES)[number];

export const RATIO_PROPORTION_SCALE_UNITS = deepFreeze([
  "mm",
  "cm",
  "m",
  "km",
] as const);

export type RatioProportionScaleUnit =
  (typeof RATIO_PROPORTION_SCALE_UNITS)[number];

export type RatioProportionScaleInput = {
  actualUnit: RatioProportionScaleUnit;
  drawingLength: number;
  drawingUnit: RatioProportionScaleUnit;
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID;
  mode: RatioProportionScaleMode;
  ratioA: number;
  ratioB: number;
  scaleFactor: number;
};

export type ExactRatioRational = {
  denominator: number;
  numerator: number;
  text: string;
};

export type RatioReceipt = {
  antecedent: ExactRatioRational;
  consequent: ExactRatioRational;
  text: string;
};

export type RatioProportionScaleVisibleReceipt =
  | {
      crossProducts: {
        firstASecondB: ExactRatioRational;
        firstBSecondA: ExactRatioRational;
      };
      firstRatio: RatioReceipt;
      kind: "equivalent-ratios";
      scaleFactor: ExactRatioRational;
      secondRatio: RatioReceipt;
    }
  | {
      constantK: {
        first: ExactRatioRational;
        second: ExactRatioRational;
      };
      crossProducts: {
        firstDependentSecondIndependent: ExactRatioRational;
        firstIndependentSecondDependent: ExactRatioRational;
      };
      firstPair: {
        dependent: ExactRatioRational;
        independent: ExactRatioRational;
      };
      kind: "direct-proportion";
      scaleFactor: ExactRatioRational;
      secondPair: {
        dependent: ExactRatioRational;
        independent: ExactRatioRational;
      };
    }
  | {
      constantProductK: {
        first: ExactRatioRational;
        second: ExactRatioRational;
      };
      firstPair: {
        first: ExactRatioRational;
        second: ExactRatioRational;
      };
      kind: "inverse-proportion";
      scaleFactor: ExactRatioRational;
      secondPair: {
        first: ExactRatioRational;
        second: ExactRatioRational;
      };
    }
  | {
      actualDimension: {
        length: ExactRatioRational;
        unit: RatioProportionScaleUnit;
      };
      actualInDrawingUnits: {
        length: ExactRatioRational;
        unit: RatioProportionScaleUnit;
      };
      drawingDimension: {
        length: ExactRatioRational;
        unit: RatioProportionScaleUnit;
      };
      kind: "scale-drawing";
      reconstructionInDrawingUnits: ExactRatioRational;
      scaleFactor: ExactRatioRational;
      scaleRatio: {
        actual: ExactRatioRational;
        drawing: ExactRatioRational;
      };
      unitConversion: {
        actualUnitInMillimetres: ExactRatioRational;
        drawingUnitInMillimetres: ExactRatioRational;
      };
    };

export type RatioProportionScaleInvariantId =
  | "direct-proportion-constant"
  | "equivalent-ratio-cross-products"
  | "inverse-proportion-product"
  | "scale-drawing-unit-conversion";

export type RatioProportionScaleInvariantReceipt = {
  applicable: boolean;
  holds: boolean | null;
  id: RatioProportionScaleInvariantId;
  status: "not-applicable" | "pass";
};

export type RatioProportionScaleState = {
  controls: {
    "drawing-length": number;
    "ratio-a": number;
    "ratio-b": number;
    "scale-factor": number;
    units: {
      actual: RatioProportionScaleUnit;
      drawing: RatioProportionScaleUnit;
    };
  };
  family: typeof RATIO_PROPORTION_SCALE_MODEL_CONTRACT.family;
  input: RatioProportionScaleInput;
  invariants: RatioProportionScaleInvariantReceipt[];
  mode: RatioProportionScaleMode;
  scaleFactor: ExactRatioRational;
  version: typeof RATIO_PROPORTION_SCALE_MODEL_CONTRACT.version;
  visibleReceipt: RatioProportionScaleVisibleReceipt;
};

export type RatioProportionScaleDomainErrorCode =
  | "CONTROL_OUT_OF_RANGE"
  | "INTERNAL_INVARIANT_FAILURE"
  | "INVALID_LAB_ID"
  | "INVALID_MODE"
  | "INVALID_UNIT"
  | "NON_INTEGER"
  | "UNSAFE_RESULT";

export class RatioProportionScaleDomainError extends RangeError {
  readonly code: RatioProportionScaleDomainErrorCode;

  constructor(code: RatioProportionScaleDomainErrorCode, message: string) {
    super(message);
    this.name = "RatioProportionScaleDomainError";
    this.code = code;
  }
}

const MAX_CONTROL_VALUE = 10_000;
const ZERO = BigInt(0);
const ONE = BigInt(1);

const UNIT_IN_MILLIMETRES = deepFreeze({
  cm: 10,
  km: 1_000_000,
  m: 1_000,
  mm: 1,
} satisfies Record<RatioProportionScaleUnit, number>);

const RESET_INPUTS = deepFreeze({
  "direct-proportion": {
    actualUnit: "m",
    drawingLength: 5,
    drawingUnit: "cm",
    labId: RATIO_PROPORTION_SCALE_LAB_ID,
    mode: "direct-proportion",
    ratioA: 3,
    ratioB: 5,
    scaleFactor: 4,
  },
  "equivalent-ratios": {
    actualUnit: "m",
    drawingLength: 5,
    drawingUnit: "cm",
    labId: RATIO_PROPORTION_SCALE_LAB_ID,
    mode: "equivalent-ratios",
    ratioA: 2,
    ratioB: 3,
    scaleFactor: 4,
  },
  "inverse-proportion": {
    actualUnit: "m",
    drawingLength: 5,
    drawingUnit: "cm",
    labId: RATIO_PROPORTION_SCALE_LAB_ID,
    mode: "inverse-proportion",
    ratioA: 4,
    ratioB: 9,
    scaleFactor: 3,
  },
  "scale-drawing": {
    actualUnit: "m",
    drawingLength: 5,
    drawingUnit: "cm",
    labId: RATIO_PROPORTION_SCALE_LAB_ID,
    mode: "scale-drawing",
    ratioA: 1,
    ratioB: 100,
    scaleFactor: 100,
  },
} satisfies Record<RatioProportionScaleMode, RatioProportionScaleInput>);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function isMode(value: unknown): value is RatioProportionScaleMode {
  return (RATIO_PROPORTION_SCALE_MODES as readonly unknown[]).includes(value);
}

function isUnit(value: unknown): value is RatioProportionScaleUnit {
  return (RATIO_PROPORTION_SCALE_UNITS as readonly unknown[]).includes(value);
}

function greatestCommonDivisor(left: bigint, right: bigint) {
  let a = left < ZERO ? -left : left;
  let b = right < ZERO ? -right : right;
  while (b !== ZERO) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || ONE;
}

function safeNumber(value: bigint, label: string) {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new RatioProportionScaleDomainError(
      "UNSAFE_RESULT",
      `${label} exceeds the exact safe-integer domain.`,
    );
  }
  return Number(value);
}

function exactRational(
  rawNumerator: bigint | number,
  rawDenominator: bigint | number = 1,
): ExactRatioRational {
  let numerator = BigInt(rawNumerator);
  let denominator = BigInt(rawDenominator);
  if (denominator === ZERO) {
    throw new RatioProportionScaleDomainError(
      "CONTROL_OUT_OF_RANGE",
      "An exact ratio cannot divide by zero.",
    );
  }
  if (denominator < ZERO) {
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
  left: ExactRatioRational,
  right: ExactRatioRational,
) {
  return exactRational(
    BigInt(left.numerator) * BigInt(right.numerator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function equal(left: ExactRatioRational, right: ExactRatioRational) {
  return (
    BigInt(left.numerator) * BigInt(right.denominator) ===
    BigInt(right.numerator) * BigInt(left.denominator)
  );
}

function ratioReceipt(
  antecedent: ExactRatioRational,
  consequent: ExactRatioRational,
): RatioReceipt {
  return {
    antecedent,
    consequent,
    text: `${antecedent.text}:${consequent.text}`,
  };
}

function assertPositiveControl(value: number, label: string) {
  if (!Number.isSafeInteger(value)) {
    throw new RatioProportionScaleDomainError(
      "NON_INTEGER",
      `${label} must be a finite safe integer.`,
    );
  }
  if (value <= 0 || value > MAX_CONTROL_VALUE) {
    throw new RatioProportionScaleDomainError(
      "CONTROL_OUT_OF_RANGE",
      `${label} must be between 1 and ${MAX_CONTROL_VALUE}.`,
    );
  }
}

function assertInput(input: RatioProportionScaleInput) {
  if (input.labId !== RATIO_PROPORTION_SCALE_LAB_ID) {
    throw new RatioProportionScaleDomainError(
      "INVALID_LAB_ID",
      `Unsupported ratio/proportion/scale Lab ${String(input.labId)}.`,
    );
  }
  if (!isMode(input.mode)) {
    throw new RatioProportionScaleDomainError(
      "INVALID_MODE",
      `Unsupported ratio/proportion/scale mode ${String(input.mode)}.`,
    );
  }
  if (!isUnit(input.drawingUnit) || !isUnit(input.actualUnit)) {
    throw new RatioProportionScaleDomainError(
      "INVALID_UNIT",
      `Unsupported scale-drawing units ${String(input.drawingUnit)} and ${String(input.actualUnit)}.`,
    );
  }
  assertPositiveControl(input.ratioA, "ratioA");
  assertPositiveControl(input.ratioB, "ratioB");
  assertPositiveControl(input.scaleFactor, "scaleFactor");
  assertPositiveControl(input.drawingLength, "drawingLength");
}

function inputSnapshot(
  input: RatioProportionScaleInput,
): RatioProportionScaleInput {
  return deepFreeze({
    actualUnit: input.actualUnit,
    drawingLength: input.drawingLength,
    drawingUnit: input.drawingUnit,
    labId: input.labId,
    mode: input.mode,
    ratioA: input.ratioA,
    ratioB: input.ratioB,
    scaleFactor: input.scaleFactor,
  });
}

function buildVisibleReceipt(
  input: RatioProportionScaleInput,
): RatioProportionScaleVisibleReceipt {
  const ratioA = exactRational(input.ratioA);
  const ratioB = exactRational(input.ratioB);
  const scaleFactor = exactRational(input.scaleFactor);
  switch (input.mode) {
    case "equivalent-ratios": {
      const scaledA = multiply(ratioA, scaleFactor);
      const scaledB = multiply(ratioB, scaleFactor);
      return {
        crossProducts: {
          firstASecondB: multiply(ratioA, scaledB),
          firstBSecondA: multiply(ratioB, scaledA),
        },
        firstRatio: ratioReceipt(ratioA, ratioB),
        kind: "equivalent-ratios",
        scaleFactor,
        secondRatio: ratioReceipt(scaledA, scaledB),
      };
    }
    case "direct-proportion": {
      const secondIndependent = multiply(ratioA, scaleFactor);
      const secondDependent = multiply(ratioB, scaleFactor);
      return {
        constantK: {
          first: exactRational(input.ratioB, input.ratioA),
          second: exactRational(
            secondDependent.numerator * secondIndependent.denominator,
            secondDependent.denominator * secondIndependent.numerator,
          ),
        },
        crossProducts: {
          firstDependentSecondIndependent: multiply(
            ratioB,
            secondIndependent,
          ),
          firstIndependentSecondDependent: multiply(
            ratioA,
            secondDependent,
          ),
        },
        firstPair: { dependent: ratioB, independent: ratioA },
        kind: "direct-proportion",
        scaleFactor,
        secondPair: {
          dependent: secondDependent,
          independent: secondIndependent,
        },
      };
    }
    case "inverse-proportion": {
      const secondFirst = multiply(ratioA, scaleFactor);
      const secondSecond = exactRational(input.ratioB, input.scaleFactor);
      return {
        constantProductK: {
          first: multiply(ratioA, ratioB),
          second: multiply(secondFirst, secondSecond),
        },
        firstPair: { first: ratioA, second: ratioB },
        kind: "inverse-proportion",
        scaleFactor,
        secondPair: { first: secondFirst, second: secondSecond },
      };
    }
    case "scale-drawing": {
      const drawingLength = exactRational(input.drawingLength);
      const actualInDrawingUnits = multiply(drawingLength, scaleFactor);
      const drawingUnitInMillimetres = exactRational(
        UNIT_IN_MILLIMETRES[input.drawingUnit],
      );
      const actualUnitInMillimetres = exactRational(
        UNIT_IN_MILLIMETRES[input.actualUnit],
      );
      const actualLength = exactRational(
        BigInt(actualInDrawingUnits.numerator) *
          BigInt(UNIT_IN_MILLIMETRES[input.drawingUnit]),
        BigInt(actualInDrawingUnits.denominator) *
          BigInt(UNIT_IN_MILLIMETRES[input.actualUnit]),
      );
      const reconstructionInDrawingUnits = exactRational(
        BigInt(actualLength.numerator) *
          BigInt(UNIT_IN_MILLIMETRES[input.actualUnit]),
        BigInt(actualLength.denominator) *
          BigInt(UNIT_IN_MILLIMETRES[input.drawingUnit]),
      );
      return {
        actualDimension: { length: actualLength, unit: input.actualUnit },
        actualInDrawingUnits: {
          length: actualInDrawingUnits,
          unit: input.drawingUnit,
        },
        drawingDimension: {
          length: drawingLength,
          unit: input.drawingUnit,
        },
        kind: "scale-drawing",
        reconstructionInDrawingUnits,
        scaleFactor,
        scaleRatio: {
          actual: scaleFactor,
          drawing: exactRational(1),
        },
        unitConversion: {
          actualUnitInMillimetres,
          drawingUnitInMillimetres,
        },
      };
    }
  }
}

function invariant(
  id: RatioProportionScaleInvariantId,
  applicable: boolean,
  holds: boolean,
): RatioProportionScaleInvariantReceipt {
  if (!applicable) {
    return { applicable: false, holds: null, id, status: "not-applicable" };
  }
  if (!holds) {
    throw new RatioProportionScaleDomainError(
      "INTERNAL_INVARIANT_FAILURE",
      `${id} failed for a constructed ratio/proportion/scale state.`,
    );
  }
  return { applicable: true, holds: true, id, status: "pass" };
}

function buildInvariants(receipt: RatioProportionScaleVisibleReceipt) {
  const equivalentHolds =
    receipt.kind !== "equivalent-ratios" ||
    equal(
      receipt.crossProducts.firstASecondB,
      receipt.crossProducts.firstBSecondA,
    );
  const directHolds =
    receipt.kind !== "direct-proportion" ||
    (equal(receipt.constantK.first, receipt.constantK.second) &&
      equal(
        receipt.crossProducts.firstDependentSecondIndependent,
        receipt.crossProducts.firstIndependentSecondDependent,
      ));
  const inverseHolds =
    receipt.kind !== "inverse-proportion" ||
    equal(
      receipt.constantProductK.first,
      receipt.constantProductK.second,
    );
  const scaleHolds =
    receipt.kind !== "scale-drawing" ||
    equal(
      receipt.actualInDrawingUnits.length,
      receipt.reconstructionInDrawingUnits,
    );
  return [
    invariant(
      "equivalent-ratio-cross-products",
      receipt.kind === "equivalent-ratios",
      equivalentHolds,
    ),
    invariant(
      "direct-proportion-constant",
      receipt.kind === "direct-proportion",
      directHolds,
    ),
    invariant(
      "inverse-proportion-product",
      receipt.kind === "inverse-proportion",
      inverseHolds,
    ),
    invariant(
      "scale-drawing-unit-conversion",
      receipt.kind === "scale-drawing",
      scaleHolds,
    ),
  ];
}

export function resetRatioProportionScaleInput(
  mode: RatioProportionScaleMode,
): RatioProportionScaleInput {
  if (!isMode(mode)) {
    throw new RatioProportionScaleDomainError(
      "INVALID_MODE",
      `Unsupported ratio/proportion/scale mode ${String(mode)}.`,
    );
  }
  return inputSnapshot(RESET_INPUTS[mode]);
}

export function buildRatioProportionScaleState(
  rawInput: RatioProportionScaleInput,
): RatioProportionScaleState {
  const input = { ...rawInput };
  assertInput(input);
  const snapshot = inputSnapshot(input);
  const visibleReceipt = buildVisibleReceipt(snapshot);
  return deepFreeze({
    controls: {
      "drawing-length": snapshot.drawingLength,
      "ratio-a": snapshot.ratioA,
      "ratio-b": snapshot.ratioB,
      "scale-factor": snapshot.scaleFactor,
      units: { actual: snapshot.actualUnit, drawing: snapshot.drawingUnit },
    },
    family: RATIO_PROPORTION_SCALE_MODEL_CONTRACT.family,
    input: snapshot,
    invariants: buildInvariants(visibleReceipt),
    mode: snapshot.mode,
    scaleFactor: exactRational(snapshot.scaleFactor),
    version: RATIO_PROPORTION_SCALE_MODEL_CONTRACT.version,
    visibleReceipt,
  });
}
