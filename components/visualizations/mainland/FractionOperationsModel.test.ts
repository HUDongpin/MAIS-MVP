import assert from "node:assert/strict";
import test from "node:test";
import {
  FRACTION_ARITHMETIC_OPERATIONS,
  FRACTION_OPERATIONS_LAB_IDS,
  FRACTION_OPERATIONS_MODEL_CONTRACT,
  FRACTION_OPERATIONS_MODES,
  FRACTION_OPERATIONS_MODE_ALLOWLIST,
  FRACTION_OPERATIONS_RESET_INPUTS,
  FractionOperationsDomainError,
  buildFractionOperationsModel,
  buildFractionOperationsResetModel,
  isFractionOperationsLabId,
  type ExactFraction,
  type FractionArithmeticOperation,
  type FractionOperationsInput,
  type FractionOperationsLabId,
  type FractionOperationsMode,
  type FractionOperationsModel,
} from "./FractionOperationsModel";

const ALL_MODES_LAB = "pep-primary-p5-lower-factors-fractions" as const;
const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);

function absoluteBigInt(value: bigint) {
  return value < BIGINT_ZERO ? -value : value;
}

function gcd(left: bigint, right: bigint) {
  let a = absoluteBigInt(left);
  let b = absoluteBigInt(right);
  while (b !== BIGINT_ZERO) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a === BIGINT_ZERO ? BIGINT_ONE : a;
}

function expectedFraction(numerator: bigint, denominator: bigint) {
  assert.notEqual(denominator, BIGINT_ZERO);
  const sign = denominator < BIGINT_ZERO ? -BIGINT_ONE : BIGINT_ONE;
  const signedNumerator = numerator * sign;
  const positiveDenominator = absoluteBigInt(denominator);
  if (signedNumerator === BIGINT_ZERO) {
    return { numerator: 0, denominator: 1 };
  }
  const divisor = gcd(signedNumerator, positiveDenominator);
  return {
    numerator: Number(signedNumerator / divisor),
    denominator: Number(positiveDenominator / divisor),
  };
}

function expectedOperationResult(
  mode: Exclude<FractionOperationsMode, "estimate">,
  left: ExactFraction,
  right: ExactFraction,
) {
  const leftNumerator = BigInt(left.numerator);
  const leftDenominator = BigInt(left.denominator);
  const rightNumerator = BigInt(right.numerator);
  const rightDenominator = BigInt(right.denominator);

  if (mode === "equivalence" || mode === "simplify") {
    return expectedFraction(leftNumerator, leftDenominator);
  }
  if (mode === "compare" || mode === "subtract") {
    return expectedFraction(
      leftNumerator * rightDenominator -
        rightNumerator * leftDenominator,
      leftDenominator * rightDenominator,
    );
  }
  if (mode === "add") {
    return expectedFraction(
      leftNumerator * rightDenominator +
        rightNumerator * leftDenominator,
      leftDenominator * rightDenominator,
    );
  }
  if (mode === "multiply") {
    return expectedFraction(
      leftNumerator * rightNumerator,
      leftDenominator * rightDenominator,
    );
  }
  return expectedFraction(
    leftNumerator * rightDenominator,
    leftDenominator * rightNumerator,
  );
}

function assertFractionEqual(
  actual: Pick<ExactFraction, "denominator" | "numerator">,
  expected: { denominator: number; numerator: number },
  message?: string,
) {
  assert.deepEqual(
    { denominator: actual.denominator, numerator: actual.numerator },
    expected,
    message,
  );
}

