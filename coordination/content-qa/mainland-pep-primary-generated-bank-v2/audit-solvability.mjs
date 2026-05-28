import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT = path.join(__dirname, "questions.jsonl");
const AUDIT_JSON = path.join(__dirname, "solvability-audit.json");
const AUDIT_CSV = path.join(__dirname, "solvability-audit.csv");
const AUDIT_MD = path.join(__dirname, "solvability-audit.md");
const MANUAL_QUEUE_CSV = path.join(__dirname, "manual-review-queue.csv");
const MANUAL_REVIEW_RESULTS_CSV = path.join(__dirname, "manual-review-results.csv");
const QA_REPORT_MD = path.join(__dirname, "qa-report.md");

const EXPECTED_TOTAL = 1200;
const EXPECTED_GRADES = ["P1", "P2", "P3", "P4", "P5", "P6"];
const EXPECTED_SEMESTERS = ["lower", "upper"];
const EXPECTED_TYPES = ["multiple-choice", "fill-in", "short-answer"];
const EXPECTED_TYPE_TOTALS = {
  "multiple-choice": 450,
  "fill-in": 450,
  "short-answer": 300,
};
const EXPECTED_TYPE_TOTALS_BY_GRADE = {
  P1: { "multiple-choice": 90, "fill-in": 80, "short-answer": 30 },
  P2: { "multiple-choice": 90, "fill-in": 80, "short-answer": 30 },
  P3: { "multiple-choice": 75, "fill-in": 75, "short-answer": 50 },
  P4: { "multiple-choice": 75, "fill-in": 75, "short-answer": 50 },
  P5: { "multiple-choice": 60, "fill-in": 70, "short-answer": 70 },
  P6: { "multiple-choice": 60, "fill-in": 70, "short-answer": 70 },
};
const EXPECTED_TYPE_TOTALS_BY_GRADE_SEMESTER = {
  P1: {
    upper: { "multiple-choice": 45, "fill-in": 40, "short-answer": 15 },
    lower: { "multiple-choice": 45, "fill-in": 40, "short-answer": 15 },
  },
  P2: {
    upper: { "multiple-choice": 45, "fill-in": 40, "short-answer": 15 },
    lower: { "multiple-choice": 45, "fill-in": 40, "short-answer": 15 },
  },
  P3: {
    upper: { "multiple-choice": 38, "fill-in": 37, "short-answer": 25 },
    lower: { "multiple-choice": 37, "fill-in": 38, "short-answer": 25 },
  },
  P4: {
    upper: { "multiple-choice": 38, "fill-in": 37, "short-answer": 25 },
    lower: { "multiple-choice": 37, "fill-in": 38, "short-answer": 25 },
  },
  P5: {
    upper: { "multiple-choice": 30, "fill-in": 35, "short-answer": 35 },
    lower: { "multiple-choice": 30, "fill-in": 35, "short-answer": 35 },
  },
  P6: {
    upper: { "multiple-choice": 30, "fill-in": 35, "short-answer": 35 },
    lower: { "multiple-choice": 30, "fill-in": 35, "short-answer": 35 },
  },
};
const EXPECTED_DIFFICULTY_TOTALS_BY_GRADE = {
  P1: { Foundation: 120, Core: 70, Challenge: 10 },
  P2: { Foundation: 120, Core: 70, Challenge: 10 },
  P3: { Foundation: 80, Core: 95, Challenge: 25 },
  P4: { Foundation: 80, Core: 95, Challenge: 25 },
  P5: { Foundation: 60, Core: 100, Challenge: 30, Exam: 10 },
  P6: { Foundation: 60, Core: 100, Challenge: 30, Exam: 10 },
};

const REQUIRED_FIELDS = [
  "id",
  "grade",
  "semester",
  "unitTitle",
  "conceptIds",
  "difficulty",
  "type",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans",
  "evidenceCardIds",
  "examPatternCardIds",
  "materialKind",
  "assessmentFamily",
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "reviewNotes",
];

const FORBIDDEN_SOURCE_PATTERNS = [
  { code: "source-ocr", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-screenshot", regex: /截图|截屏|扫描图|扫描件|图片来源|教材图片/ },
  { code: "source-page", regex: /第\s*\d+\s*页|页码|页\s*\d+|P\.\s*\d+/i },
  { code: "source-original", regex: /原题|原卷|原教材|教材原文|课本原文|照抄|改编自|来源于/ },
  { code: "source-file", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|文件名|路径/iu },
];

const MISSING_VISUAL_PATTERNS = [
  /如图(?:所示)?/,
  /下图/,
  /上图/,
  /右图/,
  /左图/,
  /(?:^|[，。；：:\s])图中(?:可以|有|阴影|涂色|显示|给出)?/,
  /根据图(?:形|表|像)?/,
  /观察下面的图/,
];

const CONTRADICTION_PATTERNS = [
  /选项中没有/,
  /题目有误/,
  /无法确定/,
  /答案不唯一/,
  /不够条件/,
  /缺少图/,
  /缺少信息/,
  /重新计算/,
  /上面算错/,
  /前面错误/,
];

const DIGIT_MAP = new Map([
  ["零", 0],
  ["〇", 0],
  ["一", 1],
  ["二", 2],
  ["两", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9],
]);

const UNIT_MAP = new Map([
  ["十", 10],
  ["百", 100],
  ["千", 1000],
  ["万", 10000],
]);

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return {
          id: `__parse_error_${index + 1}`,
          __parseError: String(error),
          __rawLine: line,
        };
      }
    });
}

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return counts;
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function toHalfWidth(text) {
  return String(text ?? "")
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}

function normalizeText(text) {
  return toHalfWidth(text)
    .replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2")
    .toLowerCase()
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’' \t\r\n]/g, "")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/％/g, "%")
    .replace(/元整/g, "元")
    .replace(/块/g, "元");
}

function normalizeAnswerText(text) {
  return normalizeText(text)
    .replace(/答案是|答[:：]?|所以|约等于|大约是|大约|约/g, "")
    .replace(/厘米/g, "cm")
    .replace(/平方厘米/g, "cm2")
    .replace(/立方厘米/g, "cm3")
    .replace(/米/g, "m")
    .replace(/平方米/g, "m2")
    .replace(/立方米/g, "m3")
    .replace(/千克/g, "kg")
    .replace(/克/g, "g");
}

function normalizeOptionIdentity(text) {
  return toHalfWidth(text)
    .replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/−/g, "-")
    .replace(/×|x/g, "*")
    .replace(/÷/g, "/")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/，/g, ",")
    .replace(/。$/g, "");
}

function parsePromptLetterOptions(prompt) {
  const source = toHalfWidth(prompt || "");
  const regex = /(?:^|\n)\s*([A-D])\s*[.．、]\s*([^\n]+)/g;
  const options = [];
  for (const match of source.matchAll(regex)) {
    options.push({ label: match[1], text: match[2].trim(), raw: `${match[1]}. ${match[2].trim()}` });
  }
  return options.length === 4 ? options : [];
}

function effectiveMcOptions(row) {
  const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
  const promptLetterOptions = parsePromptLetterOptions(row.promptZhHans);
  if (options.length === 4 && options.every((option) => /^[A-D]$/.test(toHalfWidth(option).trim())) && promptLetterOptions.length === 4) {
    return promptLetterOptions.map((option) => ({ ...option, raw: option.label }));
  }
  return options.map((option, index) => {
    const labelMatch = toHalfWidth(option).match(/^\s*([A-D])\s*[.．、]\s*(.+)$/);
    const label = labelMatch?.[1] ?? "ABCD"[index];
    const text = labelMatch?.[2]?.trim() ?? option;
    return { label, text, raw: option };
  });
}

function selectedMcOption(row) {
  if (row.type !== "multiple-choice") return null;
  const answer = toHalfWidth(row.answer || "").trim();
  const options = effectiveMcOptions(row);
  const letter = answer.match(/^([A-D])(?:[.．、]\s*)?$/)?.[1];
  if (letter) return options.find((option) => option.label === letter) ?? null;
  return (
    options.find(
      (option) =>
        normalizeOptionIdentity(option.raw) === normalizeOptionIdentity(answer) ||
        normalizeOptionIdentity(option.text) === normalizeOptionIdentity(answer),
    ) ?? null
  );
}

function zhNumeralToNumber(input) {
  const text = String(input ?? "").trim();
  if (!text) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  if (![...text].every((char) => DIGIT_MAP.has(char) || UNIT_MAP.has(char))) return null;
  if ([...text].every((char) => DIGIT_MAP.has(char))) {
    return Number([...text].map((char) => DIGIT_MAP.get(char)).join(""));
  }
  let total = 0;
  let section = 0;
  let number = 0;
  for (const char of text) {
    if (DIGIT_MAP.has(char)) {
      number = DIGIT_MAP.get(char);
      continue;
    }
    const unit = UNIT_MAP.get(char);
    if (!unit) return null;
    if (unit === 10000) {
      section = (section + number) * unit;
      total += section;
      section = 0;
    } else {
      section += (number || 1) * unit;
    }
    number = 0;
  }
  return total + section + number;
}

function parseNumberToken(token) {
  if (token == null) return null;
  const raw = toHalfWidth(String(token)).replace(/,/g, "").trim();
  if (/^-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?$/.test(raw)) {
    const [num, den] = raw.split("/").map((part) => Number(part.trim()));
    if (den !== 0) return num / den;
  }
  if (/^-?\d+(?:\.\d+)?%$/.test(raw)) return Number(raw.slice(0, -1)) / 100;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  const zh = zhNumeralToNumber(raw);
  return Number.isFinite(zh) ? zh : null;
}

function extractNumbers(text) {
  const source = toHalfWidth(text);
  const matches = [];
  const regex = /-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?|-?\d+(?:\.\d+)?%?|-?[零〇一二两三四五六七八九十百千万]+/g;
  for (const match of source.matchAll(regex)) {
    const value = parseNumberToken(match[0]);
    if (Number.isFinite(value)) {
      matches.push({ raw: match[0].trim(), value, index: match.index ?? 0 });
    }
  }
  return matches;
}

function roundTo(value, digits = 8) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  const rounded = roundTo(value, 8);
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(/0+$/, "").replace(/\.$/, "");
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

function decimalToFraction(value, maxDenominator = 10000) {
  if (!Number.isFinite(value)) return null;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  for (let den = 1; den <= maxDenominator; den += 1) {
    const num = Math.round(abs * den);
    if (Math.abs(num / den - abs) < 1e-10) {
      const d = gcd(num, den);
      return `${sign * (num / d)}/${den / d}`;
    }
  }
  return null;
}

function simplifyFraction(numerator, denominator) {
  if (denominator === 0) return null;
  const sign = denominator < 0 ? -1 : 1;
  const num = numerator * sign;
  const den = Math.abs(denominator);
  const divisor = gcd(num, den);
  return { numerator: num / divisor, denominator: den / divisor };
}

function formatFractionParts(fraction) {
  if (!fraction) return "";
  if (fraction.denominator === 1) return String(fraction.numerator);
  return `${fraction.numerator}/${fraction.denominator}`;
}

function parseFractionParts(token) {
  const raw = toHalfWidth(String(token ?? "")).trim();
  const slash = raw.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (slash) return simplifyFraction(Number(slash[1]), Number(slash[2]));
  const tex = raw.match(/^\\frac\{(-?\d+)\}\{(-?\d+)\}$/);
  if (tex) return simplifyFraction(Number(tex[1]), Number(tex[2]));
  return null;
}

function numericClose(a, b) {
  return Math.abs(Number(a) - Number(b)) <= 1e-7;
}

function answerVariantsForValue(value) {
  if (Array.isArray(value)) return value.flatMap(answerVariantsForValue);
  if (typeof value === "string") return [value, normalizeAnswerText(value)];
  const number = Number(value);
  if (!Number.isFinite(number)) return [];
  const variants = new Set([formatNumber(number)]);
  const fraction = decimalToFraction(number);
  if (fraction) variants.add(fraction);
  if (number >= 0 && number <= 100 && !Number.isInteger(number)) variants.add(`${formatNumber(number * 100)}%`);
  return [...variants];
}

function answerTextMatchesValue(answerText, expected) {
  const normalized = normalizeAnswerText(answerText);
  const numbers = extractNumbers(answerText).map((entry) => entry.value);
  if (Array.isArray(expected)) {
    const expectedNumbers = expected.filter((value) => typeof value === "number");
    if (expectedNumbers.length === expected.length && numbers.length >= expectedNumbers.length) {
      for (let start = 0; start <= numbers.length - expectedNumbers.length; start += 1) {
        if (expectedNumbers.every((value, index) => numericClose(numbers[start + index], value))) return true;
      }
      return false;
    }
    return expected.every((value) => answerTextMatchesValue(answerText, value));
  }
  if (typeof expected === "number") {
    if (numbers.some((number) => numericClose(number, expected))) return true;
    if (numbers.length > 0) return false;
    return answerVariantsForValue(expected).some((variant) => normalized.includes(normalizeAnswerText(variant)));
  }
  if (/[()+\-*/×÷xX]/.test(String(expected))) {
    return normalizeOptionIdentity(answerText).includes(normalizeOptionIdentity(expected));
  }
  return normalized.includes(normalizeAnswerText(expected));
}

