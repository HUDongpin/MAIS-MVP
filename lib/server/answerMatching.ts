import { toPrcSimplifiedText } from "@/lib/i18n";
import { answerBindingsForChinaQuestion } from "@/data/chinaAnswerBindingContracts";
import type { LocalizedText } from "@/types";

type GradingQuestion = {
  id?: string;
  answer: string;
  accepted_answers?: string[] | null;
  answer_bindings?: string[] | null;
  answerBindings?: string[] | null;
  options?: LocalizedText[] | null;
  prompt?: string | LocalizedText | null;
  prompt_en?: string | null;
  prompt_zh?: string | null;
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

type QuantityDimension =
  | "angle"
  | "area"
  | "count"
  | "currency"
  | "length"
  | "mass"
  | "percentage"
  | "speed"
  | "temperature"
  | "time"
  | "volume";

type QuantityUnitDefinition = {
  aliases: string[];
  dimension: QuantityDimension;
  factor: number;
  position?: "prefix" | "suffix";
  unitKey: string;
};

type ParsedQuantityAnswer = {
  baseValue: number;
  dimension: QuantityDimension;
  scalar: number;
  unitKey: string;
};

const quantityUnitDefinitions: QuantityUnitDefinition[] = [
  { dimension: "temperature", unitKey: "celsius", factor: 1, aliases: ["°c", "℃", "摄氏度"] },
  { dimension: "temperature", unitKey: "fahrenheit", factor: 1, aliases: ["°f", "华氏度"] },
  { dimension: "percentage", unitKey: "percent", factor: 1, aliases: ["%", "百分比"] },
  { dimension: "percentage", unitKey: "percent", factor: 1, aliases: ["百分之"], position: "prefix" },
  { dimension: "angle", unitKey: "degree", factor: 1, aliases: ["°", "度", "degree", "degrees"] },

  { dimension: "currency", unitKey: "hkd", factor: 1, aliases: ["hk$"], position: "prefix" },
  { dimension: "currency", unitKey: "hkd", factor: 1, aliases: ["港元"] },
  { dimension: "currency", unitKey: "usd", factor: 1, aliases: ["$"], position: "prefix" },
  { dimension: "currency", unitKey: "usd", factor: 1, aliases: ["dollar", "dollars"] },
  { dimension: "currency", unitKey: "cny-yuan", factor: 1, aliases: ["¥", "￥"], position: "prefix" },
  { dimension: "currency", unitKey: "cny-yuan", factor: 1, aliases: ["元"] },
  { dimension: "currency", unitKey: "cny-jiao", factor: 1, aliases: ["角"] },
  // Keep a terminal standalone 分 in the frozen currency family. Chinese time
  // answers should spell 分钟/分鐘 when they mean minutes.
  { dimension: "currency", unitKey: "cny-fen", factor: 1, aliases: ["分"] },

  { dimension: "speed", unitKey: "metres-per-second", factor: 1, aliases: ["m/s", "米/秒", "米每秒"] },
  {
    dimension: "speed",
    unitKey: "kilometres-per-hour",
    factor: 1_000 / 3_600,
    aliases: [
      "km/h",
      "kmh",
      "千米/时",
      "公里/时",
      "千米/小时",
      "公里/小时",
      "千米每小时",
      "公里每小时"
    ]
  },

  { dimension: "volume", unitKey: "cubic-millimetre", factor: 1e-9, aliases: ["mm^3", "mm3", "立方毫米"] },
  { dimension: "volume", unitKey: "cubic-centimetre", factor: 1e-6, aliases: ["cm^3", "cm3", "立方厘米"] },
  { dimension: "volume", unitKey: "cubic-decimetre", factor: 1e-3, aliases: ["dm^3", "dm3", "立方分米"] },
  { dimension: "volume", unitKey: "cubic-metre", factor: 1, aliases: ["m^3", "m3", "立方米"] },
  { dimension: "volume", unitKey: "millilitre", factor: 1e-6, aliases: ["ml", "millilitre", "millilitres", "milliliter", "milliliters", "毫升"] },
  { dimension: "volume", unitKey: "litre", factor: 1e-3, aliases: ["l", "litre", "litres", "liter", "liters", "升"] },

  { dimension: "area", unitKey: "square-millimetre", factor: 1e-6, aliases: ["mm^2", "mm2", "平方毫米"] },
  { dimension: "area", unitKey: "square-centimetre", factor: 1e-4, aliases: ["cm^2", "cm2", "平方厘米", "平方釐米"] },
  { dimension: "area", unitKey: "square-decimetre", factor: 1e-2, aliases: ["dm^2", "dm2", "平方分米"] },
  { dimension: "area", unitKey: "square-metre", factor: 1, aliases: ["m^2", "m2", "平方米"] },
  { dimension: "area", unitKey: "square-kilometre", factor: 1e6, aliases: ["km^2", "km2", "平方千米", "平方公里"] },

  { dimension: "length", unitKey: "millimetre", factor: 1e-3, aliases: ["mm", "millimetre", "millimetres", "millimeter", "millimeters", "毫米"] },
  { dimension: "length", unitKey: "centimetre", factor: 1e-2, aliases: ["cm", "centimetre", "centimetres", "centimeter", "centimeters", "厘米", "釐米"] },
  { dimension: "length", unitKey: "decimetre", factor: 1e-1, aliases: ["dm", "decimetre", "decimetres", "decimeter", "decimeters", "分米"] },
  { dimension: "length", unitKey: "kilometre", factor: 1e3, aliases: ["km", "kilometre", "kilometres", "kilometer", "kilometers", "千米", "公里"] },
  { dimension: "length", unitKey: "metre", factor: 1, aliases: ["m", "metre", "metres", "meter", "meters", "米"] },

  { dimension: "mass", unitKey: "gram", factor: 1e-3, aliases: ["g", "gram", "grams", "克"] },
  { dimension: "mass", unitKey: "kilogram", factor: 1, aliases: ["kg", "kilogram", "kilograms", "千克", "公斤"] },

  { dimension: "time", unitKey: "second", factor: 1, aliases: ["s", "sec", "secs", "second", "seconds", "秒"] },
  { dimension: "time", unitKey: "minute", factor: 60, aliases: ["min", "mins", "minute", "minutes", "分钟", "分鐘"] },
  { dimension: "time", unitKey: "hour", factor: 3_600, aliases: ["h", "hr", "hrs", "hour", "hours", "小时", "小時"] },
  { dimension: "time", unitKey: "day", factor: 86_400, aliases: ["day", "days", "天"] },

  { dimension: "count", unitKey: "book", factor: 1, aliases: ["book", "books", "本书", "本書", "本"] },
  { dimension: "count", unitKey: "bundle", factor: 1, aliases: ["包"] },
  { dimension: "count", unitKey: "card", factor: 1, aliases: ["card", "cards"] },
  { dimension: "count", unitKey: "sheet", factor: 1, aliases: ["sheet", "sheets", "张", "張"] },
  { dimension: "count", unitKey: "student", factor: 1, aliases: ["student", "students", "人", "名"] },
  { dimension: "count", unitKey: "button", factor: 1, aliases: ["button", "buttons"] },
  { dimension: "count", unitKey: "block", factor: 1, aliases: ["block", "blocks", "块", "塊"] },
  { dimension: "count", unitKey: "counter", factor: 1, aliases: ["counter", "counters"] },
  { dimension: "count", unitKey: "cube", factor: 1, aliases: ["cube", "cubes"] },
  { dimension: "count", unitKey: "item", factor: 1, aliases: ["item", "items", "个", "個", "件"] },
  { dimension: "count", unitKey: "pencil", factor: 1, aliases: ["pencil", "pencils", "支"] },
  { dimension: "count", unitKey: "shell", factor: 1, aliases: ["shell", "shells"] },
  { dimension: "count", unitKey: "sticker", factor: 1, aliases: ["sticker", "stickers"] },
  { dimension: "count", unitKey: "tile", factor: 1, aliases: ["tile", "tiles"] },
  { dimension: "count", unitKey: "unit", factor: 1, aliases: ["unit", "units"] },
  { dimension: "count", unitKey: "side", factor: 1, aliases: ["side", "sides"] },
  { dimension: "count", unitKey: "vehicle", factor: 1, aliases: ["辆", "輛"] },
  { dimension: "count", unitKey: "ticket", factor: 1, aliases: ["票"] },
  { dimension: "count", unitKey: "volume-copy", factor: 1, aliases: ["册", "冊"] },
  { dimension: "count", unitKey: "generic-animal", factor: 1, aliases: ["只"] },
  { dimension: "count", unitKey: "tree", factor: 1, aliases: ["棵"] },
  { dimension: "count", unitKey: "box", factor: 1, aliases: ["盒"] },
  { dimension: "count", unitKey: "strip", factor: 1, aliases: ["条", "條"] },
  { dimension: "count", unitKey: "flower", factor: 1, aliases: ["朵"] },
  { dimension: "count", unitKey: "granule", factor: 1, aliases: ["颗", "顆"] },
  { dimension: "count", unitKey: "group", factor: 1, aliases: ["组", "組"] },
  { dimension: "count", unitKey: "copy", factor: 1, aliases: ["份"] },
  { dimension: "count", unitKey: "occurrence", factor: 1, aliases: ["次"] },
  { dimension: "count", unitKey: "page", factor: 1, aliases: ["页", "頁"] }
];

const normalizedQuantityUnitDefinitions = quantityUnitDefinitions
  .flatMap((definition) => definition.aliases.map((alias) => ({
    ...definition,
    alias: normalizeAnswer(alias),
    aliases: undefined
  })))
  .sort((left, right) => right.alias.length - left.alias.length);

const identitySensitiveQuantityDimensions = new Set<QuantityDimension>([
  "count",
  "currency",
  "temperature"
]);

const unicodeSuperscriptCharacters: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁺": "+",
  "⁻": "-"
};