function expectedProduct(
  left: Pick<ExactFraction, "denominator" | "numerator">,
  right: Pick<ExactFraction, "denominator" | "numerator">,
) {
  return expectedFraction(
    BigInt(left.numerator) * BigInt(right.numerator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function expectedQuotient(
  left: Pick<ExactFraction, "denominator" | "numerator">,
  right: Pick<ExactFraction, "denominator" | "numerator">,
) {
  return expectedFraction(
    BigInt(left.numerator) * BigInt(right.denominator),
    BigInt(left.denominator) * BigInt(right.numerator),
  );
}

function expectedMultiplicationApplicability(
  left: Pick<ExactFraction, "numerator">,
  right: Pick<ExactFraction, "numerator">,
) {
  return left.numerator < 0 || right.numerator < 0
    ? {
        reason: "signed-operands-require-sign-model" as const,
        status: "unsupported" as const,
      }
    : { status: "supported" as const };
}

function expectedMeasurementApplicability(
  left: Pick<ExactFraction, "numerator">,
  right: Pick<ExactFraction, "numerator">,
) {
  return left.numerator < 0 || right.numerator < 0
    ? {
        reason: "signed-operands-require-sign-model" as const,
        status: "unsupported" as const,
      }
    : { status: "supported" as const };
}

function expectedSharingApplicability(
  left: Pick<ExactFraction, "numerator">,
  right: Pick<ExactFraction, "denominator" | "numerator">,
) {
  if (left.numerator < 0 || right.numerator < 0) {
    return {
      reason: "signed-operands-require-sign-model" as const,
      status: "unsupported" as const,
    };
  }
  const normalizedGroupCount = expectedFraction(
    BigInt(right.numerator),
    BigInt(right.denominator),
  );
  return normalizedGroupCount.numerator > 0 &&
    normalizedGroupCount.denominator === 1
    ? { status: "supported" as const }
    : {
        reason: "sharing-requires-positive-integer-group-count" as const,
        status: "unsupported" as const,
      };
}

function assertPhysicalReceiptsIndependently(
  model: FractionOperationsModel,
  left: ExactFraction,
  right: ExactFraction,
  evaluatedOperation: Exclude<FractionOperationsMode, "estimate">,
) {
  if (evaluatedOperation === "multiply") {
    const receipt = model.operationInterpretation.multiplication;
    assert.ok(receipt, model.stateKey);
    const expected = expectedProduct(left, right);
    const expectedApplicability = expectedMultiplicationApplicability(
      left,
      right,
    );

    assert.deepEqual(receipt.area.applicability, expectedApplicability);
    assertFractionEqual(receipt.area.rowFactor, {
      denominator: left.denominator,
      numerator: left.numerator,
    });
    assertFractionEqual(receipt.area.columnFactor, {
      denominator: right.denominator,
      numerator: right.numerator,
    });
    assert.equal(receipt.area.rows, left.denominator);
    assert.equal(receipt.area.columns, right.denominator);
    assert.equal(receipt.area.selectedRows, Math.abs(left.numerator));
    assert.equal(receipt.area.selectedColumns, Math.abs(right.numerator));
    assert.equal(
      receipt.area.rowUnitCount,
      Math.max(1, Math.ceil(Math.abs(left.numerator) / left.denominator)),
    );
    assert.equal(
      receipt.area.columnUnitCount,
      Math.max(1, Math.ceil(Math.abs(right.numerator) / right.denominator)),
    );
    assert.equal(
      receipt.area.gridUnitCount,
      receipt.area.rowUnitCount * receipt.area.columnUnitCount,
    );
    assert.equal(
      receipt.area.cellsPerUnit,
      receipt.area.rows * receipt.area.columns,
    );
    assert.equal(
      receipt.area.overlapCells,
      receipt.area.selectedRows * receipt.area.selectedColumns,
    );
    assert.equal(
      receipt.area.totalGridCells,
      receipt.area.gridUnitCount * receipt.area.cellsPerUnit,
    );
    assert.ok(receipt.area.overlapCells <= receipt.area.totalGridCells);
    assert.equal(
      receipt.area.overlapCells,
      receipt.area.wholeUnits * receipt.area.cellsPerUnit +
        receipt.area.remainingCells,
    );
    assertFractionEqual(receipt.area.reconstructedProduct, expected);

    assert.deepEqual(receipt.repeatedGroup.applicability, expectedApplicability);
    assertFractionEqual(receipt.repeatedGroup.factor, {
      denominator: left.denominator,
      numerator: left.numerator,
    });
    assertFractionEqual(receipt.repeatedGroup.startingQuantity, {
      denominator: right.denominator,
      numerator: right.numerator,
    });
    assert.equal(
      receipt.repeatedGroup.partitionDenominator,
      left.denominator,
    );
    assert.equal(receipt.repeatedGroup.selectedCount, left.numerator);
    assertFractionEqual(
      receipt.repeatedGroup.partitionReconstructedStarting,
      expectedFraction(BigInt(right.numerator), BigInt(right.denominator)),
    );
    assertFractionEqual(
      expectedProduct(
        {
          denominator: 1,
          numerator: receipt.repeatedGroup.partitionDenominator,
        },
        receipt.repeatedGroup.unitShare,
      ),
      expectedFraction(BigInt(right.numerator), BigInt(right.denominator)),
    );
    assertFractionEqual(
      receipt.repeatedGroup.selectedReconstructedProduct,
      expected,
    );
    assertFractionEqual(
      expectedProduct(
        { denominator: 1, numerator: receipt.repeatedGroup.selectedCount },
        receipt.repeatedGroup.unitShare,
      ),
      expected,
    );

    assert.deepEqual(receipt.scaling.applicability, expectedApplicability);
    assertFractionEqual(
      expectedProduct(receipt.scaling.factor, receipt.scaling.startingValue),
      expected,
    );
    assertFractionEqual(receipt.scaling.product, expected);
    for (const id of [
      "fraction-multiplication-area-reconstruction",
      "fraction-multiplication-part-of-quantity-reconstruction",
      "fraction-multiplication-scaling-reconstruction",
    ]) {
      invariant(model, id);
    }
    return;
  }

  if (evaluatedOperation === "divide") {
    const receipt = model.operationInterpretation.division;
    assert.ok(receipt, model.stateKey);
    const expected = expectedQuotient(left, right);
    const expectedReciprocal = expectedFraction(
      BigInt(right.denominator),
      BigInt(right.numerator),
    );

    assertFractionEqual(receipt.quotient, expected);
    assertFractionEqual(receipt.reciprocal, expectedReciprocal);
    assertFractionEqual(receipt.reciprocalProduct, expected);
    assertFractionEqual(
      expectedProduct(right, receipt.reciprocal),
      { denominator: 1, numerator: 1 },
    );

    assert.deepEqual(
      receipt.measurement.applicability,
      expectedMeasurementApplicability(left, right),
    );
    assertFractionEqual(
      expectedProduct(
        receipt.measurement.numberOfGroups,
        receipt.measurement.unitSize,
      ),
      expectedFraction(BigInt(left.numerator), BigInt(left.denominator)),
    );

    assert.deepEqual(
      receipt.sharing.applicability,
      expectedSharingApplicability(left, right),
    );
    assertFractionEqual(
      expectedProduct(
        receipt.sharing.groupCount,
        receipt.sharing.sharePerGroup,
      ),
      expectedFraction(BigInt(left.numerator), BigInt(left.denominator)),
    );
    for (const id of [
      "fraction-division-reciprocal-reconstruction",
      "fraction-division-measurement-reconstruction",
      "fraction-division-sharing-reconstruction",
    ]) {
      invariant(model, id);
    }
  }
}

function assertDeepFrozen(value: unknown, path = "root"): void {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${path} is mutable`);
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      assertDeepFrozen(child, `${path}[${index}]`),
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${path}.${key}`);
  }
}

function assertJsonSafe(value: unknown, path = "root"): void {
  if (typeof value === "number") {
    assert.equal(Number.isSafeInteger(value), true, `${path}=${String(value)}`);
    assert.equal(Object.is(value, -0), false, `${path} is negative zero`);
    return;
  }
  assert.notEqual(typeof value, "bigint", `${path} contains bigint`);
  assert.notEqual(typeof value, "undefined", `${path} is undefined`);
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertJsonSafe(child, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      assertJsonSafe(child, `${path}.${key}`);
    }
  }
}

function invariant(model: FractionOperationsModel, id: string) {
  const receipt = model.invariantReceipts.find(
    (candidate) => candidate.id === id,
  );
  assert.ok(receipt, `${model.stateKey}: missing ${id}`);
  assert.equal(receipt.holds, true, `${model.stateKey}: ${id}`);
  return receipt;
}

function assertDomainError(
  input: FractionOperationsInput,
  code: FractionOperationsDomainError["code"],
) {
  assert.throws(
    () => buildFractionOperationsModel(input),
    (error: unknown) =>
      error instanceof FractionOperationsDomainError && error.code === code,
  );
}

