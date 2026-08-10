import type { LocalizedText } from "@/types";

type GradingQuestion = {
  id?: string;
  answer: string;
  accepted_answers?: string[] | null;
  options?: LocalizedText[] | null;
  strict_answer_units?: boolean;
  strictAnswerUnits?: boolean;
  curriculum_track?: string;
  curriculumTrack?: string;
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
  "items",
  "minutes",
  "pencils",
  "shells",
  "side",
  "sides",
  "stickers",
  "tiles",
  "units"
]);

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

type AnswerUnitKey =
  | "generic-linear"
  | "generic-square"
  | "generic-cubic"
  | "degree"
  | "percent"
  | "usd"
  | "hkd"
  | "millimeter"
  | "centimeter"
  | "meter"
  | "kilometer"
  | "inch"
  | "foot"
  | "yard"
  | "mile"
  | "square-centimeter"
  | "square-meter"
  | "square-kilometer"
  | "cubic-centimeter"
  | "cubic-meter"
  | "milliliter"
  | "liter"
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "meter-per-second"
  | "kilometer-per-hour"
  | "mile-per-hour"
  | "cup"
  | "cup-per-hour"
  | "apple"
  | "balloon"
  | "block"
  | "button"
  | "card"
  | "cookie"
  | "counter"
  | "cube"
  | "factor"
  | "fish"
  | "fruit"
  | "half"
  | "interval"
  | "item"
  | "object"
  | "outcome"
  | "part"
  | "pet"
  | "pencil"
  | "response"
  | "shell"
  | "side"
  | "spot"
  | "square-count"
  | "sticker"
  | "symmetry-line"
  | "tile"
  | "vertex"
  | "vote";

