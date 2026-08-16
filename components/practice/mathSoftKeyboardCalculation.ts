type Rational = {
  denominator: bigint;
  numerator: bigint;
};

type EvaluatedArithmetic = {
  exact: Rational;
  graderValue: number;
};

const graderEquationTolerance = 0.000001;
const maxExpressionLength = 512;
const maxFormattedAnswerLength = 160;
const maxFormattedDecimalPlaces = 128;
const maxIntermediateRationalDigits = 512;
const maxNumericLiteralDigits = 128;
const maxParserDepth = 32;
const maxParserSteps = 256;
const maxRationalDigits = 256;
const maxSafeMagnitude = BigInt(Number.MAX_SAFE_INTEGER);
const zero = BigInt(0);
const one = BigInt(1);
const two = BigInt(2);
const five = BigInt(5);
const ten = BigInt(10);

function absoluteBigInt(value: bigint) {
  return value < zero ? -value : value;
}

function bigIntDigitCount(value: bigint) {
  return absoluteBigInt(value).toString().length;
}

function greatestCommonDivisor(left: bigint, right: bigint) {
  let a = absoluteBigInt(left);
  let b = absoluteBigInt(right);

  while (b !== zero) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a || one;
}

function boundedRational(numerator: bigint, denominator: bigint): Rational {
  if (denominator === zero) throw new Error("Division by zero");
  if (
    bigIntDigitCount(numerator) > maxIntermediateRationalDigits ||
    bigIntDigitCount(denominator) > maxIntermediateRationalDigits
  ) throw new Error("Rational resource limit exceeded");

  const sign = denominator < zero ? -one : one;
  const positiveDenominator = denominator * sign;
  const signedNumerator = numerator * sign;
  const divisor = greatestCommonDivisor(signedNumerator, positiveDenominator);
  const reduced = {
    denominator: positiveDenominator / divisor,
    numerator: signedNumerator / divisor
  };

  if (
    bigIntDigitCount(reduced.numerator) > maxRationalDigits ||
    bigIntDigitCount(reduced.denominator) > maxRationalDigits
  ) throw new Error("Rational resource limit exceeded");

  return reduced;
}

