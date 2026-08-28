import type { LocalizedText } from "@/types";

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

const knownAnswerUnitWords = new Set([
  "blocks",
  "buttons",
  "cards",
  "cm",
  "counters",
  "cubes",
  "degrees",
  "degree",
  "dollars",
  "g",
  "grams",
  "items",
  "kg",
  "km",
  "l",
  "m",
  "minutes",
  "ml",
  "mm",
  "pencils",
  "shells",
  "side",
  "sides",
  "stickers",
  "tiles",
  "units"
]);

// Hong Kong packs write the unit into the answer key in Chinese ("25厘米"), and
// a learner reasonably types the bare number. stripKnownUnitSuffix only knows
// English unit words, so the Chinese tail is handled separately. Longest units
// first so "平方厘米" is not partially consumed as "厘米".
const CHINESE_ANSWER_UNIT_PATTERN =
  /(平方厘米|立方厘米|平方毫米|立方毫米|平方公尺|平方公分|平方米|立方米|平方公里|厘米|毫米|公里|千米|公斤|公升|毫升|分鐘|小時|港幣|人民幣|元|毫|仙|角|度|升|米|克|噸|秒|隻|個|本|人|歲|次|份|條|塊|張|枝|支|盒|袋|杯|瓶|組|件|面|棵|朵|輛|架|臺|台)$/;

function chineseUnitOf(value: string) {
  return value.trim().match(CHINESE_ANSWER_UNIT_PATTERN)?.[0] ?? null;
}

/**
 * Drops a Chinese unit tail, but only when it is the unit the answer key itself
 * uses. Stripping any unit from both sides would make "25公斤" match a key of
 * "25厘米" — the learner would be credited for the wrong unit. Anchoring on the
 * key's unit keeps the bare number correct while a mismatched unit stays wrong.
 */
function stripChineseUnitSuffix(value: string, unit: string | null) {
  if (!unit) return null;
  const trimmed = value.trim();
  if (!trimmed.endsWith(unit) || trimmed === unit) return null;
  const stripped = trimmed.slice(0, trimmed.length - unit.length).trim();
  return stripped || null;
}

// NOTE: publisher keys also carry bilingual glosses — "東北 (Northeast)",
// "120 (元/dollars)". Splitting those in the matcher is deliberately NOT done
// here: distractors are routinely written as the key plus a parenthetical label
// ("89°（少一步）", "(2,2) (one step short)"), and no syntactic rule separates a
// gloss from such a label. Treating them alike makes a distractor grade correct
// and trips the ambiguous-mc gate. Glossed keys are normalised in the data pack
// instead, where the intent is known.

// Answer keys imported from publisher packs are stored as display LaTeX rather
// than as values, so "\frac{2}{3}" has to read as the "2/3" a learner types.
// Expanded before whitespace collapsing so a mixed number keeps the single
// space ("2\frac{1}{4}" -> "2 1/4") that parseMixedNumber depends on.
function expandLatexFractions(value: string) {
  let expanded = value;
  for (let pass = 0; pass < 6; pass += 1) {
    const next = expanded
      .replace(/(\d)\s*\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1 $2/$3")
      .replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2");
    if (next === expanded) break;
    expanded = next;
  }
  return expanded;
}

export function normalizeAnswer(value: string) {
  const latexExpanded = expandLatexFractions(
    value
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/[−–—]/g, "-")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/\\left|\\right/g, "")
      .replace(/\\[()[\]]/g, "")
      .replace(/\\,|\\!|\\;/g, " ")
      .replace(/\\text\{([^{}]+)\}/g, "$1")
      .replace(/\\(?:mathbf|mathrm|boxed|bf|rm)\{([^{}]+)\}/g, "$1")
      .replace(/\\times/g, "*")
      .replace(/\\div/g, "/")
      .replace(/\^\{([^{}]+)\}/g, "^$1")
  );

  return latexExpanded
    .replace(/\s+/g, " ")
    .replace(/\s*([=,+\-*/:^()])\s*/g, "$1")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*°\s*/g, "°")
    .replace(/\bhk\s*\$\s*/g, "hk$")
    .replace(/\$\s*/g, "$")
    .trim();
}