function preserveUnicodeExponents(value: string) {
  return value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/gu, (superscript) =>
    `^${Array.from(superscript, (character) => unicodeSuperscriptCharacters[character]).join("")}`
  );
}

function preserveCircledNumeralsAcrossCompatibilityNormalization(value: string) {
  const circledNumerals = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
  return value.replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/gu, (character) =>
    String.fromCodePoint(0xe100 + circledNumerals.indexOf(character))
  );
}

function restoreCircledNumerals(value: string) {
  const circledNumerals = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
  return value.replace(/[\uE100-\uE113]/gu, (sentinel) =>
    circledNumerals[Number(sentinel.codePointAt(0)) - 0xe100]
  );
}

export function normalizeAnswer(value: string) {
  return restoreCircledNumerals(toPrcSimplifiedText(
    preserveCircledNumeralsAcrossCompatibilityNormalization(preserveUnicodeExponents(value))
  )
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
    .trim());
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

function isSingleScalarOrQuantityText(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /[,;{}|\u2223\u221e]/u.test(trimmed)) return false;

  if (
    parseNumberToken(trimmed) !== null
    || parsePhraseFraction(trimmed) !== null
    || parseMixedNumber(trimmed) !== null
  ) return true;

  const compact = trimmed.replace(/\s+/g, "");
  const fraction = compact.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/u);
  if (fraction && Number(fraction[2]) !== 0) return true;

  for (const definition of normalizedQuantityUnitDefinitions) {
    const { alias } = definition;
    if (!alias) continue;
    const position = definition.position ?? "suffix";
    const hasAlias = position === "prefix" ? trimmed.startsWith(alias) : trimmed.endsWith(alias);
    if (!hasAlias) continue;
    const scalarText = position === "prefix"
      ? trimmed.slice(alias.length).trim()
      : trimmed.slice(0, trimmed.length - alias.length).trim();
    if (!scalarText || scalarText === trimmed) continue;
    if (
      parseNumberToken(scalarText) !== null
      || parsePhraseFraction(scalarText) !== null
      || parseMixedNumber(scalarText) !== null
      || /^-?\d+(?:\.\d+)?\/-?\d+(?:\.\d+)?$/u.test(scalarText.replace(/\s+/g, ""))
    ) return true;
  }

  return false;
}