const answerUnitSuffixRules: Array<{ key: AnswerUnitKey; pattern: RegExp }> = [
  { key: "cup-per-hour", pattern: /(?<![a-z])cups?\s*(?:per|\/)\s*(?:hours?|hrs?|hr|h)$/ },
  { key: "mile-per-hour", pattern: /(?<![a-z])(?:(?:miles?|mi)\s*(?:per|\/)\s*(?:hours?|hrs?|hr|h)|mph)$/ },
  { key: "kilometer-per-hour", pattern: /(?<![a-z])(?:(?:kilometers?|kilometres?|km)\s*(?:per|\/)\s*(?:hours?|hrs?|hr|h)|kmh|kph)$/ },
  { key: "meter-per-second", pattern: /(?<![a-z])(?:(?:meters?|metres?|m)\s*(?:per|\/)\s*(?:seconds?|secs?|sec|s)|mps)$/ },
  { key: "generic-square", pattern: /(?<![a-z])(?:square\s*units?|sq\.?\s*units?|unit\s*squares?)$/ },
  { key: "generic-cubic", pattern: /(?<![a-z])(?:cubic\s*units?|unit\s*cubes?)$/ },
  { key: "square-centimeter", pattern: /(?<![a-z])(?:cm(?:\^?2)|square\s*centimeters?|square\s*centimetres?|centimeters?\s*squared|centimetres?\s*squared)$/ },
  { key: "square-kilometer", pattern: /(?<![a-z])(?:km(?:\^?2)|square\s*kilometers?|square\s*kilometres?|kilometers?\s*squared|kilometres?\s*squared)$/ },
  { key: "square-meter", pattern: /(?<![a-z])(?:m(?:\^?2)|square\s*meters?|square\s*metres?|meters?\s*squared|metres?\s*squared)$/ },
  { key: "cubic-centimeter", pattern: /(?<![a-z])(?:cm(?:\^?3)|cubic\s*centimeters?|cubic\s*centimetres?|centimeters?\s*cubed|centimetres?\s*cubed)$/ },
  { key: "cubic-meter", pattern: /(?<![a-z])(?:m(?:\^?3)|cubic\s*meters?|cubic\s*metres?|meters?\s*cubed|metres?\s*cubed)$/ },
  { key: "degree", pattern: /(?<![a-z])(?:degrees?|°)$/ },
  { key: "percent", pattern: /(?<![a-z])(?:percent|%)$/ },
  { key: "hkd", pattern: /(?<![a-z])(?:hong\s*kong\s*dollars?|hkd)$/ },
  { key: "usd", pattern: /(?<![a-z])(?:u\.?s\.?\s*dollars?|dollars?|usd)$/ },
  { key: "milliliter", pattern: /(?<![a-z])(?:milliliters?|millilitres?|ml)$/ },
  { key: "liter", pattern: /(?<![a-z])(?:liters?|litres?|l)$/ },
  { key: "millimeter", pattern: /(?<![a-z])(?:millimeters?|millimetres?|mm)$/ },
  { key: "centimeter", pattern: /(?<![a-z])(?:centimeters?|centimetres?|cm)$/ },
  { key: "kilometer", pattern: /(?<![a-z])(?:kilometers?|kilometres?|km)$/ },
  { key: "meter", pattern: /(?<![a-z])(?:meters?|metres?|m)$/ },
  { key: "inch", pattern: /(?<![a-z])(?:inches|inch|in)$/ },
  { key: "foot", pattern: /(?<![a-z])(?:feet|foot|ft)$/ },
  { key: "yard", pattern: /(?<![a-z])(?:yards?|yd)$/ },
  { key: "mile", pattern: /(?<![a-z])(?:miles?|mi)$/ },
  { key: "second", pattern: /(?<![a-z])(?:seconds?|secs?|sec|s)$/ },
  { key: "minute", pattern: /(?<![a-z])(?:minutes?|mins?|min)$/ },
  { key: "hour", pattern: /(?<![a-z])(?:hours?|hrs?|hr|h)$/ },
  { key: "day", pattern: /(?<![a-z])(?:days?|d)$/ },
  { key: "cup", pattern: /(?<![a-z])cups?$/ },
  { key: "generic-linear", pattern: /(?<![a-z])units?$/ },
  { key: "symmetry-line", pattern: /(?<![a-z])(?:lines?\s+of\s+symmetry|symmetry\s+lines?)$/ },
  { key: "spot", pattern: /(?<![a-z])(?:empty\s+spots?|empty\s+spaces?|spots?|spaces?)$/ },
  { key: "fruit", pattern: /(?<![a-z])(?:pieces?\s+of\s+fruit|fruit)$/ },
  { key: "interval", pattern: /(?<![a-z])(?:quarter[-\s]inch\s+intervals?|intervals?)$/ },
  { key: "vertex", pattern: /(?<![a-z])(?:corners?|vertices|vertex)$/ },
  { key: "square-count", pattern: /(?<![a-z])squares?$/ },
  { key: "apple", pattern: /(?<![a-z])apples?$/ },
  { key: "balloon", pattern: /(?<![a-z])balloons?$/ },
  { key: "block", pattern: /(?<![a-z])blocks?$/ },
  { key: "button", pattern: /(?<![a-z])buttons?$/ },
  { key: "card", pattern: /(?<![a-z])cards?$/ },
  { key: "cookie", pattern: /(?<![a-z])cookies?$/ },
  { key: "counter", pattern: /(?<![a-z])counters?$/ },
  { key: "cube", pattern: /(?<![a-z])cubes?$/ },
  { key: "factor", pattern: /(?<![a-z])factors?$/ },
  { key: "fish", pattern: /(?<![a-z])fish$/ },
  { key: "half", pattern: /(?<![a-z])(?:half|halves)$/ },
  { key: "item", pattern: /(?<![a-z])items?$/ },
  { key: "object", pattern: /(?<![a-z])objects?$/ },
  { key: "outcome", pattern: /(?<![a-z])outcomes?$/ },
  { key: "part", pattern: /(?<![a-z])parts?$/ },
  { key: "pet", pattern: /(?<![a-z])pets?$/ },
  { key: "pencil", pattern: /(?<![a-z])pencils?$/ },
  { key: "response", pattern: /(?<![a-z])responses?$/ },
  { key: "shell", pattern: /(?<![a-z])shells?$/ },
  { key: "side", pattern: /(?<![a-z])sides?$/ },
  { key: "sticker", pattern: /(?<![a-z])stickers?$/ },
  { key: "tile", pattern: /(?<![a-z])tiles?$/ },
  { key: "vote", pattern: /(?<![a-z])votes?$/ }
];

