import assert from "node:assert/strict";
import test from "node:test";
import {
  MULTI_DIGIT_OPERATIONS_DOMAIN,
  MULTI_DIGIT_OPERATIONS_MODEL_VERSION,
  MULTI_DIGIT_OPERATIONS_RESET_INPUT,
  MultiDigitOperationsDomainError,
  buildMultiDigitOperationsModel,
  buildMultiDigitOperationsResetState,
  type MultiDigitOperationsInput,
  type MultiDigitOperationsModel,
} from "./MultiDigitOperationsModel";

function invariant(model: MultiDigitOperationsModel, id: string) {
  const receipt = model.invariantReceipts.find(
    (candidate) => candidate.id === id,
  );
  assert.ok(receipt, `${model.stateKey}: missing invariant ${id}`);
  assert.equal(receipt.passed, true, `${model.stateKey}: ${id}`);
  return receipt;
}

function wholeResult(model: MultiDigitOperationsModel): number {
  assert.equal(model.result.kind, "whole", model.stateKey);
  if (model.result.kind !== "whole") throw new Error("unreachable");
  return model.result.value;
}

function assertDomainError(
  input: MultiDigitOperationsInput,
  code: MultiDigitOperationsDomainError["code"],
) {
  assert.throws(
    () => buildMultiDigitOperationsModel(input),
    (error: unknown) =>
      error instanceof MultiDigitOperationsDomainError && error.code === code,
  );
}

function assertEveryNumberIsASafeInteger(value: unknown, path = "root"): void {
  if (typeof value === "number") {
    assert.equal(
      Number.isSafeInteger(value),
      true,
      `${path}: ${String(value)}`,
    );
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertEveryNumberIsASafeInteger(item, `${path}[${index}]`),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertEveryNumberIsASafeInteger(item, `${path}.${key}`);
    }
  }
}

test("reset is a stable exact multiplication state with place values, partial products, and carries", () => {
  assert.equal(
    MULTI_DIGIT_OPERATIONS_MODEL_VERSION,
    "multi-digit-operations-v1",
  );
  assert.deepEqual(MULTI_DIGIT_OPERATIONS_RESET_INPUT, {
    operation: "multiply",
    left: 347,
    right: 26,
  });

  const reset = buildMultiDigitOperationsResetState();
  const rebuilt = buildMultiDigitOperationsModel(
    MULTI_DIGIT_OPERATIONS_RESET_INPUT,
  );
  assert.deepEqual(reset, rebuilt);
  assert.notEqual(reset, rebuilt);
  assert.equal(wholeResult(reset), 9022);
  assert.match(
    reset.stateKey,
    /^multi-digit-operations-v1\|operation=multiply\|/u,
  );
  assert.deepEqual(
    reset.placeValues.left.map(({ place, digit, contribution }) => [
      place,
      digit,
      contribution,
    ]),
    [
      [1, 7, 7],
      [10, 4, 40],
      [100, 3, 300],
    ],
  );
  assert.equal(reset.algorithm.kind, "multiplication");
  if (reset.algorithm.kind !== "multiplication") throw new Error("unreachable");
  assert.deepEqual(
    reset.algorithm.partialProducts.map(
      ({ multiplierPlace, multiplierDigit, partialProduct }) => [
        multiplierPlace,
        multiplierDigit,
        partialProduct,
      ],
    ),
    [
      [1, 6, 2082],
      [10, 2, 6940],
    ],
  );
  invariant(reset, "place-value-reconstruction:left");
  invariant(reset, "place-value-reconstruction:right");
  invariant(reset, "place-value-reconstruction:result");
  invariant(reset, "partial-products-sum");
  invariant(reset, "multiplication-carry-reconstruction");
});