test("publishes the exact G04 lab partition, eight-mode family, topic allowlists, and deterministic reset models", () => {
  assert.deepEqual(FRACTION_OPERATIONS_MODEL_CONTRACT, {
    family: "fraction-operations-v2",
    version: "fraction-operations-v2",
  });
  assert.deepEqual(FRACTION_OPERATIONS_LAB_IDS, [
    "bnu-primary-p5-lower-fraction-add-sub",
    "bnu-primary-p5-lower-fraction-division",
    "bnu-primary-p5-lower-fraction-multiplication",
    "hjb-primary-p5-lower-fractions-equivalence-operations",
    "pep-primary-p5-lower-factors-fractions",
  ]);
  assert.deepEqual(FRACTION_OPERATIONS_MODES, [
    "equivalence",
    "compare",
    "add",
    "subtract",
    "multiply",
    "divide",
    "simplify",
    "estimate",
  ]);
  assert.deepEqual(
    FRACTION_OPERATIONS_MODE_ALLOWLIST[
      "bnu-primary-p5-lower-fraction-add-sub"
    ],
    ["add", "subtract", "simplify", "estimate"],
  );
  assert.deepEqual(
    FRACTION_OPERATIONS_MODE_ALLOWLIST[
      "bnu-primary-p5-lower-fraction-division"
    ],
    ["divide", "simplify", "estimate"],
  );
  assert.deepEqual(
    FRACTION_OPERATIONS_MODE_ALLOWLIST[
      "bnu-primary-p5-lower-fraction-multiplication"
    ],
    ["multiply", "simplify", "estimate"],
  );

  for (const labId of FRACTION_OPERATIONS_LAB_IDS) {
    assert.equal(isFractionOperationsLabId(labId), true);
    const first = buildFractionOperationsResetModel(labId);
    const second = buildFractionOperationsModel(
      FRACTION_OPERATIONS_RESET_INPUTS[labId],
    );
    assert.deepEqual(first, second, labId);
    assert.notEqual(first, second, labId);
    assert.equal(first.labId, labId);
    assert.equal(
      first.invariantReceipts.length,
      first.operationInterpretation.multiplication ||
        first.operationInterpretation.division
        ? 10
        : 7,
    );
    assert.ok(first.invariantReceipts.every(({ holds }) => holds));
    assertDeepFrozen(first, labId);
  }
  assert.equal(isFractionOperationsLabId("fraction-bar"), false);
});

test("add, subtract, estimate, LCD, equivalent, GCF, and mixed-number receipts remain exact", () => {
  const addition = buildFractionOperationsModel({
    labId: "bnu-primary-p5-lower-fraction-add-sub",
    left: { numerator: 6, denominator: 8 },
    mode: "add",
    right: { numerator: 9, denominator: 12 },
  });
  assert.equal(addition.commonDenominator.leastCommonDenominator, 24);
  assert.deepEqual(addition.commonDenominator.left.converted, {
    denominator: 24,
    numerator: 18,
    text: "18/24",
  });
  assert.deepEqual(addition.commonDenominator.right.converted, {
    denominator: 24,
    numerator: 18,
    text: "18/24",
  });
  assert.deepEqual(addition.operation.unsimplifiedResult, {
    denominator: 24,
    numerator: 36,
    text: "36/24",
  });
  assert.deepEqual(addition.operation.exactResult, {
    denominator: 2,
    numerator: 3,
    text: "3/2",
  });
  assert.deepEqual(addition.operation.mixedResult, {
    denominator: 2,
    explicitWhole: false,
    numerator: 1,
    reconstructed: { denominator: 2, numerator: 3, text: "3/2" },
    sign: 1,
    text: "1 1/2",
    whole: 1,
  });
  assert.equal(addition.operation.resultSimplification.gcf, 12);
  assert.equal(addition.equationCheck.kind, "additive-inverse");

  const subtraction = buildFractionOperationsModel({
    labId: "bnu-primary-p5-lower-fraction-add-sub",
    left: { numerator: 7, denominator: 3 },
    mode: "subtract",
    right: { numerator: 1, denominator: 6 },
  });
  assertFractionEqual(subtraction.operation.exactResult, {
    numerator: 13,
    denominator: 6,
  });
  assert.equal(subtraction.operation.mixedResult.text, "2 1/6");
  assert.equal(subtraction.equationCheck.kind, "subtractive-inverse");

  const estimate = buildFractionOperationsModel({
    estimateOperation: "add",
    labId: "bnu-primary-p5-lower-fraction-add-sub",
    left: { numerator: 7, denominator: 4 },
    mode: "estimate",
    right: { numerator: 5, denominator: 6 },
  });
  assert.deepEqual(estimate.estimate, {
    absoluteError: { denominator: 12, numerator: 5, text: "5/12" },
    estimatedWhole: { denominator: 1, numerator: 3, text: "3" },
    evaluatedOperation: "add",
    exactResult: { denominator: 12, numerator: 31, text: "31/12" },
    lowerWhole: 2,
    roundingRule: "nearest-whole-half-away-from-zero",
    signedError: { denominator: 12, numerator: 5, text: "5/12" },
    upperWhole: 3,
  });
  assert.equal(
    estimate.equationCheck.kind,
    "estimate-error-reconstruction",
  );
  for (const id of [
    "fraction-common-denominator",
    "fraction-simplification",
    "fraction-whole-explicit",
  ]) {
    invariant(addition, id);
  }
});

