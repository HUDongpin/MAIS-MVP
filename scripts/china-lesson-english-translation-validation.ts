export type TranslationValidationEntry = {
  id: string;
  source: string;
  contexts: string[];
};

export type ProtectedTranslationSource = {
  protectedSource: string;
  tokens: Array<{ placeholder: string; value: string }>;
};

export const cjkPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
export const protectedTokenPattern = /ZXQ(?:TERM|MATH|NUM)[A-Z]+?QXZ/gu;

const inlineMathPattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/gu;
const mathIdentifierCandidatePattern = /(?:[A-Za-z][A-Za-z0-9_₀-₉\u1d2c-\u1d6a\u1d9b-\u1dbf\u2070-\u209c]*|[α-ωΑ-Ω][0-9_₀-₉\u1d2c-\u1d6a\u1d9b-\u1dbf\u2070-\u209c]*|(?<![A-Za-z\u00c0-\u024f])[\u00c0-\u024f][0-9_₀-₉\u1d2c-\u1d6a\u1d9b-\u1dbf\u2070-\u209c]*)(?![A-Za-z\u00c0-\u024f])/gu;
const numericAtomSource = String.raw`(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?(?!\d)|\d+(?:\.\d+)?)`;
const numericLiteralSource = String.raw`${numericAtomSource}(?:\s*\/\s*${numericAtomSource})?`;
// ASCII hyphen-minus is classified contextually so natural compounds such as
// x-coordinate, two-digit, and one-to-one are never treated as equations.
const unambiguousMathSymbolPattern = /[+−－＋×÷=＝<>＜＞≤≥≠≈±^%％°√∛πΠ²³⁰¹⁴⁵⁶⁷⁸⁹∥⊥⟂∽∩∪∈∉∞∅∠∶·⋅⇒⇔→↔|∣⊙≌∑∴∵∁ℕℤℚℝℂ\u0304\u0307]/gu;
const mathContextXPattern = /(?<=\d)\s*[xX]\s*(?=\d)/gu;
const superscriptExponentPattern = /[¹²³\u2070-\u207f\u1d2c-\u1d6a\u1d9b-\u1dbf]+/gu;
const sequenceEllipsisPattern = /(?:…|\.{3})/gu;
const forbiddenEnglishPattern = /(?:term-(?:bridge|chapters-\d+-\d+|[a-f0-9]{4,}(?:-term-[a-f0-9]{4,})?)|\b(?:MAIS|S(?:0[1-9]|1\d|2[0-5])|RAG|source[- ]distance|integration package|production[- ]integrated|candidate package|compatibility (?:geometry )?strand|transition review)\b)/iu;
// Generated fallback tokens encode Chinese code points as four-or-more hex
// digits. The prefix form intentionally catches malformed glued remnants such
// as `term-6362______sheets`; requiring four digits preserves legitimate
// mathematical prose such as "term-by-term".
const completeGeneratedTermTokenPattern = /\bterm-[a-f0-9]{4,}(?:-term-[a-f0-9]{4,})*\b/iu;
const generatedTermTokenPrefixPattern = /\bterm-[a-f0-9]{4,}/iu;
const broadPseudoEnglishDiagnosticPattern = /(?:\btimes surface\b|\bone items?\b|\btwo items?\b|\bthree items?\b|\bfour items?\b|\bsame equal\b|\bcan can\b|\bnumber items?\b|\bpart separately\b|\bof is\b|\bin requires\b|\bterm-[a-f0-9]+)/iu;
const pseudoEnglishPatterns = [
  ["pseudo-times-surface", /\btimes surface\b/iu],
  ["pseudo-one-items", /\bone items\b/iu],
  ["pseudo-same-equal", /\bsame equal\b/iu],
  ["pseudo-can-can", /\bcan can\b/iu],
  ["pseudo-none-number-items", /\bnone number items?\b/iu],
  ["pseudo-part-separately", /\bpart separately\b/iu],
  ["pseudo-correct-of-is", /\bcorrect of is\b/iu],
  ["pseudo-in-requires", /\bin requires\b/iu]
] as const;
const internalQaPattern = /\b(?:QA\s+(?:review|status|gate|report|approval|issue|check)|(?:passed|failed|pending)\s+(?:the\s+)?QA(?:\s+(?:review|gate|check))?)\b/iu;
const englishCjkPunctuationPattern = /[，。；：！？、【】〔〕《》〈〉「」『』（）［］｛｝＝＋－％\u3000]/u;
const malformedWordOperatorPattern = /\b(?:plus|minus|times|multiplied by|divided by)\s*[+\-−]\s*\d/iu;
const rawMarkdownEmphasisPattern = /\*\*[^*\n]+\*\*|(?:^|[\s(])\*[A-Za-z][^*\n]{0,120}\*(?=$|[\s).,;:!?])/u;
const pluralCountNouns = [
  "minutes", "squares", "meters", "hours", "tens", "blocks", "cubes", "balls", "units",
  "kilometers", "layers", "groups", "days", "boats", "objects", "centimeters", "items",
  "decimeters", "books", "kilograms", "parts", "bundles", "bills", "triangles", "vehicles",
  "rows", "liters", "notes", "shares", "stands", "children", "people", "feet", "inches",
  "students", "rectangles", "circles", "points", "lines", "pencils", "apples", "coins"
] as const;
const pluralCountNounSource = pluralCountNouns.join("|");
const countAdjectiveSource = [
  "small", "large", "more", "another", "flower", "red", "blue", "green", "black", "white",
  "yellow", "round", "square", "cubic", "equal", "whole", "remaining", "extra", "wooden", "metal"
].join("|");
const pluralAfterOnePattern = new RegExp(
  String.raw`(?<![\d.])\b(?:1|one)(?![\d.])\s+(?:(?:${countAdjectiveSource})\s+){0,3}(${pluralCountNounSource})\b`,
  "giu"
);

export type EnglishSurfaceLanguageFindingCategory =
  | "fallback-term-token"
  | (typeof pseudoEnglishPatterns)[number][0];

export type EnglishSurfaceLanguageFinding = {
  category: EnglishSurfaceLanguageFindingCategory;
};

export function hasCompleteGeneratedTermToken(value: string) {
  return completeGeneratedTermTokenPattern.test(value);
}

export function hasGeneratedTermTokenPrefix(value: string) {
  return generatedTermTokenPrefixPattern.test(value);
}

export function hasBroadPseudoEnglishDiagnostic(value: string) {
  return broadPseudoEnglishDiagnosticPattern.test(value);
}

export function englishSurfaceLanguageFindings(value: string): EnglishSurfaceLanguageFinding[] {
  const findings: EnglishSurfaceLanguageFinding[] = [];
  if (hasGeneratedTermTokenPrefix(value)) findings.push({ category: "fallback-term-token" });
  pseudoEnglishPatterns.forEach(([category, pattern]) => {
    if (pattern.test(value)) findings.push({ category });
  });
  return findings;
}

const protectedGradeTerms = [
  ["方法一", "Method One"],
  ["方法二", "Method Two"],
  ["方法三", "Method Three"],
  ["第一步", "the first step"],
  ["第二步", "the second step"],
  ["第三步", "the third step"],
  ["两步", "two steps"],
  ["三步", "three steps"],
  ["十二年级", "Grade Twelve"],
  ["十一年级", "Grade Eleven"],
  ["十年级", "Grade Ten"],
  ["九年级", "Grade Nine"],
  ["八年级", "Grade Eight"],
  ["七年级", "Grade Seven"],
  ["六年级", "Grade Six"],
  ["五年级", "Grade Five"],
  ["四年级", "Grade Four"],
  ["三年级", "Grade Three"],
  ["二年级", "Grade Two"],
  ["一年级", "Grade One"],
  ["高三", "Senior Three"],
  ["高二", "Senior Two"],
  ["高一", "Senior One"],
  ["初三", "Junior Three"],
  ["初二", "Junior Two"],
  ["初一", "Junior One"]
] as const;

const directionName = {
  东: "east",
  南: "south",
  西: "west",
  北: "north"
} as const;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;
const weekdayNames: Record<string, string> = {
  一: "Monday", 二: "Tuesday", 三: "Wednesday", 四: "Thursday", 五: "Friday", 六: "Saturday",
  日: "Sunday", 天: "Sunday"
};

function newNumericLiteralPattern(allowAfterProtectedToken = false) {
  const leftBoundary = allowAfterProtectedToken
    ? String.raw`(?:(?<![A-Za-z])|(?<=QXZ))`
    : String.raw`(?<![A-Za-z])`;
  return new RegExp(`${leftBoundary}${numericLiteralSource}`, "gu");
}

function normalizeMathSymbol(value: string) {
  const compact = value.replace(/\s+/gu, "");
  if (/^[xX]$/u.test(compact)) return "×";
  if (/^[:：]$/u.test(compact)) return "∶";
  if (/^[⋅·]$/u.test(compact)) return "·";
  if (/^[|∣]$/u.test(compact)) return "|";
  return compact
    .replaceAll("−", "-")
    .replaceAll("－", "-")
    .replaceAll("＋", "+")
    .replaceAll("＝", "=")
    .replaceAll("＜", "<")
    .replaceAll("＞", ">")
    .replaceAll("⟂", "⊥")
    .replaceAll("％", "%");
}

function normalizeMathGrouping(value: string) {
  return value
    .replaceAll("（", "(")
    .replaceAll("）", ")")
    .replaceAll("［", "[")
    .replaceAll("］", "]")
    .replaceAll("｛", "{")
    .replaceAll("｝", "}");
}

function normalizeEnglishMathTypography(value: string) {
  return normalizeMathGrouping(value)
    .replaceAll("－", "-")
    .replaceAll("＋", "+")
    .replaceAll("＝", "=")
    .replaceAll("＜", "<")
    .replaceAll("＞", ">")
    .replaceAll("％", "%");
}

function groupedInteger(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
}

