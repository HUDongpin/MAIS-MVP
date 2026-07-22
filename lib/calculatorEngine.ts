// Pure, dependency-free engine for the in-app calculator (the "calculator allowed"
// accommodation). Immediate-execution semantics like a standard pocket calculator
// (left-to-right, no operator precedence), which is what students expect from an
// on-screen calculator. Kept separate from the UI so the arithmetic is unit-tested.

export type CalculatorOperator = "+" | "-" | "×" | "÷";

export type CalculatorState = {
  display: string;
  accumulator: number | null;
  pendingOperator: CalculatorOperator | null;
  // When true, the next digit/decimal starts a fresh number rather than appending.
  overwrite: boolean;
  error: boolean;
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
  | { type: "sqrt" };

export const initialCalculatorState: CalculatorState = {
  display: "0",
  accumulator: null,
  pendingOperator: null,
  overwrite: true,
  error: false
};

const errorState: CalculatorState = {
  display: "Error",
  accumulator: null,
  pendingOperator: null,
  overwrite: true,
  error: true
};

const maxDigits = 12;

// Trim binary floating-point noise (0.1 + 0.2 -> 0.3) and cap precision, while
// signalling non-finite results as an error.
export function formatCalculatorNumber(value: number): string {
  if (!Number.isFinite(value)) return "Error";
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
  }
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  // Once in an error state only "clear" recovers.
  if (state.error && action.type !== "clear") return state;

  switch (action.type) {
    case "clear":
      return initialCalculatorState;

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

    case "sqrt": {
      const value = Number.parseFloat(state.display);
      if (value < 0) return errorState;
      return { ...state, display: formatCalculatorNumber(Math.sqrt(value)), overwrite: true };
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
        if (!Number.isFinite(result)) return errorState;
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
      if (!Number.isFinite(result)) return errorState;
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
