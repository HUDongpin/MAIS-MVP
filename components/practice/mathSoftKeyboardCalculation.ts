import { evaluateExpression } from "@/lib/expressionCalculator";

const maxSafeIntegerLiteral = BigInt(Number.MAX_SAFE_INTEGER);

function containsUnsafeNumericLiteral(value: string) {
  const numericLiterals = value.match(/(?:\d+(?:\.\d*)?|\.\d+)/g) ?? [];

  return numericLiterals.some((literal) => {
    const [wholePart = "", fractionPart] = literal.split(".");
    const wholeValue = BigInt(wholePart || "0");
    const hasNonZeroFraction = /[1-9]/.test(fractionPart ?? "");

    // Signs are separate grammar tokens, so this unsigned whole part is the
    // literal's absolute magnitude. A fraction above MAX_SAFE is unsafe too.
    if (
      wholeValue > maxSafeIntegerLiteral ||
      (wholeValue === maxSafeIntegerLiteral && hasNonZeroFraction)
    ) return true;

    const numberValue = Number(literal);
    if (hasNonZeroFraction && Number.isInteger(numberValue)) return true;

    return fractionPart === undefined && !Number.isSafeInteger(numberValue);
  });
}

function isGraderCompatibleArithmetic(value: string) {
  // answerMatching validates this same ordinary-arithmetic family before it
  // extracts an equation's RHS. Keep auto-completion inside that contract;
  // scientific functions and notation remain available as literal input.
  if (!/^[\d\s.+\-*/×÷()−]+$/.test(value)) return false;

  // expressionCalculator supports implicit multiplication, while the server
  // answer matcher deliberately requires an explicit multiplication operator.
  // Do not auto-complete an equation the grader cannot subsequently validate.
  const compact = value.replace(/\s+/g, "");
  return !/[\d.]\(|\)[\d.(]/.test(compact);
}

/**
 * Keep submitted answers faithful to the evaluated Number. Safe integers and
 * very small non-zero values are never truncated; the only normalization is a
 * tightly bounded 12-decimal candidate for familiar binary tails such as
 * 0.30000000000000004.
 */
function formatAnswerResult(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  if (Number.isInteger(value)) return Number.isSafeInteger(value) ? String(value) : null;

  const raw = String(value);
  const rounded = Number(value.toFixed(12));
  if (rounded === 0 && value !== 0) return raw;

  const tolerance = Number.EPSILON * Math.abs(value) * 4;
  return Math.abs(rounded - value) <= tolerance ? String(rounded) : raw;
}

/**
 * Resolve an answer-entry expression using the same safe parser as the in-app
 * calculator. `null` deliberately means "do not calculate"; the caller keeps
 * legacy equals insertion for formulas while preserving an existing equals.
 */
export function calculateMathKeyboardAnswer(value: string): string | null {
  const trimmed = value.trim();
  const expression = trimmed.endsWith("=") ? trimmed.slice(0, -1).trimEnd() : trimmed;
  if (
    !expression ||
    expression.includes("=") ||
    !isGraderCompatibleArithmetic(expression) ||
    containsUnsafeNumericLiteral(expression)
  ) return null;

  // The parser requires an angle mode, but the restricted grammar above has no
  // angle-sensitive tokens, so the mode cannot affect an accepted expression.
  const result = evaluateExpression(expression.replace(/\s+/g, ""), "rad");
  if (result === null) return null;

  const formatted = formatAnswerResult(result);
  // The existing scalar-answer parser does not accept exponent notation.
  return formatted === null || /e/i.test(formatted) ? null : `${expression}=${formatted}`;
}
