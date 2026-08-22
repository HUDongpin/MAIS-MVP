import type { LocalizedText } from "@/types";
import {
  isAnswerWithinLengthLimit,
  isCuratedAnswerWithinLengthLimit
} from "@/lib/answerLimits";
import {
  isKnownAttachedAnswerUnit,
  stripAnswerUnitSuffixPreservingWhitespace
} from "@/lib/answerUnits";
import {
  evaluateExactScalarArithmetic,
  exactScalarArithmeticExpressionsEqual,
  type ExactScalar
} from "@/lib/exactScalarArithmetic";

type GradingQuestion = {
  answer: string;
  accepted_answers?: string[] | null;
  options?: LocalizedText[] | null;
};

const numberWordValues: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};

const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);
const roundedFractionToleranceScale = BigInt(1_000_000);

export function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\\[()]/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/\s+/g, " ")
    .replace(/\s*([=,+\-*/:^()])\s*/g, "$1")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*°\s*/g, "°")
    .replace(/\bhk\s*\$\s*/g, "hk$")
    .replace(/\$\s*/g, "$")
    .trim();
}

function preparePhraseTokenText(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])-(?=[a-z0-9])/gi, "$1 ")
    .replace(/(\d)-(?=[a-z])/gi, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function prepareEnglishNumberTokenText(value: string) {
  return stripAnswerUnitSuffixPreservingWhitespace(preparePhraseTokenText(value));
}

function parseUnderHundredWords(tokens: string[], allowZero = true) {
  if (tokens.length === 1) {
    const value = numberWordValues[tokens[0]];
    return typeof value === "number" && (allowZero || value !== 0) ? value : null;
  }

  if (tokens.length === 2) {
    const tens = numberWordValues[tokens[0]];
    const units = numberWordValues[tokens[1]];
    if (
      typeof tens === "number"
      && tens >= 20
      && tens % 10 === 0
      && typeof units === "number"
      && units >= 1
      && units <= 9
    ) {
      return tens + units;
    }
  }

  return null;
}

function parseEnglishNumberWords(value: string) {
  const compact = prepareEnglishNumberTokenText(value)
    .replace(/\s+/g, " ")
    .trim();
  if (!compact) return null;

  const tokens = compact.split(" ");
  const hundredIndex = tokens.indexOf("hundred");
  if (hundredIndex === -1) {
    return tokens.includes("and") ? null : parseUnderHundredWords(tokens);
  }

  const hundreds = numberWordValues[tokens[0]];
  if (
    hundredIndex !== 1
    || typeof hundreds !== "number"
    || hundreds < 1
    || hundreds > 9
    || tokens.lastIndexOf("hundred") !== hundredIndex
  ) {
    return null;
  }

  let remainderTokens = tokens.slice(2);
  if (remainderTokens.length === 0) return hundreds * 100;
  if (remainderTokens[0] === "and") remainderTokens = remainderTokens.slice(1);
  if (remainderTokens.length === 0 || remainderTokens.includes("and") || remainderTokens.includes("hundred")) {
    return null;
  }

  const remainder = parseUnderHundredWords(remainderTokens, false);
  return remainder === null ? null : hundreds * 100 + remainder;
}

function phraseFractionParts(value: string) {
  const compact = stripAnswerUnitSuffixPreservingWhitespace(preparePhraseTokenText(value))
    .replace(/\s+/g, " ")
    .trim();
  const phrase = compact.match(/^(.+?)\s+out\s+of\s+(.+)$/);
  if (!phrase) return null;
  return { numeratorText: phrase[1], denominatorText: phrase[2] };
}

function mixedNumberShape(value: string) {
  // "7 1/2" means 7 + 1/2. Whitespace-collapsing turns it into 71/2, a
  // different number, so mixed numbers must be handled before any collapse.
  const withoutUnits = stripAnswerUnitSuffixPreservingWhitespace(value);
  const mixed = withoutUnits.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (!mixed) return null;
  return {
    denominatorText: mixed[3],
    negative: mixed[1].startsWith("-"),
    numeratorText: mixed[2],
    wholeText: mixed[1]
  };
}

function mixedNumberParts(value: string) {
  const mixed = mixedNumberShape(value);
  if (!mixed) return null;
  const whole = BigInt(mixed.wholeText);
  const numerator = BigInt(mixed.numeratorText);
  const denominator = BigInt(mixed.denominatorText);
  if (denominator === BigInt(0) || numerator >= denominator) return null;
  return {
    denominator,
    negative: mixed.negative,
    numerator,
    whole,
    wholeText: mixed.wholeText
  };
}

function improperFractionForMixed(value: string) {
  const mixed = mixedNumberParts(value);
  if (!mixed) return null;
  const wholeMagnitude = mixed.whole < 0 ? -mixed.whole : mixed.whole;
  const improperNumerator = wholeMagnitude * mixed.denominator + mixed.numerator;
  if (improperNumerator > maxSafeInteger * mixed.denominator) return null;
  return `${mixed.negative ? "-" : ""}${improperNumerator}/${mixed.denominator}`;
}

function exactNumberToken(value: string) {
  if (!isAnswerWithinLengthLimit(value)) return null;
  const compact = prepareEnglishNumberTokenText(value).trim();
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(compact)) return compact;

  const words = parseEnglishNumberWords(compact);
  return words !== null && Number.isSafeInteger(words) ? String(words) : null;
}

