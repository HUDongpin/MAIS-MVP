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
  // Full-precision numeric value behind a formatted result. Manual digit edits
  // clear this field; operation chains consume it before falling back to the
  // visible 12-digit string, preserving calculator guard digits.
  exactValue: number | null;
  accumulator: number | null;
  pendingOperator: CalculatorOperator | null;
  // When true, the next digit/decimal starts a fresh number rather than appending.
  overwrite: boolean;
  // Whether the display is a completed operand. This differs from overwrite:
  // percent, constants, and unary functions all produce a ready operand while
  // also asking the next digit to replace it.
  operandReady: boolean;
  error: boolean;
  angleMode: CalculatorAngleMode;
  // Standard-mode percent is contextual. While an operation is pending this
  // retains the entered rate (15% -> 0.15) independently from the contextual
  // amount shown on screen (100 + 15% shows 15 before equals).
  percentRate: number | null;
  // Standard calculators replay the last completed binary operation when = is
  // pressed again. A percent recipe must retain the rate, not its first amount,
  // so 100 + 15% = 115, then 150 = 172.5.
  repeatOperator: CalculatorOperator | null;
  repeatOperand: number | null;
  repeatOperandIsPercent: boolean;
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
  exactValue: null,
  accumulator: null,
  pendingOperator: null,
  overwrite: true,
  operandReady: true,
  error: false,
  angleMode: "deg",
  percentRate: null,
  repeatOperator: null,
  repeatOperand: null,
  repeatOperandIsPercent: false
};