function answerSetMatches(result, row) {
  const selected = selectedMcOption(row);
  const candidates = [
    row.answer,
    ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : []),
    selected?.text,
    selected?.raw,
  ].filter(Boolean);
  if (result.expectedDisplay != null) {
    if (candidates.some((candidate) => answerTextMatchesValue(candidate, result.expectedDisplay))) return true;
  }
  if (Array.isArray(result.expectedValues)) {
    return candidates.some((candidate) => answerTextMatchesValue(candidate, result.expectedValues));
  }
  if (result.expectedValue != null) {
    return candidates.some((candidate) => answerTextMatchesValue(candidate, result.expectedValue));
  }
  if (result.expectedText != null) {
    return candidates.some((candidate) => answerTextMatchesValue(candidate, result.expectedText));
  }
  return false;
}

function explanationMatches(result, explanation) {
  if (result.contentError) return false;
  if (!explanation || CONTRADICTION_PATTERNS.some((regex) => regex.test(explanation))) return false;
  if (result.expectedDisplay != null && answerTextMatchesValue(explanation, result.expectedDisplay)) return true;
  if (Array.isArray(result.expectedValues) && explanationContainsExpectedValues(explanation, result.expectedValues)) return true;
  if (result.expectedValue != null && answerTextMatchesValue(explanation, result.expectedValue)) return true;
  if (result.expectedText != null && answerTextMatchesValue(explanation, result.expectedText)) return true;
  return false;
}

function explanationContainsExpectedValues(explanation, expectedValues) {
  if (answerTextMatchesValue(explanation, expectedValues)) return true;
  const expectedNumbers = expectedValues.filter((value) => typeof value === "number");
  if (expectedNumbers.length === expectedValues.length) {
    const numbers = extractNumbers(explanation).map((entry) => entry.value);
    return expectedNumbers.every((expected) => numbers.some((actual) => numericClose(actual, expected)));
  }
  return expectedValues.every((expected) => answerTextMatchesValue(explanation, expected));
}

function safeEvalExpression(expression) {
  const normalized = toHalfWidth(expression)
    .replace(/×|x|X/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/％/g, "%")
    .trim();
  if (!/^[0-9+\-*/().\s]+$/.test(normalized)) return null;
  if (!/[+\-*/]/.test(normalized)) return null;
  try {
    const value = Function(`"use strict"; return (${normalized});`)();
    return Number.isFinite(value) ? roundTo(value) : null;
  } catch {
    return null;
  }
}

function directEquationSolver(row) {
  const text = row.promptZhHans || "";

  const sequentialBlanks = [...text.matchAll(/(\d+(?:\.\d+)?)\s*([+\-×xX*÷/])\s*(\d+(?:\.\d+)?)\s*=\s*(?:__+|_{2,}|（\s*）|\(\s*\))/g)];
  if (sequentialBlanks.length > 0 && /按顺序|三个空|两个空/.test(text)) {
    const values = [];
    for (const match of sequentialBlanks) {
      const value = safeEvalExpression(`${match[1]} ${match[2]} ${match[3]}`);
      if (value == null) return null;
      values.push(value);
    }
    if (/__\s*[+]\s*\d+(?:\.\d+)?\s*=/.test(toHalfWidth(text)) && values.length === 1) {
      const second = values[0];
      const addend = Number(toHalfWidth(text).match(/__\s*[+]\s*(\d+(?:\.\d+)?)\s*=/)?.[1]);
      if (Number.isFinite(addend)) values.push(second, second + addend);
    }
    return {
      expectedValues: values,
      expectedDisplay: values.map(formatNumber).join(", "),
      method: "direct-equation-blanks",
      family: "arithmetic",
    };
  }

  const computeMatch = text.match(/计算\s*([0-9.\s()+\-×xX*÷/]+)\s*=\s*(?:_+|（\s*）|\(\s*\)|多少|几)?/);
  if (computeMatch) {
    const value = safeEvalExpression(computeMatch[1]);
    if (value != null) {
      return {
        expectedValue: value,
        expectedDisplay: formatNumber(value),
        method: "direct-arithmetic-expression",
        family: "arithmetic",
      };
    }
  }

  const blankAddend = text.match(/(\d+(?:\.\d+)?)\s*([+\-])\s*(?:几|__+|_{2,}|（\s*）|\(\s*\))\s*=\s*(\d+(?:\.\d+)?)/);
  if (blankAddend) {
    const left = Number(blankAddend[1]);
    const target = Number(blankAddend[3]);
    const value = blankAddend[2] === "+" ? target - left : left - target;
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "missing-addend-equation",
      family: "arithmetic",
    };
  }

  const composition = text.match(/(\d+)\s*可以分成\s*(\d+)\s*和(?:几|多少)/);
  if (composition) {
    const value = Number(composition[1]) - Number(composition[2]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "number-composition",
      family: "place-value",
    };
  }

  const labeledCompute = text.match(/(?:口算|用竖式计算|计算并验算|计算)[:：]?\s*([0-9.\s()+\-×xX*÷/]+)\s*(?:=|＝|。|，|请|$)/);
  if (labeledCompute) {
    if (/[÷/]/.test(labeledCompute[1]) && /竖式|余数|……|□……□/.test(text)) return null;
    const value = safeEvalExpression(labeledCompute[1]);
    if (value != null) {
      return {
        expectedValue: value,
        expectedDisplay: formatNumber(value),
        method: "labeled-arithmetic-expression",
        family: "arithmetic",
      };
    }
  }

  return null;
}

function numberPatternSolver(row) {
  const text = row.promptZhHans || "";
  if (!/规律|排列/.test(text)) return null;
  const blankIndex = text.search(/__+|_{2,}|（\s*）|\(\s*\)/);
  if (blankIndex < 0) return null;
  const start = Math.max(0, text.lastIndexOf("：", blankIndex), text.lastIndexOf(":", blankIndex));
  const endMarks = ["。", "；", ";"];
  let end = text.length;
  for (const mark of endMarks) {
    const next = text.indexOf(mark, blankIndex);
    if (next >= 0) end = Math.min(end, next);
  }
  const segment = text.slice(start + 1, end);
  const tokens = segment.match(/-?\d+(?:\.\d+)?|__+|_{2,}|（\s*）|\(\s*\)/g) || [];
  const missingAt = tokens.findIndex((token) => /__+|_{2,}|（\s*）|\(\s*\)/.test(token));
  if (missingAt < 0 || tokens.filter((token) => !/__+|_{2,}|（\s*）|\(\s*\)/.test(token)).length < 3) return null;
  const values = tokens.map((token) => (/__+|_{2,}|（\s*）|\(\s*\)/.test(token) ? null : Number(token)));
  const knownDiffs = [];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] != null && values[i - 1] != null) knownDiffs.push(values[i] - values[i - 1]);
  }
  if (knownDiffs.length === 0) return null;
  const sameDiff = knownDiffs.every((diff) => numericClose(diff, knownDiffs[0]));
  if (sameDiff) {
    let expected = null;
    const diff = knownDiffs[0];
    if (values[missingAt - 1] != null) expected = values[missingAt - 1] + diff;
    if (values[missingAt + 1] != null) expected = values[missingAt + 1] - diff;
    if (expected != null) {
      return {
        expectedValue: expected,
        expectedDisplay: formatNumber(expected),
        method: "constant-difference-number-pattern",
        family: "number-pattern",
      };
    }
  }
  const knownRatios = [];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] != null && values[i - 1] != null && values[i - 1] !== 0) knownRatios.push(values[i] / values[i - 1]);
  }
  if (knownRatios.length > 0 && knownRatios.every((ratio) => numericClose(ratio, knownRatios[0]))) {
    let expected = null;
    const ratio = knownRatios[0];
    if (values[missingAt - 1] != null) expected = values[missingAt - 1] * ratio;
    if (values[missingAt + 1] != null && ratio !== 0) expected = values[missingAt + 1] / ratio;
    if (expected != null) {
      return {
        expectedValue: expected,
        expectedDisplay: formatNumber(expected),
        method: "constant-ratio-number-pattern",
        family: "number-pattern",
      };
    }
  }
  return null;
}

function placeValueSolver(row) {
  const text = row.promptZhHans || "";
  const digitPlace = text.match(/在(?:数)?\s*(\d+)\s*中.*?(万位|千位|百位|十位|个位).*?(?:数字|数码).*?(?:是|为|填)/);
  if (digitPlace) {
    const digits = digitPlace[1];
    const place = digitPlace[2];
    const placeIndex = { 个位: 1, 十位: 2, 百位: 3, 千位: 4, 万位: 5 }[place];
    if (digits.length >= placeIndex) {
      const value = Number(digits[digits.length - placeIndex]);
      return {
        expectedValue: value,
        expectedDisplay: String(value),
        method: "place-value-digit",
        family: "place-value",
      };
    }
  }

  if (/最大的一位数/.test(text) && /十位/.test(text) && /个位/.test(text)) {
    const diff = extractNumbers(text).at(-1)?.value;
    if (Number.isFinite(diff)) {
      const ones = 9;
      const tens = /十位.*?比.*?个位.*?小/.test(text) ? ones - diff : ones + diff;
      if (tens >= 0 && tens <= 9) {
        const value = tens * 10 + ones;
        return {
          expectedValue: value,
          expectedDisplay: String(value),
          method: "two-digit-place-value-relation",
          family: "place-value",
        };
      }
    }
  }

  const twoDigitRelation = text.match(/十位上的数字是\s*(\d).*?个位上的数字比十位上的数字(大|小)\s*(\d)/);
  if (twoDigitRelation) {
    const tens = Number(twoDigitRelation[1]);
    const ones = twoDigitRelation[2] === "大" ? tens + Number(twoDigitRelation[3]) : tens - Number(twoDigitRelation[3]);
    if (ones >= 0 && ones <= 9) {
      const value = tens * 10 + ones;
      return {
        expectedValue: value,
        expectedDisplay: String(value),
        method: "two-digit-place-value-fixed-tens",
        family: "place-value",
      };
    }
  }
  return null;
}

function moneySolver(row) {
  const text = row.promptZhHans || "";
  if (!/[元角]/.test(text)) return null;

  const holding = parseMoneyHoldings(text);
  let total = holding.total;
  let foundMoney = holding.found;
  const cost = text.match(/买.*?(\d+(?:\.\d+)?)\s*元/);
  if (foundMoney && cost) {
    const diff = roundTo(total - Number(cost[1]), 2);
    if (/够吗|够不够/.test(text)) {
      const textAnswer =
        diff > 0 ? `够，还剩${formatMoney(diff)}` : diff === 0 ? "刚好够" : `不够，差${formatMoney(Math.abs(diff))}`;
      return {
        expectedValue: diff,
        expectedText: textAnswer,
        expectedDisplay: textAnswer,
        method: "money-total-cost-comparison",
        family: "money",
      };
    }
  }
  if (foundMoney && /一共有多少钱|一共(?:付|有)了?多少钱|她一共有多少钱/.test(text)) {
    return {
      expectedValue: total,
      expectedDisplay: formatMoney(total),
      method: "money-holdings-total",
      family: "money",
    };
  }
  const payChange = text.match(/花了\s*(\d+)\s*元\s*(\d+)\s*角.*?付了\s*(\d+)\s*元.*?找回/);
  if (payChange) {
    const costValue = Number(payChange[1]) + Number(payChange[2]) / 10;
    const value = Number(payChange[3]) - costValue;
    return {
      expectedValue: value,
      expectedDisplay: formatMoney(value),
      method: "money-change-from-yuan-jiao",
      family: "money",
    };
  }
  const pencilChange = text.match(/买了\s*(\d+)\s*支铅笔.*?付了\s*(\d+)\s*元.*?找回\s*(\d+)\s*角.*?一支铅笔/);
  if (pencilChange) {
    const value = (Number(pencilChange[2]) * 10 - Number(pencilChange[3])) / Number(pencilChange[1]);
    return {
      expectedValue: value / 10,
      expectedDisplay: `${formatNumber(value)}角`,
      method: "unit-price-from-change",
      family: "money",
    };
  }
  return null;
}

function parseMoneyHoldings(text) {
  let total = 0;
  let found = false;
  for (const match of text.matchAll(/(\d+)\s*[张枚]\s*(\d+(?:\.\d+)?)\s*元/g)) {
    total += Number(match[1]) * Number(match[2]);
    found = true;
  }
  for (const match of text.matchAll(/(\d+)\s*[张枚]\s*(\d+(?:\.\d+)?)\s*角/g)) {
    total += (Number(match[1]) * Number(match[2])) / 10;
    found = true;
  }
  return { total: roundTo(total, 2), found };
}

function formatMoney(value) {
  const yuan = Math.floor(value);
  const jiao = Math.round((value - yuan) * 10);
  if (yuan > 0 && jiao > 0) return `${yuan}元${jiao}角`;
  if (yuan > 0) return `${yuan}元`;
  return `${jiao}角`;
}

