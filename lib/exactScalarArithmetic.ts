import { isAnswerWithinLengthLimit } from "@/lib/answerLimits";

export type ExactScalar = {
  readonly numerator: bigint;
  readonly denominator: bigint;
};

const maxSafeMagnitude = BigInt(Number.MAX_SAFE_INTEGER);
const maxCanonicalDecimalPlaces = 100;
const zero = BigInt(0);
const one = BigInt(1);
const negativeOne = BigInt(-1);
const two = BigInt(2);
const five = BigInt(5);
const ten = BigInt(10);

function absolute(value: bigint) {
  return value < zero ? -value : value;
}

function greatestCommonDivisor(left: bigint, right: bigint) {
  let a = absolute(left);
  let b = absolute(right);

  while (b !== zero) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}

function boundedScalar(numerator: bigint, denominator: bigint): ExactScalar | null {
  if (denominator === zero) return null;
  if (numerator === zero) return { numerator: zero, denominator: one };

  const sign = denominator < zero ? negativeOne : one;
  const divisor = greatestCommonDivisor(numerator, denominator);
  const normalized = {
    numerator: (numerator / divisor) * sign,
    denominator: absolute(denominator / divisor)
  };

  // Keep every parsed literal and intermediate result inside the exact range
  // promised by the answer matcher. Anything larger fails closed.
  if (absolute(normalized.numerator) > maxSafeMagnitude * normalized.denominator) return null;
  return normalized;
}

function add(left: ExactScalar, right: ExactScalar, direction: bigint) {
  return boundedScalar(
    left.numerator * right.denominator + direction * right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

function multiply(left: ExactScalar, right: ExactScalar) {
  return boundedScalar(left.numerator * right.numerator, left.denominator * right.denominator);
}

function divide(left: ExactScalar, right: ExactScalar) {
  if (right.numerator === zero) return null;
  return boundedScalar(left.numerator * right.denominator, left.denominator * right.numerator);
}

function decimalLiteral(value: string) {
  const [integerPart = "", fractionalPart = ""] = value.split(".");
  const digits = `${integerPart || "0"}${fractionalPart}`;
  const denominator = ten ** BigInt(fractionalPart.length);
  return boundedScalar(BigInt(digits || "0"), denominator);
}

function isScalarArithmeticExpressionCandidate(expression: string) {
  return Boolean(expression) && /^[\d\s.+\-*/×÷()−]+$/.test(expression);
}

function isBoundedScalarArithmeticCandidate(expression: string) {
  return isAnswerWithinLengthLimit(expression) && isScalarArithmeticExpressionCandidate(expression);
}

export function evaluateExactScalarArithmetic(expression: string): ExactScalar | null {
  if (!isBoundedScalarArithmeticCandidate(expression)) return null;

  const source = expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  let index = 0;

  function skipWhitespace() {
    while (/\s/.test(source[index] ?? "")) index += 1;
  }

  function parseExpression(): ExactScalar | null {
    let value = parseTerm();
    if (value === null) return null;

    for (;;) {
      skipWhitespace();
      const operator = source[index];
      if (operator !== "+" && operator !== "-") return value;
      index += 1;

      const right = parseTerm();
      if (right === null) return null;
      value = add(value, right, operator === "+" ? one : negativeOne);
      if (value === null) return null;
    }
  }

  function parseTerm(): ExactScalar | null {
    let value = parseUnary();
    if (value === null) return null;

    for (;;) {
      skipWhitespace();
      const operator = source[index];
      if (operator !== "*" && operator !== "/") return value;
      index += 1;

      const right = parseUnary();
      if (right === null) return null;
      value = operator === "*" ? multiply(value, right) : divide(value, right);
      if (value === null) return null;
    }
  }

  function parseUnary(): ExactScalar | null {
    skipWhitespace();
    const operator = source[index];
    if (operator === "+" || operator === "-") {
      index += 1;
      const value = parseUnary();
      if (value === null || operator === "+") return value;
      return { numerator: -value.numerator, denominator: value.denominator };
    }
    return parsePrimary();
  }

  function parsePrimary(): ExactScalar | null {
    skipWhitespace();

    if (source[index] === "(") {
      index += 1;
      const value = parseExpression();
      skipWhitespace();
      if (value === null || source[index] !== ")") return null;
      index += 1;
      return value;
    }

    const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!match) return null;
    index += match[0].length;
    return decimalLiteral(match[0]);
  }

  const result = parseExpression();
  skipWhitespace();
  return result !== null && index === source.length ? result : null;
}

/**
 * Returns null when either side is not in the strict scalar-arithmetic grammar.
 * Once both sides are in that grammar, malformed, unsafe, or unequal input is
 * false so callers cannot fall back to lossy Number arithmetic.
 */
export function exactScalarArithmeticExpressionsEqual(left: string, right: string): boolean | null {
  if (!isBoundedScalarArithmeticCandidate(left) || !isBoundedScalarArithmeticCandidate(right)) return null;

  const leftValue = evaluateExactScalarArithmetic(left);
  const rightValue = evaluateExactScalarArithmetic(right);
  if (leftValue === null || rightValue === null) return false;

  return leftValue.numerator * rightValue.denominator === rightValue.numerator * leftValue.denominator;
}

export function formatExactScalarAsTerminatingDecimal(value: ExactScalar): string | null {
  const normalized = boundedScalar(value.numerator, value.denominator);
  if (normalized === null) return null;
  if (normalized.denominator === one) return String(normalized.numerator);

  let remaining = normalized.denominator;
  let powersOfTwo = 0;
  let powersOfFive = 0;

  while (remaining % two === zero) {
    remaining /= two;
    powersOfTwo += 1;
  }
  while (remaining % five === zero) {
    remaining /= five;
    powersOfFive += 1;
  }

  if (remaining !== one) return null;
  const decimalPlaces = Math.max(powersOfTwo, powersOfFive);
  if (decimalPlaces > maxCanonicalDecimalPlaces) return null;

  const multiplier =
    (two ** BigInt(decimalPlaces - powersOfTwo)) *
    (five ** BigInt(decimalPlaces - powersOfFive));
  const scaledNumerator = normalized.numerator * multiplier;
  const sign = scaledNumerator < zero ? "-" : "";
  const digits = absolute(scaledNumerator).toString().padStart(decimalPlaces + 1, "0");
  const integerPart = digits.slice(0, -decimalPlaces) || "0";
  const fractionalPart = digits.slice(-decimalPlaces).replace(/0+$/, "");
  return fractionalPart ? `${sign}${integerPart}.${fractionalPart}` : `${sign}${integerPart}`;
}
