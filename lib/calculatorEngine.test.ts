import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculatorReducer,
  formatCalculatorNumber,
  initialCalculatorState,
  type CalculatorAction,
  type CalculatorState
} from "@/lib/calculatorEngine";

// Run a compact script of actions against the reducer. Tokens: digits 0-9, ".",
// "+ - × ÷", "=", "AC", "back", "%", "neg", "sqrt".
function run(script: string): CalculatorState {
  const tokens = script.trim().split(/\s+/);
  return tokens.reduce((state, token) => {
    const action = tokenToAction(token);
    return action ? calculatorReducer(state, action) : state;
  }, initialCalculatorState);
}

function tokenToAction(token: string): CalculatorAction | null {
  if (/^[0-9]$/.test(token)) return { type: "digit", value: token };
  if (token === ".") return { type: "decimal" };
  if (token === "+" || token === "-" || token === "×" || token === "÷") return { type: "operator", value: token };
  if (token === "=") return { type: "equals" };
  if (token === "AC") return { type: "clear" };
  if (token === "back") return { type: "backspace" };
  if (token === "%") return { type: "percent" };
  if (token === "neg") return { type: "negate" };
  if (token === "sqrt") return { type: "sqrt" };
  return null;
}

test("basic addition and immediate-execution chaining", () => {
  assert.equal(run("1 2 + 3 =").display, "15");
  // Left-to-right, no precedence: 2 + 3 × 4 = (2+3)*4 = 20
  assert.equal(run("2 + 3 × 4 =").display, "20");
  // Pressing a second operator evaluates the pending one.
  assert.equal(run("6 - 2 - 1 =").display, "3");
});

test("decimals avoid floating-point noise", () => {
  assert.equal(run("0 . 1 + 0 . 2 =").display, "0.3");
  assert.equal(formatCalculatorNumber(0.1 + 0.2), "0.3");
});

test("division, and divide-by-zero is an error that only clear recovers", () => {
  assert.equal(run("8 ÷ 2 =").display, "4");
  const errored = run("5 ÷ 0 =");
  assert.equal(errored.display, "Error");
  assert.equal(errored.error, true);
  // Further input is ignored until cleared.
  assert.equal(calculatorReducer(errored, { type: "digit", value: "7" }).display, "Error");
  assert.deepEqual(run("5 ÷ 0 = AC"), initialCalculatorState);
});

test("percent, negate, and square root", () => {
  assert.equal(run("5 0 %").display, "0.5");
  assert.equal(run("2 0 0 × 1 0 % =").display, "20");
  assert.equal(run("7 neg").display, "-7");
  assert.equal(run("7 neg neg").display, "7");
  assert.equal(run("9 sqrt").display, "3");
  assert.equal(run("9 neg sqrt").error, true);
});

test("clear resets and backspace deletes the last entered digit", () => {
  assert.deepEqual(run("1 2 3 AC"), initialCalculatorState);
  assert.equal(run("1 2 3 back").display, "12");
  assert.equal(run("5 back").display, "0");
  // A leading zero is preserved rather than stacking zeros.
  assert.equal(run("0 0 0 5").display, "5");
});

test("a fresh digit after equals starts a new calculation", () => {
  const afterEquals = run("2 + 2 =");
  assert.equal(afterEquals.display, "4");
  assert.equal(calculatorReducer(afterEquals, { type: "digit", value: "9" }).display, "9");
});

test("only one decimal point is allowed per number", () => {
  assert.equal(run("1 . 5 . 2").display, "1.52");
});