/**
 * Converts the answer forms already supported by parseScalarAnswer into the
 * strict arithmetic grammar. Equation validation can then stay exact even
 * when the displayed result carries a known unit or uses number words.
 */
function exactScalarExpressionForAnswer(value: string) {
  if (!isAnswerWithinLengthLimit(value)) return null;
  const withoutUnitSuffix = stripAnswerUnitSuffixPreservingWhitespace(value);
  const phrase = phraseFractionParts(withoutUnitSuffix);
  if (phrase) {
    const numerator = exactNumberToken(phrase.numeratorText);
    const denominator = exactNumberToken(phrase.denominatorText);
    return numerator !== null && denominator !== null ? `(${numerator})/(${denominator})` : null;
  }

  const mixedShape = mixedNumberShape(withoutUnitSuffix);
  if (mixedShape) {
    const mixed = mixedNumberParts(withoutUnitSuffix);
    if (!mixed) return null;
    const direction = mixed.negative ? "-" : "+";
    return `${mixed.wholeText}${direction}${mixed.numerator}/${mixed.denominator}`;
  }

  let compact = withoutUnitSuffix.replace(/\s+/g, "");
  compact = compact
    .replace(/^hk\$/, "")
    .replace(/^\$/, "");

  const attachedUnit = compact.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))([a-z]+)$/);
  if (attachedUnit && isKnownAttachedAnswerUnit(attachedUnit[2])) return attachedUnit[1];
  if (/^[\d\s.+\-*/×÷()−]+$/.test(compact)) return compact;

  return exactNumberToken(withoutUnitSuffix);
}

type ExactAnswerScalar = {
  kind: "decimal" | "fraction" | "integer";
  value: ExactScalar;
};

function strictExactScalarForAnswer(value: string): ExactAnswerScalar | null {
  if (!isAnswerWithinLengthLimit(value)) return null;
  const normalizedText = unwrapFinalAnswerNotation(normalizeAnswer(value));
  const withoutUnitSuffix = stripAnswerUnitSuffixPreservingWhitespace(normalizedText);
  const phrase = phraseFractionParts(withoutUnitSuffix);
  if (phrase) {
    const numerator = exactNumberToken(phrase.numeratorText);
    const denominator = exactNumberToken(phrase.denominatorText);
    if (numerator === null || denominator === null) return null;
    const exact = evaluateExactScalarArithmetic(`(${numerator})/(${denominator})`);
    return exact === null ? null : { kind: "fraction", value: exact };
  }

  const mixedShape = mixedNumberShape(withoutUnitSuffix);
  if (mixedShape) {
    const mixed = mixedNumberParts(withoutUnitSuffix);
    if (!mixed) return null;
    const direction = mixed.negative ? "-" : "+";
    const exact = evaluateExactScalarArithmetic(
      `${mixed.wholeText}${direction}${mixed.numerator}/${mixed.denominator}`
    );
    return exact === null ? null : { kind: "fraction", value: exact };
  }

  let compact = withoutUnitSuffix.replace(/\s+/g, "");
  compact = compact
    .replace(/^hk\$/, "")
    .replace(/^\$/, "");

  const attachedUnit = compact.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))([a-z]+)$/);
  if (attachedUnit && isKnownAttachedAnswerUnit(attachedUnit[2])) compact = attachedUnit[1];

  const fraction = compact.match(
    /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\/([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/
  );
  if (fraction) {
    const exact = evaluateExactScalarArithmetic(`${fraction[1]}/${fraction[2]}`);
    return exact === null ? null : { kind: "fraction", value: exact };
  }

  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(compact)) {
    const exact = evaluateExactScalarArithmetic(compact);
    if (exact === null) return null;
    return { kind: compact.includes(".") ? "decimal" : "integer", value: exact };
  }

  const words = parseEnglishNumberWords(withoutUnitSuffix);
  if (words === null || !Number.isSafeInteger(words)) return null;
  const exact = evaluateExactScalarArithmetic(String(words));
  return exact === null ? null : { kind: "integer", value: exact };
}