function multiplyDecimalByPowerOfTen(value: string, exponent: number) {
  const [whole = "0", fraction = ""] = value.split(".");
  const digits = `${whole}${fraction}`;
  const decimalPosition = whole.length + exponent;
  let expanded: string;
  if (decimalPosition >= digits.length) {
    expanded = `${digits}${"0".repeat(decimalPosition - digits.length)}`;
  } else if (decimalPosition <= 0) {
    expanded = `0.${"0".repeat(-decimalPosition)}${digits}`;
  } else {
    expanded = `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
  }
  const [expandedWhole = "0", expandedFraction = ""] = expanded.split(".");
  const normalizedWhole = expandedWhole.replace(/^0+(?=\d)/u, "") || "0";
  const normalizedFraction = expandedFraction.replace(/0+$/u, "");
  return normalizedFraction
    ? `${groupedInteger(normalizedWhole)}.${normalizedFraction}`
    : groupedInteger(normalizedWhole);
}

function scaledArabicNumber(value: string, unit: string) {
  const exponents: Record<string, number> = { 万: 4, 亿: 8, 万亿: 12 };
  return multiplyDecimalByPowerOfTen(value, exponents[unit] ?? 0);
}

function monthName(value: string) {
  const index = Number.parseInt(value, 10) - 1;
  const month = monthNames[index];
  if (!month) throw new Error(`invalid calendar month ${value}`);
  return month;
}

function normalizeSemanticNumericSource(value: string) {
  return value
    .replace(/(\d{1,2})\s*时\s*(\d{1,2})\s*分/gu, (_match, hour: string, minute: string) => `${Number.parseInt(hour, 10)}:${minute.padStart(2, "0")}`)
    .replace(/(\d{1,2})\s*(?:月\s*)?(?:至|到|~|～|—|–|-)\s*(\d{1,2})\s*月(?!个)/gu, (_match, start: string, end: string) => `${monthName(start)} to ${monthName(end)}`)
    .replace(/(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号)/gu, (_match, month: string, day: string) => `${monthName(month)} ${day}`)
    .replace(/(\d{1,2})\s*月(?=\s*有\s*\d+(?:\.\d+)?\s*天)/gu, (_match, month: string) => monthName(month))
    .replace(/(\d{1,2})\s*月(?=\s*[+\-−]?\d+(?:\.\d+)?\s*(?:℃|摄氏度))/gu, (_match, month: string) => `${monthName(month)} `)
    .replace(/(\|\s*)(\d{1,2})\s*月(?=\s*\|)/gu, (_match, prefix: string, month: string) => `${prefix}${monthName(month)}`)
    .replace(/(\d+(?:\.\d+)?)\s*(万亿(?![分位])|亿(?![分位])|万(?![亿分位]))/gu, (_match, amount: string, unit: string) => scaledArabicNumber(amount, unit));
}

function normalizeSemanticMathSource(value: string) {
  return value
    // U+2033 is conventional second-derivative / twice-primed notation after a
    // mathematical identifier. Normalize it to two supported prime marks so
    // English prose does not accidentally drop the identifier as an inch mark.
    .replace(/([A-Za-zα-ωΑ-Ω])″/gu, "$1′′")
    .replace(/([A-Za-z])甲/gu, "$1_Jia")
    .replace(/([A-Za-z])乙/gu, "$1_Yi")
    .replace(/π\s*取\s*(\d+(?:\.\d+)?)/gu, "π=$1")
    .replace(/(\d+(?:\.\d+)?|_+)\s*度/gu, "$1°");
}

export function numericTokens(value: string) {
  return Array.from(normalizeSemanticNumericSource(value).matchAll(newNumericLiteralPattern()), (match) =>
    match[0].replace(/[\s,]+/gu, "")
  ).sort();
}

export function indexedMathIdentifiers(value: string) {
  return Array.from(new Set(
    contextualMathIdentifierMatches(normalizeSemanticMathSource(value)).map((match) => match.value)
  )).sort();
}

function previousNonWhitespaceIndex(value: string, start: number) {
  for (let index = start; index >= 0; index -= 1) {
    if (!/\s/u.test(value[index])) return index;
  }
  return -1;
}

function nextNonWhitespaceIndex(value: string, start: number) {
  for (let index = start; index < value.length; index += 1) {
    if (!/\s/u.test(value[index])) return index;
  }
  return -1;
}

function isWordCharacter(value: string | undefined) {
  return Boolean(value && /[A-Za-z0-9_]/u.test(value));
}

function isSingleLetterToken(value: string, index: number) {
  return /[A-Za-zα-ωΑ-Ω]/u.test(value[index] ?? "")
    && !isWordCharacter(value[index - 1])
    && !isWordCharacter(value[index + 1]);
}

function adjacentAsciiWord(value: string, index: number) {
  let start = index;
  let end = index + 1;
  while (start > 0 && /[A-Za-z]/u.test(value[start - 1])) start -= 1;
  while (end < value.length && /[A-Za-z]/u.test(value[end])) end += 1;
  return value.slice(start, end);
}

export function contextualAsciiMinusIndexes(value: string) {
  const indexes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "-") continue;
    const leftIndex = previousNonWhitespaceIndex(value, index - 1);
    const rightIndex = nextNonWhitespaceIndex(value, index + 1);
    if (rightIndex < 0) continue;
    const left = leftIndex >= 0 ? value[leftIndex] : "";
    const right = value[rightIndex];
    const rightAfterUnaryIndex = /[+\-−－]/u.test(right)
      ? nextNonWhitespaceIndex(value, rightIndex + 1)
      : -1;
    const rightStartsOperand = /[\dA-Za-zα-ωΑ-Ω([{（［｛√π]/u.test(right)
      || (rightAfterUnaryIndex >= 0 && /[\dA-Za-zα-ωΑ-Ω([{（［｛√π]/u.test(value[rightAfterUnaryIndex]));
    if (!rightStartsOperand) continue;

    // A sign before an Arabic magnitude or a grouped operand is mathematical
    // regardless of whether the surrounding prose is Chinese or English.
    if (/[\d([{（［｛√π]/u.test(right)
      || (rightAfterUnaryIndex >= 0 && /[\d([{（［｛√π]/u.test(value[rightAfterUnaryIndex]))) {
      indexes.push(index);
      continue;
    }

    if (/[A-Za-z]/u.test(left) && leftIndex === index - 1 && rightIndex > index + 1) {
      const suspendedWord = adjacentAsciiWord(value, leftIndex);
      const followingWord = /[A-Za-z]/u.test(right) ? adjacentAsciiWord(value, rightIndex) : "";
      if (suspendedWord.length > 1 || /^(?:and|or)$/iu.test(followingWord)) continue;
    }

    if (/[A-Za-z]/u.test(right) && rightIndex === index + 1) {
      const rightWord = adjacentAsciiWord(value, rightIndex);
      const leftWord = /[A-Za-z]/u.test(left) && leftIndex === index - 1
        ? adjacentAsciiWord(value, leftIndex)
        : "";
      const uppercaseMathLabels = Boolean(leftWord && /^[A-Z]{1,4}$/u.test(leftWord) && /^[A-Z]{1,4}$/u.test(rightWord));
      const singleLetterOperands = Boolean(
        leftWord
        && isSingleLetterToken(value, leftIndex)
        && isSingleLetterToken(value, rightIndex)
      );
      const knownMathFunction = /^(?:sin|cos|tan|cot|sec|csc|log|ln|exp|sqrt)$/iu.test(rightWord);
      const spacedOperator = leftIndex < index - 1 || rightIndex > index + 1;
      if (rightWord.length > 1 && !uppercaseMathLabels && !knownMathFunction && !spacedOperator) continue;
      if (leftWord && !uppercaseMathLabels && !singleLetterOperands && !knownMathFunction && !spacedOperator) continue;
    }

    const leftEndsOperand = /[\dA-Za-zα-ωΑ-Ω)\]］｝}%％°]/u.test(left);
    const leftAllowsUnary = leftIndex < 0 || /[+\-−－＋×÷=＝<>＜＞≤≥≠≈±^∶([{（［｛,，]/u.test(left);
    if (leftEndsOperand || leftAllowsUnary) indexes.push(index);
  }
  return indexes;
}

function unambiguousMathMatches(value: string) {
  return Array.from(value.matchAll(unambiguousMathSymbolPattern)).filter((match) => {
    if (match[0] === "°") {
      return !/^\s*[CF]\b/iu.test(value.slice(match.index + match[0].length));
    }
    if (/^[²³]$/u.test(match[0])) {
      const unit = value.slice(0, match.index).match(/([A-Za-z]+)$/u)?.[1]?.toLowerCase();
      if (unit && new Set(["m", "cm", "dm", "mm", "km", "ft", "in"]).has(unit)) return false;
    }
    return true;
  });
}

type LocatedMathToken = { index: number; end: number; value: string };

function isClockColon(value: string, index: number) {
  const leftMatch = value.slice(0, index).match(/(\d{1,2})\s*$/u);
  const rightMatch = value.slice(index + 1).match(/^\s*(\d{2})(?!\d)/u);
  if (!leftMatch || !rightMatch) return false;
  const hour = Number.parseInt(leftMatch[1], 10);
  const minute = Number.parseInt(rightMatch[1], 10);
  if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return true;
  const prefix = value.slice(0, index - leftMatch[0].length).slice(-40);
  const suffix = value.slice(index + 1 + rightMatch[0].length, index + 1 + rightMatch[0].length + 12);
  return /(?:\bit\s+is|\b(?:the\s+)?time\s+is|\bclock\s+(?:shows|reads)|\bat)\s*$/iu.test(prefix)
    || /^\s*(?:a\.?m\.?|p\.?m\.?)\b/iu.test(suffix);
}

function isCompactMathOperand(value: string, index: number) {
  const character = value[index] ?? "";
  if (/[\dα-ωΑ-ΩπΠ∞)\]］｝}([{（［｛]/u.test(character)) return true;
  if (!/[A-Za-z]/u.test(character)) return false;
  const word = adjacentAsciiWord(value, index);
  return word.length === 1 || /^[A-Z]{2,4}$/u.test(word);
}

function contextualAsciiOperatorMatches(value: string): LocatedMathToken[] {
  const matches: LocatedMathToken[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== ":" && character !== "/") continue;
    const leftIndex = previousNonWhitespaceIndex(value, index - 1);
    const rightIndex = nextNonWhitespaceIndex(value, index + 1);
    if (leftIndex < 0 || rightIndex < 0) continue;
    if (!isCompactMathOperand(value, leftIndex) || !isCompactMathOperand(value, rightIndex)) continue;
    if (character === ":" && isClockColon(value, index)) continue;
    if (character === ":") {
      if (["(", "[", "{"].includes(value[rightIndex])) continue;
      if (/\d/u.test(value[leftIndex]) !== /\d/u.test(value[rightIndex])) continue;
      const spaced = leftIndex !== index - 1 || rightIndex !== index + 1;
      const rightNumeric = value.slice(rightIndex).match(/^\d+(?:\.\d+)?/u)?.[0];
      const rightNumericEnd = rightNumeric ? rightIndex + rightNumeric.length : rightIndex;
      const numericRatio = /\d/u.test(value[leftIndex])
        && /\d/u.test(value[rightIndex])
        && !/[A-Za-z]/u.test(value[rightNumericEnd] ?? "");
      const compactStandaloneRatio = /^\s*(?:\d+(?:\.\d+)?|[A-Za-z])\s*:\s*(?:\d+(?:\.\d+)?|[A-Za-z])\s*[.,;]?\s*$/u.test(value);
      const nearbyRatioWord = /\b(?:ratio|scale|proportion)\s*(?:is|of|=|:)?\s*[^:]{0,20}$/iu.test(value.slice(0, index));
      if (spaced && !numericRatio && !compactStandaloneRatio && !nearbyRatioWord) continue;
    }
    // A numeric fraction is already one exact NUM atom. Avoid an overlapping
    // slash atom, while retaining algebraic slashes such as u/v.
    if (character === "/" && /\d/u.test(value[leftIndex]) && /\d/u.test(value[rightIndex])) continue;
    matches.push({ index, end: index + 1, value: normalizeMathSymbol(character) });
  }
  return matches;
}

function mathContextXMatches(value: string): LocatedMathToken[] {
  const matches: LocatedMathToken[] = [];
  for (const match of value.matchAll(mathContextXPattern)) {
    const relativeX = match[0].search(/[xX]/u);
    const xIndex = match.index + relativeX;
    const leftDigitIndex = previousNonWhitespaceIndex(value, xIndex - 1);
    let numericStart = leftDigitIndex;
    while (numericStart > 0 && /[\d.,]/u.test(value[numericStart - 1])) numericStart -= 1;
    // In x1x2 or A1x2, the digit to the left belongs to an identifier;
    // the middle x is not a multiplication sign.
    if (numericStart > 0 && /[A-Za-z_α-ωΑ-Ω₀-₉]/u.test(value[numericStart - 1])) continue;
    matches.push({ index: match.index, end: match.index + match[0].length, value: "×" });
  }
  return matches;
}

function superscriptExponentMatches(value: string): LocatedMathToken[] {
  const matches: LocatedMathToken[] = [];
  for (const match of value.matchAll(superscriptExponentPattern)) {
    const priorIndex = previousNonWhitespaceIndex(value, match.index - 1);
    if (priorIndex < 0 || !/[\d)\]\}）］｝]/u.test(value[priorIndex])) continue;
    matches.push({ index: match.index, end: match.index + match[0].length, value: match[0] });
  }
  return matches;
}

function contextualSequenceEllipsisMatches(value: string): LocatedMathToken[] {
  const matches: LocatedMathToken[] = [];
  for (const match of value.matchAll(sequenceEllipsisPattern)) {
    const leftDelimiterIndex = previousNonWhitespaceIndex(value, match.index - 1);
    const rightDelimiterIndex = nextNonWhitespaceIndex(value, match.index + match[0].length);
    if (leftDelimiterIndex < 0 || rightDelimiterIndex < 0) continue;
    if (!/[,，;；]/u.test(value[leftDelimiterIndex]) || !/[,，;；]/u.test(value[rightDelimiterIndex])) continue;
    const leftAtomIndex = previousNonWhitespaceIndex(value, leftDelimiterIndex - 1);
    const rightAtomIndex = nextNonWhitespaceIndex(value, rightDelimiterIndex + 1);
    if (leftAtomIndex < 0 || rightAtomIndex < 0) continue;
    const mathAtom = /[\dA-Za-zα-ωΑ-ΩπΠ∞₀-₉\u2070-\u209c\u1d2c-\u1d6a\u1d9b-\u1dbf)\]\}）］｝]/u;
    if (!mathAtom.test(value[leftAtomIndex]) || !mathAtom.test(value[rightAtomIndex])) continue;
    matches.push({ index: match.index, end: match.index + match[0].length, value: "…" });
  }
  return matches;
}

function mathOperatorMatches(value: string): LocatedMathToken[] {
  const matches: LocatedMathToken[] = [];
  for (const match of unambiguousMathMatches(value)) {
    matches.push({ index: match.index, end: match.index + match[0].length, value: normalizeMathSymbol(match[0]) });
  }
  contextualAsciiMinusIndexes(value).forEach((index) => matches.push({ index, end: index + 1, value: "-" }));
  matches.push(...mathContextXMatches(value));
  matches.push(...contextualAsciiOperatorMatches(value));
  matches.push(...superscriptExponentMatches(value));
  matches.push(...contextualSequenceEllipsisMatches(value));
  return matches
    .sort((left, right) => left.index - right.index || right.end - left.end)
    .filter((match, index, all) => !all.slice(0, index).some((prior) => prior.end > match.index));
}

function spanTouchesIndex(span: LocatedMathToken, index: number) {
  return index >= span.index && index < span.end;
}

function contextualMathIdentifierMatches(value: string): LocatedMathToken[] {
  const operatorMatches = mathOperatorMatches(value);
  const geometryDocument = /[△∠⊥⟂]|\b(?:segments?|lines?|rays?|angles?|triangles?|rectangles?|squares?|circles?|points?|vertices|vectors?|planes?|diagonals?|quadrilaterals?)\b|(?:线段|直线|射线|角|三角形|矩形|正方形|圆|点|顶点|向量|平面|对角线|四边形)/iu.test(value);
  const mathDocument = operatorMatches.length > 0 || /\b(?:variable|unknown|function|equation|inequality|coordinate|axis|proposition|event)\b/iu.test(value);
  const optionDocument = /\boptions?\b/iu.test(value);
  const matches: LocatedMathToken[] = [];
  for (const match of value.matchAll(mathIdentifierCandidatePattern)) {
    let candidate = match[0];
    const index = match.index;
    let end = index + candidate.length;
    if (/^(?:[A-Z]{1,4}|[a-zα-ωΑ-Ω])$/u.test(candidate)) {
      const prime = value.slice(end).match(/^(?:′+|'+(?![A-Za-z]))/u)?.[0];
      if (prime) {
        candidate += prime;
        end += prime.length;
      }
    }
    if (/^ZXQ(?:TERM|MATH|NUM)[A-Z]+QXZ$/u.test(candidate)) continue;
    if (operatorMatches.some((operator) => operator.index < end && operator.end > index)) continue;

    const leftIndex = previousNonWhitespaceIndex(value, index - 1);
    const rightIndex = nextNonWhitespaceIndex(value, end);
    const left = leftIndex >= 0 ? value[leftIndex] : "";
    const right = rightIndex >= 0 ? value[rightIndex] : "";
    const lower = candidate.toLowerCase();
    const proseAcronym = candidate === "BNU"
      || (candidate === "PE" && /^\s+(?:group|class|subject|lesson)\b/iu.test(value.slice(end)));
    if (proseAcronym) continue;
    const meridiemLetter = /^[ap]$/iu.test(candidate) && /^\.m\./iu.test(value.slice(end));
    if (meridiemLetter) continue;
    const possessiveClitic = candidate === "s" && /[A-Za-z][’']$/u.test(value.slice(Math.max(0, index - 2), index));
    if (possessiveClitic) continue;
    const unitLike = /^(?:m|cm|dm|mm|km|ft|in|s|h|g|kg|l|ml)$/iu.test(lower)
      && (/[\d]/u.test(left) || /[²³⁰¹⁴⁵⁶⁷⁸⁹]/u.test(right) || left === "°");
    if (unitLike || (candidate === "C" && left === "°")) continue;

    const hasSubscriptOrIndex = /[\d_₀-₉\u1d2c-\u1d6a\u1d9b-\u1dbf\u2070-\u209c]/u.test(candidate);
    const hasGreek = /[α-ωΑ-Ω]/u.test(candidate);
    const leftOperator = operatorMatches.some((operator) => spanTouchesIndex(operator, leftIndex));
    const rightOperator = operatorMatches.some((operator) => spanTouchesIndex(operator, rightIndex));
    const adjacentCjk = cjkPattern.test(left) || cjkPattern.test(right);
    const priorWords = value.slice(Math.max(0, index - 24), index);
    if (/^[xy]$/u.test(candidate) && /^-coordinate\b/iu.test(value.slice(end))) continue;
    const localizedQuadrant = /^(?:I|II|III|IV)$/u.test(candidate)
      && /\bquadrant\s*$/iu.test(priorWords);
    const geometryLabel = /^[A-Z]{2,4}[′']*$/u.test(candidate)
      && !localizedQuadrant
      && (adjacentCjk
        || geometryDocument
        || leftOperator
        || rightOperator
        || ["△", "∠"].includes(left)
        || /\b(?:segment|line|ray|angle|triangle|rectangle|square|circle|point|vertex|vector|plane)\s+$/iu.test(priorWords));
    const knownFunction = /^(?:sin|cos|tan|cot|sec|csc|log|ln|exp|sqrt)$/iu.test(candidate);
    const followedByMathCall = right === "("
      && /[\dA-Za-zα-ωΑ-ΩπΠ√+\-−]/u.test(value[nextNonWhitespaceIndex(value, rightIndex + 1)] ?? "");
    const leftGrouping = ["(", "[", "{"].includes(left);
    const rightGrouping = [")", "]", "}"].includes(right);
    let beforeOpenIndex = leftGrouping ? previousNonWhitespaceIndex(value, leftIndex - 1) : -1;
    while (beforeOpenIndex >= 0 && /[′']/u.test(value[beforeOpenIndex])) {
      beforeOpenIndex = previousNonWhitespaceIndex(value, beforeOpenIndex - 1);
    }
    const groupedAsFunctionArgument = leftGrouping && rightGrouping && beforeOpenIndex >= 0
      && /[A-Za-zα-ωΑ-Ω]/u.test(value[beforeOpenIndex]);
    const insideMathGrouping = (leftGrouping && rightOperator) || (rightGrouping && leftOperator) || groupedAsFunctionArgument;
    const sentenceInitial = leftIndex < 0 || /[.!?;:。！？；：]/u.test(left);
    const optionPredicate = /^\s*(?::|：|,|，|\band\b|\bor\b|(?:option|choice)\b|(?:is|are|was|were|has|have|had|does|do|did|uses?|used|adds?|added|changes?|changed|represents?|represented|matches?|matched|omits?|omitted|misses?|missed|gives?|gave|shows?|showed|states?|stated)\b)/iu.test(value.slice(end));
    const articleLikeOptionA = candidate === "A" && sentenceInitial && !optionPredicate;
    const optionLabel = /^[A-D]$/u.test(candidate)
      && (/^[.．):：、、]/u.test(value.slice(end))
        || /\b(?:option|choice|plan|only)\s*$/iu.test(priorWords)
        || /^\s+(?:is\s+)?(?:correct|wrong|true|false)\b/iu.test(value.slice(end))
        || (!articleLikeOptionA && optionPredicate)
        || (optionDocument && !articleLikeOptionA));
    const optionListLabel = /^[A-D]$/u.test(candidate)
      && (/[、,，]\s*$/u.test(value.slice(Math.max(0, index - 4), index))
        || /^\s*[、,，]/u.test(value.slice(end)));
    const namedMathSymbol = /^[A-Za-zα-ωΑ-Ω][′']*$/u.test(candidate)
      && /\b(?:points?|figures?|vertex|vertices|angles?|lines?|rays?|segments?|circles?|vectors?|variables?|unknowns?|events?|propositions?|sets?|types?|parameters?|functions?|terms?|denominators?)(?:\s+labeled)?\s+$/iu.test(priorWords);
    const followedByUnit = /^[A-Za-zα-ωΑ-Ω][′']*$/u.test(candidate)
      && /^\s*(?:mm|cm|dm|km|m|kg|g|L)\b/u.test(value.slice(end));
    const documentVariable = /^(?:k|n|p|q|t|u|v|w|x|y|z)$/u.test(candidate)
      && mathDocument
      && !/[′']/u.test(value[index - 1] ?? "");
    const introducedVariable = (/^[a-zα-ω][′']*$/u.test(candidate)
        && /\blet\s+$/iu.test(priorWords)
        && /^\s*(?:=|∈|<|>|≤|≥|represent|denote|be\b)/iu.test(value.slice(end)))
      || (/^(?:k|m|n|p|q|t|u|v|w|x|y|z)$/u.test(candidate)
        && /\b(?:where|and|or)\s+$/iu.test(priorWords));
    const localizedVariableList = /^[a-zα-ω][′']*$/u.test(candidate)
      && (/^\s*[、，]\s*[a-zα-ω][′']*(?![A-Za-z0-9_])/u.test(value.slice(end))
        || /[a-zα-ω][′']*\s*[、，]\s*$/u.test(priorWords));
    const coordinatedVariableFollower = /^\s*(?:[,;，；]|and\b|or\b|is\b|are\b|intersects?\b|=|∈|<|>|≤|≥)/iu.test(value.slice(end));
    const coordinatedVariable = /^[a-zα-ω][′']*$/u.test(candidate)
      && (mathDocument || geometryDocument)
      && (/^\s*(?:,|and|or)\s+[a-zα-ω][′']*\b/iu.test(value.slice(end))
        || (/\b[a-zα-ω][′']*\s+(?:and|or)\s+$/iu.test(priorWords) && coordinatedVariableFollower));
    const labeledLineVariable = /^[a-zα-ω][′']*$/u.test(candidate)
      && (mathDocument || geometryDocument)
      && /^\s*:/u.test(value.slice(end));
    const geometryPoint = (/^[B-HJ-Z][′']*$/u.test(candidate) || /^[A-Z][′']+$/u.test(candidate))
      && geometryDocument;
    const describedPoint = /^[A-Z][′']*$/u.test(candidate)
      && /^\s+is\s+(?:the\s+)?(?:midpoint|vertex|point|center|centre|foot)\b/iu.test(value.slice(end));
    const describedVariable = ((/^[a-zα-ω][′']*$/u.test(candidate))
        || (/^[A-ZΑ-Ω][′']*$/u.test(candidate) && mathDocument))
      && /^\s+(?:is|are|denotes|represents|increases|decreases)\b/iu.test(value.slice(end));
    const hasPrecomposedMathDiacritic = /[\u00c0-\u024f]/u.test(candidate)
      && (leftOperator || rightOperator || adjacentCjk || mathDocument);
    const ordinalSuffix = /^(?:st|nd|rd|th)$/iu.test(candidate)
      && leftIndex === index - 1
      && /\d/u.test(left)
      && /\d+$/u.test(value.slice(0, index));
    const englishFormulaProseLabel = /^(?:area|average|base|capacity|centimeter|centimeters|cost|difference|distance|height|hour|hours|length|maximum|mean|meter|meters|minimum|minute|minutes|price|product|profit|quotient|radius|range|second|seconds|speed|sum|time|total|variance|volume|width)$/iu.test(candidate);
    const compactAlgebraicRun = /^[a-z]{2,8}$/u.test(candidate)
      && !unitLike
      && !englishFormulaProseLabel
      && !ordinalSuffix
      && ((leftOperator && leftIndex === index - 1) || (rightOperator && rightIndex === end)
        || (leftIndex === index - 1 && /\d/u.test(left))
        || (rightIndex === end && /[²³⁰¹⁴⁵⁶⁷⁸⁹]/u.test(right)));
    const numericCoefficientSymbol = candidate === "i"
      && leftIndex === index - 1
      && /\d/u.test(left);
    const implicitCoefficientSymbol = /^[a-zα-ω][′']*$/u.test(candidate)
      && leftIndex === index - 1
      && (left === ")" || /\d/u.test(left))
      && !unitLike;
    const primedSymbol = /^[A-Za-zα-ωΑ-Ω][′']+$/u.test(candidate);
    const singleSymbol = /^[A-Za-zα-ωΑ-Ω][′']*$/u.test(candidate)
      && (hasGreek || adjacentCjk || leftOperator || rightOperator || followedByMathCall || insideMathGrouping || ["∠", "△"].includes(left));

    if (hasSubscriptOrIndex || hasGreek || geometryLabel || knownFunction || optionLabel || optionListLabel || namedMathSymbol
      || followedByUnit || documentVariable || introducedVariable || localizedVariableList
      || coordinatedVariable || labeledLineVariable
      || geometryPoint || describedPoint || describedVariable
      || hasPrecomposedMathDiacritic
      || compactAlgebraicRun || numericCoefficientSymbol || implicitCoefficientSymbol || primedSymbol || singleSymbol) {
      matches.push({ index, end, value: candidate });
    }
  }
  return matches;
}

export function mathSymbolTokens(value: string) {
  const comparable = normalizeSemanticMathSource(value);
  return mathOperatorMatches(comparable).map((match) => match.value);
}

export function orderedMathTokens(value: string) {
  return collectMathExpressionAtoms(value).atoms.map((match) => match.value);
}

function collectMathExpressionAtoms(value: string) {
  const normalized = normalizeMathGrouping(normalizeSemanticNumericSource(normalizeSemanticMathSource(value)));
  const atoms: LocatedMathToken[] = [];
  for (const match of normalized.matchAll(newNumericLiteralPattern())) {
    atoms.push({
      index: match.index,
      end: match.index + match[0].length,
      value: `n:${match[0].replace(/[\s,]+/gu, "")}`
    });
  }
  mathOperatorMatches(normalized).forEach((match) => atoms.push({ ...match, value: `s:${match.value}` }));
  contextualMathIdentifierMatches(normalized).forEach((match) => atoms.push({ ...match, value: `i:${match.value}` }));
  return {
    normalized,
    atoms: atoms
      .sort((left, right) => left.index - right.index || left.end - right.end || left.value.localeCompare(right.value, "en"))
      .filter((atom, index, all) => !all.slice(0, index).some((prior) =>
        prior.index === atom.index && prior.end === atom.end && prior.value === atom.value
      ))
  };
}

export function mathExpressionSignatures(value: string) {
  const withoutListLabels = normalizeMathGrouping(normalizeSemanticNumericSource(normalizeSemanticMathSource(value)))
    .replace(/(^|[\n。！？.!?])\s*\(\d+\)/gu, "$1|");
  const { normalized, atoms: ordered } = collectMathExpressionAtoms(withoutListLabels);
  const signatures: string[] = [];
  let current: typeof ordered = [];
  function finishCurrent() {
    const operandCount = current.filter((atom) => /^(?:n:|i:|s:(?:π|Π|∞)$)/u.test(atom.value)).length;
    const hasStructuralOperator = current.some((atom) =>
      /^s:(?:\+|-|×|÷|\^|√|²|³|=|<|>|≤|≥|≠|≈|±|∶|·|\/|⊥|∥|∈|∉|∩|∪)$/u.test(atom.value)
    );
    const hasUnaryOperator = current.some((atom) => /^s:(?:\+|-|√)$/u.test(atom.value));
    if (hasStructuralOperator && (operandCount >= 2 || (hasUnaryOperator && operandCount >= 1))) {
      signatures.push(current.map((atom) => atom.value).join(","));
    }
    current = [];
  }
  ordered.forEach((atom) => {
    const prior = current.at(-1);
    if (prior) {
      const gap = normalized.slice(prior.end, atom.index);
      const hasProseBarrier = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]|[A-Za-z]{2,}|[|，。：；:;！？!?、,.\n]/u.test(gap);
      if (hasProseBarrier) finishCurrent();
    }
    current.push(atom);
  });
  finishCurrent();
  return signatures.sort();
}

export function criticalMathGroupingSignatures(value: string) {
  const normalized = normalizeMathGrouping(normalizeSemanticMathSource(value));
  const openToClose = new Map([["(", ")"], ["[", "]"], ["{", "}"]]);
  const closeToOpen = new Map(Array.from(openToClose, ([open, close]) => [close, open]));
  const stack: Array<{ character: string; index: number }> = [];
  const signatures: string[] = [];
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (openToClose.has(character)) {
      stack.push({ character, index });
      continue;
    }
    const expectedOpen = closeToOpen.get(character);
    if (!expectedOpen) continue;
    const open = stack.pop();
    if (!open || open.character !== expectedOpen) continue;
    const content = normalized.slice(open.index + 1, index);
    const numbers = numericTokens(content);
    const identifiers = indexedMathIdentifiers(content);
    const symbols = mathSymbolTokens(content);
    const hasStrongOperator = symbols.some((symbol) => !["+", "-", "%", "°"].includes(symbol));
    const hasBinaryPlusOrMinus = numbers.length + identifiers.length >= 2
      && symbols.some((symbol) => symbol === "+" || symbol === "-");
    const hasCoordinateDelimiter = /^\s*(?:-?\d+(?:\.\d+)?|[A-Za-zα-ωΑ-Ω][A-Za-z0-9_α-ωΑ-Ω₀-₉]*)\s*[,，]\s*(?:-?\d+(?:\.\d+)?|[A-Za-zα-ωΑ-Ω][A-Za-z0-9_α-ωΑ-Ω₀-₉]*)\s*$/u.test(content);
    if (hasStrongOperator || hasBinaryPlusOrMinus || hasCoordinateDelimiter) {
      signatures.push(`${open.character}${orderedMathTokens(content).join(",")}${character}`);
    }
  }
  return signatures.sort();
}

function isConventionalIntervalPair(open: string, close: string, content: string) {
  if (!((open === "(" && close === "]") || (open === "[" && close === ")"))) return false;
  const ordinaryNumber = String.raw`\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?`;
  const piMultiple = String.raw`(?:(?:${ordinaryNumber})?\s*π(?:\s*\/\s*\d+(?:\.\d+)?)?)`;
  const endpoint = String.raw`[+\-−]?(?:∞|${piMultiple}|${ordinaryNumber}|[A-Za-zα-ωΑ-Ω][A-Za-z0-9_α-ωΑ-Ω₀-₉]*)`;
  return new RegExp(`^\\s*${endpoint}\\s*[,，]\\s*${endpoint}\\s*$`, "u").test(content);
}

function unbalancedMathGrouping(value: string) {
  const normalized = normalizeMathGrouping(value);
  const openToClose = new Map([["(", ")"], ["[", "]"], ["{", "}"]]);
  const closing = new Set(openToClose.values());
  const stack: Array<{ character: string; index: number }> = [];
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (openToClose.has(character)) {
      stack.push({ character, index });
      continue;
    }
    if (!closing.has(character)) continue;
    const open = stack.at(-1);
    if (!open) return `unexpected ${character} at character ${index + 1}`;
    const expected = openToClose.get(open.character);
    const content = normalized.slice(open.index + 1, index);
    if (character !== expected && !isConventionalIntervalPair(open.character, character, content)) {
      return `expected ${expected} but received ${character} at character ${index + 1}`;
    }
    stack.pop();
  }
  const open = stack.at(-1);
  return open ? `missing ${openToClose.get(open.character)} for ${open.character} at character ${open.index + 1}` : undefined;
}

function alphabeticTokenIndex(index: number) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function replaceLocatedTokens(
  value: string,
  matches: LocatedMathToken[],
  replacement: (match: LocatedMathToken) => string
) {
  const ordered = matches
    .sort((left, right) => left.index - right.index || right.end - left.end)
    .filter((match, index, all) => !all.slice(0, index).some((prior) => prior.end > match.index));
  let cursor = 0;
  let result = "";
  ordered.forEach((match) => {
    result += value.slice(cursor, match.index);
    result += replacement(match);
    cursor = match.end;
  });
  return result + value.slice(cursor);
}

export function protectTranslationSource(value: string): ProtectedTranslationSource {
  const tokens: ProtectedTranslationSource["tokens"] = [];
  function replaceWithToken(replacement: string, kind: "TERM" | "MATH" | "NUM") {
    const placeholder = `ZXQ${kind}${alphabeticTokenIndex(tokens.length)}QXZ`;
    tokens.push({ placeholder, value: replacement });
    return placeholder;
  }

  let protectedSource = value
    .replace(/π\s*取\s*(\d+(?:\.\d+)?)/gu, (_match, amount: string) =>
      replaceWithToken(`π = ${amount}`, "MATH")
    )
    .replace(/(\d+(?:\.\d+)?|_+)\s*度/gu, (_match, amount: string) =>
      replaceWithToken(`${amount}°`, "MATH")
    )
    .replace(/([东南西北])偏([东南西北])\s*(\d+(?:\.\d+)?)\s*°/gu, (_match, base: keyof typeof directionName, toward: keyof typeof directionName, angle: string) =>
      replaceWithToken(`${angle}° ${directionName[toward]} of ${directionName[base]}`, "TERM")
    )
    .replace(/([东南西北])偏([东南西北])/gu, (_match, base: keyof typeof directionName, toward: keyof typeof directionName) =>
      replaceWithToken(`${directionName[toward]} of ${directionName[base]}`, "TERM")
    )
    .replace(/(\d{1,2})\s*时\s*(\d{1,2})\s*分/gu, (_match, hour: string, minute: string) =>
      replaceWithToken(`${Number.parseInt(hour, 10)}:${minute.padStart(2, "0")}`, "TERM")
    )
    .replace(/(?:星期|周)([一二三四五六日天])/gu, (_match, day: string) =>
      replaceWithToken(weekdayNames[day], "TERM")
    )
    .replace(/(\d{1,2})\s*月\s*(?:至|到|—|–|-)\s*(\d{1,2})\s*月/gu, (_match, start: string, end: string) =>
      replaceWithToken(`${monthName(start)} to ${monthName(end)}`, "TERM")
    )
    .replace(/(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号)/gu, (_match, month: string, day: string) =>
      replaceWithToken(`${monthName(month)} ${day}`, "TERM")
    )
    .replace(/(\d+(?:\.\d+)?)\s*(万亿(?![分位])|亿(?![分位])|万(?![亿分位]))/gu, (_match, amount: string, unit: string) =>
      replaceWithToken(scaledArabicNumber(amount, unit), "NUM")
    );

  protectedSource = protectedGradeTerms.reduce((current, [source, replacement]) => {
    const parts = current.split(source);
    if (parts.length === 1) return current;
    return parts.slice(1).reduce(
      (combined, part) => `${combined}${replaceWithToken(replacement, "TERM")}${part}`,
      parts[0] ?? ""
    );
  }, protectedSource);
  protectedSource = protectedSource.replace(
    /\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/gu,
    (match) => replaceWithToken(normalizeEnglishMathTypography(match), "MATH")
  );
  const locatedMathTokens = [
    ...mathOperatorMatches(protectedSource),
    ...contextualMathIdentifierMatches(protectedSource)
  ];
  protectedSource = replaceLocatedTokens(
    protectedSource,
    locatedMathTokens,
    (match) => replaceWithToken(match.value, "MATH")
  );
  protectedSource = protectedSource.replace(
    newNumericLiteralPattern(true),
    (match) => replaceWithToken(match.replace(/[\s,]+/gu, ""), "NUM")
  );
  return { protectedSource, tokens };
}

export function restoreProtectedTranslation(entry: TranslationValidationEntry, english: string) {
  const protection = protectTranslationSource(entry.source);
  const expectedMathTokens = Array.from(
    protection.protectedSource.matchAll(protectedTokenPattern),
    (match) => match[0]
  ).filter((token) => token.startsWith("ZXQMATH"));
  const receivedMathTokens = Array.from(
    english.matchAll(protectedTokenPattern),
    (match) => match[0]
  ).filter((token) => token.startsWith("ZXQMATH"));
  if (expectedMathTokens.join("|") !== receivedMathTokens.join("|")) {
    throw new Error(`${entry.id}: protected mathematical tokens changed order, were duplicated, or were omitted`);
  }

  let restored = english;
  protection.tokens.forEach(({ placeholder, value }) => {
    const occurrences = restored.split(placeholder).length - 1;
    if (occurrences !== 1) {
      throw new Error(`${entry.id}: protected token ${placeholder} occurred ${occurrences} times instead of once`);
    }
    restored = restored.replace(placeholder, value);
  });
  const unexpectedTokens = restored.match(protectedTokenPattern);
  if (unexpectedTokens?.length) {
    throw new Error(`${entry.id}: translation contains unexpected protected tokens`);
  }
  return restored;
}

function mathSegments(value: string) {
  return Array.from(value.matchAll(inlineMathPattern), (match) =>
    normalizeEnglishMathTypography(match[1] ?? match[2] ?? "").replace(/\s+/gu, "")
  );
}

function invalidOrdinal(value: string) {
  for (const match of value.matchAll(/\b(\d+)(-?)(st|nd|rd|th)\b/giu)) {
    const number = Number.parseInt(match[1], 10);
    const lastTwo = number % 100;
    const expectedSuffix = lastTwo >= 11 && lastTwo <= 13
      ? "th"
      : number % 10 === 1
        ? "st"
        : number % 10 === 2
          ? "nd"
          : number % 10 === 3
            ? "rd"
            : "th";
    if (match[2] || match[3].toLowerCase() !== expectedSuffix) return match[0];
  }
  return undefined;
}

function isExpressionQuantity(value: string, matchIndex: number) {
  const before = value.slice(0, matchIndex);
  return /[A-Za-z0-9)]\s*[-+]\s*$/u.test(before);
}

function hasInvalidOnePlural(value: string) {
  const compoundCount = new RegExp(
    String.raw`(?<![\d.])\b(?:1|one)(?![\d.])\s+\d+(?:\.\d+)?-[A-Za-z]+\s+(${pluralCountNounSource})\b`,
    "iu"
  ).exec(value);
  if (compoundCount) return compoundCount[0];
  for (const match of value.matchAll(pluralAfterOnePattern)) {
    if (isExpressionQuantity(value, match.index)) continue;
    return match[0];
  }
  return undefined;
}

function adjacentNumericAtomPhrase(value: string) {
  if (/[\n\t|]/u.test(value)) return undefined;
  const comparable = value.replace(inlineMathPattern, " ");
  for (const match of comparable.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?!\d)([A-Za-z]?)/gu)) {
    if (/\b(?:log|ln)_$/iu.test(comparable.slice(0, match.index))) continue;
    const trailingIndex = match.index + match[0].length;
    const trailing = comparable[trailingIndex] ?? "";
    if (trailing === "/" || trailing === "-") continue;
    return match[0];
  }
  return undefined;
}

function hasInvalidOneAgreement(value: string) {
  for (const match of value.matchAll(/\b(?:1|one)\s+(?:are|were|have)\b/giu)) {
    const before = value.slice(0, match.index);
    if (/[=<>]\s*$/u.test(before)) continue;
    const mathAtom = String.raw`(?:[A-Za-zα-ωΑ-Ω](?:[0-9_₀-₉\u1d2c-\u1d6a\u1d9b-\u1dbf\u2070-\u209c]*)?|\d+(?:\.\d+)?)`;
    const coordinatedMathSubject = new RegExp(
      String.raw`${mathAtom}\s*,\s*${mathAtom}\s*,?\s*(?:and|or)\s*$`,
      "iu"
    );
    if (coordinatedMathSubject.test(before)) continue;
    return match[0];
  }
  const ofThem = value.match(/\b(?:1|one)\s+of\s+(?:them|these|those)\s+(?:are|were|have)\b/iu);
  if (ofThem) return ofThem[0];
  const existential = value.match(/\bthere\s+(?:are|were|have\s+been)\s+(?:exactly\s+)?(?:1|one)(?![\d.])\b/iu);
  if (existential) return existential[0];
  const singularSubjectNouns = [
    "child", "person", "student", "ball", "object", "item", "vehicle", "point", "line", "row",
    "group", "part", "meter", "centimeter", "hour", "day", "rectangle", "square", "triangle", "circle"
  ].join("|");
  const singularSubject = new RegExp(
    String.raw`\b(?:1|one)(?![\d.])\s+(?:(?:${countAdjectiveSource})\s+){0,3}(?:${singularSubjectNouns})\s+(?:are|were|have)\b`,
    "iu"
  ).exec(value);
  if (singularSubject) return singularSubject[0];
  const pluralSubject = new RegExp(
    String.raw`\b(?:1|one)(?![\d.])\s+(?:(?:${countAdjectiveSource})\s+){0,3}(?:${pluralCountNounSource})\s+(?:are|were|have)\b`,
    "iu"
  ).exec(value);
  return pluralSubject?.[0];
}

const smallNumberWords = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"
] as const;
const tensWords = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"] as const;
const numberWordValues = new Map<string, number>();
for (let number = 1; number <= 144; number += 1) {
  let word: string;
  if (number < 20) word = smallNumberWords[number];
  else if (number < 100) {
    const tens = Math.floor(number / 10);
    const units = number % 10;
    word = units ? `${tensWords[tens]}-${smallNumberWords[units]}` : tensWords[tens];
  } else {
    const remainder = number - 100;
    if (!remainder) word = "one hundred";
    else if (remainder < 20) word = `one hundred ${smallNumberWords[remainder]}`;
    else {
      const tens = Math.floor(remainder / 10);
      const units = remainder % 10;
      word = `one hundred ${tensWords[tens]}${units ? `-${smallNumberWords[units]}` : ""}`;
    }
  }
  numberWordValues.set(word.replace(/-/gu, " "), number);
}
const numberWordAlternation = Array.from(numberWordValues.keys())
  .sort((left, right) => right.length - left.length)
  .map((word) => word.replace(/ /gu, "[- ]"))
  .join("|");
const literalMultiplicationMnemonicPattern = new RegExp(
  `\\b(${numberWordAlternation})\\s+(${numberWordAlternation})\\s+(${numberWordAlternation})\\b`,
  "giu"
);

function literalMultiplicationMnemonic(value: string) {
  for (const match of value.matchAll(literalMultiplicationMnemonicPattern)) {
    const left = numberWordValues.get(match[1].toLowerCase().replace(/-/gu, " "));
    const right = numberWordValues.get(match[2].toLowerCase().replace(/-/gu, " "));
    const product = numberWordValues.get(match[3].toLowerCase().replace(/-/gu, " "));
    if (left && right && product === left * right) return match[0];
  }
  return undefined;
}

function sourceHasMultiplicationMnemonic(value: string) {
  return /乘法口诀|[一二三四五六七八九][一二三四五六七八九](?:得)?[一二三四五六七八九十百零〇两]+/u.test(value);
}

function validateBearingFidelity(entry: TranslationValidationEntry, translated: string) {
  const sourceBearings = Array.from(
    entry.source.matchAll(/([东南西北])偏([东南西北])(?:\s*(\d+(?:\.\d+)?)\s*°)?/gu),
    (match) => ({
      base: directionName[match[1] as keyof typeof directionName],
      toward: directionName[match[2] as keyof typeof directionName],
      angle: match[3]
    })
  );
  sourceBearings.forEach(({ base, toward, angle }) => {
    const phrase = `${toward} of ${base}`;
    const canonical = angle
      ? new RegExp(`\\b${angle.replace(".", "\\.")}\\s*°\\s+${toward}\\s+of\\s+${base}\\b`, "iu")
      : new RegExp(`\\b${toward}\\s+of\\s+${base}\\b`, "iu");
    if (!canonical.test(translated)) {
      throw new Error(`${entry.id}: bearing must use the canonical form ${angle ? `${angle}° ` : ""}${phrase}`);
    }
  });
}

function validateCalendarFidelity(entry: TranslationValidationEntry, translated: string) {
  const expectedWeekdays = Array.from(
    entry.source.matchAll(/(?:星期|周)([一二三四五六日天])/gu),
    (match) => weekdayNames[match[1]]
  );
  if (expectedWeekdays.length) {
    const receivedWeekdays = Array.from(
      translated.matchAll(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/giu),
      (match) => `${match[0][0].toUpperCase()}${match[0].slice(1).toLowerCase()}`
    );
    if (expectedWeekdays.join("|") !== receivedWeekdays.join("|")) {
      throw new Error(
        `${entry.id}: weekday sequence changed; expected ${JSON.stringify(expectedWeekdays)}, received ${JSON.stringify(receivedWeekdays)}`
      );
    }
  }
  for (const match of entry.source.matchAll(/(\d{1,2})\s*月/gu)) monthName(match[1]);
  for (const match of entry.source.matchAll(/(\d{1,2})\s*月\s*有\s*(\d+(?:\.\d+)?)\s*天/gu)) {
    const expectedMonth = monthName(match[1]);
    const expectedDays = match[2];
    const canonical = new RegExp(
      `(?:\\b${expectedMonth}\\s+(?:has|contains|includes)\\s+${expectedDays}\\s+days?\\b|\\b${expectedDays}\\s+days?\\s+in\\s+${expectedMonth}\\b)`,
      "iu"
    );
    if (!canonical.test(translated)) {
      throw new Error(`${entry.id}: calendar month-length fact must preserve ${expectedMonth} has ${expectedDays} days`);
    }
  }
  for (const match of entry.source.matchAll(/(\d{1,2})\s*(?:月\s*)?(?:至|到|~|～|—|–|-)\s*(\d{1,2})\s*月(?!个)/gu)) {
    const start = monthName(match[1]);
    const end = monthName(match[2]);
    const canonical = new RegExp(`\\b${start}\\s*(?:to|through|until|[-–—])\\s*${end}\\b`, "iu");
    if (!canonical.test(translated)) {
      throw new Error(`${entry.id}: calendar range must preserve ${start} to ${end} in that order`);
    }
  }
  const expectedMonthlyLabels = Array.from(
    entry.source.matchAll(/(\d{1,2})\s*月(?=\s*[+\-−]?\d+(?:\.\d+)?\s*(?:℃|摄氏度))/gu),
    (match) => monthName(match[1])
  );
  if (expectedMonthlyLabels.length) {
    const comparable = translated.toLowerCase();
    let cursor = 0;
    for (const month of expectedMonthlyLabels) {
      const index = comparable.indexOf(month.toLowerCase(), cursor);
      if (index < 0) {
        throw new Error(`${entry.id}: calendar month sequence must preserve ${expectedMonthlyLabels.join(" to ")}`);
      }
      cursor = index + month.length;
    }
  }
  for (const match of entry.source.matchAll(/(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号)/gu)) {
    const month = monthName(match[1]);
    const day = Number.parseInt(match[2], 10);
    const suffix = day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
    const canonical = new RegExp(`(?:\\b${month}\\s+${day}(?:${suffix})?\\b|\\b${day}(?:${suffix})?\\s+(?:of\\s+)?${month}\\b)`, "iu");
    if (!canonical.test(translated)) {
      throw new Error(`${entry.id}: calendar date must preserve ${month} ${day}`);
    }
  }
}

function validateClockFidelity(entry: TranslationValidationEntry, translated: string) {
  for (const match of entry.source.matchAll(/(\d{1,2})\s*时\s*(\d{1,2})\s*分/gu)) {
    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(`${entry.id}: invalid clock reading ${match[0]}`);
    }
    const canonical = `${hour}:${String(minute).padStart(2, "0")}`;
    if (!new RegExp(`(?<!\\d)${canonical}(?!\\d)`, "u").test(translated)) {
      throw new Error(`${entry.id}: clock reading must use ${canonical}`);
    }
  }
}

function normalizeMeasurementNumber(value: string) {
  return value.replace(/[\s,]+/gu, "");
}

type LocatedMeasurementSignature = { index: number; value: string };

function sortMeasurementSignatures(signatures: LocatedMeasurementSignature[]) {
  return signatures
    .sort((left, right) => left.index - right.index)
    .map((signature) => signature.value);
}

function sourceMeasurementSignatures(value: string) {
  const signatures: LocatedMeasurementSignature[] = [];
  const unitNames: Record<string, string> = {
    毫米: "mm", 厘米: "cm", 分米: "dm", 米: "m", 千米: "km", 公里: "km",
    毫克: "mg", 克: "g", 千克: "kg", 公斤: "kg", 吨: "t",
    毫升: "ml", 升: "l", 小时: "h", 分钟: "min", 秒: "s", 天: "day",
    元: "yuan", 角: "jiao", 分: "fen"
  };
  const denominatorNames: Record<string, string> = {
    时: "h", 小时: "h", 分: "min", 分钟: "min", 秒: "s"
  };
  const currencyContext = /(?:\d(?:[\d,.]*))\s*元|(?:\d(?:[\d,.]*))\s*角|(?:人民币|金额|价格|总价|付款|找回|花费|钱)/u.test(value);
  const unitSource = "毫米|厘米|分米|千米|公里|毫克|千克|公斤|毫升|小时|分钟|米|克|吨|升|秒|天|元|角|分";
  const pattern = new RegExp(
    `(${numericLiteralSource})\\s*(平方|立方)?(${unitSource})(?:\\s*(?:/|每)\\s*(小时|分钟|时|分|秒))?`,
    "gu"
  );
  for (const match of value.matchAll(pattern)) {
    if ((match[3] === "角" || match[3] === "分") && !currencyContext) continue;
    if (match[3] === "天" && value[previousNonWhitespaceIndex(value, match.index - 1)] === "→") continue;
    const dimension = match[2] === "平方" ? "square" : match[2] === "立方" ? "cubic" : "linear";
    const priorText = value.slice(0, match.index);
    const clauseStart = Math.max(
      priorText.lastIndexOf("。"), priorText.lastIndexOf("，"), priorText.lastIndexOf("；"), priorText.lastIndexOf(";")
    );
    const precedingRate = priorText.slice(clauseStart + 1).match(/每(小时|分钟|秒)/u)?.[1];
    const denominator = match[4] ?? precedingRate;
    const rate = denominator ? `/${denominatorNames[denominator]}` : "";
    signatures.push({
      index: match.index,
      value: `${normalizeMeasurementNumber(match[1])}:${dimension}:${unitNames[match[3]]}${rate}`
    });
  }
  for (const match of value.matchAll(new RegExp(`(${numericLiteralSource})\\s*(℃|°\\s*C|摄氏度)`, "giu"))) {
    signatures.push({ index: match.index, value: `${normalizeMeasurementNumber(match[1])}:linear:celsius` });
  }
  for (const match of value.matchAll(new RegExp(`(${numericLiteralSource})\\s*(℉|°\\s*F|华氏度)`, "giu"))) {
    signatures.push({ index: match.index, value: `${normalizeMeasurementNumber(match[1])}:linear:fahrenheit` });
  }
  return sortMeasurementSignatures(signatures);
}

function canonicalEnglishMeasurementUnit(value: string) {
  const compact = value.toLowerCase().replace(/[.\s]/gu, "");
  if (/^(?:℃|°c|degreecelsius|degreescelsius|celsius)$/u.test(compact)) return "celsius";
  if (/^(?:℉|°f|degreefahrenheit|degreesfahrenheit|fahrenheit)$/u.test(compact)) return "fahrenheit";
  if (/^(?:mm|millimeter|millimeters|millimetre|millimetres)$/u.test(compact)) return "mm";
  if (/^(?:cm|centimeter|centimeters|centimetre|centimetres)$/u.test(compact)) return "cm";
  if (/^(?:dm|decimeter|decimeters|decimetre|decimetres)$/u.test(compact)) return "dm";
  if (/^(?:km|kilometer|kilometers|kilometre|kilometres)$/u.test(compact)) return "km";
  if (/^(?:m|meter|meters|metre|metres)$/u.test(compact)) return "m";
  if (/^(?:mg|milligram|milligrams|milligramme|milligrammes)$/u.test(compact)) return "mg";
  if (/^(?:kg|kilogram|kilograms|kilogramme|kilogrammes)$/u.test(compact)) return "kg";
  if (/^(?:g|gram|grams|gramme|grammes)$/u.test(compact)) return "g";
  if (/^(?:t|ton|tons|tonne|tonnes)$/u.test(compact)) return "t";
  if (/^(?:ml|milliliter|milliliters|millilitre|millilitres)$/u.test(compact)) return "ml";
  if (/^(?:l|liter|liters|litre|litres)$/u.test(compact)) return "l";
  if (/^(?:h|hr|hrs|hour|hours)$/u.test(compact)) return "h";
  if (/^(?:min|mins|minute|minutes)$/u.test(compact)) return "min";
  if (/^(?:s|sec|secs|second|seconds)$/u.test(compact)) return "s";
  if (/^(?:d|day|days)$/u.test(compact)) return "day";
  if (/^(?:degree|degrees)$/u.test(compact)) return "celsius";
  if (/^(?:yuan|rmb|cny|¥)$/u.test(compact)) return "yuan";
  if (/^(?:jiao)$/u.test(compact)) return "jiao";
  if (/^(?:fen)$/u.test(compact)) return "fen";
  if (/^(?:dollar|dollars|usd|\$)$/u.test(compact)) return "usd";
  return compact;
}

function englishMeasurementSignatures(value: string) {
  const signatures: LocatedMeasurementSignature[] = [];
  const unitSource = [
    "millimeters?", "millimetres?", "centimeters?", "centimetres?", "decimeters?", "decimetres?",
    "kilometers?", "kilometres?", "milligrams?", "milligrammes?", "kilograms?", "kilogrammes?",
    "milliliters?", "millilitres?", "meters?", "metres?", "grams?", "grammes?", "tonnes?", "tons?",
    "liters?", "litres?", "hours?", "hrs?", "minutes?", "mins?", "seconds?", "secs?", "days?",
    "degrees?\\s+Celsius", "degrees?\\s+Fahrenheit", "degrees?", "℃", "℉", "°\\s*[CF]", "Celsius", "Fahrenheit",
    "dollars?", "yuan", "jiao", "fen", "RMB", "CNY", "USD", "mm", "cm", "dm", "km", "mg", "kg",
    "ml", "m", "g", "t", "l", "h", "min", "s", "d"
  ].join("|");
  const denominatorSource = [
    "hours?", "hrs?", "minutes?", "mins?", "seconds?", "secs?", "days?", "h", "min", "s", "d"
  ].join("|");
  const pattern = new RegExp(
    `(${numericLiteralSource})\\s*-?\\s*(?:(?:consecutive|calendar|whole)\\s+)?(?:(square|sq\\.?|cubic|cu\\.?)\\s+)?(${unitSource})([²³]?)(?![A-Za-z])(?:\\s*(?:/|per\\s+|an?\\s+)(${denominatorSource})(?![A-Za-z]))?`,
    "giu"
  );
  for (const match of value.matchAll(pattern)) {
    const unit = canonicalEnglishMeasurementUnit(match[3]);
    const dimensionWord = match[2]?.toLowerCase().replace(".", "");
    const dimension = (dimensionWord === "square" || dimensionWord === "sq") || match[4] === "²"
      ? "square"
      : (dimensionWord === "cubic" || dimensionWord === "cu") || match[4] === "³"
        ? "cubic"
        : "linear";
    const rate = match[5] ? `/${canonicalEnglishMeasurementUnit(match[5])}` : "";
    signatures.push({
      index: match.index,
      value: `${normalizeMeasurementNumber(match[1])}:${dimension}:${unit}${rate}`
    });
  }
  const prefixCurrencyPattern = new RegExp(`(RMB|CNY|USD|¥|\\$)\\s*(${numericLiteralSource})`, "giu");
  for (const match of value.matchAll(prefixCurrencyPattern)) {
    signatures.push({
      index: match.index,
      value: `${normalizeMeasurementNumber(match[2])}:linear:${canonicalEnglishMeasurementUnit(match[1])}`
    });
  }
  const prefixUnitPattern = new RegExp(`\\b(days?|hours?|minutes?|seconds?)\\s+(${numericLiteralSource})`, "giu");
  for (const match of value.matchAll(prefixUnitPattern)) {
    signatures.push({
      index: match.index,
      value: `${normalizeMeasurementNumber(match[2])}:linear:${canonicalEnglishMeasurementUnit(match[1])}`
    });
  }
  return sortMeasurementSignatures(signatures);
}

function validateMeasurementUnitFidelity(entry: TranslationValidationEntry, translated: string) {
  const expected = sourceMeasurementSignatures(entry.source);
  if (!expected.length) return;
  const received = englishMeasurementSignatures(translated);
  const available = new Map<string, number>();
  received.forEach((signature) => available.set(signature, (available.get(signature) ?? 0) + 1));
  const missing = expected.filter((signature) => {
    const count = available.get(signature) ?? 0;
    if (count <= 0) return true;
    available.set(signature, count - 1);
    return false;
  });
  if (missing.length) {
    throw new Error(
      `${entry.id}: measurement units changed; expected ${JSON.stringify(expected)}, received ${JSON.stringify(received)}`
    );
  }
  const sourceUnit = "毫米|厘米|分米|千米|公里|毫克|千克|公斤|毫升|小时|分钟|米|克|吨|升|秒|天|元|角|分";
  const compoundPattern = new RegExp(
    `(${numericLiteralSource})\\s*(?:平方|立方)?(?:${sourceUnit})\\s*(${numericLiteralSource})\\s*(?:平方|立方)?(?:${sourceUnit})`,
    "gu"
  );
  for (const compound of entry.source.matchAll(compoundPattern)) {
    const pair = sourceMeasurementSignatures(compound[0]);
    if (pair.length !== 2) continue;
    const first = received.indexOf(pair[0]);
    const second = received.indexOf(pair[1], first + 1);
    if (first < 0 || second < 0) {
      throw new Error(`${entry.id}: compound measurement quantity order changed during translation`);
    }
  }
}

function validateLanguageAndStyle(entry: TranslationValidationEntry, translated: string) {
  if (englishCjkPunctuationPattern.test(translated)) {
    throw new Error(`${entry.id}: English translation contains full-width Chinese punctuation`);
  }
  const punctuationComparable = translated.replace(/\b[ap]\.m\./giu, "meridiem");
  if (/\.\s*;/u.test(punctuationComparable)) {
    throw new Error(`${entry.id}: English translation contains malformed period-semicolon punctuation`);
  }
  if (/\b(?:Class\s+Grade|Grade\s+Class|Grade\s+\d+\s+Grade|Class\s+\d+\s+Class)\b/iu.test(translated)) {
    throw new Error(`${entry.id}: English translation contains a malformed grade/class construction`);
  }
  if (/楼/u.test(entry.source) && /\b(?:the\s+)?\d+\s+(?:floor|storey|story)\b/iu.test(translated)) {
    throw new Error(`${entry.id}: a numbered floor must use an English ordinal`);
  }
  if (/\b(?:is|reads?)\s+(?:a\.?m\.?|p\.?m\.?)\s*\(\s*\)/iu.test(translated)) {
    throw new Error(`${entry.id}: an AM/PM blank must precede the answer choice rather than follow it`);
  }
  const adjacentNumericAtoms = adjacentNumericAtomPhrase(translated);
  if (adjacentNumericAtoms) {
    throw new Error(`${entry.id}: adjacent numeric atoms need an operator, classifier, or table structure in ${adjacentNumericAtoms}`);
  }
  if (/\bsimplest\s+common\s+denominator\b/iu.test(translated)) {
    throw new Error(`${entry.id}: use least or lowest common denominator in standard mathematical English`);
  }
  if (/\bvertical\s+(?:form|calculation|arithmetic)\b/iu.test(translated)) {
    throw new Error(`${entry.id}: use column method instead of a literal vertical-calculation translation`);
  }
  if (rawMarkdownEmphasisPattern.test(translated)) {
    throw new Error(`${entry.id}: learner-facing plain text contains raw Markdown emphasis`);
  }
  if (/\b[A-Za-z]{2,}\(s\)(?![A-Za-z])/u.test(translated)) {
    throw new Error(`${entry.id}: learner-facing count noun uses a literal parenthetical plural (s)`);
  }
  if (internalQaPattern.test(translated)) {
    throw new Error(`${entry.id}: English translation contains an internal workflow QA label`);
  }
  if (/(?:\d{1,2}\s*月|\d{1,2}\s*(?:日|号))/u.test(entry.source)
    && /\b(?:month\s+\d{1,2}|day\s+\d{1,2}|\d{1,2}\s+month|\d{1,2}\s+day)\b/iu.test(translated)) {
    throw new Error(`${entry.id}: calendar date uses machine-translated month/day phrasing`);
  }
  if (/\d+(?:\.\d+)?\s*(?:万亿|亿|万)(?![分位])/u.test(entry.source)
    && /\b\d+(?:\.\d+)?\s+(?:ten\s+thousand|hundred\s+million)\b/iu.test(translated)) {
    throw new Error(`${entry.id}: Chinese numeric scale must be converted to a standard English value`);
  }
  const multiplicationMnemonic = sourceHasMultiplicationMnemonic(entry.source)
    ? literalMultiplicationMnemonic(translated)
    : undefined;
  if (multiplicationMnemonic) {
    throw new Error(`${entry.id}: multiplication rhyme must use times and is, not ${multiplicationMnemonic}`);
  }
}

export function validateRestoredTranslation(entry: TranslationValidationEntry, translatedValue: string) {
  const translated = translatedValue.trim();
  if (!translated) throw new Error(`${entry.id}: empty English translation`);
  if (cjkPattern.test(translated)) {
    const remaining = Array.from(new Set(translated.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/gu) ?? [])).slice(0, 12);
    throw new Error(`${entry.id}: English translation still contains CJK text: ${remaining.join("")}`);
  }
  if (hasGeneratedTermTokenPrefix(translated)) {
    throw new Error(`${entry.id}: English translation contains a literal term-* placeholder`);
  }
  const pseudoEnglish = englishSurfaceLanguageFindings(translated)
    .find((finding) => finding.category !== "fallback-term-token");
  if (pseudoEnglish) {
    throw new Error(`${entry.id}: English translation contains the pseudo-English pattern ${pseudoEnglish.category}`);
  }
  if (forbiddenEnglishPattern.test(translated)) {
    throw new Error(`${entry.id}: English translation contains a placeholder or internal workflow label`);
  }
  const groupingError = unbalancedMathGrouping(translated);
  if (groupingError) throw new Error(`${entry.id}: unbalanced mathematical grouping: ${groupingError}`);
  validateCalendarFidelity(entry, translated);
  validateClockFidelity(entry, translated);
  validateMeasurementUnitFidelity(entry, translated);
  validateLanguageAndStyle(entry, translated);

  const badOrdinal = invalidOrdinal(translated);
  if (badOrdinal) throw new Error(`${entry.id}: English translation contains an invalid ordinal ${badOrdinal}`);
  const badOnePlural = hasInvalidOnePlural(translated);
  if (badOnePlural) throw new Error(`${entry.id}: singular quantity uses a plural noun in ${badOnePlural}`);
  const badAgreement = hasInvalidOneAgreement(translated);
  if (badAgreement) throw new Error(`${entry.id}: singular quantity has invalid verb agreement in ${badAgreement}`);
  if (malformedWordOperatorPattern.test(translated)) {
    throw new Error(`${entry.id}: an English operator word is followed by an extra signed numeral`);
  }
  if (/(?:[+×÷]\s*[-−]\s*\d)|(?:\d+(?:\.\d+)?\s*[-−]\s*[-−]\s*\d)/u.test(translated)) {
    throw new Error(`${entry.id}: a negative operand must be parenthesized in the displayed expression`);
  }
  if (/\d+(?:\.\d+)?\s*下/u.test(entry.source) && /\d+(?:\.\d+)?\s*(?:below|down)\b/iu.test(translated)) {
    throw new Error(`${entry.id}: a counted activity unit 下 was translated as a spatial direction`);
  }

  const sourceNumbers = numericTokens(entry.source);
  const englishNumbers = numericTokens(translated);
  if (sourceNumbers.join("|") !== englishNumbers.join("|")) {
    throw new Error(
      `${entry.id}: numeric tokens changed during translation; expected ${JSON.stringify(sourceNumbers)}, received ${JSON.stringify(englishNumbers)}`
    );
  }
  const sourceSymbols = mathSymbolTokens(entry.source).sort();
  const englishSymbols = mathSymbolTokens(translated).sort();
  if (sourceSymbols.join("|") !== englishSymbols.join("|")) {
    throw new Error(
      `${entry.id}: mathematical symbols changed during translation; expected ${JSON.stringify(sourceSymbols)}, received ${JSON.stringify(englishSymbols)}`
    );
  }
  if (sourceSymbols.length > 0) {
    const sourceExpressions = mathExpressionSignatures(entry.source);
    const englishExpressions = mathExpressionSignatures(translated);
    if (sourceExpressions.join("|") !== englishExpressions.join("|")) {
      throw new Error(
        `${entry.id}: mathematical expression structure changed during translation; expected ${JSON.stringify(sourceExpressions)}, received ${JSON.stringify(englishExpressions)}`
      );
    }
  }
  const sourceGroups = criticalMathGroupingSignatures(entry.source);
  const englishGroups = criticalMathGroupingSignatures(translated);
  if (sourceGroups.join("|") !== englishGroups.join("|")) {
    throw new Error(
      `${entry.id}: mathematically significant grouping changed; expected ${JSON.stringify(sourceGroups)}, received ${JSON.stringify(englishGroups)}`
    );
  }
  const sourceIdentifiers = indexedMathIdentifiers(entry.source);
  const englishIdentifiers = indexedMathIdentifiers(translated);
  if (sourceIdentifiers.join("|") !== englishIdentifiers.join("|")) {
    throw new Error(
      `${entry.id}: indexed mathematical identifiers changed during translation; expected ${JSON.stringify(sourceIdentifiers)}, received ${JSON.stringify(englishIdentifiers)}`
    );
  }
  const sourceMath = mathSegments(entry.source);
  const englishMath = mathSegments(translated);
  if (sourceMath.join("|") !== englishMath.join("|")) {
    throw new Error(
      `${entry.id}: delimited math changed during translation; expected ${JSON.stringify(sourceMath)}, received ${JSON.stringify(englishMath)}`
    );
  }
  validateBearingFidelity(entry, translated);
  return translated;
}

export function validateTranslation(entry: TranslationValidationEntry, english: string) {
  return validateRestoredTranslation(entry, restoreProtectedTranslation(entry, english));
}