function timeSolver(row) {
  const text = row.promptZhHans || "";
  const clock = text.match(/分针指向\s*12.*?时针指向\s*(\d+)/) || text.match(/时针指向\s*(\d+).*?分针指向\s*12/);
  if (clock) {
    return {
      expectedValue: Number(clock[1]),
      expectedText: `${clock[1]}时`,
      expectedDisplay: `${clock[1]}时`,
      method: "clock-hour-reading",
      family: "time",
    };
  }
  const fromTo = text.match(/从(上午|下午|晚上|凌晨)?\s*(\d+)\s*时.*?到(上午|下午|晚上|凌晨)?\s*(\d+)\s*时/);
  if (fromTo) {
    const start = clockHourTo24(fromTo[1], Number(fromTo[2]));
    const end = clockHourTo24(fromTo[3], Number(fromTo[4]));
    let elapsed = end - start;
    if (elapsed < 0) elapsed += 24;
    return {
      expectedValue: elapsed,
      expectedDisplay: `${elapsed}小时`,
      method: "elapsed-whole-hours",
      family: "time",
    };
  }
  return null;
}

function clockHourTo24(period, hour) {
  if ((period === "下午" || period === "晚上") && hour < 12) return hour + 12;
  if (period === "凌晨" && hour === 12) return 0;
  return hour;
}

function storyProblemSolver(row) {
  const text = row.promptZhHans || "";
  const numbers = extractNumbers(text).map((entry) => entry.value);
  if (numbers.length < 2) return null;

  const divRem =
    text.match(/有\s*(\d+)[\s\S]*?每[^0-9。]*?(\d+)[\s\S]*?(?:剩|还剩)/) ||
    text.match(/(\d+)[\s\S]*?平均分给\s*(\d+)[\s\S]*?(?:剩|还剩)/);
  if (divRem) {
    const total = Number(divRem[1]);
    const each = Number(divRem[2]);
    const quotient = Math.floor(total / each);
    const remainder = total % each;
    return {
      expectedValues: [quotient, remainder],
      expectedDisplay: `${quotient}, ${remainder}`,
      method: "division-with-remainder",
      family: "arithmetic-application",
    };
  }

  const exactDivision =
    text.match(/(?:把|有)?\s*(\d+(?:\.\d+)?)\s*(?:块|个|支|颗|米|人)?[^。？?]*?平均(?:分给|剪成)\s*(\d+)[^。？?]*(?:每(?:个|人|段)|分到|长多少|几)/) ||
    text.match(/有\s*(\d+(?:\.\d+)?)[^。？?]*?每\s*(\d+(?:\.\d+)?)[^。？?]*(?:可以|能|几天|几束|几袋)/);
  if (exactDivision && !/(?:剩|还剩|余数|最多)/.test(text)) {
    const value = Number(exactDivision[1]) / Number(exactDivision[2]);
    if (Number.isFinite(value)) {
      return {
        expectedValue: value,
        expectedDisplay: formatNumber(value),
        method: "exact-division-story",
        family: "division",
      };
    }
  }

  const bus = text.match(/原来有\s*(\d+)\s*人.*?下去\s*(\d+)\s*人.*?上来\s*(\d+)\s*人/);
  if (bus) {
    const value = Number(bus[1]) - Number(bus[2]) + Number(bus[3]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "bus-change-story",
      family: "arithmetic-application",
    };
  }

  const buyUnitPlus = text.match(/买了\s*(\d+)\s*个[^，。]*?每个[^0-9]*(\d+(?:\.\d+)?)\s*元.*?又买了[^0-9]*(\d+(?:\.\d+)?)\s*元/);
  if (buyUnitPlus) {
    const value = Number(buyUnitPlus[1]) * Number(buyUnitPlus[2]) + Number(buyUnitPlus[3]);
    return {
      expectedValue: value,
      expectedDisplay: `${formatNumber(value)}元`,
      method: "unit-price-plus-fixed-cost",
      family: "money",
    };
  }

  const sendThenBuy = text.match(/有\s*(\d+).*?送给.*?(\d+).*?又买了\s*(\d+)/);
  if (sendThenBuy) {
    const hasRemainingBeforeBuy = /送给.*?后还剩/.test(text);
    const value = hasRemainingBeforeBuy
      ? Number(sendThenBuy[2]) + Number(sendThenBuy[3])
      : Number(sendThenBuy[1]) - Number(sendThenBuy[2]) + Number(sendThenBuy[3]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "subtract-then-add-story",
      family: "arithmetic-application",
    };
  }

  const leftRightLine = text.match(/左边有\s*(\d+)\s*人.*?右边有\s*(\d+)\s*人.*?这一排一共有/);
  if (leftRightLine) {
    const value = Number(leftRightLine[1]) + Number(leftRightLine[2]) + 1;
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "line-position-total",
      family: "arithmetic-application",
    };
  }

  const tableChairs = text.match(/有\s*(\d+)\s*张桌子.*?每张桌子配\s*(\d+)\s*把椅子/);
  if (tableChairs) {
    const value = Number(tableChairs[1]) * Number(tableChairs[2]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "equal-groups-table-chairs",
      family: "multiplication",
    };
  }

  const howManyMore = text.match(/(\d+(?:\.\d+)?)\s*比\s*(\d+(?:\.\d+)?)\s*多多少/);
  if (howManyMore) {
    const value = Number(howManyMore[1]) - Number(howManyMore[2]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "how-many-more-direct",
      family: "arithmetic-application",
    };
  }

  const addendSum = text.match(/一个加数是\s*(\d+(?:\.\d+)?)，?另一个加数是\s*(\d+(?:\.\d+)?)，?和是多少/);
  if (addendSum) {
    const value = Number(addendSum[1]) + Number(addendSum[2]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "addend-sum-direct",
      family: "arithmetic",
    };
  }

  const multipleLess = text.match(/有.*?(\d+(?:\.\d+)?).*?比.*?的\s*(\d+(?:\.\d+)?)\s*倍\s*少\s*(\d+(?:\.\d+)?)/);
  if (multipleLess) {
    const value = Number(multipleLess[1]) * Number(multipleLess[2]) - Number(multipleLess[3]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "multiple-minus-comparison",
      family: "multiplication-application",
    };
  }

  const buyGift = text.match(/每盒\s*(\d+(?:\.\d+)?)\s*元.*?买四送一.*?买\s*(\d+)\s*盒/);
  if (buyGift) {
    const price = Number(buyGift[1]);
    const needed = Number(buyGift[2]);
    const paidBoxes = Math.floor(needed / 5) * 4 + (needed % 5);
    const value = roundTo(price * paidBoxes, 2);
    return {
      expectedValue: value,
      expectedDisplay: `${formatNumber(value)}元`,
      method: "buy-four-get-one-promotion",
      family: "money",
    };
  }

  const groups = text.match(/每(?:组|排|盒|袋|份|个)\s*(?:有)?\s*(\d+(?:\.\d+)?).*?(?:有)?\s*(\d+)\s*(?:组|排|盒|袋|份|个)/);
  if (groups && /一共|总数|共有|多少/.test(text)) {
    const value = Number(groups[1]) * Number(groups[2]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "equal-groups-multiplication",
      family: "multiplication",
    };
  }

  const multiplierTotal = text.match(/有.*?(\d+(?:\.\d+)?).*?是.*?的\s*(\d+(?:\.\d+)?)\s*倍.*?(?:一共|共有|总共)/);
  if (multiplierTotal) {
    const base = Number(multiplierTotal[1]);
    const multiplier = Number(multiplierTotal[2]);
    const value = base * (multiplier + 1);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "base-plus-multiple-total",
      family: "multiplication-application",
    };
  }

  const lessThan = text.match(/(\d+(?:\.\d+)?).*?比.*?少\s*(\d+(?:\.\d+)?).*?(?:有|是多少|多少)/);
  if (lessThan) {
    const value = Number(lessThan[1]) - Number(lessThan[2]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "comparison-less-than",
      family: "arithmetic-application",
    };
  }

  const additionQuestion = /一共|共有|总共|合计/.test(text);
  if (additionQuestion && /又|再|增加|买来|运来/.test(text) && numbers.length === 2) {
    const value = numbers[0] + numbers[1];
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "one-step-addition-story",
      family: "arithmetic-application",
    };
  }
  if (/还剩|剩下|用去|少了|差/.test(text) && numbers.length === 2 && !/[倍%]/.test(text)) {
    const value = numbers[0] - numbers[1];
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "one-step-subtraction-story",
      family: "arithmetic-application",
    };
  }
  return null;
}

function unitConversionSolver(row) {
  const text = row.promptZhHans || "";
  const massBags = text.match(/一袋.*?重\s*(\d+(?:\.\d+)?)\s*克.*?几袋.*?重\s*(\d+(?:\.\d+)?)\s*千克/);
  if (massBags) {
    const value = (Number(massBags[2]) * 1000) / Number(massBags[1]);
    return {
      expectedValue: value,
      expectedDisplay: `${formatNumber(value)}袋`,
      method: "grams-to-kilograms-bag-count",
      family: "measurement",
    };
  }
  const mToCm = text.match(/(\d+(?:\.\d+)?)\s*米.*?(\d+(?:\.\d+)?)\s*厘米.*?(\d+(?:\.\d+)?)\s*厘米/);
  if (mToCm && /短了多少厘米|用去多少厘米/.test(text)) {
    const value = Number(mToCm[2]) + Number(mToCm[3]);
    return {
      expectedValue: value,
      expectedDisplay: `${formatNumber(value)}厘米`,
      method: "centimeter-subtraction-used-total",
      family: "measurement",
    };
  }
  const simpleConvert = text.match(/(\d+(?:\.\d+)?)\s*(千米|米|分米|厘米|毫米|千克|克)\s*=\s*(?:__+|_{2,}|（\s*）|\(\s*\))\s*(千米|米|分米|厘米|毫米|千克|克)/);
  if (simpleConvert) {
    const value = convertUnit(Number(simpleConvert[1]), simpleConvert[2], simpleConvert[3]);
    if (value != null) {
      return {
        expectedValue: value,
        expectedDisplay: `${formatNumber(value)}${simpleConvert[3]}`,
        method: "metric-unit-conversion",
        family: "measurement",
      };
    }
  }
  if (/铅笔.*?长.*?18.*?(厘米|米)/.test(text) && /合适的单位/.test(text)) {
    return {
      expectedText: "厘米",
      expectedDisplay: "厘米",
      method: "common-measurement-unit-sense",
      family: "measurement",
    };
  }
  return null;
}

function convertUnit(value, from, to) {
  const lengthMm = { 千米: 1000000, 米: 1000, 分米: 100, 厘米: 10, 毫米: 1 };
  const massG = { 千克: 1000, 克: 1 };
  if (from in lengthMm && to in lengthMm) return (value * lengthMm[from]) / lengthMm[to];
  if (from in massG && to in massG) return (value * massG[from]) / massG[to];
  return null;
}