function toError(state: CalculatorState): CalculatorState {
  return {
    display: "Error",
    exactValue: null,
    accumulator: null,
    pendingOperator: null,
    overwrite: true,
    operandReady: true,
    error: true,
    angleMode: state.angleMode,
    percentRate: null,
    repeatOperator: null,
    repeatOperand: null,
    repeatOperandIsPercent: false
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

// The display is the user's source of truth. Retain full guard digits behind a
// rounded nonzero value, but never keep a nonzero value behind a displayed zero:
// otherwise pressing √, ±, or a later operator would act on a number the learner
// cannot see.
function resolvedCalculatorValue(value: number): Pick<CalculatorState, "display" | "exactValue"> {
  const display = formatCalculatorNumber(value);
  return { display, exactValue: display === "0" ? 0 : value };
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
      {
        const radians = toRadians(x);
        if (Math.abs(Math.cos(radians)) < 1e-12) return null;
        return Math.tan(radians);
      }
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
        return { ...state, display: digit, exactValue: null, overwrite: false, operandReady: true, percentRate: null };
      }
      if (state.display === "0") {
        return { ...state, display: digit, exactValue: null, operandReady: true, percentRate: null };
      }
      // Cap the number of significant digits entered (excludes sign/decimal point).
      if (state.display.replace(/[^0-9]/g, "").length >= maxDigits) return state;
      return { ...state, display: state.display + digit, exactValue: null, operandReady: true, percentRate: null };
    }

    case "decimal": {
      if (state.overwrite) return { ...state, display: "0.", exactValue: null, overwrite: false, operandReady: true, percentRate: null };
      if (state.display.includes(".")) return state;
      return { ...state, display: state.display + ".", exactValue: null, operandReady: true, percentRate: null };
    }

    case "negate": {
      if (state.display === "0") return state;
      const negated = state.display.startsWith("-") ? state.display.slice(1) : `-${state.display}`;
      return {
        ...state,
        display: negated,
        exactValue: state.exactValue === null ? null : -state.exactValue,
        operandReady: true,
        percentRate: state.percentRate === null ? null : -state.percentRate
      };
    }

    case "percent": {
      const rate = (state.exactValue ?? Number.parseFloat(state.display)) / 100;
      if (!Number.isFinite(rate)) return toError(state);
      const value = state.accumulator !== null && (state.pendingOperator === "+" || state.pendingOperator === "-")
        ? state.accumulator * rate
        : rate;
      if (!Number.isFinite(value)) return toError(state);
      const resolved = resolvedCalculatorValue(value);
      return {
        ...state,
        ...resolved,
        overwrite: true,
        operandReady: true,
        // The entered rate is independent from its contextual amount: 0 + 15%
        // displays 0, but must still retain the 15% repeat recipe. A visible zero
        // entry, however, must never reintroduce an invisible nonzero rate.
        percentRate: state.display === "0" ? 0 : rate
      };
    }

    case "unary": {
      const result = applyUnary(action.fn, state.exactValue ?? Number.parseFloat(state.display), state.angleMode);
      if (result === null || !Number.isFinite(result)) return toError(state);
      return { ...state, ...resolvedCalculatorValue(result), overwrite: true, operandReady: true, percentRate: null };
    }

    case "constant": {
      const value = action.value === "pi" ? Math.PI : Math.E;
      return { ...state, ...resolvedCalculatorValue(value), overwrite: true, operandReady: true, percentRate: null };
    }

    case "backspace": {
      if (state.overwrite) return state;
      const next = state.display.length > 1 ? state.display.slice(0, -1) : "0";
      return { ...state, display: next === "-" || next === "" ? "0" : next, exactValue: null, operandReady: true, percentRate: null };
    }

    case "operator": {
      const current = state.exactValue ?? Number.parseFloat(state.display);
      if (
        state.pendingOperator !== null
        && state.accumulator !== null
        && state.operandReady
      ) {
        const result = applyOperator(state.accumulator, state.pendingOperator, current);
        if (!Number.isFinite(result)) return toError(state);
        const resolved = resolvedCalculatorValue(result);
        return {
          ...state,
          ...resolved,
          accumulator: resolved.exactValue,
          pendingOperator: action.value,
          overwrite: true,
          operandReady: false,
          percentRate: null,
          repeatOperator: null,
          repeatOperand: null,
          repeatOperandIsPercent: false
        };
      }
      return {
        ...state,
        exactValue: current,
        accumulator: current,
        pendingOperator: action.value,
        overwrite: true,
        operandReady: false,
        percentRate: null,
        repeatOperator: null,
        repeatOperand: null,
        repeatOperandIsPercent: false
      };
    }

    case "equals": {
      if (state.pendingOperator !== null && state.accumulator !== null) {
        const current = state.exactValue ?? Number.parseFloat(state.display);
        const result = applyOperator(state.accumulator, state.pendingOperator, current);
        if (!Number.isFinite(result)) return toError(state);
        const resolved = resolvedCalculatorValue(result);
        return {
          ...state,
          ...resolved,
          accumulator: null,
          pendingOperator: null,
          overwrite: true,
          operandReady: true,
          percentRate: null,
          repeatOperator: state.pendingOperator,
          repeatOperand: state.percentRate ?? current,
          repeatOperandIsPercent: state.percentRate !== null
        };
      }

      if (state.repeatOperator === null || state.repeatOperand === null) return state;
      const current = state.exactValue ?? Number.parseFloat(state.display);
      const replayOperand = state.repeatOperandIsPercent
        && (state.repeatOperator === "+" || state.repeatOperator === "-")
        ? current * state.repeatOperand
        : state.repeatOperand;
      const result = applyOperator(current, state.repeatOperator, replayOperand);
      if (!Number.isFinite(result)) return toError(state);
      return {
        ...state,
        ...resolvedCalculatorValue(result),
        accumulator: null,
        pendingOperator: null,
        overwrite: true,
        operandReady: true,
        percentRate: null
      };
    }
  }
}

// Grades that default to the scientific layout (upper-secondary, where trig / logs
// / exponentials are core). Everyone can still toggle modes manually.
const scientificDefaultGrades = new Set<GradeId>(["S3", "S4", "S5", "S6"]);

export type CalculatorMode = "basic" | "scientific" | "stats";

export function defaultCalculatorMode(grade: GradeId | undefined): CalculatorMode {
  return grade && scientificDefaultGrades.has(grade) ? "scientific" : "basic";
}