test("addition exhaustively reconstructs every 0..99 pair and its carry chain", () => {
  for (let left = 0; left <= 99; left += 1) {
    for (let right = 0; right <= 99; right += 1) {
      const model = buildMultiDigitOperationsModel({
        operation: "add",
        left,
        right,
      });
      assert.equal(wholeResult(model), left + right, model.stateKey);
      assert.equal(model.algorithm.kind, "addition", model.stateKey);
      invariant(model, "addition-carry-reconstruction");
      invariant(model, "place-value-reconstruction:result");
      assertEveryNumberIsASafeInteger(model);
    }
  }

  const chain = buildMultiDigitOperationsModel({
    operation: "add",
    left: 999_999,
    right: 1,
  });
  assert.equal(wholeResult(chain), 1_000_000);
  assert.equal(chain.algorithm.kind, "addition");
  if (chain.algorithm.kind !== "addition") throw new Error("unreachable");
  assert.deepEqual(
    chain.algorithm.columns.map(({ carryOut }) => carryOut),
    [1, 1, 1, 1, 1, 1, 0],
  );
});

test("subtraction exhaustively reconstructs every nonnegative 0..99 difference and borrow chain", () => {
  for (let left = 0; left <= 99; left += 1) {
    for (let right = 0; right <= left; right += 1) {
      const model = buildMultiDigitOperationsModel({
        operation: "subtract",
        left,
        right,
      });
      assert.equal(wholeResult(model), left - right, model.stateKey);
      assert.equal(model.algorithm.kind, "subtraction", model.stateKey);
      invariant(model, "subtraction-borrow-reconstruction");
      invariant(model, "place-value-reconstruction:result");
      assertEveryNumberIsASafeInteger(model);
    }
  }

  const chain = buildMultiDigitOperationsModel({
    operation: "subtract",
    left: 100_000,
    right: 1,
  });
  assert.equal(wholeResult(chain), 99_999);
  assert.equal(chain.algorithm.kind, "subtraction");
  if (chain.algorithm.kind !== "subtraction") throw new Error("unreachable");
  assert.deepEqual(
    chain.algorithm.columns.map(({ borrowOut }) => borrowOut),
    [1, 1, 1, 1, 1, 0],
  );
});

test("multiplication exhaustively preserves every 0..99 partial-product and digit-carry receipt", () => {
  for (let left = 0; left <= 99; left += 1) {
    for (let right = 0; right <= 99; right += 1) {
      const model = buildMultiDigitOperationsModel({
        operation: "multiply",
        left,
        right,
      });
      assert.equal(wholeResult(model), left * right, model.stateKey);
      assert.equal(model.algorithm.kind, "multiplication", model.stateKey);
      if (model.algorithm.kind !== "multiplication")
        throw new Error("unreachable");
      assert.equal(
        model.algorithm.partialProducts.reduce(
          (sum, receipt) => sum + receipt.partialProduct,
          0,
        ),
        left * right,
        model.stateKey,
      );
      invariant(model, "partial-products-sum");
      invariant(model, "multiplication-carry-reconstruction");
      assertEveryNumberIsASafeInteger(model);
    }
  }

  const internalZero = buildMultiDigitOperationsModel({
    operation: "multiply",
    left: 105,
    right: 20,
  });
  assert.equal(internalZero.algorithm.kind, "multiplication");
  if (internalZero.algorithm.kind !== "multiplication")
    throw new Error("unreachable");
  assert.deepEqual(
    internalZero.algorithm.partialProducts.map(
      ({ multiplierDigit, partialProduct }) => [
        multiplierDigit,
        partialProduct,
      ],
    ),
    [
      [0, 0],
      [2, 2100],
    ],
  );
});