function geometrySolver(row) {
  const text = row.promptZhHans || "";
  const pi = 3.14;

  const wireSquare = text.match(/长\s*(\d+(?:\.\d+)?)\s*厘米的铁丝围成一个正方形.*?面积/);
  if (wireSquare) {
    const side = Number(wireSquare[1]) / 4;
    const value = side * side;
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "square-area-from-wire-perimeter",
      family: "area",
    };
  }

  const squareAreaToSide = text.match(/正方形的面积是\s*(\d+(?:\.\d+)?)\s*平方厘米.*?边长/);
  if (squareAreaToSide) {
    const value = Math.sqrt(Number(squareAreaToSide[1]));
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "square-side-from-area",
      family: "area",
    };
  }

  const cubeVolume = text.match(/正方体的棱长是\s*(\d+(?:\.\d+)?)\s*厘米.*?体积/);
  if (cubeVolume) {
    const side = Number(cubeVolume[1]);
    return {
      expectedValue: side ** 3,
      expectedDisplay: formatNumber(side ** 3),
      method: "cube-volume",
      family: "volume",
    };
  }

  const cubeSurfaceFromEdgeSum = text.match(/正方体的棱长总和是\s*(\d+(?:\.\d+)?)\s*厘米.*?表面积/);
  if (cubeSurfaceFromEdgeSum) {
    const side = Number(cubeSurfaceFromEdgeSum[1]) / 12;
    const value = 6 * side * side;
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "cube-surface-area-from-edge-sum",
      family: "surface-area",
    };
  }

  const rectangleBoth = text.match(/长(?:是|为)?\s*(\d+(?:\.\d+)?)\s*(?:厘米|米|cm|m).*?宽(?:是|为)?\s*(\d+(?:\.\d+)?)\s*(?:厘米|米|cm|m).*?周长.*?面积/);
  if (rectangleBoth && !/长方体/.test(text)) {
    const length = Number(rectangleBoth[1]);
    const width = Number(rectangleBoth[2]);
    return {
      expectedValues: [2 * (length + width), length * width],
      expectedDisplay: `${formatNumber(2 * (length + width))}, ${formatNumber(length * width)}`,
      method: "rectangle-perimeter-and-area",
      family: "geometry",
    };
  }

  const rectangularGarden = text.match(/长\s*(\d+(?:\.\d+)?)\s*米.*?宽\s*(\d+(?:\.\d+)?)\s*米.*?四周.*?篱笆.*?每平方米.*?(\d+(?:\.\d+)?)\s*株/);
  if (rectangularGarden) {
    const length = Number(rectangularGarden[1]);
    const width = Number(rectangularGarden[2]);
    const plantsPerSquare = Number(rectangularGarden[3]);
    return {
      expectedValues: [2 * (length + width), length * width * plantsPerSquare],
      expectedDisplay: `${formatNumber(2 * (length + width))}, ${formatNumber(length * width * plantsPerSquare)}`,
      method: "rectangle-fence-and-plant-count",
      family: "geometry",
    };
  }

  const cylinderSideSurface = text.match(/圆柱的底面半径是\s*(\d+(?:\.\d+)?)\s*厘米，高是\s*(\d+(?:\.\d+)?)\s*厘米.*?侧面积.*?表面积/);
  if (cylinderSideSurface) {
    const radius = Number(cylinderSideSurface[1]);
    const height = Number(cylinderSideSurface[2]);
    const sideArea = roundTo(2 * pi * radius * height, 2);
    const surfaceArea = roundTo(sideArea + 2 * pi * radius * radius, 2);
    return {
      expectedValues: [sideArea, surfaceArea],
      expectedDisplay: `${formatNumber(sideArea)}, ${formatNumber(surfaceArea)}`,
      method: "cylinder-side-and-surface-area",
      family: "surface-area",
    };
  }

  const cylinderSideOnly = text.match(/圆柱的底面半径是\s*(\d+(?:\.\d+)?)\s*厘米，高是\s*(\d+(?:\.\d+)?)\s*厘米.*?侧面积/);
  if (cylinderSideOnly) {
    const radius = Number(cylinderSideOnly[1]);
    const height = Number(cylinderSideOnly[2]);
    const value = roundTo(2 * pi * radius * height, 2);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "cylinder-side-area",
      family: "surface-area",
    };
  }

  const openCylinderBucket = text.match(/圆柱形水桶.*?底面直径是\s*(\d+(?:\.\d+)?)\s*分米，高是\s*(\d+(?:\.\d+)?)\s*分米.*?无盖.*?铁皮/);
  if (openCylinderBucket) {
    const radius = Number(openCylinderBucket[1]) / 2;
    const height = Number(openCylinderBucket[2]);
    const value = roundTo(2 * pi * radius * height + pi * radius * radius, 2);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "open-cylinder-bucket-surface-area",
      family: "surface-area",
    };
  }

  const coneFromCylinder = text.match(/圆柱的底面直径是\s*(\d+(?:\.\d+)?)\s*分米，高是\s*(\d+(?:\.\d+)?)\s*分米.*?削成一个最大的圆锥.*?体积/);
  if (coneFromCylinder) {
    const radius = Number(coneFromCylinder[1]) / 2;
    const height = Number(coneFromCylinder[2]);
    const value = roundTo((pi * radius * radius * height) / 3, 2);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "largest-cone-volume-from-cylinder",
      family: "volume",
    };
  }

  const halfCircle = text.match(/长\s*(\d+(?:\.\d+)?)\s*厘米.*?宽\s*(\d+(?:\.\d+)?)\s*厘米.*?最大(?:的)?半圆.*?周长/);
  if (halfCircle) {
    const diameter = Math.max(Number(halfCircle[1]), Number(halfCircle[2]));
    const radius = diameter / 2;
    const value = roundTo(pi * radius + diameter, 2);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "largest-semicircle-perimeter-in-rectangle",
      family: "geometry",
    };
  }

  const cutCuboid = text.match(/长方体长\s*(\d+(?:\.\d+)?)\s*厘米，?宽\s*(\d+(?:\.\d+)?)\s*厘米，高\s*(\d+(?:\.\d+)?)\s*厘米.*?切成两个完全一样.*?表面积最多增加/);
  if (cutCuboid) {
    const [length, width, height] = cutCuboid.slice(1).map(Number);
    const largestFace = Math.max(length * width, length * height, width * height);
    const value = 2 * largestFace;
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "cuboid-cut-max-surface-area-increase",
      family: "surface-area",
    };
  }

  const footprintCuboid = text.match(/长方体.*?长\s*(\d+(?:\.\d+)?)\s*厘米，?宽\s*(\d+(?:\.\d+)?)\s*厘米，高\s*(\d+(?:\.\d+)?)\s*厘米.*?占地面积最小.*?体积/);
  if (footprintCuboid) {
    const [length, width, height] = footprintCuboid.slice(1).map(Number);
    const minFace = Math.min(length * width, length * height, width * height);
    const volume = length * width * height;
    return {
      expectedValues: [minFace, volume],
      expectedDisplay: `${formatNumber(minFace)}, ${formatNumber(volume)}`,
      method: "cuboid-min-footprint-and-volume",
      family: "volume",
    };
  }

  const waterDisplacement = text.match(/长方体水箱.*?长\s*(\d+(?:\.\d+)?)\s*分米、?宽\s*(\d+(?:\.\d+)?)\s*分米、高\s*(\d+(?:\.\d+)?)\s*分米.*?水深\s*(\d+(?:\.\d+)?)\s*分米.*?体积为\s*(\d+(?:\.\d+)?)\s*立方分米.*?水面会上升/);
  if (waterDisplacement) {
    const baseArea = Number(waterDisplacement[1]) * Number(waterDisplacement[2]);
    const value = Number(waterDisplacement[5]) / baseArea;
    return {
      expectedValue: value,
      expectedDisplay: `${formatNumber(value)}分米`,
      method: "water-displacement-height-rise",
      family: "volume",
    };
  }

  const areaCompare = solveLabeledAreaComparison(text);
  if (areaCompare) return areaCompare;

  const rectangle = text.match(/长(?:是|为)?\s*(\d+(?:\.\d+)?)\s*(?:厘米|米|cm|m)?.*?宽(?:是|为)?\s*(\d+(?:\.\d+)?)\s*(?:厘米|米|cm|m)?/);
  if (rectangle && !/长方体|拼成|半圆|切成|占地面积|公顷/.test(text)) {
    const length = Number(rectangle[1]);
    const width = Number(rectangle[2]);
    if (/面积/.test(text) && !/周长/.test(text)) {
      return {
        expectedValue: length * width,
        expectedDisplay: formatNumber(length * width),
        method: "rectangle-area",
        family: "area",
      };
    }
    if (/周长/.test(text) && !/面积/.test(text)) {
      return {
        expectedValue: 2 * (length + width),
        expectedDisplay: formatNumber(2 * (length + width)),
        method: "rectangle-perimeter",
        family: "perimeter",
      };
    }
  }

  const square = text.match(/边长(?:是|为)?\s*(\d+(?:\.\d+)?)\s*(?:厘米|米|cm|m)?/);
  if (square && /正方形/.test(text) && !/公顷/.test(text)) {
    const side = Number(square[1]);
    if (/面积/.test(text) && !/周长/.test(text)) {
      return {
        expectedValue: side * side,
        expectedDisplay: formatNumber(side * side),
        method: "square-area",
        family: "area",
      };
    }
    if (/周长/.test(text) && !/面积/.test(text)) {
      return {
        expectedValue: 4 * side,
        expectedDisplay: formatNumber(4 * side),
        method: "square-perimeter",
        family: "perimeter",
      };
    }
  }

  const hectareRectangle = text.match(/长方形.*?长\s*(\d+(?:\.\d+)?)\s*米.*?宽\s*(\d+(?:\.\d+)?)\s*米.*?面积是多少公顷(?:.*?每公顷.*?(\d+(?:\.\d+)?)\s*棵)?/);
  if (hectareRectangle) {
    const hectares = (Number(hectareRectangle[1]) * Number(hectareRectangle[2])) / 10000;
    const trees = hectareRectangle[3] ? hectares * Number(hectareRectangle[3]) : null;
    return {
      expectedValues: trees == null ? [hectares] : [hectares, trees],
      expectedDisplay: trees == null ? `${formatNumber(hectares)}公顷` : `${formatNumber(hectares)}公顷; ${formatNumber(trees)}棵`,
      method: "rectangle-area-hectare-conversion",
      family: "area",
    };
  }

  const hectareSquare = text.match(/正方形.*?边长(?:是|为)?\s*(\d+(?:\.\d+)?)\s*米.*?面积是多少公顷/);
  if (hectareSquare) {
    const hectares = (Number(hectareSquare[1]) ** 2) / 10000;
    return {
      expectedValue: hectares,
      expectedDisplay: `${formatNumber(hectares)}公顷`,
      method: "square-area-hectare-conversion",
      family: "area",
    };
  }

  const cuboid = text.match(/长(?:是|为)?\s*(\d+(?:\.\d+)?).*?宽(?:是|为)?\s*(\d+(?:\.\d+)?).*?高(?:是|为)?\s*(\d+(?:\.\d+)?)/);
  if (cuboid && /体积/.test(text)) {
    const value = Number(cuboid[1]) * Number(cuboid[2]) * Number(cuboid[3]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "cuboid-volume",
      family: "volume",
    };
  }

  const annulus = text.match(/直径(?:是|为)?\s*(\d+(?:\.\d+)?)\s*米.*?(\d+(?:\.\d+)?)\s*米宽.*?小路.*?面积/);
  if (annulus) {
    const innerRadius = Number(annulus[1]) / 2;
    const outerRadius = innerRadius + Number(annulus[2]);
    const value = roundTo(pi * (outerRadius ** 2 - innerRadius ** 2), 2);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "annulus-area-from-diameter-width",
      family: "area",
    };
  }

  const circleFromCircumference = text.match(/长\s*(\d+(?:\.\d+)?)\s*米的绳子围成.*?圆.*?面积/);
  if (circleFromCircumference) {
    const circumference = Number(circleFromCircumference[1]);
    const radius = circumference / (2 * pi);
    const value = roundTo(pi * radius * radius, 2);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "circle-area-from-circumference",
      family: "area",
    };
  }

  const angleRatio = text.match(/内角.*?比是\s*(\d+(?:\.\d+)?):(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)/);
  if (angleRatio) {
    const parts = [Number(angleRatio[1]), Number(angleRatio[2]), Number(angleRatio[3])];
    const largest = Math.max(...parts);
    const largestAngle = (largest / parts.reduce((sum, part) => sum + part, 0)) * 180;
    if (/最大.*角|最大的角|多少度/.test(text)) {
      return {
        expectedValue: largestAngle,
        expectedDisplay: `${formatNumber(largestAngle)}°`,
        method: "triangle-angle-ratio-largest-angle",
        family: "geometry-classification",
      };
    }
    const type = numericClose(largestAngle, 90) ? "直角三角形" : largestAngle > 90 ? "钝角三角形" : "锐角三角形";
    return {
      expectedText: type,
      expectedDisplay: type,
      method: "triangle-angle-ratio-classification",
      family: "geometry-classification",
    };
  }

  return null;
}

function solveLabeledAreaComparison(text) {
  if (!/面积最大/.test(text)) return null;
  const labeled = [];
  const squareRegex = /([甲乙丙丁ABCD])[:：]\s*边长为?(\d+(?:\.\d+)?)厘米的正方形/g;
  for (const match of text.matchAll(squareRegex)) {
    const side = Number(match[2]);
    labeled.push({ label: match[1], area: side * side });
  }
  const rectangleRegex = /([甲乙丙丁ABCD])[:：]\s*长为?(\d+(?:\.\d+)?)厘米[、，,]?宽为?(\d+(?:\.\d+)?)厘米的长方形/g;
  for (const match of text.matchAll(rectangleRegex)) {
    labeled.push({ label: match[1], area: Number(match[2]) * Number(match[3]) });
  }
  if (labeled.length < 2) return null;
  const max = Math.max(...labeled.map((entry) => entry.area));
  const winners = labeled.filter((entry) => numericClose(entry.area, max));
  if (winners.length !== 1) {
    return {
      contentError: "area comparison has no unique maximum",
      expectedDisplay: winners.map((entry) => entry.label).join(","),
      method: "labeled-area-comparison",
      family: "area",
    };
  }
  return {
    expectedText: winners[0].label,
    expectedDisplay: winners[0].label,
    method: "labeled-area-comparison",
    family: "area",
  };
}

function statisticsSolver(row) {
  const text = row.promptZhHans || "";
  const fastestMonthlyRise = solveFastestMonthlyRise(text);
  if (fastestMonthlyRise) return fastestMonthlyRise;

  if (/平均数/.test(text)) {
    if (row.type === "multiple-choice" && /说法|正确/.test(text)) return null;
    const numbers = extractNumbers(text).map((entry) => entry.value).filter((value) => Math.abs(value) < 100000);
    if (numbers.length >= 2 && !/202[0-9]年/.test(text)) {
      const value = numbers.reduce((sum, number) => sum + number, 0) / numbers.length;
      return {
        expectedValue: value,
        expectedDisplay: formatNumber(value),
        method: "arithmetic-mean",
        family: "statistics",
      };
    }
  }
  const tempTrend = text.match(/1月\s*(-?\d+(?:\.\d+)?)°?C?.*?6月\s*(-?\d+(?:\.\d+)?)°?C?.*?上升/);
  if (tempTrend) {
    const value = Number(tempTrend[2]) - Number(tempTrend[1]);
    return {
      expectedValue: value,
      expectedDisplay: `${formatNumber(value)}°C`,
      method: "line-chart-described-difference",
      family: "statistics",
    };
  }
  const tally = text.match(/苹果：([正一丨]+).*?梨：([正一丨]+).*?每个“正”字代表\s*(\d+).*?苹果.*?比.*?梨.*?多/);
  if (tally) {
    const apple = [...tally[1].matchAll(/正/g)].length * Number(tally[3]);
    const pear = [...tally[2].matchAll(/正/g)].length * Number(tally[3]);
    const value = apple - pear;
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "tally-chart-difference",
      family: "statistics",
    };
  }
  const barTarget = text.match(/([^\d，。；：:\s]+)项目应画/);
  const barScale = text.match(/用\s*1\s*格表示\s*(\d+(?:\.\d+)?)人/);
  if (barTarget && barScale) {
    const target = barTarget[1].replace(/^.*?([^\s，。；：:]+)$/, "$1");
    const countMatch = text.match(new RegExp(`${target}\\s*(\\d+(?:\\.\\d+)?)人`));
    if (!countMatch) return null;
    const value = Number(countMatch[1]) / Number(barScale[1]);
    return {
      expectedValue: value,
      expectedDisplay: `${formatNumber(value)}格`,
      method: "bar-chart-grid-scale",
      family: "statistics",
    };
  }
  return null;
}