function absoluteBigInt(value: bigint) {
  return value < BigInt(0) ? -value : value;
}

function exactScalarsEqual(left: ExactScalar, right: ExactScalar) {
  return left.numerator * right.denominator === right.numerator * left.denominator;
}

function exactScalarComponentsAreSafe(value: ExactScalar) {
  return absoluteBigInt(value.numerator) <= maxSafeInteger && value.denominator <= maxSafeInteger;
}

/**
 * Preserve the legacy rounded fraction/decimal compatibility without IEEE-754.
 * Approximation is allowed only between an explicit decimal and a fraction-like
 * form, only for non-zero rationals whose reduced components fit the JS safe
 * integer range, and only when the exact cross-multiplied error is below 1e-6.
 */
function exactScalarsWithinRoundedFractionTolerance(left: ExactAnswerScalar, right: ExactAnswerScalar) {
  const compatibleKinds =
    (left.kind === "fraction" && right.kind === "decimal")
    || (left.kind === "decimal" && right.kind === "fraction");
  if (!compatibleKinds) return false;
  if (!exactScalarComponentsAreSafe(left.value) || !exactScalarComponentsAreSafe(right.value)) return false;
  if (left.value.numerator === BigInt(0) || right.value.numerator === BigInt(0)) return false;

  const differenceNumerator = absoluteBigInt(
    left.value.numerator * right.value.denominator
      - right.value.numerator * left.value.denominator
  );
  const differenceDenominator = left.value.denominator * right.value.denominator;
  return differenceNumerator * roundedFractionToleranceScale < differenceDenominator;
}

function bracketsWrapEntireValue(value: string) {
  const bracketPairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const open = value[0];
  const close = bracketPairs[open];
  if (!close || value[value.length - 1] !== close) return false;

  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === open) depth += 1;
    else if (character === close) {
      depth -= 1;
      if (depth === 0) return index === value.length - 1;
    }
  }
  return false;
}

function unwrapFinalAnswerNotation(value: string) {
  let unwrapped = value
    .replace(/\\(?:textcircled|boxed|fbox)\{([^{}]+)\}/g, "$1")
    .trim();

  // Unwrap only brackets that enclose the entire value (OCR/decoration wraps
  // such as "(42)"). Interior grouping brackets are mathematically meaningful
  // and must not be stripped: "(15+5)*3" is not the same answer as "15+5*3".
  while (unwrapped.length >= 2 && bracketsWrapEntireValue(unwrapped)) {
    unwrapped = unwrapped.slice(1, -1).trim();
  }
  return unwrapped;
}

function answerCandidateStrings(value: string, allowScalarParsing = true) {
  const normalized = normalizeAnswer(value);
  const candidates = new Set([normalized]);

  const wrapped = unwrapFinalAnswerNotation(normalized);
  if (wrapped && wrapped !== normalized) candidates.add(wrapped);

  const equationIndex = normalized.lastIndexOf("=");
  if (allowScalarParsing && equationIndex !== -1) {
    const left = unwrapFinalAnswerNotation(normalized.slice(0, equationIndex));
    const right = unwrapFinalAnswerNotation(normalized.slice(equationIndex + 1));
    const exactRight = exactScalarExpressionForAnswer(right);
    if (exactRight !== null && exactScalarArithmeticExpressionsEqual(left, exactRight) === true) {
      candidates.add(right);
    }
  }

  return candidates;
}

