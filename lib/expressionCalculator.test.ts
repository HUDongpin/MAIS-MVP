import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateExpression } from "@/lib/expressionCalculator";
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