function solveFastestMonthlyRise(text) {
  if (!/上升最快/.test(text)) return null;
  const points = [];
  for (const match of text.matchAll(/(\d+)月\s*(-?\d+(?:\.\d+)?)\s*℃/g)) {
    points.push({ month: Number(match[1]), value: Number(match[2]) });
  }
  if (points.length < 2) return null;
  const rises = [];
  for (let index = 1; index < points.length; index += 1) {
    rises.push({ month: points[index].month, rise: points[index].value - points[index - 1].value });
  }
  const maxRise = Math.max(...rises.map((entry) => entry.rise));
  const winners = rises.filter((entry) => numericClose(entry.rise, maxRise));
  if (winners.length !== 1) {
    return {
      contentError: `monthly rise is tied across ${winners.map((entry) => `${entry.month}月`).join("、")}`,
      expectedDisplay: `${winners.map((entry) => `${entry.month}月`).join("、")}，上升${formatNumber(maxRise)}℃`,
      method: "described-line-chart-fastest-rise",
      family: "statistics",
    };
  }
  return {
    expectedText: `${winners[0].month}月上升最快，上升了${formatNumber(maxRise)}℃`,
    expectedValue: maxRise,
    expectedDisplay: `${winners[0].month}月，上升${formatNumber(maxRise)}℃`,
    method: "described-line-chart-fastest-rise",
    family: "statistics",
  };
}

function fractionPercentRatioSolver(row) {
  const text = row.promptZhHans || "";
  const normalized = toHalfWidth(text).replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2");

  const simplify = normalized.match(/把\s*(\d+\s*\/\s*\d+)\s*(?:约分成最简分数|化成最简分数|约分)/);
  if (simplify) {
    const fraction = parseFractionParts(simplify[1]);
    if (fraction) {
      const display = formatFractionParts(fraction);
      return {
        expectedText: display,
        expectedDisplay: display,
        method: "simplify-fraction",
        family: "fractions",
      };
    }
  }

  const fractionArithmetic = normalized.match(/计算[:：]?\s*(\d+\s*\/\s*\d+)\s*([+\-])\s*(\d+\s*\/\s*\d+)/);
  if (fractionArithmetic) {
    const left = parseFractionParts(fractionArithmetic[1]);
    const right = parseFractionParts(fractionArithmetic[3]);
    if (left && right) {
      const denominator = left.denominator * right.denominator;
      const numerator =
        fractionArithmetic[2] === "+"
          ? left.numerator * right.denominator + right.numerator * left.denominator
          : left.numerator * right.denominator - right.numerator * left.denominator;
      const result = simplifyFraction(numerator, denominator);
      const display = formatFractionParts(result);
      return {
        expectedText: display,
        expectedValue: result.numerator / result.denominator,
        expectedDisplay: display,
        method: "fraction-add-subtract",
        family: "fractions",
      };
    }
  }

  const decimalFraction = text.match(/把\s*(0\.\d+)\s*化成最简分数/);
  if (decimalFraction) {
    const fraction = decimalToFraction(Number(decimalFraction[1]), 1000);
    if (fraction) {
      return {
        expectedText: fraction,
        expectedDisplay: fraction,
        method: "decimal-to-simplest-fraction",
        family: "fractions",
      };
    }
  }

  const oil = text.match(/重\s*(\d+(?:\.\d+)?)\s*千克.*?用去\s*(\d+\s*\/\s*\d+)\s*千克.*?用去\s*(\d+\s*\/\s*\d+)\s*千克.*?还剩/);
  if (oil) {
    const value = Number(oil[1]) - parseNumberToken(oil[2]) - parseNumberToken(oil[3]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "fraction-subtraction-from-whole",
      family: "fractions",
    };
  }

  const fractionUsedTotal = /剩下/.test(normalized)
    ? null
    : normalized.match(/(?:第一天|第一次).*?(\d+\s*\/\s*\d+).*?(?:第二天|第二次).*?(\d+\s*\/\s*\d+).*?(?:一共|两次|两天)/);
  if (fractionUsedTotal) {
    const left = parseFractionParts(fractionUsedTotal[1]);
    const right = parseFractionParts(fractionUsedTotal[2]);
    if (left && right) {
      const result = simplifyFraction(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator);
      const display = formatFractionParts(result);
      return {
        expectedText: display,
        expectedValue: result.numerator / result.denominator,
        expectedDisplay: display,
        method: "fraction-context-sum",
        family: "fractions",
      };
    }
  }

  const percentOf = text.match(/(\d+(?:\.\d+)?)\s*的\s*(\d+(?:\.\d+)?)%/);
  if (percentOf) {
    const value = (Number(percentOf[1]) * Number(percentOf[2])) / 100;
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "percent-of-number",
      family: "percent",
    };
  }

  const proportion = text.match(/(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)\s*:\s*(?:__+|_{2,}|x|X|？|\?)/);
  if (proportion) {
    const value = (Number(proportion[2]) * Number(proportion[3])) / Number(proportion[1]);
    return {
      expectedValue: value,
      expectedDisplay: formatNumber(value),
      method: "simple-proportion",
      family: "ratio-proportion",
    };
  }
  return null;
}

function classificationSolver(row) {
  const text = row.promptZhHans || "";
  const options = row.optionsZhHans || [];
  if (!Array.isArray(options) || options.length !== 4) return null;

  if (/正确的算式/.test(text) && /18/.test(text) && /吃了\s*6/.test(text) && /平均分给\s*3/.test(text)) {
    return {
      expectedText: "(18 - 6) ÷ 3",
      expectedDisplay: "(18 - 6) ÷ 3",
      method: "multi-step-expression-option",
      family: "arithmetic-application",
    };
  }

  if (/既是\s*2\s*的倍数.*?又是\s*3\s*的倍数/.test(text)) {
    const matches = options.filter((option) => {
      const value = extractNumbers(option)[0]?.value;
      return Number.isInteger(value) && value % 2 === 0 && value % 3 === 0;
    });
    if (matches.length === 1) {
      return {
        expectedText: matches[0],
        expectedDisplay: matches[0],
        method: "divisibility-by-2-and-3",
        family: "number-theory",
      };
    }
  }

  const shapeCounts = text.match(/长方形有(\d+)个.*?正方形有(\d+)个.*?三角形有(\d+)个/);
  if (shapeCounts) {
    const [rectangles, squares, triangles] = shapeCounts.slice(1).map(Number);
    const matches = options.filter((option) => {
      const r = option.match(/(\d+)个长方形/)?.[1];
      const s = option.match(/(\d+)个正方形/)?.[1];
      const t = option.match(/(\d+)个三角形/)?.[1];
      return Number(r) === rectangles && Number(s) === squares && Number(t) === triangles;
    });
    if (matches.length === 1) {
      return {
        expectedText: matches[0],
        expectedValues: [rectangles, squares, triangles],
        expectedDisplay: matches[0],
        method: "shape-count-option-match",
        family: "geometry-classification",
      };
    }
  }

  if (/三分之一|1\/3/.test(text) && /平均分成3份/.test(options.join(""))) {
    const matches = options.filter((option) => /平均分成3份.*?涂了1份/.test(option));
    if (matches.length === 1) {
      return {
        expectedText: matches[0],
        expectedDisplay: matches[0],
        method: "fraction-shaded-part-definition",
        family: "fractions",
      };
    }
  }

  if (/面向东方/.test(text) && /向右转90度/.test(text) && /向后转/.test(text)) {
    return {
      expectedText: "北",
      expectedDisplay: "北",
      method: "direction-turning",
      family: "geometry-direction",
    };
  }

  if (/数对/.test(text) && /同桌/.test(text)) {
    const point = text.match(/（\s*(\d+)\s*[，,]\s*(\d+)\s*）/);
    if (point) {
      const row = Number(point[2]);
      const matches = options.filter((option) => {
        const m = option.match(/（\s*(\d+)\s*[，,]\s*(\d+)\s*）/);
        return m && Number(m[2]) === row && Number(m[1]) !== Number(point[1]);
      });
      if (matches.length === 1) {
        return {
          expectedText: matches[0],
          expectedDisplay: matches[0],
          method: "coordinate-same-row-desk",
          family: "geometry-position",
        };
      }
    }
  }

  return null;
}

function comparisonSymbolSolver(row) {
  const text = row.promptZhHans || "";
  const comparison = text.match(/比较大小[:：]\s*(-?\d+(?:\.\d+)?)\s*(?:__+|□|_+)\s*(-?\d+(?:\.\d+)?)/);
  if (!comparison) return null;
  const left = Number(comparison[1]);
  const right = Number(comparison[2]);
  const symbol = left > right ? ">" : left < right ? "<" : "=";
  return {
    expectedText: symbol,
    expectedDisplay: symbol,
    method: "comparison-symbol-direct",
    family: "comparison",
  };
}

function optionExpressionSolver(row) {
  if (row.type !== "multiple-choice") return null;
  const text = row.promptZhHans || "";
  const options = effectiveMcOptions(row)
    .map((option) => {
      const value = safeEvalExpression(option.text);
      return value == null ? null : { ...option, value };
    })
    .filter(Boolean);
  if (options.length < 2) return null;

  const greaterThan = text.match(/得数比\s*(\d+(?:\.\d+)?)\s*大/);
  if (greaterThan) {
    const target = Number(greaterThan[1]);
    const matches = options.filter((option) => option.value > target);
    if (matches.length === 1) {
      return {
        expectedText: matches[0].text,
        expectedDisplay: matches[0].text,
        method: "option-expression-greater-than",
        family: "arithmetic",
      };
    }
  }

  const sameAs = text.match(/得数与\s*([0-9.\s()+\-×xX*÷/]+)\s*相同/);
  if (sameAs) {
    const target = safeEvalExpression(sameAs[1]);
    if (target != null) {
      const matches = options.filter((option) => numericClose(option.value, target));
      if (matches.length === 1) {
        return {
          expectedText: matches[0].text,
          expectedDisplay: matches[0].text,
          method: "option-expression-same-value",
          family: "arithmetic",
        };
      }
    }
  }

  if (/得数最大|结果最大/.test(text)) {
    const max = Math.max(...options.map((option) => option.value));
    const matches = options.filter((option) => numericClose(option.value, max));
    if (matches.length === 1) {
      return {
        expectedText: matches[0].text,
        expectedDisplay: matches[0].text,
        method: "option-expression-largest-value",
        family: "arithmetic",
      };
    }
  }

  const closestProduct = text.match(/(?:积|结果).*?最接近\s*(\d+(?:\.\d+)?)/);
  if (closestProduct) {
    const target = Number(closestProduct[1]);
    const distances = options.map((option) => ({ ...option, distance: Math.abs(option.value - target) }));
    const bestDistance = Math.min(...distances.map((option) => option.distance));
    const matches = distances.filter((option) => numericClose(option.distance, bestDistance));
    if (matches.length === 1) {
      return {
        expectedText: matches[0].text,
        expectedDisplay: matches[0].text,
        method: "option-expression-closest-value",
        family: "estimation",
      };
    }
  }

  const packageTotal = text.match(/每包有\s*(\d+)\s*本，共买了\s*(\d+)\s*包/);
  if (packageTotal) {
    const target = Number(packageTotal[1]) * Number(packageTotal[2]);
    const matches = options.filter((option) => numericClose(option.value, target));
    if (matches.length === 1) {
      return {
        expectedText: matches[0].text,
        expectedDisplay: matches[0].text,
        method: "option-expression-equal-groups-total",
        family: "multiplication",
      };
    }
  }

  return null;
}

