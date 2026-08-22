import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDecimalArithmeticState,
  decimalArithmeticOperations,
  decimalArithmeticResetInput,
  normalizeExactRational,
  type DecimalArithmeticInput,
} from "./DecimalArithmeticModel";

function reconstructedRegroupedMagnitude(
  state: ReturnType<typeof buildDecimalArithmeticState>,
) {
  return state.regrouping.reduce(
    (total, receipt) =>
      total +
      receipt.resultDigit *
        10 ** (receipt.columnExponent + state.alignment.commonScale),
    0,
  );
}

test("reset exposes exact aligned decimal columns", () => {
  const state = buildDecimalArithmeticState(decimalArithmeticResetInput);

  assert.equal(state.family, "decimal-arithmetic");
  assert.equal(state.version, "decimal-arithmetic-v1");
  assert.equal(state.left.text, "12.5");
  assert.equal(state.right.text, "3.75");
  assert.equal(state.alignment.commonScale, 2);
  assert.equal(state.alignment.alignedLeft, 1250);
  assert.equal(state.alignment.alignedRight, 375);
  assert.deepEqual(state.result.exact, { numerator: 65, denominator: 4 });
  assert.equal(state.result.text, "65/4");
  assert.ok(state.invariants.every(({ holds }) => holds));
});

test("addition carries and subtraction borrows through the decimal point", () => {
  const addition = buildDecimalArithmeticState({
    left: { unscaled: 999, scale: 2 },
    operation: "add",
    precision: 2,
    right: { unscaled: 2, scale: 2 },
  });
  assert.deepEqual(addition.result.exact, {
    numerator: 1001,
    denominator: 100,
  });
  assert.deepEqual(
    addition.regrouping
      .slice(0, 3)
      .map(({ incoming, outgoing, resultDigit }) => ({
        incoming,
        outgoing,
        resultDigit,
      })),
    [
      { incoming: 0, outgoing: 1, resultDigit: 1 },
      { incoming: 1, outgoing: 1, resultDigit: 0 },
      { incoming: 1, outgoing: 1, resultDigit: 0 },
    ],
  );

  const subtraction = buildDecimalArithmeticState({
    left: { unscaled: 1000, scale: 2 },
    operation: "subtract",
    precision: 2,
    right: { unscaled: 1, scale: 2 },
  });
  assert.deepEqual(subtraction.result.exact, {
    numerator: 999,
    denominator: 100,
  });
  assert.deepEqual(
    subtraction.regrouping.slice(0, 3).map(({ outgoing, resultDigit }) => ({
      outgoing,
      resultDigit,
    })),
    [
      { outgoing: 1, resultDigit: 9 },
      { outgoing: 1, resultDigit: 9 },
      { outgoing: 1, resultDigit: 9 },
    ],
  );
});

test("signed add and subtract receipts reconstruct the exact visible result", () => {
  const negativeAddition = buildDecimalArithmeticState({
    left: { unscaled: -12, scale: 1 },
    operation: "add",
    precision: 2,
    right: { unscaled: 3, scale: 1 },
  });
  assert.deepEqual(negativeAddition.result.exact, {
    numerator: -9,
    denominator: 10,
  });
  assert.deepEqual(
    {
      bottomMagnitude: negativeAddition.columnCalculation?.bottomMagnitude,
      effectiveOperation:
        negativeAddition.columnCalculation?.effectiveOperation,
      operandsSwapped: negativeAddition.columnCalculation?.operandsSwapped,
      resultSign: negativeAddition.columnCalculation?.resultSign,
      topMagnitude: negativeAddition.columnCalculation?.topMagnitude,
    },
    {
      bottomMagnitude: 3,
      effectiveOperation: "subtract",
      operandsSwapped: false,
      resultSign: -1,
      topMagnitude: 12,
    },
  );
  assert.equal(reconstructedRegroupedMagnitude(negativeAddition), 9);
  assert.equal(
    (negativeAddition.columnCalculation?.resultSign ?? 0) *
      reconstructedRegroupedMagnitude(negativeAddition),
    negativeAddition.columnCalculation?.expectedAlignedResult,
  );

  const swappedSubtraction = buildDecimalArithmeticState({
    left: { unscaled: 12, scale: 1 },
    operation: "subtract",
    precision: 2,
    right: { unscaled: 34, scale: 1 },
  });
  assert.deepEqual(swappedSubtraction.result.exact, {
    numerator: -11,
    denominator: 5,
  });
  assert.deepEqual(
    {
      bottomMagnitude: swappedSubtraction.columnCalculation?.bottomMagnitude,
      bottomSource: swappedSubtraction.columnCalculation?.bottomSource,
      effectiveOperation:
        swappedSubtraction.columnCalculation?.effectiveOperation,
      operandsSwapped: swappedSubtraction.columnCalculation?.operandsSwapped,
      resultSign: swappedSubtraction.columnCalculation?.resultSign,
      topMagnitude: swappedSubtraction.columnCalculation?.topMagnitude,
      topSource: swappedSubtraction.columnCalculation?.topSource,
    },
    {
      bottomMagnitude: 12,
      bottomSource: "left",
      effectiveOperation: "subtract",
      operandsSwapped: true,
      resultSign: -1,
      topMagnitude: 34,
      topSource: "right",
    },
  );
  assert.equal(reconstructedRegroupedMagnitude(swappedSubtraction), 22);
  assert.equal(
    (swappedSubtraction.columnCalculation?.resultSign ?? 0) *
      reconstructedRegroupedMagnitude(swappedSubtraction),
    swappedSubtraction.columnCalculation?.expectedAlignedResult,
  );
});