function addRationals(left: Rational, right: Rational) {
  return boundedRational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

function subtractRationals(left: Rational, right: Rational) {
  return boundedRational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

function multiplyRationals(left: Rational, right: Rational) {
  return boundedRational(left.numerator * right.numerator, left.denominator * right.denominator);
}

function divideRationals(left: Rational, right: Rational) {
  if (right.numerator === zero) throw new Error("Division by zero");
  return boundedRational(left.numerator * right.denominator, left.denominator * right.numerator);
}

function numericLiteralIsUnsafe(literal: string) {
  const numericDigitCount = literal.replace(".", "").length;
  if (numericDigitCount > maxNumericLiteralDigits) return true;

  const [wholePart = "", fractionPart] = literal.split(".");
  const wholeValue = BigInt(wholePart || "0");
  const hasNonZeroFraction = /[1-9]/.test(fractionPart ?? "");

  // Signs are separate grammar tokens, so the unsigned whole part is the
  // literal's absolute magnitude. A fraction above MAX_SAFE is unsafe too.
  if (
    wholeValue > maxSafeMagnitude ||
    (wholeValue === maxSafeMagnitude && hasNonZeroFraction)
  ) return true;

  const numberValue = Number(literal);
  if (!Number.isFinite(numberValue)) return true;
  if (hasNonZeroFraction && Number.isInteger(numberValue)) return true;

  return fractionPart === undefined && !Number.isSafeInteger(numberValue);
}

function decimalLiteralToRational(literal: string) {
  const [wholePart = "", fractionPart = ""] = literal.split(".");
  const combinedDigits = `${wholePart || "0"}${fractionPart}`.replace(/^0+(?=\d)/, "") || "0";
  return boundedRational(BigInt(combinedDigits), ten ** BigInt(fractionPart.length));
}

function applyBinaryOperator(
  left: EvaluatedArithmetic,
  right: EvaluatedArithmetic,
  operator: "+" | "-" | "*" | "/"
): EvaluatedArithmetic {
  if (operator === "+") {
    return { exact: addRationals(left.exact, right.exact), graderValue: left.graderValue + right.graderValue };
  }
  if (operator === "-") {
    return { exact: subtractRationals(left.exact, right.exact), graderValue: left.graderValue - right.graderValue };
  }
  if (operator === "*") {
    return { exact: multiplyRationals(left.exact, right.exact), graderValue: left.graderValue * right.graderValue };
  }
  return { exact: divideRationals(left.exact, right.exact), graderValue: left.graderValue / right.graderValue };
}

function evaluateBoundedArithmetic(expression: string): EvaluatedArithmetic | null {
  if (expression.length > maxExpressionLength) return null;

  const input = expression
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
  if (!input || input.length > maxExpressionLength) return null;

  let index = 0;
  let steps = 0;
  const peek = () => input[index] ?? "";
  const takeStep = () => {
    steps += 1;
    if (steps > maxParserSteps) throw new Error("Parser resource limit exceeded");
  };

  function parseNumber(): EvaluatedArithmetic {
    const match = input.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!match) throw new Error("Expected number");

    const literal = match[0];
    takeStep();
    index += literal.length;
    if (numericLiteralIsUnsafe(literal)) throw new Error("Unsafe numeric literal");

    return {
      exact: decimalLiteralToRational(literal),
      graderValue: Number(literal)
    };
  }

  function parseFactor(depth: number): EvaluatedArithmetic {
    if (depth > maxParserDepth) throw new Error("Parser depth exceeded");

    if (peek() === "+") {
      takeStep();
      index += 1;
      return parseFactor(depth + 1);
    }
    if (peek() === "-") {
      takeStep();
      index += 1;
      const value = parseFactor(depth + 1);
      return {
        exact: { denominator: value.exact.denominator, numerator: -value.exact.numerator },
        graderValue: -value.graderValue
      };
    }
    if (peek() === "(") {
      takeStep();
      index += 1;
      const value = parseExpression(depth + 1);
      if (peek() !== ")") throw new Error("Expected closing parenthesis");
      takeStep();
      index += 1;
      return value;
    }

    return parseNumber();
  }

  function parseTerm(depth: number): EvaluatedArithmetic {
    let value = parseFactor(depth);

    while (peek() === "*" || peek() === "/") {
      const operator = peek() as "*" | "/";
      takeStep();
      index += 1;
      value = applyBinaryOperator(value, parseFactor(depth), operator);
    }

    return value;
  }

  function parseExpression(depth: number): EvaluatedArithmetic {
    let value = parseTerm(depth);

    while (peek() === "+" || peek() === "-") {
      const operator = peek() as "+" | "-";
      takeStep();
      index += 1;
      value = applyBinaryOperator(value, parseTerm(depth), operator);
    }

    return value;
  }

  try {
    const result = parseExpression(0);
    return index === input.length ? result : null;
  } catch {
    return null;
  }
}

function isGraderCompatibleArithmetic(value: string) {
  // answerMatching validates this same ordinary-arithmetic family before it
  // extracts an equation's RHS. Scientific notation and functions stay on the
  // literal-equals path.
  if (!/^[\d\s.+\-*/×÷()−]+$/.test(value)) return false;

  // The server answer matcher requires explicit multiplication operators.
  const compact = value.replace(/\s+/g, "");
  return !/[\d.]\(|\)[\d.(]/.test(compact);
}

function terminatingDecimalScale(denominator: bigint) {
  let remaining = denominator;
  let twos = 0;
  let fives = 0;

  while (remaining % two === zero) {
    remaining /= two;
    twos += 1;
  }
  while (remaining % five === zero) {
    remaining /= five;
    fives += 1;
  }

  return remaining === one ? Math.max(twos, fives) : null;
}

function formatTerminatingRational(value: Rational, scale: number): string | null {
  if (scale > maxFormattedDecimalPlaces) return null;
  if (scale === 0) {
    const integer = value.numerator.toString();
    return integer.length <= maxFormattedAnswerLength ? integer : null;
  }

  let remaining = value.denominator;
  let twos = 0;
  let fives = 0;
  while (remaining % two === zero) {
    remaining /= two;
    twos += 1;
  }
  while (remaining % five === zero) {
    remaining /= five;
    fives += 1;
  }

  const scaledNumerator = value.numerator *
    (two ** BigInt(scale - twos)) *
    (five ** BigInt(scale - fives));
  const sign = scaledNumerator < zero ? "-" : "";
  const digits = absoluteBigInt(scaledNumerator).toString().padStart(scale + 1, "0");
  const integerPart = digits.slice(0, digits.length - scale) || "0";
  const fractionPart = digits.slice(-scale).replace(/0+$/, "");
  const formatted = fractionPart ? `${sign}${integerPart}.${fractionPart}` : `${sign}${integerPart}`;
  return formatted.length <= maxFormattedAnswerLength ? formatted : null;
}

function formatApproximateRational(value: Rational): string | null {
  const approximation = Number(value.numerator) / Number(value.denominator);
  if (!Number.isFinite(approximation)) return null;

  const raw = String(approximation);
  const rounded = Number(approximation.toFixed(12));
  if (rounded === 0 && approximation !== 0) return /e/i.test(raw) ? null : raw;

  const tolerance = Number.EPSILON * Math.abs(approximation) * 4;
  const formatted = Math.abs(rounded - approximation) <= tolerance ? String(rounded) : raw;
  return /e/i.test(formatted) ? null : formatted;
}

function formatExactResult(value: Rational): string | null {
  if (absoluteBigInt(value.numerator) > maxSafeMagnitude * value.denominator) return null;

  const decimalScale = terminatingDecimalScale(value.denominator);
  if (decimalScale === null) return formatApproximateRational(value);

  const formatted = formatTerminatingRational(value, decimalScale);
  if (formatted === null) return null;

  // Preserve the former no-op contract for tiny values whose normal Number
  // presentation uses exponent notation; the existing scalar grader rejects it.
  const legacyPreview = Number(formatted);
  return Number.isFinite(legacyPreview) && !/e/i.test(String(legacyPreview)) ? formatted : null;
}

function graderAcceptsEquation(graderValue: number, formattedResult: string) {
  const rightValue = Number(formattedResult);
  return Number.isFinite(graderValue) &&
    Number.isFinite(rightValue) &&
    Math.abs(graderValue - rightValue) < graderEquationTolerance;
}

/**
 * Resolve an answer-entry expression with exact bounded rational arithmetic.
 * A Number companion mirrors the current grader only as a compatibility gate;
 * it never determines the mathematical result. `null` keeps literal equals.
 */
export function calculateMathKeyboardAnswer(value: string): string | null {
  if (value.length > maxExpressionLength) return null;

  const trimmed = value.trim();
  const expression = trimmed.endsWith("=") ? trimmed.slice(0, -1).trimEnd() : trimmed;
  if (!expression || expression.includes("=") || !isGraderCompatibleArithmetic(expression)) return null;

  const evaluated = evaluateBoundedArithmetic(expression);
  if (evaluated === null) return null;

  const formatted = formatExactResult(evaluated.exact);
  return formatted !== null && graderAcceptsEquation(evaluated.graderValue, formatted)
    ? `${expression}=${formatted}`
    : null;
}