test("equivalence, comparison, simplification, and explicit whole cases expose reconstructable receipts", () => {
  const equivalent = buildFractionOperationsModel({
    labId: "hjb-primary-p5-lower-fractions-equivalence-operations",
    left: { numerator: 6, denominator: 4 },
    mode: "equivalence",
    right: { numerator: 9, denominator: 6 },
  });
  assert.deepEqual(equivalent.operands.left.equivalent, {
    equivalent: { denominator: 8, numerator: 12, text: "12/8" },
    multiplier: 2,
    source: { denominator: 4, numerator: 6, text: "6/4" },
  });
  assert.equal(equivalent.comparison.symbol, "=");
  assert.deepEqual(
    [
      equivalent.comparison.leftCrossProduct,
      equivalent.comparison.rightCrossProduct,
    ],
    [36, 36],
  );
  assert.equal(equivalent.equationCheck.kind, "equivalent-expansion");

  const comparison = buildFractionOperationsModel({
    labId: ALL_MODES_LAB,
    left: { numerator: -5, denominator: 6 },
    mode: "compare",
    right: { numerator: -3, denominator: 4 },
  });
  assert.deepEqual(
    {
      leftCrossProduct: comparison.comparison.leftCrossProduct,
      relation: comparison.comparison.relation,
      rightCrossProduct: comparison.comparison.rightCrossProduct,
      symbol: comparison.comparison.symbol,
    },
    { leftCrossProduct: -20, relation: -1, rightCrossProduct: -18, symbol: "<" },
  );
  assertFractionEqual(comparison.operation.exactResult, {
    numerator: -1,
    denominator: 12,
  });

  const whole = buildFractionOperationsModel({
    labId: ALL_MODES_LAB,
    left: { numerator: -12, denominator: 6 },
    mode: "simplify",
    right: { numerator: 0, denominator: 9 },
  });
  assert.deepEqual(whole.operands.left.simplification.normalized, {
    denominator: 1,
    numerator: -2,
    text: "-2",
  });
  assert.equal(whole.operands.left.mixed.explicitWhole, true);
  assert.equal(whole.operands.left.mixed.text, "-2");
  assert.equal(whole.operands.right.mixed.explicitWhole, true);
  assert.equal(whole.operands.right.mixed.text, "0");
  assert.equal(whole.operation.mixedResult.text, "-2");
  invariant(whole, "fraction-whole-explicit");
});

test("multiplication exposes area, repeated-group, scaling, simplification, and equation reconstruction", () => {
  const model = buildFractionOperationsModel({
    labId: "bnu-primary-p5-lower-fraction-multiplication",
    left: { numerator: -3, denominator: 2 },
    mode: "multiply",
    right: { numerator: 4, denominator: 3 },
  });
  assertFractionEqual(model.operation.exactResult, {
    numerator: -2,
    denominator: 1,
  });
  assert.equal(model.operation.mixedResult.text, "-2");
  assert.equal(model.operation.mixedResult.explicitWhole, true);
  assert.deepEqual(model.operationInterpretation.multiplication, {
    area: {
      applicability: {
        reason: "signed-operands-require-sign-model",
        status: "unsupported",
      },
      cellsPerUnit: 6,
      columnFactor: { denominator: 3, numerator: 4, text: "4/3" },
      columnUnitCount: 2,
      columns: 3,
      gridUnitCount: 4,
      overlapCells: 12,
      reconstructedProduct: { denominator: 1, numerator: -2, text: "-2" },
      remainingCells: 0,
      resultSign: -1,
      rowFactor: { denominator: 2, numerator: -3, text: "-3/2" },
      rowUnitCount: 2,
      rows: 2,
      selectedColumns: 4,
      selectedRows: 3,
      totalGridCells: 24,
      wholeUnits: 2,
    },
    product: { denominator: 1, numerator: -2, text: "-2" },
    repeatedGroup: {
      applicability: {
        reason: "signed-operands-require-sign-model",
        status: "unsupported",
      },
      factor: { denominator: 2, numerator: -3, text: "-3/2" },
      groupCount: 3,
      groupValue: { denominator: 3, numerator: 2, text: "2/3" },
      partitionDenominator: 2,
      partitionReconstructedStarting: {
        denominator: 3,
        numerator: 4,
        text: "4/3",
      },
      reconstructedMagnitude: { denominator: 1, numerator: 2, text: "2" },
      resultSign: -1,
      selectedCount: -3,
      selectedReconstructedProduct: {
        denominator: 1,
        numerator: -2,
        text: "-2",
      },
      startingQuantity: { denominator: 3, numerator: 4, text: "4/3" },
      unitShare: { denominator: 3, numerator: 2, text: "2/3" },
    },
    scaling: {
      applicability: {
        reason: "signed-operands-require-sign-model",
        status: "unsupported",
      },
      factor: { denominator: 2, numerator: -3, text: "-3/2" },
      product: { denominator: 1, numerator: -2, text: "-2" },
      scaleDirection: "enlarge",
      signReversed: true,
      startingValue: { denominator: 3, numerator: 4, text: "4/3" },
    },
  });
  assert.equal(model.operationInterpretation.division, null);
  assert.equal(model.equationCheck.kind, "multiplication-forward");
  invariant(model, "fraction-operation-interpretation");
});

test("part-of-quantity keeps both source factors and independently reconstructs the partition and selected product", () => {
  const input = {
    labId: "bnu-primary-p5-lower-fraction-multiplication",
    left: { numerator: 6, denominator: 4 },
    mode: "multiply",
    right: { numerator: 10, denominator: 8 },
  } as const;
  const model = buildFractionOperationsModel(input);
  const receipt = model.operationInterpretation.multiplication?.repeatedGroup;
  assert.ok(receipt);

  assert.deepEqual(receipt.factor, {
    denominator: 4,
    numerator: 6,
    text: "6/4",
  });
  assert.deepEqual(receipt.startingQuantity, {
    denominator: 8,
    numerator: 10,
    text: "10/8",
  });
  assert.equal(receipt.partitionDenominator, 4);
  assert.equal(receipt.selectedCount, 6);
  assert.deepEqual(receipt.unitShare, {
    denominator: 16,
    numerator: 5,
    text: "5/16",
  });
  assertFractionEqual(
    expectedProduct(
      { denominator: 1, numerator: receipt.partitionDenominator },
      receipt.unitShare,
    ),
    expectedFraction(BigInt(10), BigInt(8)),
  );
  assertFractionEqual(
    expectedProduct(
      { denominator: 1, numerator: receipt.selectedCount },
      receipt.unitShare,
    ),
    expectedFraction(BigInt(6) * BigInt(10), BigInt(4) * BigInt(8)),
  );
  assertFractionEqual(
    receipt.partitionReconstructedStarting,
    expectedFraction(BigInt(10), BigInt(8)),
  );
  assertFractionEqual(
    receipt.selectedReconstructedProduct,
    expectedFraction(BigInt(60), BigInt(32)),
  );
  assert.notDeepEqual(receipt.factor, { denominator: 1, numerator: 1 });
  assertPhysicalReceiptsIndependently(
    model,
    { ...input.left, text: "6/4" },
    { ...input.right, text: "10/8" },
    "multiply",
  );
});