test("multiplication partitions the exact scaled-integer product", () => {
  const state = buildDecimalArithmeticState({
    left: { unscaled: 12, scale: 1 },
    operation: "multiply",
    precision: 3,
    right: { unscaled: 35, scale: 2 },
  });

  assert.deepEqual(state.result.exact, { numerator: 21, denominator: 50 });
  assert.equal(state.multiplication?.exactUnscaledProduct, 420);
  assert.equal(state.multiplication?.resultScale, 3);
  assert.deepEqual(state.multiplication?.partialProducts, [
    { digit: 5, digitPlace: 0, partialProduct: 60 },
    { digit: 3, digitPlace: 1, partialProduct: 360 },
  ]);
});

test("division exposes quotient, remainder, and inverse reconstruction", () => {
  const state = buildDecimalArithmeticState({
    left: { unscaled: 125, scale: 1 },
    operation: "divide",
    precision: 2,
    right: { unscaled: 4, scale: 1 },
  });

  assert.deepEqual(state.result.exact, { numerator: 125, denominator: 4 });
  assert.deepEqual(state.division, {
    dividend: 1250,
    dividendSign: 1,
    divisor: 40,
    divisorSign: 1,
    exactResultSign: 1,
    quotient: 31,
    quotientSign: 1,
    remainder: 10,
  });
  assert.equal(
    state.invariants.find(({ id }) => id === "division-reconstruction")?.holds,
    true,
  );

  const negativeFractionalQuotient = buildDecimalArithmeticState({
    left: { unscaled: -1, scale: 0 },
    operation: "divide",
    precision: 2,
    right: { unscaled: 10, scale: 0 },
  });
  assert.equal(negativeFractionalQuotient.division?.quotient, 0);
  assert.equal(
    Object.is(negativeFractionalQuotient.division?.quotient, -0),
    false,
  );

  const exactNegativeDivision = buildDecimalArithmeticState({
    left: { unscaled: -10, scale: 0 },
    operation: "divide",
    precision: 2,
    right: { unscaled: 10, scale: 0 },
  });
  assert.equal(exactNegativeDivision.division?.remainder, 0);
  assert.equal(Object.is(exactNegativeDivision.division?.remainder, -0), false);
});

test("estimate-check preserves the exact rational and reports signed error", () => {
  const state = buildDecimalArithmeticState({
    estimateOperation: "divide",
    left: { unscaled: 1, scale: 0 },
    operation: "estimate-check",
    precision: 2,
    right: { unscaled: 3, scale: 0 },
  });

  assert.equal(state.evaluatedOperation, "divide");
  assert.deepEqual(state.estimate.exact, { numerator: 1, denominator: 3 });
  assert.deepEqual(state.estimate.rounded, {
    unscaled: 33,
    scale: 2,
    text: "0.33",
  });
  assert.deepEqual(state.estimate.signedError, {
    numerator: 1,
    denominator: 300,
  });
  assert.deepEqual(state.estimate.absoluteError, {
    numerator: 1,
    denominator: 300,
  });
});

