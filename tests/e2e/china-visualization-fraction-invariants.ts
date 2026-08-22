export type ExactFractionOperation = "+" | "−" | "×" | "÷";

export type ExactFractionOperationState = {
  denominator: number;
  numerator: number;
  operation: ExactFractionOperation;
  otherDenominator: number;
  otherNumerator: number;
  resultDenominator: number;
  resultNumerator: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

export function exactFractionOperationInvariantIssue(value: unknown): string | null {
  if (!isRecord(value)) return "fraction operation state is not an object";
  const integerKeys = [
    "numerator",
    "denominator",
    "otherNumerator",
    "otherDenominator",
    "resultNumerator",
    "resultDenominator"
  ] as const;
  for (const key of integerKeys) {
    if (!Number.isSafeInteger(value[key])) {
      return `${key} is not a safe integer`;
    }
  }

  const state = value as unknown as ExactFractionOperationState;
  if (!["+", "−", "×", "÷"].includes(state.operation)) {
    return `unsupported operation ${JSON.stringify(state.operation)}`;
  }
  if (state.denominator <= 0 || state.otherDenominator <= 0 || state.resultDenominator <= 0) {
    return "all normalized denominators must be positive";
  }
  if (state.operation === "÷" && state.otherNumerator === 0) {
    return "division operand numerator must be nonzero";
  }
  if (greatestCommonDivisor(state.resultNumerator, state.resultDenominator) !== 1) {
    return "result fraction is not reduced";
  }

  let left: number;
  let right: number;
  if (state.operation === "+" || state.operation === "−") {
    left = state.resultNumerator * state.denominator * state.otherDenominator;
    const signedOther = state.operation === "+" ? state.otherNumerator : -state.otherNumerator;
    right = state.resultDenominator * (
      state.numerator * state.otherDenominator + signedOther * state.denominator
    );
  } else if (state.operation === "×") {
    left = state.resultNumerator * state.denominator * state.otherDenominator;
    right = state.resultDenominator * state.numerator * state.otherNumerator;
  } else {
    left = state.resultNumerator * state.denominator * state.otherNumerator;
    right = state.resultDenominator * state.numerator * state.otherDenominator;
  }
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
    return "exact cross product exceeds the safe-integer domain";
  }
  if (left !== right) {
    return `exact rational identity failed (${left} !== ${right})`;
  }
  return null;
}