test("multi-unit area grid is source-faithful for proper, improper, zero, and signed products", () => {
  const cases = [
    {
      applicability: { status: "supported" },
      columns: 3,
      gridUnitCount: 1,
      left: { denominator: 4, numerator: 3, text: "3/4" },
      overlapCells: 6,
      remainingCells: 6,
      right: { denominator: 3, numerator: 2, text: "2/3" },
      rowUnitCount: 1,
      rows: 4,
      selectedColumns: 2,
      selectedRows: 3,
      wholeUnits: 0,
    },
    {
      applicability: { status: "supported" },
      columns: 3,
      gridUnitCount: 4,
      left: { denominator: 4, numerator: 7, text: "7/4" },
      overlapCells: 35,
      remainingCells: 11,
      right: { denominator: 3, numerator: 5, text: "5/3" },
      rowUnitCount: 2,
      rows: 4,
      selectedColumns: 5,
      selectedRows: 7,
      wholeUnits: 2,
    },
    {
      applicability: { status: "supported" },
      columns: 3,
      gridUnitCount: 2,
      left: { denominator: 4, numerator: 0, text: "0/4" },
      overlapCells: 0,
      remainingCells: 0,
      right: { denominator: 3, numerator: 5, text: "5/3" },
      rowUnitCount: 1,
      rows: 4,
      selectedColumns: 5,
      selectedRows: 0,
      wholeUnits: 0,
    },
    {
      applicability: {
        reason: "signed-operands-require-sign-model",
        status: "unsupported",
      },
      columns: 3,
      gridUnitCount: 1,
      left: { denominator: 4, numerator: -3, text: "-3/4" },
      overlapCells: 6,
      remainingCells: 6,
      right: { denominator: 3, numerator: 2, text: "2/3" },
      rowUnitCount: 1,
      rows: 4,
      selectedColumns: 2,
      selectedRows: 3,
      wholeUnits: 0,
    },
  ] as const;

  for (const expected of cases) {
    const model = buildFractionOperationsModel({
      labId: "bnu-primary-p5-lower-fraction-multiplication",
      left: expected.left,
      mode: "multiply",
      right: expected.right,
    });
    const area = model.operationInterpretation.multiplication?.area;
    assert.ok(area);
    assert.deepEqual(area.applicability, expected.applicability);
    assert.equal(area.rows, expected.rows);
    assert.equal(area.columns, expected.columns);
    assert.equal(area.selectedRows, expected.selectedRows);
    assert.equal(area.selectedColumns, expected.selectedColumns);
    assert.equal(area.rowUnitCount, expected.rowUnitCount);
    assert.equal(area.gridUnitCount, expected.gridUnitCount);
    assert.equal(area.cellsPerUnit, expected.rows * expected.columns);
    assert.equal(area.overlapCells, expected.overlapCells);
    assert.equal(area.wholeUnits, expected.wholeUnits);
    assert.equal(area.remainingCells, expected.remainingCells);
    assert.equal(
      area.totalGridCells,
      area.gridUnitCount * area.cellsPerUnit,
    );
    assertFractionEqual(
      area.reconstructedProduct,
      expectedProduct(expected.left, expected.right),
    );
    assertPhysicalReceiptsIndependently(
      model,
      expected.left,
      expected.right,
      "multiply",
    );
  }
});

test("division exposes reciprocal, measurement, sharing, and inverse equation receipts", () => {
  const model = buildFractionOperationsModel({
    labId: "bnu-primary-p5-lower-fraction-division",
    left: { numerator: 7, denominator: 4 },
    mode: "divide",
    right: { numerator: -5, denominator: 6 },
  });
  assertFractionEqual(model.operation.exactResult, {
    numerator: -21,
    denominator: 10,
  });
  assert.deepEqual(model.operationInterpretation.division, {
    measurement: {
      applicability: {
        reason: "signed-operands-require-sign-model",
        status: "unsupported",
      },
      available: { denominator: 4, numerator: 7, text: "7/4" },
      numberOfGroups: { denominator: 10, numerator: -21, text: "-21/10" },
      unitSize: { denominator: 6, numerator: -5, text: "-5/6" },
    },
    quotient: { denominator: 10, numerator: -21, text: "-21/10" },
    reciprocal: { denominator: 5, numerator: -6, text: "-6/5" },
    reciprocalProduct: {
      denominator: 10,
      numerator: -21,
      text: "-21/10",
    },
    sharing: {
      applicability: {
        reason: "signed-operands-require-sign-model",
        status: "unsupported",
      },
      groupCount: { denominator: 6, numerator: -5, text: "-5/6" },
      sharePerGroup: { denominator: 10, numerator: -21, text: "-21/10" },
      total: { denominator: 4, numerator: 7, text: "7/4" },
    },
  });
  assert.equal(model.operationInterpretation.multiplication, null);
  assert.equal(model.equationCheck.kind, "division-inverse");
  assertFractionEqual(model.equationCheck.leftSide, {
    numerator: 7,
    denominator: 4,
  });
  assertFractionEqual(model.equationCheck.rightSide, {
    numerator: 7,
    denominator: 4,
  });
  invariant(model, "fraction-operation-interpretation");
});