test("division exhaustively preserves quotient, partial quotients, reconstruction, and remainder bound", () => {
  for (let dividend = 0; dividend <= 499; dividend += 1) {
    for (let divisor = 1; divisor <= 50; divisor += 1) {
      const model = buildMultiDigitOperationsModel({
        operation: "divide",
        left: dividend,
        right: divisor,
      });
      assert.equal(model.result.kind, "division", model.stateKey);
      if (model.result.kind !== "division") throw new Error("unreachable");
      assert.equal(
        model.result.quotient,
        Math.floor(dividend / divisor),
        model.stateKey,
      );
      assert.equal(model.result.remainder, dividend % divisor, model.stateKey);
      assert.equal(
        divisor * model.result.quotient + model.result.remainder,
        dividend,
        model.stateKey,
      );
      assert.ok(
        model.result.remainder >= 0 && model.result.remainder < divisor,
        model.stateKey,
      );
      assert.equal(model.algorithm.kind, "division", model.stateKey);
      invariant(model, "division-reconstruction");
      invariant(model, "remainder-bound");
      invariant(model, "partial-quotients-reconstruction");
      assertEveryNumberIsASafeInteger(model);
    }
  }

  const longDivision = buildMultiDigitOperationsModel({
    operation: "divide",
    left: 1005,
    right: 10,
  });
  assert.equal(longDivision.result.kind, "division");
  if (longDivision.result.kind !== "division") throw new Error("unreachable");
  assert.deepEqual(
    [longDivision.result.quotient, longDivision.result.remainder],
    [100, 5],
  );
  assert.equal(longDivision.algorithm.kind, "division");
  if (longDivision.algorithm.kind !== "division")
    throw new Error("unreachable");
  assert.deepEqual(
    longDivision.algorithm.steps.map(
      ({ sourcePlace, quotientDigit, remainder }) => [
        sourcePlace,
        quotientDigit,
        remainder,
      ],
    ),
    [
      [1000, 0, 1],
      [100, 1, 0],
      [10, 0, 0],
      [1, 0, 5],
    ],
  );
});

test("estimate-check rounds operands with exact integers and reports signed and absolute error", () => {
  const cases: Array<{
    input: MultiDigitOperationsInput;
    rounded: [number, number];
    exact: number;
    estimate: number;
    error: number;
  }> = [
    {
      input: {
        operation: "estimate-check",
        exactOperation: "add",
        left: 347,
        right: 568,
        roundingPlace: 100,
      },
      rounded: [300, 600],
      exact: 915,
      estimate: 900,
      error: -15,
    },
    {
      input: {
        operation: "estimate-check",
        exactOperation: "subtract",
        left: 782,
        right: 249,
        roundingPlace: 100,
      },
      rounded: [800, 200],
      exact: 533,
      estimate: 600,
      error: 67,
    },
    {
      input: {
        operation: "estimate-check",
        exactOperation: "multiply",
        left: 347,
        right: 26,
        roundingPlace: 10,
      },
      rounded: [350, 30],
      exact: 9022,
      estimate: 10_500,
      error: 1478,
    },
    {
      input: {
        operation: "estimate-check",
        exactOperation: "divide",
        left: 987,
        right: 24,
        roundingPlace: 10,
      },
      rounded: [990, 20],
      exact: 41,
      estimate: 49,
      error: 8,
    },
  ];

  for (const item of cases) {
    const model = buildMultiDigitOperationsModel(item.input);
    assert.equal(model.operation, "estimate-check");
    assert.ok(model.estimate, model.stateKey);
    assert.deepEqual(
      [model.estimate.roundedLeft, model.estimate.roundedRight],
      item.rounded,
    );
    assert.equal(model.estimate.exactComparisonValue, item.exact);
    assert.equal(model.estimate.estimatedValue, item.estimate);
    assert.equal(model.estimate.signedError, item.error);
    assert.equal(model.estimate.absoluteError, Math.abs(item.error));
    invariant(model, "estimate-error");
    invariant(model, "estimate-absolute-error");
    assertEveryNumberIsASafeInteger(model);
  }

  for (const exactOperation of [
    "add",
    "subtract",
    "multiply",
    "divide",
  ] as const) {
    const model = buildMultiDigitOperationsModel({
      operation: "estimate-check",
      exactOperation,
      left: exactOperation === "subtract" ? 91 : 84,
      right: exactOperation === "divide" ? 7 : 13,
      roundingPlace: 1,
    });
    assert.ok(model.estimate);
    assert.equal(model.estimate.signedError, 0, model.stateKey);
  }
});