test("every operation, scale, sign, and precision remains exact and serializable", () => {
  const exactOperations = decimalArithmeticOperations.filter(
    (operation) => operation !== "estimate-check",
  );
  let observed = 0;

  for (const operation of exactOperations) {
    for (let leftScale = 0; leftScale <= 3; leftScale += 1) {
      for (let rightScale = 0; rightScale <= 3; rightScale += 1) {
        for (const leftUnscaled of [-999, -11, 0, 27, 999]) {
          for (const rightUnscaled of [-37, -1, 1, 42]) {
            const input: DecimalArithmeticInput = {
              left: { unscaled: leftUnscaled, scale: leftScale },
              operation,
              precision: (leftScale + rightScale) % 5,
              right: { unscaled: rightUnscaled, scale: rightScale },
            };
            const state = buildDecimalArithmeticState(input);
            assert.ok(state.invariants.every(({ holds }) => holds));
            if (operation === "add" || operation === "subtract") {
              assert.ok(state.columnCalculation);
              assert.equal(
                reconstructedRegroupedMagnitude(state),
                state.columnCalculation.resultMagnitude,
              );
              assert.equal(
                state.columnCalculation.resultSign *
                  reconstructedRegroupedMagnitude(state),
                state.columnCalculation.expectedAlignedResult,
              );
              assert.equal(
                state.columnCalculation.reconstructedAlignedResult,
                state.columnCalculation.expectedAlignedResult,
              );
            } else {
              assert.equal(state.columnCalculation, null);
            }
            if (operation === "multiply") {
              assert.equal(
                state.multiplication?.partialProducts.reduce(
                  (sum, part) => sum + part.partialProduct,
                  0,
                ),
                state.multiplication?.exactUnscaledProduct,
              );
              assert.equal(
                state.multiplication?.resultSign,
                leftUnscaled * rightUnscaled === 0
                  ? 0
                  : Math.sign(leftUnscaled * rightUnscaled),
              );
            }
            if (operation === "divide") {
              assert.equal(
                (state.division?.divisor ?? 0) *
                  (state.division?.quotient ?? 0) +
                  (state.division?.remainder ?? 0),
                state.division?.dividend,
              );
              assert.equal(
                state.division?.exactResultSign,
                Math.sign(state.result.exact.numerator),
              );
            }
            assert.equal(
              JSON.stringify(state).includes("null"),
              state.multiplication === null || state.division === null,
            );
            assert.doesNotMatch(JSON.stringify(state), /NaN|Infinity/);
            observed += 1;
          }
        }
      }
    }
  }

  assert.equal(observed, 1280);
});

test("normalization and input boundaries fail closed", () => {
  assert.deepEqual(normalizeExactRational(-6, -8), {
    numerator: 3,
    denominator: 4,
  });
  assert.throws(() => normalizeExactRational(1, 0), /cannot be zero/);
  assert.throws(
    () =>
      buildDecimalArithmeticState({
        left: { unscaled: Number.NaN, scale: 1 },
        operation: "add",
        precision: 2,
        right: { unscaled: 1, scale: 1 },
      }),
    /safe integer/,
  );
  assert.throws(
    () =>
      buildDecimalArithmeticState({
        left: { unscaled: 1, scale: 4 },
        operation: "add",
        precision: 2,
        right: { unscaled: 1, scale: 1 },
      }),
    /scale must be between/,
  );
  assert.throws(
    () =>
      buildDecimalArithmeticState({
        left: { unscaled: 10_000, scale: 0 },
        operation: "multiply",
        precision: 4,
        right: { unscaled: 9_999, scale: 0 },
      }),
    /exceeds the exact model domain/,
  );
  assert.throws(
    () =>
      buildDecimalArithmeticState({
        left: { unscaled: 1, scale: 0 },
        operation: "divide",
        precision: 2,
        right: { unscaled: 0, scale: 0 },
      }),
    /divisor cannot be zero/,
  );
  assert.throws(
    () =>
      buildDecimalArithmeticState({
        left: { unscaled: 1, scale: 0 },
        operation: "add",
        precision: 5,
        right: { unscaled: 1, scale: 0 },
      }),
    /precision must be between/,
  );
});