test("scaling, reciprocal, measurement, and sharing receipts pass an independent applicability and reconstruction oracle", () => {
  const multiplicationCases = [
    {
      left: { denominator: 4, numerator: 3, text: "3/4" },
      right: { denominator: 3, numerator: 2, text: "2/3" },
    },
    {
      left: { denominator: 4, numerator: 7, text: "7/4" },
      right: { denominator: 3, numerator: 5, text: "5/3" },
    },
    {
      left: { denominator: 4, numerator: 0, text: "0/4" },
      right: { denominator: 3, numerator: 5, text: "5/3" },
    },
    {
      left: { denominator: 4, numerator: 3, text: "3/4" },
      right: { denominator: 3, numerator: -2, text: "-2/3" },
    },
  ];
  for (const input of multiplicationCases) {
    const model = buildFractionOperationsModel({
      labId: "bnu-primary-p5-lower-fraction-multiplication",
      left: input.left,
      mode: "multiply",
      right: input.right,
    });
    assertPhysicalReceiptsIndependently(
      model,
      input.left,
      input.right,
      "multiply",
    );
  }

  const divisionCases = [
    {
      left: { denominator: 4, numerator: 7, text: "7/4" },
      right: { denominator: 3, numerator: 2, text: "2/3" },
    },
    {
      left: { denominator: 4, numerator: 7, text: "7/4" },
      right: { denominator: 2, numerator: 6, text: "6/2" },
    },
    {
      left: { denominator: 4, numerator: 0, text: "0/4" },
      right: { denominator: 1, numerator: 3, text: "3" },
    },
    {
      left: { denominator: 4, numerator: -7, text: "-7/4" },
      right: { denominator: 1, numerator: 3, text: "3" },
    },
    {
      left: { denominator: 4, numerator: 7, text: "7/4" },
      right: { denominator: 3, numerator: -2, text: "-2/3" },
    },
  ];
  for (const input of divisionCases) {
    const model = buildFractionOperationsModel({
      labId: "bnu-primary-p5-lower-fraction-division",
      left: input.left,
      mode: "divide",
      right: input.right,
    });
    assertPhysicalReceiptsIndependently(
      model,
      input.left,
      input.right,
      "divide",
    );
  }
});

test("typed visible receipts isolate equivalence from an unrelated right operand and separate comparison relation from signed gap", () => {
  const firstEquivalent = buildFractionOperationsModel({
    labId: "hjb-primary-p5-lower-fractions-equivalence-operations",
    left: { numerator: 7, denominator: 4 },
    mode: "equivalence",
    right: { numerator: 5, denominator: 6 },
  });
  const secondEquivalent = buildFractionOperationsModel({
    labId: "hjb-primary-p5-lower-fractions-equivalence-operations",
    left: { numerator: 7, denominator: 4 },
    mode: "equivalence",
    right: { numerator: -11, denominator: 9 },
  });

  assert.deepEqual(firstEquivalent.visibleReceipt, secondEquivalent.visibleReceipt);
  assert.deepEqual(firstEquivalent.visibleReceipt, {
    exactResult: { denominator: 4, numerator: 7, text: "7/4" },
    expansion: {
      denominator: { factor: 2, product: 8, source: 4 },
      numerator: { factor: 2, product: 14, source: 7 },
    },
    expanded: { denominator: 8, numerator: 14, text: "14/8" },
    kind: "equivalence",
    mode: "equivalence",
    source: { denominator: 4, numerator: 7, text: "7/4" },
  });
  assert.equal("right" in firstEquivalent.visibleReceipt, false);
  assert.equal("operator" in firstEquivalent.visibleReceipt, false);

  const comparison = buildFractionOperationsModel({
    labId: ALL_MODES_LAB,
    left: { numerator: -5, denominator: 6 },
    mode: "compare",
    right: { numerator: -3, denominator: 4 },
  });
  assert.deepEqual(comparison.visibleReceipt, {
    kind: "comparison",
    mode: "compare",
    relation: {
      left: { denominator: 6, numerator: -5, text: "-5/6" },
      leftCrossProduct: -20,
      right: { denominator: 4, numerator: -3, text: "-3/4" },
      rightCrossProduct: -18,
      symbol: "<",
    },
    signedGap: {
      exact: { denominator: 12, numerator: -1, text: "-1/12" },
      unsimplified: { denominator: 12, numerator: -1, text: "-1/12" },
    },
  });
  assert.equal("operator" in comparison.visibleReceipt, false);
  assert.equal("result" in comparison.visibleReceipt.relation, false);
});

test("typed simplification receipt divides numerator and denominator separately and never encodes division by g or g over g", () => {
  const model = buildFractionOperationsModel({
    labId: ALL_MODES_LAB,
    left: { numerator: 12, denominator: 8 },
    mode: "simplify",
    right: { numerator: -17, denominator: 9 },
  });

  assert.deepEqual(model.visibleReceipt, {
    denominatorDivision: { dividend: 8, divisor: 4, quotient: 2 },
    gcf: 4,
    kind: "simplification",
    mode: "simplify",
    numeratorDivision: { dividend: 12, divisor: 4, quotient: 3 },
    simplified: { denominator: 2, numerator: 3, text: "3/2" },
    source: { denominator: 8, numerator: 12, text: "12/8" },
  });
  assert.equal(
    model.visibleReceipt.numeratorDivision.dividend,
    model.visibleReceipt.numeratorDivision.divisor *
      model.visibleReceipt.numeratorDivision.quotient,
  );
  assert.equal(
    model.visibleReceipt.denominatorDivision.dividend,
    model.visibleReceipt.denominatorDivision.divisor *
      model.visibleReceipt.denominatorDivision.quotient,
  );
  assert.doesNotMatch(JSON.stringify(model.visibleReceipt), /÷|gcf\s*\/\s*gcf/iu);
});

test("typed arithmetic and estimate visible receipts preserve the requested mode and exact equation", () => {
  const addition = buildFractionOperationsModel({
    labId: ALL_MODES_LAB,
    left: { numerator: 1, denominator: 2 },
    mode: "add",
    right: { numerator: 1, denominator: 3 },
  });
  assert.deepEqual(addition.visibleReceipt, {
    equation: {
      exactResult: { denominator: 6, numerator: 5, text: "5/6" },
      left: { denominator: 2, numerator: 1, text: "1/2" },
      operator: "+",
      right: { denominator: 3, numerator: 1, text: "1/3" },
      unsimplifiedResult: { denominator: 6, numerator: 5, text: "5/6" },
    },
    kind: "arithmetic",
    mode: "add",
  });

  const estimate = buildFractionOperationsModel({
    estimateOperation: "multiply",
    labId: ALL_MODES_LAB,
    left: { numerator: 3, denominator: 2 },
    mode: "estimate",
    right: { numerator: 2, denominator: 3 },
  });
  assert.equal(estimate.visibleReceipt.kind, "estimate");
  assert.equal(estimate.visibleReceipt.mode, "estimate");
  if (estimate.visibleReceipt.kind !== "estimate") {
    assert.fail("estimate mode must expose an estimate visible receipt");
  }
  assert.equal(estimate.visibleReceipt.evaluatedOperation, "multiply");
  assert.deepEqual(estimate.visibleReceipt.equation, {
    exactResult: { denominator: 1, numerator: 1, text: "1" },
    left: { denominator: 2, numerator: 3, text: "3/2" },
    operator: "x",
    right: { denominator: 3, numerator: 2, text: "2/3" },
    unsimplifiedResult: { denominator: 6, numerator: 6, text: "6/6" },
  });
  assert.deepEqual(estimate.visibleReceipt.estimate, estimate.estimate);
});

