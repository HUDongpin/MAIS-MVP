import {
  evaluateExactScalarArithmetic,
  formatExactScalarAsTerminatingDecimal
} from "@/lib/exactScalarArithmetic";
import { isAnswerWithinLengthLimit } from "@/lib/answerLimits";

/**
 * Complete strict scalar arithmetic as `expression=result`. Returning null is
 * intentional: the UI must then preserve the prior text and insert one literal
 * equals sign for symbolic, malformed, unsafe, or non-terminating expressions.
 */
export function calculateMathKeyboardAnswer(value: string): string | null {
  if (!isAnswerWithinLengthLimit(value)) return null;
  const trimmed = value.trim();
  const expression = trimmed.endsWith("=") ? trimmed.slice(0, -1).trimEnd() : trimmed;
  if (!expression || expression.includes("=")) return null;

  const exactResult = evaluateExactScalarArithmetic(expression);
  if (exactResult === null) return null;

  const formatted = formatExactScalarAsTerminatingDecimal(exactResult);
  if (formatted === null) return null;

  const completed = `${expression}=${formatted}`;
  return isAnswerWithinLengthLimit(completed) ? completed : null;
}