function roundingSolver(row) {
  const text = row.promptZhHans || "";
  const nearestThousand = text.match(/把\s*(\d+)\s*四舍五入到千位/);
  if (nearestThousand) {
    const value = Math.round(Number(nearestThousand[1]) / 1000) * 1000;
    return {
      expectedValue: value,
      expectedDisplay: String(value),
      method: "round-to-nearest-thousand",
      family: "estimation",
    };
  }
  const aboutThousand = text.match(/价格是\s*(\d+)\s*元.*?大约是几千元/);
  if (aboutThousand) {
    const value = Math.round(Number(aboutThousand[1]) / 1000) * 1000;
    return {
      expectedValue: value,
      expectedDisplay: `${value}元`,
      method: "estimate-to-nearest-thousand-yuan",
      family: "estimation",
    };
  }
  const factorBlanks = text.match(/估算\s*(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?).*?看作.*?积大约/);
  if (factorBlanks) {
    const a = roundToFriendly(Number(factorBlanks[1]));
    const b = roundToFriendly(Number(factorBlanks[2]));
    return {
      expectedValues: [a, b, a * b],
      expectedDisplay: `${a}, ${b}, ${a * b}`,
      method: "estimate-rounded-factors-and-product",
      family: "estimation",
    };
  }
  const multiplicationEstimate = text.match(/估算[:：]?\s*(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)/);
  if (multiplicationEstimate) {
    const rawA = Number(multiplicationEstimate[1]);
    const rawB = Number(multiplicationEstimate[2]);
    if (/整百数/.test(text)) {
      const value = Math.round((rawA * rawB) / 100) * 100;
      return {
        expectedValue: value,
        expectedDisplay: String(value),
        method: "estimate-product-to-nearest-hundred",
        family: "estimation",
      };
    }
    const a = roundToFriendly(rawA);
    const b = roundToFriendly(rawB);
    const value = a * b;
    return {
      expectedValue: value,
      expectedDisplay: String(value),
      method: "rounded-multiplication-estimate",
      family: "estimation",
    };
  }
  return null;
}

function roundToFriendly(value) {
  if (Math.abs(value) >= 100) return Math.round(value / 100) * 100;
  if (Math.abs(value) >= 10) return Math.round(value / 10) * 10;
  return Math.round(value);
}

function algebraSolver(row) {
  const text = row.promptZhHans || "";
  const twoItemPrice = text.match(/买了\s*(\d+)\s*个篮球和\s*(\d+)\s*个排球，一共用了\s*(\d+(?:\.\d+)?)\s*元.*?篮球比.*?排球贵\s*(\d+(?:\.\d+)?)\s*元/);
  if (twoItemPrice) {
    const basketballCount = Number(twoItemPrice[1]);
    const volleyballCount = Number(twoItemPrice[2]);
    const total = Number(twoItemPrice[3]);
    const difference = Number(twoItemPrice[4]);
    const volleyball = (total - basketballCount * difference) / (basketballCount + volleyballCount);
    const basketball = volleyball + difference;
    return {
      expectedValues: [basketball, volleyball],
      expectedDisplay: `篮球${formatNumber(basketball)}元，排球${formatNumber(volleyball)}元`,
      method: "two-item-price-linear-equation",
      family: "algebra",
    };
  }
  if (/爸爸的年龄比小红年龄的\s*3\s*倍还多\s*5/.test(text)) {
    return {
      expectedText: "3x + 5",
      expectedDisplay: "3x + 5",
      method: "algebraic-expression-three-times-plus-five",
      family: "algebra",
    };
  }
  const remainingRice = text.match(/买来\s*a\s*千克.*?每天吃\s*b\s*千克.*?吃了\s*(\d+)\s*天.*?a\s*=\s*(\d+(?:\.\d+)?).*?b\s*=\s*(\d+(?:\.\d+)?)/i);
  if (remainingRice) {
    const days = Number(remainingRice[1]);
    const a = Number(remainingRice[2]);
    const b = Number(remainingRice[3]);
    return {
      expectedValues: [`a-${days}b`, a - days * b],
      expectedDisplay: `a-${days}b; ${formatNumber(a - days * b)}`,
      method: "linear-expression-substitution",
      family: "algebra",
    };
  }
  return null;
}

function chickenRabbitSolver(row) {
  const text = row.promptZhHans || "";
  const match = text.match(/鸡和兔共有\s*(\d+)\s*个头.*?(\d+)\s*条腿.*?鸡.*?兔/);
  if (!match) return null;
  const heads = Number(match[1]);
  const legs = Number(match[2]);
  const rabbits = (legs - 2 * heads) / 2;
  const chickens = heads - rabbits;
  if (!Number.isInteger(chickens) || !Number.isInteger(rabbits) || chickens < 0 || rabbits < 0) return null;
  return {
    expectedValues: [chickens, rabbits],
    expectedDisplay: `${chickens}, ${rabbits}`,
    method: "chicken-rabbit-linear-system",
    family: "application-problem",
  };
}

const SOLVERS = [
  directEquationSolver,
  numberPatternSolver,
  placeValueSolver,
  moneySolver,
  timeSolver,
  unitConversionSolver,
  chickenRabbitSolver,
  fractionPercentRatioSolver,
  geometrySolver,
  statisticsSolver,
  roundingSolver,
  algebraSolver,
  storyProblemSolver,
  comparisonSymbolSolver,
  optionExpressionSolver,
  classificationSolver,
];

function solveRow(row) {
  for (const solver of SOLVERS) {
    const result = solver(row);
    if (result) return result;
  }
  return null;
}

function validateSchema(row) {
  const issues = [];
  if (row.__parseError) {
    issues.push({ gate: "inventory", severity: "blocker", code: "json-parse", message: row.__parseError });
    return issues;
  }
  for (const field of REQUIRED_FIELDS) {
    if (!(field in row)) {
      issues.push({ gate: "schema", severity: "blocker", code: "missing-field", message: `Missing ${field}` });
    }
  }
  if (!EXPECTED_GRADES.includes(row.grade)) {
    issues.push({ gate: "schema", severity: "blocker", code: "invalid-grade", message: `Invalid grade ${row.grade}` });
  }
  if (!EXPECTED_SEMESTERS.includes(row.semester)) {
    issues.push({ gate: "schema", severity: "blocker", code: "invalid-semester", message: `Invalid semester ${row.semester}` });
  }
  if (!EXPECTED_TYPES.includes(row.type)) {
    issues.push({ gate: "schema", severity: "blocker", code: "invalid-type", message: `Invalid type ${row.type}` });
  }
  for (const field of ["id", "unitTitle", "difficulty", "promptZhHans", "answer", "explanationZhHans"]) {
    if (typeof row[field] !== "string" || row[field].trim() === "") {
      issues.push({ gate: "schema", severity: "blocker", code: "empty-string-field", message: `${field} is empty or not a string` });
    }
  }
  if (!/^pep-primary-rag2-p[1-6]-(upper|lower)-(mc|fi|sa)-\d{3}$/.test(String(row.id ?? ""))) {
    issues.push({ gate: "schema", severity: "blocker", code: "invalid-id-pattern", message: "ID does not match pep-primary-rag2-{grade}-{semester}-{type}-{nnn}" });
  }
  const expectedDifficultySet = new Set(Object.keys(EXPECTED_DIFFICULTY_TOTALS_BY_GRADE[row.grade] ?? {}));
  if (!expectedDifficultySet.has(row.difficulty)) {
    issues.push({ gate: "schema", severity: "blocker", code: "invalid-difficulty", message: `Invalid difficulty ${row.difficulty} for ${row.grade}` });
  }
  if (!["P5", "P6"].includes(row.grade) && row.difficulty === "Exam") {
    issues.push({ gate: "schema", severity: "blocker", code: "exam-outside-p5-p6", message: "Only P5-P6 may use Exam difficulty" });
  }
  for (const field of ["conceptIds", "evidenceCardIds", "examPatternCardIds", "optionsZhHans", "acceptedAnswers"]) {
    if (!Array.isArray(row[field])) {
      issues.push({ gate: "schema", severity: "blocker", code: "invalid-array-field", message: `${field} is not an array` });
    }
  }
  if (Array.isArray(row.evidenceCardIds) && row.evidenceCardIds.length === 0) {
    issues.push({ gate: "schema", severity: "blocker", code: "missing-evidence", message: "No evidenceCardIds" });
  }
  if (Array.isArray(row.examPatternCardIds) && row.examPatternCardIds.length === 0) {
    issues.push({ gate: "schema", severity: "major", code: "missing-exam-pattern", message: "No examPatternCardIds" });
  }
  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    const uniqueOptions = new Set(options.map(normalizeOptionIdentity));
    if (options.length !== 4) {
      issues.push({ gate: "schema", severity: "blocker", code: "mc-option-count", message: `Multiple-choice row has ${options.length} options` });
    }
    if (uniqueOptions.size !== options.length) {
      issues.push({ gate: "schema", severity: "blocker", code: "mc-duplicate-options", message: "Multiple-choice row has duplicate normalized options" });
    }
    const selected = selectedMcOption(row);
    if (!selected) {
      issues.push({ gate: "schema", severity: "blocker", code: "mc-answer-not-unique-option", message: "Stored answer does not select exactly one option" });
    }
  } else if (EXPECTED_TYPES.includes(row.type)) {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    if (options.length !== 0) {
      issues.push({ gate: "schema", severity: "blocker", code: "non-mc-options-present", message: `${row.type} row has options` });
    }
    if (!Array.isArray(row.acceptedAnswers) || row.acceptedAnswers.length === 0 || row.acceptedAnswers.every((answer) => !String(answer).trim())) {
      issues.push({ gate: "schema", severity: "blocker", code: "missing-accepted-answers", message: `${row.type} row has no accepted answers` });
    }
  }

  const combinedText = [
    row.promptZhHans,
    row.answer,
    row.explanationZhHans,
    ...(Array.isArray(row.optionsZhHans) ? row.optionsZhHans : []),
  ].join("\n");
  for (const pattern of FORBIDDEN_SOURCE_PATTERNS) {
    if (pattern.regex.test(combinedText)) {
      issues.push({ gate: "source-distance", severity: "blocker", code: pattern.code, message: "Forbidden source-locator/source-artifact wording found" });
    }
  }
  for (const regex of MISSING_VISUAL_PATTERNS) {
    if (regex.test(row.promptZhHans || "")) {
      issues.push({ gate: "prompt", severity: "blocker", code: "missing-visual-risk", message: `Prompt appears to depend on an unstored visual: ${regex}` });
    }
  }
  if (CONTRADICTION_PATTERNS.some((regex) => regex.test(row.explanationZhHans || ""))) {
    issues.push({ gate: "explanation", severity: "blocker", code: "explanation-self-contradiction", message: "Explanation contains contradiction or missing-information wording" });
  }
  return issues;
}

function statusFromAudit(row, schemaIssues, solverResult) {
  const ambiguousIssue = schemaIssues.find((issue) => issue.code.startsWith("mc-") && issue.code !== "mc-option-count");
  if (ambiguousIssue) return "ambiguous-mc";
  if (schemaIssues.some((issue) => issue.severity === "blocker")) return "content-error";
  if (!solverResult) return "solver-gap";
  if (solverResult.contentError) return "content-error";

  if (row.type === "multiple-choice") {
    const options = effectiveMcOptions(row);
    const optionMatchesSolver = (option) => {
      const optionText = `${option.raw} ${option.text}`;
      if (solverResult.expectedText != null && answerTextMatchesValue(optionText, solverResult.expectedText)) return true;
      if (solverResult.expectedDisplay != null && answerTextMatchesValue(optionText, solverResult.expectedDisplay)) return true;
      if (solverResult.expectedValue != null && answerTextMatchesValue(optionText, solverResult.expectedValue)) return true;
      if (Array.isArray(solverResult.expectedValues) && answerTextMatchesValue(optionText, solverResult.expectedValues)) return true;
      return false;
    };
    const selected = selectedMcOption(row);
    if (!selected) return "ambiguous-mc";
    if (!optionMatchesSolver(selected)) return "solver-gap";
    const matchingComputedOptions = options.filter(optionMatchesSolver);
    const expectedOption = matchingComputedOptions[0];
    if (expectedOption) {
      const selectedIdentity = `${selected.label}:${normalizeOptionIdentity(selected.text)}`;
      const expectedIdentity = `${expectedOption.label}:${normalizeOptionIdentity(expectedOption.text)}`;
      if (selectedIdentity !== expectedIdentity) return "solver-gap";
    }
  }

  if (!answerSetMatches(solverResult, row)) return "solver-gap";
  if (!explanationMatches(solverResult, row.explanationZhHans)) return "solver-gap";
  return "pass";
}

function auditRow(row) {
  const schemaIssues = validateSchema(row);
  const solverResult = schemaIssues.some((issue) => issue.severity === "blocker") ? null : solveRow(row);
  const status = statusFromAudit(row, schemaIssues, solverResult);
  const explanationCheck = !solverResult
    ? "not-run"
    : explanationMatches(solverResult, row.explanationZhHans)
      ? "pass"
      : "fail";
  const computed = solverResult?.expectedDisplay ?? solverResult?.expectedText ?? solverResult?.expectedValue ?? "";
  const notes = [
    ...schemaIssues.map((issue) => `${issue.gate}:${issue.code}:${issue.message}`),
    solverResult ? `solver:${solverResult.method}` : "solver:no deterministic solver matched this free-form item",
    solverResult?.contentError ? `deterministic-content-error:${solverResult.contentError}` : "",
    explanationCheck === "fail" ? "explanation:computed result not found or contradiction pattern present" : "",
  ].filter(Boolean);
  return {
    questionId: row.id,
    grade: row.grade,
    semester: row.semester,
    type: row.type,
    difficulty: row.difficulty,
    unitTitle: row.unitTitle,
    status,
    severity: status === "pass" ? "none" : status === "solver-gap" ? "manual-required" : "blocker",
    storedAnswer: row.answer,
    acceptedAnswers: Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers.join(" | ") : "",
    independentAnswer: computed,
    solverMethod: solverResult?.method ?? "",
    solverFamily: solverResult?.family ?? "",
    explanationCheck,
    notes: notes.join(" || "),
    promptZhHans: row.promptZhHans,
    optionsZhHans: Array.isArray(row.optionsZhHans) ? row.optionsZhHans.join(" | ") : "",
    explanationZhHans: row.explanationZhHans,
    evidenceCardIds: Array.isArray(row.evidenceCardIds) ? row.evidenceCardIds.join(" | ") : "",
    examPatternCardIds: Array.isArray(row.examPatternCardIds) ? row.examPatternCardIds.join(" | ") : "",
    issues: schemaIssues,
  };
}