test("physical interpretations declare signed states unsupported and sharing only supports a positive integer group count", () => {
  const signedMultiplication = buildFractionOperationsModel({
    labId: "bnu-primary-p5-lower-fraction-multiplication",
    left: { numerator: -3, denominator: 2 },
    mode: "multiply",
    right: { numerator: 4, denominator: 3 },
  }).operationInterpretation.multiplication;
  assert.ok(signedMultiplication);
  for (const interpretation of [
    signedMultiplication.area,
    signedMultiplication.repeatedGroup,
    signedMultiplication.scaling,
  ]) {
    assert.deepEqual(interpretation.applicability, {
      reason: "signed-operands-require-sign-model",
      status: "unsupported",
    });
  }

  const positiveMultiplication = buildFractionOperationsModel({
    labId: "bnu-primary-p5-lower-fraction-multiplication",
    left: { numerator: 3, denominator: 4 },
    mode: "multiply",
    right: { numerator: 2, denominator: 3 },
  }).operationInterpretation.multiplication;
  assert.ok(positiveMultiplication);
  assert.deepEqual(positiveMultiplication.area.applicability, {
    status: "supported",
  });
  assert.deepEqual(positiveMultiplication.repeatedGroup.applicability, {
    status: "supported",
  });
  assert.deepEqual(positiveMultiplication.scaling.applicability, {
    status: "supported",
  });

  const fractionalDivisor = buildFractionOperationsModel({
    labId: "bnu-primary-p5-lower-fraction-division",
    left: { numerator: 7, denominator: 4 },
    mode: "divide",
    right: { numerator: 2, denominator: 3 },
  }).operationInterpretation.division;
  assert.ok(fractionalDivisor);
  assert.deepEqual(fractionalDivisor.measurement.applicability, {
    status: "supported",
  });
  assert.deepEqual(fractionalDivisor.sharing.applicability, {
    reason: "sharing-requires-positive-integer-group-count",
    status: "unsupported",
  });

  const integerDivisor = buildFractionOperationsModel({
    labId: "bnu-primary-p5-lower-fraction-division",
    left: { numerator: 7, denominator: 4 },
    mode: "divide",
    right: { numerator: 3, denominator: 1 },
  }).operationInterpretation.division;
  assert.ok(integerDivisor);
  assert.deepEqual(integerDivisor.sharing.applicability, {
    status: "supported",
  });

  const signedDivisor = buildFractionOperationsModel({
    labId: "bnu-primary-p5-lower-fraction-division",
    left: { numerator: 7, denominator: 4 },
    mode: "divide",
    right: { numerator: -5, denominator: 6 },
  }).operationInterpretation.division;
  assert.ok(signedDivisor);
  assert.deepEqual(signedDivisor.measurement.applicability, {
    reason: "signed-operands-require-sign-model",
    status: "unsupported",
  });
  assert.deepEqual(signedDivisor.sharing.applicability, {
    reason: "signed-operands-require-sign-model",
    status: "unsupported",
  });
});

test("equation checks expose stable semantic reconstruction ids instead of English learner prose", () => {
  const expectedIds = {
    add: "fraction-equation.additive-inverse",
    compare: "fraction-equation.comparison-difference",
    divide: "fraction-equation.division-inverse",
    equivalence: "fraction-equation.equivalent-expansion",
    multiply: "fraction-equation.multiplication-forward",
    simplify: "fraction-equation.simplification-equivalence",
    subtract: "fraction-equation.subtractive-inverse",
  } as const;

  for (const mode of [
    "equivalence",
    "compare",
    "add",
    "subtract",
    "multiply",
    "divide",
    "simplify",
  ] as const) {
    const model = buildFractionOperationsModel({
      labId: ALL_MODES_LAB,
      left: { numerator: 7, denominator: 4 },
      mode,
      right: { numerator: 5, denominator: 6 },
    });
    assert.equal(model.equationCheck.reconstructionId, expectedIds[mode]);
    assert.equal(model.equationCheck.reconstruction, expectedIds[mode]);
    assert.match(model.equationCheck.reconstructionId, /^fraction-equation\.[a-z-]+$/u);
    assert.doesNotMatch(model.equationCheck.reconstructionId, /\s/u);
  }

  const estimate = buildFractionOperationsModel({
    estimateOperation: "add",
    labId: ALL_MODES_LAB,
    left: { numerator: 7, denominator: 4 },
    mode: "estimate",
    right: { numerator: 5, denominator: 6 },
  });
  assert.equal(
    estimate.equationCheck.reconstructionId,
    "fraction-equation.estimate-error-reconstruction",
  );
  assert.equal(
    estimate.equationCheck.reconstruction,
    estimate.equationCheck.reconstructionId,
  );
});