function unwrapFinalAnswerNotation(value: string) {
  let unwrapped = value
    .replace(/\\(?:textcircled|boxed|fbox)\{([^{}]+)\}/g, "$1")
    .trim();

  // Ordinary parentheses/square brackets are decoration only around one scalar
  // or quantity (for example, OCR output `(42)` or `[42 cm]`).  They remain
  // mathematically significant for coordinates and intervals. Curly braces are
  // always set notation here; explicit OCR wrappers such as `\boxed{...}` were
  // already removed above without erasing braces inside their payload.
  while (
    unwrapped.length >= 2
    && unwrapped[0] !== "{"
    && bracketsWrapEntireValue(unwrapped)
    && isSingleScalarOrQuantityText(unwrapped.slice(1, -1))
  ) {
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
    const rightValue = parseQuantityAnswer(right)?.scalar ?? parseScalarAnswer(right);
    const leftIsFinalAnswerLabel = /^(?:[a-z][a-z0-9_]*|ans|answer|答|答案)$/iu.test(left);
    if (rightValue !== null && (
      leftIsFinalAnswerLabel
      || (leftValue !== null && numbersWithinAbsoluteTolerance(leftValue, rightValue))
    )) {
      candidates.add(right);
    }
  }

  return candidates;
}

function stripMultipleChoiceLabelPrefix(value: string) {
  const normalizedWidth = restoreCircledNumerals(
    preserveCircledNumeralsAcrossCompatibilityNormalization(preserveUnicodeExponents(value))
      .normalize("NFKC")
  ).trim();
  return normalizedWidth.replace(/^(?:\([A-F]\)|[A-F][.、:：)])\s*/iu, "");
}