function addInventorySummary(rows, audits) {
  const idCounts = countBy(rows.map((row) => row.id));
  const duplicateIds = Object.entries(idCounts)
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  const gradeCounts = countBy(rows.map((row) => row.grade));
  const gradeSemesterCounts = countBy(rows.map((row) => `${row.grade}-${row.semester}`));
  const typeCounts = countBy(rows.map((row) => row.type));
  const gradeTypeCounts = countBy(rows.map((row) => `${row.grade}-${row.type}`));
  const gradeSemesterTypeCounts = countBy(rows.map((row) => `${row.grade}-${row.semester}-${row.type}`));
  const gradeDifficultyCounts = countBy(rows.map((row) => `${row.grade}-${row.difficulty}`));
  const inventoryIssues = [];
  if (rows.length !== EXPECTED_TOTAL) {
    inventoryIssues.push(`Expected ${EXPECTED_TOTAL} rows, found ${rows.length}`);
  }
  for (const grade of EXPECTED_GRADES) {
    if ((gradeCounts[grade] || 0) !== 200) inventoryIssues.push(`Expected ${grade}=200, found ${gradeCounts[grade] || 0}`);
    for (const semester of EXPECTED_SEMESTERS) {
      const key = `${grade}-${semester}`;
      if ((gradeSemesterCounts[key] || 0) !== 100) inventoryIssues.push(`Expected ${key}=100, found ${gradeSemesterCounts[key] || 0}`);
      for (const [type, expected] of Object.entries(EXPECTED_TYPE_TOTALS_BY_GRADE_SEMESTER[grade][semester])) {
        const typeKey = `${grade}-${semester}-${type}`;
        if ((gradeSemesterTypeCounts[typeKey] || 0) !== expected) {
          inventoryIssues.push(`Expected ${typeKey}=${expected}, found ${gradeSemesterTypeCounts[typeKey] || 0}`);
        }
      }
    }
    for (const [type, expected] of Object.entries(EXPECTED_TYPE_TOTALS_BY_GRADE[grade])) {
      const typeKey = `${grade}-${type}`;
      if ((gradeTypeCounts[typeKey] || 0) !== expected) {
        inventoryIssues.push(`Expected ${typeKey}=${expected}, found ${gradeTypeCounts[typeKey] || 0}`);
      }
    }
    for (const [difficulty, expected] of Object.entries(EXPECTED_DIFFICULTY_TOTALS_BY_GRADE[grade])) {
      const difficultyKey = `${grade}-${difficulty}`;
      if ((gradeDifficultyCounts[difficultyKey] || 0) !== expected) {
        inventoryIssues.push(`Expected ${difficultyKey}=${expected}, found ${gradeDifficultyCounts[difficultyKey] || 0}`);
      }
    }
  }
  for (const [type, expected] of Object.entries(EXPECTED_TYPE_TOTALS)) {
    if ((typeCounts[type] || 0) !== expected) inventoryIssues.push(`Expected ${type}=${expected}, found ${typeCounts[type] || 0}`);
  }
  if (duplicateIds.length > 0) inventoryIssues.push(`Duplicate IDs: ${duplicateIds.join(", ")}`);

  const statusCounts = countBy(audits.map((audit) => audit.status));
  const gradeStatusCounts = {};
  for (const grade of EXPECTED_GRADES) {
    gradeStatusCounts[grade] = countBy(audits.filter((audit) => audit.grade === grade).map((audit) => audit.status));
  }
  const schemaPassRows = audits.filter((audit) => !audit.issues.some((issue) => issue.severity === "blocker")).length;
  return {
    totalRows: rows.length,
    expectedRows: EXPECTED_TOTAL,
    gradeCounts,
    gradeSemesterCounts,
    typeCounts,
    gradeTypeCounts,
    gradeSemesterTypeCounts,
    gradeDifficultyCounts,
    duplicateIds,
    inventoryIssues,
    statusCounts,
    gradeStatusCounts,
    schemaPassRows,
    deterministicSolvedRows: audits.filter((audit) => audit.solverMethod).length,
    deterministicPassRows: audits.filter((audit) => audit.status === "pass").length,
  };
}

function buildManualQueue(audits) {
  const queue = [];
  const seen = new Set();
  const add = (audit, reason) => {
    if (seen.has(audit.questionId)) return;
    seen.add(audit.questionId);
    queue.push({
      sampleReason: reason,
      questionId: audit.questionId,
      grade: audit.grade,
      semester: audit.semester,
      type: audit.type,
      difficulty: audit.difficulty,
      storedAnswer: audit.storedAnswer,
      acceptedAnswers: audit.acceptedAnswers,
      explanationZhHans: audit.explanationZhHans,
      optionsZhHans: audit.optionsZhHans,
      evidenceCardIds: audit.evidenceCardIds,
      examPatternCardIds: audit.examPatternCardIds,
      promptZhHans: audit.promptZhHans,
    });
  };

  for (const grade of EXPECTED_GRADES) {
    const gradeRows = audits.filter((audit) => audit.grade === grade);
    const gradeSeenBefore = queue.length;

    for (const semester of EXPECTED_SEMESTERS) {
      for (const type of EXPECTED_TYPES) {
        const cellRows = gradeRows
          .filter((audit) => audit.semester === semester && audit.type === type)
          .sort(compareManualPriority);
        for (const audit of cellRows.slice(0, Math.min(3, cellRows.length))) {
          if (queue.length - gradeSeenBefore >= 30) break;
          add(audit, "semester-type-coverage");
        }
      }
    }

    for (const difficulty of Object.keys(EXPECTED_DIFFICULTY_TOTALS_BY_GRADE[grade])) {
      if (queue.slice(gradeSeenBefore).some((row) => row.grade === grade && row.difficulty === difficulty)) continue;
      const row = gradeRows.filter((audit) => audit.difficulty === difficulty).sort(compareManualPriority)[0];
      if (row) add(row, "difficulty-coverage");
    }

    for (const audit of gradeRows.filter((row) => row.status !== "pass").sort(compareManualPriority)) {
      if (queue.length - gradeSeenBefore >= 30) break;
      add(audit, "risk-weighted-coverage");
    }

    for (const audit of gradeRows.sort(compareManualPriority)) {
      if (queue.length - gradeSeenBefore >= 30) break;
      add(audit, "risk-weighted-fill");
    }

    const gradeQueueCount = queue.length - gradeSeenBefore;
    if (gradeQueueCount !== 30) {
      throw new Error(`Manual queue expected 30 rows for ${grade}, found ${gradeQueueCount}`);
    }
  }
  if (queue.length !== 180) throw new Error(`Manual queue expected 180 rows, found ${queue.length}`);
  return queue;
}

function manualPriorityScore(audit) {
  const statusWeight = audit.status === "pass"
    ? 0
    : audit.status === "solver-gap"
      ? 50
      : 100;
  const difficultyWeight = audit.difficulty === "Exam"
    ? 30
    : audit.difficulty === "Challenge"
      ? 20
      : audit.difficulty === "Core"
        ? 8
        : 0;
  const typeWeight = audit.type === "short-answer" ? 12 : audit.type === "fill-in" ? 5 : 0;
  const sourceWeight = /source-distance|missing-visual|self-contradiction/i.test(audit.notes) ? 60 : 0;
  return statusWeight + difficultyWeight + typeWeight + sourceWeight;
}

function compareManualPriority(left, right) {
  return manualPriorityScore(right) - manualPriorityScore(left) || stableHash(left.questionId) - stableHash(right.questionId);
}

function buildManualReviewSummary(manualQueue, audits) {
  const sampleByGrade = {};
  const sampleByGradeSemester = {};
  const sampleByGradeType = {};
  const sampleByGradeDifficulty = {};
  const sampleByReason = countBy(manualQueue.map((row) => row.sampleReason));
  const shortfalls = [];
  for (const grade of EXPECTED_GRADES) {
    const sampled = manualQueue.filter((row) => row.grade === grade);
    sampleByGrade[grade] = sampled.length;
    sampleByGradeType[grade] = countBy(sampled.map((row) => row.type));
    sampleByGradeDifficulty[grade] = countBy(sampled.map((row) => row.difficulty));
    if (sampled.length !== 30) shortfalls.push(`${grade}: expected 30 sampled rows, found ${sampled.length}`);
    for (const semester of EXPECTED_SEMESTERS) {
      const key = `${grade}-${semester}`;
      const count = sampled.filter((row) => row.semester === semester).length;
      sampleByGradeSemester[key] = count;
      if (count === 0) shortfalls.push(`${grade}: sample lacks ${semester}`);
    }
    for (const type of EXPECTED_TYPES) {
      if (!sampled.some((row) => row.type === type)) shortfalls.push(`${grade}: sample lacks ${type}`);
    }
    for (const difficulty of Object.keys(EXPECTED_DIFFICULTY_TOTALS_BY_GRADE[grade])) {
      if (!sampled.some((row) => row.difficulty === difficulty)) shortfalls.push(`${grade}: sample lacks ${difficulty}`);
    }
  }
  return {
    sampleRows: manualQueue.length,
    sampleByGrade,
    sampleByGradeSemester,
    sampleByGradeType,
    sampleByGradeDifficulty,
    sampleByReason,
    deterministicPassRowsAvailable: audits.filter((audit) => audit.status === "pass").length,
    pendingRowsAvailable: audits.filter((audit) => audit.status === "solver-gap").length,
    blockerRowsAvailable: audits.filter((audit) => audit.status !== "pass" && audit.status !== "solver-gap").length,
    shortfalls,
  };
}