test("the maximum operand boundary remains exact and every exposed numeric receipt is a safe integer", () => {
  const max = MULTI_DIGIT_OPERATIONS_DOMAIN.maxOperand;
  const models = [
    buildMultiDigitOperationsModel({ operation: "add", left: max, right: max }),
    buildMultiDigitOperationsModel({
      operation: "subtract",
      left: max,
      right: 0,
    }),
    buildMultiDigitOperationsModel({
      operation: "multiply",
      left: max,
      right: max,
    }),
    buildMultiDigitOperationsModel({
      operation: "divide",
      left: max,
      right: 1,
    }),
    buildMultiDigitOperationsModel({
      operation: "estimate-check",
      exactOperation: "multiply",
      left: max,
      right: max,
      roundingPlace: 100_000,
    }),
  ];

  assert.equal(wholeResult(models[0]!), 1_999_998);
  assert.equal(wholeResult(models[1]!), 999_999);
  assert.equal(wholeResult(models[2]!), 999_998_000_001);
  assert.equal(models[3]!.result.kind, "division");
  if (models[3]!.result.kind !== "division") throw new Error("unreachable");
  assert.deepEqual(
    [models[3]!.result.quotient, models[3]!.result.remainder],
    [999_999, 0],
  );
  models.forEach((model) => assertEveryNumberIsASafeInteger(model));
});

test("invalid, unsafe, fractional, negative, and operation-specific inputs fail closed", () => {
  assertDomainError(
    { operation: "add", left: Number.NaN, right: 1 },
    "NON_SAFE_INTEGER",
  );
  assertDomainError(
    { operation: "add", left: Number.POSITIVE_INFINITY, right: 1 },
    "NON_SAFE_INTEGER",
  );
  assertDomainError(
    { operation: "add", left: 1.5, right: 1 },
    "NON_SAFE_INTEGER",
  );
  assertDomainError(
    { operation: "add", left: Number.MAX_SAFE_INTEGER, right: 1 },
    "OPERAND_OUT_OF_DOMAIN",
  );
  assertDomainError(
    { operation: "multiply", left: -1, right: 1 },
    "OPERAND_OUT_OF_DOMAIN",
  );
  assertDomainError(
    { operation: "subtract", left: 3, right: 4 },
    "SUBTRACTION_NEGATIVE_RESULT",
  );
  assertDomainError({ operation: "divide", left: 3, right: 0 }, "DIVISOR_ZERO");
  assertDomainError(
    {
      operation: "estimate-check",
      exactOperation: "add",
      left: 3,
      right: 2,
      roundingPlace: 3,
    },
    "INVALID_ROUNDING_PLACE",
  );
  assertDomainError(
    {
      operation: "estimate-check",
      exactOperation: "divide",
      left: 987,
      right: 4,
      roundingPlace: 10,
    },
    "ESTIMATE_DIVISOR_ROUNDS_TO_ZERO",
  );
  assertDomainError(
    {
      operation: "power" as never,
      left: 3,
      right: 2,
    } as MultiDigitOperationsInput,
    "INVALID_OPERATION",
  );
});

test("state and receipts are deterministic, deeply frozen, and JSON-safe", () => {
  const input: MultiDigitOperationsInput = {
    operation: "estimate-check",
    exactOperation: "multiply",
    left: 405,
    right: 27,
    roundingPlace: 10,
  };
  const first = buildMultiDigitOperationsModel(input);
  const second = buildMultiDigitOperationsModel(input);
  assert.deepEqual(first, second);
  assert.equal(first.stateKey, second.stateKey);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);

  if (first.algorithm.kind !== "multiplication")
    throw new Error("expected multiplication");
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.algorithm.partialProducts), true);
  assert.equal(
    Object.isFrozen(first.algorithm.partialProducts[0]!.digitSteps[0]),
    true,
  );
  assert.throws(() => {
    first.algorithm.kind === "multiplication" &&
      (first.algorithm.partialProducts[0]!.digitSteps[0]!.outputDigit = 99);
  }, TypeError);
  const rebuilt = buildMultiDigitOperationsModel(input);
  assert.notEqual(
    rebuilt.algorithm.kind === "multiplication"
      ? rebuilt.algorithm.partialProducts[0]!.digitSteps[0]!.outputDigit
      : -1,
    99,
  );
});