function normalizedAnswerVariants(value: string) {
  const variants = new Set<string>();

  const candidateInputs = new Set([value, stripMultipleChoiceLabelPrefix(value)]);
  for (const candidateInput of candidateInputs) for (const normalized of answerCandidateStrings(candidateInput)) {
    variants.add(normalized);

    // For mixed numbers the collapsed string ("13/7" from "1 3/7") is a
    // different value — offer the true improper fraction instead.
    const improper = improperFractionForMixed(normalized);
    if (improper) variants.add(improper);
    else if (!/^-?\d+(?:\.\d+)?(?:\s+-?\d+(?:\.\d+)?)+$/u.test(normalized.trim())) {
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
  const normalizedText = unwrapFinalAnswerNotation(normalizeAnswer(value));
  const englishNumber = parseEnglishNumberWords(normalizedText);
  if (englishNumber !== null) return englishNumber;
  const phraseFraction = parsePhraseFraction(normalizedText);
  if (phraseFraction) return phraseFraction.scalar;
  const mixedNumber = parseMixedNumber(normalizedText);
  if (mixedNumber !== null) return mixedNumber;

  // Whitespace can separate an ordered list of condition indexes (for
  // example, "2 3 1").  Collapsing that list to "231" turns a structured
  // response into an unrelated scalar. Mixed numbers were handled above.
  if (/^-?\d+(?:\.\d+)?(?:\s+-?\d+(?:\.\d+)?)+$/u.test(normalizedText.trim())) {
    return null;
  }

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

function parseQuantityAnswer(value: string): ParsedQuantityAnswer | null {
  const normalized = unwrapFinalAnswerNotation(normalizeAnswer(stripMultipleChoiceLabelPrefix(value))).trim();
  if (!normalized) return null;

  for (const definition of normalizedQuantityUnitDefinitions) {
    const { alias } = definition;
    if (!alias) continue;

    const position = definition.position ?? "suffix";
    const hasAlias = position === "prefix" ? normalized.startsWith(alias) : normalized.endsWith(alias);
    if (!hasAlias) continue;

    const scalarText = position === "prefix"
      ? normalized.slice(alias.length).trim()
      : normalized.slice(0, normalized.length - alias.length).trim();
    if (!scalarText) continue;
    if (hasAnchoredExplicitUnitToken(scalarText)) continue;

    const scalar = parseScalarAnswer(scalarText);
    if (scalar === null || !Number.isFinite(scalar)) continue;

    return {
      baseValue: scalar * definition.factor,
      dimension: definition.dimension,
      scalar,
      unitKey: definition.unitKey
    };
  }

  return null;
}

function hasAnchoredExplicitUnitToken(value: string) {
  const normalized = normalizeAnswer(value).trim();
  for (const definition of normalizedQuantityUnitDefinitions) {
    const { alias } = definition;
    if (!alias) continue;
    const position = definition.position ?? "suffix";
    const hasAlias = position === "prefix" ? normalized.startsWith(alias) : normalized.endsWith(alias);
    if (!hasAlias) continue;
    const remainder = position === "prefix"
      ? normalized.slice(alias.length).trim()
      : normalized.slice(0, normalized.length - alias.length).trim();
    if (!remainder) continue;
    if (/\d/u.test(remainder) || parseEnglishNumberWords(remainder) !== null) return true;
  }
  return false;
}

function hasNestedExplicitUnitSyntax(value: string) {
  const normalizedInputs = new Set([
    normalizeAnswer(value),
    normalizeAnswer(stripMultipleChoiceLabelPrefix(value))
  ]);
  for (const normalizedInput of Array.from(normalizedInputs)) {
    const candidates = [normalizedInput];
    const equationIndex = normalizedInput.lastIndexOf("=");
    if (equationIndex !== -1) candidates.push(normalizedInput.slice(equationIndex + 1).trim());

    for (const candidate of candidates) {
      for (const definition of normalizedQuantityUnitDefinitions) {
        const { alias } = definition;
        if (!alias) continue;
        const position = definition.position ?? "suffix";
        const hasAlias = position === "prefix" ? candidate.startsWith(alias) : candidate.endsWith(alias);
        if (!hasAlias) continue;
        const scalarText = position === "prefix"
          ? candidate.slice(alias.length).trim()
          : candidate.slice(0, candidate.length - alias.length).trim();
        // A nested unit is present only when removing the outer unit leaves a
        // complete quantity (for example, `39 km cm` or `10 cards cm`).  Do
        // not scan arbitrary prose for another terminal token: natural-language
        // options such as `两条直线相交成90°角` and `80～89分组` legitimately
        // end with strings that also happen to be unit aliases.
        if (scalarText && parseQuantityAnswer(scalarText)) return true;
        if (scalarText && parseScalarAnswer(scalarText) !== null) break;
      }
    }
  }
  return false;
}

function explicitQuantityCandidates(value: string) {
  const quantities: ParsedQuantityAnswer[] = [];
  const candidateInputs = new Set([value, stripMultipleChoiceLabelPrefix(value)]);
  for (const candidateInput of candidateInputs) {
    for (const candidate of answerCandidateStrings(candidateInput)) {
      const quantity = parseQuantityAnswer(candidate);
      if (quantity) quantities.push(quantity);
    }
  }
  return quantities;
}

function exactAnswerCandidateStrings(value: string) {
  const candidates = new Set<string>();
  for (const input of new Set([value, stripMultipleChoiceLabelPrefix(value)])) {
    const normalized = normalizeAnswer(input);
    candidates.add(normalized);
    const unwrapped = unwrapFinalAnswerNotation(normalized);
    if (unwrapped) candidates.add(unwrapped);
  }
  return candidates;
}

function answersExactlyMatch(left: string, right: string) {
  const rightCandidates = exactAnswerCandidateStrings(right);
  return Array.from(exactAnswerCandidateStrings(left)).some((candidate) => rightCandidates.has(candidate));
}

function wholeAnswerOuterDelimiter(value: string) {
  const normalized = normalizeAnswer(stripMultipleChoiceLabelPrefix(value));
  return bracketsWrapEntireValue(normalized) ? normalized[0] : null;
}

function simpleEnumeratedSetElements(value: string) {
  const normalized = normalizeAnswer(stripMultipleChoiceLabelPrefix(value));
  if (
    normalized.length < 2
    || normalized[0] !== "{"
    || normalized[normalized.length - 1] !== "}"
    || !bracketsWrapEntireValue(normalized)
  ) return null;

  const inner = normalized.slice(1, -1).trim();
  if (!inner) return [];
  // Set-builder notation and nested sets need a dedicated symbolic parser.
  // This comparator intentionally handles only explicit finite enumerations.
  if (/[{}|\u2223]/u.test(inner)) return null;

  const closingBracketFor: Record<string, string> = { "(": ")", "[": "]" };
  const bracketStack: string[] = [];
  const elements: string[] = [];
  let elementStart = 0;

  for (let index = 0; index < inner.length; index += 1) {
    const character = inner[index];
    const expectedClose = closingBracketFor[character];
    if (expectedClose) {
      bracketStack.push(expectedClose);
      continue;
    }
    if (character === ")" || character === "]") {
      if (bracketStack.pop() !== character) return null;
      continue;
    }
    if (character === "," && bracketStack.length === 0) {
      const element = inner.slice(elementStart, index).trim();
      if (!element) return null;
      elements.push(element);
      elementStart = index + 1;
    }
  }
  if (bracketStack.length) return null;

  const finalElement = inner.slice(elementStart).trim();
  if (!finalElement) return null;
  elements.push(finalElement);
  return elements;
}

function simpleEnumeratedSetsEquivalent(selectedAnswer: string, acceptedAnswer: string) {
  const selectedElements = simpleEnumeratedSetElements(selectedAnswer);
  const acceptedElements = simpleEnumeratedSetElements(acceptedAnswer);
  if (!selectedElements || !acceptedElements || selectedElements.length !== acceptedElements.length) return false;

  // Maximum bipartite matching gives an order-independent one-to-one element
  // comparison while retaining the existing scalar/fraction/unit semantics for
  // each element. It does not apply to coordinates or intervals because both
  // outer delimiters must be curly braces.
  const acceptedMatchForSelected = new Array<number>(acceptedElements.length).fill(-1);
  const tryMatch = (selectedIndex: number, visitedAccepted: boolean[]): boolean => {
    for (let acceptedIndex = 0; acceptedIndex < acceptedElements.length; acceptedIndex += 1) {
      if (visitedAccepted[acceptedIndex]) continue;
      if (!answerMatches(selectedElements[selectedIndex], acceptedElements[acceptedIndex])) continue;
      visitedAccepted[acceptedIndex] = true;
      const previousSelected = acceptedMatchForSelected[acceptedIndex];
      if (previousSelected === -1 || tryMatch(previousSelected, visitedAccepted)) {
        acceptedMatchForSelected[acceptedIndex] = selectedIndex;
        return true;
      }
    }
    return false;
  };

  return selectedElements.every((_, selectedIndex) =>
    tryMatch(selectedIndex, new Array<boolean>(acceptedElements.length).fill(false))
  );
}

function nonGenericFinalAnswerBinding(value: string) {
  const normalized = normalizeAnswer(stripMultipleChoiceLabelPrefix(value));
  if ((normalized.match(/=/gu)?.length ?? 0) !== 1 || /(?:或|\bor\b)/iu.test(normalized)) return null;
  const equationIndex = normalized.lastIndexOf("=");
  if (equationIndex === -1) return null;

  const left = unwrapFinalAnswerNotation(normalized.slice(0, equationIndex)).trim();
  const right = unwrapFinalAnswerNotation(normalized.slice(equationIndex + 1)).trim();
  const rightValue = parseQuantityAnswer(right)?.scalar ?? parseScalarAnswer(right);
  if (!left || rightValue === null || !/^[a-z][a-z0-9_]*(?:\([a-z][a-z0-9_]*\))?$/iu.test(left)) return null;
  if (/^(?:ans|answer|答|答案)$/iu.test(left)) return null;

  const leftValue = safeEvaluateArithmeticExpression(left);
  if (leftValue !== null && numbersWithinAbsoluteTolerance(leftValue, rightValue)) return null;
  return left;
}

function explicitlyPermittedBindings(question: GradingQuestion, acceptedAnswers: string[]) {
  const storedBindings = acceptedAnswers
    .map((answer) => nonGenericFinalAnswerBinding(answer))
    .filter((binding): binding is string => Boolean(binding));
  const metadataBindings = [
    ...(question.answer_bindings ?? []),
    ...(question.answerBindings ?? []),
    ...answerBindingsForChinaQuestion(question.id)
  ].map((binding) => normalizeAnswer(binding));
  return new Set([...storedBindings, ...metadataBindings]);
}

function structuredTerminalQuantityScalar(value: string) {
  const normalized = normalizeAnswer(value).trim();
  const ordinal = normalized.match(/^第\s*(-?\d+(?:\.\d+)?)$/u);
  if (ordinal) return Number(ordinal[1]);
  const terminal = normalized.match(/(?:^|[,;、])(?:还剩|剩余|剩|余|共|第)?\s*(-?\d+(?:\.\d+)?)$/u);
  return terminal ? Number(terminal[1]) : null;
}

function explicitQuantityContracts(value: string) {
  const contracts = new Map<string, Pick<ParsedQuantityAnswer, "dimension" | "unitKey">>();
  for (const quantity of explicitQuantityCandidates(value)) {
    contracts.set(`${quantity.dimension}:${quantity.unitKey}`, quantity);
  }
  if (contracts.size) return Array.from(contracts.values());

  // Some canonical answers intentionally contain several requested values
  // (for example, "16包，还剩0本") or an ordinal ("第6天"). They are not a
  // single convertible quantity, but their terminal unit still establishes a
  // contract that must stop an unrelated explicit unit from matching a bare
  // numeric alias. This detector is blocking-only: it never proves equality.
  const normalized = unwrapFinalAnswerNotation(normalizeAnswer(stripMultipleChoiceLabelPrefix(value))).trim();
  for (const definition of normalizedQuantityUnitDefinitions) {
    const { alias } = definition;
    if (!alias) continue;
    const position = definition.position ?? "suffix";
    const hasAlias = position === "prefix" ? normalized.startsWith(alias) : normalized.endsWith(alias);
    const numericPart = position === "prefix"
      ? normalized.slice(alias.length)
      : normalized.slice(0, normalized.length - alias.length);
    if (!hasAlias || structuredTerminalQuantityScalar(numericPart) === null) continue;
    contracts.set(`${definition.dimension}:${definition.unitKey}`, definition);
    break;
  }

  return Array.from(contracts.values());
}

function numbersNearlyEqual(left: number, right: number) {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  const floatingPointTolerance = Number.EPSILON * scale * 16;
  return Math.abs(left - right) <= Math.max(1e-9, floatingPointTolerance);
}

function numbersWithinAbsoluteTolerance(left: number, right: number, tolerance = 1e-6) {
  return Math.abs(left - right) <= tolerance;
}

function quantitiesEquivalent(left: ParsedQuantityAnswer, right: ParsedQuantityAnswer) {
  if (left.dimension !== right.dimension) return false;
  if (identitySensitiveQuantityDimensions.has(left.dimension) && left.unitKey !== right.unitKey) return false;
  return numbersNearlyEqual(left.baseValue, right.baseValue);
}

function quantityUnitsCompatible(left: ParsedQuantityAnswer, right: ParsedQuantityAnswer) {
  if (left.dimension !== right.dimension) return false;
  return !identitySensitiveQuantityDimensions.has(left.dimension) || left.unitKey === right.unitKey;
}

function hasEquivalentExplicitQuantity(left: string, right: string) {
  const leftQuantities = explicitQuantityCandidates(left);
  const rightQuantities = explicitQuantityCandidates(right);
  return leftQuantities.some((leftQuantity) =>
    rightQuantities.some((rightQuantity) => quantitiesEquivalent(leftQuantity, rightQuantity))
  );
}

function hasCompatibleExplicitQuantityUnits(left: string, right: string) {
  const leftQuantities = explicitQuantityCandidates(left);
  const rightQuantities = explicitQuantityCandidates(right);
  return leftQuantities.some((leftQuantity) =>
    rightQuantities.some((rightQuantity) => quantityUnitsCompatible(leftQuantity, rightQuantity))
  );
}

export function explicitQuantityAnswersEquivalent(left: string, right: string) {
  return hasEquivalentExplicitQuantity(left, right);
}

export function explicitQuantityAnswerDimensions(value: string) {
  return Array.from(new Set(explicitQuantityContracts(value).map((contract) => contract.dimension)));
}

export function explicitQuantityAnswerScalars(value: string) {
  const scalars = new Set(explicitQuantityCandidates(value).map((quantity) => quantity.scalar));
  const normalized = unwrapFinalAnswerNotation(normalizeAnswer(stripMultipleChoiceLabelPrefix(value))).trim();
  for (const definition of normalizedQuantityUnitDefinitions) {
    const { alias } = definition;
    if (!alias) continue;
    const position = definition.position ?? "suffix";
    const hasAlias = position === "prefix" ? normalized.startsWith(alias) : normalized.endsWith(alias);
    if (!hasAlias) continue;
    const numericPart = position === "prefix"
      ? normalized.slice(alias.length)
      : normalized.slice(0, normalized.length - alias.length);
    const scalar = structuredTerminalQuantityScalar(numericPart);
    if (scalar !== null) scalars.add(scalar);
    break;
  }
  return Array.from(scalars);
}

export function answerMatches(selectedAnswer: string, acceptedAnswer: string) {
  if (hasNestedExplicitUnitSyntax(selectedAnswer)) return false;
  const selectedBinding = nonGenericFinalAnswerBinding(selectedAnswer);
  const acceptedBinding = nonGenericFinalAnswerBinding(acceptedAnswer);
  if (selectedBinding && acceptedBinding && selectedBinding !== acceptedBinding) return false;
  if (simpleEnumeratedSetsEquivalent(selectedAnswer, acceptedAnswer)) return true;
  const selectedQuantities = explicitQuantityCandidates(selectedAnswer);
  const acceptedQuantities = explicitQuantityCandidates(acceptedAnswer);

  // Once both sides state a unit, unit dimension and scale become part of the
  // mathematical answer. Do not let the legacy scalar fallback erase them.
  if (selectedQuantities.length && acceptedQuantities.length) {
    return selectedQuantities.some((selectedQuantity) =>
      acceptedQuantities.some((acceptedQuantity) => quantitiesEquivalent(selectedQuantity, acceptedQuantity))
    );
  }

  // Bare user input remains compatible with a unitized key (the key supplies
  // the intended unit). The reverse is intentionally not true: an explicit
  // unit in the user's answer must not be erased merely because one accepted
  // alias is a bare scalar.
  if (selectedQuantities.length && !acceptedQuantities.length) return false;

  const selectedVariants = normalizedAnswerVariants(selectedAnswer);
  const acceptedVariants = normalizedAnswerVariants(acceptedAnswer);

  for (const variant of selectedVariants) {
    if (acceptedVariants.has(variant)) return true;
  }

  for (const selectedCandidate of answerCandidateStrings(selectedAnswer)) {
    const selectedQuantity = parseQuantityAnswer(selectedCandidate);
    const selectedNumber = parseScalarAnswer(selectedCandidate);
    if (selectedNumber === null && !selectedQuantity) continue;

    for (const acceptedCandidate of answerCandidateStrings(acceptedAnswer)) {
      const acceptedQuantity = parseQuantityAnswer(acceptedCandidate);
      const acceptedNumber = parseScalarAnswer(acceptedCandidate);
      if (selectedQuantity && acceptedQuantity) {
        if (quantitiesEquivalent(selectedQuantity, acceptedQuantity)) return true;
        continue;
      }
      if (selectedQuantity && acceptedNumber !== null && numbersWithinAbsoluteTolerance(selectedQuantity.scalar, acceptedNumber)) {
        return true;
      }
      if (acceptedQuantity && selectedNumber !== null && numbersWithinAbsoluteTolerance(selectedNumber, acceptedQuantity.scalar)) {
        return true;
      }
      if (selectedNumber !== null && acceptedNumber !== null && numbersWithinAbsoluteTolerance(selectedNumber, acceptedNumber)) {
        return true;
      }
    }
  }

  return false;
}

export function questionAnswerMatches(question: GradingQuestion, selectedAnswer: string) {
  const acceptedAnswers = [question.answer, ...(question.accepted_answers ?? [])];
  const selectedOuterDelimiter = wholeAnswerOuterDelimiter(selectedAnswer);
  const canonicalOuterDelimiter = wholeAnswerOuterDelimiter(question.answer);
  const selectedIsLiteralStoredAnswer = acceptedAnswers.some((answer) =>
    normalizeAnswer(stripMultipleChoiceLabelPrefix(selectedAnswer))
      === normalizeAnswer(stripMultipleChoiceLabelPrefix(answer))
  );
  // A set-valued canonical establishes an outer-delimiter contract. A bare
  // scalar/equation alias may remain valid, but wrapping that alias in `()` or
  // `[]` changes it into tuple/interval notation and must not be laundered
  // through scalar-wrapper normalization. An explicitly stored whole string is
  // still honored as an intentional question-level exception.
  if (
    canonicalOuterDelimiter === "{"
    && (selectedOuterDelimiter === "(" || selectedOuterDelimiter === "[")
    && !selectedIsLiteralStoredAnswer
  ) return false;
  // A deliberately stored literal alias remains part of the grading contract.
  // This is true whole-string normalized equality only: it may remove an MC
  // label or whole-answer wrapper, but never extracts an equation's RHS.
  if (acceptedAnswers.some((answer) => answersExactlyMatch(selectedAnswer, answer))) return true;
  if (hasNestedExplicitUnitSyntax(selectedAnswer)) return false;
  const selectedBinding = nonGenericFinalAnswerBinding(selectedAnswer);
  const canonicalBinding = nonGenericFinalAnswerBinding(question.answer);
  // A canonical equation names the mathematical object being answered.  Do
  // not let scalar fallback erase that binding (`y=4` is not `x=4`, and
  // `AC=12` is not `EF=12`).
  if (selectedBinding && canonicalBinding && selectedBinding !== canonicalBinding) return false;
  if (selectedBinding && !canonicalBinding) {
    if (!explicitlyPermittedBindings(question, acceptedAnswers).has(selectedBinding)) {
      return false;
    }
  }
  const selectedHasExplicitQuantity = explicitQuantityCandidates(selectedAnswer).length > 0;
  const storedHasExplicitQuantityContract = acceptedAnswers.some((answer) => explicitQuantityContracts(answer).length > 0);
  const canonicalQuantities = explicitQuantityCandidates(question.answer);
  const directlyComparableAnswers = selectedHasExplicitQuantity && storedHasExplicitQuantityContract
    ? acceptedAnswers.filter((answer) => {
        const answerQuantities = explicitQuantityCandidates(answer);
        if (!answerQuantities.length) return false;
        if (!canonicalQuantities.length) return true;
        return hasCompatibleExplicitQuantityUnits(question.answer, answer);
      })
    : acceptedAnswers;

  if (directlyComparableAnswers.some((answer) => (
    selectedHasExplicitQuantity && storedHasExplicitQuantityContract
      ? hasEquivalentExplicitQuantity(selectedAnswer, answer)
      : answerMatches(selectedAnswer, answer)
  ))) return true;

  const options = question.options ?? [];
  const keyedOptionIndexes = acceptedAnswers.flatMap((answer) => {
    const key = answer.trim().toUpperCase();
    if (!/^[A-F]$/u.test(key)) return [];
    // A bare A-F value is not necessarily an option index: it may itself be
    // the mathematical/content answer (for example, the variable b or the
    // choice text "B"). Prefer that literal displayed value when present;
    // infer a keyed option index only when no option actually displays it.
    const isLiteralDisplayedValue = options.some((option) =>
      [option.en, option.zh, option.zhHans ?? ""].some((optionText) =>
        optionText && answerMatches(answer, optionText)
      )
    );
    return isLiteralDisplayedValue ? [] : [key.charCodeAt(0) - "A".charCodeAt(0)];
  });
  if (keyedOptionIndexes.some((optionIndex) => {
    const option = options[optionIndex];
    return option && [option.en, option.zh, option.zhHans ?? ""].some((optionText) =>
      optionText && answerMatches(selectedAnswer, optionText)
    );
  })) return true;

  const acceptedAnswersForOptionResolution = storedHasExplicitQuantityContract
    ? acceptedAnswers.filter((answer) => {
        const answerQuantities = explicitQuantityCandidates(answer);
        if (!answerQuantities.length) return false;
        if (!canonicalQuantities.length) return true;
        return hasCompatibleExplicitQuantityUnits(question.answer, answer);
      })
    : acceptedAnswers;

  return options.some((option) => {
    const localizedOptions = [option.en, option.zh, option.zhHans ?? ""].filter(Boolean);
    const selectedOption = localizedOptions.some((optionText) => answerMatches(selectedAnswer, optionText));
    const acceptedOption = acceptedAnswersForOptionResolution.some((answer) =>
      localizedOptions.some((optionText) => answerMatches(optionText, answer))
    );
    return selectedOption && acceptedOption;
  });
}