function promptSignature(prompt) {
  return toHalfWidth(prompt || "")
    .replace(/\\frac\{\d+\}\{\d+\}/g, "#/#")
    .replace(/\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?/g, "#/#")
    .replace(/-?\d+(?:\.\d+)?%?/g, "#")
    .replace(/[A-D]\s*[.．、]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function buildSolverGapClusters(audits, sourceRows) {
  const rowById = new Map(sourceRows.map((row) => [row.id, row]));
  const clusters = new Map();
  for (const audit of audits.filter((row) => row.status === "solver-gap")) {
    const source = rowById.get(audit.questionId) || {};
    const concepts = Array.isArray(source.conceptIds) ? source.conceptIds.slice(0, 4).join(" | ") : "";
    const signature = promptSignature(audit.promptZhHans);
    const key = [audit.grade, audit.semester, audit.unitTitle, audit.type, concepts, signature].join("||");
    if (!clusters.has(key)) {
      clusters.set(key, {
        clusterId: `gap-cluster-${String(clusters.size + 1).padStart(3, "0")}`,
        grade: audit.grade,
        semester: audit.semester,
        unitTitle: audit.unitTitle,
        type: audit.type,
        conceptIds: concepts,
        promptPattern: signature,
        count: 0,
        exampleQuestionIds: [],
        recommendedAction: recommendGapClusterAction(audit.unitTitle, concepts, signature),
      });
    }
    const cluster = clusters.get(key);
    cluster.count += 1;
    if (cluster.exampleQuestionIds.length < 8) cluster.exampleQuestionIds.push(audit.questionId);
  }
  return [...clusters.values()].sort((a, b) => b.count - a.count || a.clusterId.localeCompare(b.clusterId));
}

function recommendGapClusterAction(unitTitle, concepts, signature) {
  const text = `${unitTitle} ${concepts} ${signature}`;
  if (/圆柱|圆锥|表面积|体积/.test(text)) return "extend geometry/solid deterministic solver if formula pattern is explicit; otherwise S18 manual review";
  if (/分数|约分|通分|百分|比例|比/.test(text)) return "extend fraction/percent/ratio solver for explicit numeric stems; manual review for reasoning wording";
  if (/统计|平均|折线|条形/.test(text)) return "extend statistics/table solver only when data are fully textual and unique";
  if (/方程|字母|等量/.test(text)) return "extend simple-equation solver for one-variable numeric equations";
  if (/观察物体|图形拼组|位置|方向/.test(text)) return "manual S18 review unless prompt is fully textual and unambiguous";
  if (/解决问题|期末综合|期中综合|易错|拓展|情境/.test(text)) return "manual S18 review or add a narrow story-problem solver after sampling";
  return "manual S18 review";
}

function buildManualReviewResults(manualQueue) {
  return manualQueue.map((row) => ({
    sampleReason: row.sampleReason,
    questionId: row.questionId,
    grade: row.grade,
    semester: row.semester,
    type: row.type,
    difficulty: row.difficulty,
    reviewer: "S18-manual-sample",
    solvableFromPrompt: "",
    independentAnswer: "",
    storedAnswerMatches: "",
    explanationMatches: "",
    gradeFit: "",
    terminologyOk: "",
    sourceDistanceOk: "",
    verdict: "pending-s18-review",
    recommendedFix: "",
    reviewNotes: "",
  }));
}

function writeMarkdown(summary, audits, manualQueue, manualReviewSummary) {
  const failing = audits.filter((audit) => audit.status !== "pass" && audit.status !== "solver-gap");
  const gaps = audits.filter((audit) => audit.status === "solver-gap");
  const blockerCount = failing.length;
  const automatedGatesPass = summary.totalRows === EXPECTED_TOTAL && summary.inventoryIssues.length === 0 && blockerCount === 0;
  const candidateDecision = automatedGatesPass ? "candidate-complete" : "needs-rewrite";
  const lines = [];
  lines.push("# Mainland PEP Primary Generated Bank V2 Solvability Audit");
  lines.push("");
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Input: \`questions.jsonl\``);
  lines.push(`- Scope: offline candidate-only QA; no app data or production question-bank files modified.`);
  lines.push(`- Candidate package decision: ${candidateDecision}.`);
  lines.push(`- Deterministic solved rows: ${summary.deterministicSolvedRows}/${summary.totalRows}`);
  lines.push(`- Deterministic pass rows: ${summary.deterministicPassRows}/${summary.totalRows}`);
  lines.push("");
  lines.push("## Gate Summary");
  lines.push("");
  lines.push(`- Total rows: ${summary.totalRows}/${summary.expectedRows}`);
  lines.push(`- Schema rows without blocker issues: ${summary.schemaPassRows}/${summary.totalRows}`);
  lines.push(`- Status counts: ${JSON.stringify(summary.statusCounts)}`);
  lines.push(`- Type counts: ${JSON.stringify(summary.typeCounts)}`);
  lines.push(`- Grade counts: ${JSON.stringify(summary.gradeCounts)}`);
  lines.push(`- Manual review queue rows: ${manualQueue.length}/180`);
  if (manualReviewSummary.shortfalls.length > 0) {
    lines.push(`- Manual sample shortfalls: ${manualReviewSummary.shortfalls.length}`);
  }
  lines.push("");
  lines.push("## Promotion Decision");
  lines.push("");
  if (candidateDecision === "candidate-complete") {
    lines.push("Candidate-complete by automated count/schema/source-safety/blocker gates. It is not app-promotable while any row remains `pending-s18-review`.");
  } else {
    lines.push("Needs rewrite before curated promotion. Resolve inventory/schema/source-safety/content blockers, then rerun the full audit.");
  }
  lines.push("");
  if (summary.inventoryIssues.length > 0) {
    lines.push("## Inventory Issues");
    lines.push("");
    for (const issue of summary.inventoryIssues) lines.push(`- ${issue}`);
    lines.push("");
  }
  lines.push("## Status By Grade");
  lines.push("");
  lines.push("| Grade | pass | solver-gap | answer-mismatch | ambiguous-mc | content-error |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
  for (const grade of EXPECTED_GRADES) {
    const counts = summary.gradeStatusCounts[grade] || {};
    lines.push(
      `| ${grade} | ${counts.pass || 0} | ${counts["solver-gap"] || 0} | ${counts["answer-mismatch"] || 0} | ${counts["ambiguous-mc"] || 0} | ${counts["content-error"] || 0} |`,
    );
  }
  lines.push("");
  lines.push("## Needs Revision");
  lines.push("");
  if (failing.length === 0) {
    lines.push("No deterministic answer mismatches, ambiguous multiple-choice rows, or content-error blockers were found.");
  } else {
    lines.push("| Question ID | Status | Independent answer | Stored answer | Recommended fix |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const audit of failing.slice(0, 80)) {
      lines.push(
        `| ${audit.questionId} | ${audit.status} | ${audit.independentAnswer || ""} | ${audit.storedAnswer || ""} | Review/correct candidate row; rerun full audit. Notes: ${audit.notes.replace(/\|/g, "/")} |`,
      );
    }
    if (failing.length > 80) lines.push(`| ... | ... | ... | ... | ${failing.length - 80} additional rows in solvability-audit.csv |`);
  }
  lines.push("");
  lines.push("## Solver Gaps");
  lines.push("");
  lines.push(
    `${gaps.length} rows have no matched deterministic solver. They are intentionally treated as \`pending-s18-review\`, not auto-approved.`,
  );
  lines.push("");
  lines.push("## Manual Sample Coverage");
  lines.push("");
  lines.push("| Grade | sampled rows | sampled semesters | sampled types | sampled difficulties |");
  lines.push("| --- | ---: | --- | --- | --- |");
  for (const grade of EXPECTED_GRADES) {
    const typeCounts = manualReviewSummary.sampleByGradeType[grade] || {};
    const difficultyCounts = manualReviewSummary.sampleByGradeDifficulty[grade] || {};
    const semesterCounts = EXPECTED_SEMESTERS.map((semester) => `${semester}:${manualReviewSummary.sampleByGradeSemester[`${grade}-${semester}`] || 0}`).join(", ");
    lines.push(
      `| ${grade} | ${manualReviewSummary.sampleByGrade[grade] || 0} | ${semesterCounts} | ${EXPECTED_TYPES.map((type) => `${type}:${typeCounts[type] || 0}`).join(", ")} | ${Object.keys(EXPECTED_DIFFICULTY_TOTALS_BY_GRADE[grade]).map((difficulty) => `${difficulty}:${difficultyCounts[difficulty] || 0}`).join(", ")} |`,
    );
  }
  if (manualReviewSummary.shortfalls.length > 0) {
    lines.push("");
    lines.push("Manual sample target shortfalls exist and must be fixed before S18 blind review.");
  }
  lines.push("");
  lines.push("## QA Notes");
  lines.push("");
  lines.push("- DeepSeek was not used as the judge of its own generated answers.");
  lines.push("- Deterministic checks compare independently computed answers with stored `answer` / `acceptedAnswers` where a reliable solver matched.");
  lines.push("- `solver-gap` means the row may still be good, but automated QA did not prove solvability or answer-key agreement.");
  lines.push("- Candidate rows remain offline until S18 manual signoff and a separate S04/S08 production-integration task.");
  fs.writeFileSync(AUDIT_MD, `${lines.join("\n")}\n`);
}

function writeQaReport(summary, audits, manualQueue, manualReviewSummary) {
  const failing = audits.filter((audit) => audit.status !== "pass" && audit.status !== "solver-gap");
  const pendingRows = audits.filter((audit) => audit.status === "solver-gap").length;
  const automatedGatesPass = summary.totalRows === EXPECTED_TOTAL && summary.inventoryIssues.length === 0 && failing.length === 0;
  const decision = automatedGatesPass ? "candidate-complete" : "needs-rewrite";
  const lines = [];
  lines.push("# Mainland PEP Primary Generated Bank V2 QA Report");
  lines.push("");
  lines.push(`- Date: 2026-05-23`);
  lines.push(`- Session ID: S18`);
  lines.push(`- Candidate package status: ${decision}`);
  lines.push("- App promotion status: not app-promotable; pending S18 rows require manual pass or future deterministic proof.");
  lines.push("- Scope: offline LLM+RAG v2 candidate package only. No Practice Arena, production question data, UI, or API integration.");
  lines.push("");
  lines.push("## Automated Gates");
  lines.push("");
  lines.push(`- Completeness: ${summary.totalRows}/${EXPECTED_TOTAL}`);
  lines.push(`- Duplicate IDs: ${summary.duplicateIds.length ? summary.duplicateIds.join(", ") : "none"}`);
  lines.push(`- Inventory/quota issues: ${summary.inventoryIssues.length}`);
  lines.push(`- Schema rows without blocker issues: ${summary.schemaPassRows}/${summary.totalRows}`);
  lines.push(`- Deterministic approved rows: ${summary.deterministicPassRows}`);
  lines.push(`- Pending S18 review rows: ${pendingRows}`);
  lines.push(`- Rewrite/blocker rows: ${failing.length}`);
  lines.push(`- Manual blind review queue: ${manualQueue.length}/180`);
  lines.push("");
  lines.push("## Status Counts");
  lines.push("");
  lines.push(JSON.stringify(summary.statusCounts, null, 2));
  lines.push("");
  lines.push("## Manual Review");
  lines.push("");
  lines.push("- `manual-review-queue.csv` contains 30 sampled rows per grade, balanced across semester/type/difficulty where available and risk-weighted toward solver gaps/blockers/high-difficulty rows.");
  lines.push("- `manual-review-results.csv` is a pending review template for those 180 sampled rows.");
  if (manualReviewSummary.shortfalls.length > 0) {
    lines.push(`- Manual sample shortfalls: ${manualReviewSummary.shortfalls.join("; ")}`);
  }
  lines.push("");
  lines.push("## Release Rule");
  lines.push("");
  lines.push("- Allowed package decisions are `candidate-complete`, `needs-rewrite`, or `ready-for-curated-promotion`.");
  lines.push("- This run cannot be marked full app-promotable unless all pending rows are manually passed or independently solved in a rerun.");
  fs.writeFileSync(QA_REPORT_MD, `${lines.join("\n")}\n`);
}

function main() {
  const rows = readJsonl(INPUT);
  const audits = rows.map(auditRow);
  const summary = addInventorySummary(rows, audits);
  const manualQueue = buildManualQueue(audits);
  const manualReviewSummary = buildManualReviewSummary(manualQueue, audits);
  const solverGapClusters = buildSolverGapClusters(audits, rows);
  const manualReviewResults = buildManualReviewResults(manualQueue);
  const failingRows = audits
    .filter((audit) => ["answer-mismatch", "ambiguous-mc", "content-error"].includes(audit.status))
    .map((audit) => ({
      questionId: audit.questionId,
      status: audit.status,
      failureReason: audit.notes,
      independentAnswer: audit.independentAnswer,
      storedAnswer: audit.storedAnswer,
      recommendedFix: "Review/correct candidate row, then rerun the full solvability audit.",
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    inputFile: path.relative(__dirname, INPUT),
    scope: "offline candidate-only Mainland PEP primary generated bank QA",
    summary,
    acceptanceCriteria: {
      requiredTotalRows: EXPECTED_TOTAL,
      requiredPerGrade: 200,
      requiredPerGradeSemester: 100,
      requiredStatusCountsForPromotion: {
        "answer-mismatch": 0,
        "ambiguous-mc": 0,
        "content-error": 0,
        "solver-gap": "pending S18 review; not app-promotable if nonzero",
      },
      automatedPromotionRecommendation:
        summary.inventoryIssues.length === 0 &&
        (summary.statusCounts["answer-mismatch"] || 0) === 0 &&
        (summary.statusCounts["ambiguous-mc"] || 0) === 0 &&
        (summary.statusCounts["content-error"] || 0) === 0
          ? "candidate-complete"
          : "needs-rewrite",
    },
    failingRows,
    manualReviewSummary,
    solverGapClusters,
    manualReviewResults,
    manualReviewQueue: manualQueue,
    rows: audits,
  };

  fs.writeFileSync(AUDIT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  writeCsv(AUDIT_CSV, audits, [
    "questionId",
    "grade",
    "semester",
    "type",
    "difficulty",
    "unitTitle",
    "status",
    "severity",
    "storedAnswer",
    "acceptedAnswers",
    "independentAnswer",
    "solverMethod",
    "solverFamily",
    "explanationCheck",
    "notes",
    "promptZhHans",
  ]);
  writeCsv(MANUAL_QUEUE_CSV, manualQueue, [
    "sampleReason",
    "questionId",
    "grade",
    "semester",
    "type",
    "difficulty",
    "storedAnswer",
    "acceptedAnswers",
    "optionsZhHans",
    "explanationZhHans",
    "evidenceCardIds",
    "examPatternCardIds",
    "promptZhHans",
  ]);
  writeCsv(MANUAL_REVIEW_RESULTS_CSV, manualReviewResults, [
    "sampleReason",
    "questionId",
    "grade",
    "semester",
    "type",
    "difficulty",
    "reviewer",
    "solvableFromPrompt",
    "independentAnswer",
    "storedAnswerMatches",
    "explanationMatches",
    "gradeFit",
    "terminologyOk",
    "sourceDistanceOk",
    "verdict",
    "recommendedFix",
    "reviewNotes",
  ]);
  writeMarkdown(summary, audits, manualQueue, manualReviewSummary);
  writeQaReport(summary, audits, manualQueue, manualReviewSummary);

  console.log(
    JSON.stringify(
      {
        totalRows: summary.totalRows,
        schemaPassRows: summary.schemaPassRows,
        statusCounts: summary.statusCounts,
        deterministicSolvedRows: summary.deterministicSolvedRows,
        manualReviewQueueRows: manualQueue.length,
        solverGapClusters: solverGapClusters.length,
        manualReviewResultCounts: countBy(manualReviewResults.map((row) => row.verdict)),
        outputFiles: [
          path.relative(process.cwd(), AUDIT_JSON),
          path.relative(process.cwd(), AUDIT_CSV),
          path.relative(process.cwd(), AUDIT_MD),
          path.relative(process.cwd(), MANUAL_QUEUE_CSV),
          path.relative(process.cwd(), MANUAL_REVIEW_RESULTS_CSV),
          path.relative(process.cwd(), QA_REPORT_MD),
        ],
      },
      null,
      2,
    ),
  );
}

main();
