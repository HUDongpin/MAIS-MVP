import assert from "node:assert/strict";
import test from "node:test";
import { calculateMathKeyboardAnswer } from "@/components/practice/mathSoftKeyboardCalculation";
import { questionAnswerMatches } from "@/lib/server/answerMatching";

test("calculator-style equals resolves complete arithmetic into a valid equation", () => {
  assert.equal(calculateMathKeyboardAnswer("3+2+4"), "3+2+4=9");
  assert.equal(calculateMathKeyboardAnswer("3+2+4="), "3+2+4=9");
  assert.equal(calculateMathKeyboardAnswer("2+3*4"), "2+3*4=14");
  assert.equal(calculateMathKeyboardAnswer("(2+3)*4"), "(2+3)*4=20");
  assert.equal(calculateMathKeyboardAnswer("0.1+0.2"), "0.1+0.2=0.3");
});

test("calculator-style equals supports grader-compatible arithmetic tokens", () => {
  assert.equal(calculateMathKeyboardAnswer("6×7"), "6×7=42");
  assert.equal(calculateMathKeyboardAnswer("12÷4"), "12÷4=3");
  assert.equal(calculateMathKeyboardAnswer("-5 + (2 * 4)"), "-5 + (2 * 4)=3");
});

test("answer formatting preserves safe integers, precision, and non-zero small values", () => {
  assert.equal(calculateMathKeyboardAnswer("1234567890123"), "1234567890123=1234567890123");
  assert.equal(calculateMathKeyboardAnswer("1000000000000+3"), "1000000000000+3=1000000000003");
  assert.equal(calculateMathKeyboardAnswer("1/3"), "1/3=0.3333333333333333");
  assert.equal(calculateMathKeyboardAnswer("1.2345678901234567"), "1.2345678901234567=1.2345678901234567");
  assert.equal(calculateMathKeyboardAnswer("0.0000010005"), "0.0000010005=0.0000010005");
});

test("every auto-completed equation is accepted by the existing short-answer grader", () => {
  for (const [input, expectedAnswer] of [
    ["3+2+4", "9"],
    ["6×7", "42"],
    ["12÷4", "3"],
    ["(2+3)*4", "20"],
    ["0.1+0.2", "0.3"],
    ["1/3", "0.3333333333333333"]
  ] as const) {
    const completedEquation = calculateMathKeyboardAnswer(input);
    assert.notEqual(completedEquation, null, input);
    assert.equal(questionAnswerMatches({ answer: expectedAnswer, accepted_answers: null, options: null }, completedEquation!), true, input);
  }
});

test("implicit multiplication stays on the literal-equals path because the grader rejects it", () => {
  for (const value of ["2(3)", "(2)(3)", "(2)3", "2(-3)", "(-2)(-3)"]) {
    assert.equal(calculateMathKeyboardAnswer(value), null, value);
    assert.equal(
      questionAnswerMatches({ answer: "6", accepted_answers: null, options: null }, `${value}=6`),
      false,
      value
    );
  }
});

test("symbolic, existing-equation, and invalid input stays on the equals-insertion path", () => {
  for (const value of [
    "",
    "2+",
    "5/0",
    "f(x)",
    "e",
    "pi",
    "π",
    "e^(i*pi)+1",
    "2^3",
    "sqrt(9)",
    "log10(100)",
    "2*pi",
    "sin(30)",
    "sin(pi/2)",
    "acos(0)",
    "0.0000000000002/2",
    "0.0000000000010005",
    "x=3",
    "3+2=5"
  ]) {
    assert.equal(calculateMathKeyboardAnswer(value), null, value);
  }
});
