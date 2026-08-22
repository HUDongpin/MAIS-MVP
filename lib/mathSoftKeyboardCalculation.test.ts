import assert from "node:assert/strict";
import test from "node:test";
import { formatExactScalarAsTerminatingDecimal } from "./exactScalarArithmetic";
import { calculateMathKeyboardAnswer } from "./mathSoftKeyboardCalculation";
import { questionAnswerMatches } from "./server/answerMatching";

test("equals completes ordinary arithmetic with precedence and an optional trailing equals", () => {
  assert.equal(calculateMathKeyboardAnswer("3+2+4"), "3+2+4=9");
  assert.equal(calculateMathKeyboardAnswer("3+2+4="), "3+2+4=9");
  assert.equal(calculateMathKeyboardAnswer("2+3*4"), "2+3*4=14");
  assert.equal(calculateMathKeyboardAnswer("(2+3)*4"), "(2+3)*4=20");
});

test("equals supports unary signs and ordinary operator aliases", () => {
  assert.equal(calculateMathKeyboardAnswer("+2"), "+2=2");
  assert.equal(calculateMathKeyboardAnswer("−5+8"), "−5+8=3");
  assert.equal(calculateMathKeyboardAnswer("2*-3"), "2*-3=-6");
  assert.equal(calculateMathKeyboardAnswer("2*(-3)"), "2*(-3)=-6");
  assert.equal(calculateMathKeyboardAnswer("6÷2×3"), "6÷2×3=9");
});

test("exact decimal arithmetic produces a canonical non-exponential result", () => {
  assert.equal(calculateMathKeyboardAnswer(".5 + .25"), ".5 + .25=0.75");
  assert.equal(calculateMathKeyboardAnswer("0.1+0.2"), "0.1+0.2=0.3");
  assert.equal(calculateMathKeyboardAnswer("0.0000001+0.0000002"), "0.0000001+0.0000002=0.0000003");
  assert.equal(calculateMathKeyboardAnswer("1/2"), "1/2=0.5");
  assert.equal(calculateMathKeyboardAnswer("1.0/4"), "1.0/4=0.25");
  assert.equal(calculateMathKeyboardAnswer("0.0000000000002/2"), "0.0000000000002/2=0.0000000000001");
  assert.equal(calculateMathKeyboardAnswer("1.2345678901234567"), "1.2345678901234567=1.2345678901234567");
});

test("completed equations honor the shared 500-character answer boundary", () => {
  const longestSafeExpression = `+${"(".repeat(248)}1${")".repeat(248)}`;
  const firstRejectedExpression = `+${longestSafeExpression}`;

  assert.equal(longestSafeExpression.length, 498);
  assert.equal(firstRejectedExpression.length, 499);
  assert.equal(calculateMathKeyboardAnswer(longestSafeExpression)?.length, 500);
  assert.equal(calculateMathKeyboardAnswer(firstRejectedExpression), null);
});

test("raw keyboard input enforces the 500-character boundary before trimming", () => {
  const longestRawInput = `1${" ".repeat(499)}`;
  const firstRejectedRawInput = `1${" ".repeat(500)}`;

  assert.equal(longestRawInput.length, 500);
  assert.equal(firstRejectedRawInput.length, 501);
  assert.equal(calculateMathKeyboardAnswer(longestRawInput), "1=1");
  assert.equal(calculateMathKeyboardAnswer(firstRejectedRawInput), null);
});

test("the exported exact formatter normalizes denominator sign and reduction", () => {
  assert.equal(formatExactScalarAsTerminatingDecimal({ numerator: BigInt(1), denominator: BigInt(0) }), null);
  assert.equal(formatExactScalarAsTerminatingDecimal({ numerator: BigInt(1), denominator: BigInt(-2) }), "-0.5");
  assert.equal(formatExactScalarAsTerminatingDecimal({ numerator: BigInt(3), denominator: BigInt(6) }), "0.5");
});

test("every generated equation remains acceptable to the existing short-answer matcher", () => {
  for (const [input, expectedAnswer] of [
    ["3+2+4", "9"],
    ["−5+8", "3"],
    ["2*(-3)", "-6"],
    ["6÷2×3", "9"],
    ["0.1+0.2", "0.3"],
    ["0.0000001+0.0000002", "0.0000003"],
    ["99999999999.1-99999999999", "0.1"],
    ["1000000000000.1-1000000000000", "0.1"],
    ["999999999999/23*23", "999999999999"]
  ] as const) {
    const completed = calculateMathKeyboardAnswer(input);
    assert.notEqual(completed, null, input);
    assert.equal(
      questionAnswerMatches({ answer: expectedAnswer, accepted_answers: null, options: null }, completed!),
      true,
      input
    );
  }
});

test("unsafe integer operands and results fail closed instead of emitting rounded equations", () => {
  for (const value of [
    "9007199254740991+1",
    "9007199254740992+1",
    "9007199254740993+1",
    "9999999999999999-1"
  ]) {
    assert.equal(calculateMathKeyboardAnswer(value), null, value);
  }
});

test("non-terminating decimal results fail closed", () => {
  assert.equal(calculateMathKeyboardAnswer("1/3"), null);
  assert.equal(calculateMathKeyboardAnswer("2/6"), null);
});

test("implicit multiplication stays on the literal-equals path when the matcher cannot validate it", () => {
  for (const value of ["2(3)", "(2)(3)", "(2)3", "2(-3)", "(-2)(-3)"]) {
    assert.equal(calculateMathKeyboardAnswer(value), null, value);
    assert.equal(
      questionAnswerMatches({ answer: "6", accepted_answers: null, options: null }, `${value}=6`),
      false,
      value
    );
  }
});

test("unsupported, malformed, invalid, and already-symbolic input keeps literal equals behavior", () => {
  for (const value of [
    "",
    ".",
    "1..2",
    "2(+3)",
    "(2).5",
    "2+",
    "(2+3",
    "5/0",
    "1e-3",
    "2^3",
    "sqrt(4)",
    "sin(30)",
    "pi",
    "e",
    "x=3",
    "3<4",
    "3+2=5",
    "3+2=="
  ]) {
    assert.equal(calculateMathKeyboardAnswer(value), null, value);
  }
});
