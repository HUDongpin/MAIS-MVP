import assert from "node:assert/strict";
import { test } from "node:test";
import { decimalToFraction, evaluateExpression, evaluateExpressionTokens } from "@/lib/expressionCalculator";
import type { CalculatorAngleMode } from "@/lib/calculatorEngine";

function ev(input: string, mode: CalculatorAngleMode = "deg"): number | null {
  return evaluateExpression(input, mode);
}

function approx(actual: number | null, expected: number, epsilon = 1e-9) {
  assert.ok(actual !== null, `expected a number, got null`);
  assert.ok(Math.abs((actual as number) - expected) < epsilon, `expected ≈ ${expected}, got ${actual}`);
}

test("operator precedence and parentheses", () => {
  assert.equal(ev("2+3×4"), 14);
  assert.equal(ev("(2+3)×4"), 20);
  assert.equal(ev("2+3×4-10÷2"), 9);
  assert.equal(ev("((1+2)×(3+4))"), 21);
});

test("power is right-associative and binds tighter than unary minus", () => {
  assert.equal(ev("2^3^2"), 512); // 2^(3^2)
  assert.equal(ev("-2^2"), -4); // -(2^2)
  assert.equal(ev("2^-2"), 0.25);
  assert.equal(ev("2^3+1"), 9);
});

test("scientific-notation results remain valid operands without swallowing the e constant", () => {
  assert.equal(ev("1e+21 + 1"), 1e21);
  approx(ev("1e-7 × 10"), 1e-6);
  approx(ev("2 e 2"), 4 * Math.E);
});

test("calculator token boundaries distinguish a result exponent from the e button", () => {
  assert.equal(evaluateExpressionTokens(["1e+21", "+", "1"], "deg"), 1e21);
  approx(evaluateExpressionTokens(["2", "e", "2"], "deg"), 4 * Math.E);
});

test("postfix square, factorial, and percent", () => {
  assert.equal(ev("5²"), 25);
  assert.equal(ev("3²+4²"), 25);
  assert.equal(ev("5!"), 120);
  assert.equal(ev("5!+1"), 121);
  assert.equal(ev("50%"), 0.5);
  approx(ev("200×10%"), 20);
});

test("implicit multiplication", () => {
  approx(ev("2π"), 2 * Math.PI);
  assert.equal(ev("2(3)"), 6);
  assert.equal(ev("(2)(3)"), 6);
  assert.equal(ev("3!2"), 12); // (3!)×2
  assert.equal(ev("2(3+4)"), 14);
});

test("functions in degrees (default) and radians", () => {
  approx(ev("sin(30)"), 0.5);
  approx(ev("cos(60)"), 0.5);
  approx(ev("tan(45)"), 1);
  approx(ev("sin⁻¹(1)"), 90); // inverse returns degrees
  approx(ev("sin(π÷2)", "rad"), 1);
  approx(ev("cos(0)", "rad"), 1);
});

test("tangent rejects angles where cosine is zero", () => {
  assert.equal(ev("tan(90)"), null);
  assert.equal(ev("tan(270)"), null);
  assert.equal(ev("tan(π÷2)", "rad"), null);
  assert.equal(ev("tan(-π÷2)", "rad"), null);
});

test("logs, roots, nested functions, and constants", () => {
  approx(ev("log(1000)"), 3);
  approx(ev("ln(e)"), 1);
  assert.equal(ev("√(9)"), 3);
  assert.equal(ev("√(16)+√(9)"), 7);
  assert.equal(ev("√(3²+4²)"), 5);
  approx(ev("e"), Math.E);
});

test("unary minus and mixed expressions", () => {
  assert.equal(ev("-5+3"), -2);
  assert.equal(ev("3×-4"), -12);
  assert.equal(ev("10÷(2-2+1)"), 10);
});

test("combinations (nCr) and permutations (nPr)", () => {
  assert.equal(ev("5nCr2"), 10);
  assert.equal(ev("5nPr2"), 20);
  assert.equal(ev("52nCr5"), 2598960); // poker hands
  assert.equal(ev("2×3nCr2"), 6); // binds tighter than ×: 2×(3C2)
  assert.equal(ev("5nCr2+5nCr3"), 20);
  assert.equal(ev("3nCr5"), null); // r > n
  assert.equal(ev("5.5nCr2"), null); // non-integer
});

test("fractions and mixed numbers", () => {
  assert.equal(ev("1⁄2"), 0.5);
  assert.equal(ev("3⁄4"), 0.75);
  approx(ev("1⁄2+1⁄3"), 5 / 6); // fraction binds tighter than +
  assert.equal(ev("1⁄2×4"), 2);
  approx(ev("2⁀1⁄3"), 7 / 3); // mixed number 2 1/3
  approx(ev("-2⁀1⁄3"), -7 / 3); // unary minus wraps the whole mixed number
  assert.equal(ev("1⁀1⁄2×2"), 3); // (1 1/2) × 2
  assert.equal(ev("1⁄0"), null); // fraction divide-by-zero
});

test("decimalToFraction recovers exact rationals and rejects irrationals", () => {
  assert.deepEqual(decimalToFraction(0.75), { numerator: 3, denominator: 4 });
  assert.deepEqual(decimalToFraction(0.5), { numerator: 1, denominator: 2 });
  assert.deepEqual(decimalToFraction(2.5), { numerator: 5, denominator: 2 });
  assert.deepEqual(decimalToFraction(-0.25), { numerator: -1, denominator: 4 });
  assert.deepEqual(decimalToFraction(1 / 3), { numerator: 1, denominator: 3 });
  assert.deepEqual(decimalToFraction(5), { numerator: 5, denominator: 1 });
  // Results of expressions round-trip to exact fractions.
  assert.deepEqual(decimalToFraction(evaluateExpression("1⁄2+1⁄3", "deg") as number), { numerator: 5, denominator: 6 });
  // Irrationals get no fraction.
  assert.equal(decimalToFraction(Math.SQRT2), null);
  assert.equal(decimalToFraction(Math.PI), null);
});

test("errors return null (never throw)", () => {
  assert.equal(ev(""), null);
  assert.equal(ev("2+"), null); // trailing operator
  assert.equal(ev("(2+3"), null); // unbalanced
  assert.equal(ev("2+3)"), null);
  assert.equal(ev("5÷0"), null); // divide by zero
  assert.equal(ev("ln(-1)"), null); // domain
  assert.equal(ev("sin⁻¹(2)"), null); // domain
  assert.equal(ev("√(-4)"), null); // domain
  assert.equal(ev("1.2.3"), null); // malformed number
  assert.equal(ev("()"), null); // empty parens
});