function normalizedAnswerVariants(value: string, allowScalarParsing = true) {
  const variants = new Set<string>();

  for (const normalized of answerCandidateStrings(value, allowScalarParsing)) {
    variants.add(normalized);

    // For mixed numbers the collapsed string ("13/7" from "1 3/7") is a
    // different value — offer the true improper fraction instead.
    const equationIndex = normalized.lastIndexOf("=");
    const finalAnswer = equationIndex === -1
      ? normalized
      : unwrapFinalAnswerNotation(normalized.slice(equationIndex + 1));
    const finalAnswerHasMixedShape = mixedNumberShape(finalAnswer) !== null;
    if (finalAnswerHasMixedShape) {
      if (allowScalarParsing && equationIndex === -1) {
        const improper = improperFractionForMixed(normalized);
        if (improper) variants.add(improper);
      }
    } else {
      variants.add(normalized.replace(/\s+/g, ""));
    }

    if (normalized.startsWith("hk$")) variants.add(normalized.replace(/^hk\$/, "$"));
    if (normalized.startsWith("$")) variants.add(normalized.replace(/^\$/, "hk$"));

    const percent = normalized.match(/^(-?\d+(?:\.\d+)?)%$/);
    if (percent) {
      variants.add(percent[1]);
      variants.add(`${percent[1]}percent`);
    }

    const degree = normalized.match(/^(-?\d+(?:\.\d+)?)°$/);
    if (degree) {
      variants.add(degree[1]);
      variants.add(`${degree[1]}degree`);
      variants.add(`${degree[1]}degrees`);
    }

  }

  return variants;
}

export function parseScalarAnswer(value: string) {
  const parsed = strictExactScalarForAnswer(value);
  if (parsed === null || !exactScalarComponentsAreSafe(parsed.value)) return null;
  return Number(parsed.value.numerator) / Number(parsed.value.denominator);
}

export function answerMatches(selectedAnswer: string, acceptedAnswer: string) {
  if (!isAnswerWithinLengthLimit(selectedAnswer) || !isCuratedAnswerWithinLengthLimit(acceptedAnswer)) return false;
  const curatedAnswerAllowsScalarParsing = isAnswerWithinLengthLimit(acceptedAnswer);
  const selectedVariants = normalizedAnswerVariants(selectedAnswer);
  const acceptedVariants = normalizedAnswerVariants(acceptedAnswer, curatedAnswerAllowsScalarParsing);

  for (const variant of selectedVariants) {
    if (acceptedVariants.has(variant)) return true;
  }

  // A 501–1024-character curated alias can take part in bounded string
  // normalization above, but never reaches scalar, exact-arithmetic, or BigInt
  // parsing. Those paths retain the learner/candidate limit of 500.
  if (!curatedAnswerAllowsScalarParsing) return false;

  for (const acceptedCandidate of answerCandidateStrings(acceptedAnswer)) {
    const acceptedScalar = strictExactScalarForAnswer(acceptedCandidate);
    if (acceptedScalar === null) continue;

    for (const selectedCandidate of answerCandidateStrings(selectedAnswer)) {
      const selectedScalar = strictExactScalarForAnswer(selectedCandidate);
      if (selectedScalar === null) continue;
      if (exactScalarsEqual(selectedScalar.value, acceptedScalar.value)) return true;
      if (exactScalarsWithinRoundedFractionTolerance(selectedScalar, acceptedScalar)) return true;
    }
  }

  return false;
}

export function questionAnswerMatches(question: GradingQuestion, selectedAnswer: string) {
  if (!isAnswerWithinLengthLimit(selectedAnswer)) return false;
  // Validate trusted metadata before any normalization. One invalid alias is
  // ignored rather than poisoning otherwise valid answer metadata.
  const acceptedAnswers = [question.answer, ...(question.accepted_answers ?? [])]
    .filter(isCuratedAnswerWithinLengthLimit);
  if (acceptedAnswers.some((answer) => answerMatches(selectedAnswer, answer))) return true;

  return (question.options ?? []).some((option) => {
    const localizedOptions = [option.en, option.zh, option.zhHans ?? ""].filter(Boolean);
    const selectedOption = localizedOptions.some((optionText) => answerMatches(selectedAnswer, optionText));
    const acceptedOption = acceptedAnswers.some((answer) =>
      localizedOptions.some((optionText) => answerMatches(optionText, answer))
    );
    return selectedOption && acceptedOption;
  });
}