function splitExplicitAnswerUnit(value: string): { key: AnswerUnitKey; unitless: string } | null {
  const normalized = unwrapFinalAnswerNotation(normalizeAnswer(value)).replace(/\.$/, "").trim();
  const currencyPrefix = normalized.match(/^([+-]?)(hk\$|\$)\s*/);
  if (currencyPrefix) {
    return {
      key: currencyPrefix[2] === "hk$" ? "hkd" : "usd",
      unitless: `${currencyPrefix[1]}${normalized.slice(currencyPrefix[0].length)}`.trim()
    };
  }

  for (const rule of answerUnitSuffixRules) {
    const match = normalized.match(rule.pattern);
    if (!match || match.index === undefined) continue;
    return {
      key: rule.key,
      unitless: normalized.slice(0, match.index).trim()
    };
  }

  return null;
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

/**
 * Forms a correct student types that differ from the stored answer only in
 * how the number is written. Each is added as an extra variant rather than
 * folded into normalizeAnswer, so the canonical form is unchanged.
 *
 * Deliberately narrow. A comma is stripped only inside a single numeric token
 * in thousands position (1,234 -> 1234); stored answers include coordinate
 * pairs like "(9, 6)", where stripping commas would produce "(96)".
 */
function numericTypingVariants(normalized: string) {
  const out: string[] = [];

  // 1,234 -> 1234, per token, only when the groups are exactly three digits
  const thousands = normalized.replace(/\b\d{1,3}(?:,\d{3})+\b/g, (m) => m.replace(/,/g, ""));
  if (thousands !== normalized) out.push(thousands);

  // .5 -> 0.5   (students routinely omit the leading zero)
  const leadingZero = normalized.replace(/(^|[^\d.])\.(\d)/g, "$10.$2");
  if (leadingZero !== normalized) out.push(leadingZero);

  // +3 -> 3   (signed-number lessons render "+6" themselves)
  if (/^\+\d/.test(normalized)) out.push(normalized.slice(1));

  // "3." -> "3", "circles." -> "circles"   (sentence punctuation, not a
  // decimal point; no maths answer here legitimately ends in a full stop)
  const trailingPeriod = normalized.replace(/([\d\p{L})\]])\.$/u, "$1");
  if (trailingPeriod !== normalized) out.push(trailingPeriod);

  return out;
}

function normalizedAnswerVariants(value: string) {
  const variants = new Set<string>();

  for (const normalized of answerCandidateStrings(value)) {
    variants.add(normalized);
    for (const typed of numericTypingVariants(normalized)) variants.add(typed);

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

export function parseScalarAnswer(value: string) {
  const normalizedWithUnit = unwrapFinalAnswerNotation(normalizeAnswer(value));
  const normalizedText = splitExplicitAnswerUnit(normalizedWithUnit)?.unitless ?? normalizedWithUnit;
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
  const selectedVariants = normalizedAnswerVariants(selectedAnswer);
  const acceptedVariants = normalizedAnswerVariants(acceptedAnswer);

  for (const variant of selectedVariants) {
    if (acceptedVariants.has(variant)) return true;
  }

  for (const selectedCandidate of answerCandidateStrings(selectedAnswer)) {
    const selectedNumber = parseScalarAnswer(selectedCandidate);
    if (selectedNumber === null) continue;

    for (const acceptedCandidate of answerCandidateStrings(acceptedAnswer)) {
      const acceptedNumber = parseScalarAnswer(acceptedCandidate);
      if (acceptedNumber !== null && Math.abs(selectedNumber - acceptedNumber) < 0.000001) return true;
    }
  }

  return false;
}

export function questionAnswerMatches(question: GradingQuestion, selectedAnswer: string) {
  const acceptedAnswers = [question.answer, ...(question.accepted_answers ?? [])];
  const strictAnswerUnits = question.strict_answer_units === true ||
    question.strictAnswerUnits === true ||
    question.curriculum_track === "US_CA_MATH" ||
    question.curriculumTrack === "US_CA_MATH" ||
    question.id?.startsWith("us-ca-") === true ||
    question.id?.startsWith("ccss-textbook-practice-v1-") === true;
  const selectedUnit = splitExplicitAnswerUnit(selectedAnswer)?.key ?? null;

  if (strictAnswerUnits && selectedUnit) {
    const acceptedUnits = new Set(
      acceptedAnswers
        .map((answer) => splitExplicitAnswerUnit(answer)?.key ?? null)
        .filter((unit): unit is AnswerUnitKey => unit !== null)
    );
    if (!acceptedUnits.has(selectedUnit)) return false;
  }

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