function stripKnownUnitSuffix(value: string) {
  const spaced = value.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = spaced.split(" ").filter(Boolean);
  while (tokens.length > 1 && knownAnswerUnitWords.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(" ");
}

function parseEnglishNumberWords(value: string) {
  const compact = stripKnownUnitSuffix(value)
    .replace(/-/g, " ")
    .replace(/\band\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!compact) return null;

  const tokens = compact.split(" ");
  let total = 0;
  let current = 0;
  let consumed = false;

  for (const token of tokens) {
    if (token === "hundred") {
      current = Math.max(1, current) * 100;
      consumed = true;
      continue;
    }

    const valueForToken = numberWordValues[token];
    if (typeof valueForToken !== "number") return null;
    current += valueForToken;
    consumed = true;
  }

  return consumed ? total + current : null;
}

function parseNumberToken(value: string) {
  const compact = stripKnownUnitSuffix(value).replace(/\s+/g, "").trim();
  if (/^-?\d+(?:\.\d+)?$/.test(compact)) return Number(compact);
  return parseEnglishNumberWords(value);
}

function parsePhraseFraction(value: string) {
  const compact = stripKnownUnitSuffix(value)
    .replace(/-/g, " ")
    .replace(/\band\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const phrase = compact.match(/^(.+?)\s+out\s+of\s+(.+)$/);
  if (!phrase) return null;

  const numerator = parseNumberToken(phrase[1]);
  const denominator = parseNumberToken(phrase[2]);
  if (numerator === null || denominator === null || denominator === 0) return null;

  return {
    denominator,
    numerator,
    scalar: numerator / denominator
  };
}

function parseMixedNumber(value: string) {
  // "7 1/2" means 7 + 1/2. Whitespace-collapsing turns it into 71/2, a
  // different number, so mixed numbers must be handled before any collapse.
  // NOTE: not stripKnownUnitSuffix — it rewrites "-" to a space, which would
  // destroy the sign of "-7 1/2".
  const tokens = value
    .replace(/(?:cm\^2|cm2|cm\^3|cm3|cm|ml|l|km\/h|kmh|km|°|%)$/i, "")
    .trim()
    .split(/\s+/);
  while (tokens.length > 1 && knownAnswerUnitWords.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  const withoutUnits = tokens.join(" ");
  const mixed = withoutUnits.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (!mixed) return null;
  const whole = Number(mixed[1]);
  const numerator = Number(mixed[2]);
  const denominator = Number(mixed[3]);
  if (denominator === 0 || numerator >= denominator) return null;
  const sign = mixed[1].trim().startsWith("-") ? -1 : 1;
  return whole + sign * (numerator / denominator);
}

function improperFractionForMixed(value: string) {
  const mixed = value.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (!mixed) return null;
  const numerator = Number(mixed[2]);
  const denominator = Number(mixed[3]);
  if (denominator === 0 || numerator >= denominator) return null;
  const improperNumerator = Math.abs(Number(mixed[1])) * denominator + numerator;
  return `${mixed[1].trim().startsWith("-") ? "-" : ""}${improperNumerator}/${denominator}`;
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

function safeEvaluateArithmeticExpression(expression: string) {
  const input = expression.replace(/\s+/g, "");
  if (!/^[\d+\-*/().]+$/.test(input)) return null;

  let index = 0;
  const peek = () => input[index] ?? "";
  const consume = () => input[index++] ?? "";

  function parseNumber() {
    const start = index;
    while (/\d|\./.test(peek())) consume();
    if (start === index) return null;
    const value = Number(input.slice(start, index));
    return Number.isFinite(value) ? value : null;
  }

  function parseFactor(): number | null {
    if (peek() === "+") {
      consume();
      return parseFactor();
    }
    if (peek() === "-") {
      consume();
      const value = parseFactor();
      return value === null ? null : -value;
    }
    if (peek() === "(") {
      consume();
      const value = parseExpression();
      if (peek() !== ")") return null;
      consume();
      return value;
    }
    return parseNumber();
  }

  function parseTerm() {
    let value = parseFactor();
    if (value === null) return null;

    while (peek() === "*" || peek() === "/") {
      const operator = consume();
      const next = parseFactor();
      if (next === null || (operator === "/" && next === 0)) return null;
      value = operator === "*" ? value * next : value / next;
    }

    return value;
  }

  function parseExpression() {
    let value = parseTerm();
    if (value === null) return null;

    while (peek() === "+" || peek() === "-") {
      const operator = consume();
      const next = parseTerm();
      if (next === null) return null;
      value = operator === "+" ? value + next : value - next;
    }

    return value;
  }

  const value = parseExpression();
  return value !== null && index === input.length ? value : null;
}

function answerCandidateStrings(value: string) {
  const normalized = normalizeAnswer(value);
  const candidates = new Set([normalized]);

  const wrapped = unwrapFinalAnswerNotation(normalized);
  if (wrapped && wrapped !== normalized) candidates.add(wrapped);

  const equationIndex = normalized.lastIndexOf("=");
  if (equationIndex !== -1) {
    const left = unwrapFinalAnswerNotation(normalized.slice(0, equationIndex));
    const right = unwrapFinalAnswerNotation(normalized.slice(equationIndex + 1));
    const leftValue = safeEvaluateArithmeticExpression(left);
    const rightValue = parseScalarAnswer(right);
    if (leftValue !== null && rightValue !== null && Math.abs(leftValue - rightValue) < 0.000001) {
      candidates.add(right);
    }
  }

  return candidates;
}

function normalizedAnswerVariants(value: string, chineseUnit: string | null = null) {
  const variants = new Set<string>();

  for (const normalized of answerCandidateStrings(value)) {
    variants.add(normalized);

    // "25厘米" — the bare number is the same answer.
    const withoutChineseUnit = stripChineseUnitSuffix(normalized, chineseUnit);
    if (withoutChineseUnit) variants.add(withoutChineseUnit);

    // A single terminal period is sentence punctuation, not answer content
    // ("marker.", "f.", "1.5.") — offer the stripped form as a variant.
    if (normalized.length > 1 && normalized.endsWith(".") && !normalized.endsWith("..")) {
      variants.add(normalized.slice(0, -1));
    }

    // For mixed numbers the collapsed string ("13/7" from "1 3/7") is a
    // different value — offer the true improper fraction instead.
    const improper = improperFractionForMixed(normalized);
    if (improper) variants.add(improper);
    else variants.add(normalized.replace(/\s+/g, ""));

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

    const phraseFraction = parsePhraseFraction(normalized);
    if (phraseFraction) {
      variants.add(String(phraseFraction.scalar));
      if (Number.isInteger(phraseFraction.numerator) && Number.isInteger(phraseFraction.denominator)) {
        variants.add(`${phraseFraction.numerator}/${phraseFraction.denominator}`);
      }
    }
  }

  return variants;
}

export function parseScalarAnswer(value: string, chineseUnit: string | null = null) {
  const unwrapped = unwrapFinalAnswerNotation(normalizeAnswer(value));
  const normalizedText = stripChineseUnitSuffix(unwrapped, chineseUnit) ?? unwrapped;
  const englishNumber = parseEnglishNumberWords(normalizedText);
  if (englishNumber !== null) return englishNumber;
  const phraseFraction = parsePhraseFraction(normalizedText);
  if (phraseFraction) return phraseFraction.scalar;
  const mixedNumber = parseMixedNumber(normalizedText);
  if (mixedNumber !== null) return mixedNumber;

  let normalized = normalizedText.replace(/\s+/g, "");
  normalized = normalized
    .replace(/^hk\$/, "")
    .replace(/^\$/, "")
    .replace(/(?:cm\^2|cm2|cm\^3|cm3|cm|ml|l|km\/h|kmh|km|°|%)$/i, "");

  // Scalar-only leniency: an explicit leading plus ("+8"), a bare trailing
  // decimal point ("8."), and digit-grouping commas ("5,523") are correct
  // ways to type a number; strip them here rather than in normalizeAnswer,
  // which also serves algebraic string forms where a sign, dot, or comma is
  // meaningful (e.g. coordinate pairs like "3,4" stay untouched — grouping
  // requires full 3-digit groups).
  normalized = normalized.replace(/^\+(?=[\d.])/, "").replace(/^(-?\d+)\.$/, "$1");
  if (/^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  }
  // A bare leading decimal point (".7", "-.5") reads as the zero-prefixed value.
  normalized = normalized.replace(/^(-?)\.(?=\d)/, "$10.");

  const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);

  const unitMatch = normalized.match(/^(-?\d+(?:\.\d+)?)([a-z]+)$/);
  if (unitMatch && knownAnswerUnitWords.has(unitMatch[2])) return Number(unitMatch[1]);

  return null;
}

export function answerMatches(selectedAnswer: string, acceptedAnswer: string) {
  // The key's own Chinese unit is the only one either side may shed, so the
  // bare number grades correct while a mismatched unit still grades wrong.
  const chineseUnit = chineseUnitOf(normalizeAnswer(acceptedAnswer));
  const selectedVariants = normalizedAnswerVariants(selectedAnswer, chineseUnit);
  const acceptedVariants = normalizedAnswerVariants(acceptedAnswer, chineseUnit);

  for (const variant of selectedVariants) {
    if (acceptedVariants.has(variant)) return true;
  }

  for (const selectedCandidate of answerCandidateStrings(selectedAnswer)) {
    const selectedNumber = parseScalarAnswer(selectedCandidate, chineseUnit);
    if (selectedNumber === null) continue;

    for (const acceptedCandidate of answerCandidateStrings(acceptedAnswer)) {
      const acceptedNumber = parseScalarAnswer(acceptedCandidate, chineseUnit);
      if (acceptedNumber !== null && Math.abs(selectedNumber - acceptedNumber) < 0.000001) return true;
    }
  }

  return false;
}

export function questionAnswerMatches(question: GradingQuestion, selectedAnswer: string) {
  const acceptedAnswers = [question.answer, ...(question.accepted_answers ?? [])];
  if (acceptedAnswers.some((answer) => answerMatches(selectedAnswer, answer))) return true;

  return (question.options ?? []).some((option) => {
    const localizedOptions = [option.en, option.zh, option.zhHans ?? ""].filter(Boolean);
    const selectedOption = localizedOptions.some((optionText) => answerMatches(selectedAnswer, optionText));
    const acceptedOption = acceptedAnswers.some((answer) =>
      localizedOptions.some((optionText) => answerMatches(answer, optionText))
    );
    return selectedOption && acceptedOption;
  });
}