test("bounded signed exhaustive matrix preserves every mode, operation, invariant, and JSON-safe exact result", () => {
  const fractions: ExactFraction[] = [];
  for (let denominator = 1; denominator <= 5; denominator += 1) {
    for (let numerator = -5; numerator <= 5; numerator += 1) {
      fractions.push({
        denominator,
        numerator,
        text: denominator === 1 ? String(numerator) : `${numerator}/${denominator}`,
      });
    }
  }

  let validModels = 0;
  let expectedDivisionByZero = 0;
  const observedModes = new Set<FractionOperationsMode>();
  const observedEstimateOperations = new Set<FractionArithmeticOperation>();

  for (const left of fractions) {
    for (const right of fractions) {
      for (const mode of FRACTION_OPERATIONS_MODES) {
        const estimateOperations =
          mode === "estimate" ? FRACTION_ARITHMETIC_OPERATIONS : [null];
        for (const estimateOperation of estimateOperations) {
          const evaluatedOperation =
            mode === "estimate" ? estimateOperation : mode;
          const input: FractionOperationsInput = {
            ...(estimateOperation
              ? { estimateOperation: estimateOperation as FractionArithmeticOperation }
              : {}),
            labId: ALL_MODES_LAB,
            left: {
              denominator: left.denominator,
              numerator: left.numerator,
            },
            mode,
            right: {
              denominator: right.denominator,
              numerator: right.numerator,
            },
          };
          if (evaluatedOperation === "divide" && right.numerator === 0) {
            assertDomainError(input, "DIVISION_BY_ZERO");
            expectedDivisionByZero += 1;
            continue;
          }

          const model = buildFractionOperationsModel(input);
          const expected = expectedOperationResult(
            evaluatedOperation as Exclude<FractionOperationsMode, "estimate">,
            left,
            right,
          );
          assertFractionEqual(model.operation.exactResult, expected, model.stateKey);
          assertPhysicalReceiptsIndependently(
            model,
            left,
            right,
            evaluatedOperation as Exclude<FractionOperationsMode, "estimate">,
          );
          assert.equal(
            model.invariantReceipts.length,
            evaluatedOperation === "multiply" || evaluatedOperation === "divide"
              ? 10
              : 7,
            model.stateKey,
          );
          assert.ok(
            model.invariantReceipts.every(({ holds }) => holds),
            model.stateKey,
          );
          assert.equal(
            model.commonDenominator.left.converted.denominator,
            model.commonDenominator.right.converted.denominator,
            model.stateKey,
          );
          assert.equal(
            Math.sign(
              model.comparison.leftCrossProduct -
                model.comparison.rightCrossProduct,
            ),
            model.comparison.relation,
            model.stateKey,
          );
          assert.doesNotMatch(JSON.stringify(model), /NaN|Infinity/u);
          assertJsonSafe(model);
          assert.equal(Object.isFrozen(model), true);
          observedModes.add(mode);
          if (estimateOperation) observedEstimateOperations.add(estimateOperation);
          validModels += 1;
        }
      }
    }
  }

  assert.deepEqual([...observedModes], [...FRACTION_OPERATIONS_MODES]);
  assert.deepEqual(
    [...observedEstimateOperations],
    [...FRACTION_ARITHMETIC_OPERATIONS],
  );
  assert.equal(validModels, 32_725);
  assert.equal(expectedDivisionByZero, 550);
  assert.equal(validModels + expectedDivisionByZero, 33_275);
});

test("mode isolation and every invalid numeric boundary fail closed without silent clamping", () => {
  const base: FractionOperationsInput = {
    labId: ALL_MODES_LAB,
    left: { numerator: 1, denominator: 2 },
    mode: "add",
    right: { numerator: 1, denominator: 3 },
  };
  assertDomainError(
    { ...base, labId: "fraction-bar" as FractionOperationsLabId },
    "INVALID_LAB_ID",
  );
  assertDomainError(
    { ...base, mode: "default" as FractionOperationsMode },
    "INVALID_MODE",
  );
  assertDomainError(
    {
      ...base,
      labId: "bnu-primary-p5-lower-fraction-division",
      mode: "multiply",
    },
    "MODE_NOT_ALLOWED",
  );
  assertDomainError(
    { ...base, left: { numerator: Number.NaN, denominator: 2 } },
    "NON_FINITE_INTEGER",
  );
  assertDomainError(
    { ...base, left: { numerator: Number.POSITIVE_INFINITY, denominator: 2 } },
    "NON_FINITE_INTEGER",
  );
  assertDomainError(
    { ...base, left: { numerator: 1.25, denominator: 2 } },
    "NON_INTEGER",
  );
  assertDomainError(
    {
      ...base,
      left: { numerator: Number.MAX_SAFE_INTEGER + 1, denominator: 2 },
    },
    "UNSAFE_INTEGER",
  );
  assertDomainError(
    { ...base, left: { numerator: 1, denominator: 0 } },
    "DENOMINATOR_NON_POSITIVE",
  );
  assertDomainError(
    { ...base, left: { numerator: 1, denominator: -2 } },
    "DENOMINATOR_NON_POSITIVE",
  );
  assertDomainError(
    {
      ...base,
      mode: "divide",
      right: { numerator: 0, denominator: 3 },
    },
    "DIVISION_BY_ZERO",
  );
  assertDomainError(
    { ...base, mode: "estimate" },
    "INVALID_ESTIMATE_OPERATION",
  );
  assertDomainError(
    { ...base, estimateOperation: "multiply" },
    "INVALID_ESTIMATE_OPERATION",
  );
  assertDomainError(
    {
      ...base,
      estimateOperation: "multiply",
      labId: "bnu-primary-p5-lower-fraction-add-sub",
      mode: "estimate",
    },
    "ESTIMATE_OPERATION_NOT_ALLOWED",
  );
  assertDomainError(
    {
      ...base,
      left: { numerator: Number.MAX_SAFE_INTEGER, denominator: 1 },
      mode: "multiply",
      right: { numerator: 2, denominator: 1 },
    },
    "UNSAFE_RESULT",
  );
});

test("model construction is deterministic, input-preserving, deeply frozen, and round-trip JSON safe", () => {
  const input: FractionOperationsInput = {
    estimateOperation: "subtract",
    labId: ALL_MODES_LAB,
    left: { numerator: -17, denominator: 6 },
    mode: "estimate",
    right: { numerator: 5, denominator: 8 },
  };
  const before = structuredClone(input);
  const first = buildFractionOperationsModel(input);
  const second = buildFractionOperationsModel(structuredClone(input));

  assert.deepEqual(input, before);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.equal(first.stateKey, second.stateKey);
  assert.equal(
    first.stateKey,
    "fraction-operations-v2|lab=pep-primary-p5-lower-factors-fractions|mode=estimate|evaluated=subtract|left=-17/6|right=5/8|result=-83/24",
  );
  assertDeepFrozen(first);
  assertJsonSafe(first);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
});
