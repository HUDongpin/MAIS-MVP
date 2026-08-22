import assert from "node:assert/strict";
import test from "node:test";
import { exactFractionOperationInvariantIssue } from "./china-visualization-fraction-invariants";

test("exact integer cross-products accept reduced add, subtract, multiply, and divide states", () => {
  const shared = {
    numerator: 3,
    denominator: 10,
    otherNumerator: 1,
    otherDenominator: 5
  };
  assert.equal(exactFractionOperationInvariantIssue({ ...shared, operation: "+", resultNumerator: 1, resultDenominator: 2 }), null);
  assert.equal(exactFractionOperationInvariantIssue({ ...shared, operation: "−", resultNumerator: 1, resultDenominator: 10 }), null);
  assert.equal(exactFractionOperationInvariantIssue({ ...shared, operation: "×", resultNumerator: 3, resultDenominator: 50 }), null);
  assert.equal(exactFractionOperationInvariantIssue({ ...shared, operation: "÷", resultNumerator: 3, resultDenominator: 2 }), null);
  assert.equal(exactFractionOperationInvariantIssue({ ...shared, numerator: 1, operation: "−", resultNumerator: -1, resultDenominator: 10 }), null);
});

test("fraction operation invariant fails closed on malformed, undefined, or unsafe state", () => {
  assert.match(exactFractionOperationInvariantIssue(null) ?? "", /not an object/u);
  assert.match(exactFractionOperationInvariantIssue({}) ?? "", /not a safe integer/u);
  assert.match(exactFractionOperationInvariantIssue({
    numerator: Number.NaN,
    denominator: 10,
    otherNumerator: 1,
    otherDenominator: 5,
    operation: "+",
    resultNumerator: 1,
    resultDenominator: 2
  }) ?? "", /not a safe integer/u);
});

test("fraction operation invariant rejects zero denominators and division by a zero fraction", () => {
  assert.match(exactFractionOperationInvariantIssue({
    numerator: 1,
    denominator: 0,
    otherNumerator: 1,
    otherDenominator: 5,
    operation: "+",
    resultNumerator: 1,
    resultDenominator: 5
  }) ?? "", /denominators must be positive/u);
  assert.match(exactFractionOperationInvariantIssue({
    numerator: 1,
    denominator: 2,
    otherNumerator: 0,
    otherDenominator: 5,
    operation: "÷",
    resultNumerator: 1,
    resultDenominator: 1
  }) ?? "", /must be nonzero/u);
});

test("fraction operation invariant rejects unreduced or mathematically wrong results", () => {
  const shared = {
    numerator: 3,
    denominator: 10,
    otherNumerator: 1,
    otherDenominator: 5,
    operation: "+" as const
  };
  assert.match(exactFractionOperationInvariantIssue({ ...shared, resultNumerator: 2, resultDenominator: 4 }) ?? "", /not reduced/u);
  assert.match(exactFractionOperationInvariantIssue({ ...shared, resultNumerator: 2, resultDenominator: 3 }) ?? "", /identity failed/u);
});
