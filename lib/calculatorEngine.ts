import type { GradeId } from "@/types";

// Pure, dependency-free engine for the in-app calculator (the "calculator allowed"
// accommodation). Immediate-execution semantics like a standard pocket calculator
// (left-to-right, no operator precedence), which is what students expect from an
// on-screen calculator. A "scientific" layer adds unary functions (trig, logs,
// powers, roots, reciprocal, factorial) and constants on top of the same model.
// Kept separate from the UI so the arithmetic is unit-tested.

export type CalculatorOperator = "+" | "-" | "×" | "÷" | "^";

export type CalculatorAngleMode = "deg" | "rad";

export type CalculatorUnaryFunction =
  | "sqrt"
  | "square"
  | "reciprocal"
  | "sin"
  | "cos"
  | "tan"
  | "asin"
  | "acos"
  | "atan"
  | "ln"
  | "log"
  | "exp"
  | "factorial";

export type CalculatorConstant = "pi" | "e";

export type CalculatorState = {
  display: string;
  accumulator: number | null;
  pendingOperator: CalculatorOperator | null;
  // When true, the next digit/decimal starts a fresh number rather than appending.
  overwrite: boolean;
  error: boolean;
  angleMode: CalculatorAngleMode;
};

export type CalculatorAction =
  | { type: "digit"; value: string }
  | { type: "decimal" }
  | { type: "operator"; value: CalculatorOperator }
  | { type: "equals" }
  | { type: "clear" }
  | { type: "backspace" }
  | { type: "percent" }
  | { type: "negate" }
  | { type: "unary"; fn: CalculatorUnaryFunction }
  | { type: "constant"; value: CalculatorConstant }
  | { type: "toggleAngleMode" };

export const initialCalculatorState: CalculatorState = {
  display: "0",
  accumulator: null,
  pendingOperator: null,
  overwrite: true,
  error: false,
  angleMode: "deg"
};

function toError(state: CalculatorState): CalculatorState {
  return {
    display: "Error",
    accumulator: null,
    pendingOperator: null,
    overwrite: true,
    error: true,
    angleMode: state.angleMode
  };
}

const maxDigits = 12;

// Trim binary floating-point noise (0.1 + 0.2 -> 0.3), snap underflow-to-zero
// results (e.g. cos 90° ≈ 6e-17 -> 0), cap precision, and signal non-finite
// results as an error.
export function formatCalculatorNumber(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  if (value !== 0 && Math.abs(value) < 1e-12) return "0";
  const trimmed = Number.parseFloat(value.toPrecision(maxDigits));
  return String(trimmed);
}

function applyOperator(a: number, operator: CalculatorOperator, b: number): number {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? Number.POSITIVE_INFINITY : a / b;
    case "^":
      return Math.pow(a, b);
  }
}

function factorial(x: number): number | null {
  if (!Number.isInteger(x) || x < 0 || x > 170) return null;
  let result = 1;
  for (let i = 2; i <= x; i += 1) result *= i;
  return result;
}

// Returns null for domain errors (e.g. ln of a non-positive number), which the
// reducer turns into an error state.
function applyUnary(fn: CalculatorUnaryFunction, x: number, angleMode: CalculatorAngleMode): number | null {
  const toRadians = (value: number) => (angleMode === "deg" ? (value * Math.PI) / 180 : value);
  const fromRadians = (value: number) => (angleMode === "deg" ? (value * 180) / Math.PI : value);

  switch (fn) {
    case "sqrt":
      return x < 0 ? null : Math.sqrt(x);
    case "square":
      return x * x;
    case "reciprocal":
      return x === 0 ? null : 1 / x;
    case "sin":
      return Math.sin(toRadians(x));
    case "cos":
      return Math.cos(toRadians(x));
    case "tan":
      return Math.tan(toRadians(x));
    case "asin":
      return x < -1 || x > 1 ? null : fromRadians(Math.asin(x));
    case "acos":
      return x < -1 || x > 1 ? null : fromRadians(Math.acos(x));
    case "atan":
      return fromRadians(Math.atan(x));
    case "ln":
      return x <= 0 ? null : Math.log(x);
    case "log":
      return x <= 0 ? null : Math.log10(x);
    case "exp":
      return Math.exp(x);
    case "factorial":
      return factorial(x);
  }
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  // Once in an error state only "clear" recovers.
  if (state.error && action.type !== "clear") return state;

  switch (action.type) {
    case "clear":
      return { ...initialCalculatorState, angleMode: state.angleMode };

    case "toggleAngleMode":
      return { ...state, angleMode: state.angleMode === "deg" ? "rad" : "deg" };

    case "digit": {
      const digit = action.value;
      if (state.overwrite) {
        return { ...state, display: digit, overwrite: false };
      }
      if (state.display === "0") {
        return { ...state, display: digit };
      }
      // Cap the number of significant digits entered (excludes sign/decimal point).
      if (state.display.replace(/[^0-9]/g, "").length >= maxDigits) return state;
      return { ...state, display: state.display + digit };
    }

    case "decimal": {
      if (state.overwrite) return { ...state, display: "0.", overwrite: false };
      if (state.display.includes(".")) return state;
      return { ...state, display: state.display + "." };
    }

    case "negate": {
      if (state.display === "0") return state;
      const negated = state.display.startsWith("-") ? state.display.slice(1) : `-${state.display}`;
      return { ...state, display: negated };
    }

    case "percent": {
      const value = Number.parseFloat(state.display) / 100;
      return { ...state, display: formatCalculatorNumber(value), overwrite: true };
    }

    case "unary": {
      const result = applyUnary(action.fn, Number.parseFloat(state.display), state.angleMode);
      if (result === null || !Number.isFinite(result)) return toError(state);
      return { ...state, display: formatCalculatorNumber(result), overwrite: true };
    }

    case "constant": {
      const value = action.value === "pi" ? Math.PI : Math.E;
      return { ...state, display: formatCalculatorNumber(value), overwrite: true };
    }

    case "backspace": {
      if (state.overwrite) return state;
      const next = state.display.length > 1 ? state.display.slice(0, -1) : "0";
      return { ...state, display: next === "-" || next === "" ? "0" : next };
    }

    case "operator": {
      const current = Number.parseFloat(state.display);
      if (state.pendingOperator !== null && state.accumulator !== null && !state.overwrite) {
        const result = applyOperator(state.accumulator, state.pendingOperator, current);
        if (!Number.isFinite(result)) return toError(state);
        return {
          ...state,
          display: formatCalculatorNumber(result),
          accumulator: result,
          pendingOperator: action.value,
          overwrite: true
        };
      }
      return { ...state, accumulator: current, pendingOperator: action.value, overwrite: true };
    }

    case "equals": {
      if (state.pendingOperator === null || state.accumulator === null) return state;
      const current = Number.parseFloat(state.display);
      const result = applyOperator(state.accumulator, state.pendingOperator, current);
      if (!Number.isFinite(result)) return toError(state);
      return {
        ...state,
        display: formatCalculatorNumber(result),
        accumulator: null,
        pendingOperator: null,
        overwrite: true
      };
    }
  }
}

// Grades that default to the scientific layout (upper-secondary, where trig / logs
// / exponentials are core). Everyone can still toggle modes manually.
const scientificDefaultGrades = new Set<GradeId>(["S3", "S4", "S5", "S6"]);

export type CalculatorMode = "basic" | "scientific";

export function defaultCalculatorMode(grade: GradeId | undefined): CalculatorMode {
  return grade && scientificDefaultGrades.has(grade) ? "scientific" : "basic";
}
