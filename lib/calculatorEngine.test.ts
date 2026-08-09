import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculatorReducer,
  defaultCalculatorMode,
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

const unaryTokens = new Set([
  "sqrt", "square", "reciprocal", "sin", "cos", "tan", "asin", "acos", "atan", "ln", "log", "exp", "factorial"
]);

function tokenToAction(token: string): CalculatorAction | null {
  if (/^[0-9]$/.test(token)) return { type: "digit", value: token };
  if (token === ".") return { type: "decimal" };
  if (token === "+" || token === "-" || token === "×" || token === "÷" || token === "^") {
    return { type: "operator", value: token };
  }
  if (token === "=") return { type: "equals" };
  if (token === "AC") return { type: "clear" };
  if (token === "back") return { type: "backspace" };
  if (token === "%") return { type: "percent" };
  if (token === "neg") return { type: "negate" };
  if (token === "pi" || token === "e") return { type: "constant", value: token };
  if (token === "rad") return { type: "toggleAngleMode" };
  if (unaryTokens.has(token)) return { type: "unary", fn: token as Extract<CalculatorAction, { type: "unary" }>["fn"] };
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

test("basic result chains retain guard digits beyond the rounded display", () => {
  assert.equal(run("1 ÷ 3 =").display, "0.333333333333");
  assert.equal(run("1 ÷ 3 = × 3 =").display, "1");
  assert.equal(run("1 ÷ 7 = × 7 =").display, "1");
});

test("a result displayed as zero cannot leak a hidden nonzero value into later buttons", () => {
  const underflow = "1 ÷ 1 0 0 0 0 0 0 0 0 0 0 0 = ÷ 1 0 0 =";
  const state = run(underflow);
  assert.equal(state.display, "0");
  assert.equal(state.exactValue, 0);
  assert.equal(run(`${underflow} sqrt`).display, "0");
  assert.equal(run(`${underflow} neg sqrt`).display, "0");
  assert.equal(run(`${underflow} × 1 0 0 0 0 0 0 0 0 0 0 0 =`).display, "0");
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

test("percent follows standard contextual calculator semantics", () => {
  assert.equal(run("5 0 %").display, "0.5");
  assert.equal(run("1 0 0 + 1 5 % =").display, "115");
  assert.equal(run("1 0 0 - 1 5 % =").display, "85");
  assert.equal(run("2 0 0 × 1 0 % =").display, "20");
  assert.equal(run("2 0 0 ÷ 1 0 % =").display, "2000");
});

test("a contextual percent recipe survives an initial zero base", () => {
  assert.equal(run("0 + 1 5 % = 1 0 0 =").display, "115");
  assert.equal(run("0 - 1 5 % = 1 0 0 =").display, "85");
});

test("percent overflow enters the locked Error state until AC", () => {
  const overflow = run("1 0 ^ 3 0 8 = + 2 0 0 %");
  assert.equal(overflow.display, "Error");
  assert.equal(overflow.error, true);
  assert.equal(calculatorReducer(overflow, { type: "digit", value: "7" }).display, "Error");
  assert.deepEqual(calculatorReducer(overflow, { type: "clear" }), initialCalculatorState);
});

test("negate and square root", () => {
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

test("equals repeats the last operation and retains a contextual percent recipe", () => {
  assert.equal(run("1 × 2 = = = =").display, "16");
  assert.equal(run("2 + 3 = =").display, "8");

  // Apple Calculator's percentage workflow retains +15% as the repeat recipe:
  // 100 + 15% = 115, then entering 150 and pressing = produces 172.5.
  assert.equal(run("1 0 0 + 1 5 % = 1 5 0 =").display, "172.5");
  assert.equal(run("1 0 0 + 1 5 % = =").display, "132.25");

  // AC removes the replay recipe as well as the visible calculation.
  assert.equal(run("2 + 3 = AC 4 =").display, "4");
});

test("completed unary and percent operands survive operator chaining", () => {
  assert.equal(run("1 0 0 + 1 5 % + 5 =").display, "120");
  assert.equal(run("9 + 1 6 sqrt + 1 =").display, "14");
  // A second operator replaces the pending operator while no right operand exists.
  assert.equal(run("5 + × 2 =").display, "10");
  // A fresh entry may still apply the retained repeat recipe on the next equals.
  assert.equal(run("2 + 2 = 9 =").display, "11");
});

test("only one decimal point is allowed per number", () => {
  assert.equal(run("1 . 5 . 2").display, "1.52");
});

test("power operator, square, and reciprocal", () => {
  assert.equal(run("2 ^ 1 0 =").display, "1024");
  assert.equal(run("5 square").display, "25");
  assert.equal(run("4 reciprocal").display, "0.25");
  assert.equal(run("0 reciprocal").error, true);
});

test("trigonometry defaults to degrees and honours the angle-mode toggle", () => {
  assert.equal(run("3 0 sin").display, "0.5");
  assert.equal(run("9 0 cos").display, "0"); // ~6e-17 snaps to 0
  assert.equal(run("4 5 tan").display, "1");
  assert.equal(run("9 0 tan").error, true);
  // Toggling to radians changes the result.
  assert.equal(run("rad 3 0 sin").display, formatCalculatorNumber(Math.sin(30)));
});

test("inverse trig, logarithms, exponential, and their domain errors", () => {
  assert.equal(run("1 asin").display, "90");     // degrees
  assert.equal(run("2 asin").error, true);       // out of domain
  assert.equal(run("1 0 0 log").display, "2");
  assert.equal(run("e ln").display, "1");
  assert.equal(run("0 ln").error, true);
  assert.equal(run("0 exp").display, "1");
});

test("factorial handles valid, zero, and invalid inputs", () => {
  assert.equal(run("5 factorial").display, "120");
  assert.equal(run("0 factorial").display, "1");
  assert.equal(run("3 . 5 factorial").error, true);
  assert.equal(run("5 neg factorial").error, true);
});

test("constants pi and e", () => {
  assert.equal(run("pi").display, formatCalculatorNumber(Math.PI));
  assert.equal(run("e").display, formatCalculatorNumber(Math.E));
});

test("defaultCalculatorMode picks scientific for upper-secondary grades", () => {
  assert.equal(defaultCalculatorMode("S4"), "scientific");
  assert.equal(defaultCalculatorMode("S3"), "scientific");
  assert.equal(defaultCalculatorMode("S1"), "basic");
  assert.equal(defaultCalculatorMode("P5"), "basic");
  assert.equal(defaultCalculatorMode("K"), "basic");
  assert.equal(defaultCalculatorMode(undefined), "basic");
});
